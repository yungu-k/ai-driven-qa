// 단계 데이터. 화면 템플릿 하나를 기획서·실제 빌드 둘 다에 쓴다 — 다른 곳은 v.pick() 한 자리뿐이게.
// 버그 영역은 v.mark(id) 로 붙는다(실제 빌드에만 data-bug 가 생긴다).
// 앱 이름은 전부 지어낸 것이다.
import type { Level, Variant } from "./engine.ts";

const won = (n: number) => `${n.toLocaleString("en-US")}원`;

const status = `<div class="ub-status"><span>9:41</span><span class="ub-status-icons"><i></i><i></i><i></i><b></b></span></div>`;

// ── 1. 로그인 ─────────────────────────────────────────────
const login: Level = {
  id: "login",
  title: "로그인",
  app: "도토리뱅크",
  brief: "첫 화면부터 수상해요. 로그인 화면을 기획서와 맞춰 보세요.",
  bugs: [
    {
      id: "cut",
      change: "버튼 폭을 고정해 글자가 잘림",
      desc: "버튼 폭이 고정이라 「생체 인증으로 로그인」 글자가 잘렸어요",
    },
    {
      id: "typo",
      change: "「잊으셨나요」 → 「잊으셨나여」",
      desc: "오타: 「잊으셨나요?」가 「잊으셨나여?」로 나가요",
    },
    {
      id: "align",
      change: "비밀번호 칸만 왼쪽 여백이 더 큼",
      desc: "비밀번호 칸만 오른쪽으로 밀려 아이디 칸과 줄이 안 맞아요",
    },
    {
      id: "contrast",
      change: "「로그인 상태 유지」 글자색을 아주 옅게",
      desc: "「로그인 상태 유지」 글자가 너무 옅어 배경과 대비가 낮아요",
    },
  ],
  render: (v: Variant) => `
<div class="ub-app ub-app-login">
  ${status}
  <div class="ub-login-logo" aria-hidden="true">🌰</div>
  <div class="ub-login-title">도토리뱅크</div>
  <div class="ub-login-sub">오늘도 한 알씩 모아요</div>
  <div class="ub-field">
    <div class="ub-field-label">아이디</div>
    <div class="ub-input">dotori_dean</div>
  </div>
  <div class="ub-field${v.pick("align", "", " ub-x-shift")}"${v.mark("align")}>
    <div class="ub-field-label">비밀번호</div>
    <div class="ub-input">••••••••</div>
  </div>
  <div class="ub-check"${v.mark("contrast")}>
    <span class="ub-box">✓</span>
    <span class="${v.pick("contrast", "ub-check-text", "ub-check-text ub-x-faint")}">로그인 상태 유지</span>
  </div>
  <div class="ub-btn ub-btn-primary">로그인</div>
  <div class="ub-btn ub-btn-ghost${v.pick("cut", "", " ub-x-cut")}"${v.mark("cut")}>생체 인증으로 로그인</div>
  <div class="ub-login-links">
    <span class="ub-link"${v.mark("typo")}>${v.pick("typo", "비밀번호를 잊으셨나요?", "비밀번호를 잊으셨나여?")}</span>
    <span class="ub-link">회원가입</span>
  </div>
</div>`,
};

// ── 2. 장바구니 ───────────────────────────────────────────
export const CART_ITEMS = [
  { id: "banana", emoji: "🍌", name: "유기농 바나나 1송이", price: 3980, qty: 2 },
  { id: "yogurt", emoji: "🥛", name: "그릭요거트 450g", price: 2500, qty: 3 },
  { id: "bread", emoji: "🍞", name: "통밀 식빵", price: 4200, qty: 1 },
];
export const CART_SHIPPING = 3000;
/** 기획서가 말하는 합계: 줄 금액(단가×수량)의 합 + 배송비 */
export const cartTotal = () =>
  CART_ITEMS.reduce((a, it) => a + it.price * it.qty, 0) + CART_SHIPPING;

