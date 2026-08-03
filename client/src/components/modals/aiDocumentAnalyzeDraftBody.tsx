import DraftCalendar from "@/components/modals/DraftCalendar";
import { PLACEHOLDERS } from "@/constants/placeholders";
import type { AiDocumentItemDraft, FlightSegmentBaseDto } from "@/types/api";
import { ExpenseCategory, ExpenseCurrency } from "@/types/expense";
import Input from "@/ui/components/input/Input";
import {
  AirportPicker,
  CategoryPicker,
  CityPicker,
  CountryPicker,
  TimePicker,
} from "@/ui/components/pickers";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import dayjs from "dayjs";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import CalendarIcon from "../../../assets/calender.svg";

const _ORANGE = "#E07000";
const _ORANGE_BG = "#FFF1E5";

export function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const raw = obj[k];
    if (raw === undefined || raw === null) continue;
    if (typeof raw === "string") return raw;
    if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  }
  return "";
}

export type AiAnalyzeDraftEditorRef = {
  buildDraft: () => AiDocumentItemDraft;
};

function readExpenseNested(
  values: Record<string, unknown>,
): Record<string, unknown> | null {
  const e = values.expense ?? values.Expense;
  if (e && typeof e === "object" && !Array.isArray(e)) {
    return e as Record<string, unknown>;
  }
  return null;
}

function normalizeHHmm(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = dayjs(s);
    if (d.isValid()) return d.format("HH:mm");
  }
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{2}:\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  return s.slice(0, 5);
}

function coerceExpenseCategory(raw: string): ExpenseCategory {
  const v = raw.trim().toLowerCase();
  const all = Object.values(ExpenseCategory) as string[];
  if (all.includes(v)) return v as ExpenseCategory;
  return ExpenseCategory.ETC;
}

function normalizeAmountDigits(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const integerPart = raw.split(".")[0];
  return integerPart.replace(/[^0-9]/g, "");
}

function formatAmountWithCommas(digits: string): string {
  if (!digits) return "";
  const normalized = digits.replace(/^0+(?=\d)/, "");
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** segments: 배열 | 단일 객체 | JSON 문자열 */
function coerceFlightSegments(segRaw: unknown): Record<string, unknown>[] {
  let raw: unknown = segRaw;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t.startsWith("[") || t.startsWith("{")) {
      try {
        raw = JSON.parse(t) as unknown;
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }
  if (Array.isArray(raw)) {
    return raw.filter(
      (item): item is Record<string, unknown> =>
        item != null && typeof item === "object" && !Array.isArray(item),
    );
  }
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    return [raw as Record<string, unknown>];
  }
  return [];
}

type SegmentForm = {
  airline: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_date: string;
  departure_time: string;
  arrival_date: string;
  arrival_time: string;
  seat_class: string;
  seat_number: string;
  gate: string;
  terminal: string;
};

function segmentFromLoose(seg: Record<string, unknown>): SegmentForm {
  const depRaw = pickStr(seg, [
    "departure_time",
    "departureTime",
    "DepartureTime",
  ]);
  const arrRaw = pickStr(seg, ["arrival_time", "arrivalTime", "ArrivalTime"]);
  let depD = dayjs(depRaw);
  let arrD = dayjs(arrRaw);
  if (!depD.isValid()) {
    const dd = pickStr(seg, [
      "departure_date",
      "departureDate",
      "DepartureDate",
    ]);
    const tt =
      normalizeHHmm(
        pickStr(seg, ["departure_time_local", "departureTimeLocal"]) || "09:00",
      ) || "09:00";
    depD = dd ? dayjs(`${dd}T${tt.length === 5 ? `${tt}:00` : tt}`) : dayjs();
  }
  if (!arrD.isValid()) {
    const ad = pickStr(seg, ["arrival_date", "arrivalDate", "ArrivalDate"]);
    const at =
      normalizeHHmm(
        pickStr(seg, ["arrival_time_local", "arrivalTimeLocal"]) || "10:00",
      ) || "10:00";
    arrD = ad
      ? dayjs(`${ad}T${at.length === 5 ? `${at}:00` : at}`)
      : depD.add(1, "hour");
  }
  return {
    airline: pickStr(seg, ["airline", "Airline"]),
    flight_number: pickStr(seg, [
      "flight_number",
      "flightNumber",
      "FlightNumber",
    ]),
    departure_airport: pickStr(seg, [
      "departure_airport",
      "departureAirport",
      "DepartureAirport",
    ]),
    arrival_airport: pickStr(seg, [
      "arrival_airport",
      "arrivalAirport",
      "ArrivalAirport",
    ]),
    departure_date: depD.format("YYYY-MM-DD"),
    departure_time: depD.format("HH:mm"),
    arrival_date: arrD.format("YYYY-MM-DD"),
    arrival_time: arrD.format("HH:mm"),
    seat_class: pickStr(seg, ["seat_class", "seatClass", "SeatClass"]),
    seat_number: pickStr(seg, ["seat_number", "seatNumber", "SeatNumber"]),
    gate: pickStr(seg, ["gate", "Gate"]),
    terminal: pickStr(seg, ["terminal", "Terminal"]),
  };
}

function initFlightSegments(values: Record<string, unknown>): SegmentForm[] {
  const segRaw = values.segments ?? values.Segments;
  const segs = coerceFlightSegments(segRaw);
  if (segs.length === 0) {
    const planDate = dayjs().format("YYYY-MM-DD");
    return [
      {
        airline: "",
        flight_number: "",
        departure_airport: "",
        arrival_airport: "",
        departure_date: planDate,
        departure_time: "",
        arrival_date: planDate,
        arrival_time: "",
        seat_class: "",
        seat_number: "",
        gate: "",
        terminal: "",
      },
    ];
  }
  return segs.map(segmentFromLoose);
}

function toIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  const timeWithSeconds = time.length === 5 ? `${time}:00` : time;
  const localDateTime = new Date(`${date}T${timeWithSeconds}`);
  if (Number.isNaN(localDateTime.getTime())) return null;
  return localDateTime.toISOString();
}

