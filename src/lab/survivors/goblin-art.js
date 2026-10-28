// @ts-nocheck — 디자인 세션 그림 정본 docs/lab-surv-goblin-art.js 를 그대로 옮긴 것. 그림을 고치면 docs 판을 고치고 다시 복사한다(tmp/lab-surv/sync-src.sh).
// 그냥 오락실 A 「도깨비 퇴치」 — 도트 그림. 아트 디렉션은 docs/lab-surv-goblin-artdir.md, 팔레트는 docs/lab-defense-artdir.md 3절만.
// 기법은 docs/lab-surv-coco-art.js 와 같다: 픽셀 버퍼에 한 번 굽고(정수 fillRect run), 프레임별 오프스크린 캔버스에 찍어 둔다.
// 프레임마다는 drawImage 한 번(+발광은 lighter 로 한 번). document 가 없으면(node) 굽기는 첫 그리기 때로 미룬다.
// 좌표: ctx 는 카메라 변환이 끝난 월드 아트 px. (x, y) = 발 기준점(그림자 중심). 빛은 왼쪽 위.
// 재료는 설화·장터 살림(체·엿·팥·복조리·소금·풍경)뿐이다. 무속·종교 표지(무당·굿·신당·부적 글씨·금줄·장승)는 그리지 않는다.
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
  const R_HAIR = [INK[0], INK[1], INK[2], INK[3], INK[4], INK[6]];
  const R_SKIN = [GO[1], GO[2], GO[4], GO[5], GO[6], GO[6]];
  const R_JEO = [GR[1], GR[2], GR[3], GR[4], GR[4], GR[5]]; // 연두 저고리
  const R_PANTS = [SL[0], SL[1], SL[2], SL[3], SL[4], SL[4]];
  const R_WOOD = [GO[0], GO[1], GO[1], GO[2], GO[3], GO[4]];
  const R_HORN = [GO[1], GO[2], GO[4], GO[5], GO[6], GO[6]];
  const R_STRAW = [GO[1], GO[2], GO[3], GO[4], GO[5], GO[5]];
  const R_IMP = [CY[0], CY[1], CY[2], CY[3], CY[3], CY[4]];
  const R_CLUB = [GR[0], GR[1], GR[2], GR[3], GR[3], GR[4]];
  const R_BELLY = [GR[2], GR[3], GR[4], GR[4], GR[5], GR[5]];
  const R_YAG = [VI[0], VI[1], VI[2], VI[2], VI[3], VI[4]];
  const R_WISP = [CY[1], CY[2], CY[3], CY[4], CY[5], CY[5]];
  const R_FOXF = [PK[0], PK[1], PK[2], PK[3], PK[4], PK[4]];
  const R_FOX = [VI[1], SL[1], SL[2], SL[3], SL[4], SL[5]];
  const R_GEU = [INK[0], VI[1], INK[1], INK[2], INK[3], INK[4]];
  const R_COIN = [GO[0], GO[1], GO[3], GO[4], GO[5], GO[6]];
  const R_RED = [RD[0], RD[1], RD[2], RD[3], RD[4], RD[5]];
  const R_YEOT = [GO[1], GO[2], GO[4], GO[5], GO[6], GO[6]];

  // ── 픽셀 버퍼(coco-art.js 와 같은 도구) ─────────────────────────────
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
  function inter(f, pred) { return (x, y) => (pred(x, y) ? f(x, y) : null); }
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
  function putA(ctx, im, x, y, a, lit) {
    const ga = ctx.globalAlpha; ctx.globalAlpha = ga * Math.max(0, Math.min(1, a));
    if (lit) putLit(ctx, im, x, y); else put(ctx, im, x, y);
    ctx.globalAlpha = ga;
  }
  function lum(hex) { const n = parseInt(hex.slice(1), 16); return (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; }
  function flashOf(b, hi, mid, cut = 0.16) { const n = Buf(b.w, b.h); for (let i = 0; i < b.c.length; i++) { const c = b.c[i]; if (c) n.c[i] = lum(c) < cut ? mid : hi; } return n; }

  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`; }
  function disc(ctx, cx, cy, r, col, a, sy = 1) {
    ctx.fillStyle = rgba(col, a); r = Math.max(0, r);
    const ry = Math.floor(r * sy);
    for (let dy = -ry; dy <= ry; dy++) {
      const v = dy / (r * sy || 1), hw = Math.floor(r * Math.sqrt(Math.max(0, 1 - v * v)) + 0.35);
      ctx.fillRect(Math.round(cx) - hw, Math.round(cy) + dy, hw * 2 + 1, 1);
    }
  }
  function glow3(ctx, cx, cy, r, col, a, sy) { disc(ctx, cx, cy, r, col, a * 0.1, sy); disc(ctx, cx, cy, r * 0.62, col, a * 0.28, sy); disc(ctx, cx, cy, Math.max(1, r * 0.3), col, a * 0.6, sy); }
  function glowImg(w, h, list) { return imgFn(w, h, (c) => list.forEach(([x, y, r, col, a, sy]) => glow3(c, x, y, r, col, a, sy))); }
  function circlePts(cx, cy, r, a0 = 0, a1 = Math.PI * 2, sy = 1) {
    const out = [], seen = new Set(), n = Math.max(16, Math.ceil(Math.abs(a1 - a0) * r * 2));
    for (let i = 0; i <= n; i++) {
      const th = a0 + ((a1 - a0) * i) / n, x = Math.round(cx + Math.cos(th) * r), y = Math.round(cy + Math.sin(th) * r * sy), k = x * 4096 + y;
      if (seen.has(k)) continue; seen.add(k); out.push([x, y, th]);
    }
    return out;
  }

  const range = (n) => Array.from({ length: n }, (_, i) => i);
  const fr = (t, fps, n) => ((Math.floor((t || 0) * fps) % n) + n) % n;
  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return (h ^ (h >>> 16)) >>> 0; }

  // 세는 자세 공통: 머리 위 붉은 팥알 점 k 개(글자 없이 「하나, 둘, 셋」)
  function countDots(b, cx, y, k) {
    for (let i = 0; i < k; i++) { const x = cx - 3 + i * 3; px(b, x, y, RD[4]); px(b, x, y + 1, RD[2]); }
  }
  // 큰 눈 하나(2×2): 흰자 + 눈동자. look "r"=오른쪽, "d"=아래(세는 중)
  function eye2(b, x, y, look) {
    px(b, x, y, SL[5]); px(b, x + 1, y, SL[4]); px(b, x, y + 1, SL[4]); px(b, x + 1, y + 1, SL[4]);
    if (look === "d") { px(b, x, y + 1, INK[1]); px(b, x + 1, y + 1, INK[1]); }
    else px(b, x + 1, y + 1, INK[1]);
  }

  // ═════════════════════════════════════════════════════════════════
  // 엿장수 꼬마 — 연두 저고리 + 색동 소매, 흰 바지 + 붉은 대님, 짚신. 까만 단발 + 뒤로 땋은 머리에 붉은 댕기.
  // 목에 멘 엿판이 몸 앞으로 넓게 튀어나오고(실루엣의 핵심), 들어 올린 손에 은빛 엿가위(걸을 때 찰칵 벌어졌다 닫힘).
  // 옆모습(오른쪽 보기)을 그리고 거울로 왼쪽. 버퍼 22×26, 발 기준점 (9, 24).
  // ═════════════════════════════════════════════════════════════════
  const KW = 22, KH = 26, KAX = 9, KAY = 24;
  const SAEK = [RD[4], GO[5], CY[4], PK[4], GR[5]]; // 색동 줄
  function kidLeg(b, x, foot, far) {
    for (let y = 19; y <= foot - 2; y++) { px(b, x, y, far ? SL[2] : SL[3]); px(b, x + 1, y, far ? SL[1] : SL[2]); }
    px(b, x, foot - 2, far ? RD[1] : RD[2]); px(b, x + 1, foot - 2, far ? RD[1] : RD[3]); // 대님
    px(b, x, foot - 1, far ? GO[2] : GO[4]); px(b, x + 1, foot - 1, far ? GO[2] : GO[3]); // 짚신
    px(b, x - 1, foot, GO[1]); px(b, x, foot, far ? GO[1] : GO[2]); px(b, x + 1, foot, far ? GO[1] : GO[2]); px(b, x + 2, foot, GO[1]);
  }
  function saekLine(b, x0, y0, x1, y1, w) { // 색동 소매: 굵기 w 의 줄, 길이 방향으로 색이 바뀐다
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n, c = SAEK[i % SAEK.length];
      px(b, x, y, c); if (w > 1) px(b, x, y + 1, c === GO[5] ? GO[4] : c === GR[5] ? GR[4] : c === CY[4] ? CY[3] : c === PK[4] ? PK[3] : RD[3]);
    }
  }
  function buildKid(f) {
    const b = Buf(KW, KH), bob = f % 2 ? -1 : 0;
    const L = [[-1, 1, 0, 0], [0, 0, 1, 0], [1, -1, 0, 0], [0, 0, 0, 1]][f]; // 가까운 발 dx, 먼 발 dx, 가까운 들림, 먼 들림
    const open = f % 2 === 1;
    const hx = 8.6, hy = 7.4 + bob;
    // 땋은 머리 + 댕기(뒤)
    line(b, hx - 3.6, hy + 1.5, hx - 4.6, hy + 4.5, INK[2]); px(b, hx - 4.2, hy + 3, INK[4]);
    px(b, hx - 5, hy + 5.4, RD[3]); px(b, hx - 6, hy + 5.6, RD[4]); px(b, hx - 4.6, hy + 6.4, RD[2]); px(b, hx - 5.6, hy + 6.6, RD[3]);
    // 먼 다리 → 바지 → 저고리 → 가까운 다리
    kidLeg(b, 9 + L[1], KAY - L[3], true);
    blob(b, ell(9, 18.4 + bob, 3.0, 2.0, { amb: 0.5 }), R_PANTS, { lo: 2, dither: 0.4 });
    kidLeg(b, 7 + L[0], KAY - L[2], false);
    // 먼 팔(들어 올림, 색동) — 엿가위 쥔 손
    saekLine(b, 10, 13 + bob, 13, 10 + bob, 2);
    blob(b, ell(9.2, 14.4 + bob, 3.7, 3.1, { amb: 0.4 }), R_JEO, { lo: 2, dither: 0.45 });
    // 동정(흰 깃) + 고름(빨강)
    px(b, 10, 12 + bob, SL[5]); px(b, 11, 13 + bob, SL[4]); px(b, 11, 14 + bob, RD[3]); px(b, 12, 15 + bob, RD[4]); px(b, 11, 16 + bob, RD[2]);
    // 엿판 끈
    line(b, 8, 12 + bob, 11, 15 + bob, GO[1]);
    // 엿판: 몸 앞으로 넓게
    const ty = 15 + bob;
    for (let x = 11; x <= 19; x++) {
      px(b, x, ty, GO[1]); px(b, x, ty + 1, GO[4]); px(b, x, ty + 2, GO[2]); px(b, x, ty + 3, GO[0]);
      if (x % 2 === 0) px(b, x, ty - 1, x % 4 === 0 ? GO[6] : SL[5]); // 엿가락 끝(흰 가락엿·호박엿)
      else if (x !== 11) px(b, x, ty, GO[5]);
    }
    px(b, 20, ty + 1, GO[0]); px(b, 20, ty + 2, GO[0]); px(b, 11, ty + 1, GO[5]);
    // 가까운 팔(색동) — 엿판 밑을 받친다
    saekLine(b, 8, 14 + bob, 10, 17 + bob, 1); px(b, 11, 18 + bob, GO[5]);
    // 머리: 머리칼 먼저, 얼굴은 앞·아래만
    const head = ell(hx, hy, 4.2, 4.0, { amb: 0.4 });
    const HM = blob(b, head, R_HAIR, { lo: 2, dither: 0.5 });
    const FM = blob(b, inter(head, (x, y) => (x > hx - 2.2 && y > hy - 1.4) || (y > hy + 2.2 && x > hx - 3.4)), R_SKIN, { lo: 2, dither: 0.35, outline: false, curve: (l) => 0.25 + l * 0.8 });
    for (let y = 0; y < KH; y++) for (let x = 0; x < KW; x++) { // 얼굴 둘레 외곽선은 살빛 램프
      const i = y * KW + x; if (HM[i]) continue;
      if ((FM[i - 1] && x > 0) || FM[i - KW] || (x < KW - 1 && FM[i + 1])) if (b.c[i] === INK[0] || b.c[i] === INK[1]) b.c[i] = GO[2];
    }
    // 앞머리 술 + 귀
    px(b, hx + 1, hy - 1.6, INK[3]); px(b, hx + 2.4, hy - 1.6, INK[2]); px(b, hx + 3.2, hy - 1.2, INK[3]);
    px(b, hx - 1.4, hy + 0.6, GO[4]); px(b, hx - 1.4, hy + 1.6, GO[3]); px(b, hx - 2.2, hy + 0.2, INK[3]); px(b, hx - 2.2, hy + 1.2, INK[2]);
    // 눈·볼·입
    px(b, hx + 2.2, hy + 0.2, INK[1]); px(b, hx + 2.2, hy + 1.2, INK[1]); px(b, hx + 2.2, hy - 0.4, SL[5]);
    px(b, hx + 1.4, hy + 2.4, RD[5]); px(b, hx + 3.8, hy + 2.6, RD[2]);
    // 엿가위: 짧고 넓적한 날 둘이 늘 V 로 벌어져 있고(칼처럼 안 보이게), 손잡이는 고리 둘. 걸을 때 찰칵: 홀수 프레임에 크게 벌어짐
    const sx = 14, sy = 8 + bob;
    px(b, 12, 10 + bob, SL[3]); px(b, 13, 11 + bob, SL[2]); px(b, 12, 11 + bob, INK[2]); // 고리 손잡이
    px(b, 14, 10 + bob, SL[3]); px(b, 15, 11 + bob, SL[2]); px(b, 14, 11 + bob, INK[2]);
    px(b, 13, 10 + bob, GO[5]); px(b, 13, 9 + bob, GO[4]); // 쥔 손
    const tips = open ? [[sx - 2, sy - 4], [sx + 4, sy - 3]] : [[sx - 0, sy - 4], [sx + 3, sy - 4]];
    tips.forEach(([x1, y1], i) => { line(b, sx, sy, x1, y1, i ? SL[4] : SL[5]); line(b, sx + 1, sy, x1 + 1, y1, i ? SL[2] : SL[3]); });
    px(b, sx, sy, GO[3]); px(b, sx + 1, sy, GO[2]);
    return b;
  }
  let KID = null;
  function kidSet() {
    if (KID) return KID;
    KID = { R: [], L: [], Rf: [], Lf: [] };
    range(4).forEach((f) => {
      const b = buildKid(f), fl = flashOf(b, GO[6], GO[4], 0.12);
      KID.R.push(img(b)); KID.L.push(img(mirror(b))); KID.Rf.push(img(fl)); KID.Lf.push(img(mirror(fl)));
    });
    return KID;
  }

  // ═════════════════════════════════════════════════════════════════
  // 도깨비들. 모두 눈이 크고 입이 웃는다(장난꾸러기). 이빨은 하나둘, 핏빛·찢김 없음.
  // ═════════════════════════════════════════════════════════════════
  // 꼬마 도깨비(8): 파랑 피부 + 초록 림·머리털, 금빛 외뿔, 작은 방망이
  function buildImp(f) {
    const W = 15, H = 16, b = Buf(W, H), ay = 14, bob = [0, -1, 0, -1][f], sw = [0, 1, 0, -1][f];
    const lift = [[1, 0], [0, 0], [0, 1], [0, 0]][f];
    [[5, lift[0]], [8, lift[1]]].forEach(([x, up], i) => { px(b, x, ay - 2 - up, CY[1]); px(b, x, ay - 1 - up, CY[1]); px(b, x, ay - up, CY[0]); px(b, x + 1, ay - up, i ? CY[0] : CY[1]); });
    // 방망이(뒤로 비스듬히)
    line(b, 11, 10 + bob, 12 + sw, 5 + bob, GO[2]);
    blob(b, ell(12.4 + sw, 3.6 + bob, 1.5, 1.9, { amb: 0.5 }), R_WOOD, { lo: 2, dither: 0.3 });
    px(b, 12 + sw, 3 + bob, GO[4]);
    blob(b, ell(7, 9 + bob, 4.3, 3.9, { amb: 0.4 }), R_IMP, { lo: 2, dither: 0.5, rim: GR[4] });
    // 머리털(초록) + 외뿔(금)
    px(b, 4, 6 + bob, GR[3]); px(b, 3, 7 + bob, GR[2]); px(b, 5, 5 + bob, GR[4]); px(b, 4, 5 + bob, GR[2]);
    blob(b, poly([[5.6, 6.2 + bob], [8.6, 6.2 + bob], [7.4, 1.6 + bob]], (nx) => 0.7 - nx * 0.4), R_HORN, { lo: 2, dither: 0.2, inner: false });
    eye2(b, 5, 8 + bob, "r"); eye2(b, 8, 8 + bob, "r");
    // 웃는 입 + 이 하나
    [[5, 11], [6, 12], [7, 12], [8, 12], [9, 11]].forEach(([x, y]) => px(b, x, y + bob, INK[1]));
    px(b, 8, 12 + bob, SL[5]);
    px(b, 11, 10 + bob, CY[3]); // 방망이 쥔 손
    return { b, W, H, ax: 7, ay };
  }
  function buildImpCount(f) {
    const W = 15, H = 18, b = Buf(W, H), ay = 16, k = [0, 1, 0, -1][f], nod = f === 1 || f === 2 ? 1 : 0;
    // 내려놓은 방망이
    line(b, 0, ay, 3, ay, GO[2]); px(b, 0, ay - 1, GO[3]); px(b, 1, ay - 1, GO[2]);
    blob(b, ell(7 + k * 0.4, 11.4, 4.6, 3.7, { amb: 0.4 }), R_IMP, { lo: 2, dither: 0.5, rim: GR[4] });
    // 앞으로 뻗은 발
    px(b, 9, ay, CY[1]); px(b, 10, ay, CY[0]); px(b, 4, ay, CY[1]); px(b, 5, ay, CY[0]);
    px(b, 5 + k, 8 + nod, GR[3]); px(b, 4 + k, 9 + nod, GR[2]);
    blob(b, poly([[5.8 + k, 8.6 + nod], [8.8 + k, 8.6 + nod], [7.6 + k * 1.5, 4.2 + nod]], (nx) => 0.7 - nx * 0.4), R_HORN, { lo: 2, dither: 0.2, inner: false });
    eye2(b, 5 + k, 10 + nod, "d"); eye2(b, 8 + k, 10 + nod, "d");
    px(b, 7 + k, 13 + nod, INK[1]); px(b, 8 + k, 13 + nod, INK[2]); // 오므린 입
    // 세는 손가락(들어 올림, 프레임마다 짚는 자리가 바뀐다)
    const tip = [12, 13, 12, 11][f];
    line(b, 11, 12, tip, 6, CY[3]); line(b, 12, 12, tip + 1, 7, CY[2]); px(b, tip, 5, CY[5]); px(b, tip, 6, CY[4]);
    countDots(b, 7, 1, [1, 2, 3, 3][f]);
    return { b, W, H, ax: 7, ay };
  }

  // 도깨비불(7): 청록 물방울 불꽃, 둥실
  function buildWisp(f) {
    const W = 13, H = 18, b = Buf(W, H), cy = 8 + [0, -1, -1, 0][f], sw = [0, 1, 0, -1][f];
    blob(b, union(ell(6.5, cy + 1.5, 3.4, 3.2, { amb: 0.6 }), poly([[3.3, cy + 1.2], [9.7, cy + 1.2], [6.5 + sw, cy - 5.4]], (nx, ny) => 0.8 - ny * 0.2 - nx * 0.2)), R_WISP, { lo: 2, dither: 0.6 });
    px(b, 6, cy + 2, SL[5]); px(b, 7, cy + 2, CY[5]); px(b, 6, cy + 3, CY[5]);
    px(b, 5, cy + 1, CY[0]); px(b, 5, cy + 2, CY[1]); px(b, 8, cy + 1, CY[0]); px(b, 8, cy + 2, CY[1]); // 눈
    px(b, 6 - sw, cy + 6 + (f % 2), CY[3]); px(b, 7 + sw, cy + 7 - (f % 2), CY[2]);
    return { b, W, H, ax: 6, ay: 16, cy };
  }
  // 여우불(6): 분홍 구슬 + 여우 귀 둘 + 말린 꼬리 불
  function buildFoxfire(f) {
    const W = 12, H = 16, b = Buf(W, H), cy = 7 + [0, -1, 0, 1][f];
    const tg = (x0, x1, tx, ty) => poly([[x0, cy - 1], [x1, cy - 1], [tx, ty]], (nx, ny) => 0.85 - ny * 0.3);
    const sw = [0, 1, 0, -1][f];
    blob(b, union(ell(6, cy, 3.1, 2.9, { amb: 0.6 }), tg(4.2, 7.8, 6 + sw, cy - 6.2), tg(2.8, 5, 3 - sw * 0.5, cy - 3.8), tg(7, 9.2, 9 - sw * 0.5, cy - 3.8)), R_FOXF, { lo: 2, dither: 0.6 });
    const tl = f % 2 ? [[2, cy + 2], [1, cy + 3], [1, cy + 4], [2, cy + 5]] : [[2, cy + 2], [1, cy + 3], [0, cy + 4], [1, cy + 5]];
    tl.forEach(([x, y], i) => px(b, x, y, i < 2 ? PK[3] : PK[2])); // 여우 꼬리처럼 말린 불 꼬리
    px(b, 4, cy, PK[0]); px(b, 7, cy, PK[0]); px(b, 5, cy + 1, PK[1]); px(b, 6, cy + 1, PK[1]);
    px(b, 6, cy - 1, RD[5]); px(b, 6 + sw, cy - 3, PK[4]);
    return { b, W, H, ax: 6, ay: 14, cy };
  }

  // 야광귀(9): 보라 털뭉치 밤 귀신, 청록 반점·청록 눈, 짚신 한 짝을 꼭 껴안음(신발을 좋아한다)
  function sandal(b, cx, cy) {
    blob(b, ell(cx, cy, 3.3, 1.5, { amb: 0.5 }), R_STRAW, { lo: 2, dither: 0.3 });
    for (let x = Math.round(cx - 2); x <= Math.round(cx + 2); x += 2) px(b, x, cy, GO[2]);
    px(b, cx + 2, cy - 1, GO[1]); px(b, cx - 1, cy - 1, GO[6]); // 앞코 끈
  }
  function buildYag(f) {
    const W = 17, H = 18, b = Buf(W, H), bob = [0, -1, -2, -1][f], hem = f % 2;
    const sk = [[3.6, 9], [12.4, 9], [12.8, 14.6], [11.2, 13.4 + hem], [9.6, 14.8 - hem], [8, 13.4 + hem], [6.4, 14.8 - hem], [4.8, 13.4 + hem], [3.2, 14.6]].map(([x, y]) => [x, y + bob]);
    blob(b, union(ell(8, 8.6 + bob, 4.6, 4.4, { amb: 0.4 }), poly(sk, (nx, ny) => 0.55 - nx * 0.3 - ny * 0.2)), R_YAG, { lo: 2, dither: 0.5, rim: CY[4] });
    // 삐친 털(정수리)
    [[5, 4, VI[3]], [6, 3, VI[4]], [8, 3, VI[3]], [9, 2, VI[4]], [11, 4, VI[3]]].forEach(([x, y, c]) => px(b, x, y + bob, c));
    // 청록 반점
    px(b, 4, 12 + bob, CY[3]); px(b, 5, 13 + bob, CY[2]); px(b, 12, 10 + bob, CY[3]);
    // 눈(청록 발광)
    [[6, 7], [9, 7]].forEach(([x, y]) => { px(b, x, y + bob, CY[5]); px(b, x, y + 1 + bob, CY[4]); px(b, x + 1, y + 1 + bob, VI[1]); });
    px(b, 8, 10 + bob, VI[0]); // 작은 입
    // 짚신 껴안기
    sandal(b, 11.6, 12 + bob);
    px(b, 9, 11 + bob, VI[4]); px(b, 13, 13 + bob, VI[3]);
    return { b, W, H, ax: 8, ay: 16, eyes: [[6, 7 + bob], [9, 7 + bob]] };
  }
  function buildYagCount(f) {
    const W = 17, H = 19, b = Buf(W, H), ay = 17, k = [0, 1, 0, -1][f], nod = f === 1 || f === 2 ? 1 : 0;
    sandal(b, 12.4, ay - 0.6); // 옆에 내려놓은 짚신
    const sk = [[3, 11], [13, 11], [13.6, ay + 0.5], [2.4, ay + 0.5]];
    blob(b, union(ell(8 + k * 0.4, 10.6, 4.8, 4.4, { amb: 0.4 }), poly(sk, (nx, ny) => 0.55 - nx * 0.3 - ny * 0.2)), R_YAG, { lo: 2, dither: 0.5, rim: CY[4] });
    [[5, 6], [6, 5], [8, 5], [9, 4], [11, 6]].forEach(([x, y], i) => px(b, x + k, y + nod, i % 2 ? VI[4] : VI[3]));
    px(b, 4, 14, CY[3]); px(b, 12, 12, CY[3]);
    [[6, 9], [9, 9]].forEach(([x, y]) => { px(b, x + k, y + nod, CY[4]); px(b, x + k, y + 1 + nod, CY[5]); });
    px(b, 8 + k, 12 + nod, VI[0]);
    const tip = [13, 14, 13, 12][f];
    line(b, 12, 12, tip, 7, VI[3]); px(b, tip, 6, VI[4]);
    countDots(b, 8, 1, [1, 2, 3, 3][f]);
    return { b, W, H, ax: 8, ay, eyes: [[6 + k, 9 + nod], [9 + k, 9 + nod]] };
  }

  // 방망이 도깨비(16): 초록 덩치, 금빛 뿔 둘, 짚 허리띠, 어깨에 멘 큰 방망이(울퉁불퉁 혹)
  function bigClub(b, x0, y0, x1, y1, wide) {
    const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0);
    blob(b, rot((u, v) => { if (u < 0 || u > L) return null; const hw = 1 + (u / L) * wide; if (Math.abs(v) > hw) return null; return { l: Math.max(0, Math.min(1, 0.65 - v * 0.25 / hw - u * 0.01)), nx: 0, ny: v / hw }; }, x0, y0, a), R_WOOD, { lo: 2, dither: 0.4 });
    for (let s = 0.45; s < 1; s += 0.18) { const x = x0 + (x1 - x0) * s, y = y0 + (y1 - y0) * s; px(b, x - Math.sin(a) * (1 + s * wide), y + Math.cos(a) * (1 + s * wide) * 0 - 0.5, GO[4]); px(b, x, y, GO[3]); }
  }
  function buildClub(f) {
    const W = 30, H = 30, b = Buf(W, H), ay = 28, bob = [0, 1, 0, 1][f];
    const lift = [[0, 0], [1, 0], [0, 0], [0, 1]][f];
    // 방망이(어깨 뒤)
    bigClub(b, 21, 21 + bob, 26, 4 + bob, 2.4);
    // 다리
    [[9, lift[0]], [16, lift[1]]].forEach(([x, up]) => {
      blob(b, poly([[x, 22], [x + 4, 22], [x + 4, ay - up], [x - 0.5, ay - up]], (nx) => 0.6 - nx * 0.3), R_CLUB, { lo: 2, dither: 0.3 });
      for (let i = -1; i <= 4; i++) px(b, x + i, ay - up, GR[0]);
    });
    const BM = blob(b, ell(14, 16.5 + bob, 7.8, 7.4, { amb: 0.4 }), R_CLUB, { lo: 2, dither: 0.5, rim: GR[4] });
    blob(b, ell(14.6, 19.4 + bob, 4.2, 3.0, { amb: 0.6 }), R_BELLY, { lo: 2, dither: 0.4, outline: false });
    // 짚 허리띠
    for (let x = 6; x <= 22; x++) { const y = 22 + bob; if (BM[y * W + x]) { px(b, x, y, x % 2 ? GO[4] : GO[3]); if (BM[(y + 1) * W + x]) px(b, x, y + 1, GO[1]); } }
    px(b, 12, 23 + bob, GO[5]); px(b, 12, 24 + bob, GO[3]); px(b, 13, 25 + bob, GO[3]); // 매듭
    // 뿔 둘
    blob(b, poly([[8.4, 11.4 + bob], [11.4, 10.2 + bob], [8.6, 5.2 + bob]], (nx) => 0.7 - nx * 0.4), R_HORN, { lo: 2, dither: 0.2, inner: false });
    blob(b, poly([[16.6, 10.2 + bob], [19.6, 11.4 + bob], [19.4, 5.2 + bob]], (nx) => 0.7 - nx * 0.4), R_HORN, { lo: 2, dither: 0.2, inner: false });
    // 더벅머리
    [[11, 9], [12, 8], [13, 9], [14, 8], [15, 9], [16, 9]].forEach(([x, y], i) => px(b, x, y + bob, i % 2 ? INK[4] : INK[3]));
    // 눈썹(짙게) + 큰 눈
    line(b, 9, 12 + bob, 12, 13 + bob, INK[2]); line(b, 16, 13 + bob, 19, 12 + bob, INK[2]);
    [[9, 14], [16, 14]].forEach(([x, y]) => { rect(b, x, y + bob, 3, 2, SL[4]); px(b, x, y + bob, SL[5]); px(b, x + 1, y + 1 + bob, INK[1]); px(b, x + 2, y + 1 + bob, INK[1]); px(b, x + 1, y + 2 + bob, GR[1]); px(b, x + 2, y + 2 + bob, GR[1]); });
    // 코 + 크게 웃는 입 + 아랫니 둘
    px(b, 14, 16 + bob, GR[1]); px(b, 15, 16 + bob, GR[2]);
    [[10, 18], [11, 19], [12, 19], [13, 19], [14, 19], [15, 19], [16, 19], [17, 19], [18, 18]].forEach(([x, y]) => px(b, x, y + bob, INK[1]));
    px(b, 11, 18 + bob, SL[5]); px(b, 17, 18 + bob, SL[5]);
    // 팔(방망이 쥔 손 + 반대 팔)
    blob(b, ell(21.4, 19.6 + bob, 2.0, 2.4, { amb: 0.5 }), R_CLUB, { lo: 2, dither: 0.3 });
    blob(b, ell(5.8, 19 + bob, 1.8, 2.6, { amb: 0.4 }), R_CLUB, { lo: 2, dither: 0.3 });
    return { b, W, H, ax: 14, ay };
  }
  function buildClubCount(f) {
    const W = 30, H = 31, b = Buf(W, H), ay = 29, k = [0, 1, 0, -1][f], nod = f === 1 || f === 2 ? 1 : 0;
    bigClub(b, 1, ay - 1, 11, ay - 1.6, 1.6); // 내려놓은 방망이
    blob(b, ell(15, ay - 1.6, 8, 2.0, { amb: 0.6 }), R_CLUB, { lo: 2, dither: 0.3 }); // 책상다리
    const BM = blob(b, ell(15 + k * 0.4, 19.6, 8.0, 6.6, { amb: 0.4 }), R_CLUB, { lo: 2, dither: 0.5, rim: GR[4] });
    blob(b, ell(15.6, 22.4, 4.2, 2.8, { amb: 0.6 }), R_BELLY, { lo: 2, dither: 0.4, outline: false });
    for (let x = 7; x <= 23; x++) { const y = 25; if (BM[y * W + x]) px(b, x, y, x % 2 ? GO[4] : GO[3]); }
    const hx = k, hy = nod + 3;
    blob(b, poly([[9.4 + hx, 11.4 + hy], [12.4 + hx, 10.2 + hy], [9.6 + hx, 5.2 + hy]], (nx) => 0.7 - nx * 0.4), R_HORN, { lo: 2, dither: 0.2, inner: false });
    blob(b, poly([[17.6 + hx, 10.2 + hy], [20.6 + hx, 11.4 + hy], [20.4 + hx, 5.2 + hy]], (nx) => 0.7 - nx * 0.4), R_HORN, { lo: 2, dither: 0.2, inner: false });
    [[12, 9], [13, 8], [14, 9], [15, 8], [16, 9], [17, 9]].forEach(([x, y], i) => px(b, x + hx, y + hy, i % 2 ? INK[4] : INK[3]));
    [[10, 14], [17, 14]].forEach(([x, y]) => { rect(b, x + hx, y + hy, 3, 2, SL[4]); px(b, x + hx, y + hy, SL[5]); px(b, x + 1 + hx, y + 1 + hy, INK[1]); px(b, x + hx, y + 1 + hy, INK[1]); });
    line(b, 10 + hx, 13 + hy, 12 + hx, 13 + hy, INK[2]); line(b, 17 + hx, 13 + hy, 19 + hx, 13 + hy, INK[2]);
    [[13, 18], [14, 19], [15, 19], [16, 19], [17, 18]].forEach(([x, y]) => px(b, x + hx, y + hy, INK[1])); // 오므린 입
    // 세는 손가락
    const tip = [24, 25, 24, 23][f];
    blob(b, ell(22.6, 19.4, 1.8, 2.2, { amb: 0.5 }), R_CLUB, { lo: 2, dither: 0.3 });
    line(b, 23, 18, tip, 11, GR[3]); line(b, 24, 18, tip + 1, 12, GR[2]); px(b, tip, 10, GR[4]);
    countDots(b, 15, 1, [1, 2, 3, 3][f]);
    return { b, W, H, ax: 15, ay };
  }

  // 구미호(36): 아홉 꼬리 흰여우, 옆모습 우아한 걸음. 꼬리는 부채처럼 펼쳐 물결, 끝은 연분홍. 눈은 웃으며 감음.
  function buildGumiho(f) {
    const W = 64, H = 52, b = Buf(W, H), ay = 49, bob = [0, -1, 0, -1][f];
    const bx = 26, by = 36 + bob, tips = [];
    for (let i = 8; i >= 0; i--) {
      const th = ((78 + i * 14 + Math.sin((f * Math.PI) / 2 + i * 0.8) * 6) * Math.PI) / 180;
      const dx = Math.cos(th), dy = -Math.sin(th), L = 21 - Math.abs(i - 4) * 0.8, a = Math.atan2(dy, dx);
      const M = blob(b, union(rell(bx + dx * L * 0.42, by + dy * L * 0.42, L * 0.46, 2.2, a, { amb: 0.55 }), rell(bx + dx * L * 0.7, by + dy * L * 0.7, L * 0.32, 3.4, a, { amb: 0.55 })), R_FOX, { lo: 3, dither: 0.45, inner: SL[2] });
      for (let j = 0; j < M.length; j++) if (M[j]) { const x = j % W, y = (j / W) | 0, s = (x + 0.5 - bx) * dx + (y + 0.5 - by) * dy; if (s > L * 0.88) b.c[j] = (x + y) % 2 ? PK[4] : SL[5]; else if (s > L * 0.8 && (x + y) % 2) b.c[j] = PK[4]; }
      tips.push([bx + dx * L * 0.92, by + dy * L * 0.92]);
    }
    const lg = [[0, 1, 0, 0], [0, 0, 1, 0], [1, 0, 0, 0], [0, 0, 0, 1]][f];
    const legLine = (x, up, far) => { for (let y = 40 + bob; y <= ay - up; y++) { px(b, x, y, far ? SL[2] : SL[4]); px(b, x + 1, y, far ? SL[1] : SL[3]); px(b, x + 2, y, far ? SL[1] : SL[2]); } px(b, x + 3, ay - up, far ? SL[1] : SL[2]); px(b, x - 1, ay - up, VI[1]); };
    legLine(29, lg[1], true); legLine(39, lg[3], true);
    blob(b, union(ell(34, 38 + bob, 10, 5.4, { amb: 0.45 }), ell(41, 34 + bob, 5.2, 5.6, { amb: 0.45 })), R_FOX, { lo: 3, dither: 0.45, rim: PK[4] });
    legLine(31, lg[0], false); legLine(42, lg[2], false);
    // 목 갈기
    [[44, 30], [45, 32], [44, 34], [45, 36]].forEach(([x, y]) => { px(b, x, y + bob, SL[5]); px(b, x + 1, y + 1 + bob, SL[4]); });
    // 머리(크게, 귀엽게) + 짧은 주둥이 + 큰 귀
    const hy = 25 + bob;
    blob(b, union(ell(46, hy, 6.4, 5.6, { amb: 0.45 }), ell(51.6, hy + 2.4, 3.4, 2.2, { amb: 0.5 }), poly([[40.6, hy - 3], [45, hy - 4.6], [41.4, hy - 11.6]], (nx) => 0.75 - nx * 0.3), poly([[46.4, hy - 4.6], [50.6, hy - 2.6], [49.8, hy - 11.6]], (nx) => 0.7 - nx * 0.3)), R_FOX, { lo: 3, dither: 0.4, rim: PK[4] });
    [[42, hy - 7], [42, hy - 6], [43, hy - 5], [48, hy - 7], [48, hy - 6], [48, hy - 5]].forEach(([x, y], i) => px(b, x, y, i % 3 === 0 ? PK[4] : PK[3])); // 귀 안
    px(b, 46, hy + 0, INK[3]); px(b, 47, hy - 1, INK[2]); px(b, 48, hy - 1, INK[2]); px(b, 49, hy, INK[3]); // 웃으며 감은 눈
    px(b, 47, hy + 2, PK[4]); px(b, 48, hy + 2, PK[3]); // 볼
    px(b, 54, hy + 1, INK[1]); px(b, 54, hy + 2, INK[2]); // 코
    px(b, 51, hy + 4, VI[1]); px(b, 52, hy + 4, VI[1]);
    return { b, W, H, ax: 35, ay, tips };
  }

  // 그슨대: 가까이 있을수록 위로 길쭉해지는 그림자. 둥근 머리 + 아래로 퍼지는 연기 자락, 청록 눈 둘(겁주기보다 멀뚱).
  const GEU_S = [1, 1.3, 1.6, 1.9, 2.2];
  function buildGeu(s, f) {
    const Ht = Math.round(30 * s), W = 22, H = Ht + 4, b = Buf(W, H), ay = H - 2, top = ay - Ht, cx = 11;
    const hr = 5.2, hyc = top + hr;
    const shape = (x, y) => {
      const dxh = (x - cx) / hr, dyh = (y - hyc) / hr;
      if (y < hyc) { if (dxh * dxh + dyh * dyh > 1) return null; return { l: Math.max(0, Math.min(1, 0.7 - dxh * 0.35 - dyh * 0.2)), nx: dxh, ny: dyh }; }
      const tt = (y - hyc) / (ay - hyc);
      const wave = Math.sin(y * 0.55 + f * 2.1) * 0.6 * tt;
      const hw = hr - 0.6 * Math.sin(tt * Math.PI) + 3.4 * tt * tt + wave;
      const dx = x - cx;
      if (Math.abs(dx) > hw) return null;
      if (tt > 0.88) { const k = Math.floor((x + f * 2) / 2) % 2; if (k && y > ay - 1.5) return null; }
      return { l: Math.max(0, Math.min(1, 0.55 - (dx / hw) * 0.35 - tt * 0.15)), nx: dx / hw, ny: 0.2 };
    };
    blob(b, shape, R_GEU, { lo: 2, dither: 0.6, rim: VI[2] });
    // 늘어진 팔 둘(가늘게)
    const ay2 = hyc + Math.round((ay - hyc) * 0.55);
    line(b, cx - hr - 0.4, hyc + 3, cx - hr - 1.4, ay2, VI[1]); line(b, cx + hr + 0.4, hyc + 3, cx + hr + 1.4, ay2, VI[1]);
    const ey = Math.round(hyc - 0.5);
    [[cx - 3, ey], [cx + 2, ey]].forEach(([x, y]) => { px(b, x, y, CY[5]); px(b, x + 1, y, CY[4]); px(b, x, y + 1, CY[4]); px(b, x + 1, y + 1, CY[3]); });
    px(b, cx, ey + 3, VI[2]); px(b, cx - 1, ey + 3, VI[1]);
    return { b, W, H, ax: cx, ay, eyes: [[cx - 2.5, ey + 0.5], [cx + 2.5, ey + 0.5]] };
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
      return s;
    };
    EN.imp = mk("imp", 4, 8, buildImp);
    EN.imp_count = mk("imp_count", 4, 3, buildImpCount);
    EN.wisp = mk("wisp", 4, 10, buildWisp, (o, f) => [[6.5, o.cy + 1, 7, CY[4], 0.45 + 0.1 * (f % 2)]]);
    EN.foxfire = mk("foxfire", 4, 10, buildFoxfire, (o, f) => [[6, o.cy, 6, PK[3], 0.45 + 0.1 * (f % 2)]]);
    EN.yagwang = mk("yagwang", 4, 6, buildYag, (o) => o.eyes.map(([x, y]) => [x + 0.5, y + 0.5, 2.5, CY[4], 0.5]));
    EN.yagwang_count = mk("yagwang_count", 4, 3, buildYagCount, (o) => o.eyes.map(([x, y]) => [x + 0.5, y + 0.5, 2.5, CY[4], 0.5]));
    EN.club = mk("club", 4, 4, buildClub);
    EN.club_count = mk("club_count", 4, 2.5, buildClubCount);
    EN.gumiho = mk("gumiho", 4, 5, buildGumiho, (o) => o.tips.map(([x, y]) => [x, y, 4, PK[4], 0.22]));
    EN.geuseundae = GEU_S.map((s) => mk("geuseundae", 3, 4, (f) => buildGeu(s, f), (o) => o.eyes.map(([x, y]) => [x, y, 3, CY[4], 0.55])));
    return EN;
  }

  // ═════════════════════════════════════════════════════════════════
  // 체 — 땅에 놓인 둥근 나무 테 + 말총 그물. 늘 눈에 띄게: 밝은 테 + 바닥에 깔린 옅은 빛 웅덩이.
  // 버퍼 19×15, 중심(기준점) (9, 7). 위에서 비스듬히 본 타원(가로 15·세로 10.5) + 테 옆면 2 px.
  // n(앉아 세는 수)은 테 위 붉은 팥알 점 n 개, 12시부터 시계 방향.
  // ═════════════════════════════════════════════════════════════════
  const SVW = 19, SVH = 15, SVX = 9, SVY = 7, SRX = 7.5, SRY = 5.2;
  const SIEVE_DOTS = range(12).map((i) => { const a = -Math.PI / 2 + (i / 12) * Math.PI * 2; return [Math.round(SVX + 0.5 + Math.cos(a) * 6.6 - 0.5), Math.round(SVY + 0.5 + Math.sin(a) * 4.5 - 0.5)]; });
  function buildSieve(gold, n) {
    const b = Buf(SVW, SVH), cx = SVX + 0.5, cy = SVY + 0.5;
    const W = gold ? [GO[1], GO[3], GO[4], GO[5], GO[6]] : [GO[0], GO[1], GO[2], GO[3], GO[4]];
    const inE = (x, y, rx, ry, oy = 0) => { const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy - oy) / ry; return nx * nx + ny * ny <= 1; };
    for (let y = 0; y < SVH; y++) for (let x = 0; x < SVW; x++) {
      const outer = inE(x, y, SRX, SRY), wall = inE(x, y, SRX, SRY, 2), inner = inE(x, y, SRX - 1.9, SRY - 1.7);
      if (!outer && wall) { px(b, x, y, y > cy + SRY + 0.6 ? W[0] : (x + y) % 3 === 0 ? W[1] : W[2]); continue; } // 테 옆면
      if (!outer) continue;
      if (!inner) { // 테 윗면: 왼쪽 위가 밝다
        const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx), lit = -Math.cos(a + Math.PI * 0.75);
        px(b, x, y, lit > 0.35 ? W[4] : lit > -0.3 ? W[3] : W[2]);
        continue;
      }
      // 그물: 실 + 구멍(구멍은 어둡게 비친다)
      const hole = (x % 2 === 1) && (y % 2 === 0), d = (x + 0.5 - cx) / SRX + (y + 0.5 - cy) / SRY;
      if (gold) px(b, x, y, hole ? GO[1] : d < -0.2 ? GO[6] : d < 0.5 ? GO[5] : GO[4]);
      else px(b, x, y, hole ? INK[1] : d < -0.2 ? SL[4] : d < 0.5 ? SL[3] : SL[2]);
    }
    // 안쪽 테 그늘(왼쪽 위 안벽) + 바깥 외곽선
    circlePts(cx - 0.5, cy - 0.5, SRX - 1.9, Math.PI, Math.PI * 1.75, (SRY - 1.7) / (SRX - 1.9)).forEach(([x, y]) => { if (at(b, x, y)) px(b, x, y, W[1]); });
    const M = b.c.map((c) => (c ? 1 : 0)), set = [];
    for (let y = 0; y < SVH; y++) for (let x = 0; x < SVW; x++) {
      if (M[y * SVW + x]) continue;
      const nb = (xx, yy) => xx >= 0 && yy >= 0 && xx < SVW && yy < SVH && M[yy * SVW + xx];
      if (nb(x + 1, y) || nb(x - 1, y) || nb(x, y + 1) || nb(x, y - 1)) set.push([x, y, y < cy && x < cx ? (gold ? GO[2] : GO[1]) : GO[0]]);
    }
    set.forEach(([x, y, c]) => px(b, x, y, c));
    for (let i = 0; i < n; i++) { const [x, y] = SIEVE_DOTS[i]; px(b, x, y, RD[4]); px(b, x, y + 1, gold ? RD[1] : RD[0]); }
    return b;
  }
  let SV = null;
  function sieveSet() {
    if (SV) return SV;
    SV = { armed: [], full: [] };
    for (let n = 0; n <= 12; n++) { SV.armed.push(img(buildSieve(false, n))); SV.full.push(img(buildSieve(true, n))); }
    SV.arming = img(buildSieve(false, 0));
    const G = 14;
    // 바닥 빛 웅덩이(늘 켬) · 맥동 테두리 빛 · 금빛
    SV.pool = glowImg(SVW + G * 2, SVH + G * 2, [[SVX + G + 0.5, SVY + G + 1, 11, GO[4], 0.32, 0.7]]);
    SV.ring = imgFn(SVW + 4, SVH + 4, (c) => {
      circlePts(SVX + 2.5, SVY + 2.5, SRX + 1, 0, Math.PI * 2, (SRY + 1) / (SRX + 1)).forEach(([x, y]) => { c.fillStyle = rgba(SL[5], 0.55); c.fillRect(x, y, 1, 1); });
      circlePts(SVX + 2.5, SVY + 2.5, SRX + 2, 0, Math.PI * 2, (SRY + 2) / (SRX + 2)).forEach(([x, y], i) => { if (i % 2) { c.fillStyle = rgba(CY[4], 0.35); c.fillRect(x, y, 1, 1); } });
    });
    SV.gold = glowImg(SVW + G * 2, SVH + G * 2, [[SVX + G + 0.5, SVY + G + 0.5, 14, GO[5], 0.6, 0.72]]);
    SV.ringGold = imgFn(SVW + 4, SVH + 4, (c) => {
      circlePts(SVX + 2.5, SVY + 2.5, SRX + 1, 0, Math.PI * 2, (SRY + 1) / (SRX + 1)).forEach(([x, y]) => { c.fillStyle = rgba(GO[6], 0.75); c.fillRect(x, y, 1, 1); });
      circlePts(SVX + 2.5, SVY + 2.5, SRX + 2, 0, Math.PI * 2, (SRY + 2) / (SRX + 2)).forEach(([x, y]) => { c.fillStyle = rgba(GO[5], 0.45); c.fillRect(x, y, 1, 1); });
    });
    return SV;
  }

  // ═════════════════════════════════════════════════════════════════
  // 줍는 것 · 탄
  // ═════════════════════════════════════════════════════════════════
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
    // 엽전 5×5(몸 4): 가운데 네모 구멍
    PU.coin = range(2).map((f) => { const b = Buf(5, 5); grid(b, [".abb.", "abccd", "bcecd", "bccdd", ".ddd."], { a: f ? GO[6] : GO[5], b: GO[5], c: GO[4], d: GO[2], e: INK[1] }); return img(b); });
    // 엽전 꾸러미 9×9(몸 7): 붉은 끈에 꿴 엽전 셋 + 금빛
    PU.coinBig = range(2).map((f) => {
      const b = Buf(9, 9);
      line(b, 1, 1, 7, 7, RD[3]); px(b, 0, 0, RD[4]); px(b, 1, 0, RD[2]);
      [[2.2, 2.6], [4.4, 4.4], [6.4, 6.4]].forEach(([x, y], i) => {
        blob(b, ell(x + 0.5, y + 0.5, 2.0, 1.7, { amb: 0.6 }), R_COIN, { lo: 2, dither: 0.3 });
        px(b, x, y, INK[1]); if (i === f + 1) px(b, x - 1, y - 1, GO[6]);
      });
      px(b, 8, 8, RD[4]); px(b, 8, 7, RD[3]);
      return img(b);
    });
    PU.coinG = glowImg(15, 15, [[7.5, 7.5, 6, GO[5], 0.45]]);
    // 팥죽 그릇 10×8: 나무 그릇 + 팥죽 + 새알심 + 김
    PU.porridge = range(3).map((f) => {
      const b = Buf(10, 10);
      blob(b, poly([[0.5, 5], [9.5, 5], [8, 8.5], [2, 8.5]], (nx, ny) => 0.65 - nx * 0.35 - ny * 0.1), R_WOOD, { lo: 2, dither: 0.4 });
      blob(b, ell(5, 5, 4.3, 1.4, { amb: 0.6 }), [RD[0], RD[1], RD[1], RD[2], RD[2], RD[3]], { lo: 2, dither: 0.3, outline: false });
      px(b, 3, 5, SL[5]); px(b, 6, 5, SL[4]); px(b, 5, 4, SL[5]);
      for (let x = 2; x <= 7; x++) px(b, x, 9, GO[0]);
      const st = [[3, 2 - (f % 2)], [6, 1 + (f % 2)], [4 + (f === 2 ? 1 : 0), 0]];
      st.forEach(([x, y]) => px(b, x, y, SL[3]));
      return img(b);
    });
    // 복주머니 8×9: 빨강 주머니 + 금 끈 + 금 점 무늬(글자 없음)
    PU.pouch = range(2).map((f) => {
      const b = Buf(9, 10);
      blob(b, union(ell(4.5, 6.6, 3.6, 3.0, { amb: 0.4 }), poly([[2.6, 4], [6.4, 4], [5.4, 5.6], [3.6, 5.6]])), R_RED, { lo: 2, dither: 0.4 });
      grid(b, [".a.b.", "abcba"], { a: RD[4], b: RD[3], c: RD[5] }, 2, 1); // 주름 입구
      line(b, 2, 4, 6, 4, GO[5]); px(b, 4, 4, GO[6]); px(b, 7, 5, GO[4]); px(b, 7, 6, GO[3]); // 끈 + 늘어진 술
      px(b, 3, 7, GO[5]); px(b, 5, 6, GO[5]); px(b, 6, 8, GO[4]); px(b, 4, 8, f ? GO[6] : GO[4]);
      return img(b);
    });
    PU.pouchG = glowImg(17, 17, [[8.5, 9, 7, RD[4], 0.4]]);
    // 엿가락(탄, 6): 8방향
    const yeotShape = (u, v) => { if (Math.abs(u) > 3.3 || Math.abs(v) > 1.0) return null; return { l: Math.max(0, Math.min(1, 0.7 - v * 0.3)), nx: u / 3.3, ny: v }; };
    const yeotDeco = (b, c, ca, sa) => { px(b, c - 0.5 + ca * 2, c - 0.5 + sa * 2, SL[5]); };
    PU.yeot = range(8).map((i) => rotImg(9, yeotShape, R_YEOT, { lo: 2, dither: 0.3 }, (i * Math.PI) / 8, yeotDeco));
    // 팥 한 줌(지름 14): 붉은 팥알 흩뿌림 2프레임
    PU.bean = range(2).map((f) => {
      const b = Buf(15, 15);
      for (let i = 0; i < 18; i++) {
        const h = hash(i * 17 + 3, i * 5 + f * 91), a = (h % 628) / 100, r = (((h >> 10) % 70) / 10) * (i < 6 ? 0.5 : 1);
        const x = Math.round(7 + Math.cos(a) * r), y = Math.round(7 + Math.sin(a) * r);
        px(b, x, y, RD[4]); px(b, x + 1, y, RD[3]); px(b, x, y + 1, RD[3]); px(b, x + 1, y + 1, RD[1]);
        if (i % 3 === 0) px(b, x, y, RD[5]); else if (i % 4 === 1) px(b, x, y, SL[4]); // 팥 눈(흰 점)
      }
      return img(b);
    });
    // 복조리(7): 대오리로 엮은 조리 + 손잡이, 8방향
    const joriShape = (u, v) => {
      const bowl = (u - 1.2) * (u - 1.2) / 9 + v * v / 6.25 <= 1 && u > -0.8;
      const handle = u <= -0.6 && u >= -4 && Math.abs(v) <= 0.9;
      if (!bowl && !handle) return null;
      return { l: Math.max(0, Math.min(1, 0.65 - v * 0.15 - u * 0.04)), nx: u / 4, ny: v / 2.5 };
    };
    const joriDeco = (b, c, ca, sa) => {
      for (let k = 0; k <= 3; k++) { const x = c - 0.5 + ca * k - sa * ((k % 2) - 0.5) * 2, y = c - 0.5 + sa * k + ca * ((k % 2) - 0.5) * 2; if (at(b, x, y)) px(b, x, y, GO[2]); }
      const x = c - 0.5 + ca * 2, y = c - 0.5 + sa * 2; if (at(b, x, y)) px(b, x, y, RD[3]); // 붉은 실 매듭
    };
    PU.jori = range(8).map((i) => rotImg(11, joriShape, R_STRAW, { lo: 2, dither: 0.4 }, (i * Math.PI) / 4, joriDeco));
    // 소금 구름(지름 10): 반투명 흰 알갱이 3프레임
    PU.salt = range(3).map((f) => imgFn(13, 13, (c) => {
      disc(c, 6, 6, 5, SL[4], 0.16); disc(c, 6, 6, 3, SL[5], 0.14);
      for (let i = 0; i < 16; i++) {
        const h = hash(i * 29 + f * 7, i * 3 + 1), a = (h % 628) / 100, r = ((h >> 9) % 50) / 10;
        c.fillStyle = rgba(i % 3 ? SL[5] : CY[5], 0.55 + ((h >> 4) % 4) * 0.1); c.fillRect(Math.round(6 + Math.cos(a) * r), Math.round(6 + Math.sin(a) * r), 1, 1);
      }
    }));
    return PU;
  }

  // ═════════════════════════════════════════════════════════════════
  // 바닥 — 밤 장터 마당. 16×16 타일: 다진 흙 3 + 멍석 1 + 소품 4(좌판·장독·짚단·등롱 기둥) + 담 2(싸리 울타리·초가 담) = 10칸 × 새벽 5단계.
  // ═════════════════════════════════════════════════════════════════
  const T = 16, WORLD = 540, LEVELS = 5;
  // 흙 5색 [가장 어두움, 그늘, 바탕, 볕, 하이라이트]
  const GROUND = [
    [INK[1], INK[2], INK[3], INK[4], CY[1]], // 0 깊은 밤: 남색
    [INK[1], INK[3], INK[4], INK[5], CY[2]], // 0.25
    [INK[2], INK[4], INK[5], INK[6], VI[2]], // 0.5
    [INK[3], INK[5], INK[6], SL[1], PK[2]], // 0.75 동이 튼다
    [INK[4], INK[6], SL[1], SL[2], SL[3]], // 1 새벽: 라벤더 흙(금빛은 하늘 띠에만)
  ];
  const SH = [-2, -2, -1, -1, 0]; // 소품 램프 내림
  function buildTile(L, kind, v) {
    const b = Buf(T, T), G = GROUND[L], sh = SH[L];
    const c = (ramp, i) => ramp[Math.max(0, Math.min(ramp.length - 1, i + sh))];
    if (kind === "wall") {
      if (v === 0) { // 싸리 울타리: 세운 싸릿대 다발 + 가로 동임
        rect(b, 0, 0, T, T, G[0]);
        for (let x = 0; x < T; x++) {
          const h = hash(x * 7 + 3, 11), top = 1 + (h % 3), col = x % 3 === 0 ? c(GO, 1) : x % 3 === 1 ? c(GO, 2) : c(GO, 1);
          for (let y = top; y < T; y++) px(b, x, y, (y + x) % 5 === 0 ? c(GO, 0) : col);
          px(b, x, top, c(GO, 3));
        }
        [5, 11].forEach((y) => { for (let x = 0; x < T; x++) { px(b, x, y, x % 2 ? c(GO, 3) : c(GO, 2)); px(b, x, y + 1, c(GO, 0)); } });
        return b;
      }
      // 초가 담: 흙돌담 + 위에 이엉(짚 지붕) 띠
      rect(b, 0, 0, T, T, c(GO, 1));
      for (let i = 0; i < 6; i++) { const h = hash(i * 13 + 5, 7), x = h % 13, y = 7 + ((h >> 5) % 7); rect(b, x, y, 3, 2, c(SL, 1)); px(b, x, y, c(SL, 2)); }
      for (let y = 0; y < 6; y++) for (let x = 0; x < T; x++) px(b, x, y, y === 5 ? c(GO, 1) : (x + y * 2) % 4 === 0 ? c(GO, 2) : y < 2 ? c(GO, 4) : c(GO, 3));
      for (let x = 0; x < T; x += 3) px(b, x, 6, c(GO, 2));
      return b;
    }
    rect(b, 0, 0, T, T, G[2]);
    for (let i = 0; i < 22; i++) { const h = hash(i * 13 + v * 7 + kind.length * 31, i + 5); px(b, h % T, (h >> 6) % T, (h >> 12) & 1 ? G[1] : G[3]); }
    if (kind === "d") {
      if (v === 0) { [[4, 5], [11, 11], [7, 13]].forEach(([x, y]) => { px(b, x, y, G[3]); px(b, x + 1, y, G[4]); px(b, x, y + 1, G[0]); px(b, x + 1, y + 1, G[1]); }); }
      if (v === 1) { line(b, 2, 9, 6, 10, G[1]); line(b, 6, 10, 9, 9, G[1]); line(b, 9, 9, 13, 11, G[1]); px(b, 5, 3, G[3]); px(b, 12, 4, G[3]); }
      if (v === 2) { [[3, 4, 1], [10, 6, -1], [6, 12, 1], [13, 13, -1]].forEach(([x, y, d]) => { px(b, x, y, c(GO, 2)); px(b, x + d, y + 1, c(GO, 1)); px(b, x + 2 * d, y + 1, c(GO, 2)); }); }
    }
    if (kind === "mat") { // 멍석 조각: 짚 엮음 무늬 둥근 네모
      for (let y = 3; y <= 13; y++) for (let x = 1; x <= 14; x++) {
        const corner = (x === 1 || x === 14) && (y === 3 || y === 13);
        if (corner) continue;
        const edge = x === 1 || x === 14 || y === 3 || y === 13;
        px(b, x, y, edge ? c(GO, 1) : ((Math.floor(x / 2) + y) % 2 ? c(GO, 3) : c(GO, 2)));
      }
      for (let x = 2; x <= 13; x++) px(b, x, 14, G[0]);
    }
    if (kind === "stall") { // 좌판: 다리 넷 낮은 판 + 천 차양(줄무늬) + 감 셋
      for (let x = 1; x <= 14; x++) { px(b, x, 2, x % 4 < 2 ? c(CY, 3) : c(SL, 4)); px(b, x, 3, x % 4 < 2 ? c(CY, 2) : c(SL, 3)); px(b, x, 4, c(INK, 3)); }
      [2, 13].forEach((x) => { for (let y = 4; y <= 13; y++) px(b, x, y, c(GO, 1)); });
      for (let x = 1; x <= 14; x++) { px(b, x, 9, c(GO, 3)); px(b, x, 10, c(GO, 2)); px(b, x, 11, c(GO, 0)); }
      [[4, 8], [7, 8], [10, 8], [5, 7]].forEach(([x, y], i) => { px(b, x, y, i === 3 ? c(GO, 4) : c(GO, 3)); px(b, x + 1, y, c(GO, 2)); px(b, x, y - 1, i === 3 ? c(GR, 3) : c(GO, 4)); });
      for (let x = 2; x <= 13; x++) if (!at(b, x, 14)) px(b, x, 14, G[0]);
    }
    if (kind === "jar") { // 장독 둘: 옹기 + 뚜껑 + 윤기
      const RJ = [c(GO, 0), c(GO, 0), c(GO, 1), c(GO, 1), c(GO, 2), c(GO, 3)];
      blob(b, ell(5.5, 9.5, 4.4, 4.6, { amb: 0.4 }), RJ, { lo: 2, dither: 0.4 });
      blob(b, ell(11.8, 11.4, 3.2, 3.2, { amb: 0.4 }), RJ, { lo: 2, dither: 0.4 });
      blob(b, ell(5.5, 4.8, 3.0, 1.0, { amb: 0.6 }), RJ, { lo: 3, dither: 0.2 });
      blob(b, ell(11.8, 8.2, 2.2, 0.8, { amb: 0.6 }), RJ, { lo: 3, dither: 0.2 });
      px(b, 3, 8, c(SL, 3)); px(b, 3, 9, c(SL, 2)); px(b, 10, 10, c(SL, 3));
    }
    if (kind === "straw") { // 짚단: 세워 묶은 짚
      for (let x = 4; x <= 11; x++) for (let y = 2; y <= 14; y++) {
        if (y < 4 && (x === 4 || x === 11)) continue;
        px(b, x, y, (x + (y >> 1)) % 3 === 0 ? c(GO, 2) : x < 7 ? c(GO, 4) : c(GO, 3));
      }
      for (let x = 4; x <= 11; x++) px(b, x, 8, c(GO, 1));
      [3, 12].forEach((x) => { px(b, x, 12, c(GO, 3)); px(b, x, 13, c(GO, 2)); px(b, x, 14, c(GO, 2)); });
      for (let x = 3; x <= 12; x++) px(b, x, 15, G[0]);
    }
    if (kind === "lantern") { // 등롱 기둥: 나무 기둥 + 종이 등롱
      for (let y = 3; y <= 14; y++) { px(b, 7, y, c(GO, 1)); px(b, 8, y, c(GO, 2)); }
      line(b, 8, 3, 12, 3, c(GO, 1));
      const on = L <= 3;
      const body = on ? [GO[4], GO[5], GO[6]] : [c(GO, 3), c(GO, 4), c(GO, 4)];
      px(b, 11, 4, c(RD, 2)); px(b, 12, 4, c(RD, 2)); px(b, 13, 4, c(RD, 2));
      for (let y = 5; y <= 8; y++) { px(b, 11, y, body[0]); px(b, 12, y, body[y < 7 ? 2 : 1]); px(b, 13, y, body[0]); }
      px(b, 11, 9, c(RD, 2)); px(b, 12, 9, c(RD, 3)); px(b, 13, 9, c(RD, 2)); px(b, 12, 10, c(RD, 3));
      rect(b, 6, 14, 4, 1, c(GO, 0)); for (let x = 5; x <= 10; x++) if (!at(b, x, 15)) px(b, x, 15, G[0]);
    }
    return b;
  }
  const TILE_KINDS = [["d", 0], ["d", 1], ["d", 2], ["mat", 0], ["stall", 0], ["jar", 0], ["straw", 0], ["lantern", 0], ["wall", 0], ["wall", 1]];
  const WALL0 = 8, LAMP = 7;
  let GND = null;
  function groundSet() {
    if (GND) return GND;
    GND = { atlas: [], runs: [], lampG: glowImg(44, 44, [[22, 22, 18, GO[4], 0.5], [22, 22, 7, GO[5], 0.45]]), lampHead: glowImg(12, 14, [[6, 7, 5, GO[6], 0.7]]) };
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
    if (!ins) return WALL0 + ((h >>> 3) % 3 === 0 ? 1 : 0);
    if (h % 100 < 6 && tx > 0 && ty > 0 && (tx + 1) * T < WORLD && (ty + 1) * T < WORLD) return 4 + ((h >>> 8) % 4);
    const r = (h >>> 4) % 16;
    return r < 8 ? 0 : r < 12 ? 1 : r < 15 ? 2 : 3;
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
      ctx.fillStyle = rgba(INK[0], 0.4); ctx.fillRect(x - hw, y - (h >> 1) + j, hw * 2, 1);
    }
  };

  api.drawGround = function (ctx, camX, camY, w, h, dawn, t) {
    dawn = Math.max(0, Math.min(1, dawn || 0));
    const G = groundSet(), L = Math.max(0, Math.min(LEVELS - 1, Math.round(dawn * (LEVELS - 1))));
    const atlas = G.atlas[L], runs = G.runs[L];
    camX = Math.floor(camX); camY = Math.floor(camY);
    const tx0 = Math.floor(camX / T), ty0 = Math.floor(camY / T), tx1 = Math.floor((camX + w - 1) / T), ty1 = Math.floor((camY + h - 1) / T);
    const lamps = [];
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const X = tx * T, Y = ty * T, i = tileIdx(tx, ty);
      const cut = i < WALL0 && (X + T > WORLD || Y + T > WORLD);
      const idx = cut ? WALL0 : i;
      if (atlas) ctx.drawImage(atlas, idx * T, 0, T, T, X, Y, T, T); else paintRuns(ctx, runs[idx], X, Y);
      if (cut) {
        const iw = Math.min(T, WORLD - X), ih = Math.min(T, WORLD - Y);
        if (iw > 0 && ih > 0) { if (atlas) ctx.drawImage(atlas, i * T, 0, iw, ih, X, Y, iw, ih); else paintRuns(ctx, runs[i], X, Y); }
      }
      if (i === LAMP && L <= 3) lamps.push([X, Y, hash(tx, ty)]);
    }
    // 경계 둑: 바깥쪽에 싸릿대 끝이 삐죽한 줄
    const F = [GO[[0, 0, 1, 1, 1][L]], GO[[1, 1, 2, 2, 2][L]], GO[[2, 2, 3, 3, 3][L]]];
    const edge = (horiz, pos, out) => {
      if (horiz ? (pos < camY - 8 || pos > camY + h + 8) : (pos < camX - 8 || pos > camX + w + 8)) return;
      const a = Math.max(0, (horiz ? camX : camY) - 2), z = Math.min(WORLD, (horiz ? camX + w : camY + h) + 2);
      for (let s = a - (a % 2); s < z; s += 2) {
        const hh = 3 + (hash(s, pos + out) % 4);
        ctx.fillStyle = F[1];
        if (horiz) ctx.fillRect(s, out < 0 ? pos - hh : pos, 1, hh); else ctx.fillRect(out < 0 ? pos - hh : pos, s, hh, 1);
        ctx.fillStyle = F[2];
        if (horiz) ctx.fillRect(s, out < 0 ? pos - hh : pos + hh - 1, 1, 1); else ctx.fillRect(out < 0 ? pos - hh : pos + hh - 1, s, 1, 1);
      }
      ctx.fillStyle = F[0];
      if (horiz) ctx.fillRect(a, out < 0 ? pos - 1 : pos, z - a, 1); else ctx.fillRect(out < 0 ? pos - 1 : pos, a, 1, z - a);
    };
    edge(true, 0, -1); edge(true, WORLD, 1); edge(false, 0, -1); edge(false, WORLD, 1);
    // 등롱 빛(밤엔 진하고, 동이 트면 옅어지다 새벽엔 끈다)
    if (lamps.length) {
      const base = [1, 1, 0.85, 0.4, 0][L], ga = ctx.globalAlpha;
      lamps.forEach(([X, Y, hh]) => {
        const fl = t == null ? 1 : 0.88 + 0.12 * Math.sin(t * 5 + (hh % 628) / 100);
        ctx.globalAlpha = ga * base * fl;
        putLit(ctx, G.lampG, X + 12 - 22, Y + 7 - 22); putLit(ctx, G.lampHead, X + 6, Y);
      });
      ctx.globalAlpha = ga;
    }
    // 화면 위쪽 하늘 기운: 깊은 밤 남색 → 0.7 부터 동쪽 하늘 분홍·금 띠
    const band = (cols, n, frac, amax) => {
      const bh = Math.ceil((h * frac) / n);
      for (let i = 0; i < n; i++) { ctx.fillStyle = rgba(cols[Math.min(cols.length - 1, Math.floor((i / n) * cols.length))], amax * (1 - i / n)); ctx.fillRect(camX, camY + i * bh, w, bh); }
    };
    if (dawn < 0.45) band([CY[0], CY[0], VI[0]], 8, 0.35, 0.45 * (1 - dawn / 0.45));
    if (dawn >= 0.7) band([GO[5], GO[4], PK[4], PK[3], VI[3]], 14, 0.42, 0.42 * Math.min(1, (dawn - 0.6) / 0.4));
  };

  const KID_FPS = 8;
  api.drawPlayer = function (ctx, x, y, t, dir, hurt) {
    const K = kidSet(), f = fr(t, KID_FPS, 4), left = dir < 0, fl = hurt && fr(t, 16, 2) === 0;
    const set = left ? (fl ? K.Lf : K.L) : (fl ? K.Rf : K.R);
    x = Math.round(x); y = Math.round(y);
    put(ctx, set[f], x - (left ? KW - 1 - KAX : KAX), y - KAY);
  };

  api.drawSieve = function (ctx, x, y, t, state, n) {
    const S = sieveSet(); x = Math.round(x); y = Math.round(y); t = t || 0;
    n = Math.max(0, Math.min(12, Math.round(n || 0)));
    const ox = x - SVX, oy = y - SVY;
    if (state === "arming") { putA(ctx, S.pool, ox - 14, oy - 14, 0.5, true); putA(ctx, S.arming, ox, oy, 0.5); return; }
    if (state === "full") {
      const k = 0.5 + 0.5 * Math.sin(t * 9);
      putA(ctx, S.gold, ox - 14, oy - 14, 0.6 + 0.4 * k, true);
      put(ctx, S.full[n], ox, oy);
      putA(ctx, S.ringGold, ox - 2, oy - 2, 0.55 + 0.45 * k, true);
      return;
    }
    const k = 0.5 + 0.5 * Math.sin(t * 3.4);
    putLit(ctx, S.pool, ox - 14, oy - 14);
    put(ctx, S.armed[n], ox, oy);
    putA(ctx, S.ring, ox - 2, oy - 2, 0.25 + 0.75 * k, true);
  };

  // 체 털기: 팥알·먼지가 원으로 튄다(반경 r). r 별로 한 번 굽고 alpha 로 흐린다.
  const RING = new Map();
  function ringImg(key, S, fn) {
    if (RING.has(key)) return RING.get(key);
    const im = imgFn(S, S, fn);
    if (RING.size > 64) RING.clear();
    RING.set(key, im); return im;
  }
  api.drawBurst = function (ctx, x, y, r, alpha) {
    r = Math.max(4, Math.round(r)); alpha = alpha == null ? 1 : Math.max(0, Math.min(1, alpha)); if (alpha <= 0) return;
    const S = r * 2 + 9, c0 = r + 4;
    const im = ringImg("b" + r, S, (c) => {
      disc(c, c0, c0, r * 0.95, GO[4], 0.08);
      circlePts(c0, c0, r * 0.62).forEach(([X, Y], i) => { if (i % 3 === 0) { c.fillStyle = rgba(SL[4], 0.45); c.fillRect(X, Y, 2, 1); } }); // 먼지 고리
      const nb = Math.max(10, Math.round(r * 0.7));
      for (let i = 0; i < nb; i++) {
        const h = hash(i * 31 + r, i * 7 + 2), a = (i / nb) * Math.PI * 2 + ((h % 100) / 100 - 0.5) * 0.4, rr = r * (0.78 + ((h >> 8) % 30) / 100);
        const X = Math.round(c0 + Math.cos(a) * rr), Y = Math.round(c0 + Math.sin(a) * rr);
        c.fillStyle = RD[3]; c.fillRect(X, Y, 2, 2); c.fillStyle = RD[1]; c.fillRect(X + 1, Y + 1, 1, 1); c.fillStyle = RD[5]; c.fillRect(X, Y, 1, 1);
        const X2 = Math.round(c0 + Math.cos(a) * (rr - 3)), Y2 = Math.round(c0 + Math.sin(a) * (rr - 3)); // 꼬리 줄
        c.fillStyle = rgba(RD[4], 0.4); c.fillRect(X2, Y2, 1, 1);
      }
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.4, rr = r * 0.4; c.fillStyle = rgba(GO[5], 0.5); c.fillRect(Math.round(c0 + Math.cos(a) * rr), Math.round(c0 + Math.sin(a) * rr), 1, 1); }
    });
    putA(ctx, im, Math.round(x) - c0, Math.round(y) - c0, alpha);
  };

  api.drawEnemy = function (ctx, kind, x, y, t, flash, scale) {
    const E = enemySet();
    let s = E[kind];
    if (kind === "geuseundae") { const sc = Math.max(1, Math.min(2.2, scale || 1)); s = E.geuseundae[Math.round((sc - 1) / 0.3)]; }
    if (!s) s = E.imp;
    const f = fr(t, s.fps, s.fr.length);
    x = Math.round(x); y = Math.round(y);
    put(ctx, (flash ? s.fl : s.fr)[f], x - s.ax, y - s.ay);
    if (s.gl.length && !flash) putLit(ctx, s.gl[f], x - s.ax - 8, y - s.ay - 8);
  };

  api.drawPickup = function (ctx, kind, x, y, t) {
    const P = pickupSet(); x = Math.round(x); y = Math.round(y);
    const bob = Math.round(Math.sin((t || 0) * 4 + x * 0.3) * 1);
    if (kind === "coin") { put(ctx, P.coin[fr((t || 0) + x * 0.013, 2, 2)], x - 2, y - 3); return; }
    if (kind === "coin_big") { putLit(ctx, P.coinG, x - 7, y - 9 + bob); put(ctx, P.coinBig[fr(t, 2, 2)], x - 4, y - 6 + bob); return; }
    if (kind === "porridge") { put(ctx, P.porridge[fr(t, 3, 3)], x - 5, y - 9); return; }
    if (kind === "pouch") { putLit(ctx, P.pouchG, x - 8, y - 12 + bob); put(ctx, P.pouch[fr(t, 2, 2)], x - 4, y - 9 + bob); return; }
  };

  api.drawProj = function (ctx, kind, x, y, t, ang) {
    const P = pickupSet(); x = Math.round(x); y = Math.round(y); ang = ang || 0; t = t || 0;
    if (kind === "yeot") { const i = ((Math.round(((ang + t * 14) / Math.PI) * 8) % 8) + 8) % 8; put(ctx, P.yeot[i], x - 4, y - 4); return; }
    if (kind === "bean") { put(ctx, P.bean[fr(t, 6, 2)], x - 7, y - 7); return; }
    if (kind === "jori") { const i = ((Math.round((ang / Math.PI) * 4) % 8) + 8) % 8; put(ctx, P.jori[i], x - 5, y - 5); return; }
    if (kind === "salt") { put(ctx, P.salt[fr(t, 8, 3)], x - 6, y - 6); return; }
  };

  // 풍경 소리: 옅은 금 고리 + 바깥으로 퍼지는 소리 호(글자·그림 없이)
  api.drawAura = function (ctx, x, y, r, t) {
    r = Math.max(4, Math.round(r)); x = Math.round(x); y = Math.round(y); t = t || 0;
    const S = r * 2 + 3, c0 = r + 1;
    const im = ringImg("a" + r, S, (c) => {
      for (let dy = -r; dy <= r; dy++) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy))); c.fillStyle = rgba(GO[4], 0.05); c.fillRect(c0 - hw, c0 + dy, hw * 2 + 1, 1); }
      circlePts(c0, c0, r).forEach(([X, Y], i) => { c.fillStyle = rgba(i % 5 < 3 ? GO[5] : GO[4], 0.3); c.fillRect(X, Y, 1, 1); });
    });
    const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = "lighter";
    put(ctx, im, x - c0, y - c0);
    for (let k = 0; k < 3; k++) {
      const p = (t * 0.7 + k / 3) % 1, rr = r * (0.35 + 0.65 * p), a = 0.55 * (1 - p);
      ctx.fillStyle = rgba(GO[6], a);
      for (let q = 0; q < 4; q++) {
        const a0 = q * (Math.PI / 2) + k * 0.6 + t * 0.4;
        for (let s = -2; s <= 2; s++) { const th = a0 + (s * 1.6) / Math.max(4, rr); ctx.fillRect(Math.round(x + Math.cos(th) * rr), Math.round(y + Math.sin(th) * rr), 1, 1); }
      }
    }
    ctx.globalCompositeOperation = op;
  };

  api.warm = function () { kidSet(); enemySet(); sieveSet(); pickupSet(); groundSet(); return api; };
  api.sizes = {
    player: [12, 16], playerBuf: [KW, KH], playerAnchor: [KAX, KAY], playerHeadTop: 21,
    imp: 8, wisp: 7, yagwang: 9, club: 16, foxfire: 6, gumiho: 36, geuseundae: 30, geuseundaeScales: GEU_S.slice(),
    sieve: [15, 11], sieveBuf: [SVW, SVH], sieveAnchor: [SVX, SVY],
    coin: 4, coin_big: 7, porridge: 9, pouch: 8, yeot: 6, bean: 14, jori: 7, salt: 10, tile: 16,
  };
  api._pal = { INK, SL, GO, RD, PK, GR, CY, VI };
  api._sets = () => ({ kid: kidSet(), enemy: enemySet(), sieve: sieveSet(), pickup: pickupSet(), ground: groundSet() });

  root.SurvArt.goblin = api;
  if (canMake() && typeof document !== "undefined") { try { api.warm(); } catch (e) { KID = EN = SV = PU = GND = null; } }
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
