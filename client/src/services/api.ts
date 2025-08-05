import axios from 'axios';
import { envSchema } from '../core/env/schema';

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
api.interceptors.request.use(config => {
  // const token = await SecureStore.getItemAsync('accessToken');
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle common errors
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api; 