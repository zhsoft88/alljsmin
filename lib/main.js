/**
 * alljsmin:
 *
 * @see https://github.com/zhsoft88/alljsmin
 *
 * @author zhsoft88 <zhsoft88@icloud.com> (https://github.com/zhsoft88)
 * @copyright © 2019 zhuatang.com
 * @license MIT
 */

const FS = require('fs')
const PATH = require('path')
const Terser = require("terser")

function log(mesg) {
  console.log(mesg)
}

function error(mesg) {
  console.error(`Error: ${mesg}`)
}

function warn(mesg) {
  console.warn(`Warning: ${mesg}`)
}

function error_exit(mesg) {
  error(mesg)
  process.exit(1)
}

function is_dir(path) {
  try {
    return FS.statSync(path).isDirectory();
  } catch(e) {}
  return false;
}

function list_files_in_dir(dir) {
  function walk_dir(dir, file_list) {
    const list = FS.readdirSync(dir, {withFileTypes: true})
    for (const file of list) {
      if (file.name.startsWith('.'))
        continue

      const path = PATH.join(dir, file.name)
      if (file.isFile()) {
        file_list.push(path)
      } else if (file.isDirectory()) {
        walk_dir(path, file_list)
      }
    }
  }

  const list = []
  walk_dir(dir, list)
  return list
}

function parse_args() {
  const result =  {
    help: false,
    version: false,
    argv: [],
  }
  const len = process.argv.length
  let i = 2
  if (i == len) {
    if (is_dir('src')) {
      result.argv = ['src']
    } else {
      result.help = true
    }
    return result
  }

  while (i < len) {
    // get options
    const arg = process.argv[i]
    if (arg == '--help' || arg == '-h') {
      result.help = true
      break
    }

    if (arg == '--version' || arg == '-v') {
      result.version = true
      break
    }

    result.argv = process.argv.slice(i)
    break
  }
  return result
}

function usage() {
  log(
`Usage:
  alljsmin [OPTIONS] input_dir [output_dir]

Options:
  -h, --help: Help
  -v, --version : Version

Arguments:
  input_dir: input dir
  output_dir: optional, default: <input_dir>.min

Note:
  If no input_dir specified and exists src dir, use it as input_dir.
`)
}

function help_exit() {
  usage()
  process.exit(0)
}

function parse_tag_file(path) {
  if (!FS.existsSync(path))
    return

  const output = []
  const alljs_list = []
  let alljs_file
  const lines = FS.readFileSync(path, 'utf8').split('\n')
  const len = lines.length
  let i = 0
  while (i < len) {
    // skip to all.js begin
    while (i < len) {
      const line = lines[i]
      if (line.includes(' @all.js ')) {
        i++
        break
      }

      output.push(line)
      i++
    }
    if (i == len)
      break

    let alljs_line
    const re = new RegExp(String.raw`[\s]*'(?<file>[^']*)'|[\s]*"(?<file2>[^"]*)"`)
    // skip to all.js end
    while (i < len) {
      const line = lines[i]
      if (line.includes(' @all.js ')) {
        i++
        break
      }
      const mobj = re.exec(line)
      if (mobj && mobj.groups) {
        const file = mobj.groups.file ? mobj.groups.file : mobj.groups.file2
        if (file && file.endsWith('.js')) {
          alljs_list.push(file)
          if (!alljs_file) {
            alljs_file = PATH.dirname(file) + '/all.js'
            alljs_line = line.replace(file, alljs_file)
          }
        }
      }
      i++
    }

    if (alljs_list.length > 0) {
      output.push(alljs_line)
    }

    // add remaining
    while (i < len) {
      const line = lines[i]
      output.push(line)
      i++
    }
  }
  return [output.join('\n'), alljs_file, alljs_list]
}

function deleteFolderRecursive(path) {
  if(!FS.existsSync(path))
    return

  FS.readdirSync(path).forEach(function(file) {
    const curPath = PATH.join(path, file)
    if(FS.statSync(curPath).isDirectory()) {
      deleteFolderRecursive(curPath)
    } else {
      FS.unlinkSync(curPath)
    }
  })
  FS.rmdirSync(path)
}

function wildcardToRegexp(wildcard) {
  const escaped = '+()^$.{}[]|\\'
  let pattern = '^'
  for (let i = 0; i < wildcard.length; i++) {
    const c = wildcard[i]
    if (c == '*') {
      pattern += '.*'
    } else if (c == '?') {
      pattern += '.'
    } else if (escaped.includes(c)) {
      pattern += '\\'
      pattern += c
    } else {
      pattern += c
    }
  }
  pattern += '$'
  return new RegExp(pattern)
}

