import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import dayjs from 'dayjs';
import type { DocumentUploadAnalyzeResponse } from '@/types/api';
import { ExpenseCategory, ExpenseCurrency } from '@/types/api';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { itinerariesApi } from '@/services/itineraries';
import { flightsApi } from '@/services/flights';
import { accommodationsApi } from '@/services/accommodations';
import { expensesApi } from '@/services/expenses';

interface AiResultCardProps {
  result: DocumentUploadAnalyzeResponse;
  planId: number;
  onSaved?: () => void;
}

function getVal(v: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const val = v[k];
    if (val !== null && val !== undefined && String(val).trim()) return String(val);
  }
  return '';
}

function FieldRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const TYPE_LABELS: Record<string, string> = {
  itinerary: '일정',
  flight: '항공',
  accommodation: '숙박',
  expense: '비용',
};

export default function AiResultCard({ result, planId, onSaved }: AiResultCardProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!result.success || !result.draft || !result.inferredItemType) {
    return null;
  }

  const { draft, inferredItemType } = result;
  const v = (draft.payload.values as Record<string, unknown>) ?? {};

  const renderFields = () => {
    switch (inferredItemType) {
      case 'itinerary': {
        const title = getVal(v, 'title');
        const date = getVal(v, 'itineraryDate', 'itinerary_date');
        const time = getVal(v, 'startTime', 'start_time');
        const location = getVal(v, 'location') || getVal(v, 'city');
        return (
          <>
            <FieldRow label="제목" value={title} />
            <FieldRow label="날짜" value={date} />
            <FieldRow label="시간" value={time} />
            <FieldRow label="장소" value={location} />
          </>
        );
      }
      case 'flight': {
        const segs = Array.isArray(v.segments) ? v.segments as Record<string, unknown>[] : [];
        const seg0 = segs[0];
        const dep = seg0 ? getVal(seg0, 'departureAirport', 'departure_airport') : '';
        const arr = seg0 ? getVal(seg0, 'arrivalAirport', 'arrival_airport') : '';
        const depTimeRaw = seg0 ? getVal(seg0, 'departureTime', 'departure_time') : '';
        const flightNo = seg0 ? getVal(seg0, 'flightNumber', 'flight_number') : '';
        const depDate = depTimeRaw ? dayjs(depTimeRaw).format('YYYY-MM-DD') : '';
        const depTime = depTimeRaw ? dayjs(depTimeRaw).format('HH:mm') : '';
        return (
          <>
            {flightNo ? <FieldRow label="항공편" value={flightNo} /> : null}
            <FieldRow label="출발" value={dep} />
            <FieldRow label="도착" value={arr} />
            <FieldRow label="날짜" value={depDate} />
            {depTime ? <FieldRow label="시간" value={depTime} /> : null}
          </>
        );
      }
      case 'accommodation': {
        const name = getVal(v, 'name');
        const checkin = getVal(v, 'checkinDate', 'checkin_date');
        const checkout = getVal(v, 'checkoutDate', 'checkout_date');
        const city = getVal(v, 'city');
        return (
          <>
            <FieldRow label="숙소명" value={name} />
            <FieldRow label="체크인" value={checkin} />
            <FieldRow label="체크아웃" value={checkout} />
            <FieldRow label="도시" value={city} />
          </>
        );
      }
      case 'expense': {
        const amount = Number(v.amount) || 0;
        const currency = getVal(v, 'currency') || 'KRW';
        const category = getVal(v, 'category');
        const exDate = getVal(v, 'exDate', 'ex_date');
        return (
          <>
            <FieldRow label="금액" value={amount > 0 ? `${amount.toLocaleString()} ${currency}` : ''} />
            <FieldRow label="카테고리" value={category} />
            <FieldRow label="날짜" value={exDate} />
          </>
        );
      }
      default:
        return null;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      switch (inferredItemType) {
        case 'itinerary': {
          const date = getVal(v, 'itineraryDate', 'itinerary_date') || dayjs().format('YYYY-MM-DD');
          const startTime = getVal(v, 'startTime', 'start_time') || '00:00';
          const rawEnd = getVal(v, 'endTime', 'end_time');
          const endTime = rawEnd || startTime;
          await itinerariesApi.createItinerary({
            title: getVal(v, 'title') || '일정',
            description: getVal(v, 'description') || undefined,
            country: getVal(v, 'country') || undefined,
            city: getVal(v, 'city') || undefined,
            location: getVal(v, 'location') || undefined,
            itineraryDate: date,
            startTime: startTime.substring(0, 5),
            endTime: endTime.substring(0, 5),
            planId,
          });
          break;
        }
        case 'flight': {
          const segs = Array.isArray(v.segments) ? v.segments as Record<string, unknown>[] : [];
          await flightsApi.createFlight({
            planId,
            reservationNumber: getVal(v, 'reservationNumber', 'reservation_number') || null,
            passengerName: getVal(v, 'passengerName', 'passenger_name') || null,
            segments: segs.map((seg) => ({
              airline: getVal(seg, 'airline') || undefined,
              flightNumber: getVal(seg, 'flightNumber', 'flight_number') || undefined,
              departureAirport: getVal(seg, 'departureAirport', 'departure_airport'),
              arrivalAirport: getVal(seg, 'arrivalAirport', 'arrival_airport'),
              departureTime: getVal(seg, 'departureTime', 'departure_time'),
              arrivalTime: getVal(seg, 'arrivalTime', 'arrival_time'),
              seatClass: getVal(seg, 'seatClass', 'seat_class') || undefined,
              seatNumber: getVal(seg, 'seatNumber', 'seat_number') || undefined,
              gate: getVal(seg, 'gate') || undefined,
              terminal: getVal(seg, 'terminal') || undefined,
            })),
          });
          break;
        }
        case 'accommodation': {
          const ex = v.expense as Record<string, unknown> | undefined;
          const checkinDate = getVal(v, 'checkinDate', 'checkin_date') || dayjs().format('YYYY-MM-DD');
          const catRaw = ex ? getVal(ex, 'category') : '';
          const curRaw = ex ? getVal(ex, 'currency') : '';
          const validCats = Object.values(ExpenseCategory) as string[];
          const validCurs = Object.values(ExpenseCurrency) as string[];
          await accommodationsApi.createAccommodation({
            name: getVal(v, 'name') || '숙소',
            place: getVal(v, 'place') || undefined,
            country: getVal(v, 'country') || undefined,
            city: getVal(v, 'city') || undefined,
            checkinDate,
            checkoutDate: getVal(v, 'checkoutDate', 'checkout_date') || dayjs().add(1, 'day').format('YYYY-MM-DD'),
            checkinTime: getVal(v, 'checkinTime', 'checkin_time') || '15:00',
            checkoutTime: getVal(v, 'checkoutTime', 'checkout_time') || '11:00',
            description: getVal(v, 'description') || undefined,
            planId,
            expense: {
              exDate: ex ? (getVal(ex, 'exDate', 'ex_date') || checkinDate) : checkinDate,
              amount: ex ? Number(ex.amount) || 0 : 0,
              category: (catRaw && validCats.includes(catRaw) ? catRaw : 'accommodation') as ExpenseCategory,
              currency: (curRaw && validCurs.includes(curRaw) ? curRaw : 'KRW') as ExpenseCurrency,
            },
          });
          break;
        }
        case 'expense': {
          const catRaw = getVal(v, 'category');
          const curRaw = getVal(v, 'currency');
          const validCats = Object.values(ExpenseCategory) as string[];
          const validCurs = Object.values(ExpenseCurrency) as string[];
          await expensesApi.createExpense({
            exDate: getVal(v, 'exDate', 'ex_date') || dayjs().format('YYYY-MM-DD'),
            amount: Number(v.amount) || 0,
            category: (catRaw && validCats.includes(catRaw) ? catRaw : 'etc') as ExpenseCategory,
            currency: (curRaw && validCurs.includes(curRaw) ? curRaw : 'KRW') as ExpenseCurrency,
            description: getVal(v, 'description') || undefined,
            planId,
          });
          break;
        }
      }
      setSaved(true);
      onSaved?.();
    } catch {
      setSaveError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardHeader}>
        추출된 {TYPE_LABELS[inferredItemType] ?? ''} 정보
      </Text>
      <View style={styles.fieldsContainer}>
        {renderFields()}
      </View>
      {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          saved && styles.saveButtonSaved,
          pressed && !saving && !saved && styles.saveButtonPressed,
        ]}
        onPress={handleSave}
        disabled={saving || saved}
      >
        {saving ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={[styles.saveButtonText, saved && styles.saveButtonTextSaved]}>
            {saved ? '✓ 저장됐어요!' : '일정에 반영하기'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    alignSelf: 'flex-start',
    width: '100%',
  },
  cardHeader: {
    ...textStyles.h7,
    color: colors.primary,
    marginBottom: 12,
  },
  fieldsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldLabel: {
    ...textStyles.h7,
    color: colors.gray600,
    width: 52,
    flexShrink: 0,
  },
  fieldValue: {
    ...textStyles.h6,
    color: colors.black,
    flex: 1,
  },
  saveButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonSaved: {
    backgroundColor: colors.gray200,
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonText: {
    ...textStyles.h6,
    color: colors.primary,
  },
  saveButtonTextSaved: {
    color: colors.gray600,
  },
  errorText: {
    ...textStyles.body4,
    color: colors.danger,
    marginBottom: 8,
  },
});
