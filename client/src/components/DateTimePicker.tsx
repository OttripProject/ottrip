import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';

interface DateTimePickerProps {
  value: string; // 'YYYY-MM-DD HH:mm' 형식
  onChange: (datetime: string) => void;
  style?: any;
  placeholder?: string;
}

export default function DateTimePicker({ value, onChange, style, placeholder = "날짜와 시간을 선택하세요" }: DateTimePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value ? value.split(' ')[0] : dayjs().format('YYYY-MM-DD'));
  const [tempTime, setTempTime] = useState(value ? value.split(' ')[1] : '00:00');
  const [showTimePicker, setShowTimePicker] = useState(false);

  const timeOptions = [
    '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
    '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
  ];

  const handleDateSelect = (dateString: string) => {
    setTempDate(dateString);
  };

  const handleTimeSelect = (time: string) => {
    setTempTime(time);
    setShowTimePicker(false);
  };

  const handleConfirm = () => {
    const datetime = `${tempDate} ${tempTime}`;
    onChange(datetime);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setTempDate(value ? value.split(' ')[0] : dayjs().format('YYYY-MM-DD'));
    setTempTime(value ? value.split(' ')[1] : '00:00');
    setShowPicker(false);
  };

  const getDisplayText = () => {
    if (!value) return placeholder;
    const [date, time] = value.split(' ');
    return `${dayjs(date).format('YYYY년 M월 D일')} ${time}`;
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
      <Pressable style={styles.dateTimeInput} onPress={() => setShowPicker(true)}>
        <Text style={value ? styles.dateTimeText : styles.placeholderText}>
          {getDisplayText()}
        </Text>
      </Pressable>

      <Modal visible={showPicker} animationType="slide" transparent={true} onRequestClose={handleCancel}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>날짜와 시간 선택</Text>
              <Text style={styles.selectionInfo}>
                {dayjs(tempDate).format('YYYY년 M월 D일')} {tempTime}
              </Text>
            </View>

            <View style={styles.pickerContainer}>
              <View style={styles.dateSection}>
                <Text style={styles.sectionTitle}>날짜 선택</Text>
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

              <View style={styles.timeSection}>
                <Text style={styles.sectionTitle}>시간 선택</Text>
                <Pressable 
                  style={styles.timeSelector}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.timeText}>{tempTime}</Text>
                  <Text style={styles.arrow}>▼</Text>
                </Pressable>
              </View>
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

      {/* 시간 선택 모달 */}
      <Modal visible={showTimePicker} transparent={true} animationType="slide">
        <View style={styles.timeModalOverlay}>
          <View style={styles.timeModalContent}>
            <Text style={styles.timeModalTitle}>시간 선택</Text>
            <ScrollView style={styles.timeList}>
              {timeOptions.map((time) => (
                <Pressable
                  key={time}
                  style={[
                    styles.timeOption,
                    tempTime === time && styles.selectedTimeOption
                  ]}
                  onPress={() => handleTimeSelect(time)}
                >
                  <Text style={[
                    styles.timeOptionText,
                    tempTime === time && styles.selectedTimeOptionText
                  ]}>
                    {time}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable 
              style={styles.timeModalButton}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.timeModalButtonText}>취소</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  dateTimeInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#343a40',
  },
  dateTimeText: {
    fontSize: 14,
    color: '#343a40',
  },
  placeholderText: {
    fontSize: 14,
    color: '#6c757d',
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
  pickerContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dateSection: {
    flex: 2,
    marginRight: 10,
  },
  timeSection: {
    flex: 1,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 10,
    textAlign: 'center',
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
  },
  timeText: {
    fontSize: 16,
    color: '#343a40',
    fontWeight: '500',
  },
  arrow: {
    fontSize: 16,
    color: '#6c757d',
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
  timeModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  timeModalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  timeModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 20,
  },
  timeList: {
    maxHeight: 200,
    width: '100%',
  },
  timeOption: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedTimeOption: {
    backgroundColor: '#e9ecef',
    borderRadius: 5,
  },
  timeOptionText: {
    fontSize: 16,
    color: '#343a40',
  },
  selectedTimeOptionText: {
    color: '#007bff',
    fontWeight: '600',
  },
  timeModalButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#6c757d',
    borderRadius: 6,
    alignItems: 'center',
  },
  timeModalButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
}); 