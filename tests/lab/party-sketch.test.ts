// 실행: node --test "tests/lab/*.test.ts"
// 내기 모음 5 「그림 전달」 엔진(src/lab/party/sketch.ts) — 줄·차례 배치, 정답 기준(바로 앞 칸), 6칸 고르기, 별, 공개·바퀴, 봇.
// 규격 docs/lab-party-sketch-spec.md 1절·3절·6절(S1–S7). 숫자는 코드(RULES)가 정본이다 — 규격 숫자와 같은지는 따로 한 번 본다.
// 시안 원본(docs/lab-party-sketch.js)과 같은 동작인지는 여기서 안 본다 — tmp/lab-party-port/equiv.mjs sketch 가 잰다.
// 숨은 정보 게임: 봇은 view(g, i) 만 받는다 — 차례인 자리에만 값이 있고, 그 값은 건넨 것 하나(그릴 말 / 앞 칸 그림 + 6칸)뿐이다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, WORDS, CATS, PRESET, presetStrokes, create, cur, target, view, submit, next, lapScores, bot, norm, chosung, type SketchGame, type SketchView } from "../../src/lab/party/sketch.ts";

function rng(seed: number) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 2 ** 32; }; }
/** 봇끼리 끝까지(공개는 바로 넘김) */
function playOut(n: number, seed: number, levels: ("easy" | "normal")[]): SketchGame {
  const g = create(n, seed), r = rng(seed * 7 + 1);
  let guard = 0;
  while (g.state !== "over" && guard++ < 1000) {
    if (g.state === "reveal") { next(g); continue; }
    const i = cur(g)!.p;
    submit(g, i, bot(view(g, i), levels[i], r));
  }
  return g;
}

test("수치가 규격 1절과 같다(30초 · 6칸 · 3명 3칸 2바퀴 · 4명 4칸 1바퀴 · 색 4 · 낱말 45 = 7·9·6·12·6·5, 모두 두 글자 이상, 모두 밑그림)", () => {
  assert.deepEqual([RULES.DRAW_SEC, RULES.CHOICES, RULES.LEN[3], RULES.LEN[4], RULES.LAPS[3], RULES.LAPS[4], RULES.COLORS.length], [30, 6, 3, 4, 2, 1, 4]);
  assert.deepEqual(Object.fromEntries(Object.entries(CATS).map(([k, v]) => [k, v.length])), { 동물: 7, 간식: 9, 코코: 6, 물건: 12, 하늘: 6, 탈것: 5 });
  assert.equal(WORDS.length, 45);
  assert.equal(new Set(WORDS).size, 45, "낱말이 겹친다");
  assert.deepEqual(WORDS.filter((w) => w.length < 2), [], "한 글자 낱말");
  assert.deepEqual(CATS.코코, ["뼈다귀", "축구공", "개집", "밥그릇", "초인종", "목줄"]);
  assert.deepEqual(Object.keys(PRESET).sort(), WORDS.slice().sort(), "S6: 낱말 45개 모두 밑그림");
  for (const w of WORDS) for (const s of presetStrokes(w)!) assert.ok(s.p.every((v) => Number.isInteger(v) && v >= 0 && v <= 1000) && s.c >= 0 && s.c < 4, `${w} 밑그림 좌표·색`);
  assert.equal(presetStrokes("바다"), null);
});

