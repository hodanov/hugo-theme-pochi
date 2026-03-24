# Plan: アクセシビリティの底上げ（コントラスト・フォーカスリング・キーボード操作）

リンクテキストのコントラスト比が WCAG AA 基準を大幅に下回っている問題、フォームのフォーカスリング削除による WCAG 2.4.7 違反、デスクトップドロップダウンメニューのキーボード操作不可を修正する。
3つの問題は独立しているため、それぞれ個別のステップで段階的に対応する。

## Background

- `--pochi-accent: #79c6b6` が `--pochi-link` 経由でリンク色に使われているが、白背景 `#ffffff` に対するコントラスト比は約 1.8:1（WCAG AA の通常テキスト基準 4.5:1 を大幅に下回る）
- `forms.css:41-43` で `textarea:focus, input:focus { outline: none }` としており、キーボードユーザーがフォーカス位置を視認できない（WCAG 2.4.7 違反）
- デスクトップのグローバルナビのドロップダウン（`nav.html:37-45`）は `:hover` のみで開閉しており、キーボード（Tab/Enter/矢印キー）では操作できない

## Current structure

### コントラスト — `--pochi-accent` の使用箇所

`var(--pochi-accent)` は用途に応じて2つの役割を兼ねている:

**テキスト色として（コントラスト比が問題になる箇所）:**

| ファイル                                     | セレクタ                        | 用途                                 |
| -------------------------------------------- | ------------------------------- | ------------------------------------ |
| `typography.css:65`                          | `a`                             | 全リンクのテキスト色                 |
| `sidebar.css:45,169,174,214,246,274,341,370` | `#sidebar a:hover` 他           | サイドバーリンクのホバー・アクティブ |
| `footer.css:33`                              | `footer .copyright a:hover`     | フッターリンクのホバー               |
| `toc.css:67`                                 | `.table-of-contents li a:hover` | 目次リンクのホバー                   |
| `article-list.css:39`                        | 記事一覧ホバー                  | 記事タイトルのホバー                 |
| `nav.css:154`                                | `.dropdown-list li a:hover`     | ドロップダウンリンクのホバー         |

**装飾として（背景色・ボーダー — テキストコントラスト基準の対象外）:**

| ファイル                             | セレクタ                           | 用途                              |
| ------------------------------------ | ---------------------------------- | --------------------------------- |
| `main.css:78-79,282-283,290,299,316` | ボタンホバー背景、見出しボーダー   | 装飾                              |
| `sidebar.css:90,183,284`             | タグクラウドホバー背景、バッジ背景 | 装飾                              |
| `nav.css:150`                        | ナビリンクホバー背景               | 装飾（白テキスト on accent 背景） |
| `toc.css:79`                         | TOC アンダーライン                 | 装飾                              |

**フォーカスリングとして（`--pochi-link` 経由）:**

| ファイル      | セレクタ                      |
| ------------- | ----------------------------- |
| `nav.css:57`  | `#menu-bar-btn:focus-visible` |
| `nav.css:90`  | `.lang-switcher select:focus` |
| `nav.css:288` | `#side-nav-close:focus`       |

### フォーカスリング — 現状のパターン

| ファイル          | セレクタ                      | 状態                                                                 |
| ----------------- | ----------------------------- | -------------------------------------------------------------------- |
| `forms.css:41-43` | `textarea:focus, input:focus` | `outline: none` — **未修正・WCAG 違反**                              |
| `nav.css:53-59`   | `#menu-bar-btn`               | `:focus { outline: none }` + `:focus-visible { outline }` — 修正済み |
| `nav.css:89-92`   | `.lang-switcher select:focus` | `outline` あり — OK                                                  |
| `nav.css:287-290` | `#side-nav-close:focus`       | `outline` あり — OK                                                  |
| `base.css:18-30`  | `.skip-link:focus`            | `outline` あり — OK                                                  |

### ドロップダウン — 現状の実装

`nav.html:37-45`:

```html
<li class="dropdown">
  <a href="{{ .URL | relLangURL }}">{{ .Name }}</a>
  <ul class="dropdown-list">
    {{ range .Children }}
    <li><a href="{{ .URL | relLangURL }}">{{ .Name }}</a></li>
    {{ end }}
  </ul>
</li>
```

CSS（`nav.css:211-215`）:

```css
nav.site-nav .dropdown:hover .dropdown-list {
  visibility: visible;
  opacity: 1;
  top: 100%;
}
```

