---
author: 공윤구
pubDatetime: 2026-07-23T00:30:00.000Z
title: 고객 일정에서 배포를 떼어내다 — 2~3주 릴리스 열차 만들기
slug: release-train-scrum
featured: false
draft: false
tags:
  - process
  - operations
description: 비정기 배포로 일정이 고객에 끌려다니던 팀에, 2~3주 주기 내부 릴리스 체계와 품질 게이트를 설계해 앉힌 기록.
---

> 고객 요구와 무관하게 내부적으로 안정된 열차를 굴리고, 고객에게는 검증된 버전을 골라 배포한다 — QA가 테스트를 넘어 배포 체계를 설계한 기록이다.

## 배경 — 무엇이 문제였나

우리 배포는 비정기였다. 변경분을 백로그에 모아뒀다가, 고객이 원하는 시점이 오면 일괄로 내보냈다. 그 구조에서 네 가지가 동시에 터졌다.

- 검증까지 끝난 변경분이 배포를 못 하고 계속 **쌓였다**
- 개발·QA 일정이 **고객 요청에 휘둘렸다** — 내부 품질 사이클을 돌릴 수가 없다
- 한 번에 다량을 배포하니 **회귀 범위가 커지고**, 장애가 나면 원인 격리가 어려웠다
- 오래 묵은 검증분은 배포 시점에 **재검증 부담**으로 되돌아왔다

## 방향 — 무엇을 분리했나

해법의 본질은 기능이 아니라 **분리**였다.

- **내부 트랙** — 고객과 무관하게 2~3주마다 항상 '배포 가능한' 검증 완료 버전을 만들어 둔다
- **고객 트랙** — 고객이 원할 때, 이미 검증된 버전 중 하나를 꺼내 배포한다

개발과 QA를 고객 일정의 예측 불가능성에서 떼어낸 것이다. 이때부터 열차 비유가 팀의 공용어가 됐다 — **열차는 정시에 출발하고, 못 탄 짐은 다음 열차에 실으며, 승객(고객)은 원하는 열차를 골라 탄다.**

## 설계 — "왜"가 있는 결정들

**스프린트 길이는 고정한다** (매번 2주냐 3주냐 고르지 않는다). 일정한 리듬이 있어야 속도를 측정할 수 있고, 캘린더가 예측 가능해지고, QA 기간을 산정할 수 있다 — 리듬이 모든 계산의 전제다.

작업일 배분은 이렇게 잡았다:

| 스프린트 | 총 작업일 | 개발 | QA |
| --- | --- | --- | --- |
| 2주 | 10일 | 6일 | 4일 (신규·변경 3 + Regression 1) |
| 3주 | 15일 | 9일 | 6일 (신규·변경 4 + Regression 2) |

