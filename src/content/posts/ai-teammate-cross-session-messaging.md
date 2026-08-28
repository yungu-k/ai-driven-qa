---
author: 공윤구
pubDatetime: 2026-08-18T09:00:00.000Z
title: claude.exe는 리눅스 바이너리였다
slug: ai-teammate-cross-session-messaging
featured: false
draft: false
tags:
  - ai-teammate
description: AI 팀원 둘을 실제로 대화시키려다 Windows에서 막혔다. 실행파일을 열어 보니 이름만 .exe인 리눅스 바이너리였고, 그 안에 이유가 그대로 적혀 있었다.
---

> 기획자 세션과 Technical Writer 세션을 같은 PC에서 띄우고 서로 말을 걸게 했다. 그 과정에서 알아낸 건 "왜 native Windows에선 안 되는가"였다.

## 배경 — 팀원은 넷인데, 서로 말을 못 한다

이 블로그에서 [AI 팀원 4부작](/posts/ai-planner-teammate/)을 쓰는 동안 팀원은 넷으로 늘었다. 기획자·QA·개발자·Technical Writer. 그런데 넷 다 나를 거쳐야만 대화했다. 기획자가 만든 핸드오프를 내가 복사해서 TW 세션에 붙여넣고, TW의 리뷰를 다시 복사해서 기획자에게 붙여넣는다.

넷이 주고받을 수 있는 대화 방향은 열두 개고, 그 열두 개가 전부 내 손을 거친다. **팀원이 넷이면 내가 우체국이 된다.**

Claude Code에는 이걸 없애 줄 기능이 이미 있었다. 2.1.224에서 세션끼리 직접 메시지를 보내는 기능이 들어왔고, 2.1.232에서 `@`로 세션 이름을 부르는 방식이 붙었다.[^1] `@tw 이 문서 리뷰해줘` 라고 치면 옆 터미널의 세션이 받는다. 그런데 내 Windows PC에서는 상대 세션이 아예 안 보였다.

이 글은 그게 왜 안 되는지 실행파일을 열어서 확인하고, WSL2로 옮겨 실제로 왕복시킨 기록이다. Claude Code 설치법은 다루지 않는다.

## 원리 — 세션 하나에 우편함 파일 하나

먼저 구조부터. 세션이 하나 뜰 때마다 **자기 앞으로 온 메시지를 받을 우편함을 파일로 하나 만든다.** 다른 세션은 그 파일을 열어서 말을 건다. 파일이 곧 주소다.

```
/run/user/1000/cc-socks/14026.sock   ← 기획자 세션의 우편함
/run/user/1000/cc-socks/15927.sock   ← TW 세션의 우편함
```

서버도, 포트도, 로그인도 없다. 같은 리눅스 사용자 계정 안에서 파일 하나를 공유하는 방식이다. 파일 앞의 `s`는 소켓(socket), 권한 `600`은 본인만 읽고 쓸 수 있다는 뜻이다.

명부는 따로 관리된다. `~/.claude/sessions/<PID>.json`에 `name`(=`@`으로 부를 주소)과 `messagingSocketPath`(=그 이름이 가리키는 우편함)가 들어 있다. 이름 → 명부 → 우편함 순으로 찾아간다.

<figure class="not-prose my-8">
<div style="overflow-x:auto">
<svg viewBox="0 0 640 250" role="img" aria-label="이름으로 세션을 찾는 경로 다이어그램. @tw 요청이 명부(~/.claude/sessions/)에서 이름을 찾고, 명부의 messagingSocketPath가 우편함 파일(cc-socks/15927.sock)을 가리킨다. 좀비 세션은 우편함 파일은 있지만 명부에 등록되지 않아 이름으로 찾을 길이 없다." width="640" style="max-width:none" fill="none" stroke="currentColor" font-family="ui-monospace,monospace" font-size="13">
  <text x="20" y="22" stroke="none" fill="currentColor" font-size="14">@tw 이 문서 리뷰해줘</text>
  <path d="M40 32 L40 58" stroke-width="1.5" marker-end="url(#ar)"/>
  <defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor" stroke="none"/></marker></defs>
  <rect x="20" y="62" width="290" height="76" rx="8" stroke-width="1.5" opacity="0.85"/>
  <text x="36" y="86" stroke="none" fill="currentColor" opacity="0.7" font-size="11">명부  ~/.claude/sessions/</text>
  <text x="36" y="108" stroke="none" fill="currentColor">"name": "tw"</text>
  <text x="36" y="128" stroke="none" fill="currentColor">"messagingSocketPath"</text>
  <path d="M310 122 L360 122 L360 172 L392 172" stroke-width="1.5" marker-end="url(#ar)"/>
  <text x="318" y="112" stroke="none" fill="currentColor" opacity="0.7" font-size="11">이름으로 찾는다</text>
  <rect x="396" y="146" width="228" height="52" rx="8" stroke-width="1.5" opacity="0.85"/>
  <text x="412" y="168" stroke="none" fill="currentColor" opacity="0.7" font-size="11">우편함</text>
  <text x="412" y="188" stroke="none" fill="currentColor">cc-socks/15927.sock</text>
  <rect x="20" y="176" width="290" height="56" rx="8" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.55"/>
  <text x="36" y="200" stroke="none" fill="currentColor" opacity="0.75" font-size="11">좀비 세션 — 우편함 파일은 있다</text>
  <text x="36" y="220" stroke="none" fill="currentColor" opacity="0.75" font-size="11">명부에 없다 → 이름으로 찾을 길이 없다</text>
  <path d="M312 202 L340 196 M362 190 L394 184" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.55"/>
  <text x="344" y="199" stroke="none" fill="currentColor" opacity="0.8" font-size="15">✕</text>
