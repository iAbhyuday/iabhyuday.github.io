/* blog-figs.js · shared engine for animated canvas figures on iabhyuday.github.io
   (extracted from "How a GPU Works"). A post loads this file, then its own figs.js,
   which registers each figure:

     BlogFigs.register('my-fig', {
       pace: 0.5,                         // 1 = real time; lower = slower, easier to follow
       draw(t, g) { ... },                // t: seconds since start (pace and speed applied)
       controls(api) { ... }              // optional chips and sliders
     });

   and the page holds  <figure class="blog-fig" data-fig="my-fig"><figcaption>…</figcaption></figure>.
   Drawing happens on a 900 x 600 logical canvas (3:2). g gives the helpers:
     g.ctx, g.C (theme colours), g.box, g.txt, g.wrap, g.line, g.dot, g.A (hex + alpha),
     g.lerp, g.clamp, g.ease, g.hash, g.along, g.fmt, g.W, g.H.
   g.C holds surface, panel, panel2, line, ink, muted and the five accents
   blue, green, purple, gold, red, re-read whenever the reader switches theme.
   Every figure gets play/pause, restart, 0.5x/1x/2x speed, full screen on phones,
   pauses off-screen, and respects reduced motion. */
(function () {
'use strict';
const W = 900, H = 600;
let ctx = null, scale = 1;
const C = {}, FONTS = {};
const REG = {};
let started = false;

// ---------- helpers ----------
function A(hex, a){
  hex = (hex||'#888').replace('#','');
  if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
  const n = parseInt(hex,16);
  if (C.light && a < 1) a = Math.min(1, a + (1 - a) * a * 1.1);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}
const lerp=(a,b,u)=>a+(b-a)*u, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=u=>{u=clamp(u,0,1);return u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;};
function hash(n){ n=(n^61)^(n>>>16); n=n+(n<<3); n=n^(n>>>4); n=Math.imul(n,0x27d4eb2d); n=n^(n>>>15); return (n>>>0)/4294967296; }
function rr(x,y,w,h,r){ ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x,y,w,h,r); else ctx.rect(x,y,w,h); }
function box(x,y,w,h,o={}){ rr(x,y,w,h,o.r ?? 5); if(o.fill){ctx.fillStyle=o.fill;ctx.fill();} if(o.stroke){ctx.lineWidth=Math.min(o.lw||1,1.5);ctx.strokeStyle=o.stroke; if(o.dash) ctx.setLineDash(o.dash); ctx.stroke(); ctx.setLineDash([]);} }
function txt(s,x,y,o={}){
  const size = (o.size||14) * (o.size>=15 ? 0.93 : 1);
  const weight = (o.weight||400) >= 600 ? 700 : 400;
  ctx.font = `${weight} ${size}px ${FONTS[o.font||'body']}`;
  ctx.fillStyle = o.color || C.ink; ctx.textAlign = o.align||'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s,x,y);
}
function wrap(str,x,y,maxW,lh,o={}){
  ctx.font=`${o.weight||400} ${o.size||14}px ${FONTS[o.font||'body']}`;
  let cur='', yy=y;
  for(const w of str.split(' ')){ const test=cur?cur+' '+w:w; if(ctx.measureText(test).width>maxW && cur){ txt(cur,x,yy,o); cur=w; yy+=lh; ctx.font=`${o.weight||400} ${o.size||14}px ${FONTS[o.font||'body']}`; } else cur=test; }
  if(cur) txt(cur,x,yy,o); return yy+lh;
}
function line(x1,y1,x2,y2,col,lw=1,dash){ ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.strokeStyle=col; ctx.lineWidth=lw; if(dash)ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]); }
function dot(x,y,r,col){ ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=col; ctx.fill(); }
function along(pts,u){
  let L=0, seg=[]; for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]); seg.push(d); L+=d;}
  let d=u*L; for(let i=0;i<seg.length;i++){ if(d<=seg[i]||i===seg.length-1){const k=seg[i]?d/seg[i]:0; return [lerp(pts[i][0],pts[i+1][0],k),lerp(pts[i][1],pts[i+1][1],k)];} d-=seg[i]; }
}
const fmt = n => n.toLocaleString('en-US');

