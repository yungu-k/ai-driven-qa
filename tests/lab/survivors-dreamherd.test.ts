// 실행: node --test "tests/lab/*.test.ts"
// 코코의 꿈 양몰이(src/lab/survivors/dreamherd.ts) — 새벽 양치기(sheep.ts)에서 이름·id 만 바꾼 소재. 규격 docs/lab-surv-dreamherd-spec.md.
// 앞 칸은 survivors-sheep.test.ts 의 뼈대·고유 장치 검사를 그대로 옮겨 이 소재로 돌린다(수치가 같으니 기대값도 같다).
// 끝 칸: DATA 문자열이 시안 docs/lab-surv-dreamherd.js 와 같나(vm 으로 원본을 돌려 맞댄다), 문자열 아닌 잎은 sheep.ts 와 같나,
// 화면 이름에 QA·업무 낱말이 없나(tmp/lab-surv/td-terms.cjs 의 목록 — 만든 입력에서 빨강을 내는지도 본다).
// 사건을 모아 보는 검사는 먼저 그 사건이 나왔는지(> 0)부터 단언한다 — 빈 집합의 집계는 통과 쪽으로 기운다.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CORE,
  PASSIVE_AXES,
  create,
  step,
  choose,
  reroll,
  gainXp,
  damage,
  hurtPlayer,
  spawnAt,
  score,
  wstat,
  pointInPoly,
  type Game,
  type GameEvent,
  type Theme,
} from "../../src/lab/survivors/core.ts";
import { THEME, DATA, type SheepGame, type SheepEnemy } from "../../src/lab/survivors/dreamherd.ts";
import DEFAULT_THEME from "../../src/lab/survivors/dreamherd.ts";
import { THEME as SHEEP_THEME, DATA as SHEEP_DATA } from "../../src/lab/survivors/sheep.ts";

function newGame(seed = 1): SheepGame {
  const g = create(THEME, seed) as SheepGame;
  return g;
}
/** 감독이 적을 못 낳게(손으로 세운 적만 보게) */
function quiet(g: SheepGame): void {
  g.spawnAcc = -1e9;
  g.sched = [];
}
/** 프레임을 돌리며 사건을 모은다. 레벨업이 뜨면 첫 장을 고른다 */
function run(g: Game, frames: number, input?: (f: number) => { x: number; y: number }): GameEvent[] {
  const evs: GameEvent[] = [];
  for (let f = 0; f < frames && (g.state === "play" || g.state === "levelup"); f++) {
    if (g.state === "levelup") { choose(g, 0); f--; continue; }
    if (input) g.input = input(f);
    step(g);
    evs.push(...g.events);
    g.events.length = 0;
  }
  return evs;
}

test("경험치: 다음 단계까지 5 + 4.2(lv−1) + 0.18(lv−1)² 를 반올림", () => {
  assert.deepEqual([1, 2, 3, 10, 30].map(CORE.need), [5, 9, 14, 57, 278]);
});

test("레벨업 3택: 경험치가 차면 멈추고 서로 다른 카드 3장을 내민다", () => {
  const g = newGame(2);
  gainXp(g, 4);
  assert.equal(g.state, "play");
  gainXp(g, 1);
  assert.equal(g.state, "levelup");
  assert.equal(g.lv, 2);
  assert.equal(g.xp, 0);
  assert.equal(g.offer!.length, 3);
  const ids = g.offer!.map((c) => c.type + ":" + c.key);
  assert.equal(new Set(ids).size, 3, `겹친 카드: ${ids}`);
  // 멈춘 동안 step 은 아무것도 안 한다
  const t = g.time;
  step(g);
  assert.equal(g.time, t);
});

test("한 번에 여러 단계: 줄 세워 차례로 고른다", () => {
  const g = newGame(3);
  gainXp(g, CORE.need(1) + CORE.need(2) + CORE.need(3));
  assert.equal(g.state, "levelup");
  assert.equal(g.lv, 2);
  assert.equal(g.levelsQueued, 2);
  assert.ok(choose(g, 0));
  assert.equal(g.lv, 3);
  assert.equal(g.state, "levelup");
  assert.ok(choose(g, 0));
  assert.ok(choose(g, 0));
  assert.equal(g.lv, 4);
  assert.equal(g.state, "play");
  assert.equal(g.levelsQueued, 0);
});

