# 클라이언트

## 주요 내용 요약

##✅ 개발 명령어 (pnpm)
```
pnpm dev         # Expo 개발 서버 실행
pnpm typecheck   # TypeScript 타입 확인
pnpm lint        # Biome으로 린트 & 자동 포맷
pnpm android     # 안드로이드 실행
pnpm ios         # iOS 실행
pnpm web         # 웹 버전 실행
pnpm build:dev   # 개발용 빌드
pnpm deploy:dev  # 개발 배포
pnpm deploy:prod # 프로덕션 배포
```

### ⚙️ 핵심 기술
- React Native + Expo: 앱 프레임워크
- TypeScript: 타입 안정성 확보
- TanStack Query: 서버 상태 관리 및 API 요청
- Ky: HTTP 클라이언트
- Biome: 린터 + 포매터 (ESLint + Prettier 대체)
- Zod: 타입 안전한 폼 검증

### 🧭 프로젝트 구조
- src/api/: API 모듈 및 인증 처리
- src/navigation/: 라우팅 및 네비게이션
- src/ui/: 재사용 UI 컴포넌트 및 디자인 시스템
- src/features/: 기능 기반 페이지 (도메인 단위로 분리)

###🧩 패턴 및 특징
- 모든 API 요청은 인증 헤더 자동 주입
- Zod + TanStack Form 조합으로 안정적인 폼 검증
- 유효성 검사를 실시간으로 제공
- 이미지 로컬 저장 + 자동 업로드


## 툴 사용 이유

### mise
- 다중 언어·툴 버전을 파일(mise.toml)로 고정해 주는 툴체인 매니저
- 팀-원별 로컬 환경 차이를 제거해 “동일 버전 Node / pnpm / 기타 CLI”를 보장
- mise trust + mise i 한 줄로 의존 툴 설치를 자동화

### corepack + pnpm
- corepack: Node 16+ 내장 패키지 매니저 래퍼. pnpm 버전을 레포 내부에서 지정해 자동 설치·활성화
- pnpm:
	- 하드링크 기반 저장소로 의존성 설치 속도가 빠르고 디스크 사용량 절감
	- 모노레포·워크스페이스 지원이 우수 (추후 앱·패키지 분리 시 유리)
	- lockfile 충돌이 npm/yarn 대비 적음

### Expo CLI / EAS(Expo Application Services)
- React Native의 복잡한 네이티브 빌드 체인을 추상화 → pnpm dev로 즉시 iOS·Android·Web 미리보기
- OTA(Over-the-air) 업데이트, 클라우드 빌드(EAS Build), 배포 파이프라인 제공
- assetBundlePatterns, app.config.ts 등 자체 규칙에 따라 assets/ 관리

### TypeScript
- 정적 타입으로 런타임 오류를 컴파일 단계에서 차단
- IDE 자동완성·리팩터링 품질 향상
- 백엔드 FastAPI(Pydantic) 스키마를 TS 타입으로 변환해 계약 기반 개발 가능

### ESLint (+ @typescript-eslint)
- 코드 품질·일관성 유지. 잘못된 패턴, 미사용 변수, 불안전 타입 캐스트 등을 탐지
- Prettier와 충돌 없는 룰셋으로 자동 포맷 후 린트 체킹

### Prettier
- 코드 스타일(들여쓰기, 따옴표, 세미콜론 등)을 자동 포맷 → 스타일 논쟁 제거
- ESLint의 “스타일 룰”을 대부분 대체해 성능↑, 설정↓


### Husky + lint-staged
- Git pre-commit 훅으로 eslint --fix, prettier --write 등을 실행
- 커밋 전에 포맷·린트가 자동 적용되어 CI 실패를 선제 차단
- lint-staged는 변경된 파일만 처리해 속도 최적화

### Jest + React Native Testing Library (추가 예정)
- 유닛·컴포넌트 테스트로 리팩터 시 회귀 버그 방지
- Mock된 네이티브 API·네비게이션 환경에서 빠른 테스트 실행

### React Navigation
- 공식 de-facto 표준 네비게이션 라이브러리
- Stack, Tab, Drawer를 조합한 복합 네비게이션 구성 지원
- TypeScript 타입 제네릭으로 화면별 Params 안전성 확보

### 폴더 구조
- 루트 assets/ → Expo 기본 예제
- src/ 하위에 screens, components, services, hooks, contexts 등 기능/관심사 분리
- 규모 확장 시 코드 찾기·트리쉐이킹 효율을 높여 줌

### .env / pnpm env:pull
- 환경변수를 원격(EAS Secrets or S3)에서 내려받아 .env.local 생성
- 민감 정보(API 키, 백엔드 URL)를 코드베이스 밖에서 관리, 유출 방지

### MIT License (README 명시)
- 오픈소스 협업·배포 시 법적 범위를 명확화
- 기업 내부 프로젝트라도 라이선스 명시는 베스트 프랙티스


## 구조 기본
```
client/
 ├─ App.tsx                 // 앱 진입점
 ├─ src/
 │   ├─ navigation/         // 내비게이션 설정
 │   ├─ screens/            // 각 화면 컴포넌트
 │   ├─ hooks/              // React Query 커스텀 훅 등
 │   ├─ services/           // axios 인스턴스, API 래퍼
 │   └─ components/         // 공용 UI 컴포넌트
 ├─ app.json (또는 app.config.ts) // Expo 설정
 └─ package.json
```


## 파일

### Navigation
- navigation / DashboardTabs.tsx – Itinerary / Flights / Stay / Expense 탭(placeholder)

### Screens
- screens / DashboardSplit.tsx – (wide) 좌측 달력 + 우측 탭
- screens / DashboardStack.tsx – (mobile) 달력 → 탭 순으로 세로 배치

### Hooks
- hooks / useIsWideScreen.ts – 가로폭 768 px 이상인지 판별

### Contexts
- contexts / DateContext.tsx – 선택 날짜 전역 관리

### Components
- components / CalendarPane.tsx – react-native-calendars 래퍼

