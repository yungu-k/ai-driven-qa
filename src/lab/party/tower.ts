// 내기 모음 4 「흔들 탑 쌓기」 — 규칙 엔진 + 작은 2D 강체 물리(순수, 화면 모름). 규격 docs/lab-party-tower-spec.md. 🔴 표와 코드가 다르면 코드가 맞다.
// 시안 docs/lab-party-tower.js(md5 ee740bfb…, 1판 — 봇 bot·view 포함)를 그대로 옮긴 판이다. 동작은 바꾸지 않고 타입만 붙였다
// (tmp/lab-party-port/equiv.mjs tower 가 두 엔진을 같은 씨앗·같은 놓기 틱으로 나란히 돌려 틱마다 몸 상태를 맞댄다 — 물리 부동소수까지 같아야 한다).
// 차례마다 코코 세계 물건 하나(쿠키·개껌·방석·밥그릇·공·치즈·간식 상자)가 탑 위에서 좌우로 흔들린다. 눌러서 놓는다.
// 놓은 물건이 멈춘 뒤(또는 멈추기 전이라도) 무엇이든 받침 상 밖으로 떨어지면 놓은 사람이 「와르르」 1번 — 그 판 끝.
// ROUNDS[n] 판 뒤 와르르가 가장 많은 사람이 꼴찌. 시간은 고정 틱(1/60 초) — 화면도 시뮬도 같은 step(g) 를 같은 횟수 부른다(결정적).
// 물리: 볼록 다각형만(공은 12각). SAT + 기준 면 자르기 접촉(최대 2점), 누적 충격량 순차 풀이 + 따뜻한 시작(접촉 id 로 이어 받기), 투영 치우침(Baumgarte) + 앞질러 보는 접촉(빠른 낙하 뚫림 막기).
// 상태는 숫자·배열뿐(JSON 으로 맞댈 수 있다). 난수는 g.rs(정수 씨앗)에서만.

type V2 = [number, number];
export type PieceKind = "cookie" | "bone" | "cushion" | "box" | "bowl" | "ball" | "cheese";
export type Piece = { kind: PieceKind; name: string; w: number; d: number; mu: number; v: V2[] };
export type Body = {
  id: number; kind: string; owner: number;
  x: number; y: number; a: number; vx: number; vy: number; w: number;
  im: number; ii: number; mass: number; mu: number; v: V2[]; n: V2[]; st: boolean; fell: boolean; gone: boolean;
};
export type Swing = { cx: number; A: number; period: number; phase: number };
export type Hanging = { kind: PieceKind; y: number; swing: Swing };
export type TowerState = "ready" | "turn" | "aim" | "fall" | "done" | "roundEnd" | "over";
export type TurnResult = { lost: boolean; fell: number[]; by: number; ticks: number; others: number; capped: boolean };
export type TowerLog = { round: number; by: number; kind: string | undefined; lost: boolean; fell: number; others: number; ticks: number; aim: number };
export type TowerGame = {
  n: number; seed: number; rs: number; round: number; rounds: number; turn: number; starter: number;
  losses: number[]; placed: number[]; hpts: number[];
  state: TowerState; bodies: Body[]; arb: Record<string, [string, number, number][]>; nextId: number; tick: number;
  piece: Hanging | null; next: PieceKind | null; drop: number | null; dropTick?: number; still: number; since: number; touched: boolean; stack: number;
  result: TurnResult | null; log: TowerLog[];
};
export type TowerView = {
  tick: number;
  piece: (Hanging & { v: V2[] }) | null;
  next: PieceKind | null;
  base: { x: number; w: number; top: number };
  stack: number;
  tower: { kind: string; x: number; y: number; a: number; mass: number; x0: number; x1: number; y1: number }[];
};
export type BotLevel = "easy" | "normal";
export type BotPlan = { tick: number; target: number | null };
type World = { W: number[]; N: number[]; k: number; x0: number; y0: number; x1: number; y1: number };
type CPt = { x: number; y: number; id: string };
type Manifold = { nx: number; ny: number; pts: (CPt & { sep: number })[] };
type Contact = { id: string; rax: number; ray: number; rbx: number; rby: number; mn: number; mt: number; bias: number; pn: number; pt: number };
type Arbiter = { a: Body; b: Body; nx: number; ny: number; tx: number; ty: number; mu: number; cs: Contact[]; key: string };

