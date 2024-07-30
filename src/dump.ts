import { Constants, defaultString, encodingShortSymbol, extendsString } from "./constants";
import {
    RubyClass,
    RubyFloat,
    RubyHash,
    RubyInteger,
    RubyModule,
    RubyObject,
    RubyRegexp,
    RubyStruct,
} from "./ruby-classes";
import { DumpOptions } from "./options";

const encoder = new TextEncoder();
const encode = (string: string) => encoder.encode(string);

class Dumper {
    private data: Uint8Array;
    private length: number;
    private objectMap: Map<unknown, number>;
    private symbolsMap: Map<symbol, number>;
    private readonly options: DumpOptions;

    constructor(options: DumpOptions = {}) {
        this.data = new Uint8Array(16);
        this.length = 0;
        this.objectMap = new Map();
        this.symbolsMap = new Map();
        this.options = options;
    }

    public dump(value: unknown) {
        this.writeByte(4);
        this.writeByte(8);
        this.writeObject(value);

        this.objectMap.clear();
        this.symbolsMap.clear();

        return this;
    }

    public get() {
        return this.data.subarray(0, this.length);
    }

    private isPlainObject(object: unknown) {
        if (typeof object !== "object" || object === null) {
            return false;
        }

        const prototype = Object.getPrototypeOf(object);
        return prototype === Object.prototype || prototype === null;
    }

    private convertKeysToSymbols(obj: unknown, convertStringToSymbol?: boolean | string) {
        if (obj && typeof obj === "object") {
            for (const key in obj) {
                // Helper properties of objects, that shouldn't be converted
                if (
                    key === "data" ||
                    key === "wrapped" ||
                    key === "userDefined" ||
                    key === "userMarshal" ||
                    key === "classSymbol"
                ) {
                    continue;
                }

                // @ts-expect-error object can be indexed by string
                const value = obj[key];

                const symbolKey =
                    typeof convertStringToSymbol === "string"
                        ? Symbol.for("@" + key.slice(convertStringToSymbol.length))
                        : Symbol.for(key);

                // @ts-expect-error object can be indexed by symbol
                obj[symbolKey] = value;

                // @ts-expect-error object can be indexed by string
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete obj[key];
            }
        }

        return obj;
    }

    private resizeDumperData() {
        const data = new Uint8Array(this.data.byteLength << 1);

        data.set(this.data);

        this.data = data;
    }

    private writeByte(number: number) {
        if (this.length >= this.data.byteLength) {
            this.resizeDumperData();
        }

        this.data[this.length++] = number;
    }

    private writeBuffer(array: ArrayLike<number>) {
        while (this.length + array.length >= this.data.byteLength) {
            this.resizeDumperData();
        }

        this.data.set(array, this.length);
        this.length += array.length;
    }

    private writeBytes(array: ArrayLike<number>) {
        this.writeLong(array.length);
        this.writeBuffer(array);
    }

    private writeString(string: string) {
        this.writeBytes(encode(string));
    }

    private writeLong(number: number) {
        const buffer = new Uint8Array(5);
        const index = this.writeMarshalLong(number, buffer);

        this.writeBuffer(buffer.subarray(0, index));
    }

    private writeMarshalLong(long: number, buffer: Uint8Array) {
        if (long === 0) {
            buffer[0] = 0;
            return 1;
        } else if (0 < long && long < 123) {
            buffer[0] = long + 5;
            return 1;
        } else if (-124 < long && long < 0) {
            buffer[0] = (long - 5) & 0xff;
            return 1;
        }

        let i: number;

        for (i = 1; i < 5; i++) {
            buffer[i] = long & 0xff;
            long >>= 8;

            if (long === 0) {
                buffer[0] = i;
                break;
            } else if (long === -1) {
                buffer[0] = -i;
                break;
            }
        }

        return i + 1;
    }

