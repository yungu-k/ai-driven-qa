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

export function mount(host, opts = {}) {
  const reduce = opts.reduce ?? (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let quiet = false;

  const cv = document.createElement("canvas"), gl = document.createElement("canvas");
  cv.style.cssText = "position:absolute;left:0;top:0;image-rendering:pixelated;image-rendering:crisp-edges;touch-action:none;cursor:grab";
  gl.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;mix-blend-mode:screen;filter:blur(6px);opacity:.9";
  host.appendChild(cv); host.appendChild(gl);
  const ctx = cv.getContext("2d"), gctx = gl.getContext("2d");

  // 화면 · 배치
  let PX, W, H, R, s, D, gx, gy, tableY, bh, baseTop;
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
    PX = clamp(Math.round(innerWidth / 640), 2, 4);
    W = Math.ceil(innerWidth / PX); H = Math.ceil(innerHeight / PX);
    R = Math.floor(Math.min(W * 0.42, H * 0.3, 210));
    s = R / 100; D = 2 * R + 1;
    bh = Math.round(R * 0.3);
    tableY = Math.round(Math.min(H * 0.86, H * 0.54 + 1.08 * R));
    baseTop = tableY - bh + Math.round(R * 0.05); // 받침 아래가 탁자 면에 조금 들어와 「놓인」 자리
    gy = baseTop - Math.round(R * 0.84);
    gx = Math.round(W / 2);
    cv.width = W; cv.height = H; cv.style.width = W * PX + "px"; cv.style.height = H * PX + "px";
    gl.width = Math.ceil(W / 2); gl.height = Math.ceil(H / 2); gl.style.width = W * PX + "px"; gl.style.height = H * PX + "px";
    NMAX = Math.round(clamp(Math.PI * R * R * 0.034, 260, 2200));
    target = Math.round(NMAX * 0.6);
    fx = new Float32Array(NMAX); fy = new Float32Array(NMAX); fvx = new Float32Array(NMAX); fvy = new Float32Array(NMAX);
    fz = new Float32Array(NMAX); fa = new Float32Array(NMAX); n = 0;
    smoke.length = 0;
    buildRoom(); buildInside(); buildGlass(); buildBase();
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

  // ---------------------------------------------------------------- 돌리기
  function frame(now) {
    const real = last ? (now - last) / 1000 : 1 / 60; last = now;
    const dt = Math.min(0.05, real);
    ema = ema * 0.95 + Math.min(100, real * 1000) * 0.05;
    slowFor = ema > 24 ? slowFor + real : 0;
    if (Q === 1 && slowFor > 2) { Q = 0.5; gl.style.display = "none"; host.dataset.q = "low"; }
    const a = performance.now();
    step(dt); draw();
    jsMs = jsMs * 0.95 + (performance.now() - a) * 0.05; // 프레임당 계산 시간(ms) — 검사가 host.dataset.js 로 읽는다(불꽃놀이 원본과 같은 자리)
    if (++frames % 30 === 0) host.dataset.js = jsMs.toFixed(2);
    raf = requestAnimationFrame(frame);
  }
  function still() { // 움직임 줄이기: 내리는 중인 한 장면
    for (let i = 0; i < 30; i++) step(1 / 30);
    draw();
  }

  // 누르기·끌기 = 흔들기. 키보드는 Space·Enter
  const cell = e => [e.clientX / PX, e.clientY / PX];
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
    _probe: () => ({ n, NMAX, Q, R, W, H, PX, gx, gy, tableY, pile: pile.reduce((a, b) => a + b, 0) / D, swirl }),
    _shake: (k = 0.8) => { ovx += 70 * s; stir(k, 1, -1); },
  };
}
