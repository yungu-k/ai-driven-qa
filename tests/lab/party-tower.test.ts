// 실행: node --test "tests/lab/*.test.ts"
// 내기 모음 4 「흔들 탑 쌓기」 엔진(src/lab/party/tower.ts) — 규칙(흔들림 · 놓기 · 9초 저절로 · 와르르는 마지막에 놓은 사람 · 판 수 · 다음 판 첫 사람 · 높이로 꼴찌 가르기)과 봇.
// 규격 docs/lab-party-tower-spec.md 1절·3절. 숫자는 코드(RULES)가 정본이다 — 규격 숫자와 같은지는 따로 한 번 본다.
// 시안 원본(docs/lab-party-tower.js)과 같은 동작(물리 부동소수까지)인지는 여기서 안 본다 — tmp/lab-party-port/equiv.mjs tower 가 틱마다 잰다.
// 봇 검사: 봇은 view(g) 가 만든 보기(화면에 보이는 것)만 받는다 — 씨앗·난수 상태·접촉 기록은 보기에 없고, 봇이 보기 밖을 읽으면 빨강.
import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, PIECES, DT, create, startRound, beginTurn, drop, step, settle, endTurn, aimX, towerTop, finalScores, unpack, view, bot, type TowerGame, type TurnResult } from "../../src/lab/party/tower.ts";

function seqRng(seed: number) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 2 ** 32; }; }
/** 흔들림 한 바퀴 안에서 x 에 가장 가까운 틱 */
function tickAt(g: TowerGame, x: number): number {
  let best = 0, bd = 1e9;
  for (let t = 0; t < g.piece!.swing.period; t++) { const d = Math.abs(aimX(g, t) - x); if (d < bd) { bd = d; best = t; } }
  return best;
}
type Rec = { by: number; res: TurnResult; before: number[]; after: number[]; owners: number[] };
/** 봇끼리 끝까지(화면 순서 그대로: startRound → beginTurn → drop → settle → endTurn). 판정마다 기록 */
function playOut(n: number, seed: number, levels: string[], recs?: Rec[]): TowerGame {
  const g = create(n, seed), r = seqRng(seed * 13 + 7);
  let guard = 0;
  while (g.state !== "over" && guard++ < 5000) {
    startRound(g);
    while (g.state === "turn" && guard++ < 5000) {
      beginTurn(g);
      const by = g.turn;
      drop(g, bot(view(g), levels[by], r, 0).tick);
      const res = settle(g)!;
      const owners = res.fell.map((id) => g.bodies.find((b) => b.id === id)!.owner);
      const before = [...g.losses];
      endTurn(g);
      recs?.push({ by, res, before, after: [...g.losses], owners });
    }
  }
  return g;
}

test("수치가 규격 1절과 같다(판 7·6·6 · 상 2.6 m · 떨어짐 −0.12 · 흔들림 ±1.6 · 왕복 3.6 → 0.08 씩 → 2.2초 · 0.25 m 위 · 9초 저절로 · 멈춤 0.05/0.12/0.4초 · 최대 7초) · 물건 일곱과 뽑힐 무게", () => {
  assert.deepEqual([RULES.ROUNDS[2], RULES.ROUNDS[3], RULES.ROUNDS[4]], [7, 6, 6]);
  assert.deepEqual([RULES.BASE_W, RULES.FLOOR_Y, RULES.FELL_Y, RULES.SWING_A, RULES.CLEAR], [2.6, -1, -0.12, 1.6, 0.25]);
  assert.deepEqual([RULES.PERIOD0, RULES.PERIOD_STEP, RULES.PERIOD_MIN], [3.6, 0.08, 2.2]);
  assert.equal(DT, 1 / 60);
  assert.equal(RULES.AIM_CAP * DT, 9, "9초에 저절로");
  assert.deepEqual([RULES.SETTLE_V, RULES.SETTLE_W, RULES.SETTLE_TICKS * DT, RULES.SETTLE_CAP * DT], [0.05, 0.12, 0.4, 7]);
  assert.deepEqual(PIECES.map((p) => [p.kind, p.w]), [["cookie", 3], ["bone", 3], ["cushion", 3], ["box", 3], ["bowl", 2], ["ball", 1], ["cheese", 1]]);
  assert.equal(PIECES.find((p) => p.kind === "ball")!.v.length, 12, "공은 12각");
  for (const n of [2, 3, 4]) {
    const g = create(n, 1);
    assert.deepEqual([g.rounds, g.round, g.state, g.losses, g.hpts, g.piece], [RULES.ROUNDS[n], 0, "ready", Array(n).fill(0), Array(n).fill(0), null]);
  }
});

