// 릴리스 디펜스 — 엔진(순수 로직). 규격 docs/lab-defense-spec.md 의 수치표가 그대로 DATA 다.
// 시안 엔진 docs/lab-defense-engine.js 를 그대로 옮긴 판이다(14절). 동작은 한 줄도 바꾸지 않고 타입만 붙였다 —
// 같은 시드·같은 입력이면 두 엔진의 상태·사건이 같아야 한다(tmp/lab-defense/equiv.mjs 가 잰다).
// 그리기·소리는 g.events 를 읽고 비우는 쪽 몫이다.

// ── 타입 ────────────────────────────────────────────────
export type Grade = "trivial" | "minor" | "major" | "critical" | "blocker";
export type TraitKind = "fast" | "tough" | "stealth" | "regen" | "flaky";
export type TowerKind = "unit" | "lint" | "integ" | "review" | "monitor" | "ci";
export type Branch = "a" | "b";
export type ItemKind = "palm" | "slipper" | "swatter" | "paper" | "hammer" | "spray" | "trap" | "flamer" | "vacuum";
export type ItemTier = "low" | "mid" | "high" | "top";
export type LegendKind = "exterminator" | "bugbomb" | "bigslipper";
export type TargetMode = "first" | "strong" | "close";
export type Pt = [number, number];

export type GradeDef = {
  hp: number;
  speed: number;
  armor: number;
  reward: number;
  leak: number;
  body: number;
  split?: { grade: Grade; n: number };
};
export type TraitDef = { speedMul?: number; hpMul?: number; armorAdd?: number; regen?: number; dodge?: number };
/** 한 단계의 수치. 검사마다 쓰는 칸이 다르다 */
export type TowerLevel = {
  cost?: number;
  name?: string;
  dmg?: number;
  period?: number;
  range?: number;
  dps?: number;
  slow?: number;
  vuln?: number;
  splash?: number;
  multi?: number;
  ramp?: { to: number; over: number };
  pierceArmor?: boolean;
  bigMul?: number;
  line?: number;
  mark?: number;
  steady?: boolean;
  haste?: number;
  rangeAdd?: number;
};
export type TowerDef = {
  name: string;
  role: string;
  cost: number;
  lv: [TowerLevel, TowerLevel, TowerLevel];
  br: Record<Branch, TowerLevel>;
};
export type MapDef = {
  id: "dev" | "staging" | "prod" | "warroom" | "release";
  name: string;
  hpMul: number;
  start: number;
  boss?: boolean;
  towers: TowerKind[];
  lanes: Pt[][];
  deco: Pt[];
};
/** [등급, 마릿수, 간격(초), 성질[], 길 번호] */
export type WaveGroup = [Grade, number, number, TraitKind[]?, number?];
export type BossPhase = {
  at: number;
  name: string;
  shield?: number;
  shieldRegen?: number;
  every?: number;
  spawn?: [Grade, number][];
  warn?: number;
  disable?: number;
  reach?: number;
  speedMul?: number;
};
export type ItemDef = {
  tier: ItemTier;
  name: string;
  r?: number;
  dmg?: number;
  dps?: number;
  dur?: number;
  slow?: number;
  stun?: number;
  row?: boolean;
  suck?: Grade;
  strip?: boolean;
  coin: number;
};
export type Legend = { kind: LegendKind; lv: number };

export type Lane = {
  segs: { x0: number; y0: number; x1: number; y1: number; len: number; at: number }[];
  total: number;
};

export type Tower = {
  id: number;
  kind: TowerKind;
  x: number;
  y: number;
  level: number;
  branch: Branch | null;
  cd: number;
  target: null;
  mode: TargetMode;
  disabled: number;
  ramp: number;
  rampTarget: number | null;
  /** 살충 폭탄 탄두가 세는 발 수(전설이 있을 때만 생긴다) */
  shots?: number;
};

export type Enemy = {
  id: number;
  grade: Grade;
  traits: TraitKind[];
  lane: number;
  dist: number;
  hp: number;
  maxHp: number;
  speed: number;
  armor: number;
  regen: number;
  dodge: number;
  stealth: boolean;
  slow: number;
  mark: number;
  vuln: number;
  flash: number;
  x: number;
  y: number;
  dead: boolean;
  seen?: boolean;
  steady?: boolean;
  stun?: number;
  leaked?: boolean;
  // 보스(blocker)만
  phase?: number;
  shield?: number;
  stagger?: number;
  timer?: number;
  warn?: number;
  warnTower?: Tower | null;
};

export type Zone = { kind: ItemKind | "bugbomb"; x: number; y: number; r: number; life: number; max: number; dps: number; slow: number };

export type Fx =
  | { k: "tracer"; x0: number; y0: number; x1: number; y1: number; life: number; c: "unit" }
  | {
      k: "shell";
      x0: number;
      y0: number;
      x1: number;
      y1: number;
      life: number;
      max: number;
      dmg: number;
      splash: number;
      live: boolean;
      t: Tower;
    }
  | { k: "beam"; x0: number; y0: number; x1: number; y1: number; life: number; c: "review" }
  | { k: "boom"; x: number; y: number; r: number; life: number; max: number };

export type GameEvent =
  | { e: "build"; t: Tower }
  | { e: "upgrade"; t: Tower }
  | { e: "sell"; t: Tower; back: number }
  | { e: "wave"; n: number }
  | { e: "early"; bonus: number }
  | { e: "spawn"; en: Enemy }
  | { e: "hit"; en: Enemy; d: number }
  | { e: "shield"; en: Enemy }
  | { e: "dodge"; en: Enemy }
  | { e: "kill"; en: Enemy; reward: number }
  | { e: "drop"; kind: ItemKind; x: number; y: number }
  | { e: "dropCoin"; kind: ItemKind; coin: number; x: number; y: number }
  | { e: "item"; kind: ItemKind; x: number; y: number }
  | { e: "legendDrop"; kind: LegendKind; x: number; y: number }
  | { e: "slipper"; x: number; y: number }
  | { e: "bombProc"; x: number; y: number }
  | { e: "shot"; t: Tower }
  | { e: "snipe"; t: Tower }
  | { e: "boom" }
  | { e: "leak"; en: Enemy; loss: number }
  | { e: "phase"; en: Enemy; phase: number; name: string }
  | { e: "warn"; en: Enemy; tower: Tower | null | undefined; kind: string }
  | { e: "rollback"; t: Tower }
  | { e: "cleared"; n: number; bonus: number }
  | { e: "won"; stars: number }
  | { e: "lost" };

export type GameState = "prep" | "wave" | "won" | "lost";

