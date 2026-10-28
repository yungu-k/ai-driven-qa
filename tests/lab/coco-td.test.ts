// 실행: node --test "tests/lab/*.test.ts"   (Node 22.18+ 는 .ts 를 그대로 돌린다)
// 코코 타워 디펜스 엔진(src/lab/coco-td/engine.ts) — tests/lab/release-defense.test.ts 의 동작 검사를 그대로 새 엔진에 돌린다(키·수치가 같다).
// 끝에 붙인 두 검사: 화면 이름에 QA·업무 낱말이 없나(tmp/lab-surv/td-terms.cjs 의 낱말 목록), 이름이 docs/lab-coco-td-engine.js 와 같나(vm 으로 원본을 돌려 맞댄다).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DATA,
  create,
  step,
  build,
  upgrade,
  sell,
  startWave,
  useItem,
  addLegend,
  towersOf,
  refund,
  spent,
  upgradeCost,
  posAt,
  type Game,
  type Enemy,
  type Grade,
  type GameEvent,
  type Pt,
  type TowerKind,
  type Branch,
} from "../../src/lab/coco-td/engine.ts";

/** 손으로 적 하나를 길 위 dist 자리에 세운다(speed 0 이면 그 자리에 선다) */
function putEnemy(g: Game, grade: Grade, over: Partial<Enemy> = {}): Enemy {
  const gr = DATA.GRADES[grade];
  const e: Enemy = {
    id: g.nextId++, grade, traits: [], lane: 0, dist: 0, hp: gr.hp, maxHp: gr.hp, speed: 0, armor: gr.armor, regen: 0, dodge: 0,
    stealth: false, slow: 0, mark: 0, vuln: 0, flash: 0, x: 0, y: 0, dead: false,
    ...over,
  };
  [e.x, e.y] = posAt(g.lanes[e.lane], e.dist);
  g.enemies.push(e);
  return e;
}

/** 칸 중심에서 가장 가까운 길(0번) 위 거리 */
function nearestDist(g: Game, [x, y]: Pt): { dist: number; gap: number } {
  const lane = g.lanes[0];
  let best = { dist: 0, gap: Infinity };
  for (let d = 0; d <= lane.total; d += 0.05) {
    const [px, py] = posAt(lane, d);
    const gap = Math.hypot(px - x - 0.5, py - y - 0.5);
    if (gap < best.gap) best = { dist: d, gap };
  }
  return best;
}

const of = <K extends GameEvent["e"]>(evs: GameEvent[], k: K) => evs.filter((v): v is Extract<GameEvent, { e: K }> => v.e === k);

/** 단위 테스트 하나를 첫 칸에 짓고, 그 바로 앞 길 위에 적을 세운다 */
function unitVs(grade: Grade, over: Partial<Enemy> = {}) {
  const g = create(0, 1);
  const slot = g.slots[0];
  assert.ok(build(g, "unit", slot[0], slot[1]), "지을 수 있어야 한다");
  const near = nearestDist(g, slot);
  assert.ok(near.gap < 1.5, `칸 ${slot} 이 길에서 너무 멀다(${near.gap})`);
  const e = putEnemy(g, grade, { dist: near.dist, ...over });
  g.events.length = 0;
  return { g, e };
}

test("방어 셈: 피해 5 가 방어 3 을 만나면 2, 방어가 커도 최소 20 %", () => {
  {
    const { g } = unitVs("major", { hp: 100, armor: 3 });
    step(g);
    const hits = of(g.events, "hit");
    assert.ok(hits.length > 0, "한 발도 안 맞았다");
    assert.equal(hits[0].d, 2);
  }
  {
    const { g } = unitVs("major", { hp: 100, armor: 10 });
    step(g);
    const hits = of(g.events, "hit");
    assert.ok(hits.length > 0, "한 발도 안 맞았다");
    assert.equal(hits[0].d, 1); // 5 × 0.2
  }
});

