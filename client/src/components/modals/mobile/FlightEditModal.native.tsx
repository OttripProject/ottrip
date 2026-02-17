import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import dayjs from 'dayjs';
import { FlightRead } from '@/types/api';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import FullScreenModal from '@/ui/components/FullScreenModal.native';
import FloatingFooter from '@/ui/components/FloatingFooter.native';
import { TimePicker, AirportPicker } from '@/ui/components/pickers';
import Input from '@/ui/components/input/Input';
import { flightsApi } from '@/services/flights';
import { ExpenseCurrency, ExpenseCategory, currencyLabels } from '@/types/expense';
import { PLACEHOLDERS } from '@/constants/placeholders';
import BaseCalendar from '@/components/popup/calendar/BaseCalendar';
import CloseIcon from '../../../../assets/x.svg';
import CalendarIcon from '../../../../assets/mobile_calendar_black.svg';
import AccommodationIcon from '../../../../assets/mobile_accomodation.svg';
import FlightIcon from '../../../../assets/airplane.svg';
import AddIcon from '../../../../assets/mobile_plan_add.svg';
import DeleteIcon from '../../../../assets/delete.svg';

interface FlightEditModalProps {
  visible: boolean;
  onClose: () => void;
  flight: FlightRead | null;
  planId: number;
  planStartDate?: string;
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

const formatDate = (dateStr: string) => dayjs(dateStr).format('YYYY.MM.DD');
const normalizeAmount = (value: unknown) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return raw.replace(/[^0-9]/g, '');
};