// ── 물리 상수(미터·초) ──
export const DT = 1 / 60;
const ITER = 10, GRAV = -10, SLOP = 0.008, BETA = 0.2, MARGIN = 0.06, MAXBIAS = 2.5, LIN_DAMP = 0.004, ANG_DAMP = 0.02;
// ── 규칙 상수 ──
export const RULES = {
  ROUNDS: { 2: 7, 3: 6, 4: 6 } as Record<number, number>, // 사람 수별 판 수(판당 6–7 차례라 판 수를 늘림 — 1판 5·4·4 는 2.3–2.9분이었다. 2명은 홀수로 비김을 없앤다)
  BASE_W: 2.6,                   // 받침 상 폭(위 면 y = 0)
  FLOOR_Y: -1.0,                 // 바닥(떨어진 것이 굴러 멈추는 곳 — 보이기만, 판정은 FELL_Y)
  FELL_Y: -0.12,                 // 물건 무게 중심이 상 위 면보다 이만큼 아래면 「떨어짐」
  SWING_A: 1.6,                  // 흔들림 폭(가운데에서 ±) — 상 가장자리(1.3)보다 넓어 헛놓으면 떨어진다
  PERIOD0: 3.6, PERIOD_STEP: 0.08, PERIOD_MIN: 2.2, // 흔들림 한 번 왕복(초) — 그 판에 쌓은 수만큼 빨라진다
  CLEAR: 0.25,                   // 탑 꼭대기와 매달린 물건 바닥 사이
  AIM_CAP: 540,                  // 9 초 안에 안 누르면 저절로 놓인다(판이 늘어지지 않게)
  SETTLE_V: 0.05, SETTLE_W: 0.12, SETTLE_TICKS: 24, // 이 아래로 24 틱(0.4 초) 이어지면 「멈춤」
  SETTLE_MIN: 20, SETTLE_CAP: 420, // 놓고 나서 최소 20 틱, 최대 7 초 — 넘으면 그때 자리로 판정
};
// 물건(로컬 좌표, y 위, 반시계 꼭짓점). w = 뽑힐 무게
const ngon = (r: number, k: number, sy?: number): V2[] => Array.from({ length: k }, (_, i) => { const a = (i / k) * Math.PI * 2 + Math.PI / k; return [r * Math.cos(a), r * Math.sin(a) * (sy || 1)] as V2; });
export const PIECES: Piece[] = [
  { kind: "cookie", name: "쿠키", w: 3, d: 1, mu: 0.7, v: [[-0.45, -0.07], [-0.37, -0.13], [0.37, -0.13], [0.45, -0.07], [0.45, 0.07], [0.37, 0.13], [-0.37, 0.13], [-0.45, 0.07]] },
  { kind: "bone", name: "개껌", w: 3, d: 1, mu: 0.6, v: [[-0.62, -0.11], [0.62, -0.11], [0.62, 0.11], [-0.62, 0.11]] },
  { kind: "cushion", name: "방석", w: 3, d: 0.6, mu: 0.9, v: [[-0.55, -0.09], [-0.46, -0.16], [0.46, -0.16], [0.55, -0.09], [0.55, 0.09], [0.46, 0.16], [-0.46, 0.16], [-0.55, 0.09]] },
  { kind: "box", name: "간식 상자", w: 3, d: 0.8, mu: 0.7, v: [[-0.3, -0.25], [0.3, -0.25], [0.3, 0.25], [-0.3, 0.25]] },
  { kind: "bowl", name: "밥그릇", w: 2, d: 1, mu: 0.6, v: [[-0.25, -0.18], [0.25, -0.18], [0.41, 0.18], [-0.41, 0.18]] },
  { kind: "ball", name: "공", w: 1, d: 1.1, mu: 0.6, v: ngon(0.28, 12) },
  { kind: "cheese", name: "치즈", w: 1, d: 0.9, mu: 0.7, v: [[-0.42, -0.17], [0.42, -0.17], [-0.42, 0.23]] },
];
const PIECE_W = PIECES.reduce((a, p) => a + p.w, 0);

