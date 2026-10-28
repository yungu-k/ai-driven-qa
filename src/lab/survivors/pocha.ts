// 그냥 오락실 D 「포장마차 사수」 — 소재 파일(수치표 + 갈고리). 뼈대는 ./core.ts.
// 규격 docs/lab-surv-pocha-spec.md. 🔴 표와 코드가 다르면 코드가 맞다.
// 시안 docs/lab-surv-pocha.js(md5 95dd2132…, 1판)를 그대로 옮긴 판이다. 동작은 바꾸지 않고 타입만 붙였다(tmp/lab-surv/equiv-pocha.mjs 가 잰다).
// 고유 장치: 「가게를 지키며 손님은 들이고 소동은 막는다」 — 비 오는 밤, 월드 가운데 포장마차 하나.
// 가게는 체력이 따로 있다(갈매기가 훔쳐 가고 취객이 들이받는다 — 0 이면 문을 닫고 진다).
// 우산 쓴 손님이 가장자리에서 가게로 걸어온다. 앉으면 몇 초마다 동전(경험치)을 낸다. 비둘기·취객이 닿거나
// 막내가 부딪히면 손님은 놀라 달아난다. 무기는 손님을 안 친다(손님은 적 목록 밖이다 — 뼈대 무수정).
// 가르기: 소동은 막고, 손님 길은 비워 둔다. 가게를 버리고 도망가면 가게가 무너진다.
import * as C from "./core.ts";
import type { DirectorRow, Enemy, EnemyDef, Game, Pos, ScheduleEvent, Theme, ThemeData, WeaponDef } from "./core.ts";

// ── 타입 ────────────────────────────────────────────────
export type PochaEnemyDef = EnemyDef & {
  /** 걷는 손님을 노리는 거리(비둘기) */
  guest?: number;
  /** 가게를 노린다 */
  shop?: boolean;
  /** 가게에 닿으면 훔치는 양 */
  steal?: number;
  /** 가게 둘레에서 맴돌다 내리꽂기(갈매기) */
  hover?: { R: number; t: number; spin: number };
  /** 가게에 붙어 초당 들이받는 양(취객) */
  bump?: number;
  /** 가게 테 + 이 안이면 소동 */
  ruckus?: number;
  /** 둘레 이 안의 손님을 놀래 달아나게 한다(노래하는 취객) */
  scare?: number;
  away?: { t: number; R: number };
  summon?: { kind: string; n: number; every: number };
  dash?: { every: number; warn: number; dur: number; mul: number };
  rain?: { R: number; slow: number };
  ringEvery?: number;
  ringN?: number;
};
/** 소재가 적에 붙이는 칸. 원본처럼 처음엔 비어 있다(undefined) — 미리 채우면 상태 대조가 갈린다.
 *  hov·hovA·_ht 는 갈매기에, sumT·dash*·warnT·ringT·awayT·awayTo 는 보스에만 생긴다 */
export type PochaEnemy = Enemy & {
  /** 맴돎 남은 시간(undefined = 아직 안 옴, 0 = 내리꽂는 중) */
  hov?: number;
  hovA?: number;
  _ht?: Pos;
  sumT?: number;
  dashCd?: number;
  dashT?: number;
  warnT?: number;
  dashTo?: Pos;
  ringT?: number;
  awayT?: number;
  awayTo?: Pos;
};
export type GuestState = "walk" | "sit" | "flee" | "leave";
export type Guest = {
  id: number;
  x: number;
  y: number;
  /** 0 = 노란 우산, 1 = 투명 우산 */
  kind: number;
  st: GuestState;
  seat: number | null;
  t: number;
  payT: number;
  wait: number;
  /** 비둘기에 몇 번 더 쪼이면 달아나나 */
  nerve: number;
  shooT: number;
  gone?: boolean;
};
export type Shop = { x: number; y: number; r: number; hp: number; maxHp: number; ruckus: number; ruckusT: number; hitT: number };
export type RainSpot = { x: number; y: number; r: number; slow: number };
export type PochaGame = Omit<Game, "enemies" | "bossAlive" | "stats"> & {
  enemies: PochaEnemy[];
  bossAlive: PochaEnemy | null;
  stats: Game["stats"] & { served: number; fled: number; paid: number; stolen: number };
  shop: Shop;
  guests: Guest[];
  guestT: number;
  nextGuest: number;
  /** 그리기용: 먹구름 장대비 자리 */
  rains: RainSpot[];
  /** 가게가 무너져 졌다(막내가 쓰러진 것과 가른다) */
  shopDown?: boolean;
};

