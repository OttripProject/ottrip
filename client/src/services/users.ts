import type { Gender } from "@/types/api";
import api from "./api";

export interface UserProfile {
  handle: string;
  nickname: string;
  description: string;
  gender: Gender | null;
  email: string | null;
  isGuest: boolean;
}

export interface UpdateUserRequest {
  nickname?: string;
  description?: string;
  gender?: Gender | null;
}

function normalizeUserProfile(raw: Record<string, unknown>): UserProfile {
  return {
    ...raw,
    isGuest:
      raw.isGuest === true || (raw as { is_guest?: boolean }).is_guest === true,
  } as UserProfile;
}

export const usersApi = {
  getMe: async (): Promise<UserProfile> => {
    const res = await api.get("/private/users/me");
    return normalizeUserProfile((res.data ?? {}) as Record<string, unknown>);
  },
  updateMe: async (data: UpdateUserRequest): Promise<UserProfile> => {
    const res = await api.put("/private/users/me", data);
    return normalizeUserProfile((res.data ?? {}) as Record<string, unknown>);
  },
  deleteAccount: async (): Promise<void> => {
    await api.delete("/private/users/me");
  },
};
