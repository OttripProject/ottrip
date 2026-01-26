import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { getWeekCalendar, formatDateRange, formatTime, convertUTCToLocalTime, isNextDayLocal } from '@/utils/dateUtils';
import { spacing } from '@/ui/tokens/spacing';
import { usePlansQuery } from '@/hooks/usePlansQuery';
import { usePlanDataQuery } from '@/hooks/usePlanDataQuery';
import { Plan, Itinerary, FlightRead } from '@/types/api';
import ProfileModal from '@/components/modals/mobile/ProfileModal.native';

export default function WeeklyScreen() {
  const plansQuery = usePlansQuery();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  
  useEffect(() => {
    if (!selectedPlan && plansQuery.plans.length > 0) {
      setSelectedPlan(plansQuery.plans[0]);
    }
  }, [plansQuery.plans, selectedPlan]);
  
  const planData = usePlanDataQuery(selectedPlan?.publicId || null);
  
  const firstItineraryDate = useMemo(() => {
    if (!planData.itineraries || planData.itineraries.length === 0) {
      return null;
    }
    const sortedItineraries = [...planData.itineraries].sort((a, b) => 
      dayjs(a.itineraryDate).diff(dayjs(b.itineraryDate))
    );
    return dayjs(sortedItineraries[0].itineraryDate);
  }, [planData.itineraries]);
  
  const weekCalendar = useMemo(() => {
    const baseDate = firstItineraryDate || dayjs();
    return getWeekCalendar(baseDate);
  }, [firstItineraryDate]);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const baseDate = firstItineraryDate || dayjs();
    const calendar = getWeekCalendar(baseDate);
    const todayItem = calendar.find(item => item.isToday);
    return todayItem?.fullDate || calendar[0].fullDate;
  });
  
  useEffect(() => {
    const baseDate = firstItineraryDate || dayjs();
    const calendar = getWeekCalendar(baseDate);
    const todayItem = calendar.find(item => item.isToday);
    setSelectedDate(todayItem?.fullDate || calendar[0].fullDate);
  }, [firstItineraryDate]);
  
  const weekRange = useMemo(() => {
    if (weekCalendar.length === 0) return '';
    return formatDateRange(weekCalendar[0].fullDate, weekCalendar[6].fullDate);
  }, [weekCalendar]);
  
  const selectedDateText = useMemo(() => {
    const month = selectedDate.month() + 1;
    const day = selectedDate.date();
    return `${month}월 ${day}일`;
  }, [selectedDate]);
  
  const selectedDateItineraries = useMemo(() => {
    if (!planData.itineraries) return [];
    return planData.itineraries.filter((itinerary: Itinerary) => 
      dayjs(itinerary.itineraryDate).isSame(selectedDate, 'day')
    );
  }, [planData.itineraries, selectedDate]);
  
  const selectedDateSchedules = useMemo(() => {
    const schedules: Array<{
      type: 'itinerary' | 'flight';
      id: number | string;
      time: string;
      endTime?: string;
      data: Itinerary | FlightRead;
      segment?: any;
      segmentIndex?: number;
    }> = [];
    
    selectedDateItineraries.forEach((itinerary: Itinerary) => {
      schedules.push({
        type: 'itinerary',
        id: itinerary.id,
        time: formatTime(itinerary.startTime || '00:00'),
        endTime: formatTime(itinerary.endTime || '00:00'),
        data: itinerary,
      });
    });
    
    // 모든 항공편의 각 구간을 개별 일정으로 추가 (웹과 동일)
    if (planData.flights) {
      planData.flights.forEach((flight: FlightRead) => {
        if (flight.flightSegments && flight.flightSegments.length > 0) {
          flight.flightSegments.forEach((segment, index) => {
            const departureTime = dayjs(segment.departureTime);
            
            // 선택된 날짜에 출발하는 구간만 추가
            if (departureTime.isSame(selectedDate, 'day')) {
              schedules.push({
                type: 'flight',
                id: `${flight.id}-segment-${index}`,
                time: convertUTCToLocalTime(segment.departureTime),
                endTime: convertUTCToLocalTime(segment.arrivalTime),
                data: flight,
                segment: segment,
                segmentIndex: index,
              });
            }
          });
        }
      });
    }
    
    return schedules.sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDateItineraries, planData.flights, selectedDate]);

  if (plansQuery.isLoading || planData.isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }
  
  if (plansQuery.plans.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>여행이 없습니다</Text>
          <Text style={styles.emptySubtext}>새 여행을 만들어보세요</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable
            style={styles.planSelector}
            onPress={() => setShowPlanSelector(!showPlanSelector)}
          >
            <Text style={styles.headerTitle} numberOfLines={1}>
              {selectedPlan?.title || '여행 선택'}
            </Text>
            <Ionicons 
              name={showPlanSelector ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={colors.gray600} 
            />
          </Pressable>
          <Pressable
            style={styles.settingsButton}
            onPress={() => setProfileModalVisible(true)}
          >
            <Ionicons name="settings-outline" size={24} color={colors.gray900} />
          </Pressable>
        </View>
        <Text style={styles.headerSubtitle}>{weekRange}</Text>
        
        {showPlanSelector && (
          <View style={styles.planDropdown}>
            <ScrollView style={styles.planList} nestedScrollEnabled>
              {plansQuery.plans.map((plan) => (
                <Pressable
                  key={plan.id}
                  style={[
                    styles.planItem,
                    selectedPlan?.id === plan.id && styles.planItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedPlan(plan);
                    setShowPlanSelector(false);
                  }}
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
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.weekScroll}
        contentContainerStyle={styles.weekContent}
      >
        {weekCalendar.map((item) => {
          const isSelected = selectedDate.isSame(item.fullDate, 'day');
          return (
            <Pressable
              key={`${item.year}-${item.month}-${item.date}`}
              style={[
                styles.dayButton,
                item.isToday && styles.dayButtonToday,
                isSelected && styles.dayButtonSelected,
              ]}
              onPress={() => setSelectedDate(item.fullDate)}
            >
              <Text
                style={[
                  styles.dayText,
                  (item.isToday || isSelected) && styles.dayTextActive,
                ]}
              >
                {item.day}
              </Text>
              <Text
                style={[
                  styles.dateText,
                  (item.isToday || isSelected) && styles.dateTextActive,
                ]}
              >
                {item.date}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView 
        style={styles.scheduleList}
        contentContainerStyle={styles.scheduleContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.scheduleDate}>{selectedDateText}</Text>

        {selectedDateSchedules.length === 0 ? (
          <View style={styles.emptyScheduleContainer}>
            <Text style={styles.emptyScheduleText}>이 날짜에는 일정이 없습니다</Text>
          </View>
        ) : (
          selectedDateSchedules.map((schedule) => {
            const isCurrentTime = dayjs().isSame(selectedDate, 'day') && 
              dayjs().isAfter(dayjs(`${selectedDate.format('YYYY-MM-DD')} ${schedule.time}`)) &&
              schedule.endTime &&
              dayjs().isBefore(dayjs(`${selectedDate.format('YYYY-MM-DD')} ${schedule.endTime}`));
            
            let showNextDay = false;
            
            if (schedule.type === 'flight' && schedule.segment) {
              // 현재 segment의 출발/도착 시간으로 날짜 비교
              const departureTime = dayjs(schedule.segment.departureTime);
              const arrivalTime = dayjs(schedule.segment.arrivalTime);
              
              const departureDate = departureTime.format('YYYY-MM-DD');
              const arrivalDate = arrivalTime.format('YYYY-MM-DD');
              showNextDay = departureDate !== arrivalDate;
            } else if (schedule.type === 'itinerary') {
              if (schedule.endTime && schedule.time) {
                const startTimeParts = schedule.time.split(':').map(Number);
                const endTimeParts = schedule.endTime.split(':').map(Number);
                const startMinutes = startTimeParts[0] * 60 + (startTimeParts[1] || 0);
                const endMinutes = endTimeParts[0] * 60 + (endTimeParts[1] || 0);
                showNextDay = endMinutes < startMinutes;
              }
            }
            
            if (schedule.type === 'flight' && schedule.segment) {
              const flight = schedule.data as FlightRead;
              const segment = schedule.segment;
              const segmentIndex = schedule.segmentIndex ?? 0;
              const totalSegments = flight.flightSegments?.length || 1;
              
              return (
                <View key={`flight-${flight.id}-segment-${segmentIndex}`} style={styles.scheduleItem}>
                  <View style={styles.scheduleTime}>
                    <Text style={styles.scheduleTimeText}>{schedule.time}</Text>
                    {showNextDay ? (
                      <View style={styles.scheduleTimeLineContainer}>
                        <View style={styles.scheduleTimeLineTop} />
                        <View style={styles.nextDayIndicator}>
                          <Text style={styles.nextDayText}>+1 day</Text>
                        </View>
                        <View style={styles.scheduleTimeLineBottom} />
                      </View>
                    ) : (
                      <View style={styles.scheduleTimeLine} />
                    )}
                    <Text style={styles.scheduleTimeText}>{schedule.endTime || ''}</Text>
                  </View>
                  
                  <View style={[styles.scheduleCard, styles.flightCard, isCurrentTime && styles.currentCard]}>
                    <View style={[styles.categoryBadge, styles.flightBadge, isCurrentTime && styles.currentBadge]}>
                      <Text style={styles.categoryText}>✈️ 항공</Text>
                    </View>
                    <Text style={styles.scheduleTitle}>
                      {segment.departureAirport} → {segment.arrivalAirport}
                    </Text>
                    {segment.airline && segment.flightNumber && (
                      <Text style={styles.scheduleLocation}>
                        {segment.airline} / {segment.flightNumber}
                      </Text>
                    )}
                    {totalSegments > 1 && (
                      <Text style={styles.scheduleNote}>
                        구간 {segmentIndex + 1}/{totalSegments}
                      </Text>
                    )}
                    {isCurrentTime && (
                      <View style={styles.currentIndicator}>
                        <View style={styles.currentDot} />
                        <Text style={styles.currentText}>진행 중</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            } else if (schedule.type === 'itinerary') {
              const itinerary = schedule.data as Itinerary;
              
              return (
                <View key={`itinerary-${itinerary.id}`} style={styles.scheduleItem}>
                  <View style={styles.scheduleTime}>
                    <Text style={styles.scheduleTimeText}>{schedule.time}</Text>
                    {showNextDay ? (
                      <View style={styles.scheduleTimeLineContainer}>
                        <View style={styles.scheduleTimeLineTop} />
                        <View style={styles.nextDayIndicator}>
                          <Text style={styles.nextDayText}>+1 day</Text>
                        </View>
                        <View style={styles.scheduleTimeLineBottom} />
                      </View>
                    ) : (
                      <View style={styles.scheduleTimeLine} />
                    )}
                    <Text style={styles.scheduleTimeText}>{schedule.endTime || ''}</Text>
                  </View>
                  
                  <View style={[styles.scheduleCard, isCurrentTime && styles.currentCard]}>
                    <View style={[styles.categoryBadge, isCurrentTime && styles.currentBadge]}>
                      <Text style={styles.categoryText}>
                        {itinerary.country ? '활동' : '일정'}
                      </Text>
                    </View>
                    <Text style={styles.scheduleTitle}>{itinerary.title}</Text>
                    {itinerary.location && (
                      <Text style={styles.scheduleLocation}>{itinerary.location}</Text>
                    )}
                    {itinerary.description && (
                      <Text style={styles.scheduleNote}>{itinerary.description}</Text>
                    )}
                    {isCurrentTime && (
                      <View style={styles.currentIndicator}>
                        <View style={styles.currentDot} />
                        <Text style={styles.currentText}>진행 중</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            }
          })
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    ...textStyles.h3,
    color: colors.gray600,
    marginBottom: 8,
  },
  emptySubtext: {
    ...textStyles.body2,
    color: colors.gray500,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: colors.white,
    position: 'relative',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  planSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  settingsButton: {
    padding: 4,
  },
  headerTitle: {
    ...textStyles.h3,
    color: colors.black,
    flexShrink: 1,
  },
  headerSubtitle: {
    ...textStyles.body2,
    color: colors.gray600,
  },
  planDropdown: {
    position: 'absolute',
    top: '100%',
    left: 24,
    right: 24,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
    maxHeight: 200,
    zIndex: 1000,
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
  
  weekScroll: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    flexGrow: 0,
  },
  weekContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: spacing.sm,
  },
  dayButton: {
    width: 48,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dayButtonToday: {
    backgroundColor: colors.gray400,
  },
  dayButtonSelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    ...textStyles.body3,
    color: colors.gray800,
    marginBottom: 4,
  },
  dayTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  dateText: {
    ...textStyles.body1,
    color: colors.gray800,
    fontWeight: '600',
  },
  dateTextActive: {
    color: colors.white,
  },
  
  // 일정 목록
  scheduleList: {
    flex: 1,
  },
  scheduleContent: {
    padding: 16,
    paddingBottom: 100,
  },
  scheduleDate: {
    ...textStyles.h4,
    color: colors.black,
    marginBottom: 20,
  },
  emptyScheduleContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyScheduleText: {
    ...textStyles.body2,
    color: colors.gray500,
  },
  
  // 일정 아이템
  scheduleItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  scheduleTime: {
    width: 60,
    alignItems: 'center',
    marginRight: 12,
  },
  scheduleTimeText: {
    ...textStyles.body3,
    color: colors.gray500,
    fontWeight: '500',
  },
  scheduleTimeLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.gray300,
    marginVertical: 4,
  },
  scheduleTimeLineContainer: {
    flex: 1,
    alignItems: 'center',
    marginVertical: 4,
  },
  scheduleTimeLineTop: {
    width: 2,
    flex: 1,
    backgroundColor: colors.gray300,
    minHeight: 8,
  },
  scheduleTimeLineBottom: {
    width: 2,
    flex: 1,
    backgroundColor: colors.gray300,
    minHeight: 8,
  },
  nextDayIndicator: {
    backgroundColor: colors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.gray300,
    marginVertical: 2,
  },
  nextDayText: {
    ...textStyles.body4,
    color: colors.gray600,
    fontSize: 9,
    fontWeight: '600',
  },
  
  // 일정 카드
  scheduleCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderLeftWidth: 3,
    borderLeftColor: colors.black,
  },
  currentCard: {
    borderColor: '#0EA5E9',
    borderWidth: 2,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gray100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  flightBadge: {
    backgroundColor: '#F0F9FF',
  },
  currentBadge: {
    backgroundColor: '#E0F2FE',
  },
  flightCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  categoryText: {
    ...textStyles.body4,
    color: colors.gray700,
    fontWeight: '500',
  },
  scheduleTitle: {
    ...textStyles.body1,
    color: colors.black,
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleLocation: {
    ...textStyles.body3,
    color: colors.gray600,
    marginBottom: 8,
  },
  scheduleNote: {
    ...textStyles.body4,
    color: colors.gray500,
    fontStyle: 'italic',
  },
  
  // 진행 중 인디케이터
  currentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  currentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0EA5E9',
    marginRight: 6,
  },
  currentText: {
    ...textStyles.body4,
    color: '#0EA5E9',
    fontWeight: '600',
  },
});

