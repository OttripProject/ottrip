import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import dayjs from 'dayjs';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { radii } from '@/ui/tokens/radii';
import LeftArrowIcon from '../../../../assets/cal_left_arrow.svg';
import RightArrowIcon from '../../../../assets/cal_right_arrow.svg';

export interface BaseCalendarProps {
  // 기본 props
  visible?: boolean;
  selectedDate?: string;
  onDayPress?: (day: { dateString: string }) => void;
  onClose?: () => void; // 날짜 선택 시 팝업 닫기
  style?: any;
  
  // 날짜 제약
  minDate?: string;
  maxDate?: string;
  
  // 마킹된 날짜들
  markedDates?: Record<string, any>;
  
  // 오늘 날짜 표시 여부
  showToday?: boolean; // true면 오늘 날짜 표시, false면 표시 안 함 (기본값: false)
  
  // 마우스 오버 음영 표시 여부
  showHover?: boolean; // true면 마우스 오버 시 주 단위 음영 표시 (기본값: false)
  
  // 선택된 주 막대 표시
  currentWeekStart?: string; // 현재 주간의 시작일 (월요일) - 이 값이 있으면 해당 주에 막대 표시
  
  // 달력 열릴 때 현재 주간으로 스크롤
  scrollToWeek?: boolean; // true면 달력이 열릴 때 currentWeekStart가 있으면 해당 주간이 보이도록 스크롤 (기본값: false)
  
  // 커스텀 헤더
  customHeader?: () => React.ReactNode;
  
  // 커스텀 DayCell
  dayComponent?: (props: {
    date?: DateData;
    state?: string;
    marking?: any;
    onPress?: (date: DateData) => void;
  }) => React.ReactNode;
  
  // 이벤트 핸들러
  onMonthChange?: (month: { dateString: string }) => void;
}

function DefaultDayCell({
  date,
  state,
  marking,
  onPress,
  showToday = false,
  showHover = false,
  hoveredWeek,
  setHoveredWeek,
  currentWeekStart,
}: {
  date?: DateData;
  state?: string;
  marking?: any;
  onPress?: (date: DateData) => void;
  showToday?: boolean;
  showHover?: boolean;
  hoveredWeek?: string | null;
  setHoveredWeek?: (week: string | null) => void;
  currentWeekStart?: string;
}) {
  if (!date) {
    return <View style={styles.dayContainer} />;
  }

  const isDisabled = state === 'disabled';
  const isSelected = marking?.selected;
  const isToday = showToday && dayjs().isSame(dayjs(date.dateString), 'day') && !isSelected;

  // 주 단위 계산 (월요일부터 시작)
  let isHoveredWeek = false;
  let isCurrentWeek = false;
  
  if (showHover || currentWeekStart) {
    const dateObj = dayjs(date.dateString);
    const dayOfWeek = dateObj.day() === 0 ? 6 : dateObj.day() - 1; // 0=월요일, 6=일요일
    const weekKey = dateObj.subtract(dayOfWeek, 'day').format('YYYY-MM-DD');
    isHoveredWeek = showHover && hoveredWeek === weekKey;
    
    if (currentWeekStart) {
      isCurrentWeek = weekKey === dayjs(currentWeekStart).format('YYYY-MM-DD');
    }
  }

  return (
    <Pressable
      style={styles.dayContainer}
      disabled={isDisabled}
      onPress={() => onPress?.(date)}
      onHoverIn={() => {
        if (showHover && setHoveredWeek) {
          const dateObj = dayjs(date.dateString);
          const dayOfWeek = dateObj.day() === 0 ? 6 : dateObj.day() - 1;
          const weekKey = dateObj.subtract(dayOfWeek, 'day').format('YYYY-MM-DD');
          setHoveredWeek(weekKey);
        }
      }}
      onHoverOut={() => {
        if (showHover && setHoveredWeek) {
          setHoveredWeek(null);
        }
      }}
    >
      {/* 주 단위 배경 (마우스 오버 또는 선택된 주) */}
      {(isHoveredWeek || isCurrentWeek) && (showHover || currentWeekStart) && (
        <View style={[styles.weekBackground, isCurrentWeek && styles.currentWeekBackground]} />
      )}
      {/* 오늘 날짜 원형 테두리 (showToday가 true일 때만) */}
      {isToday && (
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
          isToday && styles.dayTextToday,
        ]}
      >
        {date.day}
      </Text>
    </Pressable>
  );
}

