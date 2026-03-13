# MariBean Client — 페이지 & API 연결 레퍼런스

> 백엔드: `http://localhost:8080`
> API 클라이언트: `src/lib/api.ts` (axios, JWT 자동 첨부, 401 자동 갱신)

---

## 인증 흐름

```
OAuth2 로그인 (Google/Kakao)
  └─ 백엔드 성공 핸들러 → 프론트 /auth/callback?accessToken=...&refreshToken=...
      └─ authStore.login() → localStorage 저장 + Zustand 상태 업데이트
          └─ api.ts 인터셉터 → 모든 요청에 Authorization: Bearer {accessToken}

토큰 만료 시:
  └─ 401 응답 수신
      └─ POST /api/v1/auth/refresh?refreshToken={token}
          ├─ 성공 → 새 accessToken 저장, 원래 요청 재시도
          └─ 실패 → 로컬 토큰 삭제 → /login 리다이렉트

로그아웃:
  └─ authStore.logout()
      ├─ POST /api/v1/auth/logout (서버 Redis 토큰 삭제, fire-and-forget)
      └─ localStorage 클리어 + Zustand 상태 초기화
```

---

## 공개 경로 (인증 불필요)

`ClientLayout.tsx`에서 관리:

```
/book/**
/booking-confirmation/**
/login
/auth/**
```

---

## 페이지 → API 매핑

### `/` (랜딩)
- 역할: `/book`으로 즉시 리다이렉트

---

### `/login`
- 역할: Google/Kakao OAuth 로그인 진입점
- API 없음 (백엔드 OAuth2 엔드포인트로 redirect)
  - Google: `{API_URL}/oauth2/authorization/google`
  - Kakao: `{API_URL}/oauth2/authorization/kakao`

---

### `/auth/callback`
- 역할: OAuth 완료 후 토큰 수신
- URL 파라미터: `?accessToken=...&refreshToken=...`
- 처리: `authStore.login()` 호출 후 `/book` 리다이렉트

---

### `/book` *(공개)*
훅: `useFacilities`, `useHospitalSearch`, `usePlacesSearch`, `useGeolocation`

| API | 훅 | 조건 |
|-----|-----|------|
| `GET /api/v1/facilities?category=&page=&size=` | `useFacilities` | 일반 모드 |
| `GET /api/v1/search/hospitals/nearby` | `useHospitalSearch` | HOSPITAL 카테고리 선택 시 |
| `GET /api/v1/facilities/places/search?query=` | `usePlacesSearch` | 병원 검색창 자동완성 |

**병원 검색 우선순위:** `query(자연어)` > `symptom(증상ID)` > `specialties(진료과 코드)`

---

### `/book/[facilityId]` *(공개)*
훅: `useFacility`, `useResourcesByFacility`

| API | 훅 |
|-----|----|
| `GET /api/v1/facilities/{facilityId}` | `useFacility` |
| `GET /api/v1/resources/facility/{facilityId}?page=&size=` | `useResourcesByFacility` |

---

### `/book/[facilityId]/[resourceId]` *(공개, 3단계 예약)*
훅: `useFacility`, `useResource`, `useAvailability`, `useCreateReservation`

| API | 훅 | 설명 |
|-----|----|------|
| `GET /api/v1/facilities/{facilityId}` | `useFacility` | 시설 정보 |
| `GET /api/v1/resources/{resourceId}` | `useResource` | 리소스 정보 |
| `GET /api/v1/public/reservations/availability?resourceItemId=&date=` | `useAvailability` | 시간슬롯 조회 |
| `POST /api/v1/reservations` | `useCreateReservation` | 예약 생성 |

**예약 생성 요청:**
```typescript
{
  resourceItemId: string,
  facilityId: string,
  startTime: string,  // ISO: "2026-03-15T10:00:00"
  endTime: string,
  seatLabel?: string
}
```

---

### `/booking-confirmation/[reservationId]` *(공개)*
훅: `useReservation`, `useFacility`, `useResource`

| API | 훅 |
|-----|----|
| `GET /api/v1/reservations/{reservationId}` | `useReservation` |
| `GET /api/v1/facilities/{facilityId}` | `useFacility` |
| `GET /api/v1/resources/{resourceId}` | `useResource` |

---

### `/my-reservations`
훅: `useAllReservations`, `useCancelReservation`

| API | 훅 |
|-----|----|
| `GET /api/v1/reservations?page=&size=` | `useAllReservations` |
| `POST /api/v1/reservations/{id}/cancel` | `useCancelReservation` |

---

### `/reservations`
훅: `useAllReservations`, `useFacilities`, `useCancelReservation`, `useCallNext`

| API | 훅 |
|-----|----|
| `GET /api/v1/reservations?page=&size=` | `useAllReservations` |
| `POST /api/v1/reservations/{id}/cancel` | `useCancelReservation` |
| `POST /api/v1/reservations/resource/{resourceItemId}/call-next` | `useCallNext` |

---

