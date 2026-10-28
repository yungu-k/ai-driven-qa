// 코코 타워 디펜스 — 화면 쪽(3D 그리기·누르기·소리·흐름). 규칙과 수치는 engine.ts(릴리스 디펜스 엔진과 숫자가 같고 화면 글자만 코코로),
// 맵은 td3d.js(디자인 세션 3D 렌더러 사본)가 그린다. 코코·적 모델은 src/lab/survivors/coco3d-models.js 를 같이 쓴다.
// 뼈대는 디자인 세션 시안 docs/lab-coco-td-mock.html. 시안이 가짜 데이터로 보여 주던 흐름(맵 1–5 이어 가기·하루(바퀴)·전설·
// 맵마다 저장·진 맵 다시/그만두기·모두가 보는 랭킹)은 릴리스 디펜스 운영판(src/lab/release-defense/game.ts)에서 옮겼다.
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from "three";
import * as E from "./engine.ts";
import "../survivors/coco3d-models.js";
import "./td3d.js";
import { isSoundOn, setSoundOn } from "@/lab/sound";
import { SAVE_KEY, freshRun, afterMapWon, parseRun, hasProgress, clearedLaps, type Run } from "./save.ts";
import { fetchTop, submit, cleanEntry, NAME_MAX, type RankRow } from "./rank.ts";

