import api from "./api";

export type CityResult = {
  id: number;
  cityKo: string | null;
  city: string;
  countryKo: string | null;
  iso2: string | null;
};

export const citiesApi = {
  search: async (params: {
    q?: string;
    iso2?: string;
    skip?: number;
    limit?: number;
  }): Promise<CityResult[]> => {
    const res = await api.get("/public/cities", {
      params: {
        q: params.q || undefined,
        iso2: params.iso2 || undefined,
        skip: params.skip ?? 0,
        limit: params.limit ?? 20,
      },
    });
    return res.data as CityResult[];
  },
};
