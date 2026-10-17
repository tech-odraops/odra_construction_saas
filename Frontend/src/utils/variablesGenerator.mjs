
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
  gray,
  colorSchemes,
  fontSizing,
  sizing,
  colors,
  motion,
  effects,
  shape,
} from "../shared-theme/themePrimitives.js"; // Update this path

const OUTPUT = "src/shared-theme/variables.css";

function toKebabCase(value) {
  return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function flattenTokens(value, prefix = "", result = {}) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`Expected an object at "${prefix || "root"}"`);
  }

  for (const [key, child] of Object.entries(value)) {
    const name = [prefix, toKebabCase(key)]
      .filter(Boolean)
      .join("-");

    if (child === null || child === undefined) {
      continue;
    }

    if (
      typeof child === "object" &&
      !Array.isArray(child)
    ) {
      flattenTokens(child, name, result);
      continue;
    }

    if (
      typeof child !== "string" &&
      typeof child !== "number"
    ) {
      continue;
    }

    const cssName = `--${name}`;

    if (Object.hasOwn(result, cssName)) {
      throw new Error(`Duplicate CSS variable: ${cssName}`);
    }

    const cssValue = String(child);

    if (/[;{}]|\/\*/.test(cssValue)) {
      throw new Error(`Unsafe CSS value for ${cssName}`);
    }

    result[cssName] = cssValue;
  }

  return result;
}

const groups = [
  ["gray", gray],
  ["palette", colorSchemes.light.palette],
  ["font", fontSizing],
  ["", sizing],
  ["color", colors],
  ["motion", motion],
  ["effect", effects],
  ["shape", shape],
];

const variables = {};

for (const [prefix, tokens] of groups) {
  flattenTokens(tokens, prefix, variables);
}

const css = [
  "/* AUTO-GENERATED FILE. DO NOT EDIT MANUALLY. */",
  ":root {",
  ...Object.entries(variables)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `  ${name}: ${value};`),
  "}",
  "",
].join("\n");

await mkdir(dirname(OUTPUT), { recursive: true });

let previous = "";

try {
  previous = await readFile(OUTPUT, "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

if (previous !== css) {
  await writeFile(OUTPUT, css, "utf8");
  console.log(`Generated ${OUTPUT}`);
} else {
  console.log(`${OUTPUT} is already up to date`);
}
