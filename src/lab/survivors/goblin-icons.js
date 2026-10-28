// @ts-nocheck — 디자인 세션 정본 docs/lab-surv-goblin-icons.js 를 그대로 옮긴 것(tmp/lab-surv/sync-src.sh).
/* 도깨비 퇴치 — 레벨업 카드 아이콘 18종. 그림체는 꿈 양몰이 카드 아이콘(docs/lab-surv-dreamherd-icons.js)과 같고,
 * 색은 docs/lab-defense-artdir.md 3절 48색에서만(도깨비 퇴치 artdir 의 팔레트 규칙) — 장터 살림은 금·빨강, 체는 금빛 테 + 은빛 그물.
 * 카드 뜻: docs/lab-surv-goblin.js. 재료는 장터 살림·설화뿐이고 무속·종교 표지(부적·무당 물건·태극·절)는 그리지 않는다.
 * iconURL(key, px) → 투명 배경 정사각 PNG data URL(기본 84 = 42 CSS × DPR2). 처음 부를 때 구워 캐시. node 에선 "".
 * 좌표: 칸 하나 = 21 단위, 가운데 (0,0), 외곽 포함 ±8.8 안(여백 8 %). 외곽 0.8 단위. 글자 없음. */
(function (root) {
  "use strict";
  const SA = (root.SurvArt = root.SurvArt || {});

  // ── 팔레트(lab-defense-artdir 3절만) ──
  const INK = ["#07060f", "#0e0c1c", "#17142b", "#231e3d", "#322b52", "#463d6b", "#5f5687"]; // 잉크
  const SL = ["#3a3f5c", "#545b7a", "#7880a0", "#a3abc4", "#cdd3e3", "#eef1f8"]; // 슬레이트(은빛·흰 것)
  const GO = ["#3b1d14", "#6e2f1c", "#a8492a", "#e0743a", "#f6a94a", "#ffd86b", "#fff2b8"]; // 금·주황(나무·짚·엽전·살)
  const RD = ["#2e0a1f", "#5c1230", "#9a1d3c", "#d8324a", "#ff5e5b", "#ff9a86"]; // 빨강(팥·장구)
  const PK = ["#3d1145", "#6e1f6e", "#a8329a", "#e050c0", "#ff8be0"]; // 분홍
  const GR = ["#0b2422", "#124638", "#1c7a50", "#36b866", "#7ee87e", "#d4ffb0"]; // 초록(저고리)
  const CY = ["#0b1d3a", "#123a66", "#1a68a0", "#2aa6d6", "#6ee6ff", "#c8fbff"]; // 청록(소리·바람)
  const VI = ["#1e0f3d", "#3a1a6b", "#6232b0", "#9a64f0", "#c9a4ff"]; // 보라(밤)
  const HI = SL[5]; // 반짝임(크림 대신 — 순수 흰색 금지)

  const TAU = Math.PI * 2, U = 21, LW = 0.8;
  const hasDoc = typeof document !== "undefined" && !!document.createElement;
  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + Math.max(0, Math.min(1, a)).toFixed(3) + ")"; }

  // ── 도형 ──
  function rrect(p, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); return p; }
  const RR = (x, y, w, h, r) => rrect(new Path2D(), x, y, w, h, r);
  function EL(cx, cy, rx, ry, rot) { const p = new Path2D(); p.ellipse(cx, cy, rx, ry, rot || 0, 0, TAU); return p; }
  const CI = (cx, cy, r) => EL(cx, cy, r, r);
  function circles(list, p) { p = p || new Path2D(); for (const [x, y, r] of list) { p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); } return p; }
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
  const seg = (x0, y0, x1, y1) => { const P = new Path2D(); P.moveTo(x0, y0); P.lineTo(x1, y1); return P; };

  // ── 칠 ──
  // 스티커(양몰이 아이콘과 같은 순서): 외곽(0번)을 두 배 굵기로 먼저 깔아 바깥 반만 남김 → 바탕 → 오른쪽 아래 그늘 → 왼쪽 위 흐린 하이라이트.
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
  // 바람·소리 같은 선: 짙은 테 + 밝은 속
  function airLine(c, P, core, edge, w) {
    c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = edge; c.lineWidth = (w || 1.1) + 1.1; c.stroke(P);
    c.strokeStyle = core; c.lineWidth = w || 1.1; c.stroke(P);
  }
  function sparkle(c, x, y, r) {
    const P = star(4, r, r * 0.3, x, y);
    c.lineJoin = "round"; c.lineWidth = LW * 1.4; c.strokeStyle = GO[2]; c.stroke(P);
    c.fillStyle = GO[5]; c.fill(P);
    c.save(); c.clip(P); radial(c, x - r * 0.15, y - r * 0.2, r * 0.7, GO[6], 1, 0); c.restore();
  }
  function goldGlow(c, x, y, r, a) { const op = c.globalCompositeOperation; c.globalCompositeOperation = "lighter"; radial(c, x, y, r, GO[5], a, 0); c.globalCompositeOperation = op; }
  function star5(x, y, r, rot) { return star(5, r, r * 0.46, x, y, rot); }
  function goldStar(c, x, y, r, rot) {
    const P = star5(x, y, r, rot);
    c.lineJoin = "round"; c.lineWidth = Math.min(LW * 2, r * 0.6); c.strokeStyle = GO[2]; c.stroke(P);
    c.fillStyle = GO[5]; c.fill(P);
    c.save(); c.clip(P); radial(c, x - r * 0.25, y - r * 0.3, r * 0.8, GO[6], 1, 0); c.restore();
  }

  // ── 장터 살림 도구 ──
  const R_WOOD = { o: GO[0], b: GO[2], s: GO[1], h: GO[4] }; // 나무 그릇·체 테 옆면
  const R_STRAW = { o: GO[1], b: GO[4], s: GO[3], h: GO[6] }; // 짚(짚신·복조리)
  const R_SKIN = { o: GO[1], b: GO[5], s: GO[4], h: GO[6] }; // 살
  const R_COIN = { o: GO[2], b: GO[5], s: GO[4], h: GO[6] }; // 엽전
  const R_BEAN = { o: RD[0], b: RD[3], s: RD[2], h: RD[5] }; // 팥알
  const R_SALT = { o: SL[1], b: SL[4], s: SL[3], h: SL[5] }; // 소금
  // 팥 한 알: 붉은 타원 + 흰 배꼽 줄
  function bean(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot || 0);
    stk(c, EL(0, 0, r * 1.35, r), [-r * 1.35, -r, r * 2.7, r * 2], R_BEAN, { lw: Math.min(LW, r * 0.5), d: r * 0.35, ha: 0.75 });
    c.strokeStyle = HI; c.lineCap = "round"; c.lineWidth = r * 0.32; c.beginPath(); c.moveTo(-r * 0.45, -r * 0.42); c.lineTo(r * 0.35, -r * 0.42); c.stroke();
    c.restore();
  }
  // 엽전: 둥근 몸 + 네모 구멍 + 안쪽 테
  function coin(c, x, y, r, rot) {
    c.save(); c.translate(x, y); c.rotate(rot || 0);
    const P = CI(0, 0, r), hs = r * 0.36; P.rect(-hs, -hs, hs * 2, hs * 2);
    stk(c, P, [-r, -r, r * 2, r * 2], R_COIN, { lw: Math.min(LW, r * 0.3), d: r * 0.28, hr: 0.5 });
    c.lineJoin = "round"; c.lineWidth = Math.min(0.5, r * 0.18); c.strokeStyle = GO[3];
    c.beginPath(); c.arc(0, 0, r * 0.72, 0, TAU); c.stroke(); c.strokeRect(-hs, -hs, hs * 2, hs * 2);
    c.restore();
  }
  // 체(4분의 3 시점): 금빛 나무 테 옆면 → 테 윗면 → 은빛 그물(점 구멍). o: { holes, beans, gold }
  function sieve(c, x, y, s, rot, o) {
    o = o || {};
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s, s);
    const lw = LW / s, rx = 6.6, ry = 3.3, h = 2.0, irx = rx - 1.25, iry = ry - 0.85;
    const band = new Path2D(); band.moveTo(-rx, 0); band.lineTo(-rx, h); band.ellipse(0, h, rx, ry, 0, Math.PI, 0, true); band.lineTo(rx, 0); band.ellipse(0, 0, rx, ry, 0, 0, Math.PI, false); band.closePath();
    stk(c, band, [-rx, 0, rx * 2, ry + h], R_WOOD, { lw, d: 0.5, hy: 0.4, ha: 0.6,
      inner: (x) => { x.strokeStyle = rgba(GO[1], 0.7); x.lineWidth = 0.3; for (const k of [-4.4, -1.6, 1.6, 4.4]) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, ry + h); x.stroke(); } } });
    const RIM = o.gold ? { o: GO[1], b: GO[5], s: GO[4], h: GO[6] } : { o: GO[0], b: GO[4], s: GO[3], h: GO[6] };
    const rim = EL(0, 0, rx, ry); rim.ellipse(0, 0.15, irx, iry, 0, 0, TAU);
    c.lineJoin = "round"; c.lineWidth = lw * 2; c.strokeStyle = RIM.o; c.stroke(EL(0, 0, rx, ry));
    c.fillStyle = RIM.b; c.fill(rim, "evenodd");
    c.save(); c.clip(rim, "evenodd"); radial(c, -rx * 0.45, -ry * 0.55, rx * 0.8, RIM.h, 0.9, 0); c.fillStyle = rgba(RIM.s, 0.85); c.fillRect(-rx, ry * 0.25, rx * 2, ry); c.restore();
    // 그물
    const net = EL(0, 0.15, irx, iry);
    c.fillStyle = SL[3]; c.fill(net);
    c.save(); c.clip(net);
    radial(c, -irx * 0.35, -iry * 0.3, irx * 0.9, SL[5], 0.8, 0);
    c.fillStyle = rgba(SL[1], 0.55); c.fillRect(-irx, -iry - 0.4, irx * 2, 0.9); // 테 그림자
    const sp = o.holes ? 1.75 : 1.05, hr = o.holes ? 0.52 : 0.22;
    for (let gy = -iry; gy <= iry + 0.5; gy += sp * 0.62) for (let gx = -irx; gx <= irx; gx += sp) {
      const ox = (Math.round((gy + iry) / (sp * 0.62)) % 2) * sp * 0.5;
      c.fillStyle = INK[1]; c.beginPath(); c.ellipse(gx + ox, gy + 0.15, hr, hr * 0.62, 0, 0, TAU); c.fill();
    }
    if (o.beans) {
      for (const [bx, by, br, ba] of [[-3.0, 0.3, 0.95, 0.3], [-1.2, -0.7, 1.0, -0.4], [0.8, 0.2, 1.05, 0.6], [2.7, -0.4, 0.95, -0.2], [-1.8, 1.3, 0.95, 0.9], [0.0, 1.5, 1.0, -0.8], [2.0, 1.4, 0.9, 0.2], [-0.2, -1.2, 0.85, 1.2], [3.6, 0.9, 0.8, 0.5], [-3.7, -0.7, 0.8, -0.6]]) bean(c, bx, by, br, ba);
    }
    c.restore();
    c.lineWidth = 0.45; c.strokeStyle = RIM.o; c.stroke(net);
    glint(c, -rx * 0.55, -ry * 0.62, 1.1, 0.4, -0.25);
    c.restore();
  }

  // ── 아이콘 18종 ──
  const DRAW = {
    // 무기
    yeot(c) { // 엿가락 셋: 호박빛 꼬인 막대 + 하얀 가루, 날아가는 줄
      for (const [x0, y0, x1, y1, w] of [[-8.2, 4.8, -5.4, 3.2, 1.0], [-7.4, 7.8, -3.8, 5.8, 1.2]]) airLine(c, seg(x0, y0, x1, y1), GO[6], GO[3], w);
      const sticks = [[-2.2, 0.0, -0.95, R_STRAW], [0.8, 0.0, -0.62, { o: GO[1], b: GO[5], s: GO[4], h: GO[6] }], [2.4, 2.2, -0.3, R_STRAW]];
      for (const [sx, sy, ang, R] of sticks) {
        c.save(); c.translate(sx, sy); c.rotate(ang);
        const L = 5.9, Wd = 1.4, P = RR(-L, -Wd, L * 2, Wd * 2, Wd);
        stk(c, P, [-L, -Wd, L * 2, Wd * 2], R, { d: 0.5, hy: 0.15, hr: 1.2, ha: 0.8,
          inner: (x) => { x.lineCap = "round"; x.strokeStyle = rgba(GO[3], 0.85); x.lineWidth = 0.55; for (let i = -6; i <= 6; i += 1.8) { x.beginPath(); x.moveTo(i - 0.7, Wd); x.lineTo(i + 0.7, -Wd); x.stroke(); }
            x.strokeStyle = rgba(GO[6], 0.95); x.lineWidth = 0.4; x.beginPath(); x.moveTo(-L + 1.2, -Wd * 0.45); x.lineTo(L - 1.4, -Wd * 0.45); x.stroke(); } });
        for (const [dx, dy] of [[-3.6, -0.2], [1.8, 0.5], [4.2, -0.4]]) disc(c, dx, dy, 0.3, HI);
        c.restore();
      }
    },
    chime(c) { // 풍경: 매달린 금빛 종 + 혀 + 바람판, 양옆 소리 호
      for (const s of [-1, 1]) for (const [r, w] of [[2.4, 0.8], [4.2, 0.8]]) { const P = new Path2D(); P.arc(s * 4.6, -0.6, r, s > 0 ? -0.75 : Math.PI - 0.75, s > 0 ? 0.75 : Math.PI + 0.75); airLine(c, P, CY[4], CY[2], w); }
      rope(c, seg(0, -8.6, 0, -6.2), GO[1], GO[3], null, 0.7);
      stk(c, CI(0, -6.6, 1.0), [-1, -7.6, 2, 2], { o: GO[1], b: GO[4], h: GO[6] }, { lw: 0.5 });
      rope(c, seg(0, 2.4, 0, 5.4), GO[1], GO[3], null, 0.5);
      stk(c, RR(-1.6, 4.6, 3.2, 3.8, 1.2), [-1.6, 4.6, 3.2, 3.8], { o: CY[1], b: CY[3], s: CY[2], h: CY[5] }, { lw: 0.6, d: 0.45 });
      const B = new Path2D(); B.moveTo(-4.4, 2.6); B.bezierCurveTo(-4.4, -1.6, -3.8, -5.8, 0, -5.8); B.bezierCurveTo(3.8, -5.8, 4.4, -1.6, 4.4, 2.6); B.quadraticCurveTo(5.4, 3.0, 5.0, 3.8); B.lineTo(-5.0, 3.8); B.quadraticCurveTo(-5.4, 3.0, -4.4, 2.6); B.closePath();
      stk(c, B, [-5.4, -5.8, 10.8, 9.6], { o: GO[1], b: GO[4], s: GO[3], h: GO[6] }, { d: 0.9, hr: 0.5,
        inner: (x) => { x.strokeStyle = GO[2]; x.lineWidth = 0.55; x.beginPath(); x.moveTo(-4.6, 1.6); x.quadraticCurveTo(0, 2.4, 4.6, 1.6); x.stroke(); x.beginPath(); x.moveTo(-4.0, -1.4); x.quadraticCurveTo(0, -0.7, 4.0, -1.4); x.stroke();
          for (const px of [-2.4, 0, 2.4]) disc(x, px, 0.2, 0.42, GO[5]); } });
      disc(c, 0, 4.0, 0.9, GO[1]);
      glint(c, -2.0, -3.6, 1.1, 0.6);
    },
    bean(c) { // 팥 한 줌이 위에서 쏟아짐
      for (const [x0, y0, x1, y1] of [[-5.4, -8.0, -4.0, -4.6], [-0.4, -8.2, 0.4, -5.4], [4.8, -7.8, 4.0, -4.4]]) airLine(c, seg(x0, y0, x1, y1), RD[5], RD[2], 0.8);
      for (const [x, y, r, a] of [[-5.4, 4.6, 1.7, 0.3], [-1.8, 5.8, 1.8, -0.2], [2.0, 5.2, 1.8, 0.5], [5.6, 4.2, 1.6, -0.4], [-3.6, 1.6, 1.8, -0.6], [0.2, 2.2, 1.9, 0.2], [4.0, 1.0, 1.7, 0.9], [-1.6, -1.6, 1.7, 0.7], [2.2, -2.2, 1.6, -0.3]]) bean(c, x, y, r, a);
    },
    jori(c) { // 복조리: 짚으로 엮은 국자 + 붉은 끈, 둘레를 도는 바람
      c.save(); c.setLineDash([1.6, 1.4]); c.lineCap = "round"; c.strokeStyle = CY[3]; c.lineWidth = 0.8;
      c.beginPath(); c.ellipse(0, 1.2, 7.8, 3.2, -0.3, 0, TAU); c.stroke(); c.restore();
      rope(c, seg(2.8, -2.6, 6.8, -7.8), GO[1], GO[4], GO[6], 1.5);
      const body = new Path2D(); body.moveTo(-6.4, -1.6); body.bezierCurveTo(-7.2, 3.6, -4.2, 8.2, -0.6, 8.0); body.bezierCurveTo(3.4, 7.8, 5.2, 2.6, 4.2, -2.8); body.quadraticCurveTo(-1.0, -4.0, -6.4, -1.6); body.closePath();
      stk(c, body, [-7.2, -4, 12.4, 12], R_STRAW, { d: 1.0, hr: 0.5,
        inner: (x) => { x.lineCap = "round"; x.lineWidth = 0.5;
          for (let i = -12; i <= 8; i += 1.7) { x.strokeStyle = rgba(GO[2], 0.85); x.beginPath(); x.moveTo(i, 9); x.lineTo(i + 8, -4); x.stroke(); x.strokeStyle = rgba(GO[3], 0.8); x.beginPath(); x.moveTo(i, -4); x.lineTo(i + 8, 9); x.stroke(); } } });
      const mouth = EL(-1.1, -2.2, 5.2, 1.5, -0.14);
      stk(c, mouth, [-6.3, -3.7, 10.4, 3], { o: GO[1], b: GO[2], s: GO[1] }, { lw: 0.6, d: 0.5 });
      const tie = new Path2D(); tie.moveTo(3.6, -3.4); tie.quadraticCurveTo(5.4, -1.6, 6.2, 0.8); airLine(c, tie, RD[4], RD[1], 0.8);
      const tie2 = new Path2D(); tie2.moveTo(3.6, -3.4); tie2.quadraticCurveTo(6.2, -3.2, 7.4, -1.6); airLine(c, tie2, RD[4], RD[1], 0.8);
      stk(c, CI(3.6, -3.4, 1.0), [2.6, -4.4, 2, 2], { o: RD[1], b: RD[3], h: RD[5] }, { lw: 0.5 });
    },
    salt(c) { // 소금 한 줌: 하얀 결정 무더기 + 흩날리는 알갱이
      const pile = smooth([[-7.6, 6.6], [-6.4, 3.6], [-4.6, 1.4], [-2.4, -1.4], [-0.6, -2.6], [1.0, -2.2], [3.0, 0.2], [5.4, 2.8], [7.4, 6.0], [3.0, 7.4], [-2.0, 7.6]]);
      stk(c, pile, [-7.6, -2.6, 15, 10.2], R_SALT, { d: 0.9, hx: 0.3, hy: 0.25, hr: 0.6,
        inner: (x) => { for (const [px, py, r, a] of [[-4.2, 4.4, 0.7, 0.4], [-1.6, 1.2, 0.6, 0.8], [0.6, 4.6, 0.75, 0.2], [3.2, 3.0, 0.6, 0.6], [-2.6, 6.0, 0.55, 1.0], [4.6, 5.6, 0.6, 0.3], [-0.6, -0.6, 0.5, 0.5], [1.8, 1.4, 0.5, 1.1]]) {
          x.save(); x.translate(px, py); x.rotate(a); x.fillStyle = SL[5]; x.fillRect(-r, -r, r * 2, r * 2); x.strokeStyle = SL[2]; x.lineWidth = 0.3; x.strokeRect(-r, -r, r * 2, r * 2); x.restore(); } } });
      for (const [px, py, r, a] of [[3.6, -4.6, 0.9, 0.5], [6.2, -2.4, 0.75, 0.2], [5.6, -7.0, 0.65, 0.9], [-4.4, -4.2, 0.75, 0.3], [0.8, -7.2, 0.7, 0.7], [-6.6, 0.2, 0.6, 1.0]]) {
        c.save(); c.translate(px, py); c.rotate(a); stk(c, RR(-r, -r, r * 2, r * 2, r * 0.3), [-r, -r, r * 2, r * 2], R_SALT, { lw: 0.5, d: 0.25 }); c.restore();
      }
      sparkle(c, 7.4, -5.0, 1.2); sparkle(c, -2.2, -6.4, 1.0);
    },
    // 보조
    dmg(c) { // 씨름 힘: 불끈 쥔 주먹(정면) + 붉은 샅바 띠 손목, 힘 줄
      goldGlow(c, 0, -1.0, 8.0, 0.35);
      for (let i = 0; i < 5; i++) { const a = -Math.PI * 0.9 + i * (Math.PI * 0.8 / 4) - 0.05 + (i > 1 ? 0.0 : 0), r0 = 6.6, r1 = 7.9; airLine(c, seg(Math.cos(a) * r0, -1.4 + Math.sin(a) * r0 * 0.95, Math.cos(a) * r1, -1.4 + Math.sin(a) * r1 * 0.95), GO[6], GO[3], 0.85); }
      stk(c, RR(-3.4, 3.0, 6.8, 5.8, 1.4), [-3.4, 3, 6.8, 5.8], R_SKIN, { d: 0.6, ha: 0.5 });
      stk(c, RR(-4.0, 4.4, 8.0, 2.6, 0.9), [-4, 4.4, 8, 2.6], { o: RD[0], b: RD[3], s: RD[2], h: RD[5] }, { lw: 0.6, d: 0.45 });
      const fist = circles([[-4.1, -3.5, 1.65], [-1.4, -4.1, 1.75], [1.4, -4.1, 1.75], [4.1, -3.5, 1.65]]); rrect(fist, -5.8, -3.8, 11.6, 8.0, 2.8);
      stk(c, fist, [-5.8, -5.9, 11.6, 10.1], R_SKIN, { d: 0.9, hr: 0.5,
        inner: (x) => { x.strokeStyle = GO[3]; x.lineWidth = 0.5; x.lineCap = "round"; for (const fx of [-2.75, 0, 2.75]) { x.beginPath(); x.moveTo(fx, -4.6); x.lineTo(fx, -1.0); x.stroke(); } } });
      stk(c, RR(-5.2, -1.0, 8.2, 2.9, 1.45), [-5.2, -1, 8.2, 2.9], R_SKIN, { lw: 0.65, d: 0.5, hr: 0.7 });
      for (const fx of [-4.1, -1.4, 1.4, 4.1]) glint(c, fx - 0.5, -4.6, 0.55, 0.32);
    },
    cd(c) { // 장터 장단: 붉은 장구 + 채, 장단 소리
      for (const [r, w] of [[2.0, 0.75], [3.4, 0.75]]) { const P = new Path2D(); P.arc(5.0, -4.6, r, -1.5, 0.1); airLine(c, P, CY[4], CY[2], w); }
      for (const s of [-1, 1]) {
        const hx = s * 5.4;
        stk(c, EL(hx, 1.2, 2.0, 5.6), [hx - 2, -4.4, 4, 11.2], { o: GO[1], b: GO[3], s: GO[2], h: GO[5] }, { lw: LW, d: 0.6 });
      }
      const body = new Path2D(); body.moveTo(-5.4, -4.2); body.quadraticCurveTo(0, -0.6, 5.4, -4.2); body.lineTo(5.4, 6.6); body.quadraticCurveTo(0, 3.0, -5.4, 6.6); body.closePath();
      stk(c, body, [-5.4, -4.2, 10.8, 10.8], R_BEAN, { d: 0.9, hy: 0.3, hr: 0.6,
        inner: (x) => { x.strokeStyle = GO[5]; x.lineWidth = 0.45; x.lineCap = "round"; x.beginPath();
          for (let i = 0; i <= 6; i++) { const t = i / 6, yy = -3.4 + t * 9.2; x.moveTo(-5.4, yy); x.lineTo(5.4, yy + (i % 2 ? -1.2 : 1.2)); } x.stroke(); } });
      stk(c, EL(5.4, 1.2, 1.5, 5.0), [3.9, -3.8, 3, 10], { o: SL[1], b: SL[5], s: SL[3], h: SL[5] }, { lw: 0.6, d: 0.4 });
      c.lineWidth = 0.5; c.strokeStyle = GO[2]; c.beginPath(); c.ellipse(5.4, 1.2, 1.1, 4.4, 0, 0, TAU); c.stroke();
      stk(c, EL(-5.4, 1.2, 1.0, 5.0), [-6.4, -3.8, 2, 10], { o: SL[1], b: SL[4], s: SL[3] }, { lw: 0.6, d: 0.3 });
      rope(c, seg(7.4, -7.4, 5.6, -0.6), GO[0], GO[3], GO[5], 0.9);
      stk(c, CI(7.2, -7.2, 1.0), [6.2, -8.2, 2, 2], { o: GO[0], b: GO[4], h: GO[6] }, { lw: 0.5 });
    },
    area(c) { // 넓은 소매: 색동 소매 + 넓어지는 호
      for (const [r, a] of [[7.6, 0.9], [9.4, 0.7]]) { c.save(); c.setLineDash([1.4, 1.2]); c.lineCap = "round"; c.strokeStyle = GO[4]; c.lineWidth = 0.8; c.beginPath(); c.arc(-2.6, -2.0, r, 0.25 - a * 0.5, 0.25 + a * 0.5 + 0.6); c.stroke(); c.restore(); }
      const S = new Path2D(); S.moveTo(-8.2, -6.6); S.lineTo(3.2, -6.6); S.lineTo(5.0, -5.6); S.quadraticCurveTo(6.6, 3.0, 2.4, 6.8); S.quadraticCurveTo(-3.4, 8.4, -6.4, 3.6); S.quadraticCurveTo(-8.0, -0.6, -8.2, -2.6); S.closePath();
      const bands = [RD[4], GO[5], CY[4], PK[4], GR[4]];
      stk(c, S, [-8.2, -6.6, 14.8, 14.6], { o: INK[3], b: bands[0], s: INK[3], sa: 0.35, h: SL[5] }, { d: 0.9, hr: 0.4, ha: 0.55,
        under: (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = bands[i % 5]; x.fillRect(-8.6 + i * 2.0, -7, 2.0, 16); } } });
      const cuff = new Path2D(); cuff.moveTo(3.2, -6.6); cuff.lineTo(5.0, -5.6); cuff.quadraticCurveTo(6.6, 3.0, 2.4, 6.8); cuff.lineTo(0.8, 5.8); cuff.quadraticCurveTo(4.4, 2.2, 3.2, -6.6); cuff.closePath();
      stk(c, cuff, [0.8, -6.6, 5.8, 13.4], { o: INK[3], b: SL[5], s: SL[3] }, { lw: 0.6, d: 0.4 });
      stk(c, RR(-8.6, -7.6, 3.4, 5.8, 1.2), [-8.6, -7.6, 3.4, 5.8], { o: GR[0], b: GR[3], s: GR[2], h: GR[5] }, { lw: 0.6, d: 0.4 });
    },
    move(c) { // 짚신 + 빠른 바람
      for (const [x0, y0, x1, y1, w] of [[-8.6, -1.0, -4.8, -2.6, 1.0], [-8.4, 3.4, -3.6, 1.0, 1.2], [-6.2, 7.2, -2.0, 4.8, 1.0]]) airLine(c, seg(x0, y0, x1, y1), CY[5], CY[2], w);
      c.save(); c.translate(1.6, -0.4); c.rotate(-0.62);
      const sole = smooth([[-7.0, 0], [-6.2, -2.4], [-2.6, -2.7], [2.6, -3.2], [6.2, -2.8], [7.6, 0], [6.2, 2.8], [2.6, 3.2], [-2.6, 2.7], [-6.2, 2.4]]);
      stk(c, sole, [-7.8, -3, 15.6, 6], R_STRAW, { d: 0.7, hr: 0.5,
        inner: (x) => { x.lineCap = "round"; x.strokeStyle = rgba(GO[2], 0.9); x.lineWidth = 0.45; for (let i = -6.6; i <= 7; i += 1.3) { x.beginPath(); x.moveTo(i, -3); x.lineTo(i, 3); x.stroke(); }
          x.strokeStyle = rgba(GO[6], 0.8); x.lineWidth = 0.35; x.beginPath(); x.moveTo(-6.6, -0.2); x.lineTo(7.0, -0.2); x.stroke(); } });
      c.lineCap = "round";
      for (const sx of [-3.0, 2.4]) for (const sy of [-1, 1]) { const P = new Path2D(); P.moveTo(sx - 0.9, sy * 2.6); P.quadraticCurveTo(sx, sy * 4.4, sx + 0.9, sy * 2.6); rope(c, P, GO[1], GO[4], null, 0.6); }
      const toe = new Path2D(); toe.moveTo(5.6, -2.0); toe.quadraticCurveTo(2.4, 0, 5.6, 2.0); rope(c, toe, GO[1], GO[5], null, 0.8);
      const heel = new Path2D(); heel.moveTo(-6.0, -1.8); heel.quadraticCurveTo(-8.6, 0, -6.0, 1.8); rope(c, heel, GO[1], GO[5], null, 0.8);
      c.restore();
    },
    hp(c) { // 팥죽 한 그릇: 나무 그릇에 큰 하트가 담김(체력 위)
      const rimY = 1.4, rx = 7.6, ry = 2.2;
      stk(c, EL(0, rimY, rx, ry), [-rx, rimY - ry, rx * 2, ry * 2], R_WOOD, { d: 0.4, ha: 0 });
      c.fillStyle = RD[1]; c.beginPath(); c.ellipse(0, rimY + 0.2, rx - 0.9, ry - 0.6, 0, 0, TAU); c.fill();
      sparkle(c, -6.8, -5.8, 1.4); sparkle(c, 6.6, -7.0, 1.1);
      const H = heartP(0, -2.6, 1.5);
      stk(c, H, [-5.1, -8.6, 10.2, 11.2], { o: RD[1], b: RD[4], s: RD[3], h: RD[5] }, { d: 1.0, hr: 0.5 });
      glint(c, -2.3, -5.6, 1.2, 0.7);
      const front = new Path2D(); front.moveTo(-rx, rimY); front.bezierCurveTo(-rx + 0.4, rimY + 4.6, -3.6, rimY + 5.8, 0, rimY + 5.8); front.bezierCurveTo(3.6, rimY + 5.8, rx - 0.4, rimY + 4.6, rx, rimY); front.ellipse(0, rimY, rx, ry, 0, 0, Math.PI, false); front.closePath();
      stk(c, front, [-rx, rimY, rx * 2, 5.8], R_WOOD, { d: 0.8, hy: 0.35, hr: 0.5, ha: 0.75,
        inner: (x) => { x.strokeStyle = rgba(GO[4], 0.8); x.lineWidth = 0.45; x.beginPath(); x.ellipse(0, rimY + 0.3, rx - 0.5, ry - 0.2, 0, 0.15, Math.PI - 0.15); x.stroke(); } });
      stk(c, RR(-3.0, rimY + 5.2, 6.0, 1.8, 0.7), [-3, rimY + 5.2, 6, 1.8], R_WOOD, { lw: 0.6, d: 0.4, ha: 0 });
    },
    magnet(c) { // 엽전 꾸러미: 붉은 끈에 꿴 엽전 + 끌려오는 엽전
      for (const [x0, y0, x1, y1] of [[8.6, -1.6, 6.2, -1.0], [8.4, 3.6, 6.0, 2.6]]) airLine(c, seg(x0, y0, x1, y1), GO[6], GO[3], 0.75);
      airLine(c, seg(-7.4, -7.4, 4.6, 4.6), RD[4], RD[1], 0.9);
      for (const [x, y] of [[-4.8, -4.8], [-2.2, -2.2], [0.4, 0.4], [3.0, 3.0]]) coin(c, x, y, 2.9, 0.78);
      const T = new Path2D(); T.moveTo(4.8, 4.8); T.quadraticCurveTo(6.2, 7.4, 5.2, 8.6); T.moveTo(4.8, 4.8); T.quadraticCurveTo(7.6, 6.0, 8.4, 7.6); airLine(c, T, RD[4], RD[1], 0.8);
      stk(c, CI(-7.6, -7.6, 1.0), [-8.6, -8.6, 2, 2], { o: RD[1], b: RD[3], h: RD[5] }, { lw: 0.5 });
      coin(c, 6.2, -5.4, 2.0, 0.3);
      sparkle(c, 7.6, -1.4, 1.0);
    },
    // 체
    more(c) { // 체 하나 더: 체 둘
      sieve(c, 2.8, -3.4, 0.74);
      sieve(c, -1.6, 1.9, 0.94);
      sparkle(c, -6.6, -5.4, 1.5);
    },
    holes(c) { // 구멍 많은 체: 굵은 구멍 + 끌려오는 도깨비불
      for (const [x, y, r] of [[-5.4, -6.6, 1.3], [0.4, -7.8, 1.05], [5.6, -6.4, 1.2]]) {
        const op = c.globalCompositeOperation; c.globalCompositeOperation = "lighter"; radial(c, x, y, r * 2.2, CY[4], 0.5, 0); c.globalCompositeOperation = op;
        stk(c, CI(x, y, r), [x - r, y - r, r * 2, r * 2], { o: CY[2], b: CY[4], h: CY[5] }, { lw: 0.5 });
        airLine(c, seg(x * 0.75, y + 1.9, x * 0.6, y + 3.2), CY[5], CY[3], 0.6);
      }
      sieve(c, 0, 0.8, 1.16, 0, { holes: true });
    },
    shake(c) { // 체 털기: 기운 체 + 터지는 줄 + 먼지
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * 0.95 + i * (Math.PI * 1.9 / 6) + 0.2, r0 = 6.6, r1 = 8.6;
        if (Math.sin(a) > 0.55) continue;
        airLine(c, seg(Math.cos(a) * r0, -0.6 + Math.sin(a) * r0 * 0.9, Math.cos(a) * r1, -0.6 + Math.sin(a) * r1 * 0.9), GO[6], GO[3], 0.8);
      }
      for (const [x, y, r] of [[-7.0, 5.6, 1.2], [6.8, 5.0, 1.1], [-4.4, 7.4, 0.9], [4.6, 7.6, 0.8], [0.4, -7.2, 0.9]]) stk(c, CI(x, y, r), [x - r, y - r, r * 2, r * 2], { o: SL[2], b: SL[4], h: SL[5] }, { lw: 0.45 });
      for (const s of [-1, 1]) { const P = new Path2D(); P.moveTo(s * 7.4, -4.4); P.quadraticCurveTo(s * 8.8, -1.6, s * 7.6, 1.2); airLine(c, P, CY[4], CY[2], 0.7); }
      sieve(c, 0, -0.2, 0.94, -0.32);
    },
    beans(c) { // 팥 체: 털고 난 체에 팥이 수북 + 바닥에 남은 팥
      for (const [x, y, r, a] of [[-6.6, 7.0, 1.3, 0.4], [-3.6, 7.8, 1.2, -0.3], [5.0, 7.4, 1.3, 0.6], [7.2, 5.4, 1.1, -0.5], [1.2, 8.2, 1.1, 0.1]]) bean(c, x, y, r, a);
      sieve(c, 0, -1.4, 1.08, 0, { beans: true });
    },
    quick(c) { // 부지런한 손: 펼친 손 + 빠른 줄 + 작은 체
      for (const [x0, y0, x1, y1, w] of [[-8.8, -3.4, -6.2, -4.8, 0.9], [-8.6, 0.4, -5.6, -0.8, 1.1], [-8.0, 3.8, -5.6, 2.8, 0.9]]) airLine(c, seg(x0, y0, x1, y1), CY[5], CY[2], w);
      sieve(c, 4.0, 5.2, 0.62);
      c.save(); c.translate(0.4, -0.4); c.rotate(0.28);
      const hand = new Path2D();
      rrect(hand, -3.4, -2.2, 6.6, 6.4, 2.6);
      for (const [fx, top] of [[-2.65, -6.4], [-0.9, -7.4], [0.85, -7.1], [2.5, -5.8]]) rrect(hand, fx - 0.8, top, 1.6, 6.0, 0.8);
      c.save(); c.translate(-3.0, 1.4); c.rotate(-0.75); rrect(hand, -0.85, -4.6, 1.7, 5.0, 0.85); c.restore();
      stk(c, hand, [-5, -7.4, 8.2, 11.6], R_SKIN, { d: 0.8, hx: 0.4, hy: 0.35, hr: 0.5,
        inner: (x) => { x.strokeStyle = GO[3]; x.lineWidth = 0.4; x.lineCap = "round"; for (const fx of [-1.78, -0.02, 1.68]) { x.beginPath(); x.moveTo(fx, -4.6); x.lineTo(fx, -1.6); x.stroke(); } } });
      stk(c, RR(-3.8, 3.6, 7.4, 3.0, 1.0), [-3.8, 3.6, 7.4, 3], { o: GR[0], b: GR[3], s: GR[2], h: GR[5] }, { lw: 0.6, d: 0.4,
        inner: (x) => { x.fillStyle = RD[4]; x.fillRect(-3.8, 5.6, 7.4, 1.0); } });
      c.restore();
      glint(c, -0.8, -2.2, 0.9, 0.5);
    },
    // 기타
    evo(c) { // 진화: 밤하늘 원 + 금별 + 세는 팥알 점
      stk(c, CI(0, 0, 8.0), [-8, -8, 16, 16], { o: INK[1], b: INK[3], s: INK[2], sa: 0.7, h: VI[2] }, { d: 1.2, ha: 0.7 });
      goldGlow(c, 0, 0.4, 7.4, 0.7);
      goldStar(c, 0, 0.6, 5.6, 0);
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + Math.PI / 5 + (i * TAU) / 5; disc(c, Math.cos(a) * 6.3, 0.6 + Math.sin(a) * 6.3, 0.85, RD[4]); disc(c, Math.cos(a) * 6.3 - 0.25, 0.35 + Math.sin(a) * 6.3, 0.3, RD[5]); }
      glint(c, -1.4, -1.4, 0.8, 0.5);
      sparkle(c, 6.8, -6.6, 1.8);
      sparkle(c, -6.8, 6.2, 1.3);
    },
    heal(c) { // 따뜻한 팥죽(줍는 것): 하얀 사발 + 새알심 + 숟가락 + 김
      for (const x0 of [-3.6, 0.0, 3.4]) { const P = new Path2D(); P.moveTo(x0, -2.6); P.bezierCurveTo(x0 - 1.6, -4.2, x0 + 1.6, -5.6, x0, -7.8); airLine(c, P, SL[5], SL[2], 0.85); }
      const rimY = -0.4, rx = 7.4, ry = 2.0;
      stk(c, EL(0, rimY, rx, ry), [-rx, rimY - ry, rx * 2, ry * 2], { o: SL[1], b: SL[4] }, { d: 0.3 });
      c.fillStyle = RD[2]; c.beginPath(); c.ellipse(0, rimY + 0.15, rx - 0.85, ry - 0.55, 0, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.ellipse(0, rimY + 0.15, rx - 0.85, ry - 0.55, 0, 0, TAU); c.clip(); radial(c, -2.6, rimY - 0.6, 4.0, RD[3], 0.9, 0); c.restore();
      for (const [x, y] of [[-3.4, rimY + 0.1], [-0.8, rimY - 0.5], [1.8, rimY + 0.4]]) { disc(c, x, y, 0.85, SL[3]); disc(c, x - 0.15, y - 0.15, 0.62, SL[5]); }
      rope(c, seg(3.4, rimY - 0.2, 7.6, -6.6), GO[1], GO[4], GO[6], 1.1);
      stk(c, EL(3.4, rimY, 1.4, 0.7, -0.9), [2, rimY - 0.7, 2.8, 1.4], { o: GO[1], b: GO[4] }, { lw: 0.5 });
      const front = new Path2D(); front.moveTo(-rx, rimY); front.bezierCurveTo(-rx + 0.6, rimY + 5.6, -3.4, rimY + 7.2, 0, rimY + 7.2); front.bezierCurveTo(3.4, rimY + 7.2, rx - 0.6, rimY + 5.6, rx, rimY); front.ellipse(0, rimY, rx, ry, 0, 0, Math.PI, false); front.closePath();
      stk(c, front, [-rx, rimY, rx * 2, 7.2], { o: SL[1], b: SL[5], s: SL[3], h: SL[5] }, { d: 0.9, hy: 0.3,
        inner: (x) => { x.strokeStyle = CY[2]; x.lineWidth = 0.7; x.beginPath(); x.moveTo(-rx, rimY + 3.0); x.quadraticCurveTo(0, rimY + 5.0, rx, rimY + 3.0); x.stroke();
          x.strokeStyle = CY[3]; x.lineWidth = 0.4; x.beginPath(); x.moveTo(-rx, rimY + 3.9); x.quadraticCurveTo(0, rimY + 5.9, rx, rimY + 3.9); x.stroke(); } });
      stk(c, RR(-2.8, rimY + 6.6, 5.6, 1.6, 0.6), [-2.8, rimY + 6.6, 5.6, 1.6], { o: SL[1], b: SL[4], s: SL[3] }, { lw: 0.6, d: 0.3 });
      glint(c, -5.0, rimY + 2.0, 0.9, 1.4, 0.3);
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

  SA.goblin = Object.assign(SA.goblin || {}, { iconURL, ICON_KEYS });
})(typeof window !== "undefined" ? window : globalThis);
