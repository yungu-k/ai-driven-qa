// 실행: node --test "tests/lab/*.test.ts"
// 내기 모음 3 「한 칸 더?」 엔진(src/lab/party/pushluck.ts) — 규칙(경고 한 번 · 뺏김 · 멈춤 · 한 바퀴 덤 · 바퀴 수)과 봇.
// 규격 docs/lab-party-pushluck-spec.md 1절·6절. 숫자는 코드(RULES)가 정본이다 — 규격 숫자와 같은지는 따로 한 번 본다.
// 시안 원본(docs/lab-party-pushluck.js)과 같은 동작인지는 여기서 안 본다 — tmp/lab-party-port/equiv.mjs pushluck 가 잰다.
// 봇 검사: 숨은 정보가 없는 게임이라도 봇은 viewOf 가 만든 보기만 받는다(보기 열쇠 밖을 읽으면 빨강) — 숨은 정보 게임도 같은 모양으로 쓴다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, TREATS, create, roll, stop, next, risk, bot, viewOf, type PushluckGame, type PushluckView } from "../../src/lab/party/pushluck.ts";

/** 봇이 끝까지 두는 판 하나. 차례마다 봇 답으로 굴리거나 멈춘다 */
function playOut(n: number, seed: number, levels: ("easy" | "normal")[]): PushluckGame {
  const g = create(n, seed);
  let guard = 0;
  while (g.state !== "over" && guard++ < 100000) {
    while (g.state === "turn") {
      if (bot(viewOf(g), levels[g.turn]) === "stop") stop(g);
      else roll(g);
    }
    next(g);
  }
  return g;
}

test("수치가 규격 1절과 같다(6면 · 바퀴 2명 10 · 3명 8 · 4명 6 · 덤 10 · 경고 한 번) · 간식 여섯", () => {
  assert.deepEqual([RULES.FACES, RULES.ROUNDS[2], RULES.ROUNDS[3], RULES.ROUNDS[4], RULES.BONUS, RULES.WARNS], [6, 10, 8, 6, 10, 1]);
  assert.deepEqual(TREATS, ["개껌", "사과", "상추", "쿠키", "고기", "치즈"]);
  for (const n of [2, 3, 4]) assert.equal(create(n, 1).rounds, RULES.ROUNDS[n]);
  assert.equal(create(3, 1, 2).rounds, 2, "세 번째 인자로 바퀴 수를 준다");
});

test("새 눈은 접시에 담고 그 눈만큼 점수 · 위험 = 찬 칸 / 6", () => {
  const g = create(2, 1);
  assert.deepEqual(roll(g, 4), { face: 4 });
  assert.deepEqual(roll(g, 2), { face: 2 });
  assert.deepEqual([g.plate, g.pot, g.warn, g.state], [[4, 2], 6, 0, "turn"]);
  assert.equal(risk(g), 2 / 6);
});

test("겹침 첫 번째는 경고(그 굴림 0, 접시 그대로) · 두 번째는 뺏김(이번 차례 0, 합계 그대로, 차례 끝)", () => {
  const g = create(2, 1);
  roll(g, 3);
  roll(g, 5);
  assert.deepEqual(roll(g, 3), { face: 3, warn: true });
  assert.deepEqual([g.plate, g.pot, g.warn, g.state], [[3, 5], 8, 1, "turn"]);
  roll(g, 1); // 경고 뒤에도 새 눈은 담긴다
  assert.equal(g.pot, 9);
  assert.deepEqual(roll(g, 5), { face: 5, bust: true, lost: 9 });
  assert.deepEqual([g.plate, g.pot, g.warn, g.state, g.scores], [[], 0, 0, "bust", [0, 0]]);
  assert.equal(roll(g, 2), null, "차례가 끝나면 굴림을 안 받는다");
  assert.deepEqual(g.log.map((e) => e.e), ["warn", "bust"]);
});

test("멈춤: 접시가 합계로(비었으면 거절) · 경고 표지는 다음 차례로 안 넘어간다", () => {
  const g = create(2, 1);
  assert.equal(stop(g), false, "빈 접시는 멈춤 불가");
  roll(g, 6);
  roll(g, 6); // 경고
  assert.equal(stop(g), true);
  assert.deepEqual([g.scores, g.state, g.warn, g.plate], [[6, 0], "banked", 0, []]);
  assert.equal(stop(g), false, "이미 멈춘 차례");
  next(g);
  assert.deepEqual([g.turn, g.state, g.warn, g.last], [1, "turn", 0, null]);
});

test("여섯 눈을 다 모으면 덤 +10 · 저절로 멈춤", () => {
  const g = create(2, 1);
  for (const f of [1, 2, 3, 4, 5]) assert.ok(!roll(g, f)!.full);
  assert.deepEqual(roll(g, 6), { face: 6, full: true });
  assert.deepEqual([g.scores[0], g.state, g.log.at(-1)?.e], [1 + 2 + 3 + 4 + 5 + 6 + 10, "banked", "full"]);
});

test("차례·바퀴: 차례 중엔 next 거절 · 마지막 사람 뒤 바퀴 +1 · 바퀴 수를 넘기면 끝, 차례 수 = 사람 × 바퀴", () => {
  const g = create(3, 1, 2);
  assert.equal(next(g), false);
  const seen: [number, number][] = [];
  while (g.state !== "over") {
    seen.push([g.round, g.turn]);
    roll(g, 1);
    stop(g);
    next(g);
  }
  assert.deepEqual(seen, [[1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]]);
  assert.deepEqual(g.scores, [2, 2, 2]);
  for (const n of [2, 3, 4]) {
    const h = playOut(n, 7 * n, Array(n).fill("normal"));
    const turns = h.log.filter((e) => e.e === "bank" || e.e === "full" || e.e === "bust").length;
    assert.equal(turns, n * RULES.ROUNDS[n], `${n}명 차례 수`);
    assert.equal(h.scores.reduce((a, b) => a + b, 0), h.log.reduce((a, e) => a + (e.e === "bank" || e.e === "full" ? e.pot! : 0), 0), `${n}명 합계 = 멈춤·한 바퀴 점수 합`);
  }
});

