import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, TouchableOpacity, Modal, Platform } from 'react-native';
import { Calendar as BigCalendar } from 'react-native-big-calendar';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';
import ko from 'dayjs/locale/ko';
import TripSelector from '../TripSelector';
import SharePlanModal from '@/components/modals/SharePlanModal';
import MonthCalendarPopup from '@/components/popup/MonthCalendarPopup';
import { plansApi } from '@/services/plans';
import { Plan, CreatePlanRequest, UpdatePlanRequest } from '@/types/api';
import ModalLayout from './ModalLayout';
import Card from '@/ui/components/Card';
import Input from '@/ui/components/input/Input';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { tripToastMessages } from '@/utils/toast';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';

// 아이콘 import
import LeftArrowIcon from '../../../assets/left_arrow.svg';
import RightArrowIcon from '../../../assets/right_arrow.svg';
import CalenderIcon from '../../../assets/calender.svg';
import TodayIcon from '../../../assets/today.svg';
import ShareIcon from '../../../assets/share.svg';
import AirplaneIcon from '../../../assets/airplane.svg';
import MemoIcon from '../../../assets/memo.svg';
import XIcon from '../../../assets/x.svg';
import FilesIcon from '../../../assets/files.svg';
import AccommodationIcon from '../../../assets/accomodation.svg';

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
  // 시간 형식 정규화 (초가 있으면 제거)
  const normalizeTime = (time: string) => {
    return time.split(':').slice(0, 2).join(':');
  };
  
  const normalizedStartTime = normalizeTime(it.startTime);
  const normalizedEndTime = normalizeTime(it.endTime);
  const locationText = it.location || it.city || '';

  const event = {
    id: it.id,
    title: it.title,
    start: new Date(`${it.itineraryDate}T${normalizedStartTime}:00`),
    end: new Date(`${it.itineraryDate}T${normalizedEndTime}:00`),
    color: '#3478f6', // 일정 전용 색상 (파란색)
    type: 'itinerary',
    originalData: it,
    // 시간 정보 추가
    normalizedStartTime,
    normalizedEndTime,
    locationText,
  } as any;

  return event;
}

function toFlightEvents(flight: any): any[] {
  // 항공편의 모든 구간을 개별 이벤트로 생성
  if (!flight.flightSegments || flight.flightSegments.length === 0) {
    return [];
  }
  
  // 시간 정규화 (초가 있으면 제거)
  const normalizeTime = (time: string) => {
    return time.split(':').slice(0, 2).join(':');
  };

  return flight.flightSegments.map((segment: any, index: number) => {
    const departureTime = dayjs(segment.departureTime);
    const arrivalTime = dayjs(segment.arrivalTime);

    const normalizedStartTime = normalizeTime(departureTime.format('HH:mm'));
    const normalizedEndTime = normalizeTime(arrivalTime.format('HH:mm'));

    return {
      id: `flight-${flight.id}-${segment.id ?? index + 1}`,
      title: `✈️ ${segment.departureAirport} → ${segment.arrivalAirport}`,
      start: departureTime.toDate(),
      end: arrivalTime.toDate(),
      color: '#ff6b35', // 항공편 전용 색상 (주황색)
      type: 'flight',
      originalData: flight,
      // 시간 정보 추가
      normalizedStartTime,
      normalizedEndTime,
    } as any;
  });
}

interface Props {
  itineraries: Itinerary[];
  flights?: any[];
  height?: number;
  onItineraryAdd?: (itinerary: any) => void;
  onPlanSelect?: (trip: any) => void;
  onItinerarySelect?: (itinerary: Itinerary) => void;
  onFlightAdd?: (flight: any) => void;
  onAccommodationAdd?: (accommodation: any) => void;
  onShowItineraryModal?: () => void;
  onShowFlightModal?: () => void;
  onRequestNewFlight?: () => void; // 새 항공편 추가 즉시 열기
  onRequestNewItinerary?: (date?: Date) => void; // 새 일정 추가 즉시 열기
  onShowAccommodationModal?: (accommodation: any, date?: string) => void;
  onShowItineraryDetail?: (itinerary: Itinerary) => void;
  onShowFlightDetail?: (flight: any) => void;
  onShowAccommodationDetail?: (accommodation: any) => void;
  selectedTrip?: any;
  planData?: any;
  // 상위에서 전달받는 plans 관련 props (중복 호출 방지)
  plans?: Plan[];
  trips?: any[];
  onPlansRefresh?: () => void;
  onPlanAdd?: (planData: CreatePlanRequest) => Promise<Plan>;
  onPlanUpdate?: (planId: number, planData: UpdatePlanRequest) => Promise<Plan>;
  onPlanDelete?: (planId: number) => Promise<boolean>;
}

