# 테크니컬 라이팅 기준 (Writing Standard)

> 이 문서는 `ai-driven-qa.vercel.app` 블로그의 글쓰기·검증 기준이다.
> 글로벌 엔지니어링 블로그 7사 9포스트(Stripe·Cloudflare·Netflix·GitHub·Slack·Uber·Meta),
> 국내 상위권 4사(토스·우아한형제들·LINE·당근), 공식 방법론(Google Tech Writing/Style,
> Microsoft Style Guide, Diátaxis, PostHog Handbook, Simon Willison)을 실측 분석해 종합했다.
> 각 항목에 ID를 부여한다 — 포스트 감사(audit) 시 이 ID로 판정을 기록한다.
>
> 작성: 2026-07-29 · Technical Writer 세션

---

## 0. 이 블로그의 컨텍스트 (기준 적용 전제)

- **1인 개인 블로그** — 기업 블로그 관례(자기소개 정형구, 채용 CTA)는 선택사항. 대신 개인 브랜딩(QA 엔지니어로서의 관점·포트폴리오)이 CTA를 대체한다.
- 독자: QA/자동화/AI 활용에 관심 있는 엔지니어 + 리크루터. 비개발 직군까지는 포용하되 주 타깃은 실무자.
- 문체 기본값: **평서 한다체** (기존 포스트 일관). 이 기준을 유지한다 — 존댓말 전환은 전체 리라이팅이므로 하지 않는다.
  - **예외 — 따라하기 가이드(How-to)**: 독자가 손을 따라 움직이는 절차 안내 글(예: 세팅 튜토리얼)은 존댓말 허용. 단 글 내부는 한 문체로 일관(혼용 금지). 여정기·에세이·설명(Explanation) 글은 예외 없이 한다체.
- 회사 데이터 익명화 원칙 유지 (Genting/Clonix 민감 정보 금지).

---

## 1. 글 유형 분류 — Diátaxis (T)

글 쓰기 전, 나침반 2질문으로 유형을 하나 확정한다:
① 이 글은 독자의 **행동**을 돕나, **이해**를 돕나? ② 독자는 **배우는 중**인가, **일하는 중**인가?

| | 행동 (하기) | 인지 (알기) |
|---|---|---|
| **습득 (학습)** | Tutorial — "~해보기" | Explanation — "왜 ~인가" |
| **적용 (작업)** | How-to — "~하는 법" | Reference — "~ 정리/명세" |

- **T1**: 글 하나 = 유형 하나. 메인 포인트도 하나. 두 개면 두 글로 쪼갠다.
- **T2**: 이 블로그의 주력 유형은 **Explanation(경험 서사·아키텍처 결정기)** — 여정과 실패를 담는다. 절차 부분(독자가 복붙할 것)은 순수 How-to로 섹션 분리한다. 절차 안에 이론 강의를 섞지 않는다.
- **T3**: 주제 판별 2질문 (PostHog) — "엔지니어 동료에게 보낼 만큼 흥미로운가?" + "2년 전의 나에게 유용했을까?" 둘 다 yes면 쓴다. (Willison: 새롭고 유일할 필요 없다 — TIL 수준이면 충분.)

## 2. 구조 표준 (S)

글로벌 9/9 공통 뼈대 = **5막 서사**:

```
훅(1~2문단) → 문제 정의 → 접근/설계 (대안 검토 포함) → 결과(수치) → 다음 단계
```

- **S1 — 도입 3문단 규칙** (역할 고정):
  1. 규모/맥락 — **실측 수치 1개 이상 필수** ("1,300만 행", "월 60만 명")
  2. 문제/긴장 — 페인포인트 또는 역설
  3. 글의 약속 — "이 글은 ~를 다룬다" (다루지 않는 것도 명시하면 가산점)
