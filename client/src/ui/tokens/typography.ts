export const typography = {
  fontFamily: {
    default: 'System',
    mono: 'Courier',
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    bold: '700' as const,
  },
};

export type FontSizeName = keyof typeof typography.size;


