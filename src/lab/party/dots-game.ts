// 내기 모음 6 「땅따먹기 점 잇기」 — 화면(코코 산책길 텃밭). 규칙은 ./dots.ts(엔진, 화면 모름), 바깥 틀은 ./shell.ts.
// 시안 docs/lab-party-dots-mock.html(md5 789572fd…, 1판 — 봇 자리·아이패드)의 <script> 를 그대로 옮겼다(타입만 붙임). 겉모양은 ./dots.css.
// 규격 docs/lab-party-dots-spec.md. 주소 끝: #reduce · #nocap · #nocoach · #seed=N(첫 차례·새싹 고정 — 리그) · #botfast(봇 0.12초 — 리그)
// 리그가 보는 자리: window.__dt(엔진 상태) · window.__dtTaps(받은 손·막힌 손) · window.__party(틀).
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as E from "./dots.ts";
import { mount, markSVG, type Mark, type PartyShell } from "./shell.ts";

export function initDots() {
  const hash = location.hash;
  const SEED = +((hash.match(/seed=(\d+)/) || [])[1] ?? 0) || ((Math.random() * 1e9) | 0);
  let games = 0;
  const INK = "#3a2228", CREAM = "#fffaf2", LINE = "#ecd3a6", FUR = "#b8643a", FUR2 = "#8e4526", PINK = "#f07a8a", SOIL = "#f4e7cf";
  const U = 100, P = 50; // 말뚝 간격 · 판 둘레 여백(가장자리 선의 누르는 자리가 판 밖으로 반 칸)
  // 텃밭 작물 넷(점수와 무관 — 칸마다 엔진 씨앗으로): 상추 · 당근 · 토마토 · 해바라기
  const CROP = [
    `<path d="M0 14C-14 10-16-4-6-10C-2-14 4-14 6-8C14-10 18 2 10 10C6 14 2 15 0 14z" fill="#7fc76a" stroke="#2f7a3a" stroke-width="2.4"/><path d="M0 13C-1 4 0-4 3-9" stroke="#2f7a3a" stroke-width="2" fill="none"/>`,
    `<path d="M-7-4L7-4L0 18z" fill="#ff9a3c" stroke="#b05a14" stroke-width="2.2" stroke-linejoin="round"/><path d="M0-4L-6-15M0-4L0-17M0-4L6-15" stroke="#47a35a" stroke-width="3.2" stroke-linecap="round"/>`,
    `<circle cy="3" r="11" fill="#e85a5a" stroke="${FUR2}" stroke-width="2.2"/><path d="M0-8l3 5 5-1-4 4 1 5-5-3-5 3 1-5-4-4 5 1z" fill="#47a35a"/><circle cx="-4" cy="2" r="2.4" fill="#fff" opacity=".6"/>`,
    `${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<ellipse cx="0" cy="-10" rx="4.4" ry="7" fill="#ffd36b" stroke="#b07a1c" stroke-width="1.4" transform="rotate(${a})"/>`).join("")}<circle r="7" fill="#8e4526"/><circle cx="-2" cy="-2" r="1.4" fill="#e0a640"/><circle cx="2" cy="1" r="1.4" fill="#e0a640"/>`,
  ];
  // 코코(2D 얼굴): 판 옆에서 지켜본다 · 칸을 닫으면 웃는다
  const coco = (happy: boolean) => `<g><ellipse cx="-22" cy="4" rx="9" ry="16" fill="${FUR2}"/><ellipse cx="22" cy="4" rx="9" ry="16" fill="${FUR2}"/><circle r="24" fill="${FUR}"/><circle cy="-20" r="12" fill="${FUR}"/><ellipse cy="8" rx="12" ry="9" fill="#d98a5a"/><ellipse cy="4" rx="4.5" ry="3.4" fill="${INK}"/>${happy ? `<path d="M-13-2q4-5 8 0M5-2q4-5 8 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M-5 10q5 6 10 0" stroke="${INK}" stroke-width="2.2" fill="${PINK}"/>` : `<circle cx="-9" cy="-2" r="4" fill="${INK}"/><circle cx="9" cy="-2" r="4" fill="${INK}"/><circle cx="-8" cy="-3.5" r="1.4" fill="#fff"/><circle cx="10" cy="-3.5" r="1.4" fill="#fff"/><path d="M-4 10q4 3 8 0" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`}</g>`;
  // 모양 표지를 SVG 안에(틀 markSVG 의 모양 그대로 · 바깥 class 는 떼어 낸다 — .pt-mark 의 CSS 폭이 x·y·width 속성을 덮는다)
  const markIn = (kind: Mark, fill: string, x: number, y: number, s: number) => markSVG(kind, fill).replace(' class="pt-mark"', "").replace("<svg ", `<svg x="${x}" y="${y}" width="${s}" height="${s}" `);

  // ── 규칙 카드 4장(그림만으로) ──
  const card = (inner: string, bg?: string) => `<svg viewBox="0 0 160 120"><rect width="160" height="120" rx="14" fill="${bg || "#dff1ff"}"/>${inner}</svg>`;
  const post = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="5" fill="${CREAM}" stroke="${FUR2}" stroke-width="2.5"/>`;
  const rail = (x1: number, y1: number, x2: number, y2: number, c?: string, w?: number) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c || FUR2}" stroke-width="${w || 5}" stroke-linecap="round"/>`;
  const plot = (x: number, y: number, s: number, c: string, mark: Mark, crop: number) => `<rect x="${x + 3}" y="${y + 3}" width="${s - 6}" height="${s - 6}" rx="6" fill="${c}" fill-opacity=".32"/>${markIn(mark, c, x + 4, y + 4, s * 0.3)}<g transform="translate(${x + s / 2 + 3} ${y + s / 2 + 3}) scale(${s / 52})">${CROP[crop]}</g>`;
  const finger = (x: number, y: number, c: string) => `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${c}" stroke-width="2.5" opacity=".6"/><path d="M${x + 3} ${y + 2}l0-16a4 4 0 0 1 8 0v12l8 2a5 5 0 0 1 4 6l-3 14h-17l-6-12a3.5 3.5 0 0 1 6-3z" fill="${CREAM}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
  const person = (x: number, y: number, c: string) => `<circle cx="${x}" cy="${y}" r="9" fill="${c}"/><rect x="${x - 11}" y="${y + 10}" width="22" height="18" rx="9" fill="${c}"/>`;
  const again = (x: number, y: number, c: string) => `<path d="M${x - 12} ${y}A12 12 0 1 0 ${x + 1} ${y - 12}" stroke="${c}" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M${x + 2} ${y - 19}L${x + 2} ${y - 5}L${x - 7} ${y - 12}z" fill="${c}"/>`; // 한 바퀴 돌아오는 화살표(한 번 더)
  const rules = [
    { cap: "차례마다 이웃한 점 둘 사이에 선 하나", svg: card(`${[30, 70, 110].map((x) => post(x, 34) + post(x, 74)).join("")}${rail(30, 34, 70, 34, LINE, 3)}${rail(70, 74, 110, 74, LINE, 3)}${rail(30, 34, 30, 74)}${rail(70, 34, 110, 34, PINK, 6)}${finger(92, 46, PINK)}`) },
    { cap: "네 번째 선으로 닫으면 내 텃밭 · 한 번 더!", svg: card(`${plot(26, 26, 56, PINK, "circle", 0)}${rail(26, 26, 82, 26)}${rail(26, 26, 26, 82)}${rail(26, 82, 82, 82)}${rail(82, 26, 82, 82, PINK, 6)}${[[26, 26], [82, 26], [26, 82], [82, 82]].map(([x, y]) => post(x, y)).join("")}${person(124, 40, PINK)}${again(124, 92, PINK)}`, "#fff4e3") },
    { cap: "세 번째 선을 그으면 다음 사람이 닫아 가요", svg: card(`${rail(14, 34, 54, 34)}${rail(14, 34, 14, 74)}${rail(54, 34, 54, 74, PINK, 6)}${rail(14, 74, 54, 74, LINE, 3)}${[[14, 34], [54, 34], [14, 74], [54, 74]].map(([x, y]) => post(x, y)).join("")}${person(34, 92, PINK)}<path d="M64 56h22" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/><path d="M80 49l7 7-7 7" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${plot(98, 34, 40, "#2fb5a8", "tri", 1)}${rail(98, 34, 138, 34)}${rail(98, 34, 98, 74)}${rail(138, 34, 138, 74)}${rail(98, 74, 138, 74, "#2fb5a8", 6)}${[[98, 34], [138, 34], [98, 74], [138, 74]].map(([x, y]) => post(x, y)).join("")}${person(118, 92, "#2fb5a8")}`) },
    { cap: "선을 다 그으면 텃밭이 가장 적은 사람이 꼴찌", svg: card(`<rect x="22" y="34" width="24" height="56" rx="5" fill="#2fb5a8"/><rect x="54" y="52" width="24" height="38" rx="5" fill="#e0a640"/><rect x="86" y="74" width="24" height="16" rx="5" fill="${PINK}"/>${[[34, 26, 0], [66, 44, 2]].map(([x, y, k]) => `<g transform="translate(${x} ${y}) scale(.55)">${CROP[k]}</g>`).join("")}<path d="M118 70h20l-2 22h-16z" fill="#ffb38a" stroke="${INK}" stroke-width="2.4"/><path d="M134 64l-4 6" stroke="#2fb5a8" stroke-width="3" stroke-linecap="round"/><path d="M98 98v6" stroke="${INK}" stroke-width="2.4"/><path d="M14 98h132" stroke="${LINE}" stroke-width="3" stroke-linecap="round"/>`, "#fff4e3") },
  ];

  mount({
    id: "dots", title: "땅따먹기 점 잇기", min: 2, max: 4, hidden: false, rules,
    coach: { draw: "점 둘 사이를 눌러 선을 그어요 — 누른 채 밀면 옆 선으로", again: "칸을 닫았어요 — 한 번 더 그어요" },
    async start(S: PartyShell) {
      const g = E.create(S.players.length, SEED + (games++) * 7919); // 한 판 더는 다른 씨앗(첫 차례·새싹이 바뀐다)
      (window as any).__dt = g; // 리그
      const T = E.topo(g.R, g.C), W = g.C * U + 2 * P, H = g.R * U + 2 * P;
      const taps = ((window as any).__dtTaps = { ok: 0, blocked: 0 }); // 리그: 받아들인 사람 손 · 막힌 손(봇 차례)
      const root = document.getElementById("pt-game")!, $ = (id: string): any => document.getElementById(id);
      root.innerHTML = `<div class="dt">
        <div class="dt-head"><svg viewBox="-34 -40 68 70" aria-hidden="true" id="dt-coco"></svg><div class="dt-say"><div class="dt-who" id="dt-who" aria-live="polite"></div><div class="dt-sub" id="dt-sub"></div></div></div>
        <div class="dt-board" id="dt-board" style="--asp:${(W / H).toFixed(3)}"><svg id="dt-svg" viewBox="${-P} ${-P} ${W} ${H}" role="img" aria-label="점 잇기 텃밭 ${g.R}×${g.C}"></svg></div>
        <div class="dt-toast" id="dt-toast" aria-live="assertive"></div>
      </div>`;
      const svg = $("dt-svg");
      // 층: 흙 바탕 · 텃밭 칸 · 안 그은 자리(점선) · 그은 울타리 · 말뚝 · 미리 보기 · 누르는 자리(맨 위, 투명)
      const mid = (l: number) => { const [[x1, y1], [x2, y2]] = T.ends[l]; return [((x1 + x2) / 2) * U, ((y1 + y2) / 2) * U]; };
      // 누르는 자리: 선 가운데를 중심으로 한 마름모(반지름 U/2) — 판 전체가 빈틈없이 가장 가까운 선으로 나뉜다(칸마다 대각선 넷 조각)
      const hitPts = (l: number) => { const [cx, cy] = mid(l), h = U / 2; return `${cx - h},${cy} ${cx},${cy - h} ${cx + h},${cy} ${cx},${cy + h}`; };
      let posts = "";
      for (let r = 0; r <= g.R; r++) for (let c = 0; c <= g.C; c++) posts += `<circle cx="${c * U}" cy="${r * U}" r="10" fill="${CREAM}" stroke="${FUR2}" stroke-width="5"/>`;
      svg.innerHTML = `<rect x="${-P + 6}" y="${-P + 6}" width="${W - 12}" height="${H - 12}" rx="34" fill="#cfe9b4" stroke="#9fd08a" stroke-width="4"/>
        <rect x="-16" y="-16" width="${g.C * U + 32}" height="${g.R * U + 32}" rx="22" fill="${SOIL}"/>
        <g id="dt-boxes"></g><g id="dt-guides"></g><g id="dt-lines"></g><g>${posts}</g>
        <path id="dt-pre" d="" stroke-width="16" stroke-linecap="round" opacity=".55" pointer-events="none"/>
        <g id="dt-hits">${Array.from({ length: T.L }, (_, l) => `<polygon class="dt-hit" data-l="${l}" points="${hitPts(l)}"/>`).join("")}</g>`;
      const seg = (l: number) => { const [[x1, y1], [x2, y2]] = T.ends[l]; return `M${x1 * U} ${y1 * U}L${x2 * U} ${y2 * U}`; };
      let hl: number[] = [], hlP = -1, popBoxes: number[] = [];
      // 그리기: 단추·누르는 자리는 다시 만들지 않는다(그은 선의 자리만 숨긴다 — 누를 때마다 다시 만들면 연타·밀기가 끊긴다)
      function draw() {
        let gd = "", ln = "", bx = "";
        for (let l = 0; l < T.L; l++) {
          if (g.lines[l] < 0) gd += `<path d="${seg(l)}" stroke="#d9b27f" stroke-width="6" stroke-dasharray="3 13" stroke-linecap="round"/>`;
          else if (!hl.includes(l)) ln += `<path d="${seg(l)}" stroke="${FUR2}" stroke-width="10" stroke-linecap="round"/>`;
        }
        // 방금 차례에 그은 선(들)은 그 사람 색으로 — 폰을 받은 사람이 무엇이 바뀌었는지 보게
        for (const l of hl) ln += `<path class="${hlP === g.last?.p ? "dt-new" : ""}" d="${seg(l)}" stroke="${S.players[hlP].c}" stroke-width="13" stroke-linecap="round"/><path d="${seg(l)}" stroke="${S.players[hlP].ink}" stroke-width="4" stroke-linecap="round" opacity=".5"/>`;
        for (let b = 0; b < T.B; b++) {
          const o = g.boxes[b]; if (o < 0) continue;
          const p = S.players[o], x = (b % g.C) * U, y = Math.floor(b / g.C) * U;
          // 자리는 바깥 g 의 transform 속성, 튀어 오르기는 안쪽 g 의 CSS(한 g 에 둘 다 두면 CSS 가 자리를 지운다)
          bx += `<g transform="translate(${x} ${y})" data-box="${b}" data-o="${o}"><g class="${popBoxes.includes(b) ? "dt-pop" : ""}"><rect class="dt-own" x="8" y="8" width="${U - 16}" height="${U - 16}" rx="14" fill="${p.c}" fill-opacity=".34" stroke="${p.c}" stroke-width="3"/>${markIn(p.mark, p.ink, 12, 12, 30)}<g transform="translate(56 58) scale(1.35)">${CROP[g.crop[b]]}</g></g></g>`;
        }
        $("dt-guides").innerHTML = gd; $("dt-lines").innerHTML = ln; $("dt-boxes").innerHTML = bx;
        svg.querySelectorAll(".dt-hit").forEach((h: any) => { h.style.display = g.lines[+h.dataset.l] >= 0 ? "none" : ""; });
        const left = T.B - g.scores.reduce((a, v) => a + v, 0);
        $("dt-sub").textContent = `남은 칸 ${left} · 남은 선 ${T.L - g.moves}`;
        popBoxes = [];
      }
      const head = (txt: string, happy: boolean) => { $("dt-who").textContent = txt; $("dt-coco").innerHTML = coco(happy); };
      const wait = (ms: number) => new Promise((r) => setTimeout(r, document.body.classList.contains("reduce") ? Math.min(ms, 200) : ms));

      // 한 수: 사람 손과 봇이 같은 길로(화면 결과가 같게)
      let onMove: ((r: E.PlayResult) => void) | null = null;
      function commit(l: number) {
        const p = g.turn, r = E.play(g, l);
        if (!r) return null;
        if (hlP !== p) { hl = []; hlP = p; }
        hl.push(l);
        if (r.closed.length) {
          popBoxes = r.closed.slice(); S.setScore(p, g.scores[p]); S.sfx("ok"); S.buzz(40);
          $("dt-toast").textContent = `텃밭 ${r.closed.length > 1 ? "두 칸" : "한 칸"}! ${r.over ? "울타리 끝" : S.players[p].name + " 한 번 더"}`;
        } else { S.sfx("tap"); $("dt-toast").textContent = ""; }
        draw();
        head(r.over ? "울타리 완성!" : r.again ? `${S.players[p].name} 한 번 더!` : `${S.players[g.turn].name} 차례`, r.closed.length > 0);
        if (onMove) onMove(r);
        return r;
      }

      // 사람 손: 누르면 가장 가까운 선이 미리 보이고, 누른 채 밀면 옆 선으로 옮겨 가고, 떼면 긋는다. 판 밖에서 떼면 취소
      let live = false, pre = -1, allow = false;
      const lineAt = (x: number, y: number) => { const el: any = document.elementFromPoint(x, y); return el && el.classList && el.classList.contains("dt-hit") ? +el.dataset.l : -1; };
      const showPre = (l: number) => { pre = l; const e = $("dt-pre"); e.setAttribute("d", l >= 0 ? seg(l) : ""); e.setAttribute("stroke", S.players[g.turn].c); e.dataset.l = l; };
      svg.addEventListener("pointerdown", (e: PointerEvent) => {
        if (!allow || S.isBot(g.turn)) { taps.blocked++; return; }
        const l = lineAt(e.clientX, e.clientY); if (l < 0) return;
        live = true; showPre(l); try { svg.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
      });
      svg.addEventListener("pointermove", (e: PointerEvent) => { if (live) showPre(lineAt(e.clientX, e.clientY)); });
      const up = (e: PointerEvent, cancel: boolean) => {
        if (!live) return; live = false;
        const l = cancel ? -1 : lineAt(e.clientX, e.clientY); showPre(-1);
        if (l < 0 || !allow || S.isBot(g.turn)) return;
        if (commit(l)) taps.ok++;
      };
      svg.addEventListener("pointerup", (e: PointerEvent) => up(e, false));
      svg.addEventListener("pointercancel", (e: PointerEvent) => up(e, true));
      void pre;

      head(`${S.players[g.turn].name} 먼저`, false); draw();
      let turnTok = 0;
      while (g.state !== "over") {
        const who = g.turn, tok = ++turnTok; // 차례 표: 넘기기 덮개보다 먼저 올린다(앞 봇 루프가 덮개 동안 사람 차례에 두던 함정)
        allow = false; $("dt-board").classList.add("dt-lock");
        await S.turn(who);
        head(`${S.players[who].name} 차례`, false);
        await new Promise<void>((done) => {
          onMove = (r) => {
            if (!S.isBot(who)) {
              S.coachDone("draw"); S.coachDone("again");
              if (r.again) S.coach("again", $("dt-board"), null, { below: true });
            }
            if (!r.again) { onMove = null; allow = false; $("dt-board").classList.add("dt-lock"); done(); } // 차례 끝: 바로 잠근다(넘기기 전 0.38초 동안 눌린 손은 버려진다 — 리그가 「안 잠겼는데 안 받음」 으로 잡았다)
          };
          if (S.isBot(who)) {
            // 봇 차례: 판은 잠그고(사람 손 막기), 「생각 중…」 뒤 한 선씩. 칸을 닫으면 같은 봇이 이어 둔다
            (async () => {
              while (g.state === "turn" && g.turn === who && tok === turnTok) {
                await S.botWait(who, "어디에 그을까…");
                if (g.state !== "turn" || g.turn !== who || tok !== turnTok) break;
                commit(E.bot(E.view(g), S.players[who].level, Math.random));
                await wait(S.fast || /botfast/.test(hash) ? 60 : 260);
              }
              if (tok === turnTok) S.botDone();
            })();
            return;
          }
          S.botDone();
          allow = true; $("dt-board").classList.remove("dt-lock");
          S.coach("draw", $("dt-board"), null, { below: true });
        });
        if ((g.state as string) !== "over") await wait(S.fast || /botfast/.test(hash) ? 60 : 380); // 마지막 선을 잠깐 보여 주고 넘긴다
      }
      S.botDone();
      await wait(700);
      S.end(g.scores, { fmt: (v) => `텃밭 ${v}칸` });
    },
  });
}
