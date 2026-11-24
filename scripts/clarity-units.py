#!/usr/bin/env python3
"""명확성 감사용 문장 단위 추출기 — 2026-11-23 「AI 슬롭」 3결함 감사(docs/audit/clarity-2026-11-23/).

글을 독자가 읽는 순서대로 문장 단위로 쪼개 번호를 붙인다. 주석자(사람·에이전트)는
`views/<id>.txt` 를 처음부터 읽으며 문장마다 판정하고, 집계기는 `units.jsonl` 로 빠진 문장을 센다.

사용
  python3 scripts/clarity-units.py --rev HEAD --out <dir> <id>=<경로> [...]
      --rev 를 주면 git 의 그 판에서 읽는다(작업 트리 수정분은 안 본다). 없으면 디스크에서 읽는다.
  python3 scripts/clarity-units.py --selftest

재는 범위(ai-tells.py 와 다르다 — 그쪽은 AI 티 밀도라 목록·인용을 뺐다):
  넣는다  description(프런트매터) · 문단 · 목록 항목 · 인용(>) · 캡션(_…_)
  뺀다    헤딩(맥락으로만 보여 준다) · 표 · 코드 블록 · HTML 블록(<div>·<figure>) · 이미지 줄
  인라인 코드는 지우지 않고 `…` 그대로 둔다 — 지우면 「를 호출한다」 같은 깨진 문장이 생긴다.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

SENT_SPLIT = re.compile(r"(?<=[.?!])\s+(?=\S)")


def split_sentences(text):
    """「1. 다중 티켓」처럼 번호만 남는 조각은 다음 조각에 붙인다."""
    parts, carry = [], ""
    for p in SENT_SPLIT.split(text):
        if re.fullmatch(r"\(?\d+[.)]", p.strip()):
            carry += p.strip() + " "
            continue
        parts.append(carry + p)
        carry = ""
    if carry:
        parts.append(carry.strip())
    return [p.strip() for p in parts if p.strip()]


def read_source(path, rev):
    if rev:
        return subprocess.run(["git", "show", f"{rev}:{path}"], capture_output=True,
                              check=True).stdout.decode("utf-8")
    return Path(path).read_text(encoding="utf-8")


def split_frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\s*\n", text, flags=re.S)
    if not m:
        return {}, text
    fm = {}
    for line in m.group(1).split("\n"):
        mm = re.match(r"^(\w+):\s*(.*)$", line)
        if mm:
            fm[mm.group(1)] = mm.group(2).strip().strip('"').strip("'")
    return fm, text[m.end():]


def strip_inline(s):
    # 인라인 코드를 먼저 떼어 둔다 — 안 그러면 `<style>` 이 태그로 지워져 빈 `` 이 남는다(2026-11-23 감사 d12:s24 오판)
    codes = []
    s = re.sub(r"`[^`\n]*`", lambda m: codes.append(m.group(0)) or f"\x00{len(codes)-1}\x00", s)
    s = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", s)                 # 인라인 이미지
    # 링크는 [글자] 로 남긴다 — 화면에선 링크 색으로 구분되는데 글자만 남기면 다른 글 제목이
    # 문장에 섞여 읽힌다(2026-11-23 감사 d17:s25·s35 를 주석자 둘이 그 때문에 표시했다)
    s = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"[\1]", s)
    s = re.sub(r"<[^>]+>", "", s)                              # 남은 태그
    s = re.sub(r"\x00(\d+)\x00", lambda m: codes[int(m.group(1))], s)
    s = s.replace("**", "")
    s = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?![\w*])", r"\1", s)  # *기울임*
    return re.sub(r"\s+", " ", s).strip()


def blocks_of(body):
    """(kind, heading, text) 를 독자가 읽는 순서로 낸다."""
    body = re.sub(r"```.*?```", "\n", body, flags=re.S)
    # 2026-11-23: CSS 가 문장으로 샜다. 줄 첫머리의 블록만 뺀다 — 본문 인라인 코드 `<style>` 에서
    # 시작하면 뒤쪽 진짜 </style> 까지 문단을 통째로 삼킨다(셀프테스트가 잡았다)
    body = re.sub(r"^\s*<(style|script)\b.*?</\1>", "\n", body, flags=re.S | re.M)
    for tag in ("div", "figure", "details", "table"):
        pat = re.compile(rf"<{tag}\b[^>]*>(?:(?!<{tag}\b).)*?</{tag}>", flags=re.S)
        while pat.search(body):
            body = pat.sub("\n", body)
    heading = ""
    para, para_kind = [], None
    excluded_chars = 0

    def flush():
        nonlocal para, para_kind
        if para:
            yield_buf.append((para_kind, heading, " ".join(para)))
        para, para_kind = [], None

    yield_buf = []
    for raw in body.split("\n"):
        s = raw.strip()
        if not s:
            flush()
            continue
        if s.startswith("#"):
            flush()
            heading = strip_inline(s.lstrip("#").strip())
            continue
        if s.startswith("|"):
            flush()
            excluded_chars += len(s)
            continue
        if s.startswith("![") or s.startswith("[^") or re.match(r"^<img\b", s) or s in ("---", "***"):
            flush()
            continue
        m = re.match(r"^([-*+]|\d+\.)\s+(.*)$", s)
        if m:
            flush()
            para, para_kind = [m.group(2)], "list"
            continue
        if s.startswith(">"):
            t = s.lstrip(">").strip()
            if para_kind != "quote":
                flush()
                para_kind = "quote"
            if t:
                para.append(t)
            continue
        if re.match(r"^_.*_$", s):
            flush()
            yield_buf.append(("caption", heading, s.strip("_")))
            continue
        if para_kind in (None,):
            para_kind = "para"
        para.append(s)   # 목록 항목의 이어지는 줄도 같은 항목에 붙는다
    flush()
    return yield_buf, excluded_chars


def units_of(doc_id, text):
    fm, body = split_frontmatter(text)
    out = []
    n = 0
    if fm.get("description"):
        for sent in split_sentences(strip_inline(fm["description"])):
            n += 1
            out.append({"id": f"{doc_id}:s{n}", "doc": doc_id, "kind": "desc", "heading": "(요약문)",
                        "block": 0, "text": sent.strip()})
    blocks, excluded = blocks_of(body)
    for bi, (kind, heading, raw) in enumerate(blocks, start=1):
        clean = strip_inline(raw)
        if not clean:
            continue
        for sent in split_sentences(clean):
            if not sent.strip():
                continue
            n += 1
            out.append({"id": f"{doc_id}:s{n}", "doc": doc_id, "kind": kind, "heading": heading,
                        "block": bi, "text": sent.strip()})
    return fm, out, excluded


def render_view(doc_id, units):
    lines = [f"# 문서 {doc_id}", ""]
    last_head, last_block = None, None
    label = {"desc": "요약문", "para": "문단", "list": "목록", "quote": "인용", "caption": "캡션"}
    for u in units:
        if u["heading"] != last_head:
            lines += ["", f"## {u['heading']}" if u["heading"] else "## (첫 소제목 앞)"]
            last_head = u["heading"]
        if u["block"] != last_block:
            lines.append(f"[{label[u['kind']]}]")
            last_block = u["block"]
        lines.append(f"{u['id'].split(':')[1]}: {u['text']}")
    return "\n".join(lines) + "\n"


def selftest():
    sample = """---
