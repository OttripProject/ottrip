import BaseCalendar from "@/components/popup/calendar/BaseCalendar";
import { accommodationsApi } from "@/services/accommodations";
import { analyzePlanUpload } from "@/services/aiDocument";
import { expensesApi } from "@/services/expenses";
import { flightsApi } from "@/services/flights";
import { itinerariesApi } from "@/services/itineraries";
import type { AiDocumentItemDraft } from "@/types/api";
import { ExpenseCategory, ExpenseCurrency } from "@/types/api";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
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
  TextInput,
  View,
} from "react-native";
import { AirportPicker, CategoryPicker, TimePicker } from "@/ui/components/pickers";
import type { ExpenseCategory as ExpenseCategoryType } from "@/types/expense";
import AiRefreshIcon from "../../../assets/ai_refresh.svg";
import CalendarIcon from "../../../assets/calender.svg";
import CheckWhiteIcon from "../../../assets/check_white.svg";
import ExpenseCardIcon from "../../../assets/expense_card.svg";
import UpdateIcon from "../../../assets/update.svg";
import UploadIcon from "../../../assets/upload_tray.svg";
import XIcon from "../../../assets/x.svg";

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

type Step = "upload" | "preview";

interface AddScheduleWithFileModalProps {
  visible: boolean;
  onClose: () => void;
  planId: number;
  planName: string;
  onSaveComplete: () => void;
}

const ITEM_BADGE: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  itinerary: { label: "일정", bg: "#EAF1FF", text: "#1A66E0", dot: "#3D7FE6" },
  flight: { label: "항공", bg: "#F3EEFF", text: "#7B2FBE", dot: "#9B5DE5" },
  accommodation: { label: "숙박", bg: "#E6F9EE", text: "#1A7F50", dot: "#2DB056" },
  expense: { label: "비용", bg: "#FFF4E5", text: "#C85B0B", dot: "#E8841A" },
};

