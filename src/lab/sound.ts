// 실험실 효과음 — 파일 없이 Web Audio 로 합성한다(규격 A7·B5).
// 켬/끔은 실험실 전체가 한 값(localStorage "lab.sound")을 쓴다. 기본은 켜짐(Dean 10-27):
// 값이 없으면 켜짐, "0" 일 때만 꺼짐.
// 브라우저는 사용자가 누르기 전엔 소리를 막는다 → 누르는 자리(pointerdown·click)에서 unlock() 을 먼저 부른다.

const KEY = "lab.sound";

export function isSoundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* 저장이 막혀도 이번 페이지에서는 따른다 */
  }
  memo = on;
  if (on) unlock();
}

let memo: boolean | null = null;
const on = () => (memo ??= isSoundOn());

let ctx: AudioContext | null = null;

/** 사용자 조작 안에서 부른다. 소리를 낼 준비(AudioContext 생성·재개) */
export function unlock() {
  if (!on()) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

type Wave = OscillatorType;

function tone(freq: number, ms: number, opts: { type?: Wave; gain?: number; to?: number; at?: number } = {}) {
  if (!on() || !ctx) return;
  const { type = "square", gain = 0.12, to, at = 0 } = opts;
  const t = ctx.currentTime + at / 1000;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + ms / 1000);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + ms / 1000 + 0.02);
}

// 규격 A7 의 음 — 사각파·삼각파 짧은 소리, 음량 0.15 이하
export const sfx = {
  /** 동전: 「띠링」 */
  coin() {
    tone(988, 60);
    tone(1319, 120, { at: 60 });
  },
  /** 맞힘 */
  hit() {
    tone(660, 40);
  },
  /** 큰 맞힘(황금 버그·합치기 큰 수) */
  gold() {
    tone(660, 50);
    tone(990, 90, { at: 50 });
  },
  /** 실수: 내려가는 소리 */
  miss() {
    tone(220, 150, { to: 110 });
  },
  /** 카운트다운 한 칸 */
  tick() {
    tone(440, 60, { type: "triangle", gain: 0.1 });
  },
  /** 시작 */
  start() {
    tone(880, 120, { type: "triangle", gain: 0.1 });
  },
  /** 결과: C5 E5 G5 C6 */
  result() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 80, { type: "triangle", gain: 0.1, at: i * 80 }));
  },
  /** 유리 깨지는 소리(B5 대안): 흰 잡음 0.4 s + 3–6 kHz 대역 + 높은 「팅」 몇 개 */
  glass() {
    if (!on() || !ctx) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.45);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 4200;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(t);
    for (let k = 0; k < 5; k++) {
      tone(2400 + Math.random() * 2800, 120 + Math.random() * 160, {
        type: "sine",
        gain: 0.05,
        at: 20 + Math.random() * 260,
      });
    }
  },
};
