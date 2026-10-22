import type { MapStop } from "@/components/map/MapScheduleSheet.native";
import ScalePressable from "@/ui/components/ScalePressable";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import {
  Linking,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

interface MapStopCardProps {
  stop: MapStop;
  onDetailPress: () => void;
  onHeightChange: (height: number) => void;
  style?: StyleProp<ViewStyle>;
}

export default function MapStopCard({
  stop,
  onDetailPress,
  onHeightChange,
  style,
}: MapStopCardProps) {
  const rows = [
    {
      label: "시간",
      value: stop.endTime
        ? `${stop.startTime} – ${stop.endTime}`
        : stop.startTime,
    },
    { label: "장소", value: stop.placeName },
    { label: "주소", value: stop.address },
  ].filter(row => row.value);

  return (
    <View
      style={[styles.card, style]}
      onLayout={e => onHeightChange(e.nativeEvent.layout.height)}
    >
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: stop.tint }]}>
          <Text style={[styles.badgeText, { color: stop.color }]}>
            {stop.categoryLabel}
          </Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {stop.title}
        </Text>
      </View>

      <View style={styles.rows}>
        {rows.map(row => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={styles.rowValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        {stop.coordinate && (
          <ScalePressable
            style={[styles.action, styles.actionSecondary]}
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${stop.coordinate?.latitude},${stop.coordinate?.longitude}`,
              )
            }
          >
            <Text style={styles.actionSecondaryText}>구글 지도</Text>
          </ScalePressable>
        )}
        <ScalePressable
          style={[styles.action, styles.actionPrimary]}
          onPress={onDetailPress}
        >
          <Text style={styles.actionPrimaryText}>일정 상세</Text>
        </ScalePressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lgPlus,
    backgroundColor: colors.white,
    ...shadows.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  badge: {
    height: 20,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    justifyContent: "center",
  },
  badgeText: {
    ...textStyles.h9,
  },
  title: {
    ...textStyles.h6,
    flexShrink: 1,
    color: colors.paletteInk,
  },
  rows: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  rowLabel: {
    ...textStyles.body5,
    fontFamily: typography.fontFamily.pretendardMedium,
    width: 44,
    color: colors.paletteFg3,
  },
  rowValue: {
    ...textStyles.body5,
    flex: 1,
    color: colors.paletteFg2,
    fontVariant: ["tabular-nums"],
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  action: {
    flex: 1,
    height: 48,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  actionSecondary: {
    backgroundColor: colors.paletteFill2,
  },
  actionPrimary: {
    backgroundColor: colors.paletteInk,
    experimental_backgroundImage: `linear-gradient(180deg, ${colors.gradientInk[0]} 0%, ${colors.gradientInk[1]} 100%)`,
    ...shadows.darkRaised,
  },
  actionSecondaryText: {
    ...textStyles.h7,
    fontFamily: typography.fontFamily.pretendardBold,
    color: colors.paletteInk,
  },
  actionPrimaryText: {
    ...textStyles.h7,
    fontFamily: typography.fontFamily.pretendardBold,
    color: colors.white,
  },
});
