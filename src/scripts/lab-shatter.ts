// 로고 이스터에그 — 5초 꾹 누르면 블로그가 유리처럼 깨지고 /lab 으로 들어간다.
// 규격: docs/lab-arcade-spec.md B1–B4·C. 기준 구현: docs/lab-arcade-mock.html 의
// buildShards()·shatter()·showBoot(), 금(makeCells()·crackSvg()·growCracks())은 2판 docs/lab-crack-v2.html.
// 바뀐 점은 그 자리에 주석으로 적었다.
//
// 타임라인(누르기 시작 = 0):
//   1.5 s  /lab/ 미리 받기(<link rel=prefetch>)          — 흔들림은 CSS egg-charge 가 맡는다
//   3.0 s  꺾인 방사형 금이 1.25 s 동안 툭툭 45% 까지(흰 멍·거미줄·굵은 안쪽 금은 첫 0.2 s)
//   4.3 s  금 끝까지 + 고리 금·잔금 0.65 s, 파편을 미리 만들어 숨겨 둔다
//   5.0 s  깨짐(취소 불가) → 낙하 + 뒤에서 부팅 글자 → 마지막 조각이 나가면 /lab/
// 손을 떼거나 12px 넘게 움직이면 5초 전 어느 단계에서든 취소.

import { sfx, unlock } from "@/lab/sound";

const HOLD_MS = 5000;
const PREFETCH_AT = 1500;
const CRACK_AT = 3000;
const PREBUILD_AT = 4300;
const LAB_URL = "/lab/";
const FX = "lab-fx"; // 이 모듈이 body 에 붙이는 모든 것 — 정리할 때 이 클래스로 찾는다

/** 부팅 글자. src/lab/BootScreen.astro 와 같은 줄이어야 페이지 이동이 안 보인다(B4 match cut) */
const BOOT_LINES = [
  "AI-DRIVEN QA LAB  v1.0",
  "",
  "MEMORY CHECK ...... OK",
  "GAMES ............. 3",
  "",
  "PRESS START",
];

type Pt = [number, number];
type Geo = {
  cells: Pt[][];
  rayPts: Pt[][];
  cross: number[][];
  rings: Pt[][][];
  twigs: Pt[][][];
  web: Pt[][][];
  cx: number;
  cy: number;
};
type Piece = { el: HTMLDivElement; cx: number; cy: number; y0: number };
type Built = { stage: HTMLDivElement; pieces: Piece[] };

type Hold = {
  logo: HTMLAnchorElement;
  timers: number[];
  heldHref: string | null;
  fired: boolean;
  reduce: boolean;
  cx: number;
  cy: number;
  sx: number;
  sy: number;
  geo: Geo | null;
  svg: SVGSVGElement | null;
  built: Built | null;
};

let hold: Hold | null = null;

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// 화면 크기는 스크롤바를 뺀 값. position:fixed 무대가 덮는 넓이와 같아야 칸이 맞는다
// (html 이 overflow-y-scroll 이라 데스크톱에서 innerWidth 와 15px 쯤 다르다)
const viewW = () => document.documentElement.clientWidth || window.innerWidth;
const viewH = () => document.documentElement.clientHeight || window.innerHeight;

// B2 조각 수 상한: 좁거나 약한 기기는 고리 2 → 최대 12조각, 그 밖은 고리 3 → 최대 18조각
function shardGrid() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const narrow = window.innerWidth < 600;
  const weak =
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) ||
    (nav.hardwareConcurrency || 8) <= 4;
  return narrow || weak ? { rays: 6, rings: 2 } : { rays: 6, rings: 3 };
}

// ── 금 2판(B2 2판, Dean 10-27 「금이 너무 직선」) — 기준 구현 docs/lab-crack-v2.html 「옮길 부분」 ──
// 주 균열(방사선)은 꺾이며 뻗고, 고리 금은 호를 따라 출렁인다. 파편 칸은 이 꺾인 선을 그대로 쓴다.
// 잔금(twig)·거미줄(web)·흰 멍(haze)은 장식이라 칸과 무관하다.
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const polar = (cx: number, cy: number, r: number, a: number): Pt => [
  cx + Math.cos(a) * r,
  cy + Math.sin(a) * r,
];

// 칸 다각형이 스스로 꼬이면(변끼리 교차) 이웃 칸과 겹친다 → makeCells 가 꺾임을 줄여 다시 만든다.
// 시안 1차에서 실제로 났다(1280px, 격자 점이 칸 셋에 동시에 들어감)
function segX(a: Pt, b: Pt, c: Pt, d: Pt) {
  const o = (p: Pt, q: Pt, r: Pt) =>
    Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}
