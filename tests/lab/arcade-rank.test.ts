// 실행: node --test tests/lab/arcade-rank.test.ts
// 「그냥 오락실」 점수 랭킹 규칙(서버가 받는 값)과 공통 정렬·이니셜 거르기.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkScoreEntry, GAMES } from "../../src/lab/arcade-rank-rules.ts";
import { orderScore } from "../../src/lab/rank-common.ts";

const ok = { name: "QAQ", score: 3200, say: "양이 최고", sec: 300 };
const reason = (game: string, b: unknown) => {
  const c = checkScoreEntry(game, b);
  return c.ok ? "ok" : c.reason;
};

test("정상 점수는 받는다, 모르는 게임은 거른다", () => {
  assert.equal(reason("dreamherd", ok), "ok");
  assert.equal(reason("dreamherd", { ...ok, score: 0, sec: 0, say: "" }), "ok");
  assert.equal(reason("coco", ok), "ok");
  assert.equal(reason("goblin", ok), "ok");
  assert.equal(reason("nope", ok), "game");
  assert.equal(reason("__proto__", ok), "game");
});

test("이니셜·한마디는 공통 규칙으로 거른다", () => {
  assert.equal(reason("dreamherd", { ...ok, name: "qa" }), "name");
  assert.equal(reason("dreamherd", { ...ok, say: "www.spam" }), "say-link");
});

test("점수·시간: 정수·범위, 버틴 시간에 비해 너무 높으면 거른다", () => {
  assert.equal(reason("dreamherd", { ...ok, score: 1.5 }), "score");
  assert.equal(reason("dreamherd", { ...ok, sec: GAMES.dreamherd.maxSec + 1 }), "sec");
  assert.equal(reason("dreamherd", { ...ok, score: GAMES.dreamherd.maxScore(ok.sec) }), "ok");
  assert.equal(reason("dreamherd", { ...ok, score: GAMES.dreamherd.maxScore(ok.sec) + 1 }), "too-high");
  // 아침까지 버티고 이긴 판(600초, 이김 5000 + 양 30마리)은 상한 안
  assert.equal(reason("dreamherd", { ...ok, sec: 600, score: 600 * 10 + 2000 + 40 * 25 + 200 * 15 + 5000 + 30 * 200 }), "ok");
});

test("코코: 저녁밥까지 버틴 판은 상한 안, 짧은 판의 큰 점수는 거른다", () => {
  assert.equal(reason("coco", { ...ok, sec: 600, score: 6000 + 1500 + 200 * 30 + 5000 + 150 * 20 }), "ok");
  assert.equal(reason("coco", { ...ok, sec: 30, score: 20000 }), "too-high");
});

test("정렬: 점수가 먼저, 같으면 먼저 온 사람", () => {
  const t = 1_800_000_000_000;
  assert.ok(orderScore(5000, t + 9000) > orderScore(4999, t));
  assert.ok(orderScore(5000, t) > orderScore(5000, t + 1000));
  assert.ok(Number.isSafeInteger(orderScore(GAMES.dreamherd.maxScore(GAMES.dreamherd.maxSec), t)));
});
