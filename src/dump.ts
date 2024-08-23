import { Constants, defaultSymbol, encodingShortSymbol, extendsSymbol } from "./constants";
import { DumpOptions } from "./options";

const encoder = new TextEncoder();
const encode = (string: string) => encoder.encode(string);

class Dumper {
    private buffer: ArrayBuffer;
    private bytes: Uint8Array;
    private bytePosition: number;
    private objects: Map<unknown, number>;
    private symbols: Map<string, number>;
    private readonly options: DumpOptions;

    constructor(dumpOptions: DumpOptions = {}) {
        this.buffer = new ArrayBuffer(16, {
            maxByteLength: dumpOptions.maxByteLength ? dumpOptions.maxByteLength : 16000000,
        }); // 16 MB might not be sufficient for some files
        this.bytes = new Uint8Array(this.buffer);
        this.bytePosition = 0;
        this.objects = new Map();
        this.symbols = new Map();

        this.options = dumpOptions;
    }

    public dump(value: unknown): Uint8Array {
        this.writeBuffer([0x04, 0x08]);
        this.writeStructure(value);

        this.objects.clear();
        this.symbols.clear();

        const array = this.bytes.subarray(0, this.bytePosition);

        this.bytePosition = 0;

        return array;
    }

    private writeByte(number: number) {
        if (this.bytePosition >= this.buffer.byteLength) {
            this.buffer.resize(this.buffer.byteLength << 1);
        }

        this.bytes[this.bytePosition++] = number;
    }

    private writeBuffer(buffer: ArrayLike<number>) {
        while (this.bytePosition + buffer.length >= this.buffer.byteLength) {
            this.buffer.resize(this.buffer.byteLength << 1);
        }

        this.bytes.set(buffer, this.bytePosition);
        this.bytePosition += buffer.length;
    }

    private writeBytes(buffer: ArrayLike<number>) {
        this.writeNumber(buffer.length);
        this.writeBuffer(buffer);
    }

    private writeStringBytes(string: string) {
        this.writeBytes(encode(string));
    }

    private writeString(string: string) {
        if (string.startsWith("__symbol__")) {
            this.writeSymbol(string);
        } else {
            //if (!this.objects.has(string)) {
            //    this.objects.set(string, this.objects.size);
            //}

            this.writeByte(Constants.InstanceVar);
            this.writeByte(Constants.String);
            this.writeStringBytes(string);
            this.writeNumber(1);
            this.writeSymbol(encodingShortSymbol);
            this.writeByte(Constants.True);
        }
    }

    private numberToBytes(number: number | bigint): Uint8Array {
        // If number is a single byte, return a Uint8Array of it
        if (typeof number === "number") {
            if (number === 0) {
                return new Uint8Array([0]);
            } else if (0 < number && number < 123) {
                return new Uint8Array([number + 5]);
            } else if (-123 <= number && number < 0) {
                return new Uint8Array([(number - 5) & 0xff]);
            }
        }

        // Determine the number of bytes needed
        const byteLength =
            typeof number === "bigint"
                ? Math.ceil(number.toString(2).length / 8) + 1
                : Math.ceil(Math.log2(Math.abs(number) + 1) / 8);

        const byteArray = new Uint8Array(byteLength + 1);

        // Set the first length byte
        byteArray[0] = number < 0 && typeof number === "number" ? 255 - byteLength + 1 : byteLength;

        // Process depending on type, bytes must be stored in little-endian order
        if (typeof number === "bigint") {
            for (let i = 1; i <= byteLength; i++) {
                let byte = Number(number & 0xffn);

                if (byte >= 127) {
                    if (byte === 255) {
                        byte = 0;
                    } else {
                        byte = ~byte + 1;
                    }
                }

                byteArray[i] = byte;
                number >>= 8n;
            }
        } else {
            for (let i = 1; i <= byteLength; i++) {
                byteArray[i] = number & 0xff;
                number >>= 8;
            }
        }

        return byteArray;
    }

    private writeNumber(number: number | bigint) {
        this.writeBuffer(this.numberToBytes(number));
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

        this.writeStringBytes(floatString);
    }

    private writeSymbol(symbol: string) {
        if (symbol.startsWith("__symbol__")) {
            symbol = symbol.slice(10);
        }

        if (this.symbols.has(symbol)) {
            this.writeByte(Constants.Symlink);
            this.writeNumber(this.symbols.get(symbol) as number);
        } else {
            this.symbols.set(symbol, this.symbols.size);
            this.writeByte(Constants.Symbol);
            this.writeBytes(encode(symbol));
        }
    }