// ── 씨앗 난수(상태는 정수 g.rs 하나) ──
function rand(g: TowerGame): number { g.rs = (g.rs + 0x6d2b79f5) >>> 0; let t = g.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

// ── 몸(body) ──
// 꼭짓점을 무게 중심으로 옮기고 질량·관성(다각형 부채꼴 적분)을 낸다
function makeBody(id: number, kind: string, verts: V2[], x: number, y: number, a: number, dens: number, mu: number, owner: number): Body {
  let cx = 0, cy = 0, area = 0; const s = verts[0];
  for (let i = 1; i < verts.length - 1; i++) {
    const e1x = verts[i][0] - s[0], e1y = verts[i][1] - s[1], e2x = verts[i + 1][0] - s[0], e2y = verts[i + 1][1] - s[1];
    const tri = 0.5 * (e1x * e2y - e1y * e2x); area += tri; cx += tri * (e1x + e2x) / 3; cy += tri * (e1y + e2y) / 3;
  }
  cx = cx / area + s[0]; cy = cy / area + s[1];
  const v = verts.map((p) => [p[0] - cx, p[1] - cy] as V2);
  let I = 0;
  for (let i = 0; i < v.length; i++) {
    const e1 = v[i], e2 = v[(i + 1) % v.length], D = e1[0] * e2[1] - e1[1] * e2[0];
    I += (0.25 / 3) * D * (e1[0] * e1[0] + e2[0] * e1[0] + e2[0] * e2[0] + e1[1] * e1[1] + e2[1] * e1[1] + e2[1] * e2[1]);
  }
  const n = v.map((p, i) => { const q = v[(i + 1) % v.length], ex = q[0] - p[0], ey = q[1] - p[1], l = Math.hypot(ex, ey); return [ey / l, -ex / l] as V2; });
  const st = dens === 0, m = dens * area;
  return { id, kind, owner, x: x + cx, y: y + cy, a, vx: 0, vy: 0, w: 0, im: st ? 0 : 1 / m, ii: st ? 0 : 1 / (dens * I), mass: m, mu, v, n, st, fell: false, gone: false };
}
export function world(b: Body): World {
  const c = Math.cos(b.a), s = Math.sin(b.a), W: number[] = [], N: number[] = [];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < b.v.length; i++) {
    const p = b.v[i], q = b.n[i], wx = b.x + c * p[0] - s * p[1], wy = b.y + s * p[0] + c * p[1];
    W.push(wx, wy); N.push(c * q[0] - s * q[1], s * q[0] + c * q[1]);
    if (wx < x0) x0 = wx; if (wx > x1) x1 = wx; if (wy < y0) y0 = wy; if (wy > y1) y1 = wy;
  }
  return { W, N, k: b.v.length, x0, y0, x1, y1 };
}
// ── 접촉: 분리축(SAT) → 기준 면 / 부딪는 면 → 양옆 자르기. 법선은 A → B ──
function maxSep(A: World, B: World): [number, number] {
  let best = -1e9, bi = 0;
  for (let i = 0; i < A.k; i++) {
    const nx = A.N[2 * i], ny = A.N[2 * i + 1], vx = A.W[2 * i], vy = A.W[2 * i + 1];
    let mn = 1e9;
    for (let j = 0; j < B.k; j++) { const d = nx * (B.W[2 * j] - vx) + ny * (B.W[2 * j + 1] - vy); if (d < mn) mn = d; }
    if (mn > best) { best = mn; bi = i; }
  }
  return [bi, best];
}
function clip(pts: CPt[], nx: number, ny: number, off: number, cid: string): CPt[] {
  const out: CPt[] = [], a = pts[0], b = pts[1], d0 = nx * a.x + ny * a.y - off, d1 = nx * b.x + ny * b.y - off;
  if (d0 <= 0) out.push(a); if (d1 <= 0) out.push(b);
  if (d0 * d1 < 0) { const t = d0 / (d0 - d1); out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y), id: cid }); }
  return out;
}
function collide(A: World, B: World): Manifold | null {
  const [ea, sa] = maxSep(A, B); if (sa > MARGIN) return null;
  const [eb, sb] = maxSep(B, A); if (sb > MARGIN) return null;
  let R: World, I: World, e: number, flip: number;
  if (sb > sa + 0.0005) { R = B; I = A; e = eb; flip = 1; } else { R = A; I = B; e = ea; flip = 0; }
  const rnx = R.N[2 * e], rny = R.N[2 * e + 1];
  let ii = 0, mn = 1e9;
  for (let j = 0; j < I.k; j++) { const d = rnx * I.N[2 * j] + rny * I.N[2 * j + 1]; if (d < mn) { mn = d; ii = j; } }
  const i2 = (ii + 1) % I.k, e2 = (e + 1) % R.k;
  const v11x = R.W[2 * e], v11y = R.W[2 * e + 1], v12x = R.W[2 * e2], v12y = R.W[2 * e2 + 1];
  let tx = v12x - v11x, ty = v12y - v11y; const tl = Math.hypot(tx, ty); tx /= tl; ty /= tl;
  const nx = ty, ny = -tx, front = nx * v11x + ny * v11y, side1 = -(tx * v11x + ty * v11y), side2 = tx * v12x + ty * v12y;
  let pts: CPt[] = [{ x: I.W[2 * ii], y: I.W[2 * ii + 1], id: "i" + ii }, { x: I.W[2 * i2], y: I.W[2 * i2 + 1], id: "i" + i2 }];
  pts = clip(pts, -tx, -ty, side1, "c" + e); if (pts.length < 2) return null;
  pts = clip(pts, tx, ty, side2, "c" + e2); if (pts.length < 2) return null;
  const out: (CPt & { sep: number })[] = [];
  for (const p of pts) { const sep = nx * p.x + ny * p.y - front; if (sep <= MARGIN) out.push({ x: p.x, y: p.y, sep, id: flip + ":" + e + ":" + p.id }); }
  return out.length ? { nx: flip ? -nx : nx, ny: flip ? -ny : ny, pts: out } : null;
}

