import { useQuery } from '@tanstack/react-query';
import { usersApi, UserProfile } from '@/services/users';
import { useAuth } from '@/contexts/AuthContext';

export const useMe = () => {
  const { isAuthenticated } = useAuth();

  return useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe(),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: isAuthenticated,
  });
};

