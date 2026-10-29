// @ts-nocheck — 화면 몫. 디자인 시안 docs/lab-home-mock.html(23f75a43) 의 <script type="module"> 몸을 그대로 옮겼다(바꾼 줄은 「(이식)」 주석).
// 바꾼 것(「(이식)」 주석): window.LabHome·Surv3D·Home3D → import, 소리 켬/끔을 실험실 공통 기억으로, 지도 단추, 랭킹(구역을 한 번에 끝까지 간 판),
// 지도에서 다음 판이 아닌 판을 고르면 이어 하기 끊기(시안은 깬 판을 다시 해도 합계에 두 번 더해졌다). 리그 자리 window.__home(feed 포함)은 남긴다.
// 🔴 코코는 Dean 집 강아지다. 모델은 참고 사진의 생김새만 따랐고, 사진·사람·집 안은 어디에도 없다.
import * as THREE from "three";
import * as H from "./engine.ts";
import "./zone1.ts";
import "../survivors/coco3d-models.js";
import "./home3d.js";
import { isSoundOn, setSoundOn } from "@/lab/sound";
import { fetchTop, submitScore, cleanNameSay, type ScoreRow } from "@/lab/arcade-rank";

export function initHome() {
  const W: any = window;
  const E: any = H, TU = E.TUNE, ZONE = E.ZONES[0];
  const hash = location.hash;
  const REDUCE = /reduce/.test(hash) || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DEBUG = /debug/.test(hash);
  let MUTE = /mute/.test(hash) || !isSoundOn(); // 실험실 공통 소리 켬/끔(기기에 기억)을 따른다 — 시안은 #mute 만
  const $ = (id: string): any => document.getElementById(id);
  if (DEBUG) document.body.classList.add("debug");
  let g = null, running = false, stageId = null;
  W.__home = { frames: [], gaps: [], get g() { return g; }, inp: null, steps: 0, run: null };

  // ── 기록(이 기기 localStorage — 막혀도 판은 돈다) ──
  const KEY = "lab-home-v1";
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* 막힘 — 이번 판만 */ } }
  let REC = load(); REC.best = REC.best || {}; REC.open = REC.open || 1;

  // ── 3D 무대 ── 좌표: x = 칸(오른쪽), y = 칸(위), z = 깊이(카메라 쪽 +). 코코 길 z = 0
  const M = W.Surv3D.build(THREE);
  const ART = W.Home3D.build(THREE, M);
  const cv = $("cv");
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xbfe6ff);
  scene.fog = new THREE.Fog(0xbfe6ff, 40, 90);
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 260);
  const hemi = new THREE.HemisphereLight(0xfff4e3, 0x6a6f7c, 1.7);
  const sun = new THREE.DirectionalLight(0xfffbf4, 1.5);
  sun.position.set(-6, 14, 10);
  scene.add(hemi, sun);
  const world = new THREE.Group(); scene.add(world);
  let stageArt = null, enM = [], pkM = [], mvM = [], wvM = [];

  // 코코: 모델 길이를 1.15 칸에 맞춘다(엔진 몸 상자 0.9 × 0.85 보다 조금 크게 — 털이 상자 밖으로 삐져나와도 맞음 판정은 상자)
  const coco = M.makeCoco("harness");
  const cocoHold = new THREE.Group(); cocoHold.add(coco.root); scene.add(cocoHold);
  { const bb = new THREE.Box3().setFromObject(coco.root), sz = bb.getSize(new THREE.Vector3()); coco.root.scale.setScalar(1.15 / Math.max(sz.x, sz.z)); }
  const blobMat = new THREE.MeshBasicMaterial({ map: M.blobTexture(), transparent: true, depthWrite: false, opacity: 0.6 });
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7).rotateX(-Math.PI / 2), blobMat); blob.renderOrder = 1; scene.add(blob);

  // 조각(먼지·반짝·별): 작은 정이십면체 묶음
  const PART_N = 200;
  const partMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ flatShading: true }), PART_N);
  partMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); partMesh.count = 0; partMesh.frustumCulled = false; scene.add(partMesh);
  const parts = [];
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
  function burst(x, y, n, color, sp, up, life, size) {
    if (REDUCE) n = Math.ceil(n / 3);
    for (let i = 0; i < n && parts.length < PART_N; i++) { const a = Math.random() * Math.PI * 2; parts.push({ x, y, z: 0.6, vx: Math.cos(a) * sp * Math.random(), vy: up + Math.sin(a) * sp * Math.random(), t: 0, life: life * (0.7 + Math.random() * 0.6), c: color, s: size }); }
  }
  function drawParts(dt) {
    let n = 0;
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t += dt; if (q.t > q.life) { parts.splice(i, 1); continue; } q.vy -= 12 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    for (const q of parts) { const k = 1 - q.t / q.life; _p.set(q.x, q.y, q.z); _s.setScalar(q.s * (0.4 + 0.6 * k)); partMesh.setMatrixAt(n, _m.compose(_p, _q.identity(), _s)); partMesh.setColorAt(n, _c.set(q.c)); n++; }
    partMesh.count = n; partMesh.instanceMatrix.needsUpdate = true; if (partMesh.instanceColor) partMesh.instanceColor.needsUpdate = true;
  }

  // ── 카메라(시험 판과 같은 규칙): 보이는 폭 세로 9 칸 · 아이패드 세로 13 · 가로 16(큰 가로 18), 디딘 땅은 세로 68 % · 가로 56 % ──
  const CAM = { x: 0, y: 2, gy: 0, look: 0, width: 9, hView: 14, frac: 0.68 };
  function fit() {
    const land = innerWidth > innerHeight;
    document.body.classList.toggle("land", land);
    const cap = +(hash.match(/dprcap=(\d)/) || [])[1] || 2;
    const DPR = Math.min(cap, devicePixelRatio || 1);
    const w = $("view").clientWidth || 360, h = $("view").clientHeight || 400;
    renderer.setPixelRatio(DPR); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    CAM.width = land ? (w >= 1000 ? 18 : 16) : w >= 760 ? 13 : 9;
    if (g && g.L.boss) CAM.width = Math.max(CAM.width, land ? 20 : 13); // 보스 판은 공터가 더 보이게(대왕 돌진을 미리 본다)
    CAM.dist = CAM.width / (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
    CAM.hView = 2 * CAM.dist * Math.tan((camera.fov * Math.PI) / 360);
    CAM.frac = land ? 0.56 : 0.68;
  }
  addEventListener("resize", fit);

  // ── 입력(시험 판과 같다) ──
  const inp = { x: 0, down: false, jump: false, jumpTap: 0, skillTap: 0 };
  W.__home.inp = inp;
  const keys = new Set();
  let mvPtr = null, mvX = 0;
  const mv = $("mv");
  function mvAt(e) {
    const r = mv.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2);
    mvX = Math.abs(dx) < 8 ? 0 : Math.sign(dx);
    $("mvL").classList.toggle("on", mvX < 0); $("mvR").classList.toggle("on", mvX > 0);
  }
  mv.addEventListener("pointerdown", (e) => { e.preventDefault(); mvPtr = e.pointerId; mv.setPointerCapture(e.pointerId); mvAt(e); audioOn(); });
  mv.addEventListener("pointermove", (e) => { if (e.pointerId === mvPtr) mvAt(e); });
  const mvEnd = (e) => { if (e.pointerId !== mvPtr) return; mvPtr = null; mvX = 0; $("mvL").classList.remove("on"); $("mvR").classList.remove("on"); };
  mv.addEventListener("pointerup", mvEnd); mv.addEventListener("pointercancel", mvEnd); mv.addEventListener("lostpointercapture", mvEnd);
  function holdBtn(el, onDown, onUp) {
    const ids = new Set();
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); ids.add(e.pointerId); el.setPointerCapture(e.pointerId); el.classList.add("on"); onDown(); audioOn(); });
    const up = (e) => { if (!ids.delete(e.pointerId)) return; if (!ids.size) { el.classList.remove("on"); onUp(); } };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); el.addEventListener("lostpointercapture", up);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }
  let jumpBtn = false;
  holdBtn($("bj"), () => { jumpBtn = true; inp.jumpTap++; }, () => (jumpBtn = false));
  holdBtn($("bs"), () => inp.skillTap++, () => {});
  const JUMP_K = ["Space", "KeyZ", "ArrowUp", "KeyW", "KeyK"], SKILL_K = ["KeyX", "ShiftLeft", "ShiftRight", "KeyJ"];
  addEventListener("keydown", (e) => {
    if (e.repeat) { if (JUMP_K.includes(e.code) || e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault(); return; }
    keys.add(e.code);
    if (JUMP_K.includes(e.code)) inp.jumpTap++;
    if (SKILL_K.includes(e.code)) inp.skillTap++;
    if (e.code === "KeyR" && running) startStage(stageId);
    if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
    audioOn();
  });
  addEventListener("keyup", (e) => keys.delete(e.code));
  addEventListener("blur", () => { keys.clear(); jumpBtn = false; mvX = 0; });
  function readInput() {
    const kx = (keys.has("ArrowRight") || keys.has("KeyD") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("KeyA") ? 1 : 0);
    inp.x = kx || mvX;
    inp.down = keys.has("ArrowDown") || keys.has("KeyS");
    inp.jump = jumpBtn || JUMP_K.some((k) => keys.has(k));
  }

  // ── 소리(짧은 삑 — 파일 없음) ──
  let AC = null;
  function audioOn() { if (AC || MUTE) return; try { AC = new (W.AudioContext || W.webkitAudioContext)(); } catch (e) { AC = null; } }
  function beep(f0, f1, dur, type, vol, delay) {
    if (!AC || MUTE) return;
    const t = AC.currentTime + (delay || 0), o = AC.createOscillator(), gn = AC.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    gn.gain.setValueAtTime(vol || 0.06, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn).connect(AC.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const SFX = {
    jump: () => beep(420, 760, 0.12, "square", 0.045), land: () => beep(160, 90, 0.06, "triangle", 0.05),
    scoot: () => beep(300, 180, 0.22, "sawtooth", 0.03), spin: () => beep(500, 1100, 0.2, "triangle", 0.05),
    kill: () => beep(700, 1400, 0.1, "square", 0.04), pick: () => beep(880, 1320, 0.08, "triangle", 0.05),
    heart: () => beep(660, 990, 0.25, "sine", 0.07), hurt: () => beep(300, 120, 0.22, "sine", 0.07),
    pit: () => beep(500, 80, 0.4, "sine", 0.06), cp: () => beep(520, 780, 0.18, "triangle", 0.05), clear: () => { beep(520, 780, 0.16, "triangle", 0.06); beep(780, 1040, 0.3, "triangle", 0.06, 0.16); },
    bark: () => { beep(520, 300, 0.08, "square", 0.04); beep(520, 300, 0.08, "square", 0.04, 0.12); }, bell: () => { beep(1500, 1450, 0.09, "sine", 0.05); beep(1500, 1450, 0.09, "sine", 0.05, 0.14); },
    bonk: () => beep(240, 480, 0.1, "triangle", 0.05), pop: () => beep(900, 1600, 0.06, "sine", 0.04), boss: () => beep(120, 60, 0.5, "sawtooth", 0.05), bossHit: () => beep(300, 900, 0.18, "square", 0.06),
  };

  // ── HUD ──
  const HEART = '<svg viewBox="0 0 20 18"><path d="M10 17 C2 11 0 7 2.5 3.6 C4.8 .8 8.4 1.6 10 4.4 C11.6 1.6 15.2 .8 17.5 3.6 C20 7 18 11 10 17Z" fill="#f07a8a" stroke="#a8344a" stroke-width="1.2"/></svg>';
  let hudKey = "";
  function hud() {
    const p = g.p, k = p.hearts + "|" + g.bones + "|" + g.score;
    if (k !== hudKey) {
      hudKey = k;
      $("hearts").innerHTML = Array.from({ length: TU.HEARTS }, (_, i) => HEART.replace("<svg", '<svg class="' + (i < p.hearts ? "" : "off") + '"')).join("");
      $("bones").textContent = g.L.boss ? "–" : g.bones + "/3"; $("score").textContent = (W.__home.run ? W.__home.run.score : 0) + g.score;
    }
    $("time").textContent = g.t.toFixed(1);
    if (g.L.boss) { const b = g.en.find((e) => e.kind === "vacuum_king"); $("bosshp").style.width = Math.max(0, b.hp / E.BOSS.HP) * 100 + "%"; }
  }
  let toastT = 0, signT = 0;
  function toast(s, dur) { $("toast").textContent = s; $("toast").classList.add("on"); toastT = dur || 1.1; }
  function sign(s) { $("sign").textContent = s; $("sign").classList.add("on"); signT = 3.4; }

  // ── 판 짓기 ──
  function build(id) {
    stageId = id;
    g = E.create(id);
    const th = ART.theme(g.L.theme || "gray");
    scene.background.set(th.sky); scene.fog.color.set(th.sky); hemi.groundColor.set(th.hemiGround);
    world.clear(); [...enM, ...pkM, ...mvM, ...wvM].forEach((o) => o && (o.root || o).parent && (o.root || o).parent.remove(o.root || o));
    enM = []; pkM = []; mvM = []; wvM = [];
    stageArt = ART.buildStage(g.L, world);
    pkM = g.pk.map((k) => { const m = ART.makePick(k.kind); world.add(m); return m; });
    mvM = g.mv.map((m) => { const o = ART.makeMover(m.w); world.add(o); return o; });
    syncEnemies();
    document.body.classList.toggle("bossfight", !!g.L.boss);
    fit();
    CAM.x = g.p.x + 2; CAM.gy = g.p.y; CAM.y = g.p.y + (CAM.frac - 0.5) * CAM.hView; CAM.look = 2; parts.length = 0; hudKey = ""; prev = { x: g.p.x, y: g.p.y };
    hud();
  }
  // 생성기가 낸 적은 그때그때 모델을 만든다
  function syncEnemies() { while (enM.length < g.en.length) { const e = g.en[enM.length], o = ART.makeEnemy(e.kind); o.flee = 0; world.add(o.root); enM.push(o); } }
  function wave(i) { while (wvM.length <= i) { const o = ART.makeWave(); world.add(o); wvM.push(o); } return wvM[i]; }

  // ── 화면 흐름: 지도 → 이야기 → 판 → 끝 ──
  const idx = (id) => ZONE.stages.indexOf(id);
  function showMap() {
    running = false;
    ["ov-story", "ov-end"].forEach((k) => ($(k).hidden = true));
    const box = $("stages"); box.innerHTML = "";
    ZONE.stages.forEach((id, i) => {
      const L = E.LEVELS[id], b = REC.best[id], open = i < REC.open;
      const el = document.createElement("button"); el.className = "stage"; el.disabled = !open; el.dataset.id = id;
      el.innerHTML = `<span class="no">${L.boss ? "👑" : id}</span><b>${L.name}</b><span class="rec">${b ? `⏱ ${b.t.toFixed(1)}초${L.boss ? "" : ` · 🦴 ${b.bones}/3`}` : open ? "" : "🔒"}</span>`;
      el.addEventListener("click", () => openStory(id, i === 0));
      box.appendChild(el);
    });
    $("ov-title").hidden = false;
  }
  function openStory(id, fresh) {
    audioOn();
    if (fresh || !W.__home.run) W.__home.run = { from: id, score: 0, time: 0, chain: id === ZONE.stages[0], expect: id }; // 1-1 부터 이어서 끝까지 가면 구역 점수(랭킹용)
    else if (W.__home.run.expect !== id) W.__home.run.chain = false; // (이식) 지도에서 다음 판이 아닌 판을 고르면 이어 하기가 끊긴다 — 시안은 깬 판을 다시 해도 합계에 두 번 더해졌다
    build(id);
    $("ov-title").hidden = true; $("ov-end").hidden = true; // 끝 카드를 닫는다(안 닫으면 「다음」 뒤 이야기 카드가 끝 카드 밑에 깔렸다 — 리그가 잡음)
    $("story-h").textContent = `${E.LEVELS[id].boss ? "보스" : id} · ${E.LEVELS[id].name}`;
    $("story-p").textContent = E.LEVELS[id].story || "";
    $("ov-story").hidden = false;
  }
  function startStage(id) {
    if (id !== stageId || g.state !== "play" || g.t > 0) build(id);
    ["ov-title", "ov-story", "ov-end"].forEach((k) => ($(k).hidden = true));
    running = true; acc = 0;
  }
  $("story-go").addEventListener("click", () => startStage(stageId));
  $("end-map").addEventListener("click", showMap);
  // (이식) 놀이 중 지도 단추: 이번 판을 그만두고 지도로 — 이어 하기는 끊긴다
  $("menuBtn").addEventListener("click", () => { if (W.__home.run && running) W.__home.run.chain = false; showMap(); });
  // (이식) 소리 켬/끔 — 실험실 공통 기억(@/lab/sound)
  const sndSync = () => { $("snd").textContent = MUTE ? "소리 끔" : "소리 켬"; $("snd").setAttribute("aria-pressed", String(!MUTE)); };
  $("snd").addEventListener("click", () => { MUTE = !MUTE; setSoundOn(!MUTE); if (!MUTE) audioOn(); sndSync(); });
  sndSync();

  // ── (이식) 랭킹: 1-1 부터 보스까지 실패 없이 이어 깬 판만(규격 11절) — /api/rank/home, 이름 9자·한마디 20자(서버가 다시 거른다) ──
  const RANK = "home";
  const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function iniHint(t: string) {
    let h = document.getElementById("iniHint");
    if (!h) { h = document.createElement("small"); h.id = "iniHint"; h.className = "ini-hint"; h.setAttribute("aria-live", "polite"); $("ini").insertAdjacentElement("afterend", h); }
    h.textContent = t; h.hidden = !t;
  }
  $("ini").addEventListener("input", () => { if ($("ini").value.trim()) iniHint(""); });
  function rankEntry(score: number, time: number) {
    $("ini").value = ""; $("sayIn").value = ""; iniHint(""); $("enter").disabled = false;
    $("entry").hidden = false;
    $("enter").onclick = async () => {
      const { name, say: line } = cleanNameSay($("ini").value, $("sayIn").value);
      if (!name) { iniHint("이름을 넣어 주세요"); $("ini").focus(); return; }
      $("enter").disabled = true;
      const got = await submitScore(RANK, { name, score, say: line, sec: Math.round(time * 10) / 10 });
      showBoard(got ?? (await fetchTop(RANK)) ?? [], got ? { name, score, say: line } : null, !got);
    };
  }
  function showBoard(rows: ScoreRow[], me: { name: string; score: number; say: string } | null, failed: boolean) {
    $("entry").hidden = true;
    const meAt = me ? rows.findIndex((r) => r.name === me.name && r.score === me.score && r.say === me.say) : -1;
    $("board").innerHTML = (failed ? `<p>지금은 등록이 안 돼요</p>` : "") + (rows.length
      ? `<table class="rank"><colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5"></colgroup>
        <thead><tr><th>#</th><th>이름</th><th>점수</th><th>한마디</th><th>날짜</th></tr></thead><tbody>
        ${rows.map((r, i) => `<tr class="${i === meAt ? "me" : ""}"><td class="n">${i + 1}</td><td class="n">${esc(r.name)}</td><td class="n">${r.score}</td><td>${esc(r.say || "—")}</td><td class="n">${esc(r.date)}</td></tr>`).join("")}
        </tbody></table>`
      : `<p>아직 기록이 없어요</p>`);
    $("board").hidden = false;
    paintHi(rows[0]);
  }
  function paintHi(top?: ScoreRow) { $("hi").hidden = !top; if (top) $("hi").textContent = `구역 1 최고 ${top.name} 🍪 ${top.score}`; }
  fetchTop(RANK).then((rows) => paintHi(rows?.[0]));
  $("end-next").addEventListener("click", () => {
    if (g.state === "fail") return startStage(stageId);
    const nx = g.L.next;
    if (nx) openStory(nx, false); else showMap();
  });
  function end(kind) {
    running = false;
    $("entry").hidden = true; $("board").hidden = true;
    const L = g.L, run = W.__home.run;
    if (kind === "clear") {
      const b = REC.best[L.id], rec = { t: g.t, score: g.score, bones: Math.max(g.bones, b ? b.bones : 0) };
      const newBest = !b || g.t < b.t;
      REC.best[L.id] = { t: newBest ? g.t : b.t, score: Math.max(g.score, b ? b.score : 0), bones: rec.bones };
      REC.open = Math.max(REC.open, idx(L.id) + 2); save(REC);
      if (run) { run.score += g.score; run.time += g.t; run.expect = L.next || null; }
      const last = !L.next;
      $("end-h").innerHTML = (L.boss ? "대왕을 이겼어요!" : "도착!") + (newBest ? '<span class="new">최고 기록</span>' : "");
      $("end-p").textContent = last ? "킁킁… 집 냄새가 나요! 다음 동네는 곧 열려요." : L.boss ? "" : "다음 길로 가요!";
      $("end-s").innerHTML = `<span>⏱ ${g.t.toFixed(1)}초</span><span>🍪 ${g.score}</span>${L.boss ? "" : `<span>🦴 ${g.bones}/3</span>`}`;
      $("end-next").textContent = last ? "동네 지도" : "다음";
      $("end-map").hidden = last; // 마지막 판은 「다음」 이 곧 지도 — 같은 단추 둘이 나란히 떴다(화면 보고 고침)
      if (last && run && run.chain) {
        // 구역 끝(1-1 부터 쉬지 않고): 랭킹 연결 자리 — tw 가 지금 랭킹(이름 9자)에 잇는다. 시안은 알림만 낸다
        W.__home.zoneClear = { zone: ZONE.id, score: run.score, time: +run.time.toFixed(2) };
        dispatchEvent(new CustomEvent("home:zoneclear", { detail: W.__home.zoneClear }));
        $("end-s").innerHTML += `<span>구역 합계 🍪 ${run.score}</span>`;
        rankEntry(run.score, run.time);
      }
    } else {
      $("end-h").textContent = "코코가 조금 지쳤어요";
      $("end-p").textContent = "물 한 모금 마시고 이 길 처음부터 다시 가요.";
      $("end-s").innerHTML = `<span>⏱ ${g.t.toFixed(1)}초</span><span>🍪 ${g.score}</span>`;
      $("end-next").textContent = "다시"; $("end-map").hidden = false;
      if (run) run.chain = false; // 다시 하면 구역 합계는 안 센다(랭킹은 한 번에 끝까지)
    }
    setTimeout(() => { $("ov-end").hidden = false; }, kind === "clear" ? 900 : 900);
  }

  // ── 사건 → 연출 ──
  const DUST = "#ecd3a6";
  let squash = 0, shake = 0;
  function onEvents(ev) {
    const p = g.p;
    for (const e of ev) {
      switch (e.type) {
        case "jump": SFX.jump(); burst(p.x, p.y, 5, DUST, 2, 0.5, 0.35, 0.09); if (DEBUG && e.coyote) toast("발판 끝 여유 점프", 0.7); break;
        case "land": SFX.land(); burst(p.x, p.y, e.airT > 0.4 ? 8 : 4, DUST, 2.4, 0.6, 0.35, 0.09); squash = e.airT > 0.4 ? 1 : 0.6; break;
        case "scoot": SFX.scoot(); break;
        case "spin": SFX.spin(); burst(p.x, p.y + 0.4, 8, "#7fe0d4", 3, 1, 0.4, 0.08); break;
        case "kill": {
          const en = g.en[e.id];
          if (en.kind === "yapper") { enM[e.id].flee = 1; SFX.bonk(); toast("깜짝! 도망갔어요", 0.9); break; } // 다른 강아지는 쓰러뜨리지 않는다 — 놀라 도망
          SFX.kill(); burst(en.x, en.y + 0.4, 12, en.kind === "bubble" ? "#e8f4fb" : "#ffd36b", 4, 2, 0.5, 0.1); shake = 0.12; break;
        }
        case "bonk": SFX.bonk(); { const en = g.en[e.id]; burst(en.x, en.y + 1, 5, "#fff0b8", 2, 1, 0.3, 0.07); } break;
        case "pick": if (e.kind === "heart") { SFX.heart(); toast("하트 +1"); } else SFX.pick(); { const k = g.pk[e.id]; burst(k.x, k.y, e.kind === "snack" ? 4 : 10, e.kind === "heart" ? "#f07a8a" : "#fff0b8", 2.5, 1.5, 0.4, 0.08); } if (e.kind === "bone") toast(`뼈다귀 ${g.bones}/3`, 0.9); break;
        case "hurt": SFX.hurt(); shake = 0.25; break;
        case "pit": SFX.pit(); $("fade").classList.add("on"); setTimeout(() => $("fade").classList.remove("on"), 220); break;
        case "cp": SFX.cp(); toast("여기서부터 다시!", 1); stageArt && stageArt.cp && stageArt.cp.set(true); break;
        case "sign": sign(e.text); break;
        case "bark": SFX.bark(); break;
        case "bell": SFX.bell(); toast("따릉따릉!", 0.8); break;
        case "pop": SFX.pop(); burst(e.x, 0.8, 5, "#fff4e3", 2, 1, 0.3, 0.06); break;
        case "break": { const en = g.en[e.id]; burst(en.x, en.y + 0.4, 8, "#d9b27f", 3, 2, 0.5, 0.09); } break;
        case "boss_go": SFX.boss(); break;
        case "boss_wind": SFX.boss(); break;
        case "boss_bump": shake = 0.35; toast("어지러워! 지금 밟아요", 1.2); break;
        case "boss_hit": SFX.bossHit(); shake = 0.2; { const b = g.en.find((x) => x.kind === "vacuum_king"); burst(b.x, 1.4, 14, "#ffd36b", 4, 3, 0.6, 0.1); } break;
        case "boss_down": toast("대왕이 멈췄어요!", 1.6); break;
        case "clear": SFX.clear(); burst(p.x, p.y + 1, 24, "#ffd36b", 5, 3, 0.9, 0.11); end("clear"); break;
        case "fail": end("fail"); break;
      }
    }
  }

  // ── 그리기 ──
  let poseName = "sit", poseAt = 0, faceY = Math.PI / 2, spinA = 0, prev = { x: 0, y: 0 };
  function groundBelow(x, y) {
    let best = -99;
    for (const s of g.L.solids) if (x > s[0] && x < s[0] + s[2] && s[1] + s[3] <= y + 0.05) best = Math.max(best, s[1] + s[3]);
    for (const s of g.L.semis) if (x > s[0] && x < s[0] + s[2] && s[1] <= y + 0.05) best = Math.max(best, s[1]);
    for (const m of g.mv) if (x > m.x && x < m.x + m.w && m.y <= y + 0.05) best = Math.max(best, m.y);
    return best;
  }
  function draw(t, dt, alpha) {
    const p = g.p;
    const px = prev.x + (p.x - prev.x) * alpha, py = prev.y + (p.y - prev.y) * alpha;
    CAM.look += ((p.face > 0 ? 2.2 : -2.2) - CAM.look) * Math.min(1, dt * 2.5);
    CAM.x += (px + CAM.look - CAM.x) * Math.min(1, dt * 6);
    if (p.ground || py < CAM.gy) CAM.gy = py; // 디딘 땅 높이(공중에선 내려갈 때만 따라간다)
    const wantY = Math.max(CAM.gy, py - 3.2) + (CAM.frac - 0.5) * CAM.hView;
    CAM.y += (wantY - CAM.y) * Math.min(1, dt * (p.ground ? 3 : 2));
    CAM.x = Math.max(-3 + CAM.width / 2 - 0.5, Math.min(g.L.w + 1 - CAM.width / 2, CAM.x));
    let sx = 0, sy = 0;
    if (shake > 0 && !REDUCE) { sx = (Math.random() - 0.5) * shake * 0.6; sy = (Math.random() - 0.5) * shake * 0.6; }
    shake = Math.max(0, shake - dt);
    const el = (8 * Math.PI) / 180;
    camera.position.set(CAM.x + sx, CAM.y + sy + Math.sin(el) * CAM.dist, Math.cos(el) * CAM.dist);
    camera.lookAt(CAM.x + sx, CAM.y + sy, 0);
    // 코코
    const want = E.pose(g);
    if (want !== poseName) { poseName = want; poseAt = t; }
    const targetY = p.face > 0 ? Math.PI / 2 : -Math.PI / 2;
    faceY += (targetY - faceY) * Math.min(1, dt * 18);
    let name = poseName, tilt = 0, sp = Math.abs(p.vx) / TU.RUN;
    if (name === "rise") { name = "walk"; tilt = 0.22; sp = 0.25; }
    if (name === "fall") { name = "walk"; tilt = -0.18; sp = 0.25; }
    if (name === "nap") name = "sit"; // 지쳐도 쓰러지지 않고 앉아 쉰다
    if (name === "spin") spinA += dt * Math.PI * 2 * (REDUCE ? 1.2 : 3); else spinA = 0;
    coco.root.rotation.y = faceY + spinA;
    coco.pose(t, name, t - poseAt, { speed: sp, hurt: p.iframe > TU.HURT_IFRAME - 0.25 ? 1 : 0, reduce: REDUCE });
    squash = Math.max(0, squash - dt * 6);
    cocoHold.position.set(px, py, 0);
    cocoHold.rotation.z = tilt * Math.sign(Math.sin(faceY) || 1);
    cocoHold.scale.set(1 + 0.12 * squash, 1 - 0.16 * squash, 1 + 0.12 * squash);
    cocoHold.visible = p.iframe <= 0 || REDUCE || Math.floor(t * 14) % 2 === 0 || g.state !== "play";
    const gb = groundBelow(px, py), hAbove = py - gb;
    blob.visible = gb > -50; blob.position.set(px, gb + 0.02, 0.2);
    const bs = Math.max(0.35, 1 - hAbove * 0.18); blob.scale.set(bs, 1, bs); blobMat.opacity = 0.6 * bs;
    // 발판 · 적 · 파동 · 먹을 것
    g.mv.forEach((m, i) => mvM[i].position.set(m.x, m.y, 0));
    syncEnemies();
    g.en.forEach((e, i) => {
      const o = enM[i];
      if (e.gone) { o.root.visible = false; return; }
      if (e.dead) {
        if (o.flee > 0) { o.flee += dt; o.root.position.x += dt * 9; o.root.position.y = Math.abs(Math.sin(o.flee * 14)) * 0.3; o.root.rotation.y = Math.PI / 2; if (o.flee > 1.6) o.root.visible = false; return; } // 놀라 도망(오른쪽으로 깡총깡총)
        if (e.kind === "vacuum_king") { o.update(e, t, dt, REDUCE); return; }
        if (o.root.visible) { o.root.scale.multiplyScalar(0.8); if (o.root.scale.x < 0.1) o.root.visible = false; }
        return;
      }
      o.root.position.set(e.x, e.y, 0);
      o.update(e, t, dt, REDUCE);
    });
    let wn = 0;
    for (const w of g.pr) { if (w.gone) continue; const o = wave(wn++); o.visible = true; o.position.set(w.x, w.y, 0); o.scale.x = Math.sign(w.vx) || 1; }
    for (let i = wn; i < wvM.length; i++) wvM[i].visible = false;
    g.pk.forEach((k, i) => { const m = pkM[i]; m.visible = !k.got; if (!k.got) { m.position.set(k.x, k.y + (REDUCE ? 0 : 0.08 * Math.sin(t * 3 + i)), 0); m.rotation.y = REDUCE ? 0 : t * 2; } });
    drawParts(dt);
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $("toast").classList.remove("on"); }
    if (signT > 0) { signT -= dt; if (signT <= 0) $("sign").classList.remove("on"); }
    if (DEBUG) {
      const b = E.pbox(p);
      $("dbg").textContent = `${stageId} x ${p.x.toFixed(2)} y ${p.y.toFixed(2)}\nvx ${p.vx.toFixed(1)} vy ${p.vy.toFixed(1)}\n땅 ${p.ground ? "예" : "아니오"} 여유 ${(p.coyote * 60).toFixed(0)} 기억 ${(p.buffer * 60).toFixed(0)}\n상자 ${b[2]}×${b[3]} ${poseName}\n삼각형 ${renderer.info.render.triangles} 호출 ${renderer.info.render.calls}`;
    }
    renderer.render(scene, camera);
    W.__home.gpu = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
  }

  // ── 고리 ──
  let acc = 0, last = performance.now(), t0 = last;
  function frame(now) {
    const f0 = performance.now();
    const gp = W.__home.gaps; gp.push(now - last); if (gp.length > 600) gp.shift();
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const t = (now - t0) / 1000;
    if (running) {
      readInput();
      acc += dt;
      while (acc >= TU.DT && running) {
        prev = { x: g.p.x, y: g.p.y };
        const fd = W.__home.feed; // 리그 전용: 봇 누름 목록을 걸음마다 하나씩(실제 손 입력 대신 — 손 입력 길은 시험 판 리그가 잰다)
        const a = fd && fd.length ? fd.shift() : null;
        const ev = E.step(g, a ? { x: a[0], jump: !!a[1], jumpTap: !!a[2], skillTap: !!a[3] } : { x: inp.x, down: inp.down, jump: inp.jump, jumpTap: inp.jumpTap > 0, skillTap: inp.skillTap > 0 });
        inp.jumpTap = 0; inp.skillTap = 0; // 누름은 한 걸음에만 넘긴다(그 뒤는 엔진의 기억이 맡는다)
        W.__home.steps++;
        onEvents(ev);
        acc -= TU.DT;
        if (ev.some((e) => e.type === "pit")) prev = { x: g.p.x, y: g.p.y };
      }
      hud();
    }
    draw(t, dt, running ? acc / TU.DT : 1);
    const fr = W.__home.frames; fr.push(performance.now() - f0); if (fr.length > 600) fr.shift();
    requestAnimationFrame(frame);
  }
  // 주소 끝 #stage=1-2 → 그 판을 바로 연다(리그·판정용, 잠금 무시)
  const want = (hash.match(/stage=([\w-]+)/) || [])[1];
  build(want && E.LEVELS[want] ? want : ZONE.stages[0]);
  if (want && E.LEVELS[want]) { REC.open = Math.max(REC.open, idx(want) + 1); openStory(want, true); } else showMap();
  requestAnimationFrame(frame);
  W.__home.startStage = startStage; W.__home.openStory = openStory; W.__home.showMap = showMap;
}