test("흔들림: 폭 ±1.6 · 왕복은 쌓은 수마다 0.08초 빨라져 2.2초에서 멈춤 · 매달린 물건 바닥은 탑 꼭대기 0.25 m 위", () => {
  const g = create(2, 5);
  startRound(g);
  beginTurn(g);
  assert.equal(g.piece!.swing.period, Math.round(3.6 / DT));
  let mx = 0; for (let t = 0; t < 400; t++) mx = Math.max(mx, Math.abs(aimX(g, t)));
  assert.ok(mx <= 1.6 && mx > 1.59, `흔들림 폭 ${mx}`);
  const P = PIECES.find((p) => p.kind === g.piece!.kind)!;
  assert.ok(Math.abs(g.piece!.y + Math.min(...P.v.map((v) => v[1])) - 0.25) < 1e-12, "빈 상 위 0.25 m");
  g.stack = 30; g.state = "turn"; beginTurn(g);
  assert.equal(g.piece!.swing.period, Math.round(2.2 / DT), "2.2초 아래로는 안 빨라진다");
  g.stack = 5; g.state = "turn"; beginTurn(g);
  assert.equal(g.piece!.swing.period, Math.round((3.6 - 0.4) / DT));
});

test("놓기: aim 에서만 · 틱은 정수로 내림 · 9초(540 틱) 넘기면 거기서 저절로 · 음수는 0 · 틀린 때 부름은 거절", () => {
  const g = create(2, 3);
  assert.equal(drop(g, 10), false, "판 전");
  startRound(g);
  assert.equal(drop(g, 10), false, "차례 시작 전(turn)");
  assert.equal(endTurn(g), false);
  beginTurn(g);
  assert.equal(beginTurn(g), false, "겨누는 중에 또 차례 시작");
  assert.equal(drop(g, 1e6), true);
  assert.equal(g.dropTick, RULES.AIM_CAP, "9초 뒤 저절로 — 큰 틱은 540 으로");
  const id = g.drop!;
  const b = g.bodies.find((x) => x.id === id)!;
  assert.equal(b.owner, g.turn, "놓은 물건의 주인 = 차례 사람");
  assert.equal(drop(g, 3), false, "떨어지는 중 또 놓기");
  assert.equal(endTurn(g), false, "판정 전 끝내기");
  const h = create(2, 3); startRound(h); beginTurn(h);
  drop(h, -5); assert.equal(h.dropTick, 0);
  const k = create(2, 3); startRound(k); beginTurn(k);
  drop(k, 12.9); assert.equal(k.dropTick, 12);
});

test("가운데에 놓으면 버틴다: 판정 멈춤 · 속도 0 으로 세움 · 쌓은 수 +1 · 높이 점수 = 탑 높이 10 cm 단위 · 다음 사람 차례", () => {
  const g = create(3, 7);
  startRound(g);
  const first = g.turn;
  beginTurn(g);
  drop(g, tickAt(g, 0));
  const r = settle(g)!;
  assert.equal(r.lost, false);
  assert.equal(g.state, "done");
  assert.ok(g.bodies.filter((b) => !b.st).every((b) => b.vx === 0 && b.vy === 0 && b.w === 0), "버틴 탑은 세워 둔다");
  assert.equal(step(g), null, "판정 뒤 step 은 판정을 다시 내지 않는다");
  const top = towerTop(g);
  endTurn(g);
  assert.deepEqual([g.stack, g.placed[first], g.hpts[first], g.turn, g.state, g.losses], [1, 1, Math.round(top * 10), (first + 1) % 3, "turn", [0, 0, 0]]);
});

