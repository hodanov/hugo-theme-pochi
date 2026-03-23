# Plan: PR 時の CI に Lint・ビルド・Vendor 検証を追加する

PR 作成時にコードの品質を自動で検証する CI ワークフローを追加する。既存の `npm run lint`（Prettier）を CI で実行し、Hugo ビルド検証と Vendor 整合性チェックも合わせて導入する。

## Background

- PR 時にフォーマット違反を検知する仕組みがない
- E2E テストは既に CI で実行されているが、lint チェックは未導入
- Vendor ファイルを手動で変更した場合のガードもない
- テーマリポジトリ（`pochi`）単体での CI 強化が目的

## Current structure

- `package.json` に `"lint": "prettier . --check"` が定義済み
- `.prettierrc` で go-template / scss / babel / yaml パーサーを設定済み
- `.prettierignore` で vendor ファイル等を除外済み
- 既存ワークフロー:
  - `.github/workflows/e2e.yml` — Playwright E2E テスト（PR + push to main）
  - `.github/workflows/deploy_to_github_page.yml` — GitHub Pages デプロイ（push to main）
  - `.github/workflows/vendor_auto_update.yml` — 週次 vendor 自動更新

## Design policy

- lint / build / vendor:verify を 1 つのワークフロー `ci.yml` にまとめ、ジョブを分離する
- E2E テストは実行時間が長いため、既存の `e2e.yml` のまま別ワークフローとして維持する
- 既存の `e2e.yml` と同じ Node / Hugo バージョン・キャッシュ戦略を踏襲し、統一感を保つ
- TypeScript 型チェックは `tsconfig.json` が未整備のため今回は見送る

## Implementation steps

1. `.github/workflows/ci.yml` を新規作成する
2. `lint` ジョブを定義する — `npm ci` → `npm run lint`
3. `build` ジョブを定義する — Hugo セットアップ → `hugo --gc -s example_site --themesDir ../.. -t pochi`
4. `vendor` ジョブを定義する — `npm ci` → `npm run vendor:verify`
5. トリガーを `pull_request` + `push: branches: [main]` に設定する

## File changes

| File                       | Change                                                               |
| -------------------------- | -------------------------------------------------------------------- |
| `.github/workflows/ci.yml` | 新規作成。lint / build / vendor:verify の 3 ジョブを含むワークフロー |

## Risks and mitigations

| Risk                                                                 | Mitigation                                                                                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 既存コードが Prettier チェックに通らない場合、初回 PR で全件失敗する | 導入前に `npm run lint` をローカルで実行し、必要なら `npm run format` で修正してからマージする |
| Hugo バージョンが `e2e.yml` と乖離する可能性                         | 両ワークフローで同じバージョン（`0.154.1`）を明示する                                          |
| CI の並列ジョブ数増加による待ち時間                                  | 3 ジョブとも軽量（各 1-2 分）なので影響は軽微                                                  |

## Validation

- [ ] `npm run lint` がローカルで pass する
- [ ] PR を作成して 3 ジョブ（lint / build / vendor）が全て pass する
- [ ] わざとフォーマットを崩したコミットで lint ジョブが fail する
- [ ] `e2e.yml` が引き続き正常に動作する

## Open questions

- TypeScript 型チェック（`npx tsc --noEmit`）を将来的に追加するか
- `e2e.yml` の build ステップと `ci.yml` の build ジョブの重複をどう扱うか
