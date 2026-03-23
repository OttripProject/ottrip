import { useQuery } from '@tanstack/react-query';
import { usersApi, UserProfile } from '@/services/users';

export const useMe = () => {
  return useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe(),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