// ── 수치표 ──────────────────────────────────────────────
const PLAYER = { r: 5, hp: 100, speed: 56, magnet: 22, regen: 0.25 };
// 가게: 월드 가운데. r 안으로는 막내도 적도 못 들어간다(밀려난다). 갈매기는 닿으면 steal 만큼 훔쳐 달아난다,
// 취객은 붙어서 초당 bump 만큼 들이받는다(그동안 소동 — 앉은 손님이 하나씩 일어난다, 돈을 안 낸다).
const SHOP = { x: 270, y: 270, r: 26, hp: 400, startOff: 44, repair: 4 }; // repair: 손님이 다 먹고 가면 가게 체력 +repair(번 돈으로 고친다)
// 손님: every 초마다(시간이 갈수록 짧아진다) 가게에서 dist 떨어진 곳에서 걸어온다. 앉을 자리 seats 개.
// 앉으면 stay 초 동안 pay 초마다 동전 coin 하나(가게 앞 seatR 자리에 떨어진다). 다 먹으면 떠난다(served).
// 놀람: 적(비둘기·취객 소동 둘레)이 닿거나 막내가 부딪히면 달아난다(fled). 소동이 나면 ruckusEvery 초마다 앉은 손님 하나가 일어난다.
const GUEST = { every: [6, 4.5, 3.6, 3.0], dist: 250, speed: 22, r: 5, seats: 6, seatR: 34, stay: 14, pay: 2.0, coin: 2, flee: 60, ruckusEvery: 1.5, noSeatWait: 4, nerve: 2, shoo: 0.8 }; // nerve: 비둘기에 몇 번 쪼여야 달아나나(그 전엔 우산으로 쫓는다 — shoo 초에 한 번)

// shop: 가게를 노린다(갈매기·취객·갈매기 대장). guest: 가까운 걷는 손님을 노린다(비둘기 — 손님 음식을 쪼러).
const ENEMIES: Record<string, PochaEnemyDef> = {
  pigeon: { name: "비둘기", hp: 7, speed: 30, r: 4, dmg: 2, xp: 1, guest: 40 },
  umbrella: { name: "날아온 우산", hp: 6, speed: 52, r: 3.5, dmg: 2, xp: 1 },
  // 갈매기: 가게 hover.R 안에 오면 hover.t 초 동안 가게 위를 맴돌다(예고) 내리꽂아 훔친다 — 막내가 달려가 막을 틈
  gull: { name: "갈매기", hp: 18, speed: 34, r: 4.5, dmg: 3, xp: 2, shop: true, steal: 2, hover: { R: 48, t: 2.5, spin: 0.9 } },
  drunk: { name: "취객", hp: 90, speed: 14, r: 8, dmg: 5, xp: 8, shop: true, bump: 0.8, ruckus: 46 },
  sing: { name: "노래하는 취객", hp: 140, speed: 12, r: 8, dmg: 5, xp: 10, shop: true, bump: 0.8, ruckus: 46, scare: 40 },
  // 갈매기 대장: 0.5초 예고 뒤 가게로 돌진(×2.4), 8초마다 갈매기 셋. 가게에 닿으면 크게 한 번 훔치고(steal) away 초 동안 물러났다 다시 온다.
  // (1판 시뮬: 가게에 붙어 1.2초마다 훔치게 두었더니 5분에 나오자마자 가게가 무너졌다 — 봇 셋 모두 5:00–5:50)
  gull_king: { name: "갈매기 대장", boss: true, hp: 2600, speed: 30, r: 18, dmg: 5, xp: 0, shop: true, steal: 12, away: { t: 3, R: 130 }, summon: { kind: "gull", n: 3, every: 8 }, dash: { every: 5, warn: 0.5, dur: 0.6, mul: 2.4 } },
  // 먹구름: 막내를 따라오며 아래에 장대비(느려짐). 10초마다 날아온 우산 14 원. 가까이 갈수록 비가 세다.
  rain_cloud: { name: "먹구름", boss: true, hp: 5400, speed: 18, r: 18, dmg: 8, xp: 0, rain: { R: 40, slow: 0.35 }, ringEvery: 10, ringN: 14 },
};

