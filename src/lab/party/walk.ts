// 내기 모음 9 「코코 산책 보드」 — 규칙 엔진(순수, 화면 모름). 규격 docs/lab-party-walk-spec.md. 🔴 표와 코드가 다르면 코드가 맞다.
// 시안 docs/lab-party-walk.js(md5 884f70ce…, 1판 — 봇 bot·view 포함, 바퀴 중간 집 칸 kindAt 고침 포함)를 그대로 옮긴 판이다.
// 동작은 바꾸지 않고 타입만 붙였다(tmp/lab-party-port/equiv.mjs walk 가 두 엔진을 같은 씨앗·같은 입력으로 나란히 돌려 상태를 맞댄다).
// 주사위 말판: 공원 둘레길 40칸(0 = 집)을 돈다. 차례마다 주사위를 굴려 그만큼 걷고, 선 칸의 코코 사건을 받는다.
// 차례마다 작은 선택 하나: 별(★)을 하나 내면 한 칸 더 또는 한 칸 덜 갈 수 있다(설 칸을 고른다 — 세 칸이 다 보인다).
// 집에 먼저 돌아온 사람이 1등이고 그 순간 판이 끝난다. 나머지는 남은 칸이 적은 순, 같으면 별이 많은 순 — 남은 칸이 가장 많은 사람이 꼴찌.
// 숨은 정보 없음(판·주사위·별이 다 보인다). 사건으로 옮겨 간 칸의 사건은 다시 받지 않는다(연쇄 없음 — 판이 읽히게).

// LAPS: 사람 수별 바퀴(한 판 10–15분으로 맞춤 — 규격 2절). 2명 세 바퀴, 3·4명 두 바퀴.
export const RULES = { SQUARES: 40, LAPS: { 2: 3, 3: 2, 4: 2 } as Record<number, number>, START_STARS: 1, BELL_BACK: 3, BALL_FWD: 3, RAIN_BACK: 2 };
export type Kind = "bell" | "meat" | "bath" | "treat" | "friend" | "ball" | "rain" | "photo";
/** 칸 사건 이름: 8종 · 빈 칸 "" · 도착 "home" */
export type SqKind = Kind | "" | "home";
// 칸 사건 8종(빈 칸 ""). 화면 이름·한 줄은 화면이 쓰는 것과 같다
export const KINDS: Record<Kind, { name: string; say: string }> = {
  bell: { name: "초인종", say: "띵동! 코코가 짖으러 현관으로 — 뒤로 3칸" },
  meat: { name: "고기", say: "고기 냄새! 신나서 한 번 더 굴려요" },
  bath: { name: "목욕", say: "목욕 시간 — 다음 차례 한 번 쉬어요" },
  treat: { name: "간식", say: "간식 발견! 별 +1" },
  friend: { name: "친구 강아지", say: "친구 강아지랑 놀다가 — 누군가와 자리 바꾸기" },
  ball: { name: "공", say: "공이다! 쫓아서 앞으로 3칸" },
  rain: { name: "소나기", say: "소나기! 맨 앞 사람이 우산 쓰러 2칸 뒤로" },
  photo: { name: "단체 사진", say: "다 같이 찰칵 — 모두 별 +1" },
};
// 둘레길 40칸. 0 = 집(사건 없음). 사건 27 · 빈 칸 12 — 개수는 규격 1절 표
export const BOARD: SqKind[] = ["home", "", "treat", "", "bell", "", "meat", "", "bell", "bath",
  "", "friend", "treat", "bell", "", "ball", "", "photo", "", "bell",
  "rain", "treat", "", "bath", "meat", "", "friend", "bell", "", "treat",
  "ball", "", "photo", "bath", "friend", "treat", "ball", "meat", "bell", "rain"];

export type WalkState = "roll" | "choose" | "done" | "over";
export type Opt = { d: number; cost: number; to: number; kind: SqKind };
/** fx.move = [사람, 전 걸음, 뒤 걸음] 목록 */
export type Fx = { move?: [number, number, number][]; rest?: number; star?: number[]; swap?: [number, number] };
export type MoveResult = { p: number; from: number; to: number; steps: number[]; d: number; cost: number; kind: SqKind; fx: Fx | null; again: boolean; over: boolean };
export type LogEntry = { p: number; e: string; d?: number; from?: number; to?: number; kind?: SqKind; cost?: number; fx?: Fx | null };
export type WalkGame = {
  n: number;
  laps: number;
  /** 끝까지 걸음 수(바퀴 × 40) */
  D: number;
  /** prog[i] = 출발에서 걸은 칸 수(0…D), 판 위 칸 = prog % 40 */
  prog: number[];
  stars: number[];
  rest: boolean[];
  turn: number;
  state: WalkState;
  die: number;
  opts: Opt[] | null;
  last: MoveResult | null;
  winner: number;
  turns: number;
  rolls: number;
  round: number;
  skipped: number[];
  log: LogEntry[];
  seed: number;
  hits: Partial<Record<Kind, number>>;
  /** 씨앗 난수(열거 안 됨 — JSON 저장·비교에서 빠진다) */
  readonly r: () => number;
};
/** 봇이 받는 것 — 판 그대로의 복사본(숨은 정보 없는 게임) */
export type WalkView = { n: number; D: number; turn: number; prog: number[]; stars: number[]; rest: boolean[]; die: number; opts: Opt[] | null; state: WalkState };
export type BotLevel = "easy" | "normal";

