import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Modal, Animated, RefreshControl, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { getTodayKoreanDate, formatTime, convertUTCToLocalTime } from '@/utils/dateUtils';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { usePlansQuery } from '@/hooks/usePlansQuery';
import { usePlanDataQuery } from '@/hooks/usePlanDataQuery';
import { useExpensesQuery } from '@/hooks/useExpensesQuery';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plan, Itinerary, TravelChecklistItem, Accommodation, FlightRead, FlightSegmentReadDto } from '@/types/api';
import { categoryLabels } from '@/types/expense';
import ProfileModal from '@/components/modals/mobile/ProfileModal.native';
import PlanSelectModal from '@/components/modals/mobile/PlanSelectModal.native';
import ItineraryDetailModal from '@/components/modals/mobile/ItineraryDetailModal.native';
import ItineraryEditModal from '@/components/modals/mobile/ItineraryEditModal.native';
import AccommodationDetailModal from '@/components/modals/mobile/AccommodationDetailModal.native';
import AccommodationEditModal from '@/components/modals/mobile/AccommodationEditModal.native';
import FlightDetailModal from '@/components/modals/mobile/FlightDetailModal.native';
import FlightEditModal from '@/components/modals/mobile/FlightEditModal.native';
import GradientBackground from '@/ui/components/GradientBackground';
import api from '@/services/api';
import { itinerariesApi } from '@/services/itineraries';
import { accommodationsApi } from '@/services/accommodations';
import { flightsApi } from '@/services/flights';
import SettingIcon from '../../assets/mobile_setting.svg';
import DropdownIcon from '../../assets/mobile_dropdown.svg';
import LocationIcon from '../../assets/mobile_location.svg';
import ChecklistIcon from '../../assets/mobile_check.svg';
import ExpenseIcon from '../../assets/mobile_expense.svg';
import AccommodationIcon from '../../assets/mobile_accomodation.svg';
import RightArrowIcon from '../../assets/right_arrow.svg';
import FlightIcon from '../../assets/airplane.svg';
import LightningIcon from '../../assets/mobile_lightning.svg';
import CheckIcon from '../../assets/gender_check.svg';


