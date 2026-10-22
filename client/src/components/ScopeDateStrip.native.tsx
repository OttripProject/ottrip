import ScalePressable from "@/ui/components/ScalePressable";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import type { Dayjs } from "dayjs";
import {
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface ScopeDateStripProps {
  dates: Dayjs[];
  activeDates: Set<string>;
  selectedDate: string | null;
  onSelect: (date: string | null) => void;
  style?: StyleProp<ViewStyle>;
}

export default function ScopeDateStrip({
  dates,
  activeDates,
  selectedDate,
  onSelect,
  style,
}: ScopeDateStripProps) {
  return (
    <View style={[styles.container, style]}>
      <ScalePressable style={styles.all} onPress={() => onSelect(null)}>
        <Text style={[styles.allText, !selectedDate && styles.textActive]}>
          전체
        </Text>
        <View style={[styles.dot, !selectedDate && styles.dotActive]} />
      </ScalePressable>
      <View style={styles.divider} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.stripContent}
      >
        {dates.map(date => {
          const dateStr = date.format("YYYY-MM-DD");
          const isActive = activeDates.has(dateStr);
          const isSelected = selectedDate === dateStr;
          return (
            <ScalePressable
              key={dateStr}
              style={styles.dayButton}
              onPress={() => onSelect(dateStr)}
            >
              <Text
                style={[
                  styles.dayLabel,
                  !isActive && styles.textEmpty,
                  isSelected && styles.textActive,
                ]}
              >
                {WEEKDAYS[date.day()]}
              </Text>
              <View style={styles.dayNumberBox}>
                <Text
                  style={[
                    styles.dayNumber,
                    !isActive && styles.dayNumberEmpty,
                    isSelected && styles.textActive,
                  ]}
                >
                  {date.date()}
                </Text>
              </View>
              <View style={[styles.dot, isSelected && styles.dotActive]} />
            </ScalePressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: radii.lgPlus,
  },
  all: {
    marginVertical: spacing.sm,
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  allText: {
    ...textStyles.h6,
    color: colors.paletteInk,
  },
  textActive: {
    color: colors.primary,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: radii.pill,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  divider: {
    width: 1,
    marginVertical: spacing.md,
    marginHorizontal: spacing.xs,
    backgroundColor: colors.paletteLine,
  },
  strip: {
    flex: 1,
  },
  stripContent: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingLeft: spacing.xs,
    paddingRight: spacing.sm,
  },
  dayButton: {
    width: 40,
    paddingVertical: 2,
    alignItems: "center",
    gap: 2,
  },
  dayLabel: {
    ...textStyles.body5,
    color: colors.paletteFg2,
  },
  textEmpty: {
    color: colors.paletteFg4,
  },
  dayNumberBox: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: {
    ...textStyles.h5,
    color: colors.paletteInk,
    fontVariant: ["tabular-nums"],
  },
  dayNumberEmpty: {
    fontFamily: typography.fontFamily.pretendardRegular,
    color: colors.paletteFg4,
  },
});
