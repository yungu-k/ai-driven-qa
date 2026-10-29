// @ts-nocheck — 디자인 세션 정본 docs/lab-home-3d.js(c0da2057)를 그대로 옮긴 것(tmp/lab-home/sync-src.sh).
/* 「코코의 집으로」 — 로우폴리 3D 그림 모듈 1판 (2026-10-29, 디자인 세션)
 * 고전 스크립트: window.Home3D = { build(THREE, M) → api }. M = Surv3D.build(THREE) 결과(팔레트·코코 모델). 외부 파일·텍스처 없음, 기본 도형 조립.
 * 좌표는 칸: x 오른쪽 · y 위(땅 윗면 0) · z 깊이(카메라 쪽 +). 코코 길 z = 0, 길 깊이 z −1.5..1.5. 카메라는 옆에서 8° 위.
 * 규칙 엔진 docs/lab-home.js · 맵 docs/lab-home-zone1.js · 규격 docs/lab-home-spec.md. 그림자 맵 없음, MeshLambertMaterial flatShading.
 * 움직이지 않는 무대는 12 칸 토막마다 정점 색 메시 하나로 합친다(그리기 호출을 줄이고, 토막 단위로 화면 밖은 잘린다).
 * 🔴 실제 상표·글자 간판·사람 그림 없음. 간판은 발자국·과일 같은 그림만. 자전거는 사람 없이.
 *
 * api
 *   theme(name) → { sky, fog, hemiGround, groundSide, groundTop, wall }   name: gray · cafe · market · river · boss
 *   buildStage(L, group) → { cp: { set(on) } }   L = 엔진 레벨 객체(norm 된 것). 다시 지을 땐 화면이 group 을 비우고 부른다.
 *   makeMover(w) → Group   물에 뜬 나무판(윗면 y = 0, x 0..w)
 *   makeEnemy(kind) → { root, update(e, t, dt, reduce) }   원점 = 발밑 가운데. 화면이 root.position 을 (e.x, e.y, 0) 에 둔다.
 *   makeWave() → Group   짖음 파동(+x 쪽으로 퍼지는 꼴 — 왼쪽으로 가는 파동은 화면이 scale.x = −1)
 *   makePick(kind) → Group   heart · bone · snack (원점 = 가운데, 엔진 k.y 자리에 그대로)
 */
