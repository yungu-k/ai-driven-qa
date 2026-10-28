// 오락실 「코코의 꿈 양몰이」 — 소재 파일. 뼈대는 ./core.ts. 「새벽 양치기」(./sheep.ts)에서 화면에 나가는 이름·id 만 바꾼 복사본이다.
// 시안 docs/lab-surv-dreamherd.js 를 그대로 옮긴 판이다. 규격 docs/lab-surv-dreamherd-spec.md. 🔴 표와 코드가 다르면 코드가 맞다.
// 🔴 수치·동작은 sheep.ts 와 한 줄도 안 다르다 — tmp/lab-surv/equiv-dreamherd.mjs 가 시안과 같은 값인지 잰다.
// 고유 장치(양떼 줄·양 우리)는 그대로다.
import * as C from "./core.ts";
import type { DirectorRow, Enemy, EnemyDef, Game, Pos, ScheduleEvent, Theme, ThemeData, WeaponDef } from "./core.ts";

// ── 타입 ────────────────────────────────────────────────
export type SheepEnemyDef = EnemyDef & {
  sheepDmg: number;
  rise?: number;
  at?: number[];
  hunt?: boolean;
  summon?: { kind: string; n: number; every: number };
  dash?: { every: number; warn: number; dur: number; mul: number };
  blanket?: { every: number; warn: number; dur: number; r: number; slow: number };
  ringEvery?: number;
  ringN?: number;
};
/** 소재가 적에 붙이는 칸. 보스 칸(sumT…ringT·dashTo)은 보스에만, rise 칸은 손에만 생긴다 */
export type SheepEnemy = Enemy & {
  riseT: number;
  baseSpeed: number;
  asleep?: boolean;
  sumT: number;
  dashCd: number;
  dashT: number;
  warnT: number;
  blanketT: number;
  ringT: number;
  dashTo: Pos;
};
export type Sheep = { x: number; y: number; hp: number; iframe: number; cd: number; grow?: number };
export type Stray = { x: number; y: number; vx: number; vy: number; life: number; t: number; field?: boolean; got?: boolean };
export type BlanketZone = { x: number; y: number; r: number; warn: number; life: number; slow: number };
export type Pen = { id: number; pts: number[][]; box: [number, number, number, number]; life: number; max: number; n: number; dmg: number; caught: number };
export type SheepGame = Omit<Game, "enemies" | "bossAlive"> & {
  enemies: SheepEnemy[];
  bossAlive: SheepEnemy | null;
  sheep: Sheep[];
  strays: Stray[];
  zones: BlanketZone[];
  /** 줄 점: [0] 이 머리, STEP 간격으로 뒤로 */
  trail: number[][];
  fenceCd: number;
  fieldT: number;
  fences: Pen[];
};

// ── 수치표 ──────────────────────────────────────────────
const PLAYER = { r: 5, hp: 100, speed: 56, magnet: 22, regen: 0.25 }; // regen = 초당 회복
// 양: 줄 간격 gap(아트 px), 줄의 점은 STEP 마다 하나. 털 hp 만큼 버티고 떨어진다(헤매는 양). 털은 regrow 초마다 1 자란다.
// 양의 털을 깎는 건 sheepDmg 가 있는 악몽(손·옷장·늑대)뿐 — 떼(털뭉치·시계)는 양에 부딪혀 들이받히기만 한다.
const SHEEP = { start: 4, cap: 40, gap: 8, STEP: 2, r: 4, hp: 3, iframe: 0.6, ram: 4, ramCd: 0.4, regrow: 8 };
const STRAY = { life: 10, speed: 10, pickR: 10, homing: 34, fieldEvery: 7, fieldMax: 3, fieldLife: 25, fieldNear: [50, 110] };
// 울타리: 머리(아이)가 자기 줄의 minSheep 번째 양보다 뒤를 closeR 안으로 다시 밟으면 고리가 닫힌다.
const FENCE = { minSheep: 5, closeR: 9, minArea: 150, cd: 0.8, pen: 3.0, base: 20, perSheep: 8, bossMul: 0.4, convert: [3, 8] };

