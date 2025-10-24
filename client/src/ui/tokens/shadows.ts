import { Platform } from 'react-native';

export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    android: { elevation: 2 },
    default: { boxShadow: '0 2px 6px rgba(0,0,0,0.08)' } as any,
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 4 },
    default: { boxShadow: '0 4px 10px rgba(0,0,0,0.12)' } as any,
  }),
};

export type ShadowName = keyof typeof shadows;


