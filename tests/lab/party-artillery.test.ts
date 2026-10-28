// 실행: node --test "tests/lab/*.test.ts"
// 내기 모음 10 「간식 대포」 엔진(src/lab/party/artillery.ts) — 규칙(땅 파기 · 바람 · 낮잠 · 퐁당 · 바다 차오름 · 자기 맞음 · 처음 자리 최소 거리 · 차례 순서 · 간식 개수)과 봇.
// 규격 docs/lab-party-artillery-spec.md 1절·3절. 숫자는 코드(RULES)가 정본이다 — 규격 숫자와 같은지는 따로 한 번 본다.
// 시안 원본(docs/lab-party-artillery.js)과 같은 동작(부동소수까지)인지는 여기서 안 본다 — tmp/lab-party-port/equiv.mjs artillery 가 한 발마다 잰다.
// 「시간이 다 되면 겨눈 대로 저절로 쏜다」 는 화면 몫(엔진에 시간 없음) — tmp/lab-party-port/artillery-page-rig.cjs 가 #tl 로 잰다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { RULES, WEAPONS, STYLES, create, fire, next, carve, simulate, hint, view, bot, scores, alive, groundAt, type ArtGame, type Aim, type ShotRes } from "../../src/lab/party/artillery.ts";

function seqRng(seed: number) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 2 ** 32; }; }
const NC = RULES.W / RULES.COL;
/** 손으로 세운 판: 판판한 땅(윗면 y) · 바람 0 · 0번 차례. xs 는 친구 자리 */
function flat(xs: number[], y = 300): ArtGame {
  const g = create(xs.length, 1);
  g.h = Array(NC).fill(y);
  g.units.forEach((u, i) => { u.x = xs[i]; u.y = y; u.hp = 100; });
  g.hp0 = g.units.map(() => 100);
  g.wind = 0; g.water = RULES.WATER; g.turn = 0; g.first = 0; g.round = 1; g.state = "aim";
  return g;
}
/** 아무도 안 맞는 한 발: 가까운 맵 끝 바깥으로 비스듬히 세게(사거리 665 — 맵 밖에 떨어진다, 남의 머리 위로 지나간다) */
const away = (g: ArtGame): Aim => ({ angle: g.units[g.turn].x < RULES.W / 2 ? 150 : 30, power: 100, weapon: 0 });
/** 미리 쏴 보기로 조건에 맞는 겨눔을 찾는다 */
function findShot(g: ArtGame, ok: (r: ShotRes) => boolean, weapon = 0): Aim {
  const v = view(g);
  for (let p = 20; p <= 100; p += 2) for (let a = 5; a <= 175; a += 1) { const s = { angle: a, power: p, weapon }; if (ok(simulate(v, s))) return s; }
  throw new Error("겨눔을 못 찾았다");
}
/** 봇끼리 끝까지 */
function playOut(n: number, seed: number, levels: string[]): ArtGame {
  const g = create(n, seed), r = seqRng(seed * 13 + 7);
  let guard = 0;
  while (g.state !== "over" && guard++ < 400) {
    if (g.state === "aim") fire(g, bot(view(g), levels[g.turn], r));
    if (g.state === "next") next(g);
  }
  return g;
}

test("수치가 규격 1절과 같다(맵 720×450 · 기둥 4 · 수면 420 · 반지름 12 · 중력 300 · 첫 속도 480 · 바람 ±5×8 · 기운 100/100/90 · 2명 덤 +10 · 최소 거리 300/170/130 · 끝에서 40 · 30초 · 8바퀴 뒤 16 px) · 간식 넷", () => {
  assert.deepEqual([RULES.W, RULES.H, RULES.COL, RULES.WATER, RULES.R, RULES.G, RULES.VMAX, RULES.DT], [720, 450, 4, 420, 12, 300, 480, 1 / 60]);
  assert.deepEqual([RULES.WIND, RULES.WIND_ACC, RULES.EDGE, RULES.TIME, RULES.SD, RULES.RISE], [5, 8, 40, 30, 8, 16]);
  assert.deepEqual([RULES.HP[2], RULES.HP[3], RULES.HP[4]], [100, 100, 90]);
  assert.deepEqual([RULES.LATE[2], RULES.LATE[3], RULES.LATE[4]], [10, 0, 0]);
  assert.deepEqual([RULES.MIND[2], RULES.MIND[3], RULES.MIND[4]], [300, 170, 130]);
  assert.deepEqual(WEAPONS.map((w) => [w.id, w.r, w.dmg, w.knock, w.ammo, w.bounces || 0, w.split || 0]), [
    ["cookie", 26, 34, 14, -1, 0, 0], ["ball", 22, 30, 12, 2, 2, 0], ["melon", 50, 22, 26, 2, 0, 0], ["pop", 16, 16, 8, 2, 0, 3],
  ]);
  assert.deepEqual(STYLES, ["hills", "islands", "valley"]);
});

