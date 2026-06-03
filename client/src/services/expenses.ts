import type {
  CreateExpenseRequest,
  Expense,
  UpdateExpenseRequest,
} from "../types/api";
import api from "./api";

export const expensesApi = {
  getExpenses: async (planId?: number, exDate?: string): Promise<Expense[]> => {
    const params = exDate ? { ex_date: exDate } : {};
    const response = await api.get(`/private/expenses/${planId}/plan`, {
      params,
    });
    return (response.data as Expense[]).map(e => ({
      ...e,
      amount: Number((e as any).amount),
    }));
  },

  getExpensesByItinerary: async (itineraryId: number): Promise<Expense[]> => {
    const response = await api.get(
      `/private/expenses/${itineraryId}/itinerary`,
    );
    return (response.data as Expense[]).map(e => ({
      ...e,
      amount: Number((e as any).amount),
    }));
  },

  getExpense: async (expenseId: number): Promise<Expense> => {
    const response = await api.get(`/private/expenses/${expenseId}`);
    const e = response.data as Expense;
    return { ...e, amount: Number((e as any).amount) } as Expense;
  },

  createExpense: async (
    expenseData: CreateExpenseRequest,
  ): Promise<Expense> => {
    if (expenseData.itineraryId) {
      const response = await api.post(
        `/private/expenses/${expenseData.itineraryId}/itinerary`,
        expenseData,
      );
      return response.data;
    }
    const response = await api.post("/private/expenses", expenseData);
    return response.data;
  },

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
    const response = await api.post("/private/expenses/batch", batchData);
    return (response.data as Expense[]).map(e => ({
      ...e,
      amount: Number((e as any).amount),
    }));
  },

  updateExpense: async (
    expenseId: number,
    expenseData: UpdateExpenseRequest,
  ): Promise<Expense> => {
    const response = await api.patch(
      `/private/expenses/${expenseId}`,
      expenseData,
    );
    return response.data;
  },

  deleteExpense: async (expenseId: number): Promise<void> => {
    const response = await api.delete(`/private/expenses/${expenseId}`);
    return response.data;
  },

  getExpenseStats: async (
    planId?: number,
  ): Promise<{ category: string; total: number }[]> => {
    const params = planId ? { plan_id: planId } : {};
    const response = await api.get("/private/expenses/stats", { params });
    return response.data;
  },
};
