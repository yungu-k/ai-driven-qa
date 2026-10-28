// 내기 모음 8 「5초 릴레이」 — 규칙 엔진(순수, 화면 모름). 규격 docs/lab-party-relay-spec.md. 🔴 표와 코드가 다르면 코드가 맞다.
// 시안 docs/lab-party-relay.js(md5 f9500565…, 1판 — 봇 bot·view 포함)를 그대로 옮긴 판이다. 동작은 바꾸지 않고 타입만 붙였다
// (tmp/lab-party-port/equiv.mjs relay 가 두 엔진을 같은 씨앗·같은 입력으로 나란히 돌려 상태를 맞댄다).
// 라운드마다 과제 하나(연타·박자·멈춰!·기억)를 모두가 차례로 5초씩. 과제마다 0–100점, 라운드 합계가 가장 적은 사람이 꼴찌.
// 시간은 화면이 넣는다: 과제 시작부터 잰 초 t 로 input(g, t, cell). t < 0 이거나 t > DUR(5초)인 입력은 버린다 — 5초가 지나면 아무것도 안 센다.
// 과제 값(박자 간격·바늘 속도·기억 차례)은 판을 만들 때 씨앗으로 모두 정해 둔다(JSON 으로 맞댈 수 있다).

// 수치는 시뮬(tmp/lab-party/relay-sim.cjs)로 골랐다 — 보통 사람 어림이 과제마다 평균 55–65점이 되게(전·후는 규격 2절)
export const RULES = {
  DUR: 5,
  ROUNDS: { 2: 8, 3: 6, 4: 4 } as Record<number, number>, // 한 판 3–5분(차례 하나 ≈ 12초) — 2명 16차례 · 3명 18 · 4명 16 (3명 5라운드는 2.9분이라 늘림)
  KINDS: ["taps", "beat", "stop", "memory"] as Kind[],
  TAPS: { CAP: 43 }, // 5초에 43번이면 100점(보통 사람 5.4번/초 ≈ 26번 → 60점 안팎)
  BEAT: { FIRST: 0.8, PERIOD: [0.56, 0.68] as [number, number], TOL: 0.17, EXTRA: 0.5 }, // 박자마다 가장 가까운 누름의 어긋남 |e| — TOL 초에서 0. 남는 누름은 박자 반 개씩 깎는다(마구 누르기 막기)
  STOP: { SPEED: [0.95, 1.25] as [number, number], CENTER: [0.22, 0.78] as [number, number], TOL: 0.15, MIN: 0.15 }, // 바늘이 1초에 SPEED 칸(0–1) 오간다. 가운데에서 TOL 만큼 벗어나면 0. MIN 초 전 멈춤은 안 받는다(덮개 닫히자마자 실수)
  MEMORY: { CELLS: 6, LEN: 5, LEAD: 0.3, SHOW: 0.5 }, // 간식 6칸 중 5개가 SHOW 초씩 차례로 빛난 뒤(2.8초) 남은 시간에 차례대로. 틀리면 거기서 끝
};
export const ITEMS = ["개껌", "사과", "상추", "쿠키", "고기", "치즈"];
export const NAMES: Record<Kind, string> = { taps: "연타", beat: "박자", stop: "멈춰!", memory: "기억" };

export type Kind = "taps" | "beat" | "stop" | "memory";
export type Input = { t: number; cell: number | null };
export type TapsCh = { kind: "taps"; cap: number };
export type BeatCh = { kind: "beat"; period: number; beats: number[] };
export type StopCh = { kind: "stop"; x0: number; dir: number; speed: number; center: number; tol: number };
export type MemoryCh = { kind: "memory"; seq: number[]; items: number[]; lead: number; show: number; showEnd: number };
/** 과제 값(봇에 넘기는 보기도 이 꼴 — inputs 없음) */
export type Challenge = TapsCh | BeatCh | StopCh | MemoryCh;
/** 지금 하는 과제(값 + 받은 입력) */
export type LiveCh = Challenge & { inputs: Input[] };
export type RelayState = "ready" | "play" | "result" | "over";
export type TurnResult = { round: number; i: number; kind: Kind; score: number; inputs: number };
export type RelayGame = {
  n: number;
  seed: number;
  rounds: number;
  kinds: Kind[];
  /** plan[라운드-1][사람] = 그 사람 몫 과제 값 */
  plan: Challenge[][];
  round: number;
  turn: number;
  totals: number[];
  results: TurnResult[];
  state: RelayState;
  ch: LiveCh | null;
  log: { totals: number[] }[];
};
export type InputResult =
  | { n: number }
  | { e: number; p: number; beat: number }
  | { x: number; score: number; done: true }
  | { ok: boolean; k: number; done: boolean };
