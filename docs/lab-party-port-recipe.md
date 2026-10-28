# 내기 모음 — 게임 하나 옮기는 순서(틀 판)

> 현재 판: 2026-10-28 1판 · 첫 적용 「한 칸 더?」(pushluck) · tw
> 받아 간 세션: 없음(다음 게임을 옮기는 세션이 읽는다)
> 정본: 틀 `src/lab/party/shell.ts` + `shell.css`(시안 `docs/lab-party-shell.js` a09715b0 · `.css` 6a6e548c) · 공통 규격 `docs/lab-party-spec.md`

디자인 세션이 게임마다 넘기는 것: 엔진 `docs/lab-party-<game>.js`(봇 `bot`·`viewOf` 포함) · 시안 `docs/lab-party-<game>-mock.html` · 규격 `docs/lab-party-<game>-spec.md` · 키 아트 `docs/lab-keyart/<game>.webp` · 디자인 리그 `tmp/lab-party/<game>-rig.cjs`.
아래 `<game>` 은 엔진 파일 이름(예 `pushluck`), `<slug>` 는 주소(/lab/<slug>/). 지금까지 둘은 같게 둔다.

## 0. 받기 전에

- [ ] 받은 파일 md5 앞 8자리를 규격 머리 「현재 판」 줄과 맞댄다(`md5sum docs/lab-party-<game>.js docs/lab-party-<game>-mock.html`). 다르면 디자인 세션에 묻는다 — 옮긴 뒤에 판이 바뀌면 같은 값 증명이 헛것이 된다.
- [ ] 시안이 틀 판(shell.js md5)을 몇 판으로 썼는지 본다. 틀이 바뀌었으면 **틀부터** 다시 옮긴다(1절 끝).
- [ ] 공유 작업 트리: `src/lab/party/`, `src/pages/lab/<slug>.astro`, `tests/lab/party-<game>.test.ts` 만 새로 만든다. 허브 두 파일(`hub-games.ts`·`index.astro`)과 `boot-card.ts` 는 고치기 직전에 다시 읽는다(다른 세션이 손댄다).

## 1. 파일 다섯(게임마다)

| 파일 | 무엇 | 어떻게 |
|---|---|---|
| `src/lab/party/<game>.ts` | 엔진(순수, 화면 모름) | 시안 js 의 IIFE 몸을 그대로 옮기고 타입만 붙인다. `module.exports`/`root.Party…` 줄은 지우고 API 이름마다 `export`. **동작을 한 글자도 바꾸지 않는다** — 고칠 게 보이면 디자인 세션에 알리고 옮긴 판은 원본대로 |
| `src/lab/party/<game>-game.ts` | 화면 | 시안 `<script>` 의 `(function(){ … })()` 몸을 `export function init<Game>() { … }` 안에 넣는다. `window.Party<Game>` → `import * as E from "./<game>.ts"`, `PartyShell.mount` → `import { mount, type PartyShell } from "./shell.ts"` 의 `mount`. 매개변수 타입만 붙인다(`$ = (id: string): any => …` 꼴이면 DOM 은 대부분 그대로 컴파일된다). `window.__<x>` 리그 자리는 `(window as any).__<x>` 로 남긴다 |
| `src/lab/party/<game>.css` | 화면 겉모양 | 시안 `<style>` 그대로 |
| `src/pages/lab/<slug>.astro` | 페이지 | 아래 틀 그대로(제목·설명·import 두 줄만 바뀐다) |
| `tests/lab/party-<game>.test.ts` | 규칙·봇 검사 | 3절 |
| `public/lab/keyart/<slug>.webp` | 키 아트 | `cp docs/lab-keyart/<game>.webp …` (960×600, ≤ 60 KB — lab-hub 검사가 잰다) |

페이지 틀(`src/pages/lab/pushluck.astro` 를 복사):

```astro
---
import LabLayout from "@/lab/LabLayout.astro";
import "@/lab/party/shell.css";
import "@/lab/party/<game>.css";
---
<LabLayout title="<게임 이름>" description="<한 줄>" bare paint="#bfe6ff">
  <div id="pt-app"><div id="pt-game"></div></div>
</LabLayout>
<script>
  import { init<Game> } from "@/lab/party/<game>-game";
  init<Game>();
</script>
```

