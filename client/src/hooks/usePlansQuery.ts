import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plansApi } from '../services/plans';
import { Plan, CreatePlanRequest, UpdatePlanRequest } from '../types/api';

export const usePlansQuery = () => {
  const queryClient = useQueryClient();

  // Plan 목록 조회
  const { data: plans = [], isLoading, error, refetch } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: () => plansApi.getPlans(),
    staleTime: 2 * 60 * 1000, // 2분간 캐시 유지
    gcTime: 5 * 60 * 1000, // 5분간 가비지 컬렉션 방지
  });

  // Plan 생성
  const addPlanMutation = useMutation({
    mutationFn: (planData: CreatePlanRequest) => plansApi.createPlan(planData),
    onSuccess: (newPlan) => {
      // 캐시 업데이트
      queryClient.setQueryData<Plan[]>(['plans'], (old = []) => [...old, newPlan]);
    },
  });

  // Plan 수정
  const updatePlanMutation = useMutation({
    mutationFn: ({ planId, planData }: { planId: number; planData: UpdatePlanRequest }) =>
      plansApi.updatePlan(planId, planData),
    onSuccess: (updatedPlan) => {
      // 캐시 업데이트
      queryClient.setQueryData<Plan[]>(['plans'], (old = []) =>
        old.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan))
      );
      // 해당 plan의 상세 데이터도 무효화
      queryClient.invalidateQueries({ queryKey: ['plan', updatedPlan.publicId] });
    },
  });

  // Plan 삭제
  const deletePlanMutation = useMutation({
    mutationFn: (planId: number) => plansApi.deletePlan(planId),
    onSuccess: (_, planId) => {
      // 캐시 업데이트
      queryClient.setQueryData<Plan[]>(['plans'], (old = []) =>
        old.filter((plan) => plan.id !== planId)
      );
    },
  });

  return {
    plans,
    isLoading,
    error: error ? (error as any).response?.data?.detail || (error as any).message : null,
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

