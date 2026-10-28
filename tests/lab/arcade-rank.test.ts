// 실행: node --test tests/lab/arcade-rank.test.ts
// 「그냥 오락실」 점수 랭킹 규칙(서버가 받는 값)과 공통 정렬·이름 거르기.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkScoreEntry, GAMES } from "../../src/lab/arcade-rank-rules.ts";
import { orderScore, NAME_MAX } from "../../src/lab/rank-common.ts";
import { cleanNameSay } from "../../src/lab/arcade-rank.ts";

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
  assert.equal(reason("pocha", ok), "ok");
  assert.equal(reason("nope", ok), "game");
  assert.equal(reason("__proto__", ok), "game");
});

test("이름·한마디는 공통 규칙으로 거른다", () => {
  assert.equal(NAME_MAX, 9);
  for (const name of ["코코 주인", "가".repeat(9), "qa", "QAQ"]) assert.equal(reason("dreamherd", { ...ok, name }), "ok", name);
  for (const name of ["가".repeat(10), "", " "]) assert.equal(reason("dreamherd", { ...ok, name }), "name", name);
  assert.equal(reason("dreamherd", { ...ok, name: "x.com" }), "name-link");
  assert.equal(reason("dreamherd", { ...ok, name: "010-12345" }), "name-link");
  assert.equal(reason("dreamherd", { ...ok, name: "씨 발" }), "name-bad");
  assert.equal(reason("dreamherd", { ...ok, name: "<img>" }), "name-char");
  assert.equal(reason("dreamherd", { ...ok, say: "www.spam" }), "say-link");
});

test("화면 쪽 이름 다듬기: 띄어쓰기만 다듬고 9글자에서 자른다", () => {
  assert.deepEqual(cleanNameSay("  코코   주인 ", " 안녕 "), { name: "코코 주인", say: "안녕" });
  assert.equal(cleanNameSay("가나다라마바사아자차", "").name, "가나다라마바사아자");
  assert.equal(cleanNameSay("abc", "").name, "abc"); // 대문자로 바꾸지 않는다
  assert.equal(cleanNameSay("    ", "").name, "");
  assert.equal(reason("coco", { ...ok, ...cleanNameSay("가나다라마바사아자차", "") }), "ok");
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

test("포장마차: 비 그칠 때까지 버틴 판은 상한 안, 짧은 판·말이 안 되는 손님 수는 거른다", () => {
  assert.equal(GAMES.pocha.key, "surv:pocha:rank");
  // 이긴 판 위쪽 끝: 600초 · 처치 3400(시뮬 최대 3362) · 손님 150(조용한 판 시뮬 142) · 막내 180 · 가게 400 가득
  assert.equal(reason("pocha", { ...ok, sec: 600, score: 6000 + 3400 + 150 * 40 + 5000 + 180 * 10 + 400 * 20 }), "ok");
  // 진 판(가게가 무너짐) 6:44 · 처치 1643 · 손님 30 — 시뮬 판 결과(tmp/lab-surv/equiv-pocha.mjs)
  assert.equal(reason("pocha", { ...ok, sec: 404, score: 4040 + 1643 + 30 * 40 }), "ok");
  assert.equal(reason("pocha", { ...ok, sec: 30, score: 20000 }), "too-high");
  assert.equal(reason("pocha", { ...ok, sec: 600, score: 50000 }), "too-high");
  assert.equal(reason("pocha", { ...ok, score: GAMES.pocha.maxScore(ok.sec) + 1 }), "too-high");
  assert.equal(reason("pocha", { ...ok, sec: GAMES.pocha.maxSec + 1 }), "sec");
});

test("정렬: 점수가 먼저, 같으면 먼저 온 사람", () => {
  const t = 1_800_000_000_000;
  assert.ok(orderScore(5000, t + 9000) > orderScore(4999, t));
  assert.ok(orderScore(5000, t) > orderScore(5000, t + 1000));
  assert.ok(Number.isSafeInteger(orderScore(GAMES.dreamherd.maxScore(GAMES.dreamherd.maxSec), t)));
});
