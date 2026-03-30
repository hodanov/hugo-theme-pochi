# Plan: Footnotes サポート（リンク修正 + デザイン整備）

Hugo の Markdown footnotes（`[^1]`構文）がレンダリングされるが、リンクが機能せずデザインも未整備。smooth scroll JS のバグを修正し、pochi テーマに合った footnotes スタイルを追加する。

## Background

- Hugo Goldmark は footnotes を標準でレンダリングする（設定不要）
- 現状、footnote テキストは表示されるがクリックしてもジャンプしない
- footnotes セクションにテーマ固有のスタイルが当たっておらず、素朴な見た目になっている
- 実際に footnotes を使っている投稿が存在する（`2026-03-22_like-button-cloudflare-workers-kv`）

## Current structure

Hugo が生成する footnote の HTML 構造:

```html
<!-- 本文中の参照リンク -->
<sup id="fnref:1">
  <a href="#fn:1" class="footnote-ref" role="doc-noteref">1</a>
</sup>

<!-- 記事末尾の注釈セクション -->
<div class="footnotes" role="doc-endnotes">
  <hr />
  <ol>
    <li id="fn:1">
      <p>
        注釈テキスト
        <a href="#fnref:1" class="footnote-backref" role="doc-backlink">↩︎</a>
      </p>
    </li>
  </ol>
</div>
```

関連ファイル:

- `assets/js/main.js` — smooth scroll ハンドラ（全 `a[href*="#"]` を横取り）
- `assets/css/tokens.css` — デザイントークン
- `assets/css/main.css` — CSS エントリポイント（`@import` で各コンポーネント読み込み）
- `assets/css/components/` — コンポーネント CSS の配置先

## Design policy

- **リンク修正は根本原因を直す**: `querySelector` のセレクタ解釈バグを修正。回避策（CSS.escape 等）ではなく `getElementById` に切り替える
- **CSS は既存のデザイントークンを活用**: `--pochi-accent`, `--pochi-link`, `--pochi-border`, `--pochi-text-muted` 等の変数を使い、テーマとの一貫性を保つ
- **ダークモード対応**: CSS 変数ベースなので自動的に対応するが、確認は必要
- **最小限の変更**: 新規ファイルは `footnotes.css` 1 つのみ。JS は既存ファイルの修正

## Implementation steps

1. **`main.js` の smooth scroll バグを修正**
   - `handleLinkClick` 内の `document.querySelector(href)` を `document.getElementById(href.slice(1))` に置き換え
   - **原因**: `href="#fn:1"` を `querySelector` に渡すと `:` が CSS 疑似クラスとして解釈され、要素が見つからない。`preventDefault()` は既に呼ばれているため、ブラウザのネイティブアンカーナビゲーションもブロックされ、結果として何も起きない
   - `getElementById` は ID 文字列をそのまま使うのでこの問題が起きない

2. **`assets/css/components/footnotes.css` を新規作成**
   - `.footnotes` セクション全体: 上部に区切り線、フォントサイズを小さめに
   - `.footnote-ref` (本文中の `[1]`): 上付き数字のスタイル
   - `.footnote-backref` (↩︎ リンク): 視認性の調整
   - `.footnotes ol` / `.footnotes li`: リスト間隔の調整
   - `.footnotes hr`: Hugo が挿入する `<hr>` のスタイル（アクセントカラーで統一 or 非表示化）

3. **`assets/css/main.css` に `@import` を追加**
   - `footnotes.css` のインポート行を追加

4. **動作確認**
   - footnotes を含む記事でリンクの往復ジャンプが機能することを確認
   - ライト / ダークモード両方でデザインを確認
   - モバイル表示の確認

## File changes

| File                                  | Change                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `assets/js/main.js`                   | `querySelector(href)` → `getElementById(href.slice(1))` に変更（1 箇所） |
| `assets/css/components/footnotes.css` | 新規作成。footnotes セクション・参照リンク・戻りリンクのスタイル定義     |
| `assets/css/main.css`                 | `footnotes.css` の `@import` 追加                                        |

## Risks and mitigations

| Risk                                                              | Mitigation                                                                                                                                                                               |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getElementById` への変更が他のアンカーリンク（TOC 等）に影響する | `getElementById` は `#` 付きハッシュ以外の全ての ID で正しく動作する。TOC の ID（例: `#背景`）も問題なし。既存の `href === "#"` / `href === "#top"` ガードは変更前と同じ位置で処理される |
| footnotes の HTML 構造が Hugo バージョンで変わる可能性            | 現行 Hugo v0.157.0 の出力を実測済み。クラス名 `.footnotes`, `.footnote-ref`, `.footnote-backref` は Goldmark の標準出力で安定している                                                    |
| smooth scroll のオフセット（-15px）で footnote が見切れる         | 必要なら footnote 要素に `scroll-margin-top` を追加して調整                                                                                                                              |

## Validation

- [x] footnote 参照リンク（本文中の `[1]`）をクリック → 記事末尾の注釈にスムーズスクロール
- [x] footnote 戻りリンク（↩︎）をクリック → 本文の参照位置に戻る
- [x] TOC のアンカーリンクが引き続き正常動作
- [x] ライトモード / ダークモードでデザインが適切
- [x] モバイル表示で崩れない
- [x] `#` / `#top` でページトップに戻る動作が維持されている

## Design decisions

- footnotes セクションの `<hr>` は残す。ただしデフォルトの見た目ではなく、アクセントカラー（`--pochi-accent`）の border スタイルに CSS で揃える
- 本文中の footnote 参照番号は `[1]` 形式で表示する。CSS `::before` / `::after` でブラケットを付与
