// src/lab/pixel/coco.js 의 타입 — design 시안 docs/lab-pixel-coco.js 를 글자 그대로 복사한 것(검사가 맞댄다). 계약: docs/lab-pixel-brief.md
/** 작품 페이지 첫 페인트 색(흐린 하늘) — src/lab/pixel/arts.ts 의 paint 와 같아야 한다 */
export const paint: string;
/** 미리 구운 아틀라스 배율(public/lab/pixel/coco/coco-0NN.png·.json). 그림 정본은 코드 — 고치면 tmp/lab-pixel/coco-bake.cjs 로 다시 굽는다 */
export const SETS: number[];
/** cols 없으면 밀도 ③(데스크톱 1280 / 폰 585) — 코코는 처음부터 고해상도 도트 */
export function mount(
  host: HTMLElement,
  opts?: { mode?: "loop" | "intro"; reduce?: boolean; onIntroEnd?: () => void; cols?: number; /** 기본 /lab/pixel/coco/ */ atlasBase?: string }
): { stop(): void; setQuiet(on: boolean): void };
