// 「코코의 집으로」(가칭) — 규칙 엔진(순수, 화면 모름). 의뢰서 docs/lab-home-brief.md · 규격 docs/lab-home-spec.md. 🔴 표와 코드가 다르면 코드가 맞다.
// 2.5D 횡스크롤 점프 액션. 좌표는 칸(1 칸 ≈ 코코 몸길이) — x 오른쪽, y 위, 바닥 윗면 y = 0. 코코 자리 (x, y) = 발밑 가운데.
// 시간은 고정 걸음 TUNE.DT(1/60 초) — 화면이 쌓인 시간만큼 step(g, inp) 를 부른다(엔진은 시계를 모른다).
// inp = { x: −1..1(좌우), down: 아래 누름, jump: 점프 누르고 있음, jumpTap: 이번 걸음에 점프 눌림, skillTap: 이번 걸음에 기술 눌림 }
// 기술 단추 하나: 땅에서는 똥꼬 스키, 공중에서는 뱅글뱅글. 땅에서 아래 + 달리기도 스키(키보드).
(function (root) {
  "use strict";
  // ── 손맛 수치(규격 2절 표 — 조작감 시험 판으로 Dean 실기기 판정을 받는다) ──
  const TUNE = {
    DT: 1 / 60,
    RUN: 7.0, // 달리기 최고 속도(칸/초)
    ACC_G: 55, DEC_G: 70, ACC_A: 38, DEC_A: 20, TURN: 1.7, // 땅·공중 가속/감속, 반대로 꺾을 때 가속 배수
    G_UP: 52, G_DOWN: 88, FALL_MAX: 22, // 오를 때 중력 · 내려올 때 중력(더 무겁게 — 붕 뜬 느낌을 줄인다) · 낙하 최고 속도
    JUMP_V: 18.2, // 길게 누르면 최고 높이 ≈ 3.2 칸
    CUT: 0.45, JUMP_MIN: 0.05, // 오르는 중 점프를 떼면 위 속도에 곱한다(짧게 누르면 낮게) · 뛰고 3 걸음은 떼도 안 깎는다(톡 눌러도 1 칸 계단은 넘게 — 0.42·즉시 깎기는 0.74 칸이었다)
    COYOTE: 0.1, // 발판 끝을 지난 뒤에도 점프를 받는 시간(6 걸음)
    BUFFER: 0.12, // 착지 직전에 누른 점프를 기억하는 시간(7 걸음)
    W: 0.9, H: 0.85, H_SCOOT: 0.45, // 몸 상자: 폭 · 키 · 스키 때 키
    SCOOT_V: 10, SCOOT_T: 0.5, SCOOT_CD: 0.22, SCOOT_MIN: 3, // 똥꼬 스키: 속도 · 시간 · 다시 쓰기까지 · 낮은 틈에 끼면 이 속도로 계속 민다
    SPIN_T: 0.42, SPIN_LIFT: 7, SPIN_PAD: 0.35, // 뱅글뱅글: 시간 · 쓰는 순간 위 속도 최소 · 공격 상자를 몸보다 넓힌 폭(한쪽)
    STOMP_V: 13, STOMP_V_HOLD: 17, // 적을 밟으면 튀어 오르는 속도(점프를 누르고 있으면 더 높이)
    HURT_IFRAME: 1.0, HURT_KB_X: 6, HURT_KB_Y: 8, HURT_LOCK: 0.25, // 맞음: 무적 깜빡임 · 밀림 · 조작이 잠기는 시간
    PIT_Y: -4, HEARTS: 3, // 이보다 떨어지면 구멍에 빠진 것 · 하트 최대
    PICK_R: 0.55, // 먹을 것 집는 거리
  };
  const SCORE = { snack: 10, bone: 100, heart: 50, enemy: 30 };

  // ── 맵 자료: solids = [x, y, w, h](아래 왼쪽 모서리), semis = [x, y, w](위로만 통과하는 발판 — 차양·선반),
  // enemies = { kind, x, y, x0, x1 }, picks = { kind: snack|bone|heart, x, y }, cp = 체크포인트 [x, y], goal = x, spawn = [x, y]
  // 🔴 하트는 스테이지당 하나(Dean 10-29), 뼈다귀는 스테이지당 3(기본안). 리그가 맵마다 센다.
  const ENEMY = {
    brush: { w: 0.9, h: 0.7, v: 1.6, fly: false }, // 칫솔: 바닥을 오가며 걷는다
    bubble: { w: 0.8, h: 0.8, v: 0, fly: true, bob: 0.45, bobHz: 0.7 }, // 목욕 거품: 제자리에 둥둥
  };
  const LEVELS = {
    // 칫솔 길은 43..49 — 53 까지 두면 밟고 튄 채로 구멍(56)까지 날아갔다(리그 길잡이). 구멍 앞엔 땅에 한 번 닿을 자리를 둔다.
    // 조작감 시험 판(빈 회색 맵): 달리기 → 계단 → 구멍 3 → 차양 발판(하트) → 낮은 틈(스키) → 체크포인트 → 칫솔 → 구멍 4 → 거품(뱅글) → 도착
    test: {
      id: "test", name: "조작감 시험 판", w: 78, theme: "gray",
      spawn: [2, 0], cp: [41, 0], goal: 74,
      solids: [
        [-2, -6, 22, 6], // 시작 땅 −2..20
        [10, 0, 2, 1], [14, 0, 3, 2], // 계단 1 칸 · 2 칸
        [23, -6, 33, 6], // 구멍 3 칸(20..23) 뒤 땅 23..56
        [33, 0.6, 5, 5.4], // 낮은 틈: 바닥에서 0.6 칸 위로 벽(스키로만 지난다 — 높이 6 이라 뛰어넘지 못한다)
        [60, -6, 20, 6], // 구멍 4 칸(56..60) 뒤 땅 60..80
        [-3, -6, 1, 16], [78, -6, 2, 16], // 양 끝 벽
      ],
      semis: [[26, 2.6, 4]], // 차양 발판(위로 뛰어 올라선다, 아래에서는 통과)
      enemies: [{ kind: "brush", x: 46, y: 0, x0: 43, x1: 49 }, { kind: "bubble", x: 66, y: 2.2 }],
      picks: [
        { kind: "heart", x: 28, y: 3.3 }, // 길을 조금 벗어난 자리(차양 위)
        { kind: "bone", x: 15.5, y: 2.6 }, { kind: "bone", x: 35.5, y: 0.25 }, { kind: "bone", x: 66, y: 3.5 },
        { kind: "snack", x: 6, y: 0.4 }, { kind: "snack", x: 7, y: 0.4 }, { kind: "snack", x: 8, y: 0.4 },
        { kind: "snack", x: 21.5, y: 2.2 }, { kind: "snack", x: 58, y: 2.4 }, { kind: "snack", x: 70, y: 0.4 }, { kind: "snack", x: 71, y: 0.4 },
      ],
    },
  };
  // 구역 묶음 — 맛보기 구역 1 = 3 스테이지 + 보스(1-1 부터 채운다). 엔진은 처음부터 구역 여럿을 받는다.
  const ZONES = [{ id: "z1", name: "길 잃은 동네", stages: [] }];

  // ── 상자 ──
  const hit = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  function pbox(p) { const h = p.scoot > 0 ? TUNE.H_SCOOT : TUNE.H; return [p.x - TUNE.W / 2, p.y, TUNE.W, h]; }
  function solidAt(L, x, y, w, h) { for (const s of L.solids) if (hit(x, y, w, h, s[0], s[1], s[2], s[3])) return s; return null; }
  const headroom = (L, p) => !solidAt(L, p.x - TUNE.W / 2, p.y + 0.01, TUNE.W, TUNE.H - 0.01); // 일어설 자리가 있나

  function create(level, opts) {
    const L = typeof level === "string" ? LEVELS[level] : level;
    opts = opts || {};
    const g = {
      L, id: L.id, t: 0, frame: 0, state: "play", score: 0, bones: 0, snacks: 0, kills: 0, hurts: 0, pits: 0, cp: false,
      p: { x: L.spawn[0], y: L.spawn[1], vx: 0, vy: 0, face: 1, ground: true, coyote: 0, buffer: 0, cut: false, scoot: 0, scootCd: 0, spin: 0, spinUsed: false, iframe: 0, lock: 0, hearts: opts.hearts || TUNE.HEARTS, airT: 0, lastGroundX: L.spawn[0] },
      en: L.enemies.map((e, i) => ({ id: i, kind: e.kind, x: e.x, y: e.y, y0: e.y, x0: e.x0 == null ? e.x : e.x0, x1: e.x1 == null ? e.x : e.x1, vx: -ENEMY[e.kind].v, dead: false, t: 0 })),
      pk: L.picks.map((k, i) => ({ id: i, kind: k.kind, x: k.x, y: k.y, got: false })),
      ev: [], log: [],
    };
    return g;
  }
  const emit = (g, type, o) => { const e = Object.assign({ type, t: +g.t.toFixed(3), f: g.frame }, o || {}); g.ev.push(e); g.log.push(e); };

  function hurt(g, fromX) {
    const p = g.p;
    if (p.iframe > 0 || g.state !== "play") return false;
    p.hearts--; g.hurts++;
    const dir = Math.sign(p.x - fromX) || -p.face;
    p.vx = dir * TUNE.HURT_KB_X; p.vy = TUNE.HURT_KB_Y; p.ground = false; p.coyote = 0;
    p.iframe = TUNE.HURT_IFRAME; p.lock = TUNE.HURT_LOCK; p.scoot = 0; p.spin = 0;
    emit(g, "hurt", { hearts: p.hearts });
    if (p.hearts <= 0) { g.state = "fail"; emit(g, "fail"); }
    return true;
  }
  function respawn(g) {
    const p = g.p, L = g.L, at = g.cp ? L.cp : L.spawn;
    p.x = at[0]; p.y = at[1]; p.vx = 0; p.vy = 0; p.ground = true; p.scoot = 0; p.spin = 0; p.spinUsed = false; p.buffer = 0; p.coyote = 0; p.face = 1;
  }

  function step(g, inp) {
    inp = inp || {};
    g.ev.length = 0;
    if (g.state !== "play") return g.ev;
    const T = TUNE, dt = T.DT, p = g.p, L = g.L;
    g.t += dt; g.frame++;
    const ix = p.lock > 0 ? 0 : Math.max(-1, Math.min(1, inp.x || 0));
    if (p.lock > 0) p.lock = Math.max(0, p.lock - dt);
    if (p.iframe > 0) p.iframe = Math.max(0, p.iframe - dt);
    if (p.scootCd > 0) p.scootCd = Math.max(0, p.scootCd - dt);
    // 점프 기억(착지 직전 누름 받기)
    if (inp.jumpTap && p.lock <= 0) p.buffer = T.BUFFER; else p.buffer = Math.max(0, p.buffer - dt);
    p.coyote = p.ground ? T.COYOTE : Math.max(0, p.coyote - dt);

    // 기술: 땅 = 똥꼬 스키, 공중 = 뱅글뱅글
    const wantScoot = (inp.skillTap && p.ground) || (inp.down && p.ground && Math.abs(ix) > 0.5 && p.scoot <= 0);
    if (wantScoot && p.scoot <= 0 && p.scootCd <= 0 && p.lock <= 0) {
      if (Math.abs(ix) > 0.1) p.face = Math.sign(ix);
      p.scoot = T.SCOOT_T; p.vx = p.face * T.SCOOT_V; emit(g, "scoot");
    } else if (inp.skillTap && !p.ground && !p.spinUsed && p.lock <= 0) {
      p.spin = T.SPIN_T; p.spinUsed = true; p.vy = Math.max(p.vy, T.SPIN_LIFT); p.cut = true; emit(g, "spin");
    }

    // 좌우
    if (p.scoot > 0) {
      p.scoot -= dt;
      if (p.scoot <= 0) { if (headroom(L, p)) { p.scoot = 0; p.scootCd = T.SCOOT_CD; } else { p.scoot = dt; if (Math.abs(p.vx) < T.SCOOT_MIN) p.vx = p.face * T.SCOOT_MIN; } } // 낮은 틈 안에서는 끝나지 않고 민다
      else p.vx -= Math.sign(p.vx) * 6 * dt; // 미끄러지며 조금씩 준다
    } else {
      const target = ix * T.RUN;
      const acc = p.ground ? (ix !== 0 ? T.ACC_G : T.DEC_G) : ix !== 0 ? T.ACC_A : T.DEC_A;
      const turn = ix !== 0 && Math.sign(ix) !== Math.sign(p.vx) && p.vx !== 0 ? T.TURN : 1;
      const d = target - p.vx, m = acc * turn * dt;
      p.vx += Math.abs(d) <= m ? d : Math.sign(d) * m;
      if (ix !== 0 && p.lock <= 0) p.face = Math.sign(ix);
    }
    if (p.spin > 0) p.spin = Math.max(0, p.spin - dt);

    // 점프
    if (p.buffer > 0 && (p.ground || p.coyote > 0) && headroom(L, p) && p.lock <= 0) {
      const usedCoyote = !p.ground;
      p.vy = T.JUMP_V; p.ground = false; p.coyote = 0; p.buffer = 0; p.cut = false; p.scoot = 0; p.airT = 0;
      emit(g, "jump", { coyote: usedCoyote, x: +p.x.toFixed(3) });
    }
    if (!inp.jump && p.vy > 0 && !p.cut && p.airT >= T.JUMP_MIN - 1e-9) { p.vy *= T.CUT; p.cut = true; }
    // 중력
    if (!p.ground || p.vy > 0) p.vy -= (p.vy > 0 ? T.G_UP : T.G_DOWN) * dt;
    if (p.vy < -T.FALL_MAX) p.vy = -T.FALL_MAX;

    // 움직임: x 먼저, 그다음 y
    let b = pbox(p);
    p.x += p.vx * dt;
    b = pbox(p);
    for (const s of L.solids) {
      if (!hit(b[0], b[1], b[2], b[3], s[0], s[1], s[2], s[3])) continue;
      if (p.vx > 0) p.x = s[0] - T.W / 2 - 1e-6; else if (p.vx < 0) p.x = s[0] + s[2] + T.W / 2 + 1e-6;
      else p.x = p.x < s[0] + s[2] / 2 ? s[0] - T.W / 2 - 1e-6 : s[0] + s[2] + T.W / 2 + 1e-6;
      p.vx = 0; b = pbox(p);
    }
    const wasGround = p.ground, prevY = p.y;
    p.y += p.vy * dt;
    p.ground = false;
    b = pbox(p);
    for (const s of L.solids) {
      if (!hit(b[0], b[1], b[2], b[3], s[0], s[1], s[2], s[3])) continue;
      if (p.vy <= 0) { p.y = s[1] + s[3]; p.ground = true; } else { p.y = s[1] - b[3] - 1e-6; }
      p.vy = 0; b = pbox(p);
    }
    if (p.vy <= 0) for (const s of L.semis) {
      const top = s[1];
      if (prevY >= top - 1e-6 && p.y < top && b[0] < s[0] + s[2] && b[0] + b[2] > s[0]) { p.y = top; p.vy = 0; p.ground = true; }
    }
    // 땅에 붙어 있는지(내리막 한 걸음 — 발밑 0.02 칸 아래를 본다): 서 있다가 끝을 지나면 공중
    if (!p.ground && wasGround && p.vy <= 0) {
      if (solidAt(L, b[0], p.y - 0.02, b[2], 0.02) || L.semis.some((s) => Math.abs(p.y - s[1]) < 1e-6 && b[0] < s[0] + s[2] && b[0] + b[2] > s[0])) { p.ground = true; p.vy = 0; }
    }
    if (p.ground) {
      if (!wasGround) emit(g, "land", { x: +p.x.toFixed(3), airT: +p.airT.toFixed(3) });
      p.spinUsed = false; p.lastGroundX = p.x;
    } else p.airT += dt;

    // 적
    b = pbox(p);
    const atk = p.spin > 0 ? [b[0] - T.SPIN_PAD, b[1] - 0.1, b[2] + 2 * T.SPIN_PAD, b[3] + 0.2] : null;
    for (const e of g.en) {
      if (e.dead) continue;
      const E = ENEMY[e.kind];
      e.t += dt;
      if (!E.fly) { e.x += e.vx * dt; if (e.x < e.x0) { e.x = e.x0; e.vx = Math.abs(e.vx); } if (e.x > e.x1) { e.x = e.x1; e.vx = -Math.abs(e.vx); } }
      else e.y = e.y0 + E.bob * Math.sin(Math.PI * 2 * E.bobHz * e.t);
      const ex = e.x - E.w / 2, ey = e.y;
      if (atk && hit(atk[0], atk[1], atk[2], atk[3], ex, ey, E.w, E.h)) { kill(g, e, "spin"); continue; }
      if (!hit(b[0], b[1], b[2], b[3], ex, ey, E.w, E.h)) continue;
      if (p.scoot > 0) { kill(g, e, "scoot"); continue; }
      if (p.vy < 0 && prevY >= ey + E.h * 0.5) { kill(g, e, "stomp"); p.vy = inp.jump ? T.STOMP_V_HOLD : T.STOMP_V; p.cut = !inp.jump; p.spinUsed = false; continue; }
      hurt(g, e.x);
    }
    // 구멍
    if (g.state === "play" && p.y < T.PIT_Y) {
      g.pits++; p.hearts--; emit(g, "pit", { hearts: p.hearts });
      if (p.hearts <= 0) { g.state = "fail"; emit(g, "fail"); }
      else { respawn(g); p.iframe = T.HURT_IFRAME; }
    }
    // 먹을 것
    for (const k of g.pk) {
      if (k.got) continue;
      const cx = p.x, cy = p.y + (p.scoot > 0 ? T.H_SCOOT : T.H) / 2;
      if (Math.hypot(k.x - cx, k.y - cy) > T.PICK_R + 0.3) continue;
      if (k.kind === "heart") { if (p.hearts >= T.HEARTS) continue; p.hearts++; } // 하트가 가득이면 그대로 남는다(나중에 다시 와서 먹는다)
      k.got = true; g.score += SCORE[k.kind];
      if (k.kind === "bone") g.bones++; if (k.kind === "snack") g.snacks++;
      emit(g, "pick", { kind: k.kind, id: k.id });
    }
    // 체크포인트 · 도착
    if (!g.cp && p.x >= L.cp[0] && p.ground) { g.cp = true; emit(g, "cp"); }
    if (g.state === "play" && p.x >= L.goal) { g.state = "clear"; emit(g, "clear", { time: +g.t.toFixed(2) }); }
    return g.ev;
  }
  function kill(g, e, how) { e.dead = true; g.kills++; g.score += SCORE.enemy; emit(g, "kill", { kind: e.kind, how, id: e.id }); }

  // 화면이 코코 자세를 고를 때 쓰는 낱말(엔진이 정한다 — 화면마다 갈리지 않게)
  function pose(g) {
    const p = g.p;
    if (g.state === "fail") return "nap";
    if (g.state === "clear") return "wag";
    if (p.spin > 0) return "spin";
    if (p.scoot > 0) return "scoot";
    if (!p.ground) return p.vy > 0 ? "rise" : "fall";
    return Math.abs(p.vx) > 0.4 ? "walk" : "sit";
  }

  const API = { TUNE, SCORE, ENEMY, LEVELS, ZONES, create, step, respawn, pose, pbox, headroom };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.LabHome = API;
})(typeof window !== "undefined" ? window : globalThis);
