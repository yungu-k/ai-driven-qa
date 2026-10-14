#!/usr/bin/env python3
"""AI 티 측정기 — docs/WRITING_STANDARD.md §4-1 의 문지기 (N1·N2·N3·N4·N5·N9).

사용
  python3 scripts/ai-tells.py src/content/posts/<slug>.md [...]   상한 초과가 있으면 종료 코드 1
  python3 scripts/ai-tells.py -v <파일>                             적중 문장까지 찍는다
  python3 scripts/ai-tells.py --selftest                           더미로 빨강·초록 확인 — 붙이기 전 필수

재는 범위는 **산문만**이다. 프런트매터·코드 블록·인라인 코드·HTML 태그를 벗기고,
헤딩·표·이미지·인용·캡션(_…_)·목록 줄을 뺀다. 「천자」는 그 산문의 글자수(공백 포함)다.
2026-08-21 감사 때 캡션 한 덩어리가 1,937자 「문장」이 돼 리듬 지표를 오염시킨 전례가 있어 범위를 좁혀 둔다.

이 수치는 「AI 가 썼다」의 증거가 아니라 「기계처럼 읽힐 확률」이다(§4-1 주의). 넘겼다고 글이 틀린 것은 아니다.
N9(한 줄 펀치)는 **후보 수만** 센다 — 문단 끝 ≤18자 문장이 새 사실을 싣는지는 사람이 본다.
"""
import re
import sys
import statistics

# ── 상한 (WRITING_STANDARD §4-1) ─────────────────────────────────────────
CAP_BOLD_PER_K = 4.0      # N1
CAP_DASH_PER_K = 2.0      # N2 (2026-10-14 에 4→2)
CAP_ANIRA = 2             # N3 「아니라」 글당
CAP_MODERATE = 2          # [보통] 종류별 — 3회 이상이면 몰린 것
PUNCH_MAX_CHARS = 18      # N9 후보: 문단 끝 문장 길이

# N4 상투구 — [강]은 한 번도 안 된다
N4_STRONG = ["결론적으로", "요약하면", "정리하자면", "시사하는 바", "주목할 만", "매우 중요",
             "혁신적", "시대가 도래", "크게 세 가지", "다음과 같다", "살펴보자", "살펴볼까",
             "핵심은", "중요한 것은"]
# N4 [보통] — 같은 글에 3회 이상 몰릴 때
N4_MODERATE = ["관건은", "하는 이유다", "로 이어진다", "향후", "앞으로", "중장기적", "과제도 남아",
               "한계도 분명", "청사진", "적신호", "신호탄", "뿌리내", "놀라운", "압도적", "획기적",
               "할 때입니다", "할 시점"]
# N5 번역투 — [강]
N5_STRONG = ["에 있어", "가지고 있", "되어지", "지게 되", "있을 수 있"]
# N5 [보통]
N5_MODERATE = ["에 대해", "를 통해", "을 통해", "와 관련하여", "과 관련하여", "에 기반하", "바탕으로",
               "에 의해", "을 위해", "를 위해", "에서의", "으로의", "으로부터의", "넘어"]

# 「[」는 넣지 않는다 — 링크로 시작하는 문단도 산문이다. 넣었더니 그 문단이 통째로 안 세져,
# 교정 세션이 링크를 문장 뒤로 옮겨 수치를 맞추는 일이 생겼다(2026-10-14).
NON_PROSE_PREFIX = ("#", "|", "!", ">", "_", "-", "*", "→", "+", "<")


def prose_of(text):
    """산문 줄만 남긴다. 빈 줄은 문단 경계라 보존한다."""
    text = re.sub(r"^---.*?---\s*", "", text, count=1, flags=re.S)      # 프런트매터
    text = re.sub(r"```.*?```", "", text, flags=re.S)                   # 코드 블록
    text = re.sub(r"`[^`\n]*`", "", text)                               # 인라인 코드
    # HTML 블록(시리즈 상자 <div class="not-prose">…</div>)은 통째로 뺀다 — 태그만 벗기면
    # 그 안의 「시리즈 — AI 팀원 만들기」가 산문 대시로 잡혔다(2026-10-14, 교정 뒤에도 빨강이던 이유)
    # 안쪽부터 벗겨야 중첩 <div> 가 남지 않는다 — 게으른 매치는 첫 </div> 에서 멈춰 바깥 껍데기의 글을 남겼다.
    # <figure>(figcaption 포함)도 화면 장치라 뺀다(2026-10-14, 캡션 대시가 산문으로 잡혔다)
    for tag in ("div", "figure"):
        pat = re.compile(rf"<{tag}\b[^>]*>(?:(?!<{tag}\b).)*?</{tag}>", flags=re.S)
        while pat.search(text):
            text = pat.sub("", text)
    text = re.sub(r"<[^>]+>", "", text)                                 # 남은 HTML 태그
    out = []
    for line in text.split("\n"):
        s = line.strip()
        if not s:
            out.append("")
            continue
        if s.startswith(NON_PROSE_PREFIX) or re.match(r"^\d+\.\s", s):
            continue
        out.append(s)
    return "\n".join(out)


def sentences(para):
    return [s for s in re.split(r"(?<=[.?!])\s+", para.strip()) if s]


