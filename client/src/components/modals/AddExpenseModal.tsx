import AiAnalyzeFailureModal from "@/components/modals/AiAnalyzeFailureModal";
import BaseCalendar from "@/components/popup/calendar/BaseCalendar";
import { PLACEHOLDERS } from "@/constants/placeholders";
import { useDate } from "@/contexts/DateContext";
import { useAttachmentUpload } from "@/hooks/useAttachmentUpload";
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
import CurrencyToggle from "@/ui/components/CurrencyToggle";
import AttachmentSection from "@/ui/components/attachmentSection";
import type { AiAttachmentAnalyzeSelection } from "@/ui/components/attachmentSection.types";
import { pendingAiFileKey } from "@/ui/components/attachmentSection.types";
import Input from "@/ui/components/input/Input";
import { CategoryPicker } from "@/ui/components/pickers";
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
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalyzeFailureVisible, setAiAnalyzeFailureVisible] = useState(false);
  const [aiAnalyzeFailureMessage, setAiAnalyzeFailureMessage] = useState("");
  const [attachmentAnalyzeError, setAttachmentAnalyzeError] = useState<
    string | null
  >(null);
  const [attachmentAnalyzeSuccess, setAttachmentAnalyzeSuccess] =
    useState(false);
  const [attachmentAnalyzePartial, setAttachmentAnalyzePartial] =
    useState(false);
  const [attachmentAnalyzePartialMessage, setAttachmentAnalyzePartialMessage] =
    useState<string | undefined>(undefined);
  const [aiFilledFields, setAiFilledFields] = useState<ReadonlySet<string>>(
    new Set(),
  );

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

  const handleAiAnalyzePress = useCallback(
    async (selection: AiAttachmentAnalyzeSelection) => {
      setIsAiAnalyzing(true);
      try {
        const payload = await buildAnalyzeUploadPayload(selection, {
          pendingFiles,
          existingAttachments: [],
        });
        const res = await analyzeDocumentUpload(payload.file, {
          filename: payload.filename,
        });
        const err = res.error?.trim();
        if (!res.success || err) {
          setAttachmentAnalyzeError(
            "분석 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요",
          );
          return;
        }
        const kind: AiDocumentItemType | null =
          res.inferredItemType ?? res.draft?.itemType ?? null;
        if (kind !== "expense") {
          const label =
            kind === "flight"
              ? "항공"
              : kind === "itinerary"
                ? "일정"
                : kind === "accommodation"
                  ? "숙박"
                  : "다른 항목";
          setAttachmentAnalyzeError(
            `문서가 [${label}]으로 분석되었습니다. 비용 추가 화면에는 반영할 수 없습니다`,
          );
          return;
        }
        if (!res.draft || res.draft.itemType !== "expense") {
          setAttachmentAnalyzeError(
            "이미지에서 금액·날짜를 읽지 못했어요. 더 선명한 영수증으로 다시 시도해 주세요",
          );
          return;
        }
        setAttachmentAnalyzeError(null);
        const src = mergeExpenseDraftValueSource(res.draft);
        const filledSet = new Set<string>(["category"]);
        const amountExtracted =
          Number.parseInt(
            normalizeAmountDigitsAi(pickStrAi(src, ["amount", "Amount"])),
            10,
          ) > 0;
        const descriptionExtracted = !!pickStrAi(src, [
          "description",
          "Description",
        ]);
        const exRawCheck = pickStrAi(src, ["exDate", "ex_date", "ExDate"]);
        const dateExtracted = !!(exRawCheck && dayjs(exRawCheck).isValid());
        if (amountExtracted) filledSet.add("amount");
        if (descriptionExtracted) filledSet.add("description");
        if (dateExtracted) filledSet.add("ex_date");
        setAiFilledFields(filledSet);
        const isPartial =
          !amountExtracted || !descriptionExtracted || !dateExtracted;
        if (isPartial) {
          setAttachmentAnalyzeSuccess(false);
          setAttachmentAnalyzePartial(true);
          setAttachmentAnalyzePartialMessage(
            "일부 항목을 인식하지 못했어요. 확인 필요 항목을 직접 입력해 주세요",
          );
        } else {
          setAttachmentAnalyzeSuccess(true);
          setAttachmentAnalyzePartial(false);
          setAttachmentAnalyzePartialMessage(undefined);
        }
        const categoryRaw = pickStrAi(src, ["category", "Category"]) || "etc";
        const amountDigits = normalizeAmountDigitsAi(
          pickStrAi(src, ["amount", "Amount"]),
        );
        const amountNum = Number.parseInt(amountDigits, 10) || 0;
        const description = pickStrAi(src, ["description", "Description"]);
        const exRaw = pickStrAi(src, ["exDate", "ex_date", "ExDate"]);
        const currencyRaw = pickStrAi(src, [
          "currency",
          "Currency",
        ]).toUpperCase();
        const currency = (Object.values(ExpenseCurrency) as string[]).includes(
          currencyRaw,
        )
          ? (currencyRaw as ExpenseCurrency)
          : ExpenseCurrency.KRW;

        setExpenseForm(prev => ({
          ...prev,
          category: coerceExpenseCategoryAi(categoryRaw),
          amount: amountNum,
          description,
          ex_date:
            exRaw && dayjs(exRaw).isValid()
              ? dayjs(exRaw).format("YYYY-MM-DD")
              : prev.ex_date,
          currency,
        }));
      } catch (_e) {
        setAttachmentAnalyzeError(
          "분석 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요",
        );
      } finally {
        setIsAiAnalyzing(false);
      }
    },
    [pendingFiles],
  );

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

  const handleRetryAnalyze = useCallback(() => {
    if (pendingFiles.length === 0) return;
    setAttachmentAnalyzeError(null);
    setAttachmentAnalyzeSuccess(false);
    setAttachmentAnalyzePartial(false);
    setAttachmentAnalyzePartialMessage(undefined);
    setAiFilledFields(new Set());
    void handleAiAnalyzePress({
      kind: "pending",
      key: pendingAiFileKey(pendingFiles[0]),
    });
  }, [pendingFiles, handleAiAnalyzePress]);

  const handleClose = () => {
    setIsAiAnalyzing(false);
    setAiAnalyzeFailureVisible(false);
    setAiAnalyzeFailureMessage("");
    setAttachmentAnalyzeError(null);
    setAttachmentAnalyzeSuccess(false);
    setAttachmentAnalyzePartial(false);
    setAttachmentAnalyzePartialMessage(undefined);
    setAiFilledFields(new Set());
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

              <View style={styles.formSection}>
                <View
                  style={[
                    styles.inputGroup,
                    styles.pickerWrapper,
                    { zIndex: categoryOpen ? 10000 : 1 },
                  ]}
                >
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>카테고리</Text>
                    {aiFilledFields.has("category") && <AiFilledBadge />}
                  </View>
                  <CategoryPicker
                    value={expenseForm.category}
                    onChange={cat =>
                      setExpenseForm({ ...expenseForm, category: cat })
                    }
                    onOpen={() => setCategoryOpen(true)}
                    onClose={() => setCategoryOpen(false)}
                    style={styles.categoryPickerTrigger}
                    triggerTextStyle={styles.categoryPickerText}
                    dropDownContainerStyle={styles.categoryPickerDropdown}
                    iconSize={14}
                  />
                </View>

                <View style={styles.amountCurrencyRow}>
                  <View style={[styles.inputGroup, styles.amountGroup]}>
                    <View style={styles.labelRow}>
                      <Text style={styles.inputLabel}>금액</Text>
                      {aiFilledFields.has("amount") ? (
                        <AiFilledBadge />
                      ) : attachmentAnalyzeSuccess ||
                        attachmentAnalyzePartial ? (
                        <NeedsCheckBadge />
                      ) : null}
                    </View>
                    <Input
                      variant="outlined"
                      placeholder={PLACEHOLDERS.expense.amount}
                      placeholderTextColor={colors.gray700}
                      value={expenseForm.amount.toString()}
                      onChangeText={text =>
                        setExpenseForm({
                          ...expenseForm,
                          amount: Number.parseInt(text) || 0,
                        })
                      }
                      keyboardType="numeric"
                      style={styles.amountInput}
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.currencyGroup]}>
                    <Text style={styles.inputLabel}>통화</Text>
                    <CurrencyToggle
                      value={expenseForm.currency}
                      onChange={c =>
                        setExpenseForm({ ...expenseForm, currency: c })
                      }
                      variant="outlined"
                      style={styles.currencyToggle}
                    />
                  </View>
                </View>

                <View
                  style={[
                    styles.inputGroup,
                    styles.datePickerWrapper,
                    { zIndex: showDatePicker ? 20000 : 1 },
                  ]}
                >
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>날짜</Text>
                    {aiFilledFields.has("ex_date") ? (
                      <AiFilledBadge />
                    ) : attachmentAnalyzeSuccess || attachmentAnalyzePartial ? (
                      <NeedsCheckBadge />
                    ) : null}
                  </View>
                  <Pressable
                    style={styles.dateInput}
                    onPress={() => setShowDatePicker(!showDatePicker)}
                  >
                    <View style={styles.dateTextContainer}>
                      <Text style={styles.dateText}>
                        {dayjs(expenseForm.ex_date).format("YYYY.MM.DD")}
                      </Text>
                      <View style={styles.iconWrapper}>
                        <CalendarIcon width={16} height={16} />
                      </View>
                    </View>
                  </Pressable>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>내용</Text>
                    {aiFilledFields.has("description") ? (
                      <AiFilledBadge />
                    ) : attachmentAnalyzeSuccess || attachmentAnalyzePartial ? (
                      <NeedsCheckBadge />
                    ) : null}
                  </View>
                  <Input
                    variant="outlined"
                    placeholder={PLACEHOLDERS.expense.descriptionForm}
                    placeholderTextColor={colors.gray600}
                    value={expenseForm.description}
                    onChangeText={text =>
                      setExpenseForm({ ...expenseForm, description: text })
                    }
                    style={styles.descriptionInput}
                  />
                </View>
              </View>

              <View style={styles.sectionDivider} />

              <AttachmentSection
                variant="expense"
                style={styles.attachmentSection}
                showTopDivider
                pendingFiles={pendingFiles}
                onPickImage={appendImage}
                onPickDocument={appendDocument}
                onRemoveFile={removePendingAt}
                onAppendPendingFiles={
                  Platform.OS === "web"
                    ? files => setPendingFiles(p => [...p, ...files])
                    : undefined
                }
                isUploading={isUploading}
                disabled={isSubmitting || isAiAnalyzing}
                onAiAnalyzePress={
                  Platform.OS === "web" ? handleAiAnalyzePress : undefined
                }
                isAiAnalyzing={isAiAnalyzing}
                analyzeError={attachmentAnalyzeError}
                onRetryAnalyze={
                  Platform.OS === "web" ? handleRetryAnalyze : undefined
                }
                isAiAnalyzeSuccess={attachmentAnalyzeSuccess}
                isAiAnalyzePartial={attachmentAnalyzePartial}
                analyzePartialMessage={attachmentAnalyzePartialMessage}
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
                  disabled={isSubmitting || isUploading || isAiAnalyzing}
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

