export interface LoadOptions {
    /**
     * If set, force the encoding of strings, otherwise strings will be decoded on demand.
     * ```js
     * // Data is a Ruby array that holds "foo" as string and "foo" as binary data.
     * load(data) // => ["foo", { __type: "bytes", "data": [102, 111, 111] }]
     * load(data, { stringMode: "utf8" }) // => ["foo", "foo"]
     * load(data, { stringMode: "binary" }) // => [{ __type: "bytes", "data": [102, 111, 111] }, { __type: "bytes", "data": [102, 111, 111] }]
     * ```
     */
    readonly stringMode?: "binary" | "utf8";

    /**
     * If set, use this known classes to decode ruby objects.
     * ```js
     * class A {}
     * load(data) // => RubyObject { class: "__symbol__A" }
     * load(data, { decodeKnown: { A } }) // => A {}
     * ```
     */
    readonly decodeKnown?: Record<
        string,
        {
            readonly name: string;
            readonly prototype: object | null;
        }
    >;

    /**
     * If set, changes "@" instance variables prefix to passed.
     * If you've loaded files with this option, also use it in dump.
     * ```js
     * load(data) // => [{ "__symbol__@instanceVar": 5 }]
     * load(data, { instanceVarPrefix: "" }) // => [{ "__symbol__instanceVar": 5 }]
     * load(data, { instanceVarPrefix: "_" }) // => [{ "__symbol___instanceVar": 5 }]
     * ```
     */
    readonly instanceVarPrefix?: string;
}

export interface DumpOptions {
    /**
     * If set, use this known classes to encode ruby objects.
     * ```js
     * dump(new A()) // => Error "can't dump object [object Object]"
     * dump(new A(), { encodeKnown: { A } }) // => ruby: #<A>
     * ```
     */
    readonly encodeKnown?: Record<
        string,
        {
            readonly name: string;
            readonly prototype: object | null;
        }
    >;

    /**
     * If set, use this string for unknown classes to encode ruby objects.
     * ```js
     * dump(new A()) // => Error "can't dump object [object Object]"
     * dump(new A(), { encodeUnknown: () => "A" }) // => ruby: #<A>
     * ```
     */
    readonly encodeUnknown?: (object: unknown) => string | null | undefined;

    /**
     * If set, force maximum size of the output buffer to passed.
     * Default value is 16000000 (16 MB).
     * ```js
     * dump(hugeStructure) // => RangeError: ArrayBuffer.prototype.resize: Invalid length parameter
     * dump(hugeStructure, { maxByteLength: 32000000 }) // => All good
     * ```
     */
    readonly maxByteLength?: number;

    /**
     * Set this option to the same value you did in load() to properly dump data.
     */
    readonly instanceVarPrefix?: string;
}