export type Game = {
  map: MapDef;
  mapIndex: number;
  lap: number;
  legends: Legend[];
  slipperT: number;
  time: number;
  money: number;
  gate: number;
  wave: number;
  waves: WaveGroup[][];
  state: GameState;
  /** 다음 웨이브까지 남은 초. 첫 웨이브 전엔 null(플레이어가 부를 때까지) */
  prepLeft: number | null;
  towers: Tower[];
  enemies: Enemy[];
  fx: Fx[];
  zones: Zone[];
  items: ItemKind[];
  events: GameEvent[];
  nextId: number;
  lanes: Lane[];
  slots: Pt[];
  spawnQ: { at: number; grade: Grade; traits: TraitKind[]; lane: number }[];
  rand: () => number;
  leaked: Record<Grade, number>;
  kills: number;
  builtThisPrep: Set<number>;
  /** 보스가 떨군 전설(바퀴 끝에 addLegend 로 목록에 더한다) */
  legendDrop?: LegendKind;
  /** 시뮬용: 아이템 드랍을 끈다 */
  noItems?: boolean;
};

export type RunOpts = { lap?: number; legends?: (LegendKind | Legend)[] };

type DamageOpts = { area?: boolean; pierceArmor?: boolean; item?: boolean; tick?: boolean; bigMul?: number };

// ── 수치표 ──────────────────────────────────────────────
// 거리 단위 = 타일, 시간 = 초. 속도는 타일/초.
const GRADES: Record<Grade, GradeDef> = {
  trivial: { hp: 14, speed: 1.25, armor: 0, reward: 2, leak: 1, body: 8 },
  minor: { hp: 45, speed: 1.0, armor: 0, reward: 4, leak: 3, body: 10 },
  major: { hp: 170, speed: 0.75, armor: 3, reward: 11, leak: 8, body: 12 },
  critical: { hp: 560, speed: 0.6, armor: 2, reward: 30, leak: 20, body: 16, split: { grade: "minor", n: 2 } },
  blocker: { hp: 3600, speed: 0.3, armor: 2, reward: 0, leak: 999, body: 28 },
};
// 성질: 등급과 다른 축. hpMul 로 성질이 붙은 만큼 체력을 덜어 낸다.
const TRAITS: Record<TraitKind, TraitDef> = {
  fast: { speedMul: 1.6, hpMul: 0.7 },
  tough: { armorAdd: 4, hpMul: 0.8 },
  stealth: { hpMul: 0.9 }, // 모니터링 범위 밖에선 겨눌 수 없다(범위 공격은 맞는다)
  regen: { regen: 0.04, hpMul: 0.85 }, // 최대 체력의 4 %/초
  flaky: { dodge: 0.3, hpMul: 0.9 }, // 맞을 때 30 % 로 빗나감(모니터링 B 범위 안에선 0)
};

// 타워: lv[0] 이 지을 때, lv[1]·lv[2] 업그레이드, br.a / br.b 가 4단계 갈래. cost 는 그 단계에 내는 값.
const TOWERS: Record<TowerKind, TowerDef> = {
  unit: {
    name: "단위 테스트", role: "단일·연사", cost: 50,
    lv: [
      { dmg: 5, period: 0.42, range: 2.0 },
      { cost: 40, dmg: 7, period: 0.4, range: 2.0 },
      { cost: 70, dmg: 10, period: 0.36, range: 2.2 },
    ],
    br: {
      a: { cost: 120, name: "커버리지", dmg: 11, period: 0.36, range: 2.2, multi: 2 },
      b: { cost: 120, name: "회귀 테스트", dmg: 12, period: 0.36, range: 2.2, ramp: { to: 0.15, over: 2.0 } },
    },
  },
  lint: {
    name: "린터", role: "감속", cost: 60,
    lv: [
      { dps: 2, slow: 0.35, range: 1.6 },
      { cost: 45, dps: 3, slow: 0.42, range: 1.8 },
      { cost: 75, dps: 4, slow: 0.48, range: 2.0 },
    ],
    br: {
      a: { cost: 130, name: "엄격 모드", dps: 5, slow: 0.62, range: 2.0 },
      b: { cost: 130, name: "자동 수정", dps: 5, slow: 0.48, range: 2.2, vuln: 0.3 },
    },
  },
  integ: {
    name: "통합 테스트", role: "범위", cost: 90,
    lv: [
      { dmg: 12, period: 1.4, range: 2.2, splash: 0.9 },
      { cost: 65, dmg: 18, period: 1.35, range: 2.2, splash: 0.95 },
      { cost: 105, dmg: 27, period: 1.3, range: 2.4, splash: 1.0 },
    ],
    br: {
      a: { cost: 190, name: "병렬 실행", dmg: 26, period: 0.75, range: 2.4, splash: 0.85 },
      b: { cost: 190, name: "전체 회귀", dmg: 34, period: 1.3, range: 2.6, splash: 1.6 },
    },
  },
  review: {
    name: "코드 리뷰", role: "저격·관통", cost: 120,
    lv: [
      { dmg: 50, period: 2.0, range: 4.0, pierceArmor: true },
      { cost: 85, dmg: 80, period: 1.9, range: 4.2, pierceArmor: true },
      { cost: 135, dmg: 120, period: 1.8, range: 4.6, pierceArmor: true },
    ],
    br: {
      a: { cost: 240, name: "깐깐한 리뷰", dmg: 140, period: 1.8, range: 4.6, pierceArmor: true, bigMul: 2.5 },
      b: { cost: 240, name: "페어 리뷰", dmg: 130, period: 1.8, range: 4.6, pierceArmor: true, line: 3 },
    },
  },
  monitor: {
    name: "모니터링", role: "탐지·약화", cost: 70,
    lv: [
      { range: 2.5, mark: 0.15 },
      { cost: 50, range: 3.0, mark: 0.2 },
      { cost: 80, range: 3.3, mark: 0.25 },
    ],
    br: {
      a: { cost: 150, name: "알림", range: 3.3, mark: 0.45 },
      b: { cost: 150, name: "대시보드", range: 4.5, mark: 0.25, steady: true },
    },
  },
  ci: {
    name: "CI 파이프라인", role: "지원", cost: 100,
    lv: [
      { range: 1.5, haste: 0.2 },
      { cost: 70, range: 1.5, haste: 0.27 },
      { cost: 110, range: 1.8, haste: 0.34 },
    ],
    br: {
      a: { cost: 200, name: "캐시", range: 1.8, haste: 0.5 },
      b: { cost: 200, name: "병렬 러너", range: 1.8, haste: 0.34, rangeAdd: 0.6 },
    },
  },
};

const ECON = {
  sellRefund: 0.7, // 판 값의 70 %. 같은 준비 시간에 지은 걸 바로 팔면 100 %(실수 되돌리기)
  waveBonus: (w: number) => 12 + 3 * w, // w = 1부터
  earlyPerSec: 1, // 다음 웨이브를 일찍 부르면 남은 초 × 1
  prepSec: 15, // 웨이브 사이 준비 시간(첫 웨이브는 플레이어가 부를 때까지)
  gateHp: 100,
};

