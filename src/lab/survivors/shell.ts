// 그냥 오락실 서바이버 — 네 게임이 같이 쓰는 화면 껍데기(입력·카드·고정 시간 단계·멈춤·결과·랭킹·HUD 기본).
// 게임마다 다른 것(그리기·카드 문구·사건 연출·결과 줄·실측 판)은 Shell 설정으로 받는다. 규칙은 core.ts + 소재 파일.
// 뼈대는 디자인 세션 시안(docs/lab-surv-*-mock.html)의 스크립트를 옮긴 것이고, 시안에 없던 멈춤·소리·랭크는 여기서 더한다.
// 페이지 DOM 은 dawn-shepherd.astro 의 꼴(id: hud·wrap·cv·say·stick·hint·start·go·hi·lvl·cards·reroll·menu·end·entry·board…)을 따른다.
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as C from "./core.ts";
import { isSoundOn, setSoundOn, sfx, unlock } from "@/lab/sound";
import { fetchTop, submitScore, cleanNameSay, type ScoreRow } from "@/lab/arcade-rank";

export type CardText = { name: string; lv: string; desc: string; cls?: string; tag?: string };
export type View = {
  ctx: CanvasRenderingContext2D;
  cx: number;
  cy: number;
  VW: number;
  VH: number;
  reduce: boolean;
  inView: (x: number, y: number, m?: number) => boolean;
  dot: (x: number, y: number, r: number, c: string) => void;
};
export type Fx = { say: (text: string) => void; shake: (n: number) => void; sfx: typeof sfx };
export type Shell = {
  game: string; // 랭킹 키(/api/rank/<game>)
  theme: any;
  cardText: (c: any, D: any) => CardText;
  draw: (g: any, v: View) => void;
  onEvent?: (ev: any, g: any, fx: Fx) => void;
  hud?: (g: any, $: (id: string) => HTMLElement) => void;
  end: (g: any) => { title: string; sub: string; rows: [string, string | number][] };
  stress: (g: any) => void;
  onStart?: (g: any) => void;
};