export default function WeeklyScheduleModal({ 
  itineraries, 
  flights = [], 
  height = 600, 
  onItineraryAdd, 
  onPlanSelect, 
  onItinerarySelect, 
  onFlightAdd, 
  onAccommodationAdd, 
  onShowItineraryModal, 
  onShowFlightModal, 
  onRequestNewFlight, 
  onRequestNewItinerary, 
  onShowAccommodationModal, 
  onShowItineraryDetail, 
  onShowFlightDetail, 
  onShowAccommodationDetail, 
  selectedTrip, 
  planData: externalPlanData,
  plans: externalPlans = [],
  trips: externalTrips = [],
  onPlansRefresh,
  onPlanAdd,
  onPlanUpdate,
  onPlanDelete,
}: Props) {
    const [currentWeekStart, setCurrentWeekStart] = useState(
        dayjs().startOf('week').add(1, 'day') // 월요일 시작
        );
    const [internalSelectedTrip, setInternalSelectedTrip] = useState<any>(null);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
    const [shareOpen, setShareOpen] = useState(false);
    const [memoOpen, setMemoOpen] = useState(false);
    const [memoDraft, setMemoDraft] = useState('');
    
    // 상위에서 전달받은 plans와 trips 사용 (중복 호출 방지)
    const plans = externalPlans;
    const trips = externalTrips;
    const planData = externalPlanData;

    // 초대 수락 후 목록 즉시 갱신을 위한 이벤트 리스너
    useEffect(() => {
      const handler = () => { 
        if (onPlansRefresh) {
          onPlansRefresh(); 
        }
      };
      if (typeof window !== 'undefined') {
        window.addEventListener('plans-refresh', handler);
        return () => window.removeEventListener('plans-refresh', handler);
      }
    }, [onPlansRefresh]);

    // 외부 selectedTrip가 주어지면 TripSelector 선택과 동기화
    useEffect(() => {
      if (selectedTrip) {
        setInternalSelectedTrip(selectedTrip);
      }
    }, [selectedTrip]);

    // 선택된 trip의 시작 날짜로 주간 뷰 이동
    useEffect(() => {
      if (internalSelectedTrip?.startDate) {
        const startDateWeekStart = dayjs(internalSelectedTrip.startDate).startOf('week').add(1, 'day');
        setCurrentWeekStart(startDateWeekStart);
      }
    }, [internalSelectedTrip?.startDate]);

    const myRole = useMemo(() => {
      const r = (planData.plan as any)?.myRole;
      return typeof r === 'string' ? r.toLowerCase() : undefined; // 'owner' | 'editor' | 'viewer'
    }, [planData.plan]);

    // 주간 날짜 배열 생성
    const getWeekDays = () => {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const date = currentWeekStart.add(i, 'day');
        days.push(date.format('YYYY-MM-DD'));
      }
      return days;
    };

    // 특정 날짜의 숙박 정보 찾기 (체크인 날짜에만 표시)
    const getAccommodationForDate = (date: string) => {
      return planData.accommodations.find((acc: any) => {
        const checkinDate = dayjs(acc.checkinDate).format('YYYY-MM-DD');
        const targetDate = dayjs(date).format('YYYY-MM-DD');
        
        return targetDate === checkinDate;
      });
    };

    const handleAddTrip = async (newTrip: any) => {
      if (!onPlanAdd) {
        tripToastMessages.addErrorGeneric();
        return null;
      }
      
      try {
        const createdPlan = await onPlanAdd({
          title: newTrip.name,
          startDate: newTrip.startDate,
          endDate: newTrip.endDate,
        });
        
        // 새로 생성된 Plan을 선택
        if (createdPlan) {
          const newTripData = {
            id: createdPlan.id.toString(),
            publicId: createdPlan.publicId,
            name: createdPlan.title,
            startDate: createdPlan.startDate,
            endDate: createdPlan.endDate,
          };
          setInternalSelectedTrip(newTripData);
          onPlanSelect?.(newTripData);
          
          // URL 업데이트 (웹에서)
          if (typeof window !== 'undefined' && Platform.OS === 'web') {
            window.history.pushState({}, '', `/plans/${createdPlan.publicId}`);
          }
          
          return newTripData;
        } else {
          tripToastMessages.addError();
        }
      } catch (error) {
        console.error('Failed to add trip:', error);
        tripToastMessages.addErrorGeneric();
      }

      return null;
    };

    const handleUpdateTrip = async (tripId: string, updatedTrip: any) => {
      if (!onPlanUpdate) {
        Alert.alert('오류', '여행 계획 수정에 실패했습니다.');
        return;
      }
      
      try {
        const planId = parseInt(tripId);
        const updatedPlan = await onPlanUpdate(planId, {
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
            setInternalSelectedTrip(updatedTripData);
            
            // 시작 날짜가 포함된 주의 월요일로 주간 뷰 이동
            const startDateWeekStart = dayjs(updatedPlan.startDate).startOf('week').add(1, 'day');
            setCurrentWeekStart(startDateWeekStart);
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
      if (!onPlanDelete) {
        Alert.alert('오류', '여행 계획 삭제에 실패했습니다.');
        return;
      }
      
      try {
        const planId = parseInt(tripId);
        const success = await onPlanDelete(planId);
        
        if (success) {
          // 현재 선택된 Plan이 삭제된 Plan이면 선택 해제
          if (internalSelectedTrip && internalSelectedTrip.id === tripId) {
            setInternalSelectedTrip(null);
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
      const flightEvents = flights.flatMap(toFlightEvents);
      return [...itineraryEvents, ...flightEvents];
    }, [itineraries, flights]);

    const goPrev = () => setCurrentWeekStart(prev => prev.subtract(1, 'week'));
    const goNext = () => setCurrentWeekStart(prev => prev.add(1, 'week'));
    const goToday = () => setCurrentWeekStart(dayjs().startOf('week').add(1, 'day'));
    

  return (
    <ModalLayout style={styles.container}>
      {/* 커스텀 헤더 - Figma 디자인에 맞게 재구성 */}
      <View style={styles.customHeader}>
        {/* 왼쪽: 타이틀 및 날짜 네비게이션 */}
        <View style={styles.leftSection}>
          <Text style={styles.title}>Weekly Schedule</Text>
          
          <View style={styles.dateNavigation}>
            <Pressable onPress={goPrev}>
              <LeftArrowIcon width={12} height={12} />
            </Pressable>
            
            <Text style={styles.dateText}>{currentWeekStart.format('YYYY년 M월')}</Text>
            
            <Pressable onPress={goNext}>
              <RightArrowIcon width={12} height={12} />
            </Pressable>
          </View>

          <Pressable onPress={goToday} style={[styles.actionButton, { marginLeft: spacing.xl }]}>
            <View style={{ marginRight: spacing.xs }}>
              <TodayIcon width={16} height={16} />
            </View>
            <Text style={styles.actionButtonText}>오늘</Text>
          </Pressable>

          <View style={styles.calendarButtonWrapper}>
            <Pressable onPress={() => setShowMonthPicker(true)} style={[styles.iconButton, { marginLeft: spacing.sm }]}>
              <CalenderIcon width={16} height={16} />
            </Pressable>
            <MonthCalendarPopup
              visible={showMonthPicker}
              selectedDate={selectedDate}
              currentWeekStart={currentWeekStart.format('YYYY-MM-DD')}
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                const monday = dayjs(day.dateString).startOf('week').add(1, 'day');
                setCurrentWeekStart(monday);
              }}
              onClose={() => setShowMonthPicker(false)}
              style={styles.calendarPopup}
            />
          </View>
        </View>

        {/* 오른쪽: 여행 선택 및 기능 버튼 */}
        <View style={styles.rightSection}>
          <TripSelector
            selectedTrip={internalSelectedTrip}
            onTripSelect={(trip) => {
              setInternalSelectedTrip(trip);
              // 부모 컴포넌트에 Plan ID 전달
              if (onPlanSelect) {
                onPlanSelect(trip);
              }
              // URL 변경 (웹에서만)
              if (typeof window !== 'undefined' && Platform.OS === 'web') {
                if (trip?.publicId) {
                  window.history.pushState({}, '', `/plans/${trip.publicId}`);
                } else {
                  window.history.pushState({}, '', '/');
                }
              }
            }}
            trips={trips}
            onTripAdd={handleAddTrip}
            onTripUpdate={handleUpdateTrip}
            onTripDelete={handleDeleteTrip}
          />

          {/* 기능 버튼 그룹: plan 선택 시만 표시 */}
          {internalSelectedTrip ? (
            <View style={styles.actionGroup}>
              {(myRole === 'owner' || myRole === 'editor') && (
                <Pressable
                  onPress={() => setShareOpen(true)}
                  style={styles.iconButton}
                >
                  <ShareIcon width={16} height={16} />
                </Pressable>
              )}

              {(myRole === 'owner' || myRole === 'editor') && (
                <Pressable
                  onPress={() => {
                    // TODO: 파일 첨부 기능 구현
                  }}
                  style={styles.iconButton}
                >
                  <FilesIcon width={16} height={16} />
                </Pressable>
              )}

              {(myRole === 'owner' || myRole === 'editor') && (
                <Pressable
                  onPress={() => {
                    if (onRequestNewFlight) onRequestNewFlight(); else onShowFlightModal?.();
                  }}
                  style={styles.iconButton}
                >
                  <AirplaneIcon width={16} height={16} />
                </Pressable>
              )}

              {(myRole === 'owner' || myRole === 'editor' || myRole === 'viewer') && (
                <Pressable
                  onPress={() => {
                    setMemoDraft((planData.plan as any)?.memo ?? '');
                    setMemoOpen(true);
                  }}
                  style={styles.iconButton}
                >
                  <MemoIcon width={16} height={16} />
                </Pressable>
              )}
            </View>
          ) : null}
        </View>
      </View>

      {/* 캘린더 */}
      <View style={styles.calendarWrapper}>
        <BigCalendar
        mode="week"
        events={events}
        height={height - 50}
        date={currentWeekStart.toDate()}
        hourRowHeight={40}
        weekStartsOn={1}
        hideNowIndicator
        swipeEnabled
        showTime
        scrollOffsetMinutes={360}
        renderHeader={(props) => {
          return (
            <View>
              <View style={{ flexDirection: 'row', height: 70 }}>
                <View style={styles.timeColumn} />
                {getWeekDays().map((date, index) => {
                  const isToday = dayjs(date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
                  return (
                    <View key={date} style={styles.dateHeaderCell}>
                      <Text style={styles.weekdayText}>
                        {dayjs(date).format('ddd')}
                      </Text>
                      <View style={isToday ? styles.todayDateCircle : null}>
                        <Text style={isToday ? styles.todayDateText : styles.dateText}>
                          {dayjs(date).format('D')}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
              {/* 날짜 헤더 아래 공간 - 시간 열에 "숙박 */}
              {internalSelectedTrip && (
                <View style={{ flexDirection: 'row', height: 40, backgroundColor: '', borderTopWidth: 0.5, borderBottomWidth: 0.5, borderTopColor: '#e0e0e0', borderBottomColor: '#e0e0e0' }}>
                  <View style={[styles.timeColumn, { justifyContent: 'center', alignItems: 'center', borderRightWidth: 0.5, borderRightColor: '#e0e0e0' }]}>
                    <AccommodationIcon width={16} height={16} />
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row' }}>
                    {getWeekDays().map((date, index) => {
                      const accommodation = getAccommodationForDate(date);
                      return (
                        <Pressable
                          key={date}
                          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', borderRightWidth: index < getWeekDays().length - 1 ? 1 : 0, borderRightColor: '#e0e0e0' }}
                          onPress={() => {
                            if (accommodation) {
                              onShowAccommodationModal?.(accommodation);
                            } else {
                              onShowAccommodationModal?.(null, date);
                            }
                          }}
                        >
                          {accommodation && (
                            <View style={{ backgroundColor: '#ff9500', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, width: '90%' }}>
                              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }} numberOfLines={1}>
                                {accommodation.name}
                              </Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          );
        }}
        onPressCell={(date: Date) => {
          onRequestNewItinerary?.(date);
        }}
        renderEvent={(event, touchableOpacityProps) => {
          // key/children은 제거하고, onPress는 내부 Touchable에서 호출하여 경고 없이 클릭 유지
          const { key: eventKey, children: _ignoreChildren, style: tpStyle, onPress: calendarOnPress, ...rest } = (touchableOpacityProps as any) ?? {};
          
          // 이벤트 타입 확인
          const isItinerary = event.type === 'itinerary';
          const isFlight = event.type === 'flight';
          
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
                  
                  if (isItinerary) {
                    // 일정 상세 보기
                    onShowItineraryDetail?.(event.originalData);
                  } else if (isFlight) {
                    // 항공편 상세 보기
                    onShowFlightDetail?.(event.originalData);
                  }
                }}
              >
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: '#fff', fontSize: 10, fontWeight: 'bold', lineHeight: 12 }}>
                    {event.title}
                  </Text>
                  {isItinerary && event.normalizedStartTime && event.normalizedEndTime && (
                    <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: '#fff', fontSize: 8, lineHeight: 10, marginTop: 3 }}>
                      🕒 {event.normalizedStartTime}-{event.normalizedEndTime}
                    </Text>
                  )}
                  {isItinerary && event.locationText && (
                    <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: '#fff', fontSize: 8, lineHeight: 10, marginTop: 3 }}>
                      📍 {event.locationText}
                    </Text>
                  )}
                  {isFlight && event.normalizedStartTime && event.normalizedEndTime && (
                    <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: '#fff', fontSize: 8, lineHeight: 10, marginTop: 3 }}>
                      🕒 {event.normalizedStartTime}-{event.normalizedEndTime}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          );
        }}
      />
      </View>


      {/* 공유 모달 */}
      <SharePlanModal
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        onSubmit={async ({ email, role, expires_days }) => {
          if (!internalSelectedTrip?.id) throw new Error('No plan selected');
          await plansApi.invite(parseInt(internalSelectedTrip.id), { email, role, expires_days });
          Alert.alert('성공', '초대 메일을 전송했습니다.');
        }}
        planId={internalSelectedTrip ? parseInt(internalSelectedTrip.id) : 0}
        planName={internalSelectedTrip?.name}
      />

      {/* 메모 편집 모달 */}
      <Modal visible={memoOpen} transparent animationType="fade" onRequestClose={() => setMemoOpen(false)}>
        <View style={styles.modalOverlay}>
          <Card
            width="100%"
            maxWidth={420}
            minHeight={582}
            paddingHorizontal={32}
            paddingVertical={32}
            borderRadius={24}
            alignItems="stretch"
            shadow={{
              shadowColor: colors.black,
              shadowOffset: { width: 0, height: 24 },
              shadowOpacity: 0.12,
              shadowRadius: 48,
              elevation: 24,
            }}
            style={{ marginHorizontal: 16 }}
          >
            <View style={styles.memoModalHeader}>
              <View style={styles.memoModalTextGroup}>
                <Text style={styles.memoModalTitle}>공유 메모</Text>
                <Text style={styles.memoModalDescription}>다른 사람과 여행을 공유하고 함께 계획을 세워보세요.</Text>
              </View>
              <Pressable onPress={() => setMemoOpen(false)} style={styles.memoModalCloseButton}>
                <XIcon width={24} height={24} />
              </Pressable>
            </View>

            <View style={styles.memoModalFieldGroup}>
              <Text style={styles.memoModalLabel}>내용</Text>
              <Input
                placeholder={PLACEHOLDERS.plan.memo}
                multiline
                numberOfLines={8}
                value={memoDraft}
                onChangeText={setMemoDraft}
                textAlignVertical="top"
                style={styles.memoModalInput}
              />
            </View>

            <View style={styles.memoModalActions}>
              <Pressable onPress={() => setMemoOpen(false)} style={styles.memoModalSecondaryButton}>
                <Text style={styles.memoModalSecondaryButtonText}>닫기</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  try {
                    if (!internalSelectedTrip?.id) throw new Error('No plan selected');
                    await plansApi.setMemo(parseInt(internalSelectedTrip.id), memoDraft ?? '');
                    Alert.alert('성공', '메모가 저장되었습니다.');
                    setMemoOpen(false);
                    if (internalSelectedTrip?.publicId) {
                      // @ts-ignore
                      planData.fetchPlanData && (await planData.fetchPlanData(internalSelectedTrip.publicId));
                    }
                  } catch (e: any) {
                    Alert.alert('오류', e?.response?.data?.detail || '메모 저장에 실패했습니다.');
                  }
                }}
                style={styles.memoModalPrimaryButton}
              >
                <Text style={styles.memoModalPrimaryButtonText}>저장</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </Modal>


    </ModalLayout>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      minHeight: 0,
      backgroundColor: colors.white,
    },
    calendarWrapper: {
      flex: 1,
      minHeight: 0,
    },
    customHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 32,
      paddingVertical: 22,
      backgroundColor: colors.white,
      zIndex: 9998,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      ...textStyles.poppinsH4,
      marginRight: spacing.xl,
    },
    dateNavigation: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginLeft: spacing.xl,
    },
    dateText: {
      ...textStyles.h6,
    },
    dateHeaderCell: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.sm,
    },
    weekdayText: {
      ...textStyles.h8,
      color: colors.gray600,
    },
    todayDateCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    todayDateText: {
      ...textStyles.h6,
      color: colors.white,
    },
    timeColumn: {
      width: 51,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.gray300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionButton: {
      flexDirection: 'row',
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.gray300,
      paddingHorizontal: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionButtonText: {
      ...textStyles.h8,
      fontSize: 12,
      lineHeight: 18,
    },
    actionGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginLeft: spacing.md,
    },
    todayBtn: {
      borderWidth: 1,
      borderColor: colors.gray300,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    todayText: {
      ...textStyles.h8,
      fontSize: 12,
      lineHeight: 18,
    },
    calendarButtonWrapper: {
      position: 'relative',
    },
    calendarPopup: {
      position: 'absolute',
      top: 40,
      left: 8,
      width: 276,
      backgroundColor: colors.white,
      borderRadius: 10,
      padding: 12,
      elevation: 8,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      zIndex: 10000,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.white,
      borderRadius: 10,
      padding: 12,
      width: '92%',
      elevation: 4,
    },
    memoModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 40,
    },
    memoModalTextGroup: {
      flex: 1,
      paddingRight: 16,
    },
    memoModalTitle: {
      ...textStyles.h3,
      marginBottom: 8,
    },
    memoModalDescription: {
      ...textStyles.body4,
      color: colors.gray700,
    },
    memoModalCloseButton: {
      width: 26,
      height: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    memoModalFieldGroup: {
      marginBottom: 24,
    },
    memoModalLabel: {
      ...textStyles.h7,
      color: colors.black,
      marginBottom: 8,
    },
    memoModalInput: {
      minHeight: 300,
      maxHeight: 356,
      borderWidth: 1,
      borderColor: colors.gray400,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: colors.white,
      fontSize: 13,
      lineHeight: 20,
    },
    memoModalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      columnGap: 8,
    },
    memoModalSecondaryButton: {
      minWidth: 174,
      height: 50,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.gray400,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    memoModalSecondaryButtonText: {
      ...textStyles.h6,
      color: colors.black,
    },
    memoModalPrimaryButton: {
      minWidth: 174,
      height: 50,
      borderRadius: 10,
      backgroundColor: colors.black,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    memoModalPrimaryButtonText: {
      ...textStyles.h6,
      color: colors.white,
    },
    accommodationRow: {
      flexDirection: 'row',
      backgroundColor: colors.gray200,
      borderBottomWidth: 1,
      borderBottomColor: colors.gray300,
      height: 50,
    },
    accommodationLabel: {
      width: 60,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.white,
      borderRightWidth: 1,
      borderRightColor: colors.gray300,
    },
    accommodationLabelText: {
      fontSize: 16,
    },
    accommodationCell: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderRightWidth: 1,
      borderRightColor: colors.gray300,
    },
    accommodationItem: {
      backgroundColor: '#ff9500',
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      width: '90%',
    },
    accommodationName: {
      color: colors.white,
      fontSize: 10,
      fontWeight: '600',
    },
});
