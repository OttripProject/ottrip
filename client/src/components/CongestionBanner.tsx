import { colors } from "@/ui/tokens/colors";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import CloseIcon from "../../assets/close_sm.svg";

interface Props {
  festivals: {
    matchedLocationName: string | null;
    matchedDate: string | null;
  }[];
  onDismiss: () => void;
}

const fmtDate = (d: string) => {
  const m = d.slice(5, 7).replace(/^0/, "");
  const day = d.slice(8, 10).replace(/^0/, "");
  return `${m}.${day}`;
};

type Segment = { text: string; bold?: boolean };

function buildBannerSegments(
  festivals: { matchedLocationName: string | null; matchedDate: string | null }[],
): Segment[] {
  const dates = [
    ...new Set(festivals.map((f) => f.matchedDate).filter(Boolean) as string[]),
  ].sort();

  const allLocations = [
    ...new Set(festivals.map((f) => f.matchedLocationName).filter(Boolean)),
  ].join(", ");

  if (dates.length === 0) {
    return [{ text: `${allLocations} 일대가 축제·공연으로 붐빌 수 있어요.` }];
  }

  const isConsecutive = dates.every((d, i) => {
    if (i === 0) return true;
    return new Date(d).getTime() - new Date(dates[i - 1]).getTime() === 86_400_000;
  });

  if (isConsecutive) {
    const dateStr =
      dates.length === 1
        ? fmtDate(dates[0])
        : `${fmtDate(dates[0])}–${fmtDate(dates[dates.length - 1])}`;
    return [
      { text: `${dateStr} `, bold: true },
      { text: `${allLocations} 일대가 축제·공연으로 붐빌 수 있어요.` },
    ];
  }

  // 비연속: 날짜별로 장소명 그룹핑, 날짜는 bold
  const byDate = new Map<string, Set<string>>();
  for (const f of festivals) {
    if (!f.matchedDate) continue;
    if (!byDate.has(f.matchedDate)) byDate.set(f.matchedDate, new Set());
    if (f.matchedLocationName) byDate.get(f.matchedDate)!.add(f.matchedLocationName);
  }
  const entries = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  const segments: Segment[] = [];
  entries.forEach(([d, locs], i) => {
    if (i > 0) segments.push({ text: ", " });
    segments.push({ text: fmtDate(d), bold: true });
    segments.push({ text: ` ${[...locs].join("·")}` });
  });
  segments.push({ text: " 일대가 축제·공연으로 붐빌 수 있어요." });
  return segments;
}

export default function CongestionBanner({ festivals, onDismiss }: Props) {
  const segments = buildBannerSegments(festivals);
  const opacity = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(false);

  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    isMounted.current = true;
  }, [opacity]);

  const festivalsKey = festivals.map((f) => `${f.matchedDate ?? ""}${f.matchedLocationName ?? ""}`).join(",");
  useEffect(() => {
    if (!isMounted.current) return;
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [festivalsKey, opacity]);

  const handleDismiss = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>혼잡 주의</Text>
      </View>
      <Text style={styles.message} numberOfLines={1}>
        {segments.map((seg, i) => (
          <Text key={i} style={seg.bold ? styles.bold : undefined}>
            {seg.text}
          </Text>
        ))}
      </Text>
      <Pressable onPress={handleDismiss} style={styles.closeBtn} aria-label="닫기">
        <CloseIcon width={16} height={16} color={colors.gray600} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgb(233, 246, 246)",
    borderWidth: 1,
    borderColor: "rgb(207, 237, 237)",
    alignSelf: "stretch",
  } as any,
  badge: {
    flexShrink: 0,
    height: 20,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgb(191, 230, 230)",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 11,
    color: "rgb(14, 138, 138)",
  } as any,
  message: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    color: "rgb(31, 31, 31)",
    flex: 1,
    overflow: "hidden",
  } as any,
  bold: {
    fontWeight: "700",
  } as any,
  closeBtn: {
    marginLeft: "auto",
    flexShrink: 0,
    width: 32,
    height: 32,
    marginTop: -6,
    marginBottom: -6,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
  } as any,
});
