---
author: 공윤구
pubDatetime: 2026-07-23T01:00:00.000Z
title: 릴리스 열차를 Jira에 앉히다 — 에픽·스프린트·버전을 바로잡은 정착기
slug: release-train-jira
featured: false
draft: false
tags:
  - process
  - operations
  - jira
description: 2~3주 릴리스 열차 설계를 Jira 보드에 앉히며 에픽·스프린트·버전·QA 상태를 바로잡은 실행 기록. 프로세스의 절반은 쌓인 것을 걷어내는 일이었다.
---

> 설계는 문서고, 실행은 Jira다. [2~3주 릴리스 열차](/posts/release-train-scrum/)를 실제 보드에 앉히면서 가장 큰 오해들을 교정한 기록이다.

## 도구에 앉히기 — Jira에서 바로잡은 것들

[앞 글](/posts/release-train-scrum/)에서 열차 체계를 설계했다. 그 설계를 Jira에 옮기는 순간 첫 오해가 드러났다. 전환 전에는 "릴리스 묶음"과 "QA"를 각각 **에픽**으로 만들어 관리하고 있었다.

| 개념 | 잘못 쓰던 방식 | 바로잡음 |
| --- | --- | --- |
| 반복 주기 | (없음) | 스프린트 = 2~3주 실행 단위 |
| 기능 묶음 | 릴리스 버킷으로 오용 | 에픽 = 여러 스프린트에 걸치는 기능 테마 |
| 릴리스 버전 | 에픽으로 관리 | 버전 필드(Fix Version) = 배포 단위 |
| QA | 릴리스마다 QA 전용 에픽 | 에픽 폐지 → 각 작업의 흐름 안으로 |

여기서 명제 두 개가 나왔다.

**"에픽은 스프린트를 담는 그릇이 아니다."** 에픽과 스프린트는 N:M 관계다 — 한 에픽이 여러 스프린트에 걸치고, 한 스프린트에 여러 에픽의 조각이 실린다. 1:1로 묶는 순간 에픽은 '이번에 할 일 폴더'로 전락한다.

**"QA는 별도 단계가 아니라 각 작업의 완료 조건이다."** QA를 옆 라인에 빼두면, 스프린트 안에 미니 워터폴이 생긴다. 그래서 보드의 상태 흐름(개발 완료 → QA → 완료) 안에 넣었다.

<figure class="not-prose my-6 rounded-xl border border-border bg-muted/40 p-4" role="img" aria-label="보드 상태 흐름 도식. 백로그, 진행 중, 개발 완료, QA, 완료 다섯 상태가 한 줄로 이어진다. QA는 옆 라인이 아니라 흐름 안에 있고, 완료만 강조되어 있으며 개발 완료는 아직 완료가 아니다">
  <figcaption class="text-xs font-semibold text-muted-foreground">보드 상태 흐름 — QA는 흐름 안에 있고, '개발 완료'는 완료가 아니다</figcaption>
  <div class="mt-4 flex flex-wrap items-center gap-y-3 text-xs">
    <span class="rounded-lg border border-border bg-background/60 px-3 py-2 text-muted-foreground">백로그</span>
    <span aria-hidden="true" class="px-1.5 text-muted-foreground">→</span>
    <span class="rounded-lg border border-border bg-background/60 px-3 py-2 text-muted-foreground">진행 중</span>
    <span aria-hidden="true" class="px-1.5 text-muted-foreground">→</span>
    <span class="rounded-lg border border-border bg-background/60 px-3 py-2 text-foreground">개발 완료<span class="mt-0.5 block text-[10px] leading-tight text-muted-foreground">아직 검증 전</span></span>
    <span aria-hidden="true" class="px-1.5 text-muted-foreground">→</span>
    <span class="rounded-lg border border-border bg-background/60 px-3 py-2 text-foreground">QA<span class="mt-0.5 block text-[10px] leading-tight text-muted-foreground">각 작업의 완료 조건</span></span>
    <span aria-hidden="true" class="px-1.5 text-muted-foreground">→</span>
    <span class="rounded-lg border-2 border-accent bg-accent/10 px-3 py-2 font-bold text-accent">완료<span class="mt-0.5 block text-[10px] font-normal leading-tight text-muted-foreground">검증까지 끝남</span></span>
  </div>
