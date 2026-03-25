# Plan: 検索 XSS 修正と transition: all の最適化

検索結果の innerHTML 挿入による XSS リスクを解消し、`transition: all` の一律適用を実際にアニメーションするプロパティに限定する。

## Background

- フェーズ 1（WCAG/HTML 修正）に続くフェーズ 2 として、セキュリティとパフォーマンスの改善を行う
- 検索の `populateResults` 関数が `innerHTML +=` で未エスケープの文字列を DOM に挿入しており、`index.json` の `summary` フィールドに HTML が含まれる場合に XSS が成立する
- `transition: all` が `a` 要素を含む広範なセレクタに適用されており、全リンクに `overflow: hidden` と `backface-visibility: hidden` も一律付与されている

## Current structure

### 検索関連

- `assets/js/main.js:346-403` — `populateResults()` と `render()` 関数
- `layouts/_default/search.html:13-46` — `<script id="search-result-template">` テンプレート
- `layouts/_default/index.json` — 検索インデックス生成。`.Summary` を `plainify` せずそのまま使用

### transition 関連

- `assets/css/main.css:91-103` — `a` を含むセレクタに `transition: all 0.2s ease 0s; backface-visibility: hidden; overflow: hidden;`
- `assets/css/components/nav.css:144` — `nav.site-nav ul li a` に `transition: all`
- `assets/css/components/nav.css:197` — `.dropdown-list` に `transition: all`（opacity/visibility 制御用）
- `assets/css/components/nav.css:242` — `#side-nav` に `transition: all 0.3s`（translateX 制御用）
- `assets/css/components/nav.css:326` — overlay に `transition: all 0.3s`（opacity 制御用）
- `assets/css/components/media.css:32` — `.image-wrapper .div-content` に `transition: all`（bottom 制御用）

### 実際に使われている hover/focus 効果

| セレクタ                                 | 変化するプロパティ                        |
| ---------------------------------------- | ----------------------------------------- |
| `a:hover`                                | `text-decoration` (none に固定、変化なし) |
| `.article-list a:hover h2`               | `color`                                   |
| `.article-list .post-row:hover`          | `box-shadow`, `border-color` (dark)       |
| `.mymenu-related a:hover .text`          | `color`                                   |
| `.mymenu-related a:hover .div-cover`     | `transform: scale(1.1)`                   |
| `nav.site-nav .dropdown-list li a:hover` | `color`, `background-color`               |
| `.tagcloud a:hover`                      | `background-color`, `color`               |
| `.btn-primary:hover`                     | `opacity`                                 |
| `#scroll-to-top.fade-in:hover`           | `opacity`                                 |
| `.toc ol li a:hover:after`               | `width`                                   |

## Design policy

- XSS 修正は `index.json` 側で `plainify` を適用するアプローチを優先する。JS 側の DOM 構築変更は最小限にとどめる
- `transition: all` は各セレクタごとに実際にアニメーションするプロパティに限定する
- `a` をトランジション対象セレクタから除外し、`overflow: hidden` と `backface-visibility: hidden` の一律適用を解消する
- 個別コンポーネント（nav, article-list, related-posts 等）で必要なトランジションは、そのコンポーネントの CSS に記述する

## Implementation steps

1. **`index.json` で `summary` を `plainify` する** — `.Summary` を `.Summary | plainify` に変更し、HTML タグを除去した状態でインデックスに格納する。これにより `innerHTML` 経由の XSS を根本対策する
2. **`render()` に HTML エスケープ関数を追加** — 多層防御として全テンプレート変数を挿入前に統一的にエスケープする
3. **`main.css:91-103` のセレクタから `a` を除外** — `a` を削除し、残りのセレクタ（`.article-list h2`, `.post-row`, `.btn-primary` 等）はそのまま維持する
4. **`main.css:91-103` の `transition: all` を具体的プロパティに変更** — `transition: color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease, transform 0.2s ease` に変更する
5. **`main.css:91-103` から `overflow: hidden` と `backface-visibility: hidden` を除外** — 必要な要素（`#scroll-to-top` 等）には個別に適用する
6. **`nav.css` の `transition: all` を個別プロパティに変更** — 各セレクタごとに実際のアニメーション対象に限定する
   - `:144` `nav.site-nav ul li a` → `transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out`
   - `:197` `.dropdown-list` → `transition: opacity 0.2s ease-in-out, visibility 0.2s ease-in-out`
   - `:242` `#side-nav` → `transition: transform 0.3s`。同時に `overflow: hidden`（`:243`）を削除し `overflow-y: auto`（`:239`）のみ残す
   - `:326` overlay → `transition: opacity 0.3s`
