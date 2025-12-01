import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import useDetectClose from '@/hooks/useDetectClose';
import { Calendar, DateData } from 'react-native-calendars';
import dayjs from 'dayjs';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { radii } from '@/ui/tokens/radii';
import LeftArrowIcon from '../../../../assets/cal_left_arrow.svg';
import RightArrowIcon from '../../../../assets/cal_right_arrow.svg';
import DropdownCalIcon from '../../../../assets/dropdown_cal.svg';
import DropupperCalIcon from '../../../../assets/dropupper_cal.svg';
import MonthCalendarPopup from '../MonthCalendarPopup';

export interface BaseCalendarProps {
  visible?: boolean;
  selectedDate?: string;
  onDayPress?: (day: { dateString: string }) => void;
  onClose?: () => void; 
  style?: any;
  minDate?: string;
  maxDate?: string;
  markedDates?: Record<string, any>;
  showToday?: boolean; 
  showHover?: boolean; 
  currentWeekStart?: string; 
  scrollToWeek?: boolean; 
  customHeader?: () => React.ReactNode;
  dayComponent?: (props: {
    date?: DateData;
    state?: string;
    marking?: any;
    onPress?: (date: DateData) => void;
  }) => React.ReactNode;
  onMonthChange?: (month: { dateString: string }) => void;
  hideButtons?: boolean; 
  autoCloseOnSelect?: boolean; 
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

  let isHoveredWeek = false;
  let isCurrentWeek = false;
  
