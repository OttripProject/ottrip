import { useCallback, useEffect, useState } from "react";
import { View, Text, Platform, StyleSheet } from "react-native";
import { useAttachmentUpload } from "@/hooks/useAttachmentUpload";
import { useDiscardConfirm } from "@/hooks/useDiscardConfirm";
import { useExpenseAi } from "@/hooks/useExpenseAi";
import { useFilePicker } from "@/hooks/useFilePicker";
import type { LocalFile } from "@/types/api";
import { type Expense, type Attachment, PLAN_ENTITY_KIND } from "@/types/api";
import { ExpenseCurrency, currencyLabels } from "@/types/expense";
import MotionPressable, { MotionIcon } from "@/ui/components/MotionPressable";
import Spinner from "@/ui/components/Spinner";
import { Tooltip } from "@/ui/components/Tooltip";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { surfaces } from "@/ui/tokens/surfaces";
import { textStyles } from "@/ui/tokens/typography";
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
  onDirtyChange?: (id: number, dirty: boolean) => void;
}

export default function ExpenseCard({ 
    expense,
    attachments,
    readOnly,
    onDelete,
    onAttachmentPress,
    onUpdate,
    onDirtyChange,
 }: ExpenseCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    
    const [editFormData, setEditFormData] = useState<ExpenseFormData | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveSpinner, setShowSaveSpinner] = useState(false);
    const [showErrors, setShowErrors] = useState(false);

    useEffect(() => {
      if (!isSaving) {
        setShowSaveSpinner(false);
        return;
      }
      const timer = setTimeout(() => setShowSaveSpinner(true), 300);
      return () => clearTimeout(timer);
    }, [isSaving]);
  
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
      setShowErrors(false);
    };
  
    const handleEditCancel = () => {
      setIsEditing(false);
      setEditFormData(null);
    };

    const isDirty =
      isEditing &&
      !!editFormData &&
      (editFormData.category !== expense.category ||
        editFormData.amount !== expense.amount ||
        editFormData.currency !== expense.currency ||
        editFormData.ex_date !== expense.exDate ||
        editFormData.description !== (expense.description || "") ||
        pendingFiles.length > 0 ||
        deletedAttachmentIds.length > 0);

    const { requestClose: requestEditCancel, discardConfirmModal } =
      useDiscardConfirm(isDirty, handleEditCancel);

    useEffect(() => {
      onDirtyChange?.(expense.id, isDirty);
    }, [onDirtyChange, expense.id, isDirty]);

    useEffect(
      () => () => onDirtyChange?.(expense.id, false),
      [onDirtyChange, expense.id],
    );
  
    const handleEditSave = async () => {
      if (!editFormData || isSaving) return;
      if (editFormData.amount <= 0) {
        setShowErrors(true);
        showToast("입력되지 않은 값이 있어요.", { icon: "warning" });
        return;
      }

      setIsSaving(true);
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
      } finally {
        setIsSaving(false);
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
          amountError={showErrors && !!editFormData && editFormData.amount <= 0}
        />

        <View style={styles.editActions}>
          <MotionPressable
            style={styles.editCancelBtn}
            onPress={requestEditCancel}
            disabled={isSaving}
          >
            <Text style={styles.editCancelText}>취소</Text>
          </MotionPressable>
          <MotionPressable
            style={[styles.editSaveBtn, !isDirty && styles.editSaveBtnDisabled]}
            onPress={handleEditSave}
            disabled={!isDirty || isSaving}
          >
            {showSaveSpinner ? (
              <Spinner size={16} strokeWidth={2} color={colors.white} />
            ) : (
              <Text
                style={[
                  styles.editSaveText,
                  !isDirty && styles.editSaveTextDisabled,
                ]}
              >
                저장
              </Text>
            )}
          </MotionPressable>
        </View>
        {discardConfirmModal}
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
              <MotionPressable
                style={styles.attachmentButton}
                hoverStyle={shadows.xsHover}
                onPress={() => onAttachmentPress(expense, attachments)}
                accessibilityLabel={`첨부파일 ${attachments.length}개 보기`}
              >
                <MotionIcon>
                  <AttachmentIcon
                    width={11}
                    height={11}
                    color={colors.gray700}
                    style={{ transform: [{ rotate: "45deg" }] }}
                  />
                </MotionIcon>
                <Text style={styles.attachmentCount}>{attachments.length}</Text>
              </MotionPressable>
            )}
            <Tooltip text="수정">
              <MotionPressable
                style={styles.updateButton}
                onPress={handleEditStart}
                accessibilityLabel="수정"
              >
                <MotionIcon>
                  <UpdateIcon width={16} height={16} color={colors.gray700} />
                </MotionIcon>
              </MotionPressable>
            </Tooltip>
            <Tooltip text="삭제">
              <MotionPressable
                style={styles.deleteButton}
                onPress={() => onDelete(expense.id)}
                accessibilityLabel="삭제"
              >
                <MotionIcon>
                  <DeleteIcon width={16} height={16} color={colors.gray700} />
                </MotionIcon>
              </MotionPressable>
            </Tooltip>
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
        padding: spacing.lg,
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: spacing.md,
      },
      expenseCardLeft: {
        flex: 1,
        gap: spacing.sm,
        minWidth: 0,
      },
      expenseCardRight: {
        flexShrink: 0,
        alignItems: "flex-end",
        gap: spacing.sm,
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
        ...textStyles.h6,
        color: colors.gray900,
      },
      expenseCardActions: {
        flexDirection: "row",
        alignItems: "center",
      },
      attachmentButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        height: 24,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.pill,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray350,
      },
      attachmentCount: {
        ...textStyles.h9,
        color: colors.gray700,
      },
      updateButton: {
        width: 32,
        height: 32,
        marginVertical: -spacing.sm,
        alignItems: "center",
        justifyContent: "center",
      },
      deleteButton: {
        width: 32,
        height: 32,
        marginVertical: -spacing.sm,
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
        borderRadius: radii.md,
        ...surfaces.muted,
        alignItems: "center",
        justifyContent: "center",
      },
      editSaveBtn: {
        flex: 1,
        height: 40,
        borderRadius: radii.md,
        ...surfaces.primary,
        alignItems: "center",
        justifyContent: "center",
      },
      editSaveBtnDisabled: {
        ...surfaces.muted,
        backgroundImage: "none",
      } as any,
      editSaveTextDisabled: {
        color: colors.gray500,
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