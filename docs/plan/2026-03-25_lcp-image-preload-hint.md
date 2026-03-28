# Plan: LCP Image Preload Hint for Single Pages

`head.html` に `<link rel="preload" as="image">` を追加し、featured image を持つ single ページの LCP を改善する。初回 SSR でブラウザが画像を早期に fetch キューへ入れられるようにする。

## Background

- `head.html` には `<link rel="preload" as="image">` の出力がゼロ
- `picture.html` で `fetchpriority="high"` を設定しても、ブラウザが `<body>` 内の当該 `<picture>` タグに到達してから初めて fetch を開始するため、LCP が遅れる
- PJAX 遷移時は `navigation.js:182-239` の `adoptImagePreloads()` で動的 preload 差し替えを行っているが、初回 SSR には効かない
- プリロードヒントがあれば、CSS がブロックしている間も並列で画像の取得が始まる

## Current Structure

- `baseof.html` → `partial "head/head.html" .` → CSS / JS / meta のみ出力。preload ヒントなし
- `posts/single.html` → `content.html` → `post_meta_featured_image.html` → `picture.html`
  - `priority="high"`, `widths: [480, 800, 1200, 1600]`, `sizes: "(min-width: 800px) 800px, 100vw"`
- `_default/single.html` → `hero.html` → `picture.html`
  - `priority="high"`, `widths: [480, 800, 1200, 1600, 2000, 2400]`, `sizes: "(min-width: 1200px) 1200px, 100vw"`
- `picture.html` は raster リソースを Hugo Image Processing で WebP / AVIF に変換し `<source>` を出力する

## Design Policy

- `head/head.html` から呼ばれる新 partial `head/preload_lcp_image.html` を作成する
- 出力条件: `.IsPage` かつ `.Params.featuredImage` が非空のページのみ
- Page Resource として取得できるラスター画像（JPG/PNG）のみ処理対象。SVG・AVIF・WebP 元ファイルはスキップ（`picture.html` と同方針）
- `imagesrcset` は WebP srcset を出力する。`site.Params.images.enableAvif` が true の場合は AVIF の `<link rel="preload">` も追加出力する
- Hugo の image processing（`$res.Resize`）はビルドキャッシュで共有されるため、head 側での呼び出しによって二重処理コストは発生しない
- `imagesrcset` / `imagesizes` 属性は `<link rel="preload" as="image">` の標準的な書き方（Safari 16.4+ 対応。未対応ブラウザは無視するだけで壊れない）
- **widths**: `[480, 800, 1200, 1600, 2000, 2400]`（hero.html の全サイズ）を使用する
- **imagesizes**: 型分岐なし。`(min-width: 1200px) 1200px, 100vw` を共通値として使用する

## Implementation Steps

1. `layouts/partials/head/preload_lcp_image.html` を新規作成する
   - `.IsPage` と `.Params.featuredImage` の有無をチェック
   - Page Resource を取得し、ラスター画像であることを確認
   - widths `[480, 800, 1200, 1600, 2000, 2400]` で WebP srcset を生成
   - `<link rel="preload" as="image" imagesrcset="..." imagesizes="(min-width: 1200px) 1200px, 100vw" fetchpriority="high" />` を出力
   - `enableAvif` が true の場合は AVIF 用の `<link rel="preload">` も出力
2. `head.html` の `resources_css.html` 呼び出しの前に `preload_lcp_image.html` を追加する
3. ビルドして出力 HTML を目視確認する
4. Lighthouse / PageSpeed Insights で LCP スコアを計測する

### 実装例（preload_lcp_image.html コア部分）

