// 내기 모음 6 「땅따먹기 점 잇기」 — 규칙 엔진(순수, 화면 모름). 규격 docs/lab-party-dots-spec.md. 🔴 표와 코드가 다르면 코드가 맞다.
// 시안 docs/lab-party-dots.js(md5 055c8311…, 1판 — 봇 bot·view 포함)를 그대로 옮긴 판이다. 동작은 바꾸지 않고 타입만 붙였다
// (tmp/lab-party-port/equiv.mjs dots 가 두 엔진을 같은 씨앗·같은 입력으로 나란히 돌려 상태를 맞댄다).
// 전통 놀이 틀(점 잇기 땅따먹기): 차례마다 이웃한 두 말뚝(점) 사이에 울타리(선) 하나를 긋는다.
// 네 번째 선을 그어 칸을 닫으면 그 칸은 내 텃밭(내 색 + 모양 표지 + 새싹) — 그리고 한 번 더 긋는다.
// 선을 다 그으면 끝. 텃밭이 가장 많은 사람이 1등, 가장 적은 사람이 꼴찌. 숨은 정보 없음.
// 칸 크기는 사람 수마다(GRID) — 시뮬(tmp/lab-party/dots-sim.cjs)로 한 판 5분 안팎에 맞췄다.

// GRID[n] = [행, 열](칸 수). 360 폭에 열 5 까지(선 누르는 자리 ≥ 44 px). 세로가 긴 화면이라 4명은 행을 늘린다.
// FIRST: 첫 차례는 씨앗으로 무작위(시뮬: 첫 사람 고정이면 2명에서 먼저 두는 쪽이 조금 유리 — 규격 2절)
export const RULES = { GRID: { 2: [5, 5], 3: [6, 5], 4: [6, 5] } as Record<number, [number, number]>, CROPS: 4 };
export const CROPS = ["상추", "당근", "토마토", "해바라기"]; // 닫은 칸에 나는 것(그림만 — 점수와 무관)

export type DotsState = "turn" | "over";
export type LogEntry = { p: number; l: number; c: number };
export type PlayResult = { l: number; p: number; closed: number[]; again: boolean; over: boolean };
export type DotsGame = {
  n: number;
  R: number;
  C: number;
  seed: number;
  first: number;
  turn: number;
  /** lines[l] = 그은 사람(-1 = 안 그음) */
  lines: number[];
  /** boxes[b] = 주인(-1 = 아직) */
  boxes: number[];
  /** crop[b] = 새싹 종류(-1 = 아직) */
  crop: number[];
  scores: number[];
  moves: number;
  state: DotsState;
  last: { l: number; p: number; closed: number[] } | null;
  log: LogEntry[];
  /** 씨앗 난수(열거 안 됨 — JSON 저장·비교에서 빠진다) */
  readonly r: () => number;
};
export type Topo = {
  R: number;
  C: number;
  NH: number;
  L: number;
  B: number;
  ends: [number, number][][];
  lineBoxes: number[][];
  boxLines: number[][];
  horiz: (l: number) => boolean;
};
/** 봇이 받는 것 — 판 그대로의 복사본(숨은 정보 없는 게임) */
export type DotsView = { n: number; R: number; C: number; turn: number; lines: number[]; boxes: number[]; scores: number[] };
export type BotLevel = "easy" | "normal";

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

// ── 모양(행 R·열 C 칸): 선 번호 = 가로선 먼저(r*C+c, r 0..R) 그다음 세로선(NH + r*(C+1)+c, r 0..R-1) ──
const TOPO: Record<string, Topo> = {};
export function topo(R: number, C: number): Topo {
  const key = R + "x" + C;
  if (TOPO[key]) return TOPO[key];
  const NH = (R + 1) * C, L = NH + R * (C + 1), B = R * C;
  const H = (r: number, c: number) => r * C + c, V = (r: number, c: number) => NH + r * (C + 1) + c;
  const ends: [number, number][][] = [], lineBoxes: number[][] = [], boxLines: number[][] = [];
  for (let r = 0; r <= R; r++) for (let c = 0; c < C; c++) { ends[H(r, c)] = [[c, r], [c + 1, r]]; lineBoxes[H(r, c)] = [r > 0 ? (r - 1) * C + c : -1, r < R ? r * C + c : -1].filter((b) => b >= 0); }
  for (let r = 0; r < R; r++) for (let c = 0; c <= C; c++) { ends[V(r, c)] = [[c, r], [c, r + 1]]; lineBoxes[V(r, c)] = [c > 0 ? r * C + c - 1 : -1, c < C ? r * C + c : -1].filter((b) => b >= 0); }
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) boxLines[r * C + c] = [H(r, c), H(r + 1, c), V(r, c), V(r, c + 1)];
  return (TOPO[key] = { R, C, NH, L, B, ends, lineBoxes, boxLines, horiz: (l: number) => l < NH });
}

