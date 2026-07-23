---
author: 공윤구
pubDatetime: 2026-04-10T09:20:00.000Z
title: Regression TC 추출 + Jira 상태를 TC 시트로 자동 반영
slug: regression-and-status-sync
featured: false
draft: false
tags:
  - qa-automation
  - regression
  - jira
description: P0 기반 Regression 스위트 자동 추출과, 이슈 상태 변화를 TC 시트에 자동 반영하는 상태 전이 규칙 설계.
---

> P0 TC 기반 Regression 추출과 Jira → TC 상태 자동 동기화. (TC → Jira 방향의 버그 생성은 [Bug Report 자동화](/posts/bug-report-automation)가 담당 — 둘을 합치면 왕복이 닫힌다.)

## Regression TC 추출

Full TC에서 P0(Blocker) 항목을 자동 추출하고, 플로우 완전성을 위해 필요한 P1 TC를 보완하여 Regression Test Suite를 생성한다.

- P0 자동 추출 + Flow 보완 P1 추가
- N/A TC 제외 (비대상 항목 필터링)
- 대분류에 소스 접두사 자동 부여
- 어떤 프로젝트의 TC 시트에든 적용 가능

## Jira → TC 상태 동기화

Jira 이슈 상태 변경을 TC 시트에 자동 반영하는 워크플로우.

### 동기화 규칙

- 완료 → Pass (모든 연결 티켓이 완료일 때만)
- 반려 → N/A (재현 불가 / 요건 변경)
- 수정됨 → Fail 유지 (검증 대기)
- 다시 열림 → Fail 유지 (재발 버그)

## 어떤 문제를 겪었나

### 1. 다중 티켓 연결 TC의 처리

하나의 TC에 여러 티켓이 연결된 경우, 일부만 완료 시 Pass로 변경하면 안 된다. '모든 연결 티켓이 완료일 때만 Pass' 규칙을 명시했다.

### 2. 운영자/사용자 관점 혼동

관리 화면은 운영자 전용인데, 사용자 관점의 표현이 TC에 섞이는 경우가 있었다. 관점 규칙을 피드백 메모리에 저장하여 맥락을 고정했다.

## 핵심 교훈

> 상태 동기화에서 가장 중요한 건 '상태 전이 규칙'을 명확히 정의하는 것이다. 모호한 규칙은 데이터 불일치로 이어진다.

- Regression TC는 'P0만 추출'이 아니라 'P0 + 플로우 보완'이 실질적. 빠진 선행 단계가 있으면 테스트가 불가능하다.

---

→ 전체 여정에서 이 글의 위치: [QA 자동화 여정기](/posts/repetition-to-ai-judgment-to-human/) — Phase 5