```html
{{- if and .IsPage .Params.featuredImage -}}
  {{- $res := .Resources.GetMatch .Params.featuredImage -}}
  {{- $ext := lower (path.Ext .Params.featuredImage) -}}
  {{- $skip := or (eq $ext ".svg") (eq $ext ".svgz") (eq $ext ".avif") (eq $ext ".webp") -}}
  {{- if and $res (eq $res.MediaType.MainType "image") (not $skip) -}}
    {{- $widths := slice 480 800 1200 1600 2000 2400 -}}
    {{- $origW := $res.Width -}}
    {{- $enableAvif := false -}}
    {{- with site.Params.images }}{{ if .enableAvif }}{{ $enableAvif = true }}{{ end }}{{ end -}}
    {{- $srcsetWEBP := slice -}}
    {{- $srcsetAVIF := slice -}}
    {{- range $w := $widths -}}
      {{- if le $w $origW -}}
        {{- $webp := $res.Resize (printf "%dx webp q75" $w) -}}
        {{- $srcsetWEBP = $srcsetWEBP | append (printf "%s %dw" $webp.RelPermalink $w) -}}
        {{- if $enableAvif -}}
          {{- $avif := $res.Resize (printf "%dx avif q60" $w) -}}
          {{- $srcsetAVIF = $srcsetAVIF | append (printf "%s %dw" $avif.RelPermalink $w) -}}
        {{- end -}}
      {{- end -}}
    {{- end -}}
    {{- if gt (len $srcsetWEBP) 0 -}}
      <link
        rel="preload"
        as="image"
        imagesrcset="{{ delimit $srcsetWEBP ", " }}"
        imagesizes="(min-width: 1200px) 1200px, 100vw"
        fetchpriority="high"
      />
    {{- end -}}
    {{- if and $enableAvif (gt (len $srcsetAVIF) 0) -}}
      <link
        rel="preload"
        as="image"
        type="image/avif"
        imagesrcset="{{ delimit $srcsetAVIF ", " }}"
        imagesizes="(min-width: 1200px) 1200px, 100vw"
        fetchpriority="high"
      />
    {{- end -}}
  {{- end -}}
{{- end -}}
```

### head.html 変更箇所

```diff
- {{ partial "core/resources_css.html" . }}
+ {{ partial "head/preload_lcp_image.html" . }}
+ {{ partial "core/resources_css.html" . }}
```

## File Changes

| File                                           | Change                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| `layouts/partials/head/preload_lcp_image.html` | 新規作成。LCP 画像の preload ヒントを出力                             |
| `layouts/partials/head/head.html`              | `resources_css.html` の前に `preload_lcp_image.html` の呼び出しを追加 |

## Risks and Mitigations

| Risk                                                                                                       | Mitigation                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `imagesrcset` を未サポートのブラウザ（Safari < 16.4, IE）でヒントが無視される                              | Progressive enhancement。壊れず、未対応ブラウザは従来と同じ挙動                                                                                                 |
| `hero.html` と `post_meta_featured_image.html` の `sizes` が異なり、preload ヒントの `imagesizes` がずれる | 型分岐なし。`(min-width: 1200px) 1200px, 100vw` を共通値として使用（hero 優先）。post_meta_featured_image 側では多少大きめのサイズを preload するが実害は小さい |
| Hugo ビルド時間が増加する                                                                                  | `picture.html` での resize 呼び出しと同一パラメータのため、ビルドキャッシュで共有され追加コストは最小                                                           |
| Page Resource として取得できない画像（static 以下のパス指定等）でヒントが出ない                            | Resource 取得失敗時は何も出力しないフォールバックで対応済み                                                                                                     |

## Validation

- [x] `hugo server` でビルドし、featured image を持つ記事の `<head>` に `<link rel="preload" as="image">` が出力されること
- [x] `featuredImage` が未設定のページでは出力されないこと
- [x] list ページ・404 ページでは出力されないこと
- [x] Chrome DevTools の Network タブ → Priority が「High」の preload リクエストが発生すること（画像リソースの最高優先度は High。Highest はメイン HTML・ブロッキング CSS 専用で画像では到達不可）
- [x] Lighthouse で LCP スコアが改善すること（または「preload LCP image」の提案が消えること）
- [x] Safari で表示崩れ・エラーがないこと
