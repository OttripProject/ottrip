import { StyleSheet, Platform } from 'react-native';
import { colors, spacing, radii, textStyles } from '@/ui/tokens';

export type InputVariant = 'outlined' | 'filled' | 'underline';

export type InputState = {
  disabled?: boolean;
  error?: boolean;
  focused?: boolean;
};

const baseStyle = Platform.select({
  web: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    ...textStyles.body4,
    outlineStyle: 'none',
    outlineWidth: 0,
  },
  default: {
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 14,
    borderRadius: radii.md,
    ...textStyles.body4,
    lineHeight: 18,
    textAlignVertical: 'center' as const,
    includeFontPadding: false,
  },
});

export function useInputStyleVariant(variant: InputVariant, state?: InputState) {
  const { disabled, error, focused } = state ?? {};

  const baseTextColor = disabled ? colors.gray400 : colors.black;
  const basePlaceholder = disabled ? colors.gray300 : colors.gray700;

  if (variant === 'outlined') {
    const borderColor = error ? colors.danger : colors.gray400;
    return {
      containerStyle: styles.container,
      style: [
        baseStyle,
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
    const borderColor = error ? colors.danger : 'transparent';
    return {
      containerStyle: styles.container,
      style: [
        baseStyle,
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

  const borderColor = error ? colors.danger : colors.gray400;
  return {
    containerStyle: styles.container,
    style: [
      baseStyle,
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
});


