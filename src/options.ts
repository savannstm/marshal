export interface LoadOptions {
    /**
     * If set, force the encoding of strings, otherwise strings will be decoded on demand.
     * ```js
     * // Data is a Ruby array that holds "foo" as string and "foo" as binary data.
     * load(data) // => ["foo", Uint8Array(3) [102, 111, 111]]
     * load(data, { string: "utf8" }) // => ["foo", "foo"]
     * load(data, { string: "binary" }) // => [Uint8Array(3) [102, 111, 111], Uint8Array(3) [102, 111, 111]]
     * ```
     */
    readonly string?: "binary" | "utf8";

    /**
     * If set, put integers and floats in RubyInteger and RubyFloat.
     * No bigint support now.
     * ```js
     * // Data is a Ruby integer that holds 1.
     * load(data) // => 1
     * load(data, { numeric: "wrap" }) // => RubyFloat { value: 1 }
     * load(data, { numeric: "wrap" }) // => RubyInteger { value: 1 }
     * ```
     */
    readonly numeric?: "wrap";

    /**
     * If true, convert symbol keys to string when decoding ruby Hash in JS objects.
     * ```js
     * // Data is a Ruby hash that holds 'a' property with a value of 1.
     * load(data) // => { Symbol(a): 1 }
     * load(data, { convertHashKeysToString: true }) // => { a: 1 }
     * ```
     */
    readonly convertHashKeysToString?: boolean;

    /**
     * Instead of JS object, decode ruby Hash as Map or RubyHash.
     * `hashSymbolKeysToString` is ignored when this option is set.
     * ```js
     * // Data is a Ruby hash that holds 'a' property with a value of 1.
     * load(data) // => { a: 1 }
     * load(data, { hash: "map" }) // => Map { "a" => 1 }
     * load(data, { hash: "wrap" }) // => RubyHash { entries: [["a", 1]] }
     * ```
     */
    readonly hash?: "map" | "wrap";

    /**
     * Instead of JS regexp, decode ruby Regexp as RubyRegexp.
     * ```js
     * // Data is a Ruby RegExp that holds '/cat/im' expression.
     * load(data) // => /cat/im
     * load(data, { regexp: "wrap" }) // => RubyRegexp { source: 'cat', options: 5 }
     * // Options is 5 because 1 indicates ignore case and 4 indicates multiline.
     * ```
     */
    readonly regexp?: "wrap";

    /**
     * If set, put instance variables (often :@key) as string keys in JS objects.
     * If set a string, replace the '@' with the string.
     * This ivars will be dump()ed back if 'stringToInstanceVar' of the same value is specified in dump().
     * ```js
     *
     * // Data is a Ruby object that holds '@a' instance variable with the value of 1.
     * load(data) // => RubyObject { Symbol(@a): 1 }
     * load(data, { convertInstanceVarsToString: true }) // => RubyObject { "@a": 1 }
     * load(data, { convertInstanceVarsToString: "" }) // => RubyObject { "a": 1 }
     * load(data, { convertInstanceVarsToString: "_" }) // => RubyObject { "_a": 1 }
     * ```
     */
    readonly convertInstanceVarsToString?: boolean | string;

    /**
     * If set, use this known classes to decode ruby objects.
     * ```js
     * class A {}
     * load(data) // => RubyObject { class: Symbol(A) }
     * load(data, { decodeKnown: { A } }) // => A {}
     * ```
     */
    readonly decodeKnown?: Record<string, ClassLike>;
}

export interface DumpOptions {
    /**
     * If set, reverses previously converted instance variables back to their initial form.
     * Specify the same value you specified in `convertInstanceVarsToString` in load().
     * ```js
     *
     * let object = { "@a": 1 }
     * dump(data) // => RubyObject { "@a": 1 }
     * dump(data, { convertStringsToInstanceVar: true }) // => RubyObject { Symbol(@a): 1 }
     *
     * object = { "a": 1 }
     * dump(data, { convertStringsToInstanceVar: "" }) // => RubyObject { Symbol(@a): 1 }
     *
     * object = { "_a": 1  }
     * dump(data, { convertStringsToInstanceVar: "_" }) // => RubyObject { Symbol(@a): 1 }
     * ```
     */
    readonly convertStringsToInstanceVar?: boolean | string;

    /**
     * If set, use this known classes to encode ruby objects.
     * ```js
     * dump(new A()) // => Error "can't dump object [object Object]"
     * dump(new A(), { encodeKnown: { A } }) // => ruby: #<A>
     * ```
     */
    readonly encodeKnown?: Record<string, ClassLike>;

    /**
     * If set, use this string for unknown classes to encode ruby objects.
     * ```js
     * dump(new A()) // => Error "can't dump object [object Object]"
     * dump(new A(), { encodeUnknown: () => "A" }) // => ruby: #<A>
     * ```
     */
    readonly encodeUnknown?: (object: unknown) => string | null | undefined;
}
