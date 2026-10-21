# Post template

The house style from *How a GPU Works*, ready to reuse. Folders that start with `_` are not
published, so this template never shows up on the blog.

## Start a new post

```bash
./new-post.sh my-topic "My Topic: A Visual Tour" "One sentence on what readers will understand." "gpu, deep-learning"
quarto preview posts/my-topic/index.qmd
```

That copies this folder to `posts/my-topic/`, fills in the title, description, date and
categories, and leaves you a full article skeleton with every component.

## What you get for free (site-wide)

| | |
|---|---|
| Colours | light *morning paper* `#F4F2EC`, dark *evening ink* `#1F2124`, sage accent |
| Type | Source Serif 4 (body, headings with a soft shadow), Source Sans 3 (UI, captions), Source Code Pro (code) |
| Headings in dark mode | gold `#E0C27A`, subheadings silver `#C3C9D0` |
| Navigation | Substack-style contents rail on the left, Contents button on phones |
| Theme toggle | light/dark, remembered per reader |

These live in `_quarto.yml`, `distill-light.scss`, `distill-dark.scss`, `styles.css` and `toc-rail.html`.

## Article components (`assets/blog-components.css`)

| Component | Markup | Use it for |
|---|---|---|
| Animated figure | `<figure class="blog-fig" data-fig="id">` + `figs.js` | anything that changes over time |
| Numbers card | `<nav class="post-facts">` | key numbers; each tile links to the section that explains it |
| Nested diagram | `<figure class="post-stack">` | "A is made of B", plus a path row |
| Cheat sheet | `::: post-cheat` with `::: sw` / `::: hw` columns | definitions readers mix up |
| Takeaways | `::: post-tldr` | the 3–5 ideas to remember |
| Analogy | `::: callout-tip` titled *Think of it as* | one per section at most |
| Side fact | `::: callout-note` | true but non-essential details |

Wide figures: add `column-body-outset` to the figure's class.

## Animated figures (`assets/blog-figs.js`)

```js
BlogFigs.register('my-fig', {
  pace: 0.5,                 // 1 = real time; lower is slower
  controls(api) {            // optional
    api.chips('Mode', [{label: 'A', value: 'a'}, {label: 'B', value: 'b'}], v => { mode = v; });
    api.slider({label: 'Size', min: 1, max: 16, step: 1, value: 4, format: v => v + ' items'}, v => { size = v; });
  },
  draw(t, g) {               // t: seconds since start; draw on a 900 x 600 canvas
    g.box(40, 40, 200, 80, {fill: g.A(g.C.blue, .3), stroke: g.C.line, r: 6});
    g.txt('Hello', 60, 90, {size: 16, weight: 700});
  }
});
```

Every figure automatically gets play/pause, restart, 0.5×/1×/2× speed, a full-screen view
on phones (turned sideways), pausing while off-screen, reduced-motion support, and colours
that follow the light/dark toggle.

Helpers on `g`: `ctx`, `C` (`surface panel panel2 line ink muted blue green purple gold red`),
`box`, `txt`, `wrap`, `line`, `dot`, `A` (colour + alpha), `lerp`, `clamp`, `ease`, `hash`,
`along`, `fmt`, `W`, `H`.

Colour meaning used so far: blue = threads/work items, green = compute, purple = special
hardware, gold = memory/data, red = idle or waste.

## Writing checklist

- Open with a moment the reader recognises; close by returning to it.
- What / why / how in every section; connect each section to the previous one.
- One analogy world for the whole post.
- No term before it's introduced.
- About one event per second in animations at 1×; captions say what to watch for.
- Check light and dark, desktop and a 390px phone, before publishing.
