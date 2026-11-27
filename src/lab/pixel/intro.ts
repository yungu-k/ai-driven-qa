// 실험실 첫 화면 쇼 — 밤하늘 불꽃놀이 약 20초 → 갤러리(2026-11-27 Dean, docs/lab-pixel-brief.md 「흐름」).
// 상태는 <html> 클래스로만 알린다(겉모양·시간표는 전시실 CSS 몫, design 규격 docs/lab-pixel-spec.md 3절):
//   lab-show  쇼 중 — 전시실은 숨어 있다
//   lab-lit   전시실이 켜졌다(벽 → 제목 → 작품 조명 차례는 이 클래스가 붙는 순간 시작, onIntroEnd = 0)
//   lab-fast  쇼를 건너뛰었다 — 같은 차례, 시간 0.4배
//   lab-still 쇼 없이 다 켠 상태로(작품에서 돌아옴·이 탭에서 두 번째·움직임 줄이기)
// 쇼를 여는 때: 와장창으로 왔을 때(sessionStorage "lab-boot" = "1") 또는 이 탭에서 처음 연 /lab/.
// 쇼 중 누르기(click)·Esc·Enter·Space → 바로 전시실. 갤러리가 열린 뒤 불꽃놀이는 뒤에서 조용히(setQuiet) 이어 간다.
import { mount } from "@/lab/pixel/fireworks";
import { fireworksAudio } from "@/lab/pixel/sound-bridge";

const SEEN = "lab.intro.seen";
/** onIntroEnd 가 안 오는 경우(탭이 숨어 rAF 가 멈췄다 등) 대비 — 쇼는 이보다 길어지지 않는다 */
const INTRO_MAX_MS = 24000;

function readKey(name: string, remove = false): string | null {
  try {
    const v = sessionStorage.getItem(name);
    if (remove) sessionStorage.removeItem(name);
    return v;
  } catch {
    return null;
  }
}
function writeKey(name: string, v: string) {
  try {
    sessionStorage.setItem(name, v);
  } catch {
    /* 저장소가 막힌 브라우저 — 매번 쇼를 연다 */
  }
}

export type Intro = { stop(): void; opened(): boolean };

export function startLabIntro(host: HTMLElement): Intro {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const boot = readKey("lab-boot", true);
  const seen = readKey(SEEN) === "1";
  writeKey(SEEN, "1");
  const show = !reduce && (boot === "1" || !seen);

  let isOpen = false;
  let timer = 0;
  // 불꽃 소리(11-27 Dean 「터지는 소리만」): 쇼 동안은 그대로, 전시실이 켜지면 벽 너머처럼 먹먹하게.
  // 브라우저가 누름 전 소리를 막으므로 쇼를 건너뛰는 누름이 소리를 깨운다(안 누르면 조용한 쇼)
  const snd = fireworksAudio();
  const art = mount(host, { mode: show ? "intro" : "loop", reduce, onIntroEnd: () => open(), onEvent: snd.onEvent });

  function open(how: "show" | "fast" | "still" = "show") {
    if (isOpen) return;
    isOpen = true;
    window.clearTimeout(timer);
    document.removeEventListener("click", skip, true);
    document.removeEventListener("keydown", skip, true);
    art.setQuiet(true);
    snd.setMuffled(true);
    if (how !== "show") root.classList.add(`lab-${how}`);
    void root.offsetWidth; // 빠르기 클래스를 먼저 계산시켜야 전환 시간이 그 값으로 돈다
    root.classList.remove("lab-show");
    root.classList.add("lab-lit");
  }
  function skip(e: Event) {
    if (e instanceof KeyboardEvent && !["Escape", "Enter", " "].includes(e.key)) return;
    // pointerdown 이 아니라 click 에서 연다: pointerdown 에서 열면 손을 뗀 자리에 막 나타난 썸네일이 click 을 받아
    // 작품으로 들어가 버린다(옛 부팅 화면 리그 실측). 쇼 중엔 갤러리가 누름을 안 받으니 이 click 은 하늘에 떨어진다
    e.preventDefault();
    e.stopPropagation();
    open("fast");
  }

  if (show) {
    root.classList.add("lab-show");
    document.addEventListener("click", skip, true);
    document.addEventListener("keydown", skip, true);
    timer = window.setTimeout(() => open(), INTRO_MAX_MS);
  } else {
    open("still");
  }

  return {
    stop() {
      window.clearTimeout(timer);
      document.removeEventListener("click", skip, true);
      document.removeEventListener("keydown", skip, true);
      art.stop();
      snd.stop();
    },
    opened: () => isOpen,
  };
}