7. **`media.css:32` の `transition: all` を変更** — `transition: bottom 0.2s ease-in-out` に変更する

## File changes

| File                                    | Change                                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `layouts/_default/index.json:3`         | `.Summary` → `.Summary \| plainify` に変更                                                                                      |
| `assets/js/main.js:378-403`             | `render()` にエスケープ関数を追加。全テンプレート変数を挿入前に統一的にエスケープする                                           |
| `assets/css/main.css:91-103`            | セレクタから `a` を除外。`transition: all` を具体的プロパティに変更。`overflow: hidden` と `backface-visibility: hidden` を除外 |
| `assets/css/components/nav.css:144`     | `transition: all` → `transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out`                                     |
| `assets/css/components/nav.css:197`     | `transition: all` → `transition: opacity 0.2s ease-in-out, visibility 0.2s ease-in-out`                                         |
| `assets/css/components/nav.css:242-243` | `transition: all 0.3s` → `transition: transform 0.3s`。`overflow: hidden` を削除し `overflow-y: auto` のみ残す                  |
| `assets/css/components/nav.css:326`     | `transition: all 0.3s` → `transition: opacity 0.3s`                                                                             |
| `assets/css/components/media.css:32`    | `transition: all` → `transition: bottom 0.2s ease-in-out`                                                                       |

## Risks and mitigations

| Risk                                                                | Mitigation                                                                                               |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `plainify` で summary から意図的な装飾（太字、リンク等）が消える    | 検索結果の snippet は元々プレーンテキスト表示なので視覚的影響なし                                        |
| エスケープ関数が `link`（URL）にも適用されると `href` が壊れる      | Hugo 生成の permalink は `&` 等を含まないため実害なし。統一エスケープの方がシンプルで安全                |
| transition プロパティの限定で見落としたアニメーションが効かなくなる | 上記の hover/focus 効果一覧を網羅的に確認済み。実装後にホバー状態を目視確認する                          |
| `overflow: hidden` 除去で特定コンポーネントのレイアウトが崩れる     | `#scroll-to-top` は独自の `border-radius` で丸く切り抜いており `overflow: hidden` が必要。個別に付与する |
| `backface-visibility: hidden` 除去でアニメーションのちらつきが発生  | 3D transform を使用する要素（`#side-nav`）には個別に残す。2D の color/opacity 変更には不要               |

## Validation

- [x] `hugo server` でビルドエラーがないことを確認
- [x] 検索ページで検索を実行し、結果が正しく表示されることを確認
- [x] `index.json` の出力に HTML タグが含まれていないことを確認（`curl localhost:1313/index.json | python3 -m json.tool | grep '<'`）
- [x] 記事一覧のカードをホバーしたとき `box-shadow` アニメーションが動作することを確認
- [x] ナビゲーションのリンクをホバーしたとき `color` アニメーションが動作することを確認
- [x] ドロップダウンメニューの表示/非表示アニメーションが動作することを確認
- [x] モバイルのサイドナビのスライドインアニメーションが動作することを確認
- [x] 関連記事のカバー画像ホバーで `scale` アニメーションが動作することを確認
- [x] スクロールトップボタンの表示と `border-radius` が正常であることを確認
- [x] 長いテキストを含むリンク（インラインコード等）が切り詰められずに表示されることを確認
- [x] `npm run lint` が通ることを確認

## Open questions

なし（全て解決済み）