- **S2 — 훅 유형** 중 하나 채택: ① 장면 묘사형(토스), ② 질문형(우아한), ③ 규모 압도형(LINE/Stripe), ④ 독자 경험 소환형(GitHub "latency isn't just a metric. It's a context switch.")
- **S3 — 결론 선제시**: 성과 수치를 도입부(또는 상단 카드)에 공개하는 "결과 요약형" 또는 방법론을 약속하는 "여정 추적형" 중 택일. 어느 쪽이든 도입부에 수치는 있어야 한다.
- **S4 — 대안 검토 서사**: 채택안만 쓰지 말고 "고려한 대안과 기각 사유"를 남긴다 (Cloudflare Pingora, 당근 Airbyte 기각). 기각 사유는 수치로.
- **S5 — 헤딩 스캔 가능성**: 목차만 읽어도 글의 논리가 이어져야 한다. 서사형 소제목(토스 "우리가 놓친 진짜 속마음") 허용 — 단 내용 예측 가능해야 함. 헤딩 끝 마침표 금지, 한영 혼용 헤딩에서 영어는 소문자 원칙.
- **S6 — 문단 규칙**: 한 문단 = 한 주제, 2~4문장. 강조용 단문 문단 허용. 문단 첫 문장만 읽어도 논리가 이어지게.
- **S7 — 마무리 3종 세트**: ① 성과 요약 ② 미완 과제 인정("The work ahead" — 한계를 다음 목표로 프레이밍) ③ 후속 예고 또는 개인 브랜딩 CTA. 흐지부지 종료 금지. 도입부 되받는 수미상관(토스)은 가산점.
- **S8 — 분량**: 본문 2,500~4,000자(한국어 기준) 목표. 토스가 증명: 편집 품질과 길이는 반비례 — 아키텍처 상세를 버리고 의사결정 서사만 남긴다. 6,000자 초과 시 분할 검토.
  - **측정 프로토콜 (필수)**: frontmatter·코드블록·HTML 태그 제외 본문의 **한글 글자수(공백 포함)**. UTF-8 바이트·파일 크기 측정 금지 — 한글은 글자당 3바이트라 3배 과대측정된다 (1차 감사 사고 사례). 분할된 글은 합산 분량도 확인 — 중복 결말·중복 설명으로 합산이 원본보다 커지면 분할 실패.

## 3. 제목 규칙 (H)

- **H1**: 검증된 패턴 중 택일 —
  - 수치 훅형: "초당 100만 건, ~적용기" / "1,300만 행에서 ~"
  - How-we형: "우리는 어떻게 ~했나"
  - From A to B 변화형: "5년 못 푼 숙제, 한 달 만에 끝내기" / "From latency to instant"
  - 서사/구어형: "한 번 성공하니 다음도 쉬울 줄 알았다" (실패 인정형 가산점)
- **H2**: 낚시성 숫자 리스트형("~하는 5가지 방법") 금지 — 글로벌·국내 상위권 0건.
- **H3**: 제목에 가능하면 실측 수치 1개.

## 4. 문장 규칙 (W) — 한국어 적용판

| ID | 규칙 | Before → After |
|---|---|---|
| W1 | 행위 주체 복원 (능동태) | "설정이 적용됩니다" → "이 명령이 설정을 적용한다" |
| W2 | 이중 피동 금지 | "~되어진다" → "~된다/~한다" |
| W3 | 한 문장 = 한 아이디어. 연결어미("~하고, ~하며, ~해서") 2개 이상이면 문장 분리 | — |
| W4 | 명사화 필러 제거 | "~을 수행한다", "~ 작업을 진행한다" → "~한다" |
| W5 | 번역투 제거 | "만약 ~라면"→"~면" / "~에 의해"→행위 주체로 / 불필요한 "~들" 제거 |
| W6 | 조건절은 지시보다 앞 | "삭제하려면 Delete를 누른다" (역순 금지) |
| W7 | 3개 이상 나열은 리스트로 변환 | — |
| W8 | 모호한 지시어 금지 | "이것은/그것은" — 무엇인지 즉시 안 보이면 명사 반복 |
| W9 | 용어 일관성: 첫 등장 시 "한글(영문)" 병기, 이후 한 가지로 통일. 코드 식별자·에러 메시지는 번역 않고 코드 폰트 원문 | "리그레션 테스트(Regression Test)" |
| W10 | 현재 시제 기본 | "~할 것이다" 남발 금지 |
| W11 | 경어 레벨 고정: 글 전체 한 문체 일관, 혼용 금지. 기본 한다체 — 단 따라하기 가이드(How-to)는 글 전체 존댓말 허용(§0 예외) | — |
| W12 | 소리 내어 읽어 어색하면 고침 ("write like you speak") | — |