const ENEMIES: Record<string, SheepEnemyDef> = {
  fluff: { name: "그림자 털뭉치", hp: 7, speed: 28, r: 4, dmg: 2, xp: 1, sheepDmg: 0 },
  clock: { name: "번개 꼬마", hp: 6, speed: 50, r: 4, dmg: 2, xp: 1, sheepDmg: 0 },
  hand: { name: "땅에서 솟는 폭죽", hp: 34, speed: 22, r: 6, dmg: 4, xp: 3, sheepDmg: 1, rise: 1.1, at: [36, 56] },
  closet: { name: "꿈속 욕조", hp: 140, speed: 15, r: 9, dmg: 6, xp: 8, sheepDmg: 2 },
  wolf: { name: "짖는 개 그림자", hp: 36, speed: 44, r: 7, dmg: 4, xp: 4, sheepDmg: 2, hunt: true },
  boss_wolf: { name: "큰 개 그림자", boss: true, hp: 2400, speed: 34, r: 16, dmg: 7, xp: 0, sheepDmg: 99, hunt: true, summon: { kind: "wolf", n: 3, every: 7 }, dash: { every: 5, warn: 0.5, dur: 0.6, mul: 2.4 } },
  boss_dark: { name: "가장 긴 밤", boss: true, hp: 5200, speed: 18, r: 20, dmg: 12, xp: 0, sheepDmg: 3, blanket: { every: 6, warn: 1.0, dur: 4, r: 36, slow: 0.45 }, ringEvery: 10, ringN: 16 },
};

// 감독 표: t 초부터 그 줄. rate = 초당 낳기, cap = 살아 있는 상한, mix = 가중치.
const DIRECTOR: DirectorRow[] = [
  { t: 0, rate: 2.0, cap: 40, mix: { fluff: 1 } },
  { t: 60, rate: 3.0, cap: 60, mix: { fluff: 3, clock: 1 } },
  { t: 120, rate: 4.0, cap: 80, mix: { fluff: 3, clock: 2, hand: 0.6 } },
  { t: 180, rate: 5.0, cap: 100, mix: { fluff: 3, clock: 2, hand: 1, wolf: 0.6 } },
  { t: 240, rate: 6.0, cap: 120, mix: { fluff: 2, clock: 2, hand: 1, wolf: 1, closet: 0.3 } },
  { t: 300, rate: 4.0, cap: 100, mix: { fluff: 3, clock: 1, wolf: 0.5 } }, // 보스 늑대 동안 숨 돌림
  { t: 360, rate: 7.0, cap: 140, mix: { fluff: 3, clock: 2, hand: 1.2, wolf: 1.2, closet: 0.6 } },
  { t: 420, rate: 8.0, cap: 150, mix: { fluff: 3, clock: 2.5, hand: 1.2, wolf: 1.5, closet: 0.8 } },
  { t: 480, rate: 9.0, cap: 150, mix: { fluff: 3, clock: 3, hand: 1.5, wolf: 1.8, closet: 1 } },
  { t: 540, rate: 5.0, cap: 120, mix: { fluff: 3, clock: 2, wolf: 1 } }, // 가장 긴 밤
  { t: 585, rate: 10.0, cap: 150, mix: { fluff: 4, clock: 3, wolf: 1 } }, // 해 뜨기 직전 몰아치기
];
const EVENTS: ScheduleEvent[] = [
  { t: 150, ring: "fluff", n: 22, R: 70, say: "털뭉치가 둘러싼다" },
  { t: 300, boss: "boss_wolf", say: "큰 개 그림자가 양을 노린다" },
  { t: 390, ring: "clock", n: 28, R: 78, say: "번개가 한꺼번에 친다" },
  { t: 480, ring: "fluff", n: 36, R: 74 },
  { t: 540, boss: "boss_dark", say: "가장 긴 밤이 온다" },
  { t: 585, say: "동이 튼다" },
];
const HP_BY_MIN = [1, 1.1, 1.3, 1.5, 1.8, 2.1, 2.5, 2.9, 3.4, 4.0];

