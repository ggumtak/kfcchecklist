export function getGuideHTML(){
  return `
    <section class="space-y-4 fade-in">
      <div class="square-card p-5">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-4 bg-cyan-300"></div>
          <h2 class="text-sm font-black uppercase tracking-tight">외국인 손님 응대 - 기본 흐름</h2>
        </div>
        <p class="text-[12px] text-white/70 mt-3 leading-relaxed">
          핵심은 짧고 느리게. 한국어 문장 위주로 두고, 괄호 안에 영어 표현만 참고.
        </p>
        <div class="mt-4 space-y-3 text-[12px]">
          <div>
            <p class="text-cyan-200 font-bold">1) 인사 / 주문 시작</p>
            <p class="text-white/80">안녕하세요, 주문 도와드릴게요.</p>
            <p class="text-white/50">Hi, may I take your order?</p>
          </div>
          <div>
            <p class="text-cyan-200 font-bold">2) 매장 / 포장</p>
            <p class="text-white/80">드시고 가실 건가요, 포장인가요?</p>
            <p class="text-white/50">For here or to go?</p>
          </div>
          <div>
            <p class="text-cyan-200 font-bold">3) 메뉴 확인</p>
            <p class="text-white/80">{메뉴} 맞으실까요?</p>
            <p class="text-white/50">So that’s the {item}, correct?</p>
          </div>
          <div>
            <p class="text-cyan-200 font-bold">4) 옵션 질문</p>
            <p class="text-white/80">세트로 드릴까요? 음료는 어떤 걸로 하실까요?</p>
            <p class="text-white/50">Would you like a set? Which drink?</p>
          </div>
          <div>
            <p class="text-cyan-200 font-bold">5) 결제</p>
            <p class="text-white/80">총 {금액}원입니다. 카드/현금 어떤 걸로 할까요?</p>
            <p class="text-white/50">Your total is {amount}. Card or cash?</p>
          </div>
          <div>
            <p class="text-cyan-200 font-bold">6) 대기 안내</p>
            <p class="text-white/80">번호 나오면 카운터로 와주세요.</p>
            <p class="text-white/50">Please wait here. We will call your number.</p>
          </div>
        </div>
      </div>

      <div class="square-card p-5">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-4 bg-cyan-300"></div>
          <h2 class="text-sm font-black uppercase tracking-tight">주문 받을 때 자주 쓰는 문장</h2>
        </div>
        <div class="mt-4 space-y-3 text-[12px] text-white/80">
          <p>세트로 드릴까요? (Would you like a set?)</p>
          <p>음료는 어떤 걸로 하실까요? (Which drink?)</p>
          <p>사이드는 감자/샐러드 중 선택 가능해요. (Choose fries or salad.)</p>
          <p>소스는 필요하신가요? (Do you need sauce?)</p>
          <p>맵기는 보통/매운맛 중 어떤 걸로 하실까요? (Regular or spicy?)</p>
          <p>피클/양파 빼드릴까요? (No pickles/onions?)</p>
        </div>
      </div>

      <div class="square-card p-5">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-4 bg-cyan-300"></div>
          <h2 class="text-sm font-black uppercase tracking-tight">품절/변경 안내</h2>
        </div>
        <div class="mt-4 space-y-3 text-[12px] text-white/80">
          <p>죄송합니다, 해당 메뉴는 품절입니다. (Sorry, it’s sold out.)</p>
          <p>대신 {대체메뉴}로 변경 도와드릴까요? (Would you like {alt} instead?)</p>
          <p>현재 {메뉴}는 준비 시간이 필요합니다. (It will take some time.)</p>
          <p>오늘은 {옵션} 제공이 어렵습니다. (We can’t offer {option} today.)</p>
        </div>
      </div>

      <div class="square-card p-5">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-4 bg-cyan-300"></div>
          <h2 class="text-sm font-black uppercase tracking-tight">결제/멤버십/영수증</h2>
        </div>
        <div class="mt-4 space-y-3 text-[12px] text-white/80">
          <p>적립하시겠어요? (Do you have a membership?)</p>
          <p>영수증 필요하세요? (Do you need a receipt?)</p>
          <p>카드 삽입해 주세요. (Please insert your card.)</p>
          <p>결제 완료되었습니다. (Payment completed.)</p>
        </div>
      </div>

      <div class="square-card p-5">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-4 bg-cyan-300"></div>
          <h2 class="text-sm font-black uppercase tracking-tight">대기/픽업/클레임</h2>
        </div>
        <div class="mt-4 space-y-3 text-[12px] text-white/80">
          <p>조금만 기다려 주세요. (Please wait a moment.)</p>
          <p>준비되면 번호로 안내드릴게요. (We will call your number.)</p>
          <p>죄송합니다, 다시 확인해 드릴게요. (Sorry, let me check.)</p>
          <p>문제가 있으면 바로 말씀해 주세요. (Please tell us if there’s any issue.)</p>
        </div>
      </div>
    </section>
  `;
}
