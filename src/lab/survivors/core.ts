// 그냥 오락실 서바이버 — 공통 뼈대(순수 로직). 규격 docs/lab-surv-spec.md 2–4절.
// 소재 넷(A 도깨비·B 코코·C 양치기·D 포장마차)이 이 파일 하나를 같이 쓰고, 소재 파일(<소재>.ts)이
// 수치표(THEME.DATA)와 갈고리(hooks)를 준다.
// 시안 뼈대 docs/lab-surv-core.js 를 그대로 옮긴 판이다(10절). 동작은 한 줄도 바꾸지 않고 타입만 붙였다 —
// 같은 시드·같은 입력이면 두 뼈대의 상태·사건이 같아야 한다(tmp/lab-surv/equiv.mjs 가 잰다).
// 그리기·소리는 g.events 를 읽는 쪽 몫.

// ── 타입 ────────────────────────────────────────────────
// 종류 이름(무기·적·보조 축·소재 카드)은 소재가 정하므로 모두 string 이다.
export type Pos = { x: number; y: number };
export type GameState = "play" | "levelup" | "won" | "lost";

/** 무기 한 단계의 수치. 행동(kind)마다 쓰는 칸이 다르다 */
export type WeaponLevel = {
  dmg?: number;
  dps?: number;
  period?: number;
  n?: number;
  speed?: number;
  range?: number;
  pierce?: number;
  r?: number;
  R?: number;
  kb?: number;
  spread?: number;
  tick?: number;
  slow?: number;
  spin?: number;
  delay?: number;
  life?: number;
};
export type WeaponDef = {
  name: string;
  /** shot | orbit | aura | drop | lob */
  kind: string;
  lv: WeaponLevel[];
  evo?: WeaponLevel & { with: string; name?: string };
};
/** wstat 이 돌려주는 값: 그 단계 수치 + 보조 배수 + kind. 행동마다 쓰는 칸만 차 있다 */
export type WeaponStat = {
  kind: string;
  dmg: number;
  dps: number;
  period: number;
  n: number;
  speed: number;
  range: number;
  pierce?: number;
  r: number;
  R: number;
  kb?: number;
  spread?: number;
  tick: number;
  slow?: number;
  spin: number;
  delay: number;
  life: number;
  with?: string;
  name?: string;
};
export type Weapon = { key: string; lv: number; cd: number; t: number; evo?: boolean; ang?: number };

export type EnemyDef = { name?: string; hp: number; speed: number; r: number; dmg: number; xp: number; boss?: boolean };
export type Enemy = {
  id: number;
  kind: string;
  x: number;
  y: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  xp: number;
  boss: boolean;
  flash: number;
  kx: number;
  ky: number;
  stun: number;
  slow: number;
  /** 무기·장치 key → 마지막으로 맞은 시각(같은 적 연타 막기) */
  hc: Record<string, number>;
  t: number;
  dead: boolean;
  dir?: number;
  /** 솟는 중(닿아도 안 아프다) — 소재가 켠다 */
  inactive?: boolean;
};

export type Player = {
  x: number;
  y: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  iframe: number;
  dir: number;
  vx: number;
  vy: number;
  moving: boolean;
  slow?: number;
};
export type Dust = { x: number; y: number; v: number; pull?: boolean; got?: boolean };
export type Pickup = { kind: string; x: number; y: number; got?: boolean };
export type Shot = {
  w: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  r: number;
  life: number;
  pierce: number;
  hit: number[];
  kb?: number;
  tick?: number;
  lob?: boolean;
};
export type Fx = { k: string; w?: string; x: number; y: number; life: number; max?: number; r?: number; dmg?: number; live?: boolean };

/** 카드 = { type: "weapon"|"passive"|"theme"|"evo"|"heal", key, lv(다음 단계) } */
export type Card = { type: string; key: string; lv: number; wt?: number };

/** 사건. 뼈대 사건 + 소재 사건이 같은 줄에 온다 — e 로 갈라 읽는다 */
export type GameEvent = {
  e: string;
  en?: Enemy;
  src?: string;
  amt?: number;
  w?: string;
  x?: number;
  y?: number;
  r?: number;
  v?: number;
  lv?: number;
  key?: string;
  kind?: string;
  card?: Card;
  text?: string;
  [k: string]: unknown;
};

export type DirectorRow = { t: number; rate: number; cap: number; mix: Record<string, number> };
export type ScheduleEvent = { t: number; boss?: string; ring?: string; n?: number; R?: number; say?: string };
export type ThemeCard = { name?: string; max: number; wt?: number; when?: (g: Game) => boolean };

