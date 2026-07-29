# 📋 개선 핸드오프 — 블로그 20편 전수 감사 결과 (2026-07-29)

> **집행 세션용 작업 지시서.** Technical Writer 세션이 글로벌 스탠다드 기준(`docs/WRITING_STANDARD.md`)으로 20편을 전수 감사한 결과다.
> 포스트별 상세 판정(FAIL/PARTIAL 근거 인용 + before→after 수정 지시)은 `docs/audit/` 4개 파일이 정본 — **작업 전 해당 포스트의 감사 파일을 반드시 Read 할 것.**

## 감사 기록 위치 (정본 매핑)

| 파일 | 대상 포스트 |
|---|---|
| `docs/audit/2026-07-29-batch-1.md` | getting-started · ai-qa-engineer · ai-developer · ai-planner · diff-driven-tc |
| `docs/audit/2026-07-29-batch-2.md` | db-index · ai-confirmation-bias · repetition-to-ai · api-runner · kiosk-infra |
| `docs/audit/2026-07-29-batch-3.md` | release-train · live-issue-triage · realtime-monitoring · field-service-jira-sync |
| `docs/audit/2026-07-29-reaudit-6.md` ★ | tc-design · qa-report · bug-report · regression · design-change · global-incident (확장 커밋 65e423c 반영본 기준 정본) |

## 등급 총괄

**A 0 / B 17 / C 3.** C(구조적 미달) = `ai-qa-engineer-teammate`, `api-runner-web-ui`, `global-incident-management`.

블로그 전체의 결함은 문장이 아니라 **구조·신뢰 장치**에 집중된다 (W 계열 위반은 전 포스트 극소):

| 전수 공통 결함 | 규모 | 처방 |
|---|---|---|
| 성과 before/after 실측 부재 (E1) — "체감 80%", "크게 단축", 정성 선언 | 20/20 미달 (qa-report 만 근접 충족) | 아래 P2 수치 수집 → P3 주입 |
| 다이어그램 부재 (V1) + 결과 시각화 부재 (V3) | V1 17/20, V3 20/20 | P4 일괄 작업 (mermaid + before/after 표) |
| 트레이드오프 문장 (E3) "X 대신 Y, 대가는 Z" | 대부분 부재 — 대가에 해당하는 사실은 본문에 있는데 연결만 안 됨 | 포스트당 1문장 추가 |
| 마무리 미완 과제 (S7②/E4) | 18/20 부재 (db·kiosk-infra·design-change 만 보유) | "이 X가 보장하지 않는 것" 섹션 패턴 이식 |
| 검증 방법 공개 (E5) | 사실상 20/20 부재 | "어떻게 쟀는지" 1문장씩 |
| 도입부 수치 (S1) | 대부분 부재 — **필요 수치가 같은 글 후반에 이미 존재**하는 경우 다수 | 후반 수치를 도입으로 끌어올리기 (S1+S3 동시 해결) |
| 제목 수치 (H3) / 기능 나열형 제목 (H1) | H3 19/20, H1 위반 4편 | 감사 파일에 교체안 제시됨 — 전부 퀵윈 |

---

## 실행 플랜 (순서 고정)

### P0 — 사용자 결정 필요 (집행 세션이 임의 결정 금지)

1. **문체 정책**: `getting-started`(합니다체)·`repetition-to-ai`(합니다체) vs 나머지 18편(한다체). 기준 §0 기본값은 한다체. → ⓐ 두 편을 한다체로 리라이팅 ⓑ "가이드·허브 글은 존댓말" 예외를 WRITING_STANDARD §0에 명문화 — 택일.
2. **분할 여부**: `release-train-scrum`(9,270자 — 상한 2배) → 릴리스 열차 설계 / Jira 정착기 2편 분할 권고. `ai-confirmation-bias`(6,000자+) → Explanation / How-to(재현 레시피) 분할 권고. 승인 필요.
3. **design-change-detection 스코프**: "TC 커버리지 갭 분석"을 ⓐ 본문에 실체 보강 ⓑ 제목·도입에서 제거하고 변경 감지 단일 주제로 축소 — 택일.

### P1 — 퀵윈 일괄 (저자 확인 불필요, 1세션 처리 가능)

각 감사 파일 "퀵윈" 항목 전부. 대표:
- 제목/description 수치·패턴 교체 (교체안이 감사 파일에 문자열로 제시됨): bug-report, tc-design, regression(H1 FAIL), design-change(H1 FAIL), global-incident, kiosk-infra, api-runner, field-service
- W 교정 (before→after 쌍이 감사 파일에 있음): 명사 종결 서술어화(live-issue 4건·field-service 6건·global-incident 4건), 피동·번역투 치환(design-change, global-incident, tc-design, diff-driven-tc, repetition 4건), 연결어미 분리
- 용어 병기: "트리아지", "N/T", "red", "IA", "DRY", "멱등"·"BFS"·"HMAC", "Action Required vs Guide Exists", "Satisfice" 역순 교정
- 셀 참조 코드 폰트화 (bug-report `D2`·`I`열)
- ai-confirmation "## 덧" 섹션을 결론 뒤로 이동
- global-incident 에 관련 글 링크 푸터 추가 (유일 누락)

### P2 — [저자 확인] 수치 수집 (사용자 답변 필요 — 아래 질문지)

### P3 — 수치 주입 + 신뢰 장치 패치 (P2 답변 후)

전 포스트 공통 패치 공식: **"수치 3개(도입 1·성과 1·체감 환산 1) + 트레이드오프 1문장 + 미완 과제 1문단 + 측정 방법 1문장"**. 포스트별 삽입 위치·문형은 감사 파일 수정 지시 그대로.

