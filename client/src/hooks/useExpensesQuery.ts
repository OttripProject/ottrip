import { useQuery } from '@tanstack/react-query';
import { expensesApi } from '../services/expenses';
import { Expense } from '../types/api';

/**
 * 날짜별 expense를 조회하는 훅
 * @param planId - Plan ID
 * @param exDate - 날짜 (YYYY-MM-DD 형식), 없으면 전체 expense 조회
 */
export const useExpensesQuery = (planId: number | undefined, exDate?: string) => {
  return useQuery<Expense[]>({
    queryKey: ['expenses', planId, exDate],
    queryFn: () => expensesApi.getExpenses(planId, exDate),
    enabled: !!planId,
    staleTime: 30 * 1000, // 30초간 캐시 유지
  });
};
