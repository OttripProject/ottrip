import React, { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import type { Expense, Attachment } from "@/types/api";
import { ExpenseCurrency, currencyLabels } from "@/types/expense";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import { expensesApi } from "@/services/expenses";
import { useToast } from "@/contexts/ToastContext";

import AttachmentIcon from "../../../assets/attachment_clip.svg";
import DeleteIcon from "../../../assets/delete.svg";
import UpdateIcon from "../../../assets/update.svg"

interface ExpenseCardProps {
  expense: Expense;
  attachments: Attachment[];
  readOnly?: boolean;
  onDelete: (id: number) => void;
  onUpdate?: () => void;
  onAttachmentPress: (expense: Expense, attachments: Attachment[]) => void;
}

export default function ExpenseCard({
  expense,
  attachments,
  readOnly,
  onDelete,
  onUpdate,
  onAttachmentPress,
}: ExpenseCardProps) {
  const { showToast } = useToast();
  
  // 💡 카드 내부에서 자신의 수정 상태를 독립적으로 관리합니다!
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Expense>>({});

  const formatAmount = (amount: number) => amount.toLocaleString();
  const formatDate = (exDate: string) => exDate.slice(5).replace("-", ".");

  const handleEditStart = () => {
    setIsEditing(true);
    setEditFormData({ ...expense });
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditFormData({});
  };

  const handleEditSave = async () => {
    try {
      await expensesApi.updateExpense(expense.id, editFormData);
      onUpdate?.();
      showToast("지출이 수정되었습니다.");
      setIsEditing(false);
    } catch {
      showToast("지출 수정에 실패했습니다.");
    }
  };

  // 1. 수정 모드 UI
  if (isEditing) {
    return (
      <View style={[styles.expenseCard, styles.editingCard]}>
        {/* 방금 전 논의했던 TextInput 및 수정 폼 UI들... */}
      </View>
    );
  }

  // 2. 기본 뷰 모드 UI
  return (
    <View style={styles.expenseCard}>
      <View style={styles.expenseCardLeft}>
        <Text style={styles.expenseDescription} numberOfLines={1}>
          {expense.description || "내용 없음"}
        </Text>
        <Text style={styles.expenseDate}>{formatDate(expense.exDate)}</Text>
      </View>
      <View style={styles.expenseCardRight}>
        <Text style={styles.expenseAmount}>
          {formatAmount(expense.amount)} {currencyLabels[expense.currency]}
        </Text>
        {!readOnly && (
          <View style={styles.expenseCardActions}>
            {attachments.length > 0 && (
              <Pressable
                style={styles.attachmentButton}
                onPress={() => onAttachmentPress(expense, attachments)}
              >
                <AttachmentIcon
                    width={11}
                    height={11}
                    color={colors.gray700}
                />
              </Pressable>
            )}
            <Pressable style={styles.updateButton} onPress={handleEditStart}>
                <UpdateIcon
                width={14}
                height={14}
                color={colors.gray700}
                />
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={() => onDelete(expense.id)}>
                <DeleteIcon
                width={14}
                height={14}
                color={colors.warning}
                />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    expenseCard: {
        backgroundColor: colors.gray100,
        borderRadius: radii.md,
        padding: spacing.md + 2,
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: spacing.md,
      },
      expenseCardLeft: {
        flex: 1,
        gap: spacing.xs + 2,
        minWidth: 0,
      },
      expenseCardRight: {
        flexShrink: 0,
        alignItems: "flex-end",
        gap: spacing.xs,
      },
      expenseDescription: {
        ...textStyles.h7,
        color: colors.gray900,
      },
      expenseDate: {
        fontFamily: typography.fontFamily.poppinsMedium,
        fontSize: 11,
        lineHeight: 16,
        color: colors.gray600,
      },
      expenseAmount: {
        ...textStyles.h7,
        color: colors.gray900,
      },
      expenseCardActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
      },
      attachmentButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        height: 24,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.pill,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray300,
      },
      attachmentCount: {
        fontFamily: typography.fontFamily.poppinsSemiBold,
        fontSize: 11,
        lineHeight: 16,
        color: colors.gray700,
      },
      updateButton: {
        width: 24,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
      },
      deleteButton: {
        width: 24,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
      },
});