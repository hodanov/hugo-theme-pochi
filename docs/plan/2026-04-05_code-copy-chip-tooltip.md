# Plan: Code copy chip tooltip

コードブロックのコピーボタンをクリックした際に、コピー完了を示すチップ（バッジ）を表示する。既存のシェアボタンチップとデザインを統一し、PJAX 言語切り替え時にチップテキストが正しい言語で表示されるようにする。

## Background

- コピーボタンのクリック時、アイコンが緑チェックに変わるだけでテキストによる視覚的フィードバックがなかった
- シェアボタンには既にコピー完了チップが実装されており、同等の UX をコードコピーにも提供したい
- 言語切り替え（PJAX ナビゲーション）後、`<body>` の i18n データ属性が更新されない問題が存在した

## Current structure

- `assets/js/code-copy.js` — コピーボタンの注入とクリックハンドラ。`document.body.dataset.codeCopiedLabel` から i18n テキストを取得
- `assets/css/components/code.css` — コピーボタンのスタイル（`.code-copy-button`, `.code-copy-button--copied`）
- `assets/js/navigation.js` — PJAX ナビゲーション。`swapContent()` は `.main-content` のみ差し替え、`<body>` タグは対象外
- `layouts/_default/baseof.html` — `<body>` に `data-code-copy-label`, `data-code-copied-label`, `data-code-copy-failed-label` を設定
- `assets/js/share-button.js` + `layouts/partials/molecules/share_button.html` — シェアボタンは `data-feedback-copied` をボタン要素自体に持つためコンテンツスワップで自動更新される
- `assets/css/components/sidebar.css` — シェアボタンチップのスタイル（`::after` 擬似要素、`--pochi-accent` / `--pochi-on-accent` カラー）

## Design policy

- チップテキストは既存の i18n キー `code_copied`（ja: "コピーしました" / en: "Copied!"）を流用し、新規キーは追加しない
- チップは JS で `<span class="code-copy-chip">` を生成・注入する方式（シェアボタンの CSS `::after` + `content: attr()` 方式とは異なるが、コードコピーは `body.dataset` 参照のため DOM 要素が必要）
- チップのビジュアルはシェアボタンチップと統一する（`--pochi-accent` / `--pochi-on-accent`、`box-shadow`、即時表示）
- 多重クリック時のチップ重複を防止する
- `prefers-reduced-motion` はアニメーション削除により自然に対応済み
- PJAX 言語切り替え時の i18n 同期は `navigation.js` に `syncBodyI18n()` を追加して対応

## Implementation steps

1. `code-copy.js` のコピー成功ブロックにチップ生成ロジックを追加（`.code-copy-chip` 要素を `pre` に追加、`FEEDBACK_DURATION` 後に削除、多重クリック防止ガード付き）
2. `code.css` に `.code-copy-chip` スタイルを追加（ボタン左隣に配置）
3. `navigation.js` に `syncBodyI18n()` 関数を追加し、`navigateTo()` 内で `syncHead()` の直後に呼び出す
4. `f-15-code-copy.spec.js` にチップ表示・消滅・多重クリック防止の E2E テスト 3 件を追加
5. `f-11-language-switcher.spec.js` に言語切り替え後の body i18n 属性更新テストを追加
6. チップのビジュアルをシェアボタンと統一（`--pochi-accent` カラー、`box-shadow`、フェードインアニメーション削除）

## File changes

| File                                       | Change                                                                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `assets/js/code-copy.js`                   | コピー成功時に `.code-copy-chip` 要素を生成・追加・自動削除するロジックを追加                                              |
| `assets/css/components/code.css`           | `.code-copy-chip` スタイル追加。`--pochi-accent` / `--pochi-on-accent`、`box-shadow: var(--pochi-shadow-2)`、`z-index: 10` |
| `assets/js/navigation.js`                  | `syncBodyI18n()` 関数を追加。`codeCopyLabel` / `codeCopiedLabel` / `codeCopyFailedLabel` を次ドキュメントから同期          |
| `tests/e2e/f-15-code-copy.spec.js`         | チップ表示・消滅・多重クリック防止の 3 テストを追加                                                                        |
| `tests/e2e/f-11-language-switcher.spec.js` | 言語切り替え後に `body.dataset.codeCopiedLabel` が更新されることを検証するテストを追加                                     |

## Risks and mitigations

| Risk                                                                                              | Mitigation                                                                                    |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 将来 `<body>` に新しい i18n 属性が追加された場合、`syncBodyI18n()` の `keys` 配列に手動追加が必要 | コメントで意図を明記。属性追加時に気づけるようテストで検証                                    |
| シェアボタンチップは CSS `::after` 擬似要素、コードコピーチップは JS DOM 要素と実装方式が異なる   | コードコピーは `body.dataset` からテキストを取得するため DOM 要素が必要。ビジュアルは統一済み |

## Validation

- [x] `npx playwright test tests/e2e/f-15-code-copy.spec.js` — チップ表示・消滅・多重クリック防止テストがパス
- [x] `npx playwright test tests/e2e/f-11-language-switcher.spec.js` — 言語切り替え後の i18n 属性更新テストがパス
- [x] ブラウザで目視確認: コードコピーチップがシェアボタンチップと同じアクセントカラー + 影で表示されること
- [x] ブラウザで目視確認: 日本語 → 英語切り替え後にチップテキストが正しい言語になること
