import { useEffect, useRef } from 'react';
import { Platform, AppState, type AppStateStatus } from 'react-native';
import { refreshToken } from '@/services/api';
import { authApi } from '@/services/auth';

/**
 * 주기적으로 토큰 만료를 체크하고 필요시 갱신하는 훅
 * 
 * - 2분마다 토큰 만료 상태를 체크
 * - 앱이 포그라운드로 복귀할 때도 체크
 * - 만료 5분 전에 자동으로 토큰 갱신
 * 
 * 웹 환경: 쿠키가 자동으로 전송되므로 토큰 읽기 불필요, 서버에서 자동 갱신
 * Native 환경: 기존 로직 유지
 */
export function useTokenRefresh() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const checkAndRefresh = async () => {
      // 웹 환경: 먼저 로그인 상태 확인 (쿠키가 없으면 refresh 시도하지 않음)
      if (Platform.OS === 'web') {
        try {
          const isLoggedIn = await authApi.checkLoginStatus();
          if (!isLoggedIn) {
            // 로그인되지 않은 상태에서는 refresh 시도하지 않음
            return;
          }
        } catch (error) {
          // 로그인 상태 확인 실패 시 refresh 시도하지 않음
          return;
        }
      }
      
      // Native 환경: 만료 체크 활성화하여 만료 5분 전일 때만 갱신
      // 웹 환경: 서버 응답의 토큰을 사용하여 만료 체크 (쿠키는 httpOnly이므로 직접 읽을 수 없음)
      await refreshToken(true); // 모든 환경에서 만료 체크 활성화
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

