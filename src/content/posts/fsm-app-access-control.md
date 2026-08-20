---
author: 공윤구
pubDatetime: 2026-08-19T09:00:00.000Z
title: 로그인만 하면 다 보였다 — 사내 웹앱을 외부 파트너에게 열기까지
slug: fsm-app-access-control
featured: false
draft: true
tags:
  - infra
  - security
  - supabase
description: 현장 서비스 이력 앱을 React + Supabase로 짓고 외부 파트너에게 열었다. 그 순간 앱의 중심이 화면에서 DB로 옮겨갔다 — 가입 경로 3개, 관문 1개, 접근 제어에만 쓴 마이그레이션 4개의 기록.
---

> 현장 엔지니어가 장비 서비스 이력을 남기는 사내 웹앱을 지었다. 화면 9개, 런타임 의존성 4개, 인프라 비용 0원. 이 앱을 외부 파트너사에게 열기로 한 순간, 스키마 마이그레이션 29개 중 4개를 새 기능이 아니라 **누가 무엇을 보는가**에 썼다.

## 사내앱일 땐 그게 맞는 설계였다

접근 정책 이름이 전부 `_select_auth` 였다. **로그인하면 전부 보인다.** 사내 계정만 존재하던 시절엔 맞는 설계다 — 같은 회사 사람끼리 서로의 기록을 못 보게 막을 이유가 없다.

외부 파트너가 들어오는 순간 그 설계가 사고가 된다. 파트너 A가 파트너 B 담당 사업장의 장비 고장 이력을 통째로 조회한다. 카지노 현장 사진은 URL만 알면 로그인 없이도 열렸다 — 버킷이 public 이었으니까.

이 글은 그 전환을 다룬다. 무엇을 왜 만들었고, 스택을 어떻게 골랐고, 외부에 열기로 한 뒤 인증·인가를 어떻게 다시 짰는지. **Jira 양방향 연동은 다루지 않는다** — 그건 [따로 한 편](/posts/field-service-jira-sync/)이다.

## 만든 것

현장 기술지원 이력이 흩어지는 게 문제였다. 파트너는 내부 Jira에 접근할 수 없고, 내부는 현장 조치를 실시간으로 모른다. 그 사이를 잇는 화면 9개짜리 모바일 우선 SPA를 지었다 — 로그인 · 대시보드 · 기록 목록 · 상세 · 신규 작성 · 월간 리포트 · 마스터 데이터 · 계정 · 비밀번호 재설정. 현장에서 폰으로 쓰니 데스크톱은 나중이었다.

## 스택 — 무료 티어에서 고른 것

React 18 + Vite + TypeScript + Tailwind, 백엔드는 Supabase(Postgres · Auth · Storage · Edge Functions), 배포는 Vercel. **런타임 의존성 4개**가 전부다. 기각한 것들이 스택을 설명한다.

| 후보 | 채택 | 기각 사유 |
| --- | --- | --- |
| 자체 인증 서버 | Supabase Auth | 인증을 직접 짜면 그날부터 그게 이 앱에서 제일 위험한 코드가 된다 |
| dev Supabase 프로젝트 | 운영 직결 | 아래 트레이드오프 참조 — 편의가 아니라 값을 치른 결정이다 |

대시보드 차트는 라이브러리 대신 SVG를 직접 그렸고, PDF는 jsPDF 대신 인쇄 CSS와 `window.print()` 로 냈다. 둘 다 번들 증가 0이다.

## 인증 — 가입 경로는 셋, 관문은 하나

로그인 화면이 제공하는 경로는 셋이다. Google OAuth, 이메일+비밀번호 가입, 비밀번호 재설정.

```ts
// Google — 브라우저가 여기서 구글로 떠난다
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: window.location.origin },
});
```

