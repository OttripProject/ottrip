import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, Image } from 'react-native';
import type { Attachment } from '@/types/api';
import { Expense } from '@/types/api';
import { ExpenseCategory, ExpenseCurrency, categoryLabels, currencyLabels } from '@/types/expense';
import { expensesApi } from '@/services/expenses';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens/radii';
import XIcon from '../../../assets/x.svg';
import DeleteIcon from '../../../assets/delete.svg';
import AttachmentIcon from '../../../assets/attachment.svg';

interface ExpenseDetailModalProps {
  visible: boolean;
  onClose: () => void;
  expenses: Expense[];
  attachments?: Attachment[];
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
  attachments = [],
  onExpenseDelete,
}: ExpenseDetailModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  const attachmentsMap = useMemo(() => {
    const map: Record<number, Attachment[]> = {};
    attachments.forEach((a) => {
      if (a.entityType === 'expense') {
        if (!map[a.entityId]) map[a.entityId] = [];
        map[a.entityId].push(a);
      }
    });
    return map;
  }, [attachments]);

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
      if (expense.category in totals) totals[expense.category] += expense.amount;
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
      if (expense.category in grouped) grouped[expense.category].push(expense);
    });
    return grouped;
  }, [expenses]);

  const handleDelete = async (expenseId: number) => {
    try {
      await expensesApi.deleteExpense(expenseId);
      onExpenseDelete?.();
    } catch {}
  };

  const handleAttachmentPress = (attachments: Attachment[]) => {
    if (attachments.length === 0) return;
    const first = attachments[0];
    if (first.contentType.startsWith('image/')) {
      setPreviewAttachment(first);
    } else if (typeof window !== 'undefined') {
      window.open(first.fileUrl, '_blank');
    }
  };

  const formatAmount = (amount: number) => amount.toLocaleString();

  const formatDate = (exDate: string) => exDate.slice(5).replace('-', '.');

  return (
    <>
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

            <Pressable
              style={styles.totalSection}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={styles.totalLabel}>총 지출</Text>
              <Text style={styles.totalAmount}>
                {formatAmount(totalExpenses)} {currencyLabels[ExpenseCurrency.KRW]}
              </Text>
            </Pressable>

            <View style={styles.divider} />

            <View style={styles.summarySection}>
              {categoryOrder.map((category) => {
                const total = categoryTotals[category];
                if (total === 0) return null;
                const isSelected = selectedCategory === category;
                return (
                  <Pressable
                    key={category}
                    style={[styles.summaryRow, isSelected && styles.summaryRowSelected]}
                    onPress={() => setSelectedCategory(isSelected ? null : category)}
                  >
                    <Text style={[styles.summaryCategory, isSelected && styles.summaryCategorySelected]}>
                      {categoryLabels[category]}
                    </Text>
                    <Text style={[styles.summaryAmount, isSelected && styles.summaryAmountSelected]}>
                      {formatAmount(total)} {currencyLabels[ExpenseCurrency.KRW]}
                    </Text>
                  </Pressable>
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
                if (selectedCategory !== null && selectedCategory !== category) return null;
                return (
                  <View key={category} style={styles.categorySection}>
                    <Text style={styles.categoryHeader}>
                      {categoryLabels[category]}
                    </Text>
                    {categoryExpenses.map((expense) => {
                      const attachments = attachmentsMap[expense.id] ?? [];
                      return (
                        <View key={expense.id} style={styles.expenseCard}>
                          <View style={styles.expenseCardLeft}>
                            <Text style={styles.expenseDescription} numberOfLines={1}>
                              {expense.description || '내용 없음'}
                            </Text>
                            <Text style={styles.expenseDate}>
                              {formatDate(expense.exDate)}
                            </Text>
                          </View>
                          <View style={styles.expenseCardRight}>
                            <Text style={styles.expenseAmount}>
                              {formatAmount(expense.amount)} {currencyLabels[expense.currency]}
                            </Text>
                            <View style={styles.expenseCardActions}>
                              {attachments.length > 0 && (
                                <Pressable
                                  style={styles.attachmentButton}
                                  onPress={() => handleAttachmentPress(attachments)}
                                >
                                  <AttachmentIcon width={11} height={11} color={colors.gray700} />
                                  <Text style={styles.attachmentCount}>{attachments.length}</Text>
                                </Pressable>
                              )}
                              <Pressable
                                onPress={() => handleDelete(expense.id)}
                                style={styles.deleteButton}
                              >
                                <DeleteIcon width={14} height={14} />
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {previewAttachment && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewAttachment(null)}
        >
          <Pressable style={styles.previewOverlay} onPress={() => setPreviewAttachment(null)}>
            <Image
              source={{ uri: previewAttachment.fileUrl }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg + 2,
    paddingVertical: spacing.md + 2,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
  },
  totalLabel: {
    ...textStyles.h7,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  totalAmount: {
    ...textStyles.h5,
    color: colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray300,
    marginHorizontal: spacing.xl,
    marginVertical: spacing.md + 4,
  },
  summarySection: {
    gap: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.lg + 2,
    paddingVertical: spacing.md + 2,
    borderRadius: radii.md,
  },
  summaryRowSelected: {
    backgroundColor: colors.gray200,
  },
  summaryCategory: {
    ...textStyles.body3,
    color: colors.black,
  },
  summaryCategorySelected: {
    ...textStyles.h7,
    color: colors.black,
  },
  summaryAmount: {
    ...textStyles.h7,
    color: colors.black,
  },
  summaryAmountSelected: {
    ...textStyles.h7,
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
    color: colors.black,
  },
  expenseCard: {
    backgroundColor: colors.gray100,
    borderRadius: radii.md,
    padding: spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  expenseCardLeft: {
    flex: 1,
    gap: spacing.xs + 2,
    minWidth: 0,
  },
  expenseCardRight: {
    flexShrink: 0,
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  expenseDescription: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  expenseDate: {
    ...textStyles.body6,
    color: colors.gray600,
  },
  expenseAmount: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  expenseCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  attachmentCount: {
    ...textStyles.h9,
    fontFamily: typography.fontFamily.poppinsMedium,
    color: colors.gray700,
  },
  deleteButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '90%',
    height: '80%',
  } as any,
});
