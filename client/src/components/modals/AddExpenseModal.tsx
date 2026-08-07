import AiAnalyzeFailureModal from "@/components/modals/AiAnalyzeFailureModal";
import BaseCalendar from "@/components/popup/calendar/BaseCalendar";
import { PLACEHOLDERS } from "@/constants/placeholders";
import ExpenseForm from "@/components/forms/ExpenseForm";
import { useDate } from "@/contexts/DateContext";
import { useAttachmentUpload } from "@/hooks/useAttachmentUpload";
import { useExpenseAi } from "@/hooks/useExpenseAi";
import { useFilePicker } from "@/hooks/useFilePicker";
import { analyzeDocumentUpload } from "@/services/aiDocument";
import { expensesApi } from "@/services/expenses";
import {
  type AiDocumentItemDraft,
  type AiDocumentItemType,
  type LocalFile,
  PLAN_ENTITY_KIND,
} from "@/types/api";
import { ExpenseCategory, ExpenseCurrency } from "@/types/expense";
import AttachmentSection from "@/ui/components/attachmentSection";
import type { AiAttachmentAnalyzeSelection } from "@/ui/components/attachmentSection.types";
import { pendingAiFileKey } from "@/ui/components/attachmentSection.types";
import WarningBanner from "@/ui/components/toast/warning";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { typography } from "@/ui/tokens/typography";
import { buildAnalyzeUploadPayload } from "@/utils/attachmentAiAnalyze";
import { formatAttachmentUploadFailureMessage } from "@/utils/crossPlatformAlert";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import CalendarIcon from "../../../assets/calender.svg";
import XIcon from "../../../assets/x.svg";

function AiFilledBadge() {
  return (
    <View style={aiBadgeStyles.badge}>
      <LinearGradient
        colors={colors.gradientAIRefresh}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={aiBadgeStyles.dot}
      />
      <Text style={aiBadgeStyles.text}>AI</Text>
    </View>
  );
}

const aiBadgeStyles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: colors.aiTint,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  text: {
    fontFamily: "Pretendard-Bold",
    fontSize: 9,
    lineHeight: 12,
    color: colors.aiInk,
    letterSpacing: 0.02,
  },
});

function NeedsCheckBadge() {
  return (
    <View style={needsCheckStyles.badge}>
      <Text style={needsCheckStyles.text}>확인 필요</Text>
    </View>
  );
}

const needsCheckStyles = StyleSheet.create({
  badge: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: "rgb(255, 243, 214)",
  },
  text: {
    fontFamily: "Pretendard-Bold",
    fontSize: 9,
    lineHeight: 12,
    color: "rgb(168, 115, 10)",
    letterSpacing: 0.02,
  },
});

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  planId: number;
  planStartDate?: string;
  onExpenseAdd?: (expense: any) => void;
}

