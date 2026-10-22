import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface MapStop {
  key: string;
  dayIndex: number;
  order: number;
  title: string;
  startTime: string;
  endTime?: string;
  categoryLabel: string;
  color: string;
  tint: string;
  placeName?: string;
  coordinate?: { latitude: number; longitude: number };
}

interface MapScheduleSheetProps {
  dayCount: number;
  dayIndex: number | null;
  onDayChange: (dayIndex: number | null) => void;
  stops: MapStop[];
  selectedKey: string | null;
  onStopPress: (stop: MapStop) => void;
  expandedHeight: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

export const getStopLabel = (stop: MapStop, dayIndex: number | null) =>
  dayIndex === null ? `${stop.dayIndex + 1}-${stop.order}` : `${stop.order}`;

export default function MapScheduleSheet({
  dayCount,
  dayIndex,
  onDayChange,
  stops,
  selectedKey,
  onStopPress,
  expandedHeight,
  expanded,
  onExpandedChange,
}: MapScheduleSheetProps) {
  const insets = useSafeAreaInsets();
  const [collapsedHeight, setCollapsedHeight] = useState(0);
  const offset = expandedHeight - collapsedHeight;
  const translateY = useRef(new Animated.Value(0)).current;
  const dragStart = useRef(0);
  const listRef = useRef<ScrollView>(null);
  const rowOffsets = useRef(new Map<string, number>());

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: expanded ? 0 : offset,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded, offset, translateY]);

  useEffect(() => {
    if (!selectedKey) return;
    const y = rowOffsets.current.get(selectedKey);
    if (y !== undefined) listRef.current?.scrollTo({ y, animated: true });
  }, [selectedKey]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderGrant: () => {
          dragStart.current = expanded ? 0 : offset;
        },
        onPanResponderMove: (_, g) => {
          translateY.setValue(
            Math.min(Math.max(dragStart.current + g.dy, 0), offset),
          );
        },
        onPanResponderRelease: (_, g) => {
          const position = dragStart.current + g.dy;
          const next = Math.abs(g.vy) > 0.5 ? g.vy < 0 : position < offset / 2;
          if (next === expanded) {
            Animated.timing(translateY, {
              toValue: next ? 0 : offset,
              duration: 200,
              useNativeDriver: true,
            }).start();
          }
          onExpandedChange(next);
        },
      }),
    [expanded, offset, translateY, onExpandedChange],
  );

  const mappedCount = stops.filter(stop => stop.coordinate).length;

  return (
    <Animated.View
      style={[
        styles.sheet,
        { height: expandedHeight, transform: [{ translateY }] },
      ]}
    >
      <View
        {...panResponder.panHandlers}
        onLayout={e => setCollapsedHeight(e.nativeEvent.layout.height)}
      >
        <View style={styles.handleArea}>
          <View style={styles.handle} />
        </View>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>일정 순서</Text>
            <Text style={styles.count}>{mappedCount}곳</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {[null, ...Array.from({ length: dayCount }, (_, i) => i)].map(
              day => {
                const isSelected = day === dayIndex;
                return (
                  <Pressable
                    key={day ?? "all"}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => onDayChange(day)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {day === null ? "전체" : `DAY ${day + 1}`}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </ScrollView>
        </View>
      </View>

      <ScrollView
        ref={listRef}
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: spacing.xl + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {stops.length === 0 ? (
          <Text style={styles.empty}>표시할 일정이 없어요.</Text>
        ) : (
          stops.map(stop => (
            <Pressable
              key={stop.key}
              style={[
                styles.row,
                stop.key === selectedKey && styles.rowSelected,
              ]}
              onPress={() => onStopPress(stop)}
              onLayout={e =>
                rowOffsets.current.set(stop.key, e.nativeEvent.layout.y)
              }
            >
              <View
                style={[
                  styles.number,
                  {
                    backgroundColor: stop.coordinate
                      ? stop.color
                      : colors.paletteFg4,
                  },
                ]}
              >
                <Text style={styles.numberText}>
                  {getStopLabel(stop, dayIndex)}
                </Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.time}>
                  {stop.endTime
                    ? `${stop.startTime} – ${stop.endTime}`
                    : stop.startTime}
                </Text>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {stop.title}
                </Text>
                <View style={styles.meta}>
                  <View style={[styles.badge, { backgroundColor: stop.tint }]}>
                    <Text style={[styles.badgeText, { color: stop.color }]}>
                      {stop.categoryLabel}
                    </Text>
                  </View>
                  {!!stop.placeName && (
                    <Text style={styles.place} numberOfLines={1}>
                      {stop.placeName}
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    backgroundColor: colors.white,
    ...shadows.md,
  },
  handleArea: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    alignSelf: "center",
    backgroundColor: colors.paletteLine,
  },
  header: {
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.paletteFill,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...textStyles.h5,
    color: colors.paletteInk,
  },
  count: {
    ...textStyles.body4,
    color: colors.paletteFg3,
    fontVariant: ["tabular-nums"],
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  chip: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.paletteLine,
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  chipSelected: {
    borderColor: colors.paletteInk,
    backgroundColor: colors.paletteInk,
  },
  chipText: {
    ...textStyles.h7,
    color: colors.paletteFg2,
  },
  chipTextSelected: {
    color: colors.white,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  empty: {
    ...textStyles.body4,
    fontFamily: typography.fontFamily.pretendardMedium,
    paddingVertical: spacing["2xl"],
    textAlign: "center",
    color: colors.paletteFg3,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.mdPlus,
  },
  rowSelected: {
    backgroundColor: colors.paletteFill,
  },
  number: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    ...textStyles.h7,
    color: colors.white,
    fontVariant: ["tabular-nums"],
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  time: {
    ...textStyles.body5,
    fontFamily: typography.fontFamily.pretendardMedium,
    color: colors.paletteFg3,
    fontVariant: ["tabular-nums"],
  },
  rowTitle: {
    ...textStyles.h6,
    color: colors.paletteInk,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 0,
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
  place: {
    ...textStyles.body4,
    flexShrink: 1,
    color: colors.paletteFg2,
  },
});