const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  food: "식비",
  transport: "교통",
  flight: "항공",
  activity: "관광",
  accommodation: "숙박",
  shopping: "쇼핑",
  etc: "기타",
};

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return "파일 크기는 10MB 이하여야 해요.";
  if (!ALLOWED_MIME_TYPES.includes(file.type))
    return "지원하지 않는 파일 형식이에요. (이미지·PDF·Excel·CSV)";
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
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
      EXPENSE_CATEGORY_LABEL[cat] ?? cat,
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
      if (s.dep_date) return `${s.dep_date}T${s.dep_time ?? "00:00"}:00`;
      return String(s.departure_time ?? s.departureTime ?? "");
    })(),
    arrivalTime: (() => {
      if (s.arr_date) return `${s.arr_date}T${s.arr_time ?? "00:00"}:00`;
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
  onSaveComplete,
}: AddScheduleWithFileModalProps) {
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

  const itineraryEndTimeMap = useMemo(() => {
    const result = new Map<number, string>();
    const sorted = items
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d.itemType === "itinerary")
      .sort((a, b) => {
        const va = a.d.payload.values as Record<string, unknown>;
        const vb = b.d.payload.values as Record<string, unknown>;
        const ka = `${va.itinerary_date ?? va.itineraryDate ?? ""}${va.start_time ?? va.startTime ?? ""}`;
        const kb = `${vb.itinerary_date ?? vb.itineraryDate ?? ""}${vb.start_time ?? vb.startTime ?? ""}`;
        return ka < kb ? -1 : ka > kb ? 1 : 0;
      });
    for (let i = 0; i < sorted.length; i++) {
      const { d, i: idx } = sorted[i];
      const v = d.payload.values as Record<string, unknown>;
      const existingEnd = String(v.end_time ?? v.endTime ?? "").substring(0, 5);
      if (existingEnd) { result.set(idx, existingEnd); continue; }
      const startRaw = String(v.start_time ?? v.startTime ?? "09:00").substring(0, 5);
      const date = String(v.itinerary_date ?? v.itineraryDate ?? "");
      const next = sorted[i + 1];
      if (next) {
        const nv = next.d.payload.values as Record<string, unknown>;
        const nextDate = String(nv.itinerary_date ?? nv.itineraryDate ?? "");
        const nextStart = String(nv.start_time ?? nv.startTime ?? "").substring(0, 5);
        if (nextDate === date && nextStart) { result.set(idx, nextStart); continue; }
      }
      result.set(idx, dayjs(`2000-01-01T${startRaw}`).add(1, "hour").format("HH:mm"));
    }
    return result;
  }, [items]);

  const dropZoneRef = useRef<View>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    }
  }, [visible]);

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

  const TEST_EXTRA_ITEMS: AiDocumentItemDraft[] = [
    {
      itemType: "flight",
      payload: {
        values: {
          segments: [{ departure_airport: "ICN", arrival_airport: "NRT", departure_time: "2025-03-10T10:30:00", arrival_time: "2025-03-10T12:45:00", airline: "대한항공", flight_number: "KE703" }],
          expense: { amount: 450000, currency: "KRW", category: "flight" },
        },
        fieldMeta: {},
      },
    },
    {
      itemType: "expense",
      payload: {
        values: { category: "food", amount: 15000, currency: "KRW", ex_date: "2025-03-10" },
        fieldMeta: {},
      },
    },
  ] as AiDocumentItemDraft[];

  async function handleAnalyze() {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await analyzePlanUpload(selectedFile, { filename: selectedFile.name });
      if (res.success && res.items.length > 0) {
        const merged = [...res.items, ...TEST_EXTRA_ITEMS];
        setItems(merged);
        setSelectedIndexes(new Set(merged.map((_, i) => i)));
        setStep("preview");
      } else {
        setError(res.error || "파일에서 일정 정보를 찾지 못했어요.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleSave() {
    if (selectedIndexes.size === 0 || !planId) return;
    setIsSaving(true);
    setError(null);
    try {
      const selected = items.filter((_, i) => selectedIndexes.has(i));

      await Promise.allSettled(
        selected.flatMap((draft, _, arr) => {
          const v = draft.payload.values as Record<string, unknown>;
          if (draft.itemType === "itinerary") {
            const idx = items.indexOf(draft);
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
      onSaveComplete();
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
    setShowDepDatePicker(false);
    setShowArrDatePicker(false);
    setShowExpenseDatePicker(false);
    setIsPickerOpen(false);
  }

  function renderEditFormContent(draft: AiDocumentItemDraft, idx: number) {
    const v = (draftEdits[idx] ?? draft.payload.values) as Record<string, unknown>;
    const timerPickerStyle = { height: 34, borderColor: colors.gray300, borderWidth: 1, borderRadius: 8, backgroundColor: colors.white };

    if (draft.itemType === "itinerary") {
      const expNested = ((v.expense ?? {}) as Record<string, unknown>);
      return (
        <View style={styles.editForm}>
          <TextInput
            style={styles.editTitleInput}
            value={String(v.title ?? "")}
            onChangeText={val => setEditField(idx, "title", val)}
            placeholder="제목"
            placeholderTextColor={colors.gray400}
          />
          <View style={styles.editTimeRow}>
            <View style={styles.editCategoryFixed}>
              <Text style={styles.editCategoryFixedText}>일정</Text>
            </View>
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
          <TextInput
            style={styles.editInput}
            value={String(v.location ?? v.city ?? "")}
            onChangeText={val => setEditField(idx, "location", val)}
            placeholder="장소"
            placeholderTextColor={colors.gray400}
          />
          <View style={styles.editExpenseRow}>
            <Text style={styles.editExpenseLabel}>비용</Text>
            <CategoryPicker
              value={String(expNested.category ?? "food") as ExpenseCategoryType}
              onChange={cat => setEditNestedField(idx, "expense", "category", cat)}
              style={styles.editCategoryPickerTrigger}
              onOpen={() => setIsPickerOpen(true)}
              onClose={() => setIsPickerOpen(false)}
            />
            <View style={styles.editCurrencyToggle}>
              <Pressable style={styles.editCurrencyOption} onPress={() => setEditNestedField(idx, "expense", "currency", "KRW")}>
                <Text style={[styles.editCurrencyOptionText, String(expNested.currency ?? "KRW") === "KRW" && styles.editCurrencyOptionTextActive]}>₩</Text>
              </Pressable>
              <View style={styles.editCurrencyDivider} />
              <Pressable style={styles.editCurrencyOption} onPress={() => setEditNestedField(idx, "expense", "currency", "USD")}>
                <Text style={[styles.editCurrencyOptionText, String(expNested.currency ?? "KRW") === "USD" && styles.editCurrencyOptionTextActive]}>$</Text>
              </Pressable>
            </View>
            <View style={styles.editAmountWrapper}>
              <TextInput
                style={styles.editAmountInput}
                value={String(expNested.amount ?? "")}
                onChangeText={val => setEditNestedField(idx, "expense", "amount", val.replace(/[^0-9.]/g, ""))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.gray400}
              />
            </View>
          </View>
          <Pressable style={styles.editDoneButton} onPress={e => { e.stopPropagation(); finishEdit(idx); }}>
            <Text style={styles.editDoneButtonText}>완료</Text>
          </Pressable>
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
              style={{ borderColor: colors.gray300, borderWidth: 1, borderRadius: 8 }}
              dropDownContainerStyle={{ borderColor: colors.gray300 }}
              textStyle={{ ...textStyles.body4, color: colors.gray900 }}
              onOpen={() => setIsPickerOpen(true)}
              onClose={() => setIsPickerOpen(false)}
            />
            <Text style={styles.editTimeSep}>→</Text>
            <AirportPicker
              value={String(seg.arrival_airport ?? "")}
              onChange={val => setEditSegmentField(idx, "arrival_airport", val)}
              placeholder="도착 공항"
              containerStyle={{ flex: 1 }}
              style={{ borderColor: colors.gray300, borderWidth: 1, borderRadius: 8 }}
              dropDownContainerStyle={{ borderColor: colors.gray300 }}
              textStyle={{ ...textStyles.body4, color: colors.gray900 }}
              onOpen={() => setIsPickerOpen(true)}
              onClose={() => setIsPickerOpen(false)}
            />
          </View>
          <View style={[styles.editTimeRow, { zIndex: showDepDatePicker ? 2000 : 20 }]}>
            <View style={[styles.editFlightCell, { position: "relative" }]}>
              <Pressable
                style={styles.editDateTrigger}
                onPress={() => { setShowDepDatePicker(true); setShowArrDatePicker(false); }}
              >
                <Text style={depDate ? styles.editDateText : styles.editDatePlaceholder}>
                  {depDate ? dayjs(depDate).format("YYYY.MM.DD") : "출발 날짜"}
                </Text>
                <CalendarIcon width={14} height={14} />
              </Pressable>
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
              <Pressable
                style={styles.editDateTrigger}
                onPress={() => { setShowArrDatePicker(true); setShowDepDatePicker(false); }}
              >
                <Text style={arrDate ? styles.editDateText : styles.editDatePlaceholder}>
                  {arrDate ? dayjs(arrDate).format("YYYY.MM.DD") : "도착 날짜"}
                </Text>
                <CalendarIcon width={14} height={14} />
              </Pressable>
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
          <View style={styles.editExpenseRow}>
            <Text style={styles.editExpenseLabel}>비용</Text>
            <View style={styles.editCurrencyToggle}>
              <Pressable style={styles.editCurrencyOption} onPress={() => setEditNestedField(idx, "expense", "currency", "KRW")}>
                <Text style={[styles.editCurrencyOptionText, String(expNested.currency ?? "KRW") === "KRW" && styles.editCurrencyOptionTextActive]}>₩</Text>
              </Pressable>
              <View style={styles.editCurrencyDivider} />
              <Pressable style={styles.editCurrencyOption} onPress={() => setEditNestedField(idx, "expense", "currency", "USD")}>
                <Text style={[styles.editCurrencyOptionText, String(expNested.currency ?? "KRW") === "USD" && styles.editCurrencyOptionTextActive]}>$</Text>
              </Pressable>
            </View>
            <View style={styles.editAmountWrapper}>
              <TextInput
                style={styles.editAmountInput}
                value={String(expNested.amount ?? "")}
                onChangeText={val => setEditNestedField(idx, "expense", "amount", val.replace(/[^0-9.]/g, ""))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.gray400}
              />
            </View>
          </View>
          <Pressable style={styles.editDoneButton} onPress={e => { e.stopPropagation(); finishEdit(idx); }}>
            <Text style={styles.editDoneButtonText}>완료</Text>
          </Pressable>
        </View>
      );
    }

    if (draft.itemType === "accommodation") {
      const expNested = ((v.expense ?? {}) as Record<string, unknown>);
      return (
        <View style={styles.editForm}>
          <TextInput
            style={styles.editTitleInput}
            value={String(v.name ?? "")}
            onChangeText={val => setEditField(idx, "name", val)}
            placeholder="숙소명"
            placeholderTextColor={colors.gray400}
          />
          <View style={styles.editTimeRow}>
            <TimePicker
              value={normalizeHHmm(v.checkin_time ?? v.start_time)}
              onChange={val => setEditField(idx, "checkin_time", val)}
              style={timerPickerStyle}
              containerStyle={{ flex: 1 }}
            />
            <Text style={styles.editTimeSep}>–</Text>
            <TimePicker
              value={normalizeHHmm(v.checkout_time ?? v.end_time)}
              onChange={val => setEditField(idx, "checkout_time", val)}
              style={timerPickerStyle}
              containerStyle={{ flex: 1 }}
              popupAlign="right"
            />
          </View>
          <TextInput
            style={styles.editInput}
            value={String(v.place ?? v.city ?? "")}
            onChangeText={val => setEditField(idx, "place", val)}
            placeholder="장소"
            placeholderTextColor={colors.gray400}
          />
          <View style={styles.editExpenseRow}>
            <Text style={styles.editExpenseLabel}>비용</Text>
            <View style={styles.editCurrencyToggle}>
              <Pressable style={styles.editCurrencyOption} onPress={() => setEditNestedField(idx, "expense", "currency", "KRW")}>
                <Text style={[styles.editCurrencyOptionText, String(expNested.currency ?? "KRW") === "KRW" && styles.editCurrencyOptionTextActive]}>₩</Text>
              </Pressable>
              <View style={styles.editCurrencyDivider} />
              <Pressable style={styles.editCurrencyOption} onPress={() => setEditNestedField(idx, "expense", "currency", "USD")}>
                <Text style={[styles.editCurrencyOptionText, String(expNested.currency ?? "KRW") === "USD" && styles.editCurrencyOptionTextActive]}>$</Text>
              </Pressable>
            </View>
            <View style={styles.editAmountWrapper}>
              <TextInput
                style={styles.editAmountInput}
                value={String(expNested.amount ?? "")}
                onChangeText={val => setEditNestedField(idx, "expense", "amount", val.replace(/[^0-9.]/g, ""))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.gray400}
              />
            </View>
          </View>
          <Pressable style={styles.editDoneButton} onPress={e => { e.stopPropagation(); finishEdit(idx); }}>
            <Text style={styles.editDoneButtonText}>완료</Text>
          </Pressable>
        </View>
      );
    }

    if (draft.itemType === "expense") {
      return (
        <View style={styles.editForm}>
          <View style={styles.editExpenseRow}>
            <CategoryPicker
              value={String(v.category ?? "food") as ExpenseCategoryType}
              onChange={cat => setEditField(idx, "category", cat)}
              style={styles.editCategoryPickerTrigger}
              onOpen={() => setIsPickerOpen(true)}
              onClose={() => setIsPickerOpen(false)}
            />
            <View style={styles.editCurrencyToggle}>
              <Pressable style={styles.editCurrencyOption} onPress={() => setEditField(idx, "currency", "KRW")}>
                <Text style={[styles.editCurrencyOptionText, String(v.currency ?? "KRW") === "KRW" && styles.editCurrencyOptionTextActive]}>₩</Text>
              </Pressable>
              <View style={styles.editCurrencyDivider} />
              <Pressable style={styles.editCurrencyOption} onPress={() => setEditField(idx, "currency", "USD")}>
                <Text style={[styles.editCurrencyOptionText, String(v.currency ?? "KRW") === "USD" && styles.editCurrencyOptionTextActive]}>$</Text>
              </Pressable>
            </View>
            <View style={styles.editAmountWrapper}>
              <TextInput
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
            <Pressable
              style={styles.editDateTrigger}
              onPress={() => setShowExpenseDatePicker(true)}
            >
              <Text style={String(v.ex_date ?? "") ? styles.editDateText : styles.editDatePlaceholder}>
                {String(v.ex_date ?? "") ? dayjs(String(v.ex_date).substring(0, 10)).format("YYYY.MM.DD") : "날짜"}
              </Text>
              <CalendarIcon width={14} height={14} />
            </Pressable>
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
          <Pressable style={styles.editDoneButton} onPress={e => { e.stopPropagation(); finishEdit(idx); }}>
            <Text style={styles.editDoneButtonText}>완료</Text>
          </Pressable>
        </View>
      );
    }

    return null;
  }

  const allSelected = items.length > 0 && selectedIndexes.size === items.length;
  const { krwTotal, usdTotal, count: expenseCount } = getExpenseSummary(items, selectedIndexes);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {hiddenFileInput}
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={e => e.stopPropagation()}>

          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>파일로 일정 추가</Text>
              <Text style={styles.description}>
                {step === "upload"
                  ? "엑셀·이미지·PDF를 올리면 AI가 일정을 정리해 드려요."
                  : `'${planName}'에 추가할 일정을 선택하세요.`}
              </Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <XIcon width={16} height={16} />
            </Pressable>
          </View>

          {step === "upload" ? (
            <>
              <Pressable
                ref={dropZoneRef}
                style={[styles.dropZone, isDragging && styles.dropZoneDragging]}
                onPress={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <>
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
                      <Text style={styles.fileSize}>{formatFileSize(selectedFile.size)}</Text>
                    </View>
                    <Pressable
                      style={styles.removeFileButton}
                      onPress={e => { e.stopPropagation(); setSelectedFile(null); setError(null); }}
                    >
                      <XIcon width={12} height={12} />
                      <Text style={styles.removeFileText}>파일 제거</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <View style={styles.uploadIconCircle}>
                      <UploadIcon width={26} height={26} />
                    </View>
                    <Text style={styles.dropZoneTitle}>파일을 끌어다 놓거나 클릭해서 선택</Text>
                    <Text style={styles.dropZoneHint}>엑셀(xlsx·csv) · 이미지(JPG·PNG) · PDF · 최대 10MB · 1개만 첨부</Text>
                  </>
                )}
              </Pressable>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <View style={styles.buttonRow}>
                <Pressable style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelButtonText}>취소</Text>
                </Pressable>
                <Pressable
                  style={[styles.aiButton, !selectedFile && styles.aiButtonDisabled]}
                  onPress={handleAnalyze}
                  disabled={!selectedFile || isAnalyzing}
                >
                  <LinearGradient colors={colors.aiGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiButtonGradient}>
                    {isAnalyzing
                      ? <ActivityIndicator size="small" color={colors.white} />
                      : <AiRefreshIcon width={14} height={14} color={colors.white} />
                    }
                    <Text style={styles.aiButtonText}>{isAnalyzing ? "분석 중..." : "AI로 분석"}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {/* 요약 바 */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  {"분석된 일정 "}
                  <Text style={styles.summaryCount}>{items.length}</Text>
                  {"개"}
                  <Text style={styles.summarySelected}>{"  ·  "}{selectedIndexes.size}개 선택</Text>
                </Text>
                <Pressable style={styles.toggleAllButton} onPress={toggleAll}>
                  <View style={[styles.toggleCheckbox, allSelected && styles.toggleCheckboxSelected]}>
                    {allSelected && <CheckWhiteIcon width={12} height={12} />}
                  </View>
                  <Text style={styles.toggleAllText}>전체 선택</Text>
                </Pressable>
              </View>

              {/* 비용 합계 배너 */}
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

              {/* 아이템 목록 */}
              <ScrollView
                style={styles.itemList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={(showDepDatePicker || showArrDatePicker || showExpenseDatePicker || isPickerOpen) ? { paddingBottom: 120 } : undefined}
              >
                {items.map((draft, i) => {
                  const isSelected = selectedIndexes.has(i);
                  const isEditing = editingIndex === i;
                  const badge = ITEM_BADGE[draft.itemType] ?? ITEM_BADGE.itinerary;
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

                  return (
                    <Pressable
                      key={i}
                      style={[styles.itemCard, isSelected ? styles.itemCardSelected : styles.itemCardUnselected, isEditing && { zIndex: 100 }]}
                      onPress={isEditing ? undefined : () => toggleIndex(i)}
                    >
                      <Pressable
                        style={[styles.itemCheckbox, isSelected && styles.itemCheckboxSelected]}
                        onPress={e => { e.stopPropagation(); toggleIndex(i); }}
                      >
                        {isSelected && <CheckWhiteIcon width={12} height={12} />}
                      </Pressable>

                      {isEditing ? (
                        <View style={styles.itemContent}>
                          {renderEditFormContent(draft, i)}
                        </View>
                      ) : (
                        <>
                          <View style={styles.itemContent}>
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

                            {expense ? (
                              <View style={styles.inlineExpenseBadge}>
                                <ExpenseCardIcon width={12} height={12} color="#1F9D57" />
                                <Text style={styles.inlineExpenseCategory}>
                                  {EXPENSE_CATEGORY_LABEL[expense.category] ?? expense.category}
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

                          <Pressable style={styles.editButton} onPress={e => { e.stopPropagation(); startEdit(i); }}>
                            <UpdateIcon width={14} height={14} color={colors.gray600} />
                          </Pressable>
                        </>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <View style={styles.buttonRow}>
                <Pressable style={styles.cancelButton} onPress={() => { setStep("upload"); setError(null); }}>
                  <Text style={styles.cancelButtonText}>다시 올리기</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveButton, selectedIndexes.size === 0 && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={selectedIndexes.size === 0 || isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : null}
                  <Text style={styles.saveButtonText}>
                    {isSaving ? "저장 중..." : `선택한 ${selectedIndexes.size}개 일정 추가`}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "100%",
    maxWidth: 530,
    maxHeight: "60%",
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: 20,
    gap: 18,
    boxShadow: "rgba(0, 0, 0, 0.12) 0px 24px 48px",
  } as any,
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: 6 },
  title: { ...textStyles.h4, color: colors.gray900 },
  description: { ...textStyles.body4, color: colors.gray700 },
  closeButton: { width: 28, height: 28, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },

  // Upload step
  dropZone: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.gray400,
    borderRadius: radii.lg,
    backgroundColor: colors.gray100,
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: spacing.lg,
    gap: 10,
  },
  dropZoneDragging: { borderColor: colors.primary, backgroundColor: colors.gray200 },
  uploadIconCircle: { width: 52, height: 52, borderRadius: radii.pill, backgroundColor: colors.gray300, alignItems: "center", justifyContent: "center" },
  dropZoneTitle: { ...textStyles.h6, color: colors.gray900 },
  dropZoneHint: { ...textStyles.body5, color: colors.gray600 },
  fileInfo: { alignItems: "center", gap: 4 },
  fileName: { ...textStyles.h6, color: colors.gray900, maxWidth: 360 },
  fileSize: { ...textStyles.body5, color: colors.gray600 },
  removeFileButton: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radii.sm, backgroundColor: colors.gray200 },
  removeFileText: { ...textStyles.body5, color: colors.gray700 },

  errorText: { ...textStyles.body5, color: "#E53E3E" },

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
    gap: 7,
    height: 30,
    paddingHorizontal: 12,
    paddingLeft: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
  },
  toggleCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.gray400,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleCheckboxSelected: { backgroundColor: colors.gray900, borderColor: colors.gray900 },
  toggleAllText: { ...textStyles.h8, color: colors.gray900 },

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

  itemCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.gray400,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  itemCheckboxSelected: { backgroundColor: colors.gray900, borderColor: colors.gray900 },

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

  editButton: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  editForm: { flex: 1, gap: 8 },
  editTitleInput: {
    height: 40, borderWidth: 1, borderColor: colors.gray300, borderRadius: 8,
    paddingHorizontal: 10, fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 13, color: colors.gray900, outlineStyle: "none",
  } as any,
  editInput: {
    height: 40, borderWidth: 1, borderColor: colors.gray300, borderRadius: 8,
    paddingHorizontal: 10, fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 12, color: colors.gray900, outlineStyle: "none",
  } as any,
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
  editCategoryFixed: {
    height: 40, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.gray300,
    borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  editCategoryFixedText: {
    fontFamily: typography.fontFamily.pretendardRegular, fontSize: 12, color: colors.gray600,
  },
  editExpenseRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  editCategoryPickerTrigger: { minWidth:100, minHeight: 40, borderWidth: 1, borderColor: colors.gray300, backgroundColor: colors.white },
  editExpenseLabel: {
    width: 30, fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 12, lineHeight: 18, color: colors.gray600, flexShrink: 0,
  },
  editAmountWrapper: {
    flex: 1, flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: colors.gray300, borderRadius: 8,
    height: 40, paddingHorizontal: 8,
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
    flex: 1, borderWidth: 0, fontFamily: typography.fontFamily.poppinsSemiBold,
    fontSize: 12, color: colors.gray900, textAlign: "right", outlineStyle: "none",
  } as any,
  editDoneButton: {
    alignSelf: "flex-end", height: 30, paddingHorizontal: 14,
    borderRadius: 8, backgroundColor: "#007AFF",
    alignItems: "center", justifyContent: "center",
  },
  editDoneButtonText: {
    fontFamily: typography.fontFamily.pretendardSemiBold, fontSize: 12, color: colors.white,
  },

  // Buttons
  buttonRow: { flexDirection: "row", gap: 10 },
  cancelButton: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cancelButtonText: { ...textStyles.h7, color: colors.gray900 },
  aiButton: { flex: 1, height: 46, borderRadius: 12, overflow: "hidden" },
  aiButtonDisabled: { opacity: 0.45 },
  aiButtonGradient: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  aiButtonText: { ...textStyles.h7, color: colors.white },
  saveButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.gray900,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  saveButtonDisabled: { opacity: 0.45 },
  saveButtonText: { ...textStyles.h7, color: colors.white },
});
