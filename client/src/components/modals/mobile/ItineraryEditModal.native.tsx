import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CloseIcon from '../../../../assets/x.svg';
import dayjs from 'dayjs';
import { Itinerary, CreateItineraryRequest } from '@/types/api';
import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import { textStyles } from '@/ui/tokens/typography';
import FullScreenModal from '@/ui/components/FullScreenModal.native';
import { TimePicker, CountryPicker } from '@/ui/components/pickers';
import Input from '@/ui/components/input/Input';
import { itinerariesApi } from '@/services/itineraries';
import BaseCalendar from '@/components/popup/calendar/BaseCalendar';
import CalendarIcon from '../../../../assets/mobile_calendar_black.svg';
import AccomodationIcon from '../../../../assets/mobile_accomodation.svg';
import FlightIcon from '../../../../assets/airplane.svg';

interface ItineraryEditModalProps {
  visible: boolean;
  onClose: () => void;
  itinerary: Itinerary | null;
  planId: number;
  onSave?: (itinerary: Itinerary) => void;
  onDelete?: (itineraryId: number) => void;
}

export default function ItineraryEditModal({
  visible,
  onClose,
  itinerary,
  planId,
  onSave,
  onDelete,
}: ItineraryEditModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    country: '',
    city: '',
    location: '',
    itineraryDate: dayjs().format('YYYY-MM-DD'),
    startTime: '09:00',
    endTime: '10:00',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible && itinerary) {
      setFormData({
        title: itinerary.title || '',
        description: itinerary.description || '',
        country: itinerary.country || '',
        city: itinerary.city || '',
        location: itinerary.location || '',
        itineraryDate: itinerary.itineraryDate || dayjs().format('YYYY-MM-DD'),
        startTime: itinerary.startTime ? itinerary.startTime.substring(0, 5) : '09:00',
        endTime: itinerary.endTime ? itinerary.endTime.substring(0, 5) : '10:00',
      });
    } else if (visible && !itinerary) {
      // 새 일정 추가 모드
      setFormData({
        title: '',
        description: '',
        country: '',
        city: '',
        location: '',
        itineraryDate: dayjs().format('YYYY-MM-DD'),
        startTime: '09:00',
        endTime: '10:00',
      });
    }
  }, [visible, itinerary]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('알림', '일정 제목을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (itinerary) {
        // 수정
        const updated = await itinerariesApi.updateItinerary(itinerary.id, {
          ...formData,
          planId,
        });
        if (onSave) {
          onSave(updated);
        }
        Alert.alert('수정완료', '일정이 수정되었습니다.');
      } else {
        // 추가
        const created = await itinerariesApi.createItinerary({
          ...formData,
          planId,
        });
        if (onSave) {
          onSave(created);
        }
        Alert.alert('추가완료', '일정이 추가되었습니다.');
      }
      onClose();
    } catch (error) {
      Alert.alert('오류', '일정 저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!itinerary) return;
    
    Alert.alert(
      '일정 삭제',
      '이 일정을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await itinerariesApi.deleteItinerary(itinerary.id);
              if (onDelete) {
                onDelete(itinerary.id);
              }
              Alert.alert('삭제완료', '일정이 삭제되었습니다.');
              onClose();
            } catch (error) {
              Alert.alert('오류', '일정 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format('YYYY.MM.DD');
  };

  const formatTimeDisplay = (timeStr: string) => {
    const [hour, minute] = timeStr.split(':');
    const hourNum = parseInt(hour);
    const period = hourNum < 12 ? '오전' : '오후';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${period} ${displayHour.toString().padStart(2, '0')}:${minute}`;
  };

  return (
    <FullScreenModal
      visible={visible}
      onClose={onClose}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {itinerary ? '일정 수정' : '일정 추가'}
        </Text>
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
          <CloseIcon width={24} height={24} />
        </Pressable>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 카테고리 탭 (고정 표시) */}
        <View style={styles.categoryTabs}>
          <View style={styles.categoryTab}>
            <AccomodationIcon width={16} height={16} color={colors.gray600} />
            <Text style={styles.categoryTabText}>숙소</Text>
          </View>
          <View style={styles.categoryTab}>
            <FlightIcon width={16} height={16} color={colors.gray600} />
            <Text style={styles.categoryTabText}>항공</Text>
          </View>
          <View style={[styles.categoryTab, styles.categoryTabActive]}>
            <CalendarIcon width={16} height={16} color={colors.primary} />
            <Text style={[styles.categoryTabText, styles.categoryTabTextActive]}>일정</Text>
          </View>
        </View>

        {/* 입력 필드들 */}
        <View style={styles.form}>
          {/* 일정명 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              일정 제목<Text style={styles.required}>*</Text>
            </Text>
            <Input
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              style={styles.input}
            />
          </View>

          {/* 내용 (메모) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>내용 (메모)</Text>
            <TextInput
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              style={styles.textArea}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* 국가, 도시 */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>국가</Text>
              <CountryPicker
                value={formData.country}
                onChange={(country) => setFormData({ ...formData, country })}
                containerStyle={styles.pickerContainer}
                style={styles.pickerInput}
                dropDownContainerStyle={styles.pickerDropDownContainer}
                listItemLabelStyle={styles.pickerListItemLabel}
                selectedItemContainerStyle={styles.selectedItemContainerStyle}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>도시</Text>
              <Input
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
                style={styles.input}
              />
            </View>
          </View>

          {/* 장소 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>장소 (주소)</Text>
            <Input
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              style={styles.input}
            />
          </View>

          <View style={[styles.inputGroup, styles.halfWidth, { gap: 8 }]}>
              <Text style={[styles.label, {marginBottom: 0}]}>
                날짜 및 시간<Text style={styles.required}>*</Text>
              </Text>
              <Pressable
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={formData.itineraryDate ? styles.dateText : styles.placeholderText}>
                  {formData.itineraryDate ? formatDate(formData.itineraryDate) : '날짜 선택'}
                </Text>
                <CalendarIcon width={16} height={16} color={colors.black} />
              </Pressable>
              {showDatePicker && (
                <BaseCalendar
                  visible={true}
                  selectedDate={formData.itineraryDate}
                  onDayPress={(day) => {
                    setFormData({ ...formData, itineraryDate: day.dateString });
                    setShowDatePicker(false);
                  }}
                  onClose={() => setShowDatePicker(false)}
                  style={styles.calendarPopup}
                />
              )}
            <View style={styles.row}>
                <View style={[styles.halfWidth]}>
                <TimePicker
                    value={formData.startTime}
                    onChange={(time) => setFormData({ ...formData, startTime: time })}
                    containerStyle={styles.pickerContainer}
                    style={styles.pickerInput}
                    dropDownContainerStyle={styles.pickerDropDownContainer}
                    listItemLabelStyle={styles.pickerListItemLabel}
                    selectedItemContainerStyle={styles.selectedItemContainerStyle}
                />
                </View>
                <View style={[styles.halfWidth]}>
                    <TimePicker
                    value={formData.endTime}
                    onChange={(time) => setFormData({ ...formData, endTime: time })}
                    minTime={formData.startTime}
                    containerStyle={styles.pickerContainer}
                    style={styles.pickerInput}
                    dropDownContainerStyle={styles.pickerDropDownContainer}
                    listItemLabelStyle={styles.pickerListItemLabel}
                    selectedItemContainerStyle={styles.selectedItemContainerStyle}
                    />
                </View>
            </View>
         </View>


        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.footerButtons}>
          {itinerary && (
            <Pressable
              style={[styles.footerButton, styles.deleteButton]}
              onPress={handleDelete}
            >
              <Text style={styles.deleteButtonText}>삭제</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.footerButton, styles.saveButton, itinerary && styles.saveButtonWithDelete]}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            <Text style={styles.saveButtonText}>
              {itinerary ? '수정 완료' : '추가 완료'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    ...textStyles.h4,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 330,
  },
  categoryTabs: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: colors.gray200,
    borderRadius: 12,
    padding: 4,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 12,
  },
  categoryTabActive: {
    backgroundColor: colors.white,
  },
  categoryTabText: {
    ...textStyles.h6,
    color: colors.gray600,
  },
  categoryTabTextActive: {
    ...textStyles.h6,
    color: colors.primary,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    // marginBottom: 4,
  },
  label: {
    ...textStyles.h7,
    marginBottom: 8,
  },
  required: {
    color: colors.warning,
  },
  input: {
    minHeight: 44,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    backgroundColor: colors.gray100,
  },
  textArea: {
    ...textStyles.body4,
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.gray100,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  halfWidth: {
    flex: 1,
  },
  pickerContainer: {
    zIndex: 1,
  },
  pickerInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    backgroundColor: colors.gray100,
  },
  pickerDropDownContainer: {
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    backgroundColor: colors.gray100,
  },
  pickerListItemLabel: {
    ...textStyles.body4,
    color: colors.gray500,
    backgroundColor: colors.gray100,
  },
  selectedItemContainerStyle: {
    backgroundColor: colors.gray100,
  },
  dateInput: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    backgroundColor: colors.gray100,
  },
  dateText: {
    ...textStyles.body3,
  },
  placeholderText: {
    ...textStyles.body3,
    color: colors.gray400,
  },
  calendarPopup: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  footer: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: colors.warning,
  },
  deleteButtonText: {
    ...textStyles.h6,
    color: colors.white,
  },
  saveButton: {
    backgroundColor: colors.black,
  },
  saveButtonWithDelete: {
    flex: 1,
  },
  saveButtonText: {
    ...textStyles.h6,
    color: colors.white,
  },
});
