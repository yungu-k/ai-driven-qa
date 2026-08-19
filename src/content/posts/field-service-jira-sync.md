---
author: 공윤구
pubDatetime: 2026-07-02T01:03:00.000Z
modDatetime: 2026-08-19T09:30:00.000Z
title: 이름으로 맞추고 id로 건다 — 외부 파트너와 Jira를 양방향 동기화한 설계
slug: field-service-jira-sync
featured: false
draft: false
tags:
  - infra
  - integration
  - operations
description: 외부 파트너가 올린 현장 기록이 자동으로 내부 Jira 이슈가 되고, 처리 상태가 다시 파트너 화면으로 돌아온다. 사람이 보는 값은 이름으로 맞추고 시스템이 참조하는 값은 id로 걸어야 하는 이유를, 세 번의 실패로 배웠다.
---

> 외부 파트너사가 현장 기술지원 기록을 직접 적재하면 내부 Jira에 이슈가 생기고, 내부에서 상태를 바꾸면 수 초 내 파트너 화면에 돌아온다. 커스텀필드 5종, 7상태 10전이, Edge Function 8개. 파트너 2곳이 매달 10건 안팎을 이 경로로 넣는다.

## JQL이 0건을 돌려줬다

이슈를 가져오는 쿼리가 아무것도 못 찾았다. 프로젝트 키도 맞고, 이슈 타입 이름도 화면에 보이는 그대로 적었는데 결과가 0건이었다.

**이름이 번역돼 있었다.** Jira는 이슈 타입 표시명을 접속 언어에 맞춰 바꿔 보여 준다. 화면에서 읽은 한글 이름은 JQL이 아는 이름이 아니었다.

이 글은 그 경계에 대한 것이다 — **이름으로 맞춰야 하는 값과, id로 걸어야 하는 값.** 둘을 섞으면 연동은 에러 없이 조용히 틀린 답을 낸다. 앱 자체를 어떻게 지었고 외부에 열며 접근 제어를 어떻게 다시 짰는지는 [따로 한 편](/posts/fsm-app-access-control/)이다.

## 먼저 소유권을 정한다

이 연동 전체를 관통한 문장은 하나다 — **누가 데이터의 주인인지 먼저 정하면 충돌·루프·덮어쓰기가 설계 단계에서 사라진다.**

기록 본문(현상·조치·교체부품)은 앱이 소유한다. 앱에서 고치면 Jira로 밀어 넣지만, Jira에서 본문을 고쳐도 앱으로 돌아오지 않는다. 원본이 파트너가 쓴 그대로 남아야 하기 때문이다. 반대로 진행 상태는 Jira가 소유한다 — 양쪽 어디서 바꿔도 서로에게 반영된다.

<figure class="not-prose my-6 rounded-xl border border-border bg-muted/40 p-4" role="img" aria-label="아키텍처와 소유권 경계 도식. 외부 파트너의 React 웹앱이 서버리스 Edge Function을 거쳐 내부 Jira와 연결된다. 소유권은 둘로 갈린다 — 기록 본문(현상·조치·교체부품)은 앱이 소유해 앱에서 Jira 방향으로만 흐르고, 진행 상태는 Jira가 소유해 완전 양방향으로 동기화된다.">
  <figcaption class="text-xs font-semibold text-muted-foreground">소유권 경계 — 누가 주인인지가 동기화 방향을 정한다</figcaption>
  <div class="mt-4 space-y-3 text-xs">
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span class="rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-muted-foreground">파트너 웹앱<span class="text-[10px]"> (React · 무료 호스팅)</span></span>
      <span aria-hidden="true" class="text-muted-foreground">⇄</span>
      <span class="rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-muted-foreground">Edge Function<span class="text-[10px]"> (Deno · 8개)</span></span>
      <span aria-hidden="true" class="text-muted-foreground">⇄</span>
      <span class="rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-muted-foreground">내부 Jira</span>
    </div>
    <div class="flex flex-col gap-1.5 border-t border-border pt-2">
      <span class="flex flex-wrap items-center gap-x-2"><span class="rounded-md border-2 border-accent bg-accent/10 px-2 py-1 font-semibold text-accent">기록 본문</span><span class="text-muted-foreground">→ 앱 소유 · 앱에서 Jira 방향으로만 (원본 보존)</span></span>
      <span class="flex flex-wrap items-center gap-x-2"><span class="rounded-md border border-border bg-background/60 px-2 py-1 text-foreground">진행 상태</span><span class="text-muted-foreground">⇄ Jira 소유 · 완전 양방향</span></span>
    </div>
  </div>
