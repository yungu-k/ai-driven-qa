// 새벽 양치기 — 화면 쪽(입력·그리기·흐름). 규칙은 core.ts(뼈대) + sheep.ts(소재), 그림은 sheep-art.js(디자인 정본 사본).
// 뼈대는 디자인 세션 시안 docs/lab-surv-sheep-mock.html 의 스크립트를 그대로 옮겼다. 시안에 없던 것:
// 멈춤 메뉴(소리·실험실로·그만두기), 화면이 가려지면 멈춤, 효과음, 랭크 등록·모두가 보는 랭킹, 시작 화면 HI-SCORE.
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as C from "./core.ts";
import * as SHEEP from "./sheep.ts";
import "./sheep-art.js";
import { isSoundOn, setSoundOn, sfx, unlock } from "@/lab/sound";
import { fetchTop, submitScore, cleanNameSay, type ScoreRow } from "@/lab/arcade-rank";

const GAME = "sheep";

export function initSheep() {
  const Cx: any = C;
  const T: any = (SHEEP as any).THEME ?? (SHEEP as any).default;
  const D = T.DATA;
  const ART = ((window as any).SurvArt && (window as any).SurvArt.sheep) || null;
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
  function cardText(c: any) {
    const W = D.WEAPONS, P = D.PASSIVES, TC = D.THEME_CARDS;
    if (c.type === "evo") { const w = W[c.key]; return { name: w.evo.name, lv: "진화", desc: `${w.name} 최고 단계 + ${P[w.evo.with]} → 더 센 꼴로 바뀐다`, cls: "evo" }; }
    if (c.type === "weapon") { const w = W[c.key]; const tip = ({ pillow: "가장 가까운 악몽에 베개를 던진다", lullaby: "둘레의 악몽을 천천히 재운다", star: "화면 안 악몽 머리 위로 별이 떨어진다", cloud: "구름이 둘레를 돌며 밀어낸다", bubble: "걷는 쪽으로 느린 꿈 방울을 띄운다" } as Record<string, string>)[c.key]; return { name: w.name, lv: c.lv === 1 ? "새것" : `LV ${c.lv}`, desc: tip + (w.evo ? ` · 진화 짝: ${P[w.evo.with]}` : "") }; }
    if (c.type === "passive") { const tip = ({ dmg: "모든 피해 +10 %", cd: "다시 쓰기까지 -8 %", area: "범위 +12 %", move: "걸음 +8 %", hp: "최대 체력 +20", magnet: "별가루 끌어오기 +30 %" } as Record<string, string>)[c.key]; return { name: P[c.key], lv: c.lv === 1 ? "새것" : `LV ${c.lv}`, desc: tip }; }
    if (c.type === "theme") { const t = TC[c.key]; const tip = ({ flock: "양 2마리가 바로 온다 · 떠도는 양이 더 자주", horn: "양이 들이받는 힘 +3", puff: "양 털 +1(한 번 더 버틴다)", pipe: c.lv === 1 ? "떨어진 양이 아이에게 걸어온다" : "우리 다시 만들기 빨라짐 · 헤매는 시간 +5 초", starsheep: "몇 마리마다 꿈양 — 가까운 악몽에 별을 쏜다" } as Record<string, string>)[c.key]; return { name: t.name, lv: `${c.lv}/${t.max}`, desc: tip, tag: "양떼", cls: "sheep" }; }
    return { name: "따뜻한 우유", lv: "", desc: "체력 30 회복" };
  }
  function showLevel() {
    $("lvTitle").textContent = `LV ${g.lv}`;
    const box = $("cards"); box.textContent = "";
    g.offer.forEach((c: any, i: number) => {
      const t: any = cardText(c), b = document.createElement("button");
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
    const ft = +(hash.match(/t=(\d+)/) || [])[1];
    if (ft) fastForward(ft);
    if (/stress/.test(hash)) stress();
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
  function stress() {
    // 적 상한까지 화면 안팎에 채우고 안 죽게 한다(맞기·밀기·그리기 비용은 그대로) — 실측 판
    while (g.enemies.length < Cx.CORE.ENEMY_CAP) { const [x, y] = Cx.ringPoint(g, -40 - g.r() * 60); const e = Cx.spawnAt(g, g.r() < 0.5 ? "fluff" : "clock", x, y); e.hp = e.maxHp = 1e9; }
    for (let i = 0; i < 9; i++) T.onThemeCard(g, "flock", 1);
    g.weapons = [{ key: "pillow", lv: 5, cd: 0, t: 0 }, { key: "cloud", lv: 5, cd: 0, t: 0 }, { key: "lullaby", lv: 5, cd: 0, t: 0 }, { key: "star", lv: 5, cd: 0, t: 0 }];
    g.p.maxHp = g.p.hp = 1e6;
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
  let hurtT = 0;
  function handleEvents() {
    for (const ev of g.events) {
      if (ev.e === "say") say(ev.text);
      else if (ev.e === "penend" && ev.conv) { say(ev.conv > 1 ? "악몽 둘이 양이 됐다" : "악몽 하나가 양이 됐다"); sfx.coin(); }
      else if (ev.e === "fence") sfx.hit();
      else if (ev.e === "hurt") { if (!REDUCE) shake = 2; if (performance.now() - hurtT > 400) { hurtT = performance.now(); sfx.miss(); } }
      else if (ev.e === "evo") { say(D.WEAPONS[ev.key].evo.name + "!"); sfx.gold(); }
      else if (ev.e === "levelup") sfx.gold();
      else if (ev.e === "boss") sfx.miss();
      else if (ev.e === "dawn") say("아침이다");
    }
    g.events.length = 0;
  }

  // ── 결과 → 이름 남기기 → 랭킹 ──
  const esc = (v: string) => v.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  function endScreen() {
    const won = g.state === "won", m = Math.floor(g.time / 60), s = Math.floor(g.time % 60);
    const score = Cx.score(g);
    $("endTitle").textContent = won ? "아침이 왔다" : g.quit ? "그만 잤다" : "꿈에서 깼다";
    $("endSub").textContent = won ? `양 ${g.sheep.length}마리와 함께 아침을 맞았다` : `${m}분 ${s}초 버텼다. 다시 자 볼까?`;
    const rows: [string, string | number][] = [["버틴 시간", `${m}:${String(s).padStart(2, "0")}`], ["재운 악몽", g.kills], ["가장 긴 양떼", g.stats.maxLen], ["양 우리", g.stats.fences], ["점수", score]];
    $("res").innerHTML = rows.map(([a, b]) => `<span>${a}</span><span>${b}</span>`).join("");
    const form = $("entry");
    form.hidden = false; ($("enter") as HTMLButtonElement).disabled = false;
    ($("ini") as HTMLInputElement).value = ""; ($("sayIn") as HTMLInputElement).value = "";
    $("board").hidden = true;
    $("end").classList.add("on");
    if (won) sfx.result(); else sfx.miss();
    ($("enter") as HTMLButtonElement).onclick = async () => {
      const { name, say: line } = cleanNameSay(($("ini") as HTMLInputElement).value, ($("sayIn") as HTMLInputElement).value);
      if (name.length !== 3) { ($("ini") as HTMLInputElement).focus(); return; }
      ($("enter") as HTMLButtonElement).disabled = true;
      const got = await submitScore(GAME, { name, score, say: line, sec: Math.round(g.time * 10) / 10 });
      showBoard(got ?? (await fetchTop(GAME)) ?? [], got ? { name, score, say: line } : null, !got);
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

  // ── 그리기 ────────────────────────────────────────────
  function camera() {
    const cx = Math.round(Cx.clamp(g.p.x - VW / 2, -20, g.world - VW + 20));
    const cy = Math.round(Cx.clamp(g.p.y - VH / 2 + CAM_UP, -20, g.world - VH + 20));
    return [cx, cy];
  }
  function fallbackDot(x: number, y: number, r: number, c: string) { ctx.fillStyle = c; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  function draw() {
    let [cx, cy] = camera();
    if (shake > 0) { cx += ((Math.random() * 3) | 0) - 1; cy += ((Math.random() * 3) | 0) - 1; shake--; }
    const t = g.time, dawn = T.dawn(g);
    ctx.setTransform(1, 0, 0, 1, -cx, -cy); // 그림은 월드 좌표로 받는다(바닥 포함)
    if (ART) ART.drawGround(ctx, cx, cy, VW, VH, dawn, t);
    else { ctx.fillStyle = "#17142b"; ctx.fillRect(cx, cy, VW, VH); }
    const inView = (x: number, y: number, m = 24) => x > cx - m && x < cx + VW + m && y > cy - m && y < cy + VH + m;
    for (const f of g.fences) if (ART) ART.drawFence(ctx, f.pts, t, Math.min(1, f.life / 0.5));
    for (const z of g.zones) { ctx.globalAlpha = z.warn > 0 ? 0.35 + 0.25 * Math.sin(t * 20) : 0.55; ctx.fillStyle = "#0e0c1c"; ctx.beginPath(); ctx.arc(z.x | 0, z.y | 0, z.r, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    for (const s of g.dust) if (inView(s.x, s.y)) { if (ART) ART.drawPickup(ctx, s.v >= 3 ? "dust_big" : "dust", s.x | 0, s.y | 0, t); else fallbackDot(s.x | 0, s.y | 0, 1, "#6ee6ff"); }
    for (const k of g.pickups) if (inView(k.x, k.y)) { if (ART) ART.drawPickup(ctx, k.kind === "heal" ? "milk" : "bell", k.x | 0, k.y | 0, t); else fallbackDot(k.x | 0, k.y | 0, 2, "#ffd86b"); }
    for (const f of g.fx) if (f.k === "drop" && f.live) { ctx.strokeStyle = "#ffd86b"; ctx.globalAlpha = 0.5; ctx.strokeRect((f.x - f.r) | 0, (f.y - f.r * 0.6) | 0, f.r * 2, f.r * 1.2); ctx.globalAlpha = 1; }
    // 위에서 아래 순으로(겹침): 적·양·아이·헤매는 양을 한 줄로 모아 y 로 정렬
    const list: [number, number, any, number?][] = [];
    for (const e of g.enemies) if (inView(e.x, e.y, 48)) list.push([e.y, 0, e]);
    for (let i = 0; i < g.sheep.length; i++) { const s = g.sheep[i]; if (inView(s.x, s.y)) list.push([s.y, 1, s, i]); }
    for (const s of g.strays) if (inView(s.x, s.y)) list.push([s.y, 2, s]);
    list.push([g.p.y, 3, g.p]);
    list.sort((a, b) => a[0] - b[0]);
    for (const [, k, o, i] of list) {
      const x = o.x | 0, y = o.y | 0;
      if (k === 0) {
        const kind = o.inactive ? "hand_rise" : o.kind;
        if (ART) { if (o.stun > 0 && !REDUCE) ctx.globalAlpha = 0.75; ART.drawEnemy(ctx, kind, x, y, t + o.id * 0.37, o.flash > 0); ctx.globalAlpha = 1; }
        else fallbackDot(x, y, o.r, o.boss ? "#9a64f0" : "#463d6b");
      } else if (k === 1) { if (ART) ART.drawSheep(ctx, x, y, t, T.kindOf(g, i), i, o.iframe > 0.3); else fallbackDot(x, y, 4, "#eef1f8"); }
      else if (k === 2) { if (o.life > 3 || ((t * 6) | 0) % 2) { if (ART) ART.drawSheep(ctx, x, y, t, "stray", 0, false); else fallbackDot(x, y, 4, "#a3abc4"); } }
      else if (ART) ART.drawChild(ctx, x, y, t, g.p.dir, g.p.iframe > 0.45 && !REDUCE);
      else fallbackDot(x, y, 5, "#ffd86b");
    }
    for (const w of g.weapons) {
      if (D.WEAPONS[w.key].kind === "aura") { const s = Cx.wstat(g, w); if (ART) ART.drawAura(ctx, g.p.x | 0, g.p.y | 0, s.R | 0, t); }
      if (D.WEAPONS[w.key].kind === "orbit") {
        const s = Cx.wstat(g, w);
        for (let i = 0; i < s.n; i++) { const a = (w.ang || 0) + (i / s.n) * Math.PI * 2; const ox = (g.p.x + Math.cos(a) * s.R) | 0, oy = (g.p.y + Math.sin(a) * s.R) | 0; if (ART) ART.drawProj(ctx, "bubble", ox, oy, t, a); else fallbackDot(ox, oy, 4, "#c8fbff"); }
      }
    }
    for (const b of g.shots) {
      const kind = b.w === "pillow" ? "pillow" : b.w === "bubble" ? "bubble" : "star";
      if (ART) ART.drawProj(ctx, kind, b.x | 0, b.y | 0, t, Math.atan2(b.vy, b.vx)); else fallbackDot(b.x | 0, b.y | 0, 2, "#fff2b8");
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (g.bossAlive) { const e = g.bossAlive; ctx.fillStyle = "#231e3d"; ctx.fillRect(20, 4, 140, 4); ctx.fillStyle = "#c9a4ff"; ctx.fillRect(21, 5, Math.max(0, (138 * e.hp) / e.maxHp) | 0, 2); }
  }
  function hud() {
    const p = g.p;
    $("hpNum").textContent = String(Math.ceil(p.hp));
    ($("hpBar").firstChild as HTMLElement).style.width = `calc(${(100 * p.hp) / p.maxHp}% - 2px)`;
    $("sheepNum").textContent = g.sheep.length;
    const left = Math.max(0, D.DURATION - g.time);
    $("clock").textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")}`;
    ($("dawnBar").firstChild as HTMLElement).style.width = `calc(${(100 * g.time) / D.DURATION}% - 2px)`;
    ($("xpBar").firstChild as HTMLElement).style.width = `calc(${(100 * g.xp) / Cx.CORE.need(g.lv)}% - 2px)`;
    $("lvNum").textContent = `LV ${g.lv}`;
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
  fetchTop(GAME).then(rows => paintHi(rows?.[0]));
  if (/t=|stress|autostart/.test(hash)) start();
}
