// 내기 모음 9 「코코 산책 보드」 — 화면(공원 둘레길 말판). 규칙은 ./walk.ts(엔진, 화면 모름), 바깥 틀은 ./shell.ts.
// 시안 docs/lab-party-walk-mock.html(md5 51942bab…, 1판 — 봇 자리·아이패드)의 <script> 를 그대로 옮겼다(타입만 붙임). 겉모양은 ./walk.css.
// 규격 docs/lab-party-walk-spec.md. 주소 끝: #reduce · #nocap · #nocoach · #seed=N(주사위 고정 — 리그) · #botfast(봇 0.12초 — 리그) · #rigfast(기다림 0 — 리그)
// 리그가 보는 자리: window.__walk(엔진 상태) · window.__walkDrawn(그려진 걸음) · window.__walkSteps(걸음 그림 수) · window.__party(틀).
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as E from "./walk.ts";
import { mount, markSVG, COLORS, type Mark, type PartyShell } from "./shell.ts";

export function initWalk() {
const hash = location.hash;
const SEED = +((hash.match(/seed=(\d+)/) || [])[1] ?? 0) || ((Math.random() * 1e9) | 0);
let games = 0;
const INK = "#3a2228", CREAM = "#fffaf2", LINE = "#ecd3a6", FUR = "#b8643a", FUR2 = "#8e4526", PINK = "#f07a8a";
const C = 33; // 칸 크기(viewBox)
// 칸 번호 → 판 위 자리. 0 = 집(왼쪽 아래), 아래 줄 오른쪽으로 → 오른쪽 줄 위로 → 위 줄 왼쪽으로 → 왼쪽 줄 아래로
function cell(k: number): [number, number] {
  const [c, r] = k <= 9 ? [k, 11] : k <= 20 ? [9, 11 - (k - 9)] : k <= 29 ? [9 - (k - 20), 0] : [0, k - 29];
  return [c * C + C / 2, r * C + C / 2];
}
// ── 칸 그림 9종(가운데 0,0 · 반지름 약 11) ──
const ICON: Record<string, string> = {
  home: `<path d="M-11 0L0-10L11 0" fill="none" stroke="${FUR2}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><rect x="-8" y="-1" width="16" height="11" rx="2" fill="#fff" stroke="${FUR2}" stroke-width="2"/><rect x="-2.5" y="3" width="5" height="7" fill="${PINK}"/>`,
  bell: `<path d="M-8 6C-8-2-6-8 0-9C6-8 8-2 8 6z" fill="#ffd36b" stroke="#b07a1c" stroke-width="2"/><rect x="-10" y="5" width="20" height="3.6" rx="1.8" fill="#e0a640" stroke="#b07a1c" stroke-width="1.4"/><circle cy="10.5" r="2.4" fill="${PINK}"/>`,
  meat: `<path d="M-9 4C-12-3-6-10 1-9C8-8 10-1 6 4C3 8-5 9-9 4z" fill="#c43a48" stroke="${FUR2}" stroke-width="1.8"/><path d="M-4-2q5-3 8 1" stroke="#ffb38a" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M5 4l5 5" stroke="${CREAM}" stroke-width="3.4" stroke-linecap="round"/><circle cx="10.5" cy="9.5" r="2.4" fill="${CREAM}" stroke="${FUR2}" stroke-width="1.2"/>`,
  bath: `<path d="M-11 0h22v3a7 7 0 0 1-7 7h-8a7 7 0 0 1-7-7z" fill="#8fd3ff" stroke="#2a6f9a" stroke-width="1.8"/><circle cx="-5" cy="-4" r="3" fill="#fff" stroke="#8fd3ff" stroke-width="1.4"/><circle cx="1" cy="-7" r="3.6" fill="#fff" stroke="#8fd3ff" stroke-width="1.4"/><circle cx="6.5" cy="-3.5" r="2.6" fill="#fff" stroke="#8fd3ff" stroke-width="1.4"/>`,
  treat: `<circle r="9.5" fill="#e0a640" stroke="${FUR2}" stroke-width="1.8"/><circle cx="-3" cy="-3" r="1.8" fill="${FUR2}"/><circle cx="3.5" cy="1.5" r="1.8" fill="${FUR2}"/><circle cx="-1.5" cy="5" r="1.5" fill="${FUR2}"/><circle cx="4" cy="-5" r="1.3" fill="${FUR2}"/>`,
  friend: `<ellipse cx="-8" cy="-1" rx="3.6" ry="6.5" fill="#6b5a52"/><ellipse cx="8" cy="-1" rx="3.6" ry="6.5" fill="#6b5a52"/><circle r="8.5" fill="#f4efe8" stroke="#6b5a52" stroke-width="1.6"/><circle cx="-3" cy="-1.5" r="1.6" fill="${INK}"/><circle cx="3" cy="-1.5" r="1.6" fill="${INK}"/><ellipse cy="3" rx="2" ry="1.5" fill="${INK}"/>`,
  ball: `<circle r="9" fill="#c9e34a" stroke="#6b8a12" stroke-width="1.8"/><path d="M-8-4q8 4 0 12M8-8q-7 6 0 14" stroke="#fff" stroke-width="1.8" fill="none"/>`,
  rain: `<path d="M-9 1a5 5 0 0 1 2-9a6 6 0 0 1 11-1a4.5 4.5 0 0 1 4 9z" fill="#fff" stroke="#5a7a9a" stroke-width="1.8" stroke-linejoin="round"/><path d="M-5 5l-2 5M1 5l-2 5M7 5l-2 5" stroke="#3a8fd6" stroke-width="2.2" stroke-linecap="round"/>`,
  photo: `<rect x="-10" y="-6" width="20" height="14" rx="3" fill="#5a3a42"/><rect x="-5" y="-9" width="7" height="4" rx="1" fill="#5a3a42"/><circle cy="1" r="4.5" fill="#bfe6ff" stroke="#fff" stroke-width="1.6"/><circle cx="6.5" cy="-3" r="1.3" fill="#ffd36b"/>`,
  "": `<g opacity=".28" fill="${FUR2}"><ellipse cy="3" rx="4" ry="3.3"/><circle cx="-4.6" cy="-2.6" r="1.7"/><circle cx="-1.6" cy="-5" r="1.7"/><circle cx="1.6" cy="-5" r="1.7"/><circle cx="4.6" cy="-2.6" r="1.7"/></g>`,
};
const TINT: Record<string, string> = { home: "#ffd36b", bell: "#ffe1e4", bath: "#ffe1e4", meat: "#e3f5d8", ball: "#e3f5d8", treat: "#e3f5d8", photo: "#e3f5d8", friend: "#ece4fb", rain: "#ece4fb", "": CREAM };
const icon = (k: string, s?: number) => `<svg viewBox="-13 -13 26 26" aria-hidden="true"><g transform="scale(${s || 1})">${ICON[k]}</g></svg>`;
// 말 모양(틀 표지와 같은 넷) — 흰 테로 칸 그림 위에서도 보인다
const MARK: Record<Mark, string> = {
  circle: `<circle r="7" fill="F" stroke="#fff" stroke-width="2"/>`,
  tri: `<path d="M0-8 8 6H-8z" fill="F" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>`,
  square: `<rect x="-6.5" y="-6.5" width="13" height="13" rx="2.5" fill="F" stroke="#fff" stroke-width="2"/>`,
  star: `<path d="M0-8.5l2.4 5 5.5.7-4 3.8 1 5.5L0 13.9-4.9 6.5l1-5.5-4-3.8 5.5-.7z" transform="scale(.9) translate(0 -1.6)" fill="F" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>`,
};
const pawnSVG = (p: { mark: Mark; c: string }, s?: number) => `<g transform="scale(${s || 1})"><ellipse cy="7.5" rx="6" ry="2" fill="rgba(58,34,40,.25)"/>${MARK[p.mark].replace("F", p.c)}</g>`;
const OFF = [[-7, -7], [7, -7], [-7, 7], [7, 7]]; // 한 칸에 넷까지 — 사람마다 자기 귀퉁이(겹쳐도 다 보인다)
function pips(n: number, s: number) { const P = ({ 1: [[0, 0]], 2: [[-4, -4], [4, 4]], 3: [[-5, -5], [0, 0], [5, 5]], 4: [[-4, -4], [4, -4], [-4, 4], [4, 4]], 5: [[-5, -5], [5, -5], [0, 0], [-5, 5], [5, 5]], 6: [[-4, -6], [4, -6], [-4, 0], [4, 0], [-4, 6], [4, 6]] } as Record<number, number[][]>)[n]; return P.map(([x, y]) => `<circle cx="${x * s}" cy="${y * s}" r="${1.7 * s}" fill="${INK}"/>`).join(""); }
const dieSVG = (n: number, c?: string, cls?: string) => `<g class="d ${cls || ""}"><rect x="-22" y="-22" width="44" height="44" rx="10" fill="#fff" stroke="${c || INK}" stroke-width="3.5"/>${n ? pips(n, 1.8) : `<text y="7" text-anchor="middle" font-size="20" font-weight="900" fill="${LINE}">?</text>`}</g>`;
const coco = (happy: boolean) => `<g><ellipse cx="-22" cy="4" rx="9" ry="16" fill="${FUR2}"/><ellipse cx="22" cy="4" rx="9" ry="16" fill="${FUR2}"/><circle r="24" fill="${FUR}"/><circle cy="-20" r="12" fill="${FUR}"/><ellipse cy="8" rx="12" ry="9" fill="#d98a5a"/><ellipse cy="4" rx="4.5" ry="3.4" fill="${INK}"/>${happy ? `<path d="M-13-2q4-5 8 0M5-2q4-5 8 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M-5 9q5 6 10 0" stroke="${INK}" stroke-width="2.2" fill="${PINK}"/>` : `<circle cx="-9" cy="-2" r="4" fill="${INK}"/><circle cx="9" cy="-2" r="4" fill="${INK}"/><path d="M-4 10q4 3 8 0" stroke="${INK}" stroke-width="2" fill="none"/>`}</g>`;

// ── 규칙 카드 5장(그림만으로) ──
const card = (inner: string, bg?: string) => `<svg viewBox="0 0 160 120"><rect width="160" height="120" rx="14" fill="${bg || "#dff1ff"}"/>${inner}</svg>`;
const at = (x: number, y: number, s: number, inner: string) => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;
const sq = (x: number, y: number, k: string, s?: number) => at(x, y, s || 1, `<rect x="-14" y="-14" width="28" height="28" rx="6" fill="${TINT[k]}" stroke="${LINE}" stroke-width="2"/>${ICON[k]}`);
const arrow = (x1: number, y1: number, x2: number, y2: number, c?: string) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c || INK}" stroke-width="3" stroke-linecap="round"/><path d="M${x2} ${y2}l-7-3m7 3-3 7" stroke="${c || INK}" stroke-width="3" stroke-linecap="round" fill="none" transform="rotate(${(Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI - 45} ${x2} ${y2})"/>`;
const P4 = COLORS.map((c) => ({ c: c.c, mark: c.mark }));
const star = (x: number, y: number, s: number, c?: string) => at(x, y, s, `<path d="M0-9l2.6 5.4 6 .8-4.3 4.1 1 5.9L0 14.4-5.3 7.2l1-5.9L-8.6-2.8l6-.8z" fill="${c || "#ffd36b"}" stroke="#b07a1c" stroke-width="1.6"/>`);
const cup = (x: number, y: number) => `<path d="M${x - 8} ${y - 10}h16l-2 18h-12z" fill="#ffb38a" stroke="${INK}" stroke-width="2"/><path d="M${x + 4} ${y - 10}l4-6" stroke="#2fb5a8" stroke-width="3" stroke-linecap="round"/>`;
const rules = [
  // ① 주사위 → 둘레길을 걷는다 → 집에 먼저 오면 1등
  { cap: "주사위만큼 걸어 공원을 돌고 집에 먼저 오면 1등", svg: card(`<rect x="14" y="16" width="132" height="88" rx="12" fill="none" stroke="${LINE}" stroke-width="14"/>${[0, 1, 2, 3, 4].map((k) => `<rect x="${20 + k * 24}" y="91" width="20" height="20" rx="4" fill="${CREAM}" stroke="${LINE}" stroke-width="1.5"/>`).join("")}${at(30, 101, 0.8, ICON.home)}${at(92, 96, 1, pawnSVG(P4[0]))}${arrow(40, 82, 86, 82)}${at(62, 52, 0.7, dieSVG(3))}${at(118, 52, 0.75, coco(true))}`) },
  // ② 좋은 칸: 고기 → 한 번 더 · 공 → 앞으로 · 간식 → 별
  { cap: "고기 = 한 번 더 · 공 = 앞으로 3칸 · 간식 = 별 하나", svg: card(`${sq(28, 30, "meat")}${arrow(46, 30, 66, 30)}${at(84, 30, 0.45, dieSVG(5))}${at(112, 30, 0.45, dieSVG(2))}${sq(28, 64, "ball")}${arrow(46, 64, 74, 64, "#2f7a3a")}${arrow(74, 64, 100, 64, "#2f7a3a")}<text x="118" y="70" font-size="18" font-weight="900" fill="#2f7a3a">+3</text>${sq(28, 98, "treat")}${arrow(46, 98, 66, 98)}${star(84, 98, 1)}<text x="98" y="104" font-size="18" font-weight="900" fill="#b07a1c">+1</text>`, "#fff4e3") },
  // ③ 나쁜 칸: 초인종 → 뒤로 · 목욕 → 한 번 쉼 · 소나기 → 맨 앞이 뒤로
  { cap: "초인종 = 뒤로 3칸 · 목욕 = 한 번 쉼 · 소나기 = 맨 앞이 뒤로", svg: card(`${sq(28, 30, "bell")}${arrow(100, 30, 52, 30, PINK)}<text x="108" y="37" font-size="18" font-weight="900" fill="${PINK}">−3</text>${sq(28, 64, "bath")}${arrow(46, 64, 62, 64)}<rect x="70" y="54" width="7" height="20" rx="2" fill="${INK}"/><rect x="82" y="54" width="7" height="20" rx="2" fill="${INK}"/><text x="98" y="70" font-size="16" font-weight="900" fill="${INK}">×1</text>${sq(28, 98, "rain")}${at(130, 98, 1.1, pawnSVG(P4[1]))}${at(70, 98, 1.1, pawnSVG(P4[2]))}${arrow(118, 86, 96, 86, PINK)}`) },
  // ④ 친구 강아지 → 누군가와 자리 바꿈 · 단체 사진 → 모두 별
  { cap: "친구 강아지 = 누군가와 자리 바꿈 · 사진 = 모두 별 하나", svg: card(`${sq(26, 38, "friend")}${at(70, 38, 1.3, pawnSVG(P4[0]))}${at(130, 38, 1.3, pawnSVG(P4[3]))}<path d="M76 24q24-14 48 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M124 24l-8-1m8 1-3-7" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M124 52q-24 14-48 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M76 52l8 1m-8-1 3 7" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>${sq(26, 94, "photo")}${[0, 1, 2, 3].map((k) => `${at(64 + k * 24, 100, 1, pawnSVG(P4[k]))}${star(64 + k * 24, 82, 0.7)}`).join("")}`, "#fff4e3") },
  // ⑤ 별 하나로 한 칸 덜·더 — 설 칸을 고른다 · 집에서 가장 먼 사람이 꼴찌
  { cap: "별 하나 내면 한 칸 덜·더 · 집에서 가장 멀면 꼴찌", svg: card(`${at(30, 34, 0.6, dieSVG(4))}${sq(64, 34, "bell", 0.85)}${sq(96, 34, "", 0.85)}${sq(128, 34, "meat", 0.85)}<text x="96" y="64" text-anchor="middle" font-size="12" font-weight="900" fill="${INK}">4</text>${star(64, 62, 0.6)}<text x="60" y="66" text-anchor="end" font-size="12" font-weight="900" fill="${INK}">3</text>${star(128, 62, 0.6)}<text x="140" y="66" font-size="12" font-weight="900" fill="${INK}">5</text><path d="M118 20h20v28h-20z" fill="none" stroke="#2fb5a8" stroke-width="3" stroke-dasharray="4 3"/>${at(26, 96, 0.9, ICON.home)}${at(48, 96, 1.1, pawnSVG(P4[1]))}<path d="M40 82l4-8 4 6 4-6 4 8z" fill="#ffd36b" stroke="#b07a1c" stroke-width="1.5"/>${at(132, 96, 1.1, pawnSVG(P4[2]))}${cup(112, 98)}<path d="M64 98h40" stroke="${LINE}" stroke-width="4" stroke-dasharray="3 5" stroke-linecap="round"/>`) },
];

mount({
  id: "walk", title: "코코 산책 보드", min: 2, max: 4, hidden: false, rules,
  coach: { roll: "눌러서 주사위를 굴려요", choose: "별 하나 내면 한 칸 덜·더 — 설 칸을 골라요" },
  async start(S: PartyShell) {
    const n = S.players.length, g = E.create(n, SEED + (games++) * 7919); // 한 판 더는 다른 주사위
    (window as any).__walk = g; // 리그
    const root = document.getElementById("pt-game")!, $ = (id: string): any => document.getElementById(id);
    const REDUCE = () => document.body.classList.contains("reduce");
    const RIGFAST = /rigfast/.test(hash); // 리그용: 판이 길어(2명 세 바퀴) 기다림을 거의 0 으로 — 그림·순서는 그대로
    const wait = (ms: number) => new Promise((r) => setTimeout(r, RIGFAST ? Math.min(ms, 15) : REDUCE() ? Math.min(ms, 200) : S.fast ? Math.min(ms, 260) : ms));
    root.innerHTML = `<div class="wk">
      <div class="wk-stage"><svg id="wk-svg" viewBox="0 0 330 396" role="img" aria-label="공원 둘레길 말판 40칸"><g id="wk-board"></g><g id="wk-hls"></g><g id="wk-pawns"></g></svg>
        <div class="wk-mid">
          <div class="wk-rows" id="wk-rows"></div>
          <div class="wk-mid-c"><svg class="wk-die" id="wk-die" viewBox="-28 -28 56 56" aria-hidden="true"></svg><div class="wk-toast" id="wk-toast" aria-live="assertive"></div></div>
          <div class="wk-acts" id="wk-acts"><button class="pt-btn" id="wk-roll">주사위 굴리기</button><button class="wk-opt" id="wk-o0" data-k="0"></button><button class="wk-opt" id="wk-o1" data-k="1"></button><button class="wk-opt" id="wk-o2" data-k="2"></button></div>
        </div>
      </div>
      <div class="wk-note" id="wk-note"></div>
    </div>`;
    // 판(한 번만 그린다): 둘레길 칸 40(0 = 집)
    let b = `<rect x="2" y="2" width="326" height="392" rx="16" fill="#cdeec0"/><rect x="${C + 4}" y="${C + 4}" width="${330 - 2 * C - 8}" height="${396 - 2 * C - 8}" rx="12" fill="#f3fbef"/>`;
    for (let k = 0; k < E.RULES.SQUARES; k++) {
      const [x, y] = cell(k), kind = E.BOARD[k];
      // 빈 칸 발자국은 걷는 쪽을 가리킨다(아래 줄 → 오른쪽 · 오른쪽 줄 ↑ · 위 줄 ← · 왼쪽 줄 ↓) — 방향 화살 대신
      const dir = k <= 9 ? 90 : k <= 20 ? 0 : k <= 29 ? -90 : 180;
      b += `<g transform="translate(${x} ${y})" data-sq="${k}" class="wk-sq"><rect x="-15" y="-15" width="30" height="30" rx="6" fill="${TINT[kind]}" stroke="${kind === "home" ? "#b07a1c" : LINE}" stroke-width="${kind === "home" ? 2.5 : 1.5}"/>${kind ? ICON[kind] : `<g transform="rotate(${dir})">${ICON[""]}</g>`}</g>`;
    }
    $("wk-board").innerHTML = b;
    $("wk-pawns").innerHTML = S.players.map((p) => `<g class="wk-pawn" id="wk-p${p.i}"><g class="h">${pawnSVG(p, 0.98)}</g></g>`).join("");
    const drawn: number[] = Array(n).fill(0); // 말이 지금 그려진 걸음 수(리그가 엔진과 맞댄다)
    const steps: { walks: number; places: number; jumps?: number } = { walks: 0, places: 0 }; (window as any).__walkDrawn = drawn; (window as any).__walkSteps = steps;
    function place(i: number, prog: number) {
      drawn[i] = prog;
      const k = prog >= g.D ? 0 : prog % E.RULES.SQUARES, [x, y] = cell(k), [ox, oy] = OFF[i];
      const el = $("wk-p" + i); el.style.transform = `translate(${x + ox}px, ${y + oy}px)`; el.dataset.sq = k; el.dataset.prog = prog;
    }
    function hop(i: number) { const h = $("wk-p" + i).firstElementChild; h.classList.remove("hop"); void h.getBoundingClientRect(); h.classList.add("hop"); }
    S.players.forEach((p) => place(p.i, 0));
    // 걸음마다 한 칸씩(줄인 동작이면 바로 끝 칸으로)
    async function walk(i: number, from: number, to: number) {
      if (REDUCE() || from === to) { place(i, to); if (from !== to) steps.jumps = (steps.jumps || 0) + 1; return; }
      const dir = to > from ? 1 : -1, ms = S.fast ? 90 : 190;
      steps.walks++;
      for (let s = from + dir; dir > 0 ? s <= to : s >= to; s += dir) { place(i, s); steps.places++; hop(i); S.sfx("tap"); await new Promise((r) => setTimeout(r, ms)); }
    }
    async function glide(pairs: [number, number, number][]) { // 친구 강아지 자리 바꿈: 둘이 함께 미끄러진다
      pairs.forEach(([i]) => $("wk-p" + i).classList.add("glide"));
      pairs.forEach(([i, , to]) => place(i, to));
      await wait(560);
      pairs.forEach(([i]) => $("wk-p" + i).classList.remove("glide"));
    }
    function rows() {
      $("wk-rows").innerHTML = S.players.map((p) => {
        const pr = Math.min(g.prog[p.i], g.D) / g.D;
        const ticks = Array.from({ length: g.laps - 1 }, (_, k) => `<u style="left:${((k + 1) / g.laps) * 100}%"></u>`).join("");
        return `<div class="wk-row ${p.i === g.turn && g.state !== "over" ? "now" : ""}" style="--c:${p.c}" data-i="${p.i}">${markSVG(p.mark, p.c)}<span class="nm">${p.name.replace(/[<&]/g, "")}</span><div class="wk-bar"><i style="width:${(pr * 100).toFixed(1)}%"></i>${ticks}</div><span class="lf">${E.left(g, p.i)}</span><span class="st">★${g.stars[p.i]}</span></div>`;
      }).join("");
      S.players.forEach((p) => S.setScore(p.i, E.left(g, p.i))); // 차례 띠 = 남은 칸
    }
    const toast = (k: string | null, text: string) => { $("wk-toast").innerHTML = (k != null ? icon(k) : "") + `<span>${text}</span>`; };
    const die = (v: number, roll?: boolean) => { $("wk-die").innerHTML = dieSVG(v, S.players[g.turn].c, roll ? "roll" : ""); };
    $("wk-note").textContent = `${g.laps}바퀴 산책(${g.D}칸) · 집에 먼저 오면 1등 · 집에서 가장 멀면 꼴찌`;
    // 단추는 한 번만 만들고 보이기·내용만 바꾼다(누를 때마다 다시 만들면 연타가 끊긴다)
    let want: { kind: "roll" | "choose"; res: (k: number) => void } | null = null; // 지금 사람 입력을 기다리는 자리: { kind: "roll" | "choose", res }
    $("wk-roll").onclick = () => { if (want && want.kind === "roll") { const f = want.res; want = null; f(0); } };
    for (let k = 0; k < 3; k++) $("wk-o" + k).onclick = () => { if (want && want.kind === "choose") { const f = want.res; want = null; f(k); } };
    function showActs(mode: "roll" | "choose" | "none") { // "roll" | "choose" | "none"(봇 차례·움직이는 중)
      $("wk-roll").style.display = mode === "roll" ? "" : "none";
      $("wk-roll").disabled = mode !== "roll";
      for (let k = 0; k < 3; k++) $("wk-o" + k).style.display = mode === "choose" && g.opts && g.opts[k] ? "" : "none";
      $("wk-acts").classList.toggle("off", mode === "none" || S.isBot(g.turn));
    }
    function drawOpts() {
      const p = S.players[g.turn];
      g.opts!.forEach((o, k) => {
        const el = $("wk-o" + k);
        el.className = "wk-opt" + (o.cost ? "" : " mid"); el.style.setProperty("--c", p.c);
        const what = o.kind === "home" ? "집!" : o.kind ? E.KINDS[o.kind].name : "빈 칸";
        el.innerHTML = `${icon(o.kind)}<span>${o.cost ? (o.d < g.die ? "−1 ★" : "+1 ★") : "그대로"}</span><small>${o.d}칸 · ${what}</small>`;
        el.setAttribute("aria-label", `${o.d}칸 가서 ${what}${o.cost ? " — 별 하나" : ""}`);
      });
      $("wk-hls").innerHTML = g.opts!.map((o) => { const k = o.to >= g.D ? 0 : o.to % E.RULES.SQUARES, [x, y] = cell(k); return `<rect class="wk-hl" x="${x - 16.5}" y="${y - 16.5}" width="33" height="33" rx="7" stroke="${o.cost ? p.c : INK}"/>`; }).join("");
    }
    const human = (kind: "roll" | "choose") => new Promise<number>((res) => { want = { kind, res }; });
    // 사건 한 줄(엔진 결과 그대로)
    function sayFx(r: E.MoveResult) {
      const p = S.players[r.p], K = E.KINDS[r.kind as E.Kind]; void p;
      if (r.kind === "friend") { const j = r.fx!.swap![1]; return `친구 강아지랑 놀다가 — ${S.players[j].name}와 자리 바꿈`; }
      if (r.kind === "rain") return `소나기! 맨 앞 ${r.fx!.move!.map(([j]) => S.players[j].name).join("·")} 우산 쓰러 ${E.RULES.RAIN_BACK}칸 뒤로`;
      return K.say;
    }
    const GOOD: Record<string, number> = { meat: 1, ball: 1, treat: 1, photo: 1 };
    let turnTok = 0;
    rows(); die(0); toast(null, "");
    while (g.state !== "over") {
      turnTok++; const tok = turnTok; // 넘기기 덮개보다 먼저 — 앞 차례의 늦은 처리가 다음 사람 차례에 끼어들지 않게
      const skipped = g.skipped.slice();
      showActs("none");
      await S.turn(g.turn);
      if (tok !== turnTok) break;
      const p = S.players[g.turn], bot = S.isBot(g.turn);
      rows(); die(0);
      toast(skipped.length ? "bath" : null, skipped.length ? `${skipped.map((j) => S.players[j].name).join("·")} 목욕하느라 한 번 쉬어요 — ${p.name} 차례` : `${p.name} 차례`);
      while (g.state === "roll" && tok === turnTok) {
        // 굴림
        if (bot) { showActs("none"); await S.botWait(g.turn, "주사위 굴리는 중…"); }
        else { showActs("roll"); S.botDone(); S.coach("roll", $("wk-roll")); await human("roll"); S.coachDone("roll"); }
        if (tok !== turnTok) break;
        const opts = E.roll(g)!; showActs("none"); die(g.die, true); S.sfx("tap");
        toast(null, `${g.die}!`);
        await wait(520);
        // 고르기(별이 있으면 셋 — 그대로 · 한 칸 덜 · 한 칸 더)
        let k = opts.findIndex((o) => o.cost === 0);
        if (opts.length > 1) {
          drawOpts();
          if (bot) { showActs("choose"); await S.botWait(g.turn, "어디 설지 고민 중…"); k = E.bot(E.view(g), p.level, Math.random); }
          else { showActs("choose"); toast(null, `${g.die}칸 — 어디에 설까요?`); S.coach("choose", $("wk-acts")); k = await human("choose"); S.coachDone("choose"); }
        } else { toast(null, `${g.die}칸 — 별이 없어 그대로 가요`); await wait(420); }
        if (tok !== turnTok) break;
        $("wk-hls").innerHTML = ""; showActs("none");
        const from = g.prog[g.turn], r = E.choose(g, k)!;
        if (r.cost) { rows(); S.sfx("ok"); }
        await walk(r.p, from, r.to);
        if (r.over) { toast("home", `${p.name} 집에 도착! 코코가 꼬리를 흔들어요`); S.sfx("end"); rows(); break; }
        // 사건
        if (r.kind) {
          S.sfx(GOOD[r.kind] ? "ok" : r.kind === "friend" ? "turn" : "bad"); if (!GOOD[r.kind]) S.buzz(40);
          toast(r.kind, sayFx(r));
          await wait(380);
          if (r.fx && r.fx.swap) await glide(r.fx.move!);
          else if (r.fx && r.fx.move) { for (const [j, a, c] of r.fx.move) await walk(j, a, c); }
          rows();
          if (r.over) { toast("home", `공을 쫓아 ${p.name} 집에 도착!`); S.sfx("end"); break; }
          await wait(bot ? 1100 : 1300);
        } else { rows(); await wait(500); }
        if (r.again) { toast("meat", `${p.name} 한 번 더!`); await wait(500); }
      }
      if ((g.state as string) === "over" || tok !== turnTok) break;
      S.botDone();
      E.next(g);
    }
    S.botDone(); showActs("none"); rows();
    await wait(900);
    const scores = S.players.map((p) => E.rankScore(g, p.i));
    S.end(scores, { lowWins: true, fmt: (s: number) => { const lf = Math.floor(s / 100), st = 99 - (s % 100); return (lf ? `${lf}칸 남음` : "집 도착") + ` ★${st}`; } });
  },
});
}
