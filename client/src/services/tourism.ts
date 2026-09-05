import api from "./api";

export interface NearbyAttraction {
  contentId: string;
  contentTypeId: string;
  categorySub: string | null;
  title: string;
  imageUrl: string | null;
  address: string | null;
  rank: number | null;
  dist: number | null;
}

export interface TourismDetail {
  contentId: string;
  contentTypeId: string | null;
  title: string | null;
  address: string | null;
  homepage: string | null;
  tel: string | null;
  telname: string | null;
  overview: string | null;
  imageUrl: string | null;
  mapx: number | null;
  mapy: number | null;
  // 관광지
  usetime: string | null;
  restdate: string | null;
  parking: string | null;
  infocenter: string | null;
  // 문화시설
  usetimeculture: string | null;
  restdateculture: string | null;
  usefee: string | null;
  spendtime: string | null;
  parkingculture: string | null;
  // 축제·공연
  eventdate: string | null;
  eventplace: string | null;
  playtime: string | null;
  usetimefestival: string | null;
  bookingplace: string | null;
  agelimit: string | null;
  program: string | null;
  sponsor1: string | null;
  sponsor1tel: string | null;
  sponsor2: string | null;
  // 여행코스
  distance: string | null;
  taketime: string | null;
  schedule: string | null;
  infocentertourcourse: string | null;
  // 레포츠
  usetimeleports: string | null;
  restdateleports: string | null;
  usefeeleports: string | null;
  reservation: string | null;
  parkingleports: string | null;
  // 숙박
  checkintime: string | null;
  checkouttime: string | null;
  roomcount: string | null;
  reservationlodging: string | null;
  refundregulation: string | null;
  subfacility: string | null;
  infocenterlodging: string | null;
  parkinglodging: string | null;
  // 쇼핑
  opentime: string | null;
  restdateshopping: string | null;
  saleitem: string | null;
  parkingshopping: string | null;
  // 음식점
  opentimefood: string | null;
  restdatefood: string | null;
  firstmenu: string | null;
  packing: string | null;
  reservationfood: string | null;
  parkingfood: string | null;
}

export interface CongestionItem {
  tatsNm: string | null;
  cnctrRate: number | null;
  baseYmd: string | null;
}

export interface FestivalItem {
  contentId: string;
  contentTypeId: string | null;
  title: string;
  address: string | null;
  eventStartDate: string | null;
  eventEndDate: string | null;
  imageUrl: string | null;
  imageUrl2: string | null;
  lclsSystm2: string | null;
  tel: string | null;
  mapx: number | null;
  mapy: number | null;
  dist: number | null;
  matchedLocationName: string | null;
  matchedDate: string | null;
}

export const tourismApi = {
  getNearbyAttractions: async (itineraryId: number): Promise<NearbyAttraction[]> => {
    const response = await api.get(`/private/tourism/nearby/${itineraryId}`);
    return response.data;
  },

  getFestivalsForPlan: async (planId: number): Promise<FestivalItem[]> => {
    const response = await api.get(`/private/tourism/festivals/${planId}`);
    return response.data;
  },

  getSuggestFestivals: async (planId: number): Promise<FestivalItem[]> => {
    const response = await api.get(`/private/tourism/festivals/${planId}`, {
      params: { suggest: true },
    });
    return response.data;
  },

  getCongestion: async (itineraryId: number): Promise<CongestionItem[]> => {
    const response = await api.get(`/private/tourism/congestion/${itineraryId}`);
    return response.data;
  },

  getTourismDetail: async (params: {
    name?: string;
    contentId?: string;
    contentTypeId?: string;
  }): Promise<TourismDetail> => {
    const response = await api.get("/private/tourism/detail", {
      params: {
        name: params.name,
        content_id: params.contentId,
        content_type_id: params.contentTypeId,
      },
    });
    return response.data;
  },
};