(function () {
  "use strict";

  // ── 테마 색(코코 갈색과 갈리게: 배경은 밝고 덜 짙게, 길 윗면은 크림 쪽) ─────────────
  var THEMES = {
    gray: { sky: 0xbfc4ce, fog: 0xbfc4ce, hemiGround: 0x6a6f7c, groundSide: 0x8a909e, groundTop: 0xcfd3dc, wall: 0x9aa0ac },
    cafe: { sky: 0xcfeaf8, fog: 0xdcf0f9, hemiGround: 0x8f7466, groundSide: 0x9b7a6c, groundTop: 0xeee0c8, wall: 0xe2a996 },
    market: { sky: 0xffe8c8, fog: 0xfff0dc, hemiGround: 0x8a7a5e, groundSide: 0x857c6e, groundTop: 0xdcd2bf, wall: 0xf3dfba },
    river: { sky: 0xaee0f7, fog: 0xd4eef9, hemiGround: 0x5f8a5a, groundSide: 0x8a6c4c, groundTop: 0xe2cd9e, wall: 0x9fcf8a },
    boss: { sky: 0xa8b3c8, fog: 0xa3aec2, hemiGround: 0x4e5568, groundSide: 0x6b7080, groundTop: 0xbdc1ca, wall: 0x8d93a3 },
  };
  // 테마 안에서만 쓰는 덧색: back = 길 뒤 보도 윗면, edge = 길 앞 모서리 띠, line = 윗면 줄눈
  var AUX = {
    gray: { back: 0xb4b9c4, edge: 0xa7acba, line: 0xb4b9c4 },
    cafe: { back: 0xd9c6ad, edge: 0xc9ad8c, line: 0xdccbb0 },
    market: { back: 0xc4b9a5, edge: 0xb3a68e, line: 0xc9bfac },
    river: { back: 0x9bdc7c, edge: 0x6cc46a, line: 0xd2bb8a },
    boss: { back: 0xa3a8b3, edge: 0x8e94a2, line: 0xa9aeb9 },
  };
  function themeOf(name) { return THEMES[name] || THEMES.gray; }

  function build(THREE, M) {
    var TAU = Math.PI * 2;
    var rnd = function (i) { var s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }; // 정해진 난수(판마다 같은 그림)

    // ── 재질·도형 캐시 ────────────────────────────────────────────
    var MATS = {};
    function lam(c) { return MATS[c] || (MATS[c] = new THREE.MeshLambertMaterial({ color: c, flatShading: true })); }
    function glowMat(c) { var k = "g" + c; return MATS[k] || (MATS[k] = new THREE.MeshBasicMaterial({ color: c })); }
    var VC = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    var VG = new THREE.MeshBasicMaterial({ vertexColors: true }); // 빛나는 것(전구·창 불빛)
    var G = {
      box: new THREE.BoxGeometry(1, 1, 1),
      c6: new THREE.CylinderGeometry(1, 1, 1, 6), c8: new THREE.CylinderGeometry(1, 1, 1, 8), c12: new THREE.CylinderGeometry(1, 1, 1, 12),
      cone4: new THREE.ConeGeometry(1, 1, 4), cone6: new THREE.ConeGeometry(1, 1, 6),
      prism: new THREE.CylinderGeometry(1, 1, 1, 3, 1, false, Math.PI / 2), // 세모 기둥(눕히면 꼭짓점이 위)
      ico0: new THREE.IcosahedronGeometry(1, 0), ico1: new THREE.IcosahedronGeometry(1, 1),
      sph: new THREE.SphereGeometry(1, 8, 6), sphS: new THREE.SphereGeometry(1, 6, 4),
    };
    function mesh(geo, c, parent, x, y, z, sx, sy, sz) {
      var m = new THREE.Mesh(geo, typeof c === "number" ? lam(c) : c);
      m.position.set(x || 0, y || 0, z || 0);
      if (sx != null) m.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz);
      if (parent) parent.add(m);
      return m;
    }
    function grp(parent, x, y, z) { var g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); if (parent) parent.add(g); return g; }
    // 눈: 검은 공 + 흰 반짝(카메라 쪽 z+ 로 조금)
    function eye(parent, x, y, z, r) {
      var e = grp(parent, x, y, z);
      mesh(G.sphS, 0x24161d, e, 0, 0, 0, r, r, r * 0.7);
      mesh(G.sphS, 0xffffff, e, r * 0.3, r * 0.35, r * 0.55, r * 0.35);
      return e;
    }

    // ── 정점 색 합치기(무대용) ──────────────────────────────────────
    function makeBatch(chunkW) {
      var buckets = {};
      var _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
      function add(geo, color, x, y, z, sx, sy, sz, rx, ry, rz, glow) {
        var g = geo.index ? geo.toNonIndexed() : geo.clone();
        if (sy == null) sy = sx; if (sz == null) sz = sx; // 크기 하나만 주면 고르게
        _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e);
        _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
        g.applyMatrix4(_m);
        var key = (glow ? "g" : "l") + Math.floor(x / chunkW);
        (buckets[key] || (buckets[key] = { glow: !!glow, list: [], color: [] })).list.push(g);
        buckets[key].color.push(color);
      }
      function box(cx, cy, cz, w, h, d, color, rx, ry, rz) { add(G.box, color, cx, cy, cz, w, h, d, rx, ry, rz); }
      function flush(group) {
        Object.keys(buckets).forEach(function (k) {
          var b = buckets[k], n = 0, o = 0;
          b.list.forEach(function (g) { n += g.attributes.position.count; });
          var P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3);
          b.list.forEach(function (g, i) {
            var cnt = g.attributes.position.count;
            P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3);
            _c.setHex(b.color[i]);
            for (var j = 0; j < cnt; j++) { C[(o + j) * 3] = _c.r; C[(o + j) * 3 + 1] = _c.g; C[(o + j) * 3 + 2] = _c.b; }
            o += cnt; g.dispose();
          });
          var bg = new THREE.BufferGeometry();
          bg.setAttribute("position", new THREE.BufferAttribute(P, 3)); bg.setAttribute("normal", new THREE.BufferAttribute(N, 3)); bg.setAttribute("color", new THREE.BufferAttribute(C, 3));
          bg.computeBoundingSphere();
          var m = new THREE.Mesh(bg, b.glow ? VG : VC); m.matrixAutoUpdate = false; m.updateMatrix(); m.name = "stage-" + k;
          group.add(m);
        });
        buckets = {};
      }
      return { add: add, box: box, flush: flush };
    }

    // ══ 무대 ═══════════════════════════════════════════════════
    var DEPTH = 3; // 길 깊이(z −1.5..1.5)
    var BACK_Z = -4.8; // 길 뒤 보도 끝 = 가까운 배경 앞면

    // 땅(윗면 0): 길 몸통 + 윗면 + 앞 모서리 띠 + 뒤 보도 + 줄눈
    function groundPiece(B, th, T, A, s) {
      var x = s[0], w = s[2], cx = x + w / 2, top = s[1] + s[3], bot = s[1];
      if (th === "river" && w <= 2) { // 징검다리: 둥근 돌 + 물속 기둥
        B.add(G.c8, 0xa7acba, cx, top - 0.16, 0, w / 2 + 0.02, 0.32, 1.25);
        B.add(G.c8, 0xcfd3dc, cx, top - 0.02, 0, w / 2 - 0.06, 0.04, 1.12);
        B.add(G.c8, 0x7d8292, cx, (bot + top - 0.3) / 2, 0, w / 2 - 0.08, top - 0.3 - bot, 1.1);
        return;
      }
      B.box(cx, (bot + top) / 2 - 0.07, 0, w, s[3] - 0.14, DEPTH, T.groundSide);
      B.box(cx, top - 0.07, 0, w + 0.02, 0.14, DEPTH + 0.02, T.groundTop);
      B.box(cx, top - 0.19, DEPTH / 2 + 0.02, w + 0.03, 0.1, 0.04, A.edge); // 앞 모서리: 윗면 끝이 읽히게
      var bd = DEPTH / 2 - BACK_Z; // 뒤 보도 깊이
      B.box(cx, top - 0.06 - 1.5, (-DEPTH / 2 + BACK_Z) / 2, w, 3, bd, T.groundSide);
      B.box(cx, top - 0.06 - 0.05, (-DEPTH / 2 + BACK_Z) / 2, w, 0.1, bd, A.back);
      if (th === "river") { // 흙길 앞뒤 풀 둑
        B.box(cx, top - 0.04, DEPTH / 2 - 0.15, w + 0.02, 0.1, 0.32, 0x8fd06e);
        B.box(cx, top - 0.04, -DEPTH / 2 + 0.12, w + 0.02, 0.1, 0.26, 0x8fd06e);
      }
      var step = th === "market" ? 2 : th === "boss" ? 4 : th === "river" ? 0 : 1;
      if (step) for (var xi = Math.ceil(x + 0.01); xi < x + w - 0.01; xi += step) B.box(xi, top + 0.003, 0, 0.05, 0.01, DEPTH - 0.1, A.line);
    }
    // 땅 위 막는 덩어리(화분·상자): 윗면은 평평하게(디디는 자리)
    function propBlock(B, th, T, s, i) {
      var x = s[0], w = s[2], h = s[3], cx = x + w / 2, D = 2.6;
      if (th === "cafe" && h <= 1.25) { // 화분 상자: 테라코타 + 잘 다듬은 덤불 윗면
        B.box(cx, (h - 0.2) / 2, 0, w - 0.06, h - 0.2, D, 0xd9825f);
        B.box(cx, h - 0.1, 0, w, 0.2, D + 0.04, 0x6cc46a);
        B.box(cx, h * 0.55, D / 2 + 0.01, w - 0.06, 0.08, 0.04, 0xf2b98a);
        for (var k = 0; k < 3; k++) B.add(G.ico0, [0xff8fb1, 0xffd166, 0xffffff][k], x + 0.35 + k * (w - 0.7) / 2, h + 0.05, -0.9 - (k % 2) * 0.25, 0.12, 0.1, 0.12);
        return;
      }
      if (th === "boss" || th === "river" || th === "gray") { // 콘크리트 덩어리
        B.box(cx, h / 2, 0, w, h, D, th === "gray" ? T.groundSide : 0x9aa0ac);
        B.box(cx, h - 0.05, 0, w + 0.03, 0.1, D + 0.03, th === "gray" ? T.groundTop : 0xcfd3dc);
        return;
      }
      // 나무 상자 쌓기(1 칸쯤 한 단): 앞면 테두리 + 빗장, 윗면 밝은 뚜껑
      var n = Math.max(1, Math.round(h)), u = h / n;
      for (var j = 0; j < n; j++) {
        var y0 = j * u, wood = (j + i) % 2 ? 0xc98d55 : 0xd9a066, wj = w - (j % 2) * 0.08;
        B.box(cx, y0 + u / 2, 0, wj, u - 0.02, D, wood);
        var fz = D / 2 + 0.02, dk = 0x8a5530;
        B.box(cx, y0 + 0.06, fz, wj, 0.1, 0.05, dk); B.box(cx, y0 + u - 0.08, fz, wj, 0.1, 0.05, dk);
        B.box(x + 0.06 + (w - wj) / 2, y0 + u / 2, fz, 0.1, u - 0.1, 0.05, dk); B.box(x + w - 0.06 - (w - wj) / 2, y0 + u / 2, fz, 0.1, u - 0.1, 0.05, dk);
        B.box(cx, y0 + u / 2, fz, Math.hypot(wj, u) * 0.86, 0.08, 0.04, dk, 0, 0, Math.atan2(u, wj) * ((j % 2) ? 1 : -1));
        if (th === "market") for (var f = 0; f < Math.max(2, Math.round(w * 1.2)); f++) B.add(G.ico0, [0xf29a3a, 0xe85a5a, 0xffd166, 0x9bdc7c][(f + j) % 4], x + 0.3 + f * ((w - 0.6) / Math.max(1, Math.round(w * 1.2) - 1)), y0 + u * 0.5, fz + 0.05, 0.13);
      }
      B.box(cx, h - 0.04, 0, w + 0.02, 0.08, D + 0.02, 0xf0c991);
    }
    // 떠 있는 벽(낮은 틈 천장): 길 뒤쪽 반만 채우고 앞에는 아래 테두리만 — 통째 상자면 스키하는 코코를 가린다
    function ceiling(B, th, T, s) {
      var x = s[0], y = s[1], w = s[2], h = s[3], cx = x + w / 2, top = y + h;
      var bodyC = th === "cafe" ? 0xf1dcc0 : th === "market" ? 0xcfd3dc : th === "river" ? 0xb4b8c2 : T.wall;
      var bz0 = -DEPTH / 2, bz1 = -0.4;
      B.box(cx, (y + top) / 2, (bz0 + bz1) / 2, w, h, bz1 - bz0, bodyC);
      if (th === "market") for (var k = y + 0.35; k < Math.min(top, y + 3.2); k += 0.3) B.box(cx, k, bz1 + 0.01, w - 0.1, 0.05, 0.04, 0xa7acba); // 반쯤 내린 셔터 줄
      if (th === "cafe") { // 테라스 벽: 위에 창, 아래 나무 판
        B.box(cx, y + 2.4, bz1 + 0.02, w - 1.0, 1.4, 0.05, 0x6f9fbf); B.box(cx, y + 1.6, bz1 + 0.04, w - 0.8, 0.12, 0.08, 0xfff4e3);
        for (var p = x + 0.4; p < x + w - 0.2; p += 0.5) B.box(p, y + 0.75, bz1 + 0.02, 0.36, 1.1, 0.05, 0xa8693e);
      }
      if (th === "river") { B.add(G.c12, 0x3a3e4b, cx, y + 0.9, bz1 + 0.01, 0.62, 0.04, 0.62, Math.PI / 2); B.add(G.c12, 0x7d8292, cx, y + 0.9, bz1 + 0.03, 0.72, 0.03, 0.72, Math.PI / 2); } // 배수관 입구
      B.box(cx, top - 0.1, -0.95, w + 0.06, 0.2, 1.2, th === "gray" ? T.groundTop : 0xe6e1d6);
      // 앞: 아래 테두리(코코 머리 위 가로대)
      var lipC = th === "cafe" ? 0x2fb5a8 : th === "market" ? 0x7d8292 : th === "boss" ? 0xb5653d : th === "river" ? 0x8a90a0 : T.groundSide;
      B.box(cx, y + 0.14, 0, w, 0.28, DEPTH, lipC);
      B.box(cx, y + 0.02, 0, w + 0.02, 0.04, DEPTH + 0.02, 0x3a2228);
    }
    // 끝 벽
    function endWall(B, th, T, s) {
      var x = s[0], w = s[2], cx = x + w / 2, top = s[1] + s[3];
      var c = th === "cafe" ? 0xc98a76 : th === "market" ? 0xa8693e : th === "river" ? 0x8fbf74 : th === "boss" ? 0x7f8798 : T.wall;
      B.box(cx, (s[1] + top) / 2, (BACK_Z + DEPTH / 2) / 2, w, top - s[1], DEPTH / 2 - BACK_Z, c);
      B.box(cx, top, (BACK_Z + DEPTH / 2) / 2, w + 0.1, 0.2, DEPTH / 2 - BACK_Z + 0.1, 0xfff4e3);
    }
    // 구멍: 물이면 물 띠(z 앞쪽까지), 아니면 어두운 구멍
    function holes(B, L, th) {
      var iv = L.solids.filter(function (s) { return s[1] < 0 && s[3] < 10; }).map(function (s) { return [s[0], s[0] + s[2]]; }).sort(function (a, b) { return a[0] - b[0]; });
      var gaps = [], end = null;
      iv.forEach(function (r) { if (end != null && r[0] > end + 1e-6) gaps.push([end, r[0]]); end = end == null ? r[1] : Math.max(end, r[1]); });
      gaps.forEach(function (gp, i) {
        var a = gp[0], b = gp[1], cx = (a + b) / 2, w = b - a;
        if (L.water) {
          var z0 = BACK_Z, z1 = 2.8;
          B.box(cx, -3.3, (z0 + z1) / 2, w + 0.02, 5.5, z1 - z0, 0x3f8fb8); // 땅 몸통(−6)까지 — 얕으면 화면 아래가 하늘로 뚫렸다(사진 보고 고침)
          B.box(cx, -0.56, (z0 + z1) / 2, w + 0.02, 0.06, z1 - z0, 0x6cc3e8);
          for (var k = 0; k < 3; k++) B.box(a + w * (0.25 + 0.25 * k), -0.52, -3 + k * 2.1 + rnd(i * 7 + k), Math.min(0.7, w * 0.4), 0.02, 0.07, 0xd8f2fb);
        } else {
          B.box(cx, -3.6, (BACK_Z + DEPTH / 2) / 2, w + 0.02, 4.8, DEPTH / 2 - BACK_Z - 0.02, 0x2f2a33);
        }
      });
      return gaps;
    }
    // 위로만 통과하는 발판: 테마마다 꼴이 다르다(윗면은 늘 밝게)
    function semi(B, th, T, s, i) {
      var x = s[0], y = s[1], w = s[2], cx = x + w / 2;
      if (th === "cafe" && y >= 4) return sill(B, x, y, w);
      if (th === "cafe" || th === "market") {
        var pair = th === "cafe" ? [0xe85a5a, 0xfff4e3] : [[0x47a35a, 0xfff4e3], [0xffb347, 0xfff4e3], [0x2fb5a8, 0xfff4e3], [0xe85a5a, 0xffd166]][i % 4];
        var n = Math.max(2, Math.round(w / 0.5)), sw = w / n;
        for (var k = 0; k < n; k++) {
          B.box(x + sw * (k + 0.5), y - 0.08, -0.3, sw, 0.16, 2.4, pair[k % 2]);
          B.box(x + sw * (k + 0.5), y - 0.3, 0.9, sw, 0.3, 0.06, pair[k % 2]); // 앞 늘어진 천
          B.add(G.c6, pair[k % 2], x + sw * (k + 0.5), y - 0.45, 0.9, sw / 2, 0.06, 0.03); // 끝 둥근 자락
        }
        B.box(cx, y + 0.01, 0.86, w + 0.04, 0.04, 0.1, 0xffffff); // 윗면 앞 끝
        [x + 0.2, x + w - 0.2].forEach(function (px) { B.box(px, y - 0.6, -1.0, 0.06, 1.1, 0.06, 0x5a3a42, 0.55, 0, 0); }); // 받침대
        B.box(cx, y - 0.6, -1.5, w, 0.6, 0.08, th === "cafe" ? 0x8e4526 : 0xa8693e); // 벽에 붙인 판
        return;
      }
      if (th === "river") {
        if (i % 2 === 0) { // 나뭇가지: 굵은 가지 + 이끼 윗면 + 뒤 줄기·잎
          B.add(G.c6, 0x8e5a3a, cx, y - 0.2, -0.1, 0.22, w + 0.3, 0.3, 0, 0, Math.PI / 2);
          B.box(cx, y - 0.02, -0.1, w + 0.1, 0.06, 0.5, 0x6cc46a);
          B.add(G.c6, 0x7a4a2a, x + w + 0.25, y / 2 - 0.2, -1.6, 0.3, y + 0.8, 0.3);
          B.add(G.ico1, 0x47a35a, x + w + 0.3, y + 1.2, -2.0, 1.2, 0.9, 0.9);
          B.add(G.ico1, 0x6cc46a, x + w - 0.6, y + 0.8, -2.3, 0.8, 0.6, 0.7);
          return;
        }
        // 다리 난간 발판: 나무 판 + 뒤 기둥 + 손잡이
        B.box(cx, y - 0.09, -0.2, w, 0.18, 2.0, 0xd9a066);
        for (var q = 0; q < w / 0.5; q++) B.box(x + 0.25 + q * 0.5, y + 0.005, -0.2, 0.03, 0.01, 1.96, 0xa8693e);
        for (var pp = x + 0.2; pp <= x + w - 0.1; pp += Math.max(0.8, (w - 0.4) / 2)) B.box(pp, y / 2 + 0.45, -1.25, 0.14, y + 0.9, 0.14, 0x8e5a3a);
        B.box(cx, y + 0.85, -1.25, w + 0.2, 0.1, 0.12, 0xa8693e);
        return;
      }
      if (th === "boss") { // 녹슨 철판 선반 + 벽 기둥 + 버팀대 + 리벳
        B.box(cx, y - 0.07, -0.3, w, 0.14, 2.4, 0xb5653d);
        B.box(cx, y + 0.003, -0.3, w - 0.1, 0.01, 2.3, 0xd08a5a);
        for (var r = x + 0.25; r < x + w; r += 0.6) B.add(G.c6, 0x7a3a22, r, y - 0.07, 0.92, 0.05, 0.03, 0.05, Math.PI / 2);
        [x + 0.3, x + w - 0.3].forEach(function (px) { B.box(px, y / 2, -1.55, 0.18, y, 0.18, 0x6b7080); B.box(px, y - 0.55, -1.0, 0.08, 1.2, 0.08, 0x7a3a22, -0.75, 0, 0); });
        return;
      }
      // gray(시험 판): 시안 그대로
      B.box(cx, y - 0.11, -0.2, w, 0.22, DEPTH * 0.8, 0x7d93b8);
      for (var l = 0; l < 2; l++) B.box(x + 0.2 + l * (w - 0.4), y / 2, -1.2, 0.14, y, 0.14, 0xa3b4d6);
    }
    function sill(B, x, y, w) { // 카페 창턱: 튀어나온 벽 + 창 + 돌 창턱 + 꽃
      var cx = x + w / 2;
      B.box(cx, (y + 2.4) / 2, -1.95, w + 0.6, y + 2.4, 0.7, 0xf1dcc0);
      B.box(cx, y + 1.0, -1.58, w - 0.6, 1.4, 0.06, 0x6f9fbf); B.box(cx, y + 1.0, -1.55, 0.06, 1.4, 0.06, 0xfff4e3);
      B.box(cx, y - 0.1, -0.7, w, 0.2, 1.8, 0xeceef3); B.box(cx, y + 0.003, -0.7, w - 0.1, 0.01, 1.7, 0xffffff);
      for (var k = 0; k < w * 2; k++) B.add(G.ico0, [0xff8fb1, 0xffd166, 0xb99af0][k % 3], x + 0.25 + k * 0.5, y + 0.12, -1.45, 0.12);
    }

    // ── 배경(z −4.8 이하): 가까운 줄 · 먼 줄 · 하늘 ───────────────────
    function bgGray(B, L) {
      B.box(L.w / 2, 3, -5, L.w + 40, 14, 0.4, 0xa7acba);
      for (var x = -10; x < L.w + 10; x += 2) B.box(x, 3, -4.6, 0.5, 14, 0.5, x % 10 === 0 ? 0x8a909e : 0x969bab);
    }
    function clouds(B, L, y0, z) {
      for (var x = -20, i = 0; x < L.w + 30; x += 11 + rnd(i) * 6, i++) {
        var cy = y0 + rnd(i + 3) * 3;
        B.add(G.ico1, 0xffffff, x, cy, z, 2.2, 0.9, 1);
        B.add(G.ico1, 0xffffff, x + 1.6, cy - 0.2, z, 1.5, 0.7, 1);
        B.add(G.ico1, 0xffffff, x - 1.5, cy - 0.3, z, 1.3, 0.6, 1);
      }
    }
    function pawSign(B, x, y, z, board) { // 발자국 간판(글자 없음)
      B.add(G.c12, board, x, y, z, 0.46, 0.08, 0.46, Math.PI / 2);
      B.add(G.c12, 0x8e4526, x, y - 0.06, z + 0.06, 0.15, 0.04, 0.12, Math.PI / 2);
      [[-0.15, 0.1], [-0.06, 0.18], [0.06, 0.18], [0.15, 0.1]].forEach(function (d) { B.add(G.c8, 0x8e4526, x + d[0], y + d[1], z + 0.06, 0.055, 0.04, 0.055, Math.PI / 2); });
    }
    function bgCafe(B, L) {
      var cols = [0xe2a996, 0xf1dcc0, 0xbfe3d6, 0xe8c9a0];
      for (var bx = -12, k = 0; bx < L.w + 12; bx += 6, k++) {
        var H = 7 + (k % 3) * 0.9, col = cols[k % 4], fz = BACK_Z, cx = bx + 3, brick = col === 0xe2a996;
        B.box(cx, (H - 3) / 2, fz - 0.8, 6, H + 3, 1.6, col);
        B.box(cx, H + 0.12, fz + 0.06, 6.2, 0.3, 0.3, 0xfff4e3);
        B.box(bx, H / 2, fz + 0.1, 0.4, H, 0.25, brick ? 0xc98a76 : 0xd9c6ad); // 기둥(3 칸 마다 빠르기 표시)
        if (brick) for (var my = 0.5; my < H - 0.3; my += 0.55) B.box(cx, my, fz + 0.005, 5.8, 0.05, 0.02, 0xf2d0c2);
        [bx + 1.5, bx + 4.5].forEach(function (wx) {
          B.box(wx, 4.6, fz + 0.04, 1.3, 1.5, 0.1, 0xfff4e3); B.box(wx, 4.6, fz + 0.1, 1.0, 1.2, 0.05, 0x7fa9c4);
          B.box(wx, 4.6, fz + 0.13, 0.05, 1.2, 0.02, 0xfff4e3); B.box(wx, 3.8, fz + 0.2, 1.4, 0.1, 0.25, 0xfff4e3);
        });
        if (k % 2 === 0) { // 카페 앞: 큰 창 · 문 · 발자국 간판 · 의자와 탁자
          B.box(bx + 2.0, 1.45, fz + 0.04, 2.8, 2.2, 0.1, 0x8e4526); B.box(bx + 2.0, 1.5, fz + 0.1, 2.5, 1.9, 0.05, 0xa8d3e6);
          B.box(bx + 2.0, 1.5, fz + 0.13, 0.06, 1.9, 0.02, 0x8e4526);
          B.box(bx + 4.6, 1.1, fz + 0.04, 1.0, 2.2, 0.1, 0x8e4526); B.box(bx + 4.6, 1.1, fz + 0.1, 0.8, 2.0, 0.05, 0xd9a066);
          B.add(G.sphS, 0xffd36b, bx + 4.85, 1.0, fz + 0.15, 0.05, 0.05, 0.05);
          B.box(bx + 3.5, 3.05, fz + 0.3, 0.06, 0.06, 0.6, 0x3a2228); pawSign(B, bx + 3.5, 2.6, fz + 0.55, 0xfff4e3);
          [bx + 1.3, bx + 2.7].forEach(function (chx, ci) { // 의자
            var cz = -3.7;
            B.box(chx, 0.45, cz, 0.42, 0.06, 0.42, 0x2fb5a8); B.box(chx + (ci ? 0.18 : -0.18), 0.72, cz, 0.06, 0.5, 0.42, 0x2fb5a8);
            [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]].forEach(function (d) { B.box(chx + d[0], 0.22, cz + d[1], 0.04, 0.44, 0.04, 0x1f8f86); });
          });
          B.add(G.c12, 0xfff4e3, bx + 2.0, 0.72, -3.7, 0.38, 0.05, 0.38); B.box(bx + 2.0, 0.36, -3.7, 0.06, 0.72, 0.06, 0x5a3a42);
        } else { // 꽃집·집: 창 하나 + 창 아래 꽃 상자
          B.box(cx, 1.6, fz + 0.04, 2.2, 1.6, 0.1, 0xfff4e3); B.box(cx, 1.6, fz + 0.1, 1.9, 1.3, 0.05, 0x8fbfd6);
          B.box(cx, 0.65, fz + 0.25, 2.3, 0.35, 0.4, 0xa8693e);
          for (var f = 0; f < 6; f++) B.add(G.ico0, [0xff8fb1, 0xffd166, 0xb99af0][f % 3], cx - 1 + f * 0.4, 0.95, fz + 0.25, 0.14);
        }
        // 화분(보도)
        B.add(G.c8, 0xd9825f, bx + 0.9, 0.25, -3.4, 0.28, 0.5, 0.28); B.add(G.ico1, 0x6cc46a, bx + 0.9, 0.75, -3.4, 0.4, 0.42, 0.4);
        B.add(G.ico0, 0xff8fb1, bx + 0.8, 0.95, -3.1, 0.08);
      }
      // 먼 줄: 옅은 건물 실루엣 + 창 줄
      for (var x = -24, i = 0; x < L.w + 24; i++) {
        var w = 3 + rnd(i) * 2.5, h = 9 + rnd(i + 11) * 6, c = [0xe9d2ca, 0xd6e0ea, 0xf0e2cf, 0xd9ebe2][i % 4];
        B.box(x + w / 2, h / 2 - 2, -16, w, h + 4, 2, c);
        for (var wy = 3; wy < h - 1; wy += 1.6) B.box(x + w / 2, wy, -14.98, w - 1, 0.5, 0.04, 0xfafcff);
        x += w + 0.4;
      }
      clouds(B, L, 15, -32);
    }
    function bgMarket(B, L) {
      var roofs = [0xe85a5a, 0x47a35a, 0x2fb5a8, 0xffb347], fr = [0xf29a3a, 0xe85a5a, 0xffd166, 0x9bdc7c, 0x8b5cd6];
      for (var bx = -12, k = 0; bx < L.w + 12; bx += 4, k++) {
        var cx = bx + 2, fz = BACK_Z, rc = roofs[k % 4];
        B.box(cx, 1.1, fz - 0.4, 4, 5.4, 0.3, 0xf6e3c4); // 천 뒷벽
        B.box(bx + 0.06, 2.1, fz + 0.1, 0.12, 4.3, 0.12, 0x7a4a2a); // 기둥(4 칸)
        B.box(cx, 0.5, fz + 0.4, 3.6, 1.0, 0.8, 0xa8693e); B.box(cx, 0.85, fz + 0.81, 3.6, 0.12, 0.02, 0xd9a066);
        for (var f = 0; f < 7; f++) B.add(G.ico0, fr[(f + k) % 5], bx + 0.5 + f * 0.5, 1.15, fz + 0.4 + (f % 2) * 0.2 - 0.1, 0.17);
        B.add(G.prism, rc, cx, 3.9, fz + 0.1, 0.9, 4.0, 1.3, 0, 0, Math.PI / 2); // 세모 지붕(평평한 발판과 갈리게)
        for (var v = 0; v < 8; v++) B.box(bx + 0.25 + v * 0.5, 3.28, fz + 1.2, 0.5, 0.28, 0.04, v % 2 ? 0xfff4e3 : rc);
        // 보도 과일 상자
        if (k % 2 === 0) { B.box(cx + 1.0, 0.25, -3.4, 0.8, 0.5, 0.6, 0xd9a066); for (var a = 0; a < 3; a++) B.add(G.ico0, fr[(a + k + 2) % 5], cx + 0.75 + a * 0.25, 0.55, -3.4, 0.14); }
        // 전등줄: 기둥 꼭대기 사이로 처진 줄 + 전구
        B.box(bx + 1, 4.45, -3.8, 2.05, 0.03, 0.03, 0x3a2228, 0, 0, -0.2); B.box(bx + 3, 4.45, -3.8, 2.05, 0.03, 0.03, 0x3a2228, 0, 0, 0.2);
        [0.7, 1.5, 2.5, 3.3].forEach(function (d, j) { var yy = 4.45 - 0.2 * (1 - Math.abs(d - 2) / 2) - 0.12; B.add(G.ico0, [0xffe39a, 0xffb3bd, 0xb8f0e6][(j + k) % 3], bx + d, yy, -3.8, 0.09, 0.11, 0.09, 0, 0, 0, true); });
      }
      for (var x = -24, i = 0; x < L.w + 24; i++) { // 먼 줄: 지붕 있는 상가 건물
        var w = 3.5 + rnd(i) * 2, h = 6 + rnd(i + 5) * 4, c = [0xf3dfba, 0xe9d2ca, 0xdfe6ea, 0xe8e0c8][i % 4];
        B.box(x + w / 2, h / 2 - 2, -15, w, h + 4, 2, c);
        B.add(G.prism, [0xd9825f, 0x8fa7b8, 0xb99a7a][i % 3], x + w / 2, h + 0.45, -15, 1.0, w + 0.3, 1.3, 0, 0, Math.PI / 2);
        B.box(x + w / 2, 2.4, -13.95, w - 0.8, 0.8, 0.06, [0xffd166, 0x7fe0d4, 0xff8fb1][i % 3]); // 빈 간판(그림·글자 없음)
        for (var wy = 4; wy < h - 0.6; wy += 1.5) B.box(x + w / 2, wy, -13.97, w - 1.2, 0.5, 0.04, 0xfafcff);
        x += w + 0.3;
      }
      clouds(B, L, 14, -32);
    }
    function bgRiver(B, L) {
      var W = L.w + 60, cx = L.w / 2;
      B.box(cx, -0.6, -5.9, W, 0.3, 2.6, 0x8fd06e, 0.55, 0, 0); // 둑 비탈
      B.box(cx, -1.45, -9.5, W, 0.5, 6, 0x5ab0dc); // 강
      for (var i = 0; i < W / 3; i++) B.box(-30 + i * 3 + rnd(i) * 2, -1.18, -7.4 - rnd(i + 9) * 3.6, 0.8 + rnd(i + 2), 0.02, 0.08, 0xd8f2fb);
      B.box(cx, -0.5, -14, W, 1.8, 3.4, 0x8cc97a, -0.25, 0, 0); // 건너편 둑
      for (var x = -20, k = 0; x < L.w + 20; x += 2, k++) { // 갈대(2 칸) · 울타리 기둥(4 칸)
        for (var r = 0; r < 3; r++) B.add(G.cone4, r ? 0x9bc46a : 0xc9b27a, x + r * 0.18 - 0.2, 0.42, -4.3 - r * 0.15, 0.05, 0.9 + r * 0.15, 0.05, 0, 0, (r - 1) * 0.15);
        B.box(x + 0.05, 0.9, -4.3, 0.07, 0.22, 0.07, 0x8e5a3a);
        if (k % 2 === 0) { B.box(x + 1, 0.4, -2.9, 0.12, 0.8, 0.12, 0xa8693e); B.box(x + 2, 0.62, -2.9, 2.0, 0.08, 0.06, 0xd9a066); }
      }
      for (var t = -20, j = 0; t < L.w + 20; t += 4 + rnd(j) * 3, j++) { // 건너편 나무
        B.add(G.c6, 0x7a4a2a, t, 1.0, -14.2, 0.15, 1.6, 0.15);
        B.add(j % 2 ? G.cone6 : G.ico1, [0x47a35a, 0x6cc46a, 0x2f7d4a][j % 3], t, j % 2 ? 2.7 : 2.4, -14.2, 1.0, j % 2 ? 2.4 : 1.1, 1.0);
      }
      // 먼 다리: 상판 + 난간 줄 + 교각(12 칸)
      B.box(cx, 5.6, -30, W + 20, 0.7, 2, 0xdfe6ee); B.box(cx, 6.1, -29.1, W + 20, 0.1, 0.1, 0xb4bdcc);
      for (var p = -30; p < L.w + 40; p += 12) { B.box(p, 2.2, -30, 1.1, 7, 1.4, 0xcfd6e0); B.add(G.c12, 0xbfe6ff, p + 6, 2.4, -30.6, 4.6, 0.3, 2.6, Math.PI / 2); }
      for (var h = -40, m = 0; h < L.w + 40; h += 22, m++) B.add(G.ico1, [0xb8dcc0, 0xa9d0c8][m % 2], h, -1, -44, 14, 6 + rnd(m) * 3, 4);
      clouds(B, L, 13, -36);
    }
    function bgBoss(B, L) {
      var W = L.w + 30, cx = L.w / 2;
      B.box(cx, 3.5, -7.4, W, 13, 1, 0x7f8798); // 뒤 옹벽
      for (var y = 1; y < 9; y += 1.5) B.box(cx, y, -6.88, W, 0.05, 0.03, 0x99a0ae);
      for (var x = -12, k = 0; x < L.w + 12; x += 6, k++) { // 다리 기둥(6 칸) + 이끼
        B.box(x, 4, -5.4, 1.6, 12, 1.6, 0xa3a9b6); B.box(x, 4, -4.58, 1.2, 12, 0.04, 0xb9bfcb);
        B.box(x, 0.2, -5.4, 2.0, 0.4, 2.0, 0x8d93a3);
        B.add(G.ico0, 0x5f8a5a, x - 0.9, 0.2, -4.6, 0.35, 0.25, 0.3); B.add(G.ico0, 0x47a35a, x + 1.0, 0.15, -4.7, 0.3, 0.2, 0.3);
        B.box(x + 3, 2.5, -6.85, 0.6, 5, 0.03, 0x737a8a); // 물 흐른 자국
      }
      B.box(cx, 9.3, -2.2, W, 1.0, 12, 0x5d6475); // 다리 상판(그늘 천장)
      for (var g = -12; g < L.w + 12; g += 3) B.box(g, 8.7, -2.2, 0.3, 0.3, 12, 0x6b7282); // 가로보(3 칸)
      [-6, -2, 2].forEach(function (z) { B.box(cx, 8.62, z, W, 0.4, 0.3, 0x737a8a); });
      for (var pz = 0; pz < 4; pz++) B.box(3 + pz * 7, 0.004, -3.4 + (pz % 2) * 0.8, 1.6, 0.01, 0.8, 0x8a96ad); // 물웅덩이(뒤 보도)
    }

    // ── 체크포인트(물그릇 + 깃발) · 도착 화살표 ─────────────────────
    function makeCp(x, y) {
      var g = grp(null, x, y, -1.1);
      var bowlM = new THREE.MeshLambertMaterial({ color: 0x8b5cd6, flatShading: true }), waterM = new THREE.MeshLambertMaterial({ color: 0xa7acba, flatShading: true });
      var clothM = new THREE.MeshLambertMaterial({ color: 0xcfd3dc, flatShading: true }), pawM = new THREE.MeshLambertMaterial({ color: 0x8a909e, flatShading: true });
      mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.24, 12), bowlM, g, 0.55, 0.12, 0.5);
      mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.02, 12), waterM, g, 0.55, 0.23, 0.5);
      mesh(G.c6, 0x5a5f7a, g, 0, 1.2, 0, 0.06, 2.4, 0.06);
      mesh(G.sphS, 0xffd36b, g, 0, 2.45, 0, 0.1);
      var cloth = mesh(G.box, clothM, g, 0.48, 2.05, 0, 0.9, 0.58, 0.05);
      var paw = grp(g, 0.48, 2.03, 0.05);
      mesh(G.c8, pawM, paw, 0, -0.05, 0, 0.11, 0.03, 0.09).rotation.x = Math.PI / 2;
      [[-0.11, 0.07], [-0.04, 0.13], [0.04, 0.13], [0.11, 0.07]].forEach(function (d) { mesh(G.c8, pawM, paw, d[0], d[1], 0, 0.04, 0.03, 0.04).rotation.x = Math.PI / 2; });
      function set(on) {
        clothM.color.setHex(on ? 0x2fb5a8 : 0xcfd3dc); pawM.color.setHex(on ? 0xfff4e3 : 0x8a909e);
        waterM.color.setHex(on ? 0x8fd3ff : 0xa7acba); waterM.emissive.setHex(on ? 0x1f5a7a : 0x000000);
        cloth.rotation.y = on ? -0.25 : 0;
      }
      set(false);
      return { g: g, set: set };
    }
    function placeIcon(parent, kind) { // 다음 장소 그림(글자 없음)
      var ic = grp(parent);
      if (kind === "market") { mesh(G.ico1, 0xe85a5a, ic, 0, 0, 0, 0.2); mesh(G.cone4, 0x47a35a, ic, 0.08, 0.24, 0, 0.07, 0.16, 0.07).rotation.z = -0.7; mesh(G.box, 0x7a4a2a, ic, 0, 0.21, 0, 0.03, 0.1, 0.03); }
      else if (kind === "river") { [0.1, -0.06].forEach(function (y, i) { for (var k = 0; k < 3; k++) { var m = mesh(G.box, i ? 0x2a8fa8 : 0x5ad1e6, ic, -0.16 + k * 0.16, y + (k % 2) * 0.04, 0, 0.16, 0.05, 0.04); m.rotation.z = k % 2 ? -0.5 : 0.5; } }); }
      else if (kind === "boss") { var a = mesh(new THREE.TorusGeometry(0.17, 0.04, 4, 10, Math.PI), 0x8a90a0, ic, 0, -0.08, 0); mesh(G.box, 0x5a5f7a, ic, 0, 0.12, 0, 0.5, 0.06, 0.06); a.scale.z = 0.5; }
      else { mesh(G.box, 0xfff4e3, ic, 0, -0.05, 0, 0.3, 0.24, 0.1); var rf = mesh(G.cone4, 0xe85a5a, ic, 0, 0.17, 0, 0.27, 0.2, 0.1); rf.rotation.y = Math.PI / 4; mesh(G.box, 0x8e4526, ic, 0, -0.1, 0.06, 0.08, 0.14, 0.02); }
      return ic;
    }
    function makeGoal(x, next) {
      var g = grp(null, x, 0, -1.0);
      mesh(G.box, 0x8e5a3a, g, 0, 1.3, 0, 0.14, 2.6, 0.14);
      var sh = new THREE.Shape(); sh.moveTo(-0.7, -0.2); sh.lineTo(0.25, -0.2); sh.lineTo(0.25, -0.42); sh.lineTo(0.78, 0); sh.lineTo(0.25, 0.42); sh.lineTo(0.25, 0.2); sh.lineTo(-0.7, 0.2); sh.lineTo(-0.7, -0.2);
      var ar = mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false }), 0xffd36b, g, 0.45, 1.85, 0.08);
      mesh(G.c12, 0xfff4e3, g, 0.05, 2.62, 0.12, 0.34, 0.08, 0.34).rotation.x = Math.PI / 2;
      var ic = placeIcon(g, next); ic.position.set(0.05, 2.62, 0.2);
      mesh(G.c8, 0x8e4526, g, 0.3, 1.85, 0.21, 0.09, 0.02, 0.07).rotation.x = Math.PI / 2; // 화살표 위 발자국 하나
      ar.userData.arrow = true;
      return g;
    }

    function buildStage(L, group) {
      var th = THEMES[L.theme] ? L.theme : "gray", T = themeOf(th), A = AUX[th];
      var B = makeBatch(12);
      (L.solids || []).forEach(function (s, i) {
        if (s[1] > 0) ceiling(B, th, T, s);
        else if (s[3] >= 10) endWall(B, th, T, s);
        else if (s[1] < 0) groundPiece(B, th, T, A, s);
        else propBlock(B, th, T, s, i);
      });
      holes(B, L, th);
      (L.semis || []).forEach(function (s, i) { semi(B, th, T, s, i); });
      if (th === "cafe") bgCafe(B, L); else if (th === "market") bgMarket(B, L); else if (th === "river") bgRiver(B, L); else if (th === "boss") bgBoss(B, L); else bgGray(B, L);
      B.flush(group);
      var cp = { set: function () {} };
      if (!L.boss && L.cp) { var c = makeCp(L.cp[0], L.cp[1]); group.add(c.g); cp = { set: c.set }; }
      if (isFinite(L.goal)) {
        var LH = (typeof window !== "undefined" && window.LabHome) || null, nx = LH && L.next && LH.LEVELS[L.next];
        group.add(makeGoal(L.goal, nx ? nx.theme : "home"));
      }
      return { cp: cp };
    }

    // ── 물에 뜬 나무판 ────────────────────────────────────────────
    function makeMover(w) {
      var g = new THREE.Group(), n = Math.max(2, Math.round(w / 0.42)), pw = w / n;
      for (var i = 0; i < n; i++) mesh(G.box, i % 2 ? 0xc98d55 : 0xd9a066, g, pw * (i + 0.5), -0.13, 0, pw - 0.04, 0.26, 2.0);
      mesh(G.box, 0x8a5530, g, w / 2, -0.2, 0.75, w + 0.05, 0.1, 0.12); mesh(G.box, 0x8a5530, g, w / 2, -0.2, -0.75, w + 0.05, 0.1, 0.12);
      mesh(G.box, 0x6a4a3a, g, w / 2, -0.32, 0, w - 0.1, 0.06, 1.9);
      mesh(G.box, 0xffffff, g, w / 2, 0.003, 0.98, w, 0.01, 0.04); // 윗면 앞 끝
      return g;
    }

    // ══ 적 ═══════════════════════════════════════════════════
    // root(화면이 자리) → flip(e.face 로 좌우) → 몸. 모델은 +x 를 본다. 눈은 카메라 쪽(z+) 옆얼굴에.
    function shell() { var root = new THREE.Group(), flip = grp(root); return { root: root, flip: flip }; }
    function faceTo(flip, e) { flip.scale.x = e && e.face < 0 ? -1 : 1; }
    var MAKERS = {
      brush: function () { // 칫솔: 누운 손잡이 + 위로 솟은 민트 솔 + 걷는 다리 둘
        var s = shell(), b = grp(s.flip);
        mesh(G.box, 0xfff4e3, b, -0.06, 0.38, 0, 0.82, 0.18, 0.26);
        mesh(G.box, 0x7fe0d4, b, -0.35, 0.38, 0, 0.18, 0.2, 0.28); // 손잡이 끝 고무
        mesh(G.box, 0xfff4e3, b, 0.3, 0.42, 0, 0.3, 0.2, 0.3);
        for (var i = 0; i < 3; i++) for (var j = 0; j < 2; j++) mesh(G.box, j ? 0xffffff : 0x7fe0d4, b, 0.2 + i * 0.1, 0.6, (j - 0.5) * 0.13, 0.08, 0.2, 0.1);
        eye(b, 0.24, 0.43, 0.15, 0.055); eye(b, 0.38, 0.43, 0.15, 0.05);
        mesh(G.sphS, 0xffb3bd, b, 0.06, 0.36, 0.14, 0.05, 0.03, 0.02);
        var legs = [-1, 1].map(function (k) { var lg = grp(b, k * 0.18, 0.3, 0); mesh(G.box, 0x5a3a42, lg, 0, -0.13, 0, 0.07, 0.26, 0.07); mesh(G.box, 0x2fb5a8, lg, 0.04, -0.27, 0, 0.14, 0.05, 0.12); return lg; });
        return { root: s.root, update: function (e, t, dt, reduce) {
          faceTo(s.flip, e); var a = reduce ? 0.2 : 0.55, w = Math.sin(t * 12);
          legs[0].rotation.z = a * w; legs[1].rotation.z = -a * w; b.position.y = reduce ? 0 : Math.abs(w) * 0.03;
        } };
      },
      bubble: function () { // 목욕 거품: 반투명 공 + 작은 거품 + 반짝 + 볼터치
        var s = shell(), b = grp(s.flip, 0, 0.4, 0);
        var mat = new THREE.MeshLambertMaterial({ color: 0xf2fbff, emissive: 0x3a4c5c, flatShading: true }); // 반투명(0.78·0.9)은 풀빛 둑 앞에서 초록으로 묻혔다 → 불투명 + 반짝으로(사진 보고 고침)
        var ball = mesh(G.ico1, mat, b, 0, 0, 0, 0.4); ball.renderOrder = 2;
        var small = [[0.3, 0.3, -0.05, 0.15], [-0.33, 0.22, -0.1, 0.11], [0.12, 0.42, -0.15, 0.09]].map(function (d) { var m = mesh(G.ico1, mat, b, d[0], d[1], d[2], d[3]); m.renderOrder = 2; return m; });
        mesh(G.sphS, 0xffffff, b, -0.17, 0.2, 0.3, 0.07); mesh(G.sphS, 0xffffff, b, -0.08, 0.27, 0.3, 0.035);
        eye(b, -0.04, 0.02, 0.36, 0.05); eye(b, 0.14, 0.02, 0.34, 0.05);
        mesh(G.sphS, 0xffb3bd, b, -0.13, -0.08, 0.33, 0.05, 0.03, 0.02); mesh(G.sphS, 0xffb3bd, b, 0.24, -0.08, 0.28, 0.05, 0.03, 0.02);
        return { root: s.root, update: function (e, t, dt, reduce) {
          faceTo(s.flip, e); if (reduce) return;
          var k = Math.sin(t * 3.2) * 0.05; b.scale.set(1 + k, 1 - k, 1 + k);
          small.forEach(function (m, i) { m.position.y += Math.sin(t * 2 + i * 2) * 0.0015; });
        } };
      },
      minivac: function () { // 꼬마 로봇 청소기: 납작 원반 + 범퍼 + 눈 화면 + 안테나 + 옆 솔
        var s = shell(), b = grp(s.flip);
        mesh(G.c12, 0x6c7ae0, b, 0, 0.2, 0, 0.5, 0.22, 0.48);
        mesh(G.c12, 0xa3adf5, b, 0, 0.33, 0, 0.42, 0.05, 0.4);
        mesh(G.c12, 0x2c2a3a, b, 0, 0.1, 0, 0.52, 0.06, 0.5);
        var face = grp(b, 0.28, 0.22, 0.36); face.rotation.y = 0.65;
        mesh(G.box, 0x24161d, face, 0, 0, 0, 0.3, 0.13, 0.03);
        var eyes = [-0.07, 0.07].map(function (x) { return mesh(G.box, glowMat(0x8fe3ff), face, x, 0, 0.02, 0.06, 0.07, 0.02); });
        mesh(G.c6, 0x3a2228, b, -0.1, 0.42, 0, 0.015, 0.16, 0.015); var bulb = mesh(G.sphS, glowMat(0xffd36b), b, -0.1, 0.52, 0, 0.04);
        var brush = grp(b, 0.36, 0.06, 0.28);
        for (var i = 0; i < 3; i++) { var bb = mesh(G.box, 0xffd36b, brush, 0, 0, 0, 0.2, 0.015, 0.03); bb.rotation.y = i * TAU / 3; bb.position.set(Math.cos(i * TAU / 3) * 0.08, 0, -Math.sin(i * TAU / 3) * 0.08); }
        [-0.25, 0.25].forEach(function (x) { mesh(G.c8, 0x24161d, b, x, 0.06, 0.4, 0.06, 0.04, 0.06).rotation.x = Math.PI / 2; });
        return { root: s.root, update: function (e, t, dt, reduce) {
          faceTo(s.flip, e); brush.rotation.y = t * (reduce ? 4 : 16);
          var bl = ((t * 0.8) % 3) < 0.08; eyes.forEach(function (m) { m.scale.y = bl ? 0.014 : 0.07; }); // 기본 키 0.07(1 로 두면 눈이 막대로 솟았다 — 사진 보고 고침)
          bulb.visible = reduce || Math.floor(t * 3) % 2 === 0; b.position.y = reduce ? 0 : Math.abs(Math.sin(t * 18)) * 0.012;
        } };
      },
      dust: function () { // 먼지 뭉치: 회색 솜 덩이 + 눈 + 작은 발
        var s = shell(), b = grp(s.flip, 0, 0.25, 0), puffs = [];
        [[0, 0, 0, 0.25], [0.17, 0.06, 0.06, 0.15], [-0.17, 0.05, 0.04, 0.16], [0.05, 0.17, -0.03, 0.15], [-0.06, -0.08, 0.14, 0.13], [0.15, -0.1, -0.1, 0.12]].forEach(function (d, i) { puffs.push(mesh(G.ico0, i % 2 ? 0xa7acba : 0xcfd3dc, b, d[0], d[1], d[2], d[3])); });
        for (var k = 0; k < 3; k++) mesh(G.box, 0x7d8292, b, -0.2 + k * 0.17, 0.25, 0, 0.02, 0.1, 0.02).rotation.z = (k - 1) * 0.5; // 삐친 털
        eye(b, 0.09, 0.02, 0.22, 0.045); eye(b, 0.2, 0.02, 0.15, 0.04);
        [-0.1, 0.1].forEach(function (x) { mesh(G.sphS, 0x5a5f7a, s.flip, x, 0.03, 0.05, 0.06, 0.04, 0.07); });
        return { root: s.root, update: function (e, t, dt, reduce) {
          faceTo(s.flip, e); if (reduce) return;
          b.position.y = 0.25 + Math.abs(Math.sin(t * 9)) * 0.05; b.rotation.z = Math.sin(t * 9) * 0.08;
          puffs.forEach(function (m, i) { m.rotation.y = t * (1 + i * 0.3); });
        } };
      },
      yapper: function () { // 짖는 작은 강아지: 흰 몰티즈(코코와 다른 견종·색) — 긴 흰 귀, 분홍 리본, 까만 코
        var s = shell(), b = grp(s.flip);
        var W = 0xfaf7f2, W2 = 0xeee6da;
        var body = grp(b, 0, 0.36, 0);
        mesh(G.ico1, W, body, -0.08, 0, 0, 0.36, 0.26, 0.24);
        mesh(G.ico1, W2, body, -0.08, -0.17, 0, 0.32, 0.12, 0.22); // 늘어진 배 털
        var legs = [[-0.28, 0.12], [-0.28, -0.12], [0.12, 0.12], [0.12, -0.12]].map(function (d) { var lg = grp(b, d[0], 0.2, d[1]); mesh(G.c6, W2, lg, 0, -0.1, 0, 0.06, 0.2, 0.06); return lg; });
        var tail = grp(body, -0.42, 0.12, 0); mesh(G.ico0, W, tail, -0.06, 0.08, 0, 0.12, 0.09, 0.09);
        var head = grp(b, 0.28, 0.62, 0);
        mesh(G.ico1, W, head, 0, 0, 0, 0.24, 0.22, 0.22);
        mesh(G.ico1, W, head, 0.2, -0.06, 0, 0.11, 0.09, 0.1); // 주둥이
        mesh(G.sphS, 0x24161d, head, 0.31, -0.03, 0, 0.04);
        var jaw = grp(head, 0.17, -0.12, 0); var jawM = mesh(G.box, W2, jaw, 0.06, -0.01, 0, 0.13, 0.04, 0.1);
        var mouth = mesh(G.box, 0xd9546a, head, 0.22, -0.13, 0.02, 0.08, 0.03, 0.08); mouth.visible = false;
        eye(head, 0.13, 0.05, 0.17, 0.045); eye(head, 0.0, 0.05, 0.2, 0.045);
        mesh(G.sphS, 0xffb3bd, head, 0.06, -0.06, 0.19, 0.045, 0.025, 0.02);
        var ears = [0.13, -0.13].map(function (z) { var ear = grp(head, -0.04, 0.08, z); mesh(G.ico1, W2, ear, 0, -0.16, 0, 0.09, 0.2, 0.05); return ear; });
        var bow = grp(head, -0.02, 0.22, 0.02); mesh(G.cone4, 0xff8fb1, bow, -0.07, 0, 0, 0.06, 0.12, 0.05).rotation.z = Math.PI / 2; mesh(G.cone4, 0xff8fb1, bow, 0.07, 0, 0, 0.06, 0.12, 0.05).rotation.z = -Math.PI / 2; mesh(G.sphS, 0xf07a8a, bow, 0, 0, 0, 0.035);
        var lastCd = null, barkT = 0;
        return { root: s.root, update: function (e, t, dt, reduce) {
          faceTo(s.flip, e);
          if (lastCd != null && e.cd > lastCd + 0.5) barkT = 0.35; // 짖는 순간(엔진이 cd 를 every 로 되감는다)
          lastCd = e.cd; barkT = Math.max(0, barkT - (dt || 0));
          var warn = !!e.warn && barkT <= 0, bark = barkT > 0;
          var crouch = warn ? 1 : 0;
          b.scale.set(1 + 0.06 * crouch, 1 - 0.14 * crouch, 1);
          head.position.set(0.28 + 0.04 * crouch, 0.62 - 0.1 * crouch, 0); head.rotation.z = warn ? -0.25 : bark ? 0.25 : 0;
          jaw.rotation.z = bark ? -0.55 : 0; mouth.visible = bark;
          tail.rotation.x = reduce ? 0 : Math.sin(t * (warn ? 24 : 14)) * 0.6;
          ears.forEach(function (ear, i) { ear.rotation.z = bark ? 0.5 : warn ? -0.2 : (reduce ? 0 : Math.sin(t * 6 + i) * 0.08); });
          body.position.x = bark && !reduce ? 0.04 : 0;
          legs.forEach(function (lg, i) { lg.rotation.z = warn ? (i < 2 ? 0.3 : -0.3) : 0; });
        } };
      },
      crate: function () { // 굴러오는 과일 상자: 가운데를 축으로 굴러 넘어진다(모서리가 땅에 닿게 높이 보정)
        var s = shell(), piv = grp(s.flip, 0, 0.45, 0), h = 0.45;
        mesh(G.box, 0xd9a066, piv, 0, 0, 0, 0.88, 0.88, 0.88);
        [[0, 0.4], [0, -0.4]].forEach(function (d) { mesh(G.box, 0x8a5530, piv, d[0], d[1], 0.45, 0.88, 0.08, 0.02); mesh(G.box, 0x8a5530, piv, d[1], d[0], 0.45, 0.08, 0.88, 0.02); });
        [0xf29a3a, 0xe85a5a, 0xffd166].forEach(function (c, i) { mesh(G.ico0, c, piv, -0.22 + i * 0.22, 0.47, 0.1 - (i % 2) * 0.2, 0.15); });
        mesh(G.box, 0x47a35a, piv, 0.0, 0.62, 0.1, 0.05, 0.08, 0.05);
        eye(piv, -0.12, 0.05, 0.45, 0.06); eye(piv, 0.12, 0.05, 0.45, 0.06);
        mesh(G.sphS, 0xffb3bd, piv, -0.25, -0.08, 0.45, 0.06, 0.035, 0.02); mesh(G.sphS, 0xffb3bd, piv, 0.25, -0.08, 0.45, 0.06, 0.035, 0.02);
        return { root: s.root, update: function (e, t, dt, reduce) {
          var a = (-(e.x || 0) / 0.9) * (Math.PI / 2); // 0.9 칸 구르면 90°
          if (reduce) a = 0; // 줄인 동작: 구르지 않고 미끄러져 온다
          piv.rotation.z = a; piv.position.y = h * (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a)));
        } };
      },
      bike: function () { // 자전거(사람 없음): 바퀴 둘 · 민트 틀 · 앞 바구니 · 노란 종 · 전조등 눈
        var s = shell(), b = grp(s.flip), R = 0.4;
        var wheels = [-0.55, 0.55].map(function (x) {
          var w = grp(b, x, R, 0);
          mesh(new THREE.TorusGeometry(R, 0.055, 4, 14), 0x3a2228, w);
          mesh(G.c8, 0xcfd3dc, w, 0, 0, 0, 0.07, 0.1, 0.07).rotation.x = Math.PI / 2;
          for (var k = 0; k < 3; k++) mesh(G.box, 0xcfd3dc, w, 0, 0, 0, 0.02, R * 2 - 0.06, 0.02).rotation.z = k * Math.PI / 3;
          return w;
        });
        var tubeC = 0x2fb5a8, tube = function (x0, y0, x1, y1, r) { var m = mesh(G.c6, tubeC, b, (x0 + x1) / 2, (y0 + y1) / 2, 0, r || 0.035, Math.hypot(x1 - x0, y1 - y0), r || 0.035); m.rotation.z = Math.atan2(x0 - x1, y1 - y0); return m; };
        tube(-0.55, R, -0.1, 0.4); tube(-0.1, 0.4, 0.4, 0.82); tube(-0.55, R, -0.2, 0.82); tube(-0.2, 0.82, 0.4, 0.82); tube(-0.1, 0.4, -0.25, 0.9); tube(0.55, R, 0.42, 0.98);
        mesh(G.box, 0x3a2228, b, -0.27, 0.95, 0, 0.26, 0.06, 0.12); // 안장
        var bar = grp(b, 0.42, 1.0, 0); mesh(G.c6, 0x5a3a42, bar, 0, 0, 0, 0.025, 0.36, 0.025).rotation.x = Math.PI / 2;
        mesh(G.box, 0xd9a066, b, 0.68, 0.84, 0, 0.26, 0.2, 0.3); mesh(G.box, 0xa8693e, b, 0.68, 0.94, 0.16, 0.26, 0.03, 0.02); // 바구니
        var lamp = grp(b, 0.82, 0.84, 0.05); mesh(G.c8, 0xfff4e3, lamp, 0, 0, 0, 0.08, 0.06, 0.08).rotation.z = Math.PI / 2; mesh(G.sphS, 0xffd36b, lamp, 0.03, 0, 0, 0.055);
        eye(b, 0.6, 0.86, 0.17, 0.045); eye(b, 0.75, 0.86, 0.17, 0.045); // 바구니 얼굴
        var bell = grp(bar, 0, 0.04, 0.14); mesh(new THREE.SphereGeometry(0.075, 8, 4, 0, TAU, 0, Math.PI / 2), 0xffd36b, bell); mesh(G.c8, 0xe0a640, bell, 0, 0, 0, 0.08, 0.015, 0.08);
        var lines = grp(bar, 0.02, 0.12, 0.14); [-0.6, 0, 0.6].forEach(function (a) { var l = mesh(G.box, 0xffd36b, lines, Math.sin(a) * 0.16, Math.cos(a) * 0.16, 0, 0.025, 0.1, 0.025); l.rotation.z = -a; });
        lines.visible = false;
        return { root: s.root, update: function (e, t, dt, reduce) {
          faceTo(s.flip, e);
          var fwd = (e.x || 0) * (e.face < 0 ? -1 : 1);
          wheels.forEach(function (w) { w.rotation.z = -fwd / R; });
          var ring = e.st === "ring"; lines.visible = ring;
          bell.rotation.z = ring ? (reduce ? 0.2 : Math.sin(t * 40) * 0.45) : 0;
          lines.scale.setScalar(ring && !reduce ? 0.9 + 0.2 * Math.sin(t * 20) : 1);
          b.position.y = e.st === "go" && !reduce ? Math.abs(Math.sin(t * 16)) * 0.025 : 0;
        } };
      },
      vacuum_king: function () { // 로봇 청소기 대왕: 둥근 원반 몸 3.2×1.3 · 왕관 · 빛나는 눈 · 옆 솔
        var s = shell(), piv = grp(s.flip, 0, 0.6, 0), b = grp(piv, 0, -0.6, 0);
        var bodyM = new THREE.MeshLambertMaterial({ color: 0x4a54b0, flatShading: true }), topM = new THREE.MeshLambertMaterial({ color: 0x6c7ae0, flatShading: true }), domeM = new THREE.MeshLambertMaterial({ color: 0xa3adf5, flatShading: true });
        var flashMats = [bodyM, topM, domeM];
        mesh(new THREE.CylinderGeometry(1.58, 1.6, 0.6, 18), bodyM, b, 0, 0.45, 0);
        mesh(new THREE.CylinderGeometry(1.62, 1.62, 0.16, 18), 0x2c2a3a, b, 0, 0.2, 0); // 범퍼
        mesh(new THREE.CylinderGeometry(1.4, 1.56, 0.12, 18), topM, b, 0, 0.8, 0);
        mesh(new THREE.SphereGeometry(1, 14, 4, 0, TAU, 0, Math.PI / 2), domeM, b, 0, 0.84, 0, 0.9, 0.22, 0.9);
        // 왕관: 금 띠 + 뾰족 다섯 + 보석(남은 체력만큼)
        var crown = grp(b, -0.1, 1.02, 0);
        mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.2, 10, 1, true), 0xffcf4d, crown, 0, 0.1, 0);
        for (var i = 0; i < 5; i++) { var a = i * TAU / 5 + 0.3; mesh(G.cone4, 0xffcf4d, crown, Math.cos(a) * 0.4, 0.3, Math.sin(a) * 0.4, 0.09, 0.22, 0.09); mesh(G.sphS, 0xfff0b8, crown, Math.cos(a) * 0.4, 0.43, Math.sin(a) * 0.4, 0.04); }
        var gems = [-0.17, 0, 0.17].map(function (x) { return mesh(G.ico0, 0xf07a8a, crown, x, 0.1, 0.45, 0.07); });
        // 눈: 카메라 쪽 옆면 앞쪽(빛) · 어지러울 땐 소용돌이
        var eyeG = [0.55, 1.05].map(function (x) {
          var z = Math.sqrt(1.6 * 1.6 - x * x) + 0.01, g = grp(b, x, 0.5, z); g.rotation.y = Math.atan2(x, z);
          var white = mesh(G.c12, glowMat(0xe8f4fb), g, 0, 0, 0, 0.17, 0.03, 0.2); white.rotation.x = Math.PI / 2;
          var pupil = mesh(G.c12, glowMat(0x2a8fa8), g, 0.03, 0.02, 0.02, 0.09, 0.03, 0.11); pupil.rotation.x = Math.PI / 2;
          var shine = mesh(G.sphS, glowMat(0xffffff), g, 0.07, 0.08, 0.04, 0.035);
          var spiral = mesh(new THREE.TorusGeometry(0.1, 0.025, 3, 10, Math.PI * 1.6), glowMat(0x8b5cd6), g, 0, 0, 0.04); spiral.visible = false;
          return { g: g, white: white, pupil: pupil, shine: shine, spiral: spiral };
        });
        mesh(G.box, 0x24161d, b, 0.85, 0.32, 1.4, 0.32, 0.05, 0.04).rotation.y = 0.55; // 입(범퍼 위 작은 줄)
        var brushes = [[1.25, 0.95], [1.25, -0.95]].map(function (d) {
          var br = grp(b, d[0], 0.1, d[1]);
          for (var k = 0; k < 3; k++) { var m = mesh(G.box, 0xffd36b, br, Math.cos(k * TAU / 3) * 0.2, 0, -Math.sin(k * TAU / 3) * 0.2, 0.45, 0.03, 0.05); m.rotation.y = k * TAU / 3; }
          return br;
        });
        var wheels = [-0.9, 0.9].map(function (x) { var w = mesh(G.c12, 0x24161d, b, x, 0.1, 1.45, 0.16, 0.1, 0.16); w.rotation.x = Math.PI / 2; return w; });
        var stars = grp(b, -0.1, 1.75, 0), starL = [];
        for (var j = 0; j < 3; j++) { var st = mesh(G.ico0, 0xffd36b, stars, 0, 0, 0, 0.13, 0.13, 0.05); starL.push(st); }
        stars.visible = false;
        return { root: s.root, update: function (e, t, dt, reduce) {
          faceTo(s.flip, e);
          var st = e.st || "roam", hp = e.hp == null ? 3 : e.hp;
          gems.forEach(function (g, i) { g.visible = i < hp; });
          piv.rotation.set(0, 0, 0); piv.position.set(0, 0.6, 0); b.scale.set(1, 1, 1);
          var spin = st === "charge" ? 30 : st === "wind" ? 22 : st === "down" || st === "stun" ? 2 : 8;
          brushes.forEach(function (br, i) { br.rotation.y += (i ? -1 : 1) * spin * (reduce ? 0.3 : 1) * (dt || 0.016); });
          wheels.forEach(function (w) { w.rotation.y = -(e.x || 0) * 3; });
          var stun = st === "stun", eyeOn = st !== "intro" || (e.stT != null ? 1 - e.stT / 1.4 : 1);
          eyeG.forEach(function (E) {
            E.white.visible = E.pupil.visible = E.shine.visible = !stun && st !== "down"; E.spiral.visible = stun || st === "down";
            E.spiral.rotation.z = reduce ? 0 : -t * 8;
            var sc = typeof eyeOn === "number" ? Math.max(0.05, eyeOn) : 1; E.g.scale.set(1, st === "wind" ? 0.55 : 1, 1); E.g.scale.multiplyScalar(sc);
            E.pupil.position.x = st === "charge" ? 0.07 : 0.03;
          });
          stars.visible = stun || st === "down";
          if (stars.visible) starL.forEach(function (m, i) { var a = (reduce ? 0 : t * 3) + i * TAU / 3; m.position.set(Math.cos(a) * 0.55, 0.06 * Math.sin(a * 2), Math.sin(a) * 0.55); m.rotation.y = a; });
          var flash = st === "hurt" && (reduce ? true : Math.floor(t * 18) % 2 === 0);
          flashMats.forEach(function (m) { m.emissive.setHex(flash ? 0xffffff : 0x000000); m.emissiveIntensity = flash ? 0.6 : 0; });
          if (st === "intro") { b.position.y = -0.6 + (reduce ? 0 : Math.abs(Math.sin(t * 6)) * 0.04); crown.position.y = 1.02 + (reduce ? 0 : Math.abs(Math.sin(t * 6 + 1)) * 0.06); }
          else { b.position.y = -0.6; crown.position.y = 1.02; }
          if (st === "roam" && !reduce) b.position.y += Math.abs(Math.sin(t * 7)) * 0.02;
          if (st === "wind") { if (reduce) b.scale.set(1.02, 0.98, 1.02); else { piv.position.x = Math.sin(t * 70) * 0.05; piv.rotation.z = Math.sin(t * 55) * 0.03; } }
          if (st === "charge") piv.rotation.z = -0.1;
          if (st === "stun" && !reduce) piv.rotation.z = Math.sin(t * 5) * 0.05;
          if (st === "down") { // 뒤집혀 멈춤: 0.5 초 동안 굴러 뒤집히고, 바퀴가 허공에서 천천히 돈다
            var k = e.stT != null ? Math.min(1, (1.6 - e.stT) / 0.5) : 1; if (reduce) k = 1;
            piv.rotation.z = Math.PI * (k * k * (3 - 2 * k)); piv.position.y = 0.6 + Math.sin(Math.PI * k) * 0.5 - k * 0.1; // 뒤집히면 돔이 땅에 닿게(0.45 는 떠 있었다)
            stars.position.y = k > 0.5 ? -0.7 : 1.75;
          } else stars.position.y = 1.75;
        } };
      },
    };
    function makeEnemy(kind) {
      var mk = MAKERS[kind] || MAKERS.dust, o = mk();
      o.root.name = "enemy-" + kind;
      return o;
    }

    // ── 짖음 파동: 「멍」 반원 고리 세 겹(+x 쪽으로 퍼짐) ──────────────
    var WAVE_GEO = [0.12, 0.2, 0.28].map(function (r) { return new THREE.TorusGeometry(r, 0.05, 3, 8, Math.PI * 0.8); });
    function makeWave() {
      var g = new THREE.Group(), m = glowMat(0xffcf4d);
      WAVE_GEO.forEach(function (geo, i) { var r = mesh(geo, i === 1 ? glowMat(0xfff4e3) : m, g, -0.18 + i * 0.07, 0.28, 0); r.rotation.z = -Math.PI * 0.4; });
      return g;
    }

    // ── 먹을 것 ───────────────────────────────────────────────────
    var PICK_GEO = null;
    function pickGeo() {
      if (PICK_GEO) return PICK_GEO;
      var sh = new THREE.Shape(); sh.moveTo(0, -0.32); sh.bezierCurveTo(-0.5, 0.02, -0.34, 0.38, 0, 0.18); sh.bezierCurveTo(0.34, 0.38, 0.5, 0.02, 0, -0.32);
      PICK_GEO = { heart: new THREE.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1, curveSegments: 5 }) };
      return PICK_GEO;
    }
    function makePick(kind) {
      var g = new THREE.Group();
      if (kind === "heart") {
        mesh(pickGeo().heart, 0xf07a8a, g, 0, 0, -0.08);
        mesh(G.sphS, 0xffd1dc, g, -0.14, 0.1, 0.14, 0.06, 0.05, 0.02);
      } else if (kind === "bone") {
        mesh(G.c6, 0xfff4e3, g, 0, 0, 0, 0.08, 0.52, 0.08).rotation.z = Math.PI / 2;
        for (var sx = -1; sx <= 1; sx += 2) for (var sy = -1; sy <= 1; sy += 2) mesh(G.ico1, 0xfff4e3, g, sx * 0.28, sy * 0.08, 0, 0.12);
        mesh(G.box, 0xe8c9a0, g, 0, -0.05, 0.07, 0.4, 0.02, 0.02);
      } else {
        mesh(G.c12, 0xe0a640, g, 0, 0, 0, 0.21, 0.09, 0.21).rotation.x = Math.PI / 2;
        mesh(G.c12, 0xffcf4d, g, 0, 0, 0.03, 0.17, 0.05, 0.17).rotation.x = Math.PI / 2;
        for (var i = 0; i < 4; i++) mesh(G.box, 0x5e2a16, g, Math.cos(i * 1.7) * 0.1, Math.sin(i * 1.7) * 0.1, 0.07, 0.06, 0.06, 0.04);
      }
      g.name = "pick-" + kind;
      return g;
    }

    return {
      theme: function (name) { var t = themeOf(name); return { sky: t.sky, fog: t.fog, hemiGround: t.hemiGround, groundSide: t.groundSide, groundTop: t.groundTop, wall: t.wall }; },
      buildStage: buildStage, makeMover: makeMover, makeEnemy: makeEnemy, makeWave: makeWave, makePick: makePick,
      THEMES: Object.keys(THEMES), ENEMY_KINDS: Object.keys(MAKERS),
    };
  }

  window.Home3D = { build: build };
})();
