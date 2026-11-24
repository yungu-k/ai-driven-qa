#!/usr/bin/env python3
"""명확성 감사 집계기 — clarity-units.py 가 만든 문장과 주석자 TSV 를 합쳐 비율을 낸다.

사용
  python3 scripts/clarity-score.py <감사 폴더>      results/*.tsv · blind.tsv · units-all.jsonl · canary-truth.tsv 를 읽는다
  python3 scripts/clarity-score.py --selftest

빈 집합이 통과 방향이 되지 않게 한다: 주석자가 빠뜨린 문장은 「명확」으로 세지 않고 **누락**으로 세며,
누락·중복·모르는 번호가 하나라도 있으면 종료 코드 1 이다(비율은 찍되 맨 위에 실패를 적는다).
"""
import csv
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

FAULTS = "HVE"


def load_results(paths):
    """{batch: {id: row}} 와 문제 목록."""
    out, problems = {}, []
    for p in paths:
        rows = {}
        with open(p, encoding="utf-8") as f:
            for i, line in enumerate(f):
                line = line.rstrip("\n")
                if i == 0 or not line.strip():
                    continue
                cols = line.split("\t")
                if len(cols) < 5:
                    problems.append(f"{p.name}:{i+1} 칸 {len(cols)}개")
                    cols += ["-"] * (5 - len(cols))
                sid, faults, term, why, fix = cols[:5]
                faults = "".join(c for c in faults.upper() if c in FAULTS)
                if sid in rows:
                    problems.append(f"{p.name} 중복 {sid}")
                rows[sid] = {"faults": faults, "term": term.strip(), "why": why, "fix": fix}
        out[p.stem] = rows
    return out, problems


def kappa(pairs):
    n = len(pairs)
    if n == 0:
        return None, None
    agree = sum(1 for a, b in pairs if a == b) / n
    pa = sum(a for a, _ in pairs) / n
    pb = sum(b for _, b in pairs) / n
    pe = pa * pb + (1 - pa) * (1 - pb)
    return agree, (agree - pe) / (1 - pe) if pe < 1 else None


def score(folder):
    folder = Path(folder)
    units = [json.loads(l) for l in open(folder / "units-all.jsonl", encoding="utf-8")]
    by_doc = defaultdict(list)
    for u in units:
        by_doc[u["doc"]].append(u)
    blind = {}
    for row in csv.reader(open(folder / "blind.tsv", encoding="utf-8"), delimiter="\t"):
        blind[row[0]] = {"origin": row[1], "group": row[2], "batches": row[3].split(",")}
    results, problems = load_results(sorted((folder / "results").glob("*.tsv")))

    # 누락·모르는 번호
    for batch, rows in results.items():
        expected = {u["id"] for d, info in blind.items() if batch in info["batches"] for u in by_doc[d]}
        missing = expected - rows.keys()
        unknown = rows.keys() - expected
        if missing:
            problems.append(f"{batch} 누락 {len(missing)}: {sorted(missing)[:5]}")
        if unknown:
            problems.append(f"{batch} 모르는 번호 {len(unknown)}: {sorted(unknown)[:5]}")

    # 문서별 1차 판정 = 그 문서를 맡은 첫 묶음
    verdict = {}
    for d, info in blind.items():
        rows = results.get(info["batches"][0], {})
        for u in by_doc[d]:
            if u["id"] in rows:
                verdict[u["id"]] = rows[u["id"]]

    rep = {"problems": problems}

    # 미끼
    truth = {}
    if (folder / "canary-truth.tsv").exists():
        for i, row in enumerate(csv.reader(open(folder / "canary-truth.tsv", encoding="utf-8"), delimiter="\t")):
            if i:
                truth[row[0]] = row[1]
    canary_docs = [d for d, i in blind.items() if i["group"] == "canary"]
    rep["canary"] = []
    for d in canary_docs:
        for batch in blind[d]["batches"]:
            rows = results.get(batch, {})
            seeded = [u for u in by_doc[d] if u["id"].split(":")[1] in truth]
            clean = [u for u in by_doc[d] if u["id"].split(":")[1] not in truth]
            hit = [u for u in seeded if rows.get(u["id"], {}).get("faults")]
            type_hit = [u for u in seeded if truth[u["id"].split(":")[1]] in rows.get(u["id"], {}).get("faults", "")]
            fp = [u for u in clean if rows.get(u["id"], {}).get("faults")]
            rep["canary"].append({"batch": batch, "seeded": len(seeded), "caught": len(hit),
                                  "type_match": len(type_hit), "clean": len(clean), "false_pos": len(fp),
                                  "missed": [u["id"] for u in seeded if u not in hit],
                                  "fp_ids": [u["id"] for u in fp]})

    # 두 사람 일치도(겹친 문서)
    pairs, fault_pairs = [], defaultdict(list)
    for d, info in blind.items():
        if len(info["batches"]) < 2 or info["group"] == "canary":
            continue
        a, b = results.get(info["batches"][0], {}), results.get(info["batches"][1], {})
        for u in by_doc[d]:
            if u["id"] in a and u["id"] in b:
                fa, fb = a[u["id"]]["faults"], b[u["id"]]["faults"]
                pairs.append((int(bool(fa)), int(bool(fb))))
                for f in FAULTS:
                    fault_pairs[f].append((int(f in fa), int(f in fb)))
    ag, k = kappa(pairs)
    rep["agreement"] = {"n": len(pairs), "agree": ag, "kappa": k,
                        "rate_a": (sum(a for a, _ in pairs) / len(pairs)) if pairs else None,
                        "rate_b": (sum(b for _, b in pairs) / len(pairs)) if pairs else None,
                        "by_fault": {f: kappa(v)[1] for f, v in fault_pairs.items()}}

    # 묶음별·문서별 비율
    def rate(ids):
        judged = [verdict[i] for i in ids if i in verdict]
        n = len(judged)
        if n == 0:
            return {"n": 0}
        r = {"n": n, "unclear": sum(1 for v in judged if v["faults"]) / n,
             "term": sum(1 for v in judged if v["term"] not in ("", "-")) / n}
        for f in FAULTS:
            r[f] = sum(1 for v in judged if f in v["faults"]) / n
        return r

    groups = defaultdict(list)
    for d, info in blind.items():
        if info["group"] != "canary":
            groups[info["group"]] += [u["id"] for u in by_doc[d]]
    rep["groups"] = {g: rate(ids) for g, ids in groups.items()}
    rep["docs"] = {d: {**rate([u["id"] for u in by_doc[d]]), "origin": info["origin"], "group": info["group"]}
                   for d, info in blind.items() if info["group"] != "canary"}
    kinds = defaultdict(list)
    for d, info in blind.items():
        if info["group"] == "ours":
            for u in by_doc[d]:
                kinds[u["kind"]].append(u["id"])
    rep["kinds"] = {k: rate(v) for k, v in kinds.items()}
    terms = Counter()
    for d, info in blind.items():
        if info["group"] == "ours":
            for u in by_doc[d]:
                t = verdict.get(u["id"], {}).get("term", "-")
                if t not in ("", "-"):
                    for x in t.split(";"):
                        terms[x.strip()] += 1
    rep["top_terms"] = terms.most_common(40)
    return rep