</svg>
</div>
<figcaption class="mt-2 text-center text-sm text-muted-foreground">화살표는 명부에서 출발한다. 소켓 파일에서 출발하지 않는다.</figcaption>
</figure>

## 반전 — 우편함은 떴는데 대화가 안 됐다

TW 세션을 자동으로 띄우려고 백그라운드 프로세스로 기동했다. 소켓 파일은 정상으로 생겼다. 그런데 목록에 안 잡혔다.

원인은 첫 화면의 폴더 신뢰 프롬프트였다. `Is this a project you created or one you trust?` 앞에서 멈춰 있었는데, 표준 입력을 `/dev/null`로 붙여 띄웠으니 Enter를 칠 수가 없었다. 소켓은 떴지만 세션은 아직 살아나지 않은 상태였다.

그런데 이 좀비가 원리를 역으로 증명해 줬다. 정상 세션을 띄운 뒤 두 곳을 나란히 봤다.

```
$ ls /run/user/1000/cc-socks/     $ ls ~/.claude/sessions/
14026.sock  ← 기획자                14026.json ✅
14534.sock  ← 좀비                  (없음)     ❌
15927.sock  ← TW                    15927.json ✅
```

**소켓은 셋인데 명부는 둘이고, 목록에 뜬 상대는 하나였다.** 좀비의 소켓 파일은 멀쩡히 남아 있는데도 무시됐다. 즉 상대 찾기는 소켓 디렉토리를 훑는 게 아니라 명부를 읽는 방식이다. 소켓 파일이 있다는 건 대화가 된다는 뜻이 아니다.

덤으로 하나 더 나왔다. 나흘 뒤 PC를 껐다 켠 다음 세션 폴더를 봤더니, 정상 종료한 세션들의 파일은 전부 정리돼 있는데 좀비의 파일만 그대로 남아 있었다. 부팅을 못 끝낸 세션은 자기 뒷정리도 못 한다. 그리고 그날 소켓 디렉토리에는 명부 없는 소켓이 또 하나 떠 있었다 — 이 현상은 한 번 겪고 마는 사고가 아니다.

## 이유 — 깜빡한 게 아니라 전제가 리눅스다

그럼 Windows에선 왜 안 되나. 배포 파일부터가 답을 말하고 있었다.

```
$ file .../@anthropic-ai/claude-code/bin/claude.exe
ELF 64-bit LSB executable, x86-64, for GNU/Linux 3.2.0, not stripped
```

이름이 `claude.exe`인데 **ELF**, 즉 리눅스 실행파일 형식이다. 윈도우 `.exe`(PE 형식)와는 파일 구조 자체가 달라서 확장자를 바꿔 단다고 서로 실행되지 않는다. 플랫폼별로 파일명만 통일해 둔 것이다.

이 파일은 JS 코드와 실행기를 통째로 묶은 단일 실행파일이라, 안을 들여다보면 원본 조각이 그대로 보인다. 소켓 경로를 만드는 함수도 들어 있었다. 변수 이름이 `Y`나 `LjS`처럼 뭉개져 있는 건 배포할 때 압축된 코드라서다.

```js
let e = Y.XDG_RUNTIME_DIR || Uce(),
    t = path.resolve(path.join(e, "cc-socks", `${process.pid}.sock`));
if (Buffer.byteLength(t) <= LjS) return t;
```

이 세 줄이 두 가지를 말해 준다. 기준 폴더가 `XDG_RUNTIME_DIR`이라는 것, 그리고 경로가 `cc-socks/<PID>.sock`이라는 것. 위에서 `ls`로 본 것과 정확히 일치한다. 세 번째 줄의 길이 검사는 이 글 끝에서 다시 다룬다 — 거기가 아직 증명이 안 끝난 자리다.

