import { colors } from "@/ui/tokens/colors";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { forwardRef, useMemo, useState } from "react";
import {
  type StyleProp,
  StyleSheet,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { type InputVariant, useInputStyleVariant } from "./variants";

export type InputSize = "md";

export type InputProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  variant?: InputVariant;
  size?: InputSize;
  error?: boolean;
};

export const Input = forwardRef<TextInput, InputProps>(
  function Input(props, ref) {
    const {
      containerStyle,
      style,
      variant = "outlined",
      size,
      multiline,
      editable,
      error,
      onFocus,
      onBlur,
      onPointerEnter,
      onPointerLeave,
      placeholderTextColor,
      ...rest
    } = props;
    const [focused, setFocused] = useState(false);
    const [hovered, setHovered] = useState(false);
    const isFilled = variant === "filled";
    const state = useMemo(
      () => ({ disabled: editable === false, error, focused }),
      [editable, error, focused],
    );
    const variantStyles = useInputStyleVariant(variant, state);

    return (
      <View style={containerStyle ?? variantStyles.containerStyle}>
        <TextInput
          {...rest}
          ref={ref}
          multiline={multiline}
          style={
            [
              variantStyles.style,
              size && sizeStyles[size],
              size && multiline && sizeStyles.multiline,
              style,
              isFilled &&
                hovered &&
                !focused &&
                editable !== false &&
                stateStyles.filledHover,
              isFilled && focused && stateStyles.filledFocus,
              isFilled && focused && !error && stateStyles.filledFocusBorder,
              focused &&
                variant !== "bare" &&
                (error
                  ? shadows.errorRing
                  : isFilled
                    ? shadows.filledFocusRing
                    : shadows.focusRing),
            ] as StyleProp<TextStyle>
          }
          placeholderTextColor={
            placeholderTextColor ?? variantStyles.placeholderTextColor
          }
          editable={editable}
          pointerEvents={editable === false ? "none" : "auto"}
          onPointerEnter={e => {
            setHovered(true);
            onPointerEnter?.(e);
          }}
          onPointerLeave={e => {
            setHovered(false);
            onPointerLeave?.(e);
          }}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
      </View>
    );
  },
);

export const filledFocusStyle = {
  backgroundColor: colors.white,
  borderColor: colors.inputFocusBorder,
  ...shadows.filledFocusRing,
};

const stateStyles = StyleSheet.create({
  filledHover: {
    backgroundColor: colors.inputHover,
  },
  filledFocus: {
    backgroundColor: colors.white,
  },
  filledFocusBorder: {
    borderColor: colors.inputFocusBorder,
  },
});

const sizeStyles = StyleSheet.create({
  md: {
    ...textStyles.body5,
    height: 42,
    paddingTop: spacing.none,
    paddingBottom: spacing.none,
    paddingHorizontal: spacing.md,
  },
  multiline: {
    height: "auto",
    minHeight: 80,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: "top",
  },
});

export default Input;
