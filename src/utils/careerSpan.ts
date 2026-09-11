import { CAREER } from "@/data/career";

/** 경력 길이 — **한 곳에서 계산한다.**
 *
 * 🔴 종전엔 「8년 5개월」이 **세 자리에 글자로 박혀** 있었다. 「9년차」는 연 단위라
 * 1년을 버텼는데 **「8년 5개월」은 한 달마다 낡는다** — 정밀해진 대가로 **수명이 12배
 * 짧아졌고**, 갱신할 자리가 셋이라 **한 곳만 고쳐지는 날**이 온다(QA 지적).
 *
 * 🔴 **그리고 구간도 여기서 만들지 않는다.** 종전엔 이 파일이 구간 배열을 **따로** 들고
 * 있었다 — `career.ts` 의 `period` 와 값이 같았지만 **이력이 바뀌면 한쪽만 고쳐진다.**
 * ⇒ **정본(`career.ts`)에서 읽는다.** 화면과 수가 어긋날 자리를 없앤다.
 *
 * ⚠ **경계에 함정이 둘 있다. 둘 다 실측으로 나왔다.**
 *  ① **닫힌 구간이라 이어지는 두 역할이 경계 달을 두 번 센다** —
 *    넷마블 `2020.08~2023.01` 과 `2023.01~2024.04` 는 2023.01 이 양쪽에 있다.
 *    단순합 46 · **합집합 45.** ⇒ **월 집합의 합집합**으로 센다.
 *  ② 🔴 **「기간이 적혀 있다」가 「경력이다」가 아니다** — 휴식기도 기간을 갖는다.
 *    ⇒ `isBreak` **표식**으로 가른다. **이름으로 가르면 이름이 바뀌는 날 조용히 섞인다.**
 */
const idx = (ym: string) => {
  const [y, m] = ym.trim().split(".").map(Number);
  return y * 12 + (m - 1);
};

/** 정본에서 **경력 구간만** 뽑는다. `period` 는 `"2020.08 ~ 2023.01"` · `"2025.07 ~ 현재"`. */
export function careerSpans(): { from: string; to: string | null }[] {
  const out: { from: string; to: string | null }[] = [];
  for (const c of CAREER as any[]) {
    if (c.isBreak) continue;                       // 표식으로 가른다
    for (const r of c.roles ?? []) {
      const [a, b] = String(r.period).split("~").map((x: string) => x.trim());
      if (!a) continue;
      out.push({ from: a, to: b && /^\d{4}\.\d{2}$/.test(b) ? b : null });
    }
  }
  return out;
}

/** 경력 개월 수. `now` 를 받는 이유: **검사가 「한 달 뒤」를 재려면 시계를 넣을 수 있어야** 한다. */
export function careerMonths(now: Date = new Date()): number {
  const cur = now.getFullYear() * 12 + now.getMonth();
  const months = new Set<number>();
  for (const s of careerSpans()) {
    const a = idx(s.from);
    const b = s.to ? idx(s.to) : cur;     // 끝 달 포함 · 현재 달 포함
    for (let i = a; i <= b; i++) months.add(i);
  }
  return months.size;
}

/** 「8년 5개월」. 개월이 0이면 「년」만 쓴다 — 「8년 0개월」은 사람이 안 쓰는 말이다. */
export function careerLabel(now: Date = new Date()): string {
  const n = careerMonths(now);
  const y = Math.floor(n / 12), m = n % 12;
  return m ? `${y}년 ${m}개월` : `${y}년`;
}
