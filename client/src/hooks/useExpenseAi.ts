import { useState, useCallback } from "react";
import dayjs from "dayjs";
import { analyzeDocumentUpload } from "@/services/aiDocument";
import { buildAnalyzeUploadPayload } from "@/utils/attachmentAiAnalyze";

import { type AiDocumentItemType, type AiDocumentItemDraft } from "@/types/api";
import type { AiAttachmentAnalyzeSelection } from "@/ui/components/attachmentSection.types";
import { pendingAiFileKey } from "@/ui/components/attachmentSection.types";
import { ExpenseCategory, ExpenseCurrency } from "@/types/expense";

interface UseExpenseAiProps {
  pendingFiles: any[];
  existingAttachments?: any[];
  onUpdateForm: (updater: (prev: any) => any) => void;
}

export function useExpenseAi({
  pendingFiles,
  existingAttachments = [],
  onUpdateForm,
}: UseExpenseAiProps) {
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [isAiAnalyzeSuccess, setIsAiAnalyzeSuccess] = useState(false);
  const [isAiAnalyzePartial, setIsAiAnalyzePartial] = useState(false);
  const [analyzePartialMessage, setAnalyzePartialMessage] = useState<string | undefined>(undefined);
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());

  const handleAiAnalyzePress = useCallback(
    async (selection: AiAttachmentAnalyzeSelection) => {
      setIsAiAnalyzing(true);
      try {
        const payload = await buildAnalyzeUploadPayload(selection, {
          pendingFiles,
          existingAttachments,
        });
        const res = await analyzeDocumentUpload(payload.file, {
          filename: payload.filename,
        });
        const err = res.error?.trim();
        if (!res.success || err) {
          setAnalyzeError("분석 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요");
          return;
        }
        const kind: AiDocumentItemType | null = res.inferredItemType ?? res.draft?.itemType ?? null;
        if (kind !== "expense") {
          const label =
            kind === "flight"
              ? "항공"
              : kind === "itinerary"
                ? "일정"
                : kind === "accommodation"
                  ? "숙박"
                  : "다른 항목";
          setAnalyzeError(`문서가 [${label}]으로 분석되었습니다. 화면에는 반영할 수 없습니다`);
          return;
        }
        if (!res.draft || res.draft.itemType !== "expense") {
          setAnalyzeError("이미지에서 금액·날짜를 읽지 못했어요. 더 선명한 영수증으로 다시 시도해 주세요");
          return;
        }
        setAnalyzeError(null);
        
        const src = mergeExpenseDraftValueSource(res.draft as Extract<AiDocumentItemDraft, { itemType: "expense" }>);
        const filledSet = new Set<string>(["category"]);
        const amountExtracted = Number.parseInt(normalizeAmountDigitsAi(pickStrAi(src, ["amount", "Amount"])), 10) > 0;
        const descriptionExtracted = !!pickStrAi(src, ["description", "Description"]);
        const exRawCheck = pickStrAi(src, ["exDate", "ex_date", "ExDate"]);
        const dateExtracted = !!(exRawCheck && dayjs(exRawCheck).isValid());
        
        if (amountExtracted) filledSet.add("amount");
        if (descriptionExtracted) filledSet.add("description");
        if (dateExtracted) filledSet.add("ex_date");
        setAiFilledFields(filledSet);
        
        const isPartial = !amountExtracted || !descriptionExtracted || !dateExtracted;
        if (isPartial) {
          setIsAiAnalyzeSuccess(false);
          setIsAiAnalyzePartial(true);
          setAnalyzePartialMessage("일부 항목을 인식하지 못했어요. 확인 필요 항목을 직접 입력해 주세요");
        } else {
          setIsAiAnalyzeSuccess(true);
          setIsAiAnalyzePartial(false);
          setAnalyzePartialMessage(undefined);
        }
        
        const categoryRaw = pickStrAi(src, ["category", "Category"]) || "etc";
        const amountDigits = normalizeAmountDigitsAi(pickStrAi(src, ["amount", "Amount"]));
        const amountNum = Number.parseInt(amountDigits, 10) || 0;
        const description = pickStrAi(src, ["description", "Description"]);
        const exRaw = pickStrAi(src, ["exDate", "ex_date", "ExDate"]);
        const currencyRaw = pickStrAi(src, ["currency", "Currency"]).toUpperCase();
        const currency = (Object.values(ExpenseCurrency) as string[]).includes(currencyRaw)
          ? (currencyRaw as ExpenseCurrency)
          : ExpenseCurrency.KRW;

        onUpdateForm((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            category: coerceExpenseCategoryAi(categoryRaw),
            amount: amountNum,
            description,
            ex_date: exRaw && dayjs(exRaw).isValid() ? dayjs(exRaw).format("YYYY-MM-DD") : prev.ex_date,
            currency,
          };
        });
      } catch (_e) {
        setAnalyzeError("분석 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요");
      } finally {
        setIsAiAnalyzing(false);
      }
    },
    [pendingFiles, existingAttachments, onUpdateForm]
  );

  const handleRetryAnalyze = useCallback(() => {
    if (pendingFiles.length === 0) return;
    setAnalyzeError(null);
    setIsAiAnalyzeSuccess(false);
    setIsAiAnalyzePartial(false);
    setAnalyzePartialMessage(undefined);
    setAiFilledFields(new Set());
    
    void handleAiAnalyzePress({
      kind: "pending",
      key: pendingAiFileKey(pendingFiles[0]),
    });
  }, [pendingFiles, handleAiAnalyzePress]);

  const resetAiState = useCallback(() => {
    setIsAiAnalyzing(false);
    setAnalyzeError(null);
    setIsAiAnalyzeSuccess(false);
    setIsAiAnalyzePartial(false);
    setAnalyzePartialMessage(undefined);
    setAiFilledFields(new Set());
  }, []);

  return {
    isAiAnalyzing,
    analyzeError,
    isAiAnalyzeSuccess,
    isAiAnalyzePartial,
    analyzePartialMessage,
    aiFilledFields,
    handleAiAnalyzePress,
    handleRetryAnalyze,
    resetAiState
  };
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