const g = { ctx: null, C, W, H, box, txt, wrap, line, dot, A, lerp, clamp, ease, hash, along, fmt };

function controlsApi(st, fig, cap){
  const row = () => { const r = el('div',{class:'gf-ctl'}); fig.insertBefore(r, cap); return r; };
  return {
    state: st,
    restart(){ st.t = 0; },
    // chips(label, [{label, value}], onPick(value), initialIndex)
    chips(label, options, onPick, initial = 0){
      const r = row(); if (label) r.appendChild(el('span',{class:'gf-speed-label'}, label));
      const bs = options.map((o, i) => { const b = el('button',{class:'gf-chip',type:'button','aria-pressed':String(i===initial)}, o.label);
        b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', String(x===b))); onPick(o.value); st.t = 0; }); r.appendChild(b); return b; });
      if (options[initial]) onPick(options[initial].value);
      return r;
    },
    // slider({label, min, max, step, value, format(v)}, onInput(value))
    slider(o, onInput){
      const r = row();
      r.innerHTML = '<label><span></span> <input type="range"><output></output></label>';
      r.querySelector('span').textContent = o.label || '';
      const inp = r.querySelector('input'), out = r.querySelector('output');
      Object.assign(inp, {min: o.min ?? 0, max: o.max ?? 1, step: o.step ?? 0.01, value: o.value ?? 0});
      inp.setAttribute('aria-label', o.label || 'Value');
      const fmtv = o.format || (v => String(v));
      const set = () => { const v = parseFloat(inp.value); out.textContent = fmtv(v); onInput(v); };
      inp.addEventListener('input', set); set();
      return r;
    }
  };
}

const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const figs = [];

function isLightBg(){
  let el = document.body;
  while (el) {
    const c = getComputedStyle(el).backgroundColor;
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (m) { const v = m[1].split(',').map(parseFloat); if (v.length < 4 || v[3] > 0.5) return (0.299*v[0]+0.587*v[1]+0.114*v[2]) > 140; }
    el = el.parentElement;
  }
  return false;
}
function pageBg(){
  let el = document.body;
  while (el) {
    const m = (getComputedStyle(el).backgroundColor||'').match(/rgba?\(([^)]+)\)/);
    if (m) { const v = m[1].split(',').map(parseFloat); if (v.length < 4 || v[3] > 0.5) return '#'+v.slice(0,3).map(x=>Math.round(x).toString(16).padStart(2,'0')).join(''); }
    el = el.parentElement;
  }
  return null;
}
function readTheme(el){
  const s = getComputedStyle(el), o = {};
  for (const k of ['surface','panel','panel2','line','ink','muted','blue','green','purple','gold','red']) o[k] = s.getPropertyValue('--g-'+k).trim();
  o.light = el.classList.contains('light');
  return o;
}
function el(tag, attrs, html){ const e=document.createElement(tag); for(const k in (attrs||{})) e.setAttribute(k, attrs[k]); if(html!=null) e.innerHTML=html; return e; }

function mount(fig){
  const id = fig.dataset.fig, spec = REG[id]; if (!spec || fig.dataset.mounted) return;
  fig.dataset.mounted = '1';
  const st = {fig, draw: spec.draw, t: reduced?3:0, playing: !reduced, visible: false, canvas:null, theme:null, pace: spec.pace ?? 0.5, speed: 1};
  const scroll = el('div',{class:'gf-scroll'}), boxEl = el('div',{class:'gf-box'});
  const cv = el('canvas',{role:'img','aria-label':fig.getAttribute('aria-label')||'Animated diagram'});
  boxEl.appendChild(cv); scroll.appendChild(boxEl); st.canvas = cv;
  const cap = fig.querySelector('figcaption');
  fig.insertBefore(scroll, cap);
  // phones: the figure fits the column; tapping opens it full screen, turned sideways
  const expand = el('button',{class:'gf-expand',type:'button','aria-label':'Enlarge figure'}, '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>Full screen');
  expand.addEventListener('click', () => openFull(st, expand));
  cv.addEventListener('click', () => { if (narrow.matches) openFull(st, expand); });

  // optional per-figure controls (chips, sliders) from the figure's spec
  if (typeof spec.controls === 'function') spec.controls(controlsApi(st, fig, cap));

  const bar = el('div',{class:'gf-bar'});
  const ICON_PAUSE = '<svg viewBox="0 0 10 10" aria-hidden="true"><rect x="1.5" y="1" width="2.4" height="8"/><rect x="6.1" y="1" width="2.4" height="8"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1 L9 5 L2 9 Z"/></svg>';
  const play = el('button',{class:'gf-play',type:'button'});
  const sync = () => { play.innerHTML = st.playing ? ICON_PAUSE : ICON_PLAY; play.setAttribute('aria-label', st.playing ? 'Pause animation' : 'Play animation'); };
  const restart = el('button',{class:'gf-link',type:'button'}, '↺ Restart');
  play.addEventListener('click',()=>{ st.playing=!st.playing; sync(); });
  restart.addEventListener('click',()=>{ st.t=0; st.playing=true; sync(); });
  sync(); st.syncBar = sync; bar.appendChild(play); bar.appendChild(restart); bar.appendChild(expand);
  const sp = el('span',{class:'gf-speed',role:'group','aria-label':'Animation speed'});
  sp.appendChild(el('span',{class:'gf-speed-label'},'Speed'));
  const speedBtns = [0.5,1,2].map(v=>{ const b=el('button',{class:'gf-link',type:'button','aria-pressed':String(v===1)}, v+'×'); b.addEventListener('click',()=>{ st.speed=v; speedBtns.forEach(x=>x.setAttribute('aria-pressed', String(x===b))); }); sp.appendChild(b); return b; });
  bar.appendChild(sp);
  const firstCtl = fig.querySelector('.gf-ctl');
  fig.insertBefore(bar, firstCtl || cap);

  applyTheme(st);
  figs.push(st);
}

function render(st){
  // layout size (not the on-screen box), so a rotated full-screen canvas still scales right
  const cv = st.canvas, r = {width: cv.clientWidth, height: cv.clientHeight};
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  const w = Math.max(1, Math.round(r.width*dpr)), h = Math.max(1, Math.round(r.height*dpr));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  ctx = cv.getContext('2d'); scale = r.width / W; g.ctx = ctx;
  Object.assign(C, st.theme);
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,w,h);
  ctx.setTransform(dpr*scale,0,0,dpr*scale,0,0);
  try { st.draw(st.t, g); } catch (e) { console.error(e); }
}

