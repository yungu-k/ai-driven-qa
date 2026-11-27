/* 실험실 작품 — 불꽃놀이 도트 아트(밤하늘·도시·불꽃 11종, 글자 없음).
   다른 저장소에 11-26 만든 이스터에그(2판)의 장면(makeScene)을 그대로 옮기고, 실험실 작품 계약(mount)으로 감쌌다.
   계약·흐름: docs/lab-pixel-brief.md 「작품 모듈 계약」 · 검사: tmp/lab-pixel/fireworks-rig.cjs(원본과 같은 씨앗으로 돌려 알갱이·픽셀 대조)

   - 도트 느낌: 가로 약 640칸 캔버스를 확대 때 보간 없이(image-rendering: pixelated) 키운다. 칸 하나 = 화면 PX 픽셀.
   - 사실감:
     · 불꽃 알갱이는 픽셀 버퍼에 **더해서** 그린다 — 겹치면 하얗게 타오르고, 매 프레임 조금씩 어두워져 잔상 꼬리가 남는다.
     · 알갱이 색은 「흰빛 → 제 색 → 주황 잔불 → 꺼짐」 순서로 식는다.
     · 번짐(bloom)은 절반 크기 캔버스를 CSS 로 흐리게 해 screen 으로 겹친다 — 계산 없이 GPU 가 한다.
     · 터질 때 하늘·건물 벽이 그 색으로 잠깐 밝아지고, 옅은 연기가 남아 다음 불꽃에 비친다.
     · 프레임이 느리면 알갱이 수를 줄이고 번짐을 끈다(root.dataset.q = "low").
   - 순서표 셋(장면 안 mode):
     · loop  = 원본 한 바퀴 24초 그대로(여는 세 발 → 큰 색 바뀜 한 발 → 이어 쏘기 → 마무리, 그리고 처음부터).
     · intro = 같은 불꽃, 이어 쏘기만 INTRO_PULL 초 줄여 마무리의 마지막 큰 한 발이 ≈20 s 에 퍼진다(그때 onIntroEnd). 그 뒤 quiet.
     · quiet = 갤러리 뒤: 한 발씩 1.2–2.5 s 간격, 두세 발 동시·마무리 없음.
   - 원본에서 뺀 것: 로고 꾹 누르기·로고 불빛·덮개·누르면 닫힘(작품 페이지가 맡는다).
   - 밀도(opts.cols, 11-27 2판): 화면 가로를 cols 칸으로 — 칸 하나 = 기기 픽셀 정수배. cols 가 없으면 1판과 한 글자도 다르지 않게 돈다
     (검사 A 가 원본과 같은 씨앗으로 맞댄다). cols 가 있으면 kd = 1판 칸 ÷ 새 칸(선 길이 배율), D = kd²(넓이 배율)로:
     · 크기·속도는 1판 화면과 같게(S = 1판 S × kd) — 불꽃 크기는 그대로, 점만 잘아진다.
     · 고운 알갱이(국화·버드나무·링 …)와 로켓 꼬리는 D 배 — 칸 넓이당 빛의 양을 1판과 맞춘다(듬성해지지 않게).
     · 수가 정해진 굵은 별(야자 팔·크로세트)은 kd 칸 덩어리 + 꼬리 D 배, 연기는 1판 수(흐린 안개라 화면 크기만 맞추면 된다).
     · 별은 kd 배(D 배면 먼지처럼 보인다), 창문은 칸 간격 그대로라 저절로 D 배(층이 촘촘해진다), 경고등은 kd/2 칸.
     · 알갱이 상한 9000 × D. 품질 낮춤 장치는 1판 그대로(느리면 0.55·번짐 끔).
   - 서버 호출·외부 라이브러리 없음. 움직임 줄이기면 멈춘 한 장면만. */

export type FireworksMode = "loop" | "intro";

/** 소리용 신호(onEvent). x·y = 화면 비율 0–1, type = 불꽃 이름(11종, crackle 묶음은 "crackle") */
export interface FireworksEvent {
  kind: "launch" | "burst" | "crackle";
  x: number;
  y: number;
  big: boolean;
  type: string;
  /** burst = 그 한 발에서 나온 알갱이 수(상한에 걸리면 줄어든다) · crackle = 이 프레임에 동시에 터진 잔불 수 */
  n?: number;
}

export interface MountOptions {
  /** intro = 첫 화면 20초 쇼(끝에 onIntroEnd, 그 뒤 quiet). 기본 loop */
  mode?: FireworksMode;
  /** 기본 matchMedia("(prefers-reduced-motion: reduce)") */
  reduce?: boolean;
  /** intro 의 마지막 큰 한 발이 퍼지는 순간 한 번. 움직임 줄이기 + intro 면 mount 직후 한 번. 그 전에 setQuiet 를 부르면 안 온다 */
  onIntroEnd?: () => void;
  /** 화면 가로 칸 수(밀도). 칸 하나 = max(1, round(innerWidth·dpr / cols)) 기기 픽셀. 없으면 1판(PX = clamp(round(innerWidth/640), 2, 4) CSS px) */
  cols?: number;
  /** 로켓이 뜰 때 · 터질 때(onIntroEnd 와 같은 프레임) · 잔불이 터지는 프레임에 한 번. 움직임 줄이기의 멈춘 한 장에선 안 온다.
   *  rAF 프레임 안에서 곧바로 부른다(소리 시각 맞춤) — 던져도 고리는 이어 가고 오류는 따로 던진다 */
  onEvent?: (e: FireworksEvent) => void;
}

export interface FireworksHandle {
  /** rAF·리스너·캔버스 모두 정리(host 는 남긴다) */
  stop(): void;
  /** true = 갤러리 뒤(덜 바쁘게) · false = loop 순서표 처음부터 */
  setQuiet(on: boolean): void;
}

