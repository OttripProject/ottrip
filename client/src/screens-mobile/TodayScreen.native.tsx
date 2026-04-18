import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Modal, Animated, RefreshControl, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { getTodayKoreanDate, formatTime, convertUTCToLocalTime } from '@/utils/dateUtils';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { usePlansQuery } from '@/hooks/usePlansQuery';
import { usePlanDataQuery } from '@/hooks/usePlanDataQuery';
import { useExpensesQuery } from '@/hooks/useExpensesQuery';
import { useQueryClient } from '@tanstack/react-query';
import { Plan, Itinerary, Accommodation, FlightRead, FlightSegmentReadDto } from '@/types/api';
import { categoryLabels } from '@/types/expense';
import { useSelectedPlan } from '@/contexts/SelectedPlanContext';
import ProfileModal from '@/components/modals/mobile/ProfileModal.native';
import PlanSelectModal from '@/components/modals/mobile/PlanSelectModal.native';
import AddPlanModal from '@/components/modals/mobile/AddPlanModal.native';
import ItineraryDetailModal from '@/components/modals/mobile/ItineraryDetailModal.native';
import ItineraryEditModal from '@/components/modals/mobile/ItineraryEditModal.native';
import AccommodationDetailModal from '@/components/modals/mobile/AccommodationDetailModal.native';
import AccommodationEditModal from '@/components/modals/mobile/AccommodationEditModal.native';
import FlightDetailModal from '@/components/modals/mobile/FlightDetailModal.native';
import FlightEditModal from '@/components/modals/mobile/FlightEditModal.native';
import ExpenseDetailModal from '@/components/modals/mobile/ExpenseDetailModal.native';
import AddExpenseModal from '@/components/modals/mobile/AddExpenseModal.native';
import AddScheduleModal from '@/components/modals/mobile/AddScheduleModal.native';
import AddScheduleMethodModal from '@/components/modals/mobile/AddScheduleMethodModal.native';
import AddScheduleWithAiModal from '@/components/modals/mobile/AddScheduleWithAiModal.native';

type AddScheduleFlow = 'closed' | 'method' | 'direct' | 'ai';
import WeeklyChecklistCard from '@/components/cards/WeeklyChecklistCard.native';
import { itinerariesApi } from '@/services/itineraries';
import { accommodationsApi } from '@/services/accommodations';
import { flightsApi } from '@/services/flights';
import SettingIcon from '../../assets/mobile_setting.svg';
import DropdownIcon from '../../assets/mobile_dropdown.svg';
import LocationIcon from '../../assets/mobile_location.svg';
import ExpenseIcon from '../../assets/mobile_expense.svg';
import AccommodationIcon from '../../assets/mobile_accomodation.svg';
import RightArrowIcon from '../../assets/right_arrow.svg';
import FlightIcon from '../../assets/airplane.svg';
import PlusIcon from '../../assets/mobile_plus2.svg';


