// @ts-nocheck — 디자인 세션 정본 docs/lab-surv-pocha-3d.js 를 그대로 옮긴 것(tmp/lab-surv/sync-src.sh).
/* 포장마차 사수 3D — 로우폴리 모델 (1판, 2026-10-28)
 * 고전 스크립트: window.Pocha3D = { build(THREE, Surv3D) → api }. Surv3D 는 window.Surv3D.build(THREE) 의 결과(blobTexture 재사용).
 * 좌표: 월드 단위 그대로. 규칙 x → three x, 규칙 y → three z, 높이 = three y, 바닥 y = 0, 월드 0..540. 원점 = 발밑 중앙, +z 가 앞.
 * 가게는 월드 가운데(270, 270)에 놓는다고 보고 앞(계산대)이 +z(카메라 쪽)를 본다.
 * 색은 docs/lab-surv-coco-hd-artdir.md 3절 표 + docs/lab-surv-pocha-3d-artdir.md 3절 「이 게임 몫」 표의 hex 만 쓴다.
 * 크기는 규칙 파일 docs/lab-surv-pocha.js 의 반경(🔴 코드가 맞다)에 맞췄다: 지름 ≈ 반경 × 2 × 1.25.
 */
(function () {
  "use strict";

  var C = {
    // HD 3절 표에서
    ink0: "#24161d", ink1: "#3a2228", ink2: "#5a3a42", shine0: "#fff6e8", shine1: "#fffbf4",
    tongue0: "#d9546a", tongue1: "#f07a8a", blush: "#ffb3bd",
    skin0: "#d98a5a", skin: "#f2b98a", fur1: "#8e4526",
    cream0: "#c9a27a", cream1: "#e8c9a0", cream2: "#f6e3c4", cream3: "#fff4e3",
    teal0: "#1f8f86", teal1: "#2fb5a8", teal2: "#7fe0d4",
    purp0: "#6a3fb8", purp1: "#8b5cd6", purp2: "#b99af0",
    flY: "#ffd166", flP: "#ff8fb1", flB: "#8fd3ff",
    tee0: "#d9d2c6", tee1: "#efe8dc", tee2: "#f8f4ec",
    g0: "#2f7d4a", g1: "#47a35a", g2: "#6cc46a",
    p0: "#b98d5e", p1: "#d9b27f", p2: "#ecd3a6", p3: "#f7e8c8",
    wood0: "#7a4a2a", wood1: "#a8693e",
    su0: "#9ec9ee", su1: "#cfe8fb", su2: "#eef8ff",
    be0: "#a8742a", be1: "#e0a640", be2: "#ffcf4d", be3: "#ffe9a3", btn0: "#c43a48", btn1: "#ff5d5d",
    va0: "#3b4290", va1: "#4a54b0", va2: "#6c7ae0", rub: "#2c2a3a",
    dg0: "#7d8292", dg1: "#a7acba", dg2: "#cfd3dc", dg3: "#eceef3",
    bo0: "#3e4260", bo1: "#5a5f7a", bo2: "#8a90ad", tub0: "#cdd6e4", tub1: "#f3f6fb", cr0: "#9aa6bd", cr1: "#dfe6f2",
    night0: "#2a2858", night1: "#3d3a7a", morning: "#bfe6ff", lamp: "#ffd36b", glow: "#fff0b8", water: "#7fd4ff",
    // 이 게임 몫(아트 디렉션 3절 둘째 표)
    tarp0: "#c95a2a", tarp1: "#f2803a", tarp2: "#ffa55c",
    asph0: "#1f2334", asph1: "#2b3044", pud0: "#3f4a68", pud1: "#5b6a8f", glint: "#e8a860",
  };

  function build(THREE, Surv3D) {
    var V3 = THREE.Vector3, TAU = Math.PI * 2;
    var GEO = {
      ico0: new THREE.IcosahedronGeometry(1, 0), ico1: new THREE.IcosahedronGeometry(1, 1), ico2: new THREE.IcosahedronGeometry(1, 2),
      box: new THREE.BoxGeometry(1, 1, 1),
    };
    function ball(w, h) { return new THREE.SphereGeometry(1, w, h); }
    function cyl(rt, rb, h, seg) { return new THREE.CylinderGeometry(rt, rb, h, seg || 8, 1); }
    function cone(r, h, seg, open) { return new THREE.ConeGeometry(r, h, seg || 6, 1, !!open); }
    function torus(r, t, rs, ts, arc) { return new THREE.TorusGeometry(r, t, rs || 3, ts || 8, arc || TAU); }
    function triCount(g) { return (g.index ? g.index.count : g.attributes.position.count) / 3; }
    function starGeo(r, depth) {
      var s = new THREE.Shape();
      for (var i = 0; i < 10; i++) { var a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      var g = new THREE.ExtrudeGeometry(s, { depth: depth, bevelEnabled: false, curveSegments: 1 });
      g.translate(0, 0, -depth / 2);
      return g;
    }
    // 앞뒷면 둘 다(뒤집힌 우산 안쪽이 위에서 보이게) — 삼각형을 뒤집어 한 벌 더
    function dbl(geo) {
      var g = geo.index ? geo.toNonIndexed() : geo.clone(), p = g.attributes.position.array, n = g.attributes.normal.array;
      var P = new Float32Array(p.length * 2), N = new Float32Array(n.length * 2);
      P.set(p); N.set(n);
      for (var i = 0; i < p.length; i += 9) for (var k = 0; k < 3; k++) {
        var src = i + [0, 2, 1][k] * 3, dst = p.length + i + k * 3;
        for (var c = 0; c < 3; c++) { P[dst + c] = p[src + c]; N[dst + c] = -n[src + c]; }
      }
      var out = new THREE.BufferGeometry();
      out.setAttribute("position", new THREE.BufferAttribute(P, 3)); out.setAttribute("normal", new THREE.BufferAttribute(N, 3));
      return out;
    }

    // 정점 색 부품 · 합치기. hex 는 색 하나 또는 function(삼각형 중심 x, y, z — 놓기 전 지역 좌표) → 색
    var _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), UP = new V3(0, 1, 0);
    var _cc = {}; function col(h) { return _cc[h] || (_cc[h] = new THREE.Color(h)); }
    function part(geo, hex, pos, scl, rot) {
      var g = geo.index ? geo.toNonIndexed() : geo.clone();
      if (g.attributes.uv) g.deleteAttribute("uv");
      var n = g.attributes.position.count, cl = new Float32Array(n * 3), pa = g.attributes.position.array;
      for (var i = 0; i < n; i += 3) {
        var c = typeof hex === "function" ? col(hex((pa[i * 3] + pa[i * 3 + 3] + pa[i * 3 + 6]) / 3, (pa[i * 3 + 1] + pa[i * 3 + 4] + pa[i * 3 + 7]) / 3, (pa[i * 3 + 2] + pa[i * 3 + 5] + pa[i * 3 + 8]) / 3)) : col(hex);
        for (var k = 0; k < 3; k++) { cl[(i + k) * 3] = c.r; cl[(i + k) * 3 + 1] = c.g; cl[(i + k) * 3 + 2] = c.b; }
      }
      g.setAttribute("color", new THREE.BufferAttribute(cl, 3));
      if (rot && rot.isQuaternion) _q.copy(rot); else { _e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0); _q.setFromEuler(_e); }
      var s = scl == null ? [1, 1, 1] : typeof scl === "number" ? [scl, scl, scl] : scl;
      _m.compose(new V3(pos[0], pos[1], pos[2]), _q, new V3(s[0], s[1], s[2]));
      g.applyMatrix4(_m);
      return g;
    }
    // a → b 막대(원기둥). r0 은 a 쪽, r1 은 b 쪽 반경
    function seg(hex, a, b, r0, r1, sides) {
      var d = new V3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(); d.normalize();
      var q = new THREE.Quaternion().setFromUnitVectors(UP, d);
      return part(cyl(r1 == null ? r0 : r1, r0, len, sides || 6), hex, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], 1, q);
    }
    // 부품 묶음 전체를 옮긴다(회전·배율·이동 순)
    var _m2 = new THREE.Matrix4();
    function xf(list, pos, rot, scl) {
      _e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0); _q.setFromEuler(_e);
      var s = scl == null ? 1 : scl;
      _m2.compose(new V3(pos ? pos[0] : 0, pos ? pos[1] : 0, pos ? pos[2] : 0), _q, typeof s === "number" ? new V3(s, s, s) : new V3(s[0], s[1], s[2]));
      for (var i = 0; i < list.length; i++) list[i].applyMatrix4(_m2);
      return list;
    }
    function merge(parts) {
      var total = 0, i;
      for (i = 0; i < parts.length; i++) total += parts[i].attributes.position.count;
      var pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), cl = new Float32Array(total * 3), o = 0;
      for (i = 0; i < parts.length; i++) {
        var g = parts[i], n = g.attributes.position.count;
        pos.set(g.attributes.position.array, o * 3);
        if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
        cl.set(g.attributes.color.array, o * 3);
        o += n; g.dispose();
      }
      var out = new THREE.BufferGeometry();
      out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      out.setAttribute("color", new THREE.BufferAttribute(cl, 3));
      out.computeBoundingSphere(); out.computeBoundingBox();
      return out;
    }
    function cache(table, alias, label) {
      var memo = {};
      return function (kind) {
        kind = (alias && alias[kind]) || kind;
        if (memo[kind]) return memo[kind];
        var f = table[kind]; if (!f) throw new Error("Pocha3D " + label + ": " + kind);
        var g = merge(f());
        return (memo[kind] = { geometry: g, tris: triCount(g), height: g.boundingBox.max.y });
      };
    }
    function stripes(a, b, k, off) { // 우산 살마다 번갈아(지역 좌표 각도)
      return function (x, y, z) { var s = Math.floor(((Math.atan2(x, z) + Math.PI) / TAU) * k + (off || 0)); return s % 2 ? a : b; };
    }

    // ══ 얼굴(사람 공용) ══════════════════════════════════════
    // 머리 지역 좌표(가운데 0, 반경 R, +z 앞)로 만들고 xf 로 기울여 놓는다. face: smile·happy(취객 ^^)·shock·sing·eat
    function headParts(R, o) {
      var h = [];
      h.push(part(ball(6, 5), o.skin || C.skin, [0, 0, 0], [R * 1.03, R, R]));
      h.push(part(ball(6, 4), o.hair || C.ink1, [0, R * 0.3, -R * 0.2], [R * 1.08, R * 0.86, R * 1.02]));
      if (o.bangs !== false) h.push(part(GEO.box, o.hair || C.ink1, [0, R * 0.62, R * 0.62], [R * 0.75, R * 0.32, R * 0.4], [0.4, 0, 0]));
      var ez = R * 0.9, ey = -R * 0.04, gx = R * 0.38, er = R * 0.19;
      if (o.face === "happy" || o.face === "sing" || o.face === "eat") { // ^ ^ 감은 눈
        [1, -1].forEach(function (s) {
          h.push(part(GEO.box, C.ink0, [s * gx - er * 0.45, ey + er * 0.2, ez], [er * 1.2, er * 0.42, er * 0.5], [0, 0, 0.6]));
          h.push(part(GEO.box, C.ink0, [s * gx + er * 0.45, ey + er * 0.2, ez], [er * 1.2, er * 0.42, er * 0.5], [0, 0, -0.6]));
        });
      } else if (o.face === "shock") { // 동그란 흰자 + 작은 눈동자
        [1, -1].forEach(function (s) {
          h.push(part(GEO.ico0, C.shine1, [s * gx, ey + er * 0.3, ez - er * 0.3], [er * 1.25, er * 1.4, er * 0.7]));
          h.push(part(GEO.ico0, C.ink0, [s * gx, ey + er * 0.3, ez + er * 0.35], er * 0.5));
        });
      } else {
        [1, -1].forEach(function (s) {
          h.push(part(GEO.ico0, C.ink0, [s * gx, ey, ez - er * 0.2], [er, er * 1.3, er * 0.6]));
          h.push(part(GEO.box, C.shine1, [s * gx - er * 0.3, ey + er * 0.45, ez + er * 0.3], er * 0.5));
        });
      }
      var cheek = o.cheek || C.blush, cs = o.cheekS || 1;
      [1, -1].forEach(function (s) { h.push(part(GEO.box, cheek, [s * R * 0.62, -R * 0.3, R * 0.7], [R * 0.4 * cs, R * 0.22 * cs, R * 0.14], [0, s * 0.7, 0])); });
      if (o.nose) h.push(part(GEO.ico0, o.nose, [0, -R * 0.14, R * 1.0], R * 0.17));
      var my = -R * 0.5, mz = R * 0.86;
      if (o.face === "shock" || o.face === "sing") { // 동그랗게 벌린 입
        h.push(part(GEO.ico0, C.ink1, [0, my, mz], [R * 0.2, R * (o.face === "sing" ? 0.26 : 0.2), R * 0.12]));
        h.push(part(GEO.ico0, C.tongue1, [0, my - R * 0.1, mz + R * 0.06], [R * 0.12, R * 0.07, R * 0.06]));
      } else if (o.face === "happy") { // 벌린 웃음 + 혀
        h.push(part(ball(6, 3), C.ink1, [0, my, mz], [R * 0.3, R * 0.16, R * 0.1]));
        h.push(part(GEO.ico0, C.tongue1, [0, my - R * 0.06, mz + R * 0.05], [R * 0.16, R * 0.08, R * 0.05]));
      } else { // 웃는 반달
        h.push(part(torus(R * 0.2, R * 0.06, 3, 4, Math.PI), C.ink1, [0, my + R * 0.12, mz + R * 0.02], 1, [0, 0, Math.PI]));
      }
      return h;
    }

    // ══ 우산(손잡이 바닥이 원점, 살대 길이 L, 덮개 반경 r) ═══════════
    function umbrellaParts(r, L, colA, colB, rim) {
      var u = [];
      u.push(seg(C.ink2, [0, 0, 0], [0, L + 0.6, 0], 0.28, 0.28, 4));
      u.push(part(torus(0.8, 0.3, 3, 3, Math.PI), C.ink2, [0.8, 0, 0], 1, [0, 0, Math.PI])); // 굽은 손잡이
      u.push(part(dbl(cone(r, r * 0.36, 10, true)), stripes(colA, colB, 10), [0, L - r * 0.08, 0]));
      u.push(part(torus(r, r * 0.06, 3, 10), rim, [0, L - r * 0.26, 0], 1, [Math.PI / 2, 0, 0])); // 따뜻한 빛 테
      u.push(part(cone(r * 0.1, r * 0.2, 4), C.be1, [0, L + r * 0.16, 0]));
      return u;
    }

    // ══ 사람(손님·취객 공용) — 서 있는 몸. o.feet: 발 위치 둘, o.hands: 손 위치 둘, 머리는 headParts ══
    function personParts(o) {
      var p = [], hipY = o.hipY || 4.4, sh = hipY + 4.0, hs = o.hs || 1, R = 3.3 * hs;
      var feet = o.feet || [[1.3, 0, 0.2], [-1.3, 0, -0.2]];
      feet.forEach(function (f, i) {
        var hx = i ? -1.1 : 1.1;
        if (o.knees) { var k = o.knees[i]; p.push(seg(o.pants, [hx, hipY, 0], k, 1.0, 0.9, 4)); p.push(seg(o.pants, k, [f[0], f[1] + 0.8, f[2]], 0.9, 0.85, 4)); }
        else p.push(seg(o.pants, [hx, hipY, 0], [f[0], f[1] + 0.8, f[2]], 1.0, 0.85, 4));
        p.push(part(GEO.box, o.shoe || C.ink1, [f[0], f[1] + 0.55, f[2] + 0.5], [1.7, 1.1, 2.5]));
      });
      p.push(part(ball(6, 3), o.coat, [0, hipY + 2.15, 0], [2.5 * (o.belly || 1), 2.9, 1.95 * (o.belly || 1)]));
      if (o.coat2) p.push(part(GEO.box, o.coat2, [0, hipY + 2.4, 1.75 * (o.belly || 1)], [1.6, 3.6, 0.5]));
      var hands = o.hands || [[2.6, hipY + 0.6, 0.6], [-2.6, hipY + 0.6, 0.6]];
      hands.forEach(function (h, i) {
        var s = i ? -1 : 1;
        p.push(seg(o.sleeve || o.coat, [s * 2.1, sh - 0.6, 0], h, 0.8, 0.7, 4));
        p.push(part(GEO.box, o.skin || C.skin, h, 1.3));
      });
      var hd = headParts(R, o);
      if (o.headX) o.headX(hd, R);
      xf(hd, [o.headDX || 0, sh + R * 0.85, 0.3], [o.pitch == null ? -0.3 : o.pitch, o.yaw || 0, o.roll || 0]);
      return p.concat(hd);
    }

    // ══ 붉은 플라스틱 의자(앉은 자리 높이 4.1) ═════════════════
    function stoolParts(x, z, s) {
      s = s || 1;
      return xf([
        part(cyl(2.35, 2.85, 3.6, 8), C.btn0, [0, 1.8, 0]),
        part(cyl(2.75, 2.6, 0.5, 10), C.btn1, [0, 3.85, 0]),
        part(GEO.box, C.night0, [0, 1.3, 2.4], [1.2, 1.3, 0.3], [-0.12, 0, 0]), // 다리 사이 구멍(정면)
        part(GEO.box, C.night0, [0, 1.3, -2.4], [1.2, 1.3, 0.3], [0.12, 0, 0]),
        part(GEO.box, C.night0, [2.4, 1.3, 0], [0.3, 1.3, 1.2], [0, 0, 0.12]),
        part(GEO.box, C.night0, [-2.4, 1.3, 0], [0.3, 1.3, 1.2], [0, 0, -0.12]),
      ], [x, 0, z], null, s);
    }

    // ══ 포차 막내(주인공) ══════════════════════════════════════
    // 키 약 22(머리띠 포함). 수건 머리띠·청록 앞치마·빨간 장화·오른손 국자. 머리는 몸보다 크게(2등신 반).
    var HIP_Y = 6.6, HEAD_PITCH = -0.3;
    function makeHero() {
      var mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
      var fxMat = new THREE.MeshBasicMaterial({ color: C.cream3, transparent: true, opacity: 0.7, depthWrite: false });
      function G(name, parent, p) { var g = new THREE.Group(); g.name = name; if (p) g.position.set(p[0], p[1], p[2]); parent.add(g); return g; }
      function M(parent, parts, name) { var m = new THREE.Mesh(merge(parts), mat); m.name = name || ""; m.castShadow = true; parent.add(m); return m; }
      var root = new THREE.Group(); root.name = "pochaHero";
      var rig = G("rig", root), hip = G("hip", rig, [0, HIP_Y, 0]);
      // 골반·다리(허벅지 → 무릎 → 장화)
      M(hip, [part(GEO.ico1, C.va1, [0, 0.5, 0], [2.4, 1.5, 1.8])], "pelvis");
      function leg(sx) {
        var th = G("thigh", hip, [sx * 1.25, 0, 0]);
        M(th, [seg(C.va1, [0, 0.2, 0], [0, -3.0, 0], 1.15, 1.05, 7)]);
        var kn = G("knee", th, [0, -3.0, 0]);
        M(kn, [
          seg(C.btn0, [0, 0, 0], [0, -3.1, 0], 1.25, 1.3, 8),
          part(torus(1.3, 0.32, 3, 9), C.btn1, [0, -0.15, 0], 1, [Math.PI / 2, 0, 0]),
          part(GEO.ico1, C.btn0, [0, -3.15, 0.55], [1.35, 0.6, 1.85]),
          part(GEO.box, C.rub, [0, -3.5, 0.45], [2.3, 0.25, 3.3]),
        ]);
        return { th: th, kn: kn };
      }
      var LL = leg(1), LR = leg(-1);
      // 가슴(숨쉬기·기울기) — 셔츠·앞치마·목
      var chest = G("chest", hip, [0, 0.4, 0]);
      M(chest, [
        part(GEO.ico1, C.va2, [0, 3.0, 0], [3.0, 3.1, 2.3]),
        part(GEO.box, C.teal1, [0, 1.8, 2.05], [5.0, 5.2, 0.5], [-0.1, 0, 0]), // 앞치마 아랫단
        part(GEO.box, C.teal1, [0, 4.6, 2.0], [3.2, 2.4, 0.45], [0.08, 0, 0]), // 가슴받이
        part(GEO.box, C.teal2, [0, 1.4, 2.4], [2.4, 1.2, 0.3], [-0.1, 0, 0]), // 주머니
        part(GEO.box, C.teal0, [1.45, 5.0, 0.4], [0.5, 0.4, 3.6], [0.3, 0, 0.25]), // 어깨끈
        part(GEO.box, C.teal0, [-1.45, 5.0, 0.4], [0.5, 0.4, 3.6], [0.3, 0, -0.25]),
        part(GEO.box, C.tee2, [0, 1.2, -2.3], [1.4, 0.6, 0.6]), // 등 뒤 끈 매듭
        part(cyl(1.1, 1.3, 1.4, 7), C.skin, [0, 6.3, 0]), // 목
      ], "torso");
      // 팔(어깨가 축) — 반소매 + 팔뚝 + 손
      function arm(sx) {
        var sh = G("shoulder", chest, [sx * 3.0, 5.0, 0]);
        M(sh, [
          part(GEO.ico1, C.va2, [0, -0.4, 0], 1.25),
          seg(C.va2, [0, -0.3, 0], [0, -2.2, 0], 1.05, 0.95, 6),
          seg(C.skin, [0, -2.2, 0], [0, -4.3, 0], 0.78, 0.72, 6),
          part(GEO.ico1, C.skin, [0, -4.8, 0.1], 1.0),
        ]);
        return sh;
      }
      var armL = arm(1), armR = arm(-1);
      // 국자(오른손): 손잡이가 위로, 끝에 오목한 국자(위에서 은빛 동그라미)
      var ladle = G("ladle", armR, [0, -4.8, 0.2]);
      M(ladle, [
        seg(C.dg1, [0, -0.4, -0.2], [0, 6.2, 3.2], 0.32, 0.32, 5),
        part(new THREE.SphereGeometry(1.9, 9, 4, 0, TAU, Math.PI / 2, Math.PI / 2), C.dg2, [0, 7.0, 3.6]),
        part(cyl(1.75, 1.75, 0.15, 9), C.dg0, [0, 6.95, 3.6]),
        part(GEO.ico0, C.wood1, [0, -0.6, -0.3], [0.55, 0.9, 0.55]),
      ], "ladleMesh");
      // 목 → 머리. 머리 가운데 = 목 위 4.1. 머리 반경 4.5(몸 폭 6 보다 크게)
      var neck = G("neck", chest, [0, 6.6, 0]);
      var head = G("head", neck, [0, 0, 0]);
      var HR = 4.5, HC = [0, 4.1, 0.2];
      var hp = [
        part(GEO.ico2, C.skin, HC, [HR * 1.04, HR * 0.97, HR]),
        part(GEO.ico1, C.ink1, [0, HC[1] + 1.35, -0.75], [HR * 1.07, HR * 0.8, HR * 1.04]), // 머리카락 덮개(뒤·위)
        part(GEO.ico0, C.ink1, [1.8, HC[1] + 3.1, 3.0], [1.6, 0.9, 1.3], [0.5, 0, -0.3]), // 앞머리
        part(GEO.ico0, C.ink1, [-1.6, HC[1] + 3.2, 3.1], [1.7, 0.9, 1.3], [0.5, 0, 0.3]),
        part(GEO.ico0, C.ink1, [0.1, HC[1] + 3.5, 3.3], [1.3, 0.8, 1.0], [0.5, 0, 0]),
        part(cone(0.9, 2.2, 4), C.ink1, [0.6, HC[1] + 5.3, -0.4], 1, [-0.3, 0, -0.3]), // 삐친 머리
        part(cone(0.8, 1.8, 4), C.ink1, [-1.0, HC[1] + 5.0, -1.4], 1, [-0.5, 0, 0.4]),
        // 수건 머리띠: 흰 고리 + 줄무늬 한 줄 + 뒤 매듭과 꼬리
        part(torus(HR * 1.02, 0.85, 4, 16), C.tee2, [0, HC[1] + 2.0, -0.1], 1, [Math.PI / 2 - 0.12, 0, 0]),
        part(torus(HR * 1.05, 0.3, 3, 16), C.teal2, [0, HC[1] + 2.0, -0.1], 1, [Math.PI / 2 - 0.12, 0, 0]),
        part(GEO.ico1, C.tee2, [0, HC[1] + 2.5, -4.6], [1.3, 1.1, 0.9]),
        part(GEO.box, C.tee1, [0.9, HC[1] + 1.2, -5.0], [1.0, 2.6, 0.4], [0.4, 0, -0.35]),
        part(GEO.box, C.tee1, [-0.9, HC[1] + 1.3, -5.0], [1.0, 2.4, 0.4], [0.4, 0, 0.4]),
        // 귀·볼·코·입
        part(GEO.ico0, C.skin, [HR * 1.0, HC[1] - 0.2, 0.2], [0.8, 1.1, 0.6]),
        part(GEO.ico0, C.skin, [-HR * 1.0, HC[1] - 0.2, 0.2], [0.8, 1.1, 0.6]),
        part(GEO.ico0, C.blush, [2.75, HC[1] - 1.2, 3.35], [1.0, 0.6, 0.4], [0, 0.7, 0]),
        part(GEO.ico0, C.blush, [-2.75, HC[1] - 1.2, 3.35], [1.0, 0.6, 0.4], [0, -0.7, 0]),
        part(GEO.ico0, C.skin0, [0, HC[1] - 0.6, 4.6], [0.55, 0.45, 0.45]),
        part(torus(0.85, 0.26, 3, 6, Math.PI), C.ink1, [0, HC[1] - 1.75, 4.25], 1, [0.25, 0, Math.PI]),
      ];
      M(head, hp, "headMesh");
      // 눈은 따로(깜빡임·감은 눈)
      var eyeG = G("eyes", head, [0, HC[1] + 0.25, 0]);
      var eyes = M(eyeG, [
        part(GEO.ico1, C.ink0, [1.6, 0, 3.75], [0.85, 1.2, 0.6]), part(GEO.ico1, C.ink0, [-1.6, 0, 3.75], [0.85, 1.2, 0.6]),
        part(GEO.ico0, C.shine1, [1.3, 0.45, 4.35], 0.38), part(GEO.ico0, C.shine1, [-1.9, 0.45, 4.35], 0.38),
      ], "eyesMesh");
      // 「졌다」: 의자 + 한숨 김 + 땀방울
      var stool = M(root, stoolParts(0, -0.4, 0.86), "stool"); stool.visible = false;
      var sigh = new THREE.Mesh(merge([part(GEO.ico1, C.cream3, [0, 0, 0], 1), part(GEO.ico0, C.cream3, [1.1, 0.4, 0.5], 0.6), part(GEO.ico0, C.cream3, [-1.0, 0.2, 0.6], 0.5)]), fxMat);
      sigh.name = "sigh"; sigh.visible = false; head.add(sigh);
      var drop = M(head, [part(ball(5, 3), C.flB, [0, 0, 0], [0.7, 1.0, 0.7]), part(cone(0.62, 1.1, 5), C.flB, [0, 0.95, 0])], "sweat"); drop.position.set(4.6, HC[1] + 2.4, 1.0); drop.visible = false;

      function pose(t, name, poseT, o) {
        o = o || {};
        var sp = o.speed == null ? 1 : Math.max(0, Math.min(1, o.speed)), red = !!o.reduce, hurt = o.hurt === true ? 1 : +o.hurt || 0;
        var pT = poseT == null ? 1 : poseT;
        rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); rig.scale.set(1, 1, 1);
        hip.position.set(0, HIP_Y, 0); hip.rotation.set(0, 0, 0);
        chest.rotation.set(0, 0, 0); chest.scale.set(1, 1, 1);
        neck.rotation.set(0, 0, 0); head.rotation.set(HEAD_PITCH, 0, 0);
        LL.th.rotation.set(0, 0, 0); LR.th.rotation.set(0, 0, 0); LL.kn.rotation.set(0, 0, 0); LR.kn.rotation.set(0, 0, 0);
        armL.rotation.set(0, 0, 0.12); armR.rotation.set(-0.55, 0, -0.12); ladle.rotation.set(0, 0, 0);
        stool.visible = false; sigh.visible = false; drop.visible = false;
        var blink = !red && (((t + 1.1) % 3.7) < 0.12 || ((t + 0.4) % 5.9) < 0.1);
        eyeG.scale.set(1, blink ? 0.15 : 1, 1);
        switch (name) {
          case "walk": {
            var f = 1.5 + 2.3 * sp, ph = TAU * f * t, A = 0.6 * (0.3 + 0.7 * sp), s = Math.sin(ph);
            LL.th.rotation.x = A * s; LR.th.rotation.x = -A * s;
            LL.kn.rotation.x = 0.7 * Math.max(0, s) * A * 1.6; LR.kn.rotation.x = 0.7 * Math.max(0, -s) * A * 1.6;
            armL.rotation.x = -0.55 * A * s; armR.rotation.x = -0.55 + 0.25 * A * s;
            if (!red) rig.position.y = Math.abs(Math.cos(ph)) * 0.9 * sp;
            chest.rotation.x = 0.08 * sp; head.rotation.x = HEAD_PITCH - 0.06 * sp;
            chest.rotation.y = 0.08 * s * sp;
            break;
          }
          case "lost": {
            stool.visible = true;
            hip.position.y = 4.0; hip.position.z = -0.3;
            LL.th.rotation.x = LR.th.rotation.x = -1.45; LL.kn.rotation.x = LR.kn.rotation.x = 1.45;
            LL.th.rotation.z = 0.12; LR.th.rotation.z = -0.12;
            chest.rotation.x = 0.3; neck.rotation.x = 0.22; head.rotation.x = -0.05; // 고개 푹(얼굴은 반쯤 보이게)
            armL.rotation.set(-0.95, 0, 0.3); armR.rotation.set(-0.95, 0, -0.3); ladle.rotation.x = 1.2; // 국자는 무릎 위로 축
            var cyc = red ? 0.5 : (pT % 2.6) / 2.6; // 한숨: 2.6초마다 입에서 김이 아래·앞으로 퍼진다
            if (cyc < 0.7) {
              var k = cyc / 0.7; sigh.visible = true;
              sigh.position.set(0, HC[1] - 2.2 - 1.6 * k, 5.0 + 3.0 * k); sigh.scale.setScalar(0.5 + 1.3 * k);
              fxMat.opacity = 0.75 * (1 - k);
            }
            if (!red) { chest.scale.y = 1 - 0.05 * Math.max(0, Math.sin(cyc * Math.PI * 1.4)); }
            drop.visible = true;
            eyeG.scale.set(1, 0.18, 1); // 감은 눈
            break;
          }
          default: { // idle: 숨쉬기 + 국자 살랑
            if (!red) { chest.scale.y = 1 + 0.025 * Math.sin(TAU * 0.45 * t); armR.rotation.x = -0.55 + 0.06 * Math.sin(TAU * 0.45 * t + 0.6); head.rotation.z = 0.04 * Math.sin(TAU * 0.3 * t); }
          }
        }
        // 옆을 볼 때 머리를 카메라(+z) 쪽으로 — 시안이 pose 전에 root.rotation.y 를 정해 둔다(Surv3D 2판 같은 꾀)
        head.rotation.y += -0.5 * Math.sin(root.rotation.y);
        // 뒤를 볼 때(카메라에서 멀어질 때)는 고개를 더 젖혀 머리띠·정수리가 보이게
        if (Math.cos(root.rotation.y) < 0) head.rotation.x += 0.15 * Math.cos(root.rotation.y);
        if (hurt > 0) {
          chest.rotation.x -= 0.3 * hurt; head.rotation.x -= 0.2 * hurt;
          armL.rotation.z += 0.6 * hurt; armR.rotation.z -= 0.4 * hurt;
          if (!red) { rig.scale.y *= 1 - 0.1 * hurt; rig.scale.x *= 1 + 0.06 * hurt; rig.scale.z *= 1 + 0.06 * hurt; }
          eyeG.scale.y = 0.2;
        }
        mat.emissive.set(C.cream3); mat.emissiveIntensity = hurt * 0.55;
      }
      pose(0, "idle", 0, {});
      return { root: root, pose: pose, POSES: ["idle", "walk", "lost"] };
    }

    // ══ 포장마차 ═══════════════════════════════════════════════
    // 천막 56 × 44(지붕 처마 포함 58 × 45), 용마루 높이 30, 처마 22. 계산대(어묵 솥)는 앞(+z). 의자 여섯은 규칙 seatPos 와 같은 타원 둘레.
    var SEAT_RX = 34, SEAT_RZ = 27.2;
    function seatsFor(n) { // 규칙 seatPos(k) 와 같은 자리(가게 지역 좌표), ry = 가게 가운데를 보는 방향
      var out = [];
      for (var k = 0; k < n; k++) { var a = (k / n) * TAU + Math.PI / 2, x = Math.cos(a) * SEAT_RX, z = Math.sin(a) * SEAT_RZ; out.push({ x: x, z: z, ry: Math.atan2(-x, -z) }); }
      return out;
    }
    function makeShop() {
      var root = new THREE.Group(); root.name = "pocha";
      var mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
      var seats = seatsFor(6);
      // 1) 몸통(움직이지 않는 것)
      var b = [];
      b.push(part(GEO.box, C.bo0, [0, 0.15, 0], [55, 0.3, 43])); // 젖은 시멘트 바닥판
      [[27, 21], [-27, 21], [27, -21], [-27, -21]].forEach(function (q) { b.push(seg(C.dg1, [q[0], 0, q[1]], [q[0], 22, q[1]], 0.6, 0.6, 6)); });
      [[27, 0], [-27, 0]].forEach(function (q) { b.push(seg(C.dg1, [q[0], 0, q[1]], [q[0], 30, q[1]], 0.65, 0.65, 6)); });
      // 계산대(앞): 나무 앞판 + 주황 띠 + 은빛 상판
      b.push(part(GEO.box, C.wood1, [0, 4.2, 15], [40, 8.4, 6]));
      b.push(part(GEO.box, C.tarp0, [0, 6.6, 18.05], [40.2, 1.4, 0.2]));
      b.push(part(GEO.box, C.wood0, [0, 0.6, 18.05], [40.2, 1.2, 0.2]));
      b.push(part(GEO.box, C.dg2, [0, 8.75, 15], [41, 0.7, 7]));
      // 어묵 솥(긴 네모 통 + 칸막이 + 국물) + 꼬치
      b.push(part(GEO.box, C.dg1, [-9, 10.3, 15.2], [15, 2.4, 5.4]));
      b.push(part(GEO.box, C.be0, [-9, 11.45, 15.2], [14, 0.2, 4.6]));
      [-13, -9, -5].forEach(function (x) { b.push(part(GEO.box, C.dg2, [x, 11.5, 15.2], [0.3, 0.5, 4.6])); });
      for (var i = 0; i < 9; i++) {
        var sx = -15.2 + i * 1.55, lean = (i % 3 - 1) * 0.18, tz = 14.0 + (i % 2) * 2.2;
        b.push(seg(C.wood1, [sx, 11.2, tz], [sx + lean * 4, 16.6, tz + 0.8], 0.16, 0.16, 3));
        b.push(part(GEO.ico0, i % 2 ? C.p1 : C.p2, [sx + lean * 1.6, 12.9, tz + 0.3], [0.95, 1.4, 0.55], [0, 0, lean])); // 접은 어묵
        b.push(part(GEO.ico0, i % 2 ? C.p2 : C.p1, [sx + lean * 2.4, 14.2, tz + 0.45], [0.8, 0.9, 0.5], [0, 0, lean]));
      }
      // 떡볶이 둥근 철판(빨강 — 어묵 솥 옆 따뜻한 강조)
      b.push(part(cyl(4.2, 3.6, 1.2, 12), C.dg0, [5.5, 9.7, 15]));
      b.push(part(cyl(3.8, 3.8, 0.2, 12), C.btn0, [5.5, 10.3, 15]));
      [[4.3, 14.2], [6.4, 15.8], [5.2, 16.2], [6.8, 14.0], [4.4, 15.9]].forEach(function (q, k) { b.push(part(GEO.box, C.tee2, [q[0], 10.55, q[1]], [1.6, 0.5, 0.6], [0, k * 0.9, 0])); });
      // 꼬치 통 + 종이컵 더미 + 차림판(글자 없음 — 그림 셋)
      b.push(part(cyl(1.2, 1.1, 3.2, 7), C.cr0, [12.5, 10.7, 14.4]));
      for (var j = 0; j < 5; j++) b.push(seg(C.wood1, [12.5 + (j - 2) * 0.3, 11, 14.4], [12.5 + (j - 2) * 0.9, 15.4, 14.4 + (j % 2) * 0.6], 0.14, 0.14, 3));
      b.push(part(cyl(1.0, 0.8, 3.0, 7), C.tee2, [15.5, 10.6, 16.2])); b.push(part(cyl(1.02, 1.02, 0.6, 7), C.btn0, [15.5, 10.9, 16.2]));
      b.push(part(GEO.box, C.ink2, [18.2, 13.4, 16.6], [5.6, 7.0, 0.5], [-0.2, -0.15, 0]));
      b.push(part(GEO.box, C.cream3, [18.2, 13.4, 16.45], [6.2, 7.6, 0.3], [-0.2, -0.15, 0]));
      b.push(part(cyl(1.0, 1.0, 0.3, 8), C.be1, [17.0, 15.2, 17.2], 1, [Math.PI / 2 - 0.2, 0, 0])); // 호떡 그림
      b.push(part(GEO.box, C.p1, [19.3, 15.2, 17.2], [1.6, 0.8, 0.3], [-0.2, -0.15, 0.4])); // 꼬치 그림
      b.push(part(GEO.ico0, C.be2, [17.6, 12.4, 17.5], [1.2, 0.7, 0.3])); // 붕어빵 그림
      b.push(part(GEO.box, C.btn1, [19.2, 12.0, 17.4], [1.8, 0.5, 0.3], [-0.2, -0.15, 0]));
      b.push(part(GEO.box, C.btn1, [19.2, 11.0, 17.25], [1.8, 0.5, 0.3], [-0.2, -0.15, 0]));
      // 안쪽: 접이식 탁자 + 그릇 + 물통·박스(짐)
      b.push(part(GEO.box, C.tub0, [0, 6.3, -4], [22, 0.6, 9]));
      [[10, -7.8], [-10, -7.8], [10, -0.2], [-10, -0.2]].forEach(function (q) { b.push(seg(C.dg0, [q[0], 0, q[1]], [q[0], 6.0, q[1]], 0.3, 0.3, 4)); });
      [[-5, -4], [3, -2.6], [6, -5.6]].forEach(function (q) { b.push(part(cyl(1.4, 1.0, 1.1, 8), C.tee2, [q[0], 7.15, q[1]])); b.push(part(cyl(1.2, 1.2, 0.1, 8), C.be0, [q[0], 7.7, q[1]])); });
      b.push(part(GEO.box, C.btn0, [-21, 2.0, -16], [6, 4, 5])); b.push(part(GEO.box, C.teal1, [-21, 5.6, -16], [5.4, 3.2, 4.6], [0, 0.3, 0]));
      b.push(part(GEO.box, C.p1, [-14.5, 1.8, -17.5], [5, 3.6, 4])); b.push(part(cyl(1.7, 1.7, 5.0, 8), C.flB, [21.5, 2.5, -15]));
      // 둘레 의자 여섯(손님 자리) — 가게 가운데를 본다
      seats.forEach(function (s) { b = b.concat(stoolParts(s.x, s.z)); });
      var body = new THREE.Mesh(merge(b), mat); body.name = "shopBody"; body.castShadow = true; body.receiveShadow = true; root.add(body);

      // 2) 천막(기울기·처짐 축 = 왼쪽 처마 −28, 22) — 주황 지붕·드림·박공 + 전구 줄의 줄
      var tarpG = new THREE.Group(); tarpG.name = "tarp"; tarpG.position.set(-29, 22, 0); root.add(tarpG);
      var tarpMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 1 });
      var t = [], SL = Math.sqrt(22 * 22 + 8 * 8), TH = Math.atan2(8, 22);
      function seam(hex) { return function (x) { var u = (x + 29) / 58 * 8; return Math.floor(u) % 2 ? hex : C.tarp1; }; }
      t.push(part(GEO.box, seam(C.tarp2), [0, 26, 11], [58, 0.5, SL + 1.2], [TH, 0, 0])); // 앞 비탈(카메라 쪽) — 줄무늬 천
      t.push(part(GEO.box, seam(C.tarp2), [0, 26, -11], [58, 0.5, SL + 1.2], [-TH, 0, 0]));
      t.push(part(cyl(0.8, 0.8, 58.6, 6), C.tarp0, [0, 30.2, 0], 1, [0, 0, Math.PI / 2])); // 용마루
      // 드림(처마에서 늘어진 천, 아래가 물결)
      [1, -1].forEach(function (s) {
        t.push(part(GEO.box, C.tarp0, [0, 20.9, s * 22.6], [58.4, 2.4, 0.3]));
        for (var k = 0; k < 12; k++) t.push(part(ball(6, 3), C.tarp0, [-26.6 + k * 4.85, 19.7, s * 22.6], [2.4, 0.9, 0.3]));
      });
      // 박공(양옆 세모)
      var tri = new THREE.Shape(); tri.moveTo(-22, 0); tri.lineTo(22, 0); tri.lineTo(0, 8); tri.lineTo(-22, 0);
      var triG = new THREE.ExtrudeGeometry(tri, { depth: 0.4, bevelEnabled: false, curveSegments: 1 });
      t.push(part(triG, C.tarp1, [28.6, 22, 0], 1, [0, Math.PI / 2, 0])); t.push(part(triG, C.tarp1, [-28.8, 22, 0], 1, [0, Math.PI / 2, 0]));
      // 전구 줄(검은 줄 — 처짐 곡선)
      var BULBS = [];
      function wire(ax, az, bx, bz, n, y0, sag) {
        var prev = null;
        for (var k = 0; k <= n; k++) {
          var u = k / n, x = ax + (bx - ax) * u, z = az + (bz - az) * u, y = y0 - sag * Math.sin(Math.PI * ((u * 3) % 1));
          if (prev) t.push(seg(C.ink1, prev, [x, y, z], 0.12, 0.12, 3));
          prev = [x, y, z];
          if (k > 0 && k < n && k % 1 === 0) BULBS.push([x, y - 0.9, z, k]);
        }
      }
      wire(-28, 23.4, 28, 23.4, 12, 21.2, 1.4);
      wire(28.9, 21, 28.9, -21, 6, 21.4, 1.0);
      wire(-28.9, 21, -28.9, -21, 6, 21.4, 1.0);
      t.forEach(function (g) { g.translate(29, -22, 0); }); // 축(왼쪽 처마) 기준 좌표로
      var tarp = new THREE.Mesh(merge(t), tarpMat); tarp.name = "tarpMesh"; tarp.castShadow = true; tarpG.add(tarp);

      // 3) 전구 + 붉은 등(발광 — setLights·setDamage 가 밝기를 바꾼다)
      var bl = [], BC = [C.be2, C.lamp, C.tarp2, C.glow];
      BULBS.forEach(function (q, k) { bl.push(part(GEO.ico1, BC[k % 4], [q[0], q[1], q[2]], [0.9, 1.05, 0.9])); bl.push(part(cyl(0.35, 0.35, 0.5, 5), C.ink2, [q[0], q[1] + 1.0, q[2]])); });
      bl.push(part(ball(9, 6), C.btn1, [0, 17.4, 23.8], [2.4, 2.8, 2.4])); // 붉은 등
      bl.push(part(cyl(1.2, 1.2, 0.6, 8), C.be1, [0, 20.3, 23.8])); bl.push(part(cyl(1.2, 1.2, 0.6, 8), C.be1, [0, 14.5, 23.8]));
      bl.push(part(cone(0.6, 2.2, 5), C.btn0, [0, 12.8, 23.8], 1, [Math.PI, 0, 0]));
      bl.forEach(function (g) { g.translate(29, -22, 0); });
      var bulbMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: C.lamp, emissiveIntensity: 1 });
      var bulbs = new THREE.Mesh(merge(bl), bulbMat); bulbs.name = "bulbs"; tarpG.add(bulbs);

      // 4) 넘어지는 의자(남는 의자 둘을 포갠 것 — 손님 자리 여섯과 따로, 계산대 왼쪽 앞. 축 = 왼쪽 아래 모서리, 왼쪽으로 쓰러진다)
      var spare = new THREE.Group(); spare.name = "spareStool"; spare.position.set(-25.3, 0, 21.5); root.add(spare);
      var spareM = new THREE.Mesh(merge(stoolParts(2.8, 0).concat(xf(stoolParts(2.8, 0), [0, 3.6, 0]))), mat); spare.add(spareM);

      // 5) 투명 비닐 가림막(뒤·양옆, 아래 절반 + 말아 올린 두루마리)
      var cv = [];
      function curtain(cx, cz, w, ry, n) {
        for (var k = 0; k < n; k++) {
          var u = (k + 0.5) / n - 0.5, px = cx + Math.cos(ry) * u * w, pz = cz - Math.sin(ry) * u * w;
          cv.push(part(GEO.box, k % 2 ? C.su2 : C.su1, [px, 7.2, pz], [w / n + 0.2, 13.5, 0.15], [0, ry + (k % 2 ? 0.1 : -0.1), 0]));
        }
        cv.push(part(cyl(0.9, 0.9, w, 7), C.su1, [cx, 20.4, cz], 1, [0, ry, Math.PI / 2]));
      }
      curtain(0, -21.6, 53, 0, 6); curtain(27.6, 0, 41, Math.PI / 2, 5); curtain(-27.6, 0, 41, Math.PI / 2, 5);
      var curtMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
      var curtains = new THREE.Mesh(merge(cv), curtMat); curtains.name = "curtains"; curtains.renderOrder = 2; root.add(curtains);

      // 6) 김(솥 위 몽글몽글 — update(t) 가 정점을 올린다, 할당 없음)
      var NP = 6, puff = new THREE.IcosahedronGeometry(1, 1).toNonIndexed(), PV = puff.attributes.position.count;
      var sp = new Float32Array(NP * PV * 3), base = puff.attributes.position.array;
      var steamG = new THREE.BufferGeometry(), steamA = new THREE.BufferAttribute(sp, 3); steamA.setUsage(THREE.DynamicDrawUsage);
      steamG.setAttribute("position", steamA);
      var SX = [-13, -9.5, -6, -11, -7, 5.5], SZ = [15.2, 14.8, 15.4, 15.6, 15.0, 15], SPH = [0, 0.35, 0.7, 0.18, 0.55, 0.85];
      var steamMat = new THREE.MeshBasicMaterial({ color: C.cream3, transparent: true, opacity: 0.5, depthWrite: false });
      var steam = new THREE.Mesh(steamG, steamMat); steam.name = "steam"; steam.frustumCulled = false; steam.renderOrder = 3; root.add(steam);
      function steamAt(tt) {
        for (var p = 0; p < NP; p++) {
          var k = (tt * 0.45 + SPH[p]) % 1, r = 1.1 + 1.6 * k, y = 12.4 + 5.0 * k, x = SX[p] + Math.sin(tt * 1.3 + p) * 0.8 * k;
          var s = r * (k < 0.85 ? 1 : (1 - k) / 0.15), o = p * PV * 3;
          for (var v = 0; v < PV; v++) { sp[o + v * 3] = x + base[v * 3] * s; sp[o + v * 3 + 1] = y + base[v * 3 + 1] * s * 0.85; sp[o + v * 3 + 2] = SZ[p] + base[v * 3 + 2] * s; }
        }
        steamA.needsUpdate = true;
      }
      steamAt(0); steamG.computeBoundingSphere();

      // ── 상태 ──
      var dmg = 0, lights = 1, lastT = 0;
      var cGlow = new THREE.Color(C.lamp), cDim = new THREE.Color(C.bo2), cTarp = new THREE.Color(C.shine1), cTarpD = new THREE.Color(C.cr0);
      function applyLights(flick) {
        var on = lights * (1 - 0.6 * dmg) * flick;
        bulbMat.emissiveIntensity = 1.25 * on;
        bulbMat.emissive.lerpColors(cGlow, cDim, Math.min(1, dmg * 0.7));
      }
      function setDamage(v) {
        dmg = Math.max(0, Math.min(1, +v || 0));
        // 천막: 오른쪽이 내려앉고 가운데가 처진다
        tarpG.rotation.z = -0.085 * dmg; tarpG.scale.y = 1 - 0.22 * dmg; tarpG.position.y = 22 - 1.2 * dmg;
        tarpG.rotation.x = 0.03 * dmg;
        tarpMat.color.lerpColors(cTarp, cTarpD, dmg * 0.5); // 빛이 꺼져 가는 만큼 천이 어둑
        // 의자: 0.35 부터 기울어 0.7 에 넘어진다
        var f = Math.max(0, Math.min(1, (dmg - 0.35) / 0.35)); f = f * f * (3 - 2 * f);
        spare.rotation.z = f * Math.PI / 2; spare.position.y = 0;
        // 비닐: 비뚤어진다
        curtains.rotation.z = 0.02 * dmg; curtains.position.y = -0.6 * dmg; curtMat.opacity = 0.28 - 0.08 * dmg;
        applyLights(1);
      }
      function setLights(v) { lights = Math.max(0, Math.min(1, v == null ? 1 : +v)); applyLights(1); }
      function setRoofAlpha(a) { tarpMat.opacity = Math.max(0.15, Math.min(1, a == null ? 1 : +a)); tarpMat.depthWrite = tarpMat.opacity > 0.99; }
      // update(t): 김 + 부서진 만큼 전구 깜빡임(없어도 된다 — 부르지 않으면 김·깜빡임이 멈춘 채)
      function update(tt, reduce) {
        lastT = tt;
        if (!reduce) steamAt(tt);
        var flick = 1;
        if (dmg > 0.15 && !reduce) { var n = Math.sin(Math.floor(tt * 11) * 12.9898) * 43758.5453; n -= Math.floor(n); if (n < dmg * 0.45) flick = 0.2; }
        applyLights(flick);
      }
      setDamage(0);
      root.userData.drawCalls = 6;
      return { root: root, setDamage: setDamage, setLights: setLights, setRoofAlpha: setRoofAlpha, update: update, seats: seats, seatsFor: seatsFor, radius: 26, drawCalls: 6 };
    }

    // ══ 손님(좋은 편) — 위에서 큰 우산 원반(노랑 / 투명 + 금빛 테) ══════
    // 규칙 반경 5 → 사람 키 약 14, 우산 지름 17(사람보다 넓게 — 위에서 원반이 먼저 보인다)
    var GUEST = {
      guest_yellow: function () {
        var hipY = 4.4, hand = [-2.2, 7.4, 1.6];
        var p = personParts({ coat: C.cream1, coat2: C.cream2, pants: C.bo1, shoe: C.wood0, hair: C.fur1, face: "smile", feet: [[1.3, 0, 1.4], [-1.2, 0, -1.3]], hands: [[2.4, 5.0, -0.8], hand], hipY: hipY });
        p.push(part(cyl(2.1, 2.1, 1.2, 6), C.flP, [0, 8.6, 0.1])); // 목도리
        return p.concat(xf(umbrellaParts(8.5, 11.2, C.flY, C.be2, C.glow), [hand[0], hand[1] - 1.4, hand[2]], [-0.28, 0, 0.1]));
      },
      guest_clear: function () {
        var hand = [-2.2, 7.4, 1.6];
        var p = personParts({ coat: C.purp1, coat2: C.purp2, pants: C.va0, shoe: C.ink1, hair: C.ink1, face: "smile", feet: [[1.2, 0, -1.2], [-1.3, 0, 1.3]], hands: [[2.4, 5.0, 0.9], hand] });
        p.push(part(cone(2.6, 2.4, 8), C.teal1, [0, 13.6, 0.0], 1, [-0.3, 0, 0])); // 털모자
        p.push(part(GEO.ico0, C.tee2, [0, 15.1, -0.4], 0.8));
        return p.concat(xf(umbrellaParts(8.5, 11.2, C.su2, C.su1, C.lamp), [hand[0], hand[1] - 1.4, hand[2]], [-0.28, 0, 0.1]));
      },
      guest_sit: function () { // 의자(앉는 높이 4.1)에 앉아 꼬치를 먹는다. 원점 = 의자 가운데 바닥, +z 를 본다. 의자는 가게 몫
        var hipY = 4.9;
        var p = personParts({ coat: C.cream1, coat2: C.cream2, pants: C.bo1, shoe: C.wood0, hair: C.fur1, face: "eat", hipY: hipY,
          knees: [[1.2, 4.6, 3.4], [-1.2, 4.6, 3.4]], feet: [[1.4, 0, 3.8], [-1.4, 0, 3.6]],
          hands: [[1.0, 10.6, 3.2], [-1.6, 6.6, 2.6]], pitch: -0.35 });
        p.push(part(cyl(2.1, 2.1, 1.2, 6), C.flP, [0, 9.1, 0.1]));
        p.push(seg(C.wood1, [1.0, 10.0, 3.3], [0.6, 13.6, 4.6], 0.14, 0.14, 3)); // 꼬치
        p.push(part(GEO.ico0, C.p1, [0.75, 12.4, 4.2], [0.9, 1.3, 0.5])); p.push(part(GEO.ico0, C.p2, [0.65, 13.2, 4.4], [0.7, 0.8, 0.45]));
        p.push(part(cyl(1.0, 0.75, 2.2, 7), C.tee2, [-1.6, 7.4, 2.9])); p.push(part(cyl(1.02, 1.02, 0.5, 7), C.btn0, [-1.6, 7.6, 2.9])); // 국물 종이컵
        p.push(part(ball(5, 3), C.cream3, [-1.6, 9.4, 3.0], [0.7, 1.0, 0.7])); // 김
        // 접은 노란 우산이 의자 옆에 기대 있다(끝에 금빛 띠)
        p.push(part(cone(1.1, 10.5, 6), C.flY, [4.3, 6.2, -0.6], 1, [0.1, 0, 0.32]));
        p.push(part(cyl(1.05, 1.05, 0.6, 6), C.glow, [4.0, 6.8, -0.5], 1, [0.1, 0, 0.32]));
        p.push(seg(C.ink2, [5.9, 1.2, -0.7], [3.0, 11.6, -0.5], 0.22, 0.22, 4));
        return p;
      },
      guest_flee: function () { // 놀라 달아난다: 우산이 뒤집혀 들리고 팔 번쩍, 다리 크게
        var hand = [-1.6, 12.8, 0.4];
        var p = personParts({ coat: C.cream1, coat2: C.cream2, pants: C.bo1, shoe: C.wood0, hair: C.fur1, face: "shock", feet: [[1.4, 0.6, 3.4], [-1.3, 1.4, -3.4]], hands: [[3.6, 11.4, 0.6], hand], pitch: -0.15 });
        [[3.6, 13.0], [-3.4, 12.6]].forEach(function (q) { p.push(part(GEO.ico0, C.flB, [q[0], q[1] + 4.2, 1.0], [0.55, 0.8, 0.55])); }); // 땀
        p.push(part(cyl(2.1, 2.1, 1.2, 6), C.flP, [0, 8.6, 0.1]));
        return p.concat(xf(umbrellaParts(8.0, 8.5, C.flY, C.be2, C.glow), [hand[0] - 0.8, hand[1] + 9.2, hand[2] - 1], [Math.PI - 0.35, 0, 0.3])); // 뒤집힌 우산
      },
    };
    var guestGeometry = cache(GUEST, { guest: "guest_yellow", yellow: "guest_yellow", clear: "guest_clear", sit: "guest_sit", flee: "guest_flee" }, "guest");

    // ══ 적 ═════════════════════════════════════════════════════
    // 규칙 반경(docs/lab-surv-pocha.js): 비둘기 4 · 우산 3.5 · 갈매기 4.5 · 취객 8 · 노래 취객 8 · 갈매기 대장 18 · 먹구름 18
    function gullParts(o) { // 몸 가운데 = 원점 기준, 바깥에서 xf 로 크기·높이
      o = o || {};
      var p = [];
      p.push(part(ball(7, 5), C.tub1, [0, 0, 0], [2.4, 2.2, 4.0]));
      p.push(part(GEO.ico0, C.dg3, [0, -0.7, 0.4], [2.0, 1.5, 3.2])); // 배
      p.push(part(ball(6, 4), C.tub1, [0, 1.6, 3.9], 2.05)); // 머리
      p.push(part(GEO.ico0, C.ink0, [1.05, 2.15, 5.4], [0.45, 0.55, 0.3])); p.push(part(GEO.ico0, C.ink0, [-1.05, 2.15, 5.4], [0.45, 0.55, 0.3]));
      p.push(part(GEO.box, C.shine1, [1.2, 2.35, 5.65], 0.22)); p.push(part(GEO.box, C.shine1, [-0.9, 2.35, 5.65], 0.22));
      p.push(part(GEO.box, C.ink1, [1.05, 2.95, 5.3], [1.2, 0.32, 0.3], [0, 0, -0.45])); p.push(part(GEO.box, C.ink1, [-1.05, 2.95, 5.3], [1.2, 0.32, 0.3], [0, 0, 0.45])); // 욕심 눈썹
      p.push(part(cone(0.75, 2.8, 5), C.be2, [0, 1.15, 6.6], 1, [Math.PI / 2, 0, 0])); // 부리
      p.push(part(GEO.ico0, C.btn1, [0, 0.85, 6.9], 0.32));
      // 날개(V 로 펼침): 안쪽 회색 → 바깥 짙은 끝
      [1, -1].forEach(function (s) {
        p.push(part(GEO.box, C.dg2, [s * 4.1, 0.9, 0.3], [4.4, 0.5, 3.6], [0, 0, s * 0.22]));
        p.push(part(GEO.box, C.bo2, [s * 7.9, 2.0, -0.1], [3.8, 0.42, 2.8], [0, s * 0.12, s * 0.38]));
        p.push(part(GEO.box, C.bo0, [s * 10.4, 3.1, -0.6], [1.9, 0.36, 2.0], [0, s * 0.2, s * 0.5]));
      });
      p.push(part(GEO.box, C.tub0, [0, 0.2, -4.6], [2.4, 0.5, 2.2])); p.push(part(GEO.box, C.bo0, [0, 0.2, -5.8], [1.8, 0.4, 0.6]));
      p.push(part(GEO.box, C.be1, [0.8, -2.0, -1.4], [0.7, 0.5, 1.4])); p.push(part(GEO.box, C.be1, [-0.8, -2.0, -1.4], [0.7, 0.5, 1.4]));
      if (o.skewer !== false) { // 부리에 문 어묵 꼬치(훔친 것)
        p.push(part(GEO.box, C.wood1, [0.6, 0.95, 6.5], [7.0, 0.22, 0.22], [0, 0.15, 0]));
        p.push(part(GEO.box, C.p1, [2.4, 0.95, 6.3], [1.5, 1.5, 0.6], [0, 0, 0.4])); p.push(part(GEO.box, C.p2, [3.6, 0.95, 6.2], [1.2, 1.2, 0.55], [0, 0, -0.3]));
      }
      return p;
    }
    function drunkParts(o) {
      var hs = o.hs || 1.3;
      var tie = function (h, R) { // 넥타이 머리띠: 이마 둘레 빨간 띠 + 뒤로 늘어진 두 자락
        h.push(part(torus(R * 1.02, R * 0.12, 3, 10), C.btn0, [0, R * 0.42, -0.1], 1, [Math.PI / 2 - 0.2, 0, 0]));
        h.push(part(GEO.box, C.btn0, [R * 0.35, R * 0.15, -R * 1.15], [R * 0.32, R * 0.9, R * 0.08], [0.5, 0.2, -0.5]));
        h.push(part(GEO.box, C.btn1, [R * 0.1, -R * 0.05, -R * 1.2], [R * 0.26, R * 0.8, R * 0.08], [0.6, -0.2, 0.25]));
        h.push(part(GEO.ico0, C.btn0, [0.05, R * 0.55, -R * 0.95], R * 0.22));
      };
      return personParts({ coat: o.coat, coat2: o.coat2, sleeve: o.sleeve, pants: C.bo1, shoe: C.ink1, hair: C.ink1, skin: C.skin, face: o.face, hs: hs, belly: 1.18,
        cheek: C.btn1, cheekS: 1.5, nose: C.btn1, feet: o.feet, hands: o.hands, roll: o.roll, pitch: -0.32, headDX: o.headDX, headX: tie, bangs: false });
    }
    var ENEMY = {
      pigeon: function () { // 회색 둥근 비둘기, 목에 청록·보라 윤기, 큰 눈, 분홍 발 — 지름 약 10
        var p = [part(ball(7, 5), C.dg1, [0, 3.6, -0.4], [3.0, 2.7, 3.9])];
        p.push(part(GEO.ico0, C.dg0, [0, 3.8, -1.9], [2.6, 2.0, 2.4])); // 등 날개 덮개
        p.push(part(GEO.box, C.bo1, [1.9, 4.2, -1.0], [0.6, 1.1, 2.6], [0.2, 0.2, 0.1])); p.push(part(GEO.box, C.bo1, [-1.9, 4.2, -1.0], [0.6, 1.1, 2.6], [0.2, -0.2, -0.1])); // 날개 줄
        p.push(part(GEO.ico0, C.teal0, [0, 5.4, 1.9], [1.9, 1.3, 1.5])); p.push(part(GEO.box, C.purp1, [0, 5.0, 2.7], [2.6, 1.2, 1.4]));
        p.push(part(ball(6, 4), C.dg1, [0, 7.0, 2.5], 1.9)); // 머리
        p.push(part(GEO.box, C.shine1, [0.95, 7.4, 3.85], [1.2, 1.3, 0.6])); p.push(part(GEO.box, C.shine1, [-0.95, 7.4, 3.85], [1.2, 1.3, 0.6]));
        p.push(part(GEO.ico0, C.ink0, [1.0, 7.4, 4.15], 0.38)); p.push(part(GEO.ico0, C.ink0, [-1.0, 7.4, 4.15], 0.38));
        p.push(part(cone(0.5, 1.4, 4), C.ink2, [0, 6.6, 4.6], 1, [Math.PI / 2, 0, 0])); p.push(part(GEO.ico0, C.tub1, [0, 7.0, 4.15], [0.45, 0.25, 0.3]));
        p.push(part(GEO.box, C.dg0, [0, 3.5, -4.6], [2.4, 0.6, 2.2], [0.25, 0, 0]));
        p.push(part(GEO.box, C.tongue1, [0.9, 0.4, 0.6], [0.5, 0.8, 1.4])); p.push(part(GEO.box, C.tongue1, [-0.9, 0.4, 0.6], [0.5, 0.8, 1.4]));
        return p;
      },
      gull: function () { // 갈매기(날며 꼬치를 물었다) — 몸 11, 날개폭 약 23, 높이 9 에 뜬다
        return xf(gullParts(), [0, 9, 0], [-0.1, 0, 0], 1);
      },
      drunk: function () { // 취객(8): 흰 셔츠·회색 바지·넥타이 머리띠·빨간 볼. 비틀(몸 기울고 다리 꼬임), 꼬치·종이컵
        var p = drunkParts({ coat: C.tee1, coat2: C.tee2, face: "happy", feet: [[2.2, 0, 0.6], [0.2, 0, -1.2]], hands: [[3.6, 12.2, 1.6], [-3.2, 7.4, 2.4]], roll: 0.18, headDX: 0.6 });
        p.push(part(GEO.box, C.cr0, [0, 7.0, 2.25], [0.9, 1.0, 0.3])); // 풀린 단추 자리
        p.push(seg(C.wood1, [3.6, 11.6, 1.6], [4.6, 17.0, 2.6], 0.16, 0.16, 3)); // 치켜든 꼬치
        p.push(part(GEO.ico0, C.p1, [4.2, 14.4, 2.2], [1.1, 1.5, 0.6])); p.push(part(GEO.ico0, C.p2, [4.4, 15.8, 2.4], [0.9, 1.0, 0.5]));
        p.push(part(cyl(1.1, 0.85, 2.4, 7), C.tee2, [-3.2, 8.4, 2.6])); p.push(part(cyl(1.12, 1.12, 0.6, 7), C.teal1, [-3.2, 8.7, 2.6])); // 종이컵
        return xf(p, [0, 0, 0], [0, 0, -0.12], 1.15);
      },
      drunk_sing: function () { // 노래하는 취객: 같은 꼴 + 파란 웃옷, 장난감 마이크, 한 팔 번쩍
        var p = drunkParts({ coat: C.va1, coat2: C.tee1, sleeve: C.va1, face: "sing", feet: [[2.4, 0, 0.2], [-2.0, 0, 0.6]], hands: [[0.9, 12.0, 3.6], [-4.6, 13.0, 0.4]], roll: -0.12 });
        p.push(part(GEO.box, C.btn0, [0, 7.6, 2.4], [0.7, 2.6, 0.3])); // 원래 넥타이 자리엔 짧은 끈
        p.push(seg(C.purp0, [0.9, 11.4, 3.6], [0.7, 13.0, 5.1], 0.4, 0.5, 6)); // 마이크 손잡이
        p.push(part(ball(6, 4), C.flP, [0.6, 13.4, 5.5], 1.05)); p.push(part(cyl(0.75, 0.75, 0.35, 6), C.flY, [0.6, 12.9, 5.25], 1, [0.6, 0, 0]));
        return xf(p, [0, 0, 0], [0, 0, 0.06], 1.18);
      },
      umbrella_fly: function () { // 바람에 뒤집혀 굴러오는 우산(3.5): 빨강·흰 줄 + 꺾인 살 + 성난 눈. 손님 우산(노랑·투명 + 금빛 테)과 색이 반대
        var u = [];
        u.push(part(dbl(cone(4.6, 2.6, 8, true)), stripes(C.btn0, C.tub1, 8), [0, 0, 0], 1, [Math.PI, 0, 0]));
        u.push(seg(C.dg0, [0, 0.8, 0], [0, -5.4, 0.2], 0.22, 0.22, 4));
        u.push(part(torus(0.8, 0.26, 3, 5, Math.PI), C.ink2, [0.8, -5.4, 0.2], 1, [0, 0, Math.PI]));
        for (var k = 0; k < 8; k++) { var a = k / 8 * TAU + 0.2; u.push(part(GEO.box, C.dg1, [Math.sin(a) * 4.9, 1.6 + (k % 3) * 0.4, Math.cos(a) * 4.9], [0.22, 1.6, 0.22], [Math.cos(a) * 0.7, 0, -Math.sin(a) * 0.7])); }
        u.push(part(GEO.ico0, C.ink0, [1.3, 0.2, 1.2], [0.6, 0.65, 0.4])); u.push(part(GEO.ico0, C.ink0, [-1.3, 0.2, 1.2], [0.6, 0.65, 0.4]));
        u.push(part(GEO.box, C.shine1, [1.15, 0.7, 1.35], 0.2)); u.push(part(GEO.box, C.shine1, [-1.45, 0.7, 1.35], 0.2));
        u.push(part(GEO.box, C.ink1, [1.3, 1.0, 1.4], [1.0, 0.25, 0.25], [0, 0, -0.5])); u.push(part(GEO.box, C.ink1, [-1.3, 1.0, 1.4], [1.0, 0.25, 0.25], [0, 0, 0.5]));
        return xf(u, [0, 7.0, 0], [0.55, 0, 0.45], 1);
      },
      gull_king: function () { // 갈매기 대장(18): 큰 갈매기 + 선장 모자(흰 윗면·남색 띠·금별) + 볏 깃털 + 금 견장 + 꼬치 세 개
        var p = gullParts({ skewer: false });
        p.push(part(cyl(2.9, 2.3, 1.1, 10), C.tub1, [0, 4.6, 3.6], 1, [-0.15, 0, 0])); // 모자 윗면
        p.push(part(cyl(2.35, 2.35, 0.9, 10), C.va0, [0, 3.7, 3.75], 1, [-0.15, 0, 0]));
        p.push(part(GEO.box, C.ink1, [0, 3.3, 5.8], [3.6, 0.25, 1.6], [0.25, 0, 0])); // 챙
        p.push(part(starGeo(0.8, 0.3), C.be2, [0, 3.9, 6.0], 1, [-0.15, 0, 0]));
        p.push(part(torus(2.4, 0.18, 3, 10), C.be1, [0, 3.25, 3.75], 1, [Math.PI / 2 - 0.15, 0, 0]));
        [[0.0, -0.4], [0.9, -0.7], [-0.9, -0.7]].forEach(function (q) { p.push(part(cone(0.5, 2.6, 4), C.dg2, [q[0], 5.6, 2.2 + q[1]], 1, [-0.7, 0, -q[0] * 0.4])); });
        [1, -1].forEach(function (s) { p.push(part(GEO.ico1, C.be2, [s * 2.3, 1.6, 1.0], [1.2, 0.5, 1.2])); for (var k = 0; k < 4; k++) p.push(part(GEO.box, C.be1, [s * (1.6 + k * 0.45), 1.0, 1.6], [0.2, 0.7, 0.2])); });
        p.push(part(GEO.box, C.wood1, [0.6, 0.95, 6.5], [9.0, 0.24, 0.24], [0, 0.12, 0]));
        [[1.9, C.p1], [3.1, C.p2], [4.3, C.p1]].forEach(function (q) { p.push(part(GEO.ico1, q[1], [q[0], 0.95, 6.35], [0.65, 0.95, 0.45])); });
        p.push(part(GEO.box, C.be2, [0, -0.2, 3.6], [0.5, 0.5, 0.3])); p.push(part(GEO.box, C.be2, [0, -1.2, 3.4], [0.5, 0.5, 0.3])); // 금단추
        return xf(p, [0, 17, 0], [-0.08, 0, 0], 3.1);
      },
      rain_cloud: function () { // 먹구름(18): 25 높이에 뜬 성난 구름 + 아래 빗줄기. 얼굴은 위로 들려 카메라를 본다
        var p = [];
        p.push(part(GEO.ico1, C.bo1, [0, 0, 0], [13, 6.6, 10]));
        p.push(part(GEO.ico1, C.bo0, [0, -3.6, 0.5], [13.5, 2.6, 10.5]));
        [[-9, 2.4, 0.5, 6.2, C.bo2], [8.8, 2.0, -0.5, 6.4, C.bo1], [-2.8, 5.6, -1.2, 6.6, C.bo2], [4.4, 5.2, -2.6, 5.8, C.bo2], [-12.6, -0.4, -1.5, 4.6, C.bo1], [12.6, -0.6, 1.4, 4.4, C.bo2], [0.6, 3.6, 4.6, 5.0, C.cr0]].forEach(function (q) { p.push(part(ball(8, 5), q[4], [q[0], q[1], q[2]], q[3])); });
        // 얼굴(앞·위로 기울임): 흰자 + 눈동자 + 성난 눈썹 + ∩ 입 + 볼
        var f = [];
        [1, -1].forEach(function (s) {
          f.push(part(ball(6, 4), C.shine1, [s * 3.6, 0.6, 0], [1.9, 1.6, 0.8]));
          f.push(part(GEO.ico0, C.ink0, [s * 3.3, 0.3, 0.6], [1.0, 1.05, 0.5]));
          f.push(part(GEO.box, C.ink1, [s * 3.6, 2.8, 0.5], [3.4, 0.7, 0.6], [0, 0, s * 0.42]));
          f.push(part(GEO.ico0, C.purp2, [s * 6.6, -1.8, -0.2], [1.4, 0.8, 0.5]));
        });
        f.push(part(torus(2.0, 0.42, 3, 8, Math.PI), C.ink1, [0, -3.2, 0.3], 1));
        p = p.concat(xf(f, [0, 1.0, 9.6], [-0.55, 0, 0], 1));
        // 빗줄기 16 + 끝 물방울
        for (var k = 0; k < 16; k++) {
          var a = k / 16 * TAU + 0.3, rr = 4 + (k % 4) * 2.4, x = Math.cos(a) * rr * 1.2, z = Math.sin(a) * rr * 0.9, len = 13 + (k % 3) * 3;
          p.push(part(GEO.box, k % 2 ? C.su0 : C.flB, [x, -5 - len / 2, z], [0.32, len, 0.32], [0, 0, 0.12]));
          p.push(part(GEO.ico0, C.water, [x + len * 0.06, -5 - len, z], 0.55));
        }
        p.push(part(GEO.box, C.flY, [-6.0, -6.5, 3.4], [0.9, 3.6, 0.5], [0, 0, 0.5])); p.push(part(GEO.box, C.flY, [-6.4, -9.2, 3.4], [0.9, 2.8, 0.5], [0, 0, -0.5])); // 작은 번개
        return xf(p, [0, 25, 0], null, 1.25);
      },
    };
    var enemyGeometry = cache(ENEMY, { umbrella: "umbrella_fly", sing: "drunk_sing" }, "enemy");

    // ══ 줍기 ═══════════════════════════════════════════════════
    var PICK = {
      coin: function () { // 동전: 금 원반이 서서 카메라를 본다
        return xf([part(cyl(1.9, 1.9, 0.55, 10), C.be2, [0, 0, 0], 1, [Math.PI / 2, 0, 0]), part(torus(1.9, 0.22, 3, 10), C.be1, [0, 0, 0]), part(cyl(1.0, 1.0, 0.65, 6), C.be3, [0, 0, 0], 1, [Math.PI / 2, 0, 0])], [0, 2.4, 0], [-0.35, 0, 0]);
      },
      coin_big: function () {
        return xf([part(cyl(3.0, 3.0, 0.8, 12), C.be2, [0, 0, 0], 1, [Math.PI / 2, 0, 0]), part(torus(3.0, 0.32, 3, 12), C.be1, [0, 0, 0]), part(starGeo(1.6, 0.9), C.be3, [0, 0, 0.1])], [0, 3.6, 0], [-0.35, 0, 0]);
      },
      soup: function () { // 따뜻한 국물 종이컵(회복): 흰 컵 + 빨간 띠 + 국물 + 꼬치 + 김
        return [part(cyl(2.0, 1.55, 3.8, 8), C.tee2, [0, 1.9, 0]), part(cyl(2.03, 2.0, 0.9, 8), C.btn0, [0, 2.6, 0]), part(cyl(1.85, 1.85, 0.15, 8), C.be0, [0, 3.75, 0]),
          seg(C.wood1, [0.4, 3.0, 0], [1.6, 6.8, -0.4], 0.14, 0.14, 3), part(GEO.ico0, C.p1, [1.2, 5.4, -0.25], [0.8, 1.1, 0.45]),
          part(ball(5, 3), C.cream3, [-0.5, 5.4, 0.2], [0.8, 1.1, 0.8]), part(ball(5, 3), C.cream3, [-0.1, 6.9, 0], [0.55, 0.8, 0.55])];
      },
      cashbox: function () { // 동전 통(자석): 파란 깡통 + 금 테 + 투입구 + 위에 동전
        return [part(cyl(2.4, 2.4, 3.2, 10), C.va2, [0, 1.6, 0]), part(cyl(2.5, 2.5, 0.5, 10), C.be1, [0, 3.3, 0]), part(cyl(2.5, 2.5, 0.4, 10), C.be1, [0, 0.4, 0]),
          part(GEO.box, C.ink0, [0, 3.6, 0], [2.0, 0.2, 0.4]), part(cyl(0.8, 0.8, 0.3, 8), C.be2, [0.9, 3.9, 0.9], 1, [0.3, 0, 0.2]), part(cyl(0.8, 0.8, 0.3, 8), C.be2, [-0.8, 4.2, -0.6], 1, [-0.4, 0, 0.3]),
          part(GEO.ico0, C.shine1, [-1.2, 2.4, 1.9], 0.4)];
      },
    };
    var pickupGeometry = cache(PICK, { heal: "soup", magnet: "cashbox", big: "coin_big" }, "pickup");

    // ══ 탄 ═════════════════════════════════════════════════════
    var PROJ = {
      skewer: function () { // 어묵 꼬치: +z 로 날아간다(끝이 뾰족)
        var p = [part(GEO.box, C.wood1, [0, 2.4, 0], [0.32, 0.32, 10]), part(cone(0.3, 1.2, 4), C.wood0, [0, 2.4, 5.5], 1, [Math.PI / 2, 0, 0])];
        [[2.4, C.p1], [0.4, C.p2], [-1.6, C.p1]].forEach(function (q) { p.push(part(GEO.ico0, q[1], [0, 2.4, q[0]], [1.6, 1.1, 0.9])); });
        return p;
      },
      ladle: function () { // 국자(돌기): 눕힌 은빛 국자, 오목한 쪽이 위
        return [part(new THREE.SphereGeometry(2.4, 10, 4, 0, TAU, Math.PI / 2, Math.PI / 2), C.dg2, [0, 2.6, 2.4]), part(cyl(2.2, 2.2, 0.15, 10), C.dg0, [0, 2.55, 2.4]),
          part(GEO.box, C.dg1, [0, 2.9, -2.4], [0.6, 0.35, 6.4], [-0.15, 0, 0]), part(GEO.ico0, C.wood1, [0, 3.4, -5.5], [0.6, 0.6, 1.3]), part(GEO.ico0, C.shine1, [-0.9, 2.7, 3.2], 0.4)];
      },
      hotteok: function () { // 호떡: 세워 굴러가는 원반(축 = x), 겉 노릇 + 설탕 반짝
        return xf([part(cyl(3.0, 3.0, 1.3, 12), C.be1, [0, 0, 0]), part(cyl(2.4, 2.4, 1.36, 10), C.be0, [0, 0, 0]), part(GEO.ico0, C.be3, [0.8, 0.7, 0.6], 0.45), part(GEO.ico0, C.be3, [-0.9, 0.7, -0.4], 0.4), part(GEO.ico0, C.be3, [0.1, -0.7, -1.0], 0.4), part(GEO.ico0, C.be3, [0.2, 0.7, 1.2], 0.35)], [0, 3.0, 0], [0, 0, Math.PI / 2]);
      },
      bungeo: function () { // 붕어빵: 금빛 물고기(머리 +z), 비늘 줄 + 눈
        return [part(GEO.ico1, C.be1, [0, 2.0, 0.4], [1.5, 2.1, 3.6]), part(cone(1.9, 2.4, 4), C.be0, [0, 2.0, -3.6], [1, 1, 0.4], [-Math.PI / 2, 0, Math.PI / 2]),
          part(GEO.box, C.be0, [0, 3.9, 0], [0.4, 1.0, 2.4]), part(GEO.box, C.be2, [0, 2.0, 1.0], [3.1, 0.3, 0.4]), part(GEO.box, C.be2, [0, 2.0, -1.0], [3.0, 0.3, 0.4]),
          part(GEO.ico0, C.ink1, [1.3, 2.7, 2.6], 0.35), part(GEO.ico0, C.ink1, [-1.3, 2.7, 2.6], 0.35)];
      },
      note: function () { // ♪ 음표(노래 취객 탄): 분홍 머리 + 줄기 + 깃발, 카메라 쪽으로 서 있다
        return xf([part(GEO.ico1, C.flP, [0, 0, 0], [1.6, 1.2, 0.8], [0, 0, 0.4]), part(GEO.box, C.flP, [1.3, 2.6, 0], [0.45, 5.2, 0.45]), part(GEO.box, C.flP, [2.2, 4.8, 0], [2.0, 0.7, 0.45], [0, 0, -0.5]), part(GEO.box, C.shine1, [-0.6, 0.5, 0.7], 0.35)], [-0.5, 3.4, 0], [-0.4, 0, 0]);
      },
    };
    var projGeometry = cache(PROJ, null, "proj");
    var PROP = { stool: function () { return stoolParts(0, 0); } }; // 의자 더 놓기(규칙 stools 카드) — 시안이 seatsFor(n) 자리에 찍는다
    var propGeometry = cache(PROP, null, "prop");

    // ══ 비 오는 밤 골목 ══════════════════════════════════════
    var W = 540;
    function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6d2b79f5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    function noise(x, z) { return Math.sin(x * 0.043 + 1.7) * Math.cos(z * 0.037 - 0.6) + 0.6 * Math.sin((x - z) * 0.061 + 0.4) + 0.4 * Math.sin(x * 0.13 + z * 0.11); }
    function makeGround(dawn) {
      var root = new THREE.Group(); root.name = "alley";
      var mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
      var R = rng(20261028);
      var LAMPS = [];
      for (var li = 0; li < 8; li++) { var la = li / 8 * TAU + 0.39; LAMPS.push({ x: 270 + Math.cos(la) * 182, z: 270 + Math.sin(la) * 182 }); }
      [[40, 40], [500, 40], [40, 500], [500, 500]].forEach(function (q) { LAMPS.push({ x: q[0], z: q[1] }); });
      // 바닥(2판): 색을 칸(삼각형)마다 끊지 않고 격자 꼭짓점마다 매끈한 두 겹 잡음으로 정해 사이를 섞는다(도깨비 2판과 같은 방식).
      // 삼각형마다 밝기만 ±4 % 흔들어 평면 음영 결은 남긴다. 물웅덩이는 둥근 자리 목록 → 꼭짓점 무게로 부드럽게 밝히고,
      // 가로등·가게 불빛 가까운 웅덩이만 따뜻하게 물든다. 보도(가장자리 30)는 칸 선에 맞춰 경계가 또렷하다(격자 10, 0·30·510·540 이 선).
      var X0 = -140, X1 = 680, N = 82, cell = (X1 - X0) / N, SW = 30;
      var pos = new Float32Array(N * N * 18), cN = new Float32Array(N * N * 18), cD = new Float32Array(N * N * 18), o = 0;
      function cc2(h) { return new THREE.Color(h); }
      var nA0 = cc2(C.asph0), nA1 = cc2(C.asph1), nP0 = cc2(C.pud0), nP1 = cc2(C.pud1), nGl = cc2(C.glint), nW0 = cc2(C.bo0), nW1 = cc2(C.bo1), nOut = cc2(C.asph0);
      var dA0 = cc2(C.bo1), dA1 = cc2(C.bo2), dP0 = cc2(C.bo2), dP1 = cc2(C.cr0), dGl = cc2(C.cr1), dW0 = cc2(C.dg0), dW1 = cc2(C.dg1), dOut = cc2(C.bo0);
      // 웅덩이 자리(가운데 가게 바닥판 밖, 보도 안쪽)
      var PUD = [];
      while (PUD.length < 38) { var px = 40 + R() * (W - 80), pz = 40 + R() * (W - 80), dcp = Math.hypot(px - 270, pz - 270); if (dcp < 40) continue; PUD.push({ x: px, z: pz, r: 9 + R() * 11, sx: 0.7 + R() * 0.6 }); }
      [[232, 322, 13], [312, 314, 12], [214, 262, 10], [330, 250, 11], [270, 330, 9]].forEach(function (q) { PUD.push({ x: q[0], z: q[1], r: q[2], sx: 1.2 }); }); // 가게 앞 불빛 웅덩이
      function warmAt(x, z) { var w = Math.max(0, 1 - Math.hypot(x - 270, z - 285) / 95); for (var i = 0; i < LAMPS.length; i++) { var d = Math.hypot(LAMPS[i].x - x, LAMPS[i].z - z); if (d < 36) w = Math.max(w, 1 - d / 36); } return w; }
      var VN = [], VD = [], VWN = [], VWD = [];
      for (var vj = 0; vj <= N; vj++) for (var vi = 0; vi <= N; vi++) {
        var x = X0 + vi * cell, z = X0 + vj * cell, cn = new THREE.Color(), cd = new THREE.Color(), wn = new THREE.Color(), wd = new THREE.Color();
        var t = (noise(x, z) + 0.5 * Math.sin(x * 0.071 + 0.9) * Math.cos(z * 0.064 - 0.7)) / 1.9; t = t < -1 ? -1 : t > 1 ? 1 : t; t = (t + 1) / 2;
        if (x < -2 || z < -2 || x > W + 2 || z > W + 2) { cn.copy(nOut); cd.copy(dOut); }
        else {
          cn.copy(nA0).lerp(nA1, t); cd.copy(dA0).lerp(dA1, t);
          var pw = 0;
          for (var pi = 0; pi < PUD.length; pi++) { var P = PUD[pi], ex = (x - P.x) / (P.r * P.sx), ez = (z - P.z) / (P.r / P.sx), e = ex * ex + ez * ez; if (e < 1) pw = Math.max(pw, (1 - e) * (1 - e)); }
          if (pw > 0) {
            cn.lerp(nP0, Math.min(1, pw * 1.6)); cd.lerp(dP0, Math.min(1, pw * 1.6));
            cn.lerp(nP1, pw * 0.7); cd.lerp(dP1, pw * 0.6);
            var wm = warmAt(x, z); if (wm > 0) { cn.lerp(nGl, pw * wm * 0.55); cd.lerp(dGl, pw * wm * 0.3); }
          }
        }
        wn.copy(nW0).lerp(nW1, t); wd.copy(dW0).lerp(dW1, t);
        VN.push(cn); VD.push(cd); VWN.push(wn); VWD.push(wd);
      }
      for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
        var a00 = j * (N + 1) + i, a01 = (j + 1) * (N + 1) + i, tri2 = [[a00, a01, a00 + 1], [a00 + 1, a01, a01 + 1]];
        for (var k = 0; k < 2; k++) {
          var jit = 1 + (R() - 0.5) * 0.08, cx = 0, cz = 0;
          for (var q = 0; q < 3; q++) { var vk0 = tri2[k][q]; cx += X0 + (vk0 % (N + 1)) * cell; cz += X0 + Math.floor(vk0 / (N + 1)) * cell; }
          cx /= 3; cz /= 3;
          var walk = cx > 0 && cx < W && cz > 0 && cz < W && (cx < SW || cx > W - SW || cz < SW || cz > W - SW);
          for (q = 0; q < 3; q++) {
            var vk = tri2[k][q], vx = X0 + (vk % (N + 1)) * cell, vz = X0 + Math.floor(vk / (N + 1)) * cell, a = walk ? VWN[vk] : VN[vk], d = walk ? VWD[vk] : VD[vk];
            pos[o] = vx; pos[o + 1] = 0; pos[o + 2] = vz;
            cN[o] = a.r * jit; cN[o + 1] = a.g * jit; cN[o + 2] = a.b * jit; cD[o] = d.r * jit; cD[o + 1] = d.g * jit; cD[o + 2] = d.b * jit; o += 3;
          }
        }
      }
      var gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      var colAttr = new THREE.BufferAttribute(new Float32Array(cN), 3); gg.setAttribute("color", colAttr); gg.computeVertexNormals();
      var floor = new THREE.Mesh(gg, mat); floor.name = "street"; floor.receiveShadow = true; root.add(floor);

      function inst(name, geo, list, material) {
        var m = new THREE.InstancedMesh(geo, material || mat, list.length), ob = new THREE.Object3D();
        list.forEach(function (it, k) { ob.position.set(it.x, it.y || 0, it.z); ob.rotation.set(0, it.ry || 0, 0); ob.scale.setScalar(it.s || 1); ob.updateMatrix(); m.setMatrixAt(k, ob.matrix); });
        m.name = name; m.castShadow = true; m.receiveShadow = true; root.add(m); return m;
      }
      // 가림(코코 2판 방식): 카메라와 막내 사이의 키 큰 것을 반투명 인스턴스로 옮긴다
      var ghostMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.3, depthWrite: false });
      var occ = [];
      function occluder(name, geo, list, rad, hgt, pad) {
        var n = list.length, solid = inst(name, geo, list);
        var ghost = new THREE.InstancedMesh(geo, ghostMat, n);
        ghost.name = name + "Ghost"; ghost.count = 0; ghost.castShadow = false; ghost.renderOrder = 2; root.add(ghost);
        solid.frustumCulled = ghost.frustumCulled = false;
        solid.instanceMatrix.setUsage(THREE.DynamicDrawUsage); ghost.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        var M0 = new Float32Array(solid.instanceMatrix.array), X = new Float32Array(n), Z = new Float32Array(n), RR = new Float32Array(n), HH = new Float32Array(n), flag = new Uint8Array(n);
        for (var i = 0; i < n; i++) { X[i] = list[i].x; Z[i] = list[i].z; RR[i] = rad * (list[i].s || 1); HH[i] = hgt * (list[i].s || 1); }
        occ.push(function (px, pz, dx, dz, tanT) {
          var changed = false, i;
          for (i = 0; i < n; i++) {
            var vx = X[i] - px, vz = Z[i] - pz, along = vx * dx + vz * dz, lat = vx * dz - vz * dx; if (lat < 0) lat = -lat;
            var hy = flag[i] ? 10 : 0;
            var hit = along > -RR[i] - 6 - hy && along < (HH[i] + RR[i]) / tanT + pad + hy && lat < RR[i] + pad + hy ? 1 : 0;
            if (hit !== flag[i]) { flag[i] = hit; changed = true; }
          }
          if (!changed) return;
          var a = solid.instanceMatrix.array, b2 = ghost.instanceMatrix.array, ns = 0, ng = 0, k;
          for (i = 0; i < n; i++) {
            if (flag[i]) { for (k = 0; k < 16; k++) b2[ng * 16 + k] = M0[i * 16 + k]; ng++; }
            else { for (k = 0; k < 16; k++) a[ns * 16 + k] = M0[i * 16 + k]; ns++; }
          }
          solid.count = ns; ghost.count = ng; solid.instanceMatrix.needsUpdate = true; ghost.instanceMatrix.needsUpdate = true;
        });
        return solid;
      }
      // 둘레: 셔터 내린 가게 줄(앞 = +z 지역, 안쪽을 본다). 간판은 무늬만(글자 없음), 2층 창 불빛
      var shopRow = merge([
        part(GEO.box, C.night1, [0, 12, 0], [34, 24, 18]),
        part(GEO.box, C.bo0, [0, 24.6, 0], [35, 1.2, 19]),
        part(GEO.box, C.dg1, [0, 5.6, 9.1], [26, 11, 0.5]), // 셔터
        part(GEO.box, C.dg0, [0, 3.0, 9.4], [26, 0.4, 0.3]), part(GEO.box, C.dg0, [0, 5.0, 9.4], [26, 0.4, 0.3]), part(GEO.box, C.dg0, [0, 7.0, 9.4], [26, 0.4, 0.3]), part(GEO.box, C.dg0, [0, 9.0, 9.4], [26, 0.4, 0.3]),
        part(GEO.box, C.bo2, [0, 11.4, 9.2], [27, 0.8, 0.8]),
        part(GEO.box, C.flB, [0, 14.4, 9.5], [28, 4.2, 1.0]), // 간판 판
        part(cyl(1.2, 1.2, 0.4, 8), C.tee2, [-8, 14.4, 10.1], 1, [Math.PI / 2, 0, 0]), part(GEO.box, C.tee2, [2, 14.4, 10.1], [10, 1.0, 0.3]), // 간판 무늬(동그라미·줄)
        part(GEO.box, C.teal1, [0, 17.6, 10.6], [30, 0.5, 3.6], [0.35, 0, 0]), // 차양
        part(GEO.box, C.glow, [-8, 20.6, 9.2], [6, 3.6, 0.3]), part(GEO.box, C.lamp, [8, 20.6, 9.2], [6, 3.6, 0.3]), // 2층 창
        part(GEO.box, C.bo1, [-8, 20.6, 9.3], [0.4, 3.6, 0.35]), part(GEO.box, C.bo1, [8, 20.6, 9.3], [0.4, 3.6, 0.35]),
      ]);
      var rows = [], L = 36;
      for (var e = -L / 2; e <= W + L / 2; e += L) rows.push({ x: e, z: -14, ry: 0 }, { x: e, z: W + 14, ry: Math.PI }, { x: -14, z: e, ry: Math.PI / 2 }, { x: W + 14, z: e, ry: -Math.PI / 2 });
      var rowMesh = occluder("shopRows", shopRow, rows, 18, 24, 12);
      var tint = [C.tee2, C.su2, C.be3, C.cream3, C.tub1, C.su1], tc = new THREE.Color();
      for (var ri = 0; ri < rows.length; ri++) { tc.set(tint[ri % tint.length]); rowMesh.setColorAt(ri, tc); }
      // 가로등(키 26): 기둥·팔·갓 — 전구는 발광 재질 따로
      var lampGeo = merge([part(cyl(0.7, 1.0, 26, 6), C.bo1, [0, 13, 0]), part(cyl(1.8, 2.2, 1.2, 6), C.bo0, [0, 0.6, 0]), part(GEO.box, C.bo1, [0, 25.6, 2.4], [0.8, 0.8, 5.6]), part(cone(2.4, 1.6, 6), C.bo0, [0, 25.8, 5.0])]);
      var lampList = LAMPS.map(function (q) { return { x: q.x, z: q.z, ry: Math.atan2(270 - q.x, 270 - q.z) }; });
      occluder("lampPoles", lampGeo, lampList, 4, 27, 10);
      var bulbMat = new THREE.MeshLambertMaterial({ color: C.glow, emissive: C.lamp, emissiveIntensity: 1.4, flatShading: true });
      var bulb = new THREE.IcosahedronGeometry(1.7, 1); bulb.translate(0, 24.4, 5.0);
      var bulbs = inst("lampBulbs", bulb, lampList, bulbMat); bulbs.castShadow = false;
      // 자판기(글자·상표 없음): 빨간 몸 + 빛나는 진열창 + 꼬마 상품 칸
      var vend = merge([
        part(GEO.box, C.btn0, [0, 7.5, 0], [8, 15, 6]), part(GEO.box, C.glow, [0, 10.2, 3.05], [6.4, 6.4, 0.2]),
        part(GEO.box, C.flB, [-2, 11.6, 3.2], [1.4, 1.8, 0.3]), part(GEO.box, C.flY, [0, 11.6, 3.2], [1.4, 1.8, 0.3]), part(GEO.box, C.flP, [2, 11.6, 3.2], [1.4, 1.8, 0.3]),
        part(GEO.box, C.teal2, [-2, 8.8, 3.2], [1.4, 1.8, 0.3]), part(GEO.box, C.btn1, [0, 8.8, 3.2], [1.4, 1.8, 0.3]), part(GEO.box, C.purp2, [2, 8.8, 3.2], [1.4, 1.8, 0.3]),
        part(GEO.box, C.ink1, [0, 3.0, 3.05], [5.6, 2.0, 0.3]), part(GEO.box, C.dg2, [2.6, 6.2, 3.1], [0.8, 1.4, 0.3]), part(GEO.box, C.tee2, [0, 15.3, 0], [8.2, 0.6, 6.2]),
      ]);
      var vends = [{ x: 140, z: 9, ry: 0 }, { x: 150, z: 9, ry: 0 }, { x: 395, z: 9, ry: 0 }, { x: 9, z: 200, ry: Math.PI / 2 }, { x: 531, z: 330, ry: -Math.PI / 2 }, { x: 531, z: 120, ry: -Math.PI / 2 }, { x: 9, z: 410, ry: Math.PI / 2 }];
      occluder("vending", vend, vends, 5, 15, 8);
      // 낮은 것(한 덩어리로 굽는다): 연석, 횡단보도, 맨홀, 플라스틱 상자 더미, 화분, 꼬깔
      var low = [];
      function put(parts, x, z, ry, s) { low = low.concat(xf(parts, [x, 0, z], [0, ry || 0, 0], s || 1)); }
      // 연석: 보도 안쪽 테(횡단보도 자리는 비움)
      for (var c = 30; c < W - 30; c += 12) {
        var gapS = c > 236 && c < 304, gapW = c > 236 && c < 304;
        low.push(part(GEO.box, C.dg1, [c + 6, 0.6, 30], [12.4, 1.2, 1.6]));
        if (!gapS) low.push(part(GEO.box, C.dg1, [c + 6, 0.6, W - 30], [12.4, 1.2, 1.6]));
        if (!gapW) low.push(part(GEO.box, C.dg1, [30, 0.6, c + 6], [1.6, 1.2, 12.4]));
        low.push(part(GEO.box, C.dg1, [W - 30, 0.6, c + 6], [1.6, 1.2, 12.4]));
      }
      // 횡단보도 둘(남쪽 가장자리 앞, 서쪽 가장자리 앞)
      for (var s2 = 0; s2 < 7; s2++) { low.push(part(GEO.box, C.dg3, [242 + s2 * 9.4, 0.08, W - 48], [4.6, 0.16, 30])); low.push(part(GEO.box, C.dg3, [48, 0.08, 242 + s2 * 9.4], [30, 0.16, 4.6])); }
      [[180, 120], [380, 410], [120, 330], [430, 200], [300, 470]].forEach(function (q) { low.push(part(cyl(3.2, 3.2, 0.2, 10), C.bo1, [q[0], 0.1, q[1]])); low.push(part(torus(2.2, 0.25, 3, 10), C.bo0, [q[0], 0.25, q[1]], 1, [Math.PI / 2, 0, 0])); });
      var crate = function (hex, y, r) { return [part(GEO.box, hex, [0, y + 1.8, 0], [6, 3.6, 4.4], [0, r, 0]), part(GEO.box, C.night0, [0, y + 2.4, 0], [5.0, 1.0, 4.6], [0, r, 0]), part(GEO.box, C.night0, [0, y + 2.4, 0], [6.2, 1.0, 3.4], [0, r, 0])]; };
      var CR = [C.btn0, C.teal1, C.flB, C.va2];
      var cratePos = [[60, 14], [300, 14], [470, 16], [16, 90], [16, 330], [524, 250], [524, 450], [90, 524], [200, 526], [440, 526], [160, 120], [400, 150], [130, 420], [420, 400]];
      cratePos.forEach(function (q, k) { var n2 = 1 + (k % 3), cs = []; for (var h = 0; h < n2; h++) cs = cs.concat(crate(CR[(k + h) % 4], h * 3.6, (h % 2) * 0.35)); put(cs, q[0], q[1], R() * TAU); });
      var plant = [part(cyl(2.4, 1.8, 3.4, 8), C.wood1, [0, 1.7, 0]), part(GEO.ico1, C.g0, [0, 5.2, 0], [3.0, 2.6, 3.0]), part(GEO.ico0, C.g1, [1.6, 6.6, 0.6], 1.8), part(GEO.ico0, C.g2, [-1.4, 6.4, -0.8], 1.6), part(GEO.ico0, C.flP, [0.4, 7.6, 0.8], 0.6)];
      [[100, 12], [230, 12], [350, 12], [12, 150], [12, 470], [528, 190], [528, 400], [180, 528], [360, 528], [470, 90], [100, 470]].forEach(function (q) { put(plant.map(function (g) { return g.clone(); }), q[0], q[1], R() * TAU, 0.9 + R() * 0.3); });
      var tcone = [part(cyl(2.0, 2.0, 0.4, 8), C.tarp0, [0, 0.2, 0]), part(cone(1.5, 4.6, 8), C.tarp1, [0, 2.7, 0]), part(cyl(1.0, 1.25, 0.8, 8), C.tee2, [0, 2.6, 0])];
      [[230, W - 70], [318, W - 70], [70, 230], [70, 318]].forEach(function (q) { put(tcone.map(function (g) { return g.clone(); }), q[0], q[1], 0, 1); });
      plant.forEach(function (g) { g.dispose(); }); tcone.forEach(function (g) { g.dispose(); });
      var lowMesh = new THREE.Mesh(merge(low), mat); lowMesh.name = "lowProps"; lowMesh.receiveShadow = true; root.add(lowMesh);

      var lastDawn = -1, cA = colAttr.array;
      function setDawn(v) {
        var d = Math.max(0, Math.min(1, v || 0));
        if (Math.abs(d - lastDawn) < 0.004) return;
        lastDawn = d;
        var w = d * d * (3 - 2 * d) * 0.85;
        for (var i = 0; i < cA.length; i++) cA[i] = cN[i] + (cD[i] - cN[i]) * w;
        colAttr.needsUpdate = true;
        bulbMat.emissiveIntensity = 1.4 * (1 - d);
      }
      setDawn(dawn);
      function occlude(px, pz, cam) {
        var dx = cam.x - px, dz = cam.z - pz, hd = Math.sqrt(dx * dx + dz * dz);
        if (hd < 1e-3) { dx = 0; dz = 1; hd = 1e-3; } else { dx /= hd; dz /= hd; }
        var tanT = Math.max(0.2, cam.y / hd);
        for (var i = 0; i < occ.length; i++) occ[i](px, pz, dx, dz, tanT);
      }
      root.userData.drawCalls = root.children.length;
      return { root: root, setDawn: setDawn, occlude: occlude, lamps: LAMPS };
    }

    // ══ 비: 기운 빗줄기 n 개(InstancedMesh 하나). 카메라 표적 둘레 상자 안에서 떨어지고 넘치면 감긴다 ══
    function makeRain(n, opt) {
      n = n || 600; opt = opt || {};
      var BW = opt.w || 220, BD = opt.d || 220, BH = opt.h || 120, SPD = opt.speed || 170, WIND = opt.wind || 0.22;
      var geo = new THREE.PlaneGeometry(0.42, 8.5); // 카메라 쪽(+z)을 보는 가는 띠
      var mat = new THREE.MeshBasicMaterial({ color: C.su1, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
      var mesh = new THREE.InstancedMesh(geo, mat, n); mesh.name = "rain"; mesh.frustumCulled = false; mesh.renderOrder = 5;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      var R = rng(77), X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n), S = new Float32Array(n);
      var ob = new THREE.Object3D();
      for (var i = 0; i < n; i++) {
        X[i] = R() * BW; Y[i] = R() * BH; Z[i] = R() * BD; S[i] = 0.8 + R() * 0.45;
        ob.position.set(0, 0, 0); ob.rotation.set(0, 0, WIND); ob.scale.set(1, S[i], 1); ob.updateMatrix(); mesh.setMatrixAt(i, ob.matrix);
      }
      var A = mesh.instanceMatrix.array;
      function wrap(v, m) { v %= m; return v < 0 ? v + m : v; }
      function update(t, cx, cz, reduce) {
        var x0 = cx - BW / 2, z0 = cz - BD / 2, fall = reduce ? 0 : t * SPD;
        mesh.count = reduce ? Math.floor(n * 0.35) : n;
        for (var i = 0; i < mesh.count; i++) {
          var y = BH - wrap(Y[i] + fall * S[i], BH);
          var x = x0 + wrap(X[i] + fall * S[i] * WIND - x0, BW), z = z0 + wrap(Z[i] - z0, BD);
          A[i * 16 + 12] = x; A[i * 16 + 13] = y + 4; A[i * 16 + 14] = z;
        }
        mesh.instanceMatrix.needsUpdate = true;
        mat.opacity = reduce ? 0.3 : 0.42;
      }
      update(0, 270, 270, false);
      return { mesh: mesh, update: update };
    }

    return {
      makeHero: makeHero, makeShop: makeShop, guestGeometry: guestGeometry, enemyGeometry: enemyGeometry, pickupGeometry: pickupGeometry, projGeometry: projGeometry, propGeometry: propGeometry,
      makeGround: makeGround, makeRain: makeRain, seatsFor: seatsFor, blobTexture: Surv3D.blobTexture,
      GUEST_KINDS: Object.keys(GUEST), ENEMY_KINDS: Object.keys(ENEMY), PICKUP_KINDS: Object.keys(PICK), PROJ_KINDS: Object.keys(PROJ),
      PALETTE: C, triCount: triCount,
    };
  }

  window.Pocha3D = { build: build };
})();
