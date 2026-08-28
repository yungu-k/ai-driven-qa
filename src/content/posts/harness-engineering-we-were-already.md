---
author: 공윤구
pubDatetime: 2026-08-28T04:30:00.000Z
title: 우리가 하던 일에 이름이 생겼다
slug: harness-engineering-we-were-already
featured: false
draft: false
tags:
  - ai-workflow
description: 올해 OpenAI·Anthropic·Microsoft가 연달아 「하네스 엔지니어링」 글을 냈다. 모델이 아니라 모델을 둘러싼 구조 — 도구·검증·관측·경계 — 를 설계하는 일. 읽다 보니 기시감이 왔다. 이 블로그의 절반이 그 단어 없이 그 일을 해 온 기록이었다.
---

> 요즘 하네스 엔지니어링(harness engineering)이라는 말에 관심이 생겨서 글로벌 테크 기업들이 올린 글을 찾아 읽었다. 읽을수록 기시감이 커졌다. 새로운 개념을 배우는 게 아니라, 우리가 1년 동안 하던 일의 이름을 이제 알게 된 쪽에 가까웠다.

## 올해 들어 이름이 자리를 잡았다

흐름이 빠르다. 2월에 OpenAI가 「Harness engineering」이라는 제목의 글을 냈고, 3월에 Anthropic이 장기 실행 에이전트의 하네스 설계 실험을 공개했고, 7월에 Microsoft는 아예 「Harness」라는 이름의 런타임을 출시했다. 세 회사가 반년 사이에 같은 단어를 오피셜로 채택했다.

정의는 OpenAI 글이 제일 명료하다. 하네스 엔지니어링은 **모델이 아니라 모델을 둘러싼 환경을 설계해서 에이전트의 출력을 끌어올리는 일**이다. 진행이 더딘 이유를 모델의 무능에서 찾기 쉽지만, 실제로는 환경이 덜 정의돼 있어서라는 것이다. 도구가 없고, 경계가 없고, 검증이 없어서. 같은 글에 컨텍스트 엔지니어링과의 구분도 나온다. 컨텍스트 엔지니어링이 「에이전트에게 무엇을 보여줄 것인가」라면, 하네스 엔지니어링은 **「시스템이 무엇을 막고, 재고, 고칠 것인가」**다.

막고, 재고, 고친다. QA 직무 기술서에서 본 것 같은 문장이다.

## 기시감의 목록

읽으면서 접힌 페이지들을 우리 글과 나란히 놓아 본다.

**「에이전트는 자기 작업을 자신 있게 칭찬한다」.** Anthropic 실험의 출발점이다. 생성한 에이전트에게 평가까지 맡기면 품질이 눈에 띄게 평범해도 확신에 차서 칭찬한다는 것. 그래서 생성과 평가를 다른 에이전트로 갈랐고, 기획·생성·평가 3역 구성이 단일 에이전트를 크게 앞섰다. 우리는 같은 결론에 다른 문으로 들어갔다 — [AI도 확증편향에 빠진다](/posts/ai-confirmation-bias-subagents/)에서 검증을 반증 전담 서브에이전트로 분리했고, [팀원 5인](/series/ai-teammate/)은 처음부터 기획·개발·QA를 서로 다른 세션으로 갈라 서로의 산출물을 검증하게 했다. 프롬프트로 「객관적으로 평가해」라고 부탁하는 건 안 되고, 구조로 갈라야 된다는 게 양쪽의 공통 결론이다.

**관측 계층.** Microsoft의 하네스 런타임은 텔레메트리를 기본 탑재로 넣었고, OpenAI 글의 「잰다(measure)」도 같은 자리다. 에이전트가 자율로 돌수록 사람이 그 활동을 볼 채널이 하네스의 일부가 된다. 우리 버전이 지난주의 [세션 간 대화 다이제스트](/posts/ai-team-comms-digest/)다. 팀이 나 없이 31만 자를 말하고 있길래, 세션의 자기 보고 대신 수신 측 기록에서 뽑는 관측 채널을 만들었다.

**하네스 자체의 신뢰성.** 하네스라는 단어의 원적지는 테스트 하네스다. 그리고 초록불이 「통과」인지 「아무것도 안 본 것」인지 모른다는 테스트 하네스의 오래된 함정은 에이전트 하네스에도 그대로 있다. [수동 26건이 1건이 되자, 초록을 의심하기 시작했다](/posts/kiosk-screen-automation-renewal/)에서 겪은 그 문제다. 검증 에이전트를 붙이는 것과, 그 검증이 실제로 빨강을 낼 수 있는지 확인하는 것은 다른 일이고, 뒤쪽이 더 어렵다.

**경계 설계.** 디자이너 팀원을 붙일 때 정한 [「글 쓰는 쪽은 스타일을 짜지 않는다」](/posts/ai-designer-teammate/) 같은 역할 경계, 배포·파괴적 작업 앞의 승인 게이트 — 하네스 글들이 sandbox와 approval boundary라고 부르는 것들의 수공업 버전이다.

## 왜 겹치는가

우연으로 보이지 않는다. 하네스 엔지니어링의 밑에 깔린 전제가 이것이다 — **행위자의 자기 보고를 믿지 않고, 구조가 검증하게 한다.** 이건 AI 때문에 새로 발명된 원칙이 아니다. 개발자가 자기 코드를 스스로 통과시키지 않게 하려고 QA가 분리됐고, 선언과 적용이 다르다는 걸 알아서 산출물을 열어 보고, 검사가 실패할 수 있는지부터 확인한다. QA가 수십 년 사람에게 적용하던 원칙이 대상만 에이전트로 바뀐 것이다.

그래서 이 블로그의 태그를 다시 보면 — 확증편향 구조 보정, 세션 간 관측, 역할 경계, 초록 의심 — 절반이 하네스 엔지니어링 사례집이다. 단어가 없었을 뿐이다.

물론 거리도 있다. 저쪽은 하네스를 수만 명이 쓰는 제품과 런타임으로 만들고 있고, 우리 것은 다섯 세션짜리 수공업이다. 규모가 주는 문제(컨텍스트 압축, 세션 간 핸드오프 아티팩트)는 우리가 이제 막 만나기 시작한 구간이라, 저 글들은 예습에 가깝다.

## 참고 자료

찾아 읽은 것 중 기업 오피셜만 남긴다.

- **OpenAI** — [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/) (2026.02, Ryan Lopopolo). 용어 정의의 출발점. 「1,000페이지 매뉴얼 대신 지도를 줘라」 — 100줄짜리 AGENTS.md 운용까지 실무 디테일이 많다
- **Anthropic** — [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps) (2026.03). 기획·생성·평가 3역 하네스 실험. 자기 평가의 실패 양상 서술이 특히 정확하다
- **Microsoft** — [The Microsoft Agent Framework Harness is now released](https://devblogs.microsoft.com/agent-framework/the-microsoft-agent-framework-harness-is-now-released/) (2026.07). 하네스를 런타임 제품으로 — 도구 루프·컨텍스트 압축·승인·텔레메트리가 기본 탑재 목록에 다 있다

---

→ 본문에서 이어지는 우리 사례: [확증편향 구조 보정](/posts/ai-confirmation-bias-subagents/) · [세션 간 대화 다이제스트](/posts/ai-team-comms-digest/) · [초록을 의심하다](/posts/kiosk-screen-automation-renewal/) · [팀원 시리즈](/series/ai-teammate/)
