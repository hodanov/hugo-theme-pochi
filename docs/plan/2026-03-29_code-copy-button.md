# Plan: コードブロックのコピーボタン

`<pre><code>` ブロックの右上にコピーボタンを配置し、ワンクリックでコードをクリップボードにコピーできるようにする。技術ブログでは事実上の標準機能（Zenn, Qiita, dev.to 等）であり、読者体験の向上に直結する。

## Background

- 技術ブログではコードブロックのコピーボタンが標準機能として期待されている
- pochi テーマには既に `share-button.js` で Clipboard API + fallback の実装パターンがある
- Hugo Pipes による JS/CSS バンドルの仕組みが確立されている
- PJAX ナビゲーション対応のためイベント委譲パターンが必要

## Current structure

- JS: `assets/js/` 配下に IIFE パターンのモジュール群、`resources_js.html` で結合・minify
- CSS: `assets/css/components/code.css` にコードブロックのスタイル定義済み
- クリップボード: `share-button.js` に `copyToClipboard()` + `fallbackCopyTextToClipboard()` の実装あり
- i18n: `i18n/ja.toml`, `i18n/en.toml` でラベル管理
- `<pre>` ブロック: Hugo の goldmark + Chroma がレンダリング。カスタム render hook は未使用
- PJAX: `navigation.js` がページ遷移時に `pochi:afterSwap` イベントを発行

## Design policy

- **JS のみで動的にボタンを挿入する** — Hugo の render-codeblock hook は使わない。Hugo バージョン制約を避け、既存のマークダウンレンダリングに手を加えない
- **イベント委譲で PJAX 対応** — `document` にリスナーを 1 つ登録し、PJAX によるコンテンツ差し替え後も動作を保証する
- **既存の Clipboard API パターンを踏襲** — `share-button.js` と同じ `navigator.clipboard.writeText` + textarea fallback
- **i18n 対応** — `<body>` の data 属性経由で Hugo の i18n 文字列を JS に渡す
- **`prefers-reduced-motion` 対応** — フィードバックアニメーションは CSS transition で実装し、`reduced-motion` 時はアニメーションをスキップ
- **アクセシビリティ** — `aria-label` でボタンの目的を明示、コピー成功時は `aria-live` 相当のフィードバック
- **SVG アイコン + 常時表示** — ボタンはクリップボード SVG アイコンで表示し、コピー成功時にチェックマーク SVG に切り替える。モバイルでのタップ操作を考慮して常時表示とする

## Implementation steps

1. **i18n キーを追加** — `ja.toml` / `en.toml` に `copy_code`（コピー）、`code_copied`（コピーしました）、`copy_code_failed`（コピーに失敗しました）を追加
2. **`baseof.html` に data 属性を追加** — `<body>` タグに `data-code-copy-label`、`data-code-copied-label`、`data-code-copy-failed-label` を追加し、i18n 文字列を JS に渡す
3. **`code-copy.js` を作成** — IIFE パターンで以下を実装:
   - ページ読み込み時に全 `<pre>` ブロックを走査し、`position: relative` を付与してコピーボタンを挿入
   - `pochi:afterSwap` イベントでも再走査（PJAX 対応）
   - ボタンにはクリップボード SVG アイコンを表示（常時表示）
   - イベント委譲で `[data-code-copy-button]` のクリックを捕捉
   - `navigator.clipboard.writeText` でコピー（fallback 付き）
   - コピー成功時に SVG をチェックマークに切り替え（2 秒後に戻す）
4. **`code.css` にスタイルを追加** — `<pre>` に `position: relative`、コピーボタンを右上に `position: absolute` で配置、ホバー時の opacity 変化
5. **`resources_js.html` にバンドル追加** — `code-copy.js` を既存の JS バンドルに追加
6. **動作確認** — ローカルサーバーで複数のコードブロック（言語指定あり/なし、長いコード、空コード）を確認

## File changes

| File                                      | Change                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `i18n/ja.toml`                            | `copy_code`, `code_copied`, `copy_code_failed` キーを追加                                              |
| `i18n/en.toml`                            | 同上（英語訳）                                                                                         |
| `layouts/_default/baseof.html`            | `<body>` に `data-code-copy-label`, `data-code-copied-label`, `data-code-copy-failed-label` 属性を追加 |
| `assets/js/code-copy.js`                  | 新規作成。コピーボタンの挿入・クリップボードコピー・フィードバック表示                                 |
| `assets/css/components/code.css`          | コピーボタンのスタイル（配置、ホバー、フィードバック）を追加                                           |
| `layouts/partials/core/resources_js.html` | `code-copy.js` をバンドルに追加                                                                        |

## Risks and mitigations

| Risk                                       | Mitigation                                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| PJAX 後にボタンが重複挿入される            | 挿入済みマーカー（`data-code-copy-injected`）で二重挿入を防止                           |
| Hugo が生成する `<pre>` の構造が将来変わる | `<pre>` 直下の `<code>` の `textContent` を取得するシンプルな実装にし、構造依存を最小化 |
| Clipboard API が使えないブラウザ           | textarea fallback（`share-button.js` と同じパターン）で対応                             |
| コードブロック内に不可視文字が含まれる場合 | `textContent` で取得するため、HTML タグは含まれない。末尾の改行は `trim()` で除去       |

## Validation

- [ ] 言語指定ありのコードブロック（`js,`python 等）でコピーボタンが表示される
- [ ] 言語指定なしのコードブロックでもコピーボタンが表示される
- [ ] コピーボタンクリックでクリップボードにコードがコピーされる
- [ ] コピー成功時にフィードバック（テキスト変化）が 2 秒間表示される
- [ ] PJAX ナビゲーション後もコピーボタンが正常に動作する
- [ ] ダークモード・ライトモード両方でボタンが視認できる
- [ ] モバイル（タッチデバイス）でボタンが操作可能
- [ ] `prefers-reduced-motion` 設定時にアニメーションがスキップされる
- [ ] 日本語・英語の両方でフィードバックテキストが正しく表示される
- [ ] markdownlint / ESLint でエラーが出ない

## Open questions

なし（すべて決定済み）
