export const APP_VERSION = "6.0";
export const STORAGE_KEY = "kfc_checklist_state_v6";
export const LEGACY_STORAGE_KEY = "reality_sync_v50_state";
export const CHAT_STORAGE_KEY = "kfc_chat_state_v1";

export const GUIDE_TAB = { id: "guide", name: "외국인 응대" };

const kitchenStartTasks = [
  { id: "ks-1", text: "해동표찰" },
  { id: "ks-2", text: "해동표찰 사진찍기" },
  { id: "ks-3", text: "베이컨 오븐판" },
  { id: "ks-4", text: "베이컨 담아두는 곳" },
  { id: "ks-5", text: "징거더블 철판" },
  { id: "ks-6", text: "감자 담는 판 아래 큰 철판" }
];

const kitchenMidTasks = [
  { id: "km-1", text: "오븐 판 1개" },
  { id: "km-2", text: "양념 통들 넣고 빼는 판" },
  { id: "km-3", text: "집게 거치대2개+집게 1개" },
  { id: "km-4", text: "7시 반 드레인+바스켓 4개 설거지" },
  { id: "km-5", text: "사이드 주는 판 빼기" }
];

const kitchenLateTasks = [
  { id: "kl-1", text: "빵 굽기판" },
  { id: "kl-2", text: "빵 조리판" },
  { id: "kl-3", text: "양념, 트리플 치르르 통" },
  { id: "kl-4", text: "양념, 치르르 집게" },
  { id: "kl-5", text: "감자 담는 판+옆에 감자쏟기 방지판" },
  { id: "kl-6", text: "소스, 냉동표찰" },
  { id: "kl-7", text: "필렛 내부 닦기" },
  { id: "kl-8", text: "바닥 청소" },
  { id: "kl-9", text: "빵 봉투 묶기" },
  { id: "kl-10", text: "오븐 끄기" },
  { id: "kl-11", text: "집게 1개 닦기" },
  { id: "kl-12", text: "오븐 쟁반 1개 닦기" },
  { id: "kl-13", text: "종파" }
];

const backRestockTasks = [
  { id: "br-1", text: "소스: 마요네즈 2개" },
  { id: "br-2", text: "소스: 페퍼마요" },
  { id: "br-3", text: "소스: 파이어소스" },
  { id: "br-4", text: "소스: 딥치즈" },
  { id: "br-5", text: "소스: 켄터키" },
  { id: "br-6", text: "소스: 그레이비" },
  { id: "br-7", text: "소스: 양념" },
  { id: "br-8", text: "소스: 데리야끼" },
  { id: "br-9", text: "베이컨" },
  { id: "br-10", text: "치즈" },
  { id: "br-11", text: "피클" },
  { id: "br-12", text: "햄버거 래핑 용지" }
];

export const DEFAULT_CARRY = [
  { id: "eggbase", name: "에그베이스", qty: "", hint: 4 },
  { id: "bacon", name: "베이컨", qty: "", hint: 4 },
  { id: "tortilla", name: "또띠야", qty: "", hint: 5 },
  { id: "biscuit", name: "비스켓", qty: "", hint: 3 }
];

export function createDefaultState(){
  return {
    version: APP_VERSION,
    lastPunchDate: "",
    activeTab: "kitchen",
    positions: {
      kitchen: {
        id: "kitchen",
        name: "주방",
        categories: [
          { id: "kitchen-start", name: "마감 시작", tasks: kitchenStartTasks.map(t => ({ ...t, done: false })) },
          { id: "kitchen-mid", name: "중간 마감", tasks: kitchenMidTasks.map(t => ({ ...t, done: false })) },
          { id: "kitchen-late", name: "9시 반 마감", tasks: kitchenLateTasks.map(t => ({ ...t, done: false })) }
        ]
      },
      back: {
        id: "back",
        name: "백",
        categories: [
          { id: "back-restock", name: "자재 보충 (수시)", mode: "restock", tasks: backRestockTasks.map(t => ({ ...t, done: false })) },
          { id: "back-default", name: "백 마감", tasks: [] }
        ]
      },
      counter: {
        id: "counter",
        name: "카운터",
        categories: [
          { id: "counter-default", name: "카운터 마감", tasks: [] }
        ]
      }
    },
    carry: DEFAULT_CARRY.map(item => ({ ...item })),
    ui: {
      collapsed: {},
      restockFilter: {}
    },
    preferences: {
      showCarry: true,
      defaultTab: "kitchen"
    }
  };
}
