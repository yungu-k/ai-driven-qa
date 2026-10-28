// 실험실 부팅 카드 마크업 — 규격 docs/lab-hub-spec.md 5절. 두 곳이 이 문자열 하나를 같이 쓴다:
//  - src/scripts/lab-shatter.ts: 블로그 로고가 깨질 때 조각 뒤에 드러나는 뒷면(.lab-behind)
//  - src/lab/BootScreen.astro: /lab/ 에 도착한 첫 페인트(다 찬 같은 장면 → 이동이 안 보인다)
// 모양은 src/lab/lab-tokens.css 의 .lab-boot-card. 블로그 모든 페이지 묶음에 들어가므로 가볍게 둔다
// (게임 목록 자체는 src/lab/hub-games.ts — 여기선 개수만. 둘이 같은지는 tests/lab/lab-hub.test.ts 가 본다).

/** 실험실에서 지금 놀 수 있는 게임 수(준비 중 제외, 오락실 + 내기 모음 전부). hub-games.ts 의 목록과 같아야 한다 */
export const LAB_GAME_COUNT = 14;

/** 플라스크 아이콘(64). id 는 한 페이지에 하나만 들어가니 겹치지 않는다 */
const FLASK = `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="labBootSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe6ff"/><stop offset="1" stop-color="#9fd8ff"/></linearGradient><linearGradient id="labBootLiq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fe0d4"/><stop offset="1" stop-color="#2fb5a8"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="18" fill="url(#labBootSky)"/><path d="M26 14h12M28 14v12L18 44a5 5 0 0 0 4.4 7.4h19.2A5 5 0 0 0 46 44L36 26V14" fill="#fffaf2" stroke="#1f8f86" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><path d="M22.6 38h18.8L46 44a5 5 0 0 1-4.4 7.4H22.4A5 5 0 0 1 18 44Z" fill="url(#labBootLiq)"/><circle cx="29" cy="44" r="2.4" fill="#fffaf2"/><circle cx="36" cy="40.5" r="1.6" fill="#fffaf2"/><circle cx="45" cy="16" r="3" fill="#ffd36b"/><circle cx="50" cy="24" r="2" fill="#ff8fb1"/></svg>`;

/** 부팅 카드 한 장(바깥 상자 .lab-behind/.lab-boot 는 부르는 쪽이 만든다) */
export function bootCardHtml(count: number = LAB_GAME_COUNT): string {
  return `<div class="lab-boot-card">${FLASK}<p class="lab-boot-name">실험실</p><p class="lab-boot-line">게임 ${count}개를 꺼내는 중</p><div class="lab-boot-meter"><i></i></div></div>`;
}
