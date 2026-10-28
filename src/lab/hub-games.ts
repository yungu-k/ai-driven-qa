// 실험실 첫 화면(허브)의 게임 목록 — 규격 docs/lab-hub-spec.md 3절. 다 만든 것만 싣고, 만드는 중인 것은 soon 으로 한 장만.
// 키 아트는 public/lab/keyart/<slug>.webp(16:10, 960×600). 파일이 없으면 빌드가 「공사 중」 자리표시(고깔 + wip 한 줄 + ph 색)를 넣는다.
// 개수는 src/lab/boot-card.ts 의 LAB_GAME_COUNT 와 같아야 한다(tests/lab/lab-hub.test.ts) — 줄(오락실·내기 모음)을 가리지 않고 놀 수 있는 것 전부를 센다.

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
  /** 허브의 어느 줄인가(없으면 "arcade" — 맨 위 「오락실」 줄). 줄 이름·한 줄은 아래 GROUPS */
  group?: HubGroupId;
  /** 몇 명이 하나(카드 썸네일 알약, 예 「2–4명」) — 내기 모음은 늘 단다 */
  players?: string;
};

export type HubGroupId = "arcade" | "party";
export type HubGroup = {
  id: HubGroupId;
  /** 줄 머리 — 없으면 머리 없이 카드만(「오락실」 줄은 10-28 전부터 머리 없이 맨 위에 있었다) */
  title?: string;
  lede?: string;
};
/** 허브 줄 순서. 「내기 모음」(여럿이 폰 하나로 하는 턴제)은 「오락실」 아래 새 줄 — 의뢰서 docs/lab-party-brief.md 1절 */
export const GROUPS: HubGroup[] = [
  { id: "arcade" },
  { id: "party", title: "내기 모음", lede: "폰 하나 돌려 가며 2–4명 · 랭킹 없이 전적은 이 폰에만" },
];

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
    blurb: "비 오는 밤 골목, 포장마차 막내가 갈매기·비둘기·취객 소동을 막고 우산 쓴 손님에겐 길을 비켜 줘요. 비가 그칠 때까지 가게를 지키면 이겨요.",
    guide: "끌어서 걷기 · 소동은 막고 손님 길은 비켜 주기",
    wip: "천막 치는 중",
    ph: ["#ffe29a", "#ffd166", "#7a4a10"],
    rank: "pocha",
  },
  // ── 내기 모음(group "party") — 랭킹 없음(rank·lapRank 를 달지 않는다, 전적은 기기 localStorage). 옮기는 법 docs/lab-party-port-recipe.md ──
  {
    slug: "pushluck",
    title: "한 칸 더?",
    blurb: "굴릴수록 코코 간식이 접시에 쌓여요. 같은 간식이 두 번 겹치면 코코가 접시를 낚아채요. 언제 멈출지가 전부!",
    guide: "차례마다 「한 칸 더!」 또는 「멈춤」 · 같은 간식이 두 번 겹치면 이번 차례 0",
    wip: "간식 담는 중",
    ph: ["#ffe1c8", "#ffb38a", "#8e4526"],
    group: "party",
    players: "2–4명",
  },
  {
    slug: "doorbell",
    title: "초인종 폭탄",
    blurb: "초인종을 받으면 작은 일 하나를 끝내야 넘길 수 있어요. 언제 울릴지는 아무도 몰라요 — 울릴 때 든 사람이 문 열기 당번!",
    guide: "초인종을 받으면 작은 일 하나 끝내고 바로 넘겨요 — 울릴 때 든 사람이 당번",
    wip: "초인종 다는 중",
    ph: ["#fff1c2", "#ffd36b", "#b07a1c"],
    group: "party",
    players: "2–4명",
  },
  {
    slug: "sketch",
    title: "그림 전달",
    blurb: "몰래 받은 말을 30초 안에 손가락으로 그리고, 다음 사람은 그림만 보고 맞혀요. 끝에 줄 전체를 공개하면 처음 말이 어디까지 갔는지 보여요!",
    guide: "몰래 받은 말을 그리고, 다음 사람은 그림만 보고 맞혀요 — 끝에 줄 전체 공개",
    wip: "크레용 깎는 중",
    ph: ["#e9f8f5", "#7fd3c8", "#15665f"],
    group: "party",
    players: "3–4명",
  },
  {
    slug: "dots",
    title: "땅따먹기 점 잇기",
    blurb: "점 둘 사이에 울타리 하나씩. 네 번째 울타리로 칸을 닫으면 내 텃밭이 되고 한 번 더 그어요. 세 번째 선은 남 좋은 일!",
    guide: "점 둘 사이에 선 하나 — 네 번째 선으로 칸을 닫으면 내 텃밭, 한 번 더",
    wip: "울타리 박는 중",
    ph: ["#eaf6dc", "#9fd08a", "#2f7a3a"],
    group: "party",
    players: "2–4명",
  },
];

export const PLAYABLE = GAMES.filter(g => !g.soon);
export const SOON = GAMES.filter(g => g.soon);
/** 줄마다 카드(GROUPS 순서). 줄이 비면 빼고 */
export const groupOf = (g: HubGame): HubGroupId => g.group ?? "arcade";
export const ROWS = GROUPS.map(gr => ({ ...gr, games: GAMES.filter(g => groupOf(g) === gr.id) })).filter(r => r.games.length > 0);
