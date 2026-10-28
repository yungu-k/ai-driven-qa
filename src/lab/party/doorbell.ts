// 내기 모음 1 「초인종 폭탄」 — 규칙 엔진(순수, 화면 모름). 규격 docs/lab-party-doorbell-spec.md. 🔴 표와 코드가 다르면 코드가 맞다.
// 시안 docs/lab-party-doorbell.js(md5 bbbbc09f…, 1판 — 봇 bot·view 포함)를 그대로 옮긴 판이다. 동작은 바꾸지 않고 타입만 붙였다
// (tmp/lab-party-port/equiv.mjs doorbell 이 두 엔진을 같은 씨앗·같은 입력·같은 dt 로 나란히 돌려 상태를 맞댄다).
// 폭탄 돌리기: 초인종(폭탄)을 받은 사람은 짧은 일 하나를 끝내야 다음 사람에게 넘길 수 있다.
// 숨은 시간(FUSE)이 다 되면 초인종이 울리고 코코가 짖는다 — 그때 들고 있는 사람이 「문 열기 당번」 1번.
// ROUNDS[n] 판 뒤 당번을 가장 많이 한 사람이 꼴찌. 시간은 화면이 step(g, dt) 로 넣는다(엔진은 시계를 모른다).

/** ROUNDS: 사람 수별 판 수(한 판 1–2분 — 3판으로 두니 2명이 0.9분) · FUSE: 한 판 숨은 시간 [최소, 최대] 초 · LOCK: 틀린 누름 잠김 초 */
export const RULES = {
  ROUNDS: { 2: 5, 3: 4, 4: 4 } as Record<number, number>,
  FUSE: { 2: [9, 20], 3: [11, 24], 4: [13, 28] } as Record<number, [number, number]>,
  LOCK: 0.8,
};
const KINDS = ["taps", "find", "order"] as const; // 일 세 가지: 여러 번 누르기 · 같은 간식 찾기 · 1→4 차례로
export const ITEMS = ["개껌", "사과", "상추", "쿠키", "고기", "치즈"];

export type TaskKind = (typeof KINDS)[number];
export type Task =
  | { kind: "taps"; need: number; done: number }
  | { kind: "find"; items: number[]; target: number; done: number; need: number }
  | { kind: "order"; cells: number[]; done: number; need: number };
export type DoorbellState = "ready" | "hold" | "pass" | "rang" | "over";
export type RingLog = { round: number; holder: number; t: number; passes: number };
export type DoorbellGame = {
  n: number;
  seed: number;
  round: number;
  rounds: number;
  holder: number;
  /** 숨은 시계(화면에 안 보인다) */
  t: number;
  /** 숨은 시간(화면에 안 보인다) */
  fuse: number;
  losses: number[];
  state: DoorbellState;
  task: Task | null;
  lock: number;
  passes: number;
  log: RingLog[];
  /** 씨앗 난수(열거 안 됨 — JSON 저장·비교에서 빠진다) */
  readonly r: () => number;
};
export type PressResult = { ok: false } | { ok: true; done: boolean };
export type BotLevel = "easy" | "normal";
export type BotPlan = { cell: number; delay: number };

