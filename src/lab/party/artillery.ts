// 내기 모음 10 「간식 대포」 — 규칙 엔진(순수, 화면 모름). 규격 docs/lab-party-artillery-spec.md. 🔴 표와 코드가 다르면 코드가 맞다.
// 시안 docs/lab-party-artillery.js(md5 235aad9b…, 1판 — 봇 bot·view 포함)를 그대로 옮긴 판이다. 동작은 바꾸지 않고 타입만 붙였다
// (tmp/lab-party-port/equiv.mjs artillery 가 두 엔진을 같은 씨앗·같은 겨눔으로 나란히 돌려 한 발마다 땅·친구 상태를 비트로 맞댄다).
// 턴제 포격(장르 틀만): 케이크 섬 위의 찐빵 친구들이 차례로 간식을 쏜다. 각도·힘을 정하고 바람을 읽는다.
// 간식이 떨어진 자리는 땅이 파이고(heightmap), 둘레의 친구는 기운이 줄고 살짝 밀린다.
// 기운 0 이면 「낮잠」, 우유 바다에 빠지거나 맵 밖으로 밀리면 「퐁당」 — 둘 다 나감. 마지막까지 남은 친구가 1등, 먼저 나간 친구가 꼴찌.
// 상태 g 는 JSON 으로 맞댈 수 있다(난수 상태 g.rs 까지 숫자 하나). 시간은 없다 — 한 발은 fire(g, shot) 한 번에 끝까지 계산하고, 화면은 돌려받은 궤적을 다시 그린다.
/* eslint-disable @typescript-eslint/no-explicit-any */

export type Aim = { angle: number; power: number; weapon: number };
export type Unit = { i: number; x: number; y: number; hp: number; alive: boolean; ammo: number[]; aim: Aim; place: number };
export type OutWhy = "edge" | "water" | "nap";
export type OutRec = { i: number; why: OutWhy; turn: number; place: number };
export type ArtLog = { turn: number; i: number; angle: number; power: number; weapon: number; wind: number; booms: number; outs: number[] };
export type ArtState = "aim" | "next" | "over";
export type ArtGame = {
  n: number; seed: number; rs: number; turn: number; turns: number; round: number; wind: number; water: number; state: ArtState;
  out: OutRec[]; shots: number; h: number[]; units: Unit[]; style: string; mind: number; log: ArtLog[];
  first: number; hp0: number[]; fast?: boolean;
};
export type ArtView = { n: number; turn: number; turns: number; round: number; wind: number; water: number; h: number[]; units: { i: number; x: number; y: number; hp: number; alive: boolean; ammo: number[]; aim: Aim }[] };
export type Track = { t0: number; pts: [number, number][] };
export type Boom = { t: number; x: number; y: number; r: number };
export type ShotRes = {
  tracks: Track[]; booms: Boom[]; splashes: { t: number; x: number; y: number }[]; bounces: { t: number; x: number; y: number }[];
  dmg: number[]; outs: { i: number; why: OutWhy }[]; steps: number; weapon: string; hpLost?: number[]; after?: any;
};
export type BotPlan = { angle: number; power: number; weapon: number; score: number; tried: number };
type Weapon = { id: string; name: string; r: number; dmg: number; knock: number; ammo: number; bounces?: number; split?: number };