type RGB = [number, number, number];
type Ramp = RGB[];
type SceneMode = "loop" | "intro" | "quiet";

interface Part {
  x: number; y: number; vx: number; vy: number; life: number; max: number; ramp: Ramp; drag: number; g: number;
  trail?: number; glitter?: number; heavy?: boolean; split?: string; strobe?: number;
  shift?: string | null; crackle?: boolean; popped?: boolean;
  /** cols 판: 굵은 별 덩어리 한 변(칸) */
  sz?: number;
  /** cols 판: 꼬리 내는 빠르기 배율(수가 정해진 굵은 별 — 칸이 잘아진 만큼 꼬리를 더 낸다) */
  tm?: number;
  /** cols 판: 이 프레임 끝에 한꺼번에 뺀다(splice 를 알갱이마다 하면 수만 개에서 O(n²)) */
  dead?: boolean;
}
type PartOpts = Partial<Omit<Part, "x" | "y" | "vx" | "vy" | "life" | "max" | "ramp">>;

interface Rocket {
  x: number; y: number; vx: number; vy: number; g: number;
  type: string; pal: string[]; big: boolean; seed: number;
  /** intro 의 마지막 큰 한 발 — 터질 때 onIntroEnd */
  last?: boolean;
}
interface Smoke { x: number; y: number; vx: number; vy: number; r: number; life: number }
interface Flash { x: number; y: number; c: RGB; life: number }

export interface SceneHooks {
  mode?: FireworksMode;
  onIntroEnd?: () => void;
  cols?: number;
  onEvent?: (e: FireworksEvent) => void;
}

export interface Scene {
  step(t: number, dt: number, real?: number): void;
  draw(dt: number): void;
  still(): void;
  /** 칸 크기가 바뀌었으면 다시 짓고 true */
  resize(): boolean;
  setQuiet(on: boolean): void;
  /** 검사용(fireworks-rig.cjs): 살아 있는 상태 그대로 */
  state(): {
    parts: Part[]; rockets: Rocket[]; smoke: Smoke[]; flashes: Flash[]; Q: number; mode: SceneMode; shots: number; t: number;
    /** 칸 수·칸 하나의 CSS px·크기 배율·밀도 배율(선 kd, 넓이 D)·알갱이 상한 */
    W: number; H: number; PX: number; S: number; kd: number; D: number; cap: number;
  };
}

const CYCLE = 24; // 초 — 여는 세 발 → 큰 한 발 → 이어 쏘기 → 마무리, 그리고 처음부터
const LEAD = 0.9; // 첫 프레임에서 순서표 0 초까지(캔버스가 페이드인하는 동안)
const INTRO_PULL = 4.7; // intro: 이어 쏘기를 이만큼 줄인다 → 마지막 발사 17.8 s + LEAD + 오름 1.1–1.6 s ≈ 19.8–20.3 s 에 퍼짐
const QUIET_GAP: [number, number] = [1.2, 2.5];

// ---------------------------------------------------------------- 색
const PALETTES = [
  ["#ff4a4a", "#ffc94a"], ["#3f9dff", "#e6f3ff"], ["#46ff7e", "#d8ff5a"], ["#b35bff", "#ff7ad2"],
  ["#38fff0", "#7fa8ff"], ["#ff7a2e", "#fff0b0"], ["#ff4fa3", "#ffe1f0"], ["#3d71d9", "#ffffff"],
];
const GOLD = ["#ffc35a", "#ffa23a", "#ffe0a0"];

