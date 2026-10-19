// Pages audited by the a11y suite (axe and the landmark/heading outline).
// Ids are part of the baseline keys and snapshot names; renaming one means
// re-running `npm run a11y:update`.
module.exports = [
  { id: "home", path: "/" },
  { id: "home-page-2", path: "/page/2/" },
  { id: "post-toc", path: "/posts/p-03-with-toc/" },
  { id: "post-no-toc", path: "/posts/p-04-no-toc/" },
  { id: "about", path: "/page/about/" },
  {
    id: "search",
    path: "/search/?q=TOC",
    waitFor: "#search-results .post-row",
  },
  { id: "archives", path: "/archives/" },
  { id: "tags", path: "/tags/" },
  { id: "tag", path: "/tags/alpha/" },
  { id: "404", path: "/404.html" },
  { id: "ja-home", path: "/ja/" },
  { id: "ja-post", path: "/ja/posts/p-01-sample-1/" },
  { id: "styleguide", path: "/ja/page/styleguide/" },
];
