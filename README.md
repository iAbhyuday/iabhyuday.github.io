# iabhyuday.github.io

Source for [iabhyuday.github.io](https://iabhyuday.github.io), a blog of visual, first-principles explanations of GPUs and deep learning. Built with [Quarto](https://quarto.org).

## Preview locally

```bash
quarto preview
```

## Write a new post

```bash
./new-post.sh my-topic "My Topic: A Visual Tour" "One sentence on what readers will understand." "gpu, deep-learning"
quarto preview posts/my-topic/index.qmd
```

This copies `_post-template/` into `posts/my-topic/`. See [`_post-template/README.md`](_post-template/README.md) for the article components, animated figures and the writing checklist.

## Publish

Merge to `main`. The **Quarto Publish** GitHub Action renders the site and pushes it to the `gh-pages` branch, which GitHub Pages serves. Pages caches assets for about 10 minutes, so do a hard refresh if a change doesn't show.

Posts with executable code use `freeze: true`, so their results are stored in `_freeze/` and the Action doesn't need Python. Re-render such a post locally and commit `_freeze/` when you change its code.

## Layout

| Path | What it is |
|---|---|
| `_quarto.yml` | site config: navbar, footer, theme, social cards |
| `distill-light.scss`, `distill-dark.scss`, `styles.css` | the theme (colours, fonts, typography) |
| `toc-rail.html` | the contents rail on the left of posts |
| `assets/` | shared figure engine and article components |
| `posts/` | one folder per post |
| `about.qmd`, `404.qmd`, `index.qmd` | About, not-found and home pages |