// 맵: 9 × 12 타일, 길은 꺾이는 점(타일 중심) 목록. 화면 밖 점(-1·12·9)에서 들어와 게이트로 나간다.
// 배치 칸은 길과 8방향으로 닿는 빈 칸 중 deco 를 뺀 것(엔진이 계산).
const MAPS: MapDef[] = [
  {
    id: "dev", name: "개발 서버", hpMul: 1.0, start: 160,
    towers: ["unit", "lint", "integ"],
    lanes: [[[1, -1], [1, 2], [7, 2], [7, 5], [1, 5], [1, 8], [7, 8], [7, 10], [4, 10], [4, 12]]],
    deco: [[0, 0], [8, 0], [8, 11], [0, 11]],
  },
  {
    id: "staging", name: "스테이징", hpMul: 1.3, start: 300,
    towers: ["unit", "lint", "integ", "review"],
    lanes: [
      [[0, -1], [0, 3], [4, 3], [4, 6], [1, 6], [1, 9], [7, 9], [7, 12]],
      [[8, -1], [8, 3], [4, 3], [4, 6], [1, 6], [1, 9], [7, 9], [7, 12]],
    ],
    deco: [],
  },
  {
    id: "prod", name: "운영 데이터센터", hpMul: 1.25, start: 520,
    towers: ["unit", "lint", "integ", "review", "monitor"],
    lanes: [
      [[1, -1], [1, 4], [3, 4], [3, 8], [1, 8], [1, 10], [4, 10], [4, 12]],
      [[7, -1], [7, 4], [5, 4], [5, 8], [7, 8], [7, 10], [4, 10], [4, 12]],
    ],
    deco: [],
  },
  {
    id: "warroom", name: "장애 대응실", hpMul: 1.6, start: 600,
    towers: ["unit", "lint", "integ", "review", "monitor", "ci"],
    lanes: [[[-1, 1], [6, 1], [6, 9], [2, 9], [2, 5], [9, 5]]],
    deco: [],
  },
  {
    id: "release", name: "릴리스 게이트", hpMul: 1.45, start: 600, boss: true,
    towers: ["unit", "lint", "integ", "review", "monitor", "ci"],
    lanes: [[[4, -1], [4, 1], [1, 1], [1, 10], [7, 10], [7, 3], [3, 3], [3, 8], [5, 8], [5, 5]]],
    deco: [[5, 4], [4, 5], [6, 5]], // 가운데 큰 게이트(탑 + 기둥 둘) 자리
  },
];

// 웨이브: [등급, 마릿수, 간격(초), 성질[], 길 번호(없으면 번갈아)]. 그룹은 차례로 나온다(앞 그룹 끝나고 0.8 초 뒤).
const T = "trivial", MI = "minor", MA = "major", C = "critical";
const WAVES: Record<MapDef["id"], WaveGroup[][]> = {
  dev: [
    [[T, 8, 0.7]],
    [[T, 10, 0.55], [MI, 3, 1.2]],
    [[MI, 7, 0.9]],
    [[T, 16, 0.35], [MI, 4, 1.0]],
    [[MA, 2, 2.5], [T, 10, 0.4]],
    [[MI, 10, 0.6], [MA, 2, 2.0]],
    [[T, 24, 0.25], [MA, 3, 1.8]],
    [[MI, 12, 0.5], [MA, 4, 1.5]],
    [[MA, 6, 1.2], [MI, 10, 0.45]],
    [[C, 1, 1], [MA, 4, 1.5], [T, 20, 0.25]],
  ],
  // 맵2–4 는 웨이브 10개(Dean 10-27 6판 「더 심플」). 성질은 맵마다 새로 나오는 순서를 지킨다: 맵2 빠름·단단함, 맵3 은신·플래키, 맵4 재생
  staging: [
    [[T, 12, 0.5], [MI, 4, 0.9]],
    [[T, 10, 0.4, ["fast"]], [MI, 6, 0.8]],
    [[MI, 10, 0.6], [MA, 2, 2.0]],
    [[MI, 10, 0.45, ["fast"]], [MA, 3, 1.5]],
    [[T, 30, 0.2], [MA, 4, 1.4]],
    [[C, 1, 1], [MI, 12, 0.45], [MA, 2, 1.6, ["tough"]]],
    [[MA, 6, 1.0, ["tough"]], [T, 20, 0.25, ["fast"]]],
    [[MI, 18, 0.32, ["fast"]], [MA, 6, 1.0]],
    [[C, 2, 3.0], [MA, 5, 1.1, ["tough"]], [MI, 10, 0.35]],
    [[C, 3, 2.5], [MA, 7, 0.9], [MI, 14, 0.3, ["fast"]]],
  ],
  prod: [
    [[MI, 10, 0.6], [T, 10, 0.4, ["stealth"]]],
    [[MI, 10, 0.5, ["flaky"]], [MA, 3, 1.6]],
    [[MA, 5, 1.3], [T, 16, 0.3, ["stealth"]], [MI, 8, 0.45]],
    [[C, 1, 1], [MI, 12, 0.45, ["stealth"]], [MA, 4, 1.2, ["tough"]]],
    [[MA, 8, 0.9], [T, 20, 0.25, ["fast"]], [MI, 10, 0.4, ["flaky"]]],
    [[C, 2, 2.5], [MA, 6, 1.0, ["stealth"]], [MI, 12, 0.35]],
    [[MA, 10, 0.75, ["tough"]], [MI, 16, 0.3, ["flaky"]]],
    [[C, 3, 2.0], [MI, 18, 0.28, ["fast"]], [MA, 6, 0.9, ["stealth"]]],
    [[C, 4, 1.8], [MA, 10, 0.75, ["flaky"]], [MI, 20, 0.25, ["stealth"]]],
    [[C, 6, 1.5], [MA, 10, 0.7, ["tough"]], [MI, 20, 0.25, ["fast"]]],
  ],
  warroom: [
    [[MI, 14, 0.45], [MA, 3, 1.4, ["regen"]]],
    [[MA, 6, 1.1], [T, 20, 0.25, ["fast"]], [MI, 10, 0.4, ["regen"]]],
    [[C, 2, 2.5], [MI, 12, 0.4, ["stealth"]], [MA, 4, 1.2, ["tough"]]],
    [[MA, 10, 0.8, ["regen"]], [MI, 14, 0.35]],
    [[C, 3, 2.0], [MA, 8, 0.85, ["flaky"]], [MI, 16, 0.3, ["fast"]]],
    [[C, 3, 1.8, ["regen"]], [MA, 8, 0.8, ["stealth"]], [MI, 12, 0.35, ["regen"]]],
    [[MA, 14, 0.6, ["tough"]], [MI, 18, 0.3, ["flaky"]], [C, 2, 2.0]],
    [[C, 4, 1.6], [MA, 12, 0.65, ["regen"]], [MI, 20, 0.25, ["stealth"]]],
    [[C, 5, 1.4, ["stealth"]], [MA, 12, 0.6], [MI, 24, 0.22, ["fast"]]],
    [[C, 8, 1.2], [MA, 14, 0.5, ["tough"]], [MI, 20, 0.2, ["regen"]]],
  ],
  release: [
    [[MI, 16, 0.4], [MA, 4, 1.2]],
    [[MA, 8, 0.9, ["tough"]], [MI, 14, 0.3, ["fast"]]],
    [[C, 3, 2.0], [MA, 6, 0.9, ["stealth"]]],
    [[C, 4, 1.6, ["regen"]], [MI, 20, 0.25, ["flaky"]]],
    [[C, 4, 1.6], [MA, 10, 0.7]],
    [["blocker", 1, 1]],
  ],
};