// ── 한 틱 ──
function physStep(g: TowerGame): void {
  const B = g.bodies.filter((b) => !b.gone);
  for (const b of B) if (!b.st) { b.vy += GRAV * DT; b.vx *= 1 - LIN_DAMP; b.vy *= 1 - LIN_DAMP; b.w *= 1 - ANG_DAMP; }
  const Wd = B.map(world), arbs: Arbiter[] = [], next: Record<string, [string, number, number][]> = {};
  for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
    const a = B[i], b = B[j]; if (a.st && b.st) continue;
    const A = Wd[i], C = Wd[j];
    if (A.x1 + MARGIN < C.x0 || C.x1 + MARGIN < A.x0 || A.y1 + MARGIN < C.y0 || C.y1 + MARGIN < A.y0) continue;
    const m = collide(A, C); if (!m) continue;
    const key = a.id + "," + b.id, old = g.arb[key] || [], mu = Math.sqrt(a.mu * b.mu), nx = m.nx, ny = m.ny, tx = -ny, ty = nx;
    const cs = m.pts.map((p): Contact => {
      const o = old.find((q) => q[0] === p.id), rax = p.x - a.x, ray = p.y - a.y, rbx = p.x - b.x, rby = p.y - b.y;
      const rna = rax * ny - ray * nx, rnb = rbx * ny - rby * nx, rta = rax * ty - ray * tx, rtb = rbx * ty - rby * tx;
      const kn = a.im + b.im + a.ii * rna * rna + b.ii * rnb * rnb, kt = a.im + b.im + a.ii * rta * rta + b.ii * rtb * rtb;
      const bias = p.sep > 0 ? -p.sep / DT : Math.min(MAXBIAS, (BETA / DT) * Math.max(0, -p.sep - SLOP));
      return { id: p.id, rax, ray, rbx, rby, mn: 1 / kn, mt: 1 / kt, bias, pn: o ? o[1] : 0, pt: o ? o[2] : 0 };
    });
    arbs.push({ a, b, nx, ny, tx, ty, mu, cs, key });
    if (p0touch(a, b, g)) g.touched = true;
  }
  const imp = (A: Arbiter, c: Contact, px: number, py: number) => { A.a.vx -= A.a.im * px; A.a.vy -= A.a.im * py; A.a.w -= A.a.ii * (c.rax * py - c.ray * px); A.b.vx += A.b.im * px; A.b.vy += A.b.im * py; A.b.w += A.b.ii * (c.rbx * py - c.rby * px); };
  for (const A of arbs) for (const c of A.cs) imp(A, c, c.pn * A.nx + c.pt * A.tx, c.pn * A.ny + c.pt * A.ty); // 따뜻한 시작
  for (let it = 0; it < ITER; it++) for (const A of arbs) {
    const a = A.a, b = A.b;
    for (const c of A.cs) {
      let dvx = b.vx - b.w * c.rby - a.vx + a.w * c.ray, dvy = b.vy + b.w * c.rbx - a.vy - a.w * c.rax;
      const vn = dvx * A.nx + dvy * A.ny; let dp = c.mn * (-vn + c.bias); const p0 = c.pn; c.pn = Math.max(p0 + dp, 0); dp = c.pn - p0;
      imp(A, c, dp * A.nx, dp * A.ny);
      dvx = b.vx - b.w * c.rby - a.vx + a.w * c.ray; dvy = b.vy + b.w * c.rbx - a.vy - a.w * c.rax;
      const vt = dvx * A.tx + dvy * A.ty, max = A.mu * c.pn; let dt = c.mt * -vt; const t0 = c.pt; c.pt = Math.max(-max, Math.min(max, t0 + dt)); dt = c.pt - t0;
      imp(A, c, dt * A.tx, dt * A.ty);
    }
  }
  for (const A of arbs) next[A.key] = A.cs.map((c) => [c.id, c.pn, c.pt] as [string, number, number]);
  g.arb = next;
  for (const b of B) if (!b.st) { b.x += b.vx * DT; b.y += b.vy * DT; b.a += b.w * DT; if (b.y < RULES.FLOOR_Y - 4) b.gone = true; }
  g.tick++;
}
// 이번에 놓은 물건이 무엇이든 닿았나(떨어지는 동안은 「멈춤」 을 보지 않는다)
function p0touch(a: Body, b: Body, g: TowerGame): boolean { return g.drop != null && (a.id === g.drop || b.id === g.drop); }

