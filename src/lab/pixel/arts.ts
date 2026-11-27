// 실험실 도트 아트 목록 — 갤러리·작품 페이지·검사가 이 한 곳을 읽는다(2026-11-27 Dean: 게임 → 도트 아트, docs/lab-pixel-brief.md).
// 작품을 더하면: 여기 한 줄 + src/lab/pixel/<slug>.ts 또는 .js(mount 계약, design 시안을 글자 그대로 옮기면 .js) + src/pages/lab/<slug>.astro + public/lab/pixel/<slug>.webp(썸네일).
// 셋이 어긋나면 tests/lab/lab-hub.test.ts 가 빨강이다.

export type Art = {
  /** 주소 /lab/<slug>/ · 모듈 src/lab/pixel/<slug>.ts · 썸네일 /lab/pixel/<slug>.webp */
  slug: string;
  /** 작품 이름(명판 첫 줄) */
  title: string;
  /** 무엇이 보이나 한 줄 — 썸네일 alt·페이지 설명(명판엔 안 쓴다, 명판은 번호·이름·기법·연도) */
  caption: string;
  /** 만든 해 */
  year: number;
  /** 작품 페이지 첫 페인트 바탕색(캔버스가 뜨기 전). 없으면 밤하늘(--lab-night) — 불꽃놀이는 하늘이 같아야 페이드인이 안 보인다 */
  paint?: string;
};

export const ARTS: Art[] = [
  {
    slug: "fireworks",
    title: "불꽃놀이",
    caption: "도시의 밤하늘에 열한 가지 불꽃이 끝없이 오른다",
    year: 2026,
  },
  {
    slug: "snowglobe",
    title: "스노우볼",
    caption: "눈이 펑펑 내리는 유리구슬 속 작은 집",
    year: 2026,
    paint: "#0c0910", // 방 벽 꼭대기 색 = snowglobe.js 의 export paint(검사가 맞댄다)
  },
];

export const thumbOf = (slug: string) => `/lab/pixel/${slug}.webp`;
/** 명판 번호 01, 02 … (목록 순서) */
export const numberOf = (slug: string) => String(ARTS.findIndex(a => a.slug === slug) + 1).padStart(2, "0");
/** 명판 셋째 줄(기법 · 연도) — design 규격 2절 */
export const metaOf = (a: Art) => `도트 애니메이션 · ${a.year}`;
export const artOf = (slug: string): Art => {
  const a = ARTS.find(x => x.slug === slug);
  if (!a) throw new Error(`arts.ts 에 없는 작품: ${slug}`);
  return a;
};
