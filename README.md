# MariBean Client

Next.js 기반 공간·의료 예약 플랫폼 프론트엔드입니다.
Google/Kakao OAuth2 인증, 병원 지능형 검색(증상·진료과·자연어), 지도 통합, AI 챗봇 위젯을 포함합니다.

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| UI | React 19 + Tailwind CSS 4 |
| 상태 관리 | Zustand (Auth) + TanStack Query v5 (서버 상태) |
| 지도 | Kakao Maps JS SDK + Google Maps JS API |
| 아이콘 | react-icons (heroicons) |
| 폰트 | Pretendard (CDN) |

---

## 주요 기능

### 공간 예약
- 카테고리(병원·오피스·커뮤니티·스포츠·도서관)별 시설 목록 및 검색
- 3단계 예약 플로우: 날짜 선택 → 시간 선택 → 확인
- 예약 확인 페이지 및 내 예약 내역 조회

### 병원 고도화 검색
- **증상 선택**: 두통·발열·기침 등 12개 증상 → HIRA 진료과 코드 자동 변환
- **진료과 직접 선택**: HIRA 표준 20종 다중 선택 (내과·정형외과·산부인과 등)
- **자연어 쿼리**: "강남 정형외과", "근처 내과" 입력 → ES + Kakao Local 통합 검색
- **내 위치 기반**: `navigator.geolocation` 실시간 위치 → 반경 검색
- **영업중 필터**: 운영시간 메타데이터 기반 실시간 진료 여부 표시
- **외부 병원 통합**: Kakao Local HP8 카테고리 결과 합산 (미등록 병원도 노출)

### 지도
- Kakao Maps / Google Maps 전환 지원
- 지도 이동 → 화면 내 시설 자동 로드 (Bounding Box)
- 위치 검색 + 주소 자동완성 (Kakao Local + Google Geocoder fallback)
- 인기 키워드 / 최근 검색어

### AI 챗봇
- 모바일: 풀스크린 바텀시트 (88vh, `createPortal`)
- 데스크톱: 우하단 팝오버

### 어드민
- 시설 등록·수정·삭제
- **진료과·운영시간 관리**: HIRA 20종 진료과 칩 + 요일별 시간 설정
- 이메일 템플릿 CRUD + 즉시/예약 발송 (`/admin/email`)

---

## 페이지 구조

```
src/app/
├── page.tsx                      # 랜딩 (→ /book 리다이렉트)
├── layout.tsx                    # 루트 레이아웃
├── ClientLayout.tsx              # Auth 게이트 + 공개 경로 화이트리스트
├── book/
│   ├── page.tsx                  # 시설 목록 + 병원 검색 통합
│   ├── [facilityId]/page.tsx     # 리소스 목록
│   └── [facilityId]/[resourceId]/page.tsx  # 3단계 예약
├── booking-confirmation/
│   └── [reservationId]/page.tsx  # 예약 완료
├── my-reservations/page.tsx      # 내 예약 내역
├── facilities/
│   ├── page.tsx                  # 시설 관리 목록
│   ├── register/page.tsx         # 시설 등록
│   └── [id]/
│       ├── page.tsx              # 시설 상세·리소스 등록
│       └── medical/page.tsx      # 진료과·운영시간 설정 (병원 전용)
├── map/page.tsx                  # 지도 탐색
├── admin/
│   └── email/
│       ├── templates/page.tsx    # 이메일 템플릿 관리
│       └── send/page.tsx         # 이메일 발송
├── auth/callback/page.tsx        # OAuth2 콜백
└── login/page.tsx                # 로그인
```

---

## 핵심 훅

| 훅 | 설명 |
|----|------|
| `useGeolocation` | `navigator.geolocation` 래퍼, autoRequest 옵션, 권한 거부 감지 |
| `useHospitalSearch` | 병원 검색 — specialties / symptom / 자연어 query 지원 |
| `useHiraSpecialties` | HIRA 진료과 목록 (staleTime: Infinity) |
| `useFacilities` | 카테고리별 시설 목록 (전체 = 병렬 합산) |
| `useUpdateFacilityMedical` | `PATCH /facilities/{id}/medical` 뮤테이션 |
| `useNearbyFacilities` | ES geo_distance 기반 주변 시설 |
| `usePlacesSearch` | Kakao + Google fallback 주소 검색 |
| `useAvailability` | 공개 API 시간슬롯 조회 |
| `useDebounce` | 입력 디바운싱 |

---

## 컴포넌트

| 컴포넌트 | 설명 |
|----------|------|
| `HospitalSearchPanel` | 증상/진료과 모드 전환 패널 + 영업중 토글 |
| `HospitalCard` | 병원 카드 (INTERNAL 예약 CTA / KAKAO 외부 정보 구분) |
| `OpenNowBadge` | 진료중 🟢 / 진료종료 🔴 / 시간미등록 ⚪ |
| `SeatLayoutBuilder` | 그리드 좌석 배치도 빌더 |
| `AIChatWidget` | 모바일/데스크톱 반응형 AI 챗봇 |

---

## 정적 데이터

### HIRA 진료과 코드 (`src/lib/hiraSpecialties.ts`)
```
01-내과  02-신경과  03-정신건강의학과  04-외과  05-정형외과
06-신경외과  07-흉부외과  08-성형외과  10-산부인과  11-소아청소년과
12-안과  13-이비인후과  14-피부과  15-비뇨의학과  20-재활의학과
22-가정의학과  23-응급의학과  26-치과  27-한방내과  28-한방외과
```

### 증상 → 진료과 매핑
| 증상 | 코드 |
|------|------|
| 두통 | 02, 01 | 발열 | 01, 11 | 기침·가래 | 01, 13 |
| 복통 | 01 | 치통 | 26 | 피부 | 14 |
| 눈·귀·코 | 12, 13 | 관절·근육 | 05, 20 | 정신건강 | 03 |
| 여성건강 | 10 | 소아 | 11 | 가슴통증 | 23, 01 |

---

## 환경 변수 (`.env.local`)

```env
# 백엔드 API
NEXT_PUBLIC_API_URL=http://localhost:8080

# Kakao Maps JS SDK
NEXT_PUBLIC_KAKAO_MAP_KEY=

# Kakao Local REST API (프론트 직접 호출 시)
NEXT_PUBLIC_KAKAO_REST_API_KEY=

# Google Maps JS API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

> `NEXT_PUBLIC_KAKAO_MAP_KEY` 하나만 있어도 지도·병원 검색 동작합니다.
> Google Maps 키가 없으면 Google 지도 전환과 Geocoder fallback이 비활성화됩니다.

---

## 공개 경로 (인증 불필요)

`ClientLayout.tsx`에서 관리합니다.

```
/book/**
/booking-confirmation/**
/login
/auth/**
```

---

## 로컬 실행

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run lint
```

백엔드(`mariabean`)가 `localhost:8080`에서 실행 중이어야 합니다.
