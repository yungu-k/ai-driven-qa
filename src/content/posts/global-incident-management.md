---
author: 공윤구
pubDatetime: 2026-06-04T05:03:00.000Z
title: "'장애 후 뭘 하는지 안 보인다' — 고객 컴플레인에서 시작한 장애 대응 분리 설계"
slug: global-incident-management
featured: false
draft: false
tags:
  - process
  - operations
  - incident
description: 글로벌 B2B 고객의 장애를 표준 프로세스로 대응하고, 고객 공유 리포트와 내부 추적을 분리 운영하는 체계 설계기.
---

> 글로벌 B2B 고객의 Live Incident(장애)를 표준 프로세스로 대응하고, 고객 공유용 리포트와 내부 추적을 분리 운영하는 체계.

## 출발점

운영 규모는 글로벌 고객사 10곳 이상, 현장 장비 수십 대, 최근 6개월 기준 현장 알림 3,493건(전부가 장애는 아니다)이다.

그 와중에 한 고객사가 "장애가 나도 follow-up과 원인 공유(RCA)가 없다"고 공식 컴플레인을 제기했다. 이 컴플레인을 계기로 장애 대응 프로세스를 표준화했다. 핵심은 **"무엇을 고쳐주고 앞으로 무엇을 더 하는지"를 고객이 한눈에 보게 하는 것**. 이 글은 그 표준화 — 고객에게 무엇을 보이고 무엇을 내부에만 두는지의 분리 설계를 다룬다.

## 무엇을 만들었나

- **고객 공유 채널 (Google Sheets):** 전체 이슈 Master Log + 이슈별 Detail 리포트 템플릿. 스크립트 메뉴로 신규 이슈 1클릭 생성.
- **내부 추적 (Jira):** 고객 비노출. 장애 분석·회고를 워크플로우로 관리.
- **알림 입력:** 현장 알림을 분류해 위 두 채널로 연결.

<figure class="not-prose my-6 rounded-xl border border-border bg-muted/40 p-4" role="img" aria-label="2채널 분기 도식. 현장 알림이 들어오면 분류를 거쳐 두 채널로 갈린다. 고객 공유 채널은 Google Sheets로 결과 중심(원인·조치·배포 계획)만 담고, 내부 추적 채널은 Jira로 회고와 진행 상태를 담는다. 같은 장애를 목적이 다른 두 문서로 분리해 둘 다 각자 목적에 맞게 굴러간다.">
  <figcaption class="text-xs font-semibold text-muted-foreground">2채널 분리 — 고객은 결과만, 내부는 회고까지</figcaption>
  <div class="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs">
    <span class="rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-muted-foreground">현장 알림</span>
    <span aria-hidden="true" class="text-muted-foreground">→ 분류 →</span>
    <span class="flex flex-col gap-1.5">
      <span class="rounded-md border-2 border-accent bg-accent/10 px-2.5 py-1.5 text-accent">고객 채널 · Google Sheets<span class="block text-[10px] text-muted-foreground">결과 중심 (원인·조치·배포 계획)</span></span>
      <span class="rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-foreground">내부 추적 · Jira<span class="block text-[10px] text-muted-foreground">회고·진행 상태 (고객 비노출)</span></span>
    </span>
  </div>
</figure>

## 고객 공유 리포트 — 5섹션 템플릿

1. Incident Summary — ID/감지시각/장비/심각도/상태/담당
2. **Root Cause (필수)**
3. Impact Assessment — 다운타임/영향 장비/비즈니스 영향
4. **Corrective Action (필수)** — 즉시 복구 / 영구 수정 & 벤더 추가 조치
5. **Deployment Plan (필수)** — Fix Version/예정일/롤백 계획

> 고객 시트는 '결과 중심'으로. 내부 회고·진행 상태·작성 부담을 주는 필드는 모두 걷어내 고객이 한눈에 보게 했다.

## 워크플로우 설계

