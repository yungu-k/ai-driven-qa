# 개발 핸드오프 — 여정기를 "블로그 입구"로 승격 (2026-07-03)

> ## 🗣 쉬운 요약
> - **무엇**: 전체 경험을 요약한 대표 글(`repetition-to-ai-judgment-to-human`, "여정기")을 블로그의 **시작 입구**로 세우고, 그 글에서 각 상세글로 가는 링크를 엮습니다.
> - **왜**: 이 글은 이미 전체 그림을 담은 "기둥" 글입니다. 별도의 요약 메뉴를 새로 만들면 같은 내용이 두 곳에 생겨 어긋납니다(SSOT 붕괴). 그래서 **새 요약을 만들지 말고**, 이 글을 잘 보이는 입구로 만들고 상세글과 링크로 잇습니다.
> - **그래서**: (1) 홈 히어로에 이 글로 가는 버튼 1개, (2) 여정기 Phase↔상세글 링크, (3) featured는 그대로. 새 페이지·새 메뉴·새 콘텐츠 없음.

> 핵심 원칙: **새 요약 콘텐츠를 만들지 않는다.** 요약본은 여정기 하나뿐(SSOT). 입구화 + 링크만.

---

## 📋 개발 핸드오프

### E1. 홈 히어로 → 여정기 진입 CTA

- **무엇을**: 홈 히어로에, 여정기로 가는 눈에 띄는 링크(CTA) 1개를 추가한다. 방문자가 콜드로 들어와도 한 클릭에 전체 이야기를 잡게.
- **수용 기준**:
  - [ ] 홈 히어로의 **소제목 문단 아래**(성과 스트립보다 위 — hook → CTA → 근거 순)에 CTA 링크가 있다.
  - [ ] 문구는 "**이 블로그를 관통하는 이야기 →**" (또는 동급), 링크 대상 `/posts/repetition-to-ai-judgment-to-human/`.
  - [ ] 기존 링크 스타일(예: `LinkButton`)/토큰만 사용, 새 색·컴포넌트 없음. 다크/라이트 정상.
  - [ ] 성과 스트립·featured 레이아웃을 깨지 않는다.
- **영향 범위**: `src/pages/index.astro` 히어로 섹션.
- **제약**: nav 메뉴 항목은 추가하지 않는다(입구는 홈 CTA로 충분, nav 비대화 방지). 스트립 값·문구 무관.
- **참고 위치**: `src/pages/index.astro`(히어로·`LinkButton` 사용부), `src/components/LinkButton.astro`.

### E2. 여정기 = 허브: Phase → 상세글 링크

- **무엇을**: 여정기가 진짜 "기둥"이 되도록, 각 Phase에서 해당 상세글(가지)로 나가는 링크를 건다. 현재 여정기 본문에는 상세글 링크가 0개다.
- **권장 매핑(기획 제시 — dev가 저장소에서 확인)**:

  | Phase | 상세글(slug) |
  | --- | --- |
  | Phase 1 — TC 설계 자동화 | `tc-design-automation` (+ `diff-driven-tc`) |
  | Phase 2 — Bug Report 자동화 | `bug-report-automation` |
  | Phase 3 — QA Report 자동화 | `qa-report-automation` |
  | Phase 4 — 디자인 변경 감지 + 커버리지 갭 | `design-change-detection` |
  | Phase 5 — Regression + Jira 상태 동기화 | `regression-and-status-sync` |
  | Phase 6 — 운영 모니터링 | `realtime-kiosk-monitoring` (+ `live-issue-triage`) |
  | Phase 7 — AI를 동료로 | 시리즈 페이지 `/series/ai-teammate` |

- **수용 기준**:
  - [ ] **"전체 여정 한눈에" 표(§28 부근)의 각 Phase 행에서 해당 상세글로 링크**가 걸린다(허브 지도 = 단일 위치). 이걸 필수로.
  - [ ] (선택) 각 Phase의 "결과" 끝에 "→ 자세히: [글 제목]" 인라인 링크.
  - [ ] Phase 7은 개별 3편이 아니라 **시리즈 페이지**(`/series/ai-teammate`)로 — 거기서 3편으로 다시 갈라짐(중복 링크 방지).
  - [ ] 링크 대상 slug가 실재하고 동작.
- **영향 범위**: `src/content/posts/repetition-to-ai-judgment-to-human.md` (링크 추가만).
- **제약**: **본문 서술·존댓말 톤은 건드리지 않는다**(아래 톤 주의 참조). 링크만 추가.