// ── 판·차례 ──
export function create(n: number, seed?: number): TowerGame {
  const g: TowerGame = { n, seed: seed || 1, rs: (seed || 1) >>> 0, round: 0, rounds: RULES.ROUNDS[n] || 4, turn: 0, starter: 0, losses: Array(n).fill(0), placed: Array(n).fill(0), hpts: Array(n).fill(0),
    state: "ready", bodies: [], arb: {}, nextId: 1, tick: 0, piece: null, next: null, drop: null, still: 0, since: 0, touched: false, stack: 0, result: null, log: [] };
  for (let k = 0; k < 7; k++) rand(g); // 씨앗 덥히기
  return g;
}
function pickKind(g: TowerGame): PieceKind { let r = rand(g) * PIECE_W; for (const p of PIECES) { r -= p.w; if (r < 0) return p.kind; } return PIECES[0].kind; }
// 새 판: 탑을 치우고 상·바닥만. 첫 판은 무작위 사람, 다음 판은 방금 와르르 한 사람이 먼저(낮은 탑이 쉽다 — 따라잡기)
export function startRound(g: TowerGame): boolean {
  if (g.state !== "ready" && g.state !== "roundEnd") return false;
  g.round++;
  g.turn = g.round === 1 ? Math.floor(rand(g) * g.n) : g.turn;
  g.starter = g.turn;
  const hw = RULES.BASE_W / 2;
  g.bodies = [makeBody(0, "base", [[-hw, -0.3], [hw, -0.3], [hw, 0], [-hw, 0]], 0, 0, 0, 0, 0.8, -1), makeBody(-1, "floor", [[-14, -0.6], [14, -0.6], [14, 0], [-14, 0]], 0, RULES.FLOOR_Y, 0, 0, 0.9, -1)];
  g.arb = {}; g.stack = 0; g.piece = null; g.drop = null; g.result = null;
  g.next = pickKind(g);
  g.state = "turn";
  return true;
}
const tower = (g: TowerGame) => g.bodies.filter((b) => !b.st && !b.gone && !b.fell);
export function towerTop(g: TowerGame): number { let t = 0; for (const b of tower(g)) t = Math.max(t, world(b).y1); return t; }
// 차례 시작: 물건이 탑 위에서 흔들린다(아직 몸이 아니다 — 놓는 순간 몸이 된다)
export function beginTurn(g: TowerGame): boolean {
  if (g.state !== "turn") return false;
  const P = PIECES.find((p) => p.kind === g.next)!;
  g.next = pickKind(g);
  let yb = 1e9; for (const p of P.v) yb = Math.min(yb, p[1]);
  const period = Math.max(RULES.PERIOD_MIN, RULES.PERIOD0 - RULES.PERIOD_STEP * g.stack);
  g.piece = { kind: P.kind, y: towerTop(g) + RULES.CLEAR - yb, swing: { cx: 0, A: RULES.SWING_A, period: Math.round(period / DT), phase: rand(g) * Math.PI * 2 } };
  g.state = "aim";
  return true;
}
// 흔들림 자리(틱 → x). 화면·봇이 같은 식을 쓴다
export const swingX = (sw: Swing, tick: number) => sw.cx + sw.A * Math.sin(sw.phase + (2 * Math.PI * tick) / sw.period);
export function aimX(g: TowerGame, tick: number): number { return g.piece ? swingX(g.piece.swing, tick) : 0; }
// 놓기: tick = 차례 시작부터 센 틱(정수). AIM_CAP 을 넘으면 거기서 놓인다
export function drop(g: TowerGame, tick: number): boolean {
  if (g.state !== "aim") return false;
  tick = Math.max(0, Math.min(RULES.AIM_CAP, Math.floor(tick)));
  const P = PIECES.find((p) => p.kind === g.piece!.kind)!, x = aimX(g, tick), id = g.nextId++;
  // 몸은 무게 중심 자리에 생긴다 — 매달린 그림(로컬 원점)과 같은 자리가 되게 원점 기준으로 넣는다
  g.bodies.push(makeBody(id, P.kind, P.v, x, g.piece!.y, 0, P.d, P.mu, g.turn));
  g.drop = id; g.dropTick = tick; g.since = 0; g.still = 0; g.touched = false; g.result = null;
  for (const b of g.bodies) if (!b.st) { b.vx = 0; b.vy = 0; b.w = 0; } // 지난 차례 끝에 세워 둔 탑에서 다시 깨운다
  g.state = "fall";
  return true;
}
// 한 틱 진행. 「fall」 동안 판정이 나면 { lost, fell, settled } 를 한 번 낸다. 그 뒤에도 step 은 불러도 된다(보이기용 — 판정은 안 바뀐다)
export function step(g: TowerGame): TurnResult | null {
  physStep(g);
  if (g.state !== "fall") return null;
  g.since++;
  const T = g.bodies.filter((b) => !b.st && !b.gone);
  const fell: number[] = [];
  for (const b of T) if (!b.fell && b.y < RULES.FELL_Y) { b.fell = true; fell.push(b.id); }
  if (fell.length) return finish(g, true, fell);
  let mv = false;
  for (const b of T) if (!b.fell && (Math.hypot(b.vx, b.vy) > RULES.SETTLE_V || Math.abs(b.w) > RULES.SETTLE_W)) { mv = true; break; }
  g.still = mv || !g.touched ? 0 : g.still + 1;
  if ((g.since >= RULES.SETTLE_MIN && g.still >= RULES.SETTLE_TICKS) || g.since >= RULES.SETTLE_CAP) {
    for (const b of T) { b.vx = 0; b.vy = 0; b.w = 0; } // 멈춘 탑은 세워 둔다(다음 차례까지 미끄러지지 않게)
    return finish(g, false, []);
  }
  return null;
}
function finish(g: TowerGame, lost: boolean, fell: number[]): TurnResult {
  const own = g.bodies.find((b) => b.id === g.drop);
  g.result = { lost, fell, by: g.turn, ticks: g.since, others: fell.filter((id) => id !== g.drop).length, capped: !lost && g.since >= RULES.SETTLE_CAP };
  g.log.push({ round: g.round, by: g.turn, kind: own && own.kind, lost, fell: fell.length, others: g.result.others, ticks: g.since, aim: g.dropTick! });
  g.state = "done";
  return g.result;
}
// 판정 뒤 다음으로: 버텼으면 다음 사람, 떨어졌으면 그 사람 와르르 +1 · 판 끝
export function endTurn(g: TowerGame): boolean {
  if (g.state !== "done") return false;
  const r = g.result!;
  g.piece = null; g.drop = null;
  if (r.lost) { g.losses[r.by]++; g.state = g.round >= g.rounds ? "over" : "roundEnd"; return true; } // turn 은 그대로 — 다음 판 첫 사람
  g.placed[r.by]++; g.stack++;
  g.hpts[r.by] = Math.min(999, g.hpts[r.by] + Math.round(towerTop(g) * 10)); // 높이 점수: 버틴 순간 탑 높이(10 cm 단위) — 높이 올릴수록 많이
  g.turn = (g.turn + 1) % g.n; g.state = "turn";
  return true;
}
// 끝 점수(낮을수록 위): 와르르 × 1000 − 높이 점수. 와르르가 같으면 높이 점수가 많은 사람이 위.
// 4명 6판은 와르르만으로 꼴찌 동점이 57 %, 쌓기 수로 갈라도 30 % 였다(시뮬) — 높이 점수로 가른다
export const finalScores = (g: TowerGame) => g.losses.map((l, i) => l * 1000 - g.hpts[i]);
export const unpack = (s: number) => { const l = Math.ceil(s / 1000) || 0; return { losses: l, hpts: l * 1000 - s }; };
// 판정까지 한 번에(시뮬·봇 빨리 감기)
export function settle(g: TowerGame): TurnResult | null { let r: TurnResult | null = null; while (g.state === "fall" && !r) r = step(g); return r; }