test("같은 준비 시간에 지은 것은 100 %, 웨이브가 시작되면 70 %(정수 백분율)", () => {
  const g = create(0, 1);
  const [x, y] = g.slots[0];
  const t = build(g, "integ", x, y)!;
  assert.ok(t);
  assert.equal(refund(g, t), 90);
  startWave(g);
  assert.equal(refund(g, t), 63); // 90 × 0.7 = 62.999… 로 62 가 되면 안 된다
  const before = g.money;
  assert.equal(sell(g, t), 63);
  assert.equal(g.money, before + 63);
  assert.equal(g.towers.length, 0);
});

test("짓기·올리기가 실패하면 null/false 이고 상태가 안 바뀐다", () => {
  const g = create(0, 1);
  const [x, y] = g.slots[0];
  const snap = () => JSON.stringify({ m: g.money, t: g.towers, ev: g.events.length });
  const s0 = snap();
  assert.equal(build(g, "review", x, y), null); // 맵1 바퀴1 에 아직 안 열렸다
  assert.equal(build(g, "unit", 1, 1), null); // 길 위
  g.money = 10;
  assert.equal(build(g, "unit", x, y), null); // 돈 모자람
  g.money = 160;
  assert.equal(snap(), s0);
  const t = build(g, "unit", x, y)!;
  assert.ok(t);
  g.money = 0;
  const s1 = snap();
  assert.equal(upgrade(g, t), false);
  assert.equal(snap(), s1);
  // 3단계에서 갈래 없이 올리면 실패
  g.money = 9999;
  assert.ok(upgrade(g, t) && upgrade(g, t));
  assert.equal(upgradeCost(t), null);
  assert.equal(upgrade(g, t), false);
  assert.ok(upgrade(g, t, "b"));
  assert.equal(spent(t), 50 + 40 + 70 + 120);
  assert.equal(upgrade(g, t, "a"), false); // 갈래는 한 번뿐
});

test("2× 는 1× 와 같은 시드에서 같은 결과(단계 수만 같으면)", () => {
  // 같은 단계 번호에 같은 입력을 넣는다. 1× 는 프레임마다 1 단계, 2× 는 2 단계.
  const plan: [number, TowerKind | "+", number][] = [
    [0, "unit", 0], [0, "unit", 6], [0, "integ", 12], [300, "lint", 3], [600, "+", 0], [900, "+", 1], [1500, "integ", 20], [2400, "+", 2],
  ];
  function play(perFrame: number) {
    const g = create(1, 7);
    let n = 0;
    const act = () => {
      for (const [at, k, i] of plan) {
        if (at !== n) continue;
        if (k === "+") upgrade(g, g.towers[i]);
        else build(g, k, g.slots[i][0], g.slots[i][1]);
      }
      if (g.state === "prep" && g.prepLeft == null) startWave(g);
    };
    let events = 0;
    for (let frame = 0; n < 60 * 60 * 6 && g.state !== "won" && g.state !== "lost"; frame++)
      for (let k = 0; k < perFrame; k++) {
        act();
        step(g);
        n++;
        events += g.events.length;
        g.events.length = 0;
      }
    return { g, n, events };
  }
  const a = play(1), b = play(2);
  assert.ok(a.g.kills > 20 && a.g.wave >= 3, `판이 거의 안 굴렀다(처치 ${a.g.kills}, 웨이브 ${a.g.wave})`);
  assert.equal(a.n, b.n);
  assert.equal(a.events, b.events);
  const view = (g: Game) => JSON.stringify({ ...g, rand: undefined, builtThisPrep: [...g.builtThisPrep] });
  assert.equal(view(a.g), view(b.g));
});

test("Critical 이 죽으면 Minor 둘이 그 자리와 0.3 뒤에 생긴다", () => {
  const g = create(0, 1);
  const c = putEnemy(g, "critical", { hp: 1, dist: 6 });
  g.items = ["hammer"];
  assert.ok(useItem(g, 0, c.x, c.y));
  assert.ok(of(g.events, "kill").some((k) => k.en === c), "Critical 이 안 죽었다");
  const born = of(g.events, "spawn").map((s) => s.en);
  assert.equal(born.length, 2);
  for (const m of born) {
    assert.equal(m.grade, "minor");
    assert.equal(m.lane, c.lane);
  }
  assert.deepEqual(born.map((m) => m.dist), [6, 6 - 0.3]);
  assert.equal(g.enemies.filter((e) => !e.dead && e.grade === "minor").length, 2);
});

