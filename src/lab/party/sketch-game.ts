// 내기 모음 5 「그림 전달」 — 화면(그림 릴레이). 규칙은 ./sketch.ts(엔진, 화면 모름 — 획은 0–1000 좌표), 바깥 틀은 ./shell.ts.
// 시안 docs/lab-party-sketch-mock.html(md5 ee056c8f…, 1판 — 봇 자리·아이패드)의 <script> 를 그대로 옮겼다(타입만 붙임). 겉모양은 ./sketch.css.
// 규격 docs/lab-party-sketch-spec.md. 주소 끝: #reduce · #nocap · #nocoach · #seed=N(엔진 씨앗 고정 — 리그) · #drawsec=N(그리기 제한 — 리그)
// 리그가 보는 자리: window.__sk(엔진 상태) · window.__skE(엔진 모듈 — 시안의 window.PartySketch) · window.__skViews(봇에 넘긴 보기) · window.__skPad(그리는 중인 획) · window.__party(틀).
// 🔴 숨은 정보: 차례마다 게임 층을 통째로 비우고(캔버스도 지운다 — 덮어 가리지 않는다) 그 사람에게 건넨 것 하나만 새로 그린다. 봇 차례 화면엔 줄 내용이 없다.
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as E from "./sketch.ts";
import { mount, type PartyShell } from "./shell.ts";

