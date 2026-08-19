import { accommodationsApi } from "@/services/accommodations";
import { analyzeDocumentUpload, parseTextToItem } from "@/services/aiDocument";
import { attachmentsApi } from "@/services/attachments";
import { expensesApi } from "@/services/expenses";
import { flightsApi } from "@/services/flights";
import { itinerariesApi } from "@/services/itineraries";
import type {
  AiDocumentItemDraft,
  AttachmentEntityType,
  DocumentUploadAnalyzeResponse,
  LocalFile,
} from "@/types/api";
import { ExpenseCategory, ExpenseCurrency, PLAN_ENTITY_KIND } from "@/types/api";
import { useFilePicker } from "@/hooks/useFilePicker";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import { AiAnalyzeResultContent } from "../AiDocumentAnalyzeModal";
import {
  type AiAnalyzeDraftEditorRef,
  AiAnalyzeResultBody,
} from "../aiDocumentAnalyzeDraftBody";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CheckWhiteIcon from "../../../../assets/check_white.svg";
import AttachClipIcon from "../../../../assets/files.svg";
import LeftArrowIcon from "../../../../assets/left_arrow.svg";
import AttachmentDocIcon from "../../../../assets/mobile_attachment_document.svg";
import AttachmentImageIcon from "../../../../assets/mobile_attachment_image.svg";
import CloseIcon from "../../../../assets/mobile_close.svg";
import ShareIcon from "../../../../assets/share.svg";

interface AddScheduleWithAiModalProps {
  visible: boolean;
  onClose: () => void;
  planId: number;
  planPublicId: string;
  planStartDate?: string;
  planEndDate?: string;
  onPlanDatesExtended?: (newStart: string, newEnd: string) => void;
  onSaved?: () => void;
}

type Message =
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

