// 불꽃놀이 효과음 — 음악 없이 터지는 소리만. 파일 없이 Web Audio 로 합성한다.
// fireworks.ts 의 onEvent 신호를 받아:
//   launch  = 통에서 쏘는 「퉁」 + 올라가는 쉿 소리(셋에 하나꼴로 휘파람)
//   burst   = 낮은 쿵(음이 뚝 떨어지는 사인파) + 잡음 몸통 + 「딱」 + 우르릉 꼬리 + 잔향. big·알갱이 수(n)가 크면 더 크고 길게.
//             willow·palm 은 부드럽고 길게 사그라드는 「지지직」 꼬리.
//   crackle = 작은 「따닥」 묶음(n 개, 상한 24)
// 높이 터질수록(y 가 작을수록) 멀다 → 소리가 늦게(0.08–0.45 s) 오고 조금 둔하다. 좌우는 x 로(±0.6).
// 동시에 내는 소리 수 상한(터짐 10 · 따닥 6 · 발사 6) + 압축기 → 피날레(3.5 s 에 16발)에도 최고값 0.8 아래.
// setMuffled(true) = 「벽 너머」: 저역 통과 620 Hz + 0.35 배로 0.35 s 동안 부드럽게 넘어간다.
// 검사: tmp/lab-pixel/audio-rig.cjs

export type FireworksEvent = {
  kind: "launch" | "burst" | "crackle";
  /** 화면 비율 0–1 */
  x: number;
  y: number;
  big: boolean;
  /** peony · pistil · chrys · ring · double · willow · palm · crossette · strobe · crackle · shift */
  type: string;
  /** burst = 알갱이 수 · crackle = 동시에 터진 잔불 수 */
  n?: number;
};

/** 검사용 현황: 지금 울리는 소리 수와 누적 수 */
export type FireworksVoices = {
  burst: number;
  crackle: number;
  launch: number;
  /** 상한에 걸려 가장 오래된 터짐을 끊은 수 */
  stolen: number;
  /** 상한에 걸린 따닥(다음 묶음에 합친다)·발사(소리 없이 넘긴다) 수 */
  dropped: number;
  launches: number;
  whistles: number;
};

const CAP_BURST = 10;
const CAP_CRACKLE = 6;
const CAP_LAUNCH = 6;
const POPS_MAX = 24;
const LEVEL = 0.8; // 전체 크기
const MUFFLE_HZ = 620;
const MUFFLE_GAIN = 0.35;
const MUFFLE_S = 0.35;

type Voice = {
  end: number;
  input: AudioNode;
  out: GainNode;
  srcs: AudioScheduledSourceNode[];
  nodes: AudioNode[];
  left: number;
  dead: boolean;
};

