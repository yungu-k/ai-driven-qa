/* 코코의 하루 3D — 로우폴리 모델·자세 (1판, 2026-10-28)
 * 고전 스크립트: window.Surv3D = { build(THREE) → api }. 외부 모델·텍스처 파일 없음, 기본 도형 조립.
 * 좌표: 월드 단위 그대로. 규칙 x → three x, 규칙 y → three z, 높이 = three y, 바닥 y = 0.
 * 색은 docs/lab-surv-coco-hd-artdir.md 3절 표의 hex 만 쓴다(아트 디렉션 docs/lab-surv-coco-3d-artdir.md).
 */
(function () {
  "use strict";

  // ── 팔레트(HD 3절 표에서 그대로) ─────────────────────────────
  var C = {
    fur0: "#5e2a16", fur1: "#8e4526", fur2: "#b8643a", fur3: "#d98a5a", fur4: "#f2b98a",
    cream0: "#c9a27a", cream1: "#e8c9a0", cream2: "#f6e3c4", cream3: "#fff4e3",
    ink0: "#24161d", ink1: "#3a2228", ink2: "#5a3a42",
    shine0: "#fff6e8", shine1: "#fffbf4",
    tongue0: "#d9546a", tongue1: "#f07a8a", blush: "#ffb3bd",
    teal0: "#1f8f86", teal1: "#2fb5a8", teal2: "#7fe0d4",
    purp0: "#6a3fb8", purp1: "#8b5cd6", purp2: "#b99af0",
    flY: "#ffd166", flP: "#ff8fb1",
    tee0: "#d9d2c6", tee1: "#efe8dc", tee2: "#f8f4ec",
    g0: "#2f7d4a", g1: "#47a35a", g2: "#6cc46a", g3: "#9bdc7c", g4: "#cdeea0",
    p0: "#b98d5e", p1: "#d9b27f", p2: "#ecd3a6", p3: "#f7e8c8",
    flB: "#8fd3ff", wood0: "#7a4a2a", wood1: "#a8693e",
    br0: "#2a8fa8", br1: "#5ad1e6", br2: "#a8eef8", brS: "#e8f4fb",
    su0: "#9ec9ee", su1: "#cfe8fb", su2: "#eef8ff", suR1: "#b9a6ff", suR2: "#8fe3ff", suR3: "#ffd1f0",
    be0: "#a8742a", be1: "#e0a640", be2: "#ffcf4d", be3: "#ffe9a3", btn0: "#c43a48", btn1: "#ff5d5d",
    va0: "#3b4290", va1: "#4a54b0", va2: "#6c7ae0", va3: "#a3adf5", rub: "#2c2a3a",
    dg0: "#7d8292", dg1: "#a7acba", dg2: "#cfd3dc", dg3: "#eceef3",
    bo0: "#3e4260", bo1: "#5a5f7a", bo2: "#8a90ad", tub0: "#cdd6e4", tub1: "#f3f6fb", cr0: "#9aa6bd", cr1: "#dfe6f2",
    lamp: "#ffd36b", glow: "#fff0b8",
  };

  function build(THREE) {
    var V3 = THREE.Vector3;
    var TAU = Math.PI * 2;

    // ── 공용 도형 ─────────────────────────────────────────────
    var GEO = {
      ico0: new THREE.IcosahedronGeometry(1, 0), // 20 삼각형
      ico1: new THREE.IcosahedronGeometry(1, 1), // 80
      ico2: new THREE.IcosahedronGeometry(1, 2), // 320
      curl: new THREE.SphereGeometry(1, 7, 5), // 56 — 작은 곱슬
      leg: new THREE.CapsuleGeometry(1.2, 4.6, 2, 7),
      stick: new THREE.CapsuleGeometry(0.5, 2.4, 1, 6),
    };
    function triCount(g) { return (g.index ? g.index.count : g.attributes.position.count) / 3; }

    // ── 정점 색 합치기(인스턴싱용 한 덩어리) ─────────────────────
    var _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
    function part(geo, hex, pos, scl, rot) {
      var g = geo.index ? geo.toNonIndexed() : geo.clone();
      _e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0);
      _q.setFromEuler(_e);
      var s = scl == null ? [1, 1, 1] : typeof scl === "number" ? [scl, scl, scl] : scl;
      _m.compose(new V3(pos[0], pos[1], pos[2]), _q, new V3(s[0], s[1], s[2]));
      g.applyMatrix4(_m);
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
    // 같은 무리(Group) 안 같은 재질 메시를 하나로 — 그리기 호출을 줄인다(정점 색 없음)
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
    function cyl(rt, rb, h, seg) { return new THREE.CylinderGeometry(rt, rb, h, seg || 8, 1); }
    function tube(r, h, seg) { return new THREE.CylinderGeometry(r, r, h, seg || 12, 1, true); }
    function lowBall(w, h) { return new THREE.SphereGeometry(1, w || 7, h || 5); }

    // 피보나치 구 위 점
    function fib(n) {
      var out = [], ga = Math.PI * (3 - Math.sqrt(5));
      for (var i = 0; i < n; i++) {
        var y = 1 - (i + 0.5) * 2 / n, r = Math.sqrt(1 - y * y), th = ga * i;
        out.push(new V3(Math.cos(th) * r, y, Math.sin(th) * r));
      }
      return out;
    }

    // ══ 코코 ═════════════════════════════════════════════════
    var HIP_Y = 7.2, HIP_Z = -3.5;
    function makeCoco(outfit) {
      outfit = outfit === "tee" ? "tee" : "harness";
      var mats = {};
      function M(hex) { return mats[hex] || (mats[hex] = new THREE.MeshLambertMaterial({ color: hex, flatShading: true })); }
      function mesh(geo, hex, parent, p, s) {
        var m = new THREE.Mesh(geo, M(hex));
        m.position.set(p[0], p[1], p[2]);
        if (s != null) { if (typeof s === "number") m.scale.setScalar(s); else m.scale.set(s[0], s[1], s[2]); }
        parent.add(m); return m;
      }
      function G(name, parent, p) { var g = new THREE.Group(); g.name = name; if (p) g.position.set(p[0], p[1], p[2]); parent.add(g); return g; }

      var root = new THREE.Group(); root.name = "coco";
      var rig = G("rig", root);
      var hip = G("hip", rig, [0, HIP_Y, HIP_Z]);

      // 몸통: 납작한 공 + 곱슬 공
      var BODY_C = new V3(0, 1, 3.4), BODY_R = new V3(3.7, 3.5, 6.0);
      mesh(GEO.ico2, C.fur2, hip, [BODY_C.x, BODY_C.y, BODY_C.z], [BODY_R.x, BODY_R.y, BODY_R.z]);
      // 등선 곱슬(윤곽만 물결지게 — 몸 전체를 덮지 않는다)
      [[0, 0.98, -0.75], [0, 1.0, -0.2], [0.55, 0.8, -0.45], [-0.55, 0.8, -0.45], [0.75, 0.55, 0.1], [-0.75, 0.55, 0.1], [0.7, 0.6, -0.75], [-0.7, 0.6, -0.75]].forEach(function (d) {
        var p = new V3(d[0] * BODY_R.x * 0.9, d[1] * BODY_R.y * 0.9, d[2] * BODY_R.z * 0.9).add(BODY_C);
        mesh(GEO.ico1, C.fur2, hip, [p.x, p.y, p.z], 1.7);
      });
      // 가슴 털(목 아래 볼록)
      mesh(GEO.ico1, C.fur2, hip, [0, 2.8, 7.4], [3.1, 3.4, 2.9]);
      // 엉덩이 볼록(뒷다리 허벅지)
      // 옷
      var cloth = G("cloth", hip);
      if (outfit === "harness") {
        var band = mesh(tube(1, 4.2, 12), C.teal1, cloth, [0, 1.15, 6.0], [3.95, 1, 3.75]);
        band.rotation.x = Math.PI / 2;
        [[3.75, 7.9], [3.95, 4.1]].forEach(function (r) {
          var t = mesh(new THREE.TorusGeometry(1, 0.13, 4, 14), C.purp1, cloth, [0, 1.15, r[1]], [r[0] + 0.15, r[0], 1]);
          t.rotation.set(0, 0, 0);
        });
        // 꽃무늬(등·옆)
        [[0, 1, 5.2, C.flY], [0.75, 0.62, 6.6, C.flP], [-0.75, 0.62, 6.6, C.flP], [0.42, 0.9, 7.4, C.flY], [-0.42, 0.9, 5.0, C.purp2], [0.95, 0.15, 5.0, C.flY], [-0.95, 0.15, 6.0, C.flY]].forEach(function (f) {
          var len = Math.hypot(f[0], f[1]);
          mesh(GEO.ico0, f[3], cloth, [f[0] / len * 3.95, 1.15 + f[1] / len * 3.85, f[2]], [0.62, 0.62, 0.62]);
        });
        mesh(GEO.ico1, C.be1, cloth, [0, -0.6, 8.6], 0.65); // 이름표(금)
      } else {
        var tee = mesh(tube(1, 6.6, 12), C.tee2, cloth, [0, 1.05, 3.5], [3.9, 1, 3.7]);
        tee.rotation.x = Math.PI / 2;
        [[3.65, 6.9], [3.75, 0.25]].forEach(function (r) {
          mesh(new THREE.TorusGeometry(1, 0.16, 4, 14), C.tee0, cloth, [0, 1.05, r[1]], [r[0] + 0.15, r[0], 1]);
        });
        // 곰 무늬(등에 둘)
        [[0, 4.9, 4.8], [0, 4.75, 1.8]].forEach(function (b) {
          mesh(GEO.ico1, C.fur2, cloth, [b[0], b[1], b[2]], [0.85, 0.3, 0.85]);
          mesh(GEO.ico0, C.fur2, cloth, [b[0] + 0.7, b[1] - 0.05, b[2] + 0.55], [0.38, 0.25, 0.38]);
          mesh(GEO.ico0, C.fur2, cloth, [b[0] - 0.7, b[1] - 0.05, b[2] + 0.55], [0.38, 0.25, 0.38]);
        });
      }

      // 다리 넷(어깨·엉덩이가 축)
      function leg(name, p, hind) {
        var g = G(name, hip, p);
        mesh(GEO.leg, C.fur2, g, [0, -3.5, 0]);
        mesh(GEO.curl, C.fur2, g, [0, -2.0, 0.1], [1.45, 2.0, 1.45]); // 통통한 다리 털
        mesh(GEO.ico1, C.fur2, g, [0, -6.3, 0.45], [1.35, 0.85, 1.6]); // 발
        if (hind) mesh(GEO.ico1, C.fur2, g, [0, 0.2, -0.3], [2.3, 2.6, 2.6]); // 허벅지
        return g;
      }
      var legFL = leg("legFL", [1.75, -0.4, 6.6], false), legFR = leg("legFR", [-1.75, -0.4, 6.6], false);
      var legBL = leg("legBL", [1.85, -0.4, 0.6], true), legBR = leg("legBR", [-1.85, -0.4, 0.6], true);

      // 꼬리(뿌리가 축) + 방울
      var tail = G("tail", hip, [0, 3.6, -2.0]);
      mesh(GEO.stick, C.fur2, tail, [0, 1.6, 0]);
      mesh(GEO.ico1, C.fur2, tail, [0, 4.0, 0], 2.0);
      fib(4).forEach(function (d, i) { mesh(GEO.curl, i % 2 ? C.fur3 : C.fur2, tail, [d.x * 1.55, 4 + d.y * 1.55, d.z * 1.55], 1.1); });

      // 목·머리
      var NECK0 = new V3(0, 4.4, 7.8), HEAD0 = new V3(0, 3.6, 1.6), HEAD_PITCH = -0.14;
      var neck = G("neck", hip, [NECK0.x, NECK0.y, NECK0.z]);
      var head = G("head", neck, [HEAD0.x, HEAD0.y, HEAD0.z]);
      var HR = 4.3;
      mesh(GEO.ico2, C.fur2, head, [0, 0, 0], [HR * 1.04, HR, HR]);
      // 정수리 볼록(테디 컷) + 둘레 곱슬 한 줄(가리비 윤곽)
      mesh(GEO.ico2, C.fur2, head, [0, 1.7, -0.4], [HR * 0.92, HR * 0.72, HR * 0.9]);
      for (var ci = 0; ci < 12; ci++) {
        var ca = ci / 12 * TAU + 0.26, front = Math.cos(ca) > 0.55; // 앞쪽(얼굴 위) 곱슬은 낮고 작게
        mesh(GEO.ico1, C.fur2, head, [Math.sin(ca) * HR * 0.86, 2.9 + (front ? -0.3 : 0), Math.cos(ca) * HR * 0.84 - 0.4], front ? 1.25 : 1.6);
      }
      [[0, 4.6, -0.2], [1.3, 4.1, -1.8], [-1.3, 4.1, -1.8]].forEach(function (c) { mesh(GEO.ico1, C.fur2, head, c, 1.55); });
      // 볼 털(얼굴을 둥글게)
      mesh(GEO.ico1, C.fur2, head, [2.7, -1.3, 1.6], [2.0, 2.0, 2.2]);
      mesh(GEO.ico1, C.fur2, head, [-2.7, -1.3, 1.6], [2.0, 2.0, 2.2]);
      // 주둥이 + 흰 털 조금 + 코
      mesh(GEO.ico1, C.fur4, head, [0, -1.55, 3.4], [2.15, 1.6, 2.05]);
      [[0.9, -2.55, 4.5], [-0.9, -2.55, 4.5], [0, -2.8, 4.1], [1.5, -1.9, 4.6], [-1.5, -1.9, 4.6]].forEach(function (w, i) {
        mesh(GEO.ico0, i < 3 ? C.cream3 : C.cream2, head, w, 0.5);
      });
      mesh(GEO.ico1, C.ink0, head, [0, -0.9, 5.35], [0.75, 0.58, 0.55]);
      mesh(GEO.ico0, C.shine1, head, [-0.25, -0.55, 5.85], 0.18);
      // 입(짖기) · 혀(스키)
      var mouth = mesh(GEO.ico1, C.ink1, head, [0, -2.55, 4.6], [0.85, 0.55, 0.5]);
      var tongue = mesh(GEO.ico1, C.tongue1, head, [0, -2.95, 5.0], [0.5, 0.3, 0.75]);
      mouth.userData.solo = tongue.userData.solo = true;
      // 볼
      mesh(GEO.ico0, C.blush, head, [2.65, -1.1, 3.25], [0.75, 0.5, 0.3]).rotation.y = 0.7;
      mesh(GEO.ico0, C.blush, head, [-2.65, -1.1, 3.25], [0.75, 0.5, 0.3]).rotation.y = -0.7;
      // 눈(크고 까맣게) + 반짝
      function eye(x) {
        var g = G("eye", head, [x, 0.5, 3.6]);
        mesh(GEO.ico1, C.ink0, g, [0, 0, 0], [1.3, 1.4, 0.9]);
        var s = mesh(GEO.ico0, C.shine1, g, [-0.38, 0.5, 0.78], 0.42);
        var s2 = mesh(GEO.ico0, C.shine0, g, [0.42, -0.42, 0.8], 0.2);
        s.userData.solo = s2.userData.solo = true;
        g.userData.shine = [s, s2];
        g.rotation.y = x * 0.12;
        return g;
      }
      var eyeL = eye(1.75), eyeR = eye(-1.75);
      // 귀(위 끝이 축) — 길게 늘어지고 끝은 크림
      function ear(sx) {
        var g = G("ear", head, [sx * 4.1, 1.7, 0.6]);
        mesh(GEO.ico1, C.fur3, g, [sx * 0.7, -1.2, 0], [1.8, 2.2, 1.5]);
        mesh(GEO.ico1, C.fur4, g, [sx * 1.0, -3.2, 0.1], [1.8, 1.9, 1.5]);
        mesh(GEO.ico1, C.cream1, g, [sx * 0.95, -4.9, 0.1], [1.7, 1.5, 1.45]);
        mesh(GEO.curl, C.cream2, g, [sx * 1.1, -5.3, 0.6], 0.9);
        mesh(GEO.curl, C.cream2, g, [sx * 0.3, -5.5, -0.3], 0.85);
        return g;
      }
      var earL = ear(1), earR = ear(-1);

      var LEGS = [legFL, legFR, legBL, legBR];
      var matList = function () { return Object.keys(mats).map(function (k) { return mats[k]; }); };

      function eyes(open, squint) {
        [eyeL, eyeR].forEach(function (e) {
          e.scale.set(1, open ? 1 : squint ? 0.22 : 0.16, 1);
          e.position.y = open ? 0.5 : squint ? 0.8 : 0.3;
          e.userData.shine.forEach(function (s) { s.visible = open; });
        });
      }
      function ease(a) { return a < 0 ? 0 : a > 1 ? 1 : a * a * (3 - 2 * a); }
      // 앉기 탄성: 0.85 → 1.06 → 1 (0.35초)
      function settle(pT) {
        if (pT >= 0.35) return 1;
        if (pT < 0.14) return 0.85 + 0.21 * ease(pT / 0.14);
        return 1.06 - 0.06 * ease((pT - 0.14) / 0.21);
      }

      function pose(t, name, poseT, o) {
        o = o || {};
        var sp = o.speed == null ? 1 : Math.max(0, Math.min(1, o.speed));
        var red = !!o.reduce, hurt = o.hurt === true ? 1 : +o.hurt || 0;
        var pT = poseT == null ? 1 : poseT;
        // 초기화
        rig.position.set(0, 0, 0); rig.rotation.set(0, 0, 0); rig.scale.set(1, 1, 1);
        hip.position.set(0, HIP_Y, HIP_Z); hip.rotation.set(0, 0, 0); hip.scale.set(1, 1, 1);
        neck.position.copy(NECK0); neck.rotation.set(0, 0, 0);
        head.position.copy(HEAD0); head.rotation.set(HEAD_PITCH, 0, 0);
        LEGS.forEach(function (l) { l.rotation.set(0, 0, 0); });
        earL.rotation.set(0, 0, 0.08); earR.rotation.set(0, 0, -0.08);
        tail.rotation.set(-0.55, 0, 0);
        mouth.visible = false; mouth.scale.set(0.85, 0.55, 0.5); tongue.visible = false;
        var blink = ((t + 1.3) % 3.9) < 0.12 || ((t + 0.2) % 5.3) < 0.1;
        eyes(!blink, false);

        // 앉은 꼴(sit·wag 공통): 엉덩이 낮추고 몸 뒤로 −30°, 앞다리 곧게, 뒷다리 접어 앞으로
        function sitBase() {
          var a = -0.55;
          hip.position.y = 3.7; hip.rotation.x = a;
          legFL.rotation.x = legFR.rotation.x = -a - 0.08;
          legBL.rotation.x = legBR.rotation.x = -1.0 - a;
          neck.rotation.x = -a * 0.85;
          tail.rotation.x = -1.35;
        }
        switch (name) {
          case "walk": {
            var f = 1.4 + 2.4 * sp, ph = TAU * f * t, A = 0.44 * (0.35 + 0.65 * sp);
            var s = Math.sin(ph);
            legFL.rotation.x = legBR.rotation.x = A * s;
            legFR.rotation.x = legBL.rotation.x = -A * s;
            rig.position.y = Math.abs(Math.cos(ph)) * 1.0 * sp;
            hip.rotation.x = 0.04 * Math.sin(ph * 2);
            var lag = Math.sin(ph - TAU * f * 0.08); // 귀는 0.08초 늦게
            earL.rotation.x = earR.rotation.x = -0.22 * lag * sp - 0.1 * sp;
            earL.rotation.z = 0.12 + 0.1 * Math.abs(lag); earR.rotation.z = -earL.rotation.z;
            tail.rotation.z = 0.3 * Math.sin(TAU * 3 * t);
            neck.rotation.x = 0.04 * Math.sin(ph * 2 + 0.6);
            break;
          }
          case "wag":
          case "sit": {
            sitBase();
            var st = red ? 1 : settle(pT);
            rig.scale.y = st; rig.scale.x = rig.scale.z = 1 + (1 - st) * 0.5;
            hip.scale.y = 1 + 0.03 * Math.sin(TAU * 0.5 * t);
            if (name === "wag") {
              var w = Math.sin(TAU * 6 * t) * (red ? 0.4 : 1);
              tail.rotation.z = 0.61 * w;
              hip.position.x = 0.6 * Math.sin(TAU * 6 * t + 0.4) * (red ? 0 : 1);
              hip.rotation.z = -0.04 * w;
              earL.rotation.z = 0.32; earR.rotation.z = -0.32;
              earL.rotation.x = earR.rotation.x = -0.18;
              neck.rotation.z = 0.05 * w;
            }
            break;
          }
          case "spin": {
            rig.rotation.y = TAU * 1.5 * t * (red ? 0.5 : 1);
            var fl = red ? 0.5 : 1;
            earL.rotation.z = 1.05 * fl; earR.rotation.z = -1.05 * fl;
            earL.rotation.x = earR.rotation.x = 0.35 * fl; // 회전 반대로 끌림
            tail.rotation.x = -1.2;
            var hop = Math.abs(Math.sin(TAU * 3 * t)) * (red ? 0 : 0.8);
            rig.position.y = hop;
            legFL.rotation.x = legBR.rotation.x = 0.25 * Math.sin(TAU * 3 * t);
            legFR.rotation.x = legBL.rotation.x = -0.25 * Math.sin(TAU * 3 * t);
            eyes(false, true);
            break;
          }
          case "scoot": {
            var a2 = -0.26; // −15°
            hip.position.y = 3.2; hip.rotation.x = a2;
            legFL.rotation.x = legFR.rotation.x = -0.62 - a2; // 앞다리 쭉
            legBL.rotation.x = legBR.rotation.x = -1.5 - a2; // 뒷다리 앞으로 뻗어 바닥에
            neck.rotation.x = -a2 * 0.6;
            rig.scale.set(1, 0.88, 1.15);
            if (!red) rig.position.x = 0.18 * Math.sin(TAU * 7 * t);
            tail.rotation.x = -1.75;
            earL.rotation.x = earR.rotation.x = 0.55; // 뒤로 날림
            earL.rotation.z = 0.3; earR.rotation.z = -0.3;
            eyes(false, true); tongue.visible = true;
            break;
          }
          case "bark": {
            var ph2 = (pT % 0.36) / 0.36, b = red ? 0.4 : Math.sin(Math.PI * Math.min(1, ph2 * 1.6));
            head.position.z = HEAD0.z + 1.5 * b; head.position.y = HEAD0.y + 0.3 * b;
            head.rotation.x = HEAD_PITCH - 0.22 * b;
            mouth.visible = true; mouth.scale.set(0.95, 0.4 + 0.65 * b, 0.6);
            tongue.visible = true;
            earL.rotation.z = 0.45; earR.rotation.z = -0.45;
            earL.rotation.x = earR.rotation.x = -0.55; // 쫑긋
            legFL.rotation.x = legFR.rotation.x = -0.2; legBL.rotation.x = legBR.rotation.x = 0.18;
            hip.rotation.x = -0.06 * b;
            tail.rotation.x = -0.35;
            break;
          }
          case "nap": {
            hip.position.y = 2.5; hip.rotation.x = 0.02;
            hip.scale.y = 1 + 0.035 * Math.sin(TAU * 0.25 * t);
            legFL.rotation.x = legFR.rotation.x = -1.42;
            legBL.rotation.x = legBR.rotation.x = 1.38;
            legBL.rotation.z = 0.25; legBR.rotation.z = -0.25;
            neck.position.set(0, 1.4, 8.2); neck.rotation.x = 0.5;
            head.rotation.x = HEAD_PITCH - 0.2;
            earL.rotation.z = 0.25; earR.rotation.z = -0.25; earL.rotation.x = earR.rotation.x = 0.1;
            tail.rotation.x = -2.05; tail.rotation.z = 0.25;
            eyes(false, false);
            break;
          }
          default:
            sitBase();
        }
        // 맞음: 0.9 찌그러짐 + 밝은 크림 번쩍
        if (hurt > 0) {
          if (!red) { rig.scale.y *= 1 - 0.1 * hurt; rig.scale.x *= 1 + 0.06 * hurt; rig.scale.z *= 1 + 0.06 * hurt; }
        }
        matList().forEach(function (m) { m.emissive.set(C.cream3); m.emissiveIntensity = hurt * 0.55; });
      }
      bakeGroup(root);
      pose(0, "sit", 1, {});
      return { root: root, pose: pose };
    }

    // ══ 적(종류마다 BufferGeometry 하나 + 정점 색) ═══════════════
    // 원점 = 발밑 중앙, +z 가 앞. 크기 = 충돌 반경 × 1.25 × 2 안팎.
    function face(parts, x, y, z, eyeR, gap, angry, shine) {
      parts.push(part(GEO.ico0, C.ink0, [x + gap, y, z], [eyeR, eyeR * 1.15, eyeR * 0.6]));
      parts.push(part(GEO.ico0, C.ink0, [x - gap, y, z], [eyeR, eyeR * 1.15, eyeR * 0.6]));
      if (shine) {
        parts.push(part(GEO.ico0, C.shine1, [x + gap - eyeR * 0.3, y + eyeR * 0.35, z + eyeR * 0.45], eyeR * 0.35));
        parts.push(part(GEO.ico0, C.shine1, [x - gap - eyeR * 0.3, y + eyeR * 0.35, z + eyeR * 0.45], eyeR * 0.35));
      }
      if (angry) {
        var bw = new THREE.BoxGeometry(1, 1, 1);
        parts.push(part(bw, C.ink1, [x + gap, y + eyeR * 1.5, z + 0.1], [eyeR * 1.8, eyeR * 0.45, eyeR * 0.5], [0, 0, 0.45]));
        parts.push(part(bw, C.ink1, [x - gap, y + eyeR * 1.5, z + 0.1], [eyeR * 1.8, eyeR * 0.45, eyeR * 0.5], [0, 0, -0.45]));
      }
    }
    var ENEMY_BUILD = {
      brush: function () {
        var p = [];
        p.push(part(cyl(2.0, 2.5, 6.4, 8), C.br1, [0, 4.2, 0]));
        p.push(part(lowBall(8, 4), C.br1, [0, 7.4, 0], [2.0, 1.2, 2.0]));
        p.push(part(cyl(0.2, 1.2, 2.2, 6), C.br0, [0, 9.2, -0.2], 1, [-0.3, 0, 0])); // 꼭지 솔
        p.push(part(cyl(2.0, 2.7, 0.7, 8), C.br2, [0, 5.6, 0])); // 밝은 띠
        p.push(part(cyl(3.0, 2.6, 1.6, 10), C.brS, [0, 0.8, 0])); // 솔 치마
        face(p, 0, 4.6, 2.05, 0.55, 0.85, true, false);
        return p;
      },
      suds: function () {
        var p = [];
        p.push(part(GEO.ico1, C.su1, [0, 4.6, 0.3], 4.4));
        p.push(part(lowBall(7, 5), C.su0, [-3.9, 3.0, -0.6], 3.0));
        p.push(part(lowBall(7, 5), C.su2, [3.8, 3.3, -0.3], 3.2));
        p.push(part(GEO.ico0, C.suR1, [1.6, 8.8, -0.4], 1.5));
        face(p, 0, 5.2, 4.3, 0.75, 1.35, false, true);
        return p;
      },
      suds_s: function () {
        var p = [];
        p.push(part(GEO.ico1, C.su1, [0, 3.0, 0], 3.0));
        p.push(part(GEO.ico0, C.suR2, [1.4, 5.7, -0.2], 0.9));
        face(p, 0, 3.4, 2.6, 0.55, 0.9, false, true);
        return p;
      },
      bell: function () {
        var p = [];
        p.push(part(new THREE.BoxGeometry(1, 1, 1), C.be1, [0, 6.0, 0], [9.0, 8.4, 4.4]));
        p.push(part(new THREE.BoxGeometry(1, 1, 1), C.be2, [0, 6.0, 0], [8.0, 9.4, 4.6]));
        p.push(part(new THREE.BoxGeometry(1, 1, 1), C.be2, [0, 6.0, 0], [10.0, 7.4, 4.0]));
        p.push(part(cyl(2.9, 2.9, 0.8, 12), C.btn0, [0, 6.2, 2.4], 1, [Math.PI / 2, 0, 0]));
        p.push(part(lowBall(10, 5), C.btn1, [0, 6.2, 2.75], [2.3, 2.3, 1.1]));
        p.push(part(GEO.ico0, C.be3, [-0.8, 7.1, 3.7], 0.55));
        p.push(part(new THREE.BoxGeometry(1, 1, 1), C.be0, [2.4, 0.9, 0], [2.0, 1.8, 3.0]));
        p.push(part(new THREE.BoxGeometry(1, 1, 1), C.be0, [-2.4, 0.9, 0], [2.0, 1.8, 3.0]));
        return p;
      },
      vacuum: function () {
        var p = [];
        p.push(part(lowBall(7, 5), C.va1, [0, 6.2, -2.5], [5.6, 4.9, 6.0]));
        p.push(part(GEO.ico0, C.va3, [0, 10.3, -3.2], [2.8, 1.2, 3.4])); // 덮개
        p.push(part(new THREE.TorusGeometry(1.6, 0.45, 3, 6, Math.PI), C.va0, [0, 10.8, -3.4], 1, [0, Math.PI / 2, 0])); // 손잡이
        p.push(part(cyl(2.5, 2.5, 1.3, 6), C.rub, [4.9, 2.5, -3.5], 1, [0, 0, Math.PI / 2]));
        p.push(part(cyl(2.5, 2.5, 1.3, 6), C.rub, [-4.9, 2.5, -3.5], 1, [0, 0, Math.PI / 2]));
        // 호스: 앞으로 굽은 관 셋
        p.push(part(cyl(0.8, 0.8, 4.2, 5), C.va0, [0, 9.0, 3.2], 1, [1.15, 0, 0]));
        p.push(part(cyl(0.8, 0.8, 4.2, 5), C.va0, [0, 7.4, 6.6], 1, [2.2, 0, 0]));
        p.push(part(cyl(0.8, 0.8, 4.4, 5), C.va0, [0, 3.6, 8.2], 1, [2.95, 0, 0]));
        p.push(part(new THREE.BoxGeometry(1, 1, 1), C.va2, [0, 0.7, 8.9], [6.4, 1.4, 2.6]));
        face(p, 0, 6.8, 2.9, 0.8, 1.7, true, false);
        return p;
      },
      dog: function () {
        var p = [];
        p.push(part(lowBall(6, 5), C.dg1, [0, 3.6, -0.8], [3.6, 3.6, 3.9])); // 앉은 몸
        p.push(part(lowBall(7, 5), C.dg2, [0, 9.0, 0.6], [3.5, 3.2, 3.2])); // 머리
        p.push(part(lowBall(5, 3), C.dg3, [0, 8.0, 3.4], [1.8, 1.3, 1.6])); // 주둥이
        p.push(part(GEO.ico0, C.ink0, [0, 8.6, 4.9], 0.6)); // 코
        p.push(part(new THREE.ConeGeometry(1.4, 3.4, 4), C.dg0, [2.2, 12.4, 0.2], 1, [0, 0.4, -0.35])); // 뾰족 귀
        p.push(part(new THREE.ConeGeometry(1.4, 3.4, 4), C.dg0, [-2.2, 12.4, 0.2], 1, [0, -0.4, 0.35]));
        p.push(part(new THREE.TorusGeometry(2.4, 0.55, 3, 6), C.btn0, [0, 6.3, 0.9], 1, [Math.PI / 2 - 0.25, 0, 0])); // 빨간 목줄
        p.push(part(cyl(0.9, 1.0, 4.4, 4), C.dg1, [1.3, 2.2, 2.0])); // 앞다리
        p.push(part(cyl(0.9, 1.0, 4.4, 4), C.dg1, [-1.3, 2.2, 2.0]));
        p.push(part(new THREE.ConeGeometry(0.9, 3.4, 4), C.dg0, [0, 5.0, -4.6], 1, [-0.9, 0, 0])); // 꼬리
        face(p, 0, 9.6, 3.0, 0.6, 1.35, true, false);
        return p;
      },
      boss_vacuum: function () {
        var p = [];
        p.push(part(cyl(23.5, 23.5, 5.2, 28), C.bo0, [0, 3.4, 0]));
        p.push(part(cyl(21.5, 23.0, 1.0, 28), C.bo1, [0, 6.4, 0]));
        p.push(part(new THREE.TorusGeometry(23.6, 1.1, 4, 28), C.bo2, [0, 2.4, 0], 1, [Math.PI / 2, 0, 0])); // 범퍼
        p.push(part(new THREE.TorusGeometry(15, 0.35, 3, 28), C.bo2, [0, 6.95, 0], 1, [Math.PI / 2, 0, 0])); // 홈
        p.push(part(lowBall(12, 5), C.cr1, [0, 7.0, -3.5], [5.5, 1.8, 5.5])); // 가운데 돔
        p.push(part(lowBall(10, 5), C.btn1, [6.5, 5.8, 21.5], [2.6, 1.6, 1.4])); // 붉은 램프 눈
        p.push(part(lowBall(10, 5), C.btn1, [-6.5, 5.8, 21.5], [2.6, 1.6, 1.4]));
        p.push(part(new THREE.BoxGeometry(1, 1, 1), C.bo0, [6.5, 8.4, 21.0], [5.5, 1.0, 1.4], [0, 0, 0.35])); // 성난 눈썹
        p.push(part(new THREE.BoxGeometry(1, 1, 1), C.bo0, [-6.5, 8.4, 21.0], [5.5, 1.0, 1.4], [0, 0, -0.35]));
        for (var i = 0; i < 2; i++) { // 옆솔
          var sx = i ? 1 : -1;
          for (var k = 0; k < 4; k++) {
            var a = k / 4 * Math.PI + 0.3;
            p.push(part(new THREE.BoxGeometry(1, 1, 1), C.cr0, [sx * 17 + Math.cos(a) * 4, 0.6, 18 + Math.sin(a) * 4], [8, 0.4, 0.5], [0, -a, 0]));
          }
        }
        return p;
      },
      boss_bath: function () {
        var p = [];
        p.push(part(cyl(13.0, 12.0, 15, 20), C.tub1, [0, 12.0, 0], [1.65, 1, 1])); // 욕조
        p.push(part(new THREE.TorusGeometry(13.6, 1.2, 4, 24), C.tub0, [0, 19.4, 0], [1.62, 1, 1], [Math.PI / 2, 0, 0])); // 테
        p.push(part(new THREE.TorusGeometry(13.1, 0.4, 3, 24), C.be1, [0, 16.2, 0], [1.65, 1, 1], [Math.PI / 2, 0, 0])); // 금줄
        [[13, 7], [-13, 7], [13, -7], [-13, -7]].forEach(function (f) { // 사자 발
          p.push(part(cyl(1.3, 2.0, 5, 6), C.be1, [f[0], 2.6, f[1]], 1, [f[1] > 0 ? 0.2 : -0.2, 0, f[0] > 0 ? -0.2 : 0.2]));
          p.push(part(GEO.ico0, C.be1, [f[0] * 1.06, 0.9, f[1] * 1.08], [2.4, 1.0, 2.6]));
        });
        // 거품 산
        [[0, 22, 0, 6.5, C.su1], [-11, 20.5, -1, 5.5, C.su2], [11, 20.5, 1, 5.5, C.su1], [-18, 19.5, 2, 4.2, C.su0], [17, 19.5, -2, 4.4, C.su2], [-5, 26.5, -3, 4.6, C.su2], [6, 25.8, -2, 4.4, C.su0], [0, 20.8, 7, 4.2, C.su2], [-10, 20.0, 6.5, 3.6, C.su1], [10, 20.0, 6.5, 3.6, C.su0]].forEach(function (b) {
          p.push(part(GEO.ico1, b[4], [b[0], b[1], b[2]], b[3]));
        });
        p.push(part(GEO.ico0, C.suR1, [-7, 27, 2], 1.2));
        p.push(part(GEO.ico0, C.suR3, [14, 23, 3], 1.0));
        // 오리
        p.push(part(lowBall(7, 5), C.flY, [16, 24.5, 3], [2.8, 2.2, 3.2]));
        p.push(part(lowBall(7, 5), C.flY, [16, 27.8, 4.6], 1.9));
        p.push(part(GEO.ico0, C.be1, [16, 27.5, 6.6], [0.9, 0.5, 1.2]));
        p.push(part(GEO.ico0, C.ink0, [17.2, 28.4, 5.8], 0.35));
        p.push(part(GEO.ico0, C.ink0, [14.8, 28.4, 5.8], 0.35));
        // 샤워기
        p.push(part(cyl(0.7, 0.7, 20, 6), C.cr0, [-19, 21, -8]));
        p.push(part(cyl(0.7, 0.7, 9, 6), C.cr0, [-15, 31, -8], 1, [0, 0, Math.PI / 2 + 0.2]));
        p.push(part(cyl(3.0, 1.0, 1.6, 10), C.cr1, [-10.5, 30.2, -8], 1, [0, 0, 0.35]));
        // 얼굴(앞)
        face(p, 0, 13.0, 13.4, 1.8, 5.2, true, true);
        p.push(part(lowBall(8, 4), C.ink1, [0, 8.4, 12.6], [3.6, 1.8, 1.2])); // 입
        p.push(part(lowBall(6, 4), C.tongue1, [0, 7.7, 13.2], [2.0, 0.8, 0.7]));
        p.push(part(GEO.ico0, C.blush, [8.8, 10.4, 12.2], [2.0, 1.1, 0.6]));
        p.push(part(GEO.ico0, C.blush, [-8.8, 10.4, 12.2], [2.0, 1.1, 0.6]));
        return p;
      },
    };
    var _enemyCache = {};
    function enemyGeometry(kind) {
      if (_enemyCache[kind]) return _enemyCache[kind];
      var f = ENEMY_BUILD[kind]; if (!f) throw new Error("enemyGeometry: " + kind);
      var g = merge(f());
      return (_enemyCache[kind] = { geometry: g, height: g.boundingBox.max.y });
    }

    // ══ 줍기·탄(≤ 120 삼각형) ══════════════════════════════════
    var PICK_BUILD = {
      kibble: function () {
        return [part(lowBall(6, 4), C.fur1, [0, 1.0, 0], [1.9, 1.0, 1.9]), part(GEO.ico0, C.fur0, [0, 1.85, 0], [0.7, 0.3, 0.7])];
      },
      treat: function () { // 뼈 과자
        var p = [part(cyl(0.9, 0.9, 5.2, 6), C.cream2, [0, 1.3, 0], 1, [0, 0, Math.PI / 2])];
        [[2.8, 0.85], [2.8, -0.85], [-2.8, 0.85], [-2.8, -0.85]].forEach(function (b) { p.push(part(GEO.ico0, C.cream3, [b[0], 1.3, b[1]], 1.15)); });
        return p;
      },
      chew: function () { // 개껌 막대(꼰 줄)
        var p = [part(cyl(1.0, 1.0, 6.4, 6), C.cream1, [0, 1.1, 0], 1, [0, 0, Math.PI / 2])];
        for (var i = -1; i <= 1; i++) p.push(part(cyl(1.15, 1.15, 0.5, 5), C.cream0, [i * 1.9, 1.1, 0], 1, [0, 0, Math.PI / 2 + 0.35]));
        return p;
      },
      fruit: function () { // 사과
        return [part(lowBall(7, 5), C.btn1, [0, 2.4, 0], [2.4, 2.2, 2.4]), part(cyl(0.18, 0.25, 1.2, 4), C.wood0, [0, 4.8, 0]), part(GEO.ico0, C.g1, [0.8, 4.7, 0], [1.0, 0.3, 0.55], [0, 0, 0.4]), part(GEO.ico0, C.shine0, [-0.9, 3.4, 1.6], 0.4)];
      },
      meat: function () { // 고기(뼈 달린)
        return [part(lowBall(6, 4), C.tongue1, [-0.8, 2.2, 0], [2.7, 2.0, 2.2], [0, 0, 0.25]), part(GEO.ico0, C.tongue0, [-1.8, 1.9, 0.9], [1.4, 1.0, 1.0]), part(cyl(0.55, 0.55, 2.8, 4), C.cream3, [2.4, 2.7, 0], 1, [0, 0, -1.1]), part(GEO.ico0, C.cream3, [3.6, 3.4, 0.5], 0.75), part(GEO.ico0, C.cream3, [3.6, 3.2, -0.5], 0.75)];
      },
    };
    var PROJ_BUILD = {
      ball: function () { // 삑삑이 공(분홍 + 노랑 띠)
        var g = lowBall(8, 6), parts = [part(g, C.flP, [0, 2.2, 0], 2.2)];
        // 띠: 같은 구의 가운데 줄 정점을 노랑으로
        var pp = parts[0], pos = pp.attributes.position, col = pp.attributes.color, y = new THREE.Color(C.flY);
        for (var i = 0; i < pos.count; i += 3) {
          var cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3 - 2.2, cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
          if (Math.abs(cy + cx * 0.4) < 0.6) for (var k = 0; k < 3; k++) col.setXYZ(i + k, y.r, y.g, y.b);
        }
        return parts;
      },
      toy: function () { // 보라 토끼 인형
        return [part(lowBall(6, 4), C.purp2, [0, 2.0, 0], [1.8, 1.8, 1.6]), part(lowBall(6, 4), C.purp2, [0, 4.6, 0.2], 1.5), part(cyl(0.45, 0.55, 2.6, 3), C.purp1, [0.6, 7.0, 0], 1, [0, 0, -0.2]), part(cyl(0.45, 0.55, 2.6, 3), C.purp1, [-0.6, 7.0, 0], 1, [0, 0, 0.2]), part(new THREE.BoxGeometry(0.4, 0.4, 0.3), C.ink0, [0.55, 4.8, 1.45]), part(new THREE.BoxGeometry(0.4, 0.4, 0.3), C.ink0, [-0.55, 4.8, 1.45])];
      },
      chew: function () { return PICK_BUILD.chew(); },
    };
    var _pickCache = {}, _projCache = {};
    function pickupGeometry(kind) {
      if (_pickCache[kind]) return _pickCache[kind];
      var f = PICK_BUILD[kind]; if (!f) throw new Error("pickupGeometry: " + kind);
      var g = merge(f()); return (_pickCache[kind] = { geometry: g, height: g.boundingBox.max.y });
    }
    function projGeometry(kind) {
      if (_projCache[kind]) return _projCache[kind];
      var f = PROJ_BUILD[kind]; if (!f) throw new Error("projGeometry: " + kind);
      var g = merge(f()); return (_projCache[kind] = { geometry: g, height: g.boundingBox.max.y });
    }

    // ══ 바닥 ═══════════════════════════════════════════════════
    var W = 540;
    function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6d2b79f5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    function noise(x, z) { return Math.sin(x * 0.031 + 1.3) * Math.cos(z * 0.027 - 0.4) + 0.6 * Math.sin((x + z) * 0.053 + 2.1) + 0.35 * Math.sin(x * 0.11 - z * 0.09); }

    function makeGround(tod) {
      var root = new THREE.Group(); root.name = "ground";
      var mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
      var R = rng(20261028);

      // 산책로: 굽은 띠(중심선 표본)
      var curve = new THREE.CatmullRomCurve3([[-20, 430], [70, 400], [150, 330], [215, 300], [290, 320], [360, 280], [410, 200], [455, 130], [560, 90]].map(function (q) { return new V3(q[0], 0, q[1]); }));
      var NS = 140, samples = curve.getSpacedPoints(NS);
      function distPath(x, z) { var d = 1e9; for (var i = 0; i < samples.length; i += 2) { var dx = samples[i].x - x, dz = samples[i].z - z; d = Math.min(d, dx * dx + dz * dz); } return Math.sqrt(d); }

      // 잔디: 칸마다 삼각형 색(얼룩)
      var N = 60, cell = W / N, pos = [], col = [], cc = {};
      function colOf(h) { return cc[h] || (cc[h] = new THREE.Color(h)); }
      for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
        var x0 = i * cell, z0 = j * cell, x1 = x0 + cell, z1 = z0 + cell;
        [[x0, z0, x0, z1, x1, z0], [x1, z0, x0, z1, x1, z1]].forEach(function (tr, k) {
          var cx = (tr[0] + tr[2] + tr[4]) / 3, cz = (tr[1] + tr[3] + tr[5]) / 3;
          var n = noise(cx, cz) + (R() - 0.5) * 0.35;
          var h = n > 1.35 ? C.g3 : n > -0.55 ? C.g2 : C.g1; // 가까운 두 톤 위주 — 짙은 g0 은 나무·울타리 몫
          var c = colOf(h);
          pos.push(tr[0], 0, tr[1], tr[2], 0, tr[3], tr[4], 0, tr[5]);
          for (var q = 0; q < 3; q++) col.push(c.r, c.g, c.b);
        });
      }
      var gg = new THREE.BufferGeometry();
      gg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      gg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      gg.computeVertexNormals();
      var grass = new THREE.Mesh(gg, mat); grass.name = "grass"; grass.receiveShadow = true; root.add(grass);

      // 길: 테두리 띠 + 가운데 띠(한 메시)
      function ribbon(width, y, hex) {
        var c = new THREE.Color(hex), P = [], Cc = [];
        for (var i = 0; i < NS; i++) {
          var a = samples[i], b = samples[i + 1], t = curve.getTangentAt(i / NS), t2 = curve.getTangentAt((i + 1) / NS);
          var na = new V3(-t.z, 0, t.x).multiplyScalar(width / 2), nb = new V3(-t2.z, 0, t2.x).multiplyScalar(width / 2);
          var w1 = 1 + 0.08 * Math.sin(i * 0.7), w2 = 1 + 0.08 * Math.sin((i + 1) * 0.7);
          var A1 = [a.x + na.x * w1, a.z + na.z * w1], A2 = [a.x - na.x * w1, a.z - na.z * w1], B1 = [b.x + nb.x * w2, b.z + nb.z * w2], B2 = [b.x - nb.x * w2, b.z - nb.z * w2];
          P.push(A1[0], y, A1[1], B1[0], y, B1[1], A2[0], y, A2[1], A2[0], y, A2[1], B1[0], y, B1[1], B2[0], y, B2[1]);
          for (var q = 0; q < 6; q++) Cc.push(c.r, c.g, c.b);
        }
        return { P: P, C: Cc };
      }
      var r1 = ribbon(22, 0.12, C.p0), r2 = ribbon(18, 0.24, C.p1), r3 = ribbon(5, 0.34, C.p2);
      var pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.Float32BufferAttribute(r1.P.concat(r2.P, r3.P), 3));
      pg.setAttribute("color", new THREE.Float32BufferAttribute(r1.C.concat(r2.C, r3.C), 3));
      pg.computeVertexNormals();
      // 띠 뒷면이 위로 올 수 있으니 양면
      var pmat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
      var path = new THREE.Mesh(pg, pmat); path.name = "path"; path.receiveShadow = true; root.add(path);

      // 인스턴스 소품
      function inst(name, geo, list, material) {
        var m = new THREE.InstancedMesh(geo, material || mat, list.length), o = new THREE.Object3D();
        list.forEach(function (it, k) { o.position.set(it.x, 0, it.z); o.rotation.set(0, it.ry || 0, 0); o.scale.setScalar(it.s || 1); o.updateMatrix(); m.setMatrixAt(k, o.matrix); });
        m.name = name; m.castShadow = true; m.receiveShadow = true; root.add(m); return m;
      }
      function scatter(n, minPath, maxPath, minGap, taken, edge) {
        var out = [], tries = 0;
        while (out.length < n && tries++ < n * 60) {
          var x = edge + R() * (W - 2 * edge), z = edge + R() * (W - 2 * edge), dp = distPath(x, z);
          if (dp < minPath || dp > maxPath) continue;
          if (Math.hypot(x - 270, z - 270) < 46) continue; // 출발 자리 비움
          var ok = true;
          for (var k = 0; k < taken.length; k++) { var t = taken[k]; if (Math.hypot(t.x - x, t.z - z) < minGap + (t.gap || 0)) { ok = false; break; } }
          if (!ok) continue;
          var it = { x: x, z: z, ry: R() * TAU, s: 0.8 + R() * 0.45, gap: minGap * 0.5 };
          out.push(it); taken.push(it);
        }
        return out;
      }
      var taken = [];
      // 나무
      var treeGeo = merge([
        part(cyl(1.6, 2.3, 11, 6), C.wood0, [0, 5.5, 0]),
        part(GEO.ico1, C.g0, [0, 15, 0], [9.5, 8.2, 9.5]),
        part(GEO.ico1, C.g1, [-3.5, 19.5, 1.5], 6.8),
        part(GEO.ico1, C.g2, [3.2, 21, -1], 5.6),
        part(GEO.ico0, C.g3, [-1.5, 24.5, 1.2], 3.0),
      ]);
      inst("trees", treeGeo, scatter(26, 26, 1e9, 30, taken, 24));
      // 덤불
      var bushGeo = merge([part(GEO.ico1, C.g1, [0, 3.4, 0], [5, 4.2, 4.6]), part(GEO.ico1, C.g2, [3.6, 2.8, 1.2], 3.4), part(GEO.ico1, C.g0, [-3.4, 2.6, -0.8], 3.2), part(GEO.ico0, C.g3, [0.8, 6.4, 0.6], 1.6)]);
      inst("bushes", bushGeo, scatter(46, 16, 1e9, 14, taken, 14));
      // 꽃무리
      var fl = [part(lowBall(6, 3), C.g2, [0, 0.6, 0], [4.2, 0.9, 3.4])];
      [[0, 0, C.flP], [2.2, 1.0, C.flY], [-2.1, 0.8, C.flB], [1.0, -1.8, C.purp2], [-1.2, -1.5, C.flY], [2.6, -1.0, C.flP], [-2.6, -0.6, C.purp2]].forEach(function (f, k) {
        fl.push(part(GEO.ico0, f[2], [f[0], 1.8 + (k % 2) * 0.5, f[1]], [1.0, 0.55, 1.0]));
      });
      inst("flowers", merge(fl), scatter(64, 12, 1e9, 8, taken, 12));
      // 풀 포기
      var tuft = merge([part(new THREE.ConeGeometry(0.6, 2.6, 3), C.g3, [0, 1.3, 0], 1, [0, 0, 0.25]), part(new THREE.ConeGeometry(0.6, 3.2, 3), C.g2, [0.8, 1.6, 0.3], 1, [0.1, 0, -0.2]), part(new THREE.ConeGeometry(0.6, 2.2, 3), C.g3, [-0.7, 1.1, -0.3], 1, [0, 0, 0.45])]);
      var tufts = []; for (var k = 0; k < 360; k++) { var tx = 8 + R() * (W - 16), tz = 8 + R() * (W - 16); if (distPath(tx, tz) > 13) tufts.push({ x: tx, z: tz, ry: R() * TAU, s: 0.8 + R() * 0.6 }); }
      inst("tufts", tuft, tufts);
      // 벤치·가로등: 길 옆에 길 쪽을 보게
      var benches = [], lamps = [];
      for (var b = 0; b < 9; b++) {
        var u = 0.06 + b * 0.105, pt = curve.getPointAt(u), tg = curve.getTangentAt(u), side = b % 2 ? 1 : -1;
        var nx = -tg.z * side, nz = tg.x * side;
        benches.push({ x: pt.x + nx * 19, z: pt.z + nz * 19, ry: Math.atan2(-nx, -nz), s: 1 });
        var u2 = u + 0.05, p2 = curve.getPointAt(Math.min(0.99, u2)), t2 = curve.getTangentAt(Math.min(0.99, u2));
        lamps.push({ x: p2.x - t2.z * side * -15, z: p2.z + t2.x * side * -15, ry: 0, s: 1 });
      }
      var benchGeo = merge([
        part(new THREE.BoxGeometry(14, 1.2, 4.2), C.wood1, [0, 4.2, 0]),
        part(new THREE.BoxGeometry(14, 3.4, 0.9), C.wood1, [0, 7.2, -2.0], 1, [-0.15, 0, 0]),
        part(new THREE.BoxGeometry(1.2, 4, 3.6), C.wood0, [5.6, 2.0, 0]),
        part(new THREE.BoxGeometry(1.2, 4, 3.6), C.wood0, [-5.6, 2.0, 0]),
        part(new THREE.BoxGeometry(13, 0.5, 0.6), C.wood0, [0, 5.3, -1.95], 1, [-0.15, 0, 0]),
      ]);
      inst("benches", benchGeo, benches);
      var poleGeo = merge([part(cyl(0.7, 1.0, 22, 6), C.bo1, [0, 11, 0]), part(cyl(2.0, 2.4, 1.2, 6), C.bo0, [0, 0.6, 0]), part(new THREE.ConeGeometry(2.6, 1.6, 6), C.bo0, [0, 25.2, 0])]);
      inst("lampPoles", poleGeo, lamps);
      var bulbMat = new THREE.MeshLambertMaterial({ color: C.glow, emissive: C.lamp, emissiveIntensity: 0, flatShading: true });
      var bulb = new THREE.IcosahedronGeometry(2.3, 1); bulb.translate(0, 22.4, 0);
      var bulbs = inst("lampBulbs", bulb, lamps, bulbMat); bulbs.castShadow = false;
      // 둘레 생울타리
      var hedgeGeo = merge([part(new THREE.BoxGeometry(18, 7, 9), C.g0, [0, 3.5, 0]), part(lowBall(6, 4), C.g1, [-5, 7.5, 0], [5.2, 3.6, 4.8]), part(lowBall(6, 4), C.g0, [1, 8.2, 0.5], [5.4, 3.8, 5]), part(lowBall(6, 4), C.g1, [6, 7.4, -0.3], [4.6, 3.4, 4.6])]);
      var hedge = [], L = 18;
      for (var e = -L / 2; e <= W + L / 2; e += L) {
        hedge.push({ x: e, z: -5, ry: 0 }, { x: e, z: W + 5, ry: Math.PI }, { x: -5, z: e, ry: Math.PI / 2 }, { x: W + 5, z: e, ry: -Math.PI / 2 });
      }
      inst("hedge", hedgeGeo, hedge);

      function setTod(v) {
        var t = Math.max(0, Math.min(1, v || 0));
        var on = t <= 0.55 ? 0 : t >= 0.78 ? 1 : (t - 0.55) / 0.23;
        bulbMat.emissiveIntensity = on * 1.6;
        bulbMat.color.set(on > 0.5 ? C.glow : C.cr1);
      }
      setTod(tod);
      root.userData.drawCalls = root.children.length;
      return { root: root, setTod: setTod, curve: curve };
    }

    // ══ 접지 그림자 ════════════════════════════════════════════
    var _blob = null;
    function blobTexture() {
      if (_blob) return _blob;
      var cv = document.createElement("canvas"); cv.width = cv.height = 64;
      var x = cv.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(36,22,29,0.28)"); g.addColorStop(0.55, "rgba(36,22,29,0.16)"); g.addColorStop(1, "rgba(36,22,29,0)");
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      _blob = new THREE.CanvasTexture(cv); _blob.colorSpace = THREE.SRGBColorSpace;
      return _blob;
    }

    return {
      makeCoco: makeCoco, enemyGeometry: enemyGeometry, pickupGeometry: pickupGeometry, projGeometry: projGeometry,
      makeGround: makeGround, blobTexture: blobTexture,
      ENEMY_KINDS: Object.keys(ENEMY_BUILD), PICKUP_KINDS: Object.keys(PICK_BUILD), PROJ_KINDS: Object.keys(PROJ_BUILD),
      POSES: ["walk", "sit", "wag", "spin", "scoot", "bark", "nap"],
      PALETTE: C, triCount: triCount,
    };
  }

  window.Surv3D = { build: build };
})();
