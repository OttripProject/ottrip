import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';
import { colors } from '@/ui/tokens/colors';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  style?: any;
}

export default function DateRangePicker({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange, 
  style 
}: DateRangePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [selectionMode, setSelectionMode] = useState<'start' | 'end'>('start');

  const handleDateSelect = (date: string) => {
    if (selectionMode === 'start') {
      setTempStartDate(date);
      if (dayjs(date).isAfter(dayjs(tempEndDate))) {
        setTempEndDate(date);
      }
      setSelectionMode('end');
    } else {
      if (dayjs(date).isBefore(dayjs(tempStartDate))) {
        setTempStartDate(date);
        setTempEndDate(tempStartDate);
      } else {
        setTempEndDate(date);
      }
      setSelectionMode('start');
    }
  };

  const handleConfirm = () => {
    onStartDateChange(tempStartDate);
    onEndDateChange(tempEndDate);
    setShowCalendar(false);
    setSelectionMode('start');
  };

  const handleCancel = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setShowCalendar(false);
    setSelectionMode('start');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return dayjs(dateString).format('YYYY-MM-DD');
  };

  const getMarkedDates = () => {
    const marked: any = {};
    if (tempStartDate) {
      marked[tempStartDate] = { selected: true, startingDay: true, color: '#007AFF', textColor: 'white' };
    }
    if (tempEndDate && tempEndDate !== tempStartDate) {
      marked[tempEndDate] = { selected: true, endingDay: true, color: '#007AFF', textColor: 'white' };
    }
    if (tempStartDate && tempEndDate && tempStartDate !== tempEndDate) {
      const start = dayjs(tempStartDate);
      const end = dayjs(tempEndDate);
      let current = start.add(1, 'day');
      while (current.isBefore(end)) {
        const dateStr = current.format('YYYY-MM-DD');
        marked[dateStr] = { selected: true, color: '#007AFF', textColor: 'white' };
        current = current.add(1, 'day');
      }
    }
    return marked;
  };

  const getDisplayText = () => {
    if (startDate && endDate) {
      const start = formatDate(startDate);
      const end = formatDate(endDate);
      if (!start || !end) return '날짜 범위 선택';
      if (start === end) return start;
      return `${start} - ${end}`;
    }
    return '날짜 범위 선택';
  };

  return (
    <View style={style}>
      <Pressable style={styles.dateInput} onPress={() => setShowCalendar(true)}>
        <Text style={startDate ? styles.dateText : styles.placeholderText}>{getDisplayText()}</Text>
      </Pressable>

      <Modal visible={showCalendar} animationType="slide" transparent={true} onRequestClose={handleCancel}>
        <View style={styles.modalOverlay}>
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>날짜 범위 선택</Text>
              <Pressable style={styles.closeButton} onPress={handleCancel}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>
            <Calendar
              onDayPress={(day) => handleDateSelect(day.dateString)}
              markedDates={getMarkedDates()}
              theme={{
                selectedDayBackgroundColor: '#007AFF',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#007AFF',
                dayTextColor: '#2d4150',
                textDisabledColor: '#d9e1e8',
                arrowColor: '#007AFF',
                monthTextColor: '#2d4150',
                indicatorColor: '#007AFF',
                textDayFontWeight: '300',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '300',
                textDayFontSize: 16,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 13,
              }}
            />
            <View style={styles.buttonContainer}>
              <Pressable style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.confirmButton]} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>확인</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  dateInput: { borderWidth: 1, borderColor: '#dee2e6', borderRadius: 8, padding: 12, backgroundColor: 'white' },
  dateText: { fontSize: 16, color: '#212529' },
  placeholderText: { fontSize: 16, color: '#6c757d' },
  modalOverlay: { flex: 1, backgroundColor: colors.overlayBackground, justifyContent: 'center', alignItems: 'center' },
  calendarContainer: { backgroundColor: 'white', borderRadius: 12, padding: 20, width: '90%', maxWidth: 400 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calendarTitle: { fontSize: 18, fontWeight: '600', color: '#212529' },
  closeButton: { padding: 4 },
  closeButtonText: { fontSize: 24, color: '#6c757d', fontWeight: 'bold' },
  selectionInfo: { marginBottom: 16, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 8 },
  selectionText: { fontSize: 14, fontWeight: '500', color: '#495057', marginBottom: 4 },
  dateInfo: { fontSize: 12, color: '#6c757d' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  button: { flex: 1, padding: 12, borderRadius: 8, marginHorizontal: 4 },
  cancelButton: { backgroundColor: '#6c757d' },
  cancelButtonText: { color: 'white', textAlign: 'center', fontSize: 16, fontWeight: '500' },
  confirmButton: { backgroundColor: '#007AFF' },
  confirmButtonText: { color: 'white', textAlign: 'center', fontSize: 16, fontWeight: '500' },
});



