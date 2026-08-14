# Technical Writer 세션 컨텍스트 — 인수인계 정본

> **읽는 사람**: 이 대화 기록 없이 TW 역할을 이어받는 세션 (WSL planner 포함).
> 이 문서 하나로 풀 컨텍스트가 잡히도록 썼다. 최종 갱신: 2026-08-05 (커밋 fc8d6de 시점).
> WSL 에서 이 repo 는 `/mnt/c/dev/tech-blog` — 아래 상대 경로는 전부 repo 루트 기준.

## 0. 역할 정의

Technical Writer = 블로그(ai-driven-qa.vercel.app)의 **기준 수립·감사·집필·게이트** 담당 AI 팀원.
사용자(공윤구, QA 엔지니어)의 개인 기술 블로그이며 포트폴리오 성격. repo = `C:\dev\tech-blog` (GitHub yungu-k/ai-driven-qa, push = Vercel 자동배포, 빌드는 `pnpm` 전용 · `$env:CI="true"; .\node_modules\.bin\astro.cmd build`).

**불변 원칙 4개** (블로그 글 `ai-technical-writer-teammate` 에 공개된 것과 동일):
1. **저자≠감사자** — TW 가 쓴 글도 별도 독립 에이전트의 게이트 감사(원재료 전수 대조)를 통과해야 발행. 판정엔 근거 인용 필수
2. **수치 창작 절대 금지** — 출처(저자 답변·구현 세션 핸드오프·repo 실기록) 없는 수치는 쓰지 않는다. 모르면 질문 핸드오프. "모름"도 유효한 답 — 그 경우 추정 명시·서사 대체
3. **팀원 간 문서 핸드오프만** — 재료/질문/회신 문서로만 오간다. 형식 관례: `HANDOFF-*.md` (Desktop\QA), 반환은 `-back` 접미
4. **발행 결정은 사람** — 게이트 통과 ≠ push. push 는 사용자 승인 후

## 1. 파일 지도 (전부 정본)

