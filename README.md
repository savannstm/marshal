# @savannstm/marshal

TypeScript implementation of Ruby Marshal, that can be used both in browser and in Node.js.
This project is a fork of [@hyrious/marshal](https://github.com/hyrious/marshal), rewritten according to ES6 standards and adding some additional features.

## Install

```
npm i @savannstm/marshal
```

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

### Ruby &harr; JavaScript

| Ruby         | JavaScript                             |
| ------------ | -------------------------------------- |
| `nil`        | `null`                                 |
| `"string"`   | `"string"`                             |
| `:symbol`    | `Symbol("symbol")`                     |
| `123456`     | `123456` (number)                      |
| `123.456`    | `123.456` (number)                     |
| `/cat/im`    | `/cat/im` (RegExp)                     |
| `[]`         | `[]`                                   |
| `{}`         | `{}` (plain object)                    |
| `Object.new` | `RubyObject { class: Symbol(object) }` |

#### String

Because users may store binary data that cannot be decoded as UTF-8 in Ruby,
strings are decoded into `Uint8Array` firstly, then converted to `string`
using `TextDecoder` if seeing an instance variable indicating the encoding.

```js
load('\x04\b"\0'); //=> Uint8Array []
load('\x04\bI"\0\x06:\x06ET'); //=> ""
```

The special instance variables are:

| name        | value        | encoding      |
| ----------- | ------------ | ------------- |
| `:E`        | true / false | UTF-8 / ASCII |
| `:encoding` | "enc"        | enc           |

So for strict compatibility, you should check if a string is Uint8Array before using it:

```js
var a = load(data);
if (a instanceof Uint8Array) a = decode(a); // if you know it must be a string
if (typeof a === "string") do_something(a);
```

Or you can use `options.string` to control the behavior, see [options.string](./docs/api.md#optionsstring-utf8--binary).

#### Symbols

Symbols are always decoded in UTF-8 even if they may have other encodings.
You can use `Symbol.keyFor(sym)` in JavaScript to get the symbol name in string.

#### RegExp

Only `i` (ignore case) and `m` (multi-line) flags are preserved.
However, it is still possible to read all flags by wrapper class, see [options.regexp](./docs/api.md#optionsregexp-wrap).

#### Hash

This library decodes Hash as plain object by default, and always decodes strings, symbols and numbers as object properties. It converts symbols and numbers to string, but preserves their types by prefixing these strings with ":SYMBOL:" for symbols and "iINTEGERi" for numbers.
It also tries to convert objects to strings, using JSON.stringify() and prefixing resulting string with "oOBJECTo", but this approach does NOT guarantee that resulting key will be dumped back to it's initial form.
However, it is still possible to keep these keys using `Map` or wrapper classes, see [options.hash](./docs/api.md#optionshash-map--wrap).

#### Instance Variables

This library decodes instance variables (often `@a = 1`) as object props, i.e. `obj[Symbol(@a)] = 1`.
It is guaranteed that you can retrieve these properties using `Object.getOwnPropertySymbols()`.
It is possible to convert these symbols to strings when loading, see [options.convertInstanceVarsToString](./docs/api.md#optionsconvertinstancevarstostring-true--string), and strings to symbols when dumping, see [options.convertStringsToInstanceVar](./docs/api.md#optionsconvertstringstoinstancevar-true--string).

#### Stringifying load()ed JSON objects

Implementation of this library allows you to stringify load()ed JSON objects, write them to files, then read them back and dump() to working Ruby Marshal files.
There's one moment to notice: Library handles almost everything, so you can safely stringify objects and parse them back, except for Uint8Arrays.
So when you stringify loaded files, you should handle that manually.
For example:

```js
import { writeFileSync, readFileSync } from "node:fs";
import { load } from "@savannstm/marshal";

// Read the Ruby Marshal file data
const rubyMarshalFileData = readFileSync(path);

// Load the Ruby Marshal file data to JSON object
const loaded = load(rubyMarshalFileData, {
    convertHashKeysToString: true,
    convertInstanceVarsToString: true,
});

// Stringify and replace Uint8Array structures to something, that can be stringified
const stringified = JSON.stringify(loaded, (key, value) => {
    if (value instanceof Uint8Array) {
        return {
            __type: "Uint8Array",
            data: Array.from(value),
        };
    }

    return value;
});

// Write stringified object to file
await writeFileSync(outputPath, stringified);

// Read stringified object from file
const stringifiedJSON = await readFileSync(outputPath);

// Revive Uint8Array structures
const parsed = JSON.parse(stringifiedJSON, (_, value) => {
    if (value && value.__type === "Uint8Array") {
        return new Uint8Array(value.data);
    }

    return value;
});

// Dump the data back to Ruby Marshal format
const dumped = dump(parsed, {
    convertStringsToInstanceVar: true,
});

// Profit!
```

### [API Reference](./docs/api.md)

### [FAQ](./docs/faq.md)

### [Changelog](./CHANGELOG.md)

### Developing

-   Run `npm run test` to run tests.

### Reference

-   [marshal.c](https://github.com/ruby/ruby/blob/master/marshal.c)
-   [Marshal Format](https://github.com/ruby/ruby/blob/master/doc/marshal.rdoc) (official doc)
-   [node marshal](https://github.com/clayzermk1/node-marshal)
-   [@qnighy/marshal](https://github.com/qnighy/marshal-js)
-   A [little](http://jakegoulding.com/blog/2013/01/15/a-little-dip-into-rubys-marshal-format)/[another](http://jakegoulding.com/blog/2013/01/16/another-dip-into-rubys-marshal-format)/[final](http://jakegoulding.com/blog/2013/01/20/a-final-dip-into-rubys-marshal-format) dip into Ruby's Marshal format

## License

MIT @ [hyrious](https://github.com/hyrious)
