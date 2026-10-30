import BaseCalendar from "@/components/popup/calendar/BaseCalendar";
import { accommodationsApi } from "@/services/accommodations";
import { analyzePlanUpload } from "@/services/aiDocument";
import { expensesApi } from "@/services/expenses";
import { flightsApi } from "@/services/flights";
import { itinerariesApi } from "@/services/itineraries";
import type { AiDocumentItemDraft, Plan } from "@/types/api";
import { ExpenseCategory, ExpenseCurrency } from "@/types/api";
import { plansApi } from "@/services/plans";
import { useBackdropClose } from "@/hooks/useBackdropClose";
import { useDiscardConfirm } from "@/hooks/useDiscardConfirm";
import HoverPressable from "@/ui/components/HoverPressable";
import MotionPressable, { MotionIcon } from "@/ui/components/MotionPressable";
import Input from "@/ui/components/input/Input";
import { modalMotion } from "@/ui/effects/modalMotion";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { surfaces } from "@/ui/tokens/surfaces";
import { textStyles, typography } from "@/ui/tokens/typography";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { LinearGradient } from "expo-linear-gradient";
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { AirportPicker, CategoryPicker, TimePicker } from "@/ui/components/pickers";
import {
  type ExpenseCategory as ExpenseCategoryType,
  categoryLabels,
} from "@/types/expense";
import {
  ItineraryCategory,
  itineraryCategoryColors,
  itineraryCategoryLabels,
} from "@/types/itinerary";
import Spinner from "@/ui/components/Spinner";
import AiRefreshIcon from "../../../assets/ai_refresh.svg";
import InfoCircleIcon from "../../../assets/info_circle.svg";
import PdfDocIcon from "../../../assets/attachment_document.svg";
import AttachmentImageIcon from "../../../assets/mobile_attachment_image.svg";
import CalendarIcon from "../../../assets/calender.svg";
import DownArrowIcon from "../../../assets/dropdown_time.svg";
import CheckWhiteIcon from "../../../assets/check_white.svg";
import ExpenseCardIcon from "../../../assets/expense_card.svg";
import UpdateIcon from "../../../assets/update.svg";
import UploadIcon from "../../../assets/upload_tray.svg";
import AiAnalyzeErrorBanner from "@/components/AiAnalyzeErrorBanner";
import XIcon from "../../../assets/close_sm.svg";

dayjs.locale("ko");

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
];
const FILE_ACCEPT = ".csv,.xlsx,.xls,image/jpeg,image/png,application/pdf";

type Step = "upload" | "preview" | "empty" | "error";

interface AddScheduleWithFileModalProps {
  visible: boolean;
  onClose: () => void;
  planId: number;
  planName: string;
  plan?: Plan;
  initialFile?: File;
  onSaveComplete: (firstDate?: string) => void;
}

const ITEM_BADGE: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  itinerary: { label: "일정", bg: "#EAF1FF", text: "#1A66E0", dot: "#3D7FE6" },
  flight: { label: "항공", bg: colors.flightBg, text: colors.flightText, dot: colors.flightText },
  accommodation: { label: "숙박", bg: colors.accommodationBg, text: colors.accommodationText, dot: colors.accommodationText },
  expense: { label: "비용", bg: "#FFF4E5", text: "#C85B0B", dot: "#E8841A" },
};

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return "파일 크기는 10MB 이하만 분석 해요.";
  if (!ALLOWED_MIME_TYPES.includes(file.type))
    return "지원하지 않는 파일 형식이에요. (이미지·PDF·Excel)";
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getFileTypeLabel(filename: string): string {
  const ext = filename.split(".").pop()?.toUpperCase() ?? "";
  if (["XLSX", "XLS"].includes(ext)) return "XLS";
  if (ext === "CSV") return "CSV";
  if (ext === "PDF") return "PDF";
  return "IMG";
}

function getFileTypeBadgeColors(label: string): { bg: string; text: string } {
  if (label === "XLS" || label === "CSV") return { bg: "#E7F7EC", text: "#139D57" };
  if (label === "IMG") return { bg: colors.imageTint, text: colors.imageInk };
  return { bg: colors.pdfBg, text: colors.pdfText };
}

function toItineraryCategory(raw: unknown): ItineraryCategory | undefined {
  const key = String(raw ?? "").toUpperCase();
  return (Object.values(ItineraryCategory) as string[]).includes(key)
    ? (key as ItineraryCategory)
    : undefined;
}

function filled(raw: unknown): boolean {
  return String(raw ?? "").trim().length > 0;
}

function getMissingFields(itemType: string, v: Record<string, unknown>): string[] {
  const missing: string[] = [];
  if (itemType === "itinerary") {
    if (!filled(v.title)) missing.push("제목");
    if (!filled(v.itinerary_date ?? v.itineraryDate)) missing.push("날짜");
    if (!filled(v.start_time ?? v.startTime)) missing.push("시작 시간");
  } else if (itemType === "flight") {
    const segs = Array.isArray(v.segments) ? (v.segments as Record<string, unknown>[]) : [];
    const first = segs[0] ?? {};
    const last = segs[segs.length - 1] ?? first;
    if (!filled(first.departure_airport ?? first.departureAirport)) missing.push("출발 공항");
    if (!filled(last.arrival_airport ?? last.arrivalAirport)) missing.push("도착 공항");
    if (!filled(first.dep_date) && !filled(first.departure_time ?? first.departureTime)) missing.push("출발 일시");
    if (!filled(last.arr_date) && !filled(last.arrival_time ?? last.arrivalTime)) missing.push("도착 일시");
  } else if (itemType === "accommodation") {
    if (!filled(v.name)) missing.push("숙소 이름");
    if (!filled(v.checkin_date ?? v.checkinDate)) missing.push("체크인 날짜");
    if (!filled(v.checkout_date ?? v.checkoutDate)) missing.push("체크아웃 날짜");
  } else if (itemType === "expense") {
    if (!(Number(v.amount ?? 0) > 0)) missing.push("금액");
    if (!filled(v.ex_date ?? v.exDate)) missing.push("날짜");
  }
  return missing;
}

function WarnIcon({ size }: { size: number }) {
  return createElement(
    "svg" as any,
    { width: size, height: size, viewBox: "0 0 16 16", fill: "none" },
    createElement("path" as any, { d: "M8 1.6l6.8 11.8H1.2L8 1.6z", stroke: colors.errorInk, strokeWidth: 1.4, strokeLinejoin: "round", fill: colors.errorFill }),
    createElement("path" as any, { d: "M8 6.4v3.2", stroke: colors.errorInk, strokeWidth: 1.6, strokeLinecap: "round" }),
    createElement("circle" as any, { cx: 8, cy: 11.6, r: 0.9, fill: colors.errorInk }),
  );
}

function normalizeHHmm(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return dayjs(s).format("HH:mm");
  if (/^\d{2}:\d{2}/.test(s)) return s.substring(0, 5);
  return s;
}


function getItemTitle(draft: AiDocumentItemDraft): string {
  const v = draft.payload.values as Record<string, unknown>;
  if (draft.itemType === "itinerary") return String(v.title ?? "제목 없음");
  if (draft.itemType === "flight") {
    const segs = v.segments as unknown[] | undefined;
    if (Array.isArray(segs) && segs.length > 0) {
      const first = segs[0] as Record<string, unknown>;
      const last = segs[segs.length - 1] as Record<string, unknown>;
      const dep = String(first.departure_airport ?? first.departureAirport ?? "");
      const arr = String(last.arrival_airport ?? last.arrivalAirport ?? "");
      if (dep && arr) return `${dep} → ${arr}`;
    }
    return "항공편";
  }
  if (draft.itemType === "accommodation") return String(v.name ?? "숙박");
  if (draft.itemType === "expense") {
    const cat = String(v.category ?? "etc");
    const amount = Number(v.amount ?? 0);
    const cur = String(v.currency ?? "KRW");
    return [
      categoryLabels[cat as ExpenseCategoryType] ?? cat,
      amount ? `${amount.toLocaleString()}${cur === "KRW" ? "원" : ` ${cur}`}` : "",
    ].filter(Boolean).join(" · ");
  }
  return "";
}

function getItemDate(draft: AiDocumentItemDraft): string {
  const v = draft.payload.values as Record<string, unknown>;
  let raw = "";
  if (draft.itemType === "itinerary") raw = String(v.itinerary_date ?? v.itineraryDate ?? "");
  else if (draft.itemType === "flight") {
    const segs = v.segments as unknown[] | undefined;
    if (Array.isArray(segs) && segs.length > 0) {
      const first = segs[0] as Record<string, unknown>;
      const last = segs[segs.length - 1] as Record<string, unknown>;
      const depRaw = String(first.dep_date ?? String(first.departure_time ?? first.departureTime ?? "").substring(0, 10));
      const arrRaw = String(last.arr_date ?? String(last.arrival_time ?? last.arrivalTime ?? "").substring(0, 10));
      const depStr = depRaw && dayjs(depRaw).isValid() ? dayjs(depRaw).format("YYYY. MM. DD (ddd)") : depRaw;
      const arrStr = arrRaw && dayjs(arrRaw).isValid() ? dayjs(arrRaw).format("YYYY. MM. DD (ddd)") : arrRaw;
      if (depStr && arrStr && depRaw !== arrRaw) return `${depStr} – ${arrStr}`;
      return depStr || arrStr;
    }
  }
  else if (draft.itemType === "accommodation") {
    const ci = String(v.checkin_date ?? v.checkinDate ?? "").substring(0, 10);
    const co = String(v.checkout_date ?? v.checkoutDate ?? "").substring(0, 10);
    const ciDay = ci ? dayjs(ci) : null;
    const coDay = co ? dayjs(co) : null;
    const ciStr = ciDay?.isValid() ? ciDay.format("YYYY. MM. DD (ddd)") : ci;
    const coStr = coDay?.isValid() ? coDay.format("YYYY. MM. DD (ddd)") : co;
    if (ciStr && coStr) return `${ciStr} – ${coStr}`;
    return ciStr || coStr;
  }
  else if (draft.itemType === "expense") raw = String(v.ex_date ?? v.exDate ?? "");
  if (!raw) return "";
  const d = dayjs(raw.substring(0, 10));
  if (!d.isValid()) return raw;
  return d.format("YYYY. MM. DD (ddd)");
}

function getItemTimeRange(draft: AiDocumentItemDraft): string {
  const v = draft.payload.values as Record<string, unknown>;
  if (draft.itemType === "itinerary") {
    const s = String(v.start_time ?? v.startTime ?? "").substring(0, 5);
    const e = String(v.end_time ?? v.endTime ?? "").substring(0, 5);
    if (s && e) return `${s} – ${e}`;
    if (s) return s;
    if (e) return e;
  }
  if (draft.itemType === "flight") {
    const segs = v.segments as unknown[] | undefined;
    if (Array.isArray(segs) && segs.length > 0) {
      const first = segs[0] as Record<string, unknown>;
      const last = segs[segs.length - 1] as Record<string, unknown>;
      const dep = normalizeHHmm(first.dep_time ?? first.departure_time ?? first.departureTime);
      const arr = normalizeHHmm(last.arr_time ?? last.arrival_time ?? last.arrivalTime);
      if (dep && arr) return `${dep} – ${arr}`;
      if (dep) return dep;
    }
  }
  return "";
}

