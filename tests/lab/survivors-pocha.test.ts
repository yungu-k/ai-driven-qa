// 실행: node --test "tests/lab/*.test.ts"
// D 포장마차 사수(src/lab/survivors/pocha.ts) — 고유 장치(손님이 앉아 동전을 내고 가면 가게가 고쳐진다 · 부딪히면 달아난다 ·
// 갈매기가 맴돌다 훔친다 · 취객 소동 · 가게 0 이면 진다)와 점수식. 규격 docs/lab-surv-pocha-spec.md 1절·6절(P2–P4).
// 숫자는 코드(DATA)가 정본이다 — 검사도 DATA 를 읽고, 규격 숫자와 같은지는 따로 한 번 본다.
// 사건을 모아 보는 검사는 먼저 그 사건이 나왔는지(> 0)부터 단언한다 — 빈 집합의 집계는 통과 쪽으로 기운다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CORE, create, step, spawnAt, score, type GameEvent } from "../../src/lab/survivors/core.ts";
import { THEME, DATA, type PochaGame, type PochaEnemy, type Guest } from "../../src/lab/survivors/pocha.ts";

const DT = CORE.DT;
const STILL = { x: 0, y: 0 };
const SHOP = DATA.SHOP, GUEST = DATA.GUEST, EN = DATA.ENEMIES;

/** 감독이 적을 못 낳고 무기도 없고 손님도 저절로 안 오는 판(손으로 세운 것만 보게). 막내는 가게에서 먼 구석 */
function quietGame(seed = 1): PochaGame {
  const g = create(THEME, seed) as unknown as PochaGame;
  g.spawnAcc = -1e9;
  g.sched = [];
  g.weapons.length = 0;
  g.guestT = 1e9;
  g.p.x = 60;
  g.p.y = 60;
  return g;
}
function tick(g: PochaGame, input = STILL): GameEvent[] {
  g.input = { x: input.x, y: input.y };
  step(g as never);
  const ev = g.events.slice();
  g.events.length = 0;
  return ev;
}
function frames(g: PochaGame, n: number, input = STILL): GameEvent[] {
  const all: GameEvent[] = [];
  for (let i = 0; i < n; i++) all.push(...tick(g, input));
  return all;
}
function guest(g: PochaGame, x: number, y: number, extra: Partial<Guest> = {}): Guest {
  const q: Guest = { id: g.nextGuest++, x, y, kind: 0, st: "walk", seat: null, t: 0, payT: GUEST.pay, wait: 0, nerve: GUEST.nerve, shooT: 0, ...extra };
  g.guests.push(q);
  return q;
}
function foe(g: PochaGame, kind: string, x: number, y: number, extra: Record<string, number> = {}, hp = 1e6): PochaEnemy {
  return spawnAt(g as never, kind, x, y, { hp, maxHp: hp, ...extra }) as PochaEnemy;
}
const count = (ev: GameEvent[], k: string) => ev.filter((e) => e.e === k).length;
const dShop = (o: { x: number; y: number }) => Math.hypot(o.x - SHOP.x, o.y - SHOP.y);

test("수치표가 규격 1절 숫자와 같다(규격이 코드를 따라왔는지)", () => {
  assert.deepEqual([SHOP.x, SHOP.y, SHOP.r, SHOP.hp, SHOP.repair], [270, 270, 26, 400, 4]);
  assert.deepEqual(GUEST.every, [6, 4.5, 3.6, 3]);
  assert.deepEqual([GUEST.dist, GUEST.speed, GUEST.seats, GUEST.noSeatWait, GUEST.stay, GUEST.pay, GUEST.coin, GUEST.nerve, GUEST.ruckusEvery], [250, 22, 6, 4, 14, 2, 2, 2, 1.5]);
  assert.deepEqual([EN.pigeon.guest, EN.gull.hover!.R, EN.gull.hover!.t, EN.gull.steal, EN.drunk.bump, EN.drunk.ruckus, EN.sing.scare], [40, 48, 2.5, 2, 0.8, 46, 40]);
  assert.deepEqual([EN.gull_king.steal, EN.gull_king.away!.t, EN.gull_king.dash!.mul, EN.rain_cloud.rain!.slow], [12, 3, 2.4, 0.35]);
  // 무기는 손님을 안 친다: 손님은 적 목록 밖
  assert.ok(!Object.keys(EN).some((k) => /guest/.test(k)));
});