function makePathPattern(path) {
  path = path.replace(/\//g, PATH.sep)
  if (path.includes('?') || path.includes('*')) {
    return [true, wildcardToRegexp(path)]
  }
  return [false, path]
}

function makePathPatterns(pathlist) {
  const patterns = []
  for (const path of pathlist) {
    patterns.push(makePathPattern(path))
  }
  return patterns
}

function pathMatchPatterns(path, patterns) {
  for (const [is_reg, pattern] of patterns) {
    if (is_reg) {
      if (pattern.test(path))
        return true
    } else {
      if (path == pattern || path.startsWith(pattern + PATH.sep))
        return true
    }
  }
  return false
}

async function run() {
  const args = parse_args()
  if (args.help) {
    help_exit()
  }

  if (args.version) {
    const pjson = require('../package.json')
    log(pjson.version)
    process.exit(0)
  }

  if (args.argv.length < 1) {
    help_exit()
  }

  const input_dir = args.argv[0]
  if (!is_dir(input_dir))
    error_exit(`dir not exists: ${input_dir}`)

  // parse config and tag file
  let parse_result
  let config
  const config_name = 'alljsmin.json'
  const config_file = PATH.join(input_dir, config_name)
  if (FS.existsSync(config_file)) {
    config = JSON.parse(FS.readFileSync(config_file, 'utf8'))
    if (config.tag_file) {
      const file = PATH.join(input_dir, config.tag_file)
      if (!FS.existsSync(file))
        error_exit(`tag_file not exists: ${file}`)

      parse_result = parse_tag_file(file)
    }
    if (config.is_debug_file) {
      const file = PATH.join(input_dir, config.is_debug_file)
      if (!FS.existsSync(file))
        error_exit(`is_debug_file not exists: ${file}`)
    }
  }
  const [tag_file_content, alljs_file, alljs_list] = parse_result ? parse_result : []

  // clean output dir
  const output_dir = args.argv.length > 1 ? args.argv[1] : input_dir + '.min'
  try {
    deleteFolderRecursive(output_dir)
  } catch (e) {error(e)}

  // copy all files in input dir
  const input_files = list_files_in_dir(input_dir)
  for (const file of input_files) {
    const relpath = PATH.relative(input_dir, file)
    const target = PATH.join(output_dir, relpath)
    const dir = PATH.dirname(target)
    if (!FS.existsSync(dir)) {
      FS.mkdirSync(dir, {recursive: true})
    }

    FS.copyFileSync(file, target)
    log(`copy ${relpath}`)
  }

  // write tag file
  if (tag_file_content) {
    const tag_file = PATH.join(input_dir, config.tag_file)
    const relpath = PATH.relative(input_dir, tag_file)
    const path = PATH.join(output_dir, relpath)
    FS.writeFileSync(path, tag_file_content)
    log(`write ${relpath}`)
  }

  // tweak is_debug variable
  if (config.is_debug_file) {
    const input_file = PATH.join(input_dir, config.is_debug_file)
    const is_debug = 'const is_debug = true'
    let contents = FS.readFileSync(input_file, 'utf8')
    if (contents.includes(is_debug)) {
      contents = contents.replace(is_debug, 'const is_debug = false')
      const output_file = PATH.join(output_dir, config.is_debug_file)
      FS.writeFileSync(output_file, contents)
    }
  }

  // merge all js files to all.js, also tweak is_debug variable
  if (alljs_list && alljs_file) {
    let string = ''
    const is_debug = 'const is_debug = true'
    let found_is_debug = false
    for (const file of alljs_list) {
      const path = PATH.join(output_dir, file)
      let contents = FS.readFileSync(path, 'utf8')
      if (!config.is_debug_file && !found_is_debug && contents.includes(is_debug)) {
        found_is_debug = true
        contents = contents.replace(is_debug, 'const is_debug = false')
      }
      string += contents
      FS.unlinkSync(path)
      log(`remove ${file}`)
    }
    const path = PATH.join(output_dir, alljs_file)
    FS.writeFileSync(path, string)
    log(`write ${alljs_file}`)
  }

  // remove files
  const remove_files = [config_name]
  if (config && config.remove_files) {
    remove_files.push(...config.remove_files)
  }
  for (const file of remove_files) {
    const path = PATH.join(output_dir, file)
    try {
      FS.unlinkSync(path)
    } catch {}
    log(`remove ${file}`)
  }

  // minify js files
  const toplevel_patterns = makePathPatterns(config && config.toplevels || [])
  const exclude_patterns = makePathPatterns(config && config.excludes || [])
  const output_files = list_files_in_dir(output_dir)
  for (const file of output_files) {
    if (file.endsWith('.min.js') ||
       !file.endsWith('.js'))
      continue

    const relpath = PATH.relative(output_dir, file)
    if (pathMatchPatterns(relpath, exclude_patterns)) {
      log(`exclude ${relpath}`)
      continue
    }

    const code = FS.readFileSync(file, 'utf8')
    const name = PATH.basename(file)
    const toplevel = pathMatchPatterns(relpath, toplevel_patterns)
    const options = {toplevel}
    const result = await Terser.minify(code, options)
    FS.writeFileSync(file, result.code)
    log(`minify ${relpath}${toplevel?' (toplevel)':''}`)
    if (result.error) {
      error(result.error)
    }
  }
}

module.exports.run = run
