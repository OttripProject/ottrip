import React, { useState } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import dayjs from 'dayjs';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import LeftArrowIcon from '../../../assets/cal_left_arrow.svg';
import RightArrowIcon from '../../../assets/cal_right_arrow.svg';

interface MonthCalendarPopupProps {
  visible: boolean;
  selectedDate: string;
  onDayPress: (day: { dateString: string }) => void;
  onClose?: () => void;
  style?: any;
}

function DayCell({
  date,
  state,
  marking,
  onPress,
  hoveredWeek,
  setHoveredWeek,
}: {
  date?: DateData;
  state: string;
  marking?: any;
  onPress?: (date: DateData) => void;
  hoveredWeek?: string | null;
  setHoveredWeek?: (week: string | null) => void;
}) {
  if (!date) {
    return <View style={styles.dayContainer} />;
  }

  const isDisabled = state === 'disabled';
  const isSelected = marking?.selected;
  const isToday = dayjs().isSame(dayjs(date.dateString), 'day');
  // 월요일부터 시작하는 주의 시작일 계산 (firstDay={1}과 일치)
  // dayjs의 day()는 0(일요일)~6(토요일)이므로, 월요일(1)을 0으로 변환
  const dateObj = dayjs(date.dateString);
  const dayOfWeek = dateObj.day() === 0 ? 6 : dateObj.day() - 1; // 0=월요일, 6=일요일
  const weekKey = dateObj.subtract(dayOfWeek, 'day').format('YYYY-MM-DD');
  const isHoveredWeek = hoveredWeek === weekKey;

  return (
    <Pressable
      style={styles.dayContainer}
      disabled={isDisabled}
      onPress={() => onPress?.(date)}
      onHoverIn={() => setHoveredWeek?.(weekKey)}
      onHoverOut={() => setHoveredWeek?.(null)}
    >
      {/* 주 단위 배경 */}
      {isHoveredWeek && (
        <View style={styles.weekBackground} />
      )}
      {/* 오늘 날짜 원형 테두리 */}
      {isToday && !isSelected && (
        <View style={styles.todayCircle} />
      )}
      {/* 선택된 날짜 배경 */}
      {isSelected && (
        <View style={styles.selectedCircle} />
      )}
      <Text
        style={[
          styles.dayText,
          isDisabled && styles.dayTextDisabled,
          isSelected && styles.dayTextSelected,
          isToday && !isSelected && styles.dayTextToday,
        ]}
      >
        {date.day}
      </Text>
    </Pressable>
  );
}

export default function MonthCalendarPopup({
  visible,
  selectedDate,
  onDayPress,
  onClose,
  style,
}: MonthCalendarPopupProps) {
  const [hoveredWeek, setHoveredWeek] = useState<string | null>(null);

  if (!visible) return null;

  return (
    <View style={[styles.popup, style]}>
      <Calendar
        current={selectedDate}
        onDayPress={(day) => {
          onDayPress(day);
          onClose?.();
        }}
        firstDay={1}
        monthFormat={'M월 yyyy'}
        markedDates={{
          [selectedDate]: { selected: true },
        }}
        renderArrow={(direction) =>
          direction === 'left' ? (
            <LeftArrowIcon width={18} height={18} />
          ) : (
            <RightArrowIcon width={18} height={18} />
          )
        }
        dayComponent={({ date, state, marking, onPress }) => (
          <DayCell
            date={date as DateData}
            state={state ?? ''}
            marking={marking}
            onPress={onPress}
            hoveredWeek={hoveredWeek}
            setHoveredWeek={setHoveredWeek}
          />
        )}
        theme={{
          arrowColor: 'transparent', // 기본 화살표 숨기기
          todayTextColor: 'transparent', // 기본 오늘 날짜 스타일 숨기기
          textMonthFontSize: textStyles.body1.fontSize, // 18
          textMonthFontWeight: '700', // bold
          textMonthFontFamily: textStyles.body1.fontFamily,
          monthTextColor: colors.black,
          selectedDayBackgroundColor: 'transparent', // 기본 선택 배경 숨기기
          selectedDayTextColor: colors.white,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  popup: {
    position: 'absolute',
    width: 276,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 10000,
  },
  dayContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  weekBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 32,
    marginTop: -16,
    backgroundColor: '#E8F1FF',
    zIndex: 0,
  },
  todayCircle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8F1FF',
    zIndex: 1,
  },
  selectedCircle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111',
    zIndex: 2,
  },
  dayText: {
    fontFamily: textStyles.body4.fontFamily,
    fontSize: 14,
    color: colors.black,
    zIndex: 3,
  },
  dayTextDisabled: {
    color: colors.gray300,
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  dayTextToday: {
    color: colors.primary,
    fontWeight: '600',
  },
});

