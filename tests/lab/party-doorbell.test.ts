// 실행: node --test "tests/lab/*.test.ts"
// 내기 모음 1 「초인종 폭탄」 엔진(src/lab/party/doorbell.ts) — 규칙(일 세 가지 · 틀리면 잠김 · 넘김 · 숨은 시간 · 판 수 · 당번)과 봇.
// 규격 docs/lab-party-doorbell-spec.md 1절·3절. 숫자는 코드(RULES)가 정본이다 — 규격 숫자와 같은지는 따로 한 번 본다.
// 시안 원본(docs/lab-party-doorbell.js)과 같은 동작인지는 여기서 안 본다 — tmp/lab-party-port/equiv.mjs doorbell 이 잰다.
// 봇 검사: 봇은 view(g) 가 만든 보기(화면에 보이는 일)만 받는다 — 숨은 시간 fuse·t 는 보기에 없고, 봇이 보기 밖을 읽으면 빨강.
import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, ITEMS, create, startRound, press, pass, step, bot, view, type DoorbellGame, type Task } from "../../src/lab/party/doorbell.ts";

/** 맞는 칸(봇 답과 따로 — 손으로 푼다) */
function right(t: Task): number {
  if (t.kind === "taps") return 0;
  if (t.kind === "find") return t.items.indexOf(t.target);
  return t.cells.indexOf(t.done + 1);
}
function seqRng(seed: number) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 2 ** 32; }; }

/** 봇끼리 끝까지: 든 사람은 봇 계획의 delay 만큼 기다렸다 누르고, 넘김은 받는 데 hand 초(사람이 폰을 받는 시간 어림) */
function playOut(n: number, seed: number, levels: string[], hand = 1): DoorbellGame {
  const g = create(n, seed), r = seqRng(seed * 13 + 7);
  const DT = 0.02;
  let guard = 0;
  while (g.state !== "over" && guard++ < 1e7) {
    startRound(g);
    let wait = hand, plan = null as null | { cell: number; delay: number };
    while ((g.state === "hold" || g.state === "pass") && guard++ < 1e7) {
      if (g.state === "pass" && wait <= 0) { pass(g); wait = hand; plan = null; }
      if (g.state === "hold" && wait <= 0) {
        if (!plan) plan = bot(view(g)!, levels[g.holder], r);
        plan.delay -= DT;
        if (plan.delay <= 0 && g.lock === 0) { press(g, plan.cell); plan = null; }
      }
      wait -= DT;
      step(g, DT);
    }
  }
  return g;
}

test("수치가 규격 1절과 같다(판 2명 5 · 3명 4 · 4명 4 · 숨은 시간 9–20 · 11–24 · 13–28 · 잠김 0.8초) · 간식 여섯", () => {
  assert.deepEqual([RULES.ROUNDS[2], RULES.ROUNDS[3], RULES.ROUNDS[4]], [5, 4, 4]);
  assert.deepEqual([RULES.FUSE[2], RULES.FUSE[3], RULES.FUSE[4]], [[9, 20], [11, 24], [13, 28]]);
  assert.equal(RULES.LOCK, 0.8);
  assert.deepEqual(ITEMS, ["개껌", "사과", "상추", "쿠키", "고기", "치즈"]);
  for (const n of [2, 3, 4]) {
    const g = create(n, 1);
    assert.deepEqual([g.rounds, g.round, g.state, g.losses, g.task], [RULES.ROUNDS[n], 0, "ready", Array(n).fill(0), null]);
  }
});

test("새 판: 숨은 시간은 사람 수 범위 안 · 첫 판은 아무나, 다음 판은 방금 당번이 먼저 · 판 중엔 새 판 거절", () => {
  const firsts = new Set<number>();
  for (let s = 1; s <= 200; s++) for (const n of [2, 3, 4]) {
    const g = create(n, s);
    assert.equal(startRound(g), true);
    const [a, b] = RULES.FUSE[n];
    assert.ok(g.fuse >= a && g.fuse < b, `fuse ${g.fuse}`);
    assert.deepEqual([g.round, g.state, g.t, g.passes], [1, "hold", 0, 0]);
    assert.ok(g.task && ["taps", "find", "order"].includes(g.task.kind));
    if (n === 4) firsts.add(g.holder);
    assert.equal(startRound(g), false, "들고 있는 동안 새 판");
  }
  assert.deepEqual([...firsts].sort(), [0, 1, 2, 3], "첫 판 든 사람이 고루 나와야");
  const g = create(3, 9);
  startRound(g);
  while (!step(g, 0.5));
  const loser = g.log[0].holder;
  startRound(g);
  assert.equal(g.holder, loser, "다음 판은 방금 당번이 든다(엔진은 holder 를 그대로 둔다)");
});

