// @ts-nocheck — 디자인 세션 정본 docs/lab-home-zone1.js(ae46342b)를 그대로 옮긴 것(tmp/lab-home/sync-src.sh). 고칠 땐 정본부터.
// 「코코의 집으로」 맛보기 구역 1 「길 잃은 동네」 — 맵 자료만(규칙은 docs/lab-home.js). 규격 docs/lab-home-spec.md 3절.
// 1-1 카페 골목(배우기) → 1-2 시장 상가 → 1-3 하천 산책로 → 보스 「다리 밑 공터」(로봇 청소기 대왕).
// 칸 좌표: solids [x, y, w, h] · semis [x, y, w] · movers { x, y, w, ax, ay, hz, phase } · spawners { kind, x, y, dir, every, max, near, first }
// 🔴 하트는 스테이지당 하나, 뼈다귀는 보통 스테이지 3(보스 판 0). 밟은 뒤 착지 자리를 구멍 앞에 둔다(시험 판에서 배움). 리그 tmp/lab-home/zone-sim.cjs 가 센다.
import * as H from "./engine.ts";
  const G = (x0, x1) => [x0, -6, x1 - x0, 6]; // 땅(윗면 0)
  const S = (x, y, w) => ({ kind: "snack", x, y: y == null ? 0.4 : y });
  const row = (x0, n, y, step) => Array.from({ length: n }, (_, i) => S(x0 + i * (step || 1), y));

  H.addLevel({
    id: "1-1", name: "카페 골목", theme: "cafe", w: 122, next: "1-2",
    story: "애견카페 문이 열린 틈에 나와 버렸어요. 여기가 어디지?",
    spawn: [2, 0], cp: [60, 0], goal: 118,
    solids: [
      G(-2, 24), [12, 0, 2, 1], [17, 0, 2, 2], [20, 0, 2, 3.4], // 화분 · 상자 · 쌓은 상자(위에 뼈다귀)
      G(27, 52), [42, 0.6, 4, 5.4], // 구멍 3 · 테라스 울타리 밑 낮은 틈
      G(55, 72), G(76, 100), G(104, 124), // 구멍 3 · 구멍 4(가운데 거품) · 구멍 4(멀리 뛰기)
      [-3, -6, 1, 16], [122, -6, 2, 16],
    ],
    semis: [[48, 2.6, 3], [83, 2.6, 4], [89, 4.8, 3]], // 카페 차양 · 꽃집 차양 · 그 위 창턱
    enemies: [
      { kind: "brush", x: 34, y: 0, x0: 31, x1: 37 }, { kind: "brush", x: 62, y: 0, x0: 58, x1: 67 },
      { kind: "bubble", x: 74, y: 1.8 }, { kind: "brush", x: 82, y: 0, x0: 79, x1: 86 }, { kind: "brush", x: 93, y: 0, x0: 90, x1: 97 },
      { kind: "bubble", x: 110, y: 1.6 },
    ],
    picks: [
      { kind: "heart", x: 85, y: 3.3 },
      { kind: "bone", x: 21, y: 4.0 }, { kind: "bone", x: -1.5, y: 0.4 }, { kind: "bone", x: 90.5, y: 5.5 },
      ...row(6, 3), ...row(43, 3, 0.25), S(74, 3.4), ...row(105, 4), S(112, 2.6), S(49.5, 3.2), S(29, 0.4), S(30, 0.4),
    ],
    signs: [
      { id: "run", x: 2.5, text: "◀ ▶ 로 달려요" },
      { id: "jump", x: 9, text: "점프! 길게 누르면 더 높이" },
      { id: "stomp", x: 28, text: "칫솔은 위에서 밟아요" },
      { id: "scoot", x: 38, text: "땅에서 기술 — 똥꼬 스키로 낮은 틈 지나기" },
      { id: "spin", x: 66, text: "공중에서 기술 — 뱅글뱅글로 거품 터뜨리기" },
      { id: "far", x: 96, text: "멀리 뛸 땐 달리면서 길게" },
    ],
  });

  H.addLevel({
    id: "1-2", name: "시장 상가", theme: "market", w: 142, next: "1-3",
    story: "고소한 냄새를 따라왔더니 시장이에요. 상자가 굴러와요!",
    spawn: [2, 0], cp: [70, 0], goal: 138,
    solids: [
      G(-2, 30), [9, 0, 3, 1.2], // 좌판
      G(33, 56), [50, 0, 2, 1], [52, 0, 2, 2], [54, 0, 2, 3], // 구멍 3 · 쌓은 상자 계단
      G(66, 100), [88, 0.6, 3, 5.4], // 구멍 10(차양 둘을 디딤) · 반쯤 내린 셔터
      G(104, 144), [118, 0, 2, 1.5], // 구멍 4 · 과일 상자 더미
      [-3, -6, 1, 16], [142, -6, 2, 16],
    ],
    semis: [[7, 2.6, 4], [13, 3.4, 3], [59, 2.4, 2], [63, 3.2, 2], [76, 2.6, 3], [80, 4.6, 3], [124, 2.6, 4]],
    enemies: [
      { kind: "yapper", x: 44, y: 0 }, { kind: "brush", x: 73, y: 0, x0: 70, x1: 76 },
      { kind: "yapper", x: 112, y: 0 }, { kind: "bubble", x: 128, y: 2.2 }, { kind: "brush", x: 133, y: 0, x0: 130, x1: 136 },
    ],
    spawners: [{ kind: "crate", x: 29, y: 0, dir: -1, every: 2.6, max: 3, near: 18 }, { kind: "crate", x: 99, y: 0, dir: -1, every: 2.2, max: 3, near: 18, first: 1.2 }],
    picks: [
      { kind: "heart", x: 81.5, y: 5.3 },
      { kind: "bone", x: 14.5, y: 3.9 }, { kind: "bone", x: 89.5, y: 0.25 }, { kind: "bone", x: 128, y: 3.5 },
      ...row(3, 3), S(8.5, 3.1), S(10.5, 3.1), ...row(34, 4), S(55, 3.6), S(61, 3.6), S(64, 4.2), ...row(89, 2, 0.25, 1.5), ...row(106, 4), S(125.5, 3.2), S(127, 3.2),
    ],
    signs: [
      { id: "crate", x: 14, text: "굴러오는 상자는 밟거나 뛰어넘어요" },
      { id: "bark", x: 36, text: "멍멍 소리는 똥꼬 스키로 밑을 지나요" },
    ],
  });

  H.addLevel({
    id: "1-3", name: "하천 산책로", theme: "river", water: true, w: 152, next: "1-boss",
    story: "물 냄새… 산책하던 길 같아요! 자전거 조심!",
    spawn: [2, 0], cp: [58, 0], goal: 148,
    solids: [
      G(-2, 20), [22.5, -6, 1.5, 6], [26, -6, 1.5, 6], [29.5, -6, 1.5, 6], // 징검다리
      G(33, 62), [44, 0.6, 4, 5.4], // 다리 밑 배수관(스키)
      G(80, 112), [114.5, -6, 1.5, 6], [118, -6, 1.5, 6], [121.5, -6, 1.5, 6], G(124, 154),
      [-3, -6, 1, 16], [152, -6, 2, 16],
    ],
    movers: [ // 물에 뜬 나무판: 위아래 · 좌우 · 위아래(박자 어긋나게)
      { x: 64, y: 0, w: 2.5, ay: 1.0, hz: 0.3 }, { x: 68.5, y: 0.5, w: 2.5, ax: 1.8, hz: 0.25 }, { x: 75, y: 0, w: 2.5, ay: 1.2, hz: 0.35, phase: 1.5 },
    ],
    semis: [[86, 2.6, 3], [90, 4.6, 3], [132, 3, 2]],
    enemies: [
      { kind: "bike", x: 17, y: 0 }, { kind: "bubble", x: 27.75, y: 1.9 },
      { kind: "minivac", x: 39, y: 0, x0: 35, x1: 42 }, { kind: "minivac", x: 54, y: 0, x0: 50, x1: 58 },
      { kind: "minivac", x: 85, y: 0, x0: 82, x1: 88 }, { kind: "yapper", x: 98, y: 0 }, { kind: "bike", x: 110, y: 0 },
      { kind: "bubble", x: 118.75, y: 2.0 }, { kind: "minivac", x: 131, y: 0, x0: 128, x1: 134 }, { kind: "bike", x: 145, y: 0 },
    ],
    picks: [
      { kind: "heart", x: 91.5, y: 5.3 },
      { kind: "bone", x: 46, y: 0.25 }, { kind: "bone", x: 70, y: 2.6 }, { kind: "bone", x: 133, y: 3.7 },
      ...row(5, 3), S(23.25, 1), S(26.75, 1), S(30.25, 1), ...row(45, 2, 0.25, 2), S(65.25, 2.4), S(76.25, 2.6), ...row(100, 3), ...row(126, 3), ...row(138, 3),
    ],
    signs: [
      { id: "bike", x: 3, text: "따릉! 소리가 나면 뛰어넘어요" },
      { id: "mover", x: 59, text: "출렁이는 나무판은 박자를 봐요" },
    ],
  });

  H.addLevel({
    id: "1-boss", name: "다리 밑 공터", theme: "boss", w: 30, boss: true,
    story: "윙— 커다란 소리! 꼬마 청소기들의 대왕이에요.",
    spawn: [3, 0], cp: [3, 0],
    solids: [G(-2, 30), [-3, -6, 1, 16], [29, -6, 2, 16]],
    semis: [[4, 2.6, 4], [21, 2.6, 4], [12, 4.4, 4]],
    enemies: [{ kind: "vacuum_king", x: 22, y: 0, arena: [-2, 29] }],
    picks: [{ kind: "heart", x: 14, y: 5.1 }, S(6, 3.2), S(23, 3.2), S(13, 5.1), S(15, 5.1)],
    signs: [{ id: "boss", x: 0, text: "벽에 부딪혀 어지러울 때 위에서 밟아요" }],
  });

  H.ZONES[0].stages = ["1-1", "1-2", "1-3", "1-boss"];