// 감독 밀도(rate·cap)는 C·A 와 같다. 종류를 바꿔 끼우고, 가게를 노리는 것(갈매기·취객)의 몫만 A 의 절반으로 — 같은 몫이면 가게가 4–5분에 무너졌다(규격 1-1).
const DIRECTOR: DirectorRow[] = [
  { t: 0, rate: 2.0, cap: 40, mix: { pigeon: 1 } },
  { t: 60, rate: 3.0, cap: 60, mix: { pigeon: 3, umbrella: 1 } },
  { t: 120, rate: 4.0, cap: 80, mix: { pigeon: 3, umbrella: 2, gull: 0.4 } },
  { t: 180, rate: 5.0, cap: 100, mix: { pigeon: 3, umbrella: 2, gull: 0.5 } },
  { t: 240, rate: 6.0, cap: 120, mix: { pigeon: 2, umbrella: 2, gull: 0.5, drunk: 0.15 } },
  { t: 300, rate: 4.0, cap: 100, mix: { pigeon: 3, umbrella: 1 } }, // 갈매기 대장 동안 숨 돌림
  { t: 360, rate: 7.0, cap: 140, mix: { pigeon: 3, umbrella: 2, gull: 0.6, drunk: 0.2, sing: 0.1 } },
  { t: 420, rate: 8.0, cap: 150, mix: { pigeon: 3, umbrella: 2.5, gull: 0.75, drunk: 0.25, sing: 0.15 } },
  { t: 480, rate: 9.0, cap: 150, mix: { pigeon: 3, umbrella: 3, gull: 0.9, drunk: 0.3, sing: 0.2 } },
  { t: 540, rate: 5.0, cap: 120, mix: { pigeon: 3, umbrella: 2 } }, // 먹구름
  { t: 585, rate: 10.0, cap: 150, mix: { pigeon: 4, umbrella: 3, gull: 0.5 } }, // 비 그치기 직전 몰아치기
];
const EVENTS: ScheduleEvent[] = [
  { t: 150, ring: "pigeon", n: 22, R: 70, say: "비둘기 떼가 몰려온다" },
  { t: 300, boss: "gull_king", say: "갈매기 대장이 가게를 노린다" },
  { t: 390, ring: "umbrella", n: 28, R: 78, say: "돌풍 — 우산이 날아온다" },
  { t: 480, ring: "pigeon", n: 36, R: 74 },
  { t: 540, boss: "rain_cloud", say: "먹구름이다 — 아래는 장대비" },
  { t: 585, say: "비가 그치려 한다" },
];
const HP_BY_MIN = [1, 1.1, 1.3, 1.5, 1.8, 2.1, 2.5, 2.9, 3.4, 4.0];

