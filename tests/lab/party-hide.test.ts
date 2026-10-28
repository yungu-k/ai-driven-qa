// 실행: node --test "tests/lab/*.test.ts"
// 내기 모음 2 「간식 숨기기」 엔진(src/lab/party/hide.ts) — 발자국 컵, 숨기기·찾기 차례, 컵 들기 점수(0 밑 없음), 공개·바퀴, 봇.
// 규격 docs/lab-party-hide-spec.md 1절·3절·6절(H1–H6). 숫자는 코드(RULES)가 정본이다 — 규격 숫자와 같은지는 따로 한 번 본다.
// 시안 원본(docs/lab-party-hide.js)과 같은 동작인지는 여기서 안 본다 — tmp/lab-party-port/equiv.mjs hide 가 잰다.
// 숨은 정보 게임: 봇은 view(g, i) 만 받는다 — 내 이번 숨김(mine)은 있고, 남의 이번 숨김은 없다(바꿔 넣어도 내 보기가 같다).
import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, CUP_NAMES, create, first, cur, lastT, canHide, hide, canLift, lift, endRound, view, bot, type HideGame, type HideView } from "../../src/lab/party/hide.ts";

function rng(seed: number) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 2 ** 32; }; }
type Lv = "easy" | "normal";
/** 봇끼리 끝까지. each(g) 는 동작마다 불린다 */
function playOut(n: number, seed: number, levels: Lv[], each?: (g: HideGame) => void): HideGame {
  const g = create(n, seed), r = rng(seed * 7 + 1);
  let guard = 0;
  while (g.phase !== "over" && guard++ < 1000) {
    each?.(g);
    if (g.phase === "reveal") { endRound(g); continue; }
    const i = cur(g), m = bot(view(g, i), levels[i], r) as any;
    if (g.phase === "hide") assert.ok(hide(g, i, m.t, m.y), `봇 숨김이 거절됐다 ${JSON.stringify(m)}`);
    else assert.ok(lift(g, i, m.o, m.c), `봇 들기가 거절됐다 ${JSON.stringify(m)}`);
  }
  return g;
}
/** j(≠ me) 의 이번 숨김을 다른 합법 쌍으로 바꾼 사본 */
function swapOthers(g: HideGame, me: number): { g2: HideGame; changed: number } {
  const g2: HideGame = JSON.parse(JSON.stringify(g)); let changed = 0;
  for (let j = 0; j < g2.n; j++) {
    const h = g2.hide[j]; if (j === me || !h) continue;
    const pw = lastT(g2, j);
    outer: for (let t = 0; t < 3; t++) for (let y = 0; y < 3; y++) if (t !== y && t !== pw && (t !== h.t || y !== h.y)) { g2.hide[j] = { t, y }; changed++; break outer; }
  }
  return { g2, changed };
}

test("수치가 규격 1절과 같다(처음 간식 3 · 컵 3 · 바퀴 2명 8 · 3명 6 · 4명 4 · 찾기 +1 · 삑삑이 1 · 안 들킴 +1 · 발자국 규칙 켜짐)", () => {
  assert.deepEqual([RULES.START, RULES.CUPS, RULES.ROUNDS[2], RULES.ROUNDS[3], RULES.ROUNDS[4], RULES.FIND, RULES.TOY, RULES.SAFE, RULES.NO_REPEAT], [3, 3, 8, 6, 4, 1, 1, 1, true]);
  for (const n of [2, 3, 4]) assert.equal(RULES.ROUNDS[n] % n, 0, `${n}명 바퀴가 사람 수의 배수가 아니다(첫 사람 돌림이 고르지 않다)`);
  assert.deepEqual(CUP_NAMES, ["왼쪽", "가운데", "오른쪽"]);
  const g = create(3, 5);
  assert.deepEqual([g.scores, g.round, g.rounds, g.phase, g.hide, g.paw0.length], [[3, 3, 3], 1, 6, "hide", [null, null, null], 3]);
  assert.ok(g.paw0.every((c) => c >= 0 && c < 3));
  assert.equal(create(4, 1, 2).rounds, 2, "바퀴 지정");
});

