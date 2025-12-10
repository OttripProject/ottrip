import { useState, useCallback } from 'react';
import dayjs from 'dayjs';

type SelectionType = 'single' | 'start' | 'end' | 'range' | undefined;
type CalendarDayMark = { selection?: SelectionType; selected?: boolean };
export type CalendarMarkedDates = Record<string, CalendarDayMark>;

interface TripFormData {
  name: string;
  startDate: string;
  endDate: string;
}

export const useTripForm = (initialData?: Partial<TripFormData>) => {
  const [tripData, setTripData] = useState<TripFormData>({
    name: initialData?.name || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
  });
  
  const [selectionMode, setSelectionMode] = useState<'start' | 'end'>('start');

  // 날짜 선택 핸들러
  const handleDateSelect = useCallback((dateString: string) => {
    if (selectionMode === 'start') {
      setTripData(prev => ({ ...prev, startDate: dateString, endDate: '' }));
      setSelectionMode('end');
    } else {
      if (dayjs(dateString).isBefore(dayjs(tripData.startDate))) {
        setTripData(prev => ({ ...prev, startDate: dateString, endDate: prev.startDate }));
      } else {
        setTripData(prev => ({ ...prev, endDate: dateString }));
      }
      setSelectionMode('start');
    }
  }, [selectionMode, tripData.startDate]);

  // 마킹된 날짜 계산
  const getMarkedDates = useCallback((): CalendarMarkedDates => {
    const marked: CalendarMarkedDates = {};

    if (!tripData.startDate) {
      return marked;
    }

    const start = dayjs(tripData.startDate);
    const end = tripData.endDate ? dayjs(tripData.endDate) : null;

    if (!end || start.isSame(end, 'day')) {
      marked[start.format('YYYY-MM-DD')] = { selection: 'single', selected: true };
      return marked;
    }

    marked[start.format('YYYY-MM-DD')] = { selection: 'start', selected: true };
    marked[end.format('YYYY-MM-DD')] = { selection: 'end', selected: true };

    let current = start.add(1, 'day');
    while (current.isBefore(end, 'day')) {
      marked[current.format('YYYY-MM-DD')] = { selection: 'range', selected: true };
      current = current.add(1, 'day');
    }

    return marked;
  }, [tripData.startDate, tripData.endDate]);

  // 폼 데이터 업데이트
  const updateTripData = useCallback((data: Partial<TripFormData>) => {
    setTripData(prev => ({ ...prev, ...data }));
  }, []);

  // 폼 리셋
  const resetForm = useCallback(() => {
    setTripData({
      name: initialData?.name || '',
      startDate: initialData?.startDate || '',
      endDate: initialData?.endDate || '',
    });
    setSelectionMode('start');
  }, [initialData]);

  // 초기 데이터로 폼 설정 (편집 모달용)
  const setFormData = useCallback((data: TripFormData) => {
    setTripData(data);
    setSelectionMode('start');
  }, []);

  // 제출 가능 여부 확인
  const isSubmitDisabled = !tripData.name.trim() || !tripData.startDate || !tripData.endDate;

  return {
    tripData,
    selectionMode,
    handleDateSelect,
    getMarkedDates,
    updateTripData,
    resetForm,
    setFormData,
    isSubmitDisabled,
  };
};

