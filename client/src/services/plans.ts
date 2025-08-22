import api from './api';
import { Plan, CreatePlanRequest, UpdatePlanRequest } from '../types/api';

export const plansApi = {
  // 현재 사용자의 모든 계획 조회
  getPlans: async (): Promise<Plan[]> => {
    const response = await api.get('/private/plans/me');
    return response.data.plans; // plans 배열 추출
  },

  // 특정 계획 조회
  getPlan: async (planId: number): Promise<Plan> => {
    const response = await api.get(`/private/plans/${planId}`);
    return response.data;
  },

  // 계획 생성
  createPlan: async (planData: CreatePlanRequest): Promise<Plan> => {
    const response = await api.post('/private/plans', planData);
    return response.data;
  },

  // 계획 수정
  updatePlan: async (planId: number, planData: UpdatePlanRequest): Promise<Plan> => {
    const response = await api.patch(`/private/plans/${planId}`, planData);
    return response.data;
  },

  // 계획 삭제 -> 아직 정의되지 않음
  deletePlan: async (planId: number): Promise<void> => {
    const response = await api.delete(`/private/plans/${planId}`);
    return response.data;
  },
}; 