test("와르르는 마지막에 놓은 사람만: 상 밖으로 헛놓으면 그 사람 +1 · 남의 물건이 떨어져도 놓은 사람 · 판 끝(roundEnd) · 다음 판 첫 사람 = 방금 와르르", () => {
  // 손으로: 둘이 가운데 하나씩 쌓고, 셋째(0번 사람 차례가 다시 옴)가 상 밖 +1.6 에서 놓는다
  const g = create(2, 11);
  startRound(g);
  for (let k = 0; k < 2; k++) { beginTurn(g); drop(g, tickAt(g, 0)); assert.equal(settle(g)!.lost, false); endTurn(g); }
  const dropper = g.turn;
  beginTurn(g);
  drop(g, tickAt(g, 1.6));
  const r = settle(g)!;
  assert.equal(r.lost, true);
  assert.equal(r.by, dropper);
  endTurn(g);
  assert.deepEqual(g.losses, dropper === 0 ? [1, 0] : [0, 1], "놓은 사람만 +1");
  assert.equal(g.state, "roundEnd");
  startRound(g);
  assert.deepEqual([g.round, g.turn, g.starter, g.stack, g.bodies.length], [2, dropper, dropper, 0, 2], "탑을 치우고 방금 와르르 한 사람이 먼저");
  // 많은 판: 와르르마다 losses 가 by 한 사람만 +1, 그리고 남의 물건이 떨어진 와르르도 놓은 사람에게
  let others = 0, lost = 0;
  for (const n of [2, 3, 4]) for (let s = 1; s <= 16; s++) {
    const recs: Rec[] = [];
    playOut(n, s * 7 + n, Array(n).fill(s % 2 ? "easy" : "normal"), recs);
    for (const e of recs) {
      const d = e.after.map((v, i) => v - e.before[i]);
      if (!e.res.lost) { assert.ok(d.every((v) => v === 0), "버틴 차례에 와르르가 늘었다"); continue; }
      lost++;
      assert.equal(e.res.by, e.by);
      assert.deepEqual(d, Array.from({ length: n }, (_, i) => (i === e.by ? 1 : 0)), "와르르는 마지막에 놓은 사람에게만");
      if (e.owners.some((o) => o !== e.by)) others++;
    }
  }
  assert.ok(lost > 60, `와르르 ${lost}`);
  assert.ok(others > 0, "남의 물건이 떨어진 와르르가 한 번도 안 나왔다 — 그 갈래를 못 쟀다");
});

test("판 수: 2명 7 · 3명 6 · 4명 6 — 와르르 수 = 판 수 = 와르르 합 · 판 번호 1..N · 같은 씨앗·같은 놓기 틱은 같은 판", () => {
  for (const n of [2, 3, 4]) for (let s = 1; s <= 8; s++) {
    const g = playOut(n, s * n, Array(n).fill("normal"));
    assert.equal(g.state, "over");
    const L = g.log.filter((e) => e.lost);
    assert.equal(L.length, RULES.ROUNDS[n], `${n}명 와르르 수`);
    assert.equal(g.losses.reduce((a, b) => a + b, 0), RULES.ROUNDS[n]);
    assert.deepEqual(L.map((e) => e.round), Array.from({ length: RULES.ROUNDS[n] }, (_, i) => i + 1));
    assert.equal(startRound(g), false, "끝난 판에 새 판");
  }
  // 다시 돌리기: 로그의 놓기 틱만으로 새 엔진을 밀면 같은 판(리그가 화면에서 하는 것)
  const a = playOut(3, 42, ["easy", "normal", "easy"]);
  const b = create(3, 42);
  let i = 0;
  while (b.state !== "over") { startRound(b); while (b.state === "turn") { beginTurn(b); drop(b, a.log[i++].aim); settle(b); endTurn(b); } }
  assert.equal(JSON.stringify(b), JSON.stringify(a));
});

test("꼴찌 가르기: 와르르가 적을수록 위 · 같으면 높이 점수가 많은 쪽이 위 · unpack 은 둘을 되돌린다", () => {
  const g = create(3, 1);
  g.losses = [1, 1, 0]; g.hpts = [30, 50, 0];
  const sc = finalScores(g);
  assert.deepEqual(sc, [970, 950, 0]);
  const rank = [0, 1, 2].sort((x, y) => sc[x] - sc[y]);
  assert.deepEqual(rank, [2, 1, 0], "와르르 0 이 맨 위, 와르르 1 끼리는 높이 50 이 30 보다 위");
  assert.deepEqual(sc.map(unpack), [{ losses: 1, hpts: 30 }, { losses: 1, hpts: 50 }, { losses: 0, hpts: 0 }]);
  g.losses = [0, 1, 2]; g.hpts = [0, 999, 999];
  const s2 = finalScores(g);
  assert.ok(s2[0] < s2[1] && s2[1] < s2[2], "높이 999 도 와르르 1 번을 못 넘는다");
  for (let s = 1; s <= 10; s++) {
    const p = playOut(4, s, Array(4).fill("normal"));
    assert.deepEqual(finalScores(p).map(unpack), p.losses.map((l, i) => ({ losses: l, hpts: p.hpts[i] })));
  }
});

