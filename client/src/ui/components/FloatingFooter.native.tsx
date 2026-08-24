import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
          <Pressable
            style={[styles.footerButton, styles.secondaryButton]}
            onPress={onSecondaryPress}
          >
            <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
          </Pressable>
        )}
        <Pressable
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
        </Pressable>
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
    backgroundColor: colors.warning,
  },
  secondaryButtonText: {
    ...textStyles.h4,
    color: colors.white,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.black,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  primaryButtonWithSecondary: {
    flex: 2,
  },
  primaryButtonText: {
    ...textStyles.h4,
    color: colors.white,
  },
});
