import ScalePressable from "@/ui/components/ScalePressable";
import { colors } from "@/ui/tokens/colors";
import { shadows } from "@/ui/tokens/shadows";
import { textStyles } from "@/ui/tokens/typography";
import { StyleSheet, Text, View } from "react-native";

const PRIMARY_GRADIENT = `linear-gradient(180deg, ${colors.gradientPrimary[0]} 0%, ${colors.gradientPrimary[1]} 100%)`;

interface FloatingFooterProps {
  primaryLabel: string;
  onPrimaryPress: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
}

export default function FloatingFooter({
  primaryLabel,
  onPrimaryPress,
  primaryDisabled = false,
  secondaryLabel,
  onSecondaryPress,
}: FloatingFooterProps) {
  const hasSecondary = Boolean(secondaryLabel && onSecondaryPress);

  return (
    <View style={styles.footer}>
      <View style={styles.footerButtons}>
        {hasSecondary && (
          <ScalePressable
            style={[styles.footerButton, styles.secondaryButton]}
            onPress={onSecondaryPress}
          >
            <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
          </ScalePressable>
        )}
        <ScalePressable
          style={[
            styles.footerButton,
            styles.primaryButton,
            hasSecondary && styles.primaryButtonWithSecondary,
            primaryDisabled && styles.primaryButtonDisabled,
          ]}
          onPress={onPrimaryPress}
          disabled={primaryDisabled}
        >
          <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
        </ScalePressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  footerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  footerButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.dangerTint,
  },
  secondaryButtonText: {
    ...textStyles.h4,
    color: colors.danger,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    experimental_backgroundImage: PRIMARY_GRADIENT,
    ...shadows.primaryRaised,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.gray400,
    experimental_backgroundImage: "none",
    boxShadow: "none",
  },
  primaryButtonWithSecondary: {
    flex: 2,
  },
  primaryButtonText: {
    ...textStyles.h4,
    color: colors.white,
  },
});
