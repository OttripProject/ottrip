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
      originalRequest._retry = true;

      try {
        const refreshToken = await tokenStores.refreshToken.get();
        if (refreshToken) {
          const refreshResponse = await axios.post(
            `${resolvedBaseURL}/public/auth/refresh`,
            { refresh_token: refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { access_token, refresh_token } = refreshResponse.data;

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
        await tokenStores.clearAll();
      }
    }

    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api; 