function isSimple(P: Pt[]) {
  const n = P.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // 이웃 변(첫·끝)은 꼭짓점을 같이 쓴다
      if (segX(P[i], P[(i + 1) % n], P[j], P[(j + 1) % n])) return false;
    }
  return true;
}

type Grid = { rays: number; rings: number };

function makeCells(cx: number, cy: number, grid: Grid): Geo {
  for (let wob = 1; wob > 0.05; wob *= 0.6) {
    const g = makeCellsOnce(cx, cy, grid, wob);
    if (g.cells.every(isSimple)) return g;
  }
  return makeCellsOnce(cx, cy, grid, 0); // 꺾임 0 = 1판과 같은 곧은 칸(항상 단순)
}

function makeCellsOnce(cx: number, cy: number, { rays, rings }: Grid, wob: number): Geo {
  const W = viewW();
  const H = viewH();
  const diag = Math.hypot(W, H);
  const far = diag * 2; // 바깥 칸이 화면 모서리까지 덮도록
  const corner = Math.max(
    ...([[0, 0], [W, 0], [0, H], [W, H]] as Pt[]).map(([x, y]) => Math.hypot(x - cx, y - cy))
  );
  const step = (Math.PI * 2) / rays;
  const base = Math.random() * step;
  const ang = Array.from({ length: rays }, (_, i) => base + i * step + rnd(-0.2, 0.2) * step);
  const maxDev = step * 0.2 * wob; // 방사선이 제 쐐기 밖으로 못 나간다 → 이웃과 안 엇갈림

  // 고리 반지름: 방사선마다 ±12% 흔들림. 맨 바깥은 far
  const ringR: number[][] = [];
  for (let k = 0; k < rings - 1; k++)
    ringR.push(ang.map(() => diag * (0.16 + 0.3 * k) * rnd(0.88, 1.12)));

  // 방사선 한 줄: 첫 마디 10–16px, 마디마다 1.25배(최대 110px). 꺾임은 「직전 꺾임의 40% + 새 흔들림」(지그재그)
  // 화면 밖(corner + 60)부터는 꺾을 필요가 없어 far 로 곧게 뻗는다
  const rayPts: Pt[][] = [];
  const cross: number[][] = [];
  ang.forEach((a0, i) => {
    const pts: Pt[] = [[cx, cy]];
    const cr: number[] = [];
    let r = 0;
    let seg = rnd(10, 16);
    let dev = 0;
    let k = 0;
    for (;;) {
      let rn = r + seg;
      const ringHere = k < rings - 1 && rn >= ringR[k][i];
      if (ringHere) rn = ringR[k][i];
      if (!ringHere && r > corner + 60) {
        pts.push(polar(cx, cy, far, a0 + dev));
        break;
      }
      const amp = (seg * 0.42 * wob) / Math.max(rn, 1); // 마디 길이의 42% 만큼 옆으로
      dev = Math.max(-maxDev, Math.min(maxDev, dev * 0.4 + rnd(-1, 1) * amp));
      pts.push(polar(cx, cy, rn, a0 + dev));
      if (ringHere) {
        cr.push(pts.length - 1);
        k++;
      }
      r = rn;
      seg = Math.min(seg * 1.25, 110); // 먼 데서도 110px 마다 한 번은 꺾인다
    }
    rayPts.push(pts);
    cross.push(cr);
  });

  // 고리 한 칸(방사선 i → i+1): 호 위 중간점 2개, 반지름 ±6% 흔들림
  const ringSeg = (k: number, i: number): Pt[] => {
    const j = (i + 1) % rays;
    const A = rayPts[i][cross[i][k]];
    const B = rayPts[j][cross[j][k]];
    const aA = Math.atan2(A[1] - cy, A[0] - cx);
    let aB = Math.atan2(B[1] - cy, B[0] - cx);
    while (aB < aA) aB += Math.PI * 2;
    const rA = Math.hypot(A[0] - cx, A[1] - cy);
    const rB = Math.hypot(B[0] - cx, B[1] - cy);
    const mid = [1, 2].map(t =>
      polar(cx, cy, (rA + ((rB - rA) * t) / 3) * (1 + rnd(-0.06, 0.06) * wob), aA + ((aB - aA) * t) / 3)
    );
    return [A, ...mid, B];
  };
  const ringRows: Pt[][][] = [];
  for (let k = 0; k < rings - 1; k++) ringRows.push(ang.map((_, i) => ringSeg(k, i)));

  // 칸: 방사선 i 의 한 구간 → 고리 → 방사선 i+1 거꾸로 → 안쪽 고리 거꾸로
  const slice = (i: number, from: number, to: number) => rayPts[i].slice(from, to + 1);
  const cells: Pt[][] = [];
  for (let k = 0; k < rings; k++)
    for (let i = 0; i < rays; i++) {
      const j = (i + 1) % rays;
      const iFrom = k === 0 ? 0 : cross[i][k - 1];
      const jFrom = k === 0 ? 0 : cross[j][k - 1];
      const iTo = k < rings - 1 ? cross[i][k] : rayPts[i].length - 1;
      const jTo = k < rings - 1 ? cross[j][k] : rayPts[j].length - 1;
      const outer =
        k < rings - 1
          ? ringRows[k][i].slice(1, -1)
          : [polar(cx, cy, far, (ang[i] + ang[j] + (j < i ? Math.PI * 2 : 0)) / 2)]; // 바깥: far 위 중간점 하나
      const inner = k === 0 ? [] : ringRows[k - 1][i].slice(1, -1).reverse();
      const poly = [...slice(i, iFrom, iTo), ...outer, ...slice(j, jFrom, jTo).reverse(), ...inner];
      if (k === 0) poly.pop(); // 충격점이 두 번 들어가지 않게
      cells.push(poly);
    }

  // 잔금: 방사선 꼭짓점(충격점에서 24px ~ 화면 안 60%) 중 35% 에서 25–50° 로 갈라진다. 방사선당 최대 3
  const twigs = rayPts.map(pts => {
    const out: Pt[][] = [];
    for (let n = 2; n < pts.length - 1 && out.length < 3; n++) {
      const [x, y] = pts[n];
      const d = Math.hypot(x - cx, y - cy);
      if (d < 24 || d > corner * 0.6 || Math.random() > 0.35) continue;
      const dir =
        Math.atan2(y - pts[n - 1][1], x - pts[n - 1][0]) +
        (Math.random() < 0.5 ? -1 : 1) * rnd(0.45, 0.85);
      const len = Math.hypot(x - pts[n - 1][0], y - pts[n - 1][1]) * rnd(0.5, 0.9);
      const m: Pt = [x + Math.cos(dir) * len * 0.55, y + Math.sin(dir) * len * 0.55];
      const dir2 = dir + rnd(-0.35, 0.35);
      out.push([[x, y], m, [m[0] + Math.cos(dir2) * len * 0.45, m[1] + Math.sin(dir2) * len * 0.45]]);
    }
    return out;
  });

  // 거미줄: 충격점 둘레 반지름 12·26px 두 바퀴, 칸마다 70% 확률로만(끊긴 거미줄)
  const web = [12, 26].map(R =>
    ang
      .map((a, i): Pt[] | null => {
        if (Math.random() > 0.7) return null;
        const b = ang[(i + 1) % rays] + (i === rays - 1 ? Math.PI * 2 : 0);
        return [
          polar(cx, cy, R * rnd(0.85, 1.15), a),
          polar(cx, cy, R * rnd(0.9, 1.25), (a + b) / 2),
          polar(cx, cy, R * rnd(0.85, 1.15), b),
        ];
      })
      .filter((s): s is Pt[] => s !== null)
  );

  return { cells, rayPts, cross, rings: ringRows, twigs, web, cx, cy };
}

