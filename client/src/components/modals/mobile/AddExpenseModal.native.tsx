import AiDocumentAnalyzeModal from "@/components/modals/mobile/AiDocumentAnalyzeModal";

const KIND_TO_LABEL: Record<string, string> = {
  itinerary: "일정",
  accommodation: "숙박",
  flight: "항공",
  expense: "비용",
};
import { useAttachmentUpload } from "@/hooks/useAttachmentUpload";
import { useFilePicker } from "@/hooks/useFilePicker";
import { useMe } from "@/hooks/useMe";
import { analyzeDocumentUpload } from "@/services/aiDocument";
import { attachmentsApi } from "@/services/attachments";
import { expensesApi } from "@/services/expenses";
import { type DocumentUploadAnalyzeResponse, type LocalFile, PLAN_ENTITY_KIND } from "@/types/api";
import type { Attachment, Expense } from "@/types/api";
import type { AiAttachmentAnalyzeSelection } from "@/ui/components/attachmentSection.types";
import { buildAnalyzeUploadPayload } from "@/utils/attachmentAiAnalyze";
import {
  ExpenseCategory,
  ExpenseCurrency,
  categoryLabels,
  currencyLabels,
} from "@/types/expense";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import ScalePressable from "@/ui/components/ScalePressable";
import CalendarModal from "@/ui/components/CalendarModal.native";
import AttachmentSection from "@/ui/components/attachmentSection.native";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { handleGuestPromptError } from "@/utils/guestPrompt";
import { MenuView } from "@react-native-menu/menu";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView, type KeyboardAwareScrollViewRef } from "react-native-keyboard-controller";
import CloseIcon from "../../../../assets/close_sm.svg";
import DownArrowIcon from "../../../../assets/down_arrow.svg";
import CalendarIcon from "../../../../assets/mobile_calendar_black.svg";

const CATEGORY_OPTIONS: ExpenseCategory[] = [
  ExpenseCategory.FOOD,
  ExpenseCategory.TRANSPORT,
  ExpenseCategory.ACTIVITY,
  ExpenseCategory.ACCOMMODATION,
  ExpenseCategory.FLIGHT,
  ExpenseCategory.SHOPPING,
  ExpenseCategory.ETC,
];

const CURRENCY_OPTIONS: ExpenseCurrency[] = [
  ExpenseCurrency.KRW,
  ExpenseCurrency.USD,
];

const formatAmount = (digits: string) =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

interface AddExpenseModalProps {
  visible: boolean;
  onClose?: (opts?: { fromSave?: boolean }) => void;
  planId: number;
  planStartDate?: string;
  planEndDate?: string;
  defaultExDate?: string;
  onExpenseAdd?: (expense: Expense) => void;
  expense?: Expense | null;
  onExpenseUpdate?: (expense: Expense) => void;
  onExpenseDelete?: () => void;
  pendingAiResult?: { result: DocumentUploadAnalyzeResponse; filename?: string; pendingFiles?: LocalFile[] } | null;
}

const normalizeAmount = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.replace(/[^0-9]/g, "");
};

