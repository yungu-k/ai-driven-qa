// 내기 모음 10 「간식 대포」 — 화면(2D 캔버스 포격). 규칙은 ./artillery.ts(엔진, 화면 모름 — 한 발은 fire(g, shot) 한 번에 끝까지), 바깥 틀은 ./shell.ts.
// 시안 docs/lab-party-artillery-mock.html(md5 d747b29d…, 1판 — 봇 자리·아이패드)의 <script> 를 그대로 옮겼다(타입만 붙임). 겉모양은 ./artillery.css.
// 규격 docs/lab-party-artillery-spec.md. 주소 끝: #reduce · #nocap · #nocoach · #seed=N(엔진 씨앗 고정 — 리그) · #tl=N(차례 시간 초 — 리그) · #fast(날기 4배 — 리그)
// 리그가 보는 자리: window.__ar(엔진 상태) · window.__arE(엔진 모듈 — 시안의 window.PartyArtillery) · window.__arUI(화면 상태) · window.__arPix(화면 색) · window.__party(틀).
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as E from "./artillery.ts";
import { mount, type PartyShell } from "./shell.ts";

export function initArtillery() {
  const RU = E.RULES, hash = location.hash;
  const SEED = +(hash.match(/seed=(\d+)/) || [])[1] || ((Math.random() * 1e9) | 0);
  const TL = +(hash.match(/tl=(\d+)/) || [])[1] || RU.TIME;
  let games = 0;
  const INK = "#3a2228", CREAM = "#fffaf2", PINK = "#f07a8a", TEAL = "#2fb5a8", GOLD = "#e0a640", SPONGE = "#f2c27b", CRUST = "#c98a3e", FROST = "#ffd1dc", MILK = "#f7fbff", MILKL = "#9fd0f0", SKY = "#dff1ff";

  // ── 간식 그림(단추·카드 SVG) ──
  const ICON: Record<string, (s?: number) => string> = {
    cookie: (s = 1) => `<g transform="scale(${s})"><circle r="10" fill="#e0a640" stroke="#8e4526" stroke-width="2"/><circle cx="-4" cy="-3" r="1.9" fill="#5a3a42"/><circle cx="3.5" cy="1.5" r="1.9" fill="#5a3a42"/><circle cx="-1" cy="5" r="1.6" fill="#5a3a42"/></g>`,
    ball: (s = 1) => `<g transform="scale(${s})"><circle r="9" fill="${PINK}" stroke="#a8344a" stroke-width="2"/><path d="M-9 0q9 -6 18 0" stroke="#fffaf2" stroke-width="2.6" fill="none"/><path d="M-12 12q4 -8 8 0q4 -8 8 0" stroke="#5a3a42" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/></g>`,
    melon: (s = 1) => `<g transform="scale(${s})"><circle r="11" fill="#47a35a" stroke="#2f7a3a" stroke-width="2"/><path d="M-6 -9q-3 9 0 18M0 -11v22M6 -9q3 9 0 18" stroke="#2f7a3a" stroke-width="2" fill="none"/></g>`,
    pop: (s = 1) => `<g transform="scale(${s})">${[[-6, 3], [6, 3], [0, -6]].map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="4.6" fill="#fffaf2" stroke="#b07a1c" stroke-width="1.6"/><circle cx="2.4" cy="-2" r="2.6" fill="#fffaf2" stroke="#b07a1c" stroke-width="1.2"/></g>`).join("")}</g>`,
  };
  const wIcon = (id: string, s: number) => `<svg viewBox="-14 -14 28 28" aria-hidden="true">${ICON[id](s)}</svg>`;
  // 찐빵 친구(사람 하나 = 색 + 모양 표지). sleep: 낮잠 얼굴
  const bun = (x: number, y: number, c: string, mark: string, o: any = {}) => {
    const k = o.s || 1, face = o.sleep ? `<path d="M-6 -1q2 2 4 0M2 -1q2 2 4 0" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>` : `<circle cx="-4" cy="-2" r="2" fill="${INK}"/><circle cx="4" cy="-2" r="2" fill="${INK}"/><path d="M-2 3q2 2 4 0" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    const mk = { circle: `<circle cx="0" cy="-12" r="3" fill="#fff"/>`, tri: `<path d="M0 -16l3.5 6h-7z" fill="#fff"/>`, square: `<rect x="-3" y="-15" width="6" height="6" rx="1" fill="#fff"/>`, star: `<path d="M0 -16l1.2 2.6 2.8.3-2.1 1.9.6 2.8L0 -9.8l-2.5 1.4.6-2.8-2.1-1.9 2.8-.3z" fill="#fff"/>` }[mark || "circle"];
    return `<g transform="translate(${x} ${y}) scale(${k})"><path d="M-12 6C-14 -6 -8 -14 0 -14S14 -6 12 6Q0 10 -12 6z" fill="${c}" stroke="${INK}" stroke-width="1.6"/>${mk}<circle cx="-7" cy="2" r="2" fill="#fff" opacity=".45"/><circle cx="7" cy="2" r="2" fill="#fff" opacity=".45"/>${face}</g>`;
  };
  const card = (inner: string, bg?: string) => `<svg viewBox="0 0 160 120"><rect width="160" height="120" rx="14" fill="${bg || SKY}"/>${inner}</svg>`;
  const land = (d: string, extra?: string) => `<path d="${d}" fill="${SPONGE}" stroke="${CRUST}" stroke-width="2"/>${extra || ""}`;
  const sea = (y: number) => `<rect x="0" y="${y}" width="160" height="${120 - y}" fill="${MILK}"/><path d="M0 ${y}q10 -4 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0" stroke="${MILKL}" stroke-width="2.5" fill="none"/>`;
  const arrowHead = (x: number, y: number, ang: number, c: string) => { const a = (ang * Math.PI) / 180, l = 8; return `<path d="M${x} ${y}L${x - l * Math.cos(a - 0.5)} ${y - l * Math.sin(a - 0.5)}M${x} ${y}L${x - l * Math.cos(a + 0.5)} ${y - l * Math.sin(a + 0.5)}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`; };
  const hand = (x: number, y: number) => `<g transform="translate(${x} ${y})"><path d="M-5 10V-6a3 3 0 0 1 6 0v6l6 1a4 4 0 0 1 3 5l-2 7H-3z" fill="#ffe0c4" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/></g>`;
  const rules = [
    // ① 겨누기: 친구에서 뒤로 끌면(손) 반대쪽으로 겨눈다 — 길게 끌수록 세게(짧은 화살 · 긴 화살)
    { cap: "화면을 뒤로 끌어 겨눠요 — 길게 끌수록 세게", svg: card(`${land("M0 120V82q30-10 60-4t100 6V120z")}${bun(44, 74, PINK, "circle", { s: 1.3 })}<path d="M44 58L22 88" stroke="${INK}" stroke-width="2" stroke-dasharray="4 3"/>${hand(18, 96)}<path d="M50 54L84 22" stroke="${PINK}" stroke-width="4" stroke-linecap="round"/>${arrowHead(84, 22, -43, PINK)}<path d="M66 56q30 -40 64 -6" stroke="${INK}" stroke-width="2" stroke-dasharray="2 5" fill="none" opacity=".55"/><g transform="translate(130 60)">${ICON.cookie(0.8)}</g>`) },
    // ② 바람: 깃발 화살표 쪽으로 간식이 휜다(점선 = 바람 없을 때, 실선 = 바람 있을 때)
    { cap: "바람이 간식을 밀어요 — 차례마다 바뀌어요", svg: card(`${land("M0 120V86q40-8 80-2t80 0V120z")}${bun(26, 80, TEAL, "tri", { s: 1.1 })}<path d="M30 70q36 -70 76 10" stroke="${INK}" stroke-width="2" stroke-dasharray="3 4" fill="none" opacity=".5"/><path d="M30 70q48 -74 104 10" stroke="${PINK}" stroke-width="3" fill="none"/><g transform="translate(134 80)">${ICON.cookie(0.7)}</g><rect x="96" y="12" width="3" height="34" fill="${INK}"/><path d="M99 13h30l-6 7 6 7H99z" fill="${GOLD}" stroke="${INK}" stroke-width="1.5"/><path d="M58 22h26" stroke="${TEAL}" stroke-width="4" stroke-linecap="round"/>${arrowHead(84, 22, 0, TEAL)}`, "#fff4e3") },
    // ③ 땅 파기: 간식이 떨어진 자리가 둥글게 파이고(퐁!), 옆 친구의 기운 막대가 준다
    { cap: "떨어진 자리는 파이고, 가까운 친구는 기운이 줄어요", svg: card(`${land("M0 120V70h52a24 24 0 0 0 48 0h60V120z")}<circle cx="76" cy="62" r="16" fill="#fff" opacity=".85"/>${[0, 60, 120, 180, 240, 300].map((a) => `<circle cx="${76 + 22 * Math.cos((a * Math.PI) / 180)}" cy="${60 + 18 * Math.sin((a * Math.PI) / 180)}" r="3" fill="${CRUST}"/>`).join("")}<text x="76" y="67" text-anchor="middle" font-size="14" font-weight="900" fill="${INK}">퐁!</text>${bun(118, 62, GOLD, "square", { s: 1.2 })}<rect x="104" y="32" width="28" height="6" rx="3" fill="#fff" stroke="${INK}" stroke-width="1.2"/><rect x="105" y="33" width="12" height="4" rx="2" fill="${TEAL}"/><path d="M120 35h11" stroke="${PINK}" stroke-width="4"/><g transform="translate(64 26) rotate(30)">${ICON.cookie(0.7)}</g><path d="M46 14q10 2 16 10" stroke="${INK}" stroke-width="2" stroke-dasharray="2 4" fill="none"/>`) },
    // ④ 나감: 바다에 퐁당(물방울) · 기운 0 은 낮잠(Zz) · 끝까지 남은 친구 머리에 별
    { cap: "우유 바다에 빠지거나 기운이 0 이면 나가요 — 끝까지 남으면 1등", svg: card(`${sea(88)}${land("M0 120V70q20-4 40 0V120z")}${land("M104 120V66q26-6 56 0V120z")}<path d="M66 50q4 22 6 34" stroke="${INK}" stroke-width="2" stroke-dasharray="3 3"/>${bun(72, 92, PINK, "circle", { s: 1 })}<path d="M58 88q-6 -10 -2 -16M86 88q6 -10 2 -16" stroke="${MILKL}" stroke-width="3" fill="none" stroke-linecap="round"/>${bun(22, 64, TEAL, "tri", { s: 1, sleep: true })}<text x="32" y="44" font-size="13" font-weight="900" fill="${INK}">Zz</text>${bun(132, 60, "#8b5cd6", "star", { s: 1.2 })}<path d="M132 26l3.6 7.4 8 1.1-5.8 5.6 1.4 8L132 44.3l-7.2 3.8 1.4-8-5.8-5.6 8-1.1z" fill="#ffd36b" stroke="#b07a1c" stroke-width="1.5"/>`, "#fff4e3") },
    // ⑤ 조작: 간식 넷 · 각도 ◀ ▶ · 힘 − + · 발사 단추 · 모래시계 30
    { cap: "간식 고르기 · 각도 ◀▶ · 힘 −+ · 발사 — 30초 안에", svg: card(`${["cookie", "ball", "melon", "pop"].map((id, k) => `<rect x="${10 + k * 36}" y="10" width="32" height="30" rx="8" fill="${k === 0 ? "#fff4e3" : CREAM}" stroke="${k === 0 ? GOLD : "#ecd3a6"}" stroke-width="2.5"/><g transform="translate(${26 + k * 36} 25)">${ICON[id](0.85)}</g>`).join("")}<rect x="10" y="48" width="68" height="28" rx="9" fill="${CREAM}" stroke="#ecd3a6" stroke-width="2"/><text x="22" y="68" font-size="15" font-weight="900" fill="${INK}">◀</text><path d="M44 70l8-14" stroke="${PINK}" stroke-width="3" stroke-linecap="round"/><text x="60" y="68" font-size="15" font-weight="900" fill="${INK}">▶</text><rect x="82" y="48" width="68" height="28" rx="9" fill="${CREAM}" stroke="#ecd3a6" stroke-width="2"/><text x="92" y="68" font-size="17" font-weight="900" fill="${INK}">−</text><rect x="106" y="58" width="22" height="8" rx="4" fill="${GOLD}"/><text x="134" y="68" font-size="17" font-weight="900" fill="${INK}">+</text><rect x="10" y="84" width="108" height="28" rx="14" fill="#ffd36b" stroke="#b07a1c" stroke-width="2"/><g transform="translate(64 98)">${ICON.cookie(0.6)}</g><path d="M78 98h22" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>${arrowHead(100, 98, 0, INK)}<path d="M128 84h20M128 112h20M131 84c0 10 14 10 14 14s-14 4-14 14M145 84c0 10-14 10-14 14s14 4 14 14" stroke="${INK}" stroke-width="2" fill="none"/>`, "#fff4e3") },
  ];

  mount({
    id: "artillery", title: "간식 대포", min: 2, max: 4, hidden: false, rules,
    coach: { drag: "화면을 뒤로 끌어 겨눠요 — 길게 끌수록 세게", power: "− + 로 힘을 조금씩 맞춰요", weapon: "간식을 바꿔 봐요 — 튀는 공 · 넓게 파는 수박 · 세 알 팝콘", fire: "다 맞췄으면 발사!" },
    async start(S: PartyShell) {
      const gen = ++games;
      const g = E.create(S.players.length, SEED + (gen - 1) * 7919);
      (window as any).__ar = g; // 리그
      (window as any).__arE = E; // 리그: 시안의 window.PartyArtillery 자리(모듈이라 전역이 없다)
      const UI: any = ((window as any).__arUI = { aim: null, canAim: false, auto: 0, shots: 0, tl: TL, left: TL, busy: false, lastRes: null, botTurns: 0, gen });
      const root = document.getElementById("pt-game")!, $ = (id: string): any => document.getElementById(id);
      root.innerHTML = `<div class="ar">
        <div class="ar-info"><div class="ar-who" id="ar-who" aria-live="polite"></div><div class="ar-wind" id="ar-wind" aria-label="바람"></div><div class="ar-time" id="ar-time" aria-label="남은 시간"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" fill="${CREAM}" stroke="#ecd3a6" stroke-width="4"/><circle id="ar-ring" cx="22" cy="22" r="18" fill="none" stroke="${TEAL}" stroke-width="4" stroke-linecap="round" stroke-dasharray="113.1" stroke-dashoffset="0"/></svg><b id="ar-sec"></b></div></div>
        <div class="ar-stage" id="ar-stage"><canvas id="ar-cv" aria-label="놀이판 — 뒤로 끌어 겨누기"></canvas><div class="ar-anchor" id="ar-anchor"></div><div class="ar-banner" id="ar-banner"></div></div>
        <div class="ar-weap" id="ar-weap" role="group" aria-label="간식 고르기">${E.WEAPONS.map((w, k) => `<button class="ar-w" data-w="${k}" aria-pressed="false" aria-label="${w.name}">${wIcon(w.id, 0.95)}<span>${w.name}</span><i></i></button>`).join("")}</div>
        <div class="ar-adj"><div class="ar-g" role="group" aria-label="각도"><button id="ar-al" aria-label="왼쪽으로">◀</button><div class="ar-v"><b id="ar-ang"></b><small>각도</small></div><button id="ar-ar" aria-label="오른쪽으로">▶</button></div>
          <div class="ar-g" role="group" aria-label="힘"><button id="ar-pm" aria-label="힘 빼기">−</button><div class="ar-v"><b id="ar-pow"></b><small>힘</small></div><button id="ar-pp" aria-label="힘 더하기">+</button></div></div>
        <div class="ar-fire-row"><button class="pt-btn ar-fire" id="ar-fire">발사!</button></div>
      </div>`;
      const cv: HTMLCanvasElement = $("ar-cv"), ctx: CanvasRenderingContext2D = cv.getContext("2d")!, stage: HTMLElement = $("ar-stage");
      const REDUCE = document.body.classList.contains("reduce");
      let cw = 0, ch = 0, sc = 1, dpr = 1;
      function resize() { const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); cw = stage.clientWidth; ch = stage.clientHeight; sc = cw / RU.W; cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
      resize(); const ro = new ResizeObserver(resize); ro.observe(stage);
      // 리그: 놀이판 한 점(맵 좌표)의 화면 색 · 보이는 땅
      (window as any).__arPix = (x: number, y: number) => [...ctx.getImageData(Math.round(x * sc * dpr), Math.round(y * sc * dpr), 1, 1).data];
      UI.viewH = () => hView.slice();

      // 보이는 상태(화면 쪽 복사): 날아가는 동안엔 쏘기 전 땅에 터질 때마다 같은 carve 를 다시 해 보인다
      let hView = g.h.slice(), unitsView = g.units.map((u) => ({ x: u.x, y: u.y, alive: u.alive })), water = g.water;
      const fx: any[] = []; // 터짐·물보라·숫자 효과 { kind, x, y, r, t0, dur, text }
      let flight: any = null, aim: any = null, dragging: any = null, turnTok = 0, timer: any = null, raf = 0, alive = true;
      const clouds = [0, 1, 2, 3].map((k) => ({ x: (k * 211 + 70) % RU.W, y: 40 + ((k * 53) % 90), s: 0.8 + (k % 3) * 0.25 }));
      const P = (i: number) => S.players[i];

      // ── 그리기 ──
      const X = (x: number) => x * sc, Y = (y: number) => y * sc;
      function drawTerrain() {
        const C = RU.COL;
        ctx.beginPath(); ctx.moveTo(0, Y(RU.H + 10));
        for (let c = 0; c < hView.length; c++) { ctx.lineTo(X(c * C), Y(hView[c])); ctx.lineTo(X(c * C + C), Y(hView[c])); }
        ctx.lineTo(X(RU.W), Y(RU.H + 10)); ctx.closePath();
        const gr = ctx.createLinearGradient(0, Y(150), 0, Y(RU.H)); gr.addColorStop(0, SPONGE); gr.addColorStop(1, "#e3a95e");
        ctx.fillStyle = gr; ctx.fill();
        // 겉 크림(분홍 아이싱) 한 줄
        ctx.beginPath();
        for (let c = 0; c < hView.length; c++) { const y = Y(hView[c]); if (c === 0) ctx.moveTo(0, y); ctx.lineTo(X(c * C), y); ctx.lineTo(X(c * C + C), y); }
        ctx.strokeStyle = FROST; ctx.lineWidth = Math.max(3, 7 * sc); ctx.lineJoin = "round"; ctx.stroke();
        ctx.strokeStyle = CRUST; ctx.lineWidth = Math.max(1, 1.6 * sc); ctx.stroke();
        // 스프링클(고정 무늬): 땅 속에만
        for (let c = 2; c < hView.length; c += 5) { const top = hView[c]; for (let k = 0; k < 3; k++) { const y = top + 22 + ((c * 37 + k * 61) % 140); if (y > RU.H - 4) continue; ctx.fillStyle = ["#f07a8a", "#2fb5a8", "#8b5cd6"][(c + k) % 3]; ctx.fillRect(X(c * C + (k * 7) % 12), Y(y), Math.max(2, 5 * sc), Math.max(1.5, 2.4 * sc)); } }
      }
      function drawSea() {
        ctx.fillStyle = MILK; ctx.fillRect(0, Y(water), cw, ch - Y(water));
        ctx.beginPath(); const t = REDUCE ? 0 : performance.now() / 600;
        for (let x = 0; x <= RU.W; x += 12) { const y = water + Math.sin(x / 24 + t) * 2.2; if (!x) ctx.moveTo(X(x), Y(y)); else ctx.lineTo(X(x), Y(y)); }
        ctx.strokeStyle = MILKL; ctx.lineWidth = Math.max(2, 3 * sc); ctx.stroke();
      }
      const R = RU.R;
      function drawBun(i: number, x: number, y: number, now: number) {
        const p = P(i), u = g.units[i], cur = g.turn === i && g.state === "aim";
        const k = Math.max(1, 8 / (R * sc)) * sc; // 작은 화면에선 그림만 조금 키운다(맞음 판정은 엔진 R)
        const bob = cur && !REDUCE ? Math.sin(now / 220) * 1.5 : 0;
        ctx.save(); ctx.translate(X(x), Y(y) + bob * k);
        ctx.scale(k, k);
        // 몸
        ctx.beginPath(); ctx.moveTo(-12, 0); ctx.bezierCurveTo(-14, -14, -8, -24, 0, -24); ctx.bezierCurveTo(8, -24, 14, -14, 12, 0); ctx.quadraticCurveTo(0, 4, -12, 0); ctx.closePath();
        ctx.fillStyle = p.c; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
        // 모양 표지(색약 구분)
        ctx.fillStyle = "#fff"; ctx.beginPath();
        if (p.mark === "circle") ctx.arc(0, -17, 3, 0, 7);
        else if (p.mark === "tri") { ctx.moveTo(0, -21); ctx.lineTo(3.6, -14.5); ctx.lineTo(-3.6, -14.5); ctx.closePath(); }
        else if (p.mark === "square") ctx.rect(-3, -20, 6, 6);
        else { for (let a = 0; a < 10; a++) { const rr = a % 2 ? 1.6 : 3.8, an = -Math.PI / 2 + (a * Math.PI) / 5; ctx.lineTo(Math.cos(an) * rr, -17 + Math.sin(an) * rr); } ctx.closePath(); }
        ctx.fill();
        // 얼굴
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-4, -8, 1.9, 0, 7); ctx.arc(4, -8, 1.9, 0, 7); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-2, -4); ctx.quadraticCurveTo(0, -2, 2, -4); ctx.stroke();
        ctx.restore();
        // 기운 막대
        const bw = 26 * k, bx = X(x) - bw / 2, by = Y(y) - 34 * k + bob * k;
        ctx.fillStyle = "#fff"; ctx.fillRect(bx, by, bw, 4 * k); ctx.fillStyle = u.hp > 35 ? TEAL : PINK; ctx.fillRect(bx, by, bw * Math.min(1, u.hp / g.hp0[i]), 4 * k);
        ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, 4 * k);
        if (cur) { ctx.fillStyle = p.ink; ctx.beginPath(); const ay = by - 6 * k; ctx.moveTo(X(x), ay); ctx.lineTo(X(x) - 5 * k, ay - 7 * k); ctx.lineTo(X(x) + 5 * k, ay - 7 * k); ctx.closePath(); ctx.fill(); }
      }
      function drawAim(_now: number) {
        if (!aim || g.state !== "aim" || flight) return;
        const u = g.units[g.turn], v = E.view(g);
        // 궤적 힌트: 친구 둘레 앞부분만(바람 포함) — 끝까지는 안 보여 준다
        const pts = E.hint(v, aim, 46 + aim.power * 0.5);
        ctx.fillStyle = P(g.turn).ink;
        pts.forEach((p, k) => { if (k % 3) return; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), Math.max(1.6, 2.6 * sc), 0, 7); ctx.fill(); });
        // 새총 고무줄(끄는 동안)
        if (dragging && dragging.moved) { ctx.strokeStyle = "rgba(58,34,40,.45)"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(dragging.x0, dragging.y0); ctx.lineTo(dragging.x1, dragging.y1); ctx.stroke(); ctx.setLineDash([]); }
      }
      function drawProj(id: string, x: number, y: number) {
        ctx.save(); ctx.translate(X(x), Y(y)); const k = Math.max(0.55, 1.1 * sc) ; ctx.scale(k, k);
        if (id === "cookie") { ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill(); ctx.strokeStyle = "#8e4526"; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = "#5a3a42"; [[-3, -3], [3, 1], [-1, 4]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a, b, 1.7, 0, 7); ctx.fill(); }); }
        else if (id === "ball") { ctx.fillStyle = PINK; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill(); ctx.strokeStyle = "#a8344a"; ctx.lineWidth = 2; ctx.stroke(); ctx.strokeStyle = CREAM; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(0, -5, 8, 0); ctx.stroke(); }
        else if (id === "melon") { ctx.fillStyle = "#47a35a"; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill(); ctx.strokeStyle = "#2f7a3a"; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-5, -9); ctx.quadraticCurveTo(-8, 0, -5, 9); ctx.moveTo(0, -11); ctx.lineTo(0, 11); ctx.moveTo(5, -9); ctx.quadraticCurveTo(8, 0, 5, 9); ctx.stroke(); }
        else { ctx.fillStyle = CREAM; ctx.strokeStyle = "#b07a1c"; ctx.lineWidth = 1.6; [[0, 0, 5], [3, -3, 3.4]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(a, b, r, 0, 7); ctx.fill(); ctx.stroke(); }); }
        ctx.restore();
      }
      function drawFx(now: number) {
        for (let k = fx.length - 1; k >= 0; k--) {
          const f = fx[k], q = (now - f.t0) / f.dur;
          if (q >= 1) { fx.splice(k, 1); continue; }
          if (f.kind === "boom") {
            const rr = f.r * (0.6 + 0.6 * q); ctx.globalAlpha = 1 - q; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(X(f.x), Y(f.y), X(rr), 0, 7); ctx.fill();
            ctx.fillStyle = CRUST; for (let a = 0; a < 8; a++) { const an = a * 0.785 + f.r; ctx.beginPath(); ctx.arc(X(f.x + Math.cos(an) * rr * 1.1), Y(f.y + Math.sin(an) * rr * 1.1 - q * 10), Math.max(1.5, 3 * sc), 0, 7); ctx.fill(); }
            ctx.globalAlpha = 1 - q; ctx.fillStyle = INK; ctx.font = `900 ${Math.max(12, 20 * sc)}px Pretendard Variable, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.fillText("퐁!", X(f.x), Y(f.y - f.r * 0.2)); ctx.globalAlpha = 1;
          } else if (f.kind === "splash") {
            ctx.strokeStyle = MILKL; ctx.lineWidth = Math.max(2, 3 * sc); ctx.globalAlpha = 1 - q;
            for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(X(f.x + s * 4), Y(f.y)); ctx.quadraticCurveTo(X(f.x + s * (10 + 14 * q)), Y(f.y - 26 * (1 - q * 0.5)), X(f.x + s * (18 + 16 * q)), Y(f.y)); ctx.stroke(); }
            ctx.globalAlpha = 1;
          } else if (f.kind === "text") {
            ctx.globalAlpha = 1 - q * q; ctx.fillStyle = f.c || INK; ctx.font = `900 ${Math.max(12, 18 * sc)}px Pretendard Variable, system-ui, sans-serif`; ctx.textAlign = "center"; ctx.fillText(f.text, X(f.x), Y(f.y - 30 * q)); ctx.globalAlpha = 1;
          }
        }
      }
      function draw(now: number) {
        if (!alive || gen !== games) return;
        raf = requestAnimationFrame(draw);
        if (!cw) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const sky = ctx.createLinearGradient(0, 0, 0, ch); sky.addColorStop(0, "#bfe6ff"); sky.addColorStop(1, "#fff4e3"); ctx.fillStyle = sky; ctx.fillRect(0, 0, cw, ch);
        // 구름: 바람 쪽으로 흐른다(줄인 동작이면 멈춤)
        ctx.fillStyle = "rgba(255,255,255,.85)";
        for (const c of clouds) { if (!REDUCE) c.x = (c.x + g.wind * 0.12 * c.s + RU.W + 80) % (RU.W + 80); const x = c.x - 40; ctx.beginPath(); ctx.arc(X(x), Y(c.y), X(14 * c.s), 0, 7); ctx.arc(X(x + 16 * c.s), Y(c.y - 6), X(17 * c.s), 0, 7); ctx.arc(X(x + 34 * c.s), Y(c.y), X(13 * c.s), 0, 7); ctx.fill(); }
        drawSea(); drawTerrain();
        unitsView.forEach((u, i) => { if (u.alive) drawBun(i, u.x, u.y, now); });
        drawAim(now);
        if (flight) {
          for (const tr of flight.res.tracks as any[]) { const k = Math.floor(flight.tau) - tr.t0; if (k < 0 || k >= tr.pts.length) continue; if (flight.res.booms.some((b: any) => b.t <= flight.tau && trEnd(tr) === b.t)) continue; const [x, y] = tr.pts[k]; if (y < 0) { ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(X(x), 2); ctx.lineTo(X(x) - 5, 10); ctx.lineTo(X(x) + 5, 10); ctx.fill(); } else drawProj(flight.res.weapon, x, y); }
        }
        drawFx(now);
      }
      const trEnd = (tr: any) => tr.t0 + tr.pts.length - 1;
      raf = requestAnimationFrame(draw);

      // ── 위 줄: 차례 · 바람 · 시간 ──
      function drawInfo() {
        const p = P(g.turn), w = g.wind, mag = Math.abs(w), dir = w < 0 ? -1 : 1;
        $("ar-who").innerHTML = `${p.name} 차례<small>${g.round} 바퀴${g.round > RU.SD ? " · 바다가 차올라요" : g.round === RU.SD ? " · 다음 바퀴부터 바다가 차올라요" : ""}</small>`;
        const len = 6 + mag * 5, x0 = 20 - (dir * len) / 2, x1 = 20 + (dir * len) / 2;
        $("ar-wind").innerHTML = `<svg viewBox="0 0 40 24" aria-hidden="true">${mag ? `<path d="M${x0} 12H${x1}" stroke="${TEAL}" stroke-width="4" stroke-linecap="round"/><path d="M${x1} 12l${-dir * 7} -6M${x1} 12l${-dir * 7} 6" stroke="${TEAL}" stroke-width="4" stroke-linecap="round"/>` : `<circle cx="20" cy="12" r="5" fill="none" stroke="${TEAL}" stroke-width="3"/>`}</svg>${mag ? `바람 ${mag}` : "바람 없음"}`;
        $("ar-wind").setAttribute("aria-label", mag ? `바람 ${w < 0 ? "왼쪽" : "오른쪽"}으로 ${mag}` : "바람 없음");
      }
      function drawTime() {
        $("ar-sec").textContent = Math.ceil(UI.left);
        $("ar-ring").setAttribute("stroke-dashoffset", String(113.1 * (1 - UI.left / TL)));
        $("ar-time").classList.toggle("low", UI.left <= 5);
        $("ar-time").classList.toggle("off", !UI.canAim);
      }
      // ── 아래: 간식 · 각도 · 힘 (단추는 다시 만들지 않고 글자·상태만 바꾼다) ──
      const wBtns = [...document.querySelectorAll(".ar-w")] as HTMLButtonElement[];
      function drawCtl() {
        const u = g.units[g.turn], on = UI.canAim;
        wBtns.forEach((b, k) => { b.setAttribute("aria-pressed", String(aim && aim.weapon === k)); b.disabled = !on || u.ammo[k] === 0; (b.querySelector("i") as any).textContent = u.ammo[k] < 0 ? "∞" : u.ammo[k]; });
        if (aim) { const el = aim.angle <= 90 ? aim.angle : 180 - aim.angle; $("ar-ang").textContent = `${aim.angle > 90 ? "←" : aim.angle < 90 ? "→" : "↑"} ${el}°`; $("ar-pow").textContent = aim.power; }
        ["ar-al", "ar-ar", "ar-pm", "ar-pp", "ar-fire"].forEach((id) => ($(id).disabled = !on));
        // 말풍선 자리: 지금 친구 위치
        const uu = unitsView[g.turn]; $("ar-anchor").style.left = X(uu.x) + "px"; $("ar-anchor").style.top = Y(uu.y) + "px";
      }
      function banner(text: string, ms?: number) { const b = $("ar-banner"); b.textContent = text; b.classList.add("on"); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove("on"), ms || 1400); }

      // ── 조작 말풍선(첫 판, 사람 차례): 끌어 겨누기 → 힘 → 간식 바꾸기 → 발사 차례로 ──
      const COACH = ["drag", "power", "weapon", "fire"], coachDid: Record<string, number> = {};
      let coachKey: string | null = null;
      function coachNext() {
        if (!UI.canAim || S.isBot(g.turn)) return;
        const seen: Record<string, number> = S.store.get("lab.party.seen.artillery", {});
        const key = COACH.find((k) => !seen[k] && !coachDid[k]);
        if (!key) return;
        const el = ({ drag: $("ar-anchor"), power: $("ar-pp"), weapon: $("ar-weap"), fire: $("ar-fire") } as Record<string, any>)[key];
        coachKey = key; S.coach(key, el, null, { below: key === "drag" || key === "power" });
      }
      function coachDo(key: string) { if (coachDid[key]) return; coachDid[key] = 1; if (coachKey === key) { S.coachDone(key); coachKey = null; coachNext(); } else S.store.set("lab.party.seen.artillery", Object.assign(S.store.get("lab.party.seen.artillery", {}), { [key]: 1 })); }
      function coachHide() { if (coachKey) { S.coachDone(coachKey, true); coachKey = null; } }

      // ── 사람 입력: 끌어 겨누기(새총 — 끈 반대쪽으로) · ◀▶ · −+ · 간식 · 발사 ──
      let fireRes: any = null;
      const setAim = (a: number, p: number, _from?: string) => { aim.angle = Math.max(0, Math.min(180, Math.round(a))); aim.power = Math.max(5, Math.min(100, Math.round(p))); drawCtl(); };
      cv.addEventListener("pointerdown", (e: PointerEvent) => {
        if (!UI.canAim) { UI.blocked = (UI.blocked || 0) + 1; return; }
        const r = cv.getBoundingClientRect(), z = r.width / cw; // 틀 zoom 이면 화면 px ≠ CSS px
        dragging = { id: e.pointerId, sx: e.clientX, sy: e.clientY, z, x0: (e.clientX - r.left) / z, y0: (e.clientY - r.top) / z, x1: 0, y1: 0, moved: false };
        try { cv.setPointerCapture(e.pointerId); } catch (er) {}
        e.preventDefault();
      });
      cv.addEventListener("pointermove", (e: PointerEvent) => {
        if (!dragging || e.pointerId !== dragging.id || !UI.canAim) return;
        const dx = (e.clientX - dragging.sx) / dragging.z, dy = (e.clientY - dragging.sy) / dragging.z, len = Math.hypot(dx, dy);
        dragging.x1 = dragging.x0 + dx; dragging.y1 = dragging.y0 + dy;
        if (len < 8) return;
        dragging.moved = true;
        // 끈 반대쪽이 겨누는 쪽. 아래로 쏘는 각은 없다(0°/180° 에서 멈춤)
        let a = (Math.atan2(dy, -dx) * 180) / Math.PI; if (a < 0) a = a < -90 ? 180 : 0;
        setAim(a, (len / (cw * 0.35)) * 100);
      });
      const endDrag = (e: PointerEvent) => { if (!dragging || e.pointerId !== dragging.id) return; const moved = dragging.moved; dragging = null; if (moved && UI.canAim) { S.sfx("tap"); coachDo("drag"); } };
      cv.addEventListener("pointerup", endDrag); cv.addEventListener("pointercancel", endDrag);
      // 누르고 있으면 되풀이(0.4초 뒤부터 0.07초마다). 단추는 다시 만들지 않는다
      function holdBtn(id: string, fn: () => void) {
        const b = $(id); let t1: any = null, t2: any = null;
        const stop = () => { clearTimeout(t1); clearInterval(t2); };
        b.addEventListener("pointerdown", (e: PointerEvent) => { if (b.disabled) return; e.preventDefault(); fn(); t1 = setTimeout(() => (t2 = setInterval(() => { if (b.disabled) stop(); else fn(); }, 70)), 400); });
        ["pointerup", "pointerleave", "pointercancel"].forEach((k) => b.addEventListener(k, stop));
        b.addEventListener("click", (e: MouseEvent) => { if (e.detail === 0 && !b.disabled) fn(); }); // 키보드(Enter·Space)
      }
      holdBtn("ar-al", () => setAim(aim.angle + 1, aim.power));
      holdBtn("ar-ar", () => setAim(aim.angle - 1, aim.power));
      holdBtn("ar-pm", () => { setAim(aim.angle, aim.power - 1); coachDo("power"); });
      holdBtn("ar-pp", () => { setAim(aim.angle, aim.power + 1); coachDo("power"); });
      wBtns.forEach((b) => (b.onclick = () => { if (b.disabled || !UI.canAim) return; aim.weapon = +b.dataset.w!; S.sfx("tap"); drawCtl(); coachDo("weapon"); }));
      $("ar-fire").onclick = () => { if (!UI.canAim || !fireRes) return; coachDo("fire"); const f = fireRes; fireRes = null; f("button"); };

      // ── 한 발 보이기: 엔진이 낸 궤적을 걸음(t)대로 다시 그린다. 터질 때마다 보이는 땅을 같은 carve 로 판다 ──
      const SPEED = () => (S.fast || /(^|[#&])fast/.test(hash) ? 4 : 1.35);
      function play(res: E.ShotRes, before: boolean[]) {
        return new Promise<void>((done) => {
          flight = { res, tau: 0 }; let last = performance.now(), bi = 0, si = 0;
          const booms = res.booms.slice().sort((a, b) => a.t - b.t), spl = res.splashes.slice().sort((a, b) => a.t - b.t);
          S.sfx("tap");
          (function step(now: number) {
            if (gen !== games) return done();
            const dt = Math.min(0.05, (now - last) / 1000); last = now;
            if (!S.paused) flight.tau += dt * 60 * SPEED();
            while (bi < booms.length && booms[bi].t <= flight.tau) { const b = booms[bi++]; E.carve(hView, b.x, b.y, b.r); fx.push({ kind: "boom", x: b.x, y: b.y, r: b.r, t0: now, dur: REDUCE ? 250 : 500 }); S.sfx("ok"); S.buzz(25); }
            while (si < spl.length && spl[si].t <= flight.tau) { const b = spl[si++]; fx.push({ kind: "splash", x: b.x, y: b.y, t0: now, dur: 600 }); }
            if (flight.tau < res.steps + 2) { requestAnimationFrame(step); return; }
            flight = null;
            // 내려앉기: 친구가 새 자리로(파인 땅으로 떨어짐 · 밀림)
            const from = unitsView.map((u) => ({ x: u.x, y: u.y })), t0 = performance.now(), dur = REDUCE ? 1 : 380;
            res.dmg.forEach((d, i) => { if (d > 0 && before[i]) fx.push({ kind: "text", text: `-${d}`, x: from[i].x, y: from[i].y - 58, t0, dur: 1100, c: "#a8344a" }); });
            (function fall(now2: number) {
              if (gen !== games) return done();
              const q = Math.min(1, (now2 - t0) / dur);
              g.units.forEach((u, i) => { if (!before[i]) return; const tx = u.alive ? u.x : u.x, ty = u.alive ? u.y : Math.min(RU.H + 30, Math.max(u.y, E.groundAt(g.h, Math.max(0, Math.min(RU.W - 1, u.x))))); unitsView[i].x = from[i].x + (tx - from[i].x) * q; unitsView[i].y = from[i].y + (ty - from[i].y) * q; });
              if (q < 1) { requestAnimationFrame(fall); return; }
              hView = g.h.slice(); // 엔진 땅과 맞춘다(같은 carve 라 같아야 한다 — 리그가 본다)
              for (const o of res.outs) outFx(o);
              unitsView.forEach((u, i) => (u.alive = g.units[i].alive));
              g.units.forEach((u, i) => S.setScore(i, u.hp));
              setTimeout(done, res.outs.length ? 700 / (SPEED() > 2 ? 3 : 1) : 250 / (SPEED() > 2 ? 3 : 1));
            })(performance.now());
          })(performance.now());
        });
      }
      function outFx(o: { i: number; why: string }) {
        const u = unitsView[o.i], now = performance.now(), p = P(o.i);
        if (o.why === "nap") { fx.push({ kind: "text", text: "Zz 낮잠", x: u.x, y: u.y - 20, t0: now, dur: 1600 }); banner(`${p.name} 낮잠 — 나갔어요`); }
        else { fx.push({ kind: "splash", x: Math.max(10, Math.min(RU.W - 10, u.x)), y: water, t0: now, dur: 800 }); banner(`${p.name} 퐁당 — 나갔어요`); }
        S.sfx("bad"); chipOut(o.i);
      }
      function chipOut(i: number) { const c = document.getElementById("pt-chip-" + i); if (c) c.style.opacity = ".45"; }

      // ── 차례 시계: 사람 차례만 돈다. 규칙 카드가 열리면 선다. 다 되면 지금 겨눈 대로 저절로 쏜다 ──
      function startTimer() {
        UI.left = TL; drawTime(); let last = performance.now();
        clearInterval(timer);
        timer = setInterval(() => {
          const now = performance.now(), dt = (now - last) / 1000; last = now;
          if (S.paused || !UI.canAim) return;
          const before = Math.ceil(UI.left);
          UI.left = Math.max(0, UI.left - dt); drawTime();
          if (Math.ceil(UI.left) !== before && UI.left <= 5 && UI.left > 0) S.sfx("tap");
          if (UI.left <= 0) { clearInterval(timer); UI.auto++; banner("시간 끝 — 겨눈 대로 쏴요"); const f = fireRes; fireRes = null; f && f("time"); }
        }, 100);
      }
      function stopTimer() { clearInterval(timer); }

      // ── 판 ──
      g.units.forEach((u, i) => S.setScore(i, u.hp));
      while (g.state !== "over") {
        const i = g.turn, tok = ++turnTok; // 차례 표: 넘기기 덮개 앞에서 올린다(봇 루프가 다음 사람 차례에 끼지 않게)
        UI.canAim = false; aim = Object.assign({}, g.units[i].aim); UI.aim = aim; drawInfo(); drawCtl(); UI.left = TL; drawTime();
        const w = g.wind;
        await S.turn(i, `${w ? `바람 ${w < 0 ? "←" : "→"} ${Math.abs(w)}` : "바람 없음"} · ${g.round > RU.SD ? "바다가 차올라요" : `${g.round} 바퀴`}`);
        if (gen !== games || tok !== turnTok) return;
        let how;
        if (S.isBot(i)) {
          UI.botTurns++;
          await S.botWait(i, "겨누는 중…");
          if (gen !== games || tok !== turnTok) return;
          const plan = E.bot(E.view(g), S.players[i].level, Math.random);
          // 겨누는 모습: 지금 각도·힘에서 계획한 값으로 조금씩(0.5초)
          const a0 = aim.angle, p0 = aim.power, t0 = performance.now(), dur = S.fast || /(^|[#&])fast/.test(hash) ? 120 : 520;
          aim.weapon = plan.weapon; UI.botAiming = true;
          await new Promise<void>((res) => (function mv(now: number) { const q = Math.min(1, (now - t0) / dur); aim.angle = Math.round(a0 + (plan.angle - a0) * q); aim.power = Math.round(p0 + (plan.power - p0) * q); drawCtl(); if (q < 1 && tok === turnTok) requestAnimationFrame(mv); else res(); })(performance.now()));
          UI.botAiming = false;
          if (gen !== games || tok !== turnTok) return;
          S.botDone();
          how = "bot";
        } else {
          S.botDone();
          UI.canAim = true; drawCtl(); startTimer(); drawTime(); coachNext();
          how = await new Promise((res) => (fireRes = res));
          UI.canAim = false; stopTimer(); coachHide(); drawCtl(); drawTime();
        }
        if (gen !== games) return;
        const before = g.units.map((u) => u.alive);
        UI.busy = true;
        const res = E.fire(g, aim)!;
        UI.shots++; UI.lastRes = { booms: res.booms, outs: res.outs, dmg: res.dmg, how };
        await play(res, before);
        UI.busy = false;
        if (gen !== games) return;
        if (g.state === "next") {
          const ev = E.next(g);
          if (ev && ev.rose) {
            // 바다 차오름: 수면을 천천히 올린다
            const w0 = water, t0 = performance.now(); banner("바다가 차올라요!", 1200);
            await new Promise<void>((res2) => (function up(now: number) { const q = Math.min(1, (now - t0) / (SPEED() > 2 ? 150 : 600)); water = w0 + (g.water - w0) * q; if (q < 1) requestAnimationFrame(up); else res2(); })(performance.now()));
            for (const o of ev.outs) outFx(o);
            unitsView.forEach((u, k) => (u.alive = g.units[k].alive));
            g.units.forEach((u, k) => S.setScore(k, u.hp));
            if (ev.outs.length) await new Promise((r2) => setTimeout(r2, SPEED() > 2 ? 250 : 800));
          }
          water = g.water;
        }
      }
      stopTimer(); UI.canAim = false; drawCtl();
      const n = g.n;
      S.end(E.scores(g), { fmt: (s) => (s >= n ? "끝까지 남음" : s === 1 ? "가장 먼저 나감" : `${s}번째로 나감`) });
      setTimeout(() => { if (gen === games) { cancelAnimationFrame(raf); } }, 400);
    },
  });
}
