// 실행: node --test "tests/lab/*.test.ts"
// B 코코의 하루(src/lab/survivors/coco.ts) — 고유 장치(앉아 기운 → 똥꼬 스키)와 그 천적(초인종·다른 강아지·청소기), 점수식.
// 규격 docs/lab-surv-coco-spec.md 1·6절(B4). 숫자는 코드(DATA)가 정본이다 — 검사도 DATA 를 읽고, 규격 숫자와 같은지는 따로 한 번 본다.
// 사건을 모아 보는 검사는 먼저 그 사건이 나왔는지(> 0)부터 단언한다 — 빈 집합의 집계는 통과 쪽으로 기운다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CORE, create, step, choose, spawnAt, score, wstat, type GameEvent } from "../../src/lab/survivors/core.ts";
import { THEME, DATA, type CocoGame, type CocoEnemy } from "../../src/lab/survivors/coco.ts";

const DT = CORE.DT;
const STILL = { x: 0, y: 0 };
const RIGHT = { x: 1, y: 0 };

/** 감독이 적을 못 낳고 무기도 없는 판(손으로 세운 적만 보게) */
function quietGame(seed = 1): CocoGame {
  const g = create(THEME, seed) as CocoGame;
  g.spawnAcc = -1e9;
  g.sched = [];
  g.weapons.length = 0;
  return g;
}
/** 한 프레임. 사건을 돌려준다 */
function tick(g: CocoGame, input = STILL): GameEvent[] {
  g.input = { x: input.x, y: input.y };
  step(g as never);
  const ev = g.events.slice();
  g.events.length = 0;
  return ev;
}
function frames(g: CocoGame, n: number, input = STILL): GameEvent[] {
  const all: GameEvent[] = [];
  for (let i = 0; i < n; i++) all.push(...tick(g, input));
  return all;
}
/** 안 움직이는 적 하나(속도 0, 체력은 넉넉히) */
function dummy(g: CocoGame, kind: string, dx: number, dy: number, hp = 1000): CocoEnemy {
  return spawnAt(g as never, kind, g.p.x + dx, g.p.y + dy, { speed: 0, hp, maxHp: hp }) as CocoEnemy;
}
const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;

test("수치표가 규격 1절 숫자와 같다(규격이 코드를 따라왔는지)", () => {
  assert.deepEqual(DATA.CHARGE, { rate: 40, min: 34, drain: 150, tiers: [34, 67, 100], still: 0.05 });
  assert.deepEqual([DATA.SCOOT.dist0, DATA.SCOOT.distK, DATA.SCOOT.dur, DATA.SCOOT.dmg0, DATA.SCOOT.dmgK, DATA.SCOOT.kb], [30, 0.7, 0.35, 8, 0.45, 60]);
  assert.deepEqual(DATA.SPIN, { R: 38, dmg: 26, kb: 80 });
  assert.deepEqual(DATA.OVERSIT, { after: 3, every: 2.5, dist: 70 });
  assert.deepEqual(DATA.BARK, { stun: 0.5, R: 28, dmg: 8 });
  assert.deepEqual(DATA.ENEMIES.bell.ring, { every: 4.5, warn: 0.6, R: 70 });
  assert.deepEqual(DATA.ENEMIES.vacuum.pull, { R: 46, v: 20 });
});

test("앉기: 기운이 초당 40 차고, 34·67·100 에서 모습이 앉기 → 꼬리 → 뱅글로 바뀐다", () => {
  const g = quietGame();
  const seen: { f: number; pose: string; gauge: number }[] = [];
  let last = THEME.pose(g as never);
  assert.equal(last, "sit");
  for (let f = 1; f <= 200; f++) {
    tick(g);
    if (f === 60) assert.ok(close(g.coco.gauge, 40, 1e-9), `1초 뒤 기운 ${g.coco.gauge}`);
    const p = THEME.pose(g as never);
    if (p !== last) { seen.push({ f, pose: p, gauge: g.coco.gauge }); last = p; }
  }
  assert.equal(seen.length, 2, JSON.stringify(seen));
  // 34 / (40/60) = 51 프레임, 67 / (40/60) = 100.5 → 101 프레임
  assert.deepEqual(seen.map((s) => [s.pose, s.f]), [["wag", 51], ["spin", 101]]);
  assert.ok(seen[0].gauge >= 34 && seen[0].gauge - 40 * DT < 34);
  assert.ok(seen[1].gauge >= 67 && seen[1].gauge - 40 * DT < 67);
  assert.equal(g.coco.gauge, 100, "100 에서 멈춘다");
  // 100 에 닿은 것은 150 프레임째 — 그 뒤 50 프레임만큼 가득 앉기 시간이 쌓였다
  assert.ok(close(g.coco.fullT, 51 * DT, 1e-9), `fullT ${g.coco.fullT}`);
});