function rand(a: number, b: number): number { return a + Math.random() * (b - a); }
function pick<T>(a: readonly T[]): T { return a[(Math.random() * a.length) | 0] as T; }
function rgb(hex: string): RGB { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

// 알갱이가 식는 색 띠 — 남은 수명 비율 f(1 → 0)를 32칸으로: 흰빛 → 제 색 → 주황 잔불 → 꺼짐
const RAMPS: Record<string, Ramp> = {};
function ramp(hex: string): Ramp {
  const hit = RAMPS[hex];
  if (hit) return hit;
  const c = rgb(hex), out: Ramp = [];
  for (let i = 0; i < 32; i++) {
    const f = i / 31;
    let r: number, g: number, b: number, k: number;
    if (f > 0.82) { k = (f - 0.82) / 0.18 * 0.85; r = c[0] + (255 - c[0]) * k; g = c[1] + (255 - c[1]) * k; b = c[2] + (255 - c[2]) * k; }
    else if (f > 0.32) { r = c[0]; g = c[1]; b = c[2]; }
    else {
      k = (0.32 - f) / 0.32; // 0 → 1 로 갈수록 잔불
      const dim = Math.pow(f / 0.32, 0.8);
      r = (c[0] + (255 - c[0]) * k * 0.5) * dim; g = (c[1] + (110 - c[1]) * k * 0.7) * dim; b = (c[2] + (30 - c[2]) * k * 0.9) * dim;
    }
    out.push([r | 0, g | 0, b | 0]);
  }
  return (RAMPS[hex] = out);
}

// ---------------------------------------------------------------- 장면(원본 makeScene)
// 🔴 Math.random 을 부르는 순서까지 원본과 같아야 한다 — 검사가 같은 씨앗으로 원본과 알갱이 상태를 맞대 본다.
export function makeScene(cv: HTMLCanvasElement, bl: HTMLCanvasElement, ov: HTMLElement, hooks: SceneHooks = {}): Scene {
  const ctx = cv.getContext("2d") as CanvasRenderingContext2D, bctx = bl.getContext("2d") as CanvasRenderingContext2D;
  let PX = 0, W = 0, H = 0, S = 1, G = 20, groundY = 0;
  let sky!: HTMLCanvasElement, city!: HTMLCanvasElement, mask!: HTMLCanvasElement, lit!: HTMLCanvasElement, trail!: HTMLCanvasElement;
  let tctx!: CanvasRenderingContext2D, img!: ImageData, buf!: Uint8ClampedArray;
  let stars: [number, number, number, number, number][] = [], beacons: [number, number, number][] = [];
  let parts: Part[] = [], rockets: Rocket[] = [], smoke: Smoke[] = [], flashes: Flash[] = [];
  let cycle = -1, plan: number[] = [], planAt = 0, bigDone = false, finale: number[] = [];
  let Q = 1, ema = 16, slowFor = 0; // 품질(1 = 다, 0.55 = 줄임) · 프레임 시간 지수평균(ms)
  // 원본에 없는 것 — 순서표 고르기
  let mode: SceneMode = hooks.mode === "intro" ? "intro" : "loop";
  let base = 0, qAt = -1, tNow = 0, shots = 0, pendingEnd = false;
  // cols 판(밀도) — dense 가 아니면 kd = D = 1, cap = 9000 이라 1판 계산과 같은 수가 나온다
  const cols = hooks.cols, dense = typeof cols === "number" && cols > 0;
  let kd = 1, D = 1, S0 = 1, cap = 9000, buf32!: Uint32Array;
  // 소리 신호 — onEvent 가 없으면 아무것도 하지 않는다(난수·순서 그대로). 멈춘 한 장(still)을 만드는 동안은 끈다
  const onEvent = hooks.onEvent;
  let mute = false;
  function emit(e: FireworksEvent) {
    if (!onEvent || mute) return;
    try { onEvent(e); } catch (err) { setTimeout(() => { throw err; }); } // 받는 쪽 오류가 rAF 고리를 끊지 않게
  }

  function canvas(w: number, h: number): HTMLCanvasElement { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

  function resize(): boolean {
    const iw = window.innerWidth, ih = window.innerHeight;
    const px = Math.max(2, Math.min(4, Math.round(iw / 640)));
    let w: number, h: number, scale: number; // scale = 칸 하나의 CSS px
    if (dense) {
      const dpr = window.devicePixelRatio || 1, cell = Math.max(1, Math.round(iw * dpr / (cols as number))); // 칸 = 기기 픽셀 정수배
      w = Math.ceil(iw * dpr / cell); h = Math.ceil(ih * dpr / cell); scale = cell / dpr;
    } else {
      w = Math.ceil(iw / px); h = Math.ceil(ih / px); scale = px;
    }
    if (W && scale === PX && w === W && h === H) return false; // 칸이 그대로면 도시를 다시 뽑지 않는다(원본은 늘 다시 지었다)
    PX = scale; W = w; H = h;
    if (dense) {
      // 1판이 이 창에서 쓸 칸(px)과 S 를 구해, 화면에서 보이는 크기·속도를 1판과 같게 둔다
      S0 = Math.max(0.6, Math.min(Math.ceil(iw / px), Math.ceil(ih / px) * 1.8) / 320);
      kd = px / scale; D = kd * kd; S = S0 * kd; cap = Math.round(9000 * D);
    } else {
      S = Math.max(0.6, Math.min(W, H * 1.8) / 320); // 크기·속도 배율(가로 320칸 기준)
    }
    G = 20 * S;
    cv.width = W; cv.height = H;
    cv.style.width = W * PX + "px"; cv.style.height = H * PX + "px";
    bl.width = Math.ceil(W / 2); bl.height = Math.ceil(H / 2);
    bl.style.width = W * PX + "px"; bl.style.height = H * PX + "px";
    groundY = H - 1;
    trail = canvas(W, H); tctx = trail.getContext("2d") as CanvasRenderingContext2D;
    img = tctx.createImageData(W, H); buf = img.data; buf32 = new Uint32Array(buf.buffer);
    for (let i = 3; i < buf.length; i += 4) buf[i] = 255;
    buildSky(); buildCity(); buildStars();
    parts = []; rockets = []; smoke = []; flashes = [];
    if (pendingEnd) endIntro(); // 마지막 한 발이 날아가던 중 지워졌다 — 갤러리를 기다리게 두지 않는다
    return true;
  }

  function buildSky() {
    sky = canvas(W, H);
    const s = sky.getContext("2d") as CanvasRenderingContext2D, id = s.createImageData(W, H), d = id.data;
    const top = [3, 5, 16], mid = [10, 10, 34], bot = [36, 20, 54]; // 위 → 가운데 → 지평선(도시 불빛에 물든 보랏빛)
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bands = 14;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const f = Math.pow(y / H, 1.5) * (bands - 1) + (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5);
        const k = Math.max(0, Math.min(bands - 1, Math.round(f))) / (bands - 1);
        let a: number[], b: number[], t: number;
        if (k < 0.6) { a = top; b = mid; t = k / 0.6; } else { a = mid; b = bot; t = (k - 0.6) / 0.4; }
        const o = (y * W + x) * 4;
        d[o] = a[0] + (b[0] - a[0]) * t; d[o + 1] = a[1] + (b[1] - a[1]) * t; d[o + 2] = a[2] + (b[2] - a[2]) * t; d[o + 3] = 255;
      }
    }
    s.putImageData(id, 0, 0);
  }

  function buildCity() {
    city = canvas(W, H); mask = canvas(W, H); lit = canvas(W, H);
    const c = city.getContext("2d") as CanvasRenderingContext2D, m = mask.getContext("2d") as CanvasRenderingContext2D;
    let x = 0;
    const maxH = Math.max(12, H * 0.27);
    beacons = [];
    // 뒷줄(흐리고 낮다) → 앞줄
    ([[0.55, "#0b0e1c", 0.12], [1, "#06080f", 0.3]] as [number, string, number][]).forEach(function (row) {
      x = (rand(-6, 0) * S) | 0;
      while (x < W) {
        const bw = Math.max(4, (rand(7, 19) * S * 0.8) | 0), bh = (rand(maxH * 0.3, maxH) * row[0]) | 0, by = groundY - bh;
        c.fillStyle = row[1]; c.fillRect(x, by, bw, bh + 1);
        m.fillStyle = "#fff"; m.fillRect(x, by, bw, bh + 1);
        c.fillStyle = "rgba(120,130,170,.08)"; c.fillRect(x, by, 1, bh + 1); // 하늘빛 받는 모서리
        if (row[0] === 1 && bh > maxH * 0.7 && Math.random() < 0.5) {
          const ax = x + ((bw / 2) | 0), ah = Math.max(2, (3 * S) | 0);
          c.fillStyle = row[1]; c.fillRect(ax, by - ah, 1, ah);
          beacons.push([ax, by - ah - 1, Math.random() * 6]);
        }
        for (let wy = by + 2; wy < groundY - 1; wy += 3) {
          for (let wx = x + 2; wx < x + bw - 1; wx += 2) {
            if (Math.random() < row[2]) {
              c.fillStyle = Math.random() < 0.78 ? "rgba(255,206,120," + rand(0.25, 0.7).toFixed(2) + ")" : "rgba(160,205,255," + rand(0.2, 0.5).toFixed(2) + ")";
              c.fillRect(wx, wy, 1, 1);
            }
          }
        }
        x += bw + ((rand(0, 3) * S) | 0);
      }
    });
    c.fillStyle = "#04050a"; c.fillRect(0, groundY, W, 1);
  }

  function buildStars() {
    stars = [];
    const n = Math.round(W * H / (dense ? 420 * kd : 420)); // cols 판은 kd 배만(D 배면 먼지처럼 보인다)
    for (let i = 0; i < n; i++) {
      const y = Math.pow(Math.random(), 1.4) * H * 0.7;
      stars.push([(Math.random() * W) | 0, y | 0, Math.random() * 6.28, rand(0.5, 2.4), rand(0.25, 0.8)]);
    }
  }

  // ---- 알갱이
  function spark(x: number, y: number, vx: number, vy: number, life: number, hex: string, o?: PartOpts | null): Part | null {
    if (parts.length > cap) return null;
    const p: Part = { x: x, y: y, vx: vx, vy: vy, life: life, max: life, ramp: ramp(hex), drag: 1.3, g: 1 };
    if (o) Object.assign(p, o);
    parts.push(p);
    return p;
  }
  // 구 껍질에서 고른 방향 — 위에서 보면 가장자리가 짙고 가운데가 성긴 실제 국화 모양이 된다
  function sphere(s: number, fill?: boolean): [number, number] {
    const u = rand(-1, 1), th = rand(0, 6.283), rr = Math.sqrt(1 - u * u) * s * (fill ? Math.cbrt(Math.random()) : rand(0.93, 1.02));
    return [Math.cos(th) * rr, Math.sin(th) * rr];
  }

  function launch(type?: string, x?: number, big?: boolean): Rocket {
    const startY = groundY - 1;
    let apex = rand(H * 0.1, H * 0.42);
    if (big) apex = rand(H * 0.16, H * 0.26);
    const T = rand(1.1, 1.6), h = startY - apex; // 오르는 시간은 화면 높이와 상관없이 1.1~1.6초
    const r: Rocket = { x: x == null ? rand(W * 0.1, W * 0.9) : x, y: startY, vx: rand(-4, 4) * S, vy: -2 * h / T, g: 2 * h / (T * T),
      type: type || pick(["peony", "peony", "pistil", "chrys", "ring", "double", "willow", "palm", "crossette", "strobe", "crackle", "shift", "shift"]),
      pal: pick(PALETTES), big: !!big, seed: Math.random() * 6 };
    rockets.push(r);
    shots++;
    if (onEvent) emit({ kind: "launch", x: r.x / W, y: r.y / H, big: r.big, type: r.type });
    return r;
  }

  function burst(r: Rocket) {
    const n0 = parts.length;
    burstParts(r);
    if (onEvent) emit({ kind: "burst", x: r.x / W, y: r.y / H, big: r.big, type: r.type, n: parts.length - n0 });
  }

  function burstParts(r: Rocket) {
    const x = r.x, y = r.y, pal = r.pal, s0 = rand(52, 66) * S * (r.big ? 1.3 : 1);
    let n: number, i: number, v: [number, number];
    const NQ = Q * Math.min(1.5, Math.max(0.6, (dense ? S0 : S) / 2)) * (r.big ? 1.5 : 1) * D; // 개수 배율(cols 판은 넓이 D 배)
    if (r.last) endIntro();
    flashes.push({ x: x, y: y, c: rgb(r.type === "willow" || r.type === "palm" ? GOLD[0] : pal[0]), life: 1 });
    for (i = 0; i < 4 * (dense ? S0 : S) * Q; i++) { // 연기 — 번짐 캔버스(CSS 흐림)에 그려 부드러운 안개가 된다(cols 판도 1판 수)
      v = sphere(s0 * 0.6, true);
      smoke.push({ x: x + v[0], y: y + v[1], vx: rand(1, 4) * S, vy: rand(-1.5, 1) * S, r: rand(5, 9) * S, life: rand(4, 7) });
    }
    switch (r.type) {
      case "ring": case "double": {
        const tilt = rand(0.25, 1), rot = rand(0, 3.14), cr = Math.cos(rot), sr = Math.sin(rot);
        const ringN = (56 * NQ) | 0;
        ([[1, pal[0]], r.type === "double" ? [0.55, pal[1]] : null] as ([number, string] | null)[]).forEach(function (rg) {
          if (!rg) return;
          for (i = 0; i < ringN * rg[0] + 20; i++) {
            const a = i / (ringN * rg[0] + 20) * 6.283 + rand(-0.02, 0.02), jr = s0 * rg[0] * rand(0.96, 1.03);
            const ex = Math.cos(a) * jr, ey = Math.sin(a) * jr * tilt;
            spark(x, y, ex * cr - ey * sr, ex * sr + ey * cr, rand(1.7, 2.1), rg[1], { drag: 1.25 });
          }
        });
        return;
      }
      case "willow":
        for (i = 0; i < 190 * NQ; i++) { v = sphere(s0 * 0.62); spark(x, y, v[0], v[1], rand(3.8, 4.8), pick(GOLD), { drag: 1.7, g: 0.55, trail: 14, glitter: 0.3 }); }
        return;
      case "palm": {
        const arms = (rand(7, 10)) | 0;
        for (i = 0; i < arms; i++) {
          const a2 = i / arms * 6.283 + rand(-0.15, 0.15);
          spark(x, y, Math.cos(a2) * s0 * 0.95, Math.sin(a2) * s0 * 0.95 - s0 * 0.15, rand(2.2, 2.6), GOLD[0],
            dense ? { drag: 0.95, heavy: true, trail: 55, sz: Math.max(2, Math.round(2 * kd)), tm: D } : { drag: 0.95, heavy: true, trail: 55 });
        }
        for (i = 0; i < 40 * NQ; i++) { v = sphere(s0 * 0.25, true); spark(x, y, v[0], v[1], rand(0.6, 1), "#fff3c8", { drag: 2 }); }
        return;
      }
      case "crossette":
        for (i = 0; i < 26; i++) {
          v = sphere(s0 * 0.7);
          spark(x, y, v[0], v[1], rand(2.2, 2.6), pal[0], dense ? { drag: 1.1, split: pal[1], trail: 8, sz: Math.max(1, Math.round(kd)), tm: D } : { drag: 1.1, split: pal[1], trail: 8 });
        }
        return;
      case "strobe":
        for (i = 0; i < 200 * NQ; i++) { v = sphere(s0 * 0.85, true); spark(x, y, v[0], v[1], rand(2.2, 3), "#f4f6ff", { drag: 1.4, g: 0.7, strobe: Math.random() * 6 }); }
        return;
      case "shift":
        n = 260 * NQ;
        for (i = 0; i < n; i++) { v = sphere(s0); spark(x, y, v[0], v[1], rand(2.3, 2.9), pal[0], { shift: pal[1], drag: 1.2 }); }
        return;
    }
    // peony · pistil · chrys · crackle
    n = 240 * NQ;
    for (i = 0; i < n; i++) {
      v = sphere(s0);
      spark(x, y, v[0], v[1], rand(1.8, 2.5), Math.random() < 0.8 ? pal[0] : pal[1],
        r.type === "crackle" ? { crackle: true } : r.type === "chrys" ? { trail: 10 } : null);
    }
    if (r.type === "pistil") for (i = 0; i < n * 0.4; i++) { v = sphere(s0 * 0.42, true); spark(x, y, v[0], v[1], rand(1.4, 1.9), pal[1], { drag: 1.5 }); }
  }

  function endIntro() {
    if (!pendingEnd) return;
    pendingEnd = false;
    const cb = hooks.onIntroEnd;
    hooks.onIntroEnd = undefined;
    if (cb) queueMicrotask(cb); // 받는 쪽이 던져도 이 프레임(rAF 고리)은 끊기지 않는다
  }

  // ---- 순서표(loop 한 바퀴 CYCLE 초): 여는 세 발 → 큰 색 바뀜 한 발 → 이어 쏘기(가끔 두세 발) → 마무리, 그리고 처음부터
  //      intro 는 이어 쏘기만 INTRO_PULL 줄인 한 바퀴, quiet 는 한 발씩 띄엄띄엄. loop 의 계산은 원본과 같은 수로 떨어진다(pull = 0, base = 0).
  function schedule(t: number) {
    if (t < 0) return;
    if (mode === "quiet") {
      if (qAt < 0) qAt = t + rand(QUIET_GAP[0], QUIET_GAP[1]);
      else if (t >= qAt) { launch(); qAt = t + rand(QUIET_GAP[0], QUIET_GAP[1]); }
      return;
    }
    const intro = mode === "intro", pull = intro ? INTRO_PULL : 0;
    const u = t - base, c = intro ? 0 : Math.floor(u / CYCLE), tc = u - c * CYCLE;
    if (c !== cycle) {
      cycle = c; plan = [0.2, 0.9, 1.5]; planAt = 0; bigDone = false; finale = [];
      for (let i = 0; i < 14; i++) finale.push(19 - pull + i * 0.22);
      finale.push(22.4 - pull, 22.5 - pull);
    }
    while (plan.length && tc >= plan[0]) { plan.shift(); launch(); }
    if (!bigDone && tc >= 2.4) { bigDone = true; launch("shift", W / 2, true); }
    if (tc >= 4 && tc < 18.5 - pull && tc >= planAt) {
      planAt = tc + rand(0.3, 0.8) / Math.max(0.7, Q); launch();
      if (Math.random() < 0.35 * Q) launch();
      if (Math.random() < 0.12 * Q) { launch(); launch(); }
    }
    while (finale.length && tc >= finale[0]) {
      finale.shift();
      if (finale.length > 2) launch();
      else if (finale.length > 0) launch("willow", rand(W * 0.3, W * 0.7), true);
      else {
        const r = launch(pick(["peony", "shift", "pistil"]), W / 2, true);
        if (intro) { r.last = true; pendingEnd = true; mode = "quiet"; qAt = -1; }
      }
    }
  }

  function setQuiet(on: boolean) {
    if (on) { if (mode !== "quiet") { mode = "quiet"; qAt = -1; } }
    else if (mode !== "loop") { mode = "loop"; base = Math.max(0, tNow); cycle = -1; }
  }

  function step(t: number, dt: number, real?: number) {
    tNow = t;
    // 느린 기계: 프레임 시간이 2초 넘게 28ms 위면 알갱이를 줄이고 번짐을 끈다
    if (real) {
      ema = ema * 0.95 + Math.min(100, real * 1000) * 0.05;
      slowFor = ema > 28 ? slowFor + real : 0;
      if (Q === 1 && slowFor > 2) { Q = 0.55; bl.classList.add("q0"); ov.dataset.q = "low"; }
    }
    schedule(t);
    let i: number, p: Part, pops = 0, popX = 0, popY = 0, dead = 0;
    for (i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.vy += r.g * dt; r.vx += Math.sin(t * 14 + r.seed) * 2 * S * dt; r.x += r.vx * dt; r.y += r.vy * dt;
      if (dense) { // 로켓 꼬리: 넓이 D 배를 이번 프레임에 지나온 길에 고루(칸이 잘아 한자리에 모으면 점선이 된다)
        const rs = 2 * D;
        for (let k = 0; k < rs; k++) {
          const back = k / rs;
          spark(r.x - r.vx * dt * back + rand(-0.5, 0.5), r.y - r.vy * dt * back + 1, rand(-4, 4) * S * 0.4, rand(6, 14) * S * 0.5, rand(0.25, 0.55), pick(GOLD), { drag: 3, g: 0.4 });
        }
      } else for (let k = 0; k < 2; k++) spark(r.x + rand(-0.5, 0.5), r.y + 1, rand(-4, 4) * S * 0.4, rand(6, 14) * S * 0.5, rand(0.25, 0.55), pick(GOLD), { drag: 3, g: 0.4 });
      if (r.vy >= -2) { rockets.splice(i, 1); burst(r); }
    }
    for (i = parts.length - 1; i >= 0; i--) {
      p = parts[i];
      const d = Math.exp(-p.drag * dt);
      p.vx *= d; p.vy = p.vy * d + G * p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      const f = p.life / p.max;
      if (p.shift && f < 0.55) { p.ramp = ramp(p.shift); p.shift = null; }
      if (p.trail && p.tm) { // cols 판 굵은 별: 꼬리를 tm 배 — 한 프레임에 여러 개일 수 있다
        let e = p.trail * dt * p.tm;
        for (; e >= 1; e--) spark(p.x, p.y, rand(-2, 2) * S * 0.3, rand(1, 4) * S * 0.3, rand(0.35, 0.7), pick(GOLD), { drag: 3, g: 0.3 });
        if (Math.random() < e) spark(p.x, p.y, rand(-2, 2) * S * 0.3, rand(1, 4) * S * 0.3, rand(0.35, 0.7), pick(GOLD), { drag: 3, g: 0.3 });
      } else if (p.trail && Math.random() < p.trail * dt) spark(p.x, p.y, rand(-2, 2) * S * 0.3, rand(1, 4) * S * 0.3, rand(0.35, 0.7), pick(GOLD), { drag: 3, g: 0.3 });
      if (p.split && f < 0.6) {
        const sp = Math.hypot(p.vx, p.vy) * 0.9 + 8 * S, base0 = Math.atan2(p.vy, p.vx);
        for (let q = 0; q < 4; q++) {
          const a = base0 + 0.785 + q * 1.571;
          spark(p.x, p.y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.9, 1.2), p.split, p.sz ? { drag: 1.6, trail: 6, sz: p.sz, tm: p.tm } : { drag: 1.6, trail: 6 });
        }
        p.life = 0;
      }
      if (p.crackle && f < 0.22 && !p.popped) {
        p.popped = true;
        if (onEvent) { pops++; popX += p.x; popY += p.y; }
        for (let c2 = 0; c2 < 4; c2++) spark(p.x, p.y, rand(-16, 16) * S * 0.5, rand(-16, 16) * S * 0.5, rand(0.12, 0.25), "#ffffff", { drag: 5 });
      }
      if (p.life <= 0 || p.y > groundY + 2 || p.x < -10 || p.x > W + 10) {
        if (dense) { p.dead = true; dead++; } else parts.splice(i, 1);
      }
    }
    if (dead) { // cols 판: 산 것만 순서 그대로 앞으로 모은다(뒤에서부터 splice 한 것과 같은 배열이 된다)
      let w = 0;
      for (i = 0; i < parts.length; i++) { const q = parts[i]; if (!q.dead) parts[w++] = q; }
      parts.length = w;
    }
    if (pops) emit({ kind: "crackle", x: popX / pops / W, y: popY / pops / H, big: false, type: "crackle", n: pops });
    for (i = smoke.length - 1; i >= 0; i--) {
      const s = smoke[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.r += 0.8 * S * dt; s.life -= dt;
      if (s.life <= 0) smoke.splice(i, 1);
    }
    for (i = flashes.length - 1; i >= 0; i--) { flashes[i].life -= dt * 3.2; if (flashes[i].life <= 0) flashes.splice(i, 1); }
  }

  // 알갱이를 픽셀 버퍼에 더한다(겹치면 밝아진다 = 하얗게 타는 심)
  function add(x: number, y: number, c: RGB | number[], k: number) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const o = (y * W + x) * 4;
    buf[o] += c[0] * k; buf[o + 1] += c[1] * k; buf[o + 2] += c[2] * k;
  }

  // cols 판 굵은 별: s×s 칸 덩어리(오른쪽·아래 가장자리는 0.7 — 1판 heavy 2×2 와 같은 결)
  function blob(x: number, y: number, c: RGB | number[], s: number, w: number) {
    for (let dy = 0; dy < s; dy++) {
      for (let dx = 0; dx < s; dx++) add(x + dx, y + dy, c, w * (s > 1 && dx === s - 1 ? 0.7 : 1) * (s > 1 && dy === s - 1 ? 0.7 : 1));
    }
  }

  function draw(dt: number) {
    let i: number;
    const now = performance.now() / 1000;
    // 1) 잔상 버퍼를 식힌다 — 60fps 기준 프레임마다 18% 어둡게(꼬리 길이)
    const m = (Math.pow(0.82, (dt || 1 / 60) * 60) * 256) | 0;
    if (dense) { // 칸이 많다 — 빈(검은) 칸은 건너뛰고 한 칸을 32비트로 한 번에(결과는 아래 1판 고리와 같다)
      for (i = 0; i < buf32.length; i++) {
        const v = buf32[i];
        if (v === 0xff000000) continue;
        buf32[i] = 0xff000000 | ((((v >>> 16) & 255) * m >> 8) << 16) | ((((v >>> 8) & 255) * m >> 8) << 8) | (((v & 255) * m) >> 8);
      }
    } else for (i = 0; i < buf.length; i += 4) { buf[i] = (buf[i] * m) >> 8; buf[i + 1] = (buf[i + 1] * m) >> 8; buf[i + 2] = (buf[i + 2] * m) >> 8; }
    // 2) 알갱이
    for (i = 0; i < parts.length; i++) {
      const p = parts[i];
      const f = Math.max(0, p.life / p.max);
      let c: RGB | number[] = p.ramp[Math.min(31, (f * 31) | 0)];
      if (p.strobe != null && ((now * 18 + p.strobe) | 0) % 3) continue;          // 반짝이: 켜졌다 꺼졌다
      if (p.glitter && f < p.glitter && Math.random() < 0.5) c = [255, 240, 200];   // 버드나무 끝 반짝임
      if (f < 0.25 && !p.heavy && Math.random() < 0.3) continue;                     // 꺼져 가며 깜빡
      if (p.sz) { blob(p.x, p.y, c, p.sz, 1); continue; }
      add(p.x, p.y, c, 1);
      if (p.heavy) { add(p.x + 1, p.y, c, 0.7); add(p.x, p.y + 1, c, 0.7); add(p.x + 1, p.y + 1, c, 0.5); }
    }
    if (dense) { const rz = Math.max(1, Math.round(kd)); for (i = 0; i < rockets.length; i++) { blob(rockets[i].x, rockets[i].y, [255, 246, 220], rz, 1); blob(rockets[i].x, rockets[i].y + rz, [255, 200, 120], rz, 0.6); } }
    else for (i = 0; i < rockets.length; i++) { add(rockets[i].x, rockets[i].y, [255, 246, 220], 1); add(rockets[i].x, rockets[i].y + 1, [255, 200, 120], 0.6); }
    tctx.putImageData(img, 0, 0);

    // 3) 화면 = 하늘 + 번쩍임 + 별 + 연기 + 불꽃(더하기) + 도시
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(sky, 0, 0);
    let fl = 0;
    const fc = [0, 0, 0];
    for (i = 0; i < flashes.length; i++) { const F = flashes[i], w = F.life; fl += w; fc[0] += F.c[0] * w; fc[1] += F.c[1] * w; fc[2] += F.c[2] * w; }
    const fcol = fl > 0 ? "rgb(" + ((fc[0] / fl) | 0) + "," + ((fc[1] / fl) | 0) + "," + ((fc[2] / fl) | 0) + ")" : null;
    fl = Math.min(1, fl);
    if (fcol) { ctx.globalAlpha = 0.045 * fl; ctx.fillStyle = fcol; ctx.fillRect(0, 0, W, H); }
    for (i = 0; i < stars.length; i++) {
      const st = stars[i];
      ctx.globalAlpha = st[4] * (0.55 + 0.45 * Math.sin(now * st[3] + st[2]));
      ctx.fillStyle = "#d6deff"; ctx.fillRect(st[0], st[1], 1, 1);
    }
    ctx.globalAlpha = 1; // 🔴 별이 남긴 알파를 풀지 않으면 불꽃·도시가 반투명이 된다(원본에서 연기를 옮기며 한 번 빠졌다)
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(trail, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(city, 0, 0);
    if (fcol) { // 터진 빛이 건물 벽에 비친다
      const l = lit.getContext("2d") as CanvasRenderingContext2D;
      l.globalCompositeOperation = "copy"; l.drawImage(mask, 0, 0);
      l.globalCompositeOperation = "source-in"; l.fillStyle = fcol; l.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.035 * fl; ctx.drawImage(lit, 0, 0); ctx.globalAlpha = 1;
    }
    for (i = 0; i < beacons.length; i++) { // 옥상 항공 경고등
      const bc = beacons[i], on = Math.sin(now * 1.6 + bc[2]) > 0.6;
      const bs = dense ? Math.max(1, Math.round(kd / 2)) : 1;
      ctx.fillStyle = on ? "#ff3b30" : "#3a1210"; ctx.fillRect(bc[0], bc[1], bs, bs);
    }

    // 4) 번짐: 절반 크기로 줄여 그리고 CSS 가 흐린다
    if (Q === 1) {
      bctx.globalCompositeOperation = "copy";
      bctx.drawImage(trail, 0, 0, bl.width, bl.height);
      bctx.globalCompositeOperation = "source-over";
      bctx.fillStyle = "rgb(110,116,140)";
      for (i = 0; i < smoke.length; i++) { // 터진 빛이 비치면 연기가 밝아진다
        const p = smoke[i];
        bctx.globalAlpha = Math.min(1, p.life / 2) * (0.018 + 0.06 * fl);
        bctx.beginPath(); bctx.arc(p.x / 2, p.y / 2, p.r / 2, 0, 6.283); bctx.fill();
      }
      bctx.globalAlpha = 1;
      bctx.globalCompositeOperation = "lighter";
      for (i = 0; i < flashes.length; i++) {
        const F = flashes[i], gx = F.x / 2, gy = F.y / 2, gr = 18 * S;
        const gd = bctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        gd.addColorStop(0, "rgba(" + F.c[0] + "," + F.c[1] + "," + F.c[2] + "," + (0.32 * F.life).toFixed(3) + ")");
        gd.addColorStop(1, "rgba(0,0,0,0)");
        bctx.fillStyle = gd; bctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
      }
    }
  }

  function still() {
    // 움직임 줄이기: 몇 발을 시간만 돌려 놓고 한 장으로 멈춘다(소리 신호는 내지 않는다)
    mute = true;
    ([[0.22, 0.3, "peony"], [0.72, 0.24, "ring"], [0.12, 0.42, "willow"], [0.86, 0.4, "double"], [0.5, 0.2, "pistil"]] as [number, number, string][]).forEach(function (b) {
      burst({ x: W * b[0], y: H * b[1], vx: 0, vy: 0, g: 0, type: b[2], pal: pick(PALETTES), big: false, seed: 0 });
    });
    for (let i = 0; i < 14; i++) { step(-1, 1 / 30); draw(1 / 30); }
    flashes = [];
    draw(1 / 60);
    mute = false;
  }

  function state() { return { parts, rockets, smoke, flashes, Q, mode, shots, t: tNow, W, H, PX, S, kd, D, cap }; }

  resize();
  return { step, draw, still, resize, setQuiet, state };
}