- **W13 — 용어 이중 기준**: 도메인 기본 용어(파티션 키, TLS)는 독자 지식 가정. 자사/자체 용어와 생소 개념은 즉시 정의하거나 **과거 포스트로 하이퍼링크** — 블로그를 상호 링크된 지식 그래프로 운영한다 (Uber·Netflix·Stripe 공통). 필요시 우아한식 괄호 완전 풀이("GMV(Gross Merchandise Value, 거래액)").
- **W14 — AI 문체 탈색 금지**: 균질한 AI 티 나는 문체 경계. 개인 목소리 유지 — "독자는 AI가 쓴 글을 알아보고 할인해서 읽는다" (PostHog). **측정 기준은 §4-1.**

## 4-1. AI 티 제거 (N) — 측정 기준

W14 를 「경계한다」로만 두면 지켜지지 않는다. 2026-08-21 전수 측정으로 **셀 수 있는 형태**로 바꿨다.

**기준선(실측)** — 사람이 쓴 국내 테크 블로그 5편, 한글 20,637자 표본:

| 지표 | 기준선 | 이 블로그(측정 당시) |
|---|---|---|
| 볼드 `**…**` | **1.2** / 천자 | 3.0 ~ 12.3 (중앙값 약 8.5) |
| em dash `—` | **0.1** / 천자 | 3.3 ~ 12.1 (중앙값 약 7) |

⚠️ 표본 5편이고 한 매체다. **「업계 평균」이 아니라 「이 매체는 이렇더라」로만 쓴다.**

| ID | 규칙 | 상한 |
|---|---|---|
| N1 | **볼드 밀도** — 한 문단에 볼드가 둘 이상이면 위계가 사라진다. 볼드는 「이 글에서 하나만 남긴다면」인 문장에만 | **4 / 천자** |
| N2 | **em dash 밀도** — `—` 는 리듬을 만들지만 세 문단 연속이면 버릇으로 읽힌다. 마침표·쉼표·줄바꿈으로 분산 | **4 / 천자** |
| N3 | **부정 대구 「X가 아니라 Y」** — 두 절이 같은 말이면 삭제, 진짜 대조일 때만 유지 | **글당 2회** |
| N4 | **상투구 금지** — 결론적으로 · 주목할 만하다 · 시사하는 바 · 핵심은 · 중요한 것은 · 살펴보자 · 혁신적인 | **0** |
| N5 | **번역투** — ~를 통해 · ~에 대해 · ~에 있어 · 되어진 · 가지고 있다 (W2·W5 와 같은 뿌리) | **0** |
| N6 | **삼항 나열(tricolon)** — 세 번째 항목이 두 번째의 동의어면 둘로 줄인다 | **글당 2회** |
| N7 | **리듬** — 문장 길이 표준편차가 14 미만이면 균일하다. 짧은 문장을 일부러 섞는다 | SD ≥ 14 |
| N8 | **곁길 한 곳** — 모든 문장이 논지를 나르면 기계가 쓴 것처럼 읽힌다. 글마다 「없어도 되는데 사실이라서 남긴 것」 하나 | ≥ 1 |

**측정 도구**: 세션 스크래치패드의 `ai_tells.py` (glob 를 인자로 받아 전수 측정).
붙이기 전에 **AI 티가 심한 더미 글로 빨강을 확인**한 뒤 쓴다 — 점수가 안 뛰면 그 측정기는 아무것도 안 보고 있다.

**주의**: 이 지표들은 **AI가 썼는지의 증거가 아니다.** 사람도 볼드를 남발한다. 지표는
「읽는 사람에게 기계처럼 보일 확률」을 재는 것이고, 넘겼다고 글이 틀린 것은 아니다.