const AI_INTRO_MESSAGE: Message = {
  role: "ai-intro",
  text: "안녕하세요! 어떤 일정을 추가해 드릴까요?\n텍스트로 알려주시거나, 예약 메일·티켓 이미지를 첨부하면 자동으로 정리해 드려요.\n예를 들어, 이렇게 입력해 보세요.",
  suggestions: ["4월 15일 오후 2시에 루브르 박물관 가고 싶어"],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
    case "itinerary": return "일정";
    case "flight": return "항공편";
    case "accommodation": return "숙소";
    case "expense": return "지출";
    default: return "분석 결과";
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
    default: return "";
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
}: AddScheduleWithAiModalProps) {
  type ResultView = {
    result: DocumentUploadAnalyzeResponse;
    source: "text" | "file";
    fileName?: string;
  };

  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([AI_INTRO_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("일정을 분석하고 있어요...");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [resultView, setResultView] = useState<ResultView | null>(null);
  const [isResultEditMode, setIsResultEditMode] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const pendingFileRef = useRef<LocalFile | null>(null);
  const resultDraftEditorRef = useRef<AiAnalyzeDraftEditorRef>(null);
  const { pickImage, pickDocument } = useFilePicker();

  useEffect(() => {
    if (resultView) setIsResultEditMode(false);
  }, [resultView]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, e => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    });
    const hideSub = Keyboard.addListener(hideEvent, () =>
      setKeyboardHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const uploadPendingFile = async (
    file: LocalFile,
    entityType: AttachmentEntityType,
    entityId: number,
  ) => {
    const prepared = await attachmentsApi.prepareAttachmentUpload(file);
    const { uploadUrl, fileKey, publicUrl } =
      await attachmentsApi.getPresignedUploadUrl({
        planId,
        entityType,
        entityId,
        fileName: file.name,
        contentType: file.mimeType,
        fileSize: prepared.byteLength,
      });
    await attachmentsApi.uploadToR2(uploadUrl, prepared, file.mimeType);
    await attachmentsApi.confirmUpload({
      planId,
      entityType,
      entityId,
      fileKey,
      fileName: file.name,
      contentType: file.mimeType,
      fileSize: prepared.byteLength,
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
            role: "ai",
            text: result.error ?? "어떤 일정을 추가할지 조금 더 알려주시겠어요?",
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

  const handleFileAttach = async (file: LocalFile) => {
    if (loading) return;

    if (file.size > MAX_FILE_SIZE) {
      setMessages(prev => [
        ...prev,
        { role: "user-file", fileName: file.name, mimeType: file.mimeType },
        {
          role: "ai-unclear",
          title: "파일 용량이 너무 커요",
          body: `"${file.name}"은(는) 10MB를 넘어서 업로드할 수 없어요.\n용량을 줄이거나 일부만 잘라 다시 첨부해 주세요.`,
          suggestions: [],
        },
      ]);
      return;
    }

    pendingFileRef.current = file;
    const analyzingId = `analyzing-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      { role: "user-file", fileName: file.name, mimeType: file.mimeType },
      { role: "ai-analyzing", id: analyzingId },
    ]);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const result = await analyzeDocumentUpload(
        { uri: file.uri, name: file.name, type: file.mimeType },
        { filename: file.name },
      );
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
          { role: "ai-result-card", result, source: "file", fileName: file.name },
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

  const handleAttachPress = () => {
    Alert.alert("파일 첨부", "어떤 파일을 첨부하시겠어요?", [
      {
        text: "이미지 선택",
        onPress: async () => {
          const file = await pickImage();
          if (file) await handleFileAttach(file);
        },
      },
      {
        text: "문서 선택",
        onPress: async () => {
          const file = await pickDocument();
          if (file) await handleFileAttach(file);
        },
      },
      { text: "취소", style: "cancel" },
    ]);
  };

  const handleAnalyzeApply = async (draft: AiDocumentItemDraft) => {
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
            passengerName:
              getVal(v, "passengerName", "passenger_name") || null,
            segments: segs.map(seg => ({
              airline: getVal(seg, "airline") || undefined,
              flightNumber:
                getVal(seg, "flightNumber", "flight_number") || undefined,
              departureAirport: getVal(
                seg,
                "departureAirport",
                "departure_airport",
              ),
              arrivalAirport: getVal(
                seg,
                "arrivalAirport",
                "arrival_airport",
              ),
              departureTime: getVal(
                seg,
                "departureTime",
                "departure_time",
              ),
              arrivalTime: getVal(seg, "arrivalTime", "arrival_time"),
              seatClass: getVal(seg, "seatClass", "seat_class") || undefined,
              seatNumber:
                getVal(seg, "seatNumber", "seat_number") || undefined,
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
            checkinTime:
              getVal(v, "checkinTime", "checkin_time") || "15:00",
            checkoutTime:
              getVal(v, "checkoutTime", "checkout_time") || "11:00",
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
      setLoading(false);
      setLoadingLabel("일정을 분석하고 있어요...");
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      height={0.85}
      backdropOpacity={0.7}
      showDragHandle
    >
      <View
        style={[
          styles.shell,
          {
            paddingBottom:
              keyboardHeight > 0
                ? keyboardHeight
                : Math.max(insets.bottom, 12),
          },
        ]}
      >
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
                <LeftArrowIcon width={16} height={16} color={colors.aiInkDark} />
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
                onPress={onClose}
                style={styles.closeButton}
                accessibilityLabel="닫기"
              >
                <CloseIcon width={20} height={20} color={colors.gray700} />
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
                    resultView.source === "text" ? "대화 내용 분석" : undefined
                  }
                />
              )}
            </ScrollView>

            <View style={styles.resultFooter}>
              <Pressable
                style={({ pressed }) => [
                  styles.resultFooterBtn,
                  styles.resultFooterBtnCancel,
                  pressed && { opacity: 0.75 },
                ]}
                onPress={() => setIsResultEditMode(prev => !prev)}
              >
                <Text style={styles.resultFooterBtnCancelText}>
                  {isResultEditMode ? "취소" : "직접 수정"}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.resultFooterBtn,
                  styles.resultFooterBtnApply,
                  pressed && { opacity: 0.85 },
                  loading && styles.resultFooterBtnDisabled,
                ]}
                disabled={loading}
                onPress={() => {
                  const draft = isResultEditMode
                    ? (resultDraftEditorRef.current?.buildDraft() ??
                      resultView.result.draft)
                    : resultView.result.draft;
                  if (!draft) return;
                  setResultView(null);
                  handleAnalyzeApply(draft);
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.resultFooterBtnApplyText}>
                    {isResultEditMode ? "저장" : "이대로 추가"}
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={styles.header}>
              <View style={styles.titleBlock}>
                <Text style={styles.headerTitle}>AI 일정 추가</Text>
                <Text style={styles.subtitle}>
                  대화를 간편하게 일정을 등록하세요.
                </Text>
              </View>
              <Pressable
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={8}
                accessibilityLabel="닫기"
              >
                <CloseIcon width={20} height={20} color={colors.gray700} />
              </Pressable>
            </View>

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
                      <View style={[styles.userBubble, styles.userFileBubble]}>
                        {msg.mimeType.startsWith("image/") ? (
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
                            {msg.mimeType.startsWith("image/")
                              ? "이미지 선택"
                              : "문서 선택"}
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
                        <ActivityIndicator size="small" color={colors.white} />
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
                          pressed && { opacity: 0.82 },
                        ]}
                        onPress={() =>
                          setResultView({
                            result: msg.result,
                            source: msg.source,
                            fileName: msg.fileName,
                          })
                        }
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
                        <View style={styles.suggestions}>
                          {msg.suggestions.map((s, i) => (
                            <Pressable
                              key={i}
                              style={styles.introSuggestionButton}
                              onPress={() => setMessage(s)}
                            >
                              <Text
                                style={styles.introSuggestionText}
                                numberOfLines={1}
                              >{`"${s}"`}</Text>
                            </Pressable>
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
                        <Text style={styles.unclearTitle}>
                          ⚠️ {msg.title}
                        </Text>
                        <Text style={styles.unclearBody}>{msg.body}</Text>
                        {msg.suggestions.length > 0 && (
                          <View style={styles.suggestions}>
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
                        )}
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
                      <ActivityIndicator size="small" color={colors.white} />
                      <Text style={styles.aiBubbleText}>
                        {loadingLabel}
                      </Text>
                    </View>
                  </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
              <View style={styles.footerDivider} />
              <View style={styles.inputField}>
                <Pressable
                  style={styles.attachButton}
                  onPress={handleAttachPress}
                  disabled={loading}
                  hitSlop={8}
                  accessibilityLabel="파일 첨부"
                >
                  <AttachClipIcon
                    width={22}
                    height={22}
                    color={colors.gray500}
                    style={{ transform: [{ rotate: "45deg" }] }}
                  />
                </Pressable>
                <TextInput
                  style={[
                    styles.inputText,
                    Platform.OS === "android" && styles.inputTextAndroid,
                    Platform.OS === "ios" && styles.inputTextIOS,
                  ]}
                  placeholder="일정을 입력해주세요..."
                  placeholderTextColor={colors.gray600}
                  value={message}
                  onChangeText={setMessage}
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                  editable={!loading}
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.sendInside,
                    pressed && styles.sendInsidePressed,
                    (loading || !message.trim()) && styles.sendInsideDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={loading || !message.trim()}
                  accessibilityLabel="전송"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                >
                  <View
                    style={[
                      styles.sendIconWrap,
                      (loading || !message.trim()) &&
                        styles.sendIconWrapDisabled,
                    ]}
                  >
                    <ShareIcon width={30} height={30} color={colors.white} />
                  </View>
                </Pressable>
              </View>
            </View>
          </>
        )}
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
    minHeight: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  titleBlock: {
    flex: 1,
    marginRight: 12,
    gap: spacing.xs,
  },
  headerTitle: {
    ...textStyles.h4,
    color: colors.black,
  },
  subtitle: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  chatScroll: {
    flex: 1,
    minHeight: 0,
  },
  chatScrollContent: {
    paddingBottom: 12,
    flexGrow: 1,
    gap: 8,
  },
  aiBubbleWrap: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  aiBubble: {
    alignSelf: "flex-start",
    maxWidth: "85%",
    backgroundColor: colors.primary,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  aiBubbleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiBubbleText: {
    ...textStyles.body3,
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
  unclearTitle: {
    ...textStyles.h7,
    color: "rgb(192, 57, 43)",
    marginBottom: 4,
  },
  unclearBody: {
    ...textStyles.body4,
    color: "rgb(90, 42, 34)",
  },
  userBubbleWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  userBubble: {
    alignSelf: "flex-end",
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
    ...textStyles.body3,
    color: colors.black,
  },
  fileMimeLabel: {
    ...textStyles.body5,
    color: colors.gray600,
    marginTop: 2,
  },
  suggestions: {
    flexDirection: "column",
    gap: 6,
    marginTop: 10,
  },
  suggestionButton: {
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
  },
  introSuggestionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 10,
  },
  introSuggestionText: {
    ...textStyles.body5,
    color: colors.white,
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
  resultHeader: {
    marginHorizontal: -20,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  resultBackButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 4,
  },
  resultAiBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
    shadowColor: colors.aiInk,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
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
    paddingVertical: 12,
    gap: 12,
  },
  resultFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  resultFooterBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  resultFooterBtnCancel: {
    flex: 1,
    backgroundColor: colors.gray200,
  },
  resultFooterBtnApply: {
    flex: 1.4,
    backgroundColor: colors.primary,
  },
  resultFooterBtnDisabled: {
    opacity: 0.6,
  },
  resultFooterBtnCancelText: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  resultFooterBtnApplyText: {
    ...textStyles.h7,
    color: colors.white,
  },
  footer: {
    paddingTop: 0,
  },
  footerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.gray300,
    marginHorizontal: -20,
    marginBottom: 12,
  },
  inputField: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: colors.gray200,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    gap: spacing.sm,
  },
  attachButton: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  inputText: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.black,
  },
  inputTextAndroid: {
    includeFontPadding: true,
    textAlignVertical: "center",
    paddingTop: 9,
    paddingBottom: 9,
  },
  inputTextIOS: {
    paddingTop: 6,
    paddingBottom: 12,
  },
  sendInside: {
    justifyContent: "center",
    alignItems: "center",
  },
  sendInsidePressed: {
    opacity: 0.7,
  },
  sendInsideDisabled: {
    opacity: 0.5,
  },
  sendIconWrap: {
    width: 42,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  sendIconWrapDisabled: {
    backgroundColor: colors.gray400,
  },
});
