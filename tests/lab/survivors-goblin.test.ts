// 실행: node --test "tests/lab/*.test.ts"
// A 도깨비 퇴치(src/lab/survivors/goblin.ts) — 고유 장치(체 깔기 → 둘레에 앉아 세기 → 돌아와 밟으면 체 털기)와 놓친 체(화남), 점수식.
// 규격 docs/lab-surv-goblin-spec.md 1·6절(A2·A5). 숫자는 코드(DATA)가 정본이다 — 검사도 DATA 를 읽고, 규격 숫자와 같은지는 따로 한 번 본다.
// 사건을 모아 보는 검사는 먼저 그 사건이 나왔는지(> 0)부터 단언한다 — 빈 집합의 집계는 통과 쪽으로 기운다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CORE, create, step, choose, spawnAt, score, type GameEvent } from "../../src/lab/survivors/core.ts";
import { THEME, DATA, type GoblinGame, type GoblinEnemy, type Sieve } from "../../src/lab/survivors/goblin.ts";

const DT = CORE.DT;
const STILL = { x: 0, y: 0 };
const RIGHT = { x: 1, y: 0 };
const S = DATA.SIEVE;

/** 감독이 적을 못 낳고 무기도 없는 판(손으로 세운 적만 보게) */
function quietGame(seed = 1): GoblinGame {
  const g = create(THEME, seed) as unknown as GoblinGame;
  g.spawnAcc = -1e9;
  g.sched = [];
  g.weapons.length = 0;
  return g;
}
/** 한 프레임. 사건을 돌려준다 */
function tick(g: GoblinGame, input = STILL): GameEvent[] {
  g.input = { x: input.x, y: input.y };
  step(g as never);
  const ev = g.events.slice();
  g.events.length = 0;
  return ev;
}
function frames(g: GoblinGame, n: number, input = STILL): GameEvent[] {
  const all: GameEvent[] = [];
  for (let i = 0; i < n; i++) all.push(...tick(g, input));
  return all;
}
/** 적 하나(체력은 넉넉히 — 털기 피해를 재려고 안 죽게) */
function foe(g: GoblinGame, kind: string, x: number, y: number, extra: Record<string, number> = {}, hp = 1000): GoblinEnemy {
  return spawnAt(g as never, kind, x, y, { hp, maxHp: hp, ...extra }) as GoblinEnemy;
}
/** 첫 체가 놓일 때까지(1.5초) 서 있는다. 그 체를 돌려준다 */
function firstSieve(g: GoblinGame): Sieve {
  for (let i = 0; i < 200 && !g.sieves.length; i++) tick(g);
  assert.equal(g.sieves.length, 1, "1.5초 안에 첫 체");
  return g.sieves[0];
}
const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;
const count = (ev: GameEvent[], k: string) => ev.filter((e) => e.e === k).length;

test("수치표가 규격 1절 숫자와 같다(규격이 코드를 따라왔는지)", () => {
  assert.deepEqual(
    [S.every, S.gap, S.max, S.arm, S.life, S.lure, S.hold, S.seatR, S.touchR, S.burstR, S.dmg0, S.dmgPer, S.coin, S.daze, S.bossMul],
    [3, 30, 3, 0.8, 16, 56, 12, 9, 9, 34, 30, 16, 1, 1.5, 0.5],
  );
  assert.deepEqual(S.angry, { mul: 1.3, dur: 3 });
  // 세는 것: 꼬마 도깨비·야광귀(1.5배)·방망이 도깨비. 안 세는 것: 도깨비불·여우불·보스 둘
  const counts = Object.fromEntries(Object.entries(DATA.ENEMIES).map(([k, d]) => [k, d.count ?? 0]));
  assert.deepEqual(counts, { imp: 1, wisp: 0, yagwang: 1.5, club: 1, foxfire: 0, gumiho: 0, geuseundae: 0 });
});

