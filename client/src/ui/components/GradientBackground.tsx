import { LinearGradient } from "expo-linear-gradient";
import type React from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import { colors } from "../tokens/colors";

export type GradientBackgroundProps = {
  colors?: readonly string[];
  locations?: readonly [number, number, ...number[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: ViewStyle;
  children?: React.ReactNode;
};

const DEFAULT_GRADIENT_START = { x: 0, y: 0 };
const DEFAULT_GRADIENT_END = { x: 1, y: 1 };

export default function GradientBackground({
  colors: colorsProp,
  locations,
  start = DEFAULT_GRADIENT_START,
  end = DEFAULT_GRADIENT_END,
  style,
  children,
}: GradientBackgroundProps) {
  const defaultColors = [colors.gradientStart, colors.gradientEnd] as const;
  const gradientColors = (colorsProp || defaultColors) as readonly [
    string,
    string,
    ...string[],
  ];

  return (
    <LinearGradient
      colors={gradientColors}
      locations={locations}
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