test("줄·차례 배치: 줄 c 는 사람 c 가 시작, 칸 s 는 사람 (c+s)%n · 한 사람이 한 줄에 한 번 · 바로 앞 차례와 늘 다른 사람 · 사람당 그리기·맞히기 수가 같다 · 처음 말은 안 겹친다", () => {
  for (const [n, chains, turns, draws, guesses] of [[3, 6, 18, 4, 2], [4, 4, 16, 2, 2]] as const) {
    const g = create(n, 11);
    assert.equal(g.chains.length, chains);
    assert.equal(g.turns.length, turns);
    g.chains.forEach((ch, c) => assert.equal(ch.start, c % n));
    for (const T of g.turns) assert.equal(T.p, ((T.chain % n) + T.s) % n);
    for (const ch of g.chains.keys()) { const seats = g.turns.filter((T) => T.chain === ch).map((T) => T.p); assert.equal(new Set(seats).size, seats.length, `${n}명 줄 ${ch} 에 같은 사람이 두 번`); }
    for (let t = 1; t < g.turns.length; t++) assert.notEqual(g.turns[t].p, g.turns[t - 1].p, `${n}명 차례 ${t} 가 바로 앞과 같은 사람`);
    for (let i = 0; i < n; i++) assert.deepEqual([g.turns.filter((T) => T.p === i && T.kind === "draw").length, g.turns.filter((T) => T.p === i && T.kind === "guess").length], [draws, guesses], `${n}명 자리 ${i}`);
    assert.equal(new Set(g.chains.map((c) => c.word)).size, g.chains.length, "처음 말이 겹친다");
    assert.deepEqual(g.turns.slice(0, n).map((T) => T.kind), Array(n).fill("draw"));
  }
});

test("S4 정답 기준: 바로 앞 그림이 그리려던 말(처음 말이 아님) · 맞으면 맞힌 사람·그린 사람 +1 · 직접 쓰기는 빈칸·문장부호를 빼고 맞댄다", () => {
  const g = create(4, 3), ch0 = g.chains[0];
  for (let c = 0; c < 4; c++) submit(g, c, { strokes: [] }); // 칸 0: 넷 다 그림
  // 칸 1(줄 0 은 사람 1): 틀리게 「바다」 라고 씀 → 별 없음
  assert.equal(target(g, cur(g)!), ch0.word);
  assert.equal(submit(g, 0, { text: "바다" }), false, "차례 아닌 자리는 못 낸다");
  submit(g, 1, { text: " 바다 " });
  assert.deepEqual([ch0.items[1].text, ch0.items[1].ok, g.scores], ["바다", false, [0, 0, 0, 0]]);
  for (let c = 1; c < 4; c++) submit(g, (c + 1) % 4, { text: g.chains[c].word }); // 다른 줄은 맞힘
  // 줄 1(그림 1→맞힘 2) · 줄 2(2→3) · 줄 3(3→0) 이 맞혔다
  assert.deepEqual(g.scores, [1, 1, 2, 2]);
  const before = g.scores.slice();
  // 칸 2(줄 0 은 사람 2): 그릴 말은 「바다」(앞 칸이 맞힌 말)
  assert.equal(view(g, 2)!.kind, "draw");
  assert.deepEqual(view(g, 2), { kind: "draw", word: "바다" });
  for (let c = 0; c < 4; c++) submit(g, (c + 2) % 4, { strokes: [{ c: 0, p: [1, 2, 3, 4] }] });
  // 칸 3(줄 0 은 사람 3): 정답은 「바다」 — 처음 말을 써도 틀림, 「바 다!」 는 맞음
  assert.equal(target(g, cur(g)!), "바다");
  submit(g, 3, { text: "바 다!" });
  assert.equal(ch0.items[3].ok, true);
  assert.deepEqual(g.scores.map((v, i) => v - before[i]), [0, 0, 1, 1], "맞힌 사람(3)·그린 사람(2) 별 하나씩");
  submit(g, 0, { text: g.chains[1].word }); // 줄 1 칸 3 정답은 칸 1 이 맞힌 말 = 처음 말(맞혔으니)
  assert.equal(g.chains[1].items[3].ok, true);
  submit(g, 1, { text: "   " });
  assert.equal(g.chains[2].items[3].ok, false, "빈 글자는 틀림");
  assert.equal(g.chains[2].items[3].text, "");
  submit(g, 2, { text: "x".repeat(20) });
  assert.equal(g.chains[3].items[3].text, "x".repeat(12), "글자는 12자까지 저장");
  assert.equal(g.state, "reveal");
  assert.equal(norm(" 「강 아지」!?~ "), "강아지");
});