/** 체가 놓일 때마다 꼬마를 새 자리로 옮긴다(옛 체를 다시 밟지 않게, 30 px 안 겹치게). 놓인 시각을 돌려준다 */
function placeRun(g: GoblinGame, sec: number): { t: number; dx: number; dy: number }[] {
  const spots = [[60, 100], [180, 100], [300, 100], [420, 100], [60, 300], [180, 300], [300, 300], [420, 300]];
  const placed: { t: number; dx: number; dy: number }[] = [];
  for (let f = 0; f < 60 * sec; f++) {
    for (const e of tick(g)) if (e.e === "sieve") {
      placed.push({ t: g.time, dx: (e.x as number) - g.p.x, dy: (e.y as number) - g.p.y });
      [g.p.x, g.p.y] = spots[placed.length % spots.length];
    }
    assert.ok(g.sieves.length <= S.max + (g.themeLv.more || 0), `체 ${g.sieves.length}`);
  }
  return placed;
}

test("체 놓기: 첫 체 1.5초, 그 뒤 3초마다 발밑에, 동시에 3개까지 — 하나가 사라진(17.5초) 뒤 다음 차례에 다시", () => {
  const g = quietGame();
  const placed = placeRun(g, 21);
  assert.ok(placed.length > 0);
  // 차례는 1.5 + 3k 초(타이머를 3 으로 다시 놓으며 한 프레임씩 밀린다 — 차례당 ≤ 1 프레임). 10.5·13.5·16.5 는 셋이 차서 건너뛴다
  const want = [1.5, 4.5, 7.5, 19.5];
  assert.equal(placed.length, want.length, JSON.stringify(placed));
  placed.forEach((p, i) => assert.ok(p.t >= want[i] - 1e-9 && p.t - want[i] <= 7 * DT + 1e-9, `${i}번째 체 ${p.t} vs ${want[i]}`));
  for (const p of placed) assert.ok(p.dx === 0 && p.dy === 0, "꼬마 발밑");
});

test("체 하나 더 카드: 동시에 3 + 1", () => {
  const g = quietGame();
  g.themeLv.more = 1;
  assert.equal(placeRun(g, 15).length, 4);
  assert.equal(g.sieves.length, 4);
});

test("가만히 서 있으면 체는 하나뿐(다른 체 30 px 안이면 건너뜀)", () => {
  const g = quietGame();
  const ev = frames(g, 60 * 17); // 첫 체가 사라지기(17.5초) 전까지
  assert.equal(count(ev, "sieve"), 1);
  assert.equal(g.sieves.length, 1);
  // 30 px 문턱: 25 px 옆에선 한 차례(3초) 지나도 안 놓이고, 31 px 옆에선 놓인다
  const h = quietGame();
  const s = firstSieve(h);
  h.p.x = s.x + 25;
  assert.equal(count(frames(h, 60 * 3 + 5), "sieve"), 0, "25 px");
  h.p.x = s.x + 31;
  assert.equal(count(frames(h, 60 * 3 + 5), "sieve"), 1, "31 px");
});

test("세기: 꼬마 도깨비가 체로 와서 둘레에 앉는다 — 앉은 뒤엔 안 움직이고, 체 위의 꼬마를 안 아프게 한다", () => {
  const g = quietGame();
  const s = firstSieve(g); // 꼬마는 체 위에 그대로 서 있다(벗어난 적 없으니 털리지 않는다)
  const imps = [0, 1, 2, 3, 4].map((i) => foe(g, "imp", s.x + Math.cos(i * 1.3) * 40, s.y + Math.sin(i * 1.3) * 40));
  const hp0 = g.p.hp;
  let ev: GameEvent[] = [];
  for (let f = 0; f < 120 && !imps.every((e) => e.counting); f++) ev.push(...tick(g));
  assert.ok(imps.every((e) => e.counting), "다섯 다 앉았다");
  assert.equal(s.seated, 5);
  assert.equal(s.heading, 0);
  assert.ok(imps.every((e) => e.sieve === s.id));
  assert.equal(count(ev, "hurt"), 0, "앉으러 오는 동안·앉은 뒤 안 아프다");
  // 앉은 자리: 체 둘레(반지름 9 + 몸/2, 세로 0.7)
  for (const e of imps) {
    const rx = (e.x - s.x) / (S.seatR + e.r * 0.5), ry = (e.y - s.y) / ((S.seatR + e.r * 0.5) * 0.7);
    assert.ok(close(rx * rx + ry * ry, 1, 1e-9), `둘레 ${rx},${ry}`);
  }
  // 안 아픈 까닭이 거리가 아니라 「세는 중」이어야 한다 — 앉은 것 중 꼬마에게 닿는 거리(몸 + 몸)인 것이 있다
  const touching = imps.filter((e) => (e.x - g.p.x) ** 2 + (e.y - g.p.y) ** 2 <= (g.p.r + e.r) ** 2);
  assert.ok(touching.length > 0, "닿는 자리에 앉은 것이 있다");
  const pos = imps.map((e) => [e.x, e.y]);
  ev = frames(g, 120);
  assert.equal(count(ev, "hurt"), 0, "닿아 있어도 2초 동안 안 아프다");
  assert.equal(g.p.hp, hp0);
  imps.forEach((e, i) => assert.deepEqual([e.x, e.y], pos[i], "앉은 자리 그대로"));
  assert.ok(imps.every((e) => e.counting && e.stun > 0));
  // 대조군: 안 세는 도깨비불은 같은 자리에서 아프게 한다
  const h = quietGame();
  firstSieve(h);
  foe(h, "wisp", h.p.x + 6, h.p.y, { speed: 0 });
  const evH = frames(h, 2);
  assert.ok(evH.some((e) => e.e === "hurt" && e.src === "wisp"), "도깨비불은 아프게 한다");
});

