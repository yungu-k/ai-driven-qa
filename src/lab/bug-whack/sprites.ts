// 캐릭터 그림. 색만이 아니라 **모양**으로도 갈린다(동그라미 = 버그, 별 = 기능) — 색을 못 갈라도 놀 수 있게.

const eyes = (cx1: number, cx2: number, cy: number) => `
  <circle cx="${cx1}" cy="${cy}" r="9" fill="#fff"/>
  <circle cx="${cx2}" cy="${cy}" r="9" fill="#fff"/>
  <circle cx="${cx1 + 2}" cy="${cy + 1}" r="4.6" fill="#1c1c21"/>
  <circle cx="${cx2 + 2}" cy="${cy + 1}" r="4.6" fill="#1c1c21"/>
  <circle cx="${cx1 + 3.6}" cy="${cy - 1.2}" r="1.6" fill="#fff"/>
  <circle cx="${cx2 + 3.6}" cy="${cy - 1.2}" r="1.6" fill="#fff"/>`;

const cheeks = (cy: number) => `
  <ellipse cx="31" cy="${cy}" rx="5" ry="3" fill="#ff8fab" opacity=".75"/>
  <ellipse cx="69" cy="${cy}" rx="5" ry="3" fill="#ff8fab" opacity=".75"/>`;

const legs = (stroke: string) => `
  <g stroke="${stroke}" stroke-width="4" stroke-linecap="round" fill="none">
    <path d="M24 70 q-9 2 -12 9"/><path d="M76 70 q9 2 12 9"/>
    <path d="M22 58 q-10 -1 -15 4"/><path d="M78 58 q10 -1 15 4"/>
  </g>`;

const antennae = (stroke: string) => `
  <g stroke="${stroke}" stroke-width="3.5" stroke-linecap="round" fill="none">
    <path d="M40 26 q-6 -14 -14 -14"/><path d="M60 26 q6 -14 14 -14"/>
  </g>
  <circle cx="25" cy="12" r="4.5" fill="${stroke}"/><circle cx="75" cy="12" r="4.5" fill="${stroke}"/>`;

const roundBug = (body: string, belly: string, line: string, extra = "") => `
<svg viewBox="0 0 100 100" aria-hidden="true">
  ${legs(line)}${antennae(line)}
  <ellipse cx="50" cy="58" rx="32" ry="30" fill="${body}" stroke="${line}" stroke-width="3"/>
  <ellipse cx="50" cy="70" rx="19" ry="13" fill="${belly}"/>
  ${eyes(39, 61, 50)}${cheeks(62)}
  <path d="M45 65 q5 5 10 0" stroke="#1c1c21" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  ${extra}
</svg>`;

export const SPRITES = {
  bug: roundBug("#7bd389", "#b8efc0", "#2f7a46"),
  gold: roundBug(
    "#ffd24d",
    "#fff0b3",
    "#b8860b",
    `<path d="M36 30 l5 -12 l9 9 l9 -9 l5 12 z" fill="#ffb800" stroke="#b8860b" stroke-width="2.5" stroke-linejoin="round"/>
     <circle cx="84" cy="34" r="3" fill="#fff8d6"/><path d="M84 25 v18 M75 34 h18" stroke="#fff8d6" stroke-width="2" stroke-linecap="round"/>`
  ),
  feature: `
<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M50 10 l11.5 23.5 l26 3.8 l-18.8 18.3 l4.4 25.9 L50 69.3 L26.9 81.5 l4.4 -25.9 L12.5 37.3 l26 -3.8 z"
        fill="#b39dff" stroke="#5b45c9" stroke-width="3" stroke-linejoin="round"/>
  ${eyes(41, 59, 44)}
  <path d="M45 56 q5 5 10 0" stroke="#1c1c21" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <rect x="27" y="80" width="46" height="17" rx="8.5" fill="#5b45c9"/>
  <text x="50" y="93" text-anchor="middle" font-size="12" font-weight="700" fill="#fff"
        font-family="Pretendard Variable, Pretendard, sans-serif">기능</text>
</svg>`,
} as const;
