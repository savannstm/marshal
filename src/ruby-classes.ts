export type Hash = Record<string | number | symbol, unknown>;

export class RubyBaseObject {
    declare data?: unknown;
    declare wrapped?: string | Uint8Array | RegExp | unknown[] | Hash | RubyHash;
    declare userDefined?: Uint8Array;
    declare userMarshal?: unknown;
}

export class RubyObject extends RubyBaseObject {
    declare readonly classSymbol: symbol;

    constructor(classSymbol: symbol) {
        super();
        Object.defineProperty(this, "classSymbol", { value: classSymbol, configurable: true });
    }
}

export class RubyStruct extends RubyBaseObject {
    declare readonly classSymbol: symbol;
    declare members?: Record<symbol, unknown>;

    constructor(classSymbol: symbol, members?: Record<symbol, unknown>) {
        super();
        Object.defineProperty(this, "classSymbol", { value: classSymbol, configurable: true });

        if (members) {
            this.members = members;
        }
    }
}

export class RubyClass extends RubyBaseObject {
    constructor(public name: string) {
        super();
    }
}

export class RubyModule extends RubyBaseObject {
    constructor(public name: string, public old?: boolean) {
        super();
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
        super(Symbol.for("Range"));
        // @ts-expect-error can be indexed by symbols
        this[Symbol.for("begin")] = begin;
        // @ts-expect-error can be indexed by symbols
        this[Symbol.for("end")] = end;
        // @ts-expect-error can be indexed by symbols
        this[Symbol.for("excl")] = exclusive;
    }
}

export interface RubyNumeric {
    readonly isInteger: boolean;
}

export class RubyInteger implements RubyNumeric {
    readonly isInteger: true;

    constructor(public number: number) {
        this.isInteger = true;
    }
}

export class RubyFloat implements RubyNumeric {
    readonly isInteger: false;

    constructor(public number: number) {
        this.isInteger = false;
    }
}
