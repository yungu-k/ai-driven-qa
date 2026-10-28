// 코코의 하루 3D — 놀이 화면을 로우폴리 3D(Three.js)로 그리는 판(Dean 10-28 결정: HD·3D 비교 뒤 3D).
// 규칙은 도트판과 같은 core.ts + coco.ts. 모델은 coco3d-models.js(디자인 세션 정본 사본, 기본 도형 조립), 카드 아이콘은 coco-icons.js.
// 뼈대는 디자인 세션 시안 docs/lab-surv-coco-3d-mock.html 의 스크립트를 그대로 옮겼다. 시안에 없던 것:
// 멈춤 메뉴(소리·실험실로·그만두기), 화면이 가려지면 멈춤, 효과음(lab sound.ts), 이름 남기기·모두가 보는 랭킹, 시작 화면 HI-SCORE, 흰 티 해금(B5).
// 🔴 코코는 Dean 집 강아지다. 모델은 참고 사진의 생김새만 따랐고, 사진·사람·집 안은 어디에도 없다.
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from "three";
import * as C from "./core.ts";
import { THEME } from "./coco.ts";
import "./coco3d-models.js";
import "./coco-icons.js";
import { isSoundOn, setSoundOn, sfx, unlock } from "@/lab/sound";
import { fetchTop, submitScore, cleanNameSay, type ScoreRow } from "@/lab/arcade-rank";

const GAME_KEY = "coco"; // 랭킹은 도트판과 같은 판(규칙이 같다)
const TEE_KEY = "lab.coco.tee"; // 흰 티는 저녁밥까지 버틴(이긴) 판이 한 번 있으면 열린다(B5)

