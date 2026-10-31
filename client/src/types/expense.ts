import { colors } from "@/ui/tokens/colors";

// 공통 비용 관련 타입과 enum

export enum ExpenseCategory {
  FOOD = "food",
  TRANSPORT = "transport",
  FLIGHT = "flight",
  ACTIVITY = "activity",
  SIGHTSEEING = "sightseeing",
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
  [ExpenseCategory.SIGHTSEEING]: "관광",
  [ExpenseCategory.ACCOMMODATION]: "숙박비",
  [ExpenseCategory.FLIGHT]: "항공료",
  [ExpenseCategory.SHOPPING]: "쇼핑",
  [ExpenseCategory.ETC]: "기타",
};

export const categoryColors: Record<ExpenseCategory, string> = {
  [ExpenseCategory.FOOD]: colors.categoryMeal,
  [ExpenseCategory.TRANSPORT]: colors.categoryTransport,
  [ExpenseCategory.ACTIVITY]: colors.categoryActivity,
  [ExpenseCategory.SIGHTSEEING]: colors.categorySightseeing,
  [ExpenseCategory.ACCOMMODATION]: colors.accommodationText,
  [ExpenseCategory.FLIGHT]: colors.flightText,
  [ExpenseCategory.SHOPPING]: colors.categoryShopping,
  [ExpenseCategory.ETC]: colors.categoryEtc,
};

export const categoryTints: Record<ExpenseCategory, string> = {
  [ExpenseCategory.FOOD]: colors.categoryMealBg,
  [ExpenseCategory.TRANSPORT]: colors.categoryTransportBg,
  [ExpenseCategory.ACTIVITY]: colors.categoryActivityBg,
  [ExpenseCategory.SIGHTSEEING]: colors.categorySightseeingBg,
  [ExpenseCategory.ACCOMMODATION]: colors.accommodationBg,
  [ExpenseCategory.FLIGHT]: colors.flightBg,
  [ExpenseCategory.SHOPPING]: colors.categoryShoppingBg,
  [ExpenseCategory.ETC]: colors.categoryEtcBg,
};

export const currencyLabels = {
  [ExpenseCurrency.KRW]: "원",
  [ExpenseCurrency.USD]: "달러",
  [ExpenseCurrency.EUR]: "€",
  [ExpenseCurrency.JPY]: "¥",
  [ExpenseCurrency.CNY]: "¥",
  [ExpenseCurrency.GBP]: "£",
  [ExpenseCurrency.AUD]: "A$",
};

export const currencySymbols = {
  [ExpenseCurrency.KRW]: "₩",
  [ExpenseCurrency.USD]: "$",
  [ExpenseCurrency.EUR]: "€",
  [ExpenseCurrency.JPY]: "¥",
  [ExpenseCurrency.CNY]: "CN¥",
  [ExpenseCurrency.GBP]: "£",
  [ExpenseCurrency.AUD]: "A$",
};
