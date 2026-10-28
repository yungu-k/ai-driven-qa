// 코코의 하루 HD — 세상·적 그림: 공원 바닥·적·보스·줍는 것·탄·환경 효과.
// 방향·좌표·팔레트·선 규칙은 docs/lab-surv-coco-hd-artdir.md(3절 표의 색만 쓴다). 코코 리그는 lab-surv-coco-hd-art-coco.js —
// 두 파일은 같은 SurvArt.cocoHD 객체에 합쳐진다(Object.assign, 덮어쓰지 않는다).
// 기법: bakeWorld(k) 에서 Path2D·그라데이션으로 k 배 오프스크린 캔버스에 한 번 굽고, 매 프레임엔 drawImage(+회전·찌그러짐)만 한다.
// 좌표: ctx 는 월드→기기 변환(k = 월드 단위당 기기 px)이 걸려 있다. 단위는 월드 단위, (x, y) = 발 기준점. 빛은 왼쪽 위.
// node(document 없음)에선 굽기를 건너뛰고 그리기 함수는 아무것도 하지 않는다.
(function (root) {
  "use strict";
  const TAU = Math.PI * 2, LW = 0.8;

  // ── 팔레트(hd-artdir 3절 표만) ───────────────────────────────
  const GRASS = ["#2f7d4a", "#47a35a", "#6cc46a", "#9bdc7c", "#cdeea0"];
  const DIRT = ["#b98d5e", "#d9b27f", "#ecd3a6", "#f7e8c8"];
  const FLW = ["#ff8fb1", "#ffd166", "#8fd3ff", "#b99af0"], WOOD = ["#7a4a2a", "#a8693e"];
  const CREAM = ["#c9a27a", "#e8c9a0", "#f6e3c4", "#fff4e3"];
  const EYE = ["#24161d", "#3a2228", "#5a3a42"], SPK = ["#fff6e8", "#fffbf4"], TONG = ["#d9546a", "#f07a8a", "#ffb3bd"];
  const VIO = ["#6a3fb8", "#8b5cd6", "#b99af0"];
  const BR = ["#2a8fa8", "#5ad1e6", "#a8eef8"], BRISTLE = "#e8f4fb";
  const SUD = ["#9ec9ee", "#cfe8fb", "#eef8ff"], RAIN = ["#b9a6ff", "#8fe3ff", "#ffd1f0"];
  const BRASS = ["#a8742a", "#e0a640", "#ffcf4d", "#ffe9a3"], BTN = ["#c43a48", "#ff5d5d"];
  const VAC = ["#3b4290", "#4a54b0", "#6c7ae0", "#a3adf5"], RUB = "#2c2a3a";
  const DOG = ["#7d8292", "#a7acba", "#cfd3dc", "#eceef3"];
  const DISC = ["#3e4260", "#5a5f7a", "#8a90ad"], LAMP = "#ff5d5d", TUB = ["#cdd6e4", "#f3f6fb"], FOOT = "#e0a640", CHR = ["#9aa6bd", "#dfe6f2"];
  const SKY_AM = "#bfe6ff", SKY_NOON = "#9fd8ff", DUSK = ["#ffb38a", "#ff8fa3"], EVE = ["#3d3a7a", "#2a2858"], STREET = "#ffd36b";
  const GLOW = ["#ffd36b", "#fff0b8"], WATER = "#7fd4ff", WIND = "#e9fbff";

  // ── 캔버스 ─────────────────────────────────────────────────
  const hasDoc = typeof document !== "undefined" && !!document.createElement;
  const canMake = () => hasDoc || typeof OffscreenCanvas !== "undefined";
  let K = 0, KG = 0, B = null, NIMG = 0, MEM = 0, BAKE_MS = 0;
  function mk(w, h) {
    w = Math.max(1, Math.ceil(w)); h = Math.max(1, Math.ceil(h));
    if (hasDoc) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
    return new OffscreenCanvas(w, h);
  }
  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`; }
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; }
  // 월드 상자 (w×h 단위), 원점(발 기준점)이 왼쪽 위에서 (ax, ay) 떨어진 곳.
  function bake(w, h, ax, ay, fn, kk) {
    kk = kk || K;
    const c = mk(w * kk, h * kk), x = c.getContext("2d");
    x.setTransform(kk, 0, 0, kk, ax * kk, ay * kk); x.lineJoin = "round"; x.lineCap = "round";
    fn(x);
    NIMG++; MEM += c.width * c.height * 4;
    return { c, w: c.width / kk, h: c.height / kk, ax, ay };
  }
  function flashOf(im) {
    const c = mk(im.c.width, im.c.height), x = c.getContext("2d");
    x.drawImage(im.c, 0, 0); x.globalCompositeOperation = "source-atop"; x.fillStyle = rgba(CREAM[3], 0.84); x.fillRect(0, 0, c.width, c.height);
    NIMG++; MEM += c.width * c.height * 4;
    return { c, w: im.w, h: im.h, ax: im.ax, ay: im.ay };
  }
  function tintOf(im, list) { // source-atop 로 색을 덮어 시간대 판을 만든다
    const c = mk(im.c.width, im.c.height), x = c.getContext("2d");
    x.drawImage(im.c, 0, 0); x.globalCompositeOperation = "source-atop";
    for (const [col, a] of list) { x.fillStyle = rgba(col, a); x.fillRect(0, 0, c.width, c.height); }
    NIMG++; MEM += c.width * c.height * 4;
    return { c, w: im.w, h: im.h, ax: im.ax, ay: im.ay };
  }
  const put = (ctx, im, x, y) => ctx.drawImage(im.c, x - im.ax, y - im.ay, im.w, im.h);
  // 발 기준점 둘레로 회전·찌그러짐을 걸고 찍는다
  // save/restore 대신 역변환으로 되돌린다(적 150 에서 싸다). 회전이 없고 뒤집지 않으면 변환 없이 사각형만 늘린다.
  function putT(ctx, im, x, y, sx, sy, rot) {
    if (!rot && sx > 0) { ctx.drawImage(im.c, x - im.ax * sx, y - im.ay * sy, im.w * sx, im.h * sy); return; }
    ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(sx, sy);
    ctx.drawImage(im.c, -im.ax, -im.ay, im.w, im.h);
    ctx.scale(1 / sx, 1 / sy); if (rot) ctx.rotate(-rot); ctx.translate(-x, -y);
  }

  // ── 도형 ───────────────────────────────────────────────────
  function rrect(p, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); return p; }
  const RR = (x, y, w, h, r) => rrect(new Path2D(), x, y, w, h, r);
  function EL(cx, cy, rx, ry, rot) { const p = new Path2D(); p.ellipse(cx, cy, rx, ry, rot || 0, 0, TAU); return p; }
  const CI = (cx, cy, r) => EL(cx, cy, r, r);
  function circles(list, p) { p = p || new Path2D(); for (const [x, y, r] of list) { p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); } return p; }
  // 스티커: 외곽선을 먼저 두 배 굵기로 깔고(바깥 반만 남는다 → 합친 도형도 바깥 테만) 바탕 → 오른쪽 아래 그늘 → 왼쪽 위 흐린 하이라이트.
  // R = { o: 외곽(줄 0번), b: 바탕, s: 그늘, sa: 그늘 투명도, h: 하이라이트 }, bb = [x, y, w, h] 그라데이션 기준 상자.
  function sticker(c, p, bb, R, o) {
    o = o || {};
    const [x, y, w, h] = bb, m = Math.min(w, h);
    if (R.o) { c.lineWidth = (o.lw == null ? LW : o.lw) * 2; c.strokeStyle = R.o; c.stroke(p); }
    c.fillStyle = R.b; c.fill(p);
    c.save(); c.clip(p);
    if (R.s) {
      c.globalAlpha = R.sa == null ? 1 : R.sa; c.fillStyle = R.s; c.fill(p); c.globalAlpha = 1;
      const d = o.d == null ? m * 0.16 : o.d;
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
  function eye(c, x, y, r) {
    c.fillStyle = EYE[0]; c.beginPath(); c.ellipse(x, y, r * 0.9, r * 1.12, 0, 0, TAU); c.fill();
    c.fillStyle = SPK[1]; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.4, r * 0.38, 0, TAU); c.fill();
  }
  function line(c, pts, col, w) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.stroke(); }
  function quad(c, x0, y0, cx, cy, x1, y1, col, w) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); c.stroke(); }
  function blush(c, x, y, r) { c.fillStyle = rgba(TONG[2], 0.6); c.beginPath(); c.ellipse(x, y, r, r * 0.62, 0, 0, TAU); c.fill(); }
  function glint(c, x, y, rx, ry, a) { c.fillStyle = SPK[1]; c.beginPath(); c.ellipse(x, y, rx, ry, a || -0.6, 0, TAU); c.fill(); }
  function softDisc(c, x, y, rx, ry, col, a0, a1) {
    c.save(); c.translate(x, y); c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, rgba(col, a0)); g.addColorStop(1, rgba(col, a1 || 0));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill(); c.restore();
  }

  // ═══ 적 ═══════════════════════════════════════════════════
  // 칫솔: 청록 머리(얼굴) + 위로 뻗은 손잡이 + 아래 흰 솔이 발. 그림 9×15(충돌 r 3.5).
  function bBrush(c) {
    const hd = RR(-1.3, -14.0, 2.6, 6.8, 1.3);
    sticker(c, hd, [-1.3, -14, 2.6, 6.8], { o: BR[0], b: BR[1], s: BR[0], sa: 0.4, h: BR[2] }, { d: 0.5 });
    c.save(); c.clip(hd); line(c, [-1.6, -11.2, 1.6, -12.4], BR[2], 0.6); line(c, [-1.6, -9.8, 1.6, -11.0], BR[2], 0.6); c.restore();
    const br = new Path2D();
    for (let i = 0; i < 5; i++) rrect(br, -3.55 + i * 1.42 - 0.72, -4.1, 1.44, 3.9 + (i % 2) * 0.25, 0.72);
    sticker(c, br, [-3.6, -4.1, 7.2, 4.1], { o: BR[0], b: BRISTLE, s: BR[2], h: SPK[1] }, { lw: 0.6, d: 0.6 });
    const bd = RR(-3.4, -10.2, 6.8, 6.8, 2.9);
    sticker(c, bd, [-3.4, -10.2, 6.8, 6.8], { o: BR[0], b: BR[1], s: BR[0], sa: 0.42, h: BR[2] }, { d: 1.0 });
    eye(c, -1.3, -7.0, 0.82); eye(c, 1.4, -7.0, 0.82);
    line(c, [-2.4, -8.7, -0.6, -8.15], EYE[1], 0.55); line(c, [2.5, -8.7, 0.7, -8.15], EYE[1], 0.55);
    c.strokeStyle = EYE[1]; c.lineWidth = 0.45; c.beginPath(); c.arc(0.05, -4.55, 0.85, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke();
    blush(c, -2.45, -5.6, 0.7); blush(c, 2.55, -5.6, 0.7);
  }
  // 거품: 방울 뭉치(무지개 반사·반짝임), 큰 방울에 눈 둘.
  function bubble(c, x, y, r, lw) {
    const p = CI(x, y, r);
    c.lineWidth = (lw || 0.6) * 2; c.strokeStyle = SUD[0]; c.stroke(p);
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
    g.addColorStop(0, SUD[2]); g.addColorStop(0.68, SUD[1]); g.addColorStop(1, SUD[0]);
    c.fillStyle = g; c.fill(p);
    c.save(); c.clip(p);
    const lg = c.createLinearGradient(x + r, y - r * 0.3, x - r * 0.6, y + r);
    RAIN.forEach((col, i) => lg.addColorStop(i / 2, rgba(col, 0.9)));
    c.strokeStyle = lg; c.lineWidth = r * 0.24; c.beginPath(); c.arc(x, y, r * 0.8, -0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
    c.restore();
    glint(c, x - r * 0.42, y - r * 0.46, r * 0.27, r * 0.15, -0.7);
    c.fillStyle = SPK[1]; c.beginPath(); c.arc(x - r * 0.05, y - r * 0.66, r * 0.075, 0, TAU); c.fill();
  }
  function sudsFace(c, x, y, s) {
    eye(c, x - 1.75 * s, y - 0.3 * s, 0.86 * s); eye(c, x + 1.75 * s, y - 0.3 * s, 0.86 * s);
    c.fillStyle = EYE[1]; c.beginPath(); c.ellipse(x, y + 1.35 * s, 0.55 * s, 0.45 * s, 0, 0, TAU); c.fill();
    blush(c, x - 2.9 * s, y + 0.9 * s, 0.75 * s); blush(c, x + 2.9 * s, y + 0.9 * s, 0.75 * s);
  }
  function bSuds(c) {
    bubble(c, 2.9, -11.1, 1.8); bubble(c, 0, -6.2, 5.4);
    sudsFace(c, 0, -6.1, 1);
    bubble(c, -4.7, -2.7, 2.5); bubble(c, 4.6, -3.0, 2.9);
  }
  function bSudsS(c) { bubble(c, 2.5, -6.6, 1.0, 0.5); bubble(c, 0, -3.3, 3.2); sudsFace(c, 0, -3.25, 0.6); }
  // 초인종: 놋쇠 판 + 가운데 빨강 단추(코) + 짧은 다리.
  function bBell(c) {
    for (const s of [-1, 1]) {
      sticker(c, RR(s * 2.45 - 0.95, -3.6, 1.9, 3.1, 0.95), [s * 2.45 - 0.95, -3.6, 1.9, 3.1], { o: BRASS[0], b: BRASS[1], h: BRASS[2] }, { lw: 0.6 });
      sticker(c, EL(s * 2.75, -0.75, 1.65, 0.9), [s * 2.75 - 1.65, -1.65, 3.3, 1.8], { o: BRASS[0], b: BRASS[1], s: BRASS[0], sa: 0.5, h: BRASS[3] }, { lw: 0.6, d: 0.3 });
    }
    const back = RR(-5.4, -12.7, 10.8, 10.4, 3.3); c.lineWidth = LW * 2; c.strokeStyle = BRASS[0]; c.stroke(back); c.fillStyle = BRASS[0]; c.fill(back);
    sticker(c, RR(-5.7, -13.6, 11.4, 10.4, 3.5), [-5.7, -13.6, 11.4, 10.4], { o: BRASS[0], b: BRASS[2], s: BRASS[1], h: BRASS[3] }, { d: 1.1 });
    sticker(c, CI(0, -7.6, 2.95), [-2.95, -10.55, 5.9, 5.9], { o: BRASS[0], b: BRASS[1], h: BRASS[3] }, { lw: 0.5 });
    sticker(c, CI(0, -7.8, 2.15), [-2.15, -9.95, 4.3, 4.3], { o: BTN[0], b: BTN[1], s: BTN[0], sa: 0.55, h: TONG[2] }, { lw: 0.5, d: 0.6 });
    glint(c, -0.75, -8.8, 0.7, 0.4);
    eye(c, -2.35, -11.5, 0.78); eye(c, 2.35, -11.5, 0.78);
    blush(c, -4.0, -9.6, 0.65); blush(c, 4.0, -9.6, 0.65);
  }
  function bBellRing(c) { // 소리 고리(글자 없음): 양옆 호 두 겹
    for (const s of [-1, 1]) for (const r of [7.6, 10.0]) {
      const a0 = s < 0 ? Math.PI - 0.5 : -0.5, a1 = s < 0 ? Math.PI + 0.5 : 0.5;
      for (const [col, w] of [[BRASS[0], 1.8], [BRASS[3], 0.9]]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.arc(0, -8, r, a0, a1); c.stroke(); }
    }
  }
  // 청소기: 보라 통(얼굴) + 바퀴 + 위 손잡이 + 앞으로 휜 호스 + 흡입구. 오른쪽을 본다(dir 1).
  function bVacuum(c) {
    c.translate(-1.5, 0);
    const hx = [2.0, -8.6, 6.4, -14.6, 11.4, -10.6, 9.8, -3.6];
    const hose = new Path2D(); hose.moveTo(hx[0], hx[1]); hose.bezierCurveTo(hx[2], hx[3], hx[4], hx[5], hx[6], hx[7]);
    c.strokeStyle = VAC[0]; c.lineWidth = 2.8; c.stroke(hose); c.strokeStyle = VAC[1]; c.lineWidth = 1.3; c.stroke(hose);
    c.strokeStyle = rgba(VAC[3], 0.7); c.lineWidth = 0.35; c.save(); c.translate(-0.3, -0.3); c.stroke(hose); c.restore();
    for (let i = 1; i < 10; i++) { // 호스 마디
      const t = i / 10, u = 1 - t, bx = u * u * u * hx[0] + 3 * u * u * t * hx[2] + 3 * u * t * t * hx[4] + t * t * t * hx[6], by = u * u * u * hx[1] + 3 * u * u * t * hx[3] + 3 * u * t * t * hx[5] + t * t * t * hx[7];
      const dx = 3 * u * u * (hx[2] - hx[0]) + 6 * u * t * (hx[4] - hx[2]) + 3 * t * t * (hx[6] - hx[4]), dy = 3 * u * u * (hx[3] - hx[1]) + 6 * u * t * (hx[5] - hx[3]) + 3 * t * t * (hx[7] - hx[5]);
      const L = Math.hypot(dx, dy) || 1, nx = -dy / L * 0.65, ny = dx / L * 0.65;
      line(c, [bx - nx, by - ny, bx + nx, by + ny], VAC[0], 0.32);
    }
    sticker(c, RR(8.8, -4.6, 2.1, 2.4, 0.6), [8.8, -4.6, 2.1, 2.4], { o: VAC[0], b: VAC[2], h: VAC[3] }, { lw: 0.5 });
    sticker(c, RR(6.6, -2.7, 6.8, 2.7, 1.25), [6.6, -2.7, 6.8, 2.7], { o: RUB, b: VAC[1], s: VAC[0], sa: 0.7, h: VAC[3] }, { d: 0.5 });
    line(c, [7.6, -0.35, 12.4, -0.35], RUB, 0.5);
    quad(c, -6.6, -11.8, -3.6, -16.2, -0.6, -11.8, VAC[0], 2.2); quad(c, -6.6, -11.8, -3.6, -16.2, -0.6, -11.8, VAC[1], 0.9);
    const can = RR(-9.8, -12.4, 13, 10.8, 4.7);
    sticker(c, can, [-9.8, -12.4, 13, 10.8], { o: VAC[0], b: VAC[2], s: VAC[1], h: VAC[3] }, {
      d: 1.6, inner: (x) => { x.fillStyle = rgba(VAC[0], 0.35); x.fillRect(-10, -4.4, 14, 1.0); },
    });
    eye(c, -3.7, -8.2, 0.9); eye(c, -0.5, -8.2, 0.9);
    line(c, [-4.9, -9.75, -3.0, -9.35], VAC[0], 0.6); line(c, [0.7, -9.75, -1.2, -9.35], VAC[0], 0.6);
    c.strokeStyle = VAC[0]; c.lineWidth = 0.45; c.beginPath(); c.moveTo(-3.1, -6.1); c.quadraticCurveTo(-2.6, -6.6, -2.1, -6.1); c.quadraticCurveTo(-1.6, -5.6, -1.1, -6.1); c.stroke();
    sticker(c, CI(-6.3, -2.6, 2.75), [-9.05, -5.35, 5.5, 5.5], { o: RUB, b: RUB, h: VAC[1] }, { lw: 0.5 });
    sticker(c, CI(-6.3, -2.6, 1.1), [-7.4, -3.7, 2.2, 2.2], { o: VAC[0], b: VAC[3] }, { lw: 0.35 });
    sticker(c, CI(1.4, -1.35, 1.35), [0.05, -2.7, 2.7, 2.7], { o: RUB, b: RUB, h: VAC[1] }, { lw: 0.45 });
  }
  // 다른 강아지: 늘 정면, 회백색 짧은 털, 쫑긋 선 세모 귀, 말린 고리 꼬리, 빨강 목줄, 안쪽으로 처진 눈썹(뾰로통).
  function earPath(s, inner) {
    const p = new Path2D(), k = inner ? 0.58 : 1, ox = s * 4.0, oy = -13.2 - (inner ? 0.5 : 0);
    p.moveTo(ox - s * 2.6 * k, oy + 0.6 * k);
    p.quadraticCurveTo(ox - s * 1.2 * k, oy - 3.8 * k, ox + s * 0.9 * k, oy - 5.0 * k);
    p.quadraticCurveTo(ox + s * 2.0 * k, oy - 5.3 * k, ox + s * 2.1 * k, oy - 3.9 * k);
    p.quadraticCurveTo(ox + s * 2.4 * k, oy - 1.2 * k, ox + s * 1.8 * k, oy + 1.6 * k);
    p.closePath(); return p;
  }
  function bDog(c) {
    c.strokeStyle = DOG[0]; c.lineWidth = 2.6; c.beginPath(); c.arc(4.9, -6.9, 1.75, -0.4 * Math.PI, 1.35 * Math.PI); c.stroke();
    c.strokeStyle = DOG[2]; c.lineWidth = 1.05; c.stroke();
    for (const s of [-1, 1]) sticker(c, EL(s * 3.4, -0.85, 1.45, 0.85), [s * 3.4 - 1.45, -1.7, 2.9, 1.7], { o: DOG[0], b: DOG[1] }, { lw: 0.55 });
    sticker(c, EL(0, -3.9, 4.0, 3.7), [-4, -7.6, 8, 7.4], { o: DOG[0], b: DOG[2], s: DOG[1], h: DOG[3] }, { d: 0.9, inner: (x) => softDisc(x, 0, -3.4, 2.0, 2.5, DOG[3], 0.9) });
    for (const s of [-1, 1]) {
      sticker(c, RR(s * 1.55 - 1.0, -3.7, 2.0, 3.4, 1.0), [s * 1.55 - 1, -3.7, 2, 3.4], { o: DOG[0], b: DOG[2], s: DOG[1], sa: 0.8, h: DOG[3] }, { lw: 0.6, d: 0.35 });
      sticker(c, EL(s * 1.6, -0.62, 1.35, 0.8), [s * 1.6 - 1.35, -1.42, 2.7, 1.6], { o: DOG[0], b: DOG[3], s: DOG[2] }, { lw: 0.55, d: 0.25 });
    }
    for (const s of [-1, 1]) {
      sticker(c, earPath(s), [s * 4.0 - 2.6, -18.5, 5.0, 6.5], { o: DOG[0], b: DOG[2], s: DOG[1], h: DOG[3] }, { d: 0.6 });
      c.fillStyle = rgba(TONG[2], 0.9); c.fill(earPath(s, true));
    }
    const head = circles([[-3.6, -8.6, 2.5], [3.6, -8.6, 2.5]]); head.ellipse(0, -11.0, 5.4, 4.5, 0, 0, TAU);
    sticker(c, head, [-6.1, -15.5, 12.2, 9.4], { o: DOG[0], b: DOG[2], s: DOG[1], h: DOG[3] }, { d: 1.1, hx: 0.3, hy: 0.2 });
    sticker(c, circles([[-1.45, -7.9, 2.0], [1.45, -7.9, 2.0]]), [-3.45, -9.9, 6.9, 4], { o: DOG[1], b: DOG[3] }, { lw: 0.4 });
    c.fillStyle = EYE[0]; c.beginPath(); c.ellipse(0, -9.35, 1.35, 0.92, 0, 0, TAU); c.fill();
    glint(c, -0.45, -9.65, 0.42, 0.22, 0);
    c.strokeStyle = EYE[1]; c.lineWidth = 0.45; c.beginPath(); c.moveTo(0, -8.45); c.lineTo(0, -7.6); c.moveTo(-1.5, -6.85); c.quadraticCurveTo(0, -7.9, 1.5, -6.85); c.stroke();
    eye(c, -2.25, -11.6, 0.86); eye(c, 2.25, -11.6, 0.86);
    line(c, [-3.45, -13.55, -1.25, -12.9], EYE[1], 0.6); line(c, [3.45, -13.55, 1.25, -12.9], EYE[1], 0.6);
    blush(c, -4.1, -9.6, 0.75); blush(c, 4.1, -9.6, 0.75);
    quad(c, -3.1, -5.55, 0, -4.35, 3.1, -5.55, BTN[0], 1.9); quad(c, -3.1, -5.55, 0, -4.35, 3.1, -5.55, BTN[1], 0.95);
    sticker(c, CI(0, -4.2, 0.9), [-0.9, -5.3, 1.8, 1.8], { o: BRASS[0], b: BRASS[2], h: BRASS[3] }, { lw: 0.4 });
  }
  // 로봇 청소기 대왕: 납작한 원반(3/4 시점) + 크롬 센서 돔 + 화난 빨간 램프 눈 둘. 옆솔은 따로 구워 돌린다.
  function lampEye(c, ex, ey, s) { // s = -1 왼눈, 1 오른눈. 안쪽 위를 비스듬히 잘라 화난 눈
    const pts = [], rx = 3.0, ry = 1.9, xo = ex + s * rx, xi = ex - s * rx, yo = ey - ry, yi = ey - 0.2;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU, px = ex + Math.cos(a) * rx, py = ey + Math.sin(a) * ry;
      const cut = yo + ((px - xo) / (xi - xo)) * (yi - yo);
      pts.push(px, Math.max(py, cut));
    }
    const p = new Path2D(); p.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]); p.closePath();
    sticker(c, p, [ex - rx, ey - ry, rx * 2, ry * 2], { o: DISC[0], b: LAMP, s: BTN[0], sa: 0.8, h: GLOW[1] }, { lw: 0.6, d: 0.5 });
    glint(c, ex - s * 0.9, ey + 0.2, 0.55, 0.32, 0);
  }
  function bRobo(c) {
    const band = EL(0, 0, 23, 10);
    c.lineWidth = LW * 2; c.strokeStyle = DISC[0]; c.stroke(band); c.fillStyle = DISC[0]; c.fill(band);
    c.save(); c.clip(band); c.strokeStyle = CHR[0]; c.lineWidth = 1.0; c.beginPath(); c.ellipse(0, -1.4, 23, 10, 0, 0.05 * Math.PI, 0.95 * Math.PI); c.stroke(); c.restore();
    sticker(c, EL(0, -3.4, 23, 10), [-23, -13.4, 46, 20], { o: DISC[0], b: DISC[1], s: DISC[0], sa: 0.55, h: DISC[2] }, {
      d: 2.0, hr: 0.75, hx: 0.3, hy: 0.25,
      inner: (x) => { x.strokeStyle = rgba(DISC[0], 0.75); x.lineWidth = 0.55; x.beginPath(); x.ellipse(0, -4.3, 15.5, 6.4, 0, 0, TAU); x.stroke(); },
    });
    c.fillStyle = DISC[0]; c.beginPath(); c.ellipse(0, -6.1, 5.9, 3.1, 0, 0, TAU); c.fill();
    sticker(c, EL(0, -6.8, 5.2, 2.75), [-5.2, -9.55, 10.4, 5.5], { o: DISC[0], b: CHR[1], s: CHR[0], h: SPK[1] }, { lw: 0.5, d: 0.6 });
    glint(c, -2.0, -7.9, 1.3, 0.45, -0.15);
    lampEye(c, -6.6, 2.3, -1); lampEye(c, 6.6, 2.3, 1);
  }
  function bRoboBrush(c) {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU, ex = Math.cos(a) * 6.8, ey = Math.sin(a) * 6.8;
      line(c, [0, 0, ex, ey], CHR[0], 1.7); line(c, [0, 0, ex, ey], CHR[1], 0.75);
      for (const d of [-0.45, 0, 0.45]) { const b = a + d; line(c, [ex, ey, ex + Math.cos(b) * 1.6, ey + Math.sin(b) * 1.6], CHR[0], 0.45); }
    }
    sticker(c, CI(0, 0, 1.7), [-1.7, -1.7, 3.4, 3.4], { o: DISC[0], b: DISC[1], h: DISC[2] }, { lw: 0.5 });
  }
  // 목욕 시간: 다리 달린 욕조(얼굴) + 크롬 관과 샤워기 머리. 거품 왕관·고무 오리는 따로(출렁).
  function clawFoot(c, s, x, back) {
    c.save(); c.translate(x, -5.6); c.rotate(-s * 0.22);
    const R = back ? { o: BRASS[0], b: BRASS[1] } : { o: BRASS[0], b: FOOT, s: BRASS[0], sa: 0.5, h: BRASS[3] };
    sticker(c, RR(-1.45, -4.6, 2.9, 7.2, 1.45), [-1.45, -4.6, 2.9, 7.2], R, { lw: 0.6, d: 0.5 });
    c.restore();
    const ball = circles([[x + s * 0.9, -1.75, 2.15], [x + s * 0.9 - 1.5, -1.0, 1.0], [x + s * 0.9 + 1.5, -1.0, 1.0]]);
    sticker(c, ball, [x + s * 0.9 - 2.5, -3.9, 5, 3.9], R, { lw: 0.6, d: 0.5 });
  }
  function bBath(c) {
    clawFoot(c, -1, -10.6, true); clawFoot(c, 1, 10.6, true);
    const pipe = new Path2D(); pipe.moveTo(-20.5, -24); pipe.lineTo(-20.5, -42); pipe.quadraticCurveTo(-20.5, -48.6, -13.6, -48.2);
    c.strokeStyle = CHR[0]; c.lineWidth = 2.7; c.stroke(pipe); c.strokeStyle = CHR[1]; c.lineWidth = 1.25; c.stroke(pipe);
    c.strokeStyle = SPK[1]; c.lineWidth = 0.35; c.save(); c.translate(-0.35, 0); c.stroke(pipe); c.restore();
    sticker(c, EL(-9.6, -47.0, 4.7, 2.2, 0.38), [-14.3, -49.2, 9.4, 4.4], { o: CHR[0], b: CHR[1], s: CHR[0], sa: 0.6, h: SPK[1] }, { lw: 0.6, d: 0.6 });
    for (let i = 0; i < 4; i++) { c.fillStyle = CHR[0]; c.beginPath(); c.arc(-12.2 + i * 1.6, -45.9 + i * 0.62, 0.32, 0, TAU); c.fill(); }
    const tub = new Path2D();
    tub.moveTo(-25, -25.5); tub.bezierCurveTo(-25, -12.4, -19.4, -8.4, -12, -8.4); tub.lineTo(12, -8.4); tub.bezierCurveTo(19.4, -8.4, 25, -12.4, 25, -25.5); tub.closePath();
    sticker(c, tub, [-25, -25.5, 50, 17.1], { o: CHR[0], b: TUB[1], s: TUB[0], h: SPK[1] }, {
      d: 2.6, inner: (x) => { x.strokeStyle = rgba(FOOT, 0.85); x.lineWidth = 0.7; x.beginPath(); x.moveTo(-26, -22.4); x.lineTo(26, -22.4); x.stroke(); },
    });
    sticker(c, RR(-27, -28.2, 54, 3.5, 1.75), [-27, -28.2, 54, 3.5], { o: CHR[0], b: TUB[1], s: TUB[0], h: SPK[1] }, { d: 0.6 });
    clawFoot(c, -1, -16.0, false); clawFoot(c, 1, 16.0, false);
    eye(c, -6.4, -17.4, 1.55); eye(c, 6.4, -17.4, 1.55);
    line(c, [-9.0, -20.6, -4.6, -19.6], EYE[1], 0.8); line(c, [9.0, -20.6, 4.6, -19.6], EYE[1], 0.8);
    const m = new Path2D(); m.moveTo(-4.4, -13.9); m.quadraticCurveTo(0, -9.4, 4.4, -13.9); m.quadraticCurveTo(0, -12.9, -4.4, -13.9); m.closePath();
    c.lineWidth = 1.0; c.strokeStyle = EYE[0]; c.stroke(m); c.fillStyle = EYE[1]; c.fill(m);
    c.save(); c.clip(m); c.fillStyle = TONG[1]; c.beginPath(); c.ellipse(0.4, -10.9, 2.0, 1.25, 0, 0, TAU); c.fill(); c.restore();
    blush(c, -10.4, -14.6, 1.5); blush(c, 10.4, -14.6, 1.5);
  }
  const CROWN = [[-20.5, -29.2, 4.1], [-12.6, -30.6, 5.0], [-4.0, -31.4, 5.3], [5.0, -31.0, 5.2], [13.6, -30.2, 4.7], [21.0, -29.3, 3.9],
    [-13.6, -36.4, 3.5], [0.4, -38.6, 4.3], [13.2, -36.2, 3.4], [-13.9, -41.2, 1.6], [0.6, -44.4, 2.0], [12.8, -40.8, 1.5]];
  function bCrown(c) {
    for (let i = CROWN.length - 1; i >= 0; i--) { const [x, y, r] = CROWN[i]; bubble(c, x, y, r, 0.6); }
    const D = { o: BRASS[0], b: BRASS[2], s: BRASS[1], h: BRASS[3] };
    sticker(c, EL(20.0, -35.4, 3.4, 2.3), [16.6, -37.7, 6.8, 4.6], D, { lw: 0.6, d: 0.6 });
    sticker(c, CI(21.4, -38.6, 1.95), [19.45, -40.55, 3.9, 3.9], D, { lw: 0.6, d: 0.4 });
    sticker(c, EL(23.6, -38.3, 1.15, 0.6), [22.45, -38.9, 2.3, 1.2], { o: BRASS[0], b: FOOT }, { lw: 0.45 });
    c.fillStyle = EYE[0]; c.beginPath(); c.arc(21.8, -39.1, 0.4, 0, TAU); c.fill();
  }
  function bDrop(c) {
    const p = new Path2D(); p.moveTo(0, -2.6); p.quadraticCurveTo(1.35, -0.6, 1.05, 0.3); p.quadraticCurveTo(0, 1.4, -1.05, 0.3); p.quadraticCurveTo(-1.35, -0.6, 0, -2.6); p.closePath();
    sticker(c, p, [-1.2, -2.6, 2.4, 3.9], { o: SUD[0], b: WATER, h: WIND }, { lw: 0.45 });
  }
  function glowImg(r, col, a) { return bake(r * 2, r * 2, r, r, (c) => softDisc(c, 0, 0, r, r, col, a)); }

  function gait(t, f) { const ph = t * f * TAU; return { b: Math.abs(Math.sin(ph)), s: Math.sin(ph) }; }
  function enemySet() {
    const E = {};
    const mkE = (w, h, ax, ay, fn) => { const body = bake(w, h, ax, ay, fn); return { body, flash: flashOf(body) }; };
    E.brush = mkE(9.6, 16, 4.8, 15.2, bBrush);
    E.suds = mkE(16.4, 15.4, 8.0, 14.4, bSuds);
    E.suds_s = mkE(9.2, 9.0, 4.4, 8.4, bSudsS);
    E.bell = mkE(14.4, 15.6, 7.2, 15.0, bBell);
    E.bell.ring = bake(24, 22, 12, 19.4, bBellRing);
    E.vacuum = mkE(25.6, 18.2, 12.8, 17.4, bVacuum);
    E.dog = mkE(15.2, 20.2, 7.4, 19.6, bDog);
    E.boss_vacuum = mkE(50, 23, 25, 11.8, bRobo);
    E.boss_vacuum.brush = bake(19, 19, 9.5, 9.5, bRoboBrush);
    E.boss_vacuum.glow = glowImg(6, LAMP, 0.6);
    E.boss_bath = mkE(58, 52.4, 29, 51.6, bBath);
    const crown = bake(58, 28, 29, 48, bCrown);
    E.boss_bath.crown = crown; E.boss_bath.crownF = flashOf(crown);
    E.boss_bath.drop = bake(3.4, 5, 1.7, 3.3, bDrop);
    return E;
  }
  // 몸 한 장 + 변형. sy 0.92–1.06 걸음 찌그러짐, 맞으면 0.85.
  function bodyDraw(ctx, im, x, y, sy, rot, dir, hit, lift) {
    sy *= 1 - 0.15 * hit; const sx = (1 + (1 - sy) * 0.6) * dir;
    putT(ctx, im, x, y - (lift || 0), sx, sy, rot);
  }
  const DRAW = {
    brush(ctx, E, x, y, t, fl, hit, dir, ring, red) {
      const g = red ? { b: 1, s: 0 } : gait(t, 2.3);
      bodyDraw(ctx, fl ? E.flash : E.body, x, y, red ? 1 : 0.92 + 0.14 * g.b, red ? 0 : g.s * 0.12, dir, hit, red ? 0 : g.b * 1.3);
    },
    suds(ctx, E, x, y, t, fl, hit, dir, ring, red) {
      const s = red ? 0 : Math.sin(t * 2.6 * TAU);
      bodyDraw(ctx, fl ? E.flash : E.body, x, y, 1 + 0.06 * s, 0, 1, hit, 0);
    },
    bell(ctx, E, x, y, t, fl, hit, dir, ring, red) {
      if (ring) {
        const rot = red ? 0 : Math.sin(t * 13 * TAU) * 0.2;
        bodyDraw(ctx, fl ? E.flash : E.body, x, y, 1, rot, 1, hit, 0);
        for (let i = 0; i < 2; i++) {
          const p = ((t * 2.4 + i * 0.5) % 1 + 1) % 1, s = 0.8 + 0.55 * p;
          ctx.globalAlpha = 1 - p; putT(ctx, E.ring, x, y - 8 * (1 - s), s, s, 0); ctx.globalAlpha = 1;
        }
        return;
      }
      const g = red ? { b: 1, s: 0 } : gait(t, 1.8);
      bodyDraw(ctx, fl ? E.flash : E.body, x, y, red ? 1 : 0.93 + 0.12 * g.b, red ? 0 : g.s * 0.1, 1, hit, red ? 0 : g.b * 0.5);
    },
    vacuum(ctx, E, x, y, t, fl, hit, dir, ring, red) {
      const g = red ? { b: 1, s: 0 } : gait(t, 1.5);
      bodyDraw(ctx, fl ? E.flash : E.body, x, y, red ? 1 : 0.95 + 0.08 * g.b, red ? 0 : g.s * 0.035, dir, hit, 0);
    },
    dog(ctx, E, x, y, t, fl, hit, dir, ring, red) {
      const g = red ? { b: 1, s: 0 } : gait(t, 3.2);
      bodyDraw(ctx, fl ? E.flash : E.body, x, y, red ? 1 : 0.93 + 0.12 * g.b, red ? 0 : g.s * 0.08, 1, hit, red ? 0 : g.b * 0.9);
    },
    boss_vacuum(ctx, E, x, y, t, fl, hit, dir, ring, red) {
      const a = red ? 0 : t * 11, br = E.brush;
      for (const s of [-1, 1]) { ctx.save(); ctx.translate(x + s * 19.4, y + 6.0); ctx.scale(1, 0.46); ctx.rotate(a * s); ctx.drawImage(br.c, -br.ax, -br.ay, br.w, br.h); ctx.restore(); }
      const sy = (red ? 1 : 0.98 + 0.035 * Math.abs(Math.sin(t * 1.4 * TAU))) * (1 - 0.15 * hit), sx = 1 + (1 - sy) * 0.6;
      const jit = red ? 0 : Math.sin(t * 37) * 0.18;
      ctx.save(); ctx.translate(x + jit, y); ctx.scale(sx, sy);
      const im = fl ? E.flash : E.body; ctx.drawImage(im.c, -im.ax, -im.ay, im.w, im.h);
      const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = red ? 0.6 : 0.45 + 0.3 * Math.sin(t * 5.5 * TAU) ** 2;
      put(ctx, E.glow, -6.6, 2.4); put(ctx, E.glow, 6.6, 2.4);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = op; ctx.restore();
    },
    boss_bath(ctx, E, x, y, t, fl, hit, dir, ring, red) {
      const g = red ? { b: 1, s: 0 } : gait(t, 1.1);
      const sy = (red ? 1 : 0.97 + 0.05 * g.b) * (1 - 0.15 * hit), sx = (1 + (1 - sy) * 0.6) * dir, rot = red ? 0 : g.s * 0.035;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, sy);
      const im = fl ? E.flash : E.body; ctx.drawImage(im.c, -im.ax, -im.ay, im.w, im.h);
      const w = red ? 0 : Math.sin(t * 2.2 * TAU), cr = fl ? E.crownF : E.crown;
      ctx.translate(0, -27); ctx.scale(1 - 0.05 * w, 1 + 0.07 * w); ctx.drawImage(cr.c, -cr.ax, -cr.ay + 27, cr.w, cr.h); ctx.scale(1 / (1 - 0.05 * w), 1 / (1 + 0.07 * w)); ctx.translate(0, 27);
      if (!red) for (let i = 0; i < 3; i++) {
        const p = ((t * 1.3 + i / 3) % 1 + 1) % 1;
        ctx.globalAlpha = Math.min(1, (1 - p) * 2.5); put(ctx, E.drop, -8.6 + i * 1.7, -44.2 + p * 8.5);
      }
      ctx.globalAlpha = 1; ctx.restore();
    },
  };
  DRAW.suds_s = DRAW.suds;

  // ═══ 줍는 것 ═══════════════════════════════════════════════
  function pickupSet() {
    const P = {};
    P.kibble = bake(6.4, 6.4, 3.2, 3.2, (c) => {
      sticker(c, EL(0, 0, 2.35, 2.05), [-2.35, -2.05, 4.7, 4.1], { o: WOOD[0], b: WOOD[1], s: WOOD[0], sa: 0.55, h: DIRT[2] }, { lw: 0.55, d: 0.55 });
      c.fillStyle = rgba(WOOD[0], 0.7); c.beginPath(); c.ellipse(0.25, 0.15, 0.7, 0.55, 0, 0, TAU); c.fill();
      glint(c, -0.95, -0.95, 0.6, 0.32);
    });
    P.treat = bake(11.6, 7.4, 5.8, 3.7, (c) => {
      const p = circles([[-3.3, -1.15, 1.6], [-3.3, 1.15, 1.6], [3.3, -1.15, 1.6], [3.3, 1.15, 1.6]]); rrect(p, -3.4, -1.15, 6.8, 2.3, 1.1);
      sticker(c, p, [-4.9, -2.75, 9.8, 5.5], { o: CREAM[0], b: CREAM[2], s: CREAM[1], h: CREAM[3] }, { lw: 0.6, d: 0.6 });
    });
    const chew = (c) => {
      c.rotate(-0.55);
      const p = circles([[-3.5, -0.75, 1.25], [-3.5, 0.75, 1.25], [3.5, -0.75, 1.25], [3.5, 0.75, 1.25]]); rrect(p, -3.6, -1.15, 7.2, 2.3, 1.1);
      sticker(c, p, [-4.75, -2, 9.5, 4], { o: DIRT[0], b: DIRT[2], s: DIRT[1], h: DIRT[3] }, {
        lw: 0.6, d: 0.55, inner: (x) => { for (let i = -3; i <= 3; i++) line(x, [i * 1.25 - 0.7, 1.4, i * 1.25 + 0.7, -1.4], rgba(DIRT[0], 0.55), 0.45); },
      });
    };
    P.chew = bake(10, 10, 5, 5, chew);
    P.meat = bake(12, 10, 6, 5, (c) => {
      const bone = circles([[3.9, -2.9, 1.05], [4.7, -1.9, 1.05]]); rrect(bone, 1.2, -2.6, 3.2, 1.6, 0.8);
      sticker(c, bone, [1.2, -3.95, 4.55, 3.1], { o: CREAM[0], b: CREAM[3], s: CREAM[1] }, { lw: 0.55, d: 0.3 });
      sticker(c, EL(-1.0, 0.4, 3.6, 2.9, -0.45), [-4.6, -2.5, 7.2, 5.8], { o: TONG[0], b: TONG[1], s: TONG[0], sa: 0.7, h: TONG[2] }, { lw: 0.65, d: 0.8 });
      quad(c, -3.0, -0.6, -1.6, -2.1, 0.4, -1.8, rgba(TONG[2], 0.9), 0.55);
    });
    P.lettuce = bake(10, 10, 5, 5.4, (c) => {
      for (const a of [-0.75, 0.75, 0]) {
        c.save(); c.translate(0, 2.2); c.rotate(a);
        const p = new Path2D();
        for (let i = 0; i <= 48; i++) { const a = (i / 48) * TAU, r = 1 + 0.09 * Math.sin(a * 9); const px = Math.sin(a) * 2.25 * r, py = -2.7 + Math.cos(a) * 2.9 * r; if (i) p.lineTo(px, py); else p.moveTo(px, py); }
        p.closePath();
        sticker(c, p, [-2.4, -5.6, 4.8, 6], { o: GRASS[0], b: GRASS[3], s: GRASS[2], h: GRASS[4] }, { lw: 0.55, d: 0.5 });
        line(c, [0, 0, 0, -4.6], rgba(GRASS[4], 0.95), 0.4);
        c.restore();
      }
    });
    P.fruit = bake(9.6, 10, 4.8, 5.2, (c) => {
      quad(c, 0, -1.9, 0.1, -3.0, 0.6, -3.6, WOOD[0], 0.7);
      const p = circles([[-1.15, 0.5, 2.65], [1.15, 0.5, 2.65]]);
      sticker(c, p, [-3.8, -2.15, 7.6, 5.3], { o: BTN[0], b: BTN[1], s: TONG[0], h: TONG[2] }, { lw: 0.6, d: 0.7 });
      sticker(c, EL(1.7, -3.0, 1.45, 0.7, -0.5), [0.25, -3.7, 2.9, 1.4], { o: GRASS[0], b: GRASS[2], h: GRASS[3] }, { lw: 0.45 });
      glint(c, -1.6, -0.8, 0.7, 0.42);
    });
    P._glow = glowImg(7, GLOW[0], 0.42);
    P._shadow = bake(7, 3, 3.5, 1.5, (c) => softDisc(c, 0, 0, 3.4, 1.35, EYE[0], 0.3));
    return P;
  }
  const PU_LIFT = { kibble: 2.6, treat: 3.4, chew: 3.6, meat: 4.0, lettuce: 3.8, fruit: 3.8 };
  const PU_GLOW = { treat: 1, meat: 1, fruit: 1 };

  // ═══ 탄 ═══════════════════════════════════════════════════
  function projSet() {
    const P = {};
    P.ball = bake(8.4, 8.4, 4.2, 4.2, (c) => {
      sticker(c, CI(0, 0, 3.05), [-3.05, -3.05, 6.1, 6.1], { o: TONG[0], b: FLW[0], s: TONG[1], h: TONG[2] }, {
        lw: 0.6, d: 0.7, inner: (x) => { x.strokeStyle = FLW[1]; x.lineWidth = 1.1; x.beginPath(); x.ellipse(0, 0.2, 3.4, 1.1, 0.45, 0, TAU); x.stroke(); },
      });
      glint(c, -1.1, -1.25, 0.85, 0.5);
    });
    P.toy = bake(10, 12.6, 5, 6.6, (c) => {
      const R = { o: VIO[0], b: VIO[2], s: VIO[1], h: SPK[1] };
      for (const s of [-1, 1]) {
        c.save(); c.translate(s * 1.25, -2.6); c.rotate(s * 0.28);
        sticker(c, RR(-0.85, -3.6, 1.7, 3.8, 0.85), [-0.85, -3.6, 1.7, 3.8], R, { lw: 0.55, d: 0.35, ha: 0.6 });
        c.fillStyle = rgba(TONG[2], 0.95); c.fill(RR(-0.35, -2.9, 0.7, 2.6, 0.35));
        c.restore();
      }
      sticker(c, EL(0, 3.1, 2.25, 1.95), [-2.25, 1.15, 4.5, 3.9], R, { lw: 0.55, d: 0.45, ha: 0.6 });
      sticker(c, CI(0, -0.4, 2.65), [-2.65, -3.05, 5.3, 5.3], R, { lw: 0.6, d: 0.55, ha: 0.7 });
      c.fillStyle = EYE[0]; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 0.95, -0.7, 0.36, 0, TAU); c.fill(); }
      c.fillStyle = TONG[1]; c.beginPath(); c.ellipse(0, 0.25, 0.42, 0.3, 0, 0, TAU); c.fill();
      blush(c, -1.75, 0.3, 0.5); blush(c, 1.75, 0.3, 0.5);
    });
    P.bark = bake(11, 18, 1.4, 9, (c) => {
      for (const [r, s] of [[3.0, 0.75], [5.3, 0.82], [7.6, 0.88]]) {
        for (const [col, w, a] of [[GLOW[0], 1.6, 0.85], [GLOW[1], 0.7, 1]]) { c.strokeStyle = rgba(col, a); c.lineWidth = w; c.beginPath(); c.arc(0, 0, r, -s, s); c.stroke(); }
      }
    });
    return P;
  }

  // ═══ 웅덩이·흡입 ════════════════════════════════════════════
  const ZR = 30;
  function puddlePath(r, k) {
    const p = new Path2D();
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * TAU, q = r * (1 + 0.055 * Math.sin(3 * a + 1.3) + 0.035 * Math.sin(5 * a + 0.4)) * k;
      const x = Math.cos(a) * q, y = Math.sin(a) * q;
      if (i) p.lineTo(x, y); else p.moveTo(x, y);
    }
    p.closePath(); return p;
  }
  function zoneSet() {
    const Z = {};
    Z.puddle = bake(70, 70, 35, 35, (c) => {
      const p = puddlePath(ZR, 1);
      c.lineWidth = 2.4; c.strokeStyle = rgba(WATER, 0.95); c.stroke(p);
      c.fillStyle = rgba(WATER, 0.52); c.fill(p);
      c.save(); c.clip(p);
      c.save(); c.translate(-6, -7); c.fillStyle = rgba(WIND, 0.2); c.fill(puddlePath(ZR, 0.7)); c.restore();
      c.strokeStyle = rgba(WIND, 0.75); c.lineWidth = 0.7; c.save(); c.translate(0.6, 0.8); c.stroke(puddlePath(ZR, 0.95)); c.restore();
      c.restore();
      glint(c, -13, -14, 4.2, 1.3, -0.6); glint(c, -6.5, -19.5, 1.6, 0.6, -0.4);
    });
    Z.ripple = bake(24, 24, 12, 12, (c) => { c.strokeStyle = rgba(WIND, 0.9); c.lineWidth = 0.7; c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.stroke(); });
    Z.warnRing = bake(66, 66, 33, 33, (c) => { c.setLineDash([4.2, 3.0]); c.strokeStyle = rgba(WATER, 0.95); c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, ZR, 0, TAU); c.stroke(); });
    Z.warnDisc = bake(64, 64, 32, 32, (c) => softDisc(c, 0, 0, ZR, ZR, WATER, 0.06, 0.26));
    Z.streak = bake(12.4, 2.6, 6.2, 1.3, (c) => {
      const g = c.createLinearGradient(-5.8, 0, 5.8, 0); g.addColorStop(0, rgba(WIND, 0)); g.addColorStop(0.35, rgba(WIND, 0.95)); g.addColorStop(1, rgba(WIND, 0));
      c.fillStyle = g; c.fill(RR(-5.8, -0.62, 11.6, 1.24, 0.62));
    });
    return Z;
  }

  // ═══ 바닥(공원) ═══════════════════════════════════════════
  // 월드 0..540 = 135 단위 조각 4×4. 조각 종류: 잔디 3 · 굽은 길 모서리 · 길 곧은 조각 · 바깥(생울타리 너머).
  // 길은 한 바퀴 고리: 모서리 조각은 오른쪽·아래 가운데를 1/4 원으로 잇고, 곧은 조각은 끝 기울기가 0 인 혹 하나. 뒤집기·90° 회전으로 맞춘다.
  // 조각은 가장자리 1 단위를 더 구워 겹쳐 찍는다(이음매 없음). 시간대 5단계(0 · .25 · .5 · .75 · 1)를 따로 굽는다.
  const S = 135, PW = 16, PA = 12, BLEED = 1, WORLD = 540;
  const GRADE = [
    [[SKY_AM, 0.16], [DIRT[3], 0.11]],
    [[SKY_NOON, 0.07], [DIRT[3], 0.13]],
    [[DIRT[3], 0.15]],
    [[DUSK[0], 0.17], [DUSK[1], 0.06], [DIRT[3], 0.06]],
    [[EVE[1], 0.56], [EVE[0], 0.14]],
  ];
  function straightPts() { const a = []; for (let x = -6; x <= S + 6; x += 1.5) a.push([x, S / 2 + (PA * (1 - Math.cos((TAU * Math.max(0, Math.min(S, x))) / S))) / 2]); return a; }
  function cornerPts() { const a = [[S / 2, S + 6]]; for (let i = 0; i <= 40; i++) { const t = Math.PI + (i / 40) * (Math.PI / 2); a.push([S + Math.cos(t) * S / 2, S + Math.sin(t) * S / 2]); } a.push([S + 6, S / 2]); return a; }
  function distTo(pts, x, y) { let m = 1e9; for (const [px, py] of pts) m = Math.min(m, (px - x) ** 2 + (py - y) ** 2); return Math.sqrt(m); }
  function tuft(c, x, y, s, col) { c.strokeStyle = col; c.lineWidth = 0.55; c.beginPath(); c.moveTo(x - 1.1 * s, y - 1.5 * s); c.lineTo(x, y); c.lineTo(x + 0.1 * s, y - 2.0 * s); c.moveTo(x, y); c.lineTo(x + 1.2 * s, y - 1.4 * s); c.stroke(); }
  function flower(c, x, y, col, r) {
    c.fillStyle = col; for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU - 0.3; c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.85, r * 0.78, 0, TAU); c.fill(); }
    c.fillStyle = col === FLW[1] ? DIRT[3] : FLW[1]; c.beginPath(); c.arc(x, y, r * 0.55, 0, TAU); c.fill();
  }
  function flowerBed(c, x, y, R) {
    c.fillStyle = rgba(GRASS[0], 0.32); c.beginPath(); c.ellipse(x, y + 1, 8.5, 5.2, 0, 0, TAU); c.fill();
    const cols = [FLW[0], FLW[1], FLW[2], FLW[3]], main = cols[(R() * 4) | 0];
    for (let i = 0; i < 4; i++) { c.fillStyle = rgba(GRASS[2], 0.8); c.beginPath(); c.ellipse(x - 5 + R() * 10, y - 2 + R() * 5, 1.6, 0.8, R() * 3, 0, TAU); c.fill(); }
    for (let i = 0; i < 7; i++) flower(c, x - 6 + R() * 12, y - 3 + R() * 6, R() < 0.7 ? main : cols[(R() * 4) | 0], 0.85 + R() * 0.3);
  }
  function bush(c, x, y, r, R) {
    softDisc(c, x + r * 0.15, y + r * 0.35, r * 1.15, r * 0.5, EYE[0], 0.22);
    const l = []; const n = 5 + ((R() * 2) | 0);
    for (let i = 0; i < n; i++) { const a = Math.PI + (i / (n - 1)) * Math.PI; l.push([x + Math.cos(a) * r * 0.62, y - r * 0.35 + Math.sin(a) * r * 0.5, r * (0.42 + R() * 0.1)]); }
    l.push([x, y - r * 0.2, r * 0.62]);
    sticker(c, circles(l), [x - r, y - r * 1.2, r * 2, r * 1.4], { o: GRASS[0], b: GRASS[2], s: GRASS[1], h: GRASS[3] }, { lw: 0.6, d: r * 0.18, ha: 0.7 });
    for (let i = 0; i < 3; i++) quad(c, x - r * 0.5 + i * r * 0.4, y - r * 0.55, x - r * 0.4 + i * r * 0.4, y - r * 0.8, x - r * 0.2 + i * r * 0.4, y - r * 0.6, rgba(GRASS[3], 0.85), 0.45);
  }
  function grassField(c, R, avoid, dark) {
    c.fillStyle = dark ? GRASS[0] : GRASS[1]; c.fillRect(-BLEED - 1, -BLEED - 1, S + 2 * BLEED + 2, S + 2 * BLEED + 2);
    for (let i = 0; i < 9; i++) { // 큰 덩어리(가장자리 안쪽에만 → 이음매 없음)
      const r = 16 + R() * 26, x = r + R() * (S - 2 * r), y = r + R() * (S - 2 * r), lite = R() < 0.6;
      softDisc(c, x, y, r, r * (0.7 + R() * 0.3), lite ? (dark ? GRASS[1] : GRASS[2]) : GRASS[0], lite ? 0.3 : 0.22);
    }
    for (let i = 0; i < 46; i++) {
      const x = 4 + R() * (S - 8), y = 4 + R() * (S - 8);
      if (avoid && avoid(x, y) < PW / 2 + 1.5) continue;
      tuft(c, x, y, 0.8 + R() * 0.5, rgba(R() < 0.5 ? GRASS[2] : GRASS[3], dark ? 0.35 : 0.55));
    }
  }
  function decorate(c, R, avoid, nBed, nBush) {
    const ok = (x, y, m) => !avoid || avoid(x, y) > PW / 2 + m;
    for (let k = 0, n = 0; k < 40 && n < nBush; k++) { const r = 6 + R() * 3.5, x = 14 + R() * (S - 28), y = 16 + R() * (S - 28); if (ok(x, y, r + 3)) { bush(c, x, y, r, R); n++; } }
    for (let k = 0, n = 0; k < 40 && n < nBed; k++) { const x = 14 + R() * (S - 28), y = 14 + R() * (S - 28); if (ok(x, y, 11)) { flowerBed(c, x, y, R); n++; } }
  }
  function walkway(c, pts, R) {
    const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
    c.lineCap = "butt";
    for (const [col, w, a] of [[GRASS[0], PW + 3.2, 0.3], [DIRT[0], PW + 0.8, 0.8], [DIRT[1], PW - 0.8, 1], [GRASS[2], PW - 0.8, 0.22], [DIRT[2], PW - 6.5, 0.25]]) { c.strokeStyle = rgba(col, a); c.lineWidth = w; c.stroke(p); }
    c.lineCap = "round";
    for (let i = 2; i < pts.length - 2; i++) { // 자갈 점
      const [x, y] = pts[i]; if (x < 4 || y < 4 || x > S - 4 || y > S - 4) continue;
      for (let j = 0; j < 2; j++) { const ox = (R() - 0.5) * (PW - 5), oy = (R() - 0.5) * (PW - 5); c.fillStyle = rgba(R() < 0.5 ? DIRT[0] : DIRT[3], 0.55); c.beginPath(); c.ellipse(x + ox, y + oy, 0.55 + R() * 0.45, 0.4 + R() * 0.25, R() * 3, 0, TAU); c.fill(); }
    }
    for (let i = 1; i < pts.length - 1; i += 2) { // 길가 풀
      const [x, y] = pts[i], [x2, y2] = pts[i + 1], L = Math.hypot(x2 - x, y2 - y) || 1, nx = -(y2 - y) / L, ny = (x2 - x) / L;
      for (const s of [-1, 1]) { const tx = x + nx * s * (PW / 2 + 0.2), ty = y + ny * s * (PW / 2 + 0.2); if (tx < 3 || ty < 3 || tx > S - 3 || ty > S - 3 || R() < 0.45) continue; tuft(c, tx, ty + 1, 0.8, rgba(GRASS[2], 0.75)); }
    }
  }
  function chunkKind(kind) {
    const R = rng(9100 + kind * 131);
    return (c) => {
      if (kind <= 2) { grassField(c, R, null, false); decorate(c, R, null, kind === 1 ? 1 : 2, kind === 2 ? 1 : 2); }
      else if (kind === 3) { const pts = cornerPts(); grassField(c, R, (x, y) => distTo(pts, x, y), false); walkway(c, pts, R); decorate(c, R, (x, y) => distTo(pts, x, y), 1, 1); }
      else if (kind === 4) { const pts = straightPts(); grassField(c, R, (x, y) => distTo(pts, x, y), false); walkway(c, pts, R); decorate(c, R, (x, y) => distTo(pts, x, y), 1, 1); }
      else { grassField(c, R, null, true); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const r = 9 + R() * 3.5; bush(c, 17 + i * 33.7 + (R() - 0.5) * 4, 22 + j * 33.7 + (R() - 0.5) * 4, r, R); } }
    };
  }
  // 생울타리 띠(가로/세로 따로 구워 빛 방향을 지킨다): 길이 S, 두께 26, 둥근 잎 덩이가 주기 15 로 이어진다.
  function hedgeStrip(c, vert) {
    const P = (u, v) => (vert ? [v, u] : [u, v]);
    const back = [], front = [];
    for (let i = -1; i <= 10; i++) { const [x, y] = P(i * 15, -3.5); back.push([x, y, 8.2]); }
    for (let i = -1; i <= 9; i++) { const [x, y] = P(7.5 + i * 15, 1.2); front.push([x, y, 9.6]); }
    const bb = vert ? [-13, 0, 26, S] : [0, -13, S, 26];
    sticker(c, circles(back), bb, { o: GRASS[0], b: GRASS[1], s: GRASS[0], sa: 0.6 }, { lw: 0.6, d: 1.4 });
    sticker(c, circles(front), bb, { o: GRASS[0], b: GRASS[2], s: GRASS[1], h: GRASS[3] }, { lw: 0.7, d: 1.8, hx: 0.5, hy: 0.1, hr: 0.6, ha: 0.55 });
    for (const [x, y, r] of front) {
      const [ox, oy] = vert ? [-r * 0.35, -r * 0.3] : [-r * 0.3, -r * 0.4];
      quad(c, x + ox - 1.6, y + oy, x + ox, y + oy - 1.6, x + ox + 1.6, y + oy, rgba(GRASS[3], 0.9), 0.5);
    }
    const R = rng(vert ? 77 : 55);
    for (let i = 0; i < 9; i++) { const [x, y] = P(7.5 + i * 15 + (R() - 0.5) * 6, -2 + R() * 5); if (R() < 0.5) flower(c, x, y, i % 3 ? FLW[0] : FLW[1], 0.7); }
  }
  function hedgeCorner(c) {
    const R = rng(31); bush(c, 0, 8, 15, R);
  }
  // 소품(월드 위치 고정, k 배로 따로): 벤치 · 가로등 · 그루터기
  function bBench(c) {
    softDisc(c, 0, 0, 10, 2.4, EYE[0], 0.26);
    const W = { o: WOOD[0], b: WOOD[1], h: DIRT[2] }, I = { o: EYE[0], b: EYE[1], h: EYE[2] };
    for (const s of [-1, 1]) sticker(c, RR(s * 6.6 - 0.6, -10.5, 1.2, 10.4, 0.6), [s * 6.6 - 0.6, -10.5, 1.2, 10.4], I, { lw: 0.5 });
    sticker(c, RR(-8.4, -11.6, 16.8, 2.0, 1.0), [-8.4, -11.6, 16.8, 2], W, { lw: 0.6, ha: 0.6 });
    sticker(c, RR(-8.4, -8.9, 16.8, 1.8, 0.9), [-8.4, -8.9, 16.8, 1.8], W, { lw: 0.6, ha: 0.6 });
    sticker(c, RR(-9.0, -5.8, 18, 2.4, 1.2), [-9, -5.8, 18, 2.4], { o: WOOD[0], b: WOOD[1], s: WOOD[0], sa: 0.6, h: DIRT[2] }, { lw: 0.6, d: 0.5, ha: 0.7 });
  }
  function bLamp(lit) {
    return (c) => {
      softDisc(c, 0, 0, 4, 1.5, EYE[0], 0.28);
      const I = { o: EYE[0], b: EYE[1], h: EYE[2] };
      sticker(c, EL(0, -0.8, 2.5, 1.2), [-2.5, -2, 5, 2.4], I, { lw: 0.5 });
      sticker(c, RR(-0.7, -25, 1.4, 24.4, 0.7), [-0.7, -25, 1.4, 24.4], I, { lw: 0.5, hx: 0.2, hy: 0.4 });
      sticker(c, RR(-2.9, -25.2, 5.8, 1.1, 0.55), [-2.9, -25.2, 5.8, 1.1], I, { lw: 0.5 });
      sticker(c, RR(-2.4, -29.6, 4.8, 4.5, 1.3), [-2.4, -29.6, 4.8, 4.5], lit ? { o: EYE[1], b: STREET, h: GLOW[1] } : { o: EYE[1], b: SPK[0], s: CREAM[2], h: SPK[1] }, { lw: 0.5, d: 0.6 });
      const cap = new Path2D(); cap.moveTo(-3.3, -29.3); cap.lineTo(3.3, -29.3); cap.lineTo(1.4, -32.0); cap.lineTo(-1.4, -32.0); cap.closePath();
      sticker(c, cap, [-3.3, -32, 6.6, 2.7], I, { lw: 0.5 });
    };
  }
  function bStump(c) {
    softDisc(c, 0.6, 0, 7.4, 2.4, EYE[0], 0.26);
    const tr = new Path2D(); tr.moveTo(-4.9, -5.2); tr.lineTo(-5.4, -1.4); tr.quadraticCurveTo(-7.4, -0.2, -6.0, 0.3); tr.quadraticCurveTo(0, 1.4, 6.0, 0.3); tr.quadraticCurveTo(7.4, -0.2, 5.4, -1.4); tr.lineTo(4.9, -5.2); tr.closePath();
    sticker(c, tr, [-6.6, -5.2, 13.2, 5.9], { o: WOOD[0], b: WOOD[1], s: WOOD[0], sa: 0.6, h: DIRT[1] }, { lw: 0.6, d: 0.9, ha: 0.5,
      inner: (x) => { for (const u of [-2.6, 0.4, 3.0]) line(x, [u, -4.2, u + 0.3, -0.6], rgba(WOOD[0], 0.55), 0.4); } });
    sticker(c, EL(0, -5.2, 4.9, 1.9), [-4.9, -7.1, 9.8, 3.8], { o: WOOD[0], b: DIRT[2], h: DIRT[3] }, { lw: 0.55 });
    c.strokeStyle = rgba(DIRT[0], 0.8); c.lineWidth = 0.4; for (const r of [1.2, 2.4, 3.5]) { c.beginPath(); c.ellipse(0.2, -5.15, r, r * 0.38, 0, 0, TAU); c.stroke(); }
    softDisc(c, -4.2, -2.0, 1.6, 1.0, GRASS[2], 0.8);
  }
  const PROPS = [
    ["lamp", 110, 110], ["lamp", 430, 110], ["lamp", 110, 430], ["lamp", 430, 430], ["lamp", 270, 46], ["lamp", 270, 500], ["lamp", 40, 270], ["lamp", 500, 270],
    ["bench", 202, 58], ["bench", 338, 86], ["bench", 202, 448], ["bench", 338, 512],
    ["stump", 205, 215], ["stump", 352, 340], ["stump", 178, 392],
  ];
  // [종류, 변형 비트(1 좌우·2 상하·4 90°회전)], 줄 j = 0..3
  const LAYOUT = [
    [[3, 0], [4, 0], [4, 2], [3, 1]],
    [[4, 4], [0, 0], [1, 1], [4, 6]],
    [[4, 6], [2, 2], [0, 3], [4, 4]],
    [[3, 2], [4, 2], [4, 0], [3, 3]],
  ];
  function groundSet() {
    const G = { chunk: [], hedgeH: [], hedgeV: [], corner: [], props: [], sky: [] };
    const kinds = [];
    for (let k = 0; k < 6; k++) kinds.push(bake(S + 2 * BLEED, S + 2 * BLEED, BLEED, BLEED, chunkKind(k), KG));
    const hH = bake(S, 26, 0, 13, (c) => hedgeStrip(c, false), KG), hV = bake(26, S, 13, 0, (c) => hedgeStrip(c, true), KG), hc = bake(34, 30, 17, 17, hedgeCorner, KG);
    const pr = { bench: bake(20, 15, 10, 13, bBench), lamp: bake(9, 34, 4.5, 33, bLamp(false)), stump: bake(16, 10, 8, 8.2, bStump) };
    const lampLit = bake(9, 34, 4.5, 33, bLamp(true));
    for (let st = 0; st < 5; st++) {
      const gr = GRADE[st];
      G.chunk.push(kinds.map((im) => tintOf(im, gr)));
      G.hedgeH.push(tintOf(hH, gr)); G.hedgeV.push(tintOf(hV, gr)); G.corner.push(tintOf(hc, gr));
      const lit = st >= 3, lg = st === 4 ? [[EVE[1], 0.22]] : [[DUSK[0], 0.1]];
      G.props.push({ bench: tintOf(pr.bench, gr), stump: tintOf(pr.stump, gr), lamp: lit ? tintOf(lampLit, lg) : tintOf(pr.lamp, gr) });
    }
    // 하늘빛 덮개(화면 위쪽만): 작은 세로 그라데이션 판을 늘려 찍는다
    const SKY = [[[SKY_AM, 0.42], [SKY_AM, 0]], [[SKY_NOON, 0.3], [SKY_NOON, 0]], [[SKY_NOON, 0.22], [SKY_NOON, 0]], [[DUSK[0], 0.5], [DUSK[1], 0.22], [DUSK[1], 0]], [[EVE[1], 0.62], [EVE[0], 0.3], [EVE[0], 0]]];
    for (const stops of SKY) {
      const c = mk(4, 96), x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 96);
      stops.forEach(([col, a], i) => g.addColorStop(i / (stops.length - 1), rgba(col, a)));
      x.fillStyle = g; x.fillRect(0, 0, 4, 96); NIMG++; MEM += 4 * 96 * 4; G.sky.push(c);
    }
    G.lampGlow = glowImg(13, STREET, 0.55);
    G.lampPool = bake(56, 28, 28, 14, (c) => softDisc(c, 0, 0, 27, 12, STREET, 0.32));
    G.fly = bake(6, 6, 3, 3, (c) => { softDisc(c, 0, 0, 2.9, 2.9, GLOW[0], 0.7); c.fillStyle = GLOW[1]; c.beginPath(); c.arc(0, 0, 0.45, 0, TAU); c.fill(); });
    return G;
  }
  function chunkAt(i, j) {
    if (i >= 0 && j >= 0 && i < 4 && j < 4) return LAYOUT[j][i];
    return [5, hash(i + 50, j + 50) & 3];
  }
  function drawChunk(ctx, im, X, Y, mode) {
    const s = S + 2 * BLEED;
    if (!mode) { ctx.drawImage(im.c, X - BLEED, Y - BLEED, s, s); return; }
    ctx.save(); ctx.translate(X + S / 2, Y + S / 2); if (mode & 4) ctx.rotate(Math.PI / 2); ctx.scale(mode & 1 ? -1 : 1, mode & 2 ? -1 : 1);
    ctx.drawImage(im.c, -s / 2, -s / 2, s, s); ctx.restore();
  }
  function groundLayer(ctx, st, camX, camY, w, h, t) {
    const G = B.gnd, CH = G.chunk[st];
    const i0 = Math.floor(camX / S), i1 = Math.floor((camX + w) / S), j0 = Math.floor(camY / S), j1 = Math.floor((camY + h) / S);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const [k, m] = chunkAt(i, j); drawChunk(ctx, CH[k], i * S, j * S, m); }
    // 생울타리: 경계 바로 바깥
    const HO = 8, hh = G.hedgeH[st], hv = G.hedgeV[st];
    for (let i = Math.max(0, i0); i <= Math.min(3, i1); i++) {
      if (camY < HO + 14) put(ctx, hh, i * S, -HO);
      if (camY + h > WORLD + HO - 14) put(ctx, hh, i * S, WORLD + HO);
    }
    for (let j = Math.max(0, j0); j <= Math.min(3, j1); j++) {
      if (camX < HO + 14) put(ctx, hv, -HO, j * S);
      if (camX + w > WORLD + HO - 14) put(ctx, hv, WORLD + HO, j * S);
    }
    for (const [cx, cy] of [[-HO, -HO], [WORLD + HO, -HO], [-HO, WORLD + HO], [WORLD + HO, WORLD + HO]]) if (cx > camX - 20 && cx < camX + w + 20 && cy > camY - 20 && cy < camY + h + 20) put(ctx, G.corner[st], cx, cy);
    const PR = G.props[st];
    for (const [k, x, y] of PROPS) if (x > camX - 12 && x < camX + w + 12 && y > camY - 4 && y < camY + h + 36) put(ctx, PR[k], x, y);
  }
  const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  function drawGround(ctx, camX, camY, w, h, tod, t) {
    if (!ready()) return;
    tod = Math.max(0, Math.min(1, +tod || 0)); t = t || 0;
    const s = tod * 4, i0 = Math.min(3, Math.floor(s)), f = s - i0, mix = smooth((f - 0.35) / 0.3);
    const ga = ctx.globalAlpha;
    groundLayer(ctx, mix >= 0.995 ? i0 + 1 : i0, camX, camY, w, h, t);
    if (mix > 0.005 && mix < 0.995) { ctx.globalAlpha = mix; groundLayer(ctx, i0 + 1, camX, camY, w, h, t); ctx.globalAlpha = ga; }
    const G = B.gnd, lampA = tod <= 0.6 ? 0 : Math.min(1, (tod - 0.6) / 0.35);
    const op = ctx.globalCompositeOperation;
    if (lampA > 0) {
      ctx.globalCompositeOperation = "lighter";
      for (const [k, x, y] of PROPS) {
        if (k !== "lamp" || x < camX - 30 || x > camX + w + 30 || y < camY - 10 || y > camY + h + 40) continue;
        const fl = 0.9 + 0.1 * Math.sin(t * 7 + x);
        ctx.globalAlpha = lampA * 0.8 * fl; put(ctx, G.lampPool, x, y + 2);
        ctx.globalAlpha = lampA * fl; put(ctx, G.lampGlow, x, y - 27.4);
      }
      if (tod > 0.85) { // 반딧불: 60 단위 칸마다 하나
        const fa = (tod - 0.85) / 0.15;
        for (let gy = Math.floor(camY / 60); gy <= Math.floor((camY + h) / 60); gy++) for (let gx = Math.floor(camX / 60); gx <= Math.floor((camX + w) / 60); gx++) {
          const hh = hash(gx + 9, gy + 9), ph = (hh & 255) / 40;
          const fx = gx * 60 + ((hh >>> 8) & 63) * 0.9 + Math.sin(t * 0.7 + ph) * 6, fy = gy * 60 + ((hh >>> 14) & 63) * 0.9 + Math.cos(t * 0.55 + ph) * 5;
          ctx.globalAlpha = fa * (0.35 + 0.65 * Math.max(0, Math.sin(t * 2.2 + ph * 3))); put(ctx, G.fly, fx, fy);
        }
      }
      ctx.globalAlpha = ga; ctx.globalCompositeOperation = op;
    }
    // 하늘빛 덮개: 위쪽 45 % 만, 이웃 단계 사이를 tod 로 섞는다
    const sa = G.sky[i0], sb = G.sky[i0 + 1];
    ctx.globalAlpha = ga * (1 - f); ctx.drawImage(sa, camX, camY, w, h * 0.45);
    if (f > 0.001) { ctx.globalAlpha = ga * f; ctx.drawImage(sb, camX, camY, w, h * 0.45); }
    ctx.globalAlpha = ga;
  }

  // ── 굽기·공개 함수 ─────────────────────────────────────────
  function ready() { if (!B && canMake()) bakeWorld(K || 6); return !!B; }
  function bakeWorld(k) {
    if (!canMake()) return null;
    k = Math.max(1, +k || 6);
    if (B && k === K) return B;
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    K = k; KG = Math.max(1, Math.min(3, k / 2)); NIMG = 0; MEM = 0;
    B = { en: enemySet(), pu: pickupSet(), pj: projSet(), zn: zoneSet(), gnd: groundSet() };
    BAKE_MS = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
    return B;
  }
  function drawEnemy(ctx, kind, x, y, t, o) {
    if (!ready()) return;
    const E = B.en[kind], D = DRAW[kind]; if (!E || !D) return;
    o = o || {};
    D(ctx, E, x, y, t || 0, !!o.flash, Math.max(0, Math.min(1, o.hit || 0)), o.dir < 0 ? -1 : 1, !!o.ringing, !!o.reduce);
  }
  function drawPickup(ctx, kind, x, y, t) {
    if (!ready()) return;
    const P = B.pu, im = P[kind]; if (!im) return;
    const ph = (x * 0.137 + y * 0.071) % TAU, b = Math.sin((t || 0) * 3.2 + ph), lift = PU_LIFT[kind] + b * 0.8, sh = 1 - b * 0.12;
    putT(ctx, P._shadow, x, y, sh * (im.w / 8), sh, 0);
    if (PU_GLOW[kind]) {
      const op = ctx.globalCompositeOperation, ga = ctx.globalAlpha; ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = ga * (0.55 + 0.25 * Math.sin((t || 0) * 4 + ph));
      put(ctx, P._glow, x, y - lift); ctx.globalAlpha = ga; ctx.globalCompositeOperation = op;
    }
    put(ctx, im, x, y - lift);
  }
  function drawProj(ctx, kind, x, y, t, ang) {
    if (!ready()) return;
    t = t || 0; ang = ang || 0;
    const P = B.pj;
    if (kind === "ball") putT(ctx, P.ball, x, y, 1, 1, t * 13);
    else if (kind === "toy") putT(ctx, P.toy, x, y, 1, 1, Math.sin(t * 6 + ang) * 0.4);
    else if (kind === "chew") putT(ctx, B.pu.chew, x, y, 0.85, 0.85, t * 15);
    else if (kind === "bark") {
      const op = ctx.globalCompositeOperation; ctx.globalCompositeOperation = "lighter";
      const s = 1 + 0.07 * Math.sin(t * 22); putT(ctx, P.bark, x, y, s, s, ang); ctx.globalCompositeOperation = op;
    }
  }
  function drawZone(ctx, x, y, r, t, warn) {
    if (!ready()) return;
    const Z = B.zn, s = (r || ZR) / ZR; t = t || 0;
    const ga = ctx.globalAlpha;
    if (warn) {
      ctx.globalAlpha = ga * (0.6 + 0.4 * Math.sin(t * 9) ** 2); putT(ctx, Z.warnDisc, x, y, s, s, 0);
      ctx.globalAlpha = ga; putT(ctx, Z.warnRing, x, y, s, s, t * 0.8);
      return;
    }
    putT(ctx, Z.puddle, x, y, s, s, 0);
    for (let i = 0; i < 2; i++) {
      const p = ((t * 0.55 + i * 0.5) % 1 + 1) % 1, q = s * (0.6 + 1.8 * p);
      ctx.globalAlpha = ga * (1 - p) * 0.8; putT(ctx, Z.ripple, x + (i ? 7 : -6) * s, y + (i ? -4 : 6) * s, q, q, 0);
    }
    ctx.globalAlpha = ga;
  }
  function drawSuction(ctx, x0, y0, x1, y1, t) {
    if (!ready()) return;
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy); if (L < 3) return;
    const Z = B.zn, n = Math.min(12, 5 + Math.round(L / 12)), ga = ctx.globalAlpha; t = t || 0;
    ctx.save(); ctx.translate(x0, y0); ctx.rotate(Math.atan2(dy, dx));
    for (let i = 0; i < n; i++) {
      const p = ((t * 1.7 + i / n) % 1 + 1) % 1, d = (1 - p) * L, lane = ((i * 7) % 5) / 2 - 1;
      ctx.globalAlpha = ga * Math.sin(p * Math.PI) * 0.85;
      const len = 0.7 + 0.5 * (d / L);
      ctx.drawImage(Z.streak.c, d - 6.2 * len, lane * (1.2 + (d / L) * 7) - 1.3, 12.4 * len, 2.6);
    }
    ctx.restore(); ctx.globalAlpha = ga;
  }

  const api = {
    bakeWorld, drawGround, drawEnemy, drawPickup, drawProj, drawZone, drawSuction,
    worldSizes: { brush: [9, 15], suds: [16, 14], suds_s: [8, 8], bell: [13, 15], vacuum: [24, 17], dog: [14, 19], boss_vacuum: [48, 21], boss_bath: [56, 52], chunk: S, world: WORLD },
    worldStats: () => ({ k: K, kGround: KG, images: NIMG, bytes: MEM, bakeMs: Math.round(BAKE_MS) }),
  };
  root.SurvArt = root.SurvArt || {};
  root.SurvArt.cocoHD = Object.assign(root.SurvArt.cocoHD || {}, api);
  if (typeof module === "object" && module.exports) module.exports = root.SurvArt.cocoHD;
})(typeof window !== "undefined" ? window : globalThis);