def selftest():
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        t = Path(td)
        (t / "results").mkdir()
        units = [{"id": f"d1:s{i}", "doc": "d1", "kind": "para"} for i in range(1, 5)]
        units += [{"id": f"d2:s{i}", "doc": "d2", "kind": "para"} for i in range(1, 3)]
        (t / "units-all.jsonl").write_text("\n".join(json.dumps(u) for u in units) + "\n")
        (t / "blind.tsv").write_text("d1\tp01\tours\tb1,b2\nd2\tcanary\tcanary\tb1\n")
        (t / "canary-truth.tsv").write_text("sid\tfault\tnote\ns1\tV\tseeded\n")
        hdr = "id\tfaults\tterm\twhy\tfix\n"
        (t / "results" / "b1.tsv").write_text(hdr + "d1:s1\tH\t-\tx\ty\nd1:s2\t-\t-\t-\t-\nd1:s3\t-\tSLA\t-\t-\n"
                                              "d2:s1\tV\t-\tx\ty\nd2:s2\t-\t-\t-\t-\n")   # d1:s4 누락
        (t / "results" / "b2.tsv").write_text(hdr + "".join(f"d1:s{i}\t-\t-\t-\t-\n" for i in range(1, 5)))
        r = score(t)
        ok = (any("누락 1" in p for p in r["problems"])            # 빠진 문장을 잡는다
              and r["groups"]["ours"]["n"] == 3                    # 누락은 명확으로 안 센다
              and abs(r["groups"]["ours"]["unclear"] - 1 / 3) < 1e-9
              and r["canary"][0]["caught"] == 1 and r["canary"][0]["false_pos"] == 0
              and r["agreement"]["n"] == 3)                         # 한쪽이 빠뜨린 문장은 일치도에서도 뺀다
        print("selftest", "통과" if ok else "실패", json.dumps(r, ensure_ascii=False)[:400] if not ok else "")
        return 0 if ok else 1


def main(argv):
    if "--selftest" in argv:
        return selftest()
    rep = score(argv[0])
    out = Path(argv[0]) / "score.json"
    out.write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")
    if rep["problems"]:
        print("실패: 결과 파일에 문제", len(rep["problems"]), "건")
        for p in rep["problems"]:
            print("  ", p)
    print(json.dumps({k: rep[k] for k in ("groups", "agreement", "canary")}, ensure_ascii=False, indent=1))
    return 1 if rep["problems"] else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
