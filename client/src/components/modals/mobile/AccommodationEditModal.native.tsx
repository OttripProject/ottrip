import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import dayjs from 'dayjs';
import { Accommodation } from '@/types/api';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import FullScreenModal from '@/ui/components/FullScreenModal.native';
import FloatingFooter from '@/ui/components/FloatingFooter.native';
import { TimePicker, CountryPicker } from '@/ui/components/pickers';
import Input from '@/ui/components/input/Input';
import { accommodationsApi } from '@/services/accommodations';
import BaseCalendar from '@/components/popup/calendar/BaseCalendar';
import { ExpenseCurrency, currencyLabels } from '@/types/expense';
import CloseIcon from '../../../../assets/x.svg';
import CalendarIcon from '../../../../assets/mobile_calendar_black.svg';

interface AccommodationEditModalProps {
  visible: boolean;
  onClose: () => void;
  accommodation: Accommodation | null;
  planId: number;
  defaultDate?: string;
  embedded?: boolean;
  onSave?: (accommodation: Accommodation) => void;
  onDelete?: (accommodationId: number) => void;
}

const formatDate = (dateStr: string) => {
  return dayjs(dateStr).format('YYYY.MM.DD');
};

const normalizeAmount = (value: unknown) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return raw.replace(/[^0-9]/g, '');
};