// 보스 Blocker: 체력 비율로 단계. 단계가 바뀌면 2 초 「빌드 실패」(멈춤·받는 피해 2배).
const BOSS: { phases: BossPhase[]; stagger: number; staggerMul: number; slowResist: number } = {
  phases: [
    { at: 1.0, name: "방패", shield: 10, shieldRegen: 0.7 }, // 맞을 때마다 방패 1칸. 방패가 있으면 체력은 안 깎임 → 연타 시험
    { at: 0.66, name: "소환", every: 4.5, spawn: [[T, 3], [MI, 1]], warn: 1.0 }, // 범위 시험
    { at: 0.33, name: "롤백", every: 6.0, disable: 3.0, reach: 3.0, warn: 1.0, speedMul: 1.3 }, // 분산 배치 시험
  ],
  stagger: 2.0,
  staggerMul: 2.0,
  slowResist: 0.5, // 감속 효과 절반만
};

// 아이템(Dean 10-27): 버그가 죽을 때 등급별 확률로 떨어진다(모두 5 % 미만). 떨어진 버그 등급 = 아이템 등급.
// 한 번 쓰고 사라진다. 쓰는 법: 아래 칸의 아이템 탭 → 맵 자리 탭. 칸 3개, 꽉 차면 새 아이템은 동전(coin)으로 바뀐다.
// 보스에겐 피해 절반(bossMul), 즉사(vacuum)는 안 통하고 대신 방패를 다 걷는다(strip).
const ITEMS: {
  drop: Partial<Record<Grade, number>>;
  tier: Partial<Record<Grade, ItemTier>>;
  slots: number;
  bossMul: number;
  kinds: Record<ItemKind, ItemDef>;
} = {
  drop: { trivial: 0.012, minor: 0.022, major: 0.035, critical: 0.045 },
  tier: { trivial: "low", minor: "mid", major: "high", critical: "top" },
  slots: 3,
  bossMul: 0.5,
  kinds: {
    palm: { tier: "low", name: "손바닥", r: 0.7, dmg: 40, coin: 10 }, // 찰싹 — 납작
    slipper: { tier: "low", name: "슬리퍼", r: 0.55, dmg: 55, coin: 10 },
    swatter: { tier: "mid", name: "파리채", r: 1.0, dmg: 90, coin: 20 },
    paper: { tier: "mid", name: "말아 쥔 신문지", r: 0.8, dmg: 70, stun: 1.2, coin: 20 },
    hammer: { tier: "high", name: "뿅망치", r: 1.0, dmg: 260, stun: 1.5, coin: 40 },
    spray: { tier: "high", name: "살충제", r: 1.3, dps: 60, dur: 5, coin: 40 }, // 뿌린 자리 지속 피해
    trap: { tier: "high", name: "끈끈이", r: 1.1, slow: 0.7, dur: 8, coin: 40 },
    flamer: { tier: "top", name: "화염방사기", row: true, dmg: 700, coin: 80 }, // 누른 줄 전체(가로 9 칸, 위아래 0.6)
    vacuum: { tier: "top", name: "진공청소기", r: 1.8, dmg: 400, suck: "minor", strip: true, coin: 80 }, // Minor 이하 즉사
  },
};

// 바퀴(Dean 10-27: 끝없는 게임). 맵 5장을 다 깨면 다음 바퀴 = 다음 버전. 바퀴 k(1부터)마다:
//  체력 × hp^(k-1), 속도 × min(speedCap, 1 + speed·(k-1)), 시작 돈·처치 보상 × (1 + money·(k-1)),
//  그리고 add 의 성질이 그 등급 무리에 하나씩 쌓인다(그 바퀴부터 계속).
const LAPS: {
  hp: number;
  speed: number;
  speedCap: number;
  money: number;
  add: { lap: number; grade: Grade; trait: TraitKind }[];
  name: (k: number) => string;
} = {
  hp: 1.15, speed: 0.03, speedCap: 1.2, money: 0.12,
  add: [
    { lap: 2, grade: "trivial", trait: "fast" }, // v2.0: 작은 버그가 빨라진다
    { lap: 3, grade: "minor", trait: "stealth" }, // v3.0: 숨는다
    { lap: 4, grade: "major", trait: "regen" }, // v4.0: 스스로 고친다
    { lap: 5, grade: "critical", trait: "tough" }, // v5.0: 단단해진다
    { lap: 6, grade: "minor", trait: "flaky" }, // v6.0 이후는 배수만
  ],
  name: (k) => "v" + k + ".0",
};
// 전설 아이템(Dean 10-27 6판: 패시브). 보스를 잡으면 하나 확정, 다음 바퀴부터 가지고 있는 동안 계속 듣는다.
// 칸 2개. 같은 것이 또 오면 강화(최대 3단계). 다른 것이 3개째로 오면 플레이어가 하나를 버린다(addLegend).
// 값은 [1단계, 2단계, 3단계].
const LEGENDS = {
  cap: 2,
  maxLv: 3,
  kinds: {
    // 모든 검사의 피해 +% (아이템 피해는 빼고)
    exterminator: { name: "방역 업체 계약", dmgMul: [0.06, 0.09, 0.12] },
    // 단위 테스트·통합 테스트가 n 발째마다 맞힌 자리에 작은 살충 구름(반경 0.6, 1.5 s, 초당 dps)
    bugbomb: { name: "살충 폭탄 탄두", nth: [10, 8, 6], r: 0.6, dur: 1.5, dps: [10, 14, 18] },
    // every 초마다 가장 앞선 버그 자리에 거대 슬리퍼 낙하(반경 1.0, 보스는 절반·방패 3칸)
    bigslipper: { name: "하늘에서 떨어지는 거대 슬리퍼", every: [20, 16, 12], r: 1.0, dmg: [140, 190, 240] },
  },
};

