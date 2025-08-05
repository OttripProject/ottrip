import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import WeeklySchedule, { Itinerary } from '@/components/WeeklySchedule';
import SidePanels from '@/navigation/SidePanels';

const dummyItineraries: Itinerary[] = [
  {
    id: 1,
    title: '오사카성 방문',
    itinerary_date: '2025-01-27',
    start_time: '09:00',
    end_time: '11:00',
    color: '#ff6b6b',
  },
  {
    id: 2,
    title: '도톤보리 쇼핑',
    itinerary_date: '2025-01-27',
    start_time: '14:00',
    end_time: '16:00',
    color: '#4ecdc4',
  },
  {
    id: 3,
    title: '우메다 스카이빌딩',
    itinerary_date: '2025-01-28',
    start_time: '16:00',
    end_time: '18:00',
    color: '#45b7d1',
  },
];

export default function DashboardStack() {
  const [itineraries, setItineraries] = useState(dummyItineraries);
  const [flights, setFlights] = useState<any[]>([]);
  const [accommodations, setAccommodations] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  const handleItineraryAdd = (newItinerary: any) => {
    setItineraries(prev => [...prev, newItinerary]);
  };

  const handleFlightAdd = (newFlight: any) => {
    setFlights(prev => [...prev, newFlight]);
  };

  const handleAccommodationAdd = (newAccommodation: any) => {
    setAccommodations(prev => [...prev, newAccommodation]);
  };

  const handleExpenseAdd = (newExpense: any) => {
    setExpenses(prev => [...prev, newExpense]);
  };

  return (
    <View style={styles.container}>
      <WeeklySchedule 
        itineraries={itineraries}
        height={400} 
        onItineraryAdd={handleItineraryAdd}
      />
      <SidePanels 
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
