import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import WeeklySchedulePanel, { Itinerary } from '@/components/panels/WeeklySchedulePanel';
import { usePlanDataQuery } from '@/hooks/usePlanDataQuery';
import { usePlansQuery } from '@/hooks/usePlansQuery';

export default function DashboardStack() {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [selectedItinerary, setSelectedItinerary] = useState<any>(null);
  
  const plansQuery = usePlansQuery();
  
  const planData = usePlanDataQuery(selectedTrip?.publicId || null);
  
  const trips = useMemo(() => plansQuery.plans.map(plan => ({
    id: plan.id.toString(),
    publicId: plan.publicId,
    name: plan.title,
    startDate: plan.startDate,
    endDate: plan.endDate,
  })), [plansQuery.plans]);

  const handleItineraryAdd = async (newItinerary: any) => {
    if (selectedPlanId) {
      await planData.refreshItineraries();
    }
  };

  const handleFlightAdd = async (newFlight: any) => {
    if (selectedPlanId) {
      await planData.refreshFlights();
    }
  };

  const handleAccommodationAdd = async (newAccommodation: any) => {
    if (selectedPlanId) {
      await planData.refreshAccommodations();
    }
  };

  const handleExpenseAdd = async (newExpense: any) => {
    if (selectedPlanId) {
      planData.addExpense(newExpense);
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ height: 400 }}>
        <WeeklySchedulePanel 
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
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