// 무기: kind 는 뼈대의 행동 다섯 가지. lv[0..4], evo = 5단계 + 짝 보조(with) 하나 이상이면 다음 레벨업 첫 칸.
const WEAPONS: Record<string, WeaponDef> = {
  pillow: {
    name: "꿈 공 던지기", kind: "shot",
    lv: [
      { dmg: 8, period: 1.0, n: 1, speed: 150, range: 100, pierce: 1, r: 3, kb: 40 },
      { dmg: 10, period: 0.95, n: 1, speed: 150, range: 100, pierce: 1, r: 3, kb: 40 },
      { dmg: 10, period: 0.9, n: 2, speed: 150, range: 100, pierce: 1, r: 3, kb: 40 },
      { dmg: 13, period: 0.85, n: 2, speed: 160, range: 140, pierce: 2, r: 3, kb: 45 },
      { dmg: 15, period: 0.8, n: 3, speed: 160, range: 140, pierce: 2, r: 3, kb: 45 },
    ],
    evo: { with: "dmg", name: "공 잔치", dmg: 18, period: 0.7, n: 5, spread: 0.3, speed: 170, range: 150, pierce: 3, r: 4, kb: 55 },
  },
  lullaby: {
    name: "코 고는 소리", kind: "aura",
    lv: [
      { R: 22, dps: 6, tick: 0.5 },
      { R: 25, dps: 8, tick: 0.5 },
      { R: 28, dps: 10, tick: 0.5, slow: 0.15 },
      { R: 31, dps: 13, tick: 0.5, slow: 0.2 },
      { R: 34, dps: 16, tick: 0.5, slow: 0.25 },
    ],
    evo: { with: "cd", name: "드르렁 대합창", R: 44, dps: 22, tick: 0.5, slow: 0.4 },
  },
  star: {
    name: "별똥별", kind: "drop",
    lv: [
      { dmg: 20, period: 2.4, n: 1, r: 12, delay: 0.45 },
      { dmg: 24, period: 2.2, n: 2, r: 12, delay: 0.45 },
      { dmg: 30, period: 2.2, n: 2, r: 13, delay: 0.45 },
      { dmg: 34, period: 2.1, n: 3, r: 14, delay: 0.45 },
      { dmg: 40, period: 2.0, n: 4, r: 16, delay: 0.45 },
    ],
    evo: { with: "area", name: "유성우", dmg: 48, period: 1.8, n: 8, r: 18, delay: 0.45 },
  },
  cloud: {
    name: "양털 구름", kind: "orbit",
    lv: [
      { n: 1, R: 24, r: 6, spin: 3.0, dmg: 9, tick: 0.5, kb: 30 },
      { n: 2, R: 24, r: 6, spin: 3.0, dmg: 10, tick: 0.5, kb: 30 },
      { n: 2, R: 26, r: 6, spin: 3.1, dmg: 13, tick: 0.5, kb: 35 },
      { n: 3, R: 26, r: 7, spin: 3.1, dmg: 15, tick: 0.5, kb: 35 },
      { n: 4, R: 28, r: 7, spin: 3.2, dmg: 18, tick: 0.5, kb: 40 },
    ],
    evo: { with: "hp", name: "뭉게 이불", n: 6, R: 30, r: 8, spin: 3.4, dmg: 24, tick: 0.45, kb: 50 },
  },
  bubble: {
    name: "잠꼬대 방울", kind: "lob",
    lv: [
      { dmg: 6, period: 2.6, n: 1, r: 9, speed: 40, life: 2.4, tick: 0.4 },
      { dmg: 8, period: 2.5, n: 1, r: 10, speed: 40, life: 2.6, tick: 0.4 },
      { dmg: 9, period: 2.4, n: 2, r: 10, speed: 42, life: 2.6, tick: 0.4 },
      { dmg: 11, period: 2.3, n: 2, r: 11, speed: 42, life: 2.8, tick: 0.35 },
      { dmg: 13, period: 2.2, n: 3, r: 12, speed: 44, life: 3.0, tick: 0.35 },
    ],
    evo: { with: "move", name: "잠꼬대 행렬", dmg: 16, period: 1.6, n: 4, r: 14, speed: 46, life: 3.4, tick: 0.3 },
  },
};
// 보조: 효과 축은 뼈대(PASSIVE_AXES)가 정하고 이름만 소재 몫.
const PASSIVES = { dmg: "별빛 잠옷", cd: "졸린 눈", area: "폭신한 방석", move: "꿈속 달리기", hp: "따뜻한 이불", magnet: "킁킁 별가루" };
// 소재 고유 카드: 양떼를 키우는 축. 무기 칸·보조 칸을 차지하지 않는다.
const THEME_CARDS = {
  flock: { name: "멍! 양 부르기", max: 3, wt: 1.3, add: 2, fieldEveryCut: 2 },
  horn: { name: "뿔양", max: 3, wt: 1.0, ram: 3 },
  puff: { name: "솜털양", max: 3, wt: 1.0, hp: 1 },
  pipe: { name: "돌아와 멍", max: 2, wt: 0.9, cdCut: 0.3, lifeAdd: 5 },
  starsheep: { name: "꿈양", max: 3, wt: 0.9, every: [5, 4, 3], dmg: 7, period: 1.8, range: 70 },
};
const DROPS = { heal: 0.015, magnet: 0.003, healAmt: 25, bossDust: 30 };

