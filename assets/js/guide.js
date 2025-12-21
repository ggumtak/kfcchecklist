export function getGuideHTML(){
  return `
    <section class="space-y-4 fade-in">
      <div class="square-card p-5">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-4 bg-cyan-300"></div>
          <h2 class="text-sm font-black uppercase tracking-tight">외국인 손님 응대 - 기본 흐름</h2>
        </div>
        <p class="text-[12px] text-white/70 mt-3 leading-relaxed">
          핵심은 짧고 느리게, 또박또박. 영어 문장이 필요하면 챗봇에 바로 물어보기.
        </p>
        <div class="mt-4 space-y-3 text-[12px]">
          <div>
            <p class="text-cyan-200 font-bold">1) 인사 / 주문 시작</p>
            <p class="text-white/80">안녕하세요, 주문 도와드릴게요.</p>
            <p class="text-white/80">메뉴 결정되셨나요?</p>
          </div>
          <div>
            <p class="text-cyan-200 font-bold">2) 매장 / 포장</p>
            <p class="text-white/80">드시고 가실 건가요, 포장인가요?</p>
            <p class="text-white/80">매장/포장 중 선택해 주세요.</p>
          </div>
          <div>
            <p class="text-cyan-200 font-bold">3) 메뉴 확인</p>
            <p class="text-white/80">{메뉴} 맞으실까요?</p>
            <p class="text-white/80">수량은 {개수}개 맞으신가요?</p>
          </div>
          <div>
            <p class="text-cyan-200 font-bold">4) 옵션 질문</p>
            <p class="text-white/80">세트로 드릴까요? 음료는 어떤 걸로 하실까요?</p>
            <p class="text-white/80">사이드는 감자/샐러드 중 선택 가능해요.</p>
          </div>
          <div>
            <p class="text-cyan-200 font-bold">5) 결제</p>
            <p class="text-white/80">총 {금액}원입니다. 카드/현금 어떤 걸로 할까요?</p>
            <p class="text-white/80">결제 도와드릴게요.</p>
          </div>
          <div>
            <p class="text-cyan-200 font-bold">6) 대기 안내</p>
            <p class="text-white/80">번호 나오면 카운터로 와주세요.</p>
            <p class="text-white/80">조금만 기다려 주세요.</p>
          </div>
        </div>
      </div>

      <div class="square-card p-5">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-4 bg-cyan-300"></div>
          <h2 class="text-sm font-black uppercase tracking-tight">주문 받을 때 자주 쓰는 문장</h2>
        </div>
        <div class="mt-4 space-y-3 text-[12px] text-white/80">
          <p>세트로 드릴까요?</p>
          <p>음료는 어떤 걸로 하실까요?</p>
          <p>사이드는 감자/샐러드 중 선택 가능해요.</p>
          <p>소스는 필요하신가요?</p>
          <p>맵기는 보통/매운맛 중 어떤 걸로 하실까요?</p>
          <p>피클/양파 빼드릴까요?</p>
          <p>추가 메뉴 더 필요하신가요?</p>
          <p>쿠폰이나 이벤트 적용하시겠어요?</p>
        </div>
      </div>

      <div class="square-card p-5">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-4 bg-cyan-300"></div>
          <h2 class="text-sm font-black uppercase tracking-tight">품절/변경 안내</h2>
        </div>
        <div class="mt-4 space-y-3 text-[12px] text-white/80">
          <p>죄송합니다, 해당 메뉴는 품절입니다.</p>
          <p>대신 {대체메뉴}로 변경 도와드릴까요?</p>
          <p>현재 {메뉴}는 준비 시간이 필요합니다.</p>
          <p>오늘은 {옵션} 제공이 어렵습니다.</p>
        </div>
      </div>

      <div class="square-card p-5">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-4 bg-cyan-300"></div>
          <h2 class="text-sm font-black uppercase tracking-tight">결제/멤버십/영수증</h2>
        </div>
        <div class="mt-4 space-y-3 text-[12px] text-white/80">
          <p>적립하시겠어요?</p>
          <p>영수증 필요하세요?</p>
          <p>카드 삽입해 주세요.</p>
          <p>결제 완료되었습니다.</p>
        </div>
      </div>

      <div class="square-card p-5">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-4 bg-cyan-300"></div>
          <h2 class="text-sm font-black uppercase tracking-tight">대기/픽업/클레임</h2>
        </div>
        <div class="mt-4 space-y-3 text-[12px] text-white/80">
          <p>조금만 기다려 주세요.</p>
          <p>준비되면 번호로 안내드릴게요.</p>
          <p>죄송합니다, 다시 확인해 드릴게요.</p>
          <p>문제가 있으면 바로 말씀해 주세요.</p>
        </div>
      </div>

      <div class="square-card p-5">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-4 bg-cyan-300"></div>
          <h2 class="text-sm font-black uppercase tracking-tight">추가 안내</h2>
        </div>
        <div class="mt-4 space-y-3 text-[12px] text-white/80">
          <p>메뉴 사진으로 보여드릴까요?</p>
          <p>추천 메뉴 설명해 드릴까요?</p>
          <p>알레르기 있으신가요?</p>
          <p>맵기 조절 가능한 메뉴입니다.</p>
          <p>소스는 따로 드릴까요?</p>
        </div>
      </div>
    </section>
  `;
}
