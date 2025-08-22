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
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanRequest {
  title: string;
  startDate: string;
  endDate: string;
}

export interface UpdatePlanRequest {
  title?: string;
  startDate?: string;
  endDate?: string;
}

// 일정 (Itinerary) 관련 타입
export interface Itinerary {
  id: number;
  title: string;
  description?: string;
  country?: string;
  city?: string;
  location?: string;
  itineraryDate: string;
  startTime: string;
  endTime: string;
  planId: number;
}

export interface CreateItineraryRequest {
  title: string;
  description?: string;
  country?: string;
  city?: string;
  location?: string;
  itineraryDate: string;
  startTime: string;
  endTime: string;
  planId: number;
}

export interface UpdateItineraryRequest {
  title?: string;
  description?: string;
  country?: string;
  city?: string;
  location?: string;
  itineraryDate?: string;
  startTime?: string;
  endTime?: string;
}

// 항공 (Flight) 관련 타입
export interface Flight {
  id: number;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  seatClass?: string;
  seatNumber?: string;
  duration?: string;
  memo?: string;
  planId: number;
}

// 항공 생성·수정 시에만 사용하는 경비 입력 타입 (서버 FlightCreate.expense 는 ExpenseBase 스키마를 따름)
export interface FlightExpenseInput {
  exDate: string;
  amount: number;
  category: ExpenseCategory;
  currency: ExpenseCurrency;
  description?: string;
}

export interface CreateFlightRequest {
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  seatClass?: string;
  seatNumber?: string;
  duration?: string;
  memo?: string;
  planId: number;
  expense: FlightExpenseInput;
}

export interface UpdateFlightRequest {
  airline?: string;
  flightNumber?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTime?: string;
  arrivalTime?: string;
  seatClass?: string;
  seatNumber?: string;
  duration?: string;
  memo?: string;
  expense?: Partial<FlightExpenseInput>;
}

// 숙박 (Accommodation) 관련 타입
export interface Accommodation {
  id: number;
  name: string;
  address?: string;
  startDate: string;
  endDate: string;
  memo?: string;
  planId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccommodationRequest {
  name: string;
  address?: string;
  startDate: string;
  endDate: string;
  memo?: string;
  planId: number;
  expense: {
    exDate: string;
    amount: number;
    category: ExpenseCategory;
    currency: ExpenseCurrency;
    description?: string;
  };
}

export interface UpdateAccommodationRequest {
  name?: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  memo?: string;
  expense?: {
    exDate?: string;
    amount?: number;
    category?: ExpenseCategory;
    currency?: ExpenseCurrency;
    description?: string;
  };
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

export enum ExpenseCurrency {
  KRW = "KRW",
  USD = "USD",
  EUR = "EUR",
  JPY = "JPY",
  CNY = "CNY",
  GBP = "GBP",
  AUD = "AUD",
}

export interface Expense {
  id: number;
  category: ExpenseCategory;
  amount: number;
  currency: ExpenseCurrency;
  description?: string;
  exDate: string;
  planId: number;
  itineraryId?: number;
  flightId?: number;
  accommodationId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseRequest {
  category: ExpenseCategory;
  amount: number;
  currency: ExpenseCurrency;
  description?: string;
  exDate: string;
  planId: number;
  itineraryId?: number;
  flightId?: number;
  accommodationId?: number;
}

export interface UpdateExpenseRequest {
  category?: ExpenseCategory;
  amount?: number;
  currency?: ExpenseCurrency;
  description?: string;
  exDate?: string;
  itineraryId?: number;
  flightId?: number;
  accommodationId?: number;
} 