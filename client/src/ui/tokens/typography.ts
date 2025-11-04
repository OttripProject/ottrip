import { TextStyle } from 'react-native';
import { colors } from './colors';

export const typography = {
  fontFamily: {
    default: 'System',
    mono: 'Courier',
    pretendard: 'Pretendard',
    poppins: 'Poppins',
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
    semibold: '600' as const,
    bold: '700' as const,
  },
};

// 타이포그래피 스타일 정의 (재사용 가능한 텍스트 스타일)
export const textStyles: Record<string, TextStyle> = {
  // Heading 스타일
  h2: {
    fontFamily: typography.fontFamily.pretendard,
    fontSize: 24,
    lineHeight: 36,
    fontWeight: typography.weight.semibold,
    color: colors.black,
  },
  h3: {
    fontFamily: typography.fontFamily.pretendard,
    fontSize: 20,
    lineHeight: 32,
    fontWeight: typography.weight.semibold,
    color: colors.black,
  },
  h4: {
    fontFamily: typography.fontFamily.pretendard,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: typography.weight.semibold,
    color: colors.black,
  },
  h5: {
    fontFamily: typography.fontFamily.pretendard,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: typography.weight.semibold,
    color: colors.black,
  },
  h6: {
    fontFamily: typography.fontFamily.pretendard,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: typography.weight.semibold,
    color: colors.black,
  },
  h7: {
    fontFamily: typography.fontFamily.pretendard,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: typography.weight.semibold,
    color: colors.black,
  },
  h8: {
    fontFamily: typography.fontFamily.pretendard,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: typography.weight.semibold,
    color: colors.black,
  },
  h9: {
    fontFamily: typography.fontFamily.pretendard,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: typography.weight.semibold,
    color: colors.black,
  },
  // Body 스타일
  body1: {
    fontFamily: typography.fontFamily.pretendard,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: typography.weight.regular,
    color: colors.black,
  },
  body2: {
    fontFamily: typography.fontFamily.pretendard,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: typography.weight.regular,
    color: colors.black,
  },
  body3: {
    fontFamily: typography.fontFamily.pretendard,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: typography.weight.regular,
    color: colors.black,
  },
  body4: {
    fontFamily: typography.fontFamily.pretendard,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: typography.weight.regular,
    color: colors.black,
  },
  body5: {
    fontFamily: typography.fontFamily.pretendard,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: typography.weight.regular,
    color: colors.black,
  },
  body6: {
    fontFamily: typography.fontFamily.pretendard,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: typography.weight.regular,
    color: colors.black,
  },
};

export type FontSizeName = keyof typeof typography.size;
export type TextStyleName = keyof typeof textStyles;