    private writeFloat(float: number) {
        let floatString: string;

        switch (true) {
            case Number.isNaN(float):
                floatString = "nan";
                break;
            case float === Infinity:
                floatString = "inf";
                break;
            case float === -Infinity:
                floatString = "-inf";
                break;
            case Object.is(float, -0):
                floatString = "-0";
                break;
            default:
                floatString = float.toString();
        }

        this.writeString(floatString);
    }

    private writeSymbol(symbol: symbol) {
        if (this.symbolsMap.has(symbol)) {
            this.writeByte(Constants.Symlink);
            this.writeLong(this.symbolsMap.get(symbol) as number);
        } else {
            this.writeByte(Constants.Symbol);
            this.writeBytes(encode(Symbol.keyFor(symbol) as string));
            this.symbolsMap.set(symbol, this.symbolsMap.size);
        }
    }

    private writeExtended(extended: symbol[]) {
        for (const symbol of extended) {
            this.writeByte(Constants.Extended);
            this.writeSymbol(symbol);
        }
    }

    private writeClass(type: number, object: RubyObject | RubyStruct) {
        // @ts-expect-error object can be indexed by string
        if (object[extendsString]) {
            // @ts-expect-error object can be indexed by string
            this.writeExtended(object[extendsString]);
        }

        this.writeByte(type);
        this.writeSymbol(object.classSymbol);
    }

    private writeUserClass(object: RubyObject) {
        // @ts-expect-error object can be indexed by string
        if (object[extendsString]) {
            // @ts-expect-error object can be indexed by string
            this.writeExtended(object[extendsString]);
        }

        if (object.wrapped) {
            this.writeByte(Constants.UserClass);
            this.writeSymbol(object.classSymbol);
        }
    }

    private writeInstanceVar(object: object, stringToInstanceVar?: boolean | string) {
        if (stringToInstanceVar) {
            this.convertKeysToSymbols(object, stringToInstanceVar);
        }

        const symbols = Object.getOwnPropertySymbols(object);
        const number = symbols.length;

        if (number > 0) {
            this.writeLong(number);

            for (const symbol of symbols) {
                this.writeSymbol(symbol);
                // @ts-expect-error object can be indexed by symbol
                this.writeObject(object[symbol]);
            }
        } else {
            this.writeLong(0);
        }
    }

    private writeBigNum(absolute: number) {
        this.writeByte(Constants.BigNum);
        this.writeByte(absolute < 0 ? Constants.Negative : Constants.Positive);

        const buffer: number[] = [];
        absolute = Math.abs(absolute);

        do {
            buffer.push(absolute & 0xff);
            absolute = Math.floor(absolute / 256);
        } while (absolute);

        if (buffer.length & 1) {
            buffer.push(0);
        }

        this.writeLong(buffer.length >> 1);
        this.writeBuffer(buffer);
    }

    private writeRemember(object: unknown) {
        if (!this.objectMap.has(object)) {
            this.objectMap.set(object, this.objectMap.size);
        }
    }

    private writeKnown(object: object, classString: string, stringToInstanceVar?: boolean | string) {
        this.writeRemember(object);

        // @ts-expect-error object can be indexed by string
        if (object[extendsString]) {
            // @ts-expect-error object can be indexed by string
            this.writeExtended(object[extendsString]);
        }

        this.writeByte(Constants.Object);
        this.writeSymbol(Symbol.for(classString));
        this.writeInstanceVar(object, stringToInstanceVar);
    }