## 5. 시각 자료 규칙 (V)

- **V1**: 아키텍처/플로 다이어그램 — 글로벌 9/9 등장. 시스템 구조를 다루는 글엔 최소 1개.
- **V2**: 배치는 **해당 텍스트 설명 직후**. 장식용 배치 금지.
- **V3**: 성과 섹션은 **before/after 비교 시각화**가 표준 (분포 그래프, 성능 차트, 표).
- **V4**: 우선순위 — 다이어그램 > 표 > 스크린샷/GIF > 코드. 코드는 의외로 적은 게 스탠다드 (9개 중 4개 코드 0).
- **V5**: 수치의 체감 환산 1개 이상 (Cloudflare "434 years of handshake time every day" 식). 큰 숫자는 독자가 만질 수 있는 단위로.
- **V6**: 이미지/차트에 alt 텍스트 또는 aria-label. 다크 테마 대응 (기존 인라인 차트의 `[data-theme="dark"]` 패턴 유지).
- **V7**: 이모지 절제 — 본문 남발 금지, 마무리 1개 수준까지 허용.

## 6. 코드 규칙 (C)

- **C1**: 전체 나열 대신 **핵심 인터페이스/판단 지점 발췌**. 실행 가능성보다 전달력 (단, 발췌라고 문법이 틀려선 안 됨).
- **C2**: 정확성 > 간결성. 나쁜 관행으로 줄이지 않는다. 게재 전 실제 실행/검증.
- **C3**: 주석은 '왜'만. '무엇'은 서술적 이름이 대신한다.
- **C4**: 안티 예시 병기 허용 — ❌/✅ 형식.
- **C5**: 코드 관련 텍스트는 코드 폰트, UI 요소는 볼드.

## 7. 신뢰 장치 (E) — 차별화 핵심

- **E1 — 실측 수치**: 백분위수/비율 단위 before/after 필수 ("P99 3.1s → 1.0s", "189,016 → 4 읽기"). "크게 개선" 같은 모호어 금지 — 글로벌 9/9, 국내 전원 탑재.
- **E2 — 실패담 1개 이상**: 실명 공개 수준으로 구체적으로 (토스 "8시간 만에 걷어냈다", Slack "malformed field가 설정을 리셋"). 성공만 남기면 서사가 죽는다.
- **E3 — 트레이드오프 명시 문장 1개 이상**: "X 대신 Y를 택했다. 대가는 Z다" (GitHub "freshness와 capacity의 명시적 트레이드오프").
- **E4 — 한계/미완 인정**: 남은 병목·안 되는 것을 숨기지 않는다.
- **E5 — 검증 방법 공개**: 결과만이 아니라 어떻게 쟀는지 (Meta "row count와 checksum 비교로 검증").

## 8. 대표글(featured) 선별 기준 (F)

대표글은 "잘 쓴 글"이 아니라 **"처음 온 독자가 3~4편 안에 저자를 파악하게 하는 글"**. 독자 = 리크루터(정체성 확인) + 엔지니어(깊이 확인).

- **F1 — 역량 축 커버리지**: 축당 1편, 같은 축 2편 금지. 축 = ① 기술 깊이(코드/DB 레벨) ② AI 활용 통찰(구조 설계) ③ 자동화 실행력(굴러가는 인프라) ④ 프로세스 설계(체계 구축). 허브(여정기)는 관문 역할로 축 커버리지를 혼자 보완 — 포함 권장.
- **F2 — 품질 하한**: 감사 등급 **B+ 이상**. 대표글이 블로그 전체의 품질 인상을 결정 — 미달 글이 featured 면 다른 글도 그 수준으로 추정당한다.
- **F3 — 훅 강도**: 제목만으로 클릭 유발 (수치 훅·역설 훅). 명사형 나열 제목은 부적합.
- **F4 — 첫 문단 자립성**: 시리즈 맥락 없이 단독으로 읽혀야 함. 시리즈 개별편은 부적합 — 허브가 대신한다.
- **F5 — 운영 규칙**: 개수 3~5편 고정. 분기 1회 + 재감사 등급 갱신 시 재선별. B+ 미만 강등 글은 자동 탈락.

