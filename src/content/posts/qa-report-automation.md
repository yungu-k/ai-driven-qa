---
author: 공윤구
pubDatetime: 2026-04-10T09:18:00.000Z
title: 데이터에서 PDF까지, 사람은 서명만 한다
slug: qa-report-automation
featured: false
draft: false
tags:
  - qa-process
description: QA 리포팅을 데이터 수집→집계→시트→PDF→메일 파이프라인으로 규격화하고, 사람은 판정(Verdict)과 승인만 하게 만든 이야기. 실제 릴리스에서 TC 38건 집계·Verdict까지, 사람 손은 서명뿐이었다.
---

> QA 리포팅을 AI로 바꾼다는 건 '메일을 대신 써주는 것'이 아니다. 데이터 수집 → 집계 → 문서 생성 → 배포까지의 파이프라인을 규격으로 박고, 사람은 **판정과 승인**만 하게 만드는 것이다.

## QA 결과를 메일 본문에 쓰던 시절

예전엔 QA가 끝나면 결과를 메일 본문에 서술해서 보냈다. "TC 몇 건 중 몇 건 Pass, 결함은 몇 건…"을 매번 손으로 풀어 썼다. 이력이 안 남는 건 아니다 — 메일함엔 남는다. 진짜 함정은 다른 데 있었다.

- **한 통 쓰는 데 반나절**이 걸렸다.
- 표준 보관처가 없어 메일함 여기저기 흩어져 검색·비교가 어려웠다.
- 릴리스마다 리포트 형태가 제각각이었다.

내용은 이미 데이터에 다 있는데(TC 시트에 Pass/Fail, Jira에 결함) 사람이 그걸 세어서 문장으로 옮기고 있었다. 세고, 계산하고, 서식 입히는 건 전부 규칙이다. 규칙이면 파이프라인으로 만들 수 있다.

## 배경 — AX(AI Transformation)로서의 QA 리포팅

이건 개인 취미가 아니라 사내 AX 과제의 일부였다. 방향을 유관 부서에 공식 공지로 선언했다 — QA 산출물을 표준화된 PDF 리포트로 발행하고, 공식 보관처를 Drive로 일원화한다. 리포트 작성은 AI가 대체하고, QA 엔지니어는 검수·최종 승인(Sign-off)을 담당한다. "AI가 쓰되 품질 보증 책임은 사람의 서명에 남긴다"가 설계의 뼈대였고, 한 정기 릴리스에 처음 적용했다.

## 접근 — 규격이 곧 AI의 작업 지시서

핵심 발상은 이거다. **파이프라인의 각 단계에 문서화된 규격을 붙이고, 그 규격을 AI의 작업 지시서로 쓴다.** AI에게 "리포트 잘 써줘"가 아니라 "이 규격대로 이 데이터를 조립하라"고 시킨다. 그러면 어떤 세션이 돌려도 같은 리포트가 나온다.

산출물 체인은 이렇게 생겼다. 파란 두 칸이 사람이 개입하는 유일한 지점이고, 나머지는 규격을 따라 자동으로 흐른다:

<figure class="not-prose my-6 rounded-xl border border-border bg-muted/40 p-4" role="img" aria-label="QA 리포트 파이프라인. 티켓 분석, QA Plan, TC 설계까지 자동으로 흐른 뒤 사람이 실장비에서 실행해 결과를 기입한다. 이어 QA Result 집계, PDF 생성, Drive 업로드, 알림 메일이 자동으로 흐르고, 마지막에 사람이 Verdict를 판정하고 서명한다. 사람 개입은 결과 기입과 판정·서명 두 지점뿐이다.">
  <figcaption class="text-xs font-semibold text-muted-foreground">산출물 체인 — 파란 칸(사람) 2곳 외에는 규격이 흘린다</figcaption>
  <div class="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs">
    <span class="rounded-md border border-border bg-background/60 px-2 py-1 text-muted-foreground">티켓 분석</span>
    <span aria-hidden="true" class="text-muted-foreground">→</span>
    <span class="rounded-md border border-border bg-background/60 px-2 py-1 text-muted-foreground">QA Plan</span>
    <span aria-hidden="true" class="text-muted-foreground">→</span>
    <span class="rounded-md border border-border bg-background/60 px-2 py-1 text-muted-foreground">TC 설계</span>
    <span aria-hidden="true" class="text-accent">→</span>
    <span class="rounded-md border-2 border-accent bg-accent/10 px-2 py-1 font-semibold text-accent">🧑 실장비 실행·결과 기입</span>
    <span aria-hidden="true" class="text-accent">→</span>
    <span class="rounded-md border border-border bg-background/60 px-2 py-1 text-muted-foreground">QA Result 집계</span>
    <span aria-hidden="true" class="text-muted-foreground">→</span>
    <span class="rounded-md border border-border bg-background/60 px-2 py-1 text-muted-foreground">PDF</span>
    <span aria-hidden="true" class="text-muted-foreground">→</span>
    <span class="rounded-md border border-border bg-background/60 px-2 py-1 text-muted-foreground">Drive</span>
    <span aria-hidden="true" class="text-muted-foreground">→</span>
    <span class="rounded-md border border-border bg-background/60 px-2 py-1 text-muted-foreground">알림 메일</span>
    <span aria-hidden="true" class="text-accent">→</span>
    <span class="rounded-md border-2 border-accent bg-accent/10 px-2 py-1 font-semibold text-accent">🧑 판정·서명</span>
  </div>
</figure>

## 구현 — 단계마다 규격을 박는다

