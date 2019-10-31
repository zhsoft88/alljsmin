# alljsmin

alljsmin does:

1. Minify all js files in specified input dir to output dir
2. Merge some js files to all.js (identified by @all.js in tag file)
3. Tweak 'const is_debug = true' to 'const is_debug = false' for release

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

<!-- @all.js -->
<script src="js/a.js"></script>
<script src="js/b.js"></script>
<!-- @all.js -->

These will merge js/a.js, js/b.js to js/all.js and minify it.

### remove_files

Remove these file in output dir.

### excludes

Patterns for exclude some dir or files from minify.

### toplevels

Minify matched js files with option toplevel: true.