test("H3 발자국 컵: 첫 바퀴는 무작위(씨앗마다 같고 컵 셋 다 나온다) · 거기엔 간식을 못 넣고 삑삑이는 된다 · 다음 바퀴 발자국 = 지난 바퀴 간식 컵", () => {
  const seen = new Set<number>();
  for (let s = 1; s <= 60; s++) { const g = create(2, s); g.paw0.forEach((c) => seen.add(c)); assert.deepEqual(create(2, s).paw0, g.paw0); }
  assert.deepEqual([...seen].sort(), [0, 1, 2]);
  const g = create(2, 9), pw = lastT(g, 0), other = (pw + 1) % 3;
  assert.equal(lastT(g, 0), g.paw0[0]);
  assert.equal(canHide(g, 0, pw, other), false, "발자국 컵에 간식");
  assert.equal(hide(g, 0, pw, other), false);
  assert.equal(hide(g, 0, other, other), false, "간식·삑삑이 같은 컵");
  assert.equal(hide(g, 1, (lastT(g, 1) + 1) % 3, lastT(g, 1)), false, "차례 아닌 자리");
  assert.equal(hide(g, 0, 3, 0), false, "범위 밖");
  assert.equal(hide(g, 0, other, pw), true, "삑삑이는 발자국 컵에 된다");
  assert.deepEqual([g.hide[0], g.k, cur(g)], [{ t: other, y: pw }, 1, 1]);
  const t1 = (lastT(g, 1) + 1) % 3; hide(g, 1, t1, (t1 + 1) % 3);
  assert.equal(g.phase, "seek");
  lift(g, 0, 1, 0); lift(g, 1, 0, 0);
  endRound(g);
  assert.deepEqual([lastT(g, 0), lastT(g, 1)], [other, t1], "다음 바퀴 발자국 = 지난 바퀴 간식 컵");
  assert.deepEqual(g.hist[0].paw, [pw, g.paw0[1]], "기록의 발자국은 그 바퀴 것");
});

test("컵 들기: 간식 → 든 사람 +1 · 주인 −1(들킴) / 삑삑이 → 든 사람 −1 · 주인 +1 / 빈 컵 → 그대로 · 내 컵·든 컵·남의 차례·숨기기 중엔 못 든다", () => {
  const g = create(3, 4);
  const plan = [[1, 2], [2, 0], [0, 1]];
  for (let k = 0; k < 3; k++) { const i = cur(g); const [t, y] = plan[i][0] === lastT(g, i) ? [plan[i][1], plan[i][0]] : plan[i]; assert.equal(lift(g, i, (i + 1) % 3, 0), null, "숨기기 중 들기"); hide(g, i, t, y); }
  assert.equal(g.phase, "seek");
  const s = cur(g), o = (s + 1) % 3, q = (s + 2) % 3, H = g.hide;
  assert.equal(canLift(g, s, s, 0), false, "내 컵");
  assert.equal(lift(g, o, q, 0), null, "남의 차례");
  const L1 = lift(g, s, o, H[o]!.t)!;
  assert.deepEqual([L1.what, L1.ds, L1.do, g.scores[s], g.scores[o], g.found[o]], ["treat", 1, -1, 4, 2, true]);
  assert.equal(lift(g, cur(g), o, H[o]!.t), null, "이미 든 컵");
  const s2 = cur(g), o2 = s2 === q ? s : q; // s2 = o
  const before = g.scores.slice();
  const L2 = lift(g, s2, o2, H[o2]!.y)!;
  assert.deepEqual([L2.what, L2.ds, L2.do, g.scores[s2] - before[s2], g.scores[o2] - before[o2]], ["toy", -1, 1, -1, 1]);
  const s3 = cur(g), o3 = (s3 + 1) % 3, empty = [0, 1, 2].find((c) => c !== H[o3]!.t && c !== H[o3]!.y)!;
  const b3 = g.scores.slice();
  const L3 = lift(g, s3, o3, empty)!;
  assert.deepEqual([L3.what, L3.ds, L3.do, g.scores], ["empty", 0, 0, b3]);
  assert.equal(g.phase, "reveal");
  assert.deepEqual(g.log.map((e) => e.e), ["lift", "lift", "lift"]);
});

