// 공통 비용 관련 타입과 enum

export enum ExpenseCategory {
  FOOD = "food",
  TRANSPORT = "transport",
  FLIGHT = "flight",
  ACTIVITY = "activity",
  ACCOMMODATION = "accommodation",
  SHOPPING = "shopping",
  ETC = "etc",
}

export enum ExpenseCurrency {
  KRW = "KRW",
  USD = "USD",
  EUR = "EUR",
  JPY = "JPY",
  CNY = "CNY",
  GBP = "GBP",
  AUD = "AUD",
}

export const categoryLabels = {
  [ExpenseCategory.FOOD]: "식비",
  [ExpenseCategory.TRANSPORT]: "교통비",
  [ExpenseCategory.ACTIVITY]: "액티비티",
  [ExpenseCategory.ACCOMMODATION]: "숙박비",
  [ExpenseCategory.FLIGHT]: "항공료",
  [ExpenseCategory.SHOPPING]: "쇼핑",
  [ExpenseCategory.ETC]: "기타",
};

export const categoryColors: Record<ExpenseCategory, string> = {
  [ExpenseCategory.FOOD]: "#F5A623",
  [ExpenseCategory.TRANSPORT]: "#3B82F6",
  [ExpenseCategory.ACTIVITY]: "#10B981",
  [ExpenseCategory.ACCOMMODATION]: "#8B5CF6",
  [ExpenseCategory.FLIGHT]: "#06B6D4",
  [ExpenseCategory.SHOPPING]: "#EC4899",
  [ExpenseCategory.ETC]: "#9B9B9B",
};

export const currencyLabels = {
  [ExpenseCurrency.KRW]: "원",
  [ExpenseCurrency.USD]: "$",
  [ExpenseCurrency.EUR]: "€",
  [ExpenseCurrency.JPY]: "¥",
  [ExpenseCurrency.CNY]: "¥",
  [ExpenseCurrency.GBP]: "£",
  [ExpenseCurrency.AUD]: "A$",
};
