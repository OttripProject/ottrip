import { colors } from "@/ui/tokens";

export enum ItineraryCategory {
  MEAL = "MEAL",
  TRANSPORT = "TRANSPORT",
  ACTIVITY = "ACTIVITY",
  SIGHTSEEING = "SIGHTSEEING",
  SHOPPING = "SHOPPING",
  ETC = "ETC",
}

export const itineraryCategoryLabels: Record<ItineraryCategory, string> = {
  [ItineraryCategory.MEAL]: "식사",
  [ItineraryCategory.TRANSPORT]: "이동",
  [ItineraryCategory.ACTIVITY]: "액티비티",
  [ItineraryCategory.SIGHTSEEING]: "관광",
  [ItineraryCategory.SHOPPING]: "쇼핑",
  [ItineraryCategory.ETC]: "기타",
};

export const itineraryCategoryColors: Record<ItineraryCategory, string> = {
  [ItineraryCategory.MEAL]: colors.categoryMeal,
  [ItineraryCategory.TRANSPORT]: colors.categoryTransport,
  [ItineraryCategory.ACTIVITY]: colors.categoryActivity,
  [ItineraryCategory.SIGHTSEEING]: colors.categorySightseeing,
  [ItineraryCategory.SHOPPING]: colors.categoryShopping,
  [ItineraryCategory.ETC]: colors.categoryEtc,
};