function getItemLocation(draft: AiDocumentItemDraft): string {
  const v = draft.payload.values as Record<string, unknown>;
  if (draft.itemType === "itinerary") {
    return String(v.location ?? v.city ?? "");
  }
  if (draft.itemType === "accommodation") {
    return String(v.place ?? v.city ?? "");
  }
  return "";
}

function getItemExpense(draft: AiDocumentItemDraft): { category: string; amount: number; currency: string } | null {
  const v = draft.payload.values as Record<string, unknown>;
  let ex: Record<string, unknown> | undefined;
  if (draft.itemType === "expense") {
    ex = v;
  } else {
    ex = v.expense as Record<string, unknown> | undefined;
  }
  if (!ex) return null;
  const amount = Number(ex.amount ?? 0);
  if (amount <= 0) return null;
  const defaultCat =
    draft.itemType === "accommodation" ? "accommodation"
    : draft.itemType === "flight" ? "flight"
    : "etc";
  const cat = String(ex.category ?? defaultCat);
  const currency = String(ex.currency ?? "KRW");
  return { category: cat, amount, currency };
}

function getExpenseSummary(items: AiDocumentItemDraft[], selectedIndexes: Set<number>) {
  let krwTotal = 0;
  let usdTotal = 0;
  let count = 0;
  items.forEach((draft, i) => {
    if (!selectedIndexes.has(i)) return;
    const ex = getItemExpense(draft);
    if (ex) {
      if (ex.currency === "KRW") krwTotal += ex.amount;
      else if (ex.currency === "USD") usdTotal += ex.amount;
      count++;
    }
  });
  return { krwTotal, usdTotal, count };
}

function collectDatesFromDraft(draft: AiDocumentItemDraft): string[] {
  const v = draft.payload.values as Record<string, unknown>;
  const dates: string[] = [];
  if (draft.itemType === "itinerary") {
    const d = String(v.itinerary_date ?? v.itineraryDate ?? "").substring(0, 10);
    if (d) dates.push(d);
  } else if (draft.itemType === "flight") {
    const segs = v.segments as unknown[] | undefined;
    if (Array.isArray(segs)) {
      for (const seg of segs) {
        const s = seg as Record<string, unknown>;
        const dep = String(s.departure_time ?? s.departureTime ?? "").substring(0, 10);
        const arr = String(s.arrival_time ?? s.arrivalTime ?? "").substring(0, 10);
        if (dep) dates.push(dep);
        if (arr) dates.push(arr);
      }
    }
  } else if (draft.itemType === "accommodation") {
    const ci = String(v.checkin_date ?? v.checkinDate ?? "").substring(0, 10);
    const co = String(v.checkout_date ?? v.checkoutDate ?? "").substring(0, 10);
    if (ci) dates.push(ci);
    if (co) dates.push(co);
  } else if (draft.itemType === "expense") {
    const d = String(v.ex_date ?? v.exDate ?? "").substring(0, 10);
    if (d) dates.push(d);
  }
  return dates.filter(d => d && dayjs(d).isValid());
}

function buildItineraryRequest(v: Record<string, unknown>, planId: number, endTime: string) {
  const dateStr = String(v.itinerary_date ?? v.itineraryDate ?? dayjs().format("YYYY-MM-DD"));
  const startRaw = String(v.start_time ?? v.startTime ?? "09:00");
  return {
    planId,
    title: String(v.title ?? "제목 없음"),
    description: v.description ? String(v.description) : undefined,
    country: v.country ? String(v.country) : undefined,
    city: v.city ? String(v.city) : undefined,
    location: v.location ? String(v.location) : undefined,
    category: toItineraryCategory(v.category),
    itineraryDate: dateStr,
    startTime: startRaw.substring(0, 5) || "09:00",
    endTime,
  };
}

