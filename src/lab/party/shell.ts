// 실험실 「내기 모음」 공통 틀 — 인원 설정 · 넘기기 화면 · 가이드 4층 · 결과 화면 · 이 기기 전적. 규격 docs/lab-party-spec.md(2판, 봇·아이패드).
// 시안 docs/lab-party-shell.js(md5 a09715b0…)를 그대로 옮긴 판 — 동작은 바꾸지 않고 타입만 붙였다. 바꾼 곳은 한 줄:
//   「돌아가기」 주소 ../lab/ → /lab/ (시안은 docs/ 옆 파일이라 상대 주소였다. /lab/<slug>/ 에선 /lab/lab/ 이 된다)
// 게임은 규칙 엔진(src/lab/party/<game>.ts, 화면 모름)과 화면(<game>-game.ts)을 따로 두고, 화면이 이 틀을 부른다:
//   const S = mount({ id, title, min, max, hidden, rules, coach, start(S) });
//   start(S) 안에서 S.players 로 판을 차리고, 차례마다 await S.turn(i) → 그리기 → … → S.end(scores, { lowWins })
// 페이지는 <div id="pt-app"><div id="pt-game"></div></div> 를 두고 ./shell.css 를 읽는다(새 게임 옮기는 법: docs/lab-party-port-recipe.md).
// 서버·랭킹 없음. 저장은 이 기기 localStorage 뿐(이름·전적) — 깨져도 판은 돌아간다(try/catch).
// 리그가 보는 자리: window.__party(= S, S.log 에 turn/open/end 기록).
/* eslint-disable @typescript-eslint/no-explicit-any */

export type Mark = "circle" | "tri" | "square" | "star";
export type PartyColor = { c: string; ink: string; mark: Mark; word: string };
export type BotLevel = "easy" | "normal";
export type Sfx = "tap" | "ok" | "bad" | "turn" | "end";
export type PartyPlayer = { i: number; name: string; c: string; ink: string; mark: Mark; score: number; bot: boolean; level: BotLevel };
export type PartyOpts = { sound: boolean; vib: boolean; quick: boolean };
export type EndOpts = { lowWins?: boolean; fmt?: (s: number) => string };
export type RuleCard = { svg: string; cap?: string };
type SavedPlayers = { n: number; names: string[]; order: number[]; bots: boolean[]; level: BotLevel };

/** 게임이 틀에 넘기는 것 */
export type PartyGameDef = {
  /** 저장 키 이름(lab.party.seen.<id>, lab.party.record.<id>) */
  id: string;
  title: string;
  min: number;
  max: number;
  /** 숨은 정보 게임(2·5·7)은 true — 넘기기에 「열기」 필수 */
  hidden?: boolean;
  /** 규칙 카드 3–5장(그림 + 한 줄) */
  rules: RuleCard[];
  /** 첫 판 조작 말풍선 문구(key → 문구) */
  coach?: Record<string, string>;
  /** 판 하나. 한 판 더 · 사람 바꾸기 때 다시 불린다 */
  start(S: PartyShell): void | Promise<void>;
};

/** 틀이 게임에 주는 것(S) */
export type PartyShell = {
  players: PartyPlayer[];
  humans: number;
  hidden: boolean;
  opts: PartyOpts;
  store: typeof store;
  markSVG: typeof markSVG;
  COLORS: PartyColor[];
  log: any[];
  /** 규칙 카드가 열린 동안 참(시간 제한 게임은 이때 시계를 세운다) */
  paused?: boolean;
  started?: boolean;
  /** 「빨리 ▶▶」 — 이 판 끝까지 봇 0.12초 */
  fast: boolean;
  /** 리그: 숨은 정보 게임이 넘기기 화면에 비치면 안 되는 값을 둔다 */
  secret?: unknown;
  sfx(kind: Sfx): void;
  buzz(ms: number | number[]): void;
  setScore(i: number, v: number): void;
  setNow(i: number): void;
  showRules(): Promise<void>;
  closeHand(): void;
  /** 차례 i 를 연다(넘기기 덮개 → 열림). 봇 차례·사람 하나뿐이면 덮개 없이 바로 */
  turn(i: number, note?: string): Promise<void>;
  isBot(i: number): boolean;
  /** 봇 차례 「○○(봇) 생각 중…」 0.6–1.2초 */
  botWait(i: number, what?: string): Promise<void>;
  botDone(): void;
  coach(key: string, el: Element, text?: string | null, o?: { below?: boolean }): void;
  coachDone(key: string | null | undefined, keep?: boolean): void;
  end(scores: number[], o?: EndOpts): void;
};