export default function AccommodationEditModal({
  visible,
  onClose,
  accommodation,
  planId,
  defaultDate,
  embedded,
  onSave,
  onDelete,
}: AccommodationEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    country: '',
    city: '',
    place: '',
    checkinDate: dayjs().format('YYYY-MM-DD'),
    checkoutDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
    checkinTime: '15:00',
    checkoutTime: '11:00',
  });
  const [expenseAmount, setExpenseAmount] = useState('');
  const [showCheckinDatePicker, setShowCheckinDatePicker] = useState(false);
  const [showCheckoutDatePicker, setShowCheckoutDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible && accommodation) {
      setFormData({
        name: accommodation.name || '',
        description: accommodation.description || '',
        country: accommodation.country || '',
        city: accommodation.city || '',
        place: accommodation.place || '',
        checkinDate: accommodation.checkinDate || dayjs().format('YYYY-MM-DD'),
        checkoutDate: accommodation.checkoutDate || dayjs().add(1, 'day').format('YYYY-MM-DD'),
        checkinTime: accommodation.checkinTime ? accommodation.checkinTime.substring(0, 5) : '15:00',
        checkoutTime: accommodation.checkoutTime ? accommodation.checkoutTime.substring(0, 5) : '11:00',
      });
      const amountNum = Math.floor(Number(accommodation.expense?.amount) || 0);
      setExpenseAmount(
        amountNum
          ? String(amountNum).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
          : ''
      );
    } else if (visible && !accommodation) {
      const initDate = defaultDate || dayjs().format('YYYY-MM-DD');
      setFormData((prev) => ({
        ...prev,
        checkinDate: initDate,
        checkoutDate: dayjs(initDate).add(1, 'day').format('YYYY-MM-DD'),
      }));
    }
  }, [visible, accommodation, defaultDate]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('알림', '숙소명을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const amount = parseInt(normalizeAmount(expenseAmount), 10) || 0;
      if (accommodation) {
        const updated = await accommodationsApi.updateAccommodation(accommodation.id, {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        country: formData.country?.trim() || undefined,
        city: formData.city?.trim() || undefined,
        place: formData.place?.trim() || undefined,
        checkinDate: formData.checkinDate,
        checkoutDate: formData.checkoutDate,
        checkinTime: `${formData.checkinTime}:00`,
        checkoutTime: `${formData.checkoutTime}:00`,
        expense: {
          exDate: formData.checkinDate,
          amount,
          category: 'accommodation' as any,
          currency: ExpenseCurrency.KRW,
          description: formData.name.trim(),
        },
      });
        if (onSave) onSave(updated);
        Alert.alert('수정완료', '숙소가 수정되었습니다.');
      } else {
        const created = await accommodationsApi.createAccommodation({
          planId,
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          country: formData.country?.trim() || undefined,
          city: formData.city?.trim() || undefined,
          place: formData.place?.trim() || undefined,
          checkinDate: formData.checkinDate,
          checkoutDate: formData.checkoutDate,
          checkinTime: `${formData.checkinTime}:00`,
          checkoutTime: `${formData.checkoutTime}:00`,
          expense: {
            exDate: formData.checkinDate,
            amount,
            category: 'accommodation' as any,
            currency: ExpenseCurrency.KRW,
            description: formData.name.trim(),
          },
        });
        if (onSave) onSave(created);
        Alert.alert('추가완료', '숙소가 추가되었습니다.');
      }
      onClose();
    } catch (error) {
      Alert.alert('오류', accommodation ? '숙소 수정에 실패했습니다.' : '숙소 추가에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!accommodation) return;

    Alert.alert(
      '숙소 삭제',
      '이 숙소를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await accommodationsApi.deleteAccommodation(accommodation.id);
              if (onDelete) onDelete(accommodation.id);
              Alert.alert('삭제완료', '숙소가 삭제되었습니다.');
              onClose();
            } catch (error) {
              Alert.alert('오류', '숙소 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    setExpenseAmount(formatted);
  };

  const content = (
    <>
      {!embedded && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{accommodation ? '숙소 수정' : '숙소 추가'}</Text>
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
            <CloseIcon width={24} height={24} />
          </Pressable>
        </View>
      )}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 입력 필드들 */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              숙소명<Text style={styles.required}>*</Text>
            </Text>
            <Input
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              style={[styles.input, !accommodation && styles.inputBorderless]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>내용 (메모)</Text>
            <TextInput
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              style={[styles.textArea, !accommodation && styles.textAreaBorderless]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>국가</Text>
              <CountryPicker
                value={formData.country}
                onChange={(country) => setFormData({ ...formData, country })}
                containerStyle={styles.pickerContainer}
                style={StyleSheet.flatten([styles.pickerInput, !accommodation && styles.pickerInputBorderless])}
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
                style={[styles.input, !accommodation && styles.inputBorderless]}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>장소 (주소)</Text>
            <Input
              value={formData.place}
              onChangeText={(text) => setFormData({ ...formData, place: text })}
              style={[styles.input, !accommodation && styles.inputBorderless]}
            />
          </View>

          {/* 체크인/체크아웃 */}
          <View style={styles.checkinoutSection}>
            <Text style={styles.checkinoutSectionTitle}>체크인 / 체크아웃</Text>
            <View style={styles.checkinoutRow}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.checkinoutLabel}>체크인 날짜</Text>
                <Pressable
                  style={[styles.dateInput, !accommodation && styles.dateInputBorderless]}
                  onPress={() => setShowCheckinDatePicker(true)}
                >
                  <Text style={styles.dateText}>{formatDate(formData.checkinDate)}</Text>
                  <CalendarIcon width={16} height={16} color={colors.black} />
                </Pressable>
                {showCheckinDatePicker && (
                  <BaseCalendar
                    visible={true}
                    selectedDate={formData.checkinDate}
                    onDayPress={(day) => {
                      setFormData({ ...formData, checkinDate: day.dateString });
                      setShowCheckinDatePicker(false);
                    }}
                    onClose={() => setShowCheckinDatePicker(false)}
                    style={styles.calendarPopup}
                  />
                )}
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.checkinoutLabel}>시간</Text>
                <TimePicker
                  value={formData.checkinTime}
                  onChange={(time) => setFormData({ ...formData, checkinTime: time })}
                  containerStyle={styles.pickerContainer}
                  style={StyleSheet.flatten([styles.pickerInput, !accommodation && styles.pickerInputBorderless, styles.timeInput])}
                  dropDownContainerStyle={styles.pickerDropDownContainer}
                  listItemLabelStyle={styles.pickerListItemLabel}
                  selectedItemContainerStyle={styles.selectedItemContainerStyle}
                />
              </View>
            </View>
            <View style={styles.checkinoutRow}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.checkinoutLabel}>체크아웃 날짜</Text>
                <Pressable
                  style={[styles.dateInput, !accommodation && styles.dateInputBorderless]}
                  onPress={() => setShowCheckoutDatePicker(true)}
                >
                  <Text style={styles.dateText}>{formatDate(formData.checkoutDate)}</Text>
                  <CalendarIcon width={16} height={16} color={colors.black} />
                </Pressable>
                {showCheckoutDatePicker && (
                  <BaseCalendar
                    visible={true}
                    selectedDate={formData.checkoutDate}
                    onDayPress={(day) => {
                      setFormData({ ...formData, checkoutDate: day.dateString });
                      setShowCheckoutDatePicker(false);
                    }}
                    onClose={() => setShowCheckoutDatePicker(false)}
                    style={styles.calendarPopup}
                  />
                )}
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.checkinoutLabel}>시간</Text>
                <TimePicker
                  value={formData.checkoutTime}
                  onChange={(time) => setFormData({ ...formData, checkoutTime: time })}
                  containerStyle={styles.pickerContainer}
                  style={StyleSheet.flatten([styles.pickerInput, !accommodation && styles.pickerInputBorderless, styles.timeInput])}
                  dropDownContainerStyle={styles.pickerDropDownContainer}
                  listItemLabelStyle={styles.pickerListItemLabel}
                  selectedItemContainerStyle={styles.selectedItemContainerStyle}
                />
              </View>
            </View>
          </View>

          {/* 숙박 비용 */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>숙박 비용</Text>
              <TextInput
                value={expenseAmount}
                onChangeText={handleAmountChange}
                style={[styles.input, !accommodation && styles.inputBorderless]}
                placeholder="0"
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.inputGroup, styles.currencyWrap]}>
              <Text style={styles.label}>통화</Text>
              <View style={[styles.currencyDisplay, !accommodation && styles.currencyDisplayBorderless]}>
                <Text style={styles.currencyText}>{currencyLabels[ExpenseCurrency.KRW]}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <FloatingFooter
        primaryLabel={accommodation ? '수정 완료' : '일정 저장'}
        onPrimaryPress={handleSave}
        primaryDisabled={isSubmitting}
        secondaryLabel={accommodation && !embedded ? '삭제' : undefined}
        onSecondaryPress={handleDelete}
      />
    </>
  );

  if (embedded) {
    return <View style={{ flex: 1 }}>{content}</View>;
  }

  return (
    <FullScreenModal visible={visible} onClose={onClose}>
      {content}
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
    paddingBottom: 240,
  },
  form: {
    gap: 20,
  },
  inputGroup: {},
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
    backgroundColor: colors.gray200,
  },
  inputBorderless: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  textArea: {
    ...textStyles.body4,
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.gray200,
  },
  textAreaBorderless: {
    borderWidth: 0,
    borderColor: 'transparent',
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
    backgroundColor: colors.gray200,
  },
  timeInput: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  pickerInputBorderless: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  pickerDropDownContainer: {
    borderRadius: 12,
    backgroundColor: colors.gray200,
  },
  pickerListItemLabel: {
    ...textStyles.body4,
    color: colors.gray500,
    backgroundColor: colors.gray200,
  },
  selectedItemContainerStyle: {
    backgroundColor: colors.gray200,
  },
  checkinoutSection: {
    backgroundColor: `${colors.primary}1A`,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  checkinoutSectionTitle: {
    ...textStyles.h6,
    color: colors.primary,
    marginBottom: 16,
  },
  checkinoutRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  checkinoutLabel: {
    ...textStyles.h8,
    color: colors.gray700,
    marginBottom: 8,
  },
  dateInput: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  dateInputBorderless: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  dateText: {
    ...textStyles.body3,
  },
  calendarPopup: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  currencyWrap: {
    flex: 0.3,
  },
  currencyDisplay: {
    minHeight: 44,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
  },
  currencyDisplayBorderless: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  currencyText: {
    ...textStyles.body4,
  },
});
