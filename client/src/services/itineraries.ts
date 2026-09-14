import type { CreateItineraryRequest, Itinerary, UpdateItineraryRequest } from "../types/api";
import api from "./api";

export const itinerariesApi = {
  getItineraries: async (planId?: number): Promise<Itinerary[]> => {
    const response = await api.get(`/private/itinerary/${planId}/plan`);
    return response.data;
  },

  getItinerary: async (itineraryId: number): Promise<Itinerary> => {
    const response = await api.get(`/private/itinerary/${itineraryId}`);
    return response.data;
  },

  createItinerary: async (
    itineraryData: CreateItineraryRequest,
  ): Promise<Itinerary> => {
    const response = await api.post("/private/itinerary", itineraryData);
    return response.data;
  },

  updateItinerary: async (
    itineraryId: number,
    itineraryData: UpdateItineraryRequest,
  ): Promise<Itinerary> => {
    const response = await api.patch(
      `/private/itinerary/${itineraryId}`,
      itineraryData,
    );
    return response.data;
  },

  deleteItinerary: async (itineraryId: number): Promise<void> => {
    const response = await api.delete(`/private/itinerary/${itineraryId}`);
    return response.data;
  },

  assist: async (
    itineraryId: number,
  ): Promise<{
    packing: string[];
    attractions: string[];
    local_tips: string[];
  }> => {
    const response = await api.post(`/private/itinerary/${itineraryId}/assist`);
    return response.data;
  },
};
