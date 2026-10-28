// 새벽 양치기 — 게임마다 다른 화면 몫(그리기·카드 문구·사건 연출·결과). 입력·멈춤·랭킹 등 공통은 shell.ts.
// 그리기는 디자인 세션 시안 docs/lab-surv-sheep-mock.html 의 draw() 를 그대로 옮겼다.
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as C from "./core.ts";
import { THEME } from "./sheep.ts";
import "./sheep-art.js";
import { runSurvivor, type View } from "./shell.ts";

export function initSheep() {
  const Cx: any = C, T: any = THEME, D = T.DATA;
  const ART = ((window as any).SurvArt && (window as any).SurvArt.sheep) || null;

  function draw(g: any, v: View) {
    const { ctx, inView, dot, reduce } = v, t = g.time;
    if (ART) ART.drawGround(ctx, v.cx, v.cy, v.VW, v.VH, T.dawn(g), t);
    else { ctx.fillStyle = "#17142b"; ctx.fillRect(v.cx, v.cy, v.VW, v.VH); }
    for (const f of g.fences) if (ART) ART.drawFence(ctx, f.pts, t, Math.min(1, f.life / 0.5));
    for (const z of g.zones) { ctx.globalAlpha = z.warn > 0 ? 0.35 + 0.25 * Math.sin(t * 20) : 0.55; ctx.fillStyle = "#0e0c1c"; ctx.beginPath(); ctx.arc(z.x | 0, z.y | 0, z.r, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    for (const s of g.dust) if (inView(s.x, s.y)) { if (ART) ART.drawPickup(ctx, s.v >= 3 ? "dust_big" : "dust", s.x | 0, s.y | 0, t); else dot(s.x | 0, s.y | 0, 1, "#6ee6ff"); }
    for (const k of g.pickups) if (inView(k.x, k.y)) { if (ART) ART.drawPickup(ctx, k.kind === "heal" ? "milk" : "bell", k.x | 0, k.y | 0, t); else dot(k.x | 0, k.y | 0, 2, "#ffd86b"); }
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
        if (ART) { if (o.stun > 0 && !reduce) ctx.globalAlpha = 0.75; ART.drawEnemy(ctx, kind, x, y, t + o.id * 0.37, o.flash > 0); ctx.globalAlpha = 1; }
        else dot(x, y, o.r, o.boss ? "#9a64f0" : "#463d6b");
      } else if (k === 1) { if (ART) ART.drawSheep(ctx, x, y, t, T.kindOf(g, i), i, o.iframe > 0.3); else dot(x, y, 4, "#eef1f8"); }
      else if (k === 2) { if (o.life > 3 || ((t * 6) | 0) % 2) { if (ART) ART.drawSheep(ctx, x, y, t, "stray", 0, false); else dot(x, y, 4, "#a3abc4"); } }
      else if (ART) ART.drawChild(ctx, x, y, t, g.p.dir, g.p.iframe > 0.45 && !reduce);
      else dot(x, y, 5, "#ffd86b");
    }
    for (const w of g.weapons) {
      if (D.WEAPONS[w.key].kind === "aura") { const s = Cx.wstat(g, w); if (ART) ART.drawAura(ctx, g.p.x | 0, g.p.y | 0, s.R | 0, t); }
      if (D.WEAPONS[w.key].kind === "orbit") {
        const s = Cx.wstat(g, w);
        for (let i = 0; i < s.n; i++) { const a = (w.ang || 0) + (i / s.n) * Math.PI * 2; const ox = (g.p.x + Math.cos(a) * s.R) | 0, oy = (g.p.y + Math.sin(a) * s.R) | 0; if (ART) ART.drawProj(ctx, "bubble", ox, oy, t, a); else dot(ox, oy, 4, "#c8fbff"); }
      }
    }
    for (const b of g.shots) {
      const kind = b.w === "pillow" ? "pillow" : b.w === "bubble" ? "bubble" : "star";
      if (ART) ART.drawProj(ctx, kind, b.x | 0, b.y | 0, t, Math.atan2(b.vy, b.vx)); else dot(b.x | 0, b.y | 0, 2, "#fff2b8");
    }
  }

  runSurvivor({
    game: "sheep",
    theme: T,
    cardText(c, D) {
      const W = D.WEAPONS, P = D.PASSIVES, TC = D.THEME_CARDS;
      if (c.type === "evo") { const w = W[c.key]; return { name: w.evo.name, lv: "진화", desc: `${w.name} 최고 단계 + ${P[w.evo.with]} → 더 센 꼴로 바뀐다`, cls: "evo" }; }
      if (c.type === "weapon") { const w = W[c.key]; const tip = ({ pillow: "가장 가까운 악몽에 베개를 던진다", lullaby: "둘레의 악몽을 천천히 재운다", star: "화면 안 악몽 머리 위로 별이 떨어진다", cloud: "구름이 둘레를 돌며 밀어낸다", bubble: "걷는 쪽으로 느린 꿈 방울을 띄운다" } as Record<string, string>)[c.key]; return { name: w.name, lv: c.lv === 1 ? "새것" : `LV ${c.lv}`, desc: tip + (w.evo ? ` · 진화 짝: ${P[w.evo.with]}` : "") }; }
      if (c.type === "passive") { const tip = ({ dmg: "모든 피해 +10 %", cd: "다시 쓰기까지 -8 %", area: "범위 +12 %", move: "걸음 +8 %", hp: "최대 체력 +20", magnet: "별가루 끌어오기 +30 %" } as Record<string, string>)[c.key]; return { name: P[c.key], lv: c.lv === 1 ? "새것" : `LV ${c.lv}`, desc: tip }; }
      if (c.type === "theme") { const t = TC[c.key]; const tip = ({ flock: "양 2마리가 바로 온다 · 떠도는 양이 더 자주", horn: "양이 들이받는 힘 +3", puff: "양 털 +1(한 번 더 버틴다)", pipe: c.lv === 1 ? "떨어진 양이 아이에게 걸어온다" : "우리 다시 만들기 빨라짐 · 헤매는 시간 +5 초", starsheep: "몇 마리마다 꿈양 — 가까운 악몽에 별을 쏜다" } as Record<string, string>)[c.key]; return { name: t.name, lv: `${c.lv}/${t.max}`, desc: tip, tag: "양떼", cls: "sheep" }; }
      return { name: "따뜻한 우유", lv: "", desc: "체력 30 회복" };
    },
    draw,
    onEvent(ev, _g, fx) {
      if (ev.e === "penend" && ev.conv) { fx.say(ev.conv > 1 ? "악몽 둘이 양이 됐다" : "악몽 하나가 양이 됐다"); fx.sfx.coin(); }
      else if (ev.e === "fence") fx.sfx.hit();
      else if (ev.e === "dawn") fx.say("아침이다");
    },
    hud(g, $) { $("sheepNum").textContent = g.sheep.length; },
    end(g) {
      const won = g.state === "won", m = Math.floor(g.time / 60), s = Math.floor(g.time % 60);
      return {
        title: won ? "아침이 왔다" : g.quit ? "그만 잤다" : "꿈에서 깼다",
        sub: won ? `양 ${g.sheep.length}마리와 함께 아침을 맞았다` : `${m}분 ${s}초 버텼다. 다시 자 볼까?`,
        rows: [["버틴 시간", `${m}:${String(s).padStart(2, "0")}`], ["재운 악몽", g.kills], ["가장 긴 양떼", g.stats.maxLen], ["양 우리", g.stats.fences]],
      };
    },
    stress(g) {
      // 적 상한까지 화면 안팎에 채우고 안 죽게 한다(맞기·밀기·그리기 비용은 그대로) — 실측 판
      while (g.enemies.length < Cx.CORE.ENEMY_CAP) { const [x, y] = Cx.ringPoint(g, -40 - g.r() * 60); const e = Cx.spawnAt(g, g.r() < 0.5 ? "fluff" : "clock", x, y); e.hp = e.maxHp = 1e9; }
      for (let i = 0; i < 9; i++) T.onThemeCard(g, "flock", 1);
      g.weapons = [{ key: "pillow", lv: 5, cd: 0, t: 0 }, { key: "cloud", lv: 5, cd: 0, t: 0 }, { key: "lullaby", lv: 5, cd: 0, t: 0 }, { key: "star", lv: 5, cd: 0, t: 0 }];
      g.p.maxHp = g.p.hp = 1e6;
    },
  });
}