test("일 셋: 누르기는 need 번 · 찾기는 같은 간식 한 번 · 차례는 1→4 — 다 하면 pass", () => {
  const kinds = new Set<string>();
  for (let s = 1; s <= 60; s++) {
    const g = create(2, s);
    startRound(g);
    const t = g.task!;
    kinds.add(t.kind);
    if (t.kind === "taps") assert.ok(t.need >= 3 && t.need <= 5);
    if (t.kind === "find") { assert.equal(t.items.length, 4); assert.equal(new Set(t.items).size, 4); assert.ok(t.items.includes(t.target)); }
    if (t.kind === "order") assert.deepEqual([...t.cells].sort(), [1, 2, 3, 4]);
    for (let i = 0; i < t.need - 1; i++) assert.deepEqual(press(g, right(g.task!)), { ok: true, done: false });
    assert.deepEqual(press(g, right(g.task!)), { ok: true, done: true });
    assert.equal(g.state, "pass");
    assert.equal(press(g, 0), null, "넘기는 사이엔 누름을 안 받는다");
  }
  assert.deepEqual([...kinds].sort(), ["find", "order", "taps"]);
});

test("틀리면 0.8초 잠김(그동안 누름 null, 진행 그대로) · 잠김은 step 으로만 풀린다", () => {
  let g: DoorbellGame;
  let s = 1;
  do { g = create(2, s++); startRound(g); } while (g.task!.kind !== "order");
  const t = g.task as Extract<Task, { kind: "order" }>;
  const wrong = t.cells.indexOf(3);
  assert.deepEqual(press(g, wrong), { ok: false });
  assert.deepEqual([g.lock, t.done, g.state], [0.8, 0, "hold"]);
  assert.equal(press(g, right(t)), null, "잠긴 동안");
  step(g, 0.5);
  assert.equal(press(g, right(t)), null, "0.5초 뒤에도 잠김");
  step(g, 0.31);
  assert.equal(g.lock, 0);
  assert.deepEqual(press(g, right(t)), { ok: true, done: false });
});

test("넘김: pass 상태에서만 · 다음 사람(한 바퀴 돌아옴) · 새 일 · 넘김 수 +1", () => {
  const g = create(3, 4);
  startRound(g);
  assert.equal(pass(g), false, "일을 안 끝내고 넘김");
  const h0 = g.holder;
  for (let k = 1; k <= 6; k++) {
    while (g.state === "hold") press(g, right(g.task!));
    assert.equal(pass(g), true);
    assert.deepEqual([g.holder, g.passes, g.state, g.task!.done], [(h0 + k) % 3, k, "hold", 0]);
  }
});

test("숨은 시간이 다 되면 울림: 든 사람 당번 +1 · 넘기는 사이(덮개) 울리면 받는 사람([결정] B3) · pass 를 아직 안 불렀으면 든 사람 · 마지막 판이면 over", () => {
  // 화면은 일이 끝나는 순간 pass 를 부르고 덮개를 띄운다 — 그 사이 울리면 이미 받는 사람 것
  const h = create(3, 3);
  startRound(h);
  const giver = h.holder;
  while (h.state === "hold") press(h, right(h.task!));
  pass(h);
  assert.deepEqual(step(h, h.fuse), { rang: (giver + 1) % 3 }, "넘기는 사이 울림 — 받는 사람이 당번");
  const g = create(2, 3);
  startRound(g);
  const fuse = g.fuse, who = g.holder;
  assert.equal(step(g, fuse - 0.01), null);
  while (g.state === "hold") press(g, right(g.task!));
  assert.equal(g.state, "pass");
  assert.deepEqual(step(g, 0.02), { rang: who }, "pass 전 울림 — 아직 넘기지 않았으니 든 사람");
  assert.deepEqual([g.state, g.losses[who], g.log.length, g.log[0].holder], ["rang", 1, 1, who]);
  assert.equal(step(g, 1), null, "울린 뒤엔 시계가 안 돈다");
  assert.equal(pass(g), false, "울린 뒤 넘김");
  for (let r = 2; r <= g.rounds; r++) { startRound(g); while (!step(g, 0.3)); }
  assert.equal(g.state, "over");
  assert.equal(startRound(g), false);
  assert.equal(g.losses.reduce((a, b) => a + b, 0), g.rounds);
});

test("끝까지 도는 판(봇끼리 2/3/4명): 울림 수 = 판 수 = 당번 합 · 판마다 넘김이 있다 · 같은 씨앗은 같은 판", () => {
  for (const n of [2, 3, 4]) for (let s = 1; s <= 20; s++) {
    const g = playOut(n, s * n, Array(n).fill("normal"));
    assert.equal(g.state, "over");
    assert.equal(g.log.length, RULES.ROUNDS[n], `${n}명 울림 수`);
    assert.equal(g.losses.reduce((a, b) => a + b, 0), RULES.ROUNDS[n], `${n}명 당번 합`);
    assert.deepEqual(g.log.map((e) => e.round), Array.from({ length: RULES.ROUNDS[n] }, (_, i) => i + 1));
    assert.ok(g.log.every((e) => e.passes > 0), "넘김 0 인 판");
  }
  const a = playOut(3, 42, ["easy", "normal", "easy"]), b = playOut(3, 42, ["easy", "normal", "easy"]);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.ok(!("r" in JSON.parse(JSON.stringify(a))), "난수 함수가 저장 JSON 에 섞였다");
});

