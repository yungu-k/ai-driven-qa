// 내기 모음 7 「비밀 경매」 — 규칙 엔진(순수, 화면 모름). 규격 docs/lab-party-auction-spec.md. 🔴 표와 코드가 다르면 코드가 맞다.
// 시안 docs/lab-party-auction.js(md5 e92b3b65…, 1판 — 봇 bot·view 포함)를 그대로 옮긴 판이다. 동작은 바꾸지 않고 타입만 붙였다
// (tmp/lab-party-port/equiv.mjs auction 이 두 엔진을 같은 씨앗·같은 입력으로 나란히 돌려 상태·사람마다 보기·봇 답을 맞댄다).
// 코코 장터: 모두 같은 수의 뼈다귀 토큰으로 시작. 물건이 하나씩 나오면 한 사람씩 몰래 토큰 수를 적는다(남은 사람 것은 안 보인다).
// 모두 내면 한꺼번에 공개 — 가장 많이 낸 사람이 가져가고 낸 만큼 토큰을 쓴다(진 사람은 그대로).
// 1등이 같으면 남은 토큰이 적은 사람이 가져간다. 그것도 같거나 모두 0 이면 코코가 물고 간다(아무도 안 씀).
// 점수 = 물건 별 합 + 「한 벌」(장난감·간식·잠자리 하나씩) 마다 보너스. 남은 토큰은 점수가 아니다.
// 숨은 값은 g.bids(이번 물건에 이미 낸 사람의 수) 하나뿐 — view(g, i) 는 이것을 빼고 만든다(봇·리그).

export type AuctionState = "bid" | "reveal" | "over";
export type AuctionResult = { item: number; bids: number[]; win: number; tie: number[] };
export type AuctionGame = {
  n: number;
  seed: number;
  items: number[];
  k: number;
  tokens: number[];
  won: number[][];
  coco: number[];
  /** 🔴 숨은 값: 이번 물건에 이미 낸 사람의 수(안 낸 자리는 null) */
  bids: (number | null)[];
  order: number[];
  at: number;
  state: AuctionState;
  log: AuctionResult[];
  /** 씨앗 난수(열거 안 됨 — JSON 저장·비교에서 빠진다) */
  r: () => number;
};
/** 봇·화면에 넘기는 공개 정보(i 자리 사람이 볼 수 있는 것만 — g.bids 없음) */
export type AuctionView = {
  me: number;
  n: number;
  k: number;
  items: number[];
  tokens: number[];
  won: number[][];
  coco: number[];
  history: { item: number; bids: number[]; win: number }[];
  set: number;
};
export type BotLevel = "easy" | "normal";

// BUDGET: 처음 토큰 · ITEMS: 판에 나오는 물건 수(3명 12 = 전부, 4명 10 — 한 판 8–10분) · SET: 한 벌 보너스 · PAY: winner(가져간 사람만 냄) | all(모두 낸 만큼 씀 — 시뮬 비교용)
export const RULES = { BUDGET: { 3: 20, 4: 20 } as Record<number, number>, ITEMS: { 3: 12, 4: 10 } as Record<number, number>, SET: 4, PAY: "winner" as "winner" | "all" };
export const KINDS = ["장난감", "간식", "잠자리"];
// 물건 12개 = 종류 셋 × 별 1·2·3·5
export const POOL: { kind: number; pts: number; name: string }[] = [
  { kind: 0, pts: 1, name: "삑삑 오리" }, { kind: 0, pts: 2, name: "테니스공" }, { kind: 0, pts: 3, name: "밧줄 장난감" }, { kind: 0, pts: 5, name: "날아라 원반" },
  { kind: 1, pts: 1, name: "개껌" }, { kind: 1, pts: 2, name: "고구마 말랭이" }, { kind: 1, pts: 3, name: "치즈 큐브" }, { kind: 1, pts: 5, name: "소고기 육포" },
  { kind: 2, pts: 1, name: "작은 베개" }, { kind: 2, pts: 2, name: "체크 담요" }, { kind: 2, pts: 3, name: "푹신 방석" }, { kind: 2, pts: 5, name: "구름 집" },
];

