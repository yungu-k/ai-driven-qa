---
author: 공윤구
pubDatetime: 2026-04-10T09:17:00.000Z
title: Bug Report 자동화 — 버그 한 건 5분에서 1분으로, TC와 Jira의 왕복을 없애다
slug: bug-report-automation
featured: false
draft: false
tags:
  - qa-automation
  - bug-report
  - jira
description: TC에서 Fail 항목을 선택하면 Jira 버그를 규격대로 자동 생성하고 TC 시트를 자동 업데이트하는 워크플로우. 손이 아니라 규칙이 버그를 쓴다.
---

> TC에서 Fail 항목을 선택하면 Jira에 버그를 자동 생성하고, TC 시트를 자동 업데이트하는 워크플로우. (반대 방향 — 이슈 상태를 TC에 되반영하는 쪽은 [Regression + 상태 동기화](/posts/regression-and-status-sync) 글이 담당한다. 둘을 합치면 TC ↔ Jira 왕복이 닫힌다.)

## 버그 하나 쓰는 데 5분, 초반엔 하루 수십 건

QA를 하다 보면 결함 자체를 찾는 시간보다 **결함을 리포트로 옮기는 시간**이 더 든다. Fail 하나가 나올 때마다 Jira를 열고, Summary를 규칙에 맞게 짓고, 환경·사전조건·재현 절차·기대 결과·실제 결과·관련 TC를 손으로 채운다. 신규 프로젝트 테스트 초반엔 버그가 하루에 수십 건씩 쏟아지는데, 한 건에 평균 5분, 수십 건이면 반나절이 증발한다.

게다가 그 반나절짜리 노동의 결과물이 **일관되지도 않다**. 어제는 Summary에 풀네임을 쓰고 오늘은 라벨 코드를 쓰고, 재현 절차를 어떤 건 3줄 어떤 건 10줄로 쓴다. 검색·필터·집계가 다 어긋난다.

핵심 문제는 이거였다 — **버그 리포트에 필요한 정보는 이미 TC 시트에 다 있다.** 사전조건도, 테스트 스텝도, 기대 결과도. 그걸 사람이 손으로 Jira에 다시 옮겨 적고 있을 뿐이다. 같은 정보를 두 번 쓰는 왕복(round-trip)을 없애는 게 목표였다.

## 접근 — 규칙을 문서에 박고, 시트를 원천으로 재사용

두 가지 원칙을 세웠다.

**첫째, 버그 작성 규칙을 규격 문서로 고정한다.** AI에게 "버그 잘 써줘"라고 하면 매번 다르게 쓴다. 대신 Summary 네이밍, Description 섹션 순서, 필수/선택 여부를 **표로 못박은 규격**을 만들고, AI는 그 규격을 그대로 실행하게 했다. 품질을 프롬프트가 아니라 문서로 통제하는 방식이다.

**둘째, TC 시트를 단일 원천(SSOT)으로 삼는다.** 환경·사전조건·재현 절차·기대 결과는 새로 쓰지 않고 TC 시트의 해당 컬럼에서 그대로 끌어온다. 사람이 하는 건 "이 Fail을 버그로 만들어라" 지목뿐.

<figure class="not-prose my-6 rounded-xl border border-border bg-muted/40 p-4" role="img" aria-label="TC와 Jira의 왕복 순환도. 수동에서는 TC 시트에서 Fail을 확인하고, 사람이 Jira로 건너가 버그를 손으로 작성하고, 다시 TC 시트로 돌아와 결과와 링크를 채우는 왕복이 반복된다. 자동에서는 TC 시트에서 Fail을 지목하면 규칙이 Jira 버그를 생성하고 곧바로 TC 시트에 Fail과 이슈 URL을 되쓴다 — 사람의 왕복이 지목 한 번으로 닫힌다.">
  <figcaption class="text-xs font-semibold text-muted-foreground">TC ↔ Jira 왕복 — 사람이 오가던 경로를 규칙이 한 방향으로 닫는다</figcaption>
  <div class="mt-4 space-y-3 text-xs">
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span class="w-14 shrink-0 font-semibold text-muted-foreground">수동</span>
      <span class="rounded-md border border-border bg-background/60 px-2 py-1 text-muted-foreground">TC 시트 Fail</span>
      <span aria-hidden="true" class="text-muted-foreground">→ 사람 →</span>
      <span class="rounded-md border border-border bg-background/60 px-2 py-1 text-muted-foreground">Jira 손입력 6섹션</span>
      <span aria-hidden="true" class="text-muted-foreground">→ 사람 →</span>
      <span class="rounded-md border border-border bg-background/60 px-2 py-1 text-muted-foreground">TC 시트에 결과·링크</span>
    </div>
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span class="w-14 shrink-0 font-semibold text-accent">자동</span>
      <span class="rounded-md border border-accent/60 bg-accent/5 px-2 py-1 text-foreground">Fail 지목 (사람)</span>
      <span aria-hidden="true" class="text-accent">→ 규칙 →</span>
      <span class="rounded-md border border-border bg-background/60 px-2 py-1 text-muted-foreground">Jira 버그 생성</span>
      <span aria-hidden="true" class="text-accent">→ 규칙 →</span>
      <span class="rounded-md border border-border bg-background/60 px-2 py-1 text-muted-foreground">TC에 Fail·URL 되쓰기</span>
    </div>
  </div>
</figure>