export const DATA = { WORLD: 540, DURATION: 600, PLAYER, SHEEP, STRAY, FENCE, ENEMIES, DIRECTOR, EVENTS, HP_BY_MIN, WEAPONS, PASSIVES, THEME_CARDS, DROPS, START_WEAPONS: ["pillow"] } satisfies ThemeData & Record<string, unknown>; // SHEEP·STRAY·FENCE 는 소재 몫 칸

// ── 양떼 ─────────────────────────────────────────────────
function kindOf(g: SheepGame, i: number): string {
  const st = g.themeLv.starsheep || 0;
  if (st && i % THEME_CARDS.starsheep.every[st - 1] === THEME_CARDS.starsheep.every[st - 1] - 1) return "star";
  if (g.themeLv.puff) return "puff";
  if (g.themeLv.horn) return "horn";
  return "wool";
}
function sheepHp(g: SheepGame): number { return SHEEP.hp + (g.themeLv.puff || 0) * THEME_CARDS.puff.hp; }
function addSheep(g: SheepGame, n: number, why: string): void {
  for (let k = 0; k < n && g.sheep.length < SHEEP.cap; k++) {
    const tail = g.sheep.length ? g.sheep[g.sheep.length - 1] : g.p;
    g.sheep.push({ x: tail.x, y: tail.y, hp: sheepHp(g), iframe: 0, cd: 0 });
  }
  g.stats.maxLen = Math.max(g.stats.maxLen, g.sheep.length);
  g.events.push({ e: "sheep+", n, why });
}
function dropSheep(g: SheepGame, i: number): void {
  const s = g.sheep[i];
  g.sheep.splice(i, 1);
  const a = g.r() * Math.PI * 2;
  g.strays.push({ x: s.x, y: s.y, vx: Math.cos(a) * STRAY.speed, vy: Math.sin(a) * STRAY.speed, life: STRAY.life + (g.themeLv.pipe >= 2 ? THEME_CARDS.pipe.lifeAdd : 0), t: 0 });
  g.events.push({ e: "sheep-", x: s.x, y: s.y });
}
function trailIdx(i: number): number { return ((i + 1) * SHEEP.gap) / SHEEP.STEP; }

