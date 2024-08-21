import { Constants, defaultSymbol, encodingShortSymbol, encodingSymbol, extendsSymbol } from "./constants";
import { LoadOptions } from "./options";

type PlainObject = Record<string, unknown>;

const decoder = new TextDecoder();
const decode = (buffer: Uint8Array) => decoder.decode(buffer);

const fatalDecoder = new TextDecoder("utf-8", { fatal: true });
const fatalDecode = (buffer: Uint8Array) => fatalDecoder.decode(buffer);

class Loader {
    private bytePosition: number;
    private readonly view: DataView;
    private readonly symbols: string[];
    private readonly objects: unknown[];
    private readonly options: LoadOptions;
    private readonly marshalVersion = 0x0408;

    constructor(view: DataView, loadOptions: LoadOptions = {}) {
        this.bytePosition = 0;
        this.view = view;
        this.symbols = [];
        this.objects = [];
        this.options = loadOptions;
    }

    public load() {
        if (this.bytePosition + 2 >= this.view.byteLength) {
            throw new TypeError("Marshal data is too short.");
        }

        // First two bytes indicate the Marshal version.
        // Latest Version 4.8 is used since Ruby 1.8.0 and is indicated by 0x04 and 0x08 bytes.
        if (this.view.getUint16(this.bytePosition) !== this.marshalVersion) {
            throw new TypeError("Incompatible Marshal file format or version.");
        }

        this.bytePosition += 2;

        const value = this.readNext() as object;
        this.symbols.length = 0;
        this.objects.length = 0;

        return value;
    }

    private readByte(): number {
        if (this.bytePosition >= this.view.byteLength) {
            throw new TypeError("Marshal data is too short.");
        }

        return this.view.getUint8(this.bytePosition++);
    }

    private readBytes(amount: number): Uint8Array {
        if (this.bytePosition + amount > this.view.byteLength) {
            throw new TypeError("Marshal data is too short.");
        }

        const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.bytePosition, amount);

