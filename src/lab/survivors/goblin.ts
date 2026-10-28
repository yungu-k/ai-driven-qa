// 그냥 오락실 A 「도깨비 퇴치」 — 소재 파일(수치표 + 갈고리). 뼈대는 ./core.ts.
// 규격 docs/lab-surv-goblin-spec.md. 🔴 표와 코드가 다르면 코드가 맞다.
// 시안 docs/lab-surv-goblin.js(md5 36fa0211…, 2판)를 그대로 옮긴 판이다. 동작은 바꾸지 않고 타입만 붙였다(tmp/lab-surv/equiv-goblin.mjs 가 잰다).
// 고유 장치: 「세는 도깨비」 — 설날 밤 체를 걸어 두면 야광귀가 구멍을 세느라 밤을 새운다는 민속에서.
// 꼬마가 지나간 자리에 체가 저절로 놓이고, 도깨비들이 그 둘레에 앉아 구멍을 센다(그동안 안 움직이고 안 아프다).
// 꼬마가 돌아와 체를 밟으면 「체 털기」 — 둘레를 한꺼번에 친다. 깔고, 끌고, 돌아와 터뜨린다.
import * as C from "./core.ts";
import type { DirectorRow, Enemy, EnemyDef, Game, Pos, ScheduleEvent, Theme, ThemeData, WeaponDef } from "./core.ts";

// ── 타입 ────────────────────────────────────────────────
// 종류 이름(적·무기·카드)은 뼈대와 같이 string 이다.
export type GoblinEnemyDef = EnemyDef & {
  /** 체에 끌리는 정도(1 = lure 그대로). 없으면 세지 않는다 */
  count?: number;
  summon?: { kind: string; n: number; every: number };
  dash?: { every: number; warn: number; dur: number; mul: number };
  grow?: { max: number; near: number; full: number; rate: number };
  ringEvery?: number;
  ringN?: number;
};
/** 소재가 적에 붙이는 칸. 원본처럼 처음엔 비어 있다(undefined) — 미리 0 으로 채우면 상태 대조가 갈린다.
 *  sieve·counting·seatK·angryT 는 세는 도깨비에, sumT·dash*·warnT·ringT·scale 은 보스에만 생긴다 */
export type GoblinEnemy = Enemy & {
  /** 가는 중이거나 앉아 있는 체 id(0·undefined = 없음) */
  sieve?: number;
  /** 체 둘레에 앉아 세는 중 */
  counting?: boolean;
  /** 앉은 차례(seatOf 로 고리·각도) */
  seatK?: number;
  /** 놓친 체에서 일어나 화난 남은 시간 */
  angryT?: number;
  sumT?: number;
  dashCd?: number;
  dashT?: number;
  warnT?: number;
  dashTo?: Pos;
  ringT?: number;
  scale?: number;
};
export type Sieve = {
  id: number;
  x: number;
  y: number;
  /** 준비까지 남은 시간(> 0 이면 아직) */
  arm: number;
  life: number;
  seated: number;
  /** 이 체로 가는 중인 수 */
  heading: number;
  /** 놓은 자리를 한 번 벗어났나(벗어난 뒤에만 털린다) */
  left: boolean;
  gone?: boolean;
};
export type BeanZone = { x: number; y: number; r: number; life: number; slow: number; dps: number };
export type Burst = { x: number; y: number; r: number; life: number };
export type GoblinGame = Omit<Game, "enemies" | "bossAlive" | "stats"> & {
  enemies: GoblinEnemy[];
  bossAlive: GoblinEnemy | null;
  stats: Game["stats"] & { burstN: number; burstMax: number };
  sieves: Sieve[];
  sieveT: number;
  beanZones: BeanZone[];
  /** 그리기용 */
  bursts: Burst[];
  nextSieve: number;
};
/** 그리기가 읽는 체 상태 */
export type SieveState = "arming" | "full" | "armed";

