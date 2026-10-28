// 내기 모음 2 「간식 숨기기」 — 규칙 엔진(순수, 화면 모름). 규격 docs/lab-party-hide-spec.md. 🔴 표와 코드가 다르면 코드가 맞다.
// 시안 docs/lab-party-hide.js(md5 b420c17f…, 1판 — 봇 bot·view 포함)를 그대로 옮긴 판이다. 동작은 바꾸지 않고 타입만 붙였다
// (tmp/lab-party-port/equiv.mjs hide 가 두 엔진을 같은 씨앗·같은 입력으로 나란히 돌려 상태·사람마다 보기·봇 답을 맞댄다).
// 바퀴마다 ① 숨기기(몰래, 한 사람씩): 내 컵 셋 중 하나에 간식, 다른 하나에 삑삑이 — 지난 바퀴에 간식을 넣은 컵엔 또 못 넣는다.
//   컵마다 늘 「발자국 컵」 하나가 공개돼 있다 — 거기엔 간식을 못 넣는다. 첫 바퀴는 무작위, 다음부턴 지난 바퀴에 간식을 넣은 컵.
// ② 찾기(다 같이 보며, 한 사람씩): 남의 컵 하나를 든다. 간식이면 찾은 사람 +1 · 주인 −1, 삑삑이면 든 사람 −1 · 주인 +1, 빈 컵이면 그대로.
// ③ 공개: 모든 컵을 열고, 간식을 안 들킨 사람은 +1(코코 칭찬). ROUNDS[n] 바퀴 뒤 간식이 가장 적은 사람이 꼴찌.
// 발자국 컵엔 간식이 없다는 게 추리의 실마리, 삑삑이를 어디 두느냐가 블러핑이다.

export type HidePhase = "hide" | "seek" | "reveal" | "over";
export type HideWhat = "treat" | "toy" | "empty";
/** 한 사람의 숨김: t 간식 컵 · y 삑삑이 컵 */
export type HideSlot = { t: number; y: number };
export type HideLift = { s: number; o: number; c: number; what: HideWhat; ds: number; do: number };
export type HideHist = { round: number; first: number; hide: HideSlot[]; paw: number[]; lifts: HideLift[]; safe: number[] };
export type HideLog = ({ round: number; e: "lift" } & HideLift) | { round: number; e: "safe"; safe: number[] };
export type HideGame = {
  n: number;
  seed: number;
  round: number;
  rounds: number;
  phase: HidePhase;
  k: number;
  scores: number[];
  /** 🔴 숨은 값 — view() 밖으로 남의 것을 내지 않는다 */
  hide: (HideSlot | null)[];
  lifts: HideLift[];
  found: boolean[];
  hist: HideHist[];
  log: HideLog[];
  paw0: number[];
};
/** i 자리 사람이 볼 수 있는 것만(봇에 넘긴다) */
export type HideView = { me: number; n: number; round: number; rounds: number; phase: HidePhase; scores: number[]; mine: HideSlot | null; lifts: HideLift[]; found: boolean[]; hist: HideHist[]; lastT: number[] };
export type HideMove = { t: number; y: number } | { o: number; c: number };
export type BotLevel = "easy" | "normal";

// ROUNDS: 사람 수별 바퀴(한 판 5분 — 시뮬 2절) · START: 처음 간식 · 점수는 0 밑으로 안 내려간다(줄 게 없으면 안 준다)
// ROUNDS 는 사람 수의 배수 — 바퀴마다 찾는 첫 사람이 한 칸씩 돌아 모두 같은 횟수로 첫째가 된다(첫째는 본 것이 없어 손해 — 시뮬 2절)
export const RULES = { CUPS: 3, START: 3, ROUNDS: { 2: 8, 3: 6, 4: 4 } as Record<number, number>, FIND: 1, TOY: 1, SAFE: 1, NO_REPEAT: true };
export const CUP_NAMES = ["왼쪽", "가운데", "오른쪽"];

