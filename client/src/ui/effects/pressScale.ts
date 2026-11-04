import { motion } from "@/ui/tokens/motion";
import { useRef } from "react";
import { Animated, Easing } from "react-native";

const PRESSED_SCALE = 0.96;

export const toEasing = (cubicBezier: string) => {
  const [x1, y1, x2, y2] = (cubicBezier.match(/[\d.]+/g) ?? []).map(Number);
  return Easing.bezier(x1, y1, x2, y2);
};

export function usePressScale() {
  const scale = useRef(new Animated.Value(1)).current;

  const animateScale = (toValue: number, duration: number, easing: string) => {
    Animated.timing(scale, {
      toValue,
      duration,
      easing: toEasing(easing),
      useNativeDriver: true,
    }).start();
  };

  return {
    scale,
    onPressIn: () =>
      animateScale(PRESSED_SCALE, motion.duration.press, motion.easing.ease),
    onPressOut: () =>
      animateScale(1, motion.duration.slow, motion.easing.spring),
  };
}
