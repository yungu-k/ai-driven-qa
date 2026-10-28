// 내기 모음 4 「흔들 탑 쌓기」 — 화면(2D 캔버스 탑 쌓기). 규칙·물리는 ./tower.ts(엔진, 화면 모름 — 고정 1/60 초 틱 step(g)), 바깥 틀은 ./shell.ts.
// 시안 docs/lab-party-tower-mock.html(md5 4de0ef51…, 1판 — 봇 자리·아이패드)의 <script> 를 그대로 옮겼다(타입만 붙임). 겉모양은 ./tower.css.
// 규격 docs/lab-party-tower-spec.md. 주소 끝: #reduce · #nocap · #nocoach · #seed=N(엔진 씨앗 고정 — 리그) · #fast(리그: 물리 4배속)
// 리그가 보는 자리: window.__tw(엔진 상태) · window.__twE(엔진 모듈 — 시안의 window.PartyTower) · window.__twlog(놓기가 누구 손에서) · window.__twAim(겨누기 시계) · window.__party(틀).
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as E from "./tower.ts";
import { mount, type PartyShell, type PartyPlayer } from "./shell.ts";

export function initTower() {
  const hash = location.hash;
  const SEED = +((hash.match(/seed=(\d+)/) || [])[1] ?? 0) || ((Math.random() * 1e9) | 0);
  const RIGFAST = /(^|[#&])fast/.test(hash) ? 4 : 1; // #fast: 물리만 4배속(리그). 겨누기는 늘 실제 시간
  let games = 0;
  const INK = "#3a2228", CREAM = "#fffaf2", WOOD = "#c98a55", WOOD2 = "#8e4526", FUR = "#b8643a", FUR2 = "#8e4526";
  // 물건 겉모양(채움·테·무늬) — 사람 색 넷(산호·청록·금·보라)과 겹치지 않는 색으로. 누가 놓았는지는 가운데 작은 표지가 말한다
  const LOOK: Record<string, any> = {
    cookie: { fill: "#d9a35c", dots: "#7a4a1c" }, bone: { fill: "#f6e3c4" }, cushion: { fill: "#9fd3ff", seam: "#4a8fc0" },
    box: { fill: "#d9b27f", tape: "#fffaf2" }, bowl: { fill: "#e85a5a", rim: "#fffaf2" }, ball: { fill: "#fffaf2", stripe: "#e85a5a" }, cheese: { fill: "#ffd36b", hole: "#e0a640" },
  };
  const PIECE = Object.fromEntries(E.PIECES.map((p) => [p.kind, p]));
  // 작은 그림(규칙 카드·다음 물건): 엔진 꼭짓점 그대로 SVG 로
  const pieceSVG = (kind: string, s: number, extra?: string) => {
    const P = PIECE[kind], L = LOOK[kind], pts = P.v.map(([x, y]) => `${(x * s).toFixed(1)},${(-y * s).toFixed(1)}`).join(" ");
    let deco = "";
    if (kind === "bone") deco = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => `<circle cx="${a * 0.6 * s}" cy="${b * 0.08 * s}" r="${0.13 * s}" fill="${L.fill}" stroke="${INK}" stroke-width="2"/>`).join("");
    if (kind === "cookie") deco = [[-0.2, 0.02], [0.12, -0.04], [0.3, 0.05]].map(([a, b]) => `<circle cx="${a * s}" cy="${-b * s}" r="${0.04 * s}" fill="${L.dots}"/>`).join("");
    if (kind === "box") deco = `<rect x="${-0.06 * s}" y="${-0.25 * s}" width="${0.12 * s}" height="${0.5 * s}" fill="${L.tape}" opacity=".85"/>`;
    if (kind === "ball") deco = `<path d="M${-0.28 * s} 0h${0.56 * s}" stroke="${L.stripe}" stroke-width="${0.08 * s}"/>`;
    if (kind === "cheese") deco = `<circle cx="${-0.22 * s}" cy="${0.04 * s}" r="${0.06 * s}" fill="${L.hole}"/><circle cx="${0.08 * s}" cy="${0.08 * s}" r="${0.04 * s}" fill="${L.hole}"/>`;
    if (kind === "bowl") deco = `<path d="M${-0.4 * s} ${-0.14 * s}h${0.8 * s}" stroke="${L.rim}" stroke-width="${0.06 * s}"/>`;
    return `<g ${extra || ""}>${kind === "bone" ? deco : ""}<polygon points="${pts}" fill="${L.fill}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>${kind !== "bone" ? deco : ""}</g>`;
  };
  const coco = (mood: string) => `<g><ellipse cx="-22" cy="4" rx="9" ry="16" fill="${FUR2}"/><ellipse cx="22" cy="4" rx="9" ry="16" fill="${FUR2}"/><circle r="24" fill="${FUR}"/><ellipse cy="8" rx="12" ry="9" fill="#d98a5a"/><ellipse cy="4" rx="4.5" ry="3.4" fill="${INK}"/>${mood === "oops" ? `<circle cx="-9" cy="-4" r="5" fill="#fff"/><circle cx="9" cy="-4" r="5" fill="#fff"/><circle cx="-9" cy="-4" r="2.6" fill="${INK}"/><circle cx="9" cy="-4" r="2.6" fill="${INK}"/><ellipse cy="14" rx="4" ry="4.5" fill="${INK}"/>` : `<circle cx="-9" cy="-3" r="4" fill="${INK}"/><circle cx="9" cy="-3" r="4" fill="${INK}"/><path d="M-4 10q4 3 8 0" stroke="${INK}" stroke-width="2" fill="none"/>`}</g>`;
  const card = (inner: string, bg?: string) => `<svg viewBox="0 0 160 120"><rect width="160" height="120" rx="14" fill="${bg || "#dff1ff"}"/>${inner}</svg>`;
  const table = (x: number, y: number, w: number) => `<rect x="${x - w / 2}" y="${y}" width="${w}" height="8" rx="3" fill="${WOOD}" stroke="${INK}" stroke-width="2"/><path d="M${x - w / 2 + 8} ${y + 8}v18M${x + w / 2 - 8} ${y + 8}v18" stroke="${WOOD2}" stroke-width="4" stroke-linecap="round"/>`;
  const dot = (x: number, y: number, c: string) => `<circle cx="${x}" cy="${y}" r="5" fill="${c}" stroke="#fff" stroke-width="1.5"/>`;
  const finger = (x: number, y: number) => `<g transform="translate(${x} ${y})"><path d="M0 0v-14a4 4 0 0 1 8 0v10l6 1a5 5 0 0 1 4 6l-2 9H2l-6-8a3.5 3.5 0 0 1 5-5z" fill="#ffe0c8" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M-6-20l-4-4M4-24v-6M14-20l4-4" stroke="${INK}" stroke-width="2" stroke-linecap="round"/></g>`;
  const rules = [
    { cap: "흔들릴 때 눌러서 놓아요", svg: card(`<path d="M80 6v18" stroke="${INK}" stroke-width="2"/><g transform="translate(80 34)">${pieceSVG("cookie", 44)}</g><path d="M40 34h-12m0 0 6-5m-6 5 6 5M120 34h12m0 0-6-5m6 5-6 5" stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M80 50v26" stroke="${INK}" stroke-width="2.5" stroke-dasharray="4 4"/><path d="M74 72l6 7 6-7" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>${table(80, 86, 70)}${finger(128, 92)}`) },
    { cap: "번갈아 하나씩 쌓아요", svg: card(`${table(70, 90, 80)}<g transform="translate(70 82)">${pieceSVG("bone", 44)}</g>${dot(70, 82, "#f07a8a")}<g transform="translate(66 64)">${pieceSVG("box", 40)}</g>${dot(66, 64, "#2fb5a8")}<g transform="translate(70 45)">${pieceSVG("cushion", 40)}</g>${dot(70, 45, "#f07a8a")}<g transform="translate(70 18)">${pieceSVG("bowl", 40)}</g><path d="M70 0v10" stroke="${INK}" stroke-width="2"/><circle cx="132" cy="38" r="9" fill="#f07a8a"/><circle cx="132" cy="70" r="9" fill="#2fb5a8"/><path d="M144 42q8 12 0 24M120 66q-8-12 0-24" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`, "#fff4e3") },
    { cap: "무엇이든 상 밖으로 떨어지면 놓은 사람이 와르르", svg: card(`${table(62, 74, 76)}<g transform="translate(58 66)">${pieceSVG("cookie", 44)}</g><g transform="translate(118 92) rotate(40)">${pieceSVG("box", 40)}</g><g transform="translate(104 52) rotate(-25)">${pieceSVG("ball", 40)}</g><path d="M92 40q14-6 22 6M110 64l8 10" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-dasharray="3 4"/><path d="M8 108h144" stroke="${WOOD2}" stroke-width="3"/><circle cx="26" cy="30" r="12" fill="#2fb5a8"/><path d="M18 22l16 16M34 22 18 38" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>`) },
    { cap: "와르르가 가장 많으면 이번 판 꼴찌 — 음료는 부탁해요", svg: card(`${([["#f07a8a", 30, 1], ["#2fb5a8", 62, 3], ["#e0a640", 94, 0]] as [string, number, number][]).map(([c, y, k]) => `<circle cx="24" cy="${y}" r="10" fill="${c}"/>` + Array.from({ length: k }, (_, j) => `<g transform="translate(${50 + j * 18} ${y})"><rect x="-6" y="-2" width="11" height="9" rx="2" fill="#d9b27f" stroke="${INK}" stroke-width="1.8" transform="rotate(-20)"/><rect x="-3" y="-11" width="9" height="7" rx="2" fill="#9fd3ff" stroke="${INK}" stroke-width="1.8" transform="rotate(25)"/></g>`).join("")).join("")}<path d="M50 94h10" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/><g transform="translate(132 60)"><path d="M-16-22h32l-3 40a4 4 0 0 1-4 4h-18a4 4 0 0 1-4-4z" fill="${CREAM}" stroke="#8e4526" stroke-width="2.5"/><path d="M-14-8h28l-2 24h-24z" fill="#ffb38a"/><path d="M6-30-1-22" stroke="#2fb5a8" stroke-width="3" stroke-linecap="round"/><circle cx="-5" cy="2" r="1.8" fill="${INK}"/><circle cx="5" cy="2" r="1.8" fill="${INK}"/><path d="M-4 8q4 3 8 0" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/></g><path d="M112 62h-8m0 0 5-4m-5 4 5 4" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" fill="none"/>`, "#fff4e3") },
  ];

  mount({
    id: "tower", title: "흔들 탑 쌓기", min: 2, max: 4, hidden: false, rules,
    coach: { drop: "흔들릴 때 여기(또는 그림)를 눌러 놓아요" },
    async start(S: PartyShell) {
      const g = E.create(S.players.length, SEED + (games++) * 7919);
      (window as any).__tw = g; // 리그
      (window as any).__twE = E; // 리그: 시안의 window.PartyTower 자리(모듈이라 전역이 없다)
      const twlog: { i: number; by: string; tick: number }[] = ((window as any).__twlog = []); // 리그: 놓기가 누구 손에서 왔나(bot/tap)
      const root = document.getElementById("pt-game")!, $ = (id: string): any => document.getElementById(id);
      root.innerHTML = `<div class="tw"><div class="tw-info"><span id="tw-round"></span><span class="tw-next" id="tw-next"></span><span id="tw-h"></span></div><div class="tw-stage" id="tw-stage"><canvas id="tw-cv" aria-label="탑"></canvas><svg class="tw-tim" id="tw-tim" viewBox="0 0 34 34" aria-hidden="true"></svg><div class="tw-msg" id="tw-msg" aria-live="assertive"></div></div><div class="tw-act"><button class="pt-btn tw-drop" id="tw-drop">놓기!</button><button class="pt-btn" id="tw-next-btn" hidden>다음 판</button></div></div>`;
      const cv: HTMLCanvasElement = $("tw-cv"), ctx: CanvasRenderingContext2D = cv.getContext("2d")!, stage: HTMLElement = $("tw-stage");
      const REDUCE = document.body.classList.contains("reduce");
      // ── 그리기 ──
      const VIEW_W = 4.4; // 화면 폭에 보이는 미터(상 2.6 + 흔들림 여유)
      let cw = 0, ch = 0, dpr = 1, camB = -1.25, mood = "calm";
      function fit() { const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); cw = r.width; ch = r.height; cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
      new ResizeObserver(fit).observe(stage); fit();
      const sc = () => cw / VIEW_W;
      const X = (x: number) => cw / 2 + x * sc(), Y = (y: number) => ch - (y - camB) * sc();
      function poly(b: string, x: number, y: number, a: number) {
        const P = PIECE[b], L = LOOK[b], s = sc();
        ctx.save(); ctx.translate(X(x), Y(y)); ctx.rotate(-a); ctx.scale(s, -s);
        ctx.lineWidth = 0.028; ctx.strokeStyle = INK; ctx.lineJoin = "round";
        if (b === "bone") for (const [i, j] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) { ctx.beginPath(); ctx.arc(i * 0.6, j * 0.08, 0.13, 0, 7); ctx.fillStyle = L.fill; ctx.fill(); ctx.stroke(); }
        ctx.beginPath(); P.v.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath();
        ctx.fillStyle = L.fill; ctx.fill(); ctx.stroke();
        ctx.save(); ctx.clip();
        if (b === "cookie") { ctx.fillStyle = L.dots; for (const [i, j] of [[-0.2, 0.02], [0.12, -0.04], [0.3, 0.05], [-0.32, -0.05]]) { ctx.beginPath(); ctx.arc(i, j, 0.04, 0, 7); ctx.fill(); } }
        if (b === "cushion") { ctx.setLineDash([0.06, 0.05]); ctx.strokeStyle = L.seam; ctx.lineWidth = 0.022; ctx.strokeRect(-0.44, -0.08, 0.88, 0.16); ctx.setLineDash([]); }
        if (b === "box") { ctx.fillStyle = L.tape; ctx.globalAlpha = 0.85; ctx.fillRect(-0.06, -0.25, 0.12, 0.5); ctx.globalAlpha = 1; }
        if (b === "bowl") { ctx.strokeStyle = L.rim; ctx.lineWidth = 0.06; ctx.beginPath(); ctx.moveTo(-0.42, 0.13); ctx.lineTo(0.42, 0.13); ctx.stroke(); }
        if (b === "ball") { ctx.strokeStyle = L.stripe; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.moveTo(-0.3, 0); ctx.lineTo(0.3, 0); ctx.stroke(); }
        if (b === "cheese") { ctx.fillStyle = L.hole; for (const [i, j, r] of [[-0.22, -0.04, 0.06], [0.08, -0.09, 0.04], [-0.3, 0.12, 0.035]]) { ctx.beginPath(); ctx.arc(i, j, r, 0, 7); ctx.fill(); } }
        ctx.restore(); ctx.restore();
      }
      // 누가 놓았나: 사람 색 + 모양(색약 구분 — 틀과 같은 짝)
      function badge(p: PartyPlayer, x: number, y: number) {
        const r = Math.max(7, sc() * 0.085), cx = X(x), cy = Y(y);
        ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, 7); ctx.fillStyle = "#fff"; ctx.fill();
        ctx.fillStyle = p.c; ctx.beginPath();
        if (p.mark === "circle") ctx.arc(cx, cy, r * 0.8, 0, 7);
        else if (p.mark === "tri") { ctx.moveTo(cx, cy - r * 0.9); ctx.lineTo(cx + r * 0.85, cy + r * 0.65); ctx.lineTo(cx - r * 0.85, cy + r * 0.65); }
        else if (p.mark === "square") ctx.rect(cx - r * 0.7, cy - r * 0.7, r * 1.4, r * 1.4);
        else for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.42 : r * 0.95; ctx[k ? "lineTo" : "moveTo"](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill();
      }
      let aimTickF = 0, mode = "idle" as "idle" | "aim" | "botaim" | "fall" | "show";
      (window as any).__twAim = () => ({ tick: aimTickF, mode }); // 리그: 겨누기 시계(틱)
      function draw() {
        if (!cw) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // 카메라: 매달린 물건이 위 1/4 쯤 오게, 바닥은 아래로 1.25 m 까지만
        const top = g.piece ? g.piece.y + 0.9 : E.towerTop(g) + 1.3;
        const want = Math.max(-1.25, top - ch / sc());
        camB = REDUCE || Math.abs(want - camB) > 6 ? want : camB + (want - camB) * 0.08;
        const sky = ctx.createLinearGradient(0, 0, 0, ch); sky.addColorStop(0, "#bfe6ff"); sky.addColorStop(1, "#fff4e3");
        ctx.fillStyle = sky; ctx.fillRect(0, 0, cw, ch);
        // 구름(느린 시차)
        ctx.fillStyle = "rgba(255,255,255,.75)";
        for (const [cx, cy, r] of [[-1.4, 3.2, 0.32], [1.3, 5.6, 0.4], [-0.6, 8.4, 0.36], [1.1, 11, 0.3], [-1.2, 13.6, 0.4]]) { const yy = ch - (cy - camB * 0.6) * sc(); for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.arc(X(cx + k * r * 0.9), yy + (k ? r * 0.25 * sc() : 0), r * sc() * (k ? 0.7 : 1), 0, 7); ctx.fill(); } }
        // 바닥 · 상(받침) · 상 다리
        ctx.fillStyle = "#f2dcb5"; ctx.fillRect(0, Y(E.RULES.FLOOR_Y), cw, ch);
        ctx.fillStyle = "#e3c393"; ctx.fillRect(0, Y(E.RULES.FLOOR_Y), cw, 4);
        ctx.strokeStyle = WOOD2; ctx.lineWidth = sc() * 0.1; ctx.lineCap = "round";
        for (const lx of [-1.05, 1.05]) { ctx.beginPath(); ctx.moveTo(X(lx), Y(-0.3)); ctx.lineTo(X(lx), Y(E.RULES.FLOOR_Y)); ctx.stroke(); }
        const hw = E.RULES.BASE_W / 2;
        ctx.fillStyle = WOOD; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(X(-hw), Y(0), hw * 2 * sc(), 0.3 * sc(), 5); ctx.fill(); ctx.stroke();
        // 코코(바닥 오른쪽에 앉아 올려다본다 — 와르르면 눈이 동그래진다)
        { const cx = X(1.75), cy = Y(E.RULES.FLOOR_Y) - sc() * 0.38, s = sc() / 70; ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); drawCoco(mood); ctx.restore(); }
        // 쌓인 것
        for (const b of g.bodies) if (!b.st && !b.gone) { poly(b.kind, b.x - rot(b).x, b.y - rot(b).y, b.a); }
        for (const b of g.bodies) if (!b.st && !b.gone && S.players[b.owner]) badge(S.players[b.owner], b.x, b.y);
        // 매달린 물건 + 줄 + 떨어질 길(점선)
        if (g.piece && (mode === "aim" || mode === "botaim")) {
          const x = E.aimX(g, aimTickF), y = g.piece.y, P = PIECE[g.piece.kind];
          let yt = -1e9; for (const p of P.v) yt = Math.max(yt, p[1]);
          ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(X(x), 0); ctx.lineTo(X(x), Y(y + yt)); ctx.stroke();
          ctx.setLineDash([5, 6]); ctx.strokeStyle = "rgba(58,34,40,.35)"; ctx.beginPath(); ctx.moveTo(X(x), Y(y - 0.2)); ctx.lineTo(X(x), Y(Math.max(0, E.towerTop(g)))); ctx.stroke(); ctx.setLineDash([]);
          poly(g.piece.kind, x, y, 0);
          badge(S.players[g.turn], x, y + centroidY(g.piece.kind));
        }
      }
      // 몸 자리 = 무게 중심. 그림은 로컬 원점 기준 꼭짓점이라, 무게 중심 → 원점 오프셋을 회전해 뺀다
      const CEN: Record<string, [number, number]> = {};
      function centroidY(kind: string) { return cen(kind)[1]; }
      function cen(kind: string): [number, number] { if (CEN[kind]) return CEN[kind]; const v = PIECE[kind].v; let a = 0, cx = 0, cy = 0; for (let i = 0; i < v.length; i++) { const p = v[i], q = v[(i + 1) % v.length], d = p[0] * q[1] - q[0] * p[1]; a += d; cx += (p[0] + q[0]) * d; cy += (p[1] + q[1]) * d; } return (CEN[kind] = [cx / (3 * a), cy / (3 * a)]); }
      function rot(b: E.Body) { const [ox, oy] = cen(b.kind), c = Math.cos(b.a), s = Math.sin(b.a); return { x: c * ox - s * oy, y: s * ox + c * oy }; }
      function drawCoco(m: string) {
        const e = (x: number, y: number, rx: number, ry: number, f: string) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fillStyle = f; ctx.fill(); };
        e(-22, 4, 9, 16, FUR2); e(22, 4, 9, 16, FUR2); e(0, 0, 24, 24, FUR); e(0, 8, 12, 9, "#d98a5a"); e(0, 4, 4.5, 3.4, INK);
        if (m === "oops") { e(-9, -4, 5, 5, "#fff"); e(9, -4, 5, 5, "#fff"); e(-9, -5, 2.6, 2.6, INK); e(9, -5, 2.6, 2.6, INK); e(0, 14, 4, 4.5, INK); }
        else { e(-9, -4, 4, 4, INK); e(9, -4, 4, 4, INK); ctx.beginPath(); ctx.moveTo(-4, 11); ctx.quadraticCurveTo(0, 14, 4, 11); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); }
      }
      // ── 고정 틱 루프: 겨누기는 실제 시간(사람 박자), 물리는 1/60 초 틱을 화면 시간만큼(빨리 감기면 여러 배) ──
      let acc = 0, last = 0, onTick: ((r: E.TurnResult | null) => void) | null = null;
      const physSpeed = () => RIGFAST * (S.fast ? 3 : 1);
      // 판정이 나면 그 틱에서 멈춘다(다시 돌린 엔진과 같은 판이 되게 — 한 화면에 여러 틱을 돌릴 때 판정 뒤 틱이 더 돌면 리그의 다시 돌리기와 어긋난다)
      function frame(now: number) {
        requestAnimationFrame(frame);
        const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
        if (!S.paused && !document.hidden) {
          if (mode === "aim" || mode === "botaim") { aimTickF += dt * 60 * (mode === "botaim" && S.fast ? 3 : 1); }
          if (mode === "fall" || mode === "show") { acc += dt * 60 * physSpeed(); let k = 0; while (acc >= 1 && k++ < 24 && (mode === "show" || g.state === "fall")) { acc -= 1; const r = E.step(g); if (r && onTick) onTick(r); } }
          if (onTick && (mode === "aim" || mode === "botaim")) onTick(null);
        }
        drawTimer(); draw();
      }
      requestAnimationFrame(frame);
      function drawTimer() {
        const el = $("tw-tim");
        if (mode !== "aim" && mode !== "botaim") { if (el.innerHTML) el.innerHTML = ""; return; }
        const left = Math.max(0, 1 - aimTickF / E.RULES.AIM_CAP), a = left * Math.PI * 2;
        el.innerHTML = `<circle cx="17" cy="17" r="14" fill="#fffaf2" stroke="${"#ecd3a6"}" stroke-width="3"/><path d="M17 17V3A14 14 0 ${a > Math.PI ? 1 : 0} 1 ${(17 + 14 * Math.sin(a)).toFixed(2)} ${(17 - 14 * Math.cos(a)).toFixed(2)}z" fill="${left < 0.25 ? "#f07a8a" : "#2fb5a8"}"/>`;
      }
      const wait = (ms: number) => new Promise((r) => setTimeout(r, REDUCE ? Math.min(ms, 300) : ms / (RIGFAST > 1 ? 3 : 1) / (S.fast ? 3 : 1)));
      function info() {
        $("tw-round").textContent = `${g.round} / ${g.rounds} 판`;
        $("tw-next").innerHTML = g.next ? `다음 <svg viewBox="-34 -22 68 44" aria-label="다음 물건 ${PIECE[g.next].name}">${pieceSVG(g.next, 44)}</svg>` : "";
        $("tw-h").textContent = `쌓은 것 ${g.stack}`;
      }
      // 놓기 단추·놀이판 누르기 — 단추는 한 번만 만들고 처리기만 바꾼다(연타 끊김 막기)
      let onDrop: ((by: "tap" | "cap" | number) => void) | null = null;
      $("tw-drop").onclick = () => onDrop && onDrop("tap");
      stage.addEventListener("pointerdown", () => onDrop && onDrop("tap"));
      let onNext: (() => void) | null = null; $("tw-next-btn").onclick = () => { const f = onNext; onNext = null; f && f(); };
      let turnTok = 0;
      const msg = (h: string, s?: string) => { $("tw-msg").innerHTML = h ? `${h}${s ? `<small>${s}</small>` : ""}` : ""; };

      while (g.state !== "over") {
        E.startRound(g); mood = "calm"; info(); msg(`${g.round}판 시작`, "상 위에 하나씩 쌓아요");
        while (g.state === "turn") {
          const i = g.turn, tok = ++turnTok; // 차례 표는 넘기기 덮개보다 먼저 올린다(앞 봇 루프가 다음 사람 차례에 손대지 못하게)
          onDrop = null; mode = "idle";
          await S.turn(i, g.stack ? `탑에 ${g.stack}개 — 조심조심` : `${g.round}판 — 첫 물건`);
          E.beginTurn(g); info(); msg("");
          aimTickF = 0;
          const bot = S.isBot(i);
          $("tw-drop").disabled = bot; stage.classList.toggle("off", bot);
          // 놓기 → 판정까지 기다린다
          const res = await new Promise<E.TurnResult>((resolve) => {
            const go = (by: "tap" | "cap" | number) => {
              if (tok !== turnTok || g.state !== "aim") return;
              if (by === "tap" && S.isBot(i)) return; // 봇 차례엔 사람 손이 안 닿는다
              const t = Math.floor(by === "tap" || by === "cap" ? aimTickF : (by as number));
              twlog.push({ i, by: typeof by === "number" ? "bot" : by, tick: t });
              onDrop = null; E.drop(g, t); S.sfx("tap"); mode = "fall"; acc = 0;
              if (!bot) S.coachDone("drop");
              $("tw-drop").disabled = true; stage.classList.add("off");
              msg("흔들흔들…");
              onTick = (r) => { if (r) { onTick = null; resolve(r); } };
            };
            onTick = () => { if (aimTickF >= E.RULES.AIM_CAP) go("cap"); }; // 9 초 지나면 저절로
            if (bot) {
              mode = "botaim";
              (async () => {
                await S.botWait(i, "겨누는 중…");
                if (tok !== turnTok) return;
                const plan = E.bot(E.view(g), S.players[i].level, Math.random, Math.floor(aimTickF));
                while (tok === turnTok && g.state === "aim" && aimTickF < plan.tick) await new Promise((r) => setTimeout(r, 16));
                if (tok === turnTok && g.state === "aim") go(Math.max(plan.tick, Math.floor(aimTickF)));
              })();
            } else {
              S.botDone(); mode = "aim";
              onDrop = go;
              S.coach("drop", $("tw-drop"));
            }
          });
          if (bot) S.botDone();
          E.endTurn(g);
          if (!res.lost) {
            S.sfx("ok"); msg(res.capped ? "아슬아슬 버텼어요" : "버텼어요!", `${S.players[i].name} 높이 +${Math.round(E.towerTop(g) * 10)}`); info();
            mode = "idle"; await wait(700); // 멈춘 탑은 더 돌리지 않는다(엔진 상태가 화면 시간에 따라 달라지지 않게 — 같은 놓기 틱이면 같은 판)
            continue;
          }
          // 와르르: 놓은 사람 +1, 판 끝 — 물리는 조금 더 돌려 무너지는 모습을 보인다(판정은 이미 났다)
          const p = S.players[res.by];
          mode = "show"; mood = "oops"; S.sfx("bad"); S.buzz([80, 40, 120]);
          S.setScore(res.by, g.losses[res.by]);
          msg(`와르르! ${p.name}`, res.others ? `탑에서 ${res.fell.length}개가 떨어졌어요 — 코코가 주워 갈게요` : `상 밖으로 떨어졌어요 — 코코가 주워 갈게요`);
          await wait(1600);
          $("tw-drop").hidden = true; $("tw-next-btn").hidden = false;
          $("tw-next-btn").textContent = (g.state as E.TowerState) === "over" ? "결과 보기" : "다음 판";
          await new Promise<void>((r) => (onNext = r));
          $("tw-drop").hidden = false; $("tw-next-btn").hidden = true;
        }
      }
      mode = "idle";
      S.end(E.finalScores(g), { lowWins: true, fmt: (v: number) => { const u = E.unpack(v); return `와르르 ${u.losses}번 · 높이 ${u.hpts}`; } }); // 와르르가 같으면 높이 점수가 많은 사람이 위
    },
  });
}
