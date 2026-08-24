import { ExpenseCurrency } from "@/types/expense";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

const OPTIONS: { value: ExpenseCurrency; label: string }[] = [
  { value: ExpenseCurrency.KRW, label: "원" },
  { value: ExpenseCurrency.USD, label: "달러" },
];

interface CurrencyToggleProps {
  value: ExpenseCurrency;
  onChange: (currency: ExpenseCurrency) => void;
  variant?: "filled" | "outlined" | "primary";
  style?: StyleProp<ViewStyle>;
}

export default function CurrencyToggle({
  value,
  onChange,
  variant = "filled",
  style,
}: CurrencyToggleProps) {
  const isOutlined = variant === "outlined";
  const isPrimary = variant === "primary";

  if (isPrimary) {
    return (
      <View style={[styles.primaryContainer, style]}>
        {OPTIONS.map(opt => {
          const isActive = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[styles.primaryOption, isActive && styles.primaryOptionActive]}
              onPress={() => onChange(opt.value)}
            >
              <Text style={[styles.primaryOptionText, isActive && styles.primaryOptionTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View
      style={[styles.container, isOutlined && styles.containerOutlined, style]}
    >
      {OPTIONS.map(opt => {
        const isActive = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[
              styles.option,
              isActive &&
                (isOutlined
                  ? styles.optionActiveOutlined
                  : styles.optionActive),
              isActive &&
                ({ boxShadow: "rgba(0, 0, 0, 0.3) 0px 1px 3px" } as any),
            ]}
            onPress={() => onChange(opt.value)}
          >
            <Text
              style={[styles.optionText, isActive && styles.optionTextActive]}
            >
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
    ...textStyles.body4,
    color: colors.gray700,
  },
  optionTextActive: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  primaryContainer: {
    flexDirection: "row",
    gap: 4,
  },
  primaryOption: {
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryOptionActive: {
    backgroundColor: colors.primary,
  },
  primaryOptionText: {
    ...textStyles.h7,
    color: colors.gray400,
  },
  primaryOptionTextActive: {
    color: colors.white,
  },
});
