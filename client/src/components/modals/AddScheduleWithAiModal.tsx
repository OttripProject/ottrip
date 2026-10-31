import { useDiscardConfirm } from "@/hooks/useDiscardConfirm";
import { accommodationsApi } from "@/services/accommodations";
import { analyzeDocumentUpload, parseTextToItem } from "@/services/aiDocument";
import { attachmentsApi } from "@/services/attachments";
import type { PreparedUpload } from "@/services/attachments";
import { expensesApi } from "@/services/expenses";
import { flightsApi } from "@/services/flights";
import { itinerariesApi } from "@/services/itineraries";
import type {
  AiDocumentItemDraft,
  DocumentUploadAnalyzeResponse,
} from "@/types/api";
import {
  ExpenseCategory,
  ExpenseCurrency,
  PLAN_ENTITY_KIND,
} from "@/types/api";
import ActionButton from "@/ui/components/ActionButton";
import MotionPressable, { MotionIcon } from "@/ui/components/MotionPressable";
import Input from "@/ui/components/input/Input";
import { modalMotion } from "@/ui/effects/modalMotion";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { surfaces } from "@/ui/tokens/surfaces";
import { textStyles } from "@/ui/tokens/typography";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import type React from "react";
import { createElement, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import CheckWhiteIcon from "../../../assets/check_white.svg";
import CloseSmIcon from "../../../assets/close_sm.svg";
import FileIcon from "../../../assets/files.svg";
import LeftArrowIcon from "../../../assets/left_arrow.svg";
import AttachmentDocIcon from "../../../assets/mobile_attachment_document.svg";
import AttachmentImageIcon from "../../../assets/mobile_attachment_image.svg";
import SendIcon from "../../../assets/share.svg";
import CloseIcon from "../../../assets/x.svg";
import { AiAnalyzeResultContent } from "./AiDocumentAnalyzeModal";
import {
  type AiAnalyzeDraftEditorRef,
  AiAnalyzeResultBody,
} from "./aiDocumentAnalyzeDraftBody";

interface AddScheduleWithAiModalProps {
  visible: boolean;
  onClose: () => void;
  planId: number;
  planPublicId: string;
  planStartDate?: string;
  planEndDate?: string;
  onPlanDatesExtended?: (newStart: string, newEnd: string) => void;
  onSaved?: () => void;
  messages: Message[];
  onMessagesChange: React.Dispatch<React.SetStateAction<Message[]>>;
}

export type Message =
  | { role: "ai"; text: string }
  | { role: "ai-intro"; text: string; suggestions: string[] }
  | { role: "ai-unclear"; title: string; body: string; suggestions: string[] }
  | { role: "user"; text: string }
  | { role: "user-file"; fileName: string; mimeType: string }
  | { role: "ai-analyzing"; id: string }
  | {
      role: "ai-result-card";
      result: DocumentUploadAnalyzeResponse;
      source: "text" | "file";
      fileName?: string;
    };

export const AI_INTRO_MESSAGE: Message = {
  role: "ai-intro",
  text: "안녕하세요! 어떤 일정을 추가해 드릴까요?\n텍스트로 알려주시거나, 예약 메일·티켓 이미지를 첨부하면 자동으로 정리해 드려요.\n\n예를 들어, 이렇게 입력해 보세요.",
  suggestions: ["4월 15일 오후 1시부터 1시간, 점심 약속 추가해줘"],
};

const WEB_FILE_ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,application/pdf,.pdf";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

function getEunNeun(text: string): string {
  if (!text) return "은";
  const last = text.charCodeAt(text.length - 1);
  if (last >= 0xac00 && last <= 0xd7a3)
    return (last - 0xac00) % 28 !== 0 ? "은" : "는";
  return "aeiouAEIOU".includes(text[text.length - 1]) ? "는" : "은";
}

function getFileMimeLabel(mimeType: string): string {
  if (mimeType === "application/pdf") return "문서 선택";
  if (mimeType.startsWith("image/")) return "이미지 선택";
  return "파일";
}

function getVal(v: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const val = v[k];
    if (val !== null && val !== undefined && String(val).trim())
      return String(val);
  }
  return "";
}

function getItemTypeLabel(type: string | null): string {
  switch (type) {
    case "itinerary":
      return "일정";
    case "flight":
      return "항공편";
    case "accommodation":
      return "숙소";
    case "expense":
      return "지출";
    default:
      return "분석 결과";
  }
}

