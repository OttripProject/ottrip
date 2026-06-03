import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { expensesApi } from '@/services/expenses';
import PanelLayout from '../PanelLayout';
import AddExpenseModal from '@/components/modals/AddExpenseModal';
import ExpenseDetailModal from '@/components/modals/ExpenseDetailModal';
import { currencyLabels, ExpenseCurrency } from '@/types/expense';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens/radii';
import PlusExpenseIcon from '../../../../assets/add_expense.svg';

interface ExpensesPanelProps {
  planData?: {
    plan: any;
    expenses: any[];
    attachments?: any[];
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
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);

  const handleExpenseDelete = async (expenseId: string) => {
    try {
      await expensesApi.deleteExpense(Number(expenseId));
      Alert.alert('성공', '비용이 삭제되었습니다.');
      
      await planData?.refreshExpenses();
      await planData?.refreshItineraries?.();
      await planData?.refreshFlights?.();
      await planData?.refreshAccommodations?.();
    } catch (error) {
      Alert.alert('알림', '비용 삭제에 실패했습니다.');
    }
  };

  const getTotalExpenses = () => {
    if (!planData?.expenses) return 0;
    return planData.expenses.reduce((total, expense) => total + (expense.amount as number), 0);
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

  return (
    <PanelLayout style={{ flex: 1 }}>
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>여행 비용</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setShowExpenseDetail(true)} style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>상세보기</Text>
            </TouchableOpacity>
            <Pressable
              style={styles.addButton}
              onPress={() => setShowExpenseForm(true)}
            >
              <PlusExpenseIcon width={16} height={16} />
              <Text style={styles.addButtonText}>비용 추가</Text>
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.totalButton}>
          <Text style={styles.totalButtonLabel}>총 비용</Text>
          <View style={styles.totalButtonRight}>
            <Text style={styles.totalButtonAmount}>{totalExpenses.toLocaleString()} {currencyLabels[ExpenseCurrency.KRW]}</Text>
          </View>
        </Pressable>
      </View>

      <AddExpenseModal
        visible={showExpenseForm}
        onClose={() => setShowExpenseForm(false)}
        planId={planData?.plan?.id || 0}
        planStartDate={planData?.plan?.startDate}
        onExpenseAdd={(newExpense) => {
          onExpenseAdd?.(newExpense);
        }}
      />

      <ExpenseDetailModal
        visible={showExpenseDetail}
        onClose={() => setShowExpenseDetail(false)}
        expenses={planData?.expenses || []}
        attachments={planData?.attachments || []}
        onExpenseDelete={async () => {
          await planData?.refreshExpenses();
          await planData?.refreshItineraries?.();
          await planData?.refreshFlights?.();
          await planData?.refreshAccommodations?.();
        }}
      />
    </PanelLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
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
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...textStyles.h4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 28,
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    height: 32,
  },
  addButtonText: {
    ...textStyles.h8,
    color: colors.white,
    fontWeight: typography.weight.semibold,
  },
  viewAllButton: {
    width: 74,
    height: 32,
    borderRadius: 28,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllText: {
    ...textStyles.h8,
    color: colors.black,
  },
  totalButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.gray200,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    flex: 1,
  },
  totalButtonLabel: {
    ...textStyles.h6,
    color: colors.black,
  },
  totalButtonRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  totalButtonAmount: {
    ...textStyles.h3,
    color: colors.black,
  },
});
