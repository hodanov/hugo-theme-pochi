# ページ遷移の演出と一覧のフェードインの削除

## Context

`2026-11-22_page-theme-motion.md` でページ遷移を Fade through にした。そのあと、遷移の瞬間に本文がずれる不具合を 2 つ直した。

- 旧本文のスナップショットが跳ねる
- 一覧に戻ったときにカードが浮き上がる

それでも「たまに本文が一瞬ずれる」という報告が残った。条件を絞り切れない動きを足し続けるより、読み物のブログでは内容がすぐに出る方を優先して、演出そのものをやめる。

## 変更

- PJAX のページ遷移は View Transition を使わず、その場で差し替える（`navigation.js`）
- クロスドキュメントの View Transitions（`@view-transition`）と、`head/head.html` の `pageswap` / `pagereveal` リスナーを削除する
- 一覧カードと関連記事の scroll-fade-in を削除する
  - `scroll-fade-in.js` と `.css`、`<body data-scroll-fade-in>`、example_site の `params.scrollFadeIn`
- 次のトークンを削除する：`--pochi-duration-page-out` / `-page-in` / `-xl`、`--pochi-ease-hold`
- テーマ切替のクロスフェード（`data-vt="theme"`）と、hover のモーションは残す。画面全体の色が変わるだけで、位置は動かないため

## サイト側

hodalog の `config/_default/params.yaml` にある `scrollFadeIn` は、テーマが読まなくなる。テーマを更新したら削除してよい。

## 検証

- E2E
  - PJAX 遷移で `startViewTransition` が呼ばれないこと
  - `@view-transition` が無いこと
  - 一覧のカードが一度も隠れないこと（`f-17`、`f-18`）
- VRT：カードの `will-change` が無くなったことで、文字のアンチエイリアスが変わる。そのため、一覧・記事・タグのベースラインを更新した。見た目の変更は無い
