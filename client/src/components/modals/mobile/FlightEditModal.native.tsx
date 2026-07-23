import AiDocumentAnalyzeModal from "@/components/modals/AiDocumentAnalyzeModal";
import { PLACEHOLDERS } from "@/constants/placeholders";
import { useAttachmentUpload } from "@/hooks/useAttachmentUpload";
import { useFilePicker } from "@/hooks/useFilePicker";
import { useMe } from "@/hooks/useMe";
import { analyzeDocumentUpload } from "@/services/aiDocument";
import { attachmentsApi } from "@/services/attachments";
import { flightsApi } from "@/services/flights";
import type { Attachment, DocumentUploadAnalyzeResponse, FlightRead, LocalFile } from "@/types/api";
import type { AiAttachmentAnalyzeSelection } from "@/ui/components/attachmentSection.types";
import { buildAnalyzeUploadPayload } from "@/utils/attachmentAiAnalyze";
import { applyFlightDraftFromAi } from "@/utils/applyAiDocumentDraft";
import { ExpenseCategory, ExpenseCurrency } from "@/types/expense";
import CalendarModal from "@/ui/components/CalendarModal.native";
import FloatingFooter from "@/ui/components/FloatingFooter.native";
import FullScreenModal from "@/ui/components/FullScreenModal.native";
import { TimeModal } from "@/ui/components/TimeModal.native";
import AttachmentSection from "@/ui/components/attachmentSection.native";
import Input from "@/ui/components/input/Input";
import { colors } from "@/ui/tokens/colors";
import { textStyles, typography } from "@/ui/tokens/typography";
import { getAirportLabelByIata } from "@/utils/airportList";
import { handleGuestPromptError } from "@/utils/guestPrompt";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DeleteIcon from "../../../../assets/delete.svg";
import DownArrowIcon from "../../../../assets/down_arrow.svg";
import CalendarIcon from "../../../../assets/mobile_calendar_black.svg";
import AddIcon from "../../../../assets/mobile_plan_add.svg";
import TimeIcon from "../../../../assets/mobile_time.svg";
import CloseIcon from "../../../../assets/x.svg";
import AirportSearchModal from "./AirportSearchModal.native";

interface FlightEditModalProps {
  visible: boolean;
  onClose?: (opts?: { fromSave?: boolean }) => void;
  flight: FlightRead | null;
  planId: number;
  planStartDate?: string;
  defaultDate?: string;
  embedded?: boolean;
  onSave?: (flight: FlightRead) => void;
  onDelete?: (flightId: number) => void;
}

type SegmentForm = {
  id?: number;
  order?: number;
  airline: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  departure_time: string;
  arrival_date: string;
  arrival_time: string;
  terminal?: string;
  gate?: string;
  seat_number?: string;
};

const formatDate = (dateStr: string) => dayjs(dateStr).format("YYYY.MM.DD");

const formatTimeDisplay = (timeStr: string) => {
  const [hour, minute] = (timeStr || "00:00").split(":");
  const hourNum = Number.parseInt(hour, 10) || 0;
  const period = hourNum < 12 ? "오전" : "오후";
  const displayHour =
    hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
  return `${period} ${displayHour.toString().padStart(2, "0")}:${minute || "00"}`;
};
const _normalizeAmount = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.replace(/[^0-9]/g, "");
};

