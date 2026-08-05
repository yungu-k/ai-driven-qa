---
author: 공윤구
pubDatetime: 2026-08-05T08:30:00.000Z
title: AI Technical Writer 팀원 만들기 — 블로그 23편, 감사 4라운드, A 0편에서 3편으로
slug: ai-technical-writer-teammate
featured: false
draft: false
tags:
  - ai-teammate
  - technical-writing
description: 글 쓰는 AI가 아니라 기준을 지키는 AI. 글로벌 테크 블로그를 실측 분석해 기준을 세우고, 자기가 쓴 글까지 독립 감사에 넘기는 네 번째 팀원 설계기.
---

> 기획자가 '무엇을 만들까', QA가 '무엇이 깨질까', 개발자가 '어떻게 구현하나'라면 — Technical Writer는 '이 기록을 남 앞에 내놓아도 되는가'를 담당하는 네 번째 팀원이다.

<div class="not-prose my-6 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
  <p class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">시리즈 — AI 팀원 만들기 4부작</p>
  <p class="mt-2 leading-relaxed"><a class="text-foreground underline decoration-border underline-offset-4 hover:text-accent" href="/posts/ai-planner-teammate/">① 기획자</a><span class="text-muted-foreground"> → </span><a class="text-foreground underline decoration-border underline-offset-4 hover:text-accent" href="/posts/ai-qa-engineer-teammate/">② QA 엔지니어</a><span class="text-muted-foreground"> → </span><a class="text-foreground underline decoration-border underline-offset-4 hover:text-accent" href="/posts/ai-developer-teammate/">③ 개발자</a><span class="text-muted-foreground"> → </span><strong class="text-accent">④ Technical Writer (이 글)</strong></p>
  <p class="mt-2 text-xs"><a class="text-muted-foreground hover:text-accent" href="/series/ai-teammate/">이 팀을 왜 나눴는지 — 시리즈 소개 →</a></p>
</div>

## 배경 — 글 20편이 쌓였는데, 잘 쓴 글인지 아무도 몰랐다

이 블로그에 글이 20편 쌓였을 때, 한 번도 안 한 질문이 있었다 — **이 글들, 기준으로 보면 몇 점짜리인가.** 쓰는 사람이 자기 글을 검토하면 늘 괜찮아 보인다. [확증편향 글](/posts/ai-confirmation-bias-subagents/)에서 다뤘던 저자=감사자 문제가, 코드가 아니라 글에서 똑같이 벌어지고 있었다.

그래서 네 번째 팀원을 만들었다. 글을 대신 써 주는 생성 도우미로 둘 수도 있었지만 기각했다 — 20편이 보여주듯 병목은 쓰는 능력이 아니라 판정 기준의 부재였으니까. 대신 **기준을 세우고, 그 기준으로 전수 감사하고, 자기가 쓴 글까지 남에게 검사받는** Technical Writer로 설계했다. 첫 감사 결과가 위 질문의 답이었다: 20편 중 **A 0편, B 17편, C 3편.**

이 글은 그 팀원의 세 가지 원칙과, 감사 4라운드가 만든 변화를 다룬다. 글 잘 쓰는 법 자체는 다루지 않는다 — 그건 기준 문서의 몫이다.

## 기준부터 — 취향이 아니라 실측으로

"좋은 글"은 취향 싸움이 되기 쉽다. 그래서 기준을 만들 때 의견을 쓰지 않았다. **글로벌 엔지니어링 블로그 7사의 9개 포스트**(Stripe·Cloudflare·Netflix·GitHub·Slack·Uber·Meta), **국내 상위권 4사**(토스·우아한형제들·LINE·당근), 그리고 공식 방법론 문서(Google Tech Writing, Microsoft Style Guide, Diátaxis 등)를 실제로 열어 읽고, 반복되는 패턴만 추렸다.

