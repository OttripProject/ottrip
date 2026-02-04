import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Modal, Animated, RefreshControl } from 'react-native';
import dayjs from 'dayjs';
import { getTodayKoreanDate, formatTime } from '@/utils/dateUtils';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { usePlansQuery } from '@/hooks/usePlansQuery';
import { usePlanDataQuery } from '@/hooks/usePlanDataQuery';
import { useExpensesQuery } from '@/hooks/useExpensesQuery';
import { Plan, Itinerary } from '@/types/api';
import { categoryLabels } from '@/types/expense';
import ProfileModal from '@/components/modals/mobile/ProfileModal.native';
import PlanSelectModal from '@/components/modals/mobile/PlanSelectModal.native';
import GradientBackground from '@/ui/components/GradientBackground';
import SettingIcon from '../../assets/mobile_setting.svg';
import DropdownIcon from '../../assets/mobile_dropdown.svg';
import LocationIcon from '../../assets/mobile_location.svg';
import ChecklistIcon from '../../assets/mobile_check.svg';
import ExpenseIcon from '../../assets/mobile_expense.svg';
import AccommodationIcon from '../../assets/mobile_accomodation.svg';
import RightArrowIcon from '../../assets/right_arrow.svg';
import PlusIcon from '../../assets/mobile_plus.svg';
import LightningIcon from '../../assets/mobile_lightning.svg';