test("끌림: lure 56 밖의 꼬마 도깨비는 체로 안 가고, 야광귀는 1.5배(84)까지 간다", () => {
  const g = quietGame();
  const s = firstSieve(g);
  g.p.x = s.x + 200; // 꼬마는 멀리(벗어남)
  const impFar = foe(g, "imp", s.x - 60, s.y, { speed: 0 });
  const impNear = foe(g, "imp", s.x - 50, s.y, { speed: 0 });
  const yagFar = foe(g, "yagwang", s.x - 80, s.y, { speed: 0 });
  const yagOut = foe(g, "yagwang", s.x - 90, s.y, { speed: 0 });
  tick(g);
  assert.deepEqual([impFar.sieve, impNear.sieve, yagFar.sieve, yagOut.sieve], [0, s.id, s.id, 0]);
  assert.equal(s.heading, 2);
});

/** 체 하나에 꼬마 도깨비 n 이 앉고, 꼬마는 체에서 22 px 오른쪽(벗어남 문턱 15 밖)에 선 판 */
function seatedSetup(n: number, seed = 1) {
  const g = quietGame(seed);
  const s = firstSieve(g);
  frames(g, 24, RIGHT); // 56 × 24/60 = 22.4 px
  assert.equal(s.left, true, "한 번 벗어났다");
  const imps = Array.from({ length: n }, (_, i) => foe(g, "imp", s.x + Math.cos(2 + i * 0.9) * 30, s.y + Math.sin(2 + i * 0.9) * 30));
  for (let f = 0; f < 180 && !imps.every((e) => e.counting); f++) tick(g);
  assert.ok(imps.every((e) => e.counting), "다 앉았다");
  assert.equal(s.seated, n);
  return { g, s, imps };
}

