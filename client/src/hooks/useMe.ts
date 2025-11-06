import { useQuery } from '@tanstack/react-query';
import { usersApi, UserProfile } from '@/services/users';

export const useMe = () => {
  return useQuery<UserProfile>({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe(),
    staleTime: 15 * 60 * 1000, // 15분간 캐시 유지 (프로필은 자주 변경되지 않음)
    gcTime: 30 * 60 * 1000, // 30분간 가비지 컬렉션 방지
  });
};