export type ThemeData = {
  WORLD: number;
  DURATION: number;
  PLAYER: { r: number; hp: number; speed: number; magnet: number; regen?: number };
  ENEMIES: Record<string, EnemyDef>;
  DIRECTOR: DirectorRow[];
  EVENTS?: ScheduleEvent[];
  HP_BY_MIN: number[];
  WEAPONS: Record<string, WeaponDef>;
  PASSIVES: Record<string, string>;
  THEME_CARDS?: Record<string, ThemeCard>;
  DROPS: { heal: number; magnet: number; healAmt: number; bossDust: number };
  START_WEAPONS: string[];
};

/** 소재 = 수치표 + 갈고리. 갈고리는 메서드 꼴이라 소재가 넓힌 Game·Enemy 를 받아도 된다 */
export type Theme = {
  id?: string;
  name?: string;
  DATA: ThemeData;
  init?(g: Game, opts: CreateOpts): void;
  afterMove?(g: Game, dt: number): void;
  targetOf?(g: Game, e: Enemy): Pos;
  onSpawn?(g: Game, e: Enemy): void;
  spawnKind?(g: Game, kind: string): boolean;
  bossStep?(g: Game, e: Enemy, dt: number): number;
  bossDamageMul?(g: Game, e: Enemy, src: string): number;
  playerMod?(g: Game, dt: number): void;
  afterEnemies?(g: Game, dt: number): void;
  afterStep?(g: Game, dt: number): void;
  onThemeCard?(g: Game, key: string, lv: number): void;
  weaponMod?(g: Game, w: Weapon, s: WeaponStat): void;
  onKill?(g: Game, e: Enemy, src: string): void;
  score?(g: Game): number;
};
export type CreateOpts = Record<string, unknown>;

export type Game = {
  theme: Theme;
  D: ThemeData;
  seed: number;
  r: () => number;
  time: number;
  state: GameState;
  world: number;
  p: Player;
  input: { x: number; y: number };
  lv: number;
  xp: number;
  kills: number;
  weapons: Weapon[];
  passives: Record<string, number>;
  themeLv: Record<string, number>;
  enemies: Enemy[];
  dust: Dust[];
  pickups: Pickup[];
  shots: Shot[];
  fx: Fx[];
  events: GameEvent[];
  grid: Enemy[][];
  gridN: number;
  spawnAcc: number;
  nextId: number;
  bossAlive: Enemy | null;
  schedIdx: number;
  offer: Card[] | null;
  rerolls: number;
  levelsQueued: number;
  stats: { dmgBy: Record<string, number>; fences: number; maxLen: number; caught?: number };
  sched: ScheduleEvent[];
};

type DamageOpts = { kb?: number; fx?: number; fy?: number };

// ── 뼈대 상수(소재가 바꾸지 않는 것) ─────────────────────────
// 거리 = 아트 px(화면 2 CSS px), 시간 = 초.
export const CORE = {
  DT: 1 / 60,
  VIEW: { w: 180, h: 300 }, // 360 폭 휴대폰의 놀이 화면(아트 px). 스폰 고리는 이 바깥
  CELL: 32, // 공간 해시 칸
  ENEMY_CAP: 150, // 화면 밖 포함 살아 있는 적 상한(성능 규격 20 ms 의 바탕)
  DUST_CAP: 220, // 넘으면 가장 먼 별가루를 큰 것 하나로 합친다
  IFRAME: 0.7, // 주인공이 맞은 뒤 무적
  SLOTS: { weapon: 4, passive: 4 },
  REROLLS: 2, // 한 판에 다시 뽑기
  MAX_LV: 5, // 무기·보조 공통 단계 상한
  // 다음 단계까지 경험치: 1→2 는 5, 이후 완만히. 10분에 26–32 단계가 되도록 시뮬로 맞췄다(규격 9절).
  need: (lv: number): number => Math.round(5 + 4.2 * (lv - 1) + 0.18 * (lv - 1) * (lv - 1)),
};

// 보조(패시브)는 소재마다 이름만 다르고 효과 축은 같다 — 넷이 같은 성장 언어를 쓰게.
export const PASSIVE_AXES: Record<string, number> = {
  dmg: 0.1, // 피해 +10 %/단계
  cd: -0.08, // 재사용 -8 %/단계
  area: 0.12, // 범위 +12 %/단계
  move: 0.08, // 이동 +8 %/단계
  hp: 20, // 최대 체력 +20/단계(즉시 그만큼 회복)
  magnet: 0.3, // 끌어오기 반경 +30 %/단계
};