| 항목 | Linux / macOS / WSL2 | native Windows |
|---|---|---|
| `XDG_RUNTIME_DIR` | 로그인할 때 리눅스가 만들어 주는 임시 폴더. 재부팅하면 비워진다 | 없음. 그런 개념이 없다 |
| 소켓 형태 | 파일시스템 위의 파일 | 파일 경로 대신 이름으로 찾는 **named pipe** |
| 접근 통제 | 파일 권한 `600` | ACL 기반, 모델이 다름 |

**ACL** — 접근 제어 목록. 리눅스가 소유자·그룹·나머지 세 칸으로 끝내는 걸, 윈도우는 대상마다 목록을 붙여 관리한다.

즉 **"Windows 지원을 깜빡했다"가 아니라, 우편함을 어디에 어떻게 놓을지에 대한 전제가 통째로 리눅스다.** 포팅하려면 소켓 계층·런타임 폴더 개념·권한 모델을 각각 다시 설계해야 한다.

Docker 컨테이너 안에서 띄우는 것도 해볼 수 있었지만, 터미널 두 개에 사람이 각각 붙어야 하는 구조라 컨테이너로 감쌀 이유가 없었다. 원격 리눅스 서버는 편집 환경까지 통째로 옮겨야 한다. 남은 건 WSL2였다.

Windows에서 흉내내는 대신 진짜 리눅스 커널로 옮겼다. 대가는 개발 환경이 둘로 쪼개진다는 것이다 — 편집기는 Windows 쪽에 두고 세션은 WSL 안에서 도니, 프로젝트가 `/mnt/c`를 건너다니게 된다.

## 결과 — 첫 왕복에 인사말을 보내지 않았다

WSL2 Ubuntu에 옮기고 터미널 둘을 열었다. `claude -n planner`, `claude -n tw`.

| 항목 | 값 |
|---|---|
| TW 세션 기동 실패 | 2회 (백그라운드 기동 1회, `-n` 누락 1회) |
| 첫 왕복 | 1턴, 재전송 없음 |
| 첫 왕복에 오간 내용 | 인사말 아님. 실제 문서 리뷰 1건 |

첫 메시지로 "안녕"을 보내지 않았다. 이 글의 원본이 된 기술 문서를 통째로 넘기고 리뷰를 시켰다. TW 세션은 문서의 사실 오류 3건을 찾아 돌려줬다. 그중 하나는 내가 소켓 번호를 잘못 적은 것이었고, 하나는 내가 "결정적 근거"라고 단정한 문장이 증명되지 않았다는 지적이었다.

그런데 반대 방향도 한 번 나왔다. TW 세션이 "소켓은 재부팅하면 사라지고 명부는 디스크라 남는다"는 결론을 보내왔고, 그럴듯해서 그대로 문서에 실었다. 다음 왕복에서 그 세션이 자기 결론을 뒤집었다 — 파일 목록을 다시 찍어 보니 정상 종료한 세션의 명부도 같이 지워져 있었다. 남은 건 뒷정리를 못 한 좀비의 잔해 하나뿐이었다.

이미 이 글의 초고에도 그 문장이 들어가 있었다. **한 번 더 오가지 않았으면 그게 발행본이다.**

그리고 사실 오류 지적 하나는 지금도 유효하다. 위 코드의 길이 검사가 유닉스 소켓의 108바이트 제한을 뜻하려면 `LjS` 값이 실제로 108이어야 하는데, 아직 확인하지 못했다. 참고로 108바이트는 한글로는 36글자다 — `/mnt/c/Users/공윤구` 같은 경로를 쓰는 사람에겐 남 얘기가 아니다.

그래서 이 글은 "일치한다"까지만 말한다. 반쯤 증명한 걸 결정적 근거라고 부르고 있었다. **그걸 잡아낸 것도, 틀린 결론을 처음 밀어 넣은 것도 옆 터미널의 같은 AI다.**

우체국 노릇은 절반만 끝났다. 붙여넣기는 사라졌지만, 두 세션을 띄우고 각각 신뢰 프롬프트에 Enter를 쳐 주는 건 여전히 사람 몫이다.

그래도 절반은 끝났다. 이 글은 두 세션이 일곱 번 오가며 만들었고, 그 사이 내가 내용을 옮겨 나른 적은 없다. 첫 왕복에서 걸린 사실 오류 3건도 내가 아니라 옆 세션이 찾았다.

다음은 진짜 일감이다. 밀려 있는 **PDF 이슈 리포트 개선**을 기획자·개발자·QA 세션에 통째로 넘긴다. 그때 잴 건 하나다 — 한 건을 끝내는 동안 사람이 몇 번 중계했나.

[^1]: [Claude Code CHANGELOG](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) — 2.1.224 "Added cross-session `SendMessage`: Claude sessions message each other on any machine", 2.1.232 "Type `@` in prompt to mention Claude session by name".