export default function TodayScreen() {
  const formattedDate = getTodayKoreanDate();
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [refreshing, setRefreshing] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [addingChecklistItem, setAddingChecklistItem] = useState(false);
  const [aiRecommendLoading, setAiRecommendLoading] = useState(false);
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

  const togglingItems = useRef<Set<number>>(new Set());
  const deletingItems = useRef<Set<number>>(new Set());
  
  const queryClient = useQueryClient();
  const plansQuery = usePlansQuery();
  const planData = usePlanDataQuery(selectedPlan?.publicId || null);
  
  const today = currentTime;
  const todayDateStr = today.format('YYYY-MM-DD');
  
  const { data: todayExpensesFromApi = [], refetch: refetchTodayExpenses } = useExpensesQuery(selectedPlan?.id, todayDateStr);
  
  const { data: checklistData, refetch: refetchChecklist } = useQuery({
    queryKey: ['checklist', selectedPlan?.publicId],
    queryFn: async () => {
      if (!selectedPlan?.publicId) return null;
      try {
        const response = await api.get(`/private/ai/checklist/${selectedPlan.publicId}`);
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!selectedPlan?.publicId,
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  
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
    if (!selectedPlan && plansQuery.plans.length > 0) {
      setSelectedPlan(plansQuery.plans[0]);
    }
  }, [plansQuery.plans, selectedPlan]);

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

  const checklist = useMemo(() => {
    return checklistData || null;
  }, [checklistData]);

  const hasChecklist = useMemo(() => {
    if (!checklist?.categories) {
      return false;
    }
    return Object.values(checklist.categories).some((category: any) => {
      return Array.isArray(category) && category.length > 0;
    });
  }, [checklist]);

  const todayChecklistItems = useMemo(() => {
    if (!checklist?.categories) {
      return [];
    }
    const items: TravelChecklistItem[] = [];
    
    const categories = checklist.categories;
    if (!categories || typeof categories !== 'object') {
      return [];
    }
    
    Object.entries(categories).forEach(([categoryKey, category]: [string, any]) => {
      if (Array.isArray(category)) {
        category.forEach((item: any) => {
          if (!item || typeof item !== 'object') {
            return;
          }
          
          const itemDate = item.date;
          const isCustom = item.isCustom ?? false;
          const isChecked = item.isChecked ?? false;
          
          if (itemDate === todayDateStr) {
            items.push({
              id: item.id || 0,
              name: item.name || '',
              reason: item.reason || '',
              is_checked: isChecked,
              is_custom: isCustom,
              date: item.date,
            });
          }
        });
      }
    });
    
    return items;
  }, [checklist, todayDateStr]);

  const checklistStats = useMemo(() => {
    const total = todayChecklistItems.length;
    const checked = todayChecklistItems.filter((item) => item.is_checked).length;
    return { total, checked };
  }, [todayChecklistItems]);

  const formatCurrency = (amount: number) => {
    return `₩${amount.toLocaleString('ko-KR')}`;
  };

  const handleAddChecklistItem = async () => {
    const name = newChecklistItem.trim();
    if (!name) return;
    const publicId = selectedPlan?.publicId;
    if (!publicId) {
      Alert.alert('알림', '여행을 선택해주세요.');
      return;
    }
    setAddingChecklistItem(true);
    try {
      const response = await api.post(`/private/ai/checklist/${publicId}/item`, {
        name,
        reason: '',
        category: 'basic_required',
        date: todayDateStr,
      });
      setNewChecklistItem('');
      refetchChecklist();
    } catch {
      Alert.alert('오류', '체크리스트 항목 추가에 실패했습니다.');
    } finally {
      setAddingChecklistItem(false);
    }
  };

  const handleToggleChecklistItem = async (itemId: number, isChecked: boolean) => {
    const publicId = selectedPlan?.publicId;
    if (!publicId) return;
    
    if (togglingItems.current.has(itemId)) {
      return;
    }
    
    togglingItems.current.add(itemId);
    
    const previousData = queryClient.getQueryData(['checklist', publicId]);
    
    queryClient.setQueryData(['checklist', publicId], (old: any) => {
      if (!old?.categories) return old;
      
      const updated = { ...old };
      const categories = { ...updated.categories };
      
      Object.keys(categories).forEach((categoryKey) => {
        const items = categories[categoryKey];
        if (Array.isArray(items)) {
          categories[categoryKey] = items.map((item: any) => {
            if (item.id === itemId) {
              return { ...item, isChecked };
            }
            return item;
          });
        }
      });
      
      return { ...updated, categories };
    });
    
    try {
      await api.patch(`/private/ai/checklist/${publicId}/item/${itemId}`, {
        is_checked: isChecked,
      });
    } catch {
      queryClient.setQueryData(['checklist', publicId], previousData);
      Alert.alert('오류', '체크리스트 항목 업데이트에 실패했습니다.');
    } finally {
      togglingItems.current.delete(itemId);
    }
  };

  const handleDeleteChecklistItem = async (itemId: number) => {
    const publicId = selectedPlan?.publicId;
    if (!publicId) return;
    
    if (deletingItems.current.has(itemId)) {
      return;
    }
    
    deletingItems.current.add(itemId);
    
    try {
      await api.delete(`/private/ai/checklist/${publicId}/item/${itemId}`);
      refetchChecklist();
    } catch {
      Alert.alert('오류', '체크리스트 항목 삭제에 실패했습니다.');
    } finally {
      deletingItems.current.delete(itemId);
    }
  };

  const handleAiRecommendChecklist = async () => {
    const publicId = selectedPlan?.publicId;
    if (!publicId) {
      Alert.alert('알림', '여행을 선택해주세요.');
      return;
    }
    const activeItineraries = planData.itineraries?.filter((it: any) => !it.is_deleted) || [];
    if (activeItineraries.length < 2) {
      Alert.alert('알림', '체크리스트 생성을 위해서는 최소 2개 이상의 세부 일정이 필요합니다.');
      return;
    }
    setAiRecommendLoading(true);
    try {
      await api.post(`/private/ai/checklist/${publicId}/generate`, {
        force_regenerate: true,
        date: todayDateStr,
      });
      refetchChecklist();
    } catch {
      Alert.alert('오류', 'AI 체크리스트 생성에 실패했습니다.');
    } finally {
      setAiRecommendLoading(false);
    }
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

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
                  refetchChecklist(),
                ]);
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.date}>{formattedDate}</Text>
              <View style={styles.tripTitleWrapper}>
                <Pressable 
                  style={styles.tripTitleContainer}
                  onPress={() => setShowPlanSelector(true)}
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
              onPress={() => setProfileModalVisible(true)}
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
                  <Pressable
                    style={styles.cardBase}
                    onPress={() => {
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
                </View>
              );
            })}
          </View>
        )}

        {/* 체크리스트 섹션 */}
        <View style={styles.section}>
          <View style={styles.cardBase}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <ChecklistIcon width={20} height={20} color={colors.black} />
                <Text style={styles.cardHeaderTitle}>오늘의 체크리스트</Text>
              </View>
              {hasChecklist && (
                <Pressable
                  onPress={handleAiRecommendChecklist}
                  disabled={aiRecommendLoading}
                  style={({ pressed }) => [styles.aiRecommendButtonHeader, pressed && styles.aiRecommendButtonPressed]}
                >
                  <GradientBackground
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.aiRecommendButtonGradient}
                  >
                    <LightningIcon width={16} height={16} color={colors.black} />
                    <Text style={styles.aiRecommendButtonText}>AI 추천</Text>
                  </GradientBackground>
                </Pressable>
              )}
            </View>
            {todayChecklistItems.length > 0 ? (
              <View style={styles.checklistListBox}>
                {todayChecklistItems.map((item) => (
                  <View key={item.id} style={styles.checklistListItem}>
                    <Pressable
                      onPress={() => handleToggleChecklistItem(item.id, !item.is_checked)}
                      hitSlop={8}
                    >
                      <View style={[styles.checklistItemCheckbox, item.is_checked && styles.checklistItemCheckboxSelected]}>
                        <CheckIcon width={16} height={16} fill={colors.white} />
                      </View>
                    </Pressable>
                    <View style={styles.checklistItemContent}>
                      <Text
                        style={[styles.checklistItemName, item.is_checked && styles.checklistItemNameChecked]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.name}
                      </Text>
                      {!item.is_custom && (
                        <View style={styles.checklistItemAiTag}>
                          <Text style={styles.checklistItemAiTagText}>AI</Text>
                        </View>
                      )}
                    </View>
                    <Pressable
                      onPress={() => handleDeleteChecklistItem(item.id)}
                      style={styles.checklistItemDelete}
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={20} color={colors.gray500} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.checklistEmptyBox}>
                <Text style={styles.emptyTitle}>체크리스트가 비어있어요</Text>
                <Text style={styles.emptySubtitle}>
                  AI가 일정에 맞는 준비물을 추천해드려요.
                </Text>
                <Pressable
                  onPress={handleAiRecommendChecklist}
                  disabled={aiRecommendLoading}
                  style={({ pressed }) => [pressed && { opacity: 0.8 }]}
                >
                  <GradientBackground
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.aiRecommendButton}
                  >
                    <View style={styles.aiRecommendButtonContent}>
                      <LightningIcon width={16} height={16} color={colors.black} />
                      <Text style={styles.aiRecommendButtonText}>AI 추천받기</Text>
                    </View>
                  </GradientBackground>
                </Pressable>
              </View>
            )}
            {/* 할일 직접 추가 입력창 */}
            <View style={styles.checklistAddRow}>
              <TextInput
                style={[
                  styles.checklistAddInput,
                  Platform.OS === 'android' && styles.checklistAddInputAndroid,
                  Platform.OS === 'ios' && styles.checklistAddInputIOS,
                ]}
                placeholder="할일 입력..."
                placeholderTextColor={colors.gray500}
                value={newChecklistItem}
                onChangeText={setNewChecklistItem}
                maxLength={100}
                editable={!addingChecklistItem}
                returnKeyType="done"
                onSubmitEditing={handleAddChecklistItem}
              />
              <Pressable
                style={({ pressed }) => [styles.checklistAddButton, pressed && styles.checklistAddButtonPressed]}
                onPress={handleAddChecklistItem}
                disabled={addingChecklistItem || !newChecklistItem.trim()}
              >
                <Text style={[styles.checklistAddButtonText, (!newChecklistItem.trim() || addingChecklistItem) && styles.checklistAddButtonTextDisabled]}>
                  추가
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* 오늘의 비용 섹션 */}
        <View style={styles.section}>
          <Pressable style={[styles.cardBase, styles.costCardPrimary]}>
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

        {/* 숙박 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>여행 정보 (Reference)</Text>
          {todayAccommodations.length > 0 ? (
            todayAccommodations.map((accommodation: Accommodation) => (
              <Pressable
                key={accommodation.id}
                style={[styles.cardBase, styles.accommodationCard]}
                onPress={() => {
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
            ))
          ) : (
            <View style={styles.cardBase}>
              <Text style={styles.emptyText}>오늘 숙박 정보가 없습니다</Text>
            </View>
          )}
        </View>


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
        onEditPlan={() => {}}
        onDeletePlan={async (plan) => {
          try {
            await plansQuery.deletePlan(plan.id);
            if (selectedPlan?.id === plan.id) {
              const remaining = plansQuery.plans.filter((p) => p.id !== plan.id);
              setSelectedPlan(remaining[0] ?? null);
            }
            Alert.alert('성공', '여행이 삭제되었습니다.');
          } catch (error) {
            Alert.alert('오류', '여행 삭제에 실패했습니다.');
          }
        }}
      />

      <ItineraryDetailModal
        visible={showItineraryDetail}
        onClose={() => {
          setShowItineraryDetail(false);
          setSelectedItinerary(null);
        }}
        itinerary={selectedItinerary}
        onEdit={(itinerary) => {
          setShowItineraryDetail(false);
          setEditingItinerary(itinerary);
          setShowItineraryEdit(true);
        }}
        onDelete={async (itinerary) => {
          try {
            await itinerariesApi.deleteItinerary(itinerary.id);
            planData.removeItinerary(itinerary.id);
            refetchTodayExpenses();
            Alert.alert('삭제완료', '일정이 삭제되었습니다.');
          } catch (error) {
            Alert.alert('오류', '일정 삭제에 실패했습니다.');
          }
        }}
      />

      <ItineraryEditModal
        visible={showItineraryEdit}
        onClose={() => {
          setShowItineraryEdit(false);
          setEditingItinerary(null);
        }}
        itinerary={editingItinerary}
        planId={selectedPlan?.id ?? 0}
        onSave={(itinerary) => {
          planData.addItinerary(itinerary);
          refetchTodayExpenses();
        }}
        onDelete={(itineraryId) => {
          planData.removeItinerary(itineraryId);
          refetchTodayExpenses();
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
            Alert.alert('삭제완료', '숙소가 삭제되었습니다.');
          } catch (error) {
            Alert.alert('오류', '숙소 삭제에 실패했습니다.');
          }
        }}
      />

      <AccommodationEditModal
        visible={showAccommodationEdit}
        onClose={() => {
          setShowAccommodationEdit(false);
          setEditingAccommodation(null);
        }}
        accommodation={editingAccommodation}
        planId={selectedPlan?.id ?? 0}
        onSave={(updated) => {
          planData.addAccommodation(updated);
          refetchTodayExpenses();
        }}
        onDelete={(accommodationId) => planData.removeAccommodation(accommodationId)}
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
            Alert.alert('삭제완료', '항공 편이 삭제되었습니다.');
          } catch (error) {
            Alert.alert('오류', '항공 편 삭제에 실패했습니다.');
          }
        }}
      />

      <FlightEditModal
        visible={showFlightEdit}
        onClose={() => {
          setShowFlightEdit(false);
          setEditingFlight(null);
        }}
        flight={editingFlight}
        planId={selectedPlan?.id ?? 0}
        planStartDate={selectedPlan?.startDate}
        onSave={(updated) => {
          planData.addFlight(updated);
          refetchTodayExpenses();
        }}
        onDelete={(flightId) => planData.removeFlight(flightId)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray100,
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
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: colors.gray100,
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
  planDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
    maxHeight: 200,
    zIndex: 999,
  },
  planList: {
    maxHeight: 200,
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  planItemFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  planItemSelected: {
    backgroundColor: colors.gray100,
  },
  planItemText: {
    ...textStyles.h6,
    color: colors.black,
    flex: 1,
  },
  planItemTextSelected: {
    color: colors.primary,
  },
  greeting: {
    ...textStyles.body3,
    color: colors.black,
  },
  
  cardBase: {
    marginHorizontal: 16,
    padding: 20,
    backgroundColor: colors.white,
    borderRadius: 14,
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
  
  section: {
    marginTop: 8,
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
  
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderTitle: {
    ...textStyles.h6,
    color: colors.black,
  },
  aiRecommendButtonHeader: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  aiRecommendButtonPressed: {
    opacity: 0.8,
  },
  aiRecommendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  checklistListBox: {
    marginBottom: 0,
  },
  checklistListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
    gap: 12,
  },
  checklistItemCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    backgroundColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checklistItemCheckboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checklistItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checklistItemName: {
    ...textStyles.body3,
    color: colors.black,
  },
  checklistItemNameChecked: {
    color: colors.gray600,
  },
  checklistItemAiTag: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  checklistItemAiTagText: {
    ...textStyles.h9,
    color: colors.primary,
  },
  checklistItemDelete: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistEmptyBox: {
    backgroundColor: colors.gray200,
    borderRadius: 12,
    padding: 26,
  },
  emptyTitle: {
    ...textStyles.h6,
    color: colors.gray700,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...textStyles.body4,
    color: colors.gray600,
    marginBottom: 16,
    textAlign: 'center',
  },
  aiRecommendButton: {
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  aiRecommendButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiRecommendButtonText: {
    ...textStyles.h6,
    color: colors.black,
  },
  checklistAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray200,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 12,
  },
  checklistAddInput: {
    flex: 1,
    ...textStyles.body3,
    color: colors.black,
    paddingHorizontal: 0,
  },
  checklistAddInputAndroid: {
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  checklistAddInputIOS: {
    paddingVertical: 0,
    lineHeight: textStyles.body3.fontSize ? textStyles.body3.fontSize * 1.2 : 20,
  },
  checklistAddButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  checklistAddButtonPressed: {
    opacity: 0.7,
  },
  checklistAddButtonText: {
    ...textStyles.h6,
    color: colors.black,
  },
  checklistAddButtonTextDisabled: {
    color: colors.gray500,
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
  emptyText: {
    ...textStyles.body3,
    color: colors.gray500,
    textAlign: 'center',
    paddingVertical: 8,
  },
});

