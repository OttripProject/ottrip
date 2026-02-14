import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';

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
  const insets = useSafeAreaInsets();
  const hasSecondary = Boolean(secondaryLabel && onSecondaryPress);

  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.footerButtons}>
        {hasSecondary && (
          <Pressable style={[styles.footerButton, styles.secondaryButton]} onPress={onSecondaryPress}>
            <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.footerButton, styles.primaryButton, hasSecondary && styles.primaryButtonWithSecondary]}
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
    paddingBottom: 32,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  footerButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.warning,
  },
  secondaryButtonText: {
    ...textStyles.h6,
    color: colors.white,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.black,
  },
  primaryButtonWithSecondary: {
    flex: 2,
  },
  primaryButtonText: {
    ...textStyles.h6,
    color: colors.white,
  },
});
