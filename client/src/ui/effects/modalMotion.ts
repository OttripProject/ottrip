import { injectKeyframes } from "@/ui/effects/injectKeyframes";
import { motion } from "@/ui/tokens/motion";
import { Platform, type ViewStyle } from "react-native";

const isWeb = Platform.OS === "web";

if (isWeb) {
  injectKeyframes(
    "modal-keyframes",
    "@keyframes ottripFadeIn { 0% { opacity: 0; } 100% { opacity: 1; } } " +
      "@keyframes fmPop { 0% { opacity: 0; scale: 0.94; translate: 0 8px; } 100% { opacity: 1; scale: 1; translate: 0; } }",
  );
}

export const modalMotion = {
  overlay: (isWeb
    ? {
        animationKeyframes: "ottripFadeIn",
        animationDuration: `${motion.duration.overlayIn}ms`,
        animationTimingFunction: "ease",
      }
    : {}) as ViewStyle,
  card: (isWeb
    ? {
        animationKeyframes: "fmPop",
        animationDuration: `${motion.duration.pop}ms`,
        animationTimingFunction: motion.easing.spring,
        animationFillMode: "both",
      }
    : {}) as ViewStyle,
};
