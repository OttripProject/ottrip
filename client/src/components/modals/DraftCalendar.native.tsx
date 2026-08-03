import CalendarModal from "@/ui/components/CalendarModal.native";
import type { DraftCalendarProps } from "./DraftCalendar";

export default function DraftCalendar({
  visible,
  selectedDate,
  onDayPress,
  onClose,
  minDate,
}: DraftCalendarProps) {
  return (
    <CalendarModal
      visible={visible}
      selectedDate={selectedDate}
      onDayPress={onDayPress}
      onClose={onClose}
      minDate={minDate}
    />
  );
}
