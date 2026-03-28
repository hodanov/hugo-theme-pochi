# Plan: Extract Bounded-Widths Calculation into Sub-Partial

`picture.html` の Path 1 と Path 2 で完全に重複している bounded-widths 計算（`$widths` を `$origW` で上限クリップし、空なら `$origW` を返すロジック）を `layouts/partials/atoms/bounded_widths.html` として切り出す。Hugo の `return` 文を使い、計算結果のスライスを呼び出し元に戻す純粋な計算 partial として実装する。

## Background

- `picture.html` は Path 1（JPG/PNG リソース）と Path 2（AVIF/WEBP + サイドカー有）の両方で、`$widths` スライスを `$origW` で上限クリップし `$bounded` を生成するロジックを持つ
- 両ブロックは9行・ロジック完全一致のコピー&ペーストである
- 将来、クリップのロジックを変更する場合（例: `lt` → `le` の変更、最小幅のフロア追加）に両箇所を同時に変更しなければならず、変更漏れのリスクがある

## Current structure

**Path 1（行 50–58）**:

```html
{{ $bounded := slice }} {{ range $w := $widths }} {{ if le $w $origW }} {{
$bounded = $bounded | append $w }} {{ end }} {{ end }} {{ if eq (len $bounded) 0
}} {{ $bounded = slice $origW }} {{ end }}
```

`$origW` は直前の `{{ $origW := $res.Width }}` から取得。

**Path 2（行 127–135）**:

```html
{{ $bounded := slice }} {{ range $w := $widths }} {{ if le $w $origW }} {{
$bounded = $bounded | append $w }} {{ end }} {{ end }} {{ if eq (len $bounded) 0
}} {{ $bounded = slice $origW }} {{ end }}
```

`$origW` は直前の `{{ $origW := $base.Width }}` から取得。コード本体は Path 1 と完全一致。

## Design policy

- `layouts/partials/atoms/bounded_widths.html` を新規作成する
- `dict "widths" $widths "origW" $origW` を入力として受け取り、Hugo の `{{ return $bounded }}` で計算結果のスライスを返す（HTML を一切出力しない純粋な計算 partial）
- Hugo の partial return は v0.91.0 以降で利用可能。呼び出し元では `{{ $bounded := partial "atoms/bounded_widths.html" ... }}` の形で結果を受け取る
- `picture.html` の変更は機械的な置き換えのみ。`$origW` の取得元（`$res.Width` / `$base.Width`）は呼び出し元に残す

## Implementation steps

1. `layouts/partials/atoms/bounded_widths.html` を新規作成する

   ```html
   {{- $widths := .widths -}} {{- $origW := .origW -}} {{- $bounded := slice -}}
   {{- range $w := $widths -}} {{- if le $w $origW -}} {{- $bounded = $bounded |
   append $w -}} {{- end -}} {{- end -}} {{- if eq (len $bounded) 0 -}} {{-
   $bounded = slice $origW -}} {{- end -}} {{- return $bounded -}}
   ```

2. `picture.html` の Path 1（行 50–58）を置き換える

   置き換え前:

   ```html
   {{ $bounded := slice }} {{ range $w := $widths }} {{ if le $w $origW }} {{
   $bounded = $bounded | append $w }} {{ end }} {{ end }} {{ if eq (len
   $bounded) 0 }} {{ $bounded = slice $origW }} {{ end }}
   ```

   置き換え後:

   ```html
   {{ $bounded := partial "atoms/bounded_widths.html" (dict "widths" $widths
   "origW" $origW) }}
   ```

3. `picture.html` の Path 2（行 127–135）を置き換える（同一の置き換え）

4. `hugo server` でビルドし、各パスで画像が正しく出力されることを確認する

## File changes

| File                                         | Change                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `layouts/partials/atoms/bounded_widths.html` | 新規作成。`widths` と `origW` を受け取り、クリップ済みスライスを `return` で返す            |
| `layouts/partials/atoms/picture.html`        | 行 50–58（Path 1）と行 127–135（Path 2）の9行ブロックを各1行の `partial` 呼び出しに置き換え |

## Risks and mitigations

| Risk                                                       | Mitigation                                                                                                                                           |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hugo v0.91.0 未満では `return` が使えない                  | 現プロジェクトが 2026 年時点で最新 Hugo を使用していることを `hugo version` で確認する                                                               |
| `partialCached` を使わないため、同一引数でも毎回計算される | 呼び出し箇所は `picture.html` 内の2箇所のみ。1回のビルドで同一 `$origW`/`$widths` の組み合わせが大量に出ることはなく、パフォーマンス影響は無視できる |
| `return` を使う partial は HTML 出力を持てない             | `bounded_widths.html` は HTML を一切出力しない純粋な計算として設計する。コメントすら出力しないよう `{{- -}}` で全行トリミングする                    |

## Validation

- [x] `hugo version` で v0.91.0 以上であることを確認する
- [x] Path 1（JPG/PNG の `featuredImage`）で `<picture>` に複数の `srcset` エントリが出力されること
- [x] Path 2（AVIF/WEBP の `featuredImage` + サイドカー有）で `<picture>` に複数の `srcset` エントリが出力されること
- [x] 元画像が `$widths` の最小値より小さい場合（例: 元画像幅 300px、`$widths` が `[480, 800, ...]`）で `$bounded` が `[300]` になること
- [x] リグレッションなし: `img_attrs.html` 切り出し後（前プラン適用済み）と同一の HTML が出力されること
