import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, TextInput, ScrollView, Alert } from 'react-native';
import DateRangePicker from './DateRangePicker';
import dayjs from 'dayjs';

interface ItineraryFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (itinerary: any) => void;
  selectedDate?: string;
  selectedStartTime?: string;
  selectedEndTime?: string;
}

export default function ItineraryForm({ 
  visible, 
  onClose, 
  onSave, 
  selectedDate = dayjs().format('YYYY-MM-DD'),
  selectedStartTime = '09:00',
  selectedEndTime = '10:00'
}: ItineraryFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    country: '',
    city: '',
    location: '',
    date: selectedDate,
    startTime: selectedStartTime,
    endTime: selectedEndTime,
  });

  const handleSave = () => {
    if (!formData.title.trim()) {
      Alert.alert('오류', '제목을 입력해주세요.');
      return;
    }
    if (!formData.date) {
      Alert.alert('오류', '날짜를 선택해주세요.');
      return;
    }

    const itinerary = {
      id: Date.now().toString(),
      title: formData.title,
      content: formData.content,
      country: formData.country,
      city: formData.city,
      location: formData.location,
      itinerary_date: formData.date,
      start_time: formData.startTime,
      end_time: formData.endTime,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`, // 랜덤 색상
    };

    onSave(itinerary);
    setFormData({
      title: '',
      content: '',
      country: '',
      city: '',
      location: '',
      date: selectedDate,
      startTime: selectedStartTime,
      endTime: selectedEndTime,
    });
    onClose();
  };

  const handleCancel = () => {
    setFormData({
      title: '',
      content: '',
      country: '',
      city: '',
      location: '',
      date: selectedDate,
      startTime: selectedStartTime,
      endTime: selectedEndTime,
    });
    onClose();
  };

  const timeOptions = [
    '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
    '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
  ];

  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>일정 추가</Text>
          
          <ScrollView style={styles.formContainer}>
            {/* 제목 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>제목</Text>
              <TextInput
                style={styles.input}
                placeholder="일정 제목을 입력하세요"
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              />
            </View>

            {/* 내용 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>내용</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="일정 내용을 입력하세요"
                value={formData.content}
                onChangeText={(text) => setFormData(prev => ({ ...prev, content: text }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* 국가와 도시 */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>국가</Text>
                <TextInput
                  style={styles.input}
                  placeholder="국가"
                  value={formData.country}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, country: text }))}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>도시</Text>
                <TextInput
                  style={styles.input}
                  placeholder="도시"
                  value={formData.city}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
                />
              </View>
            </View>

            {/* 장소 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>장소</Text>
              <TextInput
                style={styles.input}
                placeholder="상세 장소를 입력하세요"
                value={formData.location}
                onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
              />
            </View>

            {/* 날짜 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>날짜</Text>
              <DateRangePicker
                startDate={formData.date}
                endDate={formData.date}
                onStartDateChange={(date) => setFormData(prev => ({ ...prev, date }))}
                onEndDateChange={(date) => setFormData(prev => ({ ...prev, date }))}
                style={styles.datePicker}
              />
            </View>

            {/* 시작 시간과 종료 시간 */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>시작 시간</Text>
                <Pressable 
                  style={styles.timeInput}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Text style={styles.timeText}>{formData.startTime}</Text>
                  <Text style={styles.arrow}>▼</Text>
                </Pressable>
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>종료 시간</Text>
                <Pressable 
                  style={styles.timeInput}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Text style={styles.timeText}>{formData.endTime}</Text>
                  <Text style={styles.arrow}>▼</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>

          {/* 버튼 */}
          <View style={styles.buttonContainer}>
            <Pressable 
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>닫기</Text>
            </Pressable>
            <Pressable 
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>저장</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* 시작 시간 선택 모달 */}
      <Modal
        visible={showStartTimePicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.timeModalOverlay}>
          <View style={styles.timeModalContent}>
            <Text style={styles.timeModalTitle}>시작 시간 선택</Text>
            <ScrollView style={styles.timeList}>
              {timeOptions.map((time) => (
                <Pressable
                  key={time}
                  style={[
                    styles.timeOption,
                    formData.startTime === time && styles.selectedTimeOption
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, startTime: time }));
                    setShowStartTimePicker(false);
                  }}
                >
                  <Text style={[
                    styles.timeOptionText,
                    formData.startTime === time && styles.selectedTimeOptionText
                  ]}>
                    {time}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable 
              style={styles.timeModalButton}
              onPress={() => setShowStartTimePicker(false)}
            >
              <Text style={styles.timeModalButtonText}>취소</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 종료 시간 선택 모달 */}
      <Modal
        visible={showEndTimePicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.timeModalOverlay}>
          <View style={styles.timeModalContent}>
            <Text style={styles.timeModalTitle}>종료 시간 선택</Text>
            <ScrollView style={styles.timeList}>
              {timeOptions.map((time) => (
                <Pressable
                  key={time}
                  style={[
                    styles.timeOption,
                    formData.endTime === time && styles.selectedTimeOption
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, endTime: time }));
                    setShowEndTimePicker(false);
                  }}
                >
                  <Text style={[
                    styles.timeOptionText,
                    formData.endTime === time && styles.selectedTimeOptionText
                  ]}>
                    {time}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable 
              style={styles.timeModalButton}
              onPress={() => setShowEndTimePicker(false)}
            >
              <Text style={styles.timeModalButtonText}>취소</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  datePicker: {
    marginBottom: 0,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  timeText: {
    fontSize: 16,
    color: '#212529',
  },
  arrow: {
    fontSize: 12,
    color: '#6c757d',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#6c757d',
  },
  cancelButtonText: {
    color: '#6c757d',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#212529',
  },
  saveButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  timeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '80%',
    maxWidth: 300,
    maxHeight: '60%',
  },
  timeModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  timeList: {
    maxHeight: 300,
  },
  timeOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  selectedTimeOption: {
    backgroundColor: '#007AFF',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#212529',
    textAlign: 'center',
  },
  selectedTimeOptionText: {
    color: 'white',
    fontWeight: '500',
  },
  timeModalButton: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  timeModalButtonText: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
}); 