// ── 도우미 ──────────────────────────────────────────────
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function clamp(v: number, a: number, b: number): number { return v < a ? a : v > b ? b : v; }
export function pointInPoly(x: number, y: number, pts: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function pickWeighted(r: () => number, table: Record<string, number>): string {
  let sum = 0;
  for (const k in table) sum += table[k];
  let v = r() * sum;
  for (const k in table) if ((v -= table[k]) <= 0) return k;
  return Object.keys(table)[0];
}

// ── 공간 해시 ───────────────────────────────────────────
function buildGrid(g: Game): void {
  const n = g.gridN;
  const cells = g.grid;
  for (let i = 0; i < cells.length; i++) cells[i].length = 0;
  for (const e of g.enemies) {
    const cx = clamp((e.x / CORE.CELL) | 0, 0, n - 1), cy = clamp((e.y / CORE.CELL) | 0, 0, n - 1);
    cells[cy * n + cx].push(e);
  }
}
// (x,y) 에서 r 안의 적을 fn 으로. 적 반경까지 더해 닿는지 판정은 부르는 쪽 몫.
export function near(g: Game, x: number, y: number, r: number, fn: (e: Enemy) => void): void {
  const n = g.gridN, C = CORE.CELL;
  const x0 = clamp(((x - r) / C) | 0, 0, n - 1), x1 = clamp(((x + r) / C) | 0, 0, n - 1);
  const y0 = clamp(((y - r) / C) | 0, 0, n - 1), y1 = clamp(((y + r) / C) | 0, 0, n - 1);
  for (let cy = y0; cy <= y1; cy++)
    for (let cx = x0; cx <= x1; cx++) {
      const cell = g.grid[cy * n + cx];
      for (let i = 0; i < cell.length; i++) if (!cell[i].dead) fn(cell[i]);
    }
}
export function nearest(g: Game, x: number, y: number, r: number, skip?: (e: Enemy) => boolean): Enemy | null {
  let best: Enemy | null = null, bd = r * r;
  near(g, x, y, r, (e) => {
    if (skip && skip(e)) return;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bd) { bd = d; best = e; }
  });
  return best;
}

// ── 판 만들기 ───────────────────────────────────────────
export function create(theme: Theme, seed = 1, opts: CreateOpts = {}): Game {
  const D = theme.DATA;
  const W = D.WORLD;
  const gridN = Math.ceil(W / CORE.CELL);
  const g = {
    theme, D, seed, r: rng(seed), time: 0, state: "play", // play | levelup | won | lost
    world: W,
    p: { x: W / 2, y: W / 2, r: D.PLAYER.r, hp: D.PLAYER.hp, maxHp: D.PLAYER.hp, speed: D.PLAYER.speed, iframe: 0, dir: 1, vx: 0, vy: 0, moving: false },
    input: { x: 0, y: 0 }, // 길이 0..1 의 방향(조이스틱·키보드)
    lv: 1, xp: 0, kills: 0,
    weapons: [], // { key, lv, cd, t, evo }
    passives: {}, // axis → lv(소재 이름은 D.PASSIVES 가 준다)
    themeLv: {}, // 소재 고유 카드 단계
    enemies: [], dust: [], pickups: [], shots: [], fx: [], events: [],
    grid: Array.from({ length: gridN * gridN }, () => []), gridN,
    spawnAcc: 0, nextId: 1, bossAlive: null, schedIdx: 0,
    offer: null, rerolls: CORE.REROLLS, levelsQueued: 0,
    stats: { dmgBy: {}, fences: 0, maxLen: 0 },
  } as unknown as Game;
  for (const w of D.START_WEAPONS) g.weapons.push({ key: w, lv: 1, cd: 0, t: 0 });
  g.sched = (D.EVENTS || []).slice().sort((a, b) => a.t - b.t);
  if (theme.init) theme.init(g, opts);
  return g;
}

