import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { plansApi } from "../services/plans";
import type { CreatePlanRequest, Plan, UpdatePlanRequest } from "../types/api";
import { sortPlansByDate } from "../utils/planSort"; 

export const usePlansQuery = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const {
    data: plans = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: () => plansApi.getPlans(),
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: isAuthenticated,
    select: (data) => sortPlansByDate(data),
  });

  const addPlanMutation = useMutation({
    mutationFn: (planData: CreatePlanRequest) => plansApi.createPlan(planData),
    onSuccess: newPlan => {
      queryClient.setQueryData<Plan[]>(["plans"], (old = []) => [
        ...old,
        newPlan,
      ]);
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({
      planId,
      planData,
    }: { planId: number; planData: UpdatePlanRequest }) =>
      plansApi.updatePlan(planId, planData),
    onSuccess: updatedPlan => {
      queryClient.setQueryData<Plan[]>(["plans"], (old = []) =>
        old.map(plan => (plan.id === updatedPlan.id ? updatedPlan : plan)),
      );
      queryClient.invalidateQueries({
        queryKey: ["plan", updatedPlan.publicId],
      });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (planId: number) => plansApi.deletePlan(planId),
    onSuccess: (_, planId) => {
      queryClient.setQueryData<Plan[]>(["plans"], (old = []) =>
        old.filter(plan => plan.id !== planId),
      );
    },
  });

  return {
    plans,
    isLoading,
    error: error
      ? (error as any).response?.data?.detail || (error as any).message
      : null,
    fetchPlans: refetch,
    addPlan: async (planData: CreatePlanRequest) => {
      const result = await addPlanMutation.mutateAsync(planData);
      return result;
    },
    updatePlan: async (planId: number, planData: UpdatePlanRequest) => {
      const result = await updatePlanMutation.mutateAsync({ planId, planData });
      return result;
    },
    deletePlan: async (planId: number) => {
      await deletePlanMutation.mutateAsync(planId);
      return true;
    },
  };
};