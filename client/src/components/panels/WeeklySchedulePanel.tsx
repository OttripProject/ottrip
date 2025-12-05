import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, TouchableOpacity, Modal, Platform } from 'react-native';
import { Calendar as BigCalendar } from 'react-native-big-calendar';
import dayjs from 'dayjs';
import ko from 'dayjs/locale/ko';
import TripSelector from '../selector/TripSelector';
import SharePlanModal from '@/components/modals/SharePlanModal';
import BaseCalendar from '@/components/popup/calendar/BaseCalendar';
import { plansApi } from '@/services/plans';
import { Plan, CreatePlanRequest, UpdatePlanRequest } from '@/types/api';
import PanelLayout from './PanelLayout';
import Card from '@/ui/components/Card';
import Input from '@/ui/components/input/Input';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { tripToastMessages } from '@/utils/toast';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens';

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
import WeekBarAirplaneIcon from '../../../assets/week_bar_airplane.svg';
import WeekBarLocationIcon from '../../../assets/week_bar_location.svg';
import WeekBarTimeIcon from '../../../assets/week_bar_time.svg';
import WeekBarAccommodationIcon from '../../../assets/week_bar_accommodation.svg';

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
  let normalizedEndTime = normalizeTime(it.endTime);
  const locationText = it.location || it.city || '';

  // 백엔드에서 받은 23:59:59를 24:00으로 표시
  if (normalizedEndTime === '23:59' || it.endTime?.startsWith('23:59:')) {
    normalizedEndTime = '24:00';
  }

  // endTime이 24:00인 경우, 23:59:59로 표시 (BigCalendar는 24:00을 표시할 수 없음)
  let endDate = new Date(`${it.itineraryDate}T${normalizedEndTime}:00`);
  if (normalizedEndTime === '24:00') {
    // 일정 날짜의 23:59:59로 표시 (막대는 24:00까지 표시)
    endDate = dayjs(`${it.itineraryDate}T23:59:59`).toDate();
    normalizedEndTime = '24:00'; // 표시는 24:00으로 유지
  }

  const event = {
    id: it.id,
    title: it.title,
    start: new Date(`${it.itineraryDate}T${normalizedStartTime}:00`),
    end: endDate,
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
    
    // 도착 시간이 다음날 00:00인 경우, 출발 날짜의 23:59:59로 표시 (BigCalendar는 24:00을 표시할 수 없음)
    const departureDate = departureTime.format('YYYY-MM-DD');
    const arrivalDate = arrivalTime.format('YYYY-MM-DD');
    const isNextDay = arrivalDate !== departureDate && arrivalTime.format('HH:mm') === '00:00';
    
    let displayEndTime = arrivalTime;
    let normalizedEndTime = normalizeTime(arrivalTime.format('HH:mm'));
    
    if (isNextDay) {
      // 출발 날짜의 23:59:59로 표시 (막대는 24:00까지 표시)
      displayEndTime = departureTime.endOf('day');
      normalizedEndTime = '24:00';
    }

    const normalizedStartTime = normalizeTime(departureTime.format('HH:mm'));

    return {
      id: `flight-${flight.id}-${segment.id ?? index + 1}`,
      title: `${segment.departureAirport} → ${segment.arrivalAirport}`,
      start: departureTime.toDate(),
      end: displayEndTime.toDate(),
      type: 'flight',
      originalData: flight,
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
  // 디테일패널 상태 추적용 (미리보기 제거를 위해)
  activeTab?: 'itinerary' | 'flight' | 'accommodation' | undefined;
  selectedItinerary?: any;
}

export default function WeeklySchedulePanel({ 
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
  activeTab,
  selectedItinerary,
}: Props) {
    const [currentWeekStart, setCurrentWeekStart] = useState(
        dayjs().startOf('week').add(1, 'day') // 월요일 시작
        );
    const [internalSelectedTrip, setInternalSelectedTrip] = useState<any>(null);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
    const [shareOpen, setShareOpen] = useState(false);
    const [memoOpen, setMemoOpen] = useState(false);
    const [memoDraft, setMemoDraft] = useState('');
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [previewEvent, setPreviewEvent] = useState<{
      start: Date;
      end: Date;
      title: string;
      startTime: string;
      endTime: string;
      location?: string;
    } | null>(null);
    
    // 드래그까진 잘됨, 드롭은 되는데 시간 이상
    // 드래그 앤 드롭 상태
    const [draggingEvent, setDraggingEvent] = useState<{
      id: string;
      type: 'itinerary' | 'flight';
      startX: number;
      startY: number;
      elementX: number; // 이벤트 요소의 화면상 X 위치
      elementY: number; // 이벤트 요소의 화면상 Y 위치
      elementWidth: number; // 이벤트 요소의 너비
      elementHeight: number; // 이벤트 요소의 높이
    } | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    
    // 드롭 위치 미리보기 상태
    const [dropPreviewPosition, setDropPreviewPosition] = useState<{
      x: number;      // 화면상 X 위치
      y: number;      // 화면상 Y 위치
      date: string;   // 'YYYY-MM-DD'
      time: Date;     // 드롭될 시간
    } | null>(null);
    
    // 최신 드롭 위치를 ref로 저장 (클로저 문제 해결)
    const dropPreviewPositionRef = useRef<{
      x: number;
      y: number;
      date: string;
      time: Date;
    } | null>(null);
    
    // 드롭된 이벤트의 새로운 위치 (로컬 상태로만 관리)
    const [droppedEventPosition, setDroppedEventPosition] = useState<{
      eventId: string;
      newStart: Date;
      newEnd: Date;
    } | null>(null);
    
    // 캘린더 컨테이너 ref (드롭 위치 계산용)
    const calendarWrapperRef = useRef<View>(null);
    const [calendarLayout, setCalendarLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    
    // 드롭 위치 계산 함수
    const calculateDropPosition = useCallback((clientX: number, clientY: number) => {
      // 웹에서만 getBoundingClientRect 사용 가능
      if (Platform.OS !== 'web') return null;
      
      // onLayout으로 저장된 위치 정보가 없으면 null 반환
      if (calendarLayout.width === 0 || calendarLayout.height === 0) {
        return null;
      }
      
      // 웹에서 DOM 요소 직접 찾기
      let calendarElement: HTMLElement | null = null;
      
      // 방법 1: data-testid로 찾기
      calendarElement = document.querySelector('[data-testid="calendar-wrapper"]') as HTMLElement;
      
      // 방법 2: ref로 찾기
      if (!calendarElement && calendarWrapperRef.current) {
        const refElement = calendarWrapperRef.current as any;
        if (refElement._nativeNode) {
          calendarElement = refElement._nativeNode;
        } else if (refElement._internalFiberInstanceHandleDEV?.stateNode) {
          calendarElement = refElement._internalFiberInstanceHandleDEV.stateNode;
        }
      }
      
      // 방법 3: BigCalendar의 클래스로 찾기 (가장 안정적)
      if (!calendarElement) {
        const bigCalendar = document.querySelector('.rbc-calendar') as HTMLElement;
        if (bigCalendar) {
          calendarElement = bigCalendar;
        }
      }
      
      // 방법 4: onLayout으로 저장된 위치 정보 사용
      if (!calendarElement) {
        // 모든 div 요소 중에서 크기가 일치하는 것 찾기
        const allDivs = document.querySelectorAll('div');
        calendarElement = Array.from(allDivs).find((el: any) => {
          const rect = el.getBoundingClientRect();
          return Math.abs(rect.width - calendarLayout.width) < 20 && 
                 Math.abs(rect.height - calendarLayout.height) < 20 &&
                 rect.width > 500; // 캘린더는 충분히 큰 요소
        }) as HTMLElement || null;
      }
      
      // 여전히 찾지 못하면 onLayout 정보로 직접 계산
      let calendarRect: DOMRect;
      if (!calendarElement) {
        // onLayout으로 저장된 정보를 사용하여 가상의 rect 생성
        // 하지만 실제 화면 위치를 알아야 하므로, 다른 방법 시도
        const testElement = document.querySelector('[data-testid="calendar-wrapper"]') as HTMLElement;
        if (testElement) {
          calendarRect = testElement.getBoundingClientRect();
        } else {
          // 최후의 수단: 모든 큰 div 중에서 찾기
          const bigDivs = Array.from(document.querySelectorAll('div')).filter((el: any) => {
            const rect = el.getBoundingClientRect();
            return rect.width > 500 && rect.height > 300;
          });
          if (bigDivs.length > 0) {
            calendarRect = (bigDivs[0] as HTMLElement).getBoundingClientRect();
          } else {
            return null;
          }
        }
      } else {
        calendarRect = calendarElement.getBoundingClientRect();
      }
      
      const timeColumnWidth = 60; // 시간 열 너비
      const headerHeight = 110; // 헤더 높이 (날짜 헤더 70px + 숙박 행 40px)
      const hourRowHeight = 40;
      const timeslots = 3; // 15분 단위
      const segmentHeight = hourRowHeight / (timeslots + 1); // 10px per 15min
      
      // 캘린더 영역 내 상대 좌표 계산
      const relativeX = clientX - calendarRect.left;
      const relativeY = clientY - calendarRect.top - headerHeight;
      
      // 캘린더 영역 밖이면 null 반환
      if (relativeX < timeColumnWidth || relativeY < 0) return null;
      if (relativeX > calendarRect.width || relativeY > calendarRect.height - headerHeight) return null;
      
      // 날짜 계산
      const calendarWidth = calendarRect.width - timeColumnWidth;
      const dayWidth = calendarWidth / 7;
      const dayIndex = Math.floor((relativeX - timeColumnWidth) / dayWidth);
      const dayIndexClamped = Math.max(0, Math.min(6, dayIndex));
      const targetDate = dayjs(currentWeekStart).add(dayIndexClamped, 'day');
      
      // 시간 계산
      const segmentIndex = Math.floor(relativeY / segmentHeight);
      const hour = Math.floor(segmentIndex / (timeslots + 1));
      const minuteSegment = segmentIndex % (timeslots + 1);
      const minutes = minuteSegment * 15; // 0, 15, 30, 45
      
      // 시간 범위 제한 (0-23시)
      const clampedHour = Math.max(0, Math.min(24, hour));
      const targetTime = targetDate.hour(clampedHour).minute(minutes).second(0).millisecond(0);
          
      // 드롭 위치의 실제 화면 좌표 계산 (해당 날짜/시간 셀의 위치)
      const dayLeft = calendarRect.left + timeColumnWidth + (dayWidth * dayIndexClamped);
      const timeTop = calendarRect.top + headerHeight + (segmentIndex * segmentHeight);
      
      // 이벤트의 left margin 반영 (3.5%)
      const leftMarginPercent = 3.5;
      const eventLeft = dayLeft + (dayWidth * leftMarginPercent / 100);
      
      return {
        x: eventLeft,
        y: timeTop,
        date: targetDate.format('YYYY-MM-DD'),
        time: targetTime.toDate(),
      };
    }, [currentWeekStart, calendarLayout]);
    
    // 마우스 이벤트 핸들러 (웹용)
    useEffect(() => {
      if (!draggingEvent) return;
      
      const handleMouseMove = (e: MouseEvent) => {
        const offsetX = e.clientX - draggingEvent.startX;
        const offsetY = e.clientY - draggingEvent.startY;
        setDragOffset({ x: offsetX, y: offsetY });
        
        // 드래그 중인 이벤트 막대의 현재 위치 계산
        const draggedElementX = draggingEvent.elementX + offsetX;
        const draggedElementY = draggingEvent.elementY + offsetY;
        
        // 이벤트 막대의 중심점 또는 상단 중앙점을 기준으로 드롭 위치 계산
        // 상단 중앙점 사용 (더 직관적)
        const elementCenterX = draggedElementX + (draggingEvent.elementWidth / 2);
        const elementTopY = draggedElementY;
                
        // 드롭 위치 미리보기 계산 (드래그 중인 이벤트 막대의 위치 기준)
        const dropPos = calculateDropPosition(elementCenterX, elementTopY);
        setDropPreviewPosition(dropPos);
        // ref에도 저장 (최신 값 보장)
        dropPreviewPositionRef.current = dropPos;
      };
      
      const handleMouseUp = () => {
        // ref에서 최신 드롭 위치 가져오기
        const latestDropPos = dropPreviewPositionRef.current;
        
        // 드롭 위치가 있으면 이벤트 위치 업데이트 (로컬 상태만)
        if (latestDropPos && draggingEvent) {
          const dropTime = dayjs(latestDropPos.time);
          
          // 드래그된 이벤트 찾기 (itineraries 또는 flights에서)
          let originalStart: dayjs.Dayjs | null = null;
          let originalEnd: dayjs.Dayjs | null = null;
          
          if (draggingEvent.type === 'itinerary') {
            const itineraryId = parseInt(draggingEvent.id);
            const itinerary = itineraries.find(it => it.id === itineraryId);
            if (itinerary) {
              originalStart = dayjs(`${itinerary.itineraryDate}T${itinerary.startTime}:00`);
              originalEnd = dayjs(`${itinerary.itineraryDate}T${itinerary.endTime}:00`);
            }
          } else if (draggingEvent.type === 'flight') {
            // event.id 형식: `flight-${flight.id}-${segment.id ?? index + 1}`
            const eventIdParts = draggingEvent.id.split('-');
            const flightId = eventIdParts.length > 1 ? parseInt(eventIdParts[1]) : null;
            const segmentIndex = eventIdParts.length > 2 ? parseInt(eventIdParts[2]) - 1 : 0;
            
            if (flightId) {
              const flight = flights.find(f => f.id === flightId);
              if (flight && flight.flightSegments && flight.flightSegments[segmentIndex]) {
                const segment = flight.flightSegments[segmentIndex];
                originalStart = dayjs(segment.departureTime);
                originalEnd = dayjs(segment.arrivalTime);
              }
            }
          }
          
          if (originalStart && originalEnd) {
            const duration = originalEnd.diff(originalStart, 'minute'); // 분 단위 차이
            
            // 새로운 시작/종료 시간 계산
            const newStart = dropTime.toDate();
            const newEnd = dropTime.add(duration, 'minute').toDate();            
          
            // 드롭된 위치 저장
            setDroppedEventPosition({
              eventId: draggingEvent.id,
              newStart,
              newEnd,
            });
          }
        }
        
        // 드래그 종료
        setDraggingEvent(null);
        setDragOffset({ x: 0, y: 0 });
        setDropPreviewPosition(null);
        dropPreviewPositionRef.current = null;
      };
      
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        setDropPreviewPosition(null);
        dropPreviewPositionRef.current = null;
      };
    }, [draggingEvent, calculateDropPosition, itineraries, flights]);
    
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

    // 일정 미리보기 업데이트를 위한 이벤트 리스너
    useEffect(() => {
      const handler = (e: CustomEvent) => {
        const { title, startTime, endTime, location, itineraryDate } = e.detail;
        if (previewEvent) {
          setPreviewEvent(prev => prev ? {
            ...prev,
            title: title !== undefined ? title : prev.title,
            startTime: startTime !== undefined ? startTime : prev.startTime,
            endTime: endTime !== undefined ? endTime : prev.endTime,
            location: location !== undefined ? location : prev.location,
            start: itineraryDate && startTime 
              ? dayjs(`${itineraryDate}T${startTime}:00`).toDate()
              : prev.start,
            end: itineraryDate && endTime
              ? dayjs(`${itineraryDate}T${endTime}:00`).toDate()
              : prev.end,
          } : null);
        }
      };
      
      if (typeof window !== 'undefined') {
        window.addEventListener('itinerary-preview-update', handler as EventListener);
        return () => window.removeEventListener('itinerary-preview-update', handler as EventListener);
      }
    }, [previewEvent]);

    // 일정 저장/취소 시 미리보기 제거를 위한 이벤트 리스너
    useEffect(() => {
      const handler = () => {
        setPreviewEvent(null);
      };
      
      if (typeof window !== 'undefined') {
        window.addEventListener('itinerary-preview-clear', handler);
        return () => window.removeEventListener('itinerary-preview-clear', handler);
      }
    }, []);

    // 디테일패널이 일정 입력창이 아닌 다른 기능으로 변경되거나 닫히면 미리보기 제거
    useEffect(() => {
      if (previewEvent) {
        const isItineraryTabActive = activeTab === 'itinerary';
        
        if (!isItineraryTabActive) {
          setPreviewEvent(null);
        }
        else if (isItineraryTabActive && selectedItinerary && selectedItinerary.id) {
          setPreviewEvent(null);
        }
      }
    }, [activeTab, selectedItinerary, previewEvent]);

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

    // 특정 날짜의 숙박 정보 찾기 (체크인~체크아웃 사이의 모든 날짜 포함)
    const getAccommodationForDate = (date: string) => {
      const targetDate = dayjs(date).format('YYYY-MM-DD');
      return planData.accommodations.find((acc: any) => {
        const checkinDate = dayjs(acc.checkinDate).format('YYYY-MM-DD');
        const checkoutDate = dayjs(acc.checkoutDate).format('YYYY-MM-DD');
        
        // 체크인 날짜부터 체크아웃 날짜 전날까지 포함
        return targetDate >= checkinDate && targetDate < checkoutDate;
      });
    };
    
    // 숙박이 해당 날짜에서 시작인지 확인
    const isAccommodationStart = (accommodation: any, date: string) => {
      if (!accommodation) return false;
      const checkinDate = dayjs(accommodation.checkinDate).format('YYYY-MM-DD');
      const targetDate = dayjs(date).format('YYYY-MM-DD');
      return targetDate === checkinDate;
    };
    
    // 숙박이 해당 날짜에서 끝나는지 확인 (체크아웃 전날)
    const isAccommodationEnd = (accommodation: any, date: string) => {
      if (!accommodation) return false;
      const checkoutDate = dayjs(accommodation.checkoutDate).format('YYYY-MM-DD');
      const targetDate = dayjs(date).format('YYYY-MM-DD');
      const dayBeforeCheckout = dayjs(checkoutDate).subtract(1, 'day').format('YYYY-MM-DD');
      return targetDate === dayBeforeCheckout;
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
      
      // 미리보기 이벤트 추가
      const previewEvents = previewEvent ? [{
        id: 'preview-event',
        title: previewEvent.title,
        start: previewEvent.start,
        end: previewEvent.end,
        type: 'preview',
        normalizedStartTime: previewEvent.startTime,
        normalizedEndTime: previewEvent.endTime,
        locationText: previewEvent.location || '',
      }] : [];
      
      // 1. 두 배열을 합칩니다.
      const allEvents = [...itineraryEvents, ...flightEvents, ...previewEvents];
      
      // 드롭된 이벤트의 위치 업데이트 (로컬 상태만)
      if (droppedEventPosition) {
        const eventIndex = allEvents.findIndex(e => String(e.id) === String(droppedEventPosition.eventId));
        if (eventIndex !== -1) {
          const event = allEvents[eventIndex];
          
          // 새 객체 생성 (불변성 유지)
          allEvents[eventIndex] = {
            ...event,
            start: droppedEventPosition.newStart,
            end: droppedEventPosition.newEnd,
            normalizedStartTime: dayjs(droppedEventPosition.newStart).format('HH:mm'),
            normalizedEndTime: dayjs(droppedEventPosition.newEnd).format('HH:mm'),
          };
        } else {
        }
      }
      
      allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      
      const overlapGroups: any[][] = [];
      const processedEvents: any[] = [];
      
      allEvents.forEach((event) => {
        // 이미 그룹에 속한 이벤트인지 확인
        const alreadyInGroup = overlapGroups.some(group => 
          group.some(e => e.id === event.id)
        );
        
        if (alreadyInGroup) return;
        
        // 이 이벤트와 겹치는 모든 이벤트 찾기
        const overlappingEvents = allEvents.filter((otherEvent) => {
          if (otherEvent.id === event.id) return false;
          const eventStart = new Date(event.start).getTime();
          const eventEnd = new Date(event.end).getTime();
          const otherStart = new Date(otherEvent.start).getTime();
          const otherEnd = new Date(otherEvent.end).getTime();
          
          // 시간이 겹치는지 확인 (시작/종료 시간이 같아도 겹침으로 간주)
          return !(eventEnd <= otherStart || eventStart >= otherEnd);
        });
        
        if (overlappingEvents.length > 0) {
          // 겹치는 그룹 생성
          const group = [event, ...overlappingEvents];
          // 그룹 내에서 정렬 (시작 시간, 그 다음 ID)
          group.sort((a, b) => {
            const startDiff = new Date(a.start).getTime() - new Date(b.start).getTime();
            if (startDiff !== 0) return startDiff;
            return String(a.id).localeCompare(String(b.id));
          });
          overlapGroups.push(group);
        }
      });
      
      // 각 이벤트에 overlapIndex와 overlapCount 추가
      return allEvents.map((event) => {
        // 이 이벤트가 속한 그룹 찾기
        const group = overlapGroups.find(g => g.some(e => e.id === event.id));
        
        if (group) {
          const overlapIndex = group.findIndex(e => e.id === event.id);
          const overlapCount = group.length;
          
          return {
            ...event,
            id: String(event.id),
            overlapIndex,
            overlapCount,
          };
        }
        
        return {
          ...event,
          id: String(event.id),
          overlapIndex: 0,
          overlapCount: 1,
        };
      });
      
      return processedEvents;
    }, [itineraries, flights, previewEvent, droppedEventPosition]);

    const goPrev = () => setCurrentWeekStart(prev => prev.subtract(1, 'week'));
    const goNext = () => setCurrentWeekStart(prev => prev.add(1, 'week'));
    const goToday = () => setCurrentWeekStart(dayjs().startOf('week').add(1, 'day'));
    

  return (
    <PanelLayout style={styles.container}>
      {/* 커스텀 헤더 - Figma 디자인에 맞게 재구성 */}
      <View style={styles.customHeader}>
        {/* 왼쪽: 타이틀 및 날짜 네비게이션 */}
        <View style={styles.leftSection}>
          <Text style={styles.title}>Weekly Schedule</Text>
          
          <View style={styles.dateNavigation}>
            <Pressable onPress={goPrev}>
              <LeftArrowIcon width={16} height={16} />
            </Pressable>
            
            <Text style={styles.dateText}>{currentWeekStart.format('YYYY년 M월')}</Text>
            
            <Pressable onPress={goNext}>
              <RightArrowIcon width={16} height={16} />
            </Pressable>
          </View>

          <Pressable onPress={goToday} style={[styles.actionButton, { marginLeft: spacing.lg }]}>
            <View style={{ marginRight: spacing.xs }}>
              <TodayIcon width={16} height={16} />
            </View>
            <Text style={styles.actionButtonText}>오늘</Text>
          </Pressable>

          <View style={styles.calendarButtonWrapper}>
            <Pressable onPress={() => setShowMonthPicker(!showMonthPicker)} style={[styles.iconButton, { marginLeft: spacing.xs }]}>
              <CalenderIcon width={16} height={16} />
            </Pressable>
            <BaseCalendar
              visible={showMonthPicker}
              selectedDate={selectedDate}
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                const monday = dayjs(day.dateString).startOf('week').add(1, 'day');
                setCurrentWeekStart(monday);
              }}
              onClose={() => setShowMonthPicker(false)}
              style={styles.calendarPopup}
              currentWeekStart={currentWeekStart.format('YYYY-MM-DD')}
              showToday={true}
              showHover={true}
              scrollToWeek={true}
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
      <View 
        style={styles.calendarWrapper}
        ref={calendarWrapperRef}
        {...(Platform.OS === 'web' ? { 'data-testid': 'calendar-wrapper' } : {})}
        onLayout={(e) => {
          const { x, y, width, height } = e.nativeEvent.layout;
          setCalendarLayout({ x, y, width, height });
        }}
      >
        <BigCalendar
        mode="week"
        events={events}
        height={height - 50}
        date={currentWeekStart.toDate()}
        hourRowHeight={40}
        timeslots={3}
        weekStartsOn={1}
        hideNowIndicator
        swipeEnabled
        showTime
        scrollOffsetMinutes={360}
        onSwipeEnd={(newDate: Date) => {
          const newWeekStart = dayjs(newDate).startOf('week').add(1, 'day');
          setCurrentWeekStart(newWeekStart);
        }}
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
                  <View style={{ flex: 1, flexDirection: 'row', position: 'relative' }}>
                    {getWeekDays().map((date, index) => {
                      const accommodation = getAccommodationForDate(date);
                      const isStart = isAccommodationStart(accommodation, date);
                      const isEnd = isAccommodationEnd(accommodation, date);
                      const isMiddle = accommodation && !isStart && !isEnd;
                      
                      // 다음 날짜에도 같은 숙박이 있는지 확인
                      const nextDate = index < getWeekDays().length - 1 ? getWeekDays()[index + 1] : null;
                      const nextAccommodation = nextDate ? getAccommodationForDate(nextDate) : null;
                      const hasContinuousAccommodation = accommodation && nextAccommodation && 
                        accommodation.id === nextAccommodation.id;
                      
                      // 숙박이 연속되는 경우 오른쪽 border 숨김
                      const shouldHideRightBorder = hasContinuousAccommodation || isMiddle;
                      
                      return (
                        <Pressable
                          key={date}
                          style={{ 
                            flex: 1, 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            borderRightWidth: (index < getWeekDays().length - 1 && !shouldHideRightBorder) ? 1 : 0, 
                            borderRightColor: '#e0e0e0' 
                          }}
                          onPress={() => {
                            if (accommodation) {
                              onShowAccommodationModal?.(accommodation);
                            } else {
                              onShowAccommodationModal?.(null, date);
                            }
                          }}
                        >
                          {accommodation && (
                            <View style={{ 
                              backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                              borderTopWidth: 1,
                              borderBottomWidth: 1,
                              borderLeftWidth: isStart ? 1 : 0,
                              borderRightWidth: isEnd ? 1 : 0,
                              borderColor: '#F59E0B',
                              borderTopLeftRadius: isStart ? radii.base : 0,
                              borderBottomLeftRadius: isStart ? radii.base : 0,
                              borderTopRightRadius: isEnd ? radii.base : 0,
                              borderBottomRightRadius: isEnd ? radii.base : 0,
                              paddingHorizontal: isStart ? 8 : (isEnd ? 8 : 0),
                              paddingVertical: 4, 
                              width: '100%',
                              height: '95%',
                              justifyContent: 'center',
                              marginLeft: isStart ? 0 : -1,
                              marginRight: isEnd ? 0 : -1,
                            }}>
                              {(isStart || isMiddle) && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: isStart ? 0 : 8 }}>
                                  {isStart && <WeekBarAccommodationIcon width={14} height={14} />}
                                  {isStart && (
                                    <Text style={{ ...textStyles.h8, color: '#F59E0B', lineHeight: 10 }} numberOfLines={1}>
                                      {accommodation.name}
                                    </Text>
                                  )}
                                </View>
                              )}
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
          setSelectedEventId(null);
          
          // 미리보기 이벤트 생성 (기본 1시간)
          const startTime = dayjs(date);
          const endTime = startTime.add(1, 'hour');
          
          setPreviewEvent({
            start: startTime.toDate(),
            end: endTime.toDate(),
            title: '제목없음',
            startTime: startTime.format('HH:mm'),
            endTime: endTime.format('HH:mm'),
            location: '',
          });
          
          onRequestNewItinerary?.(date);
        }}
        renderEvent={(event, touchableOpacityProps) => {
          // key/children은 제거하고, onPress는 내부 Touchable에서 호출하여 경고 없이 클릭 유지
          const { key: eventKey, children: _ignoreChildren, style: tpStyle, onPress: calendarOnPress, ...rest } = (touchableOpacityProps as any) ?? {};
          
          // 이벤트 타입 확인
          const isItinerary = event.type === 'itinerary';
          const isFlight = event.type === 'flight';
          const isPreview = event.type === 'preview';
          
          // 드래그 중인 이벤트인지 확인
          const isDragging = draggingEvent?.id === event.id;
          
          // 선택된 이벤트인지 확인
          const isSelected = selectedEventId === event.id;
          const borderWidth = isSelected ? 2 : 1;
          
          // 드래그 가능한 이벤트인지 확인 (일정, 항공만, preview 제외)
          const isDraggable = !isPreview && (isItinerary || isFlight) && (myRole === 'owner' || myRole === 'editor');
          
          // tpStyle 평탄화 및 left 값 수동 계산
          const flattenStyle = (style: any): any => {
            if (!style) return {};
            if (Array.isArray(style)) {
              return Object.assign({}, ...style.filter(s => s && typeof s === 'object').map(flattenStyle));
            }
            return style || {};
          };
          
          const flatTpStyle = flattenStyle(tpStyle);
          let adjustedStyle = { ...flatTpStyle };
          
          const totalWidthPercent = 90;
          const leftMarginPercent = 3.5;
          
          if (adjustedStyle.marginTop !== undefined) {
            delete adjustedStyle.marginTop;
          }
          
          if (event.overlapCount > 1 && typeof event.overlapIndex === 'number') {
            const overlapIndex = event.overlapIndex;
            const overlapCount = event.overlapCount;
            
            const widthPercent = totalWidthPercent / overlapCount;
            adjustedStyle.width = `${widthPercent}%`;
            
            const leftPercent = leftMarginPercent + (widthPercent * overlapIndex);
            adjustedStyle.left = `${leftPercent}%`;
            
            delete adjustedStyle.minWidth;
          } else {
            adjustedStyle.left = `${leftMarginPercent}%`;
            adjustedStyle.width = `${totalWidthPercent}%`;
            
            delete adjustedStyle.minWidth;
          }
          
          // flight 이벤트 스타일
          const flightStyle = isFlight ? {
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderWidth: borderWidth,
            borderColor: '#8B5CF6',
            borderRadius: radii.md,
          } : null;
          
          // itinerary 이벤트 스타일
          const itineraryStyle = isItinerary ? {
            backgroundColor: 'rgba(0, 102, 255, 0.1)',
            borderWidth: borderWidth,
            borderColor: '#0066FF',
            borderRadius: radii.md,
          } : null;
          
          const previewStyle = isPreview ? {
            backgroundColor: 'rgba(0, 102, 255, 0.1)',
            borderWidth: 1,
            borderColor: '#0066FF',
            borderRadius: radii.md,
            borderStyle: 'dashed', 
            opacity: 0.7, 
          } : null;

          // 최종 스타일 결정: preview > flight > itinerary > 기본
          const finalStyle = previewStyle || flightStyle || itineraryStyle || { backgroundColor: event.color || '#3478f6' };
          
          // 드래그 중인 경우 원본 이벤트는 투명하게 (별도 렌더링된 드래그 이벤트가 표시됨)
          const dragStyle = isDragging ? {
            opacity: 0.3, // 원본은 반투명하게
            cursor: 'grabbing',
          } : isDraggable ? {
            cursor: 'grab',
          } : {};

          return (
            <View
              key={eventKey}
              {...rest}
              style={[adjustedStyle, finalStyle, dragStyle]}
              // 웹용 마우스 이벤트 (드래그 시작)
              {...(Platform.OS === 'web' && isDraggable ? {
                onMouseDown: (e: any) => {
                  if (!isDragging && !isPreview) {
                    e.preventDefault();
                    e.stopPropagation();
                    const clientX = e.nativeEvent?.clientX || e.clientX || 0;
                    const clientY = e.nativeEvent?.clientY || e.clientY || 0;
                    
                    // 이벤트 요소의 화면상 위치 및 크기 계산
                    const target = e.currentTarget as HTMLElement;
                    const rect = target.getBoundingClientRect();
                    
                    setDraggingEvent({
                      id: event.id,
                      type: isItinerary ? 'itinerary' : 'flight',
                      startX: clientX,
                      startY: clientY,
                      elementX: rect.left,
                      elementY: rect.top,
                      elementWidth: rect.width,
                      elementHeight: rect.height,
                    });
                    setDragOffset({ x: 0, y: 0 });
                    setSelectedEventId(null); // 드래그 시작 시 선택 해제
                  }
                },
              } : {})}
            >
              <TouchableOpacity
                style={{ flex: 1, justifyContent: 'center', padding: 4 }}
                disabled={isPreview || isDragging} // 미리보기 이벤트와 드래그 중인 이벤트는 클릭 불가
                onPress={(e) => {
                  if (isPreview || isDragging) return; // 미리보기 이벤트와 드래그 중인 이벤트는 클릭 무시
                  
                  try { calendarOnPress && calendarOnPress(e); } catch {}
                  
                  // 이벤트 선택 상태 업데이트
                  setSelectedEventId(event.id);
                  
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {isFlight && <WeekBarAirplaneIcon width={14} height={14} />}
                    <Text numberOfLines={1} ellipsizeMode="tail" style={{ ...textStyles.h8, color: isFlight ? '#8B5CF6' : '#0066FF', lineHeight: 12, flex: 1 }}>
                      {event.title}
                    </Text>
                  </View>
                  {(isItinerary || isPreview) && event.normalizedStartTime && event.normalizedEndTime && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                      <WeekBarTimeIcon width={14} height={14} />
                      <Text numberOfLines={1} ellipsizeMode="tail" style={{ ...textStyles.h9, color: '#0066FF', lineHeight: 10 }}>
                        {event.normalizedStartTime} - {event.normalizedEndTime}
                      </Text>
                    </View>
                  )}
                  {(isItinerary || isPreview) && event.locationText && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <WeekBarLocationIcon width={14} height={14} />
                      <Text numberOfLines={1} ellipsizeMode="tail" style={{ ...textStyles.h9, color: '#0066FF', lineHeight: 10 }}>
                        {event.locationText}
                      </Text>
                    </View>
                  )}
                  {isFlight && event.normalizedStartTime && event.normalizedEndTime && (
                    <Text numberOfLines={1} ellipsizeMode="tail" style={{ ...textStyles.h9, color: '#8B5CF6', lineHeight: 10, marginTop: 8 }}>
                      {event.normalizedStartTime}-{event.normalizedEndTime}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          );
        }}
      />
      </View>
      
      {/* 드롭 위치 미리보기 막대 (점선 테두리) */}
      {draggingEvent && dropPreviewPosition && Platform.OS === 'web' && (
        <View
          style={{
            position: 'fixed' as any,
            left: dropPreviewPosition.x,
            top: dropPreviewPosition.y,
            width: draggingEvent.elementWidth,
            height: draggingEvent.elementHeight,
            borderWidth: 2,
            borderStyle: 'dashed' as any,
            borderColor: draggingEvent.type === 'itinerary' ? 'rgba(0, 102, 255, 0.5)' : 'rgba(139, 92, 246, 0.5)',
            backgroundColor: 'transparent',
            borderRadius: radii.md,
            pointerEvents: 'none' as const,
            zIndex: 9999,
            opacity: 0.8,
          }}
        />
      )}
      
      {/* 드래그 중인 이벤트를 별도로 렌더링 (다른 컬럼 위에 표시) */}
      {draggingEvent && Platform.OS === 'web' && (() => {
        const draggedEvent = events.find(e => e.id === draggingEvent.id);
        if (!draggedEvent) return null;
        
        const isItinerary = draggedEvent.type === 'itinerary';
        const isFlight = draggedEvent.type === 'flight';
        const flightStyle = isFlight ? {
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 1,
          borderColor: '#8B5CF6',
          borderRadius: radii.md,
        } : null;
        const itineraryStyle = isItinerary ? {
          backgroundColor: 'rgba(0, 102, 255, 0.1)',
          borderWidth: 1,
          borderColor: '#0066FF',
          borderRadius: radii.md,
        } : null;
        const finalStyle = flightStyle || itineraryStyle || { backgroundColor: draggedEvent.color || '#3478f6' };
        
        return (
          <View
            style={[
              {
                position: 'absolute' as const,
                left: draggingEvent.elementX + dragOffset.x,
                top: draggingEvent.elementY + dragOffset.y,
                width: draggingEvent.elementWidth,
                height: draggingEvent.elementHeight,
                zIndex: 10000,
                opacity: 0.7,
                pointerEvents: 'none' as const,
                padding: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 10,
              },
              finalStyle,
              // 웹 전용: position fixed (타입 체크 우회)
              Platform.OS === 'web' ? { position: 'fixed' as any } : {},
            ]}
          >
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {isFlight && <WeekBarAirplaneIcon width={14} height={14} />}
                <Text numberOfLines={1} ellipsizeMode="tail" style={{ ...textStyles.h8, color: isFlight ? '#8B5CF6' : '#0066FF', lineHeight: 12, flex: 1 }}>
                  {draggedEvent.title}
                </Text>
              </View>
              {(isItinerary) && draggedEvent.normalizedStartTime && draggedEvent.normalizedEndTime && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                  <WeekBarTimeIcon width={14} height={14} />
                  <Text numberOfLines={1} ellipsizeMode="tail" style={{ ...textStyles.h9, color: '#0066FF', lineHeight: 10 }}>
                    {draggedEvent.normalizedStartTime} - {draggedEvent.normalizedEndTime}
                  </Text>
                </View>
              )}
              {(isItinerary) && draggedEvent.locationText && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <WeekBarLocationIcon width={14} height={14} />
                  <Text numberOfLines={1} ellipsizeMode="tail" style={{ ...textStyles.h9, color: '#0066FF', lineHeight: 10 }}>
                    {draggedEvent.locationText}
                  </Text>
                </View>
              )}
              {isFlight && draggedEvent.normalizedStartTime && draggedEvent.normalizedEndTime && (
                <Text numberOfLines={1} ellipsizeMode="tail" style={{ ...textStyles.h9, color: '#8B5CF6', lineHeight: 10, marginTop: 8 }}>
                  {draggedEvent.normalizedStartTime}-{draggedEvent.normalizedEndTime}
                </Text>
              )}
            </View>
          </View>
        );
      })()}


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

    </PanelLayout>
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
      backgroundColor: colors.gray200,
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
      gap: spacing.xs,
      marginLeft: spacing.lg,
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
      top: 40,
      left: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    calendarModalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'transparent',
      zIndex: 9999,
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
