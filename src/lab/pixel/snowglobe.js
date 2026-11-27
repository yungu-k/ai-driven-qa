// 스노우볼 — 실험실 도트 아트 작품 시안 (design 2026-11-27). 의뢰 docs/lab-pixel-brief.md 「design 몫 ②」, 미술 메모 docs/lab-pixel-snowglobe-art.md
// 작품 모듈 계약(브리프 그대로): mount(host, {mode, reduce, onIntroEnd}) → {stop, setQuiet}. tw 가 src/lab/pixel/snowglobe.ts 로 옮긴다.
//
// 「눈이 펑펑 오는 아늑한 집이 든 스노우볼」 — 어두운 방, 탁자 위 유리구슬. 구 안에 창에 불 켜진 통나무 집·굴뚝 연기·눈사람·
// 전구 단 눈 덮인 나무. 눈은 구 안에서만 내리고, 땅에 닿으면 쌓인다. 누르거나 끌면 구가 흔들리고 쌓인 눈이 눈보라로 일었다 가라앉는다.
//
// 도트 결은 불꽃놀이와 같다: 가로 약 640칸 캔버스를 보간 없이 키운다(PX = clamp(round(innerWidth/640), 2, 4)).
// 빛 번짐도 불꽃놀이와 같은 수: 절반 크기 캔버스를 CSS 로 흐리게 해 screen 으로 겹친다(계산 없이 GPU 가 한다).
// 성능: 정적인 것(방·구 안 배경·집·유리·받침)은 크기가 바뀔 때 한 번 그려 두고, 프레임마다 그리는 건 눈·연기·전구뿐이다.
// 눈 알갱이는 Float32Array 로 상한 NMAX 안에서 돈다. 프레임이 2초 넘게 느리면 알갱이 수를 절반으로 줄이고 번짐을 끈다.
// 서버 호출·외부 라이브러리 없음. 글자 없음.
//
// 밀도 2판(2026-11-27, Dean 「더 촘촘한 도트」·「매끈한 그림 수준의 도트아트」): opts.cols 로 화면 가로 칸 수를 받는다.
//   cols 없음 = ①(위 그림 그대로, 픽셀까지 같다 — tmp/lab-pixel/snowglobe-check.cjs 가 옛 판과 대조).
//   cols 있음 = 같은 장면을 그 밀도로 다시 그린다(아래 「밀도 2판」 절). 칸 하나 = 기기 픽셀 정수배.
//   매끈함은 블러가 아니라 손으로 찍은 중간색(덮임 세 단계)·디더·색상 이동 명암 램프·제한된 팔레트로 낸다(미술 메모 「매끈한 수준 도트」).

/** 작품 페이지 첫 페인트 색(방 벽 위쪽) — 캔버스가 뜨기 전 이음새용 */
export const paint = "#0c0910";

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dith = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

// ---------------------------------------------------------------- 색(미술 메모 「팔레트」 절과 같은 값)
const C = {
  wallTop: hex("#0c0910"), wallBot: hex("#1e141a"),
  tableEdge: hex("#6a4530"), tableTop: hex("#3b2519"), tableBot: hex("#1a0f0a"), grain: hex("#2a1810"),
  skyTop: hex("#0a1330"), skyBot: hex("#22355e"), hill: hex("#34466e"), hillEdge: hex("#5a6f9c"), farTree: hex("#1d2a50"),
  snow: hex("#eef3fb"), snowShade: hex("#aebcd6"), snowWarm: hex("#ffe3b4"),
  log: hex("#6b4128"), logDark: hex("#4a2b1a"), roof: hex("#3a2018"), chimney: hex("#5a3424"), door: hex("#33200f"),
  win: hex("#ffd27a"), winHot: hex("#fff1c4"), winFrame: hex("#2a170c"),
  pine: hex("#1d4a3a"), pineDark: hex("#143528"), pineLit: hex("#2c6a50"), trunk: hex("#3a2416"),
  wreath: hex("#2f7a4a"), bow: hex("#e0413a"), carrot: hex("#ff8a2a"), coal: hex("#1a1a22"), scarf: hex("#d8343a"),
  wood: hex("#4a2a1a"), woodLit: hex("#7a4a2c"), woodDark: hex("#2a170e"), gold: hex("#c99a3e"), goldLit: hex("#f3d58a"), goldDark: hex("#7e5a1e"),
  smoke: hex("#9aa3b8"),
};
const LIGHTS = ["#ff5a52", "#ffd25a", "#5ad1ff", "#8dff7a", "#ff8ad8"];
const SNOW_COL = ["#8fa3c8", "#d5def0", "#ffffff"]; // 먼 · 가운데 · 가까운 눈

