# @savannstm/marshal

TypeScript implementation of Ruby Marshal, that can be used both in browser and in Node.js.
This project is a fork of [@hyrious/marshal](https://github.com/hyrious/marshal), rewritten according to ES6 standards and adding some additional features.

## Installation

`npm i @savannstm/marshal`

## Usage

```ts
import { dump, load } from "@savannstm/marshal";
dump(null); // Uint8Array(3) [ 4, 8, 48 ]
load("\x04\b0"); // null

// in Node.js
load(fs.readFileSync("data"));

// in Browser
load(await file.arrayBuffer());
```

## Overview

This library has two main functions: `load()` and `dump()`.
`load()` takes a `Uint8Array`, `ArrayBuffer` or `string`, consisting of Marshal data bytes as its only argument, and outputs JSON object.
`dump()` takes a JavaScript object, and outputs respective Marshal Uint8Array of bytes.

`load()` serializes Ruby data to JSON using the table:

| Ruby object                                    | Serialized to JSON                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `nil`                                          | `null`                                                                       |
| `1337` (Integer)                               | `1337`                                                                       |
| `36893488147419103232` (Big Integer)           | `{ __type: "bigint", value: "36893488147419103232" }` (Plain object)         |
| `13.37` (Float)                                | `13.37`                                                                      |
| `"ligma"` (String)                             | `"ligma"`                                                                    |
| `:ligma` (Symbol)                              | `"__symbol__ligma"`                                                          |
| `/ligma/xim` (Regex)                           | `{ "__type": "regexp", "expression": "ligma", flags: "xim" }` (Plain object) |
| `[]` (Array)                                   | `[]`                                                                         |
| `{}` (Hash)                                    | `{}` (Plain object)                                                          |
| `Object.new` (Including structs, modules etc.) | `{ "__class": "__symbol__Object", "__type": "object" }` (Plain object)       |

### String

By default, Ruby strings that include encoding instnace variable are serialized to JSON strings, and those which don't, serialized to `{ __type: "bytes", data: [...] }` objects.

This behavior can be controlled with the `stringMode` option of `load()` function.

`stringMode: "utf8"` tries to convert arrays without instance variable to string, and produces string if array is valid UTF8, and object otherwise.

`stringMode: "binary"` converts all strings to objects.

### Symbols

Symbols are always decoded in UTF-8 even if they may have other encodings.

### Instance Variables

Instance variables always decoded as strings with `__symbol__` prefix.
You can manage the prefix of instance variables using `instance_var_prefix` argument in `load()` and `dump()`. Passed string replaces "@" instance variables' prefixes.

### Stringifying load()ed JSON objects

Implementation of this library allows you to stringify `load()`ed JSON objects out of the box.

## [API Reference](./docs/api.md)

## [FAQ](./docs/faq.md)

## [Changelog](./CHANGELOG.md)

## Development

-   Run `npm test` to run tests.

## Reference

-   [marshal.c](https://github.com/ruby/ruby/blob/master/marshal.c)
-   [Marshal Format](https://github.com/ruby/ruby/blob/master/doc/marshal.rdoc) (official doc)
-   [node marshal](https://github.com/clayzermk1/node-marshal)
-   [@qnighy/marshal](https://github.com/qnighy/marshal-js)
-   A [little](http://jakegoulding.com/blog/2013/01/15/a-little-dip-into-rubys-marshal-format)/[another](http://jakegoulding.com/blog/2013/01/16/another-dip-into-rubys-marshal-format)/[final](http://jakegoulding.com/blog/2013/01/20/a-final-dip-into-rubys-marshal-format) dip into Ruby's Marshal format

## License

MIT @ [hyrious](https://github.com/hyrious)