const ItineraryDraftEditor = forwardRef<
  AiAnalyzeDraftEditorRef,
  { draft: Extract<AiDocumentItemDraft, { itemType: "itinerary" }> }
>(function ItineraryDraftEditor({ draft }, ref) {
  const base = draft.payload;
  const values = useMemo(() => {
    const raw = base.values as Record<string, unknown>;
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  }, [base.values]);

  const [title, setTitle] = useState(() => pickStr(values, ["title", "Title"]));
  const [description, setDescription] = useState(() =>
    pickStr(values, ["description", "Description"]),
  );
  const [country, setCountry] = useState(() =>
    pickStr(values, ["country", "Country"]),
  );
  const [city, setCity] = useState(() => pickStr(values, ["city", "City"]));
  const [location, setLocation] = useState(() =>
    pickStr(values, ["location", "Location"]),
  );
  const [itineraryDate, setItineraryDate] = useState(
    () =>
      pickStr(values, ["itineraryDate", "itinerary_date", "ItineraryDate"]) ||
      dayjs().format("YYYY-MM-DD"),
  );
  const [startTime, setStartTime] = useState(
    () =>
      normalizeHHmm(
        pickStr(values, ["startTime", "start_time", "StartTime"]) || "09:00",
      ) || "09:00",
  );
  const [endTime, setEndTime] = useState(
    () =>
      normalizeHHmm(
        pickStr(values, ["endTime", "end_time", "EndTime"]) || "10:00",
      ) || "10:00",
  );

  const expNested = readExpenseNested(values);
  const initialExpense =
    expNested ||
    (pickStr(values, ["amount", "Amount"]).length > 0 ? values : null);

  const [showExpense, setShowExpense] = useState(
    () =>
      !!(
        expNested ||
        pickStr(values, ["category", "Category"]).length > 0 ||
        pickStr(values, ["amount", "Amount"]).length > 0
      ),
  );
  const [expCategory, setExpCategory] = useState<ExpenseCategory>(() =>
    initialExpense
      ? coerceExpenseCategory(
          pickStr(initialExpense, ["category", "Category"]) || "etc",
        )
      : ExpenseCategory.ETC,
  );
  const [expAmount, setExpAmount] = useState(() =>
    normalizeAmountDigits(
      initialExpense ? pickStr(initialExpense, ["amount", "Amount"]) : "",
    ),
  );
  const [expDescription, setExpDescription] = useState(() =>
    initialExpense
      ? pickStr(initialExpense, ["description", "Description"])
      : "",
  );

  const [countryOpen, setCountryOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    setTitle(pickStr(values, ["title", "Title"]));
    setDescription(pickStr(values, ["description", "Description"]));
    setCountry(pickStr(values, ["country", "Country"]));
    setCity(pickStr(values, ["city", "City"]));
    setLocation(pickStr(values, ["location", "Location"]));
    setItineraryDate(
      pickStr(values, ["itineraryDate", "itinerary_date", "ItineraryDate"]) ||
        dayjs().format("YYYY-MM-DD"),
    );
    setStartTime(
      normalizeHHmm(
        pickStr(values, ["startTime", "start_time", "StartTime"]) || "09:00",
      ) || "09:00",
    );
    setEndTime(
      normalizeHHmm(
        pickStr(values, ["endTime", "end_time", "EndTime"]) || "10:00",
      ) || "10:00",
    );
    const ex = readExpenseNested(values);
    const hasEx =
      !!ex ||
      pickStr(values, ["category", "Category"]).length > 0 ||
      pickStr(values, ["amount", "Amount"]).length > 0;
    setShowExpense(hasEx);
    const src = ex || values;
    setExpCategory(
      coerceExpenseCategory(pickStr(src, ["category", "Category"]) || "etc"),
    );
    setExpAmount(normalizeAmountDigits(pickStr(src, ["amount", "Amount"])));
    setExpDescription(pickStr(src, ["description", "Description"]));
  }, [values]);

  useImperativeHandle(
    ref,
    () => ({
      buildDraft: (): AiDocumentItemDraft => {
        const nextValues: Record<string, unknown> = {
          ...values,
          title,
          description,
          country,
          city,
          location,
          itineraryDate,
          startTime,
          endTime,
        };
        if (
          showExpense &&
          (expAmount.length > 0 || expDescription.length > 0)
        ) {
          nextValues.expense = {
            category: expCategory,
            amount: Number.parseInt(expAmount, 10) || 0,
            description: expDescription,
            exDate: itineraryDate,
            currency: ExpenseCurrency.KRW,
          };
        } else {
          delete nextValues.expense;
        }
        return {
          itemType: "itinerary",
          payload: {
            ...base,
            values: nextValues as typeof base.values,
          },
        };
      },
    }),
    [
      base,
      values,
      title,
      description,
      country,
      city,
      location,
      itineraryDate,
      startTime,
      endTime,
      showExpense,
      expCategory,
      expAmount,
      expDescription,
    ],
  );

  return (
    <View style={styles.formSection}>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>제목*</Text>
        <Input
          variant="filled"
          containerStyle={{ flex: 1, height: 40 }}
          placeholder={PLACEHOLDERS.itinerary.titleForm}
          value={title}
          onChangeText={setTitle}
          style={styles.fieldInput}
          placeholderTextColor={colors.gray500}
        />
      </View>

      <View style={styles.fieldRowTop}>
        <Text style={[styles.fieldLabel, styles.fieldLabelTop]}>내용</Text>
        <Input
          variant="filled"
          containerStyle={{ flex: 1, height: 56 }}
          placeholder={PLACEHOLDERS.itinerary.descriptionForm}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={styles.fieldTextarea}
          placeholderTextColor={colors.gray500}
        />
      </View>

      <View
        style={[
          styles.fieldRow,
          styles.countryPickerWrapper,
          { zIndex: countryOpen ? 10001 : 1 },
        ]}
      >
        <Text style={styles.fieldLabel}>국가</Text>
        <View style={styles.fieldPickerWrap}>
          <CountryPicker
            value={country}
            onChange={name => { setCountry(name); setCity(""); }}
            onOpen={() => setCountryOpen(true)}
            onClose={() => setCountryOpen(false)}
            placeholder={PLACEHOLDERS.itinerary.countryForm}
            style={styles.draftCountryPicker}
            useModal
          />
        </View>
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>도시</Text>
        <View style={{ flex: 1 }}>
          <CityPicker
            value={city}
            onChange={setCity}
            countryKo={country}
            placeholder={PLACEHOLDERS.itinerary.cityForm}
            style={styles.draftCityPicker}
            useModal
          />
        </View>
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>장소</Text>
        <Input
          variant="filled"
          containerStyle={{ flex: 1, height: 40 }}
          placeholder="장소를 입력하세요."
          value={location}
          onChangeText={setLocation}
          style={styles.fieldInput}
          placeholderTextColor={colors.gray500}
        />
      </View>

      <View
        style={[
          styles.fieldRow,
          styles.datePickerWrapper,
          { zIndex: showDatePicker ? 20000 : 1 },
        ]}
      >
        <Text style={styles.fieldLabel}>날짜*</Text>
        <View style={styles.fieldPickerWrap}>
          <Pressable
            style={styles.fieldDateTrigger}
            onPress={() => setShowDatePicker(!showDatePicker)}
          >
            <Text style={styles.fieldDateText}>
              {dayjs(itineraryDate).format("YYYY년 M월 D일")}
            </Text>
            <CalendarIcon width={14} height={14} />
          </Pressable>
          <DraftCalendar
            visible={showDatePicker}
            selectedDate={itineraryDate}
            onDayPress={day => {
              setItineraryDate(day.dateString);
              setShowDatePicker(false);
            }}
            onClose={() => setShowDatePicker(false)}
            style={styles.fieldCalendarPopup}
          />
        </View>
      </View>

      <View
        style={[
          styles.fieldRow,
          styles.pickerRowWrapper,
          { zIndex: timeOpen ? 10001 : 1 },
        ]}
      >
        <Text style={styles.fieldLabel}>시작 시간*</Text>
        <View style={styles.fieldPickerWrap}>
          <TimePicker
            value={startTime}
            onChange={setStartTime}
            onOpen={() => setTimeOpen(true)}
            onClose={() => setTimeOpen(false)}
            style={styles.timePicker}
            textStyle={styles.draftPickerText}
          />
        </View>
      </View>

      <View
        style={[
          styles.fieldRow,
          styles.pickerRowWrapper,
          { zIndex: timeOpen ? 5001 : 1 },
        ]}
      >
        <Text style={styles.fieldLabel}>종료 시간*</Text>
        <View style={styles.fieldPickerWrap}>
          <TimePicker
            value={endTime}
            onChange={setEndTime}
            onOpen={() => setTimeOpen(true)}
            onClose={() => setTimeOpen(false)}
            minTime={startTime}
            style={styles.timePicker}
            textStyle={styles.draftPickerText}
          />
        </View>
      </View>

      {showExpense ? (
        <>
          <View style={styles.expenseSectionHeader}>
            <View style={styles.expenseSectionDot} />
            <Text style={styles.expenseSectionText}>비용 내역</Text>
          </View>

          <View style={[styles.fieldRow, { zIndex: expenseOpen ? 10001 : 1 }]}>
            <Text style={styles.fieldLabel}>카테고리</Text>
            <CategoryPicker
              value={expCategory}
              onChange={setExpCategory}
              onOpen={() => setExpenseOpen(true)}
              onClose={() => setExpenseOpen(false)}
              style={styles.draftCategoryPicker}
              dropDownContainerStyle={styles.draftCategoryPickerList}
              listItemLabelStyle={styles.draftCategoryListItem}
              selectedItemContainerStyle={styles.draftCategorySelectedRow}
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>금액 (원)</Text>
            <Input
              variant="filled"
              containerStyle={{ flex: 1, height: 40 }}
              placeholder={PLACEHOLDERS.expense.amount}
              value={formatAmountWithCommas(expAmount)}
              onChangeText={text =>
                setExpAmount(normalizeAmountDigits(text.replace(/,/g, "")))
              }
              keyboardType="numeric"
              style={styles.fieldInput}
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>내용</Text>
            <Input
              variant="filled"
              containerStyle={{ flex: 1, height: 40 }}
              placeholder={PLACEHOLDERS.expense.descriptionForm}
              value={expDescription}
              onChangeText={setExpDescription}
              style={styles.fieldInput}
            />
          </View>
        </>
      ) : null}
    </View>
  );
});

