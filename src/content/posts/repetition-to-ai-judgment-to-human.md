---
author: 공윤구
pubDatetime: 2026-04-16T09:00:00.000Z
modDatetime: 2026-10-21T08:00:00.000Z
title: 반복은 스크립트, 판단은 AI, 결정은 사람
slug: repetition-to-ai-judgment-to-human
featured: true
draft: false
tags:
  - ai-workflow
description: TC 설계 자동화에서 시작해 AI 팀원 11명, 코드에서 기획서를 뽑는 파이프라인까지. QA 업무 전체를 AI와 함께 다시 짠 아홉 단계의 여정과, 그 사이 일을 나누는 기준이 둘에서 셋으로 갈린 이야기.
---

> QA 자동화 여정을 외부 독자 관점에서 정리한 글이다. 단계마다 배경과 결과를 짧게 적고, 자세한 시행착오는 따로 쓴 글로 잇는다.

## 목차

## 왜 QA가 자동화에 뛰어들었나

QA 엔지니어는 종종 '반복 작업이 많지만 판단이 중요한' 애매한 자리에 선다. Test Case 작성, Bug Report 기록, Sign-off 리포트 구성 같은 반복을 AI에게 맡기고, 내가 판단과 전략에 집중하도록 경계를 다시 그어 보기로 했다. 처음 세운 기준은 「반복은 AI에게, 판단은 사람에게」였고, 이 글의 첫 제목도 그랬다.

숫자부터 보면 화면 하나의 TC에 30~60분이 걸렸고, 릴리스마다 버그가 50건, 한 달 알람이 615건이었다. 이 반복들을 하나씩 AI에게 넘기며 시작한 여정이 아홉 단계가 됐다. 결론부터 말하면 **결과보다 구조가 중요했다**. 여러 개발 도구를 MCP(Model Context Protocol)로 엮어 AI Agent 하나가 전체 흐름을 다루게 한 것, 그리고 노하우를 코드 대신 규격 문서(md)에 담은 것이다.

달리는 동안 기준은 셋으로 갈렸다. 정답이 정해진 반복은 AI에게도 맡기지 않고 스크립트가 한다. 줄 번호를 옮기거나 결과를 대조하는 일이다. AI는 정답이 하나로 정해지지 않는 판단을 맡는다. 예를 들어 코드가 바뀐 줄을 문서에 어떻게 반영할지 같은 일이다. 그게 결함인지, 내보내도 되는지는 사람이 결정한다. 이렇게 갈린 기준에 맞춰 이 글의 제목도 바꿨다.

> 경험은 기록해야 내 것이 된다. 그리고 공유해야 누군가에게 도움이 된다.

## 전체 여정 한눈에

| 막 | Phase | 주제 | 자세한 글 |
| --- | --- | --- | --- |
| 1막 · 반복을 AI에게 | 1 | TC 설계 자동화 | [디자인 시안에서 TC 600개까지](/posts/tc-design-automation/) · [티켓 산문 대신 코드 diff를 읽는다](/posts/diff-driven-tc/) |
| | 2 | Bug Report 자동화 | [버그 한 건 쓰는 데 5분에서 1분으로](/posts/bug-report-automation/) |
| | 3 | QA Report 자동화 | [데이터에서 PDF까지, 사람은 서명만 한다](/posts/qa-report-automation/) |
| | 4 | 디자인 변경 감지 | [Figma는 '바뀐 화면 목록'을 주지 않는다](/posts/design-change-detection/) |
| | 5 | Regression + 상태 동기화 | [티켓은 완료인데 TC는 Fail](/posts/regression-and-status-sync/) |
| 2막 · 현장으로 | 6 | 운영 모니터링과 현장 | [600건 알람을 누락 0으로 분류하기](/posts/live-issue-triage/) · [정적 리포트에서 살아있는 관제로](/posts/realtime-kiosk-monitoring/) · [테스트 1,160건으로 무인 키오스크를 지켰다](/posts/kiosk-automation-infra/) 외 |
| 3막 · AI를 팀으로 | 7 | AI 팀원과 도메인 확장 | [AI 팀원 만들기 5부작](/series/ai-teammate/) · [누가 뭘 하는지 안 보여서 사무실을 그렸다](/posts/openfloor-team-dashboard/) 외 |
| 4막 · 통과를 의심하다 | 8 | 검증을 검증하기 | [AI도 확증편향에 빠진다](/posts/ai-confirmation-bias-subagents/) · [버튼 하나를 일부러 망가뜨렸다](/posts/kiosk-mutation-testing/) 외 |
| 5막 · 문서가 코드를 따라온다 | 9 | 코드에서 문서로 | [멈춘 기획서를 소스 코드에서 다시 뽑았다](/posts/plan-from-source-pipeline/) · [3년 전과 지금, 내 QA 업무를 나란히 놓았다](/posts/qa-now-ai-native/) 외 |