export const RULES = {
  W: 720, H: 450, COL: 4,           // 맵 720×450, 땅 기둥 폭 4 → 180 기둥(heightmap: 기둥마다 땅 윗면 y, 아래로 갈수록 큼)
  WATER: 420,                        // 우유 바다 수면 y — 땅 윗면이 이보다 아래면 그 자리는 바다
  R: 12,                             // 친구 반지름(맞음 판정)
  G: 300, VMAX: 480, DT: 1 / 60,     // 중력 px/s² · 힘 100 의 첫 속도 px/s · 한 걸음 초
  WIND: 5, WIND_ACC: 8,              // 바람 -5..5 칸(정수), 한 칸 = 가로 가속 8 px/s²
  HP: { 2: 100, 3: 100, 4: 90 } as Record<number, number>,     // 기운. 4명은 90(판이 늘어져서 — 2절 시뮬)
  LATE: { 2: 10, 3: 0, 4: 0 } as Record<number, number>,       // 2명 판에서 나중에 쏘는 친구 기운 덤(먼저 쏘는 쪽이 60 % 이겼다 — 2절)
  MIND: { 2: 300, 3: 170, 4: 130 } as Record<number, number>,  // 처음 자리 최소 거리 px(맵 폭 720 기준) — 못 지키는 맵은 다시 만든다(줄이지 않는다)
  EDGE: 40,                          // 처음 자리는 맵 끝에서 이만큼 안쪽
  TIME: 30,                          // 차례 시간 제한 초 — 다 되면 지금 겨눈 대로 저절로 쏜다
  SD: 8, RISE: 16,                   // 바퀴 SD 이후 차례마다 바다가 RISE px 차오른다(판이 늘어지지 않게)
  STEPS: 1200,                       // 한 발 최대 걸음(20초) — 넘으면 사라짐
};
// 간식 넷(무기): r 파는 반지름 · dmg 한가운데 기운 감소 · knock 밀림 px · ammo 한 판 개수(-1 = 무한)
export const WEAPONS: Weapon[] = [
  { id: "cookie", name: "쿠키", r: 26, dmg: 34, knock: 14, ammo: -1 },
  { id: "ball", name: "말랑공", r: 22, dmg: 30, knock: 12, ammo: 2, bounces: 2 },   // 땅에서 두 번 튀고 세 번째에 퐁
  { id: "melon", name: "수박", r: 50, dmg: 22, knock: 26, ammo: 2 },                // 넓게 판다(맞히기보다 땅을 무너뜨리기)
  { id: "pop", name: "팝콘", r: 16, dmg: 16, knock: 8, ammo: 2, split: 3 },         // 꼭대기에서 세 알로 갈라진다
];