### P4 — 시각 자료 일괄 (저자 확인 불필요)

- **mermaid 다이어그램** — 감사 파일에 노드 구성까지 제시됨: bug-report(TC↔Jira 왕복 — regression 과 공유 가능), qa-report(파이프라인+사람 개입 노드), design-change(스냅샷 diff 플로), global-incident(stateDiagram), tc-design(하이브리드 2단계), kiosk-infra(5단계+두 트랙), ai-confirmation(컨텍스트 격리 구조), repetition(MCP 방사형), api-runner(SSE/spawn 흐름), field-service(앱↔Edge Function↔Jira+소유권 경계), live-issue(6색 분기), getting-started(MCP 연결), ai-developer(핸드오프 루프 — 3부작 공용), diff-driven-tc(diff 파이프라인)
- **before/after 표** — 결과 섹션에 2열 표 (구성이 감사 파일에 제시됨)
- 인라인 차트 스타일 참조 구현: `db-index-performance-test.md` (aria-label + `[data-theme="dark"]` 다크 대응 — V6 유일 PASS)

### P5 — 구조 리라이팅 (C등급 3편, 우선순위순)

1. `ai-qa-engineer-teammate` (1,300자 — 하한의 52%): 유닛 테스트 역검증 실전 사례 1개를 장면으로 확장 + 4층 구조 표 + 수치 주입 → 배치 1 참조
2. `api-runner-web-ui` (1,200자): 신뢰 장치 층 신설(실패담 local-fix2 서사 + before/after + 한계 섹션) + 6단계를 판단 서사로 확장 → 배치 2 참조
3. `global-incident-management`: 도입 3문단 재구성 + E1 수치 접지 + 상태 다이어그램 → reaudit-6 참조

### P6 — 분량 조정 (P0-2 결정 후)

release-train 분할 · ai-confirmation 분할 · qa-report/bug-report/tc-design 감량(감량 지점이 감사 파일에 제시됨) · repetition Phase 압축

---

## [저자 확인] 질문지 — P2에서 사용자에게 받을 값

> 실측이 없는 항목은 "없음"으로 답해도 됨 — 그 경우 감사 지시대로 가정임을 명시하거나 사례 고정으로 대체.

**tc-design-automation**: ① 화면당 평균 TC 행 수 ② 대표 화면 1세트 수동/자동 소요 실측 ③ TC 1건 수동 작성 분 ④ 측정 비교 조건
**bug-report-automation**: ⑤ 버그 1건 수동 작성 실측 분 ⑥ 회귀 1바퀴 평균 결함 건수 ⑦ 자동 생성 1건 소요 ⑧ 수동/자동 비교 수행 여부
**qa-report-automation**: ⑨ 시트 export 폐기의 구체 사유 2가지 ⑩ 다음 단계 계획(실장비 구간)
**regression-and-status-sync**: ⑪ 전수 TC 총 건수 ⑫ 회귀 1바퀴 소요 ⑬ 동기화 트리거 방식(수동 커맨드/주기) ⑭ 운용 릴리스 횟수·불일치 건수
**design-change-detection**: ⑮ 실행 실측(전체 화면 수 → 평균 변경 화면 수) ⑯ 갭 분석 대조 키·리포트 포맷 (또는 스코프 축소 결정) ⑰ 오탐 전/후 실측
**global-incident-management**: ⑱ 고객사 수·장비 대수·월 알림 건수(익명 개략) ⑲ 운영 기간·표준 리포트 발행 건수·컴플레인 재발 여부 ⑳ 템플릿 전/후 필드 수 ㉑ 미완 과제(Telegram→Jira 자동티켓 예고 여부)
**AI 팀원 3부작**: ㉒ QA 팀원 산출 실적(헌법 조항 수·걸러낸 가짜 테스트 건수 등) ㉓ 개발자 파일럿 수치(수용 기준 N/N·검증 명령 횟수) ㉔ 기획자 화면당 소요(사람 대비)
**프로세스/운영**: ㉕ release-train 전환 전후 지표(리드타임·백로그 체류) ㉖ live-issue 자동화 후 소요(반나절→?) ㉗ 관제 장비 대수·일 평균 알람 ㉘ field-service 파트너사 수·월 적재 건수
**기타**: ㉙ kiosk-infra 1,160건 사람 환산(회귀 N일치) ㉚ api-runner 사용 인원/실행 빈도 변화 ㉛ getting-started·diff-driven-tc·db 시딩 시행착오 등 (배치 1·2 참조)

---

## 발행 전 게이트 (신규 글 공통 — 이번 패치에도 적용)

1. before/after 실측 한 쌍 없으면 발행 보류 (E1)
2. "X 대신 Y, 대가는 Z" 1문장 (E3)
3. "이 글이 보장하지 않는 것 / 남은 일" 1문단 (S7②/E4)
4. 다이어그램 또는 before/after 표 1개 (V1/V3)
5. 도입 3문단에 수치 1개 (S1)
6. 제목에 수치 또는 검증 패턴 (H1/H3)
7. `docs/WRITING_STANDARD.md` §8 체크리스트 통독

## 주의사항 (집행 세션)

- 수치는 **절대 창작 금지** — [저자 확인] 미답변 항목은 건드리지 말 것. 이 블로그의 신뢰는 실측에서 나온다.
- 회사 민감 정보 익명화 원칙 유지 (Genting/Clonix 실명·데이터 금지).
- 빌드: `pnpm` 전용 (npm 금지). push = Vercel 자동배포이므로 로컬 `pnpm build` 검증 후 push.
- 수정 후 해당 포스트의 감사 파일 항목에 처리 표시(✅)를 남길 것 — 다음 감사 라운드의 diff 기준.