test("봇: 맞는 칸을 고르고 delay 는 세기 범위 안 · 헛누름은 연습 > 보통, 누르기(taps)는 헛누름 없음", () => {
  const r = seqRng(5);
  const miss = { easy: 0, normal: 0 }, N = 20000;
  for (let i = 0; i < N; i++) for (const lv of ["easy", "normal"] as const) {
    const items = [0, 1, 2, 3, 4, 5].sort(() => r() - 0.5).slice(0, 4);
    const t: Task = i % 2 ? { kind: "find", items, target: items[i % 4], done: 0, need: 1 } : { kind: "order", cells: [1, 2, 3, 4].sort(() => r() - 0.5), done: i % 4, need: 4 };
    const p = bot(t, lv, r);
    const [a, b] = lv === "easy" ? [0.45, 0.75] : [0.26, 0.42];
    assert.ok(p.delay >= a && p.delay < b);
    assert.ok(p.cell >= 0 && p.cell < 4);
    if (p.cell !== right(t)) miss[lv]++;
  }
  assert.ok(Math.abs(miss.easy / N - 0.12) < 0.015, `연습 헛누름 ${miss.easy / N}`);
  assert.ok(Math.abs(miss.normal / N - 0.04) < 0.01, `보통 헛누름 ${miss.normal / N}`);
  for (let i = 0; i < 200; i++) assert.equal(bot({ kind: "taps", need: 4, done: i % 4 }, "easy", r).cell, 0);
  assert.equal(bot({ kind: "taps", need: 3, done: 0 }, "weird", () => 0).delay, 0.26, "모르는 세기는 보통");
});

test("봇은 view 가 만든 보기만 읽는다 — 보기는 화면에 보이는 일뿐(숨은 시간 fuse·t 없음), 봇은 그 밖을 건드리지 않는다", () => {
  const SEEN = { taps: ["done", "kind", "need"], find: ["done", "items", "kind", "need", "target"], order: ["cells", "done", "kind", "need"] };
  const read = new Set<string>();
  const kinds = new Set<string>();
  for (let s = 1; s <= 40; s++) {
    const g = create(3, s);
    assert.equal(view(g), null, "판 전엔 보기 없음");
    startRound(g);
    const v = view(g)!;
    kinds.add(v.kind);
    assert.deepEqual(Object.keys(v).sort(), SEEN[v.kind], "보기 열쇠가 늘었다 — 화면에 안 보이는 것을 봇에 넘기나");
    for (const k of ["fuse", "t", "seed", "losses", "holder"]) assert.ok(!(k in v), `보기에 ${k}`);
    assert.notEqual(v, g.task, "보기는 사본이어야 한다(봇이 판을 못 고친다)");
    // 숨은 시간을 바꿔도 보기는 같다
    const before = JSON.stringify(v);
    g.fuse = 1; g.t = 0.9;
    assert.equal(JSON.stringify(view(g)), before);
    const trap = new Proxy(v, { get(t, k) { read.add(`${t.kind}.${String(k)}`); return Reflect.get(t, k); }, set() { throw new Error("봇이 보기를 고쳤다"); } }) as Task;
    for (const lv of ["easy", "normal"]) bot(trap, lv, Math.random);
  }
  assert.deepEqual([...kinds].sort(), ["find", "order", "taps"]);
  assert.ok(read.size > 0, "덫이 아무것도 못 봤다 — 덫이 헛돈다");
  const outside = [...read].filter((x) => { const [k, f] = x.split("."); return !(SEEN as Record<string, string[]>)[k].includes(f); });
  assert.deepEqual(outside, [], `봇이 보기 밖을 읽었다: ${outside}`);
});

test("균형(규격 3절): 2명 맞붙기에서 보통 봇이 연습 봇보다 당번이 적은 쪽이 많다 · 자리 공정(보통끼리 자리별 당번 비율 고루)", () => {
  let normalBetter = 0, ties = 0;
  const N = 200;
  for (let s = 1; s <= N; s++) {
    const swap = s % 2 === 0;
    const g = playOut(2, s, swap ? ["easy", "normal"] : ["normal", "easy"]);
    const [nm, ez] = swap ? [g.losses[1], g.losses[0]] : [g.losses[0], g.losses[1]];
    if (nm < ez) normalBetter++;
    else if (nm === ez) ties++;
  }
  const rate = normalBetter / (N - ties);
  assert.ok(rate > 0.55, `보통 우세 ${rate.toFixed(2)}`);
  const seat = [0, 0, 0];
  for (let s = 1; s <= 300; s++) playOut(3, s, ["normal", "normal", "normal"]).losses.forEach((v, i) => (seat[i] += v));
  const tot = seat.reduce((a, b) => a + b, 0);
  for (const v of seat) assert.ok(Math.abs(v / tot - 1 / 3) < 0.05, `자리 비율 ${seat.map((x) => (x / tot).toFixed(2))}`);
});
