import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Calendar as BigCalendar } from 'react-native-big-calendar';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';
import ko from 'dayjs/locale/ko';
import TripSelector from './TripSelector';
import SharePlanModal from '@/components/SharePlanModal';
import { plansApi } from '@/services/plans';
import { usePlans } from '@/hooks/usePlans';
import { useEffect } from 'react';
import { usePlanData } from '@/hooks/usePlanData';
import ModalLayout from './ModalLayout';

dayjs.locale(ko);

export interface Itinerary {
  id: number;
  title: string;
  itineraryDate: string; // 'YYYY-MM-DD'
  startTime: string;     // 'HH:mm'
  endTime: string;       // 'HH:mm'
  location?: string;     // 상세 장소
  city?: string;         // 도시
  color?: string;        // 선택적 (백엔드에서 제공하지 않음)
}

function toEvent(it: Itinerary): any {
  // 일정은 모두 파란색으로 통일
  const color = '#3478f6'; // 파란색
  
  // 시간 형식 정규화 (초가 있으면 제거)
  const normalizeTime = (time: string) => {
    return time.split(':').slice(0, 2).join(':');
  };
  
  const normalizedStartTime = normalizeTime(it.startTime);
  const normalizedEndTime = normalizeTime(it.endTime);
  const locationText = it.location || it.city || '';

  const event = {
    id: it.id,
    title: it.title, // 제목만 사용 (시간과 장소는 renderEvent에서 별도 렌더링)
    start: new Date(`${it.itineraryDate}T${normalizedStartTime}:00`),
    end: new Date(`${it.itineraryDate}T${normalizedEndTime}:00`),
    color: color,
    // 추가 데이터를 event 객체에 저장
    normalizedStartTime,
    normalizedEndTime,
    locationText,
  } as any;
  
  return event;
}

function toFlightEvent(flight: any): any {
  // 항공편의 첫 번째 구간의 출발 시간을 기준으로 이벤트 생성
  if (!flight.flightSegments || flight.flightSegments.length === 0) {
    return null;
  }
  
  const firstSegment = flight.flightSegments[0];
  const departureTime = dayjs(firstSegment.departureTime);
  const arrivalTime = dayjs(firstSegment.arrivalTime);
  
  // 시간 정규화 (초가 있으면 제거)
  const normalizeTime = (time: string) => {
    return time.split(':').slice(0, 2).join(':');
  };
  
  const normalizedStartTime = normalizeTime(departureTime.format('HH:mm'));
  const normalizedEndTime = normalizeTime(arrivalTime.format('HH:mm'));
  
  const event = {
    id: `flight-${flight.id}`,
    title: `✈️ ${firstSegment.departureAirport} → ${firstSegment.arrivalAirport}`,
    start: departureTime.toDate(),
    end: arrivalTime.toDate(),
    color: '#ff6b35', // 항공편 전용 색상 (주황색)
    type: 'flight',
    originalData: flight,
    // 시간 정보 추가
    normalizedStartTime,
    normalizedEndTime,
  } as any;
  
  return event;
}

interface Props {
  itineraries: Itinerary[];
  flights?: any[];
  height?: number;
  onItineraryAdd?: (itinerary: any) => void;
  onPlanSelect?: (planId: number | null) => void;
  onItinerarySelect?: (itinerary: Itinerary) => void;
}