    private writeObject(object: unknown) {
        const encodeKnown = this.options.encodeKnown || {};
        const encodeUnknown = this.options.encodeUnknown;
        const convertStringsToInstanceVar = this.options.convertStringsToInstanceVar;

        switch (true) {
            case object === undefined:
                throw new TypeError("Type 'undefined' cannot be dumped.");
            case object === null:
                this.writeByte(Constants.Nil);
                break;
            case object === true:
                this.writeByte(Constants.True);
                break;
            case object === false:
                this.writeByte(Constants.False);
                break;
            case typeof object === "number":
                if (Number.isInteger(object)) {
                    if (-0x40000000 <= object && object < 0x40000000) {
                        this.writeByte(Constants.FixNum);
                        this.writeLong(object);
                    } else {
                        this.writeRemember(object);
                        this.writeBigNum(object);
                    }
                } else {
                    this.writeRemember(object);
                    this.writeByte(Constants.Float);
                    this.writeFloat(object);
                }
                break;
            case object instanceof RubyInteger: {
                const index = object.value;

                if (-0x40000000 <= index && index < 0x40000000) {
                    this.writeByte(Constants.FixNum);
                    this.writeLong(index);
                } else {
                    this.writeRemember(index);
                    this.writeBigNum(index);
                }
                break;
            }
            case object instanceof RubyFloat: {
                const index = object.value;
                this.writeRemember(index);
                this.writeByte(Constants.Float);
                this.writeFloat(index);
                break;
            }
            case typeof object === "symbol":
                this.writeSymbol(object as symbol);
                break;
            case this.objectMap.has(object):
                this.writeByte(Constants.Link);
                this.writeLong(this.objectMap.get(object) as number);
                break;
            case object instanceof RubyObject: {
                this.writeRemember(object);

                if (object.data !== undefined) {
                    this.writeClass(Constants.Data, object);
                    this.writeObject(object.data);
                } else if (object.wrapped !== undefined) {
                    this.writeUserClass(object);
                    this.writeObject(object.wrapped);
                } else if (object.userDefined) {
                    const keys =
                        convertStringsToInstanceVar || convertStringsToInstanceVar === "" ? Object.keys(object) : null;
                    const hasInstanceVar =
                        convertStringsToInstanceVar || convertStringsToInstanceVar === ""
                            ? (keys as string[]).length > 0
                            : Object.getOwnPropertySymbols(object).length > 0;

                    if (hasInstanceVar) {
                        this.writeByte(Constants.InstanceVar);
                    }

                    this.writeClass(Constants.UserDef, object);
                    this.writeBytes(object.userDefined);

                    if (hasInstanceVar) {
                        if (convertStringsToInstanceVar || convertStringsToInstanceVar === "") {
                            this.convertKeysToSymbols(object, convertStringsToInstanceVar);
                        }

                        this.writeInstanceVar(object, convertStringsToInstanceVar);
                    }
                } else if (object.userMarshal !== undefined) {
                    this.writeClass(Constants.UserMarshal, object);
                    this.writeObject(object.userMarshal);
                } else {
                    this.writeClass(Constants.Object, object);
                    this.writeInstanceVar(object, convertStringsToInstanceVar);
                }
                break;
            }
            case object instanceof RubyStruct:
                this.writeRemember(object);
                this.writeClass(Constants.Struct, object);
                this.writeInstanceVar(object.members as Record<symbol, unknown>, convertStringsToInstanceVar);
                break;
            case Array.isArray(object):
                this.writeRemember(object);
                this.writeByte(Constants.Array);
                this.writeLong(object.length);

                for (const element of object) {
                    this.writeObject(element);
                }
                break;
            case object instanceof RegExp: {
                this.writeRemember(object);
                this.writeByte(Constants.RegExp);
                this.writeString(object.source);

                let options = 0;

                if (object.flags.includes("i")) {
                    options |= Constants.RegExpIgnoreCase;
                }

                if (object.flags.includes("m")) {
                    options |= Constants.RegExpMultiline;
                }

                this.writeByte(options);
                break;
            }
            case object instanceof RubyRegexp:
                this.writeRemember(object);
                this.writeByte(Constants.RegExp);
                this.writeString(object.source);
                this.writeByte(object.options);
                break;
            case typeof object === "string":
                this.writeByte(Constants.InstanceVar);
                this.writeByte(Constants.String);
                this.writeString(object);
                this.writeLong(1);
                this.writeSymbol(encodingShortSymbol);
                this.writeByte(Constants.True);
                break;
            case object instanceof Uint8Array:
                this.writeRemember(object);
                this.writeByte(Constants.String);
                this.writeBytes(object);
                break;
            case object instanceof RubyClass:
                this.writeRemember(object);
                this.writeByte(Constants.Class);
                this.writeString(object.name);
                break;
            case object instanceof RubyModule:
                this.writeRemember(object);
                this.writeByte(object.old ? Constants.ModuleOld : Constants.Module);
                this.writeString(object.name);
                break;
            case object instanceof RubyHash: {
                this.writeRemember(object);

                const defaultValue = object.default;
                this.writeByte(defaultValue === undefined ? Constants.Hash : Constants.HashDef);
                this.writeLong(object.entries.length);

                const number = object.entries.length;
                for (let i = 0; i < number; ++i) {
                    const [key, value] = object.entries[i];

                    this.writeObject(key);
                    this.writeObject(value);
                }

                if (defaultValue !== undefined) {
                    this.writeObject(defaultValue);
                }
                break;
            }
            case object instanceof Map: {
                this.writeRemember(object);

                // @ts-expect-error object can be indexed by string
                const defaultValue = object[defaultString] as unknown;
                this.writeByte(defaultValue === undefined ? Constants.Hash : Constants.HashDef);
                this.writeLong(object.size);

                for (const [key, value] of object) {
                    this.writeObject(key);
                    this.writeObject(value);
                }

                if (defaultValue !== undefined) {
                    this.writeObject(defaultValue);
                }
                break;
            }
            case this.isPlainObject(object): {
                this.writeRemember(object);

                // @ts-expect-error object can be indexed by string
                const defaultValue = object[defaultString];
                this.writeByte(defaultValue === undefined ? Constants.Hash : Constants.HashDef);

                const keys = (Object.keys(object) as (string | symbol)[]).concat(Object.getOwnPropertySymbols(object));
                this.writeLong(keys.length);

                const number = keys.length;
                for (let i = 0; i < number; ++i) {
                    const key = keys[i];
                    let actualKey: null | number | symbol = null;

                    if (typeof key === "string") {
                        if (key.startsWith(":SYMBOL:")) {
                            actualKey = Symbol.for(key.slice(8));
                        } else if (key.startsWith("iINTEGERi")) {
                            actualKey = Number.parseInt(key.slice(9));
                        } else if (key.startsWith("oOBJECTo")) {
                            actualKey = JSON.parse(key.slice(8));
                        }
                    }

                    this.writeObject(actualKey ? actualKey : key);
                    // @ts-expect-error object can be indexed by string
                    this.writeObject(object[key]);
                }

                if (defaultValue !== undefined) {
                    this.writeObject(defaultValue);
                }
                break;
            }
            default: {
                const prototype = Object.getPrototypeOf(object);

                for (const classString in encodeKnown) {
                    if (prototype === encodeKnown[classString].prototype) {
                        this.writeKnown(object, classString, convertStringsToInstanceVar);
                        return;
                    }
                }

                if (encodeUnknown) {
                    const symbol = encodeUnknown(object);

                    if (symbol) {
                        this.writeKnown(object, symbol, convertStringsToInstanceVar);
                        return;
                    }
                }

                throw new TypeError(`Cannot dump type ${typeof object} of object ${object}.`);
            }
        }
    }
}

/**
 * Dump a value into marshal buffer.
 * ```js
 * dump(null) // => Uint8Array [ 4, 8, 48 ]
 * ```
 */
export function dump(value: unknown, options?: DumpOptions): Uint8Array {
    return new Dumper(options).dump(value).get();
}

export function dumpAll(value: unknown[], options?: DumpOptions): Uint8Array {
    const dumper = new Dumper(options);

    for (const element of value) {
        dumper.dump(element);
    }

    return dumper.get();
}
