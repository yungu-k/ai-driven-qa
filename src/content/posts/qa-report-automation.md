---
author: 공윤구
pubDatetime: 2026-04-10T09:18:00.000Z
title: QA Report 자동화 — Sign-off와 Status 리포트를 한 번의 명령으로
slug: qa-report-automation
featured: false
draft: false
tags:
  - qa-automation
  - report
description: Jira와 TC 데이터를 자동 수집해 QA Result(Sign-off)와 QA Status(진행현황) 리포트를 생성하는 체계.
---

> Jira + TC 데이터를 자동 수집하여 QA Result(Sign-off)와 QA Status(진행현황) 리포트를 생성하는 워크플로우.

## 무엇을 만들었나

515줄 규격 문서에 2종 리포트 규격을 정의하고, 슬래시 커맨드로 자동 생성하는 체계를 구축했다.

### QA Result (Sign-off Report)

- Test Summary: Total/Pass/Fail/N/A/N/T 집계 + Success Rate 수식
- Defect Summary: 전체 버그 목록 수집 + 상태/우선순위별 분류
- QA Opinion: 전체 품질 평가 (사실 기반, 추론 금지)
- Verification Details: TC 기반 검증 항목 상세

### QA Status (진행현황 Report)

- Test Execution Progress: 실시간 집계
- Defect Status: Open/Fixed/전체 결함 현황
- Remaining Work: 잔여 작업 목록

## 어떤 문제를 겪었나

### 1. 서식 깨짐의 연쇄 — 6가지 동시 발생

첫 생성 시 머지 충돌, 카테고리 헤더 덮어쓰기, 수식 오류, 서식 누락 등 6개 이슈가 한꺼번에 터졌다.

- **해결:** '서식 적용 필수 규칙' 6개항 신설. 특히 '머지 순서'와 '데이터 범위 시작 행' 규칙이 핵심이었다.

### 2. off-by-one(참조가 한 행씩 밀리는) 에러의 반복

수식의 행 참조가 헤더 행을 포함하거나, 범위 끝이 exclusive라서 마지막 행이 빠지는 문제가 5회 이상 반복되었다. 규칙으로 명시하여 해결했다.

### 3. 공백 행 제거

섹션 구분용 빈 행이 매번 수동 삭제를 유발했다. 전면 제거하고 Section Header 자체가 시각적 구분 역할을 하도록 변경했다.

### 4. Jira 페이지네이션 누락

검색 결과가 기본 페이지 한도(50건)를 넘으면 첫 페이지만 가져와 결함 수가 불일치했다. 페이지네이션을 모든 쿼리에 적용하여 해결했다.

## 핵심 교훈

> 리포트 자동화에서 가장 어려운 건 '데이터 수집'이 아니라 '서식 일관성'이다. 머지 순서, 행 참조, 빈 행 하나가 전체 레이아웃을 무너뜨린다.

- 실패 패턴을 규칙으로 문서화하면 AI가 같은 실수를 반복하지 않는다.
- 사용자 관점에서 불필요한 요소는 과감히 제거해야 한다. AI는 관성적으로 넣으려 한다.

---

→ 전체 여정에서 이 글의 위치: [QA 자동화 여정기](/posts/repetition-to-ai-judgment-to-human/) — Phase 3
