import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import ModalLayout from './ModalLayout';
import FlightItem from '../items/FlightItem';

interface FlightModalProps {
  planData?: {
    plan: any;
    flights: any[];
    itineraries: any[];
    accommodations: any[];
    isLoading: boolean;
    error: string | null;
    refreshFlights: () => Promise<void>;
    refreshExpenses: () => Promise<void>;
  };
  onFlightAdd?: (flight: any) => void;
  onClose?: () => void;
}

export default function FlightModal({ 
  planData, 
  onFlightAdd, 
  onClose 
}: FlightModalProps) {
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [editingFlight, setEditingFlight] = useState<any | null>(null);

  const handleFlightSave = (flight: any) => {
    onFlightAdd?.(flight);
    setShowFlightForm(false);
    setEditingFlight(null);
    // 지출 목록 새로고침
    if (planData?.refreshExpenses) {
      planData.refreshExpenses();
    }
  };

  const handleFlightDelete = (flightId: string) => {
    // 삭제 후 목록 새로고침
    planData?.refreshFlights();
    // 상세 내용 닫기
    setShowFlightForm(false);
    setEditingFlight(null);
  };

  if (!planData?.plan) {
    return (
      <ModalLayout style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>항공</Text>
          {onClose && (
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </Pressable>
          )}
        </View>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>여행을 선택해주세요</Text>
        </View>
      </ModalLayout>
    );
  }

  return (
    <ModalLayout style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>항공</Text>
        {onClose && (
          <Pressable onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </Pressable>
        )}
      </View>
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        <View style={styles.content}>
          {planData.flights.map((flight: any) => (
            <Pressable 
              key={flight.id} 
              style={styles.itemCard}
              onPress={() => {
                if (editingFlight?.id === flight.id && showFlightForm) {
                  // 같은 아이템을 다시 누르면 편집창 닫기
                  setShowFlightForm(false);
                  setEditingFlight(null);
                } else {
                  // 다른 아이템을 누르거나 편집창이 닫혀있으면 편집창 열기
                  setEditingFlight(flight);
                  setShowFlightForm(true);
                }
              }}
            >
              <View style={styles.cardContent}>
                {flight.flightSegments && flight.flightSegments.length > 0 && (
                  <>
                    <Text style={styles.cardTitle}>
                      {flight.reservationNumber}
                    </Text>
                    
                    {flight.flightSegments.map((segment: any, index: number) => (
                      <View key={index} style={styles.segmentInfo}>
                        <Text style={styles.cardSubtitle}>
                          {segment.departureAirport} → {segment.arrivalAirport}
                        </Text>
                        <Text style={styles.cardTime}>
                          {dayjs(segment.departureTime).format('MM/DD HH:mm')} - {dayjs(segment.arrivalTime).format('MM/DD HH:mm')}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </Pressable>
          ))}
          
          {showFlightForm && (
            <FlightItem
              flight={editingFlight}
              planId={planData.plan.id}
              onSave={handleFlightSave}
              onCancel={() => {
                setShowFlightForm(false);
                setEditingFlight(null);
              }}
              onDelete={handleFlightDelete}
              existingFlights={planData.flights}
              existingItineraries={planData.itineraries || []}
              existingAccommodations={planData.accommodations || []}
            />
          )}
          
          {!showFlightForm && (
            <Pressable
              style={styles.addButton}
              onPress={() => setShowFlightForm(true)}
            >
              <Text style={styles.addButtonText}>항공편 추가</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </ModalLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  content: {
    padding: 16,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
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
  cardTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
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
});
