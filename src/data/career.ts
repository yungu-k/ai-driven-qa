/** 경력 정본 — **여기 하나다.**
 *
 * 🔴 종전엔 기간이 **두 배열**에 있었다: 여기의 `period` 와 `careerSpan.ts` 의 구간.
 * 값이 같아도 **이력이 바뀌면 한쪽만 고쳐진다**(QA 지적). 오늘 이 팀이 여러 번
 * 밟은 형태라 **구간을 여기서 만들어 쓴다.**
 *
 * ⚠️ 표시(About 본문)와 계산(경력 길이)이 **같은 배열을 읽는다** — 화면과 수가
 * 어긋날 자리가 없어진다.
 *
 * 회사·기간·직무만 둔다(Dean 2026-10-29: 「이력서로는 못 쓴다 — 커리어 타임라인 정도만」).
 * 업무 설명·성과 줄은 git 이력(이 커밋 앞)에 있다.
 */
type CareerRole = {
  title: string;
  period: string;
};
type CareerCompany = {
  company: string;
  isBreak?: boolean;
  roles: CareerRole[];
};
export const CAREER: CareerCompany[] = [
  {
    company: "클로닉스",
    roles: [{ title: "QA Lead", period: "2025.07 ~ 현재" }],
  },
  {
    company: "경력 휴식기",
    // 🔴 **경력이 아니다.** 이름이 아니라 **표식**으로 가른다 —
    // 이름으로 가르면 이름이 바뀌는 날 조용히 경력에 섞인다
    isBreak: true,
    roles: [{ title: "여행 · 재충전", period: "2024.04 ~ 2025.07" }],
  },
  {
    company: "넷마블",
    roles: [
      { title: "QA Part Lead (웹QA팀 파트장)", period: "2023.01 ~ 2024.04" },
      { title: "QA Manager", period: "2020.08 ~ 2023.01" },
    ],
  },
  {
    company: "엔테크서비스",
    roles: [{ title: "Test Engineer (대만 LINE Pay)", period: "2018.10 ~ 2020.07" }],
  },
  {
    company: "해커스 교육그룹",
    roles: [{ title: "QA", period: "2017.03 ~ 2018.09" }],
  },
];
