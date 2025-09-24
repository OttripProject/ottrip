import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useIsWideScreen } from '@/hooks/useIsWideScreen';
import WeeklySchedule, { Itinerary } from '@/components/WeeklySchedule';
import SidePanels from '@/navigation/SidePanels';
import { usePlanData } from '@/hooks/usePlanData';

export default function DashboardSplit() {
  const isWideScreen = useIsWideScreen();
  // 좌우 영역을 비율로 채우도록 flex 가중치 사용 (높이 보장)
  const calendarFlex = isWideScreen ? 7 : 0;
  const sideFlex = isWideScreen ? 3 : 0;
  
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedItinerary, setSelectedItinerary] = useState<any>(null);
  
  // 선택된 Plan의 데이터 로딩
  const planData = usePlanData(selectedPlanId);

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
    <View style={styles.container}>
      <View style={[styles.calendarPane, isWideScreen ? { flex: calendarFlex } : { width: '100%' }]}> 
        <WeeklySchedule 
          itineraries={planData.itineraries}
          height={600} 
          onItineraryAdd={handleItineraryAdd}
          onPlanSelect={setSelectedPlanId}
          onItinerarySelect={setSelectedItinerary}
        />
      </View>
      <View style={[styles.sidePane, isWideScreen ? { flex: sideFlex } : { width: '100%' }]}> 
        <SidePanels 
          planData={planData}
          selectedItinerary={selectedItinerary}
          onItineraryAdd={handleItineraryAdd}
          onFlightAdd={handleFlightAdd}
          onAccommodationAdd={handleAccommodationAdd}
          onExpenseAdd={handleExpenseAdd}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },
  calendarPane: { borderRightWidth: StyleSheet.hairlineWidth, borderColor: '#ccc', minHeight: 0 },
  sidePane: { backgroundColor: '#fafafa', minHeight: 0 },
});
