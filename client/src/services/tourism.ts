import api from "./api";

export interface NearbyAttraction {
  contentId: string;
  contentTypeId: string;
  categorySub: string | null;
  title: string;
  imageUrl: string | null;
  address: string | null;
  rank: number | null;
  dist: number | null;
}

export interface TourismDetail {
  contentId: string;
  contentTypeId: string | null;
  title: string | null;
  address: string | null;
  homepage: string | null;
  tel: string | null;
  overview: string | null;
  imageUrl: string | null;
}

export const tourismApi = {
  getNearbyAttractions: async (
    itineraryId: number,
  ): Promise<NearbyAttraction[]> => {
    const response = await api.get(
      `/private/tourism/nearby/${itineraryId}`,
    );
    return response.data;
  },

  getTourismDetail: async (name: string): Promise<TourismDetail> => {
    const response = await api.get("/private/tourism/detail", {
      params: { name },
    });
    return response.data;
  },
};
