// 실행: node --test tests/lab/coco-td-rank.test.ts
// 릴리스 디펜스 랭킹 규칙(서버가 받는 값)과 이어하기 저장 규칙.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkEntry, scoreOf, kstDate, MIN_SIM_SEC_PER_LAP } from "../../src/lab/coco-td/rank-rules.ts";
import { afterMapWon, clearedLaps, freshRun, hasProgress, parseRun } from "../../src/lab/coco-td/save.ts";
import { cleanEntry } from "../../src/lab/coco-td/rank.ts";

const ok = { name: "QAQ", lap: 2, say: "회귀는 꼭 돌리자", simSec: 2 * MIN_SIM_SEC_PER_LAP };
const reason = (b: unknown) => {
  const c = checkEntry(b);
  return c.ok ? "ok" : c.reason;
};

test("정상 기록은 받는다", () => {
  assert.equal(reason(ok), "ok");
  assert.equal(reason({ ...ok, lap: 0, simSec: 0, say: "" }), "ok"); // v1.0 도 못 깼어도 이름은 남긴다
});

test("이니셜은 대문자·숫자 3글자", () => {
  for (const name of ["qaq", "QA", "QAQQ", "Q-Q", "", "가나다"]) assert.equal(reason({ ...ok, name }), "name", name);
  assert.equal(reason({ ...ok, name: "SEX" }), "name-bad");
});

test("한마디: 20자 넘으면·링크·욕설·꺾쇠는 거른다", () => {
  assert.equal(reason({ ...ok, say: "가".repeat(21) }), "say-long");
  assert.equal(reason({ ...ok, say: "가".repeat(20) }), "ok");
  for (const say of ["http://x.y", "www.abc", "my.site.com 와", "@someone 봐", "010-1234-5678"]) assert.equal(reason({ ...ok, say }), "say-link", say);
  for (const say of ["시 발", "ㅅ.ㅂ", "F u c k"]) assert.equal(reason({ ...ok, say }), "say-bad", say);
  assert.equal(reason({ ...ok, say: "<b>x" }), "say-char");
});

test("바퀴·시간: 정수 범위, 너무 빠른 기록은 거른다", () => {
  for (const lap of [-1, 1.5, 1000, "3"]) assert.equal(reason({ ...ok, lap }), "lap", String(lap));
  assert.equal(reason({ ...ok, lap: 5, simSec: 5 * MIN_SIM_SEC_PER_LAP - 1 }), "too-fast");
  assert.equal(reason({ ...ok, simSec: Number.NaN }), "simSec");
  assert.equal(reason(null), "shape");
});

test("정렬 점수: 바퀴가 먼저, 같은 바퀴면 먼저 온 사람이 위", () => {
  const t = 1_800_000_000_000;
  assert.ok(scoreOf(3, t + 5000) > scoreOf(2, t));
  assert.ok(scoreOf(2, t) > scoreOf(2, t + 1000));
  assert.ok(Number.isSafeInteger(scoreOf(999, t)));
});

test("날짜는 한국 시간", () => {
  assert.equal(kstDate(Date.UTC(2026, 9, 27, 16, 0)), "10-28"); // UTC 16시 = 한국 다음 날 1시
  assert.equal(kstDate(Date.UTC(2026, 9, 27, 14, 59)), "10-27");
});

test("화면 쪽 다듬기는 서버 규칙과 맞물린다", () => {
  const c = cleanEntry("q-a7", "  한마디   두   칸  ");
  assert.deepEqual(c, { name: "QA7", say: "한마디 두 칸", ok: true });
  assert.equal(reason({ ...ok, name: c.name, say: c.say }), "ok");
});

test("저장: 맵을 깰 때마다 다음 맵, 보스 맵이면 바퀴가 오른다", () => {
  let r = freshRun();
  assert.equal(hasProgress(r), false);
  for (let i = 0; i < 4; i++) r = afterMapWon(r, 100);
  assert.deepEqual([r.lap, r.map, r.best, clearedLaps(r)], [1, 4, 0, 0]);
  r = afterMapWon(r, 100);
  assert.deepEqual([r.lap, r.map, r.best, clearedLaps(r), r.simSec], [2, 0, 1, 1, 500]);
  assert.equal(hasProgress(r), true);
});

test("저장 글은 믿지 않는다", () => {
  const good = JSON.stringify({ lap: 3, map: 2, legends: [{ kind: "bugbomb", lv: 2 }], best: 2, simSec: 10 });
  assert.equal(parseRun(good)?.map, 2);
  for (const bad of ["", "{", "null", JSON.stringify({ lap: 0, map: 0, legends: [], best: 0 }), JSON.stringify({ lap: 1, map: 5, legends: [], best: 0 }), JSON.stringify({ lap: 1, map: 0, legends: [{ kind: "x", lv: 1 }], best: 0 }), JSON.stringify({ lap: 1, map: 0, legends: [1, 2, 3], best: 0 })])
    assert.equal(parseRun(bad), null, bad);
});
