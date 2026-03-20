# 근무 체크리스트

개인용 KFC 근무 체크리스트 웹앱입니다. 갤럭시 S25 세로 화면 기준의 모바일 우선 PWA로 만들었고, 포지션별 체크리스트 관리, 근무 세션 분리, JSON 백업/복원, 오프라인 사용을 지원합니다.

## 주요 기능

- 포지션 → 단계 → 업무 구조 관리
- 업무 체크, 진행률 표시, 시간 배지, overdue 강조
- 검색, 필터(`전체`, `미완료만`, `시간 있는 항목만`)
- 단계 전체 완료 / 전체 해제
- 업무 복제
- 포지션 / 단계 / 업무 추가, 수정, 삭제, 순서 변경
- 새 근무 시작, 오늘 체크 초기화
- JSON 백업 내보내기 / 복원 불러오기
- 초기 시드 데이터로 리셋
- PWA 설치 가능, 오프라인 화면 및 서비스 워커 지원

## 기술 스택

- Next.js App Router
- TypeScript `strict`
- Tailwind CSS
- Local-first storage
  - 구조 데이터: `localStorage` 분리 키 저장
  - 체크 상태 / 세션 데이터: `localStorage` 분리 키 저장
- Vitest

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## 빌드 / 검증 명령

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Vercel 배포 방법

1. 이 프로젝트를 Git 저장소에 올립니다.
2. Vercel에서 저장소를 Import 합니다.
3. Framework Preset은 `Next.js`를 사용합니다.
4. 별도 환경 변수 없이 바로 배포할 수 있습니다.
5. 배포 후 Android Chrome에서 홈 화면에 추가하면 설치형처럼 사용할 수 있습니다.

## 데이터 저장 방식

이 앱은 로그인과 원격 DB 없이 로컬 우선으로 동작합니다.

- 구조 데이터는 포지션, 단계, 업무 목록을 뜻합니다.
- 체크 상태 데이터는 근무 세션별 완료 상태를 뜻합니다.
- 두 데이터는 `localStorage`의 서로 다른 키에 분리 저장됩니다.
- 앱 메모리에서는 하나의 도메인 객체로 합쳐 다루므로, 나중에 Supabase 같은 외부 DB로 어댑터만 바꿔 이관하기 쉽습니다.

현재 저장 키:

- 구조 데이터: `kfc-checklist-structure-v1`
- 세션 데이터: `kfc-checklist-sessions-v1`

## PWA 설명

- `app/manifest.ts`로 웹 앱 매니페스트를 제공합니다.
- `public/sw.js`로 서비스 워커를 등록합니다.
- 최근 방문 화면과 핵심 정적 자산을 캐시합니다.
- 네트워크가 끊기면 앱 상단에 오프라인 안내가 표시됩니다.
- 문서 요청이 실패하면 `/offline` 페이지로 fallback 합니다.

## 초기 시드 데이터 수정 위치

초기 포지션/단계/업무 시드는 아래 파일에서 관리합니다.

- `src/features/checklist/data/seed.ts`

카운터 기본 데이터와 백 예시 데이터도 이 파일에 들어 있습니다.

## 파일 구조

```text
app/
  layout.tsx
  page.tsx
  manifest.ts
  offline/page.tsx
  positions/[positionId]/page.tsx
  settings/page.tsx
src/
  app-providers.tsx
  features/checklist/
    components/
    context/
    data/
    lib/
  shared/
    components/
    lib/
public/
  sw.js
  icons/
AGENTS.md
README.md
```

## 남아 있는 가정 / 제한 사항

- 데이터는 로컬 브라우저 저장소 기반이므로 기기나 브라우저를 바꾸면 자동 동기화되지 않습니다.
- 오프라인 사용은 동일 기기에서 한 번 이상 방문해 캐시된 페이지 기준입니다.
- MVP 범위에서는 로그인, 다중 사용자, 원격 동기화는 포함하지 않았습니다.
