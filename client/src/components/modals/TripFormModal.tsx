import { PLACEHOLDERS } from "@/constants/placeholders";
import Input from "@/ui/components/input/Input";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import dayjs from "dayjs";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";
import LeftArrowIcon from "../../../assets/cal_left_arrow.svg";
import RightArrowIcon from "../../../assets/cal_right_arrow.svg";
import XIcon from "../../../assets/x.svg";

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

type SelectionType = "single" | "start" | "end" | "range" | undefined;
type CalendarDayMark = { selection?: SelectionType; selected?: boolean };
type CalendarMarkedDates = Record<string, CalendarDayMark>;

interface TripFormModalProps {
  visible: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  tripData: {
    name: string;
    startDate: string;
    endDate: string;
  };
  onTripDataChange: (data: {
    name?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
  markedDates: CalendarMarkedDates;
  onDateSelect: (dateString: string) => void;
  onSubmit: () => void;
  isSubmitDisabled: boolean;
}

function DayCell({
  date,
  state,
  marking,
  onPress,
}: {
  date?: DateData;
  state: string;
  marking?: CalendarDayMark;
  onPress?: (date: DateData) => void;
}) {
  if (!date) {
    return <View style={styles.dayContainer} />;
  }

  const selection = marking?.selection;
  const isDisabled = state === "disabled";
  const isStart = selection === "start";
  const isEnd = selection === "end";
  const isRange = selection === "range";
  const isSingle = selection === "single";
  const isToday = dayjs().isSame(dayjs(date.dateString), "day");

  const rangeStyle: any = {
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

  const circleStyle: any = {};
  if (isSingle || isStart || isEnd) {
    circleStyle.backgroundColor = colors.primary;
  } else if (isToday && !selection) {
    circleStyle.backgroundColor = "#E8F1FF";
  }

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

export default function TripFormModal({
  visible,
  onClose,
  mode,
  tripData,
  onTripDataChange,
  markedDates,
  onDateSelect,
  onSubmit,
  isSubmitDisabled,
}: TripFormModalProps) {
  const title = mode === "add" ? "새 여행 추가" : "여행 수정";
  const description =
    mode === "add"
      ? "새로운 여행을 만들어 계획을 시작하세요."
      : "여행 정보를 수정하세요.";
  const submitButtonText = mode === "add" ? "여행 저장" : "여행 수정";

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalDescription}>{description}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <XIcon width={24} height={24} />
            </Pressable>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>여행명</Text>
            <Input
              style={styles.input}
              placeholder={PLACEHOLDERS.plan.name}
              value={tripData.name}
              onChangeText={text => onTripDataChange({ name: text })}
              maxLength={50}
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>여행 기간 선택</Text>
            <View style={styles.calendarWrapper}>
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
                    marking={marking as CalendarDayMark}
                    onPress={onPress}
                  />
                )}
                onDayPress={day => onDateSelect(day.dateString)}
                style={styles.calendar}
              />
            </View>
          </View>

          <View style={styles.modalButtons}>
            <Pressable
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
            <Pressable
              style={[
                styles.modalButton,
                styles.addButton,
                isSubmitDisabled && styles.addButtonDisabled,
              ]}
              onPress={onSubmit}
              disabled={isSubmitDisabled}
            >
              <Text
                style={[
                  styles.addButtonText,
                  isSubmitDisabled && styles.addButtonTextDisabled,
                ]}
              >
                {submitButtonText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    minWidth: 420,
    maxHeight: 724,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  modalHeaderText: {
    flex: 1,
    paddingRight: 16,
  },
  modalTitle: {
    ...textStyles.h3,
    textAlign: "left",
    marginBottom: 4,
    marginLeft: 10,
  },
  modalDescription: {
    ...textStyles.body4,
    color: colors.gray700,
    marginLeft: 10,
    textAlign: "left",
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    ...textStyles.h7,
    color: colors.black,
    marginBottom: 4,
    marginLeft: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 0,
    width: 356,
    height: 48,
    fontSize: 14,
    backgroundColor: colors.white,
    alignSelf: "center",
  },
  calendarWrapper: {
    width: 356,
    height: 334,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 10,
    paddingVertical: 24,
    paddingHorizontal: 40,
    alignSelf: "center",
    justifyContent: "center",
  },
  calendar: {
    alignSelf: "center",
    width: 276,
    backgroundColor: "transparent",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "center",
  },
  modalButton: {
    width: 174,
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: colors.gray300,
    marginRight: 4,
  },
  cancelButtonText: {
    ...textStyles.h7,
  },
  addButton: {
    backgroundColor: colors.gray900,
    marginLeft: 4,
  },
  addButtonDisabled: {
    backgroundColor: colors.gray300,
  },
  addButtonText: {
    ...textStyles.h7,
    color: colors.white,
  },
  addButtonTextDisabled: {
    color: colors.gray700,
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
    fontFamily: textStyles.body4.fontFamily,
    fontSize: 14,
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
