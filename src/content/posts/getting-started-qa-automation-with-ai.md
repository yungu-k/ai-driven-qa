---
author: 공윤구
pubDatetime: 2026-07-02T07:00:00.000Z
title: 따라하기 — Claude Code + MCP로 QA 자동화 시작하기
slug: getting-started-qa-automation-with-ai
featured: false
draft: false
tags:
  - guide
  - ai
  - qa-automation
description: 이 블로그의 자동화들을 직접 시도해보고 싶은 분들을 위한 초기 환경 세팅 가이드 — MCP 연결부터 첫 규격 문서, 첫 슬래시 커맨드까지.
---

> 이 블로그의 여정을 읽고 "우리 팀에도 해보고 싶다"는 분들을 위한 시작 가이드. 거창한 인프라 없이 **Claude Code + MCP + 규격 문서 하나**로 시작할 수 있습니다 — 저는 이걸로 TC 작성을 수동 5일에서 2~3시간으로 줄였습니다.

## 목차

## 준비물

- [Claude Code](https://claude.com/claude-code) — 터미널/IDE에서 동작하는 AI 코딩 에이전트
- 팀에서 쓰는 도구의 계정: 이슈 트래커(Jira 등), 스프레드시트, 디자인 툴
- Node.js 22+ (MCP 서버 실행용)

## 1단계 — MCP로 도구 연결

MCP(Model Context Protocol)는 AI Agent가 외부 도구를 표준 방식으로 다루게 해주는 프로토콜입니다. 제 여정에서 핵심이 된 연결 두 가지:

```bash
# Jira/Confluence (mcp-atlassian)
claude mcp add atlassian -- uvx mcp-atlassian \
  --jira-url https://your-team.atlassian.net \
  --jira-username you@team.com \
  --jira-token $JIRA_API_TOKEN

# 연결 확인
claude mcp list
```

스프레드시트는 MCP 서버를 쓰거나, Python 스크립트(gspread)를 Claude가 직접 실행하게 해도 됩니다. gspread 쪽이 붙이긴 빠르지만, 대가는 인증·서식 코드를 직접 관리해야 한다는 것입니다. **완벽한 연동보다 '한 대화 안에서 맥락이 이어지는 것'이 먼저입니다.**

<figure class="not-prose my-6 rounded-xl border border-border bg-muted/40 p-4" role="img" aria-label="MCP 연결 토폴로지. 가운데 Claude Code 에이전트 하나가 MCP를 통해 이슈 트래커(Jira), 문서(Confluence), 스프레드시트 세 도구에 모두 연결된다. 도구마다 창을 옮기는 대신 한 에이전트가 전부 다루므로 맥락이 끊기지 않는다.">
  <figcaption class="text-xs font-semibold text-muted-foreground">MCP 연결 — 도구마다 창을 옮기는 대신, 에이전트 하나가 전부 다룬다</figcaption>
  <div class="mt-4 flex flex-col items-center gap-2 text-xs">
    <span class="rounded-lg border-2 border-accent bg-accent/10 px-4 py-2 font-bold text-accent">Claude Code</span>
    <span aria-hidden="true" class="text-muted-foreground">│ MCP │</span>
    <div class="flex flex-wrap justify-center gap-2">
      <span class="rounded-md border border-border bg-background/60 px-2.5 py-1 text-muted-foreground">이슈 트래커 (Jira)</span>
      <span class="rounded-md border border-border bg-background/60 px-2.5 py-1 text-muted-foreground">문서 (Confluence)</span>
      <span class="rounded-md border border-border bg-background/60 px-2.5 py-1 text-muted-foreground">스프레드시트</span>
    </div>
  </div>
</figure>

> 토큰은 환경변수로만. 설정 파일이나 대화에 직접 붙여넣지 마세요.

## 2단계 — 규격 문서(CLAUDE.md)부터

프롬프트를 잘 쓰는 것보다 **규격 문서를 먼저 만드는 것**이 투자 대비 효과가 큽니다. 실제로 한 프로젝트에선 시안 1세트를 TC로 옮기는 데 수동 5일이 걸리던 게, 규격 문서 기반 자동화로 2~3시간으로 줄었습니다(자세한 과정은 [TC 설계 자동화](/posts/tc-design-automation)에). 프로젝트 루트의 `CLAUDE.md`는 Claude Code가 매 세션 자동으로 읽습니다.

최소 구성 예시:

```markdown
# QA 자동화 규격

## TC 작성 규칙
- 필수 컬럼: 대분류 / 중분류 / 소분류 / 사전조건 / Test Step / 기대결과 / Priority
- 문구는 "주니어 QA가 바로 수행 가능한 수준"으로 — 추상 표현 금지
- 코드 용어(함수명·필드명) 금지. 메뉴·화면·조작·결과로 서술

## 서식 적용 체크리스트 (순서 고정)
1. 데이터 입력 → 2. 헤더 서식 → 3. 컬럼 너비 → ...
9. Border는 반드시 마지막

## Bug Report 규칙
- Summary: [라벨코드] 화면명 - 현상 요약
- Description 6섹션: 환경/사전조건/재현절차/기대결과/실제결과/관련TC
- 테스트 버전은 매번 실시간 조회 (캐싱 금지)
```

포인트 세 가지:

1. **체크리스트로 단계화** — "서식 잘 적용해줘"는 빠뜨리고, "9단계 순서대로"는 안 빠뜨립니다.
2. **실패를 규칙으로** — AI가 실수하면 그 자리에서 규칙 한 줄을 추가하세요. 같은 실수가 재발하지 않습니다.
3. **독자 명시** — "주니어 QA가 수행 가능한 수준"처럼 산출물의 눈높이를 문서에 박으세요.

## 3단계 — 첫 슬래시 커맨드

자주 쓰는 워크플로우는 슬래시 커맨드로 고정합니다. `.claude/commands/qa-sync-jira.md` 파일 하나면 됩니다:

```markdown
---
description: Jira 상태 변화를 TC 시트에 동기화
---

1. TC 시트에서 Fail + Jira URL이 있는 행을 수집한다
2. 각 Jira 이슈의 현재 상태를 조회한다
3. 상태 전이 규칙을 적용한다:
   - 완료 → Pass (연결된 모든 이슈가 완료일 때만)
   - 반려 → N/A
   - 수정됨/다시열림 → Fail 유지
4. 변경 내역을 표로 보고하고, 확인받은 뒤 시트에 반영한다
```

이제 팀 누구든 `/qa-sync-jira` 한 줄로 같은 품질의 동기화를 실행합니다.

## 4단계 — 작게 시작해서 안정화 후 확장

제 여정의 순서가 그대로 추천 순서입니다:

1. **TC 설계** (효과 체감이 가장 빠름)
2. **Bug Report** (TC 데이터 재사용)
3. **QA Report** (앞 단계 데이터 집계)
4. **상태 동기화** (양방향 규칙 정의)
5. 그 다음에 UI/API 자동화, 모니터링, AI 팀원으로

각 단계를 **안정화한 뒤** 다음으로 넘어가세요. 한 번에 다 만들려 하면 규격도 코드도 어중간해집니다.

## 자주 밟는 함정

- **API 한계를 우회하려고 시간 낭비** — 스프레드시트 드롭다운 칩 색상처럼 API로 안 되는 건 빨리 '수동 영역'으로 분리 (TC 설계 자동화에서 실제로 겪은 사고)
- **결과 캐싱** — 버전·상태값은 매번 실시간 조회 규칙 명시 ([Bug Report 자동화](/posts/bug-report-automation)의 버전 캐싱 삽질 참고)
- **페이지네이션 누락** — 이슈 트래커 검색이 기본 페이지 한도(Jira는 50건)를 넘으면 어긋나기 시작합니다 ([QA Report 자동화](/posts/qa-report-automation)에서 50건 잘림으로 겪음)
- **fail = 버그 단정** — 자동화 실패가 곧 개발 버그가 아닙니다. 티켓 전 스펙 대조 단계를 규칙으로 ([AI QA 엔지니어 팀원](/posts/ai-qa-engineer-teammate)의 헌법 1조)

## 마치며

이 가이드의 모든 규칙은 [제 여정](/posts/repetition-to-ai-judgment-to-human)에서 실수 → 교정 → 문서화를 거쳐 나온 것들입니다. 여러분의 규격 문서도 그렇게 자랄 겁니다.

첫 단계로는 [TC 설계 자동화](/posts/tc-design-automation)를 추천합니다 — 효과 체감이 가장 빠르고(수동 5일 → 자동 2~3시간), 여기서 만든 규격 문서가 이후 Bug Report·QA Report 자동화의 재료가 됩니다.

> 투자 대비 효과가 가장 큰 곳은 '프롬프트'가 아니라 '규격 문서'였습니다.
