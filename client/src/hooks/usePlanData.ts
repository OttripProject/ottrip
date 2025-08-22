import { useState, useCallback, useEffect } from 'react';
import { plansApi } from '../services/plans';
import { itinerariesApi } from '../services/itineraries';
import { flightsApi } from '../services/flights';
import { accommodationsApi } from '../services/accommodations';
import { expensesApi } from '../services/expenses';
import { Plan, Itinerary, Flight, Accommodation, Expense } from '../types/api';

interface PlanData {
  plan: Plan | null;
  itineraries: Itinerary[];
  flights: Flight[];
  accommodations: Accommodation[];
  expenses: Expense[];
}

export const usePlanData = (planId: number | null) => {
  const [planData, setPlanData] = useState<PlanData>({
    plan: null,
    itineraries: [],
    flights: [],
    accommodations: [],
    expenses: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 특정 Plan의 모든 데이터 로딩
  const fetchPlanData = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    
    try {      
      // 모든 API 호출을 병렬로 실행
      const [plan, itineraries, flights, accommodations, expenses] = await Promise.all([
        plansApi.getPlan(id),
        itinerariesApi.getItineraries(id),
        flightsApi.getFlights(id),
        accommodationsApi.getAccommodations(id),
        expensesApi.getExpenses(id),
      ]);
      
      setPlanData({
        plan,
        itineraries,
        flights,
        accommodations,
        expenses,
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch plan data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Plan ID가 변경될 때마다 데이터 로딩
  useEffect(() => {
    if (planId) {
      fetchPlanData(planId);
    } else {
      // Plan ID가 없으면 데이터 초기화
      setPlanData({
        plan: null,
        itineraries: [],
        flights: [],
        accommodations: [],
        expenses: [],
      });
    }
  }, [planId, fetchPlanData]);

  // 개별 데이터 새로고침 함수들
  const refreshItineraries = useCallback(async () => {
    if (!planId) return;
    try {
      const itineraries = await itinerariesApi.getItineraries(planId);
      setPlanData(prev => ({ ...prev, itineraries }));
    } catch (err: any) {
      console.error('Failed to refresh itineraries:', err);
    }
  }, [planId]);

  const refreshFlights = useCallback(async () => {
    if (!planId) return;
    try {
      const flights = await flightsApi.getFlights(planId);
      setPlanData(prev => ({ ...prev, flights }));
    } catch (err: any) {
      console.error('Failed to refresh flights:', err);
    }
  }, [planId]);

  const refreshAccommodations = useCallback(async () => {
    if (!planId) return;
    try {
      const accommodations = await accommodationsApi.getAccommodations(planId);
      setPlanData(prev => ({ ...prev, accommodations }));
    } catch (err: any) {
      console.error('Failed to refresh accommodations:', err);
    }
  }, [planId]);

  const refreshExpenses = useCallback(async () => {
    if (!planId) return;
    try {
      const expenses = await expensesApi.getExpenses(planId);
      setPlanData(prev => ({ ...prev, expenses }));
    } catch (err: any) {
      console.error('Failed to refresh expenses:', err);
    }
  }, [planId]);

  return {
    ...planData,
    isLoading,
    error,
    fetchPlanData,
    refreshItineraries,
    refreshFlights,
    refreshAccommodations,
    refreshExpenses,
  };
}; 