const cart: Level = {
  id: "cart",
  title: "장바구니",
  app: "콩콩마켓",
  brief: "돈이 걸린 화면이에요. 숫자 하나하나 기획서와 맞춰 보세요.",
  bugs: [
    {
      id: "total",
      change: "합계를 단가만 더해 계산(수량 빠짐)",
      desc: "결제 금액이 항목 합과 달라요 — 수량을 빼고 단가만 더했어요",
    },
    {
      id: "comma",
      change: "요거트 줄 금액에 천 단위 쉼표 없음",
      desc: "요거트 금액만 「7500원」 — 천 단위 쉼표가 빠졌어요",
    },
    {
      id: "thumb",
      change: "식빵 썸네일 이미지가 깨짐",
      desc: "식빵 사진이 안 뜨고 깨진 이미지 칸만 보여요",
    },
    {
      id: "i18n",
      change: "주문 버튼에 번역 키가 그대로 노출",
      desc: "주문 버튼에 문구 대신 번역 키 「btn.order.submit」이 나와요",
    },
  ],
  render: (v: Variant) => {
    const sub = CART_ITEMS.reduce((a, it) => a + it.price * it.qty, 0);
    const wrongSub = CART_ITEMS.reduce((a, it) => a + it.price, 0);
    const total = v.pick("total", sub, wrongSub) + CART_SHIPPING;
    const rows = CART_ITEMS.map(it => {
      const line = it.price * it.qty;
      const thumb =
        it.id === "bread"
          ? `<div class="ub-thumb${v.pick("thumb", "", " ub-x-broken")}"${v.mark("thumb")}>${v.pick(
              "thumb",
              it.emoji,
              `<span class="ub-broken-icon"></span><span class="ub-broken-alt">bread_01.png</span>`
            )}</div>`
          : `<div class="ub-thumb">${it.emoji}</div>`;
      const price =
        it.id === "yogurt"
          ? `<span class="ub-line-price"${v.mark("comma")}>${v.pick("comma", won(line), `${line}원`)}</span>`
          : `<span class="ub-line-price">${won(line)}</span>`;
      return `
    <div class="ub-cart-row">
      ${thumb}
      <div class="ub-cart-info">
        <div class="ub-cart-name">${it.name}</div>
        <div class="ub-cart-unit">${won(it.price)}</div>
        <div class="ub-stepper"><span>−</span><b>${it.qty}</b><span>+</span></div>
      </div>
      ${price}
    </div>`;
    }).join("");
    return `
<div class="ub-app ub-app-cart">
  ${status}
  <div class="ub-topbar"><span class="ub-back">‹</span><span>장바구니</span><span class="ub-topbar-count">3</span></div>
  <div class="ub-cart-all"><span class="ub-box">✓</span> 전체 선택 (3/3)</div>
  ${rows}
  <div class="ub-sum">
    <div class="ub-sum-row"><span>상품 금액</span><span>${won(sub)}</span></div>
    <div class="ub-sum-row"><span>배송비</span><span>${won(CART_SHIPPING)}</span></div>
    <div class="ub-sum-row ub-sum-total"${v.mark("total")}><span>결제 금액</span><span>${won(total)}</span></div>
  </div>
  <div class="ub-btn ub-btn-cart${v.pick("i18n", "", " ub-x-key")}"${v.mark("i18n")}>${v.pick(
    "i18n",
    `${won(cartTotal())} 주문하기`,
    "btn.order.submit"
  )}</div>
</div>`;
  },
};

// ── 3. 프로필 설정 ─────────────────────────────────────────
const profile: Level = {
  id: "profile",
  title: "프로필 설정",
  app: "토끼톡",
  brief: "설정 화면은 작은 어긋남이 많아요. 글자·아이콘·스위치를 잘 보세요.",
  bugs: [
    {
      id: "name",
      change: "긴 닉네임 말줄임 없이 넘침",
      desc: "긴 닉네임이 말줄임(…) 없이 넘쳐 「편집」 버튼과 겹쳐요",
    },
    {
      id: "toggle",
      change: "글자는 켜짐인데 스위치는 꺼짐 모양",
      desc: "「켜짐」이라고 써 놓고 스위치는 꺼진 모양이에요 — 상태가 안 맞아요",
    },
    {
      id: "date",
      change: "가입일만 MM/DD/YYYY",
      desc: "가입일만 「03/14/2026」 — 다른 날짜(2026.10.22)와 형식이 달라요",
    },
    {
      id: "icon",
      change: "「개인정보 보호」 줄 자물쇠 아이콘 빠짐",
      desc: "「개인정보 보호」 줄에 아이콘이 빠져 글자가 왼쪽으로 붙었어요",
    },
  ],
  render: (v: Variant) => `
<div class="ub-app ub-app-profile">
  ${status}
  <div class="ub-topbar"><span class="ub-back">‹</span><span>프로필 설정</span><span></span></div>
  <div class="ub-prof-card">
    <div class="ub-avatar" aria-hidden="true">🐰</div>
    <div class="ub-prof-text">
      <div class="${v.pick("name", "ub-prof-name", "ub-prof-name ub-x-spill")}"${v.mark("name")}>말랑말랑한 토끼 개발자님은 오늘도 야근 중</div>
      <div class="ub-prof-id">@mallang_rabbit</div>
    </div>
    <span class="ub-chip">편집</span>
  </div>
  <div class="ub-set-group">
    <div class="ub-set-row"${v.mark("toggle")}>
      <span>푸시 알림</span>
      <span class="ub-set-right"><span class="ub-set-state">켜짐</span><span class="ub-switch${v.pick("toggle", " is-on", "")}"><i></i></span></span>
    </div>
    <div class="ub-set-row">
      <span>가입일</span>
      <span class="ub-set-value"${v.mark("date")}>${v.pick("date", "2026.03.14", "03/14/2026")}</span>
    </div>
    <div class="ub-set-row">
      <span>최근 접속</span>
      <span class="ub-set-value">2026.10.22</span>
    </div>
  </div>
  <div class="ub-set-group">
    <div class="ub-menu-row"><span class="ub-menu-icon">🎨</span><span>테마</span><span class="ub-chev">›</span></div>
    <div class="ub-menu-row"${v.mark("icon")}>${v.pick("icon", `<span class="ub-menu-icon">🔒</span>`, "")}<span>개인정보 보호</span><span class="ub-chev">›</span></div>
    <div class="ub-menu-row"><span class="ub-menu-icon">💬</span><span>채팅 백업</span><span class="ub-chev">›</span></div>
  </div>
</div>`,
};