test("손님: 걸어와 앉고, 2초마다 동전 2를 가게 바깥쪽에 떨구고, 14초 뒤 다 먹고 가면 손님 +1·가게 +4", () => {
  const g = quietGame();
  g.shop.hp = 300;
  const [sx, sy] = THEME.seatPos(g as never, 0);
  const q = guest(g, sx, sy + 20);
  let ev: GameEvent[] = [];
  for (let f = 0; f < 120 && q.st === "walk"; f++) ev.push(...tick(g));
  assert.equal(q.st, "sit", "2초 안에 앉는다");
  assert.equal(count(ev, "seated"), 1);
  assert.equal(q.seat, 0);
  ev = [];
  const dust0 = g.dust.length;
  for (let f = 0; f < 60 * 16 && q.st === "sit"; f++) ev.push(...tick(g));
  assert.equal(q.st, "leave", "14초 뒤 떠난다");
  assert.ok(Math.abs(q.t - GUEST.stay) < 2 * DT, `앉은 시간 ${q.t}`);
  const coins = g.dust.slice(dust0);
  assert.ok(coins.length >= 6 && coins.length <= 7, `동전 ${coins.length}`);
  assert.ok(coins.every((c) => c.v === GUEST.coin));
  assert.equal(g.stats.paid, coins.length * GUEST.coin);
  assert.ok(coins.every((c) => dShop(c) > GUEST.seatR * 0.8 + 5), "가게 바깥쪽");
  assert.equal(count(ev, "served"), 1);
  assert.equal(g.stats.served, 1);
  assert.equal(g.shop.hp, 300 + SHOP.repair);
  // 떠난 손님은 가게 반대쪽으로 걸어 사라진다
  const d0 = dShop(q);
  frames(g, 60);
  assert.ok(!g.guests.includes(q) || dShop(q) > d0 + 15, "멀어진다");
  // 가게 체력은 최대를 넘지 않는다
  const h = quietGame();
  const [hx, hy] = THEME.seatPos(h as never, 0);
  guest(h, hx, hy, { st: "sit", seat: 0, t: GUEST.stay - DT / 2 });
  tick(h);
  assert.equal(h.stats.served, 1);
  assert.equal(h.shop.hp, SHOP.hp);
});

test("자리 여섯이 차면 일곱째는 가게 앞에서 4초 기다리다 떠난다(noseat)", () => {
  const g = quietGame();
  for (let k = 0; k < GUEST.seats; k++) { const [x, y] = THEME.seatPos(g as never, k); guest(g, x, y, { st: "sit", seat: k, t: -1e9 }); }
  const q = guest(g, SHOP.x, SHOP.y + SHOP.r + 18 + 10);
  const ev = frames(g, 60 * 6);
  assert.equal(q.seat, null);
  assert.equal(count(ev, "noseat"), 1);
  assert.equal(q.st, "leave");
  assert.ok(q.wait > GUEST.noSeatWait && q.wait < GUEST.noSeatWait + 1);
});

test("막내가 걷는 손님에 부딪히면 바로 달아난다(P2) — 우산 빌려주기 1단계부터는 안 놀란다", () => {
  const g = quietGame();
  g.p.x = 200; g.p.y = 150;
  const q = guest(g, 225, 150);
  const ev = frames(g, 60, { x: 1, y: 0 });
  const fled = ev.filter((e) => e.e === "fled");
  assert.equal(fled.length, 1, "한 번 달아남");
  assert.equal(fled[0].why, "bump");
  assert.equal(q.st, "flee");
  assert.equal(q.seat, null, "잡아 둔 자리를 놓는다");
  assert.equal(g.stats.fled, 1);
  // 달아나는 걸음(60)은 걷는 걸음(22)보다 빠르다 — 가게에서 멀어진다
  const d0 = dShop(q);
  frames(g, 30);
  assert.ok(dShop(q) - d0 > GUEST.flee * 0.5 * 0.9, `달아남 ${dShop(q) - d0}`);
  // 대조군: 가만히 있으면 안 놀란다(손님은 막내를 피해 가지 않지만 막내가 자리에 없다)
  const c = quietGame();
  c.p.x = 200; c.p.y = 150;
  guest(c, 225, 150);
  assert.equal(count(frames(c, 60), "fled"), 0);
  // 우산 빌려주기
  const h = quietGame();
  h.themeLv.tent = 1;
  h.p.x = 200; h.p.y = 150;
  const r = guest(h, 225, 150);
  assert.equal(count(frames(h, 60, { x: 1, y: 0 }), "fled"), 0);
  assert.equal(r.st, "walk");
});

