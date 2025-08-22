import { useState, useCallback, useEffect } from 'react';
import { plansApi } from '../services/plans';
import { Plan, CreatePlanRequest, UpdatePlanRequest } from '../types/api';

export const usePlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Plan 목록 조회
  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await plansApi.getPlans();
      setPlans(data);
    } catch (err: any) {
      console.error('Failed to fetch plans:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch plans');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Plan 생성
  const addPlan = useCallback(async (planData: CreatePlanRequest): Promise<Plan | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const newPlan = await plansApi.createPlan(planData);
      setPlans(prev => [...prev, newPlan]);
      return newPlan;
    } catch (err: any) {
      console.error('Failed to create plan:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to create plan');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Plan 수정
  const updatePlan = useCallback(async (planId: number, planData: UpdatePlanRequest): Promise<Plan | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedPlan = await plansApi.updatePlan(planId, planData);
      setPlans(prev => prev.map(plan => plan.id === planId ? updatedPlan : plan));
      return updatedPlan;
    } catch (err: any) {
      console.error('Failed to update plan:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to update plan');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Plan 삭제
  const deletePlan = useCallback(async (planId: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await plansApi.deletePlan(planId);
      setPlans(prev => prev.filter(plan => plan.id !== planId));
      return true;
    } catch (err: any) {
      console.error('Failed to delete plan:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to delete plan');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 컴포넌트 마운트 시 Plan 목록 조회
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return {
    plans,
    isLoading,
    error,
    fetchPlans,
    addPlan,
    updatePlan,
    deletePlan,
  };
}; 