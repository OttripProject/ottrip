import { Platform } from 'react-native';

// 웹 환경에서는 SecureStore를 사용할 수 없으므로 조건부 import
let SecureStore: any = null;

if (Platform.OS !== 'web') {
  try {
    SecureStore = require('expo-secure-store').default;
  } catch (error) {
    // Silent fail
  }
}

export function defineSecureStore<T extends string>(key: string) {
  const isWeb = Platform.OS === 'web';
  
  return {
    getSync: (): T | null => {
      try {
        if (isWeb) {
          // 웹: httpOnly 쿠키는 JavaScript로 읽을 수 없으므로 항상 null 반환
          return null;
        } else if (SecureStore) {
          return SecureStore.getItem(key) as T | null;
        }
        return null;
      } catch (error) {
        return null;
      }
    },

    setSync: (value: T): void => {
      try {
        if (isWeb) {
          // 웹: httpOnly 쿠키는 서버에서 설정하므로 클라이언트에서 저장 불필요
          return;
        } else if (SecureStore) {
          SecureStore.setItem(key, value);
        }
      } catch (error) {
        throw error;
      }
    },

    get: async (): Promise<T | null> => {
      try {
        if (isWeb) {
          // 웹: httpOnly 쿠키는 JavaScript로 읽을 수 없으므로 항상 null 반환
          // 서버에서 자동으로 쿠키를 전송하므로 클라이언트에서 읽을 필요 없음
          return null;
        } else if (SecureStore) {
          // Native: 기존 SecureStore 사용
          const value = await SecureStore.getItemAsync(key);
          return value as T | null;
        } else {
          // SecureStore가 없으면 메모리에서 읽기 (개발용)
          if ((global as any).__tempStorage && (global as any).__tempStorage[key]) {
            return (global as any).__tempStorage[key] as T;
          }
          return null;
        }
      } catch (error) {
        return null;
      }
    },

    set: async (value: T): Promise<void> => {
      try {
        if (isWeb) {
          // 웹: httpOnly 쿠키는 서버에서 설정하므로 클라이언트에서 저장 불필요
          // Native 환경에서만 저장
          return;
        } else if (SecureStore) {
          await SecureStore.setItemAsync(key, value);
        } else {
          // SecureStore가 없으면 메모리에 임시 저장 (개발용)
          if (!(global as any).__tempStorage) {
            (global as any).__tempStorage = {};
          }
          (global as any).__tempStorage[key] = value;
        }
      } catch (error) {
        throw error;
      }
    },

    clear: async (): Promise<void> => {
      try {
        if (isWeb) {
          // 웹: httpOnly 쿠키는 서버에서 삭제하므로 클라이언트에서 삭제 불필요
          // localStorage에 남아있을 수 있는 기존 토큰 정리 (마이그레이션용)
          try {
            localStorage.removeItem(key);
          } catch {
            // Silent fail
          }
        } else if (SecureStore) {
          await SecureStore.deleteItemAsync(key);
        } else {
          // 메모리 저장소에서 삭제
          if ((global as any).__tempStorage) {
            delete (global as any).__tempStorage[key];
          }
        }
      } catch (error) {
        throw error;
      }
    },

    key,
  };
} 