test("처음 자리: 씨앗 무작위 · 서로 최소 거리(2명 300 · 3명 170 · 4명 130)를 줄이지 않고 지킨다 · 끝에서 40 안쪽 · 바다 아님 · 양 끝 기둥은 늘 바다 · 맵 셋이 다 나온다", () => {
  const styles: Record<string, number> = {};
  for (const n of [2, 3, 4]) {
    const spots = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      const g = create(n, seed);
      styles[g.style] = (styles[g.style] || 0) + 1;
      assert.equal(g.mind, RULES.MIND[n], `seed ${seed} n ${n}: 최소 거리를 줄였다(${g.mind})`);
      const xs = g.units.map((u) => u.x).sort((a, b) => a - b);
      for (let k = 1; k < xs.length; k++) assert.ok(xs[k] - xs[k - 1] >= RULES.MIND[n] - 0.05, `seed ${seed} n ${n}: ${xs[k - 1]}–${xs[k]} 가 ${RULES.MIND[n]} 보다 가깝다`);
      for (const u of g.units) {
        assert.ok(u.x >= RULES.EDGE - 0.05 && u.x <= RULES.W - RULES.EDGE + 0.05, `끝에서 40 안쪽 ${u.x}`);
        assert.ok(u.y < RULES.WATER - 2, `바다 위에 섰다 ${u.y}`);
        assert.equal(u.y, groundAt(g.h, u.x), "발밑 = 땅 윗면");
      }
      assert.ok(g.h[0] >= RULES.WATER && g.h[NC - 1] >= RULES.WATER, "양 끝 기둥은 바다");
      spots.add(xs.map((x) => Math.round(x)).join(","));
    }
    assert.ok(spots.size > 290, `자리가 씨앗마다 달라야 한다(${spots.size}/300)`);
  }
  for (const s of STYLES) assert.ok(styles[s] > 100, `맵 ${s} ${styles[s]}`);
  assert.deepEqual(JSON.stringify(create(3, 77)), JSON.stringify(create(3, 77)), "같은 씨앗은 같은 판");
});

test("땅 파기: 원 안의 땅이 원 바닥까지 무너진다(heightmap) · 원 밖·이미 낮은 기둥은 그대로 · 바뀐 기둥 수를 돌려준다 · 한 발이 터진 자리를 판다", () => {
  const h = Array(NC).fill(300);
  const n = carve(h, 360, 300, 26);
  assert.equal(n, 12, "|dx| < 26 인 기둥 84..95");
  for (let c = 0; c < NC; c++) {
    const dx = c * 4 + 2 - 360;
    if (Math.abs(dx) >= 26) assert.equal(h[c], 300, `원 밖 기둥 ${c}`);
    else assert.equal(h[c], Math.round((300 + Math.sqrt(26 * 26 - dx * dx)) * 10) / 10, `기둥 ${c} = 원 바닥`);
  }
  assert.equal(carve(h, 360, 250, 20), 0, "땅 위 허공에서 터지면 안 파인다");
  const deep = h.slice(); assert.equal(carve(deep, 360, 330, 10) > 0, true, "더 깊이 터지면 더 판다");
  const h2 = Array(NC).fill(300); carve(h2, 0, 440, 60); assert.ok(h2.every((y) => y <= RULES.H), "바닥(450) 아래로는 안 판다");
  // 한 발: 쿠키가 떨어진 자리의 기둥이 내려간다
  const g = flat([100, 600]);
  const s = findShot(g, (r) => r.booms.length === 1 && Math.abs(r.booms[0].x - 350) < 30 && r.dmg.every((d) => d === 0));
  const before = g.h.slice(), res = fire(g, s)!;
  const c = Math.floor(res.booms[0].x / 4);
  assert.ok(g.h[c] > before[c], "터진 기둥이 내려간다");
  assert.equal(g.h.filter((y, k) => y !== before[k]).length > 8, true);
});