export const DATA = { GRADES, TRAITS, TOWERS, ECON, MAPS, WAVES, BOSS, ITEMS, LAPS, LEGENDS, COLS: 9, ROWS: 12, DT: 1 / 60 };

// ── 도우미 ──────────────────────────────────────────────
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lanePoly(pts: Pt[]): Lane {
  const segs: Lane["segs"] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    segs.push({ x0: x0 + 0.5, y0: y0 + 0.5, x1: x1 + 0.5, y1: y1 + 0.5, len, at: total });
    total += len;
  }
  return { segs, total };
}
export function posAt(poly: Lane, d: number): Pt {
  for (const s of poly.segs) {
    if (d <= s.at + s.len) {
      const f = s.len ? (d - s.at) / s.len : 0;
      return [s.x0 + (s.x1 - s.x0) * f, s.y0 + (s.y1 - s.y0) * f];
    }
  }
  const s = poly.segs[poly.segs.length - 1];
  return [s.x1, s.y1];
}

export function pathTiles(map: MapDef): Set<string> {
  const set = new Set<string>();
  for (const lane of map.lanes)
    for (let i = 1; i < lane.length; i++) {
      let [x, y] = lane[i - 1];
      const [x1, y1] = lane[i];
      const dx = Math.sign(x1 - x), dy = Math.sign(y1 - y);
      for (;;) {
        if (x >= 0 && x < DATA.COLS && y >= 0 && y < DATA.ROWS) set.add(x + "," + y);
        if (x === x1 && y === y1) break;
        x += dx;
        y += dy;
      }
    }
  return set;
}
export function slotsOf(map: MapDef): Pt[] {
  const path = pathTiles(map), deco = new Set(map.deco.map((p) => p + "")), out: Pt[] = [];
  for (let y = 0; y < DATA.ROWS; y++)
    for (let x = 0; x < DATA.COLS; x++) {
      const k = x + "," + y;
      if (path.has(k) || deco.has(k)) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (path.has(x + dx + "," + (y + dy))) near = true;
      if (near) out.push([x, y]);
    }
  return out;
}

export function stats(t: Pick<Tower, "kind" | "level" | "branch">): TowerLevel {
  const def = TOWERS[t.kind];
  return t.branch ? def.br[t.branch] : def.lv[t.level];
}
export function spent(t: Pick<Tower, "kind" | "level" | "branch">): number {
  const def = TOWERS[t.kind];
  let s = def.cost;
  for (let i = 1; i <= Math.min(t.level, 2); i++) s += def.lv[i].cost!;
  if (t.branch) s += def.br[t.branch].cost!;
  return s;
}
export function upgradeCost(t: Pick<Tower, "kind" | "level" | "branch">, br?: Branch | null): number | null {
  const def = TOWERS[t.kind];
  if (t.branch) return null;
  if (t.level < 2) return def.lv[t.level + 1].cost!;
  return br ? def.br[br].cost! : null;
}

// ── 게임 ────────────────────────────────────────────────
export function create(mapIndex: number, seed = 1, run: RunOpts = {}): Game {
  const map = MAPS[mapIndex];
  const lap = run.lap ?? 1;
  const g: Game = {
    map, mapIndex, lap, legends: (run.legends ?? []).slice(0, LEGENDS.cap).map((l) => (typeof l === "string" ? { kind: l, lv: 1 } : { ...l })), // [{kind, lv}]
    slipperT: 0,
    time: 0, money: Math.round(map.start * (1 + LAPS.money * (lap - 1))), gate: ECON.gateHp,
    wave: 0, waves: WAVES[map.id], state: "prep", prepLeft: null,
    towers: [], enemies: [], fx: [], zones: [], items: [], events: [], nextId: 1,
    lanes: map.lanes.map(lanePoly), slots: slotsOf(map), spawnQ: [], rand: rng(seed),
    leaked: { trivial: 0, minor: 0, major: 0, critical: 0, blocker: 0 }, kills: 0, builtThisPrep: new Set(),
  };
  return g;
}

// 첫 바퀴는 맵마다 새 검사가 하나씩 열린다. 2바퀴부터는 다 열려 있다.
export function towersOf(g: Game): TowerKind[] {
  return g.lap >= 2 ? (Object.keys(TOWERS) as TowerKind[]) : g.map.towers;
}
function slotFree(g: Game, x: number, y: number): boolean {
  return g.slots.some(([a, b]) => a === x && b === y) && !g.towers.some((t) => t.x === x && t.y === y);
}
export function build(g: Game, kind: TowerKind, x: number, y: number): Tower | null {
  const def = TOWERS[kind];
  if (!def || !towersOf(g).includes(kind) || !slotFree(g, x, y) || g.money < def.cost) return null;
  g.money -= def.cost;
  const t: Tower = { id: g.nextId++, kind, x, y, level: 0, branch: null, cd: 0, target: null, mode: "first", disabled: 0, ramp: 0, rampTarget: null };
  g.towers.push(t);
  if (g.state === "prep") g.builtThisPrep.add(t.id);
  g.events.push({ e: "build", t });
  return t;
}
export function upgrade(g: Game, t: Tower, br?: Branch | null): boolean {
  const c = upgradeCost(t, br);
  if (c == null || g.money < c) return false;
  g.money -= c;
  if (t.level < 2) t.level++;
  else t.branch = br!;
  g.events.push({ e: "upgrade", t });
  return true;
}
// 판매 환급: 90 × 0.7 = 62.999… 같은 부동소수 오차로 1 덜 주지 않게 정수 백분율로 센다
export function refund(g: Game, t: Tower): number {
  return Math.floor((spent(t) * (g.builtThisPrep.has(t.id) ? 100 : Math.round(ECON.sellRefund * 100))) / 100);
}
export function sell(g: Game, t: Tower): number {
  const back = refund(g, t);
  g.money += back;
  g.towers = g.towers.filter((o) => o !== t);
  g.events.push({ e: "sell", t, back });
  return back;
}