예를 들어 "성과는 실측 before/after로"는 취향이 아니다 — 분석한 글로벌 9개 포스트 전부가 "P99 3.1s → 1.0s" 급 실측을 실었고, "크게 개선됐다"류 모호어는 찾기 어려웠다. 이렇게 추린 규칙에 체크 ID(구조 S · 제목 H · 문장 W · 시각 V · 코드 C · 신뢰 E · 유형 T)를 붙여 기준 문서로 굳혔다. 감사는 이 ID로 판정한다 — "느낌상 별로"는 판정이 아니다.

## 원칙 셋

### ① 저자는 자기 글을 감사하지 못한다

감사는 항상 **글을 쓰지 않은 별도 에이전트**가 한다. 판정에는 근거 인용이 필수다 — "S1 위반"이라고만 쓰면 반려되고, 위반한 실제 문장을 인용하고 before→after 수정 지시까지 붙여야 한다.

이 원칙은 Technical Writer 자신에게도 적용된다. 최근 [화면 자동화 리뉴얼 글](/posts/kiosk-screen-automation-renewal/)은 이 팀원이 썼는데, 발행 전에 독립 감사 에이전트가 원재료와 전수 대조했다 — 수치가 재료와 일치하는가, 금지 표현은 없는가, 익명화는 지켜졌는가. 게이트를 통과하고서야 발행됐고, 그 감사 기록도 저장소에 남아 있다.

### ② 수치는 창작하지 않는다 — "모름"도 답이다

감사가 "성과 수치를 넣어라"라고 지시해도, 그 수치가 어디에도 없으면 **넣지 않는다.** 대신 저자 확인 질문지를 만든다 — 첫 라운드에만 36개 질문이 나갔고, 답의 상당수는 "모름"이었다. 모름은 실패가 아니다: 모르는 항목은 수치 없이 서사로 처리하고, "실측 아님"을 본문에 명시한다. 4라운드 동안 감사가 본문에서 잡아낸 창작 수치는 **0건**이다.

이 원칙이 실제로 작동한 순간이 있다. 리뉴얼 글을 쓰다 옛 글의 수치(128)와 새 재료의 수치(221)가 충돌했는데, 관계를 아는 문서가 없었다. 추측으로 잇지 않고 구현 세션에 질문 핸드오프를 보냈다 — 돌아온 답은 "늘어난 게 아니라 세는 대상이 다르다"였다. 추측으로 썼다면 "같은 것이 1.7배가 됐다"는 거짓말이 발행됐을 것이다.

### ③ 팀원 사이는 핸드오프 문서로만

Technical Writer는 현장을 모른다. 자동화를 만든 세션이 재료 핸드오프(수치·사건·금지 표현·익명화 규칙)를 넘긴다. Writer는 쓰고, 모르는 값은 질문 핸드오프로 되묻는다. 초안은 독립 감사의 게이트를 거치고, 발행은 사람이 승인한다. 말로 전달하면 유실되고, 기억으로 전달하면 오염된다 — 문서만 오간다.

<figure class="not-prose my-6 rounded-xl border border-border bg-muted/40 p-4" role="img" aria-label="Technical Writer의 발행 파이프라인. 구현 세션이 재료 핸드오프를 넘기면 Technical Writer가 집필하고, 모르는 값은 질문 핸드오프로 구현 세션에 되묻는다. 초안은 독립 감사 에이전트의 게이트(수치 대조, 금지 표현, 익명화)를 거치고, 마지막에 사람이 발행을 승인한다.">
  <figcaption class="text-xs font-semibold text-muted-foreground">발행 파이프라인 — 문서로만 오가고, 쓴 사람은 검사하지 못한다</figcaption>
  <div class="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs">
    <span class="rounded-lg border border-border bg-background/60 px-3 py-2 text-muted-foreground">구현 세션<br/><span class="text-[10px]">재료 핸드오프</span></span>
    <span aria-hidden="true" class="text-muted-foreground">⇄</span>
    <span class="rounded-lg border border-accent/60 bg-accent/5 px-3 py-2 text-foreground">Technical Writer<br/><span class="text-[10px] text-muted-foreground">집필 · 모르면 질문</span></span>
    <span aria-hidden="true" class="text-muted-foreground">→</span>
    <span class="rounded-lg border border-border bg-background/60 px-3 py-2 text-muted-foreground">독립 감사<br/><span class="text-[10px]">수치 대조 · 게이트</span></span>
    <span aria-hidden="true" class="text-muted-foreground">→</span>
    <span class="rounded-lg border border-border bg-background/60 px-3 py-2 text-muted-foreground">사람<br/><span class="text-[10px]">발행 승인</span></span>
  </div>