test("바람: 차례마다 −5..5 정수로 새로 · 바람 쪽으로 간식이 밀린다(같은 겨눔, −5 < 0 < +5 로 떨어진 자리) · 궤적 힌트도 바람을 탄다", () => {
  const seen = new Set<number>();
  for (let seed = 1; seed <= 40; seed++) {
    const g = create(2, seed);
    for (let k = 0; k < 6 && g.state !== "over"; k++) {
      assert.ok(Number.isInteger(g.wind) && Math.abs(g.wind) <= 5, `바람 ${g.wind}`);
      seen.add(g.wind);
      fire(g, away(g)); if (g.state === "next") next(g);
    }
  }
  assert.equal(seen.size, 11, "−5..5 가 다 나온다");
  const land = (w: number) => { const g = flat([100, 680]); g.wind = w; return fire(g, { angle: 45, power: 70, weapon: 0 })!.booms[0].x; };
  const [l, z, r] = [land(-5), land(0), land(5)];
  assert.ok(l < z - 20 && z < r - 20, `떨어진 자리 ${l} · ${z} · ${r}`);
  const g = flat([100, 680]);
  const h0 = hint(view(g), { angle: 60, power: 80, weapon: 0 }, 120);
  g.wind = 5; const h5 = hint(view(g), { angle: 60, power: 80, weapon: 0 }, 120);
  const k = Math.min(h0.length, h5.length) - 1;
  assert.ok(k > 5 && h5[k][0] > h0[k][0], "같은 걸음의 힌트 점이 바람 쪽으로");
  for (const p of h5) assert.ok(Math.hypot(p[0] - 100, p[1] - 288) <= 120 + 1e-9, "힌트는 친구 둘레 len 안만");
});

test("맞음: 반경+12 안의 친구 기운이 (0.4+0.6×가까움)×기운값 만큼 준다 · 터진 쪽 반대로 밀린다 · 쏜 친구 자신도 맞는다", () => {
  const g = flat([200, 600]);
  const s = findShot(g, (r) => r.dmg[1] > 0 && r.dmg[0] === 0);
  const x1 = g.units[1].x, res = fire(g, s)!;
  assert.equal(g.units[1].hp, 100 - res.dmg[1]);
  assert.ok(res.dmg[1] >= Math.round(34 * 0.4) && res.dmg[1] <= 34, `기운 −${res.dmg[1]}`);
  const b = res.booms[0];
  assert.equal(Math.sign(g.units[1].x - x1) || 1, g.units[1].x >= b.x ? 1 : -1, "터진 쪽 반대로");
  // 자기 맞음: 바로 위로 약하게 쏘면 제 머리에 떨어진다
  const m = flat([200, 600]);
  const r2 = fire(m, { angle: 90, power: 30, weapon: 0 })!;
  assert.ok(r2.dmg[0] > 0 && r2.dmg[1] === 0, `자기 맞음 ${r2.dmg}`);
  assert.equal(m.units[0].hp, 100 - r2.dmg[0]);
});

test("낮잠: 기운 0 이면 나간다(why nap) · 퐁당: 발밑이 바다(수면 −2 아래)면 나간다(why water) · 맵 밖으로 밀리면 edge · 간식이 바다에 닿으면 안 터진다", () => {
  const g = flat([200, 600]);
  g.units[1].hp = 5;
  const s = findShot(g, (r) => r.dmg[1] >= 5 && r.dmg[0] === 0);
  const res = fire(g, s)!;
  assert.deepEqual(res.outs, [{ i: 1, why: "nap" }]);
  assert.deepEqual([g.state, g.units[1].alive, g.units[1].hp, scores(g)], ["over", false, 0, [2, 1]]);
  // 퐁당: 1번 발밑 기둥을 바다로(수면 420 아래) — 아무도 안 맞는 한 발 뒤 내려앉기에서 나감
  const w = flat([60, 400, 600]);
  for (let c = Math.floor(400 / 4) - 4; c <= Math.floor(400 / 4) + 4; c++) w.h[c] = 430;
  const rw = fire(w, away(w))!;
  assert.deepEqual([rw.booms.length, rw.outs], [0, [{ i: 1, why: "water" }]]);
  assert.equal(w.state, "next", "셋 중 하나만 나가면 판은 이어진다");
  assert.deepEqual(w.out, [{ i: 1, why: "water", turn: 0, place: 1 }]);
  // 맵 밖
  const e = flat([60, 400, 600]); e.units[2].x = 721;
  assert.deepEqual(fire(e, away(e))!.outs, [{ i: 2, why: "edge" }]);
  // 바다에 떨어진 간식: 물보라만, 땅·기운 그대로
  const sp = flat([100, 600]);
  for (let c = 60; c < 120; c++) sp.h[c] = 440;
  const s2 = findShot(sp, (r) => r.splashes.length === 1 && r.booms.length === 0);
  const hb = sp.h.slice(), r3 = fire(sp, s2)!;
  assert.equal(r3.splashes[0].y, RULES.WATER);
  assert.deepEqual([sp.h, r3.dmg], [hb, [0, 0]]);
});

