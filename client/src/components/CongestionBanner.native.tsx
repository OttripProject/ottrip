import ScalePressable from "@/ui/components/ScalePressable";
import { colors } from "@/ui/tokens/colors";
import { motion } from "@/ui/tokens/motion";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import dayjs from "dayjs";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import CloseIcon from "../../assets/close_sm.svg";

interface Props {
  date: string;
  locationNames: string[];
  hasFestival: boolean;
  hasCongestion: boolean;
  onDismiss: () => void;
}

export default function CongestionBanner({
  date,
  locationNames,
  hasFestival,
  hasCongestion,
  onDismiss,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: motion.duration.base,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  const suffix =
    hasFestival && hasCongestion
      ? "일대가 붐빌 수 있어요."
      : hasCongestion
        ? "방문자가 평소보다 많을 것으로 예상돼요."
        : "일대가 축제·공연으로 붐빌 수 있어요.";

  const handleDismiss = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: motion.duration.fast,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>혼잡 주의</Text>
      </View>
      <Text style={styles.message} numberOfLines={2}>
        <Text style={styles.date}>{dayjs(date).format("M.D")}</Text>{" "}
        {locationNames.join("·")} {suffix}
      </Text>
      <ScalePressable
        style={styles.closeButton}
        onPress={handleDismiss}
        accessibilityLabel="닫기"
      >
        <CloseIcon width={20} height={20} color={colors.gray700} />
      </ScalePressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    borderRadius: radii.mdPlus,
    borderWidth: 1,
    borderColor: colors.congestionBorder,
    backgroundColor: colors.congestionBg,
  },
  badge: {
    height: 24,
    paddingHorizontal: spacing.sm,
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.congestionBadgeBorder,
    backgroundColor: colors.white,
  },
  badgeText: {
    ...textStyles.h8,
    fontFamily: typography.fontFamily.pretendardBold,
    color: colors.congestionInk,
  },
  message: {
    ...textStyles.body4,
    flex: 1,
    minWidth: 0,
    fontFamily: typography.fontFamily.pretendardMedium,
    color: colors.gray900,
  },
  date: {
    fontFamily: typography.fontFamily.pretendardBold,
    fontVariant: ["tabular-nums"],
  },
  closeButton: {
    width: 44,
    height: 44,
    marginVertical: -spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