const D = (pts: Pt[]) => "M" + pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L");

// 금: 종류별로 한 path 에 여러 획을 묶고 그림자·빛 두 겹. 굵기는 종류별(Header.astro .lab-crack)
// path 수 = (안쪽 6 + 바깥 6 + 잔금 ≤6 + 고리 (고리 수 − 1) + 거미줄 ≤2) × 2 → 고리 2 에서 42, 고리 3 에서 44
function crackSvg(geo: Geo): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", `${FX} lab-crack`);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", String(viewW()));
  svg.setAttribute("height", String(viewH()));
  // 충격점 흰 멍(유리가 하얗게 바스러진 자리). 다크에서 특히 「맞았다」가 보인다
  svg.innerHTML =
    `<defs><radialGradient id="lab-haze"><stop offset="0" stop-color="#fff" stop-opacity=".55"/>` +
    `<stop offset=".45" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
    `<circle class="haze" cx="${geo.cx}" cy="${geo.cy}" r="34" fill="url(#lab-haze)"/>`;
  const add = (d: string, kind: string, ray?: number) => {
    for (const cls of ["sh", "hl"]) {
      const p = document.createElementNS(ns, "path");
      p.setAttribute("d", d);
      p.setAttribute("class", cls);
      p.setAttribute("pathLength", "1");
      p.style.strokeDasharray = "1";
      p.style.strokeDashoffset = "1";
      p.dataset.kind = kind;
      if (ray !== undefined) p.dataset.ray = String(ray);
      svg.appendChild(p);
    }
  };
  geo.rayPts.forEach((pts, i) => {
    const c0 = geo.cross[i][0] ?? pts.length - 1;
    add(D(pts.slice(0, c0 + 1)), "near", i); // 충격점 → 첫 고리: 굵게
    // 그 바깥: 가늘게. 마지막 점(far, 화면 한참 밖)은 칸에만 쓰고 그리지 않는다 —
    // 그리면 path 길이의 절반 넘게가 화면 밖이라 「45% 까지」가 실제론 화면 끝에 닿는다
    add(D(pts.slice(c0, -1)), "far", i);
    if (geo.twigs[i].length) add(geo.twigs[i].map(D).join(" "), "twig", i);
  });
  geo.rings.forEach(row =>
    add(row.map((seg, n) => (n ? D(seg).replace("M", "L") : D(seg))).join(" "), "ring")
  );
  geo.web.forEach(row => {
    if (row.length) add(row.map(D).join(" "), "web");
  });
  document.body.appendChild(svg);
  return svg;
}

// 툭툭 자라기: 값이 「빠르게 점프(50–90ms) → 멈춤」을 되풀이하는 키프레임을 만든다.
// jumps = [[시각ms, 도달 비율0..1], ...]. 다음 단계는 data-at 에 적어 둔 비율에서 이어 간다.
function stepFrames(from: number, jumps: [number, number][], dur: number) {
  const kf: Keyframe[] = [{ offset: 0, strokeDashoffset: 1 - from }];
  let cur = from;
  let last = 0;
  for (const [t0, to] of jumps) {
    // 앞 점프가 끝나기 전에 다음 시각이 오면 밀어낸다 — offset 이 거꾸로 가면 animate() 가 TypeError 를
    // 던지고 그 뒤 금이 전부 안 그려진다(시안 1차에서 실제로 남). 이 줄을 빼지 말 것
    const t = Math.max(t0, last);
    const len = Math.min(90, Math.max(50, (to - cur) * 400));
    kf.push({ offset: Math.min(t / dur, 1), strokeDashoffset: 1 - cur });
    kf.push({ offset: Math.min((t + len) / dur, 1), strokeDashoffset: 1 - to });
    cur = to;
    last = t + len;
  }
  kf.push({ offset: 1, strokeDashoffset: 1 - cur });
  return { kf, end: cur };
}
function grow(p: SVGPathElement, jumps: [number, number][], dur: number) {
  const from = +(p.dataset.at || 0);
  const { kf, end } = stepFrames(from, jumps, dur);
  p.animate(kf, { duration: dur, fill: "forwards", easing: "linear" });
  p.dataset.at = String(end);
}

// 1단계(3.0 s, 1250ms): 「쩍」 — 충격점 멍·거미줄·굵은 금이 120ms 안에, 바깥 금은 방사선마다 제각각 세 번 툭툭 (~45%)
// 2단계(4.3 s, 650ms): 바깥 금 두 번 더 툭툭 끝까지, 고리 금이 돌며 이어지고, 잔금이 갈라진다
function growCracks(svg: SVGSVGElement, phase: 1 | 2) {
  const byRay: Record<string, Record<string, SVGPathElement[]>> = {};
  svg.querySelectorAll<SVGPathElement>("path").forEach(p => {
    const k = p.dataset.kind || "";
    const r = p.dataset.ray ?? "x";
    ((byRay[r] ||= {})[k] ||= []).push(p); // sh·hl 두 겹은 같은 리듬
  });
  if (phase === 1) {
    const haze = svg.querySelector<SVGCircleElement>(".haze");
    if (haze) {
      haze.style.transformBox = "fill-box";
      haze.style.transformOrigin = "center";
      haze.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "none" }], {
        duration: 140,
        fill: "forwards",
        easing: "cubic-bezier(.2,.8,.2,1)",
      });
    }
    for (const r in byRay) {
      const g = byRay[r];
      (g.web || []).forEach(p => grow(p, [[20, 1]], 1250));
      (g.near || []).forEach(p => grow(p, [[0, 0.55], [110, 1]], 1250));
      if (g.far) {
        const t = [rnd(150, 420), rnd(480, 800), rnd(860, 1150)].sort((a, b) => a - b);
        const l = [rnd(0.08, 0.16), rnd(0.2, 0.32), rnd(0.38, 0.5)];
        g.far.forEach(p => grow(p, t.map((x, n): [number, number] => [x, l[n]]), 1250));
      }
    }
  } else {
    for (const r in byRay) {
      const g = byRay[r];
      if (g.far) {
        const t = [rnd(0, 140), rnd(260, 430)];
        const l = [rnd(0.65, 0.8), 1];
        g.far.forEach(p => grow(p, t.map((x, n): [number, number] => [x, l[n]]), 650));
      }
      if (g.twig) {
        const t = [rnd(80, 220), rnd(300, 520)];
        g.twig.forEach(p => grow(p, [[t[0], 0.5], [t[1], 1]], 650));
      }
      (g.ring || []).forEach(p => grow(p, [[200, 0.35], [330, 0.7], [470, 1]], 650));
    }
  }
}

function fadeOutAndRemove(node: Element | null) {
  if (!node) return;
  try {
    const a = node.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150 });
    a.onfinish = () => node.remove();
    a.oncancel = () => node.remove();
  } catch {
    node.remove();
  }
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "LINK", "NOSCRIPT"]);

// 화면 밖 블록은 복제본에서 숨긴다(B3-3). 화면보다 큰 블록(긴 글 본문)은 한 단계씩 내려가 본다.
function hideOffscreen(orig: Element, copy: Element, H: number, depth: number) {
  const oKids = orig.children;
  const cKids = copy.children;
  for (let i = 0; i < oKids.length && i < cKids.length; i++) {
    const r = oKids[i].getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      // display:contents 등 — 상자가 없으니 자식으로 판정
      if (depth < 6) hideOffscreen(oKids[i], cKids[i], H, depth + 1);
      continue;
    }
    if (r.bottom < 0 || r.top > H) {
      (cKids[i] as HTMLElement).style.visibility = "hidden";
    } else if (r.height > H && depth < 6) {
      hideOffscreen(oKids[i], cKids[i], H, depth + 1);
    }
  }
}

// 화면에 보이는 부분만 남긴 스냅숏 한 벌 → 칸마다 복제(시안 buildShards + B3 손질)
function buildShards(geo: Geo): Built {
  const W = viewW();
  const H = viewH();
  const body = document.body;
  const bodyRect = body.getBoundingClientRect();
  const bg = getComputedStyle(body).backgroundColor; // 라이트/다크 그대로 깨진다

  const snap = document.createElement("div");
  snap.className = body.className; // body 의 flex·글꼴·바탕 유틸리티를 그대로
  snap.classList.add("lab-snap");

  const replaceWithBox: [Element, number, number][] = [];
  for (const orig of Array.from(body.children)) {
    if (orig.classList.contains(FX) || SKIP_TAGS.has(orig.tagName)) continue;
    // id 는 지우지 않는다: #site-logo 같은 id 선택자 스타일이 풀리면 파편 속 로고가 맨 링크로 보인다.
    // 중복 id 는 무대가 aria-hidden + inert 라 보조기술·포커스에 안 닿는다.
    const copy = orig.cloneNode(true) as Element;
    snap.appendChild(copy);
    hideOffscreen(orig, copy, H, 0);

    // 원본과 복제본의 querySelectorAll("*") 순서는 같다 → 같은 번호끼리 짝
    const oAll = orig.querySelectorAll("*");
    const cAll = copy.querySelectorAll("*");
    const n = Math.min(oAll.length, cAll.length);
    const pairs: [Element, Element][] = [[orig, copy]];
    for (let i = 0; i < n; i++) pairs.push([oAll[i], cAll[i]]);
    for (const [o, c] of pairs) {
      const tag = o.tagName;
      if (tag === "IFRAME" || tag === "VIDEO" || tag === "CANVAS") {
        // iframe 은 복제하면 다시 불러오고 canvas 는 빈칸으로 복제된다 → 같은 크기 회색 상자
        const r = o.getBoundingClientRect();
        replaceWithBox.push([c, r.width, r.height]);
        continue;
      }
      // position:fixed(읽기 진행 막대·맨 위로 버튼)는 복제본 안에서 snap 의 transform 을
      // 기준으로 잡혀 페이지 맨 위·맨 아래로 가 버린다 → 지금 보이는 자리에 못 박는다
      const cs = getComputedStyle(o);
      if (cs.position === "fixed" && cs.display !== "none") {
        const r = o.getBoundingClientRect();
        const s = (c as HTMLElement).style;
        s.setProperty("inset", "auto", "important");
        s.setProperty("top", `${r.top - bodyRect.top}px`, "important");
        s.setProperty("left", `${r.left - bodyRect.left}px`, "important");
        s.setProperty("width", `${r.width}px`, "important");
        s.setProperty("height", `${r.height}px`, "important");
        s.setProperty("margin", "0", "important");
        for (const p of ["transform", "translate", "rotate", "scale"])
          s.setProperty(p, "none", "important");
      }
    }
  }
  // 흔들림 클래스는 뺀다(안 빼면 조각마다 흔들림이 처음부터 다시 돈다)
  snap.querySelectorAll(".egg-charging").forEach(n => n.classList.remove("egg-charging"));
  for (const [c, w, h] of replaceWithBox) {
    const box = document.createElement("div");
    box.style.cssText = `width:${w}px;height:${h}px;background:#9ca3af;opacity:.5`;
    c.replaceWith(box);
  }
  // 복제본은 원본 body 의 지금 화면 좌표(= -scrollY)에 그대로 놓는다
  snap.style.cssText = `position:absolute;left:0;top:0;margin:0;width:${bodyRect.width}px`;

  const stage = document.createElement("div");
  // 숨긴 채 미리 만든다(B3-2). 규격은 visibility:hidden 이지만 visibility 는 물려받는 속성이라 5초에
  // 풀 때 복제본 전체(조각 수 × 페이지 노드, 360px 긴 글에서 6,500개)의 스타일을 다시 계산해 그
  // 프레임이 170 ms 멈췄다(리그 실측, CPU 4배). 무대나 html 의 클래스를 바꾸는 것만으로도 아래 전체가
  // 무효화됐다(블로그 CSS 의 :not()·:where() 류 선택자 탓 — allDescendantsMightBeInvalid, 트레이스 실측).
  // ⇒ 5초에는 클래스를 건드리지 않고, 안 물려받는 opacity 를 인라인으로 0 → 1 만 바꾼다.
  // 정지 상태 전환일 뿐 애니메이션하지 않는다(B3-4).
  stage.className = `${FX} lab-shard-stage`;
  stage.style.opacity = "0";
  stage.setAttribute("aria-hidden", "true");
  stage.inert = true;

  const pieces: Piece[] = [];
  for (const poly of geo.cells) {
    const xs = poly.map(p => p[0]);
    const ys = poly.map(p => p[1]);
    const x0 = Math.max(0, Math.floor(Math.min(...xs)));
    const y0 = Math.max(0, Math.floor(Math.min(...ys)));
    const x1 = Math.min(W, Math.ceil(Math.max(...xs)));
    const y1 = Math.min(H, Math.ceil(Math.max(...ys)));
    if (x1 - x0 < 2 || y1 - y0 < 2) continue; // 화면 밖 칸은 버린다
    // 조각 크기 상자(B3-1): 합성 레이어가 조각마다 화면 전체가 되지 않게
    const el = document.createElement("div");
    el.className = "lab-shard";
    el.style.cssText =
      `left:${x0}px;top:${y0}px;width:${x1 - x0}px;height:${y1 - y0}px;background:${bg};` +
      `clip-path:polygon(${poly.map(p => `${p[0] - x0}px ${p[1] - y0}px`).join(",")})`;
    const s = pieces.length ? (snap.cloneNode(true) as HTMLDivElement) : snap;
    s.style.transform = `translate(${bodyRect.left - x0}px,${bodyRect.top - y0}px)`;
    el.appendChild(s);
    const cxp = xs.reduce((a, b) => a + b) / xs.length;
    const cyp = ys.reduce((a, b) => a + b) / ys.length;
    el.style.transformOrigin = `${cxp - x0}px ${cyp - y0}px`;
    stage.appendChild(el);
    pieces.push({ el, cx: cxp, cy: cyp, y0 });
  }
  document.body.appendChild(stage);
  return { stage, pieces };
}