/** n: 사람 수(2–4). 상태는 JSON 으로 맞댈 수 있게 배열·숫자만(rng 는 옆에 둔다) */
export function create(n: number, seed?: number, grid?: [number, number]): DotsGame {
  const [R, C] = grid || RULES.GRID[n] || RULES.GRID[4], T = topo(R, C);
  const g = { n, R, C, seed: seed || 1, first: 0, turn: 0, lines: Array(T.L).fill(-1), boxes: Array(T.B).fill(-1), crop: Array(T.B).fill(-1), scores: Array(n).fill(0), moves: 0, state: "turn", last: null, log: [] } as unknown as DotsGame;
  Object.defineProperty(g, "r", { value: rng(g.seed), enumerable: false });
  g.first = g.turn = Math.floor(g.r() * n);
  return g;
}
const sidesOf = (T: Topo, lines: number[], b: number): number => T.boxLines[b].reduce((a, l) => a + (lines[l] >= 0 ? 1 : 0), 0);

/** 선 긋기: 결과 { l, p, closed: [칸], again, over } · 그을 수 없으면 null. 칸을 닫으면 같은 사람이 한 번 더(again) */
export function play(g: DotsGame, l: number): PlayResult | null {
  const T = topo(g.R, g.C);
  if (g.state !== "turn" || !(l >= 0 && l < T.L) || g.lines[l] >= 0) return null;
  const p = g.turn;
  g.lines[l] = p; g.moves++;
  const closed = T.lineBoxes[l].filter((b) => g.boxes[b] < 0 && sidesOf(T, g.lines, b) === 4);
  for (const b of closed) { g.boxes[b] = p; g.scores[p]++; g.crop[b] = Math.floor(g.r() * RULES.CROPS); }
  const over = g.moves >= T.L;
  if (over) g.state = "over";
  else if (!closed.length) g.turn = (g.turn + 1) % g.n;
  g.last = { l, p, closed };
  g.log.push({ p, l, c: closed.length });
  return { l, p, closed, again: closed.length > 0 && !over, over };
}

// ── 봇(혼자 연습). 숨은 정보가 없으니 view 는 판 그대로(복사본) ──
export const view = (g: DotsGame): DotsView => ({ n: g.n, R: g.R, C: g.C, turn: g.turn, lines: g.lines.slice(), boxes: g.boxes.slice(), scores: g.scores.slice() });
export function classify(v: { R: number; C: number; lines: number[] }): { T: Topo; caps: number[]; safe: number[]; open: number[] } {
  const T = topo(v.R, v.C), caps: number[] = [], safe: number[] = [], open: number[] = [];
  for (let l = 0; l < T.L; l++) {
    if (v.lines[l] >= 0) continue;
    open.push(l);
    const s = T.lineBoxes[l].map((b) => sidesOf(T, v.lines, b));
    if (s.includes(3)) caps.push(l); else if (!s.includes(2)) safe.push(l); // 세 번째 변을 안 만드는 선 = 안전
  }
  return { T, caps, safe, open };
}
// 지금 판에서 욕심껏(닫을 수 있는 칸을 계속 닫으면) 몇 칸을 얻나 — lines 를 고친다
function greedy(T: Topo, lines: number[]): number {
  let got = 0, more = true;
  while (more) {
    more = false;
    for (let l = 0; l < T.L; l++) {
      if (lines[l] >= 0) continue;
      if (T.lineBoxes[l].some((b) => sidesOf(T, lines, b) === 3)) { lines[l] = 9; got += T.lineBoxes[l].filter((b) => sidesOf(T, lines, b) === 4).length; more = true; }
    }
  }
  return got;
}
// 이 선을 그으면 다음 사람이 욕심껏 몇 칸을 가져가나(내줄 칸 수)
function giveaway(T: Topo, lines: number[], l: number): number { const x = lines.slice(); x[l] = 9; return greedy(T, x); }
const pick = <X>(r: () => number, a: X[]): X => a[Math.floor(r() * a.length)];
/**
 * easy(연습): 닫을 칸이 있으면 닫고, 아니면 80 % 는 안전한 선 아무거나 · 20 % 는 아무 선
 * normal(보통): 닫을 칸은 닫고, 세 번째 변을 안 준다. 안전한 선이 없으면 가장 적게 내주는 선(동률이면 2칸 사슬을 가운데로 끊어 주기).
 *   끝판 사슬 다루기: 사슬 끝 두 칸만 남았고 남은 사슬이 다 길면(3칸 이상) 두 칸을 일부러 내주고 다음 사슬을 상대가 열게 한다.
 */