test("지속 피해(린터)는 보스 방패를 못 깎는다 — 한 방(단위 테스트)은 깎는다", () => {
  const g = create(4, 1);
  g.money = 99999;
  g.wave = g.waves.length - 1; // 마지막 웨이브 = Blocker
  assert.ok(startWave(g));
  step(g);
  const boss = g.enemies.find((e) => e.grade === "blocker");
  assert.ok(boss, "보스가 안 나왔다");
  // 보스는 화면 밖에서 나온다 — 길에 가장 붙은 칸 앞으로 옮겨 세운다(speed 0)
  const spot = g.slots.map((s) => ({ s, ...nearestDist(g, s) })).sort((a, b) => a.gap - b.gap)[0];
  boss.dist = spot.dist;
  boss.speed = 0;
  [boss.x, boss.y] = posAt(g.lanes[0], boss.dist);
  const lintR = DATA.TOWERS.lint.lv[0].range!;
  const gapTo = ([x, y]: Pt) => Math.hypot(boss.x - x - 0.5, boss.y - y - 0.5);
  const slots = g.slots.slice().sort((p, q) => gapTo(p) - gapTo(q));
  assert.ok(gapTo(slots[0]) < lintR - 0.2, "보스 옆에 린터 칸이 없다");
  build(g, "lint", slots[0][0], slots[0][1]);
  let ticked = 0;
  for (let i = 0; i < 30; i++) {
    step(g);
    if (gapTo(slots[0]) <= lintR) ticked++;
    assert.equal(boss.shield, DATA.BOSS.phases[0].shield);
    assert.equal(boss.hp, boss.maxHp);
  }
  assert.ok(ticked > 20, `린터 범위 안에 있던 프레임이 적다(${ticked})`);
  // 대조: 한 방은 방패를 한 칸 깎는다(이게 안 되면 위 검사는 헛돈다)
  const unitSlot = slots.find((s) => gapTo(s) < DATA.TOWERS.unit.lv[0].range! - 0.2 && !g.towers.some((t) => t.x === s[0] && t.y === s[1]))!;
  assert.ok(unitSlot);
  build(g, "unit", unitSlot[0], unitSlot[1]);
  g.events.length = 0;
  step(g);
  assert.ok(of(g.events, "shield").length > 0, "한 방이 방패에 안 닿았다");
  assert.ok(boss.shield! < DATA.BOSS.phases[0].shield!);
});

/** 웨이브 2(Trivial 10 + Minor 3)를 부르고 나온 적들 */
function wave2Spawns(lap: number): Enemy[] {
  const g = create(0, 1, { lap });
  g.wave = 1;
  startWave(g);
  const out: Enemy[] = [];
  for (let i = 0; i < 60 * 12; i++) {
    step(g);
    out.push(...of(g.events, "spawn").map((s) => s.en));
    g.events.length = 0;
  }
  return out;
}

test("바퀴 3 에서 Minor 에 은신이 붙는다(바퀴 1·2 엔 없다)", () => {
  for (const lap of [1, 2, 3]) {
    const all = wave2Spawns(lap);
    const minors = all.filter((e) => e.grade === "minor");
    const trivials = all.filter((e) => e.grade === "trivial");
    assert.equal(minors.length, 3, `바퀴 ${lap}: Minor 가 ${minors.length} 마리`);
    assert.equal(trivials.length, 10, `바퀴 ${lap}: Trivial 이 ${trivials.length} 마리`);
    for (const m of minors) {
      assert.equal(m.stealth, lap >= 3, `바퀴 ${lap} Minor 은신`);
      assert.equal(m.traits.includes("stealth"), lap >= 3);
    }
    for (const t of trivials) assert.equal(t.traits.includes("fast"), lap >= 2, `바퀴 ${lap} Trivial 빠름`);
  }
});