test("체 털기: 벗어났다 다시 밟으면 — 반경 34 안 모두에게 30 + 16 × 앉은 수, 살아남은 것은 1.5초 멍함, 앉은 수만큼 엽전", () => {
  const { g, s, imps } = seatedSetup(3);
  const inR = foe(g, "wisp", s.x, s.y - 37, { speed: 0 }); // 34 + 몸 3.5 = 37.5 안(안 세는 것)
  const outR = foe(g, "wisp", s.x + 38.5 * Math.SQRT1_2, s.y + 38.5 * Math.SQRT1_2, { speed: 0 }); // 밖(38.5 — 서로 밀리지 않게 반대쪽)
  assert.ok(Math.abs(Math.hypot(outR.x - s.x, outR.y - s.y) - 38.5) < 1e-9);
  const walker = foe(g, "imp", s.x - 50, s.y, { speed: 0 }); // 이 체로 가는 중(앉지 않음) — 엽전 없음, 반경 밖
  const boss = foe(g, "gumiho", s.x - 30, s.y + 5, { speed: 0 }, 9999);
  tick(g); // 칸(grid)에 넣는다
  assert.equal(g.dust.length, 0);
  assert.equal(walker.sieve, s.id);
  assert.equal(walker.counting, undefined);
  const dmg = 30 + 16 * 3;
  let ev: GameEvent[] = [];
  for (let f = 0; f < 60 && !count(ev, "burst"); f++) ev = tick(g, { x: -1, y: 0 });
  const bs = ev.filter((e) => e.e === "burst");
  assert.equal(bs.length, 1, "되짚어 밟으면 털린다");
  assert.deepEqual([bs[0].n, bs[0].dmg], [3, dmg]);
  assert.ok((g.p.x - s.x) ** 2 + (g.p.y - s.y) ** 2 <= S.touchR ** 2, "touchR 9 안에서");
  for (const e of [...imps, inR]) {
    assert.ok(close(e.maxHp - e.hp, dmg, 1e-9), `피해 ${e.maxHp - e.hp} vs ${dmg}`);
    assert.ok(close(e.stun, 1.5 - DT, 1e-9), `멍함 ${e.stun}`); // 같은 프레임 이동 단계에서 한 번 줄었다
  }
  assert.equal(outR.hp, outR.maxHp, "반경 밖은 그대로");
  assert.ok(close(boss.maxHp - boss.hp, dmg * 0.5, 1e-9), `보스 ${boss.maxHp - boss.hp}`);
  assert.ok(boss.stun <= 0, "보스는 멍해지지 않는다");
  assert.ok(imps.every((e) => !e.counting && e.sieve === 0 && e.angryT === undefined), "풀려나지만 화나지 않는다");
  // 엽전: 앉아 있던 셋만큼(같은 프레임에 주웠으면 dust 사건으로)
  const coins = g.dust.reduce((a, d) => a + d.v, 0) + ev.filter((e) => e.e === "dust").reduce((a, e) => a + (e.v as number), 0);
  assert.equal(coins, 3, "앉아 있던 셋만큼(가는 중이던 것은 없음)");
  assert.equal(g.sieves.length, 0, "털린 체는 없어진다");
  assert.deepEqual([g.stats.burstN, g.stats.burstMax], [1, 3]);
  assert.ok(close(g.stats.dmgBy.burst, dmg * 4 + dmg * 0.5, 1e-6));
  // 멍한 동안 다시 안 아프다 — 꼬마가 그 자리에 서 있어도
  const after = frames(g, 60);
  assert.equal(count(after, "hurt"), 0);
});

test("체 털기 피해는 앉은 수로 커진다(1·5 마리)", () => {
  for (const n of [1, 5]) {
    const { g } = seatedSetup(n, n);
    let ev: GameEvent[] = [];
    for (let f = 0; f < 60 && !count(ev, "burst"); f++) ev = tick(g, { x: -1, y: 0 });
    const b = ev.find((e) => e.e === "burst");
    assert.ok(b, "털렸다");
    assert.deepEqual([b.n, b.dmg], [n, 30 + 16 * n]);
  }
});

test("밟기 문턱: 벗어남은 15 px 초과(14.9 면 아직), 준비 0.8초 전엔 안 털린다, 체 위에 서 있기만 하면 안 털린다", () => {
  // 서 있기만: 앉은 수가 있어도
  const a = quietGame();
  const sa = firstSieve(a);
  foe(a, "imp", sa.x + 20, sa.y);
  const evA = frames(a, 120);
  assert.equal(sa.seated, 1);
  assert.equal(count(evA, "burst"), 0);
  // 14.9 px 까지 갔다 돌아오면 안 털린다, 15.1 이면 털린다(위치를 직접 놓는다 — 걸음으로는 문턱을 딱 못 밟는다)
  const b = quietGame();
  const sb = firstSieve(b);
  frames(b, 60);
  b.p.x = sb.x + 14.9; tick(b);
  assert.equal(sb.left, false);
  b.p.x = sb.x; assert.equal(count(tick(b), "burst"), 0);
  b.p.x = sb.x + 15.1; tick(b);
  assert.equal(sb.left, true);
  b.p.x = sb.x + 9; assert.equal(count(tick(b), "burst"), 1, "touchR 9 이면 밟힌다");
  // 준비 전: 놓이자마자 벗어났다 돌아와도 0.8초 전엔 안 털리고, 준비되면 털린다
  const c = quietGame();
  const sc = firstSieve(c);
  c.p.x = sc.x + 20; tick(c);
  c.p.x = sc.x;
  let burstAt = -1;
  for (let f = 0; f < 60 && burstAt < 0; f++) if (count(tick(c), "burst")) burstAt = f;
  assert.ok(burstAt >= 0, "준비되면 털린다");
  // 놓인 뒤 지난 시간 = life 16 에서 줄어든 만큼. 0.8초 언저리에서(앞서면 안 된다)
  const age = S.life - sc.life;
  assert.ok(age >= S.arm - DT - 1e-9 && age <= S.arm + DT + 1e-9, `털린 때 경과 ${age}`);
});

