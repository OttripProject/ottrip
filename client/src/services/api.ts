import axios from 'axios';
import { Platform } from 'react-native';
import { loadPublicEnv } from '../core/env/schema';
import { tokenStores } from '../utils/tokenStores';
import { isTokenExpiringSoon } from '../utils/jwt';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
}

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
  withCredentials: true,
});
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

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

export async function refreshToken(checkExpiration: boolean = true): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  if (checkExpiration) {
    if (Platform.OS === 'web') {
      if (cachedWebToken && !isTokenExpiringSoon(cachedWebToken, 5)) {
        return cachedWebToken;
      }
    } else {
      const token = await tokenStores.accessToken.get();
      if (!token || !isTokenExpiringSoon(token, 5)) {
        return token;
      }
    }
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshPayload = Platform.OS === 'web' 
        ? {} 
        : { refresh_token: await tokenStores.refreshToken.get() };

      const refreshResponse = await axios.post(
        `${resolvedBaseURL}/public/auth/refresh`,
        refreshPayload,
        { 
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );

      if (Platform.OS !== 'web') {
        const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data;
        await tokenStores.setAll({
          accessToken: accessToken,
          refreshToken: newRefreshToken,
        });
        return accessToken;
      } else {
        const { accessToken } = refreshResponse.data;
        if (accessToken) {
          cachedWebToken = accessToken;
        }
        return accessToken || null;
      }
    } catch (error: any) {
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

export function isTokenRefreshing(): boolean {
  return isRefreshing;
}

api.interceptors.request.use(async config => {
  config.metadata = { startTime: Date.now() };
  
  if (Platform.OS === 'web') {
    return config;
  }
  
  try {
    const token = await tokenStores.accessToken.get();
    if (token) {
      if (isTokenExpiringSoon(token, 5)) {
        if (isTokenRefreshing()) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(newToken => {
            config.headers['X-Auth-Token'] = newToken || token;
            return config;
          }).catch(() => {
            config.headers['X-Auth-Token'] = token;
            return config;
          });
        }
        
        const newToken = await refreshToken(true);
        if (newToken) {
          processQueue(null, newToken);
          config.headers['X-Auth-Token'] = newToken;
          return config;
        }
      }
      
      config.headers['X-Auth-Token'] = token;
    }
  } catch (error: any) {
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

      const newToken = await refreshToken(false);
      
      if (newToken) {
        originalRequest.headers = originalRequest.headers || {};
        
        if (Platform.OS !== 'web') {
          (originalRequest.headers as any)["X-Auth-Token"] = newToken;
          if ((originalRequest.headers as any)["Authorization"]) {
            delete (originalRequest.headers as any)["Authorization"];
          }
        }

        processQueue(null, newToken);

        return api(originalRequest);
      } else {
        processQueue(new Error('Token refresh failed'), null);
      }
    }

    return Promise.reject(error);
  }
);

export default api; 