test("앉기 카드: 단계마다 차는 속도 +30 %", () => {
  const g = quietGame();
  g.themeLv.sit = 2;
  frames(g, 30);
  assert.ok(close(g.coco.gauge, 40 * 1.6 * 0.5, 1e-9), `기운 ${g.coco.gauge}`);
});

test("기운 34 미만에서 움직이면 스키가 아니라 초당 150 으로 빠진다", () => {
  const g = quietGame();
  frames(g, 50); // 33.33…
  assert.ok(g.coco.gauge < DATA.CHARGE.min);
  const before = g.coco.gauge;
  const ev = tick(g, RIGHT);
  assert.equal(ev.filter((e) => e.e === "scoot").length, 0);
  assert.equal(g.coco.dash, null);
  assert.ok(close(g.coco.gauge, before - 150 * DT, 1e-9));
  assert.equal(THEME.pose(g as never), "walk");
  frames(g, 20, RIGHT);
  assert.equal(g.coco.gauge, 0);
});

test("문턱: 기운이 딱 34 면 스키가 나간다(34 이상), 33.9 면 안 나간다", () => {
  // 앉아서 차는 기운(40/60 씩)은 34 에 딱 맞지 않아 대조 시뮬이 이 경계를 못 밟는다 — 값을 직접 놓는다
  const g = quietGame();
  g.coco.gauge = 34;
  assert.equal(tick(g, RIGHT).filter((e) => e.e === "scoot").length, 1);
  const h = quietGame();
  h.coco.gauge = 33.9;
  assert.equal(tick(h, RIGHT).filter((e) => e.e === "scoot").length, 0);
});

test("데드존: 길이 0.05 미만 입력은 앉은 셈(기운이 찬다), 0.05 이상은 걷기", () => {
  const g = quietGame();
  frames(g, 30, { x: 0.049, y: 0 });
  assert.ok(g.coco.gauge > 19);
  const h = quietGame();
  frames(h, 30, { x: 0.05, y: 0 });
  assert.equal(h.coco.gauge, 0);
});