export function runSurvivor(S: Shell) {
  const Cx: any = C;
  const T = S.theme, D = T.DATA;
  const hash = location.hash;
  const REDUCE = /reduce/.test(hash) || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const seedArg = () => +(hash.match(/seed=(\d+)/) || [])[1] || ((Math.random() * 1e9) | 0);
  const cv = document.getElementById("cv") as HTMLCanvasElement, ctx = cv.getContext("2d")!;
  const VW = 180, VH = 300, CAM_UP = 36; // 엄지가 가리지 않게 주인공은 가운데보다 36 아트 px 위
  const $ = <E extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as E;
  let g: any = null, acc = 0, last = 0, sayT = 0, shake = 0, paused = false;
  (window as any).__surv = { frames: [] as number[], get g() { return g; }, core: C }; // 리그가 엔진 함수(gainXp 등)를 부를 자리

  // ── 입력: 떠 있는 조이스틱(누른 자리) + 키보드 ──────────────
  const stick = { on: false, ox: 0, oy: 0, x: 0, y: 0 }, keys = new Set<string>();
  const R_STICK = 36, DEAD = 0.12;
  const wrap = $("wrap");
  document.addEventListener("pointerdown", unlock, { capture: true }); // 실험실 위 막대가 없는 판이라 소리 깨우기를 여기서
  wrap.addEventListener("pointerdown", e => {
    if (!g || g.state !== "play" || paused) return;
    wrap.setPointerCapture(e.pointerId);
    const r = wrap.getBoundingClientRect();
    stick.on = true; stick.ox = e.clientX - r.left; stick.oy = e.clientY - r.top; stick.x = stick.y = 0;
    const s = $("stick"); s.style.display = "block"; s.style.left = stick.ox + "px"; s.style.top = stick.oy + "px"; (s.firstChild as HTMLElement).style.transform = "";
    $("hint").style.display = "none";
  });
  wrap.addEventListener("pointermove", e => {
    if (!stick.on) return;
    const r = wrap.getBoundingClientRect();
    let dx = e.clientX - r.left - stick.ox, dy = e.clientY - r.top - stick.oy;
    const d = Math.hypot(dx, dy);
    if (d > R_STICK) { dx *= R_STICK / d; dy *= R_STICK / d; }
    stick.x = dx / R_STICK; stick.y = dy / R_STICK;
    ($("stick").firstChild as HTMLElement).style.transform = `translate(${dx}px,${dy}px)`;
  });
  const up = () => { stick.on = false; stick.x = stick.y = 0; $("stick").style.display = "none"; };
  wrap.addEventListener("pointerup", up); wrap.addEventListener("pointercancel", up);
  addEventListener("keydown", e => {
    if ((e.target as HTMLElement)?.tagName === "INPUT") return; // 이름·한마디 칸에 치는 글자는 게임 입력이 아니다
    keys.add(e.key.toLowerCase());
    if (g && g.state === "levelup" && /^[123]$/.test(e.key)) pickCard(+e.key - 1);
    if (e.key === "Escape" && g && (g.state === "play" || paused)) { if (paused) resume(); else pause(); }
  });
  addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
  function readInput() {
    let x = 0, y = 0;
    if (keys.has("arrowleft") || keys.has("a")) x -= 1;
    if (keys.has("arrowright") || keys.has("d")) x += 1;
    if (keys.has("arrowup") || keys.has("w")) y -= 1;
    if (keys.has("arrowdown") || keys.has("s")) y += 1;
    if (x || y) { const m = Math.hypot(x, y); return { x: x / m, y: y / m }; }
    const m = Math.hypot(stick.x, stick.y);
    if (m < DEAD) return { x: 0, y: 0 };
    const k = Math.min(1, (m - DEAD) / (1 - DEAD)) / m; // 데드존 밖은 0..1 로 다시 편다
    return { x: stick.x * k, y: stick.y * k };
  }

  // ── 카드 ──────────────────────────────────────────────
  function showLevel() {
    $("lvTitle").textContent = `LV ${g.lv}`;
    const box = $("cards"); box.textContent = "";
    g.offer.forEach((c: any, i: number) => {
      const t = S.cardText(c, D), b = document.createElement("button");
      b.className = "card " + (t.cls || "");
      const name = document.createElement("b"); name.textContent = t.name;
      const lv = document.createElement("span"); lv.className = "lv"; lv.textContent = t.lv;
      const small = document.createElement("small");
      if (t.tag) { const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = t.tag; small.append(tag, " · "); }
      small.append(t.desc);
      b.append(name, lv, small);
      b.onclick = () => pickCard(i);
      box.appendChild(b);
    });
    $("rr").textContent = g.rerolls; ($("reroll") as HTMLButtonElement).disabled = g.rerolls <= 0;
    $("lvl").classList.add("on");
  }
  function pickCard(i: number) {
    if (!Cx.choose(g, i)) return;
    sfx.tick();
    $("lvl").classList.remove("on");
    if (g.state === "levelup") showLevel();
    last = performance.now();
  }
  $("reroll").onclick = () => { if (Cx.reroll(g)) showLevel(); };

  // ── 판 ───────────────────────────────────────────────
  function start() {
    const seed = seedArg();
    g = Cx.create(T, seed);
    (window as any).__surv.seed = seed;
    S.onStart?.(g);
    const ft = +(hash.match(/t=(\d+)/) || [])[1];
    if (ft) fastForward(ft);
    if (/stress/.test(hash)) S.stress(g);
    for (const id of ["start", "end", "menu"]) $(id).classList.remove("on");
    paused = false; acc = 0; last = performance.now();
    $("hint").style.display = "";
    sfx.start();
  }
  // 빨리 감기: 시뮬과 같은 피하기 봇으로 그 시각까지. 카드는 첫 장(리그·화면 보기용)
  function fastForward(t: number) {
    while (g.time < t && (g.state === "play" || g.state === "levelup")) {
      if (g.state === "levelup") { Cx.choose(g, 0); continue; }
      let fx = 0, fy = 0;
      Cx.near(g, g.p.x, g.p.y, 60, (e: any) => { const dx = g.p.x - e.x, dy = g.p.y - e.y, d2 = dx * dx + dy * dy + 1; fx += dx / d2; fy += dy / d2; });
      let x = fx * 40, y = fy * 40;
      const E = 70;
      if (g.p.x < E) x += 0.6; if (g.p.x > g.world - E) x -= 0.6; if (g.p.y < E) y += 0.6; if (g.p.y > g.world - E) y -= 0.6;
      g.input = { x, y };
      g.p.hp = g.p.maxHp;
      Cx.step(g); g.events.length = 0;
    }
  }
  $("go").onclick = start;
  $("again").onclick = start;

  // ── 멈춤 메뉴: 열려 있는 동안·화면이 가려진 동안 멈춘다 ──
  function menuSync() { $("mSnd").textContent = `소리 ${isSoundOn() ? "켬" : "끔"}`; }
  function pause() { if (!g || g.state !== "play") return; paused = true; up(); menuSync(); $("menu").classList.add("on"); }
  function resume() { paused = false; $("menu").classList.remove("on"); last = performance.now(); }
  $("menuBtn").onclick = () => (paused ? resume() : pause());
  $("mResume").onclick = resume;
  $("mSnd").onclick = () => { setSoundOn(!isSoundOn()); if (isSoundOn()) unlock(); menuSync(); };
  $("mQuit").onclick = () => { $("menu").classList.remove("on"); paused = false; g.state = "lost"; g.quit = true; endScreen(); };
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });

  function say(text: string) { const s = $("say"); s.textContent = text; s.classList.add("on"); sayT = 2.4; }
  const fx: Fx = { say, shake: n => { if (!REDUCE) shake = Math.max(shake, n); }, sfx };
  let hurtT = 0;
  function handleEvents() {
    for (const ev of g.events) {
      if (ev.e === "say") say(ev.text);
      else if (ev.e === "hurt") { fx.shake(2); if (performance.now() - hurtT > 400) { hurtT = performance.now(); sfx.miss(); } }
      else if (ev.e === "evo") { say(D.WEAPONS[ev.key].evo.name + "!"); sfx.gold(); }
      else if (ev.e === "levelup") sfx.gold();
      else if (ev.e === "boss") sfx.miss();
      S.onEvent?.(ev, g, fx);
    }
    g.events.length = 0;
  }

  // ── 결과 → 이름 남기기 → 랭킹 ──
  const esc = (v: string) => v.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  function endScreen() {
    const won = g.state === "won", score = Cx.score(g), E = S.end(g);
    $("endTitle").textContent = E.title;
    $("endSub").textContent = E.sub;
    $("res").innerHTML = [...E.rows, ["점수", score] as [string, number]].map(([a, b]) => `<span>${esc(String(a))}</span><span>${esc(String(b))}</span>`).join("");
    $("entry").hidden = false; ($("enter") as HTMLButtonElement).disabled = false;
    ($("ini") as HTMLInputElement).value = ""; ($("sayIn") as HTMLInputElement).value = "";
    $("board").hidden = true;
    $("end").classList.add("on");
    if (won) sfx.result(); else sfx.miss();
    ($("enter") as HTMLButtonElement).onclick = async () => {
      const { name, say: line } = cleanNameSay(($("ini") as HTMLInputElement).value, ($("sayIn") as HTMLInputElement).value);
      if (name.length !== 3) { ($("ini") as HTMLInputElement).focus(); return; }
      ($("enter") as HTMLButtonElement).disabled = true;
      const got = await submitScore(S.game, { name, score, say: line, sec: Math.round(g.time * 10) / 10 });
      showBoard(got ?? (await fetchTop(S.game)) ?? [], got ? { name, score, say: line } : null, !got);
    };
  }
  function showBoard(rows: ScoreRow[], me: { name: string; score: number; say: string } | null, failed: boolean) {
    $("entry").hidden = true;
    const meAt = me ? rows.findIndex(r => r.name === me.name && r.score === me.score && r.say === me.say) : -1;
    $("board").innerHTML = (failed ? `<p>지금은 등록이 안 된다</p>` : "") + (rows.length
      ? `<table class="rank"><colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5"></colgroup>
        <thead><tr><th>#</th><th>이름</th><th>점수</th><th>한마디</th><th>날짜</th></tr></thead><tbody>
        ${rows.map((r, i) => `<tr class="${i === meAt ? "me" : ""}"><td class="n">${i + 1}</td><td class="n">${esc(r.name)}</td><td class="n">${r.score}</td><td>${esc(r.say || "—")}</td><td class="n">${esc(r.date)}</td></tr>`).join("")}
        </tbody></table>`
      : `<p>아직 기록이 없다</p>`);
    $("board").hidden = false;
    paintHi(rows[0]);
  }
  function paintHi(top?: ScoreRow) {
    const hi = $("hi");
    hi.hidden = !top;
    if (top) hi.textContent = `HI-SCORE ${top.name} ${top.score}`;
  }

  // ── 그리기·HUD ──
  function camera() {
    const cx = Math.round(Cx.clamp(g.p.x - VW / 2, -20, g.world - VW + 20));
    const cy = Math.round(Cx.clamp(g.p.y - VH / 2 + CAM_UP, -20, g.world - VH + 20));
    return [cx, cy];
  }
  const dot = (x: number, y: number, r: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
  function draw() {
    let [cx, cy] = camera();
    if (shake > 0) { cx += ((Math.random() * 3) | 0) - 1; cy += ((Math.random() * 3) | 0) - 1; shake--; }
    ctx.setTransform(1, 0, 0, 1, -cx, -cy); // 그림은 월드 좌표로 받는다(바닥 포함)
    const inView = (x: number, y: number, m = 24) => x > cx - m && x < cx + VW + m && y > cy - m && y < cy + VH + m;
    S.draw(g, { ctx, cx, cy, VW, VH, reduce: REDUCE, inView, dot });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (g.bossAlive) { const e = g.bossAlive; ctx.fillStyle = "#231e3d"; ctx.fillRect(20, 4, 140, 4); ctx.fillStyle = "#c9a4ff"; ctx.fillRect(21, 5, Math.max(0, (138 * e.hp) / e.maxHp) | 0, 2); }
  }
  function hud() {
    const p = g.p;
    $("hpNum").textContent = String(Math.ceil(p.hp));
    ($("hpBar").firstChild as HTMLElement).style.width = `calc(${(100 * p.hp) / p.maxHp}% - 2px)`;
    const left = Math.max(0, D.DURATION - g.time);
    $("clock").textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")}`;
    ($("dawnBar").firstChild as HTMLElement).style.width = `calc(${(100 * g.time) / D.DURATION}% - 2px)`;
    ($("xpBar").firstChild as HTMLElement).style.width = `calc(${(100 * g.xp) / Cx.CORE.need(g.lv)}% - 2px)`;
    $("lvNum").textContent = `LV ${g.lv}`;
    S.hud?.(g, $);
  }

  function frame(now: number) {
    requestAnimationFrame(frame);
    if (!g) return;
    const t0 = performance.now();
    if (g.state === "play" && !paused) {
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      g.input = readInput();
      while (acc >= Cx.CORE.DT && g.state === "play") { Cx.step(g); acc -= Cx.CORE.DT; }
      handleEvents();
      if (g.state === "levelup") showLevel();
      else if (g.state === "won" || g.state === "lost") endScreen();
    } else {
      last = now;
      if (g.state === "levelup" && !$("lvl").classList.contains("on")) showLevel(); // 틱 밖에서 레벨이 오른 경우(줍기 직후 등)
    }
    if (sayT > 0) { sayT -= 1 / 60; if (sayT <= 0) $("say").classList.remove("on"); }
    draw();
    hud();
    const fr = (window as any).__surv.frames; fr.push(performance.now() - t0); if (fr.length > 600) fr.shift();
  }
  // 시작 화면 뒤에도 들판이 보이게 판 하나를 미리 만들어 둔다(움직이지 않음)
  g = Cx.create(T, seedArg()); g.state = "title";
  requestAnimationFrame(frame);
  fetchTop(S.game).then(rows => paintHi(rows?.[0]));
  if (/t=|stress|autostart/.test(hash)) start();
}
