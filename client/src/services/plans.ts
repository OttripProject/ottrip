import type { CreatePlanRequest, Plan, UpdatePlanRequest } from "../types/api";
import api from "./api";

export type ExportSegment = {
  country: string;
  city: string;
  startDate: string;
  endDate: string;
  orderIndex: number;
};

export type ExportItinerary = {
  id: number;
  title: string;
  itineraryDate: string;
  startTime: string;
  endTime: string;
  location?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  locationHasCoords?: boolean | null;
  city?: string | null;
  country?: string | null;
};

export type ExportFlightSegment = {
  order: number;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
};

export type ExportFlight = {
  id: number;
  segments: ExportFlightSegment[];
};

export type ExportAccommodation = {
  id: number;
  name: string;
  checkinDate: string;
  checkoutDate: string;
  checkinTime: string;
  checkoutTime: string;
  locationName?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  locationHasCoords?: boolean | null;
};

export type ExportExpense = {
  category: string;
  amount: number | string;
  currency: string;
  description?: string | null;
  exDate: string;
  itineraryId?: number | null;
  flightId?: number | null;
  accommodationId?: number | null;
};

export type ExportSnapshotData = {
  plan: {
    title: string;
    startDate: string;
    endDate: string;
    segments: ExportSegment[];
  };
  itineraries: ExportItinerary[];
  flights: ExportFlight[];
  accommodations: ExportAccommodation[];
  expenses?: ExportExpense[];
  checklist?: {
    categories: Record<string, any[]>;
  };
};

export type PlanExportSnapshot = {
  publicId: string;
  snapshot: ExportSnapshotData;
  createdAt: string;
};

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

  createExport: async (
    planId: number,
    body: { includeExpenses: boolean; includeChecklist: boolean },
  ): Promise<{ publicId: string }> => {
    const res = await api.post(`/private/plans/${planId}/export`, body);
    return res.data;
  },

  getExport: async (publicId: string): Promise<PlanExportSnapshot> => {
    const res = await api.get(`/public/exports/${publicId}`);
    return res.data;
  },

  saveExport: async (publicId: string): Promise<{ planPublicId: string }> => {
    const res = await api.post(`/private/plans/exports/${publicId}/save`);
    return res.data;
  },
};
