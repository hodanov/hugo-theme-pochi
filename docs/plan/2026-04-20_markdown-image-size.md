# Plan: Markdown 画像のサイズ指定対応

ブログ記事内の Markdown 画像に幅・高さを指定できるようにする。
Goldmark の title 属性に `=300x` / `=300x200` / `=x200` 形式を埋め込み、
pochi テーマの render hook で解釈して `<img>` に反映する。生 HTML の `<img width="...">` も
既存の `unsafe: true` 設定でそのまま利用可能とする。

## Background

- 現在は元画像の実寸で `<img width/height>` が出力されるため、記事内で表示サイズを調整できない
- 幅固定・アスペクト比保持で任意のサイズに縮めたいケース（図版・スクリーンショットなど）がある
- ユーザー希望の記法は `![alt](path =300x)` 相当 と `<img width="..." src="...">` の 2 系統
- Goldmark は `=WIDTHxHEIGHT` のスペース区切り構文をそのままではパースしない前提がある

## Current structure

- `layouts/_default/_markup/render-image.html` — すべての Markdown 画像の入口。
  `partial "atoms/picture.html"` に `image` / `alt` / `page` を渡すだけのシン layer
- `layouts/partials/atoms/picture.html` — AVIF/WebP/fallback の `<picture>` 要素を組み立てる中心
  - `width` / `height` は画像リサイズ後の実寸を出力
  - `sizes` は既定で `(min-width: 1200px) 1200px, 100vw`
- `hugo/config/_default/config.yaml`
  - `markup.goldmark.renderer.unsafe: true` が設定済みなので生 HTML はすでに書ける

## Design policy

- ユーザー希望の `=300x` 記法を **title 属性ハック** で踏襲する
  - `![alt](path "=300x")` を Markdown 入力として受け付け、先頭が `=` のときだけサイズ指定と解釈する
  - 先頭が `=` でなければ title 文字列として未使用のまま保持（現行挙動を壊さない）
- 既存の画像（サイズ指定なし）は **完全に現行挙動維持**。`displayWidth` 未指定時は
  既存の `width` / `height` / `sizes` / `srcset` 生成フローに一切手を入れない
- 生 HTML `<img width="300" src="...">` は `unsafe: true` のまま素通りさせる
  - テーマの `<picture>` で包み直す対応は今回スコープ外
- アスペクト比保持は、width のみ指定時は `height` 属性を省略しつつ CSS で `height: auto` を担保する

## Implementation steps

1. **パース仕様の実装** `render-image.html`
   - `.Title` を読み、`=<W>x<H>` / `=<W>x` / `=x<H>` のいずれかに正規表現でマッチさせる
   - マッチしたら `displayWidth` / `displayHeight` を数値として抽出、`picture.html` 呼び出しの dict に追加
   - 先頭 `=` 以外はサイズ指定として扱わない（title として保持）
2. **picture.html のサイズ受け入れ**
   - `.displayWidth` / `.displayHeight` を受け取る
   - 受け取った値で最終 `<img>` の `width` / `height` 属性を上書き
   - `sizes` 属性は `displayWidth` があれば `sizes="<W>px"` を優先出力（srcset 選択の無駄排除）
   - いずれも未指定なら既存の実装パスを完全素通し
3. **CSS の整備**
   - `assets/` 配下の CSS を確認し、`<img>` に `height: auto` 相当の指定が無ければ追記
   - 生 HTML `<img width="300">` でもアスペクト比が崩れないことを担保
4. **example_site にサンプル追加**
   - 動作確認用 Markdown を追加（サイズなし / 幅のみ / 幅高さ / 生 HTML の 4 パターン）
5. **動作確認**
   - `make server` 相当で example_site をローカル起動し、DevTools で各パターンの属性値を検証
6. **ドキュメント更新**
   - `docs/` 配下 or `AGENTS.md` の近辺で、title 属性記法のルールを簡潔に記載

## File changes

| File                                          | Change                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| `layouts/_default/_markup/render-image.html`  | title 属性をパースし `displayWidth` / `displayHeight` を `picture.html` に渡す |
| `layouts/partials/atoms/picture.html`         | `displayWidth` / `displayHeight` を受け取り、`<img>` の属性と `sizes` に反映   |
| `assets/**/*.css` (要特定)                    | `<img>` の `height: auto` が無ければ追加                                       |
| `example_site/content/**/` (新規 or 既存記事) | 4 パターンの使用例を配置                                                       |
| `docs/` or `AGENTS.md` 付近                   | 記法ルールの追記                                                               |

## Risks and mitigations

| Risk                                                              | Mitigation                                                                        |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 既存記事で title が意味のある文字列に使われていた場合の互換性崩れ | 先頭 `=` 制約でのみサイズ解釈。`![...]("...")` を事前に grep し実利用がないか確認 |
| 表示幅が小さくても srcset は実寸ベースで生成され無駄が残る        | `sizes="<W>px"` を付けてブラウザに小さいバリアントを選ばせる                      |
| 生 HTML `<img>` は `<picture>` 最適化が効かない                   | 本プランではスコープ外。必要になった段階で shortcode 化を別途検討                 |
| `displayWidth` 未指定時の既存挙動が意図せず変わる                 | `picture.html` の既存経路に条件分岐以外の手を入れない。差分レビューで担保         |

## Validation

- [x] `![a](img.jpg)` がサイズ指定なし時、レンダリング結果が従来と完全一致（属性・srcset・sizes）
- [x] `![a](img.jpg "=300x")` で `<img width="300">` が出力され、`height` は省略 or auto 相当
- [x] `![a](img.jpg "=300x200")` で `<img width="300" height="200">` が出力される
- [x] `![a](img.jpg "=x200")` で `<img height="200">` が出力され、幅はアスペクト保持
- [x] `<img src="..." width="300">` を Markdown 内に直接書いた場合、そのまま出力される
- [x] `sizes` 属性が `displayWidth` 指定時に `<W>px` になっている
- [x] example_site のサンプル記事で上記をブラウザと DevTools 経由で目視確認
- [x] title に `=` 以外が先頭にくる文字列を渡したとき、現行挙動から変化しない

## Open questions

- (なし — 確認済み)
  - 生 HTML 版の `<picture>` 包み: 本プランではスコープ外
  - `displayWidth` 未指定時の既存挙動: 変更ゼロで確定
  - 動作確認場所: example_site で実施
