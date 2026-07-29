---
author: 공윤구
pubDatetime: 2026-07-02T01:04:00.000Z
title: API 자동화 실행 Web UI — 1,000건 회귀를 버튼 하나로
slug: api-runner-web-ui
featured: false
draft: false
tags:
  - qa-automation
  - infra
  - dx
description: 1,000건 규모 API 자동화를 비기술 구성원도 돌릴 수 있게 만든 실행 Web UI 구축기.
---

> 명령어 없이 버튼으로 API 자동화 테스트를 골라 돌리고 결과를 보는 웹 화면을 만들어, 비기술 구성원도 회귀를 돌릴 수 있게 했다.

## 배경

API 자동화 스위트가 1,000건 규모의 green baseline에 이르자, 이걸 터미널 명령어로만 돌리는 건 진입 장벽이 됐다. 모듈을 골라 실행하고 결과·누적 통계를 눈으로 보는 UX가 필요했다.

## 설계 결정 — 왜 exe가 아니라 웹인가

비기술 사용자용 도구라면 exe 배포도 후보였다. 하지만 데스크톱 프레임워크(Electron류)는 번들이 크고 업데이트 배포가 번거로우며, 셸 GUI는 유지보수가 어렵다. 결론은 기존 자동화와 같은 언어·같은 런타임 위의 **경량 웹 서버 + 순수 HTML/JS**. 프론트 프레임워크도 안 썼다 — 화면 세 장에 빌드 체인은 과하다.

호스팅은 사내 자체로 한정하고 외부 호스팅은 배제 — 고객 데이터 민감성 정책 준수.

트레이드오프는 분명하다. 순수 HTML/JS로 가면 프레임워크가 공짜로 주던 컴포넌트 재사용·상태 관리를 직접 짜야 한다. 대신 빌드 체인·의존성 업데이트·번들 크기라는 부담이 통째로 사라진다 — **화면이 세 장뿐이라 감당 가능한 거래**였다. 화면이 열 장이었다면 반대로 골랐을 것이다.

<figure class="not-prose my-6 rounded-xl border border-border bg-muted/40 p-4" role="img" aria-label="Runner Web UI 실행 흐름 도식. 브라우저에서 모듈을 선택하면 경량 웹 서버로 요청이 가고, 서버는 기존 테스트 러너를 자식 프로세스로 spawn한다. 러너의 진행 로그는 SSE 실시간 스트림으로 브라우저에 흘러가고, 완료된 결과는 CLI와 공유하는 리포트 폴더에 저장되어 아카이브 뷰어로 다시 읽힌다.">
  <figcaption class="text-xs font-semibold text-muted-foreground">실행 흐름 — 러너는 새로 안 짜고 spawn으로 재사용, 결과 저장소는 CLI와 공유</figcaption>
  <div class="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs">
    <span class="rounded-lg border border-border bg-background/60 px-3 py-2 text-muted-foreground">브라우저<br/><span class="text-[10px]">모듈 선택</span></span>
    <span aria-hidden="true" class="text-muted-foreground">→</span>
    <span class="rounded-lg border border-border bg-background/60 px-3 py-2 text-muted-foreground">경량 웹 서버</span>
    <span aria-hidden="true" class="text-muted-foreground">→ spawn →</span>
    <span class="rounded-lg border border-accent/60 bg-accent/5 px-3 py-2 text-foreground">기존 테스트 러너<br/><span class="text-[10px] text-muted-foreground">자식 프로세스</span></span>
    <div class="flex w-full flex-wrap items-center gap-x-2 gap-y-1 pl-1 pt-1 text-[11px] text-muted-foreground">
      <span aria-hidden="true">↳</span>
      <span class="rounded-md border border-dashed border-foreground/30 px-2 py-1">진행 로그 → SSE 실시간 스트림 → 브라우저</span>
      <span class="rounded-md border border-dashed border-foreground/30 px-2 py-1">결과 → 공유 리포트 폴더 → 아카이브 뷰어</span>
    </div>
  </div>
</figure>

## 실제 화면

![QA Runner — 모듈 그룹 선택 화면. 키오스크 2기종 탭과 장비 계열별 모듈 체크박스](/images/runner-home.png)

_모듈을 장비 그룹별로 골라 실행한다. 상단에는 대상 앱 2종의 기동 상태와 원격 제어 버튼._

![실행 결과 아카이브 — 회차별 PASS/FAIL 요약과 상세 리포트](/images/runner-results.png)

_과거 실행 이력을 회차별로 열람. 시행착오 라벨(local-fix2, local-green…)이 그대로 남아 green baseline까지의 여정을 보여준다._

![누적 통계 — PASS/FAIL 추이 차트](/images/runner-stats.png)

_빨간 선(FAIL)이 0으로 수렴하는 과정 — 상시 빨간 fail을 걷어내고 green baseline을 만든 기록 그 자체다._

## 6단계 구현

1. **모듈 그룹 매핑 + 선택 UI** — 장비 계열별로 모듈을 묶고, 그룹 매핑은 파일 하나를 단일 출처로
2. **서버 + 테스트 러너 spawn** — 웹에서 고른 모듈만 골라 기존 테스트 러너를 자식 프로세스로 실행
3. **실시간 스트림(SSE)** — 실행 중 진행 로그가 브라우저에 흘러간다. '돌아가고 있나?' 불안이 사라진다
4. **아카이브 뷰어** — 과거 실행 결과 열람. 기존 CLI 실행이 저장하던 리포트 폴더 포맷을 그대로 읽음 — 웹이든 터미널이든 결과 저장소는 하나
5. **사이트 분기 + 헬스체크** — 제품군별 옵션 분기와 대상 앱 기동 확인 요청
6. **누적 통계 차트** — 실행 이력이 쌓이면서 PASS율 추이가 그래프로

## 이 UI가 못 하는 것

버튼 하나로 회귀를 여는 대신, 명확히 포기한 것들이 있다.

- **동시 실행은 막았다** — 한 번에 한 스위트만. 여러 실행이 겹치면 같은 리포트 폴더·같은 대상 앱을 놓고 충돌한다. 큐잉·격리를 짜기보다 단일 실행으로 못박는 쪽을 택했다.
- **권한 통제가 없다** — 사내 망 안에서 '누구나 누르면 실행'이다. 실행 이력에 누가 눌렀는지는 남지 않는다. 외부 노출 순간 이 전제는 깨진다.
- **원격 장비 의존은 그대로다** — 대상 앱 기동·헬스체크는 붙지만, 실제 장비가 꺼져 있으면 UI가 대신 켜주지 못한다. 사람이 확인하는 최종 sanity 구간은 남는다.
- **스펙이 틀리면 같이 틀린다** — 이 UI는 실행기일 뿐, 테스트가 검증하는 스펙 자체의 오류는 잡지 못한다.

## 결과

회귀 실행이 '명령어를 아는 사람'에서 '버튼을 누를 수 있는 사람'으로 확장됐다. 1,000건 green baseline이 자동화 담당자의 자산에서 팀의 자산이 된 순간이다.

> 자동화는 '돌아가게 만드는 것'으로 끝나지 않는다. 누가 어떻게 트리거하고 결과를 읽는가까지 설계해야 운영에 녹는다. 기술 장벽을 낮추는 UI가 자동화의 마지막 한 조각이었다.

---

→ 전체 여정에서 이 글의 위치: [QA 자동화 여정기](/posts/repetition-to-ai-judgment-to-human/) — Phase 7
