// 내기 모음 7 「비밀 경매」 — 화면(코코 장터 몰래 경매). 규칙은 ./auction.ts(엔진, 화면 모름), 바깥 틀은 ./shell.ts.
// 시안 docs/lab-party-auction-mock.html(md5 b139766d…, 1판 — 틀 2판 봇 자리·아이패드)의 <script> 를 그대로 옮겼다(타입만 붙임). 겉모양은 ./auction.css.
// 규격 docs/lab-party-auction-spec.md. 주소 끝: #reduce · #nocap · #nocoach · #botfast · #seed=N(엔진 씨앗 고정 — 리그)
// 리그가 보는 자리: window.__au(엔진 상태) · window.__auE(엔진 모듈 — 시안의 window.PartyAuction) · window.__auRender(공개 정보 다시 그리기) · window.__party(틀).
// 🔴 숨은 값: 이번 물건에 남이 낸 수(엔진 g.bids). 공개 전에는 화면(글자·속성·클래스) 어디에도 그리지 않는다 — 「냈어요」 표시만. 봇은 E.view(g, i) 만 받는다.
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as E from "./auction.ts";
import { mount, type PartyShell } from "./shell.ts";

export function initAuction() {
  const hash = location.hash;
  const SEED = +((hash.match(/seed=(\d+)/) || [])[1] ?? 0) || ((Math.random() * 1e9) | 0);
  let games = 0;
  (window as any).__auE = E; // 리그: 시안의 window.PartyAuction 자리
  const INK = "#3a2228", FUR = "#b8643a", FUR2 = "#8e4526";
  const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] as string);
  // ── 그림 ──
  // 물건 12 (viewBox -20 -20 40 40) — POOL 순서
  const ART = [
    `<ellipse cx="-3" cy="6" rx="14" ry="9" fill="#ffd36b" stroke="#b07a1c" stroke-width="2"/><circle cx="6" cy="-6" r="7.5" fill="#ffd36b" stroke="#b07a1c" stroke-width="2"/><path d="M12.5-7l7 2.5-7 2.5z" fill="#f08a3a" stroke="#b05a1c" stroke-width="1.2" stroke-linejoin="round"/><circle cx="7.5" cy="-8" r="1.7" fill="${INK}"/><path d="M-12 4q6 5 13 0" stroke="#b07a1c" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    `<circle r="13" fill="#d8ec5a" stroke="#7a8a1c" stroke-width="2"/><path d="M-9-9.5q7 9.5 0 19M9-9.5q-7 9.5 0 19" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
    `<path d="M-9 9 9-9" stroke="#e85a5a" stroke-width="7.5" stroke-linecap="round"/><path d="M-9 9 9-9" stroke="#fff" stroke-width="7.5" stroke-dasharray="2.5 3.5"/><circle cx="-11" cy="11" r="5.5" fill="#2fb5a8" stroke="#15665f" stroke-width="2"/><circle cx="11" cy="-11" r="5.5" fill="#2fb5a8" stroke="#15665f" stroke-width="2"/>`,
    `<ellipse cy="2" rx="16" ry="7" fill="#2fb5a8" stroke="#15665f" stroke-width="2"/><ellipse cy="1" rx="9" ry="3.4" fill="none" stroke="#bff0ea" stroke-width="2"/><path d="M-15-8h-4M-13-12h-3M15-9h3" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`,
    `<g transform="rotate(-28)"><rect x="-15" y="-5" width="30" height="10" rx="5" fill="#f6e3c4" stroke="${FUR2}" stroke-width="2"/><path d="M-8-5l4 10M0-5l4 10M8-5l3 8" stroke="#d9b27f" stroke-width="2"/></g>`,
    `<g transform="rotate(-12)"><rect x="-14" y="-9" width="22" height="8" rx="3" fill="#f0a24a" stroke="#8e4526" stroke-width="1.8"/><rect x="-8" y="1" width="22" height="8" rx="3" fill="#f6b85c" stroke="#8e4526" stroke-width="1.8"/><path d="M-14-9h22M-8 1h22" stroke="#8b4a9a" stroke-width="2.4"/></g>`,
    `<path d="M-13-2 3-11 14-4V9H-13z" fill="#ffd36b" stroke="#b07a1c" stroke-width="2" stroke-linejoin="round"/><path d="M-13-2H14" stroke="#b07a1c" stroke-width="1.6"/><circle cx="-5" cy="4" r="2.4" fill="#e0a640"/><circle cx="6" cy="3" r="1.8" fill="#e0a640"/><circle cx="2" cy="-6" r="1.5" fill="#e0a640"/>`,
    `<path d="M-15 5C-9-9 2 3 15-9V-1C3 11-8-1-15 13z" fill="#a8344a" stroke="#6b1f2c" stroke-width="2" stroke-linejoin="round"/><path d="M-9 3q4-4 8 0M3 0q4-4 8-1" stroke="#e88a8a" stroke-width="1.6" fill="none"/>`,
    `<path d="M-14-8Q0-12 14-8 16 0 14 8 0 12-14 8-16 0-14-8z" fill="#dff1ff" stroke="#5a7fa8" stroke-width="2"/><path d="M-6-2q6 4 12 0" stroke="#8fb8e0" stroke-width="1.8" fill="none"/>`,
    `<rect x="-14" y="-11" width="28" height="22" rx="3" fill="#ffd1c2" stroke="#a8344a" stroke-width="2"/><path d="M-14-3h28M-14 5h28M-6-11v22M3-11v22" stroke="#f07a8a" stroke-width="2.2"/><path d="M-14 6 2 11h-16z" fill="#ffb3a0" stroke="#a8344a" stroke-width="1.6" stroke-linejoin="round"/>`,
    `<ellipse cy="3" rx="16" ry="10" fill="#b99af0" stroke="#5a3196" stroke-width="2"/><ellipse cy="0" rx="12" ry="6" fill="#cfb8f7"/><circle cy="1" r="2" fill="#5a3196"/><path d="M-16 3l-3-2M16 3l3-2" stroke="#5a3196" stroke-width="2" stroke-linecap="round"/>`,
    `<path d="M-13 13V-1L0-12 13-1V13z" fill="#fff" stroke="#5a7fa8" stroke-width="2" stroke-linejoin="round"/><path d="M-5 13V5a5 5 0 0 1 10 0v8z" fill="#5a7fa8"/><path d="M-17 0a5 5 0 0 1 6-7 7 7 0 0 1 11-6 7 7 0 0 1 11 6 5 5 0 0 1 6 7z" fill="#dff1ff" stroke="#8fb8e0" stroke-width="1.8"/>`,
  ];
  const itemSVG = (it: number, cls?: string) => `<svg class="${cls || "it"}" viewBox="-20 -20 40 40" aria-hidden="true">${ART[it]}</svg>`;
  // 종류: 색 + 그림 한 짝(색만으로 가르지 않는다) — 장난감 공 · 간식 그릇 · 잠자리 달
  const KIND_C = ["#2a8fc9", "#d0682a", "#5a6fa8"];
  const KIND_I: ((f: string, s?: string) => string)[] = [
    (f, s) => `<circle cx="12" cy="12" r="8.5" fill="${f}"/><path d="M6 7q6 5 0 10M18 7q-6 5 0 10" stroke="${s || "#fff"}" stroke-width="1.8" fill="none"/>`,
    (f) => `<path d="M2.5 10.5h19a9.5 7.5 0 0 1-19 0z" fill="${f}"/><path d="M8 8q1-3 3 0M13 8q1-3 3 0" stroke="${f}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    (f) => `<path d="M15 3a9 9 0 1 0 6.5 13.5A7.2 7.2 0 0 1 15 3z" fill="${f}"/>`,
  ];
  const kindSVG = (k: number, f?: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${KIND_I[k](f || KIND_C[k], f ? KIND_C[k] : "#fff")}</svg>`; // 흰 알약 그림이면 안쪽 줄은 종류 색(흰 공에 흰 줄이면 그냥 동그라미였다)
  const BONE_P = "M-14-4a5 5 0 1 1 6-4h16a5 5 0 1 1 6 4 5 5 0 1 1-6 4H-8a5 5 0 1 1-6-4z";
  const boneSVG = () => `<svg viewBox="-21 -14 42 28" aria-hidden="true"><path d="${BONE_P}" fill="#f6e3c4" stroke="${FUR2}" stroke-width="2.4"/></svg>`;
  const coco = (s?: number) => `<g transform="scale(${s || 1})"><ellipse cx="-22" cy="4" rx="9" ry="16" fill="${FUR2}"/><ellipse cx="22" cy="4" rx="9" ry="16" fill="${FUR2}"/><circle r="24" fill="${FUR}"/><circle cy="-20" r="12" fill="${FUR}"/><ellipse cy="8" rx="12" ry="9" fill="#d98a5a"/><ellipse cy="4" rx="4.5" ry="3.4" fill="${INK}"/><circle cx="-9" cy="-4" r="4" fill="${INK}"/><circle cx="9" cy="-4" r="4" fill="${INK}"/><path d="M-4 11q4 3 8 0" stroke="${INK}" stroke-width="2" fill="none"/></g>`;
  const PAW = `<svg class="paw" viewBox="-12 -12 24 24" aria-label="코코"><circle r="11" fill="${FUR}"/><ellipse cy="3" rx="4.6" ry="3.8" fill="#fff4e3"/><circle cx="-5" cy="-3" r="2" fill="#fff4e3"/><circle cx="0" cy="-5.5" r="2" fill="#fff4e3"/><circle cx="5" cy="-3" r="2" fill="#fff4e3"/></svg>`;
  // 규칙 카드 그림(글자 없이 읽히게 — 숫자·기호만)
  const card = (inner: string, bg?: string) => `<svg viewBox="0 0 160 120"><rect width="160" height="120" rx="14" fill="${bg || "#dff1ff"}"/>${inner}</svg>`;
  const person = (x: number, y: number, c: string, s?: number) => `<g transform="translate(${x} ${y}) scale(${s || 1})"><circle r="11" fill="${c}"/><rect x="-13" y="12" width="26" height="22" rx="10" fill="${c}"/></g>`;
  const bone = (x: number, y: number, s?: number) => `<path transform="translate(${x} ${y}) scale(${s || 0.32})" d="${BONE_P}" fill="#f6e3c4" stroke="${FUR2}" stroke-width="5"/>`;
  const pile = (x: number, y: number, n: number) => Array.from({ length: n }, (_, k) => bone(x + (k % 2 ? 3 : -3), y - k * 5)).join("");
  const slip = (x: number, y: number, t: string, face: boolean) => `<rect x="${x - 13}" y="${y - 16}" width="26" height="32" rx="5" fill="${face ? "#fff" : "#8e4526"}" stroke="${INK}" stroke-width="2"/><text x="${x}" y="${y + 8}" text-anchor="middle" font-size="22" font-weight="900" fill="${face ? INK : "#fff4e3"}">${t}</text>`;
  const itemAt = (it: number, x: number, y: number, s: number) => `<g transform="translate(${x} ${y}) scale(${s})">${ART[it]}</g>`;
  const arrow = (d: string) => `<path d="${d}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const rules = [
    { cap: "모두 뼈다귀 20개씩 들고 시작", svg: card(`${person(32, 26, "#f07a8a")}${person(80, 26, "#2fb5a8")}${person(128, 26, "#e0a640")}${pile(32, 98, 5)}${pile(80, 98, 5)}${pile(128, 98, 5)}<text x="56" y="92" text-anchor="middle" font-size="22" font-weight="900" fill="${INK}">=</text><text x="104" y="92" text-anchor="middle" font-size="22" font-weight="900" fill="${INK}">=</text>`) },
    { cap: "물건마다 몇 개 낼지 몰래 정해요", svg: card(`${itemAt(0, 80, 24, 0.9)}${person(30, 50, "#f07a8a", 0.8)}${person(80, 58, "#2fb5a8", 0.8)}${person(130, 50, "#e0a640", 0.8)}${slip(30, 96, "?", false)}${slip(80, 96, "?", false)}${slip(130, 96, "?", false)}`, "#fff4e3") },
    { cap: "한꺼번에 공개 — 가장 많이 낸 사람이 가져가고, 그 사람만 뼈다귀를 써요", svg: card(`${itemAt(0, 80, 20, 0.8)}${arrow("M80 38v14m-5-5 5 5 5-5")}${slip(32, 74, "2", true)}${slip(80, 74, "5", true)}${slip(128, 74, "3", true)}<rect x="64" y="54" width="32" height="40" rx="8" fill="none" stroke="#e0a640" stroke-width="4"/>${pile(80, 112, 2)}<text x="96" y="110" font-size="14" font-weight="900" fill="#a8344a">−5</text>${pile(32, 112, 4)}${pile(128, 112, 4)}`) },
    { cap: "같으면 뼈다귀가 적은 사람 · 그것도 같으면 코코가 물고 가요", svg: card(`${slip(26, 30, "4", true)}${slip(62, 30, "4", true)}${pile(26, 104, 5)}${pile(62, 104, 2)}<rect x="45" y="9" width="34" height="104" rx="9" fill="none" stroke="#e0a640" stroke-width="4"/>${itemAt(1, 62, 68, 0.55)}<path d="M84 10v100" stroke="${INK}" stroke-width="2" stroke-dasharray="4 4" opacity=".4"/>${slip(102, 28, "3", true)}${slip(136, 28, "3", true)}<g transform="translate(120 84)">${coco(0.7)}</g>${itemAt(2, 120, 100, 0.45)}`, "#fff4e3") },
    { cap: "별 + 장난감·간식·잠자리 한 벌마다 +4 — 많으면 1등", svg: card(`<text x="20" y="38" font-size="24" fill="#e0a640">★★★</text><text x="98" y="38" font-size="22" font-weight="900" fill="${INK}">+</text>${[0, 1, 2].map((k) => `<g transform="translate(${16 + k * 50} 52) scale(1.3)">${KIND_I[k](KIND_C[k])}</g>`).join("")}<text x="56" y="76" text-anchor="middle" font-size="20" font-weight="900" fill="${INK}">+</text><text x="106" y="76" text-anchor="middle" font-size="20" font-weight="900" fill="${INK}">+</text><text x="80" y="110" text-anchor="middle" font-size="26" font-weight="900" fill="#a8344a">= +4</text>`) },
  ];

  mount({
    id: "auction", title: "비밀 경매", min: 3, max: 4, hidden: true, rules,
    coach: { bid: "+ − 로 몰래 정해요" }, // 한 줄 — 두 줄이면 위의 「몇 개 낼까요?」·판 아래 줄을 가렸다
    async start(S: PartyShell) {
      const n = S.players.length, g = E.create(n, SEED + (games++) * 7919);
      const botR = E.rng(SEED * 31 + games); // 봇 난수(엔진 씨앗과 따로 — 같은 씨앗이면 같은 판)
      (window as any).__au = g; // 리그
      const myGame = games; let turnTok = 0;
      const root = document.getElementById("pt-game")!, $ = (id: string): any => document.getElementById(id);
      root.innerHTML = `<div class="au"><div class="au-line" id="au-line" aria-label="이번 판 물건"></div><div class="au-item" id="au-item"></div><div class="au-board" id="au-board"></div><div id="au-act"></div></div>`;
      const P = S.players;
      // 공개된 것만 그린다: 물건 줄 · 이번 물건 · 모두의 남은 뼈다귀 · 모은 종류 · 냈나(수는 아님)
      function drawLine() {
        $("au-line").innerHTML = g.items.map((it, k) => {
          const l = g.log[k], tag = l ? (l.win >= 0 ? S.markSVG(P[l.win].mark, P[l.win].c) : PAW) : "";
          return `<div class="au-li ${k < g.k || g.state === "over" ? "past" : k === g.k ? "now" : ""}" title="${esc(E.POOL[it].name)}">${itemSVG(it)}${tag}</div>`;
        }).join("");
      }
      function drawItem(anim: boolean) {
        const it = g.items[Math.min(g.k, g.items.length - 1)], I = E.POOL[it];
        $("au-item").innerHTML = `${itemSVG(it, "art")}<div class="txt"><span class="no">물건 ${g.k + 1} / ${g.items.length}</span><span class="nm">${esc(I.name)}</span><span class="st" aria-label="별 ${I.pts}">${"★".repeat(I.pts)}<b>${I.pts}</b></span><span class="au-kind" style="--k:${KIND_C[I.kind]}">${kindSVG(I.kind, "#fff")}${E.KINDS[I.kind]}</span></div>`;
        $("au-item").classList.remove("in"); if (anim) { void $("au-item").offsetWidth; $("au-item").classList.add("in"); }
      }
      function drawBoard(now: number, winner?: number) {
        $("au-board").innerHTML = P.map((p, i) => {
          const c = E.counts(g.won[i]);
          const st = g.state !== "bid" ? "" : i === now ? '<span class="sx">고르는 중</span>' : g.bids[i] != null ? '<span class="sx done">냈어요</span>' : '<span class="sx">기다려요</span>'; // 냈는지만 — 수는 안 그린다
          return `<div class="au-p ${i === now ? "now" : ""} ${i === winner ? "win" : ""}" style="--c:${p.c}"><div class="hd">${S.markSVG(p.mark, p.c)}<b>${esc(p.name)}</b>${p.bot ? '<span class="pt-botb">봇</span>' : ""}<span class="tk" aria-label="남은 뼈다귀 ${g.tokens[i]}">${boneSVG()}${g.tokens[i]}</span></div><div class="ft">${c.map((v, k) => `<span class="kc ${v ? "" : "zero"}" aria-label="${E.KINDS[k]} ${v}">${kindSVG(k)}${v}</span>`).join("")}${st}</div></div>`;
        }).join("");
      }
      const drawPublic = (now: number) => { drawLine(); drawItem(false); drawBoard(now); };
      (window as any).__auRender = drawPublic; // 리그: 숨은 값을 바꿔 다시 그려도 화면이 같아야 한다

      // 사람 차례: + − 로 정하고 「이걸로 내기」. 단추는 한 번만 만들고 누를 때는 숫자만 바꾼다(연타 끊김 방지)
      function humanBid(i: number): Promise<number> {
        return new Promise((res) => {
          const max = g.tokens[i]; let v = 0;
          $("au-act").innerHTML = `<div class="au-bid" id="au-bid"><div class="au-q">몇 개 낼까요? · 내 뼈다귀 ${max}</div><div class="au-step" id="au-step"><button id="au-minus" aria-label="하나 덜">−</button><div class="au-v" aria-live="polite">${boneSVG()}<span id="au-v">0</span></div><button id="au-plus" aria-label="하나 더">+</button></div><div class="au-quick"><button data-q="0">0</button><button data-q="5">+5</button><button data-q="all">전부</button></div><button class="pt-btn au-go" id="au-go">이걸로 내기</button></div>`;
          const set = (x: number) => { v = Math.max(0, Math.min(max, x)); $("au-v").textContent = v; $("au-minus").disabled = v <= 0; $("au-plus").disabled = v >= max; S.sfx("tap"); };
          set(0);
          $("au-minus").onclick = () => set(v - 1); $("au-plus").onclick = () => set(v + 1);
          $("au-act").querySelectorAll(".au-quick button").forEach((b: any) => (b.onclick = () => set(b.dataset.q === "0" ? 0 : b.dataset.q === "all" ? max : v + 5)));
          S.coach("bid", $("au-step"));
          $("au-go").onclick = () => {
            S.coachDone("bid");
            // 🔴 낸 수는 바로 지운다(다음 사람 덮개가 뜨기 전에 DOM 에서 사라지게)
            $("au-act").innerHTML = `<div class="au-wait">냈어요 — 다음 사람에게 폰을 넘겨요</div>`;
            S.sfx("ok"); res(v);
          };
        });
      }
      async function reveal(res: E.AuctionResult) {
        const it = E.POOL[res.item], w = res.win;
        drawLine(); drawBoard(-1, w);
        P.forEach((p, i) => S.setScore(i, E.score(g, i)));
        const order = P.map((_, i) => i);
        const tied = res.tie.length > 1;
        $("au-act").innerHTML = `<div class="au-rev"><div class="au-bids">${order.map((i) => `<div class="au-b ${i === w ? "win" : tied && res.tie.includes(i) && i !== w ? "tie" : ""}">${S.markSVG(P[i].mark, P[i].c)}<span class="n">${res.bids[i]}</span><span class="w">${esc(P[i].name)}</span></div>`).join("")}</div>
          <div class="au-msg" id="au-msg" aria-live="assertive">${w >= 0
            ? `${itemSVG(res.item)}<span>${esc(P[w].name)} 가져가요! 뼈다귀 ${res.bids[w]}개${tied ? " — 같아서 뼈다귀 적은 쪽" : ""}</span>`
            : `<svg viewBox="-34 -34 68 68" aria-hidden="true">${coco(1.1)}<g transform="translate(0 16) scale(.55)">${ART[res.item]}</g></svg><span>${Math.max(...res.bids) === 0 ? "아무도 안 냈어요 — " : "똑같아요 — "}코코가 ${esc(it.name)} 물고 갔어요</span>`}</div>
          <button class="pt-btn au-next" id="au-next">${g.k + 1 >= g.items.length ? "결과 보기" : "다음 물건"}</button></div>`;
        S.sfx(w >= 0 ? "ok" : "bad"); if (w >= 0) S.buzz(40);
        await new Promise<void>((r2) => { $("au-next").onclick = () => r2(); });
      }

      drawPublic(-1);
      while (g.state !== "over") {
        drawItem(true);
        while (g.state === "bid") {
          const i = E.bidder(g), tok = ++turnTok; // 차례 표는 S.turn 앞에서 올린다(지난 차례 봇이 새 차례에 두지 않게)
          $("au-act").innerHTML = `<div class="au-wait">${esc(P[i].name)} 차례</div>`;
          drawBoard(i);
          await S.turn(i);
          if (games !== myGame || tok !== turnTok) return;
          drawPublic(i);
          let r: ReturnType<typeof E.bid>;
          if (S.isBot(i)) {
            // 봇: 사람 입력 자리는 그리지 않는다(누를 것 없음). 엔진이 만든 view(g, i) 만 받는다 — 남의 이번 입찰 없음
            $("au-act").innerHTML = `<div class="au-wait">${esc(P[i].name)}(봇) 몰래 고르는 중…</div>`;
            await S.botWait(i, "몰래 고르는 중…");
            if (games !== myGame || tok !== turnTok) return;
            r = E.bid(g, i, E.bot(E.view(g, i), P[i].level, botR));
            S.botDone(); S.sfx("tap");
          } else {
            const v = await humanBid(i);
            if (games !== myGame || tok !== turnTok) return;
            r = E.bid(g, i, v);
          }
          drawBoard(-1);
          if (r && (r as E.AuctionResult).item != null) await reveal(r as E.AuctionResult);
        }
        E.next(g);
        if ((g.state as E.AuctionState) !== "over") drawPublic(-1);
      }
      drawLine();
      S.end(E.scores(g), { fmt: (v) => `${v}점` });
    },
  });
}
