# pochi E2Eテスト導入 PRD

## 背景

- テーマ修正のたびに手動確認コストが高い
- ローカルとCIでE2Eを回して安全に改修したい

## 目的 / ゴール

- ローカルとCIでE2Eが安定して回る
- 主要ページと主要機能の壊れを早期検知できる
- テーマ修正の心理的負担を下げる

## 非ゴール

- ビジュアル回帰（スクショ差分）は今はやらない
- クロスブラウザ対応は後回し（当面はchromiumのみ）

## 対象範囲

- テーマリポジトリ（`hugo/themes/pochi`）内にE2Eを導入
- テスト配置は `hugo/themes/pochi/tests/e2e/`
- テスト対象コンテンツは `example_site/` を使う
- E2E専用の固定コンテンツは追加してOK

## 技術選定

### 採用

- Playwright

### 理由

- `webServer` でHugo起動を内包できて運用が楽
- 安定性が高く、後からクロスブラウザ拡張がしやすい
- CI連携が簡単

## アーキテクチャ概要

- ルート: `hugo/themes/pochi/`
- 設定: `playwright.config.js`
- テスト: `tests/e2e/`
- Hugo起動: Playwright `webServer` で `hugo serve` を起動
  - テーマ名/配置は `playwright.config.js` が `__dirname` から自動解決
  - 例: `hugo serve -s example_site --themesDir <themesDir> -t <themeName> --disableFastRender --bind 127.0.0.1 --port 10391 --baseURL http://127.0.0.1:10391/ --buildDrafts --buildFuture`
- テスト対象URLは `example_site` から生成したHTML一覧で作る

## 実行設定（環境変数）

- `E2E_PORT`: 既定 `10391`
- `E2E_BASE_URL`: 既定 `http://127.0.0.1:${E2E_PORT}/`
- `E2E_REUSE_SERVER`: ローカル限定で再利用したい場合に `1`

## テスト戦略

### 1) 主要ページスモーク

主要テンプレートを網羅するページを明示的にテストする。

- Home / 一覧（`_default/list.html`）
- セクション一覧（`/posts/` など）
- 記事詳細（`posts/single.html`）
- 固定ページ詳細（`_default/single.html`）
- 検索結果ページ（`_default/search.html`）
- アーカイブ一覧（`archives/list.html`）
- ターム一覧（`_default/terms.html`）
- ターム詳細（`/tags/<slug>/`, `/categories/<slug>/`）
- 404（`/404.html`）
- 検索インデックス（`/index.json`）

アサート例

- レスポンスがOK
- `.main-content` が表示される
- `h1` が存在する（検索ページは例外扱いでもOK）
- `document.title` が空じゃない
- `pageerror` / `console.error` が出ない

### 2) 主要機能の個別テスト

主要ページと機能は全てテスト対象にする。

- グローバルナビ + サイドナビ（開閉/フォーカス/リンク遷移）
- テーマ切替（`#theme-toggle-switch` が `html.dark` を切り替える）
- 検索（フォーム → `index.json` 読み込み → 結果表示/0件表示）
- ページネーション（一覧で次ページへ遷移）
- アーカイブ開閉（サイドバー年トグル / アーカイブページ月トグル）
- TOC表示 + スクロール連動（`toc.html` + `scrollspy.js`）
- 共有ボタン（コピー成功メッセージ）
- いいねボタン（存在/クリック可能、コメント領域へスクロール）
- 言語切替（トップ/サイドのセレクトが切り替わる）
- PJAXナビゲーション（内部リンク遷移後も主要JSが動作）

## テストケース表（機能×粒度）

### ページ系

| ID | 対象ページ | シナリオ（成功パス） | 主要アサート | 備考 / データ条件 |
| --- | --- | --- | --- | --- |
| P-01 | Home（一覧） | `/` を開く | `.main-content` 表示、記事カードが1件以上、`document.title` 非空 | 記事が複数必要 |
| P-02 | セクション一覧 | `/posts/` を開く | 一覧が表示、記事リンクがある | `posts` セクションに複数記事 |
| P-03 | 記事詳細（TOCあり） | TOC付き記事を開く | `h1` 表示、TOC表示、右サイドバー有り | 見出し多数の本文 |
| P-04 | 記事詳細（TOCなし） | TOCなし記事を開く | `h1` 表示、TOCが出ない | 見出しなし本文 |
| P-05 | 固定ページ | `/page/about/` を開く | `h1` 表示、本文が表示 | 既存のaboutでOK |
| P-06 | 検索ページ | 検索フォームから検索して結果を表示 | 結果コンテナに該当タイトルが出る | `search` レイアウト |
| P-07 | アーカイブ一覧 | `/archives/` を開く | 年の見出しが表示 | 複数年/複数月が理想 |
| P-08 | ターム一覧 | `/tags/` と `/categories/` を開く | タグ/カテゴリ一覧が表示 | タグ/カテゴリ付き記事が必要 |
| P-09 | ターム詳細 | `/tags/<slug>/` を開く | 記事一覧が表示 | 固定タグを用意 |
| P-10 | 404 | `/404.html` を開く | 404画像が表示される | `alt="404 Not Found"` |
| P-11 | 検索インデックス | `/index.json` を取得 | レスポンス200、配列が入ってる | 検索用JSON |