export function initCoco3d() {
  const Cx: any = C, T: any = THEME, D = T.DATA;
  const W: any = window;
  const ART = (W.SurvArt && W.SurvArt.cocoHD) || null; // 카드 아이콘(HD 와 같은 것)만
  const hash = location.hash;
  let REDUCE = /reduce/.test(hash) || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const teeStore = {
    get: () => { try { return localStorage.getItem(TEE_KEY) === "1"; } catch { return false; } },
    set: () => { try { localStorage.setItem(TEE_KEY, "1"); } catch { /* 저장이 막혀도 게임은 돈다 */ } },
  };
  let OUTFIT: "harness" | "tee" = /tee/.test(hash) ? "tee" : "harness";
  const seedArg = () => +(hash.match(/seed=(\d+)/) || [])[1] || ((Math.random() * 1e9) | 0);
  const $ = <E extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as E;
  const cv = $<HTMLCanvasElement>("cv"), ov = $<HTMLCanvasElement>("ov"), octx = ov.getContext("2d")!;
  let DPR = 1;
  let g: any = null, acc = 0, last = 0, sayT = 0, paused = false;
  W.__surv = { frames: [] as number[], get g() { return g; }, core: C }; // 리그가 엔진 함수(gainXp 등)를 부를 자리

  // ── 3D 무대 ──────────────────────────────────────────────
  // 좌표: 규칙 x → x, 규칙 y → z, 높이 = y(바닥 0). 카메라는 코코를 따라 비스듬히 내려다본다 — 엄지 조작이라 위아래가 읽혀야 한다.
  const M = W.Surv3D.build(THREE);
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 20, 1400);
  // 1판 55°·폭 180 은 코코가 화면 폭 1/9 의 갈색 덩어리로 보였다 → 50°·폭 150(원근이라 위쪽은 더 넓게 보인다)
  const CAM = { tilt: (50 * Math.PI) / 180, dist: 560, ahead: 18, width: 150 }; // ahead: 코코를 화면 가운데보다 위에(엄지가 아래)
  const hemi = new THREE.HemisphereLight(0xfff4e3, 0x47a35a, 1.6);
  const sun = new THREE.DirectionalLight(0xfffbf4, 1.6);
  sun.position.set(-160, 300, -120);
  scene.add(hemi, sun);
  const ground = M.makeGround(0);
  scene.add(ground.root);
  // 월드(0..540) 밖 바닥: 가장자리에서 카메라가 하늘을 비추지 않게 짙은 풀 판을 넓게 깐다
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x2f7d4a }));
  outer.position.set(270, -0.6, 270);
  scene.add(outer);
  // 하늘·빛 색(시간대): 아침 → 한낮 → 노을 → 저녁
  const SKY: [number, number, number, number][] = [[0, 0xbfe6ff, 0xfff4e3, 1.6], [0.5, 0x9fd8ff, 0xfffbf4, 1.7], [0.75, 0xff8fa3, 0xffb38a, 1.3], [1, 0x2a2858, 0x8b5cd6, 0.75]];
  const cA = new THREE.Color(), cB = new THREE.Color();
  function setTod(tod: number) {
    let i = 0;
    while (i < SKY.length - 2 && tod > SKY[i + 1][0]) i++;
    const [t0, s0, l0, k0] = SKY[i], [t1, s1, l1, k1] = SKY[i + 1], f = Math.min(1, Math.max(0, (tod - t0) / (t1 - t0)));
    scene.background = (scene.background || new THREE.Color()).copy(cA.set(s0)).lerp(cB.set(s1), f);
    sun.color.copy(cA.set(l0)).lerp(cB.set(l1), f);
    sun.intensity = k0 + (k1 - k0) * f;
    hemi.intensity = 0.9 + sun.intensity * 0.45;
    ground.setTod(tod);
  }
  // 코코(옷을 바꾸면 모델을 다시 만든다)
  let coco = M.makeCoco(OUTFIT);
  scene.add(coco.root);
  function setOutfit(o: "harness" | "tee") {
    if (o === OUTFIT) return;
    OUTFIT = o; scene.remove(coco.root); coco = M.makeCoco(OUTFIT); scene.add(coco.root);
  }
  // 종류마다 InstancedMesh 하나(정점 색 + 인스턴스 색 — 번쩍임은 인스턴스 색을 1 넘게)
  const instMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  function pool(geo: any, cap: number) { const m = new THREE.InstancedMesh(geo, instMat, cap); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; m.frustumCulled = false; scene.add(m); return m; }
  const EN: Record<string, { mesh: any; h: number }> = {}, PK: Record<string, any> = {}, PJ: Record<string, any> = {};
  for (const k of ["brush", "suds", "suds_s", "bell", "vacuum", "dog", "boss_vacuum", "boss_bath"]) { const e = M.enemyGeometry(k); EN[k] = { mesh: pool(e.geometry, k.startsWith("boss") ? 2 : 160), h: e.height }; }
  for (const k of ["kibble", "treat", "chew", "fruit"]) PK[k] = pool(M.pickupGeometry(k).geometry, k === "kibble" ? 260 : 60);
  for (const k of ["ball", "toy", "chew"]) PJ[k] = pool(M.projGeometry(k).geometry, 60);
  // 접지 그림자: 원판 인스턴스 하나(그림자 맵 없이)
  const blob = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: M.blobTexture(), transparent: true, depthWrite: false, opacity: 0.55 }), 200);
  blob.count = 0; blob.frustumCulled = false; blob.renderOrder = 1; scene.add(blob);
  // 바닥 고리(짖음·뱅글 바람·물웅덩이·꼬리 바람·스키 자국): 고리 메시 묶음
  const ringMat = (c: number, o: number) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide });
  const RINGS: Record<string, [number, number, number]> = { bark: [0xffd36b, 0.75, 0.82], wave: [0xe9fbff, 0.8, 0.86], zone: [0x7fd4ff, 0.5, 0], warn: [0x7fd4ff, 0.6, 0.9], aura: [0xb99af0, 0.35, 0.93], trail: [0xcdeea0, 0.7, 0] };
  const RP: Record<string, any> = {};
  for (const k in RINGS) { const [c, o, inner] = RINGS[k]; const m = new THREE.InstancedMesh(new THREE.RingGeometry(inner, 1, 40).rotateX(-Math.PI / 2), ringMat(c, o), 40); m.count = 0; m.frustumCulled = false; m.renderOrder = 2; scene.add(m); RP[k] = m; }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();
  function put(mesh: any, x: number, y: number, z: number, ry: number, sx: number, sy: number, sz: number, tint?: number) {
    const i = mesh.count++;
    if (i >= mesh.instanceMatrix.count) { mesh.count--; return; }
    _q.setFromEuler(_e.set(0, ry, 0)); _p.set(x, y, z); _s.set(sx, sy, sz);
    mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
    if (tint != null) mesh.setColorAt(i, _c.setScalar(tint));
    else if (mesh.instanceColor) mesh.setColorAt(i, _c.setScalar(1));
  }
  function fit() {
    const cap = +(hash.match(/dprcap=(\d)/) || [])[1] || 2; // 렌더 DPR 상한 기본 2(규격 3절 실측)
    DPR = Math.min(cap, window.devicePixelRatio || 1);
    const w = $("wrap").clientWidth || 360, h = $("wrap").clientHeight || 600;
    renderer.setPixelRatio(DPR); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    // 시야 폭이 규칙의 180 단위 안팎이 되게 거리를 맞춘다(세로가 길면 더 멀리)
    CAM.dist = CAM.width / (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
    ov.width = Math.round(w * Math.min(2, window.devicePixelRatio || 1)); ov.height = Math.round(h * Math.min(2, window.devicePixelRatio || 1));
  }
  fit();
  addEventListener("resize", () => fit());

  // ── 입력(도트판과 같다) ───────────────────────────────────
  const stick = { on: false, ox: 0, oy: 0, x: 0, y: 0 }, keys = new Set<string>();
  const R_STICK = 38, DEAD = 0.12, wrap = $("wrap");
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
    const k = Math.min(1, (m - DEAD) / (1 - DEAD)) / m;
    return { x: stick.x * k, y: stick.y * k };
  }

  // ── 손맛 계층(JUICE): 그림 규칙과 무관한 화면 몫 ─────────────
  // 히트 멈춤은 「게임 시간을 멈춘다」 — 규칙의 시간이 잠깐 서는 것이라 공정하다(모두에게 같은 사건에서).
  // 피해 숫자는 큰 한 방만(스키·뱅글·멍멍·보스). 20 이면 앉아서 두 배가 된 꼬리 바람(틱 23 안팎)이 화면을 숫자로 덮었다
  const JUICE_NUM_MIN = 40;
  const JUICE = {
    parts: [] as any[], nums: [] as any[], shake: 0, stop: 0, hpSeen: new Map<number, number>(), hitT: new Map<number, number>(),
    PART_CAP: 140, NUM_CAP: 16,
    burst(kind: string, x: number, y: number, n: number, speed: number, size: number, life: number) {
      if (REDUCE) return;
      for (let i = 0; i < n && this.parts.length < this.PART_CAP; i++) {
        const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
        this.parts.push({ kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, life, max: life, size: size * (0.6 + Math.random() * 0.6), rot: Math.random() * 6 });
      }
    },
    num(n: number, x: number, y: number) { if (this.nums.length < this.NUM_CAP) this.nums.push({ n: Math.round(n), x, y, life: 0.7 }); },
    kick(s: number) { if (!REDUCE) this.shake = Math.max(this.shake, s); },
    freeze(sec: number) { if (!REDUCE) this.stop = Math.max(this.stop, sec); },
    step(dt: number) {
      for (const p of this.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy = p.vy * 0.92 + 12 * dt; }
      this.parts = this.parts.filter(p => p.life > 0);
      for (const q of this.nums) { q.life -= dt; q.y -= 18 * dt; }
      this.nums = this.nums.filter(q => q.life > 0);
      this.shake *= Math.pow(0.0015, dt); // 약 0.25 초에 사라지는 감쇠
      if (this.shake < 0.05) this.shake = 0;
    },
    // 보이는 적의 체력이 한 프레임에 크게 줄면 숫자(JUICE_NUM_MIN 이상)·찌그러짐
    watch(g: any, inView: (x: number, y: number, m: number) => boolean) {
      for (const e of g.enemies) {
        if (!inView(e.x, e.y, 30)) continue;
        const was = this.hpSeen.get(e.id);
        if (was != null && was - e.hp >= 1) { this.hitT.set(e.id, 0.12); if (was - e.hp >= JUICE_NUM_MIN) this.num(was - e.hp, e.x, e.y - e.r * 2); }
        this.hpSeen.set(e.id, e.hp);
      }
      if (this.hpSeen.size > 400) { const live = new Set(g.enemies.map((e: any) => e.id)); for (const id of this.hpSeen.keys()) if (!live.has(id)) this.hpSeen.delete(id); }
    },
  };

  // ── 게임별 부분 ─────────────────────────────
  let poseNow = "sit", poseAt = 0, cocoFace = Math.PI / 2;
  function cardText(c: any) {
    const Wp = D.WEAPONS, P = D.PASSIVES, TC = D.THEME_CARDS;
    if (c.type === "evo") { const w = Wp[c.key]; return { ico: "evo", name: w.evo.name, lv: "진화", desc: `${w.name} 최고 단계 + ${P[w.evo.with]} → 더 센 꼴로`, cls: "evo" }; }
    if (c.type === "weapon") { const w = Wp[c.key]; const tip = ({ ball: "가장 가까운 것에 삑삑이 공", wag: "둘레를 꼬리 바람으로 · 앉으면 두 배", bark: "화면 안 싫은 것 머리 위로 멍!", toy: "인형을 물고 휘둘러요", chew: "걷는 쪽으로 개껌을 굴려요" } as Record<string, string>)[c.key]; return { ico: c.key, name: w.name, lv: c.lv === 1 ? "NEW" : `LV ${c.lv}`, desc: tip + (w.evo ? ` · 진화 짝: ${P[w.evo.with]}` : "") }; }
    if (c.type === "passive") { const tip = ({ dmg: "모든 피해 +10 %", cd: "다시 쓰기까지 −8 %", area: "범위 +12 %", move: "걸음 +8 %", hp: "최대 체력 +20", magnet: "간식 끌어오기 +30 %" } as Record<string, string>)[c.key]; return { ico: c.key, name: P[c.key], lv: c.lv === 1 ? "NEW" : `LV ${c.lv}`, desc: tip }; }
    if (c.type === "theme") { const t = TC[c.key]; const tip = ({ sit: "기운이 30 % 더 빨리 차요", scoot: "똥꼬 스키 거리 +20 % · 피해 +25 %", spin: "뱅글뱅글 바람이 더 크고 세요", calm: "앉아 있는 동안 체력이 차요", sneak: c.lv === 1 ? "스키로 지나간 길의 간식을 먹어요" : "스키 중에 잡으면 체력 +1" } as Record<string, string>)[c.key]; return { ico: c.key, name: t.name, lv: `${c.lv}/${t.max}`, desc: tip, tag: "습관", cls: "habit" }; }
    return { ico: "heal", name: "개껌 하나", lv: "", desc: "체력 30 회복" };
  }
  let hurtT = 0;
  function onEvent(ev: any) {
    const p = g.p;
    if (ev.e === "say") say(ev.text);
    else if (ev.e === "hurt") { JUICE.kick(1.6); JUICE.burst("fur", p.x, p.y - 8, 4, 30, 2.4, 0.5); if (performance.now() - hurtT > 400) { hurtT = performance.now(); sfx.miss(); } }
    else if (ev.e === "scoot") { JUICE.burst("dust", p.x, p.y, 8, 40, 3, 0.45); if (ev.gauge >= 100) JUICE.freeze(0.05); sfx.hit(); }
    else if (ev.e === "spin") { JUICE.kick(2.4); JUICE.burst("fur", p.x, p.y - 6, 10, 60, 2.6, 0.6); JUICE.burst("sparkle", p.x, p.y - 8, 8, 50, 2.4, 0.5); sfx.gold(); }
    else if (ev.e === "bellbark") { say("딩동! 멍멍멍!"); sfx.miss(); }
    else if (ev.e === "otherdog") say("다른 강아지가 와요");
    else if (ev.e === "evo") { say(D.WEAPONS[ev.key].evo.name + "!"); JUICE.burst("sparkle", p.x, p.y - 10, 14, 50, 2.6, 0.7); sfx.gold(); }
    else if (ev.e === "dinner") say("저녁밥이다! 고기!");
    else if (ev.e === "kill" && ev.en.kind === "suds") JUICE.burst("bubble", ev.en.x, ev.en.y - 4, 4, 26, 2.4, 0.5);
    else if (ev.e === "kill" && ev.en.boss) { JUICE.freeze(0.12); JUICE.kick(3); JUICE.burst("star", ev.en.x, ev.en.y - 10, 16, 70, 3.2, 0.9); sfx.result(); }
    else if (ev.e === "pick" && ev.kind === "heal") JUICE.burst("heart", p.x, p.y - 14, 3, 16, 3, 0.8);
    else if (ev.e === "levelup") { JUICE.burst("sparkle", p.x, p.y - 10, 10, 40, 2.4, 0.6); sfx.gold(); }
    else if (ev.e === "boss") sfx.miss();
  }
  // 3D 그리기: 규칙 상태 → 인스턴스 행렬·코코 자세
  function draw() {
    const t = g.time, p = g.p;
    setTod(T.tod(g));
    for (const k in EN) EN[k].mesh.count = 0;
    for (const k in PK) PK[k].count = 0;
    for (const k in PJ) PJ[k].count = 0;
    for (const k in RP) RP[k].count = 0;
    blob.count = 0;
    const near2 = 170 * 170, close = (x: number, y: number) => (x - p.x) ** 2 + (y - p.y) ** 2 < near2;
    for (const e of g.enemies) {
      if (!close(e.x, e.y)) continue;
      const E = EN[e.kind]; if (!E) continue;
      const sc = 1; // 모델이 종류별 실제 크기로 나온다 — 다시 키우면 보스가 4배 넘게 커진다
      const hit = REDUCE ? 0 : (JUICE.hitT.get(e.id) || 0) / 0.12;
      const bob = REDUCE ? 1 : 1 + Math.sin(t * 9 + e.id) * 0.05;
      const ry = Math.atan2(p.x - e.x, p.y - e.y) + (e.ringing && !REDUCE ? Math.sin(t * 40) * 0.25 : 0);
      put(E.mesh, e.x, 0, e.y, ry, sc * (1 + hit * 0.1), sc * bob * (1 - hit * 0.15), sc * (1 + hit * 0.1), e.flash > 0 ? 1.9 : 1);
      put(blob, e.x, 0.05, e.y, 0, e.r * 2.4, 1, e.r * 1.6);
    }
    for (const s of g.dust) if (close(s.x, s.y)) put(PK[s.v >= 3 ? "treat" : "kibble"], s.x, 1.5 + Math.sin(t * 4 + s.x) * 0.6, s.y, t * 2, 1, 1, 1);
    for (const k of g.pickups) if (close(k.x, k.y)) put(PK[k.kind === "heal" ? "chew" : "fruit"], k.x, 2 + Math.sin(t * 3) * 0.8, k.y, t, 1, 1, 1);
    for (const b of g.shots) put(PJ[b.w === "ball" ? "ball" : "chew"], b.x, 5, b.y, t * 8, 1, 1, 1);
    for (const w of g.weapons) {
      const kind = D.WEAPONS[w.key].kind, st = Cx.wstat(g, w);
      if (kind === "orbit") for (let i = 0; i < st.n; i++) { const a = (w.ang || 0) + (i / st.n) * Math.PI * 2; put(PJ.toy, p.x + Math.cos(a) * st.R, 6, p.y + Math.sin(a) * st.R, -a, 1, 1, 1); }
      if (kind === "aura") put(RP.aura, p.x, 0.3, p.y, t, st.R, 1, st.R);
    }
    for (const f of g.fx) if (f.k === "drop") { const k = f.live ? 1 - f.life / f.max : 1; put(RP.bark, f.x, 0.4, f.y, 0, f.r * (0.4 + k * 0.6), 1, f.r * (0.4 + k * 0.6)); }
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
    coco.root.rotation.y = cocoFace;
    coco.pose(t, pose, t - poseAt, { speed: Math.hypot(p.vx, p.vy) / p.speed, hurt: p.iframe > 0.55 && !g.coco.dash, reduce: REDUCE });
    put(blob, p.x, 0.05, p.y, 0, g.coco.dash ? 12 : 16, 1, g.coco.dash ? 8 : 11);
    for (const m of [...Object.values(EN).map(e => e.mesh), ...Object.values(PK), ...Object.values(PJ), ...Object.values(RP), blob]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  }
  function hud() {
    const p = g.p;
    $("hpNum").textContent = String(Math.ceil(p.hp));
    ($("hpBar").firstChild as HTMLElement).style.width = `${(100 * p.hp) / p.maxHp}%`;
    const left = Math.max(0, D.DURATION - g.time);
    $("clock").textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")}`;
    ($("dawnBar").firstChild as HTMLElement).style.width = `${(100 * g.time) / D.DURATION}%`;
    ($("xpBar").firstChild as HTMLElement).style.width = `${(100 * g.xp) / Cx.CORE.need(g.lv)}%`;
    $("lvNum").textContent = `LV ${g.lv}`;
    const r = $("gaugeRing"); r.style.setProperty("--g", String(Math.floor(g.coco.gauge))); r.classList.toggle("full", g.coco.gauge >= 100);
  }
  function stress() {
    while (g.enemies.length < Cx.CORE.ENEMY_CAP) { const [x, y] = Cx.ringPoint(g, -40 - g.r() * 60); const e = Cx.spawnAt(g, ["brush", "suds", "bell", "dog"][(g.r() * 4) | 0], x, y); e.hp = e.maxHp = 1e9; }
    g.weapons = [{ key: "ball", lv: 5, cd: 0, t: 0 }, { key: "toy", lv: 5, cd: 0, t: 0 }, { key: "wag", lv: 5, cd: 0, t: 0 }, { key: "bark", lv: 5, cd: 0, t: 0 }];
    g.p.maxHp = g.p.hp = 1e6;
  }

  // ── 카드 ─────────────────────────
  // 레벨업 상자가 뜬 뒤 카드 잠금(ms). 카드는 0–150 ms 동안 튀어 오르며 투명한데도 눌렸다 — 놀던 엄지의 연타가 그대로 카드를 고를 수 있다
  const LOCK_MS = 350;
  let lockT = 0;
  function showLevel() {
    $("lvTitle").textContent = `LV ${g.lv}`;
    const box = $("cards"); box.textContent = "";
    g.offer.forEach((c: any, i: number) => {
      const t: any = cardText(c), b = document.createElement("button");
      b.className = "card " + (t.cls || "");
      const ico = document.createElement("span"); ico.className = "ico"; ico.setAttribute("aria-hidden", "true");
      const src = ART && ART.iconURL ? ART.iconURL(t.ico, Math.round(42 * DPR)) : "";
      if (src) { const img = document.createElement("img"); img.src = src; img.width = 42; img.height = 42; img.alt = ""; ico.append(img); }
      const name = document.createElement("b"); name.textContent = t.name;
      const lv = document.createElement("span"); lv.className = "lv"; lv.textContent = t.lv;
      const small = document.createElement("small"); small.textContent = (t.tag ? `${t.tag} · ` : "") + t.desc;
      b.append(ico, name, lv, small);
      b.onclick = () => pickCard(i);
      box.appendChild(b);
    });
    $("rr").textContent = g.rerolls; ($("reroll") as HTMLButtonElement).disabled = g.rerolls <= 0;
    $("lvl").classList.add("on");
    box.classList.add("lock"); clearTimeout(lockT); lockT = window.setTimeout(() => box.classList.remove("lock"), LOCK_MS);
  }
  function pickCard(i: number) {
    if ($("cards").classList.contains("lock")) return; // 키보드 1·2·3 도 같은 잠금
    if (!Cx.choose(g, i)) return;
    sfx.tick();
    $("lvl").classList.remove("on");
    if (g.state === "levelup") showLevel();
    last = performance.now();
  }
  $("reroll").onclick = () => { if (Cx.reroll(g)) showLevel(); };
  function say(text: string) { const s = $("say"); (s.firstChild as HTMLElement).textContent = text; s.classList.add("on"); sayT = 2.2; }

  // ── 판·멈춤 ─────────────────────────
  function start() {
    const seed = seedArg();
    g = Cx.create(T, seed);
    W.__surv.seed = seed;
    const ft = +(hash.match(/t=(\d+)/) || [])[1];
    if (ft) fastForward(ft);
    if (/stress/.test(hash)) stress();
    for (const id of ["start", "end", "menu"]) $(id).classList.remove("on");
    paused = false; acc = 0; last = performance.now(); poseAt = 0;
    $("hint").style.display = "";
    sfx.start();
  }
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
  $("go").onclick = start;
  $("again").onclick = start;
  const outfitBtn = $<HTMLButtonElement>("outfit");
  const paintOutfit = () => { outfitBtn.hidden = !teeStore.get() && OUTFIT !== "tee"; outfitBtn.textContent = `옷: ${OUTFIT === "tee" ? "흰 티" : "하네스"}`; };
  outfitBtn.onclick = () => { setOutfit(OUTFIT === "tee" ? "harness" : "tee"); paintOutfit(); };
  paintOutfit();

  function menuSync() {
    for (const [id, on] of [["mSnd", isSoundOn()], ["mReduce", REDUCE]] as const) { $(id).querySelector(".mstate")!.textContent = on ? "켬" : "끔"; $(id).setAttribute("aria-pressed", on ? "true" : "false"); }
  }
  function pause() { if (!g || g.state !== "play") return; paused = true; up(); menuSync(); $("menu").classList.add("on"); }
  function resume() { paused = false; $("menu").classList.remove("on"); last = performance.now(); }
  $("menuBtn").onclick = () => (paused ? resume() : pause());
  $("mResume").onclick = resume;
  $("mSnd").onclick = () => { setSoundOn(!isSoundOn()); if (isSoundOn()) unlock(); menuSync(); };
  $("mReduce").onclick = () => { REDUCE = !REDUCE; menuSync(); };
  $("mQuit").onclick = () => { $("menu").classList.remove("on"); paused = false; g.state = "lost"; g.quit = true; endScreen(); };
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });

  // ── 결과 → 이름 남기기 → 랭킹 ──
  const esc = (v: string) => v.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  function endScreen() {
    const won = g.state === "won", m = Math.floor(g.time / 60), s = Math.floor(g.time % 60), score = Cx.score(g);
    let unlocked = false;
    if (won && !teeStore.get()) { teeStore.set(); unlocked = true; paintOutfit(); }
    $("endTitle").textContent = won ? "저녁밥 시간" : g.quit ? "오늘은 여기까지" : "지쳐서 낮잠";
    $("endSub").textContent = won ? `오늘도 좋은 하루였어요. 고기 냠냠.${unlocked ? " (흰 티가 생겼어요!)" : ""}` : `${m}분 ${s}초 놀았어요. 한숨 자고 다시 놀아요.`;
    const rows: [string, string | number][] = [["놀았던 시간", `${m}:${String(s).padStart(2, "0")}`], ["물리친 것", g.kills], ["똥꼬 스키", g.coco.scoots], ["기운 가득 스키", g.coco.bigScoots], ["점수", score]];
    $("res").innerHTML = rows.map(([a, b]) => `<span>${esc(String(a))}</span><span>${esc(String(b))}</span>`).join("");
    $("entry").hidden = false; ($("enter") as HTMLButtonElement).disabled = false;
    ($("ini") as HTMLInputElement).value = ""; ($("sayIn") as HTMLInputElement).value = "";
    $("board").hidden = true;
    $("end").classList.add("on");
    if (won) sfx.result(); else sfx.miss();
    ($("enter") as HTMLButtonElement).onclick = async () => {
      const { name, say: line } = cleanNameSay(($("ini") as HTMLInputElement).value, ($("sayIn") as HTMLInputElement).value);
      if (name.length !== 3) { ($("ini") as HTMLInputElement).focus(); return; }
      ($("enter") as HTMLButtonElement).disabled = true;
      const got = await submitScore(GAME_KEY, { name, score, say: line, sec: Math.round(g.time * 10) / 10 });
      showBoard(got ?? (await fetchTop(GAME_KEY)) ?? [], got ? { name, score, say: line } : null, !got);
    };
  }
  function showBoard(rows: ScoreRow[], me: { name: string; score: number; say: string } | null, failed: boolean) {
    $("entry").hidden = true;
    const meAt = me ? rows.findIndex(r => r.name === me.name && r.score === me.score && r.say === me.say) : -1;
    $("board").innerHTML = (failed ? `<p>지금은 등록이 안 돼요</p>` : "") + (rows.length
      ? `<table class="rank"><colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5"></colgroup>
        <thead><tr><th>#</th><th>이름</th><th>점수</th><th>한마디</th><th>날짜</th></tr></thead><tbody>
        ${rows.map((r, i) => `<tr class="${i === meAt ? "me" : ""}"><td class="n">${i + 1}</td><td class="n">${esc(r.name)}</td><td class="n">${r.score}</td><td>${esc(r.say || "—")}</td><td class="n">${esc(r.date)}</td></tr>`).join("")}
        </tbody></table>`
      : `<p>아직 기록이 없어요</p>`);
    $("board").hidden = false;
    paintHi(rows[0]);
  }
  function paintHi(top?: ScoreRow) {
    const hi = $("hi");
    hi.hidden = !top;
    if (top) hi.textContent = `HI-SCORE ${top.name} ${top.score}`;
  }

  // ── 그리기 틀 ────────────────────────────────────────────
  const _v = new THREE.Vector3();
  function toScreen(x: number, h: number, y: number): [number, number, boolean] { _v.set(x, h, y).project(camera); return [(_v.x * 0.5 + 0.5) * ov.width, (-_v.y * 0.5 + 0.5) * ov.height, _v.z < 1]; }
  const PC: Record<string, string> = { dust: "#ecd3a6", sparkle: "#fff0b8", fur: "#b8643a", bubble: "#eef8ff", heart: "#f07a8a", star: "#ffd36b" };
  function render() {
    const p = g.p;
    let sx = 0, sz = 0;
    if (JUICE.shake) { sx = (Math.random() - 0.5) * JUICE.shake; sz = (Math.random() - 0.5) * JUICE.shake; }
    // 카메라 목표는 월드 안에 묶는다 — 1판은 가장자리 너머를 비춰 화면 절반이 하늘이었다
    const hw = CAM.width / 2 - 20;
    const tx = Cx.clamp(p.x, hw, g.world - hw) + sx, tz = Cx.clamp(p.y - CAM.ahead, 150, g.world - 45) + sz; // 위쪽(먼 쪽)은 원근으로 넓게 보여 더 안쪽에서 묶는다
    camera.position.set(tx, Math.sin(CAM.tilt) * CAM.dist, tz + Math.cos(CAM.tilt) * CAM.dist);
    camera.lookAt(tx, 0, tz);
    JUICE.watch(g, (x, y) => (x - p.x) ** 2 + (y - p.y) ** 2 < 150 * 150);
    draw();
    renderer.render(scene, camera);
    W.__surv.gpu = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; // 휴대폰 GPU 부담은 CPU 늦추기로 못 잰다 — 호출·삼각형으로 맞댄다
    // 겹 캔버스(2D): 머리 위 기운 칸 셋·입자·피해 숫자 — 3D 장면에 섞지 않고 화면 좌표로
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, ov.width, ov.height);
    const u = ov.width / 360;
    if (g.coco.gauge > 0 && !g.coco.dash && g.state !== "title") {
      const [hx, hy] = toScreen(p.x, 30, p.y), gv = g.coco.gauge / 100;
      for (let i = 0; i < 3; i++) { octx.fillStyle = gv >= (i + 1) / 3 - 0.001 ? (gv >= 1 ? "#ffd36b" : "#f6e3c4") : "rgba(58,34,40,.35)"; octx.beginPath(); octx.roundRect(hx + (i - 1.5) * 11 * u + u, hy - 3 * u, 9 * u, 6 * u, 3 * u); octx.fill(); }
    }
    for (const q of JUICE.parts) { const [x, y, ok] = toScreen(q.x, 6, q.y); if (!ok) continue; octx.globalAlpha = Math.min(1, (q.life / q.max) * 1.5); octx.fillStyle = PC[q.kind] || "#fff"; octx.beginPath(); octx.arc(x, y, q.size * u, 0, 7); octx.fill(); }
    octx.globalAlpha = 1;
    octx.font = `900 ${Math.round(15 * u)}px "Pretendard Variable", Pretendard, system-ui, sans-serif`; octx.textAlign = "center";
    for (const q of JUICE.nums) { const [x, y] = toScreen(q.x, 14, q.y); octx.globalAlpha = Math.min(1, q.life / 0.3); octx.lineWidth = 4 * u; octx.strokeStyle = "#3a2228"; octx.strokeText(String(q.n), x, y); octx.fillStyle = "#fffbf4"; octx.fillText(String(q.n), x, y); }
    octx.globalAlpha = 1;
  }
  function frame(now: number) {
    requestAnimationFrame(frame);
    if (!g) return;
    const t0 = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (g.state === "play" && !paused) {
      if (JUICE.stop > 0) JUICE.stop -= dt; // 히트 멈춤: 이 동안 규칙 시간이 선다
      else {
        acc += dt;
        g.input = readInput();
        while (acc >= Cx.CORE.DT && g.state === "play") { Cx.step(g); acc -= Cx.CORE.DT; for (const ev of g.events) onEvent(ev); g.events.length = 0; }
      }
      if (g.state === "levelup") showLevel();
      else if (g.state === "won" || g.state === "lost") endScreen();
    } else if (g.state === "levelup" && !$("lvl").classList.contains("on")) showLevel();
    if (!paused) {
      for (const [id, v] of JUICE.hitT) { if (v - dt <= 0) JUICE.hitT.delete(id); else JUICE.hitT.set(id, v - dt); }
      JUICE.step(dt);
    }
    if (sayT > 0) { sayT -= dt; if (sayT <= 0) $("say").classList.remove("on"); }
    render();
    hud();
    const fr = W.__surv.frames; fr.push(performance.now() - t0); if (fr.length > 600) fr.shift();
  }
  // 시작 화면 뒤에도 공원이 보이게 판 하나를 미리 만들어 둔다(움직이지 않음)
  g = Cx.create(T, seedArg()); g.state = "title";
  requestAnimationFrame(t => { last = t; frame(t); });
  fetchTop(GAME_KEY).then(rows => paintHi(rows?.[0]));
  if (/t=|stress|autostart/.test(hash)) start();
}
