# KFC Checklist (Reality Sync v6)

핸드폰에서 쓰기 좋은 체크리스트 + 워크인 메모 + 챗봇 + PWA 구성입니다.

## 사용 방법
- `index.html`을 기준으로 동작합니다.
- 체크/추가/삭제/수정은 자동 저장됩니다.
- 태스크 카드 **길게 눌러서 순서 변경** 가능합니다.
- 워크인 메모 수량 입력 시 숫자 키패드가 뜨고, 숫자를 입력하면 힌트가 사라집니다.

## PWA 설치 (Galaxy S23 Ultra)
1. GitHub Pages로 배포 후 **HTTPS 주소**로 접속
2. Chrome(권장)에서 열기
3. 메뉴 > **홈 화면에 추가** 또는 설정 > **앱 설치**

> 설치 버튼이 안 뜨는 경우
> - `file://`로 열면 설치 안 됩니다 (HTTPS 필요)
> - 삼성 인터넷은 설치 UI가 다를 수 있어요

## Vercel 백엔드 (Gemini 프록시)
- Vercel에서 이 레포를 연결해 프로젝트 생성
- 환경변수 `GEMINI_API_KEY` 등록
- (선택) 환경변수 `ALLOWED_ORIGINS`에 `https://ggumtak.github.io` 등록
- 배포 완료 후 Vercel URL 확보 (예: `https://your-app.vercel.app`)

## 챗봇 사용
- 우측 하단 `CHAT` 버튼으로 열기
- `SETTINGS` 탭에서 `SERVER URL`에 Vercel URL 입력
- 프롬프트와 thinking level(LOW/MEDIUM/HIGH) 선택 가능
- 모델 기본값: `gemini-3-flash-preview`

> API 키는 Vercel 환경변수에만 저장됩니다.

## 사진 공유 (카톡)
- 설정 > Photo Share에서 **카메라/갤러리 선택**
- 공유 버튼을 누르면 시스템 공유창이 열리고 카카오톡 선택 가능
- 보안 정책상 **특정 채팅방 자동 전송은 불가**합니다

## 데이터 백업
- 설정 > EXPORT로 JSON 백업 저장
- 설정 > IMPORT로 복구

---

필요 기능 추가는 언제든 요청 주세요.
