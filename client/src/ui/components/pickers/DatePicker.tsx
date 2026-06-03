import useDetectClose from "@/hooks/useDetectClose";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import dayjs from "dayjs";
import { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Calendar } from "react-native-calendars";
import CalendarIcon from "../../../../assets/calender.svg";

interface DatePickerProps {
  value: string; // 'YYYY-MM-DD' 형식
  onChange: (date: string) => void;
  style?: any;
  placeholder?: string;
  minDate?: string; // 'YYYY-MM-DD' 형식
  displayFormat?: string; // 날짜 표시 형식 (예: 'YYYY.MM.DD')
}

export default function DatePicker({
  value,
  onChange,
  style,
  placeholder = "날짜를 선택하세요",
  minDate,
  displayFormat,
}: DatePickerProps) {
  const pickerRef = useRef<View>(null);
  const [showPicker, setIsPickerOpen, handleOutsidePress] = useDetectClose(
    pickerRef,
    false,
  );
  const [tempDate, setTempDate] = useState(
    value || dayjs().format("YYYY-MM-DD"),
  );

  const handleDateSelect = (dateString: string) => {
    setTempDate(dateString);
  };

  const handleConfirm = () => {
    onChange(tempDate);
    setIsPickerOpen(false);
  };

  const handleCancel = () => {
    setTempDate(value || dayjs().format("YYYY-MM-DD"));
    setIsPickerOpen(false);
  };

  const getDisplayText = () => {
    if (!value) return placeholder;
    if (displayFormat) {
      return dayjs(value).format(displayFormat);
    }
    return dayjs(value).format("YYYY년 M월 D일");
  };

  const getMarkedDates = () => {
    if (!tempDate) return {};
    return {
      [tempDate]: {
        selected: true,
        selectedColor: "#007AFF",
      },
    };
  };

  return (
    <View style={style}>
      <Pressable style={styles.dateInput} onPress={() => setIsPickerOpen(true)}>
        <View style={styles.dateTextContainer}>
          <Text style={value ? styles.dateText : styles.placeholderText}>
            {getDisplayText()}
          </Text>
          <View style={styles.iconWrapper}>
            <CalendarIcon width={16} height={16} />
          </View>
        </View>
      </Pressable>

      <Modal
        visible={showPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={handleOutsidePress}
      >
        <Pressable style={styles.modalOverlay} onPress={handleOutsidePress}>
          <View
            ref={pickerRef}
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>날짜 선택</Text>
              <Text style={styles.selectionInfo}>
                {dayjs(tempDate).format("YYYY년 M월 D일")}
              </Text>
            </View>

            <View style={styles.calendarContainer}>
              <Calendar
                onDayPress={day => handleDateSelect(day.dateString)}
                markedDates={getMarkedDates()}
                minDate={minDate}
                theme={{
                  selectedDayBackgroundColor: "#007AFF",
                  selectedDayTextColor: "#ffffff",
                  todayTextColor: "#007AFF",
                  dayTextColor: "#2d4150",
                  textDisabledColor: "#d9e1e8",
                  arrowColor: "#007AFF",
                  monthTextColor: "#2d4150",
                  indicatorColor: "#007AFF",
                  textDayFontWeight: "300",
                  textMonthFontWeight: "bold",
                  textDayHeaderFontWeight: "300",
                  textDayFontSize: 16,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 13,
                }}
              />
            </View>

            <View style={styles.buttonContainer}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.confirmButton]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>확인</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.white,
    height: 48,
  },
  dateTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dateText: {
    ...textStyles.body4,
    color: colors.black,
  },
  placeholderText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  iconWrapper: {
    marginTop: -2,
  },
  calendarIcon: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#212529",
    marginBottom: 8,
  },
  selectionInfo: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  calendarContainer: {
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#dc3545",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  confirmButton: {
    backgroundColor: "#28a745",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
});