test("고르기: 새 무기는 1단계로 칸에 들고, 가진 무기는 다음 단계로, 없는 칸·놀이 중엔 false", () => {
  const g = newGame(4);
  assert.equal(choose(g, 0), false, "놀이 중");
  gainXp(g, 5);
  assert.equal(choose(g, 9), false, "없는 칸");
  g.offer = [{ type: "weapon", key: "cloud", lv: 1 }, { type: "weapon", key: "pillow", lv: 2 }];
  assert.ok(choose(g, 0));
  assert.deepEqual(g.weapons.map((w) => [w.key, w.lv]), [["pillow", 1], ["cloud", 1]]);
  gainXp(g, CORE.need(g.lv));
  g.offer = [{ type: "weapon", key: "pillow", lv: 2 }];
  choose(g, 0);
  assert.deepEqual(g.weapons.map((w) => [w.key, w.lv]), [["pillow", 2], ["cloud", 1]]);
});

test("보조 hp 카드: 최대 체력과 체력이 +20", () => {
  const g = newGame(5);
  g.p.hp = 50;
  gainXp(g, 5);
  g.offer = [{ type: "passive", key: "hp", lv: 1 }];
  choose(g, 0);
  assert.equal(g.p.maxHp, 100 + PASSIVE_AXES.hp);
  assert.equal(g.p.hp, 50 + PASSIVE_AXES.hp);
});

test("다시 뽑기: 한 판 2번, 레벨업 중에만", () => {
  const g = newGame(6);
  assert.equal(reroll(g), false, "놀이 중엔 안 된다");
  assert.equal(g.rerolls, CORE.REROLLS);
  gainXp(g, 5);
  assert.ok(reroll(g));
  assert.equal(g.offer!.length, 3);
  assert.ok(reroll(g));
  assert.equal(reroll(g), false);
  assert.equal(g.rerolls, 0);
});

test("진화: 5단계 무기 + 짝 보조가 있으면 첫 칸에 반드시, 고르면 evo 수치로 바뀐다", () => {
  const g = newGame(7);
  g.weapons[0].lv = 5;
  g.passives.dmg = 1;
  gainXp(g, 5);
  assert.deepEqual(g.offer![0], { type: "evo", key: "pillow", lv: 0 });
  assert.equal(g.offer!.length, 3);
  choose(g, 0);
  assert.equal(g.weapons[0].evo, true);
  const s = wstat(g, g.weapons[0]);
  assert.equal(s.n, DATA.WEAPONS.pillow.evo!.n);
  assert.equal(s.dmg, 18 * (1 + PASSIVE_AXES.dmg)); // 보조 피해 1단계가 곱해진다
});

test("다 찼으면 회복 한 장: 체력 +30(최대를 넘지 않음)", () => {
  const g = newGame(8);
  g.weapons = Object.keys(DATA.WEAPONS).slice(0, 4).map((key) => ({ key, lv: 5, cd: 0, t: 0, evo: true }));
  for (const a of ["dmg", "cd", "area", "move"]) g.passives[a] = 5;
  for (const k in DATA.THEME_CARDS) g.themeLv[k] = DATA.THEME_CARDS[k as keyof typeof DATA.THEME_CARDS].max;
  g.p.hp = 40;
  gainXp(g, 5);
  assert.deepEqual(g.offer, [{ type: "heal", key: "heal", lv: 0 }]);
  choose(g, 0);
  assert.equal(g.p.hp, 70);
});

test("피해·처치: 체력이 깎이고, 죽으면 처치 +1·별가루(그 적의 xp)·kill 사건", () => {
  const g = newGame(9);
  quiet(g);
  const e = spawnAt(g, "closet", g.p.x + 60, g.p.y);
  damage(g, e, 40, "test");
  assert.equal(e.hp, 140 - 40);
  assert.equal(g.stats.dmgBy.test, 40);
  assert.equal(g.kills, 0);
  damage(g, e, 500, "test");
  assert.equal(e.dead, true);
  assert.equal(g.kills, 1);
  assert.equal(g.stats.dmgBy.test, 140, "넘친 피해는 안 센다");
  assert.ok(g.dust.some((d) => d.v === DATA.ENEMIES.closet.xp && d.x === e.x));
  const kills = g.events.filter((ev) => ev.e === "kill");
  assert.equal(kills.length, 1);
  damage(g, e, 10, "test");
  assert.equal(g.kills, 1, "죽은 적은 다시 안 죽는다");
  // 딱 맞는 피해(체력이 정확히 0)도 죽는다
  const f = spawnAt(g, "fluff", g.p.x + 60, g.p.y);
  damage(g, f, f.hp, "test");
  assert.equal(f.dead, true);
  assert.equal(g.kills, 2);
});

