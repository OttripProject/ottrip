import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

export function useHello() {
  return useQuery({
    queryKey: ['hello'],
    queryFn: async () => {
      const res = await api.get('/todos/1');
      return res.data;
    },
  });
} 