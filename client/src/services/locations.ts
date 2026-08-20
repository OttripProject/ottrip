import type {
  CreateLocationRequest,
  Location,
  UpdateLocationRequest,
} from "../types/api";
import api from "./api";

const STALE_DAYS = 30;

export function isLocationStale(location: Location): boolean {
  if (!location.fromGoogle) return false;
  const updatedAt = new Date(location.updatedAt);
  const diffMs = Date.now() - updatedAt.getTime();
  return diffMs > STALE_DAYS * 24 * 60 * 60 * 1000;
}

export const locationsApi = {
  createLocation: async (data: CreateLocationRequest): Promise<Location> => {
    const response = await api.post("/private/locations", data);
    return response.data;
  },

  updateLocation: async (
    locationId: number,
    data: UpdateLocationRequest,
  ): Promise<Location> => {
    const response = await api.put(`/private/locations/${locationId}`, data);
    return response.data;
  },
};
