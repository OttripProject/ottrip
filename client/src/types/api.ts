// 공통 응답 타입
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

// 계획 (Plan) 관련 타입
export interface Plan {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePlanRequest {
  title: string;
  start_date: string;
  end_date: string;
}

// 일정 (Itinerary) 관련 타입
export interface Itinerary {
  id: number;
  title: string;
  content?: string;
  country?: string;
  city?: string;
  location?: string;
  itinerary_date: string;
  start_time: string;
  end_time: string;
  color: string;
  plan_id: number;
  created_at: string;
  updated_at: string;
}

export interface CreateItineraryRequest {
  title: string;
  content?: string;
  country?: string;
  city?: string;
  location?: string;
  itinerary_date: string;
  start_time: string;
  end_time: string;
  color?: string;
  plan_id: number;
}

// 항공 (Flight) 관련 타입
export interface Flight {
  id: number;
  airline: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  seat_class?: string;
  seat_number?: string;
  duration?: string;
  memo?: string;
  plan_id: number;
  created_at: string;
  updated_at: string;
}

export interface CreateFlightRequest {
  airline: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  seat_class?: string;
  seat_number?: string;
  duration?: string;
  memo?: string;
  plan_id: number;
}

// 숙박 (Accommodation) 관련 타입
export interface Accommodation {
  id: number;
  name: string;
  address?: string;
  start_date: string;
  end_date: string;
  memo?: string;
  plan_id: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAccommodationRequest {
  name: string;
  address?: string;
  start_date: string;
  end_date: string;
  memo?: string;
  plan_id: number;
}

// 지출 (Expense) 관련 타입
export enum ExpenseCategory {
  FOOD = "food",
  TRANSPORT = "transport",
  FLIGHT = "flight",
  ACTIVITY = "activity",
  ACCOMMODATION = "accommodation",
  SHOPPING = "shopping",
  ETC = "etc",
}

export interface Expense {
  id: number;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  ex_date: string;
  plan_id: number;
  itinerary_id?: number;
  flight_id?: number;
  accommodation_id?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseRequest {
  category: ExpenseCategory;
  amount: number;
  description?: string;
  ex_date: string;
  plan_id: number;
  itinerary_id?: number;
  flight_id?: number;
  accommodation_id?: number;
} 