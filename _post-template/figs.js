/* figs.js · this post's animated figures. Each one matches a
   <figure class="blog-fig" data-fig="..."> in index.qmd.
   Canvas is 900 x 600 logical units. Colours: g.C.ink / muted / line / panel / panel2
   and the accents g.C.blue / green / purple / gold / red (they follow the theme).
   Pace: aim for about one event per second at 1x, so readers can follow. */

// Example: work items flowing through lanes. Delete or replace.
(function () {
  let lanes = 4;

  BlogFigs.register('example', {
    pace: 0.6,
    controls(api) {
      api.chips('Lanes', [
        { label: '1 lane', value: 1 },
        { label: '4 lanes', value: 4 },
        { label: '8 lanes', value: 8 }
      ], v => { lanes = v; }, 1);
    },
    draw(t, g) {
      const { C, box, txt, dot, A, lerp, ease } = g;
      txt('Work queue', 40, 52, { size: 15, weight: 700 });
      txt(lanes + (lanes === 1 ? ' lane' : ' lanes') + ' working in parallel', 860, 52, { size: 13, color: C.muted, align: 'right' });

      const items = 32, per = 1.2;                    // one round of work every 1.2 s
      t = t % (Math.ceil(items / lanes) * per + 2);    // loop, with a 2 s pause at the end
      const round = Math.floor(t / per), f = (t % per) / per;
      const done = Math.min(items, round * lanes);

      // queue of items
      for (let i = 0; i < items; i++) {
        const x = 40 + (i % 16) * 52, y = 80 + Math.floor(i / 16) * 52;
        const isDone = i < done, active = !isDone && i < done + lanes && done < items;
        box(x, y, 44, 44, { fill: isDone ? A(C.green, .55) : active ? A(C.blue, .35 + .4 * f) : A(C.line, .45), r: 6 });
      }

      // lanes
      const top = 230, lh = Math.min(40, 300 / lanes);
      for (let l = 0; l < lanes; l++) {
        const y = top + l * (lh + 6);
        box(40, y, 820, lh, { fill: A(C.panel, 1), stroke: C.line, r: 6 });
        txt('lane ' + l, 52, y + lh / 2 + 5, { size: 12, color: C.muted });
        if (done < items) dot(lerp(130, 840, ease(f)), y + lh / 2, Math.min(10, lh / 3), C.blue);
      }

      txt(`${done} / ${items} done after ${Math.min(round, Math.ceil(items / lanes))} rounds`, 40, 575, { size: 14, color: C.ink });
      if (done >= items) txt('✓ finished', 860, 575, { size: 14, weight: 700, color: C.green, align: 'right' });
    }
  });
})();
