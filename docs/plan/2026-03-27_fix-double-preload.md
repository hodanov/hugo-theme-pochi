# Plan: Fix Double Preload on AVIF-Enabled Pages

`preload_lcp_image.html` で AVIF 有効時に WEBP と AVIF の `<link rel="preload">` が両方出力される問題を修正する。`if/else if` の排他分岐に変更し、常に1フォーマットのみ preload されるようにする。

## Background

- `preload_lcp_image.html` は AVIF 有効時に WEBP 用と AVIF 用の2つの `<link rel="preload">` を出力する
- WEBP 側には `type` 属性がないため、AVIF 対応ブラウザでも無条件に WEBP を preload する
- `type="image/webp"` を追加しても、AVIF 対応ブラウザは WEBP にも対応しているため両方 fetch される（W3C Preload 仕様: `type` は非対応フォーマットのスキップにしか使えない）
- `picture.html:93-106` で `<source type="image/avif">` が先に出力されるため、AVIF 対応ブラウザは実際には AVIF を使用する。WEBP の preload 分が完全に無駄になる
- LCP 改善のための preload が、逆に帯域浪費を引き起こしている

## Current structure

- `preload_lcp_image.html:24-31`: WEBP preload を出力（`type` 属性なし）
- `preload_lcp_image.html:33-42`: AVIF preload を出力（`type="image/avif"` あり）
- `picture.html:93-106`: `<source type="image/avif">` → `<source type="image/webp">` の順で出力。ブラウザは先に一致した source を採用
- 2つの `<link>` は独立した `if` で出力されており、排他制御がない

## Design policy

- AVIF 有効時は AVIF preload のみ出力する（`<picture>` の source 優先順と一致させる）
- AVIF 無効時は WEBP preload のみ出力する
- 両方に `type` 属性を付与し、非対応ブラウザが preload をスキップできるようにする
- `if/else if` パターンで常に1つの `<link rel="preload">` のみ出力されることを保証する

## Implementation steps

1. `preload_lcp_image.html` の行24-42を `if/else if` の排他分岐に書き換える
2. WEBP preload に `type="image/webp"` を追加する
3. `hugo server` でビルドし、AVIF 有効時に `<head>` 内の preload が1つだけであることを確認する

### 修正後のコード（行24-42 の置き換え）

```html
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
```

## File changes

| File                                           | Change                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `layouts/partials/head/preload_lcp_image.html` | 行24-42: 独立した2つの `if` を `if/else if` 排他分岐に変更。WEBP に `type` 属性を追加 |

## Risks and mitigations

| Risk                                                              | Mitigation                                                                                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| AVIF 非対応ブラウザで preload が効かなくなる                      | 2026年時点で AVIF 非対応の主要ブラウザはほぼ存在しない（Chrome 85+, Firefox 93+, Safari 16+, Edge 85+）。実害はほぼゼロ |
| `type="image/avif"` を理解しないブラウザが preload をスキップする | W3C 仕様で `type` 未サポートの場合はスキップすると定義。`<picture>` 内の fallback で画像自体は表示されるため壊れない    |

## Validation

- [x] `hugo server` でビルドし、AVIF 有効な記事の `<head>` に `<link rel="preload" type="image/avif">` が **1つだけ** 出力されること
- [x] AVIF 無効設定にした場合、`<link rel="preload" type="image/webp">` が **1つだけ** 出力されること
- [x] `featuredImage` 未設定のページでは preload が出力されないこと
- [x] Chrome DevTools Network タブで、preload リクエストが1つだけ発生すること（二重ダウンロードがないこと）
