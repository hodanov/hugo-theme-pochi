# Plan: 不要コードの除去（Bootstrap Reboot → modern-normalize・ベンダープレフィックス・calc バグ修正）

Bootstrap Reboot（608行）を modern-normalize に置き換え、modern-normalize がカバーしないリセットを `base.css` に追加する。
合わせて古いベンダープレフィックスを削除し、hero.css の calc バグを修正する。
バンドルサイズの削減と CSS の保守性向上が目的。

## Background

- `reboot.scss` は Bootstrap Reboot v5.3.0-alpha3 を丸ごと含んでおり、`--bs-*` カスタムプロパティ 181 件が pochi CSS からは一切参照されていない
- Reboot は手動コピー（スナップショット）で管理されており、バージョン追跡がない
- pochi テーマは JS ライブラリ（fuse.js, mark.js）を `npm + vendor-sync.js` で管理する仕組みを持っている。modern-normalize も同じ仕組みで管理する
- `sidebar.css` に古い Flexbox ベンダープレフィックスが残存
- `hero.css` に `calc(61.8 - 4rem)` という単位なしの無効な calc がある（`vh` の付け忘れ）
- IE/Edge ハック（`@supports (-ms-ime-align: auto)` 等）は dark mode consolidation PR で削除済み

## Current structure

### vendor-sync の既存アーキテクチャ

```
package.json (devDependencies)
  ↓ npm install
node_modules/
  ↓ npm run vendor:sync (scripts/vendor-sync.js)
assets/js/vendor/fuse.js
assets/js/vendor/mark.js
  + VENDOR.lock.json (sha256 + version)
  ↓ npm run vendor:verify (CI)
整合性チェック
```

- `vendor-sync.js` は `specs` 配列にエントリを追加するだけで新しいライブラリに対応可能
- `vendor_auto_update.yml` で毎週月曜に自動アップグレード PR を作成

### reboot.scss の構成（608行）

| 行範囲  | 内容                                           | pochi での使用状況                                    |
| ------- | ---------------------------------------------- | ----------------------------------------------------- |
| 1-185   | `--bs-*` カスタムプロパティ定義                | **未使用** — 参照ゼロ                                 |
| 187-197 | `box-sizing`, `scroll-behavior`                | **必要** — modern-normalize でカバー                  |
| 199-370 | `body`, `h1-h6`, `a` 等の opinionated スタイル | `base.css` / `typography.css` で上書き済み — **不要** |
| 372-608 | フォーム正規化、テーブル、`[hidden]` 等        | **一部有用** — modern-normalize でカバー              |

### modern-normalize の特徴

- ~180 行。ブラウザ間の差異をノーマライズ（リセットではない）
- `box-sizing: border-box` は含まない → `base.css` に追加が必要
- `[hidden] { display: none !important }` は含まない → 同上
- `sub/sup`, `hr`, `abbr` の正規化を含む → Open questions が解消
- Chrome / Firefox / Safari 最新 2 版が対象
- sindresorhus がメンテナンス（npm weekly downloads: ~1.5M）

### ベンダープレフィックスの分布

| ファイル              | プレフィックス                                                                                 | 内容                                |
| --------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------- |
| `sidebar.css:51-57`   | `-webkit-box`, `-moz-box`, `-ms-flexbox`, `-webkit-flex`, `-webkit-flex-flow`, `-ms-flex-flow` | Flexbox の古い構文                  |
| `sidebar.css:6`       | `-webkit-sticky`                                                                               | `position: sticky` のプレフィックス |
| `main.css:114-116`    | `-webkit-transition`, `-webkit-backface-visibility`                                            | transition / backface-visibility    |
| `main.css:403-404`    | `-ms-transform`, `-webkit-transform`                                                           | transform                           |
| `main.css:12`         | `-webkit-overflow-scrolling: touch`                                                            | iOS の慣性スクロール（非推奨）      |
| `base.css:3`          | `-webkit-overflow-scrolling: touch`                                                            | 同上（重複）                        |
| `nav.css:38,76,272`   | `-webkit-appearance` + `-moz-appearance`                                                       | appearance                          |
| `nav.css:144,198`     | `-webkit-transition`                                                                           | transition                          |
| `media.css:32`        | `-webkit-transition`                                                                           | transition                          |
| `hero.css:5,20,49,55` | `-webkit-calc`                                                                                 | calc のプレフィックス               |
| `forms.css:30-31`     | `-webkit-appearance` + `-moz-appearance`                                                       | appearance                          |
| `lists.css:33`        | `::-webkit-details-marker`                                                                     | details/summary の矢印              |

### hero.css の calc バグ

```css
.parallax-container {
  height: 61.8vh; /* 有効（フォールバック） */
  height: -webkit-calc(61.8 - 4rem); /* 無効 — 単位なし */
  height: calc(61.8 - 4rem); /* 無効 — 単位なし */
}
```