// 무기: 포장마차 물건. kind 는 뼈대 행동 다섯 가지. 수치는 A 도깨비와 같다(소재만 바뀌게).
const WEAPONS: Record<string, WeaponDef> = {
  skewer: {
    name: "어묵 꼬치", kind: "shot",
    lv: [
      { dmg: 8, period: 1.0, n: 1, speed: 150, range: 100, pierce: 1, r: 3, kb: 40 },
      { dmg: 10, period: 0.95, n: 1, speed: 150, range: 100, pierce: 1, r: 3, kb: 40 },
      { dmg: 10, period: 0.9, n: 2, speed: 150, range: 100, pierce: 1, r: 3, kb: 40 },
      { dmg: 13, period: 0.85, n: 2, speed: 160, range: 110, pierce: 2, r: 3, kb: 45 },
      { dmg: 15, period: 0.8, n: 3, speed: 160, range: 110, pierce: 2, r: 3, kb: 45 },
    ],
    evo: { with: "dmg", name: "꼬치 한 다발", dmg: 18, period: 0.7, n: 5, spread: 0.3, speed: 170, range: 120, pierce: 3, r: 4, kb: 55 },
  },
  steam: {
    name: "모락모락 김", kind: "aura",
    lv: [
      { R: 22, dps: 6, tick: 0.5 },
      { R: 25, dps: 8, tick: 0.5 },
      { R: 28, dps: 10, tick: 0.5, slow: 0.15 },
      { R: 31, dps: 13, tick: 0.5, slow: 0.2 },
      { R: 34, dps: 16, tick: 0.5, slow: 0.25 },
    ],
    evo: { with: "cd", name: "펄펄 끓는 솥", R: 44, dps: 22, tick: 0.5, slow: 0.4 },
  },
  bungeo: {
    name: "붕어빵 낙하", kind: "drop",
    lv: [
      { dmg: 20, period: 2.4, n: 1, r: 12, delay: 0.45 },
      { dmg: 24, period: 2.2, n: 2, r: 12, delay: 0.45 },
      { dmg: 30, period: 2.2, n: 2, r: 13, delay: 0.45 },
      { dmg: 34, period: 2.1, n: 3, r: 14, delay: 0.45 },
      { dmg: 40, period: 2.0, n: 4, r: 16, delay: 0.45 },
    ],
    evo: { with: "area", name: "붕어빵 소나기", dmg: 48, period: 1.8, n: 8, r: 18, delay: 0.45 },
  },
  ladle: {
    name: "국자 휘두르기", kind: "orbit",
    lv: [
      { n: 1, R: 24, r: 6, spin: 3.0, dmg: 9, tick: 0.5, kb: 30 },
      { n: 2, R: 24, r: 6, spin: 3.0, dmg: 10, tick: 0.5, kb: 30 },
      { n: 2, R: 26, r: 6, spin: 3.1, dmg: 13, tick: 0.5, kb: 35 },
      { n: 3, R: 26, r: 7, spin: 3.1, dmg: 15, tick: 0.5, kb: 35 },
      { n: 4, R: 28, r: 7, spin: 3.2, dmg: 18, tick: 0.5, kb: 40 },
    ],
    evo: { with: "hp", name: "국자 회오리", n: 6, R: 30, r: 8, spin: 3.4, dmg: 24, tick: 0.45, kb: 50 },
  },
  hotteok: {
    name: "호떡 굴리기", kind: "lob",
    lv: [
      { dmg: 6, period: 2.6, n: 1, r: 9, speed: 40, life: 2.4, tick: 0.4 },
      { dmg: 8, period: 2.5, n: 1, r: 10, speed: 40, life: 2.6, tick: 0.4 },
      { dmg: 9, period: 2.4, n: 2, r: 10, speed: 42, life: 2.6, tick: 0.4 },
      { dmg: 11, period: 2.3, n: 2, r: 11, speed: 42, life: 2.8, tick: 0.35 },
      { dmg: 13, period: 2.2, n: 3, r: 12, speed: 44, life: 3.0, tick: 0.35 },
    ],
    evo: { with: "move", name: "왕호떡", dmg: 16, period: 1.6, n: 4, r: 14, speed: 46, life: 3.4, tick: 0.3 },
  },
};
const PASSIVES = { dmg: "매운맛", cd: "빠른 손", area: "넓은 앞치마", move: "장화", hp: "따끈한 국물", magnet: "동전 통" };
// 소재 고유 카드: 가게 축. 칸 밖.
const THEME_CARDS = {
  tape: { name: "테이프 수선", max: 3, wt: 1.2, heal: 40, regen: 0.4 }, // 가게 체력 즉시 +heal, 초당 +regen/단계
  stools: { name: "의자 더 놓기", max: 2, wt: 1.1, add: 2 },
  menu: { name: "오늘의 메뉴", max: 3, wt: 1.1, coin: 1 }, // 손님이 내는 동전 +1/단계
  tent: { name: "우산 빌려주기", max: 2, wt: 0.9, speed: 0.25 }, // 손님 걸음 +25 %/단계, 1단계부터 막내와 부딪혀도 안 놀란다
  broom: { name: "빗자루 문지기", max: 2, wt: 1.0, R: 16, dps: [7, 14] }, // 가게 둘레를 지키는 빗자루(가게 테 + R 안 지속 피해)
};
const DROPS = { heal: 0.015, magnet: 0.003, healAmt: 25, bossDust: 30 };