test("적 체력은 분 단위 표로 보간해 곱한다(보스는 안 곱함)", () => {
  const g = newGame(10);
  g.time = 90; // 1분 반 → 1.1 과 1.3 사이
  const e = spawnAt(g, "fluff", 10, 10);
  assert.ok(Math.abs(e.hp - 7 * 1.2) < 1e-9, String(e.hp));
  const b = spawnAt(g, "boss_wolf", 20, 20);
  assert.equal(b.hp, 2400);
});

test("맞기: 무적 0.7 초 동안은 다시 안 아프고, 체력 0 이면 짐", () => {
  const g = newGame(11);
  hurtPlayer(g, 30, "x");
  assert.equal(g.p.hp, 70);
  hurtPlayer(g, 30, "x");
  assert.equal(g.p.hp, 70, "무적 중");
  g.p.iframe = 0;
  hurtPlayer(g, 500, "x");
  assert.equal(g.p.hp, 0);
  assert.equal(g.state, "lost");
  assert.ok(g.events.some((ev) => ev.e === "lost"));
});

test("닿으면 아프다: 적이 주인공 위에 서면 step 한 번에 hurt, 솟는 중인 손은 안 아프다", () => {
  const g = newGame(12);
  quiet(g);
  const hand = spawnAt(g, "hand", g.p.x, g.p.y) as SheepEnemy;
  assert.equal(hand.inactive, true);
  step(g);
  assert.equal(g.events.filter((ev) => ev.e === "hurt").length, 0, "솟는 중");
  const g2 = newGame(12);
  quiet(g2);
  spawnAt(g2, "closet", g2.p.x, g2.p.y);
  step(g2);
  const hurts = g2.events.filter((ev) => ev.e === "hurt");
  assert.equal(hurts.length, 1);
  assert.equal(hurts[0].amt, DATA.ENEMIES.closet.dmg);
});

test("보스: 5분에 큰 늑대가 나오고(체력 2400), 잡으면 별가루 30·회복·bossdown", () => {
  const g = newGame(13);
  g.spawnAcc = -1e9;
  g.p.maxHp = g.p.hp = 1e6;
  g.time = 300 - 1 / 120;
  g.schedIdx = g.sched.findIndex((ev) => ev.t >= 300);
  step(g);
  const boss = g.bossAlive as SheepEnemy | null;
  assert.ok(boss, "보스가 안 나왔다");
  assert.equal(boss.kind, "boss_wolf");
  assert.equal(boss.hp, 2400);
  assert.ok(g.events.some((ev) => ev.e === "boss" && ev.en === boss));
  // 돌진 예고·소환이 정해진 초에 온다
  const evs = run(g, 60 * 8, () => ({ x: 0, y: 0 }));
  assert.ok(evs.filter((ev) => ev.e === "warn").length >= 1, "돌진 예고가 없다");
  assert.ok(evs.filter((ev) => ev.e === "summon").length >= 1, "소환이 없다");
  const dust0 = g.dust.length;
  damage(g, boss, 1e6, "test");
  assert.equal(g.bossAlive, null);
  assert.equal(g.dust.length - dust0, DATA.DROPS.bossDust);
  assert.ok(g.pickups.some((k) => k.kind === "heal"));
  assert.ok(g.events.some((ev) => ev.e === "bossdown"));
});

test("늑대는 가장 가까운 양을 쫓는다", () => {
  const g = newGame(14);
  quiet(g);
  const w = spawnAt(g, "wolf", g.p.x - 100, g.p.y) as SheepEnemy;
  const tgt = THEME.targetOf!(g, w);
  assert.ok(g.sheep.includes(tgt as never), "늑대 목표가 양이 아니다");
  const fl = spawnAt(g, "fluff", g.p.x - 100, g.p.y);
  assert.equal(THEME.targetOf!(g, fl), g.p);
});

