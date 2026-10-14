---
author: 공윤구
pubDatetime: 2026-10-12T05:00:00.000Z
title: 프레임워크를 안 쓴다던 결정을 몇 달 만에 뒤집었다
subtitle: 실행 Web UI 리뉴얼
slug: api-runner-renewal
featured: false
draft: false
tags:
  - test-automation
description: "화면이 셋이라 프레임워크를 버렸던 실행 UI가, 화면이 셋을 넘고 트랙이 둘이 되고 실행 주체가 사람에서 빌드 자동 감지로 늘면서 React로 갈아엎혔다. 예고했던 반대 선택이 실제로 온 기록."
---

> 명령어를 버튼으로 바꾼 실행 UI를 몇 달 만에 React로 갈아엎었다. 첫 화면도 '무엇을 돌릴까'를 묻는 실행 메뉴에서 '지금 무엇이 초록인가'를 보는 현황 화면으로 바뀌었다. 왜 바꿨고, 무엇은 일부러 안 바꿨는지.

## 몇 달 전의 그 문장

[명령어 없이 버튼으로 회귀를 돌리는 실행 UI](/posts/api-runner-web-ui/)를 만들면서, 나는 프레임워크를 안 쓰기로 했다. 순수 HTML과 JavaScript. 이유도 분명히 적었다. **"화면이 세 장뿐이라 감당 가능한 거래였다. 화면이 열 장이었다면 반대로 골랐을 것이다."**

그 문장은 조건부 약속이었다. 화면이 세 장을 넘으면 결정을 뒤집겠다는 예고. 이 글은 그 예고가 생각보다 빨리, 몇 달 만에 현실이 된 이야기다.

그 몇 달 사이에 세 가지가 동시에 커졌다.

- 화면이 세 장을 넘었다. 실행 메뉴·결과 아카이브·통계 세 장으로 시작했는데, 지금은 현황·두 트랙의 실행·계약 검증 상태·빌드 감지 이력·결함 초안까지 화면이 여러 겹이 됐다.
- 검사가 한 트랙에서 두 트랙이 됐다. 원래는 서버 API만 봤는데, 화면 동작을 보는 트랙이 같은 UI 아래로 합쳐졌다.
- 실행을 누르는 손이 사람에서 빌드 감지로 늘었다. 사람이 버튼을 누르는 것 위에, 새 빌드가 올라오면 스스로 도는 층이 얹혔다.

세 장이라 감당하던 손수 짠 상태 관리가, 여러 겹 화면에서는 버그의 온상이 됐다. 탭을 옮기면 진행 중이던 스트림이 끊기고, 두 트랙의 상태를 한 화면에 모으려니 전역 상태를 손으로 동기화해야 했다. 예고한 조건이 참이 된 것이다. 그래서 순수 HTML/JS에서 React로 갈아엎었다.

## 번복은 유행이 아니라 계산이었다

프레임워크를 안 쓴 게 틀렸던 건 아니다. 세 장일 때는 맞았다. 바뀐 건 화면의 수와 상태의 복잡도이지, 판단 기준이 아니다. 같은 기준을 같은 방식으로 다시 적용했더니 이번엔 반대 답이 나왔을 뿐이다.

| 축 | 처음 | 지금 | 왜 바뀌었나 |
| --- | --- | --- | --- |
| 아키텍처 | 순수 HTML/JS | React SPA | 손으로 짜던 상태·컴포넌트가 여러 겹 화면에서 한계를 넘었다 |
| 범위 | API 한 트랙 | API + 화면 두 트랙 통합 | 두 트랙 결과를 한자리에서 읽어야 운영에 쓰인다 |
| 트리거 | 사람이 버튼 | 사람 버튼 + 빌드 자동 감지 | 검증 대상 빌드가 계속 올라온다 |
| 첫 화면 | 실행 메뉴 | 현황(무엇이 초록인가) | 질문이 '어떻게 돌리지'에서 '지금 상태가 뭐지'로 바뀌었다 |

가장 큰 전환은 맨 아래 줄이다. 처음 이 도구의 첫 화면은 무엇을 돌릴지 고르는 **실행 메뉴**였다. 지금 첫 화면은 **현황**이다. 두 트랙의 최신 결과, 마지막으로 감지된 빌드, 상시 계약 검증이 몇 시간 전에 통과했는지가 한눈에 뜬다. 버튼을 누르러 들어가는 게 아니라, 눌리지 않아도 돌아간 결과를 보러 들어가는 화면이 됐다.