test("아이템 칸이 꽉 찼을 때 드랍은 동전이 된다", () => {
  for (const held of [2, 3]) {
    const { g, e } = unitVs("trivial", { hp: 1 });
    g.rand = () => 0; // 드랍 확률을 반드시 넘긴다, 풀의 첫 아이템(손바닥)
    g.items = Array(held).fill("slipper");
    const before = g.money;
    step(g);
    assert.ok(of(g.events, "kill").some((k) => k.en === e), "버그가 안 죽었다");
    const coin = of(g.events, "dropCoin"), drop = of(g.events, "drop");
    if (held === 3) {
      assert.equal(coin.length, 1);
      assert.equal(drop.length, 0);
      assert.equal(coin[0].coin, DATA.ITEMS.kinds.palm.coin);
      assert.equal(g.items.length, 3);
      assert.equal(g.money, before + DATA.GRADES.trivial.reward + DATA.ITEMS.kinds.palm.coin);
    } else {
      assert.equal(drop.length, 1);
      assert.equal(coin.length, 0);
      assert.deepEqual(g.items, ["slipper", "slipper", "palm"]);
      assert.equal(g.money, before + DATA.GRADES.trivial.reward);
    }
  }
});

test("addLegend: 같은 것은 강화(최대 3), 칸이 차면 고르게 한다", () => {
  let r = addLegend([], "bugbomb");
  assert.deepEqual(r, { list: [{ kind: "bugbomb", lv: 1 }], needChoice: false });
  r = addLegend([{ kind: "bugbomb", lv: 3 }], "bugbomb");
  assert.equal(r.list[0].lv, 3);
  const full = [{ kind: "bugbomb" as const, lv: 2 }, { kind: "exterminator" as const, lv: 1 }];
  r = addLegend(full, "bigslipper");
  assert.equal(r.needChoice, true);
  assert.deepEqual(r.list, full);
  assert.deepEqual(addLegend(full, "bigslipper", 0).list.map((l) => l.kind), ["bigslipper", "exterminator"]);
  assert.deepEqual(addLegend(full, "bigslipper", -1).list, full);
  assert.notEqual(addLegend(full, "bugbomb").list[0], full[0]); // 원본을 안 고친다
  assert.equal(full[0].lv, 2);
});

