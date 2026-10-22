/* Animated figures for "How a GPU Works: A Visual Tour of the H100".
   Each <figure class="gpu-fig" data-fig="..."> gets a canvas, play controls
   and, for some figures, a slider. Figures only animate while on screen. */
(function () {
'use strict';
const W = 900, H = 600;
let ctx = null, scale = 1;
const C = {}, FONTS = {};

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

// ---------- Figure: CPU core vs GPU SM ----------
let cpuMode = 'both';
const CPU_LANE_HI = 5, SM_LANE_HI = 37;   // the outlined lane on each side
function drawCPU(t){
  // timeline: chain (13 s) then independent items (14 s)
  let scene, lt;
  if (cpuMode === 'chain') { scene = 0; lt = t % 13; }
  else if (cpuMode === 'par') { scene = 1; lt = t % 14; }
  else { const u = t % 27; scene = u < 13 ? 0 : 1; lt = scene ? u - 13 : u; }

  // ----- chain model: 12 dependent steps -----
  const S_PER_NS_A = 0.45/1.4, CPU_STEP = 1.4, GPU_STEP = 18;
  const nsA = lt / S_PER_NS_A;
  const cpuSteps = Math.min(12, nsA / CPU_STEP), gpuSteps = Math.min(12, nsA / GPU_STEP);
  // ----- parallel model: 2,048 items -----
  const S_PER_NS_B = 0.6, CPU_TICK = 1/3.5, GPU_TICK = 1/1.8;
  const nsB = lt / S_PER_NS_B;
  const cpuDone = Math.min(2048, Math.floor(nsB / CPU_TICK) * 32), gpuDone = Math.min(2048, Math.floor(nsB / GPU_TICK) * 128);
  const cpuFlash = scene===1 && cpuDone<2048 ? Math.max(0, 1 - ((nsB / CPU_TICK) % 1) * 1.6) : 0;
  const gpuFlash = scene===1 && gpuDone<2048 ? Math.max(0, 1 - ((nsB / GPU_TICK) % 1) * 1.6) : 0;
  const chainPulse = 0.5 + 0.5*Math.sin(lt*6);

  // ===== anatomy =====
  const ctrl = A(C.muted,.18), cache = A(C.mem,.22), regs = A(C.mem,.12);
  const L = {x:30, w:400}, Rr = {x:470, w:400};
  txt('One CPU core', L.x, 34, {size:16, weight:700});
  txt('~3.5 GHz · runs 1–2 threads', L.x+L.w, 34, {size:12, color:C.muted, align:'right'});
  txt('One H100 SM', Rr.x, 34, {size:16, weight:700});
  txt('~1.8 GHz · holds up to 2,048 threads', Rr.x+Rr.w, 34, {size:12, color:C.muted, align:'right'});

  // CPU core floorplan: mostly control and cache
  box(L.x, 48, L.w, 248, {fill:C.die, stroke:C.line, r:6});
  box(L.x+10, 58, L.w-20, 44, {fill:ctrl, r:3}); txt('Fetch · decode · branch prediction', L.x+20, 85, {size:12.5});
  box(L.x+10, 108, L.w-20, 56, {fill:ctrl, r:3}); txt('Out-of-order engine', L.x+20, 131, {size:12.5});
  txt('keeps hundreds of instructions in flight', L.x+20, 150, {size:11.5, color:C.muted});
  box(L.x+10, 170, L.w-20, 58, {fill:cache, r:3}); txt('L1 + L2 cache · ~2 MB', L.x+20, 196, {size:12.5});
  txt('most data is found here in a few cycles', L.x+20, 215, {size:11.5, color:C.muted});
  box(L.x+10, 234, L.w-20, 52, {fill:A(C.cuda,.1), r:3});
  txt('Vector units · 2 × 16 FP32 lanes', L.x+20, 252, {size:12.5});
  for (let i=0;i<32;i++){
    const x = L.x+20+(i%16)*10.5, y = 259+Math.floor(i/16)*12;
    let a = .3; if (scene===1 && cpuDone<2048) a = .3+.7*cpuFlash; if (scene===0 && i===CPU_LANE_HI && cpuSteps<12) a = .35+.65*chainPulse;
    box(x, y, 8, 9, {fill:A(C.cuda,a), r:1.5});
    if (i===CPU_LANE_HI) box(x-2, y-2, 12, 13, {stroke:C.ink, lw:1.3, r:2});
  }
  txt('one SIMD lane', L.x+205, 272, {size:11, color:C.ink});
  line(L.x+201, 268, L.x+20+CPU_LANE_HI*10.5+11, 264, C.muted, 1);

  // SM floorplan: mostly math lanes and registers
  box(Rr.x, 48, Rr.w, 248, {fill:C.die, stroke:C.line, r:6});
  box(Rr.x+10, 58, Rr.w-20, 22, {fill:ctrl, r:3}); txt('4 warp schedulers · simple, in order', Rr.x+20, 74, {size:12});
  box(Rr.x+10, 86, Rr.w-20, 34, {fill:regs, r:3}); txt('Register file · 256 KB · every thread keeps its state here', Rr.x+20, 108, {size:12});
  box(Rr.x+10, 126, Rr.w-20, 92, {fill:A(C.cuda,.1), r:3});
  txt('128 FP32 lanes = 128 "CUDA cores"', Rr.x+20, 143, {size:12.5});
  for (let i=0;i<128;i++){
    const x = Rr.x+20+(i%32)*11.4, y = 152+Math.floor(i/32)*15;
    let a = .3; if (scene===1 && gpuDone<2048) a = .3+.7*gpuFlash; if (scene===0 && i===SM_LANE_HI && gpuSteps<12) a = .35+.65*chainPulse;
    box(x, y, 9, 12, {fill:A(C.cuda,a), r:1.5});
    if (i===SM_LANE_HI) box(x-2, y-2, 13, 16, {stroke:C.ink, lw:1.3, r:2});
  }
  box(Rr.x+10, 224, Rr.w-20, 26, {fill:A(C.tensor,.22), r:3}); txt('4 Tensor Cores', Rr.x+20, 241, {size:12});
  box(Rr.x+10, 256, Rr.w-20, 30, {fill:cache, r:3}); txt('L1 / shared memory · 256 KB', Rr.x+20, 276, {size:12});

  txt('Outlined: one "CUDA core" is one lane, the same kind of thing as one SIMD lane in a CPU core. The SM is what compares to a CPU core.', 450, 316, {size:12, color:C.muted, align:'center'});
  line(30, 328, 870, 328, C.line, 1);

  // ===== race =====
  if (scene === 0) {
    txt('Workload 1 · one chain of 12 dependent steps (each step needs the previous result)', 450, 352, {size:13.5, weight:700, align:'center'});
    [[L, cpuSteps, 'CPU core', CPU_STEP, C.warp], [Rr, gpuSteps, 'One GPU thread', GPU_STEP, C.warp]].forEach(([P, steps, name, per, col], side)=>{
      txt(name, P.x, 382, {size:12.5, weight:700});
      txt('≈ '+per+' ns per step', P.x+P.w, 382, {size:12, color:C.muted, align:'right'});
      for (let k=0;k<12;k++){
        const x = P.x + k*33.4, f = clamp(steps - k, 0, 1);
        box(x, 394, 29, 36, {fill:A(col,.1), stroke:C.line, r:3});
        if (f>0) box(x, 394, 29*f, 36, {fill:A(col, f<1?.45:.75), r:3});
      }
      const shownNs = Math.min(nsA, 12*per);
      txt(`step ${Math.floor(steps)} of 12 · ${shownNs.toFixed(1)} ns`, P.x, 452, {size:12.5});
      if (steps >= 12) txt('✓ done in '+(12*per).toFixed(0)+' ns', P.x, 474, {size:13, weight:700, color:C.cuda});
      if (side===1) {
        txt('the other 127 lanes have nothing to do', P.x, 474, {size:12, color:C.idle});
        for (let i=0;i<128;i++) box(P.x+i*3.1, 486, 2.2, 10, {fill: i===SM_LANE_HI? A(C.cuda,.4+.6*chainPulse) : A(C.idle,.25), r:0.5});
      } else {
        txt('caches and out-of-order execution keep one thread fast', P.x, 498, {size:12, color:C.muted});
      }
    });
    if (lt > 6.5) txt('For one sequential thread the CPU core wins by about 13×. GPU threads are individually slow.', 450, 548, {size:13, align:'center', weight:700});
    txt('illustrative: a dependent load per step, ~5 cycles on the CPU vs ~33 on the SM', 450, 570, {size:11.5, align:'center', color:C.muted});
  } else {
    txt('Workload 2 · 2,048 independent items (the same operation on every item)', 450, 352, {size:13.5, weight:700, align:'center'});
    [[L, cpuDone, 'CPU core', '32 lanes × 3.5 GHz', CPU_TICK, 32], [Rr, gpuDone, 'One SM', '128 lanes × 1.8 GHz', GPU_TICK, 128]].forEach(([P, done, name, rate, tick, per])=>{
      txt(name, P.x, 380, {size:12.5, weight:700});
      txt(rate, P.x+P.w, 380, {size:12, color:C.muted, align:'right'});
      const cs = 6.2, rows = 32, cols = 64;
      for (let i=0;i<rows*cols;i++){
        const r = Math.floor(i/cols), c = i%cols;
        const fresh = i < done && i >= done - per && done < 2048;
        box(P.x + c*cs, 390 + r*4.6, cs-1, 3.6, {fill: i<done ? (fresh? C.cuda : A(C.cuda,.5)) : A(C.line,.5), r:0.5});
      }
      const ns = done>=2048 ? (2048/per)*tick : nsB;
      txt(`${fmt(done)} / 2,048 done · ${ns.toFixed(1)} ns`, P.x, 551, {size:12.5});
      if (done>=2048) txt('✓', P.x+P.w-10, 551, {size:14, weight:700, color:C.cuda, align:'right'});
    });
    if (lt > 6) txt('Per unit the SM is ~2× faster here. The GPU\'s real edge: 132 SMs, and Tensor Cores on top.', 450, 580, {size:13, align:'center', weight:700});
  }
}

// ---------- Figure: the chip ----------
const CHIP = (() => {
  const die = {x:150,y:50,w:600,h:510};
  const gw = 137.5, gh = 190, gpcs = [], sms = [];
  const disabledCount = [2,1,2,1,2,1,2,1];
  for (let g=0; g<8; g++){
    const col=g%4, row=Math.floor(g/4);
    const gx = die.x+10+col*(gw+10), gy = row===0?100:360;
    gpcs.push({x:gx,y:gy,w:gw,h:gh});
    const cw=(gw-12-5*5)/6, ch=(gh-26-8-2*6)/3;
    const dis=new Set(); let j=0; while(dis.size<disabledCount[g]) dis.add(Math.floor(hash(g*31+j++ +7)*18));
    for(let i=0;i<18;i++){const c=i%6,r=Math.floor(i/6); sms.push({x:gx+6+c*(cw+5),y:gy+26+r*(ch+6),w:cw,h:ch,on:!dis.has(i)});}
  }
  const enabled = sms.map((s,i)=>s.on?i:-1).filter(i=>i>=0);
  const stacks = [];
  [95,245,395].forEach((y,i)=>{ stacks.push({x:40,y,w:90,h:120,on:true,side:-1}); stacks.push({x:770,y,w:90,h:120,on:i!==2,side:1}); });
  return {die,gpcs,sms,enabled,stacks};
})();

function drawChip(t){
  const {die,gpcs,sms,enabled,stacks} = CHIP;
  txt('GH100 die · 80 billion transistors', die.x, 38, {size:13, color:C.muted, font:'mono'});
  txt('HBM3', 85, 80, {size:12, color:C.muted, font:'mono', align:'center'});
  txt('HBM3', 815, 80, {size:12, color:C.muted, font:'mono', align:'center'});
  stacks.forEach(s=>{
    if(s.on){ box(s.x,s.y,s.w,s.h,{fill:A(C.mem,.12),stroke:A(C.mem,.7),lw:1.4,r:4});
      for(let k=1;k<8;k++) line(s.x+8,s.y+10+k*9,s.x+s.w-8,s.y+10+k*9,A(C.mem,.35),1);
      txt('16 GB',s.x+s.w/2,s.y+s.h-12,{size:13,align:'center',font:'mono',weight:500});
    } else { box(s.x,s.y,s.w,s.h,{stroke:C.line,lw:1.2,r:4,dash:[4,4]}); txt('unused',s.x+s.w/2,s.y+s.h/2+4,{size:12,align:'center',color:C.muted}); }
  });
  box(die.x,die.y,die.w,die.h,{fill:C.die,stroke:C.line,lw:2,r:6});
  const paths = stacks.filter(s=>s.on).map(s=>{
    const sx = s.side<0? s.x+s.w : s.x, sy = s.y+s.h/2, ex = s.side<0? die.x : die.x+die.w;
    return [[sx,sy],[ex,325],[s.side<0? die.x+90: die.x+die.w-90,325]];
  });
  paths.forEach(pts=>{ ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.lineTo(...pts[2]); ctx.strokeStyle=A(C.mem,.25); ctx.lineWidth=6; ctx.stroke(); });
  box(die.x+10,60,580,30,{fill:A(C.warp,.12),stroke:A(C.warp,.5),r:4});
  txt('GigaThread engine · hands thread blocks to SMs',die.x+die.w/2,80,{size:13,align:'center',weight:500});
  box(die.x+10,300,580,50,{fill:A(C.mem,.13),stroke:A(C.mem,.55),r:4});
  txt('L2 cache · 50 MB · shared by every SM',die.x+die.w/2,330,{size:14,align:'center',weight:600});
  const glow = new Float32Array(sms.length);
  const P=0.085, FL=0.9, k1=Math.max(0,Math.floor((t-FL-1.6)/P)), k2=Math.floor(t/P);
  const flying=[];
  for(let k=k1;k<=k2;k++){
    const s=k*P, target=enabled[Math.floor(hash(k*13+5)*enabled.length)], arr=s+FL;
    if(t<arr) flying.push({k,s,target}); else { const g=1-(t-arr)/1.6; if(g>0) glow[target]=Math.max(glow[target],g); }
  }
  gpcs.forEach((g,i)=>{ box(g.x,g.y,g.w,g.h,{stroke:C.line,lw:1,r:4}); txt('GPC '+(i+1),g.x+7,g.y+17,{size:11.5,font:'mono',color:C.muted}); });
  sms.forEach((s,i)=>{
    if(s.on){ box(s.x,s.y,s.w,s.h,{fill:C.sm,r:2}); if(glow[i]>0) box(s.x,s.y,s.w,s.h,{fill:A(C.cuda,.15+glow[i]*.8),r:2}); }
    else box(s.x+.5,s.y+.5,s.w-1,s.h-1,{stroke:A(C.muted,.7),dash:[2,2],r:2});
  });
  flying.forEach(f=>{
    const s=sms[f.target], u=ease((t-f.s)/FL);
    const x0=die.x+30+hash(f.k*7+1)*540, y0=75;
    box(lerp(x0,s.x+s.w/2,u)-5,lerp(y0,s.y+s.h/2,u)-5,10,10,{fill:C.warp,r:2});
  });
  paths.forEach((pts,i)=>{ for(let j=0;j<4;j++){ const p=along(pts,((t*0.55)+j/4+i*0.13)%1); dot(p[0],p[1],3.4,C.mem); } });
  const ly=585; let lx=150;
  box(lx,ly-10,12,12,{fill:C.sm,r:2}); txt('SM',lx+18,ly,{size:12.5,color:C.muted}); lx+=60;
  box(lx,ly-10,12,12,{stroke:C.muted,dash:[2,2],r:2}); txt('switched off (yield)',lx+18,ly,{size:12.5,color:C.muted}); lx+=165;
  box(lx,ly-10,12,12,{fill:C.warp,r:2}); txt('thread block',lx+18,ly,{size:12.5,color:C.muted}); lx+=115;
  dot(lx+6,ly-4,5,C.mem); txt('data from HBM',lx+18,ly,{size:12.5,color:C.muted}); lx+=125;
  box(lx,ly-10,12,12,{fill:C.cuda,r:2}); txt('SM busy',lx+18,ly,{size:12.5,color:C.muted});
}

// ---------- Figure: one SM ----------
function drawSM(t){
  box(40,20,820,565,{fill:C.die,stroke:C.line,lw:2,r:6});
  txt('Streaming Multiprocessor · 1 of 132',60,48,{size:17,weight:700});
  txt('4 sub-partitions · 128 CUDA cores · 4 Tensor Cores',840,48,{size:12.5,align:'right',color:C.muted,font:'mono'});
  const pw=(780-15)/2, ph=190;
  for(let p=0;p<4;p++){
    const x0=60+(p%2)*(pw+15), y0=65+Math.floor(p/2)*(ph+12);
    box(x0,y0,pw,ph,{fill:C.surface,stroke:C.line,r:5});
    const local=t/0.7+p*0.27, c=Math.floor(local), f=local-c;
    const isT = hash(c*7+p*3+1)<0.4;
    const flash = Math.sin(Math.PI*clamp(f/0.8,0,1));
    box(x0+8,y0+8,pw-16,26,{fill:A(C.warp,.12+Math.max(0,1-f*3)*.35),stroke:A(C.warp,.5),r:3});
    const wn=Math.floor(hash(c*11+p*97)*16);
    txt('Sub-partition '+p+' · scheduler',x0+16,y0+26,{size:12.5,weight:600});
    txt(`warp ${wn} · ${isT?'MMA (matrix)':'FFMA (fp32)'}`,x0+pw-16,y0+26,{size:12,align:'right',font:'mono',color:isT?C.tensor:C.cuda});
    const by=y0+42, bh=140;
    box(x0+8,by,66,bh,{fill:A(C.mem,.08),stroke:A(C.mem,.5),r:3});
    for(let k=1;k<10;k++) line(x0+14,by+k*13,x0+68,by+k*13,A(C.mem,.25),1);
    txt('Registers',x0+41,by+bh-20,{size:11,align:'center',weight:500});
    txt('64 KB',x0+41,by+bh-7,{size:11,align:'center',font:'mono',color:C.muted});
    const gx=x0+82, gwid=186, cw=(gwid-7*3)/8, ch=(bh-18-3*3)/4;
    for(let r=0;r<4;r++)for(let k=0;k<8;k++){
      const on=!isT?flash:0;
      box(gx+k*(cw+3),by+r*(ch+3),cw,ch,{fill:on>0.02?A(C.cuda,.18+on*.75):A(C.cuda,.14),r:2});
    }
    txt('32 CUDA cores = 32 lanes',gx,by+bh-3,{size:11,color:C.muted});
    const tx=x0+276, tw=pw-284, tOn=isT?flash:0;
    box(tx,by,tw,bh,{fill:A(C.tensor,.1+tOn*.6),stroke:A(C.tensor,.7),r:4});
    const gs=Math.min(13,(tw-24)/4);
    for(let r=0;r<4;r++)for(let k=0;k<4;k++){
      const sh=isT?0.3+0.7*Math.abs(Math.sin(t*6+r+k)):0.25;
      box(tx+tw/2-2*gs+k*gs+1,by+18+r*gs,gs-2,gs-2,{fill:A(C.tensor,sh*(.4+tOn*.6)+.15),r:1});
    }
    txt('Tensor',tx+tw/2,by+bh-24,{size:12,align:'center',weight:600});
    txt('Core',tx+tw/2,by+bh-9,{size:12,align:'center',weight:600});
  }
  const sy=475;
  box(60,sy,780,92,{fill:A(C.mem,.12),stroke:A(C.mem,.6),r:5});
  txt('L1 data cache / Shared memory',80,sy+34,{size:16,weight:600});
  txt('256 KB of SRAM shared by all 4 sub-partitions · up to 228 KB usable as shared memory',80,sy+58,{size:12.5,color:C.muted});
  box(700,sy+14,124,62,{fill:C.surface,stroke:A(C.mem,.6),r:4});
  txt('TMA',762,sy+40,{size:15,align:'center',weight:700});
  txt('async tile copies',762,sy+60,{size:11,align:'center',color:C.muted});
  for(let p=0;p<4;p++){
    const x0=60+(p%2)*(pw+15), y0=65+Math.floor(p/2)*(ph+12), rx=x0+41, ry=y0+182;
    for(let j=0;j<2;j++){ const u=((t*0.7)+p*0.23+j*.5)%1; dot(rx+(j?8:-8),lerp(sy,ry,u),3.2,A(C.mem,u<.9?1:(1-u)*10)); }
  }
}

// ---------- Figure: threads -> warps -> lanes ----------
function drawMapping(t){
  const lt=t%18, GX=58, PX=11, SQ=8.4, RY=112, RH=27;
  const SPX=468, SPW=414, LX=SPX+50, LP=11, spY=k=>58+k*130;
  const TA=3.4, TB=6.6, CYC=1.1;
  const phase = lt<TA?0: lt<TB?1:2;
  const qPos=w=>({x:LX, y:spY(w%4)+30+Math.floor(w/4)*15});
  txt('Software · your thread block',22,30,{size:15,weight:700,color:C.warp});
  txt('256 threads, threadIdx.x = 0 … 255',22,48,{size:12,font:'mono',color:C.muted});
  txt('Hardware · one SM',SPX,30,{size:15,weight:700,color:C.cuda});
  txt('4 sub-partitions, each with 32 FP32 lanes',SPX,48,{size:12,font:'mono',color:C.muted});
  txt('lane 0',GX,RY-9,{size:11,font:'mono',color:C.muted});
  txt('lane 31',GX+31*PX+SQ,RY-9,{size:11,font:'mono',color:C.muted,align:'right'});
  const showW=clamp((lt-1)/0.8,0,1);
  const c = phase===2? Math.floor((lt-TB)/CYC) : -1, f = phase===2? ((lt-TB)/CYC)%1 : 0;
  const flash = Math.sin(Math.PI*clamp(f/0.85,0,1));
  const running = k => c<0? -1 : (c%2===0? k : k+4);
  for(let w=0;w<8;w++){
    const y=RY+w*RH, fs=clamp((lt-TA-w*0.17)/1.1,0,1), fl=ease(fs), q=qPos(w);
    txt('W'+w,22,y+13,{size:12,font:'mono',weight:500,color:showW>0.5?C.warp:C.muted});
    if(showW>0) box(GX-3,y-3,31*PX+SQ+6,24,{stroke:A(C.warp,.7*showW),r:3});
    for(let j=0;j<32;j++){
      const special = w===1&&j===20, base = special? C.mem : A(C.warp,.55);
      if(fs<=0){ box(GX+j*PX,y,SQ,18,{fill:base,r:1.5}); continue; }
      box(GX+j*PX,y,SQ,18,{fill:special?A(C.mem,.25):A(C.warp,.12),r:1.5});
      if(fs<1) box(lerp(GX+j*PX,q.x+j*LP,fl),lerp(y,q.y,fl),lerp(SQ,8.6,fl),lerp(18,10,fl),{fill:base,r:1.5});
    }
    if(w===1 && phase===0 && lt>1.6) txt('← thread 52: W1, lane 20',GX+20*PX+14,y+14,{size:11.5,font:'mono',color:C.mem,weight:500});
  }
  if(phase>=1){ for(let w=0;w<8;w++) txt('→ SP '+(w%4),GX+31*PX+SQ+8,RY+w*RH+13,{size:11,font:'mono',color:A(C.muted,clamp((lt-TA)/0.6,0,1))}); }
  for(let k=0;k<4;k++){
    const y0=spY(k), run=running(k);
    box(SPX,y0,SPW,120,{fill:C.surface,stroke:C.line,r:5});
    txt('Sub-partition '+k,SPX+10,y0+19,{size:13,weight:600});
    if(run>=0) txt('scheduler picks W'+run,SPX+SPW-10,y0+19,{size:12,font:'mono',align:'right',color:C.cuda,weight:500});
    else txt('warp scheduler',SPX+SPW-10,y0+19,{size:12,font:'mono',align:'right',color:C.muted});
    for(let s=0;s<2;s++){
      const w=k+s*4, qy=y0+30+s*15, arrived = lt>=TA+w*0.17+1.1;
      txt('W'+w,SPX+10,qy+9,{size:11,font:'mono',color:w===run?C.cuda:C.muted,weight:w===run?600:400});
      for(let j=0;j<32;j++){
        let col=A(C.line,.45);
        if(arrived){ col = (w===1&&j===20)? C.mem : w===run? A(C.cuda,.5+.5*flash) : A(C.warp,.45); }
        box(LX+j*LP,qy,8.6,10,{fill:col,r:1.5});
      }
    }
    const ly=y0+68;
    if(run>=0){ const qy=y0+30+(run>=4?15:0)+10; for(let j=0;j<32;j++) line(LX+j*LP+4.3,qy+1,LX+j*LP+4.3,ly-1,A(C.cuda,.18+.3*flash),1); }
    txt('lanes',SPX+10,ly+15,{size:11,font:'mono',color:C.muted});
    for(let j=0;j<32;j++){
      let col=A(C.cuda,.15);
      if(run>=0) col = (run===1&&j===20)? C.mem : A(C.cuda,.25+.7*flash);
      box(LX+j*LP,ly,8.6,22,{fill:col,r:1.5});
    }
    txt('0',LX+4.3,ly+36,{size:10.5,font:'mono',color:C.muted,align:'center'});
    txt('20',LX+20*LP+4.3,ly+36,{size:10.5,font:'mono',color:k===1?C.mem:C.muted,align:'center'});
    txt('31',LX+31*LP+4.3,ly+36,{size:10.5,font:'mono',color:C.muted,align:'center'});
    txt('32 CUDA cores',LX+10*LP,ly+36,{size:10.5,color:C.muted,align:'center'});
  }
  const cy=RY+8*RH+22;
  ['1 · Threads become warps','2 · Warps go to sub-partitions','3 · Warps take turns on the lanes']
    .forEach((s_,i)=>txt(s_,22,cy+i*20,{size:12.5,font:'mono',weight:i===phase?600:400,color:i===phase?C.ink:A(C.muted,.7)}));
  const cap=[
    'Every 32 consecutive threads form a warp. A thread\'s lane is its position in the warp: lane = threadIdx.x % 32.',
    'Each warp is handed to one sub-partition and stays there until it finishes. 8 warps, 4 sub-partitions: 2 warps each.',
    'Each cycle, each scheduler picks ONE of its warps. Its 32 threads run on the 32 lanes, lane i on lane i. Next cycle the other warp uses the same lanes.'
  ];
  wrap(cap[phase],22,cy+78,410,20,{size:13.5});
  if(phase===2) txt(c>=0&&running(1)===1?'Now: thread 52 is running on lane 20':'Now: warp 1 waits; warp 5 has the lanes',22,cy+168,{size:12.5,font:'mono',color:C.mem,weight:500});
}

// ---------- Figure: warps hide latency ----------
let warpsN = 2;
function simWarps(N, upto){
  const L=12, ready=new Array(N).fill(0), pc=new Array(N).fill(0), hist=[]; let rrp=0;
  for(let c=0;c<=upto;c++){
    let pick=-1; for(let k=0;k<N;k++){const i=(rrp+k)%N; if(ready[i]<=c){pick=i;break;}}
    if(pick<0){hist.push(null);continue;}
    const op=pc[pick]%3; ready[pick]= op===2? c+1+L : c+1; pc[pick]++; rrp=(pick+1)%N; hist.push({w:pick,op});
  }
  return {ready,hist,L};
}
function drawWarps(t){
  const CPS=2.6, tt=t%120, cyc=Math.floor(tt*CPS), f=tt*CPS-cyc;
  const {ready,hist,L}=simWarps(warpsN,cyc);
  const cur=hist[cyc], N=warpsN, rh=Math.min(31, 470/N), y0=78;
  txt('Warps waiting on one sub-partition',40,52,{size:15,weight:700});
  txt('each row = 1 warp · its 32 bars = threads in lanes 0–31',40,70,{size:11.5,color:C.muted,font:'mono'});
  const opName=['FFMA','FFMA','LOAD (HBM)'];
  for(let i=0;i<N;i++){
    const y=y0+i*rh, issuing=cur&&cur.w===i, stallLeft=Math.max(0,ready[i]-(cyc+1));
    txt('W'+i,40,y+rh/2+4,{size:12,font:'mono',color:issuing?C.ink:C.muted,weight:issuing?600:400});
    const th=Math.min(18,rh-6);
    for(let j=0;j<32;j++){
      const col = issuing? A(C.cuda,.55+.45*Math.sin(Math.PI*Math.min(1,f*1.3))) : stallLeft>0? A(C.mem,.32) : A(C.warp,.5);
      box(78+j*10.6,y+(rh-th)/2,7.6,th,{fill:col,r:1.5});
    }
    if(!issuing && stallLeft>0) box(78,y+(rh-th)/2+th-3,32*10.6*(stallLeft/L),3,{fill:C.mem,r:1});
    const st = issuing? 'issuing '+opName[cur.op] : stallLeft>0? `waiting on memory · ${stallLeft}` : 'ready';
    if(rh>=17) txt(st,425,y+rh/2+4,{size:11.5,font:'mono',color:issuing?C.cuda:stallLeft>0?C.mem:C.warp});
    if(issuing){ line(545,y+rh/2,575,y+rh/2,C.cuda,2); line(575,y+rh/2,575,125,C.cuda,2); line(575,125,585,125,C.cuda,2); }
  }
  box(585,78,280,95,{fill:C.surface,stroke:cur?C.cuda:C.idle,lw:2,r:5});
  txt('Warp scheduler · cycle '+cyc,600,102,{size:13,weight:600});
  if(cur){ txt('Issuing W'+cur.w,600,135,{size:22,weight:700,color:C.cuda}); txt(opName[cur.op]+': 32 threads on 32 lanes',600,158,{size:12,font:'mono',color:C.muted}); }
  else { txt('IDLE',600,135,{size:22,weight:700,color:C.idle}); txt('every warp is waiting on memory',600,158,{size:12,font:'mono',color:C.muted}); }
  txt('Issue slot, last 36 cycles',585,205,{size:12.5,color:C.muted});
  const n=36, cw=280/n;
  for(let k=0;k<n;k++){ const c=cyc-n+1+k; const col = c<0? A(C.line,.6) : hist[c]? C.cuda : C.idle; box(585+k*cw,215,cw-1.4,28,{fill:col,r:1.5}); }
  const win=Math.min(60,cyc+1); let used=0; for(let c=cyc-win+1;c<=cyc;c++) if(hist[c]) used++;
  const util = used/win;
  if (cyc < 15) { txt('…',585,320,{size:58,weight:700,color:C.muted}); txt('measuring the first cycles',585,345,{size:13,color:C.muted}); }
  else { txt(Math.round(util*100)+'%',585,320,{size:58,weight:700,color:util>.95?C.cuda:util>.5?C.warp:C.idle});
  txt('of the last '+win+' cycles did useful work',585,345,{size:13,color:C.muted}); }
  txt('Each warp: 2 math ops, then a load',585,395,{size:12.5});
  txt(`that stalls ${L} cycles. Warps needed`,585,414,{size:12.5});
  txt(`to fill every cycle ≈ (3+${L}) ÷ 3 = ${Math.ceil((3+L)/3)}`,585,433,{size:12.5,weight:600});
  [[C.cuda,'issuing'],[C.warp,'ready'],[C.mem,'stalled on memory'],[C.idle,'idle cycle']].forEach((e,i)=>{
    const x=585+(i%2)*140, y=500+Math.floor(i/2)*22; box(x,y-10,12,12,{fill:e[0],r:2}); txt(e[1],x+18,y,{size:12,color:C.muted}); });
}

// ---------- Figure: CUDA cores vs Tensor Cores ----------
function drawCores(t){
  const lt=t%10.5, clk=Math.floor(lt*16);
  [
    {x:40, title:'32 CUDA cores', sub:'one sub-partition = 32 lanes · FMA', op:'d = a × b + c   (one number each)', rate:2, total:128, col:C.cuda, fma:32, lanes:true},
    {x:470, title:'1 Tensor Core', sub:'the same sub-partition · MMA', op:'D = A × B + C   (a whole tile)', rate:32, total:8, col:C.tensor, fma:512},
  ].forEach(p=>{
    txt(p.title,p.x,48,{size:18,weight:700,color:p.col});
    txt(p.sub,p.x,68,{size:12,color:C.muted});
    txt(p.op,p.x,92,{size:12.5,font:'mono'});
    const gx=p.x+45, gy=110, cs=17.6, s=cs-1.5;
    if(p.lanes){
      // CUDA cores: each of the 32 lanes owns one output square and adds one product per clock.
      // 32 squares fill together over 16 clocks (K = 16), then the next 32 start: 8 rounds.
      const c2=Math.min(clk,p.total), round=Math.min(7,Math.floor(c2/16)), step=c2>=p.total?16:c2%16;
      const lo=round*32, hi=lo+32, fin=c2>=p.total;
      for(let i=0;i<256;i++){
        const r=Math.floor(i/16), c=i%16, x=gx+c*cs, y=gy+r*cs;
        if(i<lo || (fin && i<hi)) box(x,y,s,s,{fill:A(p.col,.42),r:1.5});
        else if(i<hi){
          box(x,y,s,s,{fill:A(p.col,.12),r:1.5});
          const h=s*step/16; if(h>0) box(x,y+s-h,s,h,{fill:p.col,r:1.5});
        } else box(x,y,s,s,{fill:A(p.col,.08),r:1.5});
      }
      if(!fin){
        const ry=gy+round*2*cs;
        box(gx-3,ry-2,16*cs+4.5,2*cs+2.5,{stroke:p.col,lw:1.5,r:3});
        txt('← lanes 0–15',gx+16*cs+8,ry+cs*.5+4,{size:11,color:p.col,weight:600});
        txt('← lanes 16–31',gx+16*cs+8,ry+cs*1.5+4,{size:11,color:p.col,weight:600});
      }
      txt('round '+(round+1)+' of 8 · each lane on product '+step+' of 16',gx,gy+16*cs+38,{size:11.5,font:'mono',color:p.col});
    } else {
      const done=Math.min(256, clk*p.rate);
      for(let i=0;i<256;i++){
        const r=Math.floor(i/16), c=i%16;
        let col=A(p.col,.08);
        if(i<done) col = i>=done-p.rate && clk<=p.total ? p.col : A(p.col,.42);
        box(gx+c*cs,gy+r*cs,s,s,{fill:col,r:1.5});
      }
      txt('512 FMAs per clock = 32 squares’ worth',gx,gy+16*cs+38,{size:11.5,font:'mono',color:p.col});
    }
    box(gx-1,gy-1,16*cs+.5,16*cs+.5,{stroke:C.line,r:2});
    txt('16 × 16 output tile · 1 square = 1 output = 16 FMAs',gx,gy+16*cs+18,{size:11.5,color:C.muted});
    txt('clock',gx,466,{size:12,color:C.muted});
    txt(String(Math.min(clk,p.total)).padStart(3,' '),gx+42,466,{size:22,font:'mono',weight:500});
    txt('/ '+p.total,gx+96,466,{size:13,font:'mono',color:C.muted});
    txt('FMAs '+fmt(Math.min(4096,clk*p.fma))+' / 4,096',gx+160,466,{size:12,font:'mono',color:C.muted});
    if(clk>=p.total) txt('✓ done in '+p.total+' clocks',gx,490,{size:13,weight:600,color:p.col});
  });
  const by=515; txt('Multiply-adds per clock, per SM',40,by,{size:13,weight:600});
  const wmax=690;
  box(160,by+12,wmax*128/2048,18,{fill:C.cuda,r:2}); txt('CUDA (FP32)',40,by+26,{size:12,color:C.muted}); txt('128',165+wmax*128/2048,by+26,{size:12,font:'mono'});
  box(160,by+40,wmax,18,{fill:C.tensor,r:2}); txt('Tensor (FP16)',40,by+54,{size:12,color:C.muted}); txt('2,048  (16×)',wmax+150,by+54,{size:12,font:'mono',align:'right',color:C.surface,weight:600});
}

// ---------- Figure: memory hierarchy ----------
function drawMemory(t){
  const CPS=95, cyc=(t%8.4)*CPS;
  box(30,60,115,470,{fill:A(C.cuda,.1),stroke:A(C.cuda,.6),r:6});
  txt('SM',87,280,{size:22,weight:700,align:'center'});
  txt('cores',87,302,{size:12,align:'center',color:C.muted});
  txt('work here',87,318,{size:12,align:'center',color:C.muted});
  txt('cycles since request: '+Math.floor(cyc),870,36,{size:12.5,font:'mono',align:'right',color:C.muted});
  line(20,410,880,410,C.muted,1.2,[6,5]);
  txt('▲ on-chip SRAM',160,402,{size:12,color:C.muted,font:'mono'});
  txt('▼ off-chip DRAM, stacked beside the die',160,428,{size:12,color:C.muted,font:'mono'});
  [
    {name:'Registers',cap:'256 KB per SM',lat:1,y:85,lw:12,ana:'in your hands'},
    {name:'Shared mem / L1',cap:'256 KB per SM',lat:30,y:195,lw:10,ana:'on your desk'},
    {name:'L2 cache',cap:'50 MB, whole chip',lat:260,y:305,lw:7,ana:'bookshelf down the corridor'},
    {name:'HBM3',cap:'80 GB · 3.35 TB/s',lat:600,y:450,lw:4.5,ana:'warehouse across town'},
  ].forEach(r=>{
    const cy=r.y+38, x1=150, x2=605;
    line(x1,cy,x2,cy,A(C.mem,.25),r.lw);
    txt(r.ana,x1+12,cy-14,{size:12,color:C.muted});
    box(605,r.y,265,76,{fill:C.surface,stroke:C.line,r:5});
    txt(r.name,620,r.y+26,{size:15,weight:600});
    txt(r.cap,620,r.y+46,{size:12,font:'mono',color:C.muted});
    txt('≈ '+r.lat+(r.lat===1?' cycle':' cycles'),620,r.y+64,{size:12,font:'mono',color:C.mem,weight:500});
    const u=cyc/r.lat;
    if(u<1){ const x = u<.5? lerp(x1,x2,u*2) : lerp(x2,x1,(u-.5)*2); dot(x,cy,7,C.mem); dot(x,cy,11,A(C.mem,.2)); }
    else { dot(x1+6,cy,6,C.cuda); txt('✓ back',x1+16,cy+18,{size:12,color:C.cuda,weight:600}); }
  });
}

// ---------- Figure: roofline ----------
let ai = 1;
const PEAK=989, BW=3.35, RIDGE=PEAK/BW;
function drawRoof(t){
  const ach=Math.min(PEAK,BW*ai), comp=ach/PEAK, mem=Math.min(1,PEAK/(BW*ai)), memBound = ai<RIDGE;
  txt(ach>=100?fmt(Math.round(ach)):ach>=10?ach.toFixed(1):ach.toFixed(2),30,78,{size:46,weight:700,color:memBound?C.mem:C.tensor});
  txt('TFLOPS achievable at this intensity',30,102,{size:13,color:C.muted});
  txt(memBound?'MEMORY-BOUND':'COMPUTE-BOUND',30,130,{size:15,font:'mono',weight:600,color:memBound?C.mem:C.tensor});
  box(30,230,100,150,{fill:A(C.mem,.12),stroke:A(C.mem,.7),r:5});
  for(let k=1;k<9;k++) line(38,240+k*13,122,240+k*13,A(C.mem,.3),1);
  txt('HBM3',80,365,{size:14,align:'center',weight:600});
  box(130,290,140,30,{fill:A(C.mem,.08),stroke:A(C.mem,.5),r:3});
  txt('3.35 TB/s',200,282,{size:12,align:'center',font:'mono',color:C.muted});
  const off=(t*90)%18;
  for(let k=-1;k<9;k++){ const x=130+off+k*18; if(x<132||x>266) continue; const id=Math.floor((t*90)/18)-k; if(hash(id*3+1)<mem) dot(x,305,5,C.mem); }
  box(270,170,150,270,{fill:A(C.tensor,.08+comp*.25),stroke:A(C.tensor,.7),r:6});
  txt('Tensor Cores',345,196,{size:14,align:'center',weight:600});
  txt('peak 989',345,214,{size:12,align:'center',font:'mono',color:C.muted});
  const cx=345, cy=300, R=46, ang=t*comp*7;
  ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.strokeStyle=A(C.tensor,.6); ctx.lineWidth=2; ctx.stroke();
  for(let k=0;k<6;k++){ const a=ang+k*Math.PI/3; line(cx,cy,cx+Math.cos(a)*R,cy+Math.sin(a)*R,C.tensor,3); }
  dot(cx,cy,7,C.tensor);
  [['memory busy',mem,C.mem,470],['compute busy',comp,C.tensor,505]].forEach(g=>{
    txt(g[0],30,g[3],{size:12.5,color:C.muted});
    box(140,g[3]-12,240,14,{fill:A(g[2],.12),r:3}); box(140,g[3]-12,240*g[1],14,{fill:g[2],r:3});
    txt((g[1]*100>=10?Math.round(g[1]*100):(g[1]*100).toFixed(1))+'%',390,g[3],{size:12.5,font:'mono'});
  });
  const X0=500,X1=870,Y0=70,Y1=470, lx0=-1.3,lx1=3.7, ly0=-1,ly1=3.3;
  const sx=v=>X0+(Math.log10(v)-lx0)/(lx1-lx0)*(X1-X0), sy=v=>Y1-(Math.log10(v)-ly0)/(ly1-ly0)*(Y1-Y0);
  txt('Roofline',X0,38,{size:15,weight:700});
  txt('achievable = min(peak, bandwidth × intensity)',X0,56,{size:11.5,font:'mono',color:C.muted});
  [0.1,1,10,100,1000].forEach(v=>{ line(sx(v),Y0,sx(v),Y1,A(C.line,.9),1); txt(v>=1?fmt(v):String(v),sx(v),Y1+16,{size:11,align:'center',font:'mono',color:C.muted}); });
  [1,10,100,1000].forEach(v=>{ line(X0,sy(v),X1,sy(v),A(C.line,.9),1); txt(fmt(v),X0-6,sy(v)+4,{size:11,align:'right',font:'mono',color:C.muted}); });
  box(X0,Y0,X1-X0,Y1-Y0,{stroke:C.line,r:0});
  txt('FLOPs per byte (log)',(X0+X1)/2,Y1+36,{size:12,align:'center',color:C.muted});
  ctx.save(); ctx.translate(X0-40,(Y0+Y1)/2); ctx.rotate(-Math.PI/2); txt('TFLOPS (log)',0,0,{size:12,align:'center',color:C.muted}); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(X0,Y0,X1-X0,Y1-Y0); ctx.clip();
  ctx.beginPath(); ctx.moveTo(sx(0.05),sy(BW*0.05)); ctx.lineTo(sx(RIDGE),sy(PEAK)); ctx.lineTo(sx(5000),sy(PEAK));
  ctx.strokeStyle=C.ink; ctx.lineWidth=2.5; ctx.stroke(); ctx.restore();
  line(sx(RIDGE),sy(PEAK),sx(RIDGE),Y1,C.muted,1,[4,4]);
  txt('ridge ≈ 295',sx(RIDGE)+5,Y1-8,{size:11.5,font:'mono',color:C.muted});
  txt('memory roof',X0+10,Y0+80,{size:11.5,color:C.mem,font:'mono'}); txt('3.35 TB/s × intensity',X0+10,Y0+96,{size:11.5,color:C.mem,font:'mono'});
  txt('compute roof: 989',X1-6,sy(PEAK)-8,{size:11.5,color:C.tensor,font:'mono',align:'right'});
  [[0.0833,'vec add'],[1,'decode b1'],[64,'decode b64'],[2731,'GEMM']].forEach(([v,l])=>{
    const y=sy(Math.min(PEAK,BW*v)); dot(sx(v),y,3.5,C.muted); txt(l,sx(v)+(v>1000?-6:6),y+16,{size:10.5,color:C.muted,align:v>1000?'right':'left'}); });
  const px=sx(ai), py=sy(ach);
  line(px,py,px,Y1,A(memBound?C.mem:C.tensor,.6),1);
  dot(px,py,9,A(memBound?C.mem:C.tensor,.25)); dot(px,py,5.5,memBound?C.mem:C.tensor);
}

// ---------- Figure: tiled GEMM ----------
function drawMatmul(t){
  const P=1.5, loop=P*5+1.4, lt=t%loop, idx=Math.floor(t/loop)%16, R=Math.floor(idx/4)%4, Cc=(idx*3)%4;
  const kl = lt<4*P ? Math.floor(lt/P) : -1;
  const kc = lt>=P && lt<5*P ? Math.floor(lt/P)-1 : -1;
  const doneK = Math.min(4, Math.max(0, Math.floor(lt/P)-1 + (kc>=0? (lt%P)/P:0)));
  txt('C = A × B',40,46,{size:18,weight:700});
  txt('this thread block owns the outlined C tile',40,66,{size:12,color:C.muted});
  txt('B',190,104,{size:14,weight:600,align:'right'});
  for(let k=0;k<4;k++)for(let c=0;c<4;c++){
    const hl=c===Cc; let f=A(C.cuda,hl?.18:.07);
    if(hl&&k===kc) f=A(C.tensor,.55); else if(hl&&k===kl) f=A(C.mem,.45);
    box(200+c*60,90+k*30,58,28,{fill:f,r:2});
  }
  txt('A',50,238,{size:14,weight:600,align:'right'});
  for(let r=0;r<4;r++)for(let k=0;k<4;k++){
    const hl=r===R; let f=A(C.warp,hl?.18:.07);
    if(hl&&k===kc) f=A(C.tensor,.55); else if(hl&&k===kl) f=A(C.mem,.45);
    box(60+k*32,225+r*60,30,58,{fill:f,r:2});
  }
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){
    const x=200+c*60, y=225+r*60, me=r===R&&c===Cc;
    box(x,y,58,58,{fill:me?A(C.tensor,.1+doneK/4*.7):A(C.line,.35),r:2});
    if(me) box(x-2,y-2,62,62,{stroke:C.ink,lw:2,r:3});
  }
  txt('C',190,238,{size:14,weight:600,align:'right'});
  txt(lt>=5*P?'tile finished → write to HBM':kc>=0?`k-step ${kc+1} of 4 · computing`:'loading first tiles',200,490,{size:13,font:'mono',color:lt>=5*P?C.tensor:C.ink});
  txt('Per k-step: 128×128 tile, k-chunk 64, BF16',40,530,{size:12,color:C.muted});
  txt('loads 32 KB · does 2.1 M FLOPs → 64 FLOP/B',40,550,{size:12.5,font:'mono'});
  txt('naive, no tiling: 0.5 FLOP/B',40,570,{size:12.5,font:'mono',color:C.muted});
  const st=[
    {n:'Tensor Cores',s:'MMA into registers',y:60},
    {n:'Registers',s:'operand fragments',y:150},
    {n:'Shared memory',s:'2 buffers: load one, compute other',y:240},
    {n:'L2 cache',s:'neighbour blocks reuse tiles',y:345},
    {n:'HBM3',s:'A, B, C live here',y:450},
  ];
  const sxL=520, sw=350;
  [['MMA',105],['load fragments',195],['TMA async copy',300],['',405]].forEach(([l,y])=>{ line(sxL+sw/2,y,sxL+sw/2,y+30,C.line,2); if(l) txt(l,sxL+sw/2+10,y+20,{size:11,font:'mono',color:C.muted}); });
  st.forEach((s,i)=>{
    const glow = (i===0&&kc>=0)? .35+.25*Math.sin(lt*12) : 0;
    box(sxL,s.y,sw,46,{fill:glow?A(C.tensor,glow):C.surface,stroke:i===0?A(C.tensor,.7):C.line,r:4});
    txt(s.n,sxL+12,s.y+20,{size:14,weight:600});
    txt(s.s,sxL+12,s.y+37,{size:11.5,color:C.muted});
  });
  for(let b=0;b<2;b++){
    const bx=sxL+sw-112+b*52, full = (kc>=0 && kc%2===b) || (kl>=0 && kl%2===b && (lt%P)/P>.85);
    box(bx,248,46,30,{fill:full?A(C.mem,.45):A(C.line,.5),stroke:C.line,r:3});
  }
  if(kl>=0){
    const u=ease((lt%P)/P*1.12), y=lerp(473,262,u), bx=sxL+sw-89+(kl%2)*52;
    box(bx-16,y-9,14,18,{fill:C.warp,r:2}); box(bx+2,y-9,14,18,{fill:C.cuda,r:2});
    if(u<.98) dot(bx,y,13,A(C.mem,.18));
  }
  if(kc>=0){
    const f=((lt%P)/P*4)%1;
    for(let j=0;j<3;j++){ const ff=(f+j/3)%1; dot(sxL+150+j*24,lerp(262,85,ff),4.5,A(C.tensor,1-ff*.5)); }
  }
  if(lt>=5*P){ const u=ease((lt-5*P)/1.3); box(sxL+140,lerp(83,473,u)-10,20,20,{fill:C.tensor,r:2}); }
}

// ---------- mounting ----------
// Base pace per figure (1 = original speed). Chosen so each event can be
// followed by eye: a block dispatch, one scheduler issue, one k-step.
const PACE = {cpu:1, chip:0.35, sm:0.45, threads:0.55, warps:0.4, cores:0.5, memory:0.6, roofline:0.6, matmul:0.5};
const DRAW = {cpu:drawCPU, chip:drawChip, sm:drawSM, threads:drawMapping, warps:drawWarps, cores:drawCores, memory:drawMemory, roofline:drawRoof, matmul:drawMatmul};
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
  for (const k of ['surface','die','sm','line','ink','muted','cuda','tensor','warp','mem','idle']) o[k] = s.getPropertyValue('--g-'+k).trim();
  o.light = el.classList.contains('light');
  return o;
}
function el(tag, attrs, html){ const e=document.createElement(tag); for(const k in (attrs||{})) e.setAttribute(k, attrs[k]); if(html!=null) e.innerHTML=html; return e; }