// 원래 페이지 숨김 — body 의 원래 자식에만 인라인 visibility. 복제본은 안 건드리므로 재계산이 원본 몫뿐이다
let shattered = false;
let hiddenOriginals: [HTMLElement, string][] = [];
function hideOriginalPage() {
  if (!shattered || hiddenOriginals.length) return;
  for (const el of Array.from(document.body.children)) {
    if (el.classList.contains(FX) || SKIP_TAGS.has(el.tagName)) continue;
    const h = el as HTMLElement;
    hiddenOriginals.push([h, h.style.visibility]);
    h.style.visibility = "hidden";
  }
}
function showOriginalPage() {
  for (const [el, v] of hiddenOriginals) el.style.visibility = v;
  hiddenOriginals = [];
}

// 깨짐: 숨긴 파편을 보이게 → 원래 페이지 숨김 → 낙하. transform 하나만 움직인다(B3-4).
// 돌려주는 값 = 마지막 조각이 끝나는 시각(ms)
function shatter(built: Built, cx: number, cy: number, W: number, H: number): number {
  built.stage.style.opacity = "";
  shattered = true;
  // 원본은 검은 뒷면·파편이 이미 다 덮고 있다 → 숨기는 재계산(원본 노드 수만큼)은 깨짐 첫 프레임 뒤로.
  // html·body 에 클래스를 달아 숨기지 않는다: 블로그 CSS 의 :where()·:not() 류 선택자 때문에 html
  // 클래스 하나가 복제본까지 문서 전체(7,000+ 노드) 재계산을 불러 260 ms 멈췄다(트레이스 실측)
  requestAnimationFrame(() => window.setTimeout(hideOriginalPage, 0));
  const maxD = Math.hypot(W, H);
  let last = 0;
  for (const p of built.pieces) {
    const dx = p.cx - cx;
    const dy = p.cy - cy;
    const d = Math.hypot(dx, dy) || 1;
    const pop = 4 + 6 * Math.random(); // 「쩍」 4–10px
    const delay = 60 + (d / maxD) * 260 + Math.random() * 80;
    const fall = H - p.y0 + 80 + Math.random() * 120;
    const rot = (Math.random() < 0.5 ? -1 : 1) * (12 + Math.random() * 40);
    const drift = (dx / d) * (20 + Math.random() * 60);
    const dur = 900 + Math.random() * 250;
    last = Math.max(last, delay + dur);
    p.el.animate(
      [
        { transform: "none" },
        {
          transform: `translate(${(dx / d) * pop}px,${(dy / d) * pop}px)`,
          offset: 0.08,
          easing: "cubic-bezier(.55,0,1,.45)",
        },
        { transform: `translate(${drift}px,${fall}px) rotate(${rot}deg)` },
      ],
      { duration: dur, delay, fill: "forwards" }
    );
  }
  return last;
}

