import { type Expense, ExpenseCategory } from "@/types/api";
import { categoryLabels } from "@/types/expense";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import dayjs from "dayjs";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import FlightIcon from "../../../../assets/airplane.svg";
import AccommodationIcon from "../../../../assets/mobile_accomodation.svg";
import MobileCarIcon from "../../../../assets/mobile_car.svg";
import CloseIcon from "../../../../assets/mobile_close.svg";
import MobileFoodIcon from "../../../../assets/mobile_food.svg";
import PlusIcon from "../../../../assets/mobile_plus.svg";
import MobileTicketIcon from "../../../../assets/mobile_ticket.svg";

interface ExpenseDetailModalProps {
  visible: boolean;
  onClose: () => void;
  expenses: Expense[];
  total: number;
  byCategory: Record<string, number>;
  planId?: number;
  planStartDate?: string;
  planEndDate?: string;
  exDate?: string;
  title?: string;
  onExpenseAdd?: (expense: Expense) => void;
  onAddExpensePress?: () => void;
}

const formatCurrency = (amount: number, currency?: string) => {
  if (currency === "USD") return `${amount.toLocaleString("en-US")}달러`;
  return `${amount.toLocaleString("ko-KR")}원`;
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

export default function ExpenseDetailModal({
  visible,
  onClose,
  expenses,
  total,
  byCategory,
  planId = 0,
  planStartDate,
  planEndDate,
  exDate,
  title = "오늘의 여행 비용",
  onExpenseAdd,
  onAddExpensePress,
}: ExpenseDetailModalProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<ExpenseCategory | null>(null);

  const totalKrw = expenses
    .filter(e => e.currency !== "USD")
    .reduce((sum, e) => sum + e.amount, 0);
  const totalUsd = expenses
    .filter(e => e.currency === "USD")
    .reduce((sum, e) => sum + e.amount, 0);

  const byCategoryKrw = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = expenses
        .filter(e => e.category === cat && e.currency !== "USD")
        .reduce((sum, e) => sum + e.amount, 0);
      return acc;
    },
    {} as Record<string, number>,
  );
  const byCategoryUsd = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = expenses
        .filter(e => e.category === cat && e.currency === "USD")
        .reduce((sum, e) => sum + e.amount, 0);
      return acc;
    },
    {} as Record<string, number>,
  );

  const categoryEntries = CATEGORY_ORDER.filter(
    cat => (byCategoryKrw[cat] ?? 0) > 0 || (byCategoryUsd[cat] ?? 0) > 0,
  );

  const showDatePerExpense = !exDate;

  const filteredExpenses = selectedCategory
    ? expenses.filter(e => e.category === selectedCategory)
    : expenses;

  const sectionTitle = selectedCategory
    ? `${categoryLabels[selectedCategory as keyof typeof categoryLabels] || selectedCategory} 상세 내역`
    : "전체 상세 내역";

  return (
    <BottomSheetModal visible={visible} onClose={onClose} height={0.85}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
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
        <Pressable
          style={[
            styles.totalCard,
            selectedCategory === null && styles.totalCardSelected,
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={styles.totalLabel}>총 비용(Total Cost)</Text>
          {totalKrw > 0 && (
            <Text style={styles.totalAmount}>
              {totalKrw.toLocaleString("ko-KR")}원
            </Text>
          )}
          {totalUsd > 0 && (
            <Text style={styles.totalAmount}>
              {totalUsd.toLocaleString("en-US")}달러
            </Text>
          )}
        </Pressable>

        {/* 카테고리별 금액 */}
        {categoryEntries.length > 0 && (
          <View style={styles.categoryGrid}>
            {categoryEntries.map(category => {
              const isSelected = selectedCategory === category;
              const krw = byCategoryKrw[category] ?? 0;
              const usd = byCategoryUsd[category] ?? 0;
              const amountText = [
                krw > 0 ? `${krw.toLocaleString("ko-KR")}원` : null,
                usd > 0 ? `${usd.toLocaleString("en-US")}달러` : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <Pressable
                  key={category}
                  style={[
                    styles.categoryCard,
                    isSelected && styles.categoryCardSelected,
                  ]}
                  onPress={() =>
                    setSelectedCategory(isSelected ? null : category)
                  }
                >
                  <Text
                    style={[
                      styles.categoryLabel,
                      isSelected && styles.categoryLabelSelected,
                    ]}
                  >
                    {categoryLabels[category as keyof typeof categoryLabels] ||
                      category}
                  </Text>
                  <Text
                    style={[
                      styles.categoryAmount,
                      isSelected && styles.categoryAmountSelected,
                    ]}
                  >
                    {amountText}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* 카테고리별 / 전체 상세 내역 */}
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
        {filteredExpenses.length > 0 ? (
          <View style={styles.detailList}>
            {filteredExpenses.map((expense, index) => (
              <View key={expense.id}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.detailRow}>
                  <View style={styles.detailIconBox}>
                    {getCategoryIcon(expense.category)}
                  </View>
                  <View style={styles.detailContent}>
                    <View style={styles.detailTitleRow}>
                      <Text style={styles.detailTitle}>
                        {categoryLabels[
                          expense.category as keyof typeof categoryLabels
                        ] || expense.category}
                      </Text>
                      {showDatePerExpense && expense.exDate && (
                        <Text style={styles.detailDate}>
                          {dayjs(expense.exDate).format("YYYY-MM-DD")}
                        </Text>
                      )}
                    </View>

                    <Text style={styles.detailDescription} numberOfLines={1}>
                      {expense.description || ""}
                    </Text>
                  </View>
                  <Text style={styles.detailAmount}>
                    {formatCurrency(expense.amount, expense.currency)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            {selectedCategory
              ? "해당 카테고리 내역이 없습니다"
              : "지출 내역이 없습니다"}
          </Text>
        )}
      </ScrollView>

      {planId > 0 && onAddExpensePress && (
        <View style={styles.footer}>
          <Pressable
            style={styles.AddExpenseButton}
            onPress={onAddExpensePress}
          >
            <PlusIcon width={20} height={20} color={colors.white} />
            <Text style={styles.AddExpenseButtonText}>비용 추가하기</Text>
          </Pressable>
        </View>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    alignItems: "center",
    justifyContent: "center",
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
    borderWidth: 1,
    borderColor: "transparent",
  },
  totalCardSelected: {
    borderColor: colors.primary,
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 32,
  },
  categoryCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: colors.gray200,
    borderRadius: 12,
    padding: 16,
  },
  categoryCardSelected: {
    backgroundColor: `${colors.primary}1A`,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  categoryLabel: {
    ...textStyles.h7,
    color: colors.gray600,
    marginBottom: 4,
  },
  categoryLabelSelected: {
    color: colors.primary,
  },
  categoryAmount: {
    ...textStyles.h5,
    color: colors.black,
  },
  categoryAmountSelected: {
    color: colors.primary,
  },
  sectionTitle: {
    ...textStyles.h7,
  },
  detailList: {
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: `${colors.primary}1A`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
    minWidth: 0,
  },
  detailTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  detailTitle: {
    ...textStyles.h7,
    color: colors.gray600,
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
    textAlign: "center",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  AddExpenseButtonText: {
    ...textStyles.h4,
    color: colors.white,
  },
});