## 여정을 관통한 구조 · MCP로 엮은 작업 흐름

본격적인 Phase별 이야기로 들어가기 전에, 여정을 관통한 공통 구조를 먼저 말한다.

자동화가 없던 시절의 흐름은 이랬다. Figma에서 시안을 보고, Google Sheets를 열어 TC를 쓰고, Jira로 넘어가 버그를 등록한다. 도구를 옮길 때마다 컨텍스트가 끊긴다. '내가 지금 뭘 하고 있었지?'를 머릿속에서 다시 세워야 한다. 그래서 아래 4개 시스템을 AI Agent 하나가 제어하도록 연결했다.

| 시스템 | 연동 방식 | 역할 |
| --- | --- | --- |
| Jira | MCP | 버그 조회·생성·상태 전이, Epic·라벨 관리 |
| Confluence | MCP | 회의록 작성, 프로세스 가이드 공유 |
| Google Sheets | Python API | TC 시트·Sign-off·Status 리포트 작성 |
| Figma | REST API + MCP | 시안 메타데이터·스크린샷·노드 diff |

<figure class="not-prose my-6 rounded-xl border border-border bg-muted/40 p-4" role="img" aria-label="MCP 허브 구조 도식. 가운데 단일 AI Agent를 중심으로 Jira, Confluence, Google Sheets, Figma 네 시스템이 방사형으로 연결되어 있다. Agent 하나가 네 도구를 모두 제어하므로, 도구를 오갈 때 맥락이 끊기지 않는다.">
  <figcaption class="text-xs font-semibold text-muted-foreground">MCP 허브: 도구마다 창을 옮기는 대신, Agent 하나가 넷을 제어한다</figcaption>
  <div class="mt-4 flex flex-col items-center gap-2 text-xs">
    <div class="flex flex-wrap justify-center gap-2">
      <span class="rounded-md border border-border bg-background/60 px-2.5 py-1 text-muted-foreground">Jira</span>
      <span class="rounded-md border border-border bg-background/60 px-2.5 py-1 text-muted-foreground">Confluence</span>
      <span class="rounded-md border border-border bg-background/60 px-2.5 py-1 text-muted-foreground">Google Sheets</span>
    </div>
    <span aria-hidden="true" class="text-muted-foreground">▲ ▲ ▲</span>
    <span class="rounded-lg border-2 border-accent bg-accent/10 px-4 py-2 font-bold text-accent">단일 AI Agent</span>
    <span aria-hidden="true" class="text-muted-foreground">▼</span>
    <div class="flex flex-wrap justify-center gap-2">
      <span class="rounded-md border border-border bg-background/60 px-2.5 py-1 text-muted-foreground">Figma</span>
    </div>
    <p class="mt-2 text-[11px] leading-tight text-muted-foreground">연결은 MCP·API 혼합 — 방식은 달라도 진입점은 Agent 하나. '지금 뭘 하고 있었지'를 도구 전환마다 다시 세울 필요가 없다.</p>
  </div>
</figure>

MCP를 쓰면서 배운 점은 세 가지다.

- **완벽한 자동화보다 맥락 유지가 중요하다**: 작업을 사람이 누르든 AI가 누르든, '같은 맥락에서 이어진다'는 감각이 생산성을 결정한다.
- **각 MCP의 한계는 여전히 존재한다**: 일부 필드는 특수 포맷을 요구하고, 일부 서식은 API로 제어할 수 없다.
- **단일 기준 문서가 있을 때 시너지가 크다**: 여러 시스템에 나뉘어 쓰이는 규칙도 기준 문서(md) 한 곳에 있어야, AI가 시스템을 넘나들며 일관되게 움직인다.

## 1막 · 반복을 AI에게 (Phase 1~5)

### Phase 1 · TC 설계 자동화

