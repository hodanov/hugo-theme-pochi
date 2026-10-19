---
title: "スタイルガイド"
slug: "styleguide"
date: "2024-07-01T12:00:00+09:00"
publishDate: "2024-07-01T12:00:00+09:00"
lastmod: "2024-07-01T12:00:00+09:00"
draft: false
type: "posts"
comments: false
summary: "テーマが描画する本文要素を一覧するページ。VRT と a11y 検査の対象。"
build:
  list: "never"
sitemap:
  disable: true
---

このページは pochi テーマの本文要素をまとめて確認するためのスタイルガイドです。一覧・検索・関連記事には表示されません。

## 本文と見出し {#sg-text}

pochi は Hugo 向けのブログテーマです。本文の読みやすさを最優先に、見出し・リスト・コード・表といった技術記事でよく使う要素を、和文と欧文が混ざった状態でも崩れないように組むことを目指しています。たとえば Core Web Vitals の LCP（Largest Contentful Paint）は 2.5 秒以内、CLS（Cumulative Layout Shift）は 0.1 以下が「良好」の目安とされています。

**太字の強調**や*斜体の強調*、`hugo server --buildDrafts` のようなインラインコード、[Hugo の公式ドキュメント](https://gohugo.io/documentation/)へのリンクが同じ段落に並んだときの見え方を確認します。約物が連続する箇所――たとえば「『禁則処理』（kinsoku shori）とは何か？」――や、行頭・行末に来やすい記号（、。）」』！？）の扱いもここで見ます。

Pochi aims to keep long-form technical writing comfortable to read. This English paragraph checks how Latin text wraps next to Japanese, how word spacing behaves, and whether a long identifier such as `ThisIsAnExtremelyLongIdentifierNameThatShouldWrapInsideTheContainer` breaks the layout.

長い URL の折り返し：<https://example.com/a/very/long/path/that/keeps/going/to/check/how/the/theme/handles/overflow-wrap/in/narrow/viewports?query=parameter&another=value>

### 見出しレベル 3

見出しの直後に続く段落です。見出しと本文の距離が、前の段落との距離より近く見えるかを確認します。

#### 見出しレベル 4

レベル 4 の見出しに続く段落です。

##### 見出しレベル 5

レベル 5 の見出しに続く段落です。

###### 見出しレベル 6

レベル 6 の見出しに続く段落です。

### リスト

- 箇条書きの 1 項目め。項目の文章が長くなって折り返したときに、2 行目の開始位置が 1 行目の文字に揃うかを確認します。
- 2 項目め
  - 入れ子の 2 階層め
    - 入れ子の 3 階層め
- 3 項目め

1. 番号付きリストの 1 項目め
2. 2 項目め
   1. 入れ子の番号付きリスト
      1. 3 階層め
3. 3 項目め

- [x] 完了したタスク
- [ ] 未完了のタスク

## 表 {#sg-table}

| 項目             | 種別       | 既定値 | 最小 | 最大 | 単位 | 指定方法          | 対応       | 備考                     | 状態     |
| ---------------- | ---------- | -----: | ---: | ---: | ---- | ----------------- | ---------- | ------------------------ | -------- |
| 本文の文字サイズ | タイポ     |     16 |   14 |   18 | px   | `font-size`       | 全ブラウザ | ルートは 100% を推奨     | 検討中   |
| 行送り           | タイポ     |    1.8 |  1.6 |  2.0 | 倍   | `line-height`     | 全ブラウザ | 単位なしで指定する       | 検討中   |
| 行長             | レイアウト |     40 |   35 |   45 | em   | `max-inline-size` | 全ブラウザ | 和文は 35〜40 字が目安   | 未着手   |
| 操作対象の大きさ | a11y       |     44 |   24 |    — | px   | `min-block-size`  | 全ブラウザ | WCAG 2.5.8 の最低は 24px | 未着手   |
| コントラスト比   | a11y       |    4.5 |  4.5 |    — | :1   | トークン          | —          | 大きい文字は 3:1         | 一部未達 |

## コード {#sg-code}

```go
// latestPosts は記事を公開日の新しい順に並べ、下書きと未来日付の記事を除外したうえで、先頭から limit 件だけを返す関数です。
func latestPosts(pages []Page, now time.Time, limit int) []Page {
 published := make([]Page, 0, len(pages))
 for _, p := range pages {
  if p.Draft || p.PublishDate.After(now) { // 下書きと予約投稿は除外する
   continue
  }
  published = append(published, p)
 }
 sort.Slice(published, func(i, j int) bool { return published[i].PublishDate.After(published[j].PublishDate) })
 if len(published) > limit {
  return published[:limit]
 }
 return published
}
```

```
$ hugo --gc --minify
Total in 312 ms
```

```sh
npm run vrt:update   # ベースラインを更新する
```

インラインコードが長い場合：`HUGO_PARAMS_LIKEAPI_BASEURL= hugo --gc -s example_site --themesDir /absolute/path/to/themes -t pochi`

## 引用と補足情報 {#sg-blocks}

> 引用ブロックの本文です。複数の文が続いたときの行間と、左の罫線との距離を確認します。
>
> > 入れ子になった引用です。

<blockquote cite="https://www.w3.org/TR/jlreq/">
<p>cite 属性を持つ blockquote です。引用元の URL を属性で示すときの見え方を確認します。</p>
</blockquote>

キーボード操作の表記：<kbd>Ctrl</kbd> + <kbd>K</kbd> で検索を開き、<kbd>Esc</kbd> で閉じます。

<details>
<summary>折りたたみ（details と summary）</summary>

折りたたまれた中身の段落です。`code` やリンク（[example.com](https://example.com/)）も含みます。

</details>

---

水平線（hr）の前後の余白も確認します。

## デザイントークン {#sg-tokens}

{{< tokens >}}

## 画像と脚注 {#sg-media}

![夕方の街並みの写真](photo.jpg "夕方に撮影")

![](photo.jpg)

![幅 300px を指定した写真](photo.jpg "=300x")

![Markdown から Hugo を経て HTML になる流れの図](diagram.svg)

脚注の参照です[^1]。2 つ目の脚注もあります[^2]。

[^1]: 1 つ目の脚注の本文です。[Hugo](https://gohugo.io/) へのリンクも含みます。

[^2]: 2 つ目の脚注です。長めの文章が折り返したときの行間と、本文へ戻るリンクの位置を確認します。