경로가 셋이어도 **관문은 하나다.** 셋 다 결국 `auth.users` 에 행 하나를 넣고, 거기 붙은 트리거가 프로필을 만든다.

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  -- 가입 경로와 무관하게 auth.users insert 는 한 번이다.
  -- 이름의 출처만 다르다 — Google 은 구글 프로필에서, 이메일 가입은 폼에서.
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;
```

`profiles.approved` 의 기본값은 `false` 다. **가입은 열려 있고, 승인 전에는 읽을 수 있는 게 0이다.**

값어치는 Google 로그인을 붙일 때 드러났다. 접근 제어 코드를 **한 줄도 고치지 않았다** — 가입 경로를 늘려도 관문 수는 안 는다.

<figure class="not-prose my-6 rounded-xl border border-border bg-muted/40 p-4" role="img" aria-label="인증·인가 흐름 도식. Google OAuth, 이메일과 비밀번호 가입, 비밀번호 재설정 세 가지 가입 경로가 모두 auth.users 테이블의 행 삽입 하나로 수렴한다. 그 삽입에 붙은 트리거가 프로필을 승인 대기 상태로 만든다. 이후 모든 데이터 접근은 DB의 행 수준 보안 정책 두 조건을 통과해야 한다 — 승인됐는가, 그리고 이 사업장을 담당하는가. 화면의 승인 대기 안내는 차단이 아니라 안내일 뿐이다.">
  <figcaption class="text-xs font-semibold text-muted-foreground">가입 경로 3개 → 관문 1개 — 차단은 화면이 아니라 DB가 한다</figcaption>
  <div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
    <div class="flex flex-col gap-1.5">
      <span class="rounded-md border border-border bg-background/60 px-2.5 py-1 text-muted-foreground">Google OAuth</span>
      <span class="rounded-md border border-border bg-background/60 px-2.5 py-1 text-muted-foreground">이메일 + 비밀번호</span>
      <span class="rounded-md border border-border bg-background/60 px-2.5 py-1 text-muted-foreground">비밀번호 재설정</span>
    </div>
    <span aria-hidden="true" class="text-muted-foreground">→</span>
    <span class="rounded-lg border-2 border-accent bg-accent/10 px-3 py-2 font-semibold text-accent">auth.users<br /><span class="text-[10px] font-normal">insert 1회</span></span>
    <span aria-hidden="true" class="text-muted-foreground">→</span>
    <span class="rounded-lg border border-border bg-background/60 px-3 py-2 text-muted-foreground">트리거<br /><span class="text-[10px]">approved = false</span></span>
    <span aria-hidden="true" class="text-muted-foreground">→</span>
    <div class="rounded-lg border border-accent/60 bg-accent/5 p-2">
      <p class="mb-1.5 text-center text-[10px] text-muted-foreground">RLS — 여기가 벽이다</p>
      <div class="flex flex-col gap-1">
        <span class="rounded-md border border-border bg-background/60 px-2 py-1 text-foreground">승인됐나</span>
        <span class="rounded-md border border-border bg-background/60 px-2 py-1 text-foreground">이 사업장 담당인가</span>
      </div>
    </div>
  </div>
</figure>

## 인가 — 막는 건 화면이 아니다

승인 대기 사용자에게 뜨는 안내 화면은 UX다. **진짜 차단은 DB에 있다** — 행 수준 보안(RLS, Row Level Security)이 테이블마다 "이 행을 이 사람이 볼 수 있나"를 판정한다.

사내앱 시절과 지금을 나란히 놓으면 무엇이 바뀌었는지가 보인다.

| | 사내앱 시절 | 외부 오픈 후 |
| --- | --- | --- |
| 조회 조건 | 로그인했나 | 승인됐나 **+ 담당 사업장인가** |
| 마스터 데이터 쓰기 | 로그인한 누구나 | 관리자만 |
| `role`·`approved` 변경 | 자기 프로필 수정으로 가능 | 트리거가 차단 |
| 현장 사진 | public 버킷 — URL 알면 열림 | private + 1시간 만료 signed URL |
| 레코드 삭제 | 로그인한 누구나 | 관리자만 |

```sql
create policy "service_records_select_approved" on public.service_records
  for select using (public.is_approved() and public.can_access_site(site_id));
```

조건 둘을 곱한다 — 승인됐나, 이 사업장을 담당하나. 뒤쪽 하나가 빠지면 **파트너 계정 하나로 전 사업장의 장비 고장 이력이 조회된다.** 프런트엔드는 아무 잘못도 하지 않은 채로.

같은 조건을 사진 첨부와 장비 마스터에도 곱했다. 정책을 테이블마다 손으로 쓰지 않고 마이그레이션 안에서 루프로 만든 이유가 그거다 — 손으로 쓰면 한 테이블을 빠뜨린다.

### 재귀 함정

`profiles` 에 RLS를 걸었는데 그 정책이 다시 `profiles` 를 조회하면 무한 재귀가 난다. 권한 헬퍼를 `security definer` 로 만들어 끊었다.

```sql
create or replace function public.is_admin()
returns boolean language sql stable
security definer            -- RLS 를 우회한다 → profiles 재귀 차단
set search_path = public    -- definer 함수의 필수 방어
as $$
  select exists (select 1 from public.profiles
                  where id = auth.uid() and role = 'admin' and approved);
