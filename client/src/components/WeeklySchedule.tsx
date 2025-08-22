import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, TouchableOpacity, Modal } from 'react-native';
import { Calendar as BigCalendar } from 'react-native-big-calendar';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';
import ko from 'dayjs/locale/ko';
import TripSelector from './TripSelector';
import { usePlans } from '@/hooks/usePlans';
import { usePlanData } from '@/hooks/usePlanData';

dayjs.locale(ko);

export interface Itinerary {
  id: number;
  title: string;
  itineraryDate: string; // 'YYYY-MM-DD'
  startTime: string;     // 'HH:mm'
  endTime: string;       // 'HH:mm'
  color?: string;        // 선택적 (백엔드에서 제공하지 않음)
}

function toEvent(it: Itinerary): any {
  const defaultColors = [
    '#3478f6', // 파란색
    '#34c759', // 초록색
    '#ff9500', // 주황색
    '#ff3b30', // 빨간색
    '#af52de', // 보라색
    '#5856d6', // 남색
    '#ff2d92', // 분홍색
    '#007aff', // 하늘색
  ];
  
  // ID 기반으로 일관된 색상 선택
  const colorIndex = it.id % defaultColors.length;
  const color = it.color || defaultColors[colorIndex];
  
  // 시간 형식 정규화 (초가 있으면 제거)
  const normalizeTime = (time: string) => {
    return time.split(':').slice(0, 2).join(':');
  };
  
  const normalizedStartTime = normalizeTime(it.startTime);
  const normalizedEndTime = normalizeTime(it.endTime);
  
  const event = {
    id: it.id,
    title: it.title,
    start: new Date(`${it.itineraryDate}T${normalizedStartTime}:00`),
    end: new Date(`${it.itineraryDate}T${normalizedEndTime}:00`),
    color: color,
  } as any;
  
  return event;
}

interface Props {
  itineraries: Itinerary[];
  height?: number;
  onItineraryAdd?: (itinerary: any) => void;
  onPlanSelect?: (planId: number | null) => void;
  onItinerarySelect?: (itinerary: Itinerary) => void;
}

