import api from './api';
import axios from 'axios';
import { envSchema } from '../core/env/schema';

const env = envSchema.parse(process.env);

const devApi = axios.create({
  baseURL: env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  agreed_terms?: boolean;
  agreed_privacy?: boolean;
  agreed_marketing?: boolean;
}

export const authApi = {
  getServerTime: async (): Promise<{ time: string }> => {
    const response = await api.get('/public/auth/time');
    return response.data;
  },

  googleLogin: async (idToken: string): Promise<AuthResponse> => {
    const response = await api.post('/public/auth/google', {
      id_token: idToken,
    });
    return response.data;
  },

  appleLogin: async (identityToken: string): Promise<AuthResponse> => {
    const response = await api.post('/public/auth/apple', {
      identity_token: identityToken,
    });
    return response.data;
  },

  loginAsGuest: async (): Promise<RegisteredAuthResponse> => {
    const response = await api.post('/public/auth/guest', {});
    return response.data;
  },

  refreshToken: async (refreshToken?: string): Promise<TokenResponse> => {
    const payload = refreshToken ? { refresh_token: refreshToken } : {};
    const response = await api.post('/public/auth/refresh', payload);
    return response.data;
  },

  checkLoginStatus: async (): Promise<boolean> => {
    const response = await api.get('/public/auth/valid-token');
    return response.data;
  },

  validateHandle: async (handle: string): Promise<{ error: string | null }> => {
    const response = await api.post('/public/auth/validate/handle', { handle }, 
    );
    return response.data;
  },

  validateNickname: async (nickname: string): Promise<{ error: string | null }> => {
    const response = await api.post('/public/auth/validate/nickname', { nickname }, 
    );
    return response.data;
  },

  registerUser: async (userData: UserCreate, registerToken: string): Promise<TokenResponse> => {
    const requestData = {
      user: userData,
      registerToken: registerToken,
    };
    
    const response = await api.post('/public/auth/register', requestData);
    return response.data;
  },

  createTestUser: async (): Promise<TokenResponse> => {
    const response = await devApi.post('/dev/create-test-user');
    return response.data;
  },

  createTestUserToken: async (userId: number): Promise<string> => {
    const response = await devApi.get(`/dev/create-test-user-token?user_id=${userId}`);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/public/auth/logout');
  },
}; 