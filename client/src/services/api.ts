import axios from 'axios';
import { Platform } from 'react-native';
import { loadPublicEnv } from '../core/env/schema';
import { tokenStores } from '../utils/tokenStores';
import { isTokenExpiringSoon } from '../utils/jwt';

// axios config에 metadata 타입 추가
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
}

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
  withCredentials: true,  // httpOnly 쿠키 전송 활성화
});
// 동시에 여러 요청이 401을 받았을 때 refresh를 한 번만 실행하기 위한 큐
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

// 전역 플래그로 중복 갱신 방지
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

// 웹 환경: 서버 응답에서 받은 토큰을 메모리에 캐시 (만료 체크용)
// httpOnly 쿠키는 JavaScript로 읽을 수 없으므로, 서버 응답의 토큰을 사용
let cachedWebToken: string | null = null;

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

/**
 * 토큰을 갱신하는 함수
 * @param checkExpiration 만료 체크 여부 (true면 만료 5분 전일 때만 갱신, false면 무조건 갱신)
 * @returns 새 access token 또는 null (갱신 실패 시)
 */
export async function refreshToken(checkExpiration: boolean = true): Promise<string | null> {
  // 이미 갱신 중이면 기존 Promise 반환
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // 만료 체크가 활성화되어 있고, 만료 임박이 아니면 스킵
  if (checkExpiration) {
    if (Platform.OS === 'web') {
      // 웹 환경: 이전에 캐시된 토큰으로 만료 체크
      // httpOnly 쿠키는 JavaScript로 읽을 수 없으므로, 서버 응답에서 받은 토큰을 캐시해서 사용
      if (cachedWebToken && !isTokenExpiringSoon(cachedWebToken, 5)) {
        return cachedWebToken; // 만료 임박이 아니면 갱신하지 않음
      }
    } else {
      // Native 환경: 로컬 저장소에서 토큰 읽기
      const token = await tokenStores.accessToken.get();
      if (!token || !isTokenExpiringSoon(token, 5)) {
        return token; // 기존 토큰 반환 (만료 임박이 아니면 갱신하지 않음)
      }
    }
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      // 웹 환경: 쿠키가 자동으로 전송되므로 body에 refresh_token 불필요
      // Native 환경: refresh_token을 body에 포함
      const refreshPayload = Platform.OS === 'web' 
        ? {} 
        : { refresh_token: await tokenStores.refreshToken.get() };

      const refreshResponse = await axios.post(
        `${resolvedBaseURL}/public/auth/refresh`,
        refreshPayload,
        { 
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,  // 쿠키 전송
        }
      );

      // Native 환경에서만 토큰 저장 (웹은 쿠키로 자동 설정)
      if (Platform.OS !== 'web') {
        const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data;
        await tokenStores.setAll({
          accessToken: accessToken,
          refreshToken: newRefreshToken,
        });
        return accessToken;
      } else {
        // 웹 환경: 쿠키로 설정되므로 응답에서 토큰을 읽을 수 없음
        // 하지만 서버가 JSON 응답도 반환하므로 하위 호환을 위해 사용
        // 또한 만료 체크를 위해 토큰을 메모리에 캐시
        const { accessToken } = refreshResponse.data;
        if (accessToken) {
          cachedWebToken = accessToken; // 다음 만료 체크를 위해 캐시
        }
        return accessToken || null;
      }
    } catch (error: any) {
      // Native 환경에서만 저장소 정리
      if (Platform.OS !== 'web') {
        await tokenStores.clearAll();
      }
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * 갱신 중인지 확인
 */
export function isTokenRefreshing(): boolean {
  return isRefreshing;
}

api.interceptors.request.use(async config => {
  // dev에서 성능측정용
  config.metadata = { startTime: Date.now() };
  
  // 웹 환경: httpOnly 쿠키가 자동으로 전송되므로 헤더 설정 불필요
  if (Platform.OS === 'web') {
    return config;
  }
  
  // Native 환경: 기존 로직 유지 (헤더로 토큰 전송)
  try {
    const token = await tokenStores.accessToken.get();
    if (token) {
      // 만료 5분 전이면 미리 갱신 시도
      if (isTokenExpiringSoon(token, 5)) {
        // 이미 갱신 중이면 대기
        if (isTokenRefreshing()) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(newToken => {
            config.headers['X-Auth-Token'] = newToken || token;
            return config;
          }).catch(() => {
            // 갱신 실패 시 기존 토큰으로 진행 (401 발생 시 response interceptor에서 처리)
            config.headers['X-Auth-Token'] = token;
            return config;
          });
        }
        
        // 토큰 갱신 시도
        const newToken = await refreshToken(true);
        if (newToken) {
          processQueue(null, newToken);
          config.headers['X-Auth-Token'] = newToken;
          return config;
        }
        // 갱신 실패 시 기존 토큰으로 진행
      }
      
      config.headers['X-Auth-Token'] = token;
    }
  } catch (error: any) {
    // Silent fail
  }
  return config;
});

api.interceptors.response.use(
  response => {
    return response;
  },
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isTokenRefreshing()) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers = originalRequest.headers || {};
            // Native 환경에서만 헤더 설정 (웹은 쿠키 자동 전송)
            if (Platform.OS !== 'web' && token) {
              (originalRequest.headers as any)["X-Auth-Token"] = token;
            }
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;

      // 401 발생 시 무조건 갱신 시도 (만료 체크 없이)
      const newToken = await refreshToken(false);
      
      if (newToken) {
        originalRequest.headers = originalRequest.headers || {};
        
        // Native 환경에서만 헤더 설정 (웹은 쿠키 자동 전송)
        if (Platform.OS !== 'web') {
          (originalRequest.headers as any)["X-Auth-Token"] = newToken;
          if ((originalRequest.headers as any)["Authorization"]) {
            delete (originalRequest.headers as any)["Authorization"];
          }
        }

        // 대기 중인 요청들에 새 토큰 전달
        processQueue(null, newToken);

        // 토큰 갱신 후 원래 요청 재시도
        return api(originalRequest);
      } else {
        // 갱신 실패 시 대기 중인 요청들에 에러 전달
        processQueue(new Error('Token refresh failed'), null);
      }
    }

    return Promise.reject(error);
  }
);

export default api; 