// ── 능력치 ───────────────────────────────────────────────
function pmul(g: Game, axis: string): number { return (g.passives[axis] || 0) * PASSIVE_AXES[axis]; }
export function wstat(g: Game, w: Weapon): WeaponStat {
  const def = g.D.WEAPONS[w.key];
  const base = w.evo ? def.evo : def.lv[w.lv - 1];
  const s = Object.assign({}, base) as WeaponStat;
  s.kind = def.kind;
  if (s.dmg != null) s.dmg *= 1 + pmul(g, "dmg");
  if (s.dps != null) s.dps *= 1 + pmul(g, "dmg");
  if (s.period != null) s.period *= Math.max(0.4, 1 + pmul(g, "cd"));
  if (s.r != null) s.r *= 1 + pmul(g, "area");
  if (s.R != null) s.R *= 1 + pmul(g, "area");
  if (g.theme.weaponMod) g.theme.weaponMod(g, w, s);
  return s;
}
export function moveSpeed(g: Game): number { return g.p.speed * (1 + pmul(g, "move")) * (g.p.slow ? 1 - g.p.slow : 1); }
export function magnet(g: Game): number { return g.D.PLAYER.magnet * (1 + pmul(g, "magnet")); }

// ── 적 ───────────────────────────────────────────────────
export function hpMul(g: Game): number {
  const m = g.D.HP_BY_MIN, i = Math.min(m.length - 1, (g.time / 60) | 0);
  const f = g.time / 60 - ((g.time / 60) | 0);
  return i + 1 < m.length ? m[i] + (m[i + 1] - m[i]) * f : m[i];
}
export function spawnAt(g: Game, kind: string, x: number, y: number, extra?: Partial<Enemy> & Record<string, unknown>): Enemy {
  const def = g.D.ENEMIES[kind];
  const boss = !!def.boss;
  const hp = boss ? def.hp : def.hp * hpMul(g);
  const e: Enemy = {
    id: g.nextId++, kind, x: clamp(x, 4, g.world - 4), y: clamp(y, 4, g.world - 4), r: def.r, hp, maxHp: hp,
    speed: def.speed, dmg: def.dmg, xp: def.xp, boss, flash: 0, kx: 0, ky: 0, stun: 0, slow: 0, hc: {}, t: 0, dead: false,
  };
  if (extra) Object.assign(e, extra);
  if (g.theme.onSpawn) g.theme.onSpawn(g, e);
  g.enemies.push(e);
  if (boss) { g.bossAlive = e; g.events.push({ e: "boss", en: e }); }
  return e;
}
// 화면 바깥 고리에서. 월드 밖으로 나가면 반대쪽으로 접는다.
export function ringPoint(g: Game, pad = 14): [number, number] {
  const { w, h } = CORE.VIEW, p = g.p, r = g.r;
  const side = (r() * 4) | 0;
  let x: number, y: number;
  if (side < 2) { x = p.x + (r() - 0.5) * (w + pad * 2); y = p.y + (side ? 1 : -1) * (h / 2 + pad); }
  else { y = p.y + (r() - 0.5) * (h + pad * 2); x = p.x + (side === 2 ? 1 : -1) * (w / 2 + pad); }
  if (x < 4 || x > g.world - 4) x = p.x - (x - p.x);
  if (y < 4 || y > g.world - 4) y = p.y - (y - p.y);
  return [clamp(x, 4, g.world - 4), clamp(y, 4, g.world - 4)];
}
function directorRow(g: Game): DirectorRow {
  const rows = g.D.DIRECTOR;
  let row = rows[0];
  for (const rw of rows) if (rw.t <= g.time) row = rw;
  return row;
}
function direct(g: Game, dt: number): void {
  const row = directorRow(g);
  const cap = Math.min(CORE.ENEMY_CAP, row.cap);
  g.spawnAcc += row.rate * dt;
  while (g.spawnAcc >= 1) {
    g.spawnAcc -= 1;
    if (g.enemies.length >= cap) continue;
    const kind = pickWeighted(g.r, row.mix);
    if (g.theme.spawnKind) { if (g.theme.spawnKind(g, kind)) continue; } // 소재가 직접 낳았으면(예: 땅에서 솟는 손)
    const [x, y] = ringPoint(g);
    spawnAt(g, kind, x, y);
  }
  while (g.schedIdx < g.sched.length && g.sched[g.schedIdx].t <= g.time) {
    const ev = g.sched[g.schedIdx++];
    if (ev.boss) {
      const [x, y] = ringPoint(g, 30);
      spawnAt(g, ev.boss, x, y);
    } else if (ev.ring) {
      // 포위: 주인공을 둘러싼 원. 빈틈 하나(gap)를 남겨 빠져나갈 길을 준다.
      const n = ev.n!, R = ev.R!, gap = g.r() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const da = Math.abs(((a - gap + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (da < 0.35) continue;
        spawnAt(g, ev.ring, g.p.x + Math.cos(a) * R, g.p.y + Math.sin(a) * R);
      }
      g.events.push({ e: "ring" });
    }
    if (ev.say) g.events.push({ e: "say", text: ev.say });
  }
}
export function damage(g: Game, e: Enemy, amt: number, src: string, opts?: DamageOpts): void {
  if (e.dead || amt <= 0) return;
  if (e.boss && g.theme.bossDamageMul) amt *= g.theme.bossDamageMul(g, e, src);
  e.hp -= amt;
  e.flash = 2;
  g.stats.dmgBy[src] = (g.stats.dmgBy[src] || 0) + Math.min(amt, e.hp + amt);
  if (opts && opts.kb && !e.boss) {
    const dx = e.x - (opts.fx ?? g.p.x), dy = e.y - (opts.fy ?? g.p.y), d = Math.hypot(dx, dy) || 1;
    e.kx += (dx / d) * opts.kb;
    e.ky += (dy / d) * opts.kb;
  }
  if (e.hp <= 0) kill(g, e, src);
}
export function kill(g: Game, e: Enemy, src: string): void {
  e.dead = true;
  g.kills++;
  const D = g.D;
  if (e.boss) {
    g.bossAlive = null;
    for (let i = 0; i < D.DROPS.bossDust; i++) g.dust.push({ x: e.x + (g.r() - 0.5) * 40, y: e.y + (g.r() - 0.5) * 40, v: 5 });
    g.pickups.push({ kind: "heal", x: e.x, y: e.y });
    g.events.push({ e: "bossdown", en: e });
  } else {
    g.dust.push({ x: e.x, y: e.y, v: e.xp });
    if (g.r() < D.DROPS.heal) g.pickups.push({ kind: "heal", x: e.x, y: e.y });
    else if (g.r() < D.DROPS.magnet) g.pickups.push({ kind: "magnet", x: e.x, y: e.y });
  }
  g.events.push({ e: "kill", en: e, src });
  if (g.theme.onKill) g.theme.onKill(g, e, src);
}
export function hurtPlayer(g: Game, amt: number, src: string): void {
  const p = g.p;
  if (p.iframe > 0 || g.state !== "play") return;
  p.hp -= amt;
  p.iframe = CORE.IFRAME;
  g.events.push({ e: "hurt", amt, src });
  if (p.hp <= 0) {
    p.hp = 0;
    g.state = "lost";
    g.events.push({ e: "lost" });
  }
}

// ── 무기(행동 다섯 가지. 소재는 이름·그림·수치만 바꾼다) ─────────
// shot: 가장 가까운 적에게 쏜다 · orbit: 주인공 둘레를 돈다 · aura: 둘레 지속 피해 · drop: 화면 안 적 머리 위에 떨어진다 · lob: 걷는 방향으로 느린 큰 방울
function stepWeapons(g: Game, dt: number): void {
  const p = g.p;
  for (const w of g.weapons) {
    const s = wstat(g, w);
    w.t += dt;
    w.cd -= dt;
    const key = w.key;
    if (s.kind === "shot") {
      if (w.cd > 0) continue;
      const tgt = nearest(g, p.x, p.y, s.range);
      if (!tgt) continue;
      w.cd = s.period;
      const base = Math.atan2(tgt.y - p.y, tgt.x - p.x);
      for (let i = 0; i < s.n; i++) {
        const a = base + (i - (s.n - 1) / 2) * (s.spread || 0.18);
        g.shots.push({ w: key, x: p.x, y: p.y - 4, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, dmg: s.dmg, r: s.r || 3, life: s.range / s.speed + 0.1, pierce: s.pierce || 1, hit: [], kb: s.kb || 0 });
      }
      g.events.push({ e: "fire", w: key });
    } else if (s.kind === "lob") {
      if (w.cd > 0) continue;
      w.cd = s.period;
      let ax = p.vx, ay = p.vy;
      if (!ax && !ay) { const t = nearest(g, p.x, p.y, 120); if (t) { ax = t.x - p.x; ay = t.y - p.y; } else ax = p.dir; }
      const d = Math.hypot(ax, ay) || 1;
      for (let i = 0; i < s.n; i++) {
        const a = Math.atan2(ay, ax) + (i - (s.n - 1) / 2) * 0.5;
        g.shots.push({ w: key, x: p.x, y: p.y - 4, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, dmg: s.dmg, r: s.r, life: s.life, pierce: 999, hit: [], tick: s.tick, lob: true });
      }
    } else if (s.kind === "orbit") {
      // 늘 돈다. 같은 적은 s.tick 초마다 한 번.
      w.ang = (w.ang || 0) + s.spin * dt;
      for (let i = 0; i < s.n; i++) {
        const a = w.ang + (i / s.n) * Math.PI * 2;
        const ox = p.x + Math.cos(a) * s.R, oy = p.y + Math.sin(a) * s.R;
        near(g, ox, oy, s.r + 20, (e) => {
          if ((e.x - ox) ** 2 + (e.y - oy) ** 2 > (s.r + e.r) ** 2) return;
          if ((e.hc[key] || -9) + s.tick > g.time) return;
          e.hc[key] = g.time;
          damage(g, e, s.dmg, key, { kb: s.kb || 0, fx: p.x, fy: p.y });
        });
      }
    } else if (s.kind === "aura") {
      if (w.cd > 0) continue;
      w.cd = s.tick;
      near(g, p.x, p.y, s.R + 20, (e) => {
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > (s.R + e.r) ** 2) return;
        if (s.slow) e.slow = Math.max(e.slow, s.slow);
        damage(g, e, s.dps * s.tick, key);
      });
    } else if (s.kind === "drop") {
      if (w.cd > 0) continue;
      w.cd = s.period;
      const vw = CORE.VIEW.w / 2, vh = CORE.VIEW.h / 2;
      const pool = g.enemies.filter((e) => !e.dead && Math.abs(e.x - p.x) < vw && Math.abs(e.y - p.y) < vh);
      for (let i = 0; i < s.n; i++) {
        let x: number, y: number;
        if (pool.length) { const e = pool[(g.r() * pool.length) | 0]; x = e.x; y = e.y; }
        else { x = p.x + (g.r() - 0.5) * vw * 1.6; y = p.y + (g.r() - 0.5) * vh * 1.6; }
        g.fx.push({ k: "drop", w: key, x, y, life: s.delay, max: s.delay, r: s.r, dmg: s.dmg, live: true });
      }
    }
  }
  // 탄
  for (const b of g.shots) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.lob) { b.vx *= 0.985; b.vy *= 0.985; }
    near(g, b.x, b.y, b.r + 20, (e) => {
      if (b.life <= 0 || b.pierce <= 0) return;
      if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 > (b.r + e.r) ** 2) return;
      if (b.lob) {
        if ((e.hc[b.w] || -9) + b.tick! > g.time) return;
        e.hc[b.w] = g.time;
      } else {
        if (b.hit.includes(e.id)) return;
        b.hit.push(e.id);
        b.pierce--;
      }
      damage(g, e, b.dmg, b.w, { kb: b.kb, fx: b.x - b.vx, fy: b.y - b.vy });
    });
    if (b.pierce <= 0) b.life = 0;
  }
  g.shots = g.shots.filter((b) => b.life > 0);
  for (const f of g.fx) {
    f.life -= dt;
    if (f.k === "drop" && f.live && f.life <= 0) {
      f.live = false;
      g.events.push({ e: "drop", w: f.w, x: f.x, y: f.y, r: f.r });
      near(g, f.x, f.y, f.r! + 20, (e) => { if ((e.x - f.x) ** 2 + (e.y - f.y) ** 2 <= (f.r! + e.r) ** 2) damage(g, e, f.dmg!, f.w!); });
    }
  }
  g.fx = g.fx.filter((f) => f.life > -0.3);
}

