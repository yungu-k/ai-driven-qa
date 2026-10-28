// 실행: node --test "tests/lab/*.test.ts"
// 내기 모음 7 「비밀 경매」 엔진(src/lab/party/auction.ts) — 물건 줄, 내는 차례, 몰래 내기, 공개(가져간 사람만 냄 · 같으면 뼈다귀 적은 쪽 · 그다음 코코), 점수(별 + 한 벌), 봇.
// 규격 docs/lab-party-auction-spec.md 1절·3절·6절(A1–A7). 숫자는 코드(RULES)가 정본이다 — 규격 숫자와 같은지는 따로 한 번 본다.
// 시안 원본(docs/lab-party-auction.js)과 같은 동작인지는 여기서 안 본다 — tmp/lab-party-port/equiv.mjs auction 이 잰다.
// 🔴 숨은 정보 게임: 숨은 값은 이번 물건의 g.bids 하나. 봇은 view(g, i) 만 받고, 그 안에 이번 입찰이 없다(남이 낸 수를 바꿔도 보기가 같다).
//    검사가 헛돌지 않게 양성 대조를 둔다 — 입찰을 흘리는 보기 사본·보기 밖을 읽는 봇은 같은 검사에서 빨강이어야 한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, KINDS, POOL, BOTP, create, bid, bidder, next, score, scores, counts, view, bot, worth, rng, type AuctionGame, type AuctionView, type AuctionResult } from "../../src/lab/party/auction.ts";

const VIEW_KEYS = ["coco", "history", "items", "k", "me", "n", "set", "tokens", "won"];
/** 봇끼리 끝까지(공개는 바로 넘김). 내기마다 cb 를 부른다 */
function playOut(n: number, seed: number, levels: string[], cb?: (g: AuctionGame, i: number) => void): AuctionGame {
  const g = create(n, seed), r = rng(seed * 31 + 1);
  let guard = 0;
  while (g.state !== "over" && guard++ < 1000) {
    if (g.state === "reveal") { next(g); continue; }
    const i = bidder(g);
    cb?.(g, i);
    assert.notEqual(bid(g, i, bot(view(g, i), levels[i], r)), null, "봇이 못 낼 수를 냈다");
  }
  return g;
}
/** 물건 하나를 손으로: 차례대로 vals[자리] 를 낸다 → 공개 결과 */
function bidAll(g: AuctionGame, vals: number[]): AuctionResult {
  let res: unknown = null;
  while (g.state === "bid") { const i = bidder(g); res = bid(g, i, vals[i]); }
  return res as AuctionResult;
}

test("수치가 규격 1절과 같다(3–4명 · 뼈다귀 20 · 물건 3명 12 · 4명 10 · 한 벌 +4 · 가져간 사람만 냄 · 물건 12 = 종류 셋 × 별 1·2·3·5 · 봇 손잡이)", () => {
  assert.deepEqual([RULES.BUDGET[3], RULES.BUDGET[4], RULES.ITEMS[3], RULES.ITEMS[4], RULES.SET, RULES.PAY], [20, 20, 12, 10, 4, "winner"]);
  assert.deepEqual(KINDS, ["장난감", "간식", "잠자리"]);
  assert.equal(POOL.length, 12);
  for (let k = 0; k < 3; k++) assert.deepEqual(POOL.filter((p) => p.kind === k).map((p) => p.pts), [1, 2, 3, 5], `${KINDS[k]} 별`);
  assert.equal(new Set(POOL.map((p) => p.name)).size, 12, "물건 이름이 겹친다");
  assert.deepEqual(BOTP, { share: 1.1, habit: 1.3, jit: 4 });
});

test("판 차리기: 3명 물건 12 전부 · 4명 섞어 10(안 겹침) · 모두 뼈다귀 20 · 첫 사람은 물건마다 한 칸씩 돈다 · 같은 씨앗 같은 줄 · 난수는 상태 JSON 밖", () => {
  const g3 = create(3, 5), g4 = create(4, 5);
  assert.deepEqual(g3.items.slice().sort((a, b) => a - b), [...Array(12).keys()]);
  assert.equal(g4.items.length, 10); assert.equal(new Set(g4.items).size, 10);
  assert.deepEqual([g3.tokens, g4.tokens], [[20, 20, 20], [20, 20, 20, 20]]);
  assert.deepEqual(create(4, 5).items, g4.items);
  assert.notDeepEqual(create(4, 6).items, g4.items);
  assert.ok(!("r" in JSON.parse(JSON.stringify(g4))), "난수가 JSON 에 들어갔다");
  const firsts: number[] = [];
  while (g4.state !== "over") { firsts.push(bidder(g4)); assert.deepEqual(g4.order, [0, 1, 2, 3].map((j) => (g4.k + j) % 4)); bidAll(g4, [1, 2, 0, 0]); next(g4); }
  assert.deepEqual(firsts, [0, 1, 2, 3, 0, 1, 2, 3, 0, 1]);
});

