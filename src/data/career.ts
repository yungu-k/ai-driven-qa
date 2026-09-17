import { AI_TEAM } from "@/data/aiTeam";

/** 「N개 역할: 기획·PM·…」 — **묶음 단위로만 줄을 바꾼다.**
 *
 * 🔴 공백 없는 「·」 연결이라 브라우저가 아무 데서나 끊었다(QA 실측, 2026-09-15):
 * 390~430px 「Technical / Writer」, 360·375px 줄머리 「·」, 320px 「로그 / 분석」.
 * ⇒ 역할 하나·「N개 역할:」 하나를 각각 안 끊기는 묶음으로 두고 **「·」는 앞 역할에 붙인다.**
 *
 * ⚠ **묶음 사이에 `<wbr>` 가 있어야 한다.** 「·」 뒤 라틴 글자 앞(`·PM`·`·Technical`)은
 * 원래 줄바꿈 자리가 아니라, 빼면 한글 역할 앞에서만 끊긴다 — 「개발·QA·」「디자인·Technical
 * Writer·DevOps·」가 한 덩어리로 움직여 **넘침 없이 줄만 는다**(실측: 320px 3→4줄, 390px 2→3줄).
 * 검사: `scripts/check-about-wrap.cjs` 의 W4(일찍 끊김)가 그 변이를 잡는다.
 */
const nowrap = (s: string) => `<span class="whitespace-nowrap">${s}</span>`;
const AI_TEAM_ROLES_HTML =
  nowrap(`${AI_TEAM.roles.length}개 역할:`) + " " +
  AI_TEAM.roles.map((r, i) => nowrap(i < AI_TEAM.roles.length - 1 ? `${r}·` : r)).join("<wbr>");

/** 경력 정본 — **여기 하나다.**
 *
 * 🔴 종전엔 기간이 **두 배열**에 있었다: 여기의 `period` 와 `careerSpan.ts` 의 구간.
 * 값이 같아도 **이력이 바뀌면 한쪽만 고쳐진다**(QA 지적). 오늘 이 팀이 여러 번
 * 밟은 형태라 **구간을 여기서 만들어 쓴다.**
 *
 * ⚠️ 표시(About 본문)와 계산(경력 길이)이 **같은 배열을 읽는다** — 화면과 수가
 * 어긋날 자리가 없어진다.
 */
type CareerRole = {
  title: string;
  period: string;
  context?: string;
  bullets: string[];
};
type CareerCompany = {
  company: string;
  isBreak?: boolean;
  /** 회사 옆에 붙는 링크(제품/브랜드 사이트) — 본문 문장에 넣지 않는다(오너 결정 2026-09-17). */
  site?: { href: string; label: string };
  roles: CareerRole[];
};
export const CAREER: CareerCompany[] = [
  {
    company: "클로닉스",
    site: { href: "https://spadeone.ai/", label: "spadeone.ai" },
    roles: [
      {
        title: "QA Lead",
        period: "2025.07 ~ 현재",
        context:
          `글로벌 대형 카지노 대상 B2B 스타트업 — 현금·칩 거래 키오스크 제품군을 담당합니다. 금전을 다루는 규제 산업이라 정확성과 장애 대응이 특히 엄격한 환경입니다.`,
        bullets: [
          `QA 프로세스 제로베이스 구축 — <a href="/posts/release-train-scrum/">2~3주 릴리스 트레인</a>, QA OK-Sign 게이트, 고객 대응 Incident 체계 설계·운영`,
          `<strong><a href="/posts/kiosk-automation-infra/">UI/API 이중 트랙 자동화 인프라</a> 구축·확장</strong> — Playwright + vitest, 빌드 감지→검증→리포트 자동 파이프라인과 상시 계약 검증까지`,
          `운영 알람 분류 자동화 → <strong><a href="/posts/realtime-kiosk-monitoring/">실시간 관제 대시보드</a></strong>(FastAPI+HTMX) 구축`,
          `외부 파트너용 <strong>기술지원 이력 시스템</strong>(Jira 양방향 동기화) 구축·운영 오픈`,
          // 수·역할·링크는 `aiTeam.ts` 에서 읽는다 — 여기 글자로 박으면 채용 때 이 줄만 낡는다.
          // 「8개 역할:」도 roles.length 다: 괄호 속 역할을 독자가 세면 11 과 안 맞아서 축을 밝힌다(오너 선택)
          `<strong><a href="${AI_TEAM.href}">AI 팀원 ${AI_TEAM.size}인(${AI_TEAM_ROLES_HTML}) 설계</a></strong> — 이 블로그의 주제. 전체 이야기는 <a href="/posts/repetition-to-ai-judgment-to-human/">QA 자동화 여정기</a>에`,
        ],
      },
    ],
  },
  {
    company: "경력 휴식기",
    // 🔴 **경력이 아니다.** 이름이 아니라 **표식**으로 가른다 —
    // 이름으로 가르면 이름이 바뀌는 날 조용히 경력에 섞인다
    isBreak: true,
    roles: [
      {
        title: "여행 · 재충전",
        period: "2024.04 ~ 2025.07",
        context:
          "7년의 연속 근무를 마치고 프랑스, 스위스, 태국, 일본, 괌 등을 여행하며 재충전한 기간입니다. 충분히 쉬면서 다음 도전을 고민했고, 스타트업행을 결정했습니다.",
        bullets: [],
      },
    ],
  },
  {
    company: "넷마블",
    roles: [
      {
        title: "QA Part Lead (웹QA팀 파트장)",
        period: "2023.01 ~ 2024.04",
        bullets: [
          "QA 파트의 목표·전략 수립과 품질 지표 관리, 팀원 산출물(TC·리포트) 리뷰 총괄",
          "넷마블 자체결제·<strong>MBX 블록체인</strong> 등 신규 사업 QA 체계 구축",
          "외주 테스트 조직 운영 관리 — 업무 배분·품질 기준·산출물 검수",
        ],
      },
      {
        title: "QA Manager",
        period: "2020.08 ~ 2023.01",
        context:
          "전사 웹 플랫폼 5개 서비스(포럼·고객센터/백오피스·PC 런처·쿠폰·웹 결제) QA 담당.",
        bullets: [
          "서비스별 QA 프로세스 수립, 배포 Go/No-Go 게이트 운영 — 배포 제어와 릴리스 품질 책임",
          "Grafana 로그 모니터링 기반 장애 감지·대응, 장애 관리 프로세스 운영",
          "자동화 개발자와 협업해 장기 리그레션 자동화 운영, 중국 진출 등 글로벌 대응 QA",
        ],
      },
    ],
  },
  {
    company: "엔테크서비스",
    roles: [
      {
        title: "Test Engineer",
        period: "2018.10 ~ 2020.07",
        context: "대만 LINE Pay 결제 서비스 테스트 엔지니어.",
        bullets: [
          "대만 LINE Pay 오프라인 결제 앱 론칭 — 테스트 계획부터 배포 모니터링까지 전 주기",
          "<strong>대만-태국-일본 크로스보더 결제</strong> 구축 검증, iPASS(교통카드) 연동·Push 시스템 개편",
          "정기 배포 리그레션과 결함 리포팅 운영",
        ],
      },
    ],
  },
  {
    company: "해커스 교육그룹",
    roles: [
      {
        title: "QA",
        period: "2017.03 ~ 2018.09",
        bullets: [
          "<strong>10개 독립 사이트의 회원 통합 프로젝트</strong> 검증",
          "토익 학습 앱(Bigple) 론칭 — 회원가입·결제·동영상 강의 재생 TC 설계/수행",
        ],
      },
    ],
  },
];