function init(g: SheepGame): void {
  g.sheep = [];
  g.strays = [];
  g.zones = []; // 이불 덮기
  g.trail = [[g.p.x, g.p.y]];
  for (let i = 1; i <= trailIdx(SHEEP.start); i++) g.trail.push([g.p.x, g.p.y + i * SHEEP.STEP]); // 처음엔 아래로 줄 선다
  addSheep(g, SHEEP.start, "start");
  g.fenceCd = 0;
  g.fieldT = 0;
  g.fences = []; // 그리기용(최근 고리)
}

// 머리가 움직인 만큼 STEP 간격으로 줄 점을 앞에 끼운다.
function afterMove(g: SheepGame): void {
  const p = g.p, tr = g.trail;
  let [hx, hy] = tr[0];
  let dx = p.x - hx, dy = p.y - hy, d = Math.hypot(dx, dy);
  const add: number[][] = [];
  while (d >= SHEEP.STEP) {
    hx += (dx / d) * SHEEP.STEP;
    hy += (dy / d) * SHEEP.STEP;
    add.push([hx, hy]);
    dx = p.x - hx; dy = p.y - hy; d = Math.hypot(dx, dy);
  }
  if (add.length) {
    add.reverse();
    tr.unshift(...add);
    const max = trailIdx(SHEEP.cap) + 4;
    if (tr.length > max) tr.length = max;
  }
  for (let i = 0; i < g.sheep.length; i++) {
    const pt = tr[Math.min(tr.length - 1, trailIdx(i))];
    const s = g.sheep[i];
    s.x = pt[0];
    s.y = pt[1];
  }
  if (add.length) checkFence(g);
}

function polyArea(pts: number[][]): number {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return Math.abs(a / 2);
}
function checkFence(g: SheepGame): void {
  if (g.fenceCd > 0) return;
  const tr = g.trail, [hx, hy] = tr[0];
  const lo = trailIdx(FENCE.minSheep - 1), hi = Math.min(tr.length - 1, trailIdx(g.sheep.length - 1));
  for (let k = lo; k <= hi; k++) {
    const dx = tr[k][0] - hx, dy = tr[k][1] - hy;
    if (dx * dx + dy * dy > FENCE.closeR * FENCE.closeR) continue;
    const poly = tr.slice(0, k + 1);
    if (polyArea(poly) < FENCE.minArea) continue;
    closeFence(g, poly, Math.min(g.sheep.length, Math.floor((k * SHEEP.STEP) / SHEEP.gap)));
    return;
  }
}
// 고리가 닫히면 그 자리에 「양 우리」가 pen 초 남는다. 우리 안에 든 악몽은(닫힐 때 있던 것도, 뒤에 들어온 것도)
// 한 번 피해를 받고 우리가 사라질 때까지 잠든다. 악몽은 아이를 쫓으므로, 우리 안에 서 있으면 쫓아 들어온 것이 잠든다.
function closeFence(g: SheepGame, poly: number[][], n: number): void {
  g.fenceCd = FENCE.cd - (g.themeLv.pipe >= 2 ? THEME_CARDS.pipe.cdCut : 0);
  let xs = 1e9, ys = 1e9, xe = -1e9, ye = -1e9;
  for (const q of poly) { xs = Math.min(xs, q[0]); ys = Math.min(ys, q[1]); xe = Math.max(xe, q[0]); ye = Math.max(ye, q[1]); }
  const pen: Pen = { id: g.stats.fences + 1, pts: poly.map((q) => [q[0], q[1]]), box: [xs, ys, xe, ye], life: FENCE.pen, max: FENCE.pen, n, dmg: FENCE.base + FENCE.perSheep * n, caught: 0 };
  for (const d of g.dust) if (d.x >= xs && d.x <= xe && d.y >= ys && d.y <= ye && C.pointInPoly(d.x, d.y, poly)) d.pull = true;
  g.stats.fences++;
  g.fences.push(pen);
  stepPen(g, pen);
  g.events.push({ e: "fence", n, dmg: pen.dmg });
}
function stepPen(g: SheepGame, pen: Pen): void {
  const [xs, ys, xe, ye] = pen.box, key = "pen" + pen.id;
  for (const e of g.enemies) {
    if (e.dead || e.x < xs || e.x > xe || e.y < ys || e.y > ye) continue;
    if (!C.pointInPoly(e.x, e.y, pen.pts)) continue;
    e.stun = Math.max(e.stun, e.boss ? 0 : 0.1); // 우리 안에선 잠들어 있다(보스는 안 잔다)
    e.asleep = true;
    if (e.hc[key]) continue;
    e.hc[key] = 1;
    if (!e.boss) { pen.caught++; g.stats.caught = (g.stats.caught || 0) + 1; }
    C.damage(g, e, pen.dmg * (e.boss ? FENCE.bossMul : 1), "fence");
  }
}
function endPen(g: SheepGame, pen: Pen): void {
  // 악몽이 양이 된다: 한 우리에 많이 가둘수록
  const conv = pen.caught >= FENCE.convert[1] ? 2 : pen.caught >= FENCE.convert[0] ? 1 : 0;
  if (conv) addSheep(g, conv, "fence");
  g.events.push({ e: "penend", caught: pen.caught, conv });
}