export default function WeeklySchedule({ itineraries, height = 600, onItineraryAdd, onPlanSelect, onItinerarySelect }: Props) {
    const [currentWeekStart, setCurrentWeekStart] = useState(
        dayjs().startOf('week').add(1, 'day') // 월요일 시작
        );
    const [selectedTrip, setSelectedTrip] = useState<any>(null);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
    
    // Plan API 연동
    const { plans, addPlan, updatePlan, deletePlan, isLoading, error } = usePlans();

    // Plan을 Trip으로 변환하는 매핑 함수
    const trips = useMemo(() => plans.map(plan => ({
      id: plan.id.toString(),
      name: plan.title,
      startDate: plan.startDate,
      endDate: plan.endDate,
    })), [plans]);

    // 선택된 Plan의 데이터 로딩
    const selectedPlanId = selectedTrip ? parseInt(selectedTrip.id) : null;
    const planData = usePlanData(selectedPlanId);

    const handleAddTrip = async (newTrip: any) => {
      try {
        const createdPlan = await addPlan({
          title: newTrip.name,
          startDate: newTrip.startDate,
          endDate: newTrip.endDate,
        });
        
        // 새로 생성된 Plan을 선택
        if (createdPlan) {
          const newTripData = {
            id: createdPlan.id.toString(),
            name: createdPlan.title,
            startDate: createdPlan.startDate,
            endDate: createdPlan.endDate,
          };
          setSelectedTrip(newTripData);
          onPlanSelect?.(createdPlan.id);
          Alert.alert('성공', '여행 계획이 추가되었습니다.');
        } else {
          Alert.alert('오류', '여행 계획 추가에 실패했습니다.');
        }
      } catch (error) {
        console.error('Failed to add trip:', error);
        Alert.alert('오류', '여행을 추가하는 중 오류가 발생했습니다.');
      }
    };

    const handleUpdateTrip = async (tripId: string, updatedTrip: any) => {
      try {
        const planId = parseInt(tripId);
        const updatedPlan = await updatePlan(planId, {
          title: updatedTrip.name,
          startDate: updatedTrip.startDate,
          endDate: updatedTrip.endDate,
        });
        
        if (updatedPlan) {
          // 현재 선택된 Plan이 수정된 Plan이면 선택 상태 업데이트
          if (selectedTrip && selectedTrip.id === tripId) {
            const updatedTripData = {
              id: updatedPlan.id.toString(),
              name: updatedPlan.title,
              startDate: updatedPlan.startDate,
              endDate: updatedPlan.endDate,
            };
            setSelectedTrip(updatedTripData);
          }
          Alert.alert('성공', '여행 계획이 수정되었습니다.');
        } else {
          Alert.alert('오류', '여행 계획 수정에 실패했습니다.');
        }
      } catch (error) {
        console.error('Failed to update trip:', error);
        Alert.alert('오류', '여행을 수정하는 중 오류가 발생했습니다.');
      }
    };

    const handleDeleteTrip = async (tripId: string) => {
      try {
        const planId = parseInt(tripId);
        const success = await deletePlan(planId);
        
        if (success) {
          // 현재 선택된 Plan이 삭제된 Plan이면 선택 해제
          if (selectedTrip && selectedTrip.id === tripId) {
            setSelectedTrip(null);
            onPlanSelect?.(null);
          }
          Alert.alert('성공', '여행 계획이 삭제되었습니다.');
        } else {
          Alert.alert('오류', '여행 계획 삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('Failed to delete trip:', error);
        Alert.alert('오류', '여행을 삭제하는 중 오류가 발생했습니다.');
      }
    };

    // planData의 itineraries를 우선 사용, 없으면 props의 itineraries 사용
    const displayItineraries = planData.itineraries.length > 0 ? planData.itineraries : itineraries;
    
    // 실제 데이터만 사용 (테스트 데이터 제거)
    const finalItineraries = displayItineraries;
    
    const events = useMemo(() => {
      const mappedEvents = finalItineraries.map(toEvent);
      return mappedEvents;
    }, [finalItineraries]);

    const goPrev = () => setCurrentWeekStart(prev => prev.subtract(1, 'week'));
    const goNext = () => setCurrentWeekStart(prev => prev.add(1, 'week'));
    const goToday = () => setCurrentWeekStart(dayjs().startOf('week').add(1, 'day'));
    

  return (
    <View style={styles.container}>
      {/* 커스텀 헤더 */}
      <View style={styles.customHeader}>
        {/* 왼쪽 화살표 */}
        <Pressable onPress={goPrev} style={styles.arrow}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>

        {/* 연·월 표시 */}
        <Text style={styles.title}>{currentWeekStart.format('YYYY년 M월')}</Text>

        {/* 오른쪽 화살표 */}
        <Pressable onPress={goNext} style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </Pressable>

        {/* Spacer */}
        <View style={{ flex: 0.02 }} />

        {/* 오늘 버튼 */}
        <Pressable onPress={goToday} style={styles.todayBtn}>
          <Text style={styles.todayText}>오늘</Text>
        </Pressable>

        {/* 월별 달력 버튼 */}
        <Pressable onPress={() => setShowMonthPicker(true)} style={[styles.todayBtn, { marginLeft: 6 }] }>
          <Text style={styles.todayText}>달력</Text>
        </Pressable>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* 여행 선택 콤보박스 */}
        <TripSelector
          selectedTrip={selectedTrip}
          onTripSelect={(trip) => {
            setSelectedTrip(trip);
            // 부모 컴포넌트에 Plan ID 전달
            if (onPlanSelect) {
              onPlanSelect(trip ? parseInt(trip.id) : null);
            }
          }}
          trips={trips}
          onTripAdd={handleAddTrip}
          onTripUpdate={handleUpdateTrip}
          onTripDelete={handleDeleteTrip}
        />
      </View>

      {/* 캘린더 */}
      <BigCalendar
        mode="week"
        events={events}
        height={height - 50} // 헤더 높이만큼 빼기
        date={currentWeekStart.toDate()}
        hourRowHeight={60}
        weekStartsOn={1}
        hideNowIndicator
        swipeEnabled
        showTime
        renderEvent={(event, touchableOpacityProps) => {
          return (
            <View
              {...touchableOpacityProps}
              style={[touchableOpacityProps.style, { backgroundColor: event.color || '#3478f6' }]}
            >
              <TouchableOpacity
                style={{ flex: 1, justifyContent: 'center', padding: 4 }}
                onPress={() => {
                  const itinerary = finalItineraries.find(it => it.id === event.id);
                  if (itinerary && onItinerarySelect) {
                    onItinerarySelect(itinerary);
                  } else {
                    console.log('❌ No itinerary found or no onItinerarySelect callback');
                  }
                }}
              >
                <Text numberOfLines={2} ellipsizeMode="tail" style={{ color: '#fff', fontSize: 10 }}>
                  {event.title}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* 월별 달력 모달 */}
      <Modal visible={showMonthPicker} transparent animationType="fade" onRequestClose={() => setShowMonthPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Calendar
              current={selectedDate}
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                const monday = dayjs(day.dateString).startOf('week').add(1, 'day');
                setCurrentWeekStart(monday);
                setShowMonthPicker(false);
              }}
              firstDay={1}
              monthFormat={'M월 yyyy'}
              markedDates={{
                [selectedDate]: { selected: true, selectedColor: '#111', selectedTextColor: '#fff' },
              }}
              theme={{
                arrowColor: '#111',
                todayTextColor: '#111',
                textMonthFontWeight: '700',
              }}
            />
            <Pressable onPress={() => setShowMonthPicker(false)} style={[styles.todayBtn, { alignSelf: 'center', marginTop: 8 }]}>
              <Text style={styles.todayText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    customHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#e0e0e0',
      zIndex: 9998,
    },
    arrow: { paddingHorizontal: 6, paddingVertical: 4 },
    arrowText: { fontSize: 24, fontWeight: '600' },
    title: { fontSize: 20, fontWeight: '700', marginHorizontal: 8 },
    todayBtn: {
      borderWidth: 1,
      borderColor: '#c5c5c5',
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
      todayText: { fontSize: 14, fontWeight: '600' },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: '#fff',
      borderRadius: 10,
      padding: 12,
      width: '92%',
      elevation: 4,
    },
});