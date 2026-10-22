import type { Expense } from "@/types/api";

export type ExpenseSummary = {
  total: number;
  totalKrw: number;
  totalUsd: number;
  byCategory: Record<string, number>;
};

export function summarizeExpenses(
  expenses: Expense[] | undefined,
): ExpenseSummary {
  let total = 0;
  let totalKrw = 0;
  let totalUsd = 0;
  const byCategory: Record<string, number> = {};

  if (Array.isArray(expenses)) {
    for (const expense of expenses) {
      const amount = expense.amount || 0;
      total += amount;
      if (expense.currency === "USD") {
        totalUsd += amount;
      } else {
        totalKrw += amount;
      }
      const category = expense.category || "기타";
      byCategory[category] = (byCategory[category] || 0) + amount;
    }
  }

  return { total, totalKrw, totalUsd, byCategory };
}
