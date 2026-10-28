// 코코의 하루 — 게임마다 다른 화면 몫(그리기·카드 문구·사건 연출·결과·옷). 입력·멈춤·랭킹 등 공통은 shell.ts.
// 그리기는 디자인 세션 시안 docs/lab-surv-coco-mock.html 의 draw() 를 그대로 옮겼다.
// 🔴 코코는 Dean 집 강아지다. 그림은 참고 사진의 생김새만 따랐고, 사진·사람·집 안은 어디에도 없다.
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as C from "./core.ts";
import { THEME } from "./coco.ts";
import "./coco-art.js";
import { runSurvivor, type View } from "./shell.ts";

const TEE_KEY = "lab.coco.tee"; // 흰 티는 저녁밥까지 버틴(이긴) 판이 한 번 있으면 열린다(B5)

export function initCoco() {
  const Cx: any = C, T: any = THEME, D = T.DATA;
  const ART = ((window as any).SurvArt && (window as any).SurvArt.coco) || null;
  const store = {
    get: () => { try { return localStorage.getItem(TEE_KEY) === "1"; } catch { return false; } },
    set: () => { try { localStorage.setItem(TEE_KEY, "1"); } catch { /* 저장이 막혀도 게임은 돈다 */ } },
  };
  let outfit: "harness" | "tee" = /tee/.test(location.hash) ? "tee" : "harness";
  const outfitBtn = document.getElementById("outfit") as HTMLButtonElement;
  const paintOutfit = () => {
    outfitBtn.hidden = !store.get() && outfit !== "tee";
    outfitBtn.textContent = `옷: ${outfit === "tee" ? "흰 티" : "하네스"}`;
  };
  outfitBtn.onclick = () => { outfit = outfit === "tee" ? "harness" : "tee"; paintOutfit(); };
  paintOutfit();

  function draw(g: any, v: View) {
    const { ctx, inView, dot, reduce } = v, t = g.time;
    if (ART) ART.drawGround(ctx, v.cx, v.cy, v.VW, v.VH, T.tod(g), t);
    else { ctx.fillStyle = "#1c7a50"; ctx.fillRect(v.cx, v.cy, v.VW, v.VH); }
    if (ART) for (const z of g.zones) ART.drawZone(ctx, z.x | 0, z.y | 0, z.r, t, z.warn > 0);
    if (ART) for (const tr of g.trails) ART.drawScoot(ctx, tr.pts, t, Math.min(1, tr.life / 0.5));
    if (g.coco.dash && ART) ART.drawScoot(ctx, g.coco.dash.pts, t, 1);
    for (const s of g.dust) if (inView(s.x, s.y)) { if (ART) ART.drawPickup(ctx, s.v >= 3 ? "treat" : "kibble", s.x | 0, s.y | 0, t); else dot(s.x | 0, s.y | 0, 1, "#f6a94a"); }
    for (const k of g.pickups) if (inView(k.x, k.y)) { if (ART) ART.drawPickup(ctx, k.kind === "heal" ? "chew" : "fruit", k.x | 0, k.y | 0, t); else dot(k.x | 0, k.y | 0, 2, "#ffd86b"); }
    for (const f of g.fx) if (f.k === "drop" && f.live) { ctx.strokeStyle = "#ffd86b"; ctx.globalAlpha = 0.5; ctx.strokeRect((f.x - f.r) | 0, (f.y - f.r * 0.6) | 0, f.r * 2, f.r * 1.2); ctx.globalAlpha = 1; }
    for (const ev of g.fx) if (ev.k === "drop" && !ev.live && ART) ART.drawProj(ctx, "bark", ev.x | 0, ev.y | 0, t, 0);
    // 청소기 흡입 줄기(코코가 끌리는 중일 때만)
    if (ART && !g.coco.dash) for (const e of g.enemies) { const pl = D.ENEMIES[e.kind].pull; if (pl && (e.x - g.p.x) ** 2 + (e.y - g.p.y) ** 2 <= pl.R * pl.R) ART.drawSuction(ctx, e.x | 0, e.y | 0, g.p.x | 0, g.p.y | 0, t); }
    const list: [number, number, any][] = [];
    for (const e of g.enemies) if (inView(e.x, e.y, 48)) list.push([e.y, 0, e]);
    list.push([g.p.y, 3, g.p]);
    list.sort((a, b) => a[0] - b[0]);
    for (const [, k, o] of list) {
      const x = o.x | 0, y = o.y | 0;
      if (k === 0) {
        const kind = o.ringing ? "bell_ring" : o.kind;
        if (ART) ART.drawEnemy(ctx, kind, x, y, t + o.id * 0.37, o.flash > 0);
        else dot(x, y, o.r, o.boss ? "#9a64f0" : "#463d6b");
      } else if (ART) {
        ART.drawCoco(ctx, x, y, t, g.p.dir, T.pose(g), g.p.iframe > 0.45 && !g.coco.dash && !reduce, outfit);
        if (g.coco.gauge > 0 && !g.coco.dash) ART.drawGauge(ctx, x, y - 20, g.coco.gauge / 100, t);
      } else dot(x, y, 5, "#e0743a");
    }
    if (ART) for (const w of g.coco.waves) ART.drawSpinWave(ctx, w.x | 0, w.y | 0, (w.R * (1 - (w.life / 0.4) * 0.6)) | 0, Math.min(1, w.life / 0.3));
    for (const w of g.weapons) {
      if (D.WEAPONS[w.key].kind === "aura") { const s = Cx.wstat(g, w); if (ART) ART.drawAura(ctx, g.p.x | 0, g.p.y | 0, s.R | 0, t); }
      if (D.WEAPONS[w.key].kind === "orbit") {
        const s = Cx.wstat(g, w);
        for (let i = 0; i < s.n; i++) { const a = (w.ang || 0) + (i / s.n) * Math.PI * 2; const ox = (g.p.x + Math.cos(a) * s.R) | 0, oy = (g.p.y + Math.sin(a) * s.R) | 0; if (ART) ART.drawProj(ctx, "toy", ox, oy, t, a); else dot(ox, oy, 4, "#ff8be0"); }
      }
    }
    for (const b of g.shots) {
      const kind = b.w === "ball" ? "ball" : "chew";
      if (ART) ART.drawProj(ctx, kind, b.x | 0, b.y | 0, t, Math.atan2(b.vy, b.vx)); else dot(b.x | 0, b.y | 0, 2, "#ff5e5b");
    }
  }

  runSurvivor({
    game: "coco",
    theme: T,
    cardText(c, D) {
      const W = D.WEAPONS, P = D.PASSIVES, TC = D.THEME_CARDS;
      if (c.type === "evo") { const w = W[c.key]; return { name: w.evo.name, lv: "진화", desc: `${w.name} 최고 단계 + ${P[w.evo.with]} → 더 센 꼴로 바뀐다`, cls: "evo" }; }
      if (c.type === "weapon") { const w = W[c.key]; const tip = ({ ball: "가장 가까운 것에 삑삑이 공을 던진다", wag: "둘레를 꼬리 바람으로 친다 · 앉아 있으면 두 배", bark: "화면 안 싫은 것 머리 위로 멍!", toy: "인형을 물고 둘레를 휘두른다", chew: "걷는 쪽으로 개껌을 굴린다" } as Record<string, string>)[c.key]; return { name: w.name, lv: c.lv === 1 ? "새것" : `LV ${c.lv}`, desc: tip + (w.evo ? ` · 진화 짝: ${P[w.evo.with]}` : "") }; }
      if (c.type === "passive") { const tip = ({ dmg: "모든 피해 +10 %", cd: "다시 쓰기까지 -8 %", area: "범위 +12 %", move: "걸음 +8 %", hp: "최대 체력 +20", magnet: "간식 끌어오기 +30 %" } as Record<string, string>)[c.key]; return { name: P[c.key], lv: c.lv === 1 ? "새것" : `LV ${c.lv}`, desc: tip }; }
      if (c.type === "theme") { const t = TC[c.key]; const tip = ({ sit: "기운이 30 % 더 빨리 찬다", scoot: "똥꼬 스키 거리 +20 % · 피해 +25 %", spin: "뱅글뱅글 바람 고리가 더 크고 세다", calm: "앉아 있는 동안 체력이 찬다", sneak: c.lv === 1 ? "스키로 지나간 길의 간식을 먹는다" : "스키 중에 잡으면 체력 +1" } as Record<string, string>)[c.key]; return { name: t.name, lv: `${c.lv}/${t.max}`, desc: tip, tag: "습관", cls: "habit" }; }
      return { name: "개껌 하나", lv: "", desc: "체력 30 회복" };
    },
    draw,
    onEvent(ev, _g, fx) {
      if (ev.e === "spin") { fx.shake(2); fx.sfx.gold(); }
      else if (ev.e === "bellbark") { fx.say("딩동! 멍멍멍!"); fx.sfx.miss(); }
      else if (ev.e === "otherdog") fx.say("다른 강아지가 온다");
      else if (ev.e === "dinner") fx.say("저녁밥이다! 고기!");
    },
    hud(g, $) {
      $("gaugeNum").textContent = String(Math.floor(g.coco.gauge));
      $("gaugeChip").classList.toggle("full", g.coco.gauge >= 100);
    },
    end(g) {
      const won = g.state === "won", m = Math.floor(g.time / 60), s = Math.floor(g.time % 60);
      if (won && !store.get()) { store.set(); paintOutfit(); }
      return {
        title: won ? "저녁밥 시간" : g.quit ? "오늘은 여기까지" : "지쳐서 낮잠",
        sub: won ? (outfit === "tee" ? "오늘도 좋은 하루였다. 고기 냠냠." : "오늘도 좋은 하루였다. 고기 냠냠. (흰 티가 생겼다!)") : `${m}분 ${s}초 놀았다. 한숨 자고 다시 놀자.`,
        rows: [["놀았던 시간", `${m}:${String(s).padStart(2, "0")}`], ["물리친 것", g.kills], ["똥꼬 스키", g.coco.scoots], ["기운 가득 스키", g.coco.bigScoots]],
      };
    },
    stress(g) {
      // 적 상한까지 화면 안팎에 채우고 안 죽게 한다(맞기·밀기·그리기 비용은 그대로) — 실측 판
      while (g.enemies.length < Cx.CORE.ENEMY_CAP) { const [x, y] = Cx.ringPoint(g, -40 - g.r() * 60); const e = Cx.spawnAt(g, g.r() < 0.5 ? "brush" : "suds", x, y); e.hp = e.maxHp = 1e9; }
      g.weapons = [{ key: "ball", lv: 5, cd: 0, t: 0 }, { key: "toy", lv: 5, cd: 0, t: 0 }, { key: "wag", lv: 5, cd: 0, t: 0 }, { key: "bark", lv: 5, cd: 0, t: 0 }];
      g.p.maxHp = g.p.hp = 1e6;
    },
  });
}