<style>
  .rtviz { --c-dev: #4f46e5; --c-new: #0d9488; --c-reg: #d97706; }
  [data-theme="dark"] .rtviz { --c-dev: #6366f1; --c-new: #0d9488; --c-reg: #d97706; }
</style>

<figure class="rtviz not-prose my-6 rounded-xl border border-border bg-muted/40 p-4" role="img" aria-label="스프린트 타임라인. 2주 스프린트는 총 10일 중 개발 6일, QA 4일이며 QA는 신규·변경 3일 뒤 Regression 1일 순서. 3주 스프린트는 총 15일 중 개발 9일, QA 6일이며 신규·변경 4일 뒤 Regression 2일. 개발과 QA의 경계가 Code Freeze 지점이다">
  <figcaption class="text-xs font-semibold text-muted-foreground">스프린트 타임라인 — 폭 = 실제 작업일 비율 · Regression은 항상 마지막</figcaption>
  <div class="mt-4 space-y-5 text-xs">
    <div>
      <p class="mb-1 text-muted-foreground">2주 스프린트 (10일)</p>
      <div class="relative flex h-[22px] gap-[2px]">
        <div class="flex items-center justify-center rounded-l-[4px] text-white" style="width:60%; background:var(--c-dev)">6일</div>
        <div class="flex items-center justify-center text-white" style="width:30%; background:var(--c-new)">3일</div>
        <div class="flex items-center justify-center rounded-r-[4px] text-white" style="width:10%; background:var(--c-reg)">1일</div>
        <div class="absolute -top-1 bottom-[-4px] border-l border-dashed border-foreground/60" style="left:60%"></div>
      </div>
      <p class="mt-1.5 text-muted-foreground" style="margin-left:60%">↑ Code Freeze = QA 착수일</p>
    </div>
    <div>
      <p class="mb-1 text-muted-foreground">3주 스프린트 (15일)</p>
      <div class="relative flex h-[22px] gap-[2px]">
        <div class="flex items-center justify-center rounded-l-[4px] text-white" style="width:60%; background:var(--c-dev)">9일</div>
        <div class="flex items-center justify-center text-white" style="width:26.667%; background:var(--c-new)">4일</div>
        <div class="flex items-center justify-center rounded-r-[4px] text-white" style="width:13.333%; background:var(--c-reg)">2일</div>
        <div class="absolute -top-1 bottom-[-4px] border-l border-dashed border-foreground/60" style="left:60%"></div>
      </div>
    </div>
    <div class="pt-1 text-muted-foreground">막대 왼쪽부터 이 순서 —
      <span class="whitespace-nowrap">① <span class="mx-1 inline-block h-2.5 w-2.5 rounded-sm align-[-1px]" style="background:var(--c-dev)"></span>개발</span>
      <span class="whitespace-nowrap">② <span class="mx-1 inline-block h-2.5 w-2.5 rounded-sm align-[-1px]" style="background:var(--c-new)"></span>QA — 신규·변경</span>
      <span class="whitespace-nowrap">③ <span class="mx-1 inline-block h-2.5 w-2.5 rounded-sm align-[-1px]" style="background:var(--c-reg)"></span>QA — Regression</span>
    </div>
  </div>
</figure>

- **Code Freeze(신규 기능 머지 중단) = QA 착수일.** 이후엔 버그 수정만 받는다.
- **QA는 신규/변경 테스트를 먼저, Regression(회귀) 테스트는 마지막에.** 모든 수정이 들어온 상태에서 마지막 Regression을 돌려야 통합 영향도가 확인되기 때문이다.
- **범위 잠금(Scope Lock)** — 스프린트 시작 후 범위 추가 금지. 고객 긴급 건은 다음 스프린트나 급행(Hotfix) 트랙으로 보낸다.

그리고 이 설계의 성격을 규정하는 두 원칙:

1. **품질 게이트를 못 통과한 변경분은 그 스프린트 범위에서 빼고(de-scope), 열차는 정시에 출발한다.** 열차를 세워서 기다리는 순간 비정기 배포로 되돌아간다.
2. **고객 배포의 승인 주체는 QA다.** QA 승인 없이는 배포할 수 없다. 게이트가 이름뿐이면 프로세스 전체가 이름뿐이 된다.

## 버전을 둘로 나눈 이유

바로 부딪힌 문제 — 모듈(웹, 서비스 등)마다 버전이 제각각이라, "이번 릴리스는 몇 버전인가"를 하나로 말할 수 없었다.

해법은 버전을 두 층으로 나누는 것이다. **열차 번호는 상자 겉에 붙는 이름표**(배포 단위)고, **매니페스트(구성 목록)는 상자 안 물건 목록**이다 — 그 열차에 어느 모듈이 어느 버전으로 실렸는지.

```
Train 14  =  이름표 (배포 단위)
   └ 매니페스트: { Web 2.3.0, Service 1.7.5, ... }
```

열차 번호는 의미를 담은 버전이 아니라 **묶음을 가리키는 포인터**다. 모듈은 자기 버전 체계를 그대로 유지하고, 바뀐 모듈만 버전이 올라간다.

## 반직관 지점 — 고객 배포용 버전을 따로 만들지 않는다

처음엔 "고객에게 11\~14번 열차 변경분을 배포하려면 그걸 묶은 버전을 따로 만들어야 하나"라고 생각했다. 아니었다. 소프트웨어는 **누적**이라, 14번 열차의 빌드 안에는 11\~13번의 변경분이 이미 들어 있다.

그래서 "11\~14를 배포한다"가 아니라 "**14를 배포하면 앞의 것이 자동으로 포함된다**"가 맞다. 고객 배포는 새 버전을 만드는 일이 아니라 "**어느 열차를 어느 고객에 적용했는지 기록**"하는 일이 된다. 고객마다 다른 열차가 라이브일 수 있고, 그건 문제가 아니라 이 구조의 정상 상태다.

## 선반이 실제로 되려면 — 전시회 시나리오

검증된 버전을 선반에 올려두고 필요할 때 꺼내 쓴다 — 말은 쉽다. 실제가 되려면 조건이 있다.

상황: 개발은 15번 열차까지 갔는데, 전시회에서는 11번 열차 상태만 보여주고 싶다. 소프트웨어는 누적이라 **최신 코드로는 과거 상태를 만들 수 없다.** 시점을 미리 고정해둬야 한다. 필요한 것은 세 가지다.

1. **소스 시점 고정** — 모듈별 버전 태그
2. **그때의 버전 묶음 목록** — 매니페스트
3. **검증된 설치본 보관** — 같은 소스로 다시 빌드해도 그건 검증받지 않은 다른 물건이다

이 세 개가 갖춰져야 "선반에서 꺼내 쓰기"가 비유가 아니라 실제 동작이 된다.

## 급행 트랙

운영에서 터진 심각 장애는 2~3주 주기를 기다릴 수 없다. 그래서 급행(Hotfix) 경로를 따로 뒀다 — 라이브 버전 기준으로 분기하고, 최소 변경만 하고, 영향 범위를 한정한 Regression을 돌리고, 긴급 배포한다. 그리고 **반드시 본류로 되돌려 병합한다.** 이걸 빼먹으면 급행으로 고친 것이 다음 열차에서 사라진다.

## 설계는 문서, 실행은 도구

여기까지가 열차 체계의 **설계**다 — 무엇을 분리하고, 왜 그렇게 나눴는지. 하지만 설계는 문서일 뿐이고, 실제로 굴러가려면 도구(Jira) 위에 앉아야 한다. 그 과정에서 "에픽이 뭔가", "완료가 뭔가" 같은 기본 개념부터 다시 잡아야 했다 — 통계가 거짓말을 하고 있었고, 티켓이 보드에서 실종됐다. 그 정착기는 후속 글로 뺐다.

## 남은 것

체계는 섰지만 끝난 게 아니다. 열차가 몇 바퀴 돌아야 리듬이 팀의 습관이 되고, 게이트가 형식이 아니라 반사신경이 된다. 정착은 설계가 아니라 반복이 만든다 — 지금은 그 반복의 초입이다.

> 프로세스는 문서로 완성되지 않는다. 열차가 실제로 정시에 떠나봐야 한다.

---

→ 후속: [릴리스 열차를 Jira에 앉히다](/posts/release-train-jira/) — 에픽·스프린트·버전·QA를 바로잡은 정착기