    private writeExtended(extended: string[]) {
        for (const symbol of extended) {
            this.writeByte(Constants.Extended);
            this.writeSymbol(symbol);
        }
    }

    private writeClass(type: number, object: Record<string, unknown>) {
        if (object[extendsSymbol]) {
            this.writeExtended(object[extendsSymbol] as string[]);
        }

        this.writeByte(type);
        this.writeSymbol(object.__class as string);
    }

    private writeUserClass(object: Record<string, unknown>) {
        if (object[extendsSymbol]) {
            this.writeExtended(object[extendsSymbol] as string[]);
        }

        if (object.__wrapped) {
            this.writeByte(Constants.UserClass);
            this.writeSymbol(object.__class as string);
        }
    }

    private writeInstanceVar(object: object) {
        for (const key of ["__class", "__type", "__data", "__wrapped", "__userDefined", "__userMarshal"]) {
            // @ts-expect-error object can be indexed by string
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete object[key];
        }

        const keys = Object.keys(object);
        const objectSize = keys.length;

        if (objectSize > 0) {
            this.writeNumber(objectSize);

            for (const key of keys) {
                this.writeSymbol(key);
                // @ts-expect-error object can be indexed by string
                this.writeStructure(object[key]);
            }
        } else {
            this.writeNumber(0);
        }
    }

    private writeKnown(object: Record<string, unknown>, objectClass: string) {
        //if (!this.objects.has(object)) {
        //    this.objects.set(object, this.objects.size);
        //}

        if (object[extendsSymbol]) {
            this.writeExtended(object[extendsSymbol] as string[]);
        }

        this.writeByte(Constants.Object);
        this.writeSymbol(objectClass);
        this.writeInstanceVar(object);
    }