// 검은 오락기 뒷면 + 부팅 글자 한 줄씩(110 ms)
function showBehind(): HTMLDivElement {
  const behind = document.createElement("div");
  behind.className = `${FX} lab-behind`;
  behind.setAttribute("aria-hidden", "true");
  const box = document.createElement("div");
  box.className = "lab-boot-lines";
  behind.appendChild(box);
  document.body.appendChild(behind);
  let i = 0;
  const t = window.setInterval(() => {
    const p = document.createElement("p");
    p.textContent = BOOT_LINES[i] || " ";
    box.appendChild(p);
    if (++i >= BOOT_LINES.length) window.clearInterval(t);
  }, 110);
  hold?.timers.push(t);
  return behind;
}

function goLab(withBoot: boolean) {
  if (withBoot) {
    try {
      sessionStorage.setItem("lab-boot", "1");
    } catch {
      /* 저장소가 막힌 브라우저 — 부팅 화면 없이 목록으로 간다 */
    }
  }
  window.location.href = LAB_URL;
}

function prefetchLab() {
  if (document.head.querySelector(`link[rel="prefetch"][href="${LAB_URL}"]`)) return;
  const l = document.createElement("link");
  l.rel = "prefetch";
  l.href = LAB_URL;
  document.head.appendChild(l);
}

