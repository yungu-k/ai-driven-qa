// 코코의 꿈 양몰이(3D) — 게임마다 다른 화면 몫(장면·그리기·카드 문구·사건 연출·HUD·결과). 공통은 shell3d.ts.
// 규칙은 core.ts + dreamherd.ts(새벽 양치기에서 이름만 코코 꿈으로 바꾼 판 — 수치 같음). 모델은 dreamherd3d-models.js(코코 모델 재사용),
// 카드 아이콘은 dreamherd-icons.js. 그리기는 디자인 세션 시안 docs/lab-surv-dreamherd-3d-mock.html 의 GAME.draw 를 옮겼다.
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as C from "./core.ts";
import { THEME } from "./dreamherd.ts";
import "./dreamherd3d-models.js";
import "./dreamherd-icons.js";
import { runSurvivor3D, type Stage } from "./shell3d.ts";

export function initDreamherd3d() {
  const Cx: any = C, T: any = THEME, D = T.DATA;
  const W: any = window;

  function build(st: Stage) {
    const { THREE, M, scene, pool, put, blob, RP, juice: JUICE } = st;
    const DM = W.Dream3D.build(THREE, M); // 두 번째 인자는 Surv3D.build(THREE) 의 결과(창 객체를 넘기면 makeCoco 가 없다고 죽는다)
    const ground = DM.makeGround(0);
    const coco = DM.makeCoco();
    scene.add(coco.root);
    const EN: Record<string, any> = {}, PK: Record<string, any> = {}, PJ: Record<string, any> = {}, SH: Record<string, any> = {};
    for (const k of ["fluff", "clock", "hand", "hand_rise", "closet", "wolf", "boss_wolf", "boss_dark"]) EN[k] = pool(DM.enemyGeometry(k).geometry, k.startsWith("boss") ? 2 : 160);
    for (const k of ["dust", "dust_big", "milk", "bell"]) PK[k] = pool(DM.pickupGeometry(k).geometry, k === "dust" ? 260 : 60);
    for (const k of ["ball", "star", "bubble", "cloud"]) PJ[k] = pool(DM.projGeometry(k).geometry, 80);
    // 양떼: 종류마다 인스턴스(줄 40 + 헤매는 양)
    for (const k of ["wool", "horn", "puff", "star", "stray"]) SH[k] = pool(DM.sheepGeometry(k).geometry, k === "stray" ? 16 : 44);
    // 양 우리: 바닥에 깔리는 빛 다각형(동시에 넷까지)
    const PENS = [0, 1, 2, 3].map(() => { const pm = DM.penMesh(200); scene.add(pm.mesh); return pm; });
    let poseNow = "sit", poseAt = 0, cocoFace = Math.PI / 2;
    return {
      ground: { root: ground.root, setTod: (t: number) => ground.setDawn(t) }, // 나무가 없는 들판이라 가림(occlude)은 없다
      meshes: () => [...Object.values(EN), ...Object.values(PK), ...Object.values(PJ), ...Object.values(SH)],
      // 규칙 상태 → 인스턴스 행렬·코코 자세·양 줄·우리
      draw(g: any, t: number) {
        const p = g.p, REDUCE = st.reduce();
        for (const k in EN) EN[k].count = 0;
        for (const k in PK) PK[k].count = 0;
        for (const k in PJ) PJ[k].count = 0;
        for (const k in SH) SH[k].count = 0;
        const near2 = 170 * 170, close = (x: number, y: number) => (x - p.x) ** 2 + (y - p.y) ** 2 < near2;
        for (const e of g.enemies) {
          if (!close(e.x, e.y)) continue;
          const E = EN[e.inactive ? "hand_rise" : e.kind]; if (!E) continue;
          const hit = REDUCE ? 0 : (JUICE.hitT.get(e.id) || 0) / 0.12;
          const bob = REDUCE ? 1 : 1 + Math.sin(t * 9 + e.id) * 0.05;
          const tg = (e.kind === "wolf" || e.kind === "boss_wolf") && g.sheep.length ? g.sheep[0] : p;
          const ry = Math.atan2(tg.x - e.x, tg.y - e.y);
          const sleep = e.stun > 0 && !e.boss ? 0.55 : 1; // 우리 안에서 잠들면 납작
          put(E, e.x, 0, e.y, ry, 1 + hit * 0.1, bob * (1 - hit * 0.15) * sleep, 1 + hit * 0.1, e.flash > 0 ? 1.9 : 1);
          put(blob, e.x, 0.05, e.y, 0, e.r * 2.4, 1, e.r * 1.6);
        }
        // 양 줄: 앞 양(또는 코코)을 바라본다
        for (let i = 0; i < g.sheep.length; i++) {
          const s = g.sheep[i], f = i ? g.sheep[i - 1] : p;
          if (!close(s.x, s.y)) continue;
          const k = T.kindOf(g, i), ry = Math.atan2(f.x - s.x, f.y - s.y), hop = REDUCE ? 0 : Math.abs(Math.sin(t * 8 + i * 0.7)) * (p.moving ? 1.2 : 0.2);
          put(SH[k], s.x, hop, s.y, ry, 1, 1, 1, s.iframe > 0.3 ? 1.7 : 1);
          put(blob, s.x, 0.05, s.y, 0, 9, 1, 6);
        }
        for (const s of g.strays) if (close(s.x, s.y) && (s.life > 3 || ((t * 6) | 0) % 2)) { put(SH.stray, s.x, 0, s.y, t * 2 + s.x, 1, 1, 1); put(blob, s.x, 0.05, s.y, 0, 9, 1, 6); }
        for (let i = 0; i < PENS.length; i++) { const f = g.fences[g.fences.length - 1 - i]; PENS[i].set(f ? f.pts : null, f ? Math.min(1, f.life / 0.5) : 0); }
        for (const s of g.dust) if (close(s.x, s.y)) put(PK[s.v >= 3 ? "dust_big" : "dust"], s.x, 1.5 + Math.sin(t * 4 + s.x) * 0.6, s.y, t * 2, 1, 1, 1);
        for (const k of g.pickups) if (close(k.x, k.y)) put(PK[k.kind === "heal" ? "milk" : "bell"], k.x, 2 + Math.sin(t * 3) * 0.8, k.y, t, 1, 1, 1);
        for (const b of g.shots) put(PJ[b.w === "pillow" ? "ball" : b.w === "bubble" ? "bubble" : "star"], b.x, 5, b.y, t * 8, 1, 1, 1);
        for (const w of g.weapons) {
          const kind = D.WEAPONS[w.key].kind, s = Cx.wstat(g, w);
          if (kind === "orbit") for (let i = 0; i < s.n; i++) { const a = (w.ang || 0) + (i / s.n) * Math.PI * 2; put(PJ.cloud, p.x + Math.cos(a) * s.R, 6, p.y + Math.sin(a) * s.R, -a, 1, 1, 1); }
          if (kind === "aura") put(RP.aura, p.x, 0.3, p.y, t, s.R, 1, s.R);
        }
        for (const f of g.fx) if (f.k === "drop") { const k = f.live ? 1 - f.life / f.max : 1; put(RP.bark, f.x, 0.4, f.y, 0, f.r * (0.4 + k * 0.6), 1, f.r * (0.4 + k * 0.6)); if (f.live) put(PJ.star, f.x, 4 + (f.life / f.max) * 60, f.y, 0, 1, 1, 1); }
        for (const z of g.zones) put(z.warn > 0 ? RP.warn : RP.zone, z.x, 0.2, z.y, 0, z.r, 1, z.r);
        const pose = g.state === "lost" ? "nap" : p.moving ? "walk" : "sit";
        if (pose !== poseNow) { poseNow = pose; poseAt = t; }
        if (Math.hypot(p.vx, p.vy) > 1) cocoFace = Math.atan2(p.vx, p.vy);
        coco.root.position.set(p.x, 0, p.y);
        coco.root.rotation.y = cocoFace; // pose 보다 먼저(머리 돌리기가 이 값을 읽는다)
        coco.pose(t, pose, t - poseAt, { speed: Math.hypot(p.vx, p.vy) / p.speed, hurt: p.iframe > 0.55, reduce: REDUCE });
        put(blob, p.x, 0.05, p.y, 0, 16, 1, 11);
      },
    };
  }

  runSurvivor3D({
    game: "dreamherd",
    theme: T,
    icons: () => W.SurvArt && W.SurvArt.dreamherd,
    // 밤 → 새벽(규칙의 dawn 0..1): 남보라 밤 · 보라 새벽녘 · 분홍 동틀녘 · 금빛 아침
    sky: [[0, 0x2a2858, 0x8b5cd6, 0.75], [0.5, 0x3d3a7a, 0xb99af0, 0.9], [0.8, 0xff8fa3, 0xffb38a, 1.2], [1, 0xffd166, 0xfff4e3, 1.6]],
    outerColor: 0x2a2858, // 꿈 들판 바깥은 밤 하늘색(코코 판의 짙은 풀색이 밤에 초록 띠로 보였다)
    todOf: g => T.dawn(g),
    camBottom: 95, // 아래쪽도 안쪽에서 묶는다(가장자리 캡처로 맞춤)
    build,
    cardText(c, D) {
      const Wp = D.WEAPONS, P = D.PASSIVES, TC = D.THEME_CARDS;
      if (c.type === "evo") { const w = Wp[c.key]; return { ico: "evo", name: w.evo.name, lv: "진화", desc: `${w.name} 최고 단계 + ${P[w.evo.with]} → 더 센 꼴로`, cls: "evo" }; }
      if (c.type === "weapon") { const w = Wp[c.key]; const tip = ({ pillow: "가장 가까운 악몽에 꿈 공을 던져요", lullaby: "드르렁 — 둘레의 악몽을 천천히 재워요", star: "화면 안 악몽 머리 위로 별이 떨어져요", cloud: "구름이 둘레를 돌며 밀어내요", bubble: "걷는 쪽으로 잠꼬대 방울을 띄워요" } as Record<string, string>)[c.key]; return { ico: c.key, name: w.name, lv: c.lv === 1 ? "NEW" : `LV ${c.lv}`, desc: tip + (w.evo ? ` · 진화 짝: ${P[w.evo.with]}` : "") }; }
      if (c.type === "passive") { const tip = ({ dmg: "모든 피해 +10 %", cd: "다시 쓰기까지 −8 %", area: "범위 +12 %", move: "걸음 +8 %", hp: "최대 체력 +20", magnet: "별가루 끌어오기 +30 %" } as Record<string, string>)[c.key]; return { ico: c.key, name: P[c.key], lv: c.lv === 1 ? "NEW" : `LV ${c.lv}`, desc: tip }; }
      if (c.type === "theme") { const t = TC[c.key]; const tip = ({ flock: "멍! 양 2마리가 바로 와요 · 떠도는 양이 더 자주", horn: "양이 들이받는 힘 +3", puff: "양 털 +1(한 번 더 버텨요)", pipe: c.lv === 1 ? "떨어진 양이 코코에게 걸어와요" : "우리 다시 만들기 빨라짐 · 헤매는 시간 +5 초", starsheep: "몇 마리마다 꿈양 — 가까운 악몽에 별을 쏴요" } as Record<string, string>)[c.key]; return { ico: c.key, name: t.name, lv: `${c.lv}/${t.max}`, desc: tip, tag: "양떼", cls: "habit" }; }
      return { ico: "heal", name: "따뜻한 우유", lv: "", desc: "체력 30 회복" };
    },
    onEvent(ev, g, fx) {
      const p = g.p, J = fx.juice;
      if (ev.e === "fence") { J.burst("sparkle", p.x, p.y - 6, 10, 40, 2.4, 0.6); if (ev.n >= 15) J.freeze(0.05); fx.sfx.hit(); }
      else if (ev.e === "penend" && ev.conv) { fx.say(ev.conv > 1 ? "악몽 둘이 양이 됐어요" : "악몽 하나가 양이 됐어요"); fx.sfx.coin(); }
      else if (ev.e === "sheep-") J.burst("bubble", ev.x, ev.y - 4, 3, 20, 2.2, 0.5);
      else if (ev.e === "dawn") fx.say("동이 텄어요!");
    },
    hud(g, $) { $("sheepNum").textContent = String(g.sheep.length); },
    end(g) {
      const won = g.state === "won", m = Math.floor(g.time / 60), s = Math.floor(g.time % 60);
      return {
        title: won ? "아침이 왔다" : g.quit ? "그만 잤다" : "꿈에서 깼다",
        sub: won ? `양 ${g.sheep.length}마리와 함께 아침을 맞았어요.` : `${m}분 ${s}초 버텼어요. 다시 꿈속으로?`,
        rows: [["버틴 시간", `${m}:${String(s).padStart(2, "0")}`], ["재운 악몽", g.kills], ["가장 긴 양떼", g.stats.maxLen], ["양 우리", g.stats.fences]],
      };
    },
    stress(g) {
      while (g.enemies.length < Cx.CORE.ENEMY_CAP) { const [x, y] = Cx.ringPoint(g, -40 - g.r() * 60); const e = Cx.spawnAt(g, g.r() < 0.5 ? "fluff" : "clock", x, y); e.hp = e.maxHp = 1e9; }
      for (let i = 0; i < 18; i++) T.onThemeCard(g, "flock", 1); // 양 40(상한)까지
      g.weapons = [{ key: "pillow", lv: 5, cd: 0, t: 0 }, { key: "cloud", lv: 5, cd: 0, t: 0 }, { key: "lullaby", lv: 5, cd: 0, t: 0 }, { key: "star", lv: 5, cd: 0, t: 0 }];
      g.p.maxHp = g.p.hp = 1e6;
    },
  });
}
