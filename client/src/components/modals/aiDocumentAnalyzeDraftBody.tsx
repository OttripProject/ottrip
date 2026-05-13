import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

import { colors } from '@/ui/tokens/colors';
import { spacing } from '@/ui/tokens/spacing';
import type { AiDocumentItemDraft } from '@/types/api';

const BORDER = '#E2E2E2';

export function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const raw = obj[k];
    if (raw === undefined || raw === null) continue;
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  }
  return '';
}

function readExpenseNested(
  values: Record<string, unknown>,
): Record<string, unknown> | null {
  const e = values.expense ?? values.Expense;
  if (e && typeof e === 'object' && !Array.isArray(e)) {
    return e as Record<string, unknown>;
  }
  return null;
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldControl}>
        <TextInput
          defaultValue={value}
          style={styles.input}
          multiline={value.length > 80}
          textAlignVertical="top"
          placeholderTextColor={colors.gray600}
        />
      </View>
    </View>
  );
}

function FieldRowMultiline({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldControl}>
        <TextInput
          defaultValue={value}
          style={[styles.input, styles.textarea]}
          multiline
          textAlignVertical="top"
          placeholderTextColor={colors.gray600}
        />
      </View>
    </View>
  );
}

function ItineraryBody({ values }: { values: Record<string, unknown> }) {
  const exp = readExpenseNested(values);
  const cat = exp
    ? pickStr(exp, ['category', 'Category'])
    : pickStr(values, [
        'category',
        'Category',
        'expense_category',
        'expenseCategory',
      ]);
  const amt = exp
    ? pickStr(exp, ['amount', 'Amount'])
    : pickStr(values, ['amount', 'Amount', 'expense_amount', 'expenseAmount']);
  const desc = exp
    ? pickStr(exp, ['description', 'Description'])
    : pickStr(values, [
        'expense_description',
        'expenseDescription',
        'description',
        'Description',
      ]);
  const showExpense =
    cat.length > 0 || amt.length > 0 || desc.length > 0 || exp != null;

  return (
    <>
      <FieldRow
        label="제목"
        value={pickStr(values, ['title', 'Title'])}
      />
      <FieldRowMultiline
        label="내용"
        value={pickStr(values, ['description', 'Description'])}
      />
      <FieldRow label="국가" value={pickStr(values, ['country', 'Country'])} />
      <FieldRow label="도시" value={pickStr(values, ['city', 'City'])} />
      <FieldRow
        label="장소"
        value={pickStr(values, ['location', 'Location'])}
      />
      <FieldRow
        label="날짜"
        value={pickStr(values, [
          'itineraryDate',
          'itinerary_date',
          'ItineraryDate',
        ])}
      />
      <FieldRow
        label="시작시간"
        value={pickStr(values, ['startTime', 'start_time', 'StartTime'])}
      />
      <FieldRow
        label="종료시간"
        value={pickStr(values, ['endTime', 'end_time', 'EndTime'])}
      />

      {showExpense ? (
        <>
          <View style={[styles.pillOrange, styles.pillOrangeSpaced]}>
            <View style={styles.pillDotOrange} />
            <Text style={styles.pillOrangeText}>비용 내역</Text>
          </View>
          <FieldRow label="카테고리" value={cat} />
          <FieldRow label="금액 (원)" value={amt} />
          <FieldRow label="내용" value={desc} />
        </>
      ) : null}
    </>
  );
}

function FlightBody({ values }: { values: Record<string, unknown> }) {
  const segRaw = values.segments ?? values.Segments;
  let segmentsText = '';
  if (Array.isArray(segRaw)) {
    try {
      segmentsText = JSON.stringify(segRaw, null, 2);
    } catch {
      segmentsText = String(segRaw);
    }
  } else if (segRaw && typeof segRaw === 'object') {
    try {
      segmentsText = JSON.stringify(segRaw, null, 2);
    } catch {
      segmentsText = '';
    }
  }

  const exp = readExpenseNested(values);
  const amt = exp
    ? pickStr(exp, ['amount', 'Amount'])
    : pickStr(values, ['amount', 'Amount']);
  const cur = exp
    ? pickStr(exp, ['currency', 'Currency'])
    : pickStr(values, ['currency', 'Currency']);
  const exDesc = exp
    ? pickStr(exp, ['description', 'Description'])
    : pickStr(values, ['description', 'Description']);
  const exDate = exp
    ? pickStr(exp, ['exDate', 'ex_date', 'ExDate'])
    : pickStr(values, ['exDate', 'ex_date', 'ExDate']);
  const showExpense =
    amt.length > 0 ||
    cur.length > 0 ||
    exDesc.length > 0 ||
    exDate.length > 0 ||
    exp != null;

  return (
    <>
      <FieldRow
        label="예약번호"
        value={pickStr(values, [
          'reservationNumber',
          'reservation_number',
          'ReservationNumber',
        ])}
      />
      <FieldRow
        label="탑승객"
        value={pickStr(values, [
          'passengerName',
          'passenger_name',
          'PassengerName',
        ])}
      />
      <FieldRow
        label="항공권 번호"
        value={pickStr(values, [
          'ticketNumber',
          'ticket_number',
          'TicketNumber',
        ])}
      />
      <FieldRow
        label="예약번호(여행사)"
        value={pickStr(values, [
          'bookingReference',
          'booking_reference',
          'BookingReference',
        ])}
      />
      <FieldRowMultiline label="구간" value={segmentsText} />

      {showExpense ? (
        <>
          <View style={[styles.pillOrange, styles.pillOrangeSpaced]}>
            <View style={styles.pillDotOrange} />
            <Text style={styles.pillOrangeText}>비용 내역</Text>
          </View>
          <FieldRow label="금액" value={amt} />
          <FieldRow label="통화" value={cur} />
          <FieldRow label="내용" value={exDesc} />
          <FieldRow label="비용일" value={exDate} />
        </>
      ) : null}
    </>
  );
}