<figure class="not-prose my-6 rounded-xl border border-border bg-muted/40 p-4" role="img" aria-label="실행 UI의 처음과 지금 비교 도식. 처음에는 사람이 실행 메뉴에서 모듈을 골라 버튼을 누르면 API 한 트랙 러너가 돌았다. 지금은 왼쪽에서 빌드 감지(10분마다 확인)와 사람 버튼이라는 두 입력이 들어오고, 가운데 오케스트레이터가 API 트랙과 화면 트랙 두 갈래를 돌린 뒤, 오른쪽 현황 화면으로 결과가 모이고 실패는 결함 초안으로 이어진다. 기준 빌드 선택과 결함 등록 승인에는 사람 표시가 붙어 있다.">
  <figcaption class="text-xs font-semibold text-muted-foreground">처음엔 사람이 유일한 입력이었다. 지금은 빌드 감지가 하나 더 생겼고, 결과는 실행 메뉴가 아니라 현황으로 모인다</figcaption>
  <div class="mt-4 space-y-3 text-xs">
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span class="w-14 shrink-0 text-[10px] font-semibold text-muted-foreground">처음</span>
      <span class="rounded-lg border border-border bg-background/60 px-3 py-2 text-muted-foreground">사람 → 실행 메뉴</span>
      <span aria-hidden="true" class="text-muted-foreground">→</span>
      <span class="rounded-lg border border-border bg-background/60 px-3 py-2 text-muted-foreground">API 한 트랙</span>
      <span aria-hidden="true" class="text-muted-foreground">→</span>
      <span class="rounded-lg border border-border bg-background/60 px-3 py-2 text-muted-foreground">결과 아카이브</span>
    </div>
    <div class="flex flex-wrap items-center gap-x-2 gap-y-2">
      <span class="w-14 shrink-0 text-[10px] font-semibold text-foreground">지금</span>
      <span class="flex flex-col gap-1">
        <span class="rounded-md border border-dashed border-foreground/30 px-2 py-1 text-muted-foreground">빌드 감지 <span class="text-[10px]">(10분마다)</span></span>
        <span class="rounded-md border border-dashed border-foreground/30 px-2 py-1 text-muted-foreground">사람 버튼</span>
      </span>
      <span aria-hidden="true" class="text-muted-foreground">→</span>
      <span class="rounded-lg border border-accent/60 bg-accent/5 px-3 py-2 text-foreground">오케스트레이터<br/><span class="text-[10px] text-muted-foreground">API 트랙 · 화면 트랙</span></span>
      <span aria-hidden="true" class="text-muted-foreground">→</span>
      <span class="rounded-lg border border-border bg-background/60 px-3 py-2 text-foreground">현황 화면</span>
      <span aria-hidden="true" class="text-muted-foreground">→</span>
      <span class="rounded-md border border-dashed border-foreground/30 px-2 py-1 text-muted-foreground">실패 → 결함 초안 <span class="text-[10px]">(사람 승인)</span></span>
    </div>
  </div>
</figure>

![실제 현황 화면. 상단 두 트랙 카드(화면 트랙·API 트랙)에 각각 통과·실패·건너뜀 수가 뜨고, 가운데 자동화 파이프라인 칸이 젠킨스 감시(10분마다)·상시 계약 검증·Jira 승인 대기를, 아래 Jira 등록 대기 목록이 자동 실행이 만든 결함 초안들을 보여준다](/images/runner-overview.png)

_앞은 도식, 이건 실제 현황 화면이다. 두 트랙의 통과·실패·건너뜀, 젠킨스 감시·상시 계약 검증·Jira 승인 대기, 그리고 사람 승인을 기다리는 결함 초안이 한자리에 있다._

## 빌드가 올라오면 스스로 돈다 — 어디까지

'사람이 버튼을 누른다'가 이 도구의 처음 자랑이었다. 지금은 그 위에 한 층이 더 있다. 빌드 서버를 10분마다 들여다보다가 새 빌드가 올라온 걸 보면, 사람 손 없이 검사를 돌린다. 끝나면 결과를 현황에 올리고, 실패가 있으면 결함 티켓 초안까지 만들어 둔다.

그런데 중요한 건 **스스로 돌지 않는 구간**이다. 이 도구가 자동으로 하지 않는 일이 둘 있다.

- **무엇을 기준으로 검증할지는 사람이 고른다.** 빌드는 자동으로 받아 두지만, '어느 빌드를 기준으로 삼을지'는 화면에서 사람이 고정한다. 기준이 저절로 최신으로 따라 올라가면, 어제 초록이던 게 오늘 빨개졌을 때 제품이 깨진 건지 기준이 바뀐 건지 구분할 수 없다. 그 회귀 신호를 지키려고 일부러 자동화하지 않았다. (이 원칙의 자세한 사연은 [화면 자동화 리뉴얼기](/posts/kiosk-screen-automation-renewal/)에 따로 적었다.)
- **결함 등록은 초안까지만 자동이다.** 실패를 발견하면 티켓 초안을 '대기' 상태로 만들어 둔다. 실제로 이슈 트래커에 올리는 버튼은 사람이 누른다. 자동화가 오탐을 티켓으로 쏟아내면, 그 순간 아무도 티켓을 안 믿게 되기 때문이다.

정리하면 이렇다.

