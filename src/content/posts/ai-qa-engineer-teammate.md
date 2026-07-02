---
author: 공윤구
pubDatetime: 2026-07-02T01:06:00.000Z
title: AI QA 엔지니어 팀원 만들기 — 무엇이 깨질까를 먼저 짚는 조수
slug: ai-qa-engineer-teammate
featured: false
draft: false
tags:
  - ai-teammate
  - qa-automation
description: 기획자와 대칭되는 AI QA 팀원. 기존 지식베이스를 재사용하고, 1년치 실수 교정을 헌법으로 이식한 설계기.
---

> 기획자가 '무엇을 만들까'라면, QA 엔지니어는 '무엇이 깨질까·무엇을 검증할까'를 담당하는 대칭 팀원이다.

<div class="not-prose my-6 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
  <p class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">시리즈 — AI 팀원 만들기 3부작</p>
  <p class="mt-2 leading-relaxed"><a class="text-foreground underline decoration-border underline-offset-4 hover:text-accent" href="/posts/ai-planner-teammate/">① 기획자</a><span class="text-muted-foreground"> → </span><strong class="text-accent">② QA 엔지니어 (이 글)</strong><span class="text-muted-foreground"> → </span><a class="text-foreground underline decoration-border underline-offset-4 hover:text-accent" href="/posts/ai-developer-teammate/">③ 개발자</a></p>
  <p class="mt-2 text-xs"><a class="text-muted-foreground hover:text-accent" href="/series/ai-teammate/">이 팀을 왜 셋으로 나눴는지 — 시리즈 소개 →</a></p>
</div>

## 배경

AI 기획자를 먼저 만들고 나니 대칭되는 QA 팀원이 필요해졌다. 사람 QA를 대체하는 게 아니라 보강하는 역할 — 예외·엣지·경계·상태전이를 먼저 짚어주고 테스트를 초안하는 조수다.

## 구성

기획자와 대칭되는 4층 구조(페르소나·헌법·방법론·상태).

**3대 역할:**

1. **테스트 커버리지 조언** — 예외·경계 먼저 제안, 정상 경로는 짧게
2. **유닛 테스트 작성** — 일부러 깨뜨려 red 확인하는 역검증 필수
3. **diff 기반 영향도 테스트**

**핵심 설계 원리 = 산출물마다 언어가 갈린다.** 테스터용(TC·조언)은 코드 용어 금지하고 메뉴·화면·조작·결과로 풀어쓰고, CI용(유닛테스트·diff노트)은 코드 용어 허용. 기획자는 항상 쉬운 말이지만, QA는 독자를 따라 언어를 분기한다.

**역할 경계:** 스펙 결정·배포·티켓 최종등록은 사람. QA는 검증·근거·초안까지.

## 지식베이스 재사용 — 신설 대신 병합

기획자처럼 전용 워크스페이스를 새로 파지 않았다. 이미 있는 QA 허브의 TC 설계 가이드(테스트 설계 기법, diff 기반 TC 규격, 버그리포트 형식)와 QA 리포트 규격을 그대로 지식베이스로 쓴다. **같은 규칙이 두 곳에 있으면 반드시 어긋난다 — 중복 0이 설계 목표였다.**

## 헌법에 박은 규칙들 — 경험이 옮겨진 곳

이 헌법의 조항 대부분은 새로 쓴 게 아니다. 지난 1년간 실수하고 교정받으며 쌓인 피드백 메모리를 그대로 이식했다:

- **자동화 fail ≠ dev 버그** — 키오스크 모드의 새로고침 불가 같은 스펙적 동작을 버그로 오인한 전례 → 티켓 전 스펙 대조 + 사용자 확인 필수.
- **자체 해결 우선** — 소스·문서로 확인 가능한 건 개발팀 미팅 안 기다리고 직접 확인.
- **리포트는 사내 호스팅만** — 고객 데이터 민감성.
- **유닛 테스트는 역검증 필수** — 일부러 코드를 깨뜨려 red를 확인해야 '항상 통과하는 가짜 테스트'를 걸러낸다.

## 결과

기획자와 한 쌍의 팀 구성 완료 — '무엇을 만들까'와 '무엇이 깨질까'가 각자의 헌법·방법론을 갖고 마주 보는 구조다. 사람 QA는 둘의 산출을 검증하고 결정하는 자리로 올라간다.

> 자동화 fail이 곧 dev 버그는 아니라는 원칙을 헌법에 박아, AI가 성급하게 티켓을 올리지 않고 스펙부터 대조하게 만들었다.
