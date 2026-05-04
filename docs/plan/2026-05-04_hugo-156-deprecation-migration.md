# Plan: Hugo v0.156.0 非推奨 API 置き換え

Hugo v0.156.0 で非推奨化された `Site.*` 系メソッドのうち、本テーマで使用している `.Site.Languages` を、推奨される `hugo.Sites` ベースの API へ置き換える。現状は info ログでの警告だが、約3ヶ月後に warning、さらに約12ヶ月後に error へ昇格する予定のため、早めに対応する。

## Background

- Hugo v0.156.0（2026-02-17 公開）で複数の `Site.*` API が非推奨化された
- 背景は v0.153.0 の multidimensional content model 導入。「site（言語×role×version の単一インスタンス）」と「project（複数 site を束ねる集合）」の概念分離が進み、project レベルのデータを `Site.*` から取るのは概念的に不整合とされた
- `hugo build --logLevel info` で実プロジェクトの該当箇所を検出可能
- 非推奨対象（公式デプリ表より）:

  | 非推奨             | 推奨                                                                       | 理由                                 |
  | ------------------ | -------------------------------------------------------------------------- | ------------------------------------ |
  | `Site.Data`        | `hugo.Data`                                                                | Data は project に属する             |
  | `Site.Sites`       | `hugo.Sites`                                                               | Sites は project に属する            |
  | `Page.Sites`       | `hugo.Sites`                                                               | 同上                                 |
  | `Site.AllPages`    | `range hugo.Sites` で各 `.Pages` をループ                                  | 全言語横断は新モデルで奇妙な構造     |
  | `Site.BuildDrafts` | `Page.Draft` または env / カスタム param                                   | フラグ状態の参照は限定用途           |
  | `Site.Languages`   | 言語スイッチャーは `.Rotate "language"`、project 全言語列挙は `hugo.Sites` | 言語選択は現在のページ基準であるべき |

## Current structure

`grep` で本テーマ内の非推奨 API 利用を全件抽出した結果、`.Site.Languages` の 4 件のみが該当。他の非推奨 API（`Site.Data` / `Site.Sites` / `Site.AllPages` / `Site.BuildDrafts` / `Page.Sites`）は未使用。

| File                                            | Line | 用途                                                                                   |
| ----------------------------------------------- | ---- | -------------------------------------------------------------------------------------- |
| `layouts/partials/molecules/lang_switcher.html` | 22   | 言語スイッチャー（現ページ翻訳が無い場合は Home 翻訳→`/<lang>/` の順でフォールバック） |
| `layouts/partials/head/head.html`               | 7    | `<link rel="alternate" hreflang="...">` の生成                                         |
| `layouts/partials/head/head.html`               | 29   | `x-default` 用デフォルト言語の取得（`sort .Site.Languages "Weight" "asc"` の先頭）     |
| `layouts/robots.txt`                            | 5    | `/<lang>/index.json` の Disallow 行を言語ごとに出力                                    |

`theme.toml` の `min_version = "0.101.1"` のままだと `hugo.Sites` / `Page.Rotate` を保証できない。`hugo.Sites` は v0.153.0 で導入された前提のため、`min_version` の引き上げが必要。

## Design policy

- **`min_version`**: `0.156.0` まで引き上げる。デプリ警告ゼロを保証するため
- **共通 partial を最初から導入**: `lang_switcher.html` / `head.html` / `robots.txt` の 3 箇所で `hugo.Sites` 列挙ロジックが重複するため、`layouts/partials/core/get_languages.html` を新設して `partialCached` で呼び出す。今回の PR にまとめて含める
- **dedupe 設計を最初から入れる**: 将来 version / role 次元を導入したときに `hugo.Sites` の flat 列挙で重複が発生するのを防ぐため、共通 partial 内で `where ... "Language.IsDefault" true` 相当のフィルタを噛ませて言語次元のみを残す。具体的には Joe Mooring が公式スレッドで提示したパターンを参考にする

  ```text
  {{/* layouts/partials/core/get_languages.html */}}
  {{ $sites := hugo.Sites }}
  {{ if (index $sites 0).Version }}
    {{ $sites = where $sites "Version.IsDefault" true }}
  {{ end }}
  {{ if (index $sites 0).Role }}
    {{ $sites = where $sites "Role.IsDefault" true }}
  {{ end }}
  {{ return $sites }}
  ```

- **言語スイッチャー（`lang_switcher.html`）**: 現ページの翻訳が無くても全言語のエントリを出したい既存仕様を維持したい。Hugo 推奨の `.Rotate "language"` は「現ページの翻訳のみ」を返すため、要件に合わない。よって共通 partial（`get_languages.html`）経由で project 全言語を列挙する
- **`<link rel="alternate" hreflang="...">`（`head.html:7`）**: 言語スイッチャーと同様、フォールバック付きで全言語を列挙したいので共通 partial で置換
- **`x-default`（`head.html:29`）**: `Weight` ソートでの先頭取得をやめ、`.Site.Language.IsDefault` を判定する API へ移行する。これは Hugo 公式が推奨する「default 判定の正攻法」
- **`robots.txt`**: project 全言語の列挙なので共通 partial で置換

