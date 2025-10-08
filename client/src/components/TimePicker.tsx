import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';

interface TimePickerProps {
  value: string; // 'HH:mm' 형식
  onChange: (time: string) => void;
  style?: any;
  placeholder?: string;
}

export default function TimePicker({ value, onChange, style, placeholder = "시간을 선택하세요" }: TimePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempTime, setTempTime] = useState(value || '09:00');

  // 15분 간격으로 시간 옵션 생성
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(timeString);
    }
  }

  const handleTimeSelect = (time: string) => {
    setTempTime(time);
    onChange(time);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setTempTime(value || '09:00');
    setShowPicker(false);
  };

  const getDisplayText = () => {
    if (!value) return placeholder;
    return value;
  };

  return (
    <View style={style}>
      <Pressable style={styles.timeInput} onPress={() => setShowPicker(true)}>
        <Text style={value ? styles.timeText : styles.placeholderText}>
          {getDisplayText()}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </Pressable>

      <Modal visible={showPicker} transparent={true} animationType="slide" onRequestClose={handleCancel}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>시간 선택</Text>
            <ScrollView style={styles.timeList} showsVerticalScrollIndicator={true}>
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
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  timeInput: {
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
  timeText: {
    fontSize: 14,
    color: '#343a40',
  },
  placeholderText: {
    fontSize: 14,
    color: '#6c757d',
  },
  arrow: {
    fontSize: 12,
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
    width: '80%',
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 15,
    textAlign: 'center',
  },
  timeList: {
    maxHeight: 300,
    width: '100%',
  },
  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedTimeOption: {
    backgroundColor: '#e3f2fd',
    borderRadius: 5,
  },
  timeOptionText: {
    fontSize: 16,
    color: '#343a40',
    textAlign: 'center',
  },
  selectedTimeOptionText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#6c757d',
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});