export const DATA = { WORLD: 540, DURATION: 600, PLAYER, SHOP, GUEST, ENEMIES, DIRECTOR, EVENTS, HP_BY_MIN, WEAPONS, PASSIVES, THEME_CARDS, DROPS, START_WEAPONS: ["skewer"] } satisfies ThemeData & Record<string, unknown>; // SHOP·GUEST 는 소재 몫 칸

function lv(g: PochaGame, k: string): number { return g.themeLv[k] || 0; }
function seats(g: PochaGame): number { return GUEST.seats + lv(g, "stools") * THEME_CARDS.stools.add; }
function guestEvery(g: PochaGame): number { return GUEST.every[Math.min(GUEST.every.length - 1, (g.time / 150) | 0)]; }
function seatPos(g: PochaGame, k: number): [number, number] { const n = seats(g), a = (k / n) * Math.PI * 2 + Math.PI / 2; return [SHOP.x + Math.cos(a) * GUEST.seatR, SHOP.y + Math.sin(a) * GUEST.seatR * 0.8]; }

function init(g: PochaGame): void {
  g.shop = { x: SHOP.x, y: SHOP.y, r: SHOP.r, hp: SHOP.hp, maxHp: SHOP.hp, ruckus: 0, ruckusT: 0, hitT: 0 };
  g.p.y = SHOP.y + SHOP.startOff; // 가게 앞에서 시작(가게 안이면 밀려나 첫 프레임이 튄다)
  g.guests = [];
  g.guestT = 2;
  g.nextGuest = 1;
  g.rains = []; // 그리기용: 먹구름 장대비 자리
  g.stats.served = 0;
  g.stats.fled = 0;
  g.stats.paid = 0;
  g.stats.stolen = 0;
}
function onThemeCard(g: PochaGame, key: string): void {
  if (key === "tape") g.shop.hp = Math.min(g.shop.maxHp, g.shop.hp + THEME_CARDS.tape.heal);
}
function freeSeat(g: PochaGame): number {
  const n = seats(g), used = new Set<number>();
  for (const q of g.guests) if (q.seat != null) used.add(q.seat);
  for (let k = 0; k < n; k++) if (!used.has(k)) return k;
  return -1;
}
function scare(g: PochaGame, q: Guest, why: string): void {
  if (q.st === "flee" || q.st === "leave") return;
  q.st = "flee";
  q.seat = null;
  g.stats.fled++;
  g.events.push({ e: "fled", x: q.x, y: q.y, why });
}
// 가게 밖으로 밀어내기(원)
function pushOut(o: Pos, r: number): void {
  const dx = o.x - SHOP.x, dy = o.y - SHOP.y, d = Math.hypot(dx, dy) || 1, R = SHOP.r + r;
  if (d < R) { o.x = SHOP.x + (dx / d) * R; o.y = SHOP.y + (dy / d) * R; }
}