// ── 레벨업 3택 ───────────────────────────────────────────
// 카드 = { type: "weapon"|"passive"|"theme"|"evo"|"heal", key, lv(다음 단계) }
function candidates(g: Game): Card[] {
  const D = g.D, out: Card[] = [];
  const owned = new Set(g.weapons.map((w) => w.key));
  for (const w of g.weapons) {
    if (w.evo) continue;
    if (w.lv < CORE.MAX_LV) out.push({ type: "weapon", key: w.key, lv: w.lv + 1, wt: 1.6 });
  }
  if (g.weapons.length < CORE.SLOTS.weapon)
    for (const k in D.WEAPONS) if (!owned.has(k)) out.push({ type: "weapon", key: k, lv: 1, wt: 1.0 });
  const pOwned = Object.keys(g.passives);
  for (const a of pOwned) if (g.passives[a] < CORE.MAX_LV) out.push({ type: "passive", key: a, lv: g.passives[a] + 1, wt: 1.2 });
  if (pOwned.length < CORE.SLOTS.passive)
    for (const a in D.PASSIVES) if (!(a in g.passives)) out.push({ type: "passive", key: a, lv: 1, wt: 0.8 });
  for (const k in D.THEME_CARDS || {}) {
    const c = D.THEME_CARDS![k], lv = g.themeLv[k] || 0;
    if (lv < c.max && (!c.when || c.when(g))) out.push({ type: "theme", key: k, lv: lv + 1, wt: c.wt ?? 1.1 });
  }
  return out;
}
function evoReady(g: Game): Card | null {
  const D = g.D;
  for (const w of g.weapons) {
    const def = D.WEAPONS[w.key];
    if (!w.evo && def.evo && w.lv >= CORE.MAX_LV && (g.passives[def.evo.with] || 0) >= 1) return { type: "evo", key: w.key, lv: 0 };
  }
  return null;
}
function makeOffer(g: Game): Card[] {
  const pool = candidates(g), r = g.r, out: Card[] = [];
  const evo = evoReady(g);
  if (evo) out.push(evo); // 진화는 조건이 차면 첫 칸에 반드시
  while (out.length < 3 && pool.length) {
    let sum = 0;
    for (const c of pool) sum += c.wt!;
    let v = r() * sum, i = 0;
    for (; i < pool.length - 1; i++) if ((v -= pool[i].wt!) <= 0) break;
    out.push(pool.splice(i, 1)[0]);
  }
  if (!out.length) out.push({ type: "heal", key: "heal", lv: 0 }); // 다 찼으면 회복 한 장
  return out;
}
function levelUp(g: Game): void {
  g.lv++;
  g.state = "levelup";
  g.offer = makeOffer(g);
  g.events.push({ e: "levelup", lv: g.lv });
}
export function choose(g: Game, idx: number): boolean {
  if (g.state !== "levelup") return false;
  const c = g.offer![idx];
  if (!c) return false;
  if (c.type === "weapon") {
    const w = g.weapons.find((x) => x.key === c.key);
    if (w) w.lv = c.lv;
    else g.weapons.push({ key: c.key, lv: 1, cd: 0, t: 0 });
  } else if (c.type === "evo") {
    const w = g.weapons.find((x) => x.key === c.key)!;
    w.evo = true;
    g.events.push({ e: "evo", key: c.key });
  } else if (c.type === "passive") {
    g.passives[c.key] = c.lv;
    if (c.key === "hp") { g.p.maxHp += PASSIVE_AXES.hp; g.p.hp += PASSIVE_AXES.hp; }
  } else if (c.type === "theme") {
    g.themeLv[c.key] = c.lv;
    if (g.theme.onThemeCard) g.theme.onThemeCard(g, c.key, c.lv);
  } else if (c.type === "heal") {
    g.p.hp = Math.min(g.p.maxHp, g.p.hp + 30);
  }
  g.offer = null;
  g.state = "play";
  g.events.push({ e: "chose", card: c });
  if (g.levelsQueued > 0) { g.levelsQueued--; levelUp(g); }
  return true;
}
export function reroll(g: Game): boolean {
  if (g.state !== "levelup" || g.rerolls <= 0) return false;
  g.rerolls--;
  g.offer = makeOffer(g);
  return true;
}
export function gainXp(g: Game, v: number): void {
  g.xp += v;
  while (g.xp >= CORE.need(g.lv)) {
    g.xp -= CORE.need(g.lv);
    if (g.state === "levelup") g.levelsQueued++;
    else levelUp(g);
  }
}

