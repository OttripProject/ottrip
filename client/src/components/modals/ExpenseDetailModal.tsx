import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { Expense } from '@/types/api';
import { ExpenseCategory, ExpenseCurrency, categoryLabels, currencyLabels } from '@/types/expense';
import { expensesApi } from '@/services/expenses';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens/radii';
import XIcon from '../../../assets/x.svg';
import DeleteIcon from '../../../assets/delete.svg';

interface ExpenseDetailModalProps {
  visible: boolean;
  onClose: () => void;
  expenses: Expense[];
  onExpenseDelete?: () => void;
}

const categoryOrder = [
  ExpenseCategory.FOOD,
  ExpenseCategory.TRANSPORT,
  ExpenseCategory.ACTIVITY,  
  ExpenseCategory.ACCOMMODATION,
  ExpenseCategory.FLIGHT,
  ExpenseCategory.SHOPPING,
  ExpenseCategory.ETC,
];
export default function ExpenseDetailModal({
  visible,
  onClose,
  expenses,
  onExpenseDelete,
}: ExpenseDetailModalProps) {
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  const categoryTotals = useMemo(() => {
    const totals: Record<ExpenseCategory, number> = {
      [ExpenseCategory.FOOD]: 0,
      [ExpenseCategory.TRANSPORT]: 0,
      [ExpenseCategory.ACTIVITY]: 0,
      [ExpenseCategory.ACCOMMODATION]: 0, 
      [ExpenseCategory.FLIGHT]: 0,
      [ExpenseCategory.SHOPPING]: 0,
      [ExpenseCategory.ETC]: 0,
    };

    expenses.forEach((expense) => {
      if (expense.category in totals) {
        totals[expense.category] += expense.amount;
      }
    });

    return totals;
  }, [expenses]);

  const expensesByCategory = useMemo(() => {
    const grouped: Record<ExpenseCategory, Expense[]> = {
      [ExpenseCategory.FOOD]: [],
      [ExpenseCategory.TRANSPORT]: [],
      [ExpenseCategory.FLIGHT]: [],
      [ExpenseCategory.ACTIVITY]: [],
      [ExpenseCategory.ACCOMMODATION]: [],
      [ExpenseCategory.SHOPPING]: [],
      [ExpenseCategory.ETC]: [],
    };

    expenses.forEach((expense) => {
      if (expense.category in grouped) {
        grouped[expense.category].push(expense);
      }
    });

    return grouped;
  }, [expenses]);

  const handleDelete = async (expenseId: number) => {
    try {
      await expensesApi.deleteExpense(expenseId);
      onExpenseDelete?.();
    } catch (error) {
    }
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>지출 내역</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <XIcon width={24} height={24} />
            </Pressable>
          </View>

          <View style={styles.totalSection}>
            <Text style={styles.totalText}>
              총 지출 : {formatAmount(totalExpenses)} {currencyLabels[ExpenseCurrency.KRW]}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summarySection}>
            {categoryOrder.map((category) => {
              const total = categoryTotals[category];
              if (total === 0) return null;

              return (
                <View key={category} style={styles.summaryRow}>
                  <Text style={styles.summaryCategory}>
                    {categoryLabels[category]}
                  </Text>
                  <Text style={styles.summaryAmount}>
                    {formatAmount(total)} {currencyLabels[ExpenseCurrency.KRW]}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.divider} />

          <ScrollView
            style={styles.detailScrollView}
            contentContainerStyle={styles.detailScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {categoryOrder.map((category) => {
              const categoryExpenses = expensesByCategory[category];
              if (categoryExpenses.length === 0) return null;

              return (
                <View key={category} style={styles.categorySection}>
                  <Text style={styles.categoryHeader}>
                    {categoryLabels[category]}
                  </Text>
                  {categoryExpenses.map((expense) => (
                    <View key={expense.id} style={styles.expenseCard}>
                      <View style={styles.expenseCardContent}>
                        <Text style={styles.expenseDescription} numberOfLines={1}>
                          {expense.description || '내용 없음'}
                        </Text>
                        <Text style={styles.expenseAmount}>
                          {formatAmount(expense.amount)} {currencyLabels[expense.currency]}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleDelete(expense.id)}
                        style={styles.deleteButton}
                      >
                        <DeleteIcon width={16} height={16} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              );
            })}
          </ScrollView>
        </View>
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
    borderRadius: radii.xl,
    width: '90%',
    maxWidth: 420,
    maxHeight: 648,
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl + 8,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    ...textStyles.h3,
    fontWeight: typography.weight.semibold,
    color: colors.black,
  },
  closeButton: {
    padding: spacing.xs,
    marginTop: -spacing.xs,
    marginRight: -spacing.xs,
  },
  totalSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.none,
  },
  totalText: {
    ...textStyles.h6,
    fontWeight: typography.weight.semibold,
    color: colors.black,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray300,
    marginHorizontal: spacing.xl,
    marginVertical: spacing.md+4,
  },
  summarySection: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCategory: {
    ...textStyles.h7,
    fontWeight: typography.weight.semibold,
    color: colors.black,
  },
  summaryAmount: {
    ...textStyles.h7,
    fontWeight: typography.weight.semibold,
    color: colors.black,
  },
  detailScrollView: {
    flex: 1,
    minHeight: 0,
  },
  detailScrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  categorySection: {
    gap: spacing.md,
  },
  categoryHeader: {
    ...textStyles.h7,
    fontWeight: typography.weight.semibold,
    color: colors.black,
  },
  expenseCard: {
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
    padding: spacing.md,
    paddingRight: spacing.lg + 4,
    minHeight: 80,
    position: 'relative',
  },
  expenseCardContent: {
    gap: spacing.md - 4,
  },
  expenseDescription: {
    ...textStyles.h7,
    fontWeight: typography.weight.semibold,
    color: colors.black,
  },
  expenseAmount: {
    ...textStyles.body4,
    fontWeight: typography.weight.regular,
    color: colors.black,
  },
  deleteButton: {
    position: 'absolute',
    top: spacing.md - 2,
    right: spacing.md - 2,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

