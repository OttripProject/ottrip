import { useEffect, useRef } from 'react';
import { Platform, AppState, type AppStateStatus } from 'react-native';
import { refreshToken } from '@/services/api';
import { authApi } from '@/services/auth';


export function useTokenRefresh() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const checkAndRefresh = async () => {
      if (Platform.OS === 'web') {
        try {
          const isLoggedIn = await authApi.checkLoginStatus();
          if (!isLoggedIn) {
            return;
          }
        } catch (error) {
          return;
        }
      }
      await refreshToken(true);
    };

    checkAndRefresh();

    intervalRef.current = setInterval(checkAndRefresh, 2 * 60 * 1000);

    if (Platform.OS !== 'web') {
      const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          checkAndRefresh();
        }
        appStateRef.current = nextAppState;
      });

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        subscription.remove();
      };
    }

    if (typeof window !== 'undefined') {
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          checkAndRefresh();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}