## 구현 — 시트에서 읽고, 규격대로 쓰고, 시트에 되쓴다

**① 시트 상단에서 메타데이터를 자동 파싱.** TC 시트 고정 셀(`D2`·`D3`·`D4`)에 Epic·라벨·테스트 버전을 적어두면, 버그 생성 시 이걸 읽어 Jira `parent`(Epic), `labels`, 그리고 Summary 접두사와 환경 섹션에 자동으로 꽂는다. Epic에 붙은 추가 라벨도 상속한다. 프로젝트가 바뀌어도 이 세 셀만 갈아끼우면 된다.

**② Summary는 팀 검색 규칙에 맞춰 생성.**

```
[라벨코드] 화면명 - 현상 요약

예) [MRK] 시작 화면 - '시작하기' 버튼 터치 미반응
    [LSK] 보관함 선택 - 빈 보관함 없음 안내 미표시
```

접두사는 반드시 **Epic의 라벨 코드 그대로**(풀네임 금지) — 팀 내 필터가 이 코드로 걸리기 때문이다.

**③ Description은 6개 섹션을 고정 순서로 채운다.** TC 시트의 값을 섹션에 매핑한다:

```
### 환경        ← 대상 서비스 + 테스트 버전(D4)
### 사전조건    ← TC Pre-Condition 컬럼 그대로
### 재현 절차   ← TC Test Step + 재현에 필요한 추가 동작
### 기대 결과   ← TC Expected Result
### 실제 결과   ← 실제 현상 구체 기술 (사람이 확인한 값)
### 관련 TC     ← TC ID + 시트 셀 딥링크
```

`### 비고`는 참고할 게 있을 때만 붙이고 없으면 생략한다. 여섯 섹션 중 다섯은 시트에서 자동으로 오고, 사람은 "실제 결과" 한 칸만 확인해 주면 된다.

**④ 만들고 끝이 아니라 시트에 되쓴다.** 버그가 생성되면 그 TC 행의 결과 컬럼(`I`열)에 `Fail`을, 코멘트 컬럼(`J`열)에 생성된 이슈 URL을 자동으로 되쓴다. 리포트와 시트가 어긋날 틈을 없앤다.

## 시행착오 — 규칙은 다 부딪혀 보고 나서야 박힌다

**1. 라벨 코드 vs 풀네임.** 처음엔 Summary에 읽기 좋은 풀네임을 썼다. 그런데 팀은 라벨 코드로 필터를 건다. 풀네임 버그는 검색에서 통째로 누락됐다. → "접두사는 Epic 라벨 코드 그대로"를 규격에 명시.

**2. 테스트 버전 캐싱.** 대화 시작 때 버전을 한 번 읽어 캐싱했더니, 중간에 버전이 바뀌면 옛 버전으로 버그가 찍혔다. → "버전은 **매번 실시간 조회**" 규칙을 피드백 메모리에 저장. (조회 1회로 만족하는 건, 이 블로그 다른 글에서 반복해 다루는 확증편향의 전형이다.)

**3. Jira `environment` 필드의 포맷 제한.** Jira Cloud의 environment 필드는 ADF(특수 문서 포맷)를 요구해 API로 직접 못 넣었다. 우회를 붙들기보다, **Description 본문의 `### 환경` 섹션으로 대체**하고 필드 자체는 비워두는 걸로 확정했다. API 한계는 빨리 인정하고 우회 경로를 명확히 정하는 게 시간을 아낀다.

## 결과

- 버그 한 건 작성이 "Jira 열고 6섹션 손입력"에서 "Fail 지목 + 실제 결과 한 줄 확인"으로 줄었다. 손으로 평균 5분 걸리던 게 자동 생성은 1분 이내 — 정식 벤치마크를 돌린 건 아니지만 체감 효율이 컸다.

| | 수동 | 자동 |
| --- | --- | --- |
| 건당 작성 | 평균 5분 | 1분 이내 |
| 포맷 일관성 | 뒤로 갈수록 흐트러짐 | 마지막 1건까지 동일 |
| TC↔Jira 왕복 | 사람이 두 번 오감 | 지목 한 번 |
- 더 큰 이득은 시간이 아니라 **일관성**이다. 몇 건을 만들든 Summary 형식·Description 6섹션·라벨·버전이 동일하게 나온다. 검색·필터·집계가 처음부터 맞는다.
- 라벨/Epic만 바꾸면 **다른 프로젝트에도 그대로** 붙는다 — 규칙이 시트 상단 세 셀에 외부화돼 있기 때문이다.

## 교훈

> 자동화의 가치는 '버그 하나 만드는 시간'이 아니라, '여러 건을 **일관된 포맷**으로 만드는 시간'에 있다.

- **팀 규칙을 코드(규격 문서)로 옮기면 휴먼 에러가 사라진다.** 라벨 상속, Summary 접두사 같은 암묵 규칙일수록 문서에 박아야 한다.
- **같은 정보를 두 번 쓰지 마라.** TC 시트를 원천으로 재사용하면 버그 리포트는 "옮겨 적기"가 아니라 "지목하기"가 된다.
- TC → 버그 생성과 버그 상태 → TC 반영을 **양방향으로 닫아야** 데이터가 어긋나지 않는다.

---

→ 전체 여정에서 이 글의 위치: [QA 자동화 여정기](/posts/repetition-to-ai-judgment-to-human/) — Phase 2