// ── 수치표 ──────────────────────────────────────────────
const PLAYER = { r: 5, hp: 100, speed: 56, magnet: 22, regen: 0.25 };
// 체: every 초마다 꼬마 발밑에 놓인다(다른 체 gap 안이면 건너뜀, 동시에 max 개).
// arm 초 뒤 준비, life 초 뒤 사라진다. lure 안의 「세는」 도깨비가 다가와 seatR 둘레에 앉는다(hold 마리까지).
// 꼬마가 한 번 touchR 밖으로 나갔다가 다시 밟으면 체 털기: burstR 안 모두에게 dmg0 + dmgPer × 앉은 수.
// 털린 자리의 살아남은 것은 daze 초 멍해진다(털자마자 옆의 방망이 도깨비에게 맞던 것을 막는다).
// 앉아 있던 도깨비는 죽든 안 죽든 엽전 coin 개를 흘린다(도깨비가 재물을 주는 민담) — 세는 동안 안 죽어 엽전이 모자랐다(규격 1-1).
const SIEVE = { every: 3.0, gap: 30, max: 3, arm: 0.8, life: 16, lure: 56, hold: 12, seatR: 9, touchR: 9, ringGap: 8, arrive: 6, burstR: 34, dmg0: 30, dmgPer: 16, coin: 1, daze: 1.5, bossMul: 0.5, angry: { mul: 1.3, dur: 3 } };

// count = 체에 끌리는 정도(1 = lure 그대로, 1.5 = 1.5 배 멀리서). 없으면 세지 않는다.
const ENEMIES: Record<string, GoblinEnemyDef> = {
  imp: { name: "꼬마 도깨비", hp: 7, speed: 30, r: 4, dmg: 2, xp: 1, count: 1 },
  wisp: { name: "도깨비불", hp: 6, speed: 52, r: 3.5, dmg: 2, xp: 1 },
  yagwang: { name: "야광귀", hp: 18, speed: 26, r: 4.5, dmg: 3, xp: 2, count: 1.5 },
  club: { name: "방망이 도깨비", hp: 150, speed: 14, r: 8, dmg: 5, xp: 8, count: 1 },
  foxfire: { name: "여우불", hp: 5, speed: 60, r: 3, dmg: 3, xp: 0.5 },
  gumiho: { name: "구미호", boss: true, hp: 2600, speed: 30, r: 18, dmg: 5, xp: 0, summon: { kind: "foxfire", n: 5, every: 6 }, dash: { every: 5, warn: 0.5, dur: 0.6, mul: 2.4 } },
  // 그슨대: 꼬마가 가까울수록(near 안) 커진다 — 몸·피해가 최대 grow 배. 멀어지면 줄어든다.
  geuseundae: { name: "그슨대", boss: true, hp: 5400, speed: 18, r: 14, dmg: 8, xp: 0, grow: { max: 2.2, near: 90, full: 20, rate: 1.5 }, ringEvery: 10, ringN: 14 },
};

