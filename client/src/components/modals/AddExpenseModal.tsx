import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Modal, ScrollView, Platform } from 'react-native';
import { CategoryPicker } from '@/ui/components/pickers';
import dayjs from 'dayjs';
import { expensesApi } from '@/services/expenses';
import { ExpenseCategory, ExpenseCurrency, currencyLabels } from '@/types/expense';
import { useDate } from '@/contexts/DateContext';
import BaseCalendar from '@/components/popup/calendar/BaseCalendar';
import Input from '@/ui/components/input/Input';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens/radii';
import WarningBanner from '@/ui/components/toast/warning';
import XIcon from '../../../assets/x.svg';
import CalendarIcon from '../../../assets/calender.svg';
import AttachmentSection from '@/ui/components/attachmentSection';
import { useAttachmentUpload } from '@/hooks/useAttachmentUpload';
import { useFilePicker } from '@/hooks/useFilePicker';
import {
  PLAN_ENTITY_KIND,
  type AiDocumentItemDraft,
  type AiDocumentItemType,
  type LocalFile,
} from '@/types/api';
import type { AiAttachmentAnalyzeSelection } from '@/ui/components/attachmentSection.types';
import { formatAttachmentUploadFailureMessage } from '@/utils/crossPlatformAlert';
import { analyzeDocumentUpload } from '@/services/aiDocument';
import { buildAnalyzeUploadPayload } from '@/utils/attachmentAiAnalyze';
import AiAnalyzeFailureModal from '@/components/modals/AiAnalyzeFailureModal';

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
  onExpenseAdd 
}: AddExpenseModalProps) {
  const { selectedDate } = useDate();
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [pendingFiles, setPendingFiles] = useState<LocalFile[]>([]);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalyzeFailureVisible, setAiAnalyzeFailureVisible] = useState(false);
  const [aiAnalyzeFailureMessage, setAiAnalyzeFailureMessage] = useState('');

  const { pickImage, pickDocument } = useFilePicker();
  const { isUploading, uploadFiles } = useAttachmentUpload({
    planId,
    entityType: PLAN_ENTITY_KIND.EXPENSE,
  });

  const clearPendingFilesWithRevoke = useCallback(() => {
    setPendingFiles((prev) => {
      if (Platform.OS === 'web') {
        prev.forEach((f) => {
          if (f.uri?.startsWith('blob:')) {
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
    setPendingFiles((prev) => {
      const t = prev[index];
      if (Platform.OS === 'web' && t?.uri?.startsWith('blob:')) {
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
      if (f) setPendingFiles((p) => [...p, f]);
    } catch (e) {
      Alert.alert(
        '알림',
        e instanceof Error ? e.message : '파일을 선택하지 못했습니다.',
      );
    }
  };

  const appendDocument = async () => {
    try {
      const f = await pickDocument();
      if (f) setPendingFiles((p) => [...p, f]);
    } catch (e) {
      Alert.alert(
        '알림',
        e instanceof Error ? e.message : '파일을 선택하지 못했습니다.',
      );
    }
  };

  const getDefaultDate = () => planStartDate || selectedDate || dayjs().format('YYYY-MM-DD');

  const [expenseForm, setExpenseForm] = useState({
    category: ExpenseCategory.ETC,
    amount: 0,
    description: '',
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
          setAiAnalyzeFailureMessage(err || '분석에 실패했습니다.');
          setAiAnalyzeFailureVisible(true);
          return;
        }
        const kind: AiDocumentItemType | null =
          res.inferredItemType ?? res.draft?.itemType ?? null;
        if (kind !== 'expense') {
          const label =
            kind === 'flight'
              ? '항공'
              : kind === 'itinerary'
                ? '일정'
                : kind === 'accommodation'
                  ? '숙박'
                  : '다른 항목';
          setAiAnalyzeFailureMessage(
            `문서가 [${label}]으로 분석되었습니다. 비용 추가 화면에는 반영할 수 없습니다.`,
          );
          setAiAnalyzeFailureVisible(true);
          return;
        }
        if (!res.draft || res.draft.itemType !== 'expense') {
          setAiAnalyzeFailureMessage('비용 정보를 추출하지 못했습니다.');
          setAiAnalyzeFailureVisible(true);
          return;
        }
        const src = mergeExpenseDraftValueSource(res.draft);
        const categoryRaw = pickStrAi(src, ['category', 'Category']) || 'etc';
        const amountDigits = normalizeAmountDigitsAi(
          pickStrAi(src, ['amount', 'Amount']),
        );
        const amountNum = parseInt(amountDigits, 10) || 0;
        const description = pickStrAi(src, ['description', 'Description']);
        const exRaw = pickStrAi(src, ['exDate', 'ex_date', 'ExDate']);
        const currencyRaw = pickStrAi(src, ['currency', 'Currency']).toUpperCase();
        const currency = (Object.values(ExpenseCurrency) as string[]).includes(
          currencyRaw,
        )
          ? (currencyRaw as ExpenseCurrency)
          : ExpenseCurrency.KRW;

        setExpenseForm((prev) => ({
          ...prev,
          category: coerceExpenseCategoryAi(categoryRaw),
          amount: amountNum,
          description,
          ex_date:
            exRaw && dayjs(exRaw).isValid()
              ? dayjs(exRaw).format('YYYY-MM-DD')
              : prev.ex_date,
          currency,
        }));
      } catch (e) {
        setAiAnalyzeFailureMessage(
          e instanceof Error ? e.message : '분석 요청에 실패했습니다.',
        );
        setAiAnalyzeFailureVisible(true);
      } finally {
        setIsAiAnalyzing(false);
      }
    },
    [pendingFiles],
  );

  useEffect(() => {
    if (visible) {
      const defaultDate = planStartDate || selectedDate || dayjs().format('YYYY-MM-DD');
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
      setWarningMessage('여행을 먼저 선택해주세요.');
      setShowWarning(true);
      return;
    }

    if (expenseForm.amount <= 0) {
      setWarningMessage('금액을 입력해주세요.');
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
          '알림',
          formatAttachmentUploadFailureMessage(
            uploadError,
            '비용은 추가되었으나 첨부 파일 업로드에 실패했습니다.',
          ),
        );
      } else {
        Alert.alert('성공', '비용이 추가되었습니다.');
      }

      setExpenseForm({
        category: ExpenseCategory.FOOD,
        amount: 0,
        description: '',
        ex_date: getDefaultDate(),
        currency: ExpenseCurrency.KRW,
      });
      onClose();
      onExpenseAdd?.(newExpense);
    } catch (error) {
      Alert.alert('알림', '비용 추가에 실패했습니다.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsAiAnalyzing(false);
    setAiAnalyzeFailureVisible(false);
    setAiAnalyzeFailureMessage('');
    clearPendingFilesWithRevoke();
    setExpenseForm({
      category: ExpenseCategory.ETC,
      amount: 0,
      description: '',
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
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <WarningBanner
            message={warningMessage}
            visible={showWarning}
            duration={3000}
            onHide={() => {
              setShowWarning(false);
              setWarningMessage('');
            }}
          />
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            <View style={styles.modalHeader}>
              <View style={styles.titleContainer}>
                <Text style={styles.modalTitle}>비용 추가</Text>
              </View>
              <Pressable
                style={styles.closeButton}
                onPress={handleClose}
              >
                <XIcon width={24} height={24} />
              </Pressable>
            </View>
            
            <View style={styles.formSection}>
              <View style={[styles.inputGroup, styles.pickerWrapper, { zIndex: categoryOpen ? 10000 : 1 }]}>
                <Text style={styles.inputLabel}>카테고리</Text>
                <CategoryPicker
                  value={expenseForm.category}
                  onChange={(cat) => setExpenseForm({ ...expenseForm, category: cat })}
                  onOpen={() => setCategoryOpen(true)}
                  onClose={() => setCategoryOpen(false)}
                  containerStyle={styles.categoryPicker}
                />
              </View>

              <View style={styles.amountCurrencyRow}>
                <View style={[styles.inputGroup, styles.amountGroup]}>
                  <Text style={styles.inputLabel}>금액</Text>
                  <Input
                    variant="outlined"
                    placeholder={PLACEHOLDERS.expense.amount}
                    placeholderTextColor={colors.gray700}
                    value={expenseForm.amount.toString()}
                    onChangeText={(text) => setExpenseForm({ ...expenseForm, amount: parseInt(text) || 0 })}
                    keyboardType="numeric"
                    style={styles.amountInput}
                  />
                </View>

                <View style={[styles.inputGroup, styles.currencyGroup]}>
                  <Text style={styles.inputLabel}>통화</Text>
                  <View style={styles.currencyDisplay}>
                    <Text style={styles.currencyText}>
                    {currencyLabels[ExpenseCurrency.KRW]}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.inputGroup, styles.datePickerWrapper, { zIndex: showDatePicker ? 20000 : 1 }]}>
                <Text style={styles.inputLabel}>날짜</Text>
                <Pressable 
                  style={styles.dateInput} 
                  onPress={() => setShowDatePicker(!showDatePicker)}
                >
                  <View style={styles.dateTextContainer}>
                    <Text style={styles.dateText}>
                      {dayjs(expenseForm.ex_date).format('YYYY.MM.DD')}
                    </Text>
                    <View style={styles.iconWrapper}>
                      <CalendarIcon width={16} height={16} />
                    </View>
                  </View>
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>내용</Text>
                <Input
                  variant="outlined"
                  placeholder={PLACEHOLDERS.expense.descriptionForm}
                  placeholderTextColor={colors.gray600}
                  value={expenseForm.description}
                  onChangeText={(text) => setExpenseForm({ ...expenseForm, description: text })}
                  style={styles.descriptionInput}
                />
              </View>
            </View>

            <AttachmentSection
              style={styles.attachmentSection}
              showTopDivider
              pendingFiles={pendingFiles}
              onPickImage={appendImage}
              onPickDocument={appendDocument}
              onRemoveFile={removePendingAt}
              onAppendPendingFiles={
                Platform.OS === 'web'
                  ? (files) => setPendingFiles((p) => [...p, ...files])
                  : undefined
              }
              isUploading={isUploading}
              disabled={isSubmitting || isAiAnalyzing}
              onAiAnalyzePress={
                Platform.OS === 'web' ? handleAiAnalyzePress : undefined
              }
              isAiAnalyzing={isAiAnalyzing}
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
                <Text style={styles.submitButtonText}>저장</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
        {showDatePicker && (
          <View style={styles.calendarOverlay} pointerEvents="box-none">
            <BaseCalendar
              visible={showDatePicker}
              selectedDate={expenseForm.ex_date}
              onDayPress={(day) => {
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
      </View>
    </Modal>
    <AiAnalyzeFailureModal
      visible={aiAnalyzeFailureVisible}
      message={aiAnalyzeFailureMessage}
      onClose={() => {
        setAiAnalyzeFailureVisible(false);
        setAiAnalyzeFailureMessage('');
      }}
    />
    </>
  );
}

function pickStrAi(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const raw = obj[k];
    if (raw === undefined || raw === null) continue;
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  }
  return '';
}

function coerceExpenseCategoryAi(raw: string): ExpenseCategory {
  const v = raw.trim().toLowerCase();
  const all = Object.values(ExpenseCategory) as string[];
  if (all.includes(v)) return v as ExpenseCategory;
  return ExpenseCategory.ETC;
}

function normalizeAmountDigitsAi(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const integerPart = raw.split('.')[0];
  return integerPart.replace(/[^0-9]/g, '');
}

function mergeExpenseDraftValueSource(
  draft: Extract<AiDocumentItemDraft, { itemType: 'expense' }>,
): Record<string, unknown> {
  const raw = draft.payload.values;
  const base =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? ({ ...(raw as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  const nested = base.expense ?? base.Expense;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return { ...base, ...(nested as Record<string, unknown>) };
  }
  return base;
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '90%',
    overflow: 'visible',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  titleContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  modalTitle: {
    ...textStyles.h5,
    color: colors.black,
  },
  closeButton: {
    padding: spacing.xs,
    marginTop: -spacing.xs,
    marginRight: -spacing.xs,
  },
  formSection: {
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  inputLabel: {
    ...textStyles.h7,
    color: colors.black,
  },
  pickerWrapper: {
    position: 'relative',
    overflow: 'visible',
    zIndex: 1,
  },
  datePickerWrapper: {
    position: 'relative',
    overflow: 'visible',
  },
  categoryPicker: {
    height: 48
  },
  amountCurrencyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  amountGroup: {
    flex: 1,
  },
  currencyGroup: {
    flex: 1,
  },
  amountInput: {
    backgroundColor: colors.white,
    height: 48,
  },
  currencyDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 48,
    backgroundColor: colors.white,
  },
  currencyText: {
    ...textStyles.body4,
    color: colors.black,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 48,
    backgroundColor: colors.white,
  },
  dateTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateText: {
    ...textStyles.body4,
    color: colors.black,
  },
  iconWrapper: {
    marginTop: -2,
  },
  calendarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20001,
    elevation: 10,
    pointerEvents: 'box-none',
  },
  calendarPopup: {
    position: 'absolute',
    top: '68%',
    left: '48%',
    marginTop: -150,
    marginLeft: -138,
    zIndex: 20002,
    elevation: 11,
  },
  descriptionInput: {
    backgroundColor: colors.white,
    height: 48,
  },
  attachmentSection: {
    marginTop: spacing.lg,
    width: '100%',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  cancelButton: {
    backgroundColor: colors.gray300,
  },
  cancelButtonText: {
    ...textStyles.h6,
    color: colors.black,
    fontWeight: typography.weight.semibold,
  },
  submitButton: {
    backgroundColor: colors.gray900,
  },
  submitButtonText: {
    ...textStyles.h6,
    color: colors.white,
    fontWeight: typography.weight.semibold,
  },
});