export default function AddExpenseModal({
  visible,
  onClose,
  planId,
  planStartDate,
  planEndDate,
  defaultExDate,
  onExpenseAdd,
  expense,
  onExpenseUpdate,
  onExpenseDelete,
  pendingAiResult,
}: AddExpenseModalProps) {
  const isEdit = !!expense;
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [pendingFiles, setPendingFiles] = useState<LocalFile[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>(
    [],
  );
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const isSubmittingRef = useRef(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalyzeError, setAiAnalyzeError] = useState<string | null>(null);
  const [aiModalResult, setAiModalResult] = useState<DocumentUploadAnalyzeResponse | null>(null);
  const [aiAnalyzeFileName, setAiAnalyzeFileName] = useState<string | undefined>();
  const [lastAiSelection, setLastAiSelection] = useState<AiAttachmentAnalyzeSelection | null>(null);
  const aiCancelledRef = useRef(false);
  const formInitializedRef = useRef(false);

  const { pickImage, pickDocument } = useFilePicker();
  const { data: me } = useMe();
  const { isUploading, uploadFiles } = useAttachmentUpload({
    planId,
    entityType: PLAN_ENTITY_KIND.EXPENSE,
  });

  const getDefaultDate = () =>
    defaultExDate || planStartDate || dayjs().format("YYYY-MM-DD");

  const [formData, setFormData] = useState({
    category: ExpenseCategory.FOOD,
    amount: "",
    description: "",
    ex_date: getDefaultDate(),
    currency: ExpenseCurrency.KRW,
  });

  useEffect(() => {
    if (!visible) {
      formInitializedRef.current = false;
      setAiModalResult(null);
      setAiAnalyzeError(null);
      return;
    }
    if (formInitializedRef.current) return;
    formInitializedRef.current = true;

    if (expense) {
      setFormData({
        category: expense.category,
        amount: formatAmount(String(expense.amount)),
        description: expense.description ?? "",
        ex_date: dayjs(expense.exDate).format("YYYY-MM-DD"),
        currency: expense.currency,
      });
    } else {
      const date =
        defaultExDate || planStartDate || dayjs().format("YYYY-MM-DD");
      setFormData(prev => ({ ...prev, ex_date: date }));
    }
    setPendingFiles([]);
  }, [visible, defaultExDate, planStartDate, expense]);

  useEffect(() => {
    if (!visible || !expense || !planId) {
      setExistingAttachments([]);
      setIsLoadingAttachments(false);
      return;
    }
    let cancelled = false;
    setExistingAttachments([]);
    setIsLoadingAttachments(true);
    attachmentsApi
      .getAttachments(planId, "expense", expense.id)
      .then(list => {
        if (!cancelled) setExistingAttachments(list);
      })
      .catch(() => {
        if (!cancelled) setExistingAttachments([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAttachments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, expense, planId]);

  const handleRemoveExistingAttachment = async (attachmentId: number) => {
    try {
      await attachmentsApi.deleteAttachment(attachmentId);
      setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error) {
      if (handleGuestPromptError(error)) return;
      Alert.alert("알림", "첨부파일 삭제에 실패했습니다");
    }
  };

  useEffect(() => {
    if (visible && pendingAiResult) {
      const draft = pendingAiResult.result.draft;
      if (draft?.itemType === "expense") {
        const v = (draft.payload.values ?? {}) as Record<string, unknown>;
        const src = (v.expense ?? v.Expense ?? v) as Record<string, unknown>;
        const amountRaw = String(src.amount ?? src.Amount ?? "").replace(/[^0-9]/g, "");
        const desc = String(src.description ?? src.Description ?? "").trim();
        const cat = String(src.category ?? src.Category ?? "").trim();
        const dateRaw = String(src.exDate ?? src.ex_date ?? src.ExDate ?? "").trim();
        setFormData(prev => ({
          ...prev,
          ...(amountRaw ? { amount: amountRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ",") } : {}),
          ...(desc ? { description: desc } : {}),
          ...(cat && Object.values(ExpenseCategory).includes(cat as ExpenseCategory) ? { category: cat as ExpenseCategory } : {}),
          ...(dateRaw && dayjs(dateRaw).isValid() ? { ex_date: dayjs(dateRaw).format("YYYY-MM-DD") } : {}),
        }));
      }
      if (pendingAiResult.pendingFiles?.length) {
        setPendingFiles(pendingAiResult.pendingFiles);
      }
    }
  }, [visible, pendingAiResult]);

  const handleAiAnalyzePress = async (selection: AiAttachmentAnalyzeSelection) => {
    setAiAnalyzeError(null);
    setIsAiAnalyzing(true);
    setLastAiSelection(selection);
    aiCancelledRef.current = false;
    try {
      const { file, filename } = await buildAnalyzeUploadPayload(selection, {
        pendingFiles,
        existingAttachments,
      });
      setAiAnalyzeFileName(filename);
      const result = await analyzeDocumentUpload(file, { filename });
      if (aiCancelledRef.current) return;
      if (!result.success) {
        setAiAnalyzeError(result.error ?? "분석에 실패했습니다");
      } else {
        const inferredType = result.inferredItemType ?? result.draft?.itemType;
        if (inferredType && inferredType !== "expense") {
          setAiAnalyzeError(`문서가 [${KIND_TO_LABEL[inferredType] ?? inferredType}]으로 분석되었습니다. 비용 추가 화면에는 반영할 수 없습니다.`);
        } else {
          setAiModalResult(result);
        }
      }
    } catch {
      setAiAnalyzeError("분석 중 오류가 발생했습니다");
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleAmountChange = (text: string) => {
    const digits = normalizeAmount(text);
    setFormData(prev => ({ ...prev, amount: formatAmount(digits) }));
  };

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;

    if (!planId) {
      Alert.alert("알림", "여행을 먼저 선택해주세요");
      return;
    }

    const amountNum =
      Number.parseInt(normalizeAmount(formData.amount), 10) || 0;
    if (amountNum <= 0) {
      Alert.alert("알림", "금액을 입력해주세요");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      if (expense) {
        const updated = await expensesApi.updateExpense(expense.id, {
          category: formData.category,
          amount: amountNum,
          description: formData.description.trim(),
          exDate: formData.ex_date,
          currency: formData.currency,
        });
        if (pendingFiles.length > 0) {
          await uploadFiles(pendingFiles, expense.id);
        }
        setPendingFiles([]);
        onClose?.({ fromSave: true });
        onExpenseUpdate?.(updated);
        return;
      }
      const newExpense = await expensesApi.createExpense({
        planId,
        category: formData.category,
        amount: amountNum,
        description: formData.description.trim() || undefined,
        exDate: formData.ex_date,
        currency: formData.currency,
      });
      if (pendingFiles.length > 0) {
        await uploadFiles(pendingFiles, newExpense.id);
      }
      setFormData({
        category: ExpenseCategory.FOOD,
        amount: "",
        description: "",
        ex_date: getDefaultDate(),
        currency: ExpenseCurrency.KRW,
      });
      setPendingFiles([]);
      onClose?.({ fromSave: true });
      onExpenseAdd?.(newExpense);
    } catch {
      Alert.alert(
        "알림",
        expense ? "비용 수정에 실패했습니다" : "비용 추가에 실패했습니다",
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!expense) return;
    Alert.alert("비용 삭제", "이 비용을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          if (isSubmittingRef.current) return;
          isSubmittingRef.current = true;
          setIsSubmitting(true);
          try {
            await expensesApi.deleteExpense(expense.id);
            onClose?.({ fromSave: true });
            onExpenseDelete?.();
          } catch (error) {
            if (handleGuestPromptError(error)) return;
            Alert.alert("알림", "비용 삭제에 실패했습니다");
          } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  const handleClose = () => {
    setFormData({
      category: ExpenseCategory.FOOD,
      amount: "",
      description: "",
      ex_date: getDefaultDate(),
      currency: ExpenseCurrency.KRW,
    });
    setPendingFiles([]);
    onClose?.();
  };

  return (
  <>
    <BottomSheetModal visible={visible} onClose={handleClose} height={0.92}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isEdit ? "비용 수정" : "비용 추가"}</Text>
        <Pressable
          style={styles.closeButton}
          onPress={handleClose}
          hitSlop={8}
          accessibilityLabel="닫기"
        >
          <CloseIcon width={12} height={12} color={colors.paletteInk} />
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={40}
      >
        <View style={styles.inputGroup}>
          <Text style={styles.label}>카테고리</Text>
          <MenuView
            actions={CATEGORY_OPTIONS.map(cat => ({
              id: cat,
              title: categoryLabels[cat],
              state: formData.category === cat ? "on" : "off",
            }))}
            onPressAction={({ nativeEvent }) =>
              setFormData(prev => ({
                ...prev,
                category: nativeEvent.event as ExpenseCategory,
              }))
            }
          >
            <View style={styles.field}>
              <Text style={styles.fieldText}>
                {categoryLabels[formData.category]}
              </Text>
              <DownArrowIcon
                width={10}
                height={10}
                color={colors.paletteFg2}
                style={styles.fieldChevron}
              />
            </View>
          </MenuView>
        </View>

        <View style={styles.amountRow}>
          <View style={[styles.inputGroup, styles.amountColumn]}>
            <Text style={styles.label}>금액</Text>
            <TextInput
              value={formData.amount}
              onChangeText={handleAmountChange}
              placeholder="0"
              placeholderTextColor={colors.paletteFg3}
              keyboardType="number-pad"
              style={[styles.field, styles.singleLineInput]}
            />
          </View>
          <View style={[styles.inputGroup, styles.amountColumn]}>
            <Text style={styles.label}>통화</Text>
            <MenuView
              actions={CURRENCY_OPTIONS.map(currency => ({
                id: currency,
                title: currencyLabels[currency],
                state: formData.currency === currency ? "on" : "off",
              }))}
              onPressAction={({ nativeEvent }) =>
                setFormData(prev => ({
                  ...prev,
                  currency: nativeEvent.event as ExpenseCurrency,
                }))
              }
            >
              <View style={styles.field}>
                <Text style={styles.fieldText}>
                  {currencyLabels[formData.currency]}
                </Text>
                <DownArrowIcon
                  width={10}
                  height={10}
                  color={colors.paletteFg2}
                  style={styles.fieldChevron}
                />
              </View>
            </MenuView>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>날짜</Text>
          <Pressable
            style={[styles.field, styles.dateField]}
            onPress={() => setShowDatePicker(true)}
          >
            <CalendarIcon width={14} height={14} color={colors.paletteFg2} />
            <Text style={[styles.fieldText, styles.dateText]}>
              {dayjs(formData.ex_date).format("YYYY. MM. DD")}
            </Text>
          </Pressable>
          <CalendarModal
            visible={showDatePicker}
            selectedDate={formData.ex_date}
            onDayPress={day => {
              setFormData(prev => ({ ...prev, ex_date: day.dateString }));
              setShowDatePicker(false);
            }}
            onClose={() => setShowDatePicker(false)}
            minDate={planStartDate}
            maxDate={planEndDate}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>내용</Text>
          <TextInput
            value={formData.description}
            onChangeText={text =>
              setFormData(prev => ({ ...prev, description: text }))
            }
            placeholder="비용 설명을 입력하세요."
            placeholderTextColor={colors.paletteFg3}
            multiline
            textAlignVertical="top"
            style={[styles.field, styles.fieldText, styles.descriptionField]}
          />
        </View>

        <AttachmentSection
          variant="expense"
          pendingFiles={pendingFiles}
          existingAttachments={existingAttachments}
          onRemoveExisting={isEdit ? handleRemoveExistingAttachment : undefined}
          isLoadingExisting={isEdit && isLoadingAttachments}
          onPickImage={async () => {
            const file = await pickImage();
            if (file) {
              setPendingFiles(prev => [...prev, file]);
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
            }
          }}
          onPickDocument={async () => {
            const file = await pickDocument();
            if (file) {
              setPendingFiles(prev => [...prev, file]);
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
            }
          }}
          onRemoveFile={index =>
            setPendingFiles(prev => prev.filter((_, i) => i !== index))
          }
          isUploading={isUploading}
          isGuest={!me}
          showTopDivider
          onAiAnalyzePress={handleAiAnalyzePress}
          isAiAnalyzing={isAiAnalyzing}
          onCancelAiAnalyze={() => {
            aiCancelledRef.current = true;
            setIsAiAnalyzing(false);
          }}
          analyzeError={aiAnalyzeError}
          onRetryAnalyze={() => lastAiSelection && handleAiAnalyzePress(lastAiSelection)}
          isAiAnalyzeSuccess={!!aiModalResult?.success && !aiAnalyzeError}
        />
      </KeyboardAwareScrollView>

      <View style={styles.footer}>
        {isEdit && (
          <ScalePressable
            style={[
              styles.deleteButton,
              (isSubmitting || isUploading) && styles.saveButtonDisabled,
            ]}
            onPress={handleDelete}
            disabled={isSubmitting || isUploading}
          >
            <Text style={styles.deleteButtonText}>삭제</Text>
          </ScalePressable>
        )}
        <ScalePressable
          style={[
            styles.saveButton,
            (isSubmitting || isUploading) && styles.saveButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || isUploading}
        >
          <Text style={styles.saveButtonText}>
            {isSubmitting ? "저장 중..." : isEdit ? "수정 완료" : "비용 저장"}
          </Text>
        </ScalePressable>
      </View>
    </BottomSheetModal>
    <AiDocumentAnalyzeModal
      visible={!!aiModalResult}
      onClose={() => setAiModalResult(null)}
      entityTypeLabel="비용"
      originEntityType="비용"
      analyzeResult={aiModalResult}
      analyzeFileName={aiAnalyzeFileName}
      onApply={draft => {
        if (draft) {
          const v = (draft.payload.values ?? {}) as Record<string, unknown>;
          const src = (v.expense ?? v.Expense ?? v) as Record<string, unknown>;
          const amountRaw = String(src.amount ?? src.Amount ?? "").replace(/[^0-9]/g, "");
          if (amountRaw) {
            const formatted = amountRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            setFormData(prev => ({ ...prev, amount: formatted }));
          }
          const desc = String(src.description ?? src.Description ?? "").trim();
          if (desc) setFormData(prev => ({ ...prev, description: desc }));
          const cat = String(src.category ?? src.Category ?? "").trim();
          if (cat && Object.values(ExpenseCategory).includes(cat as ExpenseCategory)) {
            setFormData(prev => ({ ...prev, category: cat as ExpenseCategory }));
          }
          const dateRaw = String(src.exDate ?? src.ex_date ?? src.ExDate ?? "").trim();
          if (dateRaw && dayjs(dateRaw).isValid()) {
            setFormData(prev => ({ ...prev, ex_date: dayjs(dateRaw).format("YYYY-MM-DD") }));
          }
        }
        setAiModalResult(null);
      }}
    />
  </>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    ...textStyles.h4,
    color: colors.paletteInk,
  },
  closeButton: {
    position: "absolute",
    right: spacing.lgPlus,
    top: spacing.md - 1,
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.paletteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...textStyles.h8,
    color: colors.paletteInk,
    marginBottom: spacing.sm,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.mdPlus,
    backgroundColor: colors.paletteFill,
  },
  fieldText: {
    ...textStyles.body4,
    color: colors.paletteInk,
  },
  singleLineInput: {
    height: 44,
    paddingVertical: 0,
    fontFamily: textStyles.body4.fontFamily,
    fontSize: textStyles.body4.fontSize,
    color: colors.paletteInk,
  },
  fieldChevron: {
    marginLeft: "auto",
  },
  amountRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  amountColumn: {
    flex: 1,
  },
  dateField: {
    gap: spacing.sm,
  },
  dateText: {
    fontVariant: ["tabular-nums"],
  },
  descriptionField: {
    minHeight: 80,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.paletteFill,
    backgroundColor: colors.white,
  },
  deleteButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    borderRadius: radii.lgPlus,
    backgroundColor: colors.dangerTint,
  },
  deleteButtonText: {
    ...textStyles.h5,
    color: colors.danger,
  },
  saveButton: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    borderRadius: radii.lgPlus,
    backgroundColor: colors.paletteInk,
    experimental_backgroundImage: `linear-gradient(180deg, ${colors.gradientInk[0]} 0%, ${colors.gradientInk[1]} 100%)`,
    ...shadows.darkRaised,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...textStyles.h5,
    color: colors.white,
  },
});
