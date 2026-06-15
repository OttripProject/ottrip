import {
  Pressable,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { colors } from "../tokens/colors";
import { textStyles } from "../tokens/typography";

import GoogleLogo from "../../../assets/google_logo.svg";

export type GoogleButtonProps = {
  onPress?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  text?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  iconSize?: number;
};

export default function GoogleButton({
  onPress,
  disabled = false,
  isLoading = false,
  text = "Google로 로그인하기",
  style,
  textStyle,
  iconSize = 16,
}: GoogleButtonProps) {
  return (
    <Pressable
      style={[styles.button, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || isLoading}
    >
      <View style={styles.content}>
        <GoogleLogo width={iconSize} height={iconSize} />
        <Text style={[styles.text, textStyle]}>
          {isLoading ? "로그인 중..." : text}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    maxWidth: 352,
    height: 56,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    ...textStyles.h5,
    marginLeft: 12,
  },
  disabled: {
    backgroundColor: colors.gray300,
    borderColor: colors.gray400,
    opacity: 0.6,
  },
});