test("놓친 체(A2): 16초 안 털면 앉아 있던 것이 일어나 3초 동안 1.3배 빠르게 쫓아온다, 그 뒤 원래 빠르기", () => {
  const g = quietGame();
  const s = firstSieve(g);
  const imp = foe(g, "imp", s.x, s.y - 30);
  for (let f = 0; f < 120 && !imp.counting; f++) tick(g);
  assert.ok(imp.counting);
  g.p.x = s.x + 230; // 꼬마는 멀리 — 화난 3초(117 px)로는 못 닿게
  g.p.y = s.y;
  let ev: GameEvent[] = [];
  for (let f = 0; f < 60 * 20 && !count(ev, "sieveout"); f++) ev = tick(g);
  const so = ev.filter((e) => e.e === "sieveout");
  assert.equal(so.length, 1);
  assert.equal(so[0].n, 1);
  assert.ok(close(S.life - (g.time - 1.5), 0, DT + 1e-9), `사라진 때 ${g.time}`);
  assert.equal(imp.angryT, 3);
  assert.equal(imp.counting, false);
  assert.equal(imp.sieve, 0);
  frames(g, 6); // 앉아 있던 멍함(0.05)이 빠질 때까지
  const d = () => Math.hypot(g.p.x - imp.x, g.p.y - imp.y);
  let d0 = d();
  frames(g, 60);
  const fast = d0 - d();
  assert.ok(close(fast, imp.speed * 1.3, 1e-6), `화난 1초 ${fast}`);
  frames(g, 60 * 2 - 6 + 2); // 3초가 지난 뒤
  assert.ok(imp.angryT! <= 0);
  d0 = d();
  frames(g, 30);
  const slow = d0 - d();
  assert.ok(close(slow, imp.speed * 0.5, 1e-6), `화 풀린 0.5초 ${slow}`);
  assert.ok(d() > 20, "아직 안 닿았다(재는 동안 밀림 없음)");
});

test("화난 동안은 체로 안 간다(곁에 체가 있어도)", () => {
  const g = quietGame();
  const s = firstSieve(g);
  const imp = foe(g, "imp", s.x + 25, s.y, { angryT: 3, speed: 0 });
  const calm = foe(g, "imp", s.x - 25, s.y, { speed: 0 });
  frames(g, 60);
  assert.equal(imp.sieve ?? 0, 0, "화난 동안 체를 고르지 않는다");
  assert.equal(calm.sieve, s.id, "대조군: 안 화난 것은 고른다");
});

test("현재 동작(의심): 화가 풀린 뒤에도 다시 체로 안 간다 — angryT 가 0 이 아니라 −0.0x 로 끝나 `!e.angryT` 가 거짓", () => {
  // 원본 docs/lab-surv-goblin.js 그대로다(옮긴 판은 동작을 안 바꾼다). 규격 1절은 「3초 동안」만 말하고 그 뒤를 정하지 않는다.
  // 이 검사가 빨강이 되면 원본이 바뀐 것 — 의도한 수정인지 확인하고 고친다.
  const g = quietGame();
  const s = firstSieve(g);
  const imp = foe(g, "imp", s.x + 25, s.y, { angryT: 3, speed: 0 });
  frames(g, 60 * 3 + 5);
  assert.ok(imp.angryT! < 0 && imp.angryT! > -DT - 1e-9, `angryT ${imp.angryT}`);
  assert.equal(imp.sieve ?? 0, 0);
  assert.equal(s.heading, 0);
});

