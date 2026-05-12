import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import dayjs from 'dayjs';
import { expensesApi } from '@/services/expenses';
import { ExpenseCategory, ExpenseCurrency, categoryLabels } from '@/types/expense';
import { Expense } from '@/types/api';
import BottomSheetModal from '@/ui/components/BottomSheetModal.native';
import FloatingFooter from '@/ui/components/FloatingFooter.native';
import CalendarModal from '@/ui/components/CalendarModal.native';
import Input from '@/ui/components/input/Input';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import CloseIcon from '../../../../assets/mobile_close.svg';
import CalendarIcon from '../../../../assets/mobile_calendar_black.svg';
import FoodIcon from '../../../../assets/mobile_food.svg';
import CarIcon from '../../../../assets/mobile_car.svg';
import TicketIcon from '../../../../assets/mobile_ticket.svg';
import BedIcon from '../../../../assets/mobile_bed.svg';
import FlightIcon from '../../../../assets/mobile_flight.svg';
import ShoppingIcon from '../../../../assets/mobile_shopping.svg';

interface AddExpenseModalProps {
  visible: boolean;
  onClose?: (opts?: { fromSave?: boolean }) => void;
  planId: number;
  planStartDate?: string;
  planEndDate?: string;
  defaultExDate?: string;
  onExpenseAdd?: (expense: Expense) => void;
}

const normalizeAmount = (value: unknown) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return raw.replace(/[^0-9]/g, '');
};

