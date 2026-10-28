// @ts-nocheck — 디자인 세션 정본 docs/lab-coco-td-3d.js 를 그대로 옮긴 것(tmp/lab-surv/sync-src.sh).
/* 코코 타워 디펜스 — 맵 3D 렌더러 + 모델 + 아이콘 굽기 (1판, 2026-10-28)
 * 고전 스크립트: window.CocoTD3D = { create(THREE, canvas, Surv3D) } → R
 *   R.resize(cssW, cssH, dpr) · R.setMap(g) · R.sync(g, dt, ui) · R.render() · R.pick(clientX, clientY) → {x, y}
 *   R.stats() → {calls, tris} · R.icon(spec, px) → PNG data URL · R.toScreen(x, y, h) → {x, y} CSS px · R.event(ev)(선택: 시안이 g.events 를 비우기 전에 넘기면 된다)
 * 엔진(docs/lab-defense-engine.js)의 g 를 읽기만 한다. 그리기용 값은 엔진 객체에 _r 로 시작하는 칸을 붙여 둔다(규칙 값은 안 건드린다).
 * 좌표: 타일 1 = 월드 1. 타일 x → three x, 타일 y → three z, 높이 = three y, 바닥 윗면 y = 0. 판 = (0,0)–(9,12).
 * 색은 docs/lab-surv-coco-hd-artdir.md 3절 표의 hex 만 쓴다(아트 디렉션 docs/lab-coco-td-3d-artdir.md).
 */
