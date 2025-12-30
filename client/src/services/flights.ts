import api from './api';
import { FlightRead } from '../types/api';

export const flightsApi = {
  createFlight: async (payload: any): Promise<{ id: number }> => {
    const res = await api.post('/private/flights', payload);
    return res.data as { id: number };
  },
  updateFlight: async (flightId: number, payload: any): Promise<void> => {
    await api.patch(`/private/flights/${flightId}`, payload);
  },
  deleteFlight: async (flightId: number): Promise<void> => {
    await api.delete(`/private/flights/${flightId}`);
  },

  getFlightsByPlan: async (planId: number): Promise<FlightRead[]> => {
    const res = await api.get(`/private/flights/${planId}/plan`);
    return res.data as FlightRead[];
  },

  getFlight: async (flightId: number): Promise<FlightRead> => {
    const res = await api.get(`/private/flights/${flightId}`);
    return res.data as FlightRead;
  },
}; 