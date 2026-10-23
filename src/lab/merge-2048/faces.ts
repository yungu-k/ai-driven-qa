// 타일 얼굴과 색. 값이 커질수록 표정이 바뀐다 — 색을 못 갈라도 표정·숫자로 갈린다.
// 바탕색은 밝은 쪽만 써서 글자색(#1c1c21) 하나로 라이트·다크 둘 다 읽힌다.

const INK = "#1c1c21";

/** 값 → 바탕색. 2048 넘으면 마지막 색 */
const FILLS: Record<number, string> = {
  2: "#d9f4dd",
  4: "#b8efc0",
  8: "#7bd389",
  16: "#a8e6e0",
  32: "#9fd3ff",
  64: "#c9bcff",
  128: "#b39dff",
  256: "#ffc2d4",
  512: "#ff8fab",
  1024: "#ffe08a",
  2048: "#ffd24d",
};
export const fillFor = (v: number) => FILLS[v] ?? "#ffb800";

/** 2048 타일 밑에 붙는 한 줄 */
export const captionFor = (v: number) => (v === 2048 ? "출시!" : v > 2048 ? "핫픽스" : "");

const dot = (x: number, y: number, r = 5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/>`;
const arc = (d: string, w = 4) =>
  `<path d="${d}" stroke="${INK}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const blush = `<ellipse cx="24" cy="62" rx="8" ry="5" fill="#ff8fab" opacity=".7"/><ellipse cx="76" cy="62" rx="8" ry="5" fill="#ff8fab" opacity=".7"/>`;
const star = (x: number, y: number) =>
  `<path d="M${x} ${y - 9} l2.6 6 6.4.6 -4.9 4.2 1.5 6.3 -5.6 -3.4 -5.6 3.4 1.5 -6.3 -4.9 -4.2 6.4 -.6z" fill="${INK}"/>`;
const heart = (x: number, y: number) =>
  `<path d="M${x} ${y + 7} c-9 -6 -10 -11 -7 -14 c3 -3 6 -1 7 1 c1 -2 4 -4 7 -1 c3 3 2 8 -7 14z" fill="#e0245e"/>`;

/** 값별 눈·입. 2 = 졸림 → 4 = 방긋 → … → 2048 = 축하 */
const EXPR: Record<number, string> = {
  2: arc("M28 46 h12 M60 46 h12") + arc("M44 66 q6 4 12 0", 3.5),
  4: dot(34, 46) + dot(66, 46) + arc("M42 64 q8 7 16 0"),
  8: arc("M27 49 q7 -9 14 0 M59 49 q7 -9 14 0") + arc("M40 62 q10 10 20 0") + blush,
  16: dot(34, 44, 6) + dot(66, 44, 6) + `<ellipse cx="50" cy="68" rx="6" ry="7" fill="${INK}"/>`,
  32: dot(34, 46) + arc("M59 47 q7 -6 14 0") + arc("M40 62 q10 10 20 0") + blush,
  64: arc("M27 49 q7 -9 14 0 M59 49 q7 -9 14 0") + `<path d="M36 60 h28 q-2 16 -14 16 q-12 0 -14 -16z" fill="${INK}"/>` + blush,
  128:
    `<rect x="20" y="38" width="26" height="14" rx="5" fill="${INK}"/><rect x="54" y="38" width="26" height="14" rx="5" fill="${INK}"/>` +
    arc("M46 44 h8", 3) +
    arc("M40 66 q10 6 20 0"),
  256: star(34, 46) + star(66, 46) + arc("M40 62 q10 10 20 0"),
  512: heart(34, 44) + heart(66, 44) + arc("M42 64 q8 7 16 0") + blush,
  1024: arc("M27 49 q7 -9 14 0 M59 49 q7 -9 14 0") + `<path d="M36 60 h28 q-2 16 -14 16 q-12 0 -14 -16z" fill="${INK}"/>` + `<path d="M84 18 q4 10 -2 18 q-7 -6 2 -18z" fill="#6cc4ff"/>` + blush,
  2048: star(34, 46) + star(66, 46) + `<path d="M36 60 h28 q-2 16 -14 16 q-12 0 -14 -16z" fill="${INK}"/>` + blush,
};

/** 2048 에는 작은 왕관 */
const crown = `<path d="M33 22 l5 -12 l12 9 l12 -9 l5 12 z" fill="#ffb800" stroke="#b8860b" stroke-width="2.5" stroke-linejoin="round"/>`;

export function faceFor(v: number): string {
  const body = EXPR[v] ?? EXPR[2048];
  const extra = v >= 2048 ? crown : "";
  return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${extra}${body}</svg>`;
}
