import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type GradientBackgroundProps = {
  colors?: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: ViewStyle;
  children?: React.ReactNode;
};

// 기본 그라데이션 설정 (로그인 화면 등에서 사용)
const DEFAULT_GRADIENT_START = { x: 0, y: 0 };
const DEFAULT_GRADIENT_END = { x: 1, y: 1 };

export default function GradientBackground({
  start = DEFAULT_GRADIENT_START,
  end = DEFAULT_GRADIENT_END,
  style,
  children,
}: GradientBackgroundProps) {
  return (
    <LinearGradient
      colors={['#FFE5F1', '#E0F0FF']}
      start={start}
      end={end}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});

