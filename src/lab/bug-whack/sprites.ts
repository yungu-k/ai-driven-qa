// 캐릭터 그림 — 16×16 픽셀(Dean 10-27: 게임 안 캐릭터도 픽셀로). 실험실 목록 아이콘과 같은 결.
// 색만이 아니라 **모양**으로도 갈린다(동그란 몸 = 버그, 별 = 기능) — 색을 못 갈라도 놀 수 있게.
// 그림은 글자 격자로 적는다: 한 글자 = 한 칸, "." = 빈칸, 나머지는 팔레트의 색.

type Palette = Record<string, string>;

function pixelArt(rows: string[], pal: Palette, extra = ""): string {
  let rects = "";
  rows.forEach((row, y) => {
    // 같은 색이 이어지면 한 rect 로 묶는다(칸 수만큼 rect 를 만들지 않게)
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let w = 1;
      while (x + w < row.length && row[x + w] === c) w++;
      if (c !== "." && pal[c]) rects += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${pal[c]}"/>`;
      x += w;
    }
  });
  return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${rects}${extra}</svg>`;
}

// 버그: 더듬이 · 둥근 몸 · 큰 눈 · 볼터치 · 다리 6개
const BUG = [
  "....c......c....",
  ".....d....d.....",
  ".....gggggg.....",
  "....gggggggg....",
  "...gggggggggg...",
  "..dgwwggggwwgd..",
  ".ddgwkggggwkgdd.",
  "...gggggggggg...",
  "...pggkggkggp...",
  "..dgggkkkkgggd..",
  ".ddggggggggggdd.",
  "...ssssssssss...",
  "....ssssssss....",
  "...d..d..d..d...",
  "................",
  "................",
];

// 황금 버그: 같은 몸에 왕관 · 반짝이
const GOLD = [
  "....o.o..o.o..*.",
  "....oooooooo.*w*",
  ".....yyyyyy...*.",
  "....yyyyyyyy....",
  "...yyyyyyyyyy...",
  "..dywwyyyywwyd..",
  ".ddywkyyyywkydd.",
  "...yyyyyyyyyy...",
  "...pyykyykyyp...",
  "..dyyykkkkyyyd..",
  ".ddyyyyyyyyyydd.",
  "...ssssssssss...",
  "....ssssssss....",
  "...d..d..d..d...",
  "................",
  "................",
];

// 기능: 별 + 「기능」 이름표. 건드리면 안 되는 것 — 버그와 모양이 확 다르다
const FEATURE = [
  ".......vv.......",
  ".......vv.......",
  "......vvvv......",
  ".vvvvvvvvvvvvvv.",
  "..vvvwvvvvwvvv..",
  "...vvkvvvvkvvv..",
  "....vvvvvvvvv...",
  "....vvvnnvvvv...",
  "...vvvvvvvvvvv..",
  "...vvvv..vvvvv..",
  "..vvv......vvv..",
  "..vv........vv..",
  "................",
  "..nnnnnnnnnnnn..",
  "..nnnnnnnnnnnn..",
  "..nnnnnnnnnnnn..",
];

export const SPRITES = {
  bug: pixelArt(BUG, {
    c: "#3ee8ff",
    d: "#2f7a46",
    g: "#5dff8a",
    s: "#2fbf5f",
    w: "#ffffff",
    k: "#0a0a14",
    p: "#ff8fab",
  }),
  gold: pixelArt(GOLD, {
    o: "#ffb800",
    "*": "#fff3b0",
    w: "#ffffff",
    d: "#b8860b",
    y: "#ffd23f",
    s: "#e0a800",
    k: "#0a0a14",
    p: "#ff8fab",
  }),
  feature: pixelArt(
    FEATURE,
    // 눈은 흰자+검은 눈동자, 입은 진보라 — 검은 칸만 쓰면 어두운 판에서 구멍처럼 보인다(10-27 QA)
    { v: "#b39dff", w: "#ffffff", k: "#0a0a14", n: "#5b45c9" },
    `<text x="8" y="15.4" text-anchor="middle" font-size="3.4" font-weight="700" fill="#fff"
       font-family="LabPixel, Pretendard Variable, sans-serif">기능</text>`
  ),
} as const;