const FlightDraftEditor = forwardRef<
  AiAnalyzeDraftEditorRef,
  { draft: Extract<AiDocumentItemDraft, { itemType: "flight" }> }
>(function FlightDraftEditor({ draft }, ref) {
  const base = draft.payload;
  const values = useMemo(() => {
    const raw = base.values as Record<string, unknown>;
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  }, [base.values]);

  const [reservationNumber, setReservationNumber] = useState("");
  const [passengerName, setPassengerName] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [bookingReference, setBookingReference] = useState("");
  const [segments, setSegments] = useState<SegmentForm[]>([]);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [segmentCal, setSegmentCal] = useState<{
    idx: number;
    field: "dep" | "arr";
  } | null>(null);

  const syncFromValues = useCallback((v: Record<string, unknown>) => {
    setReservationNumber(
      pickStr(v, [
        "reservationNumber",
        "reservation_number",
        "ReservationNumber",
      ]),
    );
    setPassengerName(
      pickStr(v, ["passengerName", "passenger_name", "PassengerName"]),
    );
    setTicketNumber(
      pickStr(v, ["ticketNumber", "ticket_number", "TicketNumber"]),
    );
    setBookingReference(
      pickStr(v, ["bookingReference", "booking_reference", "BookingReference"]),
    );
    setSegments(initFlightSegments(v));
    const ex = readExpenseNested(v);
    const amtSrc = ex || v;
    setExpenseAmount(
      normalizeAmountDigits(pickStr(amtSrc, ["amount", "Amount"])),
    );
  }, []);

  useEffect(() => {
    syncFromValues(values);
  }, [values, syncFromValues]);

  useImperativeHandle(
    ref,
    () => ({
      buildDraft: (): AiDocumentItemDraft => {
        const apiSegments: FlightSegmentBaseDto[] = segments.map(s => {
          const depIso = toIso(s.departure_date, s.departure_time);
          const arrIso = toIso(s.arrival_date, s.arrival_time);
          return {
            airline: s.airline || null,
            flightNumber: s.flight_number || null,
            departureAirport: s.departure_airport,
            arrivalAirport: s.arrival_airport,
            departureTime: depIso || new Date().toISOString(),
            arrivalTime: arrIso || new Date().toISOString(),
            seatClass: s.seat_class || null,
            seatNumber: s.seat_number || null,
            gate: s.gate || null,
            terminal: s.terminal || null,
          };
        });
        const exDate =
          segments[0]?.departure_date || dayjs().format("YYYY-MM-DD");
        const nextValues: Record<string, unknown> = {
          ...values,
          reservationNumber,
          passengerName,
          ticketNumber,
          bookingReference,
          segments: apiSegments,
          expense: {
            exDate,
            amount: Number.parseInt(expenseAmount, 10) || 0,
            currency: ExpenseCurrency.KRW,
            category: ExpenseCategory.FLIGHT,
            description: reservationNumber || null,
          },
        };
        return {
          itemType: "flight",
          payload: {
            ...base,
            values: nextValues as typeof base.values,
          },
        };
      },
    }),
    [
      base,
      values,
      reservationNumber,
      passengerName,
      ticketNumber,
      bookingReference,
      segments,
      expenseAmount,
    ],
  );

  return (
    <View style={styles.formSection}>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>예약번호(PNR)</Text>
        <Input
          variant="filled"
          containerStyle={{ flex: 1, height: 40 }}
          placeholder={PLACEHOLDERS.flight.reservationNumber}
          value={reservationNumber}
          onChangeText={setReservationNumber}
          style={styles.fieldInput}
          placeholderTextColor={colors.gray500}
        />
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>승객명</Text>
        <Input
          variant="filled"
          containerStyle={{ flex: 1, height: 40 }}
          placeholder={PLACEHOLDERS.flight.passengerName}
          value={passengerName}
          onChangeText={setPassengerName}
          style={styles.fieldInput}
          placeholderTextColor={colors.gray500}
        />
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>항공권번호</Text>
        <Input
          variant="filled"
          containerStyle={{ flex: 1, height: 40 }}
          placeholder={PLACEHOLDERS.flight.ticketNumber}
          value={ticketNumber}
          onChangeText={setTicketNumber}
          style={styles.fieldInput}
          placeholderTextColor={colors.gray500}
        />
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>여행사 예약번호</Text>
        <Input
          variant="filled"
          containerStyle={{ flex: 1, height: 40 }}
          placeholder={PLACEHOLDERS.flight.bookingReference}
          value={bookingReference}
          onChangeText={setBookingReference}
          style={styles.fieldInput}
          placeholderTextColor={colors.gray500}
        />
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>항공료 (원)</Text>
        <Input
          variant="filled"
          containerStyle={{ flex: 1, height: 40 }}
          placeholder={PLACEHOLDERS.expense.amount}
          value={formatAmountWithCommas(expenseAmount)}
          onChangeText={text =>
            setExpenseAmount(normalizeAmountDigits(text.replace(/,/g, "")))
          }
          keyboardType="numeric"
          style={styles.fieldInput}
          placeholderTextColor={colors.gray500}
        />
      </View>

      <View style={{ zIndex: 5000 }}>
        {segments.map((segment, idx) => (
          <View
            key={`seg-${idx}`}
            style={[
              styles.segmentContainer,
              { zIndex: (segments.length - idx) * 1000 },
            ]}
          >
            <View style={styles.segmentTitleRow}>
              <Text style={styles.segmentTitle}>구간{idx + 1}</Text>
            </View>

            <View style={styles.segmentContent}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>항공사</Text>
                <Input
                  variant="filled"
                  containerStyle={{ flex: 1, height: 40 }}
                  placeholder={PLACEHOLDERS.flight.airline}
                  value={segment.airline}
                  onChangeText={text => {
                    const next = [...segments];
                    next[idx] = { ...next[idx], airline: text };
                    setSegments(next);
                  }}
                  style={styles.segmentInput}
                  placeholderTextColor={colors.gray500}
                />
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>항공편명</Text>
                <Input
                  variant="filled"
                  containerStyle={{ flex: 1, height: 40 }}
                  placeholder={PLACEHOLDERS.flight.flightNumber}
                  value={segment.flight_number}
                  onChangeText={text => {
                    const next = [...segments];
                    next[idx] = { ...next[idx], flight_number: text };
                    setSegments(next);
                  }}
                  style={styles.segmentInput}
                  placeholderTextColor={colors.gray500}
                />
              </View>

              <View
                style={[
                  styles.fieldRow,
                  styles.airportPickerWrapper,
                  { zIndex: 2000 },
                ]}
              >
                <Text style={styles.fieldLabel}>출발 공항*</Text>
                <View style={styles.fieldPickerWrap}>
                  <AirportPicker
                    value={segment.departure_airport}
                    onChange={code => {
                      const next = [...segments];
                      next[idx] = { ...next[idx], departure_airport: code };
                      setSegments(next);
                    }}
                    placeholder={PLACEHOLDERS.flight.departureAirport}
                    containerStyle={{ flex: 1, height: 40 }}
                  />
                </View>
              </View>

              <View
                style={[
                  styles.fieldRow,
                  styles.airportPickerWrapper,
                  { zIndex: 1500 },
                ]}
              >
                <Text style={styles.fieldLabel}>도착 공항*</Text>
                <View style={styles.fieldPickerWrap}>
                  <AirportPicker
                    value={segment.arrival_airport}
                    onChange={code => {
                      const next = [...segments];
                      next[idx] = { ...next[idx], arrival_airport: code };
                      setSegments(next);
                    }}
                    placeholder={PLACEHOLDERS.flight.arrivalAirport}
                    containerStyle={{ flex: 1, height: 40 }}
                  />
                </View>
              </View>

              <View
                style={[
                  styles.fieldRow,
                  styles.datePickerWrapper,
                  {
                    zIndex:
                      segmentCal?.idx === idx && segmentCal.field === "dep"
                        ? 20000
                        : 1000,
                  },
                ]}
              >
                <Text style={styles.fieldLabel}>출발 일자*</Text>
                <View style={styles.fieldPickerWrap}>
                  <Pressable
                    style={styles.fieldDateTrigger}
                    onPress={() => setSegmentCal({ idx, field: "dep" })}
                  >
                    <Text style={styles.fieldDateText}>
                      {segment.departure_date
                        ? dayjs(segment.departure_date).format("YYYY.MM.DD")
                        : "기타"}
                    </Text>
                    <CalendarIcon width={14} height={14} />
                  </Pressable>
                  <DraftCalendar
                    visible={!!(segmentCal?.idx === idx && segmentCal.field === "dep")}
                    selectedDate={segment.departure_date}
                    onDayPress={day => {
                      const next = [...segments];
                      next[idx] = {
                        ...next[idx],
                        departure_date: day.dateString,
                      };
                      setSegments(next);
                      setSegmentCal(null);
                    }}
                    onClose={() => setSegmentCal(null)}
                    style={styles.fieldCalendarPopup}
                    minDate={
                      idx > 0 ? segments[idx - 1].arrival_date : undefined
                    }
                  />
                </View>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>출발 시간*</Text>
                <View style={styles.fieldPickerWrap}>
                  <TimePicker
                    value={segment.departure_time}
                    onChange={time => {
                      const next = [...segments];
                      next[idx] = { ...next[idx], departure_time: time };
                      setSegments(next);
                    }}
                    minTime={
                      idx > 0 &&
                      segment.departure_date === segments[idx - 1].arrival_date
                        ? segments[idx - 1].arrival_time
                        : undefined
                    }
                    style={styles.segmentTimePicker}
                    textStyle={styles.draftPickerText}
                  />
                </View>
              </View>

              <View
                style={[
                  styles.fieldRow,
                  styles.datePickerWrapper,
                  {
                    zIndex:
                      segmentCal?.idx === idx && segmentCal.field === "arr"
                        ? 20000
                        : 500,
                  },
                ]}
              >
                <Text style={styles.fieldLabel}>도착 일자*</Text>
                <View style={styles.fieldPickerWrap}>
                  <Pressable
                    style={styles.fieldDateTrigger}
                    onPress={() => setSegmentCal({ idx, field: "arr" })}
                  >
                    <Text style={styles.fieldDateText}>
                      {segment.arrival_date
                        ? dayjs(segment.arrival_date).format("YYYY.MM.DD")
                        : "기타"}
                    </Text>
                    <CalendarIcon width={14} height={14} />
                  </Pressable>
                  <DraftCalendar
                    visible={!!(segmentCal?.idx === idx && segmentCal.field === "arr")}
                    selectedDate={segment.arrival_date}
                    onDayPress={day => {
                      const next = [...segments];
                      next[idx] = {
                        ...next[idx],
                        arrival_date: day.dateString,
                      };
                      setSegments(next);
                      setSegmentCal(null);
                    }}
                    onClose={() => setSegmentCal(null)}
                    style={styles.fieldCalendarPopup}
                  />
                </View>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>도착 시간*</Text>
                <View style={styles.fieldPickerWrap}>
                  <TimePicker
                    value={segment.arrival_time}
                    onChange={time => {
                      const next = [...segments];
                      next[idx] = { ...next[idx], arrival_time: time };
                      setSegments(next);
                    }}
                    style={styles.segmentTimePicker}
                    textStyle={styles.draftPickerText}
                  />
                </View>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>좌석등급</Text>
                <Input
                  variant="filled"
                  containerStyle={{ flex: 1, height: 40 }}
                  value={segment.seat_class}
                  onChangeText={text => {
                    const next = [...segments];
                    next[idx] = { ...next[idx], seat_class: text };
                    setSegments(next);
                  }}
                  style={styles.segmentInput}
                  placeholderTextColor={colors.gray500}
                />
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>좌석번호</Text>
                <Input
                  variant="filled"
                  containerStyle={{ flex: 1, height: 40 }}
                  value={segment.seat_number}
                  onChangeText={text => {
                    const next = [...segments];
                    next[idx] = { ...next[idx], seat_number: text };
                    setSegments(next);
                  }}
                  style={styles.segmentInput}
                  placeholderTextColor={colors.gray500}
                />
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>게이트</Text>
                <Input
                  variant="filled"
                  containerStyle={{ flex: 1, height: 40 }}
                  value={segment.gate}
                  onChangeText={text => {
                    const next = [...segments];
                    next[idx] = { ...next[idx], gate: text };
                    setSegments(next);
                  }}
                  style={styles.segmentInput}
                  placeholderTextColor={colors.gray500}
                />
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>터미널</Text>
                <Input
                  variant="filled"
                  containerStyle={{ flex: 1, height: 40 }}
                  value={segment.terminal}
                  onChangeText={text => {
                    const next = [...segments];
                    next[idx] = { ...next[idx], terminal: text };
                    setSegments(next);
                  }}
                  style={styles.segmentInput}
                  placeholderTextColor={colors.gray500}
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

const AccommodationDraftEditor = forwardRef<
  AiAnalyzeDraftEditorRef,
  { draft: Extract<AiDocumentItemDraft, { itemType: "accommodation" }> }
>(function AccommodationDraftEditor({ draft }, ref) {
  const base = draft.payload;
  const values = useMemo(() => {
    const raw = base.values as Record<string, unknown>;
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  }, [base.values]);

  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [checkinDate, setCheckinDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [checkoutDate, setCheckoutDate] = useState(
    dayjs().add(1, "day").format("YYYY-MM-DD"),
  );
  const [checkinTime, setCheckinTime] = useState("15:00");
  const [checkoutTime, setCheckoutTime] = useState("11:00");
  const [expenseAmount, setExpenseAmount] = useState("");

  const [countryOpen, setCountryOpen] = useState(false);
  const [showCheckinCal, setShowCheckinCal] = useState(false);
  const [showCheckoutCal, setShowCheckoutCal] = useState(false);
  const [checkinTimeOpen, setCheckinTimeOpen] = useState(false);
  const [checkoutTimeOpen, setCheckoutTimeOpen] = useState(false);

  useEffect(() => {
    setName(pickStr(values, ["name", "Name"]));
    setPlace(pickStr(values, ["place", "Place"]));
    setCountry(pickStr(values, ["country", "Country"]));
    setCity(pickStr(values, ["city", "City"]));
    setDescription(pickStr(values, ["description", "Description"]));
    const ci =
      pickStr(values, ["checkinDate", "checkin_date", "CheckinDate"]) ||
      dayjs().format("YYYY-MM-DD");
    const co =
      pickStr(values, ["checkoutDate", "checkout_date", "CheckoutDate"]) ||
      dayjs(ci).add(1, "day").format("YYYY-MM-DD");
    setCheckinDate(ci);
    setCheckoutDate(co);
    setCheckinTime(
      normalizeHHmm(
        pickStr(values, ["checkinTime", "checkin_time", "CheckinTime"]) ||
          "15:00",
      ) || "15:00",
    );
    setCheckoutTime(
      normalizeHHmm(
        pickStr(values, ["checkoutTime", "checkout_time", "CheckoutTime"]) ||
          "11:00",
      ) || "11:00",
    );
    const ex = readExpenseNested(values);
    const amtSrc = ex || values;
    setExpenseAmount(
      normalizeAmountDigits(pickStr(amtSrc, ["amount", "Amount"])),
    );
  }, [values]);

  useImperativeHandle(
    ref,
    () => ({
      buildDraft: (): AiDocumentItemDraft => {
        const nextValues: Record<string, unknown> = {
          ...values,
          name,
          place,
          country,
          city,
          description,
          checkinDate,
          checkoutDate,
          checkinTime: `${checkinTime}:00`,
          checkoutTime: `${checkoutTime}:00`,
          expense: {
            exDate: checkinDate,
            amount: Number.parseInt(expenseAmount, 10) || 0,
            category: ExpenseCategory.ACCOMMODATION,
            currency: ExpenseCurrency.KRW,
            description: name,
          },
        };
        return {
          itemType: "accommodation",
          payload: {
            ...base,
            values: nextValues as typeof base.values,
          },
        };
      },
    }),
    [
      base,
      values,
      name,
      place,
      country,
      city,
      description,
      checkinDate,
      checkoutDate,
      checkinTime,
      checkoutTime,
      expenseAmount,
    ],
  );

  return (
    <View style={styles.formSection}>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>숙소명*</Text>
        <Input
          variant="filled"
          containerStyle={{ flex: 1, height: 40 }}
          placeholder={PLACEHOLDERS.accommodation.name}
          value={name}
          onChangeText={setName}
          style={styles.fieldInput}
          placeholderTextColor={colors.gray500}
        />
      </View>

      <View style={styles.fieldRowTop}>
        <Text style={[styles.fieldLabel, styles.fieldLabelTop]}>내용</Text>
        <Input
          variant="filled"
          containerStyle={{ flex: 1, height: 56 }}
          placeholder={PLACEHOLDERS.itinerary.descriptionForm}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={styles.fieldTextarea}
          placeholderTextColor={colors.gray500}
        />
      </View>

      <View
        style={[
          styles.fieldRow,
          styles.countryPickerWrapper,
          { zIndex: countryOpen ? 10000 : 1 },
        ]}
      >
        <Text style={styles.fieldLabel}>국가</Text>
        <View style={styles.fieldPickerWrap}>
          <CountryPicker
            value={country}
            onChange={name => { setCountry(name); setCity(""); }}
            placeholder={PLACEHOLDERS.picker.country}
            onOpen={() => setCountryOpen(true)}
            onClose={() => setCountryOpen(false)}
            style={styles.draftCountryPicker}
            useModal
          />
        </View>
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>도시</Text>
        <View style={{ flex: 1 }}>
          <CityPicker
            value={city}
            onChange={setCity}
            countryKo={country}
            placeholder={PLACEHOLDERS.accommodation.city}
            style={styles.draftCityPicker}
            useModal
          />
        </View>
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>장소</Text>
        <Input
          variant="filled"
          containerStyle={{ flex: 1, height: 40 }}
          placeholder={PLACEHOLDERS.accommodation.place}
          value={place}
          onChangeText={setPlace}
          style={styles.fieldInput}
          placeholderTextColor={colors.gray500}
        />
      </View>

      <View
        style={[
          styles.fieldRow,
          styles.datePickerWrapper,
          { zIndex: showCheckinCal ? 30000 : 1 },
        ]}
      >
        <Text style={styles.fieldLabel}>체크인 날짜</Text>
        <View style={styles.fieldPickerWrap}>
          <Pressable
            style={styles.fieldDateTrigger}
            onPress={() => setShowCheckinCal(true)}
          >
            <Text style={styles.fieldDateText}>
              {checkinDate ? dayjs(checkinDate).format("YYYY.MM.DD") : "기타"}
            </Text>
            <CalendarIcon width={14} height={14} />
          </Pressable>
          <DraftCalendar
            visible={showCheckinCal}
            selectedDate={checkinDate}
            onDayPress={day => {
              setCheckinDate(day.dateString);
              setShowCheckinCal(false);
            }}
            onClose={() => setShowCheckinCal(false)}
            style={styles.fieldCalendarPopup}
          />
        </View>
      </View>

      <View
        style={[
          styles.fieldRow,
          styles.pickerRowWrapper,
          { zIndex: checkinTimeOpen ? 20002 : 1 },
        ]}
      >
        <Text style={styles.fieldLabel}>체크인 시간</Text>
        <View style={styles.fieldPickerWrap}>
          <TimePicker
            value={checkinTime}
            onChange={setCheckinTime}
            onOpen={() => {
              setCheckinTimeOpen(true);
              if (checkoutTimeOpen) setCheckoutTimeOpen(false);
            }}
            onClose={() => setCheckinTimeOpen(false)}
            style={styles.timePicker}
            textStyle={styles.draftPickerText}
          />
        </View>
      </View>

      <View
        style={[
          styles.fieldRow,
          styles.datePickerWrapper,
          { zIndex: showCheckoutCal ? 30000 : 1 },
        ]}
      >
        <Text style={styles.fieldLabel}>체크아웃 날짜</Text>
        <View style={styles.fieldPickerWrap}>
          <Pressable
            style={styles.fieldDateTrigger}
            onPress={() => setShowCheckoutCal(true)}
          >
            <Text style={styles.fieldDateText}>
              {checkoutDate ? dayjs(checkoutDate).format("YYYY.MM.DD") : "기타"}
            </Text>
            <CalendarIcon width={14} height={14} />
          </Pressable>
          <DraftCalendar
            visible={showCheckoutCal}
            selectedDate={checkoutDate}
            onDayPress={day => {
              setCheckoutDate(day.dateString);
              setShowCheckoutCal(false);
            }}
            onClose={() => setShowCheckoutCal(false)}
            style={styles.fieldCalendarPopup}
            minDate={checkinDate}
          />
        </View>
      </View>

      <View
        style={[
          styles.fieldRow,
          styles.pickerRowWrapper,
          { zIndex: checkoutTimeOpen ? 20001 : 1 },
        ]}
      >
        <Text style={styles.fieldLabel}>체크아웃 시간</Text>
        <View style={styles.fieldPickerWrap}>
          <TimePicker
            value={checkoutTime}
            onChange={setCheckoutTime}
            onOpen={() => {
              setCheckoutTimeOpen(true);
              if (checkinTimeOpen) setCheckinTimeOpen(false);
            }}
            onClose={() => setCheckoutTimeOpen(false)}
            style={styles.timePicker}
            textStyle={styles.draftPickerText}
          />
        </View>
      </View>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>숙박료 (원)</Text>
        <Input
          variant="filled"
          containerStyle={{ flex: 1, height: 40 }}
          placeholder={PLACEHOLDERS.expense.amount}
          value={formatAmountWithCommas(expenseAmount)}
          onChangeText={text =>
            setExpenseAmount(normalizeAmountDigits(text.replace(/,/g, "")))
          }
          keyboardType="numeric"
          style={styles.fieldInput}
          placeholderTextColor={colors.gray500}
        />
      </View>
    </View>
  );
});

const ExpenseDraftEditor = forwardRef<
  AiAnalyzeDraftEditorRef,
  { draft: Extract<AiDocumentItemDraft, { itemType: "expense" }> }
>(function ExpenseDraftEditor({ draft }, ref) {
  const base = draft.payload;
  const values = useMemo(() => {
    const raw = base.values as Record<string, unknown>;
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  }, [base.values]);

  const [category, setCategory] = useState(ExpenseCategory.ETC);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [exDate, setExDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [catOpen, setCatOpen] = useState(false);
  const [showCal, setShowCal] = useState(false);

  useEffect(() => {
    setCategory(
      coerceExpenseCategory(pickStr(values, ["category", "Category"]) || "etc"),
    );
    setAmount(normalizeAmountDigits(pickStr(values, ["amount", "Amount"])));
    setDescription(pickStr(values, ["description", "Description"]));
    setExDate(
      pickStr(values, ["exDate", "ex_date", "ExDate"]) ||
        dayjs().format("YYYY-MM-DD"),
    );
  }, [values]);

  useImperativeHandle(
    ref,
    () => ({
      buildDraft: (): AiDocumentItemDraft => ({
        itemType: "expense",
        payload: {
          ...base,
          values: {
            ...values,
            category,
            amount: Number.parseInt(amount, 10) || 0,
            currency: ExpenseCurrency.KRW,
            description,
            exDate,
          } as typeof base.values,
        },
      }),
    }),
    [base, values, category, amount, description, exDate],
  );

  return (
    <View style={styles.formSection}>
      <View style={[styles.fieldRow, { zIndex: catOpen ? 10001 : 1 }]}>
        <Text style={styles.fieldLabel}>카테고리</Text>
        <CategoryPicker
          value={category}
          onChange={setCategory}
          onOpen={() => setCatOpen(true)}
          onClose={() => setCatOpen(false)}
          style={styles.draftCategoryPicker}
          dropDownContainerStyle={styles.draftCategoryPickerList}
          listItemLabelStyle={styles.draftCategoryListItem}
          selectedItemContainerStyle={styles.draftCategorySelectedRow}
        />
      </View>
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>금액 (원)</Text>
        <Input
          variant="filled"
          containerStyle={{ flex: 1, height: 40 }}
          value={formatAmountWithCommas(amount)}
          onChangeText={text =>
            setAmount(normalizeAmountDigits(text.replace(/,/g, "")))
          }
          keyboardType="numeric"
          style={styles.fieldInput}
          placeholderTextColor={colors.gray500}
        />
      </View>
      <View style={styles.fieldRowTop}>
        <Text style={[styles.fieldLabel, styles.fieldLabelTop]}>내용</Text>
        <Input
          variant="filled"
          containerStyle={{ flex: 1, height: 56 }}
          value={description}
          onChangeText={setDescription}
          style={styles.fieldTextarea}
          multiline
          placeholderTextColor={colors.gray500}
        />
      </View>
      <View
        style={[
          styles.fieldRow,
          styles.datePickerWrapper,
          { zIndex: showCal ? 20000 : 1 },
        ]}
      >
        <Text style={styles.fieldLabel}>지출날짜</Text>
        <View style={styles.fieldPickerWrap}>
          <Pressable
            style={styles.fieldDateTrigger}
            onPress={() => setShowCal(true)}
          >
            <Text style={styles.fieldDateText}>
              {dayjs(exDate).format("YYYY년 M월 D일")}
            </Text>
            <CalendarIcon width={14} height={14} />
          </Pressable>
          <DraftCalendar
            visible={showCal}
            selectedDate={exDate}
            onDayPress={day => {
              setExDate(day.dateString);
              setShowCal(false);
            }}
            onClose={() => setShowCal(false)}
            style={styles.fieldCalendarPopup}
          />
        </View>
      </View>
    </View>
  );
});

export const AiAnalyzeResultBody = forwardRef<
  AiAnalyzeDraftEditorRef,
  { draft: AiDocumentItemDraft }
>(function AiAnalyzeResultBody({ draft }, ref) {
  const itineraryRef = React.useRef<AiAnalyzeDraftEditorRef>(null);
  const flightRef = React.useRef<AiAnalyzeDraftEditorRef>(null);
  const accommodationRef = React.useRef<AiAnalyzeDraftEditorRef>(null);
  const expenseRef = React.useRef<AiAnalyzeDraftEditorRef>(null);

  useImperativeHandle(
    ref,
    () => ({
      buildDraft: () => {
        switch (draft.itemType) {
          case "itinerary":
            return itineraryRef.current?.buildDraft() ?? draft;
          case "flight":
            return flightRef.current?.buildDraft() ?? draft;
          case "accommodation":
            return accommodationRef.current?.buildDraft() ?? draft;
          case "expense":
            return expenseRef.current?.buildDraft() ?? draft;
          default:
            return draft;
        }
      },
    }),
    [draft],
  );

  switch (draft.itemType) {
    case "itinerary":
      return <ItineraryDraftEditor ref={itineraryRef} draft={draft} />;
    case "flight":
      return <FlightDraftEditor ref={flightRef} draft={draft} />;
    case "accommodation":
      return <AccommodationDraftEditor ref={accommodationRef} draft={draft} />;
    case "expense":
      return <ExpenseDraftEditor ref={expenseRef} draft={draft} />;
    default:
      return (
        <Text style={styles.fallbackText}>지원하지 않는 항목 유형입니다.</Text>
      );
  }
});

const styles = StyleSheet.create({
  formSection: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    overflow: "visible",
    position: "relative",
  },
  calendarPopup: {
    position: "absolute",
    top: 70,
    left: 0,
    zIndex: 20000,
  },
  datePickerWrapper: {
    position: "relative",
    overflow: "visible",
  },
  pickerRowWrapper: {
    overflow: "visible",
    position: "relative",
  },
  countryPickerWrapper: {
    overflow: "visible",
    position: "relative",
  },
  segmentContainer: {
    borderColor: colors.gray400,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.lg,
    backgroundColor: colors.white,
  },
  segmentTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  segmentTitle: {
    ...textStyles.h6,
    color: colors.black,
  },
  segmentContent: {
    gap: 10,
  },
  segmentInput: {
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...textStyles.body5,
    color: colors.gray900,
    backgroundColor: colors.white,
    height: 40,
  },
  segmentDateInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.white,
    height: 40,
  },
  segmentDateTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  segmentDateText: {
    ...textStyles.body4,
    color: colors.gray800,
  },
  segmentPlaceholderText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  segmentTimePicker: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    height: 40,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  airportPickerWrapper: {
    overflow: "visible",
    position: "relative",
  },
  draftCategoryPicker: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    height: 40,
    backgroundColor: colors.white,
  },
  draftCategoryPickerList: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    borderTopWidth: 0,
  },
  draftCategoryListItem: {
    ...textStyles.body4,
    color: colors.gray800,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  draftCategorySelectedRow: {
    backgroundColor: colors.white,
  },
  timePicker: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    height: 40,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  draftPickerText: {
    ...textStyles.body5,
    color: colors.gray900,
  },
  draftCountryPicker: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    height: 40,
    maxHeight: 40,
    paddingTop: 10,
    paddingBottom: 10,
  },
  draftCityPicker: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    height: 40,
    paddingTop: 10,
    paddingBottom: 10,
  },
  fallbackText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "visible",
    position: "relative",
  },
  fieldRowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  fieldLabel: {
    width: 76,
    flexShrink: 0,
    ...textStyles.h8,
    color: colors.gray700,
  },
  fieldLabelTop: {
    marginTop: 9,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...textStyles.body5,
    color: colors.gray900,
    backgroundColor: colors.white,
    height: 40,
  },
  fieldTextarea: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...textStyles.body5,
    color: colors.gray900,
    backgroundColor: colors.white,
    height: 56,
    textAlignVertical: "top",
  },
  fieldPickerWrap: {
    flex: 1,
    overflow: "visible",
    position: "relative",
  },
  fieldDateTrigger: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.white,
    height: 40,
  },
  fieldDateText: {
    ...textStyles.body5,
    color: colors.gray900,
  },
  fieldCalendarPopup: {
    position: "absolute",
    top: 38,
    left: 0,
    zIndex: 20000,
  },
  expenseSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  expenseSectionDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgb(240, 138, 75)",
    flexShrink: 0,
  },
  expenseSectionText: {
    ...textStyles.h8,
    color: "rgb(184, 83, 26)",
  },
});
