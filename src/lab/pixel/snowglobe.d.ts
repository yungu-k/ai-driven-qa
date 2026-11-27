// src/lab/pixel/snowglobe.js 의 타입 — 그 파일은 design 시안 docs/lab-pixel-snowglobe.js 를 글자 그대로 복사한 것이라(md5 같음)
// TS 로 다시 쓰지 않고 여기서 계약(docs/lab-pixel-brief.md 「작품 모듈 계약」)만 적는다.
/** 작품 페이지 첫 페인트 색(방 벽 위쪽) — src/lab/pixel/arts.ts 의 paint 와 같아야 한다(tests/lab/lab-hub.test.ts) */
export const paint: string;
export function mount(
  host: HTMLElement,
  opts?: { mode?: "loop" | "intro"; reduce?: boolean; onIntroEnd?: () => void }
): {
  stop(): void;
  setQuiet(on: boolean): void;
  /** 검사용(계약 밖) */
  _probe(): Record<string, unknown>;
  /** 검사용(계약 밖) */
  _shake(k?: number): void;
};