// ── 한 틱 ────────────────────────────────────────────────
export function step(g: Game, dt = CORE.DT): void {
  if (g.state !== "play") return;
  const p = g.p, D = g.D, th = g.theme;
  g.time += dt;
  // 이동
  p.slow = 0;
  if (th.playerMod) th.playerMod(g, dt);
  let ix = g.input.x, iy = g.input.y;
  const m = Math.hypot(ix, iy);
  if (m > 1) { ix /= m; iy /= m; }
  const sp = moveSpeed(g);
  p.vx = ix * sp;
  p.vy = iy * sp;
  p.moving = m > 0.05;
  p.x = clamp(p.x + p.vx * dt, 6, g.world - 6);
  p.y = clamp(p.y + p.vy * dt, 8, g.world - 4);
  if (ix > 0.1) p.dir = 1;
  else if (ix < -0.1) p.dir = -1;
  if (p.iframe > 0) p.iframe -= dt;
  if (g.D.PLAYER.regen) p.hp = Math.min(p.maxHp, p.hp + g.D.PLAYER.regen * dt);
  if (th.afterMove) th.afterMove(g, dt);

  direct(g, dt);
  buildGrid(g);

  // 적 움직임: 목표 쪽으로 + 밀어내기(같은 칸·이웃 칸)
  for (const e of g.enemies) {
    if (e.dead) continue;
    e.t += dt;
    if (e.flash > 0) e.flash--;
    let mul = 1 - e.slow;
    e.slow = 0;
    if (e.stun > 0) { e.stun -= dt; mul = 0; }
    if (e.boss && th.bossStep) mul *= th.bossStep(g, e, dt);
    const tgt = th.targetOf ? th.targetOf(g, e) : p;
    const dx = tgt.x - e.x, dy = tgt.y - e.y, d = Math.hypot(dx, dy) || 1;
    const s = e.speed * mul;
    e.x += (dx / d) * s * dt + e.kx * dt;
    e.y += (dy / d) * s * dt + e.ky * dt;
    e.kx *= 0.86;
    e.ky *= 0.86;
    e.dir = dx < 0 ? -1 : 1;
  }
  for (const e of g.enemies) {
    if (e.dead || e.boss) continue;
    near(g, e.x, e.y, e.r * 2 + 2, (o) => {
      if (o === e || o.id < e.id) return;
      const dx = o.x - e.x, dy = o.y - e.y, rr = e.r + o.r, d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr || d2 === 0) return;
      const d = Math.sqrt(d2), push = (rr - d) * 0.5;
      const ux = dx / d, uy = dy / d;
      if (!o.boss) { o.x += ux * push; o.y += uy * push; }
      e.x -= ux * push;
      e.y -= uy * push;
    });
    e.x = clamp(e.x, 3, g.world - 3);
    e.y = clamp(e.y, 3, g.world - 3);
  }
  if (th.afterEnemies) th.afterEnemies(g, dt);

  // 주인공에 닿기
  near(g, p.x, p.y, p.r + 24, (e) => {
    if (e.inactive || e.stun > 0) return; // 솟는 중·잠든(기절) 적은 안 아프다
    if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= (p.r + e.r) ** 2) hurtPlayer(g, e.dmg, e.kind);
  });
  if (g.state !== "play") return;

  stepWeapons(g, dt);
  g.enemies = g.enemies.filter((e) => !e.dead);

  // 별가루·줍기
  const mg = magnet(g);
  for (const s of g.dust) {
    const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy);
    if (s.pull || d < mg) {
      s.pull = true;
      const v = Math.max(90, 260 - d) * dt;
      s.x += (dx / (d || 1)) * Math.min(v, d);
      s.y += (dy / (d || 1)) * Math.min(v, d);
    }
    if (d < p.r + 3) { s.got = true; gainXp(g, s.v); g.events.push({ e: "dust", v: s.v }); }
  }
  g.dust = g.dust.filter((s) => !s.got);
  if (g.dust.length > CORE.DUST_CAP) {
    g.dust.sort((a, b) => (b.x - p.x) ** 2 + (b.y - p.y) ** 2 - ((a.x - p.x) ** 2 + (a.y - p.y) ** 2));
    const far = g.dust.splice(0, g.dust.length - CORE.DUST_CAP + 20);
    const v = far.reduce((s, d) => s + d.v, 0);
    g.dust.push({ x: far[0].x, y: far[0].y, v });
  }
  for (const k of g.pickups) {
    if ((k.x - p.x) ** 2 + (k.y - p.y) ** 2 > (p.r + 6) ** 2) continue;
    k.got = true;
    if (k.kind === "heal") p.hp = Math.min(p.maxHp, p.hp + D.DROPS.healAmt);
    else if (k.kind === "magnet") for (const s of g.dust) s.pull = true;
    g.events.push({ e: "pick", kind: k.kind });
  }
  g.pickups = g.pickups.filter((k) => !k.got);

  if (th.afterStep) th.afterStep(g, dt);
  if (g.state === "play" && g.time >= D.DURATION) {
    g.state = "won";
    g.events.push({ e: "won" });
  }
}

export function score(g: Game): number { return g.theme.score ? g.theme.score(g) : Math.floor(g.time) * 10 + g.kills; }
