import type { CreateLocationRequest, Location } from "../types/api";
import api from "./api";

export const locationsApi = {
  createLocation: async (data: CreateLocationRequest): Promise<Location> => {
    const response = await api.post("/private/locations", data);
    return response.data;
  },
};
