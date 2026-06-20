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
import { colors } from "@/ui/tokens/colors";
import { textStyles, typography } from "@/ui/tokens/typography";
import dayjs from "dayjs";
import type React from "react";
import { createElement, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import FileIcon from "../../../assets/files.svg";
import AttachmentDocIcon from "../../../assets/mobile_attachment_document.svg";
import AttachmentImageIcon from "../../../assets/mobile_attachment_image.svg";
import SendIcon from "../../../assets/share.svg";
import CloseIcon from "../../../assets/x.svg";
import AiDocumentAnalyzeModal from "./AiDocumentAnalyzeModal";
import AiResultCard from "./AiResultCard";

interface AddScheduleWithAiModalProps {
  visible: boolean;
  onClose: () => void;
  planId: number;
  planPublicId: string;
  onSaved?: () => void;
  messages: Message[];
  onMessagesChange: React.Dispatch<React.SetStateAction<Message[]>>;
}

export type Message =
  | { role: "ai"; text: string }
  | { role: "user"; text: string }
  | { role: "user-file"; fileName: string; mimeType: string }
  | { role: "ai-analyzing"; id: string }
  | { role: "result"; result: DocumentUploadAnalyzeResponse };

export const AI_INTRO =
  '안녕하세요! 어떤 일정을 추가해 드릴까요?\n예: "내일 오후 2시에 루브르 박물관 가고 싶어", "3월 10일에 파리 하얏트 호텔 체크인해줘"';

const WEB_FILE_ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,application/pdf,.pdf";

function getFileMimeLabel(mimeType: string): string {
  if (mimeType === "application/pdf") return "PDF 문서";
  if (mimeType.startsWith("image/")) return "이미지 파일";
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

export default function AddScheduleWithAiModal({
  visible,
  onClose,
  planId,
  planPublicId,
  onSaved,
  messages,
  onMessagesChange: setMessages,
}: AddScheduleWithAiModalProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [analyzeResult, setAnalyzeResult] =
    useState<DocumentUploadAnalyzeResponse | null>(null);
  const [analyzeModalVisible, setAnalyzeModalVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingFileRef = useRef<File | null>(null);
  const dragZoneRef = useRef<View>(null);
  const handleFileAttachRef = useRef<(file: File) => Promise<void>>(
    null as any,
  );

  const handleSend = async () => {
    const text = message.trim();
    if (!text || loading) return;

    setMessage("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const result = await parseTextToItem(text, planPublicId);
      if (result.success && result.draft) {
        setMessages(prev => [...prev, { role: "result", result }]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: "ai",
            text: result.error || "분석에 실패했습니다. 다시 시도해주세요.",
          },
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "ai", text: "오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleFileAttach = async (file: File) => {
    if (loading) return;

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
        setAnalyzeResult(result);
        setAnalyzeModalVisible(true);
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: "ai",
            text:
              result.error || "파일 분석에 실패했습니다. 다시 시도해주세요.",
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
        { role: "ai", text: "오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
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

  const handleAnalyzeApply = async (draft: AiDocumentItemDraft) => {
    setAnalyzeModalVisible(false);
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
            location: getVal(v, "location") || undefined,
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
              departureTime: getVal(seg, "departureTime", "departure_time"),
              arrivalTime: getVal(seg, "arrivalTime", "arrival_time"),
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
          break;
        }
        case "accommodation": {
          const ex = v.expense as Record<string, unknown> | undefined;
          const checkinDate =
            getVal(v, "checkinDate", "checkin_date") ||
            dayjs().format("YYYY-MM-DD");
          const catRaw = ex ? getVal(ex, "category") : "";
          const curRaw = ex ? getVal(ex, "currency") : "";
          const validCats = Object.values(ExpenseCategory) as string[];
          const validCurs = Object.values(ExpenseCurrency) as string[];
          const created = await accommodationsApi.createAccommodation({
            name: getVal(v, "name") || "숙소",
            place: getVal(v, "place") || undefined,
            country: getVal(v, "country") || undefined,
            city: getVal(v, "city") || undefined,
            checkinDate,
            checkoutDate:
              getVal(v, "checkoutDate", "checkout_date") ||
              dayjs().add(1, "day").format("YYYY-MM-DD"),
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
          break;
        }
        case "expense": {
          const catRaw = getVal(v, "category");
          const curRaw = getVal(v, "currency");
          const validCats = Object.values(ExpenseCategory) as string[];
          const validCurs = Object.values(ExpenseCurrency) as string[];
          const created = await expensesApi.createExpense({
            exDate:
              getVal(v, "exDate", "ex_date") || dayjs().format("YYYY-MM-DD"),
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
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleSaved = () => {
    setMessages(prev => [
      ...prev,
      { role: "ai", text: "✅ 저장됐어요! 다른 일정도 추가해드릴까요?" },
    ]);
    onSaved?.();
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleClose = () => {
    setMessage("");
    setAnalyzeResult(null);
    setAnalyzeModalVisible(false);
    setIsDragging(false);
    pendingFileRef.current = null;
    onClose();
  };

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
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <Text style={styles.headerTitle}>대화로 일정 추가</Text>
              <Text style={styles.subtitle}>
                대화 또는 첨부파일을 AI가 분석해 일정을 등록해요.
              </Text>
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="닫기"
            >
              <CloseIcon width={16} height={16} color={colors.black} />
            </Pressable>
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
                if (msg.role === "result") {
                  return (
                    <AiResultCard
                      key={idx}
                      result={msg.result}
                      planId={planId}
                      onSaved={handleSaved}
                    />
                  );
                }
                if (msg.role === "user-file") {
                  return (
                    <View key={idx} style={styles.userBubbleWrap}>
                      <View style={[styles.userBubble, styles.userFileBubble]}>
                        {String(msg.mimeType ?? "").startsWith("image/") ? (
                          <AttachmentImageIcon width={20} height={20} />
                        ) : (
                          <AttachmentDocIcon width={20} height={20} />
                        )}
                        <View style={styles.userFileContent}>
                          <Text style={styles.userBubbleText} numberOfLines={1}>
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
                        <ActivityIndicator size="small" color={colors.white} />
                        <Text style={styles.aiBubbleText}>
                          첨부파일을 분석하고있어요..
                        </Text>
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
                    <View style={styles.aiBubble}>
                      <ActivityIndicator size="small" color={colors.white} />
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
            <Pressable
              style={({ pressed }) => [
                styles.attachButton,
                loading && styles.attachButtonDisabled,
                pressed && !loading && styles.attachButtonPressed,
              ]}
              onPress={() => {
                if (!loading) fileInputRef.current?.click();
              }}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="파일 첨부"
            >
              <FileIcon width={20} height={20} color={colors.gray600} />
            </Pressable>
            <TextInput
              style={styles.input}
              placeholder="일정을 입력하거나 첨부파일을 추가해주세요..."
              placeholderTextColor={colors.gray600}
              value={message}
              onChangeText={setMessage}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              editable={!loading}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendButton,
                loading && styles.sendButtonDisabled,
                pressed && !loading && styles.sendButtonPressed,
              ]}
              onPress={handleSend}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="전송"
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <SendIcon width={20} height={20} color={colors.white} />
              )}
            </Pressable>
          </View>
        </View>
      </View>

      <AiDocumentAnalyzeModal
        visible={analyzeModalVisible}
        onClose={() => setAnalyzeModalVisible(false)}
        analyzeResult={analyzeResult}
        onApply={handleAnalyzeApply}
        applyLabel="저장"
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    height: 640,
    maxHeight: "90%" as any,
    backgroundColor: colors.white,
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "column",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.22,
    shadowRadius: 60,
    elevation: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 12,
  },
  titleBlock: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 18,
    lineHeight: 26,
    color: colors.black,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.gray600,
  },
  closeButton: {
    width: 26,
    height: 26,
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
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
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
  },
  aiBubbleWrap: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  aiBubble: {
    maxWidth: "85%",
    backgroundColor: colors.primary,
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
    ...textStyles.body4,
    color: colors.white,
  },
  userBubbleWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  userBubble: {
    maxWidth: "85%",
    backgroundColor: colors.gray200,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 4,
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
    borderRadius: 10,
    backgroundColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  attachButtonDisabled: {
    opacity: 0.5,
  },
  attachButtonPressed: {
    opacity: 0.7,
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.black,
    outlineStyle: "none",
  } as any,
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
});
