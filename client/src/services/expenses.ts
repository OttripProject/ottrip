import api from './api';
import { Expense, CreateExpenseRequest, UpdateExpenseRequest } from '../types/api';

export const expensesApi = {
  // 모든 비용 조회
  getExpenses: async (planId?: number): Promise<Expense[]> => {
    const response = await api.get(`/private/expenses/${planId}/plan`);
    // 서버가 Decimal을 문자열로 반환할 수 있으므로 숫자로 강제 변환
    return (response.data as Expense[]).map((e) => ({
      ...e,
      amount: Number((e as any).amount),
    }));
  },

  // 특정 일정의 비용 조회
  getExpensesByItinerary: async (itineraryId: number): Promise<Expense[]> => {
    const response = await api.get(`/private/expenses/${itineraryId}/itinerary`);
    return (response.data as Expense[]).map((e) => ({
      ...e,
      amount: Number((e as any).amount),
    }));
  },

  // 특정 비용 조회
  getExpense: async (expenseId: number): Promise<Expense> => {
    const response = await api.get(`/private/expenses/${expenseId}`);
    const e = response.data as Expense;
    return { ...e, amount: Number((e as any).amount) } as Expense;
  },

  // 비용 생성
  createExpense: async (expenseData: CreateExpenseRequest): Promise<Expense> => {
    if (expenseData.itineraryId) {
      const response = await api.post(`/private/expenses/${expenseData.itineraryId}/itinerary`, expenseData);
      return response.data;
    }
    const response = await api.post('/private/expenses', expenseData);
    return response.data;
  },

  // 비용 배치 생성
  createExpensesBatch: async (batchData: {
    planId: number;
    itineraryId?: number;
    flightId?: number;
    accommodationId?: number;
    expenses: Array<{
      category: string;
      amount: number;
      currency: string;
      description?: string;
      exDate: string;
    }>;
  }): Promise<Expense[]> => {
    const response = await api.post('/private/expenses/batch', batchData);
    return (response.data as Expense[]).map((e) => ({
      ...e,
      amount: Number((e as any).amount),
    }));
  },

  // 비용 수정
  updateExpense: async (expenseId: number, expenseData: UpdateExpenseRequest): Promise<Expense> => {
    const response = await api.patch(`/private/expenses/${expenseId}`, expenseData);
    return response.data;
  },

  // 비용 삭제
  deleteExpense: async (expenseId: number): Promise<void> => {
    const response = await api.delete(`/private/expenses/${expenseId}`);
    return response.data;
  },

  // 카테고리별 비용 통계
  getExpenseStats: async (planId?: number): Promise<{ category: string; total: number }[]> => {
    const params = planId ? { plan_id: planId } : {};
    const response = await api.get('/private/expenses/stats', { params });
    return response.data;
  },
}; 