| 파일 | 내용 |
|---|---|
| `docs/WRITING_STANDARD.md` | **기준 정본.** 글로벌 7사 9포스트+국내 4사+방법론 실측 분석으로 만든 체크 ID 체계 — §0 컨텍스트(한다체 기본+How-to 존댓말 예외·익명화), §1 T(유형)·§2 S(구조, S8 분량 측정 프로토콜 포함 — **바이트 측정 금지**)·§3 H(제목)·§4 W(문장)·§5 V(시각, V6 figure=role img+aria-label+테마 토큰)·§6 C(코드)·§7 E(신뢰 — E1 실측/E2 실패담/E3 트레이드오프/E4 한계/E5 측정법)·**§8 F(featured 기준: 축당 1편·B+ 하한·분기 재선별)**·§9 퇴고 체크 |
| `docs/audit/2026-07-29-batch-{1,2,3}.md` + `reaudit-6.md` | 라운드 1 감사 (이력) |
| `docs/audit/2026-07-29-round2.md` / `round3.md` / `round4-spot.md` | 라운드 2~4. **round4-spot = 22편 등급 현행 정본** |
| `docs/audit/2026-08-05-gates.md` | 신규 글 게이트 기록 (누적 관례 — 이후 게이트도 여기에 추가) |
| `docs/AUTHOR_ANSWERS.md` | 저자 확인 답변 시트 = **수치 주입 정본.** 모순 해소 기록 포함 (bug-report 훅=신규 프로젝트 초반부 기준, regression 342=전사 총합/120=해당 프로젝트) |
| `docs/HANDOFF_IMPROVEMENTS.md` / `HANDOFF_ROUND2.md` / `HANDOFF_ROUND3.md` | 감사→집행 핸드오프 (이력 — 전부 집행 완료) |
| `docs/handoff-audit-execution-back-*.md` | 집행 세션 반환 핸드오프 (이력) |
| `C:\Users\공윤구\Desktop\QA\HANDOFF-techblog-*.md` | 구현 세션↔TW 왕복 4건 (webui 재료 → questions-back → answers → 스크린샷). 협업 프로토콜의 실물 예시 |
| `C:\Users\공윤구\Desktop\QA\blog-shots\` | 러너 스크린샷 3장 (target-banner 사용됨, **run-panel·run-page 미사용 보관** — 러너 글 재료) |
| 로컬 메모리 | `~\.claude\projects\C--Users----\memory\reference_tech_writing_standard.md` — **gitignore 로컬 전용** (회사 memory repo 미추적, 사용자 의도) |

## 2. 지금까지 한 일 (타임라인)

- **2026-07-29 (1일 집중)**: 기준 수립(글로벌/국내/방법론 리서치 3에이전트) → 20편 전수 감사 → 저자 답변 시트 → 감사↔집행 세션 핸드오프 사이클 4라운드. 등급 궤적 **A0/B17/C3 → A3/A-4/B+11/B4/C0** (분할 2편 신설 포함 22편). 수치 창작 4라운드 0건. featured 재선별(F 기준 신설): db-index(A)·ai-confirmation(A)·bug-report(A)·repetition(B+·허브). 중대 사건: 1차 감사의 분량이 UTF-8 바이트 오측정(3배) → S8 측정 프로토콜 명문화
- **2026-08-05 오후**: 구현 세션 핸드오프로 **`kiosk-screen-automation-renewal`** 발행 (수동 26→1 + 거짓 초록 3사건 + 스크린샷). Web UI 자동화 글은 심화 1편만 두는 방침 확정(분산 금지 — 사용자 결정), kiosk-infra 는 개요+링크. 128↔221 은 범위 차이("늘었다" 서술 금지). 발행 후 QA 러너 라이브 API(192.168.0.88:8080)로 수치 검산까지 완료
- **2026-08-05 저녁**: **`ai-technical-writer-teammate`** 발행 + AI 팀원 시리즈 **3부작→4부작** 전환(index "4인" 카드·about·시리즈 페이지·기존 3편 카드·여정기 허브). 게이트 1차 FAIL 사건: TW 글 본문에서 창작 수치 2건(31→실제 36, 초과 6편→실제 3편)을 독립 감사가 검출, 정정 후 재심사 10/10 통과 — 이 사건 자체를 gates.md 에 기록해 글의 논지 증거로 씀. api-runner 글은 **존치 확정**(결정 서사는 안 낡음) + 첫 버전 시점 표기

## 3. 현재 상태 (24편)

- 등급: **A 3** (db-index·ai-confirmation·bug-report) / **A- 4** (design-change·global-incident·qa-report·kiosk-infra) / **B+ 11** / **B 4** (regression·recipe·api-runner·field-service) / 신규 2편(kiosk-screen-renewal=게이트 A-, ai-technical-writer=게이트 통과, 정식 라운드 미편입)
- featured 4편: F1~F5 전 항목 정합 (라이브 반영됨)
- 문체: 한다체 기본, How-to(getting-started)만 존댓말 예외

## 4. 열린 작업 (우선순위순)

1. **저자 질의 9건 대기** — 답 오면 해당 항목만 집행, 승급 경로: regression→B+(Q22 동기화 트리거), api-runner→B+(Q15~17 사용 실측·local-fix2 사고), jira→A-(정착 실측), ai-qa-engineer→A-(Q14 가짜 테스트 실사례), ai-developer(독립검증 기원 사건), ai-planner(기각 대안), diff-driven(릴리스 서사), design-change(다음 실행 실측), qa-report(18번 export 폐기 사유), live-issue(6색 분포→스택 바). 목록 정본 = round4-spot.md 말미
2. **집행 가능 소형 3건** (질의 불요): field-service S6 문단 승격+W11 잔재 4건(→B+ 재심사), scrum 53건 본문 2회 중복 정리, ai-qa-engineer 도입 수치 보강
3. **후속 글감 보관**: ① QA 러너 리뉴얼 글 (API+Web UI 통합 새 UI, 「지금 검증하는 대상」·이어받음 — run-page.png 재료 확보, 구현 세션이 촬영 스크립트 자동화해 둠. api-runner 글 말미가 이 글을 예고하는 형태로 연결돼 있음) ② 신규 2편의 정식 감사 라운드 편입 (라운드 5 돌릴 때)
4. **분기 재선별 (F5)**: 다음 등급 변동 시 featured 재경합

## 5. 새 글 쓸 때의 표준 플로 (이번에 확립된 것)

1. 재료 핸드오프 수신 (구현/작업 세션 → Desktop\QA) — §0 익명화 표·금지 표현·수치 단위 명시돼 오는 게 정상
2. 기준 §1~7 따라 집필 (한다체·도입 3문단+수치·E1~E5·V6 figure 패턴은 기존 A급 글 마크업 재사용)
3. 모르는 값 → 질문 핸드오프 (`-questions-back`) → 답 수신 후 반영
4. **독립 게이트 감사** (별도 에이전트: 원재료 전수 대조 + 기준 전항 + 링크 정합) → FAIL 이면 정정 → 재심사
5. 게이트 기록을 `docs/audit/` 에 남김 → 로컬 `pnpm` 빌드 확인 → **사용자 push 승인** → push
6. 로컬 메모리 갱신

## 6. 주의 (사고 이력에서 나온 것)

- pubDatetime 은 UTC — 미래 시각이면 빌드에서 예약 글로 빠짐 (66p 사고)
- 분량 측정: 한글 글자수(공백 포함, frontmatter·코드·HTML 제외). 바이트 금지
- "수동 26→1"·"128↔221" 같은 수치는 단위·범위 조건이 붙어 있음 — 재인용 시 AUTHOR_ANSWERS·gates.md 원문 확인
- PowerShell 5.1 에서 한글 파일은 Get-Content 인코딩 사고 — 텍스트 치환은 Edit/Write 도구만
- 회사 민감 정보(Genting/실서버 주소/실코드) 익명화 — 샘플 값 표는 webui 핸드오프 §0 참조