test("똥꼬 스키: 기운 ≥ 34 에서 움직이면 0.35초, 거리 30 + 0.7 × 기운, 그동안 안 아프다, 길 위 적에게 한 번씩 피해", () => {
  const g = quietGame();
  frames(g, 75); // 기운 50
  const gauge = g.coco.gauge;
  assert.ok(close(gauge, 50, 1e-9));
  const dist = 30 + 0.7 * gauge, dmg = 8 + 0.45 * gauge;
  // 길 위 셋(오른쪽), 길 밖 하나(위로 30)
  const on = [25, 45, 60].map((dx) => dummy(g, "brush", dx, 0));
  const off = dummy(g, "brush", 40, -30);
  const x0 = g.p.x;
  const ev0 = tick(g, RIGHT);
  const sc = ev0.filter((e) => e.e === "scoot");
  assert.equal(sc.length, 1);
  assert.deepEqual([sc[0].gauge, sc[0].dist], [50, Math.round(dist)]);
  assert.equal(g.coco.gauge, 0, "기운은 0 으로");
  assert.equal(ev0.filter((e) => e.e === "spin").length, 0, "가득이 아니면 바람 고리 없음");
  const D = g.coco.dash!;
  assert.ok(D, "스키 중");
  assert.ok(close(D.vx * DATA.SCOOT.dur, dist, 1e-9) && D.vy === 0);
  assert.equal(THEME.pose(g as never), "scoot");
  // 스키 동안: 손 떼도(앉은 입력) 미끄러진다. 걸음 몫을 빼면 스키 몫이 남는다
  const xs = g.p.x;
  let n = 0;
  const during: GameEvent[] = [];
  while (g.coco.dash && n < 60) {
    during.push(...tick(g));
    n++;
    if (g.coco.dash) assert.ok(g.p.iframe > 0, "스키 중 무적");
  }
  const t = n * DT;
  assert.ok(t >= DATA.SCOOT.dur - 1e-9 && t <= DATA.SCOOT.dur + DT + 1e-9, `스키 ${n} 프레임`);
  const slid = g.p.x - xs;
  assert.ok(slid >= dist - 1e-6 && slid <= dist + D.vx * DT + 1e-6, `미끄러진 거리 ${slid} vs ${dist}`);
  assert.ok(g.p.x - x0 > dist);
  assert.equal(during.filter((e) => e.e === "hurt").length, 0, "스키 중 맞지 않는다");
  // 피해: 길 위 셋에 정확히 한 번씩, 길 밖은 그대로
  for (const e of on) assert.ok(close(e.maxHp - e.hp, dmg, 1e-9), `길 위 적 피해 ${e.maxHp - e.hp} vs ${dmg}`);
  assert.equal(off.hp, off.maxHp);
  assert.ok(close(g.stats.dmgBy.scoot, 3 * dmg, 1e-9));
  assert.equal(g.coco.scoots, 1);
  assert.equal(g.coco.bigScoots, 0);
  assert.equal(g.trails.length, 1, "스키 자국");
});

test("똥꼬 스키는 보스에게 절반", () => {
  const g = quietGame();
  g.coco.gauge = 60;
  const boss = dummy(g, "boss_bath", 30, 0, 9999);
  frames(g, 1); // 칸(grid)에 보스를 넣는다 — 앉은 채로 한 프레임
  const gauge = g.coco.gauge;
  tick(g, RIGHT);
  frames(g, 25);
  assert.ok(close(boss.maxHp - boss.hp, (8 + 0.45 * gauge) * 0.5, 1e-9), `보스 피해 ${boss.maxHp - boss.hp}`);
});

test("가득(100)으로 터지면: 거리 100, 출발 자리 반경 38 바람 고리 26 피해, 99 면 고리 없음", () => {
  const g = quietGame();
  const inR = dummy(g, "brush", 0, 35); // 고리 안(위아래 — 스키 길 밖)
  const outR = dummy(g, "brush", 0, -48); // 38 + 3.5 바깥
  frames(g, 150);
  assert.equal(g.coco.gauge, 100);
  const ev = tick(g, RIGHT);
  const spin = ev.filter((e) => e.e === "spin"), sc = ev.filter((e) => e.e === "scoot");
  assert.equal(spin.length, 1);
  assert.equal(sc.length, 1);
  assert.equal(sc[0].dist, 100);
  assert.equal(spin[0].R, 38);
  assert.ok(close(inR.maxHp - inR.hp, 26, 1e-9));
  assert.equal(outR.hp, outR.maxHp);
  assert.equal(g.coco.bigScoots, 1);
  assert.equal(g.coco.waves.length, 1);
  assert.ok(g.coco.dash!.full);

  const h = quietGame();
  h.coco.gauge = 99;
  const ev2 = tick(h, RIGHT);
  assert.equal(ev2.filter((e) => e.e === "scoot").length, 1);
  assert.equal(ev2.filter((e) => e.e === "spin").length, 0);
  assert.equal(h.coco.bigScoots, 0);
});