test("S3 6칸: 정답 + 같은 갈래 적어도 3(남은 만큼) + 나머지는 아무 갈래, 섞여 있고 이 줄에 나온 말(처음 말 포함)은 헷갈리는 말에서 빠진다", () => {
  let checked = 0, deep = 0, extraSame = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const g = create(4, seed);
    while (g.state !== "over") {
      if (g.state === "reveal") { next(g); continue; }
      const T = cur(g)!;
      if (T.kind === "guess") {
        const ans = target(g, T), ch = g.chains[T.chain], c = T.choices!;
        assert.equal(c.length, 6);
        assert.equal(new Set(c).size, 6);
        assert.equal(c.filter((w) => w === ans).length, 1, "정답이 꼭 한 번");
        const cat = Object.keys(CATS).find((k) => CATS[k].includes(ans))!;
        const used = [ch.word, ...ch.items.map((it) => it.text).filter(Boolean)].filter((w) => w !== ans);
        // 같은 갈래는 「적어도 3」(남은 게 3 보다 적으면 남은 만큼) — 나머지 2 는 남은 낱말 전부에서 뽑아 같은 갈래가 또 섞일 수 있다(코드가 정본, 규격 「다른 갈래 2」 는 보장 아님)
        const avail = CATS[cat].filter((w) => w !== ans && !used.includes(w)).length;
        const sameN = c.filter((w) => w !== ans && CATS[cat].includes(w)).length;
        assert.ok(sameN >= Math.min(3, avail), `같은 갈래 ${sameN} < ${Math.min(3, avail)} (${ans}/${cat}: ${c})`);
        if (sameN > 3) extraSame++;
        assert.deepEqual(c.filter((w) => used.includes(w)), [], "이 줄에 나온 말이 헷갈리는 말로 섞였다");
        if (T.s === 3) deep++;
        checked++;
      }
      const i = T.p;
      submit(g, i, T.kind === "draw" ? { strokes: [] } : { text: T.choices![(seed + g.t) % 6] }); // 아무거나 골라 줄이 갈리게
    }
  }
  assert.ok(checked > 700 && deep > 300, `본 6칸 ${checked} · 칸 3 ${deep}`);
  assert.ok(extraSame > 0 && extraSame < checked * 0.3, `같은 갈래가 3 보다 많이 섞인 6칸 ${extraSame}/${checked}`);
  assert.ok(create(4, 1).turns.slice(0, 4).every((T) => !T.choices), "그리기 칸엔 6칸이 없다");
});

test("공개·바퀴: 바퀴 끝마다 reveal → next 로 다음 바퀴, 마지막 공개 뒤 over · 3명 마지막 그림은 별 없음(S7) · 별 합 = 맞힘 × 2 · lapScores 는 그 바퀴까지", () => {
  const g = create(3, 9), r = rng(5);
  assert.equal(next(g), false, "판 중엔 next 거절");
  const seenLaps: number[] = [];
  let guard = 0;
  while (g.state !== "over" && guard++ < 100) {
    if (g.state === "reveal") {
      seenLaps.push(g.lap);
      const s = lapScores(g, g.lap), ok = g.chains.filter((c) => c.lap <= g.lap).flatMap((c) => c.items).filter((it) => it.ok).length;
      assert.equal(s.reduce((a, b) => a + b, 0), ok * 2);
      assert.equal(submit(g, cur(g)?.p ?? 0, { text: "사과" }), false, "공개 중엔 못 낸다");
      next(g);
      continue;
    }
    const i = cur(g)!.p;
    submit(g, i, bot(view(g, i), "normal", r));
  }
  assert.deepEqual(seenLaps, [0, 1]);
  assert.deepEqual(lapScores(g, 1), g.scores);
  for (const ch of g.chains) { assert.deepEqual(ch.items.map((it) => it.kind), ["draw", "guess", "draw"]); assert.equal(ch.items[2].ok, undefined, "마지막 그림에 맞힘이 붙었다"); }
  assert.equal(next(g), false);
  assert.equal(submit(g, 0, { text: "사과" }), false);
  assert.equal(cur(g), null);
});

