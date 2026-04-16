#!/usr/bin/env node

import { Command } from "commander";
import { get_encoding } from "tiktoken";
import * as fs from "fs";
import * as readline from "readline";

// ─── Token counting ───────────────────────────────────────────────────────────

function countTokens(text: string): number {
  const enc = get_encoding("cl100k_base"); // GPT-4 / Claude 近似
  try {
    return enc.encode(text).length;
  } finally {
    enc.free();
  }
}

// ─── Transforms ───────────────────────────────────────────────────────────────

/**
 * JS/TS/C スタイルのコメントを除去する。
 * 文字列リテラル内の // や /* は除去しない（ベストエフォート）。
 */
function removeComments(code: string): string {
  // ブロックコメント /* ... */ を除去（改行を含む）
  let result = code.replace(/\/\*[\s\S]*?\*\//g, "");
  // 行コメント // ... を除去
  result = result.replace(/\/\/[^\n]*/g, "");
  // Python / Ruby / Shell スタイル # コメントを除去（行頭または空白後）
  result = result.replace(/(?<=^|\s)#[^\n]*/gm, "");
  return result;
}

/**
 * 連続する空白行を最大 1 行に圧縮する。
 */
function compressBlankLines(code: string): string {
  return code.replace(/\n{3,}/g, "\n\n");
}

/**
 * 複数行にまたがる import 文を 1 行に折り畳む。
 * import {
 *   A,
 *   B,
 * } from 'x'
 * → import { A, B } from 'x'
 */
function foldImports(code: string): string {
  return code.replace(
    /import\s*\{([^}]+)\}\s*from(\s*['"][^'"]+['"])/g,
    (_match, body: string, from: string) => {
      const items = body
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .join(", ");
      return `import { ${items} } from${from}`;
    }
  );
}

/**
 * 行末の余分な空白を除去する。
 */
function trimTrailingWhitespace(code: string): string {
  return code.replace(/[ \t]+$/gm, "");
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function printStats(original: string, result: string): void {
  const before = countTokens(original);
  const after = countTokens(result);
  const saved = before - after;
  const pct = before > 0 ? ((saved / before) * 100).toFixed(1) : "0.0";

  const bar = (n: number, max: number, width = 30): string => {
    const filled = Math.round((n / max) * width);
    return "█".repeat(filled) + "░".repeat(width - filled);
  };

  process.stderr.write("\n");
  process.stderr.write("── token-trim ─────────────────────────────\n");
  process.stderr.write(`Before : ${before.toLocaleString().padStart(8)} tokens  ${bar(before, before)}\n`);
  process.stderr.write(`After  : ${after.toLocaleString().padStart(8)} tokens  ${bar(after, before)}\n`);
  process.stderr.write(`────────────────────────────────────────────\n`);
  process.stderr.write(`Saved  : ${saved.toLocaleString().padStart(8)} tokens  (${pct}% reduction)\n`);
  process.stderr.write("────────────────────────────────────────────\n\n");
}

// ─── stdin helper ─────────────────────────────────────────────────────────────

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    const rl = readline.createInterface({ input: process.stdin });
    rl.on("line", (line) => { data += line + "\n"; });
    rl.on("close", () => resolve(data));
  });
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

interface Options {
  comments: boolean;       // --no-comments でfalseになる
  foldImports: boolean;
  trimTrailing: boolean;
  stats: boolean;
  encoding: string;
}

const program = new Command();

program
  .name("token-trim")
  .description(
    "Trim code/text files to reduce token count for AI context windows.\n" +
    "Reads from [file] or stdin; writes trimmed output to stdout.\n\n" +
    "Example:\n" +
    "  cat src/index.ts | token-trim --no-comments --stats\n" +
    "  token-trim src/index.ts --no-comments --fold-imports --stats"
  )
  .version("1.0.0")
  .argument("[file]", "input file (omit to read from stdin)")
  // --no-comments は commander の否定フラグ構文
  // デフォルト: options.comments = true（コメントを保持）
  // --no-comments を渡すと: options.comments = false（除去）
  .option("--no-comments", "remove // and /* */ comments")
  .option("--fold-imports", "collapse multi-line import statements to one line")
  .option("--trim-trailing", "strip trailing whitespace from each line")
  .option("--stats", "print token stats (before/after) to stderr")
  .option(
    "--encoding <name>",
    "tiktoken encoding to use for counting (default: cl100k_base)",
    "cl100k_base"
  )
  .action(async (file: string | undefined, options: Options) => {
    // ── 入力を読み込む ──
    let input: string;
    if (file) {
      if (!fs.existsSync(file)) {
        process.stderr.write(`token-trim: file not found: ${file}\n`);
        process.exit(1);
      }
      input = fs.readFileSync(file, "utf-8");
    } else {
      // stdin が TTY（パイプなし）の場合は使い方を表示して終了
      if (process.stdin.isTTY) {
        program.help();
      }
      input = await readStdin();
    }

    // ── 変換を適用 ──
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

    // 空白行圧縮は常時適用（トークン削減の基本）
    result = compressBlankLines(result);

    // ── 統計表示（stderr に出力するので stdout へのパイプを汚染しない）──
    if (options.stats) {
      printStats(input, result);
    }

    // ── 結果を stdout に出力 ──
    process.stdout.write(result);
  });

program.parse(process.argv);