function restoreHref(h: Hold) {
  if (h.heldHref !== null) h.logo.setAttribute("href", h.heldHref);
  h.heldHref = null;
}

/** 5초 전 취소: 금 150 ms 페이드, 숨긴 파편 버림, 흔들림 멈춤 */
function cancelHold() {
  const h = hold;
  if (!h || h.fired) return;
  h.timers.forEach(t => window.clearTimeout(t));
  h.timers = [];
  h.logo.classList.remove("egg-charging");
  restoreHref(h);
  fadeOutAndRemove(h.svg);
  h.svg = null;
  h.built?.stage.remove();
  h.built = null;
  hold = null;
}

function fire(h: Hold) {
  // 화면 크기는 아무것도 바꾸기 전에 읽는다 — 바꾼 뒤 읽으면 그 자리에서 강제 재계산이 난다
  const W = viewW();
  const H = viewH();
  h.fired = true;
  h.timers = [];
  h.logo.classList.remove("egg-charging");
  restoreHref(h);

  if (h.reduce) {
    // C: 파편 없이 250 ms 덮개 페이드 후 이동. 부팅 화면도 없다
    const veil = document.createElement("div");
    veil.className = `${FX} lab-veil`;
    veil.setAttribute("aria-hidden", "true");
    document.body.appendChild(veil);
    veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: "forwards" });
    h.timers.push(window.setTimeout(() => goLab(false), 260));
    return;
  }

  h.svg?.remove();
  h.svg = null;
  const built = h.built ?? buildShards(h.geo ?? makeCells(h.cx, h.cy, shardGrid()));
  h.built = null;
  showBehind();
  // 깨지는 소리(B5 대안, Dean 10-27). 실험실 SOUND 를 끈 사람에겐 안 난다
  sfx.glass();
  const last = shatter(built, h.cx, h.cy, W, H);
  h.timers.push(window.setTimeout(() => goLab(true), Math.max(last, 1300) + 100));
}