export const COLORS: PartyColor[] = [
  { c: "#f07a8a", ink: "#a8344a", mark: "circle", word: "동그라미" },
  { c: "#2fb5a8", ink: "#15665f", mark: "tri", word: "세모" },
  { c: "#e0a640", ink: "#7a4e0a", mark: "square", word: "네모" },
  { c: "#8b5cd6", ink: "#5a3196", mark: "star", word: "별" },
];
// 모양 표지: 색약이어도 사람을 가른다(색 + 모양 한 짝)
export function markSVG(kind: Mark, fill?: string): string {
  const f = fill || "currentColor";
  const body = ({
    circle: `<circle cx="12" cy="12" r="8.5" fill="${f}"/>`,
    tri: `<path d="M12 3.5 21 19.5H3z" fill="${f}" stroke-linejoin="round"/>`,
    square: `<rect x="4" y="4" width="16" height="16" rx="3" fill="${f}"/>`,
    star: `<path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6 6.6 19.5l1.1-6.1L3.2 9.2l6.1-.8z" fill="${f}"/>`,
  } as Record<Mark, string>)[kind];
  return `<svg class="pt-mark" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
}
const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k: string, v: unknown): void { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 사생활 창·막힌 저장소: 기억만 못 한다 */ } },
};
const PERSON_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c0-4.5 3.6-7 8-7s8 2.5 8 7z" fill="currentColor"/></svg>';
const BOT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="7" width="16" height="12" rx="4" fill="currentColor"/><circle cx="9" cy="13" r="1.8" fill="#fffaf2"/><circle cx="15" cy="13" r="1.8" fill="#fffaf2"/><path d="M12 7V3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="3" r="1.6" fill="currentColor"/></svg>';
const esc = (s: unknown): string => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as Record<string, string>)[ch]);
const $ = (id: string): any => document.getElementById(id);

export function mount(G: PartyGameDef): PartyShell {
  const hash = location.hash;
  const REDUCE = /reduce/.test(hash) || matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (REDUCE) document.body.classList.add("reduce");
  if (/nocap/.test(hash)) document.body.classList.add("pt-nocap");
  const opts: PartyOpts = Object.assign({ sound: true, vib: true, quick: true }, store.get("lab.party.opts", {}));
  const saved = store.get<SavedPlayers | null>("lab.party.players", null);
  let n = Math.min(G.max, Math.max(G.min, (saved && saved.n) || 2));
  let names: string[] = (saved && saved.names) || ["1P", "2P", "3P", "4P"];
  let order: number[] = (saved && saved.order) || [0, 1, 2, 3]; // 사람 i 의 색 번호
  let bots: boolean[] = (saved && saved.bots) || [false, false, false, false]; // 자리마다 봇인가(2판 — 혼자 연습)
  let level: BotLevel = (saved && saved.level) || "normal"; // 봇 세기: easy(연습) · normal(보통)
  const S = { players: [], hidden: !!G.hidden, opts, store, markSVG, COLORS, log: [] } as unknown as PartyShell;
  (window as any).__party = S; // 리그가 보는 자리

  // ── 넓은 화면(아이패드 세로 820×1180·1024×1366, 가로 1180×820): 휴대폰 띠만 쓰지 않는다 ──
  // 700 px 이상이면 앱 전체를 확대(zoom)해 세로 460×820 짜리 「큰 휴대폰」 으로 채우고, 가로로 넓으면 왼쪽 칸(점수·차례)과 오른쪽 놀이판으로 가른다.
  // 게임은 360 기준으로만 그리면 된다(크기는 틀이 맞춘다).
  function fitWide() {
    const w = innerWidth, h = innerHeight, wide = w >= 700, land = wide && w > h * 1.15;
    const z = !wide ? 1 : land ? Math.min(h / 760, w / 800) : Math.min(w / 460, h / 820);
    document.documentElement.style.setProperty("--pt-z", z.toFixed(3));
    document.body.classList.toggle("pt-wide", wide); document.body.classList.toggle("pt-land", land);
  }
  fitWide(); addEventListener("resize", fitWide);

  // ── 틀 DOM ──
  const app = $("pt-app");
  app.insertAdjacentHTML("afterbegin", `
    <div class="pt-top">
      <button class="pt-icon" id="pt-back" aria-label="실험실로"><svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <h1>${esc(G.title)}</h1>
      <button class="pt-icon" id="pt-help" aria-label="규칙 다시 보기">?</button>
      <button class="pt-icon" id="pt-snd" aria-label="소리·진동"></button>
    </div>
    <div class="pt-turns" id="pt-turns" aria-live="polite"></div>`);
  document.body.insertAdjacentHTML("beforeend", `
    <div class="pt-over" id="pt-setup" role="dialog" aria-modal="true" aria-labelledby="pt-setup-h"><div class="pt-box">
      <h2 id="pt-setup-h">${esc(G.title)}</h2><p>몇 명이 해요?</p>
      <div class="pt-count" id="pt-count" role="group" aria-label="인원"></div>
      <div id="pt-rows"></div>
      <div class="pt-level" id="pt-level" role="group" aria-label="봇 세기"><span>봇 세기</span><button data-l="easy">연습</button><button data-l="normal">보통</button></div>
      <div class="pt-opts">
        <label><input type="checkbox" id="pt-o-quick"> 숨은 것 없는 게임은 넘길 때 잠깐만 알림</label>
        <label><input type="checkbox" id="pt-o-sound"> 소리</label>
        <label><input type="checkbox" id="pt-o-vib"> 진동</label>
      </div>
      <button class="pt-btn" id="pt-rules-go">규칙 보고 시작</button>
    </div></div>
    <div class="pt-over" id="pt-rules" role="dialog" aria-modal="true" aria-label="규칙"><div class="pt-box">
      <h2>규칙 30초</h2>
      <div class="pt-cards"><div class="pt-track" id="pt-track"></div></div>
      <div class="pt-dots" id="pt-dots"></div>
      <div class="pt-nav"><button class="pt-btn ghost" id="pt-prev">이전</button><button class="pt-btn" id="pt-next">다음</button></div>
    </div></div>
    <div class="pt-over" id="pt-hand" role="dialog" aria-modal="true" aria-labelledby="pt-hand-h">
      <div class="pt-big" id="pt-hand-mark"></div>
      <h2 id="pt-hand-h"></h2><p id="pt-hand-p"></p>
      <svg class="pt-hand-art" viewBox="0 0 160 70" aria-hidden="true"><g class="phone"><rect x="62" y="6" width="36" height="58" rx="7" fill="#fffaf2"/><rect x="67" y="13" width="26" height="40" rx="3" fill="rgba(58,34,40,.18)"/></g></svg>
      <button class="pt-btn" id="pt-open"></button>
      <div class="pt-hint" id="pt-hand-hint"></div>
    </div>
    <div class="pt-over" id="pt-end" role="dialog" aria-modal="true" aria-labelledby="pt-end-h"><div class="pt-box">
      <h2 id="pt-end-h">판 끝!</h2>
      <div class="pt-last" id="pt-last"></div>
      <ol class="pt-rank" id="pt-rank"></ol>
      <div class="pt-rec" id="pt-rec"></div>
      <div class="pt-acts"><button class="pt-btn" id="pt-again">한 판 더</button><button class="pt-btn ghost" id="pt-who">사람 바꾸기</button></div>
    </div></div>`);
  const sndIcon = () => { $("pt-snd").innerHTML = opts.sound ? '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="m16 9 6 6m0-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'; $("pt-snd").setAttribute("aria-pressed", String(opts.sound)); };
  sndIcon();
  $("pt-snd").onclick = () => { opts.sound = !opts.sound; opts.vib = opts.sound; store.set("lab.party.opts", opts); sndIcon(); };
  $("pt-back").onclick = () => { location.href = "/lab/"; }; // 시안은 docs/ 옆 상대 주소(../lab/) — 페이지 /lab/<slug>/ 에선 절대 주소

  // ── 소리·진동(끔 존중) ──
  let actx: AudioContext | null = null;
  S.sfx = function (kind: Sfx) {
    if (!opts.sound) return;
    try {
      actx = actx || new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = actx.createOscillator(), gn = actx.createGain(), t = actx.currentTime;
      const f = ({ tap: 660, ok: 880, bad: 220, turn: 520, end: 990 } as Record<string, number>)[kind] || 600;
      o.frequency.setValueAtTime(f, t); o.type = "triangle"; gn.gain.setValueAtTime(0.08, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(gn).connect(actx.destination); o.start(t); o.stop(t + 0.2);
    } catch (e) { /* 소리 못 내도 판은 간다 */ }
  };
  S.buzz = function (ms: number | number[]) { if (opts.vib && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} };

  // ── 설정 ──
  function drawSetup() {
    $("pt-count").innerHTML = "";
    for (let k = G.min; k <= G.max; k++) { const b = document.createElement("button"); b.textContent = k + "명"; b.setAttribute("aria-pressed", String(k === n)); b.onclick = () => { n = k; drawSetup(); }; $("pt-count").appendChild(b); }
    $("pt-rows").innerHTML = "";
    for (let i = 0; i < n; i++) {
      const C = COLORS[order[i]], row = document.createElement("div");
      row.className = "pt-row"; row.style.setProperty("--c", C.c);
      row.innerHTML = `<button class="pt-swatch" aria-label="${i + 1}번째 자리 색 바꾸기 — 지금 ${C.word}" style="--c:${C.c}">${markSVG(C.mark, "#fff")}</button><input maxlength="8" aria-label="${i + 1}번째 자리 이름" value="${esc(names[i])}"><button class="pt-kind" aria-pressed="${!!bots[i]}" aria-label="${i + 1}번째 자리 ${bots[i] ? "봇" : "사람"} — 눌러서 바꾸기">${bots[i] ? BOT_SVG + "봇" : PERSON_SVG + "사람"}</button>`;
      (row.querySelector(".pt-kind") as HTMLButtonElement).onclick = () => {
        bots[i] = !bots[i];
        if (bots[i] && /^\d+P$/.test(names[i])) names[i] = `봇${i + 1}`; else if (!bots[i] && /^봇\d$/.test(names[i])) names[i] = `${i + 1}P`;
        drawSetup();
      };
      row.querySelector("input")!.oninput = (e: Event) => { names[i] = (e.target as HTMLInputElement).value; };
      // 색 바꾸기: 다른 사람이 쓰는 색과 맞바꾼다(넷이 늘 다른 색)
      row.querySelector("button")!.onclick = () => { const next = (order[i] + 1) % 4, j = order.indexOf(next); order[j] = order[i]; order[i] = next; drawSetup(); };
      $("pt-rows").appendChild(row);
    }
    const anyBot = bots.slice(0, n).some(Boolean), humans = bots.slice(0, n).filter((b) => !b).length;
    $("pt-level").style.display = anyBot ? "" : "none";
    $("pt-level").querySelectorAll("button").forEach((b: HTMLButtonElement) => { b.setAttribute("aria-pressed", String(b.dataset.l === level)); b.onclick = () => { level = b.dataset.l as BotLevel; drawSetup(); }; });
    $("pt-rules-go").disabled = humans === 0; // 사람이 하나는 있어야 한다(봇끼리 구경은 없음)
    $("pt-rules-go").textContent = humans === 0 ? "사람이 한 명은 있어야 해요" : "규칙 보고 시작";
    $("pt-o-quick").checked = opts.quick; $("pt-o-sound").checked = opts.sound; $("pt-o-vib").checked = opts.vib;
    $("pt-o-quick").closest("label").style.display = G.hidden ? "none" : ""; // 숨은 정보 게임은 늘 눌러서 연다(끌 수 없음)
  }
  function commitPlayers() {
    opts.quick = $("pt-o-quick").checked; opts.sound = $("pt-o-sound").checked; opts.vib = $("pt-o-vib").checked; sndIcon();
    S.players = [];
    for (let i = 0; i < n; i++) { const C = COLORS[order[i]]; S.players.push({ i, name: (names[i] || "").trim() || `${i + 1}P`, c: C.c, ink: C.ink, mark: C.mark, score: 0, bot: !!bots[i], level }); }
    S.humans = S.players.filter((p) => !p.bot).length;
    S.fast = false;
    store.set("lab.party.players", { n, names, order, bots, level });
    store.set("lab.party.opts", opts);
    drawChips();
  }
  function drawChips() {
    $("pt-turns").className = "pt-turns n" + S.players.length;
    $("pt-turns").innerHTML = S.players.map((p) => `<div class="pt-chip" id="pt-chip-${p.i}" style="--c:${p.c}">${markSVG(p.mark, p.c)}<b>${esc(p.name)}</b>${p.bot ? '<span class="pt-botb" aria-label="봇">봇</span>' : ""}<span class="pt-sc">${p.score}</span></div>`).join("");
  }
  S.setScore = function (i: number, v: number) { S.players[i].score = v; const el = document.querySelector(`#pt-chip-${i} .pt-sc`); if (el) el.textContent = String(v); };
  S.setNow = function (i: number) { document.querySelectorAll(".pt-chip").forEach((el, k) => el.classList.toggle("now", k === i)); };

  // ── 규칙 카드(가이드 ①·③): 그림 카드 넘겨 보기 ──
  let ri = 0, rulesDone: (() => void) | null = null;
  function drawRules() {
    $("pt-track").innerHTML = G.rules.map((r) => `<div class="pt-card"><div aria-hidden="true">${r.svg}</div><p class="pt-cap">${esc(r.cap || "")}</p></div>`).join("");
    $("pt-dots").innerHTML = G.rules.map(() => "<i></i>").join("");
    showRule(0);
  }
  function showRule(k: number) {
    ri = Math.max(0, Math.min(G.rules.length - 1, k));
    $("pt-track").style.transform = `translateX(${-100 * ri}%)`;
    $("pt-dots").querySelectorAll("i").forEach((d: Element, j: number) => d.classList.toggle("on", j === ri));
    $("pt-prev").disabled = ri === 0;
    $("pt-next").textContent = ri === G.rules.length - 1 ? (S.started ? "계속하기" : "시작!") : "다음";
  }
  $("pt-prev").onclick = () => showRule(ri - 1);
  $("pt-next").onclick = () => { if (ri < G.rules.length - 1) showRule(ri + 1); else { $("pt-rules").classList.remove("on"); S.paused = false; const f = rulesDone; rulesDone = null; if (f) f(); } };
  // 밀어 넘기기
  { let x0: number | null = null; const el = $("pt-track"); el.addEventListener("pointerdown", (e: PointerEvent) => { x0 = e.clientX; }); el.addEventListener("pointerup", (e: PointerEvent) => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) showRule(ri + (dx < 0 ? 1 : -1)); }); }
  S.showRules = function () { return new Promise<void>((res) => { S.paused = true; rulesDone = res; drawRules(); $("pt-rules").classList.add("on"); }); };
  $("pt-help").onclick = () => { if (!$("pt-hand").classList.contains("on")) S.showRules(); }; // 넘기기 화면 위에선 안 연다(숨은 정보)

  // ── 넘기기(차례 바꿈) ──
  let closeHand: (() => void) | null = null;
  // 게임 쪽에서 덮개를 닫는다(시간이 도는 게임 — 넘기는 사이 초인종이 울리면). 열려 있지 않으면 아무것도 안 한다
  S.closeHand = function () { if (closeHand) closeHand(); };
  // 숨은 정보 게임: 받은 사람이 「열기」 를 눌러야 열린다. 그 전엔 게임 층을 아예 안 그린다(body.pt-handing).
  // 숨은 것 없는 게임: 짧은 알림 — 1.2초 뒤 저절로(누르면 바로), 설정에서 끄면 알림 없이 바로.
  S.turn = function (i: number, note?: string) {
    const p = S.players[i];
    S.setNow(i);
    S.sfx("turn"); S.buzz(30);
    S.log.push({ e: "turn", i });
    // 봇 차례는 덮개 없이 「생각 중…」 띠(S.botWait 가 띄운다). 사람이 하나뿐이면 넘길 사람이 없으니 덮개도 없다
    if (p.bot || S.humans <= 1) { S.log.push({ e: "open", i, skip: p.bot ? "bot" : "solo" }); return Promise.resolve(); }
    const need = S.hidden;
    if (!need && !opts.quick && S.players.length > 1) return Promise.resolve();
    return new Promise<void>((res) => {
      const H = $("pt-hand");
      H.style.setProperty("--c", p.ink); // 덮개 바탕은 진한 짝(흰 글자 대비 ≥ 6.4) — 밝은 색 바탕은 흰 글자가 2.6 이었다
      $("pt-hand-mark").innerHTML = markSVG(p.mark, p.c);
      $("pt-hand-h").textContent = `${p.name} 차례예요`;
      $("pt-hand-p").textContent = note || (need ? "폰을 넘겨 주세요 · 다른 사람은 보지 마세요" : "폰을 넘겨 주세요");
      $("pt-open").textContent = need ? `내가 ${p.name} — 열기` : "바로 시작";
      $("pt-hand-hint").textContent = need ? "누르기 전엔 화면이 안 보여요" : "잠깐 뒤 저절로 열려요";
      document.body.classList.add("pt-handing");
      H.classList.add("on");
      let t: ReturnType<typeof setTimeout> | undefined;
      const open = () => { clearTimeout(t); H.classList.remove("on"); document.body.classList.remove("pt-handing"); S.log.push({ e: "open", i }); closeHand = null; res(); };
      closeHand = open;
      $("pt-open").onclick = open;
      if (!need) t = setTimeout(open, 1200);
    });
  };

  // ── 봇 차례: 「○○(봇) 생각 중…」 0.6–1.2초 뒤 한 수. 「빨리」 를 누르면 이 판 끝까지 0.12초 ──
  document.body.insertAdjacentHTML("beforeend", `<div class="pt-think" id="pt-think" aria-live="polite"><span id="pt-think-t"></span><button class="pt-btn ghost" id="pt-fast">빨리 ▶▶</button></div>`);
  $("pt-fast").onclick = () => { S.fast = true; $("pt-think").classList.add("fast"); };
  S.isBot = (i: number) => !!(S.players[i] && S.players[i].bot);
  S.botWait = function (i: number, what?: string) {
    const p = S.players[i];
    $("pt-think-t").textContent = `${p.name}(봇) ${what || "생각 중…"}`;
    $("pt-think").style.setProperty("--c", p.c);
    $("pt-think").classList.add("on");
    const ms = S.fast || /botfast/.test(hash) ? 120 : 600 + Math.random() * 600;
    return new Promise<void>((res) => setTimeout(() => { res(); }, ms));
  };
  S.botDone = function () { $("pt-think").classList.remove("on"); };

  // ── 조작 말풍선(가이드 ②): 이 기기에서 그 게임 첫 판에만. 그 조작을 하면 S.coachDone(key) ──
  const seen = store.get<Record<string, number>>("lab.party.seen." + G.id, {});
  let bubble: HTMLDivElement | null = null, bubbleKey: string | null = null;
  S.coach = function (key: string, el: Element, text?: string | null, o?: { below?: boolean }) { // o.below: 아래에 띄운다(위에 꼭 봐야 할 숫자·문구가 있을 때)
    if (seen[key] || /nocoach/.test(hash)) return;
    S.coachDone(bubbleKey, true);
    const g = $("pt-game"), r = el.getBoundingClientRect(), gr = g.getBoundingClientRect();
    bubble = document.createElement("div"); bubble.className = "pt-coach"; bubble.textContent = text || (G.coach && G.coach[key]) || ""; bubble.setAttribute("role", "status");
    g.appendChild(bubble);
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight, cx = r.left - gr.left + r.width / 2;
    const left = Math.max(0, Math.min(gr.width - bw, cx - bw / 2));
    const above = !(o && o.below) && r.top - gr.top - bh - 12 >= 0;
    bubble!.style.left = left + "px"; bubble.style.top = (above ? r.top - gr.top - bh - 12 : r.bottom - gr.top + 12) + "px";
    bubble!.style.setProperty("--ax", cx - left + "px"); if (!above) bubble!.classList.add("below");
    bubbleKey = key;
  };
  S.coachDone = function (key: string | null | undefined, keep?: boolean) {
    if (!key || key !== bubbleKey) return;
    if (bubble) bubble.remove(); bubble = null; bubbleKey = null;
    if (!keep) { seen[key] = 1; store.set("lab.party.seen." + G.id, seen); }
  };

  // ── 결과(꼴찌 강조 · 이 기기 전적) ──
  S.end = function (scores: number[], o?: EndOpts) {
    o = o || {};
    S.coachDone(bubbleKey, true);
    const lowWins = !!o.lowWins;
    const rows: { p: PartyPlayer; s: number; rank?: number }[] = S.players.map((p, k) => ({ p, s: scores[k] })).sort((a, b) => (lowWins ? a.s - b.s : b.s - a.s));
    // 같은 점수는 같은 등수. 꼴찌는 맨 아래 점수 — 여럿이면 다 같이(가위바위보로 정하라는 한 줄)
    let rank = 0, prev: number | null = null;
    rows.forEach((r, k) => { if (r.s !== prev) { rank = k + 1; prev = r.s; } r.rank = rank; });
    const lastS = rows[rows.length - 1].s, lasts = rows.filter((r) => r.s === lastS && rows.length > 1 && rows[0].s !== lastS);
    const fmt = o.fmt;
    $("pt-rank").innerHTML = rows.map((r) => `<li class="${lasts.includes(r) ? "last" : ""}" style="--c:${r.p.c}"><span class="pt-no">${r.rank}</span>${markSVG(r.p.mark, r.p.c)}<b>${esc(r.p.name)}</b>${r.p.bot ? '<span class="pt-botb">봇</span>' : ""}<span class="pt-sc">${fmt ? fmt(r.s) : r.s}</span></li>`).join("");
    S.botDone();
    const cup = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 18h28l-3 34a4 4 0 0 1-4 4H25a4 4 0 0 1-4-4z" fill="#fffaf2" stroke="#8e4526" stroke-width="2.5"/><path d="M19.5 30h25l-1.6 20H21.1z" fill="#ffb38a"/><path d="M40 10 34 18" stroke="#2fb5a8" stroke-width="3" stroke-linecap="round"/><circle cx="27" cy="40" r="2" fill="#3a2228"/><circle cx="37" cy="40" r="2" fill="#3a2228"/><path d="M28 46q4 3 8 0" stroke="#3a2228" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
    $("pt-last").innerHTML = lasts.length
      ? `${cup}<strong>이번 판 꼴찌: ${lasts.map((r) => esc(r.p.name) + (r.p.bot ? "(봇)" : "")).join(" · ")}</strong><p>${lasts.every((r) => r.p.bot) ? "봇이 음료를 산대요 — 기분만요" : lasts.length > 1 ? "둘 이상이면 가위바위보로! — 음료는 부탁해요" : "다음 판엔 꼭 이길 거예요 — 음료는 부탁해요"}</p>`
      : `<strong>모두 같은 점수 — 비겼어요!</strong>`;
    // 전적: 이름별 1등·꼴찌 수(이 기기 안에서만)
    const rec = store.get<Record<string, { win: number; last: number; play: number }>>("lab.party.record." + G.id, {});
    for (const r of rows) { const k = r.p.name + (r.p.bot ? "(봇)" : ""); rec[k] = rec[k] || { win: 0, last: 0, play: 0 }; rec[k].play++; if (r.rank === 1) rec[k].win++; if (lasts.includes(r)) rec[k].last++; }
    store.set("lab.party.record." + G.id, rec);
    $("pt-rec").textContent = "이 폰 전적 · " + S.players.map((p) => { const k = p.name + (p.bot ? "(봇)" : ""); return `${k} ${rec[k].win}승 ${rec[k].last}꼴찌`; }).join(" · ");
    S.sfx("end"); S.buzz([40, 60, 40]);
    S.log.push({ e: "end", rows: rows.map((r) => [r.p.i, r.s, r.rank]) });
    $("pt-end").classList.add("on");
  };
  $("pt-again").onclick = () => { $("pt-end").classList.remove("on"); begin(false); };
  $("pt-who").onclick = () => { $("pt-end").classList.remove("on"); drawSetup(); $("pt-setup").classList.add("on"); };

  // ── 시작 흐름: 설정 → 규칙(처음엔 늘) → 게임 ──
  async function begin(withRules: boolean) {
    S.players.forEach((p) => (p.score = 0)); drawChips(); S.fast = false; $("pt-think").classList.remove("fast", "on");
    if (withRules) await S.showRules();
    S.started = true;
    $("pt-game").innerHTML = "";
    G.start(S);
  }
  $("pt-rules-go").onclick = () => { commitPlayers(); $("pt-setup").classList.remove("on"); begin(true); };
  drawSetup();
  $("pt-setup").classList.add("on");
  return S;
}

export const PartyShell = { mount, markSVG, COLORS };
