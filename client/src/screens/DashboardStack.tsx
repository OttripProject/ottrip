import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import WeeklyScheduleModal, { Itinerary } from '@/components/modals/WeeklyScheduleModal';
import { usePlanDataQuery } from '@/hooks/usePlanDataQuery';
import { usePlansQuery } from '@/hooks/usePlansQuery';

export default function DashboardStack() {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [selectedItinerary, setSelectedItinerary] = useState<any>(null);
  
  // 상위에서 plans 목록 로드
  const plansQuery = usePlansQuery();
  
  // 선택된 Plan의 데이터 로딩
  const planData = usePlanDataQuery(selectedTrip?.publicId || null);
  
  // plans를 trips 형태로 변환
  const trips = useMemo(() => plansQuery.plans.map(plan => ({
    id: plan.id.toString(),
    publicId: plan.publicId,
    name: plan.title,
    startDate: plan.startDate,
    endDate: plan.endDate,
  })), [plansQuery.plans]);

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
          flights={planData.flights}
          height={400}
          selectedTrip={selectedTrip}
          planData={planData}
          plans={plansQuery.plans}
          trips={trips}
          onPlansRefresh={plansQuery.fetchPlans}
          onPlanAdd={plansQuery.addPlan}
          onPlanUpdate={plansQuery.updatePlan}
          onPlanDelete={plansQuery.deletePlan}
          onItineraryAdd={handleItineraryAdd}
          onPlanSelect={(trip) => {
            setSelectedTrip(trip);
            setSelectedPlanId(trip ? parseInt(trip.id) : null);
          }}
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
