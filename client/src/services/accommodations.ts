import api from './api';
import { Accommodation, CreateAccommodationRequest, UpdateAccommodationRequest } from '../types/api';

export const accommodationsApi = {
  // 모든 숙박 조회
  getAccommodations: async (planId?: number): Promise<Accommodation[]> => {
    const response = await api.get(`/private/accommodations/${planId}/plan`);
    return response.data;
  },

  // 특정 숙박 조회
  getAccommodation: async (accommodationId: number): Promise<Accommodation> => {
    const response = await api.get(`/private/accommodations/${accommodationId}`);
    return response.data;
  },

  // 숙박 생성
  createAccommodation: async (accommodationData: CreateAccommodationRequest): Promise<Accommodation> => {
    const response = await api.post('/private/accommodations', accommodationData);
    return response.data;
  },

  // 숙박 수정
  updateAccommodation: async (accommodationId: number, accommodationData: UpdateAccommodationRequest): Promise<Accommodation> => {
    const response = await api.patch(`/private/accommodations/${accommodationId}`, accommodationData);
    return response.data;
  },

  // 숙박 삭제
  deleteAccommodation: async (accommodationId: number): Promise<void> => {
    const response = await api.delete(`/private/accommodations/${accommodationId}`);
    return response.data;
  },
}; 