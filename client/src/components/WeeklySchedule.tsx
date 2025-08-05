import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-big-calendar';
import dayjs from 'dayjs';
import ko from 'dayjs/locale/ko';
import TripSelector from './TripSelector';

dayjs.locale(ko);

export interface Itinerary {
  id: number;
  title: string;
  itinerary_date: string; // 'YYYY-MM-DD'
  start_time: string;     // 'HH:mm'
  end_time: string;       // 'HH:mm'
  color: string;
}

function toEvent(it: Itinerary): any {
  return {
    id: it.id,
    title: it.title,
    start: new Date(`${it.itinerary_date}T${it.start_time}:00`),
    end: new Date(`${it.itinerary_date}T${it.end_time}:00`),
    color: it.color,
  } as any;
}

interface Props {
  itineraries: Itinerary[];
  height?: number;
  onItineraryAdd?: (itinerary: any) => void;
}

export default function WeeklySchedule({ itineraries, height = 600, onItineraryAdd }: Props) {
    const [currentWeekStart, setCurrentWeekStart] = useState(
        dayjs().startOf('week').add(1, 'day') // 월요일 시작
        );
    const [selectedTrip, setSelectedTrip] = useState<any>(null);
    const [trips, setTrips] = useState([
      { id: '1', name: '오사카 여행', startDate: '2025-08-01', endDate: '2025-08-07' },
      { id: '2', name: '도쿄 여행', startDate: '2025-09-01', endDate: '2025-09-05' },
      { id: '3', name: '교토 여행', startDate: '2025-10-01', endDate: '2025-10-03' },
    ]);

    const handleAddTrip = (newTrip: any) => {
      const trip = {
        ...newTrip,
        id: Date.now().toString(),
      };
      setTrips(prev => [...prev, trip]);
    };

    const events = useMemo(() => itineraries.map(toEvent), [itineraries]);

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

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* 여행 선택 콤보박스 */}
        <TripSelector
          selectedTrip={selectedTrip}
          onTripSelect={setSelectedTrip}
          trips={trips}
          onTripAdd={handleAddTrip}
        />
      </View>

      {/* 캘린더 */}
      <Calendar
        mode="week"
        events={events}
        height={height - 50} // 헤더 높이만큼 빼기
        date={currentWeekStart.toDate()}
        hourRowHeight={60}
        weekStartsOn={1}
        hideNowIndicator
        swipeEnabled
        showTime
        renderEvent={(event, touchableOpacityProps) => (
          <View
            {...touchableOpacityProps}
            style={[touchableOpacityProps.style, { backgroundColor: event.color || '#3478f6' }]}
          >
            <Text numberOfLines={2} ellipsizeMode="tail" style={{ color: '#fff', fontSize: 10 }}>
              {event.title}
            </Text>
          </View>
        )}
      />

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
});