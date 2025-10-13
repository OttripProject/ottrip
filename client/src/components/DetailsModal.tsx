import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { List } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import ModalLayout from './ModalLayout';
import ItineraryItem from './items/ItineraryItem';
import FlightItem from './items/FlightItem';
import AccommodationItem from './items/AccommodationItem';

interface DetailsModalProps {
  planData?: {
    plan: any;
    itineraries: any[];
    flights: any[];
    accommodations: any[];
    expenses: any[];
    isLoading: boolean;
    error: string | null;
    refreshItineraries: () => Promise<void>;
    refreshFlights: () => Promise<void>;
    refreshAccommodations: () => Promise<void>;
    refreshExpenses: () => Promise<void>;
  };
  selectedItinerary?: any;
  onItineraryAdd?: (itinerary: any) => void;
  onFlightAdd?: (flight: any) => void;
  onAccommodationAdd?: (accommodation: any) => void;
  onExpenseAdd?: (expense: any) => void;
}

interface Flight {
  id: string;
  airline: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  seat_class: string;
  seat_number: string;
  duration: string;
}

interface Accommodation {
  id: string;
  name: string;
  place?: string;
  country: string;
  city: string;
  checkin_date: string;
  checkout_date: string;
  description: string;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  ex_date: string;
  currency: string;
}

enum ExpenseCategory {
  FOOD = "food",
  TRANSPORT = "transport",
  FLIGHT = "flight",
  ACTIVITY = "activity",
  ACCOMMODATION = "accommodation",
  SHOPPING = "shopping",
  ETC = "etc",
}

enum ExpenseCurrency {
  KRW = "KRW",
  USD = "USD",
  EUR = "EUR",
  JPY = "JPY",
  CNY = "CNY",
  GBP = "GBP",
  AUD = "AUD",
}

function Placeholder({ label }: { label: string }) {
  return (
    <View style={{ padding: 16 }}>
      <Text>{label} – Coming soon…</Text>
    </View>
  );
}

