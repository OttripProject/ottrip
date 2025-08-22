import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useIsWideScreen } from '@/hooks/useIsWideScreen';
import WeeklySchedule, { Itinerary } from '@/components/WeeklySchedule';
import SidePanels from '@/navigation/SidePanels';
import { usePlanData } from '@/hooks/usePlanData';

export default function DashboardSplit() {
  const isWideScreen = useIsWideScreen();
  const calendarWidth = isWideScreen ? '70%' : '100%';
  const sideWidth = isWideScreen ? '30%' : '100%';
  
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
      <View style={[styles.calendarPane, { width: calendarWidth }]}>
        <WeeklySchedule 
          itineraries={planData.itineraries}
          height={600} 
          onItineraryAdd={handleItineraryAdd}
          onPlanSelect={setSelectedPlanId}
          onItinerarySelect={setSelectedItinerary}
        />
      </View>
      <View style={[styles.sidePane, { width: sideWidth }]}>
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
  calendarPane: { borderRightWidth: StyleSheet.hairlineWidth, borderColor: '#ccc' },
  sidePane: { backgroundColor: '#fafafa' },
});