/**
 * 깨진 흔적을 모두 지운다. 뒤로 가기(bfcache)로 깨진 화면이 돌아올 때,
 * ClientRouter 가 페이지를 바꿔 끼울 때 부른다(B4).
 */
export function cleanupShatter() {
  if (hold) {
    hold.timers.forEach(t => {
      window.clearTimeout(t);
      window.clearInterval(t);
    });
    hold.logo.classList.remove("egg-charging");
    restoreHref(hold);
    hold = null;
  }
  document.querySelectorAll(`.${FX}`).forEach(n => n.remove());
  shattered = false;
  showOriginalPage();
}

/** 지금 페이지의 #site-logo 에 길게 누르기를 단다. ClientRouter 로 바뀔 때마다 다시 부른다. */
export function initLogoEgg() {
  const logo = document.querySelector<HTMLAnchorElement>("#site-logo");
  if (!logo || logo.dataset.labEgg === "1") return;
  logo.dataset.labEgg = "1";

  logo.addEventListener("pointerdown", e => {
    if (e.button !== 0 || hold) return;
    const r = logo.getBoundingClientRect();
    const h: Hold = {
      logo,
      timers: [],
      heldHref: null,
      fired: false,
      reduce: reducedMotion(),
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      sx: e.clientX,
      sy: e.clientY,
      geo: null,
      svg: null,
      built: null,
    };
    hold = h;
    // 누르는 지금이 브라우저가 소리를 허락하는 순간 — 5초 뒤 유리 소리를 위해 미리 깨운다
    if (!h.reduce) unlock();
    // 안드로이드 인앱 브라우저(카카오톡 등)는 링크를 길게 누르면 자체 메뉴(열기·다른 브라우저로 열기)를
    // 띄운다. contextmenu 막기·-webkit-touch-callout 이 안 듣는다 — 그 웹뷰는 「누른 자리가 링크인가」를
    // 길게 누른 시점에 본다. ⇒ 손가락이 닿아 있는 동안만 href 를 떼어 둔다. 손을 떼면(pointerup) 바로
    // 돌려 놓으므로 그 뒤에 오는 click 은 평소처럼 첫 화면으로 간다.
    if (e.pointerType !== "mouse") {
      h.heldHref = logo.getAttribute("href");
      logo.removeAttribute("href");
    }
    logo.classList.add("egg-charging");

    h.timers.push(window.setTimeout(prefetchLab, PREFETCH_AT));
    if (!h.reduce) {
      // 줄인 동작이면 금·파편을 만들지 않는다(C)
      h.geo = makeCells(h.cx, h.cy, shardGrid());
      h.timers.push(
        window.setTimeout(() => {
          if (hold !== h || !h.geo) return;
          h.svg = crackSvg(h.geo);
          growCracks(h.svg, 1);
        }, CRACK_AT)
      );
      h.timers.push(
        window.setTimeout(() => {
          if (hold !== h || !h.geo) return;
          if (h.svg) growCracks(h.svg, 2);
          h.built = buildShards(h.geo); // 숨긴 채 미리(B3-2). 숨기는 법은 buildShards() 의 무대 주석
        }, PREBUILD_AT)
      );
    }
    h.timers.push(
      window.setTimeout(() => {
        if (hold === h) fire(h);
      }, HOLD_MS)
    );
  });
  logo.addEventListener("pointermove", e => {
    if (hold?.logo === logo && Math.hypot(e.clientX - hold.sx, e.clientY - hold.sy) > 12)
      cancelHold();
  });
  // 5초 뒤(fired)에는 손을 떼도 그대로 진행한다 — cancelHold 가 fired 면 아무것도 안 한다
  ["pointerup", "pointercancel", "pointerleave"].forEach(t =>
    logo.addEventListener(t, () => {
      if (hold?.logo === logo) cancelHold();
    })
  );
  // 길게 누르면 뜨는 메뉴(링크 미리보기·저장)를 막는다
  logo.addEventListener("contextmenu", e => e.preventDefault());
  // 이스터에그가 터진 뒤 손을 떼며 생기는 click 은 첫 화면 이동을 막는다
  logo.addEventListener("click", e => {
    if (!hold?.fired) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  });
}

// 뒤로 가기로 깨진 화면이 그대로 돌아오면(bfcache) 원래 페이지로 되돌린다.
// 모듈은 한 번만 실행되므로(ClientRouter 이동에도) 리스너도 한 번만 붙는다.
window.addEventListener("pageshow", e => {
  if (e.persisted) cleanupShatter();
});