신규 화면이 나올 때마다 디자인 시안을 보며 Google Sheets에 TC를 한 줄씩 써 내려갔다. 화면 하나에 30~60분, 프로젝트 하나에 수십~수백 화면이다. '프롬프트로 잘 시키기'보다 '**규격 문서를 먼저 만들기**'로 방향을 잡았다. TC의 필수 필드, 서식 규칙, 작성 톤을 규격 문서에 정의하고 AI가 그 규격대로 산출하게 했다. 신규 화면 시안 1세트를 TC로 옮기는 데 수동 5일이 걸리던 게 자동 2~3시간으로 줄었다.

릴리스 TC는 출발점이 다르다. '이번에 무엇이 바뀌었나'가 출발점이고, 가장 정직한 변경 목록은 코드 자체다. 그래서 직전 검증 버전과 최신 코드의 git diff로 영향 범위를 산정하는 방식을 더했다. 가장 아픈 사고는 baseline 오설정이었다. 기준을 운영 배포 버전으로 잡았더니 이미 검증한 기능이 통째로 '신규'로 잡혀, TC 7건을 썼다가 전부 지웠다. baseline은 '마지막 QA 검증 버전'이어야 한다.

### Phase 2~5 · 버그, 리포트, 변경 감지, 회귀

- **Bug Report**: TC 시트에 이미 있는 재현 절차와 기대 결과를 버그 Description 재료로 다시 쓰고, 생성 후 결과와 URL을 시트에 자동으로 되쓴다. 릴리스마다 50건을 마지막 1건까지 같은 포맷으로 만든다.
- **QA Report**: Sign-off와 Status 리포트의 레이아웃을 규격 문서로 뽑아 조립하게 했다. 어려운 건 데이터 수집보다 **서식 일관성**이었다. 머지 순서, 행 참조, 빈 행 하나가 레이아웃을 무너뜨린다.
- **디자인 변경 감지**: Figma 노드 트리를 JSON 스냅샷으로 저장하고 이전 스냅샷과 diff해 바뀐 화면만 골라낸다. timestamp 비교보다 실질적 diff가 정확했다.
- **Regression + 상태 동기화**: 회귀 추출은 'P0 + 플로우 보완'으로, 상태 동기화는 '완료→Pass / 반려→N/A / 수정됨→Fail 유지' 전이 규칙으로 자동화했다. 모호한 규칙은 곧 데이터 불일치다.

| Phase | 전 (수동) | 후 (자동) |
| --- | --- | --- |
| 1 · TC 설계 | 시안 1세트 5일 | 2~3시간 |
| 2 · Bug Report | 건당 손입력 5분 | 지목 → 1분 이내 |
| 3 · QA Report | 메일 서술 반나절 | PDF + 5분 알림 |
| 5 · Regression | 손으로 P0 선별 | 규칙 자동 (120건/2일) |
| 6 · 운영 분류 | 615건 반나절 | 명령 한 번 |

## 2막 · 현장으로 (Phase 6)

Phase 5까지가 TC와 리포트라는 QA 내부 산출물의 자동화였다면, 여기서부터 무대가 바뀐다. 이미 배포되어 돌아가는 현장 운영으로 간다.

현장 이슈 알람은 한 달 치가 약 600건이라 수동 분류에 반나절이 걸렸고, 기준은 사람 머리에만 있었다. '어떤 부서가 처리할 일인가'를 기준으로 처리 방향별 6개 분류를 정의했다. 이 분류의 마지막 칸은 어디에도 안 걸린 항목이 자동으로 모이는 catch-all(기본 분류)이다. 규칙에 없는 새 이슈가 미분류로 증발하지 않고 논의 대상이 된다. 실측 615건을 누락 0건으로 분류했고, 같은 데이터를 실시간으로 읽는 관제 대시보드로 넓혔다. 배포 주기마다 한 번 보던 정적 리포트가 언제든 열면 지금 상태가 보이는 모니터가 됐다.

같은 시기에 현장 쪽 일이 여럿 붙었다. 무인 키오스크 앱을 [Web UI와 API 두 트랙으로 자동 검증하는 인프라](/posts/kiosk-automation-infra/)를 세웠고, 글로벌 고객의 [장애를 표준 프로세스로 대응하는 체계](/posts/global-incident-management/)를 설계했다. 운영 장애 원인으로 지목된 슬로우 쿼리는 [테스트 환경에 1,300만 행을 시딩해 재현](/posts/db-index-performance-test/)했다. 일정이 고객에 끌려다니던 팀에는 [2~3주 주기 릴리스 열차와 품질 게이트](/posts/release-train-scrum/)를 설계하고 [Jira 보드에 앉혔다](/posts/release-train-jira/).

