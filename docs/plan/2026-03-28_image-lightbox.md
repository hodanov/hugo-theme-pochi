# Plan: 記事内画像のライトボックス（拡大表示）

記事内の画像をクリックすると、オーバーレイで拡大表示できるようにする。外部ライブラリを使わず、テーマ内に軽量なライトボックスを自前実装する。PJAX ナビゲーションとの共存も考慮する。

## Background

- 現状、記事内の画像は `max-width: 100%` で表示されるが、クリックしても何も起きない
- スクリーンショットや図解など、拡大して見たい画像が記事に含まれることがある
- 外部ライブラリ（GLightbox, Fancybox 等）は依存を増やすため、テーマ内で完結する軽量実装が望ましい

## Current structure

- 画像レンダリング: `render-image.html` → `atoms/picture.html` で `<picture>` 要素を出力
- CSS バンドル: `resources_css.html` で全 CSS を結合・圧縮
- JS バンドル: `resources_js.html` で全 JS を結合・圧縮
- PJAX: `navigation.js` がコンテンツ差し替え後に `afterSwapInit()` を実行
- 記事コンテンツは `article` タグ内の `.main-content` に描画される

## Design policy

- **外部依存なし**: テーマ内の CSS + JS だけで完結する
- **最小変更**: 既存の `picture.html` は変更せず、`render-image.html` 側でラッパーを追加する方針を検討する
- **PJAX 対応**: `afterSwapInit()` から再初期化関数を呼び、PJAX 遷移後も動作させる
- **アクセシビリティ**: Escape キー・オーバーレイ外クリックで閉じる。`role="dialog"` と `aria-label` を付与する
- **パフォーマンス影響なし**: 画像の `loading="lazy"` や `srcset` はそのまま維持する
- **SVG は対象外**: ラスター画像（JPG, PNG, WebP, AVIF）のみライトボックス対象とする

## Implementation steps

1. `assets/css/components/lightbox.css` を新規作成
   - オーバーレイ（半透明背景）、拡大画像の中央配置、閉じるボタン、フェードアニメーションを定義
2. `assets/js/lightbox.js` を新規作成
   - 記事内の `<picture>` 要素にクリックイベントをデリゲーションで登録
   - クリック時にオーバーレイ DOM を生成し、元画像の最大解像度を `src` に設定
   - Escape キー・オーバーレイクリック・閉じるボタンで閉じる
   - `cursor: zoom-in` を画像に設定
3. `resources_css.html` に `lightbox.css` を追加
4. `resources_js.html` に `lightbox.js` を追加
5. `navigation.js` の `afterSwapInit()` からライトボックスの再初期化を呼ぶ
6. `render-image.html` を修正して、ライトボックス対象であることを示す属性またはラッパーを追加する（必要に応じて）

## File changes

| File                                         | Change                                                     |
| -------------------------------------------- | ---------------------------------------------------------- |
| `assets/css/components/lightbox.css`         | 新規作成: オーバーレイ・拡大画像・閉じるボタンのスタイル   |
| `assets/js/lightbox.js`                      | 新規作成: ライトボックスの表示・非表示ロジック             |
| `layouts/partials/core/resources_css.html`   | `lightbox.css` をバンドルに追加                            |
| `layouts/partials/core/resources_js.html`    | `lightbox.js` をバンドルに追加                             |
| `assets/js/navigation.js`                    | `afterSwapInit()` にライトボックス初期化呼び出しを追加     |
| `layouts/_default/_markup/render-image.html` | ライトボックス対象を示すマークアップを追加（必要に応じて） |

## Risks and mitigations

| Risk                                                   | Mitigation                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| PJAX 遷移後にイベントが効かなくなる                    | `afterSwapInit()` での再初期化 + イベントデリゲーション（`document` レベル）で対応  |
| `<picture>` の `srcset` から最大解像度を取得する複雑さ | `<img>` の `currentSrc` を利用し、ブラウザが選んだ最適画像をそのまま拡大表示する    |
| モバイルでのピンチズームとの干渉                       | ライトボックス内ではデフォルトのブラウザズームに任せ、独自ピンチ実装は行わない      |
| CLS（レイアウトシフト）                                | ライトボックスは `position: fixed` のオーバーレイなので、既存レイアウトに影響しない |
| カード画像やヒーロー画像への誤反応                     | イベント対象を `article picture img` に限定し、記事本文の画像のみ対象にする         |

## Validation

- [x] 記事ページで画像をクリックするとオーバーレイで拡大表示される
- [x] Escape キーで閉じる
- [x] オーバーレイの背景クリックで閉じる
- [x] 閉じるボタンで閉じる
- [x] PJAX 遷移後のページでもライトボックスが動作する
- [x] SVG 画像はライトボックス対象外になっている
- [x] モバイル表示で正常に動作する
- [x] `make build` でビルドエラーが出ない
- [x] Lighthouse パフォーマンススコアに顕著な悪化がない

## Decisions

- ライトボックス内に alt テキストをキャプションとして表示する
- 前後画像へのナビゲーション（矢印）は不要
- featuredImage（ヒーロー画像）はライトボックス対象外