</figure>

## 이름으로 맞춘다 — 사람이 보는 값

사이트·제품·심각도처럼 파트너가 화면에서 고르는 값은 **앱의 마스터 데이터 이름을 Jira 옵션과 글자 단위로 일치시켰다.** 그러자 매핑 테이블이 통째로 사라졌다. 값을 변환하지 않고 그대로 실어 보낸다.

부수 효과가 더 컸다. 파트너가 Jira 화면을 볼 일이 생겨도 용어를 새로 배울 필요가 없다. 두 시스템이 같은 단어를 쓰기 때문이다.

## id로 건다 — 시스템이 참조하는 값

같은 이름 전략을 시스템 참조에까지 쓰면 세 군데서 깨진다. 셋 다 실제로 당했다.

**① 이슈 타입** — 위의 JQL 0건. 표시명은 접속 언어에 따라 번역된다. 타입 id를 상수로 박아 해결했다. 덤으로 같은 프로젝트에 섞여 있던 다른 업무 유형 이슈가 애초에 안 딸려 온다.

```ts
// 이름("기술 지원")은 locale 에 따라 번역돼 JQL 이 못 찾는다. id 로만 건다.
const SUPPORT_ISSUE_TYPE_ID = '10614';
jql: `project = ${jiraProjectKey} AND issuetype = ${SUPPORT_ISSUE_TYPE_ID} ORDER BY created ASC`
```

**② 상태** — 웹훅이 물어다 주는 상태 표시명도 번역된다. 앱의 상태 컬럼은 영문이라, 번역된 이름이 한 번이라도 새면 그 행은 어떤 조회에도 안 걸리는 유령이 된다. 상태 id로만 매핑하고, **모르는 id가 오면 조용히 넘기지 않고 로그를 남긴 뒤 무시**한다. 워크플로우가 바뀌었다는 신호이기 때문이다.

**③ 마스터 옵션** — 여기서 실제 사고가 났다. 처음엔 옵션을 이름으로 대조했다. Jira에서 옵션 이름을 바꾸자 동기화가 그걸 "옛 옵션 삭제 + 새 옵션 추가"로 처리했고, 기존 레코드들이 사라진 이름에 박제돼 이슈 생성이 깨졌다. 데이터를 손으로 옮겨 복구한 뒤 옵션 id 컬럼을 추가했다 — id가 같으면 이름만 갱신한다.

```ts
// id 우선, 아직 id 가 없는 행만 이름으로 백필한다.
const row = sites.find((s) => s.jira_option_id === opt.id)
         ?? sites.find((s) => s.jira_option_id === null && s.name === parsed.name);
if (row.name !== parsed.name) patch.name = parsed.name;   // rename 을 따라간다
```

단, 모듈은 이름 매칭을 남겼다. Jira 옵션 하나가 제품별로 갈라진 여러 행에 대응하는 1:다 구조라 id가 행을 특정하지 못한다. **경계를 아는 것과 전부 바꾸는 것은 다르다.**

## 상태 동기화 — 실측한 그래프 위의 BFS

워크플로우는 문서가 아니라 탐사용 이슈를 실제로 끌고 다니며 쟀다. 7개 상태, 전이 10개. Jira는 한 번에 한 전이만 허용하니, 여러 칸 떨어진 상태로 가려면 경로를 계획해야 한다.

| 항목 | 값 |
| --- | --- |
| 상태 | 7개 |
| 전이 | 10개 (그중 1개는 어느 상태에서든 가능한 보류 전이) |
| 최대 홉 | 3 |

상태 버튼을 누르면 그래프 위에서 BFS(너비 우선 탐색)로 최단 경로를 찾고 한 칸씩 실행한다. 매 홉마다 Jira가 실제로 허용하는 전이 목록과 대조한다 — 워크플로우가 바뀌면 **조용한 오동작 대신 명확한 실패**를 내기 위해서다.

## 역방향 — Automation을 버리고 웹훅을 골랐다

