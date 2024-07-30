import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";

export default [
    {
        input: "./src/index.ts",
        output: [
            {
                file: "dist/bundle.mjs",
                format: "es",
                sourcemap: true,
            },
            {
                file: "dist/bundle.js",
                format: "cjs",
                sourcemap: true,
            },
        ],
        plugins: [typescript(), terser()],
    },
    {
        input: "./src/index.ts",
        output: {
            file: "dist/bundle.d.ts",
            format: "es",
        },

        plugins: [dts()],
    },
];
