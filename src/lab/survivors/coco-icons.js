// @ts-nocheck — 디자인 세션 카드 아이콘 정본 docs/lab-surv-coco-hd-art-icons.js 를 그대로 옮긴 것(tmp/lab-surv/sync-src.sh).
/* 코코의 하루 HD — 레벨업 카드 아이콘 18종. 정본: docs/lab-surv-coco-hd-artdir.md 1판(3절 팔레트·4절 선 규칙).
 * iconURL(key, px) → 투명 배경 정사각 PNG data URL. 처음 부를 때 구워 캐시한다(같은 key·px 는 다시 안 그린다).
 * 좌표: 칸 하나 = 21 단위(시안의 42 CSS 칸 = 월드 21 단위, 1 단위 = 2 CSS px → 외곽 0.8 단위가 코코 리그와 같은 굵기).
 * 가운데가 (0,0), 그림은 외곽선 포함 ±8.8 안(여백 8 %). 글자 없음.
 * 같은 SurvArt.cocoHD 객체에 합쳐진다(코코·세상 그림 파일과 나란히). */
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
  function ear(c, x, y, s, rot) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s, s);
    const P = shape(EAR, 0.95, 0.2), ty = 9.1;
    paint(c, P, C, { cx: 0, cy: ty * 0.4, rx: 2.1, ry: ty * 0.55, sh: [0.6, 0.4], ha: 0.6, line: LW / s, curls: [[-0.6, ty * 0.3, 0.6], [0.6, ty * 0.5, 0.55]],
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

  // ── 아이콘 18종 ──
  const DRAW = {
    // 무기
    ball(c) {
      const p = CI(0, 0, 7.6);
      stk(c, p, [-7.6, -7.6, 15.2, 15.2], { o: BTN[0], b: BTN[1], s: BTN[0], sa: 0.5, h: T[2] }, {
        d: 1.6, hr: 0.4, under: (x) => {
          x.strokeStyle = FL[0]; x.lineWidth = 2.7;
          x.beginPath(); x.arc(-11.4, -1.2, 8.6, -1.0, 1.0); x.stroke();
          x.beginPath(); x.arc(11.4, 1.2, 8.6, Math.PI - 1.0, Math.PI + 1.0); x.stroke();
        },
      });
      glint(c, -3.2, -4.0, 1.7, 0.95);
    },
    wag(c) {
      // 바람 곡선(왼쪽)
      const w1 = new Path2D(); w1.moveTo(-8.6, -3.6); w1.bezierCurveTo(-6.4, -5.6, -3.6, -5.0, -3.4, -3.0); w1.bezierCurveTo(-3.3, -1.8, -4.9, -1.7, -5.0, -2.8);
      const w2 = new Path2D(); w2.moveTo(-8.6, 1.4); w2.bezierCurveTo(-6.6, 0.0, -4.2, 0.4, -3.6, 2.2); w2.bezierCurveTo(-3.2, 3.6, -5.0, 3.8, -5.2, 2.6);
      const w3 = new Path2D(); w3.moveTo(-7.8, 6.2); w3.quadraticCurveTo(-5.4, 5.0, -2.8, 6.4);
      for (const w of [w1, w2, w3]) airLine(c, w, WIND, rgba(TEAL[0], 0.7), 1.2);
      // 꼬리 줄기 + 곱슬 방울
      const st = new Path2D(); st.moveTo(6.6, 8.0); st.quadraticCurveTo(6.4, 4.6, 3.6, 2.4);
      c.lineCap = "round"; c.strokeStyle = C[0]; c.lineWidth = 3.6; c.stroke(st); c.strokeStyle = C[2]; c.lineWidth = 2.0; c.stroke(st);
      paint(c, shape(polar(2.4, -2.0, 5.4, 5.4, 16), 1.05, 0.17), C, { cx: 2.4, cy: -2.0, rx: 5.4, ry: 5.4, sh: [0.9, 1.0],
        curls: [[0.6, -4.2, 0.9], [3.6, -3.6, 0.85], [1.0, -1.0, 0.8], [4.2, -0.6, 0.7], [-0.6, 1.0, 0.65]] });
    },
    bark(c) {
      c.save(); c.translate(-2.6, 0.6); c.scale(0.9, 0.9);
      // 머리
      const rf = (a) => 1 + 0.1 * Math.exp(-Math.pow(a + 1.85, 2) / 0.35);
      paint(c, shape(polar(-1.2, 0, 5.2, 5.0, 26, rf), 1.1, 0.15), C, { cx: -1.2, cy: -0.2, rx: 5.2, ry: 5.0, sh: [1.0, 1.1], line: LW / 0.9,
        curls: [[-3.0, -2.8, 0.8], [-0.4, -3.4, 0.8], [-4.0, 0.2, 0.7], [-1.8, -1.0, 0.65]] });
      // 벌린 입(아래턱 + 입 안)
      const mouth = smooth([[1.0, 1.0], [5.6, 1.6], [5.4, 3.2], [3.4, 4.9], [1.4, 4.2]]);
      c.fillStyle = I[2]; c.fill(mouth);
      c.save(); c.clip(mouth); c.beginPath(); c.ellipse(3.0, 4.2, 2.0, 1.2, -0.2, 0, TAU); c.fillStyle = T[1]; c.fill(); radial(c, 2.6, 3.8, 1.2, T[2], 0.85, 0); c.restore();
      c.lineJoin = "round"; c.lineWidth = 0.5; c.strokeStyle = I[1]; c.stroke(mouth);
      paint(c, shape(polar(2.8, 4.9, 2.4, 1.0, 12), 0.8, 0.06), MZ, { cx: 2.8, cy: 4.9, rx: 2.4, ry: 1.0, sh: [0.3, 0.35], ha: 0.6, line: LW / 0.9 });
      // 윗주둥이
      paint(c, shape(polar(3.0, -0.2, 3.1, 1.9, 16), 0.95, 0.1), MZ, { cx: 3.0, cy: -0.2, rx: 3.1, ry: 1.9, sh: [0.45, 0.55], ha: 0.7, line: LW / 0.9 });
      const nose = smooth([[4.6, -1.5], [5.8, -1.6], [6.6, -1.0], [6.4, -0.2], [5.5, 0.2], [4.6, -0.3]]);
      c.fillStyle = I[0]; c.fill(nose); c.save(); c.clip(nose); radial(c, 5.2, -1.2, 1.1, I[2], 0.9, 0); c.restore();
      glint(c, 5.3, -1.1, 0.4, 0.24, -0.3);
      eye(c, 0.2, -2.0, 1.15);
      ear(c, -2.6, -3.6, 0.72, 0.18);
      c.restore();
      // 소리 고리
      for (const [r, a] of [[2.6, 0.7], [4.6, 0.62]]) { const P = new Path2D(); P.arc(3.4, 1.0, r, -a, a); airLine(c, P, FL[0], BRASS[0], 1.2); }
    },
    toy(c) {
      const R = { o: PUR[0], b: PUR[2], s: PUR[1], h: S[1] };
      for (const s of [-1, 1]) {
        stk(c, CI(s * 3.9, -6.1, 1.9), [s * 3.9 - 1.9, -8, 3.8, 3.8], R, { d: 0.45, ha: 0.6 });
        disc(c, s * 3.9, -6.0, 0.95, T[2]);
      }
      for (const s of [-1, 1]) stk(c, EL(s * 2.4, 6.5, 1.9, 1.4), [s * 2.4 - 1.9, 5.1, 3.8, 2.8], R, { d: 0.4, ha: 0.5 });
      for (const s of [-1, 1]) stk(c, EL(s * 4.3, 2.6, 1.4, 2.1, s * 0.5), [s * 4.3 - 1.4, 0.5, 2.8, 4.2], R, { d: 0.4, ha: 0.5 });
      stk(c, EL(0, 3.5, 3.7, 3.3), [-3.7, 0.2, 7.4, 6.6], R, { d: 0.7, ha: 0.6, inner: (x) => { x.fillStyle = rgba(K[3], 0.85); x.beginPath(); x.ellipse(0, 4.0, 2.0, 1.8, 0, 0, TAU); x.fill(); } });
      stk(c, CI(0, -2.4, 4.7), [-4.7, -7.1, 9.4, 9.4], R, { d: 0.8, ha: 0.7 });
      c.fillStyle = K[3]; c.beginPath(); c.ellipse(0, -0.8, 2.1, 1.55, 0, 0, TAU); c.fill(); c.lineWidth = 0.4; c.strokeStyle = K[0]; c.stroke();
      c.fillStyle = I[0]; c.beginPath(); c.ellipse(0, -1.35, 0.8, 0.55, 0, 0, TAU); c.fill();
      c.strokeStyle = I[1]; c.lineWidth = 0.35; c.lineCap = "round"; c.beginPath(); c.moveTo(0, -0.8); c.lineTo(0, -0.1); c.stroke();
      eye(c, -1.9, -3.1, 0.62); eye(c, 1.9, -3.1, 0.62);
      blush(c, -3.0, -1.4, 0.75); blush(c, 3.0, -1.4, 0.75);
    },
    chew(c) { chewStick(c, 0, 0, 0.98, -Math.PI / 4); },
    // 보조
    dmg(c) {
      // 뼈(오른쪽 아래)
      c.save(); c.translate(3.0, 3.0); c.rotate(Math.PI / 4);
      const bn = circles([[3.9, -1.25, 1.55], [3.9, 1.25, 1.55]]); rrect(bn, -1.0, -1.15, 5.0, 2.3, 1.0);
      stk(c, bn, [-1.0, -2.8, 6.5, 5.6], { o: K[0], b: K[3], s: K[1] }, { d: 0.5 });
      c.restore();
      // 고기
      const m = EL(-1.6, -1.6, 6.6, 5.3, -0.78);
      stk(c, m, [-7.6, -7.6, 12, 12], { o: T[0], b: T[1], s: T[0], sa: 0.75, h: T[2] }, { d: 1.3, hr: 0.42,
        inner: (x) => { x.lineCap = "round"; x.strokeStyle = rgba(K[3], 0.9); x.lineWidth = 0.8; x.beginPath(); x.moveTo(-6.0, -0.2); x.quadraticCurveTo(-4.4, -4.6, -0.2, -6.0); x.stroke(); } });
      glint(c, -3.6, -4.2, 1.0, 0.55);
    },
    cd(c) {
      goldGlow(c, 5.6, -5.6, 4.2, 0.55);
      const rf = (a) => 1 + 0.035 * Math.sin(a * 7);
      const ck = smooth(resample(cr(polar(-1.0, 1.0, 6.9, 6.7, 20, rf), 8), 0.9));
      stk(c, ck, [-7.9, -5.7, 13.8, 13.4], { o: BRASS[0], b: BRASS[1], s: BRASS[0], sa: 0.55, h: BRASS[3] }, { d: 1.2, hr: 0.45,
        inner: (x) => {
          for (const [px, py, r, a] of [[-3.8, -1.4, 1.05, 0.3], [0.6, -2.4, 0.9, -0.4], [2.6, 1.6, 1.05, 0.8], [-1.6, 3.6, 1.0, -0.2], [-4.4, 3.0, 0.7, 0.5], [0.4, 0.8, 0.75, 0.1], [3.2, 4.6, 0.7, 0.2]]) {
            x.fillStyle = C[0]; x.beginPath(); x.ellipse(px, py, r, r * 0.8, a, 0, TAU); x.fill();
            x.fillStyle = rgba(C[2], 0.9); x.beginPath(); x.ellipse(px - r * 0.3, py - r * 0.3, r * 0.35, r * 0.25, a, 0, TAU); x.fill();
          }
        } });
      sparkle(c, 5.8, -5.8, 3.0);
      sparkle(c, 7.4, -0.8, 1.4);
      sparkle(c, 1.6, -7.6, 1.2);
    },
    area(c) {
      c.save(); c.setLineDash([1.7, 1.5]); c.lineCap = "round";
      c.strokeStyle = rgba(C[1], 0.55); c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 8.0, 0, TAU); c.stroke();
      c.strokeStyle = C[3]; c.lineWidth = 0.8; c.beginPath(); c.arc(0, 0, 8.0, 0, TAU); c.stroke();
      c.restore();
      const rf = (a) => 1 + 0.06 * Math.sin(a * 3 + 0.6);
      paint(c, shape(polar(0, 0.2, 5.6, 5.2, 24, rf), 1.9, 0.3), C, { cx: 0, cy: 0.2, rx: 5.8, ry: 5.4, sh: [0.9, 1.0], cw: 0.5,
        curls: [[-2.8, -2.6, 0.95], [0.6, -3.4, 0.9], [3.0, -1.4, 0.85], [-3.6, 0.6, 0.85], [-0.8, -0.6, 0.9], [2.0, 1.6, 0.8], [-2.0, 2.8, 0.75], [0.6, 3.6, 0.6]] });
    },
    move(c) {
      paw(c, -3.7, 3.9, 1.0, -0.4);
      paw(c, 3.5, -3.3, 1.0, 0.35);
    },
    hp(c) {
      for (const a of [-0.55, 0.55, 0]) {
        c.save(); c.translate(0, 7.4); c.rotate(a);
        const p = new Path2D();
        for (let i = 0; i <= 64; i++) { const t = (i / 64) * TAU, r = 1 + 0.07 * Math.sin(t * 11); const px = Math.sin(t) * 3.6 * r, py = -7.2 + Math.cos(t) * 7.2 * r; if (i) p.lineTo(px, py); else p.moveTo(px, py); }
        p.closePath();
        stk(c, p, [-3.8, -14.8, 7.6, 15], { o: GR[0], b: GR[3], s: GR[2], h: GR[4] }, { d: 0.9, hx: 0.3, hy: 0.3, hr: 0.6 });
        c.lineCap = "round"; c.strokeStyle = rgba(GR[4], 0.95); c.lineWidth = 0.7; c.beginPath(); c.moveTo(0, -0.4); c.lineTo(0, -12); c.stroke();
        c.lineWidth = 0.4; for (const yy of [-4, -7, -10]) { c.beginPath(); c.moveTo(0, yy); c.lineTo(-1.6, yy - 1.6); c.moveTo(0, yy + 0.6); c.lineTo(1.6, yy - 1.0); c.stroke(); }
        c.restore();
      }
    },
    magnet(c) {
      // 냄새 곡선(위)
      for (const [x0, ph] of [[-3.6, 0], [0, 1], [3.6, 0]]) {
        const P = new Path2D(); P.moveTo(x0, -8.2);
        P.bezierCurveTo(x0 + (ph ? -1.6 : 1.6), -6.6, x0 + (ph ? 1.6 : -1.6), -5.0, x0, -3.0);
        airLine(c, P, TEAL[2], TEAL[0], 1.1);
      }
      const nose = smooth([[-6.6, 0.4], [-4.2, -1.8], [0, -1.6], [4.2, -1.8], [6.6, 0.4], [5.6, 4.6], [2.2, 6.6], [0, 7.0], [-2.2, 6.6], [-5.6, 4.6]]);
      stk(c, nose, [-6.6, -1.8, 13.2, 8.8], { o: I[0], b: I[2], s: I[1], h: C[3] }, { d: 1.1, hy: 0.22, hr: 0.45, ha: 0.55,
        inner: (x) => {
          for (const s of [-1, 1]) { x.fillStyle = I[0]; x.beginPath(); x.ellipse(s * 2.5, 2.6, 1.5, 1.0, s * 0.45, 0, TAU); x.fill(); }
          x.strokeStyle = I[0]; x.lineWidth = 0.7; x.lineCap = "round"; x.beginPath(); x.moveTo(0, 3.4); x.lineTo(0, 7); x.stroke();
        } });
      glint(c, -3.0, -0.2, 1.4, 0.7, -0.25);
      glint(c, 2.6, -0.4, 0.6, 0.35, 0.2);
    },
    // 습관
    sit(c) {
      goldGlow(c, 5.4, -5.6, 3.6, 0.3);
      bone(c, 5.4, -5.6, 1.15, -0.45);
      sparkle(c, 8.0, -2.4, 1.1);
      c.save(); c.translate(-1.6, 0.6);
      // 꼬리·엉덩이·몸·앞다리·머리(오른쪽 위를 올려다봄)
      paint(c, shape(polar(-5.2, 3.6, 1.9, 1.9, 12), 0.9, 0.16), C, { cx: -5.2, cy: 3.6, rx: 1.9, ry: 1.9, sh: [0.4, 0.5] });
      paint(c, shape(polar(-0.9, 2.4, 3.4, 4.4, 20, (a) => 1 + 0.05 * Math.cos(a)), 1.0, 0.13), C, { cx: -0.9, cy: 2.4, rx: 3.4, ry: 4.4, sh: [0.7, 0.8], curls: [[-1.8, 0.6, 0.65], [0.2, 2.8, 0.6]] });
      paint(c, shape(polar(-2.8, 5.0, 3.0, 2.6, 16), 1.0, 0.13), C, { cx: -2.8, cy: 5.0, rx: 3.0, ry: 2.6, sh: [0.5, 0.6], curls: [[-3.4, 4.2, 0.6]] });
      stk(c, RR(0.6, 2.4, 2.0, 5.4, 1.0), [0.6, 2.4, 2.0, 5.4], { o: C[0], b: C[2], s: C[1], h: C[4] }, { d: 0.4, ha: 0.5 });
      c.save(); c.translate(0.6, -3.6); c.rotate(-0.25);
      paint(c, shape(polar(0, 0, 3.7, 3.5, 20), 1.0, 0.14), C, { cx: 0, cy: 0, rx: 3.7, ry: 3.5, sh: [0.7, 0.8], curls: [[-1.6, -1.6, 0.7], [0.4, -2.2, 0.6]] });
      paint(c, shape(polar(3.0, 0.8, 2.1, 1.5, 12), 0.85, 0.08), MZ, { cx: 3.0, cy: 0.8, rx: 2.1, ry: 1.5, sh: [0.35, 0.4], ha: 0.7, inner: 1 });
      c.fillStyle = I[0]; c.beginPath(); c.ellipse(4.7, 0.2, 0.75, 0.55, -0.2, 0, TAU); c.fill();
      eye(c, 1.3, -0.8, 0.95);
      ear(c, -1.6, -2.0, 0.6, 0.2);
      c.restore();
      c.restore();
    },
    scoot(c) {
      // 풀잎 줄무늬(뒤로 끌린 자국)
      radial(c, -8.0, 5.0, 2.2, DI[1], 0.8, 0); radial(c, -7.0, 3.6, 1.6, DI[2], 0.9, 0);
      for (const [y, x0, x1] of [[7.9, -8.8, 3.0], [6.2, -8.8, -5.8]]) {
        const P = new Path2D(); P.moveTo(x0, y); P.lineTo(x1, y);
        rope(c, P, GR[0], GR[3], null, 0.7);
      }
      for (const [x, y, a] of [[-7.6, 7.6, -0.4], [-5.0, 7.6, -0.3], [-7.4, 5.9, -0.5]]) {
        const P = new Path2D(); P.moveTo(x, y); P.quadraticCurveTo(x - 0.3, y - 1.0, x - 1.0 + a, y - 1.7);
        c.lineCap = "round"; c.strokeStyle = GR[0]; c.lineWidth = 1.1; c.stroke(P); c.strokeStyle = GR[3]; c.lineWidth = 0.5; c.stroke(P);
      }
      c.save(); c.translate(0.8, 0.5); c.rotate(-0.08);
      // 꼬리 방울(위로) · 엉덩이(바닥) · 몸(앞으로 기움) · 앞다리 쭉 · 머리
      paint(c, shape(polar(-5.0, -1.4, 2.1, 2.1, 12), 0.9, 0.16), C, { cx: -5.0, cy: -1.4, rx: 2.1, ry: 2.1, sh: [0.45, 0.5] });
      c.save(); c.translate(3.0, 3.0); c.rotate(-0.55);
      stk(c, RR(-1.0, -0.6, 2.0, 5.6, 1.0), [-1.0, -0.6, 2.0, 5.6], { o: C[0], b: C[2], s: C[1], h: C[4] }, { d: 0.4, ha: 0.5 });
      c.restore();
      paint(c, shape(polar(0.4, 1.4, 5.0, 3.4, 26, (a) => 1 + 0.04 * Math.cos(a)), 1.1, 0.13), C, { cx: 0.4, cy: 1.4, rx: 5.0, ry: 3.4, sh: [0.8, 0.9],
        curls: [[-1.6, 0.4, 0.7], [1.2, 0.0, 0.7], [-0.2, 2.4, 0.6]] });
      paint(c, shape(polar(-3.0, 4.2, 3.1, 2.7, 18), 1.0, 0.14), C, { cx: -3.0, cy: 4.2, rx: 3.1, ry: 2.7, sh: [0.6, 0.6], curls: [[-3.6, 3.4, 0.65]] });
      c.save(); c.translate(4.4, -3.0);
      paint(c, shape(polar(0, 0, 3.3, 3.1, 20), 1.0, 0.14), C, { cx: 0, cy: 0, rx: 3.3, ry: 3.1, sh: [0.6, 0.7], curls: [[-1.4, -1.6, 0.6]] });
      paint(c, shape(polar(2.4, 1.0, 1.6, 1.2, 12), 0.8, 0.08), MZ, { cx: 2.4, cy: 1.0, rx: 1.6, ry: 1.2, sh: [0.3, 0.3], ha: 0.7, inner: 1 });
      c.fillStyle = I[0]; c.beginPath(); c.ellipse(3.8, 0.5, 0.6, 0.45, 0, 0, TAU); c.fill();
      c.strokeStyle = I[1]; c.lineWidth = 0.5; c.lineCap = "round"; c.beginPath(); c.arc(1.0, -0.2, 0.75, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
      c.fillStyle = T[1]; c.beginPath(); c.ellipse(2.2, 2.4, 0.45, 0.6, 0, 0, TAU); c.fill();
      ear(c, -1.4, -1.6, 0.52, 0.5);
      c.restore();
      c.restore();
    },
    spin(c) {
      const P = new Path2D(), n = 60, th0 = 0.6, th1 = TAU * 1.08;
      let ex = 0, ey = 0, tx = 0, ty = 0;
      for (let i = 0; i <= n; i++) {
        const th = th0 + ((th1 - th0) * i) / n, r = 1.4 + (th - th0) * 1.0;
        const x = Math.cos(th) * r, y = Math.sin(th) * r; i ? P.lineTo(x, y) : P.moveTo(x, y);
        if (i === n) { ex = x; ey = y; const dr = 1.0; tx = -Math.sin(th) * r + Math.cos(th) * dr; ty = Math.cos(th) * r + Math.sin(th) * dr; }
      }
      rope(c, P, TEAL[0], TEAL[1], TEAL[2], 2.0);
      // 화살촉(끝의 접선 방향)
      const L = Math.hypot(tx, ty), ux = tx / L, uy = ty / L, vx = -uy, vy = ux;
      const H = new Path2D(); H.moveTo(ex + ux * 2.6, ey + uy * 2.6); H.lineTo(ex + vx * 2.3 - ux * 0.6, ey + vy * 2.3 - uy * 0.6); H.lineTo(ex - vx * 2.3 - ux * 0.6, ey - vy * 2.3 - uy * 0.6); H.closePath();
      stk(c, H, [ex - 2.6, ey - 2.6, 5.2, 5.2], { o: TEAL[0], b: TEAL[1], h: TEAL[2] }, { ha: 0.8 });
      // 털 조각
      for (const [x, y, r, a] of [[-6.6, 5.8, 1.6, 0.4], [6.4, -6.8, 1.4, -0.3], [-7.0, -5.4, 1.1, 0.8]]) {
        c.save(); c.translate(x, y); c.rotate(a);
        paint(c, shape(polar(0, 0, r * 1.35, r, 10), 0.75, 0.18), C, { cx: 0, cy: 0, rx: r * 1.35, ry: r, sh: [0.3, 0.35], line: 0.6 });
        c.restore();
      }
    },
    calm(c) {
      ear(c, -4.6, -3.4, 0.82, 0.35);
      ear(c, 4.6, -3.4, 0.82, -0.35);
      const rf = (a) => 1 + 0.06 * Math.exp(-Math.pow(a + Math.PI / 2, 2) / 0.4);
      paint(c, shape(polar(0, 0.4, 5.9, 5.6, 28, rf), 1.15, 0.14), C, { cx: 0, cy: 0.2, rx: 5.9, ry: 5.6, sh: [0.9, 1.0],
        curls: [[-2.6, -3.6, 0.8], [0.6, -4.2, 0.8], [3.0, -3.0, 0.7], [-3.8, -1.2, 0.6]] });
      paint(c, shape(polar(0, 2.9, 3.1, 2.2, 16), 0.95, 0.1), MZ, { cx: 0, cy: 2.9, rx: 3.1, ry: 2.2, sh: [0.4, 0.5], ha: 0.7, inner: 1 });
      blush(c, -3.6, 1.8, 1.2); blush(c, 3.6, 1.8, 1.2);
      // 감은 눈(아래로 둥근 선 = 편안) · 코 · 미소
      c.strokeStyle = I[1]; c.lineCap = "round"; c.lineWidth = 0.75;
      for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 2.5, -1.3, 1.25, Math.PI * 0.15, Math.PI * 0.85); c.stroke(); }
      c.fillStyle = I[0]; c.beginPath(); c.ellipse(0, 1.8, 1.15, 0.8, 0, 0, TAU); c.fill();
      glint(c, -0.35, 1.5, 0.35, 0.2, -0.2);
      c.lineWidth = 0.5; c.beginPath(); c.moveTo(0, 2.5); c.lineTo(0, 3.2); c.stroke();
      c.beginPath(); c.arc(-0.75, 3.2, 0.75, 0.15, Math.PI * 0.9); c.stroke();
      c.beginPath(); c.arc(0.75, 3.2, 0.75, 0.1, Math.PI * 0.85); c.stroke();
      // 하트
      const H = heartP(5.9, -5.9, 0.68);
      stk(c, H, [3.0, -8.2, 5.8, 5.2], { o: T[0], b: T[1], s: T[0], sa: 0.6, h: T[2] }, { d: 0.45 });
      glint(c, 4.9, -6.6, 0.45, 0.3);
    },
    sneak(c) {
      // 살금 발자국(작고 옅게, 그릇 쪽으로)
      paw(c, -6.6, 2.6, 0.5, 0.55, 0.75, 0.55);
      paw(c, -5.4, -3.4, 0.5, 0.95, 0.85, 0.55);
      paw(c, 0.0, -6.4, 0.5, 1.35, 0.95, 0.55);
      // 사료 그릇
      const kib = [[-0.4, 1.6, -0.3], [1.8, 1.0, 0.4], [4.0, 1.4, -0.2], [6.0, 1.9, 0.5], [1.0, 2.4, 0.2], [3.0, 0.0, 0.6], [5.0, 0.6, -0.4]];
      for (const [x, y, a] of kib) stk(c, EL(x, y, 1.15, 0.95, a), [x - 1.15, y - 0.95, 2.3, 1.9], { o: WOOD[0], b: WOOD[1], h: DI[2] }, { lw: 0.5, ha: 0.8 });
      const bowl = new Path2D();
      bowl.moveTo(-3.6, 2.4); bowl.lineTo(9.0, 2.4); bowl.bezierCurveTo(8.8, 5.6, 7.6, 7.8, 6.6, 8.0); bowl.lineTo(-1.2, 8.0); bowl.bezierCurveTo(-2.2, 7.8, -3.4, 5.6, -3.6, 2.4); bowl.closePath();
      stk(c, bowl, [-3.6, 2.4, 12.6, 5.6], { o: TEAL[0], b: TEAL[1], s: TEAL[0], sa: 0.55, h: TEAL[2] }, { d: 0.9, hy: 0.35,
        inner: (x) => { x.lineCap = "round"; x.strokeStyle = rgba(TEAL[2], 0.9); x.lineWidth = 0.7; x.beginPath(); x.moveTo(-1.6, 4.6); x.lineTo(7.0, 4.6); x.stroke(); disc(x, 2.7, 6.0, 0.8, rgba(S[1], 0.85)); } });
      c.lineWidth = 0.5; c.strokeStyle = TEAL[2]; c.lineCap = "round"; c.beginPath(); c.moveTo(-3.2, 2.5); c.lineTo(8.6, 2.5); c.stroke();
    },
    // 기타
    evo(c) {
      goldGlow(c, 0, 0.4, 9.6, 0.75);
      const P = star(5, 7.4, 3.4, 0, 0.9);
      c.lineJoin = "round"; c.lineWidth = LW * 2 + 0.6; c.strokeStyle = BRASS[0]; c.stroke(P);
      stk(c, P, [-7, -6.5, 14, 13.6], { b: FL[0], s: BRASS[1], h: GOLD[1] }, { d: 1.0, hr: 0.5 });
      c.lineWidth = 0.9; c.strokeStyle = BRASS[1]; c.stroke(P);
      glint(c, -1.6, -1.8, 0.9, 0.55);
      sparkle(c, 6.8, -6.4, 1.9);
      sparkle(c, -6.8, -5.0, 1.3);
      sparkle(c, 6.2, 6.6, 1.2);
    },
    heal(c) {
      chewStick(c, -1.6, 2.0, 0.7, -0.6);
      const H = heartP(3.8, -3.2, 1.25);
      stk(c, H, [-1.7, -7.8, 11, 9.8], { o: T[0], b: T[1], s: T[0], sa: 0.6, h: T[2] }, { d: 0.9, hr: 0.5 });
      glint(c, 1.8, -5.3, 0.9, 0.5);
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

  SA.cocoHD = Object.assign(SA.cocoHD || {}, { iconURL, ICON_KEYS });
})(typeof window !== "undefined" ? window : globalThis);