test("비둘기: 걷는 손님을 쫓아 쪼면 두 번은 우산으로 쫓고(밀려남) 세 번째에 달아난다", () => {
  const g = quietGame();
  const q = guest(g, 150, 150, { st: "walk" });
  const pg = foe(g, "pigeon", 150 + 30, 150);
  let ev: GameEvent[] = [];
  // 손님 걸음을 막아 비둘기가 계속 닿게(쫓는 것만 본다)
  for (let f = 0; f < 60 * 5 && q.st === "walk"; f++) { q.x = 150; q.y = 150; ev.push(...tick(g)); }
  assert.equal(count(ev, "shoo"), GUEST.nerve - 1, "쫓기 횟수");
  assert.equal(q.st, "flee");
  const fled = ev.filter((e) => e.e === "fled");
  assert.equal(fled.length, 1);
  assert.equal(fled[0].why, "pigeon");
  assert.ok(pg.hp > 0);
  // 40 밖 손님은 안 쫓는다 — 막내를 쫓는다
  const h = quietGame();
  h.p.x = 400; h.p.y = 150;
  const far = guest(h, 150, 150);
  const p2 = foe(h, "pigeon", 150 + 45, 150);
  const x0 = p2.x;
  for (let f = 0; f < 30; f++) { far.x = 150; far.y = 150; tick(h); }
  assert.ok(p2.x > x0, "막내 쪽(오른쪽)으로");
});

test("갈매기: 가게 테 + 48 안에 오면 2.5초 맴돌며 예고하고 그 뒤 내리꽂아 2를 훔쳐 사라진다(경험치 없음)", () => {
  const g = quietGame();
  const gl = foe(g, "gull", SHOP.x + SHOP.r + 46, SHOP.y);
  let hoverF = 0, firstSteal = -1, minHoverD = 1e9;
  const ev: GameEvent[] = [];
  for (let f = 0; f < 60 * 6 && firstSteal < 0; f++) {
    const e = tick(g);
    ev.push(...e);
    if (gl.hov! > 0) { hoverF++; minHoverD = Math.min(minHoverD, dShop(gl)); }
    if (e.some((x) => x.e === "steal")) firstSteal = f;
  }
  assert.ok(Math.abs(hoverF - 60 * EN.gull.hover!.t) <= 2, `맴돈 프레임 ${hoverF}`);
  assert.ok(minHoverD > SHOP.r + gl.r + 2, `맴도는 동안 가게에 안 닿는다 ${minHoverD}`);
  assert.equal(count(ev, "dive"), 1);
  assert.ok(firstSteal > hoverF, "맴돈 뒤에 훔친다");
  assert.equal(count(ev, "shophit"), 1);
  assert.equal(g.shop.hp, SHOP.hp - EN.gull.steal!);
  assert.equal(g.stats.stolen, EN.gull.steal);
  assert.equal(g.enemies.includes(gl), false, "훔쳐 사라진다");
  assert.equal(g.kills, 0);
  assert.equal(g.dust.length, 0, "동전 없음");
  // 맴도는 동안이 막을 틈: 맴돌 때 잡으면 안 훔친다
  const h = quietGame();
  const g2 = foe(h, "gull", SHOP.x + SHOP.r + 46, SHOP.y, {}, 18);
  frames(h, 60);
  assert.ok(g2.hov! > 0);
  g2.hp = 0.001;
  h.weapons.push({ key: "skewer", lv: 5, cd: 0, t: 0 });
  h.p.x = g2.x + 20; h.p.y = g2.y;
  const ev2 = frames(h, 60 * 3);
  assert.equal(count(ev2, "steal"), 0);
  assert.equal(h.shop.hp, SHOP.hp);
});