export default function TodayScreen() {
  const formattedDate = getTodayKoreanDate();
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [refreshing, setRefreshing] = useState(false);
  
  const plansQuery = usePlansQuery();
  const planData = usePlanDataQuery(selectedPlan?.publicId || null);
  
  const today = currentTime;
  const todayDateStr = today.format('YYYY-MM-DD');
  
  // 오늘 날짜의 expense 조회 (날짜 필터링 API 사용)
  const { data: todayExpensesFromApi = [], refetch: refetchTodayExpenses } = useExpensesQuery(selectedPlan?.id, todayDateStr);
  
  // Pulse 애니메이션
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
      // 날짜나 시간이 실제로 변경되었을 때만 상태 업데이트
      setCurrentTime((prevTime) => {
        const prevDateStr = prevTime.format('YYYY-MM-DD');
        const prevTimeStr = prevTime.format('HH:mm:ss');
        const nowDateStr = now.format('YYYY-MM-DD');
        const nowTimeStr = now.format('HH:mm:ss');
        
        // 날짜나 시간이 변경되었을 때만 업데이트
        if (prevDateStr !== nowDateStr || prevTimeStr !== nowTimeStr) {
          return now;
        }
        return prevTime;
      });
    };

    // 1초마다 실시간 체크
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

  const currentActivity = useMemo(() => {
    return todayItineraries.find((itinerary: Itinerary) => {
      if (!itinerary.startTime || !itinerary.endTime) return false;
      
      const startDateTime = dayjs(`${todayDateStr} ${itinerary.startTime}`);
      const endDateTime = dayjs(`${todayDateStr} ${itinerary.endTime}`);
      
      return currentTime.isAfter(startDateTime) && currentTime.isBefore(endDateTime);
    });
  }, [todayItineraries, todayDateStr, currentTime]);

  const nextActivityIndex = useMemo(() => {
    return todayItineraries.findIndex((itinerary: Itinerary) => {
      if (!itinerary.startTime) return false;
      const startDateTime = dayjs(`${todayDateStr} ${itinerary.startTime}`);
      return currentTime.isBefore(startDateTime);
    });
  }, [todayItineraries, todayDateStr, currentTime]);

  // 오늘 날짜의 숙박 정보
  const todayAccommodations = useMemo(() => {
    if (!planData.accommodations || planData.accommodations.length === 0) {
      return [];
    }
    
    return planData.accommodations.filter((accommodation: any) => {
      const checkinDate = dayjs(accommodation.checkinDate).format('YYYY-MM-DD');
      const checkoutDate = dayjs(accommodation.checkoutDate).format('YYYY-MM-DD');
      // 체크인 날짜가 오늘이거나, 체크아웃 날짜가 오늘 이후인 경우
      return checkinDate <= todayDateStr && checkoutDate >= todayDateStr;
    });
  }, [planData.accommodations, todayDateStr]);

  const todayExpenses = useMemo(() => {
    let total = 0;
    const byCategory: Record<string, number> = {};
    
    // API에서 받은 오늘 날짜의 모든 expenses 합산
    // (일반 expenses + itinerary/flight/accommodation에 연결된 expenses 모두 포함)
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

  // 체크리스트 정보
  const checklist = useMemo(() => {
    return planData.plan?.travel_checklist || null;
  }, [planData.plan?.travel_checklist]);

  // 체크리스트 통계
  const checklistStats = useMemo(() => {
    if (!checklist || !checklist.categories) {
      return { total: 0, checked: 0 };
    }
    
    let total = 0;
    let checked = 0;
    
    Object.values(checklist.categories).forEach((category: any) => {
      if (Array.isArray(category)) {
        category.forEach((item: any) => {
          total++;
          if (item.is_checked) {
            checked++;
          }
        });
      }
    });
    
    return { total, checked };
  }, [checklist]);

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
          <View style={[styles.cardBase, styles.currentCard]}>
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
                    {formatTime(currentActivity.endTime)} 종료
                  </Text>
                </View>
              )}
            </View>
            
            <Text 
              style={styles.cardTitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {currentActivity.title || '활동'}
            </Text>
            {currentActivity.location && (
              <View style={styles.locationRow}>
                <LocationIcon width={16} height={16} color={colors.gray600} />
                <Text 
                  style={styles.cardLocation}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {currentActivity.location}
                </Text>
              </View>
            )}
            
            {currentActivity.description && (
              <View style={styles.noteBox}>
                <Text 
                  style={styles.note}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  "{currentActivity.description}"
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 타임라인 섹션 */}
        {todayItineraries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>타임라인</Text>
            
            {todayItineraries.map((itinerary: Itinerary, index: number) => {
              const isDone = currentActivity && 
                itinerary.id === currentActivity.id ? false :
                index < (nextActivityIndex === -1 ? todayItineraries.length : nextActivityIndex);
              const isNext = index === nextActivityIndex;
              const startTime = itinerary.startTime ? formatTime(itinerary.startTime) : '00:00';
              
              return (
                <View 
                  key={itinerary.id} 
                  style={[
                    styles.timelineItem,
                    isDone && styles.doneItem,
                  ]}
                >
                  <View style={styles.cardBase}>
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
                  </View>
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
              <Pressable>
                <PlusIcon width={20} height={20} color={colors.gray500} />
              </Pressable>
            </View>
            {checklist && checklistStats.total > 0 ? (
              <View style={styles.checklistGrayBox}>
                <View style={styles.checklistHeader}>
                  <Text style={styles.checklistTitle}>여행 준비 체크리스트</Text>
                  <Text style={styles.checklistProgress}>
                    {checklistStats.checked}/{checklistStats.total}
                  </Text>
                </View>
                <View style={styles.checklistProgressBar}>
                  <View 
                    style={[
                      styles.checklistProgressFill,
                      { width: `${(checklistStats.checked / checklistStats.total) * 100}%` }
                    ]} 
                  />
                </View>
              </View>
            ) : (
              <View style={styles.checklistEmptyBox}>
                <Text style={styles.emptyTitle}>체크리스트가 비어있어요</Text>
                <Text style={styles.emptySubtitle}>
                  AI가 일정에 맞는 준비물을 추천해드려요.
                </Text>
                <Pressable>
                  <GradientBackground
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
            todayAccommodations.map((accommodation: any) => (
              <Pressable key={accommodation.id} style={[styles.cardBase, styles.accommodationCard]}>
                <View style={styles.accommodationHeader}>
                  <AccommodationIcon width={24} height={24} color={colors.primary} />
                  <View style={styles.accommodationHeaderText}>
                    <Text style={styles.accommodationLabel}>오늘의 숙소</Text>
                    <Text style={styles.itemTitle}>{accommodation.name}</Text>
                    <Text style={styles.accommodationCheckin}>
                      체크인 {accommodation.checkinTime}
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
  
  // 공통 카드 스타일
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
  
  // 현재 활동 카드
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
  
  // 섹션
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
  
  // 타임라인
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
  
  // 체크리스트 카드 헤더
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
  // 체크리스트 카드
  checklistGrayBox: {
    backgroundColor: colors.gray300,
    borderRadius: 12,
    padding: 16,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  checklistTitle: {
    ...textStyles.h6,
    color: colors.black,
  },
  checklistProgress: {
    ...textStyles.body3,
    color: colors.gray600,
  },
  checklistProgressBar: {
    height: 8,
    backgroundColor: colors.gray300,
    borderRadius: 4,
    overflow: 'hidden',
  },
  checklistProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  checklistEmptyBox: {
    backgroundColor: colors.gray300,
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
  
  // 숙박 카드
  accommodationCard: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accommodationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
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
  
  // 비용 카드 (Primary 배경)
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

