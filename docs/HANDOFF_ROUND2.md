# 📋 개선 핸드오프 라운드 2 — 재감사 결과 기반 (2026-07-29)

> **집행 세션용.** 라운드 1 집행 결과를 재감사한 후속 작업 지시서. 상세 판정·인용·교정문은 `docs/audit/2026-07-29-round2.md` 가 정본 — **작업 전 반드시 Read.**
> 라운드 1 문서(`HANDOFF_IMPROVEMENTS.md`)는 이력용 — 이 문서가 우선한다.

## 현재 등급: A- 2 · B+ 2 · B 16 · B- 2 · C 0 (22편)

## 변경된 전제 2개

1. **P6 감량 의무 폐기** — 1차 분량 수치가 UTF-8 바이트 오측정으로 판명. 실측상 대부분 S8 범위 내. 감량은 round2 문서에 명시된 "중복 제거" 항목만 수행 (qa-report 재진술 1문장, release-train 복붙 결말, ai-confirmation↔recipe 4문장, field-service 곁가지).
2. **분량 측정 프로토콜** 이 WRITING_STANDARD S8 에 추가됨 — 이후 모든 감사·집행이 이 방식(한글 글자수, 바이트 금지)을 따른다.

## 실행 순서

### R2-P1 — 사고 수습 (최우선, 저자 확인 불필요)

1. **tc-design "수십 행" 정합 위반** — 저자 답("약 10행")과 모순 잔존. round2 지시대로 교체
2. **집행 누락 2편 처리** — getting-started(승인 수치 34번 주입 + 크로스링크 4건), ai-developer(E3·S7/E4 정성 문장 — 수치 불요인데 오분류로 방치된 것)
3. **release-train 분할 후처리** — 복붙 결말 차별화(설계/정착 관점), scrum 에 53건 복원, 오해 2번 중복 축약
4. **ai-confirmation↔recipe verbatim 4문장** — 본편 축약
5. **허브 여정기 갭 분석 표기 2곳** (35·135행) — design-change 축소와 정렬
6. **regression "어긋남이 사라졌다"** — 사실 범위 한정 (확정 기준 3항 미이행분)
7. **bug-report "5분이라 쳐도"** — 가정 어미 삭제

### R2-P2 — 2라운드째 미집행 퀵윈 일괄

- W11 명사 종결 서술어 복원: live-issue 5건+ · field-service 6건+ (정확 문자열 round2 에 인용됨)
- release-train 급행 트랙 W3/W7 리스트화 · Regression 병기 이동
- live-issue "도메인"→"파이프라인" · "트리아지" 병기 · 신규 비문 2건 교정
- ai-planner "baseline(기준선)" · diff-driven "baseline(기준선)" 병기
- kiosk-infra Runner Web UI 글 링크 (W13 누락)
- ai-qa-engineer 표 컬럼명을 planner 와 통일

### R2-P3 — 다이어그램 7건 (감사 선별 확정분만)

필요 판정: bug-report 왕복도 · qa-report 파이프라인(코드블록 교체) · field-service 아키텍처+소유권 · getting-started MCP 연결도 · ai-developer 핸드오프 루프(3편 공용) · recipe 팬아웃 · realtime 부챗살(차순위)
대체안 채택: live-issue → 6색 스택 바 · global-incident → 2채널 분기도 · diff-driven → 번호 리스트 (다이어그램 만들지 말 것)
스타일: 기존 인라인 HTML figure 패턴 (aria-label + 다크 대응) 재사용. V3 before/after 표도 이 단계에서 일괄 (round2 포스트별 표 구성 참조).

### R2-P4 — 도입·마무리 표준화 (창작 불요 — 전부 본문 기존 수치 이동)

- 도입 수치 끌어올리기: repetition(615·50건) · ai-confirmation(33→0) · regression(120건·2일) · release-train-jira(80개·53건) · ai-planner(67화면) · diff-driven(TC 7건 훅 전진) · kiosk-infra(장면 훅 신설)
- S7② 미완 1문장: db-index(동시 부하 재현) · ai-confirmation(CI 게이트) · qa-report("계획 없음"도 정직한 E4) · global-incident 외 round2 참조
- V5 체감 환산: db-index(90GB) · ai-confirmation(화면당 7~8건) · release-train-jira(드롭다운) · realtime(3주)

### R2-P5 — recipe 글 보강 (신규 글 게이트 4항 FAIL)

실행 스텝 4~5단계 신설 + 팬아웃 도식 + 한계 2문장 + 본편 실측(25건) 1개 이식 + description 수치. round2 recipe 항목 참조.

### R2-P6 — api-runner·kiosk-infra 증량 (수치 불요 서사)

api-runner: 6단계 → 판단 서사(왜 SSE, spawn 사고). kiosk-infra: 장면 훅 + 상단 통계 카드 + Mock 부정합 사례 구체화.

## 저자 질의 7건 (A 승급 관문 — 별도 답변 대기, 집행과 병행 가능)

round2 말미 목록 참조. 답 오기 전 해당 항목 창작 금지 원칙 유지.

### R2-P7 — featured 재선별 (집행 마지막 단계, WRITING_STANDARD §8 F 기준 신설됨)

R2 집행 완료 후 라운드 3 재감사에서 등급 확정되면 적용. 잠정안: `db-index`·`ai-confirmation`·`bug-report`·`repetition(허브)` 4편 — 현행 featured 중 kiosk-infra·field-service 는 F2(B+ 하한) 미달로 교체 대상, 단 R2 집행으로 상향되면 재경합. **이 단계는 등급 확정 전 임의 실행 금지.**

## 집행 규칙 (라운드 1 과 동일 + 추가)

- 수치 창작 금지 · AUTHOR_ANSWERS 정본 · 익명화 유지 · pnpm 전용 · 로컬 빌드 후 push
- **추가**: 처리 시 round2 문서 해당 항목에 ✅ 표시 (라운드 3 diff 기준). 분할·글 신설 금지 — 이번 라운드는 보수 작업만.
- 완료 후 반환 핸드오프 1개 남길 것 (라운드 1 방식: `handoff-audit-execution-back-*.md`)