// 씨앗 난수: 상태가 숫자 하나(g.rs)라 JSON 으로 남는다
function rnd(g: ArtGame): number { g.rs = (g.rs + 0x6d2b79f5) >>> 0; let t = g.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const NC = RULES.W / RULES.COL;
const colOf = (x: number) => Math.max(0, Math.min(NC - 1, Math.floor(x / RULES.COL)));
export const groundAt = (h: number[], x: number) => h[colOf(x)];
const r1 = (v: number) => Math.round(v * 10) / 10;

// 맵: 씨앗으로 셋 중 하나 — 언덕(구불구불) · 섬(바다 골 1–2개) · 골짜기(가운데 호수)
export const STYLES = ["hills", "islands", "valley"];
function genTerrain(g: ArtGame): number[] {
  const { H, COL } = RULES, style = STYLES[Math.floor(rnd(g) * 3)];
  const p = [rnd(g), rnd(g), rnd(g), rnd(g)].map((v) => v * Math.PI * 2), f = 1 + Math.floor(rnd(g) * 2);
  const gaps = style === "islands" ? (rnd(g) < 0.5 ? [0.5 + (rnd(g) - 0.5) * 0.2] : [0.34 + rnd(g) * 0.06, 0.62 + rnd(g) * 0.06]) : [];
  const h: number[] = [];
  for (let c = 0; c < NC; c++) {
    const u = (c * COL + COL / 2) / RULES.W;
    let y = 285 + 48 * Math.sin(2 * Math.PI * u * f + p[0]) + 26 * Math.sin(2 * Math.PI * u * (f + 2) + p[1]) + 10 * Math.sin(2 * Math.PI * u * 7 + p[2]);
    if (style === "valley") y = 200 + 230 * Math.exp(-Math.pow((u - 0.5) / 0.13, 2)) + 22 * Math.sin(2 * Math.PI * u * 3 + p[3]) + 40 * Math.abs(u - 0.5);
    for (const gx of gaps) y += 190 * Math.exp(-Math.pow((u - gx) / 0.045, 2));
    y += 230 * (Math.exp(-Math.pow(u / 0.045, 2)) + Math.exp(-Math.pow((1 - u) / 0.045, 2))); // 양 끝은 우유 바다로 기운다(밀리면 떨어진다 — 70 이면 언덕 맵에서 바다가 안 보였다, 230 이면 양 끝 기둥은 늘 바다)
    h.push(r1(Math.max(110, Math.min(H, y))));
  }
  g.style = style;
  return h;
}

// 처음 자리: 맵의 무작위 자리, 서로 MIND 이상. 못 찾으면 null — create 가 맵을 다시 만든다(40번 넘게 못 찾을 때만 0.9배씩 줄인다, g.mind 에 실제 쓴 값)
function place(g: ArtGame, relaxOk: boolean): number[] | null {
  const { R, EDGE, WATER, W } = RULES;
  let mind = RULES.MIND[g.n] || 130;
  for (let relax = 0; relax < (relaxOk ? 12 : 1); relax++, mind *= 0.9) {
    for (let attempt = 0; attempt < 6; attempt++) {
    const xs: number[] = [];
    for (let tries = 0; tries < 300 && xs.length < g.n; tries++) {
      const x = EDGE + rnd(g) * (W - 2 * EDGE), y = groundAt(g.h, x);
      if (y > WATER - 40) continue; // 바닷가 너무 가까이는 아님
      if (Math.abs(groundAt(g.h, x + 12) - groundAt(g.h, x - 12)) > 26) continue; // 낭떠러지 위는 아님
      if (xs.every((o) => Math.abs(o - x) >= mind)) xs.push(x);
    }
    if (xs.length === g.n) {
      g.mind = Math.round(mind);
      // 서 있는 자리를 판판하게(받침) — 기둥 ±R+4 를 평균으로
      return xs.map((x) => {
        const c0 = colOf(x - R - 4), c1 = colOf(x + R + 4); let s = 0;
        for (let c = c0; c <= c1; c++) s += g.h[c];
        const avg = r1(s / (c1 - c0 + 1)); for (let c = c0; c <= c1; c++) g.h[c] = avg;
        return r1(x);
      });
    }
    }
  }
  return null;
}

export function create(n: number, seed?: number): ArtGame {
  const g = { n, seed: seed || 1, rs: (seed || 1) >>> 0, turn: 0, turns: 0, round: 1, wind: 0, water: RULES.WATER, state: "aim", out: [], shots: 0, h: null, units: [], style: "", mind: 0, log: [] } as any as ArtGame;
  let xs: number[] | null = null;
  for (let k = 0; k < 41 && !xs; k++) { g.h = genTerrain(g); xs = place(g, k === 40); } // 자리 못 찾는 맵은 다시 만든다
  const hp = RULES.HP[n] || 100;
  g.units = xs!.map((x, i) => ({ i, x, y: groundAt(g.h, x), hp, alive: true, ammo: WEAPONS.map((w) => w.ammo), aim: { angle: x < RULES.W / 2 ? 50 : 130, power: 62, weapon: 0 }, place: 0 }));
  g.turn = Math.floor(rnd(g) * n); // 먼저 쏘는 사람은 무작위(자리 공정 — 2절 첫 차례 이점)
  g.first = g.turn;
  for (const u of g.units) if (u.i !== g.first) u.hp += RULES.LATE[n] || 0;
  g.hp0 = g.units.map((u) => u.hp); // 기운 막대의 가득 찬 값
  g.wind = newWind(g);
  return g;
}
function newWind(g: ArtGame): number { return Math.round((rnd(g) * 2 - 1) * RULES.WIND); }

// 땅 파기(순수, 배열만): 원 안의 땅을 없앤다. heightmap 이라 굴은 못 만든다 — 원 아래쪽까지 위가 무너진다(윗면 = 원 바닥)
export function carve(h: number[], x: number, y: number, r: number): number {
  const { COL, H } = RULES; let changed = 0;
  for (let c = colOf(x - r); c <= colOf(x + r); c++) {
    const dx = c * COL + COL / 2 - x; if (Math.abs(dx) > r) continue;
    const bottom = Math.min(H, y + Math.sqrt(r * r - dx * dx));
    if (bottom > h[c]) { h[c] = r1(bottom); changed++; }
  }
  return changed;
}

// 한 발(순수 계산 + 상태에 적용). shot = { angle 0..180(0 오른쪽·90 위), power 0..100, weapon 0..3 }
// 돌려줌: tracks(궤적 — 화면이 다시 그린다) · booms(터진 곳, t = 걸음) · splashes · dmg(사람별) · outs(이번에 나간 사람)
export function shoot(g: ArtGame, shot: Aim): ShotRes {
  const { G, VMAX, DT, R, W, H, WIND_ACC, STEPS } = RULES;
  const me = g.units[g.turn], w = WEAPONS[shot.weapon] || WEAPONS[0];
  const ang = (Math.max(0, Math.min(180, shot.angle)) * Math.PI) / 180, v = (Math.max(0, Math.min(100, shot.power)) / 100) * VMAX;
  const ax = g.wind * WIND_ACC;
  const sx = me.x + Math.cos(ang) * (R + 4), sy = me.y - R - Math.sin(ang) * (R + 4);
  let pieces: any[] = [{ x: sx, y: sy, vx: Math.cos(ang) * v, vy: -Math.sin(ang) * v, bounces: w.bounces || 0, split: !!w.split, r: w.r, dmg: w.dmg, knock: w.knock, track: { t0: 0, pts: [[r1(sx), r1(sy)]] }, done: false }];
  const res: ShotRes = { tracks: [pieces[0].track], booms: [], splashes: [], bounces: [], dmg: Array(g.n).fill(0), outs: [], steps: 0, weapon: w.id };
  const hp0 = g.units.map((u) => u.hp);
  const boom = (P: any, t: number) => {
    res.booms.push({ t, x: r1(P.x), y: r1(P.y), r: P.r });
    carve(g.h, P.x, P.y, P.r);
    for (const u of g.units) {
      if (!u.alive) continue;
      const d = Math.hypot(u.x - P.x, u.y - R - P.y), reach = P.r + R;
      if (d >= reach) continue;
      const f = 1 - d / reach, dm = Math.round(P.dmg * (0.4 + 0.6 * f));
      u.hp = Math.max(0, u.hp - dm); res.dmg[u.i] += dm;
      u.x = r1(u.x + (u.x >= P.x ? 1 : -1) * P.knock * f * 2); // 터진 쪽 반대로 밀림
    }
    P.done = true;
  };
  for (let t = 1; t <= STEPS && pieces.some((P) => !P.done); t++) {
    const born: any[] = [];
    for (const P of pieces) {
      if (P.done) continue;
      const vy0 = P.vy;
      P.vx += ax * DT; P.vy += G * DT; P.x += P.vx * DT; P.y += P.vy * DT;
      if (!g.fast) P.track.pts.push([r1(P.x), r1(P.y)]); // 미리 쏴 보기(봇)는 궤적을 안 남긴다 — 빠르게
      // 팝콘: 꼭대기(오르다 내려가기 시작)에서 세 알로
      if (P.split && vy0 < 0 && P.vy >= 0) {
        P.done = true;
        for (const dvx of [-55, 0, 55]) { const Q = { x: P.x, y: P.y, vx: P.vx + dvx, vy: P.vy, bounces: 0, split: false, r: P.r, dmg: P.dmg, knock: P.knock, track: { t0: t, pts: [[r1(P.x), r1(P.y)]] as [number, number][] }, done: false }; born.push(Q); res.tracks.push(Q.track); }
        continue;
      }
      if (P.x < -40 || P.x > W + 40 || P.y > H + 20) { P.done = true; continue; } // 맵 밖
      // 친구에 직접 맞음(쏜 친구는 처음 12 걸음 동안 빼고)
      let hitU = false;
      for (let k = 0; k < g.units.length; k++) { const u = g.units[k]; if (!u.alive || (u === me && t <= 12)) continue; const dx = u.x - P.x, dy = u.y - R - P.y; if (dx * dx + dy * dy < (R + 2) * (R + 2)) { hitU = true; break; } }
      if (hitU) { boom(P, t); continue; }
      if (P.x < 0 || P.x >= W) continue; // 맵 끝 바깥 하늘: 땅·바다 없음
      const gy = groundAt(g.h, P.x);
      if (P.y >= g.water && gy >= g.water) { res.splashes.push({ t, x: r1(P.x), y: g.water }); P.done = true; continue; } // 우유 바다에 퐁당(안 터짐)
      if (P.y >= gy) {
        if (P.bounces > 0) {
          // 튀기: 땅 기울기로 법선을 잡아 반사, 0.62배로 줄어든다
          const dh = groundAt(g.h, P.x + 6) - groundAt(g.h, P.x - 6), L = Math.hypot(dh, 12), nx = dh / L, ny = -12 / L;
          const dot = P.vx * nx + P.vy * ny;
          if (dot < 0) { P.vx = (P.vx - 2 * dot * nx) * 0.62; P.vy = (P.vy - 2 * dot * ny) * 0.62; }
          P.y = gy - 1; P.bounces--; res.bounces.push({ t, x: r1(P.x), y: r1(P.y) });
          if (Math.hypot(P.vx, P.vy) < 40) boom(P, t);
          continue;
        }
        P.y = gy; boom(P, t);
      }
    }
    pieces = pieces.concat(born);
    res.steps = t;
  }
  // 내려앉기: 발밑이 파이면 떨어지고, 바다·맵 밖이면 퐁당
  settle(g, res);
  res.hpLost = g.units.map((u, i) => hp0[i] - u.hp);
  return res;
}
function settle(g: ArtGame, res: { outs: { i: number; why: OutWhy }[] } | null) {
  const batch: { u: Unit; why: OutWhy }[] = [];
  for (const u of g.units) {
    if (!u.alive) continue;
    let why: OutWhy | null = null;
    if (u.x < 0 || u.x >= RULES.W) why = "edge";
    else { u.y = groundAt(g.h, u.x); if (u.y >= g.water - 2) why = "water"; }
    if (!why && u.hp <= 0) why = "nap";
    if (why) batch.push({ u, why });
  }
  if (!batch.length) return;
  // 점수 = 나간 순서(먼저 나갈수록 낮다). 한꺼번에 나가면 남은 기운이 적은 쪽이 먼저 나간 것으로 — 기운도 같으면 같은 등수
  batch.sort((a, b) => a.u.hp - b.u.hp);
  let placeV = g.out.length + 1, prev: number | null = null;
  batch.forEach(({ u, why }) => {
    if (prev !== null && u.hp !== prev) placeV = g.out.length + 1;
    prev = u.hp;
    u.alive = false; u.hp = 0; u.place = placeV; g.out.push({ i: u.i, why, turn: g.turns, place: placeV }); if (res) res.outs.push({ i: u.i, why });
  });
}
export const alive = (g: ArtGame) => g.units.filter((u) => u.alive);

// 쏜다: 탄 수를 줄이고 shoot. 판이 끝나면 state = "over"(남은 친구 점수 = n)
export function fire(g: ArtGame, shot: Aim): ShotRes | null {
  if (g.state !== "aim") return null;
  const u = g.units[g.turn], wi = shot.weapon | 0;
  const weapon = u.ammo[wi] === 0 ? 0 : wi; // 다 쓴 간식이면 쿠키로
  if (u.ammo[weapon] > 0) u.ammo[weapon]--;
  u.aim = { angle: Math.round(shot.angle), power: Math.round(shot.power), weapon };
  const res = shoot(g, { angle: u.aim.angle, power: u.aim.power, weapon });
  g.shots++;
  g.log.push({ turn: g.turns, i: u.i, angle: u.aim.angle, power: u.aim.power, weapon, wind: g.wind, booms: res.booms.length, outs: res.outs.map((o) => o.i) });
  checkOver(g);
  if ((g.state as ArtState) !== "over") g.state = "next";
  return res;
}
function checkOver(g: ArtGame) {
  const a = alive(g);
  if (a.length <= 1) { for (const u of a) u.place = g.n; g.state = "over"; }
}
// 다음 차례: 살아 있는 다음 친구, 새 바람. 바퀴 SD 이후엔 바다가 차오른다(잠긴 친구는 나감)
export function next(g: ArtGame): { rose: number; outs: { i: number; why: OutWhy }[] } | null {
  if (g.state !== "next") return null;
  g.turns++;
  let k = g.turn;
  for (let s = 0; s < g.n; s++) { k = (k + 1) % g.n; if (g.units[k].alive) break; }
  const rel = (i: number) => (i - g.first + g.n) % g.n; // 먼저 쏜 사람 기준 자리 — 한 바퀴 돌아 넘어가면 다음 바퀴
  if (rel(k) <= rel(g.turn)) g.round++;
  g.turn = k;
  g.wind = newWind(g);
  const ev = { rose: 0, outs: [] as { i: number; why: OutWhy }[] };
  if (g.round > RULES.SD) { g.water = Math.max(0, g.water - RULES.RISE); ev.rose = RULES.RISE; settle(g, ev); checkOver(g); }
  if ((g.state as ArtState) !== "over") { g.state = "aim"; if (!g.units[g.turn].alive) { g.state = "next"; return next(g); } }
  return ev;
}
// 점수(틀의 S.end 에): 남은 친구 n, 나간 친구는 나간 순서(먼저 나갈수록 1 에 가깝다)
export const scores = (g: ArtGame) => g.units.map((u) => (u.alive ? g.n : u.place));

// 봇이 보는 것: 화면에 보이는 그대로(땅·바다·바람·자리·기운·남은 간식). 다음 바람을 정하는 난수 상태 rs 와 씨앗은 안 넘긴다
export function view(g: ArtGame): ArtView {
  return JSON.parse(JSON.stringify({ n: g.n, turn: g.turn, turns: g.turns, round: g.round, wind: g.wind, water: g.water, h: g.h, units: g.units.map((u) => ({ i: u.i, x: u.x, y: u.y, hp: u.hp, alive: u.alive, ammo: u.ammo, aim: u.aim })) }));
}
// 미리 쏴 보기: view(또는 g)를 복사해 shoot — 원래 상태는 그대로
export function simulate(v: ArtView | ArtGame, shot: Aim): ShotRes {
  const c = { fast: true, n: v.n, turn: v.turn, wind: v.wind, water: v.water, h: v.h.slice(), units: v.units.map((u) => Object.assign({}, u)), out: [], turns: v.turns } as any as ArtGame;
  const res = shoot(c, shot);
  res.after = c;
  return res;
}
// 궤적 힌트: 친구 둘레 hint px 안의 앞부분만(바람 포함). 화면이 점선으로 그린다
export function hint(v: ArtView | ArtGame, shot: Aim, len?: number): [number, number][] {
  const { G, VMAX, DT, R, WIND_ACC } = RULES, u = v.units[v.turn];
  const ang = (shot.angle * Math.PI) / 180, sp = (shot.power / 100) * VMAX;
  let x = u.x + Math.cos(ang) * (R + 4), y = u.y - R - Math.sin(ang) * (R + 4), vx = Math.cos(ang) * sp, vy = -Math.sin(ang) * sp; const pts: [number, number][] = [[x, y]];
  for (let t = 0; t < 240; t++) { vx += v.wind * WIND_ACC * DT; vy += G * DT; x += vx * DT; y += vy * DT; if (Math.hypot(x - u.x, y - u.y + R) > (len || 80)) break; pts.push([r1(x), r1(y)]); }
  return pts;
}

// 봇(혼자 연습): 보이는 것(view)으로 미리 쏴 보고 가장 좋은 각도·힘·간식을 고른 뒤 흔든다. r 은 화면 난수(엔진 씨앗과 따로)
// 좋음 = 남이 잃은 기운(+나가면 60) − 1.6×내가 잃은 기운(내가 나가면 −400). 아무도 안 맞으면 가장 가까운 남과의 거리로 줄을 세운다
// easy(연습): 각도 σ 8°·힘 σ 9, 35 % 는 쿠키만 · normal(보통): σ 1.5°·2.2
const BOTL: Record<string, { sa: number; sp: number; cookieOnly: number }> = { easy: { sa: 8, sp: 9, cookieOnly: 0.35 }, normal: { sa: 1.5, sp: 2.2, cookieOnly: 0 } };
function judge(v: ArtView, res: ShotRes): number {
  const me = v.turn; let s = 0;
  const after = res.after.units;
  for (const u of v.units) {
    if (!u.alive) continue;
    const lost = u.hp - after[u.i].hp, out = !after[u.i].alive;
    if (u.i === me) s -= lost * 1.6 + (out ? 400 : 0);
    else s += lost + (out ? 60 : 0);
  }
  if (s === 0) {
    const pts: { x: number; y: number }[] = (res.booms as { x: number; y: number }[]).concat(res.splashes); let best = 1e9;
    for (const p of pts) for (const u of v.units) if (u.alive && u.i !== me) best = Math.min(best, Math.hypot(p.x - u.x, p.y - u.y));
    s = -Math.min(best, 900) / 10 - (pts.length ? 0 : 90);
  }
  return s;
}
export function bot(v: ArtView, level: string, r: () => number): BotPlan {
  const L = BOTL[level] || BOTL.normal, me = v.units[v.turn];
  const ws = [1, 2, 3].filter((k) => me.ammo[k] !== 0 && r() >= L.cookieOnly);
  let best: { s: number; angle: number; power: number; weapon: number } | null = null; const seen = new Map<number, any>();
  const tryShot = (angle: number, power: number, weapon: number) => {
    angle = Math.round(angle); power = Math.round(power);
    if (angle < 2 || angle > 178 || power < 15 || power > 100) return null;
    const key = angle * 1000 + power * 10 + weapon; if (seen.has(key)) return seen.get(key);
    const res = simulate(v, { angle, power, weapon });
    const c = { s: judge(v, res) - (weapon ? 3 : 0), angle, power, weapon }; // 아끼는 간식은 같으면 안 쓴다
    seen.set(key, c);
    if (!best || c.s > best.s) best = c;
    return c;
  };
  // 1) 쿠키로 성긴 그물(각도 10°·힘 10) 2) 좋은 셋 둘레를 촘촘히 3) 다른 간식은 그 둘레만 — 한 차례 미리 쏴 보기 약 400발
  const coarse: any[] = [];
  for (let a = 10; a <= 170; a += 10) for (let p = 30; p <= 100; p += 10) { const c = tryShot(a, p, 0); if (c) coarse.push(c); }
  const top = coarse.sort((x, y) => y.s - x.s).slice(0, 3);
  const fine: any[] = [];
  for (const c of top) for (let a = c.angle - 5; a <= c.angle + 5; a += 2.5) for (let p = c.power - 6; p <= c.power + 6; p += 2) { const d = tryShot(a, p, 0); if (d) fine.push(d); }
  const top2 = fine.sort((x, y) => y.s - x.s).slice(0, 3);
  for (const wpn of ws) for (const c of top2) for (let a = c.angle - 4; a <= c.angle + 4; a += 4) for (let p = c.power - 6; p <= c.power + 6; p += 3) tryShot(a, p, wpn);
  const gauss = () => { const u1 = Math.max(1e-9, r()), u2 = r(); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); };
  const b = best as unknown as { s: number; angle: number; power: number; weapon: number };
  const angle = Math.round(Math.max(0, Math.min(180, b.angle + gauss() * L.sa)));
  const power = Math.round(Math.max(10, Math.min(100, b.power + gauss() * L.sp)));
  return { angle, power, weapon: b.weapon, score: b.s, tried: seen.size };
}
