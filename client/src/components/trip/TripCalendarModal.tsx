import type { CalendarMarkedDates } from "@/hooks/useTripForm";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import dayjs from "dayjs";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";
import LeftArrowIcon from "../../../assets/cal_left_arrow.svg";
import RightArrowIcon from "../../../assets/cal_right_arrow.svg";
import XIcon from "../../../assets/mobile_close.svg";

const CALENDAR_THEME = {
  selectedDayBackgroundColor: "#007AFF",
  selectedDayTextColor: "#ffffff",
  todayTextColor: "#007AFF",
  dayTextColor: "#2d4150",
  textDisabledColor: "#d9e1e8",
  monthTextColor: "#2d4150",
  indicatorColor: "#007AFF",
  textDayFontWeight: "400" as const,
  textMonthFontWeight: "600" as const,
  textDayHeaderFontWeight: "500" as const,
  textDayFontSize: 13,
  textMonthFontSize: 16,
  textDayHeaderFontSize: 11,
  textSectionTitleColor: colors.gray600,
  "stylesheet.calendar.main": {
    week: {
      marginVertical: 2,
      flexDirection: "row",
      justifyContent: "space-between",
    },
  },
};

type DayMark = {
  selection?: "single" | "start" | "end" | "range";
  selected?: boolean;
};

function DayCell({
  date,
  state,
  marking,
  onPress,
}: {
  date?: DateData;
  state: string;
  marking?: DayMark;
  onPress?: (date: DateData) => void;
}) {
  if (!date) return <View style={styles.dayContainer} />;

  const selection = marking?.selection;
  const isDisabled = state === "disabled";
  const isStart = selection === "start";
  const isEnd = selection === "end";
  const isRange = selection === "range";
  const isSingle = selection === "single";
  const isToday = dayjs().isSame(dayjs(date.dateString), "day");

  const rangeStyle: Record<string, unknown> = {
    opacity: isStart || isEnd || isRange ? 1 : 0,
  };
  if (isStart) {
    rangeStyle.left = 16;
    rangeStyle.right = -4;
  } else if (isEnd) {
    rangeStyle.left = -4;
    rangeStyle.right = 16;
  } else if (isRange) {
    rangeStyle.left = -4;
    rangeStyle.right = -4;
  }

  const circleStyle: Record<string, unknown> = {};
  if (isSingle || isStart || isEnd)
    circleStyle.backgroundColor = colors.primary;
  else if (isToday && !selection) circleStyle.backgroundColor = "#E8F1FF";

  return (
    <Pressable
      style={styles.dayContainer}
      disabled={isDisabled}
      onPress={() => onPress?.(date)}
    >
      <View style={[styles.rangeBase, rangeStyle]} />
      <View style={[styles.circleBase, circleStyle]}>
        <Text
          style={[
            styles.dayText,
            isDisabled && styles.dayTextDisabled,
            (isSingle || isStart || isEnd) && styles.dayTextSelected,
            isToday && !selection && styles.dayTextToday,
          ]}
        >
          {date.day}
        </Text>
      </View>
    </Pressable>
  );
}

interface TripCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  selectionMode: "start" | "end";
  markedDates: CalendarMarkedDates;
  onDateSelect: (dateString: string) => void;
}

export default function TripCalendarModal({
  visible,
  onClose,
  selectionMode,
  markedDates,
  onDateSelect,
}: TripCalendarModalProps) {
  const title = selectionMode === "start" ? "시작일 선택" : "종료일 선택";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.popup}
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <XIcon width={18} height={18} color={colors.gray700} />
            </Pressable>
          </View>
          <Calendar
            monthFormat="yyyy년 M월"
            markedDates={markedDates}
            markingType="custom"
            theme={CALENDAR_THEME}
            firstDay={1}
            renderArrow={direction =>
              direction === "left" ? (
                <LeftArrowIcon width={18} height={18} />
              ) : (
                <RightArrowIcon width={18} height={18} />
              )
            }
            dayComponent={({ date, state, marking, onPress }) => (
              <DayCell
                date={date as DateData}
                state={state ?? ""}
                marking={marking as DayMark}
                onPress={onPress}
              />
            )}
            onDayPress={day => onDateSelect(day.dateString)}
            style={styles.calendar}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  popup: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
    width: "100%",
    maxWidth: 420,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    ...textStyles.h6,
    color: colors.black,
  },
  calendar: {
    alignSelf: "center",
    width: 276,
    backgroundColor: "transparent",
  },
  dayContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "visible",
    marginVertical: 2,
  },
  rangeBase: {
    position: "absolute",
    left: -12,
    right: -12,
    top: "50%",
    height: 32,
    marginTop: -16,
    backgroundColor: "#E8F1FF",
    zIndex: 1,
  },
  circleBase: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    zIndex: 2,
  },
  dayText: {
    ...textStyles.body3,
    color: colors.black,
  },
  dayTextDisabled: {
    color: colors.gray300,
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: "600",
  },
  dayTextToday: {
    color: colors.primary,
    fontWeight: "600",
  },
});
