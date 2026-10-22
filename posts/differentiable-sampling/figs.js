/* figs.js · animated figures for "Gumbel-Softmax".
   Canvas is 900 x 600. Colours: A = blue, B = green, C = purple (one per category),
   red = Gumbel noise, gold = the chosen category. */
(function () {
  const P = [0.6, 0.3, 0.1], NAMES = ['A', 'B', 'C'];
  const LOGP = P.map(Math.log);
  const catCol = (C, i) => [C.blue, C.green, C.purple][i];
  // deterministic randomness, so a figure replays identically from t
  const H = (g, k) => g.clamp(g.hash((k * 2654435761) >>> 0 ^ 0x9e3779b9), 1e-6, 1 - 1e-6);
  const gumbel = (g, k) => -Math.log(-Math.log(H(g, k)));
  const softmax = (z, tau) => { const m = Math.max(...z); const e = z.map(v => Math.exp((v - m) / tau)); const s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); };
  const argmax = z => z.reduce((bi, v, i) => v > z[bi] ? i : bi, 0);
  const pct = v => Math.round(v * 100) + '%';
  function polyline(g, pts, col, lw, dash) {
    const c = g.ctx; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.strokeStyle = col; c.lineWidth = lw || 2; if (dash) c.setLineDash(dash); c.stroke(); c.setLineDash([]);
  }
  // how many samples have been drawn by time t: a few slowly, then faster and faster
  function schedule(t, slowN, slowDur, maxN) {
    const slowEnd = slowN * slowDur;
    if (t < slowEnd) return { n: Math.floor(t / slowDur), f: (t % slowDur) / slowDur, slow: true };
    const u = t - slowEnd;
    return { n: Math.min(maxN, slowN + Math.floor(u * u * 7)), f: 1, slow: false };
  }
  // histogram of picks against the target probabilities
  function histogram(g, x0, y0, w, h, counts, n, title) {
    const { C, box, txt, line, A } = g;
    txt(title, x0, y0 - h - 34, { size: 14, weight: 700 });
    txt(n + (n === 1 ? ' sample' : ' samples'), x0, y0 - h - 16, { size: 12.5, color: C.muted });
    const bw = w / 3 - 24;
    line(x0, y0, x0 + w, y0, C.line, 1);
    for (let i = 0; i < 3; i++) {
      const x = x0 + i * (w / 3) + 12, fr = n ? counts[i] / n : 0;
      box(x, y0 - fr * h, bw, fr * h, { fill: A(catCol(C, i), .75), r: 3 });
      const ty = y0 - P[i] * h; line(x - 6, ty, x + bw + 6, ty, C.ink, 1.5, [5, 4]);
      txt(NAMES[i], x + bw / 2, y0 + 20, { size: 14, weight: 700, align: 'center' });
      txt(n ? pct(fr) : '–', x + bw / 2, Math.min(ty, y0 - fr * h) - 10, { size: 13, align: 'center', weight: 600, color: catCol(C, i) });
    }
    txt('- - -  target p', x0 + w, y0 + 42, { size: 12, color: C.muted, align: 'right' });
  }

  // ---------- Figure 1: what sampling means ----------
  let mode1 = 'sample';
  BlogFigs.register('sampling', {
    pace: 1,
    controls(api) {
      api.chips('Pick by', [{ label: 'sampling', value: 'sample' }, { label: 'argmax', value: 'argmax' }], v => { mode1 = v; });
    },
    draw(t, g) {
      const { C, box, txt, line, dot, A, ease } = g;
      t = t % 30;
      const s = schedule(t, 8, 1.3, 1000);
      const pickOf = k => { if (mode1 === 'argmax') return 0; const u = H(g, k + 1); return u < P[0] ? 0 : u < P[0] + P[1] ? 1 : 2; };
      const uOf = k => mode1 === 'argmax' ? null : H(g, k + 1);
      const counted = s.n + (s.slow && s.f > .55 ? 1 : 0);
      const counts = [0, 0, 0]; for (let k = 0; k < counted; k++) counts[pickOf(k)]++;

      txt('p = [0.6, 0.3, 0.1]', 40, 50, { size: 16, weight: 700 });
      txt(mode1 === 'sample' ? 'draw u from Uniform(0, 1), pick the category its segment covers' : 'argmax: always pick the most likely category', 40, 72, { size: 13, color: C.muted });

      // the unit interval split by p
      const bx = 60, by = 150, bw = 780, bh = 44;
      let acc = 0; const cur = s.slow ? s.n : -1, curPick = cur >= 0 ? pickOf(cur) : -1;
      for (let i = 0; i < 3; i++) {
        const x = bx + acc * bw, w = P[i] * bw, lit = s.slow && s.f > .45 && curPick === i;
        box(x + 1, by, w - 2, bh, { fill: A(catCol(C, i), lit ? .9 : .35), r: 4 });
        if (lit) box(x - 1, by - 2, w + 2, bh + 4, { stroke: C.gold, lw: 2.5, r: 5 });
        txt(NAMES[i] + '  ' + P[i], x + w / 2, by + 28, { size: 14, weight: 700, align: 'center', color: lit ? C.surface : C.ink });
        acc += P[i];
      }
      txt('0', bx, by + bh + 20, { size: 12, color: C.muted, align: 'center' });
      txt('1', bx + bw, by + bh + 20, { size: 12, color: C.muted, align: 'center' });
      if (s.slow) {
        const u = uOf(cur);
        if (u !== null) {
          const x = bx + u * bw, y = g.lerp(96, by - 8, ease(Math.min(1, s.f / .45)));
          line(x, 96, x, y, A(C.gold, .5), 1.5, [3, 3]); dot(x, y, 6, C.gold);
          txt('u = ' + u.toFixed(2), x, 92, { size: 13, weight: 600, align: 'center', color: C.gold });
        } else if (s.f > .2) txt('→ A', bx + P[0] * bw / 2, 108, { size: 15, weight: 700, align: 'center', color: C.gold });
        if (s.f > .55) txt('sample ' + (cur + 1) + ' → ' + NAMES[curPick], 840, 72, { size: 14, weight: 700, align: 'right', color: C.gold });
      } else txt(s.n >= 1000 ? 'the counts settle on p' : 'drawing faster…', 840, 72, { size: 14, weight: 600, align: 'right', color: C.muted });

      histogram(g, 200, 520, 500, 220, counts, counted, mode1 === 'sample' ? 'How often each category was picked' : 'argmax picks A every time');
    }
  });

  // ---------- Figure 2: argmax gives no gradient ----------
  const ZB = 1.0, ZC = 0.2;
  function stepPanel(g, zA, tau) {
    const { C, box, txt, line, dot, A } = g;
    // left: the three logits and the output
    const z = [zA, ZB, ZC];
    txt('logits z', 40, 50, { size: 15, weight: 700 });
    const base = 300, sc = 55;
    line(40, base, 380, base, C.line, 1);
    for (let i = 0; i < 3; i++) {
      const x = 70 + i * 105, h = z[i] * sc;
      box(x, h >= 0 ? base - h : base, 60, Math.abs(h), { fill: A(catCol(C, i), .6), r: 3 });
      txt(NAMES[i], x + 30, base + 22, { size: 14, weight: 700, align: 'center' });
      txt(z[i].toFixed(2), x + 30, (h >= 0 ? base - h : base) - 8, { size: 12.5, align: 'center', color: C.muted });
    }
    const y = tau ? softmax(z, tau) : z.map((v, i) => i === argmax(z) ? 1 : 0);
    txt(tau ? 'output: softmax(z / τ)' : 'output: one-hot of argmax', 40, 370, { size: 15, weight: 700 });
    for (let i = 0; i < 3; i++) {
      const x = 70 + i * 105;
      box(x, 390, 60, 120, { stroke: C.line, r: 4 });
      box(x, 510 - y[i] * 120, 60, y[i] * 120, { fill: A(catCol(C, i), .85), r: 4 });
      txt(y[i].toFixed(2), x + 30, 535, { size: 13, align: 'center', weight: 600 });
    }
    return y;
  }
  function curvePanel(g, zA, tau, label) {
    const { C, txt, line, dot, A, box } = g;
    const x0 = 470, x1 = 860, y0 = 470, y1 = 130, zmin = -1, zmax = 3;
    const X = z => x0 + (z - zmin) / (zmax - zmin) * (x1 - x0), Y = v => y0 - v * (y0 - y1);
    txt(label, x0, 50, { size: 15, weight: 700 });
    txt('as we slide z_A, holding z_B = ' + ZB + ' and z_C = ' + ZC + (tau ? ' · dashed: argmax' : ''), x0, 72, { size: 12.5, color: C.muted });
    line(x0, y0, x1, y0, C.line, 1); line(x0, y0, x0, y1 - 10, C.line, 1);
    txt('0', x0 - 8, y0 + 4, { size: 12, color: C.muted, align: 'right' }); txt('1', x0 - 8, y1 + 4, { size: 12, color: C.muted, align: 'right' });
    for (let z = zmin; z <= zmax; z++) txt(String(z), X(z), y0 + 20, { size: 12, color: C.muted, align: 'center' });
    txt('z_A', x1, y0 + 40, { size: 13, color: C.muted, align: 'right' });
    // argmax step, always shown
    polyline(g, [[X(zmin), Y(0)], [X(ZB), Y(0)]], tau ? A(C.ink, .35) : C.blue, tau ? 2 : 3, tau ? [6, 5] : null);
    polyline(g, [[X(ZB), Y(1)], [X(zmax), Y(1)]], tau ? A(C.ink, .35) : C.blue, tau ? 2 : 3, tau ? [6, 5] : null);
    if (!tau) { dot(X(ZB), Y(0), 4, C.surface); g.ctx.lineWidth = 2; g.ctx.strokeStyle = C.blue; g.ctx.stroke(); dot(X(ZB), Y(1), 5, C.blue); }
    const f = z => tau ? softmax([z, ZB, ZC], tau)[0] : (z > ZB ? 1 : 0);
    if (tau) { const pts = []; for (let k = 0; k <= 160; k++) { const z = zmin + (zmax - zmin) * k / 160; pts.push([X(z), Y(f(z))]); } polyline(g, pts, C.blue, 3); }
    // the point and its slope
    const v = f(zA), h = 1e-3, slope = tau ? (f(zA + h) - f(zA - h)) / (2 * h) : 0;
    const near = !tau && Math.abs(zA - ZB) < 0.04;
    if (!near) { const dz = 0.55; line(X(zA - dz), Y(v - slope * dz), X(zA + dz), Y(v + slope * dz), C.gold, 2.5); }
    dot(X(zA), Y(v), 7, C.gold);
    const bx = x1 - 215, byy = (y0 + y1) / 2 - 25;
    box(bx, byy, 210, 50, { fill: A(C.surface, .9), stroke: C.line, r: 6 });
    txt('output for A: ' + v.toFixed(2), bx + 12, byy + 20, { size: 13 });
    txt(near ? 'slope: undefined (the jump)' : 'slope: ' + slope.toFixed(2), bx + 12, byy + 40, { size: 13, weight: 700, color: (slope > 0.005) ? C.green : C.red });
  }
  BlogFigs.register('argmax-step', {
    pace: 1,
    draw(t, g) {
      const zA = 1 + 1.6 * Math.sin(t * 0.45);
      stepPanel(g, zA, 0);
      curvePanel(g, zA, 0, 'Output for A, against z_A');
      g.txt('Flat, flat, jump, flat: the slope is 0 almost everywhere.', 470, 540, { size: 13.5, weight: 600, color: g.C.red });
    }
  });

  // ---------- Figure 3: softmax with temperature ----------
  let tau3 = 1;
  BlogFigs.register('temperature', {
    pace: 1,
    controls(api) {
      api.slider({ label: 'Temperature τ', min: -1, max: 1, step: 0.01, value: 0, format: v => (Math.pow(10, v)).toFixed(2) }, v => { tau3 = Math.pow(10, v); });
    },
    draw(t, g) {
      const zA = 1 + 1.6 * Math.sin(t * 0.45);
      stepPanel(g, zA, tau3);
      curvePanel(g, zA, tau3, 'softmax output for A, against z_A');
      const msg = tau3 < 0.25 ? 'Low τ: almost the argmax step, but still smooth.' : tau3 > 4 ? 'High τ: nearly uniform, the logits barely matter.' : 'A smooth curve: a nonzero slope for backprop.';
      g.txt(msg, 470, 540, { size: 13.5, weight: 600, color: g.C.green });
    }
  });

  // ---------- Figure 4: the Gumbel-Max trick ----------
  let shared4 = false;
  BlogFigs.register('gumbel-max', {
    pace: 1,
    controls(api) {
      api.chips('Noise', [{ label: 'one per category', value: false }, { label: 'shared (wrong)', value: true }], v => { shared4 = v; });
    },
    draw(t, g) {
      const { C, box, txt, line, dot, A, ease, lerp } = g;
      t = t % 44;
      const s = schedule(t, 6, 2.8, 2000);
      const noise = (k, i) => gumbel(g, k * 7 + (shared4 ? 0 : i) + 5);
      const winner = k => argmax(LOGP.map((v, i) => v + noise(k, i)));
      const counted = s.n + (s.slow && s.f > .72 ? 1 : 0);
      const counts = [0, 0, 0]; for (let k = 0; k < counted; k++) counts[winner(k)]++;

      txt('score = log p + g', 40, 50, { size: 16, weight: 700 });
      txt('g ~ Gumbel(0, 1), drawn fresh ' + (shared4 ? 'once and shared by all' : 'for each category'), 40, 72, { size: 13, color: C.muted });
      // score axis
      const top = 110, bot = 500, smin = -4.5, smax = 5;
      const Y = v => bot - (g.clamp(v, smin, smax) - smin) / (smax - smin) * (bot - top);
      for (let v = -4; v <= 4; v += 2) { line(70, Y(v), 500, Y(v), A(C.line, .5), 1); txt(String(v), 60, Y(v) + 4, { size: 12, color: C.muted, align: 'right' }); }
      const k = s.slow ? s.n : Math.max(0, s.n - 1), f = s.slow ? s.f : 1;
      const grow = ease(g.clamp((f - .18) / .4, 0, 1)), pick = f > .62;
      const sc = LOGP.map((v, i) => v + noise(k, i)), w = argmax(sc);
      if (pick) line(70, Y(sc[w]), 500, Y(sc[w]), A(C.gold, .6), 1.5, [5, 4]);
      for (let i = 0; i < 3; i++) {
        const x = 140 + i * 130;
        txt(NAMES[i], x, bot + 26, { size: 15, weight: 700, align: 'center' });
        txt('log ' + P[i] + ' = ' + LOGP[i].toFixed(2), x, bot + 46, { size: 12, align: 'center', color: C.muted });
        dot(x, Y(LOGP[i]), 7, catCol(C, i));
        const end = LOGP[i] + noise(k, i) * grow;
        if (grow > 0) {
          line(x, Y(LOGP[i]), x, Y(end), C.red, 3);
          const dir = noise(k, i) >= 0 ? -1 : 1; g.ctx.beginPath(); g.ctx.moveTo(x - 6, Y(end) - 8 * dir); g.ctx.lineTo(x + 6, Y(end) - 8 * dir); g.ctx.lineTo(x, Y(end)); g.ctx.fillStyle = C.red; g.ctx.fill();
          if (s.slow) txt('g = ' + (noise(k, i) >= 0 ? '+' : '') + noise(k, i).toFixed(2), x + 12, (Y(LOGP[i]) + Y(end)) / 2 + 4, { size: 12, color: C.red });
        }
        if (pick && i === w) { dot(x, Y(sc[i]), 11, A(C.gold, .35)); dot(x, Y(sc[i]), 6.5, C.gold); txt('max', x, Y(sc[i]) - 16, { size: 12.5, weight: 700, align: 'center', color: C.gold }); }
      }
      if (s.slow && pick) txt('sample ' + (k + 1) + ' → ' + NAMES[w], 500, 50, { size: 14, weight: 700, align: 'right', color: C.gold });
      if (!s.slow) txt('drawing faster…', 500, 50, { size: 13, align: 'right', color: C.muted });

      histogram(g, 570, 500, 300, 250, counts, counted, shared4 ? 'Shared noise: always A' : 'argmax of the scores');
    }
  });

  // ---------- Figure 5: Gumbel-Softmax ----------
  let tau5 = 0.5;
  BlogFigs.register('gumbel-softmax', {
    pace: 1,
    controls(api) {
      api.slider({ label: 'Temperature τ', min: -1, max: 0.7, step: 0.01, value: Math.log10(0.5), format: v => (Math.pow(10, v)).toFixed(2) }, v => { tau5 = Math.pow(10, v); });
    },
    draw(t, g) {
      const { C, box, txt, line, A, ease } = g;
      const per = 2.6, k = Math.floor(t / per), f = (t % per) / per;
      const sample = j => { const sc = LOGP.map((v, i) => v + gumbel(g, (j + 1000) * 7 + i + 5)); return { sc, y: softmax(sc, tau5), w: argmax(sc) }; };
      const cur = sample(k), prev = sample(Math.max(0, k - 1)), m = ease(Math.min(1, f / .35));
      const sc = cur.sc.map((v, i) => g.lerp(k ? prev.sc[i] : v, v, m)), y = softmax(sc, tau5), w = argmax(sc);

      const panels = [
        { x: 40, title: '1 · noisy scores', sub: 'log p + g' },
        { x: 330, title: '2 · soft sample y', sub: 'softmax(scores / τ)' },
        { x: 620, title: '3 · hard sample', sub: 'one-hot of argmax' },
      ];
      panels.forEach(p => { txt(p.title, p.x, 48, { size: 15, weight: 700 }); txt(p.sub, p.x, 68, { size: 12.5, color: C.muted }); });
      // 1: scores
      const base = 200, s1 = 26;
      line(40, base, 280, base, C.line, 1);
      for (let i = 0; i < 3; i++) {
        const x = 52 + i * 78, h = g.clamp(sc[i], -4, 4) * s1;
        box(x, h >= 0 ? base - h : base, 54, Math.abs(h), { fill: A(catCol(C, i), .6), r: 3 });
        txt(sc[i].toFixed(2), x + 27, h >= 0 ? base - h - 8 : base - h + 16, { size: 12, align: 'center', color: C.muted });
        txt(NAMES[i], x + 27, 332, { size: 13, weight: 700, align: 'center', color: C.muted });
      }
      // 2: soft y, 3: hard
      for (let i = 0; i < 3; i++) {
        const x2 = 342 + i * 78, x3 = 632 + i * 78, hard = i === w ? 1 : 0;
        box(x2, 100, 54, 190, { stroke: C.line, r: 4 }); box(x2, 290 - y[i] * 190, 54, y[i] * 190, { fill: A(catCol(C, i), .85), r: 4 });
        txt(y[i].toFixed(2), x2 + 27, 312, { size: 13, weight: 600, align: 'center' });
        box(x3, 100, 54, 190, { stroke: C.line, r: 4 }); if (hard) box(x3, 100, 54, 190, { fill: A(C.gold, .8), r: 4 });
        txt(String(hard), x3 + 27, 312, { size: 13, weight: 600, align: 'center' });
        txt(NAMES[i], x2 + 27, 332, { size: 13, weight: 700, align: 'center', color: C.muted });
        txt(NAMES[i], x3 + 27, 332, { size: 13, weight: 700, align: 'center', color: C.muted });
      }
      // strip of recent soft samples
      txt('The last 24 soft samples, each a column split by y', 40, 386, { size: 13.5, weight: 600 });
      const n = 24, cw = 820 / n;
      for (let j = 0; j < n; j++) {
        const kk = k - n + 1 + j;   // earlier draws come from the same seeded sequence
        const yy = kk === k ? y : sample(kk).y; let acc = 0;
        for (let i = 0; i < 3; i++) { const h = yy[i] * 120; box(40 + j * cw + 2, 400 + acc, cw - 4, h, { fill: A(catCol(C, i), kk === k ? .95 : .7), r: 0 }); acc += h; }
      }
      const avgOneHot = (() => { let s = 0, c = 0; for (let kk = k - 23; kk <= k; kk++) { const yy = kk === k ? y : sample(kk).y; s += Math.max(...yy); c++; } return s / c; })();
      txt('τ = ' + tau5.toFixed(2) + ' · on average the biggest entry of y is ' + pct(avgOneHot) + (avgOneHot > .9 ? ': nearly one-hot' : avgOneHot < .55 ? ': a soft blend' : ''), 40, 556, { size: 13.5, color: avgOneHot > .9 ? C.gold : C.ink, weight: 600 });
    }
  });
})();