- `bare` 인 까닭: 틀이 제 위 막대(돌아가기·제목·?·소리)를 그린다. LabLayout 의 막대를 겹쳐 그리지 않는다. `paint` 는 틀 바탕 하늘 첫 정지점 — 게임이 어두운 바탕이면 그 게임 css 의 html 바탕 값으로.
- 틀이 블로그 안에서 시안과 같게 보이도록 되돌리는 몫(Tailwind preflight·블로그 body 자간)은 `shell.css` 끝 블록이 맡는다. 게임 css 에서 `svg`·`h2`·`button` 의 맨 태그 규칙에 기대는 게 있으면 그 블록에 `:where(...)` 로 더한다 — 시안 픽셀 맞대기(4절)가 잡는다.
- 틀(`shell.ts`)은 시안과 한 줄 다르다: 돌아가기 주소 `../lab/` → `/lab/`. 틀 시안이 새 판으로 오면 같은 방법(몸을 옮기고 타입만, 이 한 줄 다시)으로 옮기고 `diff -w` 로 바뀐 줄이 타입뿐인지 본다.

## 2. 같은 값 증명(엔진)

- [ ] 대본 `tmp/lab-party-port/equiv-<game>.mjs` 를 `equiv-pushluck.mjs` 를 복사해 쓴다: `{ js, global, ts, need, run(A, B, h) }`. `run` 은 씨앗 수백 × 사람 2/3/4 × 운전자(봇 각 세기 · 무작위 · 고정 입력 · 잘못된 부름 섞기)로 두 엔진을 나란히 밀고, **동작마다** `h.same(이름, A쪽, B쪽)` 으로 반환값과 상태 전체를 맞댄다. 봇은 두 엔진의 `bot(viewOf(g))` 를 따로 불러 답을 맞대고 한쪽 답으로 두 판을 민다. 숨은 정보 게임은 사람마다 `viewOf(g, i)` 를 맞댄다.
- [ ] `need` 에 그 게임의 사건·갈래 이름을 다 적고 `h.hit(이름)` 으로 센다 — 안 나온 갈래가 있으면 빨강(빈 집합 비교는 통과 쪽으로 기운다).
- [ ] 실행 `node tmp/lab-party-port/equiv.mjs <game>` → `EQUIV OK` · 어긋남 0.
- [ ] 변이 한 번: 옮긴 판 사본의 수 하나를 바꿔 `TS=<사본> node tmp/lab-party-port/equiv.mjs <game>` → `EQUIV FAIL` 을 본다(사본은 scratchpad 에, 원본은 안 건드린다).
- 첫 적용(pushluck): 판 720 · 비교 342,349 · 어긋남 0 · 5 s. 변이(연습 봇 3칸→4칸, 덤 10→11) 둘 다 빨강.

## 3. 검사(`tests/lab/party-<game>.test.ts`)

`tests/lab/party-pushluck.test.ts` 를 본보기로:
- 수치표 = 규격 1절 숫자(규격이 코드를 따라왔는지 한 번).
- 규칙 갈래마다 하나: 손으로 세운 판(입력 고정)에서 반환값·상태를 `deepEqual`.
- 끝까지 도는 판: 2/3/4명 봇끼리, 차례 수·합계 같은 불변식.
- **봇은 보기만 읽는다**: `Object.keys(viewOf(g))` 가 화면에 보이는 열쇠 목록과 같고, `Proxy` 덫으로 봇이 읽은 열쇠가 그 밖으로 안 나간다(덫이 아무것도 못 보면 빨강 — 헛돌기 막기). 숨은 정보 게임은 여기에 「남의 숨은 값이 보기에 없다」(다른 사람 값을 바꿔도 내 보기가 같다)를 더한다.
- 균형 한 줄: 보통 봇이 연습 봇을 이기는 쪽(규격 시뮬 수치 둘레).
- [ ] 변이 한 번(규칙 수 하나·보기에 열쇠 하나 더) → 빨강을 보고 되돌린다(md5 로 되돌렸는지 확인).
- 실행 `node --test "tests/lab/*.test.ts"`.

## 4. 페이지 리그(빌드된 판)

- [ ] 빌드 `cmd.exe /c "cd /d C:\dev\tech-blog && node_modules\.bin\astro.CMD build"` — 끝의 Vercel `EPERM symlink` 는 이 PC 에서 늘 난다(dist/client 는 다 지어진 뒤). 목록에 `/lab/<slug>/index.html` 이 있는지 본다.
- [ ] 사본 뜨기 `sh tmp/lab-party-port/snap.sh` → `tmp/lab-party-port/dist-snap`(다른 세션이 다시 빌드하는 중이면 반쯤 지어진 dist 를 본다).
- [ ] 리그 `tmp/lab-party-port/<game>-page-rig.cjs` 를 `pushluck-page-rig.cjs` 를 복사해 그 게임 디자인 리그(`tmp/lab-party/<game>-rig.cjs`)의 단언을 옮긴다. 0·2·3절(겉모양·시안 픽셀 맞대기·돌아가기, 봇 자리, 아이패드 wide-check)은 거의 그대로 쓴다. 1절(사람 2/3/4명 끝까지)만 게임 조작으로 바꾼다.
  - 실행 `cmd.exe /c "cd /d C:\dev\tech-blog && set NODE_PATH=C:\dev\ai-team-office\node_modules&& set DIST=C:\dev\tech-blog\tmp\lab-party-port\dist-snap&& node tmp\lab-party-port\<game>-page-rig.cjs"` — 종료 코드는 cmd 가 삼킨다, 마지막 줄 `ALL OK` / `FAIL n` 과 `out/<game>-results.json` 의 `fail` 로 판정.
  - 겉모양만 고칠 땐 `set PARITY_ONLY=1&&` 로 0절만(10 s). 픽셀 차가 남으면 `tmp/lab-party-port/style-probe.cjs`(`SLUG=<slug>`, `SEL=선택자,…`)로 계산 스타일을 맞대 원인 속성을 찾는다.
  - PORT 기본 4411(page-rig 4394 · hub-rig 4396 과 안 겹치게). 둘을 같이 돌리면 `set PORT=…&&`.
