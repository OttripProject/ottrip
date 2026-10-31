import ScalePressable from "@/ui/components/ScalePressable";
import Spinner from "@/ui/components/Spinner";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

const PRIMARY_GRADIENT = `linear-gradient(180deg, ${colors.gradientPrimary[0]} 0%, ${colors.gradientPrimary[1]} 100%)`;

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
  const hasSecondary = Boolean(secondaryLabel && onSecondaryPress);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    if (!primaryLoading) {
      setShowSpinner(false);
      return;
    }
    const timer = setTimeout(() => setShowSpinner(true), 300);
    return () => clearTimeout(timer);
  }, [primaryLoading]);

  return (
    <View style={styles.footer}>
      <View style={styles.footerButtons}>
        {hasSecondary && (
          <ScalePressable
            style={[styles.footerButton, styles.secondaryButton]}
            onPress={onSecondaryPress}
            disabled={primaryLoading}
          >
            <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
          </ScalePressable>
        )}
        <ScalePressable
          style={[
            styles.footerButton,
            styles.primaryButton,
            primaryDisabled && styles.primaryButtonDisabled,
          ]}
          onPress={onPrimaryPress}
          disabled={primaryDisabled || primaryLoading}
        >
          {showSpinner ? (
            <Spinner size={16} strokeWidth={2} color={colors.white} />
          ) : (
            <Text
              style={[
                styles.primaryButtonText,
                primaryDisabled && styles.primaryButtonTextDisabled,
              ]}
            >
              {primaryLabel}
            </Text>
          )}
        </ScalePressable>
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
  footerButton: {
    height: 48,
    borderRadius: radii.mdPlus,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.gray300,
  },
  secondaryButtonText: {
    ...textStyles.h5,
    color: colors.gray900,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    experimental_backgroundImage: PRIMARY_GRADIENT,
    ...shadows.primaryRaised,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.gray300,
    experimental_backgroundImage: "none",
    boxShadow: "none",
  },
  primaryButtonText: {
    ...textStyles.h5,
    color: colors.white,
  },
  primaryButtonTextDisabled: {
    color: colors.gray500,
  },
});