test("H5 0 밑 없음: 간식 0 인 주인은 안 잃고 찾은 사람은 그대로 +1 · 간식 0 인 사람이 삑삑이를 들면 안 주고 주인은 그대로 +1", () => {
  const g = create(2, 3);
  g.scores = [0, 0];
  const t0 = (lastT(g, 0) + 1) % 3; hide(g, 0, t0, (t0 + 1) % 3);
  const t1 = (lastT(g, 1) + 1) % 3, y1 = (t1 + 1) % 3; hide(g, 1, t1, y1);
  const L = lift(g, 0, 1, t1)!;
  // do 는 −0(−Math.min(1, 0)) — 원본 그대로. 화면은 `L.do ? … : "±0(줄 게 없어요)"` 로 읽고 JSON 은 0 으로 쓴다
  assert.deepEqual([L.what, L.ds, L.do === 0, JSON.stringify(L.do), g.scores], ["treat", 1, true, "0", [1, 0]]);
  const L2 = lift(g, 1, 0, g.hide[0]!.y)!;
  assert.deepEqual([L2.what, L2.ds === 0, L2.do, g.scores], ["toy", true, 1, [2, 0]]);
  assert.ok(g.scores.every((v) => v >= 0));
});

test("공개·바퀴: 안 들킨 사람만 +1 · 기록에 숨김·발자국·든 컵·지킨 사람 · 첫 사람이 바퀴마다 한 칸씩 · 마지막 바퀴 뒤 over, 그 뒤엔 아무것도 안 된다", () => {
  const g = create(2, 8);
  assert.equal(endRound(g), null, "숨기기 중 공개");
  const firsts: number[] = [];
  while (g.phase !== "over") {
    firsts.push(first(g));
    for (let k = 0; k < 2; k++) { const i = cur(g), t = (lastT(g, i) + 1) % 3; hide(g, i, t, (t + 1) % 3); }
    // 0 은 1 의 간식을 찾고, 1 은 0 의 빈 컵을 든다 → 1 들킴, 0 지킴
    for (let k = 0; k < 2; k++) { const s = cur(g), o = 1 - s, H = g.hide[o]!; lift(g, s, o, s === 0 ? H.t : [0, 1, 2].find((c) => c !== H.t && c !== H.y)!); }
    const sc = g.scores.slice(), res = endRound(g)!;
    assert.deepEqual(res.safe, [0]);
    assert.deepEqual(g.scores, [sc[0] + 1, sc[1]]);
    const h = g.hist[g.hist.length - 1];
    assert.deepEqual([h.safe, h.lifts.length, h.hide.length, h.paw.length], [[0], 2, 2, 2]);
  }
  assert.deepEqual(firsts, [0, 1, 0, 1, 0, 1, 0, 1]);
  // 점수: 0 은 바퀴마다 찾기 +1 · 지킴 +1(3 + 16), 1 은 바퀴마다 −1 이다가 0 에서 멈춘다(0 밑 없음)
  assert.deepEqual([g.round, g.hist.length, g.scores], [9, 8, [19, 0]]);
  assert.deepEqual([cur(g), hide(g, 0, 0, 1), lift(g, 0, 1, 0), endRound(g)], [-1, false, null, null]);
});

