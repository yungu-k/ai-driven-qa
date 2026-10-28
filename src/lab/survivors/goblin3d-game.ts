// 도깨비 퇴치(3D) — 게임마다 다른 화면 몫(장면·그리기·카드 문구·사건 연출·HUD·결과). 공통은 shell3d.ts.
// 규칙은 core.ts + goblin.ts(docs/lab-surv-goblin.js 2판 그대로). 모델은 goblin3d-models.js, 카드 아이콘은 goblin-icons.js.
// 그리기는 디자인 세션 시안 docs/lab-surv-goblin-3d-mock.html 의 GAME.draw·overlay 와 풀 짓기를 옮겼다(규격 docs/lab-surv-goblin-3d-spec.md 1절).
// 설화: 야광귀가 체 구멍을 세느라 밤을 새운다는 민속. 무속·종교 표지는 쓰지 않는다(장터 물건·민담만).
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as C from "./core.ts";
import { THEME } from "./goblin.ts";
import "./goblin3d-models.js";
import "./goblin-icons.js";
import { runSurvivor3D, type Stage } from "./shell3d.ts";

export function initGoblin3d() {
  const Cx: any = C, T: any = THEME, D = T.DATA, SIEVE = D.SIEVE;
  const W: any = window;

  function build(st: Stage) {
    const { THREE, M, scene, pool, put, blob, RP, juice: JUICE } = st;
    const GM = W.Gob3D.build(THREE, M); // 두 번째 인자는 Surv3D.build(THREE) 의 결과(창 객체가 아니다)
    const ground = GM.makeGround(0);
    const hero = GM.makeHero();
    scene.add(hero.root);
    const EN: Record<string, any> = {}, PK: Record<string, any> = {}, PJ: Record<string, any> = {}, SV: Record<string, any> = {};
    for (const k of ["imp", "imp_count", "wisp", "yagwang", "yagwang_count", "club", "club_count", "foxfire", "gumiho", "geuseundae"]) EN[k] = pool(GM.enemyGeometry(k).geometry, k === "gumiho" || k === "geuseundae" ? 2 : 160);
    for (const k of ["coin", "coin_big", "porridge", "pouch"]) PK[k] = pool(GM.pickupGeometry(k).geometry, k === "coin" ? 260 : 60);
    for (const k of ["yeot", "salt", "bean", "jori"]) PJ[k] = pool(GM.projGeometry(k).geometry, 80);
    // 체: 동시에 최대 3 + 「체 하나 더」 2 = 5(스트레스 판 셋). 상태는 인스턴스 색으로(준비 중 어둡게 · 준비 끝 · 가득 차면 밝게)
    SV.sieve = pool(GM.sieveGeometry().geometry, 8);
    let poseNow = "idle", poseAt = 0, heroFace = 0;
    return {
      ground: { root: ground.root, setTod: (t: number) => ground.setDawn(t), occlude: ground.occlude }, // 좌판·감나무가 꼬마를 가리면 반투명
      meshes: () => [...Object.values(EN), ...Object.values(PK), ...Object.values(PJ), ...Object.values(SV)],
      // 규칙 상태 → 인스턴스 행렬·꼬마 자세·체
      draw(g: any, t: number) {
        const p = g.p, REDUCE = st.reduce();
        for (const k in EN) EN[k].count = 0;
        for (const k in PK) PK[k].count = 0;
        for (const k in PJ) PJ[k].count = 0;
        for (const k in SV) SV[k].count = 0;
        const near2 = 170 * 170, close = (x: number, y: number) => (x - p.x) ** 2 + (y - p.y) ** 2 < near2;
        const sieveById = new Map<number, any>();
        // 체: 놓인 뒤 준비(0.8 초) 동안 작게 튀어 오르고 어둡다 → 준비 끝 · 가득 차면 더 밝다. 사라지기 3초 전부터 깜빡(줄인 동작이면 어둡게만)
        for (const s of g.sieves) {
          sieveById.set(s.id, s);
          if (!close(s.x, s.y)) continue;
          const ss = T.sieveState(g, s);
          const pop = ss === "arming" ? 0.7 + 0.3 * (1 - s.arm / SIEVE.arm) : 1;
          const ending = s.life < 3, blinkOff = ending && !REDUCE && ((t * 5) | 0) % 2 === 0;
          const tint = (ss === "arming" ? 0.6 : ss === "full" ? 1.35 : 1) * (ending && (REDUCE || blinkOff) ? 0.6 : 1);
          put(SV.sieve, s.x, 0.25, s.y, s.id * 0.7, pop, 1, pop, tint);
          const seatOuter = SIEVE.seatR + SIEVE.ringGap * (s.seated > 6 ? 2 : 1) + 4; // 앉은 무리를 감싸는 빛 웅덩이
          put(RP.sieveGlow, s.x, 0.12, s.y, 0, seatOuter, 1, seatOuter);
          if (ss !== "arming" && s.left) { const k = REDUCE ? 1 : 1 + Math.sin(t * 6 + s.id) * 0.08; put(RP.sieve, s.x, 0.35, s.y, 0, (SIEVE.touchR + 4) * k, 1, (SIEVE.touchR + 4) * k); } // 밟을 테 — 한 번 벗어난 뒤부터
        }
        for (const z of g.beanZones) { const r = z.r * Math.min(1, z.life * 2); put(RP.bean, z.x, 0.18, z.y, 0, r, 1, r); }
        for (const b of g.bursts) { const k = 1 - b.life / 0.4, r = b.r * (0.35 + 0.65 * Math.sqrt(Math.max(0, k))); put(RP.burst, b.x, 0.45, b.y, 0, r, 1, r); }
        for (const e of g.enemies) {
          if (!close(e.x, e.y)) continue;
          const sit = e.counting && EN[e.kind + "_count"];
          const E = sit ? EN[e.kind + "_count"] : EN[e.kind]; if (!E) continue;
          const hit = REDUCE ? 0 : (JUICE.hitT.get(e.id) || 0) / 0.12;
          const angry = e.angryT > 0, dazed = e.stun > 0.06 && !e.counting && !e.boss;
          const bob = REDUCE || sit ? 1 : 1 + Math.sin(t * (angry ? 18 : 9) + e.id) * (angry ? 0.09 : 0.05);
          let ry: number;
          if (sit) { const s = sieveById.get(e.sieve); ry = s ? Math.atan2(s.x - e.x, s.y - e.y) : 0; } // 앉은 도깨비는 체를 바라보며 센다
          else if (e.boss && e.dashT > 0 && e.dashTo) ry = Math.atan2(e.dashTo.x - e.x, e.dashTo.y - e.y);
          else ry = Math.atan2(p.x - e.x, p.y - e.y);
          if (dazed && !REDUCE) ry += Math.sin(t * 14 + e.id) * 0.5; // 털린 뒤 멍함: 고개 흔들기
          const sc = e.scale || 1; // 그슨대: 꼬마가 가까울수록 커진다(규칙이 e.scale 을 움직인다)
          const tint = e.flash > 0 ? 1.9 : angry ? 1.3 : e.warnT > 0 && ((t * 12) | 0) % 2 ? 1.6 : 1;
          put(E, e.x, 0, e.y, ry, sc * (1 + hit * 0.1), sc * bob * (1 - hit * 0.15), sc * (1 + hit * 0.1), tint);
          put(blob, e.x, 0.05, e.y, 0, e.r * 2.4, 1, e.r * 1.6);
          if (e.warnT > 0 && e.dashTo) put(RP.warn, e.dashTo.x, 0.3, e.dashTo.y, 0, e.r * 1.4, 1, e.r * 1.4); // 구미호 돌진 예고: 꼬마가 서 있던 자리
        }
        for (const s of g.dust) if (close(s.x, s.y)) put(PK[s.v >= 3 ? "coin_big" : "coin"], s.x, 1.5 + Math.sin(t * 4 + s.x) * 0.6, s.y, t * 2 + s.x, 1, 1, 1);
        for (const k of g.pickups) if (close(k.x, k.y)) put(PK[k.kind === "heal" ? "porridge" : "pouch"], k.x, 2 + Math.sin(t * 3) * 0.8, k.y, t, 1, 1, 1);
        for (const b of g.shots) {
          if (b.w === "salt") put(PJ.salt, b.x, 1.2, b.y, t * 3, 1, 1, 1); // 소금은 바닥을 구르며 지나간 자리를 친다
          else put(PJ.yeot, b.x, 5, b.y, Math.atan2(b.vx, b.vy), 1, 1, 1);
        }
        for (const w of g.weapons) {
          const kind = D.WEAPONS[w.key].kind, s = Cx.wstat(g, w);
          if (kind === "orbit") for (let i = 0; i < s.n; i++) { const a = (w.ang || 0) + (i / s.n) * Math.PI * 2; put(PJ.jori, p.x + Math.cos(a) * s.R, 6, p.y + Math.sin(a) * s.R, -a, 1, 1, 1); }
          if (kind === "aura") put(RP.aura, p.x, 0.3, p.y, t, s.R, 1, s.R);
        }
        for (const f of g.fx) if (f.k === "drop") { const k = f.live ? 1 - f.life / f.max : 1; put(RP.bark, f.x, 0.4, f.y, 0, f.r * (0.4 + k * 0.6), 1, f.r * (0.4 + k * 0.6)); if (f.live) put(PJ.bean, f.x, 4 + (f.life / f.max) * 60, f.y, t * 4, 1.4, 1.4, 1.4); }
        const pose = g.state === "lost" ? "lost" : p.moving ? "walk" : "idle";
        if (pose !== poseNow) { poseNow = pose; poseAt = t; }
        if (Math.hypot(p.vx, p.vy) > 1) heroFace = Math.atan2(p.vx, p.vy);
        hero.root.position.set(p.x, 0, p.y);
        hero.root.rotation.y = heroFace; // pose 보다 먼저(머리 돌리기가 이 값을 읽는다)
        hero.pose(t, pose, t - poseAt, { speed: Math.hypot(p.vx, p.vy) / p.speed, hurt: p.iframe > 0.55, reduce: REDUCE });
        put(blob, p.x, 0.05, p.y, 0, 14, 1, 10);
        W.__surv.inst = { sit: EN.imp_count.count + EN.yagwang_count.count + EN.club_count.count, sieve: SV.sieve.count, ring: RP.sieve.count, burst: RP.burst.count }; // 리그: 그려진 인스턴스 수
      },
      // 겹 캔버스: 앉은 도깨비가 있는 체 위에 「앉은 수/자리」 — 털 때를 고르는 눈금(가득 차면 금빛)
      overlay(octx: CanvasRenderingContext2D, g: any, toScreen: (x: number, h: number, y: number) => [number, number, boolean], u: number) {
        const H = T.hold(g), p = g.p;
        octx.font = `800 ${Math.round(11 * u)}px "Pretendard Variable", Pretendard, system-ui, sans-serif`; octx.textAlign = "center"; octx.textBaseline = "middle";
        for (const s of g.sieves) {
          if (!s.seated || (s.x - p.x) ** 2 + (s.y - p.y) ** 2 > 160 * 160) continue;
          const [x, y, ok] = toScreen(s.x, 22, s.y); if (!ok) continue;
          const txt = `${s.seated}/${H}`, w = octx.measureText(txt).width + 12 * u, h = 17 * u, full = s.seated >= H;
          octx.globalAlpha = s.life < 3 ? 0.6 : 0.95;
          octx.fillStyle = full ? "#ffd36b" : "#fffaf2"; octx.strokeStyle = "#3a2228"; octx.lineWidth = 1.5 * u;
          octx.beginPath(); octx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); octx.fill(); octx.stroke();
          octx.fillStyle = "#3a2228"; octx.fillText(txt, x, y + 0.5 * u);
        }
        octx.globalAlpha = 1; octx.textBaseline = "alphabetic";
      },
    };
  }

  runSurvivor3D({
    game: "goblin",
    theme: T,
    icons: () => W.SurvArt && W.SurvArt.goblin,
    // 밤 → 새벽(규칙의 dawn 0..1, 7분부터): 깊은 밤 남색 · 새벽 라벤더 · 닭 울 녘 금빛
    sky: [[0, 0x1a1838, 0x7f8fd6, 0.7], [0.5, 0x2c2a55, 0xb3a7e0, 0.85], [0.85, 0x9a7fc8, 0xffc98a, 1.15], [1, 0xffd9a0, 0xfff4e3, 1.5]],
    outerColor: 0x2a2440, // 장터 바깥은 밤 흙색(밝은 색이면 가장자리에서 띠로 보인다)
    hemiGround: 0x2a2440, // 기본 잔디색이 밤 장터 바닥을 초록으로 물들였다(규격 1절)
    // 바닥 고리: 구미호 돌진 예고는 주황, 풍경(aura)은 옅은 하늘색 + 이 게임 몫(체 테·체 밑 빛·체 털기 퍼짐·팥 자리). 값은 시안 RINGDEF
    rings: {
      warn: [0xff8a6b, 0.7, 0.88], aura: [0xbfe3ff, 0.32, 0.93],
      sieve: [0xffd36b, 0.85, 0.8], sieveGlow: [0xffd36b, 0.22, 0], burst: [0xfff0b8, 0.9, 0.86], bean: [0x9a1d3c, 0.42, 0],
    },
    parts: { fur: "#f6a94a", coin: "#ffd36b", bean: "#9a1d3c", salt: "#fffbf4" }, // 시안 PARTDEF(다친 꼬마 털 색 + 엽전·팥·소금)
    todOf: g => T.dawn(g),
    camBottom: 95, // 아래쪽도 안쪽에서 묶는다(시안과 같은 값)
    build,
    cardText(c, D) {
      const Wp = D.WEAPONS, P = D.PASSIVES, TC = D.THEME_CARDS;
      if (c.type === "evo") { const w = Wp[c.key]; return { ico: "evo", name: w.evo.name, lv: "진화", desc: `${w.name} 최고 단계 + ${P[w.evo.with]} → 더 센 꼴로`, cls: "evo" }; }
      if (c.type === "weapon") { const w = Wp[c.key]; const tip = ({ yeot: "가장 가까운 도깨비에 엿을 던져요", chime: "둘레에 풍경 소리 — 천천히 쳐요", bean: "화면 안 도깨비 머리 위로 팥을 뿌려요", jori: "복조리가 둘레를 돌며 밀어내요", salt: "걷는 쪽으로 소금을 한 줌 뿌려요" } as Record<string, string>)[c.key]; return { ico: c.key, name: w.name, lv: c.lv === 1 ? "NEW" : `LV ${c.lv}`, desc: tip + (w.evo ? ` · 진화 짝: ${P[w.evo.with]}` : "") }; }
      if (c.type === "passive") { const tip = ({ dmg: "모든 피해 +10 %", cd: "다시 쓰기까지 −8 %", area: "범위 +12 % (체 털기도)", move: "걸음 +8 %", hp: "최대 체력 +20", magnet: "엽전 끌어오기 +30 %" } as Record<string, string>)[c.key]; return { ico: c.key, name: P[c.key], lv: c.lv === 1 ? "NEW" : `LV ${c.lv}`, desc: tip }; }
      if (c.type === "theme") { const t = TC[c.key]; const tip = ({ more: "체를 하나 더 놓을 수 있어요", holes: "체 하나에 4마리 더 앉고 더 멀리서 끌려요", shake: "체 털기가 더 세고 넓어요", beans: "털고 난 자리에 팥이 남아 도깨비가 느려져요", quick: "체를 더 자주 놓아요" } as Record<string, string>)[c.key]; return { ico: c.key, name: t.name, lv: `${c.lv}/${t.max}`, desc: tip, tag: "체", cls: "habit" }; }
      return { ico: "heal", name: "따끈한 팥죽", lv: "", desc: "체력 30 회복" }; // 보조 hp 이름(팥죽 한 그릇)과 갈랐다
    },
    // 공통(말풍선·다침 흔들림·진화·보스 처치·회복·레벨업)은 껍데기가 한다. 여기는 이 게임 몫만
    onEvent(ev, g, fx) {
      const p = g.p, J = fx.juice;
      if (ev.e === "hurt") J.burst("fur", p.x, p.y - 8, 4, 30, 2.4, 0.5);
      else if (ev.e === "sieve") J.burst("dust", ev.x, ev.y, 5, 22, 2, 0.4); // 체가 발밑에 놓였다
      else if (ev.e === "burst") {
        // 체 털기: 앉은 수에 따라 크기가 갈린다 — 6마리 넘게 모았으면 멈춤·흔들림·말풍선
        J.burst("coin", ev.x, ev.y - 4, Math.min(24, 6 + ev.n * 2), 60, 2.6, 0.7);
        J.burst("sparkle", ev.x, ev.y - 4, 8, 40, 2.2, 0.5);
        if (ev.n >= 6) { J.freeze(0.07); J.kick(3); fx.say(`체 털기! 도깨비 ${ev.n}`); } else J.kick(1);
        fx.sfx.coin();
      }
      else if (ev.e === "sieveout" && ev.n >= 3) fx.say("체를 놓쳤다 — 도깨비가 화났다!");
      else if (ev.e === "warn") J.kick(0.8);
      else if (ev.e === "summon") J.burst("star", ev.en.x, ev.en.y - 10, 8, 40, 2.4, 0.6);
      else if (ev.e === "rooster") fx.say("꼬끼오 — 닭이 울었다!");
      else if (ev.e === "kill" && ev.en.boss) J.burst("coin", ev.en.x, ev.en.y - 10, 20, 80, 3.2, 0.9);
    },
    hud(g, $) { $("sieveNum").textContent = g.sieves.length ? `${g.sieves.length}·${g.sieves.reduce((n: number, s: any) => n + s.seated, 0)}` : "0"; },
    end(g) {
      const won = g.state === "won", m = Math.floor(g.time / 60), s = Math.floor(g.time % 60);
      return {
        title: won ? "닭이 울었다" : g.quit ? "장터를 떠났다" : "도깨비에 홀렸다",
        sub: won ? "도깨비들이 엽전을 흘리고 물러갔어요." : `${m}분 ${s}초 버텼어요. 정신 차리고 다시!`,
        rows: [["버틴 시간", `${m}:${String(s).padStart(2, "0")}`], ["물리친 도깨비", g.kills], ["체 털기", g.stats.burstN], ["한 번에 가장 많이", g.stats.burstMax]],
      };
    },
    stress(g) {
      // 적 상한까지 화면 안팎에 채우고 안 죽게 한다(맞기·밀기·그리기 비용은 그대로) — 실측 판. 체 셋도 띄워 앉은 모델까지 그린다
      while (g.enemies.length < Cx.CORE.ENEMY_CAP) { const [x, y] = Cx.ringPoint(g, -40 - g.r() * 60); const e = Cx.spawnAt(g, g.r() < 0.5 ? "imp" : "wisp", x, y); e.hp = e.maxHp = 1e9; }
      g.weapons = [{ key: "yeot", lv: 5, cd: 0, t: 0 }, { key: "jori", lv: 5, cd: 0, t: 0 }, { key: "chime", lv: 5, cd: 0, t: 0 }, { key: "bean", lv: 5, cd: 0, t: 0 }];
      for (let i = 0; i < 3; i++) g.sieves.push({ id: g.nextSieve++, x: g.p.x + (i - 1) * 40, y: g.p.y + 30, arm: 0, life: 1e9, seated: 0, heading: 0, left: false });
      g.p.maxHp = g.p.hp = 1e6;
    },
  });
}