export function rng(seed: number): () => number { let s = seed >>> 0 || 1; return function () { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 상태는 JSON 으로 맞댈 수 있게(함수·순환 참조 없음). hide[i] = { t: 간식 컵, y: 삑삑이 컵 } — 🔴 숨은 값, view() 밖으로 남의 것을 내지 않는다
export function create(n: number, seed?: number, rounds?: number): HideGame {
  const g: HideGame = { n, seed: seed || 1, round: 1, rounds: rounds || RULES.ROUNDS[n] || 4, phase: "hide", k: 0, scores: Array(n).fill(RULES.START),
    hide: Array(n).fill(null), lifts: [], found: Array(n).fill(false), hist: [], log: [], paw0: [] };
  // 첫 바퀴 발자국 컵(무작위, 공개). 첫 바퀴만 발자국이 없으면 그 바퀴 첫째만 손해가 덜해 자리 공정이 깨졌다(시뮬 4명 1등 36/34/28/26 %)
  const r = rng(g.seed); for (let i = 0; i < n; i++) g.paw0.push(Math.floor(r() * RULES.CUPS));
  return g;
}
// 이 바퀴의 첫 사람(바퀴마다 한 칸씩 — 찾기는 뒤에 들수록 본 것이 많아 유리하니 돌린다)
export const first = (g: HideGame) => (g.round - 1) % g.n;
// 지금 차례(숨기기·찾기 둘 다 같은 순서)
export const cur = (g: HideGame) => (g.phase === "hide" || g.phase === "seek" ? (first(g) + g.k) % g.n : -1);
// i 의 발자국 컵(공개된 값) — 이번엔 거기 간식을 못 넣는다. 지난 바퀴 간식 컵, 첫 바퀴는 무작위
export const lastT = (g: HideGame, i: number) => (g.hist.length ? g.hist[g.hist.length - 1].hide[i].t : g.paw0[i]);
export function canHide(g: HideGame, i: number, t: number, y: number) {
  return g.phase === "hide" && cur(g) === i && t !== y && t >= 0 && t < RULES.CUPS && y >= 0 && y < RULES.CUPS && !(RULES.NO_REPEAT && t === lastT(g, i));
}
export function hide(g: HideGame, i: number, t: number, y: number) {
  if (!canHide(g, i, t, y)) return false;
  g.hide[i] = { t, y }; g.k++;
  if (g.k >= g.n) { g.phase = "seek"; g.k = 0; }
  return true;
}
export const isLifted = (g: HideGame, o: number, c: number) => g.lifts.some((l) => l.o === o && l.c === c);
export const canLift = (g: HideGame, s: number, o: number, c: number) => g.phase === "seek" && cur(g) === s && o !== s && o >= 0 && o < g.n && c >= 0 && c < RULES.CUPS && !isLifted(g, o, c);
// 컵 들기: { what: treat|toy|empty, ds, do } (점수 변화)
export function lift(g: HideGame, s: number, o: number, c: number): HideLift | null {
  if (!canLift(g, s, o, c)) return null;
  const H = g.hide[o]!, what: HideWhat = H.t === c ? "treat" : H.y === c ? "toy" : "empty";
  let ds = 0, dO = 0;
  if (what === "treat") { ds = RULES.FIND; dO = -Math.min(RULES.FIND, g.scores[o]); g.found[o] = true; }
  if (what === "toy") { ds = -Math.min(RULES.TOY, g.scores[s]); dO = RULES.TOY; }
  g.scores[s] += ds; g.scores[o] += dO;
  const L: HideLift = { s, o, c, what, ds, do: dO };
  g.lifts.push(L); g.log.push(Object.assign({ round: g.round, e: "lift" as const }, L));
  g.k++;
  if (g.k >= g.n) g.phase = "reveal";
  return L;
}
// 공개: 안 들킨 사람 +SAFE, 바퀴 기록(이제 공개된 값), 다음 바퀴로. { safe: [i…] }
export function endRound(g: HideGame): { safe: number[] } | null {
  if (g.phase !== "reveal") return null;
  const safe: number[] = [];
  for (let i = 0; i < g.n; i++) if (!g.found[i]) { g.scores[i] += RULES.SAFE; safe.push(i); }
  g.hist.push({ round: g.round, first: first(g), hide: g.hide.map((h) => ({ t: h!.t, y: h!.y })), paw: Array.from({ length: g.n }, (_, j) => lastT(g, j)), lifts: g.lifts.map((l) => Object.assign({}, l)), safe: safe.slice() });
  g.log.push({ round: g.round, e: "safe", safe: safe.slice() });
  g.round++; g.hide = Array(g.n).fill(null); g.lifts = []; g.found = Array(g.n).fill(false); g.k = 0;
  g.phase = g.round > g.rounds ? "over" : "hide";
  return { safe };
}

// ── 봇에 넘기는 것: i 자리 사람이 볼 수 있는 것만 ──
// 내 이번 숨김(mine) · 점수 · 이번 바퀴에 든 컵(다 같이 본 것) · 지난 바퀴들(공개된 것). 🔴 남의 이번 숨김(g.hide[j], j≠i)은 없다 — 리그가 값을 바꿔 맞대 본다
export function view(g: HideGame, i: number): HideView {
  return JSON.parse(JSON.stringify({ me: i, n: g.n, round: g.round, rounds: g.rounds, phase: g.phase, scores: g.scores, mine: g.hide[i], lifts: g.lifts, found: g.found, hist: g.hist, lastT: Array.from({ length: g.n }, (_, j) => lastT(g, j)) }));
}

// ── 봇(혼자 연습): bot(view, level, r) → 숨기기 { t, y } · 찾기 { o, c }. r 은 화면이 주는 난수 ──
// easy(연습): 규칙만 지키고 아무렇게나. normal(보통): 공개된 것으로 추리한다 —
//   찾기: 사람마다 가능한 숨김(간식·삑삑이 자리 쌍)을 지난 버릇(공개된 바퀴)으로 무게 매기고, 발자국 컵은 간식 후보에서 빼고,
//         이번 바퀴에 이미 든 컵 결과로 거른 뒤 「간식일 확률 − 삑삑이일 확률」 이 가장 큰 컵을 든다.
//   숨기기: 남이 나를 그렇게 볼 때 덜 의심하는 컵에 간식, 삑삑이는 대개 다른 후보 컵에(발자국 컵은 어차피 간식이 없다고 읽힌다).
const pick = <T>(a: T[], r: () => number): T => a[Math.floor(r() * a.length)];
function belief(v: HideView, o: number) {
  // o 의 가능한 (t, y) 쌍마다 무게. 지난 버릇: 간식·삑삑이 자리 빈도(+1 고르게), 삑삑이를 지난번 간식 컵에 둔 비율
  const ft = [1, 1, 1], fy = [1, 1, 1]; let onLast = 1, rounds2 = 2;
  v.hist.forEach((h) => { ft[h.hide[o].t]++; fy[h.hide[o].y]++; rounds2++; if (h.hide[o].y === h.paw[o]) onLast++; });
  const lt = v.lastT[o], pOn = onLast / rounds2, W: { t: number; y: number; w: number }[] = [];
  for (let t = 0; t < 3; t++) for (let y = 0; y < 3; y++) {
    if (t === y || t === lt) continue;
    let w = ft[t] * fy[y];
    w *= y === lt ? pOn : 1 - pOn;
    // 이번 바퀴에 든 컵과 맞지 않는 쌍은 버린다
    let ok = true;
    for (const L of v.lifts) if (L.o === o) { const what = L.c === t ? "treat" : L.c === y ? "toy" : "empty"; if (what !== L.what) ok = false; }
    if (ok) W.push({ t, y, w });
  }
  return W;
}
export function bot(v: HideView, level: BotLevel | string, r?: () => number): HideMove {
  r = r || Math.random;
  const me = v.me;
  if (v.phase === "hide") {
    const lt = v.lastT[me], ts = [0, 1, 2].filter((c) => c !== lt);
    if (level === "easy") { const t = pick(ts, r); return { t, y: pick([0, 1, 2].filter((c) => c !== t), r) }; }
    // 남이 보는 나: belief(me) 에서 간식 확률이 낮은 후보에 무게(그래도 늘 같은 데는 안 가게 섞는다)
    const W = belief(Object.assign({}, v, { lifts: [] }), me), pT = [0, 0, 0];
    let tot = 0; W.forEach((x) => { pT[x.t] += x.w; tot += x.w; });
    const ws = ts.map((c) => 1.2 - pT[c] / tot), sum = ws.reduce((a, b) => a + b, 0);
    let u = r() * sum, t = ts[ts.length - 1];
    for (let k = 0; k < ts.length; k++) { u -= ws[k]; if (u <= 0) { t = ts[k]; break; } }
    const others = [0, 1, 2].filter((c) => c !== t);
    // 삑삑이: 발자국 컵은 다들 「간식은 없다」 로 읽으니 대개(80 %) 다른 후보에 — 남는 후보 둘이 「간식 아니면 삑삑이」 가 되게
    const y = others.includes(lt) && r() < 0.8 ? others.find((c) => c !== lt)! : pick(others, r);
    return { t, y };
  }
  // 찾기
  const cand: { o: number; c: number }[] = [];
  for (let o = 0; o < v.n; o++) if (o !== me) for (let c = 0; c < 3; c++) if (!v.lifts.some((L) => L.o === o && L.c === c)) cand.push({ o, c });
  if (level === "easy") return pick(cand, r);
  let best: { o: number; c: number; key: number } | null = null;
  for (let o = 0; o < v.n; o++) {
    if (o === me) continue;
    const W = belief(v, o); let tot = 0; W.forEach((x) => (tot += x.w));
    for (let c = 0; c < 3; c++) {
      if (v.lifts.some((L) => L.o === o && L.c === c)) continue;
      let pt = 0, py = 0; W.forEach((x) => { if (x.t === c) pt += x.w; if (x.y === c) py += x.w; });
      const ev = tot ? (pt - py) / tot : -1, key = ev + r() * 0.0005; // 같으면 아무나 — 「점수 높은 사람 먼저」 를 두니 첫 바퀴 첫째가 일찍 잃고 덜 노려져 1등 34 % 대 26 % 로 기울었다
      if (!best || key > best.key) best = { o, c, key };
    }
  }
  return best ? { o: best.o, c: best.c } : pick(cand, r);
}
