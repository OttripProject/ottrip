import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { List } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import ModalLayout from './ModalLayout';
import ItineraryItem from '../items/ItineraryItem';
import FlightItem from '../items/FlightItem';
import AccommodationItem from '../items/AccommodationItem';

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
  selectedFlight?: any;
  selectedAccommodation?: any;
  activeTab?: 'itinerary' | 'flight' | 'accommodation' | undefined;
  onItineraryAdd?: (itinerary: any) => void;
  onFlightAdd?: (flight: any) => void;
  onAccommodationAdd?: (accommodation: any) => void;
  onAccommodationSelect?: (accommodation: any) => void;
  onExpenseAdd?: (expense: any) => void;
  // 외부에서 새 항공편 폼을 바로 열도록 트리거
  openNewFlightForm?: boolean;
  onConsumeOpenNewFlightForm?: () => void;
  openNewItineraryForm?: boolean;
  onConsumeOpenNewItineraryForm?: () => void;
  selectedItineraryDate?: Date | null;
  openNewAccommodationForm?: boolean;
  onConsumeOpenNewAccommodationForm?: () => void;
  newAccommodationDraft?: any | null;
}


export default function DetailsModal({ planData, selectedItinerary, selectedFlight, selectedAccommodation, activeTab, onItineraryAdd: externalOnItineraryAdd, onFlightAdd: externalOnFlightAdd, onAccommodationAdd: externalOnAccommodationAdd, onAccommodationSelect, onExpenseAdd: externalOnExpenseAdd, openNewFlightForm, onConsumeOpenNewFlightForm, openNewItineraryForm, onConsumeOpenNewItineraryForm, selectedItineraryDate, openNewAccommodationForm, onConsumeOpenNewAccommodationForm, newAccommodationDraft }: DetailsModalProps) {
    const [open, setOpen] = useState<string | undefined>();
    const [showItineraryForm, setShowItineraryForm] = useState(openNewItineraryForm || false);
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

    const handleAccommodationSave = async (accommodation: any) => {
      externalOnAccommodationAdd?.(accommodation);
      setShowAccommodationForm(false);
      setEditingAccommodation(null);
      // 숙박 목록 새로고침
      if (planData?.refreshAccommodations) {
        await planData.refreshAccommodations();
      }
      // 지출 목록 새로고침
      if (planData?.refreshExpenses) {
        planData.refreshExpenses();
      }
      // 새로 생성된 숙박을 선택된 상태로 설정
      onAccommodationSelect?.(accommodation);
    };

    const handleItineraryDelete = (itineraryId: string) => {
      // 삭제 후 목록 새로고침
      planData?.refreshItineraries();
      // 상세 내용 닫기
      setShowItineraryForm(false);
      setEditingItinerary(null);
    };

    const handleFlightDelete = (flightId: string) => {
      // 삭제 후 목록 새로고침
      planData?.refreshFlights();
      // 상세 내용 닫기
      setShowFlightForm(false);
      setEditingFlight(null);
    };

    // 외부 트리거: 일정 탭에서 즉시 새 일정 추가 폼 열기
    React.useEffect(() => {
      if (activeTab === 'itinerary' && openNewItineraryForm) {
        setEditingItinerary(null);
        setShowItineraryForm(true);
        // 즉시 콜백 호출하여 상태 초기화
        onConsumeOpenNewItineraryForm && onConsumeOpenNewItineraryForm();
      }
    }, [activeTab, openNewItineraryForm]);

    // 외부 트리거: 항공 탭에서 즉시 새 항공편 추가 폼 열기
    React.useEffect(() => {
      if (activeTab === 'flight' && openNewFlightForm) {
        setEditingFlight(null);
        setShowFlightForm(true);
        onConsumeOpenNewFlightForm && onConsumeOpenNewFlightForm();
      }
    }, [activeTab, openNewFlightForm, onConsumeOpenNewFlightForm]);

    // 외부 트리거: 숙박 탭에서 즉시 새 숙박 추가 폼 열기
    React.useEffect(() => {
      if (activeTab === 'accommodation' && openNewAccommodationForm) {
        // 새 숙박 생성이므로 null로 설정
        setEditingAccommodation(null);
        setShowAccommodationForm(true);
        onConsumeOpenNewAccommodationForm && onConsumeOpenNewAccommodationForm();
      }
    }, [activeTab, openNewAccommodationForm, onConsumeOpenNewAccommodationForm]);

    const handleAccommodationDelete = (accommodationId: string) => {
      // 삭제 후 목록 새로고침
      planData?.refreshAccommodations();
      // 상세 내용 닫기
      setShowAccommodationForm(false);
      setEditingAccommodation(null);
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

  // 단일 아이템 상세 정보 렌더링
  const renderItemDetail = (item: any, type: 'itinerary' | 'flight' | 'accommodation') => {
    if (type === 'itinerary' && showItineraryForm && editingItinerary?.id === item.id) {
      return (
        <ItineraryItem
          itinerary={editingItinerary}
          planId={planData.plan.id}
          planData={planData}
          onSave={handleItinerarySave}
          onCancel={() => {
            setShowItineraryForm(false);
            setEditingItinerary(null);
          }}
          onDelete={handleItineraryDelete}
          onExpenseUpdate={planData.refreshExpenses}
          selectedDate={selectedItineraryDate || undefined}
        />
      );
    }
    
    if (type === 'flight' && showFlightForm && editingFlight?.id === item.id) {
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
    
    if (type === 'accommodation' && showAccommodationForm && editingAccommodation?.id === item.id) {
      return (
        <AccommodationItem
          accommodation={editingAccommodation}
          draft={newAccommodationDraft}
          planId={planData.plan.id}
          onSave={handleAccommodationSave}
          onCancel={() => {
            setShowAccommodationForm(false);
            setEditingAccommodation(null);
          }}
          onDelete={handleAccommodationDelete}
        />
      );
    }

    return (
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{item.title || item.name || item.reservationNumber}</Text>
          <Pressable 
            style={styles.editButton}
            onPress={() => {
              if (type === 'itinerary') {
                setEditingItinerary(item);
                setShowItineraryForm(true);
              } else if (type === 'flight') {
                setEditingFlight(item);
                setShowFlightForm(true);
              } else if (type === 'accommodation') {
                setEditingAccommodation(item);
                setShowAccommodationForm(true);
              }
            }}
          >
            <Text style={styles.editButtonText}>편집</Text>
          </Pressable>
        </View>
        
        <View style={styles.detailContent}>
          {type === 'itinerary' && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>제목</Text>
                <Text style={styles.detailValue}>{item.title}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>날짜</Text>
                <Text style={styles.detailValue}>{dayjs(item.itineraryDate).format('YYYY년 M월 D일')}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>시작 시간</Text>
                <Text style={styles.detailValue}>{item.startTime ? dayjs(`2000-01-01 ${item.startTime}`).format('HH:mm') : item.startTime}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>종료 시간</Text>
                <Text style={styles.detailValue}>{item.endTime ? dayjs(`2000-01-01 ${item.endTime}`).format('HH:mm') : item.endTime}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>국가</Text>
                <Text style={styles.detailValue}>{item.country}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>도시</Text>
                <Text style={styles.detailValue}>{item.city}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>장소</Text>
                <Text style={styles.detailValue}>{item.location}</Text>
              </View>
              {item.description && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>설명</Text>
                  <Text style={styles.detailValue}>{item.description}</Text>
                </View>
              )}
              
              {/* 연결된 지출 표시 */}
              {(() => {
                const connectedExpenses = planData.expenses.filter((expense: any) => 
                  expense.itineraryId === item.id
                );
                
                if (connectedExpenses.length > 0) {
                  return (
                    <View style={styles.expensesSection}>
                      <Text style={styles.expensesSectionTitle}>지출 내역</Text>
                      {connectedExpenses.map((expense: any) => (
                        <View key={expense.id} style={styles.expenseDetailItem}>
                          <Text style={styles.expenseDetailDescription}>{expense.description}</Text>
                          <Text style={styles.expenseDetailAmount}>
                            {expense.amount.toLocaleString()}원
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                }
                return null;
              })()}
            </>
          )}
          
          {type === 'flight' && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>예약번호(PNR)</Text>
                <Text style={styles.detailValue}>{item.reservationNumber}</Text>
              </View>
              {item.ticketNumber ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>항공권 번호</Text>
                  <Text style={styles.detailValue}>{item.ticketNumber}</Text>
                </View>
              ) : null}
              {item.bookingReference ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>예약번호(여행사 예약번호)</Text>
                  <Text style={styles.detailValue}>{item.bookingReference}</Text>
                </View>
              ) : null}
              {item.expense && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>가격</Text>
                    <Text style={styles.detailValue}>{item.expense.amount?.toLocaleString() || '미설정'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>화폐</Text>
                    <Text style={styles.detailValue}>{item.expense.currency || '미설정'}</Text>
                  </View>
                </>
              )}
              {item.flightSegments && item.flightSegments.length > 0 && (
                <>
                  {item.flightSegments.map((segment: any, index: number) => (
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
                          <Text style={styles.detailValue}>{dayjs(segment.departureTime).format('YYYY년 M월 D일 HH:mm')}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>도착 시간</Text>
                          <Text style={styles.detailValue}>{dayjs(segment.arrivalTime).format('YYYY년 M월 D일 HH:mm')}</Text>
                        </View>
                        {segment.seatClass ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>좌석 등급</Text>
                            <Text style={styles.detailValue}>{segment.seatClass}</Text>
                          </View>
                        ) : null}
                        {segment.seatNumber ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>좌석 번호</Text>
                            <Text style={styles.detailValue}>{segment.seatNumber}</Text>
                          </View>
                        ) : null}
                        {segment.terminal ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>터미널</Text>
                            <Text style={styles.detailValue}>{segment.terminal}</Text>
                          </View>
                        ) : null}
                        {segment.gate ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>게이트</Text>
                            <Text style={styles.detailValue}>{segment.gate}</Text>
                          </View>
                        ) : null}
                      </View>
                      {index < item.flightSegments.length - 1 && (() => {
                        const next = item.flightSegments[index + 1];
                        const diffMin = dayjs(next.departureTime).diff(dayjs(segment.arrivalTime), 'minute');
                        const valid = Number.isFinite(diffMin) && diffMin >= 0;
                        const h = valid ? Math.floor(diffMin / 60) : 0;
                        const m = valid ? diffMin % 60 : 0;
                        const label = valid ? `경유 시간: ${h}시간 ${m}분` : '경유 시간: 계산 불가';
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
            </>
          )}
          
          {type === 'accommodation' && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>숙소명</Text>
                <Text style={styles.detailValue}>{item.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>체크인 날짜</Text>
                <Text style={styles.detailValue}>{dayjs(item.checkinDate).format('YYYY년 M월 D일')}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>체크인 시간</Text>
                <Text style={styles.detailValue}>{item.checkinTime ? dayjs(`2000-01-01 ${item.checkinTime}`).format('HH:mm') : '미설정'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>체크아웃 날짜</Text>
                <Text style={styles.detailValue}>{dayjs(item.checkoutDate).format('YYYY년 M월 D일')}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>체크아웃 시간</Text>
                <Text style={styles.detailValue}>{item.checkoutTime ? dayjs(`2000-01-01 ${item.checkoutTime}`).format('HH:mm') : '미설정'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>국가</Text>
                <Text style={styles.detailValue}>{item.country}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>도시</Text>
                <Text style={styles.detailValue}>{item.city}</Text>
              </View>
              {item.place && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>장소</Text>
                  <Text style={styles.detailValue}>{item.place}</Text>
                </View>
              )}
              {item.accommodationType && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>숙소 타입</Text>
                  <Text style={styles.detailValue}>{item.accommodationType}</Text>
                </View>
              )}
              {item.description && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>설명</Text>
                  <Text style={styles.detailValue}>{item.description}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  // 활성 탭에 따라 표시할 내용 결정
  const renderContent = () => {
    // 단일 아이템이 선택된 경우 - 해당 아이템의 상세 정보 표시
    if (selectedItinerary) {
      return renderItemDetail(selectedItinerary, 'itinerary');
    }
    
    if (selectedFlight) {
      return renderItemDetail(selectedFlight, 'flight');
    }
    
    if (selectedAccommodation) {
      return renderItemDetail(selectedAccommodation, 'accommodation');
    }

    // 아무것도 선택되지 않은 경우 - 리스트 표시
    if (!activeTab) {
      return (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>항목을 선택해주세요</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'itinerary':
        return (
          <View style={styles.sectionContent}>
            {/* 새 일정 폼이 열려있거나 openNewItineraryForm이 true일 때는 리스트 숨김 */}
            {!showItineraryForm && !openNewItineraryForm && planData.itineraries.map((itinerary: any) => (
              <Pressable 
                key={itinerary.id} 
                style={styles.itemCard}
                onPress={() => {
                  if (editingItinerary?.id === itinerary.id && showItineraryForm) {
                    setShowItineraryForm(false);
                    setEditingItinerary(null);
                  } else {
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
                planData={planData}
                onSave={handleItinerarySave}
                onCancel={() => {
                  setShowItineraryForm(false);
                  setEditingItinerary(null);
                }}
                onDelete={handleItineraryDelete}
                onExpenseUpdate={planData.refreshExpenses}
                selectedDate={selectedItineraryDate || undefined}
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
        );

      case 'flight':
        return (
          <View style={styles.sectionContent}>
            {showFlightForm ? (
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
            ) : (
              <>
                {planData.flights.map((flight: any) => (
                  <Pressable 
                    key={flight.id} 
                    style={styles.itemCard}
                    onPress={() => {
                      setEditingFlight(flight);
                      setShowFlightForm(true);
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
                <Pressable
                  style={styles.addButton}
                  onPress={() => setShowFlightForm(true)}
                >
                  <Text style={styles.addButtonText}>항공편 추가</Text>
                </Pressable>
              </>
            )}
          </View>
        );

      case 'accommodation':
        return (
          <View style={styles.sectionContent}>
            {planData.accommodations.map((accommodation: any) => (
              <Pressable 
                key={accommodation.id} 
                style={styles.itemCard}
                onPress={() => {
                  if (editingAccommodation?.id === accommodation.id && showAccommodationForm) {
                    setShowAccommodationForm(false);
                    setEditingAccommodation(null);
                  } else {
                    setEditingAccommodation(accommodation);
                    setShowAccommodationForm(true);
                  }
                }}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{accommodation.name}</Text>
                  <Text style={styles.cardSubtitle}>
                    {dayjs(accommodation.checkinDate).format('MM/DD')} - {dayjs(accommodation.checkoutDate).format('MM/DD')}
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
                draft={newAccommodationDraft}
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
        );

      default:
        return (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>항목을 선택해주세요</Text>
          </View>
        );
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'itinerary': return '일정';
      case 'flight': return '항공';
      case 'accommodation': return '숙박';
      default: return '상세 정보';
    }
  };

  const getTabIcon = () => {
    switch (activeTab) {
      case 'itinerary': return 'event';
      case 'flight': return 'flight';
      case 'accommodation': return 'hotel';
      default: return 'info';
    }
  };

  const isInitial = !activeTab && !selectedItinerary && !selectedFlight && !selectedAccommodation;

  return (
    <ModalLayout style={styles.container}>
      {activeTab && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialIcons name={getTabIcon()} size={24} color="#666" />
            <Text style={styles.headerTitle}>{getTabTitle()}</Text>
          </View>
        </View>
      )}
      <View style={styles.scrollWrapper}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={isInitial ? [styles.scrollContent, styles.centerScroll] : styles.scrollContent}
          showsVerticalScrollIndicator
          bounces={false}
        >
          {renderContent()}
        </ScrollView>
      </View>
    </ModalLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
    padding: 0,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  scrollWrapper: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  centerScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  layoverRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  layoverText: {
    fontSize: 12,
    color: '#6b7280',
  },
  // 단일 아이템 상세 정보 스타일
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
  // 지출 상세 정보 스타일
  expensesSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  expensesSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  expenseDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 6,
  },
  expenseDetailDescription: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  expenseDetailAmount: {
    fontSize: 14,
  },
});
