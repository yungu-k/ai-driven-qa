// 코코 — 실험실 도트 아트 작품 03 시안 (design 2026-11-27). 의뢰 docs/lab-pixel-brief.md 「작품 03 — 코코」, 미술 메모 docs/lab-pixel-coco-art.md
// 작품 모듈 계약: mount(host, {mode, reduce, onIntroEnd, cols}) → {stop, setQuiet}. tw 가 src/lab/pixel/coco.ts 로 옮긴다.
//
// 메밀꽃 들판, 뒤로 소나무와 숲, 흐린 하늘. 그루터기 위에 앉은 살구색 토이 푸들 코코(Dean 확정 구도: 사진 1).
// 🔴 사진은 비율·색을 읽는 참고로만 썼다. 이 파일엔 사진도, 사진에서 뽑은 픽셀도 없다 — 코코는 부위별 도형 + 곱슬 털 질감을 코드로 칠한다.
//    좌표는 사진 1 의 코코 둘레(620×820)를 「코코 단위」로 삼아 손으로 읽은 값이다. 옷은 그리지 않고 털로 덮었다(옷 무늬는 베끼지 않는다).
//
// 결: 「매끈한 수준 도트」(docs/lab-pixel-snowglobe-art.md) — 재질 램프(색상 이동)·덮임 세 단계·디더, 블러 없음.
// 움직임: 숨쉬기(머리 오르내림)·눈 깜빡임·바람에 귀와 정수리 털 날림·헐떡임(혀)·메밀꽃 흔들림·꽃잎 날림. 누르면 고개를 갸웃한다.
// 밀도: cols 가 없으면 밀도 ③(폭 700 이상 1280칸, 아래 585칸) — 이 작품은 ③ 이상으로 그린다(브리프).
// 2판: 코코·그루터기는 배율 넷(SETS)으로 미리 구운 아틀라스(public/lab/pixel/coco/)를 읽는다 — 폰 첫 그림 6–10초 → 1초 안팎. 없으면 같은 그림을 코드로 굽는다.
//      그림의 정본은 이 코드다. 고치면 tmp/lab-pixel/coco-bake.cjs 로 다시 굽는다(coco-check 「아틀라스 = 코드」가 지킨다).
// 서버 호출·외부 라이브러리·글자 없음.

/** 작품 페이지 첫 페인트 색(흐린 하늘 위쪽) */
export const paint = "#8f9aab";
/** 미리 구운 코코·그루터기 아틀라스의 배율(코코 단위 → 칸). 파일 public/lab/pixel/coco/coco-<배율×100>.png/.json — tmp/lab-pixel/coco-bake.cjs 가 이 파일로 굽는다.
 *  화면마다 맞는 배율 가운데 가장 큰 것을 고른다(폰 0.58·0.68, 큰 폰 0.85, 데스크톱 0.45·0.58). 파일이 없으면 같은 그림을 코드로 굽는다 */
export const SETS = [0.45, 0.58, 0.68, 0.85];

// ---------------------------------------------------------------- 도구
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dith = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const fr = v => v - Math.floor(v);
/** 0..1 해시 — 정수 곱셈(Math.sin 해시보다 몇 배 빠르다. 굽는 시간 대부분이 여기서 나온다). 소수 인자도 받는다(천분의 일까지 가른다) */
const hash = (x, y) => {
  let h = Math.imul(Math.round(x * 1013), 0x27d4eb2d) ^ Math.imul(Math.round(y * 1619), 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const rand = (a, b) => a + Math.random() * (b - a);
const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const pal = (...hs) => hs.map(hex);
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.15;
/** 램프에서 한 색 — 명암 l 을 디더로 섞어 고른다(중간색은 램프에 손으로 넣은 색뿐) */
const rampAt = (rp, l, x, y, j = 0.85) => rp[clamp(Math.floor(clamp(l, 0, 1) * (rp.length - 1) + 0.5 + dith(x, y) * j), 0, rp.length - 1)];
/** 가장자리 덮임 세 단계 */
const covq = c => (c >= 0.8 ? 1 : c >= 0.45 ? 0.62 : c >= 0.15 ? 0.3 : 0);
const smin = (a, b, k) => { const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1); return b + (a - b) * h - k * h * (1 - h); };
const sdCirc = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r;
/** 기운 타원(근사 거리) */
const sdEll = (x, y, cx, cy, rx, ry, ang = 0) => {
  const c = Math.cos(ang), s = Math.sin(ang), dx = x - cx, dy = y - cy, u = dx * c + dy * s, v = -dx * s + dy * c;
  const k = Math.hypot(u / rx, v / ry); return (k - 1) * Math.min(rx, ry);
};
/** 굵기가 변하는 캡슐 */
const sdCap = (x, y, ax, ay, ra, bx, by, rb) => {
  const px = x - ax, py = y - ay, dx = bx - ax, dy = by - ay, h = clamp((px * dx + py * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(px - dx * h, py - dy * h) - (ra + (rb - ra) * h);
};
// 셀 잡음(곱슬 털 뭉치 하나 = 셀 하나). 결과는 모듈 변수에 둔다(할당 없이 많이 부른다)
let W1 = 0, W2 = 0, WX = 0, WY = 0;
function worley(x, y, cell, seed) {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  W1 = 1e9; W2 = 1e9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = gx + i, cy = gy + j, px = (cx + 0.15 + 0.7 * hash(cx + seed, cy)) * cell, py = (cy + 0.15 + 0.7 * hash(cx, cy + seed * 1.7)) * cell;
    const d = Math.hypot(x - px, y - py);
    if (d < W1) { W2 = W1; W1 = d; WX = px; WY = py; } else if (d < W2) W2 = d;
  }
}
function Paint(w, h) {
  const img = new ImageData(w, h), d = img.data;
  return {
    img, d,
    put(x, y, c, a = 1) {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return;
      const o = (y * w + x) * 4, A = d[o + 3] / 255;
      if (a >= 1 || A === 0) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = a >= 1 ? 255 : Math.round(255 * a); return; }
      d[o] += (c[0] - d[o]) * a; d[o + 1] += (c[1] - d[o + 1]) * a; d[o + 2] += (c[2] - d[o + 2]) * a;
      d[o + 3] = Math.round(255 * (A + a * (1 - A)));
    },
  };
}
const canvasOf = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };

// ---------------------------------------------------------------- 팔레트(재질 램프 — 어두운 쪽 차갑게·밝은 쪽 따뜻하게)
const RP = {
  sky: pal("#7f8a9c", "#8f9aab", "#a0aab8", "#b2bac6", "#c3c9d3", "#d3d8df", "#e2e6ea"),
  cloud: pal("#8a95a6", "#9ea8b7", "#b6bec9", "#cdd3db", "#e0e4e9", "#eef0f3"),
  pine: pal("#0b1712", "#11221a", "#183024", "#21402e", "#2c5238", "#3c6644"),
  pineTrunk: pal("#2a1a14", "#432a1e", "#5e3a28", "#7a4c34"),
  forest: pal("#0f1d16", "#16291e", "#1f3826", "#2a4930", "#385c3a", "#4a7046"),
  field: pal("#1c3a16", "#28501c", "#386a22", "#4c822a", "#649a34", "#80b043", "#9cc455"),
  leafDark: pal("#163012", "#21441a"),
  flower: pal("#c8cfc0", "#e4e9dc", "#f6f8f0", "#ffffff"),
  flowerPink: pal("#d8a8b0", "#f0c8cc"),
  stumpTop: pal("#5e4630", "#7a5c40", "#957452", "#ae8c66", "#c4a37c", "#d6b890"),
  bark: pal("#241a14", "#36281e", "#4a3828", "#5e4834", "#755c44", "#8c7256"),
  woodBare: pal("#5e3a1e", "#7e5028", "#9c6a36", "#b88848", "#cca060"),
  // 코코 — 살구색 토이 푸들
  body: pal("#341709", "#542712", "#74391c", "#924e28", "#ad6535", "#c47d45", "#d79858", "#e6b274"),
  head: pal("#3c1a0c", "#5c2a14", "#7c3c1e", "#9c522a", "#b86a3a", "#cf8550", "#e2a26c", "#f0c08e"),
  ear: pal("#5a2c16", "#86482a", "#ae6a42", "#cc8c5e", "#e2ae80", "#f0caa0", "#f8e0c0"),
  vest: pal("#5e5a54", "#7e796e", "#9c968a", "#b8b2a4", "#d0cbbd", "#e2ded2", "#efece3", "#f8f6f0"),
  cream: pal("#7a4a30", "#a8704c", "#cc9670", "#e4b894", "#f2d4b4", "#fae8d2"),
  nose: pal("#0a080a", "#1a151a", "#2e282e", "#4a4450", "#8a8a96"),
  eye: pal("#070505", "#160d0a", "#2c1a12"),
  mouth: pal("#1a0a0c", "#341418", "#52222a"),
  tongue: pal("#8a2a3c", "#b8445a", "#dc6a80", "#f0909e", "#f8b4be"),
  nail: pal("#1e1614", "#3a2c28", "#5a4640"),
  petal: pal("#f2f4ec", "#ffffff"),
};
const L3 = (() => { const v = [-0.35, -0.85, 0.42], m = Math.hypot(...v); return v.map(x => x / m); })(); // 흐린 날 위에서 오는 빛(조금 왼쪽)