### `/reservations/[id]`
훅: `useReservation`, `usePaymentByReservation`, `useConfirmReservation`, `useRescheduleReservation`, `useWaitingInfo`, `useCancelReservation`, `useReadyPayment`, `useApprovePayment`

| API | 훅 |
|-----|----|
| `GET /api/v1/reservations/{id}` | `useReservation` |
| `GET /api/v1/payments/reservation/{reservationId}` | `usePaymentByReservation` |
| `GET /api/v1/reservations/{id}/waiting` | `useWaitingInfo` (30초 polling) |
| `POST /api/v1/reservations/{id}/confirm` | `useConfirmReservation` |
| `POST /api/v1/reservations/{id}/reschedule` | `useRescheduleReservation` |
| `POST /api/v1/reservations/{id}/cancel` | `useCancelReservation` |
| `POST /api/v1/payments/ready` | `useReadyPayment` |
| `POST /api/v1/payments/approve` | `useApprovePayment` |

---

### `/facilities`
훅: `useFacilities`

| API | 훅 |
|-----|----|
| `GET /api/v1/facilities?category=&page=&size=` | `useFacilities` |

---

### `/facilities/register`
훅: `usePlacesSearch`, `useCreateFacility`

| API | 훅 |
|-----|----|
| `GET /api/v1/facilities/places/search?query=` | `usePlacesSearch` (자동완성) |
| `POST /api/v1/facilities` | `useCreateFacility` |

**시설 등록 요청:**
```typescript
{
  name: string,
  category: 'HOSPITAL' | 'OFFICE' | 'COMMUNITY' | 'SPORTS' | 'LIBRARY' | 'OTHER',
  description?: string,
  placeId?: string,
  latitude?: number,
  longitude?: number,
  address?: string
}
```

---

### `/facilities/[id]`
훅: `useFacility`, `useResourcesByFacility`, `useCreateResource`

| API | 훅 |
|-----|----|
| `GET /api/v1/facilities/{id}` | `useFacility` |
| `GET /api/v1/resources/facility/{id}?page=&size=` | `useResourcesByFacility` |
| `POST /api/v1/resources` | `useCreateResource` |

> HOSPITAL 카테고리인 경우 "진료과·운영시간 설정" → `/facilities/[id]/medical` 링크 노출

---

### `/facilities/[id]/medical`
훅: `useFacility`, `useUpdateFacilityMedical`

| API | 훅 |
|-----|----|
| `GET /api/v1/facilities/{id}` | `useFacility` |
| `PATCH /api/v1/facilities/{id}/medical` | `useUpdateFacilityMedical` |

**요청:**
```typescript
{
  specialties: string[],  // HIRA 코드 배열 e.g. ["01", "13"]
  operatingHours: {
    MON?: { open: string; close: string } | null,
    TUE?: { open: string; close: string } | null,
    // ... WED, THU, FRI, SAT, SUN
  }
}
```

---

### `/map`
훅: `usePlacesSearch`, `useNearbyFacilities`, direct `api.get`

| API | 사용처 |
|-----|--------|
| `GET /api/v1/facilities/places/search?query=` | 검색창 자동완성 |
| `GET /api/v1/facilities/places/popular` | 인기 검색어 |
| `GET /api/v1/facilities/places/click` | 클릭 기록 |
| `GET /api/v1/search/facilities/nearby?lat=&lng=&radiusKm=` | 주변 시설 |
| `GET /api/v1/search/facilities/box?topLeftLat=...` | 지도 Bounding Box |

---

### `/admin/email/templates`
인라인 API 호출

| API | 동작 |
|-----|------|
| `GET /api/v1/admin/email/templates?page=&size=` | 목록 |
| `POST /api/v1/admin/email/templates` | 생성 |
| `PUT /api/v1/admin/email/templates/{id}` | 수정 |
| `DELETE /api/v1/admin/email/templates/{id}` | 삭제 |

---

### `/admin/email/send`
인라인 API 호출

| API | 동작 |
|-----|------|
| `GET /api/v1/admin/email/templates` | 템플릿 목록 로드 |
| `POST /api/v1/admin/email/send` | 즉시 발송 |
| `POST /api/v1/admin/email/schedule` | 예약 발송 |
| `GET /api/v1/admin/email/scheduled?status=` | 예약 발송 목록 |

---

## 훅 레퍼런스

### useFacilities.ts

| 훅 | 엔드포인트 | 반환 |
|----|-----------|------|
| `useFacilities(category?, page, size)` | `GET /api/v1/facilities` | `SpringPage<FacilityResponse>` |
| `useFacility(facilityId)` | `GET /api/v1/facilities/{id}` | `FacilityResponse` |
| `useCreateFacility()` | `POST /api/v1/facilities` | mutation |
| `useUpdateFacility()` | `PUT /api/v1/facilities/{id}` | mutation |
| `useDeleteFacility()` | `DELETE /api/v1/facilities/{id}` | mutation |
| `useUpdateFacilityMedical()` | `PATCH /api/v1/facilities/{id}/medical` | mutation |

### useResources.ts (useResourcesByFacility, useResource 등)