function pickStrAi(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const raw = obj[k];
    if (raw === undefined || raw === null) continue;
    if (typeof raw === "string") return raw;
    if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  }
  return "";
}

function coerceExpenseCategoryAi(raw: string): ExpenseCategory {
  const v = raw.trim().toLowerCase();
  const all = Object.values(ExpenseCategory) as string[];
  if (all.includes(v)) return v as ExpenseCategory;
  return ExpenseCategory.ETC;
}

function normalizeAmountDigitsAi(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const integerPart = raw.split(".")[0];
  return integerPart.replace(/[^0-9]/g, "");
}

function mergeExpenseDraftValueSource(
  draft: Extract<AiDocumentItemDraft, { itemType: "expense" }>,
): Record<string, unknown> {
  const raw = draft.payload.values;
  const base =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? ({ ...(raw as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  const nested = base.expense ?? base.Expense;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return { ...base, ...(nested as Record<string, unknown>) };
  }
  return base;
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
  formSection: {
    gap: 18,
  },
  inputGroup: {
    gap: 9,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inputLabel: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.gray900,
  },
  pickerWrapper: {
    position: "relative",
    overflow: "visible",
    zIndex: 1,
  },
  datePickerWrapper: {
    position: "relative",
    overflow: "visible",
  },
  categoryPickerDropdown: {
    top: 56,
    backgroundColor: colors.gray200,
  },
  categoryPickerTrigger: {
    backgroundColor: colors.gray200,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  categoryPickerText: {
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.gray900,
  },
  amountCurrencyRow: {
    flexDirection: "row",
    gap: 12,
  },
  amountGroup: {
    flex: 1,
  },
  currencyGroup: {
    flex: 1,
  },
  amountInput: {
    backgroundColor: colors.gray200,
    borderWidth: 0,
    height: 50,
  },
  currencyToggle: {
    height: 50,
    backgroundColor: colors.gray200,
    borderWidth: 0,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    backgroundColor: colors.gray200,
  },
  dateTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dateText: {
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.gray900,
  },
  iconWrapper: {
    marginTop: -2,
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
  descriptionInput: {
    backgroundColor: colors.gray200,
    borderWidth: 0,
    height: 50,
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
