// 내기 모음 2 「간식 숨기기」 — 화면(몰래 숨기기 → 다 같이 찾기 → 공개). 규칙은 ./hide.ts(엔진, 화면 모름), 바깥 틀은 ./shell.ts.
// 시안 docs/lab-party-hide-mock.html(md5 aeb861bf…, 1판 — 봇 자리·아이패드)의 <script> 를 그대로 옮겼다(타입만 붙임). 겉모양은 ./hide.css.
// 규격 docs/lab-party-hide-spec.md. 주소 끝: #reduce · #nocap · #nocoach · #seed=N(엔진 씨앗 고정 — 리그) · #botfast
// 리그가 보는 자리: window.__hd(엔진 상태) · window.__hdE(엔진 모듈 — 시안의 window.PartyHide) · window.__party(틀).
// 🔴 숨은 정보: 숨기기 화면엔 그 사람 컵만 그린다. 「다 숨겼어요」 뒤 게임 층을 비운 다음 덮개. 찾기 화면의 닫힌 컵은 모두 같은 그림(속을 담은 속성·클래스 없음). 봇은 E.view(g, i) 만 받는다.
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as E from "./hide.ts";
import { mount, type PartyShell } from "./shell.ts";

export function initHide() {
  const hash = location.hash;
  const SEED = +((hash.match(/seed=(\d+)/) || [])[1] ?? 0) || ((Math.random() * 1e9) | 0);
  let games = 0;
  const INK = "#3a2228", FUR = "#b8643a", FUR2 = "#8e4526", PINK = "#f07a8a";
  const CUPN = E.CUP_NAMES;
  // ── 그림: 간식(개껌) · 삑삑이(분홍 공) · 빈 컵(부스러기) · 발자국 · 컵 ──
  const BONE = (s?: number) => `<g transform="scale(${s || 1})"><path d="M-14-4a5 5 0 1 1 6-4h16a5 5 0 1 1 6 4 5 5 0 1 1-6 4H-8a5 5 0 1 1-6-4z" fill="#f6e3c4" stroke="${FUR2}" stroke-width="2.2"/></g>`;
  const TOY = (s?: number) => `<g transform="scale(${s || 1})"><circle r="11" fill="${PINK}" stroke="#a8344a" stroke-width="2.2"/><path d="M0-6l1.8 3.8 4.2.5-3.1 2.8.8 4.1L0 3.2-3.7 5.2l.8-4.1-3.1-2.8 4.2-.5z" fill="#fff"/><path d="M14-10l5-4M16-2h6M14 6l5 4" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/></g>`;
  const CRUMB = () => `<g fill="#c9a77a"><circle cx="-7" cy="2" r="2"/><circle cx="3" cy="-1" r="1.6"/><circle cx="8" cy="3" r="1.4"/></g>`;
  const PAW = (x: number, y: number, s?: number, c?: string) => `<g class="paw" transform="translate(${x} ${y}) scale(${s || 1})" fill="${c || FUR2}"><ellipse cx="0" cy="3" rx="6" ry="5"/><circle cx="-7" cy="-4" r="2.6"/><circle cx="-2.4" cy="-8" r="2.6"/><circle cx="2.4" cy="-8" r="2.6"/><circle cx="7" cy="-4" r="2.6"/></g>`;
  // 컵 하나(viewBox -50 -50 100 100): 바닥 줄 · 속(올렸을 때만) · 뚜껑 컵(사람 색 띠 · 발자국). in = treat|toy|empty|null(닫힘 — 속을 안 그린다)
  function cupSVG(color: string, paw: boolean, inside: E.HideWhat | null, seekerMark?: string | null) {
    const body = `<g class="lid"><path d="M-22-24H22L31 30H-31Z" fill="#fffaf2" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><rect x="-34" y="27" width="68" height="9" rx="4.5" fill="${color}" stroke="${INK}" stroke-width="2.5"/><path d="M-25 0H25" stroke="${color}" stroke-width="6"/><rect x="-10" y="-31" width="20" height="8" rx="4" fill="${color}" stroke="${INK}" stroke-width="2.5"/>${paw ? PAW(0, 13, 0.85) : ""}</g>`;
    const under = inside === "treat" ? `<g transform="translate(0 25)">${BONE(1.25)}</g>` : inside === "toy" ? `<g transform="translate(-2 24)">${TOY(1.05)}</g>` : inside === "empty" ? `<g transform="translate(0 30)">${CRUMB()}</g>` : "";
    return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><ellipse cx="0" cy="38" rx="40" ry="6" fill="rgba(58,34,40,.12)"/>${under}${body}${seekerMark ? `<g transform="translate(30 -36)">${seekerMark}</g>` : ""}</svg>`;
  }
  // 코코(2D 얼굴): calm · sniff(킁킁) · happy(간식!) · oops(삑!) · peek(눈 가림 — 숨기는 동안 안 본다)
  function coco(mood: string) {
    const eye = mood === "happy" ? `<path d="M-13-2q4-5 8 0M5-2q4-5 8 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
      : mood === "oops" ? `<circle cx="-9" cy="-2" r="5" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="9" cy="-2" r="5" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="-9" cy="-2" r="2" fill="${INK}"/><circle cx="9" cy="-2" r="2" fill="${INK}"/>`
      : mood === "peek" ? "" : `<circle cx="-9" cy="-2" r="4" fill="${INK}"/><circle cx="9" cy="-2" r="4" fill="${INK}"/><circle cx="-8" cy="-3.5" r="1.4" fill="#fff"/><circle cx="10" cy="-3.5" r="1.4" fill="#fff"/>`;
    const mouth = mood === "happy" ? `<path d="M-5 10q5 6 10 0" stroke="${INK}" stroke-width="2.2" fill="${PINK}"/>` : mood === "oops" ? `<ellipse cy="13" rx="4" ry="4.5" fill="${INK}"/>` : `<path d="M-4 11q4 3 8 0" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    const extra = mood === "sniff" ? `<path d="M-14 22q-4 3-8 2M-12 28q-5 2-9 0M14 22q4 3 8 2M12 28q5 2 9 0" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`
      : mood === "peek" ? `<g fill="${FUR2}"><ellipse cx="-10" cy="-2" rx="9" ry="7"/><ellipse cx="10" cy="-2" rx="9" ry="7"/></g><g fill="#d98a5a"><circle cx="-14" cy="-6" r="1.8"/><circle cx="-10" cy="-8" r="1.8"/><circle cx="-6" cy="-6" r="1.8"/><circle cx="6" cy="-6" r="1.8"/><circle cx="10" cy="-8" r="1.8"/><circle cx="14" cy="-6" r="1.8"/></g>`
      : mood === "oops" ? `<path d="M-30-24l-6-6M30-24l6-6M-34-8h-8M34-8h8" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` : "";
    return `<g><ellipse cx="-22" cy="4" rx="9" ry="16" fill="${FUR2}"/><ellipse cx="22" cy="4" rx="9" ry="16" fill="${FUR2}"/><circle r="24" fill="${FUR}"/><circle cy="-20" r="12" fill="${FUR}"/><ellipse cy="8" rx="12" ry="9" fill="#d98a5a"/><ellipse cy="4" rx="4.5" ry="3.4" fill="${INK}"/>${eye}${mouth}${extra}</g>`;
  }
  const cocoSVG = (mood: string) => `<svg class="hd-coco" viewBox="-50 -50 100 100" aria-hidden="true">${coco(mood)}</svg>`;
  // ── 규칙 카드 5장(그림만으로) ──
  const card = (inner: string, bg?: string) => `<svg viewBox="0 0 160 120"><rect width="160" height="120" rx="14" fill="${bg || "#dff1ff"}"/>${inner}</svg>`;
  const mini = (x: number, y: number, s: number, inside: E.HideWhat | null, color?: string, paw?: boolean) => `<g transform="translate(${x} ${y}) scale(${s})">${cupSVG(color || "#2fb5a8", !!paw, inside).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>`.replace('class="lid"', inside ? 'transform="translate(-14 -40) rotate(-22)"' : "");
  const person = (x: number, y: number, c: string, s?: number) => `<g transform="translate(${x} ${y}) scale(${s || 1})"><circle cy="-10" r="9" fill="${c}"/><rect x="-11" y="0" width="22" height="18" rx="9" fill="${c}"/></g>`;
  const arrow = (x1: number, y1: number, x2: number, y2: number, c?: string) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c || INK}" stroke-width="3" stroke-linecap="round"/><path d="M${x2} ${y2}l-7-3m7 3-3 7" stroke="${c || INK}" stroke-width="3" stroke-linecap="round" fill="none" transform="rotate(${(Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI - 45} ${x2} ${y2})"/>`;
  const plus = (x: number, y: number, t: string, c: string) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="17" font-weight="900" fill="${c}">${t}</text>`;
  const rules = [
    { cap: "내 컵 셋 — 하나엔 간식, 하나엔 삑삑이를 몰래", svg: card(`${mini(36, 66, 0.52, "treat")}${mini(80, 66, 0.52, "toy")}${mini(124, 66, 0.52, null)}<g transform="translate(80 18) scale(.5)">${coco("peek")}</g>`) },
    { cap: "발자국 컵엔 간식을 못 넣어요 — 지난번 간식 컵", svg: card(`${mini(56, 62, 0.75, null, "#2fb5a8", true)}<g transform="translate(118 58)">${BONE(1.3)}</g><path d="M100 40l36 36M136 40l-36 36" stroke="${PINK}" stroke-width="6" stroke-linecap="round"/>`, "#fff4e3") },
    { cap: "남의 컵을 들어 간식이면 — 내가 +1, 주인 −1", svg: card(`${person(26, 70, "#f07a8a")}${mini(80, 64, 0.62, "treat", "#2fb5a8")}${person(136, 70, "#2fb5a8")}${arrow(66, 92, 40, 92)}${plus(26, 40, "+1", "#15665f")}${plus(136, 40, "−1", "#a8344a")}`) },
    { cap: "삑삑이면 — 내가 주인에게 하나 줘요", svg: card(`${person(26, 70, "#f07a8a")}${mini(80, 64, 0.62, "toy", "#2fb5a8")}${person(136, 70, "#2fb5a8")}<g transform="translate(64 96)">${BONE(0.8)}</g>${arrow(84, 106, 120, 106)}${plus(26, 40, "−1", "#a8344a")}${plus(136, 40, "+1", "#15665f")}`, "#fff4e3") },
    { cap: "끝까지 안 들킨 간식은 +1 · 마지막에 가장 적으면 꼴찌", svg: card(`${mini(40, 60, 0.7, "treat", "#2fb5a8")}${plus(40, 22, "+1", "#15665f")}<g transform="translate(112 34) scale(.42)">${coco("happy")}</g><rect x="96" y="62" width="10" height="34" rx="3" fill="#2fb5a8"/><rect x="110" y="74" width="10" height="22" rx="3" fill="#e0a640"/><rect x="124" y="86" width="10" height="10" rx="3" fill="${PINK}"/><path d="M124 100h12l-1 12h-10z" fill="#ffb38a" stroke="${INK}" stroke-width="2"/>`) },
  ];

  mount({
    id: "hide", title: "간식 숨기기", min: 2, max: 4, hidden: true, rules,
    coach: { hideT: "간식을 넣을 컵을 눌러요", hideY: "이번엔 삑삑이를 넣을 컵", done: "다 골랐으면 눌러요", seek: "남의 컵 하나를 눌러 들어요 — 간식이면 내 것" },
    async start(S: PartyShell) {
      const n = S.players.length, g = E.create(n, SEED + games * 7919), botR = E.rng((SEED + games * 7919) * 31 + 5);
      games++;
      (window as any).__hd = g; // 리그
      (window as any).__hdE = E; // 리그: 시안의 window.PartyHide 자리(모듈이라 전역이 없다)
      const root = document.getElementById("pt-game")!, $ = (id: string): any => document.getElementById(id);
      const P = S.players, mk = (i: number, s?: number) => S.markSVG(P[i].mark, P[i].c).replace('class="pt-mark"', `class="pt-mark"${s ? ` style="width:${s}px;height:${s}px"` : ""}`);
      const fast = () => S.fast || /botfast/.test(hash);
      const wait = (ms: number) => new Promise((r) => setTimeout(r, document.body.classList.contains("reduce") ? Math.min(ms, 300) : ms));
      root.innerHTML = `<div class="hd"><div class="hd-round" id="hd-round"></div><div class="hd-who" id="hd-who" aria-live="polite"></div><div id="hd-mid"></div><div class="hd-toast" id="hd-toast" aria-live="assertive"></div><div class="hd-acts" id="hd-acts"></div></div>`;
      const roundLine = (what: string) => { $("hd-round").textContent = `${Math.min(g.round, g.rounds)} / ${g.rounds} 바퀴 · ${what}`; };
      const pop = (i: number) => { const el = $("pt-chip-" + i); if (!el) return; el.classList.remove("hd-pop"); void el.offsetWidth; el.classList.add("hd-pop"); };
      const syncScores = () => g.scores.forEach((v, i) => S.setScore(i, v));
      syncScores(); // 처음 간식 3 — 틀은 0 으로 그린다
      // 🔴 덮개를 띄우기 전에 게임 층을 비운다(앞사람이 고른 컵이 DOM 에 남지 않게 — 덮개 아래 visibility 로도 숨지만 DOM 자체를 비운다)
      const blank = (msg?: string) => { $("hd-who").textContent = msg || ""; $("hd-mid").innerHTML = ""; $("hd-toast").textContent = ""; $("hd-acts").innerHTML = ""; };

      // ── ① 숨기기: 내 컵 셋만 그린다. 남의 컵·남이 고른 것은 화면 어디에도 없다 ──
      function hideHuman(i: number) {
        return new Promise<void>((done) => {
          const paw = E.lastT(g, i);
          let t = -1, y = -1;
          roundLine("몰래 숨기기");
          $("hd-who").innerHTML = `${mk(i)}<span>${P[i].name}, 몰래 숨겨요</span>`;
          $("hd-mid").innerHTML = `<div class="hd-hidebox">${cocoSVG("peek")}<div class="hd-step" id="hd-step"></div><div class="hd-mine" id="hd-mine">${[0, 1, 2].map((c) => `<button class="hd-cup" data-c="${c}"></button>`).join("")}</div></div>`;
          $("hd-acts").innerHTML = `<button class="pt-btn ghost" id="hd-redo">다시</button><button class="pt-btn" id="hd-ok">다 숨겼어요</button>`;
          $("hd-toast").textContent = "";
          const cups = [...document.querySelectorAll<HTMLButtonElement>("#hd-mine .hd-cup")];
          function draw() {
            cups.forEach((b, c) => {
              const inside: E.HideWhat | null = c === t ? "treat" : c === y ? "toy" : null;
              b.innerHTML = cupSVG(P[i].c, c === paw, inside);
              b.classList.toggle("up", !!inside);
              b.setAttribute("aria-label", `${CUPN[c]} 컵${c === paw ? " · 발자국(간식은 못 넣어요)" : ""}${inside === "treat" ? " · 간식" : inside === "toy" ? " · 삑삑이" : ""}`);
            });
            const st = $("hd-step");
            st.innerHTML = `<span class="${t < 0 ? "on" : "ok"}"><svg viewBox="-20 -20 40 40">${BONE(1)}</svg>간식</span><span class="${t >= 0 && y < 0 ? "on" : y >= 0 ? "ok" : ""}"><svg viewBox="-20 -20 40 40">${TOY(1)}</svg>삑삑이</span>`;
            $("hd-ok").disabled = !(t >= 0 && y >= 0);
            $("hd-toast").textContent = t < 0 && paw >= 0 ? "발자국 컵엔 간식을 못 넣어요" : "";
          }
          cups.forEach((b, c) => (b.onclick = () => {
            if (c === t) { t = -1; } else if (c === y) { y = -1; }
            else if (t < 0) { if (c === paw) { S.sfx("bad"); $("hd-toast").textContent = "발자국 컵엔 간식을 못 넣어요 — 지난번 간식 컵"; b.classList.add("sniff"); setTimeout(() => b.classList.remove("sniff"), 460); return; } t = c; S.coachDone("hideT"); }
            else if (y < 0) { y = c; S.coachDone("hideY"); }
            else return;
            S.sfx("tap"); draw();
            if (t >= 0 && y < 0) S.coach("hideY", $("hd-mine"), null, { below: true });
            if (t >= 0 && y >= 0) S.coach("done", $("hd-ok"));
          }));
          $("hd-redo").onclick = () => { t = y = -1; S.sfx("tap"); draw(); };
          $("hd-ok").onclick = () => {
            if (!E.hide(g, i, t, y)) return;
            S.coachDone("done"); S.coachDone("hideY", true); S.sfx("ok");
            blank("숨겼어요!"); done();
          };
          draw();
          S.coach("hideT", $("hd-mine"), null, { below: true });
        });
      }
      async function hideBot(i: number) {
        roundLine("몰래 숨기기");
        $("hd-who").innerHTML = `${mk(i)}<span>${P[i].name}(봇) 숨기는 중</span>`;
        $("hd-mid").innerHTML = cocoSVG("peek"); $("hd-acts").innerHTML = ""; $("hd-toast").textContent = "";
        await S.botWait(i, "몰래 숨기는 중…");
        const m = E.bot(E.view(g, i), P[i].level, botR) as { t: number; y: number }; // 🔴 봇은 자기 자리에서 보이는 것(view)만
        E.hide(g, i, m.t, m.y);
        S.botDone(); blank("숨겼어요!");
      }

      // ── ② 찾기: 다 같이 보는 판. 닫힌 컵은 모두 같은 그림 ──
      function rowsHTML(seeker: number) {
        return `<div class="hd-rows" id="hd-rows">${P.map((p, o) => {
          const me = o === seeker, paw = E.lastT(g, o);
          return `<div class="hd-row ${me ? "me" : ""}" data-o="${o}"><div class="hd-name"><b>${mk(o, 16)}<span>${p.name}</span></b><small id="hd-tag-${o}">${me ? "찾는 사람" : ""}</small></div>${[0, 1, 2].map((c) => `<button class="hd-cup" data-o="${o}" data-c="${c}" ${me ? "disabled" : ""} aria-label="${p.name}의 ${CUPN[c]} 컵${c === paw ? " · 발자국" : ""}">${cupSVG(p.c, c === paw, null)}</button>`).join("")}</div>`;
        }).join("")}</div>`;
      }
      const cupEl = (o: number, c: number): any => document.querySelector(`#hd-rows .hd-cup[data-o="${o}"][data-c="${c}"]`);
      function openCup(o: number, c: number, what: E.HideWhat, seeker: number | null, paw?: number) {
        const b = cupEl(o, c);
        b.innerHTML = cupSVG(P[o].c, c === (paw == null ? E.lastT(g, o) : paw), what, seeker != null ? mk(seeker).replace("<svg", '<svg x="-9" y="-9" width="18" height="18"') : null);
        void b.offsetWidth; b.classList.add("up"); b.disabled = true;
        b.setAttribute("aria-label", `${P[o].name}의 ${CUPN[c]} 컵 · ${what === "treat" ? "간식" : what === "toy" ? "삑삑이" : "빈 컵"}`);
      }
      function lockBoard(on: boolean) { const r = $("hd-rows"); if (r) r.classList.toggle("hd-lock", on); }
      function drawSeekBoard(i: number) {
        roundLine("찾기");
        $("hd-who").innerHTML = `${mk(i)}<span>${P[i].name}${S.isBot(i) ? "(봇)" : ""} 차례 — 남의 컵 하나 들기</span>`;
        $("hd-mid").innerHTML = rowsHTML(i);
        for (const L of g.lifts) openCup(L.o, L.c, L.what, L.s);
        g.found.forEach((f, o) => { if (f) $("hd-tag-" + o).textContent = "들켰어요"; });
        $("hd-toast").innerHTML = ""; $("hd-acts").innerHTML = "";
      }
      let want: ((o: number, c: number) => Promise<void>) | null = null; // 사람 차례에만 컵 누름을 받는다(봇 차례엔 null — 눌러도 아무 일 없다)
      async function doLift(i: number, o: number, c: number) {
        lockBoard(true); want = null;
        const b = cupEl(o, c); b.classList.add("pick", "sniff");
        S.sfx("tap"); await wait(fast() ? 120 : 480);
        const L = E.lift(g, i, o, c)!;
        b.classList.remove("pick", "sniff");
        openCup(o, c, L.what, i);
        syncScores(); pop(i); pop(o);
        const who = `${mk(i)} ${P[i].name}`, own = `${mk(o)} ${P[o].name}`;
        if (L.what === "treat") { S.sfx("ok"); S.buzz(40); $("hd-tag-" + o).textContent = "들켰어요"; $("hd-toast").innerHTML = `<span class="big good">간식 찾았다!</span>${who} +${L.ds} · ${own} ${L.do ? "−" + -L.do : "±0(줄 게 없어요)"}`; }
        else if (L.what === "toy") { S.sfx("bad"); S.buzz([60, 40, 60]); $("hd-toast").innerHTML = `<span class="big">삑! 삑삑이였어요</span>${who} ${L.ds ? "−" + -L.ds : "±0(줄 게 없어요)"} → ${own} +${L.do}`; }
        else { S.sfx("tap"); $("hd-toast").innerHTML = `<span class="big">빈 컵이에요</span>${P[o].name}의 ${CUPN[c]} 컵 — 아무 일 없어요`; }
        return L;
      }
      function seekHuman(i: number) {
        return new Promise<void>((done) => {
          lockBoard(false);
          want = async (o: number, c: number) => {
            if (!E.canLift(g, i, o, c)) return;
            S.coachDone("seek");
            await doLift(i, o, c);
            $("hd-acts").innerHTML = `<button class="pt-btn" id="hd-next">${g.phase === "reveal" ? "모두 열어 보기" : "다음"}</button>`;
            $("hd-next").onclick = () => { $("hd-next").disabled = true; done(); };
          };
          document.querySelectorAll<HTMLButtonElement>("#hd-rows .hd-cup").forEach((b) => (b.onclick = () => { if (want) want(+b.dataset.o!, +b.dataset.c!); }));
          const rows = document.querySelectorAll("#hd-rows .hd-row:not(.me)");
          S.coach("seek", rows[rows.length - 1].querySelector(".hd-cup[data-c='1']")!, null, { below: true });
        });
      }
      async function seekBot(i: number) {
        lockBoard(true); want = null;
        await S.botWait(i, "킁킁 냄새 맡는 중…");
        const m = E.bot(E.view(g, i), P[i].level, botR) as { o: number; c: number }; // 🔴 view 만
        await doLift(i, m.o, m.c);
        S.botDone();
        await wait(fast() ? 300 : 1700);
      }

      // ── ③ 공개: 모든 컵을 연다. 안 들킨 사람 +1 ──
      function reveal() {
        return new Promise<void>((done) => {
          const H = g.hide.map((h) => Object.assign({}, h) as E.HideSlot), found = g.found.slice(), lifts = g.lifts.slice(), paws = P.map((_, o) => E.lastT(g, o));
          roundLine("모두 공개");
          $("hd-who").innerHTML = `<span>컵을 다 열어 봐요</span>`;
          $("hd-mid").innerHTML = rowsHTML(-1);
          const res = E.endRound(g)!;
          P.forEach((p, o) => [0, 1, 2].forEach((c) => {
            const L = lifts.find((l) => l.o === o && l.c === c), what: E.HideWhat = H[o].t === c ? "treat" : H[o].y === c ? "toy" : "empty";
            openCup(o, c, what, L ? L.s : null, paws[o]); // 발자국은 이번 바퀴 것 그대로(endRound 뒤 lastT 는 다음 바퀴 것 — 간식 컵에 발자국이 같이 떠 헷갈렸다)
            if (!L) cupEl(o, c).style.opacity = ".8";
          }));
          res.safe.forEach((o) => { const row = document.querySelector(`#hd-rows .hd-row[data-o="${o}"]`)!; row.classList.add("safe"); const tg = $("hd-tag-" + o); tg.textContent = "지켰다 +1"; tg.className = "safe"; pop(o); });
          found.forEach((f, o) => { if (f) $("hd-tag-" + o).textContent = "들켰어요"; });
          syncScores(); S.sfx(res.safe.length ? "ok" : "tap");
          $("hd-toast").innerHTML = res.safe.length ? `<span class="big good">안 들킨 간식 +1</span>${res.safe.map((o) => `${mk(o)} ${P[o].name}`).join(" · ")}` : `<span class="big">모두 들켰어요!</span>코코가 웃어요`;
          $("hd-acts").innerHTML = `<button class="pt-btn" id="hd-next">${g.phase === "over" ? "결과 보기" : "다음 바퀴"}</button>`;
          $("hd-next").onclick = () => { $("hd-next").disabled = true; done(); };
        });
      }
      function gather() {
        return new Promise<void>((done) => {
          roundLine("찾기 준비");
          $("hd-who").innerHTML = `<span>다 숨겼어요!</span>`;
          $("hd-mid").innerHTML = cocoSVG("sniff");
          $("hd-toast").innerHTML = "폰을 가운데 두고 다 같이 봐요<br>이제부터는 숨길 게 없어요";
          $("hd-acts").innerHTML = `<button class="pt-btn" id="hd-go">찾기 시작</button>`;
          $("hd-go").onclick = () => { $("hd-go").disabled = true; done(); };
        });
      }

      while (g.phase !== "over") {
        // ① 숨기기 — 사람마다 넘기기 덮개(「열기」 를 눌러야). 봇은 덮개 없이
        while (g.phase === "hide") {
          const i = E.cur(g);
          blank("");
          await S.turn(i, "다른 사람은 보지 마세요"); // 길면 360 폭에서 「보지 마/세요」 로 끊겼다
          if (S.isBot(i)) await hideBot(i); else await hideHuman(i);
        }
        // 사람이 둘 이상이면 모으기 화면(마지막 사람 손에서 가운데로). 혼자면 바로
        if (S.humans > 1) await gather();
        // ② 찾기 — 다 같이 보는 판이라 덮개 없이 차례만 바꾼다
        while (g.phase === "seek") {
          const i = E.cur(g);
          S.setNow(i); S.sfx("turn"); S.log.push({ e: "seek", i });
          drawSeekBoard(i);
          if (S.isBot(i)) await seekBot(i); else await seekHuman(i);
        }
        await reveal();
      }
      S.end(g.scores, { fmt: (v) => `간식 ${v}` });
    },
  });
}
