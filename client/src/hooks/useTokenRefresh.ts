import { useEffect, useRef } from 'react';
import { Platform, AppState, type AppStateStatus } from 'react-native';
import { refreshToken } from '@/services/api';


export function useTokenRefresh(isAuthenticated: boolean = false) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAndRefresh = async () => {
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
  }, [isAuthenticated]);
}