export function rng(seed: number): () => number { let s = seed >>> 0 || 1; return function () { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle<T>(r: () => number, a: T[]): T[] { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// 상태는 JSON 으로 맞댈 수 있게(함수·순환 없음, rng 는 숨긴 속성)
export function create(n: number, seed?: number): AuctionGame {
  const r = rng(seed || 1);
  const items = shuffle(r, POOL.map((_, k) => k)).slice(0, RULES.ITEMS[n] || RULES.ITEMS[4]);
  const g = { n, seed: seed || 1, items, k: 0, tokens: Array(n).fill(RULES.BUDGET[n] || 20), won: Array.from({ length: n }, () => []), coco: [],
    bids: Array(n).fill(null), order: [], at: 0, state: "bid", log: [] } as unknown as AuctionGame;
  Object.defineProperty(g, "r", { value: r, enumerable: false });
  startItem(g);
  return g;
}
// 물건마다 내는 차례: 첫 사람이 한 칸씩 돈다(몰래 내니 차례는 넘기는 순서일 뿐)
function startItem(g: AuctionGame): void {
  g.bids = Array(g.n).fill(null); g.at = 0; g.state = "bid";
  g.order = Array.from({ length: g.n }, (_, j) => (g.k + j) % g.n);
}
export const bidder = (g: AuctionGame): number => (g.state === "bid" ? g.order[g.at] : -1);
// 몰래 내기: 지금 차례(i)만, 0 ≤ v ≤ 내 토큰. 마지막 사람이 내면 공개(state = "reveal")하고 결과를 돌려준다
export function bid(g: AuctionGame, i: number, v: unknown): { placed: true } | AuctionResult | null {
  if (g.state !== "bid" || i !== bidder(g)) return null;
  v = Math.floor(+(v as number));
  if (!((v as number) >= 0 && (v as number) <= g.tokens[i])) return null;
  g.bids[i] = v as number; g.at++;
  if (g.at < g.n) return { placed: true };
  return resolve(g);
}
function resolve(g: AuctionGame): AuctionResult {
  const bids = g.bids as number[];
  const top = Math.max(...bids), at = bids.map((v, j) => (v === top ? j : -1)).filter((j) => j >= 0);
  const item = g.items[g.k];
  // 1등이 같으면 남은 토큰이 적은 사람이 가져간다(따라잡기) — 그것도 같거나 모두 0 이면 코코가 물고 간다
  const poor = Math.min(...at.map((j) => g.tokens[j])), poorest = at.filter((j) => g.tokens[j] === poor);
  const win = top > 0 && poorest.length === 1 ? poorest[0] : -1;
  if (RULES.PAY === "all") bids.forEach((v, j) => (g.tokens[j] -= v));
  else if (win >= 0) g.tokens[win] -= top;
  if (win >= 0) g.won[win].push(item); else g.coco.push(item);
  const res: AuctionResult = { item, bids: bids.slice(), win, tie: at.length > 1 && top > 0 ? at : [] }; // tie: 1등이 같았던 사람들(토큰 적은 쪽이 가져갔거나 코코)
  g.log.push(res);
  g.state = "reveal";
  return res;
}
export function next(g: AuctionGame): boolean {
  if (g.state !== "reveal") return false;
  g.k++;
  if (g.k >= g.items.length) { g.state = "over"; g.bids = Array(g.n).fill(null); return true; }
  startItem(g);
  return true;
}
export const counts = (list: number[]): number[] => KINDS.map((_, c) => list.filter((it) => POOL[it].kind === c).length);
export function score(g: AuctionGame, i: number): number { const w = g.won[i]; return w.reduce((a, it) => a + POOL[it].pts, 0) + RULES.SET * Math.min(...counts(w)); }
export const scores = (g: AuctionGame): number[] => g.won.map((_, i) => score(g, i));

// 봇에 넘기는 것: i 자리 사람이 화면에서 볼 수 있는 것만 — 모두의 남은 토큰·가져간 물건·지난 공개 기록·물건 줄. 🔴 이번 물건의 남의 입찰(g.bids)은 없다
export function view(g: AuctionGame, i: number): AuctionView {
  return { me: i, n: g.n, k: g.k, items: g.items.slice(), tokens: g.tokens.slice(), won: g.won.map((w) => w.slice()), coco: g.coco.slice(),
    history: g.log.map((l) => ({ item: l.item, bids: l.bids.slice(), win: l.win })), set: RULES.SET };
}

// 봇. r 은 화면이 주는 난수(엔진 씨앗과 따로)
// easy(연습): 대충 — 0 ~ 토큰 절반 사이 아무 수
// normal(보통): 남이 얼마 낼지를 공개된 것(남은 토큰 · 지난 공개 입찰)으로 어림하고, 그보다 1 많이 — 그 값이 이 물건 몫보다 비싸면 몫 언저리까지만.
//   물건 몫 = 내 토큰 × 이 물건 값(별 + 한 벌에 다가가는 몫) ÷ 남은 물건 값 합 × 사람 수(대략 남은 것의 1/n 을 가져간다고 보고).
//   아무도 못 따라올 수면 그 +1 만, 남이 다 바닥이면 1, 마지막 물건은 남은 걸 다(토큰은 점수가 아니다).
export function worth(v: AuctionView, it: number, who: number): number {
  const c = counts(v.won[who]), k = POOL[it].kind, low = Math.min(...c);
  let s = POOL[it].pts;
  if (c[k] === low) { const after = c.slice(); after[k]++; s += Math.min(...after) > low ? v.set : v.set * 0.45; } // 한 벌을 채우면 보너스 전부, 모자란 종류를 메우면 절반쯤
  return s;
}
// 지난 공개 기록으로 j 가 「고르게 나눠 낼 값」(남은 토큰 ÷ 남은 물건) 의 몇 배를 내는 사람인지 어림(기록이 없으면 1.3배)
function habit(v: AuctionView, j: number): number {
  let t = v.tokens[j] + v.history.reduce((a, l) => a + (l.win === j ? l.bids[j] : 0), 0), sum = 0, cnt = 0; // 처음 토큰을 되짚어 그때그때 토큰을 다시 센다
  v.history.forEach((l, h) => { const per = t / (v.items.length - h); if (per > 0) { sum += l.bids[j] / per; cnt++; } if (l.win === j) t -= l.bids[j]; });
  return (sum + BOTP.habit * 2) / (cnt + 2); // 앞의 두 번은 어림값에 기대어 천천히 배운다
}
export const BOTP = { share: 1.1, habit: 1.3, jit: 4 }; // 보통 봇 손잡이(시뮬로 고른 값 — 규격 3절)
export function bot(v: AuctionView, level: BotLevel | string, r: () => number): number {
  const me = v.me, mine = v.tokens[me];
  if (mine <= 0) return 0;
  if (level === "easy") return Math.floor(r() * (Math.floor(mine / 2) + 1));
  const left = v.items.slice(v.k), it = left[0], nl = left.length;
  const others = [...Array(v.n).keys()].filter((j) => j !== me), maxO = Math.max(...others.map((j) => v.tokens[j]));
  if (maxO === 0) return 1;
  if (nl === 1) return Math.min(mine, maxO + 1);
  const avg = (who: number) => left.reduce((a, x) => a + worth(v, x, who), 0) / nl;
  // 남이 낼 값 어림: 고르게 낼 값 × 버릇 × (이 물건이 그 사람에게 남은 것 평균보다 얼마나 값진가)
  const est = others.map((j) => (v.tokens[j] / nl) * habit(v, j) * Math.min(2.2, worth(v, it, j) / avg(j)));
  const need = Math.min(maxO + 1, Math.floor(Math.max(...est)) + 1 + Math.floor(r() * BOTP.jit)); // 같은 봇끼리 같은 수가 나오면 코코가 다 가져간다 — 0~3 더 얹어 흩는다(0 이면 봇 셋 판에서 12개 모두 코코)
  const share = (mine / nl) * v.n * BOTP.share * (worth(v, it, me) / avg(me)); // 이 물건에 쓸 만한 값
  if (need <= share) return Math.min(mine, need); // 남보다 1 많이가 내 몫보다 싸면 그 값만
  return Math.min(mine, maxO + 1, Math.round(share * (0.75 + r() * 0.3))); // 비싸면 내 몫 언저리까지만(못 이겨도 남이 비싸게 사게 된다)
}