function AccommodationBody({ values }: { values: Record<string, unknown> }) {
  const exp = readExpenseNested(values);
  const amt = exp
    ? pickStr(exp, ['amount', 'Amount'])
    : pickStr(values, ['amount', 'Amount']);
  const cur = exp
    ? pickStr(exp, ['currency', 'Currency'])
    : pickStr(values, ['currency', 'Currency']);
  const exDesc = exp
    ? pickStr(exp, ['description', 'Description'])
    : pickStr(values, ['description', 'Description']);
  const exDate = exp
    ? pickStr(exp, ['exDate', 'ex_date', 'ExDate'])
    : pickStr(values, ['exDate', 'ex_date', 'ExDate']);
  const showExpense =
    amt.length > 0 ||
    cur.length > 0 ||
    exDesc.length > 0 ||
    exDate.length > 0 ||
    exp != null;

  return (
    <>
      <FieldRow label="이름" value={pickStr(values, ['name', 'Name'])} />
      <FieldRow label="장소" value={pickStr(values, ['place', 'Place'])} />
      <FieldRow label="국가" value={pickStr(values, ['country', 'Country'])} />
      <FieldRow label="도시" value={pickStr(values, ['city', 'City'])} />
      <FieldRow
        label="체크인"
        value={pickStr(values, [
          'checkinDate',
          'checkin_date',
          'CheckinDate',
        ])}
      />
      <FieldRow
        label="체크아웃"
        value={pickStr(values, [
          'checkoutDate',
          'checkout_date',
          'CheckoutDate',
        ])}
      />
      <FieldRow
        label="체크인 시간"
        value={pickStr(values, [
          'checkinTime',
          'checkin_time',
          'CheckinTime',
        ])}
      />
      <FieldRow
        label="체크아웃 시간"
        value={pickStr(values, [
          'checkoutTime',
          'checkout_time',
          'CheckoutTime',
        ])}
      />
      <FieldRowMultiline
        label="설명"
        value={pickStr(values, ['description', 'Description'])}
      />

      {showExpense ? (
        <>
          <View style={[styles.pillOrange, styles.pillOrangeSpaced]}>
            <View style={styles.pillDotOrange} />
            <Text style={styles.pillOrangeText}>비용 내역</Text>
          </View>
          <FieldRow label="금액" value={amt} />
          <FieldRow label="통화" value={cur} />
          <FieldRow label="내용" value={exDesc} />
          <FieldRow label="비용일" value={exDate} />
        </>
      ) : null}
    </>
  );
}

function ExpenseOnlyBody({ values }: { values: Record<string, unknown> }) {
  return (
    <>
      <FieldRow
        label="카테고리"
        value={pickStr(values, ['category', 'Category'])}
      />
      <FieldRow label="금액" value={pickStr(values, ['amount', 'Amount'])} />
      <FieldRow
        label="통화"
        value={pickStr(values, ['currency', 'Currency'])}
      />
      <FieldRow
        label="내용"
        value={pickStr(values, ['description', 'Description'])}
      />
      <FieldRow
        label="비용일"
        value={pickStr(values, ['exDate', 'ex_date', 'ExDate'])}
      />
    </>
  );
}

export function AiAnalyzeResultBody({ draft }: { draft: AiDocumentItemDraft }) {
  const values = draft.payload.values as Record<string, unknown>;
  switch (draft.itemType) {
    case 'itinerary':
      return <ItineraryBody values={values} />;
    case 'flight':
      return <FlightBody values={values} />;
    case 'accommodation':
      return <AccommodationBody values={values} />;
    case 'expense':
      return <ExpenseOnlyBody values={values} />;
    default:
      return (
        <FieldRowMultiline
          label="데이터"
          value={JSON.stringify(values, null, 2)}
        />
      );
  }
}

const ORANGE = '#E07000';
const ORANGE_BG = '#FFF1E5';

const styles = StyleSheet.create({
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldLabel: {
    width: 76,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.gray700,
  },
  fieldControl: {
    flex: 1,
    minWidth: 0,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.gray900,
  },
  textarea: {
    minHeight: 72,
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
});