function playerMod(g: PochaGame): void {
  for (const r of g.rains) if ((g.p.x - r.x) ** 2 + (g.p.y - r.y) ** 2 < r.r * r.r) g.p.slow = Math.max(g.p.slow || 0, r.slow);
}
function afterMove(g: PochaGame, dt: number): void {
  const p = g.p;
  pushOut(p, p.r);
  // 손님 오기
  g.guestT -= dt;
  if (g.guestT <= 0) {
    g.guestT = guestEvery(g);
    const a = g.r() * Math.PI * 2;
    const x = C.clamp(SHOP.x + Math.cos(a) * GUEST.dist, 10, g.world - 10), y = C.clamp(SHOP.y + Math.sin(a) * GUEST.dist, 10, g.world - 10);
    g.guests.push({ id: g.nextGuest++, x, y, kind: g.r() < 0.5 ? 0 : 1, st: "walk", seat: null, t: 0, payT: GUEST.pay, wait: 0, nerve: GUEST.nerve, shooT: 0 });
  }
  const sp = GUEST.speed * (1 + lv(g, "tent") * THEME_CARDS.tent.speed);
  for (const q of g.guests) {
    q.t += dt;
    if (q.st === "walk") {
      if (q.seat == null) { const k = freeSeat(g); if (k >= 0) q.seat = k; }
      const [tx, ty] = q.seat != null ? seatPos(g, q.seat) : [SHOP.x, SHOP.y + SHOP.r + 18];
      const dx = tx - q.x, dy = ty - q.y, d = Math.hypot(dx, dy) || 1;
      if (d < 2) {
        if (q.seat != null) { q.st = "sit"; q.t = 0; q.payT = GUEST.pay; g.events.push({ e: "seated", x: q.x, y: q.y }); }
        else { q.wait += dt; if (q.wait > GUEST.noSeatWait) { q.st = "leave"; g.events.push({ e: "noseat", x: q.x, y: q.y }); } }
      } else { const s = Math.min(d, sp * dt); q.x += (dx / d) * s; q.y += (dy / d) * s; }
      // 막내와 부딪힘: 놀란다(우산 빌려주기 1단계부터는 안 놀란다)
      if (!lv(g, "tent") && (q.x - p.x) ** 2 + (q.y - p.y) ** 2 < (p.r + GUEST.r) ** 2) scare(g, q, "bump");
    } else if (q.st === "sit") {
      const [tx, ty] = seatPos(g, q.seat!);
      q.x = tx; q.y = ty;
      if (!g.shop.ruckus) {
        q.payT -= dt;
        if (q.payT <= 0) {
          q.payT = GUEST.pay;
          const v = GUEST.coin + lv(g, "menu") * THEME_CARDS.menu.coin;
          // 동전은 손님 자리 바깥쪽(가게 반대편)에 떨어진다 — 막내가 가게 둘레를 돌며 줍는다
          const dx = q.x - SHOP.x, dy = q.y - SHOP.y, d = Math.hypot(dx, dy) || 1;
          g.dust.push({ x: q.x + (dx / d) * 10, y: q.y + (dy / d) * 10, v });
          g.stats.paid += v;
        }
      }
      if (q.t >= GUEST.stay) { q.st = "leave"; q.seat = null; g.stats.served++; g.shop.hp = Math.min(g.shop.maxHp, g.shop.hp + SHOP.repair); g.events.push({ e: "served", x: q.x, y: q.y }); }
    } else {
      // 떠나기·달아나기: 가게 반대쪽으로
      const dx = q.x - SHOP.x, dy = q.y - SHOP.y, d = Math.hypot(dx, dy) || 1, s = (q.st === "flee" ? GUEST.flee : sp) * dt;
      q.x += (dx / d) * s; q.y += (dy / d) * s;
      if (d > GUEST.dist + 20 || q.x < 2 || q.y < 2 || q.x > g.world - 2 || q.y > g.world - 2) q.gone = true;
    }
  }
  g.guests = g.guests.filter((q) => !q.gone);
}

// 가게 노리는 것은 가게로, 비둘기는 가까운 걷는 손님에게(없으면 막내), 나머지는 막내
function targetOf(g: PochaGame, e: PochaEnemy): Pos {
  const def = ENEMIES[e.kind];
  if (e.boss && e.awayT! > 0) return e.awayTo!; // 훔치고 물러나는 중
  if (e.boss && e.dashT! > 0) return e.dashTo!;
  if (def.hover) {
    if (e.hov == null) { if ((e.x - SHOP.x) ** 2 + (e.y - SHOP.y) ** 2 < (SHOP.r + def.hover.R) ** 2) { e.hov = def.hover.t; e.hovA = Math.atan2(e.y - SHOP.y, e.x - SHOP.x); } }
    if (e.hov! > 0) {
      const a = e.hovA! + def.hover.spin;
      const ht = (e._ht = e._ht || ({} as Pos));
      ht.x = SHOP.x + Math.cos(a) * (SHOP.r + def.hover.R * 0.7);
      ht.y = SHOP.y + Math.sin(a) * (SHOP.r + def.hover.R * 0.7);
      return ht;
    }
  }
  if (def.shop) return g.shop;
  if (def.guest) {
    let best: Guest | null = null, bd = def.guest * def.guest;
    for (const q of g.guests) {
      if (q.st !== "walk") continue;
      const d = (q.x - e.x) ** 2 + (q.y - e.y) ** 2;
      if (d < bd) { bd = d; best = q; }
    }
    if (best) return best;
  }
  return g.p;
}

