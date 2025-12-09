import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { CategoryPicker } from '@/ui/components/pickers';
import dayjs from 'dayjs';
import { expensesApi } from '@/services/expenses';
import { ExpenseCategory, ExpenseCurrency, currencyLabels } from '@/types/expense';
import { useDate } from '@/contexts/DateContext';
import BaseCalendar from '@/components/popup/calendar/BaseCalendar';
import Input from '@/ui/components/input/Input';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens/radii';
import WarningBanner from '@/ui/components/toast/warning';
import DownArrowIcon from '../../../assets/down_arrow.svg';
import XIcon from '../../../assets/x.svg';
import CalendarIcon from '../../../assets/calender.svg';

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  planId: number;
  planStartDate?: string; // plan의 시작 날짜
  onExpenseAdd?: (expense: any) => void;
}

export default function AddExpenseModal({ 
  visible, 
  onClose, 
  planId,
  planStartDate,
  onExpenseAdd 
}: AddExpenseModalProps) {
  const { selectedDate } = useDate();
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // 버튼 비활성화용 (리렌더링 필요)
  const isSubmittingRef = useRef(false); // 중복 요청 방지 플래그

  // 기본 날짜: plan 시작 날짜 > selectedDate > 오늘 날짜 순서로 우선순위
  const getDefaultDate = () => planStartDate || selectedDate || dayjs().format('YYYY-MM-DD');

  const [expenseForm, setExpenseForm] = useState({
    category: ExpenseCategory.ETC,
    amount: 0,
    description: '',
    ex_date: getDefaultDate(),
    currency: ExpenseCurrency.KRW,
  });

  // 모달이 열릴 때마다 기본 날짜 업데이트
  useEffect(() => {
    if (visible) {
      const defaultDate = planStartDate || selectedDate || dayjs().format('YYYY-MM-DD');
      setExpenseForm(prev => ({
        ...prev,
        ex_date: defaultDate,
      }));
    }
  }, [visible, planStartDate, selectedDate]);

  const handleExpenseSubmit = async () => {
    // 중복 요청 방지: 이미 실행 중이면 무시
    if (isSubmittingRef.current) {
      return;
    }

    if (!planId) {
      setWarningMessage('여행을 먼저 선택해주세요.');
      setShowWarning(true);
      return;
    }

    if (expenseForm.amount <= 0) {
      setWarningMessage('금액을 입력해주세요.');
      setShowWarning(true);
      return;
    }

    // 실행 중 플래그 설정
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const newExpense = await expensesApi.createExpense({
        planId: planId,
        category: expenseForm.category as any,
        amount: expenseForm.amount,
        description: expenseForm.description,
        exDate: expenseForm.ex_date,
        currency: expenseForm.currency as any,
      });
      Alert.alert('성공', '지출이 추가되었습니다.');
      setExpenseForm({
        category: ExpenseCategory.FOOD,
        amount: 0,
        description: '',
        ex_date: getDefaultDate(),
        currency: ExpenseCurrency.KRW,
      });
      onClose();
      onExpenseAdd?.(newExpense);
    } catch (error) {
      console.error('Failed to create expense:', error);
      Alert.alert('오류', '지출 추가에 실패했습니다.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setExpenseForm({
      category: ExpenseCategory.ETC,
      amount: 0,
      description: '',
      ex_date: getDefaultDate(),
      currency: ExpenseCurrency.KRW,
    });
    onClose();
  };


  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <WarningBanner
            message={warningMessage}
            visible={showWarning}
            duration={3000}
            onHide={() => {
              setShowWarning(false);
              setWarningMessage('');
            }}
          />
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            <View style={styles.modalHeader}>
              <View style={styles.titleContainer}>
                <Text style={styles.modalTitle}>지출 추가</Text>
                <Text style={styles.modalDescription}>
                  이 여행에 대한 지출을 수동으로 추가합니다.
                </Text>
              </View>
              <Pressable
                style={styles.closeButton}
                onPress={handleClose}
              >
                <XIcon width={24} height={24} />
              </Pressable>
            </View>
            
            <View style={styles.formSection}>
              <View style={[styles.inputGroup, styles.pickerWrapper, { zIndex: categoryOpen ? 10000 : 1 }]}>
                <Text style={styles.inputLabel}>카테고리</Text>
                <CategoryPicker
                  value={expenseForm.category}
                  onChange={(cat) => setExpenseForm({ ...expenseForm, category: cat })}
                  onOpen={() => setCategoryOpen(true)}
                  onClose={() => setCategoryOpen(false)}
                  containerStyle={styles.categoryPicker}
                />
              </View>

              <View style={styles.amountCurrencyRow}>
                <View style={[styles.inputGroup, styles.amountGroup]}>
                  <Text style={styles.inputLabel}>금액</Text>
                  <Input
                    variant="outlined"
                    placeholder={PLACEHOLDERS.expense.amount}
                    placeholderTextColor={colors.gray700}
                    value={expenseForm.amount.toString()}
                    onChangeText={(text) => setExpenseForm({ ...expenseForm, amount: parseInt(text) || 0 })}
                    keyboardType="numeric"
                    style={styles.amountInput}
                  />
                </View>

                <View style={[styles.inputGroup, styles.currencyGroup]}>
                  <Text style={styles.inputLabel}>통화</Text>
                  <View style={styles.currencyDisplay}>
                    <Text style={styles.currencyText}>
                    {ExpenseCurrency.KRW} ({currencyLabels[ExpenseCurrency.KRW]})
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.inputGroup, styles.datePickerWrapper, { zIndex: showDatePicker ? 20000 : 1 }]}>
                <Text style={styles.inputLabel}>날짜</Text>
                <Pressable 
                  style={styles.dateInput} 
                  onPress={() => setShowDatePicker(!showDatePicker)}
                >
                  <View style={styles.dateTextContainer}>
                    <Text style={styles.dateText}>
                      {dayjs(expenseForm.ex_date).format('YYYY.MM.DD')}
                    </Text>
                    <View style={styles.iconWrapper}>
                      <CalendarIcon width={16} height={16} />
                    </View>
                  </View>
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>내용</Text>
                <Input
                  variant="outlined"
                  placeholder={PLACEHOLDERS.expense.descriptionForm}
                  placeholderTextColor={colors.gray700}
                  value={expenseForm.description}
                  onChangeText={(text) => setExpenseForm({ ...expenseForm, description: text })}
                  style={styles.descriptionInput}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleExpenseSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>저장</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
        {/* 달력을 모달 오버레이 레벨에서 렌더링하여 버튼 위에 표시하고 모달 밖으로 나가도 보이도록 함 */}
        {showDatePicker && (
          <View style={styles.calendarOverlay} pointerEvents="box-none">
            <BaseCalendar
              visible={showDatePicker}
              selectedDate={expenseForm.ex_date}
              onDayPress={(day) => {
                setExpenseForm({ ...expenseForm, ex_date: day.dateString });
                setShowDatePicker(false);
              }}
              onClose={() => setShowDatePicker(false)}
              style={styles.calendarPopup}
              hideButtons={true}
              autoCloseOnSelect={true}
            />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '90%',
    overflow: 'visible',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  titleContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  modalTitle: {
    ...textStyles.h5,
    color: colors.black,
  },
  modalDescription: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  closeButton: {
    padding: spacing.xs,
    marginTop: -spacing.xs,
    marginRight: -spacing.xs,
  },
  formSection: {
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  inputLabel: {
    ...textStyles.h7,
    color: colors.black,
  },
  pickerWrapper: {
    position: 'relative',
    overflow: 'visible',
    zIndex: 1,
  },
  datePickerWrapper: {
    position: 'relative',
    overflow: 'visible',
  },
  categoryPicker: {
    height: 48
  },
  amountCurrencyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  amountGroup: {
    flex: 1,
  },
  currencyGroup: {
    flex: 1,
  },
  amountInput: {
    backgroundColor: colors.white,
    height: 48,
  },
  currencyDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 48,
    backgroundColor: colors.white,
  },
  currencyText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 48,
    backgroundColor: colors.white,
  },
  dateTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateText: {
    ...textStyles.body4,
    color: colors.black,
  },
  iconWrapper: {
    marginTop: -2,
  },
  calendarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20001,
    elevation: 10,
    pointerEvents: 'box-none',
  },
  calendarPopup: {
    position: 'absolute',
    top: '68%',
    left: '48%',
    marginTop: -150,
    marginLeft: -138,
    zIndex: 20002,
    elevation: 11,
  },
  descriptionInput: {
    backgroundColor: colors.white,
    height: 48,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  cancelButton: {
    backgroundColor: colors.gray300,
  },
  cancelButtonText: {
    ...textStyles.h6,
    color: colors.black,
    fontWeight: typography.weight.semibold,
  },
  submitButton: {
    backgroundColor: colors.gray900,
  },
  submitButtonText: {
    ...textStyles.h6,
    color: colors.white,
    fontWeight: typography.weight.semibold,
  },
});

