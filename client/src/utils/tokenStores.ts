import { defineSecureStore } from "./defineSecureStore";
import { STORAGE_KEYS } from "../core/constants";

/**
 * 토큰별 전용 SecureStore 인스턴스
 * 
 * 장점:
 * 1. 타입 안전성: 각 토큰이 올바른 타입으로 처리됨
 * 2. 키 관리: 중앙화된 키 관리로 오타 방지
 * 3. 일관성: 모든 토큰이 동일한 인터페이스 사용
 * 4. 디버깅: 각 토큰별로 구분된 로그
 */

// Access Token Store
export const accessTokenStore = defineSecureStore<string>(STORAGE_KEYS.ACCESS_TOKEN);

// Refresh Token Store  
export const refreshTokenStore = defineSecureStore<string>(STORAGE_KEYS.REFRESH_TOKEN);

// Register Token Store
export const registerTokenStore = defineSecureStore<string>(STORAGE_KEYS.REGISTER_TOKEN);

/**
 * 모든 토큰을 한번에 관리하는 유틸리티
 */
export const tokenStores = {
  accessToken: accessTokenStore,
  refreshToken: refreshTokenStore,
  registerToken: registerTokenStore,

  /**
   * 모든 토큰 조회
   */
  getAll: async () => {
    const [accessToken, refreshToken, registerToken] = await Promise.all([
      accessTokenStore.get(),
      refreshTokenStore.get(),
      registerTokenStore.get(),
    ]);

    return {
      accessToken,
      refreshToken,
      registerToken,
    };
  },

  /**
   * 모든 토큰 저장
   */
  setAll: async (tokens: {
    accessToken: string;
    refreshToken: string;
    registerToken?: string;
  }) => {
    const promises = [
      accessTokenStore.set(tokens.accessToken),
      refreshTokenStore.set(tokens.refreshToken),
    ];

    if (tokens.registerToken) {
      promises.push(registerTokenStore.set(tokens.registerToken));
    }

    await Promise.all(promises);
  },

  /**
   * 모든 토큰 삭제
   */
  clearAll: async () => {
    await Promise.all([
      accessTokenStore.clear(),
      refreshTokenStore.clear(),
      registerTokenStore.clear(),
    ]);
  },

  /**
   * 토큰 존재 여부 확인
   */
  hasTokens: async () => {
    const accessToken = await accessTokenStore.get();
    const refreshToken = await refreshTokenStore.get();
    return !!(accessToken && refreshToken);
  },
}; 