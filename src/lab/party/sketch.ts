// 내기 모음 5 「그림 전달」 — 규칙 엔진(순수, 화면 모름). 규격 docs/lab-party-sketch-spec.md. 🔴 표와 코드가 다르면 코드가 맞다.
// 시안 docs/lab-party-sketch.js(md5 5a1e5127…, 1판 — 봇 bot·view·밑그림 45개 포함)를 그대로 옮긴 판이다. 동작은 바꾸지 않고 타입만 붙였다
// (tmp/lab-party-port/equiv.mjs sketch 가 두 엔진을 같은 씨앗·같은 입력으로 나란히 돌려 상태·사람마다 보기·봇 답을 맞댄다).
// 릴레이: 줄(chain)의 첫 사람이 몰래 받은 낱말을 그리고 → 다음 사람은 그 그림만 보고 맞히고 → 다음 사람은 그 맞힌 말을 그리고 … 끝에 줄 전체를 공개.
// 줄은 사람 수만큼(각자 하나씩 시작), 3명은 두 바퀴(한 판 시간 — 시뮬 참고). 차례 하나 = 한 사람이 한 줄의 한 칸.
// 점수: 맞히기가 「그린 사람이 그리려던 말」 과 같으면 맞힌 사람 +1 · 그린 사람 +1(별). 점수는 공개 때 보인다(판 중에 맞았나를 비추지 않는다).
// 그림은 획(stroke) 목록 { c: 색 번호, p: [x, y, x, y, …] } — 좌표는 0–1000 정수(화면 크기와 무관).

export type Stroke = { c: number; p: number[] };
export type SketchItem = { kind: "draw" | "guess"; p: number; strokes?: Stroke[]; hint?: string | null; text: string | null; ok?: boolean };
export type SketchChain = { lap: number; start: number; word: string; items: SketchItem[] };
export type SketchTurn = { lap: number; chain: number; s: number; p: number; kind: "draw" | "guess"; choices?: string[] };
export type SketchState = "play" | "reveal" | "over";
export type SketchGame = {
  n: number;
  seed: number;
  len: number;
  laps: number;
  lap: number;
  chains: SketchChain[];
  turns: SketchTurn[];
  t: number;
  scores: number[];
  state: SketchState;
  /** 씨앗 난수(열거 안 됨 — JSON 저장·비교에서 빠진다) */
  r: () => number;
};
/** 그 자리 사람(봇)이 지금 받는 것 하나: 그릴 말 또는 앞 칸 그림 + 6칸 */
export type SketchView = { kind: "draw"; word: string } | { kind: "guess"; strokes: Stroke[]; hint: string | null; choices: string[] };
export type SketchMove = { strokes?: Stroke[]; hint?: string | null; text?: string };
export type BotLevel = "easy" | "normal";

export const RULES = {
  DRAW_SEC: 30, // 그리기 제한(초)
  CHOICES: 6, // 고르기 칸 수(정답 1 + 헷갈리는 말 5)
  LEN: { 3: 3, 4: 4 } as Record<number, number>, // 줄 길이: 3명 그림·맞히기·그림 · 4명 그림·맞히기·그림·맞히기(한 사람이 한 줄에 한 번만 — 앞을 아는 사람이 다시 안 본다)
  LAPS: { 3: 2, 4: 1 } as Record<number, number>, // 바퀴 수: 3명 1바퀴는 한 판 3.6분이라 두 바퀴(시뮬 — 규격 2절)
  COLORS: ["#3a2228", "#e85a5a", "#3a8fd6", "#47a35a"], // 먹 · 빨강 · 파랑 · 초록
};
// 낱말 45개: 코코 세계(간식·산책·집)와 늘 보는 물건. 모두 두 글자 이상(한 글자 낱말은 화면 글자 안에 우연히 섞여 비침 검사가 헛빨강을 낸다)
export const CATS: Record<string, string[]> = {
  동물: ["강아지", "고양이", "물고기", "나비", "비둘기", "토끼", "달팽이"],
  간식: ["사과", "바나나", "당근", "수박", "치즈", "쿠키", "케이크", "아이스크림", "달걀"],
  코코: ["뼈다귀", "축구공", "개집", "밥그릇", "초인종", "목줄"],
  물건: ["칫솔", "청소기", "우산", "의자", "시계", "안경", "모자", "양말", "열쇠", "연필", "풍선", "머그컵"],
  하늘: ["구름", "무지개", "눈사람", "초승달", "나무", "해바라기"],
  탈것: ["자전거", "자동차", "비행기", "기차", "돛단배"],
};
export const WORDS: string[] = [];
const CAT: Record<string, string> = {};
for (const k in CATS) for (const w of CATS[k]) { WORDS.push(w); CAT[w] = k; }

