// @ts-nocheck — 디자인 세션 그림 정본 docs/lab-defense-art-bugs.js 를 그대로 옮긴 것. 그림을 고치면 docs 판을 고치고 다시 복사한다(tmp/lab-defense/sync-src.sh).
window.TDArt = window.TDArt || {};
// 릴리스 디펜스 — 버그(적) 도트. 아트 디렉션 2판(docs/lab-defense-artdir.md) 3·4절.
// 모든 그림은 모듈을 읽을 때 한 번 픽셀 버퍼로 굽고, 프레임 함수는 정수 fillRect 줄(run)만 칠한다.
// 시점: 정면 3/4 내려다보기(머리가 아래·화면 쪽, 등껍질이 위). 빛은 왼쪽 위.
(function () {
  "use strict";

  // ── 팔레트(artdir 3절만) ────────────────────────────────────────────
  const INK = ["#07060f", "#0e0c1c", "#17142b", "#231e3d", "#322b52", "#463d6b", "#5f5687"];
  const SL = ["#3a3f5c", "#545b7a", "#7880a0", "#a3abc4", "#cdd3e3", "#eef1f8"];
  const GO = ["#3b1d14", "#6e2f1c", "#a8492a", "#e0743a", "#f6a94a", "#ffd86b", "#fff2b8"];
  const RD = ["#2e0a1f", "#5c1230", "#9a1d3c", "#d8324a", "#ff5e5b", "#ff9a86"];
  const PK = ["#3d1145", "#6e1f6e", "#a8329a", "#e050c0", "#ff8be0"];
  const GR = ["#0b2422", "#124638", "#1c7a50", "#36b866", "#7ee87e", "#d4ffb0"];
  const CY = ["#0b1d3a", "#123a66", "#1a68a0", "#2aa6d6", "#6ee6ff", "#c8fbff"];
  const VI = ["#1e0f3d", "#3a1a6b", "#6232b0", "#9a64f0", "#c9a4ff"];

  // 등급별 램프: [0]=외곽선(가장 어두움), 1..=그늘→빛. 어두운 쪽은 보라·남색, 밝은 쪽은 청록·노랑으로 돈다.
  const R_TRIV = [VI[1], SL[0], SL[1], SL[2], SL[3], VI[4], SL[4]];
  const R_MIN = [GR[0], GR[1], GR[2], GR[3], GR[4], GR[5]];
  const R_MAJ = [CY[0], VI[1], CY[1], CY[2], CY[3], CY[4], CY[5]];
  const R_MAJH = [CY[0], INK[3], SL[0], SL[1], SL[2], SL[3], SL[4]];
  const R_CRI = [RD[0], VI[1], RD[1], RD[2], RD[3], RD[4], RD[5]];
  const R_CRIH = [RD[0], INK[2], INK[3], RD[1], RD[2], RD[3]];
  const R_CRIB = [RD[0], VI[1], RD[1], RD[2], RD[3], RD[4]]; // 몸통: 분홍(RD5) 없이
  const R_GOLD = [GO[0], GO[1], GO[2], GO[3], GO[4], GO[5], GO[6]];
  const R_BLK = [VI[0], INK[2], VI[1], VI[2], VI[3], VI[4], SL[4]];
  const R_BLKH = [VI[0], INK[2], INK[4], INK[5], INK[6], SL[3]];
  const R_STEEL = [CY[0], SL[0], SL[1], SL[2], SL[3], SL[4], SL[5]];

  // ── 픽셀 버퍼 ─────────────────────────────────────────────────────
  function Buf(w, h) { return { w, h, c: new Array(w * h).fill(null) }; }
  function px(b, x, y, c) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= b.w || y >= b.h) return; b.c[y * b.w + x] = c; }
  function at(b, x, y) { if (x < 0 || y < 0 || x >= b.w || y >= b.h) return null; return b.c[y * b.w + x]; }
  function line(b, x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) { px(b, x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  // 글자 격자: rows 의 글자 하나 = 1 px, "." 투명. (ox, oy) 에 찍는다.
  function grid(b, rows, pal, ox = 0, oy = 0) {
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const k = r[x]; if (k !== "." && k !== " " && pal[k]) px(b, ox + x, oy + y, pal[k]); } });
  }

  // 빛 벡터(왼쪽 위 앞)
  const LV = (() => { const v = [-0.5, -0.62, 0.6]; const m = Math.hypot(...v); return v.map((a) => a / m); })();
  // 모양: (x, y) 픽셀 중심 → null | { l: 0..1 밝기, nx, ny }
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
  function union(...fs) { return (x, y) => { for (const f of fs) { const r = f(x, y); if (r) return r; } return null; }; }
  function minus(f, g) { return (x, y) => (g(x, y) ? null : f(x, y)); }

  const BAYER = [[0, 0.5], [0.75, 0.25]];
  // 모양 하나를 칠하고(색조 이동 명암 + 2×2 디더), 림 라이트, 선택적 외곽선을 단다.
  // 외곽선: 빈 칸 위·왼쪽은 한 단 밝게, 아래·오른쪽은 가장 어둡게. 뒤 부품 위에 겹치면 안쪽 선(가장 어두움).
  function blob(b, ins, ramp, o = {}) {
    const { w, h } = b, M = new Uint8Array(w * h), N = [];
    const top = ramp.length - 1, n = top - (o.lo ?? 1) + 1 - (o.noTop ? 1 : 0), lo = o.lo ?? 1, dth = o.dither ?? 0.55;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const r = ins(x + 0.5, y + 0.5);
      if (!r) continue;
      const i = y * w + x; M[i] = 1; N[i] = r;
      let l = o.curve ? o.curve(r.l, r) : r.l;
      let k = Math.floor(l * n + (BAYER[y & 1][x & 1] - 0.375) * dth);
      k = Math.max(0, Math.min(n - 1, k));
      b.c[i] = ramp[lo + k];
    }
    const inM = (x, y) => x >= 0 && y >= 0 && x < w && y < h && M[y * w + x] === 1;
    if (o.rim) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!M[i]) continue; const r = N[i];
      if (!inM(x + 1, y) && r.nx > 0.35 && r.ny > -0.1 && r.ny < 0.7) b.c[i] = o.rim;
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

  // 다리: 엉덩이 → 무릎 → 발. side -1 왼쪽 / 1 오른쪽. ph 위상(0..1), 4프레임 기준 f.
  function leg(b, hx, hy, side, kx, ky, fx, fy, f, nf, ph, col, kneeC, footC, o = {}) {
    const a = ((f / nf) + ph) * Math.PI * 2;
    const step = Math.round(Math.sin(a) * (o.amp ?? 1));
    const up = Math.cos(a) > 0.55 ? 1 : 0; // 들린 발
    const K = [hx + side * kx, hy + ky - up];
    const F = [hx + side * (fx - up), hy + fy + step - up];
    line(b, hx, hy, K[0], K[1], col);
    line(b, K[0], K[1], F[0], F[1], col);
    if (o.thick) { line(b, hx, hy + 1, K[0], K[1] + 1, o.thick); line(b, K[0], K[1] + 1, F[0], F[1], o.thick); }
    px(b, K[0], K[1], kneeC);
    if (footC) px(b, F[0], F[1], footC);
  }

  // 버퍼 → (ctx) => void. 같은 색 가로 줄을 하나의 fillRect 로.
  function bake(b) {
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
    const fn = (ctx) => { for (let i = 0; i < runs.length; i += 4) { ctx.fillStyle = runs[i]; ctx.fillRect(runs[i + 1], runs[i + 2], runs[i + 3], 1); } };
    fn.buf = b; // 미리보기·검사용
    return fn;
  }

  // ── 발광: 계단 원(가산 합성으로 겹쳐진다) ─────────────────────────────
  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`; }
  function disc(ctx, cx, cy, r, col, a) {
    ctx.fillStyle = rgba(col, a);
    r = Math.max(0, r);
    for (let dy = -Math.floor(r); dy <= Math.floor(r); dy++) {
      const hw = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)) + 0.35);
      ctx.fillRect(Math.round(cx) - hw, Math.round(cy) + dy, hw * 2 + 1, 1);
    }
  }
  // 3겹: 넓고 옅게 → 좁고 진하게
  function glow3(ctx, cx, cy, r, col, a) { disc(ctx, cx, cy, r, col, a * 0.22); disc(ctx, cx, cy, r * 0.62, col, a * 0.35); disc(ctx, cx, cy, Math.max(1, r * 0.3), col, a * 0.6); }

  const BOB4 = [0, -1, 0, -1];

  // ═════════════════════════════════════════════════════════════════
  // Trivial — 진드기. 몸 8, 다리 4, 통통 튀기 2프레임. 손으로 찍은 격자.
  // ═════════════════════════════════════════════════════════════════
  const TP = { o: VI[1], p: VI[2], d: SL[0], D: SL[1], m: SL[2], l: SL[3], h: SL[4], w: SL[5], v: VI[4], e: INK[1], k: PK[3], r: CY[4], a: CY[4], s: INK[5], g: SL[1], t: VI[3] };
  const TRIV_BODY = [
    "...pppp...",
    "..phhllo..",
    ".phwhllmo.",
    ".plellemo.",
    ".plemmeDo.",
    ".pkmmmmko.",
    "..oDDDDo..",
    "...oooo...",
  ];
  // 행 4 의 e 사이(눈) 대칭을 위해 따로 손본다
  function buildTrivial(f) {
    const b = Buf(10, 11);
    const up = f === 1 ? 1 : 0;
    const oy = 1 + (1 - up); // 몸 시작 줄
    // 더듬이(눌리면 벌어지고, 뜨면 모인다)
    if (up) { px(b, 3, oy - 1, TP.p); px(b, 6, oy - 1, TP.p); px(b, 3, oy - 2, TP.v); px(b, 6, oy - 2, TP.v); }
    else { px(b, 3, oy - 1, TP.p); px(b, 6, oy - 1, TP.p); px(b, 2, oy - 1, TP.v); px(b, 7, oy - 1, TP.v); }
    grid(b, TRIV_BODY, TP, 0, oy);
    // 다리 4: 아래 줄 9·10
    if (up) { // 떠서 다리 모음
      px(b, 2, 9, TP.g); px(b, 7, 9, TP.g); px(b, 3, 9, TP.g); px(b, 6, 9, TP.g);
      px(b, 1, 10, TP.s); px(b, 8, 10, TP.s);
    } else { // 눌려 벌어짐
      px(b, 1, 9, TP.g); px(b, 8, 9, TP.g); px(b, 0, 10, TP.s); px(b, 9, 10, TP.s);
      px(b, 3, 10, TP.g); px(b, 6, 10, TP.g);
    }
    return b;
  }
  // 눌린 프레임은 몸을 가로로 1 px 넓힌 효과 대신 볼 홍조를 아래로 — 격자는 같은 것을 쓰되 줄 위치만 바뀐다.

  // ═════════════════════════════════════════════════════════════════
  // Minor — 일개미. 몸 12, 마디 셋, 더듬이 2, 다리 6, 4프레임
  // ═════════════════════════════════════════════════════════════════
  function buildMinor(f) {
    // 위에서 내려다본 일개미: 배(크게) → 가슴(가늘게) → 머리(작게) 가 x=8 축 한 줄로. 머리가 아래(앞).
    const b = Buf(16, 17), oy = BOB4[f] + 1;
    const LC = GR[2], KC = GR[3], FC = GR[4];
    // 다리 6: 가슴 양옆. 앞다리는 앞(아래)으로, 가운데는 옆, 뒷다리는 뒤(위)로. 세 다리씩 엇갈려 딛는다.
    const s = [0, 1, 0, -1][f];
    const L6 = [ // [hip, knee, foot], 왼쪽 기준. 무리 A=+1, B=-1
      [[6, 10], [4, 10], [2, 13], 1],
      [[6, 9], [3, 8], [1, 9], -1],
      [[6, 8], [4, 6], [2, 4], 1],
    ];
    L6.forEach(([H, K, F, g]) => {
      [-1, 1].forEach((side) => {
        const m = (x) => (side < 0 ? x : 15 - x);
        const d = s * g * side; // 왼쪽·오른쪽이 엇갈린 무리
        const fy = F[1] + d, ky = K[1] + (d > 0 ? 1 : 0) * 0;
        line(b, m(H[0]), H[1] + oy, m(K[0]), ky + oy, LC);
        line(b, m(K[0]), ky + oy, m(F[0]), fy + oy, LC);
        px(b, m(K[0]), ky + oy, KC); px(b, m(F[0]), fy + oy, FC);
      });
    });
    // 배: 회로 등껍질
    blob(b, ell(8, 4.6 + oy, 3.7, 3.4), R_MIN, { rim: CY[3], dither: 0.3, amb: 0.45 });
    [4, 6].forEach((y) => { for (let x = 5; x <= 10; x++) { const c = at(b, x, y + oy); if (c && c !== R_MIN[0] && c !== R_MIN[1]) px(b, x, y + oy, y === 4 ? GR[2] : GR[1]); } });
    px(b, 6, 2 + oy, GR[5]); px(b, 5, 3 + oy, GR[5]); px(b, 7, 2 + oy, GR[4]);
    px(b, 7, 6 + oy, GR[3]); px(b, 8, 5 + oy, GR[1]);
    // 가슴(가는 마디)
    blob(b, ell(8, 9.2 + oy, 1.8, 1.7), R_MIN, { dither: 0, amb: 0.6 });
    // 머리(작게)
    blob(b, ell(8, 12.6 + oy, 2.9, 2.3), R_MIN, { rim: CY[3], dither: 0, amb: 0.5 });
    px(b, 7, 11 + oy, GR[5]);
    // 눈: 머리 양옆 위
    px(b, 6, 12 + oy, SL[5]); px(b, 6, 13 + oy, INK[1]);
    px(b, 9, 12 + oy, SL[4]); px(b, 9, 13 + oy, INK[1]);
    // 큰턱
    px(b, 7, 15 + oy, GR[1]); px(b, 8, 15 + oy, GR[1]);
    // 더듬이 2: 머리 앞 모서리에서 꺾여 앞(아래)·바깥으로
    const sw = f % 2;
    line(b, 6, 11 + oy, 4, 11 + oy - sw, GR[2]); line(b, 4, 11 + oy - sw, 3, 14 + oy, GR[2]); px(b, 3, 15 + oy - sw, GR[4]);
    line(b, 9, 11 + oy, 11, 11 + oy - sw, GR[2]); line(b, 11, 11 + oy - sw, 12, 14 + oy, GR[2]); px(b, 12, 15 + oy - sw, GR[4]);
    return b;
  }

  // ═════════════════════════════════════════════════════════════════
  // Major — 갑옷 딱정벌레. 몸 16, 판갑(금속 반사), 집게, 붉은 눈, 4프레임
  // ═════════════════════════════════════════════════════════════════
  const metal = (l, r) => { // 금속: 위쪽 밝은 띠 + 아래 반사광
    const band = Math.exp(-Math.pow((r.ny + 0.42) * 4.5, 2)) * 0.45 * (r.nx < 0.3 ? 1 : 0.4);
    const bounce = r.ny > 0.6 && r.nx > -0.2 ? 0.15 : 0;
    return Math.min(1, l * 0.62 + band + bounce);
  };
  function buildMajor(f) {
    const b = Buf(20, 21), oy = BOB4[f] + 1;
    const LC = SL[1], KC = SL[3], FC = SL[2];
    [[8, 0.25, -1], [10.5, 0.75, 1], [13, 0.25, 3]].forEach(([hy, ph, fy]) => {
      leg(b, 5, hy + oy, -1, 2, -1, 4, fy, f, 4, ph, LC, KC, FC, { thick: INK[3] });
      leg(b, 14, hy + oy, 1, 2, -1, 4, fy, f, 4, ph + 0.5, LC, KC, FC, { thick: INK[3] });
    });
    // 짧은 더듬이
    line(b, 8, 4 + oy, 6, 1 + oy, SL[1]); px(b, 5, 0 + oy, CY[4]); px(b, 6, 1 + oy, SL[2]);
    line(b, 11, 4 + oy, 13, 1 + oy, SL[1]); px(b, 14, 0 + oy, CY[4]); px(b, 13, 1 + oy, SL[2]);
    // 머리(껍질 아래로 나온다) — 먼저 그려 껍질이 덮는다
    blob(b, ell(10, 15.0 + oy, 5.0, 3.2), R_MAJH, { rim: CY[3], amb: 0.5 });
    // 집게(큰턱) — 프레임마다 여닫음
    const op = f % 2;
    const jaw = (s) => {
      const x0 = s < 0 ? 7 : 12;
      const pts = s < 0
        ? [[x0 - 1, 16], [x0 + 1, 17], [x0 + 2 - op, 19.6], [x0 + 0.6 - op, 19.6], [x0 - 0.8, 18]]
        : [[x0 + 2, 16], [x0, 17], [x0 - 1 + op, 19.6], [x0 + 0.4 + op, 19.6], [x0 + 1.8, 18]];
      blob(b, poly(pts.map(([x, y]) => [x, y + oy])), R_STEEL, { dither: 0 });
    };
    jaw(-1); jaw(1);
    // 등껍질: 반구 + 가운데 이음매 + 판 이음
    const shell = ell(10, 7.8 + oy, 7.6, 6.2, { gamma: 1, amb: 0.45 });
    blob(b, shell, R_MAJ, { curve: metal, rim: CY[4], dither: 0.35 });
    void 0;
    for (let y = 2; y <= 14; y++) { const yy = y + oy; if (at(b, 10, yy) && at(b, 10, yy) !== R_MAJ[0]) { px(b, 10, yy, CY[0]); if (y > 3 && y < 13) px(b, 9, yy, at(b, 9, yy) === CY[4] || at(b, 9, yy) === CY[5] ? CY[5] : CY[3]); } }
    // 판 이음(가로 홈) — 껍질 아래쪽 1/3
    for (let x = 4; x <= 16; x++) { const yy = 11 + oy; const c = at(b, x, yy); if (c && c !== R_MAJ[0] && x !== 10) px(b, x, yy, VI[1]); }
    // 리벳·반사 1 px
    px(b, 5, 6 + oy, CY[5]); px(b, 6, 5 + oy, CY[5]); px(b, 7, 4 + oy, CY[5]);
    px(b, 12, 4 + oy, CY[5]);
    px(b, 6, 12 + oy, CY[4]); px(b, 14, 12 + oy, CY[4]);
    // 회로 무늬(껍질 오른쪽 판)
    px(b, 13, 7 + oy, CY[1]); px(b, 14, 7 + oy, CY[1]); px(b, 14, 8 + oy, CY[1]); px(b, 14, 9 + oy, CY[4]);
    px(b, 6, 8 + oy, CY[1]); px(b, 5, 8 + oy, CY[1]); px(b, 5, 9 + oy, CY[4]);
    // 붉은 눈 — 껍질 아래 머리에
    [[7, 15], [11, 15]].forEach(([ex, ey]) => {
      px(b, ex, ey + oy, RD[4]); px(b, ex + 1, ey + oy, RD[3]); px(b, ex, ey + 1 + oy, RD[3]); px(b, ex + 1, ey + 1 + oy, RD[2]);
    });
    px(b, 7, 15 + oy, RD[5]); px(b, 11, 15 + oy, RD[5]);
    return b;
  }

  // ═════════════════════════════════════════════════════════════════
  // Critical — 전갈·말벌. 몸 20, 가시 등줄기, 꼬리 독침, 발광 눈·등 무늬
  // ═════════════════════════════════════════════════════════════════
  const CRIT_W = 28, CRIT_H = 28;
  const CRIT_PAT = [[14, 9], [14, 10], [14, 11], [13, 12], [15, 12], [12, 12], [16, 12], [11, 11], [17, 11]];
  function buildCritical(f) {
    const b = Buf(CRIT_W, CRIT_H), oy = BOB4[f] + 2;
    const LC = RD[1], KC = RD[3], FC = GO[4];
    [[14, 0.25, -1], [16.5, 0.75, 1], [19, 0.25, 3]].forEach(([hy, ph, fy]) => {
      leg(b, 8, hy + oy, -1, 2, -1, 4, fy, f, 4, ph, LC, KC, FC);
      leg(b, 19, hy + oy, 1, 2, -1, 4, fy, f, 4, ph + 0.5, LC, KC, FC);
    });
    const dark = (l) => l * 0.62;
    // 꼬리: 등 가운데서 솟아 오른쪽으로 휘고, 금 독침 끝이 위·바깥으로 솟는다. 걸음마다 1 px 까딱.
    const tw = f === 1 || f === 2 ? 1 : 0;
    const segs = [[14, 8.6, 2.5, 2.2], [14.8, 5.8, 2.3, 2.0], [16.8, 3.9, 2.1, 1.8], [19.2, 3.4 - tw * 0.5, 1.9, 1.7]];
    segs.forEach(([x, y, rx, ry]) => blob(b, ell(x, y + oy, rx, ry), R_CRIB, { rim: GO[4], dither: 0, curve: dark }));
    const sx = 21, sy = 3.4 + oy - tw * 0.5;
    blob(b, poly([[sx - 0.8, sy + 1.6], [sx + 1.4, sy + 1.2], [sx + 2.6, sy - 1.4], [sx + 3.0, sy - 3.6], [sx + 1.6, sy - 1.8], [sx - 0.6, sy - 0.6]]), R_GOLD, { dither: 0 });
    px(b, Math.round(sx + 2.4), Math.round(sy - 3.4), GO[6]);
    // 집게: 몸 앞쪽에서 바깥·앞으로 크게 벌린다. 프레임마다 날을 여닫음.
    const op = f % 2;
    [-1, 1].forEach((s) => {
      const m = (x) => (s < 0 ? x : 27 - x);
      line(b, m(8), 19 + oy, m(4), 22 + oy, RD[2]); line(b, m(8), 20 + oy, m(4), 23 + oy, RD[1]);
      blob(b, ell(m(3) + 0.5, 23.6 + oy, 2.4, 2.0), R_CRIB, { rim: GO[4], dither: 0, curve: (l) => l * 0.8 });
      // 날 둘(금): 바깥 날은 앞으로, 안쪽 날은 벌어진다
      px(b, m(1), 25 + oy, GO[4]); px(b, m(1), 26 + oy, GO[5]); px(b, m(0), 26 + oy, GO[3]);
      px(b, m(4), 25 + oy, GO[3]); px(b, m(5 + op), 26 + oy, GO[5]); px(b, m(4 + op), 26 + oy, GO[4]);
    });
    // 몸통: 빨강 중간·어두운 쪽 위주(분홍 빼기)
    blob(b, ell(14, 14.4 + oy, 7.8, 6.0), R_CRIB, { rim: GO[4], dither: 0.15, curve: (l) => 0.1 + l * 0.72 });
    for (let x = 7; x <= 21; x++) { const d = Math.abs(x - 14); const y1 = 13 + oy + (d > 4 ? 1 : 0) + (d > 6 ? 1 : 0); [y1, y1 + 3].forEach((yy) => { const c = at(b, x, yy); if (c && c !== R_CRIB[0] && c !== R_CRIB[1]) px(b, x, yy, RD[1]); }); }
    // 가시 등줄기
    [[7.2, 12.4, -1], [9.2, 9.6, -0.6], [18.8, 9.6, 0.6], [20.8, 12.4, 1]].forEach(([x, y, s]) => {
      const pts = [[x - 1.3, y + oy + 1.2], [x + 1.3, y + oy + 1.2], [x + s * 1.6, y + oy - 3]];
      blob(b, poly(pts, (nx) => 0.75 - nx * 0.4), R_GOLD, { dither: 0, inner: false });
    });
    // 등 무늬(회로) — glow 가 맥동으로 밝힌다
    CRIT_PAT.forEach(([x, y]) => px(b, x, y + oy, RD[1]));
    px(b, 14, 9 + oy, GO[4]); px(b, 11, 11 + oy, GO[3]); px(b, 17, 11 + oy, GO[3]);
    px(b, 9, 11 + oy, RD[4]); px(b, 10, 10 + oy, RD[4]); px(b, 11, 10 + oy, RD[4]);
    // 머리와 몸 사이 어두운 틈: 머리보다 한 둘레 큰 그림자 테
    blob(b, ell(14, 21.0 + oy, 6.4, 3.9), [INK[1], INK[1], INK[1]], { dither: 0, outline: false });
    blob(b, ell(14, 21.4 + oy, 5.0, 3.0), R_CRIH, { rim: GO[3] });
    // 발광 눈(노랑) — 찡그린 각도
    [[10, 1], [16, -1]].forEach(([ex, s]) => {
      px(b, ex, 20 + oy, s > 0 ? GO[4] : GO[5]); px(b, ex + 1, 20 + oy, GO[6]); px(b, ex + 2, 20 + oy, s > 0 ? GO[5] : GO[4]);
      px(b, ex + 1, 21 + oy, GO[5]); px(b, s > 0 ? ex + 2 : ex, 21 + oy, GO[4]);
      px(b, s > 0 ? ex : ex + 2, 19 + oy, RD[0]);
    });
    // 이빨
    [12, 14, 16].forEach((x) => { px(b, x, 23 + oy, SL[4]); });
    px(b, 13, 23 + oy, RD[0]); px(b, 15, 23 + oy, RD[0]); px(b, 13, 24 + oy, SL[3]); px(b, 15, 24 + oy, SL[3]);
    // 더듬이: 뒤로 젖힌 채찍
    line(b, 11, 18 + oy, 8, 16 + oy, RD[2]); line(b, 8, 16 + oy, 6, 17 + oy, RD[2]); px(b, 5, 17 + oy, GO[4]);
    line(b, 16, 18 + oy, 19, 16 + oy, RD[2]); line(b, 19, 16 + oy, 21, 17 + oy, RD[2]); px(b, 22, 17 + oy, GO[4]);
    return b;
  }
  function glowCritical(f) {
    const oy = BOB4[f] + 2, k = [0.55, 0.8, 1, 0.8][f], tw = f === 1 || f === 2 ? 1 : 0;
    return (ctx) => {
      glow3(ctx, 11, 20 + oy, 2.2, GO[5], 0.7 * k); glow3(ctx, 17, 20 + oy, 2.2, GO[5], 0.7 * k);
      glow3(ctx, 14, 11 + oy, 4 * k + 2, RD[4], 0.3 * k);
      ctx.fillStyle = rgba(GO[5], 0.65 * k);
      CRIT_PAT.forEach(([x, y]) => ctx.fillRect(x, y + oy, 1, 1));
      glow3(ctx, 23, Math.round(0.4 + oy - tw * 0.5), 2.5, GO[5], 0.6 * k);
    };
  }

  // ═════════════════════════════════════════════════════════════════
  // Blocker — 「출시 차단」. 몸 38(2타일), 빗장·자물쇠 갑옷, 왕관 가시, 경고 띠
  // ═════════════════════════════════════════════════════════════════
  const BW = 48, BH = 48;
  const BLK = { cx: 24, lockY: 17, eyeY: 33 };
  function buildBlocker(f, mode) {
    const swell = mode === "swell" ? 2 : 0;
    const b = Buf(BW, BH), oy = [0, -1, 0, -1][f] + 2;
    const cx = BLK.cx;
    // 다리 8 (두꺼운)
    const LC = VI[2], KC = VI[3], FC = SL[3];
    [[20, 0.25, -1], [24, 0.75, 1], [28, 0.25, 3], [31, 0.75, 5]].forEach(([hy, ph, fy], i) => {
      const reach = 5 + (i === 0 || i === 3 ? 0 : 1);
      leg(b, 9 - swell, hy + oy, -1, 3, -2, reach, fy, f, 4, ph, LC, KC, FC, { thick: VI[1], amp: 1 });
      leg(b, 38 + swell, hy + oy, 1, 3, -2, reach, fy, f, 4, ph + 0.5, LC, KC, FC, { thick: VI[1], amp: 1 });
    });
    // 머리(턱) — 몸 아래
    blob(b, ell(cx, 34.6 + oy, 10.5 + swell, 5.6), R_BLKH, { rim: GO[4] });
    // 큰턱(금)
    const op = (f % 2) + swell;
    [-1, 1].forEach((s) => {
      const x0 = cx + s * 7;
      const pts = [[x0 - s * 1, 36], [x0 + s * 2.5, 37], [x0 + s * (1.5 - op), 42.5], [x0 - s * (0.5 + op), 42], [x0 - s * 1.5, 39]];
      blob(b, poly(pts.map(([x, y]) => [x, y + oy])), R_GOLD, { dither: 0 });
    });
    // 몸 갑옷
    const body = ell(cx, 21.4 + oy, 17.6 + swell * 1.5, 13.4 + swell);
    blob(b, body, R_BLK, { rim: GO[4], dither: 0.5 });
    // 판 이음: 세로 이음 둘 + 가로 이음
    const inside = (x, y) => { const c = at(b, x, y); return c && c !== R_BLK[0] && c !== R_BLK[1]; };
    for (let y = 9; y < 34; y++) [cx - 9, cx + 8].forEach((x) => { if (inside(x, y + oy) && (y < 14 || y > 21)) px(b, x, y + oy, VI[1]); });
    // 경고 띠(사선 금·잉크) — 몸 아래쪽
    for (let y = 27; y <= 30; y++) for (let x = 0; x < BW; x++) {
      const yy = y + oy; if (!body(x + 0.5, yy + 0.5)) continue;
      const nx = (x + 0.5 - cx) / (17.6 + swell * 1.5), ny = (yy + 0.5 - 21.4 - oy) / (13.4 + swell);
      if (nx * nx + ny * ny > 0.9) continue;
      const stripe = ((x + y) >> 1) % 2 === 0;
      const dark = y === 30 || (x > cx + 10);
      px(b, x, yy, stripe ? (y === 27 ? GO[5] : dark ? GO[3] : GO[4]) : (y === 27 ? INK[4] : INK[2]));
    }
    for (let x = 0; x < BW; x++) { if (inside(x, 26 + oy) || at(b, x, 26 + oy) === INK[2]) if (body(x + 0.5, 26.5 + oy)) px(b, x, 26 + oy, VI[1]); }
    // 빗장(가로 강철 막대) — 자물쇠 양옆
    for (const s of [-1, 1]) {
      const xa = s < 0 ? cx - 16 : cx + 5, xb = s < 0 ? cx - 5 : cx + 16;
      for (let x = xa; x < xb; x++) {
        if (!body(x + 0.5, 17.5 + oy) || !body(x + 0.5, 20.5 + oy)) continue;
        px(b, x, 17 + oy, SL[4]); px(b, x, 18 + oy, SL[3]); px(b, x, 19 + oy, SL[2]); px(b, x, 20 + oy, SL[0]);
      }
      // 리벳
      [s < 0 ? cx - 12 : cx + 11, s < 0 ? cx - 8 : cx + 7].forEach((x) => { px(b, x, 18 + oy, SL[5]); px(b, x, 19 + oy, SL[1]); });
    }
    // 자물쇠 문양(금): 고리 + 몸통 + 열쇠 구멍
    const L = BLK.lockY + oy;
    blob(b, poly([[cx - 4.6, L - 1], [cx + 4.6, L - 1], [cx + 4.6, L + 6], [cx - 4.6, L + 6]], (nx, ny) => 0.75 - nx * 0.25 - ny * 0.35), R_GOLD, { dither: 0.4, rim: GO[6] });
    // 고리
    for (let y = L - 6; y <= L - 2; y++) {
      const t = y - (L - 6);
      const half = t === 0 ? 1 : 3;
      if (t === 0) { for (let x = cx - 2; x <= cx + 1; x++) px(b, x, y, x < cx ? GO[5] : GO[4]); px(b, cx - 3, y, GO[0]); px(b, cx + 2, y, GO[0]); for (let x = cx - 2; x <= cx + 1; x++) px(b, x, y - 1, GO[0]); }
      else { px(b, cx - half, y, GO[5]); px(b, cx - half - 1, y, GO[0]); px(b, cx - half + 1, y, GO[1]); px(b, cx + half - 1, y, GO[4]); px(b, cx + half, y, GO[0]); px(b, cx + half - 2, y, GO[1]); }
    }
    px(b, cx - 1, L + 1, INK[1]); px(b, cx, L + 1, INK[1]); px(b, cx - 1, L + 2, INK[1]); px(b, cx, L + 2, INK[1]); px(b, cx - 1, L + 3, INK[2]); px(b, cx, L + 3, INK[2]);
    px(b, cx - 3, L, GO[6]); px(b, cx - 2, L, GO[6]);
    // 왕관 가시(금) — 몸 윗선
    [[cx - 12, 11.5, 4, -0.5], [cx - 6.5, 8.6, 5, -0.25], [cx + 6.5, 8.6, 5, 0.25], [cx + 12, 11.5, 4, 0.5], [cx - 16, 16, 3, -1], [cx + 16, 16, 3, 1]].forEach(([x, y, hgt, s]) => {
      const pts = [[x - 1.8, y + oy + 1.4], [x + 1.8, y + oy + 1.4], [x + s * 2, y + oy - hgt]];
      blob(b, poly(pts, (nx) => 0.8 - nx * 0.45), R_GOLD, { dither: 0, inner: false });
    });
    // 갑옷 하이라이트 1 px 호
    [[cx - 12, 13], [cx - 11, 12], [cx - 10, 11], [cx - 13, 14], [cx - 14, 16]].forEach(([x, y]) => { if (inside(x, y + oy)) px(b, x, y + oy, VI[4]); });
    // 눈: 가로 슬릿(빨강)
    const E = BLK.eyeY + oy;
    [-1, 1].forEach((s) => {
      const x0 = s < 0 ? cx - 7 : cx + 3;
      for (let x = x0; x < x0 + 4; x++) { px(b, x, E, (s < 0 ? x - x0 : 3 - (x - x0)) < 1 ? RD[2] : RD[4]); px(b, x, E + 1, RD[2]); }
      px(b, s < 0 ? x0 + 3 : x0, E - 1, INK[2]); px(b, s < 0 ? x0 + 2 : x0 + 1, E - 1, INK[2]);
      px(b, s < 0 ? x0 + 2 : x0 + 1, E, RD[5]);
    });
    if (swell) { // 부풀기: 판 틈으로 분홍 빛이 샌다
      for (let y = 9; y < 26; y++) [cx - 9, cx + 8].forEach((x) => { if (at(b, x, y + oy) === VI[1]) px(b, x, y + oy, (y & 1) ? PK[3] : PK[4]); });
      for (let x = cx - 3; x <= cx + 2; x++) px(b, x, 38 + oy, PK[2]);
      px(b, cx - 2, 38 + oy, PK[4]);
    }
    return b;
  }
  function glowBlocker(f, mode) {
    const oy = [0, -1, 0, -1][f] + 2, cx = BLK.cx, E = BLK.eyeY + oy;
    return (ctx) => {
      const red = mode === "rollback" ? 1.6 : 1;
      glow3(ctx, cx - 5, E, 3 * red, RD[4], 0.55 * red); glow3(ctx, cx + 5, E, 3 * red, RD[4], 0.55 * red);
      glow3(ctx, cx, BLK.lockY + oy + 2, 4 + (f % 2), GO[5], 0.35);
      if (mode === "swell") { glow3(ctx, cx - 9, 17 + oy, 5, PK[4], 0.5); glow3(ctx, cx + 8, 17 + oy, 5, PK[4], 0.5); glow3(ctx, cx, 24 + oy, 14, PK[3], 0.35); }
    };
  }

  // ── 단계 덧그림(블로커와 같은 캔버스 좌표) ──────────────────────────
  // phase[0] 방패: 몸 위 칸 점 10 + 청록 방패 고리(점선이 프레임마다 돈다)
  function shieldOverlay(ctx, f, o = {}) {
    const n = o.max ?? 10, have = Math.max(0, Math.min(n, Math.round(o.shield ?? n)));
    const oy = [0, -1, 0, -1][f] + 2, cx = BLK.cx;
    // 고리: 계단 타원 점선
    const rx = 22, ry = 18, cy = 22 + oy;
    for (let i = 0; i < 64; i++) {
      if (((i + f * 2) >> 2) % 2) continue;
      const a = (i / 64) * Math.PI * 2;
      const x = Math.round(cx + Math.cos(a) * rx - 0.5), y = Math.round(cy + Math.sin(a) * ry);
      ctx.fillStyle = Math.sin(a) < -0.2 ? rgba(CY[5], 0.75) : rgba(CY[4], 0.45);
      ctx.fillRect(x, y, 1, 1);
    }
    // 칸 점: 왕관 위 호
    for (let i = 0; i < n; i++) {
      const t = (i - (n - 1) / 2) / (n - 1);
      const x = Math.round(cx - 1 + t * 30), y = Math.round(1 + oy - 2 + Math.abs(t) * 6);
      if (i < have) {
        ctx.fillStyle = CY[0]; ctx.fillRect(x - 1, y - 1, 4, 4);
        ctx.fillStyle = CY[3]; ctx.fillRect(x, y, 2, 2);
        ctx.fillStyle = CY[5]; ctx.fillRect(x, y, 1, 1);
      } else {
        ctx.fillStyle = CY[0]; ctx.fillRect(x - 1, y - 1, 4, 4);
        ctx.fillStyle = CY[1]; ctx.fillRect(x, y, 2, 2);
      }
    }
  }
  function shieldGlow(ctx, f, o = {}) {
    const oy = [0, -1, 0, -1][f] + 2;
    glow3(ctx, BLK.cx, 22 + oy, 20, CY[3], 0.22 + 0.06 * (f % 2));
  }
  // phase[1] 소환: 평소에는 판 틈 분홍 숨구멍, 예고 1 s 동안은 swell 프레임으로 바꿔 그린다
  function summonOverlay(ctx, f) {
    const oy = [0, -1, 0, -1][f] + 2, cx = BLK.cx;
    ctx.fillStyle = PK[3];
    [[cx - 9, 23], [cx + 8, 23], [cx - 9, 11], [cx + 8, 11]].forEach(([x, y]) => ctx.fillRect(x, y + oy, 1, 2));
    ctx.fillStyle = PK[4]; ctx.fillRect(cx - 9, 23 + oy, 1, 1); ctx.fillRect(cx + 8, 23 + oy, 1, 1);
  }
  function summonGlow(ctx, f) {
    const oy = [0, -1, 0, -1][f] + 2, cx = BLK.cx;
    glow3(ctx, cx - 9, 24 + oy, 3, PK[4], 0.5); glow3(ctx, cx + 8, 24 + oy, 3, PK[4], 0.5);
  }
  // phase[2] 롤백: 눈이 붉게 타오르고 자물쇠에 되감기 화살표
  function rollbackOverlay(ctx, f) {
    const oy = [0, -1, 0, -1][f] + 2, cx = BLK.cx, E = BLK.eyeY + oy, L = BLK.lockY + oy;
    [-1, 1].forEach((s) => {
      const x0 = s < 0 ? cx - 8 : cx + 3;
      ctx.fillStyle = RD[0]; ctx.fillRect(x0, E - 1, 5, 3);
      ctx.fillStyle = RD[4]; ctx.fillRect(x0, E, 5, 1);
      ctx.fillStyle = RD[5]; ctx.fillRect(x0 + (s < 0 ? 3 : 1), E, 1, 1);
      ctx.fillStyle = RD[3]; ctx.fillRect(x0, E + 1, 5, 1);
    });
    // 자물쇠 판 위 되감기 화살표(반시계)
    ctx.fillStyle = RD[0]; ctx.fillRect(cx - 5, L - 1, 10, 7);
    ctx.fillStyle = RD[2]; ctx.fillRect(cx - 4, L, 8, 5);
    const A = ["..o.....", ".oooooo.", "..o...o.", "......o.", "..ooooo."]; // 되돌리기 화살표
    A.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === "o") { ctx.fillStyle = y === 1 && x < 3 ? RD[5] : RD[4]; ctx.fillRect(cx - 4 + x - (f % 2), L + y, 1, 1); } });
  }
  function rollbackGlow(ctx, f) {
    const oy = [0, -1, 0, -1][f] + 2, cx = BLK.cx, E = BLK.eyeY + oy;
    const k = [0.7, 1, 0.7, 1][f];
    glow3(ctx, cx - 6, E, 5, RD[4], 0.8 * k); glow3(ctx, cx + 5, E, 5, RD[4], 0.8 * k);
    glow3(ctx, cx, BLK.lockY + oy + 2, 6, RD[3], 0.5 * k);
  }

  // ── 조립 ──────────────────────────────────────────────────────────
  const range = (n) => Array.from({ length: n }, (_, i) => i);
  const sprite = (w, h, ax, ay, fps, build, extra = {}) => Object.assign({ w, h, ax, ay, fps, frames: range(extra.n || 4).map((f) => bake(build(f))) }, extra);

  const bugs = {
    trivial: sprite(10, 11, 5, 10, 6, buildTrivial, { n: 2, body: 8, shadowW: 8, back: [5, 4], top: 1 }),
    minor: sprite(16, 17, 8, 16, 8, buildMinor, { body: 12, shadowW: 12, back: [8, 5], top: 2 }),
    major: sprite(20, 21, 10, 20, 6, buildMajor, { body: 16, shadowW: 16, back: [10, 6], top: 1 }),
    critical: sprite(CRIT_W, CRIT_H, 14, 27, 6, buildCritical, { body: 20, shadowW: 20, back: [14, 13], top: 2 }),
    blocker: sprite(BW, BH, 24, 46, 4, (f) => buildBlocker(f), { body: 38, shadowW: 36, back: [24, 14], top: 6 }),
  };
  bugs.critical.glow = range(4).map(glowCritical);
  bugs.blocker.glow = range(4).map((f) => glowBlocker(f));
  // 소환 예고(1 s): 몸이 부푼 프레임으로 바꿔 그린다. 같은 w·h·ax·ay.
  bugs.blocker.swell = { w: BW, h: BH, ax: 24, ay: 46, fps: 8, frames: range(4).map((f) => bake(buildBlocker(f, "swell"))), glow: range(4).map((f) => glowBlocker(f, "swell")) };
  // 단계 덧그림: 몸 프레임을 그린 뒤 같은 원점·같은 프레임 번호로 overlay(ctx, f, opt), 발광은 glow(ctx, f, opt) 를 "lighter" 로.
  bugs.blocker.phase = [
    { name: "shield", overlay: shieldOverlay, glow: shieldGlow },           // opt.shield = 남은 칸(0..10)
    { name: "summon", overlay: summonOverlay, glow: summonGlow, tell: bugs.blocker.swell },
    { name: "rollback", overlay: rollbackOverlay, glow: rollbackGlow, fpsMul: 1.3 },
  ];

  // 맞았을 때: 통합 쪽이 이 색으로 실루엣을 칠한다(source-in). 도우미도 둔다.
  bugs.flashColor = SL[5];
  bugs.whiteOf = function (src, color = SL[5]) {
    const c = document.createElement("canvas"); c.width = src.width; c.height = src.height;
    const x = c.getContext("2d"); x.drawImage(src, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    return c;
  };
  // 그림자 폭(아트 px). 높이는 폭/3 반올림, 최소 2.
  bugs.shadowW = { trivial: 8, minor: 12, major: 16, critical: 20, blocker: 36 };
  // 발 기준점(0,0)을 가운데로 계단 타원 그림자. ctx 를 기준점으로 옮긴 뒤 부른다.
  bugs.shadow = function (ctx, w) {
    const h = Math.max(2, Math.round(w / 3.2)), rx = w / 2, ry = h / 2;
    for (let y = 0; y < h; y++) {
      const dy = (y + 0.5 - ry) / ry, hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - dy * dy)));
      ctx.fillStyle = rgba(INK[0], 0.5); ctx.fillRect(-hw, y - Math.floor(h / 2), hw * 2, 1);
      if (hw > 3) { ctx.fillStyle = rgba(INK[0], 0.25); ctx.fillRect(-hw + 1, y - Math.floor(h / 2), hw * 2 - 2, 1); }
    }
  };

  // ═════════════════════════════════════════════════════════════════
  // 성질(trait) 덧그림. 부르는 법: trait(ctx, w, h, frame, opt)
  //   ctx 는 그 버그 스프라이트의 왼쪽 위가 (0,0) 이 되도록 옮겨 둔 것(밖으로 그려도 된다).
  //   opt = { spr: TDArt.bugs[grade], t: 초(게임 시계), dx, dy: 진행 방향(타일/s 등, 부호만 쓴다) }
  //   order: "under" = 버그보다 먼저, "over" = 뒤에, "mask" = 버그를 그린 자기 오프스크린 캔버스에 적용
  // ═════════════════════════════════════════════════════════════════
  function bodyBox(w, h, spr) {
    const bw = spr?.body ?? Math.round(w * 0.75);
    const back = spr?.back ?? [Math.round(w / 2), Math.round(h * 0.4)];
    return { bw, bx: back[0], by: back[1] };
  }
  const traits = {
    order: { fast: "under", tough: "over", regen: "over", stealth: "mask", flaky: "mask" },
    // 빠름: 진행 반대쪽으로 시안 잔상 두 줄(프레임마다 길이 출렁)
    fast(ctx, w, h, frame, opt = {}) {
      const { bw } = bodyBox(w, h, opt.spr);
      let dx = opt.dx ?? 0, dy = opt.dy ?? 1; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
      const cx = (opt.spr?.ax ?? w / 2), cy = (opt.spr?.ay ?? h) - Math.round(bw * 0.55);
      const len = Math.max(4, Math.round(bw * 0.7)) + (frame % 2);
      const sx = Math.round(-dy), sy = Math.round(dx); // 진행에 수직
      const off = Math.max(2, Math.round(bw * 0.38));
      [-1, 1].forEach((s, k) => {
        const ox = cx + sx * off * s, oy = cy + sy * off * s;
        for (let i = 0; i < len - k * 2; i++) {
          if (i > 3 && (i + frame) % 3 === 0) continue; const x = Math.round(ox - dx * (bw * 0.3 + i)), y = Math.round(oy - dy * (bw * 0.3 + i));
          const a = 0.85 * (1 - i / len);
          ctx.fillStyle = rgba(i < 2 ? CY[5] : CY[4], a); ctx.fillRect(x, y, 1, 1);
        }
      });
    },
    // 단단함: 등에 강철 판 한 장 더(리벳 넷)
    tough(ctx, w, h, frame, opt = {}) {
      const { bw, bx, by } = bodyBox(w, h, opt.spr);
      const bob = opt.spr && opt.spr.frames.length === 4 ? BOB4[frame % 4] : 0;
      const pw = Math.max(5, Math.round(bw * 0.5)) | 1, ph = Math.max(3, Math.round(bw * 0.28));
      const x0 = bx - (pw >> 1), y0 = by - (ph >> 1) + bob + (opt.spr?.top ?? 0) - 1;
      ctx.fillStyle = CY[0]; ctx.fillRect(x0 - 1, y0, pw + 2, ph); ctx.fillRect(x0, y0 - 1, pw, ph + 2);
      ctx.fillStyle = SL[2]; ctx.fillRect(x0, y0, pw, ph);
      ctx.fillStyle = SL[4]; ctx.fillRect(x0, y0, pw, 1); ctx.fillRect(x0, y0, 1, ph);
      ctx.fillStyle = SL[1]; ctx.fillRect(x0, y0 + ph - 1, pw, 1); ctx.fillRect(x0 + pw - 1, y0 + 1, 1, ph - 1);
      ctx.fillStyle = SL[5]; ctx.fillRect(x0 + 1, y0 + 1, 1, 1);
      if (pw >= 7) { ctx.fillStyle = SL[0]; ctx.fillRect(x0 + pw - 2, y0 + 1, 1, 1); ctx.fillRect(x0 + 1, y0 + ph - 2, 1, 1); ctx.fillRect(x0 + pw - 2, y0 + ph - 2, 1, 1); }
    },
    // 은신: 버그를 그린 오프스크린 캔버스에 체크무늬로 구멍을 낸다(프레임마다 자리 바뀜 → 일렁임).
    // 결과 불투명도 약 35 %. 맵 ctx 에 직접 부르지 않는다.
    stealth(ctx, w, h, frame) {
      ctx.save(); ctx.globalCompositeOperation = "destination-out";
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const on = ((x + y + frame) & 1) === 0;
        ctx.fillStyle = on ? "rgba(0,0,0,1)" : "rgba(0,0,0,0.3)";
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.restore();
    },
    stealthAlpha: 0.35,
    // 재생: 초록 + 가 2 s 마다 몸 위로 떠오른다(opt.t 필요, 없으면 frame 으로)
    regen(ctx, w, h, frame, opt = {}) {
      const { bx } = bodyBox(w, h, opt.spr);
      const t = opt.t != null ? (opt.t % 2) / 2 : (frame % 4) / 4;
      if (t > 0.75) return;
      const x = bx + Math.round((opt.spr?.body ?? w) * 0.3), y = (opt.spr?.top ?? 1) + 2 - Math.round(t * 6);
      const a = t < 0.5 ? 1 : 1 - (t - 0.5) * 4;
      ctx.fillStyle = rgba(GR[0], a); ctx.fillRect(x - 1, y - 2, 3, 5); ctx.fillRect(x - 2, y - 1, 5, 3);
      ctx.fillStyle = rgba(GR[4], a); ctx.fillRect(x, y - 1, 1, 3); ctx.fillRect(x - 1, y, 3, 1);
      ctx.fillStyle = rgba(GR[5], a); ctx.fillRect(x, y, 1, 1);
    },
    // 플래키: 가로 띠 하나를 1–2 px 옆으로 밀고, 띠 가장자리에 분홍·청록 줄. 버그 오프스크린 캔버스에 적용.
    // seed 를 바꿔 부르면 띠 자리가 바뀐다(통합: 0.5 s 마다 한 프레임만 부른다).
    flaky(ctx, w, h, frame, opt = {}) {
      const seed = (opt.seed ?? frame) * 7 + 3;
      const y0 = Math.floor(h * 0.25) + (seed % Math.max(1, Math.floor(h * 0.45)));
      const bh = Math.max(2, Math.round(h * 0.18)), sh = (seed & 1) ? 2 : -2;
      const img = ctx.getImageData(0, y0, w, bh);
      ctx.clearRect(0, y0, w, bh);
      ctx.putImageData(img, sh, y0);
      ctx.save(); ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = rgba(PK[4], 0.7); ctx.fillRect(0, y0, w, 1);
      ctx.fillStyle = rgba(CY[4], 0.7); ctx.fillRect(0, y0 + bh - 1, w, 1);
      ctx.restore();
    },
  };

  TDArt.bugs = bugs;
  TDArt.traits = traits;
  TDArt._bugsPal = { INK, SL, GO, RD, PK, GR, CY, VI };
})();
