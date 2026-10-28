// 실험실 랭킹 공통 규칙(순수 함수) — 이니셜·한마디 거르기, 정렬 점수, 날짜. 게임마다 다른 것(바퀴·점수 검사)은 각 게임 규칙 파일 몫.
// 저장하는 것은 이니셜·한마디·기록·날짜뿐(개인정보 없음).

export const SAY_MAX = 20;

// 링크·연락처 꼴: 주소, 도메인처럼 생긴 것, 긴 숫자(전화번호)
const LINK_RE = /(https?:|www\.|[a-z0-9-]+\.(com|net|org|kr|io|co|me|ly|gg|xyz|app|dev|link|site|shop)\b|@[a-z0-9_]{3,}|\d[\d\s-]{7,}\d)/i;
// 욕설 — 붙여 쓰거나 띄어 쓴 것도 잡게 공백·기호를 지운 글에서 찾는다. 목록은 짧게 두고 남는 것은 Dean 이 지운다
const BAD = ["시발", "씨발", "ㅅㅂ", "ㅆㅂ", "병신", "ㅂㅅ", "개새", "좆", "존나", "닥쳐", "fuck", "shit", "bitch", "cunt", "nigg", "fag"];
const BAD_NAMES = new Set(["FUK", "FCK", "SEX", "ASS", "KKK", "NIG", "FAG", "CUM", "TIT", "DIK", "SHT"]);

function squash(s: string) {
  return s.toLowerCase().replace(/[\s\p{P}\p{S}_]/gu, "");
}

export type NameSay = { ok: true; name: string; say: string } | { ok: false; reason: string };

/** 이니셜(대문자·숫자 3글자)과 한마디(20자, 링크·욕설·꺾쇠 없음)를 거른다 */
export function checkNameSay(b: Record<string, unknown>): NameSay {
  const name = typeof b.name === "string" ? b.name : "";
  const say = typeof b.say === "string" ? b.say.replace(/\s+/g, " ").trim() : "";
  if (!/^[A-Z0-9]{3}$/.test(name)) return { ok: false, reason: "name" };
  if (BAD_NAMES.has(name)) return { ok: false, reason: "name-bad" };
  if ([...say].length > SAY_MAX) return { ok: false, reason: "say-long" };
  if (/[<>\u0000-\u001f\u007f]/.test(say)) return { ok: false, reason: "say-char" };
  if (LINK_RE.test(say)) return { ok: false, reason: "say-link" };
  if (BAD.some(w => squash(say).includes(w))) return { ok: false, reason: "say-bad" };
  return { ok: true, name, say };
}

/** 정렬 점수: 기록이 클수록 위, 같으면 먼저 등록한 사람이 위. 초 단위라 기록 90만까지 2^53 안 */
export function orderScore(record: number, nowMs: number) {
  return record * 1e10 + (1e10 - 1 - (Math.floor(nowMs / 1000) % 1e10));
}

/** 날짜는 한국 시간 MM-DD */
export function kstDate(nowMs: number) {
  const d = new Date(nowMs + 9 * 3600 * 1000);
  return String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
}
