import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Platform, ScrollView } from 'react-native';
import { TimePicker, AirportPicker } from '@/ui/components/pickers';
import dayjs from 'dayjs';
import { flightsApi } from '@/services/flights';
import { ExpenseCurrency, ExpenseCategory } from '@/types/expense';
import Input from '@/ui/components/input/Input';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens/radii';
import BaseCalendar from '@/components/popup/calendar/BaseCalendar';
import CalendarIcon from '../../../assets/calender.svg';
import AddIcon from '../../../assets/add.svg';
import DropDownPicker from 'react-native-dropdown-picker';
import DownArrowIcon from '../../../assets/down_arrow.svg';
import UpperArrowIcon from '../../../assets/upper_arrow.svg';

interface FlightItemProps {
  flight?: any;
  planId: number;
  onSave: (flight: any) => void;
  onCancel: () => void;
  onDelete?: (flightId: string) => void;
  existingFlights?: any[]; // 기존 항공편 목록 (겹침 검증용)
  existingItineraries?: any[]; // 기존 일정 목록 (겹침 검증용)
  existingAccommodations?: any[]; // 기존 숙박 목록 (겹침 검증용)
}

export default function FlightItem({ 
  flight, 
  planId, 
  onSave, 
  onCancel, 
  onDelete,
  existingFlights = [],
}: FlightItemProps) {
  const [formData, setFormData] = useState({
    reservation_number: flight?.reservationNumber || flight?.reservation_number || '',
    passenger_name: flight?.passengerName || flight?.passenger_name || '',
    ticket_number: flight?.ticketNumber || flight?.ticket_number || '',
    booking_reference: flight?.bookingReference || flight?.booking_reference || '',
  });

  const [airportOpen, setAirportOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [segmentDatePickerOpen, setSegmentDatePickerOpen] = useState<Record<string, boolean>>({});

  const [expenseData, setExpenseData] = useState({
    amount: flight?.expense?.amount || '',
    currency: flight?.expense?.currency || ExpenseCurrency.KRW,
  });

  // FlightSegment 타입 정의
  type SegmentForm = {
    airline: string;
    flight_number: string;
    departure_airport: string;
    arrival_airport: string;
    departure_date: string; // 'YYYY-MM-DD'
    departure_time: string; // 'HH:mm'
    arrival_date: string;   // 'YYYY-MM-DD'
    arrival_time: string;   // 'HH:mm'
    seat_class?: string;
    seat_number?: string;
    gate?: string;
    terminal?: string;
  };

  const [flightSegments, setFlightSegments] = useState<SegmentForm[]>(() => {
    if (flight?.flightSegments && flight.flightSegments.length > 0) {
      // 편집 모드: 기존 segments 데이터 사용
      return flight.flightSegments.map((segment: any) => {
        const depTime = segment.departureTime ? dayjs(segment.departureTime) : dayjs();
        const arrTime = segment.arrivalTime ? dayjs(segment.arrivalTime) : dayjs().add(1, 'hour');
        return {
          airline: segment.airline || '',
          flight_number: segment.flightNumber || '',
          departure_airport: segment.departureAirport || '',
          arrival_airport: segment.arrivalAirport || '',
          departure_date: depTime.format('YYYY-MM-DD'),
          departure_time: depTime.format('HH:mm'),
          arrival_date: arrTime.format('YYYY-MM-DD'),
          arrival_time: arrTime.format('HH:mm'),
          seat_class: segment.seatClass || '',
          seat_number: segment.seatNumber || '',
          gate: segment.gate || '',
          terminal: segment.terminal || '',
        };
      });
    } else {
      // 새 항공편: 기본값
      const now = dayjs();
      const later = dayjs().add(1, 'hour');
      return [{
        airline: '',
        flight_number: '',
        departure_airport: '',
        arrival_airport: '',
        departure_date: now.format('YYYY-MM-DD'),
        departure_time: now.format('HH:mm'),
        arrival_date: later.format('YYYY-MM-DD'),
        arrival_time: later.format('HH:mm'),
        seat_class: '',
        seat_number: '',
        gate: '',
        terminal: '',
      }];
    }
  });

  const [expenseDate, setExpenseDate] = useState(
    flight?.expense?.exDate || (flightSegments.length > 0 ? flightSegments[0].departure_date : dayjs().format('YYYY-MM-DD'))
  );

  // 12시간제 시간 표시 변환 함수
  const formatTime12Hour = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour24 = parseInt(hours, 10);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  // 12시간제에서 24시간제로 변환
  const parseTime12To24 = (time12: string) => {
    if (!time12) return '';
    const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return time12;
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  };

  const [isLoading, setIsLoading] = useState(false);

  const firstSegment = flightSegments[0];
  const isFirstSegmentValid = Boolean(
    firstSegment &&
    firstSegment.airline.trim() &&
    firstSegment.flight_number.trim() &&
    firstSegment.departure_airport.trim() &&
    firstSegment.arrival_airport.trim() &&
    String(firstSegment.departure_date || '').trim() &&
    String(firstSegment.departure_time || '').trim() &&
    String(firstSegment.arrival_date || '').trim() &&
    String(firstSegment.arrival_time || '').trim()
  );

  const handleSave = async () => {
    if (!formData.reservation_number.trim() || !formData.passenger_name.trim() || !isFirstSegmentValid) {
      if (Platform.OS === 'web') {
        window.alert('입력되지 않은 값이 있어요');
      } else {
        Alert.alert('알림', '입력되지 않은 값이 있어요');
      }
      return;
    }

    // 겹침 검증: 기존 항공편과 시간 겹침 확인
    for (const existingFlight of existingFlights) {
      // 편집 중인 항공편은 제외 (자기 자신)
      if (flight && existingFlight.id === flight.id) {
        continue;
      }

      if (!existingFlight.flightSegments || existingFlight.flightSegments.length === 0) {
        continue;
      }

      // 새로 입력한 항공편의 각 구간과 기존 항공편의 구간 비교
      for (const newSegment of flightSegments) {
        const newDepTime = dayjs(`${newSegment.departure_date} ${newSegment.departure_time}`);
        const newArrTime = dayjs(`${newSegment.arrival_date} ${newSegment.arrival_time}`);

        for (const existingSegment of existingFlight.flightSegments) {
          const existingDepTime = dayjs(existingSegment.departureTime);
          const existingArrTime = dayjs(existingSegment.arrivalTime);

          // 시간이 겹치는지 확인 (범위가 겹치면 true)
          const hasOverlap = (
            (newDepTime.isAfter(existingDepTime) || newDepTime.isSame(existingDepTime)) && newDepTime.isBefore(existingArrTime) ||
            newArrTime.isAfter(existingDepTime) && (newArrTime.isBefore(existingArrTime) || newArrTime.isSame(existingArrTime)) ||
            (newDepTime.isBefore(existingDepTime) && newArrTime.isAfter(existingArrTime))
          );

          if (hasOverlap) {
            if (Platform.OS === 'web') {
              window.alert('겹치는 항공 일정이 있어요');
            } else {
              Alert.alert('알림', '겹치는 항공 일정이 있어요');
            }
            return;
          }
        }
      }
    }

    setIsLoading(true);
    try {
      let savedFlight;
      const toIso = (date: string, time: string) => {
        if (!date || !time) return null;
        const timeWithSeconds = (time.length === 5) ? `${time}:00` : time;
        
        // 로컬 시간을 UTC로 변환하여 전송
        const localDateTime = new Date(`${date}T${timeWithSeconds}`);
        return localDateTime.toISOString();
      };

      if (flight) {
        savedFlight = await flightsApi.updateFlight(flight.id, {
          reservationNumber: formData.reservation_number,
          passengerName: formData.passenger_name,
          ticketNumber: formData.ticket_number || null,
          bookingReference: formData.booking_reference || null,
          segments: flightSegments.map(s => ({
            airline: s.airline,
            flightNumber: s.flight_number,
            departureAirport: s.departure_airport,
            arrivalAirport: s.arrival_airport,
            departureTime: toIso(s.departure_date, s.departure_time),
            arrivalTime: toIso(s.arrival_date, s.arrival_time),
            seatClass: s.seat_class || null,
            seatNumber: s.seat_number || null,
            gate: s.gate || null,
            terminal: s.terminal || null,
          })),
          expense: {
            exDate: expenseDate,
            amount: Number(expenseData.amount) || 0,
            currency: expenseData.currency as ExpenseCurrency,
            category: ExpenseCategory.FLIGHT as any,
            planId: planId,
            description: formData.reservation_number,
          },
        });
      } else {
        // 추가
        savedFlight = await flightsApi.createFlight({
          planId: planId,
          reservationNumber: formData.reservation_number,
          passengerName: formData.passenger_name,
          ticketNumber: formData.ticket_number || null,
          bookingReference: formData.booking_reference || null,
          segments: flightSegments.map(s => ({
            airline: s.airline,
            flightNumber: s.flight_number,
            departureAirport: s.departure_airport,
            arrivalAirport: s.arrival_airport,
            departureTime: toIso(s.departure_date, s.departure_time),
            arrivalTime: toIso(s.arrival_date, s.arrival_time),
            seatClass: s.seat_class || null,
            seatNumber: s.seat_number || null,
            gate: s.gate || null,
            terminal: s.terminal || null,
          })),
          expense: {
            exDate: expenseDate,
            amount: Number(expenseData.amount) || 0,
            currency: expenseData.currency as ExpenseCurrency,
            category: ExpenseCategory.FLIGHT as any,
            planId: planId,
            description: formData.reservation_number,
          },
        });
      }
      onSave(savedFlight);
    } catch (error) {
      console.error('Failed to save flight:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (flight && onDelete) {
      try {
        await flightsApi.deleteFlight(flight.id);
        onDelete(flight.id);
      } catch (error) {
        console.error('Failed to delete flight:', error);
      }
    }
  };

  // 통화 옵션
  const currencyOptions = useMemo(() => [
    { label: 'KRW', value: ExpenseCurrency.KRW },
    { label: 'USD', value: ExpenseCurrency.USD },
    { label: 'EUR', value: ExpenseCurrency.EUR },
    { label: 'JPY', value: ExpenseCurrency.JPY },
  ], []);

  return (
    <ScrollView 
      style={[styles.container, { position: 'relative', overflow: 'visible' }]}
      contentContainerStyle={[styles.contentContainer, { overflow: 'visible' }]}
    >
      <View style={styles.contentWrapper}>
        <Text style={styles.title}>항공편 정보</Text>

        {/* 기본 정보 섹션 */}
        <View style={styles.formSection}>
          {/* 예약번호(PNR) / 승객명 */}
          <View style={[styles.row, { gap: spacing.sm }]}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>예약번호 (PNR)</Text>
              <Input
                variant="filled"
                placeholder={PLACEHOLDERS.flight.reservationNumber}
                value={formData.reservation_number}
                onChangeText={(text) => setFormData({ ...formData, reservation_number: text })}
                style={styles.input}
                placeholderTextColor={colors.gray600}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>승객명</Text>
              <Input
                variant="filled"
                placeholder={PLACEHOLDERS.flight.passengerName}
                value={formData.passenger_name}
                onChangeText={(text) => setFormData({ ...formData, passenger_name: text })}
                style={styles.input}
                placeholderTextColor={colors.gray600}
              />
            </View>
          </View>

          {/* 항공편 번호 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>항공편 번호</Text>
            <Input
              variant="filled"
              placeholder="항공편 번호를 입력하세요."
              value={formData.ticket_number}
              onChangeText={(text) => setFormData({ ...formData, ticket_number: text })}
              style={styles.input}
              placeholderTextColor={colors.gray600}
            />
          </View>

          {/* 예약번호(여행사 예약번호) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>예약번호 (여행사 예약 번호)</Text>
            <Input
              variant="filled"
              placeholder="예약번호를 입력하세요."
              value={formData.booking_reference}
              onChangeText={(text) => setFormData({ ...formData, booking_reference: text })}
              style={styles.input}
              placeholderTextColor={colors.gray600}
            />
          </View>

          {/* 날짜 */}
          <View style={[styles.inputGroup, styles.datePickerWrapper, { zIndex: showDatePicker ? 20000 : 1 }]}>
            <Text style={styles.label}>날짜</Text>
            <Pressable style={styles.dateInput} onPress={() => setShowDatePicker(!showDatePicker)}>
              <View style={styles.dateTextContainer}>
                <Text style={expenseDate ? styles.dateText : styles.placeholderText}>
                  {expenseDate ? dayjs(expenseDate).format('YYYY. MM. DD') : '날짜를 선택하세요.'}
                </Text>
                <View style={styles.iconWrapper}>
                  <CalendarIcon width={16} height={16} />
                </View>
              </View>
            </Pressable>
            <BaseCalendar
              visible={showDatePicker}
              selectedDate={expenseDate}
              onDayPress={(day) => {
                setExpenseDate(day.dateString);
                setShowDatePicker(false);
              }}
              onClose={() => setShowDatePicker(false)}
              style={styles.calendarPopup}
            />
          </View>

          {/* 항공료 / 통화 */}
          <View style={[styles.row, { gap: spacing.sm }]}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>항공료</Text>
              <Input
                variant="filled"
                placeholder={PLACEHOLDERS.expense.amount}
                value={expenseData.amount.toString()}
                onChangeText={(text) => setExpenseData({ ...expenseData, amount: text.replace(/[^0-9]/g, '') })}
                keyboardType="numeric"
                style={styles.input}
                placeholderTextColor={colors.gray600}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth, { zIndex: currencyOpen ? 10001 : 1 }]}>
              <Text style={styles.label}>통화</Text>
              <View style={styles.currencyPickerWrapper}>
                <DropDownPicker
                  open={currencyOpen}
                  value={expenseData.currency}
                  items={currencyOptions}
                  setOpen={setCurrencyOpen}
                  setValue={(callback: any) => {
                    const next = callback(expenseData.currency) as ExpenseCurrency;
                    setExpenseData({ ...expenseData, currency: next });
                  }}
                  placeholder="통화 선택"
                  style={styles.currencyDropdown}
                  dropDownContainerStyle={styles.currencyDropdownContainer}
                  listMode="SCROLLVIEW"
                  ArrowDownIconComponent={() => <DownArrowIcon width={16} height={16} />}
                  ArrowUpIconComponent={() => <UpperArrowIcon width={16} height={16} />}
                />
              </View>
            </View>
          </View>
        </View>

        {/* 항공편 구간들 */}
        <View style={styles.inputGroup}>
          {flightSegments.map((segment, idx) => (
              <View key={idx} style={styles.segmentContainer}>
                <Text style={styles.segmentTitle}>구간{idx + 1}</Text>
                
                <View style={styles.segmentContent}>
                  {/* 항공사 / 항공편명 */}
                  <View style={[styles.row, { gap: spacing.sm }]}>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                      <Text style={styles.label}>항공사</Text>
                      <Input
                        variant="outlined"
                        placeholder={PLACEHOLDERS.flight.airline}
                        value={segment.airline}
                        onChangeText={(text) => {
                          const newSegments = [...flightSegments];
                          newSegments[idx].airline = text;
                          setFlightSegments(newSegments);
                        }}
                        style={styles.segmentInput}
                        placeholderTextColor={colors.gray600}
                      />
                    </View>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                      <Text style={styles.label}>항공편명</Text>
                      <Input
                        variant="outlined"
                        placeholder={PLACEHOLDERS.flight.flightNumber}
                        value={segment.flight_number}
                        onChangeText={(text) => {
                          const newSegments = [...flightSegments];
                          newSegments[idx].flight_number = text;
                          setFlightSegments(newSegments);
                        }}
                        style={styles.segmentInput}
                        placeholderTextColor={colors.gray600}
                      />
                    </View>
                  </View>

                  {/* 출발 공항 / 도착 공항 */}
                  <View style={[styles.row, { gap: spacing.sm, zIndex: airportOpen ? 10001 : 1 }]}>
                    <View style={[styles.inputGroup, styles.halfWidth, styles.airportPickerWrapper]}>
                      <Text style={styles.label}>출발 공항</Text>
                      <AirportPicker
                        value={segment.departure_airport}
                        onChange={(code) => {
                          const newSegments = [...flightSegments];
                          newSegments[idx].departure_airport = code;
                          setFlightSegments(newSegments);
                        }}
                        placeholder={PLACEHOLDERS.flight.departureAirport}
                      />
                    </View>
                    <View style={[styles.inputGroup, styles.halfWidth, styles.airportPickerWrapper]}>
                      <Text style={styles.label}>도착 공항</Text>
                      <AirportPicker
                        value={segment.arrival_airport}
                        onChange={(code) => {
                          const newSegments = [...flightSegments];
                          newSegments[idx].arrival_airport = code;
                          setFlightSegments(newSegments);
                        }}
                        placeholder={PLACEHOLDERS.flight.arrivalAirport}
                      />
                    </View>
                  </View>

                  {/* 출발 일자 / 출발 시간 */}
                  <View style={[styles.row, { gap: spacing.sm }]}>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                      <Text style={styles.label}>출발 일자</Text>
                      <Pressable 
                        style={styles.segmentDateInput} 
                        onPress={() => {
                          const key = `dep_${idx}`;
                          setSegmentDatePickerOpen({ ...segmentDatePickerOpen, [key]: true });
                        }}
                      >
                        <Text style={segment.departure_date ? styles.segmentDateText : styles.segmentPlaceholderText}>
                          {segment.departure_date ? dayjs(segment.departure_date).format('YYYY. MM. DD') : '기타'}
                        </Text>
                      </Pressable>
                      {segmentDatePickerOpen[`dep_${idx}`] && (
                        <BaseCalendar
                          visible={true}
                          selectedDate={segment.departure_date}
                          onDayPress={(day) => {
                            const newSegments = [...flightSegments];
                            newSegments[idx].departure_date = day.dateString;
                            setFlightSegments(newSegments);
                            const key = `dep_${idx}`;
                            setSegmentDatePickerOpen({ ...segmentDatePickerOpen, [key]: false });
                          }}
                          onClose={() => {
                            const key = `dep_${idx}`;
                            setSegmentDatePickerOpen({ ...segmentDatePickerOpen, [key]: false });
                          }}
                          style={styles.calendarPopup}
                          minDate={idx > 0 ? flightSegments[idx - 1].arrival_date : undefined}
                        />
                      )}
                    </View>
                    <View style={[styles.inputGroup, styles.halfWidth, { zIndex: timeOpen ? 10001 : 1 }]}>
                      <Text style={styles.label}>출발 시간</Text>
                      <TimePicker
                        value={segment.departure_time}
                        onChange={(time) => {
                          const newSegments = [...flightSegments];
                          newSegments[idx].departure_time = time;
                          setFlightSegments(newSegments);
                        }}
                        onOpen={() => setTimeOpen(true)}
                        onClose={() => setTimeOpen(false)}
                        minTime={idx > 0 && segment.departure_date === flightSegments[idx - 1].arrival_date ? flightSegments[idx - 1].arrival_time : undefined}
                        style={styles.segmentTimePicker}
                      />
                    </View>
                  </View>

                  {/* 도착 일자 / 도착 시간 */}
                  <View style={[styles.row, { gap: spacing.sm }]}>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                      <Text style={styles.label}>도착 일자</Text>
                      <Pressable 
                        style={styles.segmentDateInput} 
                        onPress={() => {
                          const key = `arr_${idx}`;
                          setSegmentDatePickerOpen({ ...segmentDatePickerOpen, [key]: true });
                        }}
                      >
                        <Text style={segment.arrival_date ? styles.segmentDateText : styles.segmentPlaceholderText}>
                          {segment.arrival_date ? dayjs(segment.arrival_date).format('YYYY. MM. DD') : '기타'}
                        </Text>
                      </Pressable>
                      {segmentDatePickerOpen[`arr_${idx}`] && (
                        <BaseCalendar
                          visible={true}
                          selectedDate={segment.arrival_date}
                          onDayPress={(day) => {
                            const newSegments = [...flightSegments];
                            newSegments[idx].arrival_date = day.dateString;
                            setFlightSegments(newSegments);
                            const key = `arr_${idx}`;
                            setSegmentDatePickerOpen({ ...segmentDatePickerOpen, [key]: false });
                          }}
                          onClose={() => {
                            const key = `arr_${idx}`;
                            setSegmentDatePickerOpen({ ...segmentDatePickerOpen, [key]: false });
                          }}
                          style={styles.calendarPopup}
                          minDate={segment.departure_date}
                        />
                      )}
                    </View>
                    <View style={[styles.inputGroup, styles.halfWidth, { zIndex: timeOpen ? 10001 : 1 }]}>
                      <Text style={styles.label}>도착 시간</Text>
                      <TimePicker
                        value={segment.arrival_time}
                        onChange={(time) => {
                          const newSegments = [...flightSegments];
                          newSegments[idx].arrival_time = time;
                          setFlightSegments(newSegments);
                        }}
                        onOpen={() => setTimeOpen(true)}
                        onClose={() => setTimeOpen(false)}
                        minTime={segment.arrival_date === segment.departure_date ? segment.departure_time : undefined}
                        style={styles.segmentTimePicker}
                      />
                    </View>
                  </View>

                  {/* 구간 내부 버튼 */}
                  <View style={styles.segmentButtonRow}>
                    <Pressable
                      style={styles.segmentCancelButton}
                      onPress={() => {
                        if (flightSegments.length > 1) {
                          setFlightSegments(prev => prev.filter((_, i) => i !== idx));
                        } else {
                          onCancel();
                        }
                      }}
                    >
                      <Text style={styles.segmentCancelButtonText}>취소</Text>
                    </Pressable>
                    <Pressable
                      style={styles.segmentAddButton}
                      onPress={() => {
                        const now = dayjs();
                        const later = dayjs().add(1, 'hour');
                        const newSegment: SegmentForm = {
                          airline: '',
                          flight_number: '',
                          departure_airport: '',
                          arrival_airport: '',
                          departure_date: now.format('YYYY-MM-DD'),
                          departure_time: now.format('HH:mm'),
                          arrival_date: later.format('YYYY-MM-DD'),
                          arrival_time: later.format('HH:mm'),
                        };
                        setFlightSegments(prev => [...prev, newSegment]);
                      }}
                    >
                      <Text style={styles.segmentAddButtonText}>추가</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}

          {/* 항공권 구간 추가 버튼 */}
          <Pressable
            style={styles.addSegmentButton}
            onPress={() => {
              const now = dayjs();
              const later = dayjs().add(1, 'hour');
              const newSegment: SegmentForm = {
                airline: '',
                flight_number: '',
                departure_airport: '',
                arrival_airport: '',
                departure_date: now.format('YYYY-MM-DD'),
                departure_time: now.format('HH:mm'),
                arrival_date: later.format('YYYY-MM-DD'),
                arrival_time: later.format('HH:mm'),
              };
              setFlightSegments(prev => [...prev, newSegment]);
            }}
          >
            <View style={styles.addIconWrapper}>
              <AddIcon width={16} height={16} />
            </View>
            <Text style={styles.addSegmentButtonText}>항공권 구간 추가</Text>
          </Pressable>
        </View>

        {/* 하단 버튼 */}
        <View style={styles.buttonRow}>
          <Pressable
            style={styles.deleteButton}
            onPress={flight && onDelete ? handleDelete : onCancel}
          >
            <Text style={styles.deleteButtonText}>삭제</Text>
          </Pressable>
          <Pressable
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Text style={styles.saveButtonText}>
              {isLoading ? '저장 중...' : '저장'}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  contentContainer: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  contentWrapper: {
    position: 'relative',
    overflow: 'visible',
    gap: spacing.lg,
  },
  title: {
    ...textStyles.h5,
    marginBottom: spacing.xl,
  },
  formSection: {
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    overflow: 'visible',
    position: 'relative',
  },
  inputGroup: {
    gap: spacing.sm,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    ...textStyles.h8,
    color: colors.black,
  },
  input: {
    backgroundColor: colors.gray300,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...textStyles.body4,
  },
  datePickerWrapper: {
    position: 'relative',
    overflow: 'visible',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.gray300,
    minHeight: 40,
  },
  dateTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  dateText: {
    ...textStyles.body4,
    color: colors.black,
  },
  placeholderText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  iconWrapper: {
    marginTop: -2,
  },
  calendarPopup: {
    position: 'absolute',
    top: 70,
    left: 0,
    zIndex: 20000,
  },
  currencyPickerWrapper: {
    position: 'relative',
  },
  currencyDropdown: {
    borderRadius: radii.md,
    backgroundColor: colors.gray300,
    borderWidth: 0,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  currencyDropdownContainer: {
    borderRadius: radii.md,
    backgroundColor: colors.gray300,
  },
  segmentContainer: {
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  segmentTitle: {
    ...textStyles.h6,
    color: colors.black,
  },
  segmentContent: {
    gap: spacing.lg,
  },
  segmentInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    height: 40,
  },
  segmentDateInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    height: 40,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  segmentDateText: {
    ...textStyles.body4,
    color: colors.gray800,
  },
  segmentPlaceholderText: {
    ...textStyles.body4,
    color: colors.gray800,
  },
  segmentTimePicker: {
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    height: 40,
  },
  airportPickerWrapper: {
    overflow: 'visible',
    position: 'relative',
    zIndex: 8000,
  },
  segmentButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  segmentCancelButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 8,
    height: 32,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  segmentCancelButtonText: {
    ...textStyles.h8,
    color: colors.black,
  },
  segmentAddButton: {
    backgroundColor: colors.gray900,
    borderRadius: 8,
    height: 32,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  segmentAddButtonText: {
    ...textStyles.h8,
    color: colors.white,
  },
  addSegmentButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 8,
    height: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  addIconWrapper: {
    marginTop: -2,
  },
  addSegmentButtonText: {
    ...textStyles.h8,
    color: colors.black,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  deleteButton: {
    backgroundColor: colors.gray300,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray400,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  deleteButtonText: {
    ...textStyles.h8,
    color: colors.black,
  },
  saveButton: {
    backgroundColor: colors.gray900,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  saveButtonText: {
    ...textStyles.h8,
    color: colors.white,
  },
});