test("끝까지(봇끼리): 2·3·4명 바퀴 8·6·4 · 숨기기 = 찾기 = 사람 × 바퀴 · 점수 = 처음 + 기록 합산 · 같은 씨앗 같은 판", () => {
  for (const n of [2, 3, 4]) {
    const g = playOut(n, 5 * n, Array(n).fill("normal"));
    const lifts = g.log.filter((e) => e.e === "lift");
    assert.deepEqual([g.phase, g.hist.length, lifts.length, g.hist.reduce((a, h) => a + h.hide.length, 0)], ["over", RULES.ROUNDS[n], n * RULES.ROUNDS[n], n * RULES.ROUNDS[n]]);
    const s = Array(n).fill(RULES.START);
    for (const e of g.log) { if (e.e === "lift") { s[e.s] += e.ds; s[e.o] += e.do; } else e.safe.forEach((i) => s[i]++); }
    assert.deepEqual(s, g.scores);
    assert.ok(g.hist.every((h, r) => h.first === r % n));
    assert.ok(g.hist.every((h, r) => h.hide.every((x, i) => x.t !== h.paw[i] && (r === 0 || h.paw[i] === g.hist[r - 1].hide[i].t))), "발자국 컵에 간식이 들어갔다");
  }
  const a = playOut(4, 42, ["easy", "normal", "easy", "normal"]), b = playOut(4, 42, ["easy", "normal", "easy", "normal"]), c = playOut(4, 43, ["easy", "normal", "easy", "normal"]);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.notEqual(JSON.stringify(a), JSON.stringify(c));
});

test("숨은 정보: 보기 열쇠는 화면에 보이는 것뿐 · mine = 내 숨김 · 남의 이번 숨김을 바꿔 넣어도 모든 자리의 보기가 같다 · 봇은 보기 밖을 안 읽는다 — 새는 사본·훔쳐보는 봇은 같은 검사가 잡는다(양성 대조)", () => {
  const KEYS = ["found", "hist", "lastT", "lifts", "me", "mine", "n", "phase", "round", "rounds", "scores"];
  // 같은 검사를 view 와 새는 사본에 함께 돌린다 — 사본에서 빨강이 안 나면 검사가 헛돈다
  const leaky = (g: HideGame, i: number) => Object.assign(view(g, i), { peek: g.hide }) as HideView;
  let views = 0, swaps = 0, reads = 0, leakCaught = 0, leakTried = 0, peekCaught = 0, peekTried = 0;
  for (const n of [2, 3, 4]) for (let seed = 1; seed <= 6; seed++) {
    const r = rng(seed);
    playOut(n, seed * 101 + n, Array(n).fill(seed % 2 ? "normal" : "easy"), (g) => {
      if (g.phase === "reveal") return;
      for (let i = 0; i < n; i++) {
        const v = view(g, i);
        assert.deepEqual(Object.keys(v).sort(), KEYS, "보기 열쇠가 늘었다 — 화면에 안 보이는 것을 봇에 넘기나");
        assert.deepEqual(v.mine, g.hide[i], "mine = 제 숨김");
        assert.ok(!JSON.stringify(Object.keys(v)).includes('"hide"'));
        const { g2, changed } = swapOthers(g, i);
        if (changed) {
          swaps += changed;
          assert.equal(JSON.stringify(view(g2, i)), JSON.stringify(v), `남의 숨김을 바꿨더니 자리 ${i} 의 보기가 바뀌었다(${g.round}바퀴 ${g.phase})`);
          leakTried++; if (JSON.stringify(leaky(g2, i)) !== JSON.stringify(leaky(g, i))) leakCaught++;
        }
        views++;
      }
      // 덫: 차례인 봇이 읽는 열쇠를 적는다(보기 밖을 읽거나 고치면 걸린다)
      const me = cur(g), v = view(g, me), read = new Set<string>();
      const trap = new Proxy(v, { get(t, k) { read.add(String(k)); return Reflect.get(t, k); }, set() { throw new Error("봇이 보기를 고쳤다"); } });
      bot(trap, g.round % 2 ? "normal" : "easy", r);
      const outside = [...read].filter((k) => !KEYS.includes(k));
      assert.deepEqual(outside, [], `봇이 보기 밖을 읽었다: ${outside}`);
      reads += read.size;
      // 덫 양성 대조: 새는 사본의 peek 를 읽는 「훔쳐보는 봇」 은 같은 덫·같은 거르기에 걸린다
      const lv = leaky(g, me), read2 = new Set<string>();
      const trap2 = new Proxy(lv, { get(t, k) { read2.add(String(k)); return Reflect.get(t, k); } });
      const cheat = (w: any) => { void w.peek; return bot(w, "normal", r); };
      cheat(trap2); peekTried++;
      if ([...read2].some((k) => !KEYS.includes(k))) peekCaught++;
    });
  }
  assert.ok(reads > 0, "덫이 아무것도 못 봤다 — 덫이 헛돈다");
  assert.ok(views > 500 && swaps > 300, `본 보기 ${views} · 바꿔 넣은 숨김 ${swaps}`);
  assert.ok(leakTried > 100 && leakCaught === leakTried, `새는 사본(view + g.hide)을 맞대기가 잡았다 ${leakCaught}/${leakTried}`);
  assert.ok(peekTried > 100 && peekCaught === peekTried, `훔쳐보는 봇을 덫이 잡았다 ${peekCaught}/${peekTried}`);
});