// 감독 밀도는 C 와 같다(같은 뼈대·같은 체력 배수에서 소재만 바뀌게)
const DIRECTOR: DirectorRow[] = [
  { t: 0, rate: 2.0, cap: 40, mix: { imp: 1 } },
  { t: 60, rate: 3.0, cap: 60, mix: { imp: 3, wisp: 1 } },
  { t: 120, rate: 4.0, cap: 80, mix: { imp: 3, wisp: 2, yagwang: 0.8 } },
  { t: 180, rate: 5.0, cap: 100, mix: { imp: 3, wisp: 2, yagwang: 1 } },
  { t: 240, rate: 6.0, cap: 120, mix: { imp: 2, wisp: 2, yagwang: 1, club: 0.3 } },
  { t: 300, rate: 4.0, cap: 100, mix: { imp: 3, wisp: 1 } }, // 구미호 동안 숨 돌림
  { t: 360, rate: 7.0, cap: 140, mix: { imp: 3, wisp: 2, yagwang: 1.2, club: 0.6 } },
  { t: 420, rate: 8.0, cap: 150, mix: { imp: 3, wisp: 2.5, yagwang: 1.5, club: 0.8 } },
  { t: 480, rate: 9.0, cap: 150, mix: { imp: 3, wisp: 3, yagwang: 1.8, club: 1 } },
  { t: 540, rate: 5.0, cap: 120, mix: { imp: 3, wisp: 2 } }, // 그슨대
  { t: 585, rate: 10.0, cap: 150, mix: { imp: 4, wisp: 3, yagwang: 1 } }, // 닭 울기 직전 몰아치기
];
const EVENTS: ScheduleEvent[] = [
  { t: 150, ring: "imp", n: 22, R: 70, say: "도깨비가 둘러싼다" },
  { t: 300, boss: "gumiho", say: "구미호가 나타났다" },
  { t: 390, ring: "wisp", n: 28, R: 78, say: "도깨비불이 한꺼번에 켜진다" },
  { t: 480, ring: "imp", n: 36, R: 74 },
  { t: 540, boss: "geuseundae", say: "그슨대다 — 가까이 가면 커진다" },
  { t: 585, say: "닭이 울려고 한다" },
];
const HP_BY_MIN = [1, 1.1, 1.3, 1.5, 1.8, 2.1, 2.5, 2.9, 3.4, 4.0];