// ── 봇이 그리는 밑그림(100 칸 좌표, 낱말마다 몇 획) ──
type PresetStroke = number[] | Stroke;
const r1 = (v: number) => Math.round(v * 10) / 10;
function C(cx: number, cy: number, r: number, n?: number): number[] { const p: number[] = []; n = n || 16; for (let k = 0; k <= n; k++) { const a = (k / n) * Math.PI * 2; p.push(r1(cx + Math.cos(a) * r), r1(cy + Math.sin(a) * r)); } return p; }
function E(cx: number, cy: number, rx: number, ry: number): number[] { const p: number[] = []; for (let k = 0; k <= 16; k++) { const a = (k / 16) * Math.PI * 2; p.push(r1(cx + Math.cos(a) * rx), r1(cy + Math.sin(a) * ry)); } return p; }
function A(cx: number, cy: number, r: number, a0: number, a1: number): number[] { const p: number[] = [], n = 12; for (let k = 0; k <= n; k++) { const a = ((a0 + (a1 - a0) * (k / n)) * Math.PI) / 180; p.push(r1(cx + Math.cos(a) * r), r1(cy + Math.sin(a) * r)); } return p; }
function R(x: number, y: number, w: number, h: number): number[] { return [x, y, x + w, y, x + w, y + h, x, y + h, x, y]; }
const L = (...p: number[]) => p;
const k = (c: number, p: number[]): Stroke => ({ c, p }); // 색 붙인 획(없으면 먹)
export const PRESET: Record<string, PresetStroke[]> = {
  강아지: [C(50, 52, 22), L(30, 40, 22, 64, 33, 58), L(70, 40, 78, 64, 67, 58), C(42, 50, 2.5, 8), C(58, 50, 2.5, 8), E(50, 60, 4, 3), L(44, 66, 50, 70, 56, 66)],
  고양이: [C(50, 56, 22), L(32, 46, 34, 24, 46, 36), L(54, 36, 66, 24, 68, 46), C(42, 54, 2.5, 8), C(58, 54, 2.5, 8), L(26, 62, 42, 61), L(58, 61, 74, 62), L(47, 62, 50, 65, 53, 62)],
  물고기: [k(2, E(44, 50, 28, 16)), k(2, L(70, 50, 90, 34, 90, 66, 70, 50)), C(28, 46, 3, 8), L(48, 40, 52, 50, 48, 60)],
  나비: [k(1, E(34, 40, 15, 13)), k(1, E(66, 40, 15, 13)), k(2, E(37, 64, 11, 9)), k(2, E(63, 64, 11, 9)), L(50, 30, 50, 78), L(50, 30, 42, 16), L(50, 30, 58, 16)],
  비둘기: [E(54, 58, 26, 15), C(28, 42, 10), L(19, 40, 9, 44, 19, 46), L(78, 54, 94, 48, 92, 64, 78, 62), L(48, 73, 46, 86), L(60, 73, 62, 86), C(26, 40, 1.8, 6)],
  토끼: [C(50, 64, 18), E(42, 30, 6, 18), E(58, 30, 6, 18), C(44, 62, 2, 6), C(56, 62, 2, 6), L(48, 70, 50, 72, 52, 70)],
  달팽이: [C(56, 50, 20), C(56, 50, 12), C(56, 50, 5, 8), L(18, 72, 86, 72, 86, 66), L(18, 72, 22, 62, 34, 62), L(24, 62, 18, 48), L(30, 62, 32, 48)],
  사과: [k(1, C(50, 58, 26)), L(50, 32, 52, 18), k(3, L(52, 22, 64, 14, 70, 22, 56, 26))],
  바나나: [L(16, 38, 26, 62, 46, 76, 70, 76, 86, 64), L(16, 38, 34, 56, 54, 64, 72, 62, 86, 64), L(14, 34, 18, 40)],
  당근: [k(1, L(38, 30, 62, 30, 50, 90, 38, 30)), k(3, L(46, 30, 38, 12)), k(3, L(50, 30, 50, 10)), k(3, L(54, 30, 62, 12)), L(43, 44, 50, 46), L(46, 60, 52, 62)],
  수박: [k(1, L(14, 40, 86, 40)), k(3, A(50, 40, 36, 0, 180)), k(1, A(50, 40, 29, 0, 180)), C(38, 52, 2, 6), C(50, 58, 2, 6), C(62, 52, 2, 6)],
  치즈: [L(12, 72, 88, 72, 88, 42, 12, 72), L(88, 42, 62, 30, 12, 72), C(62, 60, 4, 8), C(76, 54, 3, 8), C(48, 64, 2.5, 8)],
  쿠키: [C(50, 50, 30), C(40, 40, 3, 8), C(60, 42, 3, 8), C(46, 60, 3, 8), C(64, 62, 3, 8), C(36, 54, 2, 6)],
  케이크: [R(22, 52, 56, 34), L(22, 66, 78, 66), k(2, R(47, 34, 6, 18)), k(1, E(50, 27, 3, 5))],
  아이스크림: [L(34, 50, 50, 92, 66, 50), L(40, 62, 58, 54), k(1, C(41, 42, 11)), k(1, C(59, 42, 11)), k(2, C(50, 28, 10))],
  달걀: [L(24, 50, 22, 34, 36, 22, 54, 24, 70, 20, 80, 34, 78, 52, 82, 68, 66, 80, 46, 76, 28, 74, 24, 50), k(1, C(50, 50, 11))],
  뼈다귀: [C(20, 40, 9), C(20, 60, 9), C(80, 40, 9), C(80, 60, 9), L(27, 44, 73, 44), L(27, 56, 73, 56)],
  축구공: [C(50, 50, 32), L(50, 38, 61, 46, 57, 59, 43, 59, 39, 46, 50, 38), L(50, 38, 50, 18), L(61, 46, 80, 40), L(57, 59, 68, 76), L(43, 59, 32, 76), L(39, 46, 20, 40)],
  개집: [k(1, L(16, 48, 50, 18, 84, 48)), R(24, 46, 52, 40), L(42, 86, 42, 68, 50, 60, 58, 68, 58, 86)],
  밥그릇: [L(16, 56, 84, 56), A(50, 56, 34, 0, 180), C(38, 50, 4, 8), C(50, 47, 4, 8), C(62, 50, 4, 8), L(36, 90, 64, 90)],
  초인종: [L(28, 70, 30, 44, 38, 30, 50, 24, 62, 30, 70, 44, 72, 70), L(22, 70, 78, 70), k(1, C(50, 79, 5, 10)), C(50, 20, 3, 8)],
  목줄: [k(1, E(32, 40, 20, 14)), L(50, 46, 60, 58, 54, 70, 66, 80, 80, 86), E(86, 88, 7, 5)],
  칫솔: [R(12, 58, 60, 9), k(2, R(66, 44, 22, 14)), L(70, 44, 70, 58), L(76, 44, 76, 58), L(82, 44, 82, 58)],
  청소기: [E(36, 72, 20, 12), C(24, 86, 5, 10), C(48, 86, 5, 10), L(52, 66, 64, 44, 70, 24), L(70, 24, 80, 82), L(70, 84, 92, 84)],
  우산: [k(2, A(50, 48, 36, 180, 360)), L(14, 48, 26, 42, 38, 48, 50, 42, 62, 48, 74, 42, 86, 48), L(50, 48, 50, 84, 44, 88, 38, 84)],
  의자: [L(32, 12, 32, 88), L(32, 54, 72, 54, 72, 88), L(32, 30, 22, 30), L(32, 12, 26, 12)],
  시계: [C(50, 50, 32), L(50, 50, 50, 28), L(50, 50, 64, 56), L(50, 20, 50, 25), L(80, 50, 75, 50), L(50, 80, 50, 75), L(20, 50, 25, 50)],
  안경: [C(30, 52, 14), C(70, 52, 14), L(44, 50, 56, 50), L(16, 48, 6, 40), L(84, 48, 94, 40)],
  모자: [R(32, 22, 36, 40), L(16, 62, 84, 62), k(1, L(32, 52, 68, 52))],
  양말: [L(38, 12, 62, 12, 62, 60, 82, 70, 78, 88, 52, 86, 38, 68, 38, 12), k(1, L(38, 24, 62, 24))],
  열쇠: [C(26, 50, 14), C(26, 50, 5, 8), L(40, 50, 90, 50), L(76, 50, 76, 62), L(86, 50, 86, 64)],
  연필: [L(22, 72, 70, 24, 82, 36, 34, 84, 22, 72), L(22, 72, 12, 92, 34, 84), k(1, L(70, 24, 76, 18, 88, 30, 82, 36))],
  풍선: [k(1, E(50, 36, 22, 27)), L(46, 64, 54, 64, 50, 68, 46, 64), L(50, 68, 45, 78, 55, 86, 48, 96)],
  머그컵: [R(26, 36, 38, 48), L(64, 44, 78, 44, 80, 56, 78, 68, 64, 70), L(36, 28, 40, 20, 36, 12), L(52, 28, 56, 20, 52, 12)],
  구름: [k(2, L(20, 66, 12, 56, 20, 44, 32, 44, 36, 32, 50, 26, 62, 34, 72, 30, 84, 40, 84, 52, 90, 60, 82, 68, 20, 66))],
  무지개: [k(1, A(50, 78, 38, 180, 360)), k(3, A(50, 78, 29, 180, 360)), k(2, A(50, 78, 20, 180, 360)), L(6, 80, 30, 80), L(70, 80, 94, 80)],
  눈사람: [C(50, 70, 20), C(50, 36, 14), C(45, 33, 1.8, 6), C(55, 33, 1.8, 6), k(1, L(50, 37, 60, 39, 50, 41)), C(50, 62, 2, 6), C(50, 74, 2, 6)],
  초승달: [A(50, 50, 32, 60, 300), A(64, 44, 26, 100, 260)],
  나무: [L(44, 92, 44, 62), L(56, 92, 56, 62), k(3, C(50, 40, 24)), k(3, C(32, 50, 12)), k(3, C(68, 50, 12))],
  해바라기: [C(50, 38, 10), L(50, 18, 56, 28, 68, 24, 62, 34, 72, 40, 60, 44, 66, 56, 54, 48, 50, 60, 46, 48, 34, 56, 40, 44, 28, 40, 38, 34, 32, 24, 44, 28, 50, 18), k(3, L(50, 52, 50, 92)), k(3, L(50, 74, 64, 66, 60, 76, 50, 74))],
  자전거: [C(24, 64, 16), C(76, 64, 16), L(24, 64, 42, 40, 66, 40, 76, 64), L(42, 40, 50, 64, 24, 64), L(50, 64, 66, 40), L(38, 32, 48, 32), L(42, 32, 42, 40), L(66, 40, 64, 30, 72, 28)],
  자동차: [k(1, L(8, 66, 8, 50, 26, 48, 36, 32, 66, 32, 78, 48, 92, 52, 92, 66, 8, 66)), C(28, 68, 9), C(72, 68, 9), L(40, 46, 46, 36, 62, 36, 70, 46, 40, 46)],
  비행기: [E(50, 50, 40, 8), L(44, 46, 30, 18, 40, 18, 58, 46), L(44, 54, 30, 82, 40, 82, 58, 54), L(84, 46, 90, 32, 94, 32, 92, 50), C(20, 48, 2, 6)],
  기차: [R(14, 44, 48, 28), R(58, 28, 26, 44), R(22, 28, 8, 16), k(2, R(64, 34, 14, 12)), C(26, 78, 7, 10), C(48, 78, 7, 10), C(72, 78, 7, 10)],
  돛단배: [L(14, 64, 86, 64, 72, 82, 28, 82, 14, 64), L(50, 64, 50, 12), k(2, L(53, 14, 82, 56, 53, 56, 53, 14)), k(1, L(50, 12, 40, 16, 50, 20))],
};
// 밑그림 → 획(0–1000 정수)
export function presetStrokes(w: string): Stroke[] | null {
  const P = PRESET[w];
  if (!P) return null;
  return P.map((s) => (Array.isArray(s) ? { c: 0, p: s.map((v) => Math.round(v * 10)) } : { c: s.c, p: s.p.map((v) => Math.round(v * 10)) }));
}

