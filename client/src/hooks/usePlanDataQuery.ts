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

  // 숙박을 캐시에 바로 추가 (응답 객체 사용)
  const addAccommodation = (newAccommodation: Accommodation) => {
    queryClient.setQueryData<PlanData>(['plan', publicId], (old) => {
      if (!old) return old;

      // accommodation 추가/업데이트
      const existingIndex = old.accommodations.findIndex(
        (acc) => acc.id === newAccommodation.id
      );
      let updatedAccommodations: Accommodation[];
      if (existingIndex >= 0) {
        // 기존 항목 업데이트
        updatedAccommodations = [...old.accommodations];
        updatedAccommodations[existingIndex] = newAccommodation;
      } else {
        // 새 항목 추가
        updatedAccommodations = [...old.accommodations, newAccommodation];
      }

      // expense도 함께 추가/업데이트 (accommodation에 expense가 있는 경우)
      let updatedExpenses = [...old.expenses];
      if (newAccommodation.expense) {
        const expense = {
          ...newAccommodation.expense,
          amount: Number(newAccommodation.expense.amount), // amount 정규화
        };
        const existingExpenseIndex = updatedExpenses.findIndex(
          (e) => e.id === expense.id
        );
        if (existingExpenseIndex >= 0) {
          // 기존 expense 업데이트
          updatedExpenses[existingExpenseIndex] = expense;
        } else {
          // 새 expense 추가
          updatedExpenses.push(expense);
        }
      }

      return {
        ...old,
        accommodations: updatedAccommodations,
        expenses: updatedExpenses,
      };
    });
  };

  // expense를 캐시에 바로 추가 (응답 객체 사용)
  const addExpense = (newExpense: Expense) => {
    queryClient.setQueryData<PlanData>(['plan', publicId], (old) => {
      if (!old) return old;

      // expense 추가/업데이트
      const normalizedExpense = {
        ...newExpense,
        amount: Number(newExpense.amount), // amount 정규화
      };
      const existingIndex = old.expenses.findIndex(
        (e) => e.id === normalizedExpense.id
      );
      let updatedExpenses: Expense[];
      if (existingIndex >= 0) {
        // 기존 항목 업데이트
        updatedExpenses = [...old.expenses];
        updatedExpenses[existingIndex] = normalizedExpense;
      } else {
        // 새 항목 추가
        updatedExpenses = [...old.expenses, normalizedExpense];
      }

      return {
        ...old,
        expenses: updatedExpenses,
      };
    });
  };

  // expense를 캐시에서 제거 (삭제 시 사용)
  const removeExpense = (expenseId: number) => {
    queryClient.setQueryData<PlanData>(['plan', publicId], (old) => {
      if (!old) return old;

      // expense 제거
      const updatedExpenses = old.expenses.filter(
        (e) => e.id !== expenseId
      );

      return {
        ...old,
        expenses: updatedExpenses,
      };
    });
  };

  // accommodation을 캐시에서 제거 (삭제 시 사용)
  const removeAccommodation = (accommodationId: number) => {
    queryClient.setQueryData<PlanData>(['plan', publicId], (old) => {
      if (!old) return old;

      // accommodation 제거
      const updatedAccommodations = old.accommodations.filter(
        (acc) => acc.id !== accommodationId
      );

      // accommodation에 연결된 expense도 제거
      const updatedExpenses = old.expenses.filter(
        (e) => e.accommodationId !== accommodationId
      );

      return {
        ...old,
        accommodations: updatedAccommodations,
        expenses: updatedExpenses,
      };
    });
  };

  // 일정을 캐시에 바로 추가 (응답 객체 사용)
  const addItinerary = (newItinerary: Itinerary) => {
    queryClient.setQueryData<PlanData>(['plan', publicId], (old) => {
      if (!old) return old;

      // itinerary 추가/업데이트
      const existingIndex = old.itineraries.findIndex(
        (it) => it.id === newItinerary.id
      );
      let updatedItineraries: Itinerary[];
      if (existingIndex >= 0) {
        // 기존 항목 업데이트
        updatedItineraries = [...old.itineraries];
        updatedItineraries[existingIndex] = newItinerary;
      } else {
        // 새 항목 추가
        updatedItineraries = [...old.itineraries, newItinerary];
      }

      // expense는 addExpense로만 관리하므로, addItinerary에서는 expense를 건드리지 않음
      // itinerary 업데이트 시 서버 응답의 expenses는 이전 데이터일 수 있으므로 무시
      
      return {
        ...old,
        itineraries: updatedItineraries,
        // expenses는 그대로 유지 (addExpense로만 업데이트)
      };
    });
  };

  // 일정을 캐시에서 제거 (삭제 시 사용)
  const removeItinerary = (itineraryId: number) => {
    queryClient.setQueryData<PlanData>(['plan', publicId], (old) => {
      if (!old) return old;

      // itinerary 제거
      const updatedItineraries = old.itineraries.filter(
        (it) => it.id !== itineraryId
      );

      // itinerary에 연결된 expense도 제거
      const updatedExpenses = old.expenses.filter(
        (e) => e.itineraryId !== itineraryId
      );

      return {
        ...old,
        itineraries: updatedItineraries,
        expenses: updatedExpenses,
      };
    });
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
    addAccommodation,
    addExpense,
    removeExpense,
    removeAccommodation,
    addItinerary,
    removeItinerary,
  };
};

