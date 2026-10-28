// 코코의 하루 3D — 게임마다 다른 화면 몫(장면·그리기·카드 문구·사건 연출·HUD·결과·옷). 무대·입력·멈춤·랭킹 등 공통은 shell3d.ts.
// 규칙은 core.ts + coco.ts. 모델은 coco3d-models.js(디자인 세션 정본 사본), 카드 아이콘은 coco-icons.js.
// 그리기는 디자인 세션 시안 docs/lab-surv-coco-3d-mock.html 의 GAME.draw 를 그대로 옮겼다.
// 🔴 코코는 Dean 집 강아지다. 모델은 참고 사진의 생김새만 따랐고, 사진·사람·집 안은 어디에도 없다.
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as C from "./core.ts";
import { THEME } from "./coco.ts";
import "./coco-icons.js";
import { runSurvivor3D, type Stage } from "./shell3d.ts";

const TEE_KEY = "lab.coco.tee"; // 흰 티는 저녁밥까지 버틴(이긴) 판이 한 번 있으면 열린다(B5)

export function initCoco3d() {
  const Cx: any = C, T: any = THEME, D = T.DATA;
  const W: any = window;
  const teeStore = {
    get: () => { try { return localStorage.getItem(TEE_KEY) === "1"; } catch { return false; } },
    set: () => { try { localStorage.setItem(TEE_KEY, "1"); } catch { /* 저장이 막혀도 게임은 돈다 */ } },
  };
  let OUTFIT: "harness" | "tee" = /tee/.test(location.hash) ? "tee" : "harness";
  let setOutfit: (o: "harness" | "tee") => void = () => {};
  const SPLASH_LIFE = 0.3;
  const splashes: { x: number; y: number; r: number; t0: number }[] = []; // 침 묻은 공 튀김(그리기 몫 — 규칙은 g.events 의 splash)

  function build(st: Stage) {
    const { M, scene, pool, put, blob, RP, juice: JUICE } = st;
    const ground = M.makeGround(0);
    let coco = M.makeCoco(OUTFIT);
    scene.add(coco.root);
    setOutfit = o => { if (o === OUTFIT) return; OUTFIT = o; scene.remove(coco.root); coco = M.makeCoco(OUTFIT); scene.add(coco.root); };
    const EN: Record<string, any> = {}, PK: Record<string, any> = {}, PJ: Record<string, any> = {};
    for (const k of ["brush", "suds", "suds_s", "bell", "vacuum", "dog", "boss_vacuum", "boss_bath"]) EN[k] = pool(M.enemyGeometry(k).geometry, k.startsWith("boss") ? 2 : 160);
    for (const k of ["kibble", "treat", "chew", "fruit"]) PK[k] = pool(M.pickupGeometry(k).geometry, k === "kibble" ? 260 : 60);
    for (const k of ["ball", "toy", "chew"]) PJ[k] = pool(M.projGeometry(k).geometry, 60);
    let poseNow = "sit", poseAt = 0, cocoFace = Math.PI / 2;
    splashes.length = 0;
    return {
      ground,
      meshes: () => [...Object.values(EN), ...Object.values(PK), ...Object.values(PJ)],
      // 규칙 상태 → 인스턴스 행렬·코코 자세
      draw(g: any, t: number) {
        const p = g.p, REDUCE = st.reduce();
        for (const k in EN) EN[k].count = 0;
        for (const k in PK) PK[k].count = 0;
        for (const k in PJ) PJ[k].count = 0;
        const near2 = 170 * 170, close = (x: number, y: number) => (x - p.x) ** 2 + (y - p.y) ** 2 < near2;
        for (const e of g.enemies) {
          if (!close(e.x, e.y)) continue;
          const E = EN[e.kind]; if (!E) continue;
          const hit = REDUCE ? 0 : (JUICE.hitT.get(e.id) || 0) / 0.12;
          const bob = REDUCE ? 1 : 1 + Math.sin(t * 9 + e.id) * 0.05;
          const ry = Math.atan2(p.x - e.x, p.y - e.y) + (e.ringing && !REDUCE ? Math.sin(t * 40) * 0.25 : 0);
          put(E, e.x, 0, e.y, ry, 1 + hit * 0.1, bob * (1 - hit * 0.15), 1 + hit * 0.1, e.flash > 0 ? 1.9 : 1); // 모델이 종류별 실제 크기 — 다시 키우면 보스가 4배 넘게 커진다
          put(blob, e.x, 0.05, e.y, 0, e.r * 2.4, 1, e.r * 1.6);
        }
        for (const s of g.dust) if (close(s.x, s.y)) put(PK[s.v >= 3 ? "treat" : "kibble"], s.x, 1.5 + Math.sin(t * 4 + s.x) * 0.6, s.y, t * 2, 1, 1, 1);
        for (const k of g.pickups) if (close(k.x, k.y)) put(PK[k.kind === "heal" ? "chew" : "fruit"], k.x, 2 + Math.sin(t * 3) * 0.8, k.y, t, 1, 1, 1);
        for (const b of g.shots) put(PJ[b.w === "ball" ? "ball" : "chew"], b.x, 5, b.y, t * 8, 1, 1, 1);
        for (const w of g.weapons) {
          const kind = D.WEAPONS[w.key].kind, s = Cx.wstat(g, w);
          if (kind === "orbit") for (let i = 0; i < s.n; i++) { const a = (w.ang || 0) + (i / s.n) * Math.PI * 2; put(PJ.toy, p.x + Math.cos(a) * s.R, 6, p.y + Math.sin(a) * s.R, -a, 1, 1, 1); }
          if (kind === "aura") put(RP.aura, p.x, 0.3, p.y, t, s.R, 1, s.R);
        }
        for (const f of g.fx) if (f.k === "drop") { const k = f.live ? 1 - f.life / f.max : 1; put(RP.bark, f.x, 0.4, f.y, 0, f.r * (0.4 + k * 0.6), 1, f.r * (0.4 + k * 0.6)); }
        // 침 묻은 공 튀김 고리 0.3초(시안 docs/lab-surv-coco-3d-mock.html). 시안은 화면 시간으로 줄지만 여기선 draw 가 받는 규칙 시간으로 — 멈춤·카드 고르는 동안엔 고리도 선다
        for (let i = splashes.length - 1; i >= 0; i--) if (!(t >= splashes[i].t0 && t < splashes[i].t0 + SPLASH_LIFE)) splashes.splice(i, 1);
        const wave0 = RP.wave.count;
        for (const q of splashes) { const k = (t - q.t0) / SPLASH_LIFE, r = q.r * (0.35 + 0.65 * k); put(RP.wave, q.x, 0.45, q.y, 0, r, 1, r); }
        W.__surv.inst = { splash: RP.wave.count - wave0 }; // 리그: 그려진 튀김 고리 수
        for (const w of g.coco.waves) { const r = w.R * (1 - (w.life / 0.4) * 0.6); put(RP.wave, w.x, 0.5, w.y, 0, r, 1, r); }
        for (const z of g.zones) put(z.warn > 0 ? RP.warn : RP.zone, z.x, 0.2, z.y, 0, z.r, 1, z.r);
        const trails = g.coco.dash ? [...g.trails, { pts: g.coco.dash.pts }] : g.trails;
        for (const tr of trails) for (let i = 0; i < tr.pts.length; i += 3) put(RP.trail, tr.pts[i][0], 0.15, tr.pts[i][1], 0, 3.2, 1, 3.2);
        // 코코: 진행 방향을 보고(마지막으로 움직인 쪽), 자세는 모델이 정한다
        const pose = T.pose(g);
        if (pose !== poseNow) { poseNow = pose; poseAt = t; }
        const vx = g.coco.dash ? g.coco.dash.vx : p.vx, vy = g.coco.dash ? g.coco.dash.vy : p.vy;
        if (Math.hypot(vx, vy) > 1) cocoFace = Math.atan2(vx, vy);
        coco.root.position.set(p.x, 0, p.y);
        coco.root.rotation.y = cocoFace; // pose 보다 먼저(머리 돌리기가 이 값을 읽는다)
        coco.pose(t, pose, t - poseAt, { speed: Math.hypot(p.vx, p.vy) / p.speed, hurt: p.iframe > 0.55 && !g.coco.dash, reduce: REDUCE });
        put(blob, p.x, 0.05, p.y, 0, g.coco.dash ? 12 : 16, 1, g.coco.dash ? 8 : 11);
      },
      // 머리 위 기운 칸 셋
      overlay(octx: CanvasRenderingContext2D, g: any, toScreen: (x: number, h: number, y: number) => [number, number, boolean], u: number) {
        if (!(g.coco.gauge > 0) || g.coco.dash) return;
        const [hx, hy] = toScreen(g.p.x, 30, g.p.y), gv = g.coco.gauge / 100;
        for (let i = 0; i < 3; i++) { octx.fillStyle = gv >= (i + 1) / 3 - 0.001 ? (gv >= 1 ? "#ffd36b" : "#f6e3c4") : "rgba(58,34,40,.35)"; octx.beginPath(); octx.roundRect(hx + (i - 1.5) * 11 * u + u, hy - 3 * u, 9 * u, 6 * u, 3 * u); octx.fill(); }
      },
    };
  }

  runSurvivor3D({
    game: "coco", // 랭킹은 도트판과 같은 판(규칙이 같다)
    theme: T,
    icons: () => W.SurvArt && W.SurvArt.cocoHD,
    sky: [[0, 0xbfe6ff, 0xfff4e3, 1.6], [0.5, 0x9fd8ff, 0xfffbf4, 1.7], [0.75, 0xff8fa3, 0xffb38a, 1.3], [1, 0x2a2858, 0x8b5cd6, 0.75]], // 아침 → 한낮 → 노을 → 저녁
    outerColor: 0x2f7d4a,
    todOf: g => T.tod(g),
    build,
    cardText(c, D) {
      const Wp = D.WEAPONS, P = D.PASSIVES, TC = D.THEME_CARDS;
      if (c.type === "evo") { const w = Wp[c.key]; return { ico: "evo", name: w.evo.name, lv: "진화", desc: `${w.name} 최고 단계 + ${P[w.evo.with]} → 더 센 꼴로`, cls: "evo" }; }
      if (c.type === "weapon") { const w = Wp[c.key]; const tip = ({ ball: "가장 가까운 것에 삑삑이 공", wag: "둘레를 꼬리 바람으로 · 앉으면 두 배", bark: "화면 안 싫은 것 머리 위로 멍!", toy: "인형을 물고 휘둘러요", chew: "걷는 쪽으로 개껌을 굴려요" } as Record<string, string>)[c.key]; return { ico: c.key, name: w.name, lv: c.lv === 1 ? "NEW" : `LV ${c.lv}`, desc: tip + (w.evo ? ` · 진화 짝: ${P[w.evo.with]}` : "") }; }
      if (c.type === "passive") { const tip = ({ dmg: "모든 피해 +10 %", cd: "다시 쓰기까지 −8 %", area: "범위 +12 %", move: "걸음 +8 %", hp: "최대 체력 +20", magnet: "간식 끌어오기 +30 %" } as Record<string, string>)[c.key]; return { ico: c.key, name: P[c.key], lv: c.lv === 1 ? "NEW" : `LV ${c.lv}`, desc: tip }; }
      if (c.type === "theme") { const t = TC[c.key]; const tip = ({ sit: "기운이 30 % 더 빨리 차요", scoot: "똥꼬 스키 거리 +20 % · 피해 +25 %", spin: "뱅글뱅글 바람이 더 크고 세요", calm: "앉아 있는 동안 체력이 차요", sneak: c.lv === 1 ? "스키로 지나간 길의 간식을 먹어요" : "스키 중에 잡으면 체력 +1", more: "삑삑이 공을 한 번에 하나 더 던져요", splash: "공에 맞아 쓰러지면 둘레에 침이 튀어요" } as Record<string, string>)[c.key]; return { ico: c.key, name: t.name, lv: `${c.lv}/${t.max}`, desc: tip, tag: "습관", cls: "habit" }; }
      return { ico: "heal", name: "개껌 하나", lv: "", desc: "체력 30 회복" };
    },
    onEvent(ev, g, fx) {
      const p = g.p, J = fx.juice;
      if (ev.e === "hurt") J.burst("fur", p.x, p.y - 8, 4, 30, 2.4, 0.5);
      else if (ev.e === "splash") { splashes.push({ x: ev.x, y: ev.y, r: ev.r, t0: g.time }); J.burst("bubble", ev.x, ev.y - 3, 6, 40, 2.2, 0.4); } // 침 묻은 공: 튀김 고리 + 방울
      else if (ev.e === "scoot") { J.burst("dust", p.x, p.y, 8, 40, 3, 0.45); if (ev.gauge >= 100) J.freeze(0.05); fx.sfx.hit(); }
      else if (ev.e === "spin") { J.kick(2.4); J.burst("fur", p.x, p.y - 6, 10, 60, 2.6, 0.6); J.burst("sparkle", p.x, p.y - 8, 8, 50, 2.4, 0.5); fx.sfx.gold(); }
      else if (ev.e === "bellbark") { fx.say("딩동! 멍멍멍!"); fx.sfx.miss(); }
      else if (ev.e === "otherdog") fx.say("다른 강아지가 와요");
      else if (ev.e === "dinner") fx.say("저녁밥이다! 고기!");
      else if (ev.e === "kill" && ev.en.kind === "suds") J.burst("bubble", ev.en.x, ev.en.y - 4, 4, 26, 2.4, 0.5);
    },
    hud(g, $) { const r = $("gaugeRing"); r.style.setProperty("--g", String(Math.floor(g.coco.gauge))); r.classList.toggle("full", g.coco.gauge >= 100); },
    end(g) {
      const won = g.state === "won", m = Math.floor(g.time / 60), s = Math.floor(g.time % 60);
      let unlocked = false;
      if (won && !teeStore.get()) { teeStore.set(); unlocked = true; paintOutfit(); }
      return {
        title: won ? "저녁밥 시간" : g.quit ? "오늘은 여기까지" : "지쳐서 낮잠",
        sub: won ? `오늘도 좋은 하루였어요. 고기 냠냠.${unlocked ? " (흰 티가 생겼어요!)" : ""}` : `${m}분 ${s}초 놀았어요. 한숨 자고 다시 놀아요.`,
        rows: [["놀았던 시간", `${m}:${String(s).padStart(2, "0")}`], ["물리친 것", g.kills], ["똥꼬 스키", g.coco.scoots], ["기운 가득 스키", g.coco.bigScoots]],
      };
    },
    stress(g) {
      while (g.enemies.length < Cx.CORE.ENEMY_CAP) { const [x, y] = Cx.ringPoint(g, -40 - g.r() * 60); const e = Cx.spawnAt(g, ["brush", "suds", "bell", "dog"][(g.r() * 4) | 0], x, y); e.hp = e.maxHp = 1e9; }
      g.weapons = [{ key: "ball", lv: 5, cd: 0, t: 0 }, { key: "toy", lv: 5, cd: 0, t: 0 }, { key: "wag", lv: 5, cd: 0, t: 0 }, { key: "bark", lv: 5, cd: 0, t: 0 }];
      g.p.maxHp = g.p.hp = 1e6;
    },
  });

  const outfitBtn = document.getElementById("outfit") as HTMLButtonElement;
  function paintOutfit() { outfitBtn.hidden = !teeStore.get() && OUTFIT !== "tee"; outfitBtn.textContent = `옷: ${OUTFIT === "tee" ? "흰 티" : "하네스"}`; }
  outfitBtn.onclick = () => { setOutfit(OUTFIT === "tee" ? "harness" : "tee"); paintOutfit(); };
  paintOutfit();
}
