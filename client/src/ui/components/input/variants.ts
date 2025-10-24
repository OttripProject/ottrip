import { StyleSheet } from 'react-native';
import { colors, spacing, radii, typography } from '@/ui/tokens';

export type InputVariant = 'outlined' | 'filled' | 'underline';

export type InputState = {
  disabled?: boolean;
  error?: boolean;
  focused?: boolean;
};

export function useInputStyleVariant(variant: InputVariant, state?: InputState) {
  const { disabled, error, focused } = state ?? {};

  const baseTextColor = disabled ? colors.gray400 : colors.gray900;
  const basePlaceholder = disabled ? colors.gray300 : colors.gray400;

  if (variant === 'outlined') {
    const borderColor = error ? colors.danger : focused ? colors.primary : colors.gray300;
    return {
      containerStyle: styles.container,
      style: [
        styles.base,
        {
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor,
          color: baseTextColor,
        },
      ],
      placeholderTextColor: basePlaceholder,
    } as const;
  }

  if (variant === 'filled') {
    const bg = disabled ? '#F8FAFC' : colors.gray100;
    const borderColor = error ? colors.danger : focused ? colors.primary : 'transparent';
    return {
      containerStyle: styles.container,
      style: [
        styles.base,
        {
          backgroundColor: bg,
          borderWidth: 1,
          borderColor,
          color: baseTextColor,
        },
      ],
      placeholderTextColor: basePlaceholder,
    } as const;
  }

  // underline
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.gray300;
  return {
    containerStyle: styles.container,
    style: [
      styles.base,
      {
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: borderColor,
        borderRadius: 0,
        color: baseTextColor,
      },
    ],
    placeholderTextColor: basePlaceholder,
  } as const;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  base: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    fontSize: typography.size.md,
  },
});


