// @ts-nocheck — 디자인 세션 그림 정본 docs/lab-defense-art-towers.js 를 그대로 옮긴 것. 그림을 고치면 docs 판을 고치고 다시 복사한다(tmp/lab-defense/sync-src.sh).
window.TDArt = window.TDArt || {};
/* 릴리스 디펜스 — 검사(타워)·아이템·탄·숫자 도트 (artdir 2판)
 * 그림은 전부 코드: 지역 좌표의 도형(사각·타원·다각형·톱니)을 픽셀 중심으로 표본 → 도형마다
 * 색 외곽선(위·왼쪽은 한 단 밝게) + 색조 이동 램프 명암(구·원기둥·상자) + 림 라이트를 자동으로 입힌다.
 * 결과는 프레임마다 한 번만 굽고(가로 줄 묶음), 그릴 때는 정수 fillRect 만 쓴다. */
(function (TD) {
  "use strict";

  // ---------- 팔레트 (artdir 3절만) ----------
  var INK = ["#07060f", "#0e0c1c", "#17142b", "#231e3d", "#322b52", "#463d6b", "#5f5687"];
  var SL = ["#3a3f5c", "#545b7a", "#7880a0", "#a3abc4", "#cdd3e3", "#eef1f8"];
  var OR = ["#3b1d14", "#6e2f1c", "#a8492a", "#e0743a", "#f6a94a", "#ffd86b", "#fff2b8"];
  var RD = ["#2e0a1f", "#5c1230", "#9a1d3c", "#d8324a", "#ff5e5b", "#ff9a86"];
  var PK = ["#3d1145", "#6e1f6e", "#a8329a", "#e050c0", "#ff8be0"];
  var GR = ["#0b2422", "#124638", "#1c7a50", "#36b866", "#7ee87e", "#d4ffb0"];
  var CY = ["#0b1d3a", "#123a66", "#1a68a0", "#2aa6d6", "#6ee6ff", "#c8fbff"];
  var PU = ["#1e0f3d", "#3a1a6b", "#6232b0", "#9a64f0", "#c9a4ff"];

  // 램프: [외곽선, 밝은 외곽선/가장 어두운 면, ... 가장 밝음] — 어두운 쪽은 보라·남색, 밝은 쪽은 노랑·청록으로 돈다
  var STONE = [INK[1], INK[3], INK[4], INK[5], INK[6], SL[1], SL[2]];
  var METAL = [INK[2], SL[0], SL[1], SL[2], SL[3], SL[4]];
  var DARKM = [INK[1], INK[3], INK[4], SL[0], SL[1], SL[2]];
  var CYR = [CY[0], CY[1], CY[2], CY[3], CY[4], CY[5]];
  var GOLD = [OR[0], OR[1], OR[2], OR[3], OR[4], OR[5], OR[6]];
  var ORNG = [OR[0], OR[1], OR[2], OR[3], OR[4], OR[5]];
  var PINK = [PU[0], PK[0], PK[1], PK[2], PK[3], PK[4], RD[5]];
  var GRN = [GR[0], GR[1], GR[2], GR[3], GR[4], GR[5]];
  var PURP = [INK[1], PU[0], PU[1], PU[2], PU[3], PU[4]];
  var RED = [RD[0], RD[1], RD[2], RD[3], RD[4], RD[5], OR[6]];
  var SKIN = [OR[1], OR[2], OR[3], OR[4], OR[5], OR[6]];
  var PAPER = [INK[3], SL[1], SL[2], SL[3], SL[4], SL[5]];
  var YEL = [OR[1], OR[3], OR[4], OR[5], OR[6]];
  var SCR = [INK[1], INK[2], CY[0], CY[1], CY[2]];
  var SCRG = [INK[1], INK[2], GR[0], GR[1], GR[2]];
  var SCRR = [INK[1], INK[2], RD[0], RD[1], RD[2]];

  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
  function clamp(v) { return v < 0 ? 0 : v > 0.999 ? 0.999 : v; }

  // ---------- 도형 (지역 좌표, 연속값) ----------
  function R(x, y, w, h) { return { lb: [x, y, x + w, y + h], f: function (a, b) { return a >= x && a < x + w && b >= y && b < y + h; } }; }
  function E(cx, cy, rx, ry) { return { lb: [cx - rx, cy - ry, cx + rx, cy + ry], f: function (a, b) { var u = (a - cx) / rx, v = (b - cy) / ry; return u * u + v * v <= 1; } }; }
  function P(pts) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
    return { lb: [x0, y0, x1, y1], f: function (a, b) {
      var c = false;
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
        if ((yi > b) !== (yj > b) && a < (xj - xi) * (b - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    } };
  }
  function U() {
    var s = [].slice.call(arguments), lb = [1e9, 1e9, -1e9, -1e9];
    s.forEach(function (q) { lb = [Math.min(lb[0], q.lb[0]), Math.min(lb[1], q.lb[1]), Math.max(lb[2], q.lb[2]), Math.max(lb[3], q.lb[3])]; });
    return { lb: lb, f: function (a, b) { for (var i = 0; i < s.length; i++) if (s[i].f(a, b)) return true; return false; } };
  }
  function I(p, q) { return { lb: p.lb, f: function (a, b) { return p.f(a, b) && q.f(a, b); } }; }
  function S(p, q) { return { lb: p.lb, f: function (a, b) { return p.f(a, b) && !q.f(a, b); } }; }
  // 톱니바퀴: 바깥 반지름 ro, 안 반지름 ri, 이 n개, 위상 ph, 가운데 구멍 h
  function G(cx, cy, ro, ri, n, ph, h) {
    return { lb: [cx - ro, cy - ro, cx + ro, cy + ro], f: function (a, b) {
      var dx = a - cx, dy = b - cy, d = Math.sqrt(dx * dx + dy * dy);
      if (h && d < h) return false;
      if (d <= ri) return true;
      return d <= ro && Math.cos(n * (Math.atan2(dy, dx) - ph)) > 0.15;
    } };
  }
  function star(cx, cy, ro, ri, n, rot) {
    var pts = [];
    for (var i = 0; i < n * 2; i++) {
      var r = i % 2 ? ri : ro, a = rot + i * Math.PI / n - Math.PI / 2;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return P(pts);
  }
  // 굵은 선분(캡슐)
  function C(x0, y0, x1, y1, r) {
    return { lb: [Math.min(x0, x1) - r, Math.min(y0, y1) - r, Math.max(x0, x1) + r, Math.max(y0, y1) + r], f: function (a, b) {
      var vx = x1 - x0, vy = y1 - y0, l = vx * vx + vy * vy, t = l ? ((a - x0) * vx + (b - y0) * vy) / l : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      var dx = a - (x0 + vx * t), dy = b - (y0 + vy * t);
      return dx * dx + dy * dy <= r * r;
    } };
  }

  // ---------- 변환 (지역 → 화면) ----------
  function TT(o) {
    o = o || {};
    var t = { ox: o.ox || 0, oy: o.oy || 0, px: o.px || 0, py: o.py || 0, sx: o.sx == null ? 1 : o.sx, sy: o.sy == null ? 1 : o.sy, r: o.r || 0 };
    t.c = Math.cos(t.r); t.s = Math.sin(t.r);
    return t;
  }
  function toS(t, x, y) { var dx = (x - t.px) * t.sx, dy = (y - t.py) * t.sy; return [t.ox + dx * t.c - dy * t.s, t.oy + dx * t.s + dy * t.c]; }
  function toL(t, X, Y) { var dx = X - t.ox, dy = Y - t.oy; var rx = dx * t.c + dy * t.s, ry = -dx * t.s + dy * t.c; return [rx / t.sx + t.px, ry / t.sy + t.py]; }
  var ID = TT();
  // 아이템: 16 단위 지역 상자를 (ox, oy) 에 가운데 맞춰 s 배, r 라디안 돌림
  function IT(ox, oy, s, r, sx, sy) { return TT({ ox: ox, oy: oy, px: 8, py: 8, sx: s * (sx || 1), sy: s * (sy || 1), r: r || 0 }); }

  // ---------- 버퍼 ----------
  function Buf(w, h) { this.w = w; this.h = h; this.c = new Array(w * h); for (var i = 0; i < w * h; i++) this.c[i] = null; }
  Buf.prototype.set = function (X, Y, col) { if (X < 0 || Y < 0 || X >= this.w || Y >= this.h || !col) return; this.c[Y * this.w + X] = col; };

  function light(lt, u, w, X, Y, o) {
    var nx, ny, z;
    if (typeof lt === "function") return lt(u, w, X, Y);
    switch (lt) {
      case "sph": nx = 2 * u - 1; ny = 2 * w - 1; z = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        return 0.06 + 0.94 * clamp(-0.45 * nx - 0.55 * ny + 0.7 * z);
      case "cyl": nx = 2 * u - 1; z = Math.sqrt(Math.max(0, 1 - nx * nx));
        return 0.04 + 0.92 * clamp(-0.5 * nx + 0.72 * z) + (0.5 - w) * 0.12;
      case "cylh": ny = 2 * w - 1; z = Math.sqrt(Math.max(0, 1 - ny * ny));
        return 0.04 + 0.92 * clamp(-0.55 * ny + 0.72 * z) + (0.5 - u) * 0.1;
      case "vg": return o.a + (o.b - o.a) * w;
      case "flat": return o.f == null ? 0.5 : o.f;
      default: return 0.5 + (o.g == null ? 0.25 : o.g) * (0.5 - w);
    }
  }

  // 도형 하나 칠하기: 색 외곽선 + 명암 + (선택) 림 라이트·반사점
  function draw(b, t, sh, ramp, o) {
    o = o || {};
    var cs = [toS(t, sh.lb[0], sh.lb[1]), toS(t, sh.lb[2], sh.lb[1]), toS(t, sh.lb[0], sh.lb[3]), toS(t, sh.lb[2], sh.lb[3])];
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    cs.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
    x0 = Math.max(0, Math.floor(x0) - 1); y0 = Math.max(0, Math.floor(y0) - 1);
    x1 = Math.min(b.w - 1, Math.ceil(x1) + 1); y1 = Math.min(b.h - 1, Math.ceil(y1) + 1);
    var W = x1 - x0 + 1, H = y1 - y0 + 1;
    if (W <= 0 || H <= 0) return;
    var m = new Uint8Array(W * H), mx0 = 1e9, my0 = 1e9, mx1 = -1, my1 = -1, X, Y;
    for (Y = y0; Y <= y1; Y++) for (X = x0; X <= x1; X++) {
      var l = toL(t, X + 0.5, Y + 0.5);
      if (sh.f(l[0], l[1])) { m[(Y - y0) * W + X - x0] = 1; if (X < mx0) mx0 = X; if (X > mx1) mx1 = X; if (Y < my0) my0 = Y; if (Y > my1) my1 = Y; }
    }
    if (mx1 < 0) return;
    function M(X, Y) { X -= x0; Y -= y0; return X >= 0 && Y >= 0 && X < W && Y < H && m[Y * W + X] === 1; }
    var bw = mx1 - mx0 + 1, bh = my1 - my0 + 1, n = ramp.length, ol = o.ol !== false, lt = o.l || "box";
    var k = ol ? 2 : 1, lo = o.lo || 1, hi = o.hi || n - 1;
    for (Y = my0; Y <= my1; Y++) for (X = mx0; X <= mx1; X++) {
      if (!M(X, Y)) continue;
      var up = M(X, Y - 1), dn = M(X, Y + 1), lf = M(X - 1, Y), rt = M(X + 1, Y), col;
      if (ol && !(up && dn && lf && rt)) {
        col = o.oc || ((o.lit !== false && (!up || !lf) && dn && rt) ? ramp[1] : ramp[0]);
      } else {
        var u = (X + 0.5 - mx0) / bw, w = (Y + 0.5 - my0) / bh;
        var v = light(lt, u, w, X, Y, o);
        if (o.bev !== false && lt !== "sph" && lt !== "flat") {
          if (!M(X, Y - k)) v += 0.2; if (!M(X - k, Y)) v += 0.1; if (!M(X, Y + k)) v -= 0.15; if (!M(X + k, Y)) v -= 0.12;
        }
        v += o.v || 0;
        var idx = lo + Math.floor(clamp(v) * (hi - lo + 1));
        col = ramp[Math.min(hi, idx)];
        if (o.rim && ((!M(X + k, Y) && w > 0.4) || (!M(X, Y + k) && u > 0.55))) col = o.rim;
      }
      b.set(X, Y, col);
    }
  }
  function fill(b, t, sh, col) { draw(b, t, sh, [col, col], { ol: false, l: "flat" }); }
  function px(b, t, x, y, col) { var s = toS(t, x + 0.5, y + 0.5); b.set(Math.floor(s[0]), Math.floor(s[1]), col); }
  function pxs(b, t, list, col) { for (var i = 0; i < list.length; i++) px(b, t, list[i][0], list[i][1], col); }
  function line(b, t, x0, y0, x1, y1, col) {
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (;;) { px(b, t, x0, y0, col); if (x0 === x1 && y0 === y1) break; var e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }

  // 버퍼 → 정수 fillRect 줄 묶음
  function runs(b) {
    var out = [];
    for (var y = 0; y < b.h; y++) {
      var x = 0;
      while (x < b.w) {
        var c = b.c[y * b.w + x];
        if (!c) { x++; continue; }
        var s = x; while (x < b.w && b.c[y * b.w + x] === c) x++;
        out.push([c, s, y, x - s]);
      }
    }
    out.sort(function (a, c) { return a[0] < c[0] ? -1 : a[0] > c[0] ? 1 : 0; });
    return out;
  }
  function paint(rs) {
    return function (ctx) {
      var last = null;
      for (var i = 0; i < rs.length; i++) { var r = rs[i]; if (r[0] !== last) { ctx.fillStyle = r[0]; last = r[0]; } ctx.fillRect(r[1], r[2], r[3], 1); }
    };
  }
  function bake(w, h, fn) { var b = new Buf(w, h); fn(b); return paint(runs(b)); }
  // 발광: [cx, cy, r, hex, alpha] 원 여러 겹(계단 원). 통합 쪽이 "lighter" 로 겹친다.
  function glow(list) {
    var rs = [];
    (list || []).forEach(function (d) {
      var cx = d[0], cy = d[1], r = d[2], col = rgba(d[3], d[4]);
      for (var y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
        var dy = y + 0.5 - cy; if (Math.abs(dy) > r) continue;
        var hw = Math.sqrt(r * r - dy * dy), xa = Math.round(cx - hw), xb = Math.round(cx + hw);
        if (xb > xa) rs.push([col, xa, y, xb - xa]);
      }
    });
    return function (ctx) { for (var i = 0; i < rs.length; i++) { ctx.fillStyle = rs[i][0]; ctx.fillRect(rs[i][1], rs[i][2], rs[i][3], 1); } };
  }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function sprite(w, h, ax, ay, fps, fns, glows) {
    var s = { w: w, h: h, ax: ax, ay: ay, fps: fps, frames: fns.map(function (fn) { return bake(w, h, fn); }) };
    if (glows) s.glow = glows.map(glow);
    return s;
  }

  // ======================================================================
  // 검사(타워) — 캔버스 22×30, 기준점 (11, 28) = 받침 아래 가운데
  // ======================================================================
  var TW = 22, TH = 30, TAX = 11, TAY = 28;

  // 공통 받침: 1단계 14폭 → 2단계 16폭+모서리 쇠 → 3단계 18폭+받침단(금 테) → 갈래는 받침단 테가 갈래 색
  function pedestal(b, t, L, acc) {
    var lv = L >= 2 ? 3 : L + 1, br = L >= 3, pw = lv === 1 ? 14 : lv === 2 ? 16 : 18, x0 = 11 - pw / 2;
    fill(b, t, E(11, 27.6, pw / 2 + 2, 2.1), rgba(INK[0], 0.6));
    if (lv === 3) {
      draw(b, t, R(x0 - 2, 23, pw + 4, 5), DARKM, { l: "vg", a: 0.75, b: 0.2 });
      for (var x = x0 - 1; x < x0 + pw + 1; x++) px(b, t, x, 24, br ? acc[3] : OR[3]);
      px(b, t, x0 - 1, 24, br ? acc[4] : OR[4]); px(b, t, x0 + pw, 24, br ? acc[4] : OR[4]);
    }
    var bh = lv === 3 ? 6 : 8;
    draw(b, t, R(x0, 20, pw, bh), STONE, { bev: false, l: function (u, w, X, Y) {
      if (Y <= 22) return Y === 21 ? 0.9 : 0.78;
      if (Y === 23) return 0.2;
      return 0.55 - (Y - 24) * 0.12 + (u < 0.15 ? 0.12 : u > 0.85 ? -0.12 : 0);
    } });
    // 윗면 소켓(몸이 꽂히는 자리)
    fill(b, t, E(11, 21.5, pw / 2 - 3, 1.2), INK[4]);
    if (lv >= 2) {
      var ch = lv === 3 ? 5 : 7;
      draw(b, t, R(x0 - 1, 20, 3, ch), DARKM, { l: "cyl", v: 0.1 });
      draw(b, t, R(x0 + pw - 2, 20, 3, ch), DARKM, { l: "cyl", v: 0.1 });
      px(b, t, x0, 21, SL[3]); px(b, t, x0 + pw - 1, 21, SL[2]);
    }
    // 단계 홈: 불 들어온 칸 수 = 단계(갈래 3)
    var cnt = lv, py = lv === 3 ? 24 : 25, sx = 11 - (cnt * 4 - 2) / 2;
    for (var i = 0; i < cnt; i++) {
      px(b, t, sx + i * 4, py, acc[4]); px(b, t, sx + i * 4 + 1, py, acc[br ? 5 : 3] || acc[4]);
      if (lv < 3) { px(b, t, sx + i * 4, py + 1, acc[1]); px(b, t, sx + i * 4 + 1, py + 1, acc[1]); }
    }
  }
  function pipGlow(L, acc, gx) {
    var lv = L >= 2 ? 3 : L + 1, py = lv === 3 ? 24.5 : 25.5, sx = 11 - (lv * 4 - 2) / 2, out = [];
    for (var i = 0; i < lv; i++) out.push([gx(sx + i * 4 + 1), py, 1.6, acc[3], 0.25]);
    return out;
  }

  // ---- 단위 테스트: 체크 화면 + 돔 포탑 + 짧은 총열 (대칭, 위로 쏨)
  function unitBody(b, t, L, f, fk) {
    var A = L === 3, B = L === 4, acc = A ? GRN : B ? ORNG : CYR, rc = fk === 0 ? 1 : 0;
    if (L >= 1) {
      draw(b, t, R(2, 15, 5, 6), DARKM, { l: "cyl" }); draw(b, t, R(15, 15, 5, 6), DARKM, { l: "cyl" });
      px(b, t, 4, 17, f % 2 ? acc[3] : acc[5]); px(b, t, 17, 17, f % 2 ? acc[5] : acc[3]);
      px(b, t, 4, 19, acc[2]); px(b, t, 17, 19, acc[2]);
    }
    var hw = L >= 2 ? 6 : 5;
    draw(b, t, P([[11 - hw - 1, 23], [11 + hw + 1, 23], [11 + hw, 12], [11 - hw, 12]]), METAL, { l: "cyl", rim: CY[3] });
    if (L >= 2) { pxs(b, t, [[11 - hw, 21], [11 + hw - 1, 21]], SL[4]); }
    // 화면
    draw(b, t, R(7, 14, 8, 7), A ? SCRG : B ? SCR : SCR, { l: "vg", a: 0.75, b: 0.05, oc: INK[1] });
    var on = f !== 2, cA = on ? acc[4] : acc[3], cB = acc[5];
    if (B) { // 회귀: 도는 화살표 고리
      var ring = [[10, 16], [11, 16], [12, 17], [12, 18], [11, 19], [10, 19], [9, 18], [9, 17]];
      for (var i = 0; i < 8; i++) if (i !== (f * 2) % 8) px(b, t, ring[i][0], ring[i][1], i === (f * 2 + 1) % 8 ? cB : cA);
    } else {
      pxs(b, t, [[8, 17], [9, 18], [10, 19], [11, 18], [12, 17], [13, 16]], cA);
      px(b, t, 13, 16, cB);
      if (A) { pxs(b, t, [[8, 15], [9, 16]], GR[3]); for (var x = 8; x < 8 + 2 + f; x++) px(b, t, x, 15, GR[4]); }
    }
    // 주사선
    for (var sx = 8; sx < 14; sx++) px(b, t, sx, 15 + (f % 3), rgba(CY[5], 0.12));
    // 돔
    var rx = L >= 2 ? 6.5 : 6, ry = L >= 2 ? 4 : 3.6;
    draw(b, t, R(11 - rx, 12, rx * 2, 2.6), DARKM, { l: "cylh" });
    draw(b, t, E(11, 12, rx, ry), acc, { l: "sph" });
    draw(b, t, R(11 - rx + 1, 12, rx * 2 - 2, 1), [acc[1], acc[1]], { l: "flat", ol: false });
    // 총열
    if (A) {
      [6, 12].forEach(function (x) { draw(b, t, R(x, 4 + rc, 4, 8), METAL, { l: "cyl" }); draw(b, t, R(x - 1, 2 + rc, 6, 3), DARKM, { l: "box" }); px(b, t, x + 1, 3 + rc, acc[4]); });
    } else if (B) {
      draw(b, t, R(8, 3 + rc, 6, 9), METAL, { l: "cyl" });
      for (var k = 0; k < 2; k++) for (var y = 4 + rc; y < 11 + rc; y++) px(b, t, 9 + ((f + k * 2) % 4), y, SL[1]);
      draw(b, t, R(7, 7 + rc, 8, 2), ORNG, { l: "cyl" });
      draw(b, t, R(7, 1 + rc, 8, 3), DARKM, {});
      pxs(b, t, [[9, 2 + rc], [11, 2 + rc], [13, 2 + rc]], INK[0]);
    } else {
      var top = L >= 1 ? 3 : 4;
      draw(b, t, R(8.5, top + 1 + rc, 5, 10 - top), METAL, { l: "cyl" });
      draw(b, t, R(7.5, top - 1 + rc, 7, 3), DARKM, { l: "cyl" });
      px(b, t, 10, top + rc, INK[0]); px(b, t, 11, top + rc, INK[0]); px(b, t, 9, top - 1 + rc, acc[4]);
      if (L >= 2) draw(b, t, R(8, 8 + rc, 6, 2), acc, { l: "cyl", ol: false });
    }
    // 돔 반사점·눈
    px(b, t, 7, 10, acc[n1(acc)]); px(b, t, 8, 9, acc[n1(acc)]);
    if (fk === 0) {
      var fy = A ? 0 : 0;
      (A ? [8, 14] : [11]).forEach(function (cx) {
        pxs(b, t, [[cx - 1, fy], [cx, fy], [cx - 1, fy + 1], [cx, fy + 1]], OR[6]);
        pxs(b, t, [[cx - 2, fy], [cx + 1, fy], [cx - 2, fy + 1], [cx + 1, fy + 1]], CY[5]);
        if (!A) pxs(b, t, [[cx - 3, fy + 1], [cx + 2, fy + 1]], CY[4]);
      });
    } else if (fk === 1) {
      (A ? [8, 14] : [11]).forEach(function (cx) { pxs(b, t, [[cx - 1, 1], [cx, 1]], CY[5]); px(b, t, cx - 1, 0, CY[4]); });
    }
  }
  function n1(r) { return r.length - 1; }
  function unitGlow(L, f, fk, gx) {
    var acc = L === 3 ? GRN : L === 4 ? ORNG : CYR, g = [[gx(11), 17.5, 5, acc[3], 0.14], [gx(11), 17.5, 2.5, acc[4], 0.18]].concat(pipGlow(L, acc, gx));
    if (fk === 0) (L === 3 ? [8, 14] : [11]).forEach(function (cx) { g.push([gx(cx), 1, 5, CY[3], 0.3], [gx(cx), 1, 2.5, OR[5], 0.5]); });
    if (fk === 1) g.push([gx(11), 1, 3, CY[3], 0.25]);
    return g;
  }

  // ---- 린터: 빗자루 치마 + 스캐너 갈퀴 안테나 + 노란 발신구 (대칭, 조준 없음)
  function lintBody(b, t, L, f) {
    var A = L === 3, B = L === 4, acc = A ? RED : B ? GRN : GOLD;
    // 빗자루 치마
    var sw = L >= 2 ? 8 : 7;
    draw(b, t, P([[11 - sw + 2, 17], [11 + sw - 2, 17], [11 + sw, 23], [11 - sw, 23]]), GOLD, { l: "vg", a: 0.75, b: 0.25, hi: 4 });
    for (var x = 11 - sw + 1; x < 11 + sw - 1; x += 2) line(b, t, x + (x < 11 ? 1 : 0), 19, x, 22, OR[2]);
    // 몸통
    draw(b, t, R(7, 12, 8, 8), METAL, { l: "cyl", rim: OR[4] });
    draw(b, t, R(7, 15, 8, 2), acc, { l: "cyl", ol: false });
    if (A) for (var i = 0; i < 4; i++) { px(b, t, 7 + i * 2, 15, INK[2]); px(b, t, 8 + i * 2, 16, INK[2]); }
    draw(b, t, E(11, 12, 4, 1.6), METAL, { l: "sph" });
    // 기둥
    draw(b, t, R(10, 6, 2, 7), DARKM, { ol: false, l: "cyl" });
    if (B) {
      // 자동 수정: 렌치 머리 + 톱니
      draw(b, t, S(E(11, 5.5, 5, 4.5), U(R(9, 0, 4, 5), E(11, 5.5, 1.6, 1.6))), METAL, { l: "sph", rim: GR[4] });
      draw(b, t, G(11, 17, 3.2, 2.2, 6, f * Math.PI / 12, 0.8), GRN, { l: "sph" });
      draw(b, t, E(11, 5.5, 1.5, 1.5), GRN, { l: "flat", f: 0.95, ol: false });
    } else {
      // 갈퀴(프롱)
      if (A) {
        draw(b, t, P([[5, 11], [9, 11], [8, 5], [6, 1]]), METAL, { l: "cyl" });
        draw(b, t, P([[13, 11], [17, 11], [16, 1], [14, 5]]), METAL, { l: "cyl" });
        px(b, t, 6, 2, RD[4]); px(b, t, 15, 2, RD[4]);
      } else {
        var ph = L >= 1 ? 1 : 2;
        draw(b, t, P([[7.5, 12], [9.5, 12], [6.5, ph], [4, ph + 1]]), METAL, { l: "cyl" });
        draw(b, t, P([[12.5, 12], [14.5, 12], [18, ph + 1], [15.5, ph]]), METAL, { l: "cyl" });
        px(b, t, 5, ph + 1, acc[5]); px(b, t, 16, ph + 1, acc[5]);
      }
      draw(b, t, E(11, 11, 4, 1.8), DARKM, { l: "sph" });
      // 발신구
      var pr = L >= 2 ? 2.6 : 2.2;
      draw(b, t, E(11, 6, pr, pr), acc, { l: "sph", v: f === 1 ? 0.1 : 0 });
      if (L >= 2) { draw(b, t, S(E(11, 6, 5.5, 1.7), E(11, 6, 4, 0.9)), acc, { l: "flat", f: f % 2 ? 0.7 : 0.5, ol: false }); draw(b, t, E(11, 6, pr, pr), acc, { l: "sph", v: f === 1 ? 0.1 : 0 }); }
    }
    // 파동 호(idle 4프레임: 발신구에서 위로 퍼짐)
    var arcs = [[], [[10, 2], [11, 2]], [[9, 1], [10, 0], [11, 0], [12, 1]], [[8, 1], [13, 1]]];
    pxs(b, t, arcs[f % 4], rgba(acc[4], 0.8));
  }
  function lintGlow(L, f, fk, gx) {
    var acc = L === 3 ? RED : L === 4 ? GRN : GOLD, r = [3, 4, 5, 4][f % 4];
    return [[gx(11), 6, r + 1, acc[4], 0.09], [gx(11), 6, r - 1, acc[5], 0.12], [gx(11), 6, 1.6, acc[5], 0.35]].concat(pipGlow(L, acc, gx));
  }

  // ---- 통합 테스트: 톱니 통 + 박격포 (대칭, 위로 쏨)
  function integBody(b, t, L, f, fk) {
    var A = L === 3, B = L === 4, acc = A ? CYR : B ? ORNG : PINK, rc = fk === 0 ? 2 : fk === 1 ? 1 : 0, ph = f * Math.PI / 16;
    // 통
    draw(b, t, R(4, 14, 14, 9), DARKM, { l: "cyl", rim: acc[3], v: 0.05 });
    if (L >= 1) { draw(b, t, G(4.5, 18, 3.2, 2.2, 6, -ph, 0.7), DARKM, { l: "sph" }); draw(b, t, G(17.5, 18, 3.2, 2.2, 6, ph, 0.7), DARKM, { l: "sph" }); }
    draw(b, t, G(11, 18.5, 4.6, 3.4, 8, ph, 1.2), acc, { l: "sph" });
    // 포신
    if (A) {
      [[6.5, 0], [15.5, 1]].forEach(function (c, i) {
        var y = 6 + (i === 0 ? rc : (fk >= 0 ? 0 : 0));
        draw(b, t, R(c[0] - 2.5, y, 5, 9), acc, { l: "cyl" });
        draw(b, t, R(c[0] - 3, y + 3, 6, 2), DARKM, { l: "cylh" });
        draw(b, t, E(c[0], y + 0.5, 2.5, 1.2), [INK[0], INK[1], INK[1]], { ol: false, l: "flat" });
      });
    } else {
      var hw = B ? 5 : L >= 2 ? 4 : 3.5, top = B ? 4 : L >= 1 ? 5 : 6;
      draw(b, t, R(11 - hw, top + rc, hw * 2, 15 - top), acc, { l: "cyl" });
      draw(b, t, R(11 - hw - 1, top + 3 + rc, hw * 2 + 2, 3), L >= 2 && !B ? GOLD : DARKM, { l: "cylh" });
      if (B) for (var x = 6; x < 17; x += 2) { px(b, t, x, top + 7 + rc, INK[2]); px(b, t, x + 1, top + 8 + rc, INK[2]); }
      draw(b, t, E(11, top + 0.5 + rc, hw, 1.4), [acc[0], acc[1], INK[0], INK[1]], { l: "vg", a: 0, b: 0.6, oc: acc[3] });
    }
    if (fk === 0) {
      var cxs = A ? [6.5] : [11];
      cxs.forEach(function (cx) {
        fill(b, t, star(cx, 3, 4, 1.6, 5, 0.3), OR[4]);
        fill(b, t, star(cx, 3, 2.4, 1, 5, 0.3), OR[6]);
      });
    } else if (fk === 1) {
      (A ? [6.5] : [11]).forEach(function (cx) {
        draw(b, t, E(cx - 2, 2, 2.2, 1.8), PAPER, { l: "sph" });
        draw(b, t, E(cx + 2, 1.5, 1.8, 1.5), PAPER, { l: "sph" });
      });
    } else if (fk === 2) {
      (A ? [6.5] : [11]).forEach(function (cx) { draw(b, t, E(cx + 1, 1.5, 1.5, 1.2), PAPER, { l: "sph", v: -0.2 }); });
    }
  }
  function integGlow(L, f, fk, gx) {
    var acc = L === 3 ? CYR : L === 4 ? ORNG : PINK, g = [[gx(11), 18.5, 3, acc[4], 0.14]].concat(pipGlow(L, acc, gx));
    if (fk === 0) g.push([gx(L === 3 ? 6.5 : 11), 3, 5, OR[5], 0.16], [gx(L === 3 ? 6.5 : 11), 3, 2.5, OR[6], 0.4]);
    return g;
  }

  // ---- 코드 리뷰: 긴 망원 총열 + 돋보기 렌즈 (오른쪽 보기 기본, 왼쪽은 좌우 반전 — 빛은 다시 계산)
  function reviewBody(b, t, L, f, fk) {
    var A = L === 3, B = L === 4, acc = A ? RED : B ? CYR : PURP, rc = fk === 0 ? -1 : 0;
    // 다리·받침
    line(b, t, 9, 16, 6, 21, INK[4]); line(b, t, 13, 16, 16, 21, INK[4]);
    if (L >= 1) { line(b, t, 10, 16, 7, 21, SL[1]); line(b, t, 12, 16, 15, 21, SL[1]); }
    draw(b, t, R(8, 15, 6, 7), DARKM, { l: "box" });
    px(b, t, 9, 17, acc[4]);
    draw(b, t, E(11, 14, 3, 2.5), METAL, { l: "sph" });
    // 총열
    var bx = (L >= 1 ? 2 : 3) + rc, len = L >= 1 ? 15 : 14;
    draw(b, t, R(bx, 9, len, 4), acc, { l: "cylh", rim: CY[4] });
    draw(b, t, R(bx - 1, 9, 3, 4), DARKM, { l: "cylh" });
    if (L >= 1) { draw(b, t, R(bx + 4, 8, 2, 6), GOLD, { l: "cyl", hi: 5 }); draw(b, t, R(bx + 9, 8, 2, 6), GOLD, { l: "cyl", hi: 5 }); }
    // 조준경 / 페어 총열
    if (B) {
      draw(b, t, R(bx + 1, 4, 13, 4), acc, { l: "cylh" });
      draw(b, t, R(bx, 4, 3, 4), DARKM, { l: "cylh" });
      draw(b, t, E(16.5 + rc, 6, 2.6, 3), GOLD, { l: "sph" });
      draw(b, t, E(16.6 + rc, 6, 1.6, 2), CYR, { l: "sph", ol: false, v: fk === 0 ? 0.5 : 0 });
      px(b, t, 16 + rc, 5, CY[5]);
    } else {
      draw(b, t, R(bx + 3, 5, 8, 3), DARKM, { l: "cylh" });
      px(b, t, bx + 3, 6, CY[4]);
      line(b, t, bx + 6, 8, bx + 6, 8, INK[2]);
    }
    // 렌즈
    var lr = L >= 2 ? 3.6 : 3.1, lx = 18 + rc, ly = 11;
    draw(b, t, E(lx, ly, lr, lr + 0.6), GOLD, { l: "sph" });
    var glass = A ? RED : CYR;
    draw(b, t, E(lx + 0.1, ly, lr - 1, lr - 0.4), glass, { l: "sph", ol: false, v: fk === 0 ? 0.6 : fk === 1 ? 0.3 : 0 });
    var gl = [[[lx - 1, ly - 2]], [[lx - 1, ly - 2], [lx, ly - 2]], [[lx - 1, ly - 1]]][f % 3];
    pxs(b, t, gl.map(function (p) { return [Math.floor(p[0]), p[1]]; }), A ? RD[5] : CY[5]);
    if (A) { var cx = Math.floor(lx); pxs(b, t, [[cx, ly - 1], [cx, ly + 1], [cx - 1, ly], [cx + 1, ly]], OR[6]); }
    if (A) draw(b, t, P([[lx - 1, ly - lr - 0.6], [lx + 1, ly - lr - 0.6], [lx, ly - lr - 3]]), RED, { l: "flat", f: 0.7 });
    if (L >= 2 && !A && !B) draw(b, t, R(14, 5, 2, 3), GOLD, { l: "box" });
  }
  function reviewGlow(L, f, fk, gx) {
    var acc = L === 3 ? RED : L === 4 ? CYR : PURP, gc = L === 3 ? RD[4] : CY[4], g = [[gx(18.5), 11.5, 3.5, gc, 0.18]].concat(pipGlow(L, acc, gx));
    if (fk === 0) g.push([gx(18), 11.5, 4, gc, 0.3], [gx(18), 11.5, 2.5, CY[5], 0.4]);
    if (fk === 1) g.push([gx(18), 11.5, 3.5, gc, 0.22]);
    return g;
  }

  // ---- 모니터링: 모니터 + 회전 레이더 접시 (대칭, 조준 없음)
  function monitorBody(b, t, L, f) {
    var A = L === 3, B = L === 4, acc = A ? RED : B ? CYR : GRN;
    var mw = B ? 18 : L >= 2 ? 14 : 12, mx = 11 - mw / 2;
    // 기둥·접시 (뒤)
    var dishY = B ? 5 : 6, rx = [5, 3, 1.2, 3][f % 4] * (B ? 1.2 : L >= 2 ? 1.1 : 1);
    if (!A) {
      draw(b, t, R(10, dishY, 2, 7), DARKM, { ol: false, l: "cyl" });
      draw(b, t, E(11, dishY, rx, 2.2), f % 4 === 3 ? DARKM : METAL, { l: "sph", v: f % 4 === 1 ? -0.15 : 0 });
      if (f % 4 !== 3) { px(b, t, 11, dishY, acc[4]); px(b, t, 10, dishY - 1, SL[5]); }
      line(b, t, 11, dishY - 1, 11, dishY - 3, SL[2]); px(b, t, 11, dishY - 4, f % 2 ? acc[5] : acc[3]);
    }
    // 모니터
    draw(b, t, R(mx, 11, mw, 11), METAL, { l: "box", rim: GR[3] });
    if (B) {
      draw(b, t, R(3, 13, 7, 6), SCR, { l: "vg", a: 0.75, b: 0.05, oc: INK[1] });
      draw(b, t, R(12, 13, 7, 6), SCRG, { l: "vg", a: 0.75, b: 0.05, oc: INK[1] });
      for (var i = 0; i < 4; i++) { var h = [2, 3, 1, 4][(i + f) % 4]; for (var y = 0; y < h; y++) px(b, t, 4 + i + (i > 1 ? 1 : 0), 17 - y, i % 2 ? CY[3] : CY[4]); }
      var wv = [0, 1, 1, 0, -1, -1];
      for (var x = 0; x < 5; x++) px(b, t, 13 + x, 15 + wv[(x + f) % 6], GR[4]);
    } else {
      draw(b, t, R(mx + 2, 13, mw - 4, 6), A ? SCRR : SCRG, { l: "vg", a: 0.75, b: 0.05, oc: INK[1] });
      var g = [1, 1, 0, 1, 2, 1, 1, 0, -1, 1, 1, 1], base = 16;
      for (var x2 = 0; x2 < mw - 6; x2++) px(b, t, mx + 3 + x2, base - (A && x2 === 3 ? 2 : 0) + (g[(x2 + f * 2) % 12] - 1), x2 === (f * 2) % (mw - 6) ? acc[5] : acc[4]);
    }
    for (var sx = mx + 2; sx < mx + mw - 2; sx++) px(b, t, sx, 14 + (f % 4), rgba(GR[5], 0.1));
    // 단추
    px(b, t, mx + mw - 3, 20, acc[f % 2 ? 4 : 3]); px(b, t, mx + 2, 20, SL[3]); px(b, t, mx + 3, 20, SL[3]);
    if (L >= 1 && !B) {
      line(b, t, mx + mw - 1, 11, mx + mw + 1, 7, SL[2]); px(b, t, mx + mw + 1, 6, f % 2 ? acc[5] : acc[2]);
    }
    if (A) {
      // 경보등(돌아가는 사이렌)
      draw(b, t, R(8, 9, 6, 3), DARKM, { l: "box" });
      draw(b, t, E(11, 7, 3.4, 3.6), RED, { l: "sph", v: f % 2 ? 0.15 : -0.1 });
      var side = f % 4;
      pxs(b, t, side < 2 ? [[9 + side, 6], [9 + side, 7]] : [[12 - (side - 2), 6], [12 - (side - 2), 7]], OR[6]);
      draw(b, t, E(16.5, 9, 2, 1), METAL, { l: "sph" });
    }
  }
  function monitorGlow(L, f, fk, gx) {
    var acc = L === 3 ? RED : L === 4 ? CYR : GRN, g = [[gx(11), 16, 6, acc[3], 0.12]].concat(pipGlow(L, acc, gx));
    if (L === 3) g.push([gx(11), 7, f % 2 ? 7 : 5, RD[4], 0.22], [gx(11), 7, 3, OR[5], 0.25]);
    else g.push([gx(11), 2, 2, acc[4], f % 2 ? 0.4 : 0.15]);
    return g;
  }

  // ---- CI 파이프라인: 기둥 탱크 + 양쪽 배관 + 톱니 + 위 컨베이어 고리 (대칭, 조준 없음)
  function ciBody(b, t, L, f) {
    var A = L === 3, B = L === 4, acc = A ? GOLD : B ? CYR : ORNG, ph = f * Math.PI / 16;
    // 배관
    var pipe = function (sx) {
      var x0 = sx < 0 ? 3 : 16;
      draw(b, t, R(x0, 13, 3, 10), DARKM, { l: "cyl" });
      draw(b, t, R(sx < 0 ? 3 : 13, 12, 6, 3), DARKM, { l: "cylh" });
      draw(b, t, R(x0 - 0, 18, 3, 2), acc, { l: "cyl", ol: false });
    };
    pipe(-1); pipe(1);
    // 흐르는 불빛
    var fl = [[4, 21], [4, 19], [4, 17], [4, 15]][f % 4]; px(b, t, fl[0], fl[1], acc[4]);
    var fr = [[17, 15], [17, 17], [17, 19], [17, 21]][f % 4]; px(b, t, fr[0], fr[1], acc[4]);
    // 탱크
    var tw = L >= 2 ? 8 : 7;
    draw(b, t, R(11 - tw / 2, 8, tw, 15), METAL, { l: "cyl", rim: acc[3], v: -0.12 });
    for (var y = 10; y < 21; y += 4) draw(b, t, R(11 - tw / 2, y, tw, 1), DARKM, { ol: false, l: "cyl" });
    // 톱니
    draw(b, t, G(11, 17, 4.4, 3.2, 8, ph, 1.1), L >= 1 ? GOLD : METAL, { l: "sph" });
    draw(b, t, E(11, 17, 1.2, 1.2), acc, { l: "flat", f: 0.9, ol: false });
    // 위
    if (A) {
      draw(b, t, E(11, 6.5, 5, 4.5), GOLD, { l: "sph" });
      draw(b, t, R(6, 6, 10, 1), OR[1] ? [OR[1], OR[1]] : null, { l: "flat", ol: false });
      pxs(b, t, [[8, 5], [11, 4], [14, 5]].slice(0, 1 + f % 3), OR[6]);
      draw(b, t, R(10, 1, 2, 2), DARKM, {});
    } else {
      var rings = B ? [4.5, 8.5] : [6.5];
      rings.forEach(function (ry, ri) {
        var r = L >= 2 || B ? 6.5 : 5.5;
        draw(b, t, S(E(11, ry, r, 2.6), E(11, ry, r - 2.4, 0.9)), METAL, { l: "sph", v: -0.1 });
        for (var k = 0; k < 4; k++) {
          var a = k * Math.PI / 2 + (f + ri * 2) * Math.PI / 8 * (ri ? -1 : 1);
          var lx = Math.round(11 + Math.cos(a) * (r - 1) - 0.5), ly = Math.round(ry + Math.sin(a) * 1.6 - 0.5);
          px(b, t, lx, ly, Math.sin(a) > 0 ? acc[5] || acc[4] : acc[3]);
          if (Math.sin(a) > 0) px(b, t, lx + 1, ly, acc[4]);
        }
      });
    }
    if (L >= 2 && !A) { draw(b, t, E(4.5, 11, 2, 2), RED, { l: "sph" }); }
  }
  function ciGlow(L, f, fk, gx) {
    var acc = L === 3 ? GOLD : L === 4 ? CYR : ORNG, g = [[gx(11), 17, 3, acc[4], 0.18]].concat(pipGlow(L, acc, gx));
    (L === 4 ? [4.5, 8.5] : [6.5]).forEach(function (y) { g.push([gx(11), y, 2.5, acc[4], 0.12]); });
    return g;
  }

  var TOWER_DEF = {
    unit:    { body: unitBody, glow: unitGlow, acc: function (L) { return L === 3 ? GRN : L === 4 ? ORNG : CYR; }, idle: 4, fire: 2, fps: 4, ffps: 16, muzzle: [0, -27], facing: "sym" },
    lint:    { body: lintBody, glow: lintGlow, acc: function (L) { return L === 3 ? RED : L === 4 ? GRN : GOLD; }, idle: 4, fire: 0, fps: 6, muzzle: [0, -22], facing: "sym" },
    integ:   { body: integBody, glow: integGlow, acc: function (L) { return L === 3 ? CYR : L === 4 ? ORNG : PINK; }, idle: 4, fire: 3, fps: 4, ffps: 12, muzzle: [0, -23], facing: "sym" },
    review:  { body: reviewBody, glow: reviewGlow, acc: function (L) { return L === 3 ? RED : L === 4 ? CYR : PURP; }, idle: 3, fire: 2, fps: 3, ffps: 12, muzzle: [8, -17], facing: "lr" },
    monitor: { body: monitorBody, glow: monitorGlow, acc: function (L) { return L === 3 ? RED : L === 4 ? CYR : GRN; }, idle: 4, fire: 0, fps: 5, muzzle: [0, -22], facing: "sym" },
    ci:      { body: ciBody, glow: ciGlow, acc: function (L) { return L === 3 ? GOLD : L === 4 ? CYR : ORNG; }, idle: 4, fire: 0, fps: 6, muzzle: [0, -21], facing: "sym" }
  };

  function towerLook(def, L, flip) {
    var t = flip ? TT({ ox: TW, sx: -1 }) : ID, acc = def.acc(L);
    var gx = flip ? function (x) { return TW - x; } : function (x) { return x; };
    var mk = function (f, fk) { return function (b) { pedestal(b, t, L, acc); def.body(b, t, L, f, fk); }; };
    var s = sprite(TW, TH, TAX, TAY, def.fps, range(def.idle).map(function (f) { return mk(f, -1); }),
      range(def.idle).map(function (f) { return def.glow(L, f, -1, gx); }));
    if (def.fire) {
      s.fire = range(def.fire).map(function (k) { return bake(TW, TH, mk(0, k)); });
      s.fireGlow = range(def.fire).map(function (k) { return glow(def.glow(L, 0, k, gx)); });
      s.ffps = def.ffps;
    }
    return s;
  }
  TD.towers = {};
  Object.keys(TOWER_DEF).forEach(function (kind) {
    var d = TOWER_DEF[kind];
    var tw = { w: TW, h: TH, ax: TAX, ay: TAY, muzzle: d.muzzle, facing: d.facing, looks: range(5).map(function (L) { return towerLook(d, L, false); }) };
    if (d.facing === "lr") {
      tw.looksLeft = range(5).map(function (L) { return towerLook(d, L, true); });
      tw.muzzleLeft = [-d.muzzle[0], d.muzzle[1]];
    }
    TD.towers[kind] = tw;
  });

  // ======================================================================
  // 아이템 — 지역 좌표 16 단위 상자. 아이콘 16×16, 쓰기 연출 32×32(기준점 = 맞는 바닥점)
  // ======================================================================
  function dropShadow(b, cx, cy, rx, a) { fill(b, ID, E(cx, cy, rx, Math.max(1, rx * 0.35)), rgba(INK[0], a)); }
  function impact(b, cx, cy, ro, col) {
    draw(b, ID, star(cx, cy, ro, ro * 0.45, 7, 0.2), YEL, { l: "sph", oc: OR[2] });
    if (col) draw(b, ID, star(cx, cy, ro * 0.5, ro * 0.25, 7, 0.2), [col, col], { l: "flat", ol: false });
  }
  function puff(b, cx, cy, r, v) { draw(b, ID, E(cx, cy, r, r * 0.8), PAPER, { l: "sph", v: v || 0, oc: SL[0] }); }
  function sparkle(b, cx, cy, col) { px(b, ID, cx, cy, col || OR[6]); px(b, ID, cx - 1, cy, OR[5]); px(b, ID, cx + 1, cy, OR[5]); px(b, ID, cx, cy - 1, OR[5]); px(b, ID, cx, cy + 1, OR[5]); }
  function tinyStar(b, cx, cy, rot) { draw(b, ID, star(cx, cy, 3.6, 1.6, 5, rot), YEL, { l: "sph", oc: OR[3], lit: false }); }
  function speedLines(b, list, col) { list.forEach(function (l) { line(b, ID, l[0], l[1], l[2], l[3], col || rgba(SL[5], 0.7)); }); }
  function splat(b, cx, cy, s) {
    fill(b, ID, U(E(cx, cy, 4 * s, 1.4 * s), E(cx - 3 * s, cy - 0.5, 1.2 * s, 0.8 * s), E(cx + 3.4 * s, cy + 0.3, 1.1 * s, 0.7 * s)), GR[2]);
    fill(b, ID, E(cx - 0.5, cy - 0.3, 2 * s, 0.6 * s), GR[3]);
  }

  // 손바닥(손등이 보이는 큰 손)
  function drawPalm(b, t, squash) {
    draw(b, t, R(5, 12.5, 6, 3.2), RED, { l: "cyl" });
    pxs(b, t, [[6, 14], [8, 14], [10, 14]], RD[5]);
    [E(4.4, 5, 1.5, 3.3), E(7, 3.6, 1.6, 3.8), E(9.8, 3.8, 1.55, 3.6), E(12.4, 5.6, 1.4, 3)].forEach(function (fg) { draw(b, t, fg, SKIN, { l: "cyl", rim: OR[5] }); });
    draw(b, t, C(3.4, 10.6, 1, 7.4, 1.5), SKIN, { l: "cyl" });
    draw(b, t, U(E(8.2, 9.8, 4.9, 4), R(4, 8.4, 8.4, 4.6)), SKIN, { l: "sph", rim: OR[5] });
    pxs(b, t, [[6, 8], [9, 8]], OR[2]);
    if (!squash) { px(b, t, 7, 1, OR[6]); px(b, t, 4, 3, OR[6]); px(b, t, 6, 9, OR[5]); }
  }
  // 슬리퍼(위에서 본)
  function drawSlipper(b, t) {
    var sole = U(E(8, 4.6, 4.6, 4.4), E(8, 11.8, 3.4, 3.6), P([[3.5, 5], [12.5, 5], [11.3, 12], [4.7, 12]]));
    draw(b, t, sole, RED, { l: "sph", hi: 5 });
    draw(b, t, U(E(8, 4.8, 3.3, 3.2), E(8, 11.6, 2.2, 2.5), P([[4.8, 5], [11.2, 5], [10.1, 11.6], [5.9, 11.6]])), [OR[3], OR[3], OR[4], OR[5]], { l: "vg", a: 0.85, b: 0.25, ol: false });
    draw(b, t, I(sole, R(0, 3.6, 16, 3.6)), CYR, { l: "cylh", oc: CY[1] });
    pxs(b, t, [[5, 5], [8, 5], [11, 5]], CY[5]);
    pxs(b, t, [[6, 13], [8, 14], [10, 13]], OR[2]);
  }
  // 파리채
  function drawSwatter(b, t) {
    draw(b, t, C(8, 9, 8, 15.2, 0.9), METAL, { l: "cyl" });
    draw(b, t, R(6.8, 13.4, 2.4, 2.4), RED, { l: "cyl" });
    var head = P([[2.5, 1], [13.5, 1], [14.5, 2.2], [13.6, 9.6], [2.4, 9.6], [1.5, 2.2]]);
    draw(b, t, head, GRN, { l: "vg", a: 0.7, b: 0.35, rim: GR[5] });
    for (var y = 2; y <= 8; y += 2) for (var x = 3; x <= 13; x += 2) px(b, t, x, y, GR[1]);
    for (var y2 = 3; y2 <= 8; y2 += 2) for (var x2 = 4; x2 <= 12; x2 += 2) px(b, t, x2, y2, GR[4]);
  }
  // 말아 쥔 신문지
  function drawPaper(b, t) {
    var roll = P([[1.5, 10.5], [10.5, 1.5], [14.5, 5.5], [5.5, 14.5]]);
    draw(b, t, roll, PAPER, { l: function (u, w) { var d = (u + w) - 1; return 0.75 - d * 0.25 - Math.abs(u - w) * 0.6; } });
    // 글줄
    [[4, 9], [6, 7], [8, 5], [10, 3]].forEach(function (p, i) { px(b, t, p[0] + 1, p[1] + 1, SL[1]); px(b, t, p[0] + 2, p[1] + 2, i % 2 ? SL[1] : RD[3]); });
    draw(b, t, E(12.5, 3.5, 2.3, 2.3), PAPER, { l: "sph" });
    px(b, t, 12, 3, SL[1]); px(b, t, 13, 4, SL[2]);
    draw(b, t, R(5.2, 8.2, 2.5, 2.5), RED, { l: "flat", f: 0.6, ol: false });
  }
  // 뿅망치
  function drawHammer(b, t, squash) {
    draw(b, t, C(8, 9, 8, 15.2, 1.15), YEL, { l: "cyl" });
    draw(b, t, R(6.6, 8.2, 2.8, 1.8), CYR, { l: "cyl", ol: false });
    var hy = squash ? 5 : 4.8;
    draw(b, t, R(3, 1.4, 10, 7), RED, { l: "cylh", rim: RD[5] });
    // 주름(아코디언)
    for (var x = 5; x <= 11; x += 2) { px(b, t, x, 2, RD[2]); px(b, t, x, 3, RD[2]); px(b, t, x, 6, RD[2]); px(b, t, x, 7, RD[2]); }
    draw(b, t, E(2.6, hy, 1.6, 3.7), YEL, { l: "sph" });
    draw(b, t, E(13.4, hy, 1.6, 3.7), YEL, { l: "sph" });
  }
  // 살충제 깡통
  function drawSpray(b, t) {
    draw(b, t, R(4.5, 4.5, 7, 11), GRN, { l: "cyl", rim: GR[5] });
    draw(b, t, R(4.5, 8, 7, 4), YEL, { l: "cyl", ol: false });
    pxs(b, t, [[7, 9], [8, 10], [9, 9], [7, 11], [9, 11]], RD[2]);
    draw(b, t, E(8, 4.5, 3.5, 1.4), METAL, { l: "sph" });
    draw(b, t, R(6, 1.4, 4, 3), METAL, { l: "cyl" });
    draw(b, t, R(9.5, 1.8, 2.5, 1.5), RED, { l: "flat", f: 0.6 });
  }
  // 끈끈이
  function drawTrap(b, t) {
    var board = P([[1, 5], [13, 3], [15, 11], [3, 13.5]]);
    draw(b, t, board, YEL, { l: "vg", a: 0.85, b: 0.45, oc: OR[2] });
    // 광택·방울
    line(b, t, 4, 6, 10, 5, OR[6]); px(b, t, 12, 9, OR[6]);
    draw(b, t, E(6, 13.6, 1, 1.6), YEL, { l: "sph", oc: OR[2] });
    draw(b, t, E(11, 12.6, 0.9, 1.3), YEL, { l: "sph", oc: OR[2] });
    // 붙잡힌 작은 벌레
    line(b, t, 5, 8, 11, 9, INK[4]); line(b, t, 6, 11, 10, 6, INK[4]); line(b, t, 6, 6, 10, 11, INK[4]);
    draw(b, t, E(8, 8.6, 2.2, 1.5), DARKM, { l: "sph", oc: INK[2] }); px(b, t, 7, 8, SL[2]);
  }
  // 화염방사기
  function drawFlamer(b, t) {
    draw(b, t, RRpill(0.5, 3, 5.5, 11.5), RED, { l: "cyl", rim: RD[5] });
    draw(b, t, R(0.5, 6.5, 5.5, 1.2), DARKM, { ol: false, l: "flat", f: 0.4 });
    draw(b, t, R(0.5, 10.5, 5.5, 1.2), DARKM, { ol: false, l: "flat", f: 0.4 });
    draw(b, t, R(7, 10, 2.4, 4), DARKM, { l: "cyl" });
    draw(b, t, R(4.5, 7, 8, 3.6), METAL, { l: "cylh" });
    draw(b, t, R(11.5, 6.4, 2.6, 4.8), DARKM, { l: "cylh" });
    draw(b, t, P([[14, 8.8], [16, 6.6], [15.4, 8.8], [16, 11]]), GOLD, { l: "sph", oc: OR[3] });
    px(b, t, 2, 4, RD[5]); px(b, t, 6, 7, SL[4]);
  }
  function RRpill(x, y, w, h) { return U(R(x, y + w / 2, w, h - w), E(x + w / 2, y + w / 2, w / 2, w / 2), E(x + w / 2, y + h - w / 2, w / 2, w / 2)); }
  // 진공청소기(손 청소기)
  function drawVacuum(b, t) {
    draw(b, t, C(10.5, 4, 13.5, 1.5, 1), DARKM, { l: "cyl" });
    draw(b, t, U(E(9, 6.8, 5.2, 4), R(5, 6.8, 8, 4)), PURP, { l: "sph", rim: PU[4] });
    draw(b, t, E(8, 6.6, 2.6, 2), CYR, { l: "sph", ol: true, oc: CY[0] });
    pxs(b, t, [[7, 7], [9, 6]], SL[2]);
    draw(b, t, P([[4.5, 9.5], [8.5, 10], [4.5, 15], [1.5, 15.2], [2.5, 12]]), DARKM, { l: "cyl" });
    draw(b, t, R(0.6, 14, 6.5, 2), METAL, { l: "cylh" });
  }

  // 아이콘 16×16 (기준점 = 가운데 (8, 8))
  function icon(drawFn, extra, rot, sc) {
    return sprite(16, 16, 8, 8, 4, [function (b) { fill(b, ID, E(8, 14.4, 5.5, 1.3), rgba(INK[0], 0.5)); drawFn(b, IT(8, 7.6, sc || 0.88, rot || 0)); if (extra) extra(b); }]);
  }

  var HW = 32, HH = 32, HAX = 16, HAY = 26;
  function hit(fns, fps) { return sprite(HW, HH, HAX, HAY, fps || 12, fns); }

  TD.items = {
    palm: { icon: icon(drawPalm), hit: hit([
      function (b) { dropShadow(b, 16, 26, 4, 0.35); drawPalm(b, IT(16, 7, 0.8, -0.15)); speedLines(b, [[8, 2, 8, 6], [24, 2, 24, 5]]); },
      function (b) { dropShadow(b, 16, 26, 7, 0.5); drawPalm(b, IT(16, 11, 1.3, -0.05)); speedLines(b, [[5, 3, 5, 9], [27, 3, 27, 9], [9, 1, 9, 4]]); },
      function (b) { dropShadow(b, 16, 26.5, 10, 0.6); impact(b, 16, 24, 10, OR[6]); drawPalm(b, IT(16, 20.5, 1.45, 0, 1.15, 0.72), true); },
      function (b) { splat(b, 16, 26, 1.4); drawPalm(b, IT(16, 17, 1.25, 0.05, 1, 0.92), true); puff(b, 5, 24, 2.4); puff(b, 27, 24, 2.4); },
      function (b) { splat(b, 16, 26, 1.4); puff(b, 3, 22, 1.8, -0.1); puff(b, 29, 22, 1.8, -0.1); sparkle(b, 9, 18); sparkle(b, 23, 19); }
    ]) },
    slipper: { icon: icon(drawSlipper, null, 0.7, 0.92), hit: hit([
      function (b) { dropShadow(b, 16, 26, 3, 0.3); drawSlipper(b, IT(7, 7, 0.95, -0.9)); speedLines(b, [[1, 12, 4, 10]]); },
      function (b) { dropShadow(b, 16, 26, 5, 0.4); drawSlipper(b, IT(12, 12, 1.1, 1.4)); speedLines(b, [[2, 10, 6, 7], [3, 15, 6, 13]]); },
      function (b) { dropShadow(b, 16, 26, 7, 0.5); drawSlipper(b, IT(16, 18, 1.2, 3.6)); speedLines(b, [[6, 9, 9, 12], [10, 6, 12, 10]]); },
      function (b) { dropShadow(b, 16, 26.5, 9, 0.6); impact(b, 16, 24, 8, null); drawSlipper(b, IT(16, 21.5, 1.35, -1.25, 0.75, 1.15)); },
      function (b) { splat(b, 16, 26, 1.1); drawSlipper(b, IT(16, 21, 1.3, -1.3, 0.85, 1.1)); sparkle(b, 6, 18); sparkle(b, 26, 17); }
    ]) },
    swatter: { icon: icon(drawSwatter), hit: hit([
      function (b) { drawSwatter(b, TT({ ox: 16, oy: 26, px: 8, py: 15.5, sx: 1.25, sy: 1.25, r: -0.25 })); },
      function (b) { dropShadow(b, 16, 26, 6, 0.35); drawSwatter(b, TT({ ox: 16, oy: 28, px: 8, py: 15.5, sx: 1.3, sy: 0.9, r: -0.15 })); speedLines(b, [[4, 6, 6, 10], [27, 6, 25, 10]]); },
      function (b) { dropShadow(b, 16, 26.5, 11, 0.55); impact(b, 16, 22, 9, null); drawSwatter(b, TT({ ox: 16, oy: 30, px: 8, py: 15.5, sx: 1.6, sy: 0.55, r: 0 })); },
      function (b) { // 그물 자국
        fill(b, ID, E(16, 24, 11, 4.2), rgba(GR[1], 0.75));
        for (var y = 21; y <= 27; y += 2) for (var x = 7; x <= 25; x += 2) if (((x - 16) * (x - 16)) / 121 + ((y - 24) * (y - 24)) / 17.6 < 1) px(b, ID, x, y, GR[3]);
        splat(b, 16, 24, 1); sparkle(b, 6, 16); },
      function (b) { fill(b, ID, E(16, 24, 11, 4.2), rgba(GR[1], 0.4));
        for (var y = 21; y <= 27; y += 2) for (var x = 7; x <= 25; x += 2) if (((x - 16) * (x - 16)) / 121 + ((y - 24) * (y - 24)) / 17.6 < 1) px(b, ID, x, y, rgba(GR[3], 0.6));
        splat(b, 16, 24, 1); }
    ]) },
    paper: { icon: icon(drawPaper), hit: hit([
      function (b) { drawPaper(b, TT({ ox: 26, oy: 10, px: 12.5, py: 3.5, sx: 1.4, sy: 1.4, r: 0.5 })); dropShadow(b, 16, 26, 3, 0.3); },
      function (b) { dropShadow(b, 16, 26, 6, 0.4); drawPaper(b, TT({ ox: 22, oy: 14, px: 12.5, py: 3.5, sx: 1.4, sy: 1.2, r: -0.5 })); speedLines(b, [[24, 2, 28, 6], [20, 3, 23, 7]]); },
      function (b) { dropShadow(b, 16, 26.5, 9, 0.55); impact(b, 15, 24, 8, null); drawPaper(b, TT({ ox: 18, oy: 22, px: 12.5, py: 3.5, sx: 1.5, sy: 1.0, r: -1.2 })); },
      function (b) { splat(b, 15, 26, 1); [[9, 14, 0], [15, 11, 0.6], [21, 14, 1.2]].forEach(function (s) { tinyStar(b, s[0], s[1], s[2]); }); },
      function (b) { splat(b, 15, 26, 1); [[11, 12, 0.4], [17, 11, 1], [21, 15, 1.6]].forEach(function (s) { tinyStar(b, s[0], s[1], s[2]); }); }
    ]) },
    hammer: { icon: icon(drawHammer), hit: hit([
      function (b) { dropShadow(b, 12, 26, 4, 0.3); drawHammer(b, TT({ ox: 24, oy: 29, px: 8, py: 15, sx: 1.3, sy: 1.3, r: 0.3 })); },
      function (b) { dropShadow(b, 12, 26, 7, 0.45); drawHammer(b, TT({ ox: 24, oy: 29, px: 8, py: 15, sx: 1.35, sy: 1.35, r: -0.5 })); speedLines(b, [[27, 3, 29, 8], [21, 1, 24, 5], [16, 3, 18, 7]]); },
      function (b) { dropShadow(b, 12, 26.5, 11, 0.6); impact(b, 11, 23, 10, OR[6]); drawHammer(b, TT({ ox: 24, oy: 29, px: 8, py: 15, sx: 1.4, sy: 1.25, r: -1.2 }), true); },
      function (b) { splat(b, 11, 26, 1.3); drawHammer(b, TT({ ox: 24, oy: 29, px: 8, py: 15, sx: 1.35, sy: 1.35, r: -0.8 })); [[6, 14, 0], [13, 9, 0.6]].forEach(function (s) { tinyStar(b, s[0], s[1], s[2]); }); },
      function (b) { splat(b, 11, 26, 1.3); [[5, 15, 0.6], [11, 10, 1.2], [18, 14, 1.8]].forEach(function (s) { tinyStar(b, s[0], s[1], s[2]); }); }
    ]) },
    spray: { icon: icon(drawSpray, function (b) { pxs(b, ID, [[12, 1], [14, 2], [13, 0]], GR[4]); }), hit: hit([
      function (b) { drawSpray(b, IT(8, 14, 1.2, 0.5)); },
      function (b) { drawSpray(b, IT(8, 14, 1.2, 0.5)); mist(b, [[17, 20, 2.5], [21, 22, 2]]); },
      function (b) { drawSpray(b, IT(8, 14, 1.2, 0.5)); mist(b, [[16, 20, 3], [21, 23, 3.4], [25, 21, 2.6], [19, 25, 2.4]]); },
      function (b) { mist(b, [[11, 23, 3.4], [16, 21, 4.2], [22, 23, 4.4], [27, 22, 3.2], [17, 26, 3.6]]); },
      function (b) { mist(b, [[8, 24, 3.6], [14, 22, 4.6], [21, 22, 4.8], [27, 24, 3.6], [17, 27, 3.8]], 0.55); }
    ], 10) },
    trap: { icon: icon(drawTrap), hit: hit([
      function (b) { dropShadow(b, 16, 26, 5, 0.35); drawTrap(b, IT(16, 8, 1.1, 0.4)); },
      function (b) { dropShadow(b, 16, 26, 9, 0.5); drawTrap(b, IT(16, 18, 1.5, 0.1, 1, 0.8)); },
      function (b) { drawTrap(b, IT(16, 22, 1.8, 0, 1.05, 0.55)); goo(b, [[8, 27, 2], [24, 26, 3]]); },
      function (b) { drawTrap(b, IT(16, 22, 1.75, 0, 1, 0.55)); goo(b, [[7, 28, 3], [25, 27, 4], [16, 29, 2]]); },
      function (b) { drawTrap(b, IT(16, 22, 1.75, 0, 1, 0.55)); goo(b, [[7, 29, 4], [25, 28, 4], [16, 30, 2]]); }
    ], 10) },
    flamer: { icon: icon(drawFlamer), hit: sprite(48, 24, 6, 16, 12, [0, 1, 2, 3, 4].map(function (k) {
      return function (b) {
        drawFlamer(b, TT({ ox: 6, oy: 14, px: 8, py: 9, sx: 1.2, sy: 1.2 }));
        var len = [8, 18, 28, 32, 30][k], start = 16;
        if (k > 0) {
          var wob = k % 2 ? 0.6 : -0.6;
          draw(b, ID, P([[start, 14 + wob], [start + len * 0.6, 14 - 5], [start + len, 14 + wob], [start + len * 0.6, 14 + 5]]), RED, { l: "vg", a: 0.9, b: 0.3, oc: RD[2] });
          draw(b, ID, P([[start, 14], [start + len * 0.5, 14 - 3], [start + len * 0.85, 14 + wob], [start + len * 0.5, 14 + 3]]), GOLD, { l: "vg", a: 0.95, b: 0.5, ol: false });
          draw(b, ID, E(start + len * 0.3, 14, len * 0.22, 1.4), [OR[6], OR[6]], { l: "flat", ol: false });
          for (var i = 0; i < k + 1; i++) px(b, ID, start + 4 + ((i * 7 + k * 3) % Math.max(4, len)), 8 + ((i * 5 + k) % 12), OR[5]);
        } else {
          draw(b, ID, E(start + 2, 14, 3, 2), GOLD, { l: "sph", ol: false });
        }
        if (k >= 3) for (var x = 18; x < 18 + len; x += 3) px(b, ID, x, 22, INK[3]);
      };
    })) },
    vacuum: { icon: icon(drawVacuum), hit: hit([0, 1, 2, 3].map(function (k) {
      return function (b) {
        // 소용돌이 고리(가운데로 빨려 듦)
        for (var i = 0; i < 3; i++) {
          var r = 13 - i * 4 - (k % 4), a0 = k * 0.6 + i * 1.3;
          for (var j = 0; j < 10; j++) {
            var a = a0 + j * 0.35, rr = r - j * 0.35;
            if (rr > 1) px(b, ID, Math.round(16 + Math.cos(a) * rr), Math.round(20 + Math.sin(a) * rr * 0.5), i === 0 ? rgba(PU[4], 0.9) : i === 1 ? PU[3] : CY[4]);
          }
        }
        // 빨려 드는 먼지·벌레
        [[4, 18], [27, 22], [10, 26], [24, 15]].forEach(function (p, i) {
          var tt = ((k + i) % 4) / 4, x = Math.round(p[0] + (16 - p[0]) * tt), y = Math.round(p[1] + (20 - p[1]) * tt);
          fill(b, ID, E(x, y, 1.2, 1), INK[5]); px(b, ID, x, y, SL[3]);
        });
        drawVacuum(b, TT({ ox: 14, oy: 17, px: 3.5, py: 15, sx: 1.2, sy: 1.2, r: 0.05 * (k % 2 ? 1 : -1) }));
      };
    }), 12) }
  };
  function mist(b, list, fade) {
    list.forEach(function (m) { draw(b, ID, E(m[0], m[1], m[2], m[2] * 0.8), [rgba(GR[2], fade || 0.85), rgba(GR[2], fade || 0.8), rgba(GR[3], fade || 0.75), rgba(GR[4], fade || 0.7), rgba(GR[5], fade || 0.7)], { l: "sph" }); });
  }
  function goo(b, list) {
    list.forEach(function (g) { line(b, ID, g[0], g[1] - g[2], g[0], g[1], OR[4]); px(b, ID, g[0], g[1], OR[5]); });
  }

  // ======================================================================
  // 전설 아이템 — 아이콘 16×16(금빛 반짝임 2프레임), 큰 연출 40×40
  // ======================================================================
  function k0(v) { return v; }
  function legIcon(drawFn) {
    return sprite(16, 16, 8, 8, 3, [0, 1].map(function (k) {
      return function (b) { fill(b, ID, E(8, 14.4, 5.5, 1.3), rgba(INK[0], 0.5)); drawFn(b, IT(8, 7.6, 0.88, 0)); sparkle(b, k ? 13 : 2, k ? 2 : 12); };
    }), [[[k0(2), 12, 2, OR[5], 0.3]], [[13, 2, 2, OR[5], 0.3]]]);
  }
  // 방역복 사람(정면)
  function drawSuit(b, t, k) {
    var st = k % 2;
    draw(b, t, R(4.5 - st * 0.5, 11, 2.6, 4.8), YEL, { l: "cyl" });
    draw(b, t, R(8.9 + st * 0.5, 11, 2.6, 4.8), YEL, { l: "cyl" });
    draw(b, t, R(4, 14.6 - st, 3.4, 1.6), DARKM, { l: "box" }); draw(b, t, R(8.6, 14.6 - (1 - st), 3.4, 1.6), DARKM, { l: "box" });
    draw(b, t, U(E(8, 8.6, 4.4, 3.6), R(3.8, 8.6, 8.4, 3)), YEL, { l: "sph", rim: OR[6] });
    draw(b, t, E(8, 4.5, 3.6, 3.6), YEL, { l: "sph" });
    draw(b, t, R(5.4, 3, 5.2, 2.6), CYR, { l: "cylh", oc: CY[0] });
    px(b, t, 6, 3, CY[5]);
    draw(b, t, E(8, 6.8, 1.6, 1.1), DARKM, { l: "sph" });
    draw(b, t, E(5.6, 7, 1, 1), GRN, { l: "sph", ol: false }); draw(b, t, E(10.4, 7, 1, 1), GRN, { l: "sph", ol: false });
    draw(b, t, R(11.5, 8, 4, 1.6), METAL, { l: "cylh" });
  }
  function drawBomb(b, t) {
    draw(b, t, E(8, 9.5, 5.6, 5.2), GRN, { l: "sph", rim: GR[5] });
    draw(b, t, S(E(8, 9.5, 5.6, 5.2), U(R(0, 0, 16, 8), R(0, 10.5, 16, 8))), YEL, { l: "cylh", ol: false });
    for (var x = 3; x < 14; x += 2) px(b, t, x, 9, INK[2]);
    draw(b, t, R(6.2, 3, 3.6, 2.6), METAL, { l: "cyl" });
    line(b, t, 8, 3, 9, 1, OR[2]); line(b, t, 9, 1, 11, 0, OR[2]);
    px(b, t, 12, 0, OR[6]);
  }
  TD.legends = {
    bigslipper: { icon: legIcon(function (b, t) { drawSlipper(b, IT(8, 7.6, 0.92, -0.7)); }), hit: sprite(40, 40, 20, 32, 8, [
      function (b) { fill(b, ID, E(20, 32, 5, 1.8), rgba(INK[0], 0.4)); },
      function (b) { fill(b, ID, E(20, 32, 10, 3.5), rgba(INK[0], 0.5)); speedLines(b, [[20, 0, 20, 6]]); },
      function (b) { fill(b, ID, E(20, 32, 16, 5.5), rgba(INK[0], 0.6)); drawSlipper(b, IT(20, 12, 2.0, -1.45)); speedLines(b, [[6, 2, 6, 10], [34, 2, 34, 10], [12, 0, 12, 4], [28, 0, 28, 4]]); },
      function (b) { fill(b, ID, E(20, 33, 19, 6), rgba(INK[0], 0.6)); impact(b, 20, 30, 18, OR[6]); drawSlipper(b, IT(20, 28, 2.1, -1.5, 0.62, 1.2)); puff(b, 3, 32, 3); puff(b, 37, 32, 3); },
      function (b) { fill(b, ID, E(20, 33, 19, 6), rgba(INK[0], 0.4)); drawSlipper(b, IT(20, 28, 2.1, -1.5, 0.66, 1.15)); puff(b, 2, 29, 3.4, -0.1); puff(b, 38, 29, 3.4, -0.1); sparkle(b, 8, 12); sparkle(b, 33, 14); sparkle(b, 20, 6); }
    ]) },
    exterminator: { icon: legIcon(function (b, t) { drawSuit(b, t, 0); }), hit: sprite(40, 40, 20, 36, 6, [0, 1, 2, 3].map(function (k) {
      return function (b) {
        fill(b, ID, E(20, 36, 9, 2), rgba(INK[0], 0.5));
        var bob = k % 2;
        drawSuit(b, IT(17, 22 + bob, 1.75, 0), k);
        mist(b, [[33, 21 - k, 2 + k * 0.5], [36, 17 - k, 1.6 + k * 0.4], [31, 15 - k * 2, 1.4]].slice(0, 1 + (k % 3)));
      };
    })) },
    bugbomb: { icon: legIcon(drawBomb), hit: sprite(40, 40, 20, 32, 8, [
      function (b) { fill(b, ID, E(8, 32, 4, 1.4), rgba(INK[0], 0.5)); drawBomb(b, IT(8, 26, 0.9, -0.8)); },
      function (b) { fill(b, ID, E(16, 32, 4, 1.4), rgba(INK[0], 0.5)); drawBomb(b, IT(16, 26, 0.9, 0.9)); speedLines(b, [[4, 26, 8, 26], [5, 29, 9, 29]]); },
      function (b) { fill(b, ID, E(20, 32, 4, 1.4), rgba(INK[0], 0.5)); drawBomb(b, IT(20, 26, 0.9, 0.2)); sparkle(b, 25, 18); },
      function (b) { impact(b, 20, 24, 16, OR[6]); mist(b, [[9, 28, 5], [31, 28, 5], [20, 31, 4]]); },
      function (b) { mist(b, [[8, 26, 7], [20, 20, 9], [32, 26, 7], [14, 31, 6], [27, 31, 6]], 0.75); },
      function (b) { mist(b, [[6, 24, 7.5], [20, 17, 10], [34, 24, 7.5], [13, 31, 7], [28, 31, 7]], 0.45); }
    ], [[], [], [], [[20, 24, 12, OR[5], 0.16], [20, 24, 6, OR[6], 0.4]], [[20, 24, 12, GR[4], 0.08]], []]) }
  };

  // ======================================================================
  // 탄·효과·동전·숫자
  // ======================================================================
  function beamDraw(variant) {
    var pal = variant === "A" ? { edge: RD[2], mid: RD[4], core: OR[6] } : variant === "B" ? { edge: CY[2], mid: CY[4], core: CY[5] } : { edge: PU[2], mid: PU[3], core: PU[4] };
    // k = 0(가장 굵음) → 2(사라짐). 정수 좌표 브레젠험, fillRect 만.
    return function (ctx, x0, y0, x1, y1, k) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      var steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
      function seg(off, col) {
        ctx.fillStyle = col;
        var ax = x0, ay = y0, dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
        for (;;) {
          ctx.fillRect(ax + (steep ? off : 0), ay + (steep ? 0 : off), 1, 1);
          if (ax === x1 && ay === y1) break;
          var e2 = 2 * e; if (e2 >= dy) { e += dy; ax += sx; } if (e2 <= dx) { e += dx; ay += sy; }
        }
      }
      if (k === 0) { seg(-2, rgba(pal.edge, 0.5)); seg(2, rgba(pal.edge, 0.5)); seg(-1, pal.mid); seg(1, pal.mid); seg(0, pal.core); }
      else if (k === 1) { seg(-1, rgba(pal.mid, 0.6)); seg(1, rgba(pal.mid, 0.6)); seg(0, pal.core); }
      else { seg(0, rgba(pal.mid, 0.55)); }
    };
  }
  function ringDraw(col) {
    // 린터 파동: 반지름 r(아트 px) 의 1px 계단 원 + 안쪽 점선. a = 투명도
    return function (ctx, cx, cy, r, a, phase) {
      cx = Math.round(cx); cy = Math.round(cy);
      var r0 = r - 1, n = 0;
      ctx.fillStyle = rgba(col, a == null ? 0.5 : a);
      for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) {
        var d = x * x + y * y;
        if (d <= r * r && d > r0 * r0) ctx.fillRect(cx + x, cy + y, 1, 1);
      }
      ctx.fillStyle = rgba(col, (a == null ? 0.5 : a) * 0.5);
      var ri = r - 3, steps = Math.max(8, Math.round(ri * 1.5));
      for (var i = 0; i < steps; i++) { if ((i + (phase || 0)) % 3) continue; var an = i / steps * Math.PI * 2; ctx.fillRect(cx + Math.round(Math.cos(an) * ri), cy + Math.round(Math.sin(an) * ri), 1, 1); n++; }
    };
  }

  TD.projectiles = {
    bolt: sprite(6, 6, 3, 3, 12, [
      function (b) { draw(b, ID, E(3, 3, 2.2, 2.2), CYR, { l: "sph", oc: CY[2] }); px(b, ID, 2, 2, CY[5]); },
      function (b) { draw(b, ID, E(3, 3, 1.8, 1.8), CYR, { l: "sph", oc: CY[3], v: 0.2 }); px(b, ID, 2, 2, CY[5]); }
    ], [[[3, 3, 3, CY[3], 0.3], [3, 3, 1.5, CY[5], 0.35]], [[3, 3, 2.6, CY[3], 0.3]]]),
    boltA: sprite(6, 6, 3, 3, 12, [function (b) { draw(b, ID, E(3, 3, 2.2, 2.2), GRN, { l: "sph", oc: GR[2] }); px(b, ID, 2, 2, GR[5]); }], [[[3, 3, 3, GR[3], 0.3]]]),
    boltB: sprite(6, 6, 3, 3, 12, [function (b) { draw(b, ID, E(3, 3, 2.2, 2.2), GOLD, { l: "sph", oc: OR[2] }); px(b, ID, 2, 2, OR[6]); }], [[[3, 3, 3, OR[4], 0.3]]]),
    shell: sprite(8, 8, 4, 4, 10, [0, 1].map(function (k) {
      return function (b) { draw(b, ID, E(4, 4, 3, 3), PINK, { l: "sph" }); px(b, ID, k ? 5 : 3, k ? 3 : 5, PK[1]); px(b, ID, 3, 2, RD[5]); };
    }), [[[4, 4, 4, PK[3], 0.2]], [[4, 4, 4, PK[3], 0.2]]]),
    shellShadow: sprite(6, 3, 3, 1, 1, [function (b) { fill(b, ID, E(3, 1.5, 3, 1.2), rgba(INK[0], 0.5)); }]),
    beam: {
      note: "review 탄은 선(0.12 s). drawBeam[look](ctx, x0, y0, x1, y1, k) — k 0·1·2 를 40 ms 씩. 갈래 A 빨강, B 청록, 나머지 보라",
      colors: { base: { edge: PU[2], mid: PU[3], core: PU[4] }, A: { edge: RD[2], mid: RD[4], core: OR[6] }, B: { edge: CY[2], mid: CY[4], core: CY[5] } },
      draw: { base: beamDraw("base"), A: beamDraw("A"), B: beamDraw("B") }
    },
    lintWave: {
      note: "린터 오라: drawRing(ctx, cx, cy, r, a, phase). r 은 사거리 px, a 는 0.25–0.45 로 숨쉬기, phase 는 정수로 돌려 점선이 흐르게. 갈래별 색 base/A/B",
      draw: { base: ringDraw(OR[5]), A: ringDraw(RD[4]), B: ringDraw(GR[4]) }
    },
    spark: sprite(12, 12, 6, 6, 20, [
      function (b) { fill(b, ID, E(6, 6, 2, 2), OR[6]); },
      function (b) { fill(b, ID, star(6, 6, 5, 1.4, 4, 0), OR[5]); fill(b, ID, E(6, 6, 1.4, 1.4), OR[6]); },
      function (b) { fill(b, ID, star(6, 6, 5.5, 1, 4, Math.PI / 4), OR[4]); px(b, ID, 5, 5, OR[6]); },
      function (b) { pxs(b, ID, [[1, 1], [10, 1], [1, 10], [10, 10], [5, 0], [6, 11]], OR[3]); }
    ], [[[6, 6, 4, OR[5], 0.35]], [[6, 6, 5, OR[4], 0.3]], [[6, 6, 4, OR[3], 0.2]], []]),
    explosion: sprite(24, 24, 12, 12, 16, [
      function (b) { draw(b, ID, E(12, 12, 4, 4), YEL, { l: "sph", ol: false }); fill(b, ID, E(11.5, 11.5, 2, 2), OR[6]); },
      function (b) { draw(b, ID, E(12, 12, 7.5, 7.5), PINK, { l: "sph", oc: PK[2] }); draw(b, ID, E(11.5, 11.5, 4.5, 4.5), YEL, { l: "sph", ol: false }); },
      function (b) { fill(b, ID, S(E(12, 12, 9.5, 9.5), E(12, 12, 7, 7)), PK[3]); fill(b, ID, S(E(12, 12, 7, 7), E(12, 12, 6, 6)), PK[4]); draw(b, ID, E(12, 12, 3.5, 3.5), YEL, { l: "sph", ol: false, v: -0.2 });
        pxs(b, ID, [[3, 6], [20, 5], [4, 18], [19, 19], [12, 1], [12, 22]], OR[5]); },
      function (b) { fill(b, ID, S(E(12, 12, 11.5, 11.5), E(12, 12, 10, 10)), PK[2]); pxs(b, ID, [[1, 5], [22, 4], [2, 19], [21, 20], [12, 0], [12, 23], [6, 2], [18, 22]], OR[4]);
        puff(b, 9, 13, 2.2, -0.2); puff(b, 15, 11, 2, -0.2); },
      function (b) { fill(b, ID, S(E(12, 12, 12, 12), E(12, 12, 11, 11)), rgba(PK[2], 0.5)); puff(b, 8, 12, 2, -0.35); puff(b, 16, 10, 1.6, -0.35); pxs(b, ID, [[0, 4], [23, 3]], OR[3]); }
    ], [[[12, 12, 7, OR[5], 0.45], [12, 12, 4, OR[6], 0.5]], [[12, 12, 10, PK[3], 0.3], [12, 12, 5, OR[5], 0.4]], [[12, 12, 11, PK[3], 0.22]], [[12, 12, 12, PK[2], 0.12]], []]),
    coin: sprite(8, 8, 4, 4, 8, [3.5, 2.6, 1, 2.6].map(function (rx, k) {
      return function (b) {
        draw(b, ID, E(4, 4, rx, 3.5), GOLD, { l: "sph", oc: OR[1], hi: 6 });
        if (k === 0) { pxs(b, ID, [[4, 2], [4, 3], [4, 4], [4, 5]], OR[3]); pxs(b, ID, [[3, 2], [3, 3]], OR[6]); }
        if (k === 1) pxs(b, ID, [[3, 3], [3, 4]], OR[3]);
      };
    }), [[[4, 4, 4, OR[4], 0.18]], [[4, 4, 4, OR[4], 0.15]], [[4, 4, 3, OR[4], 0.1]], [[4, 4, 4, OR[4], 0.15]]])
  };

  var GLY = {
    "0": ["111", "101", "101", "101", "111"], "1": ["010", "110", "010", "010", "111"], "2": ["111", "001", "111", "100", "111"],
    "3": ["111", "001", "011", "001", "111"], "4": ["101", "101", "111", "001", "001"], "5": ["111", "100", "111", "001", "111"],
    "6": ["111", "100", "111", "101", "111"], "7": ["111", "001", "010", "010", "010"], "8": ["111", "101", "111", "101", "111"],
    "9": ["111", "101", "111", "001", "111"], "+": ["000", "010", "111", "010", "000"], "-": ["000", "000", "111", "000", "000"]
  };
  GLY["−"] = GLY["-"];
  TD.digits = {
    w: 3, h: 5, gap: 1, glyphs: GLY,
    colors: { coin: [OR[5], OR[2]], dmg: [SL[5], INK[1]], leak: [RD[4], RD[0]], heal: [GR[4], GR[0]] },
    // 글자 아래·오른쪽 1px 그림자. 반환값 = 그린 폭
    draw: function (ctx, str, x, y, col, shadow) {
      x = Math.round(x); y = Math.round(y);
      var cx = x;
      for (var i = 0; i < str.length; i++) {
        var g = GLY[str[i]]; if (!g) { cx += 2; continue; }
        for (var pass = shadow ? 0 : 1; pass < 2; pass++) {
          ctx.fillStyle = pass ? col : shadow;
          for (var r = 0; r < 5; r++) for (var c = 0; c < 3; c++) if (g[r][c] === "1") ctx.fillRect(cx + c + (pass ? 0 : 1), y + r + (pass ? 0 : 1), 1, 1);
        }
        cx += 4;
      }
      return cx - x - 1;
    }
  };

  TD.palette = { INK: INK, SL: SL, OR: OR, RD: RD, PK: PK, GR: GR, CY: CY, PU: PU };
})(window.TDArt);