## Implementation steps

1. `theme.toml` の `min_version` を `"0.156.0"` に更新
2. `layouts/partials/core/get_languages.html` を新設
   - `hugo.Sites` を取得
   - 各 site が `Version` / `Role` を持つ場合は `where ... "IsDefault" true` でフィルタ（言語次元のみに dedupe）
   - `return` で site のスライスを返す
3. `layouts/partials/head/head.html`
   - L7 の `range .Site.Languages` を `range partialCached "core/get_languages.html" .` に置換し、ループ変数として `.Language` を取得（`{{ $lang := .Language }}`）
   - L29 の `$defaultLang` ロジックを撤廃し、`.Site.Language.IsDefault` で x-default 用のリンクを直接決定する形にリファクタ（hreflang ループ内で判定するか、ループ後に `hugo.Sites` を `where "Language.IsDefault" true` で 1 件取得するか）
4. `layouts/partials/molecules/lang_switcher.html`
   - L22 の `range $ctx.Site.Languages` を `range partialCached "core/get_languages.html" .` に置換し、`$lang := .Language` で従来の参照と互換を維持
   - `$ctx.Site.Language.Lang` 等の比較は `$lang.Lang` に揃える
5. `layouts/robots.txt`
   - L5 の `range .Site.Languages` を `range partialCached "core/get_languages.html" .` に置換し、`{{ .Language.Lang }}` で出力
6. `make server` でローカル起動し `--logLevel info` でログにデプリ警告が出ないか確認
7. 多言語動作確認: ja/en の両方で hreflang、言語スイッチャー、`x-default`、robots.txt の出力差分を確認
8. `make build` で本番ビルドが通ることを確認

## File changes

| File                                            | Change                                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `theme.toml`                                    | `min_version` を `"0.156.0"` に引き上げ                                                         |
| `layouts/partials/head/head.html`               | hreflang 列挙を `hugo.Sites` ベースに置換。`x-default` を `.Site.Language.IsDefault` 判定に変更 |
| `layouts/partials/molecules/lang_switcher.html` | `range hugo.Sites` に置換し `.Language` から `Lang` / `LanguageName` を参照                     |
| `layouts/robots.txt`                            | `range hugo.Sites` に置換し `.Language.Lang` で出力                                             |
| `layouts/partials/core/get_languages.html`      | 新設。`hugo.Sites` を集約し version / role 次元を dedupe する `partialCached` 用 helper         |

## Risks and mitigations

| Risk                                                                                                                    | Mitigation                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hugo.Sites` のループ変数構造が `.Site.Languages` と異なり、`Lang` / `LanguageName` の参照箇所が壊れる                  | 各 site の `.Language` を経由してアクセス（`{{ $lang := .Language }}`）。修正後に視認チェック                                                                                    |
| multidimensional content model（version / role）導入時、`hugo.Sites` は言語以外の次元も flat に含むため重複が出る可能性 | 本テーマは現状 language 以外の次元を使っていない。将来導入する場合は `where hugo.Sites "Version.IsDefault" true` などで dedupe                                                   |
| `min_version` 引き上げで古い Hugo を使うユーザがビルド失敗する                                                          | README/CHANGELOG に明記。Hugo v0.156.0 は安定版として既にリリース済みで、影響は限定的                                                                                            |
| `x-default` のロジック変更で挙動が変わり、検索エンジンへの hreflang 通知が崩れる                                        | 変更前後で `view-source:` の `<link rel="alternate" hreflang="x-default">` が同じ URL を指すこと、現状の `Weight asc` 先頭言語が `defaultContentLanguage` と一致しているかを確認 |
| `.Rotate "language"` を採用すると現ページ翻訳が無い言語が消える                                                         | 言語スイッチャーは「全言語表示＋翻訳が無ければ Home / `/<lang>/` フォールバック」が要件のため、`hugo.Sites` を採用して `.Rotate` は使わない判断を明文化                          |

## Validation

- [ ] `hugo build --logLevel info` の出力に `deprecated` を含む行が無い
- [ ] `make server` 起動時、トップページ・記事ページ双方の `<head>` に hreflang が言語数ぶん出る
- [ ] 翻訳が存在しないページで言語スイッチャーが全言語のエントリを表示する
- [ ] `x-default` の href が `defaultContentLanguage` の URL を指している
- [ ] `/robots.txt` に `/ja/index.json` `/en/index.json` 等が漏れなく Disallow されている
- [ ] `make build` が成功し、`hugo/public/` 配下の出力に差分が想定範囲内
- [ ] 既存 lint（textlint / markdownlint）が通る

## Decisions

- `min_version` は `0.156.0` まで引き上げる（デプリ警告ゼロを保証）
- `partials/core/get_languages.html` は今回の PR にまとめて含める（重複ロジックの初期段階での共通化）
- `hugo.Sites` の dedupe（version / role 次元を `IsDefault` でフィルタ）は最初から共通 partial に実装する
