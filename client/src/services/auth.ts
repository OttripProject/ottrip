import api from './api';
import axios from 'axios';
import { envSchema } from '../core/env/schema';

// 환경 변수 파싱
const env = envSchema.parse(process.env);

// Dev 라우터용 API 인스턴스 (토큰 없이 호출)
const devApi = axios.create({
  baseURL: env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 인증 관련 타입 정의
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RegisteredAuthResponse extends TokenResponse {
  isRegistered: true;
}

export interface UnregisteredAuthResponse {
  isRegistered: false;
  registerToken: string;
  prefill: {
    name: string | null;
    nickname: string | null;
    profile_image: string | null;
  };
}

export type AuthResponse = RegisteredAuthResponse | UnregisteredAuthResponse;

export interface UserCreate {
  handle: string;
  nickname: string;
  description: string;
  gender: string;
}

export const authApi = {
  // 서버 시간 조회
  getServerTime: async (): Promise<{ time: string }> => {
    const response = await api.get('/public/auth/time');
    return response.data;
  },

  // 구글 로그인
  googleLogin: async (idToken: string): Promise<AuthResponse> => {
    const response = await api.post('/public/auth/google', {
      id_token: idToken,
    });
    return response.data;
  },

  // 토큰 갱신
  refreshToken: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await api.post('/public/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  // 로그인 상태 확인
  checkLoginStatus: async (): Promise<boolean> => {
    const response = await api.get('/public/auth/valid-token');
    return response.data;
  },

  // 사용자 등록
  registerUser: async (userData: UserCreate, registerToken: string): Promise<TokenResponse> => {
    const requestData = {
      user: userData,
      registerToken: registerToken,
    };
    
    const response = await api.post('/public/auth/register', requestData);
    return response.data;
  },

  // Dev 테스트 라우터 - 테스트 유저 생성 및 토큰 발급 (토큰 없이 호출)
  createTestUser: async (): Promise<TokenResponse> => {
    const response = await devApi.post('/dev/create-test-user');
    return response.data;
  },

  // Dev 테스트 라우터 - 특정 유저 ID로 토큰 생성 (토큰 없이 호출)
  createTestUserToken: async (userId: number): Promise<string> => {
    const response = await devApi.get(`/dev/create-test-user-token?user_id=${userId}`);
    return response.data;
  },
}; 