| 일 | 누가 |
| --- | --- |
| 새 빌드 감지·받아오기 | 자동 (10분 주기) |
| 무엇을 기준으로 검증할지 | **사람** (화면에서 고정) |
| 검사 실행 | 자동 또는 사람 |
| 결함 티켓 등록 | **사람** (초안은 자동, 등록 승인은 사람) |

처음 글의 마지막 문장은 "기술 장벽을 낮추는 UI가 자동화의 마지막 한 조각이었다"였다. 그건 틀렸다. 마지막 조각이 아니었다. 버튼을 누를 수 있게 만든 다음에도, **버튼을 안 눌러도 되게** 만드는 일이 남아 있었다. 그리고 그 끝에서도 사람의 손이 두 곳에 남는다. 무엇을 믿을지 정하는 자리와, 결함이라고 선언하는 자리다.

## 두 트랙이 한 화면 아래로

원래 이 UI는 서버 API를 돌리는 도구였다. 화면 동작을 보는 검사는 따로 자랐다. 리뉴얼하면서 둘을 한 UI 아래로 합쳤다. 지금 현황 화면은 두 갈래를 나란히 보여준다.

- **API 트랙**: 장비 제어 프로그램이 약속한 응답을 그대로 돌려주는지 본다. 기능 주소가 살아 있는지, 응답 형태가 기록해 둔 것과 같은지, 공표된 스펙 문서와 어긋나지 않는지. 이 트랙은 하루 한 번 스스로 돌며 '어제와 오늘이 같은가'를 지킨다.
- **화면 트랙**: 사용자가 보는 화면이 기획대로 뜨는지, 다국어가 손실 없이 바뀌는지, 거래 흐름이 끝까지 가는지를 본다. 이쪽이 새 빌드 감지에 걸려 자동으로 도는 트랙이다.

두 트랙은 저장 포맷과 결과 저장소를 공유한다. 사람이 버튼으로 돌리든, 빌드 감지가 돌리든, 하루 주기가 돌리든 결과는 한 곳에 쌓이고 한 현황에서 읽힌다. 실행 주체가 셋으로 늘어도 '무엇을 검증했나'의 기록은 하나로 모인다.

![실행 이력과 결과 상세 화면. 왼쪽은 회차별 통과·실패·건너뜀과 총 건수 목록, 오른쪽은 한 회차의 종합표(총 160·통과 157·건너뜀 3·실패 0)와 환경·모듈별 표](/images/runner-results-list.png)

_왼쪽은 회차별 목록, 오른쪽은 한 회차의 종합(160·157·3·0)과 환경·모듈별 표. 사람이 돌리든 빌드 감지가 돌리든, 결과는 같은 저장소에 쌓여 한자리에서 읽힌다._

## 그래서 무엇이 더 좋아졌나

솔직히 말하면, 리뉴얼은 새 기능을 많이 더하는 일이 아니었다. 더한 건 React와 자동 트리거 정도고, 나머지는 같은 일을 더 믿을 수 있게 만드는 작업이었다.

- 탭을 옮겨도 실행 로그 스트림이 끊기지 않는다. 손으로 짜던 상태를 프레임워크에 맡기자 사라진 버그다.
- '지금 뭐가 돌고 있나', '마지막 초록이 언제였나'를 들어가자마자 본다. 실행하러 들어가지 않아도 상태를 안다.
- 밤사이 올라온 빌드가 아침이면 이미 검증돼 있다. 사람이 출근해서 버튼을 누르기 전에 결과가 와 있다.

## 아직 사람 몫으로 남은 것

- **실제 장비의 물리 동작은 여전히 사람이 본다.** 검사는 응답 형태까지 보지만, 돈이 실제로 나오고 칩이 실제로 세어지는 건 최종적으로 사람이 확인한다.
- **스펙이 틀리면 검사도 같이 틀린다.** 이 도구는 실행기와 대조기일 뿐, 검증 기준 자체의 오류를 스스로 알지는 못한다. 이건 처음 글에도 적었고, React로 갈아엎어도 그대로다.
- **권한 구분은 아직 없다.** 사내 망 안에서 누가 눌렀는지는 남지 않는다. 외부로 한 발짝이라도 나가는 순간 가장 먼저 손봐야 할 자리다.

> 도구를 다시 짠다는 건 대개 새 기능을 더하는 일로 들린다. 하지만 이번 리뉴얼에서 가장 많이 한 일은 더하기가 아니라, **몇 달 전에 내가 적어 둔 트레이드오프를 다시 읽고 그 조건이 참이 됐는지 확인하는 것**이었다. 좋은 설계 결정은 영원히 옳은 결정이 아니라, 언제 뒤집을지를 함께 적어 둔 결정이다.

---

→ 이 도구의 첫 버전 기록: [1,000건 회귀를 버튼 하나로](/posts/api-runner-web-ui/) · 전체 여정: [QA 자동화 여정기](/posts/repetition-to-ai-judgment-to-human/) (Phase 7)