export default function FlightEditModal({
  visible,
  onClose,
  flight,
  planId,
  planStartDate,
  onSave,
  onDelete,
}: FlightEditModalProps) {
  const [formData, setFormData] = useState({
    reservation_number: '',
    passenger_name: '',
    ticket_number: '',
    booking_reference: '',
  });
  const [expenseAmount, setExpenseAmount] = useState('');
  const [flightSegments, setFlightSegments] = useState<SegmentForm[]>([]);
  const [segmentDatePicker, setSegmentDatePicker] = useState<{ idx: number; type: 'dep' | 'arr' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (visible && flight) {
      setFormData({
        reservation_number: flight.reservationNumber || '',
        passenger_name: flight.passengerName || '',
        ticket_number: flight.ticketNumber || '',
        booking_reference: flight.bookingReference || '',
      });
      const amountNum = Math.floor(Number(flight.expense?.amount) || 0);
      setExpenseAmount(
        amountNum ? String(amountNum).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''
      );
      const segments = flight.flightSegments || [];
      const sorted = [...segments].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const baseDate = planStartDate || dayjs().format('YYYY-MM-DD');
      const segList =
        sorted.length > 0
          ? sorted.map((seg) => {
          const dep = seg.departureTime ? dayjs(seg.departureTime) : dayjs();
          const arr = seg.arrivalTime ? dayjs(seg.arrivalTime) : dayjs().add(1, 'hour');
          return {
            id: seg.id,
            order: (seg as any).order,
            airline: seg.airline || '',
            flight_number: seg.flightNumber || '',
            departure_airport: seg.departureAirport || '',
            arrival_airport: seg.arrivalAirport || '',
            departure_date: dep.format('YYYY-MM-DD'),
            departure_time: dep.format('HH:mm'),
            arrival_date: arr.format('YYYY-MM-DD'),
            arrival_time: arr.format('HH:mm'),
            terminal: seg.terminal || '',
            gate: seg.gate || '',
            seat_number: seg.seatNumber || '',
          };
        })
          : [
              {
                airline: '',
                flight_number: '',
                departure_airport: '',
                arrival_airport: '',
                departure_date: baseDate,
                departure_time: '09:00',
                arrival_date: baseDate,
                arrival_time: '10:00',
                terminal: '',
                gate: '',
                seat_number: '',
              },
            ];
      setFlightSegments(segList);
    }
  }, [visible, flight, planStartDate]);

  const toIso = (date: string, time: string) => {
    if (!date || !time) return '';
    const ts = time.length === 5 ? `${time}:00` : time;
    return new Date(`${date}T${ts}`).toISOString();
  };

  const handleSave = async () => {
    if (!flight || isSubmittingRef.current) return;
    const first = flightSegments[0];
    if (
      !first?.departure_airport?.trim() ||
      !first?.arrival_airport?.trim() ||
      !first?.departure_date ||
      !first?.departure_time ||
      !first?.arrival_date ||
      !first?.arrival_time
    ) {
      Alert.alert('알림', '입력되지 않은 필수 값이 있습니다.');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await flightsApi.updateFlight(flight.id, {
        reservationNumber: formData.reservation_number?.trim() || null,
        passengerName: formData.passenger_name?.trim() || null,
        ticketNumber: formData.ticket_number?.trim() || null,
        bookingReference: formData.booking_reference?.trim() || null,
        segments: flightSegments.map((s) => ({
          id: s.id,
          airline: s.airline?.trim() || null,
          flightNumber: s.flight_number?.trim() || null,
          departureAirport: s.departure_airport.trim(),
          arrivalAirport: s.arrival_airport.trim(),
          departureTime: toIso(s.departure_date, s.departure_time),
          arrivalTime: toIso(s.arrival_date, s.arrival_time),
          terminal: s.terminal?.trim() || null,
          gate: s.gate?.trim() || null,
          seatNumber: s.seat_number?.trim() || null,
        })),
        expense: {
          exDate: first.departure_date,
          amount: parseInt(expenseAmount.replace(/[^0-9]/g, ''), 10) || 0,
          currency: ExpenseCurrency.KRW,
          category: ExpenseCategory.FLIGHT as any,
          planId,
          description: formData.reservation_number?.trim() || null,
        },
      });
      const updated = await flightsApi.getFlight(flight.id);
      if (onSave) onSave(updated);
      Alert.alert('수정완료', '항공 편이 수정되었습니다.');
      onClose();
    } catch (error) {
      Alert.alert('오류', '항공 편 수정에 실패했습니다.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!flight) return;
    Alert.alert(
      '항공 편 삭제',
      '이 항공 편을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await flightsApi.deleteFlight(flight.id);
              if (onDelete) onDelete(flight.id);
              Alert.alert('삭제완료', '항공 편이 삭제되었습니다.');
              onClose();
            } catch (error) {
              Alert.alert('오류', '항공 편 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    setExpenseAmount(digits.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
  };

  const addSegment = () => {
    const last = flightSegments[flightSegments.length - 1];
    const baseDate = last?.arrival_date || planStartDate || dayjs().format('YYYY-MM-DD');
    const baseTime = last?.arrival_time || '12:00';
    setFlightSegments((prev) => [
      ...prev,
      {
        airline: '',
        flight_number: '',
        departure_airport: '',
        arrival_airport: '',
        departure_date: baseDate,
        departure_time: baseTime,
        arrival_date: baseDate,
        arrival_time: '',
        terminal: '',
        gate: '',
        seat_number: '',
      },
    ]);
  };

  const removeSegment = (idx: number) => {
    if (flightSegments.length <= 1) return;
    setFlightSegments((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSegment = (idx: number, field: keyof SegmentForm, value: string) => {
    setFlightSegments((prev) => {
      const next = [...prev];
      (next[idx] as any)[field] = value;
      return next;
    });
  };

  if (!flight && visible) return null;

  return (
    <FullScreenModal visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>항공 수정</Text>
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
          <CloseIcon width={24} height={24} />
        </Pressable>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.categoryTabs}>
          <View style={styles.categoryTab}>
            <AccommodationIcon width={16} height={16} color={colors.gray600} />
            <Text style={styles.categoryTabText}>숙소</Text>
          </View>
          <View style={[styles.categoryTab, styles.categoryTabActive]}>
            <FlightIcon width={16} height={16} color={colors.primary} />
            <Text style={[styles.categoryTabText, styles.categoryTabTextActive]}>항공</Text>
          </View>
          <View style={styles.categoryTab}>
            <CalendarIcon width={16} height={16} color={colors.gray600} />
            <Text style={styles.categoryTabText}>일정</Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>예약번호 (PNR)</Text>
            <Input
              value={formData.reservation_number}
              onChangeText={(t) => setFormData({ ...formData, reservation_number: t })}
              style={styles.input}
              placeholder={PLACEHOLDERS.flight.reservationNumber}
              placeholderTextColor={colors.gray600}
            />
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>승객명</Text>
              <Input
                value={formData.passenger_name}
                onChangeText={(t) => setFormData({ ...formData, passenger_name: t })}
                style={styles.input}
                placeholder={PLACEHOLDERS.flight.passengerName}
                placeholderTextColor={colors.gray600}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>항공료(원)</Text>
              <Input
                value={expenseAmount}
                onChangeText={handleAmountChange}
                style={styles.input}
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
                onChangeText={(t) => setFormData({ ...formData, booking_reference: t })}
                style={styles.input}
                placeholder={PLACEHOLDERS.flight.bookingReference}
                placeholderTextColor={colors.gray600}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>항공권 번호</Text>
              <Input
                value={formData.ticket_number}
                onChangeText={(t) => setFormData({ ...formData, ticket_number: t })}
                style={styles.input}
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
                      onChangeText={(t) => updateSegment(idx, 'airline', t)}
                      style={styles.input}
                      placeholder={PLACEHOLDERS.flight.airline}
                      placeholderTextColor={colors.gray600}
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Input
                      value={seg.flight_number}
                      onChangeText={(t) => updateSegment(idx, 'flight_number', t)}
                      style={styles.input}
                      placeholder={PLACEHOLDERS.flight.flightNumber}
                      placeholderTextColor={colors.gray600}
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.halfWidth, { zIndex: 2000 - idx }]}>
                    <AirportPicker
                      value={seg.departure_airport}
                      onChange={(code) => updateSegment(idx, 'departure_airport', code)}
                      placeholder={PLACEHOLDERS.flight.departureAirport}
                      style={styles.pickerInput}
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.halfWidth, { zIndex: 2000 - idx }]}>
                    <AirportPicker
                      value={seg.arrival_airport}
                      onChange={(code) => updateSegment(idx, 'arrival_airport', code)}
                      placeholder={PLACEHOLDERS.flight.arrivalAirport}
                      style={styles.pickerInput}
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Pressable
                      style={styles.dateInput}
                      onPress={() => setSegmentDatePicker({ idx, type: 'dep' })}
                    >
                      <Text style={styles.dateText}>{formatDate(seg.departure_date)}</Text>
                      <CalendarIcon width={16} height={16} color={colors.black} />
                    </Pressable>
                    {segmentDatePicker?.idx === idx && segmentDatePicker?.type === 'dep' && (
                      <BaseCalendar
                        visible
                        selectedDate={seg.departure_date}
                        onDayPress={(day) => {
                          updateSegment(idx, 'departure_date', day.dateString);
                          setSegmentDatePicker(null);
                        }}
                        onClose={() => setSegmentDatePicker(null)}
                        style={styles.calendarPopup}
                      />
                    )}
                  </View>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Pressable
                      style={styles.dateInput}
                      onPress={() => setSegmentDatePicker({ idx, type: 'arr' })}
                    >
                      <Text style={styles.dateText}>{formatDate(seg.arrival_date)}</Text>
                      <CalendarIcon width={16} height={16} color={colors.black} />
                    </Pressable>
                    {segmentDatePicker?.idx === idx && segmentDatePicker?.type === 'arr' && (
                      <BaseCalendar
                        visible
                        selectedDate={seg.arrival_date}
                        onDayPress={(day) => {
                          updateSegment(idx, 'arrival_date', day.dateString);
                          setSegmentDatePicker(null);
                        }}
                        onClose={() => setSegmentDatePicker(null)}
                        style={styles.calendarPopup}
                      />
                    )}
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <TimePicker
                      value={seg.departure_time}
                      onChange={(t) => updateSegment(idx, 'departure_time', t)}
                      containerStyle={styles.pickerContainer}
                      style={styles.pickerInput}
                    />
                  </View>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <TimePicker
                      value={seg.arrival_time}
                      onChange={(t) => updateSegment(idx, 'arrival_time', t)}
                      containerStyle={styles.pickerContainer}
                      style={styles.pickerInput}
                    />
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
      </ScrollView>

      <FloatingFooter
        primaryLabel="수정 완료"
        onPrimaryPress={handleSave}
        primaryDisabled={isSubmitting}
        secondaryLabel="삭제"
        onSecondaryPress={handleDelete}
      />
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    ...textStyles.h4,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  closeButton: { padding: 4 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 240,
  },
  categoryTabs: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: colors.gray200,
    borderRadius: 12,
    padding: 4,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 12,
  },
  categoryTabActive: { backgroundColor: colors.white },
  categoryTabText: { ...textStyles.h6, color: colors.gray600 },
  categoryTabTextActive: { ...textStyles.h6, color: colors.primary },
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
    backgroundColor: colors.gray100,
  },
  row: { flexDirection: 'row', gap: 9 },
  halfWidth: { flex: 1 },
  segmentSection: { marginBottom: 24 },
  segmentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  segmentSectionTitle: { ...textStyles.h5 },
  addSegmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    backgroundColor: colors.gray100,
  },
  dateText: { ...textStyles.body3 },
  calendarPopup: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  pickerContainer: { zIndex: 1 },
  pickerInput: {
    height: 48,
    minHeight: 48,
    overflow: 'hidden',
    paddingRight: 14,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    backgroundColor: colors.gray100,
  },
});