function hold(p: AudioParam, t: number) {
  if (typeof p.cancelAndHoldAtTime === "function") p.cancelAndHoldAtTime(t);
  else {
    const v = p.value;
    p.cancelScheduledValues(t);
    p.setValueAtTime(v, t);
  }
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function createFireworksSound(
  ctx: AudioContext,
  opts: { dest?: AudioNode } = {},
): { onEvent(e: FireworksEvent): void; setMuffled(on: boolean): void; stop(): void; _voices(): FireworksVoices } {
  const sr = ctx.sampleRate;
  let seed = 20261127;
  const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

  // 흰 잡음 3 s(공용, 시작 자리를 바꿔 쓴다)
  const noise = ctx.createBuffer(1, sr * 3, sr);
  {
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
  }

  // 바깥 울림: 건물에 몇 번 되튀는 메아리 + 어둡게 사그라드는 꼬리
  const ir = ctx.createBuffer(2, Math.floor(sr * 2.6), sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      lp += 0.12 * (rnd() * 2 - 1 - lp);
      d[i] = lp * Math.exp(-t / 0.5) * (t < 0.02 ? t / 0.02 : 1);
    }
    // 메아리도 어둡게(한 극 저역 통과 ≈ 1 kHz) — 흰 잡음 그대로 두면 먼 불꽃(잔향 많이 보냄)이 오히려 밝아진다(11-27 검사 F6 에서 잡힘)
    for (const [at, a] of [[0.11, 0.5], [0.24, 0.35], [0.43, 0.22], [0.71, 0.14]]) {
      const i0 = Math.floor((at + ch * 0.017) * sr);
      let e = 0;
      for (let k = 0; k < 700; k++) {
        e += 0.15 * (rnd() * 2 - 1 - e);
        d[i0 + k] += a * Math.exp(-k / 140) * e;
      }
    }
  }

  // 사슬: 소리들 → bus(+잔향) → 압축기 → 열림/벽(저역 통과 2단 + 줄임) 섞기 → out → 내보냄
  const bus = ctx.createGain();
  const verb = ctx.createConvolver();
  const verbOut = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  const open = ctx.createGain();
  const lp1 = ctx.createBiquadFilter();
  const lp2 = ctx.createBiquadFilter();
  const wall = ctx.createGain();
  const out = ctx.createGain();
  verb.buffer = ir;
  verbOut.gain.value = 0.55;
  comp.threshold.value = -10;
  comp.knee.value = 6;
  comp.ratio.value = 8;
  comp.attack.value = 0.002;
  comp.release.value = 0.3;
  lp1.type = lp2.type = "lowpass";
  lp1.frequency.value = lp2.frequency.value = MUFFLE_HZ;
  lp1.Q.value = 0.6;
  lp2.Q.value = 0.5;
  wall.gain.value = 0;
  out.gain.value = LEVEL;
  verb.connect(verbOut).connect(bus);
  bus.connect(comp);
  comp.connect(open).connect(out);
  comp.connect(lp1).connect(lp2).connect(wall).connect(out);
  out.connect(opts.dest ?? ctx.destination);
  const chain: AudioNode[] = [bus, verb, verbOut, comp, open, lp1, lp2, wall, out];

  const bursts: Voice[] = [];
  const crackles: Voice[] = [];
  const launchV: Voice[] = [];
  let stolen = 0;
  let dropped = 0;
  let launches = 0;
  let whistles = 0;
  let muffled = false;
  let dead = false;

  const prune = (now: number) => {
    for (const list of [bursts, crackles, launchV]) {
      for (let i = list.length - 1; i >= 0; i--) if (list[i].dead || list[i].end < now) list.splice(i, 1);
    }
  };

  /** 소리 한 덩이: 소스들 → air(멀면 둔하게) → out(끊을 때 줄임) → 좌우 → bus + 잔향 */
  function voice(list: Voice[], x: number, dist: number, end: number, send: number): Voice {
    const air = ctx.createBiquadFilter();
    const vout = ctx.createGain();
    const pan = ctx.createStereoPanner();
    const sg = ctx.createGain();
    air.type = "lowpass";
    air.frequency.value = 9000 - 7000 * dist; // 가까우면 9 kHz · 멀면 2 kHz
    air.Q.value = 0.5;
    vout.gain.value = 1 - 0.35 * dist;
    pan.pan.value = clamp((x - 0.5) * 1.2, -0.6, 0.6);
    sg.gain.value = send;
    air.connect(vout).connect(pan);
    pan.connect(bus);
    pan.connect(sg).connect(verb);
    const v: Voice = { end, input: air, out: vout, srcs: [], nodes: [air, vout, pan, sg], left: 0, dead: false };
    list.push(v);
    return v;
  }

  function add(v: Voice, s: AudioScheduledSourceNode, fx: AudioNode[], t0: number, t1: number) {
    let n: AudioNode = s;
    for (const f of fx) n = n.connect(f);
    n.connect(v.input);
    v.srcs.push(s);
    v.nodes.push(s, ...fx);
    v.left++;
    s.onended = () => {
      if (--v.left === 0) for (const x of v.nodes) x.disconnect();
    };
    s.start(t0);
    s.stop(t1);
  }

  const noiseSrc = () => {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    s.loopStart = 0;
    s.loopEnd = noise.duration;
    s.playbackRate.value = 1;
    return s;
  };
  // 잡음은 시작 자리를 흔들어 매번 다른 결로
  const startNoise = (v: Voice, fx: AudioNode[], t0: number, t1: number) => {
    const s = noiseSrc();
    let n: AudioNode = s;
    for (const f of fx) n = n.connect(f);
    n.connect(v.input);
    v.srcs.push(s);
    v.nodes.push(s, ...fx);
    v.left++;
    s.onended = () => {
      if (--v.left === 0) for (const x of v.nodes) x.disconnect();
    };
    s.start(t0, rnd() * 2.5);
    s.stop(t1);
  };

  const gainEnv = (peak: number, t: number, att: number, tau: number) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + att);
    g.gain.setTargetAtTime(0, t + att, tau);
    return g;
  };
  const filt = (type: BiquadFilterType, f: number, q: number) => {
    const b = ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  };

  // 따닥 묶음 소리판(개수별로 한 번 만들어 둔다): 0.2 s 안에 n 번, 서로 6 ms 이상 떨어진 1–2 ms 날카로운 터짐
  const popCache = new Map<string, AudioBuffer>();
  function popBuf(n: number): AudioBuffer {
    const key = n + ":" + (rnd() < 0.5 ? 0 : 1);
    const hit = popCache.get(key);
    if (hit) return hit;
    const b = ctx.createBuffer(1, Math.floor(sr * 0.26), sr);
    const d = b.getChannelData(0);
    const slot = 0.2 / n;
    for (let k = 0; k < n; k++) {
      const at = Math.floor((k * slot + rnd() * Math.max(0, slot - 0.006)) * sr);
      const a = 0.5 + 0.5 * rnd();
      for (let j = 0; j < sr * 0.003 && at + j < d.length; j++) d[at + j] += a * (j === 0 ? 1 : (rnd() * 2 - 1) * Math.exp(-j / (sr * 0.00035)));
    }
    popCache.set(key, b);
    return b;
  }

  // 지지직 꼬리 소리판: 드문드문 작은 터짐 + 엷은 쉬익, 뒤로 갈수록 성기고 작아진다
  const sizzleBufs: AudioBuffer[] = [];
  function sizzleBuf(): AudioBuffer {
    if (sizzleBufs.length < 2) {
      const len = Math.floor(sr * 2.8);
      const b = ctx.createBuffer(1, len, sr);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const fade = Math.exp(-t / 0.9) * Math.min(1, t / 0.15);
        d[i] = (rnd() * 2 - 1) * 0.12 * fade;
        if (rnd() < 0.0016 * fade) {
          const a = 0.4 + 0.6 * rnd();
          for (let j = 0; j < 60 && i + j < len; j++) d[i + j] += a * fade * (rnd() * 2 - 1) * Math.exp(-j / 14);
        }
      }
      sizzleBufs.push(b);
      return b;
    }
    return sizzleBufs[rnd() < 0.5 ? 0 : 1];
  }

  const distOf = (y: number) => clamp((0.85 - y) / 0.75, 0, 1);

  function kill(v: Voice, now: number) {
    v.dead = true;
    hold(v.out.gain, now);
    v.out.gain.linearRampToValueAtTime(0, now + 0.06);
    for (const s of v.srcs) {
      try {
        s.stop(now + 0.08);
      } catch {
        /* 이미 끝남 */
      }
    }
  }

  function burst(e: FireworksEvent) {
    const now = ctx.currentTime;
    prune(now);
    if (bursts.length >= CAP_BURST) {
      kill(bursts.shift()!, now);
      stolen++;
    }
    const dist = distOf(e.y);
    const t = now + 0.08 + 0.37 * dist;
    const size = clamp((e.n ?? 260) / 300, 0.6, 1.6) * (e.big ? 1.3 : 1);
    const amp = Math.sqrt(size);
    const soft = e.type === "willow" || e.type === "palm";
    const tail = soft ? 1.5 : 1;
    const v = voice(bursts, e.x, dist, t + 3.4 * tail, 0.3 + 0.35 * dist);

    // 쿵: 음이 뚝 떨어지는 사인파
    const thump = (at: number, a: number) => {
      const o = ctx.createOscillator();
      const f0 = (e.big ? 82 : 102) * (0.92 + rnd() * 0.16);
      o.frequency.setValueAtTime(f0, at);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.38, at + 0.35);
      add(v, o, [gainEnv(a, at, 0.004, (e.big ? 0.26 : 0.18) * tail)], at, at + 1.6 * tail);
    };
    thump(t, (soft ? 0.3 : 0.42) * amp);
    if (e.type === "double") thump(t + 0.09, 0.28 * amp);

    // 몸통: 닫히는 저역 통과 잡음
    const body = filt("lowpass", 3200 * (soft ? 0.7 : 1), 0.8);
    body.frequency.setValueAtTime(3200 * (soft ? 0.7 : 1), t);
    body.frequency.exponentialRampToValueAtTime(260, t + 0.5 * tail);
    startNoise(v, [body, gainEnv(0.36 * amp * (soft ? 0.75 : 1), t, 0.002, 0.11 * tail)], t, t + 1.1 * tail);

    // 딱: 첫 순간의 날카로운 잡음(멀면 air 가 무디게)
    startNoise(v, [filt("highpass", 1500, 0.7), gainEnv(0.3 * amp * (soft ? 0.6 : 1), t, 0.0008, 0.01)], t, t + 0.12);

    // 우르릉 꼬리
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0, t);
    rg.gain.linearRampToValueAtTime(0.15 * amp, t + 0.06);
    rg.gain.setTargetAtTime(0, t + 0.06, 0.55 * tail);
    startNoise(v, [filt("lowpass", 170, 0.7), rg], t, t + 3.3 * tail);

    // 꼬리 결: 버들·야자 = 길게 지지직 · 국화·점멸 = 엷게 · 갈라짐 = 몇 번 따닥
    const sizzle = (at: number, a: number, hp: number) => {
      const s = ctx.createBufferSource();
      s.buffer = sizzleBuf();
      add(v, s, [filt("highpass", hp, 0.6), gainEnv(a, at, 0.05, 1.2)], at, at + 2.8);
    };
    if (soft) sizzle(t + 0.25, 0.22 * amp, 2200);
    else if (e.type === "chrys" || e.type === "strobe") sizzle(t + 0.2, 0.1 * amp, 3000);
    if (e.type === "crossette") {
      const s = ctx.createBufferSource();
      s.buffer = popBuf(6);
      add(v, s, [filt("highpass", 1400, 0.7), gainEnv(0.35, t + 0.45, 0.001, 0.5)], t + 0.45, t + 0.75);
    }
  }

  let crPend = 0;
  let crLast = -1;
  function crackle(e: FireworksEvent) {
    const now = ctx.currentTime;
    crPend += Math.max(1, e.n ?? 6);
    if (now - crLast < 0.045) return; // 프레임마다 오는 신호는 모아서 다음 신호에 한꺼번에
    prune(now);
    if (crackles.length >= CAP_CRACKLE) {
      dropped++; // 버리지 않고 모아 둔다 → 다음 묶음이 그만큼 촘촘해진다(상한 24)
      return;
    }
    const n = Math.min(POPS_MAX, Math.round(crPend));
    crPend = 0;
    crLast = now;
    const dist = distOf(e.y);
    const t = now + 0.08 + 0.37 * dist;
    const v = voice(crackles, e.x, dist, t + 0.35, 0.2 + 0.3 * dist);
    const s = ctx.createBufferSource();
    s.buffer = popBuf(n);
    const g = ctx.createGain();
    g.gain.value = 0.45;
    add(v, s, [filt("highpass", 1400, 0.7), g], t, t + 0.3);
  }

  function launch(e: FireworksEvent) {
    const now = ctx.currentTime;
    prune(now);
    launches++;
    if (launchV.length >= CAP_LAUNCH) {
      dropped++;
      return;
    }
    const whistle = rnd() < 1 / 3;
    if (whistle) whistles++;
    const t = now + 0.03;
    const rise = e.big ? 1.5 : 1.2;
    const v = voice(launchV, e.x, 0.1, t + rise + 0.6, 0.15);
    // 퉁: 통에서 쏘아 올리는 소리
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.12);
    add(v, o, [gainEnv(0.2, t, 0.003, 0.04)], t, t + 0.4);
    startNoise(v, [filt("lowpass", 800, 0.7), gainEnv(0.12, t, 0.002, 0.03)], t, t + 0.25);
    // 쉿: 올라가며 멀어진다(밝은 대역이 내려가고 작아진다)
    const bp = filt("bandpass", 2600, 1.1);
    bp.frequency.setValueAtTime(2600, t);
    bp.frequency.exponentialRampToValueAtTime(1400, t + rise);
    const hg = ctx.createGain();
    hg.gain.setValueAtTime(0, t);
    hg.gain.linearRampToValueAtTime(whistle ? 0.025 : 0.05, t + 0.12);
    hg.gain.setTargetAtTime(0, t + rise * 0.6, rise * 0.25);
    startNoise(v, [bp, hg], t, t + rise + 0.5);
    // 휘파람: 올라가는 음 + 살짝 떨림
    if (whistle) {
      const w = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      w.frequency.setValueAtTime(1150, t);
      w.frequency.exponentialRampToValueAtTime(2700, t + rise * 0.9);
      lfo.frequency.value = 17;
      depth.gain.value = 18;
      lfo.connect(depth).connect(w.frequency); // 떨림은 음높이에만 — 소리 길로는 안 보낸다
      const wg = ctx.createGain();
      wg.gain.setValueAtTime(0, t);
      wg.gain.linearRampToValueAtTime(0.045, t + 0.1);
      wg.gain.setTargetAtTime(0, t + rise * 0.85, 0.08);
      add(v, w, [wg], t, t + rise + 0.4);
      v.srcs.push(lfo);
      v.nodes.push(lfo, depth);
      lfo.start(t);
      lfo.stop(t + rise + 0.4);
    }
  }

  return {
    onEvent(e: FireworksEvent) {
      if (dead || ctx.state === "closed") return;
      if (e.kind === "burst") burst(e);
      else if (e.kind === "crackle") crackle(e);
      else if (e.kind === "launch") launch(e);
    },
    setMuffled(on: boolean) {
      if (dead || on === muffled) return;
      muffled = on;
      const now = ctx.currentTime;
      hold(open.gain, now);
      hold(wall.gain, now);
      open.gain.linearRampToValueAtTime(on ? 0 : 1, now + MUFFLE_S);
      wall.gain.linearRampToValueAtTime(on ? MUFFLE_GAIN : 0, now + MUFFLE_S);
    },
    stop() {
      if (dead) return;
      dead = true;
      const now = ctx.currentTime;
      hold(out.gain, now);
      out.gain.linearRampToValueAtTime(0, now + 0.04);
      const all = [...bursts, ...crackles, ...launchV];
      for (const v of all) {
        for (const s of v.srcs) {
          try {
            s.stop(now + 0.05);
          } catch {
            /* 이미 끝남 */
          }
        }
      }
      bursts.length = crackles.length = launchV.length = 0;
      setTimeout(() => {
        for (const v of all) for (const x of v.nodes) x.disconnect();
        for (const x of chain) x.disconnect();
      }, 100);
    },
    _voices() {
      if (!dead) prune(ctx.currentTime);
      return { burst: bursts.length, crackle: crackles.length, launch: launchV.length, stolen, dropped, launches, whistles };
    },
  };
}