function buildFlightRequest(v: Record<string, unknown>, planId: number) {
  const segsRaw = Array.isArray(v.segments) ? v.segments : [];
  const segments = segsRaw.map((s: Record<string, unknown>) => ({
    airline: s.airline ?? null,
    flightNumber: s.flight_number ?? s.flightNumber ?? null,
    departureAirport: String(s.departure_airport ?? s.departureAirport ?? ""),
    arrivalAirport: String(s.arrival_airport ?? s.arrivalAirport ?? ""),
    departureTime: (() => {
      const date = String(s.dep_date ?? "");
      const time = String(s.dep_time ?? "00:00");
      if (date) {
        const t = time.length === 5 ? `${time}:00` : time;
        const d = new Date(`${date}T${t}`);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
      return String(s.departure_time ?? s.departureTime ?? "");
    })(),
    arrivalTime: (() => {
      const date = String(s.arr_date ?? "");
      const time = String(s.arr_time ?? "00:00");
      if (date) {
        const t = time.length === 5 ? `${time}:00` : time;
        const d = new Date(`${date}T${t}`);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
      return String(s.arrival_time ?? s.arrivalTime ?? "");
    })(),
    seatClass: s.seat_class ?? s.seatClass ?? null,
    seatNumber: s.seat_number ?? s.seatNumber ?? null,
    gate: s.gate ?? null,
    terminal: s.terminal ?? null,
  }));
  const ex = v.expense as Record<string, unknown> | undefined;
  return {
    planId,
    reservationNumber: (v.reservation_number ?? v.reservationNumber) ? String(v.reservation_number ?? v.reservationNumber) : null,
    passengerName: (v.passenger_name ?? v.passengerName) ? String(v.passenger_name ?? v.passengerName) : null,
    ticketNumber: (v.ticket_number ?? v.ticketNumber) ? String(v.ticket_number ?? v.ticketNumber) : null,
    bookingReference: (v.booking_reference ?? v.bookingReference) ? String(v.booking_reference ?? v.bookingReference) : null,
    segments,
    expense: ex ? {
      planId,
      exDate: String(ex.ex_date ?? ex.exDate ?? dayjs().format("YYYY-MM-DD")),
      amount: Number(ex.amount ?? 0),
      category: ExpenseCategory.FLIGHT,
      currency: ExpenseCurrency[String(ex.currency ?? "KRW").toUpperCase() as keyof typeof ExpenseCurrency] ?? ExpenseCurrency.KRW,
    } : undefined,
  };
}

function buildAccommodationRequest(v: Record<string, unknown>, planId: number) {
  const ex = v.expense as Record<string, unknown> | undefined;
  const ciDate = String(v.checkin_date ?? v.checkinDate ?? dayjs().format("YYYY-MM-DD"));
  const coDate = String(v.checkout_date ?? v.checkoutDate ?? dayjs().add(1, "day").format("YYYY-MM-DD"));
  const catRaw = String(ex?.category ?? "accommodation").toLowerCase();
  const cat = (Object.values(ExpenseCategory) as string[]).includes(catRaw) ? (catRaw as ExpenseCategory) : ExpenseCategory.ACCOMMODATION;
  const curRaw = String(ex?.currency ?? "KRW").toUpperCase();
  const cur = ExpenseCurrency[curRaw as keyof typeof ExpenseCurrency] ?? ExpenseCurrency.KRW;
  return {
    planId,
    name: String(v.name ?? "숙박"),
    place: v.place ? String(v.place) : undefined,
    country: v.country ? String(v.country) : undefined,
    city: v.city ? String(v.city) : undefined,
    checkinDate: ciDate,
    checkoutDate: coDate,
    checkinTime: String(v.checkin_time ?? v.checkinTime ?? "15:00").substring(0, 5),
    checkoutTime: String(v.checkout_time ?? v.checkoutTime ?? "11:00").substring(0, 5),
    description: v.description ? String(v.description) : undefined,
    expense: {
      planId,
      exDate: String(ex?.ex_date ?? ex?.exDate ?? ciDate),
      amount: Number(ex?.amount ?? 0),
      category: cat,
      currency: cur,
      description: ex?.description ? String(ex.description) : undefined,
    },
  };
}

function buildExpenseRequest(v: Record<string, unknown>, planId: number) {
  const catRaw = String(v.category ?? "etc").toLowerCase();
  const cat = (Object.values(ExpenseCategory) as string[]).includes(catRaw) ? (catRaw as ExpenseCategory) : ExpenseCategory.ETC;
  const curRaw = String(v.currency ?? "KRW").toUpperCase();
  const cur = ExpenseCurrency[curRaw as keyof typeof ExpenseCurrency] ?? ExpenseCurrency.KRW;
  return {
    planId,
    category: cat,
    amount: Number(v.amount ?? 0),
    currency: cur,
    description: v.description ? String(v.description) : undefined,
    exDate: String(v.ex_date ?? v.exDate ?? dayjs().format("YYYY-MM-DD")),
  };
}

export default function AddScheduleWithFileModal({
  visible,
  onClose,
  planId,
  planName,
  plan,
  initialFile,
  onSaveComplete,
}: AddScheduleWithFileModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [step, setStep] = useState<Step>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AiDocumentItemDraft[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftEdits, setDraftEdits] = useState<Record<number, Record<string, unknown>>>({});
  const [showDepDatePicker, setShowDepDatePicker] = useState(false);
  const [showArrDatePicker, setShowArrDatePicker] = useState(false);
  const [showExpenseDatePicker, setShowExpenseDatePicker] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [itinCategoryOpen, setItinCategoryOpen] = useState(false);
  const [autoAnalyzePending, setAutoAnalyzePending] = useState(false);

  function getMergedValues(idx: number, draft: AiDocumentItemDraft): Record<string, unknown> {
    return { ...draft.payload.values as Record<string, unknown>, ...(draftEdits[idx] ?? {}) };
  }

  const itineraryEndTimeMap = useMemo(() => {
    const result = new Map<number, string>();
    const sorted = items
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d.itemType === "itinerary")
      .sort((a, b) => {
        const va = { ...a.d.payload.values as Record<string, unknown>, ...(draftEdits[a.i] ?? {}) };
        const vb = { ...b.d.payload.values as Record<string, unknown>, ...(draftEdits[b.i] ?? {}) };
        const ka = `${va.itinerary_date ?? va.itineraryDate ?? ""}${va.start_time ?? va.startTime ?? ""}`;
        const kb = `${vb.itinerary_date ?? vb.itineraryDate ?? ""}${vb.start_time ?? vb.startTime ?? ""}`;
        return ka < kb ? -1 : ka > kb ? 1 : 0;
      });
    for (let i = 0; i < sorted.length; i++) {
      const { d, i: idx } = sorted[i];
      const v = { ...d.payload.values as Record<string, unknown>, ...(draftEdits[idx] ?? {}) };
      const existingEnd = String(v.end_time ?? v.endTime ?? "").substring(0, 5);
      if (existingEnd) { result.set(idx, existingEnd); continue; }
      const startRaw = String(v.start_time ?? v.startTime ?? "09:00").substring(0, 5);
      const date = String(v.itinerary_date ?? v.itineraryDate ?? "");
      const next = sorted[i + 1];
      if (next) {
        const nv = { ...next.d.payload.values as Record<string, unknown>, ...(draftEdits[next.i] ?? {}) };
        const nextDate = String(nv.itinerary_date ?? nv.itineraryDate ?? "");
        const nextStart = String(nv.start_time ?? nv.startTime ?? "").substring(0, 5);
        if (nextDate === date && nextStart) { result.set(idx, nextStart); continue; }
      }
      result.set(idx, dayjs(`2000-01-01T${startRaw}`).add(1, "hour").format("HH:mm"));
    }
    return result;
  }, [items, draftEdits]);

  const dropZoneRef = useRef<View>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { requestClose, discardConfirmModal } = useDiscardConfirm(
    step === "preview" || !!selectedFile,
    onClose,
  );
  const handleClose = () => {
    if (!isSaving) requestClose();
  };
  const backdrop = useBackdropClose(handleClose);
  const handleFileRef = useRef<(file: File) => void>(() => {});

  const handleFile = useCallback((file: File) => {
    const err = validateFile(file);
    if (err) { setError(err); return; }
    setError(null);
    setSelectedFile(file);
  }, []);

  useEffect(() => { handleFileRef.current = handleFile; }, [handleFile]);

  useEffect(() => {
    if (!visible) {
      setStep("upload");
      setSelectedFile(null);
      setError(null);
      setItems([]);
      setSelectedIndexes(new Set());
      setIsDragging(false);
      setAutoAnalyzePending(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && initialFile) {
      const err = validateFile(initialFile);
      if (err) { setError(err); return; }
      setSelectedFile(initialFile);
      setAutoAnalyzePending(true);
    }
  }, [visible, initialFile]);

  useEffect(() => {
    if (autoAnalyzePending && selectedFile) {
      setAutoAnalyzePending(false);
      handleAnalyze();
    }
  }, [autoAnalyzePending, selectedFile]);

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
    const el = dropZoneRef.current as unknown as HTMLElement | null;
    if (!el) return;
    const onDragEnter = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = (e: DragEvent) => { e.preventDefault(); if (!el.contains(e.relatedTarget as Node)) setIsDragging(false); };
    const onDragOver = (e: DragEvent) => { e.preventDefault(); };
    const onDrop = (e: DragEvent) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer?.files?.[0]; if (file) handleFileRef.current(file); };
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
    key: "plan-file-input",
    ref: (el: HTMLInputElement | null) => { fileInputRef.current = el; },
    type: "file",
    accept: FILE_ACCEPT,
    multiple: false,
    style: { display: "none" },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileRef.current(file);
      e.target.value = "";
    },
  });

  async function handleAnalyze() {
    if (!selectedFile) return;
    setStep("upload");
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await analyzePlanUpload(selectedFile, { filename: selectedFile.name });
      if (res.success && res.items.length > 0) {
        setItems(res.items);
        setSelectedIndexes(new Set(res.items.map((_, i) => i)));
        setStep("preview");
      } else if (!res.success && res.error) {
        setStep("error");
      } else {
        setStep("empty");
      }
    } catch {
      setStep("error");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleSave() {
    if (selectedIndexes.size === 0 || !planId || invalidSelectedCount > 0) return;
    setIsSaving(true);
    setError(null);
    try {
      const selected = items.filter((_, i) => selectedIndexes.has(i));

      await Promise.allSettled(
        selected.flatMap((draft, _, arr) => {
          const idx = items.indexOf(draft);
          const v = getMergedValues(idx, draft);
          if (draft.itemType === "itinerary") {
            const startRaw = String(v.start_time ?? v.startTime ?? "09:00").substring(0, 5);
            const endTime = itineraryEndTimeMap.get(idx) ?? dayjs(`2000-01-01T${startRaw}`).add(1, "hour").format("HH:mm");
            const calls: Promise<unknown>[] = [itinerariesApi.createItinerary(buildItineraryRequest(v, planId, endTime))];
            const ex = v.expense as Record<string, unknown> | undefined;
            if (ex && Number(ex.amount ?? 0) > 0) {
              const catRaw = String(ex.category ?? "etc").toLowerCase();
              const cat = (Object.values(ExpenseCategory) as string[]).includes(catRaw) ? (catRaw as ExpenseCategory) : ExpenseCategory.ETC;
              const curRaw = String(ex.currency ?? "KRW").toUpperCase();
              calls.push(expensesApi.createExpense({
                planId,
                category: cat,
                amount: Number(ex.amount),
                currency: ExpenseCurrency[curRaw as keyof typeof ExpenseCurrency] ?? ExpenseCurrency.KRW,
                exDate: String(ex.ex_date ?? ex.exDate ?? v.itinerary_date ?? dayjs().format("YYYY-MM-DD")),
                description: ex.description ? String(ex.description) : undefined,
              }));
            }
            return calls;
          }
          if (draft.itemType === "flight") return [flightsApi.createFlight(buildFlightRequest(v, planId))];
          if (draft.itemType === "accommodation") return [accommodationsApi.createAccommodation(buildAccommodationRequest(v, planId))];
          if (draft.itemType === "expense") return [expensesApi.createExpense(buildExpenseRequest(v, planId))];
          return [Promise.resolve()];
        }),
      );

      if (plan?.segments && plan.segments.length > 0) {
        const allDates = selected.flatMap((draft) => {
          const idx = items.indexOf(draft);
          return collectDatesFromDraft({ ...draft, payload: { ...draft.payload, values: getMergedValues(idx, draft) as any } });
        });
        if (allDates.length > 0) {
          const minDate = allDates.reduce((a, b) => (a < b ? a : b));
          const maxDate = allDates.reduce((a, b) => (a > b ? a : b));
          const needsUpdate = minDate < plan.startDate || maxDate > plan.endDate;
          if (needsUpdate) {
            const updatedSegments = plan.segments.map((seg, idx) => ({
              country: seg.country,
              city: seg.city,
              startDate: idx === 0 && minDate < seg.startDate ? minDate : seg.startDate,
              endDate: idx === plan.segments!.length - 1 && maxDate > seg.endDate ? maxDate : seg.endDate,
            }));
            await plansApi.updatePlan(planId, { segments: updatedSegments });
          }
        }
      }

      const allDates = selected.flatMap((draft) => {
        const idx = items.indexOf(draft);
        return collectDatesFromDraft({ ...draft, payload: { ...draft.payload, values: getMergedValues(idx, draft) as any } });
      }).filter(Boolean);
      const firstDate = allDates.length > 0 ? allDates.reduce((a, b) => (a < b ? a : b)) : undefined;
      onSaveComplete(firstDate);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  function toggleIndex(i: number) {
    setSelectedIndexes(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIndexes.size === items.length) setSelectedIndexes(new Set());
    else setSelectedIndexes(new Set(items.map((_, i) => i)));
  }

  function setEditField(idx: number, key: string, val: unknown) {
    setDraftEdits(prev => ({ ...prev, [idx]: { ...(prev[idx] ?? {}), [key]: val } }));
  }

  function setEditNestedField(idx: number, parentKey: string, childKey: string, val: unknown) {
    setDraftEdits(prev => {
      const cur = prev[idx] ?? {};
      const parent = (cur[parentKey] ?? {}) as Record<string, unknown>;
      return { ...prev, [idx]: { ...cur, [parentKey]: { ...parent, [childKey]: val } } };
    });
  }

  function setEditSegmentField(idx: number, key: string, val: unknown) {
    setDraftEdits(prev => {
      const cur = prev[idx] ?? {};
      const segs = Array.isArray(cur.segments) ? [...(cur.segments as unknown[])] : [{}];
      const seg = { ...((segs[0] ?? {}) as Record<string, unknown>), [key]: val };
      return { ...prev, [idx]: { ...cur, segments: [seg, ...segs.slice(1)] } };
    });
  }

  function startEdit(idx: number) {
    const item = items[idx];
    const v = item.payload.values as Record<string, unknown>;
    const initialEdit: Record<string, unknown> = { ...v };

    if (item.itemType === "itinerary") {
      const ex = (v.expense ?? {}) as Record<string, unknown>;
      initialEdit.expense = { currency: "KRW", ...ex, category: ex.category ?? "food" };
    } else if (item.itemType === "flight") {
      const ex = (v.expense ?? {}) as Record<string, unknown>;
      initialEdit.expense = { currency: "KRW", ...ex, category: "flight" };
    } else if (item.itemType === "accommodation") {
      const ex = (v.expense ?? {}) as Record<string, unknown>;
      initialEdit.expense = { currency: "KRW", ...ex, category: ex.category ?? "accommodation" };
    } else if (item.itemType === "expense") {
      initialEdit.category = v.category ?? "food";
      initialEdit.currency = v.currency ?? "KRW";
    }

    setDraftEdits(prev => ({ ...prev, [idx]: initialEdit }));
    setEditingIndex(idx);
  }

  function finishEdit(idx: number) {
    const edits = draftEdits[idx] ?? {};
    setItems(prev =>
      prev.map((item, i) =>
        i !== idx ? item : { ...item, payload: { ...item.payload, values: { ...item.payload.values, ...edits } as any } },
      ),
    );
    setEditingIndex(null);
    setItinCategoryOpen(false);
    setShowDepDatePicker(false);
    setShowArrDatePicker(false);
    setShowExpenseDatePicker(false);
    setIsPickerOpen(false);
  }

  function renderEditFormContent(draft: AiDocumentItemDraft, idx: number) {
    const v = (draftEdits[idx] ?? draft.payload.values) as Record<string, unknown>;
    const timerPickerStyle = { height: 40, borderColor: colors.gray300, borderWidth: 1, borderRadius: 8, backgroundColor: colors.white };

    if (draft.itemType === "itinerary") {
      const expNested = ((v.expense ?? {}) as Record<string, unknown>);
      return (
        <View style={styles.editForm}>
          <Input
            variant="filled"
            style={styles.editTitleInput}
            value={String(v.title ?? "")}
            onChangeText={val => setEditField(idx, "title", val)}
            placeholder="제목"
            placeholderTextColor={colors.gray400}
          />
          <View style={[styles.editTimeRow, itinCategoryOpen && styles.editRowRaised]}>
            {(() => {
              const cat = toItineraryCategory(v.category);
              return (
                <View style={styles.editItinCategoryWrap}>
                  <HoverPressable
                    style={styles.editItinCategoryTrigger}
                    hoverStyle={styles.editFieldHover}
                    onPress={() => setItinCategoryOpen(o => !o)}
                  >
                    {cat ? (
                      <View style={[styles.editItinCategoryDot, { backgroundColor: itineraryCategoryColors[cat] }]} />
                    ) : null}
                    <Text style={cat ? styles.editDateText : styles.editDatePlaceholder}>
                      {cat ? itineraryCategoryLabels[cat] : "카테고리"}
                    </Text>
                    <View style={[styles.editItinCategoryArrow, itinCategoryOpen && styles.editItinCategoryArrowOpen]}>
                      <DownArrowIcon width={10} height={10} />
                    </View>
                  </HoverPressable>
                  {itinCategoryOpen && (
                    <View style={styles.editItinCategoryPopup}>
                      {Object.values(ItineraryCategory).map(c => (
                        <HoverPressable
                          key={c}
                          style={[styles.editItinCategoryOption, cat === c && styles.editItinCategoryOptionSelected]}
                          hoverStyle={styles.editItinCategoryOptionHover}
                          onPress={() => { setEditField(idx, "category", c); setItinCategoryOpen(false); }}
                        >
                          <View style={[styles.editItinCategoryDot, { backgroundColor: itineraryCategoryColors[c] }]} />
                          <Text style={styles.editDateText}>{itineraryCategoryLabels[c]}</Text>
                        </HoverPressable>
                      ))}
                    </View>
                  )}
                </View>
              );
            })()}
            <TimePicker
              value={normalizeHHmm(v.start_time)}
              onChange={val => setEditField(idx, "start_time", val)}
              style={timerPickerStyle}
              containerStyle={{ flex: 1 }}
            />
            <Text style={styles.editTimeSep}>–</Text>
            <TimePicker
              value={normalizeHHmm(v.end_time)}
              onChange={val => setEditField(idx, "end_time", val)}
              style={timerPickerStyle}
              containerStyle={{ flex: 1 }}
              popupAlign="right"
            />
          </View>
          <Input
            variant="filled"
            style={styles.editInput}
            value={String(v.location ?? v.city ?? "")}
            onChangeText={val => setEditField(idx, "location", val)}
            placeholder="장소"
            placeholderTextColor={colors.gray400}
          />
          <Input
            variant="filled"
            style={styles.editDescriptionInput}
            value={String(v.description ?? "")}
            onChangeText={val => setEditField(idx, "description", val)}
            placeholder="내용"
            placeholderTextColor={colors.gray400}
            multiline
            numberOfLines={3}
          />
          <View style={[styles.editExpenseRow, isPickerOpen && styles.editRowRaised]}>
            <Text style={styles.editExpenseLabel}>비용</Text>
            <CategoryPicker
              value={String(expNested.category ?? "food") as ExpenseCategoryType}
              onChange={cat => setEditNestedField(idx, "expense", "category", cat)}
              style={styles.editCategoryPickerTrigger}
              onOpen={() => setIsPickerOpen(true)}
              onClose={() => setIsPickerOpen(false)}
            />
            <View style={styles.editCurrencyToggle}>
              <HoverPressable style={styles.editCurrencyOption} hoverStyle={styles.editFieldHover} onPress={() => setEditNestedField(idx, "expense", "currency", "KRW")}>
                <Text style={[styles.editCurrencyOptionText, String(expNested.currency ?? "KRW") === "KRW" && styles.editCurrencyOptionTextActive]}>₩</Text>
              </HoverPressable>
              <View style={styles.editCurrencyDivider} />
              <HoverPressable style={styles.editCurrencyOption} hoverStyle={styles.editFieldHover} onPress={() => setEditNestedField(idx, "expense", "currency", "USD")}>
                <Text style={[styles.editCurrencyOptionText, String(expNested.currency ?? "KRW") === "USD" && styles.editCurrencyOptionTextActive]}>$</Text>
              </HoverPressable>
            </View>
            <View style={styles.editAmountWrapper}>
              <Input
                variant="filled"
                style={styles.editAmountInput}
                value={String(expNested.amount ?? "")}
                onChangeText={val => setEditNestedField(idx, "expense", "amount", val.replace(/[^0-9.]/g, ""))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.gray400}
              />
            </View>
          </View>
          <MotionPressable style={styles.editDoneButton} onPress={e => { e.stopPropagation(); finishEdit(idx); }}>
            <Text style={styles.editDoneButtonText}>완료</Text>
          </MotionPressable>
        </View>
      );
    }

    if (draft.itemType === "flight") {
      const segs = Array.isArray(v.segments) ? (v.segments as Record<string, unknown>[]) : [{}];
      const seg = segs[0] ?? {};
      const expNested = (v.expense ?? {}) as Record<string, unknown>;
      const depDate = String(seg.dep_date ?? String(seg.departure_time ?? "").substring(0, 10));
      const depTime = normalizeHHmm(seg.dep_time ?? seg.departure_time);
      const arrDate = String(seg.arr_date ?? String(seg.arrival_time ?? "").substring(0, 10));
      const arrTime = normalizeHHmm(seg.arr_time ?? seg.arrival_time);
      return (
        <View style={styles.editForm}>
          <View style={[styles.editTimeRow, { zIndex: 1000 }]}>
            <AirportPicker
              value={String(seg.departure_airport ?? "")}
              onChange={val => setEditSegmentField(idx, "departure_airport", val)}
              placeholder="출발 공항"
              containerStyle={{ flex: 1 }}
              onOpen={() => setIsPickerOpen(true)}
              onClose={() => setIsPickerOpen(false)}
            />
            <Text style={styles.editTimeSep}>→</Text>
            <AirportPicker
              value={String(seg.arrival_airport ?? "")}
              onChange={val => setEditSegmentField(idx, "arrival_airport", val)}
              placeholder="도착 공항"
              containerStyle={{ flex: 1 }}
              dropdownAlign="right"
              onOpen={() => setIsPickerOpen(true)}
              onClose={() => setIsPickerOpen(false)}
            />
          </View>
          <Input
            variant="filled"
            style={styles.editTitleInput}
            value={String(v.reservation_number ?? v.reservationNumber ?? "")}
            onChangeText={val => setEditField(idx, "reservation_number", val)}
            placeholder="예약번호 (PNR)"
            placeholderTextColor={colors.gray400}
            autoCorrect={false}
            autoCapitalize="characters"
          />
          <View style={[styles.editTimeRow, { zIndex: showDepDatePicker ? 2000 : 20 }]}>
            <View style={[styles.editFlightCell, { position: "relative" }]}>
              <HoverPressable
                style={styles.editDateTrigger}
                hoverStyle={styles.editFieldHover}
                onPress={() => { setShowDepDatePicker(true); setShowArrDatePicker(false); }}
              >
                <Text style={depDate ? styles.editDateText : styles.editDatePlaceholder}>
                  {depDate ? dayjs(depDate).format("YYYY.MM.DD") : "출발 날짜"}
                </Text>
                <CalendarIcon width={14} height={14} />
              </HoverPressable>
              {showDepDatePicker && (
                <BaseCalendar
                  visible
                  selectedDate={depDate}
                  onDayPress={day => { setEditSegmentField(idx, "dep_date", day.dateString); setShowDepDatePicker(false); }}
                  onClose={() => setShowDepDatePicker(false)}
                  style={styles.editCalendarPopup}
                  hideButtons
                  autoCloseOnSelect
                />
              )}
            </View>
            <View style={styles.editFlightCell}>
              <TimePicker
                value={depTime}
                onChange={val => setEditSegmentField(idx, "dep_time", val)}
                style={timerPickerStyle}
                popupAlign="right"
                onOpen={() => setIsPickerOpen(true)}
                onClose={() => setIsPickerOpen(false)}
              />
            </View>
          </View>
          <View style={[styles.editTimeRow, { zIndex: showArrDatePicker ? 2000 : 10 }]}>
            <View style={[styles.editFlightCell, { position: "relative" }]}>
              <HoverPressable
                style={styles.editDateTrigger}
                hoverStyle={styles.editFieldHover}
                onPress={() => { setShowArrDatePicker(true); setShowDepDatePicker(false); }}
              >
                <Text style={arrDate ? styles.editDateText : styles.editDatePlaceholder}>
                  {arrDate ? dayjs(arrDate).format("YYYY.MM.DD") : "도착 날짜"}
                </Text>
                <CalendarIcon width={14} height={14} />
              </HoverPressable>
              {showArrDatePicker && (
                <BaseCalendar
                  visible
                  selectedDate={arrDate}
                  onDayPress={day => { setEditSegmentField(idx, "arr_date", day.dateString); setShowArrDatePicker(false); }}
                  onClose={() => setShowArrDatePicker(false)}
                  style={styles.editCalendarPopup}
                  hideButtons
                  autoCloseOnSelect
                />
              )}
            </View>
            <View style={styles.editFlightCell}>
              <TimePicker
                value={arrTime}
                onChange={val => setEditSegmentField(idx, "arr_time", val)}
                style={timerPickerStyle}
                popupAlign="right"
                onOpen={() => setIsPickerOpen(true)}
                onClose={() => setIsPickerOpen(false)}
              />
            </View>
          </View>
          <View style={[styles.editExpenseRow, isPickerOpen && styles.editRowRaised]}>
            <Text style={styles.editExpenseLabel}>비용</Text>
            <View style={styles.editCurrencyToggle}>
              <HoverPressable style={styles.editCurrencyOption} hoverStyle={styles.editFieldHover} onPress={() => setEditNestedField(idx, "expense", "currency", "KRW")}>
                <Text style={[styles.editCurrencyOptionText, String(expNested.currency ?? "KRW") === "KRW" && styles.editCurrencyOptionTextActive]}>₩</Text>
              </HoverPressable>
              <View style={styles.editCurrencyDivider} />
              <HoverPressable style={styles.editCurrencyOption} hoverStyle={styles.editFieldHover} onPress={() => setEditNestedField(idx, "expense", "currency", "USD")}>
                <Text style={[styles.editCurrencyOptionText, String(expNested.currency ?? "KRW") === "USD" && styles.editCurrencyOptionTextActive]}>$</Text>
              </HoverPressable>
            </View>
            <View style={styles.editAmountWrapper}>
              <Input
                variant="filled"
                style={styles.editAmountInput}
                value={String(expNested.amount ?? "")}
                onChangeText={val => setEditNestedField(idx, "expense", "amount", val.replace(/[^0-9.]/g, ""))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.gray400}
              />
            </View>
          </View>
          <MotionPressable style={styles.editDoneButton} onPress={e => { e.stopPropagation(); finishEdit(idx); }}>
            <Text style={styles.editDoneButtonText}>완료</Text>
          </MotionPressable>
        </View>
      );
    }

    if (draft.itemType === "accommodation") {
      const expNested = ((v.expense ?? {}) as Record<string, unknown>);
      const ciDate = String(v.checkin_date ?? v.checkinDate ?? "").substring(0, 10);
      const coDate = String(v.checkout_date ?? v.checkoutDate ?? "").substring(0, 10);
      return (
        <View style={styles.editForm}>
          <Input
            variant="filled"
            style={styles.editTitleInput}
            value={String(v.name ?? "")}
            onChangeText={val => setEditField(idx, "name", val)}
            placeholder="숙소명"
            placeholderTextColor={colors.gray400}
          />
          <Input
            variant="filled"
            style={styles.editInput}
            value={String(v.place ?? v.city ?? "")}
            onChangeText={val => setEditField(idx, "place", val)}
            placeholder="장소"
            placeholderTextColor={colors.gray400}
          />
          <View style={[styles.editTimeRow, { zIndex: showDepDatePicker ? 2000 : 20 }]}>
            <View style={[styles.editFlightCell, { position: "relative" }]}>
              <HoverPressable
                style={styles.editDateTrigger}
                hoverStyle={styles.editFieldHover}
                onPress={() => { setShowDepDatePicker(true); setShowArrDatePicker(false); }}
              >
                <Text style={ciDate ? styles.editDateText : styles.editDatePlaceholder}>
                  {ciDate ? dayjs(ciDate).format("YYYY.MM.DD") : "체크인 날짜"}
                </Text>
                <CalendarIcon width={14} height={14} />
              </HoverPressable>
              {showDepDatePicker && (
                <BaseCalendar
                  visible
                  selectedDate={ciDate}
                  onDayPress={day => { setEditField(idx, "checkin_date", day.dateString); setShowDepDatePicker(false); }}
                  onClose={() => setShowDepDatePicker(false)}
                  style={styles.editCalendarPopup}
                  hideButtons
                  autoCloseOnSelect
                />
              )}
            </View>
            <View style={styles.editFlightCell}>
              <TimePicker
                value={normalizeHHmm(v.checkin_time ?? v.start_time)}
                onChange={val => setEditField(idx, "checkin_time", val)}
                style={timerPickerStyle}
                popupAlign="right"
                onOpen={() => setIsPickerOpen(true)}
                onClose={() => setIsPickerOpen(false)}
              />
            </View>
          </View>
          <View style={[styles.editTimeRow, { zIndex: showArrDatePicker ? 2000 : 10 }]}>
            <View style={[styles.editFlightCell, { position: "relative" }]}>
              <HoverPressable
                style={styles.editDateTrigger}
                hoverStyle={styles.editFieldHover}
                onPress={() => { setShowArrDatePicker(true); setShowDepDatePicker(false); }}
              >
                <Text style={coDate ? styles.editDateText : styles.editDatePlaceholder}>
                  {coDate ? dayjs(coDate).format("YYYY.MM.DD") : "체크아웃 날짜"}
                </Text>
                <CalendarIcon width={14} height={14} />
              </HoverPressable>
              {showArrDatePicker && (
                <BaseCalendar
                  visible
                  selectedDate={coDate}
                  onDayPress={day => { setEditField(idx, "checkout_date", day.dateString); setShowArrDatePicker(false); }}
                  onClose={() => setShowArrDatePicker(false)}
                  style={styles.editCalendarPopup}
                  hideButtons
                  autoCloseOnSelect
                />
              )}
            </View>
            <View style={styles.editFlightCell}>
              <TimePicker
                value={normalizeHHmm(v.checkout_time ?? v.end_time)}
                onChange={val => setEditField(idx, "checkout_time", val)}
                style={timerPickerStyle}
                popupAlign="right"
                onOpen={() => setIsPickerOpen(true)}
                onClose={() => setIsPickerOpen(false)}
              />
            </View>
          </View>
          <Input
            variant="filled"
            style={styles.editDescriptionInput}
            value={String(v.description ?? "")}
            onChangeText={val => setEditField(idx, "description", val)}
            placeholder="내용"
            placeholderTextColor={colors.gray400}
            multiline
            numberOfLines={3}
          />
          <View style={[styles.editExpenseRow, isPickerOpen && styles.editRowRaised]}>
            <Text style={styles.editExpenseLabel}>비용</Text>
            <View style={styles.editCurrencyToggle}>
              <HoverPressable style={styles.editCurrencyOption} hoverStyle={styles.editFieldHover} onPress={() => setEditNestedField(idx, "expense", "currency", "KRW")}>
                <Text style={[styles.editCurrencyOptionText, String(expNested.currency ?? "KRW") === "KRW" && styles.editCurrencyOptionTextActive]}>₩</Text>
              </HoverPressable>
              <View style={styles.editCurrencyDivider} />
              <HoverPressable style={styles.editCurrencyOption} hoverStyle={styles.editFieldHover} onPress={() => setEditNestedField(idx, "expense", "currency", "USD")}>
                <Text style={[styles.editCurrencyOptionText, String(expNested.currency ?? "KRW") === "USD" && styles.editCurrencyOptionTextActive]}>$</Text>
              </HoverPressable>
            </View>
            <View style={styles.editAmountWrapper}>
              <Input
                variant="filled"
                style={styles.editAmountInput}
                value={String(expNested.amount ?? "")}
                onChangeText={val => setEditNestedField(idx, "expense", "amount", val.replace(/[^0-9.]/g, ""))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.gray400}
              />
            </View>
          </View>
          <MotionPressable style={styles.editDoneButton} onPress={e => { e.stopPropagation(); finishEdit(idx); }}>
            <Text style={styles.editDoneButtonText}>완료</Text>
          </MotionPressable>
        </View>
      );
    }

    if (draft.itemType === "expense") {
      return (
        <View style={styles.editForm}>
          <View style={[styles.editExpenseRow, isPickerOpen && styles.editRowRaised]}>
            <CategoryPicker
              value={String(v.category ?? "food") as ExpenseCategoryType}
              onChange={cat => setEditField(idx, "category", cat)}
              style={styles.editCategoryPickerTrigger}
              onOpen={() => setIsPickerOpen(true)}
              onClose={() => setIsPickerOpen(false)}
            />
            <View style={styles.editCurrencyToggle}>
              <HoverPressable style={styles.editCurrencyOption} hoverStyle={styles.editFieldHover} onPress={() => setEditField(idx, "currency", "KRW")}>
                <Text style={[styles.editCurrencyOptionText, String(v.currency ?? "KRW") === "KRW" && styles.editCurrencyOptionTextActive]}>₩</Text>
              </HoverPressable>
              <View style={styles.editCurrencyDivider} />
              <HoverPressable style={styles.editCurrencyOption} hoverStyle={styles.editFieldHover} onPress={() => setEditField(idx, "currency", "USD")}>
                <Text style={[styles.editCurrencyOptionText, String(v.currency ?? "KRW") === "USD" && styles.editCurrencyOptionTextActive]}>$</Text>
              </HoverPressable>
            </View>
            <View style={styles.editAmountWrapper}>
              <Input
                variant="filled"
                style={styles.editAmountInput}
                value={String(v.amount ?? "")}
                onChangeText={val => setEditField(idx, "amount", val.replace(/[^0-9.]/g, ""))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.gray400}
              />
            </View>
          </View>
          <View style={{ position: "relative", zIndex: showExpenseDatePicker ? 2000 : 1 }}>
            <HoverPressable
              style={styles.editDateTrigger}
              hoverStyle={styles.editFieldHover}
              onPress={() => setShowExpenseDatePicker(true)}
            >
              <Text style={String(v.ex_date ?? "") ? styles.editDateText : styles.editDatePlaceholder}>
                {String(v.ex_date ?? "") ? dayjs(String(v.ex_date).substring(0, 10)).format("YYYY.MM.DD") : "날짜"}
              </Text>
              <CalendarIcon width={14} height={14} />
            </HoverPressable>
            {showExpenseDatePicker && (
              <BaseCalendar
                visible
                selectedDate={String(v.ex_date ?? "").substring(0, 10)}
                onDayPress={day => { setEditField(idx, "ex_date", day.dateString); setShowExpenseDatePicker(false); }}
                onClose={() => setShowExpenseDatePicker(false)}
                style={styles.editCalendarPopup}
                hideButtons
                autoCloseOnSelect
              />
            )}
          </View>
          <MotionPressable style={styles.editDoneButton} onPress={e => { e.stopPropagation(); finishEdit(idx); }}>
            <Text style={styles.editDoneButtonText}>완료</Text>
          </MotionPressable>
        </View>
      );
    }

    return null;
  }

  const allSelected = items.length > 0 && selectedIndexes.size === items.length;
  const missingByIndex = items.map((d, i) => getMissingFields(d.itemType, getMergedValues(i, d)));
  const invalidSelectedCount = [...selectedIndexes].filter(i => missingByIndex[i]?.length).length;
  const saveDisabled = selectedIndexes.size === 0 || invalidSelectedCount > 0 || isSaving;
  const { krwTotal, usdTotal, count: expenseCount } = getExpenseSummary(items, selectedIndexes);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      {hiddenFileInput}
      <View style={styles.overlay} {...backdrop.overlayProps}>
        <View style={[styles.container, step === "preview" && { minHeight: windowHeight * 0.80 }]} {...backdrop.cardProps}>

          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>파일로 일정 추가</Text>
              <Text style={styles.description}>
                {step === "upload"
                  ? "엑셀·이미지·PDF를 올리면 AI가 일정을 정리해 드려요."
                  : step === "error"
                  ? "파일 분석 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요."
                  : step === "empty"
                  ? "파일에서 일정 정보를 찾지 못했어요."
                  : `'${planName}'에 추가할 일정을 선택하세요.`}
              </Text>
            </View>
            <MotionPressable style={styles.closeButton} onPress={handleClose} accessibilityLabel="닫기">
              <MotionIcon>
                <XIcon width={16} height={16} color={colors.gray700} />
              </MotionIcon>
            </MotionPressable>
          </View>

          {step === "upload" && (
            isAnalyzing ? (
              <View style={styles.analyzingContainer}>
                <Spinner size={42} />
                <View style={styles.analyzingTextGroup}>
                  <Text style={styles.analyzingTitle}>AI가 일정을 분석하고 있어요</Text>
                  <Text style={styles.analyzingSubtitle}>날짜·시간·장소를 정리하는 중...</Text>
                </View>
                {selectedFile && (() => {
                  const label = getFileTypeLabel(selectedFile.name);
                  const { bg, text } = getFileTypeBadgeColors(label);
                  return (
                    <View style={styles.analyzingFileBadge}>
                      <View style={[styles.analyzingFileBadgeCircle, { backgroundColor: bg }]}>
                        <Text style={[styles.analyzingFileBadgeType, { color: text }]}>{label}</Text>
                      </View>
                      <Text style={styles.analyzingFileBadgeName} numberOfLines={1}>{selectedFile.name}</Text>
                    </View>
                  );
                })()}
              </View>
            ) : (
            <>
              <Pressable
                ref={dropZoneRef}
                style={[styles.dropZone, selectedFile && styles.dropZoneSelected, isDragging && styles.dropZoneDragging]}
                onPress={() => fileInputRef.current?.click()}
              >
                <View style={styles.uploadIconCircle}>
                  <UploadIcon width={26} height={26} />
                </View>
                <Text style={styles.dropZoneTitle}>
                  {selectedFile ? "다른 파일로 교체하려면 끌어다 놓거나 클릭" : "파일을 끌어다 놓거나 클릭해서 선택"}
                </Text>
                <Text style={styles.dropZoneHint}>엑셀(xlsx·csv) · 이미지(JPG·PNG) · PDF · 최대 10MB · 1개만 첨부</Text>
              </Pressable>

              {selectedFile && (
                <View style={styles.fileInfoRow}>
                  {(() => {
                    const label = getFileTypeLabel(selectedFile.name);
                    const { bg, text } = getFileTypeBadgeColors(label);
                    return (
                      <View style={[styles.fileTypeIcon, { backgroundColor: bg }]}>
                        {label === "IMG"
                          ? <AttachmentImageIcon width={20} height={20} />
                          : <PdfDocIcon width={20} height={20} color={text} />
                        }
                      </View>
                    );
                  })()}
                  <View style={styles.fileInfoText}>
                    <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
                    <Text style={styles.fileSize}>{formatFileSize(selectedFile.size)}</Text>
                  </View>
                  <MotionPressable
                    style={styles.fileRemoveButton}
                    accessibilityLabel="제거"
                    onPress={() => { setSelectedFile(null); setError(null); }}
                  >
                    <MotionIcon>
                      <XIcon width={16} height={16} color={colors.gray600} />
                    </MotionIcon>
                  </MotionPressable>
                </View>
              )}

              {error && (
                <AiAnalyzeErrorBanner
                  showTitle={false}
                  showRetry={false}
                  message={error}
                  style={{ paddingVertical: 10, marginTop: 0 }}
                />
              )}

              <View style={styles.buttonRow}>
                <MotionPressable style={styles.cancelButton} onPress={handleClose}>
                  <Text style={styles.cancelButtonText}>취소</Text>
                </MotionPressable>
                <MotionPressable
                  style={[styles.aiButton, !selectedFile && styles.aiButtonDisabled]}
                  hoverStyle={shadows.aiGlow}
                  pressedStyle={shadows.aiGlowPress}
                  onPress={handleAnalyze}
                  disabled={!selectedFile || isAnalyzing}
                >
                  <LinearGradient colors={colors.aiGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiButtonGradient}>
                    <MotionIcon>
                      <AiRefreshIcon width={16} height={16} color={colors.white} />
                    </MotionIcon>
                    <Text style={styles.aiButtonText}>AI로 분석</Text>
                  </LinearGradient>
                </MotionPressable>
              </View>
            </>
            )
          )}

          {step === "preview" && (
            <>
              {/* 요약 바 */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  {"분석된 일정 "}
                  <Text style={styles.summaryCount}>{items.length}</Text>
                  {"개"}
                  <Text style={styles.summarySelected}>{"  ·  "}{selectedIndexes.size}개 선택</Text>
                </Text>
                <MotionPressable style={styles.toggleAllButton} hoverStyle={shadows.xsHover} onPress={toggleAll}>
                  <MotionIcon>
                    <View style={[styles.toggleCheckbox, allSelected && styles.toggleCheckboxSelected]}>
                      {allSelected && <CheckWhiteIcon width={12} height={12} />}
                    </View>
                  </MotionIcon>
                  <Text style={styles.toggleAllText}>전체 선택</Text>
                </MotionPressable>
              </View>

              {/* AI 분석 안내 + 비용 합계 배너 */}
              <View style={{ gap: 10 }}>
                <View style={styles.aiNotice}>
                  <View style={{ marginTop: 2 }}>
                    <InfoCircleIcon width={12} height={12} color={colors.gray600} />
                  </View>
                  <Text style={styles.aiNoticeText}>AI 분석 결과라 정확하지 않을 수 있어요. 추가 전에 내용을 확인해 주세요.</Text>
                </View>

                {expenseCount > 0 && (
                <View style={styles.expenseBanner}>
                  <ExpenseCardIcon width={14} height={14} color="#137A41" />
                  <Text style={styles.expenseBannerText}>비용 {expenseCount}건 함께 추가</Text>
                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    {krwTotal > 0 && (
                      <Text style={styles.expenseBannerAmount}>₩{krwTotal.toLocaleString()}</Text>
                    )}
                    {usdTotal > 0 && (
                      <Text style={styles.expenseBannerAmount}>${usdTotal.toLocaleString()}</Text>
                    )}
                  </View>
                </View>
                )}
              </View>

              {/* 아이템 목록 */}
              <ScrollView
                style={styles.itemList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={(showDepDatePicker || showArrDatePicker || showExpenseDatePicker || isPickerOpen) ? { paddingBottom: 120 } : undefined}
              >
                {items.map((draft, i) => {
                  const isSelected = selectedIndexes.has(i);
                  const isEditing = editingIndex === i;
                  const baseBadge = ITEM_BADGE[draft.itemType] ?? ITEM_BADGE.itinerary;
                  const itinCat = draft.itemType === "itinerary" ? toItineraryCategory((draft.payload.values as Record<string, unknown>).category) : undefined;
                  const badge = itinCat ? { ...baseBadge, label: itineraryCategoryLabels[itinCat] } : baseBadge;
                  const title = getItemTitle(draft);
                  const date = getItemDate(draft);
                  const timeRange = (() => {
                    if (draft.itemType === "itinerary") {
                      const v = draft.payload.values as Record<string, unknown>;
                      const s = String(v.start_time ?? v.startTime ?? "").substring(0, 5);
                      const e = itineraryEndTimeMap.get(i) ?? String(v.end_time ?? v.endTime ?? "").substring(0, 5);
                      if (s && e) return `${s} – ${e}`;
                      if (s) return s;
                      if (e) return e;
                      return "";
                    }
                    return getItemTimeRange(draft);
                  })();
                  const location = getItemLocation(draft);
                  const expense = getItemExpense(draft);
                  const missing = missingByIndex[i] ?? [];
                  const missingNotice = missing.length > 0 && !isEditing ? (
                    <View style={styles.missingNotice}>
                      <View style={styles.missingNoticeIcon}>
                        <WarnIcon size={12} />
                      </View>
                      <Text style={styles.missingNoticeText}>
                        <Text style={styles.missingNoticeTitle}>필수 항목 누락</Text>
                        <Text style={styles.missingNoticeDot}>{"  ·  "}</Text>
                        {missing.join(", ")}
                      </Text>
                    </View>
                  ) : null;

                  return (
                    <Pressable
                      key={i}
                      style={[styles.itemCard, isSelected ? styles.itemCardSelected : styles.itemCardUnselected, missing.length > 0 && styles.itemCardInvalid, isEditing && { zIndex: 100 }]}
                      onPress={isEditing ? undefined : () => toggleIndex(i)}
                    >
                      <MotionPressable
                        style={[styles.itemCheckbox, isSelected && styles.itemCheckboxSelected]}
                        hoverStyle={isSelected ? shadows.darkHover : undefined}
                        onPress={e => { e.stopPropagation(); toggleIndex(i); }}
                        accessibilityLabel="포함"
                      >
                        {isSelected && (
                          <MotionIcon>
                            <CheckWhiteIcon width={11} height={11} />
                          </MotionIcon>
                        )}
                      </MotionPressable>

                      {isEditing ? (
                        <View style={styles.itemContent}>
                          {renderEditFormContent(draft, i)}
                        </View>
                      ) : (
                        <>
                          {draft.itemType === "flight" ? (() => {
                            const fv = draft.payload.values as Record<string, unknown>;
                            const segs = Array.isArray(fv.segments) ? fv.segments as Record<string, unknown>[] : [];
                            const first = segs[0] ?? {};
                            const last = segs[segs.length - 1] ?? first;
                            const depCode = String(first.departure_airport ?? first.departureAirport ?? "");
                            const arrCode = String(last.arrival_airport ?? last.arrivalAirport ?? "");
                            const depTimeRaw = String(first.departure_time ?? first.departureTime ?? "");
                            const arrTimeRaw = String(last.arrival_time ?? last.arrivalTime ?? "");
                            const depDay = depTimeRaw ? dayjs(depTimeRaw.substring(0, 10)) : null;
                            const arrDay = arrTimeRaw ? dayjs(arrTimeRaw.substring(0, 10)) : null;
                            const depTime = normalizeHHmm(first.dep_time ?? first.departure_time ?? first.departureTime);
                            const arrTime = normalizeHHmm(last.arr_time ?? last.arrival_time ?? last.arrivalTime);
                            const airline = String(first.airline ?? "");
                            const flightNum = String(first.flight_number ?? first.flightNumber ?? "");
                            const flightLabel = [airline, flightNum].filter(Boolean).join(" ");
                            const reservNum = String(fv.reservation_number ?? fv.reservationNumber ?? fv.booking_reference ?? fv.bookingReference ?? "");
                            const expAmt = expense ? (
                              expense.currency === "KRW" ? `₩${expense.amount.toLocaleString()}`
                              : expense.currency === "USD" ? `$${expense.amount.toLocaleString()}`
                              : `${expense.amount.toLocaleString()} ${expense.currency}`
                            ) : null;
                            return (
                              <View style={styles.itemContent}>
                                {missingNotice}
                                <View style={styles.itemTitleRow}>
                                  <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                                    <View style={[styles.typeDot, { backgroundColor: badge.dot }]} />
                                    <Text style={[styles.typeBadgeText, { color: badge.text }]}>{badge.label}</Text>
                                  </View>
                                  {flightLabel ? <Text style={styles.itemTitle} numberOfLines={1}>{flightLabel}</Text> : null}
                                </View>
                                <View style={styles.flightInfoCard}>
                                  <View style={styles.flightRouteRow}>
                                    <View style={styles.flightRouteCol}>
                                      <Text style={styles.flightAirportCode}>{depCode}</Text>
                                      {depDay?.isValid() ? <Text style={styles.flightRouteDate}>{depDay.format("YYYY. MM. DD (ddd)")}</Text> : null}
                                      {depTime ? <Text style={styles.flightRouteTime}>{depTime}</Text> : null}
                                    </View>
                                    <Text style={styles.flightArrow}>→</Text>
                                    <View style={[styles.flightRouteCol, { alignItems: "flex-end" }]}>
                                      <Text style={styles.flightAirportCode}>{arrCode}</Text>
                                      {arrDay?.isValid() ? <Text style={styles.flightRouteDate}>{arrDay.format("YYYY. MM. DD (ddd)")}</Text> : null}
                                      {arrTime ? <Text style={styles.flightRouteTime}>{arrTime}</Text> : null}
                                    </View>
                                  </View>
                                  <View style={styles.flightReservRow}>
                                    <Text style={styles.flightReservLabel}>예약번호</Text>
                                    <Text style={styles.flightReservValue}>{reservNum || "-"}</Text>
                                  </View>
                                </View>
                                {expAmt ? (
                                  <View style={styles.inlineExpenseBadge}>
                                    <ExpenseCardIcon width={12} height={12} color="#1F9D57" />
                                    <Text style={styles.inlineExpenseCategory}>항공료</Text>
                                    <Text style={styles.inlineExpenseAmount}>{expAmt}</Text>
                                  </View>
                                ) : null}
                              </View>
                            );
                          })() : draft.itemType === "accommodation" ? (() => {
                            const av = draft.payload.values as Record<string, unknown>;
                            const ciDate = String(av.checkin_date ?? av.checkinDate ?? "").substring(0, 10);
                            const coDate = String(av.checkout_date ?? av.checkoutDate ?? "").substring(0, 10);
                            const ciTime = String(av.checkin_time ?? av.checkinTime ?? "");
                            const coTime = String(av.checkout_time ?? av.checkoutTime ?? "");
                            const ciDay = ciDate ? dayjs(ciDate) : null;
                            const coDay = coDate ? dayjs(coDate) : null;
                            const nights = (ciDay?.isValid() && coDay?.isValid()) ? coDay.diff(ciDay, "day") : 0;
                            const hotelName = String(av.name ?? "");
                            const place = String(av.place ?? av.location ?? "");
                            const description = String(av.description ?? "");
                            const ciStr = [ciDay?.isValid() ? ciDay.format("YYYY. MM. DD (ddd)") : ciDate, ciTime].filter(Boolean).join(" · ");
                            const coStr = [coDay?.isValid() ? coDay.format("YYYY. MM. DD (ddd)") : coDate, coTime].filter(Boolean).join(" · ");
                            const expAmt = expense ? (
                              expense.currency === "KRW" ? `₩${expense.amount.toLocaleString()}`
                              : expense.currency === "USD" ? `$${expense.amount.toLocaleString()}`
                              : `${expense.amount.toLocaleString()} ${expense.currency}`
                            ) : null;
                            return (
                              <View style={styles.itemContent}>
                                {missingNotice}
                                <View style={styles.itemTitleRow}>
                                  <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                                    <View style={[styles.typeDot, { backgroundColor: badge.dot }]} />
                                    <Text style={[styles.typeBadgeText, { color: badge.text }]}>{badge.label}</Text>
                                  </View>
                                  {hotelName ? <Text style={styles.itemTitle} numberOfLines={1}>{hotelName}</Text> : null}
                                </View>
                                <View style={styles.accomInfoCard}>
                                  <View style={styles.accomInfoRow}>
                                    <Text style={styles.accomInfoLabel}>체크인</Text>
                                    <Text style={styles.accomInfoValue}>{ciStr || "-"}</Text>
                                  </View>
                                  <View style={styles.accomInfoRow}>
                                    <Text style={styles.accomInfoLabel}>체크아웃</Text>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                                      <Text style={[styles.accomInfoValue, { flex: 0, flexShrink: 1 }]} numberOfLines={1}>{coStr || "-"}</Text>
                                      {nights > 0 && (
                                        <View style={styles.accomNightBadge}>
                                          <Text style={styles.accomNightBadgeText}>{nights}박</Text>
                                        </View>
                                      )}
                                    </View>
                                  </View>
                                  {place ? (
                                    <View style={styles.accomInfoRow}>
                                      <Text style={styles.accomInfoLabel}>장소</Text>
                                      <Text style={styles.accomInfoValue} numberOfLines={1}>{place}</Text>
                                    </View>
                                  ) : null}
                                  {description ? (
                                    <Text style={styles.accomDescription} numberOfLines={2}>{description}</Text>
                                  ) : null}
                                </View>
                                {expAmt ? (
                                  <View style={styles.inlineExpenseBadge}>
                                    <ExpenseCardIcon width={12} height={12} color="#1F9D57" />
                                    <Text style={styles.inlineExpenseCategory}>숙박료</Text>
                                    <Text style={styles.inlineExpenseAmount}>{expAmt}</Text>
                                  </View>
                                ) : null}
                              </View>
                            );
                          })() : (
                          <View style={styles.itemContent}>
                            {missingNotice}
                            <View style={styles.itemTitleRow}>
                              <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                                <View style={[styles.typeDot, { backgroundColor: badge.dot }]} />
                                <Text style={[styles.typeBadgeText, { color: badge.text }]}>{badge.label}</Text>
                              </View>
                              <Text style={styles.itemTitle} numberOfLines={1}>{title}</Text>
                            </View>

                            {(date || timeRange || location) ? (
                              <View style={styles.itemMetaRow}>
                                {date ? <Text style={styles.itemDate}>{date}</Text> : null}
                                {date && timeRange ? <Text style={styles.itemDot}> · </Text> : null}
                                {timeRange ? <Text style={styles.itemTime}>{timeRange}</Text> : null}
                                {(date || timeRange) && location ? <Text style={styles.itemDot}> · </Text> : null}
                                {location ? (
                                  <Text style={styles.itemLocation} numberOfLines={1}>{location}</Text>
                                ) : null}
                              </View>
                            ) : null}

                            {draft.itemType === "itinerary" && String((draft.payload.values as Record<string, unknown>).description ?? "") ? (
                              <Text style={styles.accomDescription} numberOfLines={2}>
                                {String((draft.payload.values as Record<string, unknown>).description)}
                              </Text>
                            ) : null}

                            {expense ? (
                              <View style={styles.inlineExpenseBadge}>
                                <ExpenseCardIcon width={12} height={12} color="#1F9D57" />
                                <Text style={styles.inlineExpenseCategory}>
                                  {categoryLabels[expense.category as ExpenseCategoryType] ?? expense.category}
                                </Text>
                                <Text style={styles.inlineExpenseAmount}>
                                  {expense.currency === "KRW"
                                    ? `₩${expense.amount.toLocaleString()}`
                                    : expense.currency === "USD"
                                    ? `$${expense.amount.toLocaleString()}`
                                    : `${expense.amount.toLocaleString()} ${expense.currency}`}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          )}

                          <MotionPressable
                            style={styles.editButton}
                            onPress={e => { e.stopPropagation(); startEdit(i); }}
                            accessibilityLabel="수정"
                          >
                            <MotionIcon>
                              <UpdateIcon width={16} height={16} color={colors.gray700} />
                            </MotionIcon>
                          </MotionPressable>
                        </>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {error && <Text style={styles.errorText}>{error}</Text>}

              {invalidSelectedCount > 0 && (
                <View style={styles.missingAlert} accessibilityRole="alert">
                  <View style={styles.missingAlertIcon}>
                    <WarnIcon size={16} />
                  </View>
                  <Text style={styles.missingAlertText}>
                    {"필수 항목이 누락된 일정 "}
                    <Text style={styles.missingAlertCount}>{invalidSelectedCount}</Text>
                    {"개는 추가할 수 없어요. 항목을 수정하거나 선택을 해제해 주세요."}
                  </Text>
                </View>
              )}

              <View style={styles.buttonRow}>
                <MotionPressable style={styles.cancelButton} onPress={() => { setStep("upload"); setError(null); }}>
                  <Text style={styles.cancelButtonText}>다시 올리기</Text>
                </MotionPressable>
                <MotionPressable
                  style={[styles.saveButton, saveDisabled && !isSaving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saveDisabled}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : null}
                  <Text style={[styles.saveButtonText, saveDisabled && !isSaving && styles.saveButtonTextDisabled]}>
                    {isSaving ? "저장 중..." : `선택한 ${selectedIndexes.size}개 일정 추가`}
                  </Text>
                </MotionPressable>
              </View>
            </>
          )}

          {step === "error" && (
            <>
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, styles.errorIconCircle]}>
                  <WarnIcon size={26} />
                </View>
                <Text style={styles.emptyTitle}>파일 분석에 실패했어요</Text>
                <Text style={styles.emptySubtitle}>{"일시적인 문제로 AI 분석을 마치지 못했어요.\n잠시 후 다시 시도하거나, 파일을 교체해 올려주세요."}</Text>
              </View>
              <View style={styles.buttonRow}>
                <MotionPressable style={styles.cancelButton} onPress={() => { setStep("upload"); setError(null); }}>
                  <Text style={styles.cancelButtonText}>다시 올리기</Text>
                </MotionPressable>
                <MotionPressable style={styles.retryButton} onPress={handleAnalyze}>
                  <Text style={styles.saveButtonText}>다시 시도</Text>
                </MotionPressable>
              </View>
            </>
          )}

          {step === "empty" && (
            <>
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  {createElement("svg" as any, { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none" },
                    createElement("rect" as any, { x: 4, y: 3.5, width: 16, height: 17, rx: 2.5, stroke: "#C4C4C4", strokeWidth: 1.6 }),
                    createElement("path" as any, { d: "M8 8.5h8M8 12h8M8 15.5h4", stroke: "#D4D4D4", strokeWidth: 1.6, strokeLinecap: "round" }),
                    createElement("circle" as any, { cx: 17, cy: 17, r: 4.5, fill: "#fff", stroke: "#9B9B9B", strokeWidth: 1.5 }),
                    createElement("path" as any, { d: "M15.4 17h3.2", stroke: "#9B9B9B", strokeWidth: 1.5, strokeLinecap: "round" }),
                  )}
                </View>
                <Text style={styles.emptyTitle}>분석된 일정이 없어요</Text>
                <Text style={styles.emptySubtitle}>{"파일에서 날짜·시간·장소를 읽어내지 못했어요.\n일정표나 예약 내역처럼 정보가 또렷한 파일로 다시 올려보세요."}</Text>
              </View>
              <View style={styles.buttonRow}>
                <MotionPressable
                  style={styles.retryButton}
                  onPress={() => { setStep("upload"); setError(null); }}
                >
                  <Text style={styles.saveButtonText}>다시 올리기</Text>
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
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lgPlus,
  },
  container: {
    ...modalMotion.card,
    width: "100%",
    maxWidth: 480 + spacing.xl * 2,
    maxHeight: "80%",
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadows.sheet,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: spacing.sm },
  title: { ...textStyles.h5, color: colors.gray900 },
  description: { ...textStyles.body5, color: colors.gray700 },
  closeButton: { width: 28, height: 28, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: spacing.xs },

  // Upload step
  dropZone: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.gray400,
    borderRadius: radii.lgPlus,
    backgroundColor: colors.gray100,
    alignItems: "center",
    paddingVertical: spacing["2xl"],
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  dropZoneSelected: { borderColor: colors.gray900 },
  dropZoneDragging: { borderColor: colors.primary, backgroundColor: colors.gray200 },
  uploadIconCircle: { width: 52, height: 52, borderRadius: radii.pill, backgroundColor: colors.gray300, alignItems: "center", justifyContent: "center" },
  dropZoneTitle: { ...textStyles.h6, color: colors.gray900 },
  dropZoneHint: { ...textStyles.body5, color: colors.gray600 },
  fileInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  fileTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fileInfoText: { flex: 1, minWidth: 0 },
  fileName: { ...textStyles.h7, color: colors.gray900 },
  fileSize: { ...textStyles.body6, fontVariant: ["tabular-nums"], color: colors.gray600, marginTop: spacing.xs },
  fileRemoveButton: { width: 24, height: 24, alignItems: "center", justifyContent: "center", flexShrink: 0 },

  errorText: { ...textStyles.body5, color: "#E53E3E" },
  // Empty state
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingTop: spacing["2xl"] + spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["2xl"],
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  errorIconCircle: { backgroundColor: colors.warningTint },
  emptyTitle: { ...textStyles.h5, color: colors.gray900 },
  emptySubtitle: { ...textStyles.body4, color: colors.gray600, textAlign: "center" },

  // 분석 중 UI
  analyzingContainer: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 20, paddingVertical: 40,
  },
  analyzingTextGroup: { alignItems: "center", gap: 6 },
  analyzingTitle: { ...textStyles.h5, color: colors.gray900 },
  analyzingSubtitle: { ...textStyles.body5, color: colors.gray500 },
  analyzingFileBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.gray100, borderRadius: radii.pill,
    paddingVertical: 4, paddingHorizontal: 6,
  },
  analyzingFileBadgeCircle: {
    width: 20, height: 20, borderRadius: 4,
    alignItems: "center", justifyContent: "center",
  },
  analyzingFileBadgeType: { fontFamily: typography.fontFamily.poppinsSemiBold, fontSize: 8 },
  analyzingFileBadgeName: { fontFamily: typography.fontFamily.pretendardRegular, fontSize: 11, color: colors.gray600, maxWidth: 160 },

  // Preview step — summary
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryText: { ...textStyles.body4, color: colors.gray700 },
  summaryCount: { fontFamily: typography.fontFamily.poppinsSemiBold, fontSize: 14, lineHeight: 20, color: colors.gray900 },
  summarySelected: { ...textStyles.body5, color: colors.gray500 },
  toggleAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 32,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
  },
  toggleCheckbox: {
    width: 16,
    height: 16,
    borderRadius: radii.xs,
    borderWidth: 1.5,
    borderColor: colors.gray400,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleCheckboxSelected: { backgroundColor: colors.gray900, borderColor: colors.gray900 },
  toggleAllText: { ...textStyles.h8, color: colors.gray900 },

  aiNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    paddingHorizontal: 2,
  },
  aiNoticeText: {
    ...textStyles.body6,
    color: colors.gray600,
    flex: 1,
  },

  // Expense banner
  expenseBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgb(241, 250, 244)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  expenseBannerText: { ...textStyles.h9, color: "#137A41", flex: 1 },
  expenseBannerAmount: { fontFamily: typography.fontFamily.poppinsSemiBold, fontSize: 14, lineHeight: 20, color: "#137A41" },

  // Item list
  itemList: { maxHeight: "80%" } as any,

  itemCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 12,
    padding: 13,
    paddingHorizontal: 14,
    borderWidth: 1,
    marginBottom: 8,
    backgroundColor: colors.white,
  },
  itemCardSelected: { borderColor: colors.gray900 },
  itemCardUnselected: { borderColor: colors.gray300, opacity: 0.65 },
  itemCardInvalid: { borderColor: colors.errorInk, backgroundColor: colors.errorTint, ...shadows.errorCardRing },
  missingNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.errorSoft,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  missingNoticeIcon: { marginTop: 3 },
  missingNoticeText: { ...textStyles.body5, color: colors.errorText, flex: 1 },
  missingNoticeTitle: { ...textStyles.h8, color: colors.errorInk },
  missingNoticeDot: { color: colors.errorDivider },
  missingAlert: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.errorSoft,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  missingAlertIcon: { marginTop: 2 },
  missingAlertText: { ...textStyles.body4, color: colors.errorText, flex: 1 },
  missingAlertCount: { ...textStyles.h7, color: colors.errorText },

  itemCheckbox: {
    width: 20,
    height: 20,
    borderRadius: radii.xs,
    borderWidth: 1.5,
    borderColor: colors.gray400,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
    flexShrink: 0,
  },
  itemCheckboxSelected: { ...surfaces.dark, borderColor: colors.gray900 },

  itemContent: { flex: 1, minWidth: 0, gap: 0 },

  itemTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 22,
    paddingHorizontal: 9,
    borderRadius: radii.pill,
    flexShrink: 0,
  },
  typeDot: { width: 5, height: 5, borderRadius: radii.pill },
  typeBadgeText: { ...textStyles.h9 },
  itemTitle: { ...textStyles.h6, color: colors.gray900, flex: 1 },

  itemMetaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginTop: 6, gap: 4 },
  itemDate: { ...textStyles.body5, color: colors.gray700 },
  itemDot: { ...textStyles.body5, color: colors.gray500 },
  itemTime: { fontFamily: typography.fontFamily.poppinsSemiBold, fontSize: 12, lineHeight: 18, color: colors.gray900 },
  itemLocation: { ...textStyles.body5, color: colors.gray500, maxWidth: 160 },

  accomInfoCard: {
    marginTop: 8,
    backgroundColor: "rgb(251, 248, 241)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  accomInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  accomInfoLabel: {
    width: 50,
    flexShrink: 0,
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 11,
    lineHeight: 16,
    color: colors.gray500,
  },
  accomInfoValue: {
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.black,
    flex: 1,
    minWidth: 0,
  },
  accomNightBadge: {
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 5,
    backgroundColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  accomNightBadgeText: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 10,
    lineHeight: 14,
    color: colors.gray600,
  },
  accomDescription: {
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.gray600,
    marginTop: 2,
  },
  flightInfoCard: {
    marginTop: 8,
    backgroundColor: "rgb(247, 248, 253)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  flightRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  flightRouteCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  flightAirportCode: {
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.black,
    letterSpacing: 0.5,
  },
  flightArrow: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 16,
    lineHeight: 16,
    color: "#7A66E0",
    flexShrink: 0,
  },
  flightRouteDate: {
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 11,
    lineHeight: 15,
    color: colors.gray500,
  },
  flightRouteTime: {
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.black,
  },
  flightReservRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    minWidth: 0,
  },
  flightReservLabel: {
    width: 50,
    flexShrink: 0,
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 11,
    lineHeight: 16,
    color: colors.gray500,
  },
  flightReservValue: {
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.black,
    flex: 1,
    minWidth: 0,
  },
  inlineExpenseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: "rgb(231, 247, 236)",
    alignSelf: "flex-start",
  },
  inlineExpenseCategory: { ...textStyles.h9, color: "#1F9D57" },
  inlineExpenseAmount: { fontFamily: typography.fontFamily.poppinsSemiBold, fontSize: 11, lineHeight: 16, color: "#137A41" },

  editButton: { width: 28, height: 28, borderRadius: radii.md, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  editForm: { flex: 1, gap: 8 },
  editTitleInput: {
    height: 40, borderWidth: 1, borderColor: colors.gray300, borderRadius: radii.base,
    paddingHorizontal: 10, paddingVertical: 0, backgroundColor: colors.white,
    ...textStyles.h7, color: colors.gray900,
  },
  editInput: {
    height: 40, borderWidth: 1, borderColor: colors.gray300, borderRadius: radii.base,
    paddingHorizontal: 10, paddingVertical: 0, backgroundColor: colors.white,
    ...textStyles.body5, color: colors.gray900,
  },
  editDescriptionInput: {
    height: 60, borderWidth: 1, borderColor: colors.gray300, borderRadius: radii.base,
    paddingHorizontal: 10, paddingVertical: spacing.sm, backgroundColor: colors.white,
    ...textStyles.body5, color: colors.gray900, textAlignVertical: "top",
  },
  editTimeRow: { flexDirection: "row", alignItems: "center", gap: 6, zIndex: 10 },
  editFlightInput: { flex: 1, height: 40, minWidth: 0 },
  editFlightCell: { flex: 1, minWidth: 0 },
  editTimeSep: { ...textStyles.body5, color: colors.gray500 },
  editDateTrigger: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    height: 40, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.gray300,
    borderRadius: 8, backgroundColor: colors.white,
  },
  editDateText: { ...textStyles.body4, color: colors.gray900 },
  editDatePlaceholder: { ...textStyles.body4, color: colors.gray400 },
  editCalendarPopup: { position: "absolute", top: 44, left: 0, zIndex: 30000 },
  editItinCategoryWrap: { position: "relative", flexShrink: 0 },
  editItinCategoryTrigger: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs + 2,
    height: 40, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.gray300,
    borderRadius: radii.base, backgroundColor: colors.white, minWidth: 96,
  },
  editItinCategoryDot: { width: 8, height: 8, borderRadius: radii.pill },
  editItinCategoryArrow: { marginLeft: "auto", opacity: 0.6 },
  editItinCategoryArrowOpen: { transform: [{ rotate: "180deg" }] },
  editItinCategoryPopup: {
    position: "absolute", top: 44, left: 0, minWidth: 140,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray300,
    borderRadius: radii.md, padding: spacing.xs, gap: 2, ...shadows.lg,
  },
  editItinCategoryOption: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: 10, paddingVertical: spacing.sm, borderRadius: radii.base,
  },
  editItinCategoryOptionSelected: { backgroundColor: colors.gray200 },
  editItinCategoryOptionHover: { backgroundColor: colors.gray100 },
  editExpenseRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  editRowRaised: { zIndex: 3000 },
  editCategoryPickerTrigger: { minWidth:100, minHeight: 40, borderWidth: 1, borderColor: colors.gray300, backgroundColor: colors.white },
  editExpenseLabel: {
    width: 30, fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 12, lineHeight: 18, color: colors.gray600, flexShrink: 0,
  },
  editAmountWrapper: {
    flex: 1,
  },
  editAmountWrapperDisabled: { opacity: 0.45 },
  editCurrencyToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    overflow: "hidden",
    flexShrink: 0,
    height: 40,
  },
  editCurrencyOption: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  editCurrencyDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: colors.gray300,
  },
  editCurrencyOptionText: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 12,
    color: colors.gray400,
  },
  editCurrencyOptionTextActive: {
    color: colors.gray900,
  },
  editAmountInput: {
    height: 40, borderWidth: 1, borderColor: colors.gray300, borderRadius: radii.base,
    paddingHorizontal: spacing.sm, paddingVertical: 0, backgroundColor: colors.white,
    fontFamily: typography.fontFamily.poppinsSemiBold,
    fontSize: 12, color: colors.gray900, textAlign: "right",
  },
  editFieldHover: {
    backgroundColor: colors.inputHover,
  },
  editDoneButton: {
    alignSelf: "flex-end", height: 30, paddingHorizontal: 14,
    borderRadius: radii.base, ...surfaces.primary,
    alignItems: "center", justifyContent: "center",
  },
  editDoneButtonText: {
    fontFamily: typography.fontFamily.pretendardSemiBold, fontSize: 12, color: colors.white,
  },

  // Buttons
  buttonRow: { flexDirection: "row", gap: spacing.md, paddingTop: spacing.xs },
  cancelButton: {
    height: 48,
    borderRadius: radii.md,
    ...surfaces.muted,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  cancelButtonText: { ...textStyles.h6, color: colors.gray900 },
  aiButton: { flex: 1, height: 48, borderRadius: radii.md, overflow: "hidden" },
  aiButtonDisabled: { opacity: 0.45 },
  aiButtonGradient: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: 22 },
  aiButtonText: { ...textStyles.h6, color: colors.white },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: radii.md,
    ...surfaces.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  saveButtonDisabled: { ...surfaces.muted, backgroundImage: "none" } as any,
  saveButtonTextDisabled: { color: colors.gray500 },
  saveButtonText: { ...textStyles.h6, color: colors.white },
  retryButton: {
    flex: 1,
    height: 48,
    borderRadius: radii.md,
    ...surfaces.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
