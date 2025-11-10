import { useQuery, useQueryClient } from '@tanstack/react-query';
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

export const usePlanDataQuery = (publicId: string | null) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, isError, refetch } = useQuery<PlanData>({
    queryKey: ['plan', publicId],
    queryFn: async () => {
      if (!publicId) {
        return {
          plan: null,
          itineraries: [],
          flights: [],
          accommodations: [],
          expenses: [],
        };
      }

      // 서버가 Plan + 관련 엔티티들을 함께 반환 (PlanReadWithInforms)
      const planData: any = await plansApi.getPlan(publicId);

      const normalizedExpenses = (planData?.expenses ?? []).map((e: any) => ({
        ...e,
        amount: Number(e?.amount),
      }));

      return {
        plan: planData,
        itineraries: planData?.itineraries ?? [],
        flights: planData?.flights ?? [],
        accommodations: planData?.accommodations ?? [],
        expenses: normalizedExpenses,
      };
    },
    enabled: !!publicId,
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false, // 404 에러는 재시도하지 않음
  });

  const planData = data || {
    plan: null,
    itineraries: [],
    flights: [],
    accommodations: [],
    expenses: [],
  };

  // 개별 데이터 새로고침 함수들
  const refreshItineraries = async () => {
    if (!planData.plan?.id) return;
    try {
      const itineraries = await itinerariesApi.getItineraries(planData.plan.id);
      queryClient.setQueryData<PlanData>(['plan', publicId], (old = planData) => ({
        ...old,
        itineraries,
      }));
    } catch (err: any) {
      console.error('Failed to refresh itineraries:', err);
    }
  };

  const refreshFlights = async () => {
    if (!planData.plan?.id) return;
    try {
      const flights = await flightsApi.getFlightsByPlan(planData.plan.id);
      queryClient.setQueryData<PlanData>(['plan', publicId], (old = planData) => ({
        ...old,
        flights,
      }));
    } catch (err: any) {
      console.error('Failed to refresh flights:', err);
    }
  };

  const refreshAccommodations = async () => {
    if (!planData.plan?.id) return;
    try {
      const accommodations = await accommodationsApi.getAccommodations(planData.plan.id);
      queryClient.setQueryData<PlanData>(['plan', publicId], (old = planData) => ({
        ...old,
        accommodations,
      }));
    } catch (err: any) {
      console.error('Failed to refresh accommodations:', err);
    }
  };

  const refreshExpenses = async () => {
    if (!planData.plan?.id) return;
    try {
      const expenses = await expensesApi.getExpenses(planData.plan.id);
      queryClient.setQueryData<PlanData>(['plan', publicId], (old = planData) => ({
        ...old,
        expenses,
      }));
    } catch (err: any) {
      console.error('Failed to refresh expenses:', err);
    }
  };

  const fetchPlanData = async (pId: string) => {
    if (pId === publicId) {
      await refetch();
    } else {
      // 다른 plan을 로드하려면 queryClient를 사용하여 직접 호출
      queryClient.invalidateQueries({ queryKey: ['plan', pId] });
    }
  };

  // errorStatus 추출
  let errorStatus: number | null = null;
  
  if (isError && error) {
    // AxiosError의 response.status
    if ((error as any)?.response?.status) {
      errorStatus = (error as any).response.status;
    }
    // 직접 status 속성
    else if ((error as any)?.status) {
      errorStatus = (error as any).status;
    }
  }

  return {
    ...planData,
    isLoading,
    error: error ? (error as any).response?.data?.detail || (error as any).message : null,
    errorStatus,
    fetchPlanData,
    refreshItineraries,
    refreshFlights,
    refreshAccommodations,
    refreshExpenses,
  };
};

