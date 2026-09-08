import type { DaySuggestion, SuggestionPlace } from "@/services/tourism";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { formatWalkTime } from "@/utils/distanceUtils";
import { useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import AiCloseIcon from "../../../assets/ai_close.svg";
import LeftArrowIcon from "../../../assets/left_arrow.svg";
import RightArrowIcon from "../../../assets/right_arrow.svg";

const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

const CATEGORY_BADGE: Record<string, { color: string; bg: string }> = {
  음식점:   { color: colors.categoryMeal,   bg: "#FFF4E0" },
  관광지:   { color: colors.categorySightseeing, bg: "#FCEAFF" },
  문화시설: { color: colors.categorySightseeing, bg: "#FCEAFF" },
  쇼핑:     { color: colors.categoryShopping, bg: "#E6F7EE" },
  레포츠:   { color: "#0E6EBF",             bg: "#E0F0FF" },
  여행코스: { color: colors.gray700,        bg: colors.gray200 },
};


function parseDateLabel(dateStr: string): { md: string; dow: string } {
  const parts = dateStr.split("-").map(Number);
  const dow = DAY_KO[new Date(dateStr).getDay()];
  return { md: `${parts[1]}.${parts[2]}`, dow };
}

interface Props {
  suggestions: DaySuggestion[];
  onDismiss: () => void;
  onPlacePress?: (place: SuggestionPlace, date: string, slotStart: string) => void;
}

export default function SuggestionBar({ suggestions, onDismiss, onPlacePress }: Props) {
  const [dayIdx, setDayIdx] = useState(0);
  const [placeIdx, setPlaceIdx] = useState(0);
  const [outgoing, setOutgoing] = useState<{ dayIdx: number; placeIdx: number } | null>(null);
  const [wrapW, setWrapW] = useState(400);
  const outX = useRef(new Animated.Value(0)).current;
  const inX = useRef(new Animated.Value(0)).current;

  if (!suggestions.length) return null;

  const day = suggestions[dayIdx];
  const place = day.places[placeIdx];
  const { md, dow } = parseDateLabel(day.date);
  const canPrev = dayIdx > 0;
  const canNext = dayIdx < suggestions.length - 1;

  function goDay(dir: -1 | 1) {
    const next = dayIdx + dir;
    if (next < 0 || next >= suggestions.length) return;

    outX.setValue(0);
    inX.setValue(dir * wrapW);
    setOutgoing({ dayIdx, placeIdx });
    setDayIdx(next);
    setPlaceIdx(0);

    Animated.parallel([
      Animated.timing(outX, {
        toValue: -dir * wrapW,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(inX, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setOutgoing(null));
  }

  function renderPlace(targetDay: DaySuggestion, targetPlace: SuggestionPlace) {
    const distLabel = formatWalkTime(targetPlace.dist ?? 0);
    const catBadge = targetPlace.category ? CATEGORY_BADGE[targetPlace.category] : null;
    return (
      <Pressable
        style={({ hovered }: any) => [styles.placeBtn, hovered && styles.placeBtnHover]}
        onPress={() => onPlacePress?.(targetPlace, targetDay.date, targetDay.slotStart)}
        accessibilityLabel={`${targetPlace.title} 자세히 보기`}
        accessibilityRole="button"
      >
        <View style={styles.placeRow1}>
          <Text style={styles.timeRange}>{targetDay.slotStart}–{targetDay.slotEnd}</Text>
          {catBadge && (
            <View style={[styles.catBadge, { backgroundColor: catBadge.bg }]}>
              <Text style={[styles.catText, { color: catBadge.color }]}>{targetPlace.category}</Text>
            </View>
          )}
          <Text style={styles.placeName} numberOfLines={1}>{targetPlace.title}</Text>
          {distLabel && (
            <>
              <Text style={styles.separator}>·</Text>
              <Text style={styles.distText}>{distLabel}</Text>
            </>
          )}
        </View>
        {targetPlace.sentence ? (
          <Text style={styles.sentence} numberOfLines={1}>{targetPlace.sentence}</Text>
        ) : null}
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>

        {/* ── AI 제안 뱃지 ── */}
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI 제안</Text>
        </View>

        {/* ── 날짜 네비게이터 ── */}
        <View style={styles.dateNav} accessibilityLabel="제안 날짜">
          <Pressable
            onPress={() => goDay(-1)}
            disabled={!canPrev}
            style={styles.navBtn}
            accessibilityLabel="이전 날짜"
          >
            <LeftArrowIcon width={12} height={12} color={canPrev ? colors.gray700 : colors.gray400} />
          </Pressable>
          <Text style={styles.dateNum}>
            {md}
            {"  "}
            <Text style={styles.dateDow}>{dow}</Text>
          </Text>
          <Pressable
            onPress={() => goDay(1)}
            disabled={!canNext}
            style={styles.navBtn}
            accessibilityLabel="다음 날짜"
          >
            <RightArrowIcon width={12} height={12} color={canNext ? colors.gray700 : colors.gray400} />
          </Pressable>
        </View>

        {/* ── 장소 정보 (클릭) ── */}
        <View style={styles.placeWrapper} onLayout={(e) => setWrapW(e.nativeEvent.layout.width)}>
          {outgoing !== null && (
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: outX }] }]}>
              {renderPlace(suggestions[outgoing.dayIdx], suggestions[outgoing.dayIdx].places[outgoing.placeIdx])}
            </Animated.View>
          )}
          <Animated.View style={{ transform: [{ translateX: inX }] }}>
            {renderPlace(day, place)}
          </Animated.View>
        </View>

        {/* ── 도트 + 닫기 ── */}
        <View style={styles.rightGroup}>
          {day.places.length > 1 && (
            <View style={styles.dots}>
              {day.places.map((p, i) => (
                <Pressable
                  key={p.contentId}
                  onPress={() => setPlaceIdx(i)}
                  style={styles.dotBtn}
                  accessibilityLabel={p.title}
                  accessibilityState={{ selected: i === placeIdx }}
                >
                  <View
                    style={[
                      styles.dot,
                      i === placeIdx ? styles.dotOn : styles.dotOff,
                    ]}
                  />
                </Pressable>
              ))}
            </View>
          )}
          <Pressable
            onPress={onDismiss}
            style={({ hovered }: any) => [styles.closeBtn, hovered && styles.closeBtnHover]}
            accessibilityLabel="AI 제안 닫기"
          >
            <AiCloseIcon width={15} height={15} />
          </Pressable>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  // AI 제안 뱃지
  aiBadge: {
    flexShrink: 0,
    height: 24,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.aiTint,
    justifyContent: "center",
    alignItems: "center",
  },
  aiBadgeText: {
    ...textStyles.h8,
    color: colors.aiInk,
    letterSpacing: -0.12,
  },

  // 날짜 네비게이터
  dateNav: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    height: 32,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.gray200,
    borderRadius: radii.pill,
  },
  navBtn: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    justifyContent: "center",
    alignItems: "center",
  },
  dateNum: {
    ...textStyles.h7,
    color: colors.gray900,
    minWidth: 56,
    textAlign: "center",
    paddingHorizontal: spacing.xs,
  },
  dateDow: {
    ...textStyles.body5,
    fontWeight: "500",
    color: colors.gray700,
  },

  // 장소 래퍼 + 버튼
  placeWrapper: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
  },
  placeBtn: {
    flexDirection: "column",
    gap: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  placeBtnHover: {
    backgroundColor: colors.gray100,
  },
  placeRow1: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 0,
  },
  timeRange: {
    ...textStyles.h8,
    fontWeight: "600",
    color: colors.gray700,
    flexShrink: 0,
  },
  catBadge: {
    flexShrink: 0,
    height: 20,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  catText: {
    ...textStyles.h8,
    fontWeight: "600",
  },
  placeName: {
    ...textStyles.h6,
    color: colors.gray900,
    flexShrink: 1,
    minWidth: 0,
  },
  separator: {
    ...textStyles.body5,
    color: colors.gray400,
    flexShrink: 0,
    marginHorizontal: -2,
  },
  distText: {
    ...textStyles.body5,
    fontWeight: "500",
    color: colors.gray800,
    flexShrink: 0,
  },
  sentence: {
    ...textStyles.body5,
    color: colors.gray700,
  },

  // 도트 + 닫기
  rightGroup: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginRight: spacing.xs,
  },
  dotBtn: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    height: 6,
    borderRadius: radii.pill,
  },
  dotOn: {
    width: 16,
    backgroundColor: colors.gray900,
  },
  dotOff: {
    width: 6,
    backgroundColor: colors.gray400,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnHover: {
    backgroundColor: colors.gray200,
  },
});
