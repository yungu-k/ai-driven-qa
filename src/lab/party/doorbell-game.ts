// 내기 모음 1 「초인종 폭탄」 — 화면(초인종 돌리기). 규칙은 ./doorbell.ts(엔진, 화면 모름 — 시간은 여기서 step(g, dt) 로 넣는다), 바깥 틀은 ./shell.ts.
// 시안 docs/lab-party-doorbell-mock.html(md5 439da33f…, 1판 — 봇 자리·아이패드)의 <script> 를 그대로 옮겼다(타입만 붙임). 겉모양은 ./doorbell.css.
// 규격 docs/lab-party-doorbell-spec.md. 주소 끝: #reduce · #nocap · #nocoach · #seed=N(엔진 씨앗 고정 — 리그) · #botfast(봇 띠 0.12초 — 리그)
// 리그가 보는 자리: window.__db(엔진 상태) · window.__dbE(엔진 모듈 — 시안의 window.PartyDoorbell) · window.__party(틀).
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as E from "./doorbell.ts";
import { mount, type PartyShell } from "./shell.ts";

export function initDoorbell() {
  const hash = location.hash;
  const SEED = +((hash.match(/seed=(\d+)/) || [])[1] ?? 0) || ((Math.random() * 1e9) | 0);
  let games = 0;
  const INK = "#3a2228", CREAM = "#fffaf2", FUR = "#b8643a", FUR2 = "#8e4526", PINK = "#f07a8a";
  // 간식 그림(한 칸 더? 와 같은 6종)
  const TREAT = [
    `<path d="M-14-4a5 5 0 1 1 6-4h16a5 5 0 1 1 6 4 5 5 0 1 1-6 4H-8a5 5 0 1 1-6-4z" fill="#f6e3c4" stroke="${FUR2}" stroke-width="2"/>`,
    `<circle r="11" fill="#e85a5a" stroke="${FUR2}" stroke-width="2"/><path d="M0-11q2-6 6-7" stroke="${FUR2}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M2-12q6-6 10-2q-6 4-10 2z" fill="#47a35a"/>`,
    `<path d="M0 13C-12 8-14-6-6-12C0-15 8-12 10-4C12 6 6 11 0 13z" fill="#7fc76a" stroke="#2f7a3a" stroke-width="2"/><path d="M0 12C-1 2 0-6 3-11" stroke="#2f7a3a" stroke-width="1.8" fill="none"/>`,
    `<circle r="12" fill="#e0a640" stroke="${FUR2}" stroke-width="2"/><circle cx="-4" cy="-3" r="2.2" fill="${FUR2}"/><circle cx="4" cy="2" r="2.2" fill="${FUR2}"/><circle cx="-2" cy="6" r="1.8" fill="${FUR2}"/>`,
    `<path d="M-10 6C-14-2-8-12 2-11C11-10 13 0 8 6C4 11-6 12-10 6z" fill="#c43a48" stroke="${FUR2}" stroke-width="2"/><path d="M-4-2q6-3 10 2" stroke="#ffb38a" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    `<path d="M-12 8L12 8L12-2L-12-10z" fill="#ffd36b" stroke="#b07a1c" stroke-width="2" stroke-linejoin="round"/><circle cx="-4" cy="2" r="2.2" fill="#e0a640"/><circle cx="5" cy="4" r="1.6" fill="#e0a640"/>`,
  ];
  const treat = (i: number, s?: number) => `<svg viewBox="-20 -20 40 40" aria-label="${E.ITEMS[i]}"><g transform="scale(${s || 1})">${TREAT[i]}</g></svg>`;
  // 초인종(종 + 단추) · 코코(짖음)
  const bell = (c?: string) => `<g class="b"><path d="M-34 24C-34-6-24-30 0-32C24-30 34-6 34 24z" fill="#ffd36b" stroke="#b07a1c" stroke-width="4"/><rect x="-40" y="22" width="80" height="12" rx="6" fill="#e0a640" stroke="#b07a1c" stroke-width="3"/><circle cy="40" r="8" fill="${c || PINK}" stroke="${INK}" stroke-width="3"/><circle cy="-36" r="6" fill="#b07a1c"/><path d="M-16-14q4-8 12-10" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/></g>`;
  const coco = (bark: boolean) => `<g><ellipse cx="-22" cy="4" rx="9" ry="16" fill="${FUR2}"/><ellipse cx="22" cy="4" rx="9" ry="16" fill="${FUR2}"/><circle r="24" fill="${FUR}"/><circle cy="-20" r="12" fill="${FUR}"/><ellipse cy="8" rx="12" ry="9" fill="#d98a5a"/><ellipse cy="4" rx="4.5" ry="3.4" fill="${INK}"/>${bark ? `<path d="M-13-4l7 2M13-4l-7 2" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><ellipse cy="13" rx="7" ry="6" fill="${INK}"/><path d="M-3 16h6" stroke="${PINK}" stroke-width="3"/>` : `<circle cx="-9" cy="-2" r="4" fill="${INK}"/><circle cx="9" cy="-2" r="4" fill="${INK}"/><path d="M-4 10q4 3 8 0" stroke="${INK}" stroke-width="2" fill="none"/>`}</g>`;
  const card = (inner: string, bg?: string) => `<svg viewBox="0 0 160 120"><rect width="160" height="120" rx="14" fill="${bg || "#dff1ff"}"/>${inner}</svg>`;
  const person = (x: number, y: number, c: string) => `<circle cx="${x}" cy="${y}" r="13" fill="${c}"/><rect x="${x - 15}" y="${y + 14}" width="30" height="26" rx="12" fill="${c}"/>`;
  const rules = [
    { cap: "초인종을 받으면 작은 일 하나", svg: card(`${person(40, 44, "#f07a8a")}<g transform="translate(40 92) scale(.32)">${bell()}</g><rect x="84" y="30" width="54" height="64" rx="10" fill="${CREAM}" stroke="${INK}" stroke-width="2.5"/><text x="111" y="70" text-anchor="middle" font-size="26" font-weight="900" fill="${INK}">1 2</text><path d="M96 80h30" stroke="#2fb5a8" stroke-width="4" stroke-linecap="round"/>`) },
    { cap: "다 하면 바로 다음 사람에게", svg: card(`${person(32, 44, "#f07a8a")}${person(128, 44, "#2fb5a8")}<g transform="translate(80 54) scale(.3)">${bell()}</g><path d="M50 84q30 18 60 0" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M110 84l-8-1m8 1-3 8" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`, "#fff4e3") },
    { cap: "언제 울릴지는 아무도 몰라요", svg: card(`<path d="M60 22h40M60 98h40M64 22c0 26 32 26 32 38s-32 12-32 38M96 22c0 26-32 26-32 38s32 12 32 38" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M70 92q10-12 20 0z" fill="#e0a640"/><text x="124" y="70" font-size="40" font-weight="900" fill="${PINK}">?</text>`) },
    { cap: "울릴 때 든 사람이 문 열기 당번 — 가장 많으면 꼴찌", svg: card(`<g transform="translate(46 54) scale(.5)">${bell()}</g><path d="M12 34l-6-6M10 54H2M14 74l-6 6M80 34l6-6M82 54h8M78 74l6 6" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><g transform="translate(122 52) scale(.95)">${coco(true)}</g><path d="M104 96h12l-1 13h-10z" fill="#ffb38a" stroke="${INK}" stroke-width="2"/><path d="M114 92l5-5" stroke="#2fb5a8" stroke-width="3" stroke-linecap="round"/>`, "#fff4e3") },
  ];

  mount({
    id: "doorbell", title: "초인종 폭탄", min: 2, max: 4, hidden: false, rules,
    coach: { taps: "이 단추를 여러 번 눌러요", find: "위와 같은 간식을 찾아요", order: "1부터 차례로 눌러요" },
    async start(S: PartyShell) {
      const g = E.create(S.players.length, SEED + (games++) * 7919);
      (window as any).__db = g; // 리그
      (window as any).__dbE = E; // 리그: 시안의 window.PartyDoorbell 자리(봇 보기 열쇠를 E.view 로 잰다 — 모듈이라 전역이 없다)
      const root = document.getElementById("pt-game")!, $ = (id: string): any => document.getElementById(id);
      root.innerHTML = `<div class="db"><div class="db-round" id="db-round"></div><svg class="db-bell" id="db-bell" viewBox="-60 -60 120 120" aria-hidden="true"></svg><div class="db-who" id="db-who" aria-live="polite"></div><div class="db-task" id="db-task"></div><div class="db-msg" id="db-msg" aria-live="assertive"></div></div>`;
      let rang: { rang: number } | null = null, last = 0, raf = 0, turnTok = 0;
      // 시계: 화면이 보이는 동안만(규칙 카드가 열려 있으면 멈춤). 넘기는 사이에도 돈다 — 빨리 넘기는 게 놀이다
      function tick(now: number) {
        raf = requestAnimationFrame(tick);
        const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
        if (S.paused || document.hidden) return;
        const r = E.step(g, dt);
        if (r) { rang = r; cancelAnimationFrame(raf); onRing(); }
      }
      let ringDone: (() => void) | null = null;
      function onRing() {
        S.closeHand(); S.botDone(); turnTok++; $("db-task").style.pointerEvents = "";
        const p = S.players[rang!.rang];
        S.setScore(rang!.rang, g.losses[rang!.rang]); S.sfx("bad"); S.buzz([120, 60, 120, 60, 200]);
        $("db-bell").classList.add("rang"); $("db-bell").setAttribute("viewBox", "-86 -76 154 154"); // 울림 땐 흔들림·코코까지 담게 넓힌다(-60..60 이면 왼쪽이 잘렸다)
        $("db-bell").innerHTML = `<g transform="translate(-16 0)">${bell(p.c)}</g><g transform="translate(40 22) scale(.75)">${coco(true)}</g>`;
        $("db-who").innerHTML = `띵동! 멍멍!<br>${p.name} 문 열기 당번`;
        $("db-task").innerHTML = g.state === "over" ? `<button class="pt-btn db-big" id="db-next">결과 보기</button>` : `<button class="pt-btn db-big" id="db-next">다음 판</button>`;
        $("db-msg").textContent = `${g.round} / ${g.rounds} 판 · 넘김 ${g.passes}번`;
        $("db-next").onclick = () => { const f = ringDone; ringDone = null; if (f) f(); };
      }
      function drawTask() {
        const T = g.task!, p = S.players[g.holder];
        $("db-round").textContent = `${g.round} / ${g.rounds} 판`;
        $("db-bell").classList.remove("rang"); $("db-bell").setAttribute("viewBox", "-60 -60 120 120"); $("db-bell").innerHTML = bell(p.c);
        $("db-who").textContent = `${p.name} 손에 초인종!`;
        $("db-msg").textContent = "";
        const box = $("db-task");
        if (T.kind === "taps") {
          box.innerHTML = `<div class="db-ask">초인종 단추 ${T.need}번</div><button class="pt-btn db-big" id="db-tap">누르기 ${T.need - T.done}</button>`;
          $("db-tap").onclick = () => hit(0);
          if (!S.isBot(g.holder)) S.coach("taps", $("db-tap"), null, { below: true });
        } else if (T.kind === "find") {
          box.innerHTML = `<div class="db-ask">이거 찾기 ${treat(T.target, 1.4)}</div><div class="db-grid">${T.items.map((it, k) => `<button class="db-cell" data-k="${k}" aria-label="${E.ITEMS[it]}">${treat(it, 1.5)}</button>`).join("")}</div>`;
          box.querySelectorAll(".db-cell").forEach((b: any) => (b.onclick = () => hit(+b.dataset.k)));
          if (!S.isBot(g.holder)) S.coach("find", box.querySelector(".db-grid"), null, { below: true });
        } else {
          box.innerHTML = `<div class="db-ask">1 → 4 차례로</div><div class="db-grid">${T.cells.map((v, k) => `<button class="db-cell ${v <= T.done ? "done" : ""}" data-k="${k}">${v}</button>`).join("")}</div>`;
          box.querySelectorAll(".db-cell").forEach((b: any) => (b.onclick = () => hit(+b.dataset.k)));
          if (!S.isBot(g.holder)) S.coach("order", box.querySelector(".db-grid"), null, { below: true });
        }
      }
      let passed: (() => void) | null = null;
      function hit(k: number) {
        const r = E.press(g, k);
        if (!r) return;
        if (!r.ok) { S.sfx("bad"); const b = $("db-task"); b.classList.add("lock"); setTimeout(() => b.classList.remove("lock"), E.RULES.LOCK * 1000); return; }
        S.sfx("tap"); if (!S.isBot(g.holder)) S.coachDone(g.task!.kind);
        if (r.done) { E.pass(g); const f = passed; passed = null; if (f) f(); }
        else if (g.task!.kind === "taps") $("db-tap").textContent = `누르기 ${g.task!.need - g.task!.done}`; // 단추를 다시 만들지 않는다(엄지 아래 단추가 바뀌면 연타가 끊긴다)
        else if (g.task!.kind === "order") $("db-task").querySelector(`.db-cell[data-k="${k}"]`).classList.add("done");
      }
      while (g.state !== "over") {
        E.startRound(g);
        rang = null; last = 0;
        await S.turn(g.holder, `${g.round}판 — 초인종을 받아요`);
        raf = requestAnimationFrame(tick);
        // 판 하나: 일 → 넘김 → 일 … 울릴 때까지
        await new Promise<void>((roundDone) => {
          ringDone = roundDone;
          (async function loop() {
            while (!rang) {
              drawTask();
              const holderNow = g.holder, tok = ++turnTok;
              if (S.isBot(holderNow)) {
                // 봇 차례: 단추는 못 누르게 덮고(pointer-events), 봇은 보이는 일(E.view)만 받아 한 칸씩. 울리면·차례가 바뀌면 멈춘다
                $("db-task").style.pointerEvents = "none";
                (async () => {
                  while (!rang && tok === turnTok && g.state === "hold" && g.holder === holderNow) {
                    const plan = E.bot(E.view(g)!, S.players[holderNow].level, Math.random);
                    S.botWait(holderNow, "누르는 중…"); // 띠만 띄운다(기다림은 아래 plan.delay)
                    await new Promise((r2) => setTimeout(r2, (S.fast ? 0.35 : 1) * plan.delay * 1000));
                    if (rang || tok !== turnTok || g.holder !== holderNow) break;
                    if (g.lock > 0) continue;
                    hit(plan.cell);
                  }
                })();
              } else { $("db-task").style.pointerEvents = ""; S.botDone(); }
              await new Promise<void>((res) => { passed = res; const iv = setInterval(() => { if (rang) { clearInterval(iv); res(); } }, 100); });
              if (rang) return;
              await S.turn(g.holder, "빨리 받아요!");
            }
          })();
        });
      }
      S.end(g.losses, { lowWins: true, fmt: (v) => `당번 ${v}번` });
    },
  });
}
