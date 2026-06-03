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

import AppleLogo from "../../../assets/mobile_apple.svg";

export type AppleButtonProps = {
  onPress?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  text?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  iconSize?: number;
  /** SVG `currentColor` — 기본 흰색 (검정 배경용) */
  logoColor?: string;
};

export default function AppleButton({
  onPress,
  disabled = false,
  isLoading = false,
  text = "Apple로 로그인하기",
  style,
  textStyle,
  iconSize = 18,
  logoColor = colors.white,
}: AppleButtonProps) {
  // mobile_apple.svg viewBox 31×44 — 정사각형으로 두면 찌그러짐
  const logoW = iconSize * (31 / 44);
  return (
    <Pressable
      style={[styles.button, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || isLoading}
    >
      <View style={styles.content}>
        <AppleLogo width={logoW} height={iconSize} color={logoColor} />
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
    backgroundColor: colors.black,
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
    color: colors.white,
  },
  disabled: {
    backgroundColor: colors.gray800,
    opacity: 0.6,
  },
});
