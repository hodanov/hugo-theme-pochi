# Plan: CI 依存パッケージ・ツール更新 PR の自動マージ

Dependabot や Vendor Auto Update ワークフローが作成する更新 PR を、CI チェック通過後に自動でマージする仕組みを導入する。手動レビューの負担を減らしつつ、既存の CI/E2E テストをゲートとして安全性を担保する。

## Background

- Dependabot が毎週 npm パッケージと GitHub Actions の更新 PR を作成している
- `vendor_auto_update.yml` が毎週月曜に fuse.js / mark.js / modern-normalize の更新 PR を作成している
- 現状はすべて手動でレビュー・マージしている
- CI（lint, build, vendor verify）と E2E（Playwright）のチェックが既にあり、品質ゲートは整っている
- 依存更新 PR は定型的で、CI が通れば安全にマージできるケースが大半

## Current structure

- `.github/dependabot.yml` — npm（weekly, grouped）+ GitHub Actions（weekly, grouped）
- `.github/workflows/ci.yml` — lint / build / vendor verify（PR と main push で実行）
- `.github/workflows/e2e.yml` — Playwright E2E テスト（PR と main push で実行）
- `.github/workflows/vendor_auto_update.yml` — fuse.js / mark.js / modern-normalize の自動更新 PR 作成
- ブランチ保護ルール: 現在 **未設定**

## Design policy

- **GitHub built-in auto-merge を活用する** — 外部 Action やカスタムスクリプトを最小限にし、GitHub ネイティブ機能で実現する
- **branch protection を前提条件にする** — auto-merge が意味を持つには required status checks が必須。CI / E2E を必須チェックに設定する
- **auto-approve + auto-merge の2段構成** — ワークフローが PR を approve し、auto-merge を有効化する。実際のマージは全 required checks 通過後に GitHub が行う
- **対象を明示的に絞る** — `dependabot[bot]` と `github-actions[bot]`（vendor auto update）のみ。人間が作った PR は対象外
- **squash merge を採用** — 依存更新の中間コミットは不要なので squash で履歴をクリーンに保つ

## Implementation steps

1. **GitHub リポジトリ設定で auto-merge を有効化する**
   - Settings → General → Pull Requests → "Allow auto-merge" にチェック
   - これがないと `gh pr merge --auto` が使えない

2. **`main` ブランチに branch protection rule を設定する**
   - Settings → Branches → Add rule for `main`
   - "Require status checks to pass before merging" を有効化
   - Required checks に以下を追加:
     - `lint`（ci.yml）
     - `build`（ci.yml）
     - `vendor`（ci.yml）
     - `e2e`（e2e.yml）
   - "Require branches to be up to date before merging" は **無効のまま**（依存更新 PR が頻繁にリベース待ちになるのを防ぐ）

3. **`auto-merge.yml` ワークフローを作成する**
   - `pull_request_target` トリガーで Dependabot PR をカバー
   - actor が `dependabot[bot]` または `github-actions[bot]` の場合のみ実行
   - `gh pr review --approve` で承認
   - `gh pr merge --auto --squash` で auto-merge を有効化

4. **`vendor_auto_update.yml` を修正する**
   - PR 作成後に auto-merge を有効化するステップを追加（オプション: `auto-merge.yml` に統一しても可）

5. **動作確認**
   - Dependabot PR が作成された際に auto-approve + auto-merge が有効化されることを確認
   - CI / E2E が通ったあとに自動マージされることを確認
   - CI が失敗した場合にマージされないことを確認

## File changes

| File                                       | Change                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `.github/workflows/auto-merge.yml`         | 新規作成。`pull_request_target` で bot PR を auto-approve + auto-merge |
| `.github/workflows/vendor_auto_update.yml` | （オプション）PR 作成後に auto-merge 有効化ステップを追加              |
| GitHub リポジトリ設定                      | auto-merge 有効化、branch protection rule 追加（コード外の手動設定）   |

### `auto-merge.yml` 案

```yaml
name: Auto Merge Dependency PRs

on:
  pull_request_target:
    types: [opened, synchronize, reopened]

permissions:
  contents: write
  pull-requests: write

jobs:
  auto-merge:
    runs-on: ubuntu-latest
    if: >-
      github.actor == 'dependabot[bot]' ||
      github.actor == 'github-actions[bot]'
    steps:
      - name: Approve PR
        run: gh pr review "$PR_URL" --approve
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Enable auto-merge (squash)
        run: gh pr merge "$PR_URL" --auto --squash
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Risks and mitigations

| Risk                                                       | Mitigation                                                                                                                                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 悪意のある Dependabot PR（サプライチェーン攻撃）           | `pull_request_target` + `GITHUB_TOKEN` のみ使用。シークレットへの過剰なアクセス権を付与しない。CI / E2E テストが壊れた更新をブロックする                                     |
| E2E でカバーされない破壊的変更がマージされる               | fuse.js / mark.js のメジャーバージョン更新は `vendor_auto_update.yml` 経由で来る。E2E に検索機能のテストが含まれていることを確認する                                         |
| branch protection 設定ミスで CI スキップのままマージされる | 設定後に CI が fail する PR を作って、マージがブロックされることを手動確認する                                                                                               |
| `GITHUB_TOKEN` の権限不足で approve/merge が失敗する       | `pull_request_target` イベントでは `GITHUB_TOKEN` に十分な権限がある。リポジトリ設定で "Allow GitHub Actions to create and approve pull requests" が有効であることを確認する |
| Dependabot のメジャーバージョン更新が自動マージされる      | 現在の `dependabot.yml` は grouped update で、Dependabot はデフォルトで minor/patch のみ。メジャー更新が来る場合は `ignore` ルールで制御可能                                 |

## Validation

- [ ] GitHub リポジトリ設定で "Allow auto-merge" が有効になっている
- [ ] GitHub リポジトリ設定で "Allow GitHub Actions to create and approve pull requests" が有効になっている
- [ ] `main` の branch protection rule に required checks（lint, build, vendor, e2e）が設定されている
- [ ] Dependabot PR が作成されたとき、auto-approve + auto-merge が有効化される
- [ ] CI / E2E が全パスした後に自動マージされる
- [ ] CI が失敗した PR は自動マージされない
- [ ] 人間が作った PR は auto-merge の対象にならない
- [ ] vendor auto update PR も同様に auto-merge される

## Decisions

- **メジャーバージョン更新は手動レビュー** — 自動マージ対象は minor/patch のみ。Dependabot の grouped update はデフォルトで minor/patch なので現状維持。vendor auto update はメジャーを含むが、CI/E2E がゲートになる
- **`auto-merge.yml` に統一** — `vendor_auto_update.yml` 側には auto-merge ステップを入れず、`auto-merge.yml` で `github-actions[bot]` として一括処理する
- **"Require branches to be up to date" は無効** — 依存更新 PR が直列待ちになるのを避ける。同時マージで壊れるリスクは低く、万一の場合は `main` の CI で検知・revert で対応
