# Plan: Add Sidecar Preload Path for AVIF/WEBP featuredImage

`preload_lcp_image.html` が `.avif`/`.webp` の `featuredImage` を一律スキップしている問題を修正する。`picture.html` のサイドカー処理パス（行123-179）をミラーし、サイドカー JPG/PNG を探して preload ヒントを出力する。

## Background

- `preload_lcp_image.html:4` の `$skip` 条件が `.avif`/`.webp` を無条件に除外している
- しかし `picture.html:123-179` には AVIF/WEBP ファイルに対するサイドカー処理パスが存在する
  - `featuredImage` が `hero.avif` の場合、`hero.jpg` → `hero.png` の順でサイドカーを探索
  - 見つかればサイドカーを `$base` としてレスポンシブ `<picture>` を生成・描画する
- 結果として LCP 画像は表示されるが、preload ヒントが欠落したままになる
- これは LCP 改善という機能の目的を損なうバグ

## Current structure

- `preload_lcp_image.html:4`: `$skip := or (eq $ext ".svg") (eq $ext ".svgz") (eq $ext ".avif") (eq $ext ".webp")` で AVIF/WEBP を全スキップ
- `picture.html` の3つの処理パス:
  - **パス1** (行46-122): JPG/PNG ソース → AVIF/WEBP/fallback の `<picture>` 生成。品質値: `webp q75`, `avif q60`
  - **パス2** (行123-179): AVIF/WEBP ソース → サイドカー JPG/PNG を探し、`$base` として処理。品質値: primary `q65`, fallback `jpg q80`
  - **パス3** (行180-201): サイドカーが見つからない場合のフォールバック（単一 `<source>` のみ、レスポンシブ srcset なし）
- 設計ドキュメント（行25）の「`picture.html` と同方針」は不正確。`picture.html` は AVIF/WEBP を「スキップ」するのではなく「サイドカー経由で処理」する

## Design policy

- `$skip` から `.avif`/`.webp` を除去し、SVG のみスキップに変更する
- AVIF/WEBP の場合は `picture.html` パス2と同じロジックでサイドカー JPG/PNG を探索する
- サイドカーが見つかった場合: `$base` を使い、`q65` でプライマリ srcset を生成して preload 出力する
- サイドカーが見つからない場合: レスポンシブ srcset がないため preload をスキップする（`picture.html` パス3 と同様、単一ソースのため preload の恩恵が小さい）
- **品質値 `q65` は `picture.html:146` と完全に一致させること**。`q75`/`q60`（パス1の値）を使うと URL が不一致になり、preload が無駄になる
- 品質値の共有方法: `site.Params.images.sidecarQuality`（デフォルト `65`）を追加し、`picture.html` と `preload_lcp_image.html` の両方から参照する。これにより片方だけ変更されて URL が食い違うリスクを排除する
- `picture.html` の変更は最小限（行146の `q65` リテラルを変数参照に置き換えるのみ）

## Implementation steps

1. `hugo/config/_default/params.yaml`（またはテーマ設定）に `images.sidecarQuality: 65` を追加する
2. `picture.html:146` の `q65` リテラルを `site.Params.images.sidecarQuality`（デフォルト `65`）を読む変数に置き換える
3. `preload_lcp_image.html` の `$skip` 条件を変更し、`.avif`/`.webp` を除去する
4. `$isAVIF`/`$isWebP` フラグを追加する
5. サイドカー品質値 `$sidecarQ` を `site.Params.images.sidecarQuality`（デフォルト `65`）から読む
6. 既存の JPG/PNG 処理を `else` ブランチに移動し、AVIF/WEBP 用のサイドカー処理パスを `if or $isAVIF $isWebP` ブランチとして追加する
7. サイドカー探索ロジックを `picture.html:126-129` からミラーする（`.jpg` → `.png` の順で `replace` + `GetMatch`）
8. サイドカーが見つかった場合、`$base` と `$sidecarQ` を使って srcset を生成し、`<link rel="preload" type="image/{{ $type }}">` を出力する
9. `hugo server` でビルドし、AVIF/WEBP の `featuredImage` を持つ記事で preload が出力されることを確認する

### 修正後のコード（preload_lcp_image.html 全体の構造）

