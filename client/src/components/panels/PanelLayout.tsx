import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import type React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

interface PanelLayoutProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function PanelLayout({ children, style }: PanelLayoutProps) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: "hidden",
    elevation: 3,
  },
});
