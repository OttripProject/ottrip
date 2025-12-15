import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import dayjs from 'dayjs';
import { accommodationsApi } from '@/services/accommodations';
import { CountryPicker, TimePicker } from '@/ui/components/pickers';
import Input from '@/ui/components/input/Input';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens/radii';
import BaseCalendar from '@/components/popup/calendar/BaseCalendar';
import CalendarIcon from '../../../../assets/calender.svg';
import XIcon from '../../../../assets/x.svg';
import { ExpenseCurrency, currencyLabels } from '@/types/expense';
import WarningBanner from '@/ui/components/toast/warning';

interface AccommodationItemProps {
  accommodation?: any;
  draft?: any;
  planId: number;
  onSave: (accommodation: any) => void;
  onCancel: () => void;
  onDelete?: (accommodationId: number) => void;
  onShowWarning?: (message?: string) => void;
}

export default function AccommodationItem({ 
  accommodation, 
  draft,
  planId, 
  onSave, 
  onCancel, 
  onDelete,
}: AccommodationItemProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [formData, setFormData] = useState({
    name: accommodation?.name || '',
    place: accommodation?.place || '',
    country: accommodation?.country || '',
    city: accommodation?.city || '',
    checkin_date: (accommodation?.checkinDate) || draft?.checkinDate || dayjs().format('YYYY-MM-DD'),
    checkout_date: (accommodation?.checkoutDate) || draft?.checkoutDate || dayjs().add(1, 'day').format('YYYY-MM-DD'),
    checkin_time: (accommodation?.checkinTime) || draft?.checkinTime || '15:00',
    checkout_time: (accommodation?.checkoutTime) || draft?.checkoutTime || '11:00',
    description: accommodation?.description || '',
  });

  const [expenseData, setExpenseData] = useState({
    amount: accommodation?.expense?.amount || '',
    currency: accommodation?.expense?.currency || ExpenseCurrency.KRW,
  });

  const [isSubmitting, setIsSubmitting] = useState(false); // 버튼 비활성화용 (리렌더링 필요)
  const isSubmittingRef = useRef(false); // 중복 요청 방지 플래그
  const [showCheckinDatePicker, setShowCheckinDatePicker] = useState(false);
  const [showCheckoutDatePicker, setShowCheckoutDatePicker] = useState(false);
  const [checkinTimeOpen, setCheckinTimeOpen] = useState(false);
  const [checkoutTimeOpen, setCheckoutTimeOpen] = useState(false);

  // accommodation prop이 변경될 때 폼 데이터 동기화 (snake_case / camelCase 모두 지원)
  useEffect(() => {
    if (accommodation) {
      setFormData({
        name: accommodation.name || '',
        place: accommodation.place || '',
        country: accommodation.country || '',
        city: accommodation.city || '',
        checkin_date: (accommodation.checkinDate) || dayjs().format('YYYY-MM-DD'),
        checkout_date: (accommodation.checkoutDate) || dayjs().add(1, 'day').format('YYYY-MM-DD'),
        checkin_time: (accommodation.checkinTime || '15:00').substring(0,5),
        checkout_time: (accommodation.checkoutTime || '11:00').substring(0,5),
        description: accommodation.description || '',
      });
    }
  }, [accommodation]);

  // 국가 드롭다운 상태 및 옵션
  const [countryOpen, setCountryOpen] = useState(false); // zIndex 제어용 (CountrySelect 내부 오픈 상태와는 별개로 래퍼 zIndex 제어 가능)

  const handleSave = async () => {
    // 중복 요청 방지: 이미 실행 중이면 무시
    if (isSubmittingRef.current) {
      return;
    }

    // 모델 필수값 검증: name, checkin_date, checkout_date, checkin_time, checkout_time
    if (!formData.name.trim() || 
        !formData.checkin_date || !formData.checkout_date || !formData.checkin_time || !formData.checkout_time) {
      setWarningMessage('입력되지 않은 값이 있어요.');
      setShowWarning(true);
      return;
    }

    // 실행 중 플래그 설정
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      let savedAccommodation;
      if (accommodation && accommodation.id) {
        // 편집
        savedAccommodation = await accommodationsApi.updateAccommodation(accommodation.id, {
          name: formData.name,
          place: formData.place || undefined,
          country: formData.country?.trim() || undefined,
          city: formData.city?.trim() || undefined,
          checkinDate: formData.checkin_date,
          checkoutDate: formData.checkout_date,
          checkinTime: formData.checkin_time + ':00',
          checkoutTime: formData.checkout_time + ':00',
          description: formData.description || undefined,
          expense: {
            exDate: formData.checkin_date,
            amount: Number(expenseData.amount) || 0,
            category: 'accommodation' as any,
            currency: expenseData.currency as ExpenseCurrency,
            description: formData.name,
          },
        });
      } else {
        // 추가
        savedAccommodation = await accommodationsApi.createAccommodation({
          planId: planId,
          name: formData.name,
          place: formData.place || undefined,
          country: formData.country?.trim() || undefined,
          city: formData.city?.trim() || undefined,
          checkinDate: formData.checkin_date,
          checkoutDate: formData.checkout_date,
          checkinTime: formData.checkin_time + ':00',
          checkoutTime: formData.checkout_time + ':00',
          description: formData.description || undefined,
          expense: {
            exDate: formData.checkin_date,
            amount: Number(expenseData.amount) || 0,
            category: 'accommodation' as any,
            currency: expenseData.currency as ExpenseCurrency,
            description: formData.name,
          },
        });
      }
      onSave(savedAccommodation);
    } catch (error) {
      console.error('Failed to save accommodation:', error);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    // 숙박 추가 모드: 입력창 닫기
    if (!accommodation) {
      onCancel();
      return;
    }
    
    if (accommodation && accommodation.id && onDelete) {
      try {
        await accommodationsApi.deleteAccommodation(accommodation.id);
        onDelete(accommodation.id);
        onCancel();
      } catch (error) {
        console.error('Failed to delete accommodation:', error);
      }
    }
  };

  // 통화 옵션
  const currencyOptions = useMemo(() => [
    { label: 'KRW', value: ExpenseCurrency.KRW },
    { label: 'USD', value: ExpenseCurrency.USD },
    { label: 'EUR', value: ExpenseCurrency.EUR },
    { label: 'JPY', value: ExpenseCurrency.JPY },
  ], []);

  return (
    <ScrollView 
      style={[styles.container, { position: 'relative', overflow: 'visible' }]}
      contentContainerStyle={[styles.contentContainer, { overflow: 'visible' }]}
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>숙박 정보</Text>
        <Pressable
          onPress={onCancel}
          style={styles.closeButton}
        >
          <XIcon width={20} height={20} />
        </Pressable>
      </View>

      {/* 기본 정보 섹션 */}
      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>숙소명*</Text>
          <Input
            variant="filled"
            placeholder={PLACEHOLDERS.accommodation.name}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            style={styles.input}
            placeholderTextColor={colors.gray600}
          />
        </View>

        <View style={styles.inputGroup}>
        <Text style={styles.label}>내용</Text>
        <Input
            variant="filled"
            placeholder={PLACEHOLDERS.itinerary.descriptionForm}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
            style={styles.textArea}
            placeholderTextColor={colors.gray600}
        />
        </View>

        <View style={[styles.row, { gap: spacing.sm, zIndex: countryOpen ? 10000 : 1 }]}>
          <View style={[styles.inputGroup, styles.halfWidth, { zIndex: countryOpen ? 10000 : 1 }]}>
            <Text style={styles.label}>국가</Text>
            <CountryPicker
              value={formData.country}
              onChange={(name: string) => setFormData({ ...formData, country: name })}
              placeholder={PLACEHOLDERS.picker.country}
              onOpen={() => setCountryOpen(true)}
              onClose={() => setCountryOpen(false)}
            />
          </View>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>도시</Text>
            <Input
              variant="filled"
              placeholder={PLACEHOLDERS.accommodation.city}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
              style={styles.input}
              placeholderTextColor={colors.gray600}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>장소</Text>
          <Input
            variant="filled"
            placeholder={PLACEHOLDERS.accommodation.place}
            value={formData.place}
            onChangeText={(text) => setFormData({ ...formData, place: text })}
            style={styles.input}
            placeholderTextColor={colors.gray600}
          />
        </View>

        <View style={[styles.row, { gap: spacing.sm, zIndex: showCheckinDatePicker ? 30000 : checkinTimeOpen ? 20002 : 1 }]}>
          <View style={[styles.inputGroup, styles.halfWidth, { position: 'relative' }]}>
            <Text style={styles.label}>체크인 날짜</Text>
            <Pressable 
              style={styles.dateInput} 
              onPress={() => setShowCheckinDatePicker(true)}
            >
              <View style={styles.dateTextContainer}>
                <Text style={formData.checkin_date ? styles.dateText : styles.placeholderText}>
                  {formData.checkin_date ? dayjs(formData.checkin_date).format('YYYY.MM.DD') : '기타'}
                </Text>
                <View style={styles.iconWrapper}>
                  <CalendarIcon width={16} height={16} />
                </View>
              </View>
            </Pressable>
            {showCheckinDatePicker && (
              <BaseCalendar
                visible={true}
                selectedDate={formData.checkin_date}
                onDayPress={(day) => {
                  setFormData({ ...formData, checkin_date: day.dateString });
                  setShowCheckinDatePicker(false);
                }}
                onClose={() => setShowCheckinDatePicker(false)}
                style={styles.calendarPopup}
                minDate={dayjs().format('YYYY-MM-DD')}
                hideButtons={true}
                autoCloseOnSelect={true}
              />
            )}
          </View>
          <View style={[styles.inputGroup, styles.halfWidth, { position: 'relative' }]}>
            <Text style={styles.label}>체크인 시간</Text>
            <TimePicker
              value={formData.checkin_time}
              onChange={(time) => setFormData({ ...formData, checkin_time: time })}
              onOpen={() => {
                setCheckinTimeOpen(true);
                // 체크인 시간이 열릴 때 체크아웃 시간 닫기
                if (checkoutTimeOpen) {
                  setCheckoutTimeOpen(false);
                }
              }}
              onClose={() => setCheckinTimeOpen(false)}
              style={styles.timePicker}
            />
          </View>
        </View>

        <View style={[styles.row, { gap: spacing.sm, zIndex: showCheckoutDatePicker ? 30000 : checkoutTimeOpen ? 20001 : 1 }]}>
          <View style={[styles.inputGroup, styles.halfWidth, { position: 'relative' }]}>
            <Text style={styles.label}>체크아웃 날짜</Text>
            <Pressable 
              style={styles.dateInput} 
              onPress={() => setShowCheckoutDatePicker(true)}
            >
              <View style={styles.dateTextContainer}>
                <Text style={formData.checkout_date ? styles.dateText : styles.placeholderText}>
                  {formData.checkout_date ? dayjs(formData.checkout_date).format('YYYY.MM.DD') : '기타'}
                </Text>
                <View style={styles.iconWrapper}>
                  <CalendarIcon width={16} height={16} />
                </View>
              </View>
            </Pressable>
            {showCheckoutDatePicker && (
              <BaseCalendar
                visible={true}
                selectedDate={formData.checkout_date}
                onDayPress={(day) => {
                  setFormData({ ...formData, checkout_date: day.dateString });
                  setShowCheckoutDatePicker(false);
                }}
                onClose={() => setShowCheckoutDatePicker(false)}
                style={styles.calendarPopup}
                minDate={formData.checkin_date}
                hideButtons={true}
                autoCloseOnSelect={true}
              />
            )}
          </View>
          <View style={[styles.inputGroup, styles.halfWidth, { position: 'relative' }]}>
            <Text style={styles.label}>체크아웃 시간</Text>
            <TimePicker
              value={formData.checkout_time}
              onChange={(time) => setFormData({ ...formData, checkout_time: time })}
              onOpen={() => {
                setCheckoutTimeOpen(true);
                // 체크아웃 시간이 열릴 때 체크인 시간 닫기
                if (checkinTimeOpen) {
                  setCheckinTimeOpen(false);
                }
              }}
              onClose={() => setCheckoutTimeOpen(false)}
              style={styles.timePicker}
            />
          </View>
        </View>

        <View style={[styles.row, { gap: spacing.sm }]}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>숙박료</Text>
            <Input
              variant="filled"
              placeholder={PLACEHOLDERS.expense.amount}
              value={expenseData.amount.toString()}
              onChangeText={(text) => setExpenseData({ ...expenseData, amount: text.replace(/[^0-9]/g, '') })}
              keyboardType="numeric"
              style={styles.input}
              placeholderTextColor={colors.gray600}
            />
          </View>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>통화</Text>
            <View style={styles.currencyDisplay}>
                    <Text style={styles.currencyText}>
                    {currencyLabels[ExpenseCurrency.KRW]}
                    </Text>
            </View>
          </View>
        </View>
              {/* 하단 버튼 */}
      <View style={[styles.buttonRow, { position: 'relative', zIndex: -1 }]}>
        <Pressable
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Text style={styles.deleteButtonText}>삭제</Text>
        </Pressable>
        <Pressable
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          <Text style={styles.saveButtonText}>
            {accommodation && accommodation.id ? '수정' : '저장'}
          </Text>
        </Pressable>
      </View>
      <WarningBanner
        message={warningMessage}
        visible={showWarning}
        duration={3000}
        bottomOffset={70}
        onHide={() => {
          setShowWarning(false);
          setWarningMessage('');
        }}
      />
      </View>



    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  contentContainer: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...textStyles.h5,
  },
  closeButton: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSection: {
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    overflow: 'visible',
    position: 'relative',
  },
  inputGroup: {
    gap: spacing.sm,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    ...textStyles.h8,
    color: colors.black,
  },
  input: {
    backgroundColor: colors.gray200,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...textStyles.body4,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.gray200,
    minHeight: 40,
  },
  dateTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  dateText: {
    ...textStyles.body4,
    color: colors.black,
  },
  placeholderText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  iconWrapper: {
    marginTop: 0,
  },
  calendarPopup: {
    position: 'absolute',
    top: 70,
    left: 0,
    zIndex: 30000,
  },
  timePicker: {
    borderWidth: 0,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    height: 40,
  },
  currencyDisplay: {
    backgroundColor: colors.gray200,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  currencyText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  deleteButton: {
    backgroundColor: colors.gray300,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  deleteButtonText: {
    ...textStyles.h8,
    color: colors.black,
  },
  saveButton: {
    backgroundColor: colors.gray900,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  saveButtonText: {
    ...textStyles.h8,
    color: colors.white,
  },
  textArea: {
    backgroundColor: colors.gray200,
    height: 80,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...textStyles.body4,
  },
});
