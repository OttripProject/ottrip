import { defineSecureStore } from "./defineSecureStore";
import { STORAGE_KEYS } from "../core/constants";

export const accessTokenStore = defineSecureStore<string>(STORAGE_KEYS.ACCESS_TOKEN);

export const refreshTokenStore = defineSecureStore<string>(STORAGE_KEYS.REFRESH_TOKEN);

export const registerTokenStore = defineSecureStore<string>(STORAGE_KEYS.REGISTER_TOKEN);

export const tokenStores = {
  accessToken: accessTokenStore,
  refreshToken: refreshTokenStore,
  registerToken: registerTokenStore,

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

  clearAll: async () => {
    await Promise.all([
      accessTokenStore.clear(),
      refreshTokenStore.clear(),
      registerTokenStore.clear(),
    ]);
  },

  hasTokens: async () => {
    const accessToken = await accessTokenStore.get();
    const refreshToken = await refreshTokenStore.get();
    return !!(accessToken && refreshToken);
  },
}; 