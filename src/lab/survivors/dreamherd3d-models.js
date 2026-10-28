// @ts-nocheck — 디자인 세션 정본 docs/lab-surv-dreamherd-3d.js 를 그대로 옮긴 것(tmp/lab-surv/sync-src.sh).
/* 코코의 꿈 양몰이 3D — 로우폴리 모델 (1판, 2026-10-28)
 * 고전 스크립트: window.Dream3D = { build(THREE, Surv3D) → api }. Surv3D 는 window.Surv3D.build(THREE) 의 결과(코코 모델 재사용).
 * 좌표: 월드 단위 그대로. 규칙 x → three x, 규칙 y → three z, 높이 = three y, 바닥 y = 0, 월드 0..540. 원점 = 발밑 중앙, +z 가 앞.
 * 색은 docs/lab-surv-coco-hd-artdir.md 3절 표의 hex 만 쓴다(밤은 저녁·보라·보스 원반 줄). 아트 디렉션 docs/lab-surv-dreamherd-3d-artdir.md.
 */
(function () {
  "use strict";

  var C = {
    // 밤·새벽
    night0: "#2a2858", night1: "#3d3a7a", disc0: "#3e4260", disc1: "#5a5f7a", disc2: "#8a90ad",
    purp0: "#6a3fb8", purp1: "#8b5cd6", purp2: "#b99af0",
    dusk0: "#ff8fa3", dusk1: "#ffb38a", morning: "#bfe6ff", noon: "#9fd8ff",
    gold: "#ffd36b", goldHi: "#fff0b8", lamp: "#ffd36b",
    // 양털·크림
    cream0: "#c9a27a", cream1: "#e8c9a0", cream2: "#f6e3c4", cream3: "#fff4e3", shine0: "#fff6e8", shine1: "#fffbf4",
    tee2: "#f8f4ec", tub0: "#cdd6e4", tub1: "#f3f6fb", cr0: "#9aa6bd", cr1: "#dfe6f2",
    ink0: "#24161d", ink1: "#3a2228", ink2: "#5a3a42",
    blush: "#ffb3bd", tongue1: "#f07a8a", tongue0: "#d9546a",
    flY: "#ffd166", flP: "#ff8fb1", flB: "#8fd3ff",
    be0: "#a8742a", be1: "#e0a640", be2: "#ffcf4d", be3: "#ffe9a3", btn0: "#c43a48", btn1: "#ff5d5d",
    su0: "#9ec9ee", su1: "#cfe8fb", su2: "#eef8ff", suR1: "#b9a6ff", suR2: "#8fe3ff", suR3: "#ffd1f0",
    water: "#7fd4ff", g3: "#9bdc7c",
  };

  function build(THREE, Surv3D) {
    var V3 = THREE.Vector3, TAU = Math.PI * 2;
    var GEO = {
      ico0: new THREE.IcosahedronGeometry(1, 0), ico1: new THREE.IcosahedronGeometry(1, 1),
      box: new THREE.BoxGeometry(1, 1, 1),
    };
    function ball(w, h) { return new THREE.SphereGeometry(1, w, h); }
    function cyl(rt, rb, h, seg) { return new THREE.CylinderGeometry(rt, rb, h, seg || 8, 1); }
    function triCount(g) { return (g.index ? g.index.count : g.attributes.position.count) / 3; }
    // 다섯 뿔 별(납작한 기둥) — 10 점, 덮개 둘 + 옆면
    function starGeo(r, depth) {
      var s = new THREE.Shape();
      for (var i = 0; i < 10; i++) { var a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      var g = new THREE.ExtrudeGeometry(s, { depth: depth, bevelEnabled: false, curveSegments: 1 });
      g.translate(0, 0, -depth / 2);
      return g;
    }
    // 정점 색 부품 · 합치기
    var _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
    function part(geo, hex, pos, scl, rot) {
      var g = geo.index ? geo.toNonIndexed() : geo.clone();
      _e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0); _q.setFromEuler(_e);
      var s = scl == null ? [1, 1, 1] : typeof scl === "number" ? [scl, scl, scl] : scl;
      _m.compose(new V3(pos[0], pos[1], pos[2]), _q, new V3(s[0], s[1], s[2]));
      g.applyMatrix4(_m);
      g.deleteAttribute("uv");
      var n = g.attributes.position.count, col = new Float32Array(n * 3), c = new THREE.Color(hex);
      for (var i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      return g;
    }
    function merge(parts) {
      var total = 0, i;
      for (i = 0; i < parts.length; i++) total += parts[i].attributes.position.count;
      var pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3), o = 0;
      for (i = 0; i < parts.length; i++) {
        var g = parts[i], n = g.attributes.position.count;
        pos.set(g.attributes.position.array, o * 3);
        if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
        col.set(g.attributes.color.array, o * 3);
        o += n; g.dispose();
      }
      var out = new THREE.BufferGeometry();
      out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      out.setAttribute("color", new THREE.BufferAttribute(col, 3));
      out.computeBoundingSphere(); out.computeBoundingBox();
      return out;
    }
    function cache(table) {
      var memo = {};
      return function (kind) {
        if (memo[kind]) return memo[kind];
        var f = table[kind]; if (!f) throw new Error("Dream3D: " + kind);
        var g = merge(f());
        return (memo[kind] = { geometry: g, height: g.boundingBox.max.y });
      };
    }
    function eyes(p, x, y, z, r, gap, hex, shine) {
      p.push(part(GEO.ico0, hex || C.ink0, [x + gap, y, z], [r, r * 1.15, r * 0.6]));
      p.push(part(GEO.ico0, hex || C.ink0, [x - gap, y, z], [r, r * 1.15, r * 0.6]));
      if (shine) {
        p.push(part(GEO.box, C.shine1, [x + gap - r * 0.3, y + r * 0.35, z + r * 0.5], r * 0.4));
        p.push(part(GEO.box, C.shine1, [x - gap - r * 0.3, y + r * 0.35, z + r * 0.5], r * 0.4));
      }
    }

    // ══ 코코(꿈 판): Surv3D 코코 + 별무늬 고깔 수면 모자 + 목 방울 ══════
    function makeCoco() {
      var base = Surv3D.makeCoco("tee"); // 잠옷 느낌으로 흰 티
      var head = base.root.getObjectByName("head"), hip = base.root.getObjectByName("hip");
      var mats = {};
      function M(hex) { return mats[hex] || (mats[hex] = new THREE.MeshLambertMaterial({ color: hex, flatShading: true })); }
      // 모자: 머리 위에 뒤로 기운 고깔 + 테 + 끝 방울 + 별 셋(머리 지역 좌표, 머리 배율을 따라간다)
      var cap = new THREE.Group(); cap.name = "nightcap"; cap.position.set(0, 4.0, -1.6); cap.rotation.set(-0.7, 0, 0.4); head.add(cap);
      var cone = new THREE.Mesh(new THREE.ConeGeometry(2.7, 6.4, 9), M(C.dusk0)); cone.position.y = 3.0; cap.add(cone); // 분홍 고깔: 남보라 들판 위에서 코코 머리가 먼저 보이게
      var brim = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.6, 3, 10), M(C.cream3)); brim.rotation.x = Math.PI / 2; brim.position.y = 0.1; cap.add(brim);
      var pom = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), M(C.cream3)); pom.position.set(0, 6.3, 0); cap.add(pom);
      var sg = starGeo(0.9, 0.3);
      [[1.5, 1.8, 1.9, 0.5], [-1.6, 2.8, 1.1, -0.6], [0.3, 2.0, -2.2, 3.0]].forEach(function (s) {
        var m = new THREE.Mesh(sg, M(C.goldHi)); m.position.set(s[0], s[1], s[2]); m.rotation.y = s[3]; m.lookAt(m.position.x * 3, s[1], s[2] * 3); cap.add(m);
      });
      // 목 방울: 가슴 앞
      var bell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), M(C.be1)); bell.position.set(0, 1.6, 9.9); hip.add(bell);
      var slit = new THREE.Mesh(GEO.box, M(C.be0)); slit.scale.set(1.2, 0.2, 0.3); slit.position.set(0, 1.35, 10.75); hip.add(slit);
      function pose(t, name, poseT, o) {
        base.pose(t, name, poseT, o);
        // 걸을 때 모자 끝이 살랑, 낮잠이면 눈 위로 흘러내림
        cap.rotation.x = name === "nap" ? -0.2 : -0.7 + (name === "walk" ? 0.08 * Math.sin(t * 9) : 0);
        cap.rotation.z = 0.4 + (name === "walk" ? 0.06 * Math.sin(t * 9 + 1) : 0);
        var hurt = o && (o.hurt === true ? 1 : +o.hurt || 0);
        for (var k in mats) { mats[k].emissive.set(C.cream3); mats[k].emissiveIntensity = (hurt || 0) * 0.55; }
      }
      pose(0, "sit", 1, {});
      // 주인공이 양(몸 10)·털뭉치 사이에서 먼저 보이게 1.12배. Surv3D pose 는 root 배율을 건드리지 않고,
      // root.rotation.y(진행 방향)로 머리를 카메라 쪽으로 돌리므로 감싸지 않고 같은 root 를 넘긴다.
      base.root.scale.setScalar(1.12);
      return { root: base.root, pose: pose };
    }

    // ══ 양(≤ 300) ════════════════════════════════════════════
    // 몸 약 10(앞뒤) × 8(옆), 높이 약 8. 위에서 둥근 크림 양털 + 앞에 짙은 얼굴.
    function sheepBase(wool, woolHi, opts) {
      opts = opts || {};
      var p = [];
      p.push(part(GEO.ico1, wool, [0, 4.6, -0.3], [4.0, 3.0, 4.6])); // 몸 양털
      // 위·옆 곱슬(구름처럼 둥근 윤곽)
      [[0, 7.0, -0.4, 2.0], [2.4, 6.0, 0.2, 1.8], [-2.4, 6.0, 0.2, 1.8], [0, 6.2, -3.2, 1.8]].forEach(function (c, i) {
        p.push(part(ball(5, 3), i === 0 ? woolHi : wool, [c[0], c[1], c[2]], c[3] * (opts.puff || 1)));
      });
      // 얼굴(짙은 갈색 — 검정 대신) + 귀 + 눈 반짝
      var hy = opts.headY || 5.2, hz = 4.2;
      p.push(part(ball(5, 3), C.ink2, [0, hy, hz], [1.7, 1.9, 1.6], [opts.headTilt || 0, opts.headYaw || 0, 0]));
      p.push(part(GEO.box, C.ink1, [2.0, hy + 0.6, hz - 0.6], [1.6, 0.6, 0.9], [0, 0, -0.5]));
      p.push(part(GEO.box, C.ink1, [-2.0, hy + 0.6, hz - 0.6], [1.6, 0.6, 0.9], [0, 0, 0.5]));
      p.push(part(GEO.box, C.shine1, [0.7 + (opts.headYaw || 0) * 1.5, hy + 0.5, hz + 1.4], [0.45, 0.5, 0.3]));
      p.push(part(GEO.box, C.shine1, [-0.7 + (opts.headYaw || 0) * 1.5, hy + 0.5, hz + 1.4], [0.45, 0.5, 0.3]));
      // 다리: 앞뒤 한 쌍씩 짧은 기둥
      p.push(part(GEO.box, C.ink1, [0, 1.0, 2.1], [3.6, 2.0, 1.1]));
      p.push(part(GEO.box, C.ink1, [0, 1.0, -2.5], [3.6, 2.0, 1.1]));
      return p;
    }
    var SHEEP = {
      wool: function () { return sheepBase(C.cream3, C.shine1); },
      horn: function () { // 뿔양: 금빛 말린 뿔
        var p = sheepBase(C.cream2, C.cream3);
        p.push(part(new THREE.TorusGeometry(1.0, 0.45, 3, 4, Math.PI * 1.4), C.be1, [1.9, 6.4, 4.0], 1, [0, Math.PI / 2, 0.3]));
        p.push(part(new THREE.TorusGeometry(1.0, 0.45, 3, 4, Math.PI * 1.4), C.be1, [-1.9, 6.4, 4.0], 1, [0, -Math.PI / 2, -0.3]));
        return p;
      },
      puff: function () { // 솜털양: 더 부푼 분홍빛 양털
        var p = sheepBase(C.suR3, C.shine1, { puff: 1.2 });
        p.push(part(GEO.ico0, C.blush, [1.3, 4.8, 5.4], [0.5, 0.35, 0.2]));
        p.push(part(GEO.ico0, C.blush, [-1.3, 4.8, 5.4], [0.5, 0.35, 0.2]));
        return p;
      },
      star: function () { // 꿈양: 하늘빛 양털 + 등에 금별
        var p = sheepBase(C.su1, C.su2);
        p.push(part(starGeo(2.0, 0.8), C.gold, [0, 8.5, -0.6], 1, [-Math.PI / 2, 0, 0]));
        return p;
      },
      stray: function () { // 헤매는 양: 두리번(고개 옆으로) + 땀방울
        var p = sheepBase(C.cream3, C.shine1, { headYaw: 0.55, headTilt: -0.25, headY: 5.6 });
        p.push(part(ball(5, 3), C.flB, [-2.4, 8.4, 4.0], [0.7, 1.0, 0.7]));
        p.push(part(new THREE.ConeGeometry(0.62, 1.1, 5), C.flB, [-2.4, 9.4, 4.0]));
        return p;
      },
    };
    var sheepGeometry = cache(SHEEP);

    // ══ 적(≤ 300, 보스 ≤ 2,000) ════════════════════════════════
    // 지름 = 규칙 반경 × 2 × 약 1.25. 무섭지 않게: 둥근 몸, 큰 눈, 작은 발.
    var ENEMY = {
      fluff: function () { // 그림자 털뭉치(8): 남보라 털공 + 금빛 큰 눈
        var p = [part(GEO.ico1, C.purp0, [0, 3.8, 0], [3.6, 3.3, 3.6])];
        [[2.6, 5.4, -1], [-2.6, 5.4, -1], [0, 6.6, -1.6], [2.8, 3.0, -2.2], [-2.8, 3.0, -2.2]].forEach(function (c, i) { p.push(part(GEO.ico0, i < 3 ? C.purp1 : C.purp0, c, 1.4)); });
        eyes(p, 0, 4.4, 3.1, 0.75, 1.15, C.gold, false);
        p.push(part(GEO.box, C.ink0, [1.15, 4.4, 3.55], [0.35, 0.6, 0.2])); // 동공
        p.push(part(GEO.box, C.ink0, [-1.15, 4.4, 3.55], [0.35, 0.6, 0.2]));
        p.push(part(GEO.box, C.purp0, [1.4, 0.4, 1.0], [1.2, 0.8, 1.6]));
        p.push(part(GEO.box, C.purp0, [-1.4, 0.4, 1.0], [1.2, 0.8, 1.6]));
        return p;
      },
      clock: function () { // 번개 꼬마(9): 작은 먹구름 + 노란 번개 꼬리
        var p = [part(GEO.ico1, C.cr0, [0, 6.2, 0], [3.0, 2.2, 2.6]), part(ball(5, 3), C.disc2, [2.4, 6.4, -0.3], 1.8), part(ball(5, 3), C.disc2, [-2.4, 6.0, 0.2], 1.6), part(ball(5, 3), C.cr1, [0.6, 7.8, -0.6], 1.6)];
        // 번개(지그재그 셋)
        p.push(part(GEO.box, C.flY, [0.3, 3.6, 0.6], [0.8, 2.4, 0.5], [0, 0, 0.5]));
        p.push(part(GEO.box, C.flY, [-0.2, 2.0, 0.6], [0.8, 1.8, 0.5], [0, 0, -0.6]));
        p.push(part(GEO.box, C.be2, [0.3, 0.7, 0.6], [0.6, 1.4, 0.4], [0, 0, 0.5]));
        eyes(p, 0, 6.4, 2.3, 0.55, 0.9, C.ink0, true);
        return p;
      },
      fluff_sleep: function () { // 우리 안에서 잠든 털뭉치(같은 몸, 눈 감음 — 시안이 우리에 갇힌 동안 바꿔 그린다)
        var p = [part(GEO.ico1, C.purp0, [0, 3.4, 0], [3.8, 2.8, 3.8])];
        [[2.6, 4.8, -1], [-2.6, 4.8, -1], [0, 5.8, -1.6], [2.8, 2.6, -2.2], [-2.8, 2.6, -2.2]].forEach(function (c, i) { p.push(part(GEO.ico0, i < 3 ? C.purp1 : C.purp0, c, 1.4)); });
        p.push(part(GEO.box, C.goldHi, [1.15, 3.8, 3.3], [1.3, 0.3, 0.3], [0, 0, -0.15]));
        p.push(part(GEO.box, C.goldHi, [-1.15, 3.8, 3.3], [1.3, 0.3, 0.3], [0, 0, 0.15]));
        p.push(part(GEO.ico0, C.blush, [0, 2.6, 3.4], [0.5, 0.35, 0.2]));
        return p;
      },
      hand: function () { // 땅에서 솟는 폭죽(12): 빨간 통 + 금 띠 + 심지 불꽃 + 얼굴
        var p = [part(cyl(2.6, 2.8, 8.0, 8), C.btn0, [0, 4.0, 0]), part(cyl(2.7, 2.7, 1.0, 8), C.be1, [0, 2.2, 0]), part(cyl(2.7, 2.7, 1.0, 8), C.be1, [0, 6.6, 0])];
        p.push(part(new THREE.ConeGeometry(2.8, 2.6, 8), C.btn1, [0, 9.3, 0]));
        p.push(part(cyl(0.25, 0.25, 1.6, 4), C.be0, [0, 11.2, 0]));
        p.push(part(starGeo(1.2, 0.5), C.gold, [0, 12.6, 0], 1, [0, 0, 0.3]));
        eyes(p, 0, 4.6, 2.65, 0.6, 1.0, C.ink0, true);
        p.push(part(GEO.box, C.ink1, [0, 3.4, 2.75], [1.0, 0.35, 0.2]));
        return p;
      },
      hand_rise: function () { // 예고: 땅에 꽂힌 심지가 탄다(흙 둔덕 + 짧은 심지 + 불꽃)
        var p = [part(ball(7, 3), C.disc1, [0, 0.4, 0], [3.4, 0.9, 3.4]), part(cyl(0.3, 0.3, 2.4, 4), C.be0, [0, 1.6, 0], 1, [0.2, 0, 0.1])];
        p.push(part(starGeo(1.1, 0.5), C.gold, [0.3, 3.2, 0.3]));
        p.push(part(GEO.ico0, C.goldHi, [0.3, 3.2, 0.6], 0.5));
        [[1.8, 1.2], [-1.6, 1.5], [0.4, -1.9]].forEach(function (s) { p.push(part(GEO.box, C.flY, [s[0], 0.9, s[1]], 0.5, [0.6, 0.6, 0])); });
        return p;
      },
      closet: function () { // 꿈속 욕조(18): 보라 테 욕조 + 거품 + 금 다리 + 졸린 얼굴
        var p = [part(cyl(7.0, 6.2, 6.6, 10), C.tub1, [0, 5.4, 0], [1.25, 1, 1])];
        p.push(part(new THREE.TorusGeometry(7.0, 0.7, 3, 10), C.purp2, [0, 8.7, 0], [1.25, 1, 1], [Math.PI / 2, 0, 0]));
        [[0, 9.8, 0, 3.4, C.su1], [-4.6, 9.4, -0.6, 2.6, C.su2], [4.4, 9.4, 0.6, 2.6, C.su0], [1.4, 12.2, -1.2, 1.8, C.su2]].forEach(function (b) { p.push(part(ball(5, 3), b[4], [b[0], b[1], b[2]], b[3])); });
        [[5.6, 3.6], [-5.6, 3.6], [5.6, -3.6], [-5.6, -3.6]].forEach(function (f) { p.push(part(GEO.box, C.be1, [f[0], 1.0, f[1]], [1.8, 2.0, 1.8])); });
        // 졸린 반달 눈 + 입
        p.push(part(GEO.box, C.ink1, [2.3, 5.8, 7.2], [1.8, 0.45, 0.3]));
        p.push(part(GEO.box, C.ink1, [-2.3, 5.8, 7.2], [1.8, 0.45, 0.3]));
        p.push(part(ball(5, 3), C.tongue1, [0, 3.9, 7.0], [1.0, 0.6, 0.4]));
        return p;
      },
      wolf: function () { // 짖는 개 그림자(14): 남보라 그림자 개, 뾰족 귀, 금빛 눈, 벌린 입
        var p = [part(ball(7, 5), C.night0, [0, 5.0, -1.4], [3.4, 3.2, 4.8])];
        p.push(part(ball(7, 5), C.night1, [0, 8.0, 3.4], [3.0, 2.8, 2.8]));
        p.push(part(ball(5, 3), C.purp2, [0, 7.0, 6.0], [1.5, 1.1, 1.6]));
        p.push(part(GEO.ico0, C.night0, [0, 7.6, 7.5], 0.6));
        p.push(part(ball(5, 3), C.tongue1, [0, 6.0, 6.2], [0.9, 0.5, 0.8]));
        p.push(part(new THREE.ConeGeometry(1.3, 3.2, 4), C.night1, [1.8, 11.0, 2.8], 1, [0, 0.4, -0.3]));
        p.push(part(new THREE.ConeGeometry(1.3, 3.2, 4), C.night1, [-1.8, 11.0, 2.8], 1, [0, -0.4, 0.3]));
        [[1.8, 2.4], [-1.8, 2.4], [1.8, -4.0], [-1.8, -4.0]].forEach(function (l) { p.push(part(GEO.box, C.night1, [l[0], 1.4, l[1]], [1.2, 2.8, 1.2])); });
        p.push(part(new THREE.ConeGeometry(0.9, 3.6, 4), C.night1, [0, 6.8, -6.4], 1, [-1.0, 0, 0]));
        eyes(p, 0, 8.6, 5.9, 0.55, 1.2, C.gold, false);
        return p;
      },
      boss_wolf: function () { // 큰 개 그림자(36 정도): 같은 꼴을 크게 + 별 목걸이 + 갈기 털
        var p = [part(GEO.ico1, C.night0, [0, 12, -3.4], [8.5, 8.0, 12])];
        [[0, 18, -8, 4.2], [5.8, 15, -6, 3.6], [-5.8, 15, -6, 3.6], [0, 19.5, -1, 4.0], [6.4, 13, 2, 3.4], [-6.4, 13, 2, 3.4]].forEach(function (c) { p.push(part(GEO.ico1, C.night1, [c[0], c[1], c[2]], c[3])); });
        p.push(part(GEO.ico1, C.night1, [0, 19.5, 8.6], [7.2, 6.6, 6.6]));
        p.push(part(ball(8, 5), C.purp2, [0, 17.0, 14.6], [3.6, 2.6, 3.6]));
        p.push(part(GEO.ico1, C.night0, [0, 18.6, 18.0], 1.3));
        p.push(part(ball(6, 4), C.tongue1, [0, 14.6, 14.8], [2.2, 1.2, 2.0]));
        p.push(part(new THREE.ConeGeometry(3.0, 8.0, 5), C.night1, [4.4, 27.4, 7.2], 1, [0, 0.4, -0.3]));
        p.push(part(new THREE.ConeGeometry(3.0, 8.0, 5), C.night1, [-4.4, 27.4, 7.2], 1, [0, -0.4, 0.3]));
        [[4.4, 6], [-4.4, 6], [4.4, -11], [-4.4, -11]].forEach(function (l) { p.push(part(cyl(2.2, 2.6, 7, 6), C.night1, [l[0], 3.5, l[1]])); p.push(part(ball(6, 3), C.purp0, [l[0], 0.9, l[1] + 1.2], [2.8, 1.2, 3.2])); });
        p.push(part(new THREE.ConeGeometry(2.2, 9, 5), C.purp1, [0, 16, -16], 1, [-1.0, 0, 0]));
        p.push(part(new THREE.TorusGeometry(6.4, 0.9, 4, 14), C.be1, [0, 14.6, 7.0], [1, 1, 1], [Math.PI / 2 - 0.3, 0, 0]));
        p.push(part(starGeo(2.2, 0.9), C.gold, [0, 11.2, 13.4], 1, [-0.3, 0, 0]));
        eyes(p, 0, 21.2, 14.2, 1.4, 2.8, C.gold, false);
        p.push(part(GEO.box, C.ink0, [2.8, 21.2, 15.2], [0.6, 1.4, 0.3]));
        p.push(part(GEO.box, C.ink0, [-2.8, 21.2, 15.2], [0.6, 1.4, 0.3]));
        return p;
      },
      boss_dark: function () { // 가장 긴 밤(40 정도): 이불처럼 펼친 그림자 + 별 눈 + 초승달 + 물결 자락
        var p = [];
        // 이불: 가운데 볼록 + 둘레 자락 공 12개(물결 윤곽)
        p.push(part(GEO.ico1, C.night1, [0, 9, 0], [16, 8, 15]));
        for (var i = 0; i < 12; i++) { var a = i / 12 * TAU; p.push(part(ball(7, 4), i % 2 ? C.night0 : C.purp0, [Math.cos(a) * 17, 3.2 + (i % 3) * 0.6, Math.sin(a) * 16], [5.2, 3.0, 5.2])); }
        p.push(part(GEO.ico1, C.purp0, [0, 15, -3], [10, 4.5, 9]));
        // 별 눈 둘 + 졸린 입
        p.push(part(starGeo(3.0, 1.0), C.gold, [5.2, 13.6, 12.6], 1, [-0.5, 0, 0.2]));
        p.push(part(starGeo(3.0, 1.0), C.gold, [-5.2, 13.6, 12.6], 1, [-0.5, 0, -0.2]));
        p.push(part(ball(8, 4), C.night0, [0, 8.4, 14.4], [3.6, 1.4, 1.0]));
        // 위의 초승달·작은 별
        p.push(part(new THREE.TorusGeometry(3.4, 1.1, 4, 12, Math.PI * 1.25), C.goldHi, [-7, 21, -4], 1, [0, 0.3, 0.9]));
        [[8, 19, -6], [2, 22, -8], [12, 14, -2], [-12, 15, 2]].forEach(function (s) { p.push(part(starGeo(1.3, 0.5), C.goldHi, s, 1, [0, s[0] * 0.1, 0.2])); });
        return p;
      },
    };
    var enemyGeometry = cache(ENEMY);

    // ══ 줍기·탄(≤ 120) ══════════════════════════════════════
    var PICK = {
      dust: function () { return [part(starGeo(1.6, 0.6), C.gold, [0, 2.0, 0], 1, [-0.4, 0, 0]), part(GEO.ico0, C.goldHi, [0, 2.0, 0.4], 0.5)]; },
      dust_big: function () { return [part(starGeo(3.0, 1.0), C.gold, [0, 3.4, 0], 1, [-0.4, 0, 0]), part(starGeo(1.6, 1.3), C.goldHi, [0, 3.4, 0.3], 1, [-0.4, 0, 0])]; },
      milk: function () { // 따뜻한 우유: 흰 컵 + 분홍 띠 + 김
        return [part(cyl(1.9, 1.6, 3.6, 8), C.tee2, [0, 1.8, 0]), part(cyl(1.95, 1.95, 0.8, 8), C.flP, [0, 2.1, 0]), part(new THREE.TorusGeometry(0.8, 0.28, 3, 4), C.tee2, [2.0, 2.0, 0]), part(ball(4, 3), C.cr1, [0.3, 4.9, 0], [0.6, 0.9, 0.6])];
      },
      bell: function () { // 목동 방울: 금 방울 + 빨간 끈
        return [part(ball(7, 4), C.be1, [0, 2.4, 0], [2.0, 2.1, 2.0]), part(cyl(2.1, 2.1, 0.5, 7), C.be0, [0, 1.0, 0]), part(GEO.ico0, C.be0, [0, 0.6, 0], 0.6), part(new THREE.TorusGeometry(0.8, 0.3, 3, 4), C.btn0, [0, 4.6, 0], 1, [0, 0, 0])];
      },
    };
    var PROJ = {
      ball: function () { // 꿈 공: 보라 공 + 금 띠
        var p = [part(ball(8, 6), C.purp2, [0, 2.2, 0], 2.2)], pp = p[0], pos = pp.attributes.position, col = pp.attributes.color, y = new THREE.Color(C.goldHi);
        for (var i = 0; i < pos.count; i += 3) { var cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3 - 2.2; if (Math.abs(cy) < 0.5) for (var k = 0; k < 3; k++) col.setXYZ(i + k, y.r, y.g, y.b); }
        return p;
      },
      star: function () { // 별똥별: 금별 + 뒤로 긴 꼬리(−z)
        return [part(starGeo(2.2, 0.8), C.gold, [0, 2.4, 0], 1, [-Math.PI / 2, 0, 0]), part(new THREE.ConeGeometry(1.0, 7, 5), C.goldHi, [0, 2.4, -4.4], 1, [-Math.PI / 2, 0, 0])];
      },
      bubble: function () { // 잠꼬대 방울: 하늘빛 방울 + 반짝
        return [part(ball(8, 5), C.su1, [0, 3, 0], 2.8), part(GEO.ico0, C.shine1, [-1.0, 4.1, 1.8], 0.55), part(GEO.ico0, C.suR3, [1.4, 2.2, 2.0], 0.35)];
      },
      cloud: function () { // 양털 구름(둘레를 돎)
        return [part(ball(6, 4), C.tee2, [0, 4, 0], [3.2, 2.4, 2.8]), part(ball(5, 3), C.shine1, [2.6, 4.2, 0.3], 2.0), part(ball(5, 3), C.cream3, [-2.6, 3.8, -0.2], 1.9)];
      },
    };
    var pickupGeometry = cache(PICK), projGeometry = cache(PROJ);

    // ══ 꿈 들판 ══════════════════════════════════════════════
    var W = 540;
    function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6d2b79f5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    function noise(x, z) { return Math.sin(x * 0.029 + 1.1) * Math.cos(z * 0.025 - 0.3) + 0.6 * Math.sin((x + z) * 0.047 + 2.3) + 0.3 * Math.sin(x * 0.1 - z * 0.08); }

    function makeGround(dawn) {
      var root = new THREE.Group(); root.name = "dreamfield";
      var mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
      var R = rng(20261029);
      // 바닥: 칸마다 삼각형 색, 밤 색과 새벽 색 두 벌을 들고 setDawn 이 섞는다
      var NIGHT = [C.night1, C.disc0, C.night0, C.disc1], DAWN = [C.purp2, C.suR3, C.purp1, C.dusk1];
      var N = 60, cell = W / N, pos = new Float32Array(N * N * 18), cN = new Float32Array(N * N * 18), cD = new Float32Array(N * N * 18), o = 0;
      var cc = {}; function col(h) { return cc[h] || (cc[h] = new THREE.Color(h)); }
      for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
        var x0 = i * cell, z0 = j * cell, x1 = x0 + cell, z1 = z0 + cell, tris = [[x0, z0, x0, z1, x1, z0], [x1, z0, x0, z1, x1, z1]];
        for (var k = 0; k < 2; k++) {
          var tr = tris[k], cx = (tr[0] + tr[2] + tr[4]) / 3, cz = (tr[1] + tr[3] + tr[5]) / 3, n = noise(cx, cz) + (R() - 0.5) * 0.35;
          var b = n > 1.45 ? 3 : n > 0.1 ? 1 : n > -1.5 ? 0 : 2; // 가운데 두 톤 위주(어두운 적·밝은 양이 다 보이게)
          var a = col(NIGHT[b]), d = col(DAWN[b]);
          for (var q = 0; q < 3; q++) {
            pos[o] = tr[q * 2]; pos[o + 1] = 0; pos[o + 2] = tr[q * 2 + 1];
            cN[o] = a.r; cN[o + 1] = a.g; cN[o + 2] = a.b; cD[o] = d.r; cD[o + 1] = d.g; cD[o + 2] = d.b; o += 3;
          }
        }
      }
      var gg = new THREE.BufferGeometry();
      gg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      var colAttr = new THREE.BufferAttribute(new Float32Array(cN), 3); gg.setAttribute("color", colAttr);
      gg.computeVertexNormals();
      var field = new THREE.Mesh(gg, mat); field.name = "field"; field.receiveShadow = true; root.add(field);

      function inst(name, geo, list, material) {
        var m = new THREE.InstancedMesh(geo, material || mat, list.length), ob = new THREE.Object3D();
        list.forEach(function (it, k) { ob.position.set(it.x, it.y || 0, it.z); ob.rotation.set(0, it.ry || 0, 0); ob.scale.setScalar(it.s || 1); ob.updateMatrix(); m.setMatrixAt(k, ob.matrix); });
        m.name = name; root.add(m); return m;
      }
      var taken = [];
      function scatter(n, gap, edge) {
        var out = [], tries = 0;
        while (out.length < n && tries++ < n * 80) {
          var x = edge + R() * (W - 2 * edge), z = edge + R() * (W - 2 * edge);
          if (Math.hypot(x - 270, z - 270) < 70) continue; // 출발 자리·양 줄 첫 바퀴 자리 비움
          var ok = true;
          for (var k = 0; k < taken.length; k++) if (Math.hypot(taken[k].x - x, taken[k].z - z) < gap + taken[k].g) { ok = false; break; }
          if (!ok) continue;
          var it = { x: x, z: z, ry: R() * TAU, s: 0.8 + R() * 0.4, g: gap * 0.5 };
          out.push(it); taken.push(it);
        }
        return out;
      }
      // 구름 언덕(낮고 넓게 — 양 줄을 가리지 않게 키 6 안팎)
      var hill = merge([part(ball(8, 4), C.purp2, [0, 0.5, 0], [14, 4.5, 10]), part(ball(7, 4), C.cr1, [-5, 3.0, 1], [6, 3.6, 5]), part(ball(7, 4), C.tub1, [4, 3.4, -1], [6.5, 3.4, 5.5]), part(ball(6, 3), C.tub0, [9, 1.8, 2], [4, 2.4, 3.5])]);
      inst("cloudHills", hill, scatter(9, 50, 30));
      // 달 돌(초승달 모양 납작 돌)
      var moon = merge([part(new THREE.TorusGeometry(3.4, 1.6, 4, 10, Math.PI * 1.3), C.cr1, [0, 1.4, 0], [1, 1, 0.8], [Math.PI / 2, 0, 0.4]), part(GEO.ico0, C.tub0, [3.6, 0.8, 2.4], 1.2)]);
      inst("moonStones", moon, scatter(14, 26, 18));
      // 장난감 블록(작은 상자 셋)
      var blocks = merge([part(GEO.box, C.flP, [0, 1.6, 0], 3.2), part(GEO.box, C.flB, [3.4, 1.4, 0.6], 2.8, [0, 0.4, 0]), part(GEO.box, C.flY, [1.2, 4.4, 0.2], 2.6, [0, 0.8, 0]), part(GEO.box, C.purp2, [-3.0, 1.2, 1.6], 2.4, [0, -0.3, 0])]);
      inst("toyBlocks", blocks, scatter(8, 40, 30));
      // 별 꽃: 줄기·잎(정점 색) + 별 머리(발광 재질, 새벽이면 꺼짐)
      var flowers = scatter(46, 14, 12);
      var stem = merge([part(cyl(0.25, 0.3, 3.2, 4), C.g3, [0, 1.6, 0]), part(GEO.ico0, C.g3, [0.8, 0.8, 0], [1.0, 0.35, 0.6]), part(GEO.ico0, C.g3, [-0.8, 0.6, 0.2], [1.0, 0.35, 0.6])]);
      inst("starStems", stem, flowers);
      var glowMat = new THREE.MeshLambertMaterial({ color: C.goldHi, emissive: C.lamp, emissiveIntensity: 1, flatShading: true });
      var sHead = starGeo(1.3, 0.5); sHead.rotateX(-0.5); sHead.translate(0, 3.6, 0);
      inst("starHeads", sHead, flowers, glowMat);
      // 반딧불(떠 있는 작은 빛) — 가로등 대신
      var flies = []; for (var f = 0; f < 70; f++) flies.push({ x: 10 + R() * (W - 20), z: 10 + R() * (W - 20), y: 5 + R() * 10, s: 0.6 + R() * 0.6 });
      var flyGeo = new THREE.IcosahedronGeometry(0.7, 0);
      var flyMat = new THREE.MeshBasicMaterial({ color: C.goldHi, transparent: true, opacity: 0.9, depthWrite: false });
      var fireflies = inst("fireflies", flyGeo, flies, flyMat);
      // 둘레 구름 울타리
      var cloudFence = merge([part(ball(7, 4), C.purp2, [-6, 5, 0], [8, 6, 7]), part(ball(7, 4), C.tub0, [5, 6.5, 0.5], [8.5, 7, 7.5]), part(ball(6, 4), C.cr1, [0, 10, -0.5], [6, 4.5, 5.5])]);
      var fence = [], L = 20;
      for (var e = -L / 2; e <= W + L / 2; e += L) fence.push({ x: e, z: -8, ry: 0 }, { x: e, z: W + 8, ry: Math.PI }, { x: -8, z: e, ry: Math.PI / 2 }, { x: W + 8, z: e, ry: -Math.PI / 2 });
      inst("cloudFence", cloudFence, fence);

      var lastDawn = -1, cA = colAttr.array;
      function setDawn(v) {
        var d = Math.max(0, Math.min(1, v || 0));
        if (Math.abs(d - lastDawn) < 0.004) return; // 바뀐 만큼만 다시 쓴다
        lastDawn = d;
        var w = d * d * (3 - 2 * d) * 0.85; // 새벽이 와도 밤 기운을 조금 남긴다
        for (var i = 0; i < cA.length; i++) cA[i] = cN[i] + (cD[i] - cN[i]) * w;
        colAttr.needsUpdate = true;
        glowMat.emissiveIntensity = 1.2 * (1 - d);
        flyMat.opacity = 0.9 * (1 - d);
        fireflies.visible = d < 0.98;
      }
      setDawn(dawn);
      return { root: root, setDawn: setDawn };
    }

    // ══ 양 우리: 금빛 반투명 채움 + 가장자리 빛 줄 ════════════════
    // set(pts, alpha): pts = [[x, z], …] 닫힌 다각형(최대 maxPts). 귀 자르기 삼각분할을 미리 잡은 배열로(할당 없음).
    function penMesh(maxPts) {
      maxPts = maxPts || 64;
      var grp = new THREE.Group(); grp.name = "pen";
      var fillPos = new Float32Array(maxPts * 3), fillIdx = new Uint16Array(Math.max(3, (maxPts - 2) * 3));
      var fg = new THREE.BufferGeometry();
      var fpa = new THREE.BufferAttribute(fillPos, 3); fpa.setUsage(THREE.DynamicDrawUsage); fg.setAttribute("position", fpa);
      var fia = new THREE.BufferAttribute(fillIdx, 1); fia.setUsage(THREE.DynamicDrawUsage); fg.setIndex(fia);
      var fillMat = new THREE.MeshBasicMaterial({ color: C.be2, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }); // 더하기: 밤 바닥 위에서 흙빛이 아니라 금빛으로
      var fill = new THREE.Mesh(fg, fillMat); fill.frustumCulled = false; fill.renderOrder = 3; grp.add(fill);
      var edgePos = new Float32Array(maxPts * 18);
      var eg = new THREE.BufferGeometry(), epa = new THREE.BufferAttribute(edgePos, 3); epa.setUsage(THREE.DynamicDrawUsage); eg.setAttribute("position", epa);
      var edgeMat = new THREE.MeshBasicMaterial({ color: C.goldHi, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
      var edge = new THREE.Mesh(eg, edgeMat); edge.frustumCulled = false; edge.renderOrder = 4; grp.add(edge);
      var V = new Int32Array(maxPts), PX = new Float32Array(maxPts), PZ = new Float32Array(maxPts);
      fg.setDrawRange(0, 0); eg.setDrawRange(0, 0);
      function cross(a, b, c) { return (PX[b] - PX[a]) * (PZ[c] - PZ[a]) - (PZ[b] - PZ[a]) * (PX[c] - PX[a]); }
      function inside(a, b, c, p) { return cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0; }
      function set(pts, alpha) {
        var n = pts ? Math.min(pts.length, maxPts) : 0, i, k;
        if (n < 3 || !(alpha > 0)) { grp.visible = false; return; }
        grp.visible = true;
        var area = 0;
        for (i = 0; i < n; i++) { PX[i] = pts[i][0]; PZ[i] = pts[i][1]; fillPos[i * 3] = PX[i]; fillPos[i * 3 + 1] = 0.18; fillPos[i * 3 + 2] = PZ[i]; }
        for (i = 0; i < n; i++) { k = (i + 1) % n; area += PX[i] * PZ[k] - PX[k] * PZ[i]; }
        // 귀 자르기: 시계 방향이면 순서를 뒤집어 반시계로 다룬다
        for (i = 0; i < n; i++) V[i] = area > 0 ? i : n - 1 - i;
        var m = n, t = 0, guard = 0, a, b, c, ok;
        i = 0;
        while (m > 3 && guard++ < n * n) {
          a = V[(i + m - 1) % m]; b = V[i % m]; c = V[(i + 1) % m];
          ok = cross(a, b, c) > 1e-6;
          if (ok) for (k = 0; k < m; k++) { var v = V[k]; if (v !== a && v !== b && v !== c && inside(a, b, c, v)) { ok = false; break; } }
          if (ok) {
            fillIdx[t++] = a; fillIdx[t++] = b; fillIdx[t++] = c;
            for (k = i % m; k < m - 1; k++) V[k] = V[k + 1];
            m--; i = i % m;
          } else i = (i + 1) % m;
        }
        if (m > 3) { for (k = 1; k < m - 1; k++) { fillIdx[t++] = V[0]; fillIdx[t++] = V[k]; fillIdx[t++] = V[k + 1]; } } // 꼬인 줄: 남은 것은 부채꼴
        else if (m === 3) { fillIdx[t++] = V[0]; fillIdx[t++] = V[1]; fillIdx[t++] = V[2]; }
        fg.setDrawRange(0, t); fpa.needsUpdate = true; fia.needsUpdate = true;
        // 가장자리: 변마다 폭 1.6 띠(사각형 둘레)
        var e = 0, hw = 0.8;
        for (i = 0; i < n; i++) {
          k = (i + 1) % n;
          var dx = PX[k] - PX[i], dz = PZ[k] - PZ[i], l = Math.sqrt(dx * dx + dz * dz) || 1, nx = -dz / l * hw, nz = dx / l * hw;
          var ax = PX[i] - dx / l * hw, az = PZ[i] - dz / l * hw, bx = PX[k] + dx / l * hw, bz = PZ[k] + dz / l * hw;
          edgePos[e++] = ax + nx; edgePos[e++] = 0.3; edgePos[e++] = az + nz;
          edgePos[e++] = ax - nx; edgePos[e++] = 0.3; edgePos[e++] = az - nz;
          edgePos[e++] = bx + nx; edgePos[e++] = 0.3; edgePos[e++] = bz + nz;
          edgePos[e++] = ax - nx; edgePos[e++] = 0.3; edgePos[e++] = az - nz;
          edgePos[e++] = bx - nx; edgePos[e++] = 0.3; edgePos[e++] = bz - nz;
          edgePos[e++] = bx + nx; edgePos[e++] = 0.3; edgePos[e++] = bz + nz;
        }
        eg.setDrawRange(0, n * 6); epa.needsUpdate = true;
        fillMat.opacity = 0.55 * alpha; edgeMat.opacity = 0.95 * alpha;
      }
      grp.visible = false;
      return { mesh: grp, set: set };
    }

    return {
      makeCoco: makeCoco, sheepGeometry: sheepGeometry, enemyGeometry: enemyGeometry, pickupGeometry: pickupGeometry, projGeometry: projGeometry,
      makeGround: makeGround, penMesh: penMesh, blobTexture: Surv3D.blobTexture,
      SHEEP_KINDS: Object.keys(SHEEP), ENEMY_KINDS: Object.keys(ENEMY), PICKUP_KINDS: Object.keys(PICK), PROJ_KINDS: Object.keys(PROJ),
      PALETTE: C, triCount: triCount,
    };
  }

  window.Dream3D = { build: build };
})();
