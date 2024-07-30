import * as assert from "uvu/assert";
import * as marshal from "../src";
import { describe } from "./helper";

describe("misc", (test) => {
    test("numeric.valueOf()", () => {
        const a = new marshal.RubyInteger(1);
        const b = new marshal.RubyFloat(0.2);

        assert.is(a.value + b.value, 1 + 0.2);
    });
});
