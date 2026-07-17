import { useQuery, useQueryClient } from "@tanstack/react-query";
import { accommodationsApi } from "../services/accommodations";
import { attachmentsApi } from "../services/attachments";
import { expensesApi } from "../services/expenses";
import { flightsApi } from "../services/flights";
import { itinerariesApi } from "../services/itineraries";
import { plansApi } from "../services/plans";
import type {
  Accommodation,
  Attachment,
  Expense,
  FlightRead,
  Itinerary,
  Plan,
} from "../types/api";

interface PlanData {
  plan: Plan | null;
  itineraries: Itinerary[];
  flights: FlightRead[];
  accommodations: Accommodation[];
  expenses: Expense[];
  attachments: Attachment[];
}

export const usePlanDataQuery = (publicId: string | null) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, isError, refetch } = useQuery<PlanData>({
    queryKey: ["plan", publicId],
    queryFn: async () => {
      if (!publicId) {
        return {
          plan: null,
          itineraries: [],
          flights: [],
          accommodations: [],
          expenses: [],
          attachments: [],
        };
      }

      const cachedPlanId = queryClient
        .getQueryData<Plan[]>(["plans"])
        ?.find(p => p.publicId === publicId)?.id;

      let planData: any;
      let attachments: Attachment[] = [];

      if (cachedPlanId) {
        [planData, attachments] = await Promise.all([
          plansApi.getPlan(publicId),
          attachmentsApi.getAttachmentsByPlan(cachedPlanId).catch(() => []),
        ]);
      } else {
        planData = await plansApi.getPlan(publicId);
        if (planData?.id) {
          attachments = await attachmentsApi
            .getAttachmentsByPlan(planData.id)
            .catch(() => []);
        }
      }

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
        attachments,
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
    attachments: [],
  };

  const refreshItineraries = async () => {
    if (!planData.plan?.id) return;
    try {
      const itineraries = await itinerariesApi.getItineraries(planData.plan.id);
      queryClient.setQueryData<PlanData>(
        ["plan", publicId],
        (old = planData) => ({
          ...old,
          itineraries,
        }),
      );
    } catch (_err: any) {}
  };

  const refreshFlights = async () => {
    if (!planData.plan?.id) return;
    try {
      const flights = await flightsApi.getFlightsByPlan(planData.plan.id);
      queryClient.setQueryData<PlanData>(
        ["plan", publicId],
        (old = planData) => ({
          ...old,
          flights,
        }),
      );
    } catch (_err: any) {}
  };

  const refreshAccommodations = async () => {
    if (!planData.plan?.id) return;
    try {
      const accommodations = await accommodationsApi.getAccommodations(
        planData.plan.id,
      );
      queryClient.setQueryData<PlanData>(
        ["plan", publicId],
        (old = planData) => ({
          ...old,
          accommodations,
        }),
      );
    } catch (_err: any) {}
  };

  const refreshExpenses = async () => {
    if (!planData.plan?.id) return;
    try {
      const expenses = await expensesApi.getExpenses(planData.plan.id);
      queryClient.setQueryData<PlanData>(
        ["plan", publicId],
        (old = planData) => ({
          ...old,
          expenses,
        }),
      );
    } catch (_err: any) {}
  };

  const refreshAttachments = async () => {
    if (!planData.plan?.id) return;
    try {
      const attachments = await attachmentsApi.getAttachmentsByPlan(
        planData.plan.id,
      );
      queryClient.setQueryData<PlanData>(
        ["plan", publicId],
        (old = planData) => ({
          ...old,
          attachments,
        }),
      );
    } catch {}
  };

  const addAttachment = (newAttachment: Attachment) => {
    queryClient.setQueryData<PlanData>(["plan", publicId], old => {
      if (!old) return old;
      return { ...old, attachments: [...old.attachments, newAttachment] };
    });
  };

  const addAccommodation = (newAccommodation: Accommodation) => {
    queryClient.setQueryData<PlanData>(["plan", publicId], old => {
      if (!old) return old;

      const existingIndex = old.accommodations.findIndex(
        acc => acc.id === newAccommodation.id,
      );
      let updatedAccommodations: Accommodation[];
      if (existingIndex >= 0) {
        updatedAccommodations = [...old.accommodations];
        updatedAccommodations[existingIndex] = newAccommodation;
      } else {
        updatedAccommodations = [...old.accommodations, newAccommodation];
      }

      const updatedExpenses = [...old.expenses];
      if (newAccommodation.expense) {
        const expense = {
          ...newAccommodation.expense,
          amount: Number(newAccommodation.expense.amount), // amount 정규화
        };
        const existingExpenseIndex = updatedExpenses.findIndex(
          e => e.id === expense.id,
        );
        if (existingExpenseIndex >= 0) {
          updatedExpenses[existingExpenseIndex] = expense;
        } else {
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

  const addExpense = (newExpense: Expense) => {
    queryClient.setQueryData<PlanData>(["plan", publicId], old => {
      if (!old) return old;

      const normalizedExpense = {
        ...newExpense,
        amount: Number(newExpense.amount), // amount 정규화
      };
      const existingIndex = old.expenses.findIndex(
        e => e.id === normalizedExpense.id,
      );
      let updatedExpenses: Expense[];
      if (existingIndex >= 0) {
        updatedExpenses = [...old.expenses];
        updatedExpenses[existingIndex] = normalizedExpense;
      } else {
        updatedExpenses = [...old.expenses, normalizedExpense];
      }

      return {
        ...old,
        expenses: updatedExpenses,
      };
    });
  };

  const removeExpense = (expenseId: number) => {
    queryClient.setQueryData<PlanData>(["plan", publicId], old => {
      if (!old) return old;

      const updatedExpenses = old.expenses.filter(e => e.id !== expenseId);

      return {
        ...old,
        expenses: updatedExpenses,
      };
    });
  };

  const removeAccommodation = (accommodationId: number) => {
    queryClient.setQueryData<PlanData>(["plan", publicId], old => {
      if (!old) return old;

      const updatedAccommodations = old.accommodations.filter(
        acc => acc.id !== accommodationId,
      );

      const updatedExpenses = old.expenses.filter(
        e => e.accommodationId !== accommodationId,
      );

      return {
        ...old,
        accommodations: updatedAccommodations,
        expenses: updatedExpenses,
      };
    });
  };

  const addItinerary = (newItinerary: Itinerary) => {
    queryClient.setQueryData<PlanData>(["plan", publicId], old => {
      if (!old) return old;

      const existingIndex = old.itineraries.findIndex(
        it => it.id === newItinerary.id,
      );
      let updatedItineraries: Itinerary[];
      if (existingIndex >= 0) {
        updatedItineraries = [...old.itineraries];
        updatedItineraries[existingIndex] = newItinerary;
      } else {
        updatedItineraries = [...old.itineraries, newItinerary];
      }

      return {
        ...old,
        itineraries: updatedItineraries,
      };
    });
  };

  const removeItinerary = (itineraryId: number) => {
    queryClient.setQueryData<PlanData>(["plan", publicId], old => {
      if (!old) return old;

      const updatedItineraries = old.itineraries.filter(
        it => it.id !== itineraryId,
      );

      const updatedExpenses = old.expenses.filter(
        e => e.itineraryId !== itineraryId,
      );

      return {
        ...old,
        itineraries: updatedItineraries,
        expenses: updatedExpenses,
      };
    });
  };

  const addFlight = (newFlight: FlightRead) => {
    queryClient.setQueryData<PlanData>(["plan", publicId], old => {
      if (!old) return old;

      const existingIndex = old.flights.findIndex(f => f.id === newFlight.id);
      let updatedFlights: FlightRead[];
      if (existingIndex >= 0) {
        updatedFlights = [...old.flights];
        updatedFlights[existingIndex] = newFlight;
      } else {
        updatedFlights = [...old.flights, newFlight];
      }

      const updatedExpenses = [...old.expenses];
      if (newFlight.expense) {
        const expense = {
          ...newFlight.expense,
          amount: Number(newFlight.expense.amount), // amount 정규화
        };
        const existingExpenseIndex = updatedExpenses.findIndex(
          e => e.id === expense.id,
        );
        if (existingExpenseIndex >= 0) {
          updatedExpenses[existingExpenseIndex] = expense;
        } else {
          updatedExpenses.push(expense);
        }
      }

      return {
        ...old,
        flights: updatedFlights,
        expenses: updatedExpenses,
      };
    });
  };

  const removeFlight = (flightId: number) => {
    queryClient.setQueryData<PlanData>(["plan", publicId], old => {
      if (!old) return old;

      const updatedFlights = old.flights.filter(f => f.id !== flightId);

      const updatedExpenses = old.expenses.filter(e => e.flightId !== flightId);

      return {
        ...old,
        flights: updatedFlights,
        expenses: updatedExpenses,
      };
    });
  };

  const fetchPlanData = async (pId: string) => {
    if (pId === publicId) {
      await refetch();
    } else {
      queryClient.invalidateQueries({ queryKey: ["plan", pId] });
    }
  };

  let errorStatus: number | null = null;

  if (isError && error) {
    if ((error as any)?.response?.status) {
      errorStatus = (error as any).response.status;
    } else if ((error as any)?.status) {
      errorStatus = (error as any).status;
    }
  }

  return {
    ...planData,
    isLoading,
    error: error
      ? (error as any).response?.data?.detail || (error as any).message
      : null,
    errorStatus,
    fetchPlanData,
    refreshItineraries,
    refreshFlights,
    refreshAccommodations,
    refreshExpenses,
    refreshAttachments,
    addAttachment,
    addAccommodation,
    addExpense,
    removeExpense,
    removeAccommodation,
    addItinerary,
    removeItinerary,
    addFlight,
    removeFlight,
  };
};
