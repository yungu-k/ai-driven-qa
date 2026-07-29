# 📋 개선 핸드오프 라운드 3 — 마감 라운드 (2026-07-29)

> **집행 세션용.** 상세 근거·인용은 `docs/audit/2026-07-29-round3.md` 정본 — 작업 전 Read.
> 이번 라운드는 **마감**이다: 신규 구조 작업 없음, 전 항목이 기존 문장 이동·1문장 삽입·문자열 교체·플래그 전환. 예상 규모 = 커밋 2~3개.

## 현재 등급: A 2 · A- 1 · B+ 10 · B 9 · C 0

## R3-P1 — 승급 관문 마감 (창작 불요)

1. **design-change T1 3곳** (A- 관문, 10분 — R2에 이어 2회째 누락된 항목. 이번엔 반드시):
   - description "…자동 식별하고 TC 커버리지 갭을 리포트하는 시스템" → "…자동 식별하는 시스템. TC 갭 대조는 감지 위에 얹은 부수 기능"
   - 도입 "그 두 가지를 자동화했다" → "골라내기를 자동화하고, TC 대조는 부수로 얹었다"
   - 불릿 "…갭 분석 슬래시 커맨드" → "…갭 분석(부수) 슬래시 커맨드"
2. bug-report (A 관문): S7② 다음 단계 1문장 + 결과 표를 불릿 리스트 종료 후로 이동
3. global-incident (A- 관문): E3 "채널 분리의 대가 = 같은 장애 이중 기록" 1문장 + E5 재발 0건 확인 방법 반문장
4. qa-report (A- 관문): E3 1문장 (예: HTML 템플릿 채택의 대가 = 템플릿 유지보수)
5. kiosk-infra (A- 관문): 하단 "산출물 규모" 절 삭제(상단 카드와 중복 — "4종 검증" 구절만 카드 캡션으로 흡수) + 말미 Runner Web UI 예고 링크 마감
6. **repetition (featured 관문)**: Phase 2~5 를 `### 배경/접근/결과` 3헤딩 → 헤딩 없는 2~3문장 단락으로 압축 + 본문 산재 before/after 모은 V3 표 1개

## R3-P2 — B→B+ 소탕 (round3 "포스트별 잔존 지시" 그대로)

ai-qa-engineer(W3·S1) · ai-planner(E3·W3·V3 표) · tc-design(E5 구·W7 분리·V1 도식) · scrum(53건 도입 이동·V3 타임라인·마지막 문장 변주) · field-service(S7/E4 이동·S6 승격 2건·T1 승격·시제 순서·W11 ~10건) · recipe(도입 25건 1구)

## R3-P3 — 문장 위생 잔여 (round3 "경미" 절 전량)

getting-started·ai-developer·diff-driven·live-issue(W11 5건)·realtime(E3+수십 초)·jira(W11 1건·오해1 축약·마지막 문장 변주)·ai-confirmation(링크 정리)

## R3-P4 — featured 교체 (P1-6 repetition 보강 완료 후 실행)

```
db-index          featured: true  (유지)
ai-confirmation   featured: false → true
bug-report        featured: false → true
repetition        featured: true  (유지 — P1-6 선행 조건)
kiosk-infra       featured: true → false
field-service     featured: true → false
```
근거: WRITING_STANDARD §8 F1~F5 + round3 "featured 확정안". **repetition 보강 전에 플래그부터 바꾸지 말 것** (F2 위반 상태로 featured 유지 금지 — 보강이 같은 커밋이면 OK).

## 규칙

- 수치 창작 금지(3라운드 연속 0 유지) · AUTHOR_ANSWERS 정본 · pnpm 로컬 빌드 후 push
- round3.md 하단에 "✅ 라운드 3 집행 완료" 블록 기록 (라운드 4 diff 기준)
- **부분 집행 금지** — R2·R3 연속으로 "지시 절반만 집행" 패턴이 승급을 막았다 (field-service 2/6, design-change 1/4). 이번 라운드는 항목 수가 적으니 전량 소화 후 반환할 것. 불가한 항목은 사유를 ✅블록에 명기
- 저자 질의 9건(round3 말미)은 별도 대기 — 답 오기 전 해당 항목 착수 금지