test("초인종: 울릴 때 70 px 안이면 짖는다 — 0.5초 못 움직이고 기운이 0, 둘레 28 에 8 피해. 밖이면 그대로", () => {
  const g = quietGame();
  const bell = dummy(g, "bell", 65, 0);
  const victim = dummy(g, "brush", 0, 20);
  frames(g, 120); // 기운 80
  assert.ok(g.coco.gauge >= 79);
  bell.ringT = 0.6; // 다음 프레임에 흔들림 예고(≤ warn)
  tick(g);
  assert.equal(bell.ringing, true);
  bell.ringT = DT / 2;
  const ev = tick(g);
  const bb = ev.filter((e) => e.e === "bellbark");
  assert.equal(bb.length, 1);
  assert.equal(g.coco.gauge, 0);
  assert.equal(g.coco.barkT, DATA.BARK.stun);
  assert.equal(bell.ringT, DATA.ENEMIES.bell.ring!.every, "다시 4.5초");
  assert.ok(close(victim.maxHp - victim.hp, 8, 1e-9));
  assert.equal(THEME.pose(g as never), "bark");
  // 짖는 동안: 움직여도 제자리, 스키도 안 나간다
  const x = g.p.x, y = g.p.y;
  const evs = frames(g, 29, RIGHT);
  assert.equal(evs.filter((e) => e.e === "scoot").length, 0);
  assert.ok(Math.abs(g.p.x - x) < 0.5 && Math.abs(g.p.y - y) < 0.5, `짖는 중 이동 ${g.p.x - x}`);
  // 0.5초 지나면 걷는다
  frames(g, 3, RIGHT);
  const x2 = g.p.x;
  frames(g, 10, RIGHT);
  assert.ok(g.p.x - x2 > 5, "짖기가 끝나면 걷는다");

  const h = quietGame();
  const far = dummy(h, "bell", 75, 0);
  frames(h, 120);
  far.ringT = DT / 2;
  const g0 = h.coco.gauge;
  const ev2 = tick(h);
  assert.equal(ev2.filter((e) => e.e === "bellbark").length, 0);
  assert.ok(h.coco.gauge > g0);
  assert.equal(h.coco.barkT, 0);
});

test("초인종은 스키 중이면 안 짖는다", () => {
  const g = quietGame();
  const bell = dummy(g, "bell", 30, 30);
  g.coco.gauge = 60;
  tick(g, RIGHT);
  assert.ok(g.coco.dash);
  bell.ringT = DT / 2;
  const ev = tick(g);
  assert.equal(ev.filter((e) => e.e === "bellbark").length, 0);
  assert.equal(g.coco.barkT, 0);
});

test("오래 앉기: 가득 3초 뒤부터 2.5초마다 다른 강아지가 70 px 밖에 나타난다", () => {
  const g = quietGame();
  const dogs: { t: number; d: number }[] = [];
  for (let f = 0; f < 60 * 12; f++) {
    const ev = tick(g);
    for (const e of ev) if (e.e === "otherdog") {
      const dog = g.enemies[g.enemies.length - 1];
      assert.equal(dog.kind, "dog");
      dogs.push({ t: g.time, d: Math.hypot(dog.x - g.p.x, dog.y - g.p.y) });
    }
  }
  assert.ok(dogs.length >= 3, `강아지 ${dogs.length}`);
  // 가득은 150 프레임(2.5초) — 그 뒤 3초
  assert.ok(Math.abs(dogs[0].t - (2.5 + 3)) <= DT + 1e-9, `첫 강아지 ${dogs[0].t}`);
  for (let i = 1; i < dogs.length; i++) assert.ok(Math.abs(dogs[i].t - dogs[i - 1].t - 2.5) <= DT + 1e-9, `간격 ${dogs[i].t - dogs[i - 1].t}`);
  for (const d of dogs) assert.ok(d.d > 60 && d.d <= 70 + 1e-6, `거리 ${d.d}`); // 낳은 뒤 그 프레임에 조금 다가와 있을 수 있다

  // 가득 3초 전에 움직였다 앉으면 강아지는 오지 않는다
  const h = quietGame();
  let n = 0;
  for (let k = 0; k < 4; k++) {
    for (const e of frames(h, 150 + 120)) if (e.e === "otherdog") n++;
    frames(h, 30, RIGHT);
  }
  assert.equal(n, 0);
});

