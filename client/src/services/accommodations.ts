import api from './api';
import { ApiResponse, Accommodation, CreateAccommodationRequest } from '../types/api';

export const accommodationsApi = {
  // 모든 숙박 조회
  getAccommodations: async (planId?: number): Promise<ApiResponse<Accommodation[]>> => {
    const params = planId ? { plan_id: planId } : {};
    const response = await api.get('/private/accommodations', { params });
    return response.data;
  },

  // 특정 숙박 조회
  getAccommodation: async (accommodationId: number): Promise<ApiResponse<Accommodation>> => {
    const response = await api.get(`/private/accommodations/${accommodationId}`);
    return response.data;
  },

  // 숙박 생성
  createAccommodation: async (accommodationData: CreateAccommodationRequest): Promise<ApiResponse<Accommodation>> => {
    const response = await api.post('/private/accommodations', accommodationData);
    return response.data;
  },

  // 숙박 수정
  updateAccommodation: async (accommodationId: number, accommodationData: Partial<CreateAccommodationRequest>): Promise<ApiResponse<Accommodation>> => {
    const response = await api.put(`/private/accommodations/${accommodationId}`, accommodationData);
    return response.data;
  },

  // 숙박 삭제
  deleteAccommodation: async (accommodationId: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/private/accommodations/${accommodationId}`);
    return response.data;
  },
}; 