// 무기: 장터 물건. kind 는 뼈대 행동 다섯 가지.
const WEAPONS: Record<string, WeaponDef> = {
  yeot: {
    name: "엿 던지기", kind: "shot",
    lv: [
      { dmg: 8, period: 1.0, n: 1, speed: 150, range: 100, pierce: 1, r: 3, kb: 40 },
      { dmg: 10, period: 0.95, n: 1, speed: 150, range: 100, pierce: 1, r: 3, kb: 40 },
      { dmg: 10, period: 0.9, n: 2, speed: 150, range: 100, pierce: 1, r: 3, kb: 40 },
      { dmg: 13, period: 0.85, n: 2, speed: 160, range: 110, pierce: 2, r: 3, kb: 45 },
      { dmg: 15, period: 0.8, n: 3, speed: 160, range: 110, pierce: 2, r: 3, kb: 45 },
    ],
    evo: { with: "dmg", name: "엿가락 소나기", dmg: 18, period: 0.7, n: 5, spread: 0.3, speed: 170, range: 120, pierce: 3, r: 4, kb: 55 },
  },
  chime: {
    name: "풍경 소리", kind: "aura",
    lv: [
      { R: 22, dps: 6, tick: 0.5 },
      { R: 25, dps: 8, tick: 0.5 },
      { R: 28, dps: 10, tick: 0.5, slow: 0.15 },
      { R: 31, dps: 13, tick: 0.5, slow: 0.2 },
      { R: 34, dps: 16, tick: 0.5, slow: 0.25 },
    ],
    evo: { with: "cd", name: "큰 풍경", R: 44, dps: 22, tick: 0.5, slow: 0.4 },
  },
  bean: {
    name: "팥 뿌리기", kind: "drop",
    lv: [
      { dmg: 20, period: 2.4, n: 1, r: 12, delay: 0.45 },
      { dmg: 24, period: 2.2, n: 2, r: 12, delay: 0.45 },
      { dmg: 30, period: 2.2, n: 2, r: 13, delay: 0.45 },
      { dmg: 34, period: 2.1, n: 3, r: 14, delay: 0.45 },
      { dmg: 40, period: 2.0, n: 4, r: 16, delay: 0.45 },
    ],
    evo: { with: "area", name: "팥 소나기", dmg: 48, period: 1.8, n: 8, r: 18, delay: 0.45 },
  },
  jori: {
    name: "복조리 휘두르기", kind: "orbit",
    lv: [
      { n: 1, R: 24, r: 6, spin: 3.0, dmg: 9, tick: 0.5, kb: 30 },
      { n: 2, R: 24, r: 6, spin: 3.0, dmg: 10, tick: 0.5, kb: 30 },
      { n: 2, R: 26, r: 6, spin: 3.1, dmg: 13, tick: 0.5, kb: 35 },
      { n: 3, R: 26, r: 7, spin: 3.1, dmg: 15, tick: 0.5, kb: 35 },
      { n: 4, R: 28, r: 7, spin: 3.2, dmg: 18, tick: 0.5, kb: 40 },
    ],
    evo: { with: "hp", name: "복조리 바람", n: 6, R: 30, r: 8, spin: 3.4, dmg: 24, tick: 0.45, kb: 50 },
  },
  salt: {
    name: "소금 한 줌", kind: "lob",
    lv: [
      { dmg: 6, period: 2.6, n: 1, r: 9, speed: 40, life: 2.4, tick: 0.4 },
      { dmg: 8, period: 2.5, n: 1, r: 10, speed: 40, life: 2.6, tick: 0.4 },
      { dmg: 9, period: 2.4, n: 2, r: 10, speed: 42, life: 2.6, tick: 0.4 },
      { dmg: 11, period: 2.3, n: 2, r: 11, speed: 42, life: 2.8, tick: 0.35 },
      { dmg: 13, period: 2.2, n: 3, r: 12, speed: 44, life: 3.0, tick: 0.35 },
    ],
    evo: { with: "move", name: "왕소금", dmg: 16, period: 1.6, n: 4, r: 14, speed: 46, life: 3.4, tick: 0.3 },
  },
};
const PASSIVES = { dmg: "씨름 힘", cd: "장터 장단", area: "넓은 소매", move: "짚신", hp: "팥죽 한 그릇", magnet: "엽전 꾸러미" };
// 소재 고유 카드: 체 축. 칸 밖.
const THEME_CARDS = {
  more: { name: "체 하나 더", max: 2, wt: 1.2, add: 1 },
  holes: { name: "구멍 많은 체", max: 3, wt: 1.2, hold: 4, lure: 8 },
  shake: { name: "체 털기", max: 3, wt: 1.1, dmgPer: 3, R: 4 },
  beans: { name: "팥 체", max: 2, wt: 0.9, life: 3, slow: 0.4, dps: [6, 12], r: 26 }, // 털고 난 자리에 팥이 남는다
  quick: { name: "부지런한 손", max: 2, wt: 0.9, cut: 0.7 }, // 체 놓는 간격 −0.7 초/단계
};
const DROPS = { heal: 0.015, magnet: 0.003, healAmt: 25, bossDust: 30 };

export const DATA = { WORLD: 540, DURATION: 600, PLAYER, SIEVE, ENEMIES, DIRECTOR, EVENTS, HP_BY_MIN, WEAPONS, PASSIVES, THEME_CARDS, DROPS, START_WEAPONS: ["yeot"] } satisfies ThemeData & Record<string, unknown>; // SIEVE 는 소재 몫 칸

// ── 체 ───────────────────────────────────────────────────
function lv(g: GoblinGame, k: string): number { return g.themeLv[k] || 0; }
function hold(g: GoblinGame): number { return SIEVE.hold + lv(g, "holes") * THEME_CARDS.holes.hold; }
function lure(g: GoblinGame): number { return SIEVE.lure + lv(g, "holes") * THEME_CARDS.holes.lure; }
function init(g: GoblinGame): void {
  g.sieves = [];
  g.sieveT = SIEVE.every * 0.5;
  g.beanZones = [];
  g.bursts = []; // 그리기용
  g.stats.burstN = 0;
  g.stats.burstMax = 0;
  g.nextSieve = 1;
}
// k 번째로 앉은 도깨비의 자리: [고리 번호, 각도]. 고리 r 의 자리 수 = 둘레 / 8.
function seatOf(k: number): [number, number] {
  let r = 0;
  for (;;) {
    const n = Math.max(6, Math.floor((2 * Math.PI * (SIEVE.seatR + r * SIEVE.ringGap)) / 8));
    if (k < n) return [r, (k / n) * Math.PI * 2 + r * 0.3];
    k -= n;
    r++;
  }
}
function sieveState(g: GoblinGame, s: Sieve): SieveState { return s.arm > 0 ? "arming" : s.seated >= hold(g) ? "full" : "armed"; }

