/* 코코의 하루 HD — 주인공 코코(부위 리그)·효과 그림. 정본: docs/lab-surv-coco-hd-artdir.md 1판.
 * 굽기: bakeCoco(k) 한 번 → 매 프레임은 drawImage 만(경로 그리기 없음).
 * 좌표: 월드 단위, (x,y) = 발 기준점, 위가 −y. 부위는 오른쪽 보기로 정의하고 왼쪽 판은 빛 방향(왼쪽 위)을 지킨 채 따로 굽는다.
 * 세상·적 그림(lab-surv-coco-hd-art-world.js)과 같은 SurvArt.cocoHD 객체에 합쳐진다. */
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
  const W = ["#d9d2c6", "#efe8dc", "#f8f4ec"]; // 흰 티
  const BEAR = "#b8643a";
  const GR = ["#2f7d4a", "#47a35a", "#6cc46a", "#9bdc7c", "#cdeea0"];
  const DI = ["#b98d5e", "#d9b27f", "#ecd3a6", "#f7e8c8"];
  const GOLD = ["#ffd36b", "#fff0b8"];
  const WIND = "#e9fbff";
  const BRASS = ["#a8742a", "#e0a640"];
  const BUB = ["#9ec9ee", "#cfe8fb", "#eef8ff"];
  const RB = ["#b9a6ff", "#8fe3ff", "#ffd1f0"];
  const FAR = [C[0], C[0], C[1], C[2], C[3]]; // 먼 쪽 다리·귀: 한 단 어둡게
  const MZ = [C[0], C[1], C[3], K[2], C[4]]; // 주둥이: 밝은 털 + 크림 흰 털 결

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const fr = (v) => v - Math.floor(v);
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + clamp(a, 0, 1).toFixed(3) + ")";
  }
  function mk(w, h) {
    if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
    if (typeof document !== "undefined" && document.createElement) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
    return null;
  }

  // ── 곡선 도구 ──
  function polar(cx, cy, rx, ry, n, rf) {
    const out = [];
    for (let i = 0; i < n; i++) { const a = -Math.PI + (i / n) * TAU, f = rf ? rf(a) : 1; out.push([cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f]); }
    return out;
  }
  function cr(pts, per) { // 닫힌 Catmull-Rom 을 촘촘히
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
  function resample(d, sp) { // 같은 간격으로
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
  function scallop(p, bump) { // 작은 반원이 이어진 곱슬 외곽
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
  function shape(pts, sp, bump) { const r = resample(cr(pts, 10), sp); return bump ? scallop(r, bump) : smooth(r); }

  // 스티커 칠: 그늘(1) → 바탕(2, 왼쪽 위로 밀어 오른쪽 아래에 그늘 초승달) → 하이라이트(4) → 곱슬 결(3) → 외곽(0)
  function paint(c, P, ramp, o) {
    const m = o.m, sh = o.sh || [0.7, 0.8];
    c.save();
    c.fillStyle = ramp[1]; c.fill(P); c.clip(P);
    c.save(); c.translate(-m * sh[0], -sh[1]); c.fillStyle = ramp[2]; c.fill(P); c.restore();
    const hx = o.cx - m * o.rx * 0.36, hy = o.cy - o.ry * 0.42, hr = Math.max(o.rx, o.ry) * (o.hr || 0.8);
    const g = c.createRadialGradient(hx, hy, 0, hx, hy, hr);
    const ha = o.ha == null ? 0.8 : o.ha;
    g.addColorStop(0, rgba(ramp[4], ha)); g.addColorStop(0.5, rgba(ramp[4], ha * 0.35)); g.addColorStop(1, rgba(ramp[4], 0));
    c.fillStyle = g; c.fillRect(o.cx - o.rx - 3, o.cy - o.ry - 3, o.rx * 2 + 6, o.ry * 2 + 6);
    if (o.curls) {
      c.strokeStyle = ramp[3]; c.lineWidth = o.cw || 0.36; c.lineCap = "round";
      for (const q of o.curls) { c.beginPath(); c.arc(q[0], q[1], q[2], q[3] == null ? 3.5 : q[3], q[4] == null ? 5.9 : q[4]); c.stroke(); }
    }
    if (o.extra) o.extra(c);
    c.restore();
    c.lineJoin = "round"; c.lineWidth = o.inner ? 0.5 : o.line || 0.8; c.strokeStyle = o.inner ? ramp[1] : ramp[0]; c.stroke(P);
  }
  function radial(c, x, y, r, hex, a0, a1) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(hex, a0)); g.addColorStop(1, rgba(hex, a1 || 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function disc(c, x, y, r, col) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = col; c.fill(); }

  // ── 부위 정의(축 = 0,0) ──
  const LEG = [[-1.6, -0.8], [1.6, -0.8], [1.25, 3.2], [1.1, 6.3], [1.55, 7.8], [1.95, 8.8], [1.2, 9.25], [-0.9, 9.25], [-1.5, 8.6], [-1.25, 6.3], [-1.35, 3.2]];
  const EAR = [[0, -0.9], [1.5, 0.2], [2.0, 3.0], [2.2, 6.0], [1.7, 8.2], [0, 9.1], [-1.7, 8.5], [-2.2, 6.0], [-1.9, 2.6], [-1.3, 0.2]];
  const sc = (pts, s) => pts.map((p) => [p[0] * s, p[1] * s]);

  const PARTS = {
    body: [-8.4, -5.8, 8.4, 5.8, (c, m) => {
      paint(c, shape(polar(0, 0, 7.2, 4.5, 30, (a) => 1 + 0.04 * Math.cos(a)), 1.3, 0.13), C, { m, cx: 0, cy: 0, rx: 7.2, ry: 4.5, sh: [0.9, 1.1],
        curls: [[-3.6, -1.7, 0.8], [-0.6, -2.5, 0.8], [2.4, -1.6, 0.7], [-4.8, 1.0, 0.7], [-1.8, 0.4, 0.75], [1.2, 1.7, 0.7], [-3.4, 2.6, 0.6]] });
    }],
    chest: [-4.2, -5, 4.2, 5, (c, m) => {
      paint(c, shape(polar(0, 0, 3.1, 3.8, 16), 1.15, 0.14), C, { m, cx: 0, cy: 0, rx: 3.1, ry: 3.8, sh: [0.6, 0.7], inner: 1, curls: [[-0.6, -1.2, 0.65], [0.8, 0.6, 0.6], [-0.9, 1.6, 0.55]] });
    }],
    head: [-6.4, -7.2, 6.4, 6.4, (c, m) => {
      const rf = (a) => 1 + 0.12 * Math.exp(-Math.pow(a + 1.85, 2) / 0.35) + 0.05 * Math.exp(-Math.pow(a - 1.0, 2) / 0.3);
      paint(c, shape(polar(0, 0, 5, 5, 32, rf), 1.2, 0.14), C, { m, cx: 0, cy: -0.3, rx: 5, ry: 5.2, sh: [1.0, 1.2],
        curls: [[-2.4, -3.6, 0.8], [0.2, -4.1, 0.8], [-3.8, -1.2, 0.7], [2.4, -3.0, 0.7], [-1.2, -1.8, 0.65], [-3.2, 1.8, 0.6]] });
    }],
    muzzle: [-3.6, -2.8, 3.8, 3.2, (c, m) => {
      paint(c, shape(polar(0, 0, 2.7, 2.0, 16), 0.95, 0.1), MZ, { m, cx: 0, cy: 0, rx: 2.7, ry: 2.0, sh: [0.45, 0.55], ha: 0.7, cw: 0.3, inner: 1,
        curls: [[-1.0, 1.3, 0.45, 0.2, 2.6], [0.2, 1.65, 0.4, 0.2, 2.6], [-1.6, 0.2, 0.4], [1.0, 1.4, 0.35, 0.2, 2.6]],
        extra: (c) => { c.fillStyle = rgba(K[3], 0.6); [[-0.5, 1.0], [0.6, 1.2], [-1.4, 0.9], [-0.2, 1.7]].forEach((q) => disc(c, q[0], q[1], 0.22, c.fillStyle)); } });
      // 코
      const nose = smooth([[1.3, -1.15], [2.3, -1.3], [3.2, -0.95], [3.3, -0.25], [2.6, 0.3], [1.9, 0.25], [1.25, -0.35]]);
      c.fillStyle = I[0]; c.fill(nose);
      c.save(); c.clip(nose); radial(c, 2.0 - m * 0.2, -1.0, 1.1, I[2], 0.9, 0); c.restore();
      c.save(); c.beginPath(); c.ellipse(2.05 - m * 0.15, -0.88, 0.36, 0.22, -0.3 * m, 0, TAU); c.fillStyle = rgba(S[0], 0.85); c.fill(); c.restore();
      // 입(ω)
      c.strokeStyle = I[1]; c.lineWidth = 0.3; c.lineCap = "round";
      c.beginPath(); c.moveTo(2.3, 0.3); c.lineTo(2.25, 0.95); c.stroke();
      c.beginPath(); c.arc(1.75, 0.95, 0.5, 0.1, Math.PI * 0.95); c.stroke();
      c.beginPath(); c.arc(2.75, 0.95, 0.5, 0.05, Math.PI * 0.9); c.stroke();
    }],
    eyesOpen: [-2.6, -2.2, 4.8, 3.8, (c, m) => { eyes(c, m, "open"); }],
    eyesClosed: [-2.6, -2.2, 4.8, 3.8, (c, m) => { eyes(c, m, "closed"); }],
    eyesHappy: [-2.6, -2.2, 4.8, 3.8, (c, m) => { eyes(c, m, "happy"); }],
    earNear: [-3.2, -1.8, 3.2, 10.2, (c, m) => { ear(c, m, EAR, C, [C[0], K[0], K[1], K[2], K[3]]); }],
    earFar: [-3, -1.8, 3, 9.4, (c, m) => { ear(c, m, sc(EAR, 0.9), FAR, [C[0], K[0], K[0], K[1], K[2]]); }],
    tail: [-5.6, -7.2, 1.6, 1.4, (c, m) => {
      const st = new Path2D(); st.moveTo(0, 0); st.quadraticCurveTo(-0.3, -1.7, -1.6, -2.7);
      c.lineCap = "round"; c.strokeStyle = C[0]; c.lineWidth = 2.5; c.stroke(st); c.strokeStyle = C[2]; c.lineWidth = 1.6; c.stroke(st);
      paint(c, shape(polar(-2.4, -3.9, 2.4, 2.4, 14), 1.0, 0.16), C, { m, cx: -2.4, cy: -3.9, rx: 2.4, ry: 2.4, sh: [0.55, 0.6], curls: [[-2.8, -4.4, 0.6], [-1.6, -3.2, 0.5]] });
    }],
    legNear: [-2.6, -1.6, 3.0, 10.2, (c, m) => { leg(c, m, C); }],
    legFar: [-2.6, -1.6, 3.0, 10.2, (c, m) => { leg(c, m, FAR); }],
    haunch: [-4.8, -4.8, 5.0, 4.8, (c, m) => {
      paint(c, shape(polar(2.1, 3.0, 2.1, 1.0, 12), 0.9, 0.08), C, { m, cx: 2.1, cy: 3.0, rx: 2.1, ry: 1.0, sh: [0.3, 0.35] });
      paint(c, shape(polar(0, 0, 3.6, 3.4, 22), 1.15, 0.14), C, { m, cx: 0, cy: 0, rx: 3.6, ry: 3.4, sh: [0.7, 0.8], inner: 1, curls: [[-1.2, -1.0, 0.7], [0.9, 0.4, 0.65], [-0.6, 1.6, 0.55]] });
    }],
    mouth: [-2.0, -1.2, 2.0, 2.6, (c) => {
      const P = smooth([[-1.0, -0.3], [0, -0.42], [1.0, -0.3], [0.8, 0.7], [0, 1.25], [-0.8, 0.7]]);
      c.fillStyle = I[2]; c.fill(P);
      c.save(); c.clip(P); c.beginPath(); c.ellipse(0, 1.0, 0.85, 0.6, 0, 0, TAU); c.fillStyle = T[1]; c.fill(); radial(c, -0.25, 0.8, 0.55, T[2], 0.85, 0); c.restore();
      c.lineJoin = "round"; c.lineWidth = 0.32; c.strokeStyle = I[1]; c.stroke(P);
    }],
    tongue: [-1.5, -0.8, 1.5, 2.6, (c) => {
      const P = smooth([[-0.7, -0.2], [0.7, -0.2], [0.75, 1.1], [0, 1.85], [-0.75, 1.1]]);
      c.fillStyle = T[1]; c.fill(P);
      c.save(); c.clip(P); radial(c, -0.25, 0.4, 0.8, T[2], 0.85, 0); c.restore();
      c.strokeStyle = T[0]; c.lineWidth = 0.32; c.lineJoin = "round"; c.stroke(P);
      c.lineWidth = 0.22; c.beginPath(); c.moveTo(0, 0.1); c.lineTo(0, 0.95); c.stroke();
    }],
    harness: [-8, -5.6, 8, 5.6, (c, m) => { outfit(c, m, "harness"); }],
    tee: [-8, -5.6, 8, 5.6, (c, m) => { outfit(c, m, "tee"); }],
    barkRing: [-1.4, -5.6, 6.2, 5.6, (c) => {
      c.lineCap = "round";
      [2.0, 3.4, 4.8].forEach((r, i) => {
        const a = 0.55 + i * 0.12;
        c.strokeStyle = rgba(I[1], 0.45); c.lineWidth = 1.1; c.beginPath(); c.arc(0, 0, r, -a, a); c.stroke();
        c.strokeStyle = S[1]; c.lineWidth = 0.6; c.beginPath(); c.arc(0, 0, r, -a, a); c.stroke();
      });
    }, { noFlash: true }],
  };

  function eyes(c, m, kind) {
    radial(c, -0.7, 2.1, 1.45, T[2], 0.55, 0); // 볼
    const E = [[0, 0, 1.42], [3.0, -0.25, 1.15]];
    if (kind === "open") {
      for (const [x, y, r] of E) {
        disc(c, x, y, r, I[0]);
        c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip(); radial(c, x + m * 0.2 * r, y + r * 0.85, r * 0.9, I[2], 0.95, 0); c.restore();
        disc(c, x - m * 0.38 * r, y - 0.38 * r, r * 0.36, S[1]);
        disc(c, x + m * 0.36 * r, y + 0.34 * r, r * 0.16, S[0]);
      }
    } else {
      c.strokeStyle = I[1]; c.lineCap = "round";
      for (const [x, y, r] of E) {
        c.lineWidth = 0.5 * (r / 1.42) + 0.05; c.beginPath();
        if (kind === "closed") c.arc(x, y - 0.35 * r, r * 0.8, Math.PI * 0.18, Math.PI * 0.82);
        else c.arc(x, y + 0.55 * r, r * 0.8, Math.PI * 1.16, Math.PI * 1.84);
        c.stroke();
      }
    }
  }
  function ear(c, m, pts, ramp, cream) {
    const P = shape(pts, 0.95, 0.2);
    const ty = pts[5][1];
    paint(c, P, ramp, { m, cx: 0, cy: ty * 0.4, rx: 2.1, ry: ty * 0.55, sh: [0.6, 0.4], ha: 0.6, curls: [[-0.6, ty * 0.3, 0.6], [0.6, ty * 0.5, 0.55]],
      extra: (c) => {
        const tip = shape(polar(0, ty * 0.9, 2.7, 2.1, 14), 0.85, 0.16);
        c.fillStyle = cream[1]; c.fill(tip);
        c.save(); c.clip(tip); c.translate(-m * 0.4, -0.45); c.fillStyle = cream[2]; c.fill(tip); c.restore();
        c.save(); c.clip(tip); radial(c, -m * 0.6, ty * 0.84, 1.5, cream[4], 0.8, 0); c.restore();
        c.strokeStyle = cream[3]; c.lineWidth = 0.3; c.lineCap = "round";
        [[-0.7, ty * 0.92, 0.45], [0.6, ty * 0.98, 0.4]].forEach((q) => { c.beginPath(); c.arc(q[0], q[1], q[2], 3.4, 5.9); c.stroke(); });
        c.strokeStyle = C[1]; c.lineWidth = 0.4; c.stroke(tip);
      } });
  }
  function leg(c, m, ramp) {
    paint(c, shape(LEG, 1.1, 0.1), ramp, { m, cx: 0, cy: 4.5, rx: 1.6, ry: 4.8, sh: [0.45, 0.25], ha: 0.6, curls: [[-0.2, 2.2, 0.55], [0.1, 5.0, 0.5]] });
    c.strokeStyle = ramp[1]; c.lineWidth = 0.28; c.lineCap = "round";
    c.beginPath(); c.moveTo(0.55, 8.4); c.lineTo(0.7, 9.1); c.moveTo(1.3, 8.3); c.lineTo(1.5, 8.95); c.stroke();
  }
  function outfit(c, m, kind) {
    const inset = smooth(polar(0, 0, 7.0, 4.35, 28, (a) => 1 + 0.04 * Math.cos(a)));
    c.save(); c.clip(inset);
    const reg = new Path2D();
    if (kind === "harness") { reg.moveTo(0.4, -6); reg.bezierCurveTo(-0.9, -2, -0.6, 2, 0.6, 6); }
    else { reg.moveTo(-3.0, -6); reg.bezierCurveTo(-2.0, -2, -2.2, 2, -3.6, 6); }
    reg.lineTo(9, 6); reg.lineTo(9, -6); reg.closePath();
    const ramp = kind === "harness" ? [TEAL[0], TEAL[0], TEAL[1], TEAL[2], TEAL[2]] : [W[0], W[0], W[1], W[2], W[2]];
    c.save(); c.clip(reg);
    c.fillStyle = ramp[1]; c.fillRect(-9, -6, 18, 12);
    c.save(); c.translate(-m * 0.6, -0.8); c.fillStyle = ramp[2]; c.fill(inset); c.restore();
    if (kind === "tee") { c.save(); c.translate(-m * 0.9, -1.4); c.fillStyle = rgba(W[2], 0.9); c.fill(inset); c.restore(); }
    const cx = kind === "harness" ? 4 : 2;
    radial(c, cx - m * 1.6, -2.2, 3.2, ramp[4], kind === "harness" ? 0.6 : 0.8, 0);
    if (kind === "harness") {
      [[2.2, -2.6], [4.6, -0.6], [2.6, 1.6], [5.6, -3.0], [1.6, 3.6], [4.4, 2.8], [6.4, 1.0]].forEach(([x, y], i) => {
        const pc = i % 3 === 2 ? PUR[2] : FL[1];
        for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + i; disc(c, x + Math.cos(a) * 0.38, y + Math.sin(a) * 0.38, 0.3, pc); }
        disc(c, x, y, 0.24, FL[0]);
      });
      [[3.4, -3.4], [6.2, -1.6], [3.4, 0.8], [5.4, 3.8]].forEach(([x, y]) => disc(c, x, y, 0.2, PUR[2]));
    } else {
      [[0.6, -1.2], [3.8, 1.6], [5.6, -2.2]].forEach(([x, y]) => {
        disc(c, x - 0.62, y - 0.62, 0.4, BEAR); disc(c, x + 0.62, y - 0.62, 0.4, BEAR); disc(c, x, y, 0.82, BEAR);
        disc(c, x, y + 0.25, 0.36, K[2]);
      });
    }
    c.lineWidth = 0.55; c.strokeStyle = ramp[0]; c.stroke(inset);
    c.restore();
    // 가장자리 띠
    const edge = new Path2D();
    if (kind === "harness") { edge.moveTo(0.4, -6); edge.bezierCurveTo(-0.9, -2, -0.6, 2, 0.6, 6); }
    else { edge.moveTo(-3.0, -6); edge.bezierCurveTo(-2.0, -2, -2.2, 2, -3.6, 6); }
    c.lineCap = "round";
    if (kind === "harness") {
      c.strokeStyle = PUR[0]; c.lineWidth = 1.5; c.stroke(edge); c.strokeStyle = PUR[1]; c.lineWidth = 0.95; c.stroke(edge);
      c.save(); c.translate(-m * 0.15, -0.1); c.strokeStyle = PUR[2]; c.lineWidth = 0.3; c.stroke(edge); c.restore();
    } else {
      c.strokeStyle = W[0]; c.lineWidth = 1.2; c.stroke(edge); c.strokeStyle = W[2]; c.lineWidth = 0.65; c.stroke(edge);
    }
    c.restore();
    if (kind === "harness") { // 고리
      c.lineWidth = 0.75; c.strokeStyle = BRASS[0]; c.beginPath(); c.arc(1.0, -4.4, 0.62, 0, TAU); c.stroke();
      c.lineWidth = 0.4; c.strokeStyle = GOLD[0]; c.beginPath(); c.arc(1.0, -4.4, 0.62, 3.4, 5.6); c.stroke();
    }
  }

  // ── 효과 이미지(가운데 0,0, 지름 8 단위 기준) ──
  function star4(c, r, ri) { const P = new Path2D(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU - Math.PI / 2, rr = i % 2 ? ri : r; i ? P.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : P.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } P.closePath(); return P; }
  const FX = {
    p_dust: [-4.2, -4.2, 4.2, 4.2, (c) => {
      [[-1.3, 0.6, 2.4], [1.4, 0.5, 2.2], [0, -0.9, 2.7]].forEach(([x, y, r]) => radial(c, x, y + 0.5, r + 0.3, DI[1], 0.55, 0));
      [[-1.3, 0.4, 2.2], [1.4, 0.3, 2.0], [0, -1.1, 2.5]].forEach(([x, y, r]) => radial(c, x, y, r, DI[3], 0.95, 0));
    }],
    p_sparkle: [-4.2, -4.2, 4.2, 4.2, (c) => {
      radial(c, 0, 0, 4, GOLD[0], 0.55, 0);
      const P = star4(c, 3.8, 0.9); c.fillStyle = GOLD[1]; c.fill(P); c.lineJoin = "round"; c.lineWidth = 0.35; c.strokeStyle = GOLD[0]; c.stroke(P);
      disc(c, 0, 0, 0.7, S[1]);
    }],
    p_fur: [-4.2, -4.2, 4.2, 4.2, (c) => {
      paint(c, shape(polar(0, 0, 2.6, 1.9, 12), 0.95, 0.18), C, { m: 1, cx: 0, cy: 0, rx: 2.6, ry: 1.9, sh: [0.45, 0.5], curls: [[-0.4, 0, 0.7]] });
    }],
    p_bubble: [-4.2, -4.2, 4.2, 4.2, (c) => {
      disc(c, 0, 0, 3.5, rgba(BUB[1], 0.35));
      radial(c, 0.6, 0.8, 3.2, BUB[2], 0, 0.4);
      c.lineCap = "round";
      c.lineWidth = 0.45; c.strokeStyle = rgba(RB[2], 0.8); c.beginPath(); c.arc(0, 0, 2.7, 0.2, 1.4); c.stroke();
      c.strokeStyle = rgba(RB[1], 0.7); c.beginPath(); c.arc(0, 0, 2.7, 1.5, 2.4); c.stroke();
      c.strokeStyle = rgba(RB[0], 0.5); c.beginPath(); c.arc(0, 0, 2.7, 2.5, 3.0); c.stroke();
      c.lineWidth = 0.42; c.strokeStyle = BUB[0]; c.beginPath(); c.arc(0, 0, 3.5, 0, TAU); c.stroke();
      c.save(); c.beginPath(); c.ellipse(-1.3, -1.45, 0.95, 0.55, -0.7, 0, TAU); c.fillStyle = BUB[2]; c.fill(); c.restore();
      disc(c, -2.3, -0.3, 0.3, BUB[2]);
    }],
    p_heart: [-4.4, -4.4, 4.4, 4.4, (c) => {
      const P = new Path2D(); P.moveTo(0, 3.3); P.bezierCurveTo(-4.4, 0.3, -2.8, -3.9, 0, -1.5); P.bezierCurveTo(2.8, -3.9, 4.4, 0.3, 0, 3.3); P.closePath();
      paint(c, P, [T[0], T[0], T[1], T[2], T[2]], { m: 1, cx: 0, cy: 0, rx: 3.2, ry: 3, sh: [0.5, 0.6], line: 0.6 });
      disc(c, -1.5, -1.2, 0.5, S[1]);
    }],
    p_star: [-4.4, -4.4, 4.4, 4.4, (c) => {
      radial(c, 0, 0, 4.3, GOLD[0], 0.4, 0);
      const pts = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, r = i % 2 ? 1.6 : 3.5; pts.push([Math.cos(a) * r, Math.sin(a) * r + 0.2]); }
      const P = new Path2D(); pts.forEach((p, i) => (i ? P.lineTo(p[0], p[1]) : P.moveTo(p[0], p[1]))); P.closePath();
      c.lineJoin = "round"; c.lineWidth = 1.1; c.strokeStyle = BRASS[1]; c.stroke(P);
      c.fillStyle = FL[0]; c.fill(P);
      c.save(); c.clip(P); radial(c, -1.0, -1.0, 2.6, GOLD[1], 0.95, 0); c.restore();
      disc(c, -0.8, -0.8, 0.4, S[1]);
    }],
    shadow: [-4, -4, 4, 4, (c) => { radial(c, 0, 0, 4, I[0], 0.28, 0); }],
    dab: [-3.2, -1.4, 3.2, 1.4, (c) => {
      c.save(); c.scale(1, 0.42); radial(c, 0, 0, 3.1, GR[4], 0.9, 0); c.restore();
      c.save(); c.scale(1, 0.25); radial(c, 0, -1.2, 2.4, GR[3], 0, 0); c.restore();
    }],
    wave: [-10.4, -10.4, 10.4, 10.4, (c) => {
      const g = c.createRadialGradient(0, 0, 5.5, 0, 0, 10.2);
      g.addColorStop(0, rgba(WIND, 0)); g.addColorStop(0.6, rgba(WIND, 0.5)); g.addColorStop(0.8, rgba(WIND, 0.32)); g.addColorStop(1, rgba(WIND, 0));
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 10.3, 0, TAU); c.fill();
      c.lineCap = "round";
      for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; c.lineWidth = 0.9; c.strokeStyle = rgba(WIND, 0.95); c.beginPath(); c.arc(0, 0, 8.6, a, a + 1.2); c.stroke(); c.lineWidth = 0.5; c.beginPath(); c.arc(0, 0, 7.2, a + 0.6, a + 1.4); c.stroke(); }
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.5; c.save(); c.translate(Math.cos(a) * 9.1, Math.sin(a) * 9.1); radial(c, 0, 0, 1.5, GOLD[0], 0.6, 0); c.scale(0.32, 0.32); c.fillStyle = GOLD[1]; c.fill(star4(c, 3.6, 0.9)); c.restore(); }
    }, { noFlash: true }],
    auraRing: [-10.4, -10.4, 10.4, 10.4, (c) => {
      const g = c.createRadialGradient(0, 0, 7, 0, 0, 10.3);
      g.addColorStop(0, rgba(WIND, 0)); g.addColorStop(0.6, rgba(WIND, 0.3)); g.addColorStop(1, rgba(WIND, 0));
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 10.3, 0, TAU); c.fill();
      c.lineCap = "round"; c.lineWidth = 0.4; c.strokeStyle = rgba(WIND, 0.7);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; c.beginPath(); c.arc(0, 0, 9.0, a, a + 0.8); c.stroke(); }
    }, { noFlash: true }],
    petal: [-2, -1.4, 2, 1.4, (c) => {
      const P = new Path2D(); P.moveTo(-1.6, 0); P.bezierCurveTo(-0.6, -1.3, 1.0, -1.1, 1.6, 0); P.bezierCurveTo(1.0, 1.1, -0.6, 1.3, -1.6, 0); P.closePath();
      paint(c, P, [T[0], FL[1], FL[1], T[2], T[2]], { m: 1, cx: 0, cy: 0, rx: 1.4, ry: 0.9, sh: [0.2, 0.25], line: 0.3 });
    }, { noFlash: true }],
    leaf: [-2, -1.4, 2, 1.4, (c) => {
      const P = new Path2D(); P.moveTo(-1.6, 0); P.bezierCurveTo(-0.6, -1.2, 1.0, -1.0, 1.7, 0); P.bezierCurveTo(1.0, 1.0, -0.6, 1.2, -1.6, 0); P.closePath();
      paint(c, P, [GR[0], GR[1], GR[2], GR[4], GR[3]], { m: 1, cx: 0, cy: 0, rx: 1.4, ry: 0.9, sh: [0.2, 0.25], line: 0.3 });
      c.strokeStyle = GR[4]; c.lineWidth = 0.18; c.beginPath(); c.moveTo(-1.2, 0); c.lineTo(1.2, 0); c.stroke();
    }, { noFlash: true }],
    boneE: [-2.6, -1.6, 2.6, 1.6, (c) => { bone(c, [I[1], I[2], I[2], I[2]], 0.55); }, { noFlash: true }],
    boneF: [-2.6, -1.6, 2.6, 1.6, (c) => { bone(c, [K[0], K[2], K[3], S[1]], 1); }, { noFlash: true }],
    boneG: [-2.6, -1.6, 2.6, 1.6, (c) => { bone(c, [BRASS[0], GOLD[0], GOLD[1], S[1]], 1); }, { noFlash: true }],
    gPill: [-7.6, -2.2, 7.6, 2.2, (c) => {
      const P = new Path2D(); P.roundRect ? P.roundRect(-7.2, -1.8, 14.4, 3.6, 1.8) : P.rect(-7.2, -1.8, 14.4, 3.6);
      c.fillStyle = rgba(I[1], 0.45); c.fill(P); c.lineWidth = 0.3; c.strokeStyle = rgba(S[1], 0.35); c.stroke(P);
    }, { noFlash: true }],
    gGlow: [-9, -4.5, 9, 4.5, (c) => { c.save(); c.scale(1, 0.48); radial(c, 0, 0, 8.8, GOLD[0], 0.7, 0); c.restore(); }, { noFlash: true }],
  };
  function bone(c, r, a) { // r: [외곽, 그늘, 바탕, 빛]
    const prims = (cc, grow) => {
      cc.beginPath();
      for (const [x, y] of [[-1.75, -0.6], [-1.75, 0.6], [1.75, -0.6], [1.75, 0.6]]) { cc.moveTo(x + 0.72 + grow, y); cc.arc(x, y, 0.72 + grow, 0, TAU); }
      cc.rect(-1.8, -0.55 - grow, 3.6, 1.1 + grow * 2);
    };
    c.globalAlpha = a;
    prims(c, 0.38); c.fillStyle = r[0]; c.fill("nonzero");
    prims(c, 0); c.fillStyle = r[1]; c.fill("nonzero");
    c.save(); c.translate(-0.15, -0.22); prims(c, -0.05); c.fillStyle = r[2]; c.fill("nonzero"); c.restore();
    c.globalAlpha = a * 0.9; disc(c, -1.85, -0.75, 0.3, r[3]);
    c.globalAlpha = 1;
  }

  // ── 굽기 ──
  let B = null; // { k, parts }
  function bakeOne(k, x0, y0, x1, y1, fn, opt) {
    const p = 0.8, w = x1 - x0 + 2 * p, h = y1 - y0 + 2 * p, cw = Math.ceil(w * k), ch = Math.ceil(h * k);
    const part = { w: cw / k, h: ch / k, oy: y0 - p, ox: {}, c: {}, f: {}, bytes: 0 };
    for (const m of opt && opt.single ? [1] : [1, -1]) {
      const cv = mk(cw, ch); if (!cv) return null;
      const c = cv.getContext("2d");
      c.setTransform(k * m, 0, 0, k, m === 1 ? -(x0 - p) * k : (x1 + p) * k, -(y0 - p) * k);
      fn(c, m);
      part.c[m] = cv; part.ox[m] = m === 1 ? x0 - p : -(x1 + p); part.bytes += cw * ch * 4;
      if (!(opt && opt.noFlash)) {
        const fc = mk(cw, ch), f = fc.getContext("2d");
        f.drawImage(cv, 0, 0); f.globalCompositeOperation = "source-in"; f.fillStyle = K[3]; f.fillRect(0, 0, cw, ch);
        part.f[m] = fc; part.bytes += cw * ch * 4;
      }
    }
    if (opt && opt.single) { part.c[-1] = part.c[1]; part.ox[-1] = part.ox[1]; part.f[-1] = part.f[1]; }
    return part;
  }
  function bakeCoco(k) {
    if (typeof Path2D === "undefined" || !mk(1, 1)) { B = null; return null; }
    const parts = {};
    for (const n in PARTS) { const d = PARTS[n]; parts[n] = bakeOne(k, d[0], d[1], d[2], d[3], d[4], d[5]); }
    for (const n in FX) { const d = FX[n]; parts[n] = bakeOne(k, d[0], d[1], d[2], d[3], d[4], Object.assign({ single: true, noFlash: true }, d[5])); }
    const digits = [];
    for (let i = 0; i < 10; i++) digits.push(bakeDigit(k, String(i)));
    let canvases = 0, bytes = 0;
    for (const n in parts) { const p = parts[n]; if (!p) continue; bytes += p.bytes; canvases += new Set([p.c[1], p.c[-1], p.f[1], p.f[-1]].filter(Boolean)).size; }
    digits.forEach((d) => { bytes += d.cv.width * d.cv.height * 4; canvases++; });
    B = { k, parts, digits, stats: { parts: Object.keys(PARTS).length, fx: Object.keys(FX).length, canvases, bytes } };
    return B.stats;
  }
  function bakeDigit(k, ch) {
    const H = 8, font = "900 " + (H * k).toFixed(1) + 'px "Pretendard", system-ui, sans-serif';
    const probe = mk(4, 4).getContext("2d"); probe.font = font;
    const wpx = Math.ceil(probe.measureText(ch).width + 2.2 * k), hpx = Math.ceil((H + 2.6) * k);
    const cv = mk(wpx, hpx), c = cv.getContext("2d");
    c.font = font; c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round";
    c.lineWidth = 1.5 * k; c.strokeStyle = I[1]; c.strokeText(ch, wpx / 2, hpx / 2 + 0.3 * k);
    c.fillStyle = S[1]; c.fillText(ch, wpx / 2, hpx / 2 + 0.3 * k);
    return { cv, w: wpx / k, h: hpx / k, adv: (wpx - 2.0 * k) / k };
  }

  // ── 찍기 ──
  function put(c, name, X, Y, rot, sx, sy, D, a, fl) {
    const p = B.parts[name]; if (!p) return;
    c.save();
    c.translate(D * X, Y);
    if (rot) c.rotate(D * rot);
    if (sx !== 1 || sy !== 1) c.scale(sx, sy);
    if (a !== 1) c.globalAlpha *= a;
    c.drawImage(p.c[D], p.ox[D], p.oy, p.w, p.h);
    if (fl > 0 && p.f[D]) { c.globalAlpha *= fl; c.drawImage(p.f[D], p.ox[D], p.oy, p.w, p.h); }
    c.restore();
  }

  function blinking(t) {
    const n = Math.floor(t / 4), off = 0.3 + 3.4 * fr(Math.sin(n * 12.9898 + 3.1) * 43758.5453), l = t - n * 4;
    return l > off && l < off + 0.13;
  }
  // 용수철 흉내(상태 없이): 모습이 바뀐 직후 감쇠 사인
  const spring = (pt, w, d) => Math.exp(-pt * d) * Math.sin(pt * w);

  function rig(t, pose, o) {
    const rd = !!o.reduce, pt = Math.max(0, o.poseT || 0), sp = clamp(o.speed == null ? 0.6 : o.speed, 0, 1);
    const ops = [], add = (n, x, y, r, sx, sy, a) => ops.push([n, x, y, r || 0, sx == null ? 1 : sx, sy == null ? 1 : sy, a == null ? 1 : a]);
    let rsx = 1, rsy = 1, dy = 0;
    const outfit = o.outfit === "tee" ? "tee" : "harness";
    const body = { x: -0.7, y: -11.4, r: 0, sx: 1, sy: 1 }, head = { x: 6.4, y: -17.4, r: 0, s: 1.08 }, chest = { x: 4.2, y: -12.6 };
    const tail = { x: -7.3, y: -13.6, r: -0.1 };
    let legs = [["legFar", -4.2, -9.6, 0], ["legFar", 4.4, -9.6, 0], ["legNear", -5.0, -9.2, 0], ["legNear", 3.6, -9.2, 0]];
    let haunch = null, earN = 0.1, earF = -0.06, earSy = 1, eyes = blinking(t) ? "eyesClosed" : "eyesOpen", mouth = false, tongue = false, ring = null, bubbles = false;
    const eSpring = rd ? 0 : 0.55 * spring(pt, 22, 7);

    if (pose === "walk" || !pose) {
      const hz = 1.3 + 2.3 * sp, ph = TAU * hz * t, amp = rd ? 0.22 : 0.436 * (0.45 + 0.55 * sp), s = Math.sin(ph) * amp;
      const bob = rd ? 0 : -(0.5 - 0.5 * Math.cos(2 * ph)), lag = TAU * 2 * hz * 0.08;
      const bobH = rd ? 0 : -(0.5 - 0.5 * Math.cos(2 * ph - lag));
      body.y += bob; body.r = rd ? 0 : 0.03 * Math.sin(2 * ph - 0.6); chest.y += bob; tail.y += bob;
      head.y += bobH; head.r = rd ? 0 : -0.04 * Math.sin(2 * ph - lag);
      legs = [["legFar", -4.2, -9.6 + bob, -s], ["legFar", 4.4, -9.6 + bob, s], ["legNear", -5.0, -9.2 + bob, s], ["legNear", 3.6, -9.2 + bob, -s]];
      earN = 0.12 + (rd ? 0 : 0.26 * Math.sin(2 * ph - lag) + 0.28 * sp); earF = -0.06 + (rd ? 0 : 0.15 * Math.sin(2 * ph - lag) + 0.18 * sp);
      tail.r = rd ? -0.1 : -0.1 + 0.32 * Math.sin(TAU * 3 * t);
      if (!rd) rsy = 1 + 0.02 * Math.cos(2 * ph);
    } else if (pose === "sit" || pose === "wag") {
      Object.assign(body, { x: -1.2, y: -8.4, r: -0.55 }); Object.assign(chest, { x: 4.1, y: -12.2 }); Object.assign(head, { x: 5.8, y: -17.9 });
      Object.assign(tail, { x: -7.2, y: -6.0, r: -0.5 }); haunch = { x: -4.2, y: -3.4 };
      legs = [["legFar", 3.9, -9.6, 0.02], ["legNear", 2.9, -9.2, 0.0]];
      if (!rd) { const e = Math.exp(-pt * 8); rsy = 1 - 0.16 * e * Math.cos((pt * TAU) / 0.32); rsx = 1 + (1 - rsy) * 0.6; }
      rsy *= 1 + 0.03 * Math.sin(Math.PI * t);
      if (pose === "wag") {
        const sw = rd ? 0 : 0.6 * Math.sin(TAU * 3 * t);
        tail.r = -0.5 + (rd ? 0.3 : 0.61 * Math.sin(TAU * 6 * t)); body.x += sw * 0.5; haunch.x += sw; tail.x += sw;
        earN -= 0.2; earF -= 0.1; earSy = 0.93; mouth = true; head.r = rd ? 0 : 0.05 * Math.sin(TAU * 1.5 * t);
      } else tail.r = -0.5 + (rd ? 0 : 0.06 * Math.sin(TAU * 0.5 * t));
    } else if (pose === "spin") {
      const th = TAU * 1.5 * pt;
      dy = rd ? 0 : -0.9 * Math.abs(Math.sin(th));
      legs = [["legFar", -4.2, -9.6, 0.2], ["legFar", 4.4, -9.6, -0.2], ["legNear", -5.0, -9.2, 0.25], ["legNear", 3.6, -9.2, -0.25]];
      earN = rd ? 0.1 : 1.15 + 0.15 * Math.sin(th * 2); earF = rd ? -0.06 : -0.95; tail.r = rd ? -0.1 : 0.5;
      eyes = "eyesHappy"; mouth = !rd;
    } else if (pose === "scoot") {
      Object.assign(body, { x: -0.4, y: -6.6, r: -0.26 }); Object.assign(chest, { x: 4.6, y: -9.0 }); Object.assign(head, { x: 7.0, y: -14.4, r: -0.12 });
      Object.assign(tail, { x: -7.3, y: -4.4, r: 0.75 }); haunch = { x: -4.4, y: -3.3 };
      legs = [["legFar", 5.4, -8.4, -0.5], ["legNear", 4.5, -8.0, -0.55]];
      rsx = 1.15; rsy = 0.88;
      if (!rd) { dy = -0.25 * Math.abs(Math.sin(TAU * 7 * t)); head.r += 0.05 * Math.sin(TAU * 7 * t); }
      earN = 0.55 + (rd ? 0 : 0.12 * Math.sin(TAU * 7 * t)); earF = 0.2; eyes = "eyesHappy"; tongue = true;
    } else if (pose === "bark") {
      const p = (pt % 0.45) / 0.45, rc = rd ? 0.5 : Math.sin(Math.PI * Math.min(p / 0.35, 1));
      legs = [["legFar", -4.2, -9.6, 0.08], ["legFar", 4.4, -9.6, -0.14], ["legNear", -5.0, -9.2, 0.1], ["legNear", 3.6, -9.2, -0.16]];
      head.x += 1.5 * rc; head.y -= 0.3 * rc; head.r = -0.1 * rc; chest.x += 0.4 * rc;
      if (!rd) rsy = 1 + 0.04 * rc;
      mouth = rd ? true : p < 0.6; earN = -0.35 - 0.15 * rc; earF = -0.4; earSy = 0.9;
      ring = { p: rd ? 0.4 : p };
    } else if (pose === "nap") {
      const br = 1 + 0.04 * Math.sin(TAU * 0.3 * t);
      Object.assign(body, { x: -0.8, y: -3.9, r: 0, sy: 0.82 * br, sx: 1 }); Object.assign(chest, { x: 4.2, y: -4.4 }); Object.assign(head, { x: 7.9, y: -6.3, r: 0.12 });
      Object.assign(tail, { x: -7.6, y: -3.2, r: -1.0 }); haunch = { x: -4.4, y: -3.5 };
      legs = [["legFar", 4.6, -2.9, -1.48], ["legNear", 3.8, -2.2, -1.52]];
      earN = 0.02; earF = -0.02; eyes = "eyesClosed"; bubbles = true;
    }
    if (pose !== "spin") { earN += eSpring; earF += eSpring * 0.7; }
    if (o.hurt) { rsy *= 0.9; rsx *= 1.06; }

    // 순서: 뒤 → 앞
    add("tail", tail.x, tail.y, tail.r);
    for (const L of legs) add(L[0], L[1], L[2], L[3]);
    add("body", body.x, body.y, body.r, body.sx, body.sy);
    add(outfit, body.x, body.y, body.r, body.sx, body.sy);
    if (haunch) add("haunch", haunch.x, haunch.y, 0);
    add("chest", chest.x, chest.y, 0);
    const cs = Math.cos(head.r), sn = Math.sin(head.r);
    const H = (ox, oy) => [head.x + (ox * cs - oy * sn) * head.s, head.y + (ox * sn + oy * cs) * head.s];
    const hs = head.s;
    let q = H(2.4, -3.0); add("earFar", q[0], q[1], head.r + earF, hs, hs * earSy);
    add("head", head.x, head.y, head.r, hs, hs);
    q = H(0.9, -0.9); add(eyes, q[0], q[1], head.r, hs, hs);
    q = H(3.7, 2.0); add("muzzle", q[0], q[1], head.r, hs, hs);
    if (mouth) { q = H(5.4, 3.5); add("mouth", q[0], q[1], head.r, hs, hs); }
    if (tongue) { q = H(5.6, 3.3); add("tongue", q[0], q[1], head.r + 0.15); }
    q = H(-3.1, -1.7); add("earNear", q[0], q[1], head.r + earN, hs, hs * earSy);
    if (ring) { q = H(7.6, 1.6); const s = 0.7 + 0.7 * ring.p; add("barkRing", q[0], q[1], -0.1, s, s, 1 - ring.p * ring.p); }
    if (bubbles) for (let i = 0; i < 3; i++) {
      const u = fr(t / 2.4 + i / 3), bq = H(1.5 + i * 0.6 + Math.sin(u * TAU) * 0.5, -6 - u * 7);
      const s = ((1.6 + i * 0.5) / 8) * (0.6 + u * 0.6);
      add("p_bubble", bq[0], bq[1], 0, s, s, Math.min(1, u * 5) * (1 - u));
    }
    return { ops, sx: rsx, sy: rsy, dy, flash: o.hurt ? 0.8 : 0 };
  }
  const GHOST = { body: 1, harness: 1, tee: 1, head: 1, earNear: 1, tail: 1 };
  function drawOps(c, ops, D, sx, sy, a, fl, only) {
    c.save(); c.scale(sx, sy);
    for (const op of ops) { if (only && !only[op[0]]) continue; put(c, op[0], op[1], op[2], op[3], op[4], op[5], D, op[6] * a, fl); }
    c.restore();
  }
  function drawCoco(c, x, y, t, dir, pose, o) {
    if (!B) return 0;
    o = o || {};
    let D = dir < 0 ? -1 : 1;
    const R = rig(t, pose || "walk", o);
    c.save(); c.translate(x, y + R.dy);
    if (pose === "spin" && !o.reduce) {
      const th = TAU * 1.5 * (o.poseT || 0);
      for (const [lag, a] of [[0.9, 0.16], [0.45, 0.3]]) { const cc = Math.cos(th - lag); drawOps(c, R.ops, cc < 0 ? -D : D, Math.max(0.12, Math.abs(cc)) * R.sx, R.sy, a, 0, GHOST); }
      const cc = Math.cos(th); if (cc < 0) D = -D; R.sx *= Math.max(0.12, Math.abs(cc));
    }
    drawOps(c, R.ops, D, R.sx, R.sy, 1, R.flash, null);
    c.restore();
    return R.ops.length;
  }

  // ── 효과 ──
  function drawShadow(c, x, y, w, alpha) {
    const p = B && B.parts.shadow; if (!p) return;
    const a0 = c.globalAlpha; c.globalAlpha = a0 * (alpha == null ? 1 : alpha);
    c.drawImage(p.c[1], x - w / 2, y - w * 0.17, w, w * 0.34);
    c.globalAlpha = a0;
  }
  function particle(c, kind, x, y, size, alpha, rot) {
    if (!B) return; const p = B.parts["p_" + kind]; if (!p) return;
    const s = size / 8;
    c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.scale(s, s); c.globalAlpha *= alpha == null ? 1 : alpha;
    c.drawImage(p.c[1], p.ox[1], p.oy, p.w, p.h); c.restore();
  }
  function drawGauge(c, x, y, g, t) {
    if (!B) return;
    g = clamp(g || 0, 0, 1); const full = g >= 0.999, P = B.parts;
    c.save(); c.translate(x, y);
    const pl = P.gPill; c.drawImage(pl.c[1], pl.ox[1], pl.oy, pl.w, pl.h);
    if (full) {
      const op = c.globalCompositeOperation, a0 = c.globalAlpha; c.globalCompositeOperation = "lighter"; c.globalAlpha = a0 * (0.45 + 0.35 * Math.sin(TAU * 2 * t));
      const gl = P.gGlow, s = 1 + 0.12 * Math.sin(TAU * 2 * t); c.drawImage(gl.c[1], gl.ox[1] * s, gl.oy * s, gl.w * s, gl.h * s);
      c.globalCompositeOperation = op; c.globalAlpha = a0;
    }
    for (let i = 0; i < 3; i++) {
      const bx = (i - 1) * 4.6, f = clamp(g * 3 - i, 0, 1), pop = full ? 1 + 0.1 * Math.max(0, Math.sin(TAU * 2 * t - i * 0.6)) : f >= 1 ? 1 : 1;
      c.save(); c.translate(bx, 0); c.scale(pop, pop);
      const e = P.boneE; c.drawImage(e.c[1], e.ox[1], e.oy, e.w, e.h);
      if (f > 0) {
        const b = full ? P.boneG : P.boneF, cv = b.c[1];
        // 왼→오 차오름(구운 이미지의 덧대 0.8 은 안 보이니 그만큼 보정)
        const ff = clamp((f * 5.2 + 0.8) / b.w, 0, 1);
        c.drawImage(cv, 0, 0, cv.width * ff, cv.height, b.ox[1], b.oy, b.w * ff, b.h);
      }
      c.restore();
    }
    c.restore();
  }
  function drawScoot(c, pts, t, alpha) {
    if (!B || !pts || pts.length < 2) return;
    const P = pts.map((p) => (Array.isArray(p) ? p : [p.x, p.y])), d = B.parts.dab, cv = d.c[1];
    let L = 0; const seg = [];
    for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(l); L += l; }
    if (L <= 0) return;
    const a0 = c.globalAlpha, base = alpha == null ? 1 : alpha;
    let acc = 0;
    for (let i = 1; i < P.length; i++) {
      const l = seg[i - 1]; if (l < 1e-3) continue;
      const u = (acc + l / 2) / L; acc += l;
      const fade = Math.min(1, u / 0.25, (1 - u) / 0.12) * base; if (fade <= 0) continue;
      const ax = P[i - 1][0], ay = P[i - 1][1], bx = P[i][0], by = P[i][1], ang = Math.atan2(by - ay, bx - ax), nx = -(by - ay) / l, ny = (bx - ax) / l;
      for (const off of [-1.3, 1.3]) {
        c.save(); c.translate((ax + bx) / 2 + nx * off, (ay + by) / 2 + ny * off); c.rotate(ang);
        c.globalAlpha = a0 * fade; c.scale((l + 2.2) / 6.4, 0.8);
        c.drawImage(cv, d.ox[1], d.oy, d.w, d.h); c.restore();
      }
    }
    c.globalAlpha = a0;
  }
  function drawSpinWave(c, x, y, r, alpha) {
    if (!B) return; const p = B.parts.wave, s = r / 10;
    c.save(); c.translate(x, y); c.rotate(r * 0.25); c.scale(s, s); c.globalAlpha *= alpha == null ? 1 : alpha;
    c.drawImage(p.c[1], p.ox[1], p.oy, p.w, p.h); c.restore();
  }
  function drawAura(c, x, y, r, t) {
    if (!B) return; const P = B.parts, s = r / 10;
    c.save(); c.translate(x, y);
    c.save(); c.scale(s, s); c.rotate(t * 0.8); c.drawImage(P.auraRing.c[1], P.auraRing.ox[1], P.auraRing.oy, P.auraRing.w, P.auraRing.h); c.restore();
    for (let i = 0; i < 6; i++) {
      const a = t * 1.6 + (i / 6) * TAU, rr = r * (0.9 + 0.06 * Math.sin(t * 2 + i)), im = P[i % 2 ? "leaf" : "petal"];
      c.save(); c.translate(Math.cos(a) * rr, Math.sin(a) * rr); c.rotate(a + Math.PI / 2 + Math.sin(t * 3 + i) * 0.5);
      c.drawImage(im.c[1], im.ox[1], im.oy, im.w, im.h); c.restore();
    }
    c.restore();
  }
  function damageNumber(c, n, x, y, alpha, scale) {
    if (!B) return;
    const s = String(Math.max(0, Math.round(n))), sc = (scale || 1) * 0.7, G = B.digits;
    let w = 0; for (const ch of s) w += G[+ch].adv;
    c.save(); c.translate(x, y); c.scale(sc, sc); c.globalAlpha *= alpha == null ? 1 : alpha;
    let cx = -w / 2;
    for (const ch of s) { const g = G[+ch]; c.drawImage(g.cv, cx + g.adv / 2 - g.w / 2, -g.h / 2, g.w, g.h); cx += g.adv; }
    c.restore();
  }

  SA.cocoHD = Object.assign(SA.cocoHD || {}, {
    bakeCoco, drawCoco, drawGauge, drawShadow, drawScoot, drawSpinWave, drawAura, particle, damageNumber,
    cocoStats: () => (B ? B.stats : null),
    COCO_POSES: ["walk", "sit", "wag", "spin", "scoot", "bark", "nap"],
  });
})(typeof window !== "undefined" ? window : globalThis);