| 훅 | 엔드포인트 | 반환 |
|----|-----------|------|
| `useResourcesByFacility(facilityId, page, size)` | `GET /api/v1/resources/facility/{id}` | `SpringPage<ResourceItemResponse>` |
| `useResource(resourceId)` | `GET /api/v1/resources/{id}` | `ResourceItemResponse` |
| `useCreateResource()` | `POST /api/v1/resources` | mutation |

### useReservations.ts

| 훅 | 엔드포인트 | 반환 |
|----|-----------|------|
| `useAllReservations(page, size)` | `GET /api/v1/reservations` | `SpringPage<ReservationResponse>` |
| `useReservation(reservationId)` | `GET /api/v1/reservations/{id}` | `ReservationResponse` |
| `useCreateReservation()` | `POST /api/v1/reservations` | mutation |
| `useCancelReservation()` | `POST /api/v1/reservations/{id}/cancel` | mutation |
| `useConfirmReservation()` | `POST /api/v1/reservations/{id}/confirm` | mutation |
| `useRescheduleReservation()` | `POST /api/v1/reservations/{id}/reschedule` | mutation |
| `useWaitingInfo(reservationId)` | `GET /api/v1/reservations/{id}/waiting` | `WaitingInfoResponse` (30s refetch) |
| `useCallNext(resourceItemId)` | `POST /api/v1/reservations/resource/{id}/call-next` | mutation |

### useSearch.ts

| 훅 | 엔드포인트 | 반환 |
|----|-----------|------|
| `usePlacesSearch(query, debounceMs)` | `GET /api/v1/facilities/places/search` | `PlaceSearchResult[]` |
| `usePlaceDetails(placeId)` | `GET /api/v1/facilities/places/{placeId}` | `PlaceSearchResult` |
| `useResourceSearch(keyword, page, size)` | `GET /api/v1/search/resources` | `SpringPage<ResourceItemSearchDocument>` |
| `useNearbyFacilities(lat, lng, radiusKm)` | `GET /api/v1/search/facilities/nearby` | `SpringPage<FacilitySearchDocument>` |
| `useHospitalSearch(lat, lng, params, page, size)` | `GET /api/v1/search/hospitals/nearby` | `SpringPage<HospitalSearchResult>` |
| `useHiraSpecialties()` | `GET /api/v1/search/hospitals/specialties` | `{code, name}[]` (staleTime: ∞) |

### useAvailability.ts

| 훅 | 엔드포인트 | 반환 |
|----|-----------|------|
| `useAvailability(resourceItemId, date)` | `GET /api/v1/public/reservations/availability` | `AvailabilityResponse` |

### usePayments.ts

| 훅 | 엔드포인트 | 반환 |
|----|-----------|------|
| `usePayment(paymentId)` | `GET /api/v1/payments/{id}` | `PaymentResponse` |
| `usePaymentByReservation(reservationId)` | `GET /api/v1/payments/reservation/{id}` | `PaymentResponse` |
| `useReadyPayment()` | `POST /api/v1/payments/ready` | mutation |
| `useApprovePayment()` | `POST /api/v1/payments/approve` | mutation |
| `useCancelPayment()` | `POST /api/v1/payments/{id}/cancel` | mutation |

### useGeolocation.ts

```typescript
const { lat, lng, loading, error, permissionDenied, request } = useGeolocation(autoRequest?)
```
- `autoRequest=true`: 마운트 시 자동으로 위치 요청
- `request()`: 수동 위치 요청
- timeout: 8000ms, maximumAge: 60s

---

## 주요 타입

```typescript
// FacilityResponse
{
  id: string;
  name: string;
  category: 'HOSPITAL' | 'OFFICE' | 'COMMUNITY' | 'SPORTS' | 'LIBRARY' | 'OTHER';
  description: string | null;
  placeId: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  metadata: Record<string, unknown> | null;
  specialties: string[] | null;
}

// HospitalSearchResult
{
  facilityId: string | null;   // null = 외부(Kakao) 병원
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  specialties: string[];
  openNow: boolean | null;     // null = 운영시간 미등록
  operatingHours: Record<string, { open: string; close: string } | null> | null;
  source: 'INTERNAL' | 'KAKAO';
  rank: number;
}

// PlaceSearchResult
{
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  provider?: string;           // 'KAKAO' | 'GOOGLE' | 'INTERNAL'
  sourceFacilityId?: string;
  matchType?: 'INTERNAL' | 'ADDRESS' | 'PLACE';
}

// ReservationResponse
{
  id: number;
  memberId: number;
  resourceItemId: string;
  facilityId: string;
  seatLabel: string | null;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
}

// SpringPage<T>
{
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
```

---

## 환경 변수 (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_KAKAO_MAP_KEY=<Kakao Maps JS SDK 키>
NEXT_PUBLIC_KAKAO_REST_API_KEY=<Kakao REST API 키 (선택)>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<Google Maps JS API 키 (선택)>
```

> `NEXT_PUBLIC_KAKAO_MAP_KEY` 하나만 있어도 지도·병원 검색 동작
> Google Maps 키 없으면 Google 지도 전환·Geocoder fallback 비활성화
