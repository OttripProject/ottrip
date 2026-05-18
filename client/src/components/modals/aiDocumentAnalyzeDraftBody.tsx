import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import Input from '@/ui/components/input/Input';
import {
  TimePicker,
  CountryPicker,
  CategoryPicker,
  AirportPicker,
} from '@/ui/components/pickers';
import BaseCalendar from '@/components/popup/calendar/BaseCalendar';
import CalendarIcon from '../../../assets/calender.svg';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens/radii';
import type {
  AiDocumentItemDraft,
  FlightSegmentBaseDto,
} from '@/types/api';
import { ExpenseCategory, ExpenseCurrency, currencyLabels } from '@/types/expense';

const ORANGE = '#E07000';
const ORANGE_BG = '#FFF1E5';

export function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const raw = obj[k];
    if (raw === undefined || raw === null) continue;
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  }
  return '';
}

export type AiAnalyzeDraftEditorRef = {
  buildDraft: () => AiDocumentItemDraft;
};

function readExpenseNested(
  values: Record<string, unknown>,
): Record<string, unknown> | null {
  const e = values.expense ?? values.Expense;
  if (e && typeof e === 'object' && !Array.isArray(e)) {
    return e as Record<string, unknown>;
  }
  return null;
}

function normalizeHHmm(raw: string): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = dayjs(s);
    if (d.isValid()) return d.format('HH:mm');
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
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const integerPart = raw.split('.')[0];
  return integerPart.replace(/[^0-9]/g, '');
}

function formatAmountWithCommas(digits: string): string {
  if (!digits) return '';
  const normalized = digits.replace(/^0+(?=\d)/, '');
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** segments: 배열 | 단일 객체 | JSON 문자열 */
function coerceFlightSegments(segRaw: unknown): Record<string, unknown>[] {
  let raw: unknown = segRaw;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (t.startsWith('[') || t.startsWith('{')) {
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
        item != null && typeof item === 'object' && !Array.isArray(item),
    );
  }
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
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
  const depRaw = pickStr(seg, ['departure_time', 'departureTime', 'DepartureTime']);
  const arrRaw = pickStr(seg, ['arrival_time', 'arrivalTime', 'ArrivalTime']);
  let depD = dayjs(depRaw);
  let arrD = dayjs(arrRaw);
  if (!depD.isValid()) {
    const dd = pickStr(seg, ['departure_date', 'departureDate', 'DepartureDate']);
    const tt =
      normalizeHHmm(
        pickStr(seg, ['departure_time_local', 'departureTimeLocal']) || '09:00',
      ) || '09:00';
    depD = dd
      ? dayjs(`${dd}T${tt.length === 5 ? `${tt}:00` : tt}`)
      : dayjs();
  }
  if (!arrD.isValid()) {
    const ad = pickStr(seg, ['arrival_date', 'arrivalDate', 'ArrivalDate']);
    const at =
      normalizeHHmm(
        pickStr(seg, ['arrival_time_local', 'arrivalTimeLocal']) || '10:00',
      ) || '10:00';
    arrD = ad
      ? dayjs(`${ad}T${at.length === 5 ? `${at}:00` : at}`)
      : depD.add(1, 'hour');
  }
  return {
    airline: pickStr(seg, ['airline', 'Airline']),
    flight_number: pickStr(seg, [
      'flight_number',
      'flightNumber',
      'FlightNumber',
    ]),
    departure_airport: pickStr(seg, [
      'departure_airport',
      'departureAirport',
      'DepartureAirport',
    ]),
    arrival_airport: pickStr(seg, [
      'arrival_airport',
      'arrivalAirport',
      'ArrivalAirport',
    ]),
    departure_date: depD.format('YYYY-MM-DD'),
    departure_time: depD.format('HH:mm'),
    arrival_date: arrD.format('YYYY-MM-DD'),
    arrival_time: arrD.format('HH:mm'),
    seat_class: pickStr(seg, ['seat_class', 'seatClass', 'SeatClass']),
    seat_number: pickStr(seg, ['seat_number', 'seatNumber', 'SeatNumber']),
    gate: pickStr(seg, ['gate', 'Gate']),
    terminal: pickStr(seg, ['terminal', 'Terminal']),
  };
}

