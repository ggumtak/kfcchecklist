export function getGuideHTML(){
  return `
    <section class="space-y-4 fade-in">
      <div class="square-card p-5">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-4 bg-cyan-300"></div>
          <h2 class="text-sm font-black uppercase tracking-tight">외국인 손님 응대 - 기본 흐름</h2>
        </div>
        <p class="text-[12px] text-white/70 mt-3 leading-relaxed">
          아래 문장만 기억하면 대부분 대응 가능. 천천히 말하고 짧게 끊어 말하기.
        </p>
        <div class="mt-4 space-y-3 text-[12px]">
          <div>
            <p class="text-cyan-200 font-bold">1) 인사 / 주문 시작</p>
            <p class="text-white/80">Hi! How can I help you today?</p>
            <p class="text-white/50">안녕하세요, 무엇을 도와드릴까요?</p>
          </div>
          <div>
            <p class="text-cyan-200 font-bold">2) 포장/매장 확인</p>
            <p class="text-white/80">For here or to go?</p>
            <p class="text-white/50">드시고 가실 건가요, 가져가실 건가요?</p>
          </div>
          <div>
            <p class="text-cyan-200 font-bold">3) 주문 확인</p>
            <p class="text-white/80">So that’s a {item}, right?</p>
            <p class="text-white/50">{아이템} 맞으시죠?</p>
          </div>
          <div>
            <p class="text-cyan-200 font-bold">4) 결제 안내</p>
            <p class="text-white/80">Your total is {amount}. Card or cash?</p>
            <p class="text-white/50">총 {금액}입니다. 카드/현금 어떤 걸로 할까요?</p>
          </div>
          <div>
            <p class="text-cyan-200 font-bold">5) 마무리</p>
            <p class="text-white/80">Please wait here. Your order will be ready soon.</p>
            <p class="text-white/50">여기서 잠시 기다려 주세요. 곧 준비해드릴게요.</p>
          </div>
        </div>
      </div>

      <div class="square-card p-5">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-4 bg-cyan-300"></div>
          <h2 class="text-sm font-black uppercase tracking-tight">자주 쓰는 문장</h2>
        </div>
        <div class="mt-4 space-y-3 text-[12px]">
          <p class="text-white/80">Would you like a set? (세트로 드릴까요?)</p>
          <p class="text-white/80">Any drinks? (음료 추가하시나요?)</p>
          <p class="text-white/80">We’re out of that item. Would you like {alt} instead? (이 제품 품절이라 {대체}로 드릴까요?)</p>
          <p class="text-white/80">Please wait a moment. (잠시만 기다려 주세요)</p>
          <p class="text-white/80">Sorry for the wait. (기다리게 해서 죄송해요)</p>
        </div>
      </div>

      <div class="square-card p-5">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-4 bg-cyan-300"></div>
          <h2 class="text-sm font-black uppercase tracking-tight">미니 대화 템플릿</h2>
        </div>
        <div class="mt-4 space-y-4 text-[12px]">
          <div>
            <p class="text-cyan-200 font-bold">A. 주문 시작</p>
            <p class="text-white/80">Customer: Hi, can I get a Zinger burger set?</p>
            <p class="text-white/50">손님: 징거버거 세트 하나 주세요.</p>
            <p class="text-white/80">You: Sure. For here or to go?</p>
            <p class="text-white/50">직원: 드시고 가실 건가요, 포장인가요?</p>
            <p class="text-white/80">Customer: To go.</p>
            <p class="text-white/50">손님: 포장.</p>
          </div>
          <div>
            <p class="text-cyan-200 font-bold">B. 옵션 확인</p>
            <p class="text-white/80">You: Would you like to upgrade the drink?</p>
            <p class="text-white/50">직원: 음료 사이즈 업그레이드 하실까요?</p>
            <p class="text-white/80">Customer: No, thanks.</p>
            <p class="text-white/50">손님: 아니요 괜찮아요.</p>
          </div>
          <div>
            <p class="text-cyan-200 font-bold">C. 결제</p>
            <p class="text-white/80">You: Your total is 9,900 won. Card or cash?</p>
            <p class="text-white/50">직원: 총 9,900원입니다. 카드/현금 어떤 걸로 할까요?</p>
          </div>
        </div>
      </div>
    </section>
  `;
}
