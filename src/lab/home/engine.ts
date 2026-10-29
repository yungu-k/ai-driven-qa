// @ts-nocheck — 디자인 세션 정본 docs/lab-home.js(abf2ca7a)를 그대로 옮긴 것(tmp/lab-home/sync-src.sh). 고칠 땐 정본부터.
// 「코코의 집으로」(가칭) — 규칙 엔진(순수, 화면 모름). 의뢰서 docs/lab-home-brief.md · 규격 docs/lab-home-spec.md. 🔴 표와 코드가 다르면 코드가 맞다.
// 2.5D 횡스크롤 점프 액션. 좌표는 칸(1 칸 ≈ 코코 몸길이) — x 오른쪽, y 위, 바닥 윗면 y = 0. 코코 자리 (x, y) = 발밑 가운데.
// 시간은 고정 걸음 TUNE.DT(1/60 초) — 화면이 쌓인 시간만큼 step(g, inp) 를 부른다(엔진은 시계를 모른다).
// inp = { x: −1..1(좌우), down: 아래 누름, jump: 점프 누르고 있음, jumpTap: 이번 걸음에 점프 눌림, skillTap: 이번 걸음에 기술 눌림 }
// 기술 단추 하나: 땅에서는 똥꼬 스키, 공중에서는 뱅글뱅글. 땅에서 아래 + 달리기도 스키(키보드).
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
  // ai: walk(x0..x1 오감) · float(제자리 둥둥) · bark(짖음 파동을 쏜다) · roll(굴러간다 — 생성기가 낸다) · dash(종 울리고 달려온다) · boss
  // tough = 쓰러지지 않는다(밟으면 튀어 오르기만, 옆으로 닿으면 맞음). 짖는 강아지는 「쓰러짐」이 아니라 놀라 도망간다(화면이 그렇게 그린다)
  const ENEMY = {
    brush: { w: 0.9, h: 0.7, v: 1.6, ai: "walk" }, // 칫솔: 바닥을 오가며 걷는다
    bubble: { w: 0.8, h: 0.8, ai: "float", bob: 0.45, bobHz: 0.7 }, // 목욕 거품: 제자리에 둥둥
    minivac: { w: 1.0, h: 0.5, v: 2.4, ai: "walk" }, // 꼬마 로봇 청소기(1-3, 보스의 졸개)
    dust: { w: 0.6, h: 0.5, v: 2.0, ai: "walk" }, // 먼지 뭉치(보스가 뱉는다)
    yapper: { w: 0.9, h: 0.9, ai: "bark", every: 2.4, range: 9 }, // 짖는 강아지: 코코 쪽으로 짖음 파동(스키로 밑을 지나거나 뛰어넘는다)
    crate: { w: 0.9, h: 0.9, v: 3.2, ai: "roll" }, // 굴러오는 과일 상자(1-2)
    bike: { w: 1.8, h: 1.2, v: 9, ai: "dash", tough: true, range: 11, ring: 0.9 }, // 자전거: 따릉 → 달려온다(뛰어넘는다)
    vacuum_king: { w: 3.2, h: 1.3, ai: "boss", tough: true }, // 로봇 청소기 대왕
  };
  const BOSS = { HP: 3, INTRO: 1.4, ROAM: 2.4, ROAM_V: 1.8, WIND: 0.8, CHARGE_V: 9, STUN: 2.2, HURT: 0.8, SPEEDUP: 1.2, DUST_MAX: 2, DOWN: 1.6 };
  const WAVE = { w: 0.5, h: 0.55, y: 0.5, v: 5, life: 2.4 }; // 짖음 파동: 바닥 0.5 칸 위로 떠서 온다 — 스키 몸(키 0.45)은 밑으로 지나간다
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

  // 빠진 칸은 빈 목록으로(맵 자료가 짧게 쓰이게)
  function norm(L) {
    for (const k of ["solids", "semis", "enemies", "picks", "signs", "hazards", "movers", "spawners"]) if (!L[k]) L[k] = [];
    if (L.goal == null) L.goal = Infinity;
    return L;
  }
  function addLevel(L) { LEVELS[L.id] = norm(L); return L; }
  function mkEnemy(g, e) {
    const E = ENEMY[e.kind];
    const o = { id: g.en.length, kind: e.kind, x: e.x, y: e.y, y0: e.y, x0: e.x0 == null ? e.x : e.x0, x1: e.x1 == null ? e.x : e.x1, vx: (e.dir || -1) * (E.v || 0), vy: 0, dead: false, gone: false, t: 0, face: e.dir || -1, cd: E.every || 0, st: "wait", stT: 0 };
    if (E.ai === "boss") Object.assign(o, { hp: BOSS.HP, st: "intro", stT: BOSS.INTRO, mul: 1, arena: e.arena });
    g.en.push(o); return o;
  }
  function create(level, opts) {
    const L = norm(typeof level === "string" ? LEVELS[level] : level);
    opts = opts || {};
    const g = {
      L, id: L.id, t: 0, frame: 0, state: "play", score: 0, bones: 0, snacks: 0, kills: 0, hurts: 0, pits: 0, cp: false,
      p: { x: L.spawn[0], y: L.spawn[1], vx: 0, vy: 0, face: 1, ground: true, coyote: 0, buffer: 0, cut: false, scoot: 0, scootCd: 0, spin: 0, spinUsed: false, iframe: 0, lock: 0, hearts: opts.hearts || TUNE.HEARTS, airT: 0, lastGroundX: L.spawn[0] },
      en: [], pr: [], signs: {},
      mv: L.movers.map((m, i) => ({ id: i, x: m.x, y: m.y, w: m.w, dx: 0, dy: 0 })),
      sp: L.spawners.map((s) => ({ t: s.first == null ? 0.5 : s.first })),
      pk: L.picks.map((k, i) => ({ id: i, kind: k.kind, x: k.x, y: k.y, got: false })),
      ev: [], log: [],
    };
    g.p.on = -1;
    L.enemies.forEach((e) => mkEnemy(g, e));
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
    p.x = at[0]; p.y = at[1]; p.vx = 0; p.vy = 0; p.ground = true; p.on = -1; p.scoot = 0; p.spin = 0; p.spinUsed = false; p.buffer = 0; p.coyote = 0; p.face = 1;
  }

  function step(g, inp) {
    inp = inp || {};
    g.ev.length = 0;
    if (g.state !== "play") return g.ev;
    const T = TUNE, dt = T.DT, p = g.p, L = g.L;
    g.t += dt; g.frame++;
    // 움직이는 발판: 새 자리 → 그 위에 서 있던 코코를 같이 옮긴다
    L.movers.forEach((m, i) => {
      const M = g.mv[i], ph = Math.PI * 2 * (m.hz || 0.3) * g.t + (m.phase || 0);
      const nx = m.x + (m.ax || 0) * Math.sin(ph), ny = m.y + (m.ay || 0) * Math.sin(ph);
      M.dx = nx - M.x; M.dy = ny - M.y; M.x = nx; M.y = ny;
      if (p.on === i && p.ground) { p.x += M.dx; p.y = M.y; }
    });
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
    const wasOn = p.on; p.on = -1;
    if (p.vy <= 0) g.mv.forEach((M, i) => {
      const prevTop = M.y - M.dy;
      if (prevY >= prevTop - 0.02 && p.y < M.y + 1e-6 && b[0] < M.x + M.w && b[0] + b[2] > M.x) { p.y = M.y; p.vy = 0; p.ground = true; p.on = i; }
    });
    // 땅에 붙어 있는지(내리막 한 걸음 — 발밑 0.02 칸 아래를 본다): 서 있다가 끝을 지나면 공중
    if (!p.ground && wasGround && p.vy <= 0) {
      if (solidAt(L, b[0], p.y - 0.02, b[2], 0.02) || L.semis.some((s) => Math.abs(p.y - s[1]) < 1e-6 && b[0] < s[0] + s[2] && b[0] + b[2] > s[0])) { p.ground = true; p.vy = 0; }
      else if (wasOn >= 0) { const M = g.mv[wasOn]; if (Math.abs(p.y - M.y) < 0.05 && b[0] < M.x + M.w && b[0] + b[2] > M.x) { p.ground = true; p.vy = 0; p.y = M.y; p.on = wasOn; } }
    }
    if (p.ground) {
      if (!wasGround) emit(g, "land", { x: +p.x.toFixed(3), airT: +p.airT.toFixed(3) });
      p.spinUsed = false; p.lastGroundX = p.x;
    } else p.airT += dt;

    // 생성기(굴러오는 상자 등): 코코가 가까이 있을 때만 돈다
    L.spawners.forEach((S, i) => {
      if (Math.abs(p.x - S.x) > (S.near || 16)) return;
      const st = g.sp[i]; st.t -= dt;
      if (st.t > 0) return;
      st.t = S.every || 2.5;
      if (g.en.filter((e) => !e.dead && !e.gone && e.src === i).length >= (S.max || 3)) return;
      const e = mkEnemy(g, { kind: S.kind, x: S.x, y: S.y, dir: S.dir || -1 }); e.src = i; e.st = "go";
      emit(g, "spawn", { kind: S.kind, id: e.id });
    });
    // 적
    b = pbox(p);
    const atk = p.spin > 0 ? [b[0] - T.SPIN_PAD, b[1] - 0.1, b[2] + 2 * T.SPIN_PAD, b[3] + 0.2] : null;
    for (const e of g.en) {
      if (e.dead || e.gone) continue;
      const E = ENEMY[e.kind];
      e.t += dt;
      think(g, e, E, dt);
      if (e.dead || e.gone) continue;
      const ex = e.x - E.w / 2, ey = e.y;
      const boss = E.ai === "boss", soft = boss && e.st === "stun"; // 대왕은 벽에 부딪혀 어지러울 때만 맞는다
      if (boss && (e.st === "hurt" || e.st === "down" || e.st === "intro")) continue;
      if (atk && hit(atk[0], atk[1], atk[2], atk[3], ex, ey, E.w, E.h)) {
        if (soft) { bossHit(g, e, "spin"); continue; }
        if (!E.tough) { kill(g, e, "spin"); continue; }
      }
      if (!hit(b[0], b[1], b[2], b[3], ex, ey, E.w, E.h)) continue;
      const fromTop = p.vy < 0 && prevY >= ey + E.h * 0.5;
      if (fromTop) {
        p.vy = inp.jump ? T.STOMP_V_HOLD : T.STOMP_V; p.cut = !inp.jump; p.spinUsed = false;
        if (soft) bossHit(g, e, "stomp"); else if (E.tough) emit(g, "bonk", { kind: e.kind, id: e.id }); else kill(g, e, "stomp");
        continue;
      }
      if (soft) continue; // 어지러운 대왕 옆에 닿아도 안 아프다
      if (p.scoot > 0 && !E.tough) { kill(g, e, "scoot"); continue; }
      hurt(g, e.x);
    }
    // 짖음 파동
    for (const w of g.pr) {
      if (w.gone) continue;
      w.x += w.vx * dt; w.life -= dt;
      if (w.life <= 0 || solidAt(L, w.x - WAVE.w / 2, w.y, WAVE.w, WAVE.h)) { w.gone = true; continue; }
      if (atk && hit(atk[0], atk[1], atk[2], atk[3], w.x - WAVE.w / 2, w.y, WAVE.w, WAVE.h)) { w.gone = true; emit(g, "pop", { x: +w.x.toFixed(2) }); continue; }
      if (hit(b[0], b[1], b[2], b[3], w.x - WAVE.w / 2, w.y, WAVE.w, WAVE.h)) { w.gone = true; hurt(g, w.x - w.vx); }
    }
    if (g.pr.length > 40) g.pr = g.pr.filter((w) => !w.gone);
    // 놓인 함정(거품 웅덩이 등): 닿으면 맞음
    for (const z of L.hazards) if (hit(b[0], b[1], b[2], b[3], z[0], z[1], z[2], z[3])) hurt(g, p.x - p.face);
    // 안내 표지(1-1 배우기): 지나가면 한 번
    for (const sg of L.signs) if (!g.signs[sg.id] && p.x >= sg.x) { g.signs[sg.id] = true; emit(g, "sign", { id: sg.id, text: sg.text }); }
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
    if (!g.cp && !L.boss && p.x >= L.cp[0] && p.ground) { g.cp = true; emit(g, "cp"); } // 보스 판은 체크포인트 없음(시작 자리 = 체크포인트라 첫 걸음에 「여기서부터 다시!」 가 떴다)
    if (g.state === "play" && p.x >= L.goal) { g.state = "clear"; emit(g, "clear", { time: +g.t.toFixed(2) }); }
    return g.ev;
  }
  function kill(g, e, how) { e.dead = true; g.kills++; g.score += SCORE.enemy; emit(g, "kill", { kind: e.kind, how, id: e.id }); }

  // 적 움직임(종류별)
  function think(g, e, E, dt) {
    const p = g.p, L = g.L;
    if (E.ai === "walk") {
      e.x += e.vx * dt;
      if (e.x < e.x0) { e.x = e.x0; e.vx = Math.abs(e.vx); } if (e.x > e.x1) { e.x = e.x1; e.vx = -Math.abs(e.vx); }
      e.face = Math.sign(e.vx) || e.face;
    } else if (E.ai === "float") e.y = e.y0 + E.bob * Math.sin(Math.PI * 2 * E.bobHz * e.t);
    else if (E.ai === "bark") {
      if (Math.abs(p.x - e.x) > E.range) { e.cd = Math.max(e.cd, 0.9); return; }
      e.face = Math.sign(p.x - e.x) || e.face;
      e.cd -= dt; e.warn = e.cd < 0.5; // 짖기 0.5 초 전 몸을 웅크린다(화면이 그린다)
      if (e.cd <= 0) { e.cd = E.every; g.pr.push({ x: e.x + e.face * 0.6, y: e.y + WAVE.y, vx: e.face * WAVE.v, life: WAVE.life, gone: false }); emit(g, "bark", { id: e.id }); }
    } else if (E.ai === "roll") {
      e.x += e.vx * dt;
      const under = solidAt(L, e.x - E.w / 2 + 0.05, e.y - 0.04, E.w - 0.1, 0.04);
      if (under && e.vy <= 0) { e.y = under[1] + under[3]; e.vy = 0; } else { e.vy -= TUNE.G_DOWN * dt; e.y += e.vy * dt; }
      if (solidAt(L, e.x - E.w / 2 + (e.vx > 0 ? E.w - 0.05 : 0), e.y + 0.1, 0.05, E.h - 0.2)) { e.gone = true; emit(g, "break", { id: e.id }); }
      if (e.y < TUNE.PIT_Y) e.gone = true;
    } else if (E.ai === "dash") {
      if (e.st === "wait") { if (p.x < e.x && e.x - p.x < E.range) { e.st = "ring"; e.stT = E.ring; emit(g, "bell", { id: e.id }); } }
      else if (e.st === "ring") { e.stT -= dt; if (e.stT <= 0) e.st = "go"; }
      else { e.x -= E.v * dt; if (e.x < p.x - 22 || e.x < -10) e.gone = true; }
    } else if (E.ai === "boss") bossThink(g, e, E, dt);
  }
  function bossThink(g, e, E, dt) {
    const p = g.p, B = BOSS, [a0, a1] = e.arena;
    e.stT -= dt;
    if (e.st === "intro") { if (e.stT <= 0) { e.st = "roam"; e.stT = B.ROAM; emit(g, "boss_go"); } return; }
    if (e.st === "roam") {
      const d = Math.sign(p.x - e.x); e.face = d || e.face;
      e.x += d * B.ROAM_V * e.mul * dt;
      if (e.stT <= 0) {
        if (g.en.filter((x) => x.kind === "dust" && !x.dead && !x.gone).length < B.DUST_MAX) { mkEnemy(g, { kind: "dust", x: e.x, y: 0, x0: a0 + 0.5, x1: a1 - 0.5, dir: -e.face }); emit(g, "spit", { id: e.id }); }
        e.st = "wind"; e.stT = B.WIND; e.face = Math.sign(p.x - e.x) || e.face; emit(g, "boss_wind");
      }
    } else if (e.st === "wind") { if (e.stT <= 0) e.st = "charge"; }
    else if (e.st === "charge") {
      e.x += e.face * B.CHARGE_V * e.mul * dt;
      if (e.x - E.w / 2 <= a0 || e.x + E.w / 2 >= a1) { e.x = Math.max(a0 + E.w / 2, Math.min(a1 - E.w / 2, e.x)); e.st = "stun"; e.stT = B.STUN; emit(g, "boss_bump"); }
    } else if (e.st === "stun") { if (e.stT <= 0) { e.st = "roam"; e.stT = B.ROAM; } }
    else if (e.st === "hurt") { if (e.stT <= 0) { e.st = "roam"; e.stT = B.ROAM * 0.7; } }
    else if (e.st === "down") { if (e.stT <= 0 && g.state === "play") { e.dead = true; g.state = "clear"; emit(g, "clear", { time: +g.t.toFixed(2) }); } }
    e.x = Math.max(a0 + E.w / 2, Math.min(a1 - E.w / 2, e.x));
  }
  function bossHit(g, e, how) {
    e.hp--; g.score += 100; emit(g, "boss_hit", { hp: e.hp, how });
    if (e.hp <= 0) { e.st = "down"; e.stT = BOSS.DOWN; g.en.forEach((x) => { if (x.kind === "dust") x.gone = true; }); emit(g, "boss_down"); }
    else { e.st = "hurt"; e.stT = BOSS.HURT; e.mul *= BOSS.SPEEDUP; }
  }

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

  export { TUNE, SCORE, ENEMY, BOSS, WAVE, LEVELS, ZONES, addLevel, create, step, respawn, pose, pbox, headroom };
