import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { authApi, TokenResponse, AuthResponse } from '../services/auth';
import { tokenStores } from '../utils/tokenStores'; // 새로운 토큰 스토어 사용
import { useTokenRefresh } from '../hooks/useTokenRefresh';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  login: (authResponse: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  getStorageInfo: () => any;
  debugTokens: () => Promise<{ accessToken: string | null; refreshToken: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);

  // 주기적 토큰 갱신 활성화 (2분마다 체크, 만료 5분 전에 갱신)
  useTokenRefresh();

  // 토큰 저장
  const saveTokens = async (tokens: TokenResponse) => {
    try {
      // Native 환경에서만 저장 (웹은 httpOnly 쿠키로 자동 설정됨)
      if (Platform.OS !== 'web') {
        await tokenStores.setAll({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      }
    } catch (error: any) {
      // Silent fail
    }
  };

  // 토큰 삭제
  const clearTokens = async () => {
    try {
      await tokenStores.clearAll();
    } catch (error: any) {
      // Silent fail
    }
  };

  // 토큰 갱신
  const refreshAuth = async () => {
    try {
      // 웹 환경: 쿠키가 자동으로 전송되므로 refreshToken 읽기 불필요
      // Native 환경: refreshToken을 body에 포함하여 호출
      if (Platform.OS === 'web') {
        // 웹: 쿠키가 자동으로 전송되므로 빈 body로 호출
        const tokenData = await authApi.refreshToken('');
        // 웹 환경에서는 토큰 저장 불필요 (쿠키로 자동 설정)
        setIsAuthenticated(true);
      } else {
        // Native: 기존 로직 유지
        const refreshToken = await tokenStores.refreshToken.get();
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const tokenData = await authApi.refreshToken(refreshToken);
        await saveTokens(tokenData);
        setIsAuthenticated(true);
      }
    } catch (error: any) {
      await logout();
    }
  };

    // 로그인
  const login = async (authResponse: AuthResponse) => {
    if (authResponse.isRegistered) {
      await saveTokens(authResponse);
      setIsAuthenticated(true);
      // TODO: 사용자 정보 설정
    } else {
      // 미등록 사용자 - 등록 토큰 저장
      await tokenStores.registerToken.set(authResponse.registerToken);
      // TODO: 사용자 등록 화면으로 이동
    }
  };

  // 로그아웃
  const logout = async () => {
    try {
      // 웹: 서버 로그아웃 API 호출 (쿠키 삭제)
      if (Platform.OS === 'web') {
        await authApi.logout();
      } else {
        // Native: 로컬 저장소 삭제
        await clearTokens();
      }
    } catch (error: any) {
      // Native 환경에서도 로컬 삭제는 수행
      await clearTokens();
    }
    
    setIsAuthenticated(false);
    setUser(null);
    // 웹: 오래된 redirect 제거 및 로그인 경로로 변경하여 재로그인 시 의도치 않은 복귀 방지
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try { window.localStorage.removeItem('postLoginRedirect'); } catch {}
      try { window.history.replaceState({}, document.title, '/login'); } catch {}
    }
  };

  // 초기 인증 상태 확인
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // 웹 환경: 초기 로드 시 한 번만 서버 상태 확인 (쿠키 유효성 검증)
        // Native 환경: 로컬 토큰만 확인 (서버 확인은 첫 API 요청 시 자동 수행)
        if (Platform.OS === 'web') {
          try {
            const isLoggedIn = await authApi.checkLoginStatus();
            if (isLoggedIn) {
              setIsAuthenticated(true);
            }
          } catch (error: any) {
            // 쿠키가 없거나 만료된 경우
            setIsAuthenticated(false);
          }
        } else {
          // Native 환경: 로컬에 토큰이 있으면 인증 상태로 설정
          // 실제 API 요청 시 서버에서 자동으로 인증 확인 (401 발생 시 자동 refresh)
          const accessToken = await tokenStores.accessToken.get();
          
          if (accessToken) {
            // 토큰이 있으면 인증 상태로 설정 (서버 확인은 첫 API 요청 시 자동 수행)
            setIsAuthenticated(true);
          }
        }
      } catch (error: any) {
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    refreshAuth,
    getStorageInfo: () => ({
      hasTokens: tokenStores.hasTokens(),
      stores: {
        accessToken: tokenStores.accessToken.key,
        refreshToken: tokenStores.refreshToken.key,
        registerToken: tokenStores.registerToken.key,
      }
    }),
    // 디버그용 함수 추가
    debugTokens: async () => {
      const accessToken = await tokenStores.accessToken.get();
      const refreshToken = await tokenStores.refreshToken.get();
      return { accessToken, refreshToken };
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 