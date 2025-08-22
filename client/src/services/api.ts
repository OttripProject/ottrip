import axios from 'axios';
import { envSchema } from '../core/env/schema';
import { tokenStores } from '../utils/tokenStores';

// 환경 변수 파싱
const env = envSchema.parse(process.env);

const api = axios.create({
  baseURL: env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token if available
api.interceptors.request.use(async config => {
  try {
    const token = await tokenStores.accessToken.get();
    if (token) {
      // 서버는 X-Auth-Token 헤더를 기대함
      config.headers['X-Auth-Token'] = token;
    } else {
      console.log('⚠️ No token available for request');
    }
  } catch (error) {
    console.error('Error getting token:', error);
  }
  return config;
});

// Response interceptor: handle common errors and token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // 401 에러이고 아직 재시도하지 않았다면 토큰 갱신 시도
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await tokenStores.refreshToken.get();
        if (refreshToken) {
          // 토큰 갱신 API 호출
          const refreshResponse = await axios.post(
            `${env.EXPO_PUBLIC_API_URL}/public/auth/refresh`,
            { refresh_token: refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { access_token, refresh_token } = refreshResponse.data;

          // 새로운 토큰 스토어 사용
          await tokenStores.setAll({
            accessToken: access_token,
            refreshToken: refresh_token,
          });

          originalRequest.headers = originalRequest.headers || {};
          (originalRequest.headers as any)["X-Auth-Token"] = access_token;
          if ((originalRequest.headers as any)["Authorization"]) {
            delete (originalRequest.headers as any)["Authorization"];
          }

          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // 토큰 갱신 실패 시 로그아웃 처리
        await tokenStores.clearAll();
        // TODO: 로그인 화면으로 리다이렉트
      }
    }

    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api; 