test("봇: 늘 합법(발자국 컵엔 간식 안 넣음 · 남의 안 든 컵) · 보통은 삑삑이를 대개 발자국 아닌 후보에 · 보통이 연습보다 간식을 더 찾고 빈 컵을 덜 든다", () => {
  const r = rng(11), what = { easy: { treat: 0, toy: 0, empty: 0 }, normal: { treat: 0, toy: 0, empty: 0 } };
  let yOnPaw = 0, yOff = 0;
  for (let s = 1; s <= 200; s++) {
    const lv: Lv = s % 2 ? "easy" : "normal", n = 2 + (s % 3);
    const g = create(n, s);
    while (g.phase !== "over") {
      if (g.phase === "reveal") { endRound(g); continue; }
      const i = cur(g), m = bot(view(g, i), lv, r) as any;
      if (g.phase === "hide") {
        assert.ok(canHide(g, i, m.t, m.y), `봇 숨김 ${JSON.stringify(m)}`);
        if (lv === "normal" && m.t !== lastT(g, i)) (m.y === lastT(g, i) ? yOnPaw++ : yOff++);
        hide(g, i, m.t, m.y);
      } else { assert.ok(canLift(g, i, m.o, m.c), `봇 들기 ${JSON.stringify(m)}`); what[lv][lift(g, i, m.o, m.c)!.what]++; }
    }
  }
  const rate = (o: { treat: number; toy: number; empty: number }, k: "treat" | "empty") => o[k] / (o.treat + o.toy + o.empty);
  assert.ok(yOff / (yOff + yOnPaw) > 0.7, `보통 봇 삑삑이가 발자국 아닌 후보에 ${(yOff / (yOff + yOnPaw)).toFixed(2)} (규격 80 %)`);
  assert.ok(rate(what.easy, "empty") > 0.25 && rate(what.normal, "empty") < 0.12, `빈 컵 연습 ${rate(what.easy, "empty").toFixed(2)} · 보통 ${rate(what.normal, "empty").toFixed(2)} (규격 33 % · 4–6 %)`);
  assert.ok(rate(what.normal, "treat") > rate(what.easy, "treat"), `간식 찾기 보통 ${rate(what.normal, "treat").toFixed(2)} > 연습 ${rate(what.easy, "treat").toFixed(2)}`);
});

test("균형(규격 2절): 보통 하나 vs 연습 나머지 — 보통 자리 1등(동점 포함)이 고르게(1/n)보다 많다 · 2명 맞붙기 보통이 더 이긴다", () => {
  const N = 300;
  for (const [n, lo] of [[2, 0.6], [3, 0.5], [4, 0.42]] as const) {
    let top = 0;
    for (let s = 1; s <= N; s++) {
      const seat = s % n, lv = Array.from({ length: n }, (_, i) => (i === seat ? "normal" : "easy")) as Lv[];
      const g = playOut(n, s * 13 + n, lv);
      if (g.scores[seat] === Math.max(...g.scores)) top++;
    }
    assert.ok(top / N > lo && top / N < 0.92, `${n}명 보통 1등 ${(top / N).toFixed(2)} (규격 시뮬 ${({ 2: 0.76, 3: 0.67, 4: 0.59 } as Record<number, number>)[n]})`);
  }
});
