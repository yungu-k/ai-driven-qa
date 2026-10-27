// 릴리스 디펜스 랭킹 — 서버가 받는 값의 규칙(순수 함수). 서버 src/pages/api/defense-rank.ts 와 단위 테스트가 같이 쓴다.
// 저장하는 것은 이니셜·한마디·바퀴·날짜뿐(개인정보 없음). 거르는 것: 꼴이 틀린 값, 링크, 욕설, 말이 안 되는 기록.

export const MAX_LAP = 999;
/** 한 바퀴(맵 5장, 46웨이브)를 엔진 시계로 이보다 빨리 깰 수는 없다고 본다. 기준 봇 46분·조기 호출 전부 써도 30분대라 넉넉히 낮춘 값 */
export const MIN_SIM_SEC_PER_LAP = 600;
export const SAY_MAX = 20;

export type Entry = { name: string; lap: number; say: string; simSec: number };
export type Row = { id: string; name: string; lap: number; say: string; date: string };

// 링크·연락처 꼴: 주소, 도메인처럼 생긴 것, 긴 숫자(전화번호)
const LINK_RE = /(https?:|www\.|[a-z0-9-]+\.(com|net|org|kr|io|co|me|ly|gg|xyz|app|dev|link|site|shop)\b|@[a-z0-9_]{3,}|\d[\d\s-]{7,}\d)/i;
// 욕설 — 붙여 쓰거나 띄어 쓴 것도 잡게 공백·기호를 지운 글에서 찾는다. 목록은 짧게 두고 남는 것은 Dean 이 지운다
const BAD = ["시발", "씨발", "ㅅㅂ", "ㅆㅂ", "병신", "ㅂㅅ", "개새", "좆", "존나", "닥쳐", "fuck", "shit", "bitch", "cunt", "nigg", "fag"];
const BAD_NAMES = new Set(["FUK", "FCK", "SEX", "ASS", "KKK", "NIG", "FAG", "CUM", "TIT", "DIK", "SHT"]);

function squash(s: string) {
  return s.toLowerCase().replace(/[\s\p{P}\p{S}_]/gu, "");
}

export type Check = { ok: true; entry: Entry } | { ok: false; reason: string };

export function checkEntry(body: unknown): Check {
  if (!body || typeof body !== "object") return { ok: false, reason: "shape" };
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name : "";
  const say = typeof b.say === "string" ? b.say.replace(/\s+/g, " ").trim() : "";
  const lap = b.lap, simSec = b.simSec;
  if (!/^[A-Z0-9]{3}$/.test(name)) return { ok: false, reason: "name" };
  if (BAD_NAMES.has(name)) return { ok: false, reason: "name-bad" };
  if (typeof lap !== "number" || !Number.isInteger(lap) || lap < 0 || lap > MAX_LAP) return { ok: false, reason: "lap" };
  if (typeof simSec !== "number" || !Number.isFinite(simSec) || simSec < 0) return { ok: false, reason: "simSec" };
  if ([...say].length > SAY_MAX) return { ok: false, reason: "say-long" };
  if (/[<>\u0000-\u001f\u007f]/.test(say)) return { ok: false, reason: "say-char" };
  if (LINK_RE.test(say)) return { ok: false, reason: "say-link" };
  const sq = squash(say);
  if (BAD.some(w => sq.includes(w))) return { ok: false, reason: "say-bad" };
  if (simSec < lap * MIN_SIM_SEC_PER_LAP) return { ok: false, reason: "too-fast" };
  return { ok: true, entry: { name, lap, say, simSec } };
}

/** 정렬 점수: 바퀴가 높을수록 위, 같은 바퀴면 먼저 등록한 사람이 위(규격 12절 5). 초 단위라 바퀴 999 에서도 2^53 안 */
export function scoreOf(lap: number, nowMs: number) {
  return lap * 1e10 + (1e10 - 1 - (Math.floor(nowMs / 1000) % 1e10));
}

/** 날짜는 한국 시간 MM-DD */
export function kstDate(nowMs: number) {
  const d = new Date(nowMs + 9 * 3600 * 1000);
  return String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
}
