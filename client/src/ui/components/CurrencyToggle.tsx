import { ExpenseCurrency } from "@/types/expense";
import { colors } from "@/ui/tokens/colors";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

const OPTIONS: { value: ExpenseCurrency; label: string }[] = [
  { value: ExpenseCurrency.KRW, label: "원" },
  { value: ExpenseCurrency.USD, label: "달러" },
];

interface CurrencyToggleProps {
  value: ExpenseCurrency;
  onChange: (currency: ExpenseCurrency) => void;
  variant?: "filled" | "outlined";
  style?: StyleProp<ViewStyle>;
}

export default function CurrencyToggle({ value, onChange, variant = "filled", style }: CurrencyToggleProps) {
  const isOutlined = variant === "outlined";
  return (
    <View style={[styles.container, isOutlined && styles.containerOutlined, style]}>
      {OPTIONS.map(opt => {
        const isActive = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[
              styles.option,
              isActive && (isOutlined ? styles.optionActiveOutlined : styles.optionActive),
              isActive && ({ boxShadow: "rgba(0, 0, 0, 0.3) 0px 1px 3px" } as any),
            ]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 3,
    height: 40,
    backgroundColor: colors.gray200,
    borderRadius: 10,
    padding: 3,
  },
  containerOutlined: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
  },
  option: {
    flex: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  optionActive: {
    backgroundColor: colors.white,
  },
  optionActiveOutlined: {
    backgroundColor: colors.white,
  },
  optionText: {
    fontFamily: "Pretendard-Regular",
    fontSize: 13,
    lineHeight: 20,
    color: colors.gray700,
  },
  optionTextActive: {
    fontFamily: "Pretendard-SemiBold",
    color: colors.gray900,
  },
});