test("같은 씨앗은 같은 판, 다른 씨앗은 다른 판(주사위는 상태 JSON 밖)", () => {
  const a = playOut(3, 42, ["easy", "normal", "easy"]), b = playOut(3, 42, ["easy", "normal", "easy"]), c = playOut(3, 43, ["easy", "normal", "easy"]);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.notEqual(JSON.stringify(a), JSON.stringify(c));
  assert.ok(!("r" in JSON.parse(JSON.stringify(a))), "주사위 함수가 저장 JSON 에 섞였다");
});

test("봇 연습: 3칸이면 멈춤, 경고는 모른 척 · 봇 보통: 경고 받으면 2칸부터 멈춤, 5칸이면 멈춤, 마지막 바퀴에 뒤지면 따라잡을 때까지", () => {
  const v = (o: Partial<PushluckView>): PushluckView => ({ plate: [], warn: 0, pot: 0, mine: 0, best: 0, last: false, ...o });
  assert.equal(bot(v({}), "easy"), "roll", "빈 접시는 늘 굴림");
  assert.equal(bot(v({}), "normal"), "roll");
  assert.equal(bot(v({ plate: [1, 2] }), "easy"), "roll");
  assert.equal(bot(v({ plate: [1, 2, 3] }), "easy"), "stop");
  assert.equal(bot(v({ plate: [1, 2], warn: 1 }), "easy"), "roll", "연습 봇은 경고를 모른다");
  assert.equal(bot(v({ plate: [1], warn: 1 }), "normal"), "roll", "경고여도 1칸이면 더");
  assert.equal(bot(v({ plate: [1, 2], warn: 1 }), "normal"), "stop");
  assert.equal(bot(v({ plate: [1, 2, 3, 4] }), "normal"), "roll");
  assert.equal(bot(v({ plate: [1, 2, 3, 4, 5] }), "normal"), "stop");
  assert.equal(bot(v({ plate: [1, 2], warn: 1, pot: 3, mine: 10, best: 40, last: true }), "normal"), "roll", "마지막 바퀴에 뒤지면 경고여도 더");
  assert.equal(bot(v({ plate: [1, 2], warn: 1, pot: 3, mine: 40, best: 40, last: true }), "normal"), "stop", "따라잡으면(합계 > 남 최고) 경고에 멈춤");
  assert.equal(bot(v({ plate: [1, 2, 3, 4, 5], pot: 15, mine: 0, best: 99, last: true }), "normal"), "stop", "5칸이면 뒤져도 멈춤");
});

test("봇은 viewOf 가 만든 보기만 읽는다 — 보기는 화면에 보이는 여섯 가지뿐이고 봇은 그 밖을 건드리지 않는다", () => {
  const KEYS = ["best", "last", "mine", "plate", "pot", "warn"];
  const g = create(3, 5);
  roll(g, 2);
  roll(g, 2);
  const view = viewOf(g);
  assert.deepEqual(Object.keys(view).sort(), KEYS, "보기 열쇠가 늘었다 — 화면에 안 보이는 것을 봇에 넘기나");
  assert.notEqual(view.plate, g.plate, "보기의 접시는 사본이어야 한다(봇이 판을 못 고친다)");
  // 읽는 열쇠를 적는 덫: 보기 밖(판·씨앗·로그·남의 합계 목록)을 읽으면 걸린다
  const read = new Set<string>();
  const trap = new Proxy(view, { get(t, k) { read.add(String(k)); return Reflect.get(t, k); }, set() { throw new Error("봇이 보기를 고쳤다"); } });
  for (const lv of ["easy", "normal"] as const) bot(trap, lv);
  const outside = [...read].filter((k) => !KEYS.includes(k));
  assert.ok(read.size > 0, "덫이 아무것도 못 봤다 — 덫이 헛돈다");
  assert.deepEqual(outside, [], `봇이 보기 밖을 읽었다: ${outside}`);
  // best 는 남 가운데 최고(내 합계 빼고)
  const h = create(3, 1);
  h.scores = [50, 20, 30];
  h.turn = 0;
  assert.deepEqual([viewOf(h).mine, viewOf(h).best], [50, 30]);
  h.round = h.rounds;
  assert.equal(viewOf(h).last, true);
});

test("균형(규격 6절): 2명 맞붙기에서 보통 봇이 연습 봇을 이기는 쪽이 많다 · 판마다 뺏김·경고가 나온다", () => {
  let normalWins = 0, ties = 0, busts = 0, warns = 0;
  const N = 400;
  for (let s = 1; s <= N; s++) {
    const swap = s % 2 === 0; // 먼저 두는 자리를 번갈아
    const g = playOut(2, s, swap ? ["easy", "normal"] : ["normal", "easy"]);
    const [nm, ez] = swap ? [g.scores[1], g.scores[0]] : [g.scores[0], g.scores[1]];
    if (nm > ez) normalWins++;
    else if (nm === ez) ties++;
    busts += g.log.filter((e) => e.e === "bust").length;
    warns += g.log.filter((e) => e.e === "warn").length;
  }
  assert.ok(busts > 0 && warns > 0, `뺏김 ${busts} · 경고 ${warns}`);
  const rate = normalWins / (N - ties);
  assert.ok(rate > 0.6 && rate < 0.95, `보통 승률 ${rate.toFixed(2)} (규격 시뮬 0.75)`);
});