function rng(seed: number): () => number { let s = seed >>> 0 || 1; return function () { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle<T>(r: () => number, a: T[]): T[] { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// 맞았나 맞대기: 빈칸·문장부호를 빼고 같으면 같다
export const norm = (s: unknown): string => String(s || "").replace(/[\s.,!?~·'"「」]/g, "").toLowerCase();
// 초성(봇이 못 그리는 낱말의 글자 힌트)
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
export const chosung = (s: unknown): string => [...String(s)].map((ch) => { const c = ch.charCodeAt(0) - 0xac00; return c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch; }).join("");

// 판 만들기: 바퀴마다 줄 n개(줄 c 는 사람 c 가 시작), 줄 하나의 칸 s 는 사람 (c + s) % n — 한 사람이 한 줄에 한 번만.
// 차례 순서: 칸 0 을 줄 0…n-1 이 차례로, 그다음 칸 1 … (사람이 한 바퀴씩 돈다 — 바로 앞 차례와 늘 다른 사람)
export function create(n: number, seed?: number): SketchGame {
  const len = RULES.LEN[n] || 4, laps = RULES.LAPS[n] || 1;
  const g = { n, seed: seed || 1, len, laps, lap: 0, chains: [], turns: [], t: 0, scores: Array(n).fill(0), state: "play" } as unknown as SketchGame;
  Object.defineProperty(g, "r", { value: rng(g.seed), enumerable: false, writable: true });
  const pool = shuffle(g.r, WORDS.slice());
  for (let l = 0; l < laps; l++) {
    for (let c = 0; c < n; c++) g.chains.push({ lap: l, start: c, word: pool[l * n + c], items: [] });
    for (let s = 0; s < len; s++) for (let c = 0; c < n; c++) g.turns.push({ lap: l, chain: l * n + c, s, p: (c + s) % n, kind: s % 2 === 0 ? "draw" : "guess" });
  }
  prepare(g);
  return g;
}
export const cur = (g: SketchGame): SketchTurn | null => (g.state === "play" ? g.turns[g.t] : null);
// 그 칸의 「정답」: 앞 칸이 그림이면 그 그림이 그리려던 말. 칸 s 가 그리기면 그릴 말
export function target(g: SketchGame, T: SketchTurn): string { const ch = g.chains[T.chain]; return (T.s === 0 ? ch.word : T.kind === "draw" ? ch.items[T.s - 1].text : T.s === 1 ? ch.word : ch.items[T.s - 2].text) as string; }
// 맞히기 칸에 들어갈 6칸: 정답 + 같은 갈래 낱말 3 + 다른 갈래 2(이 줄에 이미 나온 말은 뺀다 — 처음 낱말이 헷갈리는 말로 섞이면 힌트가 된다)
function prepare(g: SketchGame): void {
  const T = cur(g);
  if (!T || T.kind !== "guess" || T.choices) return;
  const ans = target(g, T), ch = g.chains[T.chain];
  const used = new Set([norm(ch.word), ...ch.items.filter((it) => it.text).map((it) => norm(it.text)), norm(ans)]);
  const same = shuffle(g.r, (CATS[CAT[ans]] || []).filter((w) => !used.has(norm(w))));
  const pick = same.slice(0, 3);
  const rest = shuffle(g.r, WORDS.filter((w) => !used.has(norm(w)) && !pick.includes(w)));
  while (pick.length < RULES.CHOICES - 1) pick.push(rest.shift() as string);
  T.choices = shuffle(g.r, [ans, ...pick]);
}
// 그 자리 사람이 지금 볼 수 있는 것만(봇에도 이것만 넘긴다). 차례가 아니면 null
export function view(g: SketchGame, i: number): SketchView | null {
  const T = cur(g);
  if (!T || T.p !== i) return null;
  if (T.kind === "draw") return { kind: "draw", word: target(g, T) };
  const prev = g.chains[T.chain].items[T.s - 1];
  return { kind: "guess", strokes: JSON.parse(JSON.stringify(prev.strokes)), hint: prev.hint || null, choices: (T.choices as string[]).slice() };
}
// 내기: 그리기 { strokes, hint? } · 맞히기 { text }. 바퀴의 마지막 칸이면 state = "reveal"(공개), 마지막 바퀴면 공개 뒤 over
export function submit(g: SketchGame, i: number, d?: SketchMove | null): boolean {
  const T = cur(g);
  if (!T || T.p !== i) return false;
  const ch = g.chains[T.chain];
  if (T.kind === "draw") ch.items.push({ kind: "draw", p: i, strokes: (d && d.strokes) || [], hint: (d && d.hint) || null, text: null });
  else {
    const text = String((d && d.text) || "").trim().slice(0, 12), ans = target(g, T), ok = norm(text) === norm(ans) && norm(text) !== "";
    ch.items.push({ kind: "guess", p: i, text, ok });
    if (ok) { g.scores[i]++; g.scores[ch.items[T.s - 1].p]++; } // 맞힌 사람 + 그린 사람
  }
  g.t++;
  const N = g.turns[g.t];
  if (!N || N.lap !== T.lap) g.state = "reveal";
  else prepare(g);
  return true;
}
// 공개를 다 봤다: 다음 바퀴 또는 끝
export function next(g: SketchGame): boolean {
  if (g.state !== "reveal") return false;
  if (g.t >= g.turns.length) { g.state = "over"; return true; }
  g.lap++; g.state = "play"; prepare(g);
  return true;
}
// 바퀴 l 의 별: 줄마다 [맞힌 사람, 그린 사람] 짝(공개 화면이 띠를 차례로 올린다)
export function lapScores(g: SketchGame, l: number): number[] {
  const s: number[] = Array(g.n).fill(0);
  for (const ch of g.chains) if (ch.lap <= l) ch.items.forEach((it, k) => { if (it.ok) { s[it.p]++; s[ch.items[k - 1].p]++; } });
  return s;
}

// ── 봇(혼자 연습): view 만 받는다 ──
// 그리기: 밑그림에 손떨림(연습 ±5 · 보통 ±2), 연습은 30 % 로 한 획을 빠뜨린다. 밑그림 없는 낱말(누가 직접 쓴 말)은 「?」 + 초성 힌트
// 맞히기: 그림을 12×12 칸으로 줄여 고르기 6칸 낱말의 밑그림과 겹침을 대 보고 가장 닮은 것. 연습은 45 % 로 아무거나. 힌트가 있으면 초성이 맞는 것
const BOT: Record<string, { jit: number; drop: number; blind: number }> = { easy: { jit: 50, drop: 0.3, blind: 0.45 }, normal: { jit: 20, drop: 0, blind: 0 } };
function grid(strokes: Stroke[]): Set<number> {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const s of strokes) for (let j = 0; j < s.p.length; j += 2) { x0 = Math.min(x0, s.p[j]); x1 = Math.max(x1, s.p[j]); y0 = Math.min(y0, s.p[j + 1]); y1 = Math.max(y1, s.p[j + 1]); }
  const G = 12, cells = new Set<number>(), sc = (G - 1) / Math.max(1, x1 - x0, y1 - y0), ox = (G - 1 - (x1 - x0) * sc) / 2, oy = (G - 1 - (y1 - y0) * sc) / 2;
  const mark = (x: number, y: number) => cells.add(Math.round(ox + (x - x0) * sc) * G + Math.round(oy + (y - y0) * sc));
  for (const s of strokes) {
    if (s.p.length >= 2) mark(s.p[0], s.p[1]);
    for (let j = 0; j + 3 < s.p.length; j += 2) {
    const ax = s.p[j], ay = s.p[j + 1], bx = s.p[j + 2], by = s.p[j + 3], m = Math.max(1, Math.ceil((Math.hypot(bx - ax, by - ay) * sc) / 0.5));
    for (let q = 0; q <= m; q++) mark(ax + ((bx - ax) * q) / m, ay + ((by - ay) * q) / m);
    }
  }
  return cells;
}
function near(cells: Set<number>, c: number): boolean { const G = 12, x = Math.floor(c / G), y = c % G; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (cells.has((x + dx) * G + y + dy)) return true; return false; }
function likeness(a: Set<number>, b: Set<number>): number { if (!a.size || !b.size) return 0; let ab = 0, ba = 0; a.forEach((c) => { if (near(b, c)) ab++; }); b.forEach((c) => { if (near(a, c)) ba++; }); return ab / a.size + ba / b.size; }
export function bot(v: SketchView | null, level: BotLevel | string, r: () => number): SketchMove | null {
  const B = BOT[level] || BOT.normal;
  if (!v) return null;
  if (v.kind === "draw") {
    const P = presetStrokes(v.word);
    if (!P) return { strokes: [{ c: 0, p: [380, 300, 420, 220, 560, 200, 640, 280, 620, 380, 520, 440, 500, 560] }, { c: 0, p: [500, 700, 505, 720] }], hint: chosung(v.word) };
    const S = P.map((s) => ({ c: s.c, p: s.p.map((x) => Math.max(0, Math.min(1000, Math.round(x + (r() - 0.5) * 2 * B.jit)))) }));
    if (B.drop && S.length > 2 && r() < B.drop) S.splice(Math.floor(r() * S.length), 1);
    return { strokes: S, hint: null };
  }
  const ch = v.choices;
  if (v.hint) { const m = ch.filter((w) => chosung(w) === v.hint); return { text: m.length ? m[Math.floor(r() * m.length)] : ch[Math.floor(r() * ch.length)] }; }
  if (r() < B.blind || !v.strokes.length) return { text: ch[Math.floor(r() * ch.length)] };
  const me = grid(v.strokes);
  let best: string | null = null, bs = -1;
  for (const w of ch) { const P = presetStrokes(w); const s = P ? likeness(me, grid(P)) + r() * 0.01 : r() * 0.01; if (s > bs) { bs = s; best = w; } }
  return { text: best as string };
}