</figure>

## 감사 4라운드 — 숫자로

감사 → 수정 지시 핸드오프 → 별도 세션이 집행 → 재감사. 이 사이클을 네 바퀴 돌렸다.

| | 감사 전 | 4라운드 후 |
| --- | --- | --- |
| A 등급 | 0편 | **3편** (A- 4편 별도) |
| B+ 등급 | 0편 | 11편 |
| B 등급 | 17편 | 4편 |
| C 등급 (구조적 미달) | 3편 | 0편 |
| 본문 창작 수치 | — | 4라운드 누적 **0건** |

대표글(featured)도 감이 아니라 기준으로 다시 골랐다 — 역량 축당 1편, 등급 하한 B+, 미달 글은 자동 탈락. 그 결과 대표 4편 중 3편이 A 등급이다. 물론 끝난 게 아니다 — 남은 승급 경로는 저자 답변을 기다리는 질의 9건에 걸려 있고, A는 아직 3편뿐이다.

## 감사자도 틀린다 — 그래서 기준도 감사받는다

이 구조에서 제일 크게 틀린 건 글이 아니라 **감사 자신**이었다. 1차 감사가 확장 글 6편의 분량을 쟀는데, 2차 감사가 확인해 보니 그 측정이 글자수가 아니라 **UTF-8 바이트**였다 — 한글은 글자당 3바이트라 전부 3배 과대 측정이었고, 그중 3편은 "분량 초과" 판정에 감량 지시까지 받은 뒤였다. 프로토콜대로 다시 재보니 6편 전부 기준 범위 안이었다.

수습은 사람 기억이 아니라 기준 문서로 했다. 측정 프로토콜(무엇을 제외하고 무엇을 세는지, 바이트 측정 금지)을 기준에 명문화해서, 이후 모든 라운드가 같은 자로 재게 만들었다. 감사도 산출물이다 — 산출물인 이상 검증 대상이다.

대가도 분명하다. 글 하나에 감사 왕복이 붙으니 **발행 속도를 내주고 신뢰를 산 것**이다 — 초안에서 발행까지가 길어진다. 그래도 근거 없는 수치가 대문에 걸리는 것보다는 싸다고 판단했다.

## 이 팀원이 대신 못 하는 것

- **소재를 만들지 못한다** — 글감은 현장(구현 세션·실제 작업)에서만 나온다. Writer는 재료 핸드오프가 도착해야 움직인다.
- **실측값을 생성하지 못한다** — 수치의 출처는 언제나 저자와 구현 세션이다. Writer가 할 수 있는 건 "모르니 물어본다"까지다.
- **발행을 결정하지 않는다** — 게이트 통과는 "내놓아도 된다"는 판정이지 "내놓는다"는 결정이 아니다. push는 사람이 승인한다.

## 결과

기획자·QA·개발자에 Technical Writer가 더해져 **4인 팀**이 됐다. 앞의 셋이 만들고 검증하고 배포한다면, 넷째는 그 전 과정을 **남에게 보여줄 수 있는 기록**으로 만든다 — 그리고 그 기록조차 저자 아닌 눈의 검사를 거친다.

이 글도 예외가 아니다. 지금 읽은 이 글은 Technical Writer가 썼고, 위에서 설명한 그 게이트 — 수치 전수 대조, 저자≠감사자 — 를 통과하고서야 여기 실렸다.

> 글을 잘 쓰는 AI는 흔하다. 어려운 건 "이 문장을 내놓아도 되는가"를 묻는 구조다 — 기준은 실측에서, 수치는 출처에서, 판정은 남의 눈에서.

---

→ 전체 여정에서 이 글의 위치: [QA 자동화 여정기](/posts/repetition-to-ai-judgment-to-human/) — Phase 7
