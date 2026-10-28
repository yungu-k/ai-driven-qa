// 그냥 오락실 B 「코코의 하루」 — 소재 파일(수치표 + 갈고리). 뼈대는 docs/lab-surv-core.js(= src/lab/survivors/core.ts).
// 규격 docs/lab-surv-coco-spec.md. 🔴 표와 코드가 다르면 코드가 맞다.
// 고유 장치: 멈춰 앉으면 「기운」이 찬다(앉기 → 꼬리 흔들기 → 뱅글뱅글). 움직이는 순간 모은 기운이 「똥꼬 스키」 질주로 터진다.
// 다른 셋은 계속 움직이는 맛, 코코는 멈출지 갈지 고르는 맛. 너무 오래 앉아 있으면 다른 강아지가 다가오고, 초인종이 울리면 짖느라 기운이 날아간다.
(function (root) {
  "use strict";
  const C = root.SurvCore || (typeof require === "function" ? require("./lab-surv-core.js") : null);

  // ── 수치표 ──────────────────────────────────────────────
  const PLAYER = { r: 5, hp: 100, speed: 58, magnet: 22, regen: 0.25 };
  // 기운: 멈춰 있으면 초당 rate 만큼(0..100). 34·67·100 에서 단계가 바뀐다(앉기·꼬리·뱅글).
  // 움직이면 기운이 min 이상일 때 똥꼬 스키로 터지고, 모자라면 drain 으로 빠진다.
  const CHARGE = { rate: 40, min: 34, drain: 150, tiers: [34, 67, 100], still: 0.05 };
  // 똥꼬 스키: 거리 = dist0 + distK × 기운, dur 초 동안 미끄러진다(그동안 안 아프다). 지나간 자리 r 안의 적에게 피해 한 번.
  const SCOOT = { dist0: 30, distK: 0.7, dur: 0.35, r: 9, dmg0: 8, dmgK: 0.45, kb: 60 };
  // 뱅글뱅글: 기운이 다 찬 채로 터지면 출발 자리에서 바람 고리가 한 번 퍼진다.
  const SPIN = { R: 38, dmg: 26, kb: 80 };
  // 오래 앉기: 기운이 다 찬 뒤 after 초가 지나면 every 초마다 다른 강아지가 dist 밖에서 다가온다.
  const OVERSIT = { after: 3, every: 2.5, dist: 70 };

  // 별가루(xp)는 C 보다 적다 — 떼가 더 많고 스키·고리가 한꺼번에 잡아서 레벨이 너무 빨리 올랐다(10분 42단계)
  const ENEMIES = {
    brush: { name: "칫솔", hp: 7, speed: 30, r: 3.5, dmg: 2, xp: 0.9 },
    suds: { name: "목욕 거품", hp: 14, speed: 22, r: 5, dmg: 3, xp: 0.8, split: { kind: "suds_s", n: 2 } },
    suds_s: { name: "작은 거품", hp: 4, speed: 34, r: 2.5, dmg: 1, xp: 0.4 },
    bell: { name: "초인종", hp: 40, speed: 12, r: 5, dmg: 3, xp: 4, ring: { every: 4.5, warn: 0.6, R: 70 } },
    vacuum: { name: "청소기", hp: 150, speed: 14, r: 8, dmg: 6, xp: 8, pull: { R: 46, v: 20 } },
    dog: { name: "다른 강아지", hp: 20, speed: 48, r: 5.5, dmg: 4, xp: 3 },
    boss_vacuum: { name: "로봇 청소기 대왕", boss: true, hp: 2600, speed: 20, r: 19, dmg: 8, xp: 0, pull: { R: 90, v: 30 }, summon: { kind: "brush", n: 4, every: 8 } },
    boss_bath: { name: "목욕 시간", boss: true, hp: 5400, speed: 16, r: 21, dmg: 10, xp: 0, puddle: { every: 5, warn: 1.0, life: 5, r: 30, slow: 0.5 }, ringEvery: 9, ringN: 14 },
  };
  // 초인종이 울릴 때 코코가 R 안에 있으면: barkT 초 못 움직이고(짖는다) 기운이 0 이 된다. 짖음은 둘레 R 에 dmg.
  const BARK = { stun: 0.5, R: 28, dmg: 8 };

  const DIRECTOR = [
    { t: 0, rate: 1.0, cap: 30, mix: { brush: 1 } },
    { t: 60, rate: 2.0, cap: 50, mix: { brush: 3, suds: 1 } },
    { t: 120, rate: 4.0, cap: 80, mix: { brush: 3, suds: 2, bell: 0.4 } },
    { t: 180, rate: 5.0, cap: 100, mix: { brush: 3, suds: 2, bell: 0.6, dog: 0.6 } },
    { t: 240, rate: 6.0, cap: 120, mix: { brush: 2, suds: 2, bell: 0.7, dog: 1, vacuum: 0.3 } },
    { t: 300, rate: 4.0, cap: 100, mix: { brush: 3, suds: 1 } }, // 로봇 청소기 대왕 동안 숨 돌림
    { t: 360, rate: 7.0, cap: 140, mix: { brush: 3, suds: 2, bell: 0.8, dog: 1.2, vacuum: 0.6 } },
    { t: 420, rate: 8.0, cap: 150, mix: { brush: 3, suds: 2.5, bell: 0.9, dog: 1.5, vacuum: 0.8 } },
    { t: 480, rate: 9.0, cap: 150, mix: { brush: 3, suds: 3, bell: 1, dog: 1.8, vacuum: 1 } },
    { t: 540, rate: 5.0, cap: 120, mix: { brush: 3, suds: 2, dog: 1 } }, // 목욕 시간
    { t: 585, rate: 10.0, cap: 150, mix: { brush: 4, suds: 3, dog: 1 } }, // 저녁밥 직전 몰아치기
  ];
  const EVENTS = [
    { t: 150, ring: "brush", n: 22, R: 70, say: "칫솔이 둘러싼다" },
    { t: 300, boss: "boss_vacuum", say: "로봇 청소기 대왕이 온다 — 빨려 들어가지 마" },
    { t: 390, ring: "suds", n: 24, R: 78, say: "거품이 몰려온다" },
    { t: 480, ring: "brush", n: 36, R: 74 },
    { t: 540, boss: "boss_bath", say: "목욕 시간이다!" },
    { t: 585, say: "고기 냄새가 난다" },
  ];
  const HP_BY_MIN = [1, 1.15, 1.45, 1.8, 2.2, 2.6, 3.1, 3.6, 4.2, 5.0]; // C 보다 가파르다 — 스키 무적·뱅글 고리 몫(규격 5절)

  // 무기: 습관에서. kind 는 뼈대의 행동 다섯 가지.
  const WEAPONS = {
    ball: {
      name: "삑삑이 공", kind: "shot",
      lv: [
        { dmg: 8, period: 1.0, n: 1, speed: 150, range: 100, pierce: 1, r: 3, kb: 40 },
        { dmg: 10, period: 0.95, n: 1, speed: 150, range: 100, pierce: 1, r: 3, kb: 40 },
        { dmg: 10, period: 0.9, n: 2, speed: 150, range: 100, pierce: 1, r: 3, kb: 40 },
        { dmg: 13, period: 0.85, n: 2, speed: 160, range: 110, pierce: 2, r: 3, kb: 45 },
        { dmg: 15, period: 0.8, n: 3, speed: 160, range: 110, pierce: 2, r: 3, kb: 45 },
      ],
      evo: { with: "dmg", name: "공 세 개 동시에", dmg: 18, period: 0.7, n: 5, spread: 0.3, speed: 170, range: 120, pierce: 3, r: 4, kb: 55 },
    },
    wag: {
      name: "꼬리 바람", kind: "aura", // 앉아 있는 동안 두 배(weaponMod)
      lv: [
        { R: 20, dps: 5, tick: 0.5 },
        { R: 23, dps: 7, tick: 0.5 },
        { R: 26, dps: 9, tick: 0.5, slow: 0.15 },
        { R: 29, dps: 12, tick: 0.5, slow: 0.2 },
        { R: 32, dps: 15, tick: 0.5, slow: 0.25 },
      ],
      evo: { with: "cd", name: "프로펠러 꼬리", R: 40, dps: 20, tick: 0.5, slow: 0.4 },
    },
    bark: {
      name: "멍멍", kind: "drop",
      lv: [
        { dmg: 18, period: 2.4, n: 1, r: 12, delay: 0.3 },
        { dmg: 22, period: 2.2, n: 2, r: 12, delay: 0.3 },
        { dmg: 28, period: 2.2, n: 2, r: 13, delay: 0.3 },
        { dmg: 32, period: 2.1, n: 3, r: 14, delay: 0.3 },
        { dmg: 38, period: 2.0, n: 4, r: 16, delay: 0.3 },
      ],
      evo: { with: "area", name: "온 동네 멍멍", dmg: 46, period: 1.8, n: 8, r: 18, delay: 0.3 },
    },
    toy: {
      name: "인형 휘두르기", kind: "orbit",
      lv: [
        { n: 1, R: 22, r: 6, spin: 3.2, dmg: 9, tick: 0.5, kb: 35 },
        { n: 2, R: 22, r: 6, spin: 3.2, dmg: 10, tick: 0.5, kb: 35 },
        { n: 2, R: 24, r: 6, spin: 3.3, dmg: 13, tick: 0.5, kb: 40 },
        { n: 3, R: 24, r: 7, spin: 3.3, dmg: 15, tick: 0.5, kb: 40 },
        { n: 4, R: 26, r: 7, spin: 3.4, dmg: 18, tick: 0.5, kb: 45 },
      ],
      evo: { with: "hp", name: "인형 친구들", n: 6, R: 28, r: 8, spin: 3.6, dmg: 24, tick: 0.45, kb: 55 },
    },
    chew: {
      name: "개껌 굴리기", kind: "lob",
      lv: [
        { dmg: 6, period: 2.6, n: 1, r: 8, speed: 46, life: 2.2, tick: 0.4 },
        { dmg: 8, period: 2.5, n: 1, r: 9, speed: 46, life: 2.4, tick: 0.4 },
        { dmg: 9, period: 2.4, n: 2, r: 9, speed: 48, life: 2.4, tick: 0.4 },
        { dmg: 11, period: 2.3, n: 2, r: 10, speed: 48, life: 2.6, tick: 0.35 },
        { dmg: 13, period: 2.2, n: 3, r: 11, speed: 50, life: 2.8, tick: 0.35 },
      ],
      evo: { with: "move", name: "개껌 산사태", dmg: 16, period: 1.6, n: 4, r: 13, speed: 52, life: 3.2, tick: 0.3 },
    },
  };
  const PASSIVES = { dmg: "고기 힘", cd: "간식 기대", area: "곱슬 털", move: "긴 다리", hp: "상추 한 입", magnet: "훔쳐 먹는 코" };
  // 소재 고유 카드: 기운 축. 칸을 차지하지 않는다.
  const THEME_CARDS = {
    sit: { name: "간식 앞에서 앉기", max: 3, wt: 1.3, rate: 0.3 }, // 기운 차는 속도 +30 %/단계
    scoot: { name: "똥꼬 스키", max: 3, wt: 1.2, dist: 0.2, dmg: 0.25 }, // 거리 +20 %, 피해 +25 %/단계
    spin: { name: "뱅글뱅글", max: 3, wt: 1.0, R: 10, dmg: 20 }, // 바람 고리 반경·피해 +/단계
    calm: { name: "얌전히", max: 2, wt: 0.9, regen: 0.8 }, // 앉아 있는 동안 초당 회복 +0.8/단계
    sneak: { name: "몰래 먹기", max: 2, wt: 0.9, R: 30, heal: 1 }, // 1: 스키 길 30 안 간식을 먹는다 · 2: 하나에 1 회복
  };
  const DROPS = { heal: 0.015, magnet: 0.003, healAmt: 25, bossDust: 30 };

  const DATA = { WORLD: 540, DURATION: 600, PLAYER, CHARGE, SCOOT, SPIN, OVERSIT, BARK, ENEMIES, DIRECTOR, EVENTS, HP_BY_MIN, WEAPONS, PASSIVES, THEME_CARDS, DROPS, START_WEAPONS: ["ball"] };

  // ── 기운 ─────────────────────────────────────────────────
  function lv(g, k) { return g.themeLv[k] || 0; }
  function init(g) {
    g.coco = { gauge: 0, still: true, wasStill: true, fullT: 0, dogT: 0, barkT: 0, dash: null, scoots: 0, bigScoots: 0, waves: [] };
    g.zones = []; // 목욕 물웅덩이
    g.trails = []; // 똥꼬 스키 자국(그리기용)
  }
  // 코코의 지금 모습: 그리기가 읽는다
  function pose(g) {
    const c = g.coco;
    if (g.state === "lost") return "nap";
    if (c.dash) return "scoot";
    if (c.barkT > 0) return "bark";
    if (!c.still) return "walk";
    const [a, b] = CHARGE.tiers;
    return c.gauge >= b ? "spin" : c.gauge >= a ? "wag" : "sit";
  }

  function playerMod(g, dt) {
    const c = g.coco;
    if (c.barkT > 0) { c.barkT -= dt; g.p.slow = 1; } // 짖는 동안 못 움직인다
    for (const z of g.zones) {
      if (z.warn > 0) continue;
      if ((g.p.x - z.x) ** 2 + (g.p.y - z.y) ** 2 <= z.r * z.r) g.p.slow = Math.max(g.p.slow, z.slow);
    }
    if (c.still && !c.dash) {
      const cl = lv(g, "calm");
      if (cl) g.p.hp = Math.min(g.p.maxHp, g.p.hp + cl * THEME_CARDS.calm.regen * dt);
    }
  }

  function release(g, dx, dy) {
    const c = g.coco, d = Math.hypot(dx, dy) || 1, s = lv(g, "scoot"), TC = THEME_CARDS.scoot;
    const dist = (SCOOT.dist0 + SCOOT.distK * c.gauge) * (1 + s * TC.dist);
    const dmg = (SCOOT.dmg0 + SCOOT.dmgK * c.gauge) * (1 + s * TC.dmg) * (1 + (g.passives.dmg || 0) * C.PASSIVE_AXES.dmg);
    c.dash = { t: SCOOT.dur, vx: (dx / d) * (dist / SCOOT.dur), vy: (dy / d) * (dist / SCOOT.dur), dmg, id: ++c.scoots, pts: [[g.p.x, g.p.y]], full: c.gauge >= 100 };
    if (c.gauge >= 100) {
      c.bigScoots++;
      const sp = lv(g, "spin"), R = (SPIN.R + sp * THEME_CARDS.spin.R) * (1 + (g.passives.area || 0) * C.PASSIVE_AXES.area);
      const wd = (SPIN.dmg + sp * THEME_CARDS.spin.dmg) * (1 + (g.passives.dmg || 0) * C.PASSIVE_AXES.dmg);
      C.near(g, g.p.x, g.p.y, R + 20, (e) => {
        if ((e.x - g.p.x) ** 2 + (e.y - g.p.y) ** 2 <= (R + e.r) ** 2) C.damage(g, e, wd, "spin", { kb: SPIN.kb });
      });
      c.waves.push({ x: g.p.x, y: g.p.y, R, life: 0.4 });
      g.events.push({ e: "spin", R });
    }
    g.events.push({ e: "scoot", gauge: Math.round(c.gauge), dist: Math.round(dist) });
    c.gauge = 0;
    c.fullT = 0;
  }

  function afterMove(g, dt) {
    const c = g.coco, p = g.p;
    const m = Math.hypot(g.input.x, g.input.y);
    c.still = m < CHARGE.still || c.barkT > 0;
    if (c.dash) {
      const D = c.dash;
      p.x = C.clamp(p.x + D.vx * dt, 6, g.world - 6);
      p.y = C.clamp(p.y + D.vy * dt, 8, g.world - 4);
      p.iframe = Math.max(p.iframe, 0.12); // 미끄러지는 동안은 안 아프다
      D.pts.push([p.x, p.y]);
      if (lv(g, "sneak")) for (const s of g.dust) if ((s.x - p.x) ** 2 + (s.y - p.y) ** 2 < THEME_CARDS.sneak.R ** 2) s.pull = true;
      D.t -= dt;
      if (D.t <= 0) {
        g.trails.push({ pts: D.pts, life: 0.8 });
        c.dash = null;
      }
    } else if (c.still) {
      const rate = CHARGE.rate * (1 + lv(g, "sit") * THEME_CARDS.sit.rate);
      c.gauge = Math.min(100, c.gauge + rate * dt);
      if (c.gauge >= 100) c.fullT += dt;
    } else if (c.wasStill && c.gauge >= CHARGE.min) {
      release(g, g.input.x, g.input.y);
    } else {
      c.gauge = Math.max(0, c.gauge - CHARGE.drain * dt);
      c.fullT = 0;
    }
    c.wasStill = c.still;
    // 청소기가 빨아들인다(미끄러지는 중엔 안 끌린다)
    if (!c.dash) {
      C.near(g, p.x, p.y, 100, (e) => {
        const pl = ENEMIES[e.kind].pull;
        if (!pl) return;
        const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
        if (d > pl.R) return;
        p.x += (dx / d) * pl.v * dt;
        p.y += (dy / d) * pl.v * dt;
      });
    }
  }

  function onSpawn(g, e) {
    const def = ENEMIES[e.kind];
    if (def.ring) e.ringT = def.ring.every * (0.5 + g.r() * 0.5);
    if (e.boss) { e.sumT = 0; e.puddleT = def.puddle ? def.puddle.every : 0; e.ringT2 = def.ringEvery || 0; }
  }
  function onKill(g, e) {
    const sp = ENEMIES[e.kind].split;
    if (sp) for (let i = 0; i < sp.n; i++) C.spawnAt(g, sp.kind, e.x + (i ? 3 : -3), e.y);
    if (e.boss) g.pickups.push({ kind: "heal", x: e.x + 8, y: e.y }); // 고기(회복) 하나 더
    if (g.coco.dash && lv(g, "sneak") >= 2) g.p.hp = Math.min(g.p.maxHp, g.p.hp + THEME_CARDS.sneak.heal);
  }

  function bossStep(g, e, dt) {
    const def = ENEMIES[e.kind];
    if (def.summon) {
      e.sumT += dt;
      if (e.sumT >= def.summon.every) {
        e.sumT = 0;
        for (let i = 0; i < def.summon.n; i++) C.spawnAt(g, def.summon.kind, e.x + (g.r() - 0.5) * 40, e.y + (g.r() - 0.5) * 40);
        g.events.push({ e: "summon", en: e });
      }
    }
    if (def.puddle) {
      e.puddleT -= dt;
      if (e.puddleT <= 0) {
        e.puddleT = def.puddle.every;
        g.zones.push({ x: g.p.x, y: g.p.y, r: def.puddle.r, warn: def.puddle.warn, life: def.puddle.life, slow: def.puddle.slow });
        g.events.push({ e: "puddle", x: g.p.x, y: g.p.y });
      }
      e.ringT2 -= dt;
      if (e.ringT2 <= 0) {
        e.ringT2 = def.ringEvery;
        for (let i = 0; i < def.ringN; i++) {
          const a = (i / def.ringN) * Math.PI * 2;
          C.spawnAt(g, "suds", g.p.x + Math.cos(a) * 80, g.p.y + Math.sin(a) * 80);
        }
      }
    }
    return 1;
  }

  function afterEnemies(g, dt) {
    const c = g.coco, p = g.p;
    // 똥꼬 스키: 지나가며 닿은 적에게 한 번씩
    if (c.dash) {
      const D = c.dash, key = "scoot" + D.id;
      C.near(g, p.x, p.y, SCOOT.r + 24, (e) => {
        if (e.hc[key] || (e.x - p.x) ** 2 + (e.y - p.y) ** 2 > (SCOOT.r + e.r) ** 2) return;
        e.hc[key] = 1;
        C.damage(g, e, D.dmg * (e.boss ? 0.5 : 1), "scoot", { kb: SCOOT.kb, fx: p.x - D.vx, fy: p.y - D.vy });
      });
    }
    // 초인종: 울리면 R 안의 코코가 짖는다 — 기운이 날아가고 잠깐 못 움직인다(짖음은 둘레를 친다)
    for (const e of g.enemies) {
      const rg = ENEMIES[e.kind].ring;
      if (!rg || e.dead) continue;
      e.ringT -= dt;
      e.ringing = e.ringT <= rg.warn;
      if (e.ringT > 0) continue;
      e.ringT = rg.every;
      if (c.dash || (e.x - p.x) ** 2 + (e.y - p.y) ** 2 > rg.R * rg.R) continue;
      c.barkT = BARK.stun;
      c.gauge = 0;
      c.fullT = 0;
      C.near(g, p.x, p.y, BARK.R + 20, (o) => { if ((o.x - p.x) ** 2 + (o.y - p.y) ** 2 <= (BARK.R + o.r) ** 2) C.damage(g, o, BARK.dmg, "bellbark"); });
      g.events.push({ e: "bellbark", en: e });
    }
    // 오래 앉기: 다른 강아지가 다가온다
    if (c.still && c.gauge >= 100 && c.fullT >= OVERSIT.after) {
      c.dogT -= dt;
      if (c.dogT <= 0) {
        c.dogT = OVERSIT.every;
        const a = g.r() * Math.PI * 2;
        C.spawnAt(g, "dog", p.x + Math.cos(a) * OVERSIT.dist, p.y + Math.sin(a) * OVERSIT.dist);
        g.events.push({ e: "otherdog" });
      }
    } else c.dogT = 0;
  }

  function afterStep(g, dt) {
    for (const z of g.zones) { if (z.warn > 0) z.warn -= dt; else z.life -= dt; }
    g.zones = g.zones.filter((z) => z.life > 0);
    for (const t of g.trails) t.life -= dt;
    g.trails = g.trails.filter((t) => t.life > 0);
    for (const w of g.coco.waves) w.life -= dt;
    g.coco.waves = g.coco.waves.filter((w) => w.life > 0);
    if (g.state === "play" && g.time >= DATA.DURATION) {
      for (const e of g.enemies) e.dead = true; // 저녁밥: 남은 것들은 물러간다
      g.events.push({ e: "dinner" });
    }
  }

  function weaponMod(g, w, s) {
    if (w.key === "wag" && g.coco.still) s.dps *= 2; // 앉아서 흔드는 꼬리가 진짜 꼬리 바람
  }

  // 랭크 점수: 버틴 시간이 주, 큰 스키(기운 가득)가 부.
  function score(g) {
    const won = g.state === "won";
    return Math.floor(g.time) * 10 + g.kills + g.coco.bigScoots * 30 + (won ? 5000 + Math.round(g.p.hp) * 20 : 0);
  }
  function tod(g) { return C.clamp(g.time / DATA.DURATION, 0, 1); } // 하루: 아침 0 → 저녁 1(그리기 몫)

  const THEME = { id: "coco", name: "코코의 하루", DATA, init, playerMod, afterMove, onSpawn, onKill, bossStep, afterEnemies, afterStep, weaponMod, score, pose, tod };
  if (typeof module !== "undefined" && module.exports) module.exports = THEME;
  else root.SurvCoco = THEME;
})(typeof window !== "undefined" ? window : globalThis);