export default function FlightEditModal({
  visible,
  onClose,
  flight,
  planId,
  planStartDate,
  defaultDate,
  embedded,
  onSave,
  onDelete,
}: FlightEditModalProps) {
  const [formData, setFormData] = useState({
    reservation_number: "",
    passenger_name: "",
    ticket_number: "",
    booking_reference: "",
  });
  const [expenseAmount, setExpenseAmount] = useState("");
  const [flightSegments, setFlightSegments] = useState<SegmentForm[]>([]);
  const [segmentDatePicker, setSegmentDatePicker] = useState<{
    idx: number;
    type: "dep" | "arr";
  } | null>(null);
  const [segmentTimeModal, setSegmentTimeModal] = useState<{
    idx: number;
    field: "departure_time" | "arrival_time";
  } | null>(null);
  const [airportSearchTarget, setAirportSearchTarget] = useState<{
    idx: number;
    type: "dep" | "arr";
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", e => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);
  const [pendingFiles, setPendingFiles] = useState<LocalFile[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>(
    [],
  );
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalyzeError, setAiAnalyzeError] = useState<string | null>(null);
  const [aiModalResult, setAiModalResult] = useState<DocumentUploadAnalyzeResponse | null>(null);
  const [aiAnalyzeFileName, setAiAnalyzeFileName] = useState<string | undefined>();
  const [lastAiSelection, setLastAiSelection] = useState<AiAttachmentAnalyzeSelection | null>(null);
  const aiCancelledRef = useRef(false);

  const { pickImage, pickDocument } = useFilePicker();
  const { data: me } = useMe();
  const { isUploading, uploadFiles } = useAttachmentUpload({
    planId,
    entityType: "flight",
  });

  useEffect(() => {
    if (visible && !flight) {
      const baseDate =
        defaultDate || planStartDate || dayjs().format("YYYY-MM-DD");
      setFlightSegments([
        {
          airline: "",
          flight_number: "",
          departure_airport: "",
          arrival_airport: "",
          departure_date: baseDate,
          departure_time: "09:00",
          arrival_date: baseDate,
          arrival_time: "10:00",
          terminal: "",
          gate: "",
          seat_number: "",
        },
      ]);
      setFormData({
        reservation_number: "",
        passenger_name: "",
        ticket_number: "",
        booking_reference: "",
      });
      setExpenseAmount("");
    } else if (visible && flight) {
      setFormData({
        reservation_number: flight.reservationNumber || "",
        passenger_name: flight.passengerName || "",
        ticket_number: flight.ticketNumber || "",
        booking_reference: flight.bookingReference || "",
      });
      const amountNum = Math.floor(Number(flight.expense?.amount) || 0);
      setExpenseAmount(
        amountNum
          ? String(amountNum).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
          : "",
      );
      const segments = flight.flightSegments || [];
      const sorted = [...segments].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
      const baseDate = planStartDate || dayjs().format("YYYY-MM-DD");
      const segList =
        sorted.length > 0
          ? sorted.map(seg => {
              const dep = seg.departureTime
                ? dayjs(seg.departureTime)
                : dayjs();
              const arr = seg.arrivalTime
                ? dayjs(seg.arrivalTime)
                : dayjs().add(1, "hour");
              return {
                id: seg.id,
                order: (seg as any).order,
                airline: seg.airline || "",
                flight_number: seg.flightNumber || "",
                departure_airport: seg.departureAirport || "",
                arrival_airport: seg.arrivalAirport || "",
                departure_date: dep.format("YYYY-MM-DD"),
                departure_time: dep.format("HH:mm"),
                arrival_date: arr.format("YYYY-MM-DD"),
                arrival_time: arr.format("HH:mm"),
                terminal: seg.terminal || "",
                gate: seg.gate || "",
                seat_number: seg.seatNumber || "",
              };
            })
          : [
              {
                airline: "",
                flight_number: "",
                departure_airport: "",
                arrival_airport: "",
                departure_date: baseDate,
                departure_time: "09:00",
                arrival_date: baseDate,
                arrival_time: "10:00",
                terminal: "",
                gate: "",
                seat_number: "",
              },
            ];
      setFlightSegments(segList);
    }
    if (visible) {
      setPendingFiles([]);
    }
  }, [visible, flight, planStartDate, defaultDate]);

  useEffect(() => {
    if (!visible) return;
    if (!flight) {
      setExistingAttachments([]);
      setIsLoadingAttachments(false);
      return;
    }
    let cancelled = false;
    setExistingAttachments([]);
    setIsLoadingAttachments(true);
    attachmentsApi
      .getAttachments(planId, "flight", flight.id)
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
  }, [visible, flight?.id, planId]);

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
        setAiAnalyzeError(result.error ?? "분석에 실패했습니다.");
      } else {
        setAiModalResult(result);
      }
    } catch {
      setAiAnalyzeError("분석 중 오류가 발생했습니다.");
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleRemoveExistingAttachment = async (attachmentId: number) => {
    try {
      await attachmentsApi.deleteAttachment(attachmentId);
      setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error) {
      if (handleGuestPromptError(error)) return;
      Alert.alert("알림", "첨부파일 삭제에 실패했습니다.");
    }
  };

  const toIso = (date: string, time: string) => {
    if (!date || !time) return "";
    const ts = time.length === 5 ? `${time}:00` : time;
    return new Date(`${date}T${ts}`).toISOString();
  };

  const handleSave = async () => {
    if (isSubmittingRef.current) return;
    const first = flightSegments[0];
    if (
      !first?.departure_airport?.trim() ||
      !first?.arrival_airport?.trim() ||
      !first?.departure_date ||
      !first?.departure_time ||
      !first?.arrival_date ||
      !first?.arrival_time
    ) {
      Alert.alert("알림", "입력되지 않은 필수 값이 있습니다.");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const amount =
        Number.parseInt(expenseAmount.replace(/[^0-9]/g, ""), 10) || 0;
      const segmentPayload = flightSegments.map(s => ({
        ...(s.id && { id: s.id }),
        airline: s.airline?.trim() || null,
        flightNumber: s.flight_number?.trim() || null,
        departureAirport: s.departure_airport.trim(),
        arrivalAirport: s.arrival_airport.trim(),
        departureTime: toIso(s.departure_date, s.departure_time),
        arrivalTime: toIso(s.arrival_date, s.arrival_time),
        terminal: s.terminal?.trim() || null,
        gate: s.gate?.trim() || null,
        seatNumber: s.seat_number?.trim() || null,
      }));

      let savedFlightId: number;
      if (flight) {
        await flightsApi.updateFlight(flight.id, {
          reservationNumber: formData.reservation_number?.trim() || null,
          passengerName: formData.passenger_name?.trim() || null,
          ticketNumber: formData.ticket_number?.trim() || null,
          bookingReference: formData.booking_reference?.trim() || null,
          segments: segmentPayload,
          expense: {
            exDate: first.departure_date,
            amount,
            currency: ExpenseCurrency.KRW,
            category: ExpenseCategory.FLIGHT as any,
            planId,
            description: (() => {
              const dep = flightSegments[0]?.departure_airport?.trim();
              const arr =
                flightSegments[
                  flightSegments.length - 1
                ]?.arrival_airport?.trim();
              return dep && arr ? `${dep} → ${arr}` : null;
            })(),
          },
        });
        const updated = await flightsApi.getFlight(flight.id);
        savedFlightId = updated.id;
        try {
          await onSave?.(updated);
        } catch {
          // Refetch 실패해도 저장은 완료됨
        }
        Alert.alert("수정완료", "항공편이 수정되었습니다.");
      } else {
        const createRes = await flightsApi.createFlight({
          planId,
          reservationNumber: formData.reservation_number?.trim() || null,
          passengerName: formData.passenger_name?.trim() || null,
          ticketNumber: formData.ticket_number?.trim() || null,
          bookingReference: formData.booking_reference?.trim() || null,
          segments: segmentPayload.map(({ id, ...rest }) => rest),
          expense: {
            exDate: first.departure_date,
            amount,
            currency: ExpenseCurrency.KRW,
            category: ExpenseCategory.FLIGHT as any,
            planId,
            description: (() => {
              const dep = flightSegments[0]?.departure_airport?.trim();
              const arr =
                flightSegments[
                  flightSegments.length - 1
                ]?.arrival_airport?.trim();
              return dep && arr ? `${dep} → ${arr}` : null;
            })(),
          },
        });
        const created = await flightsApi.getFlight(createRes.id);
        savedFlightId = created.id;
        try {
          await onSave?.(created);
        } catch {
          // Refetch 실패해도 저장은 완료됨
        }
        Alert.alert("추가완료", "항공편이 추가되었습니다.");
      }

      if (pendingFiles.length > 0) {
        try {
          const uploaded = await uploadFiles(pendingFiles, savedFlightId);
          setExistingAttachments(prev => [...prev, ...uploaded]);
          setPendingFiles([]);
        } catch {
          Alert.alert(
            "알림",
            "항공편은 저장됐으나 일부 파일 업로드에 실패했습니다.",
          );
        }
      }

      onClose?.({ fromSave: true });
    } catch (_error) {
      Alert.alert(
        "알림",
        flight
          ? "항공 편 수정에 실패했습니다."
          : "항공 편 추가에 실패했습니다.",
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!flight) return;
    Alert.alert("항공 편 삭제", "이 항공 편을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await flightsApi.deleteFlight(flight.id);
            if (onDelete) onDelete(flight.id);
            Alert.alert("삭제완료", "항공편이 삭제되었습니다.");
            onClose?.({ fromSave: true });
          } catch (_error) {
            Alert.alert("알림", "항공 편 삭제에 실패했습니다.");
          }
        },
      },
    ]);
  };

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "");
    setExpenseAmount(digits.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
  };

  const addSegment = () => {
    const last = flightSegments[flightSegments.length - 1];
    const baseDate =
      last?.arrival_date || planStartDate || dayjs().format("YYYY-MM-DD");
    const baseTime = last?.arrival_time || "12:00";
    setFlightSegments(prev => [
      ...prev,
      {
        airline: "",
        flight_number: "",
        departure_airport: "",
        arrival_airport: "",
        departure_date: baseDate,
        departure_time: baseTime,
        arrival_date: baseDate,
        arrival_time: "",
        terminal: "",
        gate: "",
        seat_number: "",
      },
    ]);
  };

  const removeSegment = (idx: number) => {
    if (flightSegments.length <= 1) return;
    setFlightSegments(prev => prev.filter((_, i) => i !== idx));
  };

  const updateSegment = (
    idx: number,
    field: keyof SegmentForm,
    value: string,
  ) => {
    setFlightSegments(prev => {
      const next = [...prev];
      (next[idx] as any)[field] = value;
      return next;
    });
  };

  const content = (
    <>
      {!embedded && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {flight ? "항공 수정" : "항공 추가"}
          </Text>
          <Pressable
            style={styles.closeButton}
            onPress={() => onClose?.()}
            hitSlop={8}
          >
            <CloseIcon width={24} height={24} />
          </Pressable>
        </View>
      )}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: keyboardHeight+40 || 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>예약번호 (PNR)</Text>
            <Input
              value={formData.reservation_number}
              onChangeText={t =>
                setFormData({ ...formData, reservation_number: t })
              }
              style={[styles.input, !flight && styles.inputBorderless]}
              placeholder={PLACEHOLDERS.flight.reservationNumber}
              placeholderTextColor={colors.gray600}
            />
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>승객명</Text>
              <Input
                value={formData.passenger_name}
                onChangeText={t =>
                  setFormData({ ...formData, passenger_name: t })
                }
                style={[styles.input, !flight && styles.inputBorderless]}
                placeholder={PLACEHOLDERS.flight.passengerName}
                placeholderTextColor={colors.gray600}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>항공료(원)</Text>
              <Input
                value={expenseAmount}
                onChangeText={handleAmountChange}
                style={[styles.input, !flight && styles.inputBorderless]}
                placeholder="0"
                placeholderTextColor={colors.gray600}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>여행사 예약번호</Text>
              <Input
                value={formData.booking_reference}
                onChangeText={t =>
                  setFormData({ ...formData, booking_reference: t })
                }
                style={[styles.input, !flight && styles.inputBorderless]}
                placeholder={PLACEHOLDERS.flight.bookingReference}
                placeholderTextColor={colors.gray600}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>항공권 번호</Text>
              <Input
                value={formData.ticket_number}
                onChangeText={t =>
                  setFormData({ ...formData, ticket_number: t })
                }
                style={[styles.input, !flight && styles.inputBorderless]}
                placeholder={PLACEHOLDERS.flight.ticketNumber}
                placeholderTextColor={colors.gray600}
              />
            </View>
          </View>
        </View>

        <View style={styles.sectionDivider} />

        <View style={styles.segmentSection}>
          <View style={styles.segmentSectionHeader}>
            <Text style={styles.segmentSectionTitle}>상세 구간 정보</Text>
            <Pressable onPress={addSegment} style={styles.addSegmentBtn}>
              <AddIcon width={16} height={16} />
              <Text style={styles.addSegmentBtnText}>구간 추가</Text>
            </Pressable>
          </View>

          {flightSegments.map((seg, idx) => (
            <View key={idx} style={styles.segmentCard}>
              <View style={styles.segmentCardHeader}>
                <Text style={styles.segmentCardHeaderText}>구간 {idx + 1}</Text>
                {flightSegments.length > 1 && (
                  <Pressable onPress={() => removeSegment(idx)} hitSlop={8}>
                    <DeleteIcon width={16} height={16} color={colors.gray600} />
                  </Pressable>
                )}
              </View>
              <View style={styles.segmentForm}>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Input
                      value={seg.airline}
                      onChangeText={t => updateSegment(idx, "airline", t)}
                      style={[
                        styles.input,
                        { backgroundColor: colors.white },
                        !flight && styles.inputBorderless,
                      ]}
                      placeholder={PLACEHOLDERS.flight.airline}
                      placeholderTextColor={colors.gray600}
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Input
                      value={seg.flight_number}
                      onChangeText={t => updateSegment(idx, "flight_number", t)}
                      style={[
                        styles.input,
                        { backgroundColor: colors.white },
                        !flight && styles.inputBorderless,
                      ]}
                      placeholder={PLACEHOLDERS.flight.flightNumber}
                      placeholderTextColor={colors.gray600}
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Pressable
                      style={[
                        styles.pickerInput,
                        styles.airportPickerTouchable,
                        { backgroundColor: colors.white },
                        !flight && styles.pickerInputBorderless,
                      ]}
                      onPress={() =>
                        setAirportSearchTarget({ idx, type: "dep" })
                      }
                    >
                      <Text
                        style={[
                          seg.departure_airport
                            ? styles.pickerValueText
                            : styles.pickerPlaceholderText,
                          styles.airportTextTruncate,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {seg.departure_airport
                          ? getAirportLabelByIata(seg.departure_airport) ||
                            seg.departure_airport
                          : "출발 공항"}
                      </Text>
                      <DownArrowIcon
                        width={20}
                        height={20}
                        color={colors.gray600}
                      />
                    </Pressable>
                  </View>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Pressable
                      style={[
                        styles.pickerInput,
                        styles.airportPickerTouchable,
                        { backgroundColor: colors.white },
                        !flight && styles.pickerInputBorderless,
                      ]}
                      onPress={() =>
                        setAirportSearchTarget({ idx, type: "arr" })
                      }
                    >
                      <Text
                        style={[
                          seg.arrival_airport
                            ? styles.pickerValueText
                            : styles.pickerPlaceholderText,
                          styles.airportTextTruncate,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {seg.arrival_airport
                          ? getAirportLabelByIata(seg.arrival_airport) ||
                            seg.arrival_airport
                          : "도착 공항"}
                      </Text>
                      <DownArrowIcon
                        width={20}
                        height={20}
                        color={colors.gray600}
                      />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Pressable
                      style={[
                        styles.dateInput,
                        { backgroundColor: colors.white },
                        !flight && styles.dateInputBorderless,
                      ]}
                      onPress={() => setSegmentDatePicker({ idx, type: "dep" })}
                    >
                      <Text style={styles.dateText}>
                        {formatDate(seg.departure_date)}
                      </Text>
                      <CalendarIcon
                        width={20}
                        height={20}
                        color={colors.black}
                      />
                    </Pressable>
                    <CalendarModal
                      visible={
                        segmentDatePicker?.idx === idx &&
                        segmentDatePicker?.type === "dep"
                      }
                      selectedDate={seg.departure_date}
                      onDayPress={day => {
                        setFlightSegments(prev => {
                          const next = [...prev];
                          next[idx].departure_date = day.dateString;
                          if (!next[idx].arrival_date || next[idx].arrival_date < day.dateString) {
                            next[idx].arrival_date = day.dateString;
                          }
                          return next;
                        });
                        setSegmentDatePicker(null);
                      }}
                      onClose={() => setSegmentDatePicker(null)}
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Pressable
                      style={[
                        styles.dateInput,
                        { backgroundColor: colors.white },
                        { backgroundColor: colors.white },
                        !flight && styles.dateInputBorderless,
                      ]}
                      onPress={() => setSegmentDatePicker({ idx, type: "arr" })}
                    >
                      <Text style={styles.dateText}>
                        {formatDate(seg.arrival_date)}
                      </Text>
                      <CalendarIcon
                        width={20}
                        height={20}
                        color={colors.black}
                      />
                    </Pressable>
                    <CalendarModal
                      visible={
                        segmentDatePicker?.idx === idx &&
                        segmentDatePicker?.type === "arr"
                      }
                      selectedDate={seg.arrival_date}
                      onDayPress={day => {
                        updateSegment(idx, "arrival_date", day.dateString);
                        setSegmentDatePicker(null);
                      }}
                      onClose={() => setSegmentDatePicker(null)}
                      minDate={seg.departure_date}
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Pressable
                      style={[
                        styles.dateInput,
                        { backgroundColor: colors.white },
                        !flight && styles.dateInputBorderless,
                      ]}
                      onPress={() =>
                        setSegmentTimeModal({ idx, field: "departure_time" })
                      }
                    >
                      <Text style={styles.dateText}>
                        {formatTimeDisplay(seg.departure_time)}
                      </Text>
                      <TimeIcon width={20} height={20} color={colors.black} />
                    </Pressable>
                  </View>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Pressable
                      style={[
                        styles.dateInput,
                        { backgroundColor: colors.white },
                        !flight && styles.dateInputBorderless,
                      ]}
                      onPress={() =>
                        setSegmentTimeModal({ idx, field: "arrival_time" })
                      }
                    >
                      <Text
                        style={
                          seg.arrival_time
                            ? styles.dateText
                            : styles.pickerPlaceholderText
                        }
                      >
                        {seg.arrival_time
                          ? formatTimeDisplay(seg.arrival_time)
                          : "시간 선택"}
                      </Text>
                      <TimeIcon width={20} height={20} color={colors.black} />
                    </Pressable>
                  </View>
                </View>
                {/* <View style={[styles.row, styles.threeCol]}>
                  <View style={[styles.inputGroup, styles.thirdWidth]}>
                    <Input
                      value={seg.terminal || ''}
                      onChangeText={(t) => updateSegment(idx, 'terminal', t)}
                      style={styles.input}
                      placeholder={PLACEHOLDERS.flight.terminal}
                      placeholderTextColor={colors.gray600}
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.thirdWidth]}>
                    <Input
                      value={seg.gate || ''}
                      onChangeText={(t) => updateSegment(idx, 'gate', t)}
                      style={styles.input}
                      placeholder={PLACEHOLDERS.flight.gate}
                      placeholderTextColor={colors.gray600}
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.thirdWidth]}>
                    <Input
                      value={seg.seat_number || ''}
                      onChangeText={(t) => updateSegment(idx, 'seat_number', t)}
                      style={styles.input}
                      placeholder={PLACEHOLDERS.flight.seatNumber}
                      placeholderTextColor={colors.gray600}
                    />
                  </View>
                </View> */}
              </View>
            </View>
          ))}
        </View>

        {/* 비용 정보 */}
        <View style={styles.expenseSection}>
          <View style={styles.expenseDivider} />
          <Text style={styles.expenseSectionTitle}>비용 정보</Text>
          <View style={[styles.inputGroup, { marginBottom: 20 }]}>
            <Text style={styles.label}>금액</Text>
            <View style={styles.amountInputWrapper}>
              <Input
                value={expenseAmount}
                onChangeText={handleAmountChange}
                placeholder="0"
                placeholderTextColor={colors.gray500}
                keyboardType="number-pad"
                variant="filled"
                containerStyle={styles.amountInputContainer}
                style={styles.amountInputStyle}
                onFocus={() => {
                  setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
                }}
              />
              <Text style={styles.amountSuffix}>KRW</Text>
            </View>
          </View>
        </View>

        <AttachmentSection
          showTopDivider
          style={styles.attachmentSection}
          pendingFiles={pendingFiles}
          existingAttachments={existingAttachments}
          onRemoveExisting={flight ? handleRemoveExistingAttachment : undefined}
          isLoadingExisting={!!flight && isLoadingAttachments}
          isUploading={isUploading}
          disabled={isSubmitting}
          isGuest={!!me?.isGuest}
          onPickImage={async () => {
            try {
              const file = await pickImage();
              if (file) setPendingFiles(prev => [...prev, file]);
            } catch (e: any) {
              Alert.alert("알림", e.message);
            }
          }}
          onPickDocument={async () => {
            try {
              const file = await pickDocument();
              if (file) setPendingFiles(prev => [...prev, file]);
            } catch (e: any) {
              Alert.alert("알림", e.message);
            }
          }}
          onRemoveFile={index =>
            setPendingFiles(prev => prev.filter((_, i) => i !== index))
          }
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
      </ScrollView>

      <TimeModal
        visible={segmentTimeModal !== null}
        onClose={() => setSegmentTimeModal(null)}
        value={
          segmentTimeModal
            ? (() => {
                const raw =
                  flightSegments[segmentTimeModal.idx]?.[
                    segmentTimeModal.field
                  ];
                if (typeof raw === "string" && raw.length >= 4) {
                  return raw.slice(0, 5);
                }
                return "09:00";
              })()
            : "09:00"
        }
        onConfirm={time24 => {
          if (!segmentTimeModal) return;
          updateSegment(segmentTimeModal.idx, segmentTimeModal.field, time24);
        }}
      />

      <AirportSearchModal
        visible={airportSearchTarget !== null}
        onClose={() => setAirportSearchTarget(null)}
        onSelect={code => {
          if (airportSearchTarget) {
            const field =
              airportSearchTarget.type === "dep"
                ? "departure_airport"
                : "arrival_airport";
            updateSegment(airportSearchTarget.idx, field, code);
            setAirportSearchTarget(null);
          }
        }}
        selectedValue={
          airportSearchTarget
            ? airportSearchTarget.type === "dep"
              ? flightSegments[airportSearchTarget.idx]?.departure_airport
              : flightSegments[airportSearchTarget.idx]?.arrival_airport
            : undefined
        }
      />

      <FloatingFooter
        primaryLabel={
          isUploading ? "업로드 중..." : flight ? "수정 완료" : "일정 저장"
        }
        onPrimaryPress={handleSave}
        primaryDisabled={isSubmitting || isUploading}
        secondaryLabel={flight && !embedded ? "삭제" : undefined}
        onSecondaryPress={handleDelete}
      />
      <AiDocumentAnalyzeModal
        visible={!!aiModalResult}
        onClose={() => setAiModalResult(null)}
        entityTypeLabel="항공"
        analyzeResult={aiModalResult}
        analyzeFileName={aiAnalyzeFileName}
        onApply={draft => {
          applyFlightDraftFromAi(
            draft,
            setFormData,
            setFlightSegments as Parameters<typeof applyFlightDraftFromAi>[2],
            ((val: { amount: string } | ((prev: { amount: string }) => { amount: string })) => {
              const amount = typeof val === "function" ? val({ amount: expenseAmount }).amount : val.amount;
              setExpenseAmount(amount);
            }) as Parameters<typeof applyFlightDraftFromAi>[3],
            (() => {}) as Parameters<typeof applyFlightDraftFromAi>[4],
          );
          setAiModalResult(null);
        }}
        applyLabel="항공에 반영하기"
      />
    </>
  );

  if (embedded) {
    return <View style={{ flex: 1 }}>{content}</View>;
  }

  return (
    <FullScreenModal visible={visible} onClose={() => onClose?.()}>
      {content}
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    ...textStyles.h4,
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  closeButton: { padding: 4 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  form: { gap: 20, marginBottom: 24 },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.gray300,
    marginBottom: 24,
  },
  inputGroup: {},
  label: { ...textStyles.h7, marginBottom: 8 },
  input: {
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    backgroundColor: colors.gray200,
  },
  inputBorderless: {
    borderWidth: 0,
    borderColor: "transparent",
  },
  row: { flexDirection: "row", gap: 9 },
  halfWidth: { flex: 1 },
  segmentSection: { marginBottom: 24 },
  segmentSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  segmentSectionTitle: { ...textStyles.h5 },
  addSegmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addSegmentBtnText: { ...textStyles.h6, color: colors.primary },
  segmentCard: {
    backgroundColor: `${colors.primary}1A`,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  segmentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  segmentCardHeaderText: { ...textStyles.h6, color: colors.primary },
  segmentForm: { gap: 16, marginBottom: 8 },
  threeCol: { gap: 8 },
  thirdWidth: { flex: 1 },
  dateInput: {
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingRight: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    backgroundColor: colors.gray200,
  },
  dateInputBorderless: {
    borderWidth: 0,
    borderColor: "transparent",
  },
  dateText: { ...textStyles.body3 },
  pickerInput: {
    height: 48,
    minHeight: 48,
    overflow: "hidden",
    paddingRight: 14,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    backgroundColor: colors.gray200,
  },
  pickerInputBorderless: {
    borderWidth: 0,
    borderColor: "transparent",
  },
  airportPickerTouchable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  pickerValueText: {
    ...textStyles.h6,
    color: colors.black,
  },
  pickerPlaceholderText: {
    ...textStyles.body3,
    color: colors.gray600,
  },
  airportTextTruncate: {
    flex: 1,
    minWidth: 0,
  },
  expenseSection: {
    marginTop: 20,
  },
  expenseDivider: {
    height: 1,
    backgroundColor: colors.gray300,
    marginBottom: 20,
  },
  expenseSectionTitle: {
    ...textStyles.h5,
    marginTop: 12,
    marginBottom: 20,
  },
  amountInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: `${colors.primary}1A`,
  },
  amountInputContainer: {
    flex: 1,
  },
  amountInputStyle: {
    flex: 1,
    height: 48,
    textAlign: "left",
    backgroundColor: "transparent",
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 14,
    paddingHorizontal: 0,
    paddingVertical: 0,
    color: colors.primary,
  },
  amountSuffix: {
    ...textStyles.h6,
    color: colors.primary,
    marginLeft: 4,
  },
  attachmentSection: {
    marginTop: 20,
  },
});
