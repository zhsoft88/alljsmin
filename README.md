# alljsmin

alljsmin does:

1. Minify all js files in specified input dir to output dir
2. Merge some js files to all.js (identified by @all.js in tag file)
3. Tweak 'const is_debug = true' to 'const is_debug = false' for release

alljsmin是一款小工具，方便release js相关的项目。

1. 它会minify所有js文件，也可排除若干文件。
2. 根据指定的标签文件(tag file),它会搜索@all.js，将前后@all.js行当中的部分做解析，将得到的
所有文件合并为一个all.js并minify。
3. 它也会将js中'const is_debug = true'替换为'const is_debug = false'。使用is_debug的
好处是区分开发模式和release模式，release下某些功能可能要禁用了，如右键菜单等。

## Installation

```sh
$ [sudo] npm install -g alljsmin
```

## Usage

```
Usage:
  alljsmin [OPTIONS] input_dir [output_dir]

Options:
  -h, --help: Help
  -v, --version : Version

Arguments:
input_dir : input directory
output_dir: optional, default: ${input_dir}.min
```

## Configuration: alljsmin.json

File: ${input_dir}/alljsmin.json.

Sample contents:

```
{
  "tag_file": "js/background.js",
  "remove_files": [
    "jsconfig.json"
  ],
  "excludes": [
    "video_popup"
  ],
  "toplevels": [
    "js/all.js",
    "js/background.js"
  ]
}
```

### tag_file

Search @all.js tag, merge contained files to all.js.

For example, in tag file main.html:

```
......
<!-- @all.js -->
<script src="js/a.js"></script>
<script src="js/b.js"></script>
<!-- @all.js -->
......
```

Will translate to:

```
......
<script src="js/all.js"></script>
......
```

These will merge “js/a.js”, “js/b.js” to “js/all.js” and minify it.


Another example, in tag file background.js:

```
......
  } else if (request.cmd === 'inject-detail') {
    const all_js = [
      /* @all.js */
      'js/bytesrep.js',
      'js/string_path.js',
......
      'js/content_script.js',
      /* @all.js */
    ]
    for (const file of all_js) {
      chrome.tabs.executeScript(sender.tab.id,
          {allFrames: true, frameId: sender.frameId, file});
......
```

Will translate to:

```
......
  } else if (request.cmd === 'inject-detail') {
    const all_js = [
      'js/all.js',
    ]
    for (const file of all_js) {
      chrome.tabs.executeScript(sender.tab.id,
          {allFrames: true, frameId: sender.frameId, file});
......
```

These will merge “js/bytesrep.js”, “js/string_path.js”, ..., "js/content_script.js"
to “js/all.js” and minify it.


### remove_files

Remove these file in output dir.

删除release模式下不需要的文件。

### excludes

Wildcard patterns for exclude some dir or files from minify.

排除目录或文件列表，可使用通配符。

### toplevels

Minify matched js files with option toplevel: true.


