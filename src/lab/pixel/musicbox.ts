// 스노글로브 오르골 — 공개 저작물 캐럴 세 곡을 파일 없이 Web Audio 로 합성해 끝없이 돌린다.
// 순서: 「고요한 밤」(Stille Nacht, F. X. Gruber 1818) → 「소나무야」(O Tannenbaum, 독일 민요) → 「We Wish You a Merry Christmas」(영국 민요).
// 음표는 손으로 옮겨 적었다(녹음·악보 파일 없음). 마디 옆 주석은 원래 가사(독일어·영어 원문, 공개 저작물) — 따라 불러 보며 음을 확인한다.
// 소리: 오르골 빗살(금속 살)을 튕기는 느낌 — 3 ms 시작, 지수 감쇠(낮은 음 약 2.5 s · 높은 음 약 0.8 s),
//   기음 + 옥타브 배음 + 살짝 어긋난 높은 배음(빨리 사라져 「팅」 하는 금속 맛) + 아주 작은 「틱」. 잔향은 만든 임펄스 응답(파일 없음).
// 시간: 50 ms 마다 ctx.currentTime 기준 0.5 s 앞까지 예약(미리 보기 스케줄러) → 밀리지 않고 이음매 없이 돈다.
// 출력: 볼륨 1 이어도 최고값 0.8 아래(압축기 + 여유). 검사: tmp/lab-pixel/audio-rig.cjs

export type Song = {
  /** 읽기용 제목 */
  title: string;
  /** 조 — 읽기용 */
  key: string;
  /** 한 마디 박 수 · 박 단위 */
  meter: number;
  beat: "8분음표" | "4분음표";
  /** 박/분 */
  bpm: number;
  /** 못갖춘마디(첫 줄) 박 수. 없으면 0 */
  pickup: number;
  /** 끝 리타르단도: 마지막 ritBeats 박 동안 박 길이가 (1 + rit) 배까지 차츰 늘어난다 */
  rit: number;
  ritBeats: number;
  /** 숨: 이 박 자리(곡 첫머리부터 센 박) 앞에서 BREATH 박만큼 쉰다 — 프레이즈 끝 */
  breaths: number[];
  /** 마디마다 "음이름옥타브:박" … */
  bars: string[];
  /** 마디마다 화음. "C G7@3" = C 로 시작해 3박째 G7. 빈 글 = 반주 없음 */
  chords: string[];
};

// ---------------------------------------------------------------- 악보
// 오르골 음역(C5–F6 근처)에 맞춰 세 곡 모두 원래 노래 음역보다 한 옥타브 위로 적었다.

/** 「고요한 밤」 — Stille Nacht (곡 F. X. Gruber 1818 · 가사 J. Mohr). 6/8, 박 = 8분음표. 특히 느리게 */
const STILLE_NACHT: Song = {
  title: "고요한 밤 (Stille Nacht)",
  key: "C 장조",
  meter: 6,
  beat: "8분음표",
  bpm: 108,
  pickup: 0,
  rit: 0.5,
  ritBeats: 9,
  breaths: [24, 48],
  bars: [
    "G5:1.5 A5:.5 G5:1 E5:3", //            1  Stil- ~ le Nacht,       (Si- ~ lent night,)
    "G5:1.5 A5:.5 G5:1 E5:3", //            2  hei- li- ge Nacht!      (Ho- ~ ly night,)
    "D6:2 D6:1 B5:3", //                    3  Al- les schläft,        (All is calm,)
    "C6:2 C6:1 G5:3", //                    4  ein- sam wacht          (all is bright)
    "A5:2 A5:1 C6:1.5 B5:.5 A5:1", //       5  nur das trau- te hoch-  (Round yon Vir- gin Mo-)
    "G5:1.5 A5:.5 G5:1 E5:3", //            6  hei- li- ge Paar.       (-ther ~ and child.)
    "A5:2 A5:1 C6:1.5 B5:.5 A5:1", //       7  Hol- der Kna- be im     (Ho- ly In- fant so)
    "G5:1.5 A5:.5 G5:1 E5:3", //            8  lo- cki- gen Haar,      (ten- ~ der and mild,)
    "D6:2 D6:1 F6:1.5 D6:.5 B5:1", //       9  schlaf in himm- li- scher (Sleep in hea- ven- ly)
    "C6:3 E6:3", //                        10  Ruh! ~                  (peace, ~)
    "C6:1.5 G5:.5 E5:1 G5:1.5 F5:.5 D5:1", // 11 Schlaf in himm- li- scher Ruh! (Sleep in hea- ven- ly peace.)
    "C5:6", //                             12  ~ (Ruh 의 끝)
  ],
  chords: ["C", "C", "G7", "C", "F", "C", "F", "C", "G7", "C", "C G7@3", "C"],
};