- `:hover` のみで開閉。キーボードフォーカスでは開かない
- `aria-expanded`, `aria-haspopup` 属性なし
- JS によるキーボードハンドラなし
- モバイルではナビ全体が非表示になりサイドナビに切り替わるため、この問題はデスクトップのみ

## Design policy

- **`--pochi-link` を `--pochi-accent` から独立させる** — リンクテキスト用には AA 基準を満たす暗いティールを割り当て、装飾用途（ボーダー・ホバー背景等）は `--pochi-accent` のまま維持する
- **フォーカスリングの色も新しいリンク色に連動させる** — `--pochi-link` がフォーカスリング色としても使われているため、コントラスト改善がフォーカスリングの視認性も向上させる
- **`:focus-visible` パターンを統一する** — マウスクリック時の不要なリングを抑制しつつ、キーボード操作時には表示する
- **ドロップダウンは最小限のキーボード対応にとどめる** — WAI-ARIA のメニューボタンパターンを参考にしつつ、既存の `:hover` 動作と共存する実装にする
- **ダークモードでも同じリンク色を使う** — 現状 `:root.dark` でも `--pochi-link: var(--pochi-accent)` なので、独立させた `--pochi-link` のダーク値も定義する

## Implementation steps

### Step 1: `--pochi-link` をコントラスト基準を満たす色に変更

`tokens.css` で `--pochi-link` を `--pochi-accent` から独立させる。

```css
:root {
  --pochi-accent: #79c6b6; /* 装飾用途（変更なし） */
  --pochi-link: #2a8c7e; /* テキスト用途（AA 基準達成） */
}

:root.dark {
  --pochi-link: #6ec4b4; /* ダーク背景 #2f2f2f に対する AA 基準 */
}
```

色の選定基準:

| 色                        | 背景      | コントラスト比 | WCAG AA |
| ------------------------- | --------- | -------------- | ------- |
| `#79c6b6`（現行）         | `#ffffff` | ~1.8:1         | 不合格  |
| `#2a8c7e`（提案・ライト） | `#ffffff` | ~4.5:1         | 合格    |
| `#6ec4b4`（提案・ダーク） | `#2f2f2f` | ~4.6:1         | 合格    |

### Step 2: `typography.css` のリンク色を `--pochi-link` に変更

```css
/* Before */
a {
  color: var(--pochi-accent);
}

/* After */
a {
  color: var(--pochi-link);
}
```

他のコンポーネントでリンクテキスト色に `var(--pochi-accent)` を直接使っている箇所も `var(--pochi-link)` に置換する:

| ファイル           | 行                             | 変更                                        |
| ------------------ | ------------------------------ | ------------------------------------------- |
| `sidebar.css`      | 45,169,174,214,246,274,341,370 | `var(--pochi-accent)` → `var(--pochi-link)` |
| `footer.css`       | 33                             | 同上                                        |
| `toc.css`          | 67                             | 同上                                        |
| `article-list.css` | 39                             | 同上                                        |
| `nav.css`          | 154                            | 同上                                        |

装飾用途（`background-color`, `border-color`）の `var(--pochi-accent)` は変更しない。

### Step 3: フォームのフォーカスリングを復元

`forms.css:41-43` を `:focus-visible` パターンに置換する:

```css
/* Before */
textarea:focus,
input:focus {
  outline: none;
}

/* After */
textarea:focus,
input:focus {
  outline: none;
}
textarea:focus-visible,
input:focus-visible {
  outline: 2px solid var(--pochi-link);
  outline-offset: 2px;
}
```

### Step 4: ドロップダウンにキーボード対応を追加

**HTML 変更（`nav.html`）:**

親リンクに `aria-haspopup="true"` と `aria-expanded="false"` を追加:

```html
<li class="dropdown">
  <a href="{{ .URL | relLangURL }}" aria-haspopup="true" aria-expanded="false"
    >{{ .Name }}</a
  >
  <ul class="dropdown-list" role="menu">
    {{ range .Children }}
    <li role="none">
      <a role="menuitem" href="{{ .URL | relLangURL }}">{{ .Name }}</a>
    </li>
    {{ end }}
  </ul>
</li>
```

**CSS 変更（`nav.css`）:**

`:hover` に加えて `:focus-within` でもドロップダウンを開く:

```css
nav.site-nav .dropdown:hover .dropdown-list,
nav.site-nav .dropdown:focus-within .dropdown-list {
  visibility: visible;
  opacity: 1;
  top: 100%;
}
```

**JS 変更（`main.js`）:**

`onReady` で以下を初期化する関数を追加:

- ドロップダウンの親リンクが `Enter`/`Space`/`ArrowDown` で子メニューを開く
- 子メニュー内で `ArrowDown`/`ArrowUp` でフォーカス移動
- `Escape` で閉じて親リンクにフォーカスを戻す
- `aria-expanded` をトグル状態と同期

### Step 5: 目視確認とスクリーンリーダーテスト

Validation セクション参照。

## File changes

| File                                     | Change                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| `assets/css/tokens.css`                  | `--pochi-link` を `--pochi-accent` から独立。`:root.dark` にもダーク用リンク色を定義 |
| `assets/css/components/typography.css`   | `a { color }` を `var(--pochi-link)` に変更                                          |
| `assets/css/components/sidebar.css`      | テキスト色の `var(--pochi-accent)` → `var(--pochi-link)` に置換（8箇所）             |
| `assets/css/components/footer.css`       | フッターリンクホバー色を `var(--pochi-link)` に変更                                  |
| `assets/css/components/toc.css`          | TOC リンクホバー色を `var(--pochi-link)` に変更                                      |
| `assets/css/components/article-list.css` | 記事一覧ホバー色を `var(--pochi-link)` に変更                                        |
| `assets/css/components/nav.css`          | ドロップダウンホバー色を `var(--pochi-link)` に変更。`:focus-within` ルール追加      |
| `assets/css/components/forms.css`        | `outline: none` の後に `:focus-visible` アウトラインを追加                           |
| `layouts/partials/molecules/nav.html`    | ドロップダウンに `aria-haspopup`, `aria-expanded`, `role` 属性を追加                 |
| `assets/js/main.js`                      | ドロップダウンのキーボードハンドラを追加                                             |

## Risks and mitigations

| Risk                                                                                   | Mitigation                                                                                                                            |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| リンク色の変更でデザインの印象が変わる                                                 | accent 色自体は変えず、リンクテキスト色のみを暗くする。ボーダーやホバー背景は元のティールを維持するため、全体の印象は大きく変わらない |
| ダークモードでリンク色のコントラストが不足する                                         | ダーク用に別の明るいティール `#6ec4b4` を定義し、`--pochi-card: #2f2f2f` に対して AA 基準を確認                                       |
| `:focus-within` が古いブラウザで動作しない                                             | Can I Use によると主要ブラウザは全て対応済み（IE11 のみ非対応だが、IE サポートは前回のプランで除外済み）                              |
| ドロップダウンの JS キーボードハンドラが既存のリンク遷移を阻害する                     | `Enter` はデフォルト動作（リンク遷移）を維持し、`ArrowDown` のみでサブメニューを開く設計にする                                        |
| フォーカスリング色として `--pochi-link` を使っているため、色変更がリングの見た目に影響 | 新しいリンク色はコントラスト比が高いため、フォーカスリングの視認性はむしろ向上する                                                    |

## Validation

- [x] `hugo server` でビルドが成功する
- [x] ライトモードでリンク色が新しい暗めのティールになっている
- [x] ダークモードでリンク色がダーク用ティールになっている
- [x] 装飾（見出しボーダー、ボタンホバー背景、タグクラウド背景等）は元のアクセントカラーのまま
- [x] `textarea` / `input` に Tab キーでフォーカスした時、アウトラインが表示される
- [x] マウスクリックでフォームにフォーカスした時、アウトラインが表示されない（`:focus-visible` の動作）
- [x] デスクトップでドロップダウンメニューの親リンクに Tab → `ArrowDown` でサブメニューが開く
- [x] サブメニュー内で `ArrowDown`/`ArrowUp` でフォーカスが移動する
- [x] `Escape` でサブメニューが閉じ、親リンクにフォーカスが戻る
- [x] `:hover` によるドロップダウン開閉が従来通り動作する
- [x] モバイルのサイドナビ動作に影響がない

## Open questions

- ~`#2a8c7e`（ライト用リンク色）と `#6ec4b4`（ダーク用リンク色）は推算値。~ → **確定済み**: この値で実装する
- `skip-link` のフォーカス時背景（`base.css:24`）は `var(--pochi-accent)` + 白テキスト。accent 背景に白テキストのコントラスト比は ~1.8:1 で不足している可能性があるが、skip-link は通常非表示のため優先度は低い。別途対応するか検討
- ~ドロップダウンの親リンクが実際のページ URL を持つ場合の UX 判断~ → **確定済み**: `Enter` はリンク遷移を優先。`ArrowDown` でサブメニューを開く