// ── 봇에 넘기는 것: 화면에 보이는 것 그대로(숨은 정보는 없다 — 다음 물건도 화면에 보인다) ──
export function view(g: TowerGame): TowerView {
  return JSON.parse(JSON.stringify({
    tick: 0, piece: g.piece && { kind: g.piece.kind, y: g.piece.y, swing: g.piece.swing, v: PIECES.find((p) => p.kind === g.piece!.kind)!.v }, next: g.next,
    base: { x: 0, w: RULES.BASE_W, top: 0 }, stack: g.stack,
    tower: tower(g).map((b) => { const W = world(b); return { kind: b.kind, x: b.x, y: b.y, a: b.a, mass: b.mass, x0: W.x0, x1: W.x1, y1: W.y1 }; }),
  }));
}
// 봇: 놓을 틱을 낸다. r = 화면이 주는 난수(엔진 씨앗과 따로 — 봇이 판을 바꾸지 않게). now = 지금까지 흐른 틱
// easy(연습): 맨 위 물건 가운데쯤 ± 0.3 m 어림, 손 떨림 ±5 틱(83 ms), 12 % 는 아무 때나
// normal(보통): 맨 위 물건 위에서 탑 전체 무게 중심이 상 가운데로 돌아오게 반대쪽으로 조금 — 손 떨림 ±2.5 틱(42 ms). 완벽하지 않다
const BOT: Record<string, { react: number; jit: number; aim: number; wild: number }> = { easy: { react: 34, jit: 5, aim: 0.3, wild: 0.12 }, normal: { react: 28, jit: 2.5, aim: 0.06, wild: 0 } };
function gauss(r: () => number): number { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); }
function botTarget(v: TowerView, level: string, r: () => number): number {
  const L = BOT[level] || BOT.normal, T = v.tower;
  if (!T.length) return (r() - 0.5) * 2 * L.aim;
  let top = T[0]; for (const b of T) if (b.y1 > top.y1) top = b;
  let tx = (top.x0 + top.x1) / 2;
  if (level !== "easy") {
    let m = 0, mx = 0; for (const b of T) { m += b.mass; mx += b.mass * b.x; }
    const com = mx / m;
    tx -= 0.6 * (com - v.base.x);
    const pad = Math.min(0.2, (top.x1 - top.x0) * 0.3);
    tx = Math.max(top.x0 + pad, Math.min(top.x1 - pad, tx));
  }
  return tx + (r() - 0.5) * 2 * L.aim;
}
export function bot(v: TowerView, level: BotLevel | string, r: () => number, now?: number): BotPlan {
  const L = BOT[level] || BOT.normal, sw = v.piece!.swing, t0 = (now || 0) + L.react;
  if (r() < L.wild) return { tick: Math.min(RULES.AIM_CAP, t0 + Math.floor(r() * sw.period)), target: null };
  const target = botTarget(v, level, r);
  let best = t0, bd = 1e9;
  for (let t = t0; t < t0 + sw.period; t++) { const d = Math.abs(swingX(sw, t) - target); if (d < bd) { bd = d; best = t; } }
  return { tick: Math.max(t0 - 8, Math.min(RULES.AIM_CAP, Math.round(best + gauss(r) * L.jit))), target };
}
