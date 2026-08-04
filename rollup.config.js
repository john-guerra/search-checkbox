import { readFileSync } from "fs";
import node from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import meta from "./package.json" with { type: "json" };

// Extract copyrights from the LICENSE.
const copyrights = readFileSync("./LICENSE", "utf-8")
  .split(/\n/g)
  .filter((line) => /^copyright\s+/i.test(line))
  .map((line) => line.replace(/^copyright\s+/i, ""));

const filename = "SearchCheckbox";
const banner = `// ${meta.name} v${meta.version} Copyright ${copyrights.join(", ")}`;

const base = {
  input: "src/index.js",
  output: { indent: false, banner, extend: true, name: filename },
  plugins: [commonjs(), node()],
};

// UMD bundles @observablehq/inputs and htl so a single <script> tag works
// standalone on CodePen. ESM leaves them external so bundlers can dedupe.
const external = ["@observablehq/inputs", "htl"];
const globals = { "@observablehq/inputs": "Inputs", htl: "htl" };

export default [
  {
    ...base,
    output: { ...base.output, format: "umd", file: `dist/${filename}.js` },
  },
  {
    ...base,
    output: { ...base.output, format: "umd", file: `dist/${filename}.min.js` },
    plugins: [...base.plugins, terser({ output: { preamble: banner } })],
  },
  {
    ...base,
    external,
    output: {
      ...base.output,
      format: "esm",
      file: `dist/${filename}.esm.js`,
      globals,
    },
  },
];
