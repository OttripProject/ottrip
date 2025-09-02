import api from './api';
import { Itinerary, CreateItineraryRequest } from '../types/api';

export const itinerariesApi = {
  // 모든 일정 조회
  getItineraries: async (planId?: number): Promise<Itinerary[]> => {
    const response = await api.get(`/private/itinerary/${planId}/plan`);
    return response.data;
  },

  // 특정 일정 조회
  getItinerary: async (itineraryId: number): Promise<Itinerary> => {
    const response = await api.get(`/private/itinerary/${itineraryId}`);
    return response.data;
  },

  // 일정 생성
  createItinerary: async (itineraryData: CreateItineraryRequest): Promise<Itinerary> => {
    const response = await api.post('/private/itinerary', itineraryData);
    return response.data;
  },

  // 일정 수정
  updateItinerary: async (itineraryId: number, itineraryData: Partial<CreateItineraryRequest>): Promise<Itinerary> => {
    const response = await api.patch(`/private/itinerary/${itineraryId}`, itineraryData);
    return response.data;
  },

  // 일정 삭제
  deleteItinerary: async (itineraryId: number): Promise<void> => {
    const response = await api.delete(`/private/itinerary/${itineraryId}`);
    return response.data;
  },
}; 