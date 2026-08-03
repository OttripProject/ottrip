import type { ExportSegment } from "@/services/plans";
import { colors } from "@/ui/tokens/colors";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import dayjs from "dayjs";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import CalendarIcon from "../../../assets/calendar_outline.svg";
import PanelLayout from "./PanelLayout";

interface ViewerPlanSummaryPanelProps {
  plan: {
    title: string;
    startDate: string;
    endDate: string;
    segments: ExportSegment[];
  };
}

export default function ViewerPlanSummaryPanel({
  plan,
}: ViewerPlanSummaryPanelProps) {
  const formatFull = (d: string) => dayjs(d).format("YYYY. MM. DD");
  const formatShort = (d: string) => dayjs(d).format("MM. DD");

  return (
    <PanelLayout>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.sectionLabel}>여행</Text>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <View style={styles.dateRow}>
            <CalendarIcon width={14} height={14} color={colors.gray700} />
            <Text style={styles.dateText}>
              {formatFull(plan.startDate)} – {formatFull(plan.endDate)}
            </Text>
          </View>
        </View>

        {plan.segments.length > 0 && (
          <>
            <View style={styles.divider} />
            <View>
              <Text style={styles.groupLabel}>구간</Text>
              <View style={styles.segmentList}>
                {plan.segments.map((seg, i) => (
                  <View key={i} style={styles.segmentRow}>
                    <View style={styles.segmentDot} />
                    <View style={styles.segmentInfo}>
                      <Text style={styles.segmentCity}>
                        {seg.country
                          ? `${seg.country} · ${seg.city}`
                          : seg.city}
                      </Text>
                      <Text style={styles.segmentDate}>
                        {formatShort(seg.startDate)} –{" "}
                        {formatShort(seg.endDate)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </PanelLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 22,
  },
  sectionLabel: {
    ...textStyles.h9,
    color: colors.gray600,
    letterSpacing: 0.04 * 11,
    marginBottom: 4,
  },
  planTitle: {
    ...textStyles.h3,
    lineHeight: 28,
    color: colors.gray900,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
  },
  dateText: {
    ...textStyles.body4,
    color: colors.gray700,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginTop: 18,
    marginBottom: 16,
  },
  groupLabel: {
    ...textStyles.h8,
    color: colors.gray900,
    marginBottom: spacing.sm,
  },
  segmentList: {
    gap: 10,
  },
  segmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  segmentDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
  segmentInfo: {
    flex: 1,
    minWidth: 0,
  },
  segmentCity: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  segmentDate: {
    ...textStyles.body5,
    lineHeight: 16,
    color: colors.gray600,
    marginTop: 1,
  },
});
