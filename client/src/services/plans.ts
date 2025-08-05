import api from './api';
import { ApiResponse, Plan, CreatePlanRequest } from '../types/api';

export const plansApi = {
  // 모든 계획 조회
  getPlans: async (): Promise<ApiResponse<Plan[]>> => {
    const response = await api.get('/private/plans');
    return response.data;
  },

  // 특정 계획 조회
  getPlan: async (planId: number): Promise<ApiResponse<Plan>> => {
    const response = await api.get(`/private/plans/${planId}`);
    return response.data;
  },

  // 계획 생성
  createPlan: async (planData: CreatePlanRequest): Promise<ApiResponse<Plan>> => {
    const response = await api.post('/private/plans', planData);
    return response.data;
  },

  // 계획 수정
  updatePlan: async (planId: number, planData: Partial<CreatePlanRequest>): Promise<ApiResponse<Plan>> => {
    const response = await api.put(`/private/plans/${planId}`, planData);
    return response.data;
  },

  // 계획 삭제
  deletePlan: async (planId: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/private/plans/${planId}`);
    return response.data;
  },
}; 