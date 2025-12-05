import axios from 'axios';
import { loadPublicEnv } from '../core/env/schema';
import { tokenStores } from '../utils/tokenStores';

// 환경 변수 파싱
const env = loadPublicEnv();

let resolvedBaseURL = env.EXPO_PUBLIC_API_URL;
if (typeof window !== 'undefined') {
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') {
    resolvedBaseURL = 'http://localhost:8080';
  }
}

const api = axios.create({
  baseURL: resolvedBaseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});
console.log('Base URL:', api.defaults.baseURL);
// 동시에 여러 요청이 401을 받았을 때 refresh를 한 번만 실행하기 위한 플래그
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  
  failedQueue = [];
};

api.interceptors.request.use(async config => {
  try {
    const token = await tokenStores.accessToken.get();
    if (token) {
      config.headers['X-Auth-Token'] = token;
    } else {
      console.log('⚠️ No token available for request');
    }
  } catch (error) {
    console.error('Error getting token:', error);
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 이미 refresh 중이면 대기 큐에 추가
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers = originalRequest.headers || {};
            (originalRequest.headers as any)["X-Auth-Token"] = token;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = await tokenStores.refreshToken.get();
        if (storedRefreshToken) {
          const refreshResponse = await axios.post(
            `${resolvedBaseURL}/public/auth/refresh`,
            { refresh_token: storedRefreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data;

          await tokenStores.setAll({
            accessToken: accessToken,
            refreshToken: newRefreshToken,
          });

          originalRequest.headers = originalRequest.headers || {};
          (originalRequest.headers as any)["X-Auth-Token"] = accessToken;
          if ((originalRequest.headers as any)["Authorization"]) {
            delete (originalRequest.headers as any)["Authorization"];
          }

          // 대기 중인 요청들에 새 토큰 전달
          processQueue(null, accessToken);
          isRefreshing = false;

          // 토큰 갱신 후 원래 요청 재시도
          return api(originalRequest);
        } else {
          throw new Error('No refresh token available');
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        processQueue(refreshError, null);
        isRefreshing = false;
        await tokenStores.clearAll();
        // 토큰 갱신 실패 시 원래 에러 반환
      }
    }

    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api; 