### 機能系

| ID | 機能 | シナリオ（成功パス） | 主要アサート | 備考 / データ条件 |
| --- | --- | --- | --- | --- |
| F-01 | グローバルナビ | ナビのリンクで固定ページに遷移 | URLが変わる、見出しが変わる | メニュー定義が必要 |
| F-02 | サイドナビ | ハンバーガーで開閉、リンククリックで閉じる | `aria-expanded` 変化、`aria-hidden` 変化 | モバイル用サイドナビ |
| F-03 | テーマ切替 | トグルをクリック | `html.dark` が切り替わる、`aria-pressed` 変化 | `#theme-toggle-switch` |
| F-04 | 検索（ヒット） | 検索フォームでクエリ入力→遷移 | 検索結果が1件以上 | index.jsonに該当語 |
| F-05 | 検索（0件） | 結果がない語で検索 | `no_results` 文言が出る | i18n文言依存 |
| F-06 | ページネーション | 一覧で次ページへ移動 | URLに `page/2`、記事が変わる | 充分な記事数 |
| F-07 | アーカイブ開閉 | 年/ 月トグルを開閉 | `aria-expanded` / `is-collapsed` 変化 | `archives-toggle.js` |
| F-08 | TOC + スクロール | TOCリンククリック | URLハッシュ変更、対象見出しへ移動 | TOC付き記事 |
| F-09 | 共有ボタン | 共有ボタンをクリック | `aria-pressed` 変化 / メッセージ表示 | クリップボード許可 |
| F-10 | いいねボタン | いいねボタンをクリック | コメント領域へスクロール | giscus iframeは不要 |
| F-11 | 言語切替 | 言語セレクト変更 | `/en/` へ遷移 | 多言語記事必要 |
| F-12 | PJAX遷移 | 内部リンクで遷移 | `.main-content` 更新後もテーマ切替が動く | `navigation.js` |

## ページ一覧の生成仕様

主要ページを固定URLで列挙する。`example_site` のE2E用コンテンツでURLを安定させる。

- コマンド例: `hugo --gc -s example_site --themesDir <themesDir> -t <themeName> -d e2e-public --baseURL http://127.0.0.1:10391/ --buildDrafts --buildFuture`
- ルール
  - `index.html` はディレクトリURLに変換
  - `404.html` は `/404.html` で直接確認
  - `index.xml` / `sitemap.xml` などは除外
  - `index.json` は検索のために個別に確認

## テストデータ方針

- E2E専用の安定データは `example_site/content/` 配下に置く（主に `posts/`）
- 記事は少なくとも以下を用意
  - TOCあり（見出し多数）+ featuredImage + tags/categories 付き
  - TOCなし（見出しなし）+ featuredImageなし
  - ページネーションが出る件数
  - 複数年・複数月に分かれる日付（アーカイブ検証用）
- 固定ページ（about/contact/search）を維持しつつE2E専用ページを追加
- 多言語（ja/en）の対訳ページを最低1つ用意
- 画像は `example_site/static/` 配下に置く
- 日付など動的に揺れる要素は極力使わない

## ローカル実行

- `npm run e2e` でHugo起動→E2E実行
- すでに `npm run serve` してる場合は `E2E_REUSE_SERVER=1` で再利用
  - 例: `E2E_REUSE_SERVER=1 npm run e2e`

## CI（GitHub Actions）

- テーマ側リポジトリにworkflow追加
- 流れ
  - checkout
  - Nodeセットアップ + `npm ci`
  - Hugoセットアップ
  - `npx playwright install --with-deps`
  - `npm run e2e`

## セレクタ方針

- 安定セレクタは `data-pochi-*` を使う
- 必要ならテンプレートに `data-pochi-*` を追加

## パフォーマンス目安

- 1回のCI実行は5分以内を目標
- 対象ページが増える場合は上限件数を設けてもいい

## 将来拡張

- Firefox / WebKit の追加
- ビジュアル回帰（スクショ差分）
- 主要ページだけのスナップショット導入

## 成功条件

- ローカルで `npm run e2e` が失敗なく通る
- CIで安定して再現可能
- テーマ変更でUIの壊れを検知できる