const narrow = window.matchMedia('(max-width: 760px)');
function openFull(st, opener){
  if (st.full) return;
  const ov = el('div',{class:'blog-fig gf-full', role:'dialog', 'aria-modal':'true', 'aria-label':'Enlarged figure'});
  if (st.fig.classList.contains('light')) ov.classList.add('light');
  ov.style.background = st.theme.surface;
  const frame = el('div',{class:'gf-full-frame'}), box = el('div',{class:'gf-full-box'});
  const cv2 = el('canvas',{role:'img','aria-label': st.canvas.getAttribute('aria-label')});
  box.appendChild(cv2);
  const close = el('button',{class:'gf-full-btn gf-full-close',type:'button','aria-label':'Close enlarged figure'}, '✕');
  const pp = el('button',{class:'gf-full-btn gf-full-play',type:'button'});
  const syncPP = () => { pp.textContent = st.playing ? '❚❚' : '▶'; pp.setAttribute('aria-label', st.playing ? 'Pause animation' : 'Play animation'); };
  pp.addEventListener('click', () => { st.playing = !st.playing; syncPP(); if (st.syncBar) st.syncBar(); });
  syncPP();
  frame.appendChild(box); frame.appendChild(pp); frame.appendChild(close); ov.appendChild(frame);
  const layout = () => {
    const vw = window.innerWidth, vh = window.innerHeight, portrait = vh > vw;
    const fw = portrait ? vh : vw, fh = portrait ? vw : vh;
    Object.assign(frame.style, portrait
      ? {width: fw+'px', height: fh+'px', left: vw+'px', top: '0px', transform: 'rotate(90deg)', transformOrigin: 'top left'}
      : {width: fw+'px', height: fh+'px', left: '0px', top: '0px', transform: 'none'});
    const bw = Math.min(fw - 128, (fh - 16) * 1.5);
    box.style.width = bw + 'px'; box.style.height = (bw / 1.5) + 'px';
    render(st);
  };
  const prevOverflow = document.documentElement.style.overflow;
  const done = () => {
    st.full = false; st.canvas = st.inline; ov.remove();
    document.documentElement.style.overflow = prevOverflow;
    window.removeEventListener('resize', layout); document.removeEventListener('keydown', onKey);
    render(st); if (opener) opener.focus();
  };
  const onKey = (e) => { if (e.key === 'Escape') done(); };
  close.addEventListener('click', done);
  document.body.appendChild(ov);
  document.documentElement.style.overflow = 'hidden';
  st.inline = st.canvas; st.canvas = cv2; st.full = true;
  window.addEventListener('resize', layout); document.addEventListener('keydown', onKey);
  layout(); close.focus();
}