export default function DetailsModal({ planData, selectedItinerary, onItineraryAdd: externalOnItineraryAdd, onFlightAdd: externalOnFlightAdd, onAccommodationAdd: externalOnAccommodationAdd, onExpenseAdd: externalOnExpenseAdd }: DetailsModalProps) {
    const [open, setOpen] = useState<string | undefined>();
    const [showItineraryForm, setShowItineraryForm] = useState(false);
    const [showFlightForm, setShowFlightForm] = useState(false);
    const [showAccommodationForm, setShowAccommodationForm] = useState(false);
    const [editingItinerary, setEditingItinerary] = useState<any | null>(null);
    const [editingFlight, setEditingFlight] = useState<any | null>(null);
    const [editingAccommodation, setEditingAccommodation] = useState<any | null>(null);

    const handleItinerarySave = async (itinerary: any) => {
      externalOnItineraryAdd?.(itinerary);
      setShowItineraryForm(false);
      setEditingItinerary(null);
      // 일정 목록 새로고침
      if (planData?.refreshItineraries) {
        await planData.refreshItineraries();
      }
      // 지출 목록 새로고침
      if (planData?.refreshExpenses) {
        planData.refreshExpenses();
      }
    };

    const handleFlightSave = (flight: any) => {
      externalOnFlightAdd?.(flight);
      setShowFlightForm(false);
      setEditingFlight(null);
      // 지출 목록 새로고침
      if (planData?.refreshExpenses) {
        planData.refreshExpenses();
      }
    };

    const handleAccommodationSave = (accommodation: any) => {
      externalOnAccommodationAdd?.(accommodation);
      setShowAccommodationForm(false);
      setEditingAccommodation(null);
      // 지출 목록 새로고침
      if (planData?.refreshExpenses) {
        planData.refreshExpenses();
      }
    };

    const handleItineraryDelete = (itineraryId: string) => {
      // 삭제 후 목록 새로고침
      planData?.refreshItineraries();
    };

    const handleFlightDelete = (flightId: string) => {
      // 삭제 후 목록 새로고침
      planData?.refreshFlights();
    };

    const handleAccommodationDelete = (accommodationId: string) => {
      // 삭제 후 목록 새로고침
      planData?.refreshAccommodations();
    };

    if (!planData?.plan) {
      return (
        <ModalLayout style={styles.container}>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>여행을 선택해주세요</Text>
          </View>
        </ModalLayout>
      );
    }

  return (
    <ModalLayout style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        <View style={styles.sectionsContainer}>
          {/* 일정 섹션 */}
          <View style={styles.section}>
            <Pressable 
              style={styles.sectionHeader}
              onPress={() => setOpen(open === 'itinerary' ? undefined : 'itinerary')}
            >
              <View style={styles.sectionHeaderLeft}>
                <MaterialIcons name="event" size={24} color="#666" />
                <Text style={styles.sectionTitle}>일정</Text>
              </View>
              <MaterialIcons 
                name={open === 'itinerary' ? 'expand-less' : 'expand-more'} 
                size={24} 
                color="#666" 
              />
            </Pressable>
            
            {open === 'itinerary' && (
              <View style={styles.sectionContent}>
                {planData.itineraries.map((itinerary: any) => (
                  <Pressable 
                    key={itinerary.id} 
                    style={styles.itemCard}
                    onPress={() => {
                      if (editingItinerary?.id === itinerary.id && showItineraryForm) {
                        // 같은 아이템을 다시 누르면 편집창 닫기
                        setShowItineraryForm(false);
                        setEditingItinerary(null);
                      } else {
                        // 다른 아이템을 누르거나 편집창이 닫혀있으면 편집창 열기
                        setEditingItinerary(itinerary);
                        setShowItineraryForm(true);
                      }
                    }}
                  >
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{itinerary.title}</Text>
                      <Text style={styles.cardSubtitle}>
                        {itinerary.itineraryDate} | {itinerary.startTime} - {itinerary.endTime}
                      </Text>                      
                      <Text style={styles.cardLocation}>📍 {itinerary.country} | {itinerary.city} | {itinerary.location}</Text>
                    </View>
                    <Text style={styles.cardArrow}>›</Text>
                  </Pressable>
                ))}
                
                {showItineraryForm && (
                  <ItineraryItem
                    itinerary={editingItinerary}
                    planId={planData.plan.id}
                    onSave={handleItinerarySave}
                    onCancel={() => {
                      setShowItineraryForm(false);
                      setEditingItinerary(null);
                    }}
                    onDelete={handleItineraryDelete}
                    onExpenseUpdate={planData.refreshExpenses}
                  />
                )}
                
                {!showItineraryForm && (
                  <Pressable
                    style={styles.addButton}
                    onPress={() => setShowItineraryForm(true)}
                  >
                    <Text style={styles.addButtonText}>일정 추가</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* 항공 섹션 */}
          <View style={styles.section}>
            <Pressable 
              style={styles.sectionHeader}
              onPress={() => setOpen(open === 'flights' ? undefined : 'flights')}
            >
              <View style={styles.sectionHeaderLeft}>
                <MaterialIcons name="flight" size={24} color="#666" />
                <Text style={styles.sectionTitle}>항공</Text>
              </View>
              <MaterialIcons 
                name={open === 'flights' ? 'expand-less' : 'expand-more'} 
                size={24} 
                color="#666" 
              />
            </Pressable>
            
            {open === 'flights' && (
              <View style={styles.sectionContent}>
                {planData.flights.map((flight: Flight) => (
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
                      {(flight as any).flightSegments && (flight as any).flightSegments.length > 0 && (
                        <>
                          <Text style={styles.cardTitle}>
                            {(flight as any).reservationNumber}
                          </Text>
                          
                          {(flight as any).flightSegments.map((segment: any, index: number) => (
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
            )}
          </View>

          {/* 숙박 섹션 */}
          <View style={styles.section}>
            <Pressable 
              style={styles.sectionHeader}
              onPress={() => setOpen(open === 'accommodations' ? undefined : 'accommodations')}
            >
              <View style={styles.sectionHeaderLeft}>
                <MaterialIcons name="hotel" size={24} color="#666" />
                <Text style={styles.sectionTitle}>숙박</Text>
              </View>
              <MaterialIcons 
                name={open === 'accommodations' ? 'expand-less' : 'expand-more'} 
                size={24} 
                color="#666" 
              />
            </Pressable>
            
            {open === 'accommodations' && (
              <View style={styles.sectionContent}>
                {planData.accommodations.map((accommodation: Accommodation) => (
                  <Pressable 
                    key={accommodation.id} 
                    style={styles.itemCard}
                    onPress={() => {
                      if (editingAccommodation?.id === accommodation.id && showAccommodationForm) {
                        // 같은 아이템을 다시 누르면 편집창 닫기
                        setShowAccommodationForm(false);
                        setEditingAccommodation(null);
                      } else {
                        // 다른 아이템을 누르거나 편집창이 닫혀있으면 편집창 열기
                        setEditingAccommodation(accommodation);
                        setShowAccommodationForm(true);
                      }
                    }}
                  >
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{accommodation.name}</Text>
                      <Text style={styles.cardSubtitle}>
                      {dayjs((accommodation as any).checkinDate).format('MM/DD')} - {dayjs((accommodation as any).checkoutDate).format('MM/DD')}
                        {/* {(accommodation as any).checkinDate} - {(accommodation as any).checkoutDate} */}
                      </Text>
                      {accommodation.place && (
                        <Text style={styles.cardLocation}>📍 {accommodation.place}</Text>
                      )}
                    </View>
                    <Text style={styles.cardArrow}>›</Text>
                  </Pressable>
                ))}
                
                {showAccommodationForm && (
                  <AccommodationItem
                    accommodation={editingAccommodation}
                    planId={planData.plan.id}
                    onSave={handleAccommodationSave}
                    onCancel={() => {
                      setShowAccommodationForm(false);
                      setEditingAccommodation(null);
                    }}
                    onDelete={handleAccommodationDelete}
                  />
                )}
                
                {!showAccommodationForm && (
                  <Pressable
                    style={styles.addButton}
                    onPress={() => setShowAccommodationForm(true)}
                  >
                    <Text style={styles.addButtonText}>숙박 추가</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </View>
        </ScrollView>
      </ModalLayout>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 0,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionsContainer: {
    padding: 0,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
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
  sectionContent: {
    padding: 16,
    paddingBottom: 20,
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
  cardLocation: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
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
});