test("바다 차오름: 8바퀴까지는 수면 420 · 9바퀴부터 차례마다 16 px 오른다 · 잠긴 친구는 함께 나가고 기운이 적은 쪽이 먼저, 같으면 같은 등수", () => {
  const g = flat([60, 660]);
  g.units[1].hp = 80;
  const log: [number, number][] = [];
  let guard = 0;
  while (g.state !== "over" && guard++ < 200) { fire(g, away(g)); if (g.state === "next") { next(g); log.push([g.round, g.water]); } }
  for (const [round, water] of log) if (round <= 8) assert.equal(water, 420, `바퀴 ${round}`);
  const firstRise = log.findIndex(([, w]) => w < 420);
  assert.equal(log[firstRise][0], 9, "9바퀴 첫 차례에 처음 오른다");
  for (let k = firstRise + 1; k < log.length; k++) assert.equal(log[firstRise][1] - log[k][1], 16 * (k - firstRise), "차례마다 16");
  assert.equal(g.state, "over");
  assert.deepEqual(g.out.map((o) => [o.i, o.why, o.place]), [[1, "water", 1], [0, "water", 2]], "기운 80 이 100 보다 먼저 나간 것으로");
  assert.deepEqual(scores(g), [2, 1]);
  const t = flat([60, 100, 660]);
  while (t.state !== "over") { assert.deepEqual(fire(t, away(t))!.dmg, [0, 0, 0]); if (t.state === "next") next(t); }
  assert.deepEqual(t.out.map((o) => o.place), [1, 1, 1], "기운이 같으면 같은 등수");
  assert.deepEqual(alive(t), []);
});

test("차례: 첫 사람은 무작위 · 그다음 자리 순(나간 친구 건너뜀) · 2명 판 나중 쏘는 친구 기운 +10 · 간식은 2개씩, 다 쓰면 쿠키", () => {
  const firsts = new Set<number>();
  for (let seed = 1; seed <= 60; seed++) {
    const g = create(4, seed); firsts.add(g.first);
    assert.equal(g.turn, g.first);
    const g2 = create(2, seed);
    assert.deepEqual(g2.units.map((u) => u.hp), g2.units.map((u) => (u.i === g2.first ? 100 : 110)));
    assert.deepEqual(g2.hp0, g2.units.map((u) => u.hp));
  }
  assert.equal(firsts.size, 4);
  const g = flat([60, 250, 450, 660]);
  g.units[2].alive = false;
  const order: number[] = [];
  for (let k = 0; k < 6; k++) { order.push(g.turn); assert.deepEqual(fire(g, away(g))!.dmg, [0, 0, 0, 0]); next(g); }
  assert.deepEqual(order, [0, 1, 3, 0, 1, 3]);
  assert.equal(g.round, 3);
  const a = flat([60, 660]);
  const take = (w: number) => { a.turn = 0; a.state = "aim"; return fire(a, { angle: 180, power: 100, weapon: w })!.weapon; };
  assert.deepEqual([take(2), take(2), take(2), take(9)], ["melon", "melon", "cookie", "cookie"]);
  assert.deepEqual(a.units[0].ammo, [-1, 2, 0, 2]);
  assert.equal(fire(a, away(a)), null, "next 상태에서 또 쏘기는 거절");
  assert.equal((a.state = "aim", next(a)), null, "aim 상태에서 next 는 거절");
});

