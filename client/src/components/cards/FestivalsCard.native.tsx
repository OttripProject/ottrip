import type { FestivalItem } from "@/services/tourism";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import UpperArrowIcon from "../../../assets/upper_arrow.svg";

interface Props {
  festivals: FestivalItem[];
  onPress: (festival: FestivalItem) => void;
  title?: string;
}

const PREVIEW_COUNT = 3;

function getDotColor(lclsSystm2: string | null): string {
  if (lclsSystm2 === "EV02") return colors.categoryActivity;
  if (lclsSystm2 === "EV03") return colors.categoryMeal;
  return colors.festivalText;
}

function fmtEventDate(startDate: string | null, endDate: string | null): string {
  const fmt = (s: string) => `${parseInt(s.slice(4, 6))}.${parseInt(s.slice(6, 8))}`;
  if (startDate && endDate && startDate !== endDate) return `${fmt(startDate)}–${fmt(endDate)}`;
  if (startDate) return fmt(startDate);
  return "";
}

export default function FestivalsCard({ festivals, onPress, title = "이 기간 축제·공연" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [previewHeight, setPreviewHeight] = useState<number | undefined>(undefined);
  const hasMore = !expanded && festivals.length > PREVIEW_COUNT;

  return (
    <View style={styles.card}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{festivals.length}곳</Text>
      </View>

      {/* 리스트 */}
      <ScrollView
        style={{ maxHeight: expanded ? (previewHeight ?? 0) * 2 : previewHeight }}
        scrollEnabled={expanded}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {festivals.map((f, i) => (
          <Pressable
            key={f.contentId}
            style={[styles.item, i > 0 && styles.itemTopBorder]}
            onPress={() => onPress(f)}
            onLayout={i === PREVIEW_COUNT - 1 ? (e) => {
              setPreviewHeight(e.nativeEvent.layout.y + e.nativeEvent.layout.height);
            } : undefined}
          >
            <View style={styles.itemRow}>
              <View style={[styles.dot, { backgroundColor: getDotColor(f.lclsSystm2) }]} />
              <Text style={styles.itemTitle} numberOfLines={1}>{f.title}</Text>
            </View>
            {(f.eventStartDate || f.eventEndDate) && (
              <Text style={styles.itemDate}>
                {fmtEventDate(f.eventStartDate, f.eventEndDate)}
              </Text>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {/* 전체 보기 / 접기 */}
      {hasMore && (
        <Pressable style={styles.viewAllBtn} onPress={() => setExpanded(true)}>
          <Text style={styles.viewAllText}>전체 보기</Text>
        </Pressable>
      )}
      {expanded && (
        <Pressable style={styles.collapseBtn} onPress={() => setExpanded(false)}>
          <UpperArrowIcon width={18} height={18} color={colors.gray600} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lgPlus,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    ...textStyles.h4,
    color: colors.paletteInk,
    flex: 1,
  },
  count: {
    ...textStyles.h7,
    color: colors.paletteFg2,
    fontVariant: ["tabular-nums"],
  },
  item: {
    flexDirection: "column",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginHorizontal: -spacing.sm,
    minHeight: 56,
    justifyContent: "center",
  },
  itemTopBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.paletteLine,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    flexShrink: 0,
  },
  itemTitle: {
    ...textStyles.h5,
    color: colors.paletteInk,
    flex: 1,
    minWidth: 0,
  },
  itemDate: {
    ...textStyles.body4,
    paddingLeft: spacing.lg,
    color: colors.paletteFg3,
    fontVariant: ["tabular-nums"],
  },
  viewAllBtn: {
    height: 48,
    borderRadius: radii.mdPlus,
    backgroundColor: colors.paletteFill,
    justifyContent: "center",
    alignItems: "center",
  },
  viewAllText: {
    ...textStyles.h6,
    color: colors.paletteInk,
  },
  collapseBtn: {
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
});