function initFlightSegments(values: Record<string, unknown>): SegmentForm[] {
  const segRaw = values.segments ?? values.Segments;
  const segs = coerceFlightSegments(segRaw);
  if (segs.length === 0) {
    const planDate = dayjs().format('YYYY-MM-DD');
    return [
      {
        airline: '',
        flight_number: '',
        departure_airport: '',
        arrival_airport: '',
        departure_date: planDate,
        departure_time: '',
        arrival_date: planDate,
        arrival_time: '',
        seat_class: '',
        seat_number: '',
        gate: '',
        terminal: '',
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
  { draft: Extract<AiDocumentItemDraft, { itemType: 'itinerary' }> }
>(function ItineraryDraftEditor({ draft }, ref) {
  const base = draft.payload;
  const values = useMemo(() => {
    const raw = base.values as Record<string, unknown>;
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  }, [base.values]);

  const [title, setTitle] = useState(() => pickStr(values, ['title', 'Title']));
  const [description, setDescription] = useState(() =>
    pickStr(values, ['description', 'Description']),
  );
  const [country, setCountry] = useState(() =>
    pickStr(values, ['country', 'Country']),
  );
  const [city, setCity] = useState(() => pickStr(values, ['city', 'City']));
  const [location, setLocation] = useState(() =>
    pickStr(values, ['location', 'Location']),
  );
  const [itineraryDate, setItineraryDate] = useState(
    () =>
      pickStr(values, [
        'itineraryDate',
        'itinerary_date',
        'ItineraryDate',
      ]) || dayjs().format('YYYY-MM-DD'),
  );
  const [startTime, setStartTime] = useState(
    () =>
      normalizeHHmm(
        pickStr(values, ['startTime', 'start_time', 'StartTime']) || '09:00',
      ) || '09:00',
  );
  const [endTime, setEndTime] = useState(
    () =>
      normalizeHHmm(
        pickStr(values, ['endTime', 'end_time', 'EndTime']) || '10:00',
      ) || '10:00',
  );

  const expNested = readExpenseNested(values);
  const initialExpense =
    expNested ||
    (pickStr(values, ['amount', 'Amount']).length > 0
      ? values
      : null);

  const [showExpense, setShowExpense] = useState(
    () =>
      !!(
        expNested ||
        pickStr(values, ['category', 'Category']).length > 0 ||
        pickStr(values, ['amount', 'Amount']).length > 0
      ),
  );
  const [expCategory, setExpCategory] = useState<ExpenseCategory>(() =>
    initialExpense
      ? coerceExpenseCategory(
          pickStr(initialExpense, ['category', 'Category']) || 'etc',
        )
      : ExpenseCategory.ETC,
  );
  const [expAmount, setExpAmount] = useState(() =>
    normalizeAmountDigits(
      initialExpense
        ? pickStr(initialExpense, ['amount', 'Amount'])
        : '',
    ),
  );
  const [expDescription, setExpDescription] = useState(() =>
    initialExpense
      ? pickStr(initialExpense, ['description', 'Description'])
      : '',
  );

  const [countryOpen, setCountryOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    setTitle(pickStr(values, ['title', 'Title']));
    setDescription(pickStr(values, ['description', 'Description']));
    setCountry(pickStr(values, ['country', 'Country']));
    setCity(pickStr(values, ['city', 'City']));
    setLocation(pickStr(values, ['location', 'Location']));
    setItineraryDate(
      pickStr(values, [
        'itineraryDate',
        'itinerary_date',
        'ItineraryDate',
      ]) || dayjs().format('YYYY-MM-DD'),
    );
    setStartTime(
      normalizeHHmm(
        pickStr(values, ['startTime', 'start_time', 'StartTime']) || '09:00',
      ) || '09:00',
    );
    setEndTime(
      normalizeHHmm(
        pickStr(values, ['endTime', 'end_time', 'EndTime']) || '10:00',
      ) || '10:00',
    );
    const ex = readExpenseNested(values);
    const hasEx =
      !!ex ||
      pickStr(values, ['category', 'Category']).length > 0 ||
      pickStr(values, ['amount', 'Amount']).length > 0;
    setShowExpense(hasEx);
    const src = ex || values;
    setExpCategory(
      coerceExpenseCategory(pickStr(src, ['category', 'Category']) || 'etc'),
    );
    setExpAmount(normalizeAmountDigits(pickStr(src, ['amount', 'Amount'])));
    setExpDescription(pickStr(src, ['description', 'Description']));
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
        if (showExpense && (expAmount.length > 0 || expDescription.length > 0)) {
          nextValues.expense = {
            category: expCategory,
            amount: parseInt(expAmount, 10) || 0,
            description: expDescription,
            exDate: itineraryDate,
            currency: ExpenseCurrency.KRW,
          };
        } else {
          delete nextValues.expense;
        }
        return {
          itemType: 'itinerary',
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
      <View style={styles.inputGroup}>
        <Text style={styles.label}>제목*</Text>
        <Input
          variant="filled"
          placeholder={PLACEHOLDERS.itinerary.titleForm}
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholderTextColor={colors.gray600}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>내용</Text>
        <Input
          variant="filled"
          placeholder={PLACEHOLDERS.itinerary.descriptionForm}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={styles.textArea}
          placeholderTextColor={colors.gray600}
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
            value={country}
            onChange={setCountry}
            onOpen={() => setCountryOpen(true)}
            onClose={() => setCountryOpen(false)}
            placeholder={PLACEHOLDERS.itinerary.countryForm}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>도시</Text>
          <Input
            variant="filled"
            placeholder={PLACEHOLDERS.itinerary.cityForm}
            value={city}
            onChangeText={setCity}
            style={styles.input}
            placeholderTextColor={colors.gray600}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>장소</Text>
        <Input
          variant="filled"
          placeholder="장소를 입력하세요."
          value={location}
          onChangeText={setLocation}
          style={styles.input}
          placeholderTextColor={colors.gray600}
        />
      </View>

      <View
        style={[
          styles.inputGroup,
          styles.datePickerWrapper,
          { zIndex: showDatePicker ? 20000 : 1 },
        ]}
      >
        <Text style={styles.label}>날짜*</Text>
        <Pressable
          style={styles.dateInput}
          onPress={() => setShowDatePicker(!showDatePicker)}
        >
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateText}>
              {dayjs(itineraryDate).format('YYYY년 M월 D일')}
            </Text>
            <View style={styles.iconWrapper}>
              <CalendarIcon width={16} height={16} />
            </View>
          </View>
        </Pressable>
        <BaseCalendar
          visible={showDatePicker}
          selectedDate={itineraryDate}
          onDayPress={(day) => {
            setItineraryDate(day.dateString);
            setShowDatePicker(false);
          }}
          onClose={() => setShowDatePicker(false)}
          style={styles.calendarPopup}
          hideButtons
          autoCloseOnSelect
        />
      </View>

      <View style={[styles.row, styles.pickerRowWrapper, { zIndex: timeOpen ? 10001 : 1 }]}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>시작 시간*</Text>
          <TimePicker
            value={startTime}
            onChange={setStartTime}
            onOpen={() => setTimeOpen(true)}
            onClose={() => setTimeOpen(false)}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>종료 시간*</Text>
          <TimePicker
            value={endTime}
            onChange={setEndTime}
            onOpen={() => setTimeOpen(true)}
            onClose={() => setTimeOpen(false)}
            minTime={startTime}
          />
        </View>
      </View>

      {showExpense ? (
        <>
          <View style={[styles.pillOrange, styles.pillOrangeSpaced]}>
            <View style={styles.pillDotOrange} />
            <Text style={styles.pillOrangeText}>비용 내역</Text>
          </View>
          <View style={[styles.row, { zIndex: expenseOpen ? 10001 : 1 }]}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>카테고리</Text>
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
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>원(KRW)</Text>
              <View style={styles.currencyDisplay}>
                <Text style={styles.currencyText}>
                  {currencyLabels[ExpenseCurrency.KRW]}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>금액*</Text>
            <Input
              variant="filled"
              placeholder={PLACEHOLDERS.expense.amount}
              value={formatAmountWithCommas(expAmount)}
              onChangeText={(text) =>
                setExpAmount(normalizeAmountDigits(text.replace(/,/g, '')))
              }
              keyboardType="numeric"
              style={styles.expenseInput}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>내용</Text>
            <Input
              variant="filled"
              placeholder={PLACEHOLDERS.expense.descriptionForm}
              value={expDescription}
              onChangeText={setExpDescription}
              style={styles.expenseInput}
            />
          </View>
        </>
      ) : null}
    </View>
  );
});

const FlightDraftEditor = forwardRef<
  AiAnalyzeDraftEditorRef,
  { draft: Extract<AiDocumentItemDraft, { itemType: 'flight' }> }
>(function FlightDraftEditor({ draft }, ref) {
  const base = draft.payload;
  const values = useMemo(() => {
    const raw = base.values as Record<string, unknown>;
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  }, [base.values]);

  const [reservationNumber, setReservationNumber] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [segments, setSegments] = useState<SegmentForm[]>([]);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [segmentCal, setSegmentCal] = useState<{
    idx: number;
    field: 'dep' | 'arr';
  } | null>(null);

  const syncFromValues = useCallback((v: Record<string, unknown>) => {
    setReservationNumber(
      pickStr(v, [
        'reservationNumber',
        'reservation_number',
        'ReservationNumber',
      ]),
    );
    setPassengerName(
      pickStr(v, ['passengerName', 'passenger_name', 'PassengerName']),
    );
    setTicketNumber(
      pickStr(v, ['ticketNumber', 'ticket_number', 'TicketNumber']),
    );
    setBookingReference(
      pickStr(v, [
        'bookingReference',
        'booking_reference',
        'BookingReference',
      ]),
    );
    setSegments(initFlightSegments(v));
    const ex = readExpenseNested(v);
    const amtSrc = ex || v;
    setExpenseAmount(
      normalizeAmountDigits(pickStr(amtSrc, ['amount', 'Amount'])),
    );
  }, []);

  useEffect(() => {
    syncFromValues(values);
  }, [values, syncFromValues]);

  useImperativeHandle(
    ref,
    () => ({
      buildDraft: (): AiDocumentItemDraft => {
        const apiSegments: FlightSegmentBaseDto[] = segments.map((s) => {
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
          segments[0]?.departure_date ||
          dayjs().format('YYYY-MM-DD');
        const nextValues: Record<string, unknown> = {
          ...values,
          reservationNumber,
          passengerName,
          ticketNumber,
          bookingReference,
          segments: apiSegments,
          expense: {
            exDate,
            amount: parseInt(expenseAmount, 10) || 0,
            currency: ExpenseCurrency.KRW,
            category: ExpenseCategory.FLIGHT,
            description: reservationNumber || null,
          },
        };
        return {
          itemType: 'flight',
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
      <View style={[styles.row, { gap: spacing.sm }]}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>예약번호 (PNR)</Text>
          <Input
            variant="filled"
            placeholder={PLACEHOLDERS.flight.reservationNumber}
            value={reservationNumber}
            onChangeText={setReservationNumber}
            style={styles.input}
            placeholderTextColor={colors.gray600}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>승객명</Text>
          <Input
            variant="filled"
            placeholder={PLACEHOLDERS.flight.passengerName}
            value={passengerName}
            onChangeText={setPassengerName}
            style={styles.input}
            placeholderTextColor={colors.gray600}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>항공권 번호</Text>
        <Input
          variant="filled"
          placeholder={PLACEHOLDERS.flight.ticketNumber}
          value={ticketNumber}
          onChangeText={setTicketNumber}
          style={styles.input}
          placeholderTextColor={colors.gray600}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>예약번호 (여행사 예약 번호)</Text>
        <Input
          variant="filled"
          placeholder={PLACEHOLDERS.flight.bookingReference}
          value={bookingReference}
          onChangeText={setBookingReference}
          style={styles.input}
          placeholderTextColor={colors.gray600}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>항공료</Text>
        <View style={styles.amountInputWrapper}>
          <Input
            variant="filled"
            placeholder={PLACEHOLDERS.expense.amount}
            value={formatAmountWithCommas(expenseAmount)}
            onChangeText={(text) =>
              setExpenseAmount(normalizeAmountDigits(text.replace(/,/g, '')))
            }
            keyboardType="numeric"
            style={[styles.input, styles.amountInputPadding]}
            placeholderTextColor={colors.gray600}
          />
          <Text style={styles.amountSuffix} pointerEvents="none">
            {currencyLabels[ExpenseCurrency.KRW]}
          </Text>
        </View>
      </View>

      <View style={[styles.inputGroup, { zIndex: 5000 }]}>
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
              <View style={[styles.row, { gap: spacing.sm, zIndex: 3000 }]}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>항공사</Text>
                  <Input
                    variant="filled"
                    placeholder={PLACEHOLDERS.flight.airline}
                    value={segment.airline}
                    onChangeText={(text) => {
                      const next = [...segments];
                      next[idx] = { ...next[idx], airline: text };
                      setSegments(next);
                    }}
                    style={styles.segmentInput}
                    placeholderTextColor={colors.gray600}
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>항공편명</Text>
                  <Input
                    variant="filled"
                    placeholder={PLACEHOLDERS.flight.flightNumber}
                    value={segment.flight_number}
                    onChangeText={(text) => {
                      const next = [...segments];
                      next[idx] = { ...next[idx], flight_number: text };
                      setSegments(next);
                    }}
                    style={styles.segmentInput}
                    placeholderTextColor={colors.gray600}
                  />
                </View>
              </View>

              <View style={[styles.row, { gap: spacing.sm, zIndex: 2000 }]}>
                <View
                  style={[
                    styles.inputGroup,
                    styles.halfWidth,
                    styles.airportPickerWrapper,
                  ]}
                >
                  <Text style={styles.label}>출발 공항*</Text>
                  <AirportPicker
                    value={segment.departure_airport}
                    onChange={(code) => {
                      const next = [...segments];
                      next[idx] = { ...next[idx], departure_airport: code };
                      setSegments(next);
                    }}
                    placeholder={PLACEHOLDERS.flight.departureAirport}
                    style={styles.draftAirportPicker}
                    dropDownContainerStyle={styles.draftAirportPickerList}
                    searchTextInputStyle={styles.draftAirportPickerSearch}
                  />
                </View>
                <View
                  style={[
                    styles.inputGroup,
                    styles.halfWidth,
                    styles.airportPickerWrapper,
                  ]}
                >
                  <Text style={styles.label}>도착 공항*</Text>
                  <AirportPicker
                    value={segment.arrival_airport}
                    onChange={(code) => {
                      const next = [...segments];
                      next[idx] = { ...next[idx], arrival_airport: code };
                      setSegments(next);
                    }}
                    placeholder={PLACEHOLDERS.flight.arrivalAirport}
                    style={styles.draftAirportPicker}
                    dropDownContainerStyle={styles.draftAirportPickerList}
                    searchTextInputStyle={styles.draftAirportPickerSearch}
                  />
                </View>
              </View>

              <View style={[styles.row, { gap: spacing.sm, zIndex: 1000 }]}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>출발 일자*</Text>
                  <Pressable
                    style={styles.segmentDateInput}
                    onPress={() => setSegmentCal({ idx, field: 'dep' })}
                  >
                    <View style={styles.segmentDateTextContainer}>
                      <Text
                        style={
                          segment.departure_date
                            ? styles.segmentDateText
                            : styles.segmentPlaceholderText
                        }
                      >
                        {segment.departure_date
                          ? dayjs(segment.departure_date).format('YYYY.MM.DD')
                          : '기타'}
                      </Text>
                      <View style={styles.iconWrapper}>
                        <CalendarIcon width={16} height={16} />
                      </View>
                    </View>
                  </Pressable>
                  {segmentCal?.idx === idx && segmentCal.field === 'dep' ? (
                    <BaseCalendar
                      visible
                      selectedDate={segment.departure_date}
                      onDayPress={(day) => {
                        const next = [...segments];
                        next[idx] = {
                          ...next[idx],
                          departure_date: day.dateString,
                        };
                        setSegments(next);
                        setSegmentCal(null);
                      }}
                      onClose={() => setSegmentCal(null)}
                      style={styles.calendarPopup}
                      minDate={
                        idx > 0
                          ? segments[idx - 1].arrival_date
                          : undefined
                      }
                      hideButtons
                      autoCloseOnSelect
                    />
                  ) : null}
                </View>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>출발 시간*</Text>
                  <TimePicker
                    value={segment.departure_time}
                    onChange={(time) => {
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
                  />
                </View>
              </View>

              <View style={[styles.row, { gap: spacing.sm, zIndex: 500 }]}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>도착 일자*</Text>
                  <Pressable
                    style={styles.segmentDateInput}
                    onPress={() => setSegmentCal({ idx, field: 'arr' })}
                  >
                    <View style={styles.segmentDateTextContainer}>
                      <Text
                        style={
                          segment.arrival_date
                            ? styles.segmentDateText
                            : styles.segmentPlaceholderText
                        }
                      >
                        {segment.arrival_date
                          ? dayjs(segment.arrival_date).format('YYYY.MM.DD')
                          : '기타'}
                      </Text>
                      <View style={styles.iconWrapper}>
                        <CalendarIcon width={16} height={16} />
                      </View>
                    </View>
                  </Pressable>
                  {segmentCal?.idx === idx && segmentCal.field === 'arr' ? (
                    <BaseCalendar
                      visible
                      selectedDate={segment.arrival_date}
                      onDayPress={(day) => {
                        const next = [...segments];
                        next[idx] = {
                          ...next[idx],
                          arrival_date: day.dateString,
                        };
                        setSegments(next);
                        setSegmentCal(null);
                      }}
                      onClose={() => setSegmentCal(null)}
                      style={styles.calendarPopup}
                      hideButtons
                      autoCloseOnSelect
                    />
                  ) : null}
                </View>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>도착 시간*</Text>
                  <TimePicker
                    value={segment.arrival_time}
                    onChange={(time) => {
                      const next = [...segments];
                      next[idx] = { ...next[idx], arrival_time: time };
                      setSegments(next);
                    }}
                    style={styles.segmentTimePicker}
                  />
                </View>
              </View>

              <View style={[styles.row, { gap: spacing.sm }]}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>좌석등급</Text>
                  <Input
                    variant="filled"
                    value={segment.seat_class}
                    onChangeText={(text) => {
                      const next = [...segments];
                      next[idx] = { ...next[idx], seat_class: text };
                      setSegments(next);
                    }}
                    style={styles.segmentInput}
                    placeholderTextColor={colors.gray600}
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>좌석번호</Text>
                  <Input
                    variant="filled"
                    value={segment.seat_number}
                    onChangeText={(text) => {
                      const next = [...segments];
                      next[idx] = { ...next[idx], seat_number: text };
                      setSegments(next);
                    }}
                    style={styles.segmentInput}
                    placeholderTextColor={colors.gray600}
                  />
                </View>
              </View>

              <View style={[styles.row, { gap: spacing.sm }]}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>게이트</Text>
                  <Input
                    variant="filled"
                    value={segment.gate}
                    onChangeText={(text) => {
                      const next = [...segments];
                      next[idx] = { ...next[idx], gate: text };
                      setSegments(next);
                    }}
                    style={styles.segmentInput}
                    placeholderTextColor={colors.gray600}
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>터미널</Text>
                  <Input
                    variant="filled"
                    value={segment.terminal}
                    onChangeText={(text) => {
                      const next = [...segments];
                      next[idx] = { ...next[idx], terminal: text };
                      setSegments(next);
                    }}
                    style={styles.segmentInput}
                    placeholderTextColor={colors.gray600}
                  />
                </View>
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
  { draft: Extract<AiDocumentItemDraft, { itemType: 'accommodation' }> }
>(function AccommodationDraftEditor({ draft }, ref) {
  const base = draft.payload;
  const values = useMemo(() => {
    const raw = base.values as Record<string, unknown>;
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  }, [base.values]);

  const [name, setName] = useState('');
  const [place, setPlace] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [checkinDate, setCheckinDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [checkoutDate, setCheckoutDate] = useState(
    dayjs().add(1, 'day').format('YYYY-MM-DD'),
  );
  const [checkinTime, setCheckinTime] = useState('15:00');
  const [checkoutTime, setCheckoutTime] = useState('11:00');
  const [expenseAmount, setExpenseAmount] = useState('');

  const [countryOpen, setCountryOpen] = useState(false);
  const [showCheckinCal, setShowCheckinCal] = useState(false);
  const [showCheckoutCal, setShowCheckoutCal] = useState(false);
  const [checkinTimeOpen, setCheckinTimeOpen] = useState(false);
  const [checkoutTimeOpen, setCheckoutTimeOpen] = useState(false);

  useEffect(() => {
    setName(pickStr(values, ['name', 'Name']));
    setPlace(pickStr(values, ['place', 'Place']));
    setCountry(pickStr(values, ['country', 'Country']));
    setCity(pickStr(values, ['city', 'City']));
    setDescription(pickStr(values, ['description', 'Description']));
    const ci =
      pickStr(values, ['checkinDate', 'checkin_date', 'CheckinDate']) ||
      dayjs().format('YYYY-MM-DD');
    const co =
      pickStr(values, ['checkoutDate', 'checkout_date', 'CheckoutDate']) ||
      dayjs(ci).add(1, 'day').format('YYYY-MM-DD');
    setCheckinDate(ci);
    setCheckoutDate(co);
    setCheckinTime(
      normalizeHHmm(
        pickStr(values, ['checkinTime', 'checkin_time', 'CheckinTime']) ||
          '15:00',
      ) || '15:00',
    );
    setCheckoutTime(
      normalizeHHmm(
        pickStr(values, ['checkoutTime', 'checkout_time', 'CheckoutTime']) ||
          '11:00',
      ) || '11:00',
    );
    const ex = readExpenseNested(values);
    const amtSrc = ex || values;
    setExpenseAmount(
      normalizeAmountDigits(pickStr(amtSrc, ['amount', 'Amount'])),
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
            amount: parseInt(expenseAmount, 10) || 0,
            category: ExpenseCategory.ACCOMMODATION,
            currency: ExpenseCurrency.KRW,
            description: name,
          },
        };
        return {
          itemType: 'accommodation',
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
      <View style={styles.inputGroup}>
        <Text style={styles.label}>숙소명*</Text>
        <Input
          variant="filled"
          placeholder={PLACEHOLDERS.accommodation.name}
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholderTextColor={colors.gray600}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>내용</Text>
        <Input
          variant="filled"
          placeholder={PLACEHOLDERS.itinerary.descriptionForm}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={styles.textArea}
          placeholderTextColor={colors.gray600}
        />
      </View>

      <View style={[styles.row, { gap: spacing.sm, zIndex: countryOpen ? 10000 : 1 }]}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>국가</Text>
          <CountryPicker
            value={country}
            onChange={setCountry}
            placeholder={PLACEHOLDERS.picker.country}
            onOpen={() => setCountryOpen(true)}
            onClose={() => setCountryOpen(false)}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>도시</Text>
          <Input
            variant="filled"
            placeholder={PLACEHOLDERS.accommodation.city}
            value={city}
            onChangeText={setCity}
            style={styles.input}
            placeholderTextColor={colors.gray600}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>장소</Text>
        <Input
          variant="filled"
          placeholder={PLACEHOLDERS.accommodation.place}
          value={place}
          onChangeText={setPlace}
          style={styles.input}
          placeholderTextColor={colors.gray600}
        />
      </View>

      <View
        style={[
          styles.row,
          { gap: spacing.sm, zIndex: showCheckinCal ? 30000 : checkinTimeOpen ? 20002 : 1 },
        ]}
      >
        <View style={[styles.inputGroup, styles.halfWidth, { position: 'relative' }]}>
          <Text style={styles.label}>체크인 날짜</Text>
          <Pressable
            style={styles.dateInput}
            onPress={() => setShowCheckinCal(true)}
          >
            <View style={styles.dateTextContainer}>
              <Text style={checkinDate ? styles.dateText : styles.placeholderText}>
                {checkinDate
                  ? dayjs(checkinDate).format('YYYY.MM.DD')
                  : '기타'}
              </Text>
              <View style={styles.iconWrapper}>
                <CalendarIcon width={16} height={16} />
              </View>
            </View>
          </Pressable>
          {showCheckinCal ? (
            <BaseCalendar
              visible
              selectedDate={checkinDate}
              onDayPress={(day) => {
                setCheckinDate(day.dateString);
                setShowCheckinCal(false);
              }}
              onClose={() => setShowCheckinCal(false)}
              style={styles.calendarPopup}
              minDate={dayjs().format('YYYY-MM-DD')}
              hideButtons
              autoCloseOnSelect
            />
          ) : null}
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>체크인 시간</Text>
          <TimePicker
            value={checkinTime}
            onChange={setCheckinTime}
            onOpen={() => {
              setCheckinTimeOpen(true);
              if (checkoutTimeOpen) setCheckoutTimeOpen(false);
            }}
            onClose={() => setCheckinTimeOpen(false)}
            style={styles.timePicker}
          />
        </View>
      </View>

      <View
        style={[
          styles.row,
          { gap: spacing.sm, zIndex: showCheckoutCal ? 30000 : checkoutTimeOpen ? 20001 : 1 },
        ]}
      >
        <View style={[styles.inputGroup, styles.halfWidth, { position: 'relative' }]}>
          <Text style={styles.label}>체크아웃 날짜</Text>
          <Pressable
            style={styles.dateInput}
            onPress={() => setShowCheckoutCal(true)}
          >
            <View style={styles.dateTextContainer}>
              <Text style={checkoutDate ? styles.dateText : styles.placeholderText}>
                {checkoutDate
                  ? dayjs(checkoutDate).format('YYYY.MM.DD')
                  : '기타'}
              </Text>
              <View style={styles.iconWrapper}>
                <CalendarIcon width={16} height={16} />
              </View>
            </View>
          </Pressable>
          {showCheckoutCal ? (
            <BaseCalendar
              visible
              selectedDate={checkoutDate}
              onDayPress={(day) => {
                setCheckoutDate(day.dateString);
                setShowCheckoutCal(false);
              }}
              onClose={() => setShowCheckoutCal(false)}
              style={styles.calendarPopup}
              minDate={checkinDate}
              hideButtons
              autoCloseOnSelect
            />
          ) : null}
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>체크아웃 시간</Text>
          <TimePicker
            value={checkoutTime}
            onChange={setCheckoutTime}
            onOpen={() => {
              setCheckoutTimeOpen(true);
              if (checkinTimeOpen) setCheckinTimeOpen(false);
            }}
            onClose={() => setCheckoutTimeOpen(false)}
            style={styles.timePicker}
          />
        </View>
      </View>

      <View style={[styles.row, { gap: spacing.sm }]}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>숙박료</Text>
          <View style={styles.amountInputWrapper}>
            <Input
              variant="filled"
              placeholder={PLACEHOLDERS.expense.amount}
              value={formatAmountWithCommas(expenseAmount)}
              onChangeText={(text) =>
                setExpenseAmount(normalizeAmountDigits(text.replace(/,/g, '')))
              }
              keyboardType="numeric"
              style={[styles.input, styles.amountInputPadding]}
              placeholderTextColor={colors.gray600}
            />
            <Text style={styles.amountSuffix} pointerEvents="none">
              {currencyLabels[ExpenseCurrency.KRW]}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const ExpenseDraftEditor = forwardRef<
  AiAnalyzeDraftEditorRef,
  { draft: Extract<AiDocumentItemDraft, { itemType: 'expense' }> }
>(function ExpenseDraftEditor({ draft }, ref) {
  const base = draft.payload;
  const values = useMemo(() => {
    const raw = base.values as Record<string, unknown>;
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  }, [base.values]);

  const [category, setCategory] = useState(ExpenseCategory.ETC);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [exDate, setExDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [catOpen, setCatOpen] = useState(false);
  const [showCal, setShowCal] = useState(false);

  useEffect(() => {
    setCategory(
      coerceExpenseCategory(pickStr(values, ['category', 'Category']) || 'etc'),
    );
    setAmount(normalizeAmountDigits(pickStr(values, ['amount', 'Amount'])));
    setDescription(pickStr(values, ['description', 'Description']));
    setExDate(
      pickStr(values, ['exDate', 'ex_date', 'ExDate']) ||
        dayjs().format('YYYY-MM-DD'),
    );
  }, [values]);

  useImperativeHandle(
    ref,
    () => ({
      buildDraft: (): AiDocumentItemDraft => ({
        itemType: 'expense',
        payload: {
          ...base,
          values: {
            ...values,
            category,
            amount: parseInt(amount, 10) || 0,
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
      <View style={[styles.inputGroup, { zIndex: catOpen ? 10001 : 1 }]}>
        <Text style={styles.label}>카테고리</Text>
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
      <View style={styles.inputGroup}>
        <Text style={styles.label}>금액</Text>
        <Input
          variant="filled"
          value={formatAmountWithCommas(amount)}
          onChangeText={(text) =>
            setAmount(normalizeAmountDigits(text.replace(/,/g, '')))
          }
          keyboardType="numeric"
          style={styles.input}
          placeholderTextColor={colors.gray600}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>내용</Text>
        <Input
          variant="filled"
          value={description}
          onChangeText={setDescription}
          style={styles.textArea}
          multiline
          placeholderTextColor={colors.gray600}
        />
      </View>
      <View style={[styles.inputGroup, { zIndex: showCal ? 20000 : 1 }]}>
        <Text style={styles.label}>비용일</Text>
        <Pressable style={styles.dateInput} onPress={() => setShowCal(true)}>
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateText}>
              {dayjs(exDate).format('YYYY년 M월 D일')}
            </Text>
            <View style={styles.iconWrapper}>
              <CalendarIcon width={16} height={16} />
            </View>
          </View>
        </Pressable>
        {showCal ? (
          <BaseCalendar
            visible
            selectedDate={exDate}
            onDayPress={(day) => {
              setExDate(day.dateString);
              setShowCal(false);
            }}
            onClose={() => setShowCal(false)}
            style={styles.calendarPopup}
            hideButtons
            autoCloseOnSelect
          />
        ) : null}
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
          case 'itinerary':
            return itineraryRef.current?.buildDraft() ?? draft;
          case 'flight':
            return flightRef.current?.buildDraft() ?? draft;
          case 'accommodation':
            return accommodationRef.current?.buildDraft() ?? draft;
          case 'expense':
            return expenseRef.current?.buildDraft() ?? draft;
          default:
            return draft;
        }
      },
    }),
    [draft],
  );

  switch (draft.itemType) {
    case 'itinerary':
      return (
        <ItineraryDraftEditor ref={itineraryRef} draft={draft} />
      );
    case 'flight':
      return <FlightDraftEditor ref={flightRef} draft={draft} />;
    case 'accommodation':
      return (
        <AccommodationDraftEditor ref={accommodationRef} draft={draft} />
      );
    case 'expense':
      return <ExpenseDraftEditor ref={expenseRef} draft={draft} />;
    default:
      return (
        <Text style={styles.fallbackText}>
          지원하지 않는 항목 유형입니다.
        </Text>
      );
  }
});

const styles = StyleSheet.create({
  formSection: {
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    overflow: 'visible',
    position: 'relative',
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    ...textStyles.h8,
    color: colors.black,
  },
  input: {
    backgroundColor: colors.gray200,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...textStyles.body4,
    borderWidth: 0,
  },
  textArea: {
    backgroundColor: colors.gray200,
    height: 80,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...textStyles.body4,
    borderWidth: 0,
  },
  expenseInput: {
    backgroundColor: colors.gray200,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    ...textStyles.body4,
    borderWidth: 0,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.gray200,
    minHeight: 40,
  },
  dateTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  dateText: {
    ...textStyles.body4,
    color: colors.gray800,
  },
  placeholderText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  iconWrapper: {
    marginTop: 0,
  },
  calendarPopup: {
    position: 'absolute',
    top: 70,
    left: 0,
    zIndex: 20000,
  },
  datePickerWrapper: {
    position: 'relative',
    overflow: 'visible',
  },
  pickerRowWrapper: {
    overflow: 'visible',
    position: 'relative',
  },
  countryPickerWrapper: {
    overflow: 'visible',
    position: 'relative',
  },
  currencyDisplay: {
    backgroundColor: colors.gray200,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    borderWidth: 0,
  },
  currencyText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  amountInputWrapper: {
    position: 'relative',
  },
  amountInputPadding: {
    paddingRight: 36,
    textAlign: 'right',
  },
  amountSuffix: {
    position: 'absolute',
    right: spacing.sm,
    top: '50%',
    transform: [{ translateY: -10 }],
    ...textStyles.body4,
    color: colors.black,
  },
  timePicker: {
    borderWidth: 0,
    borderRadius: radii.md,
    backgroundColor: colors.gray200,
    height: 40,
  },
  pillOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: ORANGE_BG,
  },
  pillOrangeSpaced: {
    marginTop: 6,
  },
  pillDotOrange: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: ORANGE,
  },
  pillOrangeText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    color: ORANGE,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  segmentTitle: {
    ...textStyles.h6,
    color: colors.black,
  },
  segmentContent: {
    gap: spacing.lg,
  },
  segmentInput: {
    backgroundColor: colors.gray200,
    borderWidth: 0,
    borderRadius: radii.md,
    height: 40,
    color: colors.black,
  },
  segmentDateInput: {
    backgroundColor: colors.gray200,
    borderWidth: 0,
    borderRadius: radii.md,
    height: 40,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  segmentDateTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderWidth: 0,
    borderRadius: radii.md,
    backgroundColor: colors.gray200,
    height: 40,
  },
  airportPickerWrapper: {
    overflow: 'visible',
    position: 'relative',
  },
  /** AI 분석 모달 전용: 공항 피커 트리거·목록·검색을 다른 입력과 동일한 회색 무테 */
  draftAirportPicker: {
    backgroundColor: colors.gray200,
    borderWidth: 0,
    borderRadius: radii.md,
    minHeight: 40,
  },
  draftAirportPickerList: {
    backgroundColor: colors.gray200,
    borderWidth: 0,
    borderTopWidth: 0,
    borderRadius: radii.md,
  },
  draftAirportPickerSearch: {
    backgroundColor: colors.gray200,
    borderWidth: 0,
    borderRadius: radii.xs,
  },
  draftCategoryPicker: {
    backgroundColor: colors.gray200,
    borderWidth: 0,
    borderRadius: radii.md,
    minHeight: 40,
  },
  draftCategoryPickerList: {
    backgroundColor: colors.gray200,
    borderWidth: 0,
    borderTopWidth: 0,
    borderRadius: radii.md,
  },
  draftCategoryListItem: {
    ...textStyles.body4,
    color: colors.gray800,
    backgroundColor: colors.gray200,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  draftCategorySelectedRow: {
    backgroundColor: colors.gray200,
  },
  fallbackText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
});