// ── 균형 회귀: 기준 봇 v1.0(tmp/lab-defense/sim.cjs 의 ref 정책을 그대로 옮김)이 다섯 맵을 다 이긴다 ──
const POLICY: Record<string, { seq: string[]; loop: string[] }> = {
  dev: { seq: ["unit", "unit", "integ", "lint", "+unit", "+unit", "integ", "+integ", "unit", "+integ", "+unit", "+unit"], loop: ["unit", "+unit", "integ", "+integ", "+unit^b", "+integ^a"] },
  staging: { seq: ["unit", "unit", "integ", "lint", "review", "+unit", "+unit", "+integ", "review", "+review"], loop: ["integ", "+integ", "+review", "unit", "+unit", "+review^a", "+integ^a", "+unit^b", "lint", "+lint"] },
  prod: { seq: ["unit", "monitor", "integ", "unit", "lint", "review", "+integ", "+unit", "monitor", "+review"], loop: ["integ", "+integ", "review", "+review", "+monitor", "+unit", "+integ^a", "+review^a", "+monitor^b", "+unit^b", "lint", "+lint"] },
  warroom: { seq: ["integ", "unit", "monitor", "lint", "review", "integ", "ci", "+integ", "+review", "+unit"], loop: ["integ", "+integ", "review", "+review", "ci", "+ci", "+monitor", "+integ^a", "+review^a", "+ci^a", "unit", "+unit", "+unit^b", "+lint^b"] },
  release: { seq: ["integ", "unit", "unit", "monitor", "lint", "review", "integ", "ci", "+integ", "+review"], loop: ["integ", "+integ", "review", "+review", "ci", "+ci", "unit", "+unit", "+monitor", "+integ^a", "+review^a", "+unit^a", "+ci^a", "lint", "+lint^b"] },
};
function coverage(g: Game, kind: TowerKind, x: number, y: number): number {
  const def = DATA.TOWERS[kind];
  const r = def.lv[0].range ?? 1.5;
  if (kind === "ci") return g.towers.filter((t) => Math.hypot(t.x - x, t.y - y) <= def.lv[0].range! && t.kind !== "ci").length * 10;
  let c = 0;
  for (const lane of g.lanes)
    for (let d = 0; d < lane.total; d += 0.25) {
      const [px, py] = posAt(lane, d);
      if (Math.hypot(px - x - 0.5, py - y - 0.5) <= r) c += 1 + d / lane.total;
    }
  return c;
}
function act(g: Game, tok: string): "ok" | "skip" | "wait" {
  if (tok[0] === "+") {
    const [kind, br] = tok.slice(1).split("^") as [TowerKind, Branch | undefined];
    const cands = g.towers.filter((t) => t.kind === kind && !t.branch && (br ? t.level === 2 : t.level < 2));
    if (!cands.length) return "skip";
    cands.sort((a, b) => a.level - b.level);
    const c = upgradeCost(cands[0], br)!;
    if (g.money < c) return "wait";
    return upgrade(g, cands[0], br) ? "ok" : "wait";
  }
  const kind = tok as TowerKind;
  if (!towersOf(g).includes(kind)) return "skip";
  if (g.money < DATA.TOWERS[kind].cost) return "wait";
  let best: Pt | null = null, bs = -1;
  for (const [x, y] of g.slots) {
    if (g.towers.some((t) => t.x === x && t.y === y)) continue;
    const s = coverage(g, kind, x, y);
    if (s > bs) { bs = s; best = [x, y]; }
  }
  if (!best || bs <= 0) return "skip";
  return build(g, kind, best[0], best[1]) ? "ok" : "wait";
}
function botRun(mi: number, seed: number): Game {
  const g = create(mi, seed);
  g.noItems = true;
  const pol = POLICY[g.map.id];
  let i = 0, skips = 0;
  const next = () => (i < pol.seq.length ? pol.seq[i] : pol.loop[(i - pol.seq.length) % pol.loop.length]);
  for (let guard = 0; guard < 60 * 60 * 40 && g.state !== "won" && g.state !== "lost"; guard++) {
    for (let k = 0; k < 4; k++) {
      const r = act(g, next());
      if (r === "ok" || r === "skip") { i++; if (r === "skip" && ++skips > 50) break; } else break;
    }
    if (g.state === "prep" && (g.prepLeft == null || g.prepLeft <= 0.02)) startWave(g);
    step(g);
    g.events.length = 0;
  }
  return g;
}

test("균형 회귀: 기준 봇 v1.0 이 다섯 맵을 다 이긴다(시드 1)", () => {
  const t0 = performance.now();
  const res = DATA.MAPS.map((m, mi) => {
    const g = botRun(mi, 1);
    return `${m.id}:${g.state}@w${g.wave}/g${g.gate}`;
  });
  const ms = Math.round(performance.now() - t0);
  assert.equal(res.length, 5);
  assert.deepEqual(res.map((r) => r.split("@")[0]), DATA.MAPS.map((m) => `${m.id}:won`), res.join(" "));
  assert.ok(ms < 20000, `시뮬이 느리다(${ms} ms) — 느린 검사는 꺼진 검사다`);
});

// ── 코코 TD 이름 검사 ────────────────────────────────────
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
// 옛 릴리스 디펜스(QA 판) 엔진은 10-28 운영 코드에서 지웠다 — 비교 기준은 디자인 정본 docs/lab-defense-engine.js 를 vm 으로 돌려 얻는다
function loadDocsEngine(file: string) {
  const ctx: Record<string, unknown> = { console, Math };
  ctx.globalThis = ctx;
  runInNewContext(readFileSync(new URL(`../../docs/${file}`, import.meta.url), "utf8"), ctx);
  return ctx.TDEngine as { DATA: typeof DATA };
}
const RD = loadDocsEngine("lab-defense-engine.js");