// ---------------------------------------------------------------- 밀도 2판 도구(cols 있을 때만 쓴다)
const fr = v => v - Math.floor(v);
const hash = (x, y) => fr(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
function vnoise(x, y) { // 값 잡음(질감용) — Math.random 을 안 써서 같은 화면이면 같은 그림
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const pal = (...hs) => hs.map(hex);
/** 램프에서 한 색 — 명암 l(0..1)을 디더로 섞어 고른다. 중간색은 램프에 손으로 넣은 색뿐이다(보간 없음) */
const rampAt = (rp, l, x, y, j = 0.9) => rp[clamp(Math.floor(clamp(l, 0, 1) * (rp.length - 1) + 0.5 + dith(x, y) * j), 0, rp.length - 1)];
/** 가장자리 덮임을 세 단계로 — 손으로 찍은 안티에일리어싱 결(매끈한 보간이 아니다) */
const covq = c => (c >= 0.8 ? 1 : c >= 0.45 ? 0.62 : c >= 0.15 ? 0.3 : 0);
const sdBox = (x, y, x0, y0, x1, y1) => Math.max(x0 - x, x - x1, y0 - y, y - y1);
const sdCirc = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r;
const sdSeg = (x, y, ax, ay, bx, by, r) => { const px = x - ax, py = y - ay, dx = bx - ax, dy = by - ay, h = clamp((px * dx + py * dy) / (dx * dx + dy * dy), 0, 1); return Math.hypot(px - dx * h, py - dy * h) - r; };
const sdRBox = (x, y, x0, y0, x1, y1, r) => { const qx = Math.abs(x - (x0 + x1) / 2) - ((x1 - x0) / 2 - r), qy = Math.abs(y - (y0 + y1) / 2) - ((y1 - y0) / 2 - r); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
const sdTri = (x, y, cx, top, base, half) => { const hgt = base - top, t = clamp((y - top) / hgt, 0, 1); return Math.max((Math.abs(x - cx) - half * t) * (hgt / Math.hypot(half, hgt)), top - y, y - base); };
// 명암 램프: 어두운 쪽은 차갑고(보라·청록 쪽) 밝은 쪽은 따뜻하게 색상을 옮긴다 — 명도만 바꾸면 그림이 탁해진다
const RP = {
  sky: pal("#050a1e", "#08112b", "#0c1838", "#122246", "#1a2d56", "#243a68", "#2f4878"),
  hillFar: pal("#141f40", "#1a284e", "#22335c", "#2c3f6c"),
  hill: pal("#22305a", "#2c3d6a", "#384c7c", "#46608e", "#5874a2", "#6f89b4"),
  farTree: pal("#0e1631", "#141e3e", "#1a2748"),
  snow: pal("#3e4c7e", "#566a9c", "#7489b8", "#97abd2", "#bccbe6", "#dce5f4", "#f4f8fd", "#ffffff"),
  snowWarm: pal("#7a5a6c", "#b08482", "#dcae98", "#f6cfa8", "#ffe4bf", "#fff3dc"),
  log: pal("#1e0e08", "#33190e", "#4c2716", "#66361e", "#82482a", "#a05e36", "#be7a46"),
  logEnd: pal("#4a2c18", "#7a5030", "#a8784a", "#cc9c66", "#e8c08a"),
  frame: pal("#140a05", "#24120a", "#36200f", "#4a2d16"),
  glass: pal("#b04a1a", "#d8722a", "#f29a3a", "#ffbe55", "#ffd98a", "#fff0c4"),
  curtain: pal("#4a1414", "#6e1e1c", "#962c26"),
  door: pal("#1e0f06", "#2e190b", "#422510", "#573216"),
  roof: pal("#1a0c08", "#2a140d", "#3c1d12", "#4e2717"),
  brick: pal("#3a1610", "#55221a", "#703022", "#8c402c", "#a8543a"),
  mortar: pal("#2a1e1e", "#4a3c3a", "#6a5c58"),
  ice: pal("#5a7ab0", "#8cb0dc", "#c4e0f6", "#f2fbff"),
  pine: pal("#06171a", "#0b2622", "#12362c", "#1a4836", "#245c40", "#33724a", "#4b8a52", "#6aa05a"),
  bark: pal("#170c07", "#2a170d", "#3e2414", "#55331d"),
  carrot: pal("#8a3410", "#c85a1c", "#ee8432", "#ffb060"),
  coal: pal("#09090e", "#1c1c26", "#34343f"),
  scarf: pal("#5e0e18", "#8e1a24", "#bc2a30", "#e24a4a"),
  scarfStripe: pal("#c8b8a8", "#efe4d6"),
  stick: pal("#2a170c", "#4a2c16", "#6a4422"),
  gold: pal("#3a2608", "#5e4012", "#86601e", "#b08630", "#d4a845", "#ecca70", "#fbe8a8", "#fffbe8"),
  wood: pal("#160a05", "#26130a", "#371d0f", "#4a2816", "#5e341d", "#764426", "#8e5632"),
  wall: pal("#07050a", "#0b080e", "#0f0b13", "#140f18", "#19121c", "#1e1620", "#241a25"),
  table: pal("#0e0704", "#170d07", "#22140b", "#2e1c10", "#3b2516", "#4b301d", "#5e3d25", "#764d30"),
  wire: pal("#120d10", "#2a2024"),
};

export function mount(host, opts = {}) {
  const reduce = opts.reduce ?? (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const HD = opts.cols > 0; // 밀도 2판
  let quiet = false;

  const cv = document.createElement("canvas"), gl = document.createElement("canvas");
  cv.style.cssText = "position:absolute;left:0;top:0;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none;cursor:grab";
  gl.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;mix-blend-mode:screen;filter:blur(6px);opacity:.9";
  host.appendChild(cv); host.appendChild(gl);
  const ctx = cv.getContext("2d"), gctx = gl.getContext("2d");

  // 화면 · 배치
  let PX, W, H, R, s, D, gx, gy, tableY, bh, baseTop;
  let cellCss; // 칸 하나의 CSS px(① = PX)
  // 정적 층
  let bgC, backC, midC, glassC, baseC, baseOff;
  // 구 안 좌표(가운데 0,0 · 칸 단위)의 땅·쌓인 눈
  let ground, pile, cap, lights, bulbs, chim, winGlow;
  // 눈 알갱이(구 안 좌표)
  let NMAX, target, n = 0;
  let fx, fy, fvx, fvy, fz, fa; // 위치·속도·깊이(0 먼 → 1 가까운)·나이
  const smoke = [];
  // 흔들기: 구 위치 용수철
  let ox = 0, oy = 0, ovx = 0, ovy = 0, tox = 0, toy = 0, swirl = 0, spin = 1; // spin: 소용돌이 도는 방향(±1)
  let drag = null;
  // 시간·품질
  let raf = 0, last = 0, t = 0, Q = 1, ema = 16, slowFor = 0, spawnAcc = 0, relaxAcc = 0, jsMs = 0, frames = 0;

  const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

  // ---------------------------------------------------------------- 배치
  function layout() {
    if (HD) { // 칸 하나 = 기기 픽셀 정수배(정수배가 아니면 확대에서 점 크기가 들쭉날쭉해진다) — 브리프 「계약 추가」 식 그대로
      const dpr = window.devicePixelRatio || 1, cellDev = Math.max(1, Math.round((innerWidth * dpr) / opts.cols));
      W = Math.ceil((innerWidth * dpr) / cellDev); H = Math.ceil((innerHeight * dpr) / cellDev);
      PX = cellCss = cellDev / dpr;
      R = Math.floor(Math.min(W * 0.42, H * 0.3));
    } else {
      PX = clamp(Math.round(innerWidth / 640), 2, 4);
      W = Math.ceil(innerWidth / PX); H = Math.ceil(innerHeight / PX);
      R = Math.floor(Math.min(W * 0.42, H * 0.3, 210));
      cellCss = PX;
    }
    s = R / 100; D = 2 * R + 1;
    bh = Math.round(R * 0.3);
    tableY = Math.round(Math.min(H * 0.86, H * 0.54 + 1.08 * R));
    baseTop = tableY - bh + Math.round(R * 0.05); // 받침 아래가 탁자 면에 조금 들어와 「놓인」 자리
    gy = baseTop - Math.round(R * 0.84);
    gx = Math.round(W / 2);
    cv.width = W; cv.height = H; cv.style.width = W * cellCss + "px"; cv.style.height = H * cellCss + "px";
    gl.width = Math.ceil(W / 2); gl.height = Math.ceil(H / 2); gl.style.width = W * cellCss + "px"; gl.style.height = H * cellCss + "px";
    // 밀도 2판은 칸이 늘어난 만큼 눈도 늘린다 — R 에 비례(넓이 그대로면 폰 ③ CPU 4배 느림에서 프레임당 8 ms 를 넘는다. 잰 값은 미술 메모).
    // 칸이 작아진 만큼 눈송이도 작아져, 같은 수여도 더 고운 눈으로 읽힌다. R 120 에서 ①과 같은 수
    NMAX = HD ? Math.round(clamp(Math.PI * R * 0.034 * 120, 260, 3600)) : Math.round(clamp(Math.PI * R * R * 0.034, 260, 2200));
    target = Math.round(NMAX * 0.6);
    fx = new Float32Array(NMAX); fy = new Float32Array(NMAX); fvx = new Float32Array(NMAX); fvy = new Float32Array(NMAX);
    fz = new Float32Array(NMAX); fa = new Float32Array(NMAX); n = 0;
    smoke.length = 0;
    if (HD) { k = s * SC; q = R / 120; buildRoomHD(); buildInsideHD(); buildGlassHD(); buildBaseHD(); }
    else { buildRoom(); buildInside(); buildGlass(); buildBase(); }
    seedSnow();
  }

  // ---------------------------------------------------------------- 방(벽·전구 줄·탁자)
  function buildRoom() {
    bgC = canvas(W, H);
    const b = bgC.getContext("2d"), id = b.createImageData(W, H), d = id.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4; let c;
      if (y < tableY) { // 벽: 위 → 탁자 쪽으로 따뜻하게, 8띠 디더
        const k = clamp(Math.round(Math.pow(y / tableY, 1.3) * 7 + dith(x, y)), 0, 7) / 7;
        c = mix(C.wallTop, C.wallBot, k);
      } else if (y < tableY + 2) c = y === tableY ? C.tableEdge : mix(C.tableEdge, C.tableTop, 0.5);
      else { // 탁자 면: 앞으로 어두워지고 나뭇결 줄이 간다
        const k = clamp(Math.round(((y - tableY) / (H - tableY)) * 6 + dith(x, y)), 0, 6) / 6;
        c = mix(C.tableTop, C.tableBot, k);
        if ((y - tableY) % 7 === 3 && Math.sin(x * 0.05 + y) > -0.6) c = mix(c, C.grain, 0.6);
      }
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
    b.putImageData(id, 0, 0);
    // 받침 그림자(탁자 위 타원) — 구가 흔들려도 그림자는 거의 그대로라 굽는다
    const sw = Math.round(R * 1.05), sh = Math.max(2, Math.round(R * 0.07)), sy = baseTop + bh - 1;
    b.fillStyle = "rgba(0,0,0,.45)";
    for (let dy = -sh; dy <= sh; dy++) { const hw = Math.round(sw * Math.sqrt(1 - (dy / (sh + 0.5)) ** 2)); b.fillRect(gx - hw, sy + dy, hw * 2 + 1, 1); }
    // 벽 위 전구 줄: 늘어진 줄 세 자락
    bulbs = [];
    const swags = W > H ? 3 : 2, top = Math.max(3, Math.round(H * 0.035)), sag = Math.max(6, Math.round(H * 0.07));
    b.fillStyle = "#2a1f22";
    for (let x = 0; x < W; x++) {
      const p = (x / W) * swags, f = p - Math.floor(p), y = Math.round(top + sag * 4 * f * (1 - f));
      b.fillRect(x, y, 1, 1);
      if (x % Math.max(9, Math.round(W / (swags * 9))) === 4) bulbs.push([x, y + 1, LIGHTS[bulbs.length % LIGHTS.length], Math.random() * 6.28]);
    }
  }

  // 구 안 좌표 → 정적 층 캔버스 좌표(가운데 R,R)
  const inside = (x, y, r = R - 1) => (x - R) * (x - R) + (y - R) * (y - R) <= r * r;

  // ---------------------------------------------------------------- 구 안: 뒤(하늘·먼 언덕) + 가운데(땅·집·나무·눈사람)
  // 장면은 미술 단위(구 반지름 = 100)로 그린다. 장면 배율 SC 로 키우고 YS 만큼 위로 올려, 집이 구의 아래 절반을 채우게 한다
  const SC = 1.22, YS = -9;
  const U = v => Math.round(v * s * SC);          // 길이 · x
  const V = v => Math.round((v + YS) * s * SC);   // y 위치
  const toU = c => c / (s * SC), toV = c => c / (s * SC) - YS; // 칸 → 미술 단위
  function buildInside() {
    backC = canvas(D, D); midC = canvas(D, D);
    // 땅 높이(구 안 좌표 y, 가운데 0) — 가운데가 살짝 솟은 눈 둔덕
    ground = new Float32Array(D); pile = new Float32Array(D); cap = new Float32Array(D);
    const gU = xu => 34 - 7 * Math.exp(-(((xu + 4) / 40) ** 2)) + 1.2 * Math.sin(xu / 9);
    for (let i = 0; i < D; i++) {
      const xu = toU(i - R);
      ground[i] = V(gU(xu));
      cap[i] = (Math.abs(xu) > 50 ? 7 : 3) * s; // 집·눈사람 앞은 낮게 쌓인다(창을 덮지 않게)
      pile[i] = cap[i] * rand(0.35, 0.6);
    }
    const bk = backC.getContext("2d"), id = bk.createImageData(D, D), d = id.data;
    const hillU = xu => 14 + 5 * Math.sin(xu / 17 + 1.3) + 3 * Math.sin(xu / 7);
    for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
      if (!inside(x, y)) continue;
      const o = (y * D + x) * 4, xu = toU(x - R), yu = toV(y - R);
      const k = clamp(Math.round((y / D) * 9 + dith(x, y)), 0, 9) / 9;
      let c = mix(C.skyTop, C.skyBot, k);
      const hill = hillU(xu);
      if (yu > hill) c = (yu - hill) * s * SC < 1.2 ? C.hillEdge : C.hill;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
    bk.putImageData(id, 0, 0);
    // 먼 언덕 위 작은 나무 실루엣
    bk.fillStyle = css(C.farTree);
    for (const xu of [-64, -57, -36, 44, 53, 66]) {
      const h = U(8), cx = R + U(xu), base = R + V(hillU(xu)) + 1;
      for (let r = 0; r < h; r++) { const hw = Math.floor((r / h) * U(2.8)); bk.fillRect(cx - hw, base - h + r, hw * 2 + 1, 1); }
    }
    // 구 안 하늘의 희미한 별
    bk.fillStyle = "rgba(220,230,255,.5)";
    for (let i = 0; i < R * 0.5; i++) { const x = (Math.random() * D) | 0, y = (Math.random() * R * 0.8) | 0; if (inside(x, y, R - 4)) bk.fillRect(x, y, 1, 1); }

    const m = midC.getContext("2d");
    // 땅(눈): 위는 밝고 유리 바닥 쪽으로 푸르게 가라앉는다. 창 앞만 조금 따뜻하게
    const gid = m.createImageData(D, D), g = gid.data;
    const deep = hex("#6f7fa6"), winsU = [[-20, 30], [6, 30]];
    for (let x = 0; x < D; x++) for (let y = Math.max(0, Math.floor(R + ground[x])); y < D; y++) {
      if (!inside(x, y)) continue;
      const o = (y * D + x) * 4, depth = (y - R - ground[x]) / Math.max(1, R * 0.74 - ground[x]);
      const lvl = clamp(Math.round(depth * 5 + dith(x, y)), 0, 5) / 5;
      let c = lvl < 0.5 ? mix(C.snow, C.snowShade, lvl * 2) : mix(C.snowShade, deep, (lvl - 0.5) * 2);
      const xu = toU(x - R), yu = toV(y - R);
      for (const [wx, wy] of winsU) { const dx = (xu - wx) / 8, dy = (yu - wy) / 3.2, w = Math.exp(-(dx * dx + dy * dy)); if (w > 0.45 + dith(x, y) * 0.5) c = mix(c, C.snowWarm, 0.45); }
      // 문에서 앞으로 난 발자국
      if (Math.abs(xu + 7.5 + Math.sin(yu / 3) * 1.5) < 1.1 && yu > 31 && yu < 52 && ((Math.round(yu / 2.2) & 1) === 0)) c = mix(c, C.snowShade, 0.8);
      g[o] = c[0]; g[o + 1] = c[1]; g[o + 2] = c[2]; g[o + 3] = 255;
    }
    m.putImageData(gid, 0, 0);
    const R0 = (xu, yu, wu, hu, col) => { m.fillStyle = css(col); m.fillRect(R + U(xu), R + V(yu), Math.max(1, U(xu + wu) - U(xu)), Math.max(1, V(yu + hu) - V(yu))); };
    const tri = (cxu, topu, botu, halfu, col) => { // 아래로 넓어지는 삼각형
      m.fillStyle = css(col); const t0 = R + V(topu), t1 = R + V(botu), cx = R + U(cxu);
      for (let y = t0; y <= t1; y++) { const hw = Math.round(((y - t0) / Math.max(1, t1 - t0)) * halfu * s * SC); m.fillRect(cx - hw, y, hw * 2 + 1, 1); }
    };
    // 나무(뒤 → 앞): [가운데 x, 밑 y, 높이, 반폭]
    lights = [];
    const pines = [[-48, 35, 34, 14], [33, 32, 48, 18], [49, 35, 24, 9]];
    for (const [cxu, by, hu, wu] of pines) {
      R0(cxu - 1.5, by - 6, 3, 3.2, C.trunk); // 줄기는 눈 위로 조금만(밑동은 눈에 묻힌다)
      const tiers = 3;
      for (let k = 0; k < tiers; k++) {
        const top = by - hu + k * hu * 0.24, bot = by - 5 - (tiers - 1 - k) * hu * 0.16, half = wu * (0.62 + k * 0.19);
        tri(cxu, top, bot, half, C.pine);
        tri(cxu + half * 0.18, top + (bot - top) * 0.25, bot, half * 0.55, C.pineDark); // 오른쪽 그늘
        tri(cxu - half * 0.15, top + (bot - top) * 0.15, top + (bot - top) * 0.55, half * 0.35, C.pineLit);
        // 가지 끝 눈: 단마다 아랫단 가장자리에 흰 띠 + 꼭대기 눈 모자
        m.fillStyle = css(C.snow);
        const yb = R + V(bot), hw = Math.round(half * s * SC);
        m.fillRect(R + U(cxu) - hw, yb - 1, hw * 2 + 1, 1);
        m.fillStyle = css(C.snowShade); m.fillRect(R + U(cxu) + Math.round(hw * 0.3), yb - 1, Math.round(hw * 0.7) + 1, 1);
        tri(cxu, top - 0.4, top + (bot - top) * 0.18, half * 0.18, C.snow);
        for (let j = 0; j < 3 + k; j++) lights.push([R + U(cxu + rand(-0.75, 0.75) * half * ((j + 1) / (4 + k))), R + V(top + (bot - top) * rand(0.45, 0.85)), LIGHTS[(j + k) % LIGHTS.length], Math.random() * 6.28]);
      }
      lights.push([R + U(cxu), R + V(by - hu) - 1, "#fff3b0", 0]); // 꼭대기 별
    }
    // 통나무 집: 몸 x -28..12, y 6..29
    R0(-28, 6, 40, 23, C.log);
    for (let yu = 8.5; yu < 29; yu += 2.6) R0(-28, yu, 40, 0.7, C.logDark);
    R0(-28, 6, 1.4, 23, C.logDark); R0(10.6, 6, 1.4, 23, C.logDark);
    // 창 둘(불 켜짐) + 문(화환)
    winGlow = [];
    for (const wx of [-24, 2]) {
      R0(wx - 1, 11, 10, 10, C.winFrame);
      R0(wx, 12, 8, 8, C.win);
      R0(wx + 0.8, 12.8, 3, 3, C.winHot);
      R0(wx + 3.5, 12, 1, 8, C.winFrame); R0(wx, 15.5, 8, 1, C.winFrame);
      R0(wx - 1.5, 20.5, 11, 1.4, C.snow); // 창턱 눈
      winGlow.push([wx + 4, 16]);
    }
    R0(-12, 13, 9, 16, C.door); R0(-11, 14, 7, 15, hex("#422a16")); R0(-5.6, 21, 1, 1, C.gold);
    m.fillStyle = css(C.wreath); // 화환(고리)
    const wcx = R + U(-7.5), wcy = R + V(18), wr = Math.max(2, U(2.3));
    for (let a = 0; a < 6.28; a += 0.15) m.fillRect(Math.round(wcx + Math.cos(a) * wr), Math.round(wcy + Math.sin(a) * wr), 1, 1);
    m.fillStyle = css(C.bow); m.fillRect(wcx - 1, wcy + wr - 1, 3, 1);
    // 지붕(박공) + 지붕 눈 + 처마 눈 + 굴뚝
    tri(-8, -15, 8, 25, C.roof);
    tri(-8, -16.5, 1, 21, C.snow);
    tri(-8, -16.5, 1, 21 * 0.5, hex("#ffffff"));
    R0(-33, 6.4, 50, 1.6, C.snow);
    m.fillStyle = css(C.snowShade);
    for (let xu = -31; xu <= 15; xu += 3.3) m.fillRect(R + U(xu), R + V(8), Math.max(1, U(1.6)), Math.max(1, V(8 + 1 + ((Math.round(xu * 7) % 3) + 3) % 3 * 0.7) - V(8)));
    R0(3, -16, 6, 14, C.chimney); R0(3, -16, 1.2, 14, hex("#6e4230")); R0(2.4, -17.6, 7.2, 2, C.snow);
    chim = [R + U(6), R + V(-18)];
    // 눈사람 x 16..24
    const snowball = (cxu, cyu, ru) => {
      const cx = R + U(cxu), cy = R + V(cyu), r = Math.max(2, U(ru));
      for (let dy = -r; dy <= r; dy++) { const hw = Math.round(Math.sqrt(r * r - dy * dy)), sh = Math.round(hw * 0.35); m.fillStyle = css(C.snow); m.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); if (dy > -r * 0.3) { m.fillStyle = css(C.snowShade); m.fillRect(cx + sh, cy + dy, hw - sh + 1, 1); } }
    };
    snowball(19, 26, 5); snowball(19, 18.5, 3.6);
    R0(17.4, 17.4, 1, 1, C.coal); R0(19.8, 17.4, 1, 1, C.coal); R0(19, 19, 3, 0.9, C.carrot);
    R0(15.6, 21.4, 7, 1.3, C.scarf); R0(20.4, 22, 1.3, 3, C.scarf);
    // 집 밑 눈 더미(집이 눈에 묻힌 자리)
    for (let xu = -32; xu <= 16; xu += 0.5) { const yb = toV(ground[clamp(R + U(xu), 0, D - 1)]); R0(xu, yb - 2.4 - Math.abs(Math.sin(xu / 3)) * 1.1, 0.6, 3, C.snow); }
    // 구 밖은 지운다
    clipCircle(m); clipCircle(bk);
  }
  function clipCircle(c2) {
    const mk = canvas(D, D), k = mk.getContext("2d"); k.fillStyle = "#fff";
    for (let y = 0; y < D; y++) { const dy = y - R, hw = Math.floor(Math.sqrt(Math.max(0, (R - 1) ** 2 - dy * dy))); if ((R - 1) ** 2 - dy * dy >= 0) k.fillRect(R - hw, y, hw * 2 + 1, 1); }
    c2.globalCompositeOperation = "destination-in"; c2.drawImage(mk, 0, 0); c2.globalCompositeOperation = "source-over";
  }

  // ---------------------------------------------------------------- 유리: 테두리·두께 그늘·반사
  function buildGlass() {
    glassC = canvas(D, D);
    const g = glassC.getContext("2d"), id = g.createImageData(D, D), d = id.data;
    for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
      const dx = x - R, dy = y - R, r = Math.hypot(dx, dy);
      if (r > R + 0.5) continue;
      const o = (y * D + x) * 4, ang = Math.atan2(dy, dx), lit = 0.5 - 0.5 * Math.cos(ang + 2.36); // 왼쪽 위가 밝다(0 → 1)
      let c = null, a = 0;
      if (r > R - 1.2) { c = mix([60, 72, 110], [200, 215, 245], lit); a = 0.55 + 0.35 * lit; } // 테두리 한 칸
      else if (r > R - 1.2 - 4 * Math.max(1, s)) { // 유리 두께: 안쪽 가장자리가 짙어진다(굴절 느낌)
        const k = (r - (R - 1.2 - 4 * Math.max(1, s))) / (4 * Math.max(1, s));
        if (k + dith(x, y) * 0.35 > 0.25) { c = [8, 14, 30]; a = 0.18 + 0.22 * k; }
      }
      // 큰 반사: 왼쪽 위 초승달
      const deg = (ang * 180) / Math.PI;
      if (r > R * 0.76 && r < R * 0.87 && deg > -165 && deg < -112) {
        const mid = 1 - Math.abs((deg + 138) / 26), band = 1 - Math.abs((r / R - 0.815) / 0.055);
        if (mid * band + dith(x, y) * 0.5 > 0.3) { c = [255, 255, 255]; a = 0.55 * Math.min(1, mid * band * 1.6); }
      }
      // 작은 반사: 오른쪽 아래 따뜻한 띠(방 불빛)
      if (r > R * 0.86 && r < R * 0.91 && deg > 18 && deg < 52 && dith(x, y) > -0.2) { c = [255, 214, 160]; a = 0.22; }
      if (c) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = Math.round(a * 255); }
    }
    g.putImageData(id, 0, 0);
    // 반짝 점
    // 작은 십자 반짝임(초승달 끝). 둥근 점은 달로 읽혀서 쓰지 않는다
    const sx = Math.round(R - R * 0.62), sy = Math.round(R - R * 0.2), arm = Math.max(1, Math.round(R * 0.02));
    g.fillStyle = "rgba(255,255,255,.9)"; g.fillRect(sx, sy, 1, 1);
    g.fillStyle = "rgba(255,255,255,.45)"; g.fillRect(sx - arm, sy, arm * 2 + 1, 1); g.fillRect(sx, sy - arm, 1, arm * 2 + 1);
  }

  // ---------------------------------------------------------------- 받침: 금 고리 + 나무 몸 + 금 띠 + 명판(글자 없음)
  function buildBase() {
    const top = Math.round(R * 0.775), h = Math.round(R * 0.84) - top + bh + 1;
    baseC = canvas(D, h); baseOff = top;
    const b = baseC.getContext("2d");
    const row = (y, hw, col) => { b.fillStyle = css(col); b.fillRect(R - hw, y, hw * 2 + 1, 1); };
    const collarH = Math.round(R * 0.84) - top;
    for (let y = 0; y < collarH; y++) { // 금 고리: 구의 현 폭에서 시작
      const yy = top + y, hw = Math.round(Math.sqrt(Math.max(0, R * R - yy * yy))) + 1;
      row(y, hw, y === 0 ? C.goldLit : y === collarH - 1 ? C.goldDark : C.gold);
    }
    for (let y = 0; y < bh; y++) { // 나무 몸: 아래로 넓어지는 사다리꼴, 왼쪽 빛·오른쪽 그늘
      const yy = collarH + y, f = y / Math.max(1, bh - 1), hw = Math.round(R * (0.76 + 0.12 * f));
      row(yy, hw, C.wood);
      b.fillStyle = css(C.woodLit); b.fillRect(R - hw, yy, Math.max(1, Math.round(hw * 0.12)), 1);
      b.fillStyle = css(C.woodDark); b.fillRect(R + hw - Math.max(1, Math.round(hw * 0.2)), yy, Math.max(1, Math.round(hw * 0.2)) + 1, 1);
      if (y === Math.round(bh * 0.18) || y === bh - 3) row(yy, hw, C.gold);
      if (y === bh - 1) row(yy, hw, C.woodDark);
    }
    const pw = Math.round(R * 0.2), ph = Math.max(2, Math.round(R * 0.07)), py = collarH + Math.round(bh * 0.42);
    b.fillStyle = css(C.goldDark); b.fillRect(R - pw - 1, py - 1, pw * 2 + 3, ph + 2);
    b.fillStyle = css(C.gold); b.fillRect(R - pw, py, pw * 2 + 1, ph);
    b.fillStyle = css(C.goldLit); b.fillRect(R - pw, py, pw * 2 + 1, 1);
  }

  // ---------------------------------------------------------------- 눈
  function addFlake(x, y, vx, vy, z, age) {
    if (n >= NMAX) return;
    fx[n] = x; fy[n] = y; fvx[n] = vx; fvy[n] = vy; fz[n] = z; fa[n] = age; n++;
  }
  function seedSnow() { // 처음부터 펑펑 오는 중이게: 구 안 아무 데나
    for (let i = 0; i < target; i++) {
      const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * (R - 3), x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (y > ground[clamp(Math.round(x + R), 0, D - 1)] - 1) { i--; continue; }
      addFlake(x, y, 0, rand(3, 8) * s, Math.random(), 9);
    }
  }
  function spawnTop() { // 구 윗부분에서 새로 내린다(나이 0 → 0.35초 동안 흐리게 나타남)
    const y = -R * rand(0.55, 0.92), hw = Math.sqrt(Math.max(0, (R - 3) ** 2 - y * y));
    addFlake(rand(-hw, hw), y, rand(-2, 2) * s, rand(2, 6) * s, Math.random(), 0);
  }
  /** 흔들기: 쌓인 눈과 바닥의 눈을 띄우고 소용돌이를 건다. k = 0..1 */
  function stir(k, dirx = 0, diry = -1) {
    swirl = Math.min(1.6, swirl + k * 1.2);
    if (dirx) spin = dirx > 0 ? 1 : -1;
    const inner = R - 3;
    const lift = (i, depth) => { // i 칸 지표에서 한 알 띄운다(유리 밖 칸은 건너뛴다 — 가장자리에 기둥처럼 붙는다)
      const x = i - R, y = ground[i] - pile[i] - depth;
      if (x * x + y * y > inner * inner) return;
      addFlake(x, y, (rand(-60, 60) + dirx * 50) * s * k, (rand(-150, -60) + diry * 30) * s * k, Math.random(), 1); // 구 절반 높이까지 솟는다
    };
    for (let i = 0; i < D; i++) { // 쌓인 눈을 70% 까지 걷어 올린다
      const take = pile[i] * k * 0.7, cnt = Math.round(take / (0.05 * s));
      pile[i] -= take;
      for (let j = 0; j < cnt && n < NMAX; j++) lift(i, rand(0, take));
    }
    for (let j = Math.round(NMAX * 0.45 * k); j > 0 && n < NMAX; j--) lift((Math.random() * D) | 0, 0); // 바닥 눈도 일어난다
    for (let i = 0; i < n; i++) { fvx[i] += rand(-60, 60) * s * k + dirx * 40 * s * k; fvy[i] += rand(-80, 20) * s * k + diry * 25 * s * k; }
  }

  function step(dt) {
    t += dt;
    // 구 위치 용수철 — 끄는 동안은 손을 따라가고, 놓으면 출렁이다 선다
    const k = 110, c = 10;
    const ax = -k * (ox - tox) - c * ovx, ay = -k * (oy - toy) - c * ovy;
    ovx += ax * dt; ovy += ay * dt; ox += ovx * dt; oy += ovy * dt;
    const lim = R * 0.09; ox = clamp(ox, -lim, lim); oy = clamp(oy, -lim * 0.6, lim * 0.6);
    // 구가 가속하면 안의 눈은 반대로 밀린다(관성)
    const amag = Math.hypot(ax, ay);
    if (amag > 900 * s) { const kk = Math.min(1, (amag - 900 * s) / (6000 * s)) * dt * 4; if (kk > 0.002) stir(kk, -Math.sign(ax) * 0.5, -0.6); }
    swirl = Math.max(0, swirl - dt * 0.3); // 약 4초에 걸쳐 가라앉는다
    // 새 눈: 조용할 땐 절반
    const want = Math.round(target * (quiet ? 0.5 : 1) * (Q < 1 ? 0.5 : 1));
    spawnAcc += dt * want / 9; // 9초쯤이면 한 알이 다 내린다
    while (spawnAcc >= 1) { spawnAcc--; if (n < want) spawnTop(); }
    const fall = 9 * s, inner = R - 2;
    for (let i = n - 1; i >= 0; i--) {
      const z = fz[i]; fa[i] += dt;
      // 바람: 줄마다 다른 사인 흔들림. 흔든 뒤엔 구 안을 도는 소용돌이(유리를 따라 돌아 한쪽에 눌어붙지 않는다) + 잔물결
      const sw = Math.min(1, swirl), vs = swirl * 42 * s * spin;
      const wx = Math.sin(fy[i] * 0.06 / s + t * 0.8 + z * 9) * 4 * s - (fy[i] / R) * vs + swirl * Math.sin(fy[i] * 0.11 / s + t * 3.1) * 12 * s;
      const wy = (fx[i] / R) * vs + swirl * Math.cos(fx[i] * 0.11 / s + t * 2.7) * 10 * s;
      const vt = fall * (0.55 + 0.75 * z) * (1 - 0.8 * sw); // 소용돌이가 센 동안은 잘 안 가라앉는다
      fvx[i] += (wx - fvx[i]) * Math.min(1, (1.6 - 0.7 * sw) * dt); // 흔든 직후엔 덜 끌려 멀리 날아간다
      fvy[i] += (vt + wy - fvy[i]) * Math.min(1, (1.1 - 0.4 * sw) * dt);
      fx[i] += fvx[i] * dt; fy[i] += fvy[i] * dt;
      // 유리에 닿으면 안으로 되민다
      const r2 = fx[i] * fx[i] + fy[i] * fy[i];
      if (r2 > inner * inner) {
        const r = Math.sqrt(r2), nx = fx[i] / r, ny = fy[i] / r, vn = fvx[i] * nx + fvy[i] * ny;
        fx[i] = nx * inner; fy[i] = ny * inner;
        if (vn > 0) { fvx[i] -= 1.3 * vn * nx; fvy[i] -= 1.3 * vn * ny; }
      }
      // 땅(쌓인 눈 위)에 닿으면 쌓인다
      const col = clamp(Math.round(fx[i] + R), 0, D - 1);
      if (fy[i] >= ground[col] - pile[col] && fvy[i] > 0) {
        if (pile[col] < cap[col]) pile[col] += 0.05 * s;
        n--; fx[i] = fx[n]; fy[i] = fy[n]; fvx[i] = fvx[n]; fvy[i] = fvy[n]; fz[i] = fz[n]; fa[i] = fa[n];
      }
    }
    // 쌓인 눈을 이웃과 고르게(0.2초마다)
    relaxAcc += dt;
    if (relaxAcc > 0.2) {
      relaxAcc = 0;
      for (let i = 1; i < D - 1; i++) pile[i] = Math.min(cap[i], pile[i] * 0.6 + (pile[i - 1] + pile[i + 1]) * 0.2);
    }
    // 굴뚝 연기
    if (Math.random() < dt * (Q < 1 ? 2 : 4)) smoke.push([chim[0] - R + rand(-1, 1), chim[1] - R, rand(-1, 1) * s, -rand(3, 5) * s, 0, rand(2.6, 3.8)]);
    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i]; p[4] += dt; p[2] += (Math.sin(t * 0.7 + i) * 2 * s - p[2]) * dt * 0.5; p[0] += p[2] * dt; p[1] += p[3] * dt;
      if (p[4] > p[5] || p[0] * p[0] + p[1] * p[1] > (R - 3) ** 2) smoke.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- 그리기
  const bucket = [[], [], [], []]; // 먼 · 가운데 · 가까운(2×2) · 막 생김
  function draw() {
    const X = gx + Math.round(ox) - R, Y = gy + Math.round(oy) - R; // 구 정적 층의 왼쪽 위
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(bgC, 0, 0);
    // 전구 줄
    for (const [x, y, col, ph] of bulbs) { ctx.fillStyle = Math.sin(t * 1.1 + ph) > -0.35 ? col : "#3a2a2a"; ctx.fillRect(x, y, 2, 2); }
    ctx.drawImage(backC, X, Y);
    for (const b of bucket) b.length = 0;
    for (let i = 0; i < n; i++) { const z = fz[i]; if (z < 0.35) bucket[fa[i] < 0.35 ? 3 : 0].push(i); }
    drawFlakes(X + R, Y + R, true);
    ctx.drawImage(midC, X, Y);
    // 쌓인 눈
    ctx.fillStyle = css(C.snow);
    for (let i = 0; i < D; i++) {
      const h = Math.round(pile[i]); if (h <= 0) continue;
      const yTop = Math.round(R + ground[i] - pile[i]);
      if (!inside(i, yTop) && !inside(i, yTop + h)) continue;
      ctx.fillRect(X + i, Y + yTop, 1, h);
    }
    // 나무 전구·창 불빛 깜빡임은 번짐 층이 맡고, 여기선 점만
    for (const [x, y, col, ph] of lights) { ctx.fillStyle = Math.sin(t * 1.7 + ph * 3) > -0.4 ? col : "#203a2e"; ctx.fillRect(X + x, Y + y, 1, 1); }
    // 연기
    for (const p of smoke) { const a = Math.min(1, p[4] * 2) * (1 - p[4] / p[5]); ctx.globalAlpha = 0.35 * a; ctx.fillStyle = css(C.smoke); const sz = p[4] > 1.6 ? 2 : 1; ctx.fillRect(X + R + Math.round(p[0]), Y + R + Math.round(p[1]), sz, sz); }
    ctx.globalAlpha = 1;
    for (const b of bucket) b.length = 0;
    for (let i = 0; i < n; i++) { const z = fz[i]; if (z >= 0.35) bucket[fa[i] < 0.35 ? 3 : z > 0.82 ? 2 : 1].push(i); }
    drawFlakes(X + R, Y + R, false);
    ctx.drawImage(glassC, X, Y);
    ctx.drawImage(baseC, X, Y + R + baseOff);
    drawGlow(X, Y);
  }
  function drawFlakes(cx, cy) {
    for (let b = 0; b < 4; b++) {
      const list = bucket[b]; if (!list.length) continue;
      ctx.fillStyle = b === 3 ? SNOW_COL[0] : SNOW_COL[b === 2 ? 2 : b];
      const sz = b === 2 ? 2 : 1;
      for (const i of list) ctx.fillRect(Math.round(cx + fx[i]), Math.round(cy + fy[i]), sz, sz);
    }
  }
  function drawGlow(X, Y) {
    if (Q < 1) return;
    const g = gctx; g.clearRect(0, 0, gl.width, gl.height);
    g.globalCompositeOperation = "lighter";
    const blob = (x, y, r, rgb, a) => { const gd = g.createRadialGradient(x / 2, y / 2, 0, x / 2, y / 2, r / 2); gd.addColorStop(0, `rgba(${rgb},${a})`); gd.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gd; g.fillRect(x / 2 - r / 2, y / 2 - r / 2, r, r); };
    // 구 안 달빛 기운 + 탁자 위 따뜻한 빛 웅덩이
    blob(X + R, Y + R, R * 2.3, "120,150,220", 0.1);
    blob(X + R, gy + R * 1.2, R * 2.2, "255,190,120", 0.08);
    // 창 불빛(조금씩 일렁인다)
    for (const [wx, wy] of winGlow) blob(X + R + U(wx), Y + R + V(wy), 20 * s, "255,196,110", 0.42 + 0.06 * Math.sin(t * 5.3 + wx));
    for (const [x, y, col, ph] of lights) if (Math.sin(t * 1.7 + ph * 3) > -0.4) blob(X + x, Y + y, 4 * s + 4, hex(col).join(","), 0.28);
    for (const [x, y, col, ph] of bulbs) if (Math.sin(t * 1.1 + ph) > -0.35) blob(x + 1, y + 1, 16, hex(col).join(","), 0.45);
    g.globalCompositeOperation = "source-over";
  }

  // ================================================================ 밀도 2판 — 같은 장면을 촘촘한 칸으로 다시 그린다(cols 있을 때만)
  // 정적 층은 칸마다 「도형 거리(sdf) → 덮임 세 단계 → 재질 램프(디더)」로 찍는다. 한 번만 그리고 프레임마다는 눈·빛만 그린다.
  let k = 1, q = 1, bulbSprites = null, glints = []; // k: 구 안 미술 단위 → 칸 · q: 방 배율(① 데스크톱 R 120 = 1)
  function Paint(w, h) {
    const img = new ImageData(w, h), d = img.data;
    return {
      img, d,
      put(x, y, c, a = 1) { // 색 c 를 덮임 a 로 찍는다(투명 칸이면 그 덮임이 곧 알파)
        x |= 0; y |= 0;
        if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return;
        const o = (y * w + x) * 4, A = d[o + 3] / 255;
        if (a >= 1 || A === 0) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = a >= 1 ? 255 : Math.round(255 * a); return; }
        d[o] += (c[0] - d[o]) * a; d[o + 1] += (c[1] - d[o + 1]) * a; d[o + 2] += (c[2] - d[o + 2]) * a;
        d[o + 3] = Math.round(255 * (A + a * (1 - A)));
      },
    };
  }
  /** 구 안 도형 하나. sdf(xu, yu) = 미술 단위 거리(안쪽 음수), shade(xu, yu, x, y) = 색(null 이면 비움). 상자는 미술 단위 */
  function fillU(P, x0, y0, x1, y1, sdf, shade) {
    const xa = Math.max(0, Math.floor(R + x0 * k) - 1), xb = Math.min(D - 1, Math.ceil(R + x1 * k) + 1);
    const ya = Math.max(0, Math.floor(R + (y0 + YS) * k) - 1), yb = Math.min(D - 1, Math.ceil(R + (y1 + YS) * k) + 1);
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const xu = (x - R) / k, yu = (y - R) / k - YS, dd = sdf(xu, yu) * k;
      if (dd >= 0.5) continue;
      const a = covq(0.5 - dd); if (!a) continue;
      const c = shade(xu, yu, x, y); if (c) P.put(x, y, c, a);
    }
  }

  // ---------------------------------------------------------------- 방(2판): 벽지 결 · 탁자 널 · 부드러운 그림자 · 전구
  function buildRoomHD() {
    bgC = canvas(W, H); const P = Paint(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let c;
      if (y < tableY) { // 벽: 위가 어둡고 가장자리로 가라앉는다 + 아주 옅은 세로 벽지 줄
        const vx = x / W - 0.5;
        let l = Math.pow(y / tableY, 1.3) * 0.9 + 0.05 - vx * vx * 0.5 + (vnoise(x / (5 * q), y / (9 * q)) - 0.5) * 0.05;
        if (fr(x / (16 * q)) < 0.06) l += 0.05;
        c = rampAt(RP.wall, l, x, y);
      } else if (y - tableY < Math.max(1, Math.round(1.6 * q))) c = rampAt(RP.table, 0.98, x, y); // 탁자 앞 모서리 빛
      else { // 탁자 면: 가로 널, 앞으로 갈수록 이음매가 벌어진다(원근) · 나뭇결 물결
        const ty = (y - tableY) / Math.max(1, H - tableY), seam = fr(Math.log(1 + (y - tableY) / (6 * q)) * 2.2) < 0.06;
        const l = 0.78 - ty * 0.75 + Math.sin((x * 0.012 / q + vnoise(x * 0.01 / q, y * 0.12 / q) * 3) * 6.283) * 0.05 + (vnoise(x * 0.04 / q, y * 0.4 / q) - 0.5) * 0.08 - (seam ? 0.3 : 0);
        c = rampAt(RP.table, l, x, y);
      }
      P.put(x, y, c);
    }
    const sw = R * 1.08, sh = Math.max(2, R * 0.075), sy = baseTop + bh - 1; // 받침 그림자: 가장자리를 디더로 푼 타원
    for (let y = Math.floor(sy - sh - 2); y <= Math.ceil(sy + sh + 2); y++) for (let x = Math.floor(gx - sw - 2); x <= Math.ceil(gx + sw + 2); x++) {
      const e = Math.hypot((x - gx) / sw, (y - sy) / sh); if (e > 1.15) continue;
      const a = Math.min(0.6, (1.15 - e) * 0.85);
      if (a + dith(x, y) * 0.25 > 0.12) P.put(x, y, [0, 0, 0], a);
    }
    bulbs = []; // 전구 줄: 덮임으로 그린 늘어진 선 + 전구 자리
    const swags = W > H ? 3 : 2, top = Math.max(3, Math.round(H * 0.035)), sag = Math.max(6, Math.round(H * 0.07)), step = Math.max(9, Math.round(W / (swags * 9)));
    const wireY = x => { const f = fr((x / W) * swags); return top + sag * 4 * f * (1 - f); };
    for (let x = 0; x < W; x++) { const yf = wireY(x), yi = Math.floor(yf), f = yf - yi; P.put(x, yi, RP.wire[1], covq(1 - f)); P.put(x, yi + 1, RP.wire[1], covq(f)); }
    for (let x = 4; x < W; x += step) bulbs.push([x, Math.round(wireY(x)) + 1, LIGHTS[bulbs.length % LIGHTS.length], Math.random() * 6.28]);
    bgC.getContext("2d").putImageData(P.img, 0, 0);
    // 전구 그림(켜짐·꺼짐): 소켓 + 물방울 유리 + 반짝 점
    bulbSprites = {};
    const bw = Math.max(2, Math.round(1.3 * q)), bv = Math.max(3, Math.round(2.1 * q)), sk = Math.max(1, Math.round(0.8 * q));
    for (const col of LIGHTS) {
      bulbSprites[col] = [true, false].map(on => {
        const sp = canvas(bw * 2 + 1, sk + bv * 2 + 1), P2 = Paint(sp.width, sp.height), cc = hex(col);
        for (let y = 0; y < sk; y++) for (let x = bw - Math.ceil(bw * 0.6); x <= bw + Math.ceil(bw * 0.6); x++) P2.put(x, y, [52, 44, 48]);
        for (let y = sk; y < sp.height; y++) for (let x = 0; x < sp.width; x++) {
          const ny = (y + 0.5 - sk - bv) / bv, rx = (bw + 0.4) * (0.75 + 0.25 * clamp(ny + 0.6, 0, 1)), nx = (x + 0.5 - bw - 0.5) / rx, e = nx * nx + ny * ny;
          if (e > 1.15) continue;
          const lit = clamp(0.8 - nx * 0.35 - ny * 0.25, 0, 1);
          const c = on ? mix(cc, [255, 255, 255], nx < -0.2 && ny < -0.2 ? 0.55 : 0.12 * lit) : mix(cc, [10, 6, 8], 0.72 - lit * 0.1);
          P2.put(x, y, c, e > 0.85 ? 0.62 : 1);
        }
        sp.getContext("2d").putImageData(P2.img, 0, 0);
        return sp;
      });
    }
  }

  // ---------------------------------------------------------------- 구 안(2판): 하늘·언덕 → 땅 → 나무 → 통나무 집 → 눈사람
  function buildInsideHD() {
    backC = canvas(D, D); midC = canvas(D, D);
    ground = new Float32Array(D); pile = new Float32Array(D); cap = new Float32Array(D);
    const gU = xu => 34 - 7 * Math.exp(-(((xu + 4) / 40) ** 2)) + 1.2 * Math.sin(xu / 9); // ①과 같은 땅
    for (let i = 0; i < D; i++) {
      const xu = (i - R) / k;
      ground[i] = (gU(xu) + YS) * k;
      cap[i] = (Math.abs(xu) > 50 ? 7 : 3) * s;
      pile[i] = cap[i] * rand(0.35, 0.6);
    }
    const hillU = xu => 14 + 5 * Math.sin(xu / 17 + 1.3) + 3 * Math.sin(xu / 7);
    const farU = xu => hillU(xu) - 6 + 2.5 * Math.sin(xu / 11 + 2);
    // 뒤 층: 하늘(7단 램프) · 별 · 먼 언덕 · 가까운 언덕(능선은 달빛)
    const B = Paint(D, D);
    for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
      if (!inside(x, y)) continue;
      const xu = (x - R) / k, yu = (y - R) / k - YS;
      let c = rampAt(RP.sky, Math.pow(y / D, 1.15) * 1.05, x, y);
      const hs = hash(x * 1.3, y * 0.7);
      if (y < D * 0.5 && hs > 0.9965) c = mix(c, [220, 230, 255], 0.35 + (hs - 0.9965) * 180);
      const hf = farU(xu), hn = hillU(xu);
      let cov = covq(clamp((yu - hf) * k + 0.5, 0, 1));
      if (cov) c = mix(c, rampAt(RP.hillFar, 0.75 - clamp((yu - hf) / 10, 0, 1) * 0.6 + (vnoise(xu * 0.4, yu * 0.4) - 0.5) * 0.2, x, y), cov);
      cov = covq(clamp((yu - hn) * k + 0.5, 0, 1));
      if (cov) {
        const slope = hillU(xu + 0.5) - hillU(xu - 0.5);
        c = mix(c, rampAt(RP.hill, 0.85 - clamp((yu - hn) / 14, 0, 1) * 0.65 - slope * 0.25 + (vnoise(xu * 0.35, yu * 0.5) - 0.5) * 0.16, x, y), cov);
      }
      B.put(x, y, c);
    }
    for (const [sx, sy] of [[-40, -60], [25, -72], [55, -40], [-62, -30], [8, -50], [-18, -80]]) { // 십자 별 몇 개
      const cx = Math.round(R + sx * k), cy = Math.round(R + (sy + YS) * k), arm = Math.max(1, Math.round(0.5 * k));
      if (!inside(cx, cy, R - 6)) continue;
      for (let i = 1; i <= arm; i++) for (const [ax, ay] of [[i, 0], [-i, 0], [0, i], [0, -i]]) B.put(cx + ax, cy + ay, [180, 196, 240], i === arm ? 0.3 : 0.62);
      B.put(cx, cy, [235, 242, 255]);
    }
    for (const [xu0, hgt] of [[-70, 6], [-64, 8], [-57, 10], [-36, 7], [44, 9], [53, 11], [60, 7], [66, 8]]) { // 언덕 위 먼 나무
      const base = hillU(xu0) + 0.8, tp = base - hgt, hw = hgt * 0.36;
      fillU(B, xu0 - hw, tp, xu0 + hw, base, (x, y) => sdTri(x, y, xu0, tp, base, hw),
        (x, y, px, py) => rampAt(RP.farTree, 0.6 - ((x - xu0) / hw) * 0.4 + (fr((y - tp) * 1.2 - Math.abs(x - xu0) * 0.8) < 0.3 ? 0.3 : 0), px, py));
    }
    backC.getContext("2d").putImageData(B.img, 0, 0);

    // 가운데 층
    const M = Paint(D, D);
    // 땅: 표면은 달빛에 희고 유리 바닥 쪽으로 푸르게 · 창 앞은 따뜻하게 · 발자국 · 반짝이
    const warmAt = (xu, yu) => { let w = 0; for (const wx of [-20, 6]) { const dx = (xu - wx) / 9, dy = (yu - 31) / 3.6; w += Math.exp(-(dx * dx + dy * dy)); } return w; };
    for (let x = 0; x < D; x++) {
      const ys = R + ground[x], slope = (ground[Math.min(D - 1, x + 1)] - ground[Math.max(0, x - 1)]) / 2;
      for (let y = Math.max(0, Math.floor(ys)); y < D; y++) {
        if (!inside(x, y)) continue;
        const a = covq(clamp(y + 1 - ys, 0, 1)); if (!a) continue;
        const xu = (x - R) / k, yu = (y - R) / k - YS, depth = (y - ys) / Math.max(1, R * 0.74 - ground[x]);
        let l = 0.97 - depth * 0.95 - slope * 0.6 + (vnoise(xu * 0.5, yu * 1.2) - 0.5) * 0.08;
        const yc = 31 + Math.round((yu - 31) / 2.2) * 2.2, side = Math.round((yc - 31) / 2.2) % 2 ? 0.9 : -0.9;
        if (yc >= 31 && yc <= 52) { // 문에서 앞으로 난 발자국(왼발·오른발)
          const pxu = -7.5 - Math.sin(yc / 3) * 1.5 + side, e = Math.hypot((xu - pxu) / 0.72, (yu - yc) / 0.46);
          if (e < 1) l = e < 0.55 && yu < yc ? 0.38 : yu > yc ? 0.88 : 0.55;
        }
        let c = rampAt(RP.snow, l, x, y);
        const w = warmAt(xu, yu); if (w > 0.2) c = mix(c, rampAt(RP.snowWarm, clamp(l, 0, 1) * 0.7 + w * 0.35, x, y, 0.6), clamp(w * 0.55, 0, 0.45)); // 진하면 주황 웅덩이로 읽힌다
        if (depth < 0.25 && hash(x * 0.91, y * 1.37) > 0.994) c = [255, 255, 255];
        M.put(x, y, c, a);
      }
    }
    // 나무(뒤 → 앞): 아랫단부터 그려 윗단 가지 끝이 아랫단 위에 얹힌다. 가지 결·끝의 눈 모자·비탈의 눈 띠
    lights = [];
    for (const [cx, by, hu, wu] of [[-48, 35, 34, 14], [33, 32, 48, 18], [49, 35, 24, 9]]) {
      fillU(M, cx - 1.6, by - 7, cx + 1.6, by - 2.6, (x, y) => sdBox(x, y, cx - 1.4, by - 7, cx + 1.4, by - 2.8),
        (x, y, px, py) => rampAt(RP.bark, 0.55 - ((x - cx) / 1.4) * 0.35 + (fr(x * 1.7) < 0.3 ? -0.2 : 0), px, py));
      for (let kk = 2; kk >= 0; kk--) {
        const tp = by - hu + kk * hu * 0.24, bot = by - 5 - (2 - kk) * hu * 0.16, half = wu * (0.62 + kk * 0.19), hgt = bot - tp;
        const tipY = x => bot - 0.9 * Math.abs(Math.sin((x - cx) * 1.25)); // 늘어진 가지 끝
        fillU(M, cx - half - 1, tp - 1, cx + half + 1, bot + 1,
          (x, y) => Math.max(sdTri(x, y, cx, tp, bot + 2, half * (hgt + 2) / hgt), y - tipY(x)),
          (x, y, px, py) => {
            const dx = x - cx, t = (y - tp) / hgt, edge = half * t - Math.abs(dx), stri = fr((y - tp) * 0.8 - Math.abs(dx) * 0.5);
            // 눈: 가지 단 윗면에 덩이로(왼쪽 빛 받는 쪽이 더 많다) + 늘어진 가지 끝 모자. 비탈 테두리 전체를 두르면 흰 외곽선으로 읽힌다
            // 덩이는 가지 줄(stri) 윗면 바깥 절반에, 낮은 주파수 잡음으로 굵게 — 잘게 흩으면 떨어지는 눈과 섞여 가지 단이 안 읽힌다
            const row = Math.floor((y - tp) * 0.8 - Math.abs(dx) * 0.5), outer = Math.abs(dx) > half * t * 0.3;
            const snowy = (stri > 0.62 && stri < 0.8 && t > 0.08 && outer && vnoise(dx * 0.35 + row * 3.1, row * 1.7 + cx) > (dx < 0 ? 0.38 : 0.6)) || (edge < 0.3 && dx < 0 && t < 0.6) || (y > tipY(x) - 0.8 && Math.abs(Math.sin(dx * 1.25)) < 0.25);
            if (snowy) return rampAt(RP.snow, 0.94 - (dx / half) * 0.4 - (stri > 0.7 ? 0.15 : 0), px, py, 0.5);
            return rampAt(RP.pine, 0.64 - (dx / half) * 0.4 - (stri < 0.34 ? 0.3 : stri > 0.5 ? 0.08 : 0) + (vnoise(x * 1.6, y * 1.6) - 0.5) * 0.1 - t * 0.1, px, py, 0.45); // 가지 밑면은 짙게
          });
        for (let j = 0; j < 3 + kk; j++) {
          const dxr = (hash(cx + j * 3.1, kk * 7.7) * 2 - 1) * 0.72 * half * ((j + 1) / (4 + kk)), yr = tp + hgt * (0.45 + 0.4 * hash(j * 5.3, cx + kk));
          lights.push([Math.round(R + (cx + dxr) * k), Math.round(R + (yr + YS) * k), LIGHTS[(j + kk) % LIGHTS.length], hash(j, kk + cx) * 6.28]);
        }
      }
      const sx = Math.round(R + cx * k), sy = Math.round(R + (by - hu - 1 + YS) * k), arm = Math.max(1, Math.round(k * 0.9)); // 꼭대기 금별
      for (let i = -arm; i <= arm; i++) { const c = RP.gold[Math.abs(i) === arm ? 4 : 6]; M.put(sx + i, sy, c); M.put(sx, sy + i, c); }
      M.put(sx, sy, [255, 255, 240]);
      lights.push([sx, sy, "#fff3b0", 0]);
    }
    // 통나무 몸: 줄마다 원통 명암 · 틈 · 결 · 옹이. 땅(눈) 아래는 비운다
    const gAt = xu => ground[clamp(Math.round(R + xu * k), 0, D - 1)] / k - YS;
    fillU(M, -28, 6, 12, 29, (x, y) => sdBox(x, y, -28, 6, 12, 29), (x, y, px, py) => {
      if (y > gAt(x) + 0.4) return null;
      const row = Math.floor((y - 6) / 2.6), v = fr((y - 6) / 2.6);
      if (v > 0.88) return rampAt(RP.log, 0.05, px, py);
      let l = 0.78 - Math.abs(v - 0.3) * 1.25 - ((x + 28) / 40) * 0.12 + Math.sin(x * 0.9 + vnoise(x * 0.15, row * 3.7) * 6) * 0.05;
      const seg = Math.floor((x + 28) / 7), kx = seg * 7 - 28 + 3.5;
      if (hash(row * 2.1, seg) > 0.72 && Math.hypot((x - kx) * 0.9, (v - 0.45) * 2.6) < 0.55) l -= 0.3;
      return rampAt(RP.log, l, px, py);
    });
    for (let r = 0; r < 9; r++) for (const ex of [-28.6, 12.6]) { // 모서리 통나무 끝 나이테
      const cy = 6 + r * 2.6 + 1.3; if (cy > gAt(ex) - 0.2) continue;
      fillU(M, ex - 1.4, cy - 1.4, ex + 1.4, cy + 1.4, (x, y) => sdCirc(x, y, ex, cy, 1.2), (x, y, px, py) => {
        const d = Math.hypot(x - ex, y - cy); return rampAt(RP.logEnd, 0.85 - d * 0.35 - (fr(d * 2.4) < 0.3 ? 0.25 : 0) - (x - ex) * 0.12, px, py);
      });
    }
    // 창 둘: 틀 · 따뜻한 유리(가운데가 뜨겁다) · 커튼 · 서리 · 창살 · 창턱 눈
    winGlow = [];
    for (const wx of [-24, 2]) {
      fillU(M, wx - 1, 11, wx + 9, 21, (x, y) => sdBox(x, y, wx - 1, 11, wx + 9, 21), (x, y, px, py) => rampAt(RP.frame, 0.6 - ((x - wx + 1) / 10) * 0.3 - ((y - 11) / 10) * 0.3, px, py));
      fillU(M, wx, 12, wx + 8, 20, (x, y) => sdBox(x, y, wx, 12, wx + 8, 20), (x, y, px, py) => {
        if (y - 12 < 3.4 - Math.abs(x - wx) * 1.1 || y - 12 < 3.4 - Math.abs(x - wx - 8) * 1.1) return rampAt(RP.curtain, 0.7 - (y - 12) / 4, px, py);
        if (Math.hypot(x - wx, y - 20) < 1.3 || Math.hypot(x - wx - 8, y - 20) < 1.3) return rampAt(RP.snow, 0.85, px, py);
        return rampAt(RP.glass, 1 - Math.hypot(((x - wx - 4) / 4) * 0.9, (y - 16) / 4) * 0.75, px, py);
      });
      for (const [x0, y0, x1, y1] of [[wx + 3.55, 12, wx + 4.45, 20], [wx, 15.55, wx + 8, 16.45]]) fillU(M, x0, y0, x1, y1, (x, y) => sdBox(x, y, x0, y0, x1, y1), (x, y, px, py) => rampAt(RP.frame, 0.75, px, py));
      fillU(M, wx - 1.8, 20, wx + 9.8, 22.2, (x, y) => sdRBox(x, y, wx - 1.8, 20.2, wx + 9.8, 22, 0.9), (x, y, px, py) => rampAt(RP.snow, 0.95 - ((y - 20.2) / 1.8) * 0.5 - ((x - wx) / 12) * 0.15, px, py));
      winGlow.push([wx + 4, 16]);
    }
    // 문: 세로 널 · 경첩 · 손잡이 · 화환(바늘잎·열매) · 리본
    fillU(M, -12, 13, -3, 29, (x, y) => sdBox(x, y, -12, 13, -3, 29), (x, y, px, py) => (y > gAt(x) + 0.4 ? null : rampAt(RP.frame, 0.5, px, py)));
    fillU(M, -11.2, 13.8, -3.8, 29, (x, y) => sdBox(x, y, -11.2, 13.8, -3.8, 29), (x, y, px, py) => {
      if (y > gAt(x) + 0.4) return null;
      if ((Math.abs(y - 16) < 0.45 || Math.abs(y - 26) < 0.45) && x < -8.5) return rampAt(RP.coal, 0.7, px, py);
      const pl = fr((x + 11.2) / 1.85);
      return rampAt(RP.door, 0.62 - (pl > 0.9 ? 0.35 : 0) + (pl < 0.12 ? 0.12 : 0) + (vnoise(x * 1.6, y * 0.35) - 0.5) * 0.3 - ((y - 14) / 15) * 0.15, px, py);
    });
    fillU(M, -5.8, 20.8, -4.4, 22.2, (x, y) => sdCirc(x, y, -5.1, 21.5, 0.45), (x, y, px, py) => rampAt(RP.gold, 0.8 - (x + 5.1) * 0.8, px, py));
    fillU(M, -10.6, 15, -4.4, 21, (x, y) => Math.abs(Math.hypot(x + 7.5, y - 18) - 2.15) - 0.75, (x, y, px, py) =>
      hash(px * 1.7, py * 2.3) > 0.9 ? [226, 52, 58] : rampAt(RP.pine, 0.55 - Math.sin(Math.atan2(y - 18, x + 7.5) + 0.8) * 0.25 + (vnoise(px * 0.9, py * 0.9) - 0.5) * 0.5, px, py));
    fillU(M, -9.2, 19.2, -5.8, 23.2, (x, y) => Math.min(sdCirc(x, y, -7.5, 20.4, 0.55), sdSeg(x, y, -7.5, 20.4, -8.6, 19.6, 0.42), sdSeg(x, y, -7.5, 20.4, -6.4, 19.6, 0.42), sdSeg(x, y, -7.5, 20.6, -8.2, 22.8, 0.28), sdSeg(x, y, -7.5, 20.6, -6.8, 22.8, 0.28)),
      (x, y, px, py) => rampAt(RP.scarf, 0.75 - ((y - 19.6) / 3.5) * 0.45, px, py));
    // 지붕(처마 판·기와 줄) → 두툼한 지붕 눈(왼쪽 비탈이 빛) → 처마 눈 띠 → 고드름
    fillU(M, -34, -16, 18, 8.5, (x, y) => sdTri(x, y, -8, -15, 8, 25), (x, y, px, py) => {
      const edge = 25 * ((y + 15) / 23) - Math.abs(x + 8);
      return rampAt(RP.roof, edge < 0.8 ? 0.95 : 0.45 - (y > 6.4 ? 0.3 : 0) - (fr((y + 15) / 1.6) < 0.2 ? 0.2 : 0), px, py);
    });
    fillU(M, -30, -18, 14, 2.2, (x, y) => sdTri(x, y, -8, -16.6, 1.2, 21) - 0.3, (x, y, px, py) =>
      rampAt(RP.snow, (x < -8 ? 0.98 : 0.8) - ((y + 16.6) / 17.8) * 0.25 - (y > 0.2 ? 0.25 : 0) + (vnoise(x * 0.8, y * 0.8) - 0.5) * 0.08, px, py, 0.3));
    fillU(M, -34, 6, 18, 8.6, (x, y) => sdRBox(x, y, -33.4, 6.2, 17.4, 8.2, 0.9), (x, y, px, py) => rampAt(RP.snow, 0.94 - ((y - 6.2) / 2) * 0.45, px, py, 0.5));
    for (let xu = -31.5; xu <= 15.5; xu += 2.15) {
      const len = 0.9 + hash(xu * 3.3, 1.7) * 2.2;
      fillU(M, xu - 0.5, 8, xu + 0.5, 8 + len, (x, y) => Math.max(Math.abs(x - xu) - 0.42 * (1 - (y - 8) / len), 8 - y, y - 8 - len),
        (x, y, px, py) => rampAt(RP.ice, 0.85 - (x - xu) * 0.9 - ((y - 8) / len) * 0.3, px, py));
    }
    // 굴뚝: 엇갈린 벽돌 · 줄눈 · 눈 모자
    fillU(M, 3, -16, 9, -2, (x, y) => sdBox(x, y, 3, -16, 9, -2), (x, y, px, py) => {
      const row = Math.floor((y + 16) / 1.3), v = fr((y + 16) / 1.3), bx = (x - 3 + (row % 2) * 1.3) / 2.6;
      if (v < 0.16 || fr(bx) < 0.08) return rampAt(RP.mortar, 0.5 - ((x - 3) / 6) * 0.4, px, py);
      return rampAt(RP.brick, 0.75 - ((x - 3) / 6) * 0.55 + (hash(row, Math.floor(bx)) - 0.5) * 0.3 - (v > 0.8 ? 0.15 : 0), px, py);
    });
    fillU(M, 2, -18.6, 10, -15.2, (x, y) => sdRBox(x, y, 2.3, -18.2, 9.7, -15.6, 1.1), (x, y, px, py) => rampAt(RP.snow, 0.98 - ((y + 18.2) / 2.6) * 0.4 - ((x - 2.3) / 7.4) * 0.2, px, py));
    chim = [Math.round(R + 6 * k), Math.round(R + (-18 + YS) * k)];
    // 집 밑 눈 더미
    fillU(M, -33, 22, 18, 33, (x, y) => { const yb = gAt(x); return Math.max(yb - 2.4 - Math.abs(Math.sin(x / 3)) * 1.1 - y, y - yb - 0.6, -32 - x, x - 16.6); },
      (x, y, px, py) => rampAt(RP.snow, 0.95 - (y - gAt(x) + 2.4) / 3 * 0.3 - (x > 0 ? 0.08 : 0), px, py));
    // 눈사람: 바닥 그림자 → 공 둘(구 명암 + 집 쪽 따뜻한 테) → 단추·눈 · 당근 · 나뭇가지 팔 · 줄무늬 목도리
    fillU(M, 13, 29.5, 26, 32.5, (x, y) => (Math.hypot((x - 19.5) / 5.8, (y - 31) / 1.3) - 1) * 1.3, (x, y, px, py) => rampAt(RP.snow, 0.42, px, py));
    const ball = (cx, cy, r) => fillU(M, cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1, (x, y) => sdCirc(x, y, cx, cy, r), (x, y, px, py) => {
      const nx = (x - cx) / r, ny = (y - cy) / r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const c = rampAt(RP.snow, 0.42 + 0.58 * clamp(-0.55 * nx - 0.6 * ny + 0.58 * nz, 0, 1), px, py);
      return nx < -0.55 && ny > -0.4 ? mix(c, rampAt(RP.snowWarm, 0.8, px, py), 0.5) : c;
    });
    ball(19, 26, 5); ball(19, 18.5, 3.6);
    for (const [cx, cy, r] of [[19, 23.6, 0.42], [19, 25.6, 0.42], [19, 27.6, 0.42], [17.7, 17.7, 0.45], [20.2, 17.7, 0.45]])
      fillU(M, cx - 1, cy - 1, cx + 1, cy + 1, (x, y) => sdCirc(x, y, cx, cy, r), (x, y, px, py) => rampAt(RP.coal, 0.4 - (x - cx), px, py));
    fillU(M, 18.6, 18.2, 23.2, 20.2, (x, y) => { const t = (x - 19.1) / 3.6; return Math.max(Math.abs(y - 19.1 - t * 0.35) - 0.55 * (1 - t), 19.1 - x, x - 22.7); },
      (x, y, px, py) => rampAt(RP.carrot, 0.8 - ((y - 18.8) / 1.2) * 0.6, px, py));
    fillU(M, 10.5, 19.5, 15.2, 25, (x, y) => Math.min(sdSeg(x, y, 14.6, 24.2, 11.4, 20.6, 0.32), sdSeg(x, y, 12.4, 21.7, 11.3, 22.2, 0.25)), (x, y, px, py) => rampAt(RP.stick, 0.6, px, py));
    fillU(M, 23, 19.5, 27.5, 25, (x, y) => Math.min(sdSeg(x, y, 23.4, 24.2, 26.6, 20.8, 0.32), sdSeg(x, y, 25.6, 21.9, 26.8, 22.5, 0.25)), (x, y, px, py) => rampAt(RP.stick, 0.45, px, py));
    fillU(M, 15, 20.6, 23, 23, (x, y) => sdRBox(x, y, 15.5, 21, 22.5, 22.6, 0.7), (x, y, px, py) =>
      fr((x - 15.5) / 1.6) < 0.28 ? rampAt(RP.scarfStripe, 0.7, px, py) : rampAt(RP.scarf, 0.8 - ((y - 21) / 1.6) * 0.5 - ((x - 15.5) / 7) * 0.2, px, py));
    fillU(M, 20, 21.8, 22, 26.2, (x, y) => sdBox(x, y, 20.3, 22, 21.6, 25.6), (x, y, px, py) =>
      y > 25 && fr(x * 2.2) < 0.4 ? null : fr((y - 22) / 1.6) < 0.28 ? rampAt(RP.scarfStripe, 0.5, px, py) : rampAt(RP.scarf, 0.55, px, py));
    // 구 밖은 지운다(유리 테가 덮는 자리)
    for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) if (!inside(x, y)) M.d[(y * D + x) * 4 + 3] = 0;
    midC.getContext("2d").putImageData(M.img, 0, 0);
    // 눈 위 반짝이(프레임마다 몇 개가 반짝인다) — 집 앞 땅에만
    glints = [];
    for (let i = 0; i < 40 * q; i++) {
      const x = Math.floor(rand(0.1, 0.9) * D), y = Math.round(R + ground[x] + rand(1, R * 0.3));
      if (inside(x, y, R - 3) && (y - R) / k - YS > 31) glints.push([x, y, rand(1.5, 3.5), rand(0, 6.28)]);
    }
  }

  // ---------------------------------------------------------------- 유리(2판): 덮임 테 · 두께 그늘 · 창 모양 반사 · 긴 호 · 반짝임
  function buildGlassHD() {
    glassC = canvas(D, D); const G = Paint(D, D), rim = 1.6 * q, band = 5 * q;
    for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
      const dx = x - R, dy = y - R, r = Math.hypot(dx, dy); if (r > R + 0.8) continue;
      const ang = Math.atan2(dy, dx), deg = ang * 57.2958, lit = 0.5 - 0.5 * Math.cos(ang + 2.36), rn = r / R;
      let c = null, a = 0;
      if (r > R - rim - 0.5) { c = mix([34, 44, 80], [214, 226, 250], lit); a = (0.5 + 0.4 * lit) * covq(clamp(R + 0.5 - r, 0, 1)); }
      else if (r > R - rim - band) { const t = (r - (R - rim - band)) / band; if (t + dith(x, y) * 0.4 > 0.2) { c = [6, 10, 26]; a = 0.12 + 0.3 * t; } }
      else if (rn > 0.8) { c = [170, 190, 230]; a = (0.05 * (rn - 0.8)) / 0.2; } // 가장자리 차가운 빛
      if (deg > -158 && deg < -116 && rn > 0.62 && rn < 0.86) { // 방 창이 비친 네 칸 반사 — 옅게(진하면 회색 X 로 읽힌다)
        const onBar = Math.abs(deg + 137) < 2.4 || Math.abs(rn - 0.74) < 0.018;
        const k2 = Math.min(1, Math.min((Math.min(deg + 158, -116 - deg) / 42) * 2, Math.min(rn - 0.62, 0.86 - rn) / 0.12) * 3);
        if (!onBar && dith(x, y) + 0.5 < 0.45 * k2 + 0.1) { c = [235, 242, 255]; a = 0.1 * k2 + 0.03; }
      }
      if (rn > 0.895 && rn < 0.915 && deg > -175 && deg < -95) { c = [255, 255, 255]; a = 0.5 * Math.sin(((deg + 175) / 80) * Math.PI); }
      if (rn > 0.89 && rn < 0.91 && deg > 12 && deg < 46 && dith(x, y) > -0.25) { c = [255, 214, 160]; a = 0.24; }
      if (c && a > 0.01) G.put(x, y, c, a);
    }
    for (const [fx0, fy0, arm] of [[-0.62, -0.2, 2], [-0.36, -0.66, 1]]) { // 십자 반짝임
      const cx = Math.round(R + fx0 * R), cy = Math.round(R + fy0 * R), L = Math.max(1, Math.round(arm * q));
      for (let i = 1; i <= L; i++) for (const [ax, ay] of [[i, 0], [-i, 0], [0, i], [0, -i]]) G.put(cx + ax, cy + ay, [255, 255, 255], i === L ? 0.3 : 0.62);
      G.put(cx, cy, [255, 255, 255], 0.95);
    }
    glassC.getContext("2d").putImageData(G.img, 0, 0);
  }

  // ---------------------------------------------------------------- 받침(2판): 원통 금속 고리 · 호두나무 결 · 빗면 · 금 띠 · 명판
  function buildBaseHD() {
    const top = Math.round(R * 0.775), h = Math.round(R * 0.84) - top + bh + 1, collarH = Math.round(R * 0.84) - top;
    baseC = canvas(D, h); baseOff = top; const P = Paint(D, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < D; x++) {
      const X = x - R;
      if (y < collarH) { // 금 고리: 원통이라 왼쪽 가운데에 굵은 빛 띠, 위 모서리 빛·아래 그늘·가운데 새김 줄
        const yy = top + y, hw = Math.sqrt(Math.max(0, R * R - yy * yy)) + 1.2, cov = covq(clamp(hw + 0.5 - Math.abs(X), 0, 1)); if (!cov) continue;
        const u = X / hw, v = y / Math.max(1, collarH - 1);
        const l = 0.5 + 0.45 * Math.exp(-(((u + 0.38) / 0.16) ** 2)) + 0.2 * Math.exp(-(((u - 0.55) / 0.1) ** 2)) - 0.3 * u * u + (v < 0.18 ? 0.25 : v > 0.82 ? -0.3 : 0) - (Math.abs(v - 0.5) < 0.08 ? 0.18 : 0);
        P.put(x, y, rampAt(RP.gold, l, x, y), cov);
      } else { // 나무 몸: 사다리꼴 옆면 덮임 · 결 물결 · 위 빗면 빛 · 아래 그늘 · 금 띠 둘
        const yb = y - collarH, f = yb / Math.max(1, bh - 1), hw = R * (0.76 + 0.12 * f), cov = covq(clamp(hw + 0.5 - Math.abs(X), 0, 1)); if (!cov) continue;
        const u = X / hw, bandW = Math.max(0.6, q * 0.9);
        if (Math.abs(yb - bh * 0.18) < bandW || Math.abs(yb - (bh - 3 * q)) < bandW) { P.put(x, y, rampAt(RP.gold, 0.62 - u * 0.35 + 0.25 * Math.exp(-(((u + 0.4) / 0.2) ** 2)), x, y), cov); continue; }
        let l = 0.55 - u * 0.32 + Math.sin((X * 0.045 / q + vnoise((X * 0.02) / q, (yb * 0.25) / q) * 4) * 6.283) * 0.08 + (vnoise((X * 0.15) / q, (yb * 0.08) / q) - 0.5) * 0.1 - (f > 0.9 ? 0.35 : 0) + (yb < q * 1.2 ? 0.25 : 0);
        if (Math.abs(u) > 0.93) l += u < 0 ? 0.25 : -0.25;
        P.put(x, y, rampAt(RP.wood, l, x, y), cov);
      }
    }
    const pw = R * 0.2, ph = Math.max(2, R * 0.07), py0 = collarH + bh * 0.42, bev = 1.2 * q; // 명판(글자 없음)
    for (let y = Math.floor(py0 - bev - 1); y <= Math.ceil(py0 + ph + bev + 1); y++) for (let x = Math.floor(R - pw - bev - 1); x <= Math.ceil(R + pw + bev + 1); x++) {
      const d = sdRBox(x, y, R - pw - bev, py0 - bev, R + pw + bev, py0 + ph + bev, bev); if (d >= 0.5) continue;
      const inner = sdRBox(x, y, R - pw, py0, R + pw, py0 + ph, 0.6 * q);
      const l = inner > 0 ? ((x - R) / pw + (y - py0 - ph / 2) / (ph / 2) < 0 ? 0.92 : 0.25) : 0.62 - ((y - py0) / ph) * 0.3 + 0.2 * Math.exp(-((((x - R) / pw + 0.4) / 0.25) ** 2));
      P.put(x, y, rampAt(RP.gold, l, x, y), covq(0.5 - d));
    }
    for (const sx of [R - pw + 1.4 * q, R + pw - 1.4 * q]) P.put(Math.round(sx), Math.round(py0 + ph / 2), RP.gold[1]);
    baseC.getContext("2d").putImageData(P.img, 0, 0);
  }

  // ---------------------------------------------------------------- 그리기(2판)
  function drawHD() {
    const X = gx + Math.round(ox) - R, Y = gy + Math.round(oy) - R;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(bgC, 0, 0);
    for (const [x, y, col, ph] of bulbs) { const sp = bulbSprites[col][Math.sin(t * 1.1 + ph) > -0.35 ? 0 : 1]; ctx.drawImage(sp, x - (sp.width >> 1), y); }
    const by = Y + R + baseOff + baseC.height; // 탁자 광택: 받침이 거꾸로 옅게 비친다
    ctx.save(); ctx.globalAlpha = 0.12; ctx.translate(0, 2 * by); ctx.scale(1, -1); ctx.drawImage(baseC, X, Y + R + baseOff); ctx.restore();
    ctx.drawImage(backC, X, Y);
    for (const b of bucket) b.length = 0;
    for (let i = 0; i < n; i++) if (fz[i] < 0.35) bucket[fa[i] < 0.35 ? 3 : 0].push(i);
    drawFlakesHD(X + R, Y + R);
    ctx.drawImage(midC, X, Y);
    for (let i = 0; i < D; i++) { // 쌓인 눈: 윗칸은 흰빛, 몸은 땅 표면 색
      if (pile[i] < 0.35) continue;
      const yt = Math.floor(R + ground[i] - pile[i]), yg = Math.ceil(R + ground[i]);
      if (!inside(i, yt)) continue;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(X + i, Y + yt, 1, 1);
      if (yg - yt > 1) { ctx.fillStyle = "#f4f8fd"; ctx.fillRect(X + i, Y + yt + 1, 1, yg - yt - 1); }
    }
    const cross = q >= 1.3;
    for (const [x, y, col, ph] of lights) { // 전구: 켜지면 흰 심 + 제 색 십자
      if (Math.sin(t * 1.7 + ph * 3) > -0.4) {
        if (cross) { ctx.fillStyle = col; ctx.fillRect(X + x - 1, Y + y, 3, 1); ctx.fillRect(X + x, Y + y - 1, 1, 3); }
        ctx.fillStyle = cross ? "#fffbe8" : col; ctx.fillRect(X + x, Y + y, 1, 1);
      } else { ctx.fillStyle = "#1c3328"; ctx.fillRect(X + x, Y + y, 1, 1); }
    }
    ctx.fillStyle = "#ffffff";
    for (const [x, y, f, ph] of glints) if (Math.sin(t * f + ph) > 0.93) { ctx.fillRect(X + x, Y + y, 1, 1); if (cross) { ctx.globalAlpha = 0.5; ctx.fillRect(X + x - 1, Y + y, 3, 1); ctx.fillRect(X + x, Y + y - 1, 1, 3); ctx.globalAlpha = 1; } }
    ctx.fillStyle = css(C.smoke); // 연기: 디더 둥근 뭉치가 커지며 옅어진다
    for (const p of smoke) {
      const a = Math.min(1, p[4] * 2) * (1 - p[4] / p[5]), rr = Math.round((0.6 + p[4] * 0.9) * q), cx = X + R + Math.round(p[0]), cy = Y + R + Math.round(p[1]);
      ctx.globalAlpha = 0.3 * a;
      for (let dy = -rr; dy <= rr; dy++) { const hw = Math.round(Math.sqrt(rr * rr - dy * dy)); ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); }
    }
    ctx.globalAlpha = 1;
    for (const b of bucket) b.length = 0;
    for (let i = 0; i < n; i++) { const z = fz[i]; if (z >= 0.35) bucket[fa[i] < 0.35 ? 3 : z > 0.82 ? 2 : 1].push(i); }
    drawFlakesHD(X + R, Y + R);
    ctx.drawImage(glassC, X, Y);
    ctx.drawImage(baseC, X, Y + R + baseOff);
    drawGlowHD(X, Y);
  }
  const SNOW_HD = ["#7d90ba", "#dbe4f3", "#ffffff", "#7d90ba"]; // 먼 · 가운데 · 가까운 · 막 생김
  function drawFlakesHD(cx, cy) {
    const plus = q >= 1.3;
    for (let b = 0; b < 4; b++) {
      const list = bucket[b]; if (!list.length) continue;
      if (b === 2) { // 가까운 눈: 십자(팔은 중간색, 가운데 흰빛) — 둥근 눈송이를 칸으로 찍은 꼴
        if (plus) { ctx.fillStyle = "#b9c8e4"; for (const i of list) { const x = Math.round(cx + fx[i]), y = Math.round(cy + fy[i]); ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); } }
        ctx.fillStyle = "#ffffff"; const sz = plus ? 1 : 2;
        for (const i of list) ctx.fillRect(Math.round(cx + fx[i]), Math.round(cy + fy[i]), sz, sz);
        continue;
      }
      ctx.fillStyle = SNOW_HD[b];
      for (const i of list) ctx.fillRect(Math.round(cx + fx[i]), Math.round(cy + fy[i]), 1, 1);
    }
  }
  function drawGlowHD(X, Y) {
    if (Q < 1) return;
    const g = gctx; g.clearRect(0, 0, gl.width, gl.height);
    g.globalCompositeOperation = "lighter";
    const blob = (x, y, r, rgb, a) => { const gd = g.createRadialGradient(x / 2, y / 2, 0, x / 2, y / 2, r / 2); gd.addColorStop(0, `rgba(${rgb},${a})`); gd.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gd; g.fillRect(x / 2 - r / 2, y / 2 - r / 2, r, r); };
    blob(X + R, Y + R, R * 2.3, "120,150,220", 0.1);
    blob(X + R, gy + R * 1.2, R * 2.2, "255,190,120", 0.08);
    for (const [wx, wy] of winGlow) blob(X + R + wx * k, Y + R + (wy + YS) * k, 20 * s, "255,196,110", 0.42 + 0.06 * Math.sin(t * 5.3 + wx));
    for (const [x, y, col, ph] of lights) if (Math.sin(t * 1.7 + ph * 3) > -0.4) blob(X + x, Y + y, 4 * s + 4 * q, hex(col).join(","), 0.28);
    for (const [x, y, col, ph] of bulbs) if (Math.sin(t * 1.1 + ph) > -0.35) blob(x, y + 3 * q, 16 * q, hex(col).join(","), 0.45);
    g.globalCompositeOperation = "source-over";
  }

  // ---------------------------------------------------------------- 돌리기
  function frame(now) {
    const real = last ? (now - last) / 1000 : 1 / 60; last = now;
    const dt = Math.min(0.05, real);
    ema = ema * 0.95 + Math.min(100, real * 1000) * 0.05;
    slowFor = ema > 24 ? slowFor + real : 0;
    if (Q === 1 && slowFor > 2) { Q = 0.5; gl.style.display = "none"; host.dataset.q = "low"; }
    const a = performance.now();
    step(dt); render();
    jsMs = jsMs * 0.95 + (performance.now() - a) * 0.05; // 프레임당 계산 시간(ms) — 검사가 host.dataset.js 로 읽는다(불꽃놀이 원본과 같은 자리)
    if (++frames % 30 === 0) host.dataset.js = jsMs.toFixed(2);
    raf = requestAnimationFrame(frame);
  }
  function still() { // 움직임 줄이기: 내리는 중인 한 장면
    for (let i = 0; i < 30; i++) step(1 / 30);
    render();
  }
  function render() { if (HD) drawHD(); else draw(); }

  // 누르기·끌기 = 흔들기. 키보드는 Space·Enter
  const cell = e => [e.clientX / cellCss, e.clientY / cellCss];
  function onDown(e) {
    if (reduce) return;
    cv.setPointerCapture?.(e.pointerId); cv.style.cursor = "grabbing";
    const [x, y] = cell(e); drag = { x, y, t: performance.now(), moved: 0 };
  }
  function onMove(e) {
    if (!drag) return;
    const [x, y] = cell(e), dx = x - drag.x, dy = y - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    tox = clamp(dx * 0.35, -R * 0.09, R * 0.09); toy = clamp(dy * 0.25, -R * 0.05, R * 0.05);
  }
  function onUp() {
    if (!drag) return;
    if (drag.moved < 3) { const a = rand(0, 6.283); ovx += Math.cos(a) * 80 * s; ovy += Math.sin(a) * 40 * s; stir(0.75, Math.cos(a), -1); } // 톡 누름
    drag = null; tox = 0; toy = 0; cv.style.cursor = "grab";
  }
  function onKey(e) { if (!reduce && (e.key === " " || e.key === "Enter")) { e.preventDefault(); ovx += 60 * s; stir(0.55, 1, -1); } }
  // 폰 흔들기: 권한 창이 필요 없는 브라우저에서만(iOS 는 권한 창이 떠서 쓰지 않는다)
  const DME = typeof window !== "undefined" ? window.DeviceMotionEvent : undefined;
  const motionOK = !!DME && typeof DME.requestPermission !== "function";
  let lastShake = 0;
  function onMotion(e) {
    const a = e.acceleration; if (!a || a.x == null) return;
    const m = Math.hypot(a.x, a.y, a.z || 0), now = performance.now();
    if (m > 14 && now - lastShake > 400) { lastShake = now; ovx += clamp(-a.x, -1, 1) * 60 * s; stir(Math.min(1, m / 30), clamp(-a.x / 10, -1, 1), -1); }
  }
  function onVis() {
    if (reduce) return;
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
  }
  function onResize() { layout(); if (reduce) still(); }

  layout();
  addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVis);
  if (reduce) still(); // 번짐은 움직임이 아니라 남긴다(한 장으로 그린다)
  else {
    cv.addEventListener("pointerdown", onDown); cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp); cv.addEventListener("pointercancel", onUp);
    addEventListener("keydown", onKey);
    if (motionOK) addEventListener("devicemotion", onMotion);
    raf = requestAnimationFrame(frame);
  }
  if (opts.mode === "intro" && opts.onIntroEnd) setTimeout(opts.onIntroEnd, 0); // intro 는 불꽃놀이만 뜻이 있다 — 계약상 바로 부른다

  return {
    stop() {
      cancelAnimationFrame(raf); raf = 0;
      removeEventListener("resize", onResize); document.removeEventListener("visibilitychange", onVis);
      removeEventListener("keydown", onKey); removeEventListener("devicemotion", onMotion);
      cv.remove(); gl.remove(); delete host.dataset.q; delete host.dataset.js;
    },
    setQuiet(on) { quiet = !!on; },
    // 검사용(계약 밖): 알갱이 수·품질·흔들기
    _probe: () => ({ n, NMAX, Q, R, W, H, PX, gx, gy, tableY, cols: opts.cols || 0, k: HD ? k : 0, pile: pile.reduce((a, b) => a + b, 0) / D, swirl }),
    _shake: (k = 0.8) => { ovx += 70 * s; stir(k, 1, -1); },
  };
}
