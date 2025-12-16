import React, { useMemo, useState } from 'react';
import { TextInput, TextInputProps, View, StyleProp, ViewStyle } from 'react-native';
import { useInputStyleVariant, InputVariant } from './variants';

export type InputProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  variant?: InputVariant;
  error?: boolean;
};

export function Input(props: InputProps) {
  const { containerStyle, style, variant = 'outlined', editable, error, onFocus, onBlur, placeholderTextColor, ...rest } = props;
  const [focused, setFocused] = useState(false);
  const state = useMemo(() => ({ disabled: editable === false, error, focused }), [editable, error, focused]);
  const variantStyles = useInputStyleVariant(variant, state);

  return (
    <View style={containerStyle ?? variantStyles.containerStyle}>
      <TextInput
        {...rest}
        style={[variantStyles.style, style]}
        placeholderTextColor={placeholderTextColor ?? variantStyles.placeholderTextColor}
        editable={editable}
        pointerEvents={editable === false ? 'none' : 'auto'}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
    </View>
  );
}

export default Input;