// ── 4. 예약 확인 ──────────────────────────────────────────
// 2026-10-24 는 토요일, 26 은 월요일 → 2박
const booking: Level = {
  id: "booking",
  title: "예약 확인",
  app: "뭉게스테이",
  brief: "마지막! 날짜와 금액을 기획서와 하나씩 짚어 보세요.",
  bugs: [
    {
      id: "weekday",
      change: "체크인 요일 하루 밀림(토→금)",
      desc: "10월 24일은 토요일인데 「(금)」으로 나와요 — 요일 계산이 하루 밀렸어요",
    },
    {
      id: "nights",
      change: "숙박 일수 off-by-one(2박→3박)",
      desc: "24일~26일은 2박인데 「3박」 — 날짜 차이에 1을 더 더했어요",
    },
    {
      id: "align",
      change: "청소비 금액만 왼쪽 정렬",
      desc: "청소비 금액만 왼쪽에 붙어 다른 금액과 오른쪽 줄이 안 맞아요",
    },
    {
      id: "contrast",
      change: "확정 버튼을 연노랑 바탕+흰 글자로",
      desc: "「예약 확정」 버튼이 연노랑 바탕에 흰 글자라 거의 안 읽혀요",
    },
  ],
  render: (v: Variant) => `
<div class="ub-app ub-app-booking">
  ${status}
  <div class="ub-topbar"><span class="ub-back">‹</span><span>예약 확인</span><span></span></div>
  <div class="ub-stay-hero" aria-hidden="true"><span>☁️</span><span>🏡</span><span>🌿</span></div>
  <div class="ub-stay-name">뭉게스테이 숲속 오두막</div>
  <div class="ub-stay-meta"><span${v.mark("nights")}>${v.pick("nights", "2박", "3박")}</span> · 성인 2명</div>
  <div class="ub-dates">
    <div class="ub-date"${v.mark("weekday")}>
      <div class="ub-date-label">체크인</div>
      <div class="ub-date-day">10.24 ${v.pick("weekday", "(토)", "(금)")}</div>
      <div class="ub-date-time">15:00</div>
    </div>
    <div class="ub-date-arrow">→</div>
    <div class="ub-date">
      <div class="ub-date-label">체크아웃</div>
      <div class="ub-date-day">10.26 (월)</div>
      <div class="ub-date-time">11:00</div>
    </div>
  </div>
  <div class="ub-sum">
    <div class="ub-sum-row"><span>객실 요금 (2박)</span><span>240,000원</span></div>
    <div class="ub-sum-row${v.pick("align", "", " ub-x-left")}"${v.mark("align")}><span>청소비</span><span>15,000원</span></div>
    <div class="ub-sum-row"><span>첫 예약 쿠폰</span><span class="ub-minus">−20,000원</span></div>
    <div class="ub-sum-row ub-sum-total"><span>총 결제 금액</span><span>235,000원</span></div>
  </div>
  <div class="ub-free-cancel">10월 22일까지 무료 취소</div>
  <div class="ub-btn ub-btn-stay${v.pick("contrast", "", " ub-x-pale")}"${v.mark("contrast")}>예약 확정</div>
</div>`,
};

export const LEVELS: Level[] = [login, cart, profile, booking];