export function useItem(g: Game, idx: number, x: number, y: number): boolean {
  const kind = g.items[idx];
  if (!kind) return false;
  const it = ITEMS.kinds[kind];
  g.items.splice(idx, 1);
  const inArea = (e: Enemy) => (it.row ? Math.abs(e.y - y) <= 0.6 : Math.hypot(e.x - x, e.y - y) <= it.r!);
  if (it.dur) g.zones.push({ kind, x, y, r: it.r!, life: it.dur, max: it.dur, dps: it.dps ?? 0, slow: it.slow ?? 0 });
  if (it.dmg) {
    for (const e of g.enemies.slice()) {
      if (e.dead || !inArea(e)) continue;
      const boss = e.grade === "blocker";
      if (boss && it.strip) e.shield = 0;
      if (!boss && it.suck && (e.grade === "trivial" || e.grade === it.suck)) {
        damage(g, e, e.hp + 999, { area: true, pierceArmor: true, item: true });
        continue;
      }
      if (boss && e.shield! > 0) e.shield = Math.max(0, e.shield! - 3); // 아이템 한 방 = 방패 3칸
      damage(g, e, it.dmg * (boss ? ITEMS.bossMul : 1), { area: true, pierceArmor: true, item: true });
      if (it.stun && !e.dead) e.stun = Math.max(e.stun ?? 0, it.stun * (boss ? 0.5 : 1));
    }
  }
  g.events.push({ e: "item", kind, x, y });
  return true;
}

// 전설 단계 값 꺼내기(없으면 0)
function legendLv(g: Game, kind: LegendKind): number {
  const l = g.legends.find((o) => o.kind === kind);
  return l ? l.lv : 0;
}
const lv3 = (arr: number[], lv: number) => arr[Math.min(lv, arr.length) - 1];
// 바퀴 사이: 보스가 떨군 전설을 목록에 더한다. 같은 것 → 강화, 칸이 차면 drop 번째를 버리고 넣는다(-1 = 새것을 버림).
// 돌려주는 값 { list, needChoice }. needChoice 면 화면이 「하나 버리기」를 묻고 drop 을 넣어 다시 부른다.
export function addLegend(list: Legend[], kind: LegendKind, drop?: number | null): { list: Legend[]; needChoice: boolean } {
  const out = list.map((l) => ({ ...l }));
  const same = out.find((l) => l.kind === kind);
  if (same) { same.lv = Math.min(LEGENDS.maxLv, same.lv + 1); return { list: out, needChoice: false }; }
  if (out.length < LEGENDS.cap) { out.push({ kind, lv: 1 }); return { list: out, needChoice: false }; }
  if (drop == null) return { list: out, needChoice: true };
  if (drop >= 0) out.splice(drop, 1, { kind, lv: 1 });
  return { list: out, needChoice: false };
}

export function startWave(g: Game): boolean {
  if (g.state !== "prep" || g.wave >= g.waves.length) return false;
  if (g.prepLeft != null && g.prepLeft > 0) {
    const bonus = Math.floor(g.prepLeft * ECON.earlyPerSec);
    g.money += bonus;
    if (bonus) g.events.push({ e: "early", bonus });
  }
  const groups = g.waves[g.wave];
  let at = 0, alt = 0;
  for (const [grade, n, gap, traits = [], lane] of groups) {
    for (let i = 0; i < n; i++) {
      g.spawnQ.push({ at: g.time + at, grade, traits, lane: lane ?? alt++ % g.lanes.length });
      at += gap;
    }
    at += 0.8;
  }
  g.wave++;
  g.state = "wave";
  g.builtThisPrep.clear();
  g.events.push({ e: "wave", n: g.wave });
  return true;
}

function spawn(g: Game, grade: Grade, traits: TraitKind[], lane: number, dist = 0): Enemy {
  const gr = GRADES[grade];
  let hpMul = g.map.hpMul, speed = gr.speed, armor = gr.armor, regen = 0, dodge = 0;
  if (grade !== "blocker") hpMul *= 1 + 0.03 * g.wave;
  hpMul *= Math.pow(LAPS.hp, g.lap - 1);
  speed *= Math.min(LAPS.speedCap, 1 + LAPS.speed * (g.lap - 1));
  traits = traits.slice();
  for (const a of LAPS.add) if (g.lap >= a.lap && a.grade === grade && !traits.includes(a.trait)) traits.push(a.trait);
  for (const k of traits) {
    const tr = TRAITS[k];
    hpMul *= tr.hpMul ?? 1;
    speed *= tr.speedMul ?? 1;
    armor += tr.armorAdd ?? 0;
    regen = tr.regen ?? regen;
    dodge = tr.dodge ?? dodge;
  }
  const hp = Math.round(gr.hp * hpMul);
  const e: Enemy = {
    id: g.nextId++, grade, traits, lane, dist, hp, maxHp: hp, speed, armor, regen, dodge,
    stealth: traits.includes("stealth"), slow: 0, mark: 0, vuln: 0, flash: 0, x: 0, y: 0, dead: false,
  };
  if (grade === "blocker") Object.assign(e, { phase: 0, shield: BOSS.phases[0].shield, stagger: 0, timer: 0, warn: 0, warnTower: null });
  const [x, y] = posAt(g.lanes[lane], dist);
  e.x = x;
  e.y = y;
  g.enemies.push(e);
  g.events.push({ e: "spawn", en: e });
  return e;
}

// 모니터링 효과(드러냄·표시·플래키 고정)를 매 단계 새로 계산
function sense(g: Game): void {
  for (const e of g.enemies) {
    e.seen = !e.stealth;
    e.mark = 0;
    e.steady = false;
  }
  for (const t of g.towers) {
    if (t.kind !== "monitor" || t.disabled > 0) continue;
    const s = stats(t);
    for (const e of g.enemies) {
      if (Math.hypot(e.x - t.x - 0.5, e.y - t.y - 0.5) > s.range!) continue;
      e.seen = true;
      e.mark = Math.max(e.mark, s.mark!);
      if (s.steady) e.steady = true;
    }
  }
}

function hasteOf(g: Game, t: Tower): { h: number; r: number } {
  let h = 0, r = 0;
  for (const c of g.towers) {
    if (c.kind !== "ci" || c === t || c.disabled > 0) continue;
    const s = stats(c);
    if (Math.hypot(c.x - t.x, c.y - t.y) <= s.range!) {
      h = Math.max(h, s.haste!);
      r = Math.max(r, s.rangeAdd ?? 0);
    }
  }
  return { h, r };
}

function damage(g: Game, e: Enemy, raw: number, opts: DamageOpts = {}): number {
  if (e.dead) return 0;
  if (!opts.area && e.dodge && !e.steady && g.rand() < e.dodge) {
    g.events.push({ e: "dodge", en: e });
    return 0;
  }
  let d = raw * (1 + e.mark + e.vuln);
  if (!opts.item) { const lv = legendLv(g, "exterminator"); if (lv) d *= 1 + lv3(LEGENDS.kinds.exterminator.dmgMul, lv); }
  if (opts.bigMul && (e.grade === "major" || e.grade === "critical" || e.grade === "blocker")) d *= opts.bigMul;
  if (!opts.pierceArmor) d = Math.max(d - e.armor, d * 0.2);
  if (e.grade === "blocker") {
    if (e.stagger! > 0) d *= BOSS.staggerMul;
    if (e.shield! > 0 && opts.tick) return 0; // 지속 피해는 방패에 막히고 방패를 깎지도 않는다
    if (e.shield! > 0 && !opts.item) {
      e.shield! -= 1;
      e.flash = 2;
      g.events.push({ e: "shield", en: e });
      return 0;
    }
  }
  e.hp -= d;
  if (!opts.tick) e.flash = 2; // 번쩍임은 한 방 맞을 때만(지속 피해로 늘 하얘지지 않게)
  g.events.push({ e: "hit", en: e, d });
  if (e.hp <= 0) kill(g, e);
  return d;
}