function getResultSummary(result: DocumentUploadAnalyzeResponse): string {
  if (!result.draft) return "";
  const v = result.draft.payload.values as Record<string, unknown>;
  switch (result.inferredItemType) {
    case "itinerary":
      return (
        getVal(v, "title") ||
        getVal(v, "location") ||
        getVal(v, "itineraryDate", "itinerary_date")
      );
    case "flight": {
      const segs = Array.isArray(v.segments)
        ? (v.segments as Record<string, unknown>[])
        : [];
      if (segs.length > 0) {
        const dep = getVal(segs[0], "departureAirport", "departure_airport");
        const arr = getVal(segs[0], "arrivalAirport", "arrival_airport");
        if (dep && arr) return `${dep} → ${arr}`;
      }
      return getVal(v, "reservationNumber", "reservation_number");
    }
    case "accommodation":
      return getVal(v, "name") || getVal(v, "place");
    case "expense": {
      const desc = getVal(v, "description");
      const amount = getVal(v, "amount");
      const currency = getVal(v, "currency") || "KRW";
      return desc || (amount ? `${amount} ${currency}` : "");
    }
    default:
      return "";
  }
}

export default function AddScheduleWithAiModal({
  visible,
  onClose,
  planId,
  planPublicId,
  planStartDate,
  planEndDate,
  onPlanDatesExtended,
  onSaved,
  messages,
  onMessagesChange: setMessages,
}: AddScheduleWithAiModalProps) {
  type ResultView = {
    result: DocumentUploadAnalyzeResponse;
    source: "text" | "file";
    fileName?: string;
  };

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("일정을 분석하고 있어요...");
  const [isDragging, setIsDragging] = useState(false);
  const [resultView, setResultView] = useState<ResultView | null>(null);
  const [isResultEditMode, setIsResultEditMode] = useState(false);
  const [hoveredCardIdx, setHoveredCardIdx] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingFileRef = useRef<File | null>(null);
  const applyingRef = useRef(false);
  const dragZoneRef = useRef<View>(null);
  const handleFileAttachRef = useRef<(file: File) => Promise<void>>(
    null as any,
  );
  const resultDraftEditorRef = useRef<AiAnalyzeDraftEditorRef>(null);

  const sendDisabled = loading || !message.trim();

  const handleSend = async () => {
    const text = message.trim();
    if (!text || loading) return;

    setMessage("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const result = await parseTextToItem(text, planPublicId);
      if (result.success && result.draft) {
        setMessages(prev => [
          ...prev,
          { role: "ai-result-card", result, source: "text" },
        ]);
        setResultView({ result, source: "text" });
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: "ai-unclear",
            title: "일정 정보를 찾지 못했어요",
            body: "날짜와 시간을 포함해서 다시 알려주세요.",
            suggestions: ["4월 15일 오후 1시부터 1시간, 점심 약속 추가해줘"],
          },
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: "ai-unclear",
          title: "분석 서버에 연결하지 못했어요",
          body: "잠시 후 다시 시도해 주세요.\n문제가 계속되면 네트워크 상태를 확인해 주세요.",
          suggestions: [],
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleFileAttach = async (file: File) => {
    if (loading) return;

    if (file.size > MAX_FILE_SIZE) {
      setMessages(prev => [
        ...prev,
        { role: "user-file", fileName: file.name, mimeType: file.type },
        {
          role: "ai-unclear",
          title: "파일 용량이 너무 커요",
          body: `"${file.name}"${getEunNeun(file.name)} 10MB를 넘어서 업로드할 수 없어요.\n용량을 줄이거나 일부만 잘라 다시 첨부해 주세요.`,
          suggestions: [],
        },
      ]);
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setMessages(prev => [
        ...prev,
        { role: "user-file", fileName: file.name, mimeType: file.type },
        {
          role: "ai-unclear",
          title: "지원하지 않는 파일 형식이에요",
          body: "PDF, JPG, PNG 파일만 읽을 수 있어요.\n예약 메일을 PDF로 저장하거나, 티켓 화면을 캡처해서 다시 올려주세요.",
          suggestions: [],
        },
      ]);
      return;
    }

    pendingFileRef.current = file;
    const analyzingId = `analyzing-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      { role: "user-file", fileName: file.name, mimeType: file.type },
      { role: "ai-analyzing", id: analyzingId },
    ]);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const result = await analyzeDocumentUpload(file, { filename: file.name });
      setMessages(prev =>
        prev.filter(
          m =>
            !(
              m.role === "ai-analyzing" &&
              (m as { role: "ai-analyzing"; id: string }).id === analyzingId
            ),
        ),
      );

      if (result.success && result.draft) {
        setMessages(prev => [
          ...prev,
          {
            role: "ai-result-card",
            result,
            source: "file",
            fileName: file.name,
          },
        ]);
        setResultView({ result, source: "file", fileName: file.name });
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: "ai-unclear",
            title: "일정 정보를 찾지 못했어요",
            body: "이미지에서 날짜·시간·장소를 읽어낼 수 없었어요.\n예약 확인 메일이나 티켓처럼 정보가 명확한 자료를 첨부해 보세요.",
            suggestions: [],
          },
        ]);
      }
    } catch {
      setMessages(prev =>
        prev.filter(
          m =>
            !(
              m.role === "ai-analyzing" &&
              (m as { role: "ai-analyzing"; id: string }).id === analyzingId
            ),
        ),
      );
      setMessages(prev => [
        ...prev,
        {
          role: "ai-unclear",
          title: "분석 서버에 연결하지 못했어요",
          body: "잠시 후 다시 시도해 주세요.\n문제가 계속되면 네트워크 상태를 확인해 주세요.",
          suggestions: [],
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const uploadPendingFile = async (
    file: File,
    entityType: string,
    entityId: number,
  ) => {
    const prepared: PreparedUpload = {
      platform: "web",
      blob: file,
      byteLength: file.size,
    };
    const { uploadUrl, fileKey, publicUrl } =
      await attachmentsApi.getPresignedUploadUrl({
        planId,
        entityType: entityType as Parameters<
          typeof attachmentsApi.getPresignedUploadUrl
        >[0]["entityType"],
        entityId,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });
    await attachmentsApi.uploadToR2(uploadUrl, prepared, file.type);
    await attachmentsApi.confirmUpload({
      planId,
      entityType: entityType as Parameters<
        typeof attachmentsApi.confirmUpload
      >[0]["entityType"],
      entityId,
      fileKey,
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
      publicUrl,
    });
  };

  const extendPlanDatesIfNeeded = async (dates: string[]) => {
    if (!planStartDate || !planEndDate) return;
    const validDates = dates
      .map(d => dayjs(d.substring(0, 10)))
      .filter(d => d.isValid());
    if (!validDates.length) return;
    const minDate = validDates.reduce((a, b) => (b.isBefore(a) ? b : a));
    const maxDate = validDates.reduce((a, b) => (b.isAfter(a) ? b : a));
    const newStart = minDate.isBefore(dayjs(planStartDate))
      ? minDate.format("YYYY-MM-DD")
      : planStartDate;
    const newEnd = maxDate.isAfter(dayjs(planEndDate))
      ? maxDate.format("YYYY-MM-DD")
      : planEndDate;
    if (newStart !== planStartDate || newEnd !== planEndDate) {
      onPlanDatesExtended?.(newStart, newEnd);
    }
  };

  const handleAnalyzeApply = async (draft: AiDocumentItemDraft) => {
    if (applyingRef.current) return;
    applyingRef.current = true;
    setLoadingLabel("저장 중이에요...");
    setLoading(true);
    const v = draft.payload.values as Record<string, unknown>;
    const fileToUpload = pendingFileRef.current;
    pendingFileRef.current = null;

    try {
      switch (draft.itemType) {
        case "itinerary": {
          const date =
            getVal(v, "itineraryDate", "itinerary_date") ||
            dayjs().format("YYYY-MM-DD");
          const startTime = getVal(v, "startTime", "start_time") || "00:00";
          const rawEnd = getVal(v, "endTime", "end_time");
          const endTime =
            rawEnd ||
            dayjs(`2000-01-01 ${startTime.substring(0, 5)}`)
              .add(1, "hour")
              .format("HH:mm");
          const created = await itinerariesApi.createItinerary({
            title: getVal(v, "title") || "일정",
            description: getVal(v, "description") || undefined,
            country: getVal(v, "country") || undefined,
            city: getVal(v, "city") || undefined,
            itineraryDate: date,
            startTime: startTime.substring(0, 5),
            endTime: endTime.substring(0, 5),
            planId,
          });
          if (fileToUpload)
            await uploadPendingFile(
              fileToUpload,
              PLAN_ENTITY_KIND.ITINERARY,
              created.id,
            );
          await extendPlanDatesIfNeeded([date]);
          break;
        }
        case "flight": {
          const segs = Array.isArray(v.segments)
            ? (v.segments as Record<string, unknown>[])
            : [];
          const created = await flightsApi.createFlight({
            planId,
            reservationNumber:
              getVal(v, "reservationNumber", "reservation_number") || null,
            passengerName: getVal(v, "passengerName", "passenger_name") || null,
            segments: segs.map(seg => ({
              airline: getVal(seg, "airline") || undefined,
              flightNumber:
                getVal(seg, "flightNumber", "flight_number") || undefined,
              departureAirport: getVal(
                seg,
                "departureAirport",
                "departure_airport",
              ),
              arrivalAirport: getVal(seg, "arrivalAirport", "arrival_airport"),
              departureTime: (() => {
                const raw = String(getVal(seg, "departureTime", "departure_time") ?? "");
                const d = new Date(raw);
                return !isNaN(d.getTime()) ? d.toISOString() : raw;
              })(),
              arrivalTime: (() => {
                const raw = String(getVal(seg, "arrivalTime", "arrival_time") ?? "");
                const d = new Date(raw);
                return !isNaN(d.getTime()) ? d.toISOString() : raw;
              })(),
              seatClass: getVal(seg, "seatClass", "seat_class") || undefined,
              seatNumber: getVal(seg, "seatNumber", "seat_number") || undefined,
              gate: getVal(seg, "gate") || undefined,
              terminal: getVal(seg, "terminal") || undefined,
            })),
          });
          if (fileToUpload)
            await uploadPendingFile(
              fileToUpload,
              PLAN_ENTITY_KIND.FLIGHT,
              created.id,
            );
          const flightDates = segs
            .flatMap(seg => [
              getVal(seg, "departureTime", "departure_time"),
              getVal(seg, "arrivalTime", "arrival_time"),
            ])
            .filter(Boolean);
          await extendPlanDatesIfNeeded(flightDates);
          break;
        }
        case "accommodation": {
          const ex = v.expense as Record<string, unknown> | undefined;
          const checkinDate =
            getVal(v, "checkinDate", "checkin_date") ||
            dayjs().format("YYYY-MM-DD");
          const checkoutDate =
            getVal(v, "checkoutDate", "checkout_date") ||
            dayjs().add(1, "day").format("YYYY-MM-DD");
          const catRaw = ex ? getVal(ex, "category") : "";
          const curRaw = ex ? getVal(ex, "currency") : "";
          const validCats = Object.values(ExpenseCategory) as string[];
          const validCurs = Object.values(ExpenseCurrency) as string[];
          const created = await accommodationsApi.createAccommodation({
            name: getVal(v, "name") || "숙소",
            country: getVal(v, "country") || undefined,
            city: getVal(v, "city") || undefined,
            checkinDate,
            checkoutDate,
            checkinTime: getVal(v, "checkinTime", "checkin_time") || "15:00",
            checkoutTime: getVal(v, "checkoutTime", "checkout_time") || "11:00",
            description: getVal(v, "description") || undefined,
            planId,
            expense: {
              exDate: ex
                ? getVal(ex, "exDate", "ex_date") || checkinDate
                : checkinDate,
              amount: ex ? Number(ex.amount) || 0 : 0,
              category: (catRaw && validCats.includes(catRaw)
                ? catRaw
                : "accommodation") as ExpenseCategory,
              currency: (curRaw && validCurs.includes(curRaw)
                ? curRaw
                : "KRW") as ExpenseCurrency,
            },
          });
          if (fileToUpload)
            await uploadPendingFile(
              fileToUpload,
              PLAN_ENTITY_KIND.ACCOMMODATION,
              created.id,
            );
          await extendPlanDatesIfNeeded([checkinDate, checkoutDate]);
          break;
        }
        case "expense": {
          const catRaw = getVal(v, "category");
          const curRaw = getVal(v, "currency");
          const validCats = Object.values(ExpenseCategory) as string[];
          const validCurs = Object.values(ExpenseCurrency) as string[];
          const exDate =
            getVal(v, "exDate", "ex_date") || dayjs().format("YYYY-MM-DD");
          const created = await expensesApi.createExpense({
            exDate,
            amount: Number(v.amount) || 0,
            category: (catRaw && validCats.includes(catRaw)
              ? catRaw
              : "etc") as ExpenseCategory,
            currency: (curRaw && validCurs.includes(curRaw)
              ? curRaw
              : "KRW") as ExpenseCurrency,
            description: getVal(v, "description") || undefined,
            planId,
          });
          if (fileToUpload)
            await uploadPendingFile(
              fileToUpload,
              PLAN_ENTITY_KIND.EXPENSE,
              created.id,
            );
          await extendPlanDatesIfNeeded([exDate]);
          break;
        }
      }

      setMessages(prev => [
        ...prev,
        { role: "ai", text: "✅ 저장됐어요! 다른 일정도 추가해드릴까요?" },
      ]);
      onSaved?.();
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "ai", text: "❌ 저장에 실패했습니다. 다시 시도해주세요." },
      ]);
    } finally {
      applyingRef.current = false;
      setLoading(false);
      setLoadingLabel("일정을 분석하고 있어요...");
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const discardAndClose = () => {
    setMessage("");
    setResultView(null);
    setIsDragging(false);
    pendingFileRef.current = null;
    onClose();
  };
  const { requestClose: handleClose, discardConfirmModal } = useDiscardConfirm(
    !!message.trim() || isResultEditMode,
    discardAndClose,
  );

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    void handleFileAttach(file);
  };

  handleFileAttachRef.current = handleFileAttach;

  useEffect(() => {
    if (resultView) setIsResultEditMode(false);
  }, [resultView]);

  useEffect(() => {
    if (!visible) return;
    const prevent = (e: DragEvent) => e.preventDefault();
    document.addEventListener("dragover", prevent);
    document.addEventListener("drop", prevent);
    return () => {
      document.removeEventListener("dragover", prevent);
      document.removeEventListener("drop", prevent);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const el = dragZoneRef.current as unknown as HTMLElement | null;
    if (!el) return;

    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (!el.contains(e.relatedTarget as Node)) setIsDragging(false);
    };
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) void handleFileAttachRef.current(file);
    };

    el.addEventListener("dragenter", onDragEnter);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("drop", onDrop);

    return () => {
      el.removeEventListener("dragenter", onDragEnter);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("drop", onDrop);
      setIsDragging(false);
    };
  }, [visible]);

  const hiddenFileInput = createElement("input", {
    key: "ai-modal-file-input",
    ref: (el: HTMLInputElement | null) => {
      fileInputRef.current = el;
    },
    type: "file",
    accept: WEB_FILE_ACCEPT,
    multiple: false,
    style: { display: "none" },
    onChange: handleFileInputChange,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {resultView ? (
            <>
              <LinearGradient
                colors={colors.aiHeaderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.resultHeader}
              >
                <Pressable
                  onPress={() => setResultView(null)}
                  style={styles.resultBackButton}
                  accessibilityLabel="대화로 돌아가기"
                >
                  <LeftArrowIcon
                    width={16}
                    height={16}
                    color={colors.aiInkDark}
                  />
                </Pressable>
                <LinearGradient
                  colors={colors.aiGrad as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.resultAiBadge}
                >
                  <CheckWhiteIcon width={18} height={18} />
                </LinearGradient>
                <View style={styles.resultHeaderTextBlock}>
                  <Text style={styles.resultTitle}>분석 결과를 확인하세요</Text>
                  <Text style={styles.resultSubtitle}>
                    {resultView.source === "text"
                      ? "대화 내용에서 아래 일정 정보를 찾았어요"
                      : "첨부파일에서 아래 일정 정보를 찾았어요"}
                  </Text>
                </View>
                <Pressable
                  onPress={handleClose}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="닫기"
                >
                  <CloseIcon width={16} height={16} color={colors.gray700} />
                </Pressable>
              </LinearGradient>

              <ScrollView
                style={styles.resultScroll}
                contentContainerStyle={styles.resultScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {isResultEditMode && resultView.result.draft ? (
                  <AiAnalyzeResultBody
                    ref={resultDraftEditorRef}
                    draft={resultView.result.draft}
                  />
                ) : (
                  <AiAnalyzeResultContent
                    analyzeResult={resultView.result}
                    analyzeFileName={
                      resultView.source === "file"
                        ? resultView.fileName
                        : undefined
                    }
                    sourceLabel={
                      resultView.source === "text"
                        ? "대화 내용 분석"
                        : undefined
                    }
                  />
                )}
              </ScrollView>

              <View style={styles.resultFooter}>
                <ActionButton
                  label={isResultEditMode ? "취소" : "직접 수정"}
                  tone="secondary"
                  size="M"
                  fill
                  onPress={() => {
                    if (isResultEditMode) {
                      setIsResultEditMode(false);
                    } else {
                      setIsResultEditMode(true);
                    }
                  }}
                />
                <ActionButton
                  label={isResultEditMode ? "저장" : "이대로 추가"}
                  size="M"
                  fill
                  blocked={loading}
                  onPress={() => {
                    const draft = isResultEditMode
                      ? (resultDraftEditorRef.current?.buildDraft() ??
                        resultView.result.draft)
                      : resultView.result.draft;
                    if (!draft) return;
                    setResultView(null);
                    handleAnalyzeApply(draft);
                  }}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.header}>
                <View style={styles.titleBlock}>
                  <Text style={styles.headerTitle}>대화로 일정 추가</Text>
                  <Text style={styles.subtitle}>
                    대화 또는 첨부파일을 AI가 분석해 일정을 등록해요.
                  </Text>
                </View>
                <MotionPressable
                  style={styles.closeButton}
                  onPress={handleClose}
                  accessibilityRole="button"
                  accessibilityLabel="닫기"
                >
                  <MotionIcon>
                    <CloseSmIcon
                      width={16}
                      height={16}
                      color={colors.gray700}
                    />
                  </MotionIcon>
                </MotionPressable>
              </View>

              <View ref={dragZoneRef} style={styles.chatScrollWrapper}>
                <ScrollView
                  ref={scrollRef}
                  style={styles.chatScroll}
                  contentContainerStyle={styles.chatScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  onContentSizeChange={() =>
                    scrollRef.current?.scrollToEnd({ animated: false })
                  }
                >
                  {messages.map((msg, idx) => {
                    if (msg.role === "user-file") {
                      return (
                        <View key={idx} style={styles.userBubbleWrap}>
                          <View
                            style={[styles.userBubble, styles.userFileBubble]}
                          >
                            {String(msg.mimeType ?? "").startsWith("image/") ? (
                              <AttachmentImageIcon width={20} height={20} />
                            ) : (
                              <AttachmentDocIcon width={20} height={20} />
                            )}
                            <View style={styles.userFileContent}>
                              <Text
                                style={styles.userBubbleText}
                                numberOfLines={1}
                              >
                                {msg.fileName}
                              </Text>
                              <Text style={styles.fileMimeLabel}>
                                {getFileMimeLabel(msg.mimeType)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    }
                    if (msg.role === "ai-analyzing") {
                      return (
                        <View key={idx} style={styles.aiBubbleWrap}>
                          <View style={[styles.aiBubble, styles.aiBubbleRow]}>
                            <ActivityIndicator
                              size="small"
                              color={colors.white}
                            />
                            <Text style={styles.aiBubbleText}>
                              첨부파일을 분석하고있어요..
                            </Text>
                          </View>
                        </View>
                      );
                    }
                    if (msg.role === "ai-result-card") {
                      const summary = getResultSummary(msg.result);
                      const typeLabel = getItemTypeLabel(
                        msg.result.inferredItemType,
                      );
                      return (
                        <View key={idx} style={styles.aiBubbleWrap}>
                          <Pressable
                            style={({ pressed }) => [
                              styles.resultCard,
                              hoveredCardIdx === idx &&
                                styles.resultCardHovered,
                              pressed && { opacity: 0.82 },
                            ]}
                            onPress={() =>
                              setResultView({
                                result: msg.result,
                                source: msg.source,
                                fileName: msg.fileName,
                              })
                            }
                            {...({
                              onMouseEnter: () => setHoveredCardIdx(idx),
                              onMouseLeave: () => setHoveredCardIdx(null),
                            } as any)}
                          >
                            <View style={styles.resultCardHeader}>
                              <LinearGradient
                                colors={colors.aiGrad as [string, string]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.resultCardBadge}
                              >
                                <CheckWhiteIcon width={12} height={12} />
                              </LinearGradient>
                              <Text style={styles.resultCardSourceLabel}>
                                {typeLabel} 분석
                              </Text>
                            </View>
                            {!!summary && (
                              <Text
                                style={styles.resultCardTypeLabel}
                                numberOfLines={2}
                              >
                                {summary}
                              </Text>
                            )}
                          </Pressable>
                        </View>
                      );
                    }
                    if (msg.role === "ai-intro") {
                      return (
                        <View key={idx} style={styles.aiBubbleWrap}>
                          <View style={styles.aiBubble}>
                            <Text style={styles.aiBubbleText}>{msg.text}</Text>
                            <View style={styles.introSuggestions}>
                              {msg.suggestions.map((s, i) => (
                                <MotionPressable
                                  key={i}
                                  style={styles.introSuggestionButton}
                                  onPress={() => setMessage(s)}
                                >
                                  <Text style={styles.introSuggestionQuote}>
                                    “
                                  </Text>
                                  <Text
                                    style={styles.introSuggestionText}
                                    numberOfLines={1}
                                  >
                                    {s}
                                  </Text>
                                </MotionPressable>
                              ))}
                            </View>
                          </View>
                        </View>
                      );
                    }
                    if (msg.role === "ai-unclear") {
                      return (
                        <View key={idx} style={styles.aiBubbleWrap}>
                          <View style={styles.unclearBubble}>
                            <View style={styles.unclearHeader}>
                              {createElement(
                                "svg",
                                {
                                  width: 16,
                                  height: 16,
                                  viewBox: "0 0 16 16",
                                  fill: "none",
                                  style: { flexShrink: 0, marginTop: 1 },
                                },
                                createElement("path", {
                                  d: "M8 1.6l6.8 11.8H1.2L8 1.6z",
                                  stroke: "#C0392B",
                                  strokeWidth: "1.4",
                                  strokeLinejoin: "round",
                                  fill: "#FFE2DE",
                                }),
                                createElement("path", {
                                  d: "M8 6.4v3.2",
                                  stroke: "#C0392B",
                                  strokeWidth: "1.6",
                                  strokeLinecap: "round",
                                }),
                                createElement("circle", {
                                  cx: "8",
                                  cy: "11.6",
                                  r: "0.9",
                                  fill: "#C0392B",
                                }),
                              )}
                              <Text style={styles.unclearTitle}>
                                {msg.title}
                              </Text>
                            </View>
                            <Text style={styles.unclearBody}>{msg.body}</Text>
                            <View style={styles.unclearSuggestions}>
                              {msg.suggestions.map((s, i) => (
                                <Pressable
                                  key={i}
                                  style={styles.suggestionButton}
                                  onPress={() => setMessage(s)}
                                >
                                  <Text
                                    style={styles.suggestionText}
                                    numberOfLines={1}
                                  >{`"${s}"`}</Text>
                                </Pressable>
                              ))}
                            </View>
                          </View>
                        </View>
                      );
                    }
                    if (msg.role === "ai") {
                      return (
                        <View key={idx} style={styles.aiBubbleWrap}>
                          <View style={styles.aiBubble}>
                            <Text style={styles.aiBubbleText}>{msg.text}</Text>
                          </View>
                        </View>
                      );
                    }
                    return (
                      <View key={idx} style={styles.userBubbleWrap}>
                        <View style={styles.userBubble}>
                          <Text style={styles.userBubbleText}>{msg.text}</Text>
                        </View>
                      </View>
                    );
                  })}
                  {loading &&
                    messages[messages.length - 1]?.role !== "ai-analyzing" && (
                      <View style={styles.aiBubbleWrap}>
                        <View style={[styles.aiBubble, styles.aiBubbleRow]}>
                          <ActivityIndicator
                            size="small"
                            color={colors.white}
                          />
                          <Text style={styles.aiBubbleText}>
                            {loadingLabel}
                          </Text>
                        </View>
                      </View>
                    )}
                </ScrollView>

                {isDragging && (
                  <View style={styles.dragOverlay} pointerEvents="none">
                    <View style={styles.dragOverlayInner}>
                      <Text style={styles.dragOverlayText}>
                        파일을 놓아 분석하기
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.footer}>
                {hiddenFileInput}
                <MotionPressable
                  style={[
                    styles.attachButton,
                    loading && styles.attachButtonDisabled,
                  ]}
                  onPress={() => {
                    if (!loading) fileInputRef.current?.click();
                  }}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="파일 첨부"
                >
                  <MotionIcon>
                    <FileIcon width={20} height={20} color={colors.gray600} />
                  </MotionIcon>
                </MotionPressable>
                <Input
                  variant="filled"
                  containerStyle={styles.inputContainer}
                  style={styles.input}
                  placeholder="일정을 입력하거나 파일을 첨부하세요..."
                  placeholderTextColor={colors.gray600}
                  value={message}
                  onChangeText={setMessage}
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                  editable={!loading}
                />
                <MotionPressable
                  style={[
                    styles.sendButton,
                    sendDisabled && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={sendDisabled}
                  accessibilityRole="button"
                  accessibilityLabel="전송"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <MotionIcon>
                      <SendIcon width={20} height={20} color={colors.white} />
                    </MotionIcon>
                  )}
                </MotionPressable>
              </View>
            </>
          )}
        </View>
      </View>
      {discardConfirmModal}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...modalMotion.overlay,
    flex: 1,
    ...surfaces.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lgPlus,
  },
  card: {
    ...modalMotion.card,
    width: 420,
    maxWidth: "100%",
    height: 600,
    maxHeight: "min(680px, calc(100dvh - 80px))" as ViewStyle["maxHeight"],
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    overflow: "hidden",
    flexDirection: "column",
    ...shadows.xl,
  },
  resultHeader: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  resultBackButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 6,
    marginLeft: -4,
  },
  resultAiBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 4,
    shadowColor: colors.aiInk,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resultHeaderTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  resultTitle: {
    ...textStyles.h5,
    color: colors.gray900,
  },
  resultSubtitle: {
    ...textStyles.body4,
    color: colors.aiInk,
    marginTop: 2,
  },
  resultScroll: {
    flex: 1,
  },
  resultScrollContent: {
    padding: 16,
    paddingHorizontal: 22,
    paddingBottom: 4,
    gap: 12,
  },
  resultFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  titleBlock: {
    flex: 1,
  },
  headerTitle: {
    ...textStyles.h2,
    color: colors.gray900,
  },
  subtitle: {
    ...textStyles.body5,
    marginTop: spacing.xs,
    color: colors.gray700,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  chatScrollWrapper: {
    flex: 1,
    position: "relative",
  },
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  dragOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 122, 255, 0.08)",
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  } as any,
  dragOverlayInner: {
    alignItems: "center",
    gap: 8,
  },
  dragOverlayText: {
    ...textStyles.h6,
    color: colors.primary,
  },
  aiBubbleWrap: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  aiBubble: {
    maxWidth: "85%",
    backgroundColor: colors.toastCheck,
    borderRadius: radii.lgPlus,
    borderBottomLeftRadius: radii.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  aiBubbleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiBubbleText: {
    ...textStyles.body5,
    color: colors.white,
  },
  unclearBubble: {
    maxWidth: "85%",
    backgroundColor: "rgb(255, 241, 239)",
    borderWidth: 1,
    borderColor: "rgb(251, 217, 211)",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  unclearHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  unclearTitle: {
    ...textStyles.h7,
    color: "rgb(192, 57, 43)",
  },
  unclearBody: {
    ...textStyles.body4,
    color: "rgb(90, 42, 34)",
  },
  unclearSuggestions: {
    flexDirection: "column",
    gap: 6,
    marginTop: 10,
  },
  suggestionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgb(242, 187, 177)",
    backgroundColor: colors.white,
    borderRadius: 10,
  },
  suggestionText: {
    ...textStyles.body5,
    color: "rgb(192, 57, 43)",
    flex: 1,
  },
  introSuggestionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: radii.md,
  },
  introSuggestions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  introSuggestionQuote: {
    ...textStyles.h6,
    color: colors.white,
    opacity: 0.7,
    marginTop: -2,
  },
  introSuggestionText: {
    ...textStyles.body5,
    color: colors.white,
    flex: 1,
  },
  userBubbleWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  userBubble: {
    maxWidth: "85%",
    backgroundColor: colors.gray200,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userFileBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userFileContent: {
    flex: 1,
    minWidth: 0,
  },
  userBubbleText: {
    ...textStyles.body4,
  },
  fileMimeLabel: {
    ...textStyles.body5,
    color: colors.gray600,
    marginTop: 2,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    ...surfaces.subtle,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  attachButtonDisabled: {
    opacity: 0.5,
  },
  input: {
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 0,
    ...textStyles.body5,
    color: colors.gray900,
  },
  inputContainer: {
    flex: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    ...surfaces.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  resultCard: {
    maxWidth: "85%",
    backgroundColor: colors.white,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    cursor: "pointer",
  } as any,
  resultCardHovered: {
    backgroundColor: colors.aiTint,
  },
  resultCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  resultCardBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  resultCardSourceLabel: {
    ...textStyles.body5,
    color: colors.aiInk,
  },
  resultCardTypeLabel: {
    ...textStyles.h6,
    color: colors.gray900,
  },
});