/** 「소나무야」 — O Tannenbaum (독일 민요 · 가사 E. Anschütz 1824). 3/4, 박 = 4분음표 */
const TANNENBAUM: Song = {
  title: "소나무야 (O Tannenbaum)",
  key: "F 장조",
  meter: 3,
  beat: "4분음표",
  bpm: 76,
  pickup: 1,
  rit: 0.5,
  ritBeats: 4,
  breaths: [12, 24],
  bars: [
    "C5:1", //                            0  O                     (O)
    "F5:.75 F5:.25 F5:1.5 G5:.5", //      1  Tan- nen- baum, o     (Christ- mas tree, O)
    "A5:.75 A5:.25 A5:1.5 A5:.5", //      2  Tan- nen- baum, wie   (Christ- mas tree, how)
    "G5:.5 A5:.5 Bb5:1 E5:1", //          3  treu sind dei- ne     (love- ly are thy)
    "G5:1 F5:1 C6:1", //                  4  Blät- ter! Du         (bran- ches! Not)
    "C6:.75 A5:.25 D6:1.5 C6:.5", //      5  grünst nicht nur zur  (on- ly green when)
    "C6:.75 Bb5:.25 Bb5:1.5 Bb5:.5", //   6  Som- mer- zeit, nein  (sum- mer's here, but)
    "Bb5:.75 G5:.25 C6:1.5 Bb5:.5", //    7  auch im Win- ter,     (al- so when 'tis)
    "Bb5:.75 A5:.25 A5:1 C5:1", //        8  wenn es schneit. O    (cold and drear. O)
    "F5:.75 F5:.25 F5:1.5 G5:.5", //      9  Tan- nen- baum, o     (Christ- mas tree, O)
    "A5:.75 A5:.25 A5:1.5 A5:.5", //     10  Tan- nen- baum, wie   (Christ- mas tree, how)
    "G5:.5 A5:.5 Bb5:1 E5:1", //         11  treu sind dei- ne     (love- ly are thy)
    "G5:1 F5:2", //                      12  Blät- ter!            (bran- ches!)
  ],
  chords: ["", "F", "F", "C7", "C7 F@1", "F Bb@1", "C7", "C7", "F", "F", "F", "C7", "C7 F@1"],
};

/** 「We Wish You a Merry Christmas」 (영국 민요). 3/4, 박 = 4분음표. 후렴 + 「Good tidings」 */
const WE_WISH: Song = {
  title: "We Wish You a Merry Christmas",
  key: "G 장조",
  meter: 3,
  beat: "4분음표",
  bpm: 96,
  pickup: 1,
  rit: 0.6,
  ritBeats: 4,
  breaths: [24, 36],
  bars: [
    "D5:1", //                               0  We
    "G5:1 G5:.5 A5:.5 G5:.5 F#5:.5", //      1  wish you a mer- ry
    "E5:1 E5:1 E5:1", //                     2  Christ- mas, we
    "A5:1 A5:.5 B5:.5 A5:.5 G5:.5", //       3  wish you a mer- ry
    "F#5:1 D5:1 D5:1", //                    4  Christ- mas, we
    "B5:1 B5:.5 C6:.5 B5:.5 A5:.5", //       5  wish you a mer- ry
    "G5:1 E5:1 D5:.5 D5:.5", //              6  Christ- mas and a
    "E5:1 A5:1 F#5:1", //                    7  hap- py new
    "G5:2 D5:1", //                          8  year! Good
    "G5:1 G5:1 G5:1", //                     9  ti- dings we
    "F#5:2 F#5:1", //                       10  bring to
    "G5:1 F#5:1 E5:1", //                   11  you and your
    "D5:2 A5:1", //                         12  kin; Good
    "B5:1 A5:1 G5:1", //                    13  ti- dings for
    "D6:1 D5:1 D5:.5 D5:.5", //             14  Christ- mas and a
    "E5:1 A5:1 F#5:1", //                   15  hap- py new
    "G5:3", //                              16  year!
  ],
  chords: ["", "G", "C", "A7", "D", "B7", "Em", "C D7@1", "G", "G", "D", "Em", "D", "G", "G", "C D7@1", "G"],
};

export const SONGS: Song[] = [STILLE_NACHT, TANNENBAUM, WE_WISH];