// 늑대는 가장 가까운 양을, 나머지는 아이를 쫓는다.
function targetOf(g: SheepGame, e: SheepEnemy): Pos {
  const def = ENEMIES[e.kind];
  if (def.hunt && g.sheep.length) {
    let best: Sheep | null = null, bd = 1e12;
    for (const s of g.sheep) {
      const d = (s.x - e.x) ** 2 + (s.y - e.y) ** 2;
      if (d < bd) { bd = d; best = s; }
    }
    if (e.boss && e.dashT > 0) return e.dashTo;
    return best!;
  }
  if (e.boss && e.dashT > 0) return e.dashTo;
  return g.p;
}

function onSpawn(g: SheepGame, e: SheepEnemy): void {
  const def = ENEMIES[e.kind];
  if (def.rise) { e.inactive = true; e.riseT = def.rise; e.baseSpeed = e.speed; e.speed = 0; }
  if (e.boss) { e.sumT = 0; e.dashCd = def.dash ? def.dash.every : 0; e.dashT = 0; e.warnT = 0; e.blanketT = def.blanket ? def.blanket.every : 0; e.ringT = def.ringEvery || 0; }
}
// 손은 화면 밖이 아니라 아이 가까운 땅에서 솟는다(보이는 예고 0.9 초).
function spawnKind(g: SheepGame, kind: string): boolean {
  const def = ENEMIES[kind];
  if (!def.at) return false;
  const a = g.r() * Math.PI * 2, d = def.at[0] + g.r() * (def.at[1] - def.at[0]);
  C.spawnAt(g, kind, g.p.x + Math.cos(a) * d, g.p.y + Math.sin(a) * d);
  return true;
}

