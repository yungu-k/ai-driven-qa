// 작품 ↔ 소리 잇기(2026-11-27 Dean: 스노우볼 = 오르골 캐롤, 불꽃놀이 = 터지는 소리만). docs/lab-pixel-brief.md
// - 소리는 src/lab/sound.ts 의 AudioContext 하나를 같이 쓰고, 실험실 소리 켬/끔(localStorage "lab.sound")을 따른다.
// - 브라우저는 사용자가 누르기 전 소리를 막는다. 활성화로 쳐 주는 이벤트(HTML 규격: 터치는 pointerup·touchend, 마우스는 pointerdown,
//   그리고 click·keydown)에서 unlock() 하고 그때 소리를 연다. 터치의 pointerdown 은 활성화가 아니다 — 그래서 여러 개를 듣는다.
// - 곡·음색은 src/lab/pixel/musicbox.ts, 불꽃 소리는 src/lab/pixel/fireworks-sound.ts(둘 다 파일 없이 합성, 저작권 끝난 전통 캐롤만).
import { audio, onSoundChange, unlock } from "@/lab/sound";
import { createFireworksSound, type FireworksEvent } from "@/lab/pixel/fireworks-sound";
import { startMusicBox } from "@/lab/pixel/musicbox";

const WAKE = ["pointerdown", "pointerup", "touchend", "click", "keydown"] as const;

function onFirstGestures(cb: () => void): () => void {
  const h = () => {
    unlock();
    cb();
  };
  WAKE.forEach(n => document.addEventListener(n, h, { capture: true, passive: true }));
  return () => WAKE.forEach(n => document.removeEventListener(n, h, { capture: true }));
}

/** 불꽃 소리: 작품 mount 의 onEvent 에 bridge.onEvent 를 넘긴다. 전시실 뒤(벽 너머)면 setMuffled(true) */
export function fireworksAudio() {
  let snd: ReturnType<typeof createFireworksSound> | null = null;
  let muffled = false;
  const get = () => {
    if (snd) return snd;
    const c = audio();
    if (!c || c.state !== "running") return null; // 아직 못 깨웠으면 소리 없이 지나간다(쌓아 두지 않는다)
    snd = createFireworksSound(c);
    snd.setMuffled(muffled);
    return snd;
  };
  const offGesture = onFirstGestures(() => void get());
  const offChange = onSoundChange(on => {
    if (on) return;
    snd?.stop();
    snd = null;
  });
  return {
    onEvent: (e: FireworksEvent) => get()?.onEvent(e),
    setMuffled(on: boolean) {
      muffled = on;
      snd?.setMuffled(on);
    },
    stop() {
      offGesture();
      offChange();
      snd?.stop();
      snd = null;
    },
  };
}

/** 오르골: 첫 누름에 시작해 끝없이. 소리를 끄면 멈추고 다시 켜면 처음부터. 탭이 숨으면 멈춘다 */
export function musicBoxAudio() {
  let box: ReturnType<typeof startMusicBox> | null = null;
  const start = () => {
    if (box || document.hidden) return;
    const c = audio();
    if (!c) return;
    if (c.state !== "running") {
      // 누름 안에서 resume() 을 막 부른 참이다 — 깨어나면 시작
      void c.resume().then(() => {
        if (!box && !document.hidden && audio()) box = startMusicBox(c);
      });
      return;
    }
    box = startMusicBox(c);
  };
  const halt = (fade = 600) => {
    box?.stop(fade);
    box = null;
  };
  const offGesture = onFirstGestures(start);
  const offChange = onSoundChange(on => (on ? start() : halt(300)));
  const onVis = () => (document.hidden ? halt(200) : undefined);
  document.addEventListener("visibilitychange", onVis);
  return {
    stop() {
      offGesture();
      offChange();
      document.removeEventListener("visibilitychange", onVis);
      halt(300);
    },
  };
}
