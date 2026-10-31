import {
  type ActionButtonProps,
  type ActionButtonSize,
  type ActionButtonTone,
  SPINNER_DELAY_MS,
} from "@/ui/components/ActionButton.types";
import ScalePressable from "@/ui/components/ScalePressable";
import Spinner from "@/ui/components/Spinner";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";

const gradient = ([from, to]: readonly [string, string], angle = "180deg") => ({
  experimental_backgroundImage: `linear-gradient(${angle}, ${from} 0%, ${to} 100%)`,
});

const toneStyles: Record<ActionButtonTone, ViewStyle> = {
  primary: {
    backgroundColor: colors.primary,
    ...gradient(colors.gradientPrimary),
    ...shadows.primaryRaised,
  },
  secondary: { backgroundColor: colors.gray300 },
  danger: { backgroundColor: colors.dangerTint },
  destructive: { backgroundColor: colors.danger },
  ink: {
    backgroundColor: colors.paletteInk,
    ...gradient(colors.gradientInk),
    ...shadows.darkRaised,
  },
  ai: {
    backgroundColor: colors.aiGrad[0],
    ...gradient(colors.aiGrad, "135deg"),
  },
};

const toneTextColors: Record<ActionButtonTone, string> = {
  primary: colors.white,
  secondary: colors.gray900,
  danger: colors.danger,
  destructive: colors.white,
  ink: colors.white,
  ai: colors.white,
};

const sizeStyles: Record<ActionButtonSize, ViewStyle> = {
  L: { height: 48, borderRadius: radii.mdPlus, paddingHorizontal: spacing.xl },
  M: { height: 44, borderRadius: radii.md, paddingHorizontal: spacing.lg },
  S: { height: 44, borderRadius: radii.md, paddingHorizontal: spacing.lg },
};

const sizeTextStyles: Record<ActionButtonSize, TextStyle> = {
  L: textStyles.h5,
  M: textStyles.h6,
  S: textStyles.h6,
};

export default function ActionButton({
  label,
  onPress,
  tone = "primary",
  size = "L",
  loading = false,
  disabled = false,
  fill = false,
  icon,
  style,
  accessibilityLabel,
}: ActionButtonProps) {
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowSpinner(false);
      return;
    }
    const timer = setTimeout(() => setShowSpinner(true), SPINNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  const textColor = disabled ? colors.gray500 : toneTextColors[tone];

  return (
    <ScalePressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.base,
        sizeStyles[size],
        fill && styles.fill,
        toneStyles[tone],
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={[styles.content, showSpinner && styles.hidden]}>
        {icon}
        <Text
          style={[sizeTextStyles[size], { color: textColor }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      {showSpinner && (
        <View style={styles.spinner}>
          <Spinner size={16} strokeWidth={2} color={textColor} />
        </View>
      )}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  fill: {
    flex: 1,
    paddingHorizontal: spacing.none,
  },
  disabled: {
    backgroundColor: colors.gray300,
    experimental_backgroundImage: "none",
    boxShadow: "none",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  hidden: {
    opacity: 0,
  },
  spinner: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
});
