import { useToast } from "@/contexts/ToastContext";
import AddExpenseModal from "@/components/modals/AddExpenseModal";
import ExpenseDetailModal from "@/components/modals/ExpenseDetailModal";
import { expensesApi } from "@/services/expenses";
import { colors } from "@/ui/tokens/colors";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import PanelLayout from "../PanelLayout";

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
  readOnly?: boolean;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  exDate: string;
  currency: string;
}

export default function ExpensesPanel({
  planData,
  onExpenseAdd,
  readOnly = false,
}: ExpensesPanelProps) {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);

  const { showToast } = useToast();

  const _handleExpenseDelete = async (expenseId: string) => {
    try {
      await expensesApi.deleteExpense(Number(expenseId));
      showToast("지출을 삭제했습니다")

      await planData?.refreshExpenses();
      await planData?.refreshItineraries?.();
      await planData?.refreshFlights?.();
      await planData?.refreshAccommodations?.();
    } catch (_error) {
      Alert.alert("알림", "비용 삭제에 실패했습니다.");
    }
  };

  const getTotalsByCurrency = () => {
    const result = { KRW: 0, USD: 0 };
    if (!planData?.expenses) return result;
    for (const expense of planData.expenses) {
      if (expense.currency === "USD") result.USD += expense.amount as number;
      else result.KRW += expense.amount as number;
    }
    return result;
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

  const totals = getTotalsByCurrency();
  const hasKRW = totals.KRW > 0;
  const hasUSD = totals.USD > 0;

  return (
    <PanelLayout style={{ flex: 1 }}>
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>여행 비용</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowExpenseDetail(true)}
              style={styles.outlineButton}
            >
              <Text style={styles.outlineButtonText}>상세보기</Text>
            </TouchableOpacity>
            {!readOnly && (
              <Pressable
                style={styles.outlineButton}
                onPress={() => setShowExpenseForm(true)}
              >
                <Text style={styles.addButtonPlus}>+</Text>
                <Text style={styles.outlineButtonText}>비용 추가</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Pressable style={styles.totalButton} onPress={() => setShowExpenseDetail(true)}>
          <Text style={styles.totalButtonLabel}>총 비용</Text>
          <View style={styles.totalAmountColumn}>
            {(!hasUSD || hasKRW) && (
              <View style={styles.totalAmountRow}>
                <Text style={styles.totalButtonAmount}>
                  {totals.KRW.toLocaleString()}
                </Text>
                <Text style={styles.totalAmountUnit}>원</Text>
              </View>
            )}
            {hasUSD && (
              <View style={styles.totalAmountRow}>
                <Text style={styles.totalButtonAmount}>
                  {totals.USD.toLocaleString()}
                </Text>
                <Text style={styles.totalAmountUnit}>달러</Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      {!readOnly && (
        <AddExpenseModal
          visible={showExpenseForm}
          onClose={() => setShowExpenseForm(false)}
          planId={planData?.plan?.id || 0}
          planStartDate={planData?.plan?.startDate}
          onExpenseAdd={newExpense => {
            onExpenseAdd?.(newExpense);
          }}
        />
      )}

      <ExpenseDetailModal
        visible={showExpenseDetail}
        onClose={() => setShowExpenseDetail(false)}
        expenses={planData?.expenses || []}
        attachments={planData?.attachments || []}
        readOnly={readOnly}
        onExpenseUpdate={async () => {
          await planData?.refreshExpenses();
          await planData?.refreshItineraries?.();
          await planData?.refreshFlights?.();
          await planData?.refreshAccommodations?.();
        }}
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
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  headerTitle: {
    ...textStyles.h5,
  },
  headerActions: {
    marginLeft: "auto" as any,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  outlineButton: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    flexDirection: "row",
    alignItems: "center",
  },
  outlineButtonText: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 12,
    lineHeight: 18,
    color: colors.gray900,
  },
  addButtonPlus: {
    fontSize: 14,
    lineHeight: 14,
    color: colors.gray900,
    marginRight: 4,
  },
  totalButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.gray100,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    flex: 1,
  },

  totalButtonLabel: {
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.gray700,
  },
  totalAmountColumn: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 2,
  },
  totalAmountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  totalButtonAmount: {
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.gray900,
  },

  totalAmountUnit: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.gray900,
  },

});
