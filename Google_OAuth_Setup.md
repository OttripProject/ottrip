# Google OAuth 설정 가이드 (id_token 방식)

## 1. Google Cloud Console 설정

### 1.1 프로젝트 생성
1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택

### 1.2 OAuth 2.0 클라이언트 ID 생성
1. "API 및 서비스" > "사용자 인증 정보" 메뉴로 이동
2. "사용자 인증 정보 만들기" > "OAuth 2.0 클라이언트 ID" 선택
3. 애플리케이션 유형: "웹 애플리케이션" 선택
4. 승인된 JavaScript 원본 추가:
   - `http://localhost:8081` (Expo 개발 서버)
   - `https://your-domain.com` (프로덕션)

### 1.3 Google+ API 활성화
1. "API 및 서비스" > "라이브러리" 메뉴로 이동
2. "Google+ API" 또는 "Google Identity" 검색 후 활성화

## 2. 서버 환경변수 설정

서버의 `.env` 파일에 다음 변수들을 추가:

```env
# Google OAuth 설정
GOOGLE_CLIENT_ID=your_google_web_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8000/public/auth/google/callback

# JWT 토큰 설정
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30
```

## 3. 클라이언트 설정

### 3.1 패키지 설치
```bash
cd client
pnpm add @react-native-google-signin/google-signin
```

### 3.2 환경변수 설정
클라이언트의 `.env` 파일에 다음 변수를 추가:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id_here
```

### 3.3 딥링크 설정
`app.json`에 이미 스킴이 추가되어 있습니다:
```json
{
  "expo": {
    "scheme": "ottrip"
  }
}
```

## 4. 인증 플로우

### 4.1 클라이언트 (React Native)
1. `@react-native-google-signin/google-signin`으로 Google Sign-In 실행
2. `id_token` 획득
3. 서버에 `id_token` 전송

### 4.2 서버 (FastAPI)
1. Google OAuth 서버에 `id_token` 검증 요청
2. `aud` (클라이언트 ID) 검증
3. 사용자 정보 추출 및 내부 JWT 발급
4. 액세스/리프레시 토큰 반환

## 5. 테스트

### 5.1 서버 실행
```bash
cd server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5.2 클라이언트 실행
```bash
cd client
pnpm dev
```

### 5.3 로그인 테스트
1. 앱에서 "Google로 로그인" 버튼 클릭
2. Google 계정 선택 및 권한 승인
3. 서버에서 내부 JWT 발급
4. 로그인 완료

## 6. 문제 해결

### 6.1 "invalid_client" 오류
- `GOOGLE_CLIENT_ID`와 `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`가 올바른지 확인
- Google Cloud Console에서 OAuth 동의 화면 설정 완료

### 6.2 "SIGN_IN_REQUIRED" 오류
- Google Play Services가 설치되어 있는지 확인
- 네트워크 연결 상태 확인

### 6.3 "PLAY_SERVICES_NOT_AVAILABLE" 오류
- Android 기기에서 Google Play Services 업데이트
- 에뮬레이터 사용 시 Google Play Services 이미지 사용

## 7. 보안 고려사항

1. **id_token 검증**: 서버에서 Google OAuth 서버에 직접 검증
2. **aud 검증**: 클라이언트 ID 일치 여부 확인
3. **토큰 만료**: 액세스 토큰 30분, 리프레시 토큰 30일로 설정
4. **HTTPS**: 프로덕션에서는 반드시 HTTPS 사용
5. **환경변수**: 민감한 정보는 환경변수로 관리

## 8. 프로덕션 배포 시

1. Google Cloud Console에서 프로덕션 도메인 추가
2. 서버/클라이언트 환경변수 업데이트
3. HTTPS 설정 확인
4. 토큰 만료 시간 조정 (필요시)

## 9. 코드 예시

### 클라이언트 로그인
```typescript
const userInfo = await GoogleSignin.signIn();
const idToken = userInfo.idToken;
const authResponse = await authApi.googleIdTokenLogin(idToken);
```

### 서버 검증
```python
response = await client.get(
    "https://oauth2.googleapis.com/tokeninfo",
    params={"id_token": payload.id_token}
)
data = response.json()
if data.get("aud") != auth_settings.GOOGLE_CLIENT_ID:
    raise HTTPException(status_code=401, detail="Invalid client ID")
``` 