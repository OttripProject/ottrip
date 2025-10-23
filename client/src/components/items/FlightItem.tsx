import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import DateTimePicker from '@/components/DateTimePicker';
import dayjs from 'dayjs';
import { flightsApi } from '@/services/flights';
import { ExpenseCurrency, ExpenseCategory } from '@/types/expense';

interface FlightItemProps {
  flight?: any;
  planId: number;
  onSave: (flight: any) => void;
  onCancel: () => void;
  onDelete?: (flightId: string) => void;
}

export default function FlightItem({ 
  flight, 
  planId, 
  onSave, 
  onCancel, 
  onDelete 
}: FlightItemProps) {
  const [formData, setFormData] = useState({
    reservation_number: flight?.reservationNumber || flight?.reservation_number || '',
    passenger_name: flight?.passengerName || flight?.passenger_name || '',
    ticket_number: flight?.ticketNumber || flight?.ticket_number || '',
    booking_reference: flight?.bookingReference || flight?.booking_reference || '',
  });

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
    departure_time: string; // 'YYYY-MM-DD HH:mm'
    arrival_time: string;   // 'YYYY-MM-DD HH:mm'
    seat_class?: string;
    seat_number?: string;
    gate?: string;
    terminal?: string;
  };

  const [flightSegments, setFlightSegments] = useState<SegmentForm[]>(() => {
    if (flight?.flightSegments && flight.flightSegments.length > 0) {
      // 편집 모드: 기존 segments 데이터 사용
      return flight.flightSegments.map((segment: any) => ({
        airline: segment.airline || '',
        flight_number: segment.flightNumber || '',
        departure_airport: segment.departureAirport || '',
        arrival_airport: segment.arrivalAirport || '',
        departure_time: segment.departureTime ? dayjs(segment.departureTime).format('YYYY-MM-DD HH:mm') : dayjs().format('YYYY-MM-DD HH:mm'),
        arrival_time: segment.arrivalTime ? dayjs(segment.arrivalTime).format('YYYY-MM-DD HH:mm') : dayjs().add(1, 'hour').format('YYYY-MM-DD HH:mm'),
        seat_class: segment.seatClass || '',
        seat_number: segment.seatNumber || '',
        gate: segment.gate || '',
        terminal: segment.terminal || '',
      }));
    } else {
      // 새 항공편: 기본값
      return [{
        airline: '',
        flight_number: '',
        departure_airport: '',
        arrival_airport: '',
        departure_time: dayjs().format('YYYY-MM-DD HH:mm'),
        arrival_time: dayjs().add(1, 'hour').format('YYYY-MM-DD HH:mm'),
        seat_class: '',
        seat_number: '',
        gate: '',
        terminal: '',
      }];
    }
  });



  const [isLoading, setIsLoading] = useState(false);

  const firstSegment = flightSegments[0];
  const isFirstSegmentValid = Boolean(
    firstSegment &&
    firstSegment.airline.trim() &&
    firstSegment.flight_number.trim() &&
    firstSegment.departure_airport.trim() &&
    firstSegment.arrival_airport.trim() &&
    String(firstSegment.departure_time || '').trim() &&
    String(firstSegment.arrival_time || '').trim()
  );

  const handleSave = async () => {
    if (!formData.reservation_number.trim() || !formData.passenger_name.trim() || !isFirstSegmentValid) {
      return;
    }

    setIsLoading(true);
    try {
      let savedFlight;
      const toIso = (dt: string) => {
        if (!dt) return dt;
        const [date, time] = dt.split(' ');
        const timeWithSeconds = (time && time.length === 5) ? `${time}:00` : time;
        return `${date}T${timeWithSeconds}`;
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
            departureTime: toIso(s.departure_time),
            arrivalTime: toIso(s.arrival_time),
            seatClass: s.seat_class || null,
            seatNumber: s.seat_number || null,
            gate: s.gate || null,
            terminal: s.terminal || null,
          })),
          expense: {
            exDate: flightSegments[0].departure_time.split(' ')[0],
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
            departureTime: toIso(s.departure_time),
            arrivalTime: toIso(s.arrival_time),
            seatClass: s.seat_class || null,
            seatNumber: s.seat_number || null,
            gate: s.gate || null,
            terminal: s.terminal || null,
          })),
          expense: {
            exDate: flightSegments[0].departure_time.split(' ')[0],
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{flight ? '항공편 편집' : '항공편 추가'}</Text>
      </View>
      
      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>예약번호(PNR) *</Text>
          <TextInput
            style={styles.input}
            placeholder="F8SKRQ"
            value={formData.reservation_number}
            onChangeText={(text) => setFormData({ ...formData, reservation_number: text })}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>승객명 *</Text>
          <TextInput
            style={styles.input}
            placeholder="김오티"
            value={formData.passenger_name}
            onChangeText={(text) => setFormData({ ...formData, passenger_name: text })}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>항공권 번호</Text>
          <TextInput
            style={styles.input}
            placeholder=""
            value={formData.ticket_number}
            onChangeText={(text) => setFormData({ ...formData, ticket_number: text })}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>예약번호(여행사 예약번호)</Text>
          <TextInput
            style={styles.input}
            placeholder="1234-5678"
            value={formData.booking_reference}
            onChangeText={(text) => setFormData({ ...formData, booking_reference: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>항공료</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder="금액"
            value={expenseData.amount}
            onChangeText={(text) => setExpenseData({ ...expenseData, amount: text.replace(/[^0-9]/g, '') })}
            keyboardType="numeric"
          />
          <View style={{ width: 120 }}>
            <TextInput
              style={styles.input}
              placeholder="통화"
              value={expenseData.currency}
              onChangeText={(text) => setExpenseData({ ...expenseData, currency: text })}
            />
          </View>
        </View>
      </View>

      {/* 항공편 구간들 */}
      {flightSegments.map((segment, idx) => (
        <View key={idx} style={[styles.segmentContainer, { marginBottom: 16 }]}>
          <Text style={styles.segmentTitle}>구간 {idx + 1}</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>항공사 *</Text>
              <TextInput
                style={styles.input}
                placeholder="오티항공"
                value={segment.airline}
                onChangeText={(text) => {
                  const newSegments = [...flightSegments];
                  newSegments[idx].airline = text;
                  setFlightSegments(newSegments);
                }}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>항공편 번호 *</Text>
              <TextInput
                style={styles.input}
                placeholder="EY0827"
                value={segment.flight_number}
                onChangeText={(text) => {
                  const newSegments = [...flightSegments];
                  newSegments[idx].flight_number = text;
                  setFlightSegments(newSegments);
                }}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>출발 공항 *</Text>
              <TextInput
                style={styles.input}
                placeholder="인천"
                value={segment.departure_airport}
                onChangeText={(text) => {
                  const newSegments = [...flightSegments];
                  newSegments[idx].departure_airport = text;
                  setFlightSegments(newSegments);
                }}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>도착 공항 *</Text>
              <TextInput
                style={styles.input}
                placeholder="런던"
                value={segment.arrival_airport}
                onChangeText={(text) => {
                  const newSegments = [...flightSegments];
                  newSegments[idx].arrival_airport = text;
                  setFlightSegments(newSegments);
                }}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>출발 시간 *</Text>
              <DateTimePicker
                value={segment.departure_time}
                onChange={(datetime) => {
                  const newSegments = [...flightSegments];
                  newSegments[idx].departure_time = datetime;
                  setFlightSegments(newSegments);
                }}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>도착 시간 *</Text>
              <DateTimePicker
                value={segment.arrival_time}
                onChange={(datetime) => {
                  const newSegments = [...flightSegments];
                  newSegments[idx].arrival_time = datetime;
                  setFlightSegments(newSegments);
                }}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>좌석 등급</Text>
              <TextInput
                style={styles.input}
                placeholder="좌석 등급"
                value={segment.seat_class || ''}
                onChangeText={(text) => {
                  const newSegments = [...flightSegments];
                  newSegments[idx].seat_class = text;
                  setFlightSegments(newSegments);
                }}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>좌석 번호</Text>
              <TextInput
                style={styles.input}
                placeholder="좌석 번호"
                value={segment.seat_number || ''}
                onChangeText={(text) => {
                  const newSegments = [...flightSegments];
                  newSegments[idx].seat_number = text;
                  setFlightSegments(newSegments);
                }}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>터미널</Text>
              <TextInput
                style={styles.input}
                placeholder="T1"
                value={segment.terminal || ''}
                onChangeText={(text) => {
                  const newSegments = [...flightSegments];
                  newSegments[idx].terminal = text;
                  setFlightSegments(newSegments);
                }}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>게이트</Text>
              <TextInput
                style={styles.input}
                placeholder="G12"
                value={segment.gate || ''}
                onChangeText={(text) => {
                  const newSegments = [...flightSegments];
                  newSegments[idx].gate = text;
                  setFlightSegments(newSegments);
                }}
              />
            </View>
          </View>

          {flightSegments.length > 1 && (
            <View style={styles.segmentActions}>
              <Pressable
                style={[styles.button, styles.deleteButton]}
                onPress={() => {
                  setFlightSegments(prev => prev.filter((_, i) => i !== idx));
                }}
              >
                <Text style={styles.deleteButtonText}>구간 삭제</Text>
              </Pressable>
            </View>
          )}
        </View>
      ))}

      <Pressable
        style={[styles.button, styles.addButton]}
        onPress={() => {
          setFlightSegments(prev => [...prev, {
            airline: '',
            flight_number: '',
            departure_airport: '',
            arrival_airport: '',
            departure_time: dayjs().format('YYYY-MM-DD HH:mm'),
            arrival_time: dayjs().add(1, 'hour').format('YYYY-MM-DD HH:mm'),
            seat_class: '',
            seat_number: '',
            gate: '',
            terminal: '',
          }]);
        }}
      >
        <Text style={styles.addButtonText}>+ 항공편 구간 추가</Text>
      </Pressable>






      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
        >
          <Text style={styles.cancelButtonText}>취소</Text>
        </Pressable>
        
        {flight && onDelete && (
          <Pressable
            style={[styles.button, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Text style={styles.deleteButtonText}>삭제</Text>
          </Pressable>
        )}
        
        <Pressable
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
          disabled={
            isLoading ||
            !formData.reservation_number.trim() ||
            !formData.passenger_name.trim() ||
            !isFirstSegmentValid
          }
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? '저장 중...' : '저장'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  halfInput: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 12,
  },
  halfWidth: {
    flex: 1,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 4,
  },
  textArea: {
    minHeight: 60,
    paddingTop: 8,
    textAlignVertical: 'top',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  segmentContainer: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  segmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  segmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  addButton: {
    backgroundColor: '#10b981',
    marginBottom: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});
