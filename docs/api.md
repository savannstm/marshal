# @savannstm/marshal

## Table of Contents

-   [load(data, loadOptions?)](#loaddata-loadoptions)
    -   [loadOptions.stringMode: `"utf8"` | `"binary"`](#loadoptionsstringmode-utf8--binary)
    -   [loadOptions.instanceVarPrefix: `string`](#loadoptionsinstancevarprefix-string)
    -   [loadOptions.decodeKnown: `{ class }`](#loadoptionsdecodeknown--class-)
-   [dump(value, dumpOptions?)](#dumpvalue-dumpoptions)
    -   [dumpOptions.instanceVarPrefix: `string`](#dumpoptionsinstancevarprefix-string)
    -   [dumpOptions.encodeKnown: `{ class }`](#dumpoptionsencodeknown--class-)
    -   [dumpOptions.encodeUnknown: `(obj) => string`](#dumpoptionsencodeunknown-obj--string)
    -   [dumpOptions.maxByteLength: `number`](#dumpoptionsmaxbytelength-number)

## load(data, loadOptions?)

Parse a Ruby Marshal data to a JavaScript value.

-   `data` {string | Uint8Array | ArrayBuffer} The Marshal data.
-   `loadOptions` {Object} Parse options.

### loadOptions.stringMode: `"utf8"` | `"binary"`

Force decode or not decode string values.

```rb
data = Marshal.dump(["foo", "foo".force_encoding("binary")])
```

```js
load(data); // => ["foo", { __type: "bytes", data: [102, 111, 111] }]
load(data, { stringMode: "utf8" }); // => ["foo", "foo"]
load(data, { stringMode: "binary" }); // => [{ __type: "bytes", data: [102, 111, 111] }, { __type: "bytes", data: [102, 111, 111] }]
```

### loadOptions.instanceVarPrefix: `string`

If set, changes "@" instance variables prefix to passed.

If you've loaded files with this option, also use it in dump.

```js
load(data); // => [{ "__symbol__@instanceVar": 5 }]
load(data, { instanceVarPrefix: "" }); // => [{ "__symbol__instanceVar": 5 }]
load(data, { instanceVarPrefix: "_" }); // => [{ "__symbol___instanceVar": 5 }]
```

### loadOptions.decodeKnown: `{ class }`

Decode Ruby objects as same-class JavaScript objects.

```rb
class A end
data = Marshal.dump(A.new)
```

```js
class A {}
load(data); // => RubyObject { class: Symbol(A) }
load(data, { decodeKnown: { A } }); // => A {}
```

## dump(value, dumpOptions?)

Encode a JavaScript value into Ruby marshal data. Returns a `Uint8Array`.
Note that the `Uint8Array` may not always be the same length as its underlying buffer.
You should always check the `byteOffset` and `byteLength` when accessing the buffer.

-   `value` {unknown} The JavaScript value.
-   `dumpOptions` {Object} Encode options.

### dumpOptions.instanceVarPrefix: `string`

Set it to the same value as in load().

### dumpOptions.encodeKnown: `{ class }`

Encode JavaScript objects into same-name Ruby objects.

```js
class A {}
dump(new A()); // Error: Cannot dump type object of object [object Object]
dump(new A(), { encodeKnown: { A } }); // => ruby: #<A>
```

### dumpOptions.encodeUnknown: `(obj) => string`

This is an alter to the error case of `dumpOptions.encodeKnown`.
It should return a string indicating the Ruby class name to encode into.
If you return `null` or empty string, it fallbacks to throw the error.

```js
dump(new A(), { encodeUnknown: (a) => a.constructor?.name }); // => ruby: #<A>
```

### dumpOptions.maxByteLength: number

If set, force maximum size of the output buffer to passed.
Passed number should be bytes (!) number.
Default value is 16000000 (16 MB).

```js
dump(hugeStructure); // => RangeError: ArrayBuffer.prototype.resize: Invalid length parameter
dump(hugeStructure, { maxByteLength: 32000000 }); // => All good
```
