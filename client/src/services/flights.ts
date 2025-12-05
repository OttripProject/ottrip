import api from './api';
import { FlightRead } from '../types/api';

export const flightsApi = {
  // 새 Flight 모델 기반 엔드포인트
  createFlight: async (payload: any): Promise<{ id: number }> => {
    const res = await api.post('/private/flights/', payload);
    return res.data as { id: number };
  },
  updateFlight: async (flightId: number, payload: any): Promise<void> => {
    await api.patch(`/private/flights/${flightId}`, payload);
  },
  deleteFlight: async (flightId: number): Promise<void> => {
    await api.delete(`/private/flights/${flightId}`);
  },

  // 항공 목록 조회(플랜 기준)
  getFlightsByPlan: async (planId: number): Promise<FlightRead[]> => {
    const res = await api.get(`/private/flights/${planId}/plan`);
    return res.data as FlightRead[];
  },

  // 항공 단건 조회
  getFlight: async (flightId: number): Promise<FlightRead> => {
    const res = await api.get(`/private/flights/${flightId}`);
    return res.data as FlightRead;
  },
}; 