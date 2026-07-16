import AiAnalyzeErrorBanner from "@/components/AiAnalyzeErrorBanner";
import AiDocumentAnalyzeModal from "@/components/modals/AiDocumentAnalyzeModal";
import BaseCalendar from "@/components/popup/calendar/BaseCalendar";
import { PLACEHOLDERS } from "@/constants/placeholders";
import { useAttachmentUpload } from "@/hooks/useAttachmentUpload";
import { useFilePicker } from "@/hooks/useFilePicker";
import { analyzeDocumentUpload } from "@/services/aiDocument";
import { attachmentsApi } from "@/services/attachments";
import { expensesApi } from "@/services/expenses";
import { itinerariesApi } from "@/services/itineraries";
import type {
  AiDocumentItemDraft,
  Attachment,
  DocumentUploadAnalyzeResponse,
  LocalFile,
  StagedDocumentAnalyzePayload,
} from "@/types/api";
import {
  ExpenseCategory,
  ExpenseCurrency,
  categoryColors,
  categoryLabels,
} from "@/types/expense";
import CurrencyToggle from "@/ui/components/CurrencyToggle";
import AttachmentSection from "@/ui/components/attachmentSection";
import type { AiAttachmentAnalyzeSelection } from "@/ui/components/attachmentSection.types";
import { pendingAiFileKey } from "@/ui/components/attachmentSection.types";
import Input from "@/ui/components/input/Input";
import {
  CategoryPicker,
  CityPicker,
  CountryPicker,
  TimePicker,
} from "@/ui/components/pickers";
import WarningBanner from "@/ui/components/toast/warning";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { applyItineraryDraftFromAi } from "@/utils/applyAiDocumentDraft";
import { buildAnalyzeUploadPayload } from "@/utils/attachmentAiAnalyze";
import {
  formatAttachmentUploadFailureMessage,
  showMessage,
} from "@/utils/crossPlatformAlert";
import { handleGuestPromptError } from "@/utils/guestPrompt";
import dayjs from "dayjs";
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import CalendarIcon from "../../../../assets/calender.svg";
import CloseIcon from "../../../../assets/close_sm.svg";
import PanelTabSwitcher from "../PanelTabSwitcher";
import { extendPlanIfNeeded } from "@/utils/extendPlanIfNeeded";

function getCountryCityFromSegments(
  segments:
    | { startDate: string; endDate: string; country: string; city: string }[]
    | undefined
    | null,
  date: string,
) {
  if (!segments || !date) return null;
  const matches = segments.filter(
    s => s.startDate <= date && date <= s.endDate,
  );
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1];
  return { country: last.country, city: last.city };
}

interface ItineraryItemProps {
  itinerary?: any;
  planId: number;
  planData?: any;
  onSave: (itinerary: any) => void;
  onCancel: () => void;
  onDelete?: (itineraryId: string) => void;
  selectedDate?: Date;
  onShowWarning?: () => void;
  readOnly?: boolean;
  onEdit?: () => void;
  activeTab?: "itinerary" | "flight" | "accommodation";
  onTabChange?: (tab: "itinerary" | "flight" | "accommodation") => void;
  stagedDocumentAnalyze?: StagedDocumentAnalyzePayload | null;
  onConsumeStagedDocumentAnalyze?: () => void;
  routeDocumentAnalyzeSuccess?: (
    res: DocumentUploadAnalyzeResponse,
    carryPendingFiles?: LocalFile[],
    originEntityType?: string,
  ) => boolean;
  carryoverPendingFiles?: LocalFile[] | null;
  onConsumeCarryoverPendingFiles?: () => void;
}

