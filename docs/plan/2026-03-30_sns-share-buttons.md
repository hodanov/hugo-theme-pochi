# Plan: はてなブックマークシェアボタンの追加

記事のシェアボタンにはてなブックマークへの直接シェアリンクを追加する。intent URL ベースで外部ライブラリ不要。日本語の技術ブログで事実上の標準であるはてブボタンを、既存の URL コピーボタンと並べて配置する。

## Background

- 現在のシェア機能は URL コピー（デスクトップ）と Web Share API（モバイル）のみ
- はてなブックマークは日本語の技術ブログでは必須級の共有手段
- `docs/plan/2026-03-29_modern-blog-feature-ideas.md` の Feature #4 として整理済み

## Current structure

- `layouts/partials/molecules/share_button.html` — 単一の URL コピーボタン
- `assets/js/share-button.js` — クリックハンドラ（モバイル: Web Share API / デスクトップ: clipboard copy）
- `assets/js/clipboard.js` — `window.__pochiClipboard.copy()` ユーティリティ
- `assets/css/components/sidebar.css` — デスクトップ左サイドバー + モバイルアクションバーのスタイル
- `assets/icons/share.svg` — シェアアイコン SVG
- `i18n/ja.toml`, `i18n/en.toml` — `copy_url`, `url_copied`, `copy_failed` の翻訳キー
- `layouts/posts/single.html` — シェアボタンの配置（左サイドバー + モバイルアクションバー）
- `tests/e2e/f-09-share-button.spec.js` — 既存の E2E テスト

## Design policy

- **intent URL ベース**: 外部 SDK やウィジェットスクリプトを使わない。`<a>` タグで intent URL にリンクするだけ
- **既存の URL コピーボタンは維持**: コピーボタンは残し、はてブボタンを追加する形にする
- **モバイルは Web Share API を優先**: モバイルでは既存の Web Share API（OS ネイティブの共有シート）が最適なため、はてブボタンはデスクトップサイドバーのみに表示する
- **新規ウィンドウで開く**: `target="_blank" rel="noopener noreferrer"` で開く
- **アクセシビリティ**: `title` 属性と `aria-label` を付与。アイコンは装飾的なので `aria-hidden="true"`

## Implementation steps

1. **SVG アイコンの追加**: `assets/icons/hatena-bookmark.svg` にはてなブックマークアイコンを追加
2. **i18n キーの追加**: `i18n/ja.toml`, `i18n/en.toml` にはてブシェアのラベル文字列を追加
3. **share_button.html の拡張**: はてブリンクボタンを URL コピーボタンの下に追加
4. **CSS の追加**: 左サイドバーでのはてブボタンスタイル（既存の `.share-btn` と統一感のあるデザイン）
5. **E2E テストの更新**: はてブボタンの表示・リンク先を検証するテストを追加

## Intent URL 仕様

| サービス           | Intent URL                                    | 備考                                                                        |
| ------------------ | --------------------------------------------- | --------------------------------------------------------------------------- |
| はてなブックマーク | `https://b.hatena.ne.jp/entry/s/{host}{path}` | HTTPS URL の場合 `entry/s/` + ホスト + パス。HTTP の場合は `entry/` + URL。 |

## File changes

| File                                           | Change                                           |
| ---------------------------------------------- | ------------------------------------------------ |
| `assets/icons/hatena-bookmark.svg`             | 新規: はてなブックマーク (B!) SVG シンボル       |
| `i18n/ja.toml`                                 | `share_on_hatena` キー追加                       |
| `i18n/en.toml`                                 | 同上（英語）                                     |
| `layouts/partials/molecules/share_button.html` | はてブリンクボタンの追加                         |
| `assets/css/components/sidebar.css`            | `.sns-share-link` のスタイル追加（サイドバー用） |
| `tests/e2e/f-09-share-button.spec.js`          | はてブボタンの表示・href 検証テスト追加          |

## UI 構成

### デスクトップ左サイドバー（縦並び）

```
[♥] いいね (既存)
[↗] URL コピー (既存)
[B!] はてブ (新規)
```

### モバイルアクションバー

```
[♥ いいね] [↗ シェア] [↑]
```

- モバイルは変更なし（Web Share API のネイティブ共有シートが最適）

## share_button.html 構成イメージ

```html
<div class="share-sidebar" data-share-root>
  <!-- 既存の URL コピーボタン -->
  <button class="share-btn" ...>...</button>

  <!-- はてなブックマーク（デスクトップサイドバーのみ CSS で表示） -->
  <a class="sns-share-link"
     href="https://b.hatena.ne.jp/entry/s/{{ .Permalink | replaceRE "^https?://" "" }}"
     target="_blank" rel="noopener noreferrer"
     title="{{ T "share_on_hatena" }}" aria-label="{{ T "share_on_hatena" }}">
    {{ partial "atoms/icon.html" (dict "id" "icon-hatena-bookmark") }}
  </a>
</div>
```

- モバイルアクションバー内では CSS で `.sns-share-link` を `display: none` にする

## Risks and mitigations

| Risk                                         | Mitigation                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| はてブ intent URL の仕様変更                 | URL 構造がシンプルなため変更リスクは低い。変更時は URL パターンの修正のみで対応可能 |
| モバイルでのはてブボタン非表示が分かりにくい | Web Share API で OS の共有シートが開けば全 SNS に対応済み                           |

## Validation

- [x] デスクトップサイドバーに URL コピー + はてブボタンが表示される
- [x] はてブボタンのリンク先が正しい intent URL になっている
- [x] はてブボタンクリックで新規タブが開く
- [x] モバイルアクションバーではてブボタンが非表示（既存の Web Share API 動作を維持）
- [x] 既存の URL コピー機能が正常に動作する（デグレなし）
- [x] ダークモードでアイコンが適切に表示される（`currentColor` 使用）
- [x] E2E テストが全件パスする
- [x] アクセシビリティ: `aria-label` でボタンの目的がスクリーンリーダーに伝わる

## Open questions

- 将来的に X (Twitter)、Pocket、LINE など他の SNS ボタンも追加するか
- 追加時の拡張性を考慮した CSS クラス設計（現時点では `.sns-share-link` で汎用的に設計）