test("끝까지(봇끼리): 3명 칸 18 · 4명 칸 16 · 별 합 = 맞힘 × 2 · 같은 씨앗 같은 판 · 난수는 상태 JSON 밖", () => {
  for (const [n, cells] of [[3, 18], [4, 16]] as const) {
    const g = playOut(n, 5 * n, Array(n).fill("normal"));
    assert.equal(g.state, "over");
    assert.equal(g.chains.reduce((a, c) => a + c.items.length, 0), cells);
    const ok = g.chains.flatMap((c) => c.items).filter((it) => it.ok).length;
    assert.equal(g.scores.reduce((a, b) => a + b, 0), ok * 2);
  }
  const a = playOut(4, 42, ["easy", "normal", "easy", "normal"]), b = playOut(4, 42, ["easy", "normal", "easy", "normal"]), c = playOut(4, 43, ["easy", "normal", "easy", "normal"]);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.notEqual(JSON.stringify(a), JSON.stringify(c));
  assert.ok(!("r" in JSON.parse(JSON.stringify(a))));
});

test("봇 그리기: 밑그림 + 손떨림(보통 ±20 · 연습 ±50, 0–1000 안) · 연습은 가끔 한 획을 뺀다 · 밑그림 없는 말은 「?」 + 초성 힌트(S6)", () => {
  const r = rng(3);
  let dropped = 0;
  for (const w of WORDS) {
    const P = presetStrokes(w)!;
    for (const [lv, jit] of [["normal", 20], ["easy", 50]] as const) {
      const d = bot({ kind: "draw", word: w }, lv, r)!;
      assert.equal(d.hint, null);
      if (d.strokes!.length < P.length) { dropped++; assert.equal(lv, "easy"); continue; }
      d.strokes!.forEach((s, k) => { assert.equal(s.c, P[k].c); s.p.forEach((v, j) => assert.ok(Math.abs(v - P[k].p[j]) <= jit && v >= 0 && v <= 1000, `${w} ${lv}`)); });
    }
  }
  assert.ok(dropped > 3 && dropped < 30, `연습 봇이 뺀 획 ${dropped}/45`);
  const d = bot({ kind: "draw", word: "할머니" }, "normal", r)!;
  assert.equal(d.hint, "ㅎㅁㄴ");
  assert.equal(d.strokes!.length, 2);
  assert.equal(chosung("Dog 바다"), "Dog ㅂㄷ");
});

test("봇 맞히기: 보통은 밑그림을 거의 다 맞힌다 · 연습은 덜 · 힌트가 있으면 초성이 맞는 칸 · 빈 그림은 아무거나", () => {
  const r = rng(8);
  const acc = { normal: 0, easy: 0 }, N = 600;
  for (let k = 0; k < N; k++) {
    const choices = WORDS.slice().sort(() => r() - 0.5).slice(0, 6), ans = choices[k % 6];
    const drawn = bot({ kind: "draw", word: ans }, "normal", r)!.strokes!;
    for (const lv of ["normal", "easy"] as const) if (bot({ kind: "guess", strokes: drawn, hint: null, choices }, lv, r)!.text === ans) acc[lv]++;
  }
  assert.ok(acc.normal / N > 0.85, `보통 정답률 ${acc.normal / N} (규격 94 %)`);
  assert.ok(acc.easy / N > 0.4 && acc.easy / N < 0.8, `연습 정답률 ${acc.easy / N} (규격 59–60 %)`);
  const choices = ["바다", "사과", "구름", "나비", "우산", "기차"];
  for (let k = 0; k < 20; k++) assert.equal(bot({ kind: "guess", strokes: [{ c: 0, p: [1, 2, 3, 4] }], hint: "ㅂㄷ", choices }, "easy", r)!.text, "바다");
  for (let k = 0; k < 20; k++) assert.ok(choices.includes(bot({ kind: "guess", strokes: [], hint: null, choices }, "normal", r)!.text!));
  assert.equal(bot(null, "normal", r), null);
});

