#!/usr/bin/env python3
"""감수 불변식 검사기 — docs/WRITING_STANDARD.md §9-1 을 기계로 잰다.

고친 글(작업트리)을 기준 판(기본 HEAD)과 맞대고, **바뀌면 안 되는 것**이 바뀌었는지 본다.
문장 다듬기(대시·번역투·상투구 교정)가 사실을 건드리지 않았다는 증거다.

사용
  python3 scripts/edit-invariants.py src/content/posts/<slug>.md [...] [--base <rev>]
  python3 scripts/edit-invariants.py --selftest     변이를 넣어 빨강이 나는지 먼저 본다

빨강(종료 코드 1):
  프런트매터 · 코드 블록 · HTML 블록 · 헤딩 · 표 줄 · 이미지 줄 — 줄 그대로 같아야 한다
  링크 URL · 숫자 · 인라인 코드 · 인용부호(「」 “” "") 안 글 — 모음(multiset)이 같아야 한다
  분량(서식 기호·공백 뺀 글자수) 90~110% · 볼드 수가 늘지 않는다
"""
import re
import subprocess
import sys
from collections import Counter

LEN_MIN, LEN_MAX = 0.90, 1.10


def split_parts(text):
    m = re.match(r"^---\n.*?\n---\n", text, flags=re.S)
    fm = m.group(0) if m else ""
    body = text[len(fm):]
    codes = re.findall(r"```.*?```", body, flags=re.S)
    body_nc = re.sub(r"```.*?```", "\n", body, flags=re.S)
    divs = re.findall(r"<div\b[^>]*>.*?</div>", body_nc, flags=re.S)
    body_nd = re.sub(r"<div\b[^>]*>.*?</div>", "\n", body_nc, flags=re.S)
    lines = [l.rstrip() for l in body_nd.split("\n")]
    heads = [l for l in lines if l.lstrip().startswith("#")]
    tables = [l for l in lines if l.lstrip().startswith("|")]
    images = [l for l in lines if l.lstrip().startswith("![")]
    return fm, codes, divs, heads, tables, images, body_nd


def bag(pattern, text, group=0):
    return Counter(m.group(group) for m in re.finditer(pattern, text))


def plain_len(text):
    t = re.sub(r"<[^>]+>", "", text)
    t = re.sub(r"\]\([^)]*\)", "]", t)         # 링크 주소는 글자수에서 뺀다
    t = re.sub(r"[#*_|>`\-—\[\]!:\s]", "", t)
    return len(t)


def compare(before, after):
    b, a = split_parts(before), split_parts(after)
    names = ["프런트매터", "코드 블록", "HTML 블록", "헤딩", "표 줄", "이미지 줄"]
    errs = []
    for n, x, y in zip(names, b[:6], a[:6]):
        if x != y:
            errs.append(f"{n} 바뀜")
    bb, ab = b[6], a[6]
    for n, pat, g in [
        ("링크 URL", r"\]\(([^)\s]+)\)", 1),
        ("숫자", r"\d[\d,.]*", 0),
        ("인라인 코드", r"`[^`\n]+`", 0),
        ("「」 인용", r"「([^」\n]+)」", 1),
        ("“” 인용", r"“([^”\n]+)”", 1),
        ('"" 인용', r'"([^"\n]+)"', 1),
    ]:
        x, y = bag(pat, bb, g), bag(pat, ab, g)
        if x != y:
            lost = list((x - y).elements())[:3]
            new = list((y - x).elements())[:3]
            errs.append(f"{n} 바뀜 (빠짐 {lost} · 새로 {new})")
    lb, la = plain_len(before), plain_len(after)
    ratio = la / lb if lb else 1.0
    if not (LEN_MIN <= ratio <= LEN_MAX):
        errs.append(f"분량 {ratio:.1%} (허용 {LEN_MIN:.0%}~{LEN_MAX:.0%})")
    nb, na = len(re.findall(r"\*\*[^*\n]+\*\*", bb)), len(re.findall(r"\*\*[^*\n]+\*\*", ab))
    if na > nb:
        errs.append(f"볼드 늘어남 {nb}→{na}")
    return errs, ratio


def git_show(rev, path):
    return subprocess.run(["git", "show", f"{rev}:{path}"], capture_output=True, text=True,
                          encoding="utf-8", check=True).stdout


SAMPLE = """---
title: 예시
---

## 배경

수집기는 48건을 읽는다 — 이름은 [다이제스트](/posts/a/)에서 쓰던 방법 그대로다. 「팀원」은 `collector.py` 가 센다. "됐다"는 말을 믿지 않는다.

| 층 | 수 |
| --- | --- |
| 헌법 | 12 |
"""


def selftest():
    ok_edit = SAMPLE.replace("48건을 읽는다 — 이름은", "48건을 읽는다. 이름은")
    muts = {
        "숫자": SAMPLE.replace("48건", "47건"),
        "링크": SAMPLE.replace("/posts/a/", "/posts/b/"),
        "인용": SAMPLE.replace("「팀원」", "「동료」"),
        "인라인 코드": SAMPLE.replace("`collector.py`", "`collect.py`"),
        "표": SAMPLE.replace("| 헌법 | 12 |", "| 헌법 | 12 개 |"),
        "헤딩": SAMPLE.replace("## 배경", "## 배경 이야기"),
        "분량": SAMPLE.replace("수집기는 48건을 읽는다 — 이름은 [다이제스트](/posts/a/)에서 쓰던 방법 그대로다. ", "48 [x](/posts/a/) "),
        "볼드": SAMPLE.replace("방법 그대로다", "**방법 그대로다**"),
    }
    good = not compare(SAMPLE, ok_edit)[0]
    print(f"정상 교정(대시→마침표): {'초록' if good else '빨강 ✗'}")
    red = 0
    for n, t in muts.items():
        e = compare(SAMPLE, t)[0]
        print(f"변이 {n:6}: {'빨강' if e else '초록 ✗ — 못 봤다'} {e[:1]}")
        red += bool(e)
    ok = good and red == len(muts)
    print(f"selftest: {'PASS' if ok else 'FAIL'} ({red}/{len(muts)} 변이 잡음)")
    return 0 if ok else 2


def main(argv):
    if "--selftest" in argv:
        return selftest()
    base = "HEAD"
    if "--base" in argv:
        base = argv[argv.index("--base") + 1]
    files = [a for a in argv if not a.startswith("-") and a != base]
    red = 0
    for f in files:
        before = git_show(base, f)
        after = open(f, encoding="utf-8").read()
        if before == after:
            print(f"same {f.split('/')[-1]}")
            continue
        errs, ratio = compare(before, after)
        print(f"{'RED ' if errs else 'ok  '}{f.split('/')[-1]:45} 분량 {ratio:.1%}")
        for e in errs:
            print(f"      ✗ {e}")
        red += bool(errs)
    print(f"\n{len(files)}편 · 빨강 {red}편 (기준 {base})")
    return 1 if red else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