function onSpawn(g: PochaGame, e: PochaEnemy): void {
  if (e.boss) { e.sumT = 0; e.dashCd = ENEMIES[e.kind].dash ? ENEMIES[e.kind].dash!.every : 0; e.dashT = 0; e.warnT = 0; e.ringT = ENEMIES[e.kind].ringEvery || 0; e.awayT = 0; }
}

function bossStep(g: PochaGame, e: PochaEnemy, dt: number): number {
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
    else if (!(e.awayT! > 0)) {
      e.dashCd! -= dt;
      if (e.dashCd! <= 0) { e.dashCd = def.dash.every; e.warnT = def.dash.warn; e.dashTo = { x: SHOP.x, y: SHOP.y }; g.events.push({ e: "warn", en: e, x: SHOP.x, y: SHOP.y }); }
    }
  }
  if (def.rain) {
    e.ringT! -= dt;
    if (e.ringT! <= 0) {
      e.ringT = def.ringEvery;
      for (let i = 0; i < def.ringN!; i++) { const a = (i / def.ringN!) * Math.PI * 2; C.spawnAt(g as never, "umbrella", g.p.x + Math.cos(a) * 80, g.p.y + Math.sin(a) * 80); }
    }
  }
  return mul;
}

function hurtShop(g: PochaGame, amt: number, src: string): void {
  if (g.state !== "play") return;
  g.shop.hp -= amt;
  g.shop.hitT = 0.25;
  g.stats.stolen += amt;
  g.events.push({ e: "shophit", amt, src });
  if (g.shop.hp <= 0) { g.shop.hp = 0; g.state = "lost"; g.shopDown = true; g.events.push({ e: "shopdown" }); g.events.push({ e: "lost" }); }
}

