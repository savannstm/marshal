import { load } from "../src";
import { getLineNumber } from "./functions";

console.log("Loading");

// Incorrect Marshal version
{
    try {
        load(new Uint8Array([0x04, 0x09]));
        throw "Must panic on incompatible marshal version";
    } catch {
        /* empty */
    }
}

// Null
{
    const left = load("\x04\x08\x30");
    const right = null;
    console.assert(left === right, { line: getLineNumber(), left, right });
}

// Boolean
{
    {
        const left = load("\x04\x08\x54");
        const right = true;
        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    {
        const left = load("\x04\x08\x46");
        const right = false;
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}

// Positive fixnum
{
    {
        const left = load("\x04\x08\x69\x00");
        const right = 0;
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
    {
        const left = load("\x04\x08\x69\x0a");
        const right = 5;
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
    {
        const left = load("\x04\x08\x69\x02\x2c\x01");
        const right = 300;
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
    {
        const left = load("\x04\x08\x69\x03\x70\x11\x01");
        const right = 70000;
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
    {
        const left = load("\x04\x08\x69\x04\x00\x00\x00\x01");
        const right = 16777216;
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}

// Negative fixnum
{
    {
        const left = load("\x04\x08\x69\xf6");
        const right = -5;
        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    {
        const left = load("\x04\x08\x69\xfe\xd4\xfe");
        const right = -300;
        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    {
        const left = load("\x04\x08\x69\xfd\x90\xee\xfe");
        const right = -70000;
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}

// Bignum
{
    {
        const left = JSON.stringify(load("\x04\x08l+\n\x00\x00\x00\x00\x00\x00\x00\x00\x02\x00"));
        const right = JSON.stringify({ __type: "bigint", value: "36893488147419103232" });
        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    {
        const left = JSON.stringify(load("\x04\x08l+\n\x00\x00\x00\x00\x00\x00\x00\x00\x04\x00"));
        const right = JSON.stringify({ __type: "bigint", value: "73786976294838206464" });
        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    {
        const left = JSON.stringify(load("\x04\x08l+\n\x00\x00\x00\x00\x00\x00\x00\x00\x08\x00"));
        const right = JSON.stringify({ __type: "bigint", value: "147573952589676412928" });
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}

// Negative bignum
{
    const left = JSON.stringify(load("\x04\x08l-\n\x00\x00\x00\x00\x00\x00\x00\x00\x02\x00"));
    const right = JSON.stringify({ __type: "bigint", value: "-36893488147419103232" });
    console.assert(left === right, { line: getLineNumber(), left, right });
}

// Float
{
    // Zero float
    {
        const left = load("\x04\x08f\x06\x30");
        const right = 0;
        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    // Minus zero float
    {
        const left = load("\x04\x08f\x07-0");
        const right = -0;
        console.assert(Object.is(left, right), { line: getLineNumber(), left, right });
    }

    // Pi float
    {
        const left = load("\x04\x08f\x0C\x33\x2E\x31\x34\x31\x35\x39");
        const right = 3.14159;
        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    // E float
    {
        const left = load("\x04\x08f\x0D\x2D\x32\x2E\x37\x31\x38\x32\x38");
        const right = -2.71828;
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}

// Strings with instance vars
{
    {
        const left = load('\x04\x08I"\x11Short string\x06:\x06ET');
        const right = "Short string";
        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    {
        const left = load(
            '\x04\x08I"\x01\xdcLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong string\x06:\x06ET',
        );
        const right = "Long string".repeat(20);
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}

// Force strings to binary
{
    {
        const shortString = '\x04\x08I"\x11Short string\x06:\x06ET';
        const left = JSON.stringify(load(shortString, { stringMode: "binary" }));
        const right = JSON.stringify({
            __type: "bytes",
            data: [83, 104, 111, 114, 116, 32, 115, 116, 114, 105, 110, 103],
        });
        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    {
        const longString =
            '\x04\x08I"\x01\xdcLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong stringLong string\x06:\x06ET';
        const left = JSON.stringify(load(longString, { stringMode: "binary" }));
        const right = JSON.stringify({
            __type: "bytes",
            data: [
                76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110,
                103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105,
                110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114,
                105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116,
                114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115,
                116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32,
                115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103,
                32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110,
                103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111,
                110, 103, 32, 115, 116, 114, 105, 110, 103, 76, 111, 110, 103, 32, 115, 116, 114, 105, 110, 103, 76,
                111, 110, 103, 32, 115, 116, 114, 105, 110, 103,
            ],
        });
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}

// Invalid string length
{
    try {
        load('\x04\x08"\x10\xf0(\x8c(');
        throw "Must panic because of invalid string length";
    } catch {
        /* empty */
    }
}

// Regexp
{
    // Without x flag
    {
        const left = JSON.stringify(load("\x04\bI/\nligma\x05\x06:\x06EF"));
        const right = JSON.stringify({ __type: "regexp", expression: "ligma", flags: "im" });

        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    // With x flag
    {
        const left = JSON.stringify(load("\x04\bI/\nligma\x07\x06:\x06EF"));
        const right = JSON.stringify({ __type: "regexp", expression: "ligma", flags: "ixm" });

        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}

// Link
{
    const left = JSON.stringify(
        load("\x04\x08[\x08[\x08f\x080.1@\x07@\x07[\x08f\x080.2@\x09@\x09[\x08f\x080.3@\x0b@\x0b"),
    );
    const right = JSON.stringify([
        [0.1, 0.1, 0.1],
        [0.2, 0.2, 0.2],
        [0.3, 0.3, 0.3],
    ]);

    console.assert(left === right, { line: getLineNumber(), left, right });
}

// Array
{
    const left = JSON.stringify(load('\x04\x08[\x0ai\x06I"\x08two\x06:\x06ETf\x063[\x06i\x09{\x06i\x0ai\x0b'));
    const right = JSON.stringify([1, "two", 3.0, [4], { __integer__5: 6 }]);
    console.assert(left === right, { line: getLineNumber(), left, right });
}

// Hash
{
    {
        const left = JSON.stringify(
            load('\x04\x08{\x08i\x06I"\x08one\x06:\x06ETI"\x08two\x06;\x00Ti\x07o:\x0bObject\x000'),
        );
        const right = JSON.stringify({
            __integer__1: "one",
            two: 2,
            '__object__{"__class":"__symbol__Object","__type":"object"}': null,
        });
        console.assert(left === right, { line: getLineNumber(), left, right });
    }

    {
        const left = JSON.stringify(load('\x04\x08}\x00I"\x0cdefault\x06:\x06ET'));
        const right = JSON.stringify({ __ruby_default__: "default" });
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}

// Struct
{
    {
        const left = JSON.stringify(load('\x04\x08S:\x0bPerson\x07:\x09nameI"\x0aAlice\x06:\x06ET:\x08agei#'));
        const right = JSON.stringify({
            __class: "__symbol__Person",
            __type: "struct",
            __members: { __symbol__name: "Alice", __symbol__age: 30 },
        });
        console.assert(left === right, { line: getLineNumber(), left, right });
    }
}

// Object
{
    const left = JSON.stringify(load('\x04\x08o:\x11CustomObject\x06:\x0a@dataI"\x10object data\x06:\x06ET'));
    const right = JSON.stringify({
        __class: "__symbol__CustomObject",
        __type: "object",
        "__symbol__@data": "object data",
    });
    console.assert(left === right, { line: getLineNumber(), left, right });
}