function applyTheme(st){
  st.fig.classList.toggle('light', isLightBg());
  st.theme = readTheme(st.fig);
  const pg = pageBg(); if (pg) st.theme.surface = pg;
}
// Quarto's light/dark toggle swaps stylesheets and the body class;
// re-read colours once the new stylesheet has applied.
function watchTheme(){
  let timer = null;
  const refresh = () => { clearTimeout(timer); timer = setTimeout(() => figs.forEach(st => { applyTheme(st); render(st); }), 60); };
  new MutationObserver(refresh).observe(document.body, {attributes:true, attributeFilter:['class']});
  new MutationObserver(refresh).observe(document.head, {childList:true, subtree:true, attributes:true, attributeFilter:['disabled','rel','media']});
  window.addEventListener('quarto-hrChanged', refresh);
}
function init(){
  const bodyFont = '"Source Sans 3", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  FONTS.body = bodyFont; FONTS.display = bodyFont;
  FONTS.mono = bodyFont;
  started = true;
  mountAll();
  watchTheme();
  if (document.fonts && document.fonts.load) Promise.all(['400 14px "Source Sans 3"','600 14px "Source Sans 3"','700 14px "Source Sans 3"'].map(f => document.fonts.load(f).catch(() => {}))).then(() => figs.forEach(render));
  let last = performance.now();
  function frame(now){
    const dt = Math.min(.1,(now-last)/1000); last = now;
    for (const st of figs) { if (!st.visible && !st.full) continue; if (st.playing) st.t += dt * st.pace * st.speed; render(st); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

}

function mountAll(){
  document.querySelectorAll('figure.blog-fig[data-fig]').forEach(mount);
  figs.forEach(st => {
    if (st.observed) return; st.observed = true;
    if (io) io.observe(st.fig); else st.visible = true;
    render(st);
  });
}
const io = ('IntersectionObserver' in window)
  ? new IntersectionObserver(es => es.forEach(e => { const st = figs.find(f=>f.fig===e.target); if (st) st.visible = e.isIntersecting; }), {rootMargin:'100px'})
  : null;

window.BlogFigs = {
  register(id, spec){
    REG[id] = (typeof spec === 'function') ? { draw: spec } : spec;
    if (started) mountAll();
  }
};
// start after this file's declarations exist; figures registered later mount on arrival
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