test("보기에는 씨앗·난수 상태가 없다 — 보기 열쇠 = 화면에 보이는 것, 난수 상태를 바꿔도 보기는 같다, 봇은 보기 밖을 안 읽는다", () => {
  const KEYS = ["h", "n", "round", "turn", "turns", "units", "water", "wind"];
  const UKEYS = ["aim", "alive", "ammo", "hp", "i", "x", "y"];
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
  for (let s = 1; s <= 6; s++) {
    const g = create(2 + (s % 3), s);
    const v = view(g);
    assert.deepEqual(Object.keys(v).sort(), KEYS, "보기 열쇠가 늘었다 — 화면에 안 보이는 것을 봇에 넘기나");
    for (const u of v.units) assert.deepEqual(Object.keys(u).sort(), UKEYS);
    const flat = JSON.stringify(v);
    for (const bad of ["seed", "\"rs\"", "first", "log", "style", "mind", "place", "\"out\""]) assert.ok(!flat.includes(bad), `보기에 ${bad}`);
    g.rs = (g.rs * 7 + 13) >>> 0; g.seed = 999;
    assert.equal(JSON.stringify(view(g)), flat, "난수 상태를 바꿨더니 보기가 달라졌다");
    assert.notEqual(v.h, g.h, "보기는 사본");
    bot(trap(v, ""), s % 2 ? "easy" : "normal", seqRng(s));
  }
  assert.ok(read.size > 5, `덫이 아무것도 못 봤다(${read.size})`);
  // 봇이 읽은 자리: 맨 위는 보기 열쇠, 친구 안은 친구 보기 열쇠뿐(배열 방법·길이는 읽어도 된다)
  const ARR = new Set(["length", "slice", "map", "filter", "forEach", "concat", "constructor"]);
  for (const k of read) {
    const m = k.match(/^units\[\]\.([a-z]+)/i);
    if (m) assert.ok(UKEYS.includes(m[1]) || ARR.has(m[1]), `봇이 친구의 ${m[1]} 를 읽었다`);
  }
  for (const k of read) assert.ok(KEYS.includes(k.split(/[.[]/)[0]), `봇이 ${k} 를 읽었다`);
});

test("끝까지: 2/3/4명 봇끼리 — 판이 끝나고 남은 친구 = 인원 점수 · 나간 수 = 인원−1(함께 잠기면 인원) · 등수는 나간 순서 · 쏜 수 = 기록 수", () => {
  for (const n of [2, 3, 4]) for (let seed = 1; seed <= 4; seed++) {
    const g = playOut(n, seed * 11, Array(n).fill(seed % 2 ? "easy" : "normal"));
    assert.equal(g.state, "over", `n ${n} seed ${seed}`);
    const sc = scores(g), left = alive(g);
    assert.ok(left.length <= 1);
    assert.equal(g.out.length, n - left.length);
    for (const u of left) assert.equal(sc[u.i], n);
    for (let k = 1; k < g.out.length; k++) assert.ok(g.out[k].place >= g.out[k - 1].place, "등수는 나간 순서대로 커진다");
    assert.equal(g.log.length, g.shots);
    assert.ok(g.units.every((u) => u.alive || u.hp === 0));
  }
});

test("봇: 각도 0–180 · 힘 10–100 · 가진 간식만 · 균형(규격 2절): 2명 보통 vs 연습 — 보통이 1등인 판이 많다", () => {
  let normalWins = 0;
  const N = 16;
  for (let s = 1; s <= N; s++) {
    const g = create(2, s * 7);
    const lv = s % 2 ? ["normal", "easy"] : ["easy", "normal"], r = seqRng(s);
    let guard = 0;
    while (g.state !== "over" && guard++ < 200) {
      if (g.state === "aim") {
        const p = bot(view(g), lv[g.turn], r);
        assert.ok(p.angle >= 0 && p.angle <= 180 && p.power >= 10 && p.power <= 100);
        assert.notEqual(g.units[g.turn].ammo[p.weapon], 0, "다 쓴 간식을 골랐다");
        fire(g, p);
      }
      if (g.state === "next") next(g);
    }
    const sc = scores(g), ni = lv.indexOf("normal");
    if (sc[ni] > sc[1 - ni]) normalWins++;
  }
  assert.ok(normalWins >= N * 0.75, `보통 1등 ${normalWins}/${N} (규격 시뮬 95 %)`);
});
