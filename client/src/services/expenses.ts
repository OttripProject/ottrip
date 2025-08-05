import api from './api';
import { ApiResponse, Expense, CreateExpenseRequest } from '../types/api';

export const expensesApi = {
  // 모든 지출 조회
  getExpenses: async (planId?: number): Promise<ApiResponse<Expense[]>> => {
    const params = planId ? { plan_id: planId } : {};
    const response = await api.get('/private/expenses', { params });
    return response.data;
  },

  // 특정 지출 조회
  getExpense: async (expenseId: number): Promise<ApiResponse<Expense>> => {
    const response = await api.get(`/private/expenses/${expenseId}`);
    return response.data;
  },

  // 지출 생성
  createExpense: async (expenseData: CreateExpenseRequest): Promise<ApiResponse<Expense>> => {
    const response = await api.post('/private/expenses', expenseData);
    return response.data;
  },

  // 지출 수정
  updateExpense: async (expenseId: number, expenseData: Partial<CreateExpenseRequest>): Promise<ApiResponse<Expense>> => {
    const response = await api.put(`/private/expenses/${expenseId}`, expenseData);
    return response.data;
  },

  // 지출 삭제
  deleteExpense: async (expenseId: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/private/expenses/${expenseId}`);
    return response.data;
  },

  // 카테고리별 지출 통계
  getExpenseStats: async (planId?: number): Promise<ApiResponse<{ category: string; total: number }[]>> => {
    const params = planId ? { plan_id: planId } : {};
    const response = await api.get('/private/expenses/stats', { params });
    return response.data;
  },
}; 