export default function ItineraryItem({
  itinerary,
  planId,
  planData,
  onSave,
  onCancel,
  onDelete,
  selectedDate,
  onShowWarning,
  readOnly = false,
  onEdit,
  activeTab,
  onTabChange,
  stagedDocumentAnalyze,
  onConsumeStagedDocumentAnalyze,
  routeDocumentAnalyzeSuccess,
  carryoverPendingFiles,
  onConsumeCarryoverPendingFiles,
}: ItineraryItemProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [formData, setFormData] = useState({
    title: itinerary?.title || "",
    description: itinerary?.description || "",
    country: itinerary?.country || "",
    city: itinerary?.city || "",
    location: itinerary?.location || "",
    itineraryDate:
      itinerary?.itinerary_date ||
      (selectedDate
        ? dayjs(selectedDate).format("YYYY-MM-DD")
        : dayjs().format("YYYY-MM-DD")),
    startTime:
      itinerary?.start_time ||
      (selectedDate ? dayjs(selectedDate).format("HH:mm") : "09:00"),
    endTime:
      itinerary?.end_time ||
      (selectedDate
        ? dayjs(selectedDate).add(1, "hour").format("HH:mm")
        : "10:00"),
  });

  React.useEffect(() => {
    if (selectedDate && !itinerary) {
      const dateStr = dayjs(selectedDate).format("YYYY-MM-DD");
      const autoFill = getCountryCityFromSegments(
        planData?.plan?.segments,
        dateStr,
      );
      setFormData(prev => ({
        ...prev,
        itineraryDate: dateStr,
        startTime: dayjs(selectedDate).format("HH:mm"),
        endTime: dayjs(selectedDate).add(1, "hour").format("HH:mm"),
        ...(autoFill ? { country: autoFill.country, city: autoFill.city } : {}),
      }));
    }
  }, [selectedDate, itinerary]);

  React.useEffect(() => {
    if (!itinerary && !readOnly && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("itinerary-preview-update", {
          detail: {
            title: formData.title || "제목없음",
            startTime: formData.startTime,
            endTime: formData.endTime,
            location: formData.location,
            itineraryDate: formData.itineraryDate,
          },
        }),
      );
    }
  }, [formData, itinerary, readOnly]);

  const [countryOpen, setCountryOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    category: ExpenseCategory.ETC,
    amount: 0,
    description: "",
    currency: ExpenseCurrency.KRW,
  });
  const [expenses, setExpenses] = useState<any[]>([]);

  const [draftExpenses, setDraftExpenses] = useState<any[]>([]);

  const [pendingFiles, setPendingFiles] = useState<LocalFile[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>(
    [],
  );
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);

  const [aiAnalyzeModalVisible, setAiAnalyzeModalVisible] = useState(false);
  const [aiAnalyzeResult, setAiAnalyzeResult] =
    useState<DocumentUploadAnalyzeResponse | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalyzeInlineError, setAiAnalyzeInlineError] = useState(false);
  const [aiAnalyzeInlineErrorMessage, setAiAnalyzeInlineErrorMessage] =
    useState("");
  const [aiAnalyzeSizeErrorMessage, setAiAnalyzeSizeErrorMessage] =
    useState("");
  const [lastAiSelection, setLastAiSelection] =
    useState<AiAttachmentAnalyzeSelection | null>(null);
  const [lastAnalyzeFileName, setLastAnalyzeFileName] = useState<string | null>(
    null,
  );
  const lastHandledAiAnalyzeSeqRef = useRef<number | null>(null);
  const aiAnalyzeCancelledRef = useRef(false);

  const [analyzeOriginEntityType, setAnalyzeOriginEntityType] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    if (!stagedDocumentAnalyze) return;
    const kind =
      stagedDocumentAnalyze.result.inferredItemType ??
      stagedDocumentAnalyze.result.draft?.itemType;
    if (kind !== "itinerary") return;
    if (readOnly) return;
    const { seq, result, originEntityType } = stagedDocumentAnalyze;
    if (lastHandledAiAnalyzeSeqRef.current === seq) return;
    lastHandledAiAnalyzeSeqRef.current = seq;
    setAnalyzeOriginEntityType(originEntityType);
    setAiAnalyzeResult(result);
    setAiAnalyzeModalVisible(true);
  }, [stagedDocumentAnalyze, readOnly]);

  const { pickImage, pickDocument } = useFilePicker();
  const { isUploading, uploadFiles } = useAttachmentUpload({
    planId,
    entityType: "itinerary",
  });

  const itineraryAttachmentEntityId = useMemo(() => {
    const raw = itinerary?.id;
    if (raw == null || raw === "") return undefined;
    const n = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
    return Number.isFinite(n) ? n : undefined;
  }, [itinerary?.id]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (itinerary) {
      const endTimeRaw = itinerary.end_time || itinerary.endTime || "10:00";
      let endTime = endTimeRaw.substring(0, 5);
      if (endTime === "23:59" || endTimeRaw.startsWith("23:59:")) {
        endTime = "24:00";
      }

      setFormData({
        title: itinerary.title || "",
        description: itinerary.description || "",
        country: itinerary.country || "",
        city: itinerary.city || "",
        location: itinerary.location || "",
        itineraryDate:
          itinerary.itinerary_date ||
          itinerary.itineraryDate ||
          dayjs().format("YYYY-MM-DD"),
        startTime: (
          itinerary.start_time ||
          itinerary.startTime ||
          "09:00"
        ).substring(0, 5),
        endTime: endTime,
      });
    } else {
      const defaultDate = selectedDate
        ? dayjs(selectedDate).format("YYYY-MM-DD")
        : dayjs().format("YYYY-MM-DD");
      const defaultStartTime = selectedDate
        ? dayjs(selectedDate).format("HH:mm")
        : "09:00";
      const defaultEndTime = selectedDate
        ? dayjs(selectedDate).add(1, "hour").format("HH:mm")
        : "10:00";

      const autoFill = getCountryCityFromSegments(
        planData?.plan?.segments,
        defaultDate,
      );
      setFormData({
        title: "",
        description: "",
        country: autoFill?.country || "",
        city: autoFill?.city || "",
        location: "",
        itineraryDate: defaultDate,
        startTime: defaultStartTime,
        endTime: defaultEndTime,
      });

      setExpenses([]);
      setDraftExpenses([]);
      setShowExpenseForm(false);
      setExpenseForm({
        category: ExpenseCategory.ETC,
        amount: 0,
        description: "",
        currency: ExpenseCurrency.KRW,
      });
      setPendingFiles([]);
    }
  }, [itinerary, selectedDate]);

  useEffect(() => {
    const loadExpenses = async () => {
      if (itinerary?.id) {
        const cachedExpenses =
          planData?.expenses?.filter(
            (e: any) => e.itineraryId === itinerary.id,
          ) || [];

        if (cachedExpenses.length > 0) {
          setExpenses(cachedExpenses);
        } else {
          try {
            const itineraryExpenses = await expensesApi.getExpensesByItinerary(
              itinerary.id,
            );
            setExpenses(itineraryExpenses);
          } catch (_error) {}
        }
      } else {
        setExpenses([]);
      }
    };

    loadExpenses();
  }, [itinerary?.id, planData?.expenses]);

  useEffect(() => {
    const id = itineraryAttachmentEntityId;
    if (id == null) {
      setExistingAttachments([]);
      setIsLoadingAttachments(false);
      return;
    }
    let cancelled = false;
    setExistingAttachments([]);
    setIsLoadingAttachments(true);
    attachmentsApi
      .getAttachments(planId, "itinerary", id)
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
  }, [itineraryAttachmentEntityId, planId]);

  useEffect(() => {
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
  }, [itineraryAttachmentEntityId]);

  useEffect(() => {
    if (readOnly) {
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
    }
  }, [readOnly]);

  useEffect(() => {
    if (!carryoverPendingFiles?.length) return;
    setPendingFiles(prev => {
      const keys = new Set(prev.map(pendingAiFileKey));
      const merged = [...prev];
      for (const f of carryoverPendingFiles) {
        const k = pendingAiFileKey(f);
        if (!keys.has(k)) {
          keys.add(k);
          merged.push(f);
        }
      }
      return merged;
    });
    onConsumeCarryoverPendingFiles?.();
  }, [carryoverPendingFiles, onConsumeCarryoverPendingFiles]);

  const appendImage = async () => {
    try {
      const f = await pickImage();
      if (f) setPendingFiles(p => [...p, f]);
    } catch (e) {
      showMessage(
        "알림",
        e instanceof Error ? e.message : "파일을 선택하지 못했습니다.",
      );
    }
  };

  const appendDocument = async () => {
    try {
      const f = await pickDocument();
      if (f) setPendingFiles(p => [...p, f]);
    } catch (e) {
      showMessage(
        "알림",
        e instanceof Error ? e.message : "파일을 선택하지 못했습니다.",
      );
    }
  };

  const removePendingAt = (index: number) => {
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
  };

  const handleRemoveExistingAttachment = async (attachmentId: number) => {
    try {
      await attachmentsApi.deleteAttachment(attachmentId);
      setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error) {
      if (handleGuestPromptError(error)) return;
      showMessage("알림", "첨부파일 삭제에 실패했습니다.");
    }
  };

  /** 읽기 전용: 첨부가 없으면 섹션 숨김. 로딩 중이거나 목록이 있으면 표시 */
  const showAttachmentSection =
    !readOnly ||
    (readOnly &&
      itineraryAttachmentEntityId != null &&
      existingAttachments.length > 0);

  const handleSave = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    if (
      !formData.title.trim() ||
      !formData.itineraryDate ||
      !formData.startTime ||
      !formData.endTime
    ) {
      setWarningMessage("입력되지 않은 값이 있어요.");
      setShowWarning(true);
      onShowWarning?.();
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const finalEndTime =
        formData.endTime === "24:00" ? "23:59:59" : formData.endTime;

      let savedItinerary;
      if (itinerary) {
        savedItinerary = await itinerariesApi.updateItinerary(itinerary.id, {
          title: formData.title,
          description: formData.description,
          country: formData.country?.trim() || undefined,
          city: formData.city?.trim() || undefined,
          location: formData.location,
          itineraryDate: formData.itineraryDate,
          startTime: formData.startTime,
          endTime: finalEndTime,
        });

        const originalDate =
          itinerary.itinerary_date || itinerary.itineraryDate;
        const newDate = formData.itineraryDate;
        if (
          originalDate &&
          newDate &&
          dayjs(originalDate).format("YYYY-MM-DD") !==
            dayjs(newDate).format("YYYY-MM-DD")
        ) {
          const cachedExpenses =
            planData?.expenses?.filter(
              (expense: any) => expense.itineraryId === itinerary.id,
            ) || [];

          let connectedExpenses = cachedExpenses;
          if (cachedExpenses.length === 0) {
            const allExpenses = await expensesApi.getExpenses(planId);
            connectedExpenses = allExpenses.filter(
              (expense: any) => expense.itineraryId === itinerary.id,
            );
          }

          for (const expense of connectedExpenses) {
            try {
              const updatedExpense = await expensesApi.updateExpense(
                expense.id,
                {
                  ...expense,
                  exDate: formData.itineraryDate,
                },
              );

              if (planData?.addExpense) {
                planData.addExpense(updatedExpense);
              }
            } catch (_e) {}
          }
        }

        if (draftExpenses.length > 0) {
          try {
            const createdExpenses = await expensesApi.createExpensesBatch({
              planId: planId,
              itineraryId: itinerary.id,
              expenses: draftExpenses.map(draftExpense => ({
                category: draftExpense.category as any,
                amount: draftExpense.amount,
                description: draftExpense.description,
                exDate: draftExpense.exDate,
                currency: draftExpense.currency as any,
              })),
            });
            if (planData?.addExpense) {
              createdExpenses.forEach(expense => {
                planData.addExpense(expense);
              });
            }
          } catch (_e) {}
          setDraftExpenses([]);
        }
      } else {
        savedItinerary = await itinerariesApi.createItinerary({
          planId: planId,
          title: formData.title,
          description: formData.description,
          country: formData.country?.trim() || undefined,
          city: formData.city?.trim() || undefined,
          location: formData.location,
          itineraryDate: formData.itineraryDate,
          startTime: formData.startTime,
          endTime: finalEndTime,
        });
        await extendPlanIfNeeded(planId, planData?.plan, [formData.itineraryDate]);

        if (draftExpenses.length > 0) {
          try {
            const createdExpenses = await expensesApi.createExpensesBatch({
              planId: planId,
              itineraryId: savedItinerary.id,
              expenses: draftExpenses.map(draftExpense => ({
                category: draftExpense.category as any,
                amount: draftExpense.amount,
                description: draftExpense.description,
                exDate: draftExpense.exDate,
                currency: draftExpense.currency as any,
              })),
            });
            if (planData?.addExpense) {
              createdExpenses.forEach(expense => {
                planData.addExpense(expense);
              });
            }
          } catch (_e) {}
          setDraftExpenses([]);
        }
      }

      if (pendingFiles.length > 0 && savedItinerary?.id) {
        try {
          await uploadFiles(pendingFiles, savedItinerary.id);
          const list = await attachmentsApi.getAttachments(
            planId,
            "itinerary",
            savedItinerary.id,
          );
          setExistingAttachments(list);
          setPendingFiles([]);
        } catch (e) {
          if (!handleGuestPromptError(e)) {
            showMessage(
              "알림",
              formatAttachmentUploadFailureMessage(
                e,
                "일정은 저장됐으나 일부 파일 업로드에 실패했습니다.",
              ),
            );
          }
        }
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("itinerary-preview-clear"));
      }

      onSave(savedItinerary);
    } catch (_error) {
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    if (!itinerary) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("itinerary-preview-clear"));
      }
      onCancel();
      return;
    }

    if (itinerary && onDelete) {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      try {
        await itinerariesApi.deleteItinerary(itinerary.id);
        onDelete(itinerary.id);
        onCancel();
      } catch (_error) {
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const handleExpenseSubmit = async () => {
    if (expenseForm.amount <= 0) {
      Alert.alert("알림", "금액을 입력해주세요.");
      return;
    }

    if (editingExpense && !editingExpense.isDraft) {
      try {
        const updatedExpense = await expensesApi.updateExpense(
          Number(editingExpense.id),
          {
            category: expenseForm.category,
            amount: expenseForm.amount,
            description: expenseForm.description,
          },
        );

        if (planData?.addExpense) {
          planData.addExpense(updatedExpense);
        }

        setExpenses(prev =>
          prev.map(exp =>
            exp.id === updatedExpense.id ? updatedExpense : exp,
          ),
        );

        setExpenseForm({
          category: ExpenseCategory.ETC,
          amount: 0,
          description: "",
          currency: ExpenseCurrency.KRW,
        });
        setEditingExpense(null);
        setShowExpenseForm(false);

        Alert.alert("성공", "비용이 수정되었습니다.");
        return;
      } catch (_error) {
        Alert.alert("알림", "비용 수정에 실패했습니다.");
        return;
      }
    }

    if (editingExpense && editingExpense.isDraft) {
      const draftIndex = Number(editingExpense.id.split("-")[1]);
      setDraftExpenses(prev => {
        const updated = [...prev];
        updated[draftIndex] = {
          ...updated[draftIndex],
          category: expenseForm.category,
          amount: expenseForm.amount,
          description: expenseForm.description,
        };
        return updated;
      });

      setExpenseForm({
        category: ExpenseCategory.ETC,
        amount: 0,
        description: "",
        currency: ExpenseCurrency.KRW,
      });
      setEditingExpense(null);
      setShowExpenseForm(false);

      Alert.alert(
        "성공",
        "비용이 수정되었습니다. (일정 저장 시 함께 저장됩니다)",
      );
      return;
    }

    if (!itinerary?.id) {
      const newDraftExpense = {
        category: expenseForm.category,
        amount: expenseForm.amount,
        description: expenseForm.description,
        exDate: formData.itineraryDate,
        currency: expenseForm.currency,
      };

      setDraftExpenses(prev => [...prev, newDraftExpense]);

      setExpenseForm({
        category: ExpenseCategory.ETC,
        amount: 0,
        description: "",
        currency: ExpenseCurrency.KRW,
      });
      setShowExpenseForm(false);

      Alert.alert(
        "성공",
        "비용이 추가되었습니다. (일정 저장 시 함께 저장됩니다)",
      );
      return;
    }

    const newDraftExpense = {
      category: expenseForm.category,
      amount: expenseForm.amount,
      description: expenseForm.description,
      exDate: formData.itineraryDate,
      currency: expenseForm.currency,
    };

    setDraftExpenses(prev => [...prev, newDraftExpense]);

    setExpenseForm({
      category: ExpenseCategory.ETC,
      amount: 0,
      description: "",
      currency: ExpenseCurrency.KRW,
    });
    setShowExpenseForm(false);

    Alert.alert(
      "성공",
      "비용이 추가되었습니다. (일정 저장 시 함께 저장됩니다)",
    );
  };

  const handleExpenseDelete = async (expenseId: string) => {
    try {
      await expensesApi.deleteExpense(Number(expenseId));

      if (planData?.removeExpense) {
        planData.removeExpense(Number(expenseId));
      }

      setExpenses(prev => prev.filter(exp => exp.id !== Number(expenseId)));

      Alert.alert("성공", "비용이 삭제되었습니다.");
    } catch (_error) {
      Alert.alert("알림", "비용 삭제에 실패했습니다.");
    }
  };

  const allExpenses = useMemo(() => {
    const draft = readOnly
      ? []
      : draftExpenses.map((exp, idx) => ({
          ...exp,
          id: `draft-${idx}`,
          isDraft: true,
        }));
    const saved = expenses.map(exp => ({ ...exp, isDraft: false }));
    return [...draft, ...saved];
  }, [draftExpenses, expenses, readOnly]);

  const handleAiAnalyzePress = useCallback(
    async (selection: AiAttachmentAnalyzeSelection) => {
      setAiAnalyzeInlineError(false);
      setAiAnalyzeInlineErrorMessage("");
      setAiAnalyzeSizeErrorMessage("");
      const AI_MAX_SIZE = 10 * 1024 * 1024;
      const oversizeFile =
        selection.kind === "pending"
          ? pendingFiles.find(f => pendingAiFileKey(f) === selection.key)
          : undefined;
      const oversizeExisting =
        selection.kind === "existing"
          ? existingAttachments.find(a => a.id === selection.id)
          : undefined;
      const oversizeBytes = oversizeFile?.size ?? oversizeExisting?.fileSize;
      const oversizeName =
        oversizeFile?.name ?? oversizeExisting?.fileName ?? "파일";
      if (oversizeBytes !== undefined && oversizeBytes > AI_MAX_SIZE) {
        setAiAnalyzeSizeErrorMessage(
          `"${oversizeName}"은(는) 10MB를 넘어 분석할 수 없어요.`,
        );
        return;
      }
      aiAnalyzeCancelledRef.current = false;
      setIsAiAnalyzing(true);
      try {
        const payload = await buildAnalyzeUploadPayload(selection, {
          pendingFiles,
          existingAttachments,
        });
        setLastAnalyzeFileName(payload.filename);
        const res = await analyzeDocumentUpload(payload.file, {
          filename: payload.filename,
        });
        if (aiAnalyzeCancelledRef.current) return;
        const err = res.error?.trim();
        if (!res.success || err) {
          setLastAiSelection(selection);
          setAiAnalyzeInlineError(true);
          return;
        }
        if (routeDocumentAnalyzeSuccess?.(res, pendingFiles, "일정")) {
          return;
        }
        setAiAnalyzeResult(res);
        setAiAnalyzeModalVisible(true);
      } catch (_e) {
        if (aiAnalyzeCancelledRef.current) return;
        setLastAiSelection(selection);
        setAiAnalyzeInlineErrorMessage(
          "분석 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
        setAiAnalyzeInlineError(true);
      } finally {
        setIsAiAnalyzing(false);
      }
    },
    [pendingFiles, existingAttachments, routeDocumentAnalyzeSuccess],
  );

  const applyAiAnalyzeDraftToForm = useCallback(
    (draft: AiDocumentItemDraft) => {
      applyItineraryDraftFromAi(draft, setFormData, setDraftExpenses);
    },
    [],
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>
          {readOnly ? "일정 정보" : itinerary ? "일정 수정" : "일정 추가"}
        </Text>

        <Pressable
          onPress={() => {
            onCancel();
          }}
          style={styles.closeButton}
        >
          <CloseIcon width={12} height={12} color={colors.gray600} />
        </Pressable>
      </View>
      {!readOnly && (
        <PanelTabSwitcher activeTab={activeTab} onTabChange={onTabChange} />
      )}
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { overflow: "visible" },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              제목 <Text style={{ color: colors.warning }}>*</Text>
            </Text>
            <Input
              variant={readOnly ? "outlined" : "filled"}
              placeholder={PLACEHOLDERS.itinerary.titleForm}
              value={formData.title}
              onChangeText={text =>
                !readOnly && setFormData({ ...formData, title: text })
              }
              style={readOnly ? styles.readOnlyInput : styles.input}
              placeholderTextColor={colors.gray600}
              editable={!readOnly}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>내용</Text>
            <Input
              variant={readOnly ? "outlined" : "filled"}
              placeholder={PLACEHOLDERS.itinerary.descriptionForm}
              value={formData.description}
              onChangeText={text =>
                !readOnly && setFormData({ ...formData, description: text })
              }
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={readOnly ? styles.readOnlyTextArea : styles.textArea}
              placeholderTextColor={colors.gray600}
              editable={!readOnly}
            />
          </View>

          <View
            style={[
              styles.row,
              styles.pickerRowWrapper,
              { zIndex: countryOpen ? 10001 : 1 },
            ]}
          >
            <View
              style={[
                styles.inputGroup,
                styles.halfWidth,
                styles.countryPickerWrapper,
              ]}
            >
              <Text style={styles.label}>국가</Text>
              <CountryPicker
                value={formData.country}
                onChange={(name: string) =>
                  !readOnly && setFormData({ ...formData, country: name, city: "" })
                }
                onOpen={() => !readOnly && setCountryOpen(true)}
                onClose={() => setCountryOpen(false)}
                placeholder={PLACEHOLDERS.itinerary.countryForm}
                disabled={readOnly}
                useModal
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>도시</Text>
              <CityPicker
                value={formData.city}
                onChange={name => !readOnly && setFormData({ ...formData, city: name })}
                countryKo={formData.country}
                placeholder={PLACEHOLDERS.itinerary.cityForm}
                disabled={readOnly}
                useModal
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>장소</Text>
            <Input
              variant={readOnly ? "outlined" : "filled"}
              placeholder="장소를 입력하세요."
              value={formData.location}
              onChangeText={text =>
                !readOnly && setFormData({ ...formData, location: text })
              }
              style={readOnly ? styles.readOnlyInput : styles.input}
              placeholderTextColor={colors.gray600}
              editable={!readOnly}
            />
          </View>

          <View
            style={[
              styles.inputGroup,
              styles.datePickerWrapper,
              { zIndex: showDatePicker ? 20000 : 1 },
            ]}
          >
            <Text style={styles.label}>
              날짜 <Text style={{ color: colors.warning }}>*</Text>
            </Text>
            <Pressable
              style={readOnly ? styles.readOnlyDateInput : styles.dateInput}
              onPress={() => !readOnly && setShowDatePicker(!showDatePicker)}
              disabled={readOnly}
            >
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateText}>
                  {dayjs(formData.itineraryDate).format("YYYY년 M월 D일")}
                </Text>
                <View style={styles.iconWrapper}>
                  <CalendarIcon width={16} height={16} />
                </View>
              </View>
            </Pressable>
            {!readOnly && (
              <BaseCalendar
                visible={showDatePicker}
                selectedDate={formData.itineraryDate}
                onDayPress={day => {
                  setFormData({ ...formData, itineraryDate: day.dateString });
                  setShowDatePicker(false);
                }}
                onClose={() => setShowDatePicker(false)}
                style={styles.calendarPopup}
                hideButtons={true}
                autoCloseOnSelect={true}
              />
            )}
          </View>

          <View
            style={[
              styles.row,
              styles.pickerRowWrapper,
              { zIndex: timeOpen ? 10001 : 1 },
            ]}
          >
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>
                시작 시간 <Text style={{ color: colors.warning }}>*</Text>
              </Text>
              <TimePicker
                value={formData.startTime}
                onChange={time =>
                  !readOnly && setFormData({ ...formData, startTime: time })
                }
                onOpen={() => {
                  if (!readOnly) {
                    setTimeOpen(true);
                  }
                }}
                onClose={() => setTimeOpen(false)}
                disabled={readOnly}
                style={
                  readOnly
                    ? {
                        backgroundColor: colors.gray200,
                        borderColor: colors.gray400,
                        borderWidth: 1,
                      }
                    : undefined
                }
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>
                종료 시간 <Text style={{ color: colors.warning }}>*</Text>
              </Text>
              <TimePicker
                value={formData.endTime}
                onChange={time =>
                  !readOnly && setFormData({ ...formData, endTime: time })
                }
                onOpen={() => {
                  if (!readOnly) {
                    setTimeOpen(true);
                  }
                }}
                onClose={() => setTimeOpen(false)}
                minTime={formData.startTime}
                disabled={readOnly}
                popupAlign="right"
                style={
                  readOnly
                    ? {
                        backgroundColor: colors.gray200,
                        borderColor: colors.gray400,
                        borderWidth: 1,
                      }
                    : undefined
                }
              />
            </View>
          </View>

          {(!readOnly || allExpenses.length > 0) && (
            <View style={styles.expenseSection}>
              <Text style={styles.label}>비용 내역</Text>

              {allExpenses.length > 0 && (
                <View style={styles.expenseList}>
                  {allExpenses.map(expense => {
                    const cat = expense.category as ExpenseCategory;
                    return (
                      <Pressable
                        key={expense.id}
                        style={styles.expenseCard}
                        onPress={() => {
                          if (!readOnly) {
                            setEditingExpense(expense);
                            setExpenseForm({
                              category: cat,
                              amount: expense.amount,
                              description: expense.description || "",
                              currency: expense.currency || ExpenseCurrency.KRW,
                            });
                            setShowExpenseForm(true);
                          }
                        }}
                        disabled={readOnly}
                      >
                        <View
                          style={[
                            styles.expenseDot,
                            { backgroundColor: categoryColors[cat] },
                          ]}
                        />
                        <Text
                          style={styles.expenseCategoryLabel}
                          numberOfLines={1}
                        >
                          {categoryLabels[cat]}
                        </Text>
                        <Text
                          style={styles.expenseDescription}
                          numberOfLines={1}
                        >
                          {expense.description || "—"}
                        </Text>
                        <Text style={styles.expenseAmount}>
                          {expense.currency === ExpenseCurrency.USD
                            ? `${expense.amount.toLocaleString()}달러`
                            : `${expense.amount.toLocaleString()}원`}
                        </Text>
                        {!readOnly && (
                          <Pressable
                            style={styles.expenseDeleteButton}
                            onPress={e => {
                              e.stopPropagation();
                              if (expense.isDraft) {
                                setDraftExpenses(prev =>
                                  prev.filter(
                                    (_, i) =>
                                      i !== Number(expense.id.split("-")[1]),
                                  ),
                                );
                              } else {
                                handleExpenseDelete(expense.id);
                              }
                            }}
                          >
                            <CloseIcon
                              width={8}
                              height={8}
                              color={colors.gray500}
                            />
                          </Pressable>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {!readOnly && (
                <Pressable
                  style={styles.addExpenseButton}
                  onPress={() => {
                    setEditingExpense(null);
                    setExpenseForm({
                      category: ExpenseCategory.ETC,
                      amount: 0,
                      description: "",
                      currency: ExpenseCurrency.KRW,
                    });
                    setShowExpenseForm(!showExpenseForm);
                  }}
                >
                  <Text style={styles.addButtonPlus}>+</Text>
                  <Text style={styles.addExpenseButtonText}>
                    비용 내역 추가
                  </Text>
                </Pressable>
              )}

              {showExpenseForm && (
                <View style={styles.expenseForm}>
                  <View
                    style={[
                      styles.expenseFormRow,
                      { zIndex: expenseOpen ? 10001 : 1 },
                    ]}
                  >
                    <View style={styles.expenseFormHalf}>
                      <Text style={styles.label}>카테고리</Text>
                      <CategoryPicker
                        value={expenseForm.category}
                        onChange={(cat: ExpenseCategory) =>
                          setExpenseForm({ ...expenseForm, category: cat })
                        }
                        onOpen={() => setExpenseOpen(true)}
                        onClose={() => setExpenseOpen(false)}
                      />
                    </View>
                    <View style={styles.expenseFormHalf}>
                      <Text style={styles.label}>통화</Text>
                      <CurrencyToggle
                        value={expenseForm.currency}
                        onChange={c =>
                          setExpenseForm({ ...expenseForm, currency: c })
                        }
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      금액 <Text style={{ color: colors.warning }}>*</Text>
                    </Text>
                    <Input
                      variant="outlined"
                      placeholder={PLACEHOLDERS.expense.amount}
                      value={expenseForm.amount.toString()}
                      onChangeText={text =>
                        setExpenseForm({
                          ...expenseForm,
                          amount: Number.parseInt(text) || 0,
                        })
                      }
                      keyboardType="numeric"
                      style={styles.expenseInput}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>내용</Text>
                    <Input
                      variant="outlined"
                      placeholder={PLACEHOLDERS.expense.descriptionForm}
                      value={expenseForm.description}
                      onChangeText={text =>
                        setExpenseForm({ ...expenseForm, description: text })
                      }
                      style={styles.expenseInput}
                    />
                  </View>

                  <View style={styles.expenseButtonRow}>
                    <Pressable
                      style={styles.expenseCancelButton}
                      onPress={() => {
                        setEditingExpense(null);
                        setExpenseForm({
                          category: ExpenseCategory.ETC,
                          amount: 0,
                          description: "",
                          currency: ExpenseCurrency.KRW,
                        });
                        setShowExpenseForm(false);
                      }}
                    >
                      <Text style={styles.expenseCancelButtonText}>취소</Text>
                    </Pressable>
                    <Pressable
                      style={styles.expenseSubmitButton}
                      onPress={handleExpenseSubmit}
                    >
                      <Text style={styles.expenseSubmitButtonText}>
                        {editingExpense ? "수정" : "추가"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}

          {showAttachmentSection && (
            <AttachmentSection
              style={styles.attachmentSection}
              pendingFiles={readOnly ? [] : pendingFiles}
              onPickImage={appendImage}
              onPickDocument={appendDocument}
              onRemoveFile={removePendingAt}
              onAppendPendingFiles={
                Platform.OS === "web"
                  ? files => setPendingFiles(p => [...p, ...files])
                  : undefined
              }
              existingAttachments={existingAttachments}
              onRemoveExisting={
                !readOnly && itineraryAttachmentEntityId != null
                  ? handleRemoveExistingAttachment
                  : undefined
              }
              isLoadingExisting={false}
              isUploading={isUploading}
              disabled={readOnly || isSubmitting}
              hideAddControls={readOnly}
              onAiAnalyzePress={
                Platform.OS === "web" && !readOnly
                  ? handleAiAnalyzePress
                  : undefined
              }
              isAiAnalyzing={isAiAnalyzing}
              onCancelAiAnalyze={() => {
                aiAnalyzeCancelledRef.current = true;
                setIsAiAnalyzing(false);
              }}
            />
          )}
          {aiAnalyzeInlineError && lastAiSelection && (
            <AiAnalyzeErrorBanner
              message={aiAnalyzeInlineErrorMessage || undefined}
              onRetry={() => {
                setAiAnalyzeInlineError(false);
                setAiAnalyzeInlineErrorMessage("");
                handleAiAnalyzePress(lastAiSelection);
              }}
            />
          )}
          {!!aiAnalyzeSizeErrorMessage && (
            <AiAnalyzeErrorBanner
              message={aiAnalyzeSizeErrorMessage}
              showTitle={false}
              showRetry={false}
            />
          )}

          {!readOnly ? (
            <View style={[styles.buttonRow, { position: "relative" }]}>
              <Pressable
                style={styles.deleteButton}
                onPress={itinerary ? handleDelete : onCancel}
                disabled={isSubmitting}
              >
                <Text style={styles.deleteButtonText}>
                  {itinerary ? "삭제" : "취소"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.saveButton}
                onPress={handleSave}
                disabled={isSubmitting}
              >
                <Text style={styles.saveButtonText}>저장</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.buttonRow, { position: "relative" }]}>
              <Pressable
                style={styles.deleteButton}
                onPress={handleDelete}
                disabled={isSubmitting}
              >
                <Text style={styles.deleteButtonText}>삭제</Text>
              </Pressable>
              <Pressable
                style={[styles.saveButton, { backgroundColor: colors.gray900 }]}
                onPress={onEdit}
              >
                <Text style={styles.saveButtonText}>수정</Text>
              </Pressable>
            </View>
          )}
          <WarningBanner
            message={warningMessage}
            visible={showWarning}
            duration={3000}
            bottomOffset={74}
            onHide={() => {
              setShowWarning(false);
              setWarningMessage("");
            }}
          />
        </View>
      </ScrollView>
      <AiDocumentAnalyzeModal
        visible={aiAnalyzeModalVisible}
        analyzeResult={aiAnalyzeResult}
        analyzeFileName={lastAnalyzeFileName ?? undefined}
        onApply={applyAiAnalyzeDraftToForm}
        onClose={() => {
          setAiAnalyzeModalVisible(false);
          setAiAnalyzeResult(null);
          onConsumeStagedDocumentAnalyze?.();
        }}
        entityTypeLabel="일정"
        originEntityType={analyzeOriginEntityType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  contentWrapper: {
    position: "relative",
    overflow: "visible",
    gap: spacing.lg,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    ...textStyles.h5,
  },
  closeButton: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: colors.gray200,
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    backgroundColor: colors.gray900,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonText: {
    ...textStyles.h8,
    color: colors.white,
  },
  readOnlyInput: {
    backgroundColor: colors.gray200,
    borderWidth: 1,
    borderColor: colors.gray400,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...textStyles.body4,
  },
  readOnlyTextArea: {
    backgroundColor: colors.gray200,
    borderWidth: 1,
    borderColor: colors.gray400,
    height: 80,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...textStyles.body4,
  },
  readOnlyDateInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.gray200,
    minHeight: 40,
  },
  formSection: {
    gap: spacing.lg,
  },
  input: {
    backgroundColor: colors.gray200,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...textStyles.body4,
  },
  textArea: {
    backgroundColor: colors.gray200,
    height: 80,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...textStyles.body4,
  },
  timeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  deleteButton: {
    backgroundColor: colors.gray300,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 90,
  },
  deleteButtonText: {
    ...textStyles.h8,
    color: colors.black,
  },
  saveButton: {
    backgroundColor: colors.primary,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  saveButtonText: {
    ...textStyles.h8,
    color: colors.white,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    overflow: "visible",
    position: "relative",
  },
  pickerRowWrapper: {
    overflow: "visible",
    position: "relative",
  },
  inputGroup: {
    gap: spacing.sm,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    ...textStyles.h8,
    color: colors.black,
  },
  expenseSection: {
    position: "relative",
    overflow: "visible",
    zIndex: 1,
    gap: spacing.sm,
  },
  expenseList: {
    gap: 6,
  },
  expenseCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.gray100,
    borderRadius: radii.md,
  },
  expenseDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    flexShrink: 0,
  },
  expenseCategoryLabel: {
    ...textStyles.body5,
    fontWeight: "600",
    color: colors.gray900,
    flexShrink: 0,
  },
  expenseDescription: {
    ...textStyles.body5,
    color: colors.gray600,
    flex: 1,
  },
  expenseAmount: {
    ...textStyles.body5,
    fontWeight: "700",
    color: colors.gray900,
    flexShrink: 0,
  },
  expenseDeleteButton: {
    width: 18,
    height: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  addExpenseButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.gray400,
    borderRadius: radii.md,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
  },
  addButtonPlus: {
    fontSize: 14,
    lineHeight: 18,
    color: colors.gray900,
    marginRight: 2,
  },
  addExpenseButtonText: {
    ...textStyles.h8,
    color: colors.gray900,
  },
  attachmentSection: {
    marginTop: spacing.lg,
    width: "100%",
  },
  expenseForm: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.xs,
    gap: spacing.md,
  },
  expenseFormRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  expenseFormHalf: {
    flex: 1,
    gap: spacing.sm,
  },
  expenseInput: {
    backgroundColor: colors.gray200,
    borderWidth: 0,
    borderRadius: radii.md,
    paddingVertical: 10,
  },
  countryPickerWrapper: {
    overflow: "visible",
    position: "relative",
    zIndex: 8000,
  },
  expenseButtonRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  expenseCancelButton: {
    backgroundColor: colors.gray300,
    borderRadius: radii.md,
    paddingVertical: 11,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  expenseCancelButtonText: {
    ...textStyles.h8,
    color: colors.black,
  },
  expenseSubmitButton: {
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    paddingVertical: 11,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  expenseSubmitButtonText: {
    ...textStyles.h8,
    color: colors.white,
  },
  deleteExpenseButton: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.gray200,
    minHeight: 40,
  },
  dateTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  dateText: {
    ...textStyles.body4,
  },
  iconWrapper: {
    marginTop: -2,
  },
  datePickerWrapper: {
    position: "relative",
    overflow: "visible",
  },
  calendarPopup: {
    position: "absolute",
    top: 70,
    left: 0,
  },
});
