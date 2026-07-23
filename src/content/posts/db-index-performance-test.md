---
author: 공윤구
pubDatetime: 2026-07-03T02:00:00.000Z
title: QA가 DB까지 — 1,300만 행에서 슬로우 쿼리 장애 재현하기
slug: db-index-performance-test
featured: true
draft: false
tags:
  - performance
  - database
  - operations
description: 운영 장애의 원인으로 지목된 슬로우 쿼리를 테스트 환경에 1,300만 행을 시딩해 재현하고, 인덱스 세 가지 상태를 정량 비교해 수정안을 권고한 기록.
---

> 운영에서 발생한 처리 지연 장애 — 원인으로 지목된 슬로우 쿼리를 사무실 테스트 환경에서 재현하고, 인덱스 수정안의 효과를 숫자로 비교했다. UI 테스트가 아니라 DB 엔진 레벨의 성능 검증이다.

<style>
  .dbchart { --bar-ok: #4f46e5; --bar-danger: #dc2626; }
  [data-theme="dark"] .dbchart { --bar-ok: #6366f1; --bar-danger: #ef4444; }
</style>

<div class="not-prose my-6 grid grid-cols-2 gap-3 text-center">
  <div class="rounded-xl border border-border bg-muted/40 px-4 py-3">
    <p class="text-xs text-muted-foreground">논리적 읽기</p>
    <p class="mt-1 text-lg font-bold text-foreground">189,016 <span class="text-muted-foreground font-normal">→</span> 4</p>
  </div>
  <div class="rounded-xl border border-border bg-muted/40 px-4 py-3">
    <p class="text-xs text-muted-foreground">응답 시간</p>
    <p class="mt-1 text-lg font-bold text-foreground">7,487ms <span class="text-muted-foreground font-normal">→</span> 1ms 미만</p>
  </div>
</div>

## 배경

현장에서 충전 거래 처리가 크게 지연되는 장애가 있었다. 분석 과정에서 키오스크 로그 테이블을 읽는 쿼리가 느려지는 정황이 나왔는데, "느린 것 같다"와 "왜, 얼마나 느린가"는 다른 문제다. 운영 DB를 건드릴 수는 없으니 — **테스트 환경에 운영 규모(1,300만 행)의 테스트용 데이터를 대량으로 채워 넣고(시딩), 인덱스 상태만 바꿔가며 같은 쿼리를 계측**하기로 했다. DB는 MS SQL Server 2022.

대상은 단순한 쿼리다 — 특정 키오스크의 최신 로그 1건:

```sql
SELECT * FROM kiosk_log
WHERE kiosk_seq = @kiosk_seq
ORDER BY reg_dt DESC
OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY;
```

패턴으로 보면 **등호 필터(kiosk_seq) + 정렬(reg_dt) → 최신 1건**. 이 패턴이 핵심이다.

## 테스트 설계 — 인덱스 세 가지 상태

같은 쿼리를 인덱스 상태만 바꿔 단독 계측했다. 지표는 논리적 읽기(logical reads — 쿼리가 읽은 데이터 페이지 수)와 응답 시간.

| 구분 | 인덱스 상태 | 의미 |
| --- | --- | --- |
| A | 없음 | 배포 시 인덱스 누락 = 장애 당시 상태 재현 |
| B | 단일 2개 — (kiosk_seq), (reg_dt) | 장애 후 재배포된 운영 적용본 |
| C | 복합 — (kiosk_seq, reg_dt DESC) | 제안 수정안 |

## 결과 1 — 장애의 직접 원인은 인덱스 누락

| 시나리오 | 논리적 읽기 | 응답 시간 |
| --- | --- | --- |
| A. 무인덱스 | 189,016 | 7,487 ms |
| B. 단일 | 10 | 1 ms |
| C. 복합 | 4 | 1 ms 미만 |

<figure class="dbchart not-prose my-6 rounded-xl border border-border bg-muted/40 p-4" role="img" aria-label="인덱스 상태별 응답 시간 가로 막대그래프. 무인덱스 7,487밀리초, 단일 인덱스 1밀리초, 복합 인덱스 1밀리초 미만">
  <figcaption class="text-xs font-semibold text-muted-foreground">응답 시간 (ms) · 선형 축 — 빨강 = 장애 상태 · 1ms급 값은 시각상 0에 가까운 최소 폭으로 표시</figcaption>
  <div class="mt-3 space-y-2.5">
    <div class="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-2" title="A. 무인덱스 — 7,487 ms / 189,016 읽기">
      <span class="text-xs text-foreground">A. 무인덱스</span>
      <div><div class="h-[18px] rounded-r-[4px]" style="width:100%; background:var(--bar-danger)"></div></div>
      <span class="text-xs text-muted-foreground text-right" style="font-variant-numeric: tabular-nums">7,487 ms</span>
    </div>
    <div class="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-2" title="B. 단일 인덱스 — 1 ms / 10 읽기">
      <span class="text-xs text-foreground">B. 단일</span>
      <div><div class="h-[18px] rounded-r-[4px]" style="width:2px; background:var(--bar-ok)"></div></div>
      <span class="text-xs text-muted-foreground text-right" style="font-variant-numeric: tabular-nums">1 ms</span>
    </div>
    <div class="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-2" title="C. 복합 인덱스 — 1 ms 미만 / 4 읽기">
      <span class="text-xs text-foreground">C. 복합</span>
      <div><div class="h-[18px] rounded-r-[4px]" style="width:2px; background:var(--bar-ok)"></div></div>
      <span class="text-xs text-muted-foreground text-right" style="font-variant-numeric: tabular-nums">&lt;1 ms</span>
    </div>
  </div>
</figure>

무인덱스에서는 모든 조회가 1,300만 행 풀스캔(테이블 전체 훑기)이다. **모든 키오스크 조회가 균일하게 7.5초** — 여기에 순간적으로 몰리는 동시 부하가 겹치면 커넥션 풀(미리 열어두고 돌려 쓰는 DB 연결 묶음, 최대 10개)이 일제히 고갈되어 장애로 이어진다. 인덱스만 넣으면 어느 쪽이든 한 자릿수 읽기로 떨어진다.

## 결과 2 — 단일 인덱스의 숨은 절벽

그럼 운영에 적용된 단일 인덱스(B)로 충분한가? 약점을 드러내기 위해 **worst-case(최악 조건)를 인위적으로 만들었다** — 특정 키오스크의 로그 130만 행 전체를 200일 과거로 이동시켜, 그 키오스크의 최신 로그가 다른 모든 키오스크보다 오래되게 조작(분포 쏠림).

| 시나리오 | 대상 | 논리적 읽기 | 응답 시간 |
| --- | --- | --- | --- |
| B. 단일 | 활성 키오스크 | 10 | 1 ms |
| B. 단일 | 비활성 키오스크 (극단) | **11,784,233** | **107,176 ms** |
| C. 복합 | 비활성 키오스크 (극단) | **4** | **1 ms 미만** |

<figure class="dbchart not-prose my-6 rounded-xl border border-border bg-muted/40 p-4" role="img" aria-label="같은 단일 인덱스에서 대상별 응답 시간 가로 막대그래프. 단일 인덱스 활성 키오스크 1밀리초, 단일 인덱스 극단 비활성 키오스크 107,176밀리초, 복합 인덱스 극단 비활성 키오스크 1밀리초 미만">
  <figcaption class="text-xs font-semibold text-muted-foreground">응답 시간 (ms) · 선형 축 — 위 두 막대는 같은 B(단일) 인덱스, 대상만 다름 · 빨강 = 절벽 구간 · 1ms급 값은 시각상 0에 가까운 최소 폭으로 표시</figcaption>
  <div class="mt-3 space-y-2.5">
    <div class="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-2" title="B. 단일 인덱스, 활성 키오스크 — 1 ms / 10 읽기">
      <span class="text-xs text-foreground">B 단일 (활성)</span>
      <div><div class="h-[18px] rounded-r-[4px]" style="width:2px; background:var(--bar-ok)"></div></div>
      <span class="text-xs text-muted-foreground text-right" style="font-variant-numeric: tabular-nums">1 ms</span>
    </div>
    <div class="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-2" title="B. 단일 인덱스, 비활성 키오스크(극단) — 107,176 ms / 11,784,233 읽기">
      <span class="text-xs text-foreground">B 단일 (극단)</span>
      <div><div class="h-[18px] rounded-r-[4px]" style="width:100%; background:var(--bar-danger)"></div></div>
      <span class="text-xs text-muted-foreground text-right" style="font-variant-numeric: tabular-nums">107,176 ms</span>
    </div>
    <div class="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-2" title="C. 복합 인덱스, 비활성 키오스크(극단) — 1 ms 미만 / 4 읽기">
      <span class="text-xs text-foreground">C 복합 (극단)</span>
      <div><div class="h-[18px] rounded-r-[4px]" style="width:2px; background:var(--bar-ok)"></div></div>
      <span class="text-xs text-muted-foreground text-right" style="font-variant-numeric: tabular-nums">&lt;1 ms</span>
    </div>
  </div>
</figure>

같은 인덱스인데 대상만 바꾸면 10 읽기가 1,178만 읽기로 폭증한다. 이유는 구조에 있다 — 단일 인덱스 2개는 등호 필터와 정렬이 **서로 다른 인덱스로 분리**되어, 'kiosk_seq로 거른 뒤 reg_dt로 정렬'을 하나의 인덱스가 만족하지 못한다. 복합 인덱스는 둘을 한 번에 만족해서 데이터 분포와 무관하게 4 읽기다.

```sql
-- Before: 등호와 정렬이 분리된 단일 인덱스 2개
CREATE INDEX IX_kiosk_log_kiosk_seq ON kiosk_log (kiosk_seq);
CREATE INDEX IX_kiosk_log_reg_dt   ON kiosk_log (reg_dt);

-- After: 등호 + 정렬을 한 인덱스가 함께 만족
CREATE NONCLUSTERED INDEX IX_kiosk_log_kiosk_seq_reg_dt
ON kiosk_log (kiosk_seq ASC, reg_dt DESC);
```

## 쿼리 성능 ≠ 시스템 장애 — 인과를 분리해서 보고

숫자만 보면 "107초가 제일 심각하네"가 되기 쉽다. 하지만 **쿼리 1건의 성능과 시스템 장애는 다른 층위다.** 보고서에서 이 인과를 분리했다:

| 상태 | 쿼리 거동 | 시스템 결과 |
| --- | --- | --- |
| A. 무인덱스 | **모든** 조회가 균일하게 7.5초 | 부하 시 느린 쿼리가 일제히 쌓여 풀 고갈 → **장애 발생 (= 실제 장애)** |
| B. 단일 | 대부분(활성) 1ms, 극단 케이스만 느림 | 풀이 마르지 않음 → 장애 재발 없음, 간헐적 느림만 |
| C. 복합 | 분포 무관 전건 빠름 | 간헐적 느림까지 제거 |

**시스템 장애 위험은 A가 가장 크다** — 전건이 균일하게 느려서 부하가 오면 반드시 풀이 고갈된다. B의 107초는 최악 구간을 보여주는 것이지 B가 A보다 위험하다는 뜻이 아니다. 실제 운영에서도 단일 인덱스 재배포 후 '장애'는 '간헐적 느림'으로 완화되었다.

## 범위와 한계 — 증명 안 한 것도 보고서에 쓴다

이 테스트가 증명한 건 "대상 쿼리 1개의 인덱스·분포별 성능"까지다. 보고서에 **증명하지 않은 것**을 명시했다:

- 동시 부하에서의 커넥션 풀(구현체는 HikariPool) 고갈 직접 재현 — 미수행. 풀 고갈로 이어지는 '느린 쿼리' 측면만 증명
- 장애 분석이 지목한 별도의 무필터 집계 쿼리 — 본 테스트 대상 아님. 그 쿼리의 지연(약 100초)과 이 테스트의 107초는 **자릿수만 유사할 뿐 다른 현상**
- 애플리케이션 경유 엔드투엔드(HTTP) 경로 — 미측정

이 구분이 없으면 "107초 재현했다 = 그 장애를 재현했다"로 읽힌다. 숫자가 우연히 비슷할 때일수록 경계를 그어야 한다.

## 핵심 교훈

> QA의 언어는 "느린 것 같다"가 아니라 재현 가능한 숫자다 — 그리고 숫자만큼 중요한 게, 그 숫자가 증명하지 않는 것의 목록이다.

- **등호 + 정렬 패턴은 복합 인덱스 하나로** — 단일 인덱스 2개는 각각 멀쩡해 보여도 조합 조건을 만족하지 못한다.
- **worst-case는 기다리지 말고 만들어라** — 평상시 계측만으로는 단일 인덱스의 절벽이 안 보인다. 분포를 인위적으로 쏠리게 해야 드러난다.
- **재현 스크립트를 산출물로 남겨라** — 시딩·인덱스 비교·쏠림 재현 SQL을 첨부해, 누구든 같은 테스트를 다시 돌릴 수 있게 했다.
