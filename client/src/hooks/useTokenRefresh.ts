import { useEffect, useRef } from 'react';
import { Platform, AppState, type AppStateStatus } from 'react-native';
import { refreshToken } from '@/services/api';

/**
 * 주기적으로 토큰 만료를 체크하고 필요시 갱신하는 훅
 * 
 * - 2분마다 토큰 만료 상태를 체크
 * - 앱이 포그라운드로 복귀할 때도 체크
 * - 만료 5분 전에 자동으로 토큰 갱신
 */
export function useTokenRefresh() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const checkAndRefresh = async () => {
      // 만료 체크 활성화하여 만료 5분 전일 때만 갱신
      await refreshToken(true);
    };

    // 초기 체크
    checkAndRefresh();

    // 2분마다 체크 (1분은 너무 자주하므로 2분으로 설정)
    intervalRef.current = setInterval(checkAndRefresh, 2 * 60 * 1000);

    // 앱 상태 변화 감지 (모바일)
    if (Platform.OS !== 'web') {
      const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        // 백그라운드에서 포그라운드로 복귀할 때 체크
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

    // 웹 환경: visibilitychange 이벤트 사용
    if (typeof window !== 'undefined') {
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          // 탭이 다시 보일 때 체크
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

