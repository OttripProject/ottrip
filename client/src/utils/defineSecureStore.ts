import { Platform } from 'react-native';

// 웹 환경에서는 SecureStore를 사용할 수 없으므로 조건부 import
let SecureStore: any = null;

if (Platform.OS !== 'web') {
  try {
    SecureStore = require('expo-secure-store').default;
  } catch (error) {
    console.warn('expo-secure-store not available:', error);
  }
}

export function defineSecureStore<T extends string>(key: string) {
  const isWeb = Platform.OS === 'web';
  
  return {
    getSync: (): T | null => {
      try {
        if (isWeb) {
          return localStorage.getItem(key) as T | null;
        } else if (SecureStore) {
          return SecureStore.getItem(key) as T | null;
        }
        return null;
      } catch (error) {
        console.warn(`[SYNC] Failed to get ${key}:`, error);
        return null;
      }
    },

    setSync: (value: T): void => {
      try {
        if (isWeb) {
          localStorage.setItem(key, value);
        } else if (SecureStore) {
          SecureStore.setItem(key, value);
        }
      } catch (error) {
        console.error(`[SYNC] Failed to save ${key}:`, error);
        throw error;
      }
    },

    get: async (): Promise<T | null> => {
      try {
        if (isWeb) {
          const value = localStorage.getItem(key);
          return value as T | null;
        } else if (SecureStore) {
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
        console.error(`[ASYNC] Failed to get ${key}:`, error);
        return null;
      }
    },

    set: async (value: T): Promise<void> => {
      try {
        if (isWeb) {
          localStorage.setItem(key, value);
        } else if (SecureStore) {
          await SecureStore.setItemAsync(key, value);
        } else {
          // SecureStore가 없으면 메모리에 임시 저장 (개발용)
          // 메모리 저장소 (임시)
          if (!(global as any).__tempStorage) {
            (global as any).__tempStorage = {};
          }
          (global as any).__tempStorage[key] = value;
        }
      } catch (error) {
        console.error(`[ASYNC] Failed to save ${key}:`, error);
        throw error;
      }
    },

    clear: async (): Promise<void> => {
      try {
        if (isWeb) {
          localStorage.removeItem(key);
        } else if (SecureStore) {
          await SecureStore.deleteItemAsync(key);
        } else {
          // 메모리 저장소에서 삭제
          if ((global as any).__tempStorage) {
            delete (global as any).__tempStorage[key];
          }
        }
      } catch (error) {
        console.error(`[ASYNC] Failed to clear ${key}:`, error);
        throw error;
      }
    },

    key,
  };
} 