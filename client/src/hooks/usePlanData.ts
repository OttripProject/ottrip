import { useState, useCallback, useEffect } from 'react';
import { plansApi } from '../services/plans';
import { itinerariesApi } from '../services/itineraries';
import { flightsApi } from '../services/flights';
import { accommodationsApi } from '../services/accommodations';
import { expensesApi } from '../services/expenses';
import { Plan, Itinerary, FlightRead, Accommodation, Expense } from '../types/api';

interface PlanData {
  plan: Plan | null;
  itineraries: Itinerary[];
  flights: FlightRead[];
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
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const fetchPlanData = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    setErrorStatus(null);

    try {
      const plan = await plansApi.getPlan(id);

      const [itRes, flRes, accRes, exRes] = await Promise.allSettled([
        itinerariesApi.getItineraries(id),
        flightsApi.getFlightsByPlan(id),
        accommodationsApi.getAccommodations(id),
        expensesApi.getExpenses(id),
      ]);

      const itineraries = itRes.status === 'fulfilled' ? itRes.value : [];
      const flights = flRes.status === 'fulfilled' ? flRes.value : [];
      const accommodations = accRes.status === 'fulfilled' ? accRes.value : [];
      const expenses = exRes.status === 'fulfilled' ? exRes.value : [];

      setPlanData({
        plan,
        itineraries,
        flights,
        accommodations,
        expenses,
      });
    } catch (err: any) {
      // 플랜 자체 조회 실패(404/403 등)만 화면에 반영
      setError(err?.response?.data?.detail || err?.message || 'Failed to fetch plan data');
      setErrorStatus(typeof err?.response?.status === 'number' ? err.response.status : null);
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
      setError(null);
      setErrorStatus(null);
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
      const flights = await flightsApi.getFlightsByPlan(planId);
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
    errorStatus,
    fetchPlanData,
    refreshItineraries,
    refreshFlights,
    refreshAccommodations,
    refreshExpenses,
  };
}; 