기록 (2026-07-29): 현행 featured = repetition·db-index·kiosk-infra·field-service. 재선별 권고안 = db-index(A-·기술 깊이) + ai-confirmation(A-·AI 통찰) + bug-report(B+·자동화) + repetition(허브) — **R2 집행 완료 후 등급 재확인하고 확정할 것** (kiosk-infra·field-service 는 B라 F2 미달, 상향 시 재경합).

## 9. 퇴고 체크리스트 (감사용 요약)

**구조**: S1(도입 3문단+수치) · S4(대안 검토) · S5(헤딩 스캔) · S7(마무리 3종) · S8(분량)
**제목**: H1(패턴) · H3(수치)
**문장**: W1~W5(피동·필러·번역투) · W9(병기 일관) · W11(경어 고정) · W14(개인 목소리)
**시각**: V2(배치) · V3(before/after) · V5(체감 환산) · V6(alt/다크)
**코드**: C1(발췌) · C3(주석 왜)
**신뢰**: E1(수치) · E2(실패담) · E3(트레이드오프) · E4(한계)
**유형**: T1(1글 1포인트) · T3(2년 전 나 테스트)

판정 기준: 각 ID에 대해 PASS / PARTIAL / FAIL / N/A (해당 없음). FAIL·PARTIAL 은 근거 인용(해당 문장/섹션)과 수정 제안을 남긴다.

---

## 출처

**글로벌**: [Stripe Ledger](https://stripe.dev/blog/ledger-stripe-system-for-tracking-and-validating-money-movement) · [Cloudflare Pingora](https://blog.cloudflare.com/how-we-built-pingora-the-proxy-that-connects-cloudflare-to-the-internet/) · [Cloudflare Meerkat](https://blog.cloudflare.com/meerkat-introduction/) · [Netflix KV Abstraction](https://netflixtechblog.com/introducing-netflixs-key-value-data-abstraction-layer-1ea8a0a11b30) · [GitHub Issues 성능](https://github.blog/engineering/architecture-optimization/from-latency-to-instant-modernizing-github-issues-navigation-performance/) · [GitHub eBPF](https://github.blog/engineering/infrastructure/how-github-uses-ebpf-to-improve-deployment-safety/) · [Slack Notifications](https://slack.engineering/how-slack-rebuilt-notifications/) · [Uber Load Management](https://www.uber.com/kr/en/blog/from-static-rate-limiting-to-intelligent-load-management/) · [Meta Data Ingestion](https://engineering.fb.com/2026/05/12/data-infrastructure/migrating-data-ingestion-systems-at-meta-scale/)

**국내**: [토스 QA Platform](https://toss.tech/article/50893) · [토스 es-toolkit](https://toss.tech/article/50761) · [토스 Technical Writing 시리즈](https://toss.tech/article/technical-writing-3) · [우아한 A/B 실험 4회](https://techblog.woowahan.com/26379/) · [우아한 다국어+AI](https://techblog.woowahan.com/26162/) · [LINE Kafka E2EE](https://techblog.lycorp.co.jp/ko/applying-e2ee-to-apache-kafka-in-line-app) · [당근 DT Platform](https://medium.com/daangn/당근-200-개-db-를-옮기는-elt-플랫폼-dt-platform-을-만든-이야기-65a499b4967a)

**방법론**: [Google Tech Writing](https://developers.google.com/tech-writing) · [Google Style Guide](https://developers.google.com/style/highlights) · [Microsoft Top 10](https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice) · [Diátaxis](https://diataxis.fr/) · [PostHog Writing Blogs](https://posthog.com/handbook/engineering/writing-blogs) · [Simon Willison — What to blog about](https://simonwillison.net/2022/Nov/6/what-to-blog-about/) · [Stubailo — Great technical blog post](https://www.freecodecamp.org/news/how-to-write-a-great-technical-blog-post-414c414b67f6/)
