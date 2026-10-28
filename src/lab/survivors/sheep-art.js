// @ts-nocheck — 디자인 세션 그림 정본 docs/lab-surv-sheep-art.js 를 그대로 옮긴 것. 그림을 고치면 docs 판을 고치고 다시 복사한다(tmp/lab-surv/sync-src.sh).
// 그냥 오락실 C 「새벽 양치기」 — 도트 그림. 아트 디렉션은 docs/lab-surv-sheep-artdir.md, 팔레트는 docs/lab-defense-artdir.md 3절만.
// 기법은 docs/lab-defense-art-bugs.js 와 같다: 픽셀 버퍼에 한 번 굽고(정수 fillRect run), 그 run 을 프레임별 오프스크린 캔버스에 찍어 둔다.
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
  const R_WOOL = [VI[1], VI[3], VI[4], SL[4], SL[5], GO[6]];
  const R_STARW = [CY[1], CY[2], CY[3], CY[4], CY[5], SL[5]];
  const R_FACE = [INK[1], INK[3], INK[4], INK[5], INK[6]];
  const R_FLUFF = [VI[0], VI[1], INK[4], VI[1], VI[2], VI[3]];
  const R_GOLD = [GO[0], GO[1], GO[2], GO[3], GO[4], GO[5], GO[6]];
  const R_RED = [RD[0], RD[1], RD[2], RD[3], RD[4], RD[5]];
  const R_DIAL = [GO[2], GO[4], SL[4], SL[5], GO[6]];
  const R_HAND = [VI[0], VI[1], INK[4], VI[1], VI[2], VI[3], VI[4]];
  const R_WOOD = [INK[1], GO[0], GO[0], GO[1], GO[2], GO[3]];
  const R_WOLF = [INK[1], CY[0], INK[3], CY[0], INK[4], CY[1], CY[2]];
  const R_SNOUT = [INK[1], CY[1], CY[1], CY[2], SL[2], SL[3]];
  const R_DARK = [VI[0], INK[3], INK[1], INK[2], VI[0], INK[3], VI[1], INK[4], INK[5]];
  const R_SLATE = [VI[1], SL[1], SL[2], SL[3], SL[4], SL[5]];
  const R_PILLOW = [VI[1], VI[3], VI[4], SL[4], SL[5], GO[6]];

  // ── 픽셀 버퍼 ─────────────────────────────────────────────────────
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
  // 여러 덩이를 한 몸으로: 가장 밝은 쪽 결과(덩이마다 둥근 명암이 살아 털 뭉치처럼 보인다)
  function union(...fs) { return (x, y) => { let best = null; for (const f of fs) { const r = f(x, y); if (r && (!best || r.l > best.l)) best = r; } return best; }; }
  function first(...fs) { return (x, y) => { for (const f of fs) { const r = f(x, y); if (r) return r; } return null; }; }
  function minus(f, g) { return (x, y) => (g(x, y) ? null : f(x, y)); }

  const BAYER = [[0, 0.5], [0.75, 0.25]];
  // 모양 칠하기: 색조 이동 명암 + 2×2 디더, 림 라이트, 선택적 외곽선(빈 칸의 위·왼쪽은 한 단 밝게).
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
  // 그림 한 장: { w, h, img(캔버스) 또는 runs }. 캔버스를 못 만들면 run 으로 칠한다.
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

  // 번쩍 판: 밝기로 둘로 나눠 칠한다(외곽선 쪽은 mid, 안쪽은 hi). 실루엣이 그대로 남는다.
  function lum(hex) { const n = parseInt(hex.slice(1), 16); return (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; }
  function flashOf(b, hi, mid, cut = 0.16) { const n = Buf(b.w, b.h); for (let i = 0; i < b.c.length; i++) { const c = b.c[i]; if (c) n.c[i] = lum(c) < cut ? mid : hi; } return n; }

  // ── 발광 ─────────────────────────────────────────────────────────
  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`; }
  function disc(ctx, cx, cy, r, col, a) {
    ctx.fillStyle = rgba(col, a); r = Math.max(0, r);
    for (let dy = -Math.floor(r); dy <= Math.floor(r); dy++) {
      const hw = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)) + 0.35);
      ctx.fillRect(Math.round(cx) - hw, Math.round(cy) + dy, hw * 2 + 1, 1);
    }
  }
  function glow3(ctx, cx, cy, r, col, a) { disc(ctx, cx, cy, r, col, a * 0.1); disc(ctx, cx, cy, r * 0.62, col, a * 0.28); disc(ctx, cx, cy, Math.max(1, r * 0.3), col, a * 0.6); }
  // 발광 판 굽기: list = [[x, y, r, col, a], ...]
  function glowImg(w, h, list) { return imgFn(w, h, (c) => list.forEach(([x, y, r, col, a]) => glow3(c, x, y, r, col, a))); }

  const range = (n) => Array.from({ length: n }, (_, i) => i);
  const fr = (t, fps, n) => ((Math.floor((t || 0) * fps) % n) + n) % n;

  // ═════════════════════════════════════════════════════════════════
  // 아이 — 잠옷(청록 별무늬) + 분홍 수면 모자 + 손 등불. 몸 12×16(모자 포함 20). 오른쪽 보기를 그리고 거울로 왼쪽.
  // ═════════════════════════════════════════════════════════════════
  const KID_PAL = {
    P: PK[1], N: PK[4], M: PK[3], m: PK[2], W: SL[5], w: VI[4], B: GO[6], b: GO[5],
    o: GO[1], h: GO[2], H: GO[1], s: GO[6], S: RD[5], k: PK[4], e: INK[2], r: RD[3], i: SL[5],
    d: CY[0], C: CY[3], L: CY[4], c: CY[2], y: GO[5],
  };
  const KID_TOP = [
    "................",
    ".......PPPP.....",
    ".....PPNNMMP....",
    "...PPNMMMMMMP...",
    ".PPmMMMMMMMMmP..",
    "WwPmmMMMMMMMMmP.",
    "wW.PBBBBBBBBBbP.",
    "...ohhsssssssSo.",
    "..ohhhssisssisSo",
    "..ohhhssesssesSo",
    "..ohhsskssrssk o".replace(" ", "S"),
    "...ohSSSSSSSSo..",
    "....dCCCCCCCd...",
    "...dLCyCCCyCcd..",
    "...dLCCCCCCCcd..",
    "...dsCCyCCCCcs..",
    "....dccccccccd..",
  ];
  const KID_W = 18, KID_H = 22, KID_AX = 9, KID_AY = 21;
  function buildKid(f) {
    const b = Buf(KID_W, KID_H);
    const oy = f % 2 === 0 ? 1 : 2; // 지나가는 프레임(0·2)은 몸이 1 px 뜬다
    const hem = 16 + oy;
    // 다리: [뒷다리 x, 앞다리 x, 뒷발 들림, 앞발 들림]
    const L = [[7, 10, 0, 0], [6, 12, 0, 0], [8, 10, 0, 0], [6, 12, 0, 1]][f];
    [[L[0], L[2], CY[2]], [L[1], L[3], CY[3]]].forEach(([x, up, col]) => {
      const sy = KID_AY - up;
      for (let y = hem + 1; y < sy; y++) { px(b, x, y, CY[1]); px(b, x + 1, y, col); }
      px(b, x, sy, PK[1]); px(b, x + 1, sy, PK[3]); px(b, x + 2, sy, PK[2]); px(b, x + 1, sy - 1, PK[4]);
    });
    grid(b, KID_TOP, KID_PAL, 1, oy);
    // 등불: 앞손(격자 13,15)에 매달려 흔들린다
    const hx = 14, hy = 15 + oy, sw = [0, 1, 0, 0][f];
    const lx = hx + sw;
    px(b, lx + 1, hy, GO[2]);
    px(b, lx, hy + 1, GO[1]); px(b, lx + 1, hy + 1, GO[2]); px(b, lx + 2, hy + 1, GO[1]);
    px(b, lx, hy + 2, GO[3]); px(b, lx + 1, hy + 2, GO[6]); px(b, lx + 2, hy + 2, GO[5]);
    px(b, lx, hy + 3, GO[4]); px(b, lx + 1, hy + 3, GO[5]); px(b, lx + 2, hy + 3, GO[3]);
    px(b, lx, hy + 4, GO[1]); px(b, lx + 1, hy + 4, GO[1]); px(b, lx + 2, hy + 4, GO[0]);
    return { b, glow: [lx + 1, hy + 2.5] };
  }
  let KID = null;
  function kid() {
    if (KID) return KID;
    KID = { w: KID_W, h: KID_H, ax: KID_AX, ay: KID_AY, R: [], L: [], Rf: [], Lf: [], Rg: [], Lg: [] };
    range(4).forEach((f) => {
      const { b, glow } = buildKid(f), m = mirror(b);
      KID.R.push(img(b)); KID.L.push(img(m));
      KID.Rf.push(img(flashOf(b, GO[6], GO[4]))); KID.Lf.push(img(flashOf(m, GO[6], GO[4])));
      const gl = (gx) => glowImg(KID_W + 12, KID_H + 12, [[gx + 6, glow[1] + 6, 5, GO[5], 0.7], [gx + 6, glow[1] + 6, 2, GO[6], 0.5]]);
      KID.Rg.push(gl(glow[0])); KID.Lg.push(gl(KID_W - 1 - glow[0]));
    });
    return KID;
  }

  // ═════════════════════════════════════════════════════════════════
  // 양 — 옆모습(오른쪽 보기, dir=-1 이면 거울). 몸 10×8(솜털양 12×10). 털은 덩이 여럿을 겹쳐 뭉게뭉게.
  // ═════════════════════════════════════════════════════════════════
  function buildSheep(kind, f) {
    const puff = kind === "puff", star = kind === "star", horn = kind === "horn";
    const W = puff ? 17 : 15, H = puff ? 16 : 14, ay = H - 1;
    const b = Buf(W, H);
    const bob = [0, -1, 0, -1][f];
    const cx = puff ? 7.5 : 6.5, cy = ay - (puff ? 6.6 : 5.6) + bob, rx = puff ? 5.6 : 4.6, ry = puff ? 4.0 : 3.1;
    // 다리 4(뒤 둘은 어둡게). 1·3 프레임에 한 쌍이 들린다
    // 털: 몸 타원 + 위 둘레 덩이
    const R = star ? R_STARW : R_WOOL;
    const parts = [ell(cx, cy, rx, ry, { amb: 0.45 })];
    const bumps = puff ? [[-0.95, 0.15], [-0.7, -0.7], [-0.15, -1.0], [0.45, -0.9], [0.85, -0.35], [-0.5, 0.6], [0.35, 0.6]] : [[-0.95, 0.1], [-0.6, -0.8], [0.0, -1.0], [0.6, -0.75], [-0.45, 0.6], [0.3, 0.6]];
    const br = puff ? 2.4 : 1.9;
    bumps.forEach(([u, v]) => parts.push(ell(cx + u * rx * 0.9, cy + v * ry * 0.85, br, br * 0.9, { amb: 0.45 })));
    blob(b, union(...parts), R, { lo: 2, dither: 0.5, curve: (l) => 0.08 + l * 0.95 });
    // 다리 4(몸 아래 빈 칸에만, 뒤 둘은 어둡게). 1·3 프레임에 한 쌍이 들린다
    (puff ? [3, 5, 9, 11] : [3, 5, 8, 10]).forEach((x, i) => {
      const lift = (f === 1 && i % 2 === 0) || (f === 3 && i % 2 === 1) ? 1 : 0, back = i === 1 || i === 3;
      for (let y = ay - 3; y <= ay - lift; y++) if (!at(b, x, y)) px(b, x, y, y === ay - lift ? (back ? INK[3] : INK[4]) : back ? INK[5] : INK[6]);
    });
    // 곱슬 무늬: 중간 밝기 칸에 작은 그늘 점
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = at(b, x, y);
      if ((c === R[4] || c === R[3]) && (x * 3 + y * 5 + (puff ? 1 : 0)) % 7 === 0) px(b, x, y, R[c === R[4] ? 3 : 2]);
    }
    // 얼굴(앞 오른쪽 아래)
    const fx = cx + rx + (puff ? 0.2 : 0.4), fy = cy + 0.6;
    blob(b, ell(fx, fy, 1.9, 2.3, { amb: 0.35 }), R_FACE, { lo: 2, dither: 0.3, lit: false });
    const ex = Math.round(fx), ey = Math.round(fy - 0.8);
    px(b, ex, ey, SL[5]); px(b, ex + 1, ey + 2, PK[3]); // 눈 반짝, 볼
    // 귀(뒤로 처짐) + 이마 털
    px(b, ex - 2, ey, INK[5]); px(b, ex - 3, ey + 1, INK[4]);
    px(b, ex - 1, ey - 2, R[4]); px(b, ex, ey - 2, R[3]);
    if (horn) {
      // 금 뿔: 귀 자리에서 뒤로 말린 고리
      [[ex - 1, ey - 1, GO[6]], [ex - 2, ey - 2, GO[5]], [ex - 3, ey - 2, GO[5]], [ex - 4, ey - 1, GO[4]], [ex - 4, ey, GO[3]], [ex - 3, ey + 1, GO[2]], [ex - 2, ey, GO[4]]]
        .forEach(([x, y, c]) => px(b, x, y, c));
      px(b, ex - 5, ey - 1, GO[1]); px(b, ex - 5, ey, GO[1]); px(b, ex - 2, ey - 3, GO[1]); px(b, ex - 3, ey - 3, GO[1]);
    }
    if (puff) { // 머리 꼭대기 솜 방울
      px(b, ex - 1, ey - 3, GO[6]); px(b, ex, ey - 3, SL[5]); px(b, ex - 2, ey - 3, R[3]);
    }
    const glow = [];
    if (star) {
      const pts = [[cx - 2, cy - 1], [cx + 1, cy - 2], [cx - 1, cy + 1.5], [cx + 2.5, cy + 0.5]];
      pts.forEach(([x, y], i) => { px(b, x, y, i % 2 === f % 2 ? CY[5] : SL[5]); glow.push([Math.round(x), Math.round(y)]); });
    }
    return { b, W, H, ax: Math.round(cx), ay, glow, head: [ex, ey] };
  }
  const SHEEP_KINDS = ["wool", "horn", "puff", "star"];
  let SHEEP = null;
  function sheepSet() {
    if (SHEEP) return SHEEP;
    SHEEP = {};
    SHEEP_KINDS.forEach((k) => {
      const s = { R: [], L: [], Rf: [], Lf: [], Rg: [], Lg: [] };
      range(4).forEach((f) => {
        const o = buildSheep(k, f), m = mirror(o.b);
        Object.assign(s, { w: o.W, h: o.H, ax: o.ax, ay: o.ay, head: o.head });
        s.R.push(img(o.b)); s.L.push(img(m));
        s.Rf.push(img(flashOf(o.b, GO[6], GO[4]))); s.Lf.push(img(flashOf(m, GO[6], GO[4])));
        if (o.glow.length) {
          const mk = (mir) => glowImg(o.W + 6, o.H + 6, o.glow.map(([x, y], i) => [(mir ? o.W - 1 - x : x) + 3, y + 3, (i + f) % 2 ? 2.4 : 1.6, CY[4], 0.75]));
          s.Rg.push(mk(false)); s.Lg.push(mk(true));
        }
      });
      SHEEP[k] = s;
    });
    // 땀방울(헤매는 양): 3×4
    const d = Buf(3, 4);
    px(d, 1, 0, CY[4]); px(d, 0, 1, CY[3]); px(d, 1, 1, CY[5]); px(d, 2, 1, CY[4]); px(d, 0, 2, CY[2]); px(d, 1, 2, CY[4]); px(d, 2, 2, CY[3]); px(d, 1, 3, CY[1]);
    SHEEP.drop = img(d);
    return SHEEP;
  }

  // ═════════════════════════════════════════════════════════════════
  // 악몽들
  // ═════════════════════════════════════════════════════════════════
  // 털뭉치(8): 보라 그림자 털 덩어리 + 노란 눈 둘. 2프레임 꿈틀
  function buildFluff(f) {
    const W = 12, H = 12, b = Buf(W, H), cx = 6, cy = f ? 7.2 : 6.6, rx = f ? 4.5 : 4.0, ry = f ? 3.4 : 3.9;
    const base = ell(cx, cy, rx, ry, { amb: 0.4 });
    const fuzzy = (x, y) => {
      const a = Math.atan2(y - cy, x - cx), k = 1 + 0.16 * Math.sin(a * 7 + f * 1.3) + 0.07 * Math.sin(a * 13);
      return ell(cx, cy, rx * k, ry * k, { amb: 0.4 })(x, y) || null;
    };
    blob(b, first(fuzzy, base), R_FLUFF, { lo: 3, dither: 0.6 });
    // 삐친 털 두 가닥
    px(b, 5, Math.round(cy - ry) - 1, VI[1]); px(b, 7, Math.round(cy - ry) - (f ? 1 : 2), VI[2]);
    const ey = Math.round(cy) - 1;
    [[4, ey], [7, ey]].forEach(([x, y]) => { px(b, x, y, GO[5]); px(b, x, y + 1, GO[4]); });
    px(b, 4, ey, GO[6]); px(b, 7, ey, GO[6]);
    return { b, W, H, ax: 6, ay: H - 1 };
  }
  // 째깍 시계(9): 금 몸 + 빨강 종 둘 + 다리. 4프레임 달리기·떨림
  function buildClock(f) {
    const W = 15, H = 15, b = Buf(W, H), sh = [0, 1, 0, -1][f], cx = 7.5 + sh * 0.5, cy = 7.0;
    // 다리
    const lift = [[0, 1], [0, 0], [1, 0], [0, 0]][f];
    [[5, lift[0]], [9, lift[1]]].forEach(([x, up]) => { px(b, x + sh, 11 - up, INK[4]); px(b, x + sh, 12 - up, INK[4]); px(b, x + sh - (x < 7 ? 1 : -1), 13 - up, INK[5]); px(b, x + sh, 13 - up, INK[5]); });
    // 종 + 망치
    const jump = f % 2;
    blob(b, ell(cx - 3.6, 2.9 - jump * 0.5, 2.1, 1.7), R_RED, { lo: 2, dither: 0.3 });
    blob(b, ell(cx + 3.6, 2.9 - (1 - jump) * 0.5, 2.1, 1.7), R_RED, { lo: 2, dither: 0.3 });
    px(b, cx, 1.5, SL[3]); px(b, cx, 2.5, SL[2]);
    // 몸
    blob(b, ell(cx, cy + 0.6, 4.6, 4.5), R_GOLD, { lo: 2, dither: 0.3, rim: GO[6] });
    blob(b, ell(cx, cy + 0.8, 3.1, 3.0, { amb: 0.6 }), R_DIAL, { lo: 2, dither: 0.2, outline: false });
    // 눈금 + 바늘(바늘은 프레임마다 째깍)
    const c0x = Math.round(cx - 0.5), c0y = Math.round(cy + 0.3);
    px(b, c0x, c0y + 1, INK[3]); px(b, c0x, c0y, INK[4]);
    const hand = [[1, 0], [1, 1], [0, 1], [1, 1]][f];
    px(b, c0x + hand[0], c0y + 1 + hand[1], RD[3]);
    // 큰 눈 둘(바늘 양옆) — 귀엽게 놀란 눈
    px(b, c0x - 2, c0y, INK[2]); px(b, c0x + 2, c0y, INK[2]);
    return { b, W, H, ax: 7, ay: 13 };
  }
  // 침대 밑 손(12): 땅 구멍에서 솟은 보라 손 + 손바닥 노란 눈. rise: 0..1(솟는 정도)
  function buildHand(f, rise) {
    const W = 18, H = 20, b = Buf(W, H), gy = 16.5;
    const sink = Math.round((1 - rise) * 10);
    // 구멍(뒤 테)
    blob(b, ell(9, gy, 6.5, 2.2, { amb: 0.1 }), [INK[3], INK[3], INK[0], INK[0], INK[1]], { lo: 2, dither: 0.3, lit: false });
    for (let x = 3; x <= 14; x++) { const y = Math.round(gy - Math.sqrt(Math.max(0, 1 - ((x + 0.5 - 9) / 6.5) ** 2)) * 2.2); if (at(b, x, y) === INK[3]) px(b, x, y, INK[5]); }
    // 손(구멍 아래로는 잘린다)
    const hb = Buf(W, H);
    const o = sink;
    const parts = [
      ell(9, 10.5 + o, 3.9, 3.4, { amb: 0.35 }),
      poly([[6.6, 12 + o], [11.4, 12 + o], [11.6, 20 + o], [6.4, 20 + o]], (nx) => 0.55 - nx * 0.35),
      ell(3.9, 10.2 + o, 1.2, 2.1, { amb: 0.35 }),
    ];
    const wig = (i) => (((i + f) % 4) === 0 ? 1 : ((i + f) % 4) === 2 ? -1 : 0);
    [6.0, 8.2, 10.2, 12.2].forEach((x, i) => {
      const top = (i === 0 || i === 3 ? 6.4 : 5.4) + o + wig(i) * 0.6;
      parts.push(ell(x + 0.1, top + 1.6, 0.95, 2.4, { amb: 0.35 }));
    });
    blob(hb, union(...parts), R_HAND, { lo: 3, dither: 0.5, rim: PK[2] });
    // 손바닥 눈
    const ey = Math.round(10.5 + o);
    if (ey < gy - 1) { [[7, ey], [10, ey]].forEach(([x, y]) => { px(hb, x, y, GO[5]); px(hb, x, y - 1, GO[6]); }); }
    // 손톱 대신 손끝 분홍(귀엽게)
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (hb.c[y * W + x] && !hb.c[(y - 1) * W + x] && y > 0 && y < 9 + o && hb.c[y * W + x] !== R_HAND[0] && hb.c[y * W + x] !== R_HAND[1]) { hb.c[y * W + x] = PK[3]; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = hb.c[y * W + x]; if (!c) continue;
      const lipY = gy + Math.sqrt(Math.max(0, 1 - ((x + 0.5 - 9) / 6.5) ** 2)) * 0.6;
      if (y + 0.5 > lipY) continue;
      b.c[y * W + x] = c;
    }
    // 앞 테(구멍 입술): 손 앞을 덮는다
    for (let x = 3; x <= 14; x++) { const k = Math.sqrt(Math.max(0, 1 - ((x + 0.5 - 9) / 6.5) ** 2)); px(b, x, Math.round(gy + k * 2.2), INK[4]); if (k > 0.5) px(b, x, Math.round(gy + k * 2.2) - 1, INK[2]); }
    if (rise < 1) { // 솟는 중: 금 간 땅 + 튀는 흙
      [[1, 15], [2, 16], [16, 15], [15, 17], [0, 17], [17, 16]].forEach(([x, y]) => px(b, x, y, INK[5]));
      px(b, 2 + (f % 2), 12 - (f % 2), VI[3]); px(b, 15 - (f % 2), 11 + (f % 2), VI[3]);
    }
    return { b, W, H, ax: 9, ay: 18 };
  }
  // 옷장 문(18): 갈색 옷장, 오른 문이 삐걱 열린 틈에 눈 둘. 4프레임
  function buildCloset(f) {
    const W = 24, H = 29, b = Buf(W, H), bob = [0, 1, 0, 1][f], gap = [3, 4, 5, 4][f];
    const x0 = 3, x1 = 21, y0 = 4 + bob, y1 = 25;
    // 다리
    const lift = [[0, 0], [1, 0], [0, 0], [0, 1]][f];
    [[5, lift[0]], [18, lift[1]]].forEach(([x, up]) => { rect(b, x, y1 + 1 - up, 2, 2, INK[3]); px(b, x, y1 + 2 - up, INK[2]); px(b, x + 1, y1 + 2 - up, INK[2]); px(b, x, y1 + 1 - up, INK[4]); });
    // 몸: 위가 둥근 지붕
    const body = poly([[x0, y1], [x0, y0 + 3], [x0 + 3, y0], [x1 - 3, y0], [x1, y0 + 3], [x1, y1]], (nx, ny) => 0.62 - nx * 0.3 - ny * 0.18);
    blob(b, body, R_WOOD, { lo: 2, dither: 0.4, rim: GO[4] });
    // 지붕 장식 띠 + 달 장식
    for (let x = x0 + 2; x < x1 - 1; x++) px(b, x, y0 + 2, GO[1]);
    for (let x = x0 + 3; x < x1 - 2; x++) px(b, x, y0 + 1, GO[3]);
    px(b, 12, y0 - 1, GO[5]); px(b, 11, y0 - 1, GO[4]); px(b, 11, y0 - 2, GO[5]); px(b, 12, y0 - 2, GO[1]); px(b, 10, y0 - 1, GO[1]); px(b, 11, y0, GO[2]);
    const dy0 = y0 + 4, dy1 = y1 - 2;
    // 왼 문: 판넬 홈 + 손잡이
    const panel = (a, c) => { for (let y = dy0 + 1; y < dy1; y++) { px(b, a, y, GO[0]); px(b, c, y, GO[2]); } for (let x = a; x <= c; x++) { px(b, x, dy0 + 1, GO[0]); px(b, x, dy1 - 1, GO[2]); } };
    panel(5, 9); px(b, 10, 15 + bob, GO[5]); px(b, 10, 16 + bob, GO[3]);
    // 틈(열린 쪽): 어두운 속 + 눈
    const gx = 12;
    for (let y = dy0; y <= dy1; y++) for (let x = gx; x < gx + gap; x++) px(b, x, y, INK[0]);
    for (let y = dy0; y <= dy1; y++) px(b, gx - 1, y, GO[0]);
    const ey = 12 + bob;
    if (f !== 2) { px(b, gx + gap - 3 < gx ? gx : gx + gap - 3, ey, GO[5]); px(b, gx + gap - 1, ey, GO[5]); px(b, gx + gap - 3 < gx ? gx : gx + gap - 3, ey - 1, GO[6]); px(b, gx + gap - 1, ey - 1, GO[6]); }
    else { px(b, gx + 1, ey, GO[4]); px(b, gx + 2, ey, GO[4]); px(b, gx + 4, ey, GO[4]); } // 깜빡
    // 틈에서 삐져나온 줄무늬 양말
    px(b, gx + 1, dy1 - 1, PK[3]); px(b, gx + 1, dy1, SL[4]); px(b, gx + 1, dy1 + 1, PK[3]); px(b, gx + 2, dy1 + 1, PK[2]);
    // 오른 문: 열린 만큼 좁아지고 두께면이 보인다
    const rx0 = gx + gap;
    for (let y = dy0; y <= dy1; y++) px(b, rx0, y, GO[4]);
    if (x1 - 2 - (rx0 + 2) >= 2) panel(rx0 + 2, x1 - 2);
    px(b, rx0 + 1, 15 + bob, GO[5]);
    // 아래 서랍 띠
    for (let x = x0 + 1; x < x1; x++) px(b, x, y1 - 1, GO[1]);
    px(b, 11, y1 - 1, GO[4]); px(b, 12, y1 - 1, GO[4]);
    return { b, W, H, ax: 12, ay: 27, eyes: [[gx + Math.max(0, gap - 3), ey], [gx + gap - 1, ey]] };
  }
  // 늑대 그림자: 정면, 큰 세모 귀 + 흔드는 꼬리. size 14(보통) / 36(보스)
  function buildWolf(S, f, boss) {
    const k = S / 14, W = Math.round(S * 1.7) + 4 & ~1, H = Math.round(S * 1.45) + 4, cx = W / 2, gy = H - 1.5;
    const b = Buf(W, H), bob = [0, -1, 0, -1][f] * Math.max(1, Math.round(k * 0.6));
    // 꼬리(뒤): 오른쪽 위로 흔든다
    const tw = [0.0, 0.6, 1.0, 0.6][f];
    const tail = poly([[cx + 3 * k, gy - 3 * k], [cx + 5.5 * k, gy - 5 * k], [cx + (7.5 + tw) * k, gy - (9.5 - tw) * k], [cx + (8.8 + tw) * k, gy - (7.0 - tw * 0.5) * k], [cx + 6.6 * k, gy - 2.6 * k]], (nx, ny) => 0.5 - nx * 0.2 - ny * 0.35);
    blob(b, tail, R_WOLF, { lo: 3, dither: 0.4, rim: CY[4] });
    if (boss) px(b, cx + (8.2 + tw) * k, gy - (8.4 - tw * 0.6) * k, CY[3]);
    // 다리(짧은 몽당)
    const lift = [[0, 1, 1, 0], [0, 0, 0, 0], [1, 0, 0, 1], [0, 0, 0, 0]][f];
    [-3.4, -1.2, 1.2, 3.4].forEach((u, i) => {
      const x = cx + u * k, up = lift[i] * Math.max(1, Math.round(k * 0.7)), w = Math.max(1, Math.round(k * 1.1));
      for (let y = Math.round(gy - 3 * k); y <= Math.round(gy) - up; y++) for (let j = 0; j < w; j++) px(b, Math.round(x - w / 2) + j, y, i === 1 || i === 2 ? INK[3] : INK[2]);
      for (let j = 0; j < w; j++) px(b, Math.round(x - w / 2) + j, Math.round(gy) - up, CY[1]);
    });
    // 몸
    blob(b, ell(cx, gy - 4.4 * k + bob, 5.0 * k, 3.6 * k), R_WOLF, { lo: 3, dither: 0.5, rim: CY[4] });
    // 귀
    const ear = (s) => poly([[cx + s * 1.4 * k, gy - 12.0 * k + bob], [cx + s * 4.8 * k, gy - 10.6 * k + bob], [cx + s * 4.3 * k, gy - 17.4 * k + bob]], (nx, ny) => 0.55 - nx * 0.3 * s - ny * 0.3);
    blob(b, ear(-1), R_WOLF, { lo: 3, dither: 0.3 }); blob(b, ear(1), R_WOLF, { lo: 3, dither: 0.3, rim: CY[4] });
    // 머리 + 볼 털
    const head = union(ell(cx, gy - 10.0 * k + bob, 5.2 * k, 4.1 * k),
      poly([[cx - 5.6 * k, gy - 9.0 * k + bob], [cx - 3 * k, gy - 8 * k + bob], [cx - 4.4 * k, gy - 6.2 * k + bob]], () => 0.45),
      poly([[cx + 5.6 * k, gy - 9.0 * k + bob], [cx + 3 * k, gy - 8 * k + bob], [cx + 4.4 * k, gy - 6.2 * k + bob]], () => 0.3));
    blob(b, head, R_WOLF, { lo: 3, dither: 0.5, rim: CY[4] });
    // 귀 안
    [-1, 1].forEach((s) => { line(b, cx + s * 3.0 * k - 0.5, gy - 12.2 * k + bob, cx + s * 4.0 * k - 0.5, gy - 14.8 * k + bob, VI[2]); if (k > 2) line(b, cx + s * 3.4 * k - 0.5, gy - 12.0 * k + bob, cx + s * 4.1 * k - 0.5, gy - 14.0 * k + bob, VI[1]); });
    // 주둥이 + 코
    // 가슴 갈기(밝은 지그재그) — 고양이와 가르는 표시
    for (let j = -3; j <= 3; j++) { const x = cx + j * k * 0.9 - 0.5, y = gy - 5.6 * k + bob + (j & 1 ? 1 : 0) * Math.max(1, Math.round(k * 0.5)); px(b, x, y, SL[1]); px(b, x, y - 1, CY[2]); }
    blob(b, ell(cx, gy - 7.2 * k + bob, 2.0 * k, 2.1 * k, { amb: 0.5 }), R_SNOUT, { lo: 2, dither: 0.3, inner: CY[0] });
    const nw = Math.max(2, Math.round(k * 1.2)) & ~1 || 2;
    for (let j = 0; j < nw; j++) { px(b, cx - nw / 2 + j, gy - 8.5 * k + bob, INK[1]); }
    px(b, cx - nw / 2, gy - 8.5 * k + bob - 1, SL[3]);
    // 송곳니 하나씩(귀엽게)
    if (boss) { px(b, cx - 1.1 * k - 0.5, gy - 6.8 * k + bob, SL[4]); px(b, cx + 1.1 * k - 0.5, gy - 6.8 * k + bob, SL[4]); }
    // 눈: 청록, 살짝 치켜뜬
    const eyes = [];
    [-1, 1].forEach((s) => {
      const ex = cx + s * 2.3 * k - 0.5, ey = gy - 10.3 * k + bob, ew = Math.max(2, Math.round(1.6 * k));
      for (let j = 0; j < ew; j++) {
        const x = Math.round(ex - (ew - 1) / 2 + j), dy = Math.round(((j - (ew - 1) / 2) * s) * 0.5);
        px(b, x, ey + dy, j === (s > 0 ? ew - 1 : 0) ? CY[5] : CY[4]); if (k > 1.5) px(b, x, ey + dy + 1, CY[3]);
      }
      eyes.push([Math.round(ex), Math.round(ey)]);
    });
    if (boss) {
      // 이마 초승달 + 가슴 별 점
      const mx = Math.round(cx) - 1, my = Math.round(gy - 13.0 * k + bob);
      [[0, 0, GO[5]], [-1, 1, GO[5]], [-1, 2, GO[4]], [0, 3, GO[4]], [1, 3, GO[3]], [0, 1, GO[6]]].forEach(([x, y, c]) => px(b, mx + x, my + y, c));
      [[-2.5, -4.5], [1.5, -3.8], [-0.5, -2.6], [3, -5.2], [-3.6, -3.2]].forEach(([u, v], i) => px(b, cx + u * k, gy + v * k + bob, i % 2 ? CY[5] : SL[4]));
    }
    return { b, W, H, ax: Math.round(cx), ay: Math.round(gy), eyes };
  }
  // 가장 긴 밤(40): 이불처럼 펼친 밤하늘 그림자 + 별 눈 + 초승달 왕관. 4프레임 숨 쉬기(밑단 물결)
  function buildDark(f) {
    const W = 64, H = 50, b = Buf(W, H), cx = 32, br = [0, 0.6, 1, 0.6][f], gy = 46;
    const hem = (x) => gy - 3 + 2.0 * Math.sin(x * 0.42 + f * Math.PI / 2) + Math.abs(x - cx) * 0.04;
    const dome = ell(cx, 25 - br * 0.5, 23 + br * 0.4, 17 + br * 0.6, { amb: 0.35, flat: 0.8 });
    const drape = (x, y) => {
      if (y < 24 || y > hem(x)) return null;
      const half = 23 + (y - 24) * 0.42 + br * 0.4;
      if (Math.abs(x - cx) > half) return null;
      const nx = (x - cx) / half, ny = (y - 24) / 22;
      return { l: Math.max(0, 0.42 - nx * 0.25 - ny * 0.25), nx, ny };
    };
    const shape = (x, y) => { if (y > hem(x)) return null; return dome(x, y) || drape(x, y); };
    blob(b, shape, R_DARK, { lo: 4, dither: 0.55, curve: (l) => l * 0.9 });
    // 이불 누빔: 바늘땀 마름모
    for (let y = 10; y < gy; y++) for (let x = 6; x < W - 6; x++) {
      const c = at(b, x, y); if (!c || c === R_DARK[0] || c === R_DARK[1] || c === VI[3]) continue;
      const u = (x + y) % 10, v = (x - y + 100) % 10;
      if ((u === 0 || v === 0) && (x + y) % 2 === 0) px(b, x, y, INK[1]);
    }
    // 밑단 술(금 점)
    for (let x = 6; x < W - 6; x += 5) { const y = Math.round(hem(x)) + 1; if (at(b, x, y - 1)) { px(b, x, y, GO[4]); px(b, x, y + 1, GO[2]); } }
    // 별 무늬
    const stars = [[14, 30], [20, 14], [46, 15], [50, 31], [27, 36], [39, 37], [16, 40], [48, 41], [33, 12], [9, 35], [56, 37], [24, 28]];
    stars.forEach(([x, y], i) => { if (!at(b, x, y)) return; const on = (i + f) % 3 !== 0; px(b, x, y, on ? (i % 3 === 0 ? GO[6] : CY[5]) : VI[3]); if (on && i % 4 === 0) { px(b, x - 1, y, VI[3]); px(b, x + 1, y, VI[3]); px(b, x, y - 1, VI[3]); px(b, x, y + 1, VI[3]); } });
    // 별 눈 둘(네 갈래 별) — 크고 반짝
    const eyeY = 24 - Math.round(br * 0.5), blink = f === 2;
    const eyes = [[24, eyeY], [40, eyeY]];
    eyes.forEach(([x, y]) => {
      if (blink) { for (let j = -2; j <= 2; j++) px(b, x + j, y, GO[5]); px(b, x - 3, y - 1, GO[3]); px(b, x + 3, y - 1, GO[3]); return; }
      px(b, x, y, GO[6]); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { px(b, x + dx, y + dy, GO[5]); px(b, x + dx * 2, y + dy * 2, GO[4]); });
      px(b, x, y - 3, GO[3]); px(b, x, y + 3, GO[3]); px(b, x - 3, y, GO[3]); px(b, x + 3, y, GO[3]);
    });
    // 볼 + 고양이 입(ω)
    px(b, 19, eyeY + 4, PK[2]); px(b, 20, eyeY + 4, PK[2]); px(b, 44, eyeY + 4, PK[2]); px(b, 45, eyeY + 4, PK[2]);
    const my = eyeY + 5;
    [[29, 0], [30, 1], [31, 0], [32, 0], [33, 1], [34, 0]].forEach(([x, d]) => px(b, x, my + d, VI[4]));
    // 초승달 왕관
    const moon = minus(ell(cx, 7 - br * 0.5, 4.2, 4.2), ell(cx + 2.3, 5.6 - br * 0.5, 3.6, 3.6));
    blob(b, moon, R_GOLD, { lo: 3, dither: 0.2 });
    px(b, cx + 4, 2, GO[6]); px(b, cx - 5, 4, CY[5]);
    return { b, W, H, ax: cx, ay: gy, eyes, stars };
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
    mk("fluff", 2, 4, buildFluff);
    mk("clock", 4, 12, buildClock);
    mk("hand", 4, 6, (f) => buildHand(f, 1), (o) => [[7, 10, 2.5, GO[5], 0.5], [10, 10, 2.5, GO[5], 0.5]]);
    mk("hand_rise", 4, 8, (f) => buildHand(f, [0.12, 0.2, 0.28, 0.2][f]));
    mk("closet", 4, 3, buildCloset, (o) => o.eyes.map(([x, y]) => [x, y, 2.5, GO[5], 0.55]));
    mk("wolf", 4, 10, (f) => buildWolf(14, f, false), (o) => o.eyes.map(([x, y]) => [x, y, 2, CY[4], 0.5]));
    mk("boss_wolf", 4, 7, (f) => buildWolf(36, f, true), (o) => o.eyes.map(([x, y]) => [x, y, 4.5, CY[4], 0.5]).concat([[o.ax, o.ay - 33, 4, GO[5], 0.4]]));
    mk("boss_dark", 4, 3, buildDark, (o, f) => o.eyes.map(([x, y]) => [x, y, f === 2 ? 4 : 7, GO[5], 0.6]).concat(o.stars.filter((_, i) => (i + f) % 3 !== 0 && i % 4 === 0).map(([x, y]) => [x, y, 3, CY[4], 0.45]), [[32, 6, 6, GO[5], 0.35]]));
    return EN;
  }

  // ═════════════════════════════════════════════════════════════════
  // 줍는 것 · 탄
  // ═════════════════════════════════════════════════════════════════
  let PU = null;
  function pickupSet() {
    if (PU) return PU;
    PU = {};
    // 별가루(작은): 마름모 3–4px, 2프레임 반짝
    PU.dust = range(2).map((f) => { const b = Buf(5, 5); if (f === 0) { px(b, 2, 1, CY[4]); px(b, 1, 2, CY[3]); px(b, 2, 2, CY[5]); px(b, 3, 2, CY[4]); px(b, 2, 3, CY[2]); } else { px(b, 2, 0, CY[4]); px(b, 2, 1, CY[5]); px(b, 0, 2, CY[3]); px(b, 1, 2, CY[5]); px(b, 2, 2, SL[5]); px(b, 3, 2, CY[5]); px(b, 4, 2, CY[3]); px(b, 2, 3, CY[4]); px(b, 2, 4, CY[2]); } return img(b); });
    PU.dustG = glowImg(11, 11, [[5, 5, 3, CY[4], 0.5]]);
    // 큰 별가루: 금 별 6px
    PU.dust_big = range(2).map((f) => {
      const b = Buf(7, 7);
      const rows = f === 0 ? ["...a...", "..aba..", "abbcbba", ".abcba.", "..bab..", ".ab.ba.", ".a...a."] : ["...a...", "..aca..", "abccbba", ".bcccb.", "..bcb..", ".ab.ba.", ".a...a."];
      grid(b, rows, { a: GO[3], b: GO[5], c: GO[6] });
      return img(b);
    });
    PU.dustBigG = glowImg(15, 15, [[7, 7, 5, GO[5], 0.55]]);
    // 따뜻한 우유 컵 7×8 + 김 3프레임
    PU.milk = range(3).map((f) => {
      const b = Buf(9, 12);
      blob(b, poly([[1, 4], [7, 4], [6.6, 11], [1.4, 11]], (nx) => 0.65 - nx * 0.45), R_SLATE, { lo: 2, dither: 0.3, rim: CY[4] });
      for (let x = 2; x <= 6; x++) px(b, x, 4, x < 4 ? SL[5] : GO[6]);
      for (let x = 2; x <= 6; x++) px(b, x, 5, GO[6]);
      px(b, 7, 6, SL[2]); px(b, 8, 7, SL[2]); px(b, 8, 8, SL[1]); px(b, 7, 9, SL[1]); // 손잡이
      px(b, 3, 8, PK[3]); px(b, 4, 8, PK[4]); px(b, 4, 9, PK[3]); // 하트 무늬
      const s = [[2, 2], [3, 1], [3, 0]], s2 = [[5, 2], [5, 1], [6, 0]];
      [s, s2].forEach((pts, j) => pts.forEach(([x, y], i) => { if ((i + f + j) % 3 !== 2) px(b, x + ((f + j) % 2), y, i === 0 ? SL[3] : SL[4]); }));
      return img(b);
    });
    // 목동 방울 7×8 + 리본, 4프레임 흔들
    PU.bell = range(4).map((f) => {
      const b = Buf(11, 11), sw = [0, 1, 0, -1][f];
      px(b, 4, 0, RD[3]); px(b, 6, 0, RD[3]); px(b, 5, 1, RD[4]); px(b, 4, 1, RD[2]); px(b, 6, 1, RD[2]); px(b, 3, 0, RD[1]); px(b, 7, 0, RD[1]);
      blob(b, poly([[5 + sw * 0.5, 2], [7.8 + sw, 6], [8.6 + sw, 9], [1.4 + sw, 9], [2.2 + sw, 6]], (nx, ny) => 0.7 - nx * 0.4 - ny * 0.15), R_GOLD, { lo: 2, dither: 0.3, rim: GO[6] });
      for (let x = 2; x <= 8; x++) if (at(b, x + sw, 8)) px(b, x + sw, 8, GO[2]);
      px(b, 5 + sw * 2, 10, GO[3]); px(b, 4 + sw, 4, GO[6]);
      return img(b);
    });
    PU.bellG = glowImg(17, 17, [[8, 8, 6, GO[5], 0.4]]);
    // 베개 6×5: 8방향 돌림
    PU.pillow = range(8).map((i) => {
      const a = (i * Math.PI) / 8, ca = Math.cos(a), sa = Math.sin(a), b = Buf(11, 11);
      const sh = (x, y) => {
        const dx = x - 5.5, dy = y - 5.5, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
        const au = Math.abs(u), av = Math.abs(v);
        if (au > 3.4 || av > 2.6) return null;
        if (au > 2.6 && av > 1.8) return null;
        const nx = u / 3.4, ny = v / 2.6, l = Math.max(0, Math.min(1, 0.75 - dx * 0.09 - dy * 0.1 - (nx * nx + ny * ny) * 0.25));
        return { l, nx: dx / 3, ny: dy / 3 };
      };
      blob(b, sh, R_PILLOW, { lo: 2, dither: 0.3 });
      // 가운데 눌린 주름
      px(b, Math.round(5.5 + ca * 0 - 0.5), 5, VI[4]);
      return img(b);
    });
    // 별똥별 머리 5×5
    PU.starHead = (() => { const b = Buf(5, 5); grid(b, ["..a..", ".aba.", "abcba", ".aba.", "..a.."], { a: GO[4], b: GO[5], c: GO[6] }); return img(b); })();
    PU.starG = glowImg(13, 13, [[6, 6, 4.5, GO[5], 0.6]]);
    // 꿈 방울 지름 8, 2프레임 출렁
    PU.bubble = range(2).map((f) => imgFn(10, 10, (c) => {
      const rx = f ? 4.2 : 3.9, ry = f ? 3.8 : 4.1;
      for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
        const nx = (x + 0.5 - 5) / rx, ny = (y + 0.5 - 5) / ry, d = nx * nx + ny * ny;
        if (d > 1) continue;
        if (d > 0.62) { c.fillStyle = rgba(nx + ny > 0.3 ? CY[3] : CY[4], 0.85); }
        else c.fillStyle = rgba(VI[3], 0.18);
        c.fillRect(x, y, 1, 1);
      }
      c.fillStyle = SL[5]; c.fillRect(3, 2, 2, 1); c.fillRect(2, 3, 1, 1);
      c.fillStyle = rgba(PK[4], 0.8); c.fillRect(7, 6, 1, 1);
    }));
    // 자장가 음표 4px
    PU.note = [["..aa", "..ab", "..a.", "aaa.", "bb.."], [".aaa", ".a.a", ".a.a", "aa.a", "b.aa"]].map((rows) => { const b = Buf(4, 5); grid(b, rows, { a: CY[5], b: CY[4] }); return img(b); });
    PU.noteG = glowImg(9, 9, [[4, 4, 3.2, CY[4], 0.5]]);
    return PU;
  }

  // ═════════════════════════════════════════════════════════════════
  // 바닥 — 16×16 타일, 칸 변형 4 + 소품 3 + 꿈 가장자리 2. 새벽 5단계 판을 미리 굽는다.
  // ═════════════════════════════════════════════════════════════════
  const T = 16, WORLD = 540, LEVELS = 5;
  // 바닥 램프 5색 [가장 어두움, 그늘, 바탕, 볕, 하이라이트]
  const GROUND = [
    [INK[1], INK[2], INK[3], INK[4], INK[5]],
    [INK[2], INK[3], INK[4], INK[5], VI[2]],
    [INK[3], INK[4], INK[5], VI[2], INK[6]],
    [INK[4], INK[5], INK[6], SL[2], PK[4]],
    [GR[0], GR[1], GR[2], GR[3], GR[4]],
  ];
  const WALL = [
    [INK[0], INK[0], INK[1], INK[2]],
    [INK[0], INK[1], INK[2], INK[3]],
    [INK[1], INK[2], INK[3], VI[1]],
    [INK[1], VI[0], INK[3], VI[1]],
    [INK[2], INK[3], INK[4], VI[1]],
  ];
  const SPARK = [CY[4], CY[4], VI[4], PK[4], GO[5]];
  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return (h ^ (h >>> 16)) >>> 0; }
  // 구름 덩이: 위 둘레는 볕, 아래 둘레는 그늘
  function puff(b, cx, cy, r, G, hl) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.25);
      if (d > r) continue;
      const xx = ((x % T) + T) % T, yy = ((y % T) + T) % T;
      if (d > r - 1.1) px(b, xx, yy, y + 0.5 < cy ? G[3] : y + 0.5 > cy + r * 0.45 ? G[1] : G[2]);
      else if (hl && y + 0.5 < cy - r * 0.35 && x + 0.5 < cx) px(b, xx, yy, G[4]);
    }
  }
  function buildTile(L, kind, v) {
    const b = Buf(T, T), G = GROUND[L], sh = [-2, -1, -1, 0, 0][L];
    const c = (ramp, i) => ramp[Math.max(0, Math.min(ramp.length - 1, i + sh))];
    if (kind === "wall") {
      const Wl = WALL[L];
      rect(b, 0, 0, T, T, Wl[1]);
      for (let i = 0; i < 26; i++) { const h = hash(i * 7 + v * 101, i * 3 + 11); px(b, h % T, (h >> 5) % T, Wl[0]); }
      const P = v ? [[4, 5, 4.5], [12, 12, 5], [13, 2, 3]] : [[10, 5, 5], [3, 12, 4.5], [1, 2, 3]];
      P.forEach(([x, y, r]) => {
        for (let yy = 0; yy < T; yy++) for (let xx = 0; xx < T; xx++) {
          const d = Math.hypot(xx + 0.5 - x, (yy + 0.5 - y) * 1.2);
          if (d < r - 1) px(b, xx, yy, Wl[2]);
          else if (d < r && yy + 0.5 < y) px(b, xx, yy, Wl[3]);
        }
      });
      return b;
    }
    rect(b, 0, 0, T, T, G[2]);
    // 잔 무늬(디더 점)
    for (let i = 0; i < 18; i++) { const h = hash(i * 13 + v * 7 + kind.length * 31, i + 5); px(b, h % T, (h >> 6) % T, (h >> 12) & 1 ? G[1] : G[3]); }
    if (kind === "g") {
      if (v === 0) { puff(b, 7.5, 9, 5.5, G, true); }
      if (v === 1) { puff(b, 4, 5, 3.5, G, true); puff(b, 11.5, 11.5, 4, G, true); }
      if (v === 2) { // 풀 무더기 + 작은 꽃
        [[3, 11], [11, 6], [8, 13]].forEach(([x, y]) => { px(b, x, y, G[3]); px(b, x - 1, y - 1, G[3]); px(b, x + 1, y - 1, G[4]); px(b, x, y + 1, G[1]); });
        px(b, 12, 12, PK[4]); px(b, 12, 13, G[1]); px(b, 4, 4, c(GO, 5)); px(b, 4, 5, G[1]);
      }
      if (v === 3) { // 별 조각
        const s = SPARK[L];
        px(b, 8, 6, s); px(b, 7, 7, s); px(b, 9, 7, s); px(b, 8, 8, s); px(b, 8, 7, SL[5]);
        px(b, 3, 12, s); px(b, 13, 3, G[4]); px(b, 12, 12, G[4]);
        puff(b, 4, 4, 2.6, G, false);
      }
    }
    if (kind === "p") {
      if (v === 0) { // 이불 언덕: 누빈 조각 둔덕
        const sh2 = (x, y) => { const nx = (x - 8) / 7, ny = (y - 12) / 6; if (nx * nx + ny * ny > 1 || y > 13.5) return null; return { l: Math.max(0, 0.7 - nx * 0.3 - ny * 0.5), nx, ny }; };
        const M = blob(b, sh2, [c(PK, 0), c(PK, 1), c(PK, 1), c(PK, 2), c(PK, 3), c(PK, 4)], { lo: 2, dither: 0.3 });
        for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (M[y * T + x]) {
          if (((x >> 2) + (y >> 2)) % 2 === 0 && at(b, x, y) !== c(PK, 0)) px(b, x, y, (x + y) % 5 === 0 ? c(CY, 4) : at(b, x, y) === c(PK, 4) ? c(CY, 4) : c(CY, 3));
          if ((x % 4 === 0 || y % 4 === 0) && (x + y) % 2 === 0) px(b, x, y, c(PK, 1));
        }
        for (let x = 2; x < 14; x++) px(b, x, 14, G[1]);
      }
      if (v === 1) { // 장난감 블록: 위·옆 두 면 + 점 무늬
        const x0 = 4, y0 = 6;
        rect(b, x0, y0, 8, 3, c(GO, 5)); rect(b, x0, y0 + 3, 8, 6, c(RD, 3));
        rect(b, x0 + 5, y0 + 3, 3, 6, c(RD, 2));
        for (let x = x0; x < x0 + 8; x++) { px(b, x, y0 - 1, c(GO, 3)); px(b, x, y0 + 9, c(RD, 0)); }
        for (let y = y0; y < y0 + 9; y++) { px(b, x0 - 1, y, c(RD, 1)); px(b, x0 + 8, y, c(RD, 0)); }
        px(b, x0, y0, c(GO, 6)); px(b, x0 + 1, y0, c(GO, 6));
        px(b, x0 + 2, y0 + 5, c(CY, 4)); px(b, x0 + 2, y0 + 6, c(CY, 4)); px(b, x0 + 3, y0 + 5, c(CY, 4)); px(b, x0 + 3, y0 + 6, c(CY, 3));
        px(b, x0 + 6, y0 + 5, c(GO, 5)); px(b, x0 + 3, y0 + 1, c(GO, 3)); px(b, x0 + 4, y0 + 1, c(GO, 3));
        for (let x = x0; x < x0 + 9; x++) px(b, x, y0 + 10, G[1]);
      }
      if (v === 2) { // 달 모양 돌
        const moon = minus(ell(8, 9, 5, 4.6), ell(10.6, 7.4, 4.0, 3.8));
        blob(b, moon, [c(VI, 0), c(SL, 0), c(SL, 0), c(SL, 1), c(SL, 2), c(SL, 3), c(SL, 4)], { lo: 2, dither: 0.3, rim: c(CY, 4) });
        px(b, 5, 9, c(SL, 1)); px(b, 6, 12, c(SL, 1));
        for (let x = 4; x < 12; x++) if (!at(b, x, 14)) px(b, x, 14, G[1]);
      }
    }
    return b;
  }
  const TILE_KINDS = [["g", 0], ["g", 1], ["g", 2], ["g", 3], ["p", 0], ["p", 1], ["p", 2], ["wall", 0], ["wall", 1]];
  let GND = null;
  function groundSet() {
    if (GND) return GND;
    GND = { atlas: [], runs: [] };
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
    if (!ins) return 7 + (h & 1);
    if (h % 100 < 5 && tx > 0 && ty > 0 && (tx + 1) * T < WORLD && (ty + 1) * T < WORLD) return 4 + ((h >>> 8) % 3);
    const r = (h >>> 4) % 16;
    return r < 6 ? 0 : r < 11 ? 1 : r < 15 ? 2 : 3;
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
      ctx.fillStyle = rgba(INK[0], 0.42); ctx.fillRect(x - hw, y - (h >> 1) + j, hw * 2, 1);
    }
  };

  api.drawGround = function (ctx, camX, camY, w, h, dawn, t) {
    const G = groundSet(), L = Math.max(0, Math.min(LEVELS - 1, Math.round((dawn || 0) * (LEVELS - 1))));
    const atlas = G.atlas[L], runs = G.runs[L];
    camX = Math.floor(camX); camY = Math.floor(camY);
    const tx0 = Math.floor(camX / T), ty0 = Math.floor(camY / T), tx1 = Math.floor((camX + w - 1) / T), ty1 = Math.floor((camY + h - 1) / T);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const X = tx * T, Y = ty * T, i = tileIdx(tx, ty);
      // 경계에 걸친 칸: 바깥은 벽, 안쪽 부분만 바닥
      const cut = i < 7 && (X + T > WORLD || Y + T > WORLD);
      const idx = cut ? 7 + (hash(tx, ty) & 1) : i;
      if (atlas) ctx.drawImage(atlas, idx * T, 0, T, T, X, Y, T, T); else paintRuns(ctx, runs[idx], X, Y);
      if (cut) {
        const iw = Math.min(T, WORLD - X), ih = Math.min(T, WORLD - Y);
        if (iw > 0 && ih > 0) { if (atlas) ctx.drawImage(atlas, i * T, 0, iw, ih, X, Y, iw, ih); else paintRuns(ctx, runs[i], X, Y); }
      }
      if (i === 3 && t != null) { // 별 조각 반짝
        const k = 0.5 + 0.5 * Math.sin(t * 2.6 + (hash(tx, ty) % 628) / 100);
        if (k > 0.55) { ctx.fillStyle = rgba(SPARK[L], (k - 0.55) * 1.6); ctx.fillRect(X + 8, Y + 5, 1, 1); ctx.fillRect(X + 8, Y + 9, 1, 1); ctx.fillRect(X + 6, Y + 7, 1, 1); ctx.fillRect(X + 10, Y + 7, 1, 1); }
      }
    }
    // 꿈 가장자리 구름 둑: 경계 바깥쪽에 볕 받은 뭉게 줄
    const Wl = WALL[L], lit = Wl[3];
    const edge = (horiz, pos, from, to, out) => {
      if (horiz ? (pos < camY - 4 || pos > camY + h + 4) : (pos < camX - 4 || pos > camX + w + 4)) return;
      const a = Math.max(from, (horiz ? camX : camY) - 2), z = Math.min(to, (horiz ? camX + w : camY + h) + 2);
      for (let s = a - (a % 4); s < z; s += 4) {
        const hh = 4 + (hash(s, pos + out) % 4);
        ctx.fillStyle = Wl[2];
        if (horiz) ctx.fillRect(s, out < 0 ? pos - hh : pos, 4, hh); else ctx.fillRect(out < 0 ? pos - hh : pos, s, hh, 4);
        ctx.fillStyle = lit;
        if (horiz) ctx.fillRect(s + 1, out < 0 ? pos - hh : pos + hh - 1, 2, 1); else ctx.fillRect(out < 0 ? pos - hh : pos + hh - 1, s + 1, 1, 2);
        ctx.fillStyle = GROUND[L][1];
        if (horiz) ctx.fillRect(s, out < 0 ? pos - 1 : pos, 4, 1); else ctx.fillRect(out < 0 ? pos - 1 : pos, s, 1, 4);
      }
    };
    edge(true, 0, 0, WORLD, -1); edge(true, WORLD, 0, WORLD, 1); edge(false, 0, 0, WORLD, -1); edge(false, WORLD, 0, WORLD, 1);
    // 지평선(화면 위쪽) 새벽빛: dawn 0.7 부터 분홍 → 금
    if (dawn > 0.6) {
      const k = Math.min(1, (dawn - 0.6) / 0.4), bands = 14, bh = Math.ceil(h * 0.42 / bands);
      for (let i = 0; i < bands; i++) {
        const a = k * 0.34 * (1 - i / bands);
        ctx.fillStyle = rgba(i < 5 ? (dawn > 0.88 ? GO[5] : GO[4]) : i < 10 ? PK[4] : VI[3], a * 0.8);
        ctx.fillRect(camX, camY + i * bh, w, bh);
      }
    } else if (dawn < 0.3) { // 깊은 밤: 위쪽 남색 짙게
      const bands = 5, bh = Math.ceil(h * 0.3 / bands);
      for (let i = 0; i < bands; i++) { ctx.fillStyle = rgba(CY[0], 0.28 * (1 - i / bands) * (1 - dawn / 0.3)); ctx.fillRect(camX, camY + i * bh, w, bh); }
    }
  };

  api.drawChild = function (ctx, x, y, t, dir, hurt) {
    const K = kid(), f = fr(t, 8, 4), left = dir < 0;
    const fl = hurt && fr(t, 16, 2) === 0;
    const set = left ? (fl ? K.Lf : K.L) : (fl ? K.Rf : K.R);
    x = Math.round(x); y = Math.round(y);
    put(ctx, set[f], x - K.ax, y - K.ay);
    putLit(ctx, (left ? K.Lg : K.Rg)[f], x - K.ax - 6, y - K.ay - 6);
  };

  api.drawSheep = function (ctx, x, y, t, kind, phase, hurt, dir) {
    const S = sheepSet(), stray = kind === "stray", s = S[stray ? "wool" : kind] || S.wool;
    const f = fr((t || 0) + (phase || 0) * 0.125, 8, 4), left = dir < 0;
    const fl = hurt && fr(t, 16, 2) === 0;
    x = Math.round(x); y = Math.round(y);
    let wob = 0;
    if (stray) wob = [0, 1, 0, -1][fr(t, 6, 4)];
    const set = left ? (fl ? s.Lf : s.L) : (fl ? s.Rf : s.R);
    const ax = left ? s.w - 1 - s.ax : s.ax;
    put(ctx, set[f], x - ax + wob, y - s.ay);
    if (s.Rg.length && !fl) putLit(ctx, (left ? s.Lg : s.Rg)[f], x - ax + wob - 3, y - s.ay - 3);
    if (stray) { // 땀방울: 머리 위에서 톡 떨어진다
      const hx = left ? s.w - 1 - s.head[0] : s.head[0], k = ((t || 0) * 1.6) % 1;
      if (k < 0.8) put(ctx, S.drop, x - ax + hx + (left ? -3 : 1) + wob, y - s.ay + s.head[1] - 5 + Math.round(k * 3));
    }
  };

  api.drawEnemy = function (ctx, kind, x, y, t, flash) {
    const E = enemySet(), s = E[kind] || E.fluff, f = fr(t, s.fps, s.fr.length);
    x = Math.round(x); y = Math.round(y);
    put(ctx, (flash ? s.fl : s.fr)[f], x - s.ax, y - s.ay);
    if (s.gl.length && !flash) putLit(ctx, s.gl[f], x - s.ax - 8, y - s.ay - 8);
  };

  api.drawPickup = function (ctx, kind, x, y, t) {
    const P = pickupSet(); x = Math.round(x); y = Math.round(y);
    const bob = Math.round(Math.sin((t || 0) * 4 + x * 0.3) * 1);
    if (kind === "dust") { put(ctx, P.dust[fr(t + x * 0.01, 3, 2)], x - 2, y - 2 + bob); putLit(ctx, P.dustG, x - 5, y - 5 + bob); return; }
    if (kind === "dust_big") { put(ctx, P.dust_big[fr(t, 3, 2)], x - 3, y - 3 + bob); putLit(ctx, P.dustBigG, x - 7, y - 7 + bob); return; }
    if (kind === "milk") { put(ctx, P.milk[fr(t, 4, 3)], x - 4, y - 11); return; }
    if (kind === "bell") { put(ctx, P.bell[fr(t, 6, 4)], x - 5, y - 10 + bob); putLit(ctx, P.bellG, x - 8, y - 13 + bob); return; }
  };

  api.drawProj = function (ctx, kind, x, y, t, ang) {
    const P = pickupSet(); x = Math.round(x); y = Math.round(y); ang = ang || 0;
    if (kind === "pillow") {
      const i = ((Math.round(((ang + (t || 0) * 9) / Math.PI) * 8) % 8) + 8) % 8;
      put(ctx, P.pillow[i], x - 5, y - 5); return;
    }
    if (kind === "star") {
      const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = "lighter";
      const dx = -Math.cos(ang), dy = -Math.sin(ang);
      for (let i = 2; i < 14; i++) {
        const a = 1.0 * (1 - i / 14); if ((i + Math.floor((t || 0) * 20)) % 4 === 0) continue;
        ctx.fillStyle = rgba(i < 5 ? GO[5] : CY[4], a);
        ctx.fillRect(Math.round(x + dx * i), Math.round(y + dy * i), 1, 1);
        if (i < 6) ctx.fillRect(Math.round(x + dx * i - dy), Math.round(y + dy * i + dx), 1, 1);
      }
      put(ctx, P.starG, x - 6, y - 6);
      ctx.globalCompositeOperation = op;
      put(ctx, P.starHead, x - 2, y - 2); return;
    }
    if (kind === "bubble") { put(ctx, P.bubble[fr(t, 4, 2)], x - 5, y - 5); return; }
    if (kind === "note") { const i = fr(t, 2, 2); put(ctx, P.note[i], x - 2, y - 3); putLit(ctx, P.noteG, x - 4, y - 5); return; }
  };

  const RING = new Map();
  function ringImg(r) {
    if (RING.has(r)) return RING.get(r);
    const S = r * 2 + 3, im = imgFn(S, S, (c) => {
      const cx = r + 1;
      for (let dy = -r; dy <= r; dy++) {
        const hw = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
        c.fillStyle = rgba(CY[3], 0.07); c.fillRect(cx - hw, cx + dy, hw * 2 + 1, 1);
      }
      // 테두리: 1 px 계단 원
      let px0 = null;
      for (let a = 0; a < 720; a++) {
        const th = (a / 720) * Math.PI * 2, x = Math.round(cx + Math.cos(th) * r), y = Math.round(cx + Math.sin(th) * r), k = x * 1000 + y;
        if (k === px0) continue; px0 = k;
        c.fillStyle = rgba(CY[4], 0.32); c.fillRect(x, y, 1, 1);
      }
    });
    if (RING.size > 32) RING.clear();
    RING.set(r, im); return im;
  }
  api.drawAura = function (ctx, x, y, r, t) {
    r = Math.max(4, Math.round(r)); x = Math.round(x); y = Math.round(y);
    const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = "lighter";
    put(ctx, ringImg(r), x - r - 1, y - r - 1);
    const n = Math.max(8, Math.min(20, Math.round(r / 3))), rot = (t || 0) * 0.9;
    ctx.fillStyle = rgba(CY[5], 0.55);
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2, a2 = a + 0.06;
      ctx.fillRect(Math.round(x + Math.cos(a) * (r - 2)), Math.round(y + Math.sin(a) * (r - 2)), 1, 1);
      ctx.fillRect(Math.round(x + Math.cos(a2) * (r - 2)), Math.round(y + Math.sin(a2) * (r - 2)), 1, 1);
    }
    ctx.globalCompositeOperation = op;
  };

  api.drawFence = function (ctx, pts, t, alpha) {
    if (!pts || pts.length < 3) return;
    alpha = alpha == null ? 1 : Math.max(0, Math.min(1, alpha)); if (alpha <= 0) return;
    let y0 = 1e9, y1 = -1e9;
    pts.forEach((p) => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    y0 = Math.ceil(y0); y1 = Math.floor(y1);
    const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgba(GO[5], 0.2 * alpha);
    const xs = [];
    for (let y = y0; y <= y1; y++) {
      xs.length = 0; const yc = y + 0.5;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > yc) !== (yj > yc)) xs.push(xi + ((yc - yi) * (xj - xi)) / (yj - yi));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) { const a = Math.round(xs[k]), b = Math.round(xs[k + 1]); if (b > a) ctx.fillRect(a, y, b - a, 1); }
    }
    // 가장자리: 금빛 1 px + 흐르는 반짝
    const tt = (t || 0) * 10;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xa, ya] = pts[j], [xb, yb] = pts[i], len = Math.max(1, Math.round(Math.hypot(xb - xa, yb - ya)));
      for (let s = 0; s < len; s++) {
        const x = Math.round(xa + ((xb - xa) * s) / len), y = Math.round(ya + ((yb - ya) * s) / len), ph = (s + i * 5 + Math.floor(tt)) % 9;
        ctx.fillStyle = ph === 0 ? rgba(GO[6], 0.95 * alpha) : rgba(GO[4], (ph < 3 ? 0.5 : 0.28) * alpha);
        ctx.fillRect(x, y, 1, 1);
        if (ph === 0) { ctx.fillStyle = rgba(GO[5], 0.45 * alpha); ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
      }
    }
    ctx.globalCompositeOperation = op;
  };

  // 미리 굽기(document 가 있으면 읽자마자). node 에서는 첫 그리기 때.
  api.warm = function () { kid(); sheepSet(); enemySet(); pickupSet(); groundSet(); return api; };
  api.sizes = {
    child: [12, 16], sheep: [10, 8], puff: [12, 10], fluff: 8, clock: 9, hand: 12, closet: 18, wolf: 14, boss_wolf: 36, boss_dark: 40,
    dust: 3, dust_big: 6, milk: [7, 8], bell: [7, 8], pillow: [6, 5], star: 5, bubble: 8, note: [4, 5], tile: 16,
  };
  api._pal = { INK, SL, GO, RD, PK, GR, CY, VI };
  api._sets = () => ({ kid: kid(), sheep: sheepSet(), enemy: enemySet(), pickup: pickupSet(), ground: groundSet() });

  root.SurvArt.sheep = api;
  if (canMake() && typeof document !== "undefined") { try { api.warm(); } catch (e) { /* 굽기 실패해도 함수는 남는다(첫 그리기 때 다시) */ KID = SHEEP = EN = PU = GND = null; } }
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
