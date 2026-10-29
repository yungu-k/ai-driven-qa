// 실행: node --test "tests/lab/*.test.ts"
// 코코의 집으로(src/lab/home) — Dean 이 정한 규칙(하트 3·맞으면 −1·0 이면 실패·하트 줍기는 판마다 하나)과 맵 규칙, 랭킹 상한.
// 규격 docs/lab-home-spec.md 2·9–11절. 숫자는 코드(engine.ts TUNE)가 정본이다. 엔진이 디자인 원본과 같은지는 tmp/lab-home/equiv-home.mjs 가 잰다.
// 사건을 모아 보는 검사는 먼저 그 사건이 나왔는지부터 단언한다 — 빈 집합의 집계는 통과 쪽으로 기운다.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as H from "../../src/lab/home/engine.ts";
import "../../src/lab/home/zone1.ts";
import { checkScoreEntry, GAMES } from "../../src/lab/arcade-rank-rules.ts";

type Inp = { x?: number; jump?: boolean; jumpTap?: boolean; skillTap?: boolean; down?: boolean };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type G = any;
const STAGES: string[] = H.ZONES[0].stages;
function run(g: G, n: number, inp: Inp | ((i: number) => Inp) = {}) {
  const ev: { type: string; [k: string]: unknown }[] = [];
  for (let i = 0; i < n && g.state === "play"; i++) ev.push(...H.step(g, typeof inp === "function" ? inp(i) : inp));
  return ev;
}
/** 평평한 판 하나(시험용) — 맵 자료와 섞이지 않게 고유 id */
let nth = 0;
function flat(extra: Record<string, unknown> = {}) {
  return H.create(H.addLevel({ id: `t${nth++}`, w: 60, spawn: [2, 0], cp: [30, 0], goal: 58, solids: [[-2, -6, 64, 6]], ...extra }));
}

test("수치표: 규격 2절(달리기 7 칸/초 · 발판 끝 여유 0.1초 · 착지 전 기억 0.12초 · 하트 3)", () => {
  assert.equal(H.TUNE.RUN, 7);
  assert.equal(H.TUNE.COYOTE, 0.1);
  assert.equal(H.TUNE.BUFFER, 0.12);
  assert.equal(H.TUNE.HEARTS, 3);
  assert.equal(H.TUNE.HURT_IFRAME, 1);
  assert.equal(H.BOSS.HP, 3);
});

test("구역 1 = 1-1 · 1-2 · 1-3 · 보스, 판마다 하트 하나(Dean 10-29) · 뼈다귀 3(보스 0) · 먹을 것이 벽 속에 없다", () => {
  assert.deepEqual(STAGES, ["1-1", "1-2", "1-3", "1-boss"]);
  for (const id of STAGES) {
    const L = H.LEVELS[id], n = (k: string) => L.picks.filter((p: G) => p.kind === k).length;
    assert.equal(n("heart"), 1, `${id} 하트`);
    assert.equal(n("bone"), L.boss ? 0 : 3, `${id} 뼈다귀`);
    const inWall = L.picks.filter((k: G) => L.solids.some((s: number[]) => k.x > s[0] && k.x < s[0] + s[2] && k.y > s[1] && k.y < s[1] + s[3]));
    assert.equal(inWall.length, 0, `${id} 벽 속 ${JSON.stringify(inWall)}`);
    assert.ok(L.story && L.name, `${id} 이야기·이름`);
  }
  // 다음 판 사슬: 1-1 → 1-2 → 1-3 → 보스 → 끝
  assert.deepEqual(STAGES.map((id) => H.LEVELS[id].next ?? null), ["1-2", "1-3", "1-boss", null]);
});

test("맞으면 하트 −1 · 1초 무적(그동안 또 안 깎임) · 0 이면 실패", () => {
  const g = flat({ enemies: [{ kind: "brush", x: 4, y: 0, x0: 4, x1: 4 }, { kind: "brush", x: 7, y: 0, x0: 7, x1: 7 }] });
  const ev = run(g, 30, { x: 1 });
  const hurts = ev.filter((e) => e.type === "hurt");
  assert.equal(hurts.length, 1, "첫 칫솔에 한 번");
  assert.equal(g.p.hearts, 2);
  assert.ok(g.p.iframe > 0);
  // 무적이 끝나면 다시 깎인다 → 하트 1 → 0 에서 fail
  g.p.hearts = 1; g.p.iframe = 0;
  g.p.x = 6; g.p.vx = 0; g.p.y = 0; g.p.ground = true;
  const ev2 = run(g, 60, { x: 1 });
  assert.ok(ev2.some((e) => e.type === "fail"));
  assert.equal(g.state, "fail");
  assert.equal(H.pose(g), "nap");
});

