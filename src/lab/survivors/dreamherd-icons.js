// @ts-nocheck — 디자인 세션 정본 docs/lab-surv-dreamherd-icons.js 를 그대로 옮긴 것(tmp/lab-surv/sync-src.sh).
/* 코코의 꿈 양몰이 — 레벨업 카드 아이콘 18종. 그림체는 코코의 하루 HD 아이콘(docs/lab-surv-coco-hd-art-icons.js)과 같고,
 * 색은 HD artdir 3절 표에서만 — 밤 식구로 보이게 남보라(저녁)·별 금빛·분홍 고깔을 섞는다. 카드 뜻: docs/lab-surv-dreamherd.js.
 * iconURL(key, px) → 투명 배경 정사각 PNG data URL(기본 84 = 42 CSS × DPR2). 처음 부를 때 구워 캐시. node 에선 "".
 * 좌표: 칸 하나 = 21 단위, 가운데 (0,0), 외곽 포함 ±8.8 안(여백 8 %). 외곽 0.8 단위. 글자 없음. */
(function (root) {
  "use strict";
  const SA = (root.SurvArt = root.SurvArt || {});

  // ── 팔레트(artdir 3절 표에서만) ──
  const C = ["#5e2a16", "#8e4526", "#b8643a", "#d98a5a", "#f2b98a"]; // 코코 털
  const K = ["#c9a27a", "#e8c9a0", "#f6e3c4", "#fff4e3"]; // 크림
  const I = ["#24161d", "#3a2228", "#5a3a42"]; // 눈·코
  const S = ["#fff6e8", "#fffbf4"]; // 반짝임
  const T = ["#d9546a", "#f07a8a", "#ffb3bd"]; // 혀·볼
  const TEAL = ["#1f8f86", "#2fb5a8", "#7fe0d4"];
  const PUR = ["#6a3fb8", "#8b5cd6", "#b99af0"];
  const FL = ["#ffd166", "#ff8fb1"];
  const GR = ["#2f7d4a", "#47a35a", "#6cc46a", "#9bdc7c", "#cdeea0"];
  const DI = ["#b98d5e", "#d9b27f", "#ecd3a6", "#f7e8c8"];
  const WOOD = ["#7a4a2a", "#a8693e"];
  const BRASS = ["#a8742a", "#e0a640", "#ffcf4d", "#ffe9a3"];
  const BTN = ["#c43a48", "#ff5d5d"];
  const GOLD = ["#ffd36b", "#fff0b8"];
  const WIND = "#e9fbff";
  const MZ = [C[0], C[1], C[3], K[2], C[4]]; // 주둥이(코코 리그와 같은 줄)
  const EARTIP = [C[0], K[0], K[1], K[2], K[3]];

  const TAU = Math.PI * 2, U = 21, LW = 0.8;
  const hasDoc = typeof document !== "undefined" && !!document.createElement;
  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + Math.max(0, Math.min(1, a)).toFixed(3) + ")"; }

  // ── 도형 ──
  function rrect(p, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); return p; }
  const RR = (x, y, w, h, r) => rrect(new Path2D(), x, y, w, h, r);
  function EL(cx, cy, rx, ry, rot) { const p = new Path2D(); p.ellipse(cx, cy, rx, ry, rot || 0, 0, TAU); return p; }
  const CI = (cx, cy, r) => EL(cx, cy, r, r);
  function circles(list, p) { p = p || new Path2D(); for (const [x, y, r] of list) { p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); } return p; }
  function polar(cx, cy, rx, ry, n, rf) {
    const out = [];
    for (let i = 0; i < n; i++) { const a = -Math.PI + (i / n) * TAU, f = rf ? rf(a) : 1; out.push([cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f]); }
    return out;
  }
  function cr(pts, per) {
    const out = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      for (let j = 0; j < per; j++) {
        const t = j / per, t2 = t * t, t3 = t2 * t, f = (k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
        out.push([f(0), f(1)]);
      }
    }
    return out;
  }
  function resample(d, sp) {
    const n = d.length, cum = [0];
    for (let i = 1; i <= n; i++) { const a = d[i - 1], b = d[i % n]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const L = cum[n], m = Math.max(6, Math.round(L / sp)), out = [];
    let j = 0;
    for (let i = 0; i < m; i++) {
      const s = (i / m) * L;
      while (cum[j + 1] < s) j++;
      const a = d[j], b = d[(j + 1) % n], u = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
      out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
    }
    return out;
  }
  function area(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
  function scallop(p, bump) {
    const P = new Path2D(), n = p.length, sg = area(p) >= 0 ? 1 : -1;
    P.moveTo(p[0][0], p[0][1]);
    for (let i = 0; i < n; i++) {
      const a = p[i], b = p[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1];
      P.quadraticCurveTo((a[0] + b[0]) / 2 + sg * dy * bump * 2, (a[1] + b[1]) / 2 - sg * dx * bump * 2, b[0], b[1]);
    }
    P.closePath();
    return P;
  }
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
  const shape = (pts, sp, bump) => { const r = resample(cr(pts, 10), sp); return bump ? scallop(r, bump) : smooth(r); };
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

  // ── 칠 ──
  // 스티커(세상 그림과 같은 순서): 외곽(0번)을 두 배 굵기로 먼저 깔아 바깥 반만 남김 → 바탕 → 오른쪽 아래 그늘 → 왼쪽 위 흐린 하이라이트.
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
  // 털(코코 리그와 같은 칠): 그늘(1) → 바탕(2, 왼쪽 위로 밀어 초승달) → 하이라이트(4) → 곱슬 결(3) → 외곽(0)
  function paint(c, P, ramp, o) {
    const sh = o.sh || [0.7, 0.8];
    c.save();
    c.fillStyle = ramp[1]; c.fill(P); c.clip(P);
    c.save(); c.translate(-sh[0], -sh[1]); c.fillStyle = ramp[2]; c.fill(P); c.restore();
    const hx = o.cx - o.rx * 0.36, hy = o.cy - o.ry * 0.42, hr = Math.max(o.rx, o.ry) * (o.hr || 0.8), ha = o.ha == null ? 0.8 : o.ha;
    const g = c.createRadialGradient(hx, hy, 0, hx, hy, hr);
    g.addColorStop(0, rgba(ramp[4], ha)); g.addColorStop(0.5, rgba(ramp[4], ha * 0.35)); g.addColorStop(1, rgba(ramp[4], 0));
    c.fillStyle = g; c.fillRect(o.cx - o.rx - 3, o.cy - o.ry - 3, o.rx * 2 + 6, o.ry * 2 + 6);
    if (o.curls) {
      c.strokeStyle = ramp[3]; c.lineWidth = o.cw || 0.42; c.lineCap = "round";
      for (const q of o.curls) { c.beginPath(); c.arc(q[0], q[1], q[2], q[3] == null ? 3.5 : q[3], q[4] == null ? 5.9 : q[4]); c.stroke(); }
    }
    if (o.extra) o.extra(c);
    c.restore();
    c.lineJoin = "round"; c.lineWidth = o.inner ? 0.5 : o.line || LW; c.strokeStyle = o.inner ? ramp[1] : ramp[0]; c.stroke(P);
  }
  function radial(c, x, y, r, hex, a0, a1) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(hex, a0)); g.addColorStop(1, rgba(hex, a1 || 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function disc(c, x, y, r, col) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = col; c.fill(); }
  function glint(c, x, y, rx, ry, a) { c.fillStyle = S[1]; c.beginPath(); c.ellipse(x, y, rx, ry, a == null ? -0.6 : a, 0, TAU); c.fill(); }
  // 굵은 선 스티커: 0번 테 → 바탕 → 밝은 결
  function rope(c, P, o, b, h, w) {
    c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = o; c.lineWidth = w + LW * 2; c.stroke(P);
    c.strokeStyle = b; c.lineWidth = w; c.stroke(P);
    if (h) { c.save(); c.translate(-w * 0.12, -w * 0.16); c.strokeStyle = h; c.lineWidth = w * 0.3; c.stroke(P); c.restore(); }
  }
  function eye(c, x, y, r) {
    disc(c, x, y, r, I[0]);
    c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip(); radial(c, x + 0.2 * r, y + r * 0.85, r * 0.9, I[2], 0.95, 0); c.restore();
    disc(c, x - 0.38 * r, y - 0.38 * r, r * 0.4, S[1]);
  }
  function blush(c, x, y, r) { c.fillStyle = rgba(T[2], 0.7); c.beginPath(); c.ellipse(x, y, r, r * 0.62, 0, 0, TAU); c.fill(); }
  // 코코 귀(리그의 EAR 꼴): 축 = 윗끝, 아래로 len
  const EAR = [[0, -0.9], [1.5, 0.2], [2.0, 3.0], [2.2, 6.0], [1.7, 8.2], [0, 9.1], [-1.7, 8.5], [-2.2, 6.0], [-1.9, 2.6], [-1.3, 0.2]];
  function ear(c, x, y, s, rot, os) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s, s);
    const P = shape(EAR, 0.95, 0.2), ty = 9.1;
    paint(c, P, C, { cx: 0, cy: ty * 0.4, rx: 2.1, ry: ty * 0.55, sh: [0.6, 0.4], ha: 0.6, line: LW / (s * (os || 1)), curls: [[-0.6, ty * 0.3, 0.6], [0.6, ty * 0.5, 0.55]],
      extra: (c) => {
        const tip = shape(polar(0, ty * 0.9, 2.7, 2.1, 14), 0.85, 0.16);
        c.fillStyle = EARTIP[1]; c.fill(tip);
        c.save(); c.clip(tip); c.translate(-0.4, -0.45); c.fillStyle = EARTIP[2]; c.fill(tip); c.restore();
        c.save(); c.clip(tip); radial(c, -0.6, ty * 0.84, 1.5, EARTIP[4], 0.8, 0); c.restore();
        c.strokeStyle = C[1]; c.lineWidth = 0.4; c.stroke(tip);
      } });
    c.restore();
  }
  // 바람·냄새 같은 선: 짙은 테 + 밝은 속
  function airLine(c, P, core, edge, w) {
    c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = edge; c.lineWidth = (w || 1.1) + 1.1; c.stroke(P);
    c.strokeStyle = core; c.lineWidth = w || 1.1; c.stroke(P);
  }
  function sparkle(c, x, y, r) {
    const P = star(4, r, r * 0.3, x, y);
    c.lineJoin = "round"; c.lineWidth = LW * 1.4; c.strokeStyle = BRASS[0]; c.stroke(P);
    c.fillStyle = FL[0]; c.fill(P);
    c.save(); c.clip(P); radial(c, x - r * 0.15, y - r * 0.2, r * 0.7, GOLD[1], 1, 0); c.restore();
  }
  function goldGlow(c, x, y, r, a) { const op = c.globalCompositeOperation; c.globalCompositeOperation = "lighter"; radial(c, x, y, r, GOLD[0], a, 0); c.globalCompositeOperation = op; }
  // 발바닥(패드 + 발가락 넷), 위가 발끝
  function paw(c, x, y, s, rot, alpha, lwW) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s, s); if (alpha != null) c.globalAlpha = alpha;
    const R = { o: C[0], b: C[2], s: C[1], h: C[4] }, lw = (lwW || LW) / s;
    const pad = smooth([[-2.7, 1.6], [-1.5, -0.3], [0, -0.8], [1.5, -0.3], [2.7, 1.6], [2.0, 3.3], [0, 3.0], [-2.0, 3.3]]);
    stk(c, pad, [-2.7, -0.8, 5.4, 4.1], R, { lw, d: 0.45, ha: 0.7 });
    for (const [tx, ty, tr] of [[-2.75, -2.0, -0.45], [-0.95, -3.35, -0.15], [0.95, -3.35, 0.15], [2.75, -2.0, 0.45]])
      stk(c, EL(tx, ty, 0.95, 1.2, tr), [tx - 0.95, ty - 1.2, 1.9, 2.4], R, { lw, d: 0.3, ha: 0.6 });
    c.restore();
  }
  // 개껌(세상 그림의 개껌 줍기 꼴을 크게): 뼈 꼴 + 꼬임 줄
  function chewStick(c, x, y, s, rot) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    const L = 7.0, p = circles([[-L, -1.3, 1.85], [-L, 1.3, 1.85], [L, -1.3, 1.85], [L, 1.3, 1.85]]); rrect(p, -L - 0.2, -1.9, (L + 0.2) * 2, 3.8, 1.7);
    stk(c, p, [-L - 1.85, -3.15, (L + 1.85) * 2, 6.3], { o: WOOD[0], b: DI[1], s: DI[0], h: DI[3] }, {
      lw: LW / s, d: 0.8, hy: 0.2, hr: 0.6,
      inner: (x) => {
        x.lineCap = "round";
        for (let i = -4; i <= 4; i++) {
          x.strokeStyle = rgba(WOOD[1], 0.75); x.lineWidth = 0.55; x.beginPath(); x.moveTo(i * 1.55 - 0.9, 1.9); x.lineTo(i * 1.55 + 0.9, -1.9); x.stroke();
          x.strokeStyle = rgba(DI[3], 0.9); x.lineWidth = 0.35; x.beginPath(); x.moveTo(i * 1.55 - 0.2, 1.5); x.lineTo(i * 1.55 + 1.2, -1.5); x.stroke();
        }
      },
    });
    c.restore();
  }
  function bone(c, x, y, s, rot) { // 크림 뼈 간식
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s, s);
    const p = circles([[-1.9, -0.75, 0.95], [-1.9, 0.75, 0.95], [1.9, -0.75, 0.95], [1.9, 0.75, 0.95]]); rrect(p, -2.0, -0.7, 4.0, 1.4, 0.6);
    stk(c, p, [-2.85, -1.7, 5.7, 3.4], { o: K[0], b: K[3], s: K[1] }, { lw: LW / s, d: 0.35 });
    c.restore();
  }

  // ── 밤 식구 도구 ──
  const EVE = ["#3d3a7a", "#2a2858"]; // 저녁(남보라)
  const DUSK = ["#ffb38a", "#ff8fa3"]; // 노을 — 고깔 분홍
  const RB = ["#b9a6ff", "#8fe3ff", "#ffd1f0"]; // 무지개(솜털양 분홍)
  const BUB = ["#9ec9ee", "#cfe8fb", "#eef8ff"]; // 거품(꿈양 하늘빛)
  const CAP = { o: T[0], b: DUSK[1], s: T[1], h: T[2] };
  function star5(x, y, r, rot) { return star(5, r, r * 0.46, x, y, rot); }
  function goldStar(c, x, y, r, rot) {
    const P = star5(x, y, r, rot);
    c.lineJoin = "round"; c.lineWidth = Math.min(LW * 2, r * 0.6); c.strokeStyle = BRASS[0]; c.stroke(P);
    c.fillStyle = FL[0]; c.fill(P);
    c.save(); c.clip(P); radial(c, x - r * 0.25, y - r * 0.3, r * 0.8, GOLD[1], 1, 0); c.restore();
  }
  function moonP(x, y, r) { // 오른쪽이 열린 초승달
    const a0 = Math.PI * 0.28, a1 = Math.PI * 1.72, P = new Path2D();
    const p1 = [x + r * Math.cos(a0), y + r * Math.sin(a0)], p2 = [x + r * Math.cos(a1), y + r * Math.sin(a1)];
    const ix = x + r * 0.55, ir = Math.hypot(p1[0] - ix, p1[1] - y);
    P.arc(x, y, r, a0, a1); P.arc(ix, y, ir, Math.atan2(p2[1] - y, p2[0] - ix), Math.atan2(p1[1] - y, p1[0] - ix), true); P.closePath();
    return P;
  }
  function moon(c, x, y, r) { const P = moonP(x, y, r); stk(c, P, [x - r, y - r, r * 2, r * 2], { o: BRASS[0], b: FL[0], h: GOLD[1] }, { lw: Math.min(LW, r * 0.22) }); }
  // 코코 옆얼굴(오른쪽 보기) + 분홍 별무늬 고깔. o: { eyes: "open"|"closed", mouth, cap }
  function cocoHead(c, x, y, s, o) {
    o = o || {};
    c.save(); c.translate(x, y); c.scale(s, s);
    const lw = LW / s, rf = (a) => 1 + 0.1 * Math.exp(-Math.pow(a + 1.85, 2) / 0.35);
    paint(c, shape(polar(-1.2, 0, 5.2, 5.0, 26, rf), 1.1, 0.15), C, { cx: -1.2, cy: -0.2, rx: 5.2, ry: 5.0, sh: [1.0, 1.1], line: lw,
      curls: [[-3.0, -2.8, 0.8], [-4.0, 0.2, 0.7], [-1.8, -1.0, 0.65]] });
    if (o.mouth) {
      const mouth = smooth([[1.0, 1.0], [5.6, 1.6], [5.4, 3.2], [3.4, 4.9], [1.4, 4.2]]);
      c.fillStyle = I[2]; c.fill(mouth);
      c.save(); c.clip(mouth); c.beginPath(); c.ellipse(3.0, 4.2, 2.0, 1.2, -0.2, 0, TAU); c.fillStyle = T[1]; c.fill(); c.restore();
      c.lineJoin = "round"; c.lineWidth = 0.5; c.strokeStyle = I[1]; c.stroke(mouth);
      paint(c, shape(polar(2.8, 4.9, 2.4, 1.0, 12), 0.8, 0.06), MZ, { cx: 2.8, cy: 4.9, rx: 2.4, ry: 1.0, sh: [0.3, 0.35], ha: 0.6, line: lw });
    }
    paint(c, shape(polar(3.0, -0.2, 3.1, 1.9, 16), 0.95, 0.1), MZ, { cx: 3.0, cy: -0.2, rx: 3.1, ry: 1.9, sh: [0.45, 0.55], ha: 0.7, line: lw });
    const nose = smooth([[4.6, -1.5], [5.8, -1.6], [6.6, -1.0], [6.4, -0.2], [5.5, 0.2], [4.6, -0.3]]);
    c.fillStyle = I[0]; c.fill(nose); glint(c, 5.3, -1.1, 0.4, 0.24, -0.3);
    if (!o.mouth) { c.strokeStyle = I[1]; c.lineWidth = 0.45; c.lineCap = "round"; c.beginPath(); c.arc(3.6, 1.0, 0.8, 0.2, Math.PI * 0.9); c.stroke(); }
    if (o.eyes === "closed") { c.strokeStyle = I[1]; c.lineCap = "round"; c.lineWidth = 0.75; c.beginPath(); c.arc(0.2, -2.4, 1.2, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); blush(c, 0.6, 0.6, 1.1); }
    else eye(c, 0.2, -2.0, 1.15);
    ear(c, -2.6, -3.6, 0.72, 0.18, s);
    if (o.cap !== false) {
      const P = new Path2D(); P.moveTo(-5.0, -3.0); P.quadraticCurveTo(-5.8, -6.4, -7.6, -8.4); P.quadraticCurveTo(-3.0, -7.8, 1.8, -4.7); P.quadraticCurveTo(-1.6, -2.4, -5.0, -3.0); P.closePath();
      stk(c, P, [-8.6, -10, 10.4, 7.6], CAP, { lw, d: 0.6, inner: (x) => {
        for (const [sx, sy, sr] of [[-3.4, -5.4, 0.85], [-5.8, -6.8, 0.6], [-0.8, -4.6, 0.55]]) { x.fillStyle = GOLD[1]; x.fill(star5(sx, sy, sr, 0.2)); }
      } });
      const band = new Path2D(); band.moveTo(-5.2, -3.2); band.quadraticCurveTo(-1.6, -2.4, 2.0, -4.8);
      rope(c, band, K[0], K[3], null, 1.3);
      stk(c, shape(polar(-7.8, -8.5, 1.5, 1.5, 10), 0.7, 0.2), [-9.3, -10, 3, 3], { o: K[0], b: K[3], s: K[2] }, { lw, d: 0.35 });
    }
    c.restore();
  }
  // 양(옆, 오른쪽 보기). W = 털 줄 {o,b,s,h}. o: { dir, horn, star, fluff }
  function sheep(c, x, y, s, W, o) {
    o = o || {};
    c.save(); c.translate(x, y); c.scale(s * (o.dir || 1), s);
    const lw = LW / s;
    for (const lx of [-2.6, 2.2, -1.2, 3.4]) stk(c, RR(lx - 0.65, 1.8, 1.3, 3.2, 0.6), [lx - 0.65, 1.8, 1.3, 3.2], { o: I[0], b: I[2], h: I[1] }, { lw, ha: 0 });
    const bump = o.fluff ? 0.3 : 0.24, body = shape(polar(0, 0, 5.0, 3.5, o.fluff ? 13 : 12), o.fluff ? 1.9 : 1.6, bump);
    stk(c, body, [-5, -3.5, 10, 7], W, { lw, d: 0.8, hr: 0.5,
      inner: (x) => { x.strokeStyle = W.s; x.lineWidth = 0.4; x.lineCap = "round"; for (const [cx, cy, r] of [[-2.4, -0.8, 0.8], [0.4, -1.4, 0.8], [-0.8, 1.2, 0.7], [2.0, 0.6, 0.7]]) { x.beginPath(); x.arc(cx, cy, r, 3.5, 5.9); x.stroke(); } } });
    if (o.star) goldStar(c, -0.6, -0.2, 2.2, 0.15);
    // 얼굴
    stk(c, EL(4.7, -0.9, 1.75, 2.15, 0.35), [2.9, -3.1, 3.6, 4.4], { o: I[0], b: I[2], s: I[1], h: C[3] }, { lw, d: 0.4, ha: 0.45 });
    stk(c, EL(3.4, -2.0, 1.15, 0.55, -0.5), [2.2, -2.6, 2.4, 1.2], { o: I[0], b: T[2] }, { lw: lw * 0.7 });
    disc(c, 5.1, -1.3, 0.75, S[1]); disc(c, 5.35, -1.2, 0.42, I[0]); disc(c, 5.15, -1.4, 0.14, S[1]); blush(c, 5.6, 0.2, 0.55);
    stk(c, shape(polar(3.9, -2.6, 1.5, 1.1, 8), 0.7, 0.22), [2.4, -3.7, 3, 2.2], W, { lw: lw * 0.8, d: 0.3 });
    if (o.horn) {
      const H = new Path2D(); H.moveTo(3.6, -2.4); H.bezierCurveTo(2.0, -4.6, -0.6, -3.0, 0.4, -0.8); H.bezierCurveTo(1.2, 0.8, 3.2, 0.2, 2.6, -1.0);
      rope(c, H, BRASS[0], BRASS[1], BRASS[3], 1.5);
    }
    c.restore();
  }
  const WOOL = { o: K[0], b: K[3], s: K[2], h: S[1] };

  // ── 아이콘 18종 ──
  const DRAW = {
    // 무기
    pillow(c) {
      for (const [x0, y0, x1, y1, w] of [[-8.6, 3.0, -4.6, 0.6, 1.0], [-8.0, 6.6, -3.2, 3.6, 1.2], [-4.6, 8.6, -1.4, 5.6, 1.0]]) { const P = new Path2D(); P.moveTo(x0, y0); P.lineTo(x1, y1); airLine(c, P, GOLD[1], BRASS[1], w); }
      const p = CI(1.6, -1.4, 6.6);
      stk(c, p, [-5, -8, 13.2, 13.2], { o: PUR[0], b: PUR[1], s: PUR[0], sa: 0.5, h: PUR[2] }, { d: 1.4, hr: 0.42,
        under: (x) => { x.strokeStyle = FL[0]; x.lineWidth = 2.0; x.beginPath(); x.ellipse(1.6, -1.0, 8.0, 3.0, -0.5, 0, TAU); x.stroke(); for (const [sx, sy] of [[-1.4, -5.0], [5.0, 1.8], [3.6, -5.6]]) { x.fillStyle = GOLD[1]; x.fill(star5(sx, sy, 1.0, 0.3)); } } });
      glint(c, -1.6, -4.6, 1.4, 0.8);
    },
    lullaby(c) {
      cocoHead(c, -3.0, 2.4, 0.74, { eyes: "closed", cap: true });
      for (const [r, a, w] of [[3.0, 0.62, 0.75], [5.4, 0.55, 0.75]]) {
        const P = new Path2D(), cx = 1.6, cy = 1.6;
        for (let i = 0; i <= 8; i++) { const th = -a + (2 * a * i) / 8, rr = r + (i % 2 ? 0.55 : -0.2); const px = cx + Math.cos(th) * rr, py = cy + Math.sin(th) * rr; i ? P.lineTo(px, py) : P.moveTo(px, py); }
        airLine(c, P, RB[0], PUR[0], w);
      }
    },
    star(c) {
      goldGlow(c, 3.2, -3.2, 6.0, 0.5);
      for (const [x0, y0, x1, y1, core, edge, w] of [[-8.4, 4.0, -0.4, -0.6, RB[2], FL[1], 1.0], [-7.6, 7.8, 0.6, 1.2, GOLD[1], BRASS[1], 1.6], [-3.6, 8.6, 2.6, 2.4, RB[2], FL[1], 1.0]]) { const P = new Path2D(); P.moveTo(x0, y0); P.lineTo(x1, y1); airLine(c, P, core, edge, w); }
      goldStar(c, 3.4, -3.4, 5.2, 0.25);
      glint(c, 1.8, -5.0, 0.8, 0.5);
    },
    cloud(c) {
      c.save(); c.setLineDash([1.6, 1.4]); c.lineCap = "round"; c.strokeStyle = PUR[1]; c.lineWidth = 0.8;
      c.beginPath(); c.ellipse(0, 1.4, 8.6, 3.6, -0.28, 0, TAU); c.stroke(); c.restore();
      const p = circles([[-3.8, 1.8, 3.0], [0.2, -1.2, 4.0], [4.0, 1.6, 3.0]]); rrect(p, -6.2, 1.2, 12.6, 3.7, 1.85);
      stk(c, p, [-6.8, -5.2, 13.6, 10.2], { o: PUR[1], b: K[3], s: RB[0], sa: 0.55, h: S[1] }, { d: 1.0 });
      goldStar(c, 7.2, -2.8, 1.4, 0);
      goldStar(c, -7.0, 4.6, 1.1, 0.4);
    },
    bubble(c) {
      const bub = (x, y, r, main) => {
        disc(c, x, y, r, rgba(BUB[1], 0.55)); c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip(); radial(c, x + r * 0.2, y + r * 0.25, r * 1.1, BUB[2], 0, 0.6); c.restore();
        c.lineCap = "round"; c.lineWidth = r * 0.12;
        c.strokeStyle = rgba(RB[2], 0.95); c.beginPath(); c.arc(x, y, r * 0.78, 0.2, 1.4); c.stroke();
        c.strokeStyle = rgba(RB[1], 0.9); c.beginPath(); c.arc(x, y, r * 0.78, 1.5, 2.4); c.stroke();
        c.strokeStyle = rgba(RB[0], 0.8); c.beginPath(); c.arc(x, y, r * 0.78, 2.5, 3.0); c.stroke();
        if (main) moon(c, x + 0.4, y + 0.6, r * 0.42);
        c.lineWidth = Math.min(LW, r * 0.2); c.strokeStyle = BUB[0]; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
        c.lineWidth = Math.min(LW, r * 0.2) * 0.6; c.strokeStyle = PUR[1]; c.beginPath(); c.arc(x, y, r + Math.min(LW, r * 0.2) * 0.7, 0.3, 1.8); c.stroke();
        c.fillStyle = S[1]; c.beginPath(); c.ellipse(x - r * 0.38, y - r * 0.42, r * 0.27, r * 0.16, -0.7, 0, TAU); c.fill();
      };
      bub(-1.0, 1.4, 6.8, true); bub(5.8, -5.6, 2.4); bub(7.4, -0.6, 1.3);
    },
    // 보조
    dmg(c) {
      goldGlow(c, 0, 0, 8.6, 0.35);
      const P = new Path2D(); const pts = [[-2.6, -6.6], [-7.4, -4.4], [-8.6, 0.4], [-5.8, 1.2], [-5.0, -1.0], [-5.0, 7.6], [5.0, 7.6], [5.0, -1.0], [5.8, 1.2], [8.6, 0.4], [7.4, -4.4], [2.6, -6.6]];
      pts.forEach((p, i) => (i ? P.lineTo(p[0], p[1]) : P.moveTo(p[0], p[1]))); P.quadraticCurveTo(0, -3.4, -2.6, -6.6); P.closePath();
      stk(c, P, [-8.6, -6.6, 17.2, 14.2], { o: EVE[1], b: EVE[0], s: EVE[1], sa: 0.8, h: PUR[1] }, { d: 1.0, hy: 0.2, hr: 0.5, ha: 0.8,
        inner: (x) => {
          for (const [sx, sy, r] of [[-3.2, 1.4, 1.2], [2.8, 4.6, 1.0], [-6.8, -2.6, 0.8], [6.6, -2.4, 0.8], [-2.4, 5.6, 0.8], [3.2, -2.0, 0.7]]) { x.fillStyle = FL[0]; x.fill(star5(sx, sy, r, 0.2)); }
          x.strokeStyle = rgba(PUR[2], 0.8); x.lineWidth = 0.4; x.beginPath(); x.moveTo(0.4, -3.6); x.lineTo(0.4, 7.6); x.stroke();
          for (const by of [-1.6, 1.6, 4.8]) disc(x, 0.4, by, 0.5, K[3]);
        } });
      const col = new Path2D(); col.moveTo(-2.6, -6.6); col.quadraticCurveTo(0, -3.4, 2.6, -6.6);
      c.lineCap = "round"; c.strokeStyle = K[3]; c.lineWidth = 0.8; c.stroke(col);
    },
    cd(c) {
      const E = new Path2D(); E.moveTo(-8.2, 1.4); E.quadraticCurveTo(0, -7.0, 8.2, 1.4); E.quadraticCurveTo(0, 11.0, -8.2, 1.4); E.closePath();
      stk(c, E, [-8.2, -2.8, 16.4, 9.6], { o: I[0], b: S[1], s: K[2] }, { d: 0.8, inner: (x) => {
        disc(x, 0.4, 3.0, 3.4, I[1]);
        x.save(); x.beginPath(); x.arc(0.4, 3.0, 3.4, 0, TAU); x.clip(); radial(x, 1.2, 4.8, 3.0, I[2], 0.95, 0); x.restore();
        disc(x, -0.9, 2.9, 1.0, S[1]); disc(x, 1.6, 4.4, 0.45, S[0]);
        // 무거운 눈꺼풀
        const L = new Path2D(); L.moveTo(-9, -8); L.lineTo(9, -8); L.lineTo(9, 1.0); L.quadraticCurveTo(0, 2.2, -9, 1.0); L.closePath();
        x.fillStyle = PUR[1]; x.fill(L);
        x.save(); x.clip(L); radial(x, -2.6, -2.0, 5.0, PUR[2], 0.9, 0); x.restore();
        x.strokeStyle = PUR[0]; x.lineWidth = 0.8; x.beginPath(); x.moveTo(-9, 1.0); x.quadraticCurveTo(0, 2.2, 9, 1.0); x.stroke();
      } });
      c.strokeStyle = I[0]; c.lineWidth = 0.7; c.lineCap = "round";
      for (const [x0, y0, x1, y1] of [[-3.8, 1.8, -4.6, -0.2], [0, 2.2, 0, 0.2], [3.8, 1.8, 4.6, -0.2]]) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
      moon(c, 6.2, -5.8, 2.6);
      goldStar(c, -6.4, -5.6, 1.3, 0.2);
    },
    area(c) {
      const P = new Path2D(); P.moveTo(-6.8, -5.4); P.quadraticCurveTo(0, -7.6, 6.8, -5.4); P.quadraticCurveTo(8.6, 0.4, 6.8, 6.0); P.quadraticCurveTo(0, 8.2, -6.8, 6.0); P.quadraticCurveTo(-8.6, 0.4, -6.8, -5.4); P.closePath();
      stk(c, P, [-8.6, -7.6, 17.2, 15.8], { o: T[0], b: DUSK[1], s: T[1], h: T[2] }, { d: 1.2, hr: 0.5,
        inner: (x) => {
          x.strokeStyle = rgba(T[0], 0.55); x.lineWidth = 0.6; x.lineCap = "round";
          for (const [ex, ey] of [[-5.2, -4.2], [5.2, -4.2], [5.2, 4.8], [-5.2, 4.8]]) { x.beginPath(); x.moveTo(0, 0.3); x.quadraticCurveTo(ex * 0.4, ey * 0.6, ex, ey); x.stroke(); }
          x.save(); x.setLineDash([0.9, 0.8]); x.strokeStyle = rgba(K[3], 0.9); x.lineWidth = 0.4; x.beginPath(); x.moveTo(-5.6, -4.0); x.quadraticCurveTo(0, -5.8, 5.6, -4.0); x.stroke(); x.restore();
        } });
      for (const [tx, ty] of [[-6.8, -5.4], [6.8, -5.4], [6.8, 6.0], [-6.8, 6.0]]) stk(c, CI(tx, ty, 1.2), [tx - 1.2, ty - 1.2, 2.4, 2.4], { o: BRASS[0], b: BRASS[2], h: BRASS[3] }, { lw: 0.6 });
      stk(c, CI(0, 0.3, 1.5), [-1.5, -1.2, 3, 3], { o: BRASS[0], b: BRASS[2], s: BRASS[1], h: BRASS[3] }, { lw: 0.6, d: 0.35 });
    },
    move(c) {
      for (const [x0, y0, x1, y1, w] of [[-8.6, 1.6, -4.2, -0.6, 1.0], [-8.2, 5.6, -2.6, 2.8, 1.2], [-5.0, 8.4, -0.8, 6.0, 1.0]]) { const P = new Path2D(); P.moveTo(x0, y0); P.lineTo(x1, y1); airLine(c, P, RB[0], PUR[0], w); }
      paw(c, 2.0, -0.4, 1.35, 0.55);
      goldStar(c, -5.6, -5.6, 1.5, 0.2);
      goldStar(c, 6.8, 6.4, 1.1, -0.2);
    },
    hp(c) {
      c.save(); c.rotate(-0.08);
      const B = RR(-8.0, -5.6, 16, 12.6, 2.4);
      stk(c, B, [-8, -5.6, 16, 12.6], { o: PUR[0], b: RB[0], s: PUR[1], sa: 0.55, h: RB[2] }, { d: 1.0, hr: 0.5,
        inner: (x) => {
          x.fillStyle = rgba(RB[2], 0.8); for (const [px, py] of [[-8, -1.6], [0, 2.8]]) x.fillRect(px, py, 8, 4.4);
          x.save(); x.setLineDash([0.9, 0.8]); x.strokeStyle = BRASS[2]; x.lineWidth = 0.4; x.beginPath(); x.moveTo(0, -1.6); x.lineTo(0, 7.2); x.moveTo(-8, 2.8); x.lineTo(8, 2.8); x.stroke(); x.restore();
        } });
      stk(c, RR(-8.0, -5.6, 16, 4.0, 1.8), [-8, -5.6, 16, 4], { o: K[0], b: K[3], s: K[2], h: S[1] }, { d: 0.6 });
      c.restore();
      const H = heartP(3.6, 1.0, 0.85);
      stk(c, H, [-0.2, -2.3, 7.6, 6.2], { o: T[0], b: T[1], s: T[0], sa: 0.6, h: T[2] }, { d: 0.5 });
      goldStar(c, -4.2, 4.4, 1.3, 0.2);
    },
    magnet(c) {
      for (const [pts, sx] of [[[-8.0, -7.6, -6.4, -3.4, -2.0, -3.2, -2.2, 0.0], [-7.4, -7.6]], [[7.6, -8.0, 6.4, -3.6, 2.4, -3.6, 2.0, -0.2], [7.0, -7.6]]]) {
        const P = new Path2D(); P.moveTo(pts[0], pts[1]); P.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
        for (let i = 1; i <= 2; i++) { const t = i * 0.34, u = 1 - t, bx = u*u*u*pts[0] + 3*u*u*t*pts[2] + 3*u*t*t*pts[4] + t*t*t*pts[6], by = u*u*u*pts[1] + 3*u*u*t*pts[3] + 3*u*t*t*pts[5] + t*t*t*pts[7]; sparkle(c, bx, by, 1.3 - i * 0.3); }
        goldStar(c, sx[0], sx[1], 1.6, 0.2);
      }
      goldStar(c, 0, -6.2, 1.2, 0);
      const nose = smooth([[-6.4, 2.0], [-4.0, -0.2], [0, 0.0], [4.0, -0.2], [6.4, 2.0], [5.4, 5.8], [2.2, 7.6], [0, 8.0], [-2.2, 7.6], [-5.4, 5.8]]);
      stk(c, nose, [-6.4, -0.2, 12.8, 8.2], { o: I[0], b: I[2], s: I[1], h: C[3] }, { d: 1.0, hy: 0.22, hr: 0.45, ha: 0.55,
        inner: (x) => { for (const s of [-1, 1]) { x.fillStyle = I[0]; x.beginPath(); x.ellipse(s * 2.4, 3.8, 1.45, 0.95, s * 0.45, 0, TAU); x.fill(); } x.strokeStyle = I[0]; x.lineWidth = 0.7; x.beginPath(); x.moveTo(0, 4.6); x.lineTo(0, 8); x.stroke(); } });
      glint(c, -2.8, 1.4, 1.3, 0.65, -0.25);
    },
    // 양떼
    flock(c) {
      sheep(c, 3.4, -3.0, 0.82, WOOL);
      cocoHead(c, -3.0, 3.4, 0.62, { mouth: true });
      for (const [r, a] of [[2.0, 0.6], [3.6, 0.55]]) { const P = new Path2D(); P.arc(0.6, 2.6, r, -0.7 - a, -0.7 + a); airLine(c, P, FL[0], BRASS[0], 1.0); }
    },
    horn(c) { sheep(c, -1.6, 1.0, 1.28, { o: K[0], b: K[2], s: K[1], h: K[3] }, { horn: true }); },
    puff(c) {
      sheep(c, -0.8, 1.2, 1.22, { o: FL[1], b: RB[2], s: rgba(FL[1], 0.55), h: S[1] }, { fluff: true });
      for (const [x, y, r] of [[-7.4, -5.6, 1.3], [-4.4, -7.4, 0.9], [6.6, -6.8, 1.0]]) stk(c, shape(polar(x, y, r, r, 8), 0.6, 0.25), [x - r, y - r, 2 * r, 2 * r], { o: FL[1], b: RB[2], h: S[1] }, { lw: 0.55 });
    },
    pipe(c) {
      c.save(); c.translate(-5.6, 5.8); c.scale(1, 0.42);
      goldGlow(c, 0, 0, 4.6, 0.6);
      c.lineWidth = 2.6; c.strokeStyle = BRASS[0]; c.beginPath(); c.arc(0, 0, 3.2, 0, TAU); c.stroke();
      c.lineWidth = 1.4; c.strokeStyle = BRASS[2]; c.stroke();
      c.restore();
      sheep(c, 3.6, 3.6, 0.72, WOOL, { dir: -1 });
      const A = new Path2D(); A.moveTo(6.6, -0.6); A.bezierCurveTo(6.6, -8.4, -4.8, -8.6, -5.6, 0.4);
      rope(c, A, BRASS[0], BRASS[2], BRASS[3], 1.6);
      const H = new Path2D(); H.moveTo(-5.6, 3.4); H.lineTo(-8.4, -0.4); H.lineTo(-3.0, -0.6); H.closePath();
      stk(c, H, [-8.4, -0.6, 5.4, 4], { o: BRASS[0], b: BRASS[2], h: BRASS[3] }, {});
    },
    starsheep(c) {
      const op = c.globalCompositeOperation; c.globalCompositeOperation = "lighter"; radial(c, -0.8, 1.2, 9.6, RB[1], 0.55, 0); c.globalCompositeOperation = op;
      sheep(c, -1.4, 1.8, 1.2, { o: BUB[0], b: BUB[1], s: BUB[0], sa: 0.6, h: BUB[2] }, { star: true });
      goldStar(c, 6.6, -6.4, 1.8, 0.2);
      const P = new Path2D(); P.moveTo(2.4, -3.2); P.lineTo(5.2, -5.4); airLine(c, P, GOLD[1], BRASS[1], 0.8);
    },
    // 기타
    evo(c) {
      stk(c, CI(0, 0, 8.0), [-8, -8, 16, 16], { o: EVE[1], b: EVE[0], s: EVE[1], sa: 0.7, h: PUR[1] }, { d: 1.2, ha: 0.7,
        inner: (x) => { for (const [px, py, r] of [[-5, -2.6, 0.35], [4.6, 4.2, 0.3], [-3.6, 5.0, 0.3], [5.4, -1.0, 0.25]]) disc(x, px, py, r, GOLD[1]); } });
      goldGlow(c, 0, 0.4, 7.6, 0.7);
      goldStar(c, 0, 0.6, 6.0, 0);
      glint(c, -1.4, -1.4, 0.8, 0.5);
      sparkle(c, 6.8, -6.6, 1.8);
      sparkle(c, -6.8, 6.2, 1.3);
    },
    heal(c) {
      for (const x0 of [-3.4, 0.0]) { const P = new Path2D(); P.moveTo(x0, -3.8); P.bezierCurveTo(x0 - 1.6, -5.2, x0 + 1.6, -6.4, x0, -8.2); airLine(c, P, S[1], PUR[2], 0.9); }
      const handle = new Path2D(); handle.moveTo(4.0, -0.6); handle.bezierCurveTo(8.6, -1.2, 8.6, 5.0, 4.0, 4.6);
      rope(c, handle, TEAL[0], TEAL[1], TEAL[2], 1.5);
      stk(c, RR(-7.2, -2.4, 11.6, 10.6, 2.6), [-7.2, -2.4, 11.6, 10.6], { o: TEAL[0], b: TEAL[1], s: TEAL[0], sa: 0.5, h: TEAL[2] }, { d: 1.0,
        inner: (x) => { x.fillStyle = K[3]; x.beginPath(); x.ellipse(-1.4, -2.4, 5.8, 1.7, 0, 0, TAU); x.fill(); x.fillStyle = rgba(K[1], 0.7); x.beginPath(); x.ellipse(-1.0, -1.8, 4.4, 0.8, 0, 0, TAU); x.fill(); x.fillStyle = GOLD[1]; x.fill(star5(-1.4, 3.6, 1.6, 0.2)); } });
      const H = heartP(5.6, -5.6, 0.62);
      stk(c, H, [2.8, -7.6, 5.6, 4.6], { o: T[0], b: T[1], s: T[0], sa: 0.6, h: T[2] }, { d: 0.4 });
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

  SA.dreamherd = Object.assign(SA.dreamherd || {}, { iconURL, ICON_KEYS });
})(typeof window !== "undefined" ? window : globalThis);