function afterMove(g: GoblinGame, dt: number): void {
  const p = g.p;
  // 체 놓기
  g.sieveT -= dt;
  if (g.sieveT <= 0) {
    g.sieveT = SIEVE.every - lv(g, "quick") * THEME_CARDS.quick.cut;
    const max = SIEVE.max + lv(g, "more") * THEME_CARDS.more.add;
    const crowded = g.sieves.some((s) => (s.x - p.x) ** 2 + (s.y - p.y) ** 2 < SIEVE.gap * SIEVE.gap);
    if (g.sieves.length < max && !crowded) {
      g.sieves.push({ id: g.nextSieve++, x: p.x, y: p.y, arm: SIEVE.arm, life: SIEVE.life, seated: 0, heading: 0, left: false });
      g.events.push({ e: "sieve", x: p.x, y: p.y });
    }
  }
  // 밟기
  for (const s of g.sieves) {
    const d2 = (s.x - p.x) ** 2 + (s.y - p.y) ** 2, tr = SIEVE.touchR;
    if (!s.left) { if (d2 > (tr + 6) * (tr + 6)) s.left = true; continue; }
    if (s.arm <= 0 && d2 <= tr * tr) burst(g, s);
  }
  g.sieves = g.sieves.filter((s) => !s.gone);
}

function release(g: GoblinGame, s: Sieve, angry: boolean): void {
  for (const e of g.enemies) {
    if (e.sieve !== s.id) continue;
    e.sieve = 0;
    e.counting = false;
    if (angry && !e.dead) { e.angryT = SIEVE.angry.dur; }
  }
}
function burst(g: GoblinGame, s: Sieve): void {
  const sh = lv(g, "shake"), TC = THEME_CARDS.shake;
  const R = (SIEVE.burstR + sh * TC.R) * (1 + (g.passives.area || 0) * C.PASSIVE_AXES.area);
  const n = s.seated;
  const dmg = (SIEVE.dmg0 + (SIEVE.dmgPer + sh * TC.dmgPer) * n) * (1 + (g.passives.dmg || 0) * C.PASSIVE_AXES.dmg);
  s.gone = true;
  for (const e of g.enemies) if (e.sieve === s.id && e.counting) for (let i = 0; i < SIEVE.coin; i++) g.dust.push({ x: e.x, y: e.y, v: 1 });
  release(g, s, false);
  C.near(g as never, s.x, s.y, R + 20, (e) => {
    if ((e.x - s.x) ** 2 + (e.y - s.y) ** 2 > (R + e.r) ** 2) return;
    C.damage(g as never, e, dmg * (e.boss ? SIEVE.bossMul : 1), "burst", { kb: 50, fx: s.x, fy: s.y });
    if (!e.dead && !e.boss) e.stun = Math.max(e.stun, SIEVE.daze); // 놀라 멍해진다 — 털고 빠져나올 틈
  });
  const b = lv(g, "beans");
  if (b) { const B = THEME_CARDS.beans; g.beanZones.push({ x: s.x, y: s.y, r: B.r, life: B.life, slow: B.slow, dps: B.dps[b - 1] }); }
  g.stats.burstN++;
  g.stats.burstMax = Math.max(g.stats.burstMax, n);
  g.bursts.push({ x: s.x, y: s.y, r: R, life: 0.4 });
  g.events.push({ e: "burst", n, dmg: Math.round(dmg), x: s.x, y: s.y });
}