        this.bytePosition += amount;
        return bytes;
    }

    private readFixnum(): number {
        if (this.bytePosition >= this.view.byteLength) {
            throw new TypeError("Marshal data is too short.");
        }

        const fixnumLength = this.view.getInt8(this.bytePosition++);

        if (fixnumLength === 0) {
            return 0;
        } else if (-4 <= fixnumLength && fixnumLength <= 4) {
            const absolute = Math.abs(fixnumLength);
            const scaled = (4 - absolute) * 8;
            const bytes = this.readBytes(absolute);
            let result = 0;

            for (let i = absolute - 1; i >= 0; i--) {
                result = (result << 8) | bytes[i];
            }

            return fixnumLength > 0 ? result : (result << scaled) >> scaled;
        } else {
            return fixnumLength > 0 ? fixnumLength - 5 : fixnumLength + 5;
        }
    }

    private readChunk(): Uint8Array {
        const amount = this.readFixnum();
        return this.readBytes(amount);
    }

    // Do not use readString() to really load the string, decode it on demand.
    private readString(): string {
        return decode(this.readChunk());
    }

    private readNext(): unknown {
        const structureType = this.readByte();
        const stringMode = this.options.stringMode;
        const decodeKnown = this.options.decodeKnown || {};
        const instanceVarPrefix = this.options.instanceVarPrefix;

        switch (structureType) {
            case Constants.Nil:
                return null;
            case Constants.True:
                return true;
            case Constants.False:
                return false;
            case Constants.Fixnum: {
                const fixnum = this.readFixnum();
                return fixnum;
            }
            case Constants.Symbol: {
                const symbol = "__symbol__" + this.readString();

                this.symbols.push(symbol);
                return symbol;
            }
            case Constants.Symlink: {
                const pos = this.readFixnum();
                return this.symbols[pos];
            }
            case Constants.Link: {
                const pos = this.readFixnum();

                if (this.objects[pos] === undefined) {
                    throw new TypeError("Object link points to non-existent object.");
                }

                return this.objects[pos];
            }
            case Constants.InstanceVar: {
                let object = this.readNext();
                const size = this.readFixnum();

                for (let i = 0; i < size; i++) {
                    const key = this.readNext();
                    const value = this.readNext() as Uint8Array;

                    // If object is a bytes object, and has encoding symbol, decode it to string
                    if (
                        (object as Record<string, unknown>).__type === "bytes" &&
                        [encodingShortSymbol, encodingSymbol].includes(key as string) &&
                        stringMode !== "binary"
                    ) {
                        if (key === encodingShortSymbol) {
                            object = decode(Uint8Array.from((object as Record<string, unknown>).data as number[]));
                        } else {
                            object = new TextDecoder(decode(value)).decode(
                                Uint8Array.from((object as Record<string, unknown>).data as number[]),
                            );
                        }

                        this.objects[this.objects.length - 1] = object;
                    }
                }

                return object;
            }
            // sequence ['e', :N, 'e', :M, 'o', :A, 0] produces #<A extends=[N, M]>
            // sequence ['e', :M, 'e', :C, 'o', :C, 0] produces #<C> whose singleton class prepends [M]
            // the 'singleton class' case is determined by whether the last 'e' is a class
            // here we just prepend the extends into obj.__ruby_extends__
            case Constants.Extended: {
                const symbol = this.readNext() as string;
                const object = this.readNext();

                if (object && typeof object === "object") {
                    // @ts-expect-error object can be indexed by string
                    if (!object[extendsSymbol]) {
                        // @ts-expect-error object can be indexed by string
                        object[extendsSymbol] = [symbol];
                    } else {
                        // @ts-expect-error object can be indexed by string
                        object[extendsSymbol].unshift(symbol);
                    }
                }

                return object;
            }
            case Constants.Array: {
                const arrayLength = this.readFixnum();
                const array = new Array(arrayLength) as unknown[];
                this.objects.push(array);

                for (let i = 0; i < arrayLength; i++) {
                    array[i] = this.readNext();
                }

                return array;
            }
            case Constants.Bignum: {
                const sign = this.readByte();
                const length = this.readFixnum() << 1;
                const bytes = this.readBytes(length);

                let value = 0n;

                for (let i = bytes.length - 1; i >= 0; i--) {
                    value = (value << 8n) | BigInt(bytes[i]);
                }

                if (sign !== Constants.Positive) {
                    value = -value;
                }

                const bignum = {
                    __type: "bigint",
                    value: value.toString(),
                };

                this.objects.push(bignum);
                return bignum;
            }
            case Constants.Class: {
                const objectClass = this.readString();
                const object = { __class: objectClass, __type: "class" };

                this.objects.push(object);
                return object;
            }
            case Constants.Module:
            case Constants.ModuleOld: {
                const objectClass = this.readString();
                const object = { __class: objectClass, __type: "module", __old: structureType == Constants.ModuleOld };

                this.objects.push(object);
                return object;
            }
            case Constants.Float: {
                const float = this.readString();
                let result;

                switch (float) {
                    case "inf":
                        result = Infinity;
                        break;
                    case "-inf":
                        result = -Infinity;
                        break;
                    case "nan":
                        result = NaN;
                        break;
                    default:
                        result = Number.parseFloat(float);
                        break;
                }

                this.objects.push(result);
                return result;
            }
            case Constants.Hash:
            case Constants.HashDef: {
                const hashSize = this.readFixnum();
                const hash: PlainObject = {};
                this.objects.push(hash);

                for (let i = 0; i < hashSize; i++) {
                    const key = this.readNext();
                    const value = this.readNext();

                    let keyString = "";

                    if (key === null) {
                        keyString = "__null__";
                    } else if (typeof key === "string") {
                        keyString = key;
                    } else if (typeof key === "number") {
                        keyString += Number.isInteger(key) ? "__integer__" : "__float__";
                        keyString += key.toString();
                    } else if (Array.isArray(key)) {
                        keyString += "__array__";
                        keyString += JSON.stringify(key);
                    } else if (typeof key === "object" && (key as PlainObject).__type === "object") {
                        keyString += "__object__";
                        keyString += JSON.stringify(key);
                    }

                    hash[keyString] = value;
                }

                if (structureType === Constants.HashDef) {
                    hash[defaultSymbol] = this.readNext();
                }

                return hash;
            }
            case Constants.Object: {
                const objectClass = this.readNext() as string;
                const classLike = decodeKnown[objectClass];
                const object = classLike
                    ? Object.create(classLike.prototype)
                    : { __class: objectClass, __type: "object" };
                this.objects.push(object);

                const objectSize = this.readFixnum();

                for (let i = 0; i < objectSize; i++) {
                    let key = this.readNext() as string;
                    const value = this.readNext();

                    if (instanceVarPrefix) {
                        key = key.replace(/^@/, instanceVarPrefix);
                    }

                    object[key] = value;
                }

                return object;
            }
            case Constants.Regexp: {
                const expression = this.readString();
                const options = this.readByte();
                let flags = "";

                if (options & Constants.RegExpIgnoreCase) {
                    flags += "i";
                }

                if (options & Constants.RegExpExtended) {
                    flags += "x";
                }

                if (options & Constants.RegExpMultiline) {
                    flags += "m";
                }

                const object = { __type: "regexp", expression, flags };

                this.objects.push(object);
                return object;
            }
            case Constants.String: {
                const stringBytes = this.readChunk();
                let object;

                if (stringMode === "utf8") {
                    try {
                        object = fatalDecode(stringBytes);
                    } catch {
                        object = { __type: "bytes", data: Array.from(stringBytes) };
                    }
                } else {
                    object = { __type: "bytes", data: Array.from(stringBytes) };
                }

                this.objects.push(object);
                return object;
            }
            case Constants.Struct: {
                const structClass = this.readNext();
                const struct: PlainObject = { __class: structClass, __type: "struct" };
                this.objects.push(struct);

                const structSize = this.readFixnum();
                const structMembers: PlainObject = {};

                for (let i = 0; i < structSize; i++) {
                    const key = this.readNext();
                    const value = this.readNext();

                    let keyString = "";

                    if (key === null) {
                        keyString = "__null__";
                    } else if (typeof key === "string") {
                        keyString = key;
                    } else if (typeof key === "number") {
                        keyString += Number.isInteger(key) ? "__integer__" : "__float__";
                        keyString += key.toString();
                    } else if (Array.isArray(key)) {
                        keyString += "__array__";
                        keyString += JSON.stringify(key);
                    } else if (typeof key === "object" && (key as PlainObject).__type === "object") {
                        keyString += "__object__";
                        keyString += JSON.stringify(key);
                    }

                    structMembers[keyString] = value;
                }

                struct.__members = structMembers;

                return struct;
            }
            case Constants.Data:
            case Constants.UserClass:
            case Constants.UserDef:
            case Constants.UserMarshal: {
                const objectClass = this.readNext() as string;
                const object = { __class: objectClass, __type: "object" } as PlainObject;
                this.objects.push(object);

                switch (structureType) {
                    case Constants.Data:
                        object.__data = this.readNext();
                        break;
                    case Constants.UserClass:
                        object.__wrapped = this.readNext() as typeof object.__wrapped;
                        break;
                    case Constants.UserDef:
                        object.__userDefined = Array.from(this.readChunk());
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
    const bytes = new Uint8Array(string.length);

    for (let i = 0; i < string.length; i++) {
        bytes[i] = string.charCodeAt(i);
    }

    return bytes;
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
 * ```js
 * load(fs.readFileSync('Scripts.rvdata2'))
 * load(await file.arrayBuffer())
 * ```
 */
export function load(data: string | Uint8Array | ArrayBuffer, options?: LoadOptions): unknown {
    return new Loader(toDataView(data), options).load();
}