export function initSketch() {
  const hash = location.hash;
  const SEED = +((hash.match(/seed=(\d+)/) || [])[1] ?? 0) || ((Math.random() * 1e9) | 0);
  const DRAW_SEC = +((hash.match(/drawsec=(\d+)/) || [])[1] ?? 0) || E.RULES.DRAW_SEC;
  const COL = E.RULES.COLORS, COLNAME = ["먹색", "빨강", "파랑", "초록"];
  const INK = "#3a2228", CREAM = "#fffaf2";
  let games = 0;
  (window as any).__skViews = []; // 리그: 봇에 넘긴 view 를 그대로 남긴다(남의 숨은 값이 없나 본다)

  // ── 규칙 카드(그림만 보고 이해되게 — 글자 없는 그림 + 아래 한 줄) ──
  const card = (inner: string, bg?: string) => `<svg viewBox="0 0 160 120"><rect width="160" height="120" rx="14" fill="${bg || "#dff1ff"}"/>${inner}</svg>`;
  const person = (x: number, y: number, c: string, s?: number) => `<g transform="translate(${x} ${y}) scale(${s || 1})"><circle r="10" fill="${c}"/><rect x="-12" y="11" width="24" height="20" rx="10" fill="${c}"/></g>`;
  const phone = (x: number, y: number, inner?: string) => `<g transform="translate(${x} ${y})"><rect x="-22" y="-34" width="44" height="68" rx="8" fill="${INK}"/><rect x="-18" y="-28" width="36" height="52" rx="4" fill="#fff"/>${inner || ""}</g>`;
  const fishDoodle = (s?: number, c?: string) => `<g transform="scale(${s || 1})" fill="none" stroke="${c || "#3a8fd6"}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="-3" rx="10" ry="6"/><path d="M6 0l7-6v12z"/><circle cx="-8" cy="-1.5" r=".8" fill="${INK}" stroke="none"/></g>`;
  const bubble = (x: number, y: number, c?: string, chk?: boolean) => `<g transform="translate(${x} ${y})"><rect x="-13" y="-8" width="26" height="16" rx="6" fill="${chk ? "#e9f8f5" : "#fff"}" stroke="${chk ? "#2fb5a8" : "#ecd3a6"}" stroke-width="2"/><path d="M-7 0h14" stroke="${c || "#5a3a42"}" stroke-width="2.4" stroke-linecap="round"/></g>`;
  const star = (x: number, y: number, s?: number) => `<path transform="translate(${x} ${y}) scale(${s || 1})" d="M0-9l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L0 4.6-5.4 7.5l1.1-6.1-4.5-4.2 6.1-.8z" fill="#ffd36b" stroke="#b07a1c" stroke-width="1.4"/>`;
  const arrow = (x1: number, y: number, x2: number) => `<path d="M${x1} ${y}H${x2}m-6-5 6 5-6 5" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const rules = [
    // ① 혼자만 보는 낱말 카드(눈 가린 다른 사람) → 손가락으로 그림, 위에 모래시계 30
    { cap: "몰래 받은 말을 30초 안에 손가락으로 그려요", svg: card(`${person(30, 46, "#f07a8a")}<g transform="translate(30 30)"><rect x="-14" y="-24" width="28" height="18" rx="4" fill="${CREAM}" stroke="${INK}" stroke-width="2"/><g transform="translate(0 -15)">${fishDoodle(0.75, INK)}</g></g>${arrow(52, 64, 78)}${phone(112, 62, `<g transform="translate(0 -2)">${fishDoodle(1.25)}</g><path d="M10 14l8 8" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`)}<g transform="translate(146 20)"><path d="M-6-8h12M-6 8h12M-5-8c0 6 10 6 10 8s-10 2-10 8M5-8c0 6-10 6-10 8s10 2 10 8" stroke="${INK}" stroke-width="2" fill="none"/></g>`) },
    // ② 다음 사람은 그림만 보고 6칸 중 하나(체크)
    { cap: "다음 사람은 그림만 보고 여섯 개 중에 골라요", svg: card(`${phone(40, 60, fishDoodle(1.25))}${person(40, 108, "#2fb5a8", 0.5)}${bubble(88, 34)}${bubble(118, 34)}${bubble(148, 34)}${bubble(88, 60, "#15665f", true)}${bubble(118, 60)}${bubble(148, 60)}<path d="M80 86l6 6 10-12" stroke="#2fb5a8" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M88 70v12" stroke="#2fb5a8" stroke-width="2" stroke-dasharray="2 3"/>`, "#fff4e3") },
    // ③ 그림 → 말 → 그림 → 말, 밑에 사람 색 점이 하나씩(한 사람씩 돌아감)
    { cap: "고른 말을 다음 사람이 또 그려요 — 한 사람씩 차례로", svg: card(`<g transform="translate(22 52)"><rect x="-16" y="-16" width="32" height="32" rx="6" fill="#fff" stroke="#ecd3a6" stroke-width="2"/>${fishDoodle(1)}</g>${bubble(60, 52)}<g transform="translate(98 52)"><rect x="-16" y="-16" width="32" height="32" rx="6" fill="#fff" stroke="#ecd3a6" stroke-width="2"/><g fill="none" stroke="#e85a5a" stroke-width="2.6" stroke-linecap="round"><path d="M-10 4q4-12 10-6t10-2"/><path d="M-8 6l-2 6M8 6l2 6"/></g></g>${bubble(138, 52)}<path d="M39 52h6M77 52h4M115 52h6" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>${person(22, 86, "#f07a8a", 0.55)}${person(60, 86, "#2fb5a8", 0.55)}${person(98, 86, "#e0a640", 0.55)}${person(138, 86, "#8b5cd6", 0.55)}`) },
    // ④ 끝에 줄 전체 공개: 맞은 칸 사이 체크, 그린 사람·맞힌 사람 머리 위 별
    { cap: "끝에 줄 전체를 공개 — 맞으면 그린 사람·맞힌 사람 별 하나씩", svg: card(`<rect x="20" y="10" width="120" height="58" rx="10" fill="#fff" stroke="#ecd3a6" stroke-width="2"/><g transform="translate(48 40)"><rect x="-16" y="-16" width="32" height="32" rx="6" fill="${CREAM}"/>${fishDoodle(1)}</g>${bubble(108, 40, "#15665f", true)}<path d="M70 40l5 5 9-10" stroke="#2fb5a8" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${person(56, 88, "#f07a8a", 0.65)}${person(104, 88, "#2fb5a8", 0.65)}${star(56, 74, 0.9)}${star(104, 74, 0.9)}`, "#fff4e3") },
  ];

  mount({
    id: "sketch", title: "그림 전달", min: 3, max: 4, hidden: true, rules,
    coach: { draw: "여기에 손가락으로 그려요", guess: "그림을 보고 하나 골라요" },
    async start(S: PartyShell) {
      const g = E.create(S.players.length, SEED + (games++) * 7919);
      (window as any).__sk = g; // 리그
      (window as any).__skE = E; // 리그: 시안의 window.PartySketch 자리(모듈이라 전역이 없다)
      const root = document.getElementById("pt-game")!, $ = (id: string): any => document.getElementById(id), P = S.players;
      const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] as string);
      const who = (i: number) => `${S.markSVG(P[i].mark, P[i].c)}${esc(P[i].name)}${P[i].bot ? "(봇)" : ""}`;
      let tok = 0;
      // 🔴 차례 사이: 게임 층을 통째로 비운다(캔버스 요소째 없앤다 — 덮개 아래에 앞사람 그림·낱말이 남지 않게)
      const wipe = () => { tok++; root.innerHTML = ""; };

      function paint(cv: HTMLCanvasElement, strokes: E.Stroke[], extra?: E.Stroke[]) {
        const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 300;
        if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr); }
        const c = cv.getContext("2d")!, s = cv.width / 1000;
        c.clearRect(0, 0, cv.width, cv.height); c.lineCap = "round"; c.lineJoin = "round"; c.lineWidth = Math.max(3, cv.width * 0.014);
        for (const st of strokes.concat(extra || [])) {
          c.strokeStyle = COL[st.c] || INK; c.fillStyle = c.strokeStyle; c.beginPath();
          if (st.p.length <= 2) { c.arc(st.p[0] * s, st.p[1] * s, c.lineWidth / 2, 0, Math.PI * 2); c.fill(); continue; }
          c.moveTo(st.p[0] * s, st.p[1] * s); for (let j = 2; j < st.p.length; j += 2) c.lineTo(st.p[j] * s, st.p[j + 1] * s); c.stroke();
        }
      }
      const svgPic = (strokes: E.Stroke[]) => `<svg class="pic" viewBox="0 0 1000 1000" aria-hidden="true">${strokes.map((st) => (st.p.length <= 2 ? `<circle cx="${st.p[0]}" cy="${st.p[1]}" r="9" fill="${COL[st.c]}"/>` : `<polyline points="${st.p.join(" ")}" fill="none" stroke="${COL[st.c]}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`)).join("")}</svg>`;
      const turnNo = (T: E.SketchTurn) => { const all = g.turns.filter((t) => t.lap === T.lap); return `${g.laps > 1 ? `${T.lap + 1}바퀴 · ` : ""}${all.indexOf(T) + 1} / ${all.length} 차례`; };

      // ── 그리기(사람) ──
      function drawTurn(i: number, v: { word: string }, T: E.SketchTurn): Promise<E.SketchMove> {
        return new Promise((done) => {
          const my = tok;
          root.innerHTML = `<div class="sk"><div class="sk-head"><span class="sk-step">${turnNo(T)} · 그리기</span><span class="sk-ask">이 말을 그려요(글자는 쓰지 않기)</span><span class="sk-word" id="sk-word">${esc(v.word)}</span></div>
            <div class="sk-time" id="sk-time"><i id="sk-bar"></i></div><div class="sk-sec" id="sk-sec"></div>
            <div class="sk-pad"><canvas id="sk-cv" aria-label="그림판 — 손가락으로 그려요"></canvas></div>
            <div class="sk-tools" id="sk-tools">${COL.map((c, k) => `<button class="sk-col" data-c="${k}" style="--c:${c}" aria-label="${COLNAME[k]}" aria-pressed="${k === 0}"></button>`).join("")}
              <button class="sk-tool" id="sk-undo" aria-label="되돌리기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6 4 11l5 5M4 11h10a6 6 0 0 1 0 12h-3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
              <button class="sk-tool" id="sk-clear" aria-label="다 지우기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
            <button class="pt-btn sk-big" id="sk-done">다 그렸어요</button></div>`;
          const cv: HTMLCanvasElement = $("sk-cv"), strokes: E.Stroke[] = []; (window as any).__skPad = strokes; let col = 0, cur: E.Stroke | null = null, pts = 0, left = DRAW_SEC, fin = false;
          paint(cv, strokes);
          const pos = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return [Math.max(0, Math.min(1000, Math.round(((e.clientX - r.left) / r.width) * 1000))), Math.max(0, Math.min(1000, Math.round(((e.clientY - r.top) / r.height) * 1000)))]; };
          cv.addEventListener("pointerdown", (e) => { if (fin) return; e.preventDefault(); S.coachDone("draw"); try { cv.setPointerCapture(e.pointerId); } catch (x) { /* 놓친 포인터 */ } const [x, y] = pos(e); cur = { c: col, p: [x, y] }; strokes.push(cur); pts++; paint(cv, strokes); });
          cv.addEventListener("pointermove", (e) => { if (!cur || fin || pts > 6000) return; const [x, y] = pos(e), n = cur.p.length; if (Math.hypot(x - cur.p[n - 2], y - cur.p[n - 1]) < 5) return; cur.p.push(x, y); pts++; paint(cv, strokes); });
          const up = () => { cur = null; };
          cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up); cv.addEventListener("lostpointercapture", up);
          $("sk-tools").querySelectorAll(".sk-col").forEach((b: HTMLElement) => (b.onclick = () => { col = +b.dataset.c!; S.sfx("tap"); $("sk-tools").querySelectorAll(".sk-col").forEach((x: Element) => x.setAttribute("aria-pressed", String(x === b))); }));
          $("sk-undo").onclick = () => { strokes.pop(); cur = null; S.sfx("tap"); paint(cv, strokes); };
          $("sk-clear").onclick = () => { strokes.length = 0; cur = null; S.sfx("tap"); paint(cv, strokes); };
          const finish = () => { if (fin || my !== tok) return; fin = true; clearInterval(iv); S.coachDone("draw"); S.sfx("ok"); done({ strokes: strokes.map((s) => ({ c: s.c, p: s.p.slice() })) }); };
          $("sk-done").onclick = finish;
          // 남은 시간: 규칙 카드가 열려 있거나 화면이 가려지면 선다. 다 되면 그린 데까지 낸다
          const tick = () => { $("sk-bar").style.transform = `scaleX(${Math.max(0, left / DRAW_SEC)})`; $("sk-sec").textContent = `${Math.ceil(left)}초`; $("sk-time").classList.toggle("low", left <= 5); };
          tick();
          const iv = setInterval(() => { if (my !== tok) { clearInterval(iv); return; } if (S.paused || document.hidden) return; left -= 0.1; tick(); if (left <= 0) finish(); }, 100);
          S.coach("draw", cv, null, { below: true });
        });
      }
      // ── 맞히기(사람): 6칸 고르기가 기본(한 손·빠름), 「직접 쓰기」 로 글자 ──
      function guessTurn(i: number, v: { strokes: E.Stroke[]; hint: string | null; choices: string[] }, T: E.SketchTurn): Promise<E.SketchMove> {
        return new Promise((done) => {
          root.innerHTML = `<div class="sk"><div class="sk-head"><span class="sk-step">${turnNo(T)} · 맞히기</span><span class="sk-ask">앞사람 그림이에요 — 무엇일까요?</span></div>
            <div class="sk-pad"><canvas id="sk-cv" aria-label="앞사람 그림"></canvas></div>
            ${v.hint ? `<div class="sk-hint">봇은 그림을 잘 못 그려요 · 글자 힌트 <b>${esc(v.hint)}</b></div>` : ""}
            <div class="sk-pick" id="sk-pick">${v.choices.map((w, k) => `<button class="sk-ch" data-k="${k}" aria-pressed="false">${esc(w)}</button>`).join("")}</div>
            <div class="sk-typer" id="sk-typer" hidden><input id="sk-in" maxlength="10" placeholder="직접 써요" aria-label="직접 쓰기" autocomplete="off"></div>
            <div class="sk-row2"><button class="pt-btn ghost" id="sk-type">직접 쓰기</button><button class="pt-btn" id="sk-send" disabled>이걸로</button></div></div>`;
          paint($("sk-cv"), v.strokes);
          let pick: number | null = null, typing = false;
          const ready = () => { $("sk-send").disabled = typing ? !$("sk-in").value.trim() : pick == null; };
          $("sk-pick").querySelectorAll(".sk-ch").forEach((b: HTMLElement) => (b.onclick = () => { pick = +b.dataset.k!; S.sfx("tap"); S.coachDone("guess"); $("sk-pick").querySelectorAll(".sk-ch").forEach((x: Element) => x.setAttribute("aria-pressed", String(x === b))); ready(); }));
          $("sk-type").onclick = () => {
            typing = !typing; S.coachDone("guess");
            $("sk-typer").hidden = !typing; $("sk-pick").hidden = typing; $("sk-type").textContent = typing ? "골라서 하기" : "직접 쓰기";
            if (typing) $("sk-in").focus(); ready();
          };
          $("sk-in").oninput = ready;
          $("sk-in").onkeydown = (e: KeyboardEvent) => { if (e.key === "Enter" && !$("sk-send").disabled) $("sk-send").click(); };
          $("sk-send").onclick = () => { const text = typing ? $("sk-in").value.trim() : v.choices[pick!]; if (!text) return; S.sfx("ok"); done({ text }); };
          S.coach("guess", $("sk-pick"), null, { below: true });
        });
      }
      // ── 봇 차례: 줄 내용은 화면에 없다(연필 그림만). 봇은 view 만 받는다 ──
      async function botTurn(i: number, v: E.SketchView, T: E.SketchTurn): Promise<E.SketchMove | null> {
        root.innerHTML = `<div class="sk"><div class="sk-botpane"><svg viewBox="0 0 120 120" aria-hidden="true"><rect x="14" y="70" width="92" height="34" rx="10" fill="#fff" stroke="#ecd3a6" stroke-width="3"/><path d="M26 92q12-14 24-2t24-4 20 2" fill="none" stroke="${P[i].c}" stroke-width="4" stroke-linecap="round"/><g class="pen"><path d="M58 20h14l-2 48-5 10-5-10z" fill="#ffd36b" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M58 20h14v8H58z" fill="#f07a8a" stroke="${INK}" stroke-width="3"/></g></svg><p>${esc(P[i].name)}(봇) ${v.kind === "draw" ? "그리는 중" : "맞히는 중"}</p></div></div>`;
        (window as any).__skViews.push({ i, kind: v.kind, json: JSON.stringify(v) });
        await S.botWait(i, v.kind === "draw" ? "그리는 중…" : "보고 고르는 중…");
        const d = E.bot(v, P[i].level, Math.random);
        S.botDone();
        return d;
      }

      // ── 공개: 바퀴의 줄을 하나씩 이야기로(처음 낱말 → 그림 → 맞힌 말 → …). 점수 띠는 여기서 오른다 ──
      function reveal(): Promise<void> {
        return new Promise((done) => {
          const L = g.lap, chains = g.chains.filter((c) => c.lap === L), sc = E.lapScores(g, L);
          sc.forEach((v, i) => S.setScore(i, v));
          const down = `<svg class="sk-arrow" viewBox="0 0 22 16" aria-hidden="true"><path d="M11 1v12m-6-5 6 6 6-6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
          root.innerHTML = `<div class="sk-rev" id="sk-rev"><h2>${g.laps > 1 ? `${L + 1}바퀴 ` : ""}공개!</h2><p>처음 말이 어디까지 갔을까요 · 맞으면 그린 사람·맞힌 사람 별 하나씩</p>${chains.map((ch) => {
            const rows = [`<div class="sk-it word"><span class="who">${who(ch.start)}의 처음 말</span><b>${esc(ch.word)}</b></div>`];
            ch.items.forEach((it, k) => {
              rows.push(down);
              if (it.kind === "draw") rows.push(`<div class="sk-it">${svgPic(it.strokes!)}<span class="who">${who(it.p)}${k === ch.items.length - 1 ? "<br>마지막 그림" : " 그림"}${it.hint ? `<br>힌트 ${esc(it.hint)}` : ""}</span></div>`);
              else rows.push(`<div class="sk-it"><span class="who">${who(it.p)}</span><b>${esc(it.text)}</b><span class="res ${it.ok ? "ok" : "no"}">${it.ok ? "맞음 ★+1 둘" : "아쉬워요"}</span></div>`);
            });
            const last = ch.items.filter((it) => it.text).pop();
            rows.push(`<div class="sk-sum">${esc(ch.word)} → ${last ? esc(last.text) : "?"}${last && E.norm(last.text) === E.norm(ch.word) ? " · 끝까지 그대로!" : ""}</div>`);
            return `<section class="sk-chain"><h3>${who(ch.start)}의 줄</h3>${rows.join("")}</section>`;
          }).join("")}<button class="pt-btn sk-big sk-revgo" id="sk-go">${g.lap < g.laps - 1 ? "다음 바퀴" : "결과 보기"}</button></div>`;
          S.sfx("end");
          $("sk-go").onclick = () => { S.sfx("tap"); done(); };
        });
      }

      // ── 판 흐름 ──
      while (g.state !== "over") {
        if (g.state === "reveal") { wipe(); await reveal(); E.next(g); wipe(); continue; }
        const T = E.cur(g)!, i = T.p;
        wipe(); // 넘기기 덮개가 뜨기 전에 비운다
        await S.turn(i, `${T.kind === "draw" ? "그릴" : "맞힐"} 차례 · 다른 사람은 보지 마세요`);
        const v = E.view(g, i)!; // 그 사람에게 건넬 것 하나(사람·봇 같은 함수)
        const d = S.isBot(i) ? await botTurn(i, v, T) : T.kind === "draw" ? await drawTurn(i, v as { word: string }, T) : await guessTurn(i, v as { strokes: E.Stroke[]; hint: string | null; choices: string[] }, T);
        E.submit(g, i, d);
      }
      wipe();
      S.end(g.scores, { fmt: (v) => `별 ${v}` });
    },
  });
}
