// 실행: node --test "tests/lab/*.test.ts"
// 내기 모음 8 「5초 릴레이」 엔진(src/lab/party/relay.ts) — 규칙(라운드 과제 · 5초 창 · 과제 넷의 점수 · 일찍 끝 · 합계)과 봇.
// 규격 docs/lab-party-relay-spec.md 1절·3절. 숫자는 코드(RULES)가 정본이다 — 규격 숫자와 같은지는 따로 한 번 본다.
// 시안 원본(docs/lab-party-relay.js)과 같은 동작인지는 여기서 안 본다 — tmp/lab-party-port/equiv.mjs relay 가 잰다.
// 🔴 5초 창: 엔진 input(g, t) 가 t < 0 · t > 5 · NaN 을 버리는지 과제 넷마다 본다(화면의 두 번째 겹은 페이지 리그가 잰다).
import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, ITEMS, NAMES, BOT, create, begin, input, finish, advance, score, fixed, posAt, beatPts, bot, view, type RelayGame, type Kind, type LiveCh, type Challenge, type BotLevel } from "../../src/lab/party/relay.ts";

/** 봇 난수(시험용, 씨앗 고정) */
function rnd(seed: number): () => number {
  let s = (Math.imul(seed, 2654435761) >>> 0) || 1;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** 그 과제가 나오는 차례까지 판을 민다(빈 입력으로 끝내며) — 시작된 과제를 돌려준다 */
function startKind(kind: Kind, n = 2): { g: RelayGame; ch: LiveCh } {
  for (let seed = 1; seed < 200; seed++) {
    const g = create(n, seed);
    const r = g.kinds.indexOf(kind);
    if (r < 0) continue;
    while (g.round - 1 < r) { begin(g); finish(g); advance(g); }
    return { g, ch: begin(g) as LiveCh };
  }
  throw new Error("과제가 안 나온다 " + kind);
}
/** 봇끼리 끝까지 */
function playOut(n: number, seed: number, levels: BotLevel[]): RelayGame {
  const g = create(n, seed), r = rnd(seed);
  let guard = 0;
  while (g.state !== "over" && guard++ < 200) {
    begin(g);
    for (const x of bot(view(g), levels[g.turn], r)) input(g, x.t, x.cell);
    finish(g); advance(g);
  }
  return g;
}

test("수치가 규격 1절과 같다(라운드 8·6·4 · 연타 43 · 박자 0.8초부터 0.56–0.68 · TOL 0.17 · 멈춤 0.95–1.25 · 0.15 · 기억 6칸 5개 0.5초)", () => {
  assert.equal(RULES.DUR, 5);
  assert.deepEqual([RULES.ROUNDS[2], RULES.ROUNDS[3], RULES.ROUNDS[4]], [8, 6, 4]);
  assert.deepEqual(RULES.KINDS, ["taps", "beat", "stop", "memory"]);
  assert.equal(RULES.TAPS.CAP, 43);
  assert.deepEqual(RULES.BEAT, { FIRST: 0.8, PERIOD: [0.56, 0.68], TOL: 0.17, EXTRA: 0.5 });
  assert.deepEqual(RULES.STOP, { SPEED: [0.95, 1.25], CENTER: [0.22, 0.78], TOL: 0.15, MIN: 0.15 });
  assert.deepEqual(RULES.MEMORY, { CELLS: 6, LEN: 5, LEAD: 0.3, SHOW: 0.5 });
  assert.deepEqual(NAMES, { taps: "연타", beat: "박자", stop: "멈춰!", memory: "기억" });
  assert.equal(ITEMS.length, 6);
  for (const n of [2, 3, 4]) assert.equal(create(n, 1).rounds * n, { 2: 16, 3: 18, 4: 16 }[n], "차례 수 16 · 18 · 16");
  // 박자 6–8개(0.8초부터, 4.8초까지) · 기억 보여 주기 끝 2.8초
  for (let s = 1; s <= 300; s++) for (const row of create(2, s).plan) for (const c of row) {
    if (c.kind === "beat") { assert.ok(c.beats.length >= 6 && c.beats.length <= 8, `박자 ${c.beats.length}개`); assert.equal(c.beats[0], 0.8); assert.ok(c.beats[c.beats.length - 1] <= 4.8); }
    if (c.kind === "memory") { assert.equal(c.showEnd, 2.8); assert.equal(new Set(c.seq).size, 5); assert.deepEqual([...c.items].sort(), [0, 1, 2, 3, 4, 5]); }
    if (c.kind === "stop") { assert.ok(c.speed >= 0.95 && c.speed <= 1.25 && c.center >= 0.22 && c.center <= 0.78 && c.tol === 0.15); }
  }
});

test("라운드 과제(R1): 처음 네 라운드에 넷이 다 · 잇따라 같은 과제 없음 · 한 라운드는 모두 같은 과제, 값은 사람마다", () => {
  let differ = 0, rows = 0;
  for (let s = 1; s <= 500; s++) for (const n of [2, 3, 4]) {
    const g = create(n, s);
    assert.equal(g.kinds.length, g.rounds);
    assert.deepEqual([...g.kinds.slice(0, 4)].sort(), ["beat", "memory", "stop", "taps"], `씨앗 ${s} ${n}명 첫 넷 ${g.kinds}`);
    for (let k = 1; k < g.kinds.length; k++) assert.notEqual(g.kinds[k], g.kinds[k - 1], `씨앗 ${s} 잇따름 ${g.kinds}`);
    g.plan.forEach((row, r) => {
      assert.equal(row.length, n);
      assert.ok(row.every((c) => c.kind === g.kinds[r]));
      if (row[0].kind !== "taps") { rows++; if (new Set(row.map((c) => JSON.stringify(c))).size > 1) differ++; }
    });
  }
  assert.ok(differ / rows > 0.99, `값이 사람마다 다른 라운드 ${differ}/${rows}`);
});

test("🔴 5초 창: 과제 넷 모두 t < 0 · t > 5 · NaN 입력을 버리고 판을 안 바꾼다(5초 정각은 받는다)", () => {
  for (const kind of RULES.KINDS) {
    const { g, ch } = startKind(kind);
    const ok = ch.kind === "memory" ? ch.items.indexOf(ch.seq[0]) : null;
    const before = JSON.stringify(g);
    for (const t of [-0.001, -1, 5.0001, 5.2, 7, 60, NaN, Infinity, -Infinity]) assert.equal(input(g, t, ok), null, `${kind} t=${t} 을 받았다`);
    assert.equal(JSON.stringify(g), before, `${kind} 버린 입력이 판을 바꿨다`);
    assert.notEqual(input(g, 5, ok), null, `${kind} 5초 정각은 받는다`);
    assert.equal(g.ch!.inputs.length, 1);
    assert.equal(g.ch!.inputs[0].t, 5);
  }
  // 늦게 친 연타: 표를 모두 5초 뒤로 밀면 하나도 안 센다 · 반쯤 걸치면 5초 안 것만
  const { g, ch } = startKind("taps");
  const plan = Array.from({ length: 60 }, (_, k) => 3 + k * 0.05); // 3.00 … 5.95초
  for (const t of plan) input(g, t, null);
  assert.equal(ch.inputs.length, plan.filter((t) => t <= 5).length);
  assert.ok(ch.inputs.every((x) => x.t >= 0 && x.t <= 5));
  assert.equal(finish(g), Math.round((100 * plan.filter((t) => t <= 5).length) / 43));
});

test("상태 밖 부름: 시작 전·점수 뒤·판 끝엔 input·finish·advance·begin 이 아무것도 안 한다", () => {
  const g = create(2, 3);
  assert.equal(input(g, 1, 0), null);
  assert.equal(finish(g), null);
  assert.equal(advance(g), false);
  begin(g);
  assert.equal(begin(g), null, "두 번 시작");
  finish(g);
  assert.equal(input(g, 1, 0), null, "점수 뒤 입력");
  assert.equal(finish(g), null);
  const done = playOut(2, 5, ["normal", "normal"]);
  const snap = JSON.stringify(done);
  assert.equal(begin(done), null); assert.equal(input(done, 1, 0), null); assert.equal(advance(done), false);
  assert.equal(JSON.stringify(done), snap);
  assert.deepEqual([done.state, done.round, done.turn, done.log.length], ["over", done.rounds, 0, 1]);
});

test("연타: 누른 수 / 43 × 100 (43번 이상 100) · 26번 60", () => {
  const ch: Challenge = { kind: "taps", cap: 43 };
  const at = (n: number) => Array.from({ length: n }, (_, k) => ({ t: k * 0.1, cell: null }));
  assert.deepEqual([0, 1, 26, 43, 60].map((n) => score(ch, at(n))), [0, 2, 60, 100, 100]);
  assert.equal(fixed(ch, at(60)), false, "연타는 일찍 안 끝난다");
  const { g } = startKind("taps");
  assert.deepEqual(input(g, 0.2, null), { n: 1 });
  assert.deepEqual(input(g, 0.3, null), { n: 2 });
});

test("박자: 딱 맞으면 100 · 0.085초 어긋나면 50 · TOL 밖 0 · 남는 누름은 박자 반 개씩 깎임 · 마구 누르기 0", () => {
  const ch: Challenge = { kind: "beat", period: 0.6, beats: [0.8, 1.4, 2, 2.6, 3.2, 3.8, 4.4] };
  const on = (d: number) => ch.beats.map((b) => ({ t: b + d, cell: null }));
  assert.equal(score(ch, on(0)), 100);
  assert.equal(score(ch, on(0.085)), 50);
  assert.equal(score(ch, on(-0.17)), 0);
  assert.equal(score(ch, []), 0);
  // 박자 하나에 두 번 → 남는 누름 하나: (7 − 0.5) / 7
  assert.equal(score(ch, [...on(0), { t: 0.82, cell: null }]), Math.round((100 * 6.5) / 7));
  const mash = Array.from({ length: 35 }, (_, k) => ({ t: k / 7, cell: null }));
  assert.equal(score(ch, mash), 0);
  assert.deepEqual([beatPts(0), beatPts(0.085), beatPts(-0.17), beatPts(0.3)], [1, 0.5, 0, 0]);
  const { g, ch: live } = startKind("beat");
  const r = input(g, live.kind === "beat" ? live.beats[1] + 0.02 : 0, null) as { e: number; p: number; beat: number };
  assert.equal(r.beat, 1); assert.equal(r.e, 0.02);
});

test("멈춰!(R6): 가운데면 100 · TOL 만큼 벗어나면 0 · 0.15초 전 누름은 안 받음 · 한 번 누르면 끝", () => {
  const ch = { kind: "stop" as const, x0: 0.5, dir: 1, speed: 1, center: 0.5, tol: 0.15 };
  assert.equal(score(ch, [{ t: 0, cell: null }]), 100);
  assert.equal(score(ch, [{ t: 0.075, cell: null }]), 50);
  assert.equal(score(ch, [{ t: 0.15, cell: null }]), 0);
  assert.equal(score(ch, []), 0);
  // 바늘은 끝에서 튕긴다
  assert.deepEqual([0, 0.25, 0.5, 0.75, 1, 1.5, 2.5].map((t) => +posAt(ch, t).toFixed(3)), [0.5, 0.75, 1, 0.75, 0.5, 0, 1]);
  assert.equal(+posAt({ x0: 0.2, dir: -1, speed: 1 }, 0.5).toFixed(3), 0.3, "왼쪽으로 가다 0 에서 튕김");
  const { g, ch: live } = startKind("stop");
  assert.equal(input(g, 0.1, null), null, "0.15초 전");
  const r = input(g, 1, null) as { x: number; score: number; done: boolean };
  assert.equal(r.done, true);
  assert.equal(r.score, score(live, live.inputs));
  assert.equal(fixed(live, live.inputs), true);
  assert.equal(input(g, 1.5, null), null, "두 번째 누름");
  assert.equal(live.inputs.length, 1);
});

test("기억: 보여 주는 동안(2.8초 전)·칸 밖은 안 받음 · 다 맞히면 100 · 틀리면 거기서 끝(맞힌 앞부분 / 5)", () => {
  const { g, ch } = startKind("memory");
  if (ch.kind !== "memory") throw new Error();
  const cellOf = (k: number) => ch.items.indexOf(ch.seq[k]);
  assert.equal(input(g, 2.79, cellOf(0)), null, "보여 주는 중");
  assert.equal(input(g, 3, -1), null); assert.equal(input(g, 3, 6), null); assert.equal(input(g, 3, 0.5 + 6), null);
  // (칸 null 은 엔진이 0 번 칸처럼 받는다 — 화면은 기억 칸에 늘 번호를 준다. 원본 그대로라 여기서 막지 않는다)
  assert.deepEqual(input(g, 3, cellOf(0)), { ok: true, k: 0, done: false });
  assert.deepEqual(input(g, 3.3, cellOf(1)), { ok: true, k: 1, done: false });
  const wrong = (cellOf(2) + 1) % 6;
  assert.deepEqual(input(g, 3.6, wrong), { ok: false, k: 2, done: true });
  assert.equal(fixed(ch, ch.inputs), true);
  assert.equal(input(g, 3.9, cellOf(2)), null, "틀린 뒤");
  assert.equal(finish(g), 40);
  const all = ch.seq.map((_, k) => ({ t: 3 + k * 0.3, cell: cellOf(k) }));
  assert.equal(score(ch, all), 100);
  assert.equal(fixed(ch, all), true);
  assert.equal(fixed(ch, all.slice(0, 4)), false);
});

test("끝까지 도는 판: 2/3/4명 봇끼리 차례 16·18·16 · 합계 = 차례 점수 합 · 점수 0–100 · 받은 입력은 모두 0–5초", () => {
  for (const n of [2, 3, 4]) for (let s = 1; s <= 60; s++) {
    const levels: BotLevel[] = Array.from({ length: n }, (_, k) => ((k + s) % 2 ? "easy" : "normal"));
    const g = create(n, s), r = rnd(s), seen: number[] = [];
    while (g.state !== "over") {
      const ch = begin(g) as LiveCh;
      for (const x of bot(view(g), levels[g.turn], r)) input(g, x.t, x.cell);
      assert.ok(ch.inputs.every((x) => x.t >= 0 && x.t <= 5));
      seen.push(...ch.inputs.map((x) => x.t));
      finish(g); advance(g);
    }
    assert.equal(g.results.length, { 2: 16, 3: 18, 4: 16 }[n]);
    const per = Array(n).fill(0); g.results.forEach((x) => (per[x.i] += x.score));
    assert.deepEqual(per, g.totals);
    assert.ok(g.results.every((x) => x.score >= 0 && x.score <= 100 && Number.isInteger(x.score)));
    assert.deepEqual(g.log, [{ totals: g.totals }]);
    // 차례 순서: 라운드마다 0..n-1
    assert.deepEqual(g.results.map((x) => x.i), Array.from({ length: g.rounds * n }, (_, k) => k % n));
  }
});

test("봇은 보기만 읽는다: view = 지금 과제 값(inputs 없음, 다음 과제·남의 입력 없음) · Proxy 덫으로 보기 밖을 안 읽음", () => {
  const KEYS: Record<Kind, string[]> = { taps: ["kind", "cap"], beat: ["kind", "period", "beats"], stop: ["kind", "x0", "dir", "speed", "center", "tol"], memory: ["kind", "seq", "items", "lead", "show", "showEnd"] };
  const read = new Set<string>();
  for (const kind of RULES.KINDS) {
    const { g, ch } = startKind(kind);
    input(g, 3, ch.kind === "memory" ? ch.items.indexOf(ch.seq[0]) : null);
    const v = view(g);
    assert.deepEqual(Object.keys(v), KEYS[kind], `${kind} 보기 열쇠`);
    const { inputs, ...vals } = ch; void inputs;
    assert.deepEqual(v, vals, "보기 = 지금 과제 값");
    v.kind === "beat" && v.beats.push(99); // 보기를 고쳐도 판이 안 바뀐다(복사본)
    assert.ok(ch.kind !== "beat" || !ch.beats.includes(99));
    const trap = new Proxy(view(g), { get(t, k) { read.add(kind + "." + String(k)); return Reflect.get(t, k); }, set() { throw new Error("봇이 보기를 고쳤다"); } }) as Challenge;
    for (const lv of ["easy", "normal"] as const) for (let s = 1; s <= 5; s++) bot(trap, lv, rnd(s));
  }
  assert.ok(read.size > 0, "덫이 아무것도 못 봤다 — 덫이 헛돈다");
  const outside = [...read].filter((k) => { const [kind, key] = k.split("."); return !KEYS[kind as Kind].includes(key); });
  assert.deepEqual(outside, [], `봇이 보기 밖을 읽었다: ${outside}`);
});

test("봇 표: 0초 이후 · 시각 순서(5초 넘는 박자 누름은 엔진이 버린다) · 완벽 아님(연타·박자 100점 0) · 보통이 과제마다 연습보다 높다", () => {
  const sum: Record<string, number[]> = {};
  let full = 0, over5 = 0, over5Dropped = 0;
  for (let s = 1; s <= 400; s++) {
    const g = create(4, s);
    for (const row of g.plan) for (const c of row) for (const lv of ["easy", "normal"] as const) {
      const plan = bot(c, lv, rnd(s * 13 + c.kind.length + (lv === "easy" ? 0 : 7)));
      assert.ok(plan.every((x, k) => x.t >= 0 && (k === 0 || plan[k - 1].t <= x.t)), `${c.kind} ${lv} 표가 0초 전·순서 어긋남`);
      if (c.kind !== "beat") assert.ok(plan.every((x) => x.t <= 5), `${c.kind} ${lv} 표가 5초 밖`);
      // 엔진에 넣어 받은 것만으로 점수(화면과 같은 길)
      const g1 = create(1, 1); g1.plan = [[c]]; g1.rounds = 1; begin(g1);
      for (const x of plan) { const got = input(g1, x.t, x.cell); if (x.t > 5) { over5++; if (got === null) over5Dropped++; } }
      const sc = finish(g1) as number;
      (sum[c.kind + ":" + lv] = sum[c.kind + ":" + lv] || []).push(sc);
      if ((c.kind === "taps" || c.kind === "beat") && sc === 100) full++;
    }
  }
  assert.equal(full, 0, "연타·박자 100점이 나왔다");
  assert.ok(over5 > 0 && over5Dropped === over5, `봇 표의 5초 넘는 누름 ${over5}개 중 엔진이 버린 것 ${over5Dropped}`);
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  for (const k of RULES.KINDS) assert.ok(mean(sum[k + ":normal"]) > mean(sum[k + ":easy"]), `${k} 보통 ${mean(sum[k + ":normal"]).toFixed(1)} ≤ 연습 ${mean(sum[k + ":easy"]).toFixed(1)}`);
  assert.deepEqual(Object.keys(BOT), ["easy", "normal"]);
  assert.deepEqual(bot({ kind: "taps", cap: 43 }, "zzz", rnd(1)), bot({ kind: "taps", cap: 43 }, "normal", rnd(1)), "모르는 세기는 보통");
});

test("균형(규격 2절): 2명 보통 봇이 연습 봇을 거의 다 이긴다(시뮬 89 %)", () => {
  let normalWins = 0;
  const N = 300;
  for (let s = 1; s <= N; s++) {
    const swap = s % 2 === 0;
    const g = playOut(2, s, swap ? ["easy", "normal"] : ["normal", "easy"]);
    const [a, b] = swap ? [g.totals[1], g.totals[0]] : g.totals;
    if (a > b) normalWins++;
  }
  assert.ok(normalWins / N >= 0.8 && normalWins / N <= 0.97, `보통 승률 ${(normalWins / N).toFixed(2)}`);
});