export default function WeeklyScheduleModal({ itineraries, flights = [], height = 600, onItineraryAdd, onPlanSelect, onItinerarySelect }: Props) {
    const [currentWeekStart, setCurrentWeekStart] = useState(
        dayjs().startOf('week').add(1, 'day') // 월요일 시작
        );
    const [selectedTrip, setSelectedTrip] = useState<any>(null);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
    const [shareOpen, setShareOpen] = useState(false);
    const [memoOpen, setMemoOpen] = useState(false);
    const [memoDraft, setMemoDraft] = useState('');
    
    // Plan API 연동
    const { plans, addPlan, updatePlan, deletePlan, isLoading, error, fetchPlans } = usePlans();

    // 초대 수락 후 목록 즉시 갱신을 위한 이벤트 리스너
    useEffect(() => {
      const handler = () => { fetchPlans(); };
      if (typeof window !== 'undefined') {
        window.addEventListener('plans-refresh', handler);
        return () => window.removeEventListener('plans-refresh', handler);
      }
    }, [fetchPlans]);

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

    const myRole = useMemo(() => {
      const r = (planData.plan as any)?.myRole;
      return typeof r === 'string' ? r.toLowerCase() : undefined; // 'owner' | 'editor' | 'viewer'
    }, [planData.plan]);

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
    const displayItineraries = itineraries;
    
    // 실제 데이터만 사용 (테스트 데이터 제거)
    const finalItineraries = displayItineraries;
    
    const events = useMemo(() => {
      const itineraryEvents = finalItineraries.map(toEvent);
      const flightEvents = flights.map(toFlightEvent).filter(Boolean);
      return [...itineraryEvents, ...flightEvents];
    }, [itineraries, flights]);

    const goPrev = () => setCurrentWeekStart(prev => prev.subtract(1, 'week'));
    const goNext = () => setCurrentWeekStart(prev => prev.add(1, 'week'));
    const goToday = () => setCurrentWeekStart(dayjs().startOf('week').add(1, 'day'));
    

  return (
    <ModalLayout style={styles.container}>
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

        {/* 기능 버튼 그룹: plan 선택 시만 표시 */}
        {selectedPlanId ? (
          <View style={styles.actionGroup}>
            {(myRole === 'owner' || myRole === 'editor') && (
              <Pressable
                onPress={() => setShareOpen(true)}
                style={[styles.actionBtn]}
              >
                <Text style={styles.actionText}>공유</Text>
              </Pressable>
            )}

            {(myRole === 'owner' || myRole === 'editor') && (
              <Pressable
                onPress={() => {
                  // 항공권 관리 진입: 현재 화면 구조상 직접 열 수 없어 안내 처리
                  Alert.alert('안내', '오른쪽 패널의 "항공" 섹션에서 관리할 수 있어요.');
                }}
                style={[styles.actionBtn, { marginLeft: 6 }]}
              >
                <Text style={styles.actionText}>항공권</Text>
              </Pressable>
            )}

            {(myRole === 'owner' || myRole === 'editor' || myRole === 'viewer') && (
              <Pressable
                onPress={() => {
                  setMemoDraft((planData.plan as any)?.memo ?? '');
                  setMemoOpen(true);
                }}
                style={[styles.actionBtn, { marginLeft: 6 }]}
              >
                <Text style={styles.actionText}>메모</Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </View>

      {/* 캘린더 */}
      <BigCalendar
        mode="week"
        events={events}
        height={height - 50} // 헤더 높이만큼 빼기
        date={currentWeekStart.toDate()}
        hourRowHeight={80}
        weekStartsOn={1}
        hideNowIndicator
        swipeEnabled
        showTime
        renderEvent={(event, touchableOpacityProps) => {
          // key/children은 제거하고, onPress는 내부 Touchable에서 호출하여 경고 없이 클릭 유지
          const { key: eventKey, children: _ignoreChildren, style: tpStyle, onPress: calendarOnPress, ...rest } = (touchableOpacityProps as any) ?? {};
          return (
            <View
              key={eventKey}
              {...rest}
              style={[tpStyle, { backgroundColor: event.color || '#3478f6' }]}
            >
              <TouchableOpacity
                style={{ flex: 1, justifyContent: 'center', padding: 4 }}
                onPress={(e) => {
                  try { calendarOnPress && calendarOnPress(e); } catch {}
                  const itinerary = finalItineraries.find(it => it.id === event.id);
                  if (itinerary && onItinerarySelect) {
                    onItinerarySelect(itinerary);
                  }
                }}
              >
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: '#fff', fontSize: 10, fontWeight: 'bold', lineHeight: 12 }}>
                      {event.title}
                    </Text>
                    {event.normalizedStartTime && event.normalizedEndTime && (
                      <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: '#fff', fontSize: 8, lineHeight: 10, marginTop: 3 }}>
                        🕒 {event.normalizedStartTime}-{event.normalizedEndTime}
                      </Text>
                    )}
                    {event.locationText && (
                      <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: '#fff', fontSize: 8, lineHeight: 10, marginTop: 3 }}>
                        📍 {event.locationText}
                      </Text>
                    )}
                  </View>
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

      {/* 공유 모달 */}
      <SharePlanModal
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        onSubmit={async ({ email, role, expires_days }) => {
          if (!selectedPlanId) throw new Error('No plan selected');
          await plansApi.invite(selectedPlanId, { email, role, expires_days });
          Alert.alert('성공', '초대 메일을 전송했습니다.');
        }}
        planId={selectedPlanId as number}
      />

      {/* 메모 편집 모달 */}
      <Modal visible={memoOpen} transparent animationType="fade" onRequestClose={() => setMemoOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '90%' }] }>
            <Text style={styles.title}>플랜 메모</Text>
            <TextInput
              style={[styles.memoInput]}
              multiline
              numberOfLines={6}
              value={memoDraft}
              onChangeText={setMemoDraft}
              placeholder="메모를 입력하세요"
              textAlignVertical="top"
            />
            <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop: 8 }}>
              <Pressable onPress={() => setMemoOpen(false)} style={[styles.todayBtn, { marginRight: 6 }]}>
                <Text style={styles.todayText}>취소</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  try {
                    if (!selectedPlanId) throw new Error('No plan selected');
                    await plansApi.setMemo(selectedPlanId, memoDraft ?? '');
                    Alert.alert('성공', '메모가 저장되었습니다.');
                    setMemoOpen(false);
                    // 최신 데이터 반영
                    if (selectedPlanId) {
                      // @ts-ignore
                      planData.fetchPlanData && (await planData.fetchPlanData(selectedPlanId));
                    }
                  } catch (e: any) {
                    Alert.alert('오류', e?.response?.data?.detail || '메모 저장에 실패했습니다.');
                  }
                }}
                style={[styles.todayBtn]}
              >
                <Text style={styles.todayText}>저장</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </ModalLayout>
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
    actionGroup: { flexDirection:'row', alignItems:'center', marginLeft: 8 },
    actionBtn: { borderWidth: 1, borderColor: '#c5c5c5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
    actionText: { fontSize: 14, fontWeight: '600' },
    memoInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, minHeight: 120, backgroundColor: '#fff' },
});
