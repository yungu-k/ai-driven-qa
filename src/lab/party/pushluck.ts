// 내기 모음 3 「한 칸 더?」 — 규칙 엔진(순수, 화면 모름). 규격 docs/lab-party-pushluck-spec.md. 🔴 표와 코드가 다르면 코드가 맞다.
// 시안 docs/lab-party-pushluck.js(md5 3dd6ab8c…, 1.1판 — 봇 bot·viewOf 포함)를 그대로 옮긴 판이다. 동작은 바꾸지 않고 타입만 붙였다
// (tmp/lab-party-port/equiv.mjs pushluck 가 두 엔진을 같은 씨앗·같은 입력으로 나란히 돌려 상태를 맞댄다).
// 운 밀어붙이기 주사위: 내 차례에 주사위를 굴려 나온 눈의 간식을 접시에 담는다(눈 = 간식 수).
// 이번 차례에 이미 나온 눈이 또 나오면 코코가 접시를 쳐다본다(경고 — 그 굴림은 0). 경고 뒤에 또 겹치면 코코가 접시를 낚아챈다 — 이번 차례 0.
// 언제든 「멈춤」 하면 접시를 내 것으로. 여섯 눈을 다 모으면 「한 바퀴!」 덤 +BONUS 하고 차례가 끝난다.
// ROUNDS[n] 바퀴 뒤 합계가 가장 적은 사람이 꼴찌. 위험이 눈에 보인다: 접시에 k 칸이면 다음 굴림이 겹칠 확률 k/6.

/** ROUNDS: 사람 수별 바퀴(한 판 4–5분으로 맞춤) · WARNS: 터지기 전 봐주는 겹침 수 */
export const RULES = { FACES: 6, ROUNDS: { 2: 10, 3: 8, 4: 6 } as Record<number, number>, BONUS: 10, WARNS: 1 };
/** 눈마다 간식(화면 이름) — 코코가 좋아하는 것 */
export const TREATS = ["개껌", "사과", "상추", "쿠키", "고기", "치즈"];

export type RollResult = { face: number; warn?: boolean; bust?: boolean; lost?: number; full?: boolean };
export type LogEntry = { p: number; e: "warn" | "bust" | "full" | "bank"; face?: number; lost?: number; pot?: number; n?: number };
export type PushluckState = "turn" | "bust" | "banked" | "over";
export type PushluckGame = {
  n: number;
  round: number;
  rounds: number;
  turn: number;
  scores: number[];
  plate: number[];
  pot: number;
  warn: number;
  state: PushluckState;
  last: RollResult | null;
  log: LogEntry[];
  seed: number;
  rolls: number;
  /** 씨앗 주사위(열거 안 됨 — JSON 저장·비교에서 빠진다) */
  readonly r: () => number;
};
/** 봇이 받는 것 — 화면에 보이는 그대로(숨은 정보 없는 게임) */
export type PushluckView = { plate: number[]; warn: number; pot: number; mine: number; best: number; last: boolean };
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

/** n: 사람 수(2–4). 상태는 그대로 JSON 으로 저장·비교할 수 있게 함수·순환 참조 없이(rng 는 옆에 둔다) */
export function create(n: number, seed?: number, rounds?: number): PushluckGame {
  const g = { n, round: 1, rounds: rounds || RULES.ROUNDS[n] || 6, turn: 0, scores: Array(n).fill(0), plate: [], pot: 0, warn: 0, state: "turn", last: null, log: [], seed: seed || 1, rolls: 0 } as unknown as PushluckGame;
  Object.defineProperty(g, "r", { value: rng(g.seed), enumerable: false });
  return g;
}
/** 다음 굴림이 겹칠 확률(경고 전이면 경고, 경고 뒤면 터짐) */
export function risk(g: PushluckGame): number {
  return g.plate.length / RULES.FACES;
}
/** 굴리기: 결과 { face, warn | bust | full }. face 를 주면 그 눈(리그·시험용 — 화면은 안 준다) */
export function roll(g: PushluckGame, face?: number): RollResult | null {
  if (g.state !== "turn") return null;
  const f = face || 1 + Math.floor(g.r() * RULES.FACES);
  g.rolls++;
  if (g.plate.includes(f) && g.warn < RULES.WARNS) {
    g.warn++;
    g.last = { face: f, warn: true };
    g.log.push({ p: g.turn, e: "warn", face: f });
    return g.last;
  }
  if (g.plate.includes(f)) {
    g.last = { face: f, bust: true, lost: g.pot };
    g.log.push({ p: g.turn, e: "bust", face: f, lost: g.pot });
    g.plate = [];
    g.pot = 0;
    g.warn = 0;
    g.state = "bust";
    return g.last;
  }
  g.plate.push(f);
  g.pot += f;
  if (g.plate.length === RULES.FACES) {
    // 한 바퀴: 덤 받고 저절로 멈춤
    g.pot += RULES.BONUS;
    g.last = { face: f, full: true };
    bank(g, true);
    return g.last;
  }
  g.last = { face: f };
  return g.last;
}
function bank(g: PushluckGame, full: boolean): boolean {
  if (g.state !== "turn" || !g.plate.length) return false;
  g.scores[g.turn] += g.pot;
  g.log.push({ p: g.turn, e: full ? "full" : "bank", pot: g.pot, n: g.plate.length });
  g.plate = [];
  g.pot = 0;
  g.warn = 0;
  g.state = "banked";
  return true;
}
export const stop = (g: PushluckGame): boolean => bank(g, false);
/** 다음 사람으로(화면이 넘기기 화면을 띄운 뒤 부른다). 마지막 사람이 끝나면 바퀴 +1, ROUNDS 넘으면 끝 */
export function next(g: PushluckGame): boolean {
  if (g.state === "turn") return false;
  g.turn++;
  if (g.turn >= g.n) {
    g.turn = 0;
    g.round++;
  }
  if (g.round > g.rounds) {
    g.state = "over";
    return true;
  }
  g.state = "turn";
  g.last = null;
  return true;
}

/**
 * 봇(혼자 연습): 보이는 것만 받는다(view). easy(연습): 3칸이면 멈춤, 경고는 모른 척.
 * normal(보통): 경고 받으면 멈춤(2칸부터), 5칸이면 멈춤, 마지막 바퀴에 뒤지면 따라잡을 때까지.
 */
export function bot(v: PushluckView, level: BotLevel | string): "roll" | "stop" {
  const k = v.plate.length;
  if (!k) return "roll";
  if (level === "easy") return k >= 3 ? "stop" : "roll";
  if (v.last && v.mine + v.pot <= v.best && k < 5) return "roll";
  if (v.warn && k >= 2) return "stop";
  return k >= 5 ? "stop" : "roll";
}
export const viewOf = (g: PushluckGame): PushluckView => ({ plate: g.plate.slice(), warn: g.warn, pot: g.pot, mine: g.scores[g.turn], best: Math.max(...g.scores.filter((_, i) => i !== g.turn)), last: g.round === g.rounds });