export default function TodayScreen() {
  const formattedDate = getTodayKoreanDate();
  const { selectedPlan, setSelectedPlan } = useSelectedPlan();
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [showItineraryDetail, setShowItineraryDetail] = useState(false);
  const [showItineraryEdit, setShowItineraryEdit] = useState(false);
  const [editingItinerary, setEditingItinerary] = useState<Itinerary | null>(null);
  const [selectedAccommodation, setSelectedAccommodation] = useState<Accommodation | null>(null);
  const [showAccommodationDetail, setShowAccommodationDetail] = useState(false);
  const [showAccommodationEdit, setShowAccommodationEdit] = useState(false);
  const [editingAccommodation, setEditingAccommodation] = useState<Accommodation | null>(null);
  const [showFlightDetail, setShowFlightDetail] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<FlightRead | null>(null);
  const [selectedFlightSegment, setSelectedFlightSegment] = useState<FlightSegmentReadDto | null>(null);
  const [showFlightEdit, setShowFlightEdit] = useState(false);
  const [editingFlight, setEditingFlight] = useState<FlightRead | null>(null);
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [showAddExpenseFromDetail, setShowAddExpenseFromDetail] = useState(false);
  const [addScheduleFlow, setAddScheduleFlow] = useState<AddScheduleFlow>('closed');

  const queryClient = useQueryClient();
  const plansQuery = usePlansQuery();
  const planData = usePlanDataQuery(selectedPlan?.publicId || null);
  
  const today = currentTime;
  const todayDateStr = today.format('YYYY-MM-DD');
  
  const { data: todayExpensesFromApi = [], refetch: refetchTodayExpenses } = useExpensesQuery(selectedPlan?.id, todayDateStr);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulseAnimation.start();
    
    return () => {
      pulseAnimation.stop();
    };
  }, [pulseAnim]);
  
  useEffect(() => {
    const checkSchedule = () => {
      const now = dayjs();
      setCurrentTime((prevTime) => {
        const prevDateStr = prevTime.format('YYYY-MM-DD');
        const prevTimeStr = prevTime.format('HH:mm:ss');
        const nowDateStr = now.format('YYYY-MM-DD');
        const nowTimeStr = now.format('HH:mm:ss');
        
        if (prevDateStr !== nowDateStr || prevTimeStr !== nowTimeStr) {
          return now;
        }
        return prevTime;
      });
    };

    const timer = setInterval(checkSchedule, 1000);

    return () => clearInterval(timer);
  }, []);

  const todayItineraries = useMemo(() => {
    if (!planData.itineraries || planData.itineraries.length === 0) {
      return [];
    }
    
    return planData.itineraries
      .filter((itinerary: Itinerary) => {
        const itineraryDate = dayjs(itinerary.itineraryDate).format('YYYY-MM-DD');
        return itineraryDate === todayDateStr;
      })
      .sort((a: Itinerary, b: Itinerary) => {
        const timeA = a.startTime || '00:00:00';
        const timeB = b.startTime || '00:00:00';
        return timeA.localeCompare(timeB);
      });
  }, [planData.itineraries, todayDateStr]);

  type ScheduleItem =
    | { type: 'itinerary'; id: number; time: string; endTime: string; data: Itinerary }
    | { type: 'flight'; id: string; time: string; endTime: string; data: FlightRead; segment: any; segmentIndex: number };

  const todaySchedules = useMemo((): ScheduleItem[] => {
    const items: ScheduleItem[] = [];

    todayItineraries.forEach((itinerary: Itinerary) => {
      items.push({
        type: 'itinerary',
        id: itinerary.id,
        time: formatTime(itinerary.startTime || '00:00:00'),
        endTime: formatTime(itinerary.endTime || '00:00:00'),
        data: itinerary,
      });
    });

    (planData.flights || []).forEach((flight: FlightRead) => {
      if (!flight.flightSegments || flight.flightSegments.length === 0) return;
      flight.flightSegments.forEach((segment: any, index: number) => {
        const departureTime = dayjs(segment.departureTime);
        if (departureTime.format('YYYY-MM-DD') !== todayDateStr) return;
        items.push({
          type: 'flight',
          id: `${flight.id}-segment-${index}`,
          time: convertUTCToLocalTime(segment.departureTime),
          endTime: convertUTCToLocalTime(segment.arrivalTime),
          data: flight,
          segment,
          segmentIndex: index,
        });
      });
    });

    return items.sort((a, b) => a.time.localeCompare(b.time));
  }, [todayItineraries, planData.flights, todayDateStr]);

  const currentActivity = useMemo((): ScheduleItem | null => {
    return todaySchedules.find((item: ScheduleItem) => {
      if (item.type === 'itinerary') {
        const startDateTime = dayjs(`${todayDateStr} ${item.time}`);
        let endDateTime = dayjs(`${todayDateStr} ${item.endTime}`);
        if (item.endTime < item.time) endDateTime = endDateTime.add(1, 'day');
        return currentTime.isAfter(startDateTime) && currentTime.isBefore(endDateTime);
      }
      const dep = dayjs(item.segment.departureTime);
      const arr = dayjs(item.segment.arrivalTime);
      return currentTime.isAfter(dep) && currentTime.isBefore(arr);
    }) ?? null;
  }, [todaySchedules, todayDateStr, currentTime]);

  const nextActivityIndex = useMemo(() => {
    return todaySchedules.findIndex((item: ScheduleItem) => {
      if (item.type === 'itinerary') {
        const startDateTime = dayjs(`${todayDateStr} ${item.time}`);
        return currentTime.isBefore(startDateTime);
      }
      const dep = dayjs(item.segment.departureTime);
      return currentTime.isBefore(dep);
    });
  }, [todaySchedules, todayDateStr, currentTime]);

  const todayAccommodations = useMemo(() => {
    if (!planData.accommodations || planData.accommodations.length === 0) {
      return [];
    }
    
    return planData.accommodations.filter((accommodation: any) => {
      const checkinDate = dayjs(accommodation.checkinDate).format('YYYY-MM-DD');
      const checkoutDate = dayjs(accommodation.checkoutDate).format('YYYY-MM-DD');
      return checkinDate <= todayDateStr && checkoutDate > todayDateStr;
    });
  }, [planData.accommodations, todayDateStr]);

  const todayFlights = useMemo(
    () => todaySchedules.filter((item): item is Extract<ScheduleItem, { type: 'flight' }> => item.type === 'flight'),
    [todaySchedules]
  );

  const todayExpenses = useMemo(() => {
    let total = 0;
    const byCategory: Record<string, number> = {};
    
    if (todayExpensesFromApi && Array.isArray(todayExpensesFromApi)) {
      todayExpensesFromApi.forEach((expense: any) => {
        const amount = expense.amount || 0;
        total += amount;
        const category = expense.category || '기타';
        byCategory[category] = (byCategory[category] || 0) + amount;
      });
    }
    
    return { total, byCategory };
  }, [todayExpensesFromApi]);

  const formatCurrency = (amount: number) => {
    return `₩${amount.toLocaleString('ko-KR')}`;
  };

  const formatExpenseDetail = () => {
    const categories = Object.entries(todayExpenses.byCategory);
    if (categories.length === 0) return '지출 내역이 없습니다';
    
    return categories
      .map(([category, amount]) => {
        const categoryLabel = categoryLabels[category as keyof typeof categoryLabels] || category;
        return `${categoryLabel} ${formatCurrency(amount)}`;
      })
      .join(' · ');
  };

  const handleDeleteItinerary = useCallback(
    async (itinerary: Itinerary) => {
      try {
        await itinerariesApi.deleteItinerary(itinerary.id);
        planData.removeItinerary(itinerary.id);
        planData.refreshExpenses?.();
        queryClient.invalidateQueries({ queryKey: ['expenses', selectedPlan?.id] });
        await refetchTodayExpenses();
        Alert.alert('삭제완료', '일정이 삭제되었습니다.');
      } catch {
        Alert.alert('오류', '일정 삭제에 실패했습니다.');
      }
    },
    [planData, queryClient, refetchTodayExpenses, selectedPlan?.id],
  );

  const itinerarySwipeRefs = useRef<Map<number, Swipeable>>(new Map());
  const activeItinerarySwipeId = useRef<number | null>(null);

  const closeOpenItinerarySwipe = useCallback(() => {
    const id = activeItinerarySwipeId.current;
    if (id == null) return;
    itinerarySwipeRefs.current.get(id)?.close();
    activeItinerarySwipeId.current = null;
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={closeOpenItinerarySwipe}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await Promise.all([
                  plansQuery.fetchPlans(),
                  selectedPlan?.publicId 
                    ? planData.fetchPlanData(selectedPlan.publicId)
                    : Promise.resolve(),
                  refetchTodayExpenses(),
                  queryClient.refetchQueries({ queryKey: ['checklist', selectedPlan?.publicId] }),
                ]);
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor={colors.white}
            colors={[colors.white]}
          />
        }
      >
        <Pressable
          style={styles.scrollContentPressable}
          onPress={closeOpenItinerarySwipe}
        >
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.date}>{formattedDate}</Text>
              <View style={styles.tripTitleWrapper}>
                <Pressable 
                  style={styles.tripTitleContainer}
                  onPress={() => {
                    closeOpenItinerarySwipe();
                    setShowPlanSelector(true);
                  }}
                >
                  <Text style={styles.tripTitle}>
                    {selectedPlan?.title || '여행을 선택해주세요'}
                  </Text>
                  <DropdownIcon width={20} height={20} color={colors.gray600} />
                </Pressable>
              </View>
              <Text style={styles.greeting}>오늘의 일정 준비되셨나요?</Text>
            </View>
            <Pressable
              style={styles.settingsButton}
              onPress={() => {
                closeOpenItinerarySwipe();
                setProfileModalVisible(true);
              }}
            >
              <SettingIcon width={24} height={24} color={colors.gray600} />
            </Pressable>
          </View>
        </View>

        {/* 현재 진행 중 활동 카드 */}
        {currentActivity && (
          <Pressable
            style={[styles.cardBase, styles.currentCard]}
            onPress={() => {
              closeOpenItinerarySwipe();
              if (currentActivity.type === 'flight') {
                setSelectedFlight(currentActivity.data);
                setSelectedFlightSegment(currentActivity.segment);
                setShowFlightDetail(true);
              } else {
                setSelectedItinerary(currentActivity.data);
                setShowItineraryDetail(true);
              }
            }}
          >
            <View style={styles.currentCardHeader}>
              <View style={styles.statusBadge}>
                <Animated.View 
                  style={[
                    styles.pulse,
                    {
                      opacity: pulseAnim,
                    },
                  ]} 
                />
                <Text style={styles.statusText}>진행 중</Text>
              </View>
              {currentActivity.endTime && (
                <View style={styles.endTimeBox}>
                  <Text style={styles.endTime}>
                    {currentActivity.endTime} 종료
                  </Text>
                </View>
              )}
            </View>
            
            {currentActivity.type === 'flight' ? (
              <>
                <View style={styles.flightTitleRow}>
                  <View style={styles.flightIconWrap}>
                    <FlightIcon width={20} height={20} color={colors.black} />
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {currentActivity.segment.departureAirport} → {currentActivity.segment.arrivalAirport}
                  </Text>
                </View>
                {currentActivity.segment.flightNumber && (
                  <Text style={styles.cardLocation} numberOfLines={1}>
                    {currentActivity.segment.flightNumber}
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text 
                  style={styles.cardTitle}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {currentActivity.data.title || '활동'}
                </Text>
                {currentActivity.data.location && (
                  <View style={styles.locationRow}>
                    <LocationIcon width={16} height={16} color={colors.gray600} />
                    <Text 
                      style={styles.cardLocation}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {currentActivity.data.location}
                    </Text>
                  </View>
                )}
                {currentActivity.data.description && (
                  <View style={styles.noteBox}>
                    <Text 
                      style={styles.note}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      "{currentActivity.data.description}"
                    </Text>
                  </View>
                )}
              </>
            )}
          </Pressable>
        )}

        {/* 타임라인 섹션 */}
        {todaySchedules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>타임라인</Text>
            
            {todaySchedules.map((item: ScheduleItem, index: number) => {
              const isDone = currentActivity && 
                (currentActivity.type === 'itinerary' ? item.type === 'itinerary' && item.id === currentActivity.id : item.type === 'flight' && item.id === currentActivity.id)
                  ? false
                  : index < (nextActivityIndex === -1 ? todaySchedules.length : nextActivityIndex);
              const isNext = index === nextActivityIndex;
              const startTime = item.time;
              
              if (item.type === 'flight') {
                return (
                  <View 
                    key={item.id} 
                    style={[
                      styles.timelineItem,
                      isDone && styles.doneItem,
                    ]}
                  >
                    <Pressable
                      style={styles.cardBase}
                      onPress={() => {
                        closeOpenItinerarySwipe();
                        setSelectedFlight(item.data);
                        setSelectedFlightSegment(item.segment);
                        setShowFlightDetail(true);
                      }}
                    >
                      <View style={styles.timelineCardHeader}>
                        <Text style={[styles.timelineTime, isNext && styles.nextTime]}>
                          {startTime}
                        </Text>
                        {isNext && (
                          <View style={styles.nextButton}>
                            <Text style={styles.nextButtonText}>다음</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.flightTitleRow}>
                        <View style={styles.flightIconWrap}>
                          <FlightIcon width={16} height={16} color={colors.black} />
                        </View>
                        <Text 
                          style={styles.itemTitle}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.segment.departureAirport} → {item.segment.arrivalAirport}
                        </Text>
                      </View>
                      {item.segment.flightNumber && (
                        <Text 
                          style={styles.itemLocation}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.segment.flightNumber}
                        </Text>
                      )}
                    </Pressable>
                    
                  </View>
                );
              }

              const itinerary = item.data;
              return (
                <View 
                  key={item.id} 
                  style={[
                    styles.timelineItem,
                    isDone && styles.doneItem,
                  ]}
                >
                  <View style={styles.swipeItineraryShadow}>
                    <View style={styles.swipeItineraryClip}>
                      <Swipeable
                        ref={(el) => {
                          if (el) {
                            itinerarySwipeRefs.current.set(itinerary.id, el);
                          } else {
                            itinerarySwipeRefs.current.delete(itinerary.id);
                          }
                        }}
                        friction={2}
                        overshootRight={false}
                        containerStyle={styles.swipeItinerarySwipeable}
                        onSwipeableOpen={() => {
                          const prev = activeItinerarySwipeId.current;
                          if (prev !== null && prev !== itinerary.id) {
                            itinerarySwipeRefs.current.get(prev)?.close();
                          }
                          activeItinerarySwipeId.current = itinerary.id;
                        }}
                        onSwipeableClose={() => {
                          if (activeItinerarySwipeId.current === itinerary.id) {
                            activeItinerarySwipeId.current = null;
                          }
                        }}
                        renderRightActions={() => (
                          <View style={styles.swipeDeleteContainer}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="일정 삭제"
                              style={styles.swipeDeleteButton}
                              onPress={() => handleDeleteItinerary(itinerary)}
                            >
                              <Text style={styles.swipeDeleteLabel}>삭제</Text>
                            </Pressable>
                          </View>
                        )}
                      >
                        <Pressable
                          style={styles.timelineItineraryCard}
                          onPress={() => {
                            const hadSwipeOpenHere =
                              activeItinerarySwipeId.current === itinerary.id;
                            closeOpenItinerarySwipe();
                            if (hadSwipeOpenHere) return;
                            setSelectedItinerary(itinerary);
                            setShowItineraryDetail(true);
                          }}
                        >
                      <View style={styles.timelineCardHeader}>
                        <Text style={[styles.timelineTime, isNext && styles.nextTime]}>
                          {startTime}
                        </Text>
                        {isNext && (
                          <Pressable style={styles.nextButton}>
                            <Text style={styles.nextButtonText}>다음</Text>
                          </Pressable>
                        )}
                      </View>
                      <Text 
                        style={styles.itemTitle}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {itinerary.title || '활동'}
                      </Text>
                      {itinerary.location && (
                        <Text 
                          style={styles.itemLocation}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {itinerary.location}
                        </Text>
                      )}
                      {itinerary.description && (
                        <Text 
                          style={styles.itemDescription}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {itinerary.description}
                        </Text>
                      )}
                    </Pressable>
                      </Swipeable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.checklistWrapper}>
          <WeeklyChecklistCard
            planPublicId={selectedPlan?.publicId}
            selectedDate={today}
            itineraries={planData.itineraries}
          />
        </View>

        {/* 오늘의 비용 섹션 */}
        {selectedPlan && (
          <View style={styles.section}>
            <Pressable
              style={[styles.cardBase, styles.costCardPrimary]}
              onPress={() => {
                closeOpenItinerarySwipe();
                setShowExpenseDetail(true);
              }}
            >
              <View style={styles.costCardHeader}>
                <View style={styles.costCardHeaderLeft}>
                  <ExpenseIcon width={20} height={20} color={colors.white} />
                  <Text style={styles.costCardHeaderTitle}>오늘의 여행 비용</Text>
                </View>
                <RightArrowIcon width={20} height={20} color={colors.white} />
              </View>
              {todayExpenses.total > 0 ? (
                <>
                  <Text style={styles.costAmountPrimary}>
                    {formatCurrency(todayExpenses.total)}
                  </Text>
                  <Text style={styles.costDetailPrimary}>
                    터치하여 상세 내역 확인
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.costAmountPrimary}>0원</Text>
                  <Text style={styles.costDetailPrimary}>
                    터치하여 상세 내역 확인
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* 여행 정보(숙박/항공) 섹션 - 데이터 있을 때만 노출 */}
        {(todayAccommodations.length > 0 || todayFlights.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>여행 정보 (Reference)</Text>
            {todayAccommodations.map((accommodation: Accommodation) => (
              <Pressable
                key={accommodation.id}
                style={[styles.cardBase, styles.accommodationCard]}
                onPress={() => {
                  closeOpenItinerarySwipe();
                  setSelectedAccommodation(accommodation);
                  setShowAccommodationDetail(true);
                }}
              >
                <View style={styles.accommodationHeader}>
                  <View style={styles.accommodationIconBox}>
                    <AccommodationIcon
                      width={20}
                      height={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.accommodationHeaderText}>
                    <Text style={styles.accommodationLabel}>오늘의 숙소</Text>
                    <Text style={styles.itemTitle}>{accommodation.name}</Text>
                    <Text style={styles.accommodationCheckin}>
                      체크인 {formatTime(accommodation.checkinTime)}
                    </Text>
                  </View>
                </View>
                <RightArrowIcon width={12} height={12} color={colors.gray600} />
              </Pressable>
            ))}
            {todayFlights.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.cardBase, styles.accommodationCard]}
                onPress={() => {
                  closeOpenItinerarySwipe();
                  setSelectedFlight(item.data);
                  setSelectedFlightSegment(item.segment);
                  setShowFlightDetail(true);
                }}
              >
                <View style={styles.accommodationHeader}>
                  <View style={styles.accommodationIconBox}>
                    <FlightIcon width={20} height={20} color={colors.primary} />
                  </View>
                  <View style={styles.accommodationHeaderText}>
                    <Text style={styles.accommodationLabel}>오늘의 항공</Text>
                    <Text style={styles.itemTitle}>
                      {item.segment.departureAirport} → {item.segment.arrivalAirport}
                    </Text>
                    <Text style={styles.accommodationCheckin}>
                      출발 {item.time}
                      {item.segment.flightNumber && ` · ${item.segment.flightNumber}`}
                    </Text>
                  </View>
                </View>
                <RightArrowIcon width={12} height={12} color={colors.gray600} />
              </Pressable>
            ))}
          </View>
        )}

        </Pressable>
      </ScrollView>

      <Modal
        visible={profileModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <ProfileModal
          visible={profileModalVisible}
          onClose={() => setProfileModalVisible(false)}
        />
      </Modal>

      <PlanSelectModal
        visible={showPlanSelector}
        onClose={() => setShowPlanSelector(false)}
        plans={plansQuery.plans}
        selectedPlan={selectedPlan}
        onSelectPlan={setSelectedPlan}
        addPlan={plansQuery.addPlan}
        onAddTripPress={() => {
          setEditingPlan(null);
          setShowPlanSelector(false);
          setShowAddPlanModal(true);
        }}
        onEditPlan={(plan) => {
          setEditingPlan(plan);
          setShowPlanSelector(false);
          setShowAddPlanModal(true);
        }}
        onDeletePlan={async (plan) => {
          try {
            await plansQuery.deletePlan(plan.id);
            if (selectedPlan?.id === plan.id) {
              const remaining = plansQuery.plans.filter((p) => p.id !== plan.id);
              setSelectedPlan(remaining[0] ?? null);
            }
            setShowPlanSelector(false);
            Alert.alert('성공', '여행이 삭제되었습니다.');
          } catch (error) {
            Alert.alert('오류', '여행 삭제에 실패했습니다.');
          }
        }}
      />

      {plansQuery.addPlan && (
        <AddPlanModal
          visible={showAddPlanModal}
          onClose={() => {
            setShowAddPlanModal(false);
            setEditingPlan(null);
            setShowPlanSelector(true);
          }}
          onPlanCreated={(plan) => {
            setSelectedPlan(plan);
            setShowAddPlanModal(false);
            setEditingPlan(null);
            setTimeout(() => setShowPlanSelector(false), 300);
          }}
          addPlan={plansQuery.addPlan}
          planToEdit={editingPlan}
          updatePlan={plansQuery.updatePlan}
        />
      )}

      <ExpenseDetailModal
        visible={showExpenseDetail && !showAddExpenseFromDetail}
        onClose={() => setShowExpenseDetail(false)}
        expenses={todayExpensesFromApi ?? []}
        total={todayExpenses.total}
        byCategory={todayExpenses.byCategory}
        planId={selectedPlan?.id ?? 0}
        planStartDate={selectedPlan?.startDate}
        planEndDate={selectedPlan?.endDate}
        exDate={todayDateStr}
        onExpenseAdd={() => {
          planData.refreshExpenses?.();
          queryClient.invalidateQueries({ queryKey: ['expenses', selectedPlan?.id] });
          refetchTodayExpenses();
        }}
        onAddExpensePress={() => {
          setShowExpenseDetail(false);
          setShowAddExpenseFromDetail(true);
        }}
      />

      <AddExpenseModal
        visible={showAddExpenseFromDetail}
        onClose={(opts) => {
          setShowAddExpenseFromDetail(false);
          if (opts?.fromSave) {
            setShowExpenseDetail(false);
          } else {
            setShowExpenseDetail(true);
          }
        }}
        planId={selectedPlan?.id ?? 0}
        planStartDate={selectedPlan?.startDate}
        planEndDate={selectedPlan?.endDate}
        defaultExDate={todayDateStr}
        onExpenseAdd={(expense) => {
          planData.addExpense?.(expense);
          planData.refreshExpenses?.();
          queryClient.invalidateQueries({ queryKey: ['expenses', selectedPlan?.id] });
          refetchTodayExpenses();
          setShowExpenseDetail(false);
        }}
      />

      <ItineraryDetailModal
        visible={showItineraryDetail}
        onClose={() => {
          setShowItineraryDetail(false);
          setSelectedItinerary(null);
        }}
        itinerary={selectedItinerary}
        planExpenses={planData.expenses ?? []}
        onEdit={(itinerary) => {
          setShowItineraryDetail(false);
          setEditingItinerary(itinerary);
          setShowItineraryEdit(true);
        }}
        onDelete={handleDeleteItinerary}
      />

      <ItineraryEditModal
        visible={showItineraryEdit}
        onClose={(opts) => {
          const itineraryToShow = editingItinerary;
          setShowItineraryEdit(false);
          setEditingItinerary(null);
          if (!opts?.fromSave && itineraryToShow) {
            setSelectedItinerary(itineraryToShow);
            setShowItineraryDetail(true);
          }
        }}
        itinerary={editingItinerary}
        planId={selectedPlan?.id ?? 0}
        onSave={async (itinerary) => {
          planData.addItinerary(itinerary);
          planData.refreshExpenses?.();
          queryClient.invalidateQueries({ queryKey: ['expenses', selectedPlan?.id] });
          await refetchTodayExpenses();
        }}
        onDelete={async (itineraryId) => {
          planData.removeItinerary(itineraryId);
          planData.refreshExpenses?.();
          queryClient.invalidateQueries({ queryKey: ['expenses', selectedPlan?.id] });
          await refetchTodayExpenses();
        }}
      />

      <AccommodationDetailModal
        visible={showAccommodationDetail}
        onClose={() => {
          setShowAccommodationDetail(false);
          setSelectedAccommodation(null);
        }}
        accommodation={selectedAccommodation}
        onEdit={(accommodation) => {
          setShowAccommodationDetail(false);
          setEditingAccommodation(accommodation);
          setShowAccommodationEdit(true);
        }}
        onDelete={async (accommodation) => {
          try {
            await accommodationsApi.deleteAccommodation(accommodation.id);
            planData.removeAccommodation(accommodation.id);
            queryClient.invalidateQueries({ queryKey: ['expenses', selectedPlan?.id] });
            await refetchTodayExpenses();
            Alert.alert('삭제완료', '숙소가 삭제되었습니다.');
          } catch (error) {
            Alert.alert('오류', '숙소 삭제에 실패했습니다.');
          }
        }}
      />

      <AccommodationEditModal
        visible={showAccommodationEdit}
        onClose={(opts) => {
          const accommodationToShow = editingAccommodation;
          setShowAccommodationEdit(false);
          setEditingAccommodation(null);
          if (!opts?.fromSave && accommodationToShow) {
            setSelectedAccommodation(accommodationToShow);
            setShowAccommodationDetail(true);
          }
        }}
        accommodation={editingAccommodation}
        planId={selectedPlan?.id ?? 0}
        onSave={async (updated) => {
          planData.addAccommodation(updated);
          await refetchTodayExpenses();
        }}
        onDelete={async (accommodationId) => {
          planData.removeAccommodation(accommodationId);
          queryClient.invalidateQueries({ queryKey: ['expenses', selectedPlan?.id] });
          await refetchTodayExpenses();
        }}
      />

      <FlightDetailModal
        visible={showFlightDetail}
        onClose={() => {
          setShowFlightDetail(false);
          setSelectedFlight(null);
          setSelectedFlightSegment(null);
        }}
        flight={selectedFlight}
        segment={selectedFlightSegment}
        onEdit={(flight) => {
          setShowFlightDetail(false);
          setEditingFlight(flight);
          setShowFlightEdit(true);
        }}
        onDelete={async (flight) => {
          try {
            await flightsApi.deleteFlight(flight.id);
            planData.removeFlight(flight.id);
            Alert.alert('삭제완료', '항공편이 삭제되었습니다.');
          } catch (error) {
            Alert.alert('오류', '항공 편 삭제에 실패했습니다.');
          }
        }}
      />

      <FlightEditModal
        visible={showFlightEdit}
        onClose={(opts) => {
          const flightToShow = editingFlight;
          setShowFlightEdit(false);
          setEditingFlight(null);
          if (!opts?.fromSave && flightToShow) {
            setSelectedFlight(flightToShow);
            setSelectedFlightSegment(null);
            setShowFlightDetail(true);
          }
        }}
        flight={editingFlight}
        planId={selectedPlan?.id ?? 0}
        planStartDate={selectedPlan?.startDate}
        onSave={async (updated) => {
          planData.addFlight(updated);
          await refetchTodayExpenses();
        }}
        onDelete={async (flightId) => {
          planData.removeFlight(flightId);
          await refetchTodayExpenses();
        }}
      />

      {selectedPlan && (
        <Pressable
          style={styles.fab}
          onPress={() => {
            closeOpenItinerarySwipe();
            setAddScheduleFlow('method');
          }}
          hitSlop={8}
        >
          <PlusIcon width={24} height={24} color={colors.white} />
        </Pressable>
      )}

      <AddScheduleMethodModal
        visible={addScheduleFlow === 'method'}
        onClose={() => setAddScheduleFlow('closed')}
        onSelectDirectAdd={() => setAddScheduleFlow('direct')}
        onSelectAiAdd={() => setAddScheduleFlow('ai')}
      />

      <AddScheduleWithAiModal
        visible={addScheduleFlow === 'ai'}
        onClose={() => setAddScheduleFlow('method')}
      />

      <AddScheduleModal
        visible={addScheduleFlow === 'direct'}
        onClose={() => setAddScheduleFlow('method')}
        onSaved={() => setAddScheduleFlow('closed')}
        planId={selectedPlan?.id ?? 0}
        planStartDate={selectedPlan?.startDate}
        planEndDate={selectedPlan?.endDate}
        selectedDate={dayjs()}
        planData={{
          addItinerary: planData.addItinerary,
          addAccommodation: planData.addAccommodation,
          addFlight: planData.addFlight,
          removeItinerary: planData.removeItinerary,
          removeAccommodation: planData.removeAccommodation,
          removeFlight: planData.removeFlight,
        }}
        onRefresh={async () => {
          if (selectedPlan?.publicId) {
            planData.refreshExpenses?.();
            planData.refreshItineraries?.();
            planData.refreshFlights?.();
            planData.refreshAccommodations?.();
            queryClient.invalidateQueries({ queryKey: ['expenses', selectedPlan.id] });
            queryClient.invalidateQueries({ queryKey: ['checklist', selectedPlan.publicId] });
          }
          refetchTodayExpenses();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray300,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  scrollContentPressable: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 24,
    backgroundColor: colors.gray300,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
  },
  settingsButton: {
    padding: 4,
    marginTop: -4,
  },
  date: {
    ...textStyles.h7,
    color: colors.gray700,
    marginBottom: 8,
  },
  tripTitleWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  tripTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripTitle: {
    ...textStyles.h3,
    color: colors.black,
    marginRight: 8,
  },
  greeting: {
    ...textStyles.body3,
    color: colors.black,
  },
  
  cardBase: {
    marginHorizontal: 16,
    padding: 20,
    backgroundColor: colors.white,
    borderRadius: 16,
    shadowColor: colors.gray700,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  
  currentCard: {
    marginBottom: 16,
  },
  currentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 6,
  },
  statusText: {
    ...textStyles.h7,
    color: colors.primary,
  },
  endTimeBox: {
    backgroundColor: colors.gray300,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  endTime: {
    ...textStyles.h9,
    color: colors.gray700,
  },
  cardTitle: {
    ...textStyles.h3,
    color: colors.black,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLocation: {
    ...textStyles.body3,
    color: colors.gray600,
    marginLeft: 4,
  },
  noteBox: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  note: {
    ...textStyles.body3,
    color: colors.primary,
  },
  
  checklistWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: -4,
  },
  section: {
    marginTop: 4,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...textStyles.h5,
    color: colors.black,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  
  swipeItineraryShadow: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    shadowColor: colors.gray700,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  swipeItineraryClip: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  swipeItinerarySwipeable: {
    backgroundColor: colors.white,
  },
  swipeDeleteContainer: {
    width: 50,
    alignSelf: 'stretch',
  },
  swipeDeleteButton: {
    flex: 1,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineItineraryCard: {
    padding: 20,
    backgroundColor: colors.white,
  },
  swipeDeleteLabel: {
    ...textStyles.h9,
    color: colors.white,
    fontWeight: '600',
  },
  timelineItem: {
    marginBottom: 12,
  },
  doneItem: {
    opacity: 0.5,
  },
  timelineTime: {
    ...textStyles.h7,
    color: colors.gray600,
  },
  nextTime: {
    color: colors.primary,
  },
  itemTitle: {
    ...textStyles.h6,
    color: colors.black,
    marginBottom: 4,
  },
  itemLocation: {
    ...textStyles.body4,
    color: colors.gray600,
    marginBottom: 4,
  },
  itemDescription: {
    ...textStyles.body4,
    color: colors.gray500,
    marginTop: 4,
  },
  flightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flightIconWrap: {
    marginTop: -4,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  nextButtonText: {
    ...textStyles.h9,
    color: colors.primary,
  },
  
  accommodationCard: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accommodationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  accommodationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accommodationHeaderText: {
    flex: 1,
  },
  accommodationLabel: {
    ...textStyles.body4,
    color: colors.gray600,
    marginBottom: 4,
  },
  accommodationCheckin: {
    ...textStyles.body4,
    color: colors.gray600,
    marginTop: 4,
  },
  accommodationDates: {
    marginTop: 8,
    gap: 8,
  },
  accommodationDateText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  
  costCardPrimary: {
    backgroundColor: colors.primary,
    padding: 20,
  },
  costCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  costCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  costCardHeaderTitle: {
    ...textStyles.h6,
    color: colors.white,
  },
  costAmountPrimary: {
    ...textStyles.h2,
    color: colors.white,
    marginBottom: 8,
  },
  costDetailPrimary: {
    ...textStyles.body3,
    color: colors.white,
    opacity: 0.9,
  },
  fab: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...textStyles.body3,
    color: colors.gray500,
    textAlign: 'center',
    paddingVertical: 8,
  },
});

