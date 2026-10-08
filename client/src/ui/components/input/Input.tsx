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
      placeholderTextColor,
      ...rest
    } = props;
    const [focused, setFocused] = useState(false);
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
              focused &&
                variant !== "bare" &&
                (error ? shadows.errorRing : shadows.focusRing),
            ] as StyleProp<TextStyle>
          }
          placeholderTextColor={
            placeholderTextColor ?? variantStyles.placeholderTextColor
          }
          editable={editable}
          pointerEvents={editable === false ? "none" : "auto"}
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

const sizeStyles = StyleSheet.create({
  md: {
    ...textStyles.body5,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
});

export default Input;
