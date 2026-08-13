import { useCallback, useState } from "react";
import { View, Text, Platform, Pressable, StyleSheet } from "react-native";
import { useAttachmentUpload } from "@/hooks/useAttachmentUpload";
import { useExpenseAi } from "@/hooks/useExpenseAi";
import { useFilePicker } from "@/hooks/useFilePicker";
import type { LocalFile } from "@/types/api";
import { type Expense, type Attachment, PLAN_ENTITY_KIND } from "@/types/api";
import { ExpenseCurrency, currencyLabels } from "@/types/expense";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import { attachmentsApi } from "@/services/attachments";
import { expensesApi } from "@/services/expenses";
import ExpenseForm, { type ExpenseFormData } from "@/components/forms/ExpenseForm";
import { useToast } from "@/contexts/ToastContext";

import AttachmentIcon from "../../../assets/files.svg";
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
    onAttachmentPress,
    onUpdate,
 }: ExpenseCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    
    const [editFormData, setEditFormData] = useState<ExpenseFormData | null>(null);
  
    const { isUploading, uploadFiles } = useAttachmentUpload({
      planId: expense.planId,
      entityType: PLAN_ENTITY_KIND.EXPENSE,
    });
    const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<number[]>([]);

    const [pendingFiles, setPendingFiles] = useState<LocalFile[]>([]);

    const clearPendingFilesWithRevoke = useCallback(() => {
      setPendingFiles(prev => {
        if (Platform.OS === "web") {
          prev.forEach(f => {
            if (f.uri?.startsWith("blob:")) {
              try {
                URL.revokeObjectURL(f.uri);
              } catch {
                /* noop */
              }
            }
          });
        }
        return [];
      });
    }, []);
    
    const { pickImage, pickDocument } = useFilePicker();
  
    const aiState = useExpenseAi({
      pendingFiles,
      existingAttachments: attachments,
      onUpdateForm: setEditFormData,
    });

    const appendImage = async () => {
      try {
        const file = await pickImage();
        if (file) {
          setPendingFiles((prev) => [...prev, file]);
        }
      } catch (error) {
        console.error("이미지 선택 중 오류 발생:", error);
      }
    };
  
    const appendDocument = async () => {
      try {
        const file = await pickDocument();
        if (file) {
          setPendingFiles((prev) => [...prev, file]);
        }
      } catch (error) {
        console.error("문서 선택 중 오류 발생:", error);
      }
    };
  
    const removePendingFile = (index: number) => {
      setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    };    

    const { showToast } = useToast();

    const formatAmount = (amount: number) => amount.toLocaleString();
    const formatDate = (exDate: string) => exDate.slice(5).replace("-", ".");

    const handleEditStart = () => {
      setIsEditing(true);
      setEditFormData({
        category: expense.category,
        amount: expense.amount,
        currency: expense.currency,
        ex_date: expense.exDate, 
        description: expense.description || "",
      });
      setPendingFiles([]);
      setDeletedAttachmentIds([]);
    };
  
    const handleEditCancel = () => {
      setIsEditing(false);
      setEditFormData(null);
    };
  
    const handleEditSave = async () => {
      if (!editFormData) return;
      
      try {
        await expensesApi.updateExpense(expense.id, {
          category: editFormData.category,
          amount: editFormData.amount,
          currency: editFormData.currency,
          exDate: editFormData.ex_date, 
          description: editFormData.description,
        });
  
        if (deletedAttachmentIds.length > 0) {
          await Promise.all(
            deletedAttachmentIds.map((attachmentId) => 
              attachmentsApi.deleteAttachment(attachmentId) 
            )
          );
        }
  
        let uploadError: unknown = null;
        if (pendingFiles.length > 0) {
          try {
            await uploadFiles(pendingFiles, expense.id);
          } catch (e) {
            uploadError = e;
          }
        }
        
        if (clearPendingFilesWithRevoke) {
          clearPendingFilesWithRevoke();
        }
  
        if (uploadError) {
          showToast("내용은 수정되었으나, 파일 업로드에 실패했습니다.");
        } else {
          showToast("지출이 수정되었습니다.");
        }
        
        onUpdate?.();
        setIsEditing(false);
        
      } catch (error) {
        showToast("지출 수정에 실패했습니다.");
        console.error("지출 수정 중 전체 에러:", error);
      }
    };

    const handleRemoveExisting = (attachmentId: number) => {
      setDeletedAttachmentIds((prev) => [...prev, attachmentId]);
    };
  
    const displayAttachments = attachments?.filter(
      (a) => !deletedAttachmentIds.includes(a.id)
    ) || [];

  // 1. 수정 모드 UI
  if (isEditing && editFormData) {
    return (
      <View style={[styles.expenseCard, styles.editingCard]}>

        <ExpenseForm 
          data={editFormData} 
          onChange={setEditFormData} 
          compact 
          
          existingAttachments={displayAttachments}
          pendingFiles={pendingFiles}
          onPickImage={appendImage}
          onPickDocument={appendDocument}
          onRemoveExisting={handleRemoveExisting}
          onRemovePending={removePendingFile}
          onAppendPendingFiles={
            Platform.OS === "web"
              ? (files) => setPendingFiles((prev) => [...prev, ...files])
              : undefined
          }
          isAiAnalyzing={aiState.isAiAnalyzing}
          onAiAnalyzePress={
            Platform.OS === "web" ? aiState.handleAiAnalyzePress : undefined
          }
          analyzeError={aiState.analyzeError}
          onRetryAnalyze={
            Platform.OS === "web" ? aiState.handleRetryAnalyze : undefined
          }
          isAiAnalyzeSuccess={aiState.isAiAnalyzeSuccess}
          isAiAnalyzePartial={aiState.isAiAnalyzePartial}
          analyzePartialMessage={aiState.analyzePartialMessage}
          aiFilledFields={aiState.aiFilledFields}
        />

        <View style={styles.editActions}>
          <Pressable style={styles.editCancelBtn} onPress={handleEditCancel}>
            <Text style={styles.editCancelText}>취소</Text>
          </Pressable>
          <Pressable style={styles.editSaveBtn} onPress={handleEditSave}>
            <Text style={styles.editSaveText}>저장</Text>
          </Pressable>
        </View>
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
                  color={colors.gray500}
                  style={{ transform: [{ rotate: "45deg" }] }}
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
        ...textStyles.h9,
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
      editingCard: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray200,
        borderRadius: 12,
        padding: 14,
        flexDirection: "column",
        alignItems: "stretch", 
        width: "100%",
        gap: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
      },
      editActions: {
        flexDirection: "row", 
        gap: 8,
        marginTop: 2,
      },
      editCancelBtn: {
        flex: 1, 
        height: 40,
        borderRadius: 10,
        backgroundColor: colors.gray400,
        alignItems: "center",
        justifyContent: "center",
      },
      editSaveBtn: {
        flex: 1,
        height: 40,
        borderRadius: 10,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
      },
      editCancelText: {
        ...textStyles.h7,
        color: colors.gray900,
      },
      editSaveText: {
        ...textStyles.h7,
        color: colors.white,
      },
});