function mount(fig){
  const id = fig.dataset.fig, draw = DRAW[id]; if (!draw) return;
  const st = {fig, draw, t: reduced?3:0, playing: !reduced, visible: false, canvas:null, theme:null, pace: PACE[id]||0.5, speed: 1};
  const scroll = el('div',{class:'gf-scroll'}), boxEl = el('div',{class:'gf-box'});
  const cv = el('canvas',{role:'img','aria-label':fig.getAttribute('aria-label')||'Animated diagram'});
  boxEl.appendChild(cv); scroll.appendChild(boxEl); st.canvas = cv;
  const cap = fig.querySelector('figcaption');
  fig.insertBefore(scroll, cap);
  // phones: the figure fits the column; tapping opens it full screen, turned sideways
  const expand = el('button',{class:'gf-expand',type:'button','aria-label':'Enlarge figure'}, '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>Full screen');
  expand.addEventListener('click', () => openFull(st, expand));
  cv.addEventListener('click', () => { if (narrow.matches) openFull(st, expand); });

  // optional controls
  if (id === 'cpu') {
    const ctl = el('div',{class:'gf-ctl'});
    ctl.appendChild(el('span',{class:'gf-speed-label'},'Workload'));
    const opts = [['both','Both, in turn'],['chain','Dependent chain'],['par','Independent items']];
    const chips = opts.map(([v,l])=>{ const b=el('button',{class:'gf-chip',type:'button','aria-pressed':String(v==='both')}, l); b.addEventListener('click',()=>{ cpuMode=v; st.t=0; chips.forEach(x=>x.setAttribute('aria-pressed', String(x===b))); }); ctl.appendChild(b); return b; });
    fig.insertBefore(ctl, cap);
  }
  if (id === 'warps') {
    const ctl = el('div',{class:'gf-ctl'});
    ctl.innerHTML = `<label>Warps per scheduler <input type="range" min="1" max="16" step="1" value="2" aria-label="Warps per scheduler"><output>2 warps</output></label>`;
    const inp = ctl.querySelector('input'), out = ctl.querySelector('output');
    const chips = [1,2,5,16].map(n=>{ const b=el('button',{class:'gf-chip',type:'button'}, n===16?'16 (max)':n+(n===1?' warp':' warps')); b.dataset.v=n; ctl.appendChild(b); return b; });
    const set = n => { warpsN=n; inp.value=n; out.textContent=n+(n===1?' warp':' warps'); st.t=0; chips.forEach(b=>b.setAttribute('aria-pressed', String(+b.dataset.v===n))); };
    inp.addEventListener('input',()=>set(parseInt(inp.value,10)));
    chips.forEach(b=>b.addEventListener('click',()=>set(+b.dataset.v)));
    set(2); fig.insertBefore(ctl, cap);
  }
  if (id === 'roofline') {
    const ctl = el('div',{class:'gf-ctl'});
    ctl.innerHTML = `<label>Arithmetic intensity <input type="range" min="-1.3" max="3.6" step="0.01" value="0" aria-label="Arithmetic intensity, log scale"><output>1 FLOP/B</output></label>`;
    const inp = ctl.querySelector('input'), out = ctl.querySelector('output');
    const presets = [[0.0833,'Vector add'],[1,'LLM decode, batch 1'],[64,'Decode, batch 64'],[2731,'Big GEMM 8192³']];
    const chips = presets.map(([v,l])=>{ const b=el('button',{class:'gf-chip',type:'button'}, l); b.dataset.v=v; ctl.appendChild(b); return b; });
    const set = v => { ai=v; inp.value=Math.log10(v).toFixed(2); out.textContent=(v<1?v.toFixed(2):v<10?v.toFixed(1):fmt(Math.round(v)))+' FLOP/B'; chips.forEach(b=>b.setAttribute('aria-pressed', String(Math.abs(+b.dataset.v-v)<1e-6))); };
    inp.addEventListener('input',()=>set(Math.pow(10,parseFloat(inp.value))));
    chips.forEach(b=>b.addEventListener('click',()=>set(+b.dataset.v)));
    set(1); fig.insertBefore(ctl, cap);
  }

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
  // optional explainer: a <div class="fig-info" hidden> inside the figure, toggled by an ⓘ button
  const info = fig.querySelector('.fig-info');
  if (info) {
    const id = 'info-' + (fig.dataset.fig || Math.random().toString(36).slice(2));
    info.id = id; info.hidden = true;
    const ib = el('button',{class:'gf-link gf-info',type:'button','aria-expanded':'false','aria-controls':id},
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6" stroke-linecap="round"/><circle cx="12" cy="7.6" r="1.1" fill="currentColor" stroke="none"/></svg>Explain step by step');
    ib.addEventListener('click', () => {
      const open = info.hidden; info.hidden = !open;
      ib.setAttribute('aria-expanded', String(open));
      ib.lastChild.textContent = open ? 'Hide explanation' : 'Explain step by step';
    });
    bar.insertBefore(ib, expand);
    bar.after(info);
  }

  applyTheme(st);
  figs.push(st);
}

function render(st){
  // layout size (not the on-screen box), so a rotated full-screen canvas still scales right
  const cv = st.canvas, r = {width: cv.clientWidth, height: cv.clientHeight};
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  const w = Math.max(1, Math.round(r.width*dpr)), h = Math.max(1, Math.round(r.height*dpr));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  ctx = cv.getContext('2d'); scale = r.width / W;
  Object.assign(C, st.theme);
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,w,h);
  ctx.setTransform(dpr*scale,0,0,dpr*scale,0,0);
  try { st.draw(st.t); } catch (e) { console.error(e); }
}

const narrow = window.matchMedia('(max-width: 760px)');
function openFull(st, opener){
  if (st.full) return;
  const ov = el('div',{class:'gpu-fig gf-full', role:'dialog', 'aria-modal':'true', 'aria-label':'Enlarged figure'});
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
  document.querySelectorAll('figure.gpu-fig[data-fig]').forEach(mount);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { const st = figs.find(f=>f.fig===e.target); if (st) st.visible = e.isIntersecting; }), {rootMargin:'100px'});
    figs.forEach(st => io.observe(st.fig));
  } else figs.forEach(st => st.visible = true);
  figs.forEach(render);
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
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