    private writeStructure(object: unknown) {
        const encodeKnown = this.options.encodeKnown || {};
        const encodeUnknown = this.options.encodeUnknown;

        //if (this.objects.has(JSON.stringify(object))) {
        //    this.writeByte(Constants.Link);
        //    this.writeNumber(this.objects.get(JSON.stringify(object)) as number);
        //    return;
        //}

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
                if (Number.isInteger(object) && !Object.is(object, -0.0)) {
                    this.writeByte(Constants.Fixnum);
                    this.writeNumber(object);
                } else {
                    //if (!this.objects.has(object)) {
                    //    this.objects.set(object, this.objects.size);
                    //}

                    this.writeByte(Constants.Float);
                    this.writeFloat(object);
                }
                break;
            case Array.isArray(object):
                //if (!this.objects.has(JSON.stringify(object))) {
                //    this.objects.set(JSON.stringify(object), this.objects.size);
                //}

                this.writeByte(Constants.Array);
                this.writeNumber(object.length);

                for (const element of object) {
                    this.writeStructure(element);
                }
                break;
            case object && typeof object === "object": {
                const obj = object as Record<string, unknown>;

                switch (obj.__type) {
                    case "object": {
                        //if (!this.objects.has(JSON.stringify(obj))) {
                        //    this.objects.set(JSON.stringify(obj), this.objects.size);
                        //}

                        if (obj.__data) {
                            this.writeClass(Constants.Data, obj);
                            this.writeStructure(obj.__data);
                        } else if (obj.__wrapped) {
                            this.writeUserClass(obj);
                            this.writeStructure(obj.__wrapped);
                        } else if (obj.__userDefined) {
                            const keys = Object.keys(obj);
                            const hasInstanceVar = keys.length > 0;

                            if (hasInstanceVar) {
                                this.writeByte(Constants.InstanceVar);
                            }

                            this.writeClass(Constants.UserDef, obj);
                            this.writeBytes(obj.__userDefined as number[]);

                            if (hasInstanceVar) {
                                this.writeInstanceVar(obj);
                            }
                        } else if (obj.__userMarshal) {
                            this.writeClass(Constants.UserMarshal, obj);
                            this.writeStructure(obj.__userMarshal);
                        } else {
                            this.writeClass(Constants.Object, obj);
                            this.writeInstanceVar(obj);
                        }
                        break;
                    }
                    case "struct":
                        //if (!this.objects.has(JSON.stringify(obj))) {
                        //    this.objects.set(JSON.stringify(obj), this.objects.size);
                        //}

                        this.writeClass(Constants.Struct, obj);
                        this.writeInstanceVar(obj.__members as object);
                        break;
                    case "bytes": {
                        const bytes = Uint8Array.from(obj.data as number[]);

                        //if (!this.objects.has(JSON.stringify(obj))) {
                        //    this.objects.set(JSON.stringify(obj), this.objects.size);
                        //}

                        this.writeByte(Constants.String);
                        this.writeBytes(bytes);
                        break;
                    }
                    case "class":
                        //if (!this.objects.has(JSON.stringify(obj))) {
                        //    this.objects.set(JSON.stringify(obj), this.objects.size);
                        //}

                        this.writeByte(Constants.Class);
                        this.writeStringBytes(obj.__name as string);
                        break;
                    case "module":
                        //if (!this.objects.has(JSON.stringify(obj))) {
                        //    this.objects.set(JSON.stringify(obj), this.objects.size);
                        //}

                        this.writeByte(obj.__old ? Constants.ModuleOld : Constants.Module);
                        this.writeStringBytes(obj.__name as string);
                        break;
                    case "regexp": {
                        //if (!this.objects.has(JSON.stringify(obj))) {
                        //    this.objects.set(JSON.stringify(obj), this.objects.size);
                        //}

                        this.writeByte(Constants.Regexp);
                        this.writeStringBytes(obj.expression as string);

                        const flags = obj.flags as string;
                        let options = 0;

                        if (flags.includes("i")) {
                            options |= Constants.RegExpIgnoreCase;
                        }

                        if (flags.includes("x")) {
                            options |= Constants.RegExpExtended;
                        }

                        if (flags.includes("m")) {
                            options |= Constants.RegExpMultiline;
                        }

                        this.writeByte(options);
                        break;
                    }
                    case "bigint": {
                        //if (!this.objects.has(obj)) {
                        //    this.objects.set(obj, this.objects.size);
                        //}

                        const bignum = BigInt(obj.value as string);

                        this.writeByte(Constants.Bignum);
                        this.writeByte(bignum > 0 ? Constants.Positive : Constants.Negative);
                        this.writeNumber(bignum);
                        break;
                    }
                    default: {
                        //if (!this.objects.has(JSON.stringify(obj))) {
                        //    this.objects.set(JSON.stringify(obj), this.objects.size);
                        //}

                        const defaultValue = obj[defaultSymbol];
                        this.writeByte(!defaultValue ? Constants.Hash : Constants.HashDef);

                        for (const key of [
                            "__class",
                            "__type",
                            "__data",
                            "__wrapped",
                            "__userDefined",
                            "__userMarshal",
                            defaultSymbol,
                        ]) {
                            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                            delete obj[key];
                        }

                        const keys = Object.keys(obj);
                        this.writeNumber(keys.length);

                        const objectSize = keys.length;
                        for (let i = 0; i < objectSize; i++) {
                            const key = keys[i];

                            let actualKey: undefined | null | number | object = undefined;

                            if (key === "__null__") {
                                actualKey = null;
                            } else if (key.startsWith("__integer__")) {
                                actualKey = Number.parseInt(key.slice(11));
                            } else if (key.startsWith("__float__")) {
                                actualKey = Number.parseFloat(key.slice(9));
                            } else if (key.startsWith("__array__")) {
                                actualKey = JSON.parse(key.slice(9));
                            } else if (key.startsWith("__object__")) {
                                actualKey = JSON.parse(key.slice(10));
                            }

                            this.writeStructure(actualKey !== undefined ? actualKey : key);
                            this.writeStructure(obj[key]);
                        }

                        if (defaultValue !== undefined) {
                            this.writeStructure(defaultValue);
                        }
                        break;
                    }
                }
                break;
            }
            case typeof object === "string":
                this.writeString(object);
                break;
            default: {
                const prototype = Object.getPrototypeOf(object);

                for (const classString in encodeKnown) {
                    if (prototype === encodeKnown[classString].prototype) {
                        this.writeKnown(object as Record<string, unknown>, classString);
                        return;
                    }
                }

                if (encodeUnknown) {
                    const symbol = encodeUnknown(object);

                    if (symbol) {
                        this.writeKnown(object as Record<string, unknown>, symbol);
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
    return new Dumper(options).dump(value);
}
