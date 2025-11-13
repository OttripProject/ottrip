import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import FlightItem from '../../items/FlightItem';

interface FlightSectionProps {
  planData: {
    plan: any;
    flights: any[];
    itineraries: any[];
    accommodations: any[];
    expenses: any[];
    refreshFlights: () => Promise<void>;
    refreshExpenses: () => Promise<void>;
  };
  selectedFlight?: any;
  activeTab?: 'itinerary' | 'flight' | 'accommodation' | undefined;
  onFlightAdd?: (flight: any) => void;
  openNewFlightForm?: boolean;
  onConsumeOpenNewFlightForm?: () => void;
  onEdit?: (flight: any) => void;
}

export default function FlightSection({
  planData,
  selectedFlight,
  activeTab,
  onFlightAdd,
  openNewFlightForm,
  onConsumeOpenNewFlightForm,
  onEdit,
}: FlightSectionProps) {
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [editingFlight, setEditingFlight] = useState<any | null>(null);

  useEffect(() => {
    if (activeTab === 'flight' && !selectedFlight) {
      if (openNewFlightForm) {
        setEditingFlight(null);
        setShowFlightForm(true);
        onConsumeOpenNewFlightForm?.();
      } else if (!showFlightForm) {
        setEditingFlight(null);
        setShowFlightForm(true);
      }
    }
  }, [activeTab, openNewFlightForm, onConsumeOpenNewFlightForm, selectedFlight, showFlightForm]);

  useEffect(() => {
    if (activeTab === 'flight' && selectedFlight) {
      if (selectedFlight.id) {
        setEditingFlight(selectedFlight);
        setShowFlightForm(false);
      }
    } else if (activeTab === 'flight' && !selectedFlight) {
      setEditingFlight(null);
      setShowFlightForm(false);
    }
  }, [activeTab, selectedFlight]);

  const handleFlightSave = (flight: any) => {
    onFlightAdd?.(flight);
    setShowFlightForm(false);
    setEditingFlight(null);
    if (planData?.refreshExpenses) {
      planData.refreshExpenses();
    }
  };

  const handleFlightDelete = () => {
    planData?.refreshFlights();
    setShowFlightForm(false);
    setEditingFlight(null);
  };

  // 선택된 항공편이 있고 편집 모드가 아닐 때 - 상세 정보 표시
  if (selectedFlight && !showFlightForm) {
    return (
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{selectedFlight.reservationNumber}</Text>
          <Pressable
            style={styles.editButton}
            onPress={() => {
              setEditingFlight(selectedFlight);
              setShowFlightForm(true);
              onEdit?.(selectedFlight);
            }}
          >
            <Text style={styles.editButtonText}>편집</Text>
          </Pressable>
        </View>

        <View style={styles.detailContent}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>예약번호(PNR)</Text>
            <Text style={styles.detailValue}>{selectedFlight.reservationNumber}</Text>
          </View>
          {selectedFlight.ticketNumber && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>항공권 번호</Text>
              <Text style={styles.detailValue}>{selectedFlight.ticketNumber}</Text>
            </View>
          )}
          {selectedFlight.bookingReference && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>예약번호(여행사 예약번호)</Text>
              <Text style={styles.detailValue}>{selectedFlight.bookingReference}</Text>
            </View>
          )}
          {selectedFlight.expense && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>가격</Text>
                <Text style={styles.detailValue}>
                  {selectedFlight.expense.amount?.toLocaleString() || '미설정'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>화폐</Text>
                <Text style={styles.detailValue}>
                  {selectedFlight.expense.currency || '미설정'}
                </Text>
              </View>
            </>
          )}
          {selectedFlight.flightSegments && selectedFlight.flightSegments.length > 0 && (
            <>
              {selectedFlight.flightSegments.map((segment: any, index: number) => (
                <React.Fragment key={index}>
                  <View style={styles.segmentDetail}>
                    <Text style={styles.segmentTitle}>구간 {index + 1}</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>항공사</Text>
                      <Text style={styles.detailValue}>{segment.airline}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>항공편 번호</Text>
                      <Text style={styles.detailValue}>{segment.flightNumber}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>출발 공항</Text>
                      <Text style={styles.detailValue}>{segment.departureAirport}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>도착 공항</Text>
                      <Text style={styles.detailValue}>{segment.arrivalAirport}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>출발 시간</Text>
                      <Text style={styles.detailValue}>
                        {dayjs(segment.departureTime).format('YYYY년 M월 D일 HH:mm')}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>도착 시간</Text>
                      <Text style={styles.detailValue}>
                        {dayjs(segment.arrivalTime).format('YYYY년 M월 D일 HH:mm')}
                      </Text>
                    </View>
                    {segment.seatClass && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>좌석 등급</Text>
                        <Text style={styles.detailValue}>{segment.seatClass}</Text>
                      </View>
                    )}
                    {segment.seatNumber && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>좌석 번호</Text>
                        <Text style={styles.detailValue}>{segment.seatNumber}</Text>
                      </View>
                    )}
                    {segment.terminal && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>터미널</Text>
                        <Text style={styles.detailValue}>{segment.terminal}</Text>
                      </View>
                    )}
                    {segment.gate && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>게이트</Text>
                        <Text style={styles.detailValue}>{segment.gate}</Text>
                      </View>
                    )}
                  </View>
                  {index < selectedFlight.flightSegments.length - 1 && (() => {
                    const next = selectedFlight.flightSegments[index + 1];
                    const diffMin = dayjs(next.departureTime).diff(
                      dayjs(segment.arrivalTime),
                      'minute'
                    );
                    const valid = Number.isFinite(diffMin) && diffMin >= 0;
                    const h = valid ? Math.floor(diffMin / 60) : 0;
                    const m = valid ? diffMin % 60 : 0;
                    const label = valid
                      ? `경유 시간: ${h}시간 ${m}분`
                      : '경유 시간: 계산 불가';
                    return (
                      <View style={styles.layoverRow}>
                        <Text style={styles.layoverText}>{label}</Text>
                      </View>
                    );
                  })()}
                </React.Fragment>
              ))}
            </>
          )}
        </View>
      </View>
    );
  }

  // 편집 폼 표시
  if (showFlightForm) {
    return (
      <FlightItem
        key={editingFlight?.id ?? 'new-flight'}
        flight={editingFlight}
        planId={planData.plan.id}
        onSave={handleFlightSave}
        onCancel={() => {
          setShowFlightForm(false);
          setEditingFlight(null);
        }}
        onDelete={handleFlightDelete}
        existingFlights={planData.flights}
        existingItineraries={planData.itineraries}
        existingAccommodations={planData.accommodations}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  sectionContent: {
    padding: 16,
    paddingBottom: 20,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  cardArrow: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  segmentInfo: {
    marginTop: 4,
  },
  cardTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  detailContainer: {
    padding: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  detailContent: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    width: 80,
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  segmentDetail: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  segmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  layoverRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  layoverText: {
    fontSize: 12,
    color: '#6b7280',
  },
});