function bombProc(g: Game, t: Tower, e: { x: number; y: number }): void {
  const lv = legendLv(g, "bugbomb");
  if (!lv) return;
  const B = LEGENDS.kinds.bugbomb;
  t.shots = (t.shots || 0) + 1;
  if (t.shots % lv3(B.nth, lv) === 0) {
    g.zones.push({ kind: "bugbomb", x: e.x, y: e.y, r: B.r, life: B.dur, max: B.dur, dps: lv3(B.dps, lv), slow: 0 }); // 바퀴 배수를 안 곱한다 → 바퀴가 오를수록 몫이 줄어 벽이 생긴다
    g.events.push({ e: "bombProc", x: e.x, y: e.y });
  }
}
function kill(g: Game, e: Enemy): void {
  e.dead = true;
  g.kills++;
  const reward = Math.round(GRADES[e.grade].reward * (1 + LAPS.money * (g.lap - 1)));
  g.money += reward;
  g.events.push({ e: "kill", en: e, reward });
  if (e.grade === "blocker") {
    const ks = Object.keys(LEGENDS.kinds) as LegendKind[];
    g.legendDrop = ks[Math.floor(g.rand() * ks.length)]; // 바퀴 끝에 addLegend 로 목록에 더하고 저장
    g.events.push({ e: "legendDrop", kind: g.legendDrop, x: e.x, y: e.y });
  }
  const p = ITEMS.drop[e.grade];
  if (p && !g.noItems && g.rand() < p) {
    const pool = (Object.keys(ITEMS.kinds) as ItemKind[]).filter((k) => ITEMS.kinds[k].tier === ITEMS.tier[e.grade]);
    const kind = pool[Math.floor(g.rand() * pool.length)];
    if (g.items.length < ITEMS.slots) {
      g.items.push(kind);
      g.events.push({ e: "drop", kind, x: e.x, y: e.y });
    } else {
      g.money += ITEMS.kinds[kind].coin;
      g.events.push({ e: "dropCoin", kind, coin: ITEMS.kinds[kind].coin, x: e.x, y: e.y });
    }
  }
  const sp = GRADES[e.grade].split;
  if (sp) for (let i = 0; i < sp.n; i++) spawn(g, sp.grade, [], e.lane, Math.max(0, e.dist - 0.3 * i));
}

function pick(g: Game, t: Tower, range: number, exclude?: Enemy): Enemy | null {
  let best: Enemy | null = null, score = -Infinity;
  for (const e of g.enemies) {
    if (e.dead || !e.seen || e === exclude) continue;
    const dd = Math.hypot(e.x - t.x - 0.5, e.y - t.y - 0.5);
    if (dd > range) continue;
    const s = t.mode === "strong" ? e.hp : t.mode === "close" ? -dd : e.dist / g.lanes[e.lane].total;
    if (s > score) {
      score = s;
      best = e;
    }
  }
  return best;
}

function stepTower(g: Game, t: Tower, dt: number): void {
  if (t.disabled > 0) {
    t.disabled -= dt;
    return;
  }
  const s = stats(t), { h, r } = hasteOf(g, t), range = (s.range ?? 0) + r;
  if (t.kind === "lint") {
    for (const e of g.enemies) {
      if (e.dead || Math.hypot(e.x - t.x - 0.5, e.y - t.y - 0.5) > range) continue;
      const res = e.grade === "blocker" ? BOSS.slowResist : 1;
      e.slow = Math.max(e.slow, s.slow! * res);
      if (s.vuln) e.vuln = s.vuln;
      damage(g, e, s.dps! * (1 + h) * dt, { area: true, pierceArmor: true, tick: true });
    }
    return;
  }
  if (t.kind === "monitor" || t.kind === "ci") return;
  t.cd -= dt * (1 + h);
  if (t.cd > 0) return;
  const target = pick(g, t, range);
  if (!target) return;
  let period = s.period!;
  if (s.ramp) {
    if (t.rampTarget === target.id) t.ramp = Math.min(1, t.ramp + s.period! / s.ramp.over);
    else t.ramp = 0;
    t.rampTarget = target.id;
    period = s.period! + (s.ramp.to - s.period!) * t.ramp;
  }
  t.cd = period;
  const ox = t.x + 0.5, oy = t.y + 0.5;
  if (t.kind === "unit") {
    const hit = [target];
    if (s.multi) {
      const second = pick(g, t, range, target);
      if (second) hit.push(second);
    }
    for (const e of hit) {
      g.fx.push({ k: "tracer", x0: ox, y0: oy, x1: e.x, y1: e.y, life: 0.08, c: "unit" });
      damage(g, e, s.dmg!);
    }
    bombProc(g, t, hit[0]);
    g.events.push({ e: "shot", t });
  } else if (t.kind === "integ") {
    // 포물선 탄: 0.35 초 뒤 그 자리에서 터진다
    g.fx.push({ k: "shell", x0: ox, y0: oy, x1: target.x, y1: target.y, life: 0.35, max: 0.35, dmg: s.dmg!, splash: s.splash!, live: true, t });
    g.events.push({ e: "shot", t });
  } else if (t.kind === "review") {
    const opts: DamageOpts = { pierceArmor: true, bigMul: s.bigMul };
    const hits = [target];
    if (s.line) {
      // 겨눈 방향으로 뒤에 선 적을 꿰뚫는다
      const dx = target.x - ox, dy = target.y - oy, L = Math.hypot(dx, dy) || 1;
      const behind = g.enemies
        .filter((e) => !e.dead && e !== target)
        .map((e) => ({ e, along: ((e.x - ox) * dx + (e.y - oy) * dy) / L, off: Math.abs((e.x - ox) * dy - (e.y - oy) * dx) / L }))
        .filter((o) => o.along > 0 && o.off < 0.35 && o.along < range + 1.5)
        .sort((a, b) => a.along - b.along)
        .slice(0, s.line - 1);
      hits.push(...behind.map((o) => o.e));
    }
    const last = hits[hits.length - 1];
    g.fx.push({ k: "beam", x0: ox, y0: oy, x1: last.x, y1: last.y, life: 0.14, c: "review" });
    for (const e of hits) damage(g, e, s.dmg!, opts);
    g.events.push({ e: "snipe", t });
  }
}