test("보기에는 씨앗·난수 상태·접촉 기록이 없다 — 보기 열쇠 = 화면에 보이는 것, 난수 상태를 바꿔도 보기는 같다, 봇은 보기 밖을 안 읽는다", () => {
  const KEYS = ["base", "next", "piece", "stack", "tick", "tower"];
  const PATHS = new Set(["base", "base.x", "base.w", "base.top", "next", "piece", "stack", "tick", "tower", "tower.length", "tower[]",
    "piece.kind", "piece.y", "piece.swing", "piece.v", "piece.swing.cx", "piece.swing.A", "piece.swing.period", "piece.swing.phase",
    ...["kind", "x", "y", "a", "mass", "x0", "x1", "y1"].map((k) => "tower[]." + k)]);
  const read = new Set<string>();
  const trap = (o: any, p: string): any => new Proxy(o, {
    get(t, k) {
      if (typeof k === "symbol") return Reflect.get(t, k);
      const q = Array.isArray(t) && /^\d+$/.test(k) ? p + "[]" : p ? p + "." + k : k;
      read.add(q);
      const v = Reflect.get(t, k);
      return v && typeof v === "object" ? trap(v, q) : v;
    },
    set() { throw new Error("봇이 보기를 고쳤다"); },
  });
  for (let s = 1; s <= 30; s++) {
    const g = create(2 + (s % 3), s);
    startRound(g);
    for (let k = 0; k < 3 && g.state === "turn"; k++) {
      beginTurn(g);
      const v = view(g);
      assert.deepEqual(Object.keys(v).sort(), KEYS, "보기 열쇠가 늘었다 — 화면에 안 보이는 것을 봇에 넘기나");
      const flat = JSON.stringify(v);
      for (const bad of ["seed", "rs", "arb", "log", "losses", "hpts", "nextId", "\"id\""]) assert.ok(!flat.includes(bad), `보기에 ${bad}`);
      const before = flat;
      const rs = g.rs, seed = g.seed;
      g.rs = (g.rs * 7 + 13) >>> 0; g.seed = 999;
      assert.equal(JSON.stringify(view(g)), before, "난수 상태를 바꿨더니 보기가 달라졌다");
      g.rs = rs; g.seed = seed;
      assert.notEqual(v.piece, g.piece as unknown, "보기는 사본");
      for (const lv of ["easy", "normal"]) bot(trap(v, ""), lv, seqRng(s + k), 0);
      drop(g, bot(view(g), "normal", seqRng(s), 0).tick); settle(g); endTurn(g);
    }
  }
  assert.ok(read.size > 0, "덫이 아무것도 못 봤다 — 덫이 헛돈다");
  assert.ok(read.has("tower[].x1") && read.has("piece.swing.period"), "봇이 탑·흔들림을 안 읽었다 — 덫이 엉뚱한 곳에 걸렸나");
  const outside = [...read].filter((x) => !PATHS.has(x));
  assert.deepEqual(outside, [], `봇이 보기 밖을 읽었다: ${outside}`);
});

test("봇: 9초 안의 틱을 낸다 · 보통은 겨눈 자리 둘레에 놓는다 · 균형(규격 3절): 2명 맞붙기에서 보통이 연습보다 와르르가 적은 쪽이 많다", () => {
  const r = seqRng(3);
  for (let s = 1; s <= 200; s++) {
    const g = create(2, s); startRound(g); beginTurn(g);
    for (const lv of ["easy", "normal"]) {
      const p = bot(view(g), lv, r, 0);
      assert.ok(Number.isInteger(p.tick) && p.tick >= 0 && p.tick <= RULES.AIM_CAP, `틱 ${p.tick}`);
      if (lv === "normal") assert.ok(Math.abs(aimX(g, p.tick) - p.target!) < 0.6, "보통이 겨눈 자리에서 멀다");
    }
  }
  let normalBetter = 0, ties = 0;
  const N = 60;
  for (let s = 1; s <= N; s++) {
    const swap = s % 2 === 0;
    const g = playOut(2, s, swap ? ["easy", "normal"] : ["normal", "easy"]);
    const [nm, ez] = swap ? [g.losses[1], g.losses[0]] : [g.losses[0], g.losses[1]];
    if (nm < ez) normalBetter++; else if (nm === ez) ties++;
  }
  const rate = normalBetter / (N - ties);
  assert.ok(rate > 0.65, `보통 우세 ${rate.toFixed(2)}(규격 86 : 14)`);
});