```html
{{- if and .IsPage .Params.featuredImage -}}
  {{- $res := .Resources.GetMatch .Params.featuredImage -}}
  {{- $ext := lower (path.Ext .Params.featuredImage) -}}
  {{- $isAVIF := eq $ext ".avif" -}}
  {{- $isWebP := eq $ext ".webp" -}}
  {{- $skip := or (eq $ext ".svg") (eq $ext ".svgz") -}}
  {{- if and $res (eq $res.MediaType.MainType "image") (not $skip) -}}
    {{- $widths := slice 480 800 1200 1600 2000 2400 -}}
    {{- $enableAvif := false -}}
    {{- with site.Params.images -}}
      {{- if .enableAvif }}{{ $enableAvif = true }}{{ end -}}
    {{- end -}}

    {{- if or $isAVIF $isWebP -}}
      {{/* Sidecar path: mirror picture.html lines 123-179 */}}
      {{- $type := cond $isAVIF "avif" "webp" -}}
      {{- $base := .Resources.GetMatch (replace .Params.featuredImage (printf ".%s" $type) ".jpg") -}}
      {{- if not $base -}}
        {{- $base = .Resources.GetMatch (replace .Params.featuredImage (printf ".%s" $type) ".png") -}}
      {{- end -}}
      {{- $sidecarQ := 65 -}}
      {{- with site.Params.images.sidecarQuality }}{{ $sidecarQ = . }}{{ end -}}
      {{- if $base -}}
        {{- $origW := $base.Width -}}
        {{- $srcsetPrimary := slice -}}
        {{- range $w := $widths -}}
          {{- if le $w $origW -}}
            {{/* sidecarQ — must match picture.html sidecarQuality */}}
            {{- $p := $base.Resize (printf "%dx %s q%d" $w $type $sidecarQ) -}}
            {{- $srcsetPrimary = $srcsetPrimary | append (printf "%s %dw" $p.RelPermalink $w) -}}
          {{- end -}}
        {{- end -}}
        {{- if gt (len $srcsetPrimary) 0 -}}
          <link
            rel="preload"
            as="image"
            type="image/{{ $type }}"
            imagesrcset="{{ delimit $srcsetPrimary ", " }}"
            imagesizes="(min-width: 1200px) 1200px, 100vw"
            fetchpriority="high"
          />
        {{- end -}}
      {{- end -}}

    {{- else -}}
      {{/* Existing JPG/PNG path (current code, lines 12-42) */}}
      {{- $origW := $res.Width -}}
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
      {{/* NOTE: if/else if pattern from fix-double-preload plan */}}
      {{- if and $enableAvif (gt (len $srcsetAVIF) 0) -}}
        <link
          rel="preload"
          as="image"
          type="image/avif"
          imagesrcset="{{ delimit $srcsetAVIF ", " }}"
          imagesizes="(min-width: 1200px) 1200px, 100vw"
          fetchpriority="high"
        />
      {{- else if gt (len $srcsetWEBP) 0 -}}
        <link
          rel="preload"
          as="image"
          type="image/webp"
          imagesrcset="{{ delimit $srcsetWEBP ", " }}"
          imagesizes="(min-width: 1200px) 1200px, 100vw"
          fetchpriority="high"
        />
      {{- end -}}
    {{- end -}}

  {{- end -}}
{{- end -}}
```

## File changes

| File                                               | Change                                                                                                                              |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `layouts/partials/head/preload_lcp_image.html`     | `$skip` から `.avif`/`.webp` を除去。AVIF/WEBP 用サイドカー処理パスを追加（`picture.html` パス2ミラー）。`$sidecarQ` で品質値を参照 |
| `layouts/partials/atoms/picture.html`              | 行146の `q65` リテラルを `$sidecarQ` 変数（`site.Params.images.sidecarQuality` デフォルト 65）に置き換え                            |
| `hugo/config/_default/params.yaml`（親リポジトリ） | `images.sidecarQuality: 65` を追加（テーマのデフォルト値と一致させる）                                                              |

## Risks and mitigations

| Risk                                                                        | Mitigation                                                                                                               |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| サイドカー JPG/PNG が存在しない場合に preload が出ない                      | `picture.html` パス3 と同様、単一ソースのみでレスポンシブ srcset がないため preload の恩恵が小さい。スキップで正しい挙動 |
| 品質値が `picture.html` と乖離する可能性                                    | `site.Params.images.sidecarQuality` で両ファイルから同一値を参照。リテラルの重複を排除                                   |
| コード複雑性の増加（サイドカー探索ロジックの重複）                          | `picture.html` のパス2を忠実にミラーする最小実装とし、将来的な共通化は別プランに委ねる                                   |
| サイドカーのファイル名パターンが `replace` 依存（`hero.avif` → `hero.jpg`） | `picture.html:126-129` と同一ロジック。Hugo の `Resources.GetMatch` はページバンドルスコープに限定されるため安全         |

## Validation

- [x] AVIF の `featuredImage`（例: `hero.avif`）を持つ記事で、`<head>` に `<link rel="preload" type="image/avif">` が出力されること
- [x] WEBP の `featuredImage`（例: `hero.webp`）を持つ記事で、`<link rel="preload" type="image/webp">` が出力されること
- [x] サイドカー JPG/PNG が存在しない場合、preload が出力されないこと（エラーにならないこと）
- [x] JPG/PNG の `featuredImage` では従来通りの preload が出力されること（リグレッションなし）
- [x] preload の URL が `<picture>` 内の `<source>` の srcset URL と完全に一致すること（品質値 `q65` の一致確認）
- [x] `featuredImage` 未設定・SVG の場合は preload が出力されないこと
