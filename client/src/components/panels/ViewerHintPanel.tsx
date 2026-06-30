import InfoCircleIcon from "../../../assets/info_circle.svg";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import { StyleSheet, Text, View } from "react-native";

export default function ViewerHintPanel() {
  return (
    <View style={styles.container}>
      <InfoCircleIcon width={15} height={15} color={colors.primary} style={styles.icon} />
      <Text style={styles.text}>
        {"공유받은 여행 일정을 게스트로 보고 있어요. 열람만 가능하며, 로그인하면 내 여행일정으로 가져와 자유롭게 수정·저장할 수 있어요."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  icon: {
    flexShrink: 0,
  },
  text: {
    ...textStyles.body4,
    color: "#3D5878",
    flexShrink: 1,
  },
});
