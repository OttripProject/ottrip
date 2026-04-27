import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { authApi, TokenResponse, AuthResponse, RegisteredAuthResponse } from '../services/auth';
import { tokenStores } from '../utils/tokenStores'; 
import { useTokenRefresh } from '../hooks/useTokenRefresh';
import { queryClient } from './QueryProvider';
import { isTokenExpiringSoon } from '../utils/jwt';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  login: (authResponse: AuthResponse) => Promise<void>;
  loginAsGuest: () => Promise<void>;
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

  useTokenRefresh(isAuthenticated);

  const saveTokens = async (tokens: TokenResponse) => {
    try {
      if (Platform.OS !== 'web') {
        await tokenStores.setAll({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      }
    } catch (error: any) {
    }
  };

  const clearTokens = async () => {
    try {
      await tokenStores.clearAll();
    } catch (error: any) {
    }
  };

  const refreshAuth = async () => {
    try {
      if (Platform.OS === 'web') {
        const tokenData = await authApi.refreshToken('');
        setIsAuthenticated(true);
      } else {
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

  const login = async (authResponse: AuthResponse) => {
    if (authResponse.isRegistered) {
      await saveTokens(authResponse);
      if (Platform.OS !== 'web') {
        try {
          await tokenStores.registerToken.clear();
        } catch {
          /* noop */
        }
      }
      queryClient.removeQueries({ queryKey: ['me'] });
      setIsAuthenticated(true);
    } else {
      await tokenStores.registerToken.set(authResponse.registerToken);
    }
  };

  const loginAsGuest = async () => {
    const res: RegisteredAuthResponse = await authApi.loginAsGuest();
    await login({
      isRegistered: true,
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
    });
  };

  const logout = async () => {
    try {
      if (Platform.OS === 'web') {
        await authApi.logout();
      } else {
        try {
          await authApi.logout();
        } catch {}
        await clearTokens();
      }
    } catch (error: any) {
      await clearTokens();
    }

    queryClient.clear();
    setIsAuthenticated(false);
    setUser(null);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try { window.localStorage.removeItem('postLoginRedirect'); } catch {}
      try { window.history.replaceState({}, document.title, '/login'); } catch {}
    }
  };

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        if (Platform.OS === 'web') {
          try {
            const isLoggedIn = await authApi.checkLoginStatus();
            if (isLoggedIn) {
              setIsAuthenticated(true);
            }
          } catch (error: any) {
            setIsAuthenticated(false);
          }
        } else {
          const accessToken = await tokenStores.accessToken.get();

          if (accessToken && !isTokenExpiringSoon(accessToken, 0)) {
            // accessToken 유효 → 바로 인증 처리
            setIsAuthenticated(true);
          } else {
            // accessToken 없거나 만료 → refreshToken으로 복구 시도
            const storedRefreshToken = await tokenStores.refreshToken.get();
            if (storedRefreshToken) {
              try {
                const tokenData = await authApi.refreshToken(storedRefreshToken);
                await tokenStores.setAll({
                  accessToken: tokenData.accessToken,
                  refreshToken: tokenData.refreshToken,
                });
                setIsAuthenticated(true);
              } catch {
                await tokenStores.clearAll();
              }
            }
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
    loginAsGuest,
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