- 꼭 있어야 할 단언(공통 규격 7·9절): 2/3/4명 끝까지 · 사람1+봇3 덮개 0 · 사람2+봇1 덮개는 사람 차례에만 · 숨은 정보 게임은 덮개 동안 숨은 값이 DOM·보이는 글자에 없음(`S.secret` 을 써서) · 아이패드 820×1180·1180×820·1024×1366 폭·높이 ≥ 0.6 · 폰 360×740 · 가로 넘침 0 · 단추·입력 44 px 이상 · 브라우저 오류 0 · 게임 페이지의 `/api` 부름 0.
- [ ] PNG 를 **열어 본다**: 폰 설정·규칙·놀이·결과, 아이패드 셋(`tmp/lab-party-port/out/<game>-*.png`).

## 5. 허브에 싣기

- [ ] `src/lab/hub-games.ts` 의 `GAMES` 끝(내기 모음 칸 주석 아래)에 한 칸: `slug` · `title` · `blurb`(20자 넘게) · `guide`(규격의 「허브 카드 한 줄」 — 조작 한 줄) · `wip` · `ph` · **`group: "party"`** · **`players: "2–4명"`**(규격 인원 — 3–4명 게임은 「3–4명」). **`rank`·`lapRank` 는 달지 않는다**(랭킹 없음 — 검사가 막는다).
- [ ] `src/lab/boot-card.ts` 의 `LAB_GAME_COUNT` +1(오락실·내기 모음 가리지 않고 놀 수 있는 것 전부).
- [ ] `tmp/lab-hub/hub-rig.cjs` 의 기대값: 카드 수·「게임 N」·「게임 N개를 꺼내는 중」·키 아트 장 수·내기 모음 줄 `slugs`/`players` 목록. 랭킹 줄 수(오락실 5)는 그대로.
- [ ] `node --test "tests/lab/*.test.ts"` — lab-hub 검사가 개수·키 아트 60 KB·페이지 파일 있음·내기 모음 카드에 인원 알약·랭킹 없음을 본다.
- [ ] 다시 빌드 → `snap.sh` → `set PORT=4413&& set DIST=…dist-snap&& node tmp\lab-hub\hub-rig.cjs` → 마지막 줄 `PASS 0 실패`.

## 6. 끝내기

- [ ] `node_modules/.bin/tsc --noEmit -p .` — 오류는 `astro-paper.config.ts(28,7)` 하나뿐(옛것)이어야 한다.
- [ ] 줄 끝 LF(`file <파일>` 에 CRLF 없음). 커밋은 하지 않는다(공유 작업 트리 — 오너·PM 몫).
- [ ] 보고: 파일 목록 · 같은 값(판·비교·어긋남) · 검사 수 · 리그 단언 수와 실패 · 아이패드 폭·높이 · 남은 것(규격의 「사람 판정」 칸 — `#nocap` 그림만 카드는 리그로 못 잰다).

## 부록 — 첫 적용에서 겪은 것

- 블로그 Tailwind preflight 가 시안 겉모양을 바꿨다: 줄 높이 1.5 · h2 굵기 · 확인 칸 여백 0 · svg block · body 자간 -0.011em. 시안 픽셀 맞대기가 설정 6.5 %·규칙 5.6 % 로 잡았고, `shell.css` 끝 되돌림 블록 뒤 0 %·0 %·0 %.
- 시안의 돌아가기 `../lab/` 는 페이지에서 `/lab/lab/` 이 된다 → `/lab/`(리그가 누르고 주소를 본다).
- 허브 리그 `/api` 503 은 허브 랭킹 부름 — 게임 페이지 리그는 그것을 오류로 세지 않고, 대신 게임 페이지가 `/api` 를 부른 수를 0 으로 단언한다.
