import { Platform } from 'react-native';

let SecureStore: any = null;

if (Platform.OS !== 'web') {
  try {
    SecureStore = require('expo-secure-store');
  } catch (error) {
  }
}

export function defineSecureStore<T extends string>(key: string) {
  const isWeb = Platform.OS === 'web';
  
  return {
    getSync: (): T | null => {
      try {
        if (isWeb) {
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
          return null;
        } else if (SecureStore) {
          const value = await SecureStore.getItemAsync(key);
          return value as T | null;
        } else {
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
          return;
        } else if (SecureStore) {
          await SecureStore.setItemAsync(key, value);
        } else {
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
          try {
            localStorage.removeItem(key);
          } catch {
          }
        } else if (SecureStore) {
          await SecureStore.deleteItemAsync(key);
        } else {
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