test("몰래 내기: 차례인 자리만 · 0 ~ 내 뼈다귀 · 소수는 내림 · 앞사람은 { placed } · 마지막 사람이 내면 공개 · 공개 중·끝난 뒤엔 못 낸다", () => {
  const g = create(3, 9);
  assert.equal(bid(g, 1, 3), null, "차례 아닌 자리");
  assert.equal(bid(g, 0, 21), null, "뼈다귀보다 많이");
  assert.equal(bid(g, 0, -1), null, "음수");
  assert.equal(bid(g, 0, "x"), null, "수 아님");
  assert.equal(g.at, 0, "틀린 부름이 차례를 넘겼다");
  assert.deepEqual(bid(g, 0, 2.9), { placed: true });
  assert.deepEqual(g.bids, [2, null, null]);
  assert.equal(next(g), false, "내는 중에 다음 물건");
  bid(g, 1, 0);
  const res = bid(g, 2, 20) as AuctionResult;
  assert.equal(g.state, "reveal");
  assert.deepEqual(res, { item: g.items[0], bids: [2, 0, 20], win: 2, tie: [] });
  assert.equal(bid(g, 0, 1), null, "공개 중");
});

test("공개 — 가장 많이 낸 사람만 낸 만큼 쓰고 가져간다(A3) · 같으면 뼈다귀 적은 쪽(A4) · 그것도 같으면 코코 · 모두 0 이면 코코 · 진 사람은 그대로", () => {
  // 하나만 높다
  let g = create(3, 2);
  assert.deepEqual(bidAll(g, [3, 5, 2]), { item: g.items[0], bids: [3, 5, 2], win: 1, tie: [] });
  assert.deepEqual([g.tokens, g.won, g.coco], [[20, 15, 20], [[], [g.items[0]], []], []]);
  // 1등이 같고 뼈다귀가 같다 → 코코, 아무도 안 씀
  g = create(3, 2);
  assert.deepEqual(bidAll(g, [3, 3, 0]), { item: g.items[0], bids: [3, 3, 0], win: -1, tie: [0, 1] });
  assert.deepEqual([g.tokens, g.coco], [[20, 20, 20], [g.items[0]]]);
  // 모두 0 → 코코, tie 없음
  g = create(4, 2);
  assert.deepEqual(bidAll(g, [0, 0, 0, 0]), { item: g.items[0], bids: [0, 0, 0, 0], win: -1, tie: [] });
  // 1등이 같고 뼈다귀가 다르다 → 적은 쪽이 가져가고 그 사람만 낸다
  g = create(4, 2); g.tokens = [10, 6, 20, 6];
  assert.deepEqual(bidAll(g, [4, 4, 1, 3]), { item: g.items[0], bids: [4, 4, 1, 3], win: 1, tie: [0, 1] });
  assert.deepEqual(g.tokens, [10, 2, 20, 6]);
  // 1등 셋 중 가장 적은 둘이 같다 → 코코
  g = create(4, 2); g.tokens = [6, 6, 20, 9];
  assert.deepEqual(bidAll(g, [5, 5, 5, 5]).win, -1);
  assert.deepEqual(g.tokens, [6, 6, 20, 9]);
  // 다음 물건 → 내기 판 새로, 마지막 다음은 over(남은 입찰 지움)
  g = create(3, 2);
  for (let k = 0; k < 12; k++) { bidAll(g, [1, 0, 0]); assert.equal(next(g), true); }
  assert.deepEqual([g.state, g.k, g.bids, g.tokens[0], g.won[0].length, next(g)], ["over", 12, [null, null, null], 8, 12, false]);
});

test("점수(A5·A7): 별 합 + 한 벌(세 종류 하나씩)마다 +4 · 남은 뼈다귀는 점수 아님 · counts 는 종류별 수", () => {
  const g = create(3, 1);
  const id = (kind: number, pts: number) => POOL.findIndex((p) => p.kind === kind && p.pts === pts);
  g.won = [[id(0, 5), id(1, 1), id(2, 2)], [id(0, 1), id(0, 2), id(0, 3), id(0, 5)], [id(0, 1), id(1, 2), id(2, 3), id(0, 2), id(1, 3), id(2, 5)]];
  g.tokens = [0, 20, 3];
  assert.deepEqual(counts(g.won[2]), [2, 2, 2]);
  assert.deepEqual(scores(g), [8 + 4, 11, 16 + 8]);
  assert.equal(score(g, 1), 11, "한 종류만이면 한 벌 없음");
});

