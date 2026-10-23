// 실행: node --test "tests/lab/*.test.ts"   (Node 22.18+ 는 .ts 를 그대로 돌린다)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  tick,
  hit,
  rankFor,
  DURATION_MS,
  pickKind,
} from "../../src/lab/bug-whack/engine.ts";

// 같은 씨앗이면 같은 판이 나오는 난수
function seeded(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 2 ** 32;
  };
}

/** 한 판을 16ms 간격으로 돌린다. react: 나온 뒤 몇 ms 에 누르나(null 이면 안 누름) */
function play(seed: number, react: (kind: string) => number | null) {
  const rand = seeded(seed);
  const s = createGame(0);
  for (let t = 0; t <= DURATION_MS + 32; t += 16) {
    tick(s, t, rand);
    s.holes.forEach((h, i) => {
      if (!h.kind) return;
      const d = react(h.kind);
      if (d !== null && t - h.shownAt >= d) hit(s, i, t);
    });
  }
  return s;
}

test("빈 구멍을 누르면 아무 일도 없다", () => {
  const s = createGame(0);
  assert.equal(hit(s, 0, 10), null);
  assert.equal(s.stats.score, 0);
});

test("버그 +1 · 황금 +3 · 기능 −2, 점수는 0 아래로 안 내려간다", () => {
  const s = createGame(0);
  s.holes[0] = { kind: "feature", shownAt: 0, hideAt: 1000 };
  assert.equal(hit(s, 0, 10), "feature");
  assert.equal(s.stats.score, 0, "0 에서 −2 는 0");
  assert.equal(s.stats.featureHits, 1);

  s.holes[1] = { kind: "gold", shownAt: 0, hideAt: 1000 };
  s.holes[2] = { kind: "bug", shownAt: 0, hideAt: 1000 };
  hit(s, 1, 10);
  hit(s, 2, 10);
  assert.equal(s.stats.score, 4);
  assert.equal(s.stats.caught, 2);
  assert.equal(s.stats.gold, 1);
});

test("같은 버그를 두 번 잡을 수 없다", () => {
  const s = createGame(0);
  s.holes[0] = { kind: "bug", shownAt: 0, hideAt: 1000 };
  hit(s, 0, 10);
  assert.equal(hit(s, 0, 11), null);
  assert.equal(s.stats.score, 1);
});

test("들어간 뒤에 누르면 안 잡힌다", () => {
  const s = createGame(0);
  s.holes[0] = { kind: "bug", shownAt: 0, hideAt: 500 };
  assert.equal(hit(s, 0, 500), null);
});

test("놓친 버그는 escaped, 놓친 기능은 안 센다", () => {
  const s = createGame(0);
  s.holes[0] = { kind: "bug", shownAt: 0, hideAt: 100 };
  s.holes[1] = { kind: "gold", shownAt: 0, hideAt: 100 };
  s.holes[2] = { kind: "feature", shownAt: 0, hideAt: 100 };
  s.nextSpawnAt = Infinity;
  tick(s, 100, () => 0);
  assert.equal(s.stats.escaped, 2);
  assert.ok(s.holes.every(h => h.kind === null));

  // 다 잡는 사람은 놓친 게 0 (끝나는 순간 떠 있던 건 안 센다)
  assert.equal(play(7, k => (k === "feature" ? null : 0)).stats.escaped, 0);
  assert.ok(play(7, () => null).stats.escaped > 0);
});

test("30초가 지나면 끝나고, 끝난 뒤엔 누를 수 없다", () => {
  const rand = seeded(3);
  const s = createGame(0);
  tick(s, DURATION_MS - 1, rand);
  assert.equal(s.over, false);
  tick(s, DURATION_MS, rand);
  assert.equal(s.over, true);
  assert.ok(s.holes.every(h => h.kind === null), "끝나면 구멍이 다 빈다");
  s.holes[0] = { kind: "bug", shownAt: 0, hideAt: DURATION_MS + 999 };
  assert.equal(hit(s, 0, DURATION_MS + 1), null);
});

test("탭이 오래 멈췄다 돌아와도 한 번에 하나만 나온다", () => {
  const rand = seeded(5);
  const s = createGame(0);
  const spawned = tick(s, 20_000, rand);
  assert.ok(spawned.length <= 1);
});

test("종류 비율 경계", () => {
  assert.equal(pickKind(0), "gold");
  assert.equal(pickKind(0.0799), "gold");
  assert.equal(pickKind(0.08), "feature");
  assert.equal(pickKind(0.2499), "feature");
  assert.equal(pickKind(0.25), "bug");
});

test("칭호 경계", () => {
  assert.equal(rankFor(0), "견습 테스터");
  assert.equal(rankFor(11), "견습 테스터");
  assert.equal(rankFor(12), "주니어 QA");
  assert.equal(rankFor(25), "시니어 QA");
  assert.equal(rankFor(35), "QA Lead");
  assert.equal(rankFor(45), "버그 사냥 전설");
});

// 칭호 기준이 실제 판과 맞는지 — 완벽한 사람도 「전설」에 못 닿으면 기준이 틀린 것
test("칭호 보정: 완벽한 사람은 전설, 느린 사람은 견습·주니어", () => {
  const scores = (react: (k: string) => number | null) =>
    [1, 2, 3, 4, 5, 6, 7, 8].map(seed => play(seed, react).stats.score);

  const perfect = scores(k => (k === "feature" ? null : 250));
  const decent = scores(k => (k === "feature" ? null : 550));
  const slow = scores(k => (k === "feature" ? null : 900));
  console.log({ perfect, decent, slow });

  // 황금 버그 수가 판마다 달라 최저는 운이다 — 가운데 값으로 본다
  const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1];
  assert.ok(median(perfect) >= 45, `완벽 가운데 ${median(perfect)}`);
  assert.ok(Math.max(...slow) < 35, `느림 최고 ${Math.max(...slow)}`);
});