export function initCocoTd() {
  const D: any = E.DATA;
  const W: any = window;
  W.TDEngine = E; // 3D 렌더러(td3d.js)가 길 좌표(posAt 등)를 엔진에서 읽는다 — 디자인 정본이 전역 이름으로 찾는다
  const $ = <T extends HTMLElement = HTMLElement>(q: string) => document.querySelector(q) as T;
  const REDUCE_OS = matchMedia("(prefers-reduced-motion: reduce)");
  let reduce = REDUCE_OS.matches || location.hash.includes("reduce");
  document.documentElement.classList.toggle("reduce", reduce);
  const STRESS = location.hash.includes("stress");
  // 숫자·테두리 색(코코 HD 팔레트에서)
  const C = { coin: "#ffd166", coinEdge: "#a8742a", red: "#ff5d5d", redEdge: "#5a3a42" };
  const GRADE_NAME: Record<string, string> = { trivial: "칫솔", minor: "목욕 거품", major: "초인종", critical: "청소기", blocker: "로봇 청소기 대왕" };

  // ── 저장(막혀 있으면 없는 셈) ──
  const store = {
    load(): Run | null { try { return parseRun(localStorage.getItem(SAVE_KEY)); } catch { return null; } },
    save(r: Run) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(r)); } catch { /* 저장 없이 한다 */ } },
  };
  let run: Run = store.load() ?? freshRun();

  // ── 3D 맵 ──
  const cv = $<HTMLCanvasElement>("#cv"), fxc = $<HTMLCanvasElement>("#fxc"), fx2 = fxc.getContext("2d")!;
  const R = W.CocoTD3D.create(THREE, cv, W.Surv3D);
  const ICON_DPR = Math.min(3, devicePixelRatio || 1);
  function ico(spec: any, css: number, cls?: string) { const im = new Image(); im.alt = ""; im.width = im.height = css; im.decoding = "sync"; im.src = R.icon(spec, Math.round(css * ICON_DPR)); if (cls) im.className = cls; return im; }

  // ── 소리: 실험실 sound.ts 결(사각·삼각파, 0.15 이하). 켬/끔은 실험실 전체 값(isSoundOn)을 따른다 ──
  let ac: AudioContext | null = null;
  function unlock() { if (!isSoundOn()) return; try { ac ??= new AudioContext(); if (ac.state === "suspended") ac.resume(); } catch { ac = null; } }
  function tone(f: number, ms: number, o: { type?: OscillatorType; gain?: number; to?: number; at?: number } = {}) {
    if (!isSoundOn() || !ac) return;
    const { type = "square", gain = 0.08, to, at = 0 } = o, t = ac.currentTime + at / 1000;
    const os = ac.createOscillator(), gn = ac.createGain();
    os.type = type; os.frequency.setValueAtTime(f, t); if (to) os.frequency.exponentialRampToValueAtTime(to, t + ms / 1000);
    gn.gain.setValueAtTime(gain, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    os.connect(gn).connect(ac.destination); os.start(t); os.stop(t + ms / 1000 + 0.02);
  }
  function noise(ms: number, freq: number, gain = 0.15) {
    if (!isSoundOn() || !ac) return;
    const t = ac.currentTime, len = Math.floor((ac.sampleRate * ms) / 1000), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = ac.createBufferSource(), bp = ac.createBiquadFilter(), gn = ac.createGain();
    src.buffer = buf; bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 0.8; gn.gain.value = gain;
    src.connect(bp).connect(gn).connect(ac.destination); src.start(t);
  }
  let shotBudget = 0;
  const sfx = {
    shot() { if (shotBudget > 0) { shotBudget--; tone(1320, 18, { gain: 0.03 }); } },
    boom() { noise(160, 500, 0.12); tone(140, 120, { to: 70, gain: 0.06 }); },
    snipe() { tone(1760, 40, { to: 440, gain: 0.05 }); },
    kill(big: boolean) { if (big) { tone(660, 50); tone(990, 90, { at: 50 }); } else tone(880, 30, { gain: 0.05 }); },
    coin() { tone(988, 50, { gain: 0.06 }); tone(1319, 90, { at: 50, gain: 0.06 }); },
    build() { tone(523, 60, { type: "triangle", gain: 0.1 }); tone(784, 90, { type: "triangle", gain: 0.1, at: 60 }); },
    leak(big: boolean) { tone(big ? 196 : 330, big ? 260 : 120, { to: big ? 98 : 220, gain: 0.1 }); },
    wave() { [440, 554, 659].forEach((f, i) => tone(f, 80, { type: "triangle", gain: 0.09, at: i * 70 })); },
    palm() { noise(90, 2400, 0.22); tone(220, 60, { gain: 0.06 }); },
    hammer() { tone(700, 70, { to: 1600, gain: 0.08 }); tone(1600, 90, { to: 600, gain: 0.08, at: 70 }); noise(60, 900, 0.1); },
    drop() { [1047, 1319, 1568].forEach((f, i) => tone(f, 60, { gain: 0.06, at: i * 50 })); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 160, { type: "triangle", gain: 0.1, at: i * 150 })); },
    legend() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 120, { type: "triangle", gain: 0.1, at: i * 110 })); },
    siren() { tone(220, 260, { type: "triangle", to: 330, gain: 0.09 }); tone(330, 260, { type: "triangle", to: 220, gain: 0.09, at: 260 }); },
  };

  // ── 화면 크기: 맵은 9×12 칸(가로:세로 3:4). 휴대폰은 폭을, 넓은 화면은 높이를 채운다 ──
  let mapW = 360, mapH = 480;
  const PANEL_MIN = innerHeight <= 700 ? 168 : 180;
  function layout() {
    const wide = innerWidth >= 900;
    const h = innerHeight - (wide ? 48 : 44 + 44 + PANEL_MIN); // 패널 = 아이템 줄 + 카드 두 줄(두 줄 이름)
    const k = Math.max(1, Math.min(wide ? 3 : innerWidth / 180, h / 240));
    mapW = Math.floor(180 * k); mapH = Math.floor(240 * k);
    document.documentElement.style.setProperty("--mapw", mapW + "px");
    document.documentElement.style.setProperty("--maph", mapH + "px");
    R.resize(mapW, mapH, devicePixelRatio || 1);
    const d = Math.min(2, devicePixelRatio || 1);
    fxc.width = Math.round(mapW * d); fxc.height = Math.round(mapH * d);
    fx2.setTransform(d, 0, 0, d, 0, 0);
  }

  // ── 게임 상태 ──
  let g: any, sel: { x: number; y: number } | null = null, pick: string | null = null, itemSel: number | null = null;
  let speed = 1, paused = false, menuOpen = false, shake = 0, lastLeak = 0;
  const floats: any[] = [];
  function startMap() {
    g = E.create(run.map, (Math.random() * 1e9) | 0, { lap: run.lap, legends: run.legends });
    sel = pick = itemSel = null;
    floats.length = 0;
    R.setMap(g);
    renderPanel(); renderPreview(); hudKey = ""; hud();
  }

  // ── 그리기: 3D 장면 + 그 위 겹 캔버스(떠오르는 숫자·새어 듦 테) ──
  const UI: any = { sel: null, range: null, ghost: null, slots: false, aim: null, reduce: false };
  const RANGE = { x: 0, y: 0, r: 0 }, GHOST = { kind: "unit", x: 0, y: 0 }, AIM = { x: 0, y: 0, r: 0, row: false };
  function draw(dt: number) {
    const selT = sel && g.towers.find((o: any) => o.x === sel!.x && o.y === sel!.y);
    UI.sel = sel; UI.range = null; UI.ghost = null; UI.aim = null; UI.reduce = reduce;
    if (sel) {
      const kind = selT ? selT.kind : pick;
      if (kind) {
        RANGE.x = sel.x; RANGE.y = sel.y; RANGE.r = (selT ? (E.stats(selT) as any) : D.TOWERS[kind].lv[0]).range; UI.range = RANGE;
        if (!selT) { GHOST.kind = kind; GHOST.x = sel.x; GHOST.y = sel.y; UI.ghost = GHOST; }
      }
    }
    UI.slots = !!(sel && !selT) || !!pick;
    if (itemSel != null && aim && g.items[itemSel]) {
      const it = D.ITEMS.kinds[g.items[itemSel]];
      AIM.x = aim.x; AIM.y = aim.y; AIM.r = it.r || 0; AIM.row = !!it.row; UI.aim = AIM;
    }
    R.sync(g, dt, UI);
    R.render();
    // 흔들림: 캔버스 자체를 몇 px 옮긴다
    const sh = shake > 0 && !reduce ? `translate(${Math.round((Math.random() - 0.5) * 2 * shake)}px, ${Math.round((Math.random() - 0.5) * 2 * shake)}px)` : "";
    if (cv.style.transform !== sh) cv.style.transform = sh;
    fx2.clearRect(0, 0, mapW, mapH);
    fx2.font = "800 13px 'Pretendard Variable', Pretendard, system-ui, sans-serif"; fx2.textAlign = "center"; fx2.textBaseline = "middle"; fx2.lineJoin = "round";
    for (const f of floats) {
      const p = R.toScreen(f.x, f.y, 0.6);
      fx2.globalAlpha = Math.min(1, f.life / 0.3);
      fx2.lineWidth = 3.5; fx2.strokeStyle = f.edge; fx2.strokeText(f.t, p.x, p.y - f.rise);
      fx2.fillStyle = f.c; fx2.fillText(f.t, p.x, p.y - f.rise);
    }
    fx2.globalAlpha = 1;
    if (lastLeak > 0) { fx2.strokeStyle = C.red; fx2.globalAlpha = Math.min(0.8, lastLeak / 0.25); fx2.lineWidth = 6; fx2.strokeRect(3, 3, mapW - 6, mapH - 6); fx2.globalAlpha = 1; }
  }

  // ── 사건 → 그림·소리 ──
  function float(t: string, x: number, y: number, c: string, edge: string) { floats.push({ t, x, y, c, edge, life: 0.8, rise: 0 }); if (floats.length > 12) floats.shift(); }
  function events() {
    for (const ev of g.events) {
      R.event(ev); // 3D 연출(퍼프·아이템·쿠션·반짝이·그릇 흔들림)은 렌더러가 — 비우기 전에 넘긴다
      switch (ev.e) {
        case "shot": sfx.shot(); break;
        case "snipe": sfx.snipe(); break;
        case "boom": sfx.boom(); break;
        case "kill": {
          const big = ev.en.grade === "major" || ev.en.grade === "critical" || ev.en.grade === "blocker";
          sfx.kill(big);
          if (ev.reward) float("+" + ev.reward, ev.en.x, ev.en.y - 0.3, C.coin, C.coinEdge);
          if (big && !reduce) shake = Math.max(shake, 1);
          break;
        }
        case "leak": {
          const big = ev.loss >= 8;
          sfx.leak(big); lastLeak = big ? 0.5 : 0.25;
          const lane = g.map.lanes[0], [gx, gy] = lane[lane.length - 1];
          float("-" + ev.loss, Math.min(8.5, Math.max(0.5, gx + 0.5)), Math.min(11, Math.max(0.5, gy)) - 0.2, C.red, C.redEdge);
          if (!reduce) shake = Math.max(shake, big ? 2 : 1);
          break;
        }
        case "drop": sfx.drop(); float("+", ev.x, ev.y - 0.5, C.coin, C.coinEdge); renderPanel(); break;
        case "dropCoin": sfx.coin(); float("+" + ev.coin, ev.x, ev.y - 0.4, C.coin, C.coinEdge); break;
        case "cleared": sfx.coin(); toast(`웨이브 ${ev.n} 막음 · 보너스 +${ev.bonus}`); renderPreview(); renderPanel(); break;
        case "wave": sfx.wave(); renderPreview(); break;
        case "early": float("+" + ev.bonus, 4.5, 0.8, C.coin, C.coinEdge); break;
        case "phase": sfx.siren(); toast(ev.name); break;
        case "legendDrop": sfx.legend(); break;
        case "lost": sfx.lose(); setTimeout(() => showLost(), 700); break;
        case "won": setTimeout(() => onWon(ev.stars), 500); break;
      }
    }
    g.events.length = 0;
  }

  // ── 고정 시간 단계(2× = 한 프레임에 두 단계, 결과가 같다) ──
  let acc = 0, last = 0;
  const frames: number[] = [];
  const resultEl = $("#result");
  const overOpen = () => resultEl.classList.contains("on") || $("#start").classList.contains("on");
  function running() { return !paused && !menuOpen && !overOpen() && g.state !== "won" && g.state !== "lost"; }
  function loop(now: number) {
    const dt = Math.min(0.1, (now - last) / 1000 || 0); last = now;
    if (STRESS && frames.length < 20000) frames.push(dt * 1000);
    if (running()) {
      acc += dt * speed;
      shotBudget = Math.min(10, shotBudget + dt * 10);
      let n = 0;
      while (acc >= D.DT && n < 8) { E.step(g); acc -= D.DT; n++; events(); }
      if (n === 8) acc = 0;
    }
    for (const f of floats) { f.rise += dt * 28; f.life -= dt; }
    for (let i = floats.length; i--; ) if (floats[i].life <= 0) floats.splice(i, 1);
    shake = Math.max(0, shake - dt * 10); lastLeak = Math.max(0, lastLeak - dt);
    draw(paused || menuOpen ? 0 : dt);
    hud();
    requestAnimationFrame(loop);
  }

  // ── HUD·웨이브 줄·패널 ──
  let hudKey = "";
  function hud() {
    const k = [g.gate, g.money, g.wave, g.state, g.prepLeft | 0].join();
    if (k === hudKey) return; hudKey = k;
    const set = (el: HTMLElement, v: string | number) => { if (el.textContent !== String(v)) el.textContent = String(v); };
    set($("#gateNum"), g.gate);
    $("#gateBar i").style.width = `${Math.ceil(g.gate / 10) * 10}%`;
    $("#gateBar").classList.toggle("low", g.gate <= 30);
    set($("#money"), g.money);
    set($("#waveNo"), `W ${g.wave}/${g.waves.length}`);
    $("#waveNo").style.setProperty("--wp", String(g.wave / g.waves.length));
    const call = $<HTMLButtonElement>("#call"), canCall = g.state === "prep" && g.wave < g.waves.length;
    call.disabled = !canCall;
    set(call, !canCall ? "진행 중" : g.prepLeft != null ? `▶ 지금 +${Math.floor(g.prepLeft)}` : "▶ 부르기");
    refreshAfford();
  }
  const towerIcon = (kind: string, t?: any, css = 32) => ico({ tower: kind, level: t ? t.level : 0, branch: t ? t.branch : null }, css);
  function renderLegends() {
    const box = $("#legs"); box.textContent = "";
    for (let i = 0; i < D.LEGENDS.cap; i++) {
      const l = g.legends[i], sp = document.createElement("span");
      if (!l) { sp.className = "leg empty"; sp.title = "빈 전설 칸(로봇 청소기 대왕을 쫓아내면 생긴다)"; box.append(sp); continue; }
      sp.className = "leg"; sp.title = `${D.LEGENDS.kinds[l.kind].name} ${l.lv}단계`;
      const dots = document.createElement("i"); dots.className = "lvd"; dots.dataset.lv = String(l.lv);
      sp.append(ico({ legend: l.kind }, 24), dots); box.append(sp);
    }
  }
  function renderPreview() {
    renderLegends();
    const box = $("#preview"); box.textContent = "";
    const w = g.waves[g.wave];
    if (!w) { box.append("마지막 웨이브"); return; }
    const count: Record<string, number> = {}; for (const [gr, n] of w) count[gr] = (count[gr] ?? 0) + n;
    for (const gr of ["blocker", "critical", "major", "minor", "trivial"]) if (count[gr]) {
      const sp = document.createElement("span"); sp.className = "num"; sp.title = GRADE_NAME[gr];
      sp.append(ico({ grade: gr }, 24), "×" + count[gr]); box.append(sp);
    }
  }
  const KINDS = ["unit", "lint", "integ", "review", "monitor", "ci"]; // 6장 다 보인다. 안 열린 것은 자물쇠 자리
  const TIER_LABEL: Record<string, string> = { low: "하", mid: "중", high: "상", top: "최" };
  function itemsRow() {
    const row = document.createElement("div"); row.className = "items";
    for (let i = 0; i < D.ITEMS.slots; i++) {
      const b = document.createElement("button"); b.className = "slot";
      const kind = g.items[i];
      if (kind) {
        const def = D.ITEMS.kinds[kind];
        b.append(ico({ item: kind }, 32));
        const lv = document.createElement("span"); lv.className = "lv"; lv.textContent = TIER_LABEL[def.tier]; b.append(lv);
        b.setAttribute("aria-label", def.name); b.title = def.name;
        b.setAttribute("aria-pressed", itemSel === i ? "true" : "false");
        b.onclick = () => { unlock(); itemSel = itemSel === i ? null : i; sel = pick = null; renderPanel(); };
      } else { b.disabled = true; b.setAttribute("aria-label", "빈 아이템 칸"); }
      row.append(b);
    }
    const hint = document.createElement("span"); hint.className = "hint";
    hint.textContent = itemSel != null ? `${D.ITEMS.kinds[g.items[itemSel]].name}: 맵을 눌러 쓴다` : "싫은 것을 쫓아내면 가끔 아이템이 떨어진다";
    row.append(hint);
    return row;
  }
  function renderPanel() {
    const p = $("#panel"); p.textContent = "";
    p.append(itemsRow());
    const t = sel && g.towers.find((o: any) => o.x === sel!.x && o.y === sel!.y);
    if (t) { p.append(towerPanel(t)); return; }
    const row = document.createElement("div"); row.className = "row";
    const open: string[] = E.towersOf(g);
    for (const k of KINDS) {
      const def = D.TOWERS[k], b = document.createElement("button");
      b.className = "card"; b.dataset.kind = k;
      if (!open.includes(k)) { // 첫날에 아직 안 열린 놀잇감: 자리만
        const mi = D.MAPS.findIndex((m: any) => m.towers.includes(k));
        const name = document.createElement("b"); name.textContent = def.name;
        const msg = document.createElement("span"); msg.className = "lockmsg"; msg.textContent = `맵${mi + 1} 에서 열림`;
        b.classList.add("locked"); b.disabled = true; b.setAttribute("aria-label", `${def.name} · 맵${mi + 1} 에서 열림`);
        b.append(towerIcon(k), name, msg); row.append(b); continue;
      }
      b.setAttribute("aria-pressed", pick === k ? "true" : "false");
      const name = document.createElement("b"); name.textContent = def.name;
      const cost = document.createElement("span"); cost.className = "num coin"; cost.textContent = def.cost;
      const role = document.createElement("span"); role.className = "stats"; role.textContent = def.role;
      b.append(towerIcon(k), name, role, cost);
      b.onclick = () => { unlock(); if (!sel) { pick = k; toast("이제 맵의 빈 칸을 누른다"); renderPanel(); return; } if (pick === k) return doBuild(); pick = k; renderPanel(); };
      row.append(b);
    }
    p.append(row);
    if (sel && pick) {
      const acts = document.createElement("div"); acts.className = "acts";
      const b = document.createElement("button"); b.className = "btn"; b.id = "buildBtn"; b.textContent = `짓기 ${D.TOWERS[pick].cost}`; b.onclick = doBuild;
      const c = document.createElement("button"); c.className = "btn ghost"; c.textContent = "취소"; c.onclick = () => { sel = pick = null; renderPanel(); };
      acts.append(b, c); p.append(acts);
    }
    refreshAfford();
  }
  function refreshAfford() {
    for (const b of document.querySelectorAll<HTMLElement>("#panel .card:not(.locked)")) b.setAttribute("aria-disabled", g.money < D.TOWERS[b.dataset.kind!].cost ? "true" : "false");
    const bb = $<HTMLButtonElement>("#buildBtn"); if (bb && pick) bb.disabled = g.money < D.TOWERS[pick].cost;
    for (const b of document.querySelectorAll<HTMLButtonElement>("[data-cost]")) b.disabled = g.money < +b.dataset.cost!;
  }
  function doBuild() {
    if (!sel || !pick) return;
    const t = E.build(g, pick as E.TowerKind, sel.x, sel.y);
    if (!t) { toast("돈이 모자란다"); return; }
    sfx.build();
    pick = null; renderPanel();
  }
  function towerPanel(t: any) {
    const def = D.TOWERS[t.kind], st: any = E.stats(t), box = document.createElement("div");
    const head = document.createElement("div"); head.className = "sel";
    const ic = document.createElement("div"); ic.className = "slot"; ic.append(towerIcon(t.kind, t));
    const info = document.createElement("div");
    const lvTxt = t.branch ? `★ ${def.br[t.branch].name}` : "●".repeat(t.level + 1) + "○".repeat(2 - t.level);
    const pct = (v: number) => Math.round(v * 100) + "%";
    const desc = t.kind === "lint" ? `느리게 ${pct(st.slow)} · 사거리 ${st.range}` + (st.vuln ? ` · 받는 피해 +${pct(st.vuln)}` : "")
      : t.kind === "monitor" ? `숨은 것 찾아냄 · 받는 피해 +${pct(st.mark)} · 사거리 ${st.range}` + (st.steady ? " · 들쭉날쭉 못 피함" : "")
      : t.kind === "ci" ? `옆 놀잇감 빠르게 +${pct(st.haste)} · 사거리 ${st.range}` + (st.rangeAdd ? ` · 옆 사거리 +${st.rangeAdd}` : "")
      : `피해 ${st.dmg}${st.multi ? "×" + st.multi : ""} · ${(1 / st.period).toFixed(1)}발/초 · 사거리 ${st.range}` + (st.splash ? ` · 퍼짐 ${st.splash}` : "") + (st.ramp ? " · 같은 상대면 빨라짐" : "") + (t.kind === "review" ? " · 단단해도 뚫음" : "") + (st.bigMul ? ` · 초인종 이상 ×${st.bigMul}` : "") + (st.line ? ` · 뒤 ${st.line - 1}마리 꿰뚫음` : "");
    const b = document.createElement("b"); b.textContent = def.name;
    const pips = document.createElement("span"); pips.className = "pips"; pips.textContent = lvTxt;
    const stats = document.createElement("span"); stats.className = "stats"; stats.textContent = desc;
    info.append(b, " ", pips, document.createElement("br"), stats);
    head.append(ic, info); box.append(head);
    const acts = document.createElement("div"); acts.className = "acts";
    if (!t.branch && t.level < 2) {
      const c = def.lv[t.level + 1].cost, ub = document.createElement("button");
      ub.className = "btn"; ub.dataset.cost = c; ub.textContent = `올리기 ${c}`;
      ub.onclick = () => { if (E.upgrade(g, t)) { sfx.build(); renderPanel(); } };
      acts.append(ub);
    } else if (!t.branch) {
      for (const br of ["a", "b"]) {
        const c = def.br[br].cost, bb = document.createElement("button");
        bb.className = "btn branch"; bb.dataset.cost = c; bb.textContent = `${def.br[br].name} ${c}`;
        bb.onclick = () => { if (E.upgrade(g, t, br as E.Branch)) { sfx.build(); renderPanel(); } };
        acts.append(bb);
      }
    }
    if (!["lint", "monitor", "ci"].includes(t.kind)) { // 조준이 있는 놀잇감만(나머지는 범위 전체)
      const m = document.createElement("button"); m.className = "btn ghost";
      const names: Record<string, string> = { first: "맨 앞", strong: "센 놈", close: "가까운" };
      m.textContent = "조준: " + names[t.mode];
      m.onclick = () => { t.mode = t.mode === "first" ? "strong" : t.mode === "strong" ? "close" : "first"; renderPanel(); };
      acts.append(m);
    }
    const sell = document.createElement("button"); sell.className = "btn ghost";
    sell.textContent = `팔기 +${E.refund(g, t)}`;
    sell.onclick = () => { E.sell(g, t); sfx.coin(); sel = null; renderPanel(); };
    acts.append(sell);
    box.append(acts);
    return box;
  }
  let toastT = 0;
  function toast(m: string) { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toastT); toastT = window.setTimeout(() => t.classList.remove("on"), 1400); }

  // ── 누르기: 바닥 평면 레이캐스트로 칸을 고른다 ──
  let aim: { x: number; y: number } | null = null;
  const tile = (ev: PointerEvent) => R.pick(ev.clientX, ev.clientY) || { x: -1, y: -1 };
  cv.addEventListener("pointerdown", ev => {
    unlock();
    const p = tile(ev);
    if (itemSel != null) { aim = p; return; }
    const x = Math.floor(p.x), y = Math.floor(p.y);
    const t = g.towers.find((o: any) => o.x === x && o.y === y);
    const free = g.slots.some(([a, b]: number[]) => a === x && b === y);
    if (t || free) { if (sel && sel.x === x && sel.y === y && !t) { sel = null; pick = null; } else { sel = { x, y }; if (t) pick = null; } }
    else { sel = null; pick = null; }
    renderPanel();
  });
  cv.addEventListener("pointermove", ev => { if (itemSel != null && aim) aim = tile(ev); });
  cv.addEventListener("pointerup", ev => {
    if (itemSel == null || !aim) return;
    const p = tile(ev), kind = g.items[itemSel], it = D.ITEMS.kinds[kind];
    E.useItem(g, itemSel, p.x, p.y);
    events();
    if (kind === "hammer" || kind === "swatter") sfx.hammer(); else sfx.palm();
    if (!reduce) shake = Math.max(shake, it.tier === "low" ? 1 : 2);
    itemSel = null; aim = null; renderPanel();
  });

  $("#call").onclick = () => { unlock(); E.startWave(g); events(); };
  $("#speed").onclick = () => { speed = speed === 1 ? 2 : 1; $("#speed").textContent = speed + "×"; $("#speed").setAttribute("aria-pressed", speed === 2 ? "true" : "false"); };
  document.addEventListener("visibilitychange", () => { paused = document.hidden; });

  // ── 큰 상자들(시작·결과·전설 고르기·랭크) ──
  const resultBox = $("#resultBox");
  const lapLabel = (n: number) => D.LAPS.name(n);
  const esc = (v: string) => v.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  function openBox(html: string) { resultBox.innerHTML = html; resultEl.classList.add("on"); }
  function closeBox() { resultEl.classList.remove("on"); }
  const mapName = (i: number) => D.MAPS[i].name;
  const starsHtml = (n: number) => `<span class="stars" aria-label="별 ${n}개">${[0, 1, 2].map(i => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</span>`;
  const LEG_EFF: Record<string, (lv: number) => string> = {
    exterminator: lv => `모든 놀잇감 피해 +${[6, 9, 12][lv - 1]} %`,
    bugbomb: lv => `공 발사대·투석기 ${[10, 8, 6][lv - 1]}발째마다 간식 구름`,
    bigslipper: lv => `${[20, 16, 12][lv - 1]}초마다 맨 앞 싫은 것에 큰 쿠션`,
  };
  function legendCard(kind: string, lv: number, tag = "button") {
    const el = document.createElement(tag); el.className = "lcard";
    const name = document.createElement("b"); name.textContent = D.LEGENDS.kinds[kind].name;
    const dots = document.createElement("i"); dots.className = "lvd"; dots.dataset.lv = String(lv); dots.setAttribute("aria-label", lv + "단계");
    const eff = document.createElement("span"); eff.className = "eff"; eff.textContent = LEG_EFF[kind](lv);
    el.append(ico({ legend: kind }, 48), name, dots, eff);
    return el;
  }

  // ① 맵 지켜 냄 → 저장하고 다음 맵 / ② 로봇 청소기 대왕을 쫓아냄 → 전설 + 하루 넘김
  function onWon(stars: number) {
    const simSec = g.time, gate = g.gate, done = run.map, lap = run.lap;
    if (run.map < D.MAPS.length - 1) {
      run = afterMapWon(run, simSec); store.save(run);
      openBox(`<p class="sub">${lapLabel(lap)} · 맵 ${done + 1} ${esc(mapName(done))}</p><h2 class="title">지켜 냈다!</h2>
        <p class="hi">밥그릇 ${gate} ${starsHtml(stars)}</p>
        <p class="sub">저장했다. 다음에 열면 맵 ${run.map + 1} 부터 잇는다.</p>
        <div class="rbtns"><button class="btn" id="again">다음 맵: ${esc(mapName(run.map))} ▶</button></div>`);
      $("#again").onclick = () => { closeBox(); startMap(); };
      return;
    }
    const kind = g.legendDrop as E.LegendKind;
    const finish = (legends: Run["legends"], gained: { kind: string; lv: number } | null) => {
      run = afterMapWon({ ...run, legends }, simSec); store.save(run);
      sfx.legend();
      openBox(`<p class="sub">맵 5 ${esc(mapName(4))} · 로봇 청소기 대왕을 쫓아냈다</p><h2 class="title">${lapLabel(lap)} 무사히</h2>
        <p class="hi">${!gained ? "새 전설은 버렸다" : gained.lv > 1 ? "전설 강화" : "전설 획득"}</p><div id="gainCard"></div>
        <p class="sub">다음 날: 싫은 것 체력 ×${(D.LAPS.hp ** lap).toFixed(2)} · 새 성질이 붙는다</p>
        <div class="rbtns"><button class="btn" id="again">${lapLabel(run.lap)} 시작 ▶</button></div>`);
      if (gained) {
        const card = legendCard(gained.kind, gained.lv, "div"); card.classList.add("solo");
        const tagEl = document.createElement("span"); tagEl.className = "gain";
        tagEl.innerHTML = gained.lv > 1 ? `강화 <i class="lvd" data-lv="${gained.lv}"></i>` : "NEW";
        card.append(tagEl); $("#gainCard").replaceWith(card);
      } else $("#gainCard").remove();
      $("#again").onclick = () => { closeBox(); startMap(); };
    };
    const r = E.addLegend(run.legends, kind);
    if (!r.needChoice) { finish(r.list, r.list.find(l => l.kind === kind) ?? null); return; }
    showDrop(kind, finish);
  }
  // 하나 버리기: 가진 2 + 새것 1 중 하나를 누르고 「버리기」(-1 = 새것)
  function showDrop(incoming: E.LegendKind, finish: (l: Run["legends"], gained: { kind: string; lv: number } | null) => void) {
    const have = run.legends;
    openBox(`<h2 class="title">전설은 둘까지</h2><p class="sub">하나를 버린다. 새것을 버려도 된다.</p>
      <div class="lcards" id="lcards"></div>
      <div class="acts"><button class="btn danger" id="dropBtn" disabled>버릴 것을 고른다</button></div>`);
    const wrap = $("#lcards"), all = [...have.map((l, i) => ({ ...l, i })), { kind: incoming, lv: 1, i: -1 }];
    let pickI: number | null = null;
    for (const l of all) {
      const c = legendCard(l.kind, l.lv);
      if (l.i === -1) { c.classList.add("new"); const rb = document.createElement("span"); rb.className = "ribbon"; rb.textContent = "NEW"; c.prepend(rb); }
      c.setAttribute("aria-pressed", "false");
      c.onclick = () => {
        pickI = l.i;
        for (const o of wrap.children) o.setAttribute("aria-pressed", o === c ? "true" : "false");
        const b = $<HTMLButtonElement>("#dropBtn"); b.disabled = false; b.textContent = `「${D.LEGENDS.kinds[l.kind].name}」 버리기`;
      };
      wrap.append(c);
    }
    $("#dropBtn").onclick = () => {
      if (pickI == null) return;
      const r = E.addLegend(have, incoming, pickI);
      finish(r.list, pickI === -1 ? null : { kind: incoming, lv: 1 });
    };
  }
  // ③ 진 맵: 이 맵 다시(주) · 그만두기 → 랭크 등록(부)
  function showLost() {
    run.simSec += g.time; store.save(run);
    openBox(`<p class="sub">${lapLabel(g.lap)} · 맵 ${g.mapIndex + 1} ${esc(g.map.name)} · W ${g.wave}/${g.waves.length}</p><h2 class="title bad">밥그릇이 비었다</h2>
      <p class="hi">밥그릇 0</p>
      <p class="sub">다시 하자! 이 맵을 처음부터.<br>날짜와 전설은 그대로 남는다.</p>
      <div class="rbtns"><button class="btn" id="again">이 맵 다시 ▶</button><button class="btn ghost danger" id="quit">그만두기 → 랭크 등록</button></div>`);
    $("#again").onclick = () => { unlock(); closeBox(); startMap(); };
    $("#quit").onclick = () => showRankEntry();
  }

  // ── 메뉴(≡): 열려 있는 동안 멈춘다 ──
  function menuSync() {
    for (const [id, on] of [["#mSnd", isSoundOn()], ["#mReduce", reduce]] as const) { $(id).setAttribute("aria-pressed", on ? "true" : "false"); $(id + " .mstate").textContent = on ? "켬" : "끔"; }
    $("#menuWhere").textContent = `${lapLabel(g.lap)} · 맵 ${g.mapIndex + 1} ${g.map.name} · W ${g.wave}/${g.waves.length}`;
  }
  function openMenu() { menuOpen = true; menuSync(); $("#menu").classList.add("on"); $("#mResume").focus(); }
  function closeMenu() { menuOpen = false; $("#menu").classList.remove("on"); }
  $("#menuBtn").onclick = () => { unlock(); openMenu(); };
  $("#mSnd").onclick = () => { setSoundOn(!isSoundOn()); if (isSoundOn()) unlock(); menuSync(); };
  $("#mReduce").onclick = () => { reduce = !reduce; document.documentElement.classList.toggle("reduce", reduce); menuSync(); };
  $("#mQuit").onclick = () => { closeMenu(); run.simSec += g.time; g.state = "lost"; showRankEntry(); };
  $("#mResume").onclick = closeMenu;
  $("#menu").onclick = e => { if (e.target === $("#menu")) closeMenu(); };
  addEventListener("keydown", e => { if (e.key === "Escape" && $("#menu").classList.contains("on")) closeMenu(); });

  // 이름 칸: 예전엔 A–Z 바퀴 3칸(이니셜)이었다. Dean 10-28 「10글자 미만, 한글도, 이니셜일 필요는 없다」 → 서바이버와 같은 글 입력 칸
  function showRankEntry() {
    const laps = clearedLaps(run);
    openBox(`<h2 class="title bad">오늘은 여기까지</h2>
      <p class="hi">무사히 지낸 날 ${laps}일</p>
      <p class="sub">랭크에 이름을 남긴다</p>
      <label class="field">이름(${NAME_MAX}자까지)<input id="name" class="name" maxlength="${NAME_MAX}" autocomplete="off" spellcheck="false" placeholder="예: 코코 주인"></label>
      <small class="name-hint" id="nameHint" aria-live="polite" hidden></small>
      <label class="field">한마디(20자)<input id="say" maxlength="20" autocomplete="off" placeholder="예: 개껌이 다 했다"></label>
      <div class="acts"><button class="btn" id="enter">등록</button></div>`);
    const nameIn = $<HTMLInputElement>("#name"), hint = $("#nameHint");
    nameIn.oninput = () => { hint.hidden = true; };
    const enter = $<HTMLButtonElement>("#enter");
    enter.onclick = async () => {
      const { name, say, ok } = cleanEntry(nameIn.value, $<HTMLInputElement>("#say").value);
      if (!ok) { hint.textContent = "이름을 넣어 주세요"; hint.hidden = false; nameIn.focus(); return; }
      enter.disabled = true;
      const rows = await submit({ name, lap: laps, say, simSec: Math.round(run.simSec) });
      // 판은 여기서 끝난다 — 저장을 지우고 최고 기록만 남긴다
      run = freshRun(run.best); store.save(run);
      const d = new Date(), date = String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      showBoard(rows ?? (await fetchTop()) ?? [], rows ? { name, lap: laps, say, date } : null, !rows);
    };
  }
  function showBoard(rows: RankRow[], me: RankRow | null, failed: boolean) {
    const meAt = me ? rows.findIndex(r => r.name === me.name && r.lap === me.lap && r.say === me.say) : -1;
    const table = rows.length
      ? `<table class="rank"><colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5"></colgroup>
      <thead><tr><th>순위</th><th>이름</th><th>날</th><th>한마디</th><th>날짜</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr class="${i === meAt ? "me" : ""}"><td class="n">${i + 1}</td><td class="n">${esc(r.name)}</td><td class="n">${r.lap}일</td><td class="say">${esc(r.say || "—")}</td><td class="n">${esc(r.date)}</td></tr>`).join("")}
      </tbody></table>`
      : `<p class="sub">아직 기록이 없다</p>`; // 빈 줄을 표에 넣으면 1위 칸 색이 칠해진다
    openBox(`<h2 class="title">랭킹</h2>${failed ? `<p class="sub">지금은 등록이 안 된다</p>` : ""}
      ${table}<div class="acts"><button class="btn" id="again">▶ 다시</button></div>`);
    $("#again").onclick = () => { closeBox(); startMap(); showStart(); };
    paintHi(rows[0]);
  }

  // ── 시작 화면: 이어하기 / 새로 시작 ──
  function paintHi(top?: RankRow) {
    const hi = $("#hi");
    if (!top) { hi.hidden = true; return; }
    hi.hidden = false; $("#hiName").textContent = top.name; $("#hiLap").textContent = `${top.lap}일`;
  }
  function showStart() {
    const box = $("#startActs");
    $("#startWhere").textContent = `${lapLabel(run.lap)} · ${mapName(run.map)}`;
    const go = () => { unlock(); $("#start").classList.remove("on"); startMap(); sfx.wave(); };
    if (!hasProgress(run)) {
      box.innerHTML = `<button class="btn" id="go" style="width:100%">▶ 시작</button>`;
      $("#go").onclick = go;
    } else {
      box.innerHTML = `<button class="btn" id="cont">이어하기 <span class="num">${lapLabel(run.lap)}</span> · 맵 ${run.map + 1}</button>
        <div class="acts"><button class="btn ghost" id="newRun">새로 시작</button></div>`;
      $("#cont").onclick = go;
      $("#newRun").onclick = () => {
        $("#newRun").parentElement!.outerHTML = `<div class="confirm"><p>저장을 지운다. ${lapLabel(run.lap)} · 맵 ${run.map + 1} 기록과 전설이 사라진다.</p>
          <div class="acts"><button class="btn ghost" id="wipeNo">취소</button><button class="btn danger" id="wipe">지우고 새로 시작</button></div></div>`;
        $("#wipeNo").onclick = () => showStart();
        $("#wipe").onclick = () => { run = freshRun(run.best); store.save(run); startMap(); showStart(); };
      };
    }
    $("#start").classList.add("on");
  }

  // ── 시작 화면 도감(구운 3D 아이콘)·밥그릇 아이콘 ──
  (function dex() {
    const box = $("#dex");
    for (const gr of ["trivial", "minor", "major", "critical", "blocker"]) {
      const f = document.createElement("figure"), cap = document.createElement("figcaption");
      cap.textContent = GRADE_NAME[gr];
      f.append(ico({ grade: gr }, gr === "blocker" ? 48 : 40), cap); box.append(f);
    }
    $<HTMLImageElement>("#gateIco").src = R.icon({ gate: true }, Math.round(20 * ICON_DPR));
  })();

  // ── 실측: #stress 면 놀잇감 12개(3단계) + 싫은 것 80마리(시안과 같은 판) ──
  function spawnAt(gr: string, dist: number) { g.spawnQ.unshift({ at: g.time, grade: gr, traits: [], lane: 0 }); E.step(g, 0); const en = g.enemies[g.enemies.length - 1]; en.dist = dist; return en; }
  W.__stress = (n = 80) => {
    $("#start").classList.remove("on");
    const plan: [string, number, number][] = [["integ", 2, 3], ["integ", 4, 3], ["integ", 4, 7], ["integ", 2, 7], ["unit", 0, 3], ["unit", 6, 3], ["unit", 0, 7], ["unit", 6, 7], ["lint", 3, 1], ["lint", 5, 4], ["lint", 3, 6], ["unit", 5, 9]];
    g.money = 99999;
    for (const [k, x, y] of plan) { const t = E.build(g, k as E.TowerKind, x, y); if (t) { E.upgrade(g, t); E.upgrade(g, t); } }
    g.state = "wave"; g.wave = 9;
    const lane = g.lanes[0], grades = ["trivial", "trivial", "minor", "minor", "major", "critical"];
    const refill = () => { while (g.enemies.length < n) { const en = spawnAt(grades[(Math.random() * grades.length) | 0], Math.random() * lane.total * 0.6); en.hp = en.maxHp = en.maxHp * 4; } };
    refill(); setInterval(refill, 250);
    return { towers: g.towers.length, enemies: g.enemies.length };
  };
  W.__frames = () => frames.splice(0);
  W.__game = () => ({ g, run });
  // 리그용: 칸 → 화면 좌표(3D 라 칸 위치를 렌더러에 묻는다)
  W.__td = { get g() { return g; }, R, tileToClient: (x: number, y: number) => { const r = cv.getBoundingClientRect(), p = R.toScreen(x, y, 0); return { x: r.left + p.x, y: r.top + p.y }; } };

  addEventListener("resize", layout);
  layout(); startMap(); showStart();
  fetchTop().then(rows => paintHi(rows?.[0]));
  requestAnimationFrame(t => { last = t; loop(t); });
  if (STRESS) W.__stress();
}