// 세는 도깨비는 가까운 체로(자리가 있으면). 앉으면 그 자리에 머문다.
function targetOf(g: GoblinGame, e: GoblinEnemy): Pos {
  const def = ENEMIES[e.kind];
  if (e.boss && e.dashT! > 0) return e.dashTo!;
  if (e.counting) return e; // 제자리
  if (def.count && !e.angryT) {
    let s = e.sieve ? g.sieves.find((q) => q.id === e.sieve) : null;
    if (!s) {
      e.sieve = 0;
      const L = lure(g) * def.count, H = hold(g);
      let bd = L * L;
      for (const q of g.sieves) {
        if (q.seated + q.heading >= H) continue;
        const d = (q.x - e.x) ** 2 + (q.y - e.y) ** 2;
        if (d < bd) { bd = d; s = q; }
      }
      if (s) { e.sieve = s.id; s.heading++; }
    }
    if (s) return s;
  }
  return g.p;
}

function onSpawn(g: GoblinGame, e: GoblinEnemy): void {
  if (e.boss) { e.sumT = 0; e.dashCd = ENEMIES[e.kind].dash ? ENEMIES[e.kind].dash!.every : 0; e.dashT = 0; e.warnT = 0; e.ringT = ENEMIES[e.kind].ringEvery || 0; e.scale = 1; }
}
function onKill(g: GoblinGame, e: GoblinEnemy): void {
  if (e.sieve) {
    const s = g.sieves.find((q) => q.id === e.sieve);
    if (s) { if (e.counting) s.seated--; else s.heading--; }
  }
}

function bossStep(g: GoblinGame, e: GoblinEnemy, dt: number): number {
  const def = ENEMIES[e.kind];
  let mul = 1;
  if (def.summon) {
    e.sumT! += dt;
    if (e.sumT! >= def.summon.every) {
      e.sumT = 0;
      for (let i = 0; i < def.summon.n; i++) C.spawnAt(g as never, def.summon.kind, e.x + (g.r() - 0.5) * 30, e.y + (g.r() - 0.5) * 30);
      g.events.push({ e: "summon", en: e });
    }
  }
  if (def.dash) {
    if (e.warnT! > 0) { e.warnT! -= dt; mul = 0; if (e.warnT! <= 0) e.dashT = def.dash.dur; }
    else if (e.dashT! > 0) { e.dashT! -= dt; mul = def.dash.mul; }
    else {
      e.dashCd! -= dt;
      if (e.dashCd! <= 0) { e.dashCd = def.dash.every; e.warnT = def.dash.warn; e.dashTo = { x: g.p.x, y: g.p.y }; g.events.push({ e: "warn", en: e, x: g.p.x, y: g.p.y }); }
    }
  }
  if (def.grow) {
    const G = def.grow, d = Math.hypot(g.p.x - e.x, g.p.y - e.y);
    const want = 1 + (G.max - 1) * C.clamp((G.near - d) / (G.near - G.full), 0, 1);
    e.scale! += C.clamp(want - e.scale!, -G.rate * dt, G.rate * dt);
    e.r = def.r * e.scale!;
    e.dmg = def.dmg * e.scale!;
    e.ringT! -= dt;
    if (e.ringT! <= 0) {
      e.ringT = def.ringEvery;
      for (let i = 0; i < def.ringN!; i++) { const a = (i / def.ringN!) * Math.PI * 2; C.spawnAt(g as never, "imp", g.p.x + Math.cos(a) * 80, g.p.y + Math.sin(a) * 80); }
    }
  }
  return mul;
}

