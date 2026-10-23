import { colors } from "@/ui/tokens/colors";

export interface TourismCategoryColor {
  color: string;
  bg: string;
}

export const tourismCategoryColors: Record<string, TourismCategoryColor> = {
  여행코스: { color: colors.imageInk, bg: colors.imageTint },
  쇼핑: { color: colors.categoryShopping, bg: colors.categoryShoppingBg },
  레포츠: { color: colors.categoryTransport, bg: colors.categoryTransportBg },
  축제·공연: { color: colors.festivalText, bg: colors.festivalBg },
  문화시설: {
    color: colors.categorySightseeing,
    bg: colors.categorySightseeingBg,
  },
  음식점: { color: colors.categoryMeal, bg: colors.categoryMealBg },
  숙박: { color: colors.accommodationText, bg: colors.accommodationBg },
  관광지: {
    color: colors.categorySightseeing,
    bg: colors.categorySightseeingBg,
  },
};

export const defaultTourismCategoryColor: TourismCategoryColor = {
  color: colors.categoryEtc,
  bg: colors.gray200,
};

export const getTourismCategoryColor = (category?: string | null) =>
  (category && tourismCategoryColors[category]) || defaultTourismCategoryColor;
