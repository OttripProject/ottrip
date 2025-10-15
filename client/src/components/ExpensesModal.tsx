import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Alert, ScrollView, Modal } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { List } from 'react-native-paper';
import dayjs from 'dayjs';
import { expensesApi } from '@/services/expenses';
import ModalLayout from './ModalLayout';
import { ExpenseCategory, ExpenseCurrency, categoryLabels, currencyLabels } from '@/types/expense';
import { useDate } from '@/contexts/DateContext';
import DatePicker from '@/components/DatePicker';

interface ExpensesModalProps {
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


export default function ExpensesModal({ planData, onExpenseAdd }: ExpensesModalProps) {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
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

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') return `$${amount.toLocaleString()}`;
    if (currency === 'KRW') return `₩${amount.toLocaleString()}`;
    return `${amount.toLocaleString()} ${currency}`;
  };



  if (!planData?.plan) {
    return (
      <ModalLayout style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>여행을 선택해주세요</Text>
        </View>
      </ModalLayout>
    );
  }

  const totalExpenses = getTotalExpenses();
  const expensesByCategory = getExpensesByCategory();

  return (
    <ModalLayout style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* 헤더 섹션 */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Expense List</Text>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.addButton}
              onPress={() => setShowExpenseForm(true)}
            >
              <Text style={styles.addButtonText}>+ 추가</Text>
            </Pressable>
          </View>
        </View>

        {/* 총 지출 */}
        <View style={styles.totalSection}>
          <Text style={styles.totalTitle}>총 지출: ₩{totalExpenses.toLocaleString()}</Text>
        </View>

        {/* 지출 내역 상세 */}
        <View style={styles.detailsSection}>
          <Text style={styles.detailsTitle}>지출 내역 상세</Text>
          
          {/* 카테고리별 지출 요약 */}
          {Object.entries(expensesByCategory).map(([category, amount]) => (
            <View key={category} style={styles.categorySummary}>
              <Text style={styles.categoryName}>
                {categoryLabels[category as ExpenseCategory] || category}
              </Text>
              <Text style={styles.categoryTotal}>
                ₩{(amount as number).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        {/* 구분선 */}
        <View style={styles.separator} />

        {/* 상세 내역 */}
        <View style={styles.detailSection}>
          {Object.entries(expensesByCategory).map(([category, amount]) => (
            <View key={category} style={styles.categoryDetailSection}>
              <Pressable 
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category)}
              >
                <Text style={styles.categoryHeaderName}>
                  {categoryLabels[category as ExpenseCategory] || category}
                </Text>
                <Text style={styles.expandIcon}>
                  {expandedCategories.has(category) ? '▼' : '▶'}
                </Text>
              </Pressable>
              
              {/* 확장된 카테고리의 개별 지출 항목들 */}
              {expandedCategories.has(category) && (
                <View style={styles.expenseItems}>
                  {getExpensesInCategory(category).map((expense: Expense) => (
                    <View key={expense.id} style={styles.expenseItem}>
                      <View style={styles.expenseInfo}>
                        <Text style={styles.expenseDescription}>{expense.description}</Text>
                        <Text style={styles.expenseDate}>
                          {dayjs(expense.exDate).format('MM월 DD일')}
                        </Text>
                      </View>
                      <View style={styles.expenseActions}>
                        <Text style={styles.expenseAmount}>
                          {formatCurrency(expense.amount, expense.currency)}
                        </Text>
                        <Pressable
                          style={styles.deleteButton}
                          onPress={() => handleExpenseDelete(expense.id)}
                        >
                          <Text style={styles.deleteIcon}>🗑️</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

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
            <DropDownPicker
              open={categoryOpen}
              value={expenseForm.category}
              items={Object.entries(categoryLabels).map(([value, label]) => ({
                label: label,
                value: value,
              }))}
              setOpen={setCategoryOpen}
              setValue={(callback: any) => {
                const newValue = callback(expenseForm.category);
                setExpenseForm({ ...expenseForm, category: newValue });
              }}
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              placeholder="카테고리를 선택하세요"
              zIndex={1000}
              zIndexInverse={3000}
            />

            <Text style={styles.inputLabel}>금액</Text>
            <TextInput
              style={styles.input}
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
            <TextInput
              style={styles.input}
              placeholder="지출 설명을 입력하세요"
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
    </ModalLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
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
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // 총 지출 섹션
  totalSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  totalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  // 지출 내역 상세 섹션
  detailsSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  // 카테고리 요약
  categorySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  categoryTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  // 구분선
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  // 상세 내역 섹션
  detailSection: {
    paddingHorizontal: 16,
  },
  categoryDetailSection: {
    marginBottom: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  categoryHeaderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  expandIcon: {
    fontSize: 12,
    color: '#666',
  },
  // 개별 지출 항목들
  expenseItems: {
    backgroundColor: '#fff',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  expenseDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  expenseActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  deleteButton: {
    padding: 4,
  },
  deleteIcon: {
    fontSize: 16,
  },
  // 추가 버튼
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