/** DATA 를 다 훑어 [경로, 값] 잎을 모은다. 함수 칸은 뺀다(LAPS.name 은 따로 본다) */
function leaves(o: unknown, at = "DATA", out: [string, unknown][] = []): [string, unknown][] {
  if (typeof o === "function") return out;
  if (o === null || typeof o !== "object") { out.push([at, o]); return out; }
  for (const k of Object.keys(o as object)) leaves((o as Record<string, unknown>)[k], `${at}.${k}`, out);
  return out;
}
const strings = (d: unknown) => leaves(d).filter(([, v]) => typeof v === "string") as [string, string][];
const laps = (d: { LAPS: { name: (k: number) => string } }) => [1, 2, 3, 7, 10].map((k) => d.LAPS.name(k));

// tmp/lab-surv/td-terms.cjs 의 낱말 목록·판정 그대로(금지 대상이라 목록은 그대로 적는다 — 이 칸 자체는 화면에 안 나간다)
const WORDS = ["버그", "테스트", "리뷰", "배포", "운영", "릴리스", "CI", "린터", "커버리지", "회귀", "모니터링", "대시보드", "캐시", "러너", "게이트", "버전", "장애", "스테이징", "서버", "Blocker", "Critical", "Major", "Minor", "Trivial", "방역", "살충", "롤백", "QA", "검사", "결함", "이슈", "코드", "빌드", "패치", "핫픽스", "데이터센터", "파이프라인"];
const termHits = (d: typeof DATA) =>
  [...strings(d), ...laps(d).map((v, i) => [`LAPS.name#${i}`, v] as [string, string])].flatMap(([p, t]) =>
    WORDS.filter((w) => t.includes(w) && /[가-힣]/.test(t + w)).map((w) => `${p}: ${w} ← ${t}`),
  );

test("코코 TD: DATA 화면 이름에 QA·업무 낱말이 없다(같은 판정이 릴리스 디펜스에선 빨강을 낸다)", () => {
  const rd = termHits(RD.DATA);
  assert.ok(rd.length > 0, "판정이 빨강을 못 낸다 — 릴리스 디펜스 DATA 에서도 0");
  assert.ok(strings(DATA).length > 0);
  assert.deepEqual(termHits(DATA), []);
});

test("코코 TD: DATA 의 문자열 칸·바퀴 이름이 docs/lab-coco-td-engine.js 와 같고, 그 밖의 값은 릴리스 디펜스와 같다", () => {
  const src = readFileSync(new URL("../../docs/lab-coco-td-engine.js", import.meta.url), "utf8");
  const ctx: Record<string, unknown> = { console, Math };
  ctx.globalThis = ctx;
  runInNewContext(src, ctx);
  const J = (ctx.TDEngine as { DATA: typeof DATA }).DATA;
  const sj = strings(J), st = strings(DATA);
  assert.ok(sj.length > 40, `문자열 칸이 너무 적다(${sj.length}) — 비교가 헛돈다`);
  assert.deepEqual(st, sj);
  assert.deepEqual(laps(DATA), laps(J));
  assert.equal(DATA.LAPS.name(1), "1일째");
  // 문자열 아닌 잎(키·수치·참거짓)은 릴리스 디펜스와 하나도 안 다르다, 바뀐 문자열은 이름 44개
  const nonStr = (d: unknown) => leaves(d).filter(([, v]) => typeof v !== "string");
  assert.deepEqual(nonStr(DATA), nonStr(RD.DATA));
  const rs = new Map(strings(RD.DATA));
  const changed = st.filter(([p, v]) => rs.get(p) !== v);
  assert.equal(st.length, rs.size);
  assert.equal(changed.length, 44, changed.map(([p]) => p).join(" "));
  assert.ok(changed.every(([p]) => /\.(name|role)$/.test(p)), "이름·역할 말고 바뀐 문자열이 있다");
});