(function () {
  "use strict";

  // ── 팔레트(HD 3절 표에서 그대로) ─────────────────────────────
  const C = {
    fur0: "#5e2a16", fur1: "#8e4526", fur2: "#b8643a", fur3: "#d98a5a", fur4: "#f2b98a",
    cream0: "#c9a27a", cream1: "#e8c9a0", cream2: "#f6e3c4", cream3: "#fff4e3",
    ink0: "#24161d", ink1: "#3a2228", ink2: "#5a3a42", shine0: "#fff6e8", shine1: "#fffbf4",
    tongue0: "#d9546a", tongue1: "#f07a8a", blush: "#ffb3bd",
    teal0: "#1f8f86", teal1: "#2fb5a8", teal2: "#7fe0d4", purp0: "#6a3fb8", purp1: "#8b5cd6", purp2: "#b99af0",
    flY: "#ffd166", flP: "#ff8fb1", flB: "#8fd3ff", tee0: "#d9d2c6", tee1: "#efe8dc", tee2: "#f8f4ec",
    g0: "#2f7d4a", g1: "#47a35a", g2: "#6cc46a", g3: "#9bdc7c", g4: "#cdeea0",
    p0: "#b98d5e", p1: "#d9b27f", p2: "#ecd3a6", p3: "#f7e8c8", wood0: "#7a4a2a", wood1: "#a8693e",
    br0: "#2a8fa8", br1: "#5ad1e6", br2: "#a8eef8", brS: "#e8f4fb",
    su0: "#9ec9ee", su1: "#cfe8fb", su2: "#eef8ff", suR1: "#b9a6ff", suR2: "#8fe3ff", suR3: "#ffd1f0",
    be0: "#a8742a", be1: "#e0a640", be2: "#ffcf4d", be3: "#ffe9a3", btn0: "#c43a48", btn1: "#ff5d5d",
    va0: "#3b4290", va1: "#4a54b0", va2: "#6c7ae0", va3: "#a3adf5", rub: "#2c2a3a",
    dg0: "#7d8292", dg1: "#a7acba", dg2: "#cfd3dc", dg3: "#eceef3",
    bo0: "#3e4260", bo1: "#5a5f7a", bo2: "#8a90ad", tub0: "#cdd6e4", tub1: "#f3f6fb", cr0: "#9aa6bd", cr1: "#dfe6f2",
    skyAm: "#bfe6ff", skyNoon: "#9fd8ff", dusk0: "#ffb38a", dusk1: "#ff8fa3", eve0: "#3d3a7a", eve1: "#2a2858", lamp: "#ffd36b",
    glow0: "#ffd36b", glow1: "#fff0b8", water: "#7fd4ff", wind: "#e9fbff",
  };

  // 맵 테마(맵 id → 하루의 바깥 공간). 집 안·사람 없음.
  const THEME = {
    dev: { // 아침 공원
      sky: C.skyAm, hemiSky: C.cream3, hemiGround: C.g1, hemi: 1.75, sun: C.shine1, sunI: 1.5,
      tileA: C.g2, tileB: C.g3, under: C.g0, outside: C.g1, pathA: C.p1, pathB: C.p2, pathEdge: C.p0, print: C.p0,
      pad: C.cream2, padRim: C.cream0, props: ["flower", "bush", "flower", "stone", "bush", "flower"], border: "hedge",
    },
    staging: { // 산책길(돌 깐 길)
      sky: C.skyNoon, hemiSky: C.cream3, hemiGround: C.g1, hemi: 1.75, sun: C.shine1, sunI: 1.5,
      tileA: C.g2, tileB: C.g3, under: C.g0, outside: C.g1, pathA: C.p2, pathB: C.p3, pathEdge: C.p0, print: C.p0, stones: true,
      pad: C.cream2, padRim: C.wood1, props: ["bench", "bush", "lamp", "flower", "bush", "stone"], border: "fence",
    },
    prod: { // 미용실 앞(바둑판 마당)
      sky: C.skyNoon, hemiSky: C.cream3, hemiGround: C.tee0, hemi: 1.6, sun: C.shine1, sunI: 1.4,
      tileA: C.tee1, tileB: C.su1, under: C.tee0, outside: C.tee0, pathA: C.dg1, pathB: C.dg2, pathEdge: C.dg0, print: C.dg0,
      pad: C.blush, padRim: C.tongue0, props: ["pot", "bubbles", "pole", "pot", "bubbles"], border: "planter",
    },
    warroom: { // 동네 골목(돌바닥)
      sky: C.dusk0, hemiSky: C.cream3, hemiGround: C.dg1, hemi: 1.6, sun: C.shine0, sunI: 1.4,
      tileA: C.dg2, tileB: C.dg3, under: C.dg0, outside: C.dg1, pathA: C.p1, pathB: C.p0, pathEdge: C.wood1, print: C.wood0,
      pad: C.cream2, padRim: C.cream0, props: ["crate", "pot", "bin", "lamp", "crate", "fencebit"], border: "wall",
    },
    release: { // 저녁 현관 앞(바깥 마당) — 보스
      sky: C.eve1, hemiSky: C.cream3, hemiGround: C.eve0, hemi: 1.45, sun: C.glow1, sunI: 1.15,
      tileA: C.g1, tileB: C.g2, under: C.g0, outside: C.g0, pathA: C.p1, pathB: C.p2, pathEdge: C.p0, print: C.p0, stones: true,
      pad: C.cream2, padRim: C.cream0, props: ["lamp", "flower", "bush", "pot", "lamp", "bush"], border: "hedge", lit: true,
    },
  };

  const GRADE_SIZE = { trivial: 0.40, minor: 0.52, major: 0.66, critical: 0.86, blocker: 1.75 }; // 위에서 본 폭(타일)
  const GRADE_KIND = { trivial: "brush", minor: "suds", major: "bell", critical: "vacuum", blocker: "boss_vacuum" };
  const GRADES = ["trivial", "minor", "major", "critical", "blocker"];
  const GRADE_PITCH = { trivial: -0.35, minor: -0.3, major: -0.95, critical: -0.4, blocker: 0 }; // 높은 카메라에 얼굴이 보이게 뒤로 젖힌다
  const GRADE_CAP = { trivial: 256, minor: 256, major: 160, critical: 96, blocker: 4 };
  const TRAIT_C = { fast: C.suR2, tough: C.bo1, stealth: C.purp1, regen: C.flP, flaky: C.flY };
  const TRAITS = ["fast", "tough", "stealth", "regen", "flaky"];
  const KINDS = ["unit", "lint", "integ", "review", "monitor", "ci"];
  const ACC = { a: C.teal1, b: C.purp1 }; // 갈래 악센트
  const ITEM_KEYS = ["palm", "slipper", "swatter", "paper", "hammer", "spray", "trap", "flamer", "vacuum"];
  const LEGEND_KEYS = ["exterminator", "bugbomb", "bigslipper"];
  const PHASE_C = [C.flB, C.flY, C.btn1]; // 보스 단계 고리: 방패 · 소환 · 되감기

  function create(THREE, canvas, Surv3D) {
    const S3 = Surv3D.build(THREE);
    const V3 = THREE.Vector3, TAU = Math.PI * 2;
    const ENG = typeof window !== "undefined" ? window.TDEngine : null;

    // ── 도형 도우미(정점 색 합치기) ───────────────────────────
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new V3(), _s = new V3(), _c = new THREE.Color();
    const BOX = new THREE.BoxGeometry(1, 1, 1), ICO0 = new THREE.IcosahedronGeometry(1, 0), ICO1 = new THREE.IcosahedronGeometry(1, 1);
    function cyl(rt, rb, h, seg) { return new THREE.CylinderGeometry(rt, rb, h, seg || 10, 1); }
    function ball(w, h) { return new THREE.SphereGeometry(1, w || 8, h || 5); }
    function part(geo, hex, pos, scl, rot) {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      _e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0, "XYZ"); _q.setFromEuler(_e);
      const s = scl == null ? 1 : scl;
      if (typeof s === "number") _s.set(s, s, s); else _s.set(s[0], s[1], s[2]);
      _m.compose(_p.set(pos[0], pos[1], pos[2]), _q, _s); g.applyMatrix4(_m);
      if (g.attributes.uv) g.deleteAttribute("uv");
      const n = g.attributes.position.count, col = new Float32Array(n * 3); _c.set(hex);
      for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      return g;
    }
    function merge(parts) {
      let total = 0;
      for (const g of parts) total += g.attributes.position.count;
      const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
      let o = 0;
      for (const g of parts) {
        const n = g.attributes.position.count;
        pos.set(g.attributes.position.array, o * 3);
        if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
        col.set(g.attributes.color.array, o * 3);
        o += n; g.dispose();
      }
      const out = new THREE.BufferGeometry();
      out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      out.setAttribute("color", new THREE.BufferAttribute(col, 3));
      out.computeBoundingSphere(); out.computeBoundingBox();
      return out;
    }
    // 이미 만든 정점 색 도형을 옮겨 넣기
    function place(geo, pos, scl, rot) {
      const g = geo.clone();
      _e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0, "XYZ"); _q.setFromEuler(_e);
      const s = scl == null ? 1 : scl;
      if (typeof s === "number") _s.set(s, s, s); else _s.set(s[0], s[1], s[2]);
      _m.compose(_p.set(pos[0], pos[1], pos[2]), _q, _s); g.applyMatrix4(_m);
      return g;
    }
    // 코코(공 조립, 재질 여럿) → 한 덩어리 정점 색 도형. 자세를 굳혀 굽는다.
    const _cocoBake = {};
    function cocoGeometry(poseName, poseT) {
      const key = poseName + (poseT || 0);
      if (_cocoBake[key]) return _cocoBake[key];
      const k = S3.makeCoco("harness");
      k.pose(1.7, poseName, poseT == null ? 1 : poseT, { reduce: true });
      k.root.updateMatrixWorld(true);
      const parts = [];
      k.root.traverse((o) => {
        if (!o.isMesh) return;
        let vis = true; for (let p = o; p; p = p.parent) if (!p.visible) vis = false;
        if (!vis) return;
        const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        g.applyMatrix4(o.matrixWorld);
        if (g.attributes.uv) g.deleteAttribute("uv");
        const n = g.attributes.position.count, col = new Float32Array(n * 3), cc = o.material.color;
        for (let i = 0; i < n; i++) { col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; }
        g.setAttribute("color", new THREE.BufferAttribute(col, 3));
        parts.push(g);
      });
      return (_cocoBake[key] = merge(parts));
    }
    function triCount(g) { return (g.index ? g.index.count : g.attributes.position.count) / 3; }

    // ══ 모델 조각 ════════════════════════════════════════════
    function bone(p, hex, knob, x, y, z, len, r, rotY) {
      const c = Math.cos(rotY || 0), s = Math.sin(rotY || 0);
      p.push(part(cyl(r, r, len, 6), hex, [x, y, z], 1, [0, rotY || 0, Math.PI / 2]));
      for (const sx of [1, -1]) for (const sz of [1, -1]) {
        const lx = sx * len * 0.5, lz = sz * r * 0.9;
        p.push(part(ICO0, knob, [x + lx * c + lz * s, y, z - lx * s + lz * c], r * 1.35));
      }
    }
    function chew(p, x, z, h, r, tilt, hex, knot) {
      p.push(part(cyl(r, r * 1.1, h, 6), hex, [x, h / 2, z], 1, [tilt, 0, tilt * 0.6]));
      p.push(part(cyl(r * 1.25, r * 1.25, r * 1.1, 6), knot, [x + Math.sin(tilt * 0.6) * -h * 0.25, h * 0.75, z + Math.sin(tilt) * h * 0.25], 1, [tilt, 0.4, tilt * 0.6]));
      p.push(part(ICO0, knot, [x + Math.sin(tilt * 0.6) * -h * 0.5, h, z + Math.sin(tilt) * h * 0.5], r * 1.4));
    }
    // 받침: 단계 0–2(엔진 level), 갈래면 악센트 띠. 돌아가는 탑이라 둥글다. 돌려주는 값 = 윗면 높이
    function pedestal(p, tier, br) {
      let y = 0;
      if (tier >= 1) { p.push(part(cyl(0.43, 0.45, 0.06, 14), C.cream0, [0, 0.03, 0])); y = 0.06; }
      if (tier >= 2) { p.push(part(cyl(0.40, 0.42, 0.05, 14), C.be1, [0, y + 0.025, 0])); y += 0.05; }
      p.push(part(cyl(0.35, 0.38, 0.09, 12), C.cream1, [0, y + 0.045, 0])); y += 0.09;
      p.push(part(cyl(0.31, 0.35, 0.025, 12), C.cream2, [0, y + 0.012, 0])); y += 0.025;
      if (tier >= 2) for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + TAU / 8; p.push(part(ICO0, C.be2, [Math.cos(a) * 0.4, y - 0.08, Math.sin(a) * 0.4], 0.045)); }
      if (br) {
        p.push(part(cyl(0.37, 0.39, 0.035, 14), ACC[br], [0, y - 0.04, 0]));
        p.push(part(ICO0, ACC[br], [0, y - 0.03, -0.4], [0.09, 0.07, 0.06]));
      }
      return y;
    }

    // 타워 6종 × 모습 5(0·1·2 = level, 3 = 갈래 a, 4 = 갈래 b). +z 가 앞(쏘는 쪽).
    const TOWER_BUILD = {
      unit(look) { // 삑삑이 공 발사대
        const p = [], br = look === 3 ? "a" : look === 4 ? "b" : null, tier = Math.min(look, 2), y = pedestal(p, tier, br), k = 1 + 0.07 * tier;
        p.push(part(cyl(0.22, 0.26, 0.08, 10), C.va1, [0, y + 0.04, 0]));
        const by = y + 0.08;
        p.push(part(BOX, C.flB, [0, by + 0.13 * k, -0.04], [0.34 * k, 0.24 * k, 0.32 * k]));
        p.push(part(BOX, C.br0, [0, by + 0.255 * k, -0.04], [0.30 * k, 0.03, 0.28 * k]));
        const xs = br === "a" ? [-0.12, 0.12] : [0];
        for (const x of xs) {
          p.push(part(cyl(0.095 * k, 0.11 * k, 0.36 * k, 10), C.flB, [x * k, by + 0.15 * k, 0.2 * k], 1, [Math.PI / 2, 0, 0]));
          p.push(part(cyl(0.12 * k, 0.12 * k, 0.05, 10), C.brS, [x * k, by + 0.15 * k, 0.37 * k], 1, [Math.PI / 2, 0, 0]));
          p.push(part(ball(8, 6), C.flP, [x * k, by + 0.15 * k, 0.4 * k], 0.085 * k));
          p.push(part(BOX, C.flY, [x * k, by + 0.15 * k, 0.4 * k], [0.175 * k, 0.04, 0.12 * k], [0, 0, 0.5]));
        }
        if (br === "b") { // 신난 연사: 공 통 + 반짝이
          p.push(part(cyl(0.09, 0.09, 0.3, 8), C.su2, [0, by + 0.38 * k, -0.08], 1));
          p.push(part(ball(7, 5), C.flP, [0, by + 0.33 * k, -0.08], 0.075));
          p.push(part(ball(7, 5), C.flY, [0, by + 0.46 * k, -0.08], 0.075));
          p.push(part(ball(7, 5), C.flP, [0, by + 0.58 * k, -0.08], 0.075));
          for (const a of [0.6, 2.4, 4.3]) p.push(part(ICO0, C.glow0, [Math.cos(a) * 0.3, by + 0.42, Math.sin(a) * 0.3 - 0.05], [0.05, 0.08, 0.05]));
        }
        if (br === "a") p.push(part(BOX, C.teal1, [0, by + 0.27 * k, -0.04], [0.06, 0.04, 0.3 * k]));
        if (tier >= 1) p.push(part(ICO0, C.flY, [0.17 * k, by + 0.2 * k, -0.18 * k], 0.05));
        return p;
      },
      lint(look) { // 개껌 밭(감속)
        const p = [], br = look === 3 ? "a" : look === 4 ? "b" : null, tier = Math.min(look, 2), y = pedestal(p, tier, br);
        p.push(part(cyl(0.31, 0.34, 0.06, 12), C.g0, [0, y + 0.03, 0])); p.push(part(cyl(0.27, 0.29, 0.02, 12), C.fur1, [0, y + 0.065, 0]));
        const yy = y + 0.07, n = 3 + tier + (br ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU + 0.4, r = 0.17;
          const g = [];
          chew(g, Math.cos(a) * r, Math.sin(a) * r, 0.24 + 0.03 * ((i * 7) % 3), 0.05, 0.25 * Math.sin(i * 2.1), C.cream1, C.cream0);
          for (const q of g) { q.translate(0, yy, 0); p.push(q); }
        }
        if (br === "a") { // 왕개껌
          const g = []; chew(g, 0, 0, 0.42, 0.075, 0.05, C.cream2, C.cream0);
          for (const q of g) { q.translate(0, yy, 0); p.push(q); }
        } else {
          const g = []; chew(g, 0, 0, 0.26, 0.045, -0.1, C.cream2, C.cream0);
          for (const q of g) { q.translate(0, yy, 0); p.push(q); }
        }
        if (br === "b") for (let i = 0; i < 6; i++) { // 침 방울
          const a = i * 1.1 + 0.3; p.push(part(ICO0, i % 2 ? C.water : C.su2, [Math.cos(a) * 0.22, yy + 0.12 + (i % 3) * 0.08, Math.sin(a) * 0.22], 0.04 + (i % 2) * 0.015));
        }
        return p;
      },
      integ(look) { // 뼈다귀 투석기(범위)
        const p = [], br = look === 3 ? "a" : look === 4 ? "b" : null, tier = Math.min(look, 2), y = pedestal(p, tier, br), k = 1 + 0.06 * tier;
        const fw = 0.16 * k;
        for (const sx of [1, -1]) {
          p.push(part(BOX, C.wood1, [sx * fw, y + 0.11, 0], [0.05, 0.18, 0.44 * k]));
          p.push(part(BOX, C.wood1, [sx * fw, y + 0.24, -0.04], [0.05, 0.2, 0.06], [0.35, 0, 0]));
          for (const sz of [1, -1]) p.push(part(cyl(0.06, 0.06, 0.04, 8), C.rub, [sx * (fw + 0.04), y + 0.06, sz * 0.15 * k], 1, [0, 0, Math.PI / 2]));
        }
        p.push(part(BOX, C.wood0, [0, y + 0.04, 0], [fw * 2 + 0.05, 0.04, 0.4 * k]));
        p.push(part(cyl(0.025, 0.025, fw * 2 + 0.04, 6), C.wood0, [0, y + 0.3, -0.04], 1, [0, 0, Math.PI / 2]));
        const arms = br === "a" ? [-0.07, 0.07] : [0], big = br === "b" ? 1.6 : 1;
        for (const ax of arms) {
          p.push(part(BOX, C.wood0, [ax, y + 0.3, -0.02], [0.05, 0.05, 0.46 * k], [0.55, 0, 0])); // 팔(뒤로 젖힘)
          p.push(part(cyl(0.08 * big, 0.05 * big, 0.05, 8), C.be1, [ax, y + 0.45 + 0.03 * big, -0.21 * k], 1, [0.55, 0, 0]));
          bone(p, C.cream3, C.cream2, ax, y + 0.5 + 0.04 * big, -0.21 * k, 0.16 * big, 0.026 * big, 0.3);
        }
        if (tier >= 1) p.push(part(BOX, C.be1, [0, y + 0.14, 0.23 * k], [fw * 2 + 0.06, 0.04, 0.04]));
        return p;
      },
      review(look) { // 짖는 코코(저격·관통)
        const p = [], br = look === 3 ? "a" : look === 4 ? "b" : null, tier = Math.min(look, 2), y = pedestal(p, tier, br);
        const s = 0.031 * (1 + 0.06 * tier) * (br ? 1.04 : 1);
        p.push(place(cocoGeometry(br ? "bark" : "sit", br ? 0.12 : 1), [0, y, -0.04], s));
        if (br === "a") { // 큰 소리 멍: 큰 소리 고리 하나
          p.push(part(new THREE.TorusGeometry(0.17, 0.025, 4, 14), C.shine0, [0, y + 0.52, 0.42]));
        } else if (br === "b") { // 연달아 멍멍: 작은 고리 둘
          p.push(part(new THREE.TorusGeometry(0.09, 0.02, 4, 12), C.shine0, [0, y + 0.5, 0.36]));
          p.push(part(new THREE.TorusGeometry(0.12, 0.02, 4, 12), C.shine0, [0, y + 0.5, 0.48]));
        }
        return p;
      },
      monitor(look) { // 킁킁 코(탐지·약화)
        const p = [], br = look === 3 ? "a" : look === 4 ? "b" : null, tier = Math.min(look, 2), y = pedestal(p, tier, br), k = 1 + 0.06 * tier;
        const ph = br === "b" ? 0.52 : 0.22 + 0.04 * tier;
        if (br === "b") { // 높은 데서 망보기: 나무 망루
          for (const sx of [1, -1]) for (const sz of [1, -1]) p.push(part(cyl(0.02, 0.025, ph, 5), C.wood1, [sx * 0.13, y + ph / 2, sz * 0.13]));
          p.push(part(BOX, C.wood0, [0, y + ph, 0], [0.36, 0.04, 0.36]));
          for (let i = 1; i < 3; i++) p.push(part(BOX, C.wood0, [0, y + ph * i / 3, 0.13], [0.26, 0.02, 0.02]));
        } else p.push(part(cyl(0.04, 0.05, ph, 6), C.wood1, [0, y + ph / 2, 0]));
        const hy = y + ph + 0.1 * k;
        p.push(part(cyl(0.11 * k, 0.12 * k, 0.16, 10), C.teal1, [0, hy - 0.06, 0])); // 잠망경 통
        p.push(part(cyl(0.1 * k, 0.1 * k, 0.2 * k, 10), C.teal1, [0, hy + 0.04, 0.08 * k], 1, [Math.PI / 2, 0, 0])); // 앞으로 꺾인 관
        p.push(part(cyl(0.125 * k, 0.125 * k, 0.04, 10), C.teal2, [0, hy + 0.04, 0.19 * k], 1, [Math.PI / 2, 0, 0]));
        p.push(part(ICO1, C.ink0, [0, hy + 0.05, 0.25 * k], [0.13 * k, 0.1 * k, 0.08 * k])); // 큰 까만 코
        p.push(part(ICO0, C.ink2, [0.045 * k, hy + 0.035, 0.32 * k], 0.025)); // 콧구멍
        p.push(part(ICO0, C.ink2, [-0.045 * k, hy + 0.035, 0.32 * k], 0.025));
        p.push(part(ICO0, C.shine1, [-0.04 * k, hy + 0.12 * k, 0.28 * k], 0.028));
        for (const sx of [1, -1]) for (let w = 0; w < 2; w++) p.push(part(BOX, C.cream2, [sx * 0.17 * k, hy + 0.02 + w * 0.04, 0.24 * k], [0.12, 0.012, 0.012], [0, 0, sx * (w ? 0.25 : -0.1)])); // 수염
        if (br === "a") for (let i = 0; i < 4; i++) p.push(part(ICO1, i % 2 ? C.purp2 : C.suR1, [0.06 * Math.sin(i * 2), hy + 0.12 + i * 0.07, 0.3 + i * 0.05], 0.03 + 0.008 * i)); // 냄새 표시
        if (tier >= 1) p.push(part(new THREE.TorusGeometry(0.06, 0.012, 3, 10), C.btn0, [0, hy - 0.09, -0.05], 1, [Math.PI / 2 - 0.3, 0, 0])); // 목줄
        return p;
      },
      ci(look) { // 간식 응원단(지원)
        const p = [], br = look === 3 ? "a" : look === 4 ? "b" : null, tier = Math.min(look, 2), y = pedestal(p, tier, br), k = 1 + 0.06 * tier;
        p.push(part(cyl(0.22 * k, 0.17 * k, 0.17, 10), C.flP, [0, y + 0.085, 0]));
        p.push(part(new THREE.TorusGeometry(0.22 * k, 0.03, 4, 12), C.blush, [0, y + 0.17, 0], 1, [Math.PI / 2, 0, 0]));
        for (let i = 0; i < 3; i++) p.push(part(BOX, C.tongue1, [0, y + 0.08, 0], [0.45 * k, 0.015, 0.03], [0, i * 1.05, 0]));
        const n = br === "a" ? 6 : 3;
        for (let i = 0; i < n; i++) {
          const a = i * 2.2, r = i < 3 ? 0.08 : 0.04, yy = y + 0.2 + (i < 3 ? 0 : 0.07) + (i === 5 ? 0.06 : 0);
          bone(p, C.cream3, C.cream2, Math.cos(a) * r, yy, Math.sin(a) * r, 0.14, 0.022, a);
        }
        for (const sx of [1, -1]) { // 응원 술
          p.push(part(cyl(0.012, 0.012, 0.22, 4), C.wood0, [sx * 0.2 * k, y + 0.24, 0], 1, [0, 0, -sx * 0.5]));
          p.push(part(ICO1, sx > 0 ? C.flY : C.flP, [sx * 0.29 * k, y + 0.36, 0], 0.085));
          p.push(part(ICO0, sx > 0 ? C.be2 : C.blush, [sx * 0.32 * k, y + 0.42, 0.03], 0.05));
        }
        if (br === "b") { // 칭찬 쓰담: 하트
          p.push(part(cyl(0.012, 0.012, 0.22, 4), C.wood0, [0, y + 0.3, -0.08]));
          heart(p, 0, y + 0.47, -0.08, 0.09, C.tongue1);
        }
        return p;
      },
    };
    function heart(p, x, y, z, s, hex) {
      p.push(part(ball(7, 5), hex, [x - s * 0.5, y + s * 0.25, z], s * 0.62));
      p.push(part(ball(7, 5), hex, [x + s * 0.5, y + s * 0.25, z], s * 0.62));
      p.push(part(new THREE.ConeGeometry(s * 1.05, s * 1.3, 8), hex, [x, y - s * 0.45, z], 1, [Math.PI, 0, 0]));
    }
    const towerGeo = {};
    for (const k of KINDS) for (let l = 0; l < 5; l++) towerGeo[k + l] = merge(TOWER_BUILD[k](l));

    // 적: 코코의 하루 모델 재사용, 등급 크기로 맞춘다
    const EN = {};
    for (const gr of GRADES) {
      const eg = S3.enemyGeometry(GRADE_KIND[gr]), bb = eg.geometry.boundingBox;
      const w = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z), s = GRADE_SIZE[gr] / w;
      EN[gr] = { geo: eg.geometry, s, h: eg.height * s };
    }

    // 밥그릇·아이템·전설 모델
    function bowlParts(full) {
      const p = [];
      p.push(part(cyl(0.36, 0.27, 0.17, 16), C.flP, [0, 0.085, 0]));
      p.push(part(new THREE.TorusGeometry(0.35, 0.035, 4, 16), C.blush, [0, 0.17, 0], 1, [Math.PI / 2, 0, 0]));
      p.push(part(cyl(0.31, 0.31, 0.02, 16), C.tongue0, [0, 0.15, 0]));
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; p.push(part(ICO0, C.blush, [Math.cos(a) * 0.33, 0.09, Math.sin(a) * 0.33], 0.04)); }
      if (full) { p.push(part(ball(10, 5), C.fur1, [0, 0.17, 0], [0.29, 0.1, 0.29])); for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.08 + (i % 3) * 0.06; p.push(part(ICO0, i % 2 ? C.fur2 : C.fur0, [Math.cos(a) * r, 0.24, Math.sin(a) * r], 0.04)); } }
      return p;
    }
    const ITEM_BUILD = {
      palm() { const p = [part(cyl(0.34, 0.34, 0.05, 14), C.cream2, [0, 0.025, 0])]; p.push(part(ball(8, 4), C.fur1, [0, 0.06, 0.06], [0.14, 0.04, 0.12])); for (let i = 0; i < 4; i++) { const a = -0.9 + i * 0.6; p.push(part(ball(6, 4), C.fur1, [Math.sin(a) * 0.19, 0.06, -Math.cos(a) * 0.17 + 0.02], [0.055, 0.035, 0.065])); } return p; },
      slipper() { const p = []; const cs = [C.fur2, C.fur3, C.fur3, C.fur4, C.cream2]; for (let i = 0; i < 5; i++) { const a = i * 0.5; p.push(part(ICO1, cs[i], [Math.sin(a) * 0.2 - 0.1, 0.12 + i * 0.05, -Math.cos(a) * 0.18 + 0.1], 0.11 - i * 0.008)); } return p; },
      swatter() { return [place(S3.projGeometry("ball").geometry, [0, 0, 0], 0.075)]; },
      paper() { const p = []; for (let i = 0; i < 3; i++) p.push(part(new THREE.TorusGeometry(0.12 + i * 0.09, 0.025, 4, 18, Math.PI * 1.1), i === 1 ? C.flY : C.cream3, [0, 0.12, -0.08], 1, [-Math.PI / 2, 0, Math.PI * 0.95])); p.push(part(ICO1, C.cream3, [0, 0.12, -0.12], 0.06)); return p; },
      hammer() { const p = []; bone(p, C.cream3, C.cream2, 0, 0.12, 0, 0.42, 0.065, 0.5); return p; },
      spray() { const p = [part(cyl(0.38, 0.38, 0.02, 14), C.water, [0.05, 0.01, 0.05])]; p.push(part(cyl(0.2, 0.15, 0.13, 12), C.flB, [-0.14, 0.13, -0.12], 1, [0.9, 0, 0.5])); p.push(part(ICO0, C.su2, [0.18, 0.04, 0.2], 0.05)); p.push(part(ICO0, C.su2, [0.25, 0.04, -0.05], 0.035)); return p; },
      trap() { const p = [part(new THREE.TorusGeometry(0.13, 0.03, 4, 14), C.teal1, [-0.18, 0.04, -0.15], 1, [Math.PI / 2, 0, 0])]; for (let i = 0; i < 6; i++) p.push(part(BOX, C.teal0, [-0.05 + i * 0.06, 0.04, -0.05 + Math.sin(i) * 0.05 + i * 0.03], [0.07, 0.03, 0.04], [0, -0.5, 0])); p.push(part(BOX, C.cr0, [0.3, 0.05, 0.14], [0.08, 0.05, 0.06])); p.push(part(new THREE.TorusGeometry(0.035, 0.012, 3, 8), C.cr1, [0.35, 0.05, 0.17], 1, [Math.PI / 2, 0, 0])); return p; },
      flamer() { const p = [part(BOX, C.p2, [0, 0.01, -0.12], [0.75, 0.02, 0.2])]; p.push(place(cocoGeometry("scoot", 1), [0.12, 0, 0], 0.024, [0, Math.PI / 2, 0])); for (let i = 0; i < 4; i++) p.push(part(ICO0, C.p1, [-0.32 + i * 0.08, 0.04 + (i % 2) * 0.03, -0.12], 0.03 + i * 0.006)); return p; },
      vacuum() { const p = []; for (let i = 0; i < 3; i++) { p.push(part(BOX, i % 2 ? C.tee2 : C.teal2, [0, 0.04 + i * 0.07, 0], [0.56 - i * 0.04, 0.065, 0.42 - i * 0.03])); } p.push(part(BOX, C.teal1, [0, 0.21, 0], [0.5, 0.02, 0.06])); return p; },
    };
    const LEGEND_BUILD = {
      exterminator() { // 칭찬 스티커
        const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? 0.14 : 0.32; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
        const ex = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false });
        const p = [part(cyl(0.38, 0.38, 0.03, 16), C.be1, [0, 0.015, 0]), part(ex, C.flY, [0, 0.03, 0], 1, [-Math.PI / 2, 0, 0])];
        p.push(part(ICO0, C.shine1, [-0.08, 0.1, -0.08], 0.04)); p.push(part(ICO0, C.ink0, [0.05, 0.1, -0.02], 0.025)); p.push(part(ICO0, C.ink0, [-0.05, 0.1, -0.02], 0.025));
        p.push(part(ball(6, 3), C.tongue1, [0, 0.1, 0.06], [0.05, 0.015, 0.03]));
        return p;
      },
      bugbomb() { // 간식 봉지 폭탄
        const p = [part(cyl(0.18, 0.25, 0.36, 8), C.cream2, [0, 0.18, 0]), part(cyl(0.06, 0.14, 0.08, 8), C.cream1, [0, 0.4, 0]), part(new THREE.TorusGeometry(0.06, 0.02, 3, 8), C.btn0, [0, 0.38, 0], 1, [Math.PI / 2, 0, 0])];
        bone(p, C.fur3, C.fur2, 0, 0.18, 0.22, 0.14, 0.03, 0);
        p.push(part(cyl(0.012, 0.012, 0.12, 4), C.ink2, [0.03, 0.49, 0], 1, [0, 0, -0.4]));
        p.push(part(ICO0, C.glow0, [0.06, 0.56, 0], 0.05)); p.push(part(ICO0, C.glow1, [0.06, 0.56, 0], 0.03));
        return p;
      },
      bigslipper() { // 하늘에서 떨어지는 큰 쿠션
        const p = [part(ball(10, 6), C.purp1, [0, 0.12, 0], [0.36, 0.11, 0.36]), part(BOX, C.purp2, [0, 0.12, 0], [0.5, 0.12, 0.5])];
        p.push(part(ICO0, C.flY, [0, 0.24, 0], 0.045));
        for (const sx of [1, -1]) for (const sz of [1, -1]) p.push(part(new THREE.ConeGeometry(0.04, 0.12, 5), C.flY, [sx * 0.27, 0.1, sz * 0.27], 1, [sz * 0.6, 0, -sx * 0.6]));
        return p;
      },
    };
    const itemGeo = {}, legendGeo = {};
    for (const k of ITEM_KEYS) itemGeo[k] = merge(ITEM_BUILD[k]());
    for (const k of LEGEND_KEYS) legendGeo[k] = merge(LEGEND_BUILD[k]());
    const bowlGeo = merge(bowlParts(false)), bowlFullGeo = merge(bowlParts(true));

    // 작은 조각(인스턴스용)
    const kibbleGeo = merge([part(ball(8, 5), C.fur1, [0, 0, 0], [1, 0.7, 1])]);
    const ballGeo = S3.projGeometry("ball").geometry;
    const boneGeo = (() => { const p = []; bone(p, C.cream3, C.cream2, 0, 0, 0, 0.2, 0.035, 0); return merge(p); })();
    const puffGeo = merge([part(ICO1, C.shine0, [0, 0, 0], 1), part(ICO0, C.su2, [0.6, 0.2, 0.1], 0.6), part(ICO0, C.su1, [-0.5, 0.1, 0.3], 0.55)]);
    const heartGeo = (() => { const p = []; heart(p, 0, 0, 0, 1, C.flP); return merge(p); })();
    const sparkGeo = merge([part(new THREE.OctahedronGeometry(1, 0), C.flY, [0, 0, 0], [0.45, 1, 0.45]), part(new THREE.OctahedronGeometry(1, 0), C.flY, [0, 0, 0], [1, 0.45, 0.45])]);
    const capGeo = merge([part(new THREE.SphereGeometry(1, 8, 4, 0, TAU, 0, Math.PI / 2), C.bo1, [0, 0, 0], [1, 0.6, 1]), part(cyl(1.05, 1.05, 0.12, 8), C.bo2, [0, 0.03, 0])]);
    const streakGeo = merge([part(new THREE.CapsuleGeometry(0.15, 1, 1, 4), C.wind, [0, 0, 0], 1, [Math.PI / 2, 0, 0])]);
    const pipGeo = merge([part(ICO0, C.shine1, [0, 0, 0], 1)]);
    const cloudGeo = merge([part(ICO1, C.dg2, [0, 0, 0], 1), part(ICO1, C.dg1, [0.8, -0.1, 0.1], 0.7), part(ICO1, C.dg3, [-0.75, -0.1, 0], 0.7)]);
    const ringFlat = (ri, ro, seg) => new THREE.RingGeometry(ri, ro, seg || 48).rotateX(-Math.PI / 2);
    const discFlat = (seg) => new THREE.CircleGeometry(1, seg || 40).rotateX(-Math.PI / 2);

    // ══ 렌더러·장면 ══════════════════════════════════════════
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const TILT = 70 * Math.PI / 180, TARGET = new V3(4.5, 0, 5.82);
    const cam = new THREE.OrthographicCamera(-4.55, 4.55, 6.07, -6.07, 0.1, 80);
    cam.position.set(TARGET.x, TARGET.y + Math.sin(TILT) * 30, TARGET.z + Math.cos(TILT) * 30);
    cam.lookAt(TARGET);
    const hemi = new THREE.HemisphereLight(C.cream3, C.g1, 1.75), sun = new THREE.DirectionalLight(C.shine1, 1.5);
    sun.position.set(-3, 10, -2); sun.target.position.set(4.5, 0, 6);
    scene.add(hemi, sun, sun.target);

    const vmat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    const ghostMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.36, depthWrite: false });
    const previewMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.6, depthWrite: false });
    const basic = (hex, op, top) => new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: op, depthWrite: false, depthTest: !top, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const instBasic = (op) => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const blobMat = new THREE.MeshBasicMaterial({ map: S3.blobTexture(), transparent: true, depthWrite: false });

    function IM(geo, mat, cap, order) {
      const m = new THREE.InstancedMesh(geo, mat, cap);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false; m.count = 0; m.visible = false;
      for (let i = 0; i < cap; i++) m.setColorAt(i, WHITE);
      m.instanceColor.setUsage(THREE.DynamicDrawUsage);
      if (order != null) m.renderOrder = order;
      m.userData.cap = cap;
      scene.add(m); return m;
    }
    const WHITE = new THREE.Color(1, 1, 1);
    function begin(m) { m.count = 0; }
    function end(m) { m.visible = m.count > 0; if (m.count) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; } }
    function put(m, x, y, z, yaw, sx, sy, sz, col, pitch) {
      const i = m.count; if (i >= m.userData.cap) return -1;
      _e.set(pitch || 0, yaw, 0, "YXZ"); _q.setFromEuler(_e);
      _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
      m.setMatrixAt(i, _m);
      m.setColorAt(i, col || WHITE);
      m.count = i + 1; return i;
    }
    function putQ(m, x, y, z, q, sx, sy, sz, col) {
      const i = m.count; if (i >= m.userData.cap) return -1;
      _m.compose(_p.set(x, y, z), q, _s.set(sx, sy, sz));
      m.setMatrixAt(i, _m); m.setColorAt(i, col || WHITE);
      m.count = i + 1; return i;
    }

    // 판(정적) — setMap 에서 만든다
    let boardMesh = null, lampMesh = null, mapId = null, theme = THEME.dev;
    const lampMat = new THREE.MeshLambertMaterial({ color: C.lamp, emissive: C.lamp, emissiveIntensity: 0.9, flatShading: true });
    // 밥그릇
    const bowl = new THREE.Mesh(bowlGeo, vmat); scene.add(bowl);
    const kibbles = IM(kibbleGeo, vmat, 16);
    // 아래쪽 받침 그림자
    const blobs = IM(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), blobMat, 480, 1);
    // 배치 칸 강조·고른 칸·사거리
    const slotGlow = IM(ringFlat(0.3, 0.38, 28), instBasic(0.95), 64, 3);
    const selFrame = new THREE.Mesh(ringFlat(0.6, 0.7, 4).rotateY(Math.PI / 4), basic(C.shine1, 1, true)); selFrame.renderOrder = 20; scene.add(selFrame);
    const selFill = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), basic(C.shine1, 0.28)); selFill.renderOrder = 2; scene.add(selFill);
    const rangeFill = new THREE.Mesh(discFlat(64), basic(C.flB, 0.2)); rangeFill.renderOrder = 4; scene.add(rangeFill);
    const rangeDark = new THREE.Mesh(ringFlat(0.97, 1.0, 96), basic(C.ink1, 0.55, true)); rangeDark.renderOrder = 21; scene.add(rangeDark);
    const rangeLine = new THREE.Mesh(ringFlat(0.97, 1.0, 96), basic(C.shine1, 1, true)); rangeLine.renderOrder = 22; scene.add(rangeLine);
    const aimFill = new THREE.Mesh(discFlat(48), basic(C.flY, 0.22)); aimFill.renderOrder = 4; scene.add(aimFill);
    const aimLine = new THREE.Mesh(ringFlat(0.96, 1.0, 64), basic(C.be2, 1, true)); aimLine.renderOrder = 22; scene.add(aimLine);
    const aimRow = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.2).rotateX(-Math.PI / 2), basic(C.flY, 0.24)); aimRow.renderOrder = 4; scene.add(aimRow);
    const ghost = new THREE.Mesh(towerGeo.unit0, previewMat); ghost.renderOrder = 6; scene.add(ghost);
    const ringGeoCache = new Map();
    function ringGeo(r, w) { // 두께가 화면에서 일정하도록 반지름별로 굽는다
      const k = Math.round(r * 100) + ":" + w; let g = ringGeoCache.get(k);
      if (!g) { g = ringFlat(r - w, r, Math.max(48, Math.round(r * 40))); ringGeoCache.set(k, g); }
      return g;
    }

    // 타워
    const towerIM = {}, towerList = [];
    for (const k of KINDS) for (let l = 0; l < 5; l++) towerList.push(towerIM[k + l] = IM(towerGeo[k + l], vmat, 48));
    const auraIM = IM(discFlat(40), instBasic(0.16), 48, 3); // 개껌 밭 감속 장판
    const boostIM = IM(ringFlat(0.36, 0.44, 24), instBasic(0.85), 48, 3); // 응원 받는 타워 발밑 고리
    const cloudIM = IM(cloudGeo, vmat, 24); // 꺼진 타워 위 회색 구름
    const reticle = new THREE.Mesh(ringFlat(0.42, 0.52, 4).rotateY(Math.PI / 4), basic(C.btn1, 1, true)); reticle.renderOrder = 23; scene.add(reticle);

    // 적
    const enIM = {}, enGhostIM = {};
    for (const gr of GRADES) { enIM[gr] = IM(EN[gr].geo, vmat, GRADE_CAP[gr]); enGhostIM[gr] = IM(EN[gr].geo, ghostMat, GRADE_CAP[gr], 7); }
    const traitRing = IM(ringFlat(0.8, 1.0, 24), instBasic(0.95), 640, 3);
    const capIM = IM(capGeo, vmat, 256), heartIM = IM(heartGeo, vmat, 256), sparkIM = IM(sparkGeo, vmat, 256), streakIM = IM(streakGeo, vmat, 512);
    const barBg = IM(new THREE.PlaneGeometry(1, 1), instBasic(0.85), 128, 30), barFg = IM(new THREE.PlaneGeometry(1, 1), instBasic(1), 128, 31);
    barBg.material.depthTest = false; barFg.material.depthTest = false;
    const pipIM = IM(pipGeo, vmat, 24), phaseRing = IM(ringFlat(0.9, 1.0, 48), instBasic(0.9), 4, 3);

    // 탄·폭발·장판
    const ballIM = IM(ballGeo, vmat, 96), boneIM = IM(boneGeo, vmat, 64);
    const beamIM = IM(new THREE.BoxGeometry(1, 1, 1), instBasic(0.9), 32, 9), barkIM = IM(new THREE.TorusGeometry(1, 0.08, 3, 20), instBasic(0.85), 48, 9);
    const boomIM = IM(ringFlat(0.86, 1.0, 40), instBasic(0.85), 48, 8), puffIM = IM(puffGeo, vmat, 96);
    const zoneIM = IM(discFlat(40), instBasic(0.32), 32, 3), zoneRimIM = IM(merge([part(new THREE.TorusGeometry(1, 0.035, 3, 40), C.shine1, [0, 0, 0], 1, [Math.PI / 2, 0, 0])]), vmat, 32);
    const itemMesh = {}, itemList = [];
    for (const k of ITEM_KEYS) { const m = new THREE.Mesh(itemGeo[k], vmat); m.visible = false; scene.add(m); itemMesh[k] = m; itemList.push(m); }
    const cushion = new THREE.Mesh(legendGeo.bigslipper, vmat); cushion.visible = false; scene.add(cushion);
    // 사건 연출 풀(할당 없이 돌려 쓴다)
    const POOL = 64, pool = [];
    for (let i = 0; i < POOL; i++) pool.push({ k: 0, kind: "", x: 0, y: 0, r: 0, t: 0, max: 0, c: null });
    let poolAt = 0;
    const K_PUFF = 1, K_ITEM = 2, K_SLIP = 3, K_SPARK = 4, K_LEAK = 5, K_PHASE = 6;
    function emit(k, x, y, r, max, kind, c) { const o = pool[poolAt]; poolAt = (poolAt + 1) % POOL; o.k = k; o.x = x; o.y = y; o.r = r; o.t = 0; o.max = max; o.kind = kind || ""; o.c = c || null; }
    const gradeCol = {}; for (const gr of GRADES) gradeCol[gr] = new THREE.Color(1, 1, 1);
    const colTmp = new THREE.Color(), colTrait = {}; for (const t of TRAITS) colTrait[t] = new THREE.Color(TRAIT_C[t]);
    const colFlash = new THREE.Color(2.4, 2.3, 2.1), colDim = new THREE.Color(0.42, 0.42, 0.5), colBg = new THREE.Color(C.ink1), colOk = new THREE.Color(C.g2), colLow = new THREE.Color(C.btn1);
    const colAura = new THREE.Color(C.cream1), colBoost = new THREE.Color(C.flY), colSlot = new THREE.Color(C.teal2), colBeam = new THREE.Color(C.shine1);
    const colBoom = new THREE.Color(C.cream3), colZone = { spray: new THREE.Color(C.water), trap: new THREE.Color(C.purp1), bugbomb: new THREE.Color(C.flY) }, colRim = { spray: new THREE.Color(C.flB), trap: new THREE.Color(C.teal1), bugbomb: new THREE.Color(C.fur3) };
    const colPhase = PHASE_C.map((h) => new THREE.Color(h)), colShield = new THREE.Color(C.flB), colStar = new THREE.Color(C.be2), colRed = new THREE.Color(C.btn1);
    const camQ = new THREE.Quaternion();

    // ══ 판 만들기 ════════════════════════════════════════════
    function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    const PROP = {
      flower(p, x, z, R) { const cs = [C.flP, C.flY, C.flB, C.purp2]; for (let k = 0; k < 2; k++) { const fx = x + (R() - 0.5) * 0.5, fz = z + (R() - 0.5) * 0.5, c = cs[(R() * 4) | 0]; p.push(part(cyl(0.012, 0.012, 0.12, 3), C.g0, [fx, 0.06, fz])); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; p.push(part(ICO0, c, [fx + Math.cos(a) * 0.05, 0.13, fz + Math.sin(a) * 0.05], [0.04, 0.02, 0.04])); } p.push(part(ICO0, C.be2, [fx, 0.14, fz], 0.025)); } },
      bush(p, x, z, R) { const n = 2 + ((R() * 2) | 0); for (let i = 0; i < n; i++) p.push(part(ICO1, i % 2 ? C.g0 : C.g1, [x + (R() - 0.5) * 0.4, 0.12, z + (R() - 0.5) * 0.4], 0.14 + R() * 0.08)); p.push(part(ICO0, C.flP, [x, 0.27, z], 0.03)); },
      stone(p, x, z, R) { p.push(part(ICO0, C.dg2, [x + (R() - 0.5) * 0.3, 0.04, z], [0.13, 0.07, 0.1], [0, R() * 3, 0])); p.push(part(ICO0, C.dg1, [x + 0.15, 0.03, z + 0.15], [0.07, 0.05, 0.06])); },
      bench(p, x, z) { p.push(part(BOX, C.wood1, [x, 0.17, z], [0.7, 0.04, 0.24])); p.push(part(BOX, C.wood1, [x, 0.3, z - 0.11], [0.7, 0.14, 0.03])); for (const sx of [1, -1]) p.push(part(BOX, C.wood0, [x + sx * 0.28, 0.08, z], [0.05, 0.16, 0.2])); },
      lamp(p, x, z, R, lamps) { p.push(part(cyl(0.035, 0.05, 0.5, 6), C.bo1, [x, 0.25, z])); p.push(part(cyl(0.09, 0.07, 0.03, 6), C.bo0, [x, 0.52, z])); lamps.push(part(ICO1, C.lamp, [x, 0.58, z], 0.075)); },
      pot(p, x, z, R) { p.push(part(cyl(0.13, 0.1, 0.16, 8), R() < 0.5 ? C.fur2 : C.tub0, [x, 0.08, z])); p.push(part(ICO1, C.g1, [x, 0.22, z], 0.12)); p.push(part(ICO0, R() < 0.5 ? C.flP : C.flY, [x + 0.05, 0.31, z], 0.04)); },
      bubbles(p, x, z, R) { for (let i = 0; i < 4; i++) p.push(part(ICO1, [C.su1, C.su2, C.suR3, C.su0][i], [x + (R() - 0.5) * 0.5, 0.06 + R() * 0.12, z + (R() - 0.5) * 0.5], 0.05 + R() * 0.06)); },
      pole(p, x, z) { p.push(part(cyl(0.08, 0.1, 0.06, 8), C.cr0, [x, 0.03, z])); for (let i = 0; i < 4; i++) p.push(part(cyl(0.055, 0.055, 0.1, 8), i % 2 ? C.tee2 : C.purp1, [x, 0.11 + i * 0.1, z])); p.push(part(ICO1, C.cr1, [x, 0.5, z], 0.07)); },
      crate(p, x, z, R) { p.push(part(BOX, C.wood1, [x, 0.1, z], [0.3, 0.2, 0.3], [0, R() * 0.6, 0])); p.push(part(BOX, C.wood0, [x, 0.2, z], [0.32, 0.02, 0.06], [0, R() * 0.6, 0])); },
      bin(p, x, z) { p.push(part(cyl(0.12, 0.1, 0.28, 8), C.teal0, [x, 0.14, z])); p.push(part(cyl(0.13, 0.13, 0.03, 8), C.teal1, [x, 0.29, z])); },
      fencebit(p, x, z) { for (let i = -1; i <= 1; i++) p.push(part(BOX, C.wood1, [x + i * 0.16, 0.13, z], [0.06, 0.26, 0.04])); p.push(part(BOX, C.wood0, [x, 0.18, z], [0.42, 0.04, 0.03])); },
    };
    function border(p, kind, R) {
      // 판 밖(위·아래 띠): 생울타리·낮은 울타리·화단·담
      for (const z of [-0.45, 12.45]) for (let x = -0.5; x < 10; x += 0.5) {
        if (kind === "hedge") p.push(part(ICO1, (x * 2) % 2 ? C.g0 : C.g1, [x, 0.12, z], [0.32, 0.2, 0.3]));
        else if (kind === "fence") { p.push(part(BOX, C.wood1, [x, 0.12, z], [0.06, 0.24, 0.05])); p.push(part(BOX, C.wood0, [x + 0.25, 0.16, z], [0.5, 0.04, 0.03])); }
        else if (kind === "planter") { p.push(part(BOX, C.tub0, [x, 0.07, z], [0.48, 0.14, 0.3])); p.push(part(ICO0, R() < 0.5 ? C.flP : C.g1, [x, 0.17, z], 0.1)); }
        else { p.push(part(BOX, (x * 2) % 2 ? C.dg1 : C.dg0, [x, 0.12, z], [0.48, 0.24, 0.3])); }
      }
    }

    function setMap(g) {
      const map = g.map; mapId = map.id; theme = THEME[mapId] || THEME.dev;
      scene.background = new THREE.Color(theme.sky);
      hemi.color.set(theme.hemiSky); hemi.groundColor.set(theme.hemiGround); hemi.intensity = theme.hemi;
      sun.color.set(theme.sun); sun.intensity = theme.sunI;
      if (boardMesh) { scene.remove(boardMesh); boardMesh.geometry.dispose(); }
      if (lampMesh) { scene.remove(lampMesh); lampMesh.geometry.dispose(); lampMesh = null; }
      const R = rng(0x5eed + map.id.length * 977 + map.lanes.length * 31);
      const path = ENG ? ENG.pathTiles(map) : new Set();
      const slots = g.slots || (ENG ? ENG.slotsOf(map) : []);
      const slotSet = new Set(slots.map((s) => s[0] + "," + s[1]));
      const decoSet = new Set(map.deco.map((d) => d[0] + "," + d[1]));
      const p = [], lamps = [];
      p.push(part(BOX, theme.outside, [4.5, -0.11, 6], [14, 0.1, 18]));
      p.push(part(BOX, theme.under, [4.5, -0.07, 6], [9.0, 0.06, 12.0]));
      border(p, theme.border, R);
      // 바닥 칸: 칸 사이 틈으로 격자가 보인다. 길은 틈 없이 이어진다.
      for (let y = 0; y < 12; y++) for (let x = 0; x < 9; x++) {
        const k = x + "," + y;
        if (path.has(k)) {
          p.push(part(BOX, (x + y) % 2 ? theme.pathA : theme.pathB, [x + 0.5, -0.045, y + 0.5], [1.0, 0.05, 1.0]));
          if (theme.stones) for (let i = 0; i < 2; i++) p.push(part(cyl(0.16, 0.18, 0.02, 7), theme.pathB === C.p3 ? C.p3 : C.p2, [x + 0.3 + i * 0.4, -0.015, y + 0.3 + ((x + i) % 2) * 0.4], 1, [0, R() * 3, 0]));
        } else {
          p.push(part(BOX, (x + y) % 2 ? theme.tileA : theme.tileB, [x + 0.5, -0.04, y + 0.5], [0.94, 0.08, 0.94]));
        }
      }
      // 길 가장자리(길이 아닌 이웃 쪽에 낮은 턱)
      for (const k of path) {
        const [x, y] = k.split(",").map(Number);
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dx, dy] of nb) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx > 8 || ny < 0 || ny > 11 || path.has(nx + "," + ny)) continue;
          p.push(part(BOX, theme.pathEdge, [x + 0.5 + dx * 0.48, -0.01, y + 0.5 + dy * 0.48], [dx ? 0.04 : 1.0, 0.03, dy ? 0.04 : 1.0]));
        }
      }
      // 발자국(진행 방향): 길을 따라 한 칸에 하나, 좌우 번갈아
      for (const lane of g.lanes) {
        let n = 0;
        for (let d = 0.5; d < lane.total; d += 0.9, n++) {
          const pt = ENG.posAt(lane, d), pt2 = ENG.posAt(lane, d + 0.05);
          const x = pt[0], z = pt[1]; if (x < 0.2 || x > 8.8 || z < 0.2 || z > 11.8) continue;
          const dx = pt2[0] - x, dz = pt2[1] - z, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, side = n % 2 ? 0.12 : -0.12;
          const cx = x - uz * side, cz = z + ux * side, yaw = Math.atan2(ux, uz);
          p.push(part(ball(7, 3), theme.print, [cx, -0.012, cz], [0.085, 0.012, 0.075], [0, yaw, 0]));
          for (let i = 0; i < 4; i++) { const a = yaw + (i - 1.5) * 0.48; p.push(part(ball(6, 3), theme.print, [cx + Math.sin(a) * 0.125, -0.012, cz + Math.cos(a) * 0.125], [0.036, 0.01, 0.042], [0, a, 0])); }
        }
      }
      // 시작점: 길이 판에 들어오는 칸 가장자리에 작은 나무 문
      for (const lane of map.lanes) {
        const [x0, y0] = lane[0], [x1, y1] = lane[1], dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
        const ex = x0 + dx + 0.5 - dx * 0.5, ez = y0 + dy + 0.5 - dy * 0.5; // 판 가장자리
        const px = dy ? 1 : 0, pz = dx ? 1 : 0;
        for (const s of [1, -1]) p.push(part(cyl(0.045, 0.055, 0.42, 6), C.wood1, [ex + px * s * 0.46, 0.21, ez + pz * s * 0.46]));
        p.push(part(BOX, C.wood0, [ex, 0.42, ez], [px ? 1.0 : 0.07, 0.07, pz ? 1.0 : 0.07]));
        p.push(part(ICO0, C.flY, [ex, 0.48, ez], 0.05));
      }
      // 배치 칸 받침(둥근 방석)
      for (const [x, y] of slots) {
        p.push(part(cyl(0.36, 0.37, 0.025, 20), theme.padRim, [x + 0.5, 0.004, y + 0.5]));
        p.push(part(cyl(0.32, 0.34, 0.03, 20), theme.pad, [x + 0.5, 0.02, y + 0.5]));
      }
      // 밥그릇 자리
      const last = map.lanes[0][map.lanes[0].length - 1];
      const bx = Math.min(8.5, Math.max(0.5, last[0] + 0.5)), bz = Math.min(11.55, Math.max(0.45, last[1] + 0.5));
      bowl.position.set(bx, 0, bz); bowl.userData.x = bx; bowl.userData.z = bz;
      p.push(part(cyl(0.48, 0.48, 0.015, 20), C.purp1, [bx, 0.006, bz]));
      p.push(part(cyl(0.44, 0.44, 0.018, 20), C.purp2, [bx, 0.01, bz]));
      // 보스 맵: 가운데 큰 매트 + 등불 둘(deco 칸)
      if (map.deco.length && map.boss) {
        p.push(part(cyl(0.95, 0.95, 0.012, 28), C.purp0, [bx, 0.004, bz]));
        for (const [x, y] of map.deco) { if (y === last[1]) { PROP.lamp(p, x + 0.5, y + 0.5, R, lamps); p.push(part(cyl(0.16, 0.2, 0.06, 8), C.bo0, [x + 0.5, 0.03, y + 0.5])); } else PROP.pot(p, x + 0.5, y + 0.5, R); }
      }
      // 소품: 길·배치 칸·deco 가 아닌 칸
      for (let y = 0; y < 12; y++) for (let x = 0; x < 9; x++) {
        const k = x + "," + y; if (path.has(k) || slotSet.has(k) || decoSet.has(k)) continue;
        if (R() < 0.3) continue;
        const kind = theme.props[(R() * theme.props.length) | 0];
        PROP[kind](p, x + 0.5, y + 0.5, R, lamps);
      }
      boardMesh = new THREE.Mesh(merge(p), vmat); boardMesh.renderOrder = 0; scene.add(boardMesh);
      if (lamps.length) { lampMesh = new THREE.Mesh(merge(lamps), theme.lit ? lampMat : vmat); scene.add(lampMesh); }
      lampMat.emissiveIntensity = theme.lit ? 1.0 : 0.0;
    }

    // ══ 매 프레임 ════════════════════════════════════════════
    let clock = 0, bowlShake = 0, lastGate = 100;
    const segDir = [0, 1];
    function laneDir(lane, d) {
      const segs = lane.segs;
      for (let i = 0; i < segs.length; i++) { const s = segs[i]; if (d <= s.at + s.len || i === segs.length - 1) { const L = s.len || 1; segDir[0] = (s.x1 - s.x0) / L; segDir[1] = (s.y1 - s.y0) / L; return segDir; } }
      return segDir;
    }
    function handleEvent(g, ev) {
      if (ev._r3) return; ev._r3 = 1;
      switch (ev.e) {
        case "kill": emit(K_PUFF, ev.en.x, ev.en.y, GRADE_SIZE[ev.en.grade] * 0.6, 0.35, ev.en.grade); break;
        case "item": emit(K_ITEM, ev.x, ev.y, 0, ev.kind === "flamer" ? 0.8 : 0.7, ev.kind); break;
        case "slipper": emit(K_SLIP, ev.x, ev.y, 1.0, 0.9, "bigslipper"); break;
        case "dodge": emit(K_SPARK, ev.en.x, ev.en.y, 0.3, 0.3, "dodge"); break;
        case "leak": bowlShake = ev.loss >= 8 ? 0.5 : 0.25; emit(K_LEAK, bowl.userData.x, bowl.userData.z, 0.6, 0.4, ""); break;
        case "phase": emit(K_PHASE, ev.en.x, ev.en.y, 1.4, 0.6, ""); break;
        case "shot": case "snipe": if (ev.t) ev.t._rk = 1; break;
      }
    }
    function event(ev) { handleEvent(null, ev); }

    function sync(g, dt, ui) {
      ui = ui || {};
      const red = !!ui.reduce;
      clock += dt;
      cam.updateMatrixWorld(); camQ.copy(cam.quaternion);
      if (g.events) for (let i = 0; i < g.events.length; i++) handleEvent(g, g.events[i]);

      // 밥그릇: g.gate(0..100) 만큼 사료가 쌓인다
      const gate = g.gate == null ? 100 : g.gate;
      if (gate < lastGate) bowlShake = Math.max(bowlShake, 0.25);
      lastGate = gate;
      bowlShake = Math.max(0, bowlShake - dt);
      const sh = red ? 0 : Math.sin(clock * 60) * bowlShake * 0.12;
      bowl.position.set(bowl.userData.x + sh, 0, bowl.userData.z);
      bowl.rotation.z = gate <= 0 ? 0.5 : sh * 0.6;
      begin(kibbles);
      if (gate > 0) put(kibbles, bowl.position.x, 0.13 + 0.05 * gate / 100, bowl.position.z, 0, 0.27, 0.035 + 0.06 * gate / 100, 0.27); // 사료 더미
      const nk = Math.ceil(gate / 100 * 14);
      for (let i = 0; i < nk; i++) {
        const a = i * 2.39996, r = i < 6 ? 0.07 + (i % 3) * 0.06 : 0.1 + (i % 4) * 0.045, layer = i < 6 ? 0 : 1;
        put(kibbles, bowl.position.x + Math.cos(a) * r, 0.18 + layer * 0.05, bowl.position.z + Math.sin(a) * r, a, 0.05, 0.05, 0.05);
      }
      end(kibbles);

      begin(blobs);
      // ── 타워 ──
      for (let i = 0; i < towerList.length; i++) begin(towerList[i]);
      begin(auraIM); begin(boostIM); begin(cloudIM);
      const towers = g.towers || [];
      for (let i = 0; i < towers.length; i++) {
        const t = towers[i], look = t.branch ? (t.branch === "a" ? 3 : 4) : t.level || 0, im = towerIM[t.kind + look];
        if (!im) continue;
        const cx = t.x + 0.5, cz = t.y + 0.5;
        if (t._ry == null) { t._ry = 0; t._rk = 0; t._rc = t.cd || 0; t._rb = 0; }
        if ((t.cd || 0) > t._rc + 1e-4) t._rk = 1; // 쏘면 cd 가 다시 찬다 → 반동
        t._rc = t.cd || 0;
        t._rk = Math.max(0, t._rk - dt * 6);
        // 겨눌 곳: 사거리 안 가장 앞선(보이는) 적
        let want = null;
        if (t.kind !== "lint" && t.kind !== "ci") {
          const rr = (ENG ? ENG.stats(t).range : 2) || 2;
          let best = -1;
          for (let j = 0; j < g.enemies.length; j++) {
            const e = g.enemies[j]; if (e.dead || (e.seen === false && t.kind !== "monitor")) continue;
            const dx = e.x - cx, dz = e.y - cz; if (dx * dx + dz * dz > rr * rr) continue;
            const s = e.dist / g.lanes[e.lane].total; if (s > best) { best = s; want = e; }
          }
        }
        if (want) {
          const ty = Math.atan2(want.x - cx, want.y - cz);
          let d = ty - t._ry; d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI;
          t._ry += red ? d : d * Math.min(1, dt * 10);
        } else if (t.kind === "monitor" && !red) t._ry += dt * 0.6; // 킁킁 둘러보기
        const kick = t._rk, off = t.kind === "review" ? 0 : -kick * 0.06;
        let sy = 1, sxz = 1, yy = 0;
        if (t.kind === "review") { sy = 1 + kick * 0.06; }
        else if (t.kind === "integ") { sy = 1 - kick * 0.08; sxz = 1 + kick * 0.04; }
        else if (t.kind === "unit") { sy = 1 - kick * 0.05; }
        else if (t.kind === "ci" && !red) { yy = Math.abs(Math.sin(clock * 5 + t.id)) * 0.03; sy = 1 + Math.sin(clock * 10 + t.id) * 0.02; }
        const col = t.disabled > 0 ? colDim : WHITE;
        put(im, cx + Math.sin(t._ry) * off, yy, cz + Math.cos(t._ry) * off, t._ry, sxz, sy, sxz, col);
        put(blobs, cx, 0.03, cz, 0, 0.95, 1, 0.95);
        if (t.disabled > 0) put(cloudIM, cx, 0.95 + Math.sin(clock * 3) * 0.03, cz, clock, 0.12, 0.09, 0.1);
        if (t.kind === "lint" && t.disabled <= 0 && ENG) { const r = ENG.stats(t).range, pul = red ? 1 : 0.94 + 0.06 * Math.sin(clock * 3 + t.id); colTmp.copy(colAura); put(auraIM, cx, 0.012, cz, 0, r * pul, 1, r * pul, colTmp); }
        // 응원 받는 타워: 발밑 노란 고리
        if (t.kind !== "ci" && ENG) {
          let boosted = false;
          for (let j = 0; j < towers.length && !boosted; j++) { const c = towers[j]; if (c.kind !== "ci" || c.disabled > 0) continue; if (Math.hypot(c.x - t.x, c.y - t.y) <= ENG.stats(c).range) boosted = true; }
          if (boosted) { const pul = red ? 1 : 1 + 0.05 * Math.sin(clock * 6 + t.id); put(boostIM, cx, 0.03, cz, 0, pul, 1, pul, colBoost); }
        }
      }
      for (let i = 0; i < towerList.length; i++) end(towerList[i]);
      end(auraIM); end(boostIM); end(cloudIM);
      // 롤백 예고: 보스가 고른 타워 위 붉은 조준
      reticle.visible = false;

      // ── 적 ──
      for (const gr of GRADES) { begin(enIM[gr]); begin(enGhostIM[gr]); }
      begin(traitRing); begin(capIM); begin(heartIM); begin(sparkIM); begin(streakIM); begin(barBg); begin(barFg); begin(pipIM); begin(phaseRing);
      const ens = g.enemies || [];
      for (let i = 0; i < ens.length; i++) {
        const e = ens[i]; if (e.dead) continue;
        const M = EN[e.grade]; if (!M) continue;
        const dir = laneDir(g.lanes[e.lane], e.dist), yaw = Math.atan2(dir[0], dir[1]);
        if (e.flash > 0) e._rf = 0.12; else e._rf = Math.max(0, (e._rf || 0) - dt);
        const boss = e.grade === "blocker";
        const walk = red || e.stun > 0 || (boss && e.stagger > 0) ? 0 : Math.sin(clock * (boss ? 4 : 11) * Math.max(0.6, e.speed) + e.id * 1.7);
        let sc = M.s, sy = 1 + walk * 0.05, bob = Math.abs(walk) * (boss ? 0.01 : 0.025), ry = yaw;
        if (e._rf > 0 && !red) sy *= 0.86;
        if (boss) {
          if (e.warn && e.phase === 1) sc *= 1.1 + (red ? 0 : 0.04 * Math.sin(clock * 20)); // 소환 예고: 부풀기
          if (e.stagger > 0 && !red) ry += clock * 4; // 멈춤(약점 창): 빙글
        }
        const col = e._rf > 0 && !red ? colFlash : WHITE;
        const hidden = e.stealth && !e.seen;
        put(hidden ? enGhostIM[e.grade] : enIM[e.grade], e.x, bob + (e.grade === "major" ? 0.08 : 0), e.y, ry, sc, sc * sy, sc, col, GRADE_PITCH[e.grade]);
        const fw = GRADE_SIZE[e.grade];
        put(blobs, e.x, 0.025, e.y, 0, fw * 1.2, 1, fw * 1.2);
        // 성질: 발밑 색 고리(성질마다 한 겹씩 바깥으로) + 몸 위 작은 표시
        const tr = e.traits; let ring = 0, badge = 0;
        const top = M.h * (boss ? 1 : sy) * Math.cos(GRADE_PITCH[e.grade]) + bob;
        for (let j = 0; j < tr.length; j++) {
          const k = tr[j], rr = fw * (0.58 + ring * 0.12); ring++;
          put(traitRing, e.x, 0.02 + ring * 0.002, e.y, 0, rr, 1, rr, colTrait[k]);
          const bx = e.x + (badge - (tr.length - 1) / 2) * 0.16;
          if (k === "fast") { // 뒤로 바람 두 줄
            if (!red) for (let s = -1; s <= 1; s += 2) put(streakIM, e.x - dir[0] * fw * 0.75 + dir[1] * s * fw * 0.25, 0.12, e.y - dir[1] * fw * 0.75 - dir[0] * s * fw * 0.25, yaw, 0.12, 0.12, fw * 0.45);
          } else if (k === "tough") { put(capIM, e.x, top - 0.02, e.y, yaw, fw * 0.32, fw * 0.32, fw * 0.32); }
          else if (k === "regen") { const ph = red ? 0.5 : (clock * 0.5 + e.id * 0.31) % 1; put(heartIM, bx, top + 0.1 + ph * 0.14, e.y, 0, 0.055, 0.055, 0.055); badge++; }
          else if (k === "flaky") { const on = red || ((clock * 2 + e.id * 0.37) % 1) < 0.6; if (on) put(sparkIM, bx, top + 0.12, e.y, clock * 2, 0.07, 0.07, 0.07); badge++; }
        }
        // 체력 막대: Major 이상, 맞은 뒤에만
        if ((e.grade === "major" || e.grade === "critical" || boss) && e.hp < e.maxHp) {
          const w = boss ? 1.2 : fw * 0.95, f = Math.max(0, e.hp / e.maxHp), by = top + (boss ? 0.35 : 0.2);
          putQ(barBg, e.x, by, e.y, camQ, w + 0.05, 0.1, 1, colBg);
          putQ(barFg, e.x - (w * (1 - f)) / 2, by + 0.005, e.y + 0.002, camQ, Math.max(0.01, w * f), 0.06, 1, f > 0.35 ? colOk : colLow);
        }
        if (boss) {
          // 단계 고리(방패 파랑 · 소환 노랑 · 되감기 빨강)
          const pr = 1.0 + (red ? 0 : 0.03 * Math.sin(clock * 5));
          put(phaseRing, e.x, 0.03, e.y, 0, pr, 1, pr, colPhase[e.phase || 0]);
          const n = Math.ceil(e.shield || 0);
          for (let s = 0; s < n && s < 10; s++) { const a = s / 10 * TAU + (red ? 0 : clock * 0.8); put(pipIM, e.x + Math.cos(a) * 0.75, 0.38, e.y + Math.sin(a) * 0.75, 0, 0.07, 0.07, 0.07, colShield); }
          if (e.stagger > 0) for (let s = 0; s < 4; s++) { const a = s / 4 * TAU + clock * 5; put(sparkIM, e.x + Math.cos(a) * 0.45, 0.55, e.y + Math.sin(a) * 0.45, a, 0.08, 0.08, 0.08); }
          if (e.warnTower) { reticle.visible = true; const s = red ? 1 : 1 + 0.12 * Math.sin(clock * 16); reticle.position.set(e.warnTower.x + 0.5, 0.06, e.warnTower.y + 0.5); reticle.scale.set(s, 1, s); }
        }
        if (e.stun > 0) for (let s = 0; s < 3; s++) { const a = s / 3 * TAU + clock * 6; put(sparkIM, e.x + Math.cos(a) * fw * 0.5, top + 0.08, e.y + Math.sin(a) * fw * 0.5, a, 0.05, 0.05, 0.05); }
      }
      for (const gr of GRADES) { end(enIM[gr]); end(enGhostIM[gr]); }

      // ── 탄·폭발 ──
      begin(ballIM); begin(boneIM); begin(beamIM); begin(barkIM); begin(boomIM); begin(puffIM);
      const fx = g.fx || [];
      for (let i = 0; i < fx.length; i++) {
        const f = fx[i];
        if (f.k === "tracer") {
          const k = Math.min(1, 1 - f.life / 0.08), x = f.x0 + (f.x1 - f.x0) * k, z = f.y0 + (f.y1 - f.y0) * k;
          put(ballIM, x, 0.28 + Math.sin(k * Math.PI) * 0.12 - 0.08, z, clock * 9, 0.032, 0.032, 0.032);
        } else if (f.k === "shell" && f.live) {
          const k = 1 - f.life / f.max, x = f.x0 + (f.x1 - f.x0) * k, z = f.y0 + (f.y1 - f.y0) * k;
          put(boneIM, x, 0.45 + Math.sin(k * Math.PI) * 1.1, z, k * 12, 1.2, 1.2, 1.2);
          put(blobs, x, 0.02, z, 0, 0.3, 1, 0.3);
        } else if (f.k === "beam") {
          const dx = f.x1 - f.x0, dz = f.y1 - f.y0, L = Math.hypot(dx, dz) || 0.01, k = 1 - f.life / 0.14, yaw = Math.atan2(dx, dz);
          put(beamIM, f.x0 + dx / 2, 0.42, f.y0 + dz / 2, yaw, 0.05 * (1 - k * 0.5), 0.02, L, colBeam);
          for (let s = 0; s < 3; s++) { const q = Math.min(1, k * 1.4 + s * 0.22), rr = 0.12 + q * 0.3; put(barkIM, f.x0 + dx * (0.12 + s * 0.18), 0.45, f.y0 + dz * (0.12 + s * 0.18), yaw, rr, rr, rr, colBeam); }
        } else if (f.k === "boom") {
          const k = 1 - f.life / f.max, r = f.r * (0.4 + 0.6 * k);
          put(boomIM, f.x, 0.04, f.y, 0, r, 1, r, colBoom);
          if (!red) for (let s = 0; s < 4; s++) { const a = s * 1.57 + 0.4; put(puffIM, f.x + Math.cos(a) * r * 0.5, 0.1 + k * 0.2, f.y + Math.sin(a) * r * 0.5, a, 0.1 * (1 - k * 0.5), 0.1 * (1 - k * 0.5), 0.1 * (1 - k * 0.5)); }
        }
      }
      // ── 장판(아이템·전설) ──
      begin(zoneIM); begin(zoneRimIM);
      const zs = g.zones || [];
      for (let i = 0; i < zs.length; i++) {
        const z = zs[i], f = Math.min(1, z.life / Math.min(0.4, z.max)), cz = colZone[z.kind] || colZone.spray, rz = z.r * (0.92 + 0.08 * f);
        put(zoneIM, z.x, 0.015, z.y, 0, rz, 1, rz, cz);
        put(zoneRimIM, z.x, 0.03, z.y, red ? 0 : clock * 0.6, rz, 1.4, rz, colRim[z.kind] || colRim.spray);
      }
      end(zoneIM); end(zoneRimIM);
      // ── 사건 연출 ──
      for (let i = 0; i < itemList.length; i++) itemList[i].visible = false;
      cushion.visible = false;
      for (let i = 0; i < POOL; i++) {
        const o = pool[i]; if (!o.k) continue;
        o.t += dt; if (o.t >= o.max) { o.k = 0; continue; }
        const k = o.t / o.max;
        if (o.k === K_PUFF) { if (!red) for (let s = 0; s < 5; s++) { const a = s * 1.26 + i, r = o.r * (0.4 + k); put(puffIM, o.x + Math.cos(a) * r, 0.12 + k * 0.25, o.y + Math.sin(a) * r, a, o.r * 0.35 * (1 - k), o.r * 0.35 * (1 - k), o.r * 0.35 * (1 - k)); } }
        else if (o.k === K_SPARK) { put(sparkIM, o.x, 0.5 + k * 0.2, o.y, k * 6, 0.08, 0.08, 0.08); }
        else if (o.k === K_LEAK) { put(boomIM, o.x, 0.05, o.y, 0, 0.4 + k * 0.4, 1, 0.4 + k * 0.4, colRed); }
        else if (o.k === K_PHASE) { const r = 0.6 + k * 1.4; put(boomIM, o.x, 0.05, o.y, 0, r, 1, r, colStar); }
        else if (o.k === K_ITEM) {
          const m = itemMesh[o.kind], it = ENG && ENG.DATA.ITEMS.kinds[o.kind];
          if (o.kind === "flamer") { // 똥꼬 스키 한 줄: 코코가 줄을 가로지른다
            m.visible = true; m.position.set(-0.3 + k * 9.6, 0.02, o.y); m.rotation.set(0, 0, 0); m.scale.setScalar(1.6);
            for (let s = 0; s < 6; s++) { const xx = -0.3 + k * 9.6 - s * 0.35; if (xx > 0) put(puffIM, xx, 0.06, o.y + Math.sin(s * 2) * 0.1, s, 0.06 * (1 - s / 6), 0.04, 0.06); }
          } else if (m) {
            const fall = Math.min(1, k / 0.3), y = (1 - fall * fall) * 1.6, s = (o.kind === "swatter" ? 1.2 : 1.5) * (k > 0.75 ? (1 - k) / 0.25 : 1);
            m.visible = true; m.position.set(o.x, y, o.y); m.rotation.set(0, red ? 0 : k * 2, 0); m.scale.setScalar(Math.max(0.01, s));
            if (fall >= 1 && it && it.r) { const r = it.r * (0.7 + 0.3 * Math.min(1, (k - 0.3) / 0.3)); put(boomIM, o.x, 0.05, o.y, 0, r, 1, r, colBoost); }
          }
        } else if (o.k === K_SLIP) { // 하늘에서 떨어지는 큰 쿠션: 그림자가 커지다 쿵
          const fall = Math.min(1, k / 0.55), y = (1 - fall * fall) * 3.2;
          put(blobs, o.x, 0.03, o.y, 0, 0.6 + fall * 1.6, 1, 0.6 + fall * 1.6);
          cushion.visible = true; cushion.position.set(o.x, y, o.y); cushion.rotation.set(0, k * 1.5, 0); cushion.scale.setScalar(2.4 * (k > 0.85 ? (1 - k) / 0.15 : 1) + 0.01);
          if (fall >= 1) { const r = o.r * (0.6 + 0.4 * (k - 0.55) / 0.45); put(boomIM, o.x, 0.05, o.y, 0, r, 1, r, colBoom); }
        }
      }
      end(ballIM); end(boneIM); end(beamIM); end(barkIM); end(boomIM); end(puffIM);
      end(traitRing); end(capIM); end(heartIM); end(sparkIM); end(streakIM); end(barBg); end(barFg); end(pipIM); end(phaseRing);
      end(blobs);

      // ── 화면 도움(고른 칸·사거리·미리보기·빈 칸) ──
      const pulse = red ? 1 : 0.5 + 0.5 * Math.sin(clock * 5);
      selFrame.visible = selFill.visible = !!ui.sel;
      if (ui.sel) { selFrame.position.set(ui.sel.x + 0.5, 0.07, ui.sel.y + 0.5); selFill.position.set(ui.sel.x + 0.5, 0.045, ui.sel.y + 0.5); selFrame.material.opacity = 0.75 + 0.25 * pulse; }
      rangeFill.visible = rangeDark.visible = rangeLine.visible = !!ui.range;
      if (ui.range) {
        const r = ui.range.r, x = ui.range.x + 0.5, z = ui.range.y + 0.5;
        rangeFill.position.set(x, 0.05, z); rangeFill.scale.set(r, 1, r);
        rangeDark.geometry = ringGeo(r + 0.035, 0.1); rangeDark.position.set(x, 0.06, z); rangeDark.scale.set(1, 1, 1);
        rangeLine.geometry = ringGeo(r, 0.045); rangeLine.position.set(x, 0.065, z); rangeLine.scale.set(1, 1, 1);
      }
      aimFill.visible = aimLine.visible = aimRow.visible = false;
      if (ui.aim) {
        if (ui.aim.row) { aimRow.visible = true; aimRow.position.set(4.5, 0.05, ui.aim.y); }
        else { aimFill.visible = aimLine.visible = true; aimFill.position.set(ui.aim.x, 0.05, ui.aim.y); aimFill.scale.set(ui.aim.r, 1, ui.aim.r); aimLine.geometry = ringGeo(ui.aim.r, 0.05); aimLine.position.set(ui.aim.x, 0.065, ui.aim.y); }
      }
      ghost.visible = !!ui.ghost;
      if (ui.ghost) { ghost.geometry = towerGeo[ui.ghost.kind + "0"] || towerGeo.unit0; ghost.position.set(ui.ghost.x + 0.5, 0.0, ui.ghost.y + 0.5); ghost.rotation.y = 0; previewMat.opacity = 0.5 + 0.15 * pulse; }
      begin(slotGlow);
      if (ui.slots && g.slots) {
        for (let i = 0; i < g.slots.length; i++) {
          const s = g.slots[i]; let used = false;
          for (let j = 0; j < towers.length; j++) if (towers[j].x === s[0] && towers[j].y === s[1]) { used = true; break; }
          if (used) continue;
          const sc = red ? 1 : 0.94 + 0.08 * pulse;
          put(slotGlow, s[0] + 0.5, 0.05, s[1] + 0.5, 0, sc, 1, sc, colSlot);
        }
      }
      end(slotGlow);
    }

    // ══ 크기·그리기·고르기 ═══════════════════════════════════
    let cssW = 360, cssH = 480;
    function resize(w, h, dpr) {
      cssW = w; cssH = h;
      renderer.setPixelRatio(Math.min(2, dpr || 1));
      renderer.setSize(w, h, false);
      const needW = 4.55, needH = 6.0 * Math.sin(TILT) + 0.42;
      let hh = Math.max(needH, needW * h / w), hw = hh * w / h;
      cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = -hh; cam.updateProjectionMatrix();
    }
    let last = { calls: 0, tris: 0 };
    function render() { renderer.render(scene, cam); last.calls = renderer.info.render.calls; last.tris = renderer.info.render.triangles; }
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new V3(0, 1, 0), 0), hit = new V3();
    function pick(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, cam);
      if (!ray.ray.intersectPlane(plane, hit)) return null;
      return { x: hit.x, y: hit.z };
    }
    function stats() { return { calls: last.calls, tris: last.tris }; }
    // 타일 좌표(+높이) → 캔버스 안 CSS px. 떠오르는 숫자·말풍선을 3D 위 겹 캔버스/DOM 에 놓을 때 쓴다.
    const _sv = new V3();
    function toScreen(x, y, h) { _sv.set(x, h || 0, y).project(cam); return { x: (_sv.x + 1) / 2 * cssW, y: (1 - _sv.y) / 2 * cssH }; }

    // ══ 아이콘 굽기(작은 렌더러 하나를 돌려 쓴다) ═══════════════
    let icoR = null, icoScene = null, icoCam = null, icoMesh = null;
    const iconCache = new Map();
    function iconGeo(spec) {
      if (spec.tower) return towerGeo[spec.tower + (spec.branch ? (spec.branch === "a" ? 3 : 4) : spec.level || 0)];
      if (spec.grade) return EN[spec.grade] && EN[spec.grade].geo;
      if (spec.item) return itemGeo[spec.item];
      if (spec.legend) return legendGeo[spec.legend];
      if (spec.gate) return bowlFullGeo;
      return null;
    }
    function icon(spec, px) {
      px = Math.max(8, Math.round(px || 84));
      const key = JSON.stringify(spec) + "@" + px;
      if (iconCache.has(key)) return iconCache.get(key);
      const geo = iconGeo(spec); if (!geo) return "";
      if (!icoR) {
        const cv = document.createElement("canvas");
        icoR = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
        icoR.outputColorSpace = THREE.SRGBColorSpace; icoR.setClearColor(0x000000, 0); icoR.setPixelRatio(1);
        icoScene = new THREE.Scene();
        icoScene.add(new THREE.HemisphereLight(C.cream3, C.g1, 1.9));
        const d = new THREE.DirectionalLight(C.shine1, 1.5); d.position.set(-3, 6, 4); icoScene.add(d);
        icoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 50);
        icoMesh = new THREE.Mesh(geo, vmat); icoScene.add(icoMesh);
      }
      icoR.setSize(px, px, false);
      icoMesh.geometry = geo;
      geo.computeBoundingBox();
      const bb = geo.boundingBox, cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2, cz = (bb.min.z + bb.max.z) / 2;
      icoMesh.position.set(-cx, -cy, -cz);
      icoMesh.rotation.set(0, 0, 0);
      // 3/4 위에서(기울기 42°, 살짝 돌림) — 판 카메라보다 낮게 봐서 작은 칸에서도 생김새가 갈린다
      const el = 42 * Math.PI / 180, az = -0.5, D = 20;
      icoCam.position.set(Math.sin(az) * Math.cos(el) * D, Math.sin(el) * D, Math.cos(az) * Math.cos(el) * D);
      icoCam.lookAt(0, 0, 0); icoCam.updateMatrixWorld();
      // 정점 8개를 카메라 공간으로 투영해 꼭 맞게
      let mx = 0, my = 0; const v = _p;
      for (let i = 0; i < 8; i++) {
        v.set(i & 1 ? bb.max.x - cx : bb.min.x - cx, i & 2 ? bb.max.y - cy : bb.min.y - cy, i & 4 ? bb.max.z - cz : bb.min.z - cz).applyMatrix4(icoCam.matrixWorldInverse);
        mx = Math.max(mx, Math.abs(v.x)); my = Math.max(my, Math.abs(v.y));
      }
      const hs = Math.max(mx, my) * 1.08;
      icoCam.left = -hs; icoCam.right = hs; icoCam.top = hs; icoCam.bottom = -hs; icoCam.updateProjectionMatrix();
      icoR.render(icoScene, icoCam);
      const url = icoR.domElement.toDataURL("image/png");
      iconCache.set(key, url);
      return url;
    }

    resize(360, 480, 2);
    return {
      resize, setMap, sync, render, pick, stats, icon, event, toScreen,
      // 확인용(시트·측정)
      _debug: { scene, cam, renderer, towerGeo, EN, itemGeo, legendGeo, triCount, THEME, TILT },
    };
  }

  window.CocoTD3D = { create };
})();