def measure(text):
    prose = prose_of(text)
    chars = len(prose.replace("\n", ""))
    k = max(chars, 1) / 1000.0
    paras = [p for p in re.split(r"\n\s*\n", prose) if p.strip()]

    bolds = re.findall(r"\*\*[^*\n]+\*\*", prose)
    dashes = prose.count("—")
    anira = len(re.findall(r"아니라", prose))

    def hits(words):
        return {w: len(re.findall(re.escape(w), prose)) for w in words if re.search(re.escape(w), prose)}

    n4s, n4m = hits(N4_STRONG), hits(N4_MODERATE)
    n5s, n5m = hits(N5_STRONG), hits(N5_MODERATE)

    punch = []
    for p in paras:
        ss = sentences(p)
        if len(ss) >= 2 and len(ss[-1]) <= PUNCH_MAX_CHARS:
            punch.append(ss[-1])

    lens = [len(s) for p in paras for s in sentences(p)]
    sd = statistics.pstdev(lens) if len(lens) >= 2 else 0.0

    viol = []
    if len(bolds) / k > CAP_BOLD_PER_K:
        viol.append(f"N1 볼드 {len(bolds)/k:.1f}/천자 > {CAP_BOLD_PER_K}")
    if dashes / k > CAP_DASH_PER_K:
        viol.append(f"N2 대시 {dashes/k:.1f}/천자 > {CAP_DASH_PER_K}")
    if anira > CAP_ANIRA:
        viol.append(f"N3 아니라 {anira} > {CAP_ANIRA}")
    for w, c in n4s.items():
        viol.append(f"N4[강] 「{w}」 {c}")
    for w, c in n4m.items():
        if c > CAP_MODERATE:
            viol.append(f"N4[보통] 「{w}」 {c} > {CAP_MODERATE}")
    for w, c in n5s.items():
        viol.append(f"N5[강] 「{w}」 {c}")
    for w, c in n5m.items():
        if c > CAP_MODERATE:
            viol.append(f"N5[보통] 「{w}」 {c} > {CAP_MODERATE}")

    return {
        "chars": chars, "bold": len(bolds), "bold_k": len(bolds) / k,
        "dash": dashes, "dash_k": dashes / k, "anira": anira,
        "n4": {**n4s, **n4m}, "n5": {**n5s, **n5m},
        "punch": punch, "sd": sd, "viol": viol,
    }


def report(name, m, verbose):
    flag = "RED " if m["viol"] else "ok  "
    print(f"{flag}{name:40} {m['chars']:6}자  볼드 {m['bold_k']:.1f}  대시 {m['dash_k']:.1f}  "
          f"아니라 {m['anira']}  펀치후보 {len(m['punch'])}  SD {m['sd']:.0f}")
    for v in m["viol"]:
        print(f"      ✗ {v}")
    if verbose:
        for w, c in {**m["n4"], **m["n5"]}.items():
            print(f"      · 「{w}」 {c}")
        for s in m["punch"]:
            print(f"      · 펀치 후보: {s}")


BAD = """
결론적으로 이 도구는 혁신적인 변화를 가져온다 — 단순한 도구가 아니라 동료다. **핵심은** 속도다 — 그리고 그것이 **중요한 것은** 당연하다.
이 결과는 우리에게 시사하는 바가 크다 — 주목할 만하다. 이 접근에 있어 우리는 경쟁력을 가지고 있다. 이를 통해 판단되어진다. 그 뿐만이 아니라 이게 핵심이다.

데이터에 대해 분석했다. 규제에 대해 논의했다. 성과에 대해 보고했다 — **놀라운** 결과다. 차이는 분명하다.
"""

GOOD = """
수집기는 세션이 남긴 기록만 읽는다. 이름을 묻지 않는다. 메시지를 보낸 쪽과 받은 쪽의 기록을 맞춰 보면 누가 누구인지 저절로 풀린다.

첫날 이벤트가 48건 쌓였다. 구성을 보니 재기동 4회에 12명이 곱해진 가짜 출근이었고 진짜 활동은 0건이었다. 합계만 보면 둘은 같은 숫자로 보인다.
"""


def selftest():
    bad, good = measure(BAD), measure(GOOD)
    print("selftest — 더미 글로 측정기가 보는지 확인")
    report("더미(AI 티)", bad, True)
    report("더미(깨끗)", good, True)
    ok = bool(bad["viol"]) and not good["viol"] and len(bad["punch"]) >= 1
    print("selftest:", "PASS (빨강·초록 둘 다 나온다)" if ok else "FAIL — 측정기가 아무것도 안 보고 있다")
    return 0 if ok else 2


def main(argv):
    if "--selftest" in argv:
        return selftest()
    verbose = "-v" in argv
    files = [a for a in argv if not a.startswith("-")]
    if not files:
        print(__doc__)
        return 2
    red = 0
    for f in files:
        with open(f, encoding="utf-8") as fh:
            m = measure(fh.read())
        report(f.split("/")[-1], m, verbose)
        red += bool(m["viol"])
    print(f"\n{len(files)}편 · 빨강 {red}편 · 상한: 볼드 {CAP_BOLD_PER_K}/천자 · 대시 {CAP_DASH_PER_K}/천자 · 아니라 {CAP_ANIRA} · [강] 0 · [보통] {CAP_MODERATE}")
    return 1 if red else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
