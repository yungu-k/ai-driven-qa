// 실험실 첫 화면(허브)의 게임 목록 — 규격 docs/lab-hub-spec.md 3절. 다 만든 것만 싣고, 만드는 중인 것은 soon 으로 한 장만.
// 키 아트는 public/lab/keyart/<slug>.webp(16:10, 960×600). 파일이 없으면 빌드가 「공사 중」 자리표시(고깔 + wip 한 줄 + ph 색)를 넣는다.
// 개수는 src/lab/boot-card.ts 의 LAB_GAME_COUNT 와 같아야 한다(tests/lab/lab-hub.test.ts).

export type HubGame = {
  slug: string;
  title: string;
  blurb: string;
  /** 키 아트가 없을 때 썸네일 자리의 한 줄(공사 중 장면, 장식) — Dean 10-28: 머리글자 「도」「포」 대신 */
  wip: string;
  /** 자리표시 그라데이션 [밝은 쪽, 진한 쪽, 머리글자 색] */
  ph: [string, string, string];
  /** 조작 한 줄(카드 아래 작은 글씨) — Dean 10-28: 「어떻게 만들었나」 대신 게임 소개·가이드만 */
  guide?: string;
  /** /api/rank/<rank> 점수 랭킹 1위 */
  rank?: string;
  /** /api/defense-rank 날(바퀴) 랭킹 1위 */
  lapRank?: boolean;
  /** 준비 중 — 링크·랭킹·접기 없음 */
  soon?: boolean;
};

export const GAMES: HubGame[] = [
  {
    slug: "dreamherd",
    title: "코코의 꿈 양몰이",
    blurb: "잠든 코코의 꿈속, 줄지어 따라오는 양떼로 악몽을 한 바퀴 감싸 재워요. 동이 틀 때까지 버티면 이겨요.",
    guide: "끌어서 걷기 · 양 줄로 악몽을 한 바퀴 감싸면 우리가 생겨요",
    wip: "꿈 꾸는 중",
    ph: ["#d9ccff", "#b99af0", "#4b2d8a"],
    rank: "dreamherd",
  },
  {
    slug: "coco",
    title: "코코의 하루",
    blurb: "갈색 푸들 코코가 공원에서 칫솔·목욕 거품·청소기를 물리쳐요. 손을 떼면 앉아 기운을 모으고, 움직이면 똥꼬 스키!",
    guide: "끌어서 걷기 · 손을 떼면 앉아 기운 모으기 · 다시 움직이면 똥꼬 스키",
    wip: "산책 준비 중",
    ph: ["#f2b98a", "#d98a5a", "#8e4526"],
    rank: "coco",
  },
  {
    slug: "coco-td",
    title: "코코 타워 디펜스",
    blurb: "저녁밥 그릇을 노리는 칫솔·목욕 거품·청소기 떼. 코코의 장난감과 습관으로 길목을 지켜요. 하루를 버틸 때마다 더 세져요.",
    guide: "빈 칸을 눌러 놀잇감 짓기 · ▶ 부르기로 싫은 것들을 불러요",
    wip: "산책 준비 중",
    ph: ["#c8f1ea", "#7fe0d4", "#15665f"],
    // 10-28 커밋 8763a2e 에 자리표시(TESTED_…)로 나가 있던 칸 — tests/lab/coco-td*.test.ts 가 실제로 보는 것으로 채웠다
    lapRank: true,
  },
  {
    slug: "dokkaebi",
    title: "도깨비 퇴치",
    blurb: "밤 장터에 몰려드는 도깨비들. 지나간 자리에 놓인 체에 도깨비가 앉아 구멍을 세면, 돌아가 밟아서 체 털기!",
    guide: "끌어서 걷기 · 도깨비가 앉은 체로 돌아가 밟으면 체 털기",
    wip: "3D 로 둔갑하는 중",
    ph: ["#ffc9b8", "#ff8fa3", "#8a2f3a"],
    rank: "goblin",
  },
  {
    slug: "pocha",
    title: "포장마차 사수",
    blurb: "새 게임을 만들고 있어요. 다 되면 여기서 열려요.",
    wip: "천막 치는 중",
    ph: ["#ffe29a", "#ffd166", "#7a4a10"],
    soon: true,
  },
];

export const PLAYABLE = GAMES.filter(g => !g.soon);
export const SOON = GAMES.filter(g => g.soon);
