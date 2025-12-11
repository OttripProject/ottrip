import api from './api';
import { Accommodation, CreateAccommodationRequest, UpdateAccommodationRequest } from '../types/api';

export const accommodationsApi = {
  getAccommodations: async (planId?: number): Promise<Accommodation[]> => {
    const response = await api.get(`/private/accommodations/${planId}/plan`);
    return response.data;
  },

  getAccommodation: async (accommodationId: number): Promise<Accommodation> => {
    const response = await api.get(`/private/accommodations/${accommodationId}`);
    return response.data;
  },

  createAccommodation: async (accommodationData: CreateAccommodationRequest): Promise<Accommodation> => {
    const response = await api.post('/private/accommodations', accommodationData);
    return response.data;
  },

  updateAccommodation: async (accommodationId: number, accommodationData: UpdateAccommodationRequest): Promise<Accommodation> => {
    const response = await api.patch(`/private/accommodations/${accommodationId}`, accommodationData);
    return response.data;
  },

  deleteAccommodation: async (accommodationId: number): Promise<void> => {
    const response = await api.delete(`/private/accommodations/${accommodationId}`);
    return response.data;
  },
}; 