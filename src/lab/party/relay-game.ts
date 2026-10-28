// 내기 모음 8 「5초 릴레이」 — 화면. 규칙은 ./relay.ts(엔진, 화면 모름 — 시간은 화면이 과제 시작부터 잰 초로 넣는다), 바깥 틀은 ./shell.ts.
// 시안 docs/lab-party-relay-mock.html(md5 0fa31e16…, 1판 — 봇 자리·아이패드)의 <script> 를 그대로 옮겼다(타입만 붙임). 겉모양은 ./relay.css.
// 규격 docs/lab-party-relay-spec.md. 주소 끝: #reduce · #nocap · #nocoach · #seed=N · #botfast(봇 차례 시계 3배 — 리그)
// 리그가 보는 자리: window.__rl(엔진 상태) · window.__rlv(화면 단계·시계·막힌 손·늦은 손) · window.__rlE(엔진 — 시안의 window.PartyRelay 자리, 모듈이라 전역이 없다) · window.__party(틀).
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as E from "./relay.ts";
import { mount, type PartyShell } from "./shell.ts";

export function initRelay() {
  const hash = location.hash;
  const SEED = +((hash.match(/seed=(\d+)/) || [])[1] ?? 0) || ((Math.random() * 1e9) | 0);
  const REDUCE = /reduce/.test(hash) || matchMedia("(prefers-reduced-motion: reduce)").matches;
  let games = 0, gen = 0;
  (window as any).__rlE = E; // 리그
  const INK = "#3a2228", CREAM = "#fffaf2", FUR = "#b8643a", FUR2 = "#8e4526", PINK = "#f07a8a", TEAL = "#2fb5a8", GOLD = "#e0a640";
  // 간식 그림(한 칸 더?·초인종 폭탄과 같은 6종)
  const TREAT = [
    `<path d="M-14-4a5 5 0 1 1 6-4h16a5 5 0 1 1 6 4 5 5 0 1 1-6 4H-8a5 5 0 1 1-6-4z" fill="#f6e3c4" stroke="${FUR2}" stroke-width="2"/>`,
    `<circle r="11" fill="#e85a5a" stroke="${FUR2}" stroke-width="2"/><path d="M0-11q2-6 6-7" stroke="${FUR2}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M2-12q6-6 10-2q-6 4-10 2z" fill="#47a35a"/>`,
    `<path d="M0 13C-12 8-14-6-6-12C0-15 8-12 10-4C12 6 6 11 0 13z" fill="#7fc76a" stroke="#2f7a3a" stroke-width="2"/><path d="M0 12C-1 2 0-6 3-11" stroke="#2f7a3a" stroke-width="1.8" fill="none"/>`,
    `<circle r="12" fill="#e0a640" stroke="${FUR2}" stroke-width="2"/><circle cx="-4" cy="-3" r="2.2" fill="${FUR2}"/><circle cx="4" cy="2" r="2.2" fill="${FUR2}"/><circle cx="-2" cy="6" r="1.8" fill="${FUR2}"/>`,
    `<path d="M-10 6C-14-2-8-12 2-11C11-10 13 0 8 6C4 11-6 12-10 6z" fill="#c43a48" stroke="${FUR2}" stroke-width="2"/><path d="M-4-2q6-3 10 2" stroke="#ffb38a" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    `<path d="M-12 8L12 8L12-2L-12-10z" fill="#ffd36b" stroke="#b07a1c" stroke-width="2" stroke-linejoin="round"/><circle cx="-4" cy="2" r="2.2" fill="#e0a640"/><circle cx="5" cy="4" r="1.6" fill="#e0a640"/>`,
  ];
  const treatSVG = (i: number, label?: boolean) => `<svg viewBox="-20 -20 40 40" ${label ? `aria-label="${E.ITEMS[i]}"` : 'aria-hidden="true"'}>${TREAT[i]}</svg>`;
  const cocoFace = (s?: number, x?: number, y?: number) => `<g transform="translate(${x || 0} ${y || 0}) scale(${s || 1})"><ellipse cx="-22" cy="4" rx="9" ry="16" fill="${FUR2}"/><ellipse cx="22" cy="4" rx="9" ry="16" fill="${FUR2}"/><circle r="24" fill="${FUR}"/><ellipse cy="8" rx="12" ry="9" fill="#d98a5a"/><ellipse cy="4" rx="4.5" ry="3.4" fill="${INK}"/><circle cx="-9" cy="-4" r="4" fill="${INK}"/><circle cx="9" cy="-4" r="4" fill="${INK}"/><path d="M-5 11q5 4 10 0" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>`;
  // 밥그릇(연타): 누를수록 사료가 찬다 — 찬 높이는 <rect id> 의 y·height 속성으로(CSS transform 을 쓰지 않는다)
  const bowlSVG = () => `<svg viewBox="-60 -60 120 120" aria-hidden="true">${cocoFace(0.9, 0, -30)}<clipPath id="rl-clip"><path d="M-46 0h92l-10 40a8 8 0 0 1-8 6h-56a8 8 0 0 1-8-6z"/></clipPath><path d="M-46 0h92l-10 40a8 8 0 0 1-8 6h-56a8 8 0 0 1-8-6z" fill="#dff1ff" stroke="${FUR2}" stroke-width="3"/><rect id="rl-kib" clip-path="url(#rl-clip)" x="-50" y="46" width="100" height="0" fill="#c98a45"/><g clip-path="url(#rl-clip)" id="rl-kibdots"></g><rect x="-50" y="-4" width="100" height="8" rx="4" fill="${PINK}" stroke="${FUR2}" stroke-width="2.5"/></svg>`;
  // 박자판: 가운데 간식 + 목표 고리, 바깥 고리가 줄어들어 닿는 순간이 박자 — r 속성으로 줄인다
  const beatSVG = (k: number) => `<svg viewBox="-60 -60 120 120" aria-hidden="true"><circle r="34" fill="#fff4e3" stroke="${GOLD}" stroke-width="4"/><g id="rl-pulse"><g transform="scale(1.6)">${TREAT[k]}</g></g><circle id="rl-appr" r="58" fill="none" stroke="${TEAL}" stroke-width="5" opacity="0"/></svg>`;
  const ring = `<svg class="rl-ring count" id="rl-ring" viewBox="0 0 120 120" role="img" aria-label="남은 시간"><circle class="bg" cx="60" cy="60" r="50"/><circle class="arc" id="rl-arc" cx="60" cy="60" r="50" transform="rotate(-90 60 60)" stroke-dasharray="314.16" stroke-dashoffset="0"/><text id="rl-sec" x="60" y="60" text-anchor="middle" dominant-baseline="central" font-size="44">5</text></svg>`;
  const HOW: Record<E.Kind, string> = { taps: "간식 단추를 최대한 많이 톡톡!", beat: "바깥 고리가 간식 테에 닿을 때 톡", stop: "바늘이 초록 칸 가운데 올 때 멈춰!", memory: "빛나는 간식 차례를 보고 → 같은 차례로 톡" };

  // 규칙 카드(그림만 보고 이해되게): ① 5초 시계와 엄지 ② 과제 넷 ③ 잘할수록 높은 점수 ④ 합계가 가장 적으면 꼴찌
  const card = (inner: string, bg?: string) => `<svg viewBox="0 0 160 120"><rect width="160" height="120" rx="14" fill="${bg || "#dff1ff"}"/>${inner}</svg>`;
  const thumb = (x: number, y: number) => `<path d="M${x} ${y}c-6-12-2-22 6-24 6-1 8 4 8 10v10h10c6 0 8 6 6 12l-4 14c-1 4-4 6-8 6h-14c-4 0-6-4-4-8z" fill="#f6d2b8" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
  const arcRing = (cx: number, cy: number, r: number, frac: number, col: string) => { const C = 2 * Math.PI * r; return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${CREAM}" stroke="#ecd3a6" stroke-width="7"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - frac)).toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`; };
  const person = (x: number, y: number, c: string) => `<circle cx="${x}" cy="${y}" r="8" fill="${c}"/><rect x="${x - 10}" y="${y + 9}" width="20" height="15" rx="7" fill="${c}"/>`;
  const rules = [
    { cap: "차례마다 5초 과제 하나", svg: card(`${arcRing(62, 56, 32, 0.62, TEAL)}<text x="62" y="68" text-anchor="middle" font-size="34" font-weight="900" fill="${INK}">5</text><g transform="translate(14 0)">${thumb(100, 88)}</g><path d="M104 40l8-8M112 50h10M104 60l8 8" stroke="${GOLD}" stroke-width="3.5" stroke-linecap="round"/>`) },
    { cap: "과제는 넷 — 연타 · 박자 · 멈춰! · 기억", svg: card(`
      <rect x="10" y="10" width="66" height="46" rx="10" fill="${CREAM}"/><g transform="translate(43 34) scale(.32)"><path d="M-46 0h92l-10 40a8 8 0 0 1-8 6h-56a8 8 0 0 1-8-6z" fill="#dff1ff" stroke="${FUR2}" stroke-width="5"/><rect x="-40" y="16" width="80" height="26" fill="#c98a45"/></g><text x="22" y="26" font-size="12" font-weight="900" fill="${GOLD}">×20</text>
      <rect x="84" y="10" width="66" height="46" rx="10" fill="${CREAM}"/><circle cx="117" cy="33" r="10" fill="#fff4e3" stroke="${GOLD}" stroke-width="2.5"/><circle cx="117" cy="33" r="18" fill="none" stroke="${TEAL}" stroke-width="3"/><path d="M137 26l-6 7 6 7" stroke="${TEAL}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <rect x="10" y="64" width="66" height="46" rx="10" fill="${CREAM}"/><rect x="16" y="80" width="54" height="16" rx="5" fill="#fff" stroke="#ecd3a6" stroke-width="2"/><rect x="34" y="80" width="18" height="16" fill="${TEAL}" opacity=".5"/><rect x="41" y="77" width="4" height="22" rx="2" fill="${INK}"/>
      <rect x="84" y="64" width="66" height="46" rx="10" fill="${CREAM}"/>${[0, 1, 2].map((c) => [0, 1].map((r) => `<rect x="${92 + c * 18}" y="${70 + r * 18}" width="14" height="14" rx="3" fill="${c === 1 && r === 0 ? "#ffd36b" : "#fff"}" stroke="#ecd3a6" stroke-width="1.5"/>`).join("")).join("")}<text x="103" y="81" text-anchor="middle" font-size="10" font-weight="900" fill="${FUR2}">1</text><text x="121" y="81" text-anchor="middle" font-size="10" font-weight="900" fill="${FUR2}">2</text><text x="103" y="99" text-anchor="middle" font-size="10" font-weight="900" fill="${FUR2}">3</text>`, "#fff4e3") },
    { cap: "잘할수록 높은 점수(0–100)", svg: card(`<rect x="18" y="66" width="124" height="18" rx="9" fill="#fff" stroke="#ecd3a6" stroke-width="2.5"/><rect x="18" y="66" width="80" height="18" rx="9" fill="${GOLD}"/><text x="18" y="102" font-size="12" font-weight="800" fill="${FUR2}">0</text><text x="142" y="102" text-anchor="end" font-size="12" font-weight="800" fill="${FUR2}">100</text><text x="98" y="54" text-anchor="middle" font-size="30" font-weight="900" fill="${INK}">+62</text><path d="M30 30l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#ffd36b" stroke="#b07a1c" stroke-width="1.8"/>`) },
    { cap: "라운드가 끝나면 합계 — 가장 적은 사람이 꼴찌", svg: card(`${person(30, 22, "#f07a8a")}${person(80, 22, "#2fb5a8")}${person(130, 22, "#e0a640")}<rect x="20" y="${110 - 52}" width="20" height="52" rx="4" fill="#f07a8a"/><rect x="70" y="${110 - 64}" width="20" height="64" rx="4" fill="#2fb5a8"/><rect x="120" y="${110 - 30}" width="20" height="30" rx="4" fill="#e0a640"/><g transform="translate(130 66) scale(.42)"><path d="M-16-22h32l-3 38a4 4 0 0 1-4 4h-18a4 4 0 0 1-4-4z" fill="${CREAM}" stroke="${FUR2}" stroke-width="3.5"/><path d="M-14-8h28l-2 20h-24z" fill="#ffb38a"/><path d="M8-32l-6 10" stroke="${TEAL}" stroke-width="4" stroke-linecap="round"/></g>`, "#fff4e3") },
  ];

  mount({
    id: "relay", title: "5초 릴레이", min: 2, max: 4, hidden: false, rules,
    coach: { taps: "시작하면 이 단추를 마구 눌러요", beat: "고리가 테에 닿는 순간 눌러요", stop: "바늘이 가운데 올 때 눌러요", memory: "빛난 차례를 외웠다가 눌러요" },
    async start(S: PartyShell) {
      const my = ++gen;
      const g = E.create(S.players.length, SEED + (games++) * 7919);
      const V = { phase: "idle", t: -3, blocked: 0, late: 0, botApplied: 0, kind: null as E.Kind | null, turn: -1 };
      (window as any).__rl = g; (window as any).__rlv = V; // 리그
      const root = document.getElementById("pt-game")!, $ = (id: string): any => document.getElementById(id);
      root.innerHTML = `<div class="rl"><div class="rl-round" id="rl-round"></div><div class="rl-who" id="rl-who" aria-live="polite"></div>${ring}<div class="rl-msg" id="rl-msg" aria-live="polite"></div><div class="rl-stage wait" id="rl-stage"></div></div>`;
      const C = 2 * Math.PI * 50;
      let turnTok = 0, clockT = -3, lastNow = 0, endAt = 5, onHit: (cell: number | null, fromBot?: boolean) => void = () => {};
      // 시계: 3·2·1(−3 → 0) 다음 과제 5초(0 → 5). 규칙 카드가 열린 동안(S.paused)·탭이 숨은 동안은 선다. 봇 차례 「빨리」 면 3배
      const rate = () => (S.isBot(g.turn) && (S.fast || /botfast/.test(hash)) ? 3 : 1);
      const nowT = () => (S.paused || document.hidden ? clockT : clockT + (rate() * (performance.now() - lastNow)) / 1000);
      function setRing(t: number) {
        const R = $("rl-ring"), sec = $("rl-sec");
        if (t < 0) { R.setAttribute("class", "rl-ring count"); $("rl-arc").setAttribute("stroke-dashoffset", "0"); sec.textContent = String(Math.ceil(-t)); return; }
        const left = Math.max(0, E.RULES.DUR - t);
        R.setAttribute("class", "rl-ring" + (left <= 1.5 ? " low" : ""));
        $("rl-arc").setAttribute("stroke-dashoffset", (C * (1 - left / E.RULES.DUR)).toFixed(2));
        sec.textContent = String(Math.ceil(left));
      }

      // ── 과제 그리기(한 번만 만든다 — 누를 때마다 다시 만들지 않는다) ──
      function drawStage(ch: E.LiveCh, i: number) {
        const st = $("rl-stage");
        st.className = "rl-stage wait" + (S.isBot(i) ? " botturn" : "");
        if (ch.kind === "taps") {
          st.innerHTML = `<button class="rl-press" id="rl-tap" aria-label="간식 단추 — 마구 누르기">${bowlSVG()}</button><div class="rl-bar" aria-hidden="true"><i id="rl-fill"></i></div>`;
          bindPress($("rl-tap"), () => onHit(null));
        } else if (ch.kind === "beat") {
          st.innerHTML = `<button class="rl-press" id="rl-beat" aria-label="박자 맞춰 누르기">${beatSVG(ch.beats.length % 6)}</button><div class="rl-dots" id="rl-dots" aria-hidden="true">${ch.beats.map(() => "<i></i>").join("")}</div>`;
          bindPress($("rl-beat"), () => onHit(null));
        } else if (ch.kind === "stop") {
          const L = Math.max(0, ch.center - ch.tol), W = Math.min(1, ch.center + ch.tol) - L;
          st.innerHTML = `<svg class="rl-bowl" viewBox="-30 -24 60 44" aria-hidden="true" style="left:calc((${ch.center} - .5) * min(100%, 360px))">${cocoFace(0.8, 0, -2)}</svg><div class="rl-gauge" id="rl-gauge" aria-hidden="true"><i class="rl-band" style="left:${(L * 100).toFixed(1)}%;width:${(W * 100).toFixed(1)}%"></i><i class="rl-mid" style="left:${(ch.center * 100).toFixed(1)}%"></i><i class="rl-needle" id="rl-needle">${treatSVG(0)}</i></div><button class="pt-btn rl-stopb" id="rl-stop">멈춰!</button>`;
          bindPress($("rl-stop"), () => onHit(null));
        } else {
          st.innerHTML = `<div class="rl-grid" id="rl-grid">${ch.items.map((it, k) => `<button class="rl-cell" data-k="${k}" aria-label="${E.ITEMS[it]}">${treatSVG(it)}</button>`).join("")}</div>`;
          st.querySelectorAll(".rl-cell").forEach((b: HTMLElement) => bindPress(b, () => onHit(+(b.dataset.k as string))));
        }
        frame(ch, -3);
        if (!S.isBot(i)) S.coach(ch.kind, ch.kind === "memory" ? $("rl-grid") : ch.kind === "stop" ? $("rl-stop") : st.querySelector(".rl-press"), null, { below: true });
      }
      // 누름: 손가락이 닿는 순간(pointerdown — click 은 뗄 때라 박자·멈춤이 늦게 잡힌다). 키보드 Enter·Space 도
      function bindPress(el: HTMLElement, fn: () => void) {
        el.addEventListener("pointerdown", (e) => { e.preventDefault(); fn(); });
        el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
      }
      // 화면 한 장(t 로만 그린다 — 엔진 posAt·beats 와 같은 값)
      function frame(ch: E.LiveCh, t: number) {
        setRing(t);
        if (ch.kind === "beat") {
          const pc = ch.period, next = ch.beats.find((b) => b >= t - 0.06);
          const ap = $("rl-appr");
          if (next == null || t < 0) ap.setAttribute("opacity", "0");
          else { const f = Math.max(0, Math.min(1, (next - t) / pc)); ap.setAttribute("r", (34 + 24 * f).toFixed(1)); ap.setAttribute("opacity", (0.35 + 0.65 * (1 - f)).toFixed(2)); }
          if (!REDUCE) { const near = next == null ? 1 : Math.min(1, Math.abs(next - t) / 0.12); $("rl-pulse").setAttribute("transform", `scale(${(1 + 0.12 * (1 - near)).toFixed(3)})`); }
        } else if (ch.kind === "stop") {
          const x = ch.inputs.length ? E.posAt(ch, ch.inputs[0].t) : E.posAt(ch, Math.max(0, t));
          $("rl-needle").style.left = (x * 100).toFixed(2) + "%";
        } else if (ch.kind === "memory") {
          const k = t < 0 ? -1 : Math.floor((t - ch.lead) / ch.show), inShow = t >= ch.lead && k < ch.seq.length && t - ch.lead - k * ch.show < ch.show - 0.08;
          if (t >= ch.lead && t < ch.showEnd) {
            $("rl-grid").querySelectorAll(".rl-cell").forEach((b: HTMLElement) => { const on = inShow && ch.items[+(b.dataset.k as string)] === ch.seq[k]; b.classList.toggle("lit", on); const old = b.querySelector("b"); if (on && !old) b.insertAdjacentHTML("beforeend", `<b>${k + 1}</b>`); else if (!on && old) old.remove(); });
          } else if (t >= ch.showEnd && !$("rl-grid").dataset.open) { $("rl-grid").dataset.open = "1"; $("rl-grid").querySelectorAll(".rl-cell").forEach((b: HTMLElement) => { b.classList.remove("lit"); const o = b.querySelector("b"); if (o) o.remove(); }); }
        }
      }
      // 되짚음(사람·봇 같은 길)
      function feedback(ch: E.LiveCh, res: any) {
        S.sfx("tap");
        if (ch.kind === "taps") {
          const f = Math.min(1, res.n / ch.cap);
          $("rl-fill").style.width = (f * 100).toFixed(1) + "%";
          const kib = $("rl-kib"); kib.setAttribute("y", (46 - 44 * f).toFixed(1)); kib.setAttribute("height", (44 * f + 2).toFixed(1));
          $("rl-msg").textContent = `${res.n}번`;
          flash($("rl-tap"));
        } else if (ch.kind === "beat") {
          const dot = $("rl-dots").children[res.beat];
          if (dot) dot.className = res.p >= 0.6 ? "g" : res.p > 0 ? "m" : "x";
          $("rl-msg").textContent = res.p >= 0.6 ? "딱!" : res.e < 0 ? "조금 빨라요" : "조금 늦어요";
          flash($("rl-beat"));
        } else if (ch.kind === "stop") {
          $("rl-msg").innerHTML = `<span class="rl-pop">${res.score >= 80 ? "딱 가운데!" : res.score >= 40 ? "좋아요" : "아깝다"}</span>`;
        } else {
          const b = $("rl-grid").querySelector(`.rl-cell[data-k="${ch.inputs[ch.inputs.length - 1].cell}"]`);
          if (res.ok) { b.classList.add("done"); b.insertAdjacentHTML("beforeend", `<b>${res.k + 1}</b>`); } else { b.classList.add("wrong"); S.sfx("bad"); }
          $("rl-msg").textContent = res.ok ? `${res.k + 1} / ${ch.seq.length}` : "앗, 그 간식이 아니에요";
        }
      }
      function flash(el: any) { if (REDUCE) return; el.classList.add("hit"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("hit"), 90); }

      // 차례 하나: (덮개는 S.turn 이 먼저 닫는다) → 3·2·1 → 5초 → 점수
      function playTurn(i: number, tok: number) {
        return new Promise<E.LiveCh>((done) => {
          const ch = E.begin(g) as E.LiveCh, bot = S.isBot(i);
          V.kind = ch.kind; V.turn = i; V.botApplied = 0; V.phase = "count";
          clockT = -3; lastNow = performance.now(); endAt = E.RULES.DUR;
          $("rl-round").textContent = `${g.round} / ${g.rounds} 라운드`;
          const p = S.players[i];
          $("rl-who").innerHTML = `${S.markSVG(p.mark, p.c)}${p.name} · ${E.NAMES[ch.kind]}`;
          $("rl-msg").textContent = HOW[ch.kind];
          drawStage(ch, i);
          const plan = bot ? E.bot(E.view(g), p.level, Math.random) : null; let pi = 0;
          if (bot) S.botWait(i, "하는 중…"); else S.botDone();
          onHit = (cell: number | null, fromBot?: boolean) => {
            if (my !== gen || tok !== turnTok) return;
            if (!fromBot && S.isBot(g.turn)) { V.blocked++; return; } // 봇 차례엔 사람 누름을 받지 않는다(pointer-events 도 막는다)
            if (V.phase !== "play") { if ((V.phase === "done" || V.phase === "result") && !fromBot) V.late++; return; } // 5초 뒤 누름은 세지 않고 리그용으로 건수만
            const t = nowT(), res = E.input(g, t, cell);
            if (!res) { if (t > E.RULES.DUR) V.late++; return; }
            if (fromBot) V.botApplied++; else S.coachDone(ch.kind);
            feedback(ch, res);
            if (E.fixed(ch, ch.inputs)) endAt = Math.min(E.RULES.DUR, t + 0.7);
          };
          const tick = (now: number) => {
            if (my !== gen || tok !== turnTok) return;
            if (!(S.paused || document.hidden)) clockT += (rate() * (now - lastNow)) / 1000;
            lastNow = now;
            const t = clockT; V.t = t;
            if (t >= 0 && V.phase === "count") { V.phase = "play"; $("rl-stage").classList.remove("wait"); S.sfx("ok"); S.buzz(20); if (ch.kind !== "memory") $("rl-msg").textContent = ch.kind === "taps" ? "0번" : HOW[ch.kind]; else $("rl-msg").textContent = "잘 봐요…"; }
            if (ch.kind === "memory" && V.phase === "play" && t >= ch.showEnd && $("rl-msg").textContent === "잘 봐요…") $("rl-msg").textContent = "이제 차례로 톡!";
            if (bot && V.phase === "play") while (pi < plan!.length && plan![pi].t <= t) { const x = plan![pi++]; pressVisual(ch, x.cell); onHit(x.cell, true); }
            frame(ch, Math.min(t, E.RULES.DUR));
            if (V.phase === "play" && t >= endAt) {
              V.phase = "done"; // 🔴 이 뒤 누름은 하나도 안 센다(onHit 이 phase 를 본다 · 엔진도 t > 5 를 버린다)
              setRing(E.RULES.DUR);
              $("rl-stage").classList.add("wait");
              done(ch);
              return;
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame((now) => { lastNow = now; requestAnimationFrame(tick); });
        });
      }
      // 봇 누름이 보이게: 누른 자리가 잠깐 눌린 꼴
      function pressVisual(ch: E.LiveCh, cell: number | null) {
        if (ch.kind === "memory") { const b = $("rl-grid").querySelector(`.rl-cell[data-k="${cell}"]`); if (b && !REDUCE) { b.style.transform = "scale(.94)"; setTimeout(() => (b.style.transform = ""), 120); } }
        else if (ch.kind === "stop") { const b = $("rl-stop"); if (!REDUCE) { b.style.transform = "translateY(2px)"; setTimeout(() => (b.style.transform = ""), 120); } }
      }
      function showResult(i: number, s: number, last: boolean) {
        const word = s >= 80 ? "대단해요!" : s >= 55 ? "좋아요" : s >= 30 ? "괜찮아요" : "다음엔 꼭!";
        $("rl-sec").textContent = String(s); $("rl-sec").setAttribute("font-size", "40");
        $("rl-ring").setAttribute("class", "rl-ring");
        $("rl-msg").innerHTML = `<span><span class="rl-pop" id="rl-score">+${s}</span> ${word}</span><button class="pt-btn ghost" id="rl-next">${last ? "결과 보기" : "다음 ▶"}</button>`;
        S.sfx(s >= 55 ? "ok" : "bad");
        return new Promise<void>((res) => {
          const go = () => { clearTimeout(tm); res(); };
          const tm = setTimeout(go, S.isBot(i) && (S.fast || /botfast/.test(hash)) ? 600 : 2200);
          $("rl-next").onclick = go;
        });
      }

      while ((g.state as string) !== "over") {
        const i = g.turn, tok = ++turnTok; // 🔴 차례 표는 S.turn 앞에서 올린다(지난 차례 루프가 덮개 동안 끼어들지 않게)
        V.phase = "idle";
        await S.turn(i, `${g.round}라운드 · ${E.NAMES[g.kinds[g.round - 1]]}`);
        if (my !== gen) return;
        await playTurn(i, tok);
        if (my !== gen) return;
        S.botDone();
        const s = E.finish(g) as number;
        S.setScore(i, g.totals[i]);
        V.phase = "result";
        const last = g.turn === g.n - 1 && g.round === g.rounds;
        await showResult(i, s, last);
        $("rl-sec").setAttribute("font-size", "44");
        if (my !== gen) return;
        E.advance(g);
      }
      V.phase = "over";
      S.end(g.totals, { lowWins: false, fmt: (v) => `${v}점` });
    },
  });
}
