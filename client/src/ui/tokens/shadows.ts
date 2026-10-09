import { Platform } from "react-native";

export const shadows = {
  xs: Platform.select({
    ios: {
      shadowColor: "#141828",
      shadowOpacity: 0.06,
      shadowRadius: 1,
      shadowOffset: { width: 0, height: 1 },
    },
    android: { elevation: 1 },
    default: { boxShadow: "0 1px 2px rgba(20,24,40,0.06)" } as any,
  }),
  xsHover: Platform.select({
    ios: {
      shadowColor: "#141828",
      shadowOpacity: 0.14,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 3 },
    default: { boxShadow: "0 4px 12px -4px rgba(20,24,40,0.14)" } as any,
  }),
  sm: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    android: { elevation: 2 },
    default: { boxShadow: "0 2px 6px rgba(0,0,0,0.08)" } as any,
  }),
  md: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 4 },
    default: { boxShadow: "0 4px 10px rgba(0,0,0,0.12)" } as any,
  }),
  lg: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 8 },
    default: { boxShadow: "0 8px 24px rgba(0,0,0,0.10)" } as any,
  }),
  xl: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 24 },
    },
    android: { elevation: 12 },
    default: { boxShadow: "0 24px 48px rgba(0,0,0,0.12)" } as any,
  }),
  focusRing: Platform.select({
    ios: {},
    android: {},
    default: {
      boxShadow:
        "0 0 0 1px rgba(0,122,255,0.5), 0 0 0 4px rgba(0,122,255,0.14)",
    } as any,
  }),
  filledFocusRing: Platform.select({
    ios: {},
    android: {},
    default: { boxShadow: "0 0 0 4px rgba(0,122,255,0.12)" } as any,
  }),
  errorRing: Platform.select({
    ios: {},
    android: {},
    default: {
      boxShadow:
        "0 0 0 1px rgba(239,68,68,0.5), 0 0 0 4px rgba(239,68,68,0.14)",
    } as any,
  }),
  insetBottom: Platform.select({
    ios: {},
    android: {},
    default: { boxShadow: "inset 0 -1px 0 rgba(20,24,40,0.06)" } as any,
  }),
  dark: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.45,
      shadowRadius: 9,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 4 },
    default: {
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.16), 0 1px 1px rgba(0,0,0,0.2), 0 8px 18px -8px rgba(0,0,0,0.45)",
    } as any,
  }),
  primary: Platform.select({
    ios: {
      shadowColor: "#007AFF",
      shadowOpacity: 0.55,
      shadowRadius: 9,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 4 },
    default: {
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.22), 0 1px 1px rgba(0,60,140,0.25), 0 8px 18px -8px rgba(0,122,255,0.55)",
    } as any,
  }),
  darkHover: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.5,
      shadowRadius: 11,
      shadowOffset: { width: 0, height: 12 },
    },
    android: { elevation: 6 },
    default: {
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 1px rgba(0,0,0,0.2), 0 12px 22px -8px rgba(0,0,0,0.5)",
    } as any,
  }),
};

export type ShadowName = keyof typeof shadows;