function afterEnemies(g: GoblinGame, dt: number): void {
  // 앉기: 체 seatR 안에 들면 둘레 자리에 앉아 센다(움직이지 않고 안 아프다 — 뼈대는 stun>0 이면 닿아도 안 아프다)
  for (const e of g.enemies) {
    if (e.dead) continue;
    if (e.angryT! > 0) e.angryT = Math.max(0, e.angryT! - dt); // 0 에서 멈춘다 — 음수로 남으면 `!e.angryT` 가 거짓이라 다시는 안 앉았다(tw 10-28)
    if (!e.sieve) continue;
    const s = g.sieves.find((q) => q.id === e.sieve);
    if (!s) { e.sieve = 0; e.counting = false; continue; }
    if (!e.counting) {
      // 앉을 자리 = 체를 둘러싼 고리 여러 겹(안쪽부터). 지금 바깥 고리 근처까지 오면 앉는다 — 한 겹만 두면 8–9마리가 둘레를 막아 뒤가 못 들었다(tw 10-28)
      const [ring] = seatOf(s.seated);
      const arrive = SIEVE.seatR + ring * SIEVE.ringGap + SIEVE.arrive;
      if ((e.x - s.x) ** 2 + (e.y - s.y) ** 2 > arrive * arrive) continue;
      e.counting = true;
      s.heading--;
      e.seatK = s.seated++;
    }
    const [ring, a] = seatOf(e.seatK!), R = SIEVE.seatR + ring * SIEVE.ringGap;
    e.x = s.x + Math.cos(a + (s.id % 7) * 0.4) * R;
    e.y = s.y + Math.sin(a + (s.id % 7) * 0.4) * R * 0.7;
    e.stun = Math.max(e.stun, 0.05);
  }
  for (const e of g.enemies) if (e.angryT! > 0 && !e.counting) e.slow = Math.min(e.slow, 1 - SIEVE.angry.mul); // 음수 느려짐 = 빨라짐
  // 팥 자리
  for (const z of g.beanZones) {
    C.near(g as never, z.x, z.y, z.r + 20, (e) => {
      if ((e.x - z.x) ** 2 + (e.y - z.y) ** 2 > (z.r + e.r) ** 2) return;
      e.slow = Math.max(e.slow, z.slow);
      if ((e.hc.bean || -9) + 0.5 <= g.time) { e.hc.bean = g.time; C.damage(g as never, e, z.dps * 0.5, "beanzone"); }
    });
  }
}

function afterStep(g: GoblinGame, dt: number): void {
  for (const s of g.sieves) {
    if (s.arm > 0) s.arm -= dt;
    s.life -= dt;
    if (s.life <= 0) { s.gone = true; release(g, s, true); g.events.push({ e: "sieveout", n: s.seated }); }
  }
  g.sieves = g.sieves.filter((s) => !s.gone);
  for (const z of g.beanZones) z.life -= dt;
  g.beanZones = g.beanZones.filter((z) => z.life > 0);
  for (const b of g.bursts) b.life -= dt;
  g.bursts = g.bursts.filter((b) => b.life > 0);
  if (g.state === "play" && g.time >= DATA.DURATION) {
    for (const e of g.enemies) e.dead = true; // 닭이 울면 도깨비는 물러간다
    g.events.push({ e: "rooster" });
  }
}

// 랭크 점수: 버틴 시간이 주, 체 털기(크게 모을수록)가 부.
function score(g: GoblinGame): number {
  const won = g.state === "won";
  return Math.floor(g.time) * 10 + g.kills + g.stats.burstN * 5 + g.stats.burstMax * 30 + (won ? 5000 + Math.round(g.p.hp) * 20 : 0);
}
function dawn(g: Game): number { return C.clamp((g.time - 420) / 180, 0, 1); } // 새벽: 7분 0 → 10분 1(그리기 몫)

export type GoblinTheme = Theme & {
  id: string;
  name: string;
  DATA: typeof DATA;
  dawn(g: Game): number;
  sieveState(g: Game, s: Sieve): SieveState;
  hold(g: Game): number;
};
export const THEME: GoblinTheme = { id: "goblin", name: "도깨비 퇴치", DATA, init, afterMove, targetOf, onSpawn, onKill, bossStep, afterEnemies, afterStep, score, dawn, sieveState, hold };
export default THEME;