test("끝까지(봇끼리): 3명 내기 36 · 4명 40 · 가져간 것 + 코코 = 물건 수 · 쓴 뼈다귀 = 이긴 입찰 합 · 끝난 점수 = 엔진 score · 같은 씨앗 같은 판", () => {
  for (const [n, items, lv] of [[3, 12, ["normal", "easy", "normal"]], [4, 10, ["easy", "normal", "normal", "easy"]]] as const) {
    let bids = 0;
    const g = playOut(n, 77, [...lv], () => bids++);
    assert.equal(bids, n * items);
    assert.equal(g.log.length, items);
    assert.equal(g.won.flat().length + g.coco.length, items);
    const spent = g.log.reduce((a, l) => a + (l.win >= 0 ? l.bids[l.win] : 0), 0);
    assert.equal(g.tokens.reduce((a, b) => a + b, 0), 20 * n - spent);
    assert.ok(g.tokens.every((t) => t >= 0));
    assert.deepEqual(JSON.stringify(playOut(n, 77, [...lv])), JSON.stringify(g));
  }
});

test("봇: 연습은 0 ~ 뼈다귀 절반 · 바닥이면 0 · 남이 다 바닥이면 1 · 마지막 물건은 남 최대 +1(내 것 안에서) · 늘 0 ~ 내 뼈다귀", () => {
  const r = rng(4);
  const v = (o: Partial<AuctionView>): AuctionView => ({ me: 0, n: 3, k: 0, items: create(3, 3).items, tokens: [20, 20, 20], won: [[], [], []], coco: [], history: [], set: 4, ...o });
  for (let q = 0; q < 300; q++) { const b = bot(v({ tokens: [13, 20, 20] }), "easy", r); assert.ok(b >= 0 && b <= 6, `연습 ${b}`); }
  assert.equal(bot(v({ tokens: [0, 5, 5] }), "normal", r), 0);
  assert.equal(bot(v({ tokens: [7, 0, 0] }), "normal", r), 1);
  assert.equal(bot(v({ k: 11, tokens: [9, 4, 6] }), "normal", r), 7);
  assert.equal(bot(v({ k: 11, tokens: [5, 4, 9] }), "normal", r), 5);
  // 한 벌을 채우는 물건은 값이 더 나간다
  const items = create(3, 3).items, it = items[0], kind = POOL[it].kind;
  const others = [0, 1, 2].filter((k) => k !== kind).map((k) => POOL.findIndex((p) => p.kind === k));
  assert.equal(worth(v({ won: [others, [], []] }), it, 0), POOL[it].pts + 4);
  assert.equal(worth(v({}), it, 0), POOL[it].pts + 4 * 0.45);
  playOut(4, 5, ["normal", "easy", "normal", "easy"]); // 안에서 「못 낼 수」 가 없다(bid !== null)를 본다
});

// 🔴 숨은 정보 검사 — 보기 함수를 받아 위반 목록을 돌려준다. 진짜 view 는 0, 입찰을 흘리는 사본은 > 0 이어야 검사가 산 것이다
function hiddenViolations(viewFn: (g: AuctionGame, i: number) => AuctionView, n: number, seed: number): { bad: string[]; checked: number } {
  const bad: string[] = []; let checked = 0;
  playOut(n, seed, Array(n).fill("normal"), (g, i) => {
    const v = viewFn(g, i), keys = Object.keys(v).sort();
    if (JSON.stringify(keys) !== JSON.stringify(VIEW_KEYS)) bad.push(`열쇠 ${keys.join(",")}`);
    // 남이 이번에 낸 수(공개 전)를 바꿔도 내 보기는 같아야 한다
    const placed = g.bids.map((b, j) => (b != null && j !== i ? j : -1)).filter((j) => j >= 0);
    if (!placed.length) return;
    const snap = JSON.stringify(v), save = g.bids.slice();
    placed.forEach((j) => (g.bids[j] = (save[j] as number) + 1 + (j % 3))); // 늘 다른 값(뼈다귀 0 인 사람도 — 숨은 값이 보기에 흐르나만 본다)
    if (JSON.stringify(viewFn(g, i)) !== snap) bad.push(`물건 ${g.k} 자리 ${i}: 남의 입찰을 바꿨더니 보기가 바뀌었다`);
    g.bids = save; checked++;
  });
  return { bad, checked };
}

