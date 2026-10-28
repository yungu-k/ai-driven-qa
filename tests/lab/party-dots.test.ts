// 실행: node --test "tests/lab/*.test.ts"
// 내기 모음 6 「땅따먹기 점 잇기」 엔진(src/lab/party/dots.ts) — 규칙(선 하나 · 네 번째 선으로 닫기 · 한 번 더 · 두 칸 한꺼번에 · 끝)과 봇.
// 규격 docs/lab-party-dots-spec.md 1절·3절. 숫자는 코드(RULES)가 정본이다 — 규격 숫자와 같은지는 따로 한 번 본다.
// 시안 원본(docs/lab-party-dots.js)과 같은 동작인지는 여기서 안 본다 — tmp/lab-party-port/equiv.mjs dots 가 잰다.
// 봇 검사: 숨은 정보가 없는 게임이라 봇은 view 가 만든 판 사본만 받는다(보기 열쇠 밖을 읽으면 빨강).
import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, CROPS, create, play, topo, view, bot, classify, sides, type DotsGame, type DotsView } from "../../src/lab/party/dots.ts";

/** 봇 난수(시험용, 씨앗 고정) */
function rnd(seed: number): () => number {
  let s = (Math.imul(seed, 2654435761) >>> 0) || 1;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** 봇끼리 끝까지 두는 판 하나 */
function playOut(n: number, seed: number, levels: ("easy" | "normal")[]): DotsGame {
  const g = create(n, seed), r = rnd(seed);
  let guard = 0;
  while (g.state !== "over" && guard++ < 1000) assert.ok(play(g, bot(view(g), levels[g.turn], r)), "봇이 못 긋는 선을 골랐다");
  return g;
}
/** 줄 그리기 도우미: 2×2 판에서 칸 b 의 네 변 */
const T22 = topo(2, 2);

test("수치가 규격 1절과 같다(2명 5×5 · 3·4명 6×5 · 새싹 넷) · 선 수 60 / 71", () => {
  assert.deepEqual([RULES.GRID[2], RULES.GRID[3], RULES.GRID[4], RULES.CROPS], [[5, 5], [6, 5], [6, 5], 4]);
  assert.deepEqual(CROPS, ["상추", "당근", "토마토", "해바라기"]);
  for (const n of [2, 3, 4]) { const g = create(n, 1); assert.deepEqual([g.R, g.C], RULES.GRID[n]); }
  assert.equal(topo(5, 5).L, 60);
  assert.equal(topo(6, 5).L, 71);
  assert.deepEqual([create(2, 1, [3, 4]).R, create(2, 1, [3, 4]).C], [3, 4], "세 번째 인자로 판 크기를 준다");
});

test("선 번호: 가로선 먼저(r*C+c) 그다음 세로선 · 가장자리 선은 칸 하나, 안쪽 선은 칸 둘", () => {
  const T = topo(2, 3);
  assert.deepEqual([T.NH, T.L, T.B], [9, 17, 6]);
  assert.deepEqual(T.ends[4], [[1, 1], [2, 1]], "가로선 4 = 행 1, 열 1");
  assert.deepEqual(T.ends[T.NH + 5], [[1, 1], [1, 2]], "세로선 NH+5 = 행 1, 열 1");
  assert.ok(T.horiz(8) && !T.horiz(9));
  assert.deepEqual(T.lineBoxes[0], [0]);
  assert.deepEqual(T.lineBoxes[4], [1, 4]);
  assert.deepEqual(T.lineBoxes[T.NH], [0]);
  assert.deepEqual(T.lineBoxes[T.NH + 1], [0, 1]);
  assert.deepEqual(T.boxLines[4], [4, 7, T.NH + 5, T.NH + 6]);
  for (let b = 0; b < T.B; b++) for (const l of T.boxLines[b]) assert.ok(T.lineBoxes[l].includes(b), `선 ${l} 이 칸 ${b} 을 모른다`);
});

test("안 닫는 선은 다음 사람 · 그은 선·판 밖 번호·끝난 판은 거절", () => {
  const g = create(3, 1, [2, 2]);
  g.turn = 0;
  assert.deepEqual(play(g, 0), { l: 0, p: 0, closed: [], again: false, over: false });
  assert.deepEqual([g.turn, g.moves, g.lines[0], g.last], [1, 1, 0, { l: 0, p: 0, closed: [] }]);
  assert.equal(play(g, 0), null, "이미 그은 선");
  assert.equal(play(g, -1), null);
  assert.equal(play(g, T22.L), null);
  assert.deepEqual([g.turn, g.moves], [1, 1], "거절은 판을 안 바꾼다");
  play(g, 1);
  play(g, 2);
  assert.equal(g.turn, 0, "셋째 다음은 첫째(돌아간다)");
});

test("네 번째 선으로 닫으면 그 사람 칸 + 1점 + 새싹 + 한 번 더 · 한 선이 두 칸을 닫는다", () => {
  const g = create(2, 3, [2, 2]);
  const [a, b2, c, d] = T22.boxLines[0]; // 칸 0: 위·아래·왼·오른
  g.turn = 0;
  for (const l of [a, b2, c]) play(g, l);
  assert.equal(sides(g, 0), 3);
  const who = g.turn;
  const r = play(g, d)!;
  assert.deepEqual([r.closed, r.again, r.over, r.p], [[0], true, false, who]);
  assert.deepEqual([g.boxes[0], g.scores[who], g.turn], [who, 1, who], "닫은 사람이 한 번 더");
  assert.ok(g.crop[0] >= 0 && g.crop[0] < RULES.CROPS, "새싹이 났다");
  assert.equal(g.crop[1], -1, "안 닫은 칸엔 새싹 없음");
  // 두 칸: 칸 2·3 의 가운데 세로선만 남기고 다 긋는다
  const mid = T22.NH + 1 * 3 + 1; // 행 1, 열 1 세로선 = 칸 2|3 사이
  for (const l of [...new Set([...T22.boxLines[2], ...T22.boxLines[3]])]) if (l !== mid && g.lines[l] < 0) play(g, l);
  const p = g.turn, before = g.scores[p];
  const r2 = play(g, mid)!;
  assert.deepEqual(r2.closed.sort(), [2, 3]);
  assert.equal(g.scores[p], before + 2);
  assert.deepEqual(g.log.at(-1), { p, l: mid, c: 2 });
});

test("마지막 선: 판 끝(over), 닫아도 again 은 거짓 · 그 뒤 긋기 거절", () => {
  const g = create(2, 5, [1, 1]);
  const T = topo(1, 1);
  for (let l = 0; l < T.L - 1; l++) play(g, l);
  const r = play(g, T.L - 1)!;
  assert.deepEqual([r.closed, r.again, r.over, g.state], [[0], false, true, "over"]);
  assert.equal(play(g, 0), null);
  assert.equal(bot(view(g), "normal"), -1, "남은 선이 없으면 봇은 -1");
});

test("끝까지 도는 판(2/3/4명 봇끼리): 그은 선 = 선 수, 점수 합 = 칸 수, 주인 = 점수, 차례 바뀜 = 안 닫은 수", () => {
  for (const n of [2, 3, 4]) for (const seed of [1, 2, 3]) {
    const g = playOut(n, seed * 11 + n, Array.from({ length: n }, (_, i) => (i % 2 ? "easy" : "normal")));
    const T = topo(g.R, g.C);
    assert.equal(g.state, "over");
    assert.equal(g.moves, T.L);
    assert.ok(g.lines.every((x) => x >= 0 && x < n));
    assert.equal(g.scores.reduce((a, v) => a + v, 0), T.B, `${n}명 점수 합`);
    for (let p = 0; p < n; p++) assert.equal(g.boxes.filter((o) => o === p).length, g.scores[p]);
    assert.ok(g.crop.every((k) => k >= 0 && k < RULES.CROPS));
    // 차례: 기록을 따라가면 안 닫은 선마다 다음 사람
    let t = g.first;
    for (const e of g.log) { assert.equal(e.p, t); if (!e.c) t = (t + 1) % n; }
    assert.equal(g.log.reduce((a, e) => a + e.c, 0), T.B);
  }
});

test("첫 차례는 씨앗 무작위(D3) · 같은 씨앗은 같은 판, 다른 씨앗은 다른 판(난수는 상태 JSON 밖)", () => {
  for (const n of [2, 3, 4]) {
    const firsts = new Set<number>();
    for (let s = 1; s <= 200; s++) { const g = create(n, s * 977); assert.equal(g.turn, g.first); firsts.add(g.first); }
    assert.equal(firsts.size, n, `${n}명 첫 차례가 다 나와야 한다`);
  }
  const a = playOut(3, 42, ["easy", "normal", "easy"]), b = playOut(3, 42, ["easy", "normal", "easy"]), c = playOut(3, 43, ["easy", "normal", "easy"]);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.notEqual(JSON.stringify(a), JSON.stringify(c));
  assert.ok(!("r" in JSON.parse(JSON.stringify(a))), "난수 함수가 저장 JSON 에 섞였다");
});

test("봇: 닫을 칸은 닫는다(보통은 두 칸 한꺼번에 먼저) · 보통은 안전한 선이 있으면 세 번째 변을 안 준다", () => {
  // 3×3 판: 칸 0 은 3변(오른쪽만 빔) · 칸 4(가운데)는 오른쪽 선만 남김 + 칸 5 도 그 선만 남김 → 그 선 하나로 두 칸
  const g = create(2, 1, [3, 3]), T = topo(3, 3);
  const [t0, b0, l0] = T.boxLines[0];
  const r4 = T.boxLines[4][3]; // 칸 4|5 사이
  const set = (ls: number[]) => { for (const l of ls) g.lines[l] = 0; };
  set([t0, b0, l0]);
  set([...T.boxLines[4], ...T.boxLines[5]].filter((l) => l !== r4));
  const v = view(g);
  const { caps, safe } = classify(v);
  assert.ok(caps.includes(T.boxLines[0][3]) && caps.includes(r4));
  assert.ok(safe.length > 0);
  assert.equal(bot(v, "normal", rnd(1)), r4, "보통: 두 칸 닫는 선부터");
  for (let s = 1; s <= 30; s++) assert.ok(caps.includes(bot(v, "easy", rnd(s))), "연습도 닫을 칸은 닫는다");
  // 닫을 칸 없음 + 안전한 선 있음: 보통은 늘 안전한 선
  const h = create(2, 1, [3, 3]);
  h.lines[0] = 0; h.lines[3] = 1; // 칸 0 에 두 변(위·아래)
  const c2 = classify(view(h));
  assert.equal(c2.caps.length, 0);
  for (let s = 1; s <= 50; s++) assert.ok(c2.safe.includes(bot(view(h), "normal", rnd(s))), "보통이 세 번째 변을 줬다");
  // 연습은 20 % 는 아무 선(안전 밖 포함): 1×2 판에서 칸 0 위·아래 + 칸 1 위를 그어 두면 남은 넷 중 둘(세로 0·1)이 안전 밖 → 기대 20 % × 2/4 = 10 %
  const e = create(2, 1, [1, 2]), TE = topo(1, 2);
  for (const l of [0, 1, 2]) e.lines[l] = 0;
  const ce = classify(view(e));
  assert.deepEqual([ce.caps, ce.safe.sort(), ce.open.length], [[], [3, TE.NH + 2], 4]);
  let unsafe = 0;
  for (let s = 1; s <= 400; s++) if (!ce.safe.includes(bot(view(e), "easy", rnd(s)))) unsafe++;
  assert.ok(unsafe > 15 && unsafe < 75, `연습 봇의 안전 밖 선 ${unsafe}/400(기대 약 40)`);
  for (let s = 1; s <= 50; s++) assert.ok(ce.safe.includes(bot(view(e), "normal", rnd(s))), "보통은 같은 판에서 안전한 선만");
});

test("봇은 view 가 만든 판 사본만 읽는다 — 보기는 화면에 보이는 것(판·차례·점수)뿐이고 봇은 그 밖을 건드리지 않는다", () => {
  const KEYS = ["C", "R", "boxes", "lines", "n", "scores", "turn"];
  const g = playOut(2, 9, ["normal", "easy"]);
  const h = create(2, 9);
  for (let i = 0; i < 40; i++) play(h, g.log[i].l); // 끝판 가까이 — 사슬 다루기 갈래까지
  const v = view(h);
  assert.deepEqual(Object.keys(v).sort(), KEYS, "보기 열쇠가 늘었다 — 화면에 안 보이는 것을 봇에 넘기나");
  assert.notEqual(v.lines, h.lines, "보기의 선은 사본이어야 한다(봇이 판을 못 고친다)");
  assert.notEqual(v.boxes, h.boxes);
  const read = new Set<string>();
  const trap = new Proxy(v, { get(t, k) { read.add(String(k)); return Reflect.get(t, k); }, set() { throw new Error("봇이 보기를 고쳤다"); } }) as DotsView;
  for (const lv of ["easy", "normal"] as const) for (let s = 1; s <= 5; s++) bot(trap, lv, rnd(s));
  const outside = [...read].filter((k) => !KEYS.includes(k));
  assert.ok(read.size > 0, "덫이 아무것도 못 봤다 — 덫이 헛돈다");
  assert.deepEqual(outside, [], `봇이 보기 밖을 읽었다: ${outside}`);
});

test("균형(규격 2절): 2명 보통 봇이 연습 봇을 거의 다 이긴다 · 아무렇게나는 보통을 못 이긴다 · 판마다 「한 번 더」", () => {
  let normalWins = 0, againSum = 0;
  const N = 200;
  for (let s = 1; s <= N; s++) {
    const swap = s % 2 === 0;
    const g = playOut(2, s, swap ? ["easy", "normal"] : ["normal", "easy"]);
    const [nm, ez] = swap ? [g.scores[1], g.scores[0]] : [g.scores[0], g.scores[1]];
    if (nm > ez) normalWins++;
    againSum += g.log.filter((e) => e.c > 0).length;
  }
  assert.ok(normalWins / N > 0.85, `보통 단독 1등 ${normalWins}/${N}(규격 97 %)`);
  assert.ok(againSum / N > 10, `판당 닫기 ${againSum / N}`);
});
