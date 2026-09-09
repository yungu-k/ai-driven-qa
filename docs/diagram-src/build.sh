#!/usr/bin/env bash
# 도해 템플릿 → 라이트/다크 SVG 생성. 팔레트는 docs/diagram-spec.md §4가 정본.
set -euo pipefail
cd "$(dirname "$0")"
OUT="../../public/images/diagrams"
mkdir -p "$OUT"

gen() { # $1=template basename(확장자 제외) $2=variant $3..=sed 식들
  local tpl="$1" variant="$2"; shift 2
  sed "$(printf '%s;' "$@")" "$tpl.template.svg" > "$OUT/$tpl-$variant.svg"
  echo "생성: $OUT/$tpl-$variant.svg"
}

LIGHT=(
  's/%%S1%%/#ffffff/g'      's/%%S2%%/#efeff2/g'
  's/%%TXT%%/#1c1c21/g'     's/%%SEC%%/#62656e/g'
  's/%%ACC%%/#4f46e5/g'     's/%%ACCTINT%%/#edecfc/g'
  's/%%WARN%%/#b45309/g'    's/%%WARNBG%%/#f6eae1/g'   's/%%WARNINK%%/#92400e/g'
)
DARK=(
  's/%%S1%%/#10141d/g'      's/%%S2%%/#161b26/g'
  's/%%TXT%%/#e6e8ee/g'     's/%%SEC%%/#9aa3b5/g'
  's/%%ACC%%/#8b93ff/g'     's/%%ACCTINT%%/#1d2135/g'
  's/%%WARN%%/#fbbf24/g'    's/%%WARNBG%%/#282316/g'   's/%%WARNINK%%/#fbbf24/g'
)

for tpl in *.template.svg; do
  base="${tpl%.template.svg}"
  gen "$base" light "${LIGHT[@]}"
  gen "$base" dark "${DARK[@]}"
done

# 잔여 플레이스홀더 = 실패
if grep -l '%%' "$OUT"/*.svg 2>/dev/null; then
  echo "오류: 치환 안 된 토큰 존재" >&2; exit 1
fi
