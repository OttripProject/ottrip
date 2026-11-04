import type { DaySuggestion, SuggestionPlace } from "@/services/tourism";
import { tourismCategoryColors } from "@/types/tourism";
import { usePressScale } from "@/ui/effects/pressScale";
import ScalePressable from "@/ui/components/ScalePressable";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AiCloseIcon from "../../../assets/close_sm.svg";

function formatDistance(dist: number | null) {
  if (dist == null) return null;
  if (dist < 1000) return `${Math.round(dist / 10) * 10}m`;
  if (dist < 2000) return `${(dist / 1000).toFixed(1)}km`;
  return `${Math.round(dist / 1000)}km`;
}

export default function AiSuggestionCard({
  suggestion,
  onDismiss,
  onPlacePress,
}: {
  suggestion: DaySuggestion;
  onDismiss: () => void;
  onPlacePress: (place: SuggestionPlace) => void;
}) {
  const [pageWidth, setPageWidth] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const { scale, onPressIn, onPressOut } = usePressScale();
  const hasMultiple = suggestion.places.length > 1;

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      <View style={styles.header}>
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI 제안</Text>
        </View>
        <ScalePressable
          onPress={onDismiss}
          style={styles.closeButton}
          accessibilityLabel="AI 제안 닫기"
        >
          <AiCloseIcon width={20} height={20} color={colors.paletteFg3} />
        </ScalePressable>
      </View>
      <ScrollView
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={hasMultiple}
        onLayout={e => setPageWidth(e.nativeEvent.layout.width)}
        onMomentumScrollEnd={e => {
          if (!pageWidth) return;
          setPageIndex(Math.round(e.nativeEvent.contentOffset.x / pageWidth));
        }}
      >
        {suggestion.places.map(place => {
          const badge = place.category
            ? tourismCategoryColors[place.category]
            : null;
          const distance = formatDistance(place.dist);
          return (
            <Pressable
              key={place.contentId}
              style={[styles.page, { width: pageWidth }]}
              onPress={() => onPlacePress(place)}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
            >
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  {suggestion.slotStart}–{suggestion.slotEnd}
                </Text>
                {badge && (
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: badge.bg },
                    ]}
                  >
                    <Text style={[styles.categoryText, { color: badge.color }]}>
                      {place.category}
                    </Text>
                  </View>
                )}
                {distance && (
                  <Text style={styles.metaText}>· {distance}</Text>
                )}
              </View>
              <Text style={styles.placeName} numberOfLines={1}>
                {place.title}
              </Text>
              <Text style={styles.sentence} numberOfLines={2}>
                {place.sentence ?? ""}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {hasMultiple && (
        <View style={styles.dots}>
          {suggestion.places.map((place, index) => (
            <View
              key={place.contentId}
              style={[
                styles.dot,
                index === pageIndex ? styles.dotOn : styles.dotOff,
              ]}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: -spacing.md,
  },
  aiBadge: {
    height: 28,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    justifyContent: "center",
    backgroundColor: colors.aiTint,
  },
  aiBadgeText: {
    ...textStyles.h7,
    lineHeight: 16,
    letterSpacing: -0.13,
    color: colors.aiInk,
  },
  closeButton: {
    width: 44,
    height: 44,
    marginVertical: -spacing.md,
    marginLeft: "auto",
    alignItems: "center",
    justifyContent: "center",
  },
  page: {
    gap: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  metaText: {
    ...textStyles.h7,
    color: colors.paletteFg2,
    fontVariant: ["tabular-nums"],
  },
  categoryBadge: {
    height: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.xs,
    justifyContent: "center",
  },
  categoryText: {
    ...textStyles.h7,
    lineHeight: 16,
  },
  placeName: {
    ...textStyles.h5,
    color: colors.paletteInk,
  },
  sentence: {
    ...textStyles.body4,
    minHeight: 40,
    color: colors.paletteFg2,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  dot: {
    height: 6,
    borderRadius: radii.pill,
  },
  dotOn: {
    width: 16,
    backgroundColor: colors.paletteInk,
  },
  dotOff: {
    width: 6,
    backgroundColor: colors.gray400,
  },
});
