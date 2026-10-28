// 내기 모음 3 「한 칸 더?」 — 화면(코코 간식 접시). 규칙은 ./pushluck.ts(엔진, 화면 모름), 바깥 틀은 ./shell.ts.
// 시안 docs/lab-party-pushluck-mock.html(md5 adf31d38…, 1.1판 — 봇 자리)의 <script> 를 그대로 옮겼다(타입만 붙임). 겉모양은 ./pushluck.css.
// 규격 docs/lab-party-pushluck-spec.md. 주소 끝: #reduce · #nocap · #nocoach · #seed=N(주사위 고정 — 리그) · #botfast(봇 0.12초 — 리그)
// 리그가 보는 자리: window.__pl(엔진 상태) · window.__party(틀).
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as E from "./pushluck.ts";
import { mount, type PartyShell } from "./shell.ts";

type Mood = "calm" | "stare" | "grab" | "happy";

export function initPushluck() {
  const hash = location.hash;
  const SEED = +((hash.match(/seed=(\d+)/) || [])[1] ?? 0) || ((Math.random() * 1e9) | 0);
  let round0 = 0;
  const SLOT: [number, number][] = [[-100, 40], [-54, -6], [54, -6], [100, 40], [54, 88], [-54, 88]]; // 눈 1→6, 가운데(0,40)는 주사위
  const INK = "#3a2228", CREAM = "#fffaf2", LINE = "#ecd3a6", FUR = "#b8643a", FUR2 = "#8e4526", PINK = "#f07a8a";
  // ── 간식 그림 6(눈 1–6): 개껌 · 사과 · 상추 · 쿠키 · 고기 · 치즈. 숫자는 그림 밑 작은 점 — 눈 = 간식 수 ──
  const TREAT: ((s: number) => string)[] = [
    (s: number) => `<g transform="scale(${s})"><path d="M-14-4a5 5 0 1 1 6-4h16a5 5 0 1 1 6 4 5 5 0 1 1-6 4H-8a5 5 0 1 1-6-4z" fill="#f6e3c4" stroke="${FUR2}" stroke-width="2"/></g>`,
    (s: number) => `<g transform="scale(${s})"><circle r="11" fill="#e85a5a" stroke="${FUR2}" stroke-width="2"/><path d="M0-11q2-6 6-7" stroke="${FUR2}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M2-12q6-6 10-2q-6 4-10 2z" fill="#47a35a"/><circle cx="-4" cy="-3" r="2.5" fill="#fff" opacity=".7"/></g>`,
    (s: number) => `<g transform="scale(${s})"><path d="M0 13C-12 8-14-6-6-12C0-15 8-12 10-4C12 6 6 11 0 13z" fill="#7fc76a" stroke="#2f7a3a" stroke-width="2"/><path d="M0 12C-1 2 0-6 3-11" stroke="#2f7a3a" stroke-width="1.8" fill="none"/></g>`,
    (s: number) => `<g transform="scale(${s})"><circle r="12" fill="#e0a640" stroke="${FUR2}" stroke-width="2"/><circle cx="-4" cy="-3" r="2.2" fill="${FUR2}"/><circle cx="4" cy="2" r="2.2" fill="${FUR2}"/><circle cx="-2" cy="6" r="1.8" fill="${FUR2}"/><circle cx="5" cy="-6" r="1.6" fill="${FUR2}"/></g>`,
    (s: number) => `<g transform="scale(${s})"><path d="M-10 6C-14-2-8-12 2-11C11-10 13 0 8 6C4 11-6 12-10 6z" fill="#c43a48" stroke="${FUR2}" stroke-width="2"/><path d="M-4-2q6-3 10 2" stroke="#ffb38a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M8 6l7 6" stroke="${CREAM}" stroke-width="4" stroke-linecap="round"/><circle cx="16" cy="13" r="3" fill="${CREAM}" stroke="${FUR2}" stroke-width="1.5"/></g>`,
    (s: number) => `<g transform="scale(${s})"><path d="M-12 8L12 8L12-2L-12-10z" fill="#ffd36b" stroke="#b07a1c" stroke-width="2" stroke-linejoin="round"/><path d="M-12-10L12-2" stroke="#b07a1c" stroke-width="2"/><circle cx="-4" cy="2" r="2.2" fill="#e0a640"/><circle cx="5" cy="4" r="1.6" fill="#e0a640"/></g>`,
  ];
  function pips(n: number, s: number): string { const P = ({ 1: [[0, 0]], 2: [[-4, -4], [4, 4]], 3: [[-5, -5], [0, 0], [5, 5]], 4: [[-4, -4], [4, -4], [-4, 4], [4, 4]], 5: [[-5, -5], [5, -5], [0, 0], [-5, 5], [5, 5]], 6: [[-4, -6], [4, -6], [-4, 0], [4, 0], [-4, 6], [4, 6]] } as Record<number, number[][]>)[n]; return P.map(([x, y]) => `<circle cx="${x * s}" cy="${y * s}" r="${1.7 * s}" fill="${INK}"/>`).join(""); }
  // 코코(2D 얼굴): mood = calm · stare(경고) · grab(뺏음) · happy(멈춤)
  function coco(mood: Mood): string {
    const eye = mood === "stare" ? `<ellipse cx="-9" cy="-2" rx="4.5" ry="5.5" fill="${INK}"/><ellipse cx="9" cy="-2" rx="4.5" ry="5.5" fill="${INK}"/><circle cx="-8" cy="-4" r="1.6" fill="#fff"/><circle cx="10" cy="-4" r="1.6" fill="#fff"/><path d="M-15-10l8 3M15-10l-8 3" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`
      : mood === "happy" ? `<path d="M-13-2q4-5 8 0M5-2q4-5 8 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
      : `<circle cx="-9" cy="-2" r="4" fill="${INK}"/><circle cx="9" cy="-2" r="4" fill="${INK}"/><circle cx="-8" cy="-3.5" r="1.4" fill="#fff"/><circle cx="10" cy="-3.5" r="1.4" fill="#fff"/>`;
    const mouth = mood === "grab" ? `<ellipse cx="0" cy="12" rx="7" ry="5" fill="${INK}"/><path d="M-5 9h10" stroke="#fff" stroke-width="2"/>` : mood === "happy" ? `<path d="M-5 9q5 6 10 0" stroke="${INK}" stroke-width="2.2" fill="${PINK}"/>` : `<path d="M-4 10q4 3 8 0" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    return `<g class="pl-coco ${mood === "stare" ? "stare" : ""}"><ellipse cx="-22" cy="4" rx="9" ry="16" fill="${FUR2}"/><ellipse cx="22" cy="4" rx="9" ry="16" fill="${FUR2}"/><circle r="24" fill="${FUR}"/><circle cy="-20" r="12" fill="${FUR}"/><ellipse cy="8" rx="12" ry="9" fill="#d98a5a"/><ellipse cy="4" rx="4.5" ry="3.4" fill="${INK}"/>${eye}${mouth}</g>`;
  }
  // 규칙 카드 4장(그림만으로): ① 굴리면 간식이 접시에 ② 같은 간식이 또 → 코코가 노려봄 ③ 또 겹치면 접시를 뺏김(0) ④ 멈추면 내 점수, 끝에 가장 적으면 꼴찌
  const card = (inner: string, bg?: string) => `<svg viewBox="0 0 160 120"><rect width="160" height="120" rx="14" fill="${bg || "#dff1ff"}"/>${inner}</svg>`;
  const plate = (x: number, y: number, r: number) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.42}" fill="${CREAM}" stroke="${LINE}" stroke-width="3"/>`;
  const die = (x: number, y: number, n: number, c?: string) => `<g transform="translate(${x} ${y})"><rect x="-13" y="-13" width="26" height="26" rx="6" fill="${CREAM}" stroke="${c || INK}" stroke-width="2.5"/>${pips(n, 1)}</g>`;
  const arrow = (x1: number, y1: number, x2: number, y2: number) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M${x2} ${y2}l-7-3m7 3-3 7" stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none" transform="rotate(${(Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI - 45} ${x2} ${y2})"/>`;
  const rules = [
    { cap: "굴리면 그 눈만큼 간식이 접시에", svg: card(`${die(32, 50, 4)}${arrow(52, 50, 74, 64)}${plate(112, 76, 36)}${[[-14, -2], [0, -6], [14, -2], [0, 4]].map(([dx, dy]) => `<g transform="translate(${112 + dx} ${72 + dy})">${TREAT[3](0.55)}</g>`).join("")}`) },
    { cap: "같은 간식이 또 나오면 코코가 노려봐요", svg: card(`${plate(54, 80, 34)}<g transform="translate(44 72)">${TREAT[1](0.8)}</g><g transform="translate(66 72)">${TREAT[4](0.8)}</g>${die(54, 30, 2, PINK)}<g transform="translate(122 62) scale(1.05)">${coco("stare")}</g>`, "#fff4e3") },
    { cap: "한 번 더 겹치면 접시를 뺏겨요 — 이번 차례 0", svg: card(`${plate(46, 84, 30)}<g transform="translate(118 58) scale(1.05)">${coco("grab")}</g><g transform="translate(100 92) rotate(-18)">${TREAT[1](0.7)}</g><g transform="translate(120 98) rotate(14)">${TREAT[4](0.7)}</g><text x="46" y="52" text-anchor="middle" font-size="26" font-weight="900" fill="${PINK}">0</text>`) },
    { cap: "멈추면 접시가 내 것 · 끝에 가장 적으면 꼴찌", svg: card(`<rect x="14" y="40" width="54" height="40" rx="20" fill="#ffd36b" stroke="#b07a1c" stroke-width="2.5"/><rect x="30" y="54" width="22" height="12" rx="3" fill="${INK}"/>${arrow(72, 60, 92, 60)}<rect x="96" y="30" width="16" height="56" rx="4" fill="#2fb5a8"/><rect x="116" y="48" width="16" height="38" rx="4" fill="#e0a640"/><rect x="136" y="70" width="16" height="16" rx="4" fill="${PINK}"/><path d="M138 96h12l-1 12h-10z" fill="#ffb38a" stroke="${INK}" stroke-width="2"/>`, "#fff4e3") },
  ];

  mount({
    id: "pushluck", title: "한 칸 더?", min: 2, max: 4, hidden: false, rules,
    coach: { roll: "눌러서 굴려요", stop: "여기서 멈추면 접시가 내 것", warn: "코코가 노려봐요 — 또 겹치면 뺏겨요" },
    async start(S: PartyShell) {
      const g = E.create(S.players.length, SEED + (round0++) * 7919); // 한 판 더는 다른 주사위(같은 씨앗이면 똑같은 판이 되풀이된다)
      (window as any).__pl = g; // 리그
      const root = document.getElementById("pt-game")!;
      root.innerHTML = `<div class="pl">
        <div class="pl-round" id="pl-round"></div>
        <div class="pl-stage"><svg id="pl-svg" viewBox="-150 -150 300 300" role="img" aria-label="간식 접시"></svg></div>
        <div class="pl-pot" id="pl-pot" aria-live="polite"></div>
        <div class="pl-risk" id="pl-risk"></div>
        <div class="pl-toast" id="pl-toast" aria-live="assertive"></div>
        <div class="pl-acts"><button class="pt-btn ghost" id="pl-stop">멈춤</button><button class="pt-btn" id="pl-roll">한 칸 더!</button></div>
      </div>`;
      const $ = (id: string): any => document.getElementById(id);
      let mood: Mood = "calm", dieFace = 0, popAt = -1;
      function draw() {
        const p = S.players[g.turn];
        $("pl-round").textContent = `${Math.min(g.round, g.rounds)} / ${g.rounds} 바퀴 · ${p.name} 차례`;
        // 접시 + 여섯 칸(눈 순서로 둘레에) + 가운데 주사위 + 위쪽 코코
        let s = `<ellipse cx="0" cy="40" rx="128" ry="72" fill="${CREAM}" stroke="${LINE}" stroke-width="5"/><ellipse cx="0" cy="40" rx="104" ry="56" fill="none" stroke="${LINE}" stroke-width="2" stroke-dasharray="4 6"/>`;
        for (let f = 1; f <= 6; f++) {
          const [x, y] = SLOT[f - 1]; // 접시 둘레 육각 자리(삼각함수 고리는 위쪽 두 칸이 주사위·서로에 닿았다)
          const have = g.plate.includes(f);
          // 자리는 바깥 g 의 transform 속성, 튀어 오르기는 안쪽 g 의 CSS — 한 g 에 둘 다 두면 CSS transform 이 자리를 지워 방금 찬 칸이 (0,0)=주사위 위로 갔다
          s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><g class="pl-slot ${popAt === f ? "pop" : ""}">${have ? `<circle r="24" fill="#fff4e3" stroke="${p.c}" stroke-width="3"/>${TREAT[f - 1](1.15)}` : `<circle r="22" fill="#fff" stroke="${LINE}" stroke-width="2" stroke-dasharray="3 4"/><g opacity=".45">${pips(f, 1.2)}</g>`}</g></g>`;
        }
        s += `<g transform="translate(0 40)">${dieFace ? `<g class="pl-die ${dieFace ? "roll" : ""}"><rect x="-24" y="-24" width="48" height="48" rx="11" fill="#fff" stroke="${p.c}" stroke-width="4"/>${pips(dieFace, 2)}</g>` : ""}</g>`;
        s += `<g transform="translate(0 -88) scale(1.7)">${coco(mood)}</g>`;
        $("pl-svg").innerHTML = s;
        $("pl-pot").innerHTML = `${g.pot}<small>이번 차례 · 합계 ${g.scores[g.turn]}</small>`;
        // 겹칠 확률: 찬 칸 수 / 6 — 경고 뒤면 빨강 점이 「터짐」 이라는 뜻
        $("pl-risk").innerHTML = `${g.warn ? "뺏길" : "노려볼"} 확률 ` + Array.from({ length: 6 }, (_, i) => `<i class="${i < g.plate.length ? "on" : ""}"></i>`).join("") + ` ${g.plate.length}/6`;
        $("pl-stop").disabled = !g.plate.length || g.state !== "turn";
        $("pl-roll").disabled = g.state !== "turn";
      }
      const wait = (ms: number) => new Promise((r) => setTimeout(r, document.body.classList.contains("reduce") ? Math.min(ms, 250) : ms));
      // 굴림·멈춤 — 사람 단추와 봇이 같은 길로(화면 결과가 같게)
      const bot = () => S.isBot(g.turn);
      async function doRoll(done: () => void) {
        if (g.state !== "turn") return;
        if (!bot()) S.coachDone("roll");
        const r = E.roll(g)!; dieFace = r.face; popAt = r.warn || r.bust ? -1 : r.face;
        S.sfx(r.bust ? "bad" : "tap");
        if (r.warn) { mood = "stare"; $("pl-toast").textContent = `${E.TREATS[r.face - 1]} 또! 코코가 노려봐요`; S.buzz(60); }
        else if (r.bust) { mood = "grab"; $("pl-toast").textContent = `코코가 접시를 낚아챘다 — 이번 차례 0`; S.buzz([80, 40, 80]); }
        else if (r.full) { mood = "happy"; $("pl-toast").textContent = `한 바퀴! 덤 +${E.RULES.BONUS}`; S.sfx("ok"); }
        else $("pl-toast").textContent = `${E.TREATS[r.face - 1]} ${r.face}개`;
        draw();
        // 말풍선은 사람 차례에만, 단추 아래에(위의 접시 점수·알림 줄을 가리지 않게). 뺏기면 걸려 있던 말풍선은 내린다(다음에 다시 뜬다)
        if (r.bust) { S.coachDone("stop", true); S.coachDone("warn", true); }
        else if (!bot() && r.warn) S.coach("warn", $("pl-stop"), null, { below: true });
        else if (!bot() && g.plate.length >= 2 && g.state === "turn") S.coach("stop", $("pl-stop"), null, { below: true });
        if (g.state !== "turn") { S.setScore(g.turn, g.scores[g.turn]); await wait(S.fast ? 300 : 1300); done(); }
      }
      async function doStop(done: () => void) {
        if (!E.stop(g)) return;
        if (!bot()) { S.coachDone("stop"); S.coachDone("warn", true); }
        mood = "happy"; S.sfx("ok"); $("pl-toast").textContent = `접시를 챙겼다!`;
        S.setScore(g.turn, g.scores[g.turn]); draw();
        await wait(S.fast ? 250 : 900); done();
      }
      let turnTok = 0;
      while (g.state !== "over") {
        turnTok++; // 넘기기 덮개보다 먼저 — 덮개가 떠 있는 동안 앞 봇의 루프가 사람 차례에 한 수 두던 것을 막는다(리그 mixed 판에서 멈춤)
        await S.turn(g.turn);
        mood = "calm"; dieFace = 0; $("pl-toast").textContent = ""; draw();
        await new Promise<void>((done) => {
          if (bot()) {
            // 봇 차례: 단추는 꺼 두고, 「생각 중…」 뒤 한 수씩. 봇은 화면에 보이는 것(viewOf)만 받는다
            $("pl-roll").disabled = $("pl-stop").disabled = true; $("pl-roll").onclick = $("pl-stop").onclick = null;
            // 이 차례 표(tok): 봇의 마지막 수가 차례를 끝낸 뒤 다음(사람) 차례의 단추를 끄거나 띠를 내리던 경합을 막는다
            const tok = ++turnTok;
            (async () => { while (g.state === "turn" && tok === turnTok) { await S.botWait(g.turn, g.plate.length ? "한 칸 더? 고민 중…" : "굴리는 중…"); if (g.state !== "turn" || tok !== turnTok) break; if (E.bot(E.viewOf(g), S.players[g.turn].level) === "stop") await doStop(done); else { await doRoll(done); if (g.state === "turn" && tok === turnTok) { $("pl-roll").disabled = $("pl-stop").disabled = true; } } } if (tok === turnTok) S.botDone(); })();
            return;
          }
          S.botDone();
          S.coach("roll", $("pl-roll"), null, { below: true });
          $("pl-roll").onclick = () => doRoll(done);
          $("pl-stop").onclick = () => doStop(done);
        });
        E.next(g);
      }
      S.end(g.scores);
    },
  });
}
