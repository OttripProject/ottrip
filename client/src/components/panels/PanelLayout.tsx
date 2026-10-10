import { useHover } from "@/hooks/useHover";
import { colors } from "@/ui/tokens/colors";
import { motion } from "@/ui/tokens/motion";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import type React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

interface PanelLayoutProps {
  children: React.ReactNode;
  style?: ViewStyle;
  hoverStyle?: ViewStyle;
}

export default function PanelLayout({
  children,
  style,
  hoverStyle,
}: PanelLayoutProps) {
  const { hovered, viewHoverProps } = useHover();
  return (
    <View
      style={[
        styles.panel,
        style,
        hoverStyle && shadowTransition,
        hoverStyle && hovered && hoverStyle,
      ]}
      {...(hoverStyle ? viewHoverProps : {})}
    >
      {children}
    </View>
  );
}

const shadowTransition = {
  transitionProperty: "box-shadow",
  transitionDuration: `${motion.duration.base}ms`,
  transitionTimingFunction: motion.easing.ease,
} as ViewStyle;

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    overflow: "hidden",
    ...shadows.lg,
  },
});