function rng(seed: number): () => number { let s = seed >>> 0 || 1; return function () { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 상태는 JSON 으로 맞댈 수 있게(rng 는 옆에 숨겨 둔다). prog[i] = 출발에서 걸은 칸 수(0…D), 판 위 칸 = prog % 40
export function create(n: number, seed?: number, laps?: number): WalkGame {
  const L = laps || RULES.LAPS[n] || 1;
  const g = { n, laps: L, D: L * RULES.SQUARES, prog: Array(n).fill(0), stars: Array(n).fill(RULES.START_STARS), rest: Array(n).fill(false),
    turn: 0, state: "roll", die: 0, opts: null, last: null, winner: -1, turns: 0, rolls: 0, round: 1, skipped: [], log: [], seed: seed || 1, hits: {} } as unknown as WalkGame;
  Object.defineProperty(g, "r", { value: rng(g.seed), enumerable: false });
  return g;
}
export const square = (g: WalkGame, i: number): number => (g.prog[i] >= g.D ? 0 : g.prog[i] % RULES.SQUARES);
// 칸 사건: 집에 닿으면 "home"(도착). 바퀴 중간에 집 칸에 서면 빈 칸("") — 사건 없음(리그가 잡은 멈춤: 집 칸이 사건 이름 "home" 으로 새어 나갔다)
export const kindAt = (g: { D: number }, p: number): SqKind => (p >= g.D ? "home" : BOARD[p % RULES.SQUARES] === "home" ? "" : BOARD[p % RULES.SQUARES]);
export const left = (g: WalkGame, i: number): number => Math.max(0, g.D - g.prog[i]);

// 굴리기 → 고를 수 있는 걸음(그대로 · 별 하나로 −1 · +1). face 를 주면 그 눈(리그·시험)
export function roll(g: WalkGame, face?: number): Opt[] | null {
  if (g.state !== "roll") return null;
  const d = face || 1 + Math.floor(g.r() * 6);
  g.die = d; g.rolls++;
  const st = g.stars[g.turn], p = g.prog[g.turn], opts = [] as Opt[];
  if (st > 0 && d > 1) opts.push({ d: d - 1, cost: 1 } as Opt);
  opts.push({ d, cost: 0 } as Opt);
  if (st > 0) opts.push({ d: d + 1, cost: 1 } as Opt);
  for (const o of opts) { o.to = Math.min(g.D, p + o.d); o.kind = kindAt(g, p + o.d); }
  g.opts = opts; g.state = "choose";
  g.log.push({ p: g.turn, e: "roll", d });
  return opts;
}
// 고르기: k = opts 번호. 결과 { from, to, steps(걸은 칸 목록), kind, fx(사건 결과), again, over }
export function choose(g: WalkGame, k?: number | null): MoveResult | null {
  if (g.state !== "choose") return null;
  const o = g.opts![k == null ? g.opts!.findIndex((x) => x.cost === 0) : k];
  if (!o) return null;
  const i = g.turn, from = g.prog[i];
  g.stars[i] -= o.cost;
  const to = Math.min(g.D, from + o.d), steps: number[] = [];
  for (let s = from + 1; s <= to; s++) steps.push(s);
  g.prog[i] = to; g.opts = null;
  const res: MoveResult = { p: i, from, to, steps, d: o.d, cost: o.cost, kind: kindAt(g, to), fx: null, again: false, over: false };
  if (to >= g.D) { arrive(g, i, res); return (g.last = res); }
  apply(g, i, res);
  if ((g.state as WalkState) !== "over") g.state = res.again ? "roll" : "done";
  g.log.push({ p: i, e: "move", from, to, kind: res.kind, cost: o.cost, fx: res.fx });
  return (g.last = res);
}
function arrive(g: WalkGame, i: number, res: MoveResult) { g.winner = i; g.state = "over"; res.over = true; g.log.push({ p: i, e: "home" }); }
// 사건(연쇄 없음 — 사건으로 옮겨 간 칸의 사건은 안 받는다)
function apply(g: WalkGame, i: number, res: MoveResult) {
  const k = res.kind; if (!k || k === "home") return;
  g.hits[k] = (g.hits[k] || 0) + 1;
  if (k === "bell") { const a = g.prog[i]; g.prog[i] = Math.max(0, a - RULES.BELL_BACK); res.fx = { move: [[i, a, g.prog[i]]] }; }
  else if (k === "ball") { const a = g.prog[i]; g.prog[i] = Math.min(g.D, a + RULES.BALL_FWD); res.fx = { move: [[i, a, g.prog[i]]] }; if (g.prog[i] >= g.D) arrive(g, i, res); }
  else if (k === "meat") res.again = true;
  else if (k === "bath") { g.rest[i] = true; res.fx = { rest: i }; }
  else if (k === "treat") { g.stars[i]++; res.fx = { star: [i] }; }
  else if (k === "photo") { for (let j = 0; j < g.n; j++) g.stars[j]++; res.fx = { star: [...Array(g.n).keys()] }; }
  else if (k === "friend") {
    const others = [...Array(g.n).keys()].filter((j) => j !== i), j = others[Math.floor(g.r() * others.length)];
    const a = g.prog[i], b = g.prog[j]; g.prog[i] = b; g.prog[j] = a;
    res.fx = { swap: [i, j], move: [[i, a, b], [j, b, a]] };
  } else if (k === "rain") {
    const top = Math.max(...g.prog), who = [...Array(g.n).keys()].filter((j) => g.prog[j] === top);
    res.fx = { move: who.map((j): [number, number, number] => { const a = g.prog[j]; g.prog[j] = Math.max(0, a - RULES.RAIN_BACK); return [j, a, g.prog[j]]; }) };
  }
}
// 다음 사람으로. 목욕 중인 사람은 건너뛴다(g.skipped 에 남김 — 화면이 「○○ 는 쉬어요」 를 띄운다)
export function next(g: WalkGame): boolean {
  if (g.state !== "done") return false;
  g.skipped = []; g.turns++;
  for (let guard = 0; guard < g.n * 2; guard++) {
    g.turn = (g.turn + 1) % g.n; if (g.turn === 0) g.round++;
    if (g.rest[g.turn]) { g.rest[g.turn] = false; g.skipped.push(g.turn); g.log.push({ p: g.turn, e: "rest" }); continue; }
    break;
  }
  g.state = "roll"; g.die = 0; g.last = null;
  return true;
}
// 순위 점수(낮을수록 위): 남은 칸 × 100 + (99 − 별). 집에 온 사람은 남은 칸 0 — 꼴찌는 남은 칸이 가장 많은 사람
export const rankScore = (g: WalkGame, i: number): number => left(g, i) * 100 + (99 - Math.min(99, g.stars[i]));

// 봇: 보이는 것 그대로(숨은 정보 없는 게임). view → 고를 걸음 번호(opts 의 k)
export const view = (g: WalkGame): WalkView => JSON.parse(JSON.stringify({ n: g.n, D: g.D, turn: g.turn, prog: g.prog, stars: g.stars, rest: g.rest, die: g.die, opts: g.opts, state: g.state }));
// 칸 값(걸음 단위): 사건이 몇 칸만큼 득·실인가 — 보통 봇이 쓴다
export function value(v: WalkView, o: Opt): number {
  const i = v.turn, me = v.prog[i] + o.d, others = v.prog.filter((_, j) => j !== i);
  let x = o.d - o.cost * 1.6; // 별 하나 ≈ 1.6칸(버리면 남은 판에서 못 쓴다)
  if (me >= v.D) return 1000;
  switch (o.kind) {
    case "bell": x -= RULES.BELL_BACK; break;
    case "ball": x += RULES.BALL_FWD + (me + RULES.BALL_FWD >= v.D ? 1000 : 0); break;
    case "meat": x += 3.2; break;
    case "bath": x -= 3.2; break;
    case "treat": x += 1.6; break;
    case "photo": x += 1.6 - 1.6 * (v.n - 1) / v.n; break; // 남도 받는다
    case "friend": x += others.reduce((a, b) => a + b, 0) / others.length - me; break;
    case "rain": if (me >= Math.max(...others)) x -= RULES.RAIN_BACK; break;
  }
  return x;
}
// easy(연습): 아무거나(r 은 화면 난수). normal(보통): 칸 값이 가장 큰 걸음
export function bot(v: WalkView, level: BotLevel | string, r?: () => number): number {
  const opts = v.opts || []; if (opts.length <= 1) return 0;
  if (level === "easy") return Math.floor((r || Math.random)() * opts.length);
  let best = 0, bv = -1e9;
  opts.forEach((o, k) => { const x = value(v, o) + (o.cost ? 0 : 0.01); if (x > bv) { bv = x; best = k; } });
  return best;
}