// ---------------------------------------------------------------- 음이름 · 화음

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "F#5" → 78 (MIDI 번호, A4 = 69) */
export function noteToMidi(name: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error("음이름을 못 읽음: " + name);
  return 12 * (Number(m[3]) + 1) + PC[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}

function parseBar(bar: string): { midi: number; beats: number }[] {
  return bar.trim().split(/\s+/).map(tok => {
    const [n, b] = tok.split(":");
    return { midi: noteToMidi(n), beats: Number(b) };
  });
}

/** "Bb", "Em", "D7" → 뿌리 음 높이(0–11)와 3도·5도 간격 */
function parseChord(name: string) {
  const m = /^([A-G])(#|b)?(m?)(7?)$/.exec(name);
  if (!m) throw new Error("화음을 못 읽음: " + name);
  const root = (PC[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12;
  return { root, third: m[3] ? 3 : 4, fifth: 7 };
}

/** 음 높이 pc 를 lo 이상 가장 낮은 자리에 */
const place = (pc: number, lo: number) => lo + ((pc - lo) % 12 + 12) % 12;

// ---------------------------------------------------------------- 연주 계획(한 바퀴)

export type PlannedNote = {
  /** 한 바퀴 첫머리부터 초 */
  t: number;
  midi: number;
  vel: number;
  /** m = 선율 · a = 반주 */
  part: "m" | "a";
  song: number;
  /** 선율이면 그 곡 안 선율 음 순번 */
  i: number;
};

export type Plan = {
  /** startMusicBox 부른 뒤 첫 바퀴가 시작하기까지(초) */
  lead: number;
  /** 한 바퀴 길이(초) — 다음 바퀴는 정확히 이만큼 뒤에 시작 */
  length: number;
  songs: { title: string; start: number; end: number }[];
  events: PlannedNote[];
};

const LEAD = 0.12;
// 곡 끝: 오르골은 음을 끌 수 없다 — 마지막 음이 울린 뒤 RING 초에서 곡을 닫고(악보의 긴 음표 길이와 상관없이) GAP 초 쉬고 다음 곡
const RING = 2.4;
const GAP = 1.0;
const BREATH = 0.35; // 숨 길이(박)

// 사람 손맛: 음마다 정해진 몇 ms 어긋남(오르골 원통의 핀처럼 바퀴마다 같다)
function hash01(n: number) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export function planMedley(): Plan {
  const events: PlannedNote[] = [];
  const songs: Plan["songs"] = [];
  let at = 0;
  SONGS.forEach((s, si) => {
    const spb = 60 / s.bpm;
    const total = s.pickup + (s.bars.length - (s.pickup ? 1 : 0)) * s.meter;
    const r0 = total - s.ritBeats;
    // 박 자리 → 곡 첫머리부터 초(리타르단도 · 숨 포함)
    const sec = (b: number) => {
      const u = Math.max(0, (b - r0) / s.ritBeats);
      const held = s.breaths.filter(p => p <= b).length * BREATH;
      return spb * (b + (s.rit * s.ritBeats * u * u * u) / 3 + held);
    };
    const push = (b: number, midi: number, vel: number, part: "m" | "a", i: number) => {
      const j = (hash01(si * 4099 + i * 7 + (part === "a" ? 50021 + Math.round(b * 8) : 0)) - 0.5) * 2;
      events.push({ t: at + Math.max(0, sec(b) + j * (part === "m" ? 0.004 : 0.007)), midi, vel, part, song: si, i });
    };
    let b = 0;
    let mi = 0;
    let lastOnset = 0;
    s.bars.forEach((bar, bi) => {
      const barStart = b;
      const last = bi === s.bars.length - 1;
      for (const n of parseBar(bar)) {
        const inBar = b - barStart;
        const accent = inBar === 0 ? 0.1 : s.meter === 6 && inBar === 3 ? 0.05 : 0;
        const vel = (0.8 + accent + (hash01(si * 7919 + mi) - 0.5) * 0.08) * (b >= total - s.meter * 2 ? 0.92 : 1);
        push(b, n.midi, vel, "m", mi++);
        lastOnset = Math.max(lastOnset, sec(b));
        b += n.beats;
      }
      accompany(s, s.chords[bi] ?? "", barStart, last, (pos, midi, vel) => {
        push(pos, midi, vel, "a", 0);
        lastOnset = Math.max(lastOnset, sec(pos));
      });
    });
    const end = at + Math.min(sec(total), lastOnset + RING);
    songs.push({ title: s.title, start: at, end });
    at = end + GAP;
  });
  events.sort((a, b) => a.t - b.t);
  return { lead: LEAD, length: at, songs, events };
}

// 반주: 6/8 은 베이스 + 넷째 8분음표에 화음 한 음, 3/4 는 베이스 + 2·3박에 화음 음(작게). 끝 마디는 펼친 화음.
// 음역: 베이스 C3–B3, 화음 음 G#3–A4 — 선율(C5 위)과 겹치지 않게 아래에 둔다.
function accompany(s: Song, str: string, barStart: number, last: boolean, put: (b: number, midi: number, vel: number) => void) {
  const parts = str.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return;
  const list = parts.map((p, k) => {
    const [name, pos] = p.split("@");
    return { c: parseChord(name), at: pos !== undefined ? Number(pos) : k === 0 ? 0 : s.meter === 6 ? 3 : 2 };
  });
  const bass = (c: { root: number }) => place(c.root, 48);
  const third = (c: { root: number; third: number }) => place(c.root + c.third, 56);
  const fifth = (c: { root: number; third: number; fifth: number }) => {
    const f = place(c.root + c.fifth, third(c) + 1);
    return f > 69 ? f - 12 : f;
  };
  if (last) {
    // 펼친 화음: 베이스 → 5도 → 3도, 살짝 굴려서
    const c = list[0].c;
    put(barStart, bass(c), 0.42);
    put(barStart + 0.12, fifth(c), 0.26);
    put(barStart + 0.24, third(c), 0.24);
    return;
  }
  if (list.length > 1) {
    for (const x of list) put(barStart + x.at, bass(x.c), 0.38);
    return;
  }
  const c = list[0].c;
  put(barStart, bass(c), 0.42);
  if (s.meter === 6) put(barStart + 3, fifth(c), 0.24);
  else {
    put(barStart + 1, third(c), 0.22);
    put(barStart + 2, fifth(c), 0.19);
  }
}

// ---------------------------------------------------------------- 소리

const AHEAD = 0.5; // 미리 예약하는 폭(초)
const TICK_MS = 50;
const ATT = 0.003; // 시작 3 ms
const NOTE = 0.2; // 음 하나 크기(볼륨 1 기준)
// 배음: [주파수 배수, 크기, 감쇠 배수] — 셋째가 살짝 어긋난 금속 배음(빨리 사라진다)
const PARTIALS: [number, number, number][] = [
  [1, 1, 1],
  [2, 0.2, 0.42],
  [5.43, 0.09, 0.12],
];

function hold(p: AudioParam, t: number) {
  if (typeof p.cancelAndHoldAtTime === "function") p.cancelAndHoldAtTime(t);
  else {
    const v = p.value;
    p.cancelScheduledValues(t);
    p.setValueAtTime(v, t);
  }
}

/** 작은 방 잔향(나무 오두막 느낌) — 잡음을 지수로 줄이고 뒤로 갈수록 어둡게 */
function makeIR(ctx: BaseAudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 2.0);
  const buf = ctx.createBuffer(2, len, sr);
  let seed = 12345;
  const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296) * 2 - 1;
  const pre = Math.floor(sr * 0.012);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / sr;
      lp += (0.5 * Math.exp(-t / 0.3) + 0.07) * (rnd() - lp);
      d[i] = lp * Math.exp(-t / 0.27);
    }
  }
  return buf;
}