  if (showHover || currentWeekStart) {
    const dateObj = dayjs(date.dateString);
    const dayOfWeek = dateObj.day() === 0 ? 6 : dateObj.day() - 1; 
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
      {(isHoveredWeek || isCurrentWeek) && (showHover || currentWeekStart) && (
        <View style={[styles.weekBackground, isCurrentWeek && styles.currentWeekBackground]} />
      )}
      {isToday && (
        <View style={styles.todayCircle} />
      )}
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
  hideButtons = false,
  autoCloseOnSelect = false,
}: BaseCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || dayjs().format('YYYY-MM-DD'));
  const [hoveredWeek, setHoveredWeek] = useState<string | null>(null);
  const [tempSelectedDate, setTempSelectedDate] = useState<string | undefined>(selectedDate);
  const [showMonthCalendar, setShowMonthCalendar] = useState(false);
  const [view, setView] = useState<'day' | 'month' | 'year'>('day'); 
  const [tempSelectedMonth, setTempSelectedMonth] = useState<number | null>(null); 
  const [tempSelectedYear, setTempSelectedYear] = useState<number | null>(null); 

  // 외부 클릭 감지
  const calendarRef = useRef<View>(null);
  const [isOpen, setIsOpen, handleOutsidePress] = useDetectClose(calendarRef, visible);

  // visible이 변경되면 isOpen도 업데이트
  useEffect(() => {
    if (visible !== isOpen) {
      setIsOpen(visible);
    }
  }, [visible]);

  // isOpen이 false가 되면 onClose 호출
  useEffect(() => {
    if (!isOpen && visible) {
      onClose?.();
    }
  }, [isOpen]);

  useEffect(() => {
    if (visible && scrollToWeek && currentWeekStart) {
      const weekStartDate = dayjs(currentWeekStart);
      setCurrentMonth(weekStartDate.format('YYYY-MM-DD'));
    } else if (visible && selectedDate) {
      setCurrentMonth(selectedDate);
    }
    if (visible) {
      setTempSelectedDate(selectedDate);
      setView('day'); 
      setTempSelectedMonth(null); 
      setTempSelectedYear(null); 
    }
  }, [visible, scrollToWeek, currentWeekStart, selectedDate]);

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

  const dayHeader = () => (
    <View>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerText}>{monthYearText}</Text>
          <Pressable 
            style={styles.dropdownButton}
            onPress={() => setView('month')}
          >
            <DropdownCalIcon width={14} height={14} />
          </Pressable>
        </View>
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

  const monthHeader = () => {
    const currentDate = dayjs(currentMonth);
    const monthYearText = `${currentDate.format('YYYY')}년 ${currentDate.format('M')}월`;
    return (
      <View style={[styles.header, { marginHorizontal: 5 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerText}>{monthYearText}</Text>
          <Pressable 
            style={styles.dropdownButton}
            onPress={() => setView('year')}
          >
            <DropdownCalIcon width={14} height={14} />
          </Pressable>
        </View>
        <View style={styles.arrowContainer}>
          <Pressable 
            style={styles.arrowButton}
            onPress={() => {
              const newDate = dayjs(currentMonth).subtract(1, 'year');
              setCurrentMonth(newDate.format('YYYY-MM-DD'));
            }}
          >
            <LeftArrowIcon width={18} height={18} />
          </Pressable>
          <Pressable 
            style={styles.arrowButton}
            onPress={() => {
              const newDate = dayjs(currentMonth).add(1, 'year');
              setCurrentMonth(newDate.format('YYYY-MM-DD'));
            }}
          >
            <RightArrowIcon width={18} height={18} />
          </Pressable>
        </View>
      </View>
    );
  };

  const yearHeader = () => {
    const currentDate = dayjs(currentMonth);
    const currentYear = currentDate.year();
    const monthYearText = `${currentYear}년 ${currentDate.format('M')}월`;
    return (
      <View style={[styles.header, { marginHorizontal: 5 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerText}>{monthYearText}</Text>
          <Pressable 
            style={styles.dropdownButton}
            onPress={() => setView('month')}
          >
            <DropupperCalIcon width={14} height={14} />
          </Pressable>
        </View>
        <View style={styles.arrowContainer}>
          <Pressable 
            style={styles.arrowButton}
            onPress={() => {
              const newDate = dayjs(currentMonth).subtract(10, 'year');
              setCurrentMonth(newDate.format('YYYY-MM-DD'));
            }}
          >
            <LeftArrowIcon width={18} height={18} />
          </Pressable>
          <Pressable 
            style={styles.arrowButton}
            onPress={() => {
              const newDate = dayjs(currentMonth).add(10, 'year');
              setCurrentMonth(newDate.format('YYYY-MM-DD'));
            }}
          >
            <RightArrowIcon width={18} height={18} />
          </Pressable>
        </View>
      </View>
    );
  };

  const handleCancel = () => {
    if (view === 'day') {
      setTempSelectedDate(selectedDate); 
      onClose?.();
    } else {
      if (view === 'month') {
        setView('day');
      } else if (view === 'year') {
        setView('month');
      }
    }
  };

  const handleConfirm = () => {
    if (view === 'day') {
      if (tempSelectedDate) {
        onDayPress?.({ dateString: tempSelectedDate });
      }
      onClose?.();
    } else if (view === 'month') {
      if (tempSelectedMonth !== null) {
        const currentYear = dayjs(currentMonth).year();
        const newDate = dayjs(`${currentYear}-${tempSelectedMonth + 1}-01`);
        setCurrentMonth(newDate.format('YYYY-MM-DD'));
        setView('day');
      }
    } else if (view === 'year') {
      if (tempSelectedYear !== null) {
        const currentDate = dayjs(currentMonth);
        const currentMonthIndex = currentDate.month(); 
        const newDate = dayjs(`${tempSelectedYear}-${currentMonthIndex + 1}-01`);
        setCurrentMonth(newDate.format('YYYY-MM-DD'));
        setView('month');
      }
    }
  };

  const renderMonthPicker = () => {
    const currentDate = dayjs(currentMonth);
    const currentYear = currentDate.year();
    const currentMonthIndex = currentDate.month(); 
    
    const selectedMonthIndex = tempSelectedMonth !== null ? tempSelectedMonth : currentMonthIndex;

    const handleMonthPress = (monthIndex: number) => {
      if (autoCloseOnSelect) {
        const newDate = dayjs(`${currentYear}-${monthIndex + 1}-01`);
        setCurrentMonth(newDate.format('YYYY-MM-DD'));
        setView('day');
      } else {
        setTempSelectedMonth(monthIndex);
      }
    };

    return (
      <View style={styles.pickerContent}>
        <View style={styles.monthPickerGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
            const monthIndex = month - 1;
            const isCurrentMonth = monthIndex === currentMonthIndex;
            const isSelected = monthIndex === selectedMonthIndex;

            return (
              <View key={month} style={styles.monthPickerItemWrapper}>
                <Pressable
                  style={[
                    styles.monthPickerItem,
                    isCurrentMonth && styles.monthPickerItemCurrent,
                    isSelected && styles.monthPickerItemSelected,
                  ]}
                  onPress={() => handleMonthPress(monthIndex)}
                >
                  <Text
                    style={[
                      styles.monthPickerItemText,
                      isCurrentMonth && !isSelected && styles.monthPickerItemTextCurrent,
                      isSelected && styles.monthPickerItemTextSelected,
                    ]}
                  >
                    {month}월
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderYearPicker = () => {
    const currentDate = dayjs(currentMonth);
    const currentYear = currentDate.year();
    
    const decadeStart = Math.floor(currentYear / 10) * 10; 
    const decadeEnd = decadeStart + 9; 
    
    const yearsToShow: Array<{ year: number; isDecade: boolean }> = [];
    
    yearsToShow.push({ year: decadeStart - 1, isDecade: false });
    
    for (let i = 0; i <= 9; i++) {
      yearsToShow.push({ year: decadeStart + i, isDecade: true });
    }
    
    yearsToShow.push({ year: decadeEnd + 1, isDecade: false });
    
    const selectedYear = tempSelectedYear !== null ? tempSelectedYear : currentYear;
    
    const handleYearPress = (year: number, isDecade: boolean) => {
      if (autoCloseOnSelect && isDecade) {
        const currentDate = dayjs(currentMonth);
        const currentMonthIndex = currentDate.month(); 
        const newDate = dayjs(`${year}-${currentMonthIndex + 1}-01`);
        setCurrentMonth(newDate.format('YYYY-MM-DD'));
        setView('month');
      } else if (isDecade) {
        setTempSelectedYear(year);
      } else {
        const currentDate = dayjs(currentMonth);
        const currentMonthIndex = currentDate.month(); 
        const newDate = dayjs(`${year}-${currentMonthIndex + 1}-01`);
        setCurrentMonth(newDate.format('YYYY-MM-DD'));
        setTempSelectedYear(year); 
      }
    };

    return (
      <View style={styles.pickerContent}>
        <View style={styles.yearPickerGrid}>
          {yearsToShow.map(({ year, isDecade }) => {
            const isCurrentYear = year === currentYear;
            const isSelected = year === selectedYear && isDecade;

            return (
              <View key={year} style={styles.yearPickerItemWrapper}>
                <Pressable
                  style={[
                    styles.yearPickerItem,
                    isCurrentYear && styles.yearPickerItemCurrent,
                    isSelected && styles.yearPickerItemSelected,
                  ]}
                  onPress={() => handleYearPress(year, isDecade)}
                >
                  <Text
                    style={[
                      styles.yearPickerItemText,
                      !isDecade && styles.yearPickerItemTextDisabled,
                      isCurrentYear && !isSelected && styles.yearPickerItemTextCurrent,
                      isSelected && styles.yearPickerItemTextSelected,
                    ]}
                  >
                    {year}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <>
      {/* 외부 클릭 감지를 위한 투명 오버레이 */}
      {visible && (
        <Pressable 
          style={[StyleSheet.absoluteFill, { zIndex: 8999 }]}
          onPress={handleOutsidePress}
        />
      )}
      <View 
        ref={calendarRef}
        style={[styles.calendarContainer, style]}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => e.stopPropagation()}
      >
      {view === 'day' ? (
        <>
          <Calendar
            key={currentMonth}
            current={currentMonth}
            onDayPress={(day) => {
              if (autoCloseOnSelect) {
                onDayPress?.({ dateString: day.dateString });
                onClose?.();
              } else {
                setTempSelectedDate(day.dateString);
              }
            }}
            firstDay={1}
            markedDates={defaultMarkedDates}
            customHeader={customHeader || dayHeader}
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
              todayTextColor: showToday ? colors.white : colors.black, 
              todayBackgroundColor: showToday ? colors.primary : 'transparent', 
              weekVerticalMargin: 2, 
            } as any}
          />
          {!hideButtons && (
            <View style={styles.buttonContainer}>
              <Pressable style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>확인</Text>
              </Pressable>
            </View>
          )}
        </>
      ) : view === 'month' ? (
        <>
          {monthHeader()}
          {renderMonthPicker()}
          {!hideButtons && (
            <View style={styles.buttonContainer}>
              <Pressable style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>확인</Text>
              </Pressable>
            </View>
          )}
        </>
      ) : (
        <>
          {yearHeader()}
          {renderYearPicker()}
          {!hideButtons && (
            <View style={styles.buttonContainer}>
              <Pressable style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>확인</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
      {showMonthCalendar && (
        <MonthCalendarPopup
          visible={showMonthCalendar}
          selectedDate={currentMonth}
          onDayPress={(day) => {
            setCurrentMonth(day.dateString);
            setShowMonthCalendar(false);
          }}
          onClose={() => setShowMonthCalendar(false)}
          currentWeekStart={currentWeekStart}
        />
      )}
    </View>
    </>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerText: {
    ...textStyles.body1,
    color: colors.black,
    fontWeight: typography.weight.bold,
  },
  dropdownButton: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginLeft: 'auto', 
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
  pickerContent: {
    flex: 1,
    minHeight: 200, 
    paddingHorizontal: 0,
    paddingTop: 4,
    paddingBottom: 4,
  },
  monthPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    rowGap: 8, 
    width: '100%',
    paddingHorizontal: 0,
    justifyContent: 'space-between',
  },
  monthPickerItemWrapper: {
    width: '32%', 
    height: 32,
  },
  monthPickerItem: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    borderRadius: 8,
  },
  monthPickerItemCurrent: {
    backgroundColor: '#E8F1FF', 
  },
  monthPickerItemSelected: {
    backgroundColor: colors.primary, 
  },
  monthPickerItemText: {
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.black,
  },
  monthPickerItemTextCurrent: {
    color: colors.primary, 
  },
  monthPickerItemTextSelected: {
    color: colors.white, 
  },
  yearPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    rowGap: 8, 
    width: '100%',
    paddingHorizontal: 0,
    justifyContent: 'space-between',
  },
  yearPickerItemWrapper: {
    width: '32%', 
    height: 32,
  },
  yearPickerItem: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    borderRadius: 8,
  },
  yearPickerItemCurrent: {
    backgroundColor: 'rgba(0, 102, 255, 0.08)', 
  },
  yearPickerItemSelected: {
    backgroundColor: colors.primary, 
  },
  yearPickerItemText: {
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.black,
  },
  yearPickerItemTextDisabled: {
    color: colors.gray600, 
  },
  yearPickerItemTextCurrent: {
    color: colors.primary, 
  },
  yearPickerItemTextSelected: {
    color: colors.white, 
  },
});

