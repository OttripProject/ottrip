import { useQuery } from '@tanstack/react-query';
import { usersApi, UserProfile } from '@/services/users';

export const useMe = () => {
  return useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe(),
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    gcTime: 10 * 60 * 1000, // 10분간 가비지 컬렉션 방지
  });
};