Jira→앱 방향은 Jira Automation으로 먼저 만들어 봤고, 버렸다. **월 실행 한도가 사이트 전체 공유다.** 우리가 쓰는 만큼 다른 팀 몫이 줄고, 한도가 차면 규칙이 조용히 멈춘다. 연동이 죽었는데 아무도 모르는 상태가 최악이라 실행 무제한인 시스템 웹훅으로 갈아탔다.

웹훅은 사용자 JWT 없이 들어온다. 그래서 함수를 JWT 검증 없이 배포하고, 대신 본문 HMAC-SHA256 서명으로 호출자를 인증한다.

```ts
// Jira 는 JWT 를 안 보낸다 → 본문 서명으로 호출자를 확인한다.
const signatureOk = await isValidSignature(secret, rawBody, req.headers.get('x-hub-signature'));
if (!signatureOk && !queryOk) return json(401, { ok: false, message: 'Unauthorized' });
```

루프가 없는 이유는 멱등성만이 아니다. **앱→Jira 호출은 사용자가 버튼을 눌러야만 일어난다.** 웹훅이 앱을 갱신해도 그게 다시 Jira를 부르지 않는다.

## 연동이 앱의 스키마를 바꿨다

이슈 생성에 필요한 필수 필드를 실측했더니 넷이었고, 그중 하나가 **앱에 아예 없는 필드**였다. 지원 유형을 앱에 신설하고 폼과 스키마를 고쳤다. 연동은 보통 상대에 맞추는 작업이라고 생각하는데, 이번엔 상대가 이쪽 데이터 모델을 바꿨다.

- **본문 템플릿을 직접 그린다** — API로 만든 이슈에는 프로젝트 템플릿이 자동 적용되지 않는다. Jira 기본 템플릿과 같은 색상 패널 구조를 본문 빌더에서 직접 만든다.
- **사진은 best-effort** — 이슈 생성 후 정식 첨부 API로 올린다. 첨부가 실패해도 기록 저장은 성공으로 남긴다.
- **수정도 밀어 넣는다** — 처음엔 생성만 Jira에 반영되고 수정은 미반영이었다. 양방향의 빠진 절반이라, 저장 시 본문·필드를 갱신하는 함수를 따로 뒀다. 생성 함수를 고치지 않고 복제해서 시작했다 — 이미 도는 생성 경로를 건드리지 않는 쪽이 먼저였다.
- **요약이 30자에서 잘렸다** — 요약 문자열을 만들 때 증상을 30자로 자르고 있었다. Jira 한도는 255자다. 우리가 만든 제약이었지 상대의 제약이 아니었다.

## 삭제 전파와 안전장치 둘

Jira에서 티켓을 지우면 앱의 레코드도 지워져야 한다. 판정은 단순하다 — 이번 조회 결과에 없는 키는 고아다. 위험한 건 그 단순함이라, 잠금장치를 둘 걸었다.

1. **조회가 상한(200건)에 닿았으면 정리를 통째로 건너뛴다.** 페이지 밖으로 밀려난 티켓이 "삭제된 것"으로 보일 수 있다.
2. **사진이 딸린 고아는 지우지 않고 경고만 남긴다.** 부모 행만 사라지면 스토리지에 주인 없는 파일이 남는다.

지우는 코드에는 지우지 않을 이유를 같이 적어 둔다.

## 남은 것

- **Jira 접근에 개인 API 토큰을 쓴다.** 권한이 과하고 사람에 묶여 있다. 해당 프로젝트만 볼 수 있는 서비스 계정으로 분리하는 게 남았다.
- 모듈 옵션은 여전히 이름 매칭이라 rename에 약하다. 1:다 구조를 먼저 풀어야 한다.
- 과거 데이터 가져오기는 관리자가 수동으로 돌린다. 실시간으로 당기면 앱이 쥔 본문과 충돌하기 때문에, 이건 편의를 포기한 쪽이 맞다고 본다.

---

> 값 하나를 이름으로 걸지 id로 걸지는 취향이 아니다. **사람이 읽는 값은 이름으로 맞추고, 시스템이 참조하는 값은 id로 건다.** 이름은 번역되고 바뀌지만, 이름을 버리면 사람이 두 벌의 용어를 외워야 한다.

→ 앱 자체와 접근 제어 설계: [로그인만 하면 다 보였다](/posts/fsm-app-access-control/) · 전체 여정: [QA 자동화 여정기](/posts/repetition-to-ai-judgment-to-human/) — Phase 7
