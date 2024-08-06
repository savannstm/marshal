import { Constants, encodingShortSymbol, encodingSymbol, extendsString, defaultString } from "./constants";
import {
    Hash,
    RubyClass,
    RubyFloat,
    RubyHash,
    RubyInteger,
    RubyModule,
    RubyObject,
    RubyStruct,
    RubyRegexp,
} from "./ruby-classes";
import { LoadOptions } from "./options";

const decoder = new TextDecoder();
const decode = (buffer: Uint8Array) => decoder.decode(buffer);

function defineExtends(object: unknown): symbol[] | undefined {
    // @ts-expect-error object can be indexed by string
    if (typeof object === "object" && object && !object[extendsString]) {
        const value: symbol[] = [];

        Object.defineProperty(object, extendsString, { value, configurable: true });

        return value;
    }

    // @ts-expect-error object can be indexed by string
    return object && object[extendsString];
}

function defineHashDefault(hash: object, value: unknown) {
    Object.defineProperty(hash, defaultString, { value, configurable: true });
}

class Loader {
    private pos: number;
    private readonly view: DataView;
    private readonly symbols: symbol[];
    private readonly objects: unknown[];
    private readonly options: LoadOptions;

    constructor(view: DataView, options: LoadOptions = {}) {
        this.pos = 0;
        this.view = view;
        this.symbols = [];
        this.objects = [];
        this.options = options;
    }

    public empty() {
        return this.pos >= this.view.byteLength;
    }

    public get() {
        if (this.pos + 2 >= this.view.byteLength) {
            throw new TypeError("Marshal data is too short.");
        }

        // First two bytes indicate the Marshal version.
        // Latest Version 4.8 is used since Ruby 1.8.0 and is indicated by 0x04 and 0x08 bytes.
        if (this.view.getInt16(this.pos) !== 0x0408) {
            throw new TypeError("Incompatible Marshal file format or version.");
        }

        this.pos += 2;

        const value = this.readNext() as object;
        this.symbols.length = 0;
        this.objects.length = 0;

        return value;
    }

    private readByte(): number {
        if (this.pos >= this.view.byteLength) {
            throw new TypeError("Marshal data is too short.");
        }

        return this.view.getUint8(this.pos++);
    }

    private readBytes(count: number): Uint8Array {
        if (this.pos + count > this.view.byteLength) {
            throw new TypeError("Marshal data is too short.");
        }

        this.pos += count;
        return new Uint8Array(this.view.buffer, this.view.byteOffset + (this.pos - count), count);
    }

    private readFixNum(): number {
        if (this.pos >= this.view.byteLength) {
            throw new TypeError("Marshal data is too short.");
        }

        const type = this.view.getInt8(this.pos++);

        if (type === 0) {
            return 0;
        } else if (-4 <= type && type <= 4) {
            const negative = Math.abs(type);
            const scaled = (4 - negative) * 8;
            const bytes = this.readBytes(negative);
            let accumulated = 0;

            for (let i = negative - 1; i >= 0; i--) {
                accumulated = (accumulated << 8) | bytes[i];
            }

            return type > 0 ? accumulated : (accumulated << scaled) >> scaled;
        } else {
            return type > 0 ? type - 5 : type + 5;
        }
    }

    private readChunk(): Uint8Array {
        return this.readBytes(this.readFixNum());
    }

    // Do not use readString() to really load the string, decode it on demand.
    private readString(): string {
        return decode(this.readChunk());
    }

    private pushObject<T = unknown>(object: T): T {
        this.objects.push(object);
        return object;
    }

    private pushSymbol(symbol: symbol) {
        this.symbols.push(symbol);
        return symbol;
    }

    private readBigNum(): number {
        const sign = this.readByte();
        const negative = this.readFixNum() << 1;
        const bytes = this.readBytes(negative);
        let accumulated = 0;

        for (let i = 0; i < negative; i++) {
            accumulated += bytes[i] * 2 ** (i << 3);
        }

        return sign === Constants.Positive ? accumulated : -accumulated;
    }

    private readFloat(): number {
        const string = this.readString();

        switch (string) {
            case "inf":
                return Infinity;
            case "-inf":
                return -Infinity;
            case "nan":
                return NaN;
            default:
                return Number.parseFloat(string);
        }
    }

    private readRegExp(): RegExp {
        const string = this.readString();
        const type = this.readByte();
        let flags = "";

        if (type & Constants.RegExpIgnoreCase) {
            flags += "i";
        }

        if (type & Constants.RegExpMultiline) {
            flags += "m";
        }

        return new RegExp(string, flags);
    }