export function startMusicBox(
  ctx: AudioContext,
  opts: { volume?: number; dest?: AudioNode } = {},
): { stop(fadeMs?: number): void; setVolume(v: number): void } {
  const clamp01 = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
  const plan = planMedley();
  const nyq = ctx.sampleRate / 2;

  // 음 → bus → (마른 소리 + 잔향) → 압축기 → 볼륨 → 내보냄
  const bus = ctx.createGain();
  const dry = ctx.createGain();
  const verb = ctx.createConvolver();
  const wet = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  const vol = ctx.createGain();
  verb.buffer = makeIR(ctx);
  wet.gain.value = 0.32;
  comp.threshold.value = -8;
  comp.knee.value = 6;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.25;
  vol.gain.value = clamp01(opts.volume ?? 0.5);
  bus.connect(dry).connect(comp);
  bus.connect(verb).connect(wet).connect(comp);
  comp.connect(vol).connect(opts.dest ?? ctx.destination);

  // 튕김 끝의 「틱」에 쓰는 짧은 잡음
  const clickBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.01), ctx.sampleRate);
  {
    const d = clickBuf.getChannelData(0);
    let s = 777;
    for (let i = 0; i < d.length; i++) d[i] = ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296) * 2 - 1;
  }

  const live = new Set<AudioScheduledSourceNode>();
  const own = (src: AudioScheduledSourceNode, nodes: AudioNode[]) => {
    live.add(src);
    src.onended = () => {
      live.delete(src);
      for (const n of nodes) n.disconnect();
    };
  };
  // 같은 살을 다시 튕기면 앞 소리는 핀에 눌려 멎는다(오르골은 음마다 살이 하나)
  const ringing = new Map<number, { g: GainNode; srcs: AudioScheduledSourceNode[]; end: number }>();

  function pluck(t: number, midi: number, vel: number) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const k = Math.min(1, Math.max(0, (midi - 48) / 48)); // 0 = C3 · 1 = C7
    const dec = 2.6 - 1.8 * k; // −60 dB 까지(초): 낮은 음 2.6 · 높은 음 0.8
    const prev = ringing.get(midi);
    if (prev && prev.end > t) {
      prev.g.gain.setTargetAtTime(0, t, 0.008);
      for (const s of prev.srcs) {
        try {
          s.stop(t + 0.06);
        } catch {
          /* 이미 끝남 */
        }
      }
    }
    const ng = ctx.createGain();
    ng.gain.value = vel * NOTE * (1 - 0.3 * k);
    ng.connect(bus);
    const srcs: AudioScheduledSourceNode[] = [];
    let end = t;
    PARTIALS.forEach(([ratio, amp, ds], pi) => {
      if (f * ratio > nyq * 0.9) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const d = dec * ds;
      o.frequency.value = f * ratio;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + ATT);
      g.gain.setTargetAtTime(0, t + ATT, d / 6.9);
      o.connect(g).connect(ng);
      o.start(t);
      // −60 dB 에서 끊으면 조용한 자리에서 미세한 「톡」이 남는다 → −84 dB(1.4 배)까지 두고 끊는다
      o.stop(t + ATT + d * 1.4);
      own(o, pi === 0 ? [o, g, ng] : [o, g]);
      srcs.push(o);
      end = Math.max(end, t + ATT + d * 1.4);
    });
    // 「틱」: 4 ms 짧은 잡음, 높은 대역
    const c = ctx.createBufferSource();
    const bp = ctx.createBiquadFilter();
    const cg = ctx.createGain();
    c.buffer = clickBuf;
    bp.type = "bandpass";
    bp.frequency.value = Math.min(nyq * 0.8, f * 6);
    bp.Q.value = 0.9;
    cg.gain.setValueAtTime(0.12, t);
    cg.gain.exponentialRampToValueAtTime(0.0005, t + 0.005);
    c.connect(bp).connect(cg).connect(ng);
    c.start(t);
    c.stop(t + 0.008);
    own(c, [c, bp, cg]);
    srcs.push(c);
    ringing.set(midi, { g: ng, srcs, end });
  }

  // 미리 보기 스케줄러
  let origin = ctx.currentTime + plan.lead;
  let loop = 0;
  let i = 0;
  let lastNow = ctx.currentTime;
  let dead = false;
  const tick = () => {
    if (dead) return;
    const now = ctx.currentTime;
    // 탭이 숨어 타이머가 느려지면 그만큼 더 앞까지 예약한다
    const ahead = Math.min(1.6, Math.max(AHEAD, (now - lastNow) * 1.5 + 0.1));
    lastNow = now;
    for (;;) {
      const ev = plan.events[i];
      let t = origin + loop * plan.length + ev.t;
      if (t < now - 0.25) {
        // 많이 밀렸다(멈췄다 돌아옴) — 몰아 치지 않고 그 자리에서 이어 간다
        origin += now - t + 0.05;
        t = origin + loop * plan.length + ev.t;
      }
      if (t >= now + ahead) break;
      pluck(Math.max(t, now), ev.midi, ev.vel);
      if (++i >= plan.events.length) {
        i = 0;
        loop++;
      }
    }
  };
  tick();
  const timer = setInterval(tick, TICK_MS);

  function cleanup() {
    for (const s of live) {
      try {
        s.stop();
      } catch {
        /* 이미 멈춤 */
      }
      s.disconnect();
    }
    live.clear();
    ringing.clear();
    for (const n of [bus, dry, verb, wet, comp, vol]) n.disconnect();
  }

  return {
    stop(fadeMs = 600) {
      if (dead) return;
      dead = true;
      clearInterval(timer);
      const now = ctx.currentTime;
      const f = Math.max(0, fadeMs) / 1000;
      hold(vol.gain, now);
      if (f > 0) vol.gain.linearRampToValueAtTime(0, now + f);
      else vol.gain.setValueAtTime(0, now);
      setTimeout(cleanup, f * 1000 + 100);
    },
    setVolume(v: number) {
      if (dead) return;
      const now = ctx.currentTime;
      hold(vol.gain, now);
      vol.gain.setTargetAtTime(clamp01(v), now, 0.08);
    },
  };
}