1280px 以下の MQ 内（`calc(40vh - 4rem)`）は正しい。初期定義の `61.8` にだけ `vh` が抜けている。

## Design policy

- **modern-normalize を vendor-sync 経由で管理する** — npm devDependencies に追加し、`vendor-sync.js` で `assets/css/vendor/modern-normalize.css` にコピー。バージョン・ハッシュは `VENDOR.lock.json` で追跡
- **modern-normalize がカバーしないリセットは `base.css` に追加する** — `box-sizing: border-box` と `[hidden] { display: none !important }` の 2 点
- **ベンダープレフィックスは「現行ブラウザで必要なもの」だけ残す** — `appearance` のプレフィックスは Safari 14 以前で必要だが、Flexbox / transition / transform / calc のプレフィックスは全て不要
- **`-webkit-overflow-scrolling: touch` は削除する** — iOS 13 以降は不要
- **`::-webkit-details-marker` は残す** — Chrome のデフォルト矢印を消す実用的なルール
- **hero.css の calc バグは単位を追加して修正する** — `-webkit-calc` 行は削除

## Implementation steps

1. **modern-normalize を npm + vendor-sync で導入する**
2. **`reboot.scss` を削除し、バンドル設定を更新する**
3. **`base.css` に不足するリセットを追加する**
4. **ベンダープレフィックスを整理する**
5. **hero.css の calc バグを修正する**
6. **CI 関連の更新**
7. **ビルド確認・lint**

### Step 1: modern-normalize を npm + vendor-sync で導入

```bash
npm install modern-normalize --save-dev
```

`scripts/vendor-sync.js` の `specs` 配列に CSS 用エントリを追加:

```js
{
  name: "modern-normalize",
  version: (pkg.devDependencies && pkg.devDependencies["modern-normalize"]) || "",
  src: path.join(projectRoot, "node_modules", "modern-normalize", "modern-normalize.css"),
  dest: path.join(projectRoot, "assets", "css", "vendor", "modern-normalize.css"),
  header: (v) =>
    `/* vendored: modern-normalize ${v} | https://github.com/sindresorhus/modern-normalize | MIT */\n`,
},
```

`npm run vendor:sync` を実行して `assets/css/vendor/modern-normalize.css` を生成し、`VENDOR.lock.json` を更新。

### Step 2: reboot.scss を削除し、バンドル設定を更新

- `assets/scss/reboot.scss` を削除
- `layouts/partials/core/resources_css.html` を更新:

```diff
-{{ $reboot := resources.Get "scss/reboot.scss" | css.Sass }}
+{{ $normalize := resources.Get "css/vendor/modern-normalize.css" }}
```

`$bundledCss` の slice で `$reboot` → `$normalize` に差し替え（tokens の直後の位置を維持）。

### Step 3: base.css に不足するリセットを追加

modern-normalize がカバーしない項目を `base.css` に追加:

```css
/* Box model reset (not included in modern-normalize) */
*,
*::before,
*::after {
  box-sizing: border-box;
}

/* Hidden attribute */
[hidden] {
  display: none !important;
}
```

既存の `-webkit-overflow-scrolling: touch` はこのステップで削除。

### Step 4: ベンダープレフィックスの整理

**削除するプレフィックス:**

| ファイル      | 行          | 削除内容                                                                                       | 理由                               |
| ------------- | ----------- | ---------------------------------------------------------------------------------------------- | ---------------------------------- |
| `sidebar.css` | 51-54,56-57 | `-webkit-box`, `-moz-box`, `-ms-flexbox`, `-webkit-flex`, `-webkit-flex-flow`, `-ms-flex-flow` | Flexbox は IE11 以外で prefix 不要 |
| `main.css`    | 12          | `-webkit-overflow-scrolling: touch`                                                            | iOS 13+ で不要                     |
| `main.css`    | 114         | `-webkit-transition`                                                                           | prefix 不要                        |
| `main.css`    | 116         | `-webkit-backface-visibility`                                                                  | prefix 不要                        |
| `main.css`    | 403-404     | `-ms-transform`, `-webkit-transform`                                                           | prefix 不要                        |
| `base.css`    | 3           | `-webkit-overflow-scrolling: touch`                                                            | iOS 13+ で不要                     |
| `nav.css`     | 144,198     | `-webkit-transition`                                                                           | prefix 不要                        |
| `media.css`   | 32          | `-webkit-transition`                                                                           | prefix 不要                        |
| `hero.css`    | 5,20,49,55  | `-webkit-calc(...)`                                                                            | calc の prefix 不要                |

**残すプレフィックス:**

