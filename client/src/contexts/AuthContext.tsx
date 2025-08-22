import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, TokenResponse, AuthResponse } from '../services/auth';
import { tokenStores } from '../utils/tokenStores'; // 새로운 토큰 스토어 사용

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

  // 토큰 저장
  const saveTokens = async (tokens: TokenResponse) => {
    try {
      // 새로운 토큰 스토어 사용
      await tokenStores.setAll({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      
      // 저장된 토큰 확인
      const savedToken = await tokenStores.accessToken.get();
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  };

  // 토큰 삭제
  const clearTokens = async () => {
    try {
      await tokenStores.clearAll();
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  };

  // 토큰 갱신
  const refreshAuth = async () => {
    try {
      const refreshToken = await tokenStores.refreshToken.get();
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const tokenData = await authApi.refreshToken(refreshToken);
      await saveTokens(tokenData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Token refresh error:', error);
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
    await clearTokens();
    setIsAuthenticated(false);
    setUser(null);
  };

  // 초기 인증 상태 확인
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const accessToken = await tokenStores.accessToken.get();
        
        if (accessToken) {
          try {
            const isLoggedIn = await authApi.checkLoginStatus();
            
            if (isLoggedIn) {
              setIsAuthenticated(true);
              // TODO: 사용자 정보 로드?
            } else {
              await refreshAuth();
            }
          } catch (error) {
            console.error('Login status check failed:', error);
            await logout();
          }
        } else {
          console.log('⚠️ No token found, user not authenticated');
        }
      } catch (error) {
        console.error('Auth check error:', error);
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