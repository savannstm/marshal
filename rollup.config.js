import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";

export default [
    {
        input: "./src/index.ts",
        output: [
            {
                file: "dist/marshal.mjs",
                format: "es",
            },
            {
                file: "dist/marshal.js",
                format: "cjs",
            },
        ],
        plugins: [typescript(), terser()],
    },
    {
        input: "./src/index.ts",
        output: [
            {
                file: "dist/marshal.d.ts",
                format: "es",
            },
            {
                file: "dist/marshal.d.mts",
                format: "es",
            },
        ],

        plugins: [dts()],
    },
];
