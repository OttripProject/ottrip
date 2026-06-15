import type { CreatePlanRequest, Plan, UpdatePlanRequest } from "../types/api";
import api from "./api";

export type PlanShare = {
  handle: string;
  role: "editor" | "viewer" | null;
  nickname: string;
  email: string;
};

export const plansApi = {
  getPlans: async (): Promise<Plan[]> => {
    const response = await api.get("/private/plans/me");
    return response.data.plans;
  },

  getPlan: async (publicId: string): Promise<Plan> => {
    const response = await api.get(`/private/plans/${publicId}`);
    return response.data;
  },

  createPlan: async (planData: CreatePlanRequest): Promise<Plan> => {
    const response = await api.post("/private/plans", planData);
    return response.data;
  },

  updatePlan: async (
    planId: number,
    planData: UpdatePlanRequest,
  ): Promise<Plan> => {
    const response = await api.patch(`/private/plans/${planId}`, planData);
    return response.data;
  },

  deletePlan: async (planId: number): Promise<void> => {
    const response = await api.delete(`/private/plans/${planId}`);
    return response.data;
  },

  listShares: async (planId: number): Promise<PlanShare[]> => {
    const res = await api.get(`/private/plans/${planId}/shares`);
    return res.data as PlanShare[];
  },

  updateShare: async (
    planId: number,
    handle: string,
    role: "editor" | "viewer",
  ): Promise<void> => {
    await api.patch(`/private/plans/${planId}/shares`, { handle, role });
  },

  revokeShare: async (planId: number, handle: string): Promise<void> => {
    await api.delete(`/private/plans/${planId}/shares/${handle}`);
  },

  invite: async (
    planId: number,
    body: { email: string; role: "editor" | "viewer"; expires_days?: number },
  ): Promise<void> => {
    await api.post(`/private/plans/${planId}/invitations`, body);
  },

  setMemo: async (planId: number, memo: string): Promise<void> => {
    await api.patch(`/private/plans/${planId}/memo`, { memo });
  },
};
