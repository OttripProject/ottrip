// 공통 응답 타입
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

// 계획 (Plan) 관련 타입
export interface TravelChecklistItem {
  id: number;
  name: string;
  reason: string;
  is_checked: boolean;
  is_custom: boolean;
  date?: string;
}

export interface Plan {
  id: number;
  publicId: string;
  title: string;
  startDate: string;
  endDate: string;
  memo?: string;
  myRole?: 'owner' | 'editor' | 'viewer';
  createdAt: string;
  updatedAt: string;
  travel_checklist?: {
    categories?: Record<string, TravelChecklistItem[]>;
  } | null;
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
  expenses?: Expense[] | null;
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
// 신규 다구간 Flight 스키마
export interface FlightSegmentBaseDto {
  airline?: string | null;
  flightNumber?: string | null;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;   
  seatClass?: string | null;
  seatNumber?: string | null;
  gate?: string | null;
  terminal?: string | null;
}

export interface FlightSegmentReadDto extends FlightSegmentBaseDto {
  id: number;
  order: number;
}

export interface FlightCreateRequest {
  planId: number;
  reservationNumber?: string | null;
  passengerName?: string | null;
  ticketNumber?: string | null;
  bookingReference?: string | null;
  segments: FlightSegmentBaseDto[]; 
  expense?: {
    exDate?: string; // 서버에서 첫 출발일을 기본 사용
    amount: number;
    currency: ExpenseCurrency;
    description?: string;
  };
}

export interface FlightUpdateRequest {
  reservationNumber?: string;
  passengerName?: string;
  ticketNumber?: string;
  bookingReference?: string;
  segments?: FlightSegmentBaseDto[]; // 주어지면 replace-all
  expense?: {
    exDate?: string;
    amount?: number;
    currency?: ExpenseCurrency;
    description?: string;
  };
}

export interface FlightRead {
  id: number;
  planId: number;
  reservationNumber?: string | null;
  passengerName?: string | null;
  ticketNumber?: string | null;
  bookingReference?: string | null;
  expense?: Expense;
  flightSegments?: FlightSegmentReadDto[]; // to_camel 직렬화
}

// 숙박 (Accommodation) 관련 타입
export interface Accommodation {
  id: number;
  name: string;
  place?: string;
  country?: string;
  city?: string;
  checkinDate: string;
  checkoutDate: string;
  checkinTime: string;
  checkoutTime: string;
  description?: string;
  planId: number;
  createdAt: string;
  updatedAt: string;
  expense?: Expense | null;
}

export interface CreateAccommodationRequest {
  name: string;
  place?: string;
  country?: string;
  city?: string;
  checkinDate: string;
  checkoutDate: string;
  checkinTime: string;
  checkoutTime: string;
  description?: string;
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
  place?: string;
  country?: string;
  city?: string;
  checkinDate?: string;
  checkoutDate?: string;
  checkinTime?: string;
  checkoutTime?: string;
  description?: string;
  expense?: {
    exDate?: string;
    amount?: number;
    category?: ExpenseCategory;
    currency?: ExpenseCurrency;
    description?: string;
  };
}

// 비용 (Expense) 관련 타입
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

export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
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

export const PLAN_ENTITY_KIND = {
  ITINERARY: "itinerary",
  FLIGHT: "flight",
  ACCOMMODATION: "accommodation",
  EXPENSE: "expense",
} as const;

export type PlanEntityKind =
  (typeof PLAN_ENTITY_KIND)[keyof typeof PLAN_ENTITY_KIND];

export type AttachmentEntityType = PlanEntityKind;
export type AiDocumentItemType = PlanEntityKind;

export interface Attachment {
  id: number;
  entityType: AttachmentEntityType;
  entityId: number;
  fileName: string;
  fileUrl: string;
  contentType: string;
  fileSize: number;
  planId: number;
  uploadedBy: number;
  createdAt: string;
}

export interface PresignedUploadRequest {
  planId: number;
  entityType: AttachmentEntityType;
  entityId: number;
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
  expiresIn: number;
}

export interface AttachmentConfirmRequest {
  planId: number;
  entityType: AttachmentEntityType;
  entityId: number;
  fileKey: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  publicUrl: string;
}

export interface LocalFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface AiDocumentFieldMetaEntry {
  certainty: "high" | "medium" | "low";
  editable: boolean;
}

export type AiDraftValues<T> = Partial<T> & Record<string, unknown>;

export type AiFlightDraftValues = Omit<FlightCreateRequest, "planId">;
export type AiItineraryDraftValues = Omit<CreateItineraryRequest, "planId">;
export type AiAccommodationDraftValues = Omit<
  CreateAccommodationRequest,
  "planId"
>;
export type AiExpenseDraftValues = Omit<CreateExpenseRequest, "planId">;

export interface AiDocumentDraftPayloadFlight {
  values: AiDraftValues<AiFlightDraftValues>;
  fieldMeta: Record<string, AiDocumentFieldMetaEntry>;
}

export interface AiDocumentDraftPayloadItinerary {
  values: AiDraftValues<AiItineraryDraftValues>;
  fieldMeta: Record<string, AiDocumentFieldMetaEntry>;
}

export interface AiDocumentDraftPayloadAccommodation {
  values: AiDraftValues<AiAccommodationDraftValues>;
  fieldMeta: Record<string, AiDocumentFieldMetaEntry>;
}

export interface AiDocumentDraftPayloadExpense {
  values: AiDraftValues<AiExpenseDraftValues>;
  fieldMeta: Record<string, AiDocumentFieldMetaEntry>;
}

export type AiDocumentItemDraft =
  | { itemType: "flight"; payload: AiDocumentDraftPayloadFlight }
  | { itemType: "itinerary"; payload: AiDocumentDraftPayloadItinerary }
  | { itemType: "accommodation"; payload: AiDocumentDraftPayloadAccommodation }
  | { itemType: "expense"; payload: AiDocumentDraftPayloadExpense };

export interface DocumentUploadAnalyzeResponse {
  success: boolean;
  inferredItemType: AiDocumentItemType | null;
  draft: AiDocumentItemDraft | null;
  error: string | null;
}