    private setHash(hash: Hash, key: unknown, value: unknown, convertSymbolKeysToString?: boolean): Hash {
        const type = typeof key;

        switch (true) {
            case type === "symbol" || type === "string" || type === "number":
                if (type === "symbol") {
                    if (convertSymbolKeysToString) {
                        key = `__symbol__${Symbol.keyFor(key as symbol)}`;
                    }
                } else if (type === "number") {
                    key = `__integer__${key}`;
                }

                hash[key as typeof type] = value;
                break;
            case key instanceof Uint8Array:
                hash[decode(key)] = value;
                break;
            case key instanceof RubyInteger || key instanceof RubyFloat:
                hash[key.number] = value;
                break;
            case key instanceof RubyObject || typeof key === "object":
                key = `__object__${JSON.stringify(key)}`;
                hash[key as string] = value;
        }

        return hash;
    }

    private setInstanceVar(
        object: object,
        key: unknown,
        value: unknown,
        convertInstanceVarsToString?: boolean | string
    ) {
        if (convertInstanceVarsToString !== undefined) {
            const symbolString = Symbol.keyFor(key as symbol) as string;

            try {
                if (typeof convertInstanceVarsToString === "boolean") {
                    // @ts-expect-error object can be indexed by string
                    object[symbolString] = value;
                } else {
                    // @ts-expect-error object can be indexed by string
                    object[symbolString.replace(/^@/, convertInstanceVarsToString)] = value;
                }
            } catch {
                // Object cannot hold properties
            }
        } else {
            try {
                // @ts-expect-error object can be indexed by unknown?
                object[key] = value;
            } catch {
                // Object cannot hold properties
            }
        }
    }