export default function AddExpenseModal({
  visible,
  onClose,
  planId,
  planStartDate,
  planEndDate,
  defaultExDate,
  onExpenseAdd,
}: AddExpenseModalProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const CATEGORY_ROW1: ExpenseCategory[] = [
    ExpenseCategory.FOOD,
    ExpenseCategory.TRANSPORT,
    ExpenseCategory.ACTIVITY,
  ];
  const CATEGORY_ROW2: ExpenseCategory[] = [
    ExpenseCategory.ACCOMMODATION,
    ExpenseCategory.FLIGHT,
    ExpenseCategory.SHOPPING,
    ExpenseCategory.ETC,
  ];

  const getCategoryIcon = (category: ExpenseCategory, isSelected: boolean) => {
    const size = 20;
    const color = isSelected ? colors.white : colors.gray600;
    switch (category) {
      case ExpenseCategory.FOOD:
        return <FoodIcon width={size} height={size} color={color} />;
      case ExpenseCategory.TRANSPORT:
        return <CarIcon width={size} height={size} color={color} />;
      case ExpenseCategory.ACTIVITY:
        return <TicketIcon width={size} height={size} color={color} />;
      case ExpenseCategory.ETC:
        return null;
      case ExpenseCategory.ACCOMMODATION:
        return <BedIcon width={size} height={size} color={color} />;
      case ExpenseCategory.FLIGHT:
        return <FlightIcon width={size} height={size} color={color} />;
      case ExpenseCategory.SHOPPING:
        return <ShoppingIcon width={size} height={size} color={color} />;
      default:
        return <TicketIcon width={size} height={size} color={color} />;
    }
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const getDefaultDate = () =>
    defaultExDate || planStartDate || dayjs().format('YYYY-MM-DD');

  const [formData, setFormData] = useState({
    category: ExpenseCategory.FOOD,
    amount: '',
    description: '',
    ex_date: getDefaultDate(),
  });

  useEffect(() => {
    if (visible) {
      const date = defaultExDate || planStartDate || dayjs().format('YYYY-MM-DD');
      setFormData((prev) => ({
        ...prev,
        ex_date: date,
      }));
    }
  }, [visible, defaultExDate, planStartDate]);

  const handleAmountChange = (text: string) => {
    const digits = normalizeAmount(text);
    const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    setFormData((prev) => ({ ...prev, amount: formatted }));
  };

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;

    if (!planId) {
      Alert.alert('알림', '여행을 먼저 선택해주세요.');
      return;
    }

    const amountNum = parseInt(normalizeAmount(formData.amount), 10) || 0;
    if (amountNum <= 0) {
      Alert.alert('알림', '금액을 입력해주세요.');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const newExpense = await expensesApi.createExpense({
        planId,
        category: formData.category,
        amount: amountNum,
        description: formData.description.trim() || undefined,
        exDate: formData.ex_date,
        currency: ExpenseCurrency.KRW,
      });
      Alert.alert('성공', '비용이 추가되었습니다.');
      setFormData({
        category: ExpenseCategory.FOOD,
        amount: '',
        description: '',
        ex_date: getDefaultDate(),
      });
      onClose?.({ fromSave: true });
      onExpenseAdd?.(newExpense);
    } catch {
      Alert.alert('알림', '비용 추가에 실패했습니다.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      category: ExpenseCategory.FOOD,
      amount: '',
      description: '',
      ex_date: getDefaultDate(),
    });
    onClose?.();
  };

  return (
    <BottomSheetModal visible={visible} onClose={handleClose} height={0.85}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>비용 추가</Text>
        <Pressable style={styles.closeButton} onPress={handleClose} hitSlop={8}>
          <CloseIcon width={20} height={20} color={colors.gray700} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputGroup}>
          <Text style={styles.label}>카테고리 설정</Text>
          <View style={styles.categoryRow}>
            {CATEGORY_ROW1.map((cat) => {
              const isSelected = formData.category === cat;
              return (
                <Pressable
                  key={cat}
                  style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                  onPress={() => setFormData((prev) => ({ ...prev, category: cat }))}
                >
                  {getCategoryIcon(cat, isSelected)}
                  <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextSelected]}>
                    {categoryLabels[cat as keyof typeof categoryLabels]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.categoryRow, styles.categoryRowSecond]}>
            {CATEGORY_ROW2.map((cat) => {
              const isSelected = formData.category === cat;
              return (
                <Pressable
                  key={cat}
                  style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                  onPress={() => setFormData((prev) => ({ ...prev, category: cat }))}
                >
                  {getCategoryIcon(cat, isSelected)}
                  <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextSelected]}>
                    {categoryLabels[cat as keyof typeof categoryLabels]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>지출 금액</Text>
          <View style={styles.amountInputWrapper}>
            <Input
              value={formData.amount}
              onChangeText={handleAmountChange}
              placeholder="0"
              placeholderTextColor={colors.gray500}
              keyboardType="number-pad"
              variant="filled"
              containerStyle={styles.amountInputContainer}
              style={styles.amountInputStyle}
            />
            <Text style={styles.amountSuffix}>원</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>내역 메모</Text>
          <Input
            value={formData.description}
            onChangeText={(text) =>
              setFormData((prev) => ({ ...prev, description: text }))
            }
            placeholder="어디에 사용하셨나요?"
            placeholderTextColor={colors.gray500}
            variant="filled"
            style={styles.modalInputStyle}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>일자</Text>
          <Pressable
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {dayjs(formData.ex_date).format('YYYY.MM.DD')}
            </Text>
            <CalendarIcon width={20} height={20} color={colors.gray600} />
          </Pressable>
          <CalendarModal
            visible={showDatePicker}
            selectedDate={formData.ex_date}
            onDayPress={(day) => {
              setFormData((prev) => ({ ...prev, ex_date: day.dateString }));
              setShowDatePicker(false);
            }}
            onClose={() => setShowDatePicker(false)}
            minDate={planStartDate}
            maxDate={planEndDate}
          />
        </View>
      </ScrollView>

      <FloatingFooter
        primaryLabel="저장"
        onPrimaryPress={handleSubmit}
        primaryDisabled={isSubmitting}
        secondaryLabel="취소"
        onSecondaryPress={handleClose}
      />
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerTitle: {
    ...textStyles.h4,
    color: colors.black,
  },
  closeButton: {
    padding: 4,
    backgroundColor: colors.gray200,
    borderRadius: 16,
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 23,
    paddingBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    ...textStyles.h7,
    color: colors.black,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryRowSecond: {
    marginTop: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.gray200,
  },
  categoryPillSelected: {
    backgroundColor: colors.primary,
  },
  categoryPillText: {
    ...textStyles.h7,
    color: colors.gray600,
  },
  categoryPillTextSelected: {
    color: colors.white,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: colors.gray200,
  },
  amountInputContainer: {
    flex: 1,
  },
  amountInputStyle: {
    flex: 1,
    height: 48,
    textAlign: 'right',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 14,
    color: colors.black,
  },
  amountSuffix: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 14,
    color: colors.black,
    marginLeft: 4,
  },
  modalInputStyle: {
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: colors.gray200,
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 14,
    color: colors.black,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: colors.gray200,
  },
  dateText: {
    ...textStyles.body3,
    color: colors.black,
  },
});
