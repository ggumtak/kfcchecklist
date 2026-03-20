# AGENTS.md

## 프로젝트 목적

개인용 KFC 근무 체크리스트 PWA를 구현한다. 모바일 우선 UX를 기준으로 포지션, 단계, 업무 구조를 관리하고, 실제 근무 중 빠르게 체크할 수 있어야 한다.

## 기술 스택

- Next.js App Router
- TypeScript `strict`
- Tailwind CSS
- localStorage 기반 local-first storage
- Vitest
- PWA (`manifest`, `service worker`, installable)

## 실행 명령

```bash
npm install
npm run dev
```

## build / lint / typecheck / test 명령

```bash
npm run build
npm run lint
npm run typecheck
npm run test
```

## 완료 기준

- 포지션 / 단계 / 업무의 추가, 수정, 삭제, 순서 변경이 앱 UI에서 동작한다.
- 체크 상태와 구조 데이터가 분리 저장된다.
- 새 근무 시작, 오늘 체크 초기화, JSON 백업/복원, 초기 데이터 리셋이 동작한다.
- 모바일 우선 PWA로 설치 가능하고 오프라인에서도 최근 데이터로 사용할 수 있다.
- `lint`, `typecheck`, `test`, `build`가 통과한다.

## 모바일 우선 원칙

- 갤럭시 S25 세로 화면을 기준으로 설계한다.
- 큰 터치 영역과 한 손 조작을 우선한다.
- 체크 동작은 최소 탭 수로 끝나야 한다.
- 체크리스트 화면은 단순하고, 구조 편집은 설정 화면에 집중한다.

## 데이터 저장 관련 주의사항

- 구조 데이터와 세션/체크 상태는 분리 저장한다.
- 현재 저장소는 `localStorage` 어댑터를 사용한다.
- 구조 키: `kfc-checklist-structure-v1`
- 세션 키: `kfc-checklist-sessions-v1`
- 이전 단일 키(`kfc-checklist-data-v1`)가 있으면 로드 fallback 으로 읽을 수 있다.
- 원격 DB로 옮길 때는 `src/features/checklist/lib/storage.ts`를 우선 수정한다.

## seed 데이터 수정 위치

- `src/features/checklist/data/seed.ts`
