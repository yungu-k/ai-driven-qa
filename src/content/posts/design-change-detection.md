---
author: 공윤구
pubDatetime: 2026-04-10T09:19:00.000Z
title: Figma는 '바뀐 화면 목록'을 주지 않는다
slug: design-change-detection
featured: false
draft: false
tags:
  - qa-automation
  - figma
  - coverage
description: Figma 노드 트리 스냅샷 diff로 변경 화면을 자동 식별하는 시스템. TC 갭 대조는 감지 위에 얹은 부수 기능이다. 30개 화면 전수 육안 확인을 변경분 확인으로 줄였다.
---

> 30개 화면 중 '바뀐 것만' 스냅샷 diff로 자동으로 골라내는 감지 워크플로우. 그 화면의 TC 갭 대조는 감지 위에 얹은 부수 기능이다.

## 어느 화면이 바뀌었는지, 눈으로 찾고 있었다

시안이 업데이트되면 QA는 "이번엔 뭐가 바뀌었지?"부터 확인해야 한다. 그런데 Figma는 '바뀐 화면 목록'을 주지 않는다. 30개 화면짜리 파일이면 30개를 다시 열어 "아, 여기 버튼 하나 늘었네"를 눈으로 찾는다. 놓치면 그 화면의 TC 갱신도 통째로 누락된다.

바뀐 화면만 골라주고, 그 화면에 대응하는 TC가 있는지까지 대조해주면 되는 일이었다. 골라내기를 자동화하고, TC 대조는 부수로 얹었다. 이 글은 감지 규칙과, 그 감지가 보장하지 않는 것까지 다룬다.

## 무엇을 만들었나

Figma REST API로 페이지별 노드 트리를 JSON 스냅샷으로 저장하고, 이전 스냅샷과 diff한다. 그렇게 추가/삭제/변경된 화면을 자동 식별한다. 비교 기준은 프레임의 **이름·숨김 여부·하위 요소 개수** 세 가지다.

- 스냅샷 저장/로드/비교 유틸리티 (약 230줄)
- 변경 감지 + TC 커버리지 갭 분석(부수) 슬래시 커맨드
- 대상 페이지는 프로젝트별로 설정 가능

<figure class="not-prose my-6 rounded-xl border border-border bg-muted/40 p-4" role="img" aria-label="스냅샷 diff 흐름 도식. 이전 스냅샷과 현재 스냅샷을 프레임의 이름, 숨김 여부, 하위 요소 개수 세 기준으로 비교해, 추가·삭제·변경된 화면만 추려낸다. 그 변경 화면에 대응하는 TC가 있는지 대조하는 것은 감지 위에 얹은 부수 단계다.">
  <figcaption class="text-xs font-semibold text-muted-foreground">스냅샷 diff — 시각(timestamp)이 아니라 노드 트리를 비교한다</figcaption>
  <div class="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs">
    <div class="flex flex-col gap-1">
      <span class="rounded-md border border-border bg-background/60 px-2.5 py-1 text-muted-foreground">이전 스냅샷</span>
      <span class="rounded-md border border-border bg-background/60 px-2.5 py-1 text-muted-foreground">현재 스냅샷</span>
    </div>
    <span aria-hidden="true" class="text-muted-foreground">→</span>
    <span class="rounded-lg border border-accent/60 bg-accent/5 px-3 py-2 text-center text-foreground">diff<br/><span class="text-[10px] text-muted-foreground">이름 · 숨김 · 하위개수</span></span>
    <span aria-hidden="true" class="text-muted-foreground">→</span>
    <span class="rounded-lg border border-border bg-background/60 px-3 py-2 text-foreground">추가·삭제·변경 화면만</span>
    <span aria-hidden="true" class="text-muted-foreground">⋯</span>
    <span class="rounded-lg border border-dashed border-foreground/30 px-3 py-2 text-muted-foreground">TC 갭 대조 <span class="text-[10px]">(부수)</span></span>
  </div>
