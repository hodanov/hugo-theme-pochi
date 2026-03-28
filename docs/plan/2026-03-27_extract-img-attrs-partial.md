# Plan: Extract `<img>` Attribute Block into Sub-Partial

`picture.html` に6箇所重複している `loading` / `decoding` / `fetchpriority` 属性ブロックを `layouts/partials/atoms/img_attrs.html` として切り出す。重複排除に加え、`loading` 属性値に混入していた前後の空白も同時に解消する。

## Background

- `picture.html` は JPG/PNG 変換・AVIF/WEBP サイドカー・静的パスの3系統、合計6つの `<img>` 出力箇所を持つ
- `loading` / `decoding` / `fetchpriority` の3属性は全箇所で同一ロジックだが、コピー&ペーストで重複している
- 現状の `loading` 属性はブロック内に改行・インデントが含まれており、属性値に空白が混入する形式で書かれている（HTML パーサは正規化するが、ソース可読性と `hugo --minify` の挙動に影響する可能性がある）
- 属性ブロックの変更（例: `priority` の判定条件を変更）が全6箇所に波及し、変更漏れのリスクが高い

## Current structure

`picture.html` 内の `<img>` 属性ブロック出現箇所:

| 行      | パス                                      | 備考                                       |
| ------- | ----------------------------------------- | ------------------------------------------ |
| 112–116 | Path 1: JPG/PNG リソース → AVIF/WEBP 変換 | `srcset`, `width`, `height` あり           |
| 171–175 | Path 2: AVIF/WEBP リソース + サイドカー有 | `srcset`, `width`, `height` あり           |
| 191–197 | Path 2: AVIF/WEBP リソース + サイドカー無 | `srcset` なし、`width`/`height` は条件付き |
| 211–215 | Path 3: SVG リソース                      | `width`/`height` なし                      |
| 259–263 | 静的パス: AVIF/WEBP                       | `srcset` なし、`width`/`height` は条件付き |
| 283–287 | 静的パス: 汎用（JPG/PNG/SVG）             | `srcset` なし、`width`/`height` は条件付き |

重複している属性ブロック（現状）:

```html
loading="{{ if eq $priority "high" }} eager {{ else }} lazy {{ end }}"
decoding="async" {{ if eq $priority "high" }}fetchpriority="high"{{ end }}
```

## Design policy

- `loading` / `decoding` / `fetchpriority` の3属性を `layouts/partials/atoms/img_attrs.html` に切り出す
- 入力: `priority`（文字列）を `dict` で受け取る
- 出力: 3属性のインライン文字列（前後の空白を `{{- -}}` で制御し、`loading` 値への空白混入を排除する）
- `src` / `srcset` / `sizes` / `alt` / `width` / `height` は呼び出し元に残す。これらはパスごとに異なるため sub-partial には含めない
- Hugo partial はバッファに直接書き出すため、属性文字列をそのまま出力する形式で実装する
- `picture.html` の変更は機械的な置き換えのみ。ロジック変更は行わない

## Implementation steps

1. `layouts/partials/atoms/img_attrs.html` を新規作成する

   ```html
   {{- $priority := .priority -}} loading="{{ if eq $priority "high" }}eager{{
   else }}lazy{{ end }}" decoding="async"{{ if eq $priority "high" }}
   fetchpriority="high"{{ end -}}
   ```

2. `picture.html` の6箇所の属性ブロックを `partial` 呼び出しに置き換える

   置き換え前:

   ```html
   loading="{{ if eq $priority "high" }} eager {{ else }} lazy {{ end }}"
   decoding="async" {{ if eq $priority "high" }}fetchpriority="high"{{ end }}
   ```

   置き換え後:

   ```html
   {{- partial "atoms/img_attrs.html" (dict "priority" $priority) }}
   ```

   対象箇所（6箇所）:
   - 行 112–118（Path 1）
   - 行 171–177（Path 2 サイドカー有）
   - 行 191–197（Path 2 サイドカー無）
   - 行 211–217（SVG リソース）
   - 行 259–265（静的パス AVIF/WEBP）
   - 行 283–289（静的パス 汎用）

3. `hugo server` でビルドし、出力 HTML に `loading="eager"` / `loading="lazy"` が空白なしで出力されることを確認する

4. `priority="high"` を持つ呼び出し（`hero.html`, `post_meta_featured_image.html`）と持たない呼び出し（`list_of_posts.html`, `related_posts.html`）でそれぞれ出力が正しいことを確認する

## File changes

| File                                    | Change                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| `layouts/partials/atoms/img_attrs.html` | 新規作成。`priority` を受け取り `loading`, `decoding`, `fetchpriority` を出力 |
| `layouts/partials/atoms/picture.html`   | 6箇所の属性ブロックを `partial "atoms/img_attrs.html"` 呼び出しに置き換え     |

## Risks and mitigations

| Risk                                                                       | Mitigation                                                                                               |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `partial` の呼び出しオーバーヘッドが6回分増える                            | Hugo はビルド時のみ評価。ブラウザへの実行時コストはなく、ビルド時間への影響は無視できる                  |
| `{{- -}}` の空白制御がずれて `<img>` タグの属性間にスペースが消える        | 置き換え後にビルドし、出力 HTML を目視確認する。属性間に最低1スペースがあれば HTML は正しく解釈される    |
| `alt` 属性が partial に含まれていないため呼び出し元の記述順が変わる        | `alt` は各パスで `{{ with $alt }}alt="{{ . }}"{{ end }}` として `<img>` の先頭付近に残す。順序変更は不要 |
| 将来 `priority` 以外の入力が必要になった際に partial の interface が変わる | `dict` 渡しにしているため、キーを追加するだけで後方互換を保てる                                          |

## Validation

- [x] `loading` 属性値に前後の空白・改行が含まれないこと（`loading="eager"` または `loading="lazy"` の形式）
- [x] `priority="high"` の画像で `fetchpriority="high"` が出力されること（`hero.html`, `post_meta_featured_image.html` 経由で確認）
- [x] `priority` 指定なしの画像で `fetchpriority` 属性が出力されないこと（`list_of_posts.html`, `related_posts.html` 経由で確認）
- [x] SVG（`profile.html` 経由）で `loading="lazy"` が出力されること
- [x] 静的パス画像（ページリソースでない画像）で正しく出力されること
- [x] `hugo --minify` ビルドでも属性値が崩れないこと
