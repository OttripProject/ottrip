import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions, ScrollView } from 'react-native';
import WeeklySchedulePanel, { Itinerary } from '@/components/panels/WeeklySchedulePanel';
import { usePlanDataQuery } from '@/hooks/usePlanDataQuery';
import { usePlansQuery } from '@/hooks/usePlansQuery';
import { useMemo } from 'react';

export default function DashboardSplit() {
  const { width } = useWindowDimensions();
  
  const getResponsiveRatio = () => {
    if (width < 768) {
      return { calendar: 1, side: 0 };
    } else if (width < 1024) {
      return { calendar: 0.6, side: 0.4 };
    } else if (width < 1440) {
      return { calendar: 0.7, side: 0.3 };
    } else {
      return { calendar: 0.75, side: 0.25 };
    }
  };
  
  const ratio = getResponsiveRatio();
  
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
    <ScrollView 
      style={styles.scrollContainer}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={true}
      bounces={false}
    >
      <View style={styles.contentLayout}>
        <View style={[styles.calendarPane, { flex: ratio.calendar }]}> 
          <WeeklySchedulePanel 
            itineraries={planData.itineraries}
            flights={planData.flights}
            height={600} 
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
        {ratio.side > 0 && (
          <View style={[styles.sidePane, { flex: ratio.side }]}> 
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