function bossStep(g: SheepGame, e: SheepEnemy, dt: number): number {
  const def = ENEMIES[e.kind];
  let mul = 1;
  if (def.summon) {
    e.sumT += dt;
    if (e.sumT >= def.summon.every) {
      e.sumT = 0;
      for (let i = 0; i < def.summon.n; i++) C.spawnAt(g, def.summon.kind, e.x + (g.r() - 0.5) * 30, e.y + (g.r() - 0.5) * 30);
      g.events.push({ e: "summon", en: e });
    }
  }
  if (def.dash) {
    if (e.warnT > 0) {
      e.warnT -= dt;
      mul = 0;
      if (e.warnT <= 0) { e.dashT = def.dash.dur; }
    } else if (e.dashT > 0) {
      e.dashT -= dt;
      mul = def.dash.mul;
    } else {
      e.dashCd -= dt;
      if (e.dashCd <= 0) {
        e.dashCd = def.dash.every;
        e.warnT = def.dash.warn;
        const t = targetOf(g, e);
        e.dashTo = { x: t.x, y: t.y };
        g.events.push({ e: "warn", en: e, x: t.x, y: t.y });
      }
    }
  }
  if (def.blanket) {
    e.blanketT -= dt;
    if (e.blanketT <= 0) {
      e.blanketT = def.blanket.every;
      g.zones.push({ x: g.p.x, y: g.p.y, r: def.blanket.r, warn: def.blanket.warn, life: def.blanket.dur, slow: def.blanket.slow });
      g.events.push({ e: "blanket", x: g.p.x, y: g.p.y });
    }
    e.ringT -= dt;
    if (e.ringT <= 0) {
      e.ringT = def.ringEvery!;
      for (let i = 0; i < def.ringN!; i++) {
        const a = (i / def.ringN!) * Math.PI * 2;
        C.spawnAt(g, "fluff", g.p.x + Math.cos(a) * 80, g.p.y + Math.sin(a) * 80);
      }
    }
  }
  return mul;
}

function playerMod(g: SheepGame, dt: number): void {
  for (const z of g.zones) {
    if (z.warn > 0) continue;
    if ((g.p.x - z.x) ** 2 + (g.p.y - z.y) ** 2 <= z.r * z.r) g.p.slow = Math.max(g.p.slow!, z.slow);
  }
}

// 양과 악몽이 닿으면: 악몽은 들이받히고(조금 밀림) 양은 털이 깎인다. 벽은 아니다 — 벽이면 고리 안이 늘 비어 버린다(규격 6-3).
function afterEnemies(g: SheepGame, dt: number): void {
  const ram = SHEEP.ram + (g.themeLv.horn || 0) * THEME_CARDS.horn.ram;
  const st = g.themeLv.starsheep || 0, SS = THEME_CARDS.starsheep;
  for (const e of g.enemies) {
    if (e.inactive) {
      e.riseT -= dt;
      if (e.riseT <= 0) { e.inactive = false; e.speed = e.baseSpeed; }
    }
  }
  for (let i = g.sheep.length - 1; i >= 0; i--) {
    const s = g.sheep[i];
    if (s.iframe > 0) s.iframe -= dt;
    s.grow = (s.grow || 0) + dt; // 털은 다시 자란다
    if (s.grow >= SHEEP.regrow) { s.grow = 0; s.hp = Math.min(sheepHp(g), s.hp + 1); }
    let off = false;
    C.near(g, s.x, s.y, SHEEP.r + 22, (e) => {
      if (off || e.inactive) return;
      const dx = e.x - s.x, dy = e.y - s.y, rr = SHEEP.r + e.r, d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) return;
      const d = Math.sqrt(d2) || 1;
      if ((e.hc.ram || -9) + SHEEP.ramCd <= g.time) {
        e.hc.ram = g.time;
        C.damage(g, e, ram, "ram", { kb: 10, fx: s.x, fy: s.y });
      }
      if (s.iframe <= 0 && ENEMIES[e.kind].sheepDmg) {
        s.hp -= ENEMIES[e.kind].sheepDmg;
        s.iframe = SHEEP.iframe;
        g.events.push({ e: "sheephit", i });
        if (s.hp <= 0) off = true;
      }
    });
    if (off) { dropSheep(g, i); continue; }
    if (st && kindOf(g, i) === "star") {
      s.cd -= dt;
      if (s.cd <= 0) {
        const t = C.nearest(g, s.x, s.y, SS.range);
        if (t) {
          s.cd = SS.period;
          const a = Math.atan2(t.y - s.y, t.x - s.x);
          g.shots.push({ w: "starsheep", x: s.x, y: s.y - 3, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, dmg: SS.dmg * (1 + (g.passives.dmg || 0) * C.PASSIVE_AXES.dmg), r: 2, life: SS.range / 120 + 0.1, pierce: 1, hit: [], kb: 0 });
        }
      }
    }
  }
}