test("구멍: 하트 −1 + 체크포인트(지났으면)로 돌아온다", () => {
  const g = flat({ solids: [[-2, -6, 34, 6], [40, -6, 24, 6]] }); // 32..40 구멍
  const ev = run(g, 60 * 8, { x: 1 });
  assert.ok(ev.some((e) => e.type === "cp"), "체크포인트(30)를 먼저 지난다");
  const pit = ev.find((e) => e.type === "pit");
  assert.ok(pit, "구멍에 빠진다");
  assert.equal(pit.hearts, 2);
  // 빠진 바로 뒤 자리가 체크포인트
  const g2 = flat({ solids: [[-2, -6, 34, 6], [40, -6, 24, 6]] });
  for (let i = 0; i < 60 * 8 && g2.state === "play"; i++) { if (H.step(g2, { x: 1 }).some((e: G) => e.type === "pit")) break; }
  assert.deepEqual([g2.p.x, g2.p.y], [30, 0]);
});

test("하트 줍기: 가득(3)이면 그대로 남고, 깎인 뒤에 먹으면 +1 · 최대 3", () => {
  const mk = () => flat({ picks: [{ kind: "heart", x: 5, y: 0.4 }] });
  const g = mk();
  run(g, 40, { x: 1 });
  assert.equal(g.p.hearts, 3);
  assert.equal(g.pk[0].got, false, "가득이면 안 먹는다");
  const g2 = mk(); g2.p.hearts = 2;
  const ev = run(g2, 40, { x: 1 });
  assert.ok(ev.some((e) => e.type === "pick" && e.kind === "heart"));
  assert.equal(g2.p.hearts, 3);
  assert.equal(g2.score, H.SCORE.heart);
});

test("대왕은 벽에 부딪혀 어지러울 때만 맞는다 · 3번이면 멈추고 판이 끝난다", () => {
  const g = H.create("1-boss");
  const b = g.en.find((e: G) => e.kind === "vacuum_king");
  // 어지럽지 않을 때: 위에서 밟으면 튀어 오르기만(bonk), 옆으로 닿으면 코코가 맞는다 — 체력은 그대로
  run(g, Math.round(60 * 1.5));
  assert.equal(b.st, "roam");
  g.p.x = b.x; g.p.y = 1.6; g.p.vy = -5; g.p.ground = false; g.p.iframe = 0;
  const ev = run(g, 3);
  assert.ok(ev.some((e) => e.type === "bonk"));
  assert.equal(b.hp, 3);
  g.p.x = b.x; g.p.y = 0; g.p.vy = 0; g.p.ground = true; g.p.iframe = 0;
  const side = run(g, 2);
  assert.ok(side.some((e) => e.type === "hurt"));
  assert.equal(b.hp, 3);
  // 어지러울 때 밟기 세 번 → boss_down → clear
  let hits = 0;
  const all: string[] = [];
  for (let k = 0; k < 3; k++) {
    b.st = "stun"; b.stT = 2; g.p.iframe = 0;
    g.p.x = b.x; g.p.y = 1.6; g.p.vy = -5; g.p.ground = false;
    const e2 = run(g, 3);
    hits += e2.filter((e) => e.type === "boss_hit").length;
    all.push(...e2.map((e) => e.type));
  }
  assert.equal(hits, 3);
  assert.ok(all.includes("boss_down"));
  run(g, Math.round(60 * (H.BOSS.DOWN + 0.1)));
  assert.equal(g.state, "clear");
});

test("보스 판엔 체크포인트 알림이 없다(첫 걸음 「여기서부터 다시!」 막기)", () => {
  const g = H.create("1-boss");
  const ev = run(g, 120, { x: 1 });
  assert.ok(ev.length > 0);
  assert.ok(!ev.some((e) => e.type === "cp"));
});

test("랭킹 상한: 놓인 것 다 먹은 점수(2520)를 맵 자료로 다시 세고, 그 위는 초당 30 까지", () => {
  let tot = 0;
  for (const id of STAGES) {
    const L = H.LEVELS[id];
    for (const k of L.picks) tot += H.SCORE[k.kind];
    for (const e of L.enemies) if (!H.ENEMY[e.kind].tough) tot += H.SCORE.enemy;
    if (L.boss) tot += 100 * H.BOSS.HP; // 대왕 한 번 맞을 때마다 100(엔진 bossHit)
  }
  assert.equal(tot, 2520);
  assert.equal(GAMES.home.key, "home:z1:rank");
  const ok = { name: "코코", say: "", sec: 120, score: 2000 };
  const reason = (b: unknown) => { const r = checkScoreEntry("home", b); return r.ok ? "ok" : r.reason; };
  assert.equal(reason(ok), "ok");
  assert.equal(reason({ ...ok, score: GAMES.home.maxScore(120) }), "ok");
  assert.equal(reason({ ...ok, score: GAMES.home.maxScore(120) + 1 }), "too-high");
  assert.equal(reason({ ...ok, sec: 3601 }), "sec");
});