// ---------------------------------------------------------------- 작품 계약(mount)
const STYLE_ID = "lab-fw-style";
const CSS =
  ".fw-root{position:absolute;inset:0;overflow:hidden;pointer-events:none}" +
  ".fw-root canvas{position:absolute;left:0;top:0;opacity:0;transition:opacity .9s ease;pointer-events:none}" +
  ".fw-root canvas.fw-main{image-rendering:pixelated;image-rendering:crisp-edges}" +
  ".fw-root canvas.fw-bloom{mix-blend-mode:screen;filter:blur(7px)}" +
  ".fw-root canvas.on{opacity:1}" +
  ".fw-root canvas.fw-bloom.on{opacity:.9}" +
  ".fw-root canvas.fw-bloom.q0{display:none}";
let styleRefs = 0;

/**
 * host 를 꽉 채우는 캔버스 둘(본 그림·번짐)을 만들어 불꽃놀이를 돌린다. host 는 position:fixed inset:0 이라고 본다.
 * root(.fw-root)의 data-* 는 30프레임마다: js(프레임당 계산 ms) · n(알갱이 수) · shots(누적 발사) · t(순서표 초) · mode · cells(칸 W×H) · q(low = 품질 낮춤)
 */
export function mount(host: HTMLElement, opts: MountOptions = {}): FireworksHandle {
  const reduce = opts.reduce ?? (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (styleRefs++ === 0 && !document.getElementById(STYLE_ID)) {
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  const root = document.createElement("div");
  root.className = "fw-root";
  root.setAttribute("aria-hidden", "true");
  const cv = document.createElement("canvas");
  cv.className = "fw-main";
  const bl = document.createElement("canvas");
  bl.className = "fw-bloom";
  root.appendChild(cv);
  root.appendChild(bl);
  host.appendChild(root);

  let stopped = false, raf = 0, last = 0, t0 = 0, jsMs = 0, frames = 0, resume = false;
  const userEnd = opts.onIntroEnd;
  const userEvent = opts.onEvent;
  const hooks: SceneHooks = {
    mode: opts.mode, cols: opts.cols,
    onIntroEnd: () => { if (!stopped && userEnd) userEnd(); },
    onEvent: userEvent ? e => { if (!stopped) userEvent(e); } : undefined,
  };
  const scene = makeScene(cv, bl, root, hooks);

  function show() { cv.classList.add("on"); bl.classList.add("on"); }
  function stamp() {
    const st = scene.state();
    root.dataset.js = jsMs.toFixed(1);
    root.dataset.n = String(st.parts.length);
    root.dataset.shots = String(st.shots);
    root.dataset.t = st.t.toFixed(2);
    root.dataset.mode = st.mode;
    root.dataset.cells = st.W + "x" + st.H;
  }

  function frame(now: number) {
    if (resume) { resume = false; if (t0) { t0 += now - last; last = now; } } // 숨었던 동안은 순서표 시계도 멈춘다
    if (!t0) { t0 = now; last = now; }
    const real = (now - last) / 1000, dt = Math.min(0.05, real);
    last = now;
    const a = performance.now();
    scene.step((now - t0) / 1000 - LEAD, dt, real);
    scene.draw(dt);
    jsMs = jsMs * 0.95 + (performance.now() - a) * 0.05; // 프레임당 계산 시간(ms)
    if (++frames === 1) show();
    if (frames % 30 === 0) stamp();
    raf = requestAnimationFrame(frame);
  }

  function onVis() {
    if (stopped || reduce) return;
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    else if (!raf) { resume = true; raf = requestAnimationFrame(frame); }
  }
  function onResize() { if (scene.resize() && reduce) scene.still(); }

  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVis);

  if (reduce) {
    scene.still();
    show();
    stamp();
    if (opts.mode === "intro" && userEnd) queueMicrotask(() => { if (!stopped) userEnd(); });
  } else if (!document.hidden) {
    raf = requestAnimationFrame(frame);
  }

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      root.remove();
      if (--styleRefs === 0) document.getElementById(STYLE_ID)?.remove();
    },
    setQuiet(on: boolean) {
      if (!stopped) scene.setQuiet(on);
    },
  };
}
