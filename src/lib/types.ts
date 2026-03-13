// ==============================
// 이 파일은 백엔드(Spring Boot) Response DTO를 그대로 미러링합니다.
// 변경 시 반드시 해당 Java DTO를 참조하세요.
// ==============================

// === CommonResponse (global/response/CommonResponse.java) ===
export interface CommonResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T;
}

// === Spring Page<T> ===
export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;       // 현재 페이지 (0-indexed)
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// === Auth ===
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface TokenRefreshResponse {
  accessToken: string;
}

// === FacilityResponse (facility/application/dto/FacilityResponse.java) ===
export interface FacilityResponse {
  id: string;
  name: string;
  category: string;
  description: string | null;
  placeId: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  metadata: Record<string, unknown> | null;
  specialties: string[] | null;
}

// === FacilityCreateRequest ===
export interface FacilityCreateRequest {
  name: string;
  category: string;
  description?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  metadata?: Record<string, unknown>;
}

// === FacilityUpdateRequest ===
export interface FacilityUpdateRequest {
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

// === ResourceItemResponse (facility/application/dto/ResourceItemResponse.java) ===
export interface ResourceItemResponse {
  id: string;
  facilityId: string;
  name: string;
  resourceType: string;
  limitCapacity: number;
  floor: number | null;
  location: string | null;
  estimatedWaitMinutes: number | null;
  customAttributes: Record<string, unknown> | null;
}

// === ResourceItemCreateRequest ===
export interface ResourceItemCreateRequest {
  facilityId: string;
  name: string;
  resourceType: string;
  limitCapacity: number;
  floor?: number;
  location?: string;
  customAttributes?: Record<string, unknown>;
}

// === ReservationResponse (reservation/application/dto/ReservationResponse.java) ===
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';

export interface ReservationResponse {
  id: number;
  memberId: number;
  resourceItemId: string;
  facilityId: string;
  seatLabel?: string | null;
  startTime: string;   // LocalDateTime → ISO string "2026-03-10T10:00:00"
  endTime: string;
  status: ReservationStatus;
  createdAt: string;
}

// === ReservationCreateRequest ===
export interface ReservationCreateRequest {
  resourceItemId: string;
  facilityId: string;
  seatLabel?: string;
  startTime: string;
  endTime: string;
}

// === ReservationRescheduleRequest ===
export interface ReservationRescheduleRequest {
  newStartTime: string; // ISO local datetime e.g. 2026-03-10T10:00:00
  newEndTime: string;
}

// === WaitingInfoResponse (reservation/application/dto/WaitingInfoResponse.java) ===
export interface WaitingInfoResponse {
  reservationId: number;
  queuePosition: number;
  estimatedWaitMinutes: number | null;
  totalActiveReservations: number;
}

// === PaymentResponse (payment/application/dto/PaymentResponse.java) ===
export type PaymentStatus = 'READY' | 'APPROVED' | 'CANCELLED' | 'FAILED' | 'REFUNDED';
export type PaymentProvider = 'KAKAO_PAY' | 'TOSS_PAY';

export interface PaymentResponse {
  id: number;
  reservationId: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;          // BigDecimal → number (JSON)
  transactionId: string | null;
  createdAt: string;
  approvedAt: string | null;
}

// === PaymentReadyRequest ===
export interface PaymentReadyRequest {
  reservationId: number;
  provider: PaymentProvider;
  amount: number;
}

// === PaymentApproveRequest ===
export interface PaymentApproveRequest {
  paymentId: number;
  pgToken: string;
}

// === PlaceSearchResult (facility/application/dto/PlaceSearchResult.java) ===
export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  provider?: string | null;
  sourceFacilityId?: string | null;
  matchType?: 'INTERNAL' | 'ADDRESS' | 'PLACE' | null;
}

export interface MarkerStyle {
  color?: string;
  icon?: string;
  label?: string;
}

export interface MapHit {
  id: string;
  title: string;
  address: string;
  lat: number;
  lng: number;
  provider: 'google' | 'kakao' | 'internal';
  facilityId?: string | null;
  markerStyle?: MarkerStyle | null;
}

// === Search Documents (search/infrastructure/document/) ===
export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface ResourceItemSearchDocument {
  id: string;
  facilityId: string;
  name: string;
  resourceType: string;
  limitCapacity: number;
  floor: number | null;
  location: string | null;
}

export interface FacilitySearchDocument {
  id: string;
  name: string;
  category: string;
  address: string | null;
  placeId: string | null;
  location: GeoPoint | null;
}

// === Public Availability ===
export interface TimeSlot {
    startTime: string; // "HH:mm"
    endTime: string;
    available: boolean;
}

export interface AvailabilityResponse {
    resourceItemId: string;
    date: string; // "YYYY-MM-DD"
    slots: TimeSlot[];
}

// === Email Template (admin) ===
export interface EmailTemplateResponse {
    id: number;
    name: string;
    subject: string;
    body: string;
    variables: string[];
    createdAt: string;
    updatedAt: string;
}

export interface EmailTemplateCreateRequest {
    name: string;
    subject: string;
    body: string;
    variables: string[];
}

export interface ScheduledEmailRequest {
    templateId: number;
    recipientEmail: string;
    scheduledAt: string; // ISO datetime
    variables: Record<string, string>;
}

export interface ScheduledEmailResponse {
    id: number;
    templateId: number;
    templateName: string;
    recipientEmail: string;
    scheduledAt: string;
    status: 'PENDING' | 'SENT' | 'FAILED';
    errorMessage: string | null;
}

// === Hospital Search (search/application/dto/HospitalSearchResult.java) ===
export interface OperatingHourEntry {
  open: string;   // "HH:mm"
  close: string;
}

export interface HospitalSearchResult {
  facilityId: string | null;
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  specialties: string[];
  openNow: boolean | null;   // null = 운영시간 미등록
  operatingHours: Record<string, OperatingHourEntry | null> | null;
  source: 'INTERNAL' | 'KAKAO';
  rank: number;
}

// === Ops Analytics ===
export interface OpsSummaryResponse {
  reservationsTotal: number;
  confirmedTotal: number;
  cancelledTotal: number;
  expiredTotal: number;
  paymentsApprovedAmount: number;
  paymentsCancelledAmount: number;
}

export interface OpsTimeseriesPoint {
  date: string;
  reservationsTotal: number;
  confirmedTotal: number;
  cancelledTotal: number;
  approvedAmount: number;
}

export interface OpsAnomalyResponse {
  alerts: string[];
}
