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
  currentWeekStart?: string; // 현재 주간의 시작일 (월요일)
}

function DayCell({
  date,
  state,
  marking,
  onPress,
  hoveredWeek,
  setHoveredWeek,
  currentWeekStart,
}: {
  date?: DateData;
  state: string;
  marking?: any;
  onPress?: (date: DateData) => void;
  hoveredWeek?: string | null;
  setHoveredWeek?: (week: string | null) => void;
  currentWeekStart?: string;
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
  
  // 현재 주간 스케줄에 표시된 주간인지 확인
  const isCurrentWeek = currentWeekStart && weekKey === dayjs(currentWeekStart).format('YYYY-MM-DD');

  return (
    <Pressable
      style={styles.dayContainer}
      disabled={isDisabled}
      onPress={() => onPress?.(date)}
      onHoverIn={() => setHoveredWeek?.(weekKey)}
      onHoverOut={() => setHoveredWeek?.(null)}
    >
      {/* 주 단위 배경 */}
      {(isHoveredWeek || isCurrentWeek) && (
        <View style={[styles.weekBackground, isCurrentWeek && styles.currentWeekBackground]} />
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
  currentWeekStart,
}: MonthCalendarPopupProps) {
  const [hoveredWeek, setHoveredWeek] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  if (!visible) return null;

  const currentDate = dayjs(currentMonth);
  const monthYearText = `${currentDate.format('YYYY')}년 ${currentDate.format('M')}월`;

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? currentDate.subtract(1, 'month')
      : currentDate.add(1, 'month');
    setCurrentMonth(newDate.format('YYYY-MM-DD'));
  };

  // 현재 주간의 날짜들 계산 (월요일부터 일요일까지)
  const getCurrentWeekDates = () => {
    if (!currentWeekStart) return {};
    const weekStart = dayjs(currentWeekStart);
    const weekDates: Record<string, any> = {};
    
    // 월요일부터 일요일까지 (7일)
    for (let i = 0; i < 7; i++) {
      const date = weekStart.add(i, 'day');
      const dateString = date.format('YYYY-MM-DD');
      weekDates[dateString] = { 
        marked: true,
        dotColor: 'transparent',
      };
    }
    return weekDates;
  };

  const dayNames = ['월', '화', '수', '목', '금', '토', '일'];

  const customHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerText}>{monthYearText}</Text>
        <View style={styles.arrowContainer}>
          <Pressable 
            style={styles.arrowButton}
            onPress={() => handleMonthChange('prev')}
          >
            <LeftArrowIcon width={24} height={24} />
          </Pressable>
          <Pressable 
            style={styles.arrowButton}
            onPress={() => handleMonthChange('next')}
          >
            <RightArrowIcon width={24} height={24} />
          </Pressable>
        </View>
      </View>
      <View style={styles.dayHeader}>
        {dayNames.map((day, index) => (
          <View key={index} style={styles.dayHeaderCell}>
            <Text style={styles.dayHeaderText}>{day}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.popup, style]}>
      <Calendar
        key={currentMonth}
        current={currentMonth}
        onDayPress={(day) => {
          onDayPress(day);
          onClose?.();
        }}
        firstDay={1}
        markedDates={{
          [selectedDate]: { selected: true },
          ...getCurrentWeekDates(),
        }}
        customHeader={customHeader}
        dayComponent={({ date, state, marking, onPress }) => (
          <DayCell
            date={date as DateData}
            state={state ?? ''}
            marking={marking}
            onPress={onPress}
            hoveredWeek={hoveredWeek}
            setHoveredWeek={setHoveredWeek}
            currentWeekStart={currentWeekStart}
          />
        )}
        onMonthChange={(month) => {
          setCurrentMonth(month.dateString);
        }}
        style={styles.calendar}
        theme={{
          arrowColor: 'transparent',
          todayTextColor: colors.white,
          selectedDayBackgroundColor: 'transparent',
          selectedDayTextColor: colors.white,
        } as any}
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
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 10000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 40,
    marginBottom: 8,
  },
  headerText: {
    ...textStyles.body1,
    color: colors.black,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 1,
    marginBottom: 4,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 17,
  },
  dayHeaderText: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  arrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowButton: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendar: {
    paddingTop: 0,
    marginTop: 0,
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
  currentWeekBackground: {
    backgroundColor: '#E8F1FF',
  },
  todayCircle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    zIndex: 1,
  },
  selectedCircle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    zIndex: 2,
  },
  dayText: {
    fontFamily: textStyles.body4.fontFamily,
    fontSize: 14,
    lineHeight: 14,
    height: 14,
    color: colors.black,
    zIndex: 3,
    textAlignVertical: 'center',
  },
  dayTextDisabled: {
    color: colors.gray300,
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  dayTextToday: {
    color: colors.white,
    fontWeight: '600',
  },
});

