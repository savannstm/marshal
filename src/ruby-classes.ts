export type Hash = Record<string | number | symbol, unknown>;

export class RubyBaseObject {
    declare __type: string;
    declare __data?: unknown;
    declare __wrapped?: string | Uint8Array | RegExp | unknown[] | Hash | RubyHash;
    declare __userDefined?: Uint8Array;
    declare __userMarshal?: unknown;
}

export class RubyObject extends RubyBaseObject {
    declare readonly __class: string;

    constructor(classString: string) {
        super();
        this.__type = "RubyObject";
        this.__class = classString;
    }
}

export class RubyStruct extends RubyBaseObject {
    declare readonly __class: string;
    declare __members?: Record<symbol, unknown>;

    constructor(classString: string, __members?: Record<symbol, unknown>) {
        super();
        this.__type = "RubyStruct";
        this.__class = classString;

        if (__members !== undefined) {
            this.__members = __members;
        }
    }
}

export class RubyClass extends RubyBaseObject {
    declare readonly __name: string;

    constructor(name: string) {
        super();
        this.__type = "RubyClass";
        this.__name = name;
    }
}

export class RubyModule extends RubyBaseObject {
    declare readonly __name: string;
    declare readonly __old: boolean;

    constructor(name: string, public old?: boolean) {
        super();
        this.__type = "RubyModule";
        this.__name = name;

        if (old !== undefined) {
            this.__old = old;
        }
    }
}

export class RubyRegexp {
    declare readonly source: string;
    declare readonly options: number;

    constructor(source = "", options = 0) {
        this.source = source;
        this.options = options;
    }
}

export class RubyHash {
    readonly entries: [unknown, unknown][];
    default?: unknown;

    constructor(entries?: [unknown, unknown][], default_?: unknown) {
        this.entries = entries || [];

        if (default_ !== undefined) {
            this.default = default_;
        }
    }
}

export class RubyRange extends RubyObject {
    constructor(begin: unknown | null, end: unknown | null, exclusive: boolean) {
        super("Range");
        this.__type = "RubyRange";
        // @ts-expect-error can be indexed by symbols
        this[Symbol.for("begin")] = begin;
        // @ts-expect-error can be indexed by symbols
        this[Symbol.for("end")] = end;
        // @ts-expect-error can be indexed by symbols
        this[Symbol.for("excl")] = exclusive;
    }
}

export interface RubyNumeric {
    readonly number: number;
    readonly isInteger: boolean;
}

export class RubyInteger implements RubyNumeric {
    public readonly number: number;
    public readonly isInteger: true;

    constructor(number: number) {
        this.number = number;
        this.isInteger = true;
    }
}

export class RubyFloat implements RubyNumeric {
    public readonly number: number;
    public readonly isInteger: false;

    constructor(number: number) {
        this.number = number;
        this.isInteger = false;
    }
}