test("숨은 정보: 봇 보기에 이번 입찰이 없다 — 열쇠는 공개 정보뿐, 남이 낸 수를 바꿔도 보기가 같다 · 입찰을 흘리는 사본은 같은 검사에서 빨강(양성 대조)", () => {
  for (const n of [3, 4]) {
    const real = hiddenViolations(view, n, 31);
    assert.deepEqual(real.bad, []);
    assert.equal(real.checked, n === 3 ? 24 : 30, "남이 이미 낸 차례 수(물건 × (n−1)) — 0 이면 검사가 헛돈다");
    const leaky = hiddenViolations((g, i) => ({ ...view(g, i), bids: g.bids.slice() }) as AuctionView, n, 31);
    assert.ok(leaky.bad.length >= real.checked, `bids 를 흘리는 보기를 못 잡았다(${leaky.bad.length})`);
    const sneaky = hiddenViolations((g, i) => { const v = view(g, i); v.history = [...v.history, { item: -1, bids: g.bids.map((b) => b ?? -1), win: -1 }]; return v; }, n, 31);
    assert.equal(sneaky.bad.length, real.checked, "열쇠는 같고 값으로 흘리는 보기를 못 잡았다");
  }
});

// 덫: 보기를 깊게 감싸 봇이 읽은 길(tokens.0 · history.2.bids …)을 적는다. 고치려 들면 던진다
function trapped<T extends object>(o: T, seen: Set<string>, path = ""): T {
  return new Proxy(o, {
    get(t, k) {
      const p = path ? `${path}.${String(k)}` : String(k);
      if (typeof k === "string") seen.add(p);
      const x = Reflect.get(t, k);
      return x && typeof x === "object" ? trapped(x, seen, p) : x;
    },
    set() { throw new Error("봇이 보기를 고쳤다"); },
    deleteProperty() { throw new Error("봇이 보기를 지웠다"); },
  });
}
test("숨은 정보: 봇은 보기 안만 읽는다(깊은 Proxy 덫) · 보기를 안 고친다 · 덫이 헛돌지 않는다 · 보기 밖(bids)을 읽는 봇은 덫에 걸린다(양성 대조)", () => {
  const seen = new Set<string>(); let calls = 0;
  for (const [n, seed] of [[3, 8], [4, 9]] as const) {
    const g = create(n, seed), r = rng(seed);
    while (g.state !== "over") {
      if (g.state === "reveal") { next(g); continue; }
      const i = bidder(g), v = view(g, i), before = JSON.stringify(v);
      const b = bot(trapped(v, seen), calls % 3 ? "normal" : "easy", r);
      assert.equal(JSON.stringify(v), before);
      bid(g, i, b); calls++;
    }
  }
  const tops = [...new Set([...seen].map((p) => p.split(".")[0]))].sort();
  assert.deepEqual(tops.filter((k) => !VIEW_KEYS.includes(k)), [], `봇이 보기 밖을 읽었다: ${tops}`);
  assert.ok(seen.has("tokens.0") && [...seen].some((p) => /^history\.\d+\.bids/.test(p)), "덫이 봇의 읽기를 못 봤다 — 덫이 헛돈다");
  assert.equal(calls, 3 * 12 + 4 * 10);
  // 양성 대조: 보기 밖 열쇠를 읽는 봇이면 같은 덫이 그 열쇠를 적는다
  const s2 = new Set<string>(), g = create(3, 8);
  bid(g, 0, 4);
  const cheat = (w: AuctionView) => ((w as unknown as { bids?: number[] }).bids?.[0] ?? 0) + bot(w, "normal", rng(1));
  cheat(trapped(view(g, 1), s2));
  assert.ok(s2.has("bids"), "보기 밖을 읽는 봇을 덫이 못 잡았다");
});

test("균형(규격 2절): 보통 하나 vs 연습 둘(3명) — 보통 자리가 1등(동점 포함)인 판이 많다 · 4명 보통 하나 vs 연습 셋도", () => {
  for (const [n, lo] of [[3, 0.8], [4, 0.6]] as const) {
    let first = 0; const N = 300;
    for (let s = 1; s <= N; s++) {
      const seat = s % n, lv = [...Array(n).keys()].map((i) => (i === seat ? "normal" : "easy"));
      const sc = scores(playOut(n, s, lv));
      if (sc[seat] === Math.max(...sc)) first++;
    }
    assert.ok(first / N > lo, `${n}명 보통 1등 ${(first / N).toFixed(2)} (규격 시뮬 3명 0.92 · 4명 0.78)`);
  }
});
