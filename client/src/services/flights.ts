import api from './api';
import { ApiResponse, Flight, CreateFlightRequest } from '../types/api';

export const flightsApi = {
  // 모든 항공편 조회
  getFlights: async (planId?: number): Promise<ApiResponse<Flight[]>> => {
    const params = planId ? { plan_id: planId } : {};
    const response = await api.get('/private/flights', { params });
    return response.data;
  },

  // 특정 항공편 조회
  getFlight: async (flightId: number): Promise<ApiResponse<Flight>> => {
    const response = await api.get(`/private/flights/${flightId}`);
    return response.data;
  },

  // 항공편 생성
  createFlight: async (flightData: CreateFlightRequest): Promise<ApiResponse<Flight>> => {
    const response = await api.post('/private/flights', flightData);
    return response.data;
  },

  // 항공편 수정
  updateFlight: async (flightId: number, flightData: Partial<CreateFlightRequest>): Promise<ApiResponse<Flight>> => {
    const response = await api.put(`/private/flights/${flightId}`, flightData);
    return response.data;
  },

  // 항공편 삭제
  deleteFlight: async (flightId: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/private/flights/${flightId}`);
    return response.data;
  },
}; 