export function mount(host, opts = {}) {
  const reduce = opts.reduce ?? (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let quiet = false;
  const cv = document.createElement("canvas");
  cv.style.cssText = "position:absolute;left:0;top:0;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:manipulation;cursor:pointer";
  host.appendChild(cv);
  const ctx = cv.getContext("2d");

  let W, H, cellCss, sc, ox, oy, hy;
  let bgC, stumpC, bodyC, headC, earLC, earRC, lidC, mouthC, tiltC, SP = null, fgFlowers = [], petals = [];
  let raf = 0, last = 0, t = 0, Q = 1, ema = 16, slowFor = 0, jsMs = 0, frames = 0;
  let blinkAt = 2.5, tiltUntil = -1, pantUntil = 5, nextPant = 9, buildMs = [], cocoMs = [], bakedAt = 0;

  // ---------------------------------------------------------------- 배치: 칸 = 기기 픽셀 정수배(브리프 「밀도 2판」 계약)
  function layout() {
    if (opts.bake) { // 굽기 모드(아틀라스 만들기): 코코·그루터기만, 화면과 상관없는 고정 캔버스
      sc = opts.bake; ox = 24; oy = 24; hy = 0; cellCss = 1;
      W = Math.ceil(700 * sc) + 48; H = Math.ceil(830 * sc) + 48 + Math.ceil(1000 * sc);
      cv.width = W; cv.height = H; start(++bakeId); return;
    }
    const dpr = window.devicePixelRatio || 1, cols = opts.cols > 0 ? opts.cols : innerWidth >= 700 ? 1280 : 585;
    const cellDev = Math.max(1, Math.round((innerWidth * dpr) / cols));
    W = Math.ceil((innerWidth * dpr) / cellDev); H = Math.ceil((innerHeight * dpr) / cellDev); cellCss = cellDev / dpr;
    cv.width = W; cv.height = H; cv.style.width = W * cellCss + "px"; cv.style.height = H * cellCss + "px";
    // 코코 단위(사진 1 의 코코 둘레 620×820) → 칸. 코코가 주인공: 폰은 폭의 72%, 넓은 화면은 높이로 맞춘다
    const ideal = Math.min((W * 0.72) / 620, (H * 0.92) / 1150);
    sc = SETS.reduce((b, v) => (v <= ideal * 1.02 && v > b ? v : b), 0) || SETS[0]; // 미리 구운 배율 가운데 맞는 가장 큰 것
    ox = Math.round(W / 2 - 310 * sc);
    oy = Math.round(H * 0.52 - 420 * sc);
    hy = Math.round(oy + 120 * sc); // 들판 지평선 = 코코 이마 높이(사진 1 과 같은 자리)
    start(++bakeId);
  }
  // 시작: 배경(코드로, 빠르다)과 코코(미리 구운 아틀라스 → 없으면 코드로)를 나란히. 둘 다 되면 움직임 시계를 0 에서 시작한다
  let bakeId = 0, ready = 0, src = "", bgMs = 0, cocoAt = 0; // ready: 0..2, src: "atlas" | "code"
  function start(id) {
    ready = 0; bgC = null; SP = null; fgFlowers = []; src = "";
    const T0 = performance.now();
    const done = () => { if (++ready < 2) return; buildMs = [bgMs, Math.round(cocoAt - T0)]; bakedAt = performance.now(); t = 0; blinkAt = 2.5; pantUntil = 5; nextPant = 9; tiltUntil = -1; if (reduce) draw(); };
    if (opts.bake) { buildStump(); buildCoco(); SP = collect(); src = "code"; ready = 2; bakedAt = performance.now(); return; }
    setTimeout(() => { if (id !== bakeId) return; const a = performance.now(); buildBackground(); buildFlowers(); bgMs = Math.round(performance.now() - a); done(); }, 0);
    const byCode = () => setTimeout(() => { if (id !== bakeId) return; buildStump(); setTimeout(() => { if (id !== bakeId) return; buildCoco(); SP = collect(); src = "code"; cocoAt = performance.now(); done(); }, 0); }, 0);
    loadAtlas(sc).then(sp => { if (id !== bakeId) return; SP = sp; src = "atlas"; cocoAt = performance.now(); done(); }, byCode);
  }
  const collect = () => ({ stump: stumpC, body: bodyC, head: headC, earL: earLC, earR: earRC, lid: lidC, mouth: mouthC, tilt: tiltC });
  async function loadAtlas(s) {
    if (opts.atlas === false || typeof fetch !== "function") throw new Error("no atlas");
    const base = opts.atlasBase || "/lab/pixel/coco/", name = "coco-" + String(Math.round(s * 100)).padStart(3, "0");
    const res = await fetch(base + name + ".json"); if (!res.ok) throw new Error("atlas " + res.status);
    const meta = await res.json(), img = new Image(); img.src = base + name + ".png"; await img.decode();
    const g = k => { const [sx, sy, w, h, dx, dy] = meta.sprites[k]; return { img, sx, sy, w, h, dx, dy }; };
    return { stump: g("stump"), body: g("body"), head: g("head"), earL: [0, 1, 2].map(i => g("earL" + i)), earR: [0, 1, 2].map(i => g("earR" + i)), lid: g("lid"), mouth: [0, 1, 2].map(i => g("mouth" + i)), tilt: g("tilt") };
  }

  /** 넓게 부드러운 잡음은 step 칸 격자에서 한 번 구하고 겹선형으로 읽는다(굽는 시간을 크게 줄인다) */
  function coarse(fn, step) {
    const gw = Math.ceil(W / step) + 2, gh = Math.ceil(H / step) + 2, a = new Float32Array(gw * gh);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) a[j * gw + i] = fn(i * step, j * step);
    return (x, y) => {
      const fx = clamp(x, 0, W) / step, fy = clamp(y, 0, H) / step, i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j, o = j * gw + i;
      return (a[o] * (1 - tx) + a[o + 1] * tx) * (1 - ty) + (a[o + gw] * (1 - tx) + a[o + gw + 1] * tx) * ty;
    };
  }
  // ---------------------------------------------------------------- 배경: 흐린 하늘 · 숲 띠 · 소나무 · 메밀꽃 들판
  function buildBackground() {
    bgC = canvasOf(W, H); const P = Paint(W, H);
    const u = Math.max(1, sc * 2); // 배경 질감 배율(칸)
    const cloudN = coarse((x, y) => fbm(x / (90 * u) + 1.7, y / (28 * u)), 4), crownN = coarse((x, y) => fbm(x / (14 * u), y / (10 * u)), 3), leafN = coarse((x, y) => fbm(x / (5 * u), y / (5 * u)), 2);
    // 숲 띠: 지평선 위로 둥근 나무 머리가 이어진 선(오른쪽이 조금 높다)
    const forestTop = x => hy - H * (0.05 + 0.035 * fbm(x / (55 * u), 3.1) + 0.03 * clamp((x / W - 0.45) * 3, 0, 1)) - Math.abs(Math.sin(x / (9 * u) + fbm(x / (20 * u), 1) * 3)) * 4 * u;
    const f = H * 1.1; // 들판 원근: 지면 좌표 = 화면 → 땅(카메라 높이 1)
    const LEAF = 0.05;  // 메밀 잎 한 장(지면 단위)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let c;
      if (y < hy) {
        // 하늘: 흐린 날 — 가로로 늘어진 부드러운 구름 덩이, 위가 조금 짙다
        const k = y / Math.max(1, hy), cl = cloudN(x, y) * 1.3 - 0.35 + k * 0.2;
        c = rampAt(RP.sky, 0.2 + k * 0.55 + clamp(cl, 0, 1) * 0.45, x, y, 0.5);
        const ft = forestTop(x);
        if (y > ft) { // 숲: 큰 나무 머리(셀 잡음) 안에 잎 결, 아래로 어두워진다
          const crown = crownN(x, y), lit = clamp(1 - (y - ft) / (14 * u), 0, 1) * 0.25; // 나무 머리 덩이 + 위쪽 빛
          c = rampAt(RP.forest, 0.18 + (crown - 0.5) * 0.6 + lit - ((y - ft) / (hy - ft + 1)) * 0.22 + (vnoise(x / (1.4 * u), y / (1.4 * u)) - 0.5) * 0.25, x, y);
        }
      } else {
        // 들판: 지면 원근 좌표에서 셀 하나 = 메밀 잎 한 장(멀수록 작고 납작하다). 셀의 35%는 흰 꽃 무리
        const dy = y - hy + 0.5, zD = f / dy, gx = ((x - W / 2) * zD) / f / LEAF, gz = zD / LEAF, px = dy * LEAF; // px: 잎 한 장의 화면 크기(칸)
        const z = clamp(dy / (H - hy), 0, 1);
        if (px < 4.2) { // 멀면 잎 모양이 안 보인다 — 셀 계산 없이 점결만(stampField 는 dy 70 = 4.2칸부터)
          const patch0 = (vnoise(gx / 9, gz / 9) - 0.5) * 0.3 + z * 0.1;
          c = rampAt(RP.field, 0.36 + patch0 + (hash(x, y * 7) - 0.5) * 0.2, x, y, 0.7);
          if (hash(x * 3, y) < 0.1) c = mix(c, rampAt(RP.flower, 0.5, x, y), 0.45);
          if (z < 0.25) c = mix(c, [176, 188, 184], (0.25 - z) * 1.4 * (0.6 + 0.4 * (dith(x, y) + 0.5)));
          P.put(x, y, c); continue;
        }
        // 가까운 쪽 바탕 = 잎 사이 그늘(짙은 녹색). 잎과 꽃송이는 아래 stampField 가 그림으로 찍는다
        c = rampAt(RP.field, 0.1 + (vnoise(gx / 9, gz / 9) - 0.5) * 0.15 + z * 0.08, x, y, 0.6);
        // 지평 쪽은 공기 때문에 옅고 푸르스름하다
        if (z < 0.25) c = mix(c, [176, 188, 184], (0.25 - z) * 1.4 * (0.6 + 0.4 * (dith(x, y) + 0.5)));
      }
      P.put(x, y, c);
    }
    // 해송: 휘어 기운 붉은 줄기, 위 1/3 에 구름 모양 잎 덩이 여럿(사이로 하늘이 보인다)
    const pines = [[0.05, 1.05, -0.04], [0.14, 1.12, 0.06], [0.24, 0.98, -0.07], [0.31, 1.15, 0.05], [0.4, 0.86, 0.1], [0.86, 0.7, -0.05]];
    pines.forEach(([px0, hk, lean], ti) => {
      const baseX = W * px0, baseY = hy + 2, top = hy - hy * hk, hgt = baseY - top, trunkW = Math.max(2, 3.6 * u);
      const at = t2 => baseX + lean * hgt * t2 + Math.sin(t2 * 4 + ti * 2) * 4 * u;
      for (let y = Math.floor(top + hgt * 0.2); y < baseY; y++) {
        const t2 = (baseY - y) / hgt, cx = at(t2), w = trunkW * (1 - t2 * 0.45);
        for (let x = Math.floor(cx - w - 1); x <= Math.ceil(cx + w + 1); x++) {
          const d = (x - cx) / w; if (Math.abs(d) > 1.1) continue;
          P.put(x, y, rampAt(RP.pineTrunk, 0.62 - d * 0.4 + (hash(Math.round(x / u), Math.floor(y / (2.5 * u))) - 0.5) * 0.35, x, y), covq(clamp((1.1 - Math.abs(d)) * w, 0, 1)));
        }
      }
      const lobes = 8 + (ti % 4);
      for (let i = 0; i < lobes; i++) {
        const t2 = 0.55 + 0.45 * hash(i, ti * 5.1), side = (hash(i * 3, ti) - 0.5) * 2;
        const cx = at(t2) + side * 30 * u, cy = baseY - hgt * t2, rx = (14 + 14 * hash(i, ti)) * u, ry = rx * (0.42 + 0.22 * hash(ti, i));
        for (let y = Math.floor(cy - ry * 1.6); y <= Math.ceil(cy + ry * 1.6); y++) for (let x = Math.floor(cx - rx * 1.6); x <= Math.ceil(cx + rx * 1.6); x++) {
          const e0 = Math.hypot((x - cx) / rx, (y - cy) / ry); if (e0 > 1.5) continue;
          const e = e0 - (leafN(x + ti * 37 + i * 11, y) - 0.5) * 0.9;
          if (e > 1) continue;
          const lit = -(y - cy) / ry, needle = vnoise(x / (1.3 * u), y / (0.8 * u));
          P.put(x, y, rampAt(RP.pine, 0.3 + lit * 0.3 + (needle - 0.5) * 0.4 - (e > 0.75 ? 0.1 : 0), x, y), e > 0.88 ? 0.62 : 1);
        }
        // 잎 덩이로 가는 가지
        const bx0 = at(t2 - 0.05), by0 = baseY - hgt * (t2 - 0.05);
        for (let s3 = 0; s3 <= 1; s3 += 0.5 / Math.max(rx, 1)) P.put(Math.round(bx0 + (cx - bx0) * s3), Math.round(by0 + (cy + ry * 0.3 - by0) * s3), RP.pineTrunk[1], 0.9);
      }
    });
    bgC.getContext("2d").putImageData(P.img, 0, 0);
    stampField(bgC.getContext("2d"));
  }

  // ---------------------------------------------------------------- 메밀: 하트 잎 · 흰 꽃송이 그림을 먼 줄부터 가까운 줄로 찍는다
  // 칸마다 셀 잡음을 구하지 않아 빠르다(배경 굽기의 대부분이었다). 잎은 가까울수록 크고, 꽃송이는 잎 위에 모인다(사진 1)
  const LEAF_SIZES = [3, 4, 5, 6, 7, 9, 11, 13, 16, 19, 23, 28, 34, 41, 50, 60, 72];
  function leafSprites() {
    const out = [];
    for (const n of LEAF_SIZES) {
      const vs = [];
      for (let v = 0; v < 3; v++) {
        const c = canvasOf(n, n), P = Paint(n, n), tone = [0.06, 0, -0.08][v];
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
          const X = ((x + 0.5) / n) * 2 - 1, Y = ((y + 0.5) / n) * 2 - 1;
          // 하트: 위 두 둥근 볼 + 아래로 뾰족한 끝
          const lobe = Math.min(Math.hypot(X + 0.38, Y + 0.25) - 0.56, Math.hypot(X - 0.38, Y + 0.25) - 0.56);
          const tip = Math.abs(X) - (0.95 - Y) * 0.62, d = Math.min(lobe, Math.max(tip, -Y - 0.25, Y - 0.95));
          if (d > 0.06) continue;
          const vein = Math.abs(X) < 1.2 / n + 0.02 && Y > -0.3, rim = d > -0.1;
          const l = 0.62 - Y * 0.22 - (rim ? 0.18 : 0) - (vein ? 0.14 : 0) + tone + (X < 0 ? 0.04 : -0.03);
          P.put(x, y, rampAt(RP.field, l, x, y, 0.5), d > -0.02 ? 0.62 : 1);
        }
        c.getContext("2d").putImageData(P.img, 0, 0); vs.push(c);
      }
      // 꽃송이: 잎보다 작은 무리, 작은 흰 꽃 여럿(가운데가 살짝 분홍)
      const m = Math.max(3, Math.round(n * 0.62)), fc = canvasOf(m, m), F = Paint(m, m), k = 4 + Math.round(n / 5);
      for (let i = 0; i < k; i++) {
        const a = hash(n, i) * 6.283, r = Math.sqrt(hash(i, n * 3)) * m * 0.38, cx = m / 2 + Math.cos(a) * r, cy = m / 2 + Math.sin(a) * r * 0.8, fr2 = Math.max(0.6, n / 28);
        for (let y = Math.floor(cy - fr2 - 1); y <= Math.ceil(cy + fr2); y++) for (let x = Math.floor(cx - fr2 - 1); x <= Math.ceil(cx + fr2); x++) {
          const e = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / fr2; if (e > 1.1) continue;
          F.put(x, y, e < 0.35 && n >= 16 ? RP.flowerPink[1] : rampAt(RP.flower, 0.95 - (y + 0.5 - cy) / fr2 * 0.3, x, y, 0.4), e > 0.85 ? 0.62 : 1);
        }
      }
      fc.getContext("2d").putImageData(F.img, 0, 0);
      out.push({ n, leaves: vs, flower: fc });
    }
    return out;
  }
  function stampField(g) {
    const S = leafSprites(), pick = L => { let b = S[0]; for (const e of S) if (e.n <= L) b = e; return b; };
    let row = 0;
    for (let dy = 70; dy < H - hy + 80; dy += Math.max(1, dy * 0.06 * 0.42)) { // 잎 한 장 = 화면에서 dy·0.06칸(4칸부터 — 더 작으면 꽃이 흰 띠가 된다)
      const L = dy * 0.06, e = pick(L), step = Math.max(2, L * 0.78); row++;
      for (let x = -L + hash(row, 1) * step; x < W + L; x += step * (0.75 + 0.5 * hash(row, x))) {
        const hv = hash(x, row * 3), lx = Math.round(x - e.n / 2 + (hv - 0.5) * step * 0.4), ly = Math.round(hy + dy - e.n * 0.75 + (hash(row, x * 2) - 0.5) * L * 0.25);
        g.drawImage(e.leaves[(hv * 3) | 0], lx, ly);
        if (hv < (L < 8 ? 0.12 : L < 16 ? 0.28 : 0.45)) g.drawImage(e.flower, Math.round(lx + e.n / 2 - e.flower.width / 2), Math.round(ly - e.flower.height * 0.45));
      }
    }
  }

  // ---------------------------------------------------------------- 그루터기: 나이테 윗면 · 갈라짐 · 나무껍질 옆면 · 벗겨진 속살
  const STUMP = { cx: 350, cy: 788, rx: 268, ry: 52 }; // 코코 단위
  function buildStump() {
    const P = Paint(W, H);
    const cx = STUMP.cx * sc, cy = STUMP.cy * sc, rx = STUMP.rx * sc, ry = STUMP.ry * sc, u = Math.max(1, sc * 2);
    const x0 = Math.floor(ox + cx - rx - 2), x1 = Math.ceil(ox + cx + rx + 2);
    for (let Y = Math.floor(oy + cy - ry - 2); Y < H; Y++) for (let X = x0; X <= x1; X++) {
      const x = X - ox, y = Y - oy; // 결·디더는 코코 기준점에 대해(아틀라스와 같은 무늬)
      const nx = (x - cx) / rx, e = Math.hypot(nx, (y - cy) / ry);
      // 옆면: 타원 아래 반쪽부터 화면 아래까지(조금 좁아지며 들판에 묻힌다)
      const sideHalf = rx * (1 + ((y - cy) / (1300 * sc)) * 0.04);
      const inSide = y >= cy && Math.abs(x - cx) <= sideHalf;
      if (e <= 1.02) { // 윗면
        const r = e, rings = fr(r * 9 + fbm(nx * 3, (y - cy) / ry) * 1.4), crack = Math.abs(Math.sin(Math.atan2((y - cy) / ry, nx) * 3 + 0.6)) < 0.04 && r > 0.25 && r < 0.95;
        let l = 0.72 - r * 0.25 - ((y - cy) / ry) * 0.1 + (rings < 0.18 ? -0.22 : 0) + (fbm(x / (6 * u), y / (2 * u)) - 0.5) * 0.15 - (crack ? 0.35 : 0);
        if (r > 0.93) l = 0.15; // 껍질 테
        P.put(X, Y, rampAt(RP.stumpTop, l, x, y), covq(clamp((1.02 - e) * rx, 0, 1)));
      } else if (inSide) {
        const d = (x - cx) / sideHalf, fiss = fr((x / u) * 0.18 + fbm(x / (5 * u), y / (40 * u)) * 2.2);
        let c = rampAt(RP.bark, 0.6 - d * 0.35 - Math.abs(d) * 0.25 + (fiss < 0.22 ? -0.35 : 0) + (vnoise(x / (2 * u), y / (9 * u)) - 0.5) * 0.25, x, y);
        // 벗겨진 속살(사진 1 왼쪽 가운데의 주황 결)
        const bw = 0.05 + fbm(y / (14 * u), 2) * 0.12 * clamp(1 - (y - cy) / (560 * sc), 0.2, 1), bc = -0.4 + (fbm(y / (40 * u), 5) - 0.5) * 0.25;
        if (Math.abs(d - bc) < bw * clamp(1.4 - (y - cy) / (rx * 0.9), 0, 1)) c = mix(c, rampAt(RP.woodBare, 0.5 - Math.abs(d - bc) / bw * 0.4 + (fbm(x / (1.5 * u), y / (10 * u)) - 0.5) * 0.5, x, y, 0.6), 0.7);
        P.put(X, Y, c, covq(clamp(sideHalf - Math.abs(x - cx) + 0.5, 0, 1)));
      }
    }
    stumpC = toCanvas(P);
  }

  // ---------------------------------------------------------------- 코코
  // 부위(코코 단위): 뒤 → 앞으로 칠한다. 각 부위 = 거리 함수 + 빛(볼륨) + 램프 + 털 결.
  // 털 결(2판): 큰 셀 = 곱슬 뭉치 하나. 흐린 하늘 빛이 위에서 오니 뭉치마다 윗면이 밝고 아랫면이 그늘이다.
  //   부위마다 결 방향(dir)과 늘림(st)이 다르다 — 다리는 세로로 늘어진 뭉치, 머리는 둥근 뭉치, 귀는 긴 타래.
  //   작은 셀은 뭉치 안의 곱슬 결이다. 뭉치 사이는 선을 긋지 않고 가라앉힌다(선 = 자갈·가죽으로 읽힌다).
  const FUR = 6.5; // 곱슬 하나 지름(코코 단위, 사진 1 에서 잰 값). 뭉치는 그 2배
  function furShade(u, v, cell, seed, dir = 0, st = 1) {
    const c = Math.cos(dir), s = Math.sin(dir), a = u * c + v * s, b = (-u * s + v * c) * st; // 결 방향 a 로 늘어난 뭉치
    worley(a, b, cell * 2, seed + 50);
    const R2 = cell * 2 * 0.72, b2 = clamp(1 - W1 / R2, 0, 1), da = a - WX, db = (b - WY) / st, du = da * c - db * s, dv = da * s + db * c;
    const top = clamp(-dv / (R2 * 0.8), -1, 1), side = clamp(-du / (R2 * 0.8), -1, 1);
    const clump = (top * 0.4 + side * 0.12) * (0.35 + 0.65 * b2) + (b2 - 0.5) * 0.2; // 뭉치 윗면 빛 · 아랫면 그늘(세면 거품으로 보인다)
    worley(u, v, cell * 0.75, seed);
    const b1 = clamp(1 - W1 / (cell * 0.55), 0, 1), tone = hash(Math.floor(WX * 3.7), Math.floor(WY * 2.3)) - 0.5;
    return { bump: 0.6 * b2 + 0.4 * b1, light: clump + (b1 - 0.5) * 0.2 + tone * 0.1, gap: (1 - b2) * 0.5 };
  }
  /** 부위 하나를 칠한다. sd(u,v)=거리(코코 단위), vol(u,v)=[nx,ny,nz](볼륨 법선), look(u,v,l,x,y,f)=색 */
  function paintPart(P, box, sd, vol, ramp, opt = {}) {
    const cell = opt.cell || FUR, seed = opt.seed || 1, fluff = opt.fluff ?? 0.55, base = opt.base ?? 0.12, xf = opt.xf, dir = opt.dir || 0, st = opt.st || 1;
    const m = xf ? 42 : 0, [u0, v0, u1, v1] = [box[0] - m, box[1] - m, box[2] + m, box[3] + m]; // 돌려·옮겨 읽으면 그림이 상자 밖으로 간다 — 넓혀 잡는다
    const X0 = Math.floor(ox + u0 * sc) - 2, X1 = Math.ceil(ox + u1 * sc) + 2, Y0 = Math.floor(oy + v0 * sc) - 2, Y1 = Math.ceil(oy + v1 * sc) + 2;
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
      let u = (x - ox) / sc, v = (y - oy) / sc;
      if (xf) { const q = xf(u, v); u = q[0]; v = q[1]; }
      const d0 = sd(u, v); if (d0 > cell * fluff * 0.7 + 1 / sc) continue; // 털 끝보다 먼 칸
      const f = furShade(u, v, cell, seed, dir, st);
      const d = d0 - (f.bump - 0.45) * cell * fluff; // 복슬한 외곽
      const dc = d * sc; if (dc >= 0.5) continue;
      const a = covq(0.5 - dc); if (!a) continue;
      const n = vol(u, v), lam = clamp(n[0] * L3[0] + n[1] * L3[1] + n[2] * L3[2], -1, 1);
      const l = base + 0.5 * (0.5 + 0.5 * lam) + 0.5 * f.light - 0.22 * f.gap + (opt.occ ? opt.occ(u, v) : 0);
      const c = opt.look ? opt.look(u, v, l, x - ox, y - oy, f) : rampAt(ramp, l, x - ox, y - oy, 0.35); // 디더 자리는 코코 기준점에 대해(아틀라스와 같은 무늬)
      if (c) P.put(x, y, c, a);
    }
  }
  /** 볼륨 법선: 거리 함수 기울기 + 안쪽 깊이(반지름 rr 로 정규화) */
  const volOf = (sd, rr) => (u, v) => {
    const e = 1.5, d = sd(u, v), gx = sd(u + e, v) - d, gy = sd(u, v + e) - d, gm = Math.hypot(gx, gy) || 1;
    const t = clamp(-d / rr, 0, 1), s = 1 - t, nz = Math.sqrt(Math.max(0, 1 - s * s));
    return [(gx / gm) * s, (gy / gm) * s, nz];
  };

  // 부위 거리 함수(코코 단위 — 사진 1 의 코코 둘레에서 손으로 읽음, 2판에서 앞다리·목·뒷다리를 다시 맞춤)
  const sdTorso = (u, v) => smin(smin(smin(sdCirc(u, v, 262, 418, 88), sdCirc(u, v, 378, 480, 120), 50), sdCirc(u, v, 488, 585, 104), 50), sdCap(u, v, 252, 268, 74, 280, 360, 80), 40);
  const sdRuff = (u, v) => sdEll(u, v, 240, 300, 98, 58, 0.18); // 목둘레 부푼 털(머리가 어깨 가까이 앉는다)
  const sdThigh = (u, v) => smin(sdEll(u, v, 488, 690, 104, 86, -0.35), sdCirc(u, v, 568, 768, 30), 20); // 접힌 넓적다리 + 뒤꿈치
  const sdHindFoot = (u, v) => smin(sdEll(u, v, 494, 794, 52, 19, 0.04), sdCirc(u, v, 548, 780, 22), 14); // 앞으로 놓인 뒷발(뒤꿈치에 붙는다)
  const sdFarLeg = (u, v) => smin(smin(sdCap(u, v, 252, 505, 44, 240, 630, 36), sdCap(u, v, 240, 630, 36, 222, 742, 29), 14), sdEll(u, v, 200, 774, 42, 19, -0.22), 14);
  const sdNearLeg = (u, v) => smin(smin(smin(smin(sdCirc(u, v, 322, 470, 72), sdCap(u, v, 322, 480, 60, 338, 598, 50), 26), sdCirc(u, v, 360, 596, 34), 14), sdCap(u, v, 336, 600, 48, 314, 742, 36), 14), sdEll(u, v, 298, 786, 50, 22, -0.08), 16);
  const HEAD = { pu: 225, pv: 250 }; // 고개 갸웃 축(목)
  /** 머리 무리: 사진보다 6% 크게, 10 단위 아래로(어깨 가까이) — 화면 점 → 머리 그림 점 */
  const HX = (u, v) => [HEAD.pu + (u - HEAD.pu) / 1.06, HEAD.pv + (v - 10 - HEAD.pv) / 1.06];
  const sdCranium = (u, v) => smin(smin(sdEll(u, v, 176, 118, 116, 80), sdEll(u, v, 152, 198, 84, 70), 62), sdCirc(u, v, 226, 204, 54), 44);
  const sdChin = (u, v) => sdEll(u, v, 166, 266, 30, 16, 0.2);
  const earL = w => (u, v) => sdEll(u, v, 47 - w * 6, 170 + w * 2, 39 + w * 3, 72 - w * 4, 0.26 + w * 0.12); // 안쪽 끝이 왼눈(107,161)에 닿지 않게
  const earR = w => (u, v) => sdEll(u, v, 268 + w * 8, 136 - w * 6, 50 + w * 3, 74 - w * 3, -0.35 - w * 0.2);
  // 발: 발가락 갈래 두 줄 + 앞 끝 발톱(발은 왼쪽을 향한다)
  const PAWS = [[200, 774, 42, 19], [298, 786, 50, 22], [494, 794, 52, 19]];
  const pawLook = ramp => (u, v, l, x, y) => {
    for (const [cu, cv, rx, ry] of PAWS) {
      const e = Math.hypot((u - cu) / rx, (v - cv) / ry); if (e > 1.15) continue;
      const lx = (u - (cu - rx)) / rx; // 0 = 발끝
      if (lx < 0.12 && v > cv - ry * 0.2 && fr(v / 5.5) < 0.45) return rampAt(RP.nail, 0.45, x, y); // 발톱
      if (v > cv - ry * 0.1 && (Math.abs(lx - 0.34) < 0.03 || Math.abs(lx - 0.56) < 0.03)) return rampAt(ramp, l - 0.3, x, y, 0.3); // 발가락 갈래
    }
    return rampAt(ramp, l, x, y, 0.35);
  };

  function buildCoco() {
    const tc = performance.now(); const B = Paint(W, H);
    // 몸(정적): 먼 앞다리 → 몸통 털 → 조끼 → 뒷발 → 넓적다리 → 목둘레 털 → 가까운 앞다리
    paintPart(B, [150, 470, 300, 800], sdFarLeg, volOf(sdFarLeg, 30), RP.body, { seed: 4, base: 0.08, dir: 1.62, st: 1.5, look: pawLook(RP.body) });
    paintPart(B, [160, 180, 610, 700], sdTorso, volOf(sdTorso, 95), RP.body, { seed: 3, base: 0.14, dir: 0.95, st: 1.2 });
    // 조끼(2판): 몸에 붙는 민소매 — 목둘레·진동(팔 구멍)·허리 밑단, 시접 테와 바늘땀, 진동·허리의 잔주름. 무늬 없음
    const neck = u => (u < 245 ? 368 - (u - 185) * 0.95 : 311 - (u - 245) * 0.36), hem = u => 572 + (u - 205) * 0.18;
    const sdArm = (u, v) => sdEll(u, v, 326, 482, 76, 96, 0.1);
    const sdVest = (u, v) => Math.max(sdTorso(u, v) - 3.5, neck(u) - v, v - hem(u), -sdArm(u, v));
    const tv = volOf(sdTorso, 90);
    pix(B, [150, 250, 620, 680], sdVest, (u, v, x, y) => {
      const n = tv(u, v), lam = clamp(n[0] * L3[0] + n[1] * L3[1] + n[2] * L3[2], -1, 1);
      const eN = v - neck(u), eH = hem(u) - v, eA = sdArm(u, v), eS = -sdTorso(u, v) + 3.5, edge = Math.min(eN, eH, eA, eS);
      const armF = clamp(1 - eA / 40, 0, 1), waistF = clamp(1 - eH / 50, 0, 1);
      const fold = Math.sin(Math.atan2(v - 482, u - 326) * 9 + fbm(u / 30, v / 30) * 3) * 0.08 * armF + Math.sin(u / 7 + fbm(u / 20, v / 20) * 4) * 0.07 * waistF; // 진동 둘레 방사 주름 · 허리 잔주름
      const shade = (eN < 16 ? -0.14 * (1 - eN / 16) : 0) + (eA < 10 ? -0.1 : 0); // 목털·어깨 밑 그늘
      const knit = (vnoise(u / 2.2, v / 3.4) - 0.5) * 0.06;
      let l = 0.16 + 0.7 * (0.5 + 0.5 * lam) + fold + shade + knit;
      if (edge < 5) { l -= 0.1; if (edge > 2.8 && edge < 3.6 && fr((u + v) / 4) < 0.5) l -= 0.18; } // 시접 테 + 바늘땀
      return rampAt(RP.vest, l, x, y, 0.3);
    });
    paintPart(B, [415, 760, 575, 820], sdHindFoot, volOf(sdHindFoot, 12), RP.body, { seed: 9, base: 0.1, dir: 0, st: 1.3, look: pawLook(RP.body) });
    paintPart(B, [370, 590, 610, 805], sdThigh, volOf(sdThigh, 70), RP.body, { seed: 2, base: 0.12, dir: -0.6, st: 1.25, occ: (u, v) => (v > 760 ? -0.12 : 0) });
    paintPart(B, [130, 230, 350, 370], sdRuff, volOf(sdRuff, 40), RP.head, { seed: 10, base: 0.12, dir: 0.25, st: 1.1, fluff: 0.9, occ: (u, v) => -0.18 * clamp(1 - Math.hypot((u - 225) / 80, (v - 262) / 30), 0, 1) });
    paintPart(B, [240, 390, 410, 815], sdNearLeg, volOf(sdNearLeg, 44), RP.body, { seed: 5, base: 0.16, dir: 1.6, st: 1.5, fluff: 0.7, look: pawLook(RP.body), occ: (u, v) => (sdArm(u, v) > -6 && v < 520 ? -0.14 : 0) });
    bodyC = toCanvas(B); cocoMs = [Math.round(performance.now() - tc)];
    // 머리(정적 부분: 머리통·얼굴·눈·코), 귀 자세 셋, 눈꺼풀, 입 셋, 갸웃한 머리 한 장 — 모두 머리 무리 변환(HX)
    const Hd = Paint(W, H); paintHead(Hd, HX); headC = toCanvas(Hd);
    earLC = []; earRC = [];
    for (let w = 0; w < 3; w++) { // 귀 자세 셋(바람 약 · 중 · 강). 상자를 넉넉히(좁으면 귀 끝이 네모로 잘린다 — 1판 결함)
      const a = Paint(W, H); paintEar(a, earL(w / 2), [-40, 30, 160, 320], 21, HX); earLC.push(toCanvas(a));
      const b = Paint(W, H); paintEar(b, earR(w / 2), [180, 10, 390, 270], 22, HX); earRC.push(toCanvas(b));
    }
    const lid = Paint(W, H); paintLids(lid, HX); lidC = toCanvas(lid);
    mouthC = [0, 1, 2].map(m => { const p = Paint(W, H); paintMouth(p, m, HX); return toCanvas(p); });
    const tl = Paint(W, H), r0 = rotAbout(HEAD.pu, HEAD.pv, 0.16), rot = (u, v) => { const q = HX(u, v); return r0(q[0], q[1]); };
    paintEar(tl, earR(0.4), [180, 10, 390, 270], 22, rot); paintHead(tl, rot); paintMouth(tl, 2, rot); paintEar(tl, earL(0.2), [-40, 30, 160, 320], 21, rot);
    tiltC = toCanvas(tl); cocoMs.push(Math.round(performance.now() - tc));
  }
  /** 칠한 층을 안 빈 상자만 잘라 둔다 → {c, x, y}. 전체 화면 캔버스를 열 장 넘게 들고 있지 않게 */
  const toCanvas = P => {
    const d = P.d; let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return { img: canvasOf(1, 1), sx: 0, sy: 0, w: 1, h: 1, dx: 0, dy: 0 };
    const w = x1 - x0 + 1, h = y1 - y0 + 1, c = canvasOf(w, h); c.getContext("2d").putImageData(P.img, -x0, -y0, x0, y0, w, h);
    return { img: c, sx: 0, sy: 0, w, h, dx: x0 - ox, dy: y0 - oy }; // 자리는 코코 기준점(ox, oy)에 대해 — 아틀라스와 같은 꼴
  };
  const blit = (sp, bob = 0) => ctx.drawImage(sp.img, sp.sx, sp.sy, sp.w, sp.h, ox + sp.dx, oy + sp.dy + bob, sp.w, sp.h);
  /** 점 (u,v) 를 축 둘레로 돌려 읽는다(그림이 -ang 만큼 기운다) */
  const rotAbout = (pu, pv, ang) => (u, v) => { const c = Math.cos(ang), s = Math.sin(ang), du = u - pu, dv = v - pv; return [pu + du * c - dv * s, pv + du * s + dv * c]; };

  function paintHead(P, xf) {
    const vol = volOf(sdCranium, 70);
    // 얼굴: 주둥이·턱은 크림색으로, 눈가는 조금 짙게(눈물 자국), 이마는 빛
    const look = (u, v, l, x, y, f) => {
      const m = Math.hypot((u - 140) / 60, (v - 224) / 46), eyeRing = Math.min(Math.hypot((u - 107) / 20, (v - 162) / 15), Math.hypot((u - 184) / 22, (v - 158) / 17));
      const cream = clamp((1.15 - m) * 2.2 + (f.bump - 0.5) * 0.8, 0, 1); // 주둥이: 곱슬 단위로 번지며 크림색이 된다(테두리 없이)
      if (cream > 0.5) return rampAt(RP.cream, l + 0.08, x, y, 0.5); // 경계는 곱슬 모양(디더 체커를 쓰지 않는다)
      return rampAt(RP.head, l - (eyeRing < 1 ? 0.14 * (1 - eyeRing) : 0) + (v < 120 ? 0.05 : 0), x, y, 0.5);
    };
    const nape = (u, v) => -0.16 * clamp(1 - Math.hypot((u - 250) / 60, (v - 262) / 34), 0, 1); // 목 쪽 둥근 그늘
    paintPart(P, [40, 25, 300, 300], sdCranium, vol, RP.head, { seed: 6, base: 0.16, look, xf, occ: nape, dir: 0, st: 1 });
    paintPart(P, [130, 245, 205, 290], sdChin, volOf(sdChin, 14), RP.cream, { seed: 7, base: 0.2, cell: 8, xf });
    // 정수리 바람 털(사진 1 의 날리는 머리끝): 가는 곱슬 다발 셋
    const tuft = (u, v) => smin(smin(sdCirc(u, v, 200, 46, 15), sdCirc(u, v, 222, 36, 11), 8), sdCirc(u, v, 238, 30, 7), 6);
    paintPart(P, [178, 14, 252, 66], tuft, volOf(tuft, 10), RP.head, { seed: 8, cell: 5, base: 0.24, fluff: 1.1, xf, dir: -0.8, st: 1.5 });
    paintEyes(P, xf); paintNose(P, xf);
  }
  function paintEar(P, sd, box, seed, xf) { // 귀: 세로로 늘어진 곱슬(셀을 세로로 늘린다) · 끝은 크림색
    const look = (u, v, l, x, y, f) => {
      const down = clamp((v - box[1] - 50) / (box[3] - box[1] - 80), 0, 1), edge = 1 - clamp(-sd(u, v) / 22, 0, 1);
      return down + (f.bump - 0.5) * 0.35 < 0.16 ? rampAt(RP.head, l, x, y, 0.5) : rampAt(RP.ear, l + edge * 0.15 + down * 0.1, x, y, 0.5); // 머리색 → 크림은 곱슬 단위로
    };
    paintPart(P, box, sd, volOf(sd, 30), RP.ear, { seed, cell: 7.5, dir: 1.57, st: 1.8, fluff: 0.85, base: 0.12, look, xf }); // 귀: 세로로 늘어진 타래
  }
  function paintEyes(P, xf) { // 까맣고 동그란 눈: 아몬드 몸 · 갈색 테 · 왼쪽 위 반사광 두 점
    for (const [cu, cv2, rx, ry] of [[107, 161, 11, 7.6], [184, 157, 13, 9]]) {
      pix(P, [cu - rx - 3, cv2 - ry - 3, cu + rx + 3, cv2 + ry + 3], (u, v) => sdEll(u, v, cu, cv2, rx, ry, -0.12), (u, v, x, y) => {
        const r = Math.hypot((u - cu) / rx, (v - cv2) / ry);
        if (Math.hypot(u - (cu - rx * 0.35), v - (cv2 - ry * 0.4)) < Math.max(1.6 / sc, rx * 0.22)) return [250, 250, 255];
        if (Math.hypot(u - (cu + rx * 0.35), v - (cv2 + ry * 0.35)) < Math.max(1 / sc, rx * 0.1)) return [150, 140, 150];
        return rampAt(RP.eye, r > 0.8 ? 2 / 2 : 0.1, x, y);
      }, xf);
    }
  }
  function paintNose(P, xf) { // 까만 코: 둥근 덩이 · 위쪽 광택 띠 · 콧구멍
    pix(P, [104, 190, 154, 230], (u, v) => smin(sdEll(u, v, 129, 208, 20, 14), sdEll(u, v, 129, 220, 9, 6), 6), (u, v, x, y) => {
      if (Math.hypot((u - 120) / 4.5, (v - 214) / 3) < 1 || Math.hypot((u - 138) / 4.5, (v - 213) / 3) < 1) return RP.nose[0];
      const hl = Math.hypot((u - 124) / 9, (v - 200) / 4) < 1;
      return rampAt(RP.nose, hl ? 0.95 : 0.45 - (v - 200) / 30 - Math.abs(u - 129) / 60, x, y);
    }, xf);
  }
  function paintMouth(P, m, xf) { // 웃는 입: 어두운 입속 · 분홍 혀(m 이 클수록 길게 나온다) · 아랫입술
    const open = [0.75, 1, 1.25][m], tongue = [0.85, 1.05, 1.35][m];
    const sdIn = (u, v) => sdEll(u, v, 151, 243 + open * 2, 32, 11 * open, -0.12);
    pix(P, [112, 222, 192, 285], sdIn, (u, v, x, y) => rampAt(RP.mouth, 0.3 + (v - 236) / 40, x, y), xf);
    const sdT = (u, v) => sdEll(u, v, 146, 250 + tongue * 4, 19, 9 * tongue, -0.1);
    pix(P, [120, 236, 176, 290], sdT, (u, v, x, y) => {
      const mid = Math.abs(u - 146 - (v - 250) * 0.1) < 1.2 / sc + 0.6;
      return rampAt(RP.tongue, 0.75 - (v - 246) / 30 - (mid ? 0.25 : 0) + (Math.hypot(u - 140, v - 247) < 5 ? 0.2 : 0), x, y);
    }, xf);
    pix(P, [126, 255, 180, 292], (u, v) => Math.max(Math.abs(sdEll(u, v, 151, 250 + open * 4, 24, 11 * open, -0.12)) - 1.4, 252 + open * 6 - v, Math.abs(u - 152) - 22), (u, v, x, y) => rampAt(RP.mouth, 0.2, x, y), xf);
  }
  function paintLids(P, xf) { // 깜빡임: 눈 자리를 털빛 눈꺼풀이 덮고 아래 속눈썹 줄 하나
    for (const [cu, cv2, rx, ry] of [[107, 161, 12.5, 9], [184, 157, 14.5, 10.5]])
      pix(P, [cu - rx - 3, cv2 - ry - 3, cu + rx + 3, cv2 + ry + 3], (u, v) => sdEll(u, v, cu, cv2, rx, ry, -0.12), (u, v, x, y) =>
        Math.abs(v - (cv2 + ry * 0.25)) < 1.2 / sc + 0.4 ? RP.eye[1] : rampAt(RP.head, 0.55 - (v - cv2) / ry * 0.15, x, y), xf);
  }
  /** 털 결 없는 매끈한 부위(눈·코·입) — 덮임 세 단계만 */
  function pix(P, box, sd, look, xf) {
    const m = xf ? 42 : 0, [u0, v0, u1, v1] = [box[0] - m, box[1] - m, box[2] + m, box[3] + m], X0 = Math.floor(ox + u0 * sc) - 2, X1 = Math.ceil(ox + u1 * sc) + 2, Y0 = Math.floor(oy + v0 * sc) - 2, Y1 = Math.ceil(oy + v1 * sc) + 2;
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
      let u = (x - ox) / sc, v = (y - oy) / sc;
      if (xf) { const q = xf(u, v); u = q[0]; v = q[1]; }
      const dc = sd(u, v) * sc; if (dc >= 0.5) continue;
      const a = covq(0.5 - dc); if (!a) continue;
      const c = look(u, v, x - ox, y - oy); if (c) P.put(x, y, c, a);
    }
  }

  // ---------------------------------------------------------------- 앞 메밀꽃(바람에 흔들린다)·꽃잎
  function buildFlowers() {
    fgFlowers = [];
    const n = Math.round(W * 0.09), s2 = Math.max(1, Math.round(sc * 3));
    for (let i = 0; i < n; i++) {
      const x = rand(0, W), y = rand(H * 0.8, H + 4);
      if (Math.abs(x - (ox + STUMP.cx * sc)) < STUMP.rx * sc * 0.95 && y < H) continue; // 그루터기 앞은 비운다
      const sp = canvasOf(7 * s2, 6 * s2), g = sp.getContext("2d");
      for (let k = 0; k < 9; k++) { const px = Math.round(rand(1, 6) * s2), py = Math.round(rand(0.5, 4) * s2); g.fillStyle = k % 4 ? "#f6f8f0" : "#e2e7d8"; g.fillRect(px, py, Math.max(1, s2 - 1) || 1, Math.max(1, s2 - 1) || 1); }
      g.fillStyle = "#3f7a2a"; g.fillRect(Math.round(3.5 * s2), Math.round(4 * s2), Math.max(1, Math.round(s2 / 2)), 2 * s2);
      fgFlowers.push([x, y, sp, rand(0, 6.28), rand(0.7, 1.3)]);
    }
    petals = [];
    for (let i = 0; i < Math.round(W * 0.03); i++) petals.push([rand(0, W), rand(hy, H), rand(6, 16) * Math.max(1, sc * 2), rand(0, 6.28)]);
  }

  // ---------------------------------------------------------------- 그리기
  function draw() {
    ctx.globalAlpha = 1;
    if (!bgC) { ctx.fillStyle = paint; ctx.fillRect(0, 0, W, H); return; }
    ctx.drawImage(bgC, 0, 0);
    if (!SP) return; // 코코를 아직 읽는(굽는) 중
    const st = SP.stump; blit(st);
    for (let y = oy + st.dy + st.h, rows = Math.max(8, Math.round(st.h / 4)); y < H; y += rows) // 화면이 아틀라스보다 길면 그루터기 아랫단을 이어 붙인다
      ctx.drawImage(st.img, st.sx, st.sy + st.h - rows, st.w, rows, ox + st.dx, y, st.w, rows);
    blit(SP.body);
    const A = Math.max(1, Math.round(sc * 1.6)), breath = Math.round(Math.sin(t * 3.9) * A); // 숨: 머리가 한두 칸 오르내린다(헐떡일 땐 빠르게) — 0.5 를 곱하면 반올림돼 안 움직인다
    const pant = t < pantUntil;
    const bob = pant ? Math.round(Math.sin(t * 15) * A) : breath;
    if (t < tiltUntil) blit(SP.tilt, bob);
    else {
      const wind = clamp(0.5 + 0.45 * Math.sin(t * 0.9) + 0.25 * Math.sin(t * 2.3 + 1), 0, 0.999), ear = Math.floor(wind * 3);
      blit(SP.earR[ear], bob);
      blit(SP.head, bob);
      blit(SP.mouth[pant ? (Math.sin(t * 15) > 0 ? 2 : 1) : 0], bob);
      if (t >= blinkAt && t < blinkAt + 0.13) blit(SP.lid, bob);
      blit(SP.earL[Math.min(2, Math.floor(clamp(wind + 0.1, 0, 0.999) * 3))], bob);
    }
    // 앞 메밀꽃: 높이에 따라 한두 칸 흔들린다
    for (const [x, y, sp, ph, f] of fgFlowers) ctx.drawImage(sp, Math.round(x + Math.sin(t * 1.6 * f + ph) * Math.max(1, sc * 2)), Math.round(y - sp.height));
    // 꽃잎: 바람 따라 오른쪽으로 날린다
    ctx.fillStyle = "#f6f8f0";
    const pz = Math.max(1, Math.round(sc * 1.2));
    for (const p of petals) ctx.fillRect(Math.round(p[0]), Math.round(p[1]), pz, pz);
  }
  function step(dt) {
    t += dt;
    if (t > blinkAt + 0.2) blinkAt = t + rand(2.5, 6);
    if (t > nextPant) { pantUntil = t + rand(3, 6); nextPant = pantUntil + rand(6, 12); }
    const wind = 0.6 + 0.4 * Math.sin(t * 0.9);
    for (const p of petals) {
      p[0] += (p[2] * wind) * dt * (quiet ? 0.5 : 1); p[1] += Math.sin(t * 2 + p[3]) * p[2] * 0.2 * dt - p[2] * 0.05 * dt;
      if (p[0] > W + 4) { p[0] = -4; p[1] = rand(hy, H); }
      if (p[1] < hy - 40) p[1] = H;
    }
  }
  function frame(now) {
    const real = last ? (now - last) / 1000 : 1 / 60; last = now;
    ema = ema * 0.95 + Math.min(100, real * 1000) * 0.05;
    slowFor = ema > 24 && bakedAt && now - bakedAt > 1000 ? slowFor + real : 0; // 굽는 동안 멈춘 프레임은 「느린 기계」로 치지 않는다
    if (Q === 1 && slowFor > 2) { Q = 0.5; fgFlowers.length = Math.round(fgFlowers.length / 2); host.dataset.q = "low"; }
    const a = performance.now();
    step(Math.min(0.05, real)); draw();
    jsMs = jsMs * 0.95 + (performance.now() - a) * 0.05;
    if (++frames % 30 === 0) host.dataset.js = jsMs.toFixed(2);
    raf = requestAnimationFrame(frame);
  }
  function onTap() { if (!reduce) { tiltUntil = t + 1.4; pantUntil = Math.max(pantUntil, t + 2.5); } }
  function onKey(e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onTap(); } }
  function onVis() { if (reduce) return; if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
  function onResize() { layout(); }

  layout();
  if (!opts.bake) addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVis);
  if (!reduce && !opts.bake) { cv.addEventListener("pointerdown", onTap); addEventListener("keydown", onKey); raf = requestAnimationFrame(frame); }
  if (opts.mode === "intro" && opts.onIntroEnd) setTimeout(opts.onIntroEnd, 0); // intro 는 불꽃놀이만 뜻이 있다

  return {
    stop() {
      cancelAnimationFrame(raf); raf = 0;
      removeEventListener("resize", onResize); document.removeEventListener("visibilitychange", onVis); removeEventListener("keydown", onKey);
      cv.remove(); delete host.dataset.q; delete host.dataset.js;
    },
    setQuiet(on) { quiet = !!on; },
    _probe: () => ({ W, H, cellCss, sc, Q, t, ready, done: ready === 2, src, bakedAt, petals: petals.length, flowers: fgFlowers.length, buildMs, cocoMs }),
    /** 굽기 모드: 아틀라스로 묶을 조각들 [{name, c, dx, dy}] */
    _sprites: () => { const L = [["stump", SP.stump], ["body", SP.body], ["head", SP.head], ["lid", SP.lid], ["tilt", SP.tilt]]; for (let i = 0; i < 3; i++) L.push(["earL" + i, SP.earL[i]], ["earR" + i, SP.earR[i]], ["mouth" + i, SP.mouth[i]]); return L.map(([name, sp]) => ({ name, c: sp.img, dx: sp.dx, dy: sp.dy })); },
    _tap: onTap,
  };
}