test("숨은 정보: 봇은 view 만 받는다 — 차례 아닌 자리는 null, 보기 열쇠는 건넨 것뿐, 봇은 그 밖을 안 읽고, 남의 숨은 값을 바꿔도 내 보기는 같다", () => {
  const DRAW = ["kind", "word"], GUESS = ["choices", "hint", "kind", "strokes"];
  const g = create(4, 21), r = rng(2);
  let draws = 0, guesses = 0, reads = 0, nulls = 0;
  while (g.state !== "over") {
    if (g.state === "reveal") { for (let i = 0; i < 4; i++) assert.equal(view(g, i), null, "공개 중엔 보기 없음"); next(g); continue; }
    const T = cur(g)!, me = T.p;
    for (let i = 0; i < 4; i++) if (i !== me) { assert.equal(view(g, i), null, `차례 아닌 자리 ${i} 에 보기가 있다`); nulls++; }
    const v = view(g, me)!;
    assert.deepEqual(Object.keys(v).sort(), v.kind === "draw" ? DRAW : GUESS, "보기 열쇠가 늘었다 — 화면에 안 건넨 것을 봇에 넘기나");
    if (v.kind === "draw") { assert.equal(v.word, target(g, T)); draws++; }
    else {
      const prev = g.chains[T.chain].items[T.s - 1];
      assert.notEqual(v.strokes, prev.strokes, "그림은 사본이어야 한다(봇이 판을 못 고친다)");
      assert.notEqual(v.choices, T.choices);
      assert.deepEqual(Object.keys(v.strokes[0] || { c: 0, p: [] }).sort(), ["c", "p"]);
      guesses++;
    }
    // 남의 숨은 값(다른 줄 전부 · 이 줄의 처음 말 · 앞의 앞 칸)을 바꿔도 내 보기는 같다
    const snap = JSON.stringify(v), save = JSON.stringify(g.chains);
    g.chains.forEach((ch, c) => { if (c !== T.chain) { ch.word = "바뀜"; ch.items.forEach((it) => { it.text = it.text && "바뀜"; it.strokes = it.strokes && []; }); } });
    const ch = g.chains[T.chain];
    if (T.s >= 2) { ch.word = "바뀜"; ch.items.slice(0, T.s - 1).forEach((it) => { it.text = it.text && "바뀜"; it.strokes = it.strokes && []; }); }
    assert.equal(JSON.stringify(view(g, me)), snap, `남의 값을 바꿨더니 자리 ${me} 의 보기가 바뀌었다(칸 ${T.s})`);
    JSON.parse(save).forEach((c: unknown, k: number) => Object.assign(g.chains[k], c));
    // 덫: 봇이 읽는 열쇠를 적는다(보기 밖을 읽거나 고치면 걸린다)
    const read = new Set<string>();
    const trap = new Proxy(v, { get(t, k) { read.add(String(k)); return Reflect.get(t, k); }, set() { throw new Error("봇이 보기를 고쳤다"); } }) as SketchView;
    const d = bot(trap, me % 2 ? "easy" : "normal", r);
    const outside = [...read].filter((k) => !(v.kind === "draw" ? DRAW : GUESS).includes(k));
    assert.deepEqual(outside, [], `봇이 보기 밖을 읽었다: ${outside}`);
    reads += read.size;
    submit(g, me, d);
  }
  assert.ok(reads > 0, "덫이 아무것도 못 봤다 — 덫이 헛돈다");
  assert.deepEqual([draws, guesses, nulls], [8, 8, 48]);
});

test("균형(규격 2절): 4명 보통 하나 vs 연습 셋 — 보통 자리가 1등(동점 포함)인 판이 많다", () => {
  let first = 0;
  const N = 300;
  for (let s = 1; s <= N; s++) {
    const seat = s % 4, lv = [0, 1, 2, 3].map((i) => (i === seat ? "normal" : "easy")) as ("easy" | "normal")[];
    const g = playOut(4, s, lv);
    if (g.scores[seat] === Math.max(...g.scores)) first++;
  }
  assert.ok(first / N > 0.5 && first / N < 0.85, `보통 1등 ${(first / N).toFixed(2)} (규격 시뮬 0.66)`);
});
