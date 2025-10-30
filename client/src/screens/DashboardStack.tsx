import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import WeeklyScheduleModal, { Itinerary } from '@/components/modals/WeeklyScheduleModal';
import { usePlanData } from '@/hooks/usePlanData';

export default function DashboardStack() {
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
    <View style={styles.container}>
      <View style={{ height: 400 }}>
        <WeeklyScheduleModal 
          itineraries={planData.itineraries}
          height={400} 
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