export default function BaseCalendar({
  visible = true,
  selectedDate,
  onDayPress,
  onClose,
  style,
  minDate,
  maxDate,
  markedDates,
  showToday = false,
  showHover = false,
  currentWeekStart,
  scrollToWeek = false,
  customHeader,
  dayComponent,
  onMonthChange,
}: BaseCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || dayjs().format('YYYY-MM-DD'));
  const [hoveredWeek, setHoveredWeek] = useState<string | null>(null);
  const [tempSelectedDate, setTempSelectedDate] = useState<string | undefined>(selectedDate);

  // 달력이 열릴 때 현재 주간으로 스크롤 및 tempSelectedDate 초기화
  useEffect(() => {
    if (visible && scrollToWeek && currentWeekStart) {
      // currentWeekStart가 있으면 해당 주간이 포함된 월로 이동
      const weekStartDate = dayjs(currentWeekStart);
      setCurrentMonth(weekStartDate.format('YYYY-MM-DD'));
    } else if (visible && selectedDate) {
      // selectedDate가 있으면 해당 날짜가 포함된 월로 이동
      setCurrentMonth(selectedDate);
    }
    // visible이 true일 때 tempSelectedDate를 selectedDate로 초기화
    if (visible) {
      setTempSelectedDate(selectedDate);
    }
  }, [visible, scrollToWeek, currentWeekStart, selectedDate]);

  // markedDates는 prop으로 전달된 것만 사용 (자동 마킹 제거)
  // tempSelectedDate를 포함한 markedDates 생성
  // useMemo는 early return 전에 호출해야 함 (Hooks 규칙)
  const defaultMarkedDates = useMemo(() => {
    const baseMarkedDates = markedDates || {};
    if (tempSelectedDate) {
      return {
        ...baseMarkedDates,
        [tempSelectedDate]: { selected: true },
      };
    }
    return baseMarkedDates;
  }, [markedDates, tempSelectedDate]);

  if (!visible) return null;

  const currentDate = dayjs(currentMonth);
  const monthYearText = `${currentDate.format('YYYY')}년 ${currentDate.format('M')}월`;

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? currentDate.subtract(1, 'month')
      : currentDate.add(1, 'month');
    const newMonthString = newDate.format('YYYY-MM-DD');
    setCurrentMonth(newMonthString);
    onMonthChange?.({ dateString: newMonthString });
  };

  const defaultHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerText}>{monthYearText}</Text>
        <View style={styles.arrowContainer}>
          <Pressable 
            style={styles.arrowButton}
            onPress={() => handleMonthChange('prev')}
          >
            <LeftArrowIcon width={18} height={18} />
          </Pressable>
          <Pressable 
            style={styles.arrowButton}
            onPress={() => handleMonthChange('next')}
          >
            <RightArrowIcon width={18} height={18} />
          </Pressable>
        </View>
      </View>
      <View style={styles.dayHeader}>
        {['월', '화', '수', '목', '금', '토', '일'].map((day, index) => (
          <View key={index} style={styles.dayHeaderCell}>
            <Text style={styles.dayHeaderText}>{day}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const handleCancel = () => {
    setTempSelectedDate(selectedDate); // 선택 취소
    onClose?.();
  };

  const handleConfirm = () => {
    if (tempSelectedDate) {
      onDayPress?.({ dateString: tempSelectedDate });
    }
    onClose?.();
  };

  return (
    <View style={[styles.calendarContainer, style]}>
      <Calendar
        key={currentMonth}
        current={currentMonth}
        onDayPress={(day) => {
          setTempSelectedDate(day.dateString); // 임시 선택만 하고 팝업은 닫지 않음
        }}
        firstDay={1}
        markedDates={defaultMarkedDates}
        customHeader={customHeader || defaultHeader}
        dayComponent={dayComponent || (({ date, state, marking, onPress }) => (
          <DefaultDayCell
            date={date as DateData}
            state={state ?? ''}
            marking={marking}
            onPress={onPress}
            showToday={showToday}
            showHover={showHover}
            hoveredWeek={hoveredWeek}
            setHoveredWeek={setHoveredWeek}
            currentWeekStart={currentWeekStart}
          />
        ))}
        onMonthChange={(month) => {
          setCurrentMonth(month.dateString);
          onMonthChange?.(month);
        }}
        style={styles.calendar}
        minDate={minDate}
        maxDate={maxDate}
        theme={{
          arrowColor: 'transparent',
          selectedDayBackgroundColor: 'transparent',
          selectedDayTextColor: colors.white,
          todayTextColor: showToday ? colors.white : colors.black, // showToday에 따라 오늘 날짜 색상 변경
          todayBackgroundColor: showToday ? colors.primary : 'transparent', // showToday에 따라 오늘 날짜 배경 변경
          weekVerticalMargin: 2, 
        } as any}
      />
      {/* 하단 버튼 */}
      <View style={styles.buttonContainer}>
        <Pressable style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>취소</Text>
        </Pressable>
        <Pressable style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>확인</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendarContainer: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 8,
    minHeight: 40,
    marginBottom: 8,
  },
  headerText: {
    ...textStyles.body1,
    color: colors.black,
    fontWeight: typography.weight.bold,
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
    gap: 18,
    marginLeft: 'auto', // 오른쪽으로 이동
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
  todayCircle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F1FF',
    zIndex: 1,
  },
  dayTextToday: {
    color: colors.primary,
    fontWeight: '600',
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 12,
  },
  cancelButton: {
    flex: 1,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.gray200,
    borderWidth: 1,
    borderColor: colors.gray400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...textStyles.h8,
    color: colors.black,
  },
  confirmButton: {
    flex: 1,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.gray900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    ...textStyles.h8,
    color: colors.white,
  },
});

