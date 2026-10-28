// @ts-nocheck — 디자인 세션 정본 docs/lab-surv-pocha-icons.js 를 그대로 옮긴 것(tmp/lab-surv/sync-src.sh).
/* 포장마차 사수 — 레벨업 카드 아이콘 18종. 그림체는 도깨비 퇴치 카드 아이콘(docs/lab-surv-goblin-icons.js)과 같고,
 * 색은 docs/lab-surv-coco-hd-artdir.md 3절 표에서만 — 비 오는 밤 포장마차: 어묵·붕어빵·호떡은 흙·털 갈색과 놋쇠 금, 솥·국자는 크롬, 방수포는 칫솔 파랑.
 * 카드 뜻: docs/lab-surv-pocha.js. 술(소주병·잔)·상표·글자는 그리지 않는다 — 메뉴판도 음식 그림만.
 * iconURL(key, px) → 투명 배경 정사각 PNG data URL(기본 84 = 42 CSS × DPR2). 처음 부를 때 구워 캐시. node 에선 "".
 * 좌표: 칸 하나 = 21 단위, 가운데 (0,0), 외곽 포함 ±8.8 안(여백 8 %). 외곽 0.8 단위. 글자 없음. */
(function (root) {
  "use strict";
  const SA = (root.SurvArt = root.SurvArt || {});

  // ── 팔레트(lab-surv-coco-hd-artdir 3절만) ──
  const FUR = ["#5e2a16", "#8e4526", "#b8643a", "#d98a5a", "#f2b98a"]; // 털 갈색(호떡·뚝배기)
  const CR = ["#c9a27a", "#e8c9a0", "#f6e3c4", "#fff4e3"]; // 크림(손)
  const INK = ["#24161d", "#3a2228", "#5a3a42"]; // 눈·코(검정 대신)
  const HI = "#fffbf4"; // 반짝임(흰색 대신)
  const TG = ["#d9546a", "#f07a8a", "#ffb3bd"]; // 혀·볼(빨강의 밝은 쪽)
  const TL = ["#1f8f86", "#2fb5a8", "#7fe0d4"]; // 청록(앞치마)
  const VI = ["#6a3fb8", "#8b5cd6", "#b99af0"]; // 보라(소매)
  const GRS = ["#2f7d4a", "#47a35a", "#6cc46a", "#9bdc7c", "#cdeea0"]; // 잔디(고추 꼭지)
  const SOIL = ["#b98d5e", "#d9b27f", "#ecd3a6", "#f7e8c8"]; // 흙(어묵·국물·빗자루 수수)
  const WOOD = ["#7a4a2a", "#a8693e"]; // 나무(꼬치·자루·메뉴판 테)
  const TB = ["#2a8fa8", "#5ad1e6", "#a8eef8", "#e8f4fb"]; // 칫솔 파랑(방수포)
  const BR = ["#a8742a", "#e0a640", "#ffcf4d", "#ffe9a3"]; // 놋쇠(붕어빵·동전·우산)
  const RED = ["#c43a48", "#ff5d5d"]; // 단추 빨강(고추·플라스틱 의자)
  const VAC = ["#3b4290", "#4a54b0", "#6c7ae0", "#a3adf5"]; // 청소기 남색(장화)
  const RUB = "#2c2a3a"; // 고무(장화 밑창·메뉴판 판)
  const DOG = ["#7d8292", "#a7acba", "#cfd3dc", "#eceef3"]; // 회색(테이프·김의 테)
  const STL = ["#3e4260", "#5a5f7a", "#8a90ad"]; // 원반 쇠(솥·국자 그늘)
  const CHR = ["#9aa6bd", "#dfe6f2"]; // 크롬
  const TUB = ["#cdd6e4", "#f3f6fb"]; // 욕조 흰
  const TEE = ["#d9d2c6", "#efe8dc", "#f8f4ec"]; // 흰 티(종이컵)
  const NIGHT = ["#2a2858", "#3d3a7a"]; // 저녁 하늘
  const GLOW = ["#ffd36b", "#fff0b8"]; // 발광 금
  const WATER = "#7fd4ff"; // 물(빗방울)
  const WIND = "#e9fbff"; // 바람

  const TAU = Math.PI * 2, U = 21, LW = 0.8;
  const hasDoc = typeof document !== "undefined" && !!document.createElement;
  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + Math.max(0, Math.min(1, a)).toFixed(3) + ")"; }

  // ── 도형 ──
  function rrect(p, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); return p; }
  const RR = (x, y, w, h, r) => rrect(new Path2D(), x, y, w, h, r);
  function EL(cx, cy, rx, ry, rot) { const p = new Path2D(); p.ellipse(cx, cy, rx, ry, rot || 0, 0, TAU); return p; }
  const CI = (cx, cy, r) => EL(cx, cy, r, r);
  function smooth(p) {
    const P = new Path2D(), n = p.length;
    P.moveTo(p[0][0], p[0][1]);
    for (let i = 0; i < n; i++) {
      const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
      P.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    P.closePath();
    return P;
  }
  function star(n, r, ri, cx, cy, rot) {
    const P = new Path2D();
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU - Math.PI / 2 + (rot || 0), rr = i % 2 ? ri : r; const x = (cx || 0) + Math.cos(a) * rr, y = (cy || 0) + Math.sin(a) * rr; i ? P.lineTo(x, y) : P.moveTo(x, y); }
    P.closePath(); return P;
  }
  function heartP(cx, cy, s) {
    const P = new Path2D(), X = (v) => cx + v * s, Y = (v) => cy + v * s;
    P.moveTo(X(0), Y(3.3)); P.bezierCurveTo(X(-4.4), Y(0.3), X(-2.8), Y(-3.9), X(0), Y(-1.5)); P.bezierCurveTo(X(2.8), Y(-3.9), X(4.4), Y(0.3), X(0), Y(3.3)); P.closePath();
    return P;
  }
  // 물방울(아래가 둥근 눈물꼴): 꼭지 (x, y-r*1.8)
  function dropP(x, y, r) { const P = new Path2D(); P.moveTo(x, y - r * 1.8); P.bezierCurveTo(x + r * 0.5, y - r * 0.9, x + r, y - r * 0.4, x + r, y + r * 0.1); P.arc(x, y + r * 0.1, r, 0, Math.PI); P.bezierCurveTo(x - r, y - r * 0.4, x - r * 0.5, y - r * 0.9, x, y - r * 1.8); P.closePath(); return P; }
  const seg = (x0, y0, x1, y1) => { const P = new Path2D(); P.moveTo(x0, y0); P.lineTo(x1, y1); return P; };

  // ── 칠 ──
  // 스티커(도깨비 아이콘과 같은 순서): 외곽(0번)을 두 배 굵기로 먼저 깔아 바깥 반만 남김 → 바탕 → 오른쪽 아래 그늘 → 왼쪽 위 흐린 하이라이트.
  // o.under 가 있으면(줄무늬처럼 바탕 위 무늬) 무늬를 먼저 그리고 그늘을 초승달(evenodd)로 덮는다 — 단일 윤곽 도형에만.
  function stk(c, p, bb, R, o) {
    o = o || {};
    const [x, y, w, h] = bb, m = Math.min(w, h);
    if (R.o) { c.lineJoin = "round"; c.lineWidth = (o.lw == null ? LW : o.lw) * 2; c.strokeStyle = R.o; c.stroke(p); }
    c.fillStyle = R.b; c.fill(p);
    c.save(); c.clip(p);
    const d = o.d == null ? m * 0.14 : o.d;
    if (o.under) {
      o.under(c);
      if (R.s) {
        const q = new Path2D(); q.rect(x - 4, y - 4, w + 8, h + 8); q.addPath(p, new DOMMatrix([1, 0, 0, 1, -d * 0.6, -d]));
        c.fillStyle = rgba(R.s, R.sa == null ? 1 : R.sa); c.fill(q, "evenodd");
      }
    } else if (R.s) {
      c.globalAlpha = R.sa == null ? 1 : R.sa; c.fillStyle = R.s; c.fill(p); c.globalAlpha = 1;
      c.save(); c.translate(-d * 0.6, -d); c.fillStyle = R.b; c.fill(p); c.restore();
    }
    if (R.h) {
      const hx = x + w * (o.hx == null ? 0.32 : o.hx), hy = y + h * (o.hy == null ? 0.26 : o.hy), hr = m * (o.hr == null ? 0.46 : o.hr);
      const g = c.createRadialGradient(hx, hy, 0, hx, hy, hr);
      g.addColorStop(0, rgba(R.h, o.ha == null ? 0.95 : o.ha)); g.addColorStop(1, rgba(R.h, 0));
      c.fillStyle = g; c.fillRect(x - 1, y - 1, w + 2, h + 2);
    }
    if (o.inner) o.inner(c);
    c.restore();
  }
  function radial(c, x, y, r, hex, a0, a1) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(hex, a0)); g.addColorStop(1, rgba(hex, a1 || 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function disc(c, x, y, r, col) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = col; c.fill(); }
  function glint(c, x, y, rx, ry, a) { c.fillStyle = HI; c.beginPath(); c.ellipse(x, y, rx, ry, a == null ? -0.6 : a, 0, TAU); c.fill(); }
  // 굵은 선 스티커: 0번 테 → 바탕 → 밝은 결
  function rope(c, P, o, b, h, w) {
    c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = o; c.lineWidth = w + LW * 2; c.stroke(P);
    c.strokeStyle = b; c.lineWidth = w; c.stroke(P);
    if (h) { c.save(); c.translate(-w * 0.12, -w * 0.16); c.strokeStyle = h; c.lineWidth = w * 0.3; c.stroke(P); c.restore(); }
  }
  // 바람·김 같은 선: 짙은 테 + 밝은 속
  function airLine(c, P, core, edge, w) {
    c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = edge; c.lineWidth = (w || 1.1) + 1.1; c.stroke(P);
    c.strokeStyle = core; c.lineWidth = w || 1.1; c.stroke(P);
  }
  function dashArc(c, cx, cy, r, a0, a1, col, w) { c.save(); c.setLineDash([1.4, 1.2]); c.lineCap = "round"; c.strokeStyle = col; c.lineWidth = w || 0.8; c.beginPath(); c.arc(cx, cy, r, a0, a1); c.stroke(); c.restore(); }
  function sparkle(c, x, y, r) {
    const P = star(4, r, r * 0.3, x, y);
    c.lineJoin = "round"; c.lineWidth = LW * 1.4; c.strokeStyle = BR[0]; c.stroke(P);
    c.fillStyle = GLOW[0]; c.fill(P);
    c.save(); c.clip(P); radial(c, x - r * 0.15, y - r * 0.2, r * 0.7, GLOW[1], 1, 0); c.restore();
  }
  function goldGlow(c, x, y, r, a) { const op = c.globalCompositeOperation; c.globalCompositeOperation = "lighter"; radial(c, x, y, r, GLOW[0], a, 0); c.globalCompositeOperation = op; }
  function star5(x, y, r, rot) { return star(5, r, r * 0.46, x, y, rot); }
  function goldStar(c, x, y, r, rot) {
    const P = star5(x, y, r, rot);
    c.lineJoin = "round"; c.lineWidth = Math.min(LW * 2, r * 0.6); c.strokeStyle = BR[0]; c.stroke(P);
    c.fillStyle = GLOW[0]; c.fill(P);
    c.save(); c.clip(P); radial(c, x - r * 0.25, y - r * 0.3, r * 0.8, GLOW[1], 1, 0); c.restore();
  }
  // 김: 흰 속 + 회색 테(크림 카드에서도 보이게)
  const steamLine = (c, P, w) => airLine(c, P, HI, DOG[1], w || 0.9);
  function wisp(c, x0, y0, h, s) { const P = new Path2D(); P.moveTo(x0, y0); P.bezierCurveTo(x0 - 1.4 * s, y0 - h * 0.3, x0 + 1.4 * s, y0 - h * 0.65, x0, y0 - h); steamLine(c, P, 0.85); }

  // ── 포장마차 살림 ──
  const R_FISH = { o: FUR[1], b: SOIL[1], s: SOIL[0], h: SOIL[3] }; // 어묵
  const R_STEEL = { o: STL[0], b: CHR[0], s: STL[2], h: CHR[1] }; // 솥·국자
  const R_RED = { o: INK[1], b: RED[1], s: RED[0], h: TG[2] }; // 고추·플라스틱 의자
  const R_COIN = { o: BR[0], b: BR[2], s: BR[1], h: BR[3] }; // 동전
  const R_BREAD = { o: FUR[0], b: BR[1], s: FUR[2], h: BR[3] }; // 붕어빵
  const R_SKIN = { o: FUR[1], b: CR[1], s: CR[0], h: CR[3] }; // 손
  // 어묵 한 겹(꼬치에 접혀 꿰인 한 주름): 세로로 긴 타원 + 접힌 결
  function fishcake(c, x, y, s, rot) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s, s);
    const rx = 1.9, ry = 3.8;
    stk(c, EL(0, 0, rx, ry), [-rx, -ry, rx * 2, ry * 2], R_FISH, { lw: LW / s, d: 0.5, hx: 0.3, hy: 0.25, hr: 0.7, ha: 0.8,
      inner: (q) => { q.strokeStyle = rgba(SOIL[0], 0.9); q.lineWidth = 0.4; q.beginPath(); q.moveTo(0.7, -ry + 0.6); q.quadraticCurveTo(1.3, 0, 0.7, ry - 0.6); q.stroke(); } });
    c.restore();
  }
  // 동전: 둥근 몸 + 안쪽 테 + 가운데 점(엽전 구멍 없음)
  function coin(c, x, y, r) {
    stk(c, CI(x, y, r), [x - r, y - r, r * 2, r * 2], R_COIN, { lw: Math.min(LW, r * 0.3), d: r * 0.28, hr: 0.5 });
    c.lineWidth = Math.min(0.5, r * 0.18); c.strokeStyle = BR[1]; c.beginPath(); c.arc(x, y, r * 0.66, 0, TAU); c.stroke();
    glint(c, x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.16);
  }
  // 빨간 플라스틱 의자(4분의 3 시점): 다리 넷(뒤 둘 먼저) → 둥근 앉을판 옆면 → 윗면 + 손잡이 구멍
  function stool(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    const w = 1.3;
    for (const [x0, x1] of [[-1.7, -2.3], [1.7, 2.3]]) rope(c, seg(x0, -3.2, x1, 4.4), INK[1], RED[0], null, w);
    for (const [x0, x1] of [[-3.6, -4.6], [3.6, 4.6]]) rope(c, seg(x0, -2.8, x1, 5.0), INK[1], RED[1], TG[2], w);
    c.lineCap = "round"; c.strokeStyle = INK[1]; c.lineWidth = 0.6 + LW * 2 / s; c.beginPath(); c.ellipse(0, 2.0, 3.9, 1.1, 0, 0.05, Math.PI - 0.05); c.stroke();
    c.strokeStyle = RED[0]; c.lineWidth = 0.6; c.beginPath(); c.ellipse(0, 2.0, 3.9, 1.1, 0, 0.05, Math.PI - 0.05); c.stroke();
    const band = new Path2D(); band.moveTo(-4.4, -4.0); band.lineTo(-4.3, -2.9); band.ellipse(0, -2.9, 4.3, 1.6, 0, Math.PI, 0, true); band.lineTo(4.4, -4.0); band.ellipse(0, -4.0, 4.4, 1.7, 0, 0, Math.PI, false); band.closePath();
    stk(c, band, [-4.4, -4.0, 8.8, 2.8], { o: INK[1], b: RED[0], s: INK[2], sa: 0.5 }, { lw: LW / s, d: 0.3 });
    stk(c, EL(0, -4.0, 4.4, 1.7), [-4.4, -5.7, 8.8, 3.4], R_RED, { lw: LW / s, d: 0.35, hx: 0.3, hy: 0.2, hr: 0.6 });
    stk(c, RR(-1.1, -4.35, 2.2, 0.7, 0.35), [-1.1, -4.35, 2.2, 0.7], { b: INK[1] }, { lw: 0 });
    glint(c, -2.4, -4.6, 0.9, 0.35, -0.1);
    c.restore();
  }

  // ── 아이콘 18종 ──
  const DRAW = {
    // 무기
    skewer(c) { // 어묵 꼬치: 나무 꼬치에 주름져 꿰인 어묵, 날아가는 줄
      for (const [x0, y0, x1, y1, w] of [[-8.4, 2.6, -5.6, -0.2, 1.0], [-2.8, 8.4, 0.0, 5.6, 1.0], [-8.0, 6.0, -6.2, 4.2, 0.8]]) airLine(c, seg(x0, y0, x1, y1), WIND, TB[0], w);
      rope(c, seg(-7.0, 7.0, 6.8, -6.8), WOOD[0], WOOD[1], SOIL[2], 0.9);
      c.save(); c.rotate(-Math.PI / 4);
      for (const [px, py] of [[-3.6, 0.5], [-1.2, -0.5], [1.2, 0.5], [3.6, -0.5]]) fishcake(c, px, py, 1.0, 0.12);
      c.restore();
      glint(c, -3.6, -1.0, 0.7, 0.4);
    },
    steam(c) { // 모락모락 김: 크롬 솥 위로 말려 오르는 큰 김
      const rimY = 1.8, rx = 6.0, ry = 1.7;
      for (const s of [-1, 1]) stk(c, RR(s > 0 ? rx - 0.6 : -rx - 1.8, rimY + 0.6, 2.4, 1.6, 0.8), [s > 0 ? rx - 0.6 : -rx - 1.8, rimY + 0.6, 2.4, 1.6], R_STEEL, { lw: 0.6, d: 0.35 });
      stk(c, EL(0, rimY, rx, ry), [-rx, rimY - ry, rx * 2, ry * 2], R_STEEL, { d: 0.3, ha: 0 });
      c.fillStyle = SOIL[0]; c.beginPath(); c.ellipse(0, rimY + 0.15, rx - 0.8, ry - 0.5, 0, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.ellipse(0, rimY + 0.15, rx - 0.8, ry - 0.5, 0, 0, TAU); c.clip(); radial(c, -1.8, rimY - 0.4, 3.6, SOIL[2], 0.9, 0); c.restore();
      const body = new Path2D(); body.moveTo(-rx, rimY); body.lineTo(-rx + 0.5, rimY + 5.0); body.quadraticCurveTo(0, rimY + 6.4, rx - 0.5, rimY + 5.0); body.lineTo(rx, rimY); body.ellipse(0, rimY, rx, ry, 0, 0, Math.PI, false); body.closePath();
      stk(c, body, [-rx, rimY, rx * 2, 6.4], R_STEEL, { d: 0.8, hy: 0.3, hr: 0.5,
        inner: (x) => { x.strokeStyle = rgba(STL[1], 0.8); x.lineWidth = 0.45; x.beginPath(); x.moveTo(-rx, rimY + 1.6); x.quadraticCurveTo(0, rimY + 3.2, rx, rimY + 1.6); x.stroke(); } });
      // 큰 김: 솥에서 올라와 위에서 안쪽으로 말린다
      const cx = 0.6, cy = -4.4, r0 = 3.0, P = new Path2D();
      P.moveTo(-1.6, rimY - 0.4); P.quadraticCurveTo(-3.8, -1.4, cx - r0, cy);
      for (let i = 1; i <= 40; i++) { const t = i / 40, a = Math.PI + t * Math.PI * 1.75, r = r0 * (1 - t * 0.72); P.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      steamLine(c, P, 1.2);
      wisp(c, 4.4, rimY - 0.6, 5.8, 1);
      wisp(c, -5.0, rimY - 0.4, 4.6, -1);
    },
    bungeo(c) { // 붕어빵 낙하: 머리부터 떨어지는 금빛 붕어빵 + 떨어지는 줄 + 땅 그림자
      for (const [x, y0, y1, w] of [[-6.4, -7.8, -3.0, 1.0], [-7.6, -2.0, 0.8, 0.8], [7.2, -1.6, 2.6, 1.0]]) airLine(c, seg(x, y0, x, y1), GLOW[1], BR[0], w);
      c.fillStyle = rgba(INK[1], 0.3); c.beginPath(); c.ellipse(-1.0, 7.9, 2.8, 0.6, 0, 0, TAU); c.fill();
      c.save(); c.translate(0, 0.4); c.rotate(1.75);
      const fish = smooth([[5.6, 0], [4.6, -2.4], [1.8, -3.5], [-1.6, -3.1], [-4.0, -1.3], [-6.4, -3.3], [-7.1, -2.4], [-5.9, 0], [-7.1, 2.4], [-6.4, 3.3], [-4.0, 1.3], [-1.6, 3.1], [1.8, 3.5], [4.6, 2.4]]);
      stk(c, fish, [-7.1, -3.5, 12.7, 7.0], R_BREAD, { d: 0.8, hx: 0.55, hy: 0.25, hr: 0.45, ha: 0.85,
        inner: (x) => { x.lineCap = "round"; x.strokeStyle = rgba(FUR[2], 0.85); x.lineWidth = 0.45;
          for (const sx of [-2.6, -0.6, 1.4]) for (const sy of [-1.4, 0.6]) { x.beginPath(); x.arc(sx, sy, 0.9, -Math.PI / 2, Math.PI / 2); x.stroke(); }
          x.lineWidth = 0.55; x.beginPath(); x.moveTo(3.0, -2.6); x.quadraticCurveTo(2.0, 0, 3.0, 2.6); x.stroke();
          for (const ty of [-2.0, 0, 2.0]) { x.beginPath(); x.moveTo(-5.0, ty * 0.5); x.lineTo(-6.6, ty * 1.1); x.stroke(); } } });
      disc(c, 4.0, -1.1, 0.62, FUR[0]); disc(c, 3.85, -1.25, 0.2, HI);
      c.restore();
      glint(c, 1.6, -3.6, 0.8, 0.4, 1.2);
    },
    ladle(c) { // 국자: 크롬 국자가 빙글 도는 호 위에
      for (const [a0, a1] of [[-2.7, -1.5], [0.25, 1.35]]) { const P = new Path2D(); P.arc(0, 0.4, 8.0, a0, a1); airLine(c, P, TB[2], TB[0], 0.8); }
      rope(c, seg(0.6, 1.2, 5.6, -6.2), STL[0], CHR[0], CHR[1], 1.2);
      const hook = new Path2D(); hook.moveTo(5.6, -6.2); hook.quadraticCurveTo(6.6, -8.0, 7.4, -6.8); rope(c, hook, STL[0], CHR[0], null, 1.0);
      const bx = -2.6, rimY = 1.6, rx = 4.4, ry = 1.6;
      stk(c, EL(bx, rimY, rx, ry), [bx - rx, rimY - ry, rx * 2, ry * 2], R_STEEL, { d: 0.3, ha: 0 });
      c.fillStyle = STL[1]; c.beginPath(); c.ellipse(bx, rimY + 0.1, rx - 0.7, ry - 0.45, 0, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.ellipse(bx, rimY + 0.1, rx - 0.7, ry - 0.45, 0, 0, TAU); c.clip(); radial(c, bx + 1.4, rimY + 0.6, 2.6, CHR[0], 0.9, 0); c.restore();
      const front = new Path2D(); front.moveTo(bx - rx, rimY); front.bezierCurveTo(bx - rx + 0.3, rimY + 4.4, bx - 1.8, rimY + 5.4, bx, rimY + 5.4); front.bezierCurveTo(bx + 1.8, rimY + 5.4, bx + rx - 0.3, rimY + 4.4, bx + rx, rimY); front.ellipse(bx, rimY, rx, ry, 0, 0, Math.PI, false); front.closePath();
      stk(c, front, [bx - rx, rimY, rx * 2, 5.4], R_STEEL, { d: 0.8, hy: 0.35, hr: 0.5 });
      glint(c, bx - 2.2, rimY + 2.0, 0.6, 1.2, 0.3);
    },
    hotteok(c) { // 호떡 굴리기: 바퀴처럼 서서 구르는 호떡 + 도는 화살 + 뒤의 줄·흙먼지
      for (const [y, x0, w] of [[-3.2, -8.6, 0.9], [0.4, -8.8, 1.1], [3.8, -8.4, 0.9]]) airLine(c, seg(x0, y, x0 + 2.8, y), WIND, TB[0], w);
      for (const [x, y, r] of [[-5.2, 7.4, 1.1], [-3.4, 8.0, 0.8], [-6.8, 6.4, 0.7]]) stk(c, CI(x, y, r), [x - r, y - r, r * 2, r * 2], { o: SOIL[0], b: SOIL[2], h: SOIL[3] }, { lw: 0.45 });
      const cx = 1.4, cy = 0.6, r = 6.2;
      { const P = new Path2D(); P.arc(cx, cy, r + 1.6, -2.75, -1.3); airLine(c, P, BR[2], BR[0], 0.8);
        c.save(); c.translate(cx + Math.cos(-1.3) * (r + 1.6), cy + Math.sin(-1.3) * (r + 1.6)); c.rotate(-1.3 + Math.PI / 2); const T = new Path2D(); T.moveTo(-1.0, -0.9); T.lineTo(0.6, 0); T.lineTo(-1.0, 0.9); airLine(c, T, BR[2], BR[0], 0.7); c.restore(); }
      stk(c, CI(cx, cy, r), [cx - r, cy - r, r * 2, r * 2], { o: FUR[0], b: FUR[3], s: FUR[2], h: FUR[4] }, { d: 1.0, hr: 0.5,
        inner: (x) => { x.strokeStyle = rgba(FUR[2], 0.9); x.lineWidth = 0.7; x.beginPath(); x.arc(cx, cy, r - 1.3, 0, TAU); x.stroke();
          x.strokeStyle = rgba(FUR[1], 0.8); x.lineWidth = 0.55; x.lineCap = "round"; x.beginPath();
          for (let i = 0; i <= 30; i++) { const t = i / 30, a = t * Math.PI * 1.6, rr = 0.6 + t * 3.0; i ? x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : x.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.stroke();
          for (const [sx, sy, a] of [[-2.2, -2.0, 0.4], [2.6, -3.0, -0.6], [3.6, 2.4, 1.0], [-1.4, 3.2, -0.2], [0.8, -0.6, 0.9]]) { x.fillStyle = CR[3]; x.beginPath(); x.ellipse(cx + sx, cy + sy, 0.42, 0.24, a, 0, TAU); x.fill(); } } });
      glint(c, cx - 3.2, cy - 3.0, 1.1, 0.6);
    },
    // 보조
    dmg(c) { // 매운맛: 휜 빨간 고추 + 초록 꼭지 + 작은 불꽃
      for (const [x, y, s] of [[-5.0, -3.4, 1.0], [-1.8, -6.6, 0.8]]) {
        const F = dropP(x, y, 1.5 * s);
        c.lineJoin = "round"; c.lineWidth = LW * 2; c.strokeStyle = INK[1]; c.stroke(F); c.fillStyle = RED[1]; c.fill(F);
        c.fillStyle = GLOW[0]; c.fill(dropP(x, y + 0.4 * s, 0.8 * s));
      }
      const body = smooth([[2.6, -5.2], [5.4, -4.2], [5.6, -0.8], [3.8, 3.0], [0.4, 5.8], [-3.8, 7.4], [-6.8, 7.2], [-3.6, 5.0], [-0.8, 2.4], [0.8, -0.8], [1.2, -3.8]]);
      stk(c, body, [-6.8, -5.2, 12.4, 12.6], R_RED, { d: 0.9, hx: 0.55, hy: 0.15, hr: 0.4, ha: 0.9,
        inner: (x) => { x.strokeStyle = rgba(TG[2], 0.85); x.lineWidth = 0.55; x.lineCap = "round"; x.beginPath(); x.moveTo(2.4, -2.6); x.quadraticCurveTo(2.4, 2.0, -2.6, 5.4); x.stroke(); } });
      const stem = new Path2D(); stem.moveTo(3.8, -5.0); stem.quadraticCurveTo(3.4, -7.4, 5.4, -8.2); rope(c, stem, GRS[0], GRS[2], GRS[4], 1.0);
      stk(c, EL(3.9, -4.9, 2.4, 1.1, 0.25), [1.5, -6, 4.8, 2.2], { o: GRS[0], b: GRS[2], s: GRS[1], h: GRS[4] }, { lw: 0.6, d: 0.3 });
      glint(c, 3.6, -1.8, 0.5, 1.1, 0.3);
    },
    cd(c) { // 빠른 손: 펼친 손 + 빠른 줄 + 흔들리는 호
      for (const [x0, y0, x1, y1, w] of [[-8.8, -3.4, -6.2, -4.6, 0.9], [-8.6, 0.4, -5.6, -0.6, 1.1], [-8.0, 3.8, -5.6, 3.0, 0.9]]) airLine(c, seg(x0, y0, x1, y1), WIND, TB[0], w);
      for (const [r, w] of [[6.6, 0.8], [8.2, 0.8]]) { const P = new Path2D(); P.arc(0.4, 0.6, r, -1.25, -0.25); airLine(c, P, BR[2], BR[0], w); }
      c.save(); c.translate(0.4, 0.2); c.rotate(0.22);
      const hand = new Path2D();
      rrect(hand, -3.4, -2.2, 6.6, 6.4, 2.6);
      for (const [fx, top] of [[-2.65, -6.4], [-0.9, -7.4], [0.85, -7.1], [2.5, -5.8]]) rrect(hand, fx - 0.8, top, 1.6, 6.0, 0.8);
      c.save(); c.translate(-3.0, 1.4); c.rotate(-0.75); rrect(hand, -0.85, -4.6, 1.7, 5.0, 0.85); c.restore();
      stk(c, hand, [-5, -7.4, 8.2, 11.6], R_SKIN, { d: 0.8, hx: 0.4, hy: 0.35, hr: 0.5,
        inner: (x) => { x.strokeStyle = CR[0]; x.lineWidth = 0.4; x.lineCap = "round"; for (const fx of [-1.78, -0.02, 1.68]) { x.beginPath(); x.moveTo(fx, -4.6); x.lineTo(fx, -1.6); x.stroke(); } } });
      stk(c, RR(-3.8, 3.6, 7.4, 3.4, 1.0), [-3.8, 3.6, 7.4, 3.4], { o: INK[1], b: VI[1], s: VI[0], h: VI[2] }, { lw: 0.6, d: 0.4 });
      c.restore();
      glint(c, -0.6, -2.0, 0.9, 0.5);
    },
    area(c) { // 넓은 앞치마: 청록 앞치마 + 양옆으로 날리는 끈 + 넓어지는 호
      dashArc(c, 0, 0.6, 8.0, 0.25, 1.05, BR[1]); dashArc(c, 0, 0.6, 8.0, Math.PI - 1.05, Math.PI - 0.25, BR[1]);
      const neck = new Path2D(); neck.moveTo(-2.4, -5.4); neck.quadraticCurveTo(0, -10.0, 2.4, -5.4); rope(c, neck, INK[1], TL[0], null, 0.7);
      for (const s of [-1, 1]) { const T = new Path2D(); T.moveTo(s * 3.2, -1.4); T.quadraticCurveTo(s * 5.6, -3.0, s * 7.0, -1.6); T.quadraticCurveTo(s * 7.8, -0.8, s * 8.2, -2.0); rope(c, T, INK[1], TL[1], TL[2], 0.8); }
      const A = new Path2D(); A.moveTo(-2.8, -5.8); A.lineTo(2.8, -5.8); A.lineTo(3.2, -1.6); A.quadraticCurveTo(5.8, 2.0, 6.0, 7.0); A.quadraticCurveTo(0, 8.0, -6.0, 7.0); A.quadraticCurveTo(-5.8, 2.0, -3.2, -1.6); A.closePath();
      stk(c, A, [-6, -5.8, 12, 13.8], { o: INK[1], b: TL[1], s: TL[0], h: TL[2] }, { d: 0.9, hr: 0.45,
        inner: (x) => { x.strokeStyle = rgba(TL[2], 0.85); x.lineWidth = 0.35; x.setLineDash([0.7, 0.6]); x.beginPath(); x.moveTo(-5.4, 6.2); x.quadraticCurveTo(0, 7.1, 5.4, 6.2); x.stroke(); x.setLineDash([]); } });
      stk(c, RR(-3.2, 1.8, 6.4, 3.6, 0.9), [-3.2, 1.8, 6.4, 3.6], { o: TL[0], b: TL[2], s: TL[1] }, { lw: 0.5, d: 0.35,
        inner: (x) => { x.strokeStyle = TL[0]; x.lineWidth = 0.35; x.beginPath(); x.moveTo(0, 1.8); x.lineTo(0, 5.4); x.stroke(); } });
      stk(c, RR(-3.4, -2.2, 6.8, 1.4, 0.6), [-3.4, -2.2, 6.8, 1.4], { o: INK[1], b: TL[0], h: TL[2] }, { lw: 0.5 });
      glint(c, -1.4, -4.4, 0.8, 0.45);
    },
    move(c) { // 장화: 남색 장화 + 빠른 줄 + 튀는 물방울
      for (const [x0, y0, x1, y1, w] of [[-8.8, -4.4, -6.4, -4.4, 0.9], [-8.8, -1.0, -5.8, -1.0, 1.1], [-8.6, 2.4, -6.2, 2.4, 0.9]]) airLine(c, seg(x0, y0, x1, y1), WIND, TB[0], w);
      for (const [x, y, r] of [[-6.4, 6.6, 0.8], [-7.8, 4.6, 0.6], [-4.8, 4.4, 0.5]]) stk(c, dropP(x, y, r), [x - r, y - r * 1.8, r * 2, r * 2.9], { o: TB[0], b: WATER, h: TB[3] }, { lw: 0.45 });
      c.save(); c.translate(0.6, 0);
      const B = new Path2D(); B.moveTo(-4.2, -6.4); B.lineTo(1.6, -6.4); B.lineTo(1.8, 0.8); B.quadraticCurveTo(2.0, 2.2, 4.4, 2.6); B.quadraticCurveTo(6.8, 3.2, 6.8, 5.2); B.lineTo(6.8, 6.0); B.lineTo(-4.6, 6.0); B.lineTo(-4.6, 0.8); B.closePath();
      stk(c, B, [-4.6, -6.4, 11.4, 12.4], { o: INK[0], b: VAC[2], s: VAC[1], h: VAC[3] }, { d: 0.9, hx: 0.25, hy: 0.2, hr: 0.45,
        inner: (x) => { x.strokeStyle = rgba(VAC[0], 0.7); x.lineWidth = 0.4; x.beginPath(); x.moveTo(1.8, 1.8); x.quadraticCurveTo(-0.4, 1.4, -1.6, 3.4); x.stroke(); } });
      stk(c, RR(-5.0, -8.0, 7.0, 2.2, 0.9), [-5, -8, 7, 2.2], { o: INK[0], b: VAC[3], s: VAC[2] }, { lw: 0.6, d: 0.35 });
      stk(c, RR(-5.0, 5.2, 12.2, 2.0, 0.9), [-5, 5.2, 12.2, 2], { o: INK[0], b: RUB, h: STL[1] }, { lw: 0.6, ha: 0.7 });
      c.restore();
      glint(c, -2.0, -3.6, 0.6, 1.4, 0.05);
    },
    hp(c) { // 따끈한 국물: 뚝배기 위로 김과 큰 하트(체력 위)
      const rimY = 2.0, rx = 7.4, ry = 2.0, R_POT = { o: FUR[0], b: FUR[1], s: FUR[0], h: FUR[2] };
      stk(c, EL(0, rimY, rx, ry), [-rx, rimY - ry, rx * 2, ry * 2], R_POT, { d: 0.4, ha: 0 });
      c.fillStyle = TG[0]; c.beginPath(); c.ellipse(0, rimY + 0.2, rx - 0.9, ry - 0.6, 0, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.ellipse(0, rimY + 0.2, rx - 0.9, ry - 0.6, 0, 0, TAU); c.clip(); radial(c, -2.4, rimY - 0.4, 3.6, TG[1], 0.9, 0); c.restore();
      wisp(c, -5.2, rimY - 0.6, 6.2, 1); wisp(c, 5.4, rimY - 0.6, 6.6, -1);
      const H = heartP(0, -2.6, 1.45);
      stk(c, H, [-4.9, -8.4, 9.8, 10.7], R_RED, { d: 1.0, hr: 0.5 });
      glint(c, -2.2, -5.4, 1.1, 0.65);
      const front = new Path2D(); front.moveTo(-rx, rimY); front.bezierCurveTo(-rx + 0.2, rimY + 4.2, -3.8, rimY + 5.4, 0, rimY + 5.4); front.bezierCurveTo(3.8, rimY + 5.4, rx - 0.2, rimY + 4.2, rx, rimY); front.ellipse(0, rimY, rx, ry, 0, 0, Math.PI, false); front.closePath();
      stk(c, front, [-rx, rimY, rx * 2, 5.4], R_POT, { d: 0.8, hy: 0.35, hr: 0.5, ha: 0.8,
        inner: (x) => { x.strokeStyle = rgba(FUR[3], 0.8); x.lineWidth = 0.45; x.beginPath(); x.moveTo(-rx, rimY + 1.6); x.quadraticCurveTo(0, rimY + 3.2, rx, rimY + 1.6); x.stroke(); } });
      for (const s of [-1, 1]) stk(c, RR(s > 0 ? rx - 0.4 : -rx - 1.2, rimY + 0.4, 1.6, 1.4, 0.6), [s > 0 ? rx - 0.4 : -rx - 1.2, rimY + 0.4, 1.6, 1.4], R_POT, { lw: 0.5, d: 0.3, ha: 0 });
    },
    magnet(c) { // 동전 통: 크롬 깡통 + 끌려 들어오는 동전
      for (const [r, a0, a1] of [[5.6, -1.25, -0.25], [8.0, -1.05, -0.35]]) dashArc(c, -2.4, 1.6, r, a0, a1, BR[1]);
      const cx = -2.2, topY = 0.6, rx = 4.6, ry = 1.4, bot = 7.4;
      const can = new Path2D(); can.moveTo(cx - rx, topY); can.lineTo(cx - rx, bot); can.ellipse(cx, bot, rx, ry, 0, Math.PI, 0, true); can.lineTo(cx + rx, topY); can.ellipse(cx, topY, rx, ry, 0, 0, Math.PI, false); can.closePath();
      stk(c, can, [cx - rx, topY, rx * 2, bot - topY + ry], R_STEEL, { d: 0.8, hx: 0.25, hy: 0.3, hr: 0.5,
        under: (x) => { x.fillStyle = TL[1]; x.fillRect(cx - rx - 1, topY + 2.4, rx * 2 + 2, 2.6); x.fillStyle = TL[2]; x.fillRect(cx - rx - 1, topY + 2.4, rx * 2 + 2, 0.5);
          x.strokeStyle = STL[1]; x.lineWidth = 0.35; for (const yy of [topY + 1.2, bot - 0.6]) { x.beginPath(); x.ellipse(cx, yy, rx, ry, 0, 0.1, Math.PI - 0.1); x.stroke(); } } });
      stk(c, EL(cx, topY, rx, ry), [cx - rx, topY - ry, rx * 2, ry * 2], { o: STL[0], b: STL[1] }, { d: 0.2, ha: 0 });
      c.save(); c.clip(EL(cx, topY, rx - 0.5, ry - 0.3)); for (const [x, y] of [[cx - 1.8, topY + 0.5], [cx + 0.6, topY + 0.7], [cx + 2.6, topY + 0.4], [cx - 0.4, topY - 0.2]]) { disc(c, x, y, 1.0, BR[0]); disc(c, x, y - 0.15, 0.85, BR[2]); } c.restore();
      coin(c, 5.4, -4.2, 1.9); coin(c, 2.0, -5.4, 1.6); coin(c, 5.0, 0.0, 1.6);
      sparkle(c, 7.4, 3.6, 1.0);
    },
    // 가게(손님·가게 돌보기)
    tape(c) { // 테이프 수선: 찢어진 파란 방수포 위에 X 로 붙인 회색 테이프 + 테이프 롤
      const tarp = new Path2D(); tarp.moveTo(-7.8, -6.8); tarp.quadraticCurveTo(-1.0, -7.8, 5.8, -6.4); tarp.quadraticCurveTo(6.6, -0.8, 5.4, 4.2); tarp.quadraticCurveTo(-1.2, 5.6, -7.4, 4.6); tarp.quadraticCurveTo(-8.4, -1.0, -7.8, -6.8); tarp.closePath();
      stk(c, tarp, [-8.4, -7.8, 15, 13.4], { o: VAC[0], b: TB[1], s: TB[0], h: TB[2] }, { d: 1.0, hr: 0.5, ha: 0.7,
        inner: (x) => { x.strokeStyle = rgba(TB[0], 0.7); x.lineWidth = 0.4; for (const k of [-4.4, 0.8]) { x.beginPath(); x.moveTo(k, -7.6); x.quadraticCurveTo(k + 0.8, -1, k, 5.4); x.stroke(); } } });
      const tear = new Path2D(); tear.moveTo(-5.4, -4.6); tear.lineTo(-3.6, -2.6); tear.lineTo(-4.0, -1.6); tear.lineTo(-1.6, 0.4); tear.lineTo(-2.0, 1.4); tear.lineTo(0.4, 3.0); tear.lineTo(-0.6, 1.2); tear.lineTo(-0.2, 0.6); tear.lineTo(-2.6, -1.4); tear.lineTo(-2.2, -2.4); tear.closePath();
      c.fillStyle = INK[1]; c.fill(tear);
      for (const a of [0.75, -0.75]) {
        c.save(); c.translate(-2.4, -0.8); c.rotate(a);
        stk(c, RR(-5.4, -1.1, 10.8, 2.2, 0.3), [-5.4, -1.1, 10.8, 2.2], { o: DOG[0], b: DOG[2], s: DOG[1], h: DOG[3] }, { lw: 0.5, d: 0.35,
          inner: (x) => { x.strokeStyle = rgba(DOG[1], 0.9); x.lineWidth = 0.25; for (let i = -4.6; i <= 4.6; i += 1.15) { x.beginPath(); x.moveTo(i, -1.1); x.lineTo(i, 1.1); x.stroke(); } } });
        c.restore();
      }
      const rx = 4.6, ry = 4.4, R = 3.3, roll = CI(rx, ry, R); roll.moveTo(rx + 1.4, ry); roll.arc(rx, ry, 1.4, 0, TAU);
      rope(c, seg(rx - 1.8, ry + 2.6, 0.8, 6.8), DOG[0], DOG[2], null, 1.0);
      stk(c, roll, [rx - R, ry - R, R * 2, R * 2], { o: DOG[0], b: DOG[2], s: DOG[1], h: DOG[3] }, { d: 0.6, hr: 0.5,
        inner: (x) => { x.strokeStyle = DOG[1]; x.lineWidth = 0.35; x.beginPath(); x.arc(rx, ry, 2.3, 0, TAU); x.stroke(); } });
      c.lineWidth = 0.4; c.strokeStyle = DOG[0]; c.beginPath(); c.arc(rx, ry, 1.4, 0, TAU); c.stroke();
      glint(c, -5.6, -5.0, 0.9, 0.5);
    },
    stools(c) { // 의자 더 놓기: 빨간 플라스틱 의자 둘
      stool(c, 3.6, -2.4, 0.72);
      stool(c, -1.6, 1.8, 1.0);
      sparkle(c, -6.8, -6.0, 1.5);
    },
    menu(c) { // 오늘의 메뉴: 나무 테 칠판에 음식 그림 넷(글자 없음) + 받침 다리
      for (const s of [-1, 1]) rope(c, seg(s * 4.2, 3.6, s * 6.2, 8.0), WOOD[0], WOOD[1], null, 1.0);
      stk(c, RR(-7.4, -7.6, 14.8, 12.4, 1.4), [-7.4, -7.6, 14.8, 12.4], { o: FUR[0], b: WOOD[1], s: WOOD[0], h: FUR[3] }, { d: 0.6, hr: 0.4, ha: 0.6 });
      stk(c, RR(-6.2, -6.4, 12.4, 10.0, 0.8), [-6.2, -6.4, 12.4, 10.0], { b: RUB, h: STL[0] }, { lw: 0, hx: 0.3, hy: 0.2, hr: 0.6, ha: 0.9 });
      // 위 왼쪽: 어묵 꼬치
      rope(c, seg(-5.2, -1.6, -1.8, -5.6), WOOD[0], SOIL[2], null, 0.45);
      c.save(); c.translate(-3.4, -3.6); c.rotate(-0.86); for (const px of [-1.0, 0.1, 1.2]) fishcake(c, px, 0, 0.4, 0); c.restore();
      // 위 오른쪽: 붕어빵
      c.save(); c.translate(3.2, -3.8); c.scale(0.4, 0.4);
      stk(c, smooth([[5.6, 0], [4.6, -2.4], [1.8, -3.5], [-1.6, -3.1], [-4.0, -1.3], [-6.4, -3.3], [-7.1, -2.4], [-5.9, 0], [-7.1, 2.4], [-6.4, 3.3], [-4.0, 1.3], [-1.6, 3.1], [1.8, 3.5], [4.6, 2.4]]), [-7.1, -3.5, 12.7, 7], R_BREAD, { lw: LW, d: 0.8 });
      disc(c, 3.8, -1.0, 0.8, FUR[0]);
      c.restore();
      // 아래 왼쪽: 호떡
      stk(c, CI(-3.2, 1.0, 1.9), [-5.1, -0.9, 3.8, 3.8], { o: FUR[0], b: FUR[3], s: FUR[2], h: FUR[4] }, { lw: 0.45, d: 0.35 });
      disc(c, -3.2, 1.0, 0.7, FUR[1]);
      // 아래 오른쪽: 국물 그릇 + 김
      wisp(c, 3.4, -0.4, 1.8, 1);
      const bowl = new Path2D(); bowl.moveTo(1.2, 0.6); bowl.lineTo(5.6, 0.6); bowl.quadraticCurveTo(5.4, 3.0, 3.4, 3.0); bowl.quadraticCurveTo(1.4, 3.0, 1.2, 0.6); bowl.closePath();
      stk(c, bowl, [1.2, 0.6, 4.4, 2.4], { o: STL[0], b: TUB[1], s: TUB[0] }, { lw: 0.45, d: 0.3 });
      c.fillStyle = TG[0]; c.fillRect(1.6, 0.6, 3.6, 0.5);
      sparkle(c, 6.8, -7.0, 1.3);
    },
    tent(c) { // 우산 빌려주기: 펼친 노란 우산 + 둥근 손잡이 + 빗방울
      for (const [x, y, r] of [[-7.0, -6.6, 0.75], [-4.0, -8.0, 0.6], [6.4, -7.4, 0.7], [7.6, -3.6, 0.55], [-7.8, -2.6, 0.55]]) stk(c, dropP(x, y, r), [x - r, y - r * 1.8, r * 2, r * 2.9], { o: TB[0], b: WATER, h: TB[3] }, { lw: 0.45 });
      c.save(); c.rotate(-0.18);
      rope(c, seg(0, -2.0, 0, 5.4), INK[1], WOOD[1], null, 0.9);
      const hk = new Path2D(); hk.moveTo(0, 5.2); hk.quadraticCurveTo(0, 7.8, -1.6, 7.6); hk.quadraticCurveTo(-2.8, 7.4, -2.6, 6.2); rope(c, hk, INK[1], WOOD[1], SOIL[2], 1.0);
      const top = -6.8, L = 7.4, base = -0.6, sc = [-L, -L / 2, 0, L / 2, L];
      const can = new Path2D(); can.moveTo(-L, base); can.bezierCurveTo(-L, top - 0.6, L, top - 0.6, L, base);
      for (let i = 4; i > 0; i--) can.quadraticCurveTo((sc[i] + sc[i - 1]) / 2, base - 1.4, sc[i - 1], base);
      can.closePath();
      stk(c, can, [-L, top, L * 2, base - top], { o: BR[0], b: BR[2], s: BR[1], h: BR[3] }, { d: 0.9, hr: 0.5,
        inner: (x) => { x.strokeStyle = rgba(BR[0], 0.75); x.lineWidth = 0.45; for (const k of [-L / 2, 0, L / 2]) { x.beginPath(); x.moveTo(0, top + 0.4); x.quadraticCurveTo(k * 0.7, top + 2.4, k, base - 0.3); x.stroke(); } } });
      rope(c, seg(0, top + 0.1, 0, top - 1.2), INK[1], WOOD[1], null, 0.7);
      glint(c, -3.6, top + 2.6, 1.3, 0.6, -0.5);
      c.restore();
    },
    broom(c) { // 빗자루 문지기: 수수 빗자루 + 가게 둘레를 도는 점선 + 쓸린 먼지
      dashArc(c, 0, 0, 8.2, -0.9, 0.9, BR[1]); dashArc(c, 0, 0, 8.2, Math.PI - 0.6, Math.PI + 0.5, BR[1]);
      for (const [x, y, r] of [[2.0, 7.8, 1.0], [4.0, 6.6, 0.8], [0.2, 8.4, 0.6]]) stk(c, CI(x, y, r), [x - r, y - r, r * 2, r * 2], { o: DOG[0], b: DOG[2], h: DOG[3] }, { lw: 0.45 });
      for (const [x0, y0, x1, y1] of [[1.6, 4.6, 4.6, 3.4], [2.4, 2.6, 5.4, 0.8]]) airLine(c, seg(x0, y0, x1, y1), WIND, TB[0], 0.8);
      rope(c, seg(6.4, -7.6, 0.0, -0.6), WOOD[0], WOOD[1], SOIL[2], 1.1);
      const B = new Path2D(); B.moveTo(-0.6, -1.6); B.quadraticCurveTo(1.2, 0.4, 0.8, 1.2); B.quadraticCurveTo(-0.4, 5.4, -3.0, 8.0); B.quadraticCurveTo(-6.6, 7.6, -8.2, 4.8); B.quadraticCurveTo(-4.4, 2.8, -2.4, -0.4); B.closePath();
      stk(c, B, [-8.2, -1.6, 9.4, 9.6], { o: FUR[1], b: SOIL[1], s: SOIL[0], h: SOIL[3] }, { d: 0.8, hx: 0.6, hy: 0.15, hr: 0.5,
        inner: (x) => { x.lineCap = "round"; x.strokeStyle = rgba(SOIL[0], 0.9); x.lineWidth = 0.35; for (let i = 0; i <= 6; i++) { const t = i / 6; x.beginPath(); x.moveTo(-0.6 - t * 1.4, 0.0); x.lineTo(-2.6 - t * 5.0 + 1.4, 8.0 - t * 3.0); x.stroke(); } } });
      c.save(); c.translate(-0.5, -0.4); c.rotate(-0.85);
      stk(c, RR(-1.8, -0.8, 3.6, 1.6, 0.5), [-1.8, -0.8, 3.6, 1.6], { o: INK[1], b: RED[1], s: RED[0], h: TG[2] }, { lw: 0.5, d: 0.3 });
      c.restore();
      glint(c, 4.2, -5.0, 0.5, 0.3);
    },
    // 기타
    evo(c) { // 진화: 비 오는 밤하늘 원 + 금별 + 둘레 빗방울
      stk(c, CI(0, 0, 8.0), [-8, -8, 16, 16], { o: INK[0], b: NIGHT[0], s: INK[0], sa: 0.6, h: NIGHT[1] }, { d: 1.2, ha: 0.8,
        inner: (x) => { x.strokeStyle = rgba(WATER, 0.55); x.lineWidth = 0.35; x.lineCap = "round"; for (const [rx, ry] of [[-5.6, -3.6], [-3.0, -6.0], [4.0, -5.2], [5.6, 2.0], [-6.0, 2.6], [-1.6, 5.6], [2.8, 5.0], [6.4, -1.6]]) { x.beginPath(); x.moveTo(rx, ry); x.lineTo(rx - 0.6, ry + 1.4); x.stroke(); } } });
      goldGlow(c, 0, 0.4, 7.4, 0.7);
      goldStar(c, 0, 0.6, 5.6, 0);
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + Math.PI / 5 + (i * TAU) / 5; const x = Math.cos(a) * 6.2, y = 0.9 + Math.sin(a) * 6.2; c.fillStyle = WATER; c.fill(dropP(x, y, 0.7)); disc(c, x - 0.2, y - 0.1, 0.22, TB[3]); }
      glint(c, -1.4, -1.4, 0.8, 0.5);
      sparkle(c, 6.8, -6.6, 1.8);
      sparkle(c, -6.8, 6.2, 1.3);
    },
    heal(c) { // 어묵 국물 한 컵(줍는 것): 하얀 종이컵 + 국물 + 꽂힌 어묵 꼬치 + 김
      wisp(c, -3.4, -2.6, 5.2, 1); wisp(c, -0.6, -2.8, 4.4, -1);
      const cx = -1.2, topY = -1.6, trx = 4.8, tr = 1.3, by = 7.6, brx = 3.4;
      // 꼬치는 컵 안에서 비스듬히 위로
      rope(c, seg(cx + 0.4, topY + 0.6, 6.6, -7.6), WOOD[0], WOOD[1], SOIL[2], 0.8);
      c.save(); c.translate(3.8, -4.2); c.rotate(-Math.PI / 2 + 0.92); for (const px of [-1.0, 0.8]) fishcake(c, px, 0, 0.62, 0.1); c.restore();
      const cup = new Path2D(); cup.moveTo(cx - trx, topY); cup.lineTo(cx - brx, by); cup.ellipse(cx, by, brx, 0.9, 0, Math.PI, 0, true); cup.lineTo(cx + trx, topY); cup.ellipse(cx, topY, trx, tr, 0, 0, Math.PI, false); cup.closePath();
      stk(c, cup, [cx - trx, topY, trx * 2, by - topY + 0.9], { o: DOG[0], b: TEE[2], s: TEE[0], h: HI }, { d: 0.9, hx: 0.3, hy: 0.3,
        under: (x) => { x.fillStyle = "#8fd3ff"; x.beginPath(); x.moveTo(cx - trx, topY + 3.2); x.quadraticCurveTo(cx, topY + 4.6, cx + trx, topY + 3.2); x.lineTo(cx + trx, topY + 4.8); x.quadraticCurveTo(cx, topY + 6.2, cx - trx, topY + 4.8); x.closePath(); x.fill(); } });
      stk(c, EL(cx, topY, trx, tr), [cx - trx, topY - tr, trx * 2, tr * 2], { o: DOG[0], b: TEE[1] }, { d: 0.2, ha: 0 });
      c.fillStyle = SOIL[1]; c.beginPath(); c.ellipse(cx, topY + 0.1, trx - 0.6, tr - 0.4, 0, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.ellipse(cx, topY + 0.1, trx - 0.6, tr - 0.4, 0, 0, TAU); c.clip(); radial(c, cx - 1.6, topY - 0.2, 3.0, SOIL[3], 0.9, 0); c.restore();
      rope(c, seg(cx + 0.4, topY + 0.4, cx + 1.8, topY - 1.0), WOOD[0], WOOD[1], null, 0.8);
      glint(c, cx - 3.2, topY + 2.4, 0.6, 1.5, 0.2);
    },
  };
  const ICON_KEYS = Object.keys(DRAW);

  const CACHE = {};
  function iconURL(key, px) {
    px = Math.max(8, Math.round(px || 84));
    if (!hasDoc || !DRAW[key]) return "";
    const id = key + "@" + px;
    if (CACHE[id] != null) return CACHE[id];
    const cv = document.createElement("canvas"); cv.width = px; cv.height = px;
    const c = cv.getContext("2d");
    if (!c) return "";
    const k = px / U;
    c.setTransform(k, 0, 0, k, px / 2, px / 2); c.lineJoin = "round"; c.lineCap = "round";
    DRAW[key](c);
    return (CACHE[id] = cv.toDataURL("image/png"));
  }

  SA.pocha = Object.assign(SA.pocha || {}, { iconURL, ICON_KEYS });
})(typeof window !== "undefined" ? window : globalThis);
