import RightArrow from "../../../assets/right_arrow.svg";
import type { FestivalItem } from "@/services/tourism";
import { colors } from "@/ui/tokens/colors";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEffect, useRef, useState } from "react";
import PanelLayout from "./PanelLayout";
import FestivalDetailModal from "../modals/FestivalDetailModal";

interface FestivalsPanelProps {
  festivals: FestivalItem[];
  isLoading?: boolean;
  expanded: boolean;
  onToggle: () => void;
}

function fmtDate(s: string | null): string {
  if (!s || s.length < 8) return "";
  return `${parseInt(s.slice(4, 6))}.${parseInt(s.slice(6, 8))}`;
}

function getDotColor(lclsSystm2: string | null): string {
  if (lclsSystm2 === "EV02") return colors.categoryActivity; // 공연: 자홍
  if (lclsSystm2 === "EV03") return colors.categoryMeal;     // 행사: 주황
  return colors.festivalText;                                 // 축제(EV01) 및 기본: 청록
}

export default function FestivalsPanel({
  festivals,
  isLoading,
  expanded,
  onToggle,
}: FestivalsPanelProps) {
  const [hovered, setHovered] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [selectedFestival, setSelectedFestival] = useState<FestivalItem | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLoading) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isLoading]);

  return (
    <PanelLayout style={!expanded && hovered ? styles.panelHover : undefined}>
      <View style={styles.inner}>
        {/* 펼쳐진 상태 */}
        <View
          style={styles.expandedView}
          pointerEvents={expanded ? "auto" : "none"}
        >
          <View style={[styles.expandedContent, { opacity: expanded ? 1 : 0 }]}>
            <View style={styles.header}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                이 기간 축제·공연
              </Text>
              <Text style={styles.headerCount}>{festivals.length}건</Text>
              <Pressable
                style={styles.collapseBtn}
                onPress={onToggle}
                accessibilityLabel="축제·공연 접기"
              >
                <RightArrow
                  width={16}
                  height={16}
                  color={colors.gray600}
                />
              </Pressable>
            </View>

            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              overScrollMode="never"
            >
              {festivals.map((f, i) => (
                <View key={f.contentId}>
                  {i > 0 && <View style={styles.separator} />}
                  <Pressable
                    style={[styles.item, hoveredItemId === f.contentId && styles.itemHovered]}
                    onHoverIn={() => setHoveredItemId(f.contentId)}
                    onHoverOut={() => setHoveredItemId(null)}
                    onPress={() => setSelectedFestival(f)}
                    accessibilityRole="button"
                  >
                  <View style={styles.itemRow}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: getDotColor(f.lclsSystm2) },
                      ]}
                    />
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {f.title}
                    </Text>
                  </View>
                  <Text style={styles.itemDate} numberOfLines={1}>
                    {`${fmtDate(f.eventStartDate)} – ${fmtDate(f.eventEndDate)}`}
                  </Text>
                </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* 접힌 상태 */}
        <Pressable
          style={[styles.collapsed, { opacity: expanded ? 0 : 1 }]}
          onPress={onToggle}
          pointerEvents={expanded ? "none" : "auto"}
          accessibilityLabel="축제·공연 펼치기"
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
        >
          <Text style={styles.collapsedTitle}>축제·공연</Text>
          {isLoading ? (
            <Animated.View style={[styles.badge, styles.skeletonBadge, { opacity: pulseAnim }]}>
              <Text style={[styles.badgeText, { opacity: 0 }]}>00건</Text>
            </Animated.View>
          ) : (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{festivals.length}건</Text>
            </View>
          )}
        </Pressable>
      </View>
      <FestivalDetailModal
        visible={selectedFestival !== null}
        onClose={() => setSelectedFestival(null)}
        item={selectedFestival}
      />
    </PanelLayout>
  );
}

const styles = StyleSheet.create({
  panelHover: {
    backgroundColor: colors.festivalBgLight,
  },
  inner: {
    flex: 1,
    position: "relative",
  },
  expandedView: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  expandedContent: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 0,
  },
  headerTitle: {
    ...textStyles.h5,
    color: colors.gray900,
    flex: 1,
    minWidth: 0,
  },
  headerCount: {
    ...textStyles.h9,
    color: colors.gray600,
    flexShrink: 0,
  },
  collapseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  list: {
    flex: 1,
    maxHeight: 232,
  },
  listContent: {},
  separator: {
    height: 1,
    backgroundColor: colors.gray200,
    marginHorizontal: spacing.md,
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    gap: 2,
  },
  itemHovered: {
    backgroundColor: colors.gray200,
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
    borderRadius: 999,
    flexShrink: 0,
  },
  itemTitle: {
    ...textStyles.h6,
    color: colors.gray900,
    flex: 1,
    minWidth: 0,
  },
  itemDate: {
    ...textStyles.body5,
    fontVariant: ["tabular-nums"],
    color: colors.gray600,
    paddingLeft: 16,
  },
  collapsed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  collapsedTitle: {
    ...textStyles.h8,
    color: colors.gray900,
  },
  skeletonBadge: {
    backgroundColor: colors.white,
  },
  badge: {
    backgroundColor: colors.festivalBg,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    ...textStyles.h9,
    color: colors.festivalText,
  },
});