test("양 우리: 줄로 원을 닫으면 fence, 안에 든 적은 잠들고 피해를 한 번 받는다, 끝나면 penend", () => {
  const g = newGame(15);
  quiet(g);
  g.p.maxHp = g.p.hp = 1e6;
  THEME.onThemeCard!(g, "flock", 1);
  THEME.onThemeCard!(g, "flock", 2);
  THEME.onThemeCard!(g, "flock", 3); // 4 + 6 = 10 마리
  assert.equal(g.sheep.length, 10);
  const R = 12, w = 56 / R;
  let fence: GameEvent | undefined;
  for (let f = 0; f < 60 * 10 && !fence; f++) {
    const a = w * f * CORE.DT;
    g.input = { x: -Math.sin(a), y: Math.cos(a) };
    step(g);
    fence = g.events.find((ev) => ev.e === "fence");
    g.events.length = 0;
  }
  assert.ok(fence, "고리가 안 닫혔다");
  assert.equal(g.stats.fences, 1);
  const pen = g.fences[0];
  assert.ok(pen && pen.n >= 5);
  assert.equal(pen.dmg, DATA.FENCE.base + DATA.FENCE.perSheep * pen.n);
  // 우리 안 한가운데에 옷장(체력 140)을 세운다
  const cx = pen.pts.reduce((s, q) => s + q[0], 0) / pen.pts.length, cy = pen.pts.reduce((s, q) => s + q[1], 0) / pen.pts.length;
  assert.ok(pointInPoly(cx, cy, pen.pts), "가운데가 우리 밖");
  g.input = { x: 0, y: 0 };
  const e = spawnAt(g, "closet", cx, cy) as SheepEnemy;
  e.speed = 0;
  step(g);
  assert.equal(e.asleep, true);
  assert.ok(e.stun > 0, "잠들지 않았다");
  assert.equal(140 - e.hp >= pen.dmg, true, `우리 피해가 안 들어갔다(hp ${e.hp})`);
  const hp1 = e.hp;
  assert.equal(pen.caught, 1);
  step(g);
  assert.equal(pen.caught, 1, "같은 우리에서 두 번 세지 않는다");
  assert.ok(e.hp >= hp1 - 4 * 2, "우리 피해는 한 번만"); // 들이받기(ram 4)만 더 들어갈 수 있다
  const evs = run(g, 60 * 4, () => ({ x: 0, y: 0 }));
  const ends = evs.filter((ev) => ev.e === "penend");
  assert.ok(ends.length >= 1, "우리가 안 끝났다");
  assert.equal(ends[0].caught, 1);
  assert.equal(ends[0].conv, 0);
});

test("우리에 3마리 넘게 가두면 양이 는다(3→1, 8→2)", () => {
  const g = newGame(16);
  quiet(g);
  const n0 = g.sheep.length;
  const evs: GameEvent[] = [];
  for (const [caught, want] of [[2, 0], [3, 1], [8, 2]]) {
    g.fences = [{ id: 99, pts: [[0, 0], [1, 0], [0, 1]], box: [0, 0, 1, 1], life: 0.001, max: 3, n: 5, dmg: 1, caught }];
    THEME.afterStep!(g, 1 / 60);
    const end = g.events.find((ev) => ev.e === "penend");
    assert.ok(end, "penend 가 없다");
    assert.equal(end.conv, want, `caught ${caught}`);
    evs.push(end);
    g.events.length = 0;
  }
  assert.equal(evs.length, 3);
  assert.equal(g.sheep.length, n0 + 3);
});

