import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  TextInput,
  Platform,
  ScrollView,
  Keyboard,
  KeyboardEvent,
} from 'react-native';
import dayjs from 'dayjs';
import { Plan, CreatePlanRequest, UpdatePlanRequest } from '@/types/api';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { radii } from '@/ui/tokens/radii';
import { spacing } from '@/ui/tokens/spacing';
import BottomSheetModal from '@/ui/components/BottomSheetModal.native';
import CalendarModal from '@/ui/components/CalendarModal.native';
import CloseIcon from '../../../../assets/mobile_close.svg';
import CalendarIcon from '../../../../assets/mobile_calendar_black.svg';

interface AddPlanModalProps {
  visible: boolean;
  onClose: () => void;
  onPlanCreated: (plan: Plan) => void;
  addPlan: (data: CreatePlanRequest) => Promise<Plan>;
  planToEdit?: Plan | null;
  updatePlan?: (planId: number, planData: UpdatePlanRequest) => Promise<Plan>;
}

export default function AddPlanModal({
  visible,
  onClose,
  onPlanCreated,
  addPlan,
  planToEdit,
  updatePlan,
}: AddPlanModalProps) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [calendarTarget, setCalendarTarget] = useState<'start' | 'end' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** BottomSheet 안에서 키보드가 입력란을 가릴 때(특히 Android): 스크롤 여유 */
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);

  useEffect(() => {
    const showEv = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEv = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      setKeyboardBottomInset(e.endCoordinates.height);
    };
    const onHide = () => setKeyboardBottomInset(0);

    const s = Keyboard.addListener(showEv as any, onShow);
    const h = Keyboard.addListener(hideEv as any, onHide);

    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      if (planToEdit) {
        setTitle(planToEdit.title || '');
        setStartDate(planToEdit.startDate || '');
        setEndDate(planToEdit.endDate || '');
      } else {
        setTitle('');
        setStartDate('');
        setEndDate('');
      }
      setCalendarTarget(null);
    }
  }, [visible, planToEdit]);

  const formatDateDisplay = (dateStr: string) =>
    dateStr ? dayjs(dateStr).format('YYYY.MM.DD') : '';

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('알림', '여행 제목을 입력해주세요.');
      return;
    }
    if (!startDate) {
      Alert.alert('알림', '시작일을 선택해주세요.');
      return;
    }
    if (!endDate) {
      Alert.alert('알림', '종료일을 선택해주세요.');
      return;
    }
    if (dayjs(endDate).isBefore(dayjs(startDate))) {
      Alert.alert('알림', '종료일은 시작일 이후여야 합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (planToEdit && updatePlan) {
        const updatedPlan = await updatePlan(planToEdit.id, {
          title: trimmedTitle,
          startDate,
          endDate,
        });
        onPlanCreated(updatedPlan);
      } else {
        const newPlan = await addPlan({
          title: trimmedTitle,
          startDate,
          endDate,
        });
        onPlanCreated(newPlan);
      }
      // onClose는 호출하지 않음 - onPlanCreated에서 부모가 모달 닫기 처리
    } catch (error) {
      Alert.alert('알림', planToEdit ? '여행 수정에 실패했습니다.' : '여행 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = !title.trim() || !startDate || !endDate || isSubmitting;

  return (
    <>
      <BottomSheetModal
        visible={visible}
        onClose={onClose}
        height={0.5}
      >
        <View style={styles.contentWrapper}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Platform.OS === 'android' ? 16 + keyboardBottomInset : 32 },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
            {...(Platform.OS === 'ios'
              ? { automaticallyAdjustKeyboardInsets: true }
              : {})}
          >
            {/* 헤더 */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{planToEdit ? '여행 수정' : '새로운 여행 만들기'}</Text>
              <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
                <CloseIcon width={20} height={20} color={colors.gray700} />
              </Pressable>
            </View>

            {/* 여행 제목 */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>여행 제목</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 스페인 일주 여행"
                placeholderTextColor={colors.gray500}
                value={title}
                onChangeText={setTitle}
                maxLength={50}
              />
            </View>

            {/* 시작일 / 종료일 */}
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.inputLabel}>시작일</Text>
                <Pressable
                  style={styles.dateInput}
                  onPress={() => setCalendarTarget('start')}
                >
                  <Text style={startDate ? styles.dateText : styles.datePlaceholder}>
                    {startDate ? formatDateDisplay(startDate) : '연도.월.일'}
                  </Text>
                  <CalendarIcon width={20} height={20} color={colors.black} />
                </Pressable>
              </View>
              <View style={styles.dateField}>
                <Text style={styles.inputLabel}>종료일</Text>
                <Pressable
                  style={styles.dateInput}
                  onPress={() => setCalendarTarget('end')}
                >
                  <Text style={endDate ? styles.dateText : styles.datePlaceholder}>
                    {endDate ? formatDateDisplay(endDate) : '연도.월.일'}
                  </Text>
                  <CalendarIcon width={20} height={20} color={colors.black} />
                </Pressable>
              </View>
            </View>

            {/* 여행 생성하기 / 수정 */}
            <Pressable
              style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitDisabled}
            >
              <Text style={[styles.submitButtonText, isSubmitDisabled && styles.submitButtonTextDisabled]}>
                {planToEdit ? '수정' : '여행 생성하기'}
              </Text>
            </Pressable>
          </ScrollView>

          {/* 날짜 선택 캘린더 */}
          <CalendarModal
            visible={!!calendarTarget}
            selectedDate={
              calendarTarget === 'start'
                ? startDate || dayjs().format('YYYY-MM-DD')
                : endDate || startDate || dayjs().format('YYYY-MM-DD')
            }
            onDayPress={(day) => {
              const d = day.dateString;
              if (calendarTarget === 'start') {
                setStartDate(d);
                if (endDate && dayjs(d).isAfter(dayjs(endDate))) setEndDate(d);
              } else {
                setEndDate(d);
                if (startDate && dayjs(d).isBefore(dayjs(startDate))) setStartDate(d);
              }
              setCalendarTarget(null);
            }}
            onClose={() => setCalendarTarget(null)}
            minDate={calendarTarget === 'end' && startDate ? startDate : undefined}
            maxDate={calendarTarget === 'start' && endDate ? endDate : undefined}
          />
        </View>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    ...textStyles.h4,
  },
  closeButton: {
    width: 32,
    height: 32,
    backgroundColor: colors.gray200,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    ...textStyles.h7,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: colors.black,
    backgroundColor: colors.gray100,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  dateField: {
    flex: 1,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: colors.gray100,
  },
  dateText: {
    ...textStyles.body3,
    color: colors.black,
  },
  datePlaceholder: {
    ...textStyles.body3,
    color: colors.gray500,
  },
  submitButton: {
    backgroundColor: colors.gray900,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -4,
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray300,
  },
  submitButtonText: {
    ...textStyles.h5,
    color: colors.white,
  },
  submitButtonTextDisabled: {
    color: colors.gray700,
  },
});