### E3. 상세글 → 여정기 되돌아오기 (가지→기둥)

- **무엇을**: E2에서 매핑된 상세글들에, "전체 여정에서 이 글의 위치 보기 →"처럼 여정기로 돌아가는 링크 한 줄을 넣는다(양방향 허브).
- **수용 기준**:
  - [ ] E2 매핑 표의 상세글 각각에 여정기(`/posts/repetition-to-ai-judgment-to-human/`)로 가는 링크 한 줄이 있다(상단 또는 하단 일관).
  - [ ] 형식이 3~4편에 걸쳐 일관.
- **영향 범위**: E2 매핑 표의 상세글들(약 7~8편). 링크 한 줄씩.
- **제약**: 본문 내용 무변경. 우선순위는 E1·E2 다음.

### E4. featured — 변경 없음

- 여정기는 이미 featured. 그대로 둔다. (확인만, 수정 없음.)

---

## 톤 주의 (중요)

- 여정기의 **존댓말(~입니다)은 유지한다.** 이건 "방문자에게 전체 이야기를 안내하는 입구 글"이라는 역할과 맞는 의도된 톤이다. 평서체로 바꾸지 말 것.
- 이번 작업은 **링크·CTA 추가**이지 글 리라이팅이 아니다. 서술 문장은 건드리지 않는다.

## 구현 제약

- 새 페이지·새 nav 항목·새 요약 콘텐츠 없음. 기존 토큰/컴포넌트만.
- 정적 유지(런타임 JS 라이브러리 0).

## 검증 (개발자 규칙)

- 홈에서 CTA 클릭 → 여정기 도달(라이브).
- 여정기 "전체 여정 한눈에" 표의 각 Phase 링크가 올바른 상세글/시리즈 페이지로 감(대상 실재).
- 상세글의 되돌아오기 링크 동작.
- 빌드 green, 다크/라이트 확인(라이트 육안 1회).
- 완료 보고는 돌린 확인 + 결과로. 링크는 **대상 slug 실재를 grep/빌드로 확인**(죽은 링크 0).

## 참고 위치
- 여정기: `src/content/posts/repetition-to-ai-judgment-to-human.md` (Phase 1~7, "전체 여정 한눈에" 표 §28)
- 홈: `src/pages/index.astro`
- 시리즈 페이지: `/series/ai-teammate` (Phase 7 링크 대상)

---

## ✅ 구현 결과 (개발 세션, 2026-07-03)

**E1** — 히어로 소제목 문단 바로 아래(성과 스트립 위)에 기존 `LinkButton` + `IconArrowRight`로 CTA "이 블로그를 관통하는 이야기 →" 추가, 대상 `/posts/repetition-to-ai-judgment-to-human/`. accent 토큰만 사용, nav 무변경.

**E2** — "전체 여정 한눈에" 표에서 Phase 1~7 주제 컬럼 전부 링크. 보조 링크 2개: Phase 1 핵심 컬럼의 "코드 diff 기반…" → `diff-driven-tc`, Phase 6 핵심 컬럼의 "알람 자동 분류 리포트" → `live-issue-triage`. Phase 7은 명세대로 `/series/ai-teammate/`. 본문 서술·존댓말 무변경(링크 마크업만). 선택 항목(각 Phase 결과 끝 인라인 링크)은 표가 허브 지도 역할을 하므로 중복 방지 차원에서 미적용.

**E3** — 매핑된 상세글 8편(tc-design/diff-driven/bug-report/qa-report/design-change/regression/realtime/live-issue) 하단에 동일 형식 한 줄: "→ 전체 여정에서 이 글의 위치: [QA 자동화 여정기](…) — Phase N". live-issue-triage 는 Phase 6으로 표기.

**E4** — 여정기 frontmatter `featured: true` 확인, 무변경.

**돌린 확인 + 결과:**
- 빌드 green.
- **죽은 링크 0 (전수)**: dist 전 페이지의 내부 `/posts/`·`/series/` href 165건을 스크립트로 수집해 dist 실재 경로와 대조 — dead 0.
- E1: dist/index.html에 CTA 문구·href 존재 + 다크/라이트 렌더 스크린샷(라이트는 테마 강제 주입으로 육안 1회 — 첫 두 방식은 테마 스크립트가 되돌려 실패, interval 고정으로 성공).
- E2: 여정기 built HTML의 표 구간에서 href 추출 → 8개 글 + 시리즈 페이지, 매핑 순서 일치.
- E3: 8편 각각 built HTML에 되돌아오기 문구 1건씩.