function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(r: () => number, a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function create(n: number, seed?: number): DoorbellGame {
  const g = { n, seed: seed || 1, round: 0, rounds: RULES.ROUNDS[n] || 4, holder: 0, t: 0, fuse: 0, losses: Array(n).fill(0), state: "ready", task: null, lock: 0, passes: 0, log: [] } as unknown as DoorbellGame;
  Object.defineProperty(g, "r", { value: rng(g.seed), enumerable: false });
  return g;
}
/** 새 판: 첫 판은 무작위 사람, 다음 판은 방금 당번이 된 사람이 먼저 든다(전통 놀이 그대로) */
export function startRound(g: DoorbellGame): boolean {
  if (g.state !== "ready" && g.state !== "rang") return false;
  g.round++;
  if (g.round === 1) g.holder = Math.floor(g.r() * g.n);
  const [a, b] = RULES.FUSE[g.n] || RULES.FUSE[4];
  g.fuse = a + g.r() * (b - a);
  g.t = 0;
  g.state = "hold";
  g.passes = 0;
  g.task = makeTask(g);
  return true;
}
function makeTask(g: DoorbellGame): Task {
  const kind = KINDS[Math.floor(g.r() * KINDS.length)];
  if (kind === "taps") return { kind, need: 3 + Math.floor(g.r() * 3), done: 0 };
  if (kind === "find") {
    const pick = shuffle(g.r, ITEMS.map((_, i) => i)).slice(0, 4);
    return { kind, items: pick, target: pick[Math.floor(g.r() * 4)], done: 0, need: 1 };
  }
  return { kind, cells: shuffle(g.r, [1, 2, 3, 4]), done: 0, need: 4 };
}
/** 누름: 일의 칸 번호(taps 는 0). 맞으면 진행, 틀리면 LOCK 초 잠김(마구 누르기 막기). 일이 끝나면 state = "pass" */
export function press(g: DoorbellGame, cell: number): PressResult | null {
  if (g.state !== "hold" || g.lock > 0) return null;
  const T = g.task as Task;
  let ok: boolean;
  if (T.kind === "taps") ok = true;
  else if (T.kind === "find") ok = T.items[cell] === T.target;
  else ok = T.cells[cell] === T.done + 1;
  if (!ok) {
    g.lock = RULES.LOCK;
    return { ok: false };
  }
  T.done++;
  if (T.done >= T.need) g.state = "pass";
  return { ok: true, done: g.state === "pass" };
}
/** 넘김: 다음 사람이 받는다(받는 순간부터 그 사람 것). 받는 사람 일은 새로 */
export function pass(g: DoorbellGame): boolean {
  if (g.state !== "pass") return false;
  g.holder = (g.holder + 1) % g.n;
  g.passes++;
  g.state = "hold";
  g.task = makeTask(g);
  return true;
}
/** 시간 흐름. 울리면 { rang: holder } */
export function step(g: DoorbellGame, dt: number): { rang: number } | null {
  if (g.state !== "hold" && g.state !== "pass") return null;
  if (g.lock > 0) g.lock = Math.max(0, g.lock - dt);
  g.t += dt;
  if (g.t >= g.fuse) {
    g.losses[g.holder]++;
    g.state = g.round >= g.rounds ? "over" : "rang";
    g.log.push({ round: g.round, holder: g.holder, t: +g.t.toFixed(2), passes: g.passes });
    return { rang: g.holder };
  }
  return null;
}
// 봇(혼자 연습): 화면에 보이는 일(task)만 받아 다음에 누를 칸과 누르기까지 걸리는 초를 낸다. r 은 화면이 주는 난수(엔진 씨앗과 따로 — 봇이 판을 바꾸지 않게)
// easy(연습): 0.45–0.75 초, 12 % 헛누름 · normal(보통): 0.26–0.42 초, 4 % 헛누름. 사람 어림(시뮬 0.3 초)과 비슷하게
const BOT: Record<string, [number, number, number]> = { easy: [0.45, 0.75, 0.12], normal: [0.26, 0.42, 0.04] };
export function bot(task: Task, level: BotLevel | string, r: () => number): BotPlan {
  const [a, b, miss] = BOT[level] || BOT.normal,
    delay = a + r() * (b - a);
  let cell: number;
  if (task.kind === "taps") cell = 0;
  else if (task.kind === "find") cell = task.items.indexOf(task.target);
  else cell = task.cells.indexOf(task.done + 1);
  if (task.kind !== "taps" && r() < miss) cell = (cell + 1 + Math.floor(r() * 3)) % 4; // 헛누름
  return { cell, delay };
}
/** 봇에 넘기는 것: 화면에 보이는 일 그대로(숨은 시간 fuse·t 는 안 넘긴다) */
export const view = (g: DoorbellGame): Task | null => (g.task ? JSON.parse(JSON.stringify(g.task)) : null);
