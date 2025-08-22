/**
 * Application constants
 */

export const APP_CONSTANTS = {
  NAME: "OTTRIP",
  DESCRIPTION: "여행 계획을 더 스마트하게",
  VERSION: "1.0.0",
} as const;

export const API_CONSTANTS = {
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
  REGISTER_TOKEN: "registerToken",
  USER_PREFERENCES: "userPreferences",
} as const;

export const NAVIGATION_CONSTANTS = {
  AUTH_STACK: "AuthStack",
  MAIN_STACK: "MainStack",
  LOGIN_SCREEN: "Login",
  DASHBOARD_SCREEN: "Dashboard",
  SETTINGS_SCREEN: "Settings",
} as const; 