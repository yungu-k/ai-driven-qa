// @ts-nocheck — 디자인 세션 정본 docs/lab-surv-goblin-3d.js 를 그대로 옮긴 것(tmp/lab-surv/sync-src.sh).
/* 도깨비 퇴치 3D — 로우폴리 모델 (1판, 2026-10-28)
 * 고전 스크립트: window.Gob3D = { build(THREE, Surv3D) → api }. Surv3D 는 window.Surv3D.build(THREE) 의 결과(접지 그림자 재사용).
 * 좌표: 월드 단위 그대로. 규칙 x → three x, 규칙 y → three z, 높이 = three y, 바닥 y = 0, 월드 0..540. 원점 = 발밑 중앙, +z 가 앞.
 * 색은 docs/lab-defense-artdir.md 3절 48색(도깨비 퇴치 2D 판과 같은 팔레트)만 쓴다. 아트 디렉션 docs/lab-surv-goblin-3d-artdir.md.
 * 재료는 설화(도깨비·야광귀·도깨비불·여우불·구미호·그슨대)와 장터 살림(체·엿·팥·복조리·소금·엽전)뿐. 무속·종교 표지는 만들지 않는다.
 */
(function () {
  "use strict";

  // ── 팔레트(lab-defense-artdir 3절에서 그대로) ─────────────────
  var C = {
    ink0: "#07060f", ink1: "#0e0c1c", ink2: "#17142b", ink3: "#231e3d", ink4: "#322b52", ink5: "#463d6b", ink6: "#5f5687",
    sl0: "#3a3f5c", sl1: "#545b7a", sl2: "#7880a0", sl3: "#a3abc4", sl4: "#cdd3e3", sl5: "#eef1f8",
    go0: "#3b1d14", go1: "#6e2f1c", go2: "#a8492a", go3: "#e0743a", go4: "#f6a94a", go5: "#ffd86b", go6: "#fff2b8",
    rd0: "#2e0a1f", rd1: "#5c1230", rd2: "#9a1d3c", rd3: "#d8324a", rd4: "#ff5e5b", rd5: "#ff9a86",
    pk0: "#3d1145", pk1: "#6e1f6e", pk2: "#a8329a", pk3: "#e050c0", pk4: "#ff8be0",
    gr0: "#0b2422", gr1: "#124638", gr2: "#1c7a50", gr3: "#36b866", gr4: "#7ee87e", gr5: "#d4ffb0",
    cy0: "#0b1d3a", cy1: "#123a66", cy2: "#1a68a0", cy3: "#2aa6d6", cy4: "#6ee6ff", cy5: "#c8fbff",
    vi0: "#1e0f3d", vi1: "#3a1a6b", vi2: "#6232b0", vi3: "#9a64f0", vi4: "#c9a4ff",
  };

  function build(THREE, Surv3D) {
    var V3 = THREE.Vector3, TAU = Math.PI * 2, PI = Math.PI;
    var GEO = {
      ico0: new THREE.IcosahedronGeometry(1, 0), ico1: new THREE.IcosahedronGeometry(1, 1), ico2: new THREE.IcosahedronGeometry(1, 2),
      box: new THREE.BoxGeometry(1, 1, 1),
    };
    function ball(w, h) { return new THREE.SphereGeometry(1, w, h); }
    function cyl(rt, rb, h, seg) { return new THREE.CylinderGeometry(rt, rb, h, seg || 8, 1); }
    function cone(r, h, seg) { return new THREE.ConeGeometry(r, h, seg || 5); }
    function torus(R, r, rs, ts, arc) { return new THREE.TorusGeometry(R, r, rs || 3, ts || 8, arc); }
    function triCount(g) { return (g.index ? g.index.count : g.attributes.position.count) / 3; }
    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function ease(a) { a = clamp01(a); return a * a * (3 - 2 * a); }
    // 다섯 뿔 별(어지러움 별) — 납작한 기둥
    function starGeo(r, depth) {
      var s = new THREE.Shape();
      for (var i = 0; i < 10; i++) { var a = PI / 2 + i * PI / 5, rr = i % 2 ? r * 0.45 : r; if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      var g = new THREE.ExtrudeGeometry(s, { depth: depth, bevelEnabled: false, curveSegments: 1 });
      g.translate(0, 0, -depth / 2);
      return g;
    }
    // 엽전: 둥근 판 + 네모 구멍(앞이 +z)
    function coinGeo(r, depth) {
      var s = new THREE.Shape(); s.absarc(0, 0, r, 0, TAU, false);
      var h = new THREE.Path(), q = r * 0.36; h.moveTo(-q, -q); h.lineTo(-q, q); h.lineTo(q, q); h.lineTo(q, -q); h.lineTo(-q, -q); s.holes.push(h);
      var g = new THREE.ExtrudeGeometry(s, { depth: depth, bevelEnabled: false, curveSegments: 5 });
      g.translate(0, 0, -depth / 2);
      return g;
    }

    // ── 정점 색 부품 · 합치기(형제 판과 같은 도구) ────────────────
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
    // 긴 축(z)을 방향 d 로 돌린 회전(Euler 배열) — 꼬리·팔처럼 비스듬한 부품
    var _z = new V3(0, 0, 1);
    function aim(dx, dy, dz) { var d = new V3(dx, dy, dz).normalize(); _q.setFromUnitVectors(_z, d); _e.setFromQuaternion(_q); return [_e.x, _e.y, _e.z]; }
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
    function cache(table, tag) {
      var memo = {};
      return function (kind) {
        if (memo[kind]) return memo[kind];
        var f = table[kind]; if (!f) throw new Error("Gob3D " + tag + ": " + kind);
        var g = merge(f());
        return (memo[kind] = { geometry: g, tris: triCount(g), height: g.boundingBox.max.y });
      };
    }
    // 같은 무리 안 같은 재질 메시를 하나로(Surv3D 코코와 같은 방식) — 그리기 호출을 줄인다
    function bakeGroup(group) {
      group.children.slice().forEach(function (ch) { if (!ch.isMesh) bakeGroup(ch); });
      var buckets = new Map();
      group.children.forEach(function (ch) { if (ch.isMesh && !ch.userData.solo) { if (!buckets.has(ch.material)) buckets.set(ch.material, []); buckets.get(ch.material).push(ch); } });
      buckets.forEach(function (list, mat) {
        if (list.length < 2) return;
        var gs = list.map(function (m) { m.updateMatrix(); var g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(m.matrix); return g; });
        var n = 0; gs.forEach(function (g) { n += g.attributes.position.count; });
        var P = new Float32Array(n * 3), N = new Float32Array(n * 3), o = 0;
        gs.forEach(function (g) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); });
        var bg = new THREE.BufferGeometry();
        bg.setAttribute("position", new THREE.BufferAttribute(P, 3)); bg.setAttribute("normal", new THREE.BufferAttribute(N, 3));
        list.forEach(function (m) { group.remove(m); });
        var mm = new THREE.Mesh(bg, mat); mm.castShadow = true; group.add(mm);
      });
    }

    // ══ 엿장수 꼬마 ═══════════════════════════════════════════════
    // 키 약 17(머리 지름 7.5 — 몸의 절반 가까이). 앞(+z)에 금빛 엿판, 오른손(−x)에 들어 올린 은빛 엿가위,
    // 붉은 머리띠·댕기, 연두 저고리에 색동 소매, 짚신. 위 카메라에서 머리띠 고리·엿판·가위 V 가 먼저 읽힌다.
    var HIP_Y = 5.2, HEAD_PITCH = -0.32;
    function makeHero() {
      var mats = {};
      function M(hex) { return mats[hex] || (mats[hex] = new THREE.MeshLambertMaterial({ color: hex, flatShading: true })); }
      function mesh(geo, hex, parent, p, s, r) {
        var m = new THREE.Mesh(geo, M(hex));
        m.position.set(p[0], p[1], p[2]);
        if (s != null) { if (typeof s === "number") m.scale.setScalar(s); else m.scale.set(s[0], s[1], s[2]); }
        if (r) m.rotation.set(r[0], r[1], r[2]);
        parent.add(m); return m;
      }
      function G(name, parent, p) { var g = new THREE.Group(); g.name = name; if (p) g.position.set(p[0], p[1], p[2]); parent.add(g); return g; }

      var root = new THREE.Group(); root.name = "yeotkid";
      var fit = G("fit", root); fit.scale.setScalar(1.0);
      var rig = G("rig", fit);
      var hip = G("hip", rig, [0, HIP_Y, 0]);

      // 다리: 바지(슬레이트) + 붉은 대님 + 짚신
      var legGeo = new THREE.CapsuleGeometry(1.15, 2.4, 2, 7);
      function leg(sx) {
        var g = G(sx > 0 ? "legL" : "legR", rig, [sx * 1.35, HIP_Y, 0]);
        mesh(legGeo, C.sl3, g, [0, -2.2, 0]);
        mesh(torus(1.12, 0.32, 3, 8), C.rd3, g, [0, -3.7, 0], 1, [PI / 2, 0, 0]);
        mesh(GEO.ico1, C.go4, g, [0, -4.75, 0.55], [1.25, 0.6, 1.9]);
        return g;
      }
      var legL = leg(1), legR = leg(-1);

      // 몸: 엉덩이(바지) + 연두 저고리 + 흰 동정 + 붉은 고름 + 엿판 멜빵
      mesh(GEO.ico1, C.sl3, hip, [0, 0.5, 0], [3.0, 1.7, 2.5]);
      mesh(new THREE.SphereGeometry(1, 10, 7), C.gr3, hip, [0, 3.1, 0], [3.3, 3.5, 2.7]);
      mesh(GEO.ico1, C.gr4, hip, [0, 5.4, -0.2], [2.6, 1.2, 2.2]); // 어깨 위 밝은 면(위에서 보이는 등·어깨)
      mesh(GEO.box, C.sl5, hip, [0.75, 4.6, 2.35], [0.8, 3.0, 0.5], [-0.3, 0, 0.6]); // 동정(사선 깃)
      mesh(GEO.box, C.rd3, hip, [-0.9, 4.1, 2.75], [0.55, 2.0, 0.3], [-0.2, 0, 0.18]); // 고름
      mesh(GEO.box, C.rd3, hip, [-0.3, 4.0, 2.8], [0.5, 1.7, 0.3], [-0.2, 0, -0.25]);
      mesh(GEO.box, C.go1, hip, [-0.5, 3.6, 2.45], [0.55, 6.6, 0.45], [-0.25, 0, 0.62]); // 멜빵(앞)
      mesh(GEO.box, C.go1, hip, [0.2, 3.9, -2.45], [0.55, 6.2, 0.45], [0.2, 0, -0.62]); // 멜빵(등)

      // 엿판: 나무 판 + 테 + 흰·호박 엿가락 + 엿 덩이 — 몸보다 넓게 앞으로 튀어나온다
      var tray = G("tray", hip, [0, 1.9, 4.1]);
      mesh(GEO.box, C.go2, tray, [0, 0, 0], [9.6, 0.8, 5.4]);
      mesh(GEO.box, C.go1, tray, [0, 0.55, 2.7], [9.9, 1.3, 0.5]);
      mesh(GEO.box, C.go1, tray, [0, 0.55, -2.7], [9.9, 1.3, 0.5]);
      mesh(GEO.box, C.go1, tray, [4.8, 0.55, 0], [0.5, 1.3, 5.4]);
      mesh(GEO.box, C.go1, tray, [-4.8, 0.55, 0], [0.5, 1.3, 5.4]);
      var stick = cyl(0.48, 0.48, 7.8, 6);
      [[-1.65, C.go6], [-0.55, C.go5], [0.55, C.go6], [1.65, C.go5]].forEach(function (s) { mesh(stick, s[1], tray, [0, 0.9, s[0]], 1, [0, 0, PI / 2]); });
      mesh(GEO.ico0, C.go4, tray, [3.0, 1.35, 1.2], [1.1, 0.7, 1.0]);
      mesh(GEO.ico0, C.go6, tray, [-3.1, 1.35, -1.0], [1.0, 0.7, 0.9]);

      // 팔: 색동 소매(어깨→손: 초록·분홍·청록·금·빨강) + 손
      var SLEEVE = [C.gr4, C.pk3, C.cy3, C.go5, C.rd3], sleeveGeo = cyl(1.05, 1.15, 0.95, 7);
      function arm(sx) {
        var g = G(sx > 0 ? "armL" : "armR", hip, [sx * 3.1, 5.2, 0.2]);
        for (var i = 0; i < 5; i++) mesh(sleeveGeo, SLEEVE[i], g, [0, -0.55 - i * 0.9, 0]);
        mesh(GEO.ico1, C.go6, g, [0, -5.0, 0], 1.0);
        return g;
      }
      var armL = arm(1), armR = arm(-1);
      // 엿가위: 손 너머로 두 날이 X 로 엇갈린다(축이 손끝 너머). 날을 벌렸다 닫으면 「찰칵」.
      var shears = G("shears", armR, [0, -5.3, 0.2]);
      function blade(name) {
        var g = G(name, shears, [0, -1.3, 0]);
        mesh(GEO.box, C.sl4, g, [0, -3.0, 0], [0.75, 5.4, 0.32]);
        mesh(GEO.box, C.sl5, g, [0, -5.4, 0], [0.5, 1.2, 0.34]);
        mesh(GEO.box, C.sl2, g, [0, 1.0, 0], [0.5, 2.0, 0.3]);
        return g;
      }
      var bladeA = blade("bladeA"), bladeB = blade("bladeB");
      mesh(GEO.ico0, C.sl1, shears, [0, -1.3, 0.25], 0.45); // 사개(축)

      // 목·머리
      var neck = G("neck", hip, [0, 6.6, 0.3]);
      var head = G("head", neck, [0, 3.6, 0.2]);
      mesh(GEO.ico2, C.go6, head, [0, 0, 0], [4.3, 4.0, 3.9]);
      mesh(GEO.ico0, C.go5, head, [4.15, -0.4, 0.2], [0.7, 1.0, 0.6]);
      mesh(GEO.ico0, C.go5, head, [-4.15, -0.4, 0.2], [0.7, 1.0, 0.6]);
      // 까만 단발: 정수리 반구(앞을 들어 이마를 연다) + 뒷머리 + 앞머리 + 땋은 머리 + 붉은 댕기
      mesh(new THREE.SphereGeometry(1, 12, 5, 0, TAU, 0, PI * 0.5), C.ink3, head, [0, 0.2, -0.3], [4.55, 4.35, 4.3], [-0.38, 0, 0]);
      mesh(GEO.ico1, C.ink3, head, [0, -0.9, -1.5], [4.4, 3.3, 3.3]);
      [[1.7, 2.35, 2.95], [0, 2.6, 3.2], [-1.7, 2.35, 2.95]].forEach(function (b) { mesh(GEO.ico0, C.ink4, head, b, [1.6, 0.9, 1.0]); });
      [[-2.1, -4.3, 1.05], [-3.4, -4.6, 0.95], [-4.6, -4.7, 0.85]].forEach(function (b) { mesh(GEO.ico0, C.ink3, head, [0, b[0], b[1]], b[2]); });
      mesh(GEO.box, C.rd3, head, [0.45, -5.7, -4.75], [0.9, 1.7, 0.3], [0, 0, 0.35]);
      mesh(GEO.box, C.rd3, head, [-0.45, -5.7, -4.75], [0.9, 1.7, 0.3], [0, 0, -0.35]);
      // 붉은 머리띠: 위에서 까만 머리 위 붉은 고리로 읽힌다
      mesh(torus(1, 0.12, 4, 18), C.rd4, head, [0, 1.25, -0.15], [4.42, 4.3, 4.6], [PI / 2 - 0.3, 0, 0]);
      // 얼굴: 큰 눈 + 반짝 + 볼 + 웃는 입 + 작은 코
      function eye(sx) {
        var g = G("eye", head, [sx * 1.55, -0.15, 3.55]);
        mesh(GEO.ico1, C.ink0, g, [0, 0, 0], [0.75, 0.98, 0.5]);
        var s = mesh(GEO.ico0, C.sl5, g, [-0.22, 0.35, 0.42], 0.3); s.userData.solo = true;
        g.userData.shine = s; g.rotation.y = sx * 0.2;
        return g;
      }
      var eyeL = eye(1), eyeR = eye(-1);
      mesh(GEO.ico0, C.rd5, head, [2.55, -1.25, 3.05], [0.85, 0.5, 0.3], [0, 0.6, 0]);
      mesh(GEO.ico0, C.rd5, head, [-2.55, -1.25, 3.05], [0.85, 0.5, 0.3], [0, -0.6, 0]);
      mesh(GEO.ico0, C.rd2, head, [0, -1.75, 3.6], [0.8, 0.38, 0.3]);
      mesh(GEO.ico0, C.go5, head, [0, -0.85, 3.95], 0.35);
      // 어지러움 별(lost 때만): 머리 위에서 돈다
      var dizzy = G("dizzy", head, [0, 5.4, 0]), sg = starGeo(0.9, 0.35);
      for (var di = 0; di < 3; di++) { var da = di / 3 * TAU, st = mesh(sg, C.go5, dizzy, [Math.cos(da) * 3.4, 0, Math.sin(da) * 3.4], 1, [-0.9, -da, 0]); st.userData.solo = true; }
      dizzy.visible = false;

      bakeGroup(root);
      var matList = Object.keys(mats).map(function (k) { return mats[k]; });

      function eyes(open, squint) {
        [eyeL, eyeR].forEach(function (e) {
          e.scale.set(1, open ? 1 : squint ? 0.24 : 0.16, 1);
          e.position.y = open ? -0.15 : 0.05;
          e.userData.shine.visible = open;
        });
      }
      function pose(t, name, poseT, o) {
        o = o || {};
        var sp = o.speed == null ? 1 : clamp01(o.speed);
        var red = !!o.reduce, hurt = o.hurt === true ? 1 : +o.hurt || 0;
        var pT = poseT == null ? 1 : poseT;
        rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); rig.scale.set(1, 1, 1);
        hip.position.set(0, HIP_Y, 0); hip.rotation.set(0, 0, 0); hip.scale.set(1, 1, 1);
        legL.position.set(1.35, HIP_Y, 0); legR.position.set(-1.35, HIP_Y, 0); legL.rotation.set(0, 0, 0); legR.rotation.set(0, 0, 0);
        armL.rotation.set(-0.8, 0, 0.15); armR.rotation.set(-2.3, 0, -0.35);
        neck.rotation.set(0, 0, 0); head.rotation.set(HEAD_PITCH, 0, 0);
        dizzy.visible = false;
        var open = 0.1;
        var blink = ((t + 0.9) % 4.1) < 0.12 || ((t + 2.3) % 5.7) < 0.1;
        eyes(!blink, false);
        switch (name) {
          case "walk": {
            var f = 1.6 + 2.2 * sp, ph = TAU * f * t, A = 0.55 * (0.35 + 0.65 * sp), s = Math.sin(ph);
            legL.rotation.x = A * s; legR.rotation.x = -A * s;
            if (!red) rig.position.y = Math.abs(Math.cos(ph)) * 0.7 * sp;
            hip.rotation.z = 0.04 * s; hip.rotation.y = 0.06 * s;
            armL.rotation.x = -0.8 + 0.06 * s;
            armR.rotation.x = -2.3 + 0.12 * s;
            open = 0.06 + 0.36 * Math.pow(Math.max(0, Math.sin(ph)), 3) * (red ? 0.5 : 1); // 걸음마다 찰칵
            neck.rotation.x = 0.04 * Math.sin(ph * 2 + 0.6);
            break;
          }
          case "lost": {
            var k = red ? 1 : ease(pT / 0.45);
            var hy = HIP_Y - 3.3 * k;
            hip.position.y = hy; legL.position.y = legR.position.y = hy;
            legL.rotation.x = legR.rotation.x = -1.45 * k; legL.rotation.z = 0.25 * k; legR.rotation.z = -0.25 * k;
            hip.rotation.x = -0.2 * k;
            armR.rotation.set(-2.3 + 1.8 * k, 0, -0.35 - 0.7 * k);
            armL.rotation.set(-0.8 + 0.1 * k, 0, 0.15 + 0.55 * k);
            open = 0.1 + 0.4 * k;
            if (!red) { head.rotation.z = 0.24 * Math.sin(t * 4.2) * k; neck.rotation.x = 0.1 * Math.cos(t * 4.2) * k; }
            eyes(false, true);
            dizzy.visible = k > 0.5; dizzy.rotation.y = red ? 0 : t * 3.2;
            break;
          }
          default: { // idle: 숨 + 가끔 찰칵
            if (!red) hip.scale.y = 1 + 0.025 * Math.sin(TAU * 0.6 * t);
            var c = (t % 1.8) / 1.8, clack = c < 0.12 ? Math.sin(PI * c / 0.12) : 0;
            open = 0.08 + 0.32 * clack * (red ? 0.5 : 1);
            armR.rotation.x = -2.3 + 0.1 * clack;
            if (!red) head.rotation.z = 0.04 * Math.sin(TAU * 0.3 * t);
          }
        }
        bladeA.rotation.z = open; bladeB.rotation.z = -open;
        // 옆을 볼 때 머리를 카메라 쪽(+z)으로 돌린다 — Surv3D 코코 2판과 같은 법. root.rotation.y 를 pose 전에 정해 둔다.
        head.rotation.y += -0.55 * Math.sin(root.rotation.y);
        if (hurt > 0) {
          if (!red) { rig.scale.y *= 1 - 0.1 * hurt; rig.scale.x *= 1 + 0.06 * hurt; rig.scale.z *= 1 + 0.06 * hurt; head.rotation.x -= 0.18 * hurt; }
          if (name !== "lost") eyes(false, true);
        }
        for (var i = 0; i < matList.length; i++) { matList[i].emissive.set(C.go6); matList[i].emissiveIntensity = hurt * 0.55; }
      }
      pose(0, "idle", 1, {});
      return { root: root, pose: pose };
    }

    // ══ 적(작은 것 ≤ 300, 방망이 ≤ 600, 보스 ≤ 1,500) ══════════════════
    // 지름 ≈ 규칙 반경 × 2 × 1.25. 무섭지 않게: 둥근 몸, 흰 눈 큰 눈동자, 웃는 입.
    // 「_count」는 주저앉아(밑이 넓고 납작) 한 손가락을 들고 그 끝에 붉은 팥알 — 위에서도 걷는 것과 갈린다.
    function bigEyes(p, y, z, r, gap, look) {
      look = look || 0; // 음수면 눈동자가 아래(체를 본다)
      p.push(part(GEO.ico0, C.sl5, [gap, y, z], [r, r * 1.15, r * 0.55]));
      p.push(part(GEO.ico0, C.sl5, [-gap, y, z], [r, r * 1.15, r * 0.55]));
      p.push(part(GEO.box, C.ink0, [gap * 0.94, y + look * r * 0.45, z + r * 0.5], [r * 0.62, r * 0.8, r * 0.3]));
      p.push(part(GEO.box, C.ink0, [-gap * 0.94, y + look * r * 0.45, z + r * 0.5], [r * 0.62, r * 0.8, r * 0.3]));
    }
    // 세는 손: 어깨에서 위로 뻗은 팔 + 손가락 + 팥알
    function countHand(p, skin, finger, sx, y0, z0, len, sc) {
      sc = sc || 1;
      p.push(part(GEO.box, skin, [sx, y0 + len / 2, z0], [0.95 * sc, len, 0.95 * sc], [0.15, 0, sx > 0 ? 0.25 : -0.25]));
      var tx = sx + (sx > 0 ? -1 : 1) * len * 0.25, ty = y0 + len;
      p.push(part(GEO.box, finger, [tx, ty + 0.8 * sc, z0 + 0.15 * len], [0.42 * sc, 1.6 * sc, 0.42 * sc]));
      p.push(part(GEO.ico0, C.rd4, [tx, ty + 2.4 * sc, z0 + 0.15 * len], 0.85 * sc));
    }
    var ENEMY = {
      imp: function () { // 꼬마 도깨비(4 → 지름 10): 파랑 공 + 금빛 외뿔 + 호랑이 가죽 + 어깨에 작은 방망이
        var p = [part(GEO.ico1, C.cy3, [0, 4.7, 0], [4.0, 4.2, 3.8])];
        p.push(part(cyl(3.75, 3.55, 1.8, 6), C.go4, [0, 2.4, 0]));
        p.push(part(cone(0.95, 3.0, 5), C.go5, [0, 9.9, 0.3], 1, [0.15, 0, 0]));
        p.push(part(GEO.ico0, C.gr3, [0, 8.5, -1.3], [1.7, 1.0, 1.5]));
        bigEyes(p, 5.9, 3.2, 1.05, 1.35, 0);
        p.push(part(GEO.box, C.rd2, [0, 4.25, 3.65], [1.9, 0.45, 0.3]));
        p.push(part(GEO.box, C.cy2, [1.5, 0.45, 0.8], [1.4, 0.9, 2.0]));
        p.push(part(GEO.box, C.cy2, [-1.5, 0.45, 0.8], [1.4, 0.9, 2.0]));
        p.push(part(GEO.box, C.cy2, [3.9, 4.4, 0.6], [1.0, 2.4, 1.0], [0, 0, 0.3]));
        p.push(part(GEO.box, C.cy2, [-3.8, 5.6, 0.2], [1.0, 2.4, 1.0], [0, 0, -0.9]));
        p.push(part(cyl(0.95, 0.5, 6.2, 5), C.go3, [-3.2, 7.8, -1.6], 1, [-0.55, 0, 0.75]));
        p.push(part(GEO.ico0, C.go2, [-5.3, 9.6, -3.4], 1.15));
        return p;
      },
      imp_count: function () { // 주저앉아 셈: 낮고 넓은 몸 + 앞에 꼰 다리 + 방망이는 옆 땅에 + 손가락에 팥알
        var p = [part(ball(8, 5), C.cy3, [0, 3.5, -0.4], [4.3, 3.5, 4.0])];
        p.push(part(ball(6, 3), C.cy2, [0, 0.8, 2.7], [4.6, 0.9, 1.7]));
        p.push(part(cone(0.95, 3.0, 5), C.go5, [0, 8.4, 0.5], 1, [0.45, 0, 0]));
        p.push(part(GEO.ico0, C.gr3, [0, 6.8, -1.8], [1.7, 1.0, 1.5]));
        bigEyes(p, 4.4, 3.0, 1.0, 1.35, -1);
        p.push(part(GEO.box, C.rd2, [0, 3.0, 3.6], [1.3, 0.4, 0.3]));
        p.push(part(GEO.box, C.cy2, [3.6, 2.3, 2.0], [1.0, 1.0, 2.4], [0, -0.4, 0]));
        countHand(p, C.cy2, C.cy4, -3.5, 4.2, 0.6, 3.6);
        p.push(part(cyl(0.95, 0.5, 6.0, 4), C.go3, [5.6, 0.7, 0.3], 1, [0, 0.2, PI / 2]));
        p.push(part(GEO.ico0, C.go2, [8.5, 0.95, 0.9], 1.1));
        return p;
      },
      wisp: function () { // 도깨비불(3.5 → 9): 다리 없이 떠 있는 청록 불꽃 + 밝은 심 + 눈
        var p = [part(ball(7, 5), C.cy3, [0, 5.0, 0], [3.1, 2.9, 3.1])];
        p.push(part(cone(2.7, 5.2, 7), C.cy4, [0, 9.0, -0.4], 1, [-0.2, 0, 0]));
        p.push(part(cone(1.1, 2.6, 5), C.cy4, [2.4, 7.2, -0.2], 1, [0, 0, -0.5]));
        p.push(part(cone(1.1, 2.6, 5), C.cy4, [-2.4, 7.0, -0.2], 1, [0, 0, 0.5]));
        p.push(part(GEO.ico0, C.cy5, [0, 6.0, 1.0], [1.9, 2.4, 1.9]));
        p.push(part(ball(5, 3), C.cy2, [0, 2.3, -0.8], [1.5, 1.1, 1.5]));
        p.push(part(GEO.box, C.cy1, [0.95, 5.2, 2.9], [0.6, 0.9, 0.3]));
        p.push(part(GEO.box, C.cy1, [-0.95, 5.2, 2.9], [0.6, 0.9, 0.3]));
        return p;
      },
      foxfire: function () { // 여우불(3 → 7.5): 분홍 구슬 + 불 혀 셋 + 뒤로 말린 꼬리 불
        var p = [part(ball(6, 4), C.pk3, [0, 3.8, 0], [2.4, 2.2, 2.4])];
        p.push(part(cone(1.0, 3.0, 5), C.pk4, [0, 6.8, -0.2]));
        p.push(part(cone(0.8, 2.2, 5), C.pk4, [1.4, 6.0, -0.3], 1, [0, 0, -0.45]));
        p.push(part(cone(0.8, 2.2, 5), C.pk4, [-1.4, 6.0, -0.3], 1, [0, 0, 0.45]));
        p.push(part(GEO.ico0, C.rd5, [0, 4.1, 1.2], [1.3, 1.4, 1.0]));
        p.push(part(cone(1.1, 4.0, 5), C.pk2, [0, 4.6, -3.0], 1, aim(0, 0.6, -1)));
        p.push(part(GEO.box, C.pk1, [0.75, 4.0, 2.2], [0.45, 0.65, 0.3]));
        p.push(part(GEO.box, C.pk1, [-0.75, 4.0, 2.2], [0.45, 0.65, 0.3]));
        return p;
      },
      yagwang: function () { // 야광귀(4.5 → 11): 뿔 없는 보라 몸 + 삐친 털 + 청록 빛 눈·반점 + 긴 팔로 짚신을 껴안음
        var p = [part(ball(7, 5), C.vi2, [0, 5.8, 0], [3.6, 3.9, 3.4])];
        p.push(part(cyl(3.0, 4.4, 2.4, 8), C.vi1, [0, 1.6, 0]));
        p.push(part(cone(0.9, 3.2, 4), C.vi4, [0.3, 10.6, -0.4], 1, [-0.3, 0, -0.3]));
        p.push(part(cone(0.7, 2.2, 4), C.vi3, [-1.0, 10.0, -0.8], 1, [-0.4, 0, 0.5]));
        p.push(part(GEO.ico0, C.cy4, [1.4, 6.7, 3.0], [1.15, 1.35, 0.6]));
        p.push(part(GEO.ico0, C.cy4, [-1.4, 6.7, 3.0], [1.15, 1.35, 0.6]));
        p.push(part(GEO.box, C.ink1, [1.3, 6.6, 3.55], [0.5, 0.75, 0.3]));
        p.push(part(GEO.box, C.ink1, [-1.3, 6.6, 3.55], [0.5, 0.75, 0.3]));
        p.push(part(GEO.ico0, C.cy3, [1.6, 8.8, -1.2], 0.7));
        p.push(part(GEO.ico0, C.cy3, [-1.9, 7.4, -2.2], 0.6));
        p.push(part(GEO.box, C.vi3, [3.3, 4.4, 1.6], [0.9, 5.0, 0.9], aim(-0.35, -1, 0.7)));
        p.push(part(GEO.box, C.vi3, [-3.3, 4.4, 1.6], [0.9, 5.0, 0.9], aim(0.35, -1, 0.7)));
        p.push(part(GEO.box, C.go4, [0.9, 4.2, 3.6], [5.0, 1.2, 1.8], [0, 0, 0.1])); // 짚신(옆으로 삐져나옴)
        p.push(part(GEO.box, C.go2, [3.0, 4.6, 3.6], [0.9, 1.4, 1.9], [0, 0, 0.1]));
        return p;
      },
      yagwang_count: function () { // 주저앉아 셈: 치맛자락이 납작하게 퍼짐 + 짚신은 옆 땅에 + 손가락 팥알
        var p = [part(ball(7, 5), C.vi2, [0, 4.4, -0.3], [3.7, 3.5, 3.5])];
        p.push(part(cyl(3.6, 5.0, 1.4, 8), C.vi1, [0, 0.7, -0.2]));
        p.push(part(cone(0.9, 3.2, 4), C.vi4, [0.3, 8.9, -0.5], 1, [-0.1, 0, -0.3]));
        p.push(part(GEO.ico0, C.cy4, [1.4, 5.1, 2.9], [1.1, 1.3, 0.6]));
        p.push(part(GEO.ico0, C.cy4, [-1.4, 5.1, 2.9], [1.1, 1.3, 0.6]));
        p.push(part(GEO.box, C.ink1, [1.3, 4.7, 3.45], [0.5, 0.7, 0.3]));
        p.push(part(GEO.box, C.ink1, [-1.3, 4.7, 3.45], [0.5, 0.7, 0.3]));
        p.push(part(GEO.ico0, C.cy3, [1.6, 7.2, -1.4], 0.7));
        p.push(part(GEO.box, C.vi3, [3.6, 1.6, 2.4], [0.9, 4.0, 0.9], aim(0.2, -0.3, 1))); // 땅을 짚은 긴 팔
        countHand(p, C.vi3, C.vi4, -3.4, 5.0, 0.4, 3.8);
        p.push(part(GEO.box, C.go4, [5.8, 0.6, -1.0], [1.8, 1.1, 4.6], [0, 0.3, 0]));
        return p;
      },
      club: function () { // 방망이 도깨비(8 → 20): 큰 초록 몸 + 연두 배 + 금 뿔 둘 + 짚 허리띠 + 호랑이 가죽 + 어깨 위 큰 방망이
        var p = [part(GEO.ico1, C.gr3, [0, 9.4, 0], [7.4, 7.6, 6.6])];
        p.push(part(ball(7, 4), C.gr5, [0, 8.2, 4.6], [4.8, 5.0, 2.4]));
        p.push(part(cyl(6.9, 6.2, 3.2, 10), C.go3, [0, 3.6, 0]));
        [[-2.6, 0.3], [0, -0.1], [2.6, -0.3]].forEach(function (s) { p.push(part(GEO.box, C.ink1, [s[0], 3.6, 6.4], [0.7, 2.6, 0.5], [0, 0, s[1]])); });
        p.push(part(torus(6.7, 0.75, 3, 10), C.go5, [0, 5.4, 0], [1, 1, 1], [PI / 2, 0, 0]));
        p.push(part(cone(1.4, 4.4, 5), C.go5, [2.9, 17.6, 0.6], 1, [0.1, 0, -0.35]));
        p.push(part(cone(1.4, 4.4, 5), C.go5, [-2.9, 17.6, 0.6], 1, [0.1, 0, 0.35]));
        p.push(part(GEO.ico0, C.gr1, [0, 16.6, -1.2], [2.6, 1.2, 2.2]));
        bigEyes(p, 12.2, 5.7, 1.65, 2.3, 0);
        p.push(part(GEO.box, C.gr1, [2.4, 14.2, 6.0], [2.4, 0.6, 0.5], [0, 0, -0.2]));
        p.push(part(GEO.box, C.gr1, [-2.4, 14.2, 6.0], [2.4, 0.6, 0.5], [0, 0, 0.2]));
        p.push(part(GEO.box, C.rd2, [0, 9.8, 6.5], [4.2, 0.9, 0.5]));
        p.push(part(cone(0.45, 1.2, 4), C.sl5, [1.5, 10.6, 6.7]));
        p.push(part(cone(0.45, 1.2, 4), C.sl5, [-1.5, 10.6, 6.7]));
        p.push(part(cyl(1.8, 2.0, 3.4, 6), C.gr2, [3.0, 1.6, 0.4]));
        p.push(part(cyl(1.8, 2.0, 3.4, 6), C.gr2, [-3.0, 1.6, 0.4]));
        p.push(part(GEO.box, C.gr1, [3.0, 0.4, 1.6], [3.0, 0.8, 3.6]));
        p.push(part(GEO.box, C.gr1, [-3.0, 0.4, 1.6], [3.0, 0.8, 3.6]));
        p.push(part(GEO.ico0, C.gr2, [7.0, 7.8, 1.2], [1.9, 3.4, 1.9], [0, 0, 0.3])); // 왼팔
        p.push(part(GEO.ico0, C.gr2, [-6.6, 12.2, 1.6], [1.9, 3.2, 1.9], [0.4, 0, -0.9])); // 오른팔(방망이 든)
        p.push(part(cyl(2.4, 1.0, 14, 7), C.go2, [-5.6, 15.4, -3.2], 1, [-0.75, 0, 0.45]));
        [[-6.8, 19.6, -6.6], [-4.6, 19.0, -7.0]].forEach(function (k) { p.push(part(GEO.ico0, C.go1, k, 0.75)); });
        return p;
      },
      club_count: function () { // 주저앉아 셈: 낮은 몸 + 꼰 다리 + 방망이는 앞 땅에 + 손가락 팥알
        var p = [part(GEO.ico1, C.gr3, [0, 6.6, -0.6], [7.8, 6.4, 7.0])];
        p.push(part(ball(7, 4), C.gr5, [0, 6.0, 4.6], [4.8, 4.0, 2.2]));
        p.push(part(cyl(7.4, 7.6, 2.0, 10), C.go3, [0, 1.4, -0.6]));
        [[-2.6, 0.3], [0, -0.1], [2.6, -0.3]].forEach(function (s) { p.push(part(GEO.box, C.ink1, [s[0], 1.4, 6.9], [0.7, 1.6, 0.5], [0, 0, s[1]])); });
        p.push(part(torus(7.2, 0.75, 3, 10), C.go5, [0, 2.7, -0.6], [1, 1, 1], [PI / 2, 0, 0]));
        p.push(part(ball(7, 4), C.gr2, [0, 1.3, 6.4], [7.6, 1.4, 2.6]));
        p.push(part(cone(1.4, 4.4, 5), C.go5, [2.9, 14.2, 0.9], 1, [0.4, 0, -0.35]));
        p.push(part(cone(1.4, 4.4, 5), C.go5, [-2.9, 14.2, 0.9], 1, [0.4, 0, 0.35]));
        p.push(part(GEO.ico0, C.gr1, [0, 13.0, -1.6], [2.6, 1.2, 2.2]));
        bigEyes(p, 9.0, 5.6, 1.6, 2.3, -1);
        p.push(part(GEO.box, C.rd2, [0, 6.9, 6.3], [3.0, 0.7, 0.5]));
        p.push(part(GEO.ico0, C.gr2, [6.8, 4.0, 3.4], [1.9, 3.0, 1.9], [0.9, 0, 0.3]));
        countHand(p, C.gr2, C.gr4, -6.6, 8.0, 0.6, 6.0, 1.6);
        p.push(part(cyl(2.4, 1.0, 14, 7), C.go2, [2.0, 1.9, 11.0], 1, [0, 0.25, PI / 2]));
        [[8.2, 2.8, 12.4]].forEach(function (k) { p.push(part(GEO.ico0, C.go1, k, 0.75)); });
        return p;
      },
      gumiho: function () { // 구미호(보스 18 → 45): 흰 여우 + 등 뒤로 부채처럼 펼친 꼬리 아홉(끝 분홍) + 웃으며 감은 눈
        var p = [part(GEO.ico1, C.sl4, [0, 10, -2], [6.5, 6.0, 12])];
        p.push(part(GEO.ico1, C.sl5, [0, 11.5, 8], [5.4, 5.6, 4.2]));
        p.push(part(GEO.ico1, C.sl5, [0, 17.2, 12], [6.0, 5.4, 5.4]));
        p.push(part(GEO.ico1, C.sl5, [0, 15.6, 17.0], [2.5, 2.1, 3.6]));
        p.push(part(GEO.ico0, C.ink1, [0, 16.4, 20.4], 0.7));
        p.push(part(cone(2.3, 5.4, 4), C.sl4, [3.4, 22.6, 11.0], 1, [0.1, 0, -0.3]));
        p.push(part(cone(2.3, 5.4, 4), C.sl4, [-3.4, 22.6, 11.0], 1, [0.1, 0, 0.3]));
        p.push(part(cone(1.3, 3.4, 4), C.pk4, [3.3, 22.2, 12.3], 1, [0.1, 0, -0.3]));
        p.push(part(cone(1.3, 3.4, 4), C.pk4, [-3.3, 22.2, 12.3], 1, [0.1, 0, 0.3]));
        // 웃으며 감은 눈(^ ^) + 볼
        [2.3, -2.3].forEach(function (x) {
          p.push(part(GEO.box, C.ink1, [x - 0.55, 18.3, 16.85], [1.4, 0.4, 0.4], [0, 0, 0.5]));
          p.push(part(GEO.box, C.ink1, [x + 0.55, 18.3, 16.85], [1.4, 0.4, 0.4], [0, 0, -0.5]));
          p.push(part(GEO.ico0, C.pk4, [x * 1.6, 15.8, 15.8], [1.2, 0.7, 0.5]));
        });
        p.push(part(GEO.box, C.ink1, [0, 14.4, 19.0], [1.6, 0.35, 0.4]));
        [[3.4, 6], [-3.4, 6], [3.6, -9], [-3.6, -9]].forEach(function (l) {
          p.push(part(cyl(1.5, 1.3, 8, 6), C.sl3, [l[0], 4.2, l[1]]));
          p.push(part(GEO.ico0, C.sl5, [l[0], 0.7, l[1] + 0.8], [1.7, 0.8, 2.0]));
        });
        // 꼬리 아홉: 엉덩이에서 위·뒤로 부채꼴
        var bx = 0, by = 12, bz = -12;
        for (var i = 0; i < 9; i++) {
          var a = -1.25 + i * (2.5 / 8), dx = Math.sin(a) * 1.8, dy = 0.5 + 0.35 * Math.cos(a), dz = -0.6, d = new V3(dx, dy, dz).normalize();
          var rot = aim(d.x, d.y, d.z);
          p.push(part(ball(6, 4), i % 2 ? C.sl4 : C.sl5, [bx + d.x * 9, by + d.y * 9, bz + d.z * 9], [2.8, 2.8, 8.6], rot));
          p.push(part(ball(5, 3), C.pk4, [bx + d.x * 17, by + d.y * 17, bz + d.z * 17], [2.5, 2.5, 3.2], rot));
        }
        return p;
      },
      geuseundae: function () { // 그슨대(보스 14 → 35, 시안이 2.2배까지 키운다): 둥근 머리 + 아래로 퍼지는 그림자 자락 + 청록 눈 둘
        var p = [part(cyl(6.5, 14.0, 19, 12), C.ink3, [0, 9.5, 0])];
        for (var i = 0; i < 12; i++) { var a = i / 12 * TAU; p.push(part(ball(6, 4), i % 2 ? C.vi1 : C.vi2, [Math.cos(a) * 13.6, 1.6, Math.sin(a) * 13.6], [3.6, 2.0, 3.6])); }
        p.push(part(GEO.ico1, C.ink4, [0, 24, 0], [8.6, 8.0, 8.2]));
        p.push(part(torus(7.2, 1.3, 4, 14), C.vi1, [0, 18.6, 0], [1, 1, 1], [PI / 2, 0, 0]));
        p.push(part(GEO.ico1, C.vi1, [0, 30.4, -1.6], [5.2, 2.4, 5.0]));
        p.push(part(cone(1.8, 5.0, 5), C.vi2, [1.2, 33.4, -2.0], 1, [-0.4, 0, -0.5]));
        p.push(part(GEO.ico1, C.vi1, [9.8, 13.0, 2.0], [2.6, 4.4, 2.6], [0, 0, 0.5]));
        p.push(part(GEO.ico1, C.vi1, [-9.8, 13.0, 2.0], [2.6, 4.4, 2.6], [0, 0, -0.5]));
        p.push(part(GEO.ico1, C.cy4, [3.2, 25.2, 7.0], [2.0, 2.4, 1.0]));
        p.push(part(GEO.ico1, C.cy4, [-3.2, 25.2, 7.0], [2.0, 2.4, 1.0]));
        p.push(part(GEO.box, C.ink0, [3.2, 25.0, 7.9], [0.9, 1.3, 0.4]));
        p.push(part(GEO.box, C.ink0, [-3.2, 25.0, 7.9], [0.9, 1.3, 0.4]));
        p.push(part(GEO.ico0, C.cy5, [2.5, 26.2, 7.9], 0.45));
        p.push(part(GEO.ico0, C.cy5, [-3.9, 26.2, 7.9], 0.45));
        p.push(part(GEO.ico0, C.ink1, [0, 21.0, 7.7], [1.1, 0.8, 0.5]));
        return p;
      },
    };
    var enemyGeometry = cache(ENEMY, "enemy");

    // ══ 줍기·탄(≤ 150) ════════════════════════════════════════
    var COIN = coinGeo(2.0, 0.55);
    var PICK = {
      coin: function () { return [part(COIN, C.go4, [0, 2.4, 0], 1, [-0.7, 0, 0])]; },
      coin_big: function () { return [part(COIN, C.go3, [1.2, 2.6, -0.8], 1.15, [-0.7, 0.3, 0]), part(COIN, C.go5, [-0.4, 3.4, 0.4], 1.5, [-0.7, -0.15, 0])]; },
      porridge: function () { // 팥죽 한 그릇: 흰 그릇 + 검붉은 팥죽 + 새알 셋 + 김
        return [part(cyl(3.2, 2.0, 2.4, 9), C.sl4, [0, 1.2, 0]), part(new THREE.CircleGeometry(2.9, 9), C.rd1, [0, 2.45, 0], 1, [-PI / 2, 0, 0]),
          part(GEO.ico0, C.sl5, [0.9, 2.6, 0.5], 0.6), part(GEO.ico0, C.sl5, [-0.8, 2.6, 0.7], 0.55), part(GEO.ico0, C.sl5, [0.1, 2.6, -1.0], 0.55),
          part(GEO.ico0, C.sl3, [0.3, 4.6, -0.2], [0.7, 1.1, 0.7])];
      },
      pouch: function () { // 엽전 꾸러미: 붉은 끈 고리에 엽전 넷 + 매듭
        var p = [part(torus(2.4, 0.3, 3, 6), C.rd3, [0, 1.0, 0], 1, [PI / 2, 0, 0]), part(GEO.box, C.rd4, [0, 1.4, 2.6], [1.2, 0.9, 0.9])];
        for (var i = 0; i < 4; i++) { var a = PI * 0.15 + i * PI * 0.47; p.push(part(cyl(1.1, 1.1, 0.5, 5), i % 2 ? C.go5 : C.go4, [Math.cos(a) * 2.4, 1.3 + i * 0.12, -Math.sin(a) * 2.4 + 0.3], 1, [0.35, 0, 0])); }
        return p;
      },
    };
    var PROJ = {
      yeot: function () { // 엿가락: 호박색 막대 + 꼰 흰 줄(나는 쪽이 +z)
        return [part(cyl(0.75, 0.75, 7.2, 6), C.go5, [0, 2.5, 0], 1, [PI / 2, 0, 0]), part(cyl(0.3, 0.3, 7.4, 4), C.go6, [0.55, 2.9, 0], 1, [PI / 2, 0, 0.3]), part(cyl(0.3, 0.3, 7.4, 4), C.go6, [-0.5, 2.2, 0], 1, [PI / 2, 0, 0.3])];
      },
      salt: function () { // 소금 한 줌: 흰 알갱이 무더기
        var p = [];
        [[0, 2.6, 0, 1.1], [1.3, 2.2, 0.6, 0.85], [-1.2, 2.3, 0.4, 0.8], [0.4, 2.0, -1.3, 0.8], [-0.5, 3.4, -0.6, 0.7], [0.9, 3.3, 0.9, 0.6]].forEach(function (s, i) { p.push(part(GEO.ico0, i % 3 ? C.sl5 : C.sl4, [s[0], s[1], s[2]], s[3], [i, i * 0.7, 0])); });
        return p;
      },
      bean: function () { // 팥: 붉은 알 여섯
        var p = [];
        [[0, 2.5, 0], [1.4, 2.2, 0.5], [-1.3, 2.3, 0.6], [0.3, 2.1, -1.4], [-0.6, 3.5, -0.4], [0.9, 3.4, 0.9]].forEach(function (s, i) { p.push(part(ball(5, 3), i % 2 ? C.rd2 : C.rd3, s, [0.8, 0.65, 0.65], [0, i * 1.1, 0.4])); });
        return p;
      },
      jori: function () { // 복조리: 짚 엮은 국자 + 손잡이 + 붉은 끈(꼬마 둘레를 돈다)
        return [part(ball(8, 4), C.go4, [0, 2.6, 0.8], [2.8, 1.3, 3.4]), part(new THREE.CircleGeometry(2.4, 8), C.go2, [0, 3.62, 0.8], [1, 1.2, 1], [-PI / 2, 0, 0]),
          part(GEO.box, C.go3, [0, 3.7, 0.8], [0.35, 0.2, 5.2]), part(GEO.box, C.go3, [0, 3.7, 0.8], [4.0, 0.2, 0.35]),
          part(cyl(0.4, 0.45, 5.4, 5), C.go3, [0, 3.6, -4.6], 1, [PI / 2 - 0.35, 0, 0]), part(torus(0.6, 0.22, 3, 5), C.rd3, [0, 4.6, -7.2])];
      },
    };
    var pickupGeometry = cache(PICK, "pickup"), projGeometry = cache(PROJ, "proj");

    // ══ 체: 바닥에 납작하게 놓인 둥근 나무 테 + 엷은 그물(지름 약 23) ═══════════
    // 시안이 상태(준비 중·준비됨·꽉 참)를 인스턴스 색으로 칠하니 밝은 색만 쓴다(곱해져도 색이 산다).
    var _sieve = null, _ring = null;
    function sieveGeometry() {
      if (_sieve) return _sieve;
      var p = [part(torus(10.6, 1.0, 4, 20), C.go4, [0, 1.1, 0], [1, 1, 1.5], [PI / 2, 0, 0])];
      p.push(part(torus(10.6, 0.45, 3, 20), C.go5, [0, 2.15, 0], 1, [PI / 2, 0, 0]));
      p.push(part(new THREE.CircleGeometry(10.2, 20), C.sl4, [0, 0.55, 0], 1, [-PI / 2, 0, 0]));
      for (var i = -3; i <= 3; i++) {
        var L = 2 * Math.sqrt(Math.max(0, 10.1 * 10.1 - (i * 2.6) * (i * 2.6)));
        p.push(part(GEO.box, C.sl3, [i * 2.6, 0.7, 0], [0.32, 0.18, L]));
        p.push(part(GEO.box, C.sl3, [0, 0.72, i * 2.6], [L, 0.18, 0.32]));
      }
      var g = merge(p);
      return (_sieve = { geometry: g, tris: triCount(g), height: g.boundingBox.max.y });
    }
    // 체 둘레 바닥 고리(선택): 체가 적에 가려도 자리가 보이게. 시안이 맥동·색을 입힌다.
    function sieveRingGeometry() {
      if (_ring) return _ring;
      var g = merge([part(new THREE.RingGeometry(12.2, 14.0, 32, 1), C.go6, [0, 0.15, 0], 1, [-PI / 2, 0, 0])]);
      return (_ring = { geometry: g, tris: triCount(g), height: 0.15 });
    }

    // ══ 밤 장터 바닥 ══════════════════════════════════════════
    var W = 540, MARGIN = 60;
    function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6d2b79f5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    function noise(x, z) { return Math.sin(x * 0.027 + 0.7) * Math.cos(z * 0.031 - 0.9) + 0.6 * Math.sin((x - z) * 0.045 + 1.7) + 0.3 * Math.sin(x * 0.09 + z * 0.07); }

    // 좌판(앞 +z): 낮은 나무 상 + 기둥 넷 + 붉은 차양(금 줄) + 엿판·팥 자루·바구니 + 뒤에 걸린 체
    function stallGeo() {
      var p = [part(GEO.box, C.go2, [0, 4.2, 1.0], [16, 0.8, 7])];
      [[7.2, 4.0], [-7.2, 4.0], [7.2, -2.0], [-7.2, -2.0]].forEach(function (l) { p.push(part(GEO.box, C.go1, [l[0], 1.9, l[1]], [0.8, 3.8, 0.8])); });
      p.push(part(GEO.box, C.go1, [7.8, 6.6, -3.4], [0.9, 13.2, 0.9]), part(GEO.box, C.go1, [-7.8, 6.6, -3.4], [0.9, 13.2, 0.9]));
      p.push(part(GEO.box, C.go1, [7.8, 5.5, 5.0], [0.7, 11, 0.7]), part(GEO.box, C.go1, [-7.8, 5.5, 5.0], [0.7, 11, 0.7]));
      p.push(part(GEO.box, C.rd2, [0, 12.1, 0.8], [17.6, 0.5, 10.6], [0.18, 0, 0]));
      p.push(part(GEO.box, C.go4, [4.6, 12.4, 0.8], [1.6, 0.5, 10.6], [0.18, 0, 0]), part(GEO.box, C.go4, [-4.6, 12.4, 0.8], [1.6, 0.5, 10.6], [0.18, 0, 0]));
      p.push(part(GEO.box, C.go4, [0, 10.6, 6.0], [17.7, 1.0, 0.3]));
      // 물건
      p.push(part(GEO.box, C.go3, [-4.6, 4.9, 2.0], [5.2, 0.6, 3.6]));
      [[1.1, C.go6], [2.0, C.go5], [2.9, C.go6]].forEach(function (s) { p.push(part(cyl(0.4, 0.4, 4.6, 5), s[1], [-4.6, 5.4, s[0]], 1, [0, 0, PI / 2])); });
      p.push(part(ball(6, 4), C.go4, [1.0, 6.4, 0.6], [2.1, 2.3, 2.0]), part(ball(5, 3), C.rd1, [1.0, 8.4, 0.6], [1.5, 0.6, 1.5]));
      p.push(part(cyl(2.2, 1.6, 1.8, 7), C.go2, [5.2, 5.5, 2.0]), part(GEO.ico0, C.rd3, [5.2, 6.4, 2.0], [1.8, 0.6, 1.8]));
      p.push(part(torus(2.6, 0.45, 3, 10), C.go2, [-2.6, 9.2, -3.1]), part(new THREE.CircleGeometry(2.4, 10), C.sl1, [-2.6, 9.2, -3.0]));
      return merge(p);
    }
    function poleGeo() { // 초롱 기둥: 나무 기둥 + 팔 + 끈 + 받침돌. 초롱은 (3.4, 11.8, 0) 에 따로(발광 인스턴스)
      return merge([part(GEO.box, C.go1, [0, 7.5, 0], [0.9, 15, 0.9]), part(GEO.box, C.go1, [1.8, 14.6, 0], [4.2, 0.6, 0.6]), part(GEO.box, C.go0, [3.4, 13.8, 0], [0.18, 1.4, 0.18]), part(GEO.ico0, C.ink5, [0, 0.5, 0], [1.9, 0.9, 1.9])]);
    }
    function lanternGeo() { // 초롱: 금빛 비단 몸 + 붉은 위·아래 테 + 술(원점 = 초롱 가운데)
      return merge([part(cyl(1.5, 1.5, 2.8, 6), C.go5, [0, 0, 0]), part(cyl(0.9, 1.6, 0.6, 6), C.rd3, [0, 1.7, 0]), part(cyl(1.6, 1.1, 0.6, 6), C.rd3, [0, -1.7, 0]), part(GEO.box, C.rd4, [0, -2.6, 0], [0.3, 1.2, 0.3])]);
    }
    function matGeo() { // 멍석: 납작한 짚 깔개 + 엮은 줄
      return merge([part(GEO.box, C.go2, [0, 0.18, 0], [14, 0.36, 9]), part(GEO.box, C.go1, [0, 0.4, 2.4], [14, 0.1, 0.6]), part(GEO.box, C.go1, [0, 0.4, -2.4], [14, 0.1, 0.6]), part(GEO.box, C.go3, [0, 0.4, 0], [14, 0.1, 0.4])]);
    }
    function pileGeo() { // 장터 무더기: 팥 자루 둘 + 바구니 + 장독
      return merge([
        part(ball(6, 4), C.go3, [0, 2.6, 0], [2.6, 2.8, 2.4]), part(ball(5, 3), C.rd2, [0, 5.0, 0], [1.8, 0.7, 1.7]),
        part(ball(6, 4), C.go4, [3.6, 2.2, 1.2], [2.2, 2.3, 2.1]), part(ball(5, 3), C.rd1, [3.6, 4.2, 1.2], [1.5, 0.6, 1.5]),
        part(cyl(2.4, 1.8, 2.2, 7), C.go2, [-3.4, 1.1, 1.8]), part(GEO.ico0, C.go5, [-3.4, 2.4, 1.8], [2.0, 0.7, 2.0]),
        part(ball(7, 5), C.go1, [0.6, 3.2, -4.0], [3.0, 3.3, 3.0]), part(cyl(1.6, 1.9, 0.8, 7), C.go0, [0.6, 6.6, -4.0]),
      ]);
    }
    function treeGeo() { // 감나무: 줄기 + 짙은 잎 덩이 둘 + 주황 감
      return merge([part(cyl(1.4, 2.0, 10, 5), C.go1, [0, 5, 0]), part(GEO.ico1, C.gr1, [0, 15, 0], [8.5, 6.5, 8.5]), part(GEO.ico1, C.gr2, [-2.5, 19.5, 1], [6, 4.8, 6]),
        part(GEO.ico0, C.go3, [4.6, 16.4, 4.2], 0.95), part(GEO.ico0, C.go3, [-3.6, 13.2, 6.2], 0.95), part(GEO.ico0, C.go4, [1.2, 21.4, 4.0], 0.85), part(GEO.ico0, C.go3, [-6.2, 17.8, -2.0], 0.9)]);
    }
    function fenceGeo(len) { // 싸리 울타리 한 칸(x 축 길이 len): 판 + 삐죽한 싸릿대 + 가로 동임 둘
      var p = [part(GEO.box, C.go2, [0, 3.2, 0], [len, 6.4, 0.7])];
      for (var i = 0; i < 5; i++) p.push(part(GEO.box, C.go3, [-len / 2 + (i + 0.5) * len / 5, 4.2 + (i % 2) * 0.6, 0], [0.6, 8.4, 0.6], [0, 0, (i % 3 - 1) * 0.08]));
      p.push(part(GEO.box, C.go1, [0, 2.2, 0], [len + 0.4, 0.6, 1.0]), part(GEO.box, C.go1, [0, 5.0, 0], [len + 0.4, 0.6, 1.0]));
      return merge(p);
    }

    function makeGround(dawn) {
      var root = new THREE.Group(); root.name = "nightmarket";
      var mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
      var R = rng(20261030);
      // 배치(손으로 고정): 좌판은 가장자리 줄에 몇 묶음, 가운데는 비운다(적이 사방에서 몰려온다)
      var stalls = [];
      [[70, 0], [130, 0], [300, 0], [360, 0], [470, 0]].forEach(function (s) { stalls.push({ x: s[0], z: 26, ry: 0 }); });
      [[90, 0], [200, 0], [380, 0], [440, 0]].forEach(function (s) { stalls.push({ x: s[0], z: W - 26, ry: PI }); });
      [[120, 0], [180, 0], [390, 0]].forEach(function (s) { stalls.push({ x: 24, z: s[0], ry: PI / 2 }); });
      [[160, 0], [330, 0], [390, 0]].forEach(function (s) { stalls.push({ x: W - 24, z: s[0], ry: -PI / 2 }); });
      stalls.forEach(function (s) { s.s = 1; });
      var poles = [];
      [[30, 60], [210, 30], [250, 34], [420, 30], [515, 60], [510, 250], [512, 470], [300, 510], [150, 506], [30, 470], [28, 280],
        [150, 150], [395, 150], [150, 395], [400, 400], [270, 120], [270, 430], [110, 270], [430, 270]].forEach(function (q, i) { poles.push({ x: q[0], z: q[1], ry: i * 1.7 }); });
      var mats = [];
      [[170, 120, 0.3], [130, 410, -0.5], [420, 130, 0.9], [410, 420, 0.2], [62, 230, 1.4], [482, 300, -1.2], [250, 70, 0.1], [300, 480, -0.2], [70, 330, 0.6], [480, 80, 0.4]].forEach(function (q) { mats.push({ x: q[0], z: q[1], ry: q[2] }); });
      var piles = [];
      stalls.forEach(function (s, i) { if (i % 2 === 0) { var c = Math.cos(s.ry), sn = Math.sin(s.ry), lx = 12, lz = 1; piles.push({ x: s.x + lx * c + lz * sn, z: s.z - lx * sn + lz * c, ry: s.ry + 0.6, s: 0.9 }); } });
      [[160, 140], [400, 410], [140, 425], [415, 120]].forEach(function (q, i) { piles.push({ x: q[0], z: q[1], ry: i * 2.1, s: 1 }); });
      var trees = [];
      [[-34, 70], [-38, 310], [-30, 480], [574, 100], [578, 270], [570, 455], [120, -36], [430, -34], [60, 576], [300, 572], [490, 574], [-30, -30]].forEach(function (q) { trees.push({ x: q[0], z: q[1], ry: R() * TAU, s: 0.9 + R() * 0.3 }); });

      // 초롱 자리(기둥 끝 + 좌판 차양 앞 귀퉁이) — 바닥 빛 웅덩이도 여기서
      var lanterns = [];
      poles.forEach(function (p) { var c = Math.cos(p.ry), s = Math.sin(p.ry); lanterns.push({ x: p.x + 3.4 * c, y: 11.8, z: p.z - 3.4 * s }); });
      stalls.forEach(function (st) { var c = Math.cos(st.ry), s = Math.sin(st.ry); [8.4, -8.4].forEach(function (lx) { var lz = 6.0; lanterns.push({ x: st.x + lx * c + lz * s, y: 8.4, z: st.z - lx * s + lz * c }); }); });

      // 바닥(2판): 다진 흙. 색을 칸(삼각형)마다 끊지 않고 꼭짓점마다 매끈한 잡음으로 정해 사이를 섞는다 — 계단진 얼룩이 없다.
      // 삼각형마다 밝기만 ±4 % 흔들어 평면 음영 결은 남긴다. 밤 색·새벽 색 두 벌을 들고 setDawn 이 섞는다.
      // 밤: 남색 잉크(#322b52 바탕 → 어두운 쪽 #3a3f5c, 밝은 쪽 #463d6b). 새벽: 따뜻한 흙(#a8492a 와 #5f5687 반반 = 모브 갈색) → 그늘 #5f5687 라벤더 · 볕 #ff9a86 복숭아.
      var cI4 = new THREE.Color(C.ink4), cS0 = new THREE.Color(C.sl0), cI5 = new THREE.Color(C.ink5), cI6 = new THREE.Color(C.ink6), cPe = new THREE.Color(C.rd5), cEarth = new THREE.Color(C.go2).lerp(cI6, 0.5);
      var OUT_N = new THREE.Color(C.ink2), OUT_D = new THREE.Color(C.ink5).lerp(cI6, 0.5), POOL = new THREE.Color(C.go2);
      var span = W + 2 * MARGIN, N = 60, cell = span / N, nT = N * N * 2;
      var pos = new Float32Array(nT * 9), cN = new Float32Array(nT * 9), cD = new Float32Array(nT * 9), o = 0;
      function pool(x, z) {
        if (x < -2 || z < -2 || x > W + 2 || z > W + 2) return 0;
        var w = 0;
        for (var li = 0; li < lanterns.length; li++) { var L = lanterns[li], dd = Math.hypot(L.x - x, L.z - z); if (dd < 30) w = Math.max(w, (1 - dd / 30) * (1 - dd / 30)); }
        return w;
      }
      // 꼭짓점 색 표(격자 (N+1)²): 밤·새벽
      var VN = [], VD = [];
      for (var vj = 0; vj <= N; vj++) for (var vi = 0; vi <= N; vi++) {
        var x = -MARGIN + vi * cell, z = -MARGIN + vj * cell, cn = new THREE.Color(), cd = new THREE.Color();
        if (x < -4 || z < -4 || x > W + 4 || z > W + 4) { cn.copy(OUT_N); cd.copy(OUT_D); }
        else {
          var t = (noise(x, z) + 0.45 * Math.sin(x * 0.083 + 0.4) * Math.cos(z * 0.077 + 1.2)) / 1.7; t = t < -1 ? -1 : t > 1 ? 1 : t;
          if (t < 0) { cn.copy(cI4).lerp(cS0, -t); cd.copy(cEarth).lerp(cI6, -t * 0.75); }
          else { cn.copy(cI4).lerp(cI5, t); cd.copy(cEarth).lerp(cPe, t * 0.5); }
          var w = pool(x, z); if (w > 0) cn.lerp(POOL, w * 0.6); // 초롱 빛 웅덩이
        }
        VN.push(cn); VD.push(cd);
      }
      for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
        var a00 = j * (N + 1) + i, a01 = (j + 1) * (N + 1) + i, tri2 = [[a00, a01, a00 + 1], [a00 + 1, a01, a01 + 1]];
        for (var k = 0; k < 2; k++) {
          var jit = 1 + (R() - 0.5) * 0.08;
          for (var q = 0; q < 3; q++) {
            var vk = tri2[k][q], vx = -MARGIN + (vk % (N + 1)) * cell, vz = -MARGIN + Math.floor(vk / (N + 1)) * cell, a = VN[vk], d = VD[vk];
            pos[o] = vx; pos[o + 1] = 0; pos[o + 2] = vz;
            cN[o] = a.r * jit; cN[o + 1] = a.g * jit; cN[o + 2] = a.b * jit; cD[o] = d.r * jit; cD[o + 1] = d.g * jit; cD[o + 2] = d.b * jit; o += 3;
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
      // 가림(Surv3D 코코 나무와 같은 법): 카메라와 꼬마 사이·꼬마 앞의 좌판·나무를 반투명 인스턴스로 옮긴다
      var ghostMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.3, depthWrite: false });
      function occluder(name, geo, list, rad, hgt, pad) {
        var n = list.length, solid = inst(name, geo, list);
        var ghost = new THREE.InstancedMesh(geo, ghostMat, n);
        ghost.name = name + "Ghost"; ghost.count = 0; ghost.renderOrder = 2; root.add(ghost);
        solid.frustumCulled = ghost.frustumCulled = false;
        solid.instanceMatrix.setUsage(THREE.DynamicDrawUsage); ghost.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        var M0 = new Float32Array(solid.instanceMatrix.array), X = new Float32Array(n), Z = new Float32Array(n), RR = new Float32Array(n), HH = new Float32Array(n);
        for (var i = 0; i < n; i++) { X[i] = list[i].x; Z[i] = list[i].z; RR[i] = rad * (list[i].s || 1); HH[i] = hgt * (list[i].s || 1); }
        var flag = new Uint8Array(n);
        return function (px, pz, dx, dz, tanT) {
          var changed = false, i;
          for (i = 0; i < n; i++) {
            var vx = X[i] - px, vz = Z[i] - pz, along = vx * dx + vz * dz, lat = vx * dz - vz * dx;
            if (lat < 0) lat = -lat;
            var hy = flag[i] ? 10 : 0; // 문턱 깜빡임 막는 이력
            var hit = along > -RR[i] - 6 - hy && along < (HH[i] + RR[i]) / tanT + pad + hy && lat < RR[i] + pad + hy ? 1 : 0;
            if (hit !== flag[i]) { flag[i] = hit; changed = true; }
          }
          if (!changed) return;
          var a = solid.instanceMatrix.array, b = ghost.instanceMatrix.array, ns = 0, ng = 0, k;
          for (i = 0; i < n; i++) {
            if (flag[i]) { for (k = 0; k < 16; k++) b[ng * 16 + k] = M0[i * 16 + k]; ng++; }
            else { for (k = 0; k < 16; k++) a[ns * 16 + k] = M0[i * 16 + k]; ns++; }
          }
          solid.count = ns; ghost.count = ng;
          solid.instanceMatrix.needsUpdate = true; ghost.instanceMatrix.needsUpdate = true;
        };
      }
      var occ = [occluder("stalls", stallGeo(), stalls, 9, 13, 10), occluder("trees", treeGeo(), trees, 9, 26, 16)];
      inst("poles", poleGeo(), poles);
      var glowMat = new THREE.MeshBasicMaterial({ vertexColors: true }); // 빛을 안 받는다 = 스스로 빛나 보인다. 새벽엔 색을 낮춘다.
      var lanternMesh = inst("lanterns", lanternGeo(), lanterns, glowMat);
      inst("mats", matGeo(), mats);
      inst("piles", pileGeo(), piles);
      var FL = 30, fence = [];
      for (var e = -FL / 2; e <= W + FL / 2; e += FL) fence.push({ x: e, z: -7, ry: 0 }, { x: e, z: W + 7, ry: PI }, { x: -7, z: e, ry: PI / 2 }, { x: W + 7, z: e, ry: -PI / 2 });
      inst("fence", fenceGeo(FL), fence);

      var lastDawn = -1, cA = colAttr.array, ON = new THREE.Color(C.sl5).lerp(new THREE.Color(C.go6), 0.5), OFF = new THREE.Color(C.sl2);
      function setDawn(v) {
        var d = clamp01(v || 0);
        if (Math.abs(d - lastDawn) < 0.004) return; // 바뀐 만큼만 다시 쓴다
        lastDawn = d;
        var w = d * d * (3 - 2 * d) * 0.9;
        for (var i = 0; i < cA.length; i++) cA[i] = cN[i] + (cD[i] - cN[i]) * w;
        colAttr.needsUpdate = true;
        glowMat.color.copy(ON).lerp(OFF, ease((d - 0.4) / 0.6)); // 0.4 까지는 환하게, 1 이면 꺼진 초롱
      }
      setDawn(dawn);
      // occlude(px, pz, camPos): 매 프레임 시안이 부른다(꼬마 규칙 좌표 x·y, 카메라 THREE.Vector3). 할당 없음.
      function occlude(px, pz, cam) {
        var dx = cam.x - px, dz = cam.z - pz, hd = Math.sqrt(dx * dx + dz * dz);
        if (hd < 1e-3) { dx = 0; dz = 1; hd = 1e-3; } else { dx /= hd; dz /= hd; }
        var tanT = Math.max(0.2, cam.y / hd);
        for (var i = 0; i < occ.length; i++) occ[i](px, pz, dx, dz, tanT);
      }
      root.userData.drawCalls = root.children.length;
      return { root: root, setDawn: setDawn, occlude: occlude, lanterns: lanterns, lanternMesh: lanternMesh };
    }

    return {
      makeHero: makeHero, enemyGeometry: enemyGeometry, pickupGeometry: pickupGeometry, projGeometry: projGeometry,
      sieveGeometry: sieveGeometry, sieveRingGeometry: sieveRingGeometry, makeGround: makeGround, blobTexture: Surv3D.blobTexture,
      ENEMY_KINDS: Object.keys(ENEMY), PICKUP_KINDS: Object.keys(PICK), PROJ_KINDS: Object.keys(PROJ), POSES: ["idle", "walk", "lost"],
      PALETTE: C, triCount: triCount,
    };
  }

  window.Gob3D = { build: build };
})();
