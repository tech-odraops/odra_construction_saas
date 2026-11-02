
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
  fontWeight,
  activateAccount,
} from "../shared-theme/themePrimitives.js";

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

    if (child === null || child === undefined) continue;

    if (typeof child === "object" && !Array.isArray(child)) {
      flattenTokens(child, name, result);
      continue;
    }

    if (typeof child !== "string" && typeof child !== "number") {
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

// Each section gets its own comment in the generated CSS.
const sections = [
  {
    title: "GRAY SCALE",
    prefix: "gray",
    tokens: gray,
  },
  {
    title: "COLOR PALETTE",
    prefix: "palette",
    tokens: colorSchemes.light.palette,
  },
  {
    title: "TYPOGRAPHY",
    prefix: "font",
    tokens: fontSizing,
  },
  {
    title: "SIZING & DIMENSIONS",
    prefix: "",
    tokens: sizing,
  },
  {
    title: "COMPONENT COLORS",
    prefix: "color",
    tokens: colors,
  },
  {
    title: "MOTION & TRANSITIONS",
    prefix: "motion",
    tokens: motion,
  },
  {
    title: "EFFECTS & OPACITY",
    prefix: "effect",
    tokens: effects,
  },
  {
    title: "SHAPE & BORDER RADIUS",
    prefix: "shape",
    tokens: shape,
  },
  {
    title: "FONT WEIGHT",
    prefix: "font-weight",
    tokens: fontWeight,
  },
  {
    title: "ACTIVATE ACCOUNT",
    prefix: "activate-account",
    tokens: activateAccount,
  }
];

const cssSections = [];

for (const section of sections) {
  const variables = flattenTokens(section.tokens, section.prefix);

  const entries = Object.entries(variables).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  const content = entries
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");

  if (content) {
    cssSections.push(
      `  /* === ${section.title} === */\n${content}`
    );
  }
}

const css = [
  "/* AUTO-GENERATED FILE. DO NOT EDIT MANUALLY. */",
  ":root {",
  cssSections.join("\n\n"),
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