export function bot(v: DotsView, level: BotLevel | string, r?: () => number): number {
  r = r || Math.random;
  const { T, caps, safe, open } = classify(v);
  if (!open.length) return -1;
  if (level === "easy") {
    if (caps.length) return pick(r, caps);
    if (safe.length && r() < 0.8) return pick(r, safe);
    return pick(r, open);
  }
  if (caps.length) {
    if (safe.length) return caps.find((l) => T.lineBoxes[l].every((b) => sidesOf(T, v.lines, b) === 3)) ?? caps[0]; // 두 칸 한꺼번에 닫는 선부터
    // 끝판: 사슬 끝 두 칸(A 3변 — s — B 2변 — f — 벽/빈 칸)인지
    const dd = (s: number): number => {
      const A = T.lineBoxes[s].find((b) => sidesOf(T, v.lines, b) === 3), B = T.lineBoxes[s].find((b) => b !== A);
      if (B == null || v.boxes[B] >= 0 || sidesOf(T, v.lines, B) !== 2) return -1;
      const f = T.boxLines[B].find((l) => l !== s && v.lines[l] < 0);
      if (f == null || T.lineBoxes[f].some((b) => b !== B && sidesOf(T, v.lines, b) >= 2)) return -1;
      return f;
    };
    const plain = caps.filter((s) => dd(s) < 0);
    if (plain.length || v.n !== 2) return plain[0] ?? caps[0]; // 셋 이상이면 내준 두 칸 뒤 사슬은 그다음 사람 몫 — 나에게 안 돌아온다(두 칸 내주기는 2명만)
    const s = caps[0], f = dd(s);
    // 다 먹은 뒤의 판: 남은 칸이 있고, 그때 가장 적게 내줘도 3칸 이상이면 두 칸을 내주고 주도권을 쥔다
    const after = v.lines.slice(); greedy(T, after);
    const rest = T.L - after.filter((x) => x >= 0).length;
    if (rest > 0) {
      let minSac = 1e9; for (let l = 0; l < T.L; l++) if (after[l] < 0) minSac = Math.min(minSac, giveaway(T, after, l));
      if (minSac >= 3) return f;
    }
    return s;
  }
  if (safe.length) return pick(r, safe);
  let best: number[] = [], bestK = 1e9, bestT = -1;
  for (const l of open) {
    const k = giveaway(T, v.lines, l), x = v.lines.slice(); x[l] = 9;
    const t3 = T.lineBoxes[l].filter((b) => sidesOf(T, x, b) === 3).length; // 2칸 사슬은 가운데 선으로(두 칸이 따로 3변 — 상대가 두 칸 내주기를 못 한다)
    if (k < bestK || (k === bestK && t3 > bestT)) { best = [l]; bestK = k; bestT = t3; } else if (k === bestK && t3 === bestT) best.push(l);
  }
  return pick(r, best);
}
export const sides = (g: { R: number; C: number; lines: number[] }, b: number): number => sidesOf(topo(g.R, g.C), g.lines, b);