test("양은 털이 깎이면 떨어져 헤매는 양이 되고, 주우면 돌아온다", () => {
  const g = newGame(17);
  quiet(g);
  step(g); // 첫 틱에 양이 줄 자리로 선다(만들 때는 모두 아이 자리)
  g.events.length = 0;
  const s = g.sheep[1];
  s.hp = 1;
  const w = spawnAt(g, "wolf", s.x, s.y);
  w.speed = 0;
  step(g);
  assert.ok(g.events.some((ev) => ev.e === "sheep-"), "양이 안 떨어졌다");
  assert.equal(g.sheep.length, 3);
  assert.equal(g.strays.length, 1);
  w.dead = true;
  const st = g.strays[0];
  st.x = g.p.x; st.y = g.p.y; st.vx = st.vy = 0;
  g.events.length = 0;
  step(g);
  assert.ok(g.events.some((ev) => ev.e === "sheep+" && ev.why === "back"));
  assert.equal(g.sheep.length, 4);
});

test("점수(규격 9절 S4): 버틴 초×10 + 처치 + 가장 긴 양떼×25 + 우리×15, 이기면 +5000 + 남은 양×200", () => {
  const g = newGame(18);
  g.time = 123.7;
  g.kills = 50;
  g.stats.maxLen = 12;
  g.stats.fences = 3;
  assert.equal(score(g), 1230 + 50 + 300 + 45);
  g.state = "won";
  g.sheep.length = 7;
  assert.equal(score(g), 1230 + 50 + 300 + 45 + 5000 + 7 * 200);
  g.state = "lost";
  assert.equal(score(g), 1230 + 50 + 300 + 45, "지면 보너스 없음");
  // 소재 식이 없으면 뼈대 기본식
  const bare: Theme = { DATA: THEME.DATA };
  const b = create(bare, 1);
  b.time = 9.9;
  b.kills = 3;
  assert.equal(score(b), 93);
});

test("아침: 10분이 되면 이기고(won·dawn) 남은 악몽은 녹는다", () => {
  const g = newGame(19);
  g.time = DATA.DURATION - 1 / 120;
  g.schedIdx = g.sched.length;
  spawnAt(g, "closet", g.p.x + 80, g.p.y);
  step(g);
  assert.equal(g.state, "won");
  const kinds = g.events.map((ev) => ev.e);
  assert.ok(kinds.includes("dawn") && kinds.includes("won"), kinds.join(","));
  assert.ok(g.enemies.every((e) => e.dead));
  assert.equal(THEME.dawn(g), 1);
});

test("별가루가 220 을 넘으면 먼 것들을 하나로 합친다(값 합은 그대로)", () => {
  const g = newGame(20);
  quiet(g);
  g.dust = Array.from({ length: 300 }, (_, i) => ({ x: 10 + (i % 20), y: 10 + ((i / 20) | 0), v: 1 }));
  step(g);
  assert.ok(g.dust.length <= CORE.DUST_CAP, String(g.dust.length));
  assert.equal(g.dust.reduce((s, d) => s + d.v, 0), 300);
});

test("한 판 끝까지(봇 없이 원 돌기, 안 죽게): 포위·보스 둘·아침이 다 온다", () => {
  const g = newGame(21);
  g.p.maxHp = g.p.hp = 1e9;
  const evs = run(g, 60 * 601, (f) => { const a = (f / 300) * Math.PI * 2; return { x: -Math.sin(a), y: Math.cos(a) }; });
  const count = (k: string) => evs.filter((ev) => ev.e === k).length;
  assert.ok(evs.length > 0);
  assert.equal(g.state, "won");
  assert.equal(count("boss"), 2);
  assert.equal(count("ring"), 3);
  assert.equal(count("dawn"), 1);
  assert.ok(count("levelup") > 10, `레벨업 ${count("levelup")}`);
  assert.ok(g.enemies.length <= CORE.ENEMY_CAP);
});

// ── 이름·id 검사 ─────────────────────────────────────────
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
/** 시안 뼈대 + 소재를 vm 으로 그대로 돌린다(tmp/lab-surv/load.cjs 와 같은 꼴) */
function loadDocsTheme(file: string, global: string) {
  const ctx: Record<string, unknown> = { console, Math };
  ctx.globalThis = ctx;
  runInNewContext(readFileSync(new URL("../../docs/lab-surv-core.js", import.meta.url), "utf8"), ctx);
  runInNewContext(readFileSync(new URL(`../../docs/${file}`, import.meta.url), "utf8"), ctx);
  return ctx[global] as { id: string; name: string; DATA: typeof DATA };
}
/** DATA 를 다 훑어 [경로, 값] 잎을 모은다. 함수 칸은 뺀다 */
function leaves(o: unknown, at = "DATA", out: [string, unknown][] = []): [string, unknown][] {
  if (typeof o === "function") return out;
  if (o === null || typeof o !== "object") { out.push([at, o]); return out; }
  for (const k of Object.keys(o as object)) leaves((o as Record<string, unknown>)[k], `${at}.${k}`, out);
  return out;
}
const strings = (d: unknown) => leaves(d).filter(([, v]) => typeof v === "string") as [string, string][];
const nonStr = (d: unknown) => leaves(d).filter(([, v]) => typeof v !== "string");