test("취객 소동: 가게 테 + 46 안이면 앉은 손님이 1.5초마다 하나씩 일어나고 아무도 돈을 안 낸다", () => {
  const seat3 = (g: PochaGame) => [0, 1, 2].map((k) => { const [x, y] = THEME.seatPos(g as never, k); return guest(g, x, y, { st: "sit", seat: k, t: 0 }); });
  const g = quietGame();
  const qs = seat3(g);
  foe(g, "drunk", SHOP.x, SHOP.y - SHOP.r - 30, { speed: 0 });
  const ev = frames(g, 60 * 4);
  assert.equal(count(ev, "ruckus"), 1);
  const fled = ev.filter((e) => e.e === "fled");
  assert.equal(fled.length, 3);
  assert.ok(fled.every((e) => e.why === "ruckus"));
  assert.ok(qs.every((q) => q.st === "flee"));
  assert.equal(g.stats.paid, 0, "소동 중엔 돈이 없다");
  // 대조군: 취객이 없으면 4초에 손님 셋이 동전을 낸다
  const c = quietGame();
  seat3(c);
  frames(c, 60 * 4);
  assert.ok(c.stats.paid >= 3 * GUEST.coin, `대조 ${c.stats.paid}`);
  // 노래하는 취객: 둘레 40 안 걷는 손님을 놀래 달아나게
  const s = quietGame();
  const w = guest(s, 120, 120);
  foe(s, "sing", 150, 120, { speed: 0 });
  const evS = frames(s, 5);
  assert.equal(w.st, "flee");
  assert.equal(evS.find((e) => e.e === "fled")?.why, "sing");
});

test("갈매기 대장(P3): 가게에 닿으면 12 를 한 번 훔치고 3초 물러났다가 다시 온다", () => {
  const g = quietGame();
  g.p.x = 500; g.p.y = 500;
  const k = foe(g, "gull_king", SHOP.x + 80, SHOP.y);
  const hits: number[] = [];
  let kingTook = 0;
  for (let f = 0; f < 60 * 12; f++) for (const e of tick(g)) { if (e.e === "steal" && e.boss) hits.push(g.time); if (e.e === "shophit" && e.src === "gull_king") kingTook += e.amt!; }
  assert.ok(hits.length >= 2, `훔친 횟수 ${hits.length}`);
  assert.ok(hits[1] - hits[0] >= EN.gull_king.away!.t, `간격 ${hits[1] - hits[0]}`);
  assert.equal(kingTook, EN.gull_king.steal! * hits.length, "한 번에 12, 닿아 있는 동안 더 안 훔친다");
  assert.ok(k.hp > 0);
});

test("가게 체력 0 이면 「가게 문을 닫았다」로 진다(P4) — 막내가 쓰러진 것과 갈린다", () => {
  const g = quietGame();
  g.shop.hp = 1;
  foe(g, "gull", SHOP.x + SHOP.r + 4.5 + 1, SHOP.y, { hov: 0 });
  const ev = frames(g, 3);
  assert.equal(g.state, "lost");
  assert.equal(g.shopDown, true);
  assert.equal(g.shop.hp, 0);
  assert.equal(count(ev, "shopdown"), 1);
  assert.equal(count(ev, "lost"), 1);
  // 막내가 쓰러지면 lost 지만 shopDown 은 없다
  const h = quietGame();
  h.p.hp = 1;
  foe(h, "pigeon", h.p.x + 2, h.p.y, { speed: 0 });
  frames(h, 3);
  assert.equal(h.state, "lost");
  assert.ok(!h.shopDown);
  assert.equal(h.shop.hp, SHOP.hp);
});

test("가게 안으로는 막내도 적도 못 들어간다(밀려남)", () => {
  const g = quietGame();
  g.p.x = SHOP.x; g.p.y = SHOP.y + SHOP.r + 30;
  const dr = foe(g, "drunk", SHOP.x - 60, SHOP.y);
  for (let f = 0; f < 60 * 6; f++) {
    tick(g, { x: 0, y: -1 });
    assert.ok(dShop(g.p) >= SHOP.r + g.p.r - 1e-9, `막내 ${dShop(g.p)}`);
    assert.ok(dShop(dr) >= SHOP.r + dr.r - 1e-9, `취객 ${dShop(dr)}`);
  }
  assert.ok(g.shop.hp < SHOP.hp, "붙은 취객은 들이받는다");
});

test("점수: 버틴 초 × 10 + 처치 + 다 먹고 간 손님 × 40, 이기면 + 5000 + 막내 hp × 10 + 가게 hp × 20", () => {
  const g = quietGame();
  g.time = 123.9; g.kills = 77; g.stats.served = 5;
  assert.equal(score(g as never), 1230 + 77 + 200);
  g.state = "won"; g.time = 600; g.p.hp = 88.4; g.shop.hp = 350.6;
  assert.equal(score(g as never), 6000 + 77 + 200 + 5000 + 880 + 351 * 20);
});
