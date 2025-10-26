import api from './api';
import { Plan, CreatePlanRequest, UpdatePlanRequest } from '../types/api';

export type PlanShare = {
  handle: string;
  role: 'editor' | 'viewer';
  nickname: string;
};

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

  // 공개 ID로 계획 조회
  getPlanByPublicId: async (publicId: string): Promise<Plan> => {
    const response = await api.get(`/private/plans/public/${publicId}`);
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

  // 공유 목록
  listShares: async (planId: number): Promise<PlanShare[]> => {
    const res = await api.get(`/private/plans/${planId}/shares`);
    return res.data as PlanShare[];
  },

  // 공유 해제(소유자만): handle 기반
  revokeShare: async (planId: number, handle: string): Promise<void> => {
    await api.delete(`/private/plans/${planId}/shares/${handle}`);
  },

  // 계획 공유 초대 생성
  invite: async (
    planId: number,
    body: { email: string; role: 'editor' | 'viewer'; expires_days?: number }
  ): Promise<void> => {
    await api.post(`/private/plans/${planId}/invitations`, body);
  },

  // 메모 수정
  setMemo: async (planId: number, memo: string): Promise<void> => {
    await api.patch(`/private/plans/${planId}/memo`, { memo });
  },
}; 