test("청소기: 46 px 안의 코코를 초당 20 끌어당긴다, 바깥·스키 중엔 안 끌린다", () => {
  const g = quietGame();
  dummy(g, "vacuum", 40, 0);
  tick(g); // 칸(grid)을 채운다 — 끌기는 지난 프레임 칸을 본다
  const x = g.p.x;
  tick(g);
  assert.ok(close(g.p.x - x, 20 * DT, 1e-9), `끌림 ${g.p.x - x}`);

  const h = quietGame();
  dummy(h, "vacuum", 50, 0);
  tick(h);
  const hx = h.p.x;
  tick(h);
  assert.equal(h.p.x, hx);

  // 스키 중: 끌기 몫이 없다 — 같은 스키를 청소기 있는 판·없는 판으로 맞댄다
  const a = quietGame(), b = quietGame();
  dummy(a, "vacuum", 0, 40);
  for (const k of [a, b]) { k.coco.gauge = 50; tick(k); tick(k, RIGHT); }
  for (let i = 0; i < 5; i++) { tick(a); tick(b); }
  assert.ok(a.coco.dash && b.coco.dash);
  assert.equal(a.p.y, b.p.y, "스키 중 y 가 안 끌린다");
});

test("꼬리 바람은 앉아 있을 때 두 배", () => {
  const g = quietGame();
  const w = { key: "wag", lv: 1, cd: 0, t: 0 };
  tick(g);
  assert.equal(wstat(g as never, w).dps, 10);
  tick(g, RIGHT);
  assert.equal(g.coco.still, false);
  assert.equal(wstat(g as never, w).dps, 5);
});

test("점수(B4): 버틴 초 × 10 + 처치 + 가득 스키 × 30, 이기면 + 5000 + 남은 체력 × 20", () => {
  const g = quietGame();
  g.time = 123.9;
  g.kills = 45;
  g.coco.bigScoots = 7;
  g.p.hp = 61.6;
  g.state = "lost";
  assert.equal(score(g as never), 1230 + 45 + 210);
  g.state = "play";
  assert.equal(score(g as never), 1230 + 45 + 210);
  g.state = "won";
  assert.equal(score(g as never), 1230 + 45 + 210 + 5000 + 62 * 20);
  // 가득 아닌 스키는 점수에 안 들어간다
  g.coco.scoots = 99;
  assert.equal(score(g as never), 1230 + 45 + 210 + 5000 + 62 * 20);
});

test("저녁밥(600초): 남은 적이 물러가고 이긴다", () => {
  const g = quietGame();
  dummy(g, "brush", 80, 0);
  dummy(g, "dog", -80, 0);
  g.time = 600 - DT / 2;
  const ev = tick(g, RIGHT);
  assert.deepEqual(ev.map((e) => e.e).filter((e) => e === "dinner" || e === "won"), ["dinner", "won"]);
  assert.equal(g.state, "won");
  assert.ok(g.enemies.length > 0 && g.enemies.every((e) => e.dead));
  assert.equal(THEME.tod(g as never), 1);
});

test("한 판(시드 3개, 안 죽게, 앉았다 가기 입력): 스키·가득 스키·짖기·강아지·청소기 보스가 실제로 나온다", () => {
  const counts: Record<string, number> = {};
  for (const seed of [1, 2, 3]) {
    const g = create(THEME, seed) as CocoGame;
    g.p.maxHp = g.p.hp = 1e7;
    let sitLeft = 0, sit = false, v = RIGHT;
    for (let f = 0; f < 60 * 330 && (g.state === "play" || g.state === "levelup"); f++) {
      if (g.state === "levelup") { choose(g as never, 0); f--; continue; }
      if (sitLeft-- <= 0) {
        sit = !sit;
        sitLeft = sit ? 40 + ((f * 7919) % 420) : 30;
        const a = ((f * 37) % 360) * (Math.PI / 180);
        v = { x: Math.cos(a), y: Math.sin(a) };
      }
      for (const e of tick(g, sit ? STILL : v)) counts[e.e] = (counts[e.e] ?? 0) + 1;
    }
  }
  for (const k of ["scoot", "spin", "bellbark", "otherdog", "summon", "kill"]) assert.ok((counts[k] ?? 0) > 0, `${k} 0 — ${JSON.stringify(counts)}`);
});
