import type { AiDocumentItemDraft } from "@/types/api";
import { ExpenseCategory, ExpenseCurrency } from "@/types/expense";
import dayjs from "dayjs";
import type { Dispatch, SetStateAction } from "react";

type ItineraryFormData = {
  title: string;
  description: string;
  country: string;
  city: string;
  location: string;
  locationId?: number | undefined;
  itineraryDate: string;
  startTime: string;
  endTime: string;
  [key: string]: unknown;
};

/** AI 분석 모달 저장 시 draft → 일정 패널 `formData` / `draftExpenses` 반영 */
export function applyItineraryDraftFromAi(
  draft: AiDocumentItemDraft,
  setFormData: Dispatch<SetStateAction<ItineraryFormData>>,
  setDraftExpenses: Dispatch<SetStateAction<any[]>>,
): boolean {
  if (draft.itemType !== "itinerary") return false;
  const v = draft.payload.values as Record<string, unknown>;

  setFormData(prev => {
    const itineraryDateStr = String(
      v.itineraryDate ?? v.itinerary_date ?? prev.itineraryDate,
    );
    const startRaw = String(v.startTime ?? v.start_time ?? prev.startTime);
    const startTime =
      startRaw.trim().length >= 4 ? startRaw.substring(0, 5) : prev.startTime;
    let endRaw = String(v.endTime ?? v.end_time ?? "").trim();
    if (!endRaw) endRaw = prev.endTime;
    let endTime = endRaw.substring(0, 5);
    if (endTime === "23:59" || endRaw.startsWith("23:59:")) {
      endTime = "24:00";
    }
    if (!endTime || endTime.length < 4) {
      endTime = prev.endTime;
    }
    return {
      ...prev,
      title: String(v.title ?? prev.title),
      description: String(v.description ?? prev.description),
      country: String(v.country ?? prev.country),
      city: String(v.city ?? prev.city),
      location: String(v.location ?? prev.location),
      itineraryDate: itineraryDateStr || prev.itineraryDate,
      startTime,
      endTime,
    };
  });

  const ex = v.expense;
  if (!ex || typeof ex !== "object" || Array.isArray(ex)) {
    setDraftExpenses([]);
  } else {
    const eo = ex as Record<string, unknown>;
    const amount = Number(eo.amount) || 0;
    const catRaw = String(eo.category ?? "etc").toLowerCase();
    const cat = (Object.values(ExpenseCategory) as string[]).includes(catRaw)
      ? (catRaw as ExpenseCategory)
      : ExpenseCategory.ETC;
    if (amount > 0 || String(eo.description ?? "").trim().length > 0) {
      const dateStr = String(
        v.itineraryDate ?? v.itinerary_date ?? dayjs().format("YYYY-MM-DD"),
      );
      setDraftExpenses([
        {
          category: cat,
          amount,
          description: String(eo.description ?? ""),
          exDate: String(eo.exDate ?? eo.ex_date ?? dateStr),
          currency: ExpenseCurrency.KRW,
        },
      ]);
    } else {
      setDraftExpenses([]);
    }
  }
  return true;
}

function normalizeAmountDigits(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const integerPart = raw.split(".")[0];
  return integerPart.replace(/[^0-9]/g, "");
}

function coerceFlightSegmentsArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t.startsWith("[")) return [];
    try {
      const p = JSON.parse(t) as unknown;
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

export type FlightSegmentFormState = {
  id?: number;
  airline: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  departure_time: string;
  arrival_date: string;
  arrival_time: string;
  seat_class?: string;
  seat_number?: string;
  gate?: string;
  terminal?: string;
};

export type FlightFormTopState = {
  reservation_number: string;
  passenger_name: string;
  ticket_number: string;
  booking_reference: string;
};

/** AI 분석 모달 저장 시 draft → 항공 패널 상태 반영 */
export function applyFlightDraftFromAi(
  draft: AiDocumentItemDraft,
  setFormData: Dispatch<SetStateAction<FlightFormTopState>>,
  setFlightSegments: Dispatch<SetStateAction<FlightSegmentFormState[]>>,
  setExpenseData: Dispatch<SetStateAction<{ amount: string }>>,
  setExpenseDate: Dispatch<SetStateAction<string>>,
): boolean {
  if (draft.itemType !== "flight") return false;
  const v = draft.payload.values as Record<string, unknown>;

  setFormData({
    reservation_number: String(
      v.reservationNumber ?? v.reservation_number ?? "",
    ),
    passenger_name: String(v.passengerName ?? v.passenger_name ?? ""),
    ticket_number: String(v.ticketNumber ?? v.ticket_number ?? ""),
    booking_reference: String(v.bookingReference ?? v.booking_reference ?? ""),
  });

  const rawSegs = coerceFlightSegmentsArray(v.segments ?? v.Segments);
  if (rawSegs.length > 0) {
    setFlightSegments(
      rawSegs.map((segment: any) => {
        const depRaw = segment.departureTime ?? segment.departure_time;
        const arrRaw = segment.arrivalTime ?? segment.arrival_time;
        const depTime = depRaw ? dayjs(depRaw) : dayjs();
        const arrTime = arrRaw ? dayjs(arrRaw) : dayjs().add(1, "hour");
        return {
          id: segment.id,
          airline: segment.airline || "",
          flight_number: segment.flightNumber || segment.flight_number || "",
          departure_airport:
            segment.departureAirport || segment.departure_airport || "",
          arrival_airport:
            segment.arrivalAirport || segment.arrival_airport || "",
          departure_date: depTime.format("YYYY-MM-DD"),
          departure_time: depTime.format("HH:mm"),
          arrival_date: arrTime.format("YYYY-MM-DD"),
          arrival_time: arrTime.format("HH:mm"),
          seat_class: segment.seatClass || segment.seat_class || "",
          seat_number: segment.seatNumber || segment.seat_number || "",
          gate: segment.gate || "",
          terminal: segment.terminal || "",
        };
      }),
    );
  }

  const ex = v.expense as Record<string, unknown> | undefined;
  if (ex && typeof ex === "object" && !Array.isArray(ex)) {
    setExpenseData({
      amount: normalizeAmountDigits(ex.amount),
    });
    const ed = ex.exDate ?? ex.ex_date;
    if (ed) setExpenseDate(String(ed));
  } else {
    setExpenseData({ amount: "" });
  }
  return true;
}

export type AccommodationFormState = {
  name: string;
  place: string;
  locationId?: number | undefined;
  country: string;
  city: string;
  checkin_date: string;
  checkout_date: string;
  checkin_time: string;
  checkout_time: string;
  description: string;
  [key: string]: unknown;
};

/** AI 분석 모달 저장 시 draft → 숙박 패널 `formData` / `expenseData` 반영 */
export function applyAccommodationDraftFromAi(
  draft: AiDocumentItemDraft,
  setFormData: Dispatch<SetStateAction<AccommodationFormState>>,
  setExpenseData: Dispatch<
    SetStateAction<{ amount: string; currency: ExpenseCurrency }>
  >,
): boolean {
  if (draft.itemType !== "accommodation") return false;
  const v = draft.payload.values as Record<string, unknown>;
  const ci = String(v.checkinDate ?? v.checkin_date ?? "");
  const co = String(v.checkoutDate ?? v.checkout_date ?? "");
  const cit = String(v.checkinTime ?? v.checkin_time ?? "15:00");
  const cot = String(v.checkoutTime ?? v.checkout_time ?? "11:00");
  const shortTime = (t: string) =>
    t.length >= 8 && t.includes(":") ? t.substring(0, 5) : t;

  setFormData({
    name: String(v.name ?? ""),
    place: String(v.place ?? ""),
    country: String(v.country ?? ""),
    city: String(v.city ?? ""),
    checkin_date: ci || dayjs().format("YYYY-MM-DD"),
    checkout_date: co || dayjs().add(1, "day").format("YYYY-MM-DD"),
    checkin_time: shortTime(cit),
    checkout_time: shortTime(cot),
    description: String(v.description ?? ""),
  });

  const ex = v.expense as Record<string, unknown> | undefined;
  if (ex && typeof ex === "object" && !Array.isArray(ex)) {
    const cur = String(ex.currency ?? "KRW").toUpperCase();
    const curOk = (Object.values(ExpenseCurrency) as string[]).includes(cur)
      ? (cur as ExpenseCurrency)
      : ExpenseCurrency.KRW;
    setExpenseData({
      amount: normalizeAmountDigits(ex.amount),
      currency: curOk,
    });
  } else {
    setExpenseData(prev => ({
      ...prev,
      amount: "",
    }));
  }
  return true;
}
