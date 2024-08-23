import { dump } from "../src";
import { getLineNumber } from "./functions";

console.log("Dumping");

// Incorrect Marshal version
{
    try {
        dump(new Uint8Array([0x04, 0x09]));
        throw `Must panic on incompatible marshal version\nline: ${getLineNumber()}`;
    } catch {
        /* empty */
    }
}

// Null
{
    const left = JSON.stringify(Array.from(dump(null)));
    const right = JSON.stringify([4, 8, 48]);
    console.assert(left === right, {
        line: getLineNumber(),
        left,
        right,
    });
}

// Boolean
{
    {
        const left = JSON.stringify(Array.from(dump(true)));
        const right = JSON.stringify([4, 8, 84]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
    {
        const left = JSON.stringify(Array.from(dump(false)));
        const right = JSON.stringify([4, 8, 70]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}

// Positive fixnum
{
    {
        const left = JSON.stringify(Array.from(dump(0)));
        const right = JSON.stringify([4, 8, 105, 0]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
    {
        const left = JSON.stringify(Array.from(dump(5)));
        const right = JSON.stringify([4, 8, 105, 10]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
    {
        const left = JSON.stringify(Array.from(dump(300)));
        const right = JSON.stringify([4, 8, 105, 2, 44, 1]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
    {
        const left = JSON.stringify(Array.from(dump(70000)));
        const right = JSON.stringify([4, 8, 105, 3, 112, 17, 1]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
    {
        const left = JSON.stringify(Array.from(dump(16777216)));
        const right = JSON.stringify([4, 8, 105, 4, 0, 0, 0, 1]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}

// Negative fixnum
{
    {
        const left = JSON.stringify(Array.from(dump(-5)));
        const right = JSON.stringify([4, 8, 105, 246]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    {
        const left = JSON.stringify(Array.from(dump(-300)));
        const right = JSON.stringify([4, 8, 105, 254, 212, 254]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    {
        const left = JSON.stringify(Array.from(dump(-70000)));
        const right = JSON.stringify([4, 8, 105, 253, 144, 238, 254]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}

// Bignum
{
    const left = JSON.stringify(Array.from(dump({ __type: "bigint", value: "36893488147419103232" })));
    const right = JSON.stringify([4, 8, 108, 43, 10, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0]);
    console.assert(left === right, { line: getLineNumber(), left, right });
}

// Negative bignum
{
    const left = JSON.stringify(Array.from(dump({ __type: "bigint", value: "-36893488147419103232" })));
    const right = JSON.stringify([4, 8, 108, 45, 10, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0]);
    console.assert(left === right, { line: getLineNumber(), left, right });
}

// Float
{
    {
        const left = JSON.stringify(Array.from(dump(0.0)));
        const right = JSON.stringify([4, 8, 105, 0]);

        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    {
        const left = JSON.stringify(Array.from(dump(-0.0)));
        const right = JSON.stringify([4, 8, 102, 7, 45, 48]);

        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    {
        const left = JSON.stringify(Array.from(dump(3.14159)));
        const right = JSON.stringify([4, 8, 102, 12, 51, 46, 49, 52, 49, 53, 57]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    {
        const left = JSON.stringify(Array.from(dump(-2.71828)));
        const right = JSON.stringify([4, 8, 102, 13, 45, 50, 46, 55, 49, 56, 50, 56]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}

// Strings with instance vars
{
    {
        const left = JSON.stringify(Array.from(dump("Short string")));
        const right = JSON.stringify([
            4, 8, 73, 34, 17, 83, 104, 111, 114, 116, 32, 115, 116, 114, 105, 110, 103, 6, 58, 6, 69, 84,
        ]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    {
        const left = JSON.stringify(Array.from(dump("Long string".repeat(20))));
        const right = JSON.stringify([
            4, 8, 73, 34, 1, 220, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116,
            114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116,
            114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116,
            114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116,
            114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116,
            114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116,
            114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116,
            114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116,
            114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116,
            114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116,
            114, 105, 110, 103, 6, 58, 6, 69, 84,
        ]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}

// Force strings to binary
{
    {
        const left = JSON.stringify(
            Array.from(dump({ __type: "bytes", data: [83, 104, 111, 114, 116, 32, 115, 116, 114, 105, 110, 103] })),
        );
        const right = JSON.stringify([4, 8, 34, 17, 83, 104, 111, 114, 116, 32, 115, 116, 114, 105, 110, 103]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    {
        const left = JSON.stringify(
            Array.from(
                dump({
                    __type: "bytes",
                    data: [
                        76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105,
                        110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116,
                        114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32,
                        115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110,
                        103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76,
                        111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110,
                        103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114,
                        105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115,
                        116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103,
                        32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111,
                        110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103,
                    ],
                }),
            ),
        );
        const right = JSON.stringify([
            4, 8, 34, 1, 220, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114,
            105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114,
            105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114,
            105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114,
            105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114,
            105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114,
            105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114,
            105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114,
            105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114,
            105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114,
            105, 110, 103,
        ]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}

// Regexp
{
    // Without x flag
    {
        const left = JSON.stringify(Array.from(dump({ __type: "regexp", expression: "ligma", flags: "im" })));
        const right = JSON.stringify([4, 8, 47, 10, 108, 105, 103, 109, 97, 5]);

        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    // With x flag
    {
        const left = JSON.stringify(Array.from(dump({ __type: "regexp", expression: "ligma", flags: "ixm" })));
        const right = JSON.stringify([4, 8, 47, 10, 108, 105, 103, 109, 97, 7]);

        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}

// Array
{
    new TextDecoder().decode(dump([1, "two", 3.0, [4], { __integer__5: 6 }]));
    const left = JSON.stringify(Array.from(dump([1, "two", 3.0, [4], { __integer__5: 6 }])));
    const right = JSON.stringify([
        4, 8, 91, 10, 105, 6, 73, 34, 8, 116, 119, 111, 6, 58, 6, 69, 84, 105, 8, 91, 6, 105, 9, 123, 6, 105, 10, 105,
        11,
    ]);
    console.assert(left === right, { line: getLineNumber(), left, right });
}

// Hash
{
    {
        const left = JSON.stringify(
            Array.from(
                dump({
                    __integer__1: "one",
                    two: 2,
                    '__object__{"__class":"__symbol__Object","__type":"object"}': null,
                }),
            ),
        );
        const right = JSON.stringify([
            4, 8, 123, 8, 105, 6, 73, 34, 8, 111, 110, 101, 6, 58, 6, 69, 84, 73, 34, 8, 116, 119, 111, 6, 59, 0, 84,
            105, 7, 111, 58, 11, 79, 98, 106, 101, 99, 116, 0, 48,
        ]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    {
        const left = JSON.stringify(Array.from(dump({ __ruby_default__: "default" })));
        const right = JSON.stringify([4, 8, 125, 0, 73, 34, 12, 100, 101, 102, 97, 117, 108, 116, 6, 58, 6, 69, 84]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}

// Struct
{
    const left = JSON.stringify(
        Array.from(
            dump({
                __class: "__symbol__Person",
                __type: "struct",
                __members: { __symbol__name: "Alice", __symbol__age: 30 },
            }),
        ),
    );
    const right = JSON.stringify([
        4, 8, 83, 58, 11, 80, 101, 114, 115, 111, 110, 7, 58, 9, 110, 97, 109, 101, 73, 34, 10, 65, 108, 105, 99, 101,
        6, 58, 6, 69, 84, 58, 8, 97, 103, 101, 105, 35,
    ]);
    console.assert(left === right, { line: getLineNumber(), left, right });
}

// Object
{
    {
        const left = JSON.stringify(
            Array.from(dump({ __class: "__symbol__CustomObject", __type: "object", "__symbol__@data": "object data" })),
        );
        const right = JSON.stringify([
            4, 8, 111, 58, 17, 67, 117, 115, 116, 111, 109, 79, 98, 106, 101, 99, 116, 6, 58, 10, 64, 100, 97, 116, 97,
            73, 34, 16, 111, 98, 106, 101, 99, 116, 32, 100, 97, 116, 97, 6, 58, 6, 69, 84,
        ]);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}
