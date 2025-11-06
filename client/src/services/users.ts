import api from './api';
import { Gender } from '@/types/api';

export interface UserProfile {
  handle: string;
  nickname: string;
  description: string;
  gender: Gender | null;
  email: string;
}

export interface UpdateUserRequest {
  nickname?: string;
  description?: string;
  gender?: Gender | null;
}

export const usersApi = {
  getMe: async (): Promise<UserProfile> => {
    const res = await api.get('/private/users/me');
    return res.data;
  },
  updateMe: async (data: UpdateUserRequest): Promise<UserProfile> => {
    const res = await api.put('/private/users/me', data);
    return res.data;
  },
  deleteAccount: async (): Promise<void> => {
    await api.delete('/private/users/me');
  },
};


