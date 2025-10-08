import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';

interface DatePickerProps {
  value: string; // 'YYYY-MM-DD' 형식
  onChange: (date: string) => void;
  style?: any;
  placeholder?: string;
}

export default function DatePicker({ value, onChange, style, placeholder = "날짜를 선택하세요" }: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value || dayjs().format('YYYY-MM-DD'));

  const handleDateSelect = (dateString: string) => {
    setTempDate(dateString);
  };

  const handleConfirm = () => {
    onChange(tempDate);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setTempDate(value || dayjs().format('YYYY-MM-DD'));
    setShowPicker(false);
  };

  const getDisplayText = () => {
    if (!value) return placeholder;
    return dayjs(value).format('YYYY년 M월 D일');
  };

  const getMarkedDates = () => {
    if (!tempDate) return {};
    return {
      [tempDate]: {
        selected: true,
        selectedColor: '#007AFF',
      },
    };
  };

  return (
    <View style={style}>
      <Pressable style={styles.dateInput} onPress={() => setShowPicker(true)}>
        <Text style={value ? styles.dateText : styles.placeholderText}>
          {getDisplayText()}
        </Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </Pressable>

      <Modal visible={showPicker} animationType="slide" transparent={true} onRequestClose={handleCancel}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>날짜 선택</Text>
              <Text style={styles.selectionInfo}>
                {dayjs(tempDate).format('YYYY년 M월 D일')}
              </Text>
            </View>

            <View style={styles.calendarContainer}>
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
            </View>

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
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
  },
  dateText: {
    fontSize: 14,
    color: '#343a40',
  },
  placeholderText: {
    fontSize: 14,
    color: '#6c757d',
  },
  calendarIcon: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 8,
  },
  selectionInfo: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  calendarContainer: {
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#28a745',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});
