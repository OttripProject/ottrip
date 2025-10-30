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

export const usePlanData = (publicId: string | null) => {
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

  const fetchPlanData = useCallback(async (pId: string) => {
    setIsLoading(true);
    setError(null);
    setErrorStatus(null);

    try {
      const plan = await plansApi.getPlan(pId);

      const [itRes, flRes, accRes, exRes] = await Promise.allSettled([
        itinerariesApi.getItineraries(plan.id),
        flightsApi.getFlightsByPlan(plan.id),
        accommodationsApi.getAccommodations(plan.id),
        expensesApi.getExpenses(plan.id),
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
      setPlanData({
        plan: null,
        itineraries: [],
        flights: [],
        accommodations: [],
        expenses: [],
      });
      setError(err?.response?.data?.detail || err?.message || 'Failed to fetch plan data');
      setErrorStatus(typeof err?.response?.status === 'number' ? err.response.status : null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // publicId가 변경될 때마다 데이터 로딩
  useEffect(() => {
    if (publicId) {
      fetchPlanData(publicId);
    } else {
      setPlanData({
        plan: null,
        itineraries: [],
        flights: [],
        accommodations: [],
        expenses: [],
      });
    }
  }, [publicId, fetchPlanData]);

  // 개별 데이터 새로고침 함수들
  const refreshItineraries = useCallback(async () => {
    if (!planData.plan?.id) return;
    try {
      const itineraries = await itinerariesApi.getItineraries(planData.plan.id);
      setPlanData(prev => ({ ...prev, itineraries }));
    } catch (err: any) {
      console.error('Failed to refresh itineraries:', err);
    }
  }, [planData.plan?.id]);

  const refreshFlights = useCallback(async () => {
    if (!planData.plan?.id) return;
    try {
      const flights = await flightsApi.getFlightsByPlan(planData.plan.id);
      setPlanData(prev => ({ ...prev, flights }));
    } catch (err: any) {
      console.error('Failed to refresh flights:', err);
    }
  }, [planData.plan?.id]);

  const refreshAccommodations = useCallback(async () => {
    if (!planData.plan?.id) return;
    try {
      const accommodations = await accommodationsApi.getAccommodations(planData.plan.id);
      setPlanData(prev => ({ ...prev, accommodations }));
    } catch (err: any) {
      console.error('Failed to refresh accommodations:', err);
    }
  }, [planData.plan?.id]);

  const refreshExpenses = useCallback(async () => {
    if (!planData.plan?.id) return;
    try {
      const expenses = await expensesApi.getExpenses(planData.plan.id);
      setPlanData(prev => ({ ...prev, expenses }));
    } catch (err: any) {
      console.error('Failed to refresh expenses:', err);
    }
  }, [planData.plan?.id]);

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