$$;
```

우회 자체가 목적이 아니라, 우회하지 않으면 정책이 자기 자신을 부르는 구조를 못 벗어난다. 대신 `search_path` 를 고정해 함수가 엉뚱한 스키마를 보지 못하게 막는다.

### 사진 버킷

현장 사진 버킷이 public 이었다. URL만 알면 누구나 열렸다. private 으로 바꾸고 만료형 signed URL로 전환한 뒤 **구 공개 URL이 실제로 차단되는지 네거티브로 확인**했다.

## 안전장치와 그 대가

- **`role`·`approved` 는 관리자만 바꾼다** — 트리거로 막았다. 단 `auth.uid()` 가 없으면(서비스 롤·SQL 에디터) 통과시킨다. 열쇠를 쥔 사람은 못 막는다는 걸 인정하고 그 자리에 주석으로 남겼다. 숨긴 예외는 예외가 아니라 구멍이다.
- **dev 프로젝트를 안 만들었다** — 마이그레이션 하나가 곧 운영이다. 대가를 알고 치렀고, 값은 규율로 냈다. 모든 마이그레이션을 재실행 가능(idempotent)하게 쓰고, 값 체계를 바꿀 땐 구·신 값이 공존하는 전환기 모드로 배포한 뒤 나중에 정리 마이그레이션으로 걷어냈다. 규모가 커지면 안 통할 선택이다.

## 열고 나서 한 번 더 — 자체 보안 감사

운영 도메인을 연 직후 앱을 공격자 시선으로 한 번 더 훑었다. 항목 14개가 나와 즉시·단기·중기·장기로 줄을 세웠고, 그중 네 건은 그 주에 고쳤다.

| 무엇이 문제였나 | 어떻게 고쳤나 | 무엇으로 확인했나 |
| --- | --- | --- |
| Edge Function CORS가 `*` — 아무 사이트나 함수를 부른다 | 운영·로컬·프리뷰 도메인만 echo하는 화이트리스트 모듈 | 허용 안 된 origin으로 preflight를 쳐서 차단 확인 |
| 웹훅 인증이 URL 쿼리 시크릿 — 접속 로그에 남는다 | 본문 HMAC-SHA256 서명(요청 위·변조를 막는 서명) 검증 | 유효 요청 200 / 위조·무서명 401 |
| 함수 로그가 필드·페이로드를 통째로 찍었다 | 식별자만 남기고 전부 삭제 | 로그에서 고객 데이터 0건 |
| 관리자가 0명이 될 수 있었다 | 마지막 관리자 보호 트리거 | 유일 관리자 강등 시도 → DB가 거부 |

로그 항목이 제일 조용했다. 아무도 공격하지 않아도 고객 데이터가 이미 우리 로그에 매일 쌓이고 있었다.

**구현하지 않고 결정으로 대체한 것도 있다.** 관리자 계정에 2단계 인증을 붙이려다 자체 TOTP 구현을 접고, **관리자는 MFA가 켜진 Google 계정으로만 로그인하도록** 운용 규칙을 바꿨다. 비밀번호 경로가 아예 없으니 재설정 메일 경로도 같이 사라진다. 앞에서 Google OAuth를 붙였을 때 접근 제어 코드를 한 줄도 안 고쳤던 게 여기서 값을 했다 — **인증 강화를 코드가 아니라 계정 정책으로 해결할 수 있게 됐다.**

검증 칸이 비어 있으면 그건 고친 게 아니다. "이제 막혔을 것이다"는 조치가 아니라 기대다.

## 남은 것

- **무료 티어는 백업이 7일이고 시점 복구가 없다.** 알고 미룬 상태다.
- 감사 로그가 없다 — 누가 무엇을 고치고 지웠는지 남지 않는다. 파트너와 다툼이 생기면 그때 필요해진다.
- 현장 공용 PC 가능성 때문에 세션 만료 정책을 다시 봐야 하고, 가입 봇 방지도 아직 없다(승인제가 1차 방어라 후순위).
- **테스트가 0건이다.** 린트가 `tsc --noEmit` 하나뿐이다. 순수 웹앱이고 소스와 문서가 다 있는데도 아직 자동 검증이 없다 — 다음 글감은 여기다.

---

마이그레이션 29개 중 4개는 새 기능을 하나도 안 만들었다. 승인 게이트, private 버킷, 마지막 관리자 보호, 사업장 격리 — 화면에서 보이는 건 승인 대기 안내 한 장뿐이다.

> 사내앱을 외부에 여는 일은 화면을 고치는 일이 아니다. **누가 무엇을 볼 수 있는지를 DB에 다시 쓰는 일이다.** 프런트엔드는 그 결정을 표시할 뿐이고, 표시는 우회된다.

→ Jira 양방향 연동 설계: [이름으로 맞추고 id로 건다](/posts/field-service-jira-sync/) · 전체 여정: [QA 자동화 여정기](/posts/repetition-to-ai-judgment-to-human/)
