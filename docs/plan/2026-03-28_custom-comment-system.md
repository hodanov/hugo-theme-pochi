# Plan: 自作コメントシステムの構築

giscus（GitHub Discussions ベース）に依存しているコメント欄を、Cloudflare Worker + D1 による自作システムに置き換える。GitHub アカウント不要の匿名投稿 + 承認制で、デザイン統一・外部依存排除・学習目的を同時に達成する。

## Background

- 現在のコメント欄は giscus を使用（iframe で GitHub Discussions を埋め込み）
- 動機は4つ: GitHub アカウント不要化、デザイン完全統一、技術的学習・ポートフォリオ、外部サービス依存排除
- giscus が提供する認証・スパム対策・モデレーションをフルスクラッチで再実装する必要がある
- 既存の Like ボタン（`like-button.js`）は giscus と完全に独立しており、giscus 削除による影響はゼロ

## Current structure

giscus の統合ポイントは4箇所:

| File                                      | Role                                                             |
| ----------------------------------------- | ---------------------------------------------------------------- |
| `layouts/partials/molecules/comment.html` | provider 分岐（giscus / disqus）と giscus `<script>` 埋め込み    |
| `assets/js/main.js:540-595`               | ダークモード切替時に giscus iframe へ `postMessage` でテーマ同期 |
| `assets/js/navigation.js:392-417`         | PJAX 後に giscus `<script>` を clone & 再注入して再初期化        |
| `hugo/config/_default/params.yaml:60-73`  | giscus の設定値（repo, mapping, theme 等）                       |

既存インフラ:

- Cloudflare Workers + KV（`workers/like-counter/`）で Like ボタン API を運用中
- KV はキー単位の読み書きに特化しており、コメント一覧取得には不向き → D1 (SQLite) が必要

## Design policy

- **匿名投稿 + 承認制**: 投稿時は名前のみ必須。`approved` フラグで管理者が承認後に表示。GitHub OAuth は将来対応
- **provider 分岐で共存**: `comment.html` の既存分岐に `custom` を追加するだけ。giscus コードは安定するまで残す
- **iframe 不要**: in-page DOM で実装し、CSS 変数（`--pochi-bg`, `--pochi-text` 等）を直接継承。`postMessage` hack が不要に
- **既存パターンの踏襲**: PJAX 再初期化は `like-button.js:129` の `pochi:afterSwap` パターンを模倣
- **Cloudflare エコシステム内で完結**: Worker + D1 + Turnstile（スパム対策、無料）

## Implementation steps

1. **D1 スキーマ設計**: `comments` テーブル（`id`, `slug`, `author_name`, `body`, `created_at`, `approved`）を定義
2. **Cloudflare Worker API 構築** (`workers/comment-api/`):
   - `GET /comments?slug=<slug>` — 承認済みコメント一覧を返却
   - `POST /comments` — 新規コメント投稿（Turnstile トークン検証 + IP rate limit）
   - `DELETE /comments/:id` — モデレーション用削除（Bearer トークン認証）
   - CORS は `workers/like-counter/src/index.ts:8-18` と同パターン
3. **Turnstile 統合**: POST 時に Turnstile トークンを `siteverify` API で検証
4. **Hugo テンプレート作成**: `comment_custom.html` でコメント一覧 + 投稿フォームをレンダリング
5. **フロントエンド JS 作成** (`assets/js/comment.js`): fetch でコメント取得・投稿、Turnstile ウィジェット連携、`pochi:afterSwap` で PJAX 再初期化
6. **provider 分岐更新**: `comment.html` に `else if eq $provider "custom"` を追加
7. **params.yaml 更新**: `provider: custom` + `commentApi` の URL を追加
8. **giscus コード整理**（自作が安定した後）: `main.js` の `updateGiscusTheme()`、`navigation.js` の `initGiscus()`、`params.yaml` の `giscus` セクションを削除

## File changes

| File                                             | Change                                                    |
| ------------------------------------------------ | --------------------------------------------------------- |
| `workers/comment-api/`                           | **新規作成** — Worker + D1 + Turnstile の API 一式        |
| `layouts/partials/molecules/comment.html`        | `else if eq $provider "custom"` 分岐を追加                |
| `layouts/partials/molecules/comment_custom.html` | **新規作成** — コメント一覧 + 投稿フォーム                |
| `assets/js/comment.js`                           | **新規作成** — fetch でコメント取得・投稿、Turnstile 統合 |
| `assets/css/main.css`                            | コメントフォーム用スタイル（既存 `.comments` を拡張）     |
| `hugo/config/_default/params.yaml`               | `provider: custom` + `commentApi` URL を追加              |
| `assets/js/main.js:540-595`                      | giscus 安定後に `updateGiscusTheme()` 関連を削除          |
| `assets/js/navigation.js:392-417`                | giscus 安定後に `initGiscus()` を削除                     |

## Risks and mitigations

| Risk                                     | Mitigation                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| スパムコメントの増加（認証なし）         | Turnstile + IP rate limit + 承認制の3重防御                                        |
| XSS（ユーザー入力の表示）                | サーバー側でサニタイズ + クライアント側で `textContent` を使用（innerHTML 不使用） |
| 既存コメント（GitHub Discussions）の喪失 | giscus コードを残して共存可能。移行は将来対応                                      |
| D1 のデータ損失                          | Cloudflare D1 は自動バックアップあり。重要データは定期エクスポートも検討           |
| Turnstile の UX 低下                     | Turnstile は invisible mode 対応。ユーザー操作不要で検証可能                       |

## Validation

- [ ] `wrangler dev` で Worker ローカルテスト（D1 + Turnstile）
- [ ] `make server` でコメント一覧表示・投稿フォームの動作確認
- [ ] PJAX ページ遷移後にコメント欄が正しく再初期化されること
- [ ] ライト/ダーク切替でコメント欄のスタイルが追従すること
- [ ] Turnstile トークンなしの POST が 403 で拒否されること
- [ ] 連続 POST で 429（rate limit）が返ること
- [ ] `approved: false` のコメントが一覧に表示されないこと
- [ ] `DELETE /comments/:id` が Bearer トークンなしで 401 を返すこと

## Open questions

- 既存の GitHub Discussions コメントを移行するか、そのまま残すか
- モデレーション UI を将来的に構築するか、`curl` ベースの運用で十分か
- Markdown レンダリングを MVP に含めるか（プレーンテキストで十分か）
- GitHub OAuth を将来追加する場合のタイミングと優先度
