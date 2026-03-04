import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import dayjs from 'dayjs';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { radii } from '@/ui/tokens/radii';
import CloseIcon from '../../../assets/mobile_close.svg';
import LeftArrowIcon from '../../../assets/cal_left_arrow.svg';
import RightArrowIcon from '../../../assets/cal_right_arrow.svg';

export interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  onDayPress: (day: { dateString: string }) => void;
  minDate?: string;
  maxDate?: string;
}

function DayCell({
  date,
  marking,
  onPress,
  currentMonth,
}: {
  date?: DateData;
  state?: string;
  marking?: { selected?: boolean };
  onPress?: (date: DateData) => void;
  currentMonth: string;
  minDate?: string;
  maxDate?: string;
}) {
  if (!date) {
    return <View style={styles.dayCell} />;
  }
  const isSelected = marking?.selected;
  const isToday = dayjs().isSame(dayjs(date.dateString), 'day') && !isSelected;
  const isCurrentMonth =
    dayjs(date.dateString).format('YYYY-MM') === dayjs(currentMonth).format('YYYY-MM');

  return (
    <Pressable
      style={styles.dayCell}
      onPress={() => onPress?.(date)}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {isToday && <View style={styles.todayCircle} pointerEvents="none" />}
      {isSelected && <View style={styles.selectedCircle} pointerEvents="none" />}
      <Text
        style={[
          styles.dayText,
          !isCurrentMonth && !isSelected && styles.dayTextOtherMonth,
          isSelected && styles.dayTextSelected,
          isToday && !isSelected && styles.dayTextToday,
        ]}
      >
        {date.day}
      </Text>
    </Pressable>
  );
}

export default function CalendarModal({
  visible,
  onClose,
  selectedDate,
  onDayPress,
  minDate,
  maxDate,
}: CalendarModalProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || dayjs().format('YYYY-MM-DD'));

  useEffect(() => {
    if (visible) {
      setCurrentMonth(selectedDate || dayjs().format('YYYY-MM-DD'));
    }
  }, [visible, selectedDate]);

  const markedDates = useMemo(
    () => (selectedDate ? { [selectedDate]: { selected: true } } : {}),
    [selectedDate]
  );

  const monthYearLabel = dayjs(currentMonth).format('YYYY년 M월');

  const handlePrevMonth = () => {
    const next = dayjs(currentMonth).subtract(1, 'month').format('YYYY-MM-DD');
    setCurrentMonth(next);
  };

  const handleNextMonth = () => {
    const next = dayjs(currentMonth).add(1, 'month').format('YYYY-MM-DD');
    setCurrentMonth(next);
  };

  const handleToday = () => {
    const today = dayjs().format('YYYY-MM-DD');
    onDayPress({ dateString: today });
    onClose();
  };

  const calendarHeader = () => (
    <View style={styles.calendarHeader}>
      <Pressable style={styles.arrowButton} onPress={handlePrevMonth} hitSlop={8}>
        <LeftArrowIcon width={18} height={18} color={colors.black} />
      </Pressable>
      <View style={styles.monthYearCenter}>
        <Text style={styles.monthYearText}>{monthYearLabel}</Text>
      </View>
      <Pressable style={styles.arrowButton} onPress={handleNextMonth} hitSlop={8}>
        <RightArrowIcon width={18} height={18} color={colors.black} />
      </Pressable>
    </View>
  );

  const weekDayHeader = () => (
    <View style={styles.weekDayRow}>
      {['월', '화', '수', '목', '금', '토', '일'].map((day, i) => (
        <View key={i} style={styles.weekDayCell}>
          <Text style={styles.weekDayText}>{day}</Text>
        </View>
      ))}
    </View>
  );

  const customHeader = () => (
    <View style={styles.customHeaderWrapper}>
      {calendarHeader()}
      {weekDayHeader()}
    </View>
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.centered}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>달력 설정</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <CloseIcon width={24} height={24} color={colors.gray500} />
            </Pressable>
          </View>

          <Calendar
            key={currentMonth}
            current={currentMonth}
            onDayPress={(day) => {
              onDayPress({ dateString: day.dateString });
              onClose();
            }}
            firstDay={1}
            markedDates={markedDates}
            customHeader={customHeader}
            allowSelectionOutOfRange
            dayComponent={({ date, marking, onPress }) => (
              <DayCell
                date={date as DateData}
                marking={marking as { selected?: boolean }}
                onPress={onPress}
                currentMonth={currentMonth}
              />
            )}
            onMonthChange={(month) => setCurrentMonth(month.dateString)}
            minDate={minDate}
            maxDate={maxDate}
            theme={{
              arrowColor: 'transparent',
              selectedDayBackgroundColor: 'transparent',
              selectedDayTextColor: colors.white,
              todayTextColor: colors.primary,
              todayBackgroundColor: 'transparent',
              monthTextColor: 'transparent',
              textMonthFontSize: 0,
              textMonthFontWeight: '0' as any,
              textMonthFontFamily: typography.fontFamily.pretendardSemiBold,
              weekVerticalMargin: 4,
            }}
            style={styles.calendar}
          />

          <Pressable style={styles.todayButton} onPress={handleToday}>
            <Text style={styles.todayButtonText}>오늘로 이동</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayBackground,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    ...textStyles.h3,
  },
  customHeaderWrapper: {
    marginBottom: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  arrowButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearText: {
    ...textStyles.h4,
    color: colors.black,
  },
  weekDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    ...textStyles.body5,
    color: colors.gray700,
  },
  calendar: {
    paddingTop: 0,
    marginTop: 0,
  },
  dayCell: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  selectedCircle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.primary}1A`,
    zIndex: 1,
  },
  todayCircle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.primary}1A`,
    zIndex: 0,
  },
  dayText: {
    ...textStyles.h7,
    lineHeight: 18,
    zIndex: 2,
    color: colors.black,
  },
  dayTextDisabled: {
    color: colors.gray400,
  },
  dayTextOtherMonth: {
    color: colors.gray400,
  },
  dayTextSelected: {
    color: colors.primary,
  },
  dayTextToday: {
    color: colors.primary,
  },
  todayButton: {
    marginTop: 20,
    alignSelf: 'flex-end',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButtonText: {
    ...textStyles.h6,
    color: colors.white,
  },
});