## 3막 · AI를 팀으로 (Phase 7)

Phase 1~6은 '내 반복 작업을 AI에 위임'하는 여정이었다. 여기까지 오니 다음 질문이 생겼다. 반복 말고 판단이 필요한 일까지 AI가 동료로 거들 수 있을까?

기획자, QA 엔지니어, 개발자, Technical Writer, 디자이너를 차례로 만들어 핸드오프로 잇고 서로 검수하게 했다. 설계는 [AI 팀원 만들기 5부작](/series/ai-teammate/)에 담았다. 팀원끼리 직접 대화시키려다 [실행파일이 이름만 .exe인 리눅스 바이너리였다는 걸](/posts/ai-teammate-cross-session-messaging/) 알게 됐고, 대화를 붙인 지 2주 뒤 전수 집계해 보니 [내가 입력한 글은 1.1만 자, 팀이 저희끼리 주고받은 대화는 31.7만 자](/posts/ai-team-comms-digest/)였다. 팀원이 늘자 한 사람의 눈이 모자라 [세션 활동을 사무실로 그리는 대시보드](/posts/openfloor-team-dashboard/)를 지었는데, 짓는 동안 팀이 여섯에서 열하나가 됐다.

팀은 QA 밖의 일에도 붙었다. 자동화 테스트가 하나도 없던 사내 웹앱에 AI 팀원 둘을 붙여 [검사 36건과 제품 결함 6건](/posts/ai-teammate-web-e2e/)을 얻었다. 사람이 옮겨 적은 문장은 0이었다. [기술지원 이력과 Jira의 양방향 연동](/posts/field-service-jira-sync/)을 만들었고, [명령어 없이 버튼으로 돌리는 API 실행 Web UI](/posts/api-runner-web-ui/)는 화면과 트랙이 늘면서 [몇 달 뒤 React로 갈아엎었다](/posts/api-runner-renewal/).

## 4막 · 통과를 의심하다 (Phase 8)

자동화가 커지자 질문이 바뀌었다. 테스트가 통과했다는 말을 얼마나 믿어도 되는가.

먼저 AI 자신이 걸렸다. AI도 테스트 케이스를 설계하고 화면을 역기획할 때 [사람처럼 확증편향에 빠진다](/posts/ai-confirmation-bias-subagents/). 해결책은 '더 조심하기'가 아니었다. 컨텍스트를 공유하지 않는 별도 AI에게 반증을 시키는 구조였고, 이 구조로 '수행 불가' 33건이 0이 됐다. 그 [5원칙과 감사자 브리핑 템플릿](/posts/confirmation-bias-subagent-recipe/)은 따로 정리했다.

다음은 검사 자체다. 키오스크 화면 자동화에서 [수동 26건 중 25건을 자동화로 옮기고](/posts/kiosk-screen-automation-renewal/), 커진 자동화 안에서 통과가 거짓말하는 경로 여섯 개를 찾아 막았다. 검사가 진짜 결함을 잡는지 보려고 [중국어 버튼 하나를 일부러 고장 낸 판 세 개](/posts/kiosk-mutation-testing/)를 돌렸고, 예측이 틀린 첫 시도에서 검사 도구의 구멍 다섯 개를 찾았다. 이때 검사는 '번역이 없다'는 사실을 정확히 잡았지만, 그게 결함인지는 제품 일정을 아는 사람이 정했다. 판단과 결정이 갈리는 자리가 여기서 처음 또렷하게 보였다.

## 5막 · 문서가 코드를 따라온다 (Phase 9)

올해 글로벌 테크 기업들이 연달아 [하네스 엔지니어링](/posts/harness-engineering-we-were-already/) 글을 냈다. 모델을 둘러싼 구조(도구·검증·관측·경계)를 설계하는 일이다. 읽다 보니 이 블로그의 절반이 그 단어 없이 그 일을 해 온 기록이었다. 그 글의 「리포지터리를 기록 시스템으로」 대목을 따라 [저장소의 md 56개를 전수 감사](/posts/repo-record-system/)했더니, 저장소에서 가장 활발한 컴포넌트가 지도에 없었다.

