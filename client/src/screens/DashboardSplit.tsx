import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions, ScrollView } from 'react-native';
import { useIsWideScreen } from '@/hooks/useIsWideScreen';
import WeeklyScheduleModal, { Itinerary } from '@/components/modals/WeeklyScheduleModal';
import SidePanels from '@/navigation/SidePanels';
import { usePlanData } from '@/hooks/usePlanData';

export default function DashboardSplit() {
  const isWideScreen = useIsWideScreen();
  const { width } = useWindowDimensions();
  
  // 동적 비율 계산 (화면 크기에 따라 조정)
  const getResponsiveRatio = () => {
    if (width < 768) {
      return { calendar: 1, side: 0 }; // 모바일: 캘린더만
    } else if (width < 1024) {
      return { calendar: 0.6, side: 0.4 }; // 태블릿: 60:40
    } else if (width < 1440) {
      return { calendar: 0.7, side: 0.3 }; // 데스크톱: 70:30
    } else {
      return { calendar: 0.75, side: 0.25 }; // 대형 화면: 75:25
    }
  };
  
  const ratio = getResponsiveRatio();
  
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedItinerary, setSelectedItinerary] = useState<any>(null);
  
  // 선택된 Plan의 데이터 로딩
  const planData = usePlanData(selectedPlanId ? selectedPlanId.toString() : null);

  const handleItineraryAdd = async (newItinerary: any) => {
    // Plan이 선택된 경우에만 추가
    if (selectedPlanId) {
      await planData.refreshItineraries();
    }
  };

  const handleFlightAdd = async (newFlight: any) => {
    // Plan이 선택된 경우에만 추가
    if (selectedPlanId) {
      await planData.refreshFlights();
    }
  };

  const handleAccommodationAdd = async (newAccommodation: any) => {
    // Plan이 선택된 경우에만 추가
    if (selectedPlanId) {
      await planData.refreshAccommodations();
    }
  };

  const handleExpenseAdd = async (newExpense: any) => {
    // Plan이 선택된 경우에만 추가
    if (selectedPlanId) {
      await planData.refreshExpenses();
    }
  };

  return (
    <ScrollView 
      style={styles.scrollContainer}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={true}
      bounces={false}
    >
      <View style={styles.contentLayout}>
        <View style={[styles.calendarPane, { flex: ratio.calendar }]}> 
          <WeeklyScheduleModal 
            itineraries={planData.itineraries}
            height={600} 
            onItineraryAdd={handleItineraryAdd}
            onPlanSelect={(trip) => setSelectedPlanId(trip ? parseInt(trip.id) : null)}
            onItinerarySelect={setSelectedItinerary}
            onRequestNewItinerary={(date) => {
              // 시간 셀을 눌렀을 때 일정 추가 모달 열기
              console.log('새 일정 추가 요청:', date);
              // 여기서 일정 추가 모달을 열 수 있습니다
              // 예: onShowItineraryModal?.(date);
            }}
          />
        </View>
        {ratio.side > 0 && (
          <View style={[styles.sidePane, { flex: ratio.side }]}> 
            <SidePanels 
              planData={planData}
              selectedItinerary={selectedItinerary}
              onItineraryAdd={handleItineraryAdd}
              onFlightAdd={handleFlightAdd}
              onAccommodationAdd={handleAccommodationAdd}
              onExpenseAdd={handleExpenseAdd}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    minHeight: '100%',
  },
  contentLayout: { 
    flex: 1, 
    flexDirection: 'row',
    minHeight: 600, // 최소 높이 보장
  },
  calendarPane: { 
    borderRightWidth: StyleSheet.hairlineWidth, 
    borderColor: '#ccc', 
    minHeight: 0 
  },
  sidePane: { 
    backgroundColor: '#fafafa', 
    minHeight: 0 
  },
});