</figure>

세부 결정 몇 가지 — 전부 "왜"가 있다:

- **버그는 독립 티켓**으로 만들고 원인 작업에 링크로 연결한다. 버그는 자체 우선순위, 수정이 실릴 버전, 재오픈 관리가 필요한데 — 에픽 하위에 묻으면 백로그에서 안 보인다.
- **보드는 통합 1개가 정본**이고, 팀별 보드는 자기 이슈만 보는 뷰로 남긴다. 규칙은 딱 하나 — **"스프린트는 한 곳에서만 시작한다."** 티켓의 스프린트 정보는 프로젝트 전역 공유라, 두 보드가 각자 스프린트를 돌리면 같은 티켓이 이중 배정되어 꼬인다.
- **보드에 무엇을 올릴지는 라벨로 지정**했다. 에픽 기준은 에픽이 계속 늘어 필터가 쉽게 깨지고, 다른 필드는 이미 오염됐거나 요금제 문제로 탈락. 라벨의 약점도 그대로 적어둔다 — **라벨이 빠지면 티켓이 보드에서 실종된다.** 그래서 자동 부여 규칙과 '누락 색출 필터'를 같이 만들었다.

실행분은 한 줄로: 통합 보드 신설, 릴리스 대상 티켓 **53건에 스코프 라벨 일괄 부여**, 스프린트 이름 규칙 확정 — 주차 표기는 2~3주 가변 폭이라 헷갈려서 폐기하고 순번 방식으로 갔다. 처음 한 번만 규칙대로 바꾸면 다음 스프린트부터 이름이 자동 증가한다.

## 깨진 오해 모음

하면서 "이렇게 생각했는데 아니더라"가 쌓였다. 여섯 개만 남긴다.

1. **에픽 하나가 한 번의 반복이다** → 아니다. 에픽:스프린트는 N:M이고, 1:1로 묶으면 에픽이 폴더로 전락한다.
2. **고객 배포용 버전을 따로 만들어야 한다** → 아니다. 누적이라 최신 검증본 하나를 지목하면 이전 것이 다 포함된다.
3. **개발 완료 = 끝** → 아니다. 개발 완료는 아직 검증 전이다. 이 상태가 '완료'로 집계되면 **통계가 거짓말을 한다** — 실제로 그렇게 잡혀 있었다.
4. **보류한 일은 완료인가 진행중인가** → 둘 다 아니다. 스프린트에서 빼서 백로그로 보낸다. 완료로 두면 안 했는데 한 것으로 집계된다.
5. **보드 컬럼만 나누면 된다** → 아니다. 컬럼은 상태를 비추는 **거울**일 뿐이다. 거울을 늘린다고 상태가 생기지 않는다 — 컬럼 두 개를 원하면 상태 두 개가 필요하다.
6. **일단 다 정리하고 시작하자** → 아니다. 한 번에 뒤엎지 않는다. 진행 중인 건은 기존 방식대로 마무리하고, 다음 주기부터 새 방식을 적용했다.

정리하다 드러난 것들도 있다. 버전 항목이 80개 넘게 난립해 있었고(모듈 버전이 릴리스 버전 자리에 들어와 있었다), 종결 사유엔 같은 이름이 중복으로 존재했고, 한 보드에 서로 다른 제품 라인이 섞여 있었다. 프로세스를 세우는 일의 절반은 **쌓인 것을 걷어내는 일**이었다.

## 남은 것

체계는 섰지만 끝난 게 아니다. 열차가 몇 바퀴 돌아야 리듬이 팀의 습관이 되고, 게이트가 형식이 아니라 반사신경이 된다. 정착은 설계가 아니라 반복이 만든다 — 지금은 그 반복의 초입이다.

> 프로세스는 문서로 완성되지 않는다. 열차가 실제로 정시에 떠나봐야 한다.

---

→ 앞 글: [2~3주 릴리스 열차 만들기](/posts/release-train-scrum/) — 열차 체계를 설계한 이야기