export type BotParams = { rate: [number, number]; beatSd: number; beatBias: number; beatMiss: number; stopSd: number; memErr: number; memInc: number; gap: [number, number]; react: number };
export type BotLevel = "easy" | "normal";

export function rng(seed: number): () => number { let s = seed >>> 0 || 1; return function () { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle<T>(r: () => number, a: T[]): T[] { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const lerp = (r: () => number, [a, b]: [number, number]) => a + r() * (b - a);
const r3 = (v: number) => Math.round(v * 1000) / 1000;

// 라운드 과제: 넷을 섞은 묶음을 차례로(처음 네 라운드에 넷이 다 나온다). 묶음 경계에서 같은 과제가 잇따르지 않게
function kindsFor(r: () => number, rounds: number): Kind[] {
  const out: Kind[] = [];
  while (out.length < rounds) {
    const bag = shuffle(r, RULES.KINDS.slice());
    if (out.length && bag[0] === out[out.length - 1]) bag.push(bag.shift() as Kind);
    out.push(...bag);
  }
  return out.slice(0, rounds);
}
// 한 사람 몫 과제 값. 같은 라운드는 모두 같은 과제지만 값은 사람마다(앞사람을 보고 외우지 못하게)
function makeChallenge(r: () => number, kind: Kind): Challenge {
  if (kind === "taps") return { kind, cap: RULES.TAPS.CAP };
  if (kind === "beat") {
    const period = r3(lerp(r, RULES.BEAT.PERIOD)), beats: number[] = [];
    for (let t = RULES.BEAT.FIRST; t <= RULES.DUR - 0.2; t += period) beats.push(r3(t));
    return { kind, period, beats };
  }
  if (kind === "stop") return { kind, x0: r3(r()), dir: r() < 0.5 ? -1 : 1, speed: r3(lerp(r, RULES.STOP.SPEED)), center: r3(lerp(r, RULES.STOP.CENTER)), tol: RULES.STOP.TOL };
  const seq = shuffle(r, [0, 1, 2, 3, 4, 5]).slice(0, RULES.MEMORY.LEN);
  const items = shuffle(r, [0, 1, 2, 3, 4, 5]); // 칸 k 에 놓인 간식
  return { kind: kind as "memory", seq, items, lead: RULES.MEMORY.LEAD, show: RULES.MEMORY.SHOW, showEnd: r3(RULES.MEMORY.LEAD + RULES.MEMORY.LEN * RULES.MEMORY.SHOW) };
}

export function create(n: number, seed?: number): RelayGame {
  const r = rng(seed || 1), rounds = RULES.ROUNDS[n] || 4, kinds = kindsFor(r, rounds);
  const plan = kinds.map((k) => Array.from({ length: n }, () => makeChallenge(r, k)));
  return { n, seed: seed || 1, rounds, kinds, plan, round: 1, turn: 0, totals: Array(n).fill(0), results: [], state: "ready", ch: null, log: [] };
}

// 바늘 자리(0–1): x0 에서 dir 쪽으로 speed 칸/초, 끝에서 튕긴다. 화면도 이 함수로 그린다(같은 값)
export function posAt(ch: { x0: number; dir: number; speed: number }, t: number): number {
  let s = (ch.x0 + ch.dir * ch.speed * Math.max(0, t)) % 2;
  if (s < 0) s += 2;
  return s <= 1 ? s : 2 - s;
}
// 박자 하나의 어긋남 → 점수(0–1)
export const beatPts = (e: number) => Math.max(0, 1 - Math.abs(e) / RULES.BEAT.TOL);

// 과제 점수(0–100, 정수). inputs = [{ t, cell }] — 5초 안 것만 들어 있다(input 이 거른다)
export function score(ch: Challenge, inputs: Input[]): number {
  if (ch.kind === "taps") return Math.round((100 * Math.min(inputs.length, ch.cap)) / ch.cap);
  if (ch.kind === "beat") {
    const best = ch.beats.map(() => -1);
    let extra = 0;
    for (const { t } of inputs) {
      let j = 0;
      for (let k = 1; k < ch.beats.length; k++) if (Math.abs(t - ch.beats[k]) < Math.abs(t - ch.beats[j])) j = k;
      if (best[j] >= 0) extra++;
      best[j] = Math.max(best[j], beatPts(t - ch.beats[j]));
    }
    const sum = best.reduce((a, v) => a + Math.max(0, v), 0) - RULES.BEAT.EXTRA * extra;
    return Math.max(0, Math.min(100, Math.round((100 * sum) / ch.beats.length)));
  }
  if (ch.kind === "stop") {
    if (!inputs.length) return 0;
    const d = Math.abs(posAt(ch, inputs[0].t) - ch.center);
    return Math.round(100 * Math.max(0, 1 - d / ch.tol));
  }
  let k = 0;
  for (const { cell } of inputs) { if (ch.items[cell as number] === ch.seq[k]) k++; else break; }
  return Math.round((100 * k) / ch.seq.length);
}
// 결과가 정해졌나(멈춤을 눌렀다 · 기억을 다 맞혔거나 틀렸다) — 화면이 5초를 다 기다리지 않고 끝낼 수 있다
export function fixed(ch: Challenge, inputs: Input[]): boolean {
  if (ch.kind === "stop") return inputs.length > 0;
  if (ch.kind === "memory") { let k = 0; for (const { cell } of inputs) { if (ch.items[cell as number] !== ch.seq[k]) return true; k++; } return k >= ch.seq.length; }
  return false;
}

const current = (g: RelayGame) => g.plan[g.round - 1][g.turn];
export function begin(g: RelayGame): LiveCh | null {
  if (g.state !== "ready") return null;
  g.ch = Object.assign(JSON.parse(JSON.stringify(current(g))), { inputs: [] }) as LiveCh;
  g.state = "play";
  return g.ch;
}
// 누름 하나. 받으면 화면이 쓸 되짚음을, 안 받으면 null(5초 밖 · 끝난 과제 · 기억 보여 주는 중)
export function input(g: RelayGame, t: number, cell?: number | null): InputResult | null {
  if (g.state !== "play" || !(t >= 0) || t > RULES.DUR) return null;
  const ch = g.ch as LiveCh;
  if (fixed(ch, ch.inputs)) return null;
  if (ch.kind === "stop" && t < RULES.STOP.MIN) return null;
  if (ch.kind === "memory" && (t < ch.showEnd || !((cell as number) >= 0 && (cell as number) < RULES.MEMORY.CELLS))) return null;
  ch.inputs.push({ t: r3(t), cell: cell == null ? null : cell });
  if (ch.kind === "taps") return { n: ch.inputs.length };
  if (ch.kind === "beat") { let j = 0; for (let k = 1; k < ch.beats.length; k++) if (Math.abs(t - ch.beats[k]) < Math.abs(t - ch.beats[j])) j = k; return { e: r3(t - ch.beats[j]), p: beatPts(t - ch.beats[j]), beat: j }; }
  if (ch.kind === "stop") return { x: posAt(ch, t), score: score(ch, ch.inputs), done: true };
  const k = ch.inputs.length - 1, ok = ch.items[cell as number] === ch.seq[k];
  return { ok, k, done: !ok || k + 1 >= ch.seq.length };
}
// 과제 끝(5초가 다 됐거나 결과가 정해짐): 점수를 합계에
export function finish(g: RelayGame): number | null {
  if (g.state !== "play") return null;
  const ch = g.ch as LiveCh;
  const s = score(ch, ch.inputs);
  g.totals[g.turn] += s;
  g.results.push({ round: g.round, i: g.turn, kind: ch.kind, score: s, inputs: ch.inputs.length });
  g.state = "result";
  return s;
}
export function advance(g: RelayGame): boolean {
  if (g.state !== "result") return false;
  g.turn++;
  if (g.turn >= g.n) { g.turn = 0; g.round++; }
  g.ch = null;
  g.state = g.round > g.rounds ? "over" : "ready";
  if (g.state === "over") { g.round = g.rounds; g.log.push({ totals: g.totals.slice() }); }
  return true;
}

// ── 봇(혼자 연습): 보이는 과제 값(view)만 받아 누를 때의 표(timeline)를 미리 낸다 — [{ t, cell }]. 화면이 그 시각에 하나씩 눌러 보인다 ──
// 세기 묶음: rate 연타 번/초 · beatSd 박자 어긋남 표준편차(초)·beatMiss 놓침 · stopSd 멈춤 어긋남(초) · memErr 칸마다 틀릴 확률(+memInc×순번) · gap 기억 누름 간격 · react 첫 반응
// 시뮬은 사람 어림도 같은 꼴의 묶음(사람마다 다르게 뽑은 값)으로 이 함수에 넣는다 — 입력 만드는 법을 두 벌 두지 않는다
export const BOT: Record<BotLevel, BotParams> = {
  easy: { rate: [3.6, 4.6], beatSd: 0.1, beatBias: 0.03, beatMiss: 0.15, stopSd: 0.09, memErr: 0.08, memInc: 0.05, gap: [0.48, 0.62], react: 0.45 },
  normal: { rate: [4.9, 5.8], beatSd: 0.075, beatBias: 0.015, beatMiss: 0.06, stopSd: 0.065, memErr: 0.05, memInc: 0.055, gap: [0.38, 0.5], react: 0.3 },
};
function gauss(r: () => number) { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
export function bot(view: Challenge, level: BotLevel | BotParams | string, r: () => number): Input[] {
  const P = typeof level === "object" ? level : BOT[level as BotLevel] || BOT.normal, D = RULES.DUR, out: Input[] = [];
  if (view.kind === "taps") {
    const rate = lerp(r, P.rate);
    for (let t = P.react * (0.7 + r() * 0.6); t < D; t += (1 / rate) * (0.75 + r() * 0.5)) out.push({ t: r3(t), cell: null });
  } else if (view.kind === "beat") {
    for (const b of view.beats) if (r() >= P.beatMiss) out.push({ t: r3(Math.max(0, b + P.beatBias + gauss(r) * P.beatSd)), cell: null });
    out.sort((a, b) => a.t - b.t);
  } else if (view.kind === "stop") {
    // 바늘이 가운데를 지나는 때를 겨냥(첫 반응 뒤, 한두 번 지켜본 다음 지남) — 어긋남 stopSd
    const cross: number[] = [];
    let prev = posAt(view, 0) - view.center;
    for (let t = 0.01; t < D; t += 0.01) { const now = posAt(view, t) - view.center; if ((prev < 0) !== (now < 0)) cross.push(t); prev = now; }
    const ok = cross.filter((t) => t >= P.react + 0.6 && t < D - 0.3);
    const aim = ok.length ? ok[Math.min(ok.length - 1, Math.floor(r() * Math.min(3, ok.length)))] : D - 0.5;
    out.push({ t: r3(Math.min(D - 0.05, Math.max(RULES.STOP.MIN, aim + gauss(r) * P.stopSd))), cell: null });
  } else {
    let t = view.showEnd + P.react * (0.8 + r() * 0.4);
    for (let k = 0; k < view.seq.length; k++) {
      if (k) t += lerp(r, P.gap);
      if (t > D) break;
      const want = view.items.indexOf(view.seq[k]);
      if (r() < P.memErr + P.memInc * k) { out.push({ t: r3(t), cell: (want + 1 + Math.floor(r() * 5)) % 6 }); break; } // 헷갈림 — 거기서 끝
      out.push({ t: r3(t), cell: want });
    }
  }
  return out;
}
// 봇에 넘기는 것: 화면에 보이는 과제 값 그대로(이 게임은 숨은 정보가 없다 — 남이 누른 것·다음 과제는 안 넘긴다)
export function view(g: RelayGame): Challenge { const c = g.ch || current(g); const v = JSON.parse(JSON.stringify(c)); delete v.inputs; return v; }