test("점수(A5): 버틴 초 × 10 + 처치 + 털기 × 5 + 한 번에 가장 많이 × 30, 이기면 + 5000 + 남은 체력 × 20", () => {
  const g = quietGame();
  g.time = 123.9;
  g.kills = 45;
  g.stats.burstN = 7;
  g.stats.burstMax = 9;
  g.p.hp = 61.6;
  const base = 1230 + 45 + 35 + 270;
  g.state = "lost";
  assert.equal(score(g as never), base);
  g.state = "play";
  assert.equal(score(g as never), base);
  g.state = "won";
  assert.equal(score(g as never), base + 5000 + 62 * 20);
  g.stats.burstN = 0;
  g.stats.burstMax = 0;
  assert.equal(score(g as never), 1230 + 45 + 5000 + 62 * 20);
});

test("닭 울기(600초): 남은 도깨비가 물러가고 이긴다 · 새벽은 7분 0 → 10분 1", () => {
  const g = quietGame();
  foe(g, "imp", g.p.x + 80, g.p.y);
  foe(g, "wisp", g.p.x - 80, g.p.y);
  g.time = 420;
  assert.equal(THEME.dawn(g as never), 0);
  g.time = 510;
  assert.equal(THEME.dawn(g as never), 0.5);
  g.time = 600 - DT / 2;
  const ev = tick(g, RIGHT);
  assert.deepEqual(ev.map((e) => e.e).filter((e) => e === "rooster" || e === "won"), ["rooster", "won"]);
  assert.equal(g.state, "won");
  assert.ok(g.enemies.length > 0 && g.enemies.every((e) => e.dead));
  assert.equal(THEME.dawn(g as never), 1);
});

test("sieveState·hold: 준비 중 → 준비됨 → 꽉 참(구멍 카드면 12 + 4/단계)", () => {
  const g = quietGame();
  const s = firstSieve(g);
  assert.equal(THEME.sieveState(g as never, s), "arming");
  frames(g, 60);
  assert.equal(THEME.sieveState(g as never, s), "armed");
  s.seated = 12;
  assert.equal(THEME.sieveState(g as never, s), "full");
  g.themeLv.holes = 2;
  assert.equal(THEME.hold(g as never), 20);
  assert.equal(THEME.sieveState(g as never, s), "armed");
});

test("한 판(시드 2개, 안 죽게, 갔다 오기 입력): 체·털기·놓친 체·보스 돌진·소환이 실제로 나온다", () => {
  const counts: Record<string, number> = {};
  let maxN = 0;
  for (const seed of [1, 2]) {
    const g = create(THEME, seed) as unknown as GoblinGame;
    g.p.maxHp = g.p.hp = 1e7;
    let left = 0, ph = 2, v = RIGHT, len = 0;
    for (let f = 0; f < 60 * 330 && (g.state === "play" || g.state === "levelup"); f++) {
      if (g.state === "levelup") { choose(g as never, 0); f--; continue; }
      if (left-- <= 0) {
        ph = (ph + 1) % 3;
        if (ph === 0) { const a = ((f * 37) % 360) * (Math.PI / 180); v = { x: Math.cos(a), y: Math.sin(a) }; len = 30 + ((f * 7919) % 150); left = len; }
        else left = ph === 1 ? 90 : len;
      }
      const inp = ph === 0 ? v : ph === 1 ? STILL : { x: -v.x, y: -v.y };
      for (const e of tick(g, inp)) {
        counts[e.e] = (counts[e.e] ?? 0) + 1;
        if (e.e === "burst") maxN = Math.max(maxN, e.n as number);
      }
    }
  }
  for (const k of ["sieve", "burst", "sieveout", "warn", "summon", "kill"]) assert.ok((counts[k] ?? 0) > 0, `${k} 0 — ${JSON.stringify(counts)}`);
  assert.ok(maxN >= 2, `한 번에 가장 많이 ${maxN}`);
});
