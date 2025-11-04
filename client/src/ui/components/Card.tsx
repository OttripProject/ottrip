import React from 'react';
import { View, StyleSheet, ViewStyle, Platform, DimensionValue } from 'react-native';
import { colors } from '../tokens/colors';

export type CardVariant = 'default' | 'basic';

export type CardProps = {
  children?: React.ReactNode;
  style?: ViewStyle;
  variant?: CardVariant;
  width?: DimensionValue;
  maxWidth?: number;
  height?: DimensionValue;
  maxHeight?: number;
  minHeight?: number;
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  paddingTop?: number;
  paddingBottom?: number;
};

export default function Card({
  children,
  style,
  variant = 'default',
  width,
  maxWidth,
  height,
  maxHeight,
  minHeight,
  padding,
  paddingHorizontal,
  paddingVertical,
  paddingTop,
  paddingBottom,
}: CardProps) {
  const variantStyle = variant === 'basic' ? styles.basicCard : {};

  const cardStyle: ViewStyle = {
    ...variantStyle,
    ...(width !== undefined && { width }),
    ...(maxWidth !== undefined && { maxWidth }),
    ...(height !== undefined && { height }),
    ...(maxHeight !== undefined && { maxHeight }),
    ...(minHeight !== undefined && { minHeight }),
    ...(padding !== undefined && { padding }),
    ...(paddingHorizontal !== undefined && { paddingHorizontal }),
    ...(paddingVertical !== undefined && { paddingVertical }),
    ...(paddingTop !== undefined && { paddingTop }),
    ...(paddingBottom !== undefined && { paddingBottom }),
  };

  return (
    <View style={[styles.card, cardStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  // 기본 카드 preset (로그인 화면 등에서 사용)
  basicCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: 624,
    minHeight: 624,
    paddingHorizontal: 40,
    paddingTop: 40,
    paddingBottom: 40,
  },
});

