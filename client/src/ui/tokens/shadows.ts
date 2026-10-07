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
};

export type ShadowName = keyof typeof shadows;