| ファイル      | 行        | 内容                                    | 理由                          |
| ------------- | --------- | --------------------------------------- | ----------------------------- |
| `nav.css`     | 38,76,272 | `-webkit-appearance`                    | Safari 14 以前で必要          |
| `forms.css`   | 30-31     | `-webkit-appearance`, `-moz-appearance` | 同上                          |
| `sidebar.css` | 6         | `-webkit-sticky`                        | Safari 14 以前で必要          |
| `lists.css`   | 33        | `::-webkit-details-marker`              | Chrome のデフォルト矢印を消す |

### Step 5: hero.css の calc バグ修正

```css
/* Before */
height: 61.8vh;
height: -webkit-calc(61.8 - 4rem);
height: calc(61.8 - 4rem);

/* After */
height: calc(61.8vh - 4rem);
```

`-webkit-calc` 行を削除し、`calc` 行の `61.8` → `61.8vh` に修正。フォールバック行（`61.8vh`）も不要になるため削除。

同様に picture 要素（hero.css:19-21）も修正。1280px MQ 内（hero.css:48-50,54-56）は既に正しい `calc(40vh - 4rem)` だが、`-webkit-calc` 行は削除。

### Step 6: CI 関連の更新

- `vendor_auto_update.yml` の PR body にmodernに-normalize を追記（自動アップグレード対象に含まれるため）
- `npm run vendor:verify` は既存のまま動作する（specs に追加済みのため）

### Step 7: ビルド確認・lint

Validation セクション参照。

## File changes

| File                                       | Change                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `package.json`                             | `modern-normalize` を devDependencies に追加                                                                                   |
| `scripts/vendor-sync.js`                   | CSS 用の spec エントリを追加                                                                                                   |
| `assets/css/vendor/modern-normalize.css`   | **新規** — vendor-sync で生成                                                                                                  |
| `VENDOR.lock.json`                         | modern-normalize のハッシュ・バージョンが追記される（自動）                                                                    |
| `assets/scss/reboot.scss`                  | **ファイル削除**                                                                                                               |
| `layouts/partials/core/resources_css.html` | `$reboot` → `$normalize` に差し替え                                                                                            |
| `assets/css/base.css`                      | `box-sizing: border-box`, `[hidden]` を追加。`-webkit-overflow-scrolling` を削除                                               |
| `assets/css/components/sidebar.css`        | 古い Flexbox プレフィックス（6行）を削除                                                                                       |
| `assets/css/main.css`                      | `-webkit-transition`, `-webkit-backface-visibility`, `-ms-transform`, `-webkit-transform`, `-webkit-overflow-scrolling` を削除 |
| `assets/css/components/nav.css`            | `-webkit-transition`（2箇所）を削除                                                                                            |
| `assets/css/components/media.css`          | `-webkit-transition` を削除                                                                                                    |
| `assets/css/components/hero.css`           | `-webkit-calc` 行を削除、`calc(61.8 - 4rem)` → `calc(61.8vh - 4rem)` に修正                                                    |
| `.github/workflows/vendor_auto_update.yml` | PR body に modern-normalize を追記                                                                                             |

## Risks and mitigations

| Risk                                                                           | Mitigation                                                                                                                                                            |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| modern-normalize と pochi CSS の間でルールが競合し、意図しない見た目になる     | modern-normalize はノーマライズ（差異を揃える）であり、opinionated なスタイルを適用しない。バンドル順で pochi CSS が後に来るため、仮に競合しても pochi 側が優先される |
| modern-normalize のバージョンアップで破壊的変更が入る                          | `VENDOR.lock.json` でハッシュ固定。`vendor_auto_update.yml` の自動 PR でレビュー可能                                                                                  |
| Safari 14 以前で Flexbox レイアウトが崩れる                                    | Safari 14 は 2020年リリースで現在のシェアは極小。`-webkit-sticky` と `-webkit-appearance` は残す                                                                      |
| hero の高さがナビバー分だけ変わる（calc バグ修正による正しい動作）             | 修正後は `calc(61.8vh - 4rem)` が有効になり、ナビバー分を正しく引く。意図した動作になる                                                                               |
| `assets/css/vendor/` ディレクトリが新規。既存の `assets/js/vendor/` との整合性 | 同じ vendor-sync.js で管理されるため、一貫性は保たれる                                                                                                                |

## Validation

- [x] `npm run vendor:sync` が成功し、`assets/css/vendor/modern-normalize.css` が生成される
- [x] `npm run vendor:verify` がパスする
- [x] `hugo server` でビルドが成功する
- [x] 記事一覧・記事詳細・カテゴリページ・検索ページの表示が崩れない
- [x] フォーム要素（input, textarea, select, button）の表示が正常
- [x] テーブルの表示が正常
- [x] ヒーロー画像の高さがナビバー分を引いた値になっている
- [x] Flexbox レイアウト（プロフィール欄）が正常
- [x] Chrome / Safari / Firefox で目視確認
- [x] prettier パス

## Open questions

- `vendor_auto_update.yml` の ncu フィルタに `modern-normalize` を追加するか、それとも JS と CSS で別ワークフローにするか
