# token-trim

AIのコンテキストウィンドウに渡すコード/テキストファイルのトークン数を削減するCLIツール。

コメント除去・空白圧縮・import折り畳みを行い、削減前後のトークン数をパーセント表示します。

---

## インストール

### 面倒な人向け（最短手順）

> dist/index.js はビルド済みで同梱されているので、**ビルド不要**です。

```bash
cd tools/token-trim
npm install                      # これだけで動く
node dist/index.js --help        # 動作確認
```

これだけで使えます。以降は `node dist/index.js` の部分を `token-trim` に置き換えたければ下の「グローバル設定」へ進んでください。

---

### グローバルコマンドとして使いたい場合（任意）

```bash
npm link          # グローバルで token-trim コマンドを使えるようにする
```

### Windows（Git Bash）で `token-trim` コマンドが見つからない場合

`npm link` だけでは Git Bash の PATH に反映されないことがあります。以下を実行してください。

**今のターミナルだけに反映（即時確認用）：**

```bash
export PATH="$PATH:/c/Users/<あなたのユーザー名>/AppData/Roaming/npm"
token-trim --version   # 1.0.0 と表示されれば成功
```

**毎回自動で反映（恒久設定）：**

```bash
echo 'export PATH="$PATH:/c/Users/<あなたのユーザー名>/AppData/Roaming/npm"' >> ~/.bashrc
```

設定後、ターミナルを再起動するか `source ~/.bashrc` を実行すれば完了です。

または `node` で直接実行することもできます（PATH設定不要）：

```bash
node dist/index.js --help
```

---

## 使い方

### stdin からパイプ（基本）

```bash
cat src/index.ts | token-trim --no-comments --stats
```

### ファイルを直接指定

```bash
token-trim src/index.ts --no-comments --fold-imports --stats
```

### 出力をファイルに保存

```bash
token-trim src/index.ts --no-comments > trimmed.ts
```

### Claude Code CLI に直接パイプする

token-trim の出力は stdout に出るので、そのまま Claude Code CLI に繋げられます。

```bash
# ファイルをトリムしてそのまま Claude Code に渡す
cat src/index.ts | token-trim --no-comments | claude "このコードのバグを見つけて"

# node で直接実行する場合（npm link なしでも動く）
cat src/index.ts | node dist/index.js --no-comments | claude "このコードのバグを見つけて"
```

`--stats` は stderr に出るので、パイプの途中に入れても stdout を汚染しません。

```bash
# stats を確認しながらパイプできる
cat src/index.ts | token-trim --no-comments --stats | claude "説明して"
# → 削減結果がターミナルに表示されつつ、トリム済みテキストが Claude Code へ流れる
```

クリップボード経由で貼り付けたい場合：

```bash
# Windows（Git Bash）
cat src/index.ts | token-trim --no-comments | clip

# Mac
cat src/index.ts | token-trim --no-comments | pbcopy
```

---

## オプション

| オプション | 説明 | デフォルト |
|---|---|---|
| `--no-comments` | `//` と `/* */` コメントを除去 | off（コメントを保持） |
| `--fold-imports` | 複数行の import 文を 1 行に折り畳む | off |
| `--trim-trailing` | 行末の余分な空白を除去 | off |
| `--stats` | 削減前後のトークン数を stderr に表示 | off |
| `--encoding <name>` | tiktoken エンコーディング名 | `cl100k_base` |
| `--version` | バージョンを表示 | - |
| `--help` | ヘルプを表示 | - |

> **注意**: 空白行圧縮（3行以上の連続空行を2行に）は常時適用されます。

> **`--no-comments` の既知の制限**:
> - 文字列リテラル内の `//`（例: URLの `https://`）も除去されます（ベストエフォート）
> - TypeScript のプライベートフィールド（例: `#count = 0`）が誤って削除されます
> - このツールは「AIに渡す参照用」の整形を目的としており、実行可能なコードの生成には使用しないでください

---

## 出力例（`--stats` 使用時）

```
── token-trim ─────────────────────────────
Before :    2,847 tokens  ██████████████████████████████
After  :    1,923 tokens  ████████████████████░░░░░░░░░░
────────────────────────────────────────────
Saved  :      924 tokens  (32.5% reduction)
────────────────────────────────────────────
```

統計は **stderr** に出力されるため、stdout のパイプを汚染しません。

---

## トークン数の計算について

`tiktoken` の `cl100k_base` エンコーディング（GPT-4と同じ）を使用しています。
Claudeの実際のトークナイザーとは若干異なりますが、**目安として±10%程度の誤差**で参照できます。

---

## 使用例：note記事生成プロジェクトでの活用

```bash
# 長い記事ファイルをClaudeに渡す前にトークンを削減
cat output/0031_fukugyou.md | node tools/token-trim/dist/index.js --stats

# スクリプトのコメントを除去してコンテキストを節約
cat scripts/fix-compliance-regex.mjs | node tools/token-trim/dist/index.js --no-comments --stats

# 複数の記事ファイルをまとめてトリム（一括確認）
cat output/*.md | node tools/token-trim/dist/index.js --stats

# npm link 済みの場合はコマンド名で呼べる
cat scripts/fix-titles-regex.mjs | token-trim --no-comments --stats
```

### このプロジェクト内で特に有効な場面

| 場面 | コマンド例 |
|------|-----------|
| 記事ファイルをClaudeに渡して添削・修正させる前 | `cat output/0033_fukugyou.md \| node tools/token-trim/dist/index.js --stats` |
| scripts/ 配下のMJSスクリプトをそのまま渡すとき | `cat scripts/*.mjs \| node tools/token-trim/dist/index.js --no-comments --stats` |
| CLAUDE.md + 複数ファイルを一度に渡すとき | 各ファイルにトリムしてから貼り付けるとコンテキスト節約になる |

---

## 配布・ZIP化について

### 配布物の作り方

```bash
cd tools/token-trim
npm install
npm run build
# → dist/index.js が生成される
```

**ZIPに含めるべきもの：**

```
token-trim/
├── dist/index.js        ← ビルド済みの実行ファイル（必須）
├── package.json         ← 必須
├── README.md            ← 必須
└── src/index.ts         ← ソースコード（任意・参照用）
```

`node_modules/` は **含めない**。受け取った側が `npm install` で再構築する。

### 受け取った側の手順

```bash
unzip token-trim.zip
cd token-trim
npm install            # node_modules を生成
node dist/index.js --help  # 動作確認

# グローバルコマンドとして使いたい場合
npm link               # → どこでも token-trim コマンドが使える
```

### 注意点

| 項目 | 内容 |
|------|------|
| **Node.js バージョン** | 18以上が必要。`node --version` で確認 |
| **tiktoken の WASM** | `npm install` 時に自動でダウンロードされる（初回インターネット接続必要） |
| **Windows での動作** | Git Bash または PowerShell で動作確認済み |
| **npm link の注意** | グローバルリンク後に `dist/index.js` を変更した場合は再リンク不要（パスが通っているため即反映） |
| **node_modules サイズ** | `tiktoken` の WASM バイナリを含むため約 30MB になる。ZIP配布時は除外推奨 |

### prompt-builder.html の配布

`tools/prompt-builder.html` は **ファイル1枚をそのまま ZIP に入れるだけ** で配布可能。

- インストール不要
- Node.js 不要
- インターネット接続不要（すべてインラインで完結）
- ブラウザで開くだけで動く

---

## 技術スタック

- **TypeScript** + **Node.js 18+**
- **commander.js** — CLIフレームワーク
- **tiktoken** — OpenAI製トークンカウントライブラリ
- **tsup** — TypeScriptバンドラー
