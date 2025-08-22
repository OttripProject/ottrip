# OTTRIP Client

> OTTRIP의 React Native 앱 레포지토리입니다.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- Expo CLI
- iOS Simulator (macOS) 또는 Android Emulator

### Installation

1. **의존성 설치**
   ```bash
   pnpm install
   ```

2. **환경 변수 설정**
   ```bash
   # 개발 환경 변수 가져오기 (EAS 사용 시)
   pnpm env:pull
   
   # 또는 .env 파일 직접 생성
   cp .env.example .env
   ```

3. **개발 서버 실행**
   ```bash
   pnpm dev
   ```

## 📱 Development

### Available Scripts

```bash
# 개발 서버 실행
pnpm dev

# 타입 체크
pnpm typecheck

# 린팅 및 포맷팅
pnpm lint
pnpm format

# 플랫폼별 실행
pnpm ios
pnpm android
pnpm web

# 빌드
pnpm build:dev
pnpm build:prod

# 배포
pnpm deploy:dev
pnpm deploy:prod
```

### Project Structure

```
src/
├── components/     # 재사용 가능한 UI 컴포넌트
├── contexts/       # 전역 상태 관리 (Auth, Date 등)
├── core/          # 핵심 설정 (env, constants)
├── hooks/         # 커스텀 훅
├── navigation/    # 네비게이션 설정
├── screens/       # 화면 컴포넌트
├── services/      # API 서비스
├── types/         # TypeScript 타입 정의
└── utils/         # 유틸리티 함수
```

### Key Features

- 🔐 **Secure Token Storage**: expo-secure-store 기반 안전한 토큰 저장
- 🎨 **Responsive Design**: 반응형 레이아웃 (DashboardSplit/DashboardStack)
- 📅 **Calendar Integration**: react-native-big-calendar 기반 스케줄링
- 🔄 **State Management**: React Context + TanStack Query
- 🛡️ **Type Safety**: TypeScript + Zod 스키마 검증

### Environment Variables

```env
EXPO_PUBLIC_CHANNEL=dev|prod
EXPO_PUBLIC_API_URL=http://localhost:8080
```

## 🏗️ Architecture

### Authentication Flow

1. **LoginScreen** → Google OAuth 또는 테스트 로그인
2. **AuthContext** → 전역 인증 상태 관리
3. **Secure Storage** → expo-secure-store로 토큰 저장
4. **API Services** → 인증된 API 호출

### Navigation Structure

```
RootNavigator
├── Auth Stack (미인증)
│   └── LoginScreen
└── Main Stack (인증됨)
    ├── MainTabs
    │   ├── DashboardScreen
    │   ├── CreateTripScreen
    │   └── SettingsScreen
```

## 🔧 Configuration

### Expo Config

- **Multi-environment**: dev/alpha/prod 프로필
- **OTA Updates**: Expo Updates 지원
- **Native Features**: SecureStore, ImagePicker 등

### Development Tools

- **TypeScript**: 정적 타입 검사
- **Biome**: 린팅 및 포맷팅
- **TanStack Query**: 서버 상태 관리
- **Zod**: 런타임 스키마 검증

## 📦 Build & Deploy

### Development Build

```bash
# 개발용 빌드
pnpm build:dev

# 로컬 실행
pnpm ios
pnpm android
```

### Production Build

```bash
# 프로덕션 빌드
pnpm build:prod

# OTA 업데이트 배포
pnpm deploy:prod
```

## 🤝 Contributing

1. 코드 스타일 준수 (Biome 설정)
2. 타입 안전성 유지
3. 테스트 코드 작성 권장

## 📄 License

This project is licensed under the MIT License. 