export default function AddExpenseModal({
  visible,
  onClose,
  planId,
  planStartDate,
  onExpenseAdd,
}: AddExpenseModalProps) {
  const { selectedDate } = useDate();
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [pendingFiles, setPendingFiles] = useState<LocalFile[]>([]);
  const [aiAnalyzeFailureVisible, setAiAnalyzeFailureVisible] = useState(false);
  const [aiAnalyzeFailureMessage, setAiAnalyzeFailureMessage] = useState("");

  const { pickImage, pickDocument } = useFilePicker();
  const { isUploading, uploadFiles } = useAttachmentUpload({
    planId,
    entityType: PLAN_ENTITY_KIND.EXPENSE,
  });

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

  const removePendingAt = useCallback((index: number) => {
    setPendingFiles(prev => {
      const t = prev[index];
      if (Platform.OS === "web" && t?.uri?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(t.uri);
        } catch {
          /* noop */
        }
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const appendImage = async () => {
    try {
      const f = await pickImage();
      if (f) setPendingFiles(p => [...p, f]);
    } catch (e) {
      Alert.alert(
        "알림",
        e instanceof Error ? e.message : "파일을 선택하지 못했습니다",
      );
    }
  };

  const appendDocument = async () => {
    try {
      const f = await pickDocument();
      if (f) setPendingFiles(p => [...p, f]);
    } catch (e) {
      Alert.alert(
        "알림",
        e instanceof Error ? e.message : "파일을 선택하지 못했습니다",
      );
    }
  };

  const getDefaultDate = () =>
    planStartDate || selectedDate || dayjs().format("YYYY-MM-DD");

  const [expenseForm, setExpenseForm] = useState({
    category: ExpenseCategory.ETC,
    amount: 0,
    description: "",
    ex_date: getDefaultDate(),
    currency: ExpenseCurrency.KRW,
  });

  useEffect(() => {
    if (visible) {
      const defaultDate =
        planStartDate || selectedDate || dayjs().format("YYYY-MM-DD");
      setExpenseForm(prev => ({
        ...prev,
        ex_date: defaultDate,
      }));
    }
  }, [visible, planStartDate, selectedDate]);

  const handleExpenseSubmit = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    if (!planId) {
      setWarningMessage("여행을 먼저 선택해주세요");
      setShowWarning(true);
      return;
    }

    if (expenseForm.amount <= 0) {
      setWarningMessage("금액을 입력해주세요");
      setShowWarning(true);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const newExpense = await expensesApi.createExpense({
        planId: planId,
        category: expenseForm.category as any,
        amount: expenseForm.amount,
        description: expenseForm.description,
        exDate: expenseForm.ex_date,
        currency: expenseForm.currency as any,
      });

      let uploadError: unknown = null;
      if (pendingFiles.length > 0) {
        try {
          await uploadFiles(pendingFiles, newExpense.id);
        } catch (e) {
          uploadError = e;
        }
      }
      clearPendingFilesWithRevoke();

      if (uploadError) {
        Alert.alert(
          "알림",
          formatAttachmentUploadFailureMessage(
            uploadError,
            "비용은 추가되었으나 첨부 파일 업로드에 실패했습니다",
          ),
        );
      } else {
        Alert.alert("성공", "비용이 추가되었습니다");
      }

      setExpenseForm({
        category: ExpenseCategory.FOOD,
        amount: 0,
        description: "",
        ex_date: getDefaultDate(),
        currency: ExpenseCurrency.KRW,
      });
      onClose();
      onExpenseAdd?.(newExpense);
    } catch (_error) {
        Alert.alert("알림", "비용 추가에 실패했습니다");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    aiState.resetAiState();
    clearPendingFilesWithRevoke();
    setExpenseForm({
      category: ExpenseCategory.ETC,
      amount: 0,
      description: "",
      ex_date: getDefaultDate(),
      currency: ExpenseCurrency.KRW,
    });
    onClose();
  };

  const aiState = useExpenseAi({
    pendingFiles,
    existingAttachments: [], 
    onUpdateForm: setExpenseForm,
  });

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.modalOverlay} onPress={handleClose}>
          <Pressable
            style={styles.modalContent}
            onPress={e => e.stopPropagation()}
          >
            <WarningBanner
              message={warningMessage}
              visible={showWarning}
              duration={3000}
              onHide={() => {
                setShowWarning(false);
                setWarningMessage("");
              }}
            />
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>비용 추가</Text>
                <Pressable style={styles.closeButton} onPress={handleClose}>
                  <XIcon width={16} height={16} />
                </Pressable>
              </View>
              <ExpenseForm 
                data={expenseForm} 
                onChange={setExpenseForm}                
                pendingFiles={pendingFiles}
                onPickImage={appendImage}
                onPickDocument={appendDocument}
                onRemovePending={removePendingAt}
                onAppendPendingFiles={
                  Platform.OS === "web"
                    ? files => setPendingFiles(p => [...p, ...files])
                    : undefined
                }
                isUploading={isUploading}
                isAiAnalyzing={aiState.isAiAnalyzing}
                onAiAnalyzePress={Platform.OS === "web" ? aiState.handleAiAnalyzePress : undefined}
                analyzeError={aiState.analyzeError}
                onRetryAnalyze={Platform.OS === "web" ? aiState.handleRetryAnalyze : undefined}
                isAiAnalyzeSuccess={aiState.isAiAnalyzeSuccess}
                isAiAnalyzePartial={aiState.isAiAnalyzePartial}
                analyzePartialMessage={aiState.analyzePartialMessage}
                aiFilledFields={aiState.aiFilledFields}
              />

              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleExpenseSubmit}
                  disabled={isSubmitting || isUploading || aiState.isAiAnalyzing}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {(isSubmitting || isUploading) && (
                      <ActivityIndicator size="small" color="white" />
                    )}
                    <Text style={styles.submitButtonText}>
                      {isSubmitting || isUploading ? "저장 중..." : "저장"}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
          {showDatePicker && (
            <View style={styles.calendarOverlay} pointerEvents="box-none">
              <BaseCalendar
                visible={showDatePicker}
                selectedDate={expenseForm.ex_date}
                onDayPress={day => {
                  setExpenseForm({ ...expenseForm, ex_date: day.dateString });
                  setShowDatePicker(false);
                }}
                onClose={() => setShowDatePicker(false)}
                style={styles.calendarPopup}
                hideButtons={true}
                autoCloseOnSelect={true}
              />
            </View>
          )}
        </Pressable>
      </Modal>
      <AiAnalyzeFailureModal
        visible={aiAnalyzeFailureVisible}
        message={aiAnalyzeFailureMessage}
        onClose={() => {
          setAiAnalyzeFailureVisible(false);
          setAiAnalyzeFailureMessage("");
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    width: "100%",
    maxWidth: 460,
    maxHeight: "90%",
    overflow: "hidden",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 20,
    gap: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.gray900,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20001,
    elevation: 10,
    pointerEvents: "box-none",
  },
  calendarPopup: {
    position: "absolute",
    top: "68%",
    left: "48%",
    marginTop: -150,
    marginLeft: -138,
    zIndex: 20002,
    elevation: 11,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.gray400,
    marginTop: 2,
    marginHorizontal: -2,
  },
  attachmentSection: {
    width: "100%",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    height: 50,
  },
  cancelButton: {
    backgroundColor: colors.gray300,
  },
  cancelButtonText: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.gray900,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.white,
  },
});