title: t
description: 요약 한 줄이다. 두 번째 문장이다.
---

첫 문단 첫 문장이다. `run()` 을 부른다. `<style>` 을 쓰고 [앞 글](/posts/x/)을 본다.
이어지는 줄도 같은 문단이다.

## 소제목

- 목록 하나다.
- 목록 둘이다. 둘째 문장.

| 표 | 칸 |
|---|---|
| 뺀다 | 뺀다 |

```
코드는 뺀다.
```

<figure><img src="x"/><figcaption>캡션 figure 는 뺀다.</figcaption></figure>

> 인용 문장이다.

_캡션 문장이다._

<style>
.x { --c: #fff; }
</style>

**1. 번호 붙은 문단.** 뒤 문장이다.

[^1]: 각주 정의는 뺀다.
"""
    fm, units, excluded = units_of("t", sample)
    got = [(u["kind"], u["text"]) for u in units]
    want = [("desc", "요약 한 줄이다."), ("desc", "두 번째 문장이다."),
            ("para", "첫 문단 첫 문장이다."), ("para", "`run()` 을 부른다."),
            ("para", "`<style>` 을 쓰고 [앞 글]을 본다."),
            ("para", "이어지는 줄도 같은 문단이다."),
            ("list", "목록 하나다."), ("list", "목록 둘이다."), ("list", "둘째 문장."),
            ("quote", "인용 문장이다."), ("caption", "캡션 문장이다."),
            ("para", "1. 번호 붙은 문단."), ("para", "뒤 문장이다.")]
    ok = got == want and excluded > 0
    print("selftest", "통과" if ok else "실패")
    if not ok:
        for g in got:
            print("  got ", g)
        for w in want:
            print("  want", w)
    # 빨강을 만들 수 있나: 표 줄이 들어가면 실패해야 한다
    _, u2, _ = units_of("t", sample.replace("| 뺀다 | 뺀다 |", "표 밖으로 샌 문장이다."))
    leaked = any("샌 문장" in u["text"] for u in u2)
    print("selftest 변이(표가 산문으로 새면 잡히나)", "통과" if leaked else "실패")
    return 0 if ok and leaked else 1


def main(argv):
    if "--selftest" in argv:
        return selftest()
    rev = None
    out_dir = None
    pairs = []
    it = iter(argv)
    for a in it:
        if a == "--rev":
            rev = next(it)
        elif a == "--out":
            out_dir = Path(next(it))
        else:
            pairs.append(a.split("=", 1))
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "views").mkdir(exist_ok=True)
    index = []
    with open(out_dir / "units.jsonl", "w", encoding="utf-8") as jf:
        for doc_id, path in pairs:
            text = read_source(path, rev if not Path(path).is_absolute() else None)
            fm, units, excluded = units_of(doc_id, text)
            for u in units:
                jf.write(json.dumps(u, ensure_ascii=False) + "\n")
            (out_dir / "views" / f"{doc_id}.txt").write_text(render_view(doc_id, units), encoding="utf-8")
            chars = sum(len(u["text"]) for u in units)
            index.append({"doc": doc_id, "path": path, "title": fm.get("title", ""),
                          "sentences": len(units), "chars": chars, "table_chars_excluded": excluded})
    (out_dir / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    for r in index:
        print(f"{r['doc']}\t{r['sentences']}\t{r['chars']}\t{r['path']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