function afterStep(g: SheepGame, dt: number): void {
  const p = g.p;
  if (g.fenceCd > 0) g.fenceCd -= dt;
  for (const f of g.fences) {
    f.life -= dt;
    if (f.life > 0) stepPen(g, f);
    else endPen(g, f);
  }
  g.fences = g.fences.filter((f) => f.life > 0);
  for (const z of g.zones) { if (z.warn > 0) z.warn -= dt; else z.life -= dt; }
  g.zones = g.zones.filter((z) => z.life > 0);
  // 헤매는 양: 목동 피리가 있으면 아이에게 걸어온다
  const homing = (g.themeLv.pipe || 0) >= 1;
  for (const s of g.strays) {
    s.t += dt;
    s.life -= dt;
    if (homing && !s.field) {
      const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy) || 1;
      s.x += (dx / d) * STRAY.homing * dt;
      s.y += (dy / d) * STRAY.homing * dt;
    } else {
      s.x = C.clamp(s.x + s.vx * dt, 6, g.world - 6);
      s.y = C.clamp(s.y + s.vy * dt, 6, g.world - 6);
    }
    if ((s.x - p.x) ** 2 + (s.y - p.y) ** 2 <= STRAY.pickR * STRAY.pickR && g.sheep.length < SHEEP.cap) {
      s.life = 0;
      s.got = true;
      addSheep(g, 1, s.field ? "field" : "back");
    }
  }
  g.strays = g.strays.filter((s) => s.life > 0);
  // 들판에서 떠도는 양(새 양)
  g.fieldT += dt;
  const every = STRAY.fieldEvery - (g.themeLv.flock || 0) * THEME_CARDS.flock.fieldEveryCut;
  if (g.fieldT >= every) {
    g.fieldT = 0;
    if (g.strays.filter((s) => s.field).length < STRAY.fieldMax) {
      const a = g.r() * Math.PI * 2, d = STRAY.fieldNear[0] + g.r() * (STRAY.fieldNear[1] - STRAY.fieldNear[0]);
      g.strays.push({ x: C.clamp(p.x + Math.cos(a) * d, 10, g.world - 10), y: C.clamp(p.y + Math.sin(a) * d, 10, g.world - 10), vx: 0, vy: 0, life: STRAY.fieldLife, t: 0, field: true });
    }
  }
  if (g.state === "play" && g.time >= DATA.DURATION) {
    // 아침: 남은 악몽은 녹는다
    for (const e of g.enemies) e.dead = true;
    g.events.push({ e: "dawn" });
  }
}

function onThemeCard(g: SheepGame, key: string, lv: number): void {
  if (key === "flock") addSheep(g, THEME_CARDS.flock.add, "card");
  if (key === "puff") for (const s of g.sheep) s.hp += THEME_CARDS.puff.hp;
}

// 랭크 점수: 아침까지 버틴 시간이 주, 양떼 크기가 부.
function score(g: SheepGame): number {
  const won = g.state === "won";
  return Math.floor(g.time) * 10 + g.kills + g.stats.maxLen * 25 + g.stats.fences * 15 + (won ? 5000 + g.sheep.length * 200 : 0);
}
function dawn(g: Game): number { return C.clamp((g.time - 420) / 180, 0, 1); } // 7분부터 하늘이 밝아 온다(그리기 몫)

export type SheepTheme = Theme & {
  id: "dreamherd";
  name: string;
  DATA: typeof DATA;
  kindOf(g: Game, i: number): string;
  dawn(g: Game): number;
};
export const THEME: SheepTheme = { id: "dreamherd", name: "코코의 꿈 양몰이", DATA, init, afterMove, targetOf, onSpawn, spawnKind, bossStep, playerMod, afterEnemies, afterStep, onThemeCard, score, kindOf, dawn };
export default THEME;
