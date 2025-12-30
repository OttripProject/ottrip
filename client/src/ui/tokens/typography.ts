import { TextStyle } from 'react-native';
import { colors } from './colors';

export const typography = {
  fontFamily: {
    default: 'System',
    mono: 'Courier',
    pretendard: 'Pretendard-Regular',
    pretendardThin: 'Pretendard-Thin',
    pretendardExtraLight: 'Pretendard-ExtraLight',
    pretendardLight: 'Pretendard-Light',
    pretendardRegular: 'Pretendard-Regular',
    pretendardMedium: 'Pretendard-Medium',
    pretendardSemiBold: 'Pretendard-SemiBold',
    pretendardBold: 'Pretendard-Bold',
    pretendardExtraBold: 'Pretendard-ExtraBold',
    pretendardBlack: 'Pretendard-Black',
    poppins: 'Poppins-Regular',
    poppinsThin: 'Poppins-Thin',
    poppinsExtraLight: 'Poppins-ExtraLight',
    poppinsLight: 'Poppins-Light',
    poppinsRegular: 'Poppins-Regular',
    poppinsMedium: 'Poppins-Medium',
    poppinsSemiBold: 'Poppins-SemiBold',
    poppinsBold: 'Poppins-Bold',
    poppinsExtraBold: 'Poppins-ExtraBold',
    poppinsBlack: 'Poppins-Black',
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

export const textStyles: Record<string, TextStyle> = {
  h2: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 24,
    lineHeight: 36,
    color: colors.black,
  },
  h3: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 20,
    lineHeight: 32,
    color: colors.black,
  },
  h4: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 18,
    lineHeight: 26,
    color: colors.black,
  },
  h5: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 16,
    lineHeight: 24,
    color: colors.black,
  },
  h6: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 14,
    lineHeight: 22,
    color: colors.black,
  },
  h7: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 13,
    lineHeight: 20,
    color: colors.black,
  },
  h8: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 12,
    lineHeight: 18,
    color: colors.black,
  },
  h9: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 11,
    lineHeight: 16,
    color: colors.black,
  },
  body1: {
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 18,
    lineHeight: 26,
    color: colors.black,
  },
  body2: {
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.black,
  },
  body3: {
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.black,
  },
  body4: {
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.black,
  },
  body5: {
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.black,
  },
  body6: {
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.black,
  },
  poppinsH4: {
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontSize: 18,
    lineHeight: 26,
    color: colors.black,
  },
};

export type FontSizeName = keyof typeof typography.size;
export type TextStyleName = keyof typeof textStyles;


