import ActionButton from "@/ui/components/ActionButton";
import { colors } from "@/ui/tokens/colors";
import { spacing } from "@/ui/tokens/spacing";
import { StyleSheet, View } from "react-native";

interface FloatingFooterProps {
  primaryLabel: string;
  onPrimaryPress: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
}

export default function FloatingFooter({
  primaryLabel,
  onPrimaryPress,
  primaryDisabled = false,
  primaryLoading = false,
  secondaryLabel,
  onSecondaryPress,
}: FloatingFooterProps) {
  return (
    <View style={styles.footer}>
      <View style={styles.footerButtons}>
        {secondaryLabel && onSecondaryPress && (
          <ActionButton
            label={secondaryLabel}
            tone="secondary"
            fill
            onPress={onSecondaryPress}
            blocked={primaryLoading}
          />
        )}
        <ActionButton
          label={primaryLabel}
          fill
          onPress={onPrimaryPress}
          loading={primaryLoading}
          disabled={primaryDisabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  footerButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
});
