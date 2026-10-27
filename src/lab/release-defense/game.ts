// 릴리스 디펜스 — 화면 쪽(그리기·누르기·소리·흐름). 규칙과 수치는 engine.ts, 그림은 art-*.js(디자인 정본 사본).
// 뼈대는 디자인 세션 시안 docs/lab-defense-mock.html 의 스크립트를 그대로 옮겼다. 시안에 없던 것:
// 맵 1–5 이어 가기·바퀴(lap)·전설(패시브, 「하나 버리기」)·이어하기 저장(D2)·진 맵 다시/그만두기(D1)·검사 6종·보스 연출·랭킹 서버.
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as E from "./engine";
import "./art-map.js";
import "./art-bugs.js";
import "./art-towers.js";
import { isSoundOn, setSoundOn } from "@/lab/sound";
import { SAVE_KEY, freshRun, afterMapWon, parseRun, hasProgress, clearedLaps, type Run } from "./save";
import { fetchTop, submit, cleanEntry, type RankRow } from "./rank";

export function initGame() {
  const D: any = E.DATA;
  const A: any = (window as any).TDArt || {};
  (window as any).TDEngine = E; // 맵 그림(art-map.js)이 길 타일을 엔진에서 읽는다 — 디자인 정본이 전역 이름으로 찾는다
  const $ = <T extends HTMLElement = HTMLElement>(q: string) => document.querySelector(q) as T;
  const REDUCE_OS = matchMedia("(prefers-reduced-motion: reduce)");
  let reduce = REDUCE_OS.matches || location.hash.includes("reduce");
  document.documentElement.classList.toggle("reduce", reduce);
  const STRESS = location.hash.includes("stress");
  const TS = 20; // 타일 = 20 아트 px
  const C = { k0: "#07060f", text: "#eef1f8", coin: "#ffd86b", cyan: "#6ee6ff", cyan2: "#2aa6d6", pink: "#ff8be0", pink2: "#e050c0", red: "#ff5e5b", red2: "#d8324a", violet: "#c9a4ff", green: "#7ee87e" };

  // ── 저장(막혀 있으면 없는 셈) ──
  const store = {
    load(): Run | null {
      try {
        return parseRun(localStorage.getItem(SAVE_KEY));
      } catch {
        return null;
      }
    },
    save(r: Run) {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(r));
      } catch {
        /* 저장 없이 한다 */
      }
    },
  };
  let run: Run = store.load() ?? freshRun();

  // ── 소리: 실험실 sound.ts 결(사각·삼각파, 0.15 이하). 켬/끔은 실험실 전체 값(isSoundOn)을 따른다 ──
  let ac: AudioContext | null = null;
  function unlock() {
    if (!isSoundOn()) return;
    try {
      ac ??= new AudioContext();
      if (ac.state === "suspended") ac.resume();
    } catch {
      ac = null;
    }
  }
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
    siren() { tone(220, 260, { type: "triangle", to: 330, gain: 0.09 }); tone(330, 260, { type: "triangle", to: 220, gain: 0.09, at: 260 }); },
    legend() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 120, { type: "triangle", gain: 0.1, at: i * 110 })); },
  };

  // ── 그림 굽기: 스프라이트 프레임(함수)을 캔버스로 한 번 구워 둔다 ──
  function bake(w: number, h: number, fn: (x: CanvasRenderingContext2D) => void) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d")!; x.imageSmoothingEnabled = false; fn(x); return c;
  }
  const cache = new Map<any, any>();
  function frameCv(spr: any, i: number, kind = "frames"): HTMLCanvasElement {
    let m = cache.get(spr); if (!m) cache.set(spr, (m = {}));
    const k = kind + i;
    if (!m[k]) m[k] = kind === "white" ? A.bugs.whiteOf(frameCv(spr, i)) : bake(spr.w, spr.h, x => { const list = spr[kind]; const f = list[i % list.length]; if (typeof f === "function") f(x); });
    return m[k];
  }
  const animF = (spr: any, t: number, mul = 1) => Math.floor(t * (spr.fps || 6) * mul) % spr.frames.length;

  // 검사 그림: [L1, L2, L3, 갈래 A, 갈래 B]
  function towerLook(t: any) {
    const ta = A.towers[t.kind];
    const idx = t.branch ? (t.branch === "a" ? 3 : 4) : t.level;
    const look = ta.looks[idx];
    return { w: ta.w, h: ta.h, ax: ta.ax, ay: ta.ay, fps: look.fps || 4, ffps: look.ffps || 12, frames: look.frames, fire: look.fire, glow: look.glow, fireGlow: look.fireGlow, key: t.kind + idx };
  }

  // ── 화면 크기: 맵 180×240 아트 px 를 s 배. 2 이상이면 정수배(도트가 고르게) ──
  let s = 2;
  const cv = $<HTMLCanvasElement>("#cv"), cx = cv.getContext("2d")!;
  cx.imageSmoothingEnabled = false;
  function layout() {
    const wide = innerWidth >= 900;
    const h = innerHeight - (wide ? 48 : 44 + 44 + 148);
    let k = Math.min(wide ? 3 : innerWidth / 180, h / 240);
    if (k >= 2) k = Math.floor(k);
    s = Math.max(1, k);
    document.documentElement.style.setProperty("--mapw", Math.round(180 * s) + "px");
    document.documentElement.style.setProperty("--maph", Math.round(240 * s) + "px");
  }

  // ── 게임 상태 ──
  let g: any, sel: { x: number; y: number } | null = null, pick: string | null = null, itemSel: number | null = null;
  let speed = 1, paused = false, shake = 0, lastLeak = 0, clock = 0, hitstop = 0;
  const floats: any[] = [], parts: any[] = [], squash: any[] = [], uses: any[] = [], fired = new Map<number, number>();
  let floor: HTMLCanvasElement | null = null;
  function startMap() {
    g = E.create(run.map, (Math.random() * 1e9) | 0, { lap: run.lap, legends: run.legends });
    sel = pick = itemSel = null;
    floats.length = parts.length = squash.length = uses.length = 0;
    floor = bake(180, 240, x => A.map.paintStatic(x, g.map));
    renderPanel(); renderPreview(); renderLegends(); hudKey = ""; hud();
  }

  // ── 아트 해상도 도우미 ──
  const P = (v: number) => Math.round(v * TS); // 타일 → 아트 px
  function pxCircle(x0: number, y0: number, r: number, color: string, dash?: boolean) { // 계단 원(테두리 1 px), 반지름·색별로 구워 둔다
    const key = "c" + r + color + dash; let c = cache.get(key);
    if (!c) {
      const R = Math.ceil(r) + 1;
      c = bake(R * 2 + 1, R * 2 + 1, x => {
        x.fillStyle = color;
        for (let a = 0; a < 360; a += 1) {
          if (dash && ((a / 8) | 0) % 2) continue;
          x.fillRect(Math.round(R + Math.cos((a * Math.PI) / 180) * r), Math.round(R + Math.sin((a * Math.PI) / 180) * r), 1, 1);
        }
      });
      c.R = R; cache.set(key, c);
    }
    cx.drawImage(c, Math.round(x0 - c.R), Math.round(y0 - c.R));
  }
  function pxDisc(x0: number, y0: number, r: number, color: string, alpha: number) {
    cx.globalAlpha = alpha; cx.fillStyle = color;
    for (let dy = -Math.floor(r); dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); cx.fillRect(Math.round(x0 - w), Math.round(y0 + dy), w * 2 + 1, 1); }
    cx.globalAlpha = 1;
  }
  function digits(str: string, x: number, y: number, color: string) { A.digits.draw(cx, str, Math.round(x - (str.length * 4 - 1) / 2), Math.round(y - 5), color, C.k0); }
  function word(str: string, x: number, y: number, color: string) {
    cx.font = "700 12px LabPixel, sans-serif"; cx.textAlign = "center"; cx.textBaseline = "bottom";
    cx.fillStyle = C.k0; for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1], [0, 2], [1, 2]]) cx.fillText(str, x + dx, y + dy);
    cx.fillStyle = color; cx.fillText(str, x, y);
  }
  function line(x0: number, y0: number, x1: number, y1: number, c: string) {
    const n = Math.max(1, Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0);
    cx.fillStyle = c;
    for (let i = 0; i <= n; i++) cx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
  }

  // ── 그리기 ──
  function drawBug(e: any, glowList: (() => void)[]) {
    const spr = A.bugs[e.grade]; if (!spr) return;
    const boss = e.grade === "blocker";
    const body = boss && e.warn && e.phase === 1 ? A.bugs.blocker.swell : spr;
    const f = e.stun > 0 || reduce ? 0 : animF(body, clock + e.id * 0.13, boss && e.phase === 2 ? 1.3 : 1);
    const sq = squash.find(q => q.id === e.id);
    const fx = P(e.x), fy = P(e.y) + Math.round(spr.body * 0.35);
    const ox = fx - spr.ax, oy = fy - spr.ay;
    cx.save(); cx.translate(fx, fy); A.bugs.shadow(cx, A.bugs.shadowW[e.grade]); cx.restore();
    if (e.traits.includes("fast") && !reduce) { cx.save(); cx.translate(ox, oy); A.traits.fast(cx, spr.w, spr.h, f, { spr, t: clock, dx: e._dx || 0, dy: e._dy || 1 }); cx.restore(); }
    const img = e.flash > 0 && !reduce ? frameCv(body, f, "white") : frameCv(body, f);
    cx.globalAlpha = e.stealth && !e.seen ? A.traits.stealthAlpha : 1;
    if (sq) cx.drawImage(img, ox - 1, oy + Math.round(spr.h * 0.45), spr.w + 2, Math.round(spr.h * 0.55)); // 납작
    else cx.drawImage(img, ox, oy);
    cx.globalAlpha = 1;
    if (e.flash > 0 && reduce) { cx.fillStyle = C.text; cx.fillRect(ox, fy, spr.w, 1); }
    if (boss) {
      const ph = A.bugs.blocker.phase[e.phase], opt = { shield: Math.ceil(e.shield || 0) };
      cx.save(); cx.translate(ox, oy); ph.overlay(cx, f, opt); cx.restore();
      if (!reduce) glowList.push(() => { cx.save(); cx.translate(ox, oy); ph.glow(cx, f, opt); cx.restore(); });
    }
    for (const tr of ["tough", "regen"]) if (e.traits.includes(tr)) { cx.save(); cx.translate(ox, oy); A.traits[tr](cx, spr.w, spr.h, f, { spr, t: clock }); cx.restore(); }
    if (body.glow && !reduce) glowList.push(() => { cx.save(); cx.translate(ox, oy); body.glow[f % body.glow.length](cx); cx.restore(); });
    if (e.hp < e.maxHp && e.grade !== "trivial") { // 체력 막대: Minor 이상, 맞은 뒤에만
      const w = Math.max(8, Math.round(spr.body * 0.8)), x = fx - (w >> 1), y = oy + (spr.top || 0) - 3, k = Math.max(1, Math.round((w * e.hp) / e.maxHp)), ok = e.hp / e.maxHp > 0.35;
      cx.fillStyle = C.k0; cx.fillRect(x - 1, y - 1, w + 2, 4);
      cx.fillStyle = "#322b52"; cx.fillRect(x, y, w, 2);
      cx.fillStyle = ok ? "#36b866" : "#d8324a"; cx.fillRect(x, y, k, 2);
      cx.fillStyle = ok ? "#7ee87e" : "#ff5e5b"; cx.fillRect(x, y, k, 1);
    }
    if (e.stun > 0) { cx.fillStyle = C.coin; for (let i = 0; i < 3; i++) { const a = clock * 6 + i * 2.1; cx.fillRect(Math.round(fx + Math.cos(a) * 5), Math.round(oy + 1 + Math.sin(a) * 1.5), 1, 1); } }
  }
  function drawTower(t: any, glowList: (() => void)[], ghost?: boolean) {
    const L = towerLook(t), fx = t.x * TS + 10, fy = t.y * TS + 18;
    const since = clock - (fired.get(t.id) ?? -9);
    const dur = L.fire ? L.fire.length / L.ffps : 0;
    const useFire = L.fire && since < dur && !reduce;
    const list = useFire ? "fire" : "frames";
    const f = useFire ? Math.min(L.fire.length - 1, Math.floor(since * L.ffps)) : reduce || ghost ? 0 : Math.floor((clock + t.id * 0.37) * L.fps) % L.frames.length;
    let m = cache.get(L.key); if (!m) cache.set(L.key, (m = {}));
    const ck = list + f;
    if (!m[ck]) m[ck] = bake(L.w, L.h, x => (L as any)[list][f](x));
    if (t.disabled > 0) cx.globalAlpha = 0.45;
    cx.drawImage(m[ck], fx - L.ax, fy - L.ay);
    if (!ghost) cx.globalAlpha = 1;
    const gl = useFire ? L.fireGlow : L.glow;
    if (gl && !reduce && !ghost && t.disabled <= 0) glowList.push(() => { cx.save(); cx.translate(fx - L.ax, fy - L.ay); gl[f % gl.length](cx); cx.restore(); });
    if (t.disabled > 0) { cx.fillStyle = C.red2; cx.fillRect(fx - 6, fy - 22, 12, 1); cx.fillRect(fx - 6, fy - 2, 12, 1); }
  }
  function sprAt(spr: any, f: number, x: number, y: number) { cx.drawImage(frameCv(spr, f), Math.round(x - spr.ax), Math.round(y - spr.ay)); }
  function draw() {
    cx.setTransform(1, 0, 0, 1, 0, 0);
    if (shake > 0 && !reduce) cx.setTransform(1, 0, 0, 1, Math.round((Math.random() - 0.5) * 2 * shake), Math.round((Math.random() - 0.5) * 2 * shake));
    cx.drawImage(floor!, 0, 0);
    const selFree = sel && !g.towers.some((o: any) => o.x === sel!.x && o.y === sel!.y);
    A.map.paintDynamic(cx, g.map, undefined, reduce ? 0 : clock, {
      gateFrac: g.gate / 100, towers: g.towers, reduced: reduce,
      highlightSlots: !!(sel && selFree) || !!pick, selected: sel ? [sel.x, sel.y] : null,
    });
    for (const z of g.zones) pxDisc(P(z.x), P(z.y), z.r * TS, z.slow ? C.coin : C.green, 0.18);
    const glowList: (() => void)[] = [];
    // 린터 파동
    for (const t of g.towers) if (t.kind === "lint" && t.disabled <= 0) {
      const r = (E.stats(t).range ?? 0) * TS, br = t.branch ? t.branch.toUpperCase() : "base";
      if (reduce) pxCircle(t.x * TS + 10, t.y * TS + 10, r, "rgba(255,216,107,.35)", true);
      else (A.projectiles.lintWave.draw[br] || A.projectiles.lintWave.draw.base)(cx, t.x * TS + 10, t.y * TS + 10, r, 0.5, (clock * 0.8 + t.id * 0.3) % 1);
    }
    // 검사·버그를 y 순서로(깊이)
    const list = [...g.towers.map((t: any) => ({ y: t.y + 0.9, t })), ...g.enemies.map((e: any) => ({ y: e.y, e }))].sort((a, b) => a.y - b.y);
    for (const it of list) if (it.t) drawTower(it.t, glowList); else drawBug(it.e, glowList);
    // 탄·폭발
    const PJ = A.projectiles;
    for (const f of g.fx) {
      if (f.k === "tracer") { const sp = PJ.bolt; line(P(f.x0), P(f.y0) - 14, P(f.x1), P(f.y1) - 4, "rgba(110,230,255,.55)"); sprAt(sp, 0, P(f.x1), P(f.y1) - 4); }
      else if (f.k === "beam") PJ.beam.draw.base(cx, P(f.x0), P(f.y0) - 12, P(f.x1), P(f.y1) - 4, Math.min(2, Math.floor((1 - f.life / 0.14) * 3)));
      else if (f.k === "shell" && f.live) {
        const k = 1 - f.life / f.max, x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k;
        sprAt(PJ.shellShadow, 0, P(x), P(y));
        sprAt(PJ.shell, 0, P(x), P(y) - 10 - Math.round(Math.sin(k * Math.PI) * 18));
      } else if (f.k === "boom") {
        const k = 1 - f.life / f.max, ex = PJ.explosion;
        if (reduce) pxCircle(P(f.x), P(f.y), f.r * TS, C.pink2);
        else { sprAt(ex, Math.min(ex.frames.length - 1, Math.floor(k * ex.frames.length)), P(f.x), P(f.y)); glowList.push(() => pxDisc(P(f.x), P(f.y), f.r * TS * (0.4 + 0.6 * k), C.pink2, 0.35 * (1 - k))); }
      }
    }
    for (const p of parts) { cx.fillStyle = p.c; cx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
    if (glowList.length) { cx.save(); cx.globalCompositeOperation = "lighter"; for (const fn of glowList) fn(); cx.restore(); }
    // 아이템·전설 동작
    for (const u of uses) {
      const k = 1 - u.life / u.max, hit = u.spr;
      const n = hit.frames.length, f = reduce ? n - 1 : Math.min(n - 1, Math.floor(k * n * 1.4));
      cx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
      sprAt(hit, f, P(u.x), P(u.y) + 6);
      cx.globalAlpha = 1;
      if (k > 0.2 && u.word) word(u.word, P(u.x), P(u.y) - 18, C.coin);
    }
    for (const f of floats) { cx.globalAlpha = Math.min(1, f.life / 0.3); digits(f.t, f.x, f.y, f.c); }
    cx.globalAlpha = 1;
    // 사거리(고른 칸·고른 검사)
    if (sel) {
      const t = g.towers.find((o: any) => o.x === sel!.x && o.y === sel!.y), kind = t ? t.kind : pick;
      if (kind) {
        const r = (t ? E.stats(t) : D.TOWERS[kind].lv[0]).range * TS;
        pxDisc(sel.x * TS + 10, sel.y * TS + 10, r, C.cyan2, 0.12);
        pxCircle(sel.x * TS + 10, sel.y * TS + 10, r, C.cyan);
        if (!t) { cx.globalAlpha = 0.6; drawTower({ id: -1, kind, x: sel.x, y: sel.y, level: 0, branch: null, disabled: 0 }, [], true); cx.globalAlpha = 1; }
      }
    }
    if (itemSel != null && aim) {
      const it = D.ITEMS.kinds[g.items[itemSel]];
      if (it.row) { cx.fillStyle = "rgba(255,216,107,.18)"; cx.fillRect(0, P(aim.y - 0.6), 180, P(1.2)); }
      else { pxDisc(P(aim.x), P(aim.y), it.r * TS, C.coin, 0.15); pxCircle(P(aim.x), P(aim.y), it.r * TS, C.coin, true); }
    }
    A.map.paintVignette(cx, { scanlines: !reduce });
    if (lastLeak > 0) { cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = C.red2; cx.globalAlpha = Math.min(0.8, lastLeak / 0.25); cx.fillRect(0, 0, 180, 2); cx.fillRect(0, 238, 180, 2); cx.fillRect(0, 0, 2, 240); cx.fillRect(178, 0, 2, 240); cx.globalAlpha = 1; }
  }

  // ── 사건 → 그림·소리 ──
  function burst(x: number, y: number, c: string, n: number) { if (reduce) return; for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 12 + Math.random() * 30; parts.push({ x: P(x), y: P(y), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 16, life: 0.35 + Math.random() * 0.2, c, s: Math.random() < 0.3 ? 2 : 1 }); } if (parts.length > 64) parts.splice(0, parts.length - 64); }
  function float(t: string, x: number, y: number, c: string) { floats.push({ t, x: P(x), y: P(y), c, life: 0.8 }); if (floats.length > 12) floats.shift(); }
  const GRADE_C: Record<string, string> = { trivial: "#a3abc4", minor: "#7ee87e", major: "#6ee6ff", critical: "#ff5e5b", blocker: "#c9a4ff" };
  function events() {
    for (const ev of g.events) {
      switch (ev.e) {
        case "shot": fired.set(ev.t.id, clock); sfx.shot(); break;
        case "snipe": fired.set(ev.t.id, clock); sfx.snipe(); break;
        case "boom": sfx.boom(); break;
        case "kill": {
          const big = ev.en.grade === "major" || ev.en.grade === "critical" || ev.en.grade === "blocker";
          sfx.kill(big); burst(ev.en.x, ev.en.y, GRADE_C[ev.en.grade], big ? 14 : 6);
          if (ev.reward) float("+" + ev.reward, ev.en.x, ev.en.y - 0.4, C.coin);
          if (big && !reduce) shake = Math.max(shake, 1);
          break;
        }
        case "leak": {
          const big = ev.loss >= 8;
          sfx.leak(big); lastLeak = big ? 0.5 : 0.25;
          const lane = g.map.lanes[0], [gx, gy] = lane[lane.length - 1];
          float("-" + ev.loss, gx + 0.5, Math.min(gy, 11) - 0.2, C.red);
          if (!reduce) shake = Math.max(shake, big ? 2 : 1);
          break;
        }
        case "drop": sfx.drop(); float("+", ev.x, ev.y - 0.6, C.coin); renderPanel(); break;
        case "dropCoin": sfx.coin(); float("+" + ev.coin, ev.x, ev.y - 0.5, C.coin); break;
        case "cleared": sfx.coin(); toast(`웨이브 ${ev.n} 막음 · 보너스 +${ev.bonus}`); renderPreview(); renderPanel(); break;
        case "wave": sfx.wave(); renderPreview(); break;
        case "early": float("+" + ev.bonus, 4.5, 0.8, C.coin); break;
        case "phase": // 보스 단계 전환: 히트스톱 80 ms + 흔들림 3px + 단계 이름(규격 11절)
          sfx.siren(); toast(`보스: ${ev.name}`);
          if (!reduce) { hitstop = 0.08; shake = Math.max(shake, 3); }
          break;
        case "rollback": toast("롤백! 검사 하나가 잠시 멈췄다"); break;
        case "slipper":
          uses.push({ spr: A.legends.bigslipper.hit, x: ev.x, y: ev.y, life: 1, max: 1, word: "쾅!" });
          if (!reduce) shake = Math.max(shake, 2);
          sfx.hammer();
          break;
        case "bombProc":
          if (!reduce) uses.push({ spr: A.legends.bugbomb.hit, x: ev.x, y: ev.y, life: 0.6, max: 0.6, word: "" });
          break;
        case "legendDrop": sfx.legend(); float("!", ev.x, ev.y - 0.8, C.coin); break;
        case "lost": sfx.lose(); setTimeout(() => showLost(), 700); break;
        case "won": setTimeout(() => onWon(ev.stars), 500); break;
      }
    }
    g.events.length = 0;
  }

  // ── 고정 시간 단계(2× = 한 프레임에 두 단계, 결과가 같다) ──
  let acc = 0, last = 0, menuOpen = false;
  const frames: number[] = [];
  function running() { return !paused && !menuOpen && !overOpen() && g.state !== "won" && g.state !== "lost"; }
  function loop(now: number) {
    const dt = Math.min(0.1, (now - last) / 1000 || 0); last = now;
    if (STRESS && frames.length < 20000) frames.push(dt * 1000);
    if (!paused) clock += dt;
    if (hitstop > 0) hitstop -= dt;
    else if (running()) {
      acc += dt * speed;
      shotBudget = Math.min(10, shotBudget + dt * 10);
      let n = 0;
      for (const e of g.enemies) { e._px = e.x; e._py = e.y; }
      while (acc >= D.DT && n < 8) { E.step(g); acc -= D.DT; n++; events(); }
      for (const e of g.enemies) if (e._px != null && n) { e._dx = e.x - e._px; e._dy = e.y - e._py; }
      if (n === 8) acc = 0;
    }
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; p.life -= dt; }
    for (let i = parts.length; i--; ) if (parts[i].life <= 0) parts.splice(i, 1);
    for (const f of floats) { f.y -= dt * 14; f.life -= dt; }
    for (let i = floats.length; i--; ) if (floats[i].life <= 0) floats.splice(i, 1);
    for (const u of uses) u.life -= dt;
    for (let i = uses.length; i--; ) if (uses[i].life <= 0) uses.splice(i, 1);
    for (const q of squash) q.life -= dt;
    for (let i = squash.length; i--; ) if (squash[i].life <= 0) squash.splice(i, 1);
    shake = Math.max(0, shake - dt * 10); lastLeak = Math.max(0, lastLeak - dt);
    draw();
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
    $("#gateBar i").style.width = `calc(${Math.ceil(g.gate / 10) * 10}% - 4px)`; // 10칸 단위로 끊어 찬다
    $("#gateBar").classList.toggle("low", g.gate <= 30);
    set($("#money"), g.money);
    set($("#waveNo"), `W ${g.wave}/${g.waves.length}`);
    $("#waveNo").style.setProperty("--wp", String(g.wave / g.waves.length));
    const call = $<HTMLButtonElement>("#call"), canCall = g.state === "prep" && g.wave < g.waves.length;
    call.disabled = !canCall;
    set(call, !canCall ? "진행 중" : g.prepLeft != null ? `▶ 지금 +${Math.floor(g.prepLeft)}` : "▶ 부르기");
    refreshAfford();
  }
  function iconOf(spr: any, px: number, frame = 0) {
    const c = document.createElement("canvas"); c.width = spr.w; c.height = spr.h;
    c.getContext("2d")!.drawImage(frameCv(spr, frame), 0, 0);
    c.style.width = spr.w * px + "px"; c.style.height = spr.h * px + "px"; c.style.imageRendering = "pixelated";
    return c;
  }
  function towerIcon(kind: string, t?: any) {
    const L = towerLook(t || { kind, level: 0, branch: null });
    return iconOf({ w: L.w, h: L.h, frames: L.frames }, 2);
  }
  function renderPreview() {
    const box = $("#preview"); box.textContent = "";
    const w = g.waves[g.wave];
    if (!w) { box.append("마지막 웨이브"); return; }
    const count: Record<string, number> = {}; for (const [gr, n] of w) count[gr] = (count[gr] ?? 0) + n;
    for (const gr of ["blocker", "critical", "major", "minor", "trivial"]) if (count[gr]) {
      const sp = document.createElement("span"); sp.className = "num";
      const ic = iconOf(A.bugs[gr], gr === "trivial" ? 2 : 1); ic.style.verticalAlign = "middle";
      sp.append(ic, "×" + count[gr]); box.append(sp);
    }
  }
  // 전설(패시브): 웨이브 줄 왼쪽 금테 2칸에 아이콘 + 단계 점. 빈 칸은 흐린 꺾쇠
  function renderLegends() {
    const box = $("#legs"); box.textContent = "";
    for (let i = 0; i < D.LEGENDS.cap; i++) {
      const l = g.legends[i], sp = document.createElement("span");
      if (!l) { sp.className = "leg empty"; sp.title = "빈 전설 칸(보스를 잡으면 생긴다)"; box.append(sp); continue; }
      sp.className = "leg"; sp.title = `${D.LEGENDS.kinds[l.kind].name} ${l.lv}단계`;
      const dots = document.createElement("i"); dots.className = "lvd"; dots.dataset.lv = String(l.lv);
      sp.append(iconOf(A.legends[l.kind].icon, 1.5), dots); box.append(sp);
    }
  }
  const TIER_LABEL: Record<string, string> = { low: "하", mid: "중", high: "상", top: "최" };
  function itemsRow() {
    const row = document.createElement("div"); row.className = "items";
    for (let i = 0; i < D.ITEMS.slots; i++) {
      const b = document.createElement("button"); b.className = "slot";
      const kind = g.items[i];
      if (kind) {
        const def = D.ITEMS.kinds[kind];
        b.append(iconOf(A.items[kind].icon, 2));
        const lv = document.createElement("span"); lv.className = "lv"; lv.textContent = TIER_LABEL[def.tier]; b.append(lv);
        b.setAttribute("aria-label", def.name); b.title = def.name;
        b.setAttribute("aria-pressed", itemSel === i ? "true" : "false");
        b.onclick = () => { unlock(); itemSel = itemSel === i ? null : i; sel = pick = null; renderPanel(); };
      } else { b.disabled = true; b.setAttribute("aria-label", "빈 아이템 칸"); }
      row.append(b);
    }
    const hint = document.createElement("span"); hint.className = "hint";
    hint.textContent = itemSel != null ? `${D.ITEMS.kinds[g.items[itemSel]].name}: 맵을 눌러 쓴다` : "버그를 잡으면 가끔 아이템이 떨어진다";
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
    for (const k of Object.keys(D.TOWERS)) { // 6장 다 보인다. 첫 바퀴에서 안 열린 것은 자물쇠 자리
      const def = D.TOWERS[k], b = document.createElement("button");
      b.className = "card"; b.dataset.kind = k;
      if (!open.includes(k)) {
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
    sfx.build(); burst(sel.x + 0.5, sel.y + 0.7, C.cyan, 10);
    pick = null; renderPanel();
  }
  function towerDesc(t: any) {
    const st: any = E.stats(t), pct = (v: number) => Math.round(v * 100) + "%";
    if (t.kind === "lint") return `감속 ${pct(st.slow)} · 사거리 ${st.range}` + (st.vuln ? ` · 받는 피해 +${pct(st.vuln)}` : "");
    if (t.kind === "monitor") return `은신 드러냄 · 받는 피해 +${pct(st.mark)} · 사거리 ${st.range}` + (st.steady ? " · 플래키 못 피함" : "");
    if (t.kind === "ci") return `주변 검사 공격 속도 +${pct(st.haste)} · 사거리 ${st.range}` + (st.rangeAdd ? ` · 주변 사거리 +${st.rangeAdd}` : "");
    return `피해 ${st.dmg}${st.multi ? "×" + st.multi : ""} · ${(1 / st.period).toFixed(1)}발/초 · 사거리 ${st.range}` + (st.splash ? ` · 폭발 ${st.splash}` : "") + (st.ramp ? " · 같은 버그면 빨라짐" : "") + (t.kind === "review" ? " · 방어 무시" : "") + (st.bigMul ? ` · Major 이상 ×${st.bigMul}` : "") + (st.line ? ` · 뒤 ${st.line - 1}마리 꿰뚫음` : "");
  }
  function towerPanel(t: any) {
    const def = D.TOWERS[t.kind], box = document.createElement("div");
    const head = document.createElement("div"); head.className = "sel";
    const ic = document.createElement("div"); ic.className = "slot"; ic.append(towerIcon(t.kind, t));
    const info = document.createElement("div");
    const lvTxt = t.branch ? `★ ${def.br[t.branch].name}` : "●".repeat(t.level + 1) + "○".repeat(2 - t.level);
    const b = document.createElement("b"); b.textContent = def.name;
    const pips = document.createElement("span"); pips.className = "pips"; pips.textContent = lvTxt;
    const stats = document.createElement("span"); stats.className = "stats"; stats.textContent = towerDesc(t);
    info.append(b, " ", pips, document.createElement("br"), stats);
    head.append(ic, info); box.append(head);
    const acts = document.createElement("div"); acts.className = "acts";
    if (!t.branch && t.level < 2) {
      const c = def.lv[t.level + 1].cost, b = document.createElement("button");
      b.className = "btn"; b.dataset.cost = c; b.textContent = `올리기 ${c}`;
      b.onclick = () => { if (E.upgrade(g, t)) { sfx.build(); burst(t.x + 0.5, t.y + 0.4, C.coin, 12); renderPanel(); } };
      acts.append(b);
    } else if (!t.branch) {
      for (const br of ["a", "b"]) {
        const c = def.br[br].cost, b = document.createElement("button");
        b.className = "btn branch"; b.dataset.cost = c; b.textContent = `${def.br[br].name} ${c}`;
        b.onclick = () => { if (E.upgrade(g, t, br as E.Branch)) { sfx.build(); burst(t.x + 0.5, t.y + 0.4, C.cyan, 16); renderPanel(); } };
        acts.append(b);
      }
    }
    if (t.kind === "unit" || t.kind === "integ" || t.kind === "review") { // 조준이 있는 검사만(린터·모니터링·CI 는 범위 전체)
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

  // ── 누르기 ──
  let aim: { x: number; y: number } | null = null;
  function tile(ev: PointerEvent) { const r = cv.getBoundingClientRect(); return { x: ((ev.clientX - r.left) / r.width) * 9, y: ((ev.clientY - r.top) / r.height) * 12 }; }
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
  const WORD: Record<string, string> = { palm: "찰싹!", slipper: "딱!", swatter: "철썩!", paper: "퍽!", hammer: "뿅!", spray: "치익~", trap: "찍!", flamer: "화르륵!", vacuum: "슈우욱!" };
  cv.addEventListener("pointerup", ev => {
    if (itemSel == null || !aim) return;
    const p = tile(ev), kind = g.items[itemSel], it = D.ITEMS.kinds[kind];
    const hitIds = g.enemies.filter((e: any) => (it.row ? Math.abs(e.y - p.y) <= 0.6 : Math.hypot(e.x - p.x, e.y - p.y) <= it.r)).map((e: any) => e.id);
    E.useItem(g, itemSel, p.x, p.y);
    events();
    uses.push({ spr: A.items[kind].hit, x: it.row ? 0.3 : p.x, y: p.y, life: 0.75, max: 0.75, word: WORD[kind] ?? "퍽!" });
    for (const id of hitIds) squash.push({ id, life: 0.4 });
    if (kind === "hammer" || kind === "swatter") sfx.hammer(); else sfx.palm();
    if (!reduce) shake = Math.max(shake, it.tier === "low" ? 1 : 2);
    burst(p.x, p.y, C.coin, 18);
    itemSel = null; aim = null; renderPanel();
  });

  $("#call").onclick = () => { unlock(); E.startWave(g); events(); };
  $("#speed").onclick = () => { speed = speed === 1 ? 2 : 1; $("#speed").textContent = speed + "×"; $("#speed").setAttribute("aria-pressed", speed === 2 ? "true" : "false"); };
  document.addEventListener("visibilitychange", () => { paused = document.hidden; });

  // ── 큰 상자들(시작·결과·전설 고르기·랭크). 겉모양은 디자인 세션 3판 덧붙임(ui.css) ──
  const resultEl = $("#result"), resultBox = $("#resultBox");
  const overOpen = () => resultEl.classList.contains("on") || $("#start").classList.contains("on");
  const lapLabel = (n: number) => "v" + n + ".0";
  const esc = (v: string) => v.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  function openBox(html: string) { resultBox.innerHTML = html; resultEl.classList.add("on"); }
  function closeBox() { resultEl.classList.remove("on"); }
  const mapName = (i: number) => D.MAPS[i].name;
  const starsHtml = (n: number) => `<span class="stars" aria-label="별 ${n}개">${[0, 1, 2].map(i => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</span>`;
  const LEG_EFF: Record<string, (lv: number) => string> = {
    exterminator: lv => `모든 검사 피해 +${[6, 9, 12][lv - 1]} %`,
    bugbomb: lv => `단위·통합 테스트 ${[10, 8, 6][lv - 1]}발째마다 살충 구름`,
    bigslipper: lv => `${[20, 16, 12][lv - 1]}초마다 맨 앞 버그에 거대 슬리퍼`,
  };
  function legendCard(kind: string, lv: number, tag = "button") {
    const el = document.createElement(tag); el.className = "lcard";
    const name = document.createElement("b"); name.textContent = D.LEGENDS.kinds[kind].name;
    const dots = document.createElement("i"); dots.className = "lvd"; dots.dataset.lv = String(lv); dots.setAttribute("aria-label", lv + "단계");
    const eff = document.createElement("span"); eff.className = "eff"; eff.textContent = LEG_EFF[kind](lv);
    el.append(iconOf(A.legends[kind].icon, 3), name, dots, eff);
    return el;
  }

  // ① 맵 깸 → 저장하고 다음 맵 / ② 보스 처치 → 전설 + 바퀴 올림
  function onWon(stars: number) {
    const simSec = g.time, gate = g.gate, done = run.map, lap = run.lap;
    if (run.map < D.MAPS.length - 1) {
      run = afterMapWon(run, simSec); store.save(run);
      openBox(`<p class="sub">${lapLabel(lap)} · 맵 ${done + 1} ${esc(mapName(done))}</p><h2 class="title">배포 성공</h2>
        <p class="hi">게이트 ${gate} ${starsHtml(stars)}</p>
        <p class="sub">저장했다. 다음에 열면 맵 ${run.map + 1} 부터 잇는다.</p>
        <div class="rbtns"><button class="btn" id="again">다음 맵: ${esc(mapName(run.map))} ▶</button></div>`);
      $("#again").onclick = () => { closeBox(); startMap(); };
      return;
    }
    const kind = g.legendDrop as E.LegendKind;
    const finish = (legends: Run["legends"], gained: { kind: string; lv: number } | null) => {
      run = afterMapWon({ ...run, legends }, simSec); store.save(run);
      sfx.legend();
      openBox(`<p class="sub">맵 5 ${esc(mapName(4))} · 보스 Blocker 처치</p><h2 class="title">${lapLabel(lap)} 출시!</h2>
        <p class="hi">${!gained ? "새 전설은 버렸다" : gained.lv > 1 ? "전설 강화" : "전설 획득"}</p><div id="gainCard"></div>
        <p class="sub">다음 바퀴: 버그 체력 ×${(D.LAPS.hp ** lap).toFixed(2)} · 버그가 더 세진다</p>
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
  // ③ 진 맵(D1): 이 맵 다시(주) · 그만두기 → 랭크 등록(부)
  function showLost() {
    run.simSec += g.time; store.save(run);
    openBox(`<p class="sub">${lapLabel(g.lap)} · 맵 ${g.mapIndex + 1} ${esc(g.map.name)} · W ${g.wave}/${g.waves.length}</p><h2 class="title bad">장애 발생</h2>
      <p class="hi">운영 게이트 0</p>
      <p class="sub">이 맵을 처음부터 다시 한다.<br>바퀴와 전설은 그대로 남는다.</p>
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

  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  function showRankEntry() {
    const laps = clearedLaps(run), ini = ["A", "A", "A"]; let at = 0;
    openBox(`<h2 class="title bad">GAME OVER</h2>
      <p class="hi">최종 클리어 ${lapLabel(laps)}</p>
      <p class="sub">랭크에 이름을 남긴다</p>
      <div class="initials" id="ini"></div>
      <label class="field">한마디(20자)<input id="say" maxlength="20" autocomplete="off" placeholder="예: Trivial 은 보내 줘"></label>
      <input id="kbd" class="sr" maxlength="3" autocapitalize="characters" autocomplete="off" aria-label="이니셜 3글자 키보드로 넣기">
      <div class="acts"><button class="btn ghost" id="typeBtn">⌨ 키보드</button><button class="btn" id="enter">등록</button></div>`);
    const wrap = $("#ini");
    function paint() {
      wrap.textContent = "";
      ini.forEach((ch, i) => {
        const col = document.createElement("div"); col.className = "ini" + (i === at ? " on" : "");
        const up = document.createElement("button"); up.textContent = "▲"; up.setAttribute("aria-label", `${i + 1}번째 글자 앞으로`);
        const out = document.createElement("output"); out.textContent = ch; out.tabIndex = 0; out.setAttribute("aria-label", `${i + 1}번째 글자 ${ch}`);
        const dn = document.createElement("button"); dn.textContent = "▼"; dn.setAttribute("aria-label", `${i + 1}번째 글자 뒤로`);
        const turn = (d: number) => { at = i; ini[i] = CHARS[(CHARS.indexOf(ini[i]) + d + CHARS.length) % CHARS.length]; tone(660 + CHARS.indexOf(ini[i]) * 12, 30, { gain: 0.05 }); paint(); };
        up.onclick = () => turn(-1); dn.onclick = () => turn(1);
        out.onclick = () => { at = i; paint(); };
        out.onkeydown = e => {
          if (e.key === "ArrowUp") turn(-1);
          else if (e.key === "ArrowDown") turn(1);
          else if (e.key === "ArrowRight") { at = Math.min(2, at + 1); paint(); wrap.querySelectorAll("output")[at].focus(); }
          else if (e.key === "ArrowLeft") { at = Math.max(0, at - 1); paint(); wrap.querySelectorAll("output")[at].focus(); }
        };
        let sy: number | null = null;
        out.onpointerdown = e => { sy = e.clientY; out.setPointerCapture(e.pointerId); };
        out.onpointermove = e => { if (sy == null) return; const d = e.clientY - sy; if (Math.abs(d) > 18) { turn(d > 0 ? 1 : -1); sy = e.clientY; } };
        out.onpointerup = () => { sy = null; };
        col.append(up, out, dn); wrap.append(col);
      });
    }
    paint();
    const kbd = $<HTMLInputElement>("#kbd");
    $("#typeBtn").onclick = () => { kbd.value = ""; kbd.classList.remove("sr"); kbd.classList.add("kbd-on"); kbd.focus(); };
    kbd.oninput = () => { const v = kbd.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3); kbd.value = v; for (let i = 0; i < 3; i++) ini[i] = v[i] ?? "A"; at = Math.min(2, v.length); paint(); };
    const enter = $<HTMLButtonElement>("#enter");
    enter.onclick = async () => {
      enter.disabled = true;
      const { name, say } = cleanEntry(ini.join(""), $<HTMLInputElement>("#say").value);
      const simSec = Math.round(run.simSec);
      const rows = await submit({ name, lap: laps, say, simSec });
      // 판은 여기서 끝난다 — 저장을 지우고 최고 기록만 남긴다
      run = freshRun(run.best); store.save(run); renderLegends();
      const d = new Date(), date = String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      showBoard(rows ?? (await fetchTop()) ?? [], rows ? { name, lap: laps, say, date } : null, !rows);
    };
  }
  function showBoard(rows: RankRow[], me: RankRow | null, failed: boolean) {
    let meAt = -1;
    if (me) meAt = rows.findIndex(r => r.name === me.name && r.lap === me.lap && r.say === me.say);
    const table = rows.length
      ? `<table class="rank"><colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5"></colgroup>
      <thead><tr><th>순위</th><th>이름</th><th>바퀴</th><th>한마디</th><th>날짜</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr class="${i === meAt ? "me" : ""}"><td class="n">${i + 1}</td><td class="n">${esc(r.name)}</td><td class="n">${lapLabel(r.lap)}</td><td class="say">${esc(r.say || "—")}</td><td class="n">${esc(r.date)}</td></tr>`).join("")}
      </tbody></table>`
      : `<p class="sub">아직 기록이 없다</p>`; // 빈 줄을 표에 넣으면 1위 칸 색이 칠해진다
    openBox(`<h2 class="title">RANKING</h2>${failed ? `<p class="sub">지금은 등록이 안 된다</p>` : ""}
      ${table}<div class="acts"><button class="btn" id="again">INSERT COIN ▶ 다시</button></div>`);
    $("#again").onclick = () => { closeBox(); showStart(); };
    paintHi(rows[0]);
  }

  // ── 시작 화면: 이어하기 / 새로 시작 ──
  function paintHi(top?: RankRow) {
    const hi = $("#hi");
    if (!top) { hi.hidden = true; return; }
    hi.hidden = false; $("#hiName").textContent = top.name; $("#hiLap").textContent = lapLabel(top.lap);
  }
  // 저장(lab.defense)이 있으면 「이어하기」 + 「새로 시작」(지우기 전에 한 번 묻는다)
  function showStart() {
    const box = $("#startActs");
    $("#startSub").textContent = `${lapLabel(run.lap)} · ${mapName(run.map)}`;
    const go = () => { unlock(); $("#start").classList.remove("on"); startMap(); sfx.wave(); };
    if (!hasProgress(run)) {
      box.innerHTML = `<button class="btn" id="go" style="width:100%"><span class="blink">INSERT COIN</span> ▶ 시작</button>`;
      $("#go").onclick = go;
    } else {
      box.innerHTML = `<button class="btn" id="cont">이어하기 <span class="num">${lapLabel(run.lap)}</span> · 맵 ${run.map + 1}</button>
        <div class="acts"><button class="btn ghost" id="newRun">새로 시작</button></div>`;
      $("#cont").onclick = go;
      $("#newRun").onclick = () => {
        $("#newRun").parentElement!.outerHTML = `<div class="confirm"><p>저장을 지운다. ${lapLabel(run.lap)} · 맵 ${run.map + 1} 기록과 전설이 사라진다.</p>
          <div class="acts"><button class="btn ghost" id="wipeNo">취소</button><button class="btn danger" id="wipe">지우고 새로 시작</button></div></div>`;
        $("#wipeNo").onclick = () => showStart();
        $("#wipe").onclick = () => { run = freshRun(run.best); store.save(run); showStart(); };
      };
    }
    $("#start").classList.add("on");
  }

  // ── 시작 화면 도감(실제 크기 ×2, 걷는 동작)·게이트 아이콘 ──
  (function dex() {
    const box = $("#dex");
    for (const [gr, label] of [["trivial", "Trivial"], ["minor", "Minor"], ["major", "Major"], ["critical", "Critical"], ["blocker", "Blocker"]]) {
      const f = document.createElement("figure"), spr = A.bugs[gr], c = iconOf(spr, 2, 0);
      const cap = document.createElement("figcaption"); cap.textContent = label; f.append(c, cap); box.append(f);
      let i = 0;
      setInterval(() => { if (reduce || !$("#start").classList.contains("on")) return; i = (i + 1) % spr.frames.length; const x = c.getContext("2d")!; x.clearRect(0, 0, spr.w, spr.h); x.drawImage(frameCv(spr, i), 0, 0); }, 1000 / (spr.fps || 6));
    }
    const gi = $<HTMLCanvasElement>("#gateIco").getContext("2d")!;
    gi.fillStyle = "#0b1d3a"; gi.fillRect(1, 0, 10, 12); gi.fillStyle = "#123a66"; gi.fillRect(2, 1, 8, 10);
    for (let y = 2; y < 10; y += 3) { gi.fillStyle = "#2aa6d6"; gi.fillRect(3, y, 6, 2); gi.fillStyle = "#7ee87e"; gi.fillRect(8, y, 1, 1); }
  })();

  // ── 실측: #stress 면 검사 12개(3단계) + 버그 80마리(시안과 같은 판) ──
  function spawnAt(gr: string, dist: number) { g.spawnQ.unshift({ at: g.time, grade: gr, traits: [], lane: 0 }); E.step(g, 0); const en = g.enemies[g.enemies.length - 1]; en.dist = dist; return en; }
  (window as any).__stress = (n = 80) => {
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
  (window as any).__frames = () => frames.splice(0);
  (window as any).__game = () => ({ g, run });

  addEventListener("resize", layout);
  layout(); startMap(); showStart();
  fetchTop().then(rows => paintHi(rows?.[0]));
  requestAnimationFrame(t => { last = t; loop(t); });
  if (STRESS) (window as any).__stress();
}
