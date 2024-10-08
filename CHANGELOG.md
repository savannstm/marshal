# Changelog

## 0.6.3

-   Fixed `instanceVarPrefix` option logic in `load()` and added its logic to `dump()` function.

## 0.6.1

-   Removed object links writing in `dump()` because of unstable work. Output files now may be larger, but it won't affect them anyhow.

## 0.6.0

-   :warning: BREAKING. Read the [API Reference](./docs/api.md) to learn the new API.
-   Now, this library emphasizes serializing Ruby Marshal objects to stringifiable JSON objects. Now you can stringify load()ed JSON object right out of the box.
-   Added full-featured BigInt support. Enjoy.
-   ((Probably)) Fixed incorrect object links processing, which could've led to missing fields in serialized JSON objects.
-   Removed `numeric`, `convertHashKeysToString`, `hash`, `regexp`, `convertInstanceVarsToString` options of `load()` function.
-   Added `instanceVarPrefix` option to `load()` function.
-   Removed `convertStringsToInstanceVar` option of `dump()` function.
-   Added `instanceVarPrefix`, `maxByteLength` options to `dump()` function.

## 0.5.1

-   Fixed dumping objects' `__type` helper property back to marshal data.
-   Changed prefixes for objects' keys:
    -   `:SYMBOL:` changed to `__symbol__`
    -   `iINTEGERi` changed to `__integer__`
    -   `oOBJECTo` changed to `__object__`
-   Fixed error when loading marshal data using `string: "utf8"` options property along with `convertInstanceVarToString` options property.

## 0.5.0

-   Hugely improved stringifying load()ed objects potential: For example, instead of parsing object's class as a symbol, it parses class as a string of .\_\_class object property.
-   Added property .\_\_type to some Ruby objects to determine their type when they're stringified and then parsed back.
-   Renamed properties of Ruby objects:

    -   `data` to `__data`
    -   `wrapped` to `__wrapped`
    -   `userDefined` to `__userDefined`
    -   `userMarshal` to `__userMarshal`
    -   `classSymbol` to `__class`
    -   `members` to `__members`
    -   `name` to `__name`
    -   `old` to `__old`

-   Fixed non-working `convertInstanceVarsToString` options property of `dump()` when using empty string.

## 0.4.4

-   Fixed non-working `convertInstanceVarsToString` options property of `load()` when using string.

## 0.4.2

-   Fixed improper handling of `convertInstanceVarsToString` options property of `load()` and `convertStringsToInstanceVar` of `dump()`.
-   When `hash` property of `load()` is not set to `map` or `wrap`, plain object to which Ruby hash is decoded tries to preserve object keys' types by stringifiying these objects, prefixing them with "oOBJECTo" and setting them as object's keys.
-   Fixed missed type declaration for mjs module.

## 0.4.0

-   :warning: BREAKING. Read the [API Reference](./docs/api.md) to learn the new API.
-   Floats, whether they greater than 1, less than -1, or between -1 and 1, are always parsed correctly now.
-   When `hash` property of `load()` is not set to `map` or `wrap`, plain object to which Ruby hash is decoded tries to preserve keys' types by prefixing symbols, converted to string with ":SYMBOL:" and integers, converted to string with "iINTEGERi".
-   Property `hashSymbolKeysToString` of `load()` options was renamed to `convertHashKeysToString`.
-   Property `ivarToString` of `load()` options was renamed to `convertInstanceVarsToString`.
-   Property `known` of `load()` options was renamed to `decodeKnown`.
-   Added property `convertStringsToInstanceVar` to `dump()` options to revert converted in load() instance vars back to their initial form.
-   Removed property `hashStringKeysToSymbol` of `dump()` options in favor of automatically converting strings to symbols, when it's required.
-   Property `known` of `dump()` options was renamed to `encodeKnown`.
-   Property `unknown` of `dump()` options was renamed to `encodeUnknown`.

## 0.3.3

-   Add `regexp: wrap` to wrap ruby regexp in `RubyRegexp`.

## 0.3.2

-   Add `string: utf8 | binary` in `load()` to force decode or not decode strings.

## 0.3.1

-   Fix `load(string)` should decode string in each code manually.

## 0.3.0

-   :warning: BREAKING. Read the [API Reference](./docs/api.md) to learn the new API.

## 0.2.5

-   `hashToJS` now also accepts number (Integer, Float) keys.

## 0.2.4

-   Fix mutating default options.

## 0.2.3

-   Add `clone(x, opt)` as a shortcut to `load(dump(x), opt)`.

## 0.2.2

-   Fix `hashToJS`, `hashToMap` with nested hashes.

## 0.2.1

-   Fix dump Bignum logic.
-   Fix dump Hash with default value.
-   Fix instance variables logic.
-   Add `RubyRange`, `RubyTime` helper classes.

## 0.2.0

-   Refactored a lot to make this package smaller.
-   Fix `T_EXTENDED` parse and dump behavior.
-   Support dump circular objects.

## 0.1.6

-   esbuild has inline enum, this package can be smaller and run quicker.

## 0.1.5

-   Changed `exports` field in package.json so that it always use ESM when bundling to browser.

## 0.1.4

-   Fixed parsing circular objects.

## 0.1.3

-   Added `load` option `decodeString: false` and `wrapString: true`

## 0.1.2

-   Fixed `dump(new RubyObject())` generates wrong marshal data

## 0.1.0

-   Added `load(arrayBuffer)` to parse marshal data
-   Added `dump(value)` to dump marshal data (not strictly equal to the ruby ones)
