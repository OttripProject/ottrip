import ActionButton from "@/ui/components/ActionButton";
import type { ActionButtonTone } from "@/ui/components/ActionButton.types";
import { colors } from "@/ui/tokens/colors";
import { spacing } from "@/ui/tokens/spacing";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface FloatingFooterProps {
  primaryLabel: string;
  onPrimaryPress: () => void;
  primaryTone?: ActionButtonTone;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  primaryBlocked?: boolean;
  secondaryLabel?: string;
  secondaryTone?: ActionButtonTone;
  onSecondaryPress?: () => void;
}

export default function FloatingFooter({
  primaryLabel,
  onPrimaryPress,
  primaryTone = "primary",
  primaryDisabled = false,
  primaryLoading = false,
  primaryBlocked = false,
  secondaryLabel,
  secondaryTone = "secondary",
  onSecondaryPress,
}: FloatingFooterProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.footer,
        { paddingBottom: Math.max(0, spacing.xl - insets.bottom) },
      ]}
    >
      {secondaryLabel && onSecondaryPress && (
        <ActionButton
          label={secondaryLabel}
          tone={secondaryTone}
          fill
          onPress={onSecondaryPress}
          blocked={primaryLoading}
        />
      )}
      <ActionButton
        label={primaryLabel}
        tone={primaryTone}
        fill
        onPress={onPrimaryPress}
        loading={primaryLoading}
        disabled={primaryDisabled}
        blocked={primaryBlocked}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.white,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
});
