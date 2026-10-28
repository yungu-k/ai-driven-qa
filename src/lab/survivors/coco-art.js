// @ts-nocheck — 디자인 세션 그림 정본 docs/lab-surv-coco-art.js 를 그대로 옮긴 것. 그림을 고치면 docs 판을 고치고 다시 복사한다(tmp/lab-surv/sync-src.sh).
// 그냥 오락실 B 「코코의 하루」 — 도트 그림. 아트 디렉션은 docs/lab-surv-coco-artdir.md, 팔레트는 docs/lab-defense-artdir.md 3절만.
// 기법은 docs/lab-surv-sheep-art.js 와 같다: 픽셀 버퍼에 한 번 굽고(정수 fillRect run), 프레임별 오프스크린 캔버스에 찍어 둔다.
// 프레임마다는 drawImage 한 번(+발광은 lighter 로 한 번). document 가 없으면(node) 굽기는 첫 그리기 때로 미룬다.
// 좌표: ctx 는 카메라 변환이 끝난 월드 아트 px. (x, y) = 발 기준점(그림자 중심). 빛은 왼쪽 위.
(function (root) {
  "use strict";
  root.SurvArt = root.SurvArt || {};

  // ── 팔레트(lab-defense-artdir 3절만) ──────────────────────────────
  const INK = ["#07060f", "#0e0c1c", "#17142b", "#231e3d", "#322b52", "#463d6b", "#5f5687"];
  const SL = ["#3a3f5c", "#545b7a", "#7880a0", "#a3abc4", "#cdd3e3", "#eef1f8"];
  const GO = ["#3b1d14", "#6e2f1c", "#a8492a", "#e0743a", "#f6a94a", "#ffd86b", "#fff2b8"];
  const RD = ["#2e0a1f", "#5c1230", "#9a1d3c", "#d8324a", "#ff5e5b", "#ff9a86"];
  const PK = ["#3d1145", "#6e1f6e", "#a8329a", "#e050c0", "#ff8be0"];
  const GR = ["#0b2422", "#124638", "#1c7a50", "#36b866", "#7ee87e", "#d4ffb0"];
  const CY = ["#0b1d3a", "#123a66", "#1a68a0", "#2aa6d6", "#6ee6ff", "#c8fbff"];
  const VI = ["#1e0f3d", "#3a1a6b", "#6232b0", "#9a64f0", "#c9a4ff"];

  // 램프: [0]=외곽선, [1]=빛 받는 외곽선, lo.. = 그늘→빛
  const R_FUR = [GO[0], GO[1], GO[1], GO[2], GO[2], GO[3]];
  const R_HEADF = [GO[0], GO[1], GO[2], GO[2], GO[3], GO[4]];
  const R_EAR = [GO[0], GO[1], GO[1], GO[2], GO[2], GO[3]];
  const R_MUZ = [GO[0], GO[1], GO[2], GO[3], GO[4], GO[6]];
  const R_TEAL = [CY[0], CY[1], CY[2], CY[3], CY[4], CY[5]];
  const R_SUDS = [CY[2], CY[3], SL[3], SL[4], SL[5], CY[5]];
  const R_SLATE = [VI[1], SL[1], SL[2], SL[3], SL[4], SL[5]];
  const R_RED = [RD[0], RD[1], RD[2], RD[3], RD[4], RD[5]];
  const R_VI = [VI[0], VI[1], VI[1], VI[2], VI[3], VI[4]];
  const R_DOG = [SL[0], SL[1], SL[2], SL[3], SL[4], SL[5]];
  const R_ROBO = [INK[1], INK[3], INK[4], INK[5], SL[1], SL[2], SL[3]];
  const R_ROBOTOP = [INK[2], SL[0], SL[1], SL[2], SL[3], SL[4], SL[5]];
  const R_TUB = [SL[0], SL[1], SL[2], SL[3], SL[4], SL[5], CY[5]];
  const R_GOLD = [GO[0], GO[1], GO[2], GO[3], GO[4], GO[5], GO[6]];
  const R_BONE = [GO[1], GO[2], GO[3], GO[4], GO[5], GO[6]];
  const R_GREEN = [GR[0], GR[1], GR[2], GR[3], GR[4], GR[5]];

  // ── 픽셀 버퍼(sheep-art.js 와 같은 도구) ─────────────────────────────
  function Buf(w, h) { return { w, h, c: new Array(w * h).fill(null) }; }
  function px(b, x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= b.w || y >= b.h) return; b.c[y * b.w + x] = c; }
  function at(b, x, y) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= b.w || y >= b.h) return null; return b.c[y * b.w + x]; }
  function line(b, x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) { px(b, x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  function rect(b, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(b, x + i, y + j, c); }
  function grid(b, rows, pal, ox = 0, oy = 0) {
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const k = r[x]; if (k !== "." && pal[k]) px(b, ox + x, oy + y, pal[k]); } });
  }
  function mirror(b) { const n = Buf(b.w, b.h); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) n.c[y * b.w + (b.w - 1 - x)] = b.c[y * b.w + x]; return n; }

  const LV = (() => { const v = [-0.5, -0.62, 0.6]; const m = Math.hypot(...v); return v.map((a) => a / m); })();
  function ell(cx, cy, rx, ry, o = {}) {
    const amb = o.amb ?? 0.3, fl = o.flat ?? 1, gm = o.gamma ?? 1.35;
    return (x, y) => {
      const nx = (x - cx) / rx, ny = (y - cy) / ry, d = nx * nx + ny * ny;
      if (d > 1) return null;
      const nz = Math.sqrt(1 - d) * fl, m = Math.hypot(nx, ny, nz) || 1;
      const dot = (nx * LV[0] + ny * LV[1] + nz * LV[2]) / m;
      return { l: Math.pow(Math.max(0, Math.min(1, (dot + amb) / (1 + amb))), gm), nx, ny };
    };
  }
  function poly(pts, lfn) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    pts.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2 || 1, hh = (y1 - y0) / 2 || 1;
    return (x, y) => {
      let ins = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
      }
      if (!ins) return null;
      const nx = (x - cx) / hw, ny = (y - cy) / hh;
      return { l: lfn ? lfn(nx, ny) : Math.max(0, Math.min(1, 0.6 - nx * 0.35 - ny * 0.25)), nx, ny };
    };
  }
  function union(...fs) { return (x, y) => { let best = null; for (const f of fs) { const r = f(x, y); if (r && (!best || r.l > best.l)) best = r; } return best; }; }
  function minus(f, g) { return (x, y) => (g(x, y) ? null : f(x, y)); }
  // 돌린 모양: f 는 (0,0) 중심 지역 좌표로 정의, (cx,cy) 에 a 라디안 돌려 놓는다
  function rot(f, cx, cy, a) { const c = Math.cos(a), s = Math.sin(a); return (x, y) => { const dx = x - cx, dy = y - cy; return f(dx * c + dy * s, -dx * s + dy * c); }; }
  function rell(cx, cy, rx, ry, a, o) { return rot(ell(0, 0, rx, ry, o), cx, cy, a); }

  const BAYER = [[0, 0.5], [0.75, 0.25]];
  function blob(b, ins, ramp, o = {}) {
    const { w, h } = b, M = new Uint8Array(w * h), N = [];
    const top = ramp.length - 1, lo = o.lo ?? 1, n = top - lo + 1, dth = o.dither ?? 0.55;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const r = ins(x + 0.5, y + 0.5);
      if (!r) continue;
      const i = y * w + x; M[i] = 1; N[i] = r;
      const l = o.curve ? o.curve(r.l, r) : r.l;
      let k = Math.floor(l * n + (BAYER[y & 1][x & 1] - 0.375) * dth);
      k = Math.max(0, Math.min(n - 1, k));
      b.c[i] = ramp[lo + k];
    }
    const inM = (x, y) => x >= 0 && y >= 0 && x < w && y < h && M[y * w + x] === 1;
    if (o.rim) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!M[i]) continue; const r = N[i];
      if (!inM(x + 1, y) && r.nx > 0.3 && r.ny > -0.2 && r.ny < 0.8) b.c[i] = o.rim;
    }
    if (o.outline !== false) {
      const set = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (M[y * w + x]) continue;
        const u = inM(x, y - 1), d = inM(x, y + 1), l = inM(x - 1, y), r = inM(x + 1, y);
        if (!(u || d || l || r)) continue;
        const empty = at(b, x, y) == null;
        if (!empty && o.inner === false) continue;
        const lit = (d || r) && !(u || l);
        set.push([x, y, empty ? (lit && o.lit !== false ? ramp[1] : ramp[0]) : (o.inner || ramp[0])]);
      }
      set.forEach(([x, y, c]) => px(b, x, y, c));
    }
    return M;
  }

  // ── 굽기: 버퍼 → run → 오프스크린 캔버스 ─────────────────────────────
  function runsOf(b) {
    const runs = [];
    for (let y = 0; y < b.h; y++) {
      let x = 0;
      while (x < b.w) {
        const c = b.c[y * b.w + x];
        if (!c) { x++; continue; }
        let x2 = x + 1;
        while (x2 < b.w && b.c[y * b.w + x2] === c) x2++;
        runs.push(c, x, y, x2 - x); x = x2;
      }
    }
    return runs;
  }
  function paintRuns(ctx, runs, ox = 0, oy = 0) { for (let i = 0; i < runs.length; i += 4) { ctx.fillStyle = runs[i]; ctx.fillRect(runs[i + 1] + ox, runs[i + 2] + oy, runs[i + 3], 1); } }
  function canMake() { return typeof OffscreenCanvas !== "undefined" || (typeof document !== "undefined" && document.createElement); }
  function mkCanvas(w, h) {
    if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
    if (typeof document !== "undefined" && document.createElement) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
    return null;
  }
  function img(b) {
    const runs = runsOf(b), c = mkCanvas(b.w, b.h);
    if (c) paintRuns(c.getContext("2d"), runs);
    return { w: b.w, h: b.h, c, runs, buf: b };
  }
  function imgFn(w, h, fn) { const c = mkCanvas(w, h); if (c) fn(c.getContext("2d")); return { w, h, c, fn }; }
  function put(ctx, im, x, y) {
    if (!im) return;
    if (im.c) ctx.drawImage(im.c, x, y);
    else if (im.runs) paintRuns(ctx, im.runs, x, y);
    else if (im.fn) { ctx.save(); ctx.translate(x, y); im.fn(ctx); ctx.restore(); }
  }
  function putLit(ctx, im, x, y) {
    if (!im) return;
    const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = "lighter";
    put(ctx, im, x, y); ctx.globalCompositeOperation = op;
  }
  function lum(hex) { const n = parseInt(hex.slice(1), 16); return (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; }
  function flashOf(b, hi, mid, cut = 0.16) { const n = Buf(b.w, b.h); for (let i = 0; i < b.c.length; i++) { const c = b.c[i]; if (c) n.c[i] = lum(c) < cut ? mid : hi; } return n; }

  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`; }
  function disc(ctx, cx, cy, r, col, a) {
    ctx.fillStyle = rgba(col, a); r = Math.max(0, r);
    for (let dy = -Math.floor(r); dy <= Math.floor(r); dy++) {
      const hw = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)) + 0.35);
      ctx.fillRect(Math.round(cx) - hw, Math.round(cy) + dy, hw * 2 + 1, 1);
    }
  }
  function glow3(ctx, cx, cy, r, col, a) { disc(ctx, cx, cy, r, col, a * 0.1); disc(ctx, cx, cy, r * 0.62, col, a * 0.28); disc(ctx, cx, cy, Math.max(1, r * 0.3), col, a * 0.6); }
  function glowImg(w, h, list) { return imgFn(w, h, (c) => list.forEach(([x, y, r, col, a]) => glow3(c, x, y, r, col, a))); }
  // 1 px 계단 원 둘레 점 목록(중복 제거)
  function circlePts(cx, cy, r, a0 = 0, a1 = Math.PI * 2) {
    const out = [], seen = new Set(), n = Math.max(16, Math.ceil(Math.abs(a1 - a0) * r * 2));
    for (let i = 0; i <= n; i++) {
      const th = a0 + ((a1 - a0) * i) / n, x = Math.round(cx + Math.cos(th) * r), y = Math.round(cy + Math.sin(th) * r), k = x * 4096 + y;
      if (seen.has(k)) continue; seen.add(k); out.push([x, y, th]);
    }
    return out;
  }

  const range = (n) => Array.from({ length: n }, (_, i) => i);
  const fr = (t, fps, n) => ((Math.floor((t || 0) * fps) % n) + n) % n;
  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return (h ^ (h >>> 16)) >>> 0; }

  // 곱슬 무늬: 털 칸에 엇갈린 그늘 점
  function curl(b, M, k = 0) {
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const i = y * b.w + x; if (!M[i]) continue; const c = b.c[i];
      if (c === GO[3] && (x * 3 + y * 5 + k) % 7 === 0) b.c[i] = GO[2];
      else if (c === GO[4] && (x * 5 + y * 3 + k) % 6 === 0) b.c[i] = GO[3];
      else if (c === GO[2] && (x * 2 + y * 7 + k) % 9 === 0) b.c[i] = GO[1];
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // 코코 — 갈색(레드~애프리콧) 토이 푸들. 둥근 테디 머리 + 정수리 볼록 + 길게 늘어진 곱슬 귀(끝은 크림),
  // 크고 까만 눈, 까만 코, 주둥이에 희끗한 털 조금, 길고 가는 다리, 짧은 방울 꼬리.
  // 옆모습(오른쪽 보기)을 그리고 거울로 왼쪽. 버퍼 26×23, 발 기준점 (11, 21).
  // ═════════════════════════════════════════════════════════════════
  const CW = 26, CH = 23, CAX = 11, CAY = 21;

  function leg(b, x, y0, y1, dx, far) {
    const n = Math.max(1, y1 - y0);
    for (let y = y0; y <= y1; y++) {
      const xx = Math.round(x + (dx * (y - y0)) / n), paw = y === y1;
      px(b, xx, y, paw ? (far ? GO[0] : GO[1]) : far ? GO[1] : GO[2]);
      px(b, xx + 1, y, paw ? GO[0] : far ? GO[1] : (y - y0) % 3 === 1 ? GO[1] : GO[2]);
    }
  }
  function tailPom(b, x, y, r) {
    const M = blob(b, ell(x, y, r, r * 0.95, { amb: 0.45 }), R_FUR, { lo: 2, dither: 0.4 });
    curl(b, M, 3);
  }
  // 옷 칠하기: 몸통 가면 M 안에서 region(x,y) 가 참인 칸을 하네스(청록 꽃무늬) 또는 흰 티(곰 그림)로
  function outfitPaint(b, M, region, outfit) {
    const { w, h } = b, inM = (x, y) => x >= 0 && y >= 0 && x < w && y < h && M[y * w + x] === 1;
    const harness = outfit !== "tee";
    const set = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!region(x, y)) continue;
      const i = y * w + x, c = b.c[i];
      if (!c) continue;
      if (!M[i]) { // 몸통 외곽선
        if ((c === GO[0] || c === GO[1]) && (inM(x - 1, y) || inM(x + 1, y) || inM(x, y - 1) || inM(x, y + 1))) set.push([x, y, harness ? CY[1] : SL[2]]);
        continue;
      }
      const L = lum(c), edgeR = !region(x + 1, y) || !region(x - 1, y);
      let col;
      if (harness) {
        col = L > 0.6 ? CY[3] : CY[2];
        const k = (x * 7 + y * 13) % 9;
        if (k === 0) col = VI[3]; else if (k === 4) col = GO[4]; else if (k === 7 && L > 0.4) col = SL[5]; else if (k === 2) col = RD[4];
        if (edgeR) col = SL[3];
      } else {
        col = L > 0.6 ? SL[5] : L > 0.4 ? SL[4] : SL[3];
        const k = (x * 5 + y * 3) % 11;
        if (k === 0) col = GO[3]; else if (k === 5) col = PK[3]; else if (k === 8) col = CY[3];
        if (edgeR) col = L > 0.5 ? SL[4] : SL[3];
      }
      set.push([x, y, col]);
    }
    set.forEach(([x, y, c]) => px(b, x, y, c));
  }

  // 옆 머리: hx,hy = 머리 중심. o.mouth 0|1|2, o.eye "open"|"closed"|"happy", o.ear [dx, dy, ry]
  function sideHead(b, hx, hy, o = {}) {
    const shape = union(ell(hx, hy, 4.3, 3.9, { amb: 0.4 }), ell(hx - 0.4, hy - 3.0, 3.0, 2.1, { amb: 0.45 }), ell(hx - 2.6, hy - 0.4, 2.3, 2.8, { amb: 0.35 }));
    const M = blob(b, shape, R_HEADF, { lo: 2, dither: 0.5, curve: (l) => 0.12 + l * 0.9 });
    curl(b, M, 1);
    const mo = o.mouth || 0;
    if (mo) { // 벌린 입: 어두운 입속 + 혀, 아래턱
      const my = hy + 2.0;
      for (let y = Math.round(my); y <= Math.round(my + mo); y++) for (let x = Math.round(hx + 2.4); x <= Math.round(hx + 5.6); x++) px(b, x, y, INK[2]);
      px(b, hx + 3.2, my + mo, PK[3]); px(b, hx + 4.2, my + mo, PK[4]);
      blob(b, ell(hx + 3.7, hy + 1.1, 2.0, 1.2, { amb: 0.5 }), R_MUZ, { lo: 2, dither: 0.3, inner: false });
      blob(b, ell(hx + 3.2, my + mo + 0.9, 1.6, 0.8, { amb: 0.5 }), R_MUZ, { lo: 2, dither: 0.3, inner: false });
      px(b, hx + 2.6, my + mo + 1, SL[4]); px(b, hx + 3.6, my + mo + 1.2, SL[3]);
    } else {
      blob(b, ell(hx + 3.4, hy + 1.8, 1.8, 1.4, { amb: 0.5 }), R_MUZ, { lo: 2, dither: 0.3, inner: false });
      // 주둥이 희끗한 털 + 입선
      px(b, hx + 3.0, hy + 2.6, SL[4]); px(b, hx + 4.0, hy + 2.6, SL[3]); px(b, hx + 2.2, hy + 2.0, SL[3]);
      px(b, hx + 4.6, hy + 2.2, GO[1]);
    }
    if (o.tongue) { px(b, hx + 3.6, hy + 3.4, PK[4]); px(b, hx + 3.6, hy + 4.2, PK[3]); }
    // 코: 주둥이 끝 위
    const nx = Math.round(hx + 4.4), ny = Math.round(hy + 0.8);
    px(b, nx, ny, INK[1]); px(b, nx + 1, ny, INK[1]); px(b, nx, ny + 1, INK[2]); px(b, nx + 1, ny + 1, INK[1]); px(b, nx, ny, INK[4]);
    // 눈
    const ex = Math.round(hx + 0.9), ey = Math.round(hy - 0.8), eye = o.eye || "open";
    if (eye === "open") { px(b, ex, ey, SL[5]); px(b, ex + 1, ey, INK[1]); px(b, ex, ey + 1, INK[1]); px(b, ex + 1, ey + 1, INK[1]); px(b, ex + 1, ey + 2, GO[1]); }
    else if (eye === "happy") { px(b, ex, ey + 1, INK[2]); px(b, ex + 1, ey, INK[2]); px(b, ex + 2, ey + 1, INK[2]); }
    else { px(b, ex, ey + 1, INK[2]); px(b, ex + 1, ey + 1, INK[2]); px(b, ex - 1, ey + 1, GO[1]); px(b, ex + 1, ey + 2, GO[1]); }
    // 늘어진 귀(머리 뒤쪽 옆에서 아래로) — 끝은 한 톤 밝은 크림
    const er = o.ear || [-2.5, 2.6, 3.6];
    const ecx = hx + er[0], ecy = hy + er[1], ery = er[2];
    const E = blob(b, ell(ecx, ecy, 1.8, ery, { amb: 0.3 }), R_EAR, { lo: 2, dither: 0.45, inner: GO[0] });
    curl(b, E, 2);
    let ymax = -1; for (let i = 0; i < E.length; i++) if (E[i]) ymax = Math.max(ymax, Math.floor(i / b.w));
    for (let i = 0; i < E.length; i++) if (E[i]) { const y = Math.floor(i / b.w), x = i % b.w; if (y >= ymax - 1) b.c[i] = (x + y) % 2 ? GO[4] : GO[5]; else if (y === ymax - 2 && (x + y) % 2) b.c[i] = GO[4]; }
    return { ex, ey };
  }

  // 서 있는 옆모습. legs: [근뒤 dx, 원뒤 dx, 근앞 dx, 원앞 dx, 근뒤 들림, 원뒤 들림, 근앞 들림, 원앞 들림], bob
  function buildStand(outfit, o) {
    const b = Buf(CW, CH), bob = o.bob || 0, L = o.legs || [0, 0, 0, 0, 0, 0, 0, 0];
    const ty = 13.4 + bob, hx = 14.8 + (o.hdx || 0), hy = 8.2 + bob + (o.hdy || 0);
    leg(b, 8, Math.round(ty + 1), CAY - L[5], L[1], true);
    leg(b, 11, Math.round(ty + 1), CAY - L[7], L[3], true);
    tailPom(b, 4.3, 9.4 + bob + (o.tdy || 0), 1.7);
    px(b, 5, Math.round(10.8 + bob), GO[2]);
    const T = blob(b, union(ell(10, ty, 5.1, 2.9, { amb: 0.4 }), ell(13.0, ty - 1.2, 2.6, 2.6, { amb: 0.4 })), R_FUR, { lo: 2, dither: 0.5, curve: (l) => 0.1 + l * 0.9 });
    curl(b, T, 0);
    outfitPaint(b, T, outfit === "tee" ? (x) => x >= 6 && x <= 14 : (x) => x >= 10 && x <= 13, outfit);
    leg(b, 6, Math.round(ty + 1.5), CAY - L[4], L[0], false);
    leg(b, 13, Math.round(ty + 1.5), CAY - L[6], L[2], false);
    sideHead(b, hx, hy, o);
    return b;
  }
  // 앉은 옆모습
  function buildSit(outfit, o) {
    const b = Buf(CW, CH), br = o.breath || 0;
    const tp = o.tail || [4.0, 18.4];
    leg(b, 11, 16, CAY, 0, true);
    tailPom(b, tp[0], tp[1], 1.6);
    const T = blob(b, union(ell(8.6, 17.5, 3.6, 3.3, { amb: 0.4 }), ell(11.2, 13.8 - br * 0.5, 3.3 + br * 0.3, 3.9, { amb: 0.4 })), R_FUR, { lo: 2, dither: 0.5, curve: (l) => 0.1 + l * 0.9 });
    curl(b, T, 0);
    outfitPaint(b, T, outfit === "tee" ? (x, y) => x >= 8 && y <= 16 : (x, y) => x >= 10 && x <= 14 && y <= 17, outfit);
    // 뒷발(앞으로 놓인 발등) + 앞다리
    px(b, 9, CAY, GO[1]); px(b, 10, CAY, GO[2]); px(b, 11, CAY, GO[1]); px(b, 10, CAY - 1, GO[3]); px(b, 9, CAY - 1, GO[2]);
    leg(b, 13, 16, CAY, 0, false);
    sideHead(b, 14.6, 7.6 - br * 0.5 + (o.hdy || 0), o);
    return b;
  }
  // 똥꼬 스키: 앞다리로 짚고 엉덩이로 잔디를 미끄럼(뒷다리는 앞으로 쭉). 지저분한 것 없이 풀잎만 튄다.
  function buildScoot(outfit, f) {
    const b = Buf(CW, CH), sh = f ? 1 : 0;
    leg(b, 12, 14, CAY, 2 + sh, true);
    tailPom(b, 3.6 + sh * 0.3, 15.8 - sh * 0.4, 1.6);
    const T = blob(b, union(rell(9.6, 17.2, 5.2, 2.8, -0.42, { amb: 0.4 }), ell(6.4, 18.6, 2.8, 2.4, { amb: 0.4 })), R_FUR, { lo: 2, dither: 0.5, curve: (l) => 0.1 + l * 0.9 });
    curl(b, T, 0);
    outfitPaint(b, T, outfit === "tee" ? (x) => x >= 8 && x <= 14 : (x) => x >= 10 && x <= 13, outfit);
    // 앞으로 쭉 뻗은 뒷다리(땅에 붙음)
    for (let x = 8; x <= 12; x++) px(b, x, CAY, x === 12 ? GO[1] : GO[3]);
    px(b, 13, CAY, GO[0]); px(b, 12, CAY - 1, GO[2]);
    leg(b, 14, 14, CAY, 2 + sh, false);
    sideHead(b, 15.6, 8.6 - sh * 0.4, { eye: "happy", tongue: true, ear: [-2.6, 2.8, 3.4] });
    // 튀는 풀잎(초록만): 엉덩이 뒤
    const bits = f ? [[1, 19, GR[4]], [0, 17, GR[3]], [2, 21, GR[3]], [3, 18, GR[5]]] : [[2, 20, GR[4]], [1, 18, GR[3]], [0, 21, GR[4]]];
    bits.forEach(([x, y, c]) => { if (!at(b, x, y)) px(b, x, y, c); });
    return b;
  }
  // 배 깔고 낮잠 + 숨결 거품(글자 없이)
  function buildNap(outfit, f) {
    const b = Buf(CW, CH), br = f ? 0.4 : 0;
    tailPom(b, 3.4, 17.6, 1.5);
    const T = blob(b, union(ell(10, 18.1 - br * 0.5, 6.0, 2.7 + br * 0.4, { amb: 0.4 }), ell(6.4, 18.6, 2.8, 2.3, { amb: 0.4 })), R_FUR, { lo: 2, dither: 0.5, curve: (l) => 0.1 + l * 0.9 });
    curl(b, T, 0);
    outfitPaint(b, T, outfit === "tee" ? (x) => x >= 7 && x <= 14 : (x) => x >= 11 && x <= 14, outfit);
    // 앞발 내밀기
    blob(b, ell(17.4, 20.3, 2.4, 0.9, { amb: 0.5 }), R_FUR, { lo: 2, dither: 0.3 });
    sideHead(b, 16.0, 15.6, { eye: "closed", ear: [-2.6, 2.4, 2.6] });
    // 숨결 거품
    const bx = 22.6, by = f ? 11.8 : 12.8, r = f ? 2.1 : 1.3;
    circlePts(bx, by, r).forEach(([x, y]) => px(b, x, y, (x < bx && y < by) ? SL[5] : CY[4]));
    px(b, bx - (f ? 1 : 0), by - (f ? 1 : 0), SL[5]);
    if (f) px(b, 20.6, 14.4, CY[4]);
    return b;
  }
  // 정면(돌기 4 번째 프레임)
  function buildFront(outfit) {
    const b = Buf(CW, CH), cx = 11.5;
    [7, 15].forEach((x) => { for (let y = 17; y <= CAY; y++) px(b, x, y, y === CAY ? GO[0] : GO[1]); });
    const T = blob(b, ell(cx, 14.6, 4.3, 3.0, { amb: 0.4 }), R_FUR, { lo: 2, dither: 0.5, curve: (l) => 0.1 + l * 0.9 });
    curl(b, T, 0);
    outfitPaint(b, T, outfit === "tee" ? () => true : (x, y) => y >= 12 && y <= 15, outfit);
    [9, 12].forEach((x) => leg(b, x, 16, CAY, 0, false));
    const H = blob(b, union(ell(cx, 7.4, 4.0, 3.6, { amb: 0.4 }), ell(cx, 4.2, 2.8, 2.0, { amb: 0.45 })), R_HEADF, { lo: 2, dither: 0.5, curve: (l) => 0.12 + l * 0.9 });
    curl(b, H, 1);
    blob(b, ell(cx, 9.7, 1.9, 1.4, { amb: 0.6 }), R_MUZ, { lo: 2, dither: 0.3, inner: false });
    [7.0, 16.0].forEach((x) => {
      const E = blob(b, ell(x, 10.0, 1.9, 3.3, { amb: 0.3 }), R_EAR, { lo: 2, dither: 0.45, inner: GO[0] });
      for (let i = 0; i < E.length; i++) if (E[i] && Math.floor(i / b.w) >= 12) b.c[i] = (i % 2) ? GO[4] : GO[5];
    });
    [[8, 7], [13, 7]].forEach(([x, y]) => { px(b, x, y, SL[5]); px(b, x + 1, y, INK[1]); px(b, x, y + 1, INK[1]); px(b, x + 1, y + 1, INK[1]); });
    px(b, 10, 9, INK[1]); px(b, 11, 9, INK[4]); px(b, 12, 9, INK[1]); px(b, 11, 10, INK[1]);
    px(b, 10, 11, SL[4]); px(b, 12, 11, SL[3]); px(b, 11, 11, GO[1]);
    return b;
  }
  // 뒷모습(돌기 2 번째 프레임)
  function buildBack(outfit) {
    const b = Buf(CW, CH), cx = 11.5;
    [9, 12].forEach((x) => leg(b, x, 16, CAY, 0, true));
    const H = blob(b, union(ell(cx, 7.4, 4.0, 3.6, { amb: 0.3 }), ell(cx, 4.2, 2.8, 2.0, { amb: 0.35 })), R_HEADF, { lo: 2, dither: 0.5, curve: (l) => 0.05 + l * 0.8 });
    curl(b, H, 1);
    [7.8, 15.2].forEach((x) => {
      const E = blob(b, ell(x, 9.6, 1.8, 2.9, { amb: 0.3 }), R_EAR, { lo: 2, dither: 0.45, inner: GO[0] });
      for (let i = 0; i < E.length; i++) if (E[i] && Math.floor(i / b.w) >= 12) b.c[i] = (i % 2) ? GO[4] : GO[5];
    });
    const T = blob(b, ell(cx, 14.4, 4.5, 3.2, { amb: 0.4 }), R_FUR, { lo: 2, dither: 0.5, curve: (l) => 0.1 + l * 0.9 });
    curl(b, T, 0);
    outfitPaint(b, T, outfit === "tee" ? (x, y) => y <= 15 : (x, y) => y >= 12 && y <= 14, outfit);
    if (outfit !== "tee") { px(b, 11, 12, SL[4]); px(b, 12, 12, SL[3]); }
    [7, 15].forEach((x) => leg(b, x, 16, CAY, 0, false));
    tailPom(b, cx, 12.6, 1.7);
    return b;
  }

  const COCO_STATES = {
    walk: { fps: 10, n: 4 }, sit: { fps: 1.6, n: 2 }, wag: { fps: 10, n: 4 }, spin: { fps: 12, n: 4 },
    scoot: { fps: 6, n: 2 }, bark: { fps: 5, n: 2 }, nap: { fps: 1.2, n: 2 },
  };
  function buildCoco(outfit, state, f) {
    if (state === "walk") {
      const L = [[-1, 1, 1, -1, 0, 0, 0, 0], [0, 0, 0, 0, 1, 0, 0, 1], [1, -1, -1, 1, 0, 0, 0, 0], [0, 0, 0, 0, 0, 1, 1, 0]][f];
      return buildStand(outfit, { legs: L, bob: f % 2 ? -1 : 0, tdy: f % 2 ? 0 : -0.6 });
    }
    if (state === "sit") return buildSit(outfit, { breath: f });
    if (state === "wag") return buildSit(outfit, { tail: [[4.4, 15.6], [3.0, 17.4], [4.2, 19.4], [3.0, 17.4]][f], hdy: f === 1 || f === 3 ? 0 : 0 });
    if (state === "spin") {
      if (f === 0) return buildStand(outfit, {});
      if (f === 1) return buildBack(outfit);
      if (f === 2) return mirror(buildStand(outfit, {}));
      return buildFront(outfit);
    }
    if (state === "scoot") return buildScoot(outfit, f);
    if (state === "bark") return buildStand(outfit, { legs: [-1, -1, 1, 1, 0, 0, 0, 0], mouth: f ? 2 : 1, hdy: f ? -1 : 0, hdx: f ? 0.4 : 0, tdy: -0.6 });
    if (state === "nap") return buildNap(outfit, f);
    return buildStand(outfit, {});
  }
  // 돌기 프레임의 미러는 축이 몸 가운데라 기준점이 어긋난다 → 앞·뒤 모습은 중심 11.5 로 그렸으니 같은 ax 를 쓴다.
  let COCO = null;
  function cocoSet() {
    if (COCO) return COCO;
    COCO = { w: CW, h: CH, ax: CAX, ay: CAY };
    ["harness", "tee"].forEach((outfit) => {
      const o = (COCO[outfit] = {});
      Object.keys(COCO_STATES).forEach((st) => {
        const s = { R: [], L: [], Rf: [], Lf: [] };
        range(COCO_STATES[st].n).forEach((f) => {
          const b = buildCoco(outfit, st, f), m = mirror(b);
          s.R.push(img(b)); s.L.push(img(m));
          s.Rf.push(img(flashOf(b, GO[6], GO[5], 0.2))); s.Lf.push(img(flashOf(m, GO[6], GO[5], 0.2)));
        });
        o[st] = s;
      });
    });
    return COCO;
  }

  // ═════════════════════════════════════════════════════════════════
  // 기운 게이지 — 뼈다귀 칸 3개(각 4 열), 0..12 열을 미리 굽는다
  // ═════════════════════════════════════════════════════════════════
  let GA = null;
  // 뼈 한 칸 5×3: 양끝이 벌어진 뼈다귀("o...o" / ".ooo." / "o...o"), 칸 사이 1 px. 15 열을 0..15 단계로.
  const BONE = ["o...o", ".sss.", "o...o"];
  function gaugeSet() {
    if (GA) return GA;
    GA = { lv: [], glow: null };
    const W = 19, H = 5;
    for (let n = 0; n <= 15; n++) {
      GA.lv.push(imgFn(W, H, (c) => {
        c.fillStyle = rgba(INK[1], 0.55); c.fillRect(1, 0, W - 2, H); c.fillRect(0, 1, W, H - 2);
        for (let k = 0; k < 3; k++) {
          const ox = 1 + k * 6, full = n >= (k + 1) * 5;
          BONE.forEach((row, y) => { for (let i = 0; i < 5; i++) {
            const ch = row[i]; if (ch === ".") continue;
            const lit = k * 5 + i < n;
            c.fillStyle = !lit ? (ch === "o" ? INK[5] : INK[4]) : full ? (ch === "o" ? (y === 0 ? GO[6] : GO[5]) : GO[5]) : (ch === "o" ? GO[4] : GO[3]);
            c.fillRect(ox + i, 1 + y, 1, 1);
          } });
        }
      }));
    }
    GA.glow = glowImg(27, 13, [[6, 6, 4, GO[5], 0.5], [13, 6, 4, GO[5], 0.5], [20, 6, 4, GO[5], 0.5]]);
    return GA;
  }

  // ═════════════════════════════════════════════════════════════════
  // 코코가 싫어하는 것들 — 모두 눈이 있고 둥글고 뾰로통하다. 무섭지 않게.
  // ═════════════════════════════════════════════════════════════════
  function eyes2(b, pts, col = INK[1], hl = SL[5]) { pts.forEach(([x, y]) => { px(b, x, y, col); px(b, x, y + 1, col); if (hl) px(b, x, y, hl === true ? SL[5] : hl); }); }
  // 칫솔(7): 청록 손잡이 몸 + 흰 슬레이트 솔 발. 통통 뛴다 4
  function buildBrush(f) {
    const W = 11, H = 14, b = Buf(W, H), oy = [0, -1, -2, -1][f], squash = f === 0;
    blob(b, poly([[3, 2 + oy], [4, 1 + oy], [7, 1 + oy], [8, 2 + oy], [8, 8 + oy], [3, 8 + oy]], (nx, ny) => 0.62 - nx * 0.4 - ny * 0.15), R_TEAL, { lo: 2, dither: 0.3, rim: CY[5] });
    line(b, 4, 6 + oy, 7, 3 + oy, CY[4]);
    // 솔 판 + 솔(발)
    rect(b, 1, 9 + oy, 9, 1, CY[2]); px(b, 1, 9 + oy, CY[1]); px(b, 9, 9 + oy, CY[1]);
    const by = 10 + oy, bh = squash ? 2 : 3 + (f === 2 ? 0 : 0);
    for (let x = squash ? 0 : 1; x <= (squash ? 10 : 9); x++) for (let j = 0; j < bh; j++) px(b, x, by + j, j === bh - 1 ? SL[3] : x % 2 ? SL[5] : SL[4]);
    // 얼굴
    px(b, 4, 4 + oy, INK[1]); px(b, 4, 5 + oy, INK[1]); px(b, 7, 4 + oy, INK[1]); px(b, 7, 5 + oy, INK[1]);
    px(b, 4, 4 + oy, SL[5]); px(b, 7, 4 + oy, SL[5]);
    px(b, 5, 7 + oy, CY[1]); px(b, 6, 7 + oy, CY[1]); px(b, 3, 6 + oy, PK[3]); px(b, 8, 6 + oy, PK[3]);
    return { b, W, H, ax: 5, ay: 12 };
  }
  // 거품 덩어리(10) / 작은 거품(5): 둥근 방울 뭉치 + 눈 둘, 출렁 3
  function buildSuds(f, small) {
    if (small) {
      const W = 9, H = 9, b = Buf(W, H), s = [0, 0.3, -0.2][f];
      blob(b, union(ell(4.5, 5.3, 3.0 + s, 2.6 - s, { amb: 0.5 }), ell(5.6, 3.0, 1.5, 1.4, { amb: 0.5 })), R_SUDS, { lo: 2, dither: 0.3, rim: CY[5] });
      px(b, 3, 5, INK[2]); px(b, 6, 5, INK[2]); px(b, 4, 6, PK[3]);
      return { b, W, H, ax: 4, ay: 7 };
    }
    const W = 16, H = 16, b = Buf(W, H), s = [0, 0.5, -0.3][f];
    const parts = [ell(8, 9.5, 5.2 + s, 4.2 - s * 0.6, { amb: 0.5 }), ell(4.6, 6.6, 2.6, 2.4, { amb: 0.5 }), ell(8.6, 5.0 - s * 0.5, 2.9, 2.7, { amb: 0.5 }), ell(12.0, 7.0, 2.4, 2.2, { amb: 0.5 })];
    blob(b, union(...parts), R_SUDS, { lo: 2, dither: 0.35, rim: CY[5] });
    // 방울 사이 경계 호
    circlePts(4.6, 6.6, 2.6, 0.3, 1.9).forEach(([x, y]) => { if (at(b, x, y) && at(b, x, y) !== R_SUDS[0]) px(b, x, y, CY[4]); });
    circlePts(12.0, 7.0, 2.4, 1.2, 2.8).forEach(([x, y]) => { if (at(b, x, y) && at(b, x, y) !== R_SUDS[0]) px(b, x, y, CY[4]); });
    eyes2(b, [[6, 9], [10, 9]], INK[2], true);
    px(b, 8, 11, PK[3]); px(b, 5, 11, PK[4]); px(b, 11, 11, PK[4]);
    // 떠오르는 작은 방울
    const bub = [[2, 3], [13, 2], [7, 1]][f];
    px(b, bub[0], bub[1], CY[4]); px(b, bub[0] + 1, bub[1], SL[5]);
    return { b, W, H, ax: 8, ay: 14 };
  }
  // 초인종(10): 땅에 선 단추판 + 빨강 단추 + 다리. ring 이면 흔들림 + 소리 호
  function buildBell(f, ring) {
    const W = ring ? 22 : 14, H = 16, b = Buf(W, H), ox = ring ? 4 + [0, 1, 0, -1][f] : 0, oy = ring ? 0 : [0, -1][f % 2];
    // 다리
    const lift = ring ? [0, 0] : [[0, 1], [1, 0]][f % 2];
    [[5, lift[0]], [8, lift[1]]].forEach(([x, up]) => { px(b, ox + x, 12 - up, INK[4]); px(b, ox + x, 13 - up, INK[4]); px(b, ox + x, 14 - up, INK[5]); px(b, ox + x + (x < 7 ? -1 : 1), 14 - up, INK[5]); });
    blob(b, poly([[2 + ox, 2 + oy], [3 + ox, 1 + oy], [10 + ox, 1 + oy], [11 + ox, 2 + oy], [11 + ox, 11 + oy], [10 + ox, 12 + oy], [3 + ox, 12 + oy], [2 + ox, 11 + oy]], (nx, ny) => 0.68 - nx * 0.3 - ny * 0.2), R_SLATE, { lo: 2, dither: 0.3, rim: SL[5] });
    const pr = ring ? 2.0 : 2.5;
    blob(b, ell(6.5 + ox, 5.0 + oy + (ring ? 0.4 : 0), pr, pr, { amb: 0.4 }), R_RED, { lo: 2, dither: 0.3 });
    px(b, 5.6 + ox, 4 + oy, RD[5]);
    if (ring) { // 꾹 눈 감고 「울리는 중」
      [[4, 9], [8, 9]].forEach(([x, y], i) => { px(b, ox + x, y, INK[2]); px(b, ox + x + (i ? -1 : 1), y - 1, INK[2]); px(b, ox + x + (i ? -1 : 1), y + 1, INK[2]); });
      px(b, ox + 6, 10, PK[3]);
      // 소리 호(양옆 두 겹, 프레임마다 번갈아)
      const k = f % 2;
      [[0, 1], [1, -1]].forEach(([side, dir]) => {
        const cx = side ? W - 3 : 2;
        [[0, 3 + k], [1, 6 - k]].forEach(([i, r]) => circlePts(side ? cx - 6 : cx + 6, 6, r + i, side ? -0.7 : Math.PI - 0.7, side ? 0.7 : Math.PI + 0.7).forEach(([x, y]) => { if (!at(b, x, y) && (x <= 3 || x >= W - 4)) px(b, x, y, i ? GO[4] : GO[5]); }));
      });
    } else {
      eyes2(b, [[5, 8 + oy], [8, 8 + oy]], INK[1], true);
      px(b, 6, 10 + oy, INK[3]); px(b, 7, 10 + oy, INK[3]); px(b, 4, 10 + oy, PK[3]); px(b, 9, 10 + oy, PK[3]);
    }
    return { b, W, H, ax: ring ? 10 : 6, ay: 14 };
  }
  // 청소기(16): 보라 통 + 바퀴 둘 + 호스 → 앞 흡입구. 느린 탱크 4
  function buildVacuum(f) {
    const W = 26, H = 20, b = Buf(W, H), bob = [0, 0, -1, 0][f], hw = [0, 1, 0, -1][f];
    // 호스(몸 뒤에서 앞 흡입구로 휘어짐)
    const hose = [];
    for (let i = 0; i <= 14; i++) { const t = i / 14; hose.push([13 + t * 9 + Math.sin(t * Math.PI) * 1.5, 6 + bob + t * 10 - Math.sin(t * Math.PI) * (5 + hw)]); }
    hose.forEach(([x, y], i) => { px(b, x, y, i % 3 === 0 ? SL[1] : SL[3]); px(b, x, y + 1, i % 3 === 0 ? SL[0] : SL[2]); });
    // 흡입구
    rect(b, 19, 16, 7, 2, SL[2]); for (let x = 19; x < 26; x++) { px(b, x, 15, SL[4]); px(b, x, 18, INK[3]); }
    px(b, 19, 16, SL[1]); px(b, 19, 17, SL[1]);
    // 통
    blob(b, ell(9.5, 11.5 + bob, 7.0, 5.3, { amb: 0.4 }), R_VI, { lo: 2, dither: 0.4, rim: PK[4] });
    for (let x = 4; x <= 15; x++) if (at(b, x, 13 + bob) && at(b, x, 13 + bob) !== VI[0]) px(b, x, 13 + bob, VI[1]);
    // 손잡이
    circlePts(9.5, 6.5 + bob, 3, Math.PI, Math.PI * 2).forEach(([x, y]) => px(b, x, y, SL[3]));
    // 바퀴
    [[5, 16.5], [14, 16.5]].forEach(([x, y], i) => {
      blob(b, ell(x, y, 2.0, 2.0, { amb: 0.3 }), [INK[1], INK[3], INK[3], INK[4], INK[5], SL[1]], { lo: 2, dither: 0.2 });
      const a = (f + i) * Math.PI / 2; px(b, x + Math.cos(a) * 1.2 - 0.5, y + Math.sin(a) * 1.2 - 0.5, SL[3]);
    });
    // 얼굴(뾰로통)
    eyes2(b, [[7, 10 + bob], [11, 10 + bob]], INK[1], true);
    px(b, 6, 9 + bob, VI[1]); px(b, 12, 9 + bob, VI[1]);
    px(b, 9, 12 + bob, INK[2]); px(b, 8, 12 + bob, VI[1]); px(b, 10, 12 + bob, VI[1]);
    return { b, W, H, ax: 11, ay: 18 };
  }
  // 다른 강아지(11): 정면. 회백색 짧은 털, 쫑긋 선 세모 귀, 말린 꼬리, 빨강 목줄, 뾰로통 눈썹 — 코코와 꼴·색이 다 다르다
  function buildDog(f) {
    const W = 18, H = 18, b = Buf(W, H), cx = 8.5, bob = [0, -1, 0, -1][f];
    // 말린 꼬리(오른쪽 뒤로 고리)
    blob(b, minus(ell(14.2, 9.2 + bob, 2.0, 2.0, { amb: 0.4 }), ell(14.2, 9.2 + bob, 0.8, 0.8)), R_DOG, { lo: 2, dither: 0.3 });
    // 다리(짧고 굵다)
    const lift = [[0, 1], [0, 0], [1, 0], [0, 0]][f];
    [[6, lift[0]], [10, lift[1]]].forEach(([x, up]) => { for (let y = 13; y <= 16 - up; y++) { px(b, x, y, y === 16 - up ? SL[1] : SL[4]); px(b, x + 1, y, y === 16 - up ? SL[0] : SL[3]); } });
    blob(b, ell(cx, 12.0 + bob, 4.4, 3.0, { amb: 0.45 }), R_DOG, { lo: 2, dither: 0.4, rim: SL[5] });
    // 귀(세모, 쫑긋)
    const ear = (s) => poly([[cx + s * 1.2, 5.2 + bob], [cx + s * 4.4, 5.6 + bob], [cx + s * 3.6, 0.6 + bob]], (nx, ny) => 0.6 - nx * 0.3 * s - ny * 0.2);
    blob(b, ear(-1), R_DOG, { lo: 2, dither: 0.3 }); blob(b, ear(1), R_DOG, { lo: 2, dither: 0.3 });
    px(b, cx - 3.2, 3.2 + bob, PK[3]); px(b, cx - 3.0, 4.2 + bob, PK[2]); px(b, cx + 2.4, 3.2 + bob, PK[3]); px(b, cx + 2.2, 4.2 + bob, PK[2]);
    // 머리(납작하고 넓은)
    blob(b, ell(cx, 7.4 + bob, 4.6, 3.2, { amb: 0.45 }), R_DOG, { lo: 2, dither: 0.4, rim: SL[5] });
    blob(b, ell(cx, 9.6 + bob, 2.6, 1.7, { amb: 0.7 }), R_DOG, { lo: 4, dither: 0.2, inner: SL[2] });
    // 접힌 귀 끝(오른쪽) — 고양이와 가르는 표시
    px(b, cx + 3.6, 0.6 + bob, null); px(b, cx + 4.4, 1.6 + bob, SL[2]); px(b, cx + 3.4, 1.6 + bob, SL[3]);
    // 목줄
    for (let x = 5; x <= 11; x++) if (at(b, x, 12 + bob)) px(b, x, 12 + bob, x === 8 ? GO[5] : RD[3]);
    // 뾰로통: 안쪽으로 내려간 눈썹 + 반쯤 감은 눈 + 삐죽 입
    const y = 7 + bob;
    px(b, 5, y - 1, SL[1]); px(b, 6, y - 1, SL[1]); px(b, 7, y, SL[0]);
    px(b, 12, y - 1, SL[1]); px(b, 11, y - 1, SL[1]); px(b, 10, y, SL[0]);
    px(b, 6, y + 1, INK[1]); px(b, 7, y + 1, INK[1]); px(b, 10, y + 1, INK[1]); px(b, 11, y + 1, INK[1]);
    px(b, 7, y + 2, INK[1]); px(b, 8, y + 2, INK[1]); px(b, 9, y + 2, INK[1]); px(b, 8, y + 3, INK[1]); px(b, 8, y + 2, INK[4]);
    px(b, 7, y + 4, INK[3]); px(b, 8, y + 4, INK[3]); px(b, 9, y + 4, INK[3]); px(b, 6, y + 3, SL[2]); px(b, 10, y + 3, SL[2]);
    return { b, W, H, ax: 8, ay: 16 };
  }
  // 로봇 청소기 대왕(38): 둥근 원반 + 옆솔 회전 + 빨간 눈 램프(귀엽게)
  function buildRobo(f) {
    const W = 50, H = 32, b = Buf(W, H), cx = 25, rum = [0, 0, 1, 0][f];
    // 옆솔(앞 양쪽, 회전)
    const brush = (bx, by, dir) => {
      for (let k = 0; k < 3; k++) {
        const a = (k * 2 * Math.PI) / 3 + f * dir * (Math.PI / 6);
        for (let r = 1; r <= 5; r++) px(b, bx + Math.cos(a) * r, by + Math.sin(a) * r * 0.55, r > 3 ? GO[5] : SL[4]);
      }
      px(b, bx, by, SL[1]);
    };
    brush(7, 25, 1); brush(43, 25, -1);
    // 옆면(두께) → 윗면
    blob(b, ell(cx, 18.5 + rum, 20, 9, { amb: 0.2 }), R_ROBO, { lo: 2, dither: 0.4 });
    blob(b, ell(cx, 14.5 + rum, 20, 9, { amb: 0.45, flat: 0.5 }), R_ROBOTOP, { lo: 2, dither: 0.4, rim: CY[4] });
    // 뚜껑 원 + 범퍼 띠
    circlePts(cx, 12.5 + rum, 9, 0, Math.PI * 2).forEach(([x, y, th]) => { if (Math.abs(Math.sin(th)) < 0.98 || true) px(b, x, Math.round(12.5 + rum + (y - 12.5 - rum) * 0.45), Math.sin(th) < 0 ? SL[2] : SL[5]); });
    for (let x = 8; x <= 42; x++) { const yy = Math.round(18.5 + rum + Math.sqrt(Math.max(0, 1 - ((x + 0.5 - cx) / 20) ** 2)) * 8.2); if (at(b, x, yy)) px(b, x, yy, INK[5]); }
    // 꼭대기 단추(금 불)
    px(b, cx - 1, 10 + rum, GO[5]); px(b, cx, 10 + rum, GO[6]); px(b, cx - 1, 11 + rum, GO[3]); px(b, cx, 11 + rum, GO[4]);
    // 빨간 눈 램프 둘(앞 면) + 반짝 + 볼
    const eyes = [[18, 20 + rum], [32, 20 + rum]];
    eyes.forEach(([x, y]) => {
      blob(b, ell(x, y, 2.4, 2.2, { amb: 0.5 }), R_RED, { lo: 2, dither: 0.2 });
      px(b, x - 1, y - 1, RD[5]); px(b, x - 1, y - 2, SL[5]);
      if (f === 3) for (let j = -2; j <= 1; j++) px(b, x + j, y - 1, RD[2]); // 깜빡
    });
    px(b, 14, 23 + rum, PK[3]); px(b, 15, 23 + rum, PK[3]); px(b, 35, 23 + rum, PK[3]); px(b, 36, 23 + rum, PK[3]);
    // ω 입
    [[22, 0], [23, 1], [24, 0], [25, 0], [26, 1], [27, 0]].forEach(([x, d]) => px(b, x, 23 + rum + d, INK[1]));
    return { b, W, H, ax: cx, ay: 28, eyes };
  }
  // 목욕 시간(42): 다리 달린 욕조 + 샤워기 머리 + 거품 왕관
  function buildBath(f) {
    const W = 56, H = 56, b = Buf(W, H), cx = 27, bob = [0, -1, 0, -1][f];
    // 샤워기 관(뒤): 욕조 뒤 오른쪽에서 위로 솟아 왼쪽으로 굽음
    for (let y = 9; y <= 30; y++) { px(b, 46, y, SL[2]); px(b, 47, y, SL[3]); }
    circlePts(41, 9, 5.5, Math.PI, Math.PI * 2).forEach(([x, y]) => { px(b, x, y, SL[3]); px(b, x, y + 1, SL[2]); });
    blob(b, poly([[31, 10], [39, 10], [37, 14], [33, 14]], (nx, ny) => 0.7 - nx * 0.3 - ny * 0.2), R_SLATE, { lo: 2, dither: 0.3, rim: CY[5] });
    for (let x = 33; x <= 37; x += 2) px(b, x, 14, CY[3]);
    // 물방울(떨어지는 위치가 프레임마다 내려감)
    [[33, 0], [35, 2], [37, 1]].forEach(([x, ph]) => { const y = 16 + ((f + ph) % 4) * 3; px(b, x, y, CY[4]); px(b, x, y + 1, CY[3]); });
    // 다리(금 발톱 발) — 걷는다
    const lift = [[0, 1], [0, 0], [1, 0], [0, 0]][f];
    [[12, lift[0]], [41, lift[1]]].forEach(([x, up]) => {
      blob(b, poly([[x - 1, 42], [x + 3, 42], [x + 3, 50 - up], [x + 4, 52 - up], [x - 2, 52 - up], [x - 1, 50 - up]], (nx, ny) => 0.6 - nx * 0.4 - ny * 0.1), R_GOLD, { lo: 2, dither: 0.3, rim: GO[6] });
    });
    // 욕조 몸 + 둥근 테
    blob(b, poly([[7, 31 + bob], [48, 31 + bob], [45, 41 + bob], [41, 45 + bob], [14, 45 + bob], [10, 41 + bob]], (nx, ny) => 0.72 - nx * 0.3 - ny * 0.2), R_TUB, { lo: 2, dither: 0.35, rim: CY[5] });
    blob(b, ell(cx + 0.5, 31 + bob, 22, 2.8, { amb: 0.5 }), R_TUB, { lo: 3, dither: 0.2 });
    // 얼굴(욕조 앞 면)
    [[20, 35], [34, 35]].forEach(([x, y]) => { rect(b, x, y + bob, 2, 3, INK[1]); px(b, x, y + bob, SL[5]); px(b, x + 1, y + bob, INK[2]); });
    px(b, 16, 39 + bob, PK[3]); px(b, 17, 39 + bob, PK[4]); px(b, 37, 39 + bob, PK[3]); px(b, 38, 39 + bob, PK[4]);
    rect(b, 26, 39 + bob, 3, 2, INK[2]); px(b, 27, 40 + bob, PK[3]);
    // 거품 왕관: 테 위로 둥근 방울, 가운데 셋이 뾰족하게 솟음
    const sb = [0, 0.4, 0, -0.4][f];
    const foam = [[9, 28.5, 3.0], [14, 27.5, 3.4], [19, 26.5, 3.4], [24, 24.0, 3.6], [cx + 0.5, 20.5, 3.4], [31, 24.0, 3.6], [36, 26.5, 3.4], [41, 27.5, 3.4], [46, 28.5, 3.0], [cx + 0.5, 26.5, 4.2]];
    blob(b, union(...foam.map(([x, y, r], i) => ell(x, y + bob + (i % 2 ? sb : -sb), r, r * 0.9, { amb: 0.5 }))), R_SUDS, { lo: 2, dither: 0.35, rim: CY[5] });
    // 왕관 꼭지 금 점 + 고무 오리
    [[18.6, 22.7], [cx, 16.6], [30.6, 20.2]].forEach(([x, y]) => { px(b, x, y + bob, GO[5]); px(b, x, y + bob - 1, GO[6]); });
    const dx = 40, dy = 22 + bob;
    blob(b, union(ell(dx, dy + 1.5, 2.6, 1.6, { amb: 0.5 }), ell(dx + 1.4, dy - 0.8, 1.4, 1.3, { amb: 0.5 })), [GO[2], GO[3], GO[4], GO[5], GO[6], GO[6]], { lo: 2, dither: 0.2 });
    px(b, dx + 3, dy - 0.6, GO[3]); px(b, dx + 1.6, dy - 1.2, INK[1]);
    return { b, W, H, ax: cx, ay: 52, eyes: [[21, 36 + bob], [35, 36 + bob]] };
  }

  let EN = null;
  function enemySet() {
    if (EN) return EN;
    EN = {};
    const mk = (kind, n, fps, build, glowFn) => {
      const s = { fps, fr: [], fl: [], gl: [] };
      range(n).forEach((f) => {
        const o = build(f);
        Object.assign(s, { w: o.W, h: o.H, ax: o.ax, ay: o.ay });
        s.fr.push(img(o.b)); s.fl.push(img(flashOf(o.b, SL[5], SL[3], 0.12)));
        if (glowFn) s.gl.push(glowImg(o.W + 16, o.H + 16, glowFn(o, f).map(([x, y, r, c, a]) => [x + 8, y + 8, r, c, a])));
      });
      EN[kind] = s;
    };
    mk("brush", 4, 8, buildBrush);
    mk("suds", 3, 5, (f) => buildSuds(f, false));
    mk("suds_s", 3, 6, (f) => buildSuds(f, true));
    mk("bell", 2, 5, (f) => buildBell(f, false));
    mk("bell_ring", 4, 12, (f) => buildBell(f, true), (o, f) => [[3, 6, 4, GO[5], 0.35 + 0.15 * (f % 2)], [o.W - 4, 6, 4, GO[5], 0.35 + 0.15 * (f % 2)]]);
    mk("vacuum", 4, 3, buildVacuum);
    mk("dog", 4, 9, buildDog);
    mk("boss_vacuum", 4, 8, buildRobo, (o, f) => o.eyes.map(([x, y]) => [x, y, f === 3 ? 3 : 5, RD[4], 0.55]));
    mk("boss_bath", 4, 4, buildBath, (o) => [[27, 18, 7, CY[4], 0.25]]);
    return EN;
  }

  // ═════════════════════════════════════════════════════════════════
  // 줍는 것 · 탄
  // ═════════════════════════════════════════════════════════════════
  // 돌려서 굽기: shape(u,v) 는 (0,0) 중심 지역 좌표
  function rotImg(S, shapeFn, ramp, o, ang, extra) {
    const b = Buf(S, S), c = (S - 1) / 2 + 0.5;
    blob(b, rot(shapeFn, c, c, ang), ramp, o);
    if (extra) extra(b, c, Math.cos(ang), Math.sin(ang));
    return img(b);
  }
  let PU = null;
  function pickupSet() {
    if (PU) return PU;
    PU = {};
    // 사료 알갱이 4×4: 2프레임 반짝
    PU.kibble = range(2).map((f) => { const b = Buf(4, 4); grid(b, [".ab.", "abbc", "bbcd", ".dd."], { a: f ? GO[6] : GO[4], b: GO[3], c: GO[2], d: GO[1] }); return img(b); });
    // 뼈 간식 8×5(경험치 큰 것): 크림 뼈 + 금빛 발광
    PU.treat = range(2).map((f) => {
      const b = Buf(8, 5);
      blob(b, union(poly([[1.5, 1.6], [6.5, 1.6], [6.5, 3.4], [1.5, 3.4]], (nx, ny) => 0.7 - ny * 0.3), ell(1.4, 1.4, 1.2, 1.2), ell(1.4, 3.6, 1.2, 1.2), ell(6.6, 1.4, 1.2, 1.2), ell(6.6, 3.6, 1.2, 1.2)), R_BONE, { lo: 2, dither: 0.2, outline: false });
      px(b, 1, 1, GO[6]); px(b, 3 + f * 2, 2, GO[6]);
      return img(b);
    });
    PU.treatG = glowImg(14, 11, [[7, 5, 5, GO[5], 0.5]]);
    // 개껌(회복): 꽈배기 막대 9×9, 가로
    const chewShape = (u, v) => { const au = Math.abs(u), av = Math.abs(v); if (au > 3.6 || av > (au > 2.6 ? 1.6 : 1.1)) return null; return { l: Math.max(0, Math.min(1, 0.7 - v * 0.25 - u * 0.05)), nx: u / 3.6, ny: v / 1.6 }; };
    const chewDeco = (b, c, ca, sa) => { for (let k = -2; k <= 2; k += 2) { const x = c - 0.5 + k * ca, y = c - 0.5 + k * sa; if (at(b, x, y)) px(b, x, y, PK[3]); } };
    PU.chew = rotImg(9, chewShape, R_SLATE, { lo: 3, dither: 0.3 }, -0.5, chewDeco);
    PU.chewRot = range(8).map((i) => rotImg(9, chewShape, R_SLATE, { lo: 3, dither: 0.3 }, (i * Math.PI) / 4, chewDeco));
    // 고기(보스 보상): 뼈 달린 고기 10×8 + 반짝
    PU.meat = range(2).map((f) => {
      const b = Buf(11, 9);
      blob(b, union(ell(1.6, 2.0, 1.2, 1.2), ell(2.6, 1.2, 1.2, 1.2), rell(3.5, 3.4, 2.0, 0.8, 0.6)), [SL[1], SL[2], SL[3], SL[4], SL[5], GO[6]], { lo: 2, dither: 0.2 });
      blob(b, ell(6.6, 5.4, 3.6, 2.8, { amb: 0.4 }), [RD[0], RD[1], RD[2], RD[3], RD[4], RD[5]], { lo: 2, dither: 0.3, rim: GO[4] });
      px(b, 5, 4, RD[5]); px(b, 6, 4, f ? GO[6] : RD[5]); px(b, 8, 6, RD[2]);
      return img(b);
    });
    PU.meatG = glowImg(17, 15, [[8, 7, 6, GO[5], 0.45]]);
    // 상추(작은 회복) 7×6
    PU.lettuce = (() => {
      const b = Buf(8, 7);
      blob(b, union(ell(4, 3.6, 3.4, 2.6, { amb: 0.4 }), ell(2.4, 2.2, 1.6, 1.4), ell(5.6, 2.0, 1.6, 1.4)), R_GREEN, { lo: 2, dither: 0.4 });
      line(b, 4, 5, 4, 2, GR[2]); px(b, 3, 3, GR[2]); px(b, 5, 3, GR[2]); px(b, 2, 2, GR[5]);
      return img(b);
    })();
    // 과일 조각(자석): 수박 쐐기 7×6
    PU.fruit = range(2).map((f) => {
      const b = Buf(9, 7);
      for (let y = 0; y < 7; y++) for (let x = 0; x < 9; x++) {
        const dx = x + 0.5 - 4.5, dy = y + 0.5 - 0.6, d = Math.hypot(dx, dy * 0.95);
        if (dy < 0 || d > 4.6) continue;
        px(b, x, y, d > 3.8 ? (x < 4 ? GR[3] : GR[2]) : d > 3.2 ? GO[6] : y < 2 ? RD[4] : RD[3]);
      }
      px(b, 3, 2, INK[1]); px(b, 5, 2, INK[1]); px(b, 4, 3, INK[1]); px(b, 2 + f * 4, 1, RD[5]);
      return img(b);
    });
    PU.fruitG = glowImg(15, 13, [[7, 4, 5, PK[4], 0.45]]);
    // 삑삑이 공 7×7: 빨강 공 + 금 띠, 4프레임 굴림
    PU.ball = range(4).map((f) => {
      const b = Buf(7, 7);
      blob(b, ell(3.5, 3.5, 2.7, 2.7, { amb: 0.4 }), R_RED, { lo: 2, dither: 0.3 });
      for (let y = 1; y <= 5; y++) { const x = 1 + ((f + y) % 5); if (at(b, x, y) && at(b, x, y) !== RD[0]) px(b, x, y, (y < 3) ? GO[6] : GO[5]); }
      px(b, 2, 2, RD[5]);
      return img(b);
    });
    // 물고 휘두르는 인형(오리) 11×11, 8방향
    const duck = (u, v) => union(ell(-0.6, 0.6, 3.0, 2.3, { amb: 0.5 }), ell(1.8, -1.4, 1.8, 1.7, { amb: 0.5 }))(u, v);
    PU.toy = range(8).map((i) => rotImg(11, duck, [GO[2], GO[3], GO[4], GO[5], GO[6], GO[6]], { lo: 2, dither: 0.3 }, (i * Math.PI) / 4, (b, c, ca, sa) => {
      const P = (u, v) => [c - 0.5 + u * ca - v * sa, c - 0.5 + u * sa + v * ca];
      const [bx, by] = P(3.8, -1.2); px(b, bx, by, GO[3]); const [bx2, by2] = P(4.6, -1.0); px(b, bx2, by2, RD[3]);
      const [ex, ey] = P(2.1, -1.9); px(b, ex, ey, INK[1]);
      const [wx, wy] = P(-1.0, 0.8); px(b, wx, wy, GO[3]); const [wx2, wy2] = P(-2.0, 0.6); px(b, wx2, wy2, GO[3]);
    }));
    // 짖음 파동: 16방향 × 2프레임, 17×17, 소리 호 3겹
    PU.bark = range(16).map((i) => range(2).map((f) => imgFn(17, 17, (c) => {
      const a = (i * Math.PI) / 8, ox = 8 - Math.cos(a) * 4, oy = 8 - Math.sin(a) * 4;
      [[3.2, GO[6], 0.95], [5.4, GO[5], 0.75], [7.6, GO[4], 0.5]].forEach(([r, col, al], k) => {
        const rr = r + f * 0.8;
        circlePts(ox + 0.5, oy + 0.5, rr, a - 0.8 + k * 0.08, a + 0.8 - k * 0.08).forEach(([x, y]) => { c.fillStyle = rgba(col, al); c.fillRect(x, y, 1, 1); });
      });
    })));
    return PU;
  }

  // ═════════════════════════════════════════════════════════════════
  // 바닥 — 공원. 16×16 타일, 잔디 3 + 산책로 조각 1 + 소품 4(의자·그루터기·민들레·가로등) + 생울타리 2. 하루 5단계 판을 미리 굽는다.
  // ═════════════════════════════════════════════════════════════════
  const T = 16, WORLD = 540, LEVELS = 5;
  // 잔디 5색 [가장 어두움, 그늘, 바탕, 볕, 하이라이트]
  const GROUND = [
    [GR[1], GR[2], GR[3], GR[4], CY[5]], // 0 맑은 아침: 연두 + 이슬 하늘빛
    [GR[1], GR[2], GR[3], GR[4], GR[5]], // 0.25
    [GR[1], GR[2], GR[3], GR[4], GO[6]], // 0.5 한낮
    [GR[0], GR[1], GR[2], GR[3], PK[4]], // 0.75 노을: 볕이 주황·분홍
    [INK[2], GR[0], GR[1], GR[2], VI[3]], // 1 저녁: 남보라
  ];
  const HEDGE = [
    [GR[0], GR[1], GR[2], GR[3]],
    [GR[0], GR[1], GR[2], GR[3]],
    [GR[0], GR[1], GR[2], GR[4]],
    [GR[0], GR[1], GR[2], GR[3]],
    [INK[1], INK[2], GR[0], VI[1]],
  ];
  const PATH = [ // 자갈 산책로 [가장자리, 그늘, 바탕, 볕]
    [SL[0], SL[2], SL[3], SL[4]],
    [SL[0], SL[2], SL[3], SL[4]],
    [SL[0], SL[2], SL[3], SL[5]],
    [INK[4], SL[1], SL[2], SL[3]],
    [INK[2], INK[4], INK[5], SL[1]],
  ];
  const FLOWER = [[PK[4], GO[5], CY[4]], [PK[4], GO[5], VI[4]], [PK[4], GO[5], VI[4]], [PK[3], GO[4], VI[3]], [PK[2], GO[3], VI[2]]];
  function puff(b, cx, cy, r, G, hl) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.25);
      if (d > r) continue;
      const xx = ((x % T) + T) % T, yy = ((y % T) + T) % T;
      if (d > r - 1.1) px(b, xx, yy, y + 0.5 < cy ? G[3] : y + 0.5 > cy + r * 0.45 ? G[1] : G[2]);
      else if (hl && y + 0.5 < cy - r * 0.35 && x + 0.5 < cx) px(b, xx, yy, G[4]);
    }
  }
  function tuft(b, x, y, G) { px(b, x, y, G[3]); px(b, x - 1, y - 1, G[3]); px(b, x + 1, y - 1, G[4]); px(b, x, y + 1, G[1]); }
  function buildTile(L, kind, v) {
    const b = Buf(T, T), G = GROUND[L], sh = [0, 0, 0, -1, -2][L], FL = FLOWER[L];
    const c = (ramp, i) => ramp[Math.max(0, Math.min(ramp.length - 1, i + sh))];
    if (kind === "wall") { // 낮은 생울타리: 잎 덩이
      const H = HEDGE[L];
      rect(b, 0, 0, T, T, H[1]);
      for (let i = 0; i < 30; i++) { const h = hash(i * 7 + v * 101, i * 3 + 11); px(b, h % T, (h >> 5) % T, H[0]); }
      const P = v ? [[4, 5, 4.5], [12, 12, 5], [13, 2, 3.5], [3, 14, 3]] : [[10, 5, 5], [3, 11, 4.5], [1, 2, 3], [13, 14, 3]];
      P.forEach(([x, y, r]) => {
        for (let yy = 0; yy < T; yy++) for (let xx = 0; xx < T; xx++) {
          const d = Math.hypot(xx + 0.5 - x, (yy + 0.5 - y) * 1.15);
          if (d < r - 1) px(b, xx, yy, (xx * 3 + yy * 5) % 7 === 0 ? H[1] : H[2]);
          else if (d < r && yy + 0.5 < y) px(b, xx, yy, H[3]);
        }
      });
      if (v && L < 3) { px(b, 11, 4, PK[4]); px(b, 4, 10, GO[6]); }
      return b;
    }
    rect(b, 0, 0, T, T, G[2]);
    for (let i = 0; i < 20; i++) { const h = hash(i * 13 + v * 7 + kind.length * 31, i + 5); px(b, h % T, (h >> 6) % T, (h >> 12) & 1 ? G[1] : G[3]); }
    if (kind === "g") {
      if (v === 0) { puff(b, 7.5, 9, 5.5, G, true); tuft(b, 3, 4, G); }
      if (v === 1) { // 꽃
        puff(b, 4, 5, 3.5, G, true); tuft(b, 12, 12, G);
        [[11, 5, FL[0]], [5, 12, FL[2]]].forEach(([x, y, col]) => { px(b, x, y - 1, col); px(b, x - 1, y, col); px(b, x + 1, y, col); px(b, x, y + 1, col); px(b, x, y, FL[1]); px(b, x, y + 2, G[1]); });
      }
      if (v === 2) { // 클로버 + 작은 민들레
        [[3, 11], [11, 6], [8, 13]].forEach(([x, y]) => tuft(b, x, y, G));
        px(b, 12, 12, FL[1]); px(b, 13, 12, FL[1]); px(b, 12, 11, FL[1]); px(b, 12, 13, G[1]);
        px(b, 4, 4, G[4]); px(b, 5, 4, G[3]); px(b, 4, 5, G[3]); px(b, 5, 5, G[4]);
      }
    }
    if (kind === "path") { // 산책로 조각: 흙 + 디딤돌
      const P = PATH[L];
      const sh2 = (x, y) => { const nx = (x - 8) / 7.6, ny = (y - 9) / 4.6, k = 1 + 0.12 * Math.sin(Math.atan2(ny, nx) * 5); if (nx * nx + ny * ny > k * k) return null; return { l: 0.6 - nx * 0.1 - ny * 0.1, nx, ny }; };
      const PM = blob(b, sh2, [G[1], G[1], P[2], P[2], P[2], P[3]], { lo: 2, dither: 0.5, outline: false });
      for (let x = 1; x < 15; x++) for (let y = 0; y < T; y++) if (PM[y * T + x] && !PM[(y + 1) * T + x]) { px(b, x, y + 1, G[1]); break; }
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (PM[y * T + x]) { const h = hash(x * 31 + y, y * 17 + x); if (h % 5 === 0) px(b, x, y, P[1]); else if (h % 7 === 0) px(b, x, y, P[3]); }
      px(b, 6, 5, c(GO, 3)); px(b, 7, 5, c(GO, 2)); px(b, 11, 10, c(GO, 4)); px(b, 4, 11, P[0]); px(b, 10, 4, P[0]);
    }
    if (kind === "bench") { // 공원 의자(나무 등받이·앉판, 쇠 다리)
      const W0 = [c(GO, 1), c(GO, 2), c(GO, 3), c(GO, 4)];
      [3, 5].forEach((y) => { for (let x = 2; x <= 13; x++) px(b, x, y, x === 2 ? W0[1] : W0[2]); px(b, 13, y, W0[1]); });
      for (let x = 2; x <= 13; x++) { px(b, x, 2, W0[0]); px(b, x, 4, W0[0]); px(b, x, 6, W0[0]); }
      for (let y = 7; y <= 9; y++) for (let x = 1; x <= 14; x++) px(b, x, y, y === 7 ? W0[3] : y === 8 ? W0[2] : W0[1]);
      [[2, 3], [13, 3]].forEach(([x]) => { for (let y = 2; y <= 13; y++) px(b, x, y, y < 7 ? c(SL, 1) : y > 9 ? c(INK, 4) : at(b, x, y)); });
      [[3], [12]].forEach(([x]) => { for (let y = 10; y <= 13; y++) px(b, x, y, c(INK, 3)); });
      for (let x = 1; x <= 14; x++) px(b, x, 14, G[1]);
    }
    if (kind === "stump") { // 나무 그루터기
      const R0 = [c(GO, 0), c(GO, 1), c(GO, 1), c(GO, 2), c(GO, 3), c(GO, 4)];
      blob(b, poly([[3, 7], [13, 7], [13.5, 13], [15, 14], [1, 14], [2.5, 13]], (nx) => 0.6 - nx * 0.4), R0, { lo: 2, dither: 0.4 });
      blob(b, ell(8, 7, 5.2, 2.2, { amb: 0.6, flat: 0.3 }), [c(GO, 1), c(GO, 2), c(GO, 3), c(GO, 4), c(GO, 5), c(GO, 6)], { lo: 2, dither: 0.2 });
      circlePts(8, 7, 2.6).forEach(([x, y]) => px(b, x, Math.round(7 + (y - 7) * 0.5), c(GO, 2)));
      px(b, 8, 7, c(GO, 2)); px(b, 5, 10, c(GO, 0)); px(b, 10, 11, c(GO, 0)); px(b, 12, 9, c(GR, 3));
      for (let x = 1; x <= 15; x++) if (!at(b, x, 15)) px(b, x, 15, G[1]);
    }
    if (kind === "dandelion") { // 민들레: 홀씨 공 둘 + 노란 꽃 하나
      [[5, 4, 2.4], [11, 7, 2.0]].forEach(([x, y, r]) => {
        line(b, x, y + r, x + (x < 8 ? -1 : 1), 14, c(GR, 1 + 2));
        blob(b, ell(x, y, r, r, { amb: 0.6 }), [c(SL, 2), c(SL, 3), c(SL, 3), c(SL, 4), c(SL, 5), c(SL, 5)], { lo: 2, dither: 0.7, outline: false });
        px(b, x, y, c(GO, 4)); px(b, x - r, y, c(SL, 3)); px(b, x + r - 1, y - 1, c(SL, 3));
      });
      line(b, 8, 11, 8, 14, c(GR, 3)); px(b, 7, 10, FL[1]); px(b, 8, 10, FL[1]); px(b, 9, 10, FL[1]); px(b, 8, 9, FL[1]); px(b, 8, 10, c(GO, 3));
      px(b, 7, 13, c(GR, 4)); px(b, 9, 12, c(GR, 4));
    }
    if (kind === "lamp") { // 가로등(저녁에 빛 점)
      for (let y = 4; y <= 14; y++) { px(b, 7, y, c(INK, 4)); px(b, 8, y, c(INK, 5)); }
      rect(b, 6, 14, 4, 1, c(INK, 3)); px(b, 6, 13, c(INK, 4)); px(b, 9, 13, c(INK, 4));
      rect(b, 6, 1, 4, 1, c(INK, 4)); px(b, 5, 2, c(INK, 4)); px(b, 10, 2, c(INK, 4));
      const on = L >= 3;
      rect(b, 6, 2, 4, 2, on ? GO[6] : c(SL, 3)); px(b, 6, 2, on ? GO[5] : c(SL, 4)); px(b, 9, 3, on ? GO[4] : c(SL, 2));
      for (let x = 5; x <= 10; x++) if (!at(b, x, 15)) px(b, x, 15, G[1]);
    }
    return b;
  }
  const TILE_KINDS = [["g", 0], ["g", 1], ["g", 2], ["path", 0], ["bench", 0], ["stump", 0], ["dandelion", 0], ["lamp", 0], ["wall", 0], ["wall", 1]];
  const WALL0 = 8, LAMP = 7;
  let GND = null;
  function groundSet() {
    if (GND) return GND;
    GND = { atlas: [], runs: [], lampG: glowImg(40, 40, [[20, 20, 16, GO[5], 0.55], [20, 20, 6, GO[6], 0.5]]), lampHead: glowImg(14, 12, [[7, 6, 5, GO[6], 0.7]]) };
    for (let L = 0; L < LEVELS; L++) {
      const tiles = TILE_KINDS.map(([k, v]) => runsOf(buildTile(L, k, v)));
      const c = mkCanvas(T * tiles.length, T);
      if (c) { const x = c.getContext("2d"); tiles.forEach((r, i) => paintRuns(x, r, i * T, 0)); }
      GND.atlas.push(c); GND.runs.push(tiles);
    }
    return GND;
  }
  function tileIdx(tx, ty) {
    const ins = tx >= 0 && ty >= 0 && tx * T < WORLD && ty * T < WORLD;
    const h = hash(tx, ty);
    if (!ins) return WALL0 + (h & 1);
    if (h % 100 < 6 && tx > 0 && ty > 0 && (tx + 1) * T < WORLD && (ty + 1) * T < WORLD) return 4 + ((h >>> 8) % 4);
    const r = (h >>> 4) % 16;
    return r < 6 ? 0 : r < 10 ? 1 : r < 14 ? 2 : 3;
  }

  // ═════════════════════════════════════════════════════════════════
  // 내보내기
  // ═════════════════════════════════════════════════════════════════
  const api = {};
  api.TILE = T; api.WORLD = WORLD;

  api.drawShadow = function (ctx, x, y, w) {
    w = Math.max(3, Math.round(w)); const h = Math.max(2, Math.round(w / 3)); x = Math.round(x); y = Math.round(y);
    for (let j = 0; j < h; j++) {
      const v = (j + 0.5 - h / 2) / (h / 2), hw = Math.round((w / 2) * Math.sqrt(Math.max(0, 1 - v * v)));
      ctx.fillStyle = rgba(INK[0], 0.38); ctx.fillRect(x - hw, y - (h >> 1) + j, hw * 2, 1);
    }
  };

  api.drawGround = function (ctx, camX, camY, w, h, tod, t) {
    tod = Math.max(0, Math.min(1, tod || 0));
    const G = groundSet(), L = Math.max(0, Math.min(LEVELS - 1, Math.round(tod * (LEVELS - 1))));
    const atlas = G.atlas[L], runs = G.runs[L];
    camX = Math.floor(camX); camY = Math.floor(camY);
    const tx0 = Math.floor(camX / T), ty0 = Math.floor(camY / T), tx1 = Math.floor((camX + w - 1) / T), ty1 = Math.floor((camY + h - 1) / T);
    const lamps = [];
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const X = tx * T, Y = ty * T, i = tileIdx(tx, ty);
      const cut = i < WALL0 && (X + T > WORLD || Y + T > WORLD);
      const idx = cut ? WALL0 + (hash(tx, ty) & 1) : i;
      if (atlas) ctx.drawImage(atlas, idx * T, 0, T, T, X, Y, T, T); else paintRuns(ctx, runs[idx], X, Y);
      if (cut) {
        const iw = Math.min(T, WORLD - X), ih = Math.min(T, WORLD - Y);
        if (iw > 0 && ih > 0) { if (atlas) ctx.drawImage(atlas, i * T, 0, iw, ih, X, Y, iw, ih); else paintRuns(ctx, runs[i], X, Y); }
      }
      if (i === LAMP && L >= 3) lamps.push([X, Y]);
      else if (i === 1 && L === 4 && t != null) { // 저녁 반딧불 점
        const k = 0.5 + 0.5 * Math.sin(t * 2.2 + (hash(tx, ty) % 628) / 100);
        if (k > 0.6) { ctx.fillStyle = rgba(GO[5], (k - 0.6) * 2); ctx.fillRect(X + 3 + (hash(ty, tx) % 9), Y + 2 + Math.round(k * 3), 1, 1); }
      }
    }
    // 생울타리 둑: 경계 바깥쪽에 볕 받은 잎 덩이 줄
    const Hd = HEDGE[L];
    const edge = (horiz, pos, from, to, out) => {
      if (horiz ? (pos < camY - 6 || pos > camY + h + 6) : (pos < camX - 6 || pos > camX + w + 6)) return;
      const a = Math.max(from, (horiz ? camX : camY) - 2), z = Math.min(to, (horiz ? camX + w : camY + h) + 2);
      for (let s = a - (a % 4); s < z; s += 4) {
        const hh = 4 + (hash(s, pos + out) % 3);
        ctx.fillStyle = Hd[2];
        if (horiz) ctx.fillRect(s, out < 0 ? pos - hh : pos, 4, hh); else ctx.fillRect(out < 0 ? pos - hh : pos, s, hh, 4);
        ctx.fillStyle = Hd[3];
        if (horiz) ctx.fillRect(s + 1, out < 0 ? pos - hh : pos + hh - 1, 2, 1); else ctx.fillRect(out < 0 ? pos - hh : pos + hh - 1, s + 1, 1, 2);
        ctx.fillStyle = GROUND[L][1];
        if (horiz) ctx.fillRect(s, out < 0 ? pos - 1 : pos, 4, 1); else ctx.fillRect(out < 0 ? pos - 1 : pos, s, 1, 4);
      }
    };
    edge(true, 0, 0, WORLD, -1); edge(true, WORLD, 0, WORLD, 1); edge(false, 0, 0, WORLD, -1); edge(false, WORLD, 0, WORLD, 1);
    // 가로등 빛(노을은 옅게, 저녁은 진하게)
    if (lamps.length) {
      const ga = ctx.globalAlpha; ctx.globalAlpha = ga * (L === 4 ? 1 : 0.4);
      lamps.forEach(([X, Y]) => { putLit(ctx, G.lampG, X + 8 - 20, Y + 13 - 20); putLit(ctx, G.lampHead, X + 1, Y - 3); });
      ctx.globalAlpha = ga;
    }
    // 화면 위쪽 하늘 기운
    const band = (cols, n, frac, amax) => {
      const bh = Math.ceil((h * frac) / n);
      for (let i = 0; i < n; i++) { ctx.fillStyle = rgba(cols[Math.min(cols.length - 1, Math.floor((i / n) * cols.length))], amax * (1 - i / n)); ctx.fillRect(camX, camY + i * bh, w, bh); }
    };
    if (tod < 0.2) band([CY[5], CY[4], CY[4]], 8, 0.3, 0.3 * (1 - tod / 0.2));
    else if (tod > 0.55 && tod < 0.95) band([GO[4], GO[3], PK[4], VI[3]], 12, 0.4, 0.32 * Math.max(0, 1 - Math.abs(tod - 0.75) / 0.2));
    if (tod > 0.85) band([VI[1], VI[1], CY[0]], 6, 0.35, 0.4 * Math.min(1, (tod - 0.85) / 0.15));
  };

  api.drawCoco = function (ctx, x, y, t, dir, state, hurt, outfit) {
    const C = cocoSet(), O = C[outfit === "tee" ? "tee" : "harness"], st = COCO_STATES[state] ? state : "walk";
    const s = O[st], f = fr(t, COCO_STATES[st].fps, COCO_STATES[st].n), left = dir < 0;
    const fl = hurt && fr(t, 16, 2) === 0;
    const set = left ? (fl ? s.Lf : s.L) : (fl ? s.Rf : s.R);
    x = Math.round(x); y = Math.round(y);
    put(ctx, set[f], x - (left ? CW - 1 - CAX : CAX), y - CAY);
  };

  api.drawGauge = function (ctx, x, y, g, t) {
    const A = gaugeSet(); g = Math.max(0, Math.min(1, g || 0));
    const n = Math.min(15, Math.floor(g * 15 + 0.05));
    x = Math.round(x); y = Math.round(y);
    put(ctx, A.lv[n], x - 9, y - 2);
    if (n >= 15) {
      const k = 0.5 + 0.5 * Math.sin((t || 0) * 7);
      const ga = ctx.globalAlpha; ctx.globalAlpha = ga * (0.35 + 0.65 * k);
      putLit(ctx, A.glow, x - 13, y - 6);
      ctx.globalAlpha = ga;
    }
  };

  api.drawEnemy = function (ctx, kind, x, y, t, flash) {
    const E = enemySet(), s = E[kind] || E.brush, f = fr(t, s.fps, s.fr.length);
    x = Math.round(x); y = Math.round(y);
    put(ctx, (flash ? s.fl : s.fr)[f], x - s.ax, y - s.ay);
    if (s.gl.length && !flash) putLit(ctx, s.gl[f], x - s.ax - 8, y - s.ay - 8);
  };

  api.drawPickup = function (ctx, kind, x, y, t) {
    const P = pickupSet(); x = Math.round(x); y = Math.round(y);
    const bob = Math.round(Math.sin((t || 0) * 4 + x * 0.3) * 1);
    if (kind === "kibble") { put(ctx, P.kibble[fr((t || 0) + x * 0.013, 2, 2)], x - 2, y - 2); return; }
    if (kind === "treat") { putLit(ctx, P.treatG, x - 7, y - 5 + bob); put(ctx, P.treat[fr(t, 2, 2)], x - 4, y - 2 + bob); return; }
    if (kind === "chew") { put(ctx, P.chew, x - 4, y - 6 + bob); return; }
    if (kind === "meat") { putLit(ctx, P.meatG, x - 8, y - 11 + bob); put(ctx, P.meat[fr(t, 3, 2)], x - 5, y - 8 + bob); return; }
    if (kind === "lettuce") { put(ctx, P.lettuce, x - 4, y - 6 + bob); return; }
    if (kind === "fruit") { putLit(ctx, P.fruitG, x - 7, y - 8 + bob); put(ctx, P.fruit[fr(t, 3, 2)], x - 4, y - 5 + bob); return; }
  };

  api.drawProj = function (ctx, kind, x, y, t, ang) {
    const P = pickupSet(); x = Math.round(x); y = Math.round(y); ang = ang || 0;
    const q8 = (a) => ((Math.round((a / Math.PI) * 4) % 8) + 8) % 8;
    if (kind === "ball") { put(ctx, P.ball[fr(t, 12, 4)], x - 3, y - 3); return; }
    if (kind === "toy") { put(ctx, P.toy[q8(ang)], x - 5, y - 5); return; }
    if (kind === "chew") { put(ctx, P.chewRot[q8(ang + (t || 0) * 10)], x - 4, y - 4); return; }
    if (kind === "bark") {
      const i = ((Math.round((ang / Math.PI) * 8) % 16) + 16) % 16;
      putLit(ctx, P.bark[i][fr(t, 10, 2)], x - 8, y - 8); return;
    }
  };

  // 꼬리 바람: 옅은 초록 원 + 도는 꽃잎·잔디 조각(굽힌 판 + 점 n 개)
  const RING = new Map();
  function ringImg(key, r, fn) {
    if (RING.has(key)) return RING.get(key);
    const S = r * 2 + 3, im = imgFn(S, S, (c) => fn(c, r + 1));
    if (RING.size > 64) RING.clear();
    RING.set(key, im); return im;
  }
  api.drawAura = function (ctx, x, y, r, t) {
    r = Math.max(4, Math.round(r)); x = Math.round(x); y = Math.round(y);
    const im = ringImg("a" + r, r, (c, cx) => {
      for (let dy = -r; dy <= r; dy++) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy))); c.fillStyle = rgba(GR[3], 0.06); c.fillRect(cx - hw, cx + dy, hw * 2 + 1, 1); }
      circlePts(cx, cx, r).forEach(([px_, py], i) => { c.fillStyle = rgba(i % 6 < 3 ? GR[5] : GR[4], 0.28); c.fillRect(px_, py, 1, 1); });
    });
    const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = "lighter";
    put(ctx, im, x - r - 1, y - r - 1);
    const n = Math.max(6, Math.min(16, Math.round(r / 3))), rot_ = (t || 0) * 1.6;
    for (let i = 0; i < n; i++) {
      const a = rot_ + (i / n) * Math.PI * 2, rr = r - 2 - (i % 3), X = Math.round(x + Math.cos(a) * rr), Y = Math.round(y + Math.sin(a) * rr);
      ctx.fillStyle = rgba(i % 2 ? PK[4] : GR[5], 0.7); ctx.fillRect(X, Y, 1, 1);
      ctx.fillStyle = rgba(i % 2 ? PK[3] : GR[4], 0.45); ctx.fillRect(X - Math.round(Math.sin(a)), Y + Math.round(Math.cos(a)), 1, 1);
    }
    ctx.globalCompositeOperation = op;
  };

  // 똥꼬 스키 자국: 깎은 잔디 줄무늬(가운데 밝은 띠 + 양 가장자리 짙은 선). pts 앞쪽이 오래된 점.
  api.drawScoot = function (ctx, pts, t, alpha) {
    if (!pts || pts.length < 2) return;
    alpha = alpha == null ? 1 : Math.max(0, Math.min(1, alpha)); if (alpha <= 0) return;
    const P = (p) => (Array.isArray(p) ? p : [p.x, p.y]), n = pts.length;
    for (let i = 1; i < n; i++) {
      const [xa, ya] = P(pts[i - 1]), [xb, yb] = P(pts[i]), len = Math.max(1, Math.round(Math.hypot(xb - xa, yb - ya)));
      const a = alpha * (0.3 + 0.7 * (i / n)), nx = -(yb - ya) / len, ny = (xb - xa) / len;
      for (let s = 0; s < len; s++) {
        const x = xa + ((xb - xa) * s) / len, y = ya + ((yb - ya) * s) / len;
        ctx.fillStyle = rgba(GR[5], 0.42 * a); ctx.fillRect(Math.round(x - nx), Math.round(y - ny), 1, 1); ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        ctx.fillStyle = rgba(GR[1], 0.55 * a); ctx.fillRect(Math.round(x - nx * 2.5), Math.round(y - ny * 2.5), 1, 1); ctx.fillRect(Math.round(x + nx * 1.5), Math.round(y + ny * 1.5), 1, 1);
        if (((s + i * 3) % 7) === 0) { ctx.fillStyle = rgba(GR[5], 0.5 * a); ctx.fillRect(Math.round(x + nx * 3), Math.round(y + ny * 3), 1, 1); }
      }
    }
  };

  // 뱅글뱅글 끝 바람 고리
  api.drawSpinWave = function (ctx, x, y, r, alpha) {
    r = Math.max(3, Math.round(r)); alpha = alpha == null ? 1 : Math.max(0, Math.min(1, alpha)); if (alpha <= 0) return;
    const im = ringImg("s" + r, r, (c, cx) => {
      circlePts(cx, cx, r).forEach(([X, Y], i) => { c.fillStyle = rgba(i % 5 === 0 ? GR[5] : SL[5], 0.7); c.fillRect(X, Y, 1, 1); });
      if (r > 5) circlePts(cx, cx, r - 2).forEach(([X, Y], i) => { if (i % 4 < 2) { c.fillStyle = rgba(GR[4], 0.35); c.fillRect(X, Y, 1, 1); } });
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; circlePts(cx, cx, r + 1.5, a, a + 0.35).forEach(([X, Y]) => { c.fillStyle = rgba(SL[4], 0.5); c.fillRect(X, Y, 1, 1); }); }
    });
    const ga = ctx.globalAlpha, op = ctx.globalCompositeOperation; ctx.globalAlpha = ga * alpha; ctx.globalCompositeOperation = "lighter";
    put(ctx, im, Math.round(x) - r - 1, Math.round(y) - r - 1);
    ctx.globalAlpha = ga; ctx.globalCompositeOperation = op;
  };

  // 목욕 보스 물웅덩이 / 떨어질 자리 예고(점선)
  const ZONE = new Map();
  function zoneImgs(r, warn) {
    const key = r + (warn ? "w" : "z");
    if (ZONE.has(key)) return ZONE.get(key);
    const S = r * 2 + 5, cx = r + 2;
    const frames = range(4).map((f) => imgFn(S, S, (c) => {
      if (warn) {
        for (let dy = -r; dy <= r; dy++) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy))); c.fillStyle = rgba(CY[3], 0.08); c.fillRect(cx - hw, cx + dy, hw * 2 + 1, 1); }
        circlePts(cx, cx, r).forEach(([X, Y], i) => { if ((i + f * 2) % 6 < 3) { c.fillStyle = rgba(CY[4], 0.85); c.fillRect(X, Y, 1, 1); } });
        c.fillStyle = rgba(CY[5], 0.7); c.fillRect(cx - 1, cx, 3, 1); c.fillRect(cx, cx - 1, 1, 3);
        return;
      }
      for (let dy = -r; dy <= r; dy++) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy))); c.fillStyle = rgba(CY[2], 0.42); c.fillRect(cx - hw, cx + dy, hw * 2 + 1, 1); }
      circlePts(cx, cx, r).forEach(([X, Y, th]) => { c.fillStyle = rgba(Math.sin(th) < 0 ? CY[1] : CY[4], 0.8); c.fillRect(X, Y, 1, 1); });
      const rr = 2 + ((f * r) / 4) * 0.8;
      if (rr < r - 1) circlePts(cx, cx, rr).forEach(([X, Y], i) => { if (i % 3) { c.fillStyle = rgba(CY[5], 0.45 * (1 - rr / r)); c.fillRect(X, Y, 1, 1); } });
      c.fillStyle = rgba(SL[5], 0.7); c.fillRect(cx - Math.round(r * 0.5), cx - Math.round(r * 0.45), 2, 1); c.fillRect(cx + Math.round(r * 0.3), cx + Math.round(r * 0.2), 1, 1);
    }));
    if (ZONE.size > 24) ZONE.clear();
    ZONE.set(key, frames); return frames;
  }
  api.drawZone = function (ctx, x, y, r, t, warn) {
    r = Math.max(4, Math.round(r));
    const im = zoneImgs(r, !!warn)[fr(t, warn ? 10 : 5, 4)];
    put(ctx, im, Math.round(x) - r - 2, Math.round(y) - r - 2);
  };

  // 청소기 흡입 줄기: (x0,y0)=흡입구, (x1,y1)=빨아들이는 끝. 옅은 선 셋이 흡입구 쪽으로 흐른다.
  api.drawSuction = function (ctx, x0, y0, x1, y1, t) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy); if (L < 2) return;
    const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, ph = (t || 0) * 40;
    const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = "lighter";
    for (let k = -1; k <= 1; k++) {
      for (let s = 0; s < L; s += 1) {
        if (((s + ph + k * 3) % 8 + 8) % 8 > 3) continue;
        const spread = 1 + (s / L) * 4, wob = Math.sin(s * 0.4 + (t || 0) * 6 + k) * 0.6;
        const X = Math.round(x0 + ux * s + nx * (k * spread + wob)), Y = Math.round(y0 + uy * s + ny * (k * spread + wob));
        ctx.fillStyle = rgba(k ? SL[4] : SL[5], 0.45 * (1 - (s / L) * 0.6)); ctx.fillRect(X, Y, 1, 1);
      }
    }
    ctx.globalCompositeOperation = op;
  };

  api.warm = function () { cocoSet(); gaugeSet(); enemySet(); pickupSet(); groundSet(); return api; };
  api.sizes = {
    coco: [14, 15], cocoBuf: [CW, CH], cocoAnchor: [CAX, CAY], cocoHeadTop: 19, gauge: [19, 5],
    brush: 7, suds: 10, suds_s: 5, bell: 10, vacuum: 16, dog: 11, boss_vacuum: 38, boss_bath: 42,
    kibble: 4, treat: 6, chew: 7, meat: 9, lettuce: 7, fruit: 7, ball: 5, toy: 7, projChew: 6, bark: 14, tile: 16,
  };
  api.states = Object.keys(COCO_STATES);
  api._pal = { INK, SL, GO, RD, PK, GR, CY, VI };
  api._sets = () => ({ coco: cocoSet(), gauge: gaugeSet(), enemy: enemySet(), pickup: pickupSet(), ground: groundSet() });

  root.SurvArt.coco = api;
  if (canMake() && typeof document !== "undefined") { try { api.warm(); } catch (e) { COCO = GA = EN = PU = GND = null; } }
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
