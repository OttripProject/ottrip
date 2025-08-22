import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import WeeklySchedule, { Itinerary } from '@/components/WeeklySchedule';
import SidePanels from '@/navigation/SidePanels';
import { usePlanData } from '@/hooks/usePlanData';

export default function DashboardStack() {
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
      <WeeklySchedule 
        itineraries={planData.itineraries}
        height={400} 
        onItineraryAdd={handleItineraryAdd}
        onPlanSelect={setSelectedPlanId}
        onItinerarySelect={setSelectedItinerary}
      />
      <SidePanels 
        planData={planData}
        selectedItinerary={selectedItinerary}
        onItineraryAdd={handleItineraryAdd}
        onFlightAdd={handleFlightAdd}
        onAccommodationAdd={handleAccommodationAdd}
        onExpenseAdd={handleExpenseAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