function stepBoss(g: Game, e: Enemy, dt: number): number {
  const frac = e.hp / e.maxHp;
  const next = BOSS.phases[e.phase! + 1];
  if (next && frac <= next.at) {
    e.phase!++;
    e.stagger = BOSS.stagger;
    e.shield = 0;
    e.timer = next.every;
    g.events.push({ e: "phase", en: e, phase: e.phase!, name: next.name });
  }
  if (e.stagger! > 0) {
    e.stagger! -= dt;
    return 0; // 멈춤
  }
  const ph = BOSS.phases[e.phase!];
  if (ph.shield != null) e.shield = Math.min(ph.shield, e.shield! + ph.shieldRegen! * dt);
  if (ph.every) {
    e.timer! -= dt;
    if (e.timer! <= ph.warn! && !e.warn) {
      e.warn = 1;
      if (ph.disable) {
        // 가장 높이 올린 가까운 검사를 고른다(예고 1 초)
        const cands = g.towers.filter((t) => t.disabled <= 0 && Math.hypot(t.x + 0.5 - e.x, t.y + 0.5 - e.y) <= ph.reach!);
        cands.sort((a, b) => spent(b) - spent(a));
        e.warnTower = cands[0] ?? null;
      }
      g.events.push({ e: "warn", en: e, tower: e.warnTower, kind: ph.name });
    }
    if (e.timer! <= 0) {
      e.timer = ph.every;
      e.warn = 0;
      if (ph.spawn) for (const [gr, n] of ph.spawn) for (let i = 0; i < n; i++) spawn(g, gr, [], e.lane, Math.max(0, e.dist - 0.25 * (i + 1)));
      if (ph.disable && e.warnTower) {
        e.warnTower.disabled = ph.disable;
        g.events.push({ e: "rollback", t: e.warnTower });
      }
      e.warnTower = null;
    }
  }
  return ph.speedMul ?? 1;
}

export function step(g: Game, dt = DATA.DT): void {
  if (g.state === "won" || g.state === "lost") return;
  g.time += dt;
  if (g.state === "prep" && g.prepLeft != null) {
    g.prepLeft -= dt;
    if (g.prepLeft <= 0) {
      g.prepLeft = 0;
      startWave(g);
    }
  }
  while (g.spawnQ.length && g.spawnQ[0].at <= g.time) {
    const s = g.spawnQ.shift()!;
    spawn(g, s.grade, s.traits, s.lane);
  }
  sense(g);
  for (const e of g.enemies) e.vuln = 0;
  const sl = legendLv(g, "bigslipper");
  if (sl && g.state === "wave") {
    g.slipperT += dt;
    const S = LEGENDS.kinds.bigslipper;
    if (g.slipperT >= lv3(S.every, sl) && g.enemies.length) {
      g.slipperT = 0;
      const t = g.enemies.reduce((a, b) => (b.dist / g.lanes[b.lane].total > a.dist / g.lanes[a.lane].total ? b : a));
      const dmg = lv3(S.dmg, sl); // 바퀴 배수 안 곱함(위와 같은 까닭)
      for (const e of g.enemies.slice()) {
        if (e.dead || Math.hypot(e.x - t.x, e.y - t.y) > S.r) continue;
        const boss = e.grade === "blocker";
        if (boss) e.shield = Math.max(0, (e.shield || 0) - 3);
        damage(g, e, dmg * (boss ? 0.5 : 1), { area: true, pierceArmor: true, item: true });
      }
      g.events.push({ e: "slipper", x: t.x, y: t.y });
    }
  }
  // 린터가 먼저(감속·취약 표시) → 나머지 타워
  for (const t of g.towers) if (t.kind === "lint") stepTower(g, t, dt);
  for (const t of g.towers) if (t.kind !== "lint") stepTower(g, t, dt);
  for (const f of g.fx) {
    f.life -= dt;
    if (f.k === "shell" && f.live && f.life <= 0) {
      f.live = false;
      g.fx.push({ k: "boom", x: f.x1, y: f.y1, r: f.splash, life: 0.25, max: 0.25 });
      bombProc(g, f.t, { x: f.x1, y: f.y1 });
      g.events.push({ e: "boom" });
      for (const e of g.enemies) if (!e.dead && Math.hypot(e.x - f.x1, e.y - f.y1) <= f.splash) damage(g, e, f.dmg, { area: true });
    }
  }
  g.fx = g.fx.filter((f) => f.life > 0);
  for (const z of g.zones) {
    z.life -= dt;
    for (const e of g.enemies) {
      if (e.dead || Math.hypot(e.x - z.x, e.y - z.y) > z.r) continue;
      if (z.slow) e.slow = Math.max(e.slow, z.slow * (e.grade === "blocker" ? BOSS.slowResist : 1));
      if (z.dps) damage(g, e, z.dps * (e.grade === "blocker" ? ITEMS.bossMul : 1) * dt, { area: true, pierceArmor: true, tick: true });
    }
  }
  g.zones = g.zones.filter((z) => z.life > 0);
  for (const e of g.enemies) {
    if (e.dead) continue;
    let mul = 1;
    if (e.grade === "blocker") mul = stepBoss(g, e, dt);
    if (e.regen) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt);
    if (e.stun! > 0) {
      e.stun! -= dt;
      mul = 0;
    }
    e.dist += e.speed * (1 - e.slow) * mul * dt;
    e.slow = 0;
    if (e.flash > 0) e.flash -= 1;
    const lane = g.lanes[e.lane];
    if (e.dist >= lane.total) {
      e.dead = true;
      e.leaked = true;
      const loss = GRADES[e.grade].leak;
      g.gate = Math.max(0, g.gate - loss);
      g.leaked[e.grade]++;
      g.events.push({ e: "leak", en: e, loss });
      if (g.gate <= 0) {
        g.state = "lost";
        g.events.push({ e: "lost" });
        return;
      }
      continue;
    }
    const [x, y] = posAt(lane, e.dist);
    e.x = x;
    e.y = y;
  }
  g.enemies = g.enemies.filter((e) => !e.dead);
  if (g.state === "wave" && !g.spawnQ.length && !g.enemies.length) {
    g.money += ECON.waveBonus(g.wave);
    g.events.push({ e: "cleared", n: g.wave, bonus: ECON.waveBonus(g.wave) });
    if (g.wave >= g.waves.length) {
      g.state = "won";
      g.events.push({ e: "won", stars: g.gate >= 90 ? 3 : g.gate >= 50 ? 2 : 1 });
    } else {
      g.state = "prep";
      g.prepLeft = ECON.prepSec;
    }
  }
}