    private readNext(): unknown {
        const type = this.readByte();
        const string = this.options.string;
        const numeric = this.options.numeric === "wrap";
        const wrapRegExp = this.options.regexp === "wrap";
        const convertInstanceVarsToString = this.options.convertInstanceVarsToString;
        const decodeKnown = this.options.decodeKnown || {};

        switch (type) {
            case Constants.Nil:
                return null;
            case Constants.True:
                return true;
            case Constants.False:
                return false;
            case Constants.FixNum: {
                const index = this.readFixNum();
                return numeric ? new RubyInteger(index) : index;
            }
            case Constants.Symbol:
                return this.pushSymbol(Symbol.for(this.readString()));
            case Constants.Symlink:
                return this.symbols[this.readFixNum()];
            case Constants.Link:
                return this.objects[this.readFixNum()];
            case Constants.InstanceVar: {
                let object = this.readNext();
                const number = this.readFixNum();

                for (let i = 0; i < number; ++i) {
                    const key = this.readNext();
                    const value = this.readNext();

                    // If a string, read as Uint8Array, has ivar :E or :encoding, decode it
                    if (
                        object instanceof Uint8Array &&
                        (key === encodingShortSymbol || key === encodingSymbol) &&
                        string !== "binary"
                    ) {
                        if (key === encodingShortSymbol) {
                            object = decode(object);
                        } else {
                            object = new TextDecoder(decode(value as Uint8Array)).decode(object);
                        }

                        this.objects[this.objects.length - 1] = object;
                    }
                    // Otherwise try to put the ivar
                    else if (object != null) {
                        // Primitive types (boolean, number, string, symbol, ...) cannot hold properties,
                        // So code below silently fail. Other objects get a [Symbol(@key)] property
                        this.setInstanceVar(object, key, value, convertInstanceVarsToString);
                    }
                }

                return object;
            }
            // sequence ['e', :N, 'e', :M, 'o', :A, 0] produces #<A extends=[N, M]>
            // sequence ['e', :M, 'e', :C, 'o', :C, 0] produces #<C> whose singleton class prepends [M]
            // the 'singleton class' case is determined by whether the last 'e' is a class
            // here we just prepend the extends into obj.__ruby_extends__
            case Constants.Extended: {
                const symbol = this.readNext() as symbol;
                const object = this.readNext();
                const extends_ = defineExtends(object);

                if (extends_) {
                    extends_.unshift(symbol);
                }

                return object;
            }
            case Constants.Array: {
                const number = this.readFixNum();
                const accumulated = this.pushObject(Array(number)) as unknown[];

                for (let i = 0; i < number; ++i) {
                    accumulated[i] = this.readNext();
                }

                return accumulated;
            }
            case Constants.BigNum: {
                const index = this.readBigNum();
                return this.pushObject(numeric ? new RubyInteger(index) : index);
            }
            case Constants.Class:
                return this.pushObject(new RubyClass(this.readString()));
            case Constants.Module:
            case Constants.ModuleOld:
                return this.pushObject(new RubyModule(this.readString(), type === Constants.ModuleOld));
            case Constants.Float: {
                const index = this.readFloat();
                return this.pushObject(numeric ? new RubyFloat(index) : index);
            }
            case Constants.Hash:
            case Constants.HashDef: {
                const hashType = this.options.hash;
                const symbolToString = this.options.convertHashKeysToString;

                switch (hashType) {
                    case "map": {
                        const number = this.readFixNum();
                        const map = this.pushObject(new Map());

                        for (let i = 0; i < number; ++i) {
                            const key = this.readNext();
                            const value = this.readNext();

                            map.set(key, value);
                        }

                        if (type === Constants.HashDef) {
                            defineHashDefault(map, this.readNext());
                        }

                        return map;
                    }
                    case "wrap": {
                        const number = this.readFixNum();
                        const wrapper = this.pushObject(new RubyHash([]));

                        for (let i = 0; i < number; ++i) {
                            const key = this.readNext();
                            const value = this.readNext();

                            wrapper.entries.push([key, value]);
                        }

                        if (type === Constants.HashDef) {
                            wrapper.default = this.readNext();
                        }

                        return wrapper;
                    }
                    default: {
                        const number = this.readFixNum();
                        const hash: Hash = this.pushObject({});

                        for (let i = 0; i < number; ++i) {
                            const key = this.readNext();
                            const value = this.readNext();

                            this.setHash(hash, key, value, symbolToString);
                        }

                        if (type === Constants.HashDef) {
                            defineHashDefault(hash, this.readNext());
                        }

                        return hash;
                    }
                }
            }
            case Constants.Object: {
                const classSymbol = this.readNext() as symbol;
                const classString = Symbol.keyFor(classSymbol) as string;
                const classLike = decodeKnown[classString];
                const object: RubyObject = this.pushObject(
                    classLike ? Object.create(classLike.prototype) : new RubyObject(classString)
                );
                const number = this.readFixNum();

                for (let i = 0; i < number; ++i) {
                    const key = this.readNext();
                    const value = this.readNext();

                    this.setInstanceVar(object, key, value, convertInstanceVarsToString);
                }

                return object;
            }
            case Constants.RegExp:
                return this.pushObject(
                    wrapRegExp ? new RubyRegexp(this.readString(), this.readByte()) : this.readRegExp()
                );
            case Constants.String:
                return this.pushObject(string === "utf8" ? this.readString() : this.readChunk());
            case Constants.Struct: {
                const symbol = this.pushObject(new RubyStruct(Symbol.keyFor(this.readNext() as symbol) as string));
                const number = this.readFixNum();
                const hash: Hash = {};

                for (let i = 0; i < number; ++i) {
                    this.setHash(hash, this.readNext(), this.readNext());
                }

                symbol.__members = hash;
                return symbol;
            }
            case Constants.Data:
            case Constants.UserClass:
            case Constants.UserDef:
            case Constants.UserMarshal: {
                const object = this.pushObject(new RubyObject(Symbol.keyFor(this.readNext() as symbol) as string));

                switch (type) {
                    case Constants.Data:
                        object.__data = this.readNext();
                        break;
                    case Constants.UserClass:
                        object.__wrapped = this.readNext() as typeof object.__wrapped;
                        break;
                    case Constants.UserDef:
                        object.__userDefined = this.readChunk();
                        break;
                    case Constants.UserMarshal:
                        object.__userMarshal = this.readNext();
                        break;
                }

                return object;
            }
        }
    }
}

function toBinary(string: string): Uint8Array {
    const bytesArray = new Uint8Array(string.length);

    for (let i = 0; i < string.length; ++i) {
        bytesArray[i] = string.charCodeAt(i);
    }

    return bytesArray;
}

function toDataView(data: string | Uint8Array | ArrayBuffer): DataView {
    if (typeof data === "string") {
        data = toBinary(data);
    } else if (data instanceof ArrayBuffer) {
        return new DataView(data);
    }

    return new DataView(data.buffer, data.byteOffset, data.byteLength);
}

/**
 * Load one marshal section from buffer.
 *
 * If you need to load multiple times (like RGSS1), use `loadAll`.
 * ```js
 * load(fs.readFileSync('Scripts.rvdata2'))
 * load(await file.arrayBuffer())
 * ```
 */
export function load(data: string | Uint8Array | ArrayBuffer, options?: LoadOptions): unknown {
    return new Loader(toDataView(data), options).get();
}

export function loadAll(data: string | Uint8Array | ArrayBuffer, options?: LoadOptions): unknown[] {
    const parser = new Loader(toDataView(data), options);
    const array: unknown[] = [];

    while (!parser.empty()) {
        array.push(parser.get());
    }

    return array;
}