test("꿈 양몰이: id·이름·기본 내보내기", () => {
  assert.equal(THEME.id, "dreamherd");
  assert.equal(THEME.name, "코코의 꿈 양몰이");
  assert.equal(DEFAULT_THEME, THEME);
  assert.equal(THEME.DATA, DATA);
  assert.equal(SHEEP_THEME.id, "sheep", "sheep.ts 가 바뀌었다");
});

test("꿈 양몰이: DATA 의 문자열 칸이 docs/lab-surv-dreamherd.js 와 같고, 그 밖의 잎은 sheep.ts 와 같다", () => {
  const J = loadDocsTheme("lab-surv-dreamherd.js", "SurvDreamherd");
  assert.equal(J.id, THEME.id);
  assert.equal(J.name, THEME.name);
  const sj = strings(J.DATA), st = strings(DATA);
  assert.ok(sj.length > 30, `문자열 칸이 너무 적다(${sj.length}) — 비교가 헛돈다`);
  assert.deepEqual(st, sj);
  // 문자열 아닌 잎(키·수치·참거짓)은 새벽 양치기와 하나도 안 다르다
  const ns = nonStr(DATA);
  assert.ok(ns.length > 100, `수치 잎이 너무 적다(${ns.length})`);
  assert.deepEqual(ns, nonStr(SHEEP_DATA));
  // 바뀐 문자열은 화면 이름·대사 19개, 경로는 그대로
  const ss = new Map(strings(SHEEP_DATA));
  assert.equal(st.length, ss.size);
  assert.ok(st.every(([p]) => ss.has(p)));
  const changed = st.filter(([p, v]) => ss.get(p) !== v);
  assert.equal(changed.length, 19, changed.map(([p]) => p).join(" "));
  assert.ok(changed.every(([p]) => /\.(name|say)$/.test(p) || /^DATA\.PASSIVES\./.test(p)), "이름·대사 말고 바뀐 문자열이 있다");
});

// tmp/lab-surv/td-terms.cjs 의 낱말 목록·판정 그대로(금지 대상이라 목록은 그대로 적는다 — 이 칸 자체는 화면에 안 나간다)
const WORDS = ["버그", "테스트", "리뷰", "배포", "운영", "릴리스", "CI", "린터", "커버리지", "회귀", "모니터링", "대시보드", "캐시", "러너", "게이트", "버전", "장애", "스테이징", "서버", "Blocker", "Critical", "Major", "Minor", "Trivial", "방역", "살충", "롤백", "QA", "검사", "결함", "이슈", "코드", "빌드", "패치", "핫픽스", "데이터센터", "파이프라인"];
const termHits = (pairs: [string, string][]) =>
  pairs.flatMap(([p, t]) => WORDS.filter((w) => t.includes(w) && /[가-힣]/.test(t + w)).map((w) => `${p}: ${w} ← ${t}`));

test("꿈 양몰이: 화면 이름에 QA·업무 낱말이 없다(같은 판정이 만든 입력에선 빨강을 낸다)", () => {
  // 판정이 빨강을 낼 수 있나: 이름 하나만 바꾼 사본
  const bad = structuredClone(DATA);
  bad.ENEMIES.clock.name = "버그 꼬마";
  bad.PASSIVES.magnet = "QA 별가루";
  const badHits = termHits(strings(bad));
  assert.equal(badHits.length, 2, badHits.join(" | "));
  const all: [string, string][] = [...strings(DATA), ["THEME.name", THEME.name]];
  assert.ok(all.length > 30);
  assert.deepEqual(termHits(all), []);
});
