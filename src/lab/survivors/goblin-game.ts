// 도깨비 퇴치 — 게임마다 다른 화면 몫(그리기·카드 문구·사건 연출·결과). 입력·멈춤·랭킹 등 공통은 shell.ts.
// 그리기는 디자인 세션 시안 docs/lab-surv-goblin-mock.html 의 draw() 를 그대로 옮겼다.
// 설화: 야광귀가 체 구멍을 세느라 밤을 새운다는 민속. 무속·종교 표지는 쓰지 않는다(장터 물건·민담만).
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as C from "./core.ts";
import { THEME } from "./goblin.ts";
import "./goblin-art.js";
import { runSurvivor, type View } from "./shell.ts";

export function initGoblin() {
  const Cx: any = C, T: any = THEME, D = T.DATA;
  const ART = ((window as any).SurvArt && (window as any).SurvArt.goblin) || null;

  function draw(g: any, v: View) {
    const { ctx, inView, dot, reduce } = v, t = g.time;
    if (ART) ART.drawGround(ctx, v.cx, v.cy, v.VW, v.VH, T.dawn(g), t);
    else { ctx.fillStyle = "#17142b"; ctx.fillRect(v.cx, v.cy, v.VW, v.VH); }
    for (const z of g.beanZones) { ctx.globalAlpha = Math.min(1, z.life) * 0.45; ctx.fillStyle = "#9a1d3c"; ctx.beginPath(); ctx.arc(z.x | 0, z.y | 0, z.r, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    for (const sv of g.sieves) if (inView(sv.x, sv.y)) { if (ART) ART.drawSieve(ctx, sv.x | 0, sv.y | 0, t, T.sieveState(g, sv), sv.seated); else dot(sv.x | 0, sv.y | 0, 7, "#a8492a"); }
    for (const s of g.dust) if (inView(s.x, s.y)) { if (ART) ART.drawPickup(ctx, s.v >= 3 ? "coin_big" : "coin", s.x | 0, s.y | 0, t); else dot(s.x | 0, s.y | 0, 1, "#ffd86b"); }
    for (const k of g.pickups) if (inView(k.x, k.y)) { if (ART) ART.drawPickup(ctx, k.kind === "heal" ? "porridge" : "pouch", k.x | 0, k.y | 0, t); else dot(k.x | 0, k.y | 0, 2, "#ff5e5b"); }
    for (const f of g.fx) if (f.k === "drop" && f.live) { ctx.strokeStyle = "#ff5e5b"; ctx.globalAlpha = 0.5; ctx.strokeRect((f.x - f.r) | 0, (f.y - f.r * 0.6) | 0, f.r * 2, f.r * 1.2); ctx.globalAlpha = 1; }
    if (ART) for (const f of g.fx) if (f.k === "drop" && !f.live) ART.drawProj(ctx, "bean", f.x | 0, f.y | 0, t, 0);
    const list: [number, number, any][] = [];
    for (const e of g.enemies) if (inView(e.x, e.y, 60)) list.push([e.y, 0, e]);
    list.push([g.p.y, 3, g.p]);
    list.sort((a, b) => a[0] - b[0]);
    for (const [, k, o] of list) {
      const x = o.x | 0, y = o.y | 0;
      if (k === 0) {
        const kind = o.counting && (o.kind === "imp" || o.kind === "yagwang" || o.kind === "club") ? o.kind + "_count" : o.kind;
        if (ART) ART.drawEnemy(ctx, kind, x, y, t + o.id * 0.37, o.flash > 0, o.scale || 1);
        else dot(x, y, o.r, o.boss ? "#9a64f0" : o.counting ? "#1c7a50" : "#463d6b");
      } else if (ART) ART.drawPlayer(ctx, x, y, t, g.p.dir, g.p.iframe > 0.45 && !reduce);
      else dot(x, y, 5, "#ffd86b");
    }
    // 체는 꼬마가 돌아가 밟을 표적이다 — 남쪽에 앉은 도깨비가 가려도 보이게 적 위에 옅게 한 번 더
    if (ART) { ctx.globalAlpha = 0.35; for (const sv of g.sieves) if (sv.seated && inView(sv.x, sv.y)) ART.drawSieve(ctx, sv.x | 0, sv.y | 0, t, T.sieveState(g, sv), sv.seated); ctx.globalAlpha = 1; }
    if (ART) for (const b of g.bursts) ART.drawBurst(ctx, b.x | 0, b.y | 0, b.r, Math.min(1, b.life / 0.3));
    for (const w of g.weapons) {
      if (D.WEAPONS[w.key].kind === "aura") { const s = Cx.wstat(g, w); if (ART) ART.drawAura(ctx, g.p.x | 0, g.p.y | 0, s.R | 0, t); }
      if (D.WEAPONS[w.key].kind === "orbit") {
        const s = Cx.wstat(g, w);
        for (let i = 0; i < s.n; i++) { const a = (w.ang || 0) + (i / s.n) * Math.PI * 2; const ox = (g.p.x + Math.cos(a) * s.R) | 0, oy = (g.p.y + Math.sin(a) * s.R) | 0; if (ART) ART.drawProj(ctx, "jori", ox, oy, t, a); else dot(ox, oy, 4, "#f6a94a"); }
      }
    }
    for (const b of g.shots) {
      const kind = b.w === "yeot" ? "yeot" : "salt";
      if (ART) ART.drawProj(ctx, kind, b.x | 0, b.y | 0, t, Math.atan2(b.vy, b.vx)); else dot(b.x | 0, b.y | 0, 2, "#fff2b8");
    }
  }

  runSurvivor({
    game: "goblin",
    theme: T,
    cardText(c, D) {
      const W = D.WEAPONS, P = D.PASSIVES, TC = D.THEME_CARDS;
      if (c.type === "evo") { const w = W[c.key]; return { name: w.evo.name, lv: "진화", desc: `${w.name} 최고 단계 + ${P[w.evo.with]} → 더 센 꼴로 바뀐다`, cls: "evo" }; }
      if (c.type === "weapon") { const w = W[c.key]; const tip = ({ yeot: "가장 가까운 도깨비에 엿을 던진다", chime: "둘레에 풍경 소리 — 천천히 친다", bean: "화면 안 도깨비 머리 위로 팥을 뿌린다", jori: "복조리가 둘레를 돌며 밀어낸다", salt: "걷는 쪽으로 소금을 한 줌 뿌린다" } as Record<string, string>)[c.key]; return { name: w.name, lv: c.lv === 1 ? "새것" : `LV ${c.lv}`, desc: tip + (w.evo ? ` · 진화 짝: ${P[w.evo.with]}` : "") }; }
      if (c.type === "passive") { const tip = ({ dmg: "모든 피해 +10 %", cd: "다시 쓰기까지 -8 %", area: "범위 +12 % (체 털기도)", move: "걸음 +8 %", hp: "최대 체력 +20", magnet: "엽전 끌어오기 +30 %" } as Record<string, string>)[c.key]; return { name: P[c.key], lv: c.lv === 1 ? "새것" : `LV ${c.lv}`, desc: tip }; }
      if (c.type === "theme") { const t = TC[c.key]; const tip = ({ more: "체를 하나 더 놓을 수 있다", holes: "체 하나에 4마리 더 앉고 더 멀리서 끌린다", shake: "체 털기가 더 세고 넓다", beans: "털고 난 자리에 팥이 남아 도깨비가 느려진다", quick: "체를 더 자주 놓는다" } as Record<string, string>)[c.key]; return { name: t.name, lv: `${c.lv}/${t.max}`, desc: tip, tag: "체", cls: "habit" }; }
      return { name: "팥죽 한 그릇", lv: "", desc: "체력 30 회복" };
    },
    draw,
    onEvent(ev, _g, fx) {
      if (ev.e === "burst") { if (ev.n >= 6) fx.say(`체 털기! 도깨비 ${ev.n}`); fx.shake(ev.n >= 6 ? 3 : 1); fx.sfx.coin(); }
      else if (ev.e === "rooster") fx.say("꼬끼오 — 닭이 울었다!");
    },
    hud(g, $) { $("sieveNum").textContent = g.sieves.length ? `${g.sieves.length}·${g.sieves.reduce((n: number, s: any) => n + s.seated, 0)}` : "0"; },
    end(g) {
      const won = g.state === "won", m = Math.floor(g.time / 60), s = Math.floor(g.time % 60);
      return {
        title: won ? "닭이 울었다" : g.quit ? "장터를 떠났다" : "도깨비에 홀렸다",
        sub: won ? "도깨비들이 엽전을 흘리고 물러갔다." : `${m}분 ${s}초 버텼다. 정신 차리고 다시!`,
        rows: [["버틴 시간", `${m}:${String(s).padStart(2, "0")}`], ["물리친 도깨비", g.kills], ["체 털기", g.stats.burstN], ["한 번에 가장 많이", g.stats.burstMax]],
      };
    },
    stress(g) {
      // 적 상한까지 화면 안팎에 채우고 안 죽게 한다(맞기·밀기·그리기 비용은 그대로) — 실측 판
      while (g.enemies.length < Cx.CORE.ENEMY_CAP) { const [x, y] = Cx.ringPoint(g, -40 - g.r() * 60); const e = Cx.spawnAt(g, g.r() < 0.5 ? "imp" : "wisp", x, y); e.hp = e.maxHp = 1e9; }
      g.weapons = [{ key: "yeot", lv: 5, cd: 0, t: 0 }, { key: "jori", lv: 5, cd: 0, t: 0 }, { key: "chime", lv: 5, cd: 0, t: 0 }, { key: "bean", lv: 5, cd: 0, t: 0 }];
      for (let i = 0; i < 3; i++) g.sieves.push({ id: g.nextSieve++, x: g.p.x + (i - 1) * 40, y: g.p.y + 30, arm: 0, life: 1e9, seated: 0, heading: 0, left: false }); // 체 셋도 띄운다(앉기 비용 포함)
      g.p.maxHp = g.p.hp = 1e6;
    },
  });
}
