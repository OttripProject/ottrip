import api from './api';
import { Expense, CreateExpenseRequest, UpdateExpenseRequest } from '../types/api';

export const expensesApi = {
  // 모든 지출 조회
  getExpenses: async (planId?: number): Promise<Expense[]> => {
    const response = await api.get(`/private/expenses/${planId}/plan`);
    return response.data;
  },

  // 특정 일정의 지출 조회
  getExpensesByItinerary: async (itineraryId: number): Promise<Expense[]> => {
    const response = await api.get(`/private/expenses/${itineraryId}/itinerary`);
    return response.data;
  },

  // 특정 지출 조회
  getExpense: async (expenseId: number): Promise<Expense> => {
    const response = await api.get(`/private/expenses/${expenseId}`);
    return response.data;
  },

  // 지출 생성
  createExpense: async (expenseData: CreateExpenseRequest): Promise<Expense> => {
    if (expenseData.itineraryId) {
      const response = await api.post(`/private/expenses/${expenseData.itineraryId}/itinerary`, expenseData);
      return response.data;
    }
    const response = await api.post('/private/expenses', expenseData);
    return response.data;
  },

  // 지출 수정
  updateExpense: async (expenseId: number, expenseData: UpdateExpenseRequest): Promise<Expense> => {
    const response = await api.patch(`/private/expenses/${expenseId}`, expenseData);
    return response.data;
  },

  // 지출 삭제
  deleteExpense: async (expenseId: number): Promise<void> => {
    const response = await api.delete(`/private/expenses/${expenseId}`);
    return response.data;
  },

  // 카테고리별 지출 통계
  getExpenseStats: async (planId?: number): Promise<{ category: string; total: number }[]> => {
    const params = planId ? { plan_id: planId } : {};
    const response = await api.get('/private/expenses/stats', { params });
    return response.data;
  },
}; 