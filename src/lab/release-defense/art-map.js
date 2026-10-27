// @ts-nocheck — 디자인 세션 그림 정본 docs/lab-defense-art-map.js 를 그대로 옮긴 것. 그림을 고치면 docs 판을 고치고 다시 복사한다(tmp/lab-defense/sync-src.sh).
window.TDArt = window.TDArt || {};
// 릴리스 디펜스 — 맵 갈래(바닥·데이터 버스·소켓·소품·포털·게이트). 아트 해상도 180×240, 정수 fillRect 만.
// paintStatic 은 한 번 구워 두고, paintDynamic 은 매 프레임 그 위에 덧그린다(fillRect ≤ 약 150).
(function () {
  "use strict";
  const COLS = 9, ROWS = 12, TS = 20, W = COLS * TS, H = ROWS * TS;

  // artdir 3절 팔레트
  const INK = ["#07060f", "#0e0c1c", "#17142b", "#231e3d", "#322b52", "#463d6b", "#5f5687"];
  const SL = ["#3a3f5c", "#545b7a", "#7880a0", "#a3abc4", "#cdd3e3", "#eef1f8"];
  const GOLD = ["#3b1d14", "#6e2f1c", "#a8492a", "#e0743a", "#f6a94a", "#ffd86b", "#fff2b8"];
  const RED = ["#2e0a1f", "#5c1230", "#9a1d3c", "#d8324a", "#ff5e5b", "#ff9a86"];
  const PINK = ["#3d1145", "#6e1f6e", "#a8329a", "#e050c0", "#ff8be0"];
  const GRN = ["#0b2422", "#124638", "#1c7a50", "#36b866", "#7ee87e", "#d4ffb0"];
  const CY = ["#0b1d3a", "#123a66", "#1a68a0", "#2aa6d6", "#6ee6ff", "#c8fbff"];
  const PUR = ["#1e0f3d", "#3a1a6b", "#6232b0", "#9a64f0", "#c9a4ff"];

  const DN = 1, DE = 2, DS = 4, DW = 8;
  const OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };

  function hash(x, y, s) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1440662683);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  const inGrid = (x, y) => x >= 0 && x < COLS && y >= 0 && y < ROWS;

  // ── 테마(키 = 맵 id) ──
  const baseSock = { plate: INK[3], plateHi: INK[5], plateLo: INK[1], hole: INK[1], holeSh: INK[0], holeLip: INK[4], rivet: SL[0], rivetHi: SL[2], cast: INK[0] };
  const themes = {
    dev: {
      fl: [INK[1], INK[2], INK[3]], seamHi: INK[3], seamLo: INK[1], det: [GRN[0], GRN[1], GRN[2]],
      bus: { base: GRN[0], sh: INK[0], wallHi: GRN[1], rail: GRN[2], railHi: GRN[3], slat: GRN[1], rimLo: INK[0], rimHi: INK[4] },
      acc: GRN, dash: GRN[4], dashTail: GRN[2], screen: GRN, sock: baseSock,
      props: ["monitor", "plant", "cables", "monitor", "plant"], propRate: 0.8,
    },
    staging: {
      fl: [INK[1], INK[2], INK[3]], seamHi: INK[3], seamLo: INK[1], det: [CY[0], CY[1], CY[2]],
      bus: { base: CY[0], sh: INK[0], wallHi: CY[1], rail: CY[2], railHi: CY[3], slat: CY[1], rimLo: INK[0], rimHi: INK[4] },
      acc: CY, dash: CY[4], dashTail: CY[2], screen: CY, sock: baseSock,
      props: ["crate", "crate", "monitor", "cables", "plant"], propRate: 0.7,
    },
    prod: {
      fl: [INK[2], INK[3], INK[4]], seamHi: INK[4], seamLo: INK[1], det: [INK[1], INK[2], SL[0]],
      bus: { base: CY[0], sh: INK[0], wallHi: CY[1], rail: SL[1], railHi: SL[2], slat: CY[1], rimLo: INK[0], rimHi: INK[5] },
      acc: CY, dash: CY[4], dashTail: CY[2], screen: CY,
      sock: { plate: INK[4], plateHi: INK[6], plateLo: INK[2], hole: INK[1], holeSh: INK[0], holeLip: INK[5], rivet: SL[1], rivetHi: SL[3], cast: INK[1] },
      props: ["rack", "rack", "ac", "rack"], propRate: 0.95,
    },
    warroom: {
      fl: [INK[1], INK[2], INK[3]], seamHi: INK[3], seamLo: INK[0], det: [INK[1], RED[0], RED[1]],
      bus: { base: RED[0], sh: INK[0], wallHi: RED[1], rail: RED[2], railHi: RED[3], slat: RED[1], rimLo: INK[0], rimHi: INK[4] },
      acc: RED, dash: GOLD[4], dashTail: GOLD[2], screen: RED, sock: baseSock,
      props: ["monitor", "beacon", "hazard", "monitor", "cables", "plant", "monitor"], propRate: 0.8,
    },
    release: {
      fl: [INK[2], INK[3], INK[4]], seamHi: INK[4], seamLo: INK[1], det: [INK[2], PUR[1], GOLD[1]],
      bus: { base: PUR[0], sh: INK[0], wallHi: PUR[1], rail: PUR[2], railHi: PUR[3], slat: PUR[1], rimLo: INK[0], rimHi: INK[5] },
      acc: PUR, dash: PUR[4], dashTail: PUR[2], screen: PUR,
      sock: { plate: INK[3], plateHi: INK[5], plateLo: INK[0], hole: INK[1], holeSh: INK[0], holeLip: INK[4], rivet: GOLD[1], rivetHi: GOLD[3], cast: INK[0] },
      props: ["pillar", "crystal", "pillar"], propRate: 1,
      grand: true,
    },
  };

  // ── 배치 계산(맵마다 한 번) ──
  const cache = new Map();
  function layout(map) {
    let L = cache.get(map);
    if (L) return L;
    const E = (typeof window !== "undefined" && window.TDEngine) || globalThis.TDEngine;
    const path = E.pathTiles(map), slots = E.slotsOf(map), slotSet = new Set(slots.map((s) => s + ""));
    const conn = new Map(), entries = [], gates = [], laneSeqs = [];
    const add = (x, y, b) => { if (inGrid(x, y)) { const k = x + "," + y; conn.set(k, (conn.get(k) || 0) | b); } };
    for (const lane of map.lanes) {
      const seq = []; // 화면 안 타일, 진행 순서
      let lastDir = 0;
      for (let i = 1; i < lane.length; i++) {
        let [x, y] = lane[i - 1];
        const [x1, y1] = lane[i], dx = Math.sign(x1 - x), dy = Math.sign(y1 - y);
        if (i === 1 && inGrid(x, y)) seq.push([x, y, 0]);
        while (x !== x1 || y !== y1) {
          const b = dx > 0 ? DE : dx < 0 ? DW : dy > 0 ? DS : DN;
          add(x, y, b);
          add(x + dx, y + dy, OPP[b]);
          x += dx; y += dy; lastDir = b;
          if (inGrid(x, y)) seq.push([x, y, OPP[b]]);
        }
      }
      laneSeqs.push(seq);
      const [ex, ey, from] = seq[0];
      if (!entries.some((e) => e.x === ex && e.y === ey)) entries.push({ x: ex, y: ey, side: from || DN });
      const [gx, gy] = seq[seq.length - 1];
      if (!gates.some((g) => g.x === gx && g.y === gy)) gates.push({ x: gx, y: gy, dir: lastDir, from: seq[seq.length - 1][2], prev: seq[seq.length - 2] });
    }
    const free = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const k = x + "," + y;
      if (!path.has(k) && !slotSet.has(k)) free.push([x, y]);
    }
    L = { path, slots, slotSet, conn, entries, gates, free, laneSeqs, props: null, polys: map.lanes.map((l) => E.lanePoly(l)), E };
    cache.set(map, L);
    return L;
  }

  // ── 3×5 글자(이름표: DEV / PROD) ──
  const FONT = {
    D: ["110", "101", "101", "101", "110"], E: ["111", "100", "110", "100", "111"], V: ["101", "101", "101", "101", "010"],
    P: ["110", "101", "110", "100", "100"], R: ["110", "101", "110", "101", "101"], O: ["010", "101", "101", "101", "010"],
  };

  // ── 소품 스프라이트(글자 격자). 팔레트는 테마에 따라 바뀐다 ──
  const SPR = {
    rack: [
      ".kkkkkkkkkk.",
      "khhhhhhhhhhk",
      "kllllllllllk",
      "kddddddddddk",
      "klbbbbbbbbmk",
      "klbgbcbbrbmk",
      "klzzzzzzzzmk",
      "klbbbbbbbbmk",
      "klbcbgbbbbmk",
      "klzzzzzzzzmk",
      "klbbbbbbbbmk",
      "klbgbbbrbbmk",
      "klzzzzzzzzmk",
      "klvvvvvvvvmk",
      "klzvzvzvzvmk",
      "kmmmmmmmmmmk",
      "kddddddddddk",
      ".kk......kk.",
    ],
    monitor: [
      ".kkkkkkkkkkkk.",
      "klllllllllllmk",
      "klssssssssssmk",
      "klsttttsuuusmk",
      "klsuuusstttsmk",
      "klsttsuuuussmk",
      "klsuutttsxssmk",
      "klssssssssssmk",
      "kmmmmmmmmmmmmk",
      ".kkkkkmmkkkkk.",
      "....kkmmkk....",
      "...kllmmmdk...",
      "...kkkkkkkk...",
    ],
    plant: [
      "...oooo...",
      "..oeecbo..",
      ".oeccccbo.",
      "oeccbcccbo",
      "occcbbcbbo",
      "ocbcbbbbao",
      ".obbabbao.",
      "..oaoaao..",
      "..kppppk..",
      "..kqqqrk..",
      "..kqqrrk..",
      "...kqrk...",
      "...kkkk...",
    ],
    crate: [
      ".kkkkkkkkkkkk.",
      "khhhhhhhhhhhhk",
      "khllllllllllhk",
      "kddddddddddddk",
      "kmrmmrmmrmmrnk",
      "kmrmmrmmrmmrnk",
      "kmrwwwwwwmmrnk",
      "kmrwtttwwmmrnk",
      "kmrwwwwwwmmrnk",
      "kmrmmrmmrmmrnk",
      "knnnnnnnnnnnnk",
      ".kkkkkkkkkkkk.",
    ],
    ac: [
      ".kkkkkkkkkkkk.",
      "khhhhhhhhhhhhk",
      "kllllllllllllk",
      "kddddddddddddk",
      "klmmmmmmmmmmnk",
      "klmbbbbbbbbmnk",
      "klbvbvvbvbvbnk",
      "klbbvbbvbbvbnk",
      "klbvbvvbvbvbnk",
      "klmbbbbbbbbmnk",
      "klmmmmmmmmgmnk",
      "knnnnnnnnnnnnk",
      ".kk........kk.",
    ],
    beacon: [
      "..kkkk..",
      ".krRRrk.",
      "krRwRrqk",
      "krRRrrqk",
      "kqrrrqqk",
      "kkkkkkkk",
      ".kmmmdk.",
      "..kmdk..",
      "..kmdk..",
      ".kmmmdk.",
      "klllmmdk",
      "kkkkkkkk",
    ],
    pillar: [
      ".kkkkkkkk.",
      "kGGGGGGGgk",
      "kgggggggfk",
      ".kpPPPqrk.",
      ".kpPrPqrk.",
      ".kpPrPqrk.",
      ".kpPrPqrk.",
      ".kpPPPqrk.",
      ".kpPrPqrk.",
      ".kpPrPqrk.",
      ".kpPrPqrk.",
      ".kpPPPqrk.",
      "kGGGGGGGgk",
      "kgggggggfk",
      "kkkkkkkkkk",
    ],
    crystal: [
      "....kk....",
      "...kepk...",
      "..keppqk..",
      ".keppPqqk.",
      "keepppqqrk",
      ".kpppqqrk.",
      "..kpqqrk..",
      "...kqrk...",
      "....kk....",
      "..........",
      "...kkkk...",
      "..kllmdk..",
      ".kllmmmdk.",
      ".kkkkkkkk.",
    ],
  };
  function propPal(kind, th) {
    const sc = th.screen;
    switch (kind) {
      case "rack": return { k: INK[0], h: SL[2], l: SL[1], d: SL[0], m: SL[0], b: INK[1], z: INK[3], v: INK[0], g: GRN[3], c: CY[3], r: RED[3] };
      case "monitor": return { k: INK[0], l: SL[1], m: SL[0], d: INK[3], s: sc[0], t: sc[3], u: sc[1], x: sc[4] };
      case "plant": return { o: GRN[0], a: GRN[1], b: GRN[2], c: GRN[3], e: GRN[4], k: GOLD[0], p: GOLD[3], q: GOLD[2], r: GOLD[1] };
      case "crate": return { k: INK[0], h: CY[2], l: CY[3], d: CY[0], m: CY[1], r: CY[2], n: CY[0], w: SL[3], t: INK[3] };
      case "ac": return { k: INK[0], h: SL[3], l: SL[2], d: SL[0], m: SL[1], n: SL[0], b: INK[1], v: SL[0], g: GRN[3] };
      case "beacon": return { k: INK[0], r: RED[3], R: RED[4], w: RED[5], q: RED[2], m: SL[1], d: SL[0], l: SL[2] };
      case "pillar": return { k: INK[0], G: GOLD[4], g: GOLD[2], f: GOLD[1], p: PUR[4], P: PUR[3], q: PUR[2], r: PUR[1] };
      case "crystal": return { k: INK[0], e: CY[5], p: CY[3], P: CY[4], q: CY[2], r: CY[1], l: PUR[2], m: PUR[1], d: PUR[0] };
    }
    return {};
  }

  // 소품 배치(맵마다 고정)
  // 큰 문 자리: 게이트 위·좌·우 세 칸이 비어 있으면(엔진 deco) 게이트를 3칸 크기로 키운다
  function grandTiles(L, th) {
    if (!th.grand) return null;
    const g = L.gates[0], ts = [[g.x, g.y - 1], [g.x - 1, g.y], [g.x + 1, g.y]];
    return ts.every(([x, y]) => inGrid(x, y) && !L.slotSet.has(x + "," + y) && !L.path.has(x + "," + y)) ? ts : null;
  }
  function planProps(map, L, th) {
    if (L.props && L.propsTheme === th) return L.props;
    const gt = grandTiles(L, th) || [];
    const seed = map.id.length * 131 + map.id.charCodeAt(0);
    const out = [];
    for (const [x, y] of L.free) {
      if (gt.some(([a, b]) => a === x && b === y)) continue;
      if (hash(x, y, seed) > th.propRate) { out.push({ kind: hash(x, y, seed + 9) < 0.5 ? "bolts" : "none", x, y }); continue; }
      let kind = th.props[Math.floor(hash(x, y, seed + 3) * th.props.length)];
      const sp = SPR[kind];
      const o = { kind, x, y };
      if (sp) {
        o.w = sp[0].length; o.h = sp.length;
        o.px = x * TS + ((TS - o.w) >> 1) + (hash(x, y, seed + 5) < 0.5 ? -1 : 1) * (o.w < 12 ? 2 : 0);
        o.py = y * TS + TS - 2 - o.h;
        if (o.h > 16) o.py = y * TS + TS - 1 - o.h;
        o.leds = [];
        sp.forEach((row, j) => { for (let i = 0; i < row.length; i++) if ((kind === "rack" && "gcr".includes(row[i])) || (kind === "monitor" && row[i] === "x") || (kind === "ac" && row[i] === "g")) o.leds.push([o.px + i, o.py + j, row[i]]); });
      }
      out.push(o);
    }
    L.props = out; L.propsTheme = th;
    return out;
  }

  // ── 정적 그림 ──
  function paintStatic(ctx, map, theme) {
    const th = theme || themes[map.id] || themes.dev;
    const L = layout(map);
    const buf = new Array(W * H);
    const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H && c) buf[y * W + x] = c; };
    const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); };
    const seed = map.id.charCodeAt(0) * 7 + map.id.length;

    // 1) 바닥 타일: 변형 4종 + 이음매 + 잔결
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
      const ox = tx * TS, oy = ty * TS, v = Math.floor(hash(tx, ty, seed) * 4);
      const base = v === 2 ? th.fl[0] : th.fl[1];
      rect(ox, oy, TS, TS, base);
      for (let j = 0; j < TS; j++) for (let i = 0; i < TS; i++) {
        const r = hash(ox + i, oy + j, seed + 1);
        if (r < 0.035) put(ox + i, oy + j, v === 2 ? th.fl[1] : th.fl[0]);
        else if (r > 0.985) put(ox + i, oy + j, th.fl[2]);
      }
      if (ty % 2 === 0) rect(ox, oy, TS, 1, th.seamHi); else rect(ox, oy + TS - 1, TS, 1, th.seamLo);
      if (tx % 2 === 0) rect(ox, oy, 1, TS, th.seamHi); else rect(ox + TS - 1, oy, 1, TS, th.seamLo);
      floorDetail(map.id, put, rect, ox, oy, v, th, hash(tx, ty, seed + 2));
    }

    // 2) 데이터 버스 홈(픽셀 마스크 → 벽 그림자·턱 하이라이트가 꺾임·합류·교차에서 저절로 맞는다)
    const ch = new Uint8Array(W * H);
    const chr = (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) ch[(y + j) * W + x + i] = 1; };
    const M = 2;
    for (const [k, mask] of L.conn) {
      const [tx, ty] = k.split(",").map(Number), ox = tx * TS, oy = ty * TS;
      chr(ox + M, oy + M, TS - 2 * M, TS - 2 * M);
      if (mask & DN) chr(ox + M, oy, TS - 2 * M, M);
      if (mask & DS) chr(ox + M, oy + TS - M, TS - 2 * M, M);
      if (mask & DW) chr(ox, oy + M, M, TS - 2 * M);
      if (mask & DE) chr(ox + TS - M, oy + M, M, TS - 2 * M);
    }
    const isC = (x, y) => ch[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
    const B = th.bus;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (isC(x, y)) {
        let c = B.base;
        if (!isC(x, y + 1) || !isC(x + 1, y)) c = B.wallHi;
        if (!isC(x, y - 1) || !isC(x - 1, y)) c = B.sh;
        else if (!isC(x, y - 2) || !isC(x - 2, y)) c = B.sh;
        buf[y * W + x] = c;
      } else {
        if (isC(x, y + 1) || isC(x + 1, y)) buf[y * W + x] = B.rimLo;
        else if (isC(x, y - 1) || isC(x - 1, y)) buf[y * W + x] = B.rimHi;
      }
    }
    // 레일(진행 방향 두 줄)·살·교차판
    const A = 5, Bb = 14;
    const putC = (x, y, c) => { if (ch[y * W + x]) put(x, y, c); };
    const hl = (ox, oy, x0, x1, y, c) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) putC(ox + x, oy + y, c); };
    const vl = (ox, oy, x, y0, y1, c) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) putC(ox + x, oy + y, c); };
    for (const [k, mask] of L.conn) {
      const [tx, ty] = k.split(",").map(Number), ox = tx * TS, oy = ty * TS;
      const n = (mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1) + ((mask >> 3) & 1);
      const R = B.rail, RH = B.railHi;
      if (mask === (DN | DS)) {
        for (let y = 0; y < TS; y++) { putC(ox + A, oy + y, y % 5 === 2 ? RH : R); putC(ox + Bb, oy + y, y % 5 === 2 ? RH : R); }
        for (let y = 2; y < TS; y += 5) hl(ox, oy, A + 2, Bb - 2, y, B.slat);
      } else if (mask === (DE | DW)) {
        for (let x = 0; x < TS; x++) { putC(ox + x, oy + A, x % 5 === 2 ? RH : R); putC(ox + x, oy + Bb, x % 5 === 2 ? RH : R); }
        for (let x = 2; x < TS; x += 5) vl(ox, oy, x, A + 2, Bb - 2, B.slat);
      } else if (n === 2) {
        const V = mask & (DN | DS), Hd = mask & (DE | DW);
        const vEdge = V === DN ? 0 : TS - 1, hEdge = Hd === DE ? TS - 1 : 0;
        const xo = Hd === DE ? A : Bb, xi = Hd === DE ? Bb : A;
        const yo = V === DN ? Bb : A, yi = V === DN ? A : Bb;
        vl(ox, oy, xo, vEdge, yo, R); hl(ox, oy, xo, hEdge, yo, R);
        vl(ox, oy, xi, vEdge, yi, R); hl(ox, oy, xi, hEdge, yi, R);
        putC(ox + xo, oy + yo, RH); putC(ox + xi, oy + yi, RH);
      } else {
        // 합류·교차·막다른 끝: 링 + 가운데 칩
        hl(ox, oy, A, Bb, A, R); hl(ox, oy, A, Bb, Bb, R); vl(ox, oy, A, A, Bb, R); vl(ox, oy, Bb, A, Bb, R);
        for (const [x, y] of [[A, A], [Bb, A], [A, Bb], [Bb, Bb]]) putC(ox + x, oy + y, RH);
        if (mask & DN) { vl(ox, oy, A, 0, A, R); vl(ox, oy, Bb, 0, A, R); }
        if (mask & DS) { vl(ox, oy, A, Bb, TS - 1, R); vl(ox, oy, Bb, Bb, TS - 1, R); }
        if (mask & DW) { hl(ox, oy, 0, A, A, R); hl(ox, oy, 0, A, Bb, R); }
        if (mask & DE) { hl(ox, oy, Bb, TS - 1, A, R); hl(ox, oy, Bb, TS - 1, Bb, R); }
        rect(ox + 8, oy + 8, 4, 4, B.rail); rect(ox + 8, oy + 8, 3, 1, B.railHi); rect(ox + 8, oy + 8, 1, 3, B.railHi); rect(ox + 9, oy + 9, 2, 2, INK[0]);
      }
    }
    // 게이트 앞 경고 띠
    for (const g of L.gates) {
      if (!g.prev) continue;
      const [px, py] = g.prev, ox = px * TS, oy = py * TS, side = g.from; // gate 에서 본 prev 방향의 반대 = prev 에서 본 gate 방향
      for (let j = 0; j < TS; j++) for (let i = 0; i < TS; i++) {
        const dEdge = side === DN ? TS - 1 - j : side === DS ? j : side === DW ? TS - 1 - i : i; // gate 쪽 변까지 거리
        // side = gate 타일에 들어올 때의 변: N 이면 prev 는 위 → gate 쪽 변은 prev 의 아래
        if (dEdge <= 3 && ch[(oy + j) * W + ox + i]) put(ox + i, oy + j, ((ox + i + oy + j) >> 1) & 1 ? GOLD[4] : INK[1]);
      }
    }

    // 3) 소켓(배치 칸): 바닥에 살짝 새긴 표시 — 네 귀 꺾쇠 + 가운데 점. 바닥 질감이 그대로 보인다.
    //    또렷한 표시는 paintDynamic 의 state.highlightSlots 가 맡는다(짓기 칸을 고를 때만)
    const mk = th.fl[2], mkSh = th.fl[0];
    for (const [tx, ty] of L.slots) {
      const ox = tx * TS, oy = ty * TS;
      for (const [cx, cy, sx, sy] of [[3, 3, 1, 1], [16, 3, -1, 1], [3, 16, 1, -1], [16, 16, -1, -1]]) {
        // 새김: 밝은 선 + 오른쪽 아래 1px 어두운 홈
        for (let i = 0; i < 3; i++) { put(ox + cx + sx * i + 1, oy + cy + 1, mkSh); put(ox + cx + 1, oy + cy + sy * i + 1, mkSh); }
        for (let i = 0; i < 3; i++) { put(ox + cx + sx * i, oy + cy, mk); put(ox + cx, oy + cy + sy * i, mk); }
      }
      put(ox + 9, oy + 9, mkSh); put(ox + 10, oy + 9, mkSh); put(ox + 9, oy + 10, mkSh); put(ox + 10, oy + 10, mk);
    }

    // 4) 소품
    for (const p of planProps(map, L, th)) {
      const ox = p.x * TS, oy = p.y * TS;
      if (p.kind === "none") continue;
      if (p.kind === "bolts") {
        for (const [rx, ry] of [[4, 4], [15, 4], [4, 15], [15, 15]]) { put(ox + rx, oy + ry, th.fl[2]); put(ox + rx + 1, oy + ry + 1, INK[0]); }
        continue;
      }
      if (p.kind === "cables") { cablesProp(put, ox, oy, hash(p.x, p.y, 77)); continue; }
      if (p.kind === "hazard") {
        for (let j = 3; j < 17; j++) for (let i = 3; i < 17; i++) put(ox + i, oy + j, ((i + j) >> 2) & 1 ? GOLD[3] : INK[1]);
        rect(ox + 2, oy + 2, 16, 1, INK[0]); rect(ox + 2, oy + 17, 16, 1, INK[3]); rect(ox + 2, oy + 2, 1, 16, INK[0]); rect(ox + 17, oy + 2, 1, 16, INK[3]);
        continue;
      }
      const sp = SPR[p.kind], pal = propPal(p.kind, th);
      // 그림자: 오른쪽 아래 1px + 바닥 접지
      for (let j = 0; j < sp.length; j++) for (let i = 0; i < sp[j].length; i++) if (sp[j][i] !== ".") { put(p.px + i + 1, p.py + j + 1, INK[0]); put(p.px + i + 2, p.py + j + 1, INK[0]); }
      for (let j = 0; j < sp.length; j++) for (let i = 0; i < sp[j].length; i++) { const c = sp[j][i]; if (c !== ".") put(p.px + i, p.py + j, pal[c]); }
    }

    // 5) 포털(시작) — 들어오는 변에 이름표 「DEV」
    for (const e of L.entries) paintPortal(put, e, th);
    // 6) 게이트(끝) — 「PROD」 서버
    for (const g of L.gates) paintGate(put, g, th, grandTiles(L, th));

    // 내보내기: 같은 색 가로 줄을 묶어 fillRect
    for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < W) {
        const c = buf[y * W + x];
        let e = x + 1;
        while (e < W && buf[y * W + e] === c) e++;
        if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, e - x, 1); }
        x = e;
      }
    }
  }

  function floorDetail(id, put, rect, ox, oy, v, th, r) {
    const d = th.det;
    if (v === 2) { // 어두운 판 + 네 귀 나사
      for (const [x, y] of [[2, 2], [17, 2], [2, 17], [17, 17]]) put(ox + x, oy + y, th.fl[2]);
      return;
    }
    if (v === 3) { // 통풍구
      for (let y = 6; y <= 13; y += 2) { rect(ox + 5, oy + y, 10, 1, th.fl[0]); rect(ox + 5, oy + y + 1, 10, 1, th.seamHi); }
      return;
    }
    if (id === "dev") {
      if (v === 0) for (const [x, y] of [[5, 5], [14, 5], [5, 14], [14, 14]]) put(ox + x, oy + y, d[1]);
      else { // 회로 선
        const yy = r < 0.5 ? 6 : 13;
        rect(ox + 1, oy + yy, 8, 1, d[0]); rect(ox + 8, oy + Math.min(yy, 10), 1, Math.abs(yy - 10) + 1, d[0]); rect(ox + 8, oy + 10, 11, 1, d[0]);
        rect(ox + 7, oy + yy - 1, 3, 3, d[1]); put(ox + 8, oy + yy, d[2]);
      }
    } else if (id === "staging") {
      if (v === 0) for (let x = 2; x < 18; x += 5) rect(ox + x, oy + 10, 3, 1, d[1]);
      else { // 진행 꺾쇠(파이프라인)
        for (const cx of [5, 11]) for (let k = 0; k < 3; k++) { put(ox + cx + k, oy + 7 + k, d[1]); put(ox + cx + k, oy + 13 - k, d[1]); }
      }
    } else if (id === "prod") { // 이중 마루 구멍판
      for (let y = 4; y < 17; y += 4) for (let x = 4; x < 17; x += 4) { put(ox + x, oy + y, th.fl[0]); put(ox + x + 1, oy + y + 1, th.seamHi); }
    } else if (id === "warroom") {
      if (v === 0) for (let i = 0; i < 6; i++) put(ox + 3 + Math.floor(r * 13 * (i + 1)) % 14, oy + 3 + Math.floor(r * 7 * (i + 3)) % 14, d[1]);
      else { rect(ox + 3, oy + 9, 14, 2, th.fl[0]); for (let x = 4; x < 16; x += 3) put(ox + x, oy + 9, d[2]); } // 바닥 배선 홈
    } else if (id === "release") {
      if (v === 0) { put(ox + 10, oy + 8, d[2]); put(ox + 9, oy + 9, d[2]); put(ox + 11, oy + 9, d[2]); put(ox + 10, oy + 10, d[2]); put(ox + 10, oy + 9, GOLD[2]); }
      else for (let y = 3; y < 17; y += 2) for (let x = 3 + (y & 2); x < 17; x += 4) put(ox + x, oy + y, d[1]);
    }
  }

  function cablesProp(put, ox, oy, r) {
    const cols = [[CY[2], CY[1]], [GOLD[3], GOLD[1]], [PINK[2], PINK[1]]];
    const base = 8 + Math.floor(r * 4);
    for (let n = 0; n < 3; n++) {
      const [c, cd] = cols[n];
      for (let x = 0; x < TS; x++) {
        const y = base + n * 2 + Math.round(Math.sin((x + n * 3 + r * 10) / 3.2) * 1.5);
        put(ox + x, oy + y + 1, INK[0]);
        put(ox + x, oy + y, (x + n) % 4 === 0 ? cd : c);
      }
    }
    // 묶음 띠
    for (let j = base - 2; j < base + 8; j++) { put(ox + 9, oy + j, SL[1]); put(ox + 10, oy + j, SL[0]); }
  }

  // 국소 좌표(u: 변을 따라, v: 안쪽 깊이) → 맵 좌표
  function loc(side, ox, oy, u, v) {
    if (side === DN) return [ox + u, oy + v];
    if (side === DS) return [ox + u, oy + TS - 1 - v];
    if (side === DW) return [ox + v, oy + u];
    return [ox + TS - 1 - v, oy + u];
  }
  function paintPortal(put, e, th) {
    const ox = e.x * TS, oy = e.y * TS, side = e.side, a = th.acc;
    const P = (u, v, c) => { const [x, y] = loc(side, ox, oy, u, v); put(x, y, c); };
    // 에너지 막(버스 위)
    for (let v = 6; v < 16; v++) for (let u = 3; u < 17; u++) P(u, v, v % 3 === 0 ? a[2] : (u + v) % 2 ? a[1] : a[0]);
    // 기둥
    for (const u0 of [0, 16]) for (let v = 6; v < 18; v++) for (let u = u0; u < u0 + 4; u++) {
      const edge = u === u0 || u === u0 + 3 || v === 17;
      P(u, v, edge ? INK[0] : u === u0 + 1 ? SL[2] : SL[1]);
    }
    for (const u of [3, 16]) for (let v = 6; v < 17; v++) P(u, v, a[3]);
    for (const u0 of [0, 16]) { P(u0 + 1, 15, a[4]); P(u0 + 2, 15, a[3]); }
    // 문 위 이름판
    for (let v = 0; v < 7; v++) for (let u = 0; u < TS; u++) {
      const edge = v === 0 || v === 6 || u === 0 || u === TS - 1;
      P(u, v, edge ? INK[0] : v === 1 ? SL[1] : INK[1]);
    }
    for (let u = 1; u < TS - 1; u++) P(u, 5, INK[2]);
    const vert = side === DN || side === DS;
    const txt = "DEV";
    if (vert) {
      txt.split("").forEach((ch, i) => FONT[ch].forEach((row, j) => { for (let k = 0; k < 3; k++) if (row[k] === "1") put(ox + 4 + i * 4 + k, (side === DN ? oy + 1 : oy + TS - 6) + j, a[4]); }));
    } else {
      const x0 = side === DW ? ox + 2 : ox + TS - 5;
      txt.split("").forEach((ch, i) => FONT[ch].forEach((row, j) => { for (let k = 0; k < 3; k++) if (row[k] === "1") put(x0 + k, oy + 1 + i * 6 + j, a[4]); }));
    }
  }

  function gateRamp(th) {
    return th.grand
      ? { k: INK[0], top: PUR[4], top2: PUR[3], edge: PUR[1], body: PUR[2], lit: PUR[3], dark: PUR[1], trim: GOLD[4], trimD: GOLD[2] }
      : { k: INK[0], top: SL[3], top2: SL[2], edge: SL[0], body: SL[1], lit: SL[2], dark: SL[0], trim: GOLD[3], trimD: GOLD[1] };
  }
  function paintGate(put, g, th, grand) {
    const ox = g.x * TS, oy = g.y * TS, c = gateRamp(th);
    const r = (x, y, w, h, col) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(ox + x + i, oy + y + j, col); };
    // 바닥 그림자
    r(2, 19, 18, 1, INK[0]); r(19, 2, 1, 18, INK[0]);
    if (grand) { // 3칸 큰 문: 위로 탑, 좌우로 기둥
      // 좌우 기둥(옆 칸 안쪽), 문과 금 들보로 잇는다
      for (const [x0, flip] of [[-12, 0], [22, 1]]) {
        r(x0 + 1, 19, 10, 1, INK[0]);
        r(x0, -8, 10, 27, c.k);
        r(x0 + 1, -7, 8, 25, c.body); r(x0 + 1, -7, 1, 25, c.lit); r(x0 + 8, -7, 1, 25, c.dark);
        for (let y = -3; y < 16; y += 4) r(x0 + 3, y, 4, 1, c.dark);
        r(x0 + 3, -1, 4, 13, c.dark); r(x0 + 4, 0, 2, 11, PUR[0]); // 에너지 홈(빛은 paintDynamic)
        r(x0 - 1, -10, 12, 3, c.k); r(x0, -9, 10, 1, c.trim); r(x0, -8, 10, 1, c.trimD);
        r(x0 - 1, 16, 12, 3, c.k); r(x0, 16, 10, 1, c.trim); r(x0, 17, 10, 1, c.trimD);
        r(x0 + 3, -13, 4, 3, c.k); r(x0 + 4, -12, 2, 2, GOLD[4]); put(ox + x0 + 4, oy - 12, GOLD[6]);
        r(flip ? 20 : -2, 2, 2, 3, c.k); r(flip ? 20 : -2, 3, 2, 1, c.trim);
      }
      // 위 탑(위 칸): 뾰족 지붕 + 금 문장 + 내린 창살
      r(0, -21, 20, 22, c.k);
      r(1, -20, 18, 20, c.body); r(1, -20, 1, 20, c.lit); r(18, -20, 1, 20, c.dark);
      for (let i = 0; i < 5; i++) r(5 + i, -26 + i, 10 - 2 * i, 1, c.k);
      r(3, -22, 14, 1, c.k); r(4, -22, 12, 1, c.trimD); r(5, -23, 10, 1, c.trim); r(7, -24, 6, 1, c.trim); r(9, -25, 2, 1, GOLD[6]);
      r(5, -17, 10, 13, c.k); r(6, -16, 8, 12, INK[0]);
      for (const x of [7, 9, 11]) r(x, -16, 1, 12, PUR[1]);
      r(6, -12, 8, 1, PUR[1]);
      r(5, -18, 10, 1, c.trim); r(4, -17, 1, 14, c.trimD); r(15, -17, 1, 14, c.trimD);
      r(8, -20, 4, 2, GOLD[4]); r(9, -20, 2, 1, GOLD[6]);
      r(1, -2, 18, 2, c.trimD); r(1, -2, 18, 1, c.trim);
    } else if (th.grand) { // 큰 문: 위로 왕관이 솟는다
      r(1, -3, 18, 4, c.k);
      for (const x of [3, 9, 15]) { r(x, -5, 2, 3, c.k); put(ox + x, oy - 4, c.trim); put(ox + x + 1, oy - 4, c.trimD); put(ox + x, oy - 3, c.trimD); }
      r(2, -2, 16, 2, c.trimD); r(2, -2, 16, 1, c.trim);
    }
    r(0, 0, 20, 19, c.k);
    r(1, 1, 18, 2, c.top); r(1, 1, 1, 2, c.top2); r(1, 3, 18, 1, c.edge);
    r(1, 4, 18, 14, c.body); r(1, 4, 1, 14, c.lit); r(18, 4, 1, 14, c.dark); r(1, 17, 18, 1, c.dark);
    // 화면 베젤(화면 안쪽 4..15 × 6..9 는 paintDynamic 이 칠한다)
    r(3, 5, 14, 6, INK[0]); r(4, 6, 12, 4, INK[1]);
    // 이름판 PROD
    r(1, 11, 18, 7, c.k); r(2, 12, 16, 5, INK[1]);
    "PROD".split("").forEach((ch, i) => FONT[ch].forEach((row, j) => { for (let k = 0; k < 3; k++) if (row[k] === "1") put(ox + 3 + i * 4 + k, oy + 12 + j, c.trim); }));
    // 장식 테
    r(1, 3, 18, 1, c.trimD); put(ox + 1, oy + 3, c.trim);
    // 꼭대기 램프 둘(색은 paintDynamic)
    r(4, 1, 2, 1, INK[0]); r(14, 1, 2, 1, INK[0]);
  }

  // ── 매 프레임 덧그림 ──
  let glowCv = null, glowKey = "";
  function socketGlow(map, L, towers) {
    const occ = new Set((towers || []).map((t) => t.x + "," + t.y));
    const key = map.id + "|" + L.slots.length + "|" + [...occ].sort().join(";");
    if (glowCv && glowKey === key) return glowCv;
    if (!glowCv) {
      if (typeof document !== "undefined") { glowCv = document.createElement("canvas"); glowCv.width = W; glowCv.height = H; }
      else if (typeof OffscreenCanvas !== "undefined") glowCv = new OffscreenCanvas(W, H);
      else return null;
    }
    const g = glowCv.getContext("2d");
    g.clearRect(0, 0, W, H);
    for (const [x, y] of L.slots) {
      if (occ.has(x + "," + y)) continue;
      const ox = x * TS, oy = y * TS;
      g.globalAlpha = 0.35; g.fillStyle = CY[1]; g.fillRect(ox + 4, oy + 4, 12, 12); g.globalAlpha = 1; // 칸 안 옅은 바탕(맥동 알파가 곱해진다)
      g.fillStyle = CY[4];
      for (const [cx, cy, sx, sy] of [[2, 2, 1, 1], [17, 2, -1, 1], [2, 17, 1, -1], [17, 17, -1, -1]]) {
        g.fillRect(sx > 0 ? ox + cx : ox + cx - 3, oy + cy, 4, 1);
        g.fillRect(ox + cx, sy > 0 ? oy + cy : oy + cy - 3, 1, 4);
      }
      g.fillStyle = CY[5]; g.fillRect(ox + 9, oy + 9, 2, 2);
    }
    glowKey = key;
    return glowCv;
  }

  function paintDynamic(ctx, map, theme, t, state) {
    const th = theme || themes[map.id] || themes.dev;
    const L = layout(map), st = state || {}, reduced = !!st.reduced;
    const props = planProps(map, L, th);
    const fr = (x, y, w, h) => ctx.fillRect(x, y, w, h);
    ctx.save();

    // 1) 짓기 칸 고르는 중이면 빈 소켓을 또렷하게(구운 한 장, 1:1) + 고른 칸은 금 테
    if (st.highlightSlots) {
      const gc = socketGlow(map, L, st.towers);
      if (gc) {
        ctx.globalAlpha = reduced ? 0.85 : 0.6 + 0.35 * (0.5 + 0.5 * Math.sin(t * 4));
        ctx.drawImage(gc, 0, 0);
        ctx.globalAlpha = 1;
      }
    }
    if (st.selected) {
      const ox = st.selected[0] * TS, oy = st.selected[1] * TS;
      ctx.fillStyle = GOLD[5];
      fr(ox + 1, oy + 1, 18, 1); fr(ox + 1, oy + 18, 18, 1); fr(ox + 1, oy + 2, 1, 16); fr(ox + 18, oy + 2, 1, 16);
      ctx.fillStyle = GOLD[3];
      fr(ox + 2, oy + 2, 16, 1); fr(ox + 2, oy + 17, 16, 1); fr(ox + 2, oy + 3, 1, 14); fr(ox + 17, oy + 3, 1, 14);
    }

    // 2) 버스 위 흐르는 빛(진행 방향). 합류 뒤 겹치는 구간은 앞 길만 그린다
    const gateKeys = new Set(L.gates.map((g) => g.x + "," + g.y));
    const seen = new Set();
    const speed = 1.4, gap = 1;
    L.polys.forEach((poly, li) => {
      const mine = new Set(L.laneSeqs[li].map(([x, y]) => x + "," + y));
      const off = ((t * speed) % gap + gap) % gap;
      for (let d = off; d < poly.total; d += gap) {
        const p = L.E.posAt(poly, d), tx = Math.floor(p[0]), ty = Math.floor(p[1]), k = tx + "," + ty;
        if (!inGrid(tx, ty) || gateKeys.has(k) || seen.has(k)) continue;
        const q = L.E.posAt(poly, Math.max(0, d - 0.16));
        const hx = Math.round(p[0] * TS) - 1, hy = Math.round(p[1] * TS) - 1;
        const bx = Math.round(q[0] * TS) - 1, by = Math.round(q[1] * TS) - 1;
        ctx.fillStyle = th.dashTail; fr(Math.min(hx, bx), Math.min(hy, by), Math.abs(hx - bx) + 2, Math.abs(hy - by) + 2);
        ctx.fillStyle = th.dash; fr(hx, hy, 2, 2);
      }
      for (const k of mine) seen.add(k);
    });

    // 3) 포털 막의 물결
    for (const e of L.entries) {
      const ox = e.x * TS, oy = e.y * TS, v = 6 + Math.floor(t * 9) % 10;
      const [x0, y0] = loc(e.side, ox, oy, 3, v), [x1, y1] = loc(e.side, ox, oy, 16, v);
      ctx.fillStyle = th.acc[4]; ctx.globalAlpha = 0.55;
      fr(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) + 1, Math.abs(y1 - y0) + 1);
      ctx.globalAlpha = 1;
    }

    // 4) 게이트 화면: gateFrac 1 → 초록, 낮으면 빨강 깜빡임
    const f = st.gateFrac == null ? 1 : Math.max(0, Math.min(1, st.gateFrac));
    const ramp = f > 0.66 ? GRN : f > 0.33 ? GOLD.slice(1) : RED;
    const flick = f <= 0.33 && !reduced && hash(Math.floor(t * 10), 3, 9) < 0.35;
    for (const g of L.gates) {
      const ox = g.x * TS, oy = g.y * TS;
      ctx.fillStyle = flick ? INK[1] : ramp[1]; fr(ox + 4, oy + 6, 12, 4);
      const bw = f > 0 ? Math.max(1, Math.round(12 * f)) : 0;
      ctx.fillStyle = flick ? ramp[2] : ramp[3]; fr(ox + 4, oy + 7, bw, 2);
      ctx.fillStyle = ramp[4]; fr(ox + 4, oy + 7, bw, 1);
      if (!reduced) { ctx.globalAlpha = 0.35; ctx.fillStyle = ramp[4]; fr(ox + 4, oy + 6 + (Math.floor(t * 6) % 4), 12, 1); ctx.globalAlpha = 1; }
      const on = Math.floor(t * 2) % 2 === 0;
      ctx.fillStyle = on ? ramp[3] : ramp[1]; fr(ox + 4, oy + 1, 2, 1);
      ctx.fillStyle = on ? ramp[1] : ramp[3]; fr(ox + 14, oy + 1, 2, 1);
      // 화면 빛 번짐(가산)
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = flick ? 0.05 : 0.14; ctx.fillStyle = ramp[3];
      fr(ox + 2, oy + 4, 16, 8); fr(ox + 3, oy + 3, 14, 10);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }

    // 큰 문 기둥의 에너지 홈
    if (grandTiles(L, th)) {
      const g = L.gates[0], ox = g.x * TS, oy = g.y * TS, h = 11 - (Math.floor(t * 8) % 12);
      for (const x0 of [-12, 22]) {
        ctx.fillStyle = PUR[3]; fr(ox + x0 + 4, oy + 0, 2, 11);
        if (!reduced && h >= 0) { ctx.fillStyle = PUR[4]; fr(ox + x0 + 4, oy + h, 2, 2); }
      }
    }

    // 5) 테마 분위기
    const pal = { g: GRN, c: CY, r: RED, x: th.screen };
    let beaconOn = false;
    props.forEach((p, i) => {
      if (p.leds && p.leds.length) {
        for (let j = 0; j < p.leds.length; j++) {
          const [x, y, ch] = p.leds[j];
          if (ch === "x") { if (Math.floor(t * 2.5 + i) % 2) { ctx.fillStyle = th.screen[0]; fr(x, y, 1, 1); } continue; }
          const on = reduced ? true : hash(i * 13 + j, Math.floor(t * (3 + (j % 3)) + j * 0.37), 5) > 0.3;
          const ramp2 = pal[ch];
          if (!on) { ctx.fillStyle = ramp2[1]; fr(x, y, 1, 1); }
          else if (hash(i, j, Math.floor(t * 8)) > 0.8) { ctx.fillStyle = ramp2[4]; fr(x, y, 1, 1); }
        }
      }
      if (p.kind === "beacon") {
        const on = reduced ? true : Math.floor(t * 1.6 + i * 0.5) % 2 === 0;
        beaconOn = beaconOn || on;
        if (!on) { ctx.fillStyle = RED[1]; fr(p.px + 2, p.py + 1, 4, 4); }
        else if (!reduced) {
          ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = RED[3];
          ctx.globalAlpha = 0.18; fr(p.px - 3, p.py - 2, 14, 9);
          ctx.globalAlpha = 0.12; fr(p.px - 6, p.py, 20, 5);
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
        }
      }
      if (p.kind === "pillar" || p.kind === "crystal") {
        const ph = (t * 0.8 + i * 0.37) % 1;
        if (p.kind === "pillar") { ctx.fillStyle = GOLD[6]; fr(p.px + 1 + Math.floor(ph * 8), p.py + 1, 1, 1); }
        else if (!reduced) { const yy = Math.round(Math.sin(t * 2 + i) * 1); ctx.fillStyle = CY[5]; fr(p.px + 3, p.py + 3 + yy, 1, 1); ctx.globalAlpha = 0.25; ctx.fillStyle = CY[3]; fr(p.px + 1, p.py + 1, 8, 7); ctx.globalAlpha = 1; }
      }
    });
    // 장애 대응실: 경광등이 켜질 때 방 전체가 아주 옅게 붉어진다
    if (map.id === "warroom" && beaconOn && !reduced) { ctx.globalAlpha = 0.045; ctx.fillStyle = RED[3]; fr(0, 0, W, H); ctx.globalAlpha = 1; }

    ctx.restore();
  }

  // ── 비네트 + 주사선 ──
  let scanPat = null;
  function paintVignette(ctx, opts) {
    const o = opts || {};
    ctx.save();
    ctx.fillStyle = INK[0];
    for (let i = 0; i < 6; i++) { ctx.globalAlpha = 0.2 * (1 - i / 6); ctx.fillRect(0, i * 2, W, 2); }
    for (let i = 0; i < 10; i++) { ctx.globalAlpha = 0.03 + 0.03 * i; ctx.fillRect(0, H - 40 + i * 4, W, 4); }
    for (let i = 0; i < 4; i++) { ctx.globalAlpha = 0.16 * (1 - i / 4); ctx.fillRect(i, 0, 1, H); ctx.fillRect(W - 1 - i, 0, 1, H); }
    if (o.scanlines !== false) {
      if (!scanPat && typeof document !== "undefined") {
        const c = document.createElement("canvas"); c.width = 1; c.height = 2;
        const x = c.getContext("2d"); x.fillStyle = INK[0]; x.fillRect(0, 1, 1, 1);
        scanPat = ctx.createPattern(c, "repeat");
      }
      if (scanPat) { ctx.globalAlpha = o.scanAlpha == null ? 0.07 : o.scanAlpha; ctx.fillStyle = scanPat; ctx.fillRect(0, 0, W, H); }
    }
    ctx.restore();
  }

  window.TDArt.map = { W, H, TS, themes, paintStatic, paintDynamic, paintVignette, layout };
})();