Postmortem(사후 회고)을 별도 이슈가 아닌 **워크플로우 상태로** 녹였다.

- 이슈 타입: 장애 대응(Incident) / 재발 방지(Preventive)
- 상태 흐름: Open → Analyzing → Fix In Progress → Deployed → Postmortem → Closed (+ Reopened)
- 회고: Postmortem 단계에서 KPT(Keep/Problem/Try — 유지할 것/문제/시도할 것). Try 항목이 곧 재발 방지 티켓으로 전환

## 겪은 문제와 해결

### 1. 고객에게 무엇까지 보여줄 것인가

초기 템플릿엔 Timeline·업데이트 로그·내부 회고·예정일+실제일 등 필드가 많아 고객 응대 부담이 됐다.

- **해결:** 고객이 실제로 필요로 하는 정보(무엇을·누가·언제까지)만 남기고 내부 관리 항목은 Jira로 이동.

### 2. '임시 복구'와 '영구 수정'의 경계

한 섹션에 합쳐 쓰니 작성자마다 해석이 달랐다.

- **해결:** ITIL(IT 서비스 관리 모범사례 체계) 기준으로 분리하고, 분류 기준을 '**배포되어 나가는 변경인가**'라는 단일 기계적 기준으로 정리.

### 3. 벤더가 '더 하는 것'을 어떻게 보여줄까

컴플레인 핵심은 '장애 후 우리가 뭐를 하는지 안 보인다'였다.

- **해결:** 영구 수정 섹션에 벤더 자발적 추가 조치를 녹이되, 'You should…'(고객에게 지시) 톤은 배제하고 'We will also…'(우리의 약속) 톤만 사용.

## 결과

- "장애 후 follow-up·RCA가 없다"는 고객 컴플레인이, **장애마다 원인·조치·배포 계획이 담긴 표준 리포트**로 응답되며 해소됐다.
- 고객 채널(결과 중심)과 내부 추적(회고·상태)을 **분리**해, 둘 다 각자 목적에 맞게 굴러간다. 고객은 한눈에 보고, 내부는 깊게 판다.
- 회고를 별도 산출물이 아니라 **워크플로우 상태**(Postmortem → Try → 재발 방지 티켓)로 녹여, 리포트 밖으로 새지 않고 안에서 닫힌다.
- 도입 후 **3개월간 매달 표준 리포트를 발행**했고, 그 사이 같은 유형의 "follow-up 없음" 컴플레인은 **재발 0건**이다.

| | 전 | 후 |
| --- | --- | --- |
| 장애 후 follow-up | "없다"는 공식 컴플레인 | 장애마다 원인·조치·배포 계획 표준 리포트 |
| 문서 | 고객·내부용이 한 곳에 뒤섞임 | 고객(Sheets)/내부(Jira) 2채널 분리 |
| 동일 컴플레인 | — | 3개월간 재발 0건 |

## 남은 것

지금은 알림을 사람이 분류해 채널로 흘려보낸다. 다음 단계는 자동화다 — 에러코드를 한 번 더 정규화하고 현장 장비가 안정화되면, 현장 알림에서 곧바로 Jira 티켓이 열리는 경로까지 연결할 예정이다. 3,493건을 사람이 훑는 대신, 장애로 판정된 알림만 자동으로 추적 궤도에 오르는 그림이다.

## 핵심 교훈

> 고객 공유 문서와 내부 관리 문서를 분리하라. 한 문서에 둘을 담으면 둘 다 어정쩡해진다.

- 분류 기준은 추상 원칙보다 기계적 단일 기준('배포 여부')이 작성자 판단 비용을 없앤다.
- 고객 보고 톤과 내부 지시 톤을 구분하라.
- 회고를 별도 산출물이 아닌 워크플로우 상태로 녹이면 리포트 안에서 완결된다.

---

→ 관련 글: [Regression + 상태 동기화](/posts/regression-and-status-sync)
