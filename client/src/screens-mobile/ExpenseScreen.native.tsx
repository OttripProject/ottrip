import { colors } from "@/ui/tokens/colors";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { StyleSheet, Text, View } from "react-native";

export default function ExpenseScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>지출</Text>
      <Text style={styles.description}>지출 화면을 준비하고 있어요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
  },
  title: {
    ...textStyles.h3,
    color: colors.paletteInk,
  },
  description: {
    ...textStyles.body3,
    color: colors.paletteFg3,
  },
});
