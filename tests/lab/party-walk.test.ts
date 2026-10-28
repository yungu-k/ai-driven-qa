// 실행: node --test "tests/lab/*.test.ts"
// 내기 모음 9 「코코 산책 보드」 엔진(src/lab/party/walk.ts) — 규칙(굴림 · 별로 한 칸 덜·더 · 칸 사건 8종 · 연쇄 없음 · 바퀴 · 도착 · 순위)과 봇.
// 규격 docs/lab-party-walk-spec.md 1절·3절. 숫자는 코드(RULES·BOARD)가 정본이다 — 규격 숫자와 같은지는 따로 한 번 본다.
// 시안 원본(docs/lab-party-walk.js)과 같은 동작인지는 여기서 안 본다 — tmp/lab-party-port/equiv.mjs walk 가 잰다.
// 봇 검사: 숨은 정보가 없는 게임이라 봇은 view 가 만든 판 사본만 받는다(보기 열쇠 밖을 읽으면 빨강).
import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, KINDS, BOARD, create, roll, choose, next, square, left, kindAt, rankScore, view, bot, type WalkGame, type WalkView } from "../../src/lab/party/walk.ts";

function rnd(seed: number): () => number {
  let s = (Math.imul(seed, 2654435761) >>> 0) || 1;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** 봇끼리 끝까지 도는 판 하나(차례 수 상한 — 멈추면 빨강) */
function playOut(n: number, seed: number, levels: ("easy" | "normal")[]): WalkGame {
  const g = create(n, seed), r = rnd(seed);
  let guard = 0;
  while (g.state !== "over" && guard++ < 3000) {
    assert.ok(roll(g), `굴릴 수 없는 상태 ${g.state}(멈춤)`);
    assert.ok(choose(g, bot(view(g), levels[g.turn], r)), "봇이 못 고르는 걸음을 골랐다");
    if (g.state === "done") assert.ok(next(g));
  }
  assert.equal(g.state, "over", "판이 안 끝났다");
  return g;
}
/** 사람 i 를 걸음 p 에 세우고 그 사람 차례로(굴림 전) */
function at(g: WalkGame, i: number, p: number): WalkGame { g.prog[i] = p; g.turn = i; g.state = "roll"; return g; }
const first = (k: string) => BOARD.indexOf(k as never);

test("수치가 규격 1절과 같다(40칸 · 바퀴 2명 3 · 3명 2 · 4명 2 · 별 처음 1 · 뒤 3 · 앞 3 · 소나기 2 · 칸 수)", () => {
  assert.deepEqual([RULES.SQUARES, RULES.LAPS[2], RULES.LAPS[3], RULES.LAPS[4], RULES.START_STARS, RULES.BELL_BACK, RULES.BALL_FWD, RULES.RAIN_BACK], [40, 3, 2, 2, 1, 3, 3, 2]);
  const count: Record<string, number> = {};
  for (const k of BOARD) count[k] = (count[k] || 0) + 1;
  assert.deepEqual(count, { home: 1, "": 12, bell: 6, bath: 3, rain: 2, meat: 3, ball: 3, treat: 5, photo: 2, friend: 3 });
  assert.equal(BOARD[0], "home");
  assert.deepEqual(Object.keys(KINDS).sort(), ["ball", "bath", "bell", "friend", "meat", "photo", "rain", "treat"]);
  assert.deepEqual([2, 3, 4].map((n) => create(n, 1).D), [120, 80, 80], "바퀴 × 40");
  assert.equal(create(2, 1, 1).D, 40, "세 번째 인자로 바퀴를 준다");
});

test("별로 한 칸 덜·더: 별 있으면 셋(눈 1 이면 덜 없음) · 별 0 이면 그대로 하나 · 고르면 별 −1", () => {
  const g = create(2, 1);
  assert.deepEqual(roll(g, 4)!.map((o) => [o.d, o.cost, o.to, o.kind]), [[3, 1, 3, ""], [4, 0, 4, "bell"], [5, 1, 5, ""]]);
  const r = choose(g, 0)!;
  assert.deepEqual([r.d, r.cost, r.to, g.prog[0], g.stars[0], r.steps], [3, 1, 3, 3, 0, [1, 2, 3]], "−1 ★: 3칸, 별 0");
  next(g);
  assert.deepEqual(roll(g, 1)!.map((o) => [o.d, o.cost]), [[1, 0], [2, 1]], "눈 1: 덜은 없다(+1 ★ 만)");
  choose(g, 1);
  assert.deepEqual([g.prog[1], g.stars[1], g.last!.kind], [2, 1, "treat"], "+1 ★: 2칸(별 1 − 1, 간식 칸이라 +1)");
  next(g);
  assert.deepEqual(roll(g, 5)!.map((o) => [o.d, o.cost]), [[5, 0]], "별 0: 고를 것 없이 그대로");
  assert.equal(choose(g, 1), null, "없는 번호는 거절");
  assert.equal(choose(g, -1), null);
  assert.equal(g.state, "choose", "거절은 판을 안 바꾼다");
  assert.equal(choose(g)!.d, 5, "번호를 안 주면 그대로");
});

test("별 ±1 은 정확히 한 칸: 눈 d 에서 덜 = d−1 · 더 = d+1 (모든 눈 · 별 1)", () => {
  for (let d = 1; d <= 6; d++) {
    const g = create(2, 1), o = roll(g, d)!;
    const ds = o.map((x) => x.d - d), cs = o.map((x) => x.cost);
    assert.deepEqual(ds, d > 1 ? [-1, 0, 1] : [0, 1], `눈 ${d}`);
    assert.deepEqual(cs, d > 1 ? [1, 0, 1] : [0, 1]);
  }
});

test("칸 사건 8종이 다 일어난다(손으로 세운 판 · 결과 그대로)", () => {
  // 초인종: 뒤로 3
  let g = create(3, 5); at(g, 0, 0);
  roll(g, first("bell"));
  let r = choose(g)!;
  assert.deepEqual([r.kind, r.fx, g.prog[0], g.state], ["bell", { move: [[0, 4, 1]] }, 1, "done"]);
  // 공: 앞으로 3
  g = create(3, 5); at(g, 0, 10); roll(g, 5); r = choose(g, 1)!;
  assert.deepEqual([r.kind, r.fx, g.prog[0]], ["ball", { move: [[0, 15, 18]] }, 18]);
  // 고기: 한 번 더(같은 사람, 굴림 상태)
  g = create(3, 5); at(g, 0, 3); roll(g, 3); r = choose(g, 1)!;
  assert.deepEqual([r.kind, r.again, g.state, g.turn], ["meat", true, "roll", 0]);
  // 목욕: 다음 차례 한 번 쉼(next 가 건너뛰고 skipped 에 남긴다)
  g = create(3, 5); at(g, 0, 6); roll(g, 3); r = choose(g, 1)!;
  assert.deepEqual([r.kind, r.fx, g.rest[0]], ["bath", { rest: 0 }, true]);
  next(g); roll(g, 1); choose(g); next(g); roll(g, 1); choose(g); next(g);
  assert.deepEqual([g.turn, g.skipped, g.rest[0]], [1, [0], false], "0 이 쉬고 1 차례");
  // 간식: 별 +1
  g = create(3, 5); at(g, 0, 0); roll(g, 2); r = choose(g, 1)!;
  assert.deepEqual([r.kind, r.fx, g.stars], ["treat", { star: [0] }, [2, 1, 1]], "그대로(별 안 씀) — 처음 별 1 + 간식 1");
  // 단체 사진: 모두 +1
  g = create(3, 5); at(g, 0, 14); roll(g, 3); r = choose(g, 1)!;
  assert.deepEqual([r.kind, r.fx, g.stars], ["photo", { star: [0, 1, 2] }, [2, 2, 2]]);
  // 친구 강아지: 다른 사람 하나와 자리 바꿈
  g = create(3, 5); g.prog = [0, 30, 50]; at(g, 0, 9); roll(g, 2); r = choose(g, 1)!;
  assert.equal(r.kind, "friend");
  const j = r.fx!.swap![1];
  assert.ok(j === 1 || j === 2);
  assert.deepEqual([g.prog[0], g.prog[j]], [j === 1 ? 30 : 50, 11]);
  assert.deepEqual(r.fx!.move, [[0, 11, g.prog[0]], [j, g.prog[0], 11]]);
  // 소나기: 맨 앞 사람(들) 2칸 뒤 — 같으면 모두, 자기일 수도
  g = create(3, 5); g.prog = [0, 60, 60]; at(g, 0, 18); roll(g, 2); r = choose(g, 1)!;
  assert.deepEqual([r.kind, r.fx, g.prog], ["rain", { move: [[1, 60, 58], [2, 60, 58]] }, [20, 58, 58]], "동점 둘 다");
  g = create(3, 5); g.prog = [0, 10, 5]; at(g, 0, 37); roll(g, 2); r = choose(g, 1)!;
  assert.deepEqual([r.kind, r.fx, g.prog[0]], ["rain", { move: [[0, 39, 37]] }, 37], "자기가 맨 앞이면 자기");
  assert.deepEqual(Object.keys(g.hits), ["rain"]);
});

test("연쇄 없음: 사건으로 옮겨 간 칸의 사건은 안 받는다(초인종 27 → 고기 24 · 공 30 → 목욕 33)", () => {
  let g = create(2, 1); at(g, 0, 24); roll(g, 3); let r = choose(g, 1)!;
  assert.deepEqual([r.kind, g.prog[0], BOARD[24], r.again, g.state], ["bell", 24, "meat", false, "done"], "고기 칸에 떨어져도 한 번 더 없음");
  g = create(2, 1); at(g, 0, 27); roll(g, 3); r = choose(g, 1)!;
  assert.deepEqual([r.kind, g.prog[0], BOARD[33], g.rest[0], g.state], ["ball", 33, "bath", false, "done"], "목욕 칸에 떨어져도 쉬지 않음");
  assert.deepEqual(g.hits, { ball: 1 });
});

test("바퀴 중간 집 칸(0번)에 서면 빈 칸 — 판이 안 멈춘다(design 이 고친 kindAt) · 바퀴 끝에 닿으면 도착", () => {
  const g = create(2, 1); // D = 120
  assert.deepEqual([kindAt(g, 0), kindAt(g, 40), kindAt(g, 80), kindAt(g, 120), kindAt(g, 125)], ["", "", "", "home", "home"]);
  at(g, 0, 37); const o = roll(g, 3)!;
  assert.deepEqual(o.map((x) => [x.to, x.kind]), [[39, "rain"], [40, ""], [41, ""]]);
  const r = choose(g, 1)!;
  assert.deepEqual([r.to, r.kind, r.fx, r.over, g.state, square(g, 0)], [40, "", null, false, "done", 0]);
  assert.ok(next(g), "다음 차례로 넘어간다");
  assert.equal(g.state, "roll");
  // 바퀴 끝: 넘어도 D 에서 멈추고 도착
  at(g, 1, 117); roll(g, 6); const r2 = choose(g, 1)!;
  assert.deepEqual([r2.to, r2.kind, r2.over, g.state, g.winner, left(g, 1), square(g, 1)], [120, "home", true, "over", 1, 0, 0]);
  assert.equal(roll(g), null, "끝난 판은 굴림 거절");
  assert.equal(next(g), false);
});

test("바퀴는 사람 수마다(2명 120 · 3·4명 80칸) — 봇끼리 끝까지 · 1등은 다 걸은 사람 하나", () => {
  for (const n of [2, 3, 4]) for (let s = 1; s <= 30; s++) {
    const g = playOut(n, s, Array(n).fill(s % 2 ? "normal" : "easy"));
    assert.equal(g.D, RULES.SQUARES * RULES.LAPS[n]);
    assert.equal(left(g, g.winner), 0);
    assert.equal(g.prog.filter((p) => p >= g.D).length, 1, "도착은 한 사람");
    assert.ok(g.prog.every((p) => p >= 0 && p <= g.D));
    assert.ok(g.rolls >= g.turns + 1, "한 번 더 · 끝 차례가 굴림을 더한다");
    assert.equal(g.log.filter((e) => e.e === "roll").length, g.rolls);
  }
});

test("순위(W5): 1등 = 집에 온 사람, 나머지 남은 칸 적은 순 → 같으면 별 많은 순 · 꼴찌 = 남은 칸 가장 많은 사람", () => {
  const g = create(4, 1); // D = 80
  g.prog = [80, 70, 70, 10]; g.stars = [0, 1, 3, 9];
  const s = [0, 1, 2, 3].map((i) => rankScore(g, i));
  assert.deepEqual(s, [99, 1098, 1096, 7090]);
  const order = [0, 1, 2, 3].sort((a, b) => s[a] - s[b]);
  assert.deepEqual(order, [0, 2, 1, 3], "집 → 남은 10칸 별 3 → 남은 10칸 별 1 → 남은 70칸(별 9 여도 꼴찌)");
});

test("봇: 고를 게 하나면 0 · 보통은 고기 칸을 별로 잡고 초인종 칸을 피한다 · 연습은 난수대로", () => {
  const g = create(2, 1);
  at(g, 0, 23); roll(g, 2); // 24 고기 · 25 빈 칸 · 26 친구(남 0 → 손해)
  assert.equal(view(g).opts![bot(view(g), "normal")].to, 24, "−1 ★ 로 고기");
  const h = create(2, 1); at(h, 0, 0); roll(h, 4); // 3 빈 칸 · 4 초인종 · 5 빈 칸
  assert.notEqual(h.opts![bot(view(h), "normal")].kind, "bell");
  const k = create(2, 1); k.stars[0] = 0; at(k, 0, 0); roll(k, 3);
  assert.equal(bot(view(k), "normal"), 0);
  assert.equal(bot(view(k), "easy", () => 0.99), 0);
  const e = create(2, 1); roll(e, 3);
  assert.deepEqual([0, 0.4, 0.99].map((x) => bot(view(e), "easy", () => x)), [0, 1, 2], "연습: 난수대로");
});

test("봇은 view 가 만든 판 사본만 읽는다 — 보기는 화면에 보이는 것(판·별·쉼·주사위·고를 칸)뿐", () => {
  const KEYS = ["D", "die", "n", "opts", "prog", "rest", "stars", "state", "turn"];
  const g = create(3, 7); g.prog = [12, 30, 5]; roll(g, 4);
  const v = view(g);
  assert.deepEqual(Object.keys(v).sort(), KEYS, "보기 열쇠가 늘었다 — 화면에 안 보이는 것을 봇에 넘기나");
  v.prog[0] = 99; assert.equal(g.prog[0], 12, "보기는 사본");
  const v2 = view(g), read = new Set<string>();
  const trap = new Proxy(v2, { get(t, k) { read.add(String(k)); return Reflect.get(t, k); }, set() { throw new Error("봇이 보기를 고쳤다"); } }) as WalkView;
  for (const lv of ["easy", "normal"] as const) for (let s = 1; s <= 5; s++) bot(trap, lv, rnd(s));
  const outside = [...read].filter((k) => !KEYS.includes(k));
  assert.ok(read.size > 0, "덫이 아무것도 못 봤다 — 덫이 헛돈다");
  assert.deepEqual(outside, [], `봇이 보기 밖을 읽었다: ${outside}`);
});

test("균형(규격 2절): 2명 보통 봇이 연습 봇을 이기는 쪽(규격 67 %) · 판마다 사건이 나온다", () => {
  let normalWins = 0;
  const N = 400, kinds = new Set<string>();
  for (let s = 1; s <= N; s++) {
    const swap = s % 2 === 0;
    const g = playOut(2, s, swap ? ["easy", "normal"] : ["normal", "easy"]);
    if (g.winner === (swap ? 1 : 0)) normalWins++;
    for (const k of Object.keys(g.hits)) kinds.add(k);
  }
  assert.ok(normalWins / N > 0.58 && normalWins / N < 0.78, `보통 1등 ${normalWins}/${N}(규격 67 %)`);
  assert.equal(kinds.size, 8, `나온 사건 ${[...kinds]}`);
});