</figure>

## 어떤 문제를 겪었나

### 1. 비-UI 노드의 오탐지

디자인 페이지에는 comment, MEMO, sticker 등 실제 UI가 아닌 디자이너의 메모가 프레임으로 존재한다. 이 메모 프레임들이 감지에 잡혀 가짜 변경 리포트를 만들었다.

- **해결:** 스킵 이름 + 스킵 접두사 목록으로 필터링. 프로젝트별로 확장 가능한 구조.

### 2. 되돌리기(Ctrl+Z)의 오탐지 가능성

디자이너가 수정 후 되돌리면 수정 시각은 변경되지만 실제 노드 트리는 동일하다.

- **해결:** **수정 시각(timestamp) 비교는 버렸다** — 되돌리면 시각은 변해도 실질 변화가 없어, 시각 기준으론 오탐을 못 막는다. 대신 노드 트리 diff를 채택 — 실질적 변경이 없으면 '변경 없음'.

### 3. 중첩 구조 내부 프레임 누락

페이지 > 섹션 > 프레임 계층인 경우, 단순 순회로는 섹션 내부의 프레임을 놓쳤다. 재귀적 추출로 해결.

### 4. 스케줄링 vs 수동 실행

정기 스케줄링을 고려했으나 디자인 업데이트 빈도가 불규칙해 불필요한 실행이 많았다. 수동 커맨드로 결정.

## 이 감지가 보장하지 않는 것

- **스킵 목록에 올린 노드는 의도적으로 안 본다** — 비-UI 노드 오탐을 걸러내는 대가로, 목록이 잘못되면 실제 UI 변화도 함께 걸러질 수 있다. 목록 관리가 곧 감지 품질이다.
- **실행하지 않으면 감지도 없다** — 수동 커맨드 방식이라, 실행 시점 사이의 변화는 다음 실행 때까지 모른다.
- **색상·폰트·문구 같은 내부 변경은 잡지 못한다** — 비교 기준이 이름·숨김·하위 요소 개수라, 하위 요소 개수가 그대로면 '변경 없음'으로 나온다.
- **갭을 메우는 건 사람이다** — 이 시스템은 커버리지 갭을 리포트하는 데까지고, 그 갭에 TC를 채울지 말지는 사람이 판단한다.

## 결과

- 시안이 업데이트되면 **바뀐 화면만 자동으로 추려진다.** 전수를 다시 열어보지 않고, 변화가 난 화면과 그 화면의 TC 갭만 확인한다.
- 노드 트리 diff라 **되돌리기·수정 시각 같은 헛일에 걸리지 않는다** — 실질 변화가 없으면 '변경 없음'.
- 무엇을 못 보는지가 명확하다(스킵 목록·내부 변경). 한계를 알고 쓰니 오히려 감지를 신뢰하고 나머지는 사람이 채운다.

| | 수동 | 스냅샷 diff |
| --- | --- | --- |
| 바뀐 화면 찾기 | 30개 전수 육안 확인 | 바뀐 것만 자동 추림 |
| 헛일 | 되돌리기·수정 시각에도 반응 | 노드 트리 diff로 걸러냄 |
| TC 갭 | 사람이 따로 대조 | 감지 위에 부수로 얹음 |

## 핵심 교훈

> 변경 감지는 'timestamp 비교'보다 '실질적 diff'가 정확하다. 노드 트리 diff 방식이 오탐을 걸러준다.

- 비-UI 노드 필터 목록은 프로젝트별로 다르다. 쉽게 확장 가능한 구조가 중요하다.
- 자동화의 실행 주기도 설계의 일부. 무조건 스케줄링이 아니라 사용 패턴에 맞는 트리거를 선택해야 한다.

---

→ 전체 여정에서 이 글의 위치: [QA 자동화 여정기](/posts/repetition-to-ai-judgment-to-human/) — Phase 4