function afterEnemies(g: PochaGame, dt: number): void {
  const shop = g.shop;
  let ruckus = 0;
  g.rains.length = 0;
  for (const e of g.enemies) {
    if (e.dead) continue;
    const def = ENEMIES[e.kind];
    if (e.hov! > 0) { e.hov = Math.max(0, e.hov! - dt); e.hovA = Math.atan2(e.y - SHOP.y, e.x - SHOP.x); if (!e.hov) g.events.push({ e: "dive", en: e }); }
    // 가게 테: 밀려나고, 닿은 것은 가게를 다치게 한다
    const dx = e.x - SHOP.x, dy = e.y - SHOP.y, d = Math.hypot(dx, dy) || 1, R = SHOP.r + e.r;
    if (!e.boss && d < R) { e.x = SHOP.x + (dx / d) * R; e.y = SHOP.y + (dy / d) * R; }
    const touch = d < R + 2;
    if (touch && def.steal && !e.boss) { hurtShop(g, def.steal, e.kind); e.dead = true; g.events.push({ e: "steal", x: e.x, y: e.y }); continue; } // 훔쳐 달아난다(경험치 없음)
    if (touch && e.boss && def.steal && !(e.awayT! > 0)) {
      hurtShop(g, def.steal, e.kind);
      const a = Math.atan2(e.y - SHOP.y, e.x - SHOP.x);
      e.awayT = def.away!.t; e.awayTo = { x: C.clamp(SHOP.x + Math.cos(a) * def.away!.R, 20, g.world - 20), y: C.clamp(SHOP.y + Math.sin(a) * def.away!.R, 20, g.world - 20) };
      e.dashT = 0; e.warnT = 0; e.dashCd = def.dash!.every;
      g.events.push({ e: "steal", x: e.x, y: e.y, boss: true });
    }
    if (e.awayT! > 0) e.awayT! -= dt;
    if (touch && def.bump && e.stun <= 0) hurtShop(g, def.bump * dt, e.kind);
    if (def.ruckus && d < SHOP.r + def.ruckus && e.stun <= 0) ruckus++;
    // 손님 놀래기: 비둘기는 닿으면, 노래하는 취객은 둘레 scare 안이면
    if (!e.boss) for (const q of g.guests) {
      if (q.st === "flee" || q.st === "leave") continue;
      const R2 = def.scare ? def.scare : e.r + GUEST.r;
      if ((q.x - e.x) ** 2 + (q.y - e.y) ** 2 >= R2 * R2) continue;
      if (def.scare || e.kind !== "pigeon") { scare(g, q, e.kind); continue; }
      // 비둘기: 우산으로 몇 번 쫓아낸다(밀어냄), nerve 가 다 닳으면 달아난다
      if (q.shooT > 0) continue;
      q.shooT = GUEST.shoo;
      if (--q.nerve <= 0) scare(g, q, e.kind);
      else { const ux = e.x - q.x, uy = e.y - q.y, u = Math.hypot(ux, uy) || 1; e.kx += (ux / u) * 60; e.ky += (uy / u) * 60; g.events.push({ e: "shoo", x: q.x, y: q.y }); }
    }
    if (def.rain) g.rains.push({ x: e.x, y: e.y, r: def.rain.R, slow: def.rain.slow }); // 느려짐은 다음 걸음에(playerMod — 뼈대가 걸음 앞에서 slow 를 0 으로 되돌린다)
  }
  // 소동: 가게 둘레 취객이 있으면 손님이 하나씩 일어나고 돈을 안 낸다
  const was = shop.ruckus;
  shop.ruckus = ruckus;
  if (ruckus && !was) g.events.push({ e: "ruckus" });
  if (ruckus) {
    shop.ruckusT -= dt;
    if (shop.ruckusT <= 0) {
      shop.ruckusT = GUEST.ruckusEvery;
      const q = g.guests.find((q) => q.st === "sit");
      if (q) scare(g, q, "ruckus");
    }
  } else shop.ruckusT = GUEST.ruckusEvery;
  // 빗자루 문지기
  const b = lv(g, "broom");
  if (b) {
    const B = THEME_CARDS.broom, RR = SHOP.r + B.R;
    C.near(g as never, SHOP.x, SHOP.y, RR + 20, (e) => {
      if ((e.x - SHOP.x) ** 2 + (e.y - SHOP.y) ** 2 > (RR + e.r) ** 2) return;
      if ((e.hc.broom || -9) + 0.5 <= g.time) { e.hc.broom = g.time; C.damage(g as never, e, B.dps[b - 1] * 0.5, "broom"); }
    });
  }
}

function afterStep(g: PochaGame, dt: number): void {
  for (const q of g.guests) if (q.shooT > 0) q.shooT -= dt;
  const tp = lv(g, "tape");
  if (tp && g.state === "play") g.shop.hp = Math.min(g.shop.maxHp, g.shop.hp + tp * THEME_CARDS.tape.regen * dt);
  if (g.shop.hitT > 0) g.shop.hitT -= dt;
  if (g.state === "play" && g.time >= DATA.DURATION) {
    for (const e of g.enemies) e.dead = true; // 비가 그치면 소동도 흩어진다
    g.events.push({ e: "clear" });
  }
}

// 랭크 점수: 버틴 시간이 주, 손님 대접(다 먹고 간 수)·지킨 가게가 부.
function score(g: PochaGame): number {
  const won = g.state === "won";
  return Math.floor(g.time) * 10 + g.kills + g.stats.served * 40 + (won ? 5000 + Math.round(g.p.hp) * 10 + Math.round(g.shop.hp) * 20 : 0);
}
function dawn(g: Game): number { return C.clamp((g.time - 420) / 180, 0, 1); } // 새벽: 7분 0 → 10분 1(그리기 몫)

export type PochaTheme = Theme & {
  id: string;
  name: string;
  DATA: typeof DATA;
  dawn(g: Game): number;
  seats(g: Game): number;
  seatPos(g: Game, k: number): [number, number];
};
export const THEME: PochaTheme = { id: "pocha", name: "포장마차 사수", DATA, init, onThemeCard, playerMod, afterMove, targetOf, onSpawn, bossStep, afterEnemies, afterStep, score, dawn, seats, seatPos };
export default THEME;
