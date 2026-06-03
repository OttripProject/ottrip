import WeeklySchedulePanel from "@/components/panels/WeeklySchedulePanel";
import { usePlanDataQuery } from "@/hooks/usePlanDataQuery";
import { usePlansQuery } from "@/hooks/usePlansQuery";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

export default function DashboardStack() {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [_selectedItinerary, setSelectedItinerary] = useState<any>(null);

  const plansQuery = usePlansQuery();

  const planData = usePlanDataQuery(selectedTrip?.publicId || null);

  const trips = useMemo(
    () =>
      plansQuery.plans.map(plan => ({
        id: plan.id.toString(),
        publicId: plan.publicId,
        name: plan.title,
        startDate: plan.startDate,
        endDate: plan.endDate,
      })),
    [plansQuery.plans],
  );

  const handleItineraryAdd = async (_newItinerary: any) => {
    if (selectedPlanId) {
      await planData.refreshItineraries();
    }
  };

  const _handleFlightAdd = async (_newFlight: any) => {
    if (selectedPlanId) {
      await planData.refreshFlights();
    }
  };

  const _handleAccommodationAdd = async (_newAccommodation: any) => {
    if (selectedPlanId) {
      await planData.refreshAccommodations();
    }
  };

  const _handleExpenseAdd = async (newExpense: any) => {
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
          onPlanSelect={trip => {
            setSelectedTrip(trip);
            setSelectedPlanId(trip ? Number.parseInt(trip.id) : null);
          }}
          onItinerarySelect={setSelectedItinerary}
          onRequestNewItinerary={_date => {}}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
