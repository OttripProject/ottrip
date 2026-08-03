import BaseCalendar from "@/components/popup/calendar/BaseCalendar";

export interface DraftCalendarProps {
  visible: boolean;
  selectedDate: string;
  onDayPress: (day: { dateString: string }) => void;
  onClose: () => void;
  minDate?: string;
  style?: any;
}

export default function DraftCalendar({
  visible,
  selectedDate,
  onDayPress,
  onClose,
  minDate,
  style,
}: DraftCalendarProps) {
  return (
    <BaseCalendar
      visible={visible}
      selectedDate={selectedDate}
      onDayPress={onDayPress}
      onClose={onClose}
      minDate={minDate}
      style={style}
      hideButtons
      autoCloseOnSelect
    />
  );
}