**① QA Plan.** 12개 섹션을 정의하고, 섹션마다 "담길 것 / 안 될 것"과 작성 주체(AI 초안 / 수동 / 고정 템플릿)를 구분했다. 작성 후엔 별도 Sub-Agent가 섹션 정합을 검토한다 — 목표는 결과형, 전략은 방법형, 현황은 참고형으로 성격이 섞이면 지적한다. (만든 세션이 자기 걸 검수하면 성격 혼입을 못 잡는다. 이 블로그에서 반복해 다루는 [저자≠검증자 분리](/posts/ai-confirmation-bias-subagents)의 작은 적용이다.)

**② QA Result 시트.** 색상·폰트·머지·행 높이까지 픽셀 단위로 규격화해, 어떤 세션이 만들어도 같은 리포트가 나온다. 결함 집계는 JQL 자동 — 대상 버전(affectedVersion)과 리포터 기준으로 긁되, 페이지네이션 필수다(한 번 50건에서 잘려 결함 수가 어긋난 사고 이후 규격에 명문화).

- Test Summary: Total / Pass / Fail / N/A / N/T + Success Rate = `PASS / (PASS + FAIL)` (N/A·N/T는 분모 제외)
- Defect Summary, QA Opinion(사실 기반, 유추 금지), Verification Details

**③ PDF.** 처음엔 시트를 그대로 export했는데 품질이 나빠 폐기하고, HTML 템플릿 + headless 브라우저 인쇄를 표준으로 잡았다. 대가는 HTML 템플릿을 직접 유지보수해야 한다는 것 — 시트 export가 공짜로 주던 서식을 포기하고, 통제권과 맞바꿨다. 네이밍도 규칙으로 고정했다(`{차수}_QA_Report_{날짜}.pdf`).

**④ 메일.** 원칙은 "**기록은 시스템, 메일은 알림**". 본문에 결과 상세를 넣지 않고 Drive 링크만 건다. QA Start / Sign-off 양식을 고정해, 한 통 쓰는 데 5분을 넘기지 않게 했다.

## 리뷰 루프 — 사람 피드백 1회 = 규격 1줄

가장 잘 작동한 구조는 **사람의 피드백을 그때그때 규격에 영구화**하는 것이었다. 리뷰에서 한 번 지적된 표기 규칙이 규격의 한 줄이 되어, 다음부터는 자동으로 지켜진다.

- "사내 검증과 현장(UAT) 검증을 구분해 표기하라" → 규격에 반영
- 고객사 커뮤니케이션 용어 통일, `PASS` 대문자 통일, 운영 리스크는 "Known Issue 섹션"으로 프레이밍

서식 쪽 시행착오도 같은 방식으로 규칙이 됐다 — 첫 생성 때 머지 충돌·헤더 덮어쓰기·수식 오류가 한꺼번에 터졌고(→ 서식 필수 규칙 6개항), 행 참조가 한 줄씩 밀리는 off-by-one이 반복됐고(→ 참조 범위 규칙), 섹션 사이 빈 행이 매번 손삭제를 유발했다(→ 빈 행 제거, Section Header가 시각 구분). 실패 하나가 규격 한 줄로 남으면 두 번 다시 안 겪는다.

## 결과

실제 릴리스에서 이렇게 나왔다.

- **통합 리포트:** TC 38건(Pass 37 / N/A 1, Success Rate 100%), Verdict PASS, 결함 1건(기존 잠복). AI가 TC 시트 + Jira를 집계해 시트·PDF를 만들고, 사람은 Verdict 판정과 발행 승인만.
- **현장(UAT) Sign-off:** 현장 결과 27건 전건 PASS + RFID 리딩 성능(실칩 **2,040개 인식 100%**)을 별도 시트로 통합.
- 반나절짜리 메일 서술이 규격을 따라 계산돼 나오는 PDF 리포트 + 5분짜리 알림 메일로 바뀌었다. 이력은 Drive에 표준 파일명으로 쌓인다.

| | 예전 (메일 서술) | 지금 (규격 파이프라인) |
| --- | --- | --- |
| 작성 시간 | 한 통에 반나절 | 5분짜리 알림 메일 |
| 보관처 | 메일함 여기저기 | Drive 표준 파일명 일원화 |
| 형태 | 릴리스마다 제각각 | 규격 고정, 세션 무관 동일 |

## 교훈 — AI는 쓰고, 사람은 책임진다

> 리포트 자동화의 어려움은 '데이터 수집'이 아니라 '서식 일관성'과 '판정의 소재'다. 데이터는 규격으로 조립하되, **판정(Verdict)과 서명은 절대 AI에 위임하지 않는다.**

- **규격 = AI의 작업 지시서.** 파이프라인 각 단계를 문서로 박으면, 누가 돌려도 같은 산출물이 나온다.
- **사람 피드백 1회를 규격 1줄로 영구화**하면, 리뷰가 쌓일수록 자동화가 똑똑해진다.
- AI는 사실 기반으로만 작성(시트·Jira 실존 값, 유추 금지)하고, 품질 보증은 사람의 서명에 남긴다. AI Native ≠ 판정의 자동화다.

**남은 일.** 실장비에서 직접 실행해 결과를 기입하는 구간은 여전히 자동화 밖이고, 그걸 자동으로 당길 다음 계획은 아직 없다 — 정직하게 말하면 여기까지가 지금의 경계다.

---

→ 전체 여정에서 이 글의 위치: [QA 자동화 여정기](/posts/repetition-to-ai-judgment-to-human/) — Phase 3