문서가 코드를 못 따라가는 문제는 기획서에서 가장 컸다. 초기 기획 뒤로 한 번도 고쳐지지 않은 기획서를 [소스 코드에서 다시 뽑았다](/posts/plan-from-source-pipeline/). 시나리오 문서를 세우고 실제 화면 48장을 찍어 기획서를 만들었고, 지금은 새 빌드가 올라오면 시나리오와 기획서가 사람 승인 없이 따라온다. 이 파이프라인에서 일이 셋으로 갈렸다. 줄 번호를 옮기고 결과를 대조하는 일은 스크립트가, 내용이 바뀐 줄을 고치는 일은 AI가 한다. AI가 '고쳤다'고 말한 내용은 믿지 않고 스크립트가 문서 사본과 장부를 맞대 판정한다.

반년을 돌아보며 [3년 전과 지금의 업무를 나란히 놓아 봤다](/posts/qa-now-ai-native/). 일부 엣지 케이스와 E2E 시나리오 테스트를 빼면 거의 모든 단계를 AI가 맡고 있었다.

## 지향하는 QA 모습

정답이 있는 반복은 스크립트가 하고, 정답이 하나로 안 정해지는 판단은 AI가 맡고, 테스트 전략·릴리스 Go/No-Go·결함 여부 같은 결정은 사람이 쥔다. 처음엔 둘이던 경계가 셋이 됐다. 그 위에서 다섯 가지 원칙이 남았다.

### 노하우를 코드에 가두지 않는다

경험이 if-else 한 줄로만 남으면, 1년 후 같은 코드를 읽는 사람은 왜 그렇게 짰는지 알 수 없다. 그래서 모든 Phase에서 규칙은 코드보다 md 문서에 먼저 썼다. 문서가 지식의 1차 저장소이고, 코드는 그 실행체다. 대가는 있다. 규칙을 문서에 두면 문서와 코드가 어긋나지 않게 맞춰 주는 이중 관리 비용이 생긴다. 그럼에도 '왜'가 사라진 코드보다는 낫다고 봤다.

### 실패는 규칙으로 옮긴다

이 여정의 거의 모든 규칙은 한 번 이상 같은 실수를 반복한 끝에 나왔다. 같은 실수를 두 번 하지 않으려면 **개인의 기억 대신 문서**가 필요하다.

### 검증한 것만 믿는다

통과도 검증 대상이다. AI의 결론은 컨텍스트를 나누지 않은 다른 AI에게 반증시키고, 자동화의 통과는 일부러 고장 낸 판으로 시험한다. AI가 고쳤다고 말하면 스크립트가 원본과 맞대 본다.

### QA가 할 일과 조직이 할 일을 구분한다

내 자동화를 복잡하게 만드는 근본 원인이 조직 차원의 문제일 때가 있다. 예컨대 알람 코드 표준화처럼 여러 부서가 합의해야 하는 일이다. 이런 일은 QA가 혼자 밀어붙일 수 없다. QA는 그 문제를 데이터로 드러내 공유하고, 결정과 추진은 테크리드에게 넘긴다.

### 도구는 채택되어야 의미가 있다

아무리 잘 만든 자동화도 동료가 쓰지 않으면 의미가 없다. 클릭 즉시 편집되는지, 서식이 깨지지 않는지 같은 작은 UX 디테일에 신경 썼다.

> 자동화는 결국 '사람이 결정에 집중하게 해 주는 도구'이지, 사람을 대체하는 게 아니다.

## 다음 여정

다음 숙제는 공통 문서다. 기획·개발·QA 담당자가 쓰는 AI가 업무마다 같은 문서를 바라보게 하는 일이다. 메인이 되는 기획서, 특정 Confluence 문서, Jira 티켓 같은 것들이다. 그 문서를 고치고 관리하는 규칙을 정하고 통제할 수 있다면, 코드가 바뀔 때 기획서가 따라오듯 다른 문서들도 따라올 수 있다.

그리고 이 여정 자체를 이렇게 외부에 공유한다. 이 글에서 쓴 규격 문서는 [qa-spec-kit](https://github.com/yungu-k/qa-spec-kit)에 공개해 두었다. 내부 기록(회고)과 외부 공유(블로그)는 서로 다른 형태가 필요하다는 것을, 이 글을 고쳐 쓰면서 다시 배운다.
