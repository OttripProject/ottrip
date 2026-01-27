import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Modal, Animated, RefreshControl } from 'react-native';
import dayjs from 'dayjs';
import { getTodayKoreanDate, formatTime } from '@/utils/dateUtils';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { usePlansQuery } from '@/hooks/usePlansQuery';
import { usePlanDataQuery } from '@/hooks/usePlanDataQuery';
import { Plan, Itinerary } from '@/types/api';
import { categoryLabels } from '@/types/expense';
import ProfileModal from '@/components/modals/mobile/ProfileModal.native';
import SettingIcon from '../../assets/mobile_setting.svg';
import DropdownIcon from '../../assets/mobile_dropdown.svg';
import LocationIcon from '../../assets/mobile_location.svg';
import CheckIcon from '../../assets/check_black.svg';

export default function TodayScreen() {
  const formattedDate = getTodayKoreanDate();
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [refreshing, setRefreshing] = useState(false);
  
  const plansQuery = usePlansQuery();
  const planData = usePlanDataQuery(selectedPlan?.publicId || null);
  
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

  const today = currentTime;
  const todayDateStr = today.format('YYYY-MM-DD');

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

  const todayExpenses = useMemo(() => {
    if (!planData.expenses || planData.expenses.length === 0) {
      return { total: 0, byCategory: {} };
    }
    
    const todayExpensesList = planData.expenses.filter((expense: any) => {
      if (!expense.expenseDate) return false;
      const expenseDate = dayjs(expense.expenseDate).format('YYYY-MM-DD');
      return expenseDate === todayDateStr;
    });
    
    const total = todayExpensesList.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0);
    const byCategory: Record<string, number> = {};
    
    todayExpensesList.forEach((expense: any) => {
      const category = expense.category || '기타';
      byCategory[category] = (byCategory[category] || 0) + (expense.amount || 0);
    });
    
    return { total, byCategory };
  }, [planData.expenses, todayDateStr]);

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
                  onPress={() => setShowPlanSelector(!showPlanSelector)}
                >
                  <Text style={styles.tripTitle}>
                    {selectedPlan?.title || '여행을 선택해주세요'}
                  </Text>
                  <DropdownIcon width={20} height={20} color={colors.gray600} />
                </Pressable>
                
                {showPlanSelector && (
                  <>
                    <Pressable 
                      style={styles.overlay}
                      onPress={() => setShowPlanSelector(false)}
                    />
                    <View style={styles.planDropdown}>
                      <ScrollView style={styles.planList} nestedScrollEnabled>
                        {plansQuery.plans.length === 0 ? (
                          <View style={[styles.planItem, styles.planItemFirst]}>
                            <Text style={styles.planItemText}>여행 계획이 없습니다</Text>
                          </View>
                        ) : (
                          plansQuery.plans.map((plan, index) => (
                            <Pressable
                              key={plan.id}
                              style={[
                                styles.planItem,
                                index === 0 && styles.planItemFirst,
                                selectedPlan?.id === plan.id && styles.planItemSelected,
                              ]}
                              onPress={() => {
                                setSelectedPlan(plan);
                                setShowPlanSelector(false);
                              }}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                              <Text
                                style={[
                                  styles.planItemText,
                                  selectedPlan?.id === plan.id && styles.planItemTextSelected,
                                ]}
                              >
                                {plan.title}
                              </Text>
                              {selectedPlan?.id === plan.id && (
                                <CheckIcon width={20} height={20} color={colors.primary} />
                              )}
                            </Pressable>
                          ))
                        )}
                      </ScrollView>
                    </View>
                  </>
                )}
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
            
            <Text style={styles.cardTitle}>{currentActivity.title || '활동'}</Text>
            {currentActivity.location && (
              <View style={styles.locationRow}>
                <LocationIcon width={16} height={16} color={colors.gray600} />
                <Text style={styles.cardLocation}>{currentActivity.location}</Text>
              </View>
            )}
            
            {currentActivity.description && (
              <View style={styles.noteBox}>
                <Text style={styles.note}>"{currentActivity.description}"</Text>
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
                    <Text style={styles.itemTitle}>{itinerary.title || '활동'}</Text>
                    {itinerary.location && (
                      <Text style={styles.itemLocation}>{itinerary.location}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* 오늘의 비용 요약 */}
        {todayExpenses.total > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>오늘의 비용</Text>
            <View style={styles.costCard}>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>총 지출</Text>
                <Text style={styles.costAmount}>{formatCurrency(todayExpenses.total)}</Text>
              </View>
              <View style={styles.costDivider} />
              <Text style={styles.costDetail}>{formatExpenseDetail()}</Text>
            </View>
          </View>
        )}

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
    marginBottom: 10,
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
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  note: {
    ...textStyles.body3,
    color: colors.gray700,
  },
  
  // 섹션
  section: {
    marginTop: 8,
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
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextButton: {
    backgroundColor: '#0A84FF1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  nextButtonText: {
    ...textStyles.h9,
    color: colors.primary,
  },
  
  // 비용 카드
  costCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  costLabel: {
    ...textStyles.body2,
    color: colors.gray600,
  },
  costAmount: {
    ...textStyles.h3,
    color: colors.black,
    fontWeight: '700',
  },
  costDivider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: 12,
  },
  costDetail: {
    ...textStyles.body3,
    color: colors.gray500,
  },
});

