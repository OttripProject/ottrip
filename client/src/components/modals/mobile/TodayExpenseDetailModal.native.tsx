import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheetModal from '@/ui/components/BottomSheetModal.native';
import AddExpenseModal from './AddExpenseModal.native';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { categoryLabels } from '@/types/expense';
import { Expense, ExpenseCategory } from '@/types/api';
import CloseIcon from '../../../../assets/mobile_close.svg';
import MobileFoodIcon from '../../../../assets/mobile_food.svg';
import MobileCarIcon from '../../../../assets/mobile_car.svg';
import MobileTicketIcon from '../../../../assets/mobile_ticket.svg';
import AccommodationIcon from '../../../../assets/mobile_accomodation.svg';
import FlightIcon from '../../../../assets/airplane.svg';
import PlusIcon from '../../../../assets/mobile_plus.svg';

interface TodayExpenseDetailModalProps {
  visible: boolean;
  onClose: () => void;
  expenses: Expense[];
  total: number;
  byCategory: Record<string, number>;
  planId?: number;
  planStartDate?: string;
  planEndDate?: string;
  exDate?: string;
  onExpenseAdd?: (expense: Expense) => void;
}

const formatCurrency = (amount: number) => {
  return `${amount.toLocaleString('ko-KR')}원`;
};

const getCategoryIcon = (category: ExpenseCategory) => {
  const iconProps = { width: 20, height: 20, color: colors.primary };
  switch (category) {
    case ExpenseCategory.FOOD:
      return <MobileFoodIcon {...iconProps} />;
    case ExpenseCategory.TRANSPORT:
      return <MobileCarIcon {...iconProps} />;
    case ExpenseCategory.ACTIVITY:
    case ExpenseCategory.SHOPPING:
    case ExpenseCategory.ETC:
      return <MobileTicketIcon {...iconProps} />;
    case ExpenseCategory.ACCOMMODATION:
      return <AccommodationIcon {...iconProps} />;
    case ExpenseCategory.FLIGHT:
      return <FlightIcon {...iconProps} />;
    default:
      return <MobileTicketIcon {...iconProps} />;
  }
};

const CATEGORY_ORDER: ExpenseCategory[] = [
  ExpenseCategory.ACTIVITY,
  ExpenseCategory.FOOD,
  ExpenseCategory.TRANSPORT,
  ExpenseCategory.ACCOMMODATION,
  ExpenseCategory.FLIGHT,
  ExpenseCategory.SHOPPING,
  ExpenseCategory.ETC,
];

export default function TodayExpenseDetailModal({
  visible,
  onClose,
  expenses,
  total,
  byCategory,
  planId = 0,
  planStartDate,
  planEndDate,
  exDate,
  onExpenseAdd,
}: TodayExpenseDetailModalProps) {
  const [showAddExpense, setShowAddExpense] = useState(false);

  const handleExpenseAdded = (expense: Expense) => {
    onExpenseAdd?.(expense);
    setShowAddExpense(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const categoryEntries = CATEGORY_ORDER.filter((cat) => (byCategory[cat] ?? 0) > 0).map(
    (cat) => [cat, byCategory[cat] ?? 0] as const
  );
  const insets = useSafeAreaInsets();

  return (
    <BottomSheetModal visible={visible} onClose={onClose} height={0.9} >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>오늘의 여행 비용</Text>
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
          <CloseIcon width={20} height={20} color={colors.gray700} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 총 비용 */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>총 비용(Total Cost)</Text>
          <Text style={styles.totalAmount}>
            {total.toLocaleString('ko-KR')}원
          </Text>
        </View>

        {/* 카테고리별 금액 */}
        {categoryEntries.length > 0 && (
          <View style={styles.categoryGrid}>
            {categoryEntries.map(([category, amount]) => (
              <View key={category} style={styles.categoryCard}>
                <Text style={styles.categoryLabel}>
                  {categoryLabels[category as keyof typeof categoryLabels] || category}
                </Text>
                <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 전체 상세 내역 */}
        <Text style={styles.sectionTitle}>전체 상세 내역</Text>
        {expenses.length > 0 ? (
          <View style={styles.detailList}>
            {expenses.map((expense, index) => (
              <View key={expense.id}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.detailRow}>
                  <View style={styles.detailIconBox}>
                    {getCategoryIcon(expense.category)}
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailTitle}>
                      {categoryLabels[expense.category as keyof typeof categoryLabels] || expense.category}{' '}
                      <Text style={styles.detailDate}>{expense.exDate}</Text>
                    </Text>
                    
                    <Text style={styles.detailDescription} numberOfLines={1}>
                      {expense.description || ''}
                    </Text>
                  </View>
                  <Text style={styles.detailAmount}>{formatCurrency(expense.amount)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>지출 내역이 없습니다</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.AddExpenseButton}
          onPress={() => setShowAddExpense(true)}
        >
          <PlusIcon width={20} height={20} color={colors.white}/>
          <Text style={styles.AddExpenseButtonText}>비용 추가하기</Text>
        </Pressable>
      </View>

      {planId > 0 && (
        <AddExpenseModal
          visible={showAddExpense}
          onClose={() => setShowAddExpense(false)}
          planId={planId}
          planStartDate={planStartDate}
          planEndDate={planEndDate}
          defaultExDate={exDate}
          onExpenseAdd={handleExpenseAdded}
        />
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerTitle: {
    ...textStyles.h4,
    color: colors.gray900,
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  totalCard: {
    backgroundColor: `${colors.primary}1A`,
    borderRadius: 12,
    padding: 16,
    paddingVertical: 20,
    marginBottom: 8,
  },
  totalLabel: {
    ...textStyles.h7,
    marginBottom: 4,
  },
  totalAmount: {
    ...textStyles.h2,
    color: colors.primary,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  categoryCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.gray200,
    borderRadius: 12,
    padding: 16,
  },
  categoryLabel: {
    ...textStyles.h7,
    color: colors.gray600,
    marginBottom: 4,
  },
  categoryAmount: {
    ...textStyles.h5,
    color: colors.black,
  },
  sectionTitle: {
    ...textStyles.h7,
  },
  detailList: {
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: `${colors.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
    minWidth: 0,
  },
  detailTitle: {
    ...textStyles.h7,
    color: colors.gray600,
    marginBottom: 2,
  },
  detailDate: {
    ...textStyles.body4,
    color: colors.gray600,
    marginLeft: 8,
  },
  detailDescription: {
    ...textStyles.h6,
  },
  detailAmount: {
    ...textStyles.h5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
  },
  emptyText: {
    ...textStyles.h5,
    color: colors.gray600,
    textAlign: 'center',
    paddingVertical: 24,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  AddExpenseButton: {
    backgroundColor: colors.black,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  AddExpenseButtonText: {
    ...textStyles.h4,
    color: colors.white,
  },
});
