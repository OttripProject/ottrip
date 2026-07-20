import type { SegmentDraft } from "@/hooks/useTripForm";
import { colors } from "@/ui/tokens/colors";
import { textStyles, typography } from "@/ui/tokens/typography";
import dayjs from "dayjs";
import { Platform, StyleSheet, Text, View } from "react-native";

const isNative = Platform.OS !== "web";

interface TripDurationBannerProps {
  segments: SegmentDraft[];
}

export default function TripDurationBanner({ segments }: TripDurationBannerProps) {
  const starts = segments.map(s => s.startDate).filter(Boolean).sort();
  const ends = segments.map(s => s.endDate).filter(Boolean).sort();
  const totalStart = starts[0] ?? null;
  const totalEnd = ends[ends.length - 1] ?? null;

  const validSegs = segments.filter(s => s.startDate && s.endDate);
  const totalNights = validSegs.reduce(
    (acc, s) => acc + dayjs(s.endDate).diff(dayjs(s.startDate), "day"),
    0,
  );
  const totalDays = totalNights + validSegs.length;

  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        <Text style={styles.label}>전체 여행 기간</Text>
        {totalStart && totalEnd ? (
          <View style={styles.dateRow}>
            <Text style={styles.dateNum}>{dayjs(totalStart).format("YYYY.MM.DD")}</Text>
            <Text style={styles.dateDash}>—</Text>
            <Text style={styles.dateNum}>{dayjs(totalEnd).format("YYYY.MM.DD")}</Text>
          </View>
        ) : (
          <Text style={styles.empty}>구간 기간을 입력하면 자동으로 계산됩니다</Text>
        )}
      </View>
      {totalStart && totalEnd && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalNights}박 {totalDays}일</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.gray900,
    borderRadius: isNative ? 16 : 12,
    paddingHorizontal: isNative ? 20 : 16,
    paddingVertical: isNative ? 18 : 14,
    marginBottom: isNative ? 8 : 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flex: 1,
  },
  label: {
    ...textStyles.body6,
    color: "rgba(255,255,255,0.5)",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  dateNum: {
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontWeight: "700" as const,
    fontSize: 15,
    lineHeight: 22,
    color: colors.white,
  },
  dateDash: {
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontWeight: "400" as const,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.5)",
  },
  empty: {
    ...textStyles.body5,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontWeight: "700" as const,
    fontSize: 12,
    lineHeight: 16,
    color: colors.white,
  },
});
