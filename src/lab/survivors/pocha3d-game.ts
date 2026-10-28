// 포장마차 사수(3D) — 게임마다 다른 화면 몫(장면·그리기·카드 문구·사건 연출·HUD·결과). 공통은 shell3d.ts.
// 규칙은 core.ts + pocha.ts(docs/lab-surv-pocha.js 1판 그대로). 모델은 pocha3d-models.js, 카드 아이콘은 pocha-icons.js.
// 그리기는 디자인 세션 시안 docs/lab-surv-pocha-3d-mock.html 의 GAME(draw·overlay·cardText·onEvent·hud·end·stress)과 풀 짓기를 옮겼다.
// 가게·비는 build 가 짓고 draw 에서 부른다(규격 docs/lab-surv-pocha-spec.md 4절). 취객은 우스꽝스럽게만 — 술병·상표 없음(모델·아이콘 정본 그대로).
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as C from "./core.ts";
import { THEME } from "./pocha.ts";
import "./pocha3d-models.js";
import "./pocha-icons.js";
import { runSurvivor3D, type Stage } from "./shell3d.ts";

export function initPocha3d() {
  const Cx: any = C, T: any = THEME, D = T.DATA, SHOPD = D.SHOP, ED = D.ENEMIES;
  const W: any = window;

  function build(st: Stage) {
    const { THREE, M, scene, pool, put, blob, RP, juice: JUICE } = st;
    const GM = W.Pocha3D.build(THREE, M); // 두 번째 인자는 Surv3D.build(THREE) 의 결과(창 객체가 아니다)
    const ground = GM.makeGround(0);
    const hero = GM.makeHero();
    scene.add(hero.root);
    // 가게(월드 가운데) · 비(카메라 둘레 상자) — 이 게임만의 물건이라 build 가 들고 draw 에서 부른다
    const shop = GM.makeShop();
    shop.root.position.set(SHOPD.x, 0, SHOPD.y);
    scene.add(shop.root);
    const rain = GM.makeRain(700);
    scene.add(rain.mesh);
    const EN: Record<string, any> = {}, GU: Record<string, any> = {}, PK: Record<string, any> = {}, PJ: Record<string, any> = {};
    for (const [k, geo] of [["pigeon", "pigeon"], ["umbrella", "umbrella_fly"], ["gull", "gull"], ["drunk", "drunk"], ["sing", "drunk_sing"], ["gull_king", "gull_king"], ["rain_cloud", "rain_cloud"]]) EN[k] = pool(GM.enemyGeometry(geo).geometry, k === "gull_king" || k === "rain_cloud" ? 2 : 160);
    for (const k of ["guest_yellow", "guest_clear", "guest_sit", "guest_flee"]) GU[k] = pool(GM.guestGeometry(k).geometry, 24);
    for (const k of ["coin", "coin_big", "soup", "cashbox"]) PK[k] = pool(GM.pickupGeometry(k).geometry, k === "coin" ? 260 : 60);
    PK.stool = pool(GM.propGeometry("stool").geometry, 4); // 「의자 더 놓기」 몫 의자(줍기 묶음에 끼워 둔다 — 같은 정점 색 재질)
    for (const k of ["skewer", "ladle", "hotteok", "bungeo"]) PJ[k] = pool(GM.projGeometry(k).geometry, 80);
    let poseNow = "idle", poseAt = 0, heroFace = 0, roofA = 1;
    return {
      ground: { root: ground.root, setTod: (t: number) => ground.setDawn(t), occlude: ground.occlude },
      meshes: () => [...Object.values(EN), ...Object.values(GU), ...Object.values(PK), ...Object.values(PJ), rain.mesh],
      // 규칙 상태 → 인스턴스 행렬·막내 자세·가게·비
      draw(g: any, t: number) {
        const p = g.p, S = g.shop, REDUCE = st.reduce();
        for (const k in EN) EN[k].count = 0;
        for (const k in GU) GU[k].count = 0;
        for (const k in PK) PK[k].count = 0;
        for (const k in PJ) PJ[k].count = 0;
        const near2 = 170 * 170, close = (x: number, y: number) => (x - p.x) ** 2 + (y - p.y) ** 2 < near2;
        // 가게: 체력이 줄면 천막이 처지고, 소동 중엔 불이 깜빡인다(줄인 동작이면 어둡게만)
        shop.setDamage(1 - S.hp / S.maxHp);
        shop.setLights(S.ruckus ? (REDUCE ? 0.55 : 0.45 + 0.4 * (((t * 7) | 0) % 2)) : 1 - T.dawn(g) * 0.5);
        shop.update(t, REDUCE); // 솥 김 · 부서진 만큼 전구 깜빡임
        // 지붕은 위 카메라에서 뒤쪽 자리 셋을 늘 가린다. 막내가 가게 곁(테 + 44 안)이면 0.35, 뒤쪽 자리에 손님이 앉아 있으면 0.55(규격 5절)
        const dS = Math.hypot(p.x - SHOPD.x, p.y - SHOPD.y), backSat = g.guests.some((q: any) => q.st === "sit" && q.y < SHOPD.y - 4);
        roofA += ((dS < SHOPD.r + 44 ? 0.35 : backSat ? 0.55 : 1) - roofA) * (REDUCE ? 1 : 0.15); shop.setRoofAlpha(roofA);
        // 「의자 더 놓기」: 기본 여섯 넘는 자리엔 의자를 따로 찍는다(가게 모델 의자는 여섯)
        for (let k = 6; k < T.seats(g); k++) { const [x, z] = T.seatPos(g, k); put(PK.stool, x, 0, z, Math.atan2(SHOPD.x - x, SHOPD.y - z), 1, 1, 1); }
        put(RP.shopGlow, SHOPD.x, 0.1, SHOPD.y, 0, SHOPD.r + 30, 1, SHOPD.r + 30, 1 - T.dawn(g) * 0.6);
        put(RP.shopRing, SHOPD.x, 0.3, SHOPD.y, 0, SHOPD.r + 2, 1, SHOPD.r + 2, S.hitT > 0 ? 2 : 1);
        // 손님: 걷는 중(노랑·투명 우산) · 앉음 · 달아남. 떠나는 손님은 걷는 꼴로 반대쪽을 본다
        for (const q of g.guests) {
          if (!close(q.x, q.y)) continue;
          const k = q.st === "sit" ? "guest_sit" : q.st === "flee" ? "guest_flee" : q.kind ? "guest_clear" : "guest_yellow";
          const away = q.st === "flee" || q.st === "leave";
          const ry = away ? Math.atan2(q.x - SHOPD.x, q.y - SHOPD.y) : Math.atan2(SHOPD.x - q.x, SHOPD.y - q.y);
          const bob = REDUCE || q.st === "sit" ? 0 : Math.abs(Math.sin(t * (q.st === "flee" ? 16 : 8) + q.id)) * 0.8;
          put(GU[k], q.x, bob, q.y, ry, 1, 1, 1, q.shooT > 0 ? 1.4 : 1);
          put(blob, q.x, 0.05, q.y, 0, 12, 1, 9);
        }
        for (const r of g.rains) put(RP.rain, r.x, 0.15, r.y, 0, r.r, 1, r.r);
        for (const e of g.enemies) {
          if (!close(e.x, e.y)) continue;
          const def = ED[e.kind], E = EN[e.kind]; if (!E) continue;
          const hit = REDUCE ? 0 : (JUICE.hitT.get(e.id) || 0) / 0.12;
          const tg = def.shop ? SHOPD : p;
          let ry = Math.atan2(tg.x - e.x, tg.y - e.y), y = 0;
          if (e.kind === "gull") {
            // 갈매기: 날아온다(높이 10) → 맴돎(14, 원을 따라 돈다 · 바닥에 경고 고리) → 내리꽂기(낮게)
            if (e.hov > 0) { y = 14 + (REDUCE ? 0 : Math.sin(t * 6 + e.id) * 1.2); ry = (e.hovA || 0) + Math.PI; put(RP.hover, e.x, 0.25, e.y, 0, 7, 1, 7); }
            else y = e.hov === 0 ? 4 : 10;
          } else if (e.kind === "gull_king") y = 12 + (REDUCE ? 0 : Math.sin(t * 3) * 1.5);
          else if (e.kind === "umbrella") { y = 3 + (REDUCE ? 0 : Math.abs(Math.sin(t * 5 + e.id)) * 4); ry += REDUCE ? 0 : t * 4; }
          else if (e.kind === "drunk" || e.kind === "sing") ry += REDUCE ? 0 : Math.sin(t * 2.4 + e.id) * 0.45; // 비틀비틀
          const bob = REDUCE ? 1 : 1 + Math.sin(t * 9 + e.id) * 0.05;
          const tint = e.flash > 0 ? 1.9 : e.warnT > 0 && ((t * 12) | 0) % 2 ? 1.6 : 1;
          put(E, e.x, y, e.y, ry, 1 + hit * 0.1, bob * (1 - hit * 0.15), 1 + hit * 0.1, tint);
          put(blob, e.x, 0.05, e.y, 0, e.r * 2.4 * (y > 8 ? 0.7 : 1), 1, e.r * 1.6 * (y > 8 ? 0.7 : 1));
          if (def.scare && (e.x - SHOPD.x) ** 2 + (e.y - SHOPD.y) ** 2 < 160 * 160) put(RP.ruckus, e.x, 0.2, e.y, 0, def.scare, 1, def.scare);
          if (e.warnT > 0 && e.dashTo) put(RP.warn, e.dashTo.x, 0.3, e.dashTo.y, 0, SHOPD.r + 10, 1, SHOPD.r + 10); // 대장 돌진 예고: 가게 둘레
        }
        for (const s of g.dust) if (close(s.x, s.y)) put(PK[s.v >= 3 ? "coin_big" : "coin"], s.x, 1.5 + Math.sin(t * 4 + s.x) * 0.6, s.y, t * 2 + s.x, 1, 1, 1);
        for (const k of g.pickups) if (close(k.x, k.y)) put(PK[k.kind === "heal" ? "soup" : "cashbox"], k.x, 2 + Math.sin(t * 3) * 0.8, k.y, t, 1, 1, 1);
        for (const b of g.shots) {
          if (b.w === "hotteok") put(PJ.hotteok, b.x, 1.5, b.y, Math.atan2(b.vx, b.vy), 1, 1, 1); // 호떡은 바닥을 구른다
          else put(PJ.skewer, b.x, 5, b.y, Math.atan2(b.vx, b.vy), 1, 1, 1);
        }
        for (const w of g.weapons) {
          const kind = D.WEAPONS[w.key].kind, s = Cx.wstat(g, w);
          if (kind === "orbit") for (let i = 0; i < s.n; i++) { const a = (w.ang || 0) + (i / s.n) * Math.PI * 2; put(PJ.ladle, p.x + Math.cos(a) * s.R, 6, p.y + Math.sin(a) * s.R, -a, 1, 1, 1); }
          if (kind === "aura") put(RP.aura, p.x, 0.3, p.y, t, s.R, 1, s.R);
        }
        for (const f of g.fx) if (f.k === "drop") { const k = f.live ? 1 - f.life / f.max : 1; put(RP.bark, f.x, 0.4, f.y, 0, f.r * (0.4 + k * 0.6), 1, f.r * (0.4 + k * 0.6)); if (f.live) put(PJ.bungeo, f.x, 4 + (f.life / f.max) * 60, f.y, t * 4, 1.3, 1.3, 1.3); }
        const pose = g.state === "lost" ? "lost" : p.moving ? "walk" : "idle";
        if (pose !== poseNow) { poseNow = pose; poseAt = t; }
        if (Math.hypot(p.vx, p.vy) > 1) heroFace = Math.atan2(p.vx, p.vy);
        hero.root.position.set(p.x, 0, p.y);
        hero.root.rotation.y = heroFace; // pose 보다 먼저(머리 돌리기가 이 값을 읽는다)
        hero.pose(t, pose, t - poseAt, { speed: Math.hypot(p.vx, p.vy) / p.speed, hurt: p.iframe > 0.55, reduce: REDUCE });
        put(blob, p.x, 0.05, p.y, 0, 14, 1, 10);
        rain.update(t, p.x, p.y - 20, REDUCE || T.dawn(g) >= 1); // 줄인 동작이면 멈춘 성긴 빗줄기, 비가 그치면 멈춘다
        W.__surv.inst = { guests: Object.values(GU).reduce((n: number, m: any) => n + m.count, 0), sit: GU.guest_sit.count, flee: GU.guest_flee.count, hover: RP.hover.count, ruckus: RP.ruckus.count, roof: Math.round(roofA * 100) / 100 }; // 리그: 그려진 인스턴스 수
      },
      // 겹 캔버스: 가게 머리 위 체력 막대(가게가 두 번째 목숨 — HUD 「가게」 칸과 같은 값) · 노래하는 취객 ♪ · 맴도는 갈매기 「!」
      overlay(octx: CanvasRenderingContext2D, g: any, toScreen: (x: number, h: number, y: number) => [number, number, boolean], u: number) {
        const S = g.shop, t = g.time, REDUCE = st.reduce();
        const [x, y, ok] = toScreen(SHOPD.x, 34, SHOPD.y);
        if (ok) {
          const w = 54 * u, h = 7 * u, k = S.hp / S.maxHp;
          octx.fillStyle = "rgba(58,34,40,.55)"; octx.beginPath(); octx.roundRect(x - w / 2 - 2 * u, y - h / 2 - 2 * u, w + 4 * u, h + 4 * u, h); octx.fill();
          octx.fillStyle = k > 0.5 ? "#2fb5a8" : k > 0.25 ? "#ffd36b" : "#f07a8a"; octx.beginPath(); octx.roundRect(x - w / 2, y - h / 2, Math.max(h, w * k), h, h / 2); octx.fill();
        }
        octx.font = `900 ${Math.round(14 * u)}px "Pretendard Variable", Pretendard, system-ui, sans-serif`; octx.textAlign = "center"; octx.textBaseline = "middle";
        for (const e of g.enemies) {
          if (e.kind === "sing") { const [sx, sy, ok2] = toScreen(e.x, 22 + (REDUCE ? 0 : Math.sin(t * 4 + e.id) * 3), e.y); if (ok2) { octx.fillStyle = "#f07a8a"; octx.fillText("♪", sx + 6 * u, sy); } }
          else if (e.kind === "gull" && e.hov > 0) { const [sx, sy, ok2] = toScreen(e.x, 26, e.y); if (ok2) { octx.fillStyle = "#fffbf4"; octx.strokeStyle = "#3a2228"; octx.lineWidth = 3 * u; octx.strokeText("!", sx, sy); octx.fillText("!", sx, sy); } }
        }
        octx.textBaseline = "alphabetic";
      },
    };
  }

  runSurvivor3D({
    game: "pocha",
    theme: T,
    icons: () => W.SurvArt && W.SurvArt.pocha,
    // 하늘: 비 오는 밤 남회색 → 비 그치는 새벽 푸른 회색 → 맑은 아침(규칙의 dawn 0..1, 7분부터)
    sky: [[0, 0x1f2a3a, 0x9fb4d6, 0.7], [0.5, 0x2c3a52, 0xb7c6e0, 0.85], [0.85, 0x7d93b8, 0xffd9a0, 1.15], [1, 0xbcd3ea, 0xfff4e3, 1.5]],
    outerColor: 0x1f2a3a, // 골목 바깥은 젖은 아스팔트 색(밝은 색이면 가장자리에서 띠로 보인다)
    hemiGround: 0x2a3448, // 시안 setTod 의 hemi.groundColor — 기본 잔디색이면 젖은 골목이 초록으로 물든다
    // 바닥 고리: 시안 RINGDEF 그대로(기본 6종 덮기 + 이 게임 몫 가게 빛·가게 테·맴돎·장대비·소동)
    rings: {
      bark: [0xffd36b, 0.75, 0.82], wave: [0xe9fbff, 0.8, 0.86], zone: [0x7fd4ff, 0.5, 0], warn: [0xff8a6b, 0.7, 0.88], aura: [0xfffbf4, 0.3, 0.93], trail: [0xcdeea0, 0.7, 0],
      shopGlow: [0xffd36b, 0.18, 0], shopRing: [0xff8a6b, 0.55, 0.94], hover: [0xff8a6b, 0.75, 0.8], rain: [0x9fd8ff, 0.28, 0], ruckus: [0xf07a8a, 0.35, 0.9],
    },
    parts: { fur: "#f6a94a", coin: "#ffd36b", splash: "#9fd8ff", feather: "#fffbf4" }, // 시안 PARTDEF 중 기본과 다른 것
    todOf: g => T.dawn(g),
    camBottom: 95, // 아래쪽도 안쪽에서 묶는다(시안과 같은 값)
    // 빨리 감기(#t=)는 장면 보기용 — 가게도 안 무너지게(규격 5절: 1판은 5:12 에 무너져 뒤 장면이 모두 「진 판」이었다)
    onFastForward(g) { g.shop.hp = g.shop.maxHp; },
    build,
    cardText(c, D) {
      const Wp = D.WEAPONS, P = D.PASSIVES, TC = D.THEME_CARDS;
      if (c.type === "evo") { const w = Wp[c.key]; return { ico: "evo", name: w.evo.name, lv: "진화", desc: `${w.name} 최고 단계 + ${P[w.evo.with]} → 더 센 꼴로`, cls: "evo" }; }
      if (c.type === "weapon") { const w = Wp[c.key]; const tip = ({ skewer: "가장 가까운 소동에 어묵 꼬치를 던져요", steam: "둘레에 뜨거운 김 — 천천히 쳐요", bungeo: "화면 안 소동 머리 위로 붕어빵이 떨어져요", ladle: "국자가 둘레를 돌며 밀어내요", hotteok: "걷는 쪽으로 호떡을 굴려요" } as Record<string, string>)[c.key]; return { ico: c.key, name: w.name, lv: c.lv === 1 ? "NEW" : `LV ${c.lv}`, desc: tip + (w.evo ? ` · 진화 짝: ${P[w.evo.with]}` : "") }; }
      if (c.type === "passive") { const tip = ({ dmg: "모든 피해 +10 %", cd: "다시 쓰기까지 −8 %", area: "범위 +12 %", move: "걸음 +8 %", hp: "최대 체력 +20", magnet: "동전 끌어오기 +30 %" } as Record<string, string>)[c.key]; return { ico: c.key, name: P[c.key], lv: c.lv === 1 ? "NEW" : `LV ${c.lv}`, desc: tip }; }
      if (c.type === "theme") { const t = TC[c.key]; const tip = ({ tape: `가게 체력 +${TC.tape.heal} · 저절로 조금씩 고쳐져요`, stools: "손님 자리 +2", menu: "손님이 내는 동전 +1", tent: c.lv === 1 ? "손님이 빨리 오고 막내와 부딪혀도 안 놀라요" : "손님 걸음이 더 빨라요", broom: "가게 둘레에 빗자루 — 가까이 온 소동을 쳐요" } as Record<string, string>)[c.key]; return { ico: c.key, name: t.name, lv: `${c.lv}/${t.max}`, desc: tip, tag: "가게", cls: "habit" }; }
      return { ico: "heal", name: "어묵 국물 한 컵", lv: "", desc: "체력 30 회복" };
    },
    // 공통(말풍선·다침 흔들림·진화·보스 처치·회복·레벨업)은 껍데기가 한다. 여기는 이 게임 몫만
    onEvent(ev, g, fx) {
      const p = g.p, J = fx.juice;
      if (ev.e === "hurt") J.burst("splash", p.x, p.y - 8, 4, 30, 2.4, 0.5);
      else if (ev.e === "shophit") { if (ev.amt >= 2) J.kick(0.6); }
      else if (ev.e === "steal") { J.burst("feather", ev.x, ev.y - 6, ev.boss ? 12 : 4, 40, 2.4, 0.6); if (ev.boss) { J.kick(2.4); fx.say("갈매기 대장이 어묵을 채 갔다!"); } }
      else if (ev.e === "seated") J.burst("sparkle", ev.x, ev.y - 6, 4, 18, 2, 0.5);
      else if (ev.e === "served") { J.burst("coin", ev.x, ev.y - 6, 6, 30, 2.4, 0.6); fx.sfx.coin(); }
      else if (ev.e === "fled") { J.burst("splash", ev.x, ev.y - 4, 5, 30, 2.2, 0.5); if (ev.why === "bump") fx.say("앗, 손님이 놀랐다"); }
      else if (ev.e === "ruckus") fx.say("가게 앞 소동 — 손님이 일어난다!");
      else if (ev.e === "shoo") J.burst("feather", ev.x, ev.y - 6, 3, 24, 2, 0.4);
      else if (ev.e === "shopdown") { J.kick(3); fx.say("가게 천막이 무너졌다"); }
      else if (ev.e === "warn") J.kick(0.8);
      else if (ev.e === "summon") J.burst("feather", ev.en.x, ev.en.y - 10, 8, 40, 2.4, 0.6);
      else if (ev.e === "clear") fx.say("비가 그쳤다!");
      else if (ev.e === "kill" && ev.en.boss) J.burst("coin", ev.en.x, ev.en.y - 10, 20, 80, 3.2, 0.9);
    },
    hud(g, $) {
      $("shopNum").textContent = String(Math.ceil(g.shop.hp));
      ($("shopBar").firstChild as HTMLElement).style.width = `${(100 * g.shop.hp) / g.shop.maxHp}%`;
    },
    end(g) {
      const won = g.state === "won", m = Math.floor(g.time / 60), s = Math.floor(g.time % 60);
      return {
        title: won ? "비가 그쳤다" : g.quit ? "오늘은 일찍 닫았다" : g.shopDown ? "가게 문을 닫았다" : "막내가 지쳤다",
        sub: won ? `손님 ${g.stats.served}명이 배불리 먹고 갔어요.` : `${m}분 ${s}초 버텼어요. 내일 다시 장사!`,
        rows: [["버틴 시간", `${m}:${String(s).padStart(2, "0")}`], ["다 먹고 간 손님", g.stats.served], ["달아난 손님", g.stats.fled], ["쫓아낸 소동", g.kills]],
      };
    },
    stress(g) {
      // 적 상한까지 + 손님 열둘(앉은 여섯 · 걷는 여섯) — 그리기 비용 실측 판
      while (g.enemies.length < Cx.CORE.ENEMY_CAP) { const [x, y] = Cx.ringPoint(g, -40 - g.r() * 60); const e = Cx.spawnAt(g, g.r() < 0.5 ? "pigeon" : "umbrella", x, y); e.hp = e.maxHp = 1e9; }
      g.weapons = [{ key: "skewer", lv: 5, cd: 0, t: 0 }, { key: "ladle", lv: 5, cd: 0, t: 0 }, { key: "steam", lv: 5, cd: 0, t: 0 }, { key: "bungeo", lv: 5, cd: 0, t: 0 }];
      for (let i = 0; i < 12; i++) { const [x, y] = T.seatPos(g, i % 6); g.guests.push({ id: 900 + i, x: i < 6 ? x : x + 40, y: i < 6 ? y : y + 30, kind: i % 2, st: i < 6 ? "sit" : "walk", seat: i < 6 ? i : null, t: -1e9, payT: 1e9, wait: -1e9, nerve: 1e9, shooT: 0 }); }
      g.p.maxHp = g.p.hp = 1e6; g.shop.maxHp = g.shop.hp = 1e6;
    },
  });
}
