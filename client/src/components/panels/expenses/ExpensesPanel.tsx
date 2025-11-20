import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView, Modal } from 'react-native';
import { CategoryPicker } from '@/ui/components/pickers';
import { List } from 'react-native-paper';
import dayjs from 'dayjs';
import { expensesApi } from '@/services/expenses';
import PanelLayout from '../PanelLayout';
import { ExpenseCategory, ExpenseCurrency, categoryLabels, currencyLabels } from '@/types/expense';
import { useDate } from '@/contexts/DateContext';
import DatePicker from '@/ui/components/pickers/DatePicker';
import Input from '@/ui/components/input/Input';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens/radii';
import RightArrowBlueIcon from '../../../../assets/right_arrow_blue.svg';
import PlusRadiusIcon from '../../../../assets/plus_radius.svg';

interface ExpensesPanelProps {
  planData?: {
    plan: any;
    expenses: any[];
    isLoading: boolean;
    error: string | null;
    refreshExpenses: () => Promise<void>;
    refreshItineraries?: () => Promise<void>;
    refreshFlights?: () => Promise<void>;
    refreshAccommodations?: () => Promise<void>;
  };
  onExpenseAdd?: (expense: any) => void;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  exDate: string;
  currency: string;
}


export default function ExpensesPanel({ planData, onExpenseAdd }: ExpensesPanelProps) {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  
  const { selectedDate, setSelectedDate } = useDate();

  const [expenseForm, setExpenseForm] = useState({
    category: ExpenseCategory.ETC,
    amount: 0,
    description: '',
    ex_date: selectedDate,
    currency: ExpenseCurrency.KRW,
  });

  const handleExpenseSubmit = async () => {
    if (!planData?.plan?.id) {
      Alert.alert('오류', '여행을 먼저 선택해주세요.');
      return;
    }

    if (expenseForm.amount <= 0) {
      Alert.alert('오류', '금액을 입력해주세요.');
      return;
    }

    try {
      const newExpense = await expensesApi.createExpense({
        planId: planData.plan.id,
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
        ex_date: dayjs().format('YYYY-MM-DD'),
        currency: ExpenseCurrency.KRW,
      });
      setShowExpenseForm(false);
      onExpenseAdd?.(newExpense);
    } catch (error) {
      console.error('Failed to create expense:', error);
      Alert.alert('오류', '지출 추가에 실패했습니다.');
    }
  };

  const handleExpenseDelete = async (expenseId: string) => {
    try {
      await expensesApi.deleteExpense(Number(expenseId));
      Alert.alert('성공', '지출이 삭제되었습니다.');
      
      // 모든 관련 데이터 새로고침
      await planData?.refreshExpenses();
      await planData?.refreshItineraries?.();
      await planData?.refreshFlights?.();
      await planData?.refreshAccommodations?.();
    } catch (error) {
      console.error('Failed to delete expense:', error);
      Alert.alert('오류', '지출 삭제에 실패했습니다.');
    }
  };

  const getTotalExpenses = () => {
    if (!planData?.expenses) return 0;
    return planData.expenses.reduce((total, expense) => total + (expense.amount as number), 0);
  };

  const getExpensesByCategory = () => {
    if (!planData?.expenses) return {};
    return planData.expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + (expense.amount as number);
      return acc;
    }, {} as Record<string, number>);
  };

  const getExpensesInCategory = (category: string) => {
    if (!planData?.expenses) return [];
    return planData.expenses.filter(expense => expense.category === category);
  };

  const handleCategoryClick = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
  };

  // 카테고리 순서 정의
  const categoryOrder = [
    ExpenseCategory.FOOD,
    ExpenseCategory.FLIGHT,
    ExpenseCategory.ACTIVITY,
    ExpenseCategory.ETC,
    ExpenseCategory.TRANSPORT,
    ExpenseCategory.ACCOMMODATION,
    ExpenseCategory.SHOPPING,
  ];

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') return `$${amount.toLocaleString()}`;
    if (currency === 'KRW') return `₩${amount.toLocaleString()}`;
    return `${amount.toLocaleString()} ${currency}`;
  };



  if (!planData?.plan) {
    return (
      <PanelLayout style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>여행을 선택해주세요</Text>
        </View>
      </PanelLayout>
    );
  }

  const totalExpenses = getTotalExpenses();
  const expensesByCategory = getExpensesByCategory();

  // 지출이 있는 카테고리만 필터링
  const categoriesWithExpenses = categoryOrder.filter(
    (category) => (expensesByCategory[category] || 0) > 0
  );

  // 카테고리 개수에 따른 카드 크기 계산
  // 총 지출 버튼과 같은 너비를 맞추기 위해 flex 사용
  const getCardStyle = (totalCategories: number) => {
    if (totalCategories === 1) {
      return { flex: 1, minWidth: '100%' };
    }
    if (totalCategories >= 2) {
      // gap을 포함해서 총 너비가 100%가 되도록: (100% - gap) / 2
      return { flex: 1, minWidth: '49%', maxWidth: '49%' };
    }
  };

  const cardStyle = getCardStyle(categoriesWithExpenses.length);

  // 선택된 카테고리의 지출 목록
  const selectedCategoryExpenses = selectedCategory 
    ? getExpensesInCategory(selectedCategory)
    : [];

  return (
    <PanelLayout style={{ flex: 1 }}>
      <View style={styles.scrollWrapper}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        {/* 헤더 섹션 */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Expense List</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => setShowExpenseForm(true)}
          >
            <Text style={styles.addButtonText}>지출 추가</Text>
            <PlusRadiusIcon width={16} height={16} />
          </Pressable>
        </View>

        {/* 총 지출 버튼 */}
        <Pressable style={styles.totalButton}>
          <Text style={styles.totalButtonLabel}>총 지출</Text>
          <View style={styles.totalButtonRight}>
            <Text style={styles.totalButtonAmount}>₩{totalExpenses.toLocaleString()}</Text>
            <RightArrowBlueIcon width={14} height={14} />
          </View>
        </Pressable>

        {/* 카테고리별 지출 카드 (동적 그리드) */}
        {categoriesWithExpenses.length > 0 && (
          <View style={styles.categoryGrid}>
            {categoriesWithExpenses.map((category) => {
              const amount = expensesByCategory[category] || 0;
              return (
                <Pressable
                  key={category}
                  style={[
                    styles.categoryCard,
                    cardStyle,
                    selectedCategory === category && styles.categoryCardSelected
                  ]}
                  onPress={() => handleCategoryClick(category)}
                >
                  <Text style={styles.categoryCardName}>
                    {categoryLabels[category]}
                  </Text>
                  <Text style={styles.categoryCardAmount}>
                    ₩{amount.toLocaleString()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* 선택된 카테고리의 지출 리스트 (카드 형태) */}
        {selectedCategory && selectedCategoryExpenses.length > 0 && (
          <View style={styles.expenseListSection}>
            <Text style={styles.expenseListTitle}>
              {categoryLabels[selectedCategory as ExpenseCategory]} 상세
            </Text>
            <View style={styles.expenseList}>
              {selectedCategoryExpenses.map((expense: Expense) => (
                <View key={expense.id} style={styles.expenseCard}>
                  <View style={styles.expenseCardContent}>
                    <View style={styles.expenseCardHeader}>
                      <Text style={styles.expenseCardDescription}>
                        {expense.description || '내용 없음'}
                      </Text>
                      <Pressable
                        style={styles.deleteExpenseButton}
                        onPress={() => handleExpenseDelete(expense.id)}
                      >
                        <Text style={styles.deleteIcon}>🗑️</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.expenseCardDate}>
                      {dayjs(expense.exDate).format('YYYY.MM.DD')}
                    </Text>
                    <Text style={styles.expenseCardAmount}>
                      {formatCurrency(expense.amount, expense.currency)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
        </ScrollView>
      </View>

      {/* 지출 추가 모달 */}
      <Modal
        visible={showExpenseForm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowExpenseForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>지출 추가</Text>
              <Pressable
                style={styles.closeButton}
                onPress={() => setShowExpenseForm(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </Pressable>
            </View>
            
            <Text style={styles.modalDescription}>
              이 여행에 대한 지출을 수동으로 추가합니다.
            </Text>
            
            <Text style={styles.inputLabel}>카테고리</Text>
            <CategoryPicker
              value={expenseForm.category}
              onChange={(cat) => setExpenseForm({ ...expenseForm, category: cat })}
            />

            <Text style={styles.inputLabel}>금액</Text>
            <Input
              placeholder={PLACEHOLDERS.expense.amount}
              value={expenseForm.amount.toString()}
              onChangeText={(text) => setExpenseForm({ ...expenseForm, amount: parseInt(text) || 0 })}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>통화</Text>
            <View style={styles.currencyDisplay}>
              <Text style={styles.currencyText}>
                {currencyLabels[expenseForm.currency]} ({expenseForm.currency})
              </Text>
            </View>


            <Text style={styles.inputLabel}>날짜</Text>
            <DatePicker
              value={expenseForm.ex_date}
              onChange={(date: string) => setExpenseForm({ ...expenseForm, ex_date: date })}
            />

            <Text style={styles.inputLabel}>내용</Text>
            <Input  
              placeholder={PLACEHOLDERS.expense.description}
              value={expenseForm.description}
              onChangeText={(text) => setExpenseForm({ ...expenseForm, description: text })}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowExpenseForm(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleExpenseSubmit}
              >
                <Text style={styles.submitButtonText}>저장</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </PanelLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollWrapper: {
    flex: 1,
    minHeight: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // 헤더 섹션
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...textStyles.poppinsH4,
    fontSize: 16,
  },
  // 추가 버튼
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 38,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    height: 32,
    width: 96,
  },
  addButtonText: {
    ...textStyles.body6,
    color: colors.black,
    fontWeight: typography.weight.semibold,
  },
  // 총 지출 버튼
  totalButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 102, 255, 0.12)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    minHeight: 48,
  },
  totalButtonLabel: {
    ...textStyles.body4,
    color: colors.primary,
    fontWeight: typography.weight.semibold,
  },
  totalButtonRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  totalButtonAmount: {
    ...textStyles.body4,
    color: colors.black,
    fontWeight: typography.weight.semibold,
  },
  // 카테고리 그리드
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.md,
    rowGap: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  // 카테고리 카드
  categoryCard: {
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 46,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 1,
  },
  categoryCardSelected: {
    backgroundColor: colors.gray300,
  },
  categoryCardName: {
    ...textStyles.body6,
    color: colors.black,
  },
  categoryCardAmount: {
    ...textStyles.body6,
    color: colors.black,
  },
  // 지출 리스트 섹션
  expenseListSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  expenseListTitle: {
    ...textStyles.h6,
    marginBottom: spacing.md,
  },
  expenseList: {
    gap: spacing.sm,
  },
  // 지출 카드
  expenseCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray300,
    padding: spacing.md,
  },
  expenseCardContent: {
    gap: spacing.xs,
  },
  expenseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expenseCardDescription: {
    ...textStyles.body4,
    color: colors.black,
    flex: 1,
  },
  expenseCardDate: {
    ...textStyles.body6,
    color: colors.gray600,
  },
  expenseCardAmount: {
    ...textStyles.h7,
    color: colors.black,
    marginTop: spacing.xs,
  },
  deleteExpenseButton: {
    padding: 4,
  },
  deleteIcon: {
    fontSize: 16,
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  // 드롭다운 스타일
  dropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  // 통화 표시
  currencyDisplay: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f5f5f5',
    marginBottom: 16,
  },
  currencyText: {
    fontSize: 16,
    color: '#666',
  },
  // 입력 필드
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  // 모달 버튼
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 8,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#000',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
