#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_commander = require("commander");
var import_tiktoken = require("tiktoken");
var fs = __toESM(require("fs"));
var readline = __toESM(require("readline"));
function countTokens(text) {
  const enc = (0, import_tiktoken.get_encoding)("cl100k_base");
  try {
    return enc.encode(text).length;
  } finally {
    enc.free();
  }
}
function removeComments(code) {
  let result = code.replace(/\/\*[\s\S]*?\*\//g, "");
  result = result.replace(/\/\/[^\n]*/g, "");
  result = result.replace(/(?<=^|\s)#[^\n]*/gm, "");
  return result;
}
function compressBlankLines(code) {
  return code.replace(/\n{3,}/g, "\n\n");
}
function foldImports(code) {
  return code.replace(
    /import\s*\{([^}]+)\}\s*from(\s*['"][^'"]+['"])/g,
    (_match, body, from) => {
      const items = body.split(/[\n,]/).map((s) => s.trim()).filter((s) => s.length > 0).join(", ");
      return `import { ${items} } from${from}`;
    }
  );
}
function trimTrailingWhitespace(code) {
  return code.replace(/[ \t]+$/gm, "");
}
function printStats(original, result) {
  const before = countTokens(original);
  const after = countTokens(result);
  const saved = before - after;
  const pct = before > 0 ? (saved / before * 100).toFixed(1) : "0.0";
  const bar = (n, max, width = 30) => {
    const filled = Math.round(n / max * width);
    return "\u2588".repeat(filled) + "\u2591".repeat(width - filled);
  };
  process.stderr.write("\n");
  process.stderr.write("\u2500\u2500 token-trim \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n");
  process.stderr.write(`Before : ${before.toLocaleString().padStart(8)} tokens  ${bar(before, before)}
`);
  process.stderr.write(`After  : ${after.toLocaleString().padStart(8)} tokens  ${bar(after, before)}
`);
  process.stderr.write(`\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
`);
  process.stderr.write(`Saved  : ${saved.toLocaleString().padStart(8)} tokens  (${pct}% reduction)
`);
  process.stderr.write("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\n");
}
async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    const rl = readline.createInterface({ input: process.stdin });
    rl.on("line", (line) => {
      data += line + "\n";
    });
    rl.on("close", () => resolve(data));
  });
}
var program = new import_commander.Command();
program.name("token-trim").description(
  "Trim code/text files to reduce token count for AI context windows.\nReads from [file] or stdin; writes trimmed output to stdout.\n\nExample:\n  cat src/index.ts | token-trim --no-comments --stats\n  token-trim src/index.ts --no-comments --fold-imports --stats"
).version("1.0.0").argument("[file]", "input file (omit to read from stdin)").option("--no-comments", "remove // and /* */ comments").option("--fold-imports", "collapse multi-line import statements to one line").option("--trim-trailing", "strip trailing whitespace from each line").option("--stats", "print token stats (before/after) to stderr").option(
  "--encoding <name>",
  "tiktoken encoding to use for counting (default: cl100k_base)",
  "cl100k_base"
).action(async (file, options) => {
  let input;
  if (file) {
    if (!fs.existsSync(file)) {
      process.stderr.write(`token-trim: file not found: ${file}
`);
      process.exit(1);
    }
    input = fs.readFileSync(file, "utf-8");
  } else {
    if (process.stdin.isTTY) {
      program.help();
    }
    input = await readStdin();
  }
  let result = input;
  if (!options.comments) {
    result = removeComments(result);
  }
  if (options.foldImports) {
    result = foldImports(result);
  }
  if (options.trimTrailing) {
    result = trimTrailingWhitespace(result);
  }
  result = compressBlankLines(result);
  if (options.stats) {
    printStats(input, result);
  }
  process.stdout.write(result);
});
program.parse(process.argv);
