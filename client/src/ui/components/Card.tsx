import React from 'react';
import { View, StyleSheet, ViewStyle, Platform, DimensionValue } from 'react-native';
import { colors } from '../tokens/colors';

export type CardVariant = 'default' | 'basic';

export type ShadowConfig = {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
};

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
  alignItems?: ViewStyle['alignItems'];
  backgroundColor?: string;
  borderRadius?: number;
  shadow?: ShadowConfig | false;
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
  alignItems,
  backgroundColor,
  borderRadius,
  shadow,
}: CardProps) {
  const variantStyle = variant === 'basic' ? styles.basicCard : {};

  const shadowConfig = shadow === false 
    ? undefined 
    : shadow || {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
      };

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
    ...(alignItems !== undefined && { alignItems }),
    ...(backgroundColor !== undefined && { backgroundColor }),
    ...(borderRadius !== undefined && { borderRadius }),
    ...(shadowConfig && Platform.select({
      ios: {
        shadowColor: shadowConfig.shadowColor || '#000',
        shadowOffset: shadowConfig.shadowOffset || { width: 0, height: 4 },
        shadowOpacity: shadowConfig.shadowOpacity ?? 0.1,
        shadowRadius: shadowConfig.shadowRadius || 12,
      },
      android: {
        elevation: shadowConfig.elevation || 8,
      },
    })),
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
  },
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

