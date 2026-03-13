'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  HiOutlineMagnifyingGlass, HiOutlineMapPin,
  HiOutlineChevronRight, HiOutlineBuildingOffice2, HiOutlineArrowPath,
} from 'react-icons/hi2';
import api from '@/lib/api';
import { useNearbyFacilities, usePlacesSearch } from '@/hooks/useSearch';
import { useToast } from '@/components/ui/Toast';
import type { CommonResponse, FacilityResponse, FacilitySearchDocument, MapHit, PlaceSearchResult, SpringPage } from '@/lib/types';
import { loadGoogleMapSdk } from '@/lib/loadGoogleMap';
import { loadKakaoMapSdk } from '@/lib/loadKakaoMap';
import { geocodeAddress } from '@/lib/geocoding';

type MapProvider = 'kakao' | 'google';
type MapScreenMode = 'explore' | 'console';

const categoryLabels: Record<string, string> = {
  HOSPITAL: '의료시설', OFFICE: '사무공간', COMMUNITY: '주민센터',
  SPORTS: '체육시설', LIBRARY: '도서관', OTHER: '기타',
};

const categoryColors: Record<string, { solid: string; badgeBg: string; badgeText: string }> = {
  HOSPITAL: { solid: '#EF4444', badgeBg: '#FEE2E2', badgeText: '#991B1B' },
  OFFICE: { solid: '#5E6AD2', badgeBg: '#F0F0FF', badgeText: '#4E5BBF' },
  COMMUNITY: { solid: '#22C55E', badgeBg: '#DCFCE7', badgeText: '#065F46' },
  SPORTS: { solid: '#EAB308', badgeBg: '#FEF3C7', badgeText: '#92400E' },
  LIBRARY: { solid: '#7C3AED', badgeBg: '#EDE9FE', badgeText: '#5B21B6' },
  OTHER: { solid: '#71717A', badgeBg: '#F4F4F5', badgeText: '#3F3F46' },
};

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };

function ProviderToggle({ provider, onChange, disabled }: { provider: MapProvider; onChange: (p: MapProvider) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: '#E4E4E7' }}>
      {(['kakao', 'google'] as const).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          disabled={disabled}
          className="px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all disabled:opacity-40"
          style={provider === p ? { background: '#fff', color: '#18181B' } : { color: '#71717A' }}
        >
          {p === 'kakao' ? 'Kakao' : 'Google'}
        </button>
      ))}
    </div>
  );
}

function MapDetailPanel({ hit, onClose }: { hit: MapHit | null; onClose: () => void }) {
  if (!hit) return null;
  const directionUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hit.lat},${hit.lng}`)}`;
  return (
    <>
      <div className="hidden lg:block w-80 rounded-lg p-4" style={{ borderBottom: '1px solid #EBEBED' }}>
        <p className="text-xs font-semibold" style={{ color: '#A1A1AA' }}>선택된 위치</p>
        <p className="mt-1 text-sm font-bold" style={{ color: '#18181B' }}>{hit.title}</p>
        <p className="mt-1 text-xs" style={{ color: '#71717A' }}>{hit.address}</p>
        <p className="mt-2 text-[11px] tabular-nums" style={{ color: '#A1A1AA' }}>{hit.lat.toFixed(6)}, {hit.lng.toFixed(6)}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={directionUrl} target="_blank" rel="noreferrer" className="btn-secondary text-center">길찾기</a>
          {hit.facilityId
            ? <Link href={`/facilities/${hit.facilityId}`} className="btn-primary text-center">시설 보기</Link>
            : <Link href={`/facilities/register?lat=${hit.lat}&lng=${hit.lng}&name=${encodeURIComponent(hit.title)}&address=${encodeURIComponent(hit.address)}`} className="btn-primary text-center">시설 등록</Link>}
        </div>
      </div>
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 p-3">
        <div className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #EBEBED', boxShadow: '0 -8px 24px rgba(0,0,0,0.1)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: '#18181B' }}>{hit.title}</p>
              <p className="text-xs mt-1 truncate" style={{ color: '#71717A' }}>{hit.address}</p>
            </div>
            <button onClick={onClose} className="text-xs" style={{ color: '#A1A1AA' }}>닫기</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href={directionUrl} target="_blank" rel="noreferrer" className="btn-secondary text-center">길찾기</a>
            {hit.facilityId
              ? <Link href={`/facilities/${hit.facilityId}`} className="btn-primary text-center">시설 보기</Link>
              : <Link href={`/facilities/register?lat=${hit.lat}&lng=${hit.lng}&name=${encodeURIComponent(hit.title)}&address=${encodeURIComponent(hit.address)}`} className="btn-primary text-center">시설 등록</Link>}
          </div>
        </div>
      </div>
    </>
  );
}

export default function MapPage() {
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const hasBoth = !!kakaoKey && !!googleKey;
  const hasAny = !!kakaoKey || !!googleKey;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<KakaoMap | null>(null);
  const googleMapRef = useRef<GoogleMap | null>(null);
  const markerCleanupsRef = useRef<(() => void)[]>([]);
  const idleTimerRef = useRef<number | null>(null);
  const latestBoundsRef = useRef<{ topLeftLat: number; topLeftLng: number; bottomRightLat: number; bottomRightLng: number } | null>(null);
  const activeAbortRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);
  const inflightRef = useRef<Map<string, Promise<FacilityResponse[]>>>(new Map());

  const [provider, setProvider] = useState<MapProvider>(kakaoKey ? 'kakao' : 'google');
  const [screenMode, setScreenMode] = useState<MapScreenMode>('explore');
  const [keyword, setKeyword] = useState('');
  const [recentKeywords, setRecentKeywords] = useState<string[]>([]);
  const [popularKeywords, setPopularKeywords] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<FacilityResponse[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [nearbyCoords, setNearbyCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [selectedHit, setSelectedHit] = useState<MapHit | null>(null);

  const toast = useToast();
  const { data: suggestions = [], isFetching: suggestionLoading } = usePlacesSearch(keyword);
  const { data: nearbyPage } = useNearbyFacilities(nearbyCoords?.lat ?? null, nearbyCoords?.lng ?? null, 2);

  const visibleSuggestions = useMemo(() => suggestions.slice(0, 8), [suggestions]);
  const addressSuggestions = useMemo(
    () => visibleSuggestions.filter((item) => item.matchType === 'ADDRESS'),
    [visibleSuggestions],
  );
  const placeSuggestions = useMemo(
    () => visibleSuggestions.filter((item) => item.matchType !== 'ADDRESS'),
    [visibleSuggestions],
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('map.recent.keywords');
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) setRecentKeywords(parsed.slice(0, 8));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    api.get<CommonResponse<string[]>>('/api/v1/facilities/places/popular?size=8')
      .then((res) => setPopularKeywords(res.data.data ?? []))
      .catch(() => setPopularKeywords([]));
  }, []);

  const clearMarkers = useCallback(() => {
    markerCleanupsRef.current.forEach((fn) => fn());
    markerCleanupsRef.current = [];
  }, []);

  const getBoundsRect = useCallback(() => {
    if (provider === 'kakao' && kakaoMapRef.current) {
      const bounds = kakaoMapRef.current.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      return { topLeftLat: ne.getLat(), topLeftLng: sw.getLng(), bottomRightLat: sw.getLat(), bottomRightLng: ne.getLng() };
    }
    if (provider === 'google' && googleMapRef.current) {
      const bounds = googleMapRef.current.getBounds();
      if (!bounds) return null;
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      return { topLeftLat: ne.lat(), topLeftLng: sw.lng(), bottomRightLat: sw.lat(), bottomRightLng: ne.lng() };
    }
    return null;
  }, [provider]);

  const displayMarkers = useCallback((items: FacilityResponse[]) => {
    clearMarkers();

    if (provider === 'kakao' && kakaoMapRef.current && window.kakao?.maps) {
      const map = kakaoMapRef.current;
      items.forEach((f) => {
        if (!f.latitude || !f.longitude) return;
        const position = new window.kakao.maps.LatLng(f.latitude, f.longitude);
        const marker = new window.kakao.maps.Marker({ position, map, title: f.name });
        const info = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:8px 10px;font-size:12px;min-width:150px"><strong>${f.name}</strong><br/><span>${categoryLabels[f.category] || f.category}</span></div>`,
        });
        window.kakao.maps.event.addListener(marker, 'click', () => {
          info.open(map, marker);
          setSelectedHit({
            id: f.id,
            title: f.name,
            address: f.address ?? '',
            lat: f.latitude!,
            lng: f.longitude!,
            provider: 'internal',
            facilityId: f.id,
          });
        });
        markerCleanupsRef.current.push(() => marker.setMap(null));
      });
      return;
    }

    if (provider === 'google' && googleMapRef.current) {
      const map = googleMapRef.current;
      items.forEach((f) => {
        if (!f.latitude || !f.longitude) return;
        const marker = new window.google.maps.Marker({
          position: { lat: f.latitude, lng: f.longitude },
          map,
          title: f.name,
        });
        const info = new window.google.maps.InfoWindow({
          content: `<div style="padding:8px 10px;font-size:12px;min-width:150px"><strong>${f.name}</strong><br/><span>${categoryLabels[f.category] || f.category}</span></div>`,
        });
        window.google.maps.event.addListener(marker, 'click', () => {
          info.open(map, marker);
          setSelectedHit({
            id: f.id,
            title: f.name,
            address: f.address ?? '',
            lat: f.latitude!,
            lng: f.longitude!,
            provider: 'internal',
            facilityId: f.id,
          });
        });
        markerCleanupsRef.current.push(() => marker.setMap(null));
      });
    }
  }, [provider, clearMarkers]);

  const fetchByBounds = useCallback(async (kw: string) => {
    const rect = getBoundsRect();
    if (!rect) return;
    latestBoundsRef.current = rect;
    const requestKey = `${provider}:${rect.topLeftLat.toFixed(4)}:${rect.topLeftLng.toFixed(4)}:${rect.bottomRightLat.toFixed(4)}:${rect.bottomRightLng.toFixed(4)}:${kw}`;
    requestSeqRef.current += 1;
    const currentSeq = requestSeqRef.current;
    setIsSearching(true);

    activeAbortRef.current?.abort();
    const controller = new AbortController();
    activeAbortRef.current = controller;

    const run = async () => {
      const { data } = await api.get<CommonResponse<SpringPage<FacilitySearchDocument>>>('/api/v1/search/facilities/box', {
        params: { ...rect, keyword: kw || undefined },
        signal: controller.signal,
      });
      return (data.data?.content ?? []).map((doc) => ({
        id: doc.id,
        name: doc.name,
        category: doc.category,
        address: doc.address ?? '',
        latitude: doc.location?.lat ?? 0,
        longitude: doc.location?.lon ?? 0,
        description: null,
        placeId: doc.placeId ?? null,
        metadata: null,
      })) as FacilityResponse[];
    };

    try {
      const promise = inflightRef.current.get(requestKey) ?? run();
      inflightRef.current.set(requestKey, promise);
      const items = await promise;
      if (currentSeq !== requestSeqRef.current) return;
      setFacilities(items);
      displayMarkers(items);
    } catch {
      // ignore cancellation race
    } finally {
      inflightRef.current.delete(requestKey);
      if (currentSeq === requestSeqRef.current) setIsSearching(false);
    }
  }, [displayMarkers, getBoundsRect, provider]);

  const centerMap = useCallback((lat: number, lng: number) => {
    if (provider === 'kakao' && kakaoMapRef.current && window.kakao?.maps) {
      kakaoMapRef.current.setCenter(new window.kakao.maps.LatLng(lat, lng));
      return;
    }
    if (provider === 'google' && googleMapRef.current) {
      googleMapRef.current.setCenter({ lat, lng });
    }
  }, [provider]);

  const initKakaoMap = useCallback(() => {
    if (!mapContainerRef.current || !kakaoKey) return;
    const center = new window.kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
    const map = new window.kakao.maps.Map(mapContainerRef.current, { center, level: 4 });
    kakaoMapRef.current = map;
    googleMapRef.current = null;
    setIsMapLoaded(true);

    window.kakao.maps.event.addListener(map, 'idle', () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => void fetchByBounds(''), 650);
    });

    window.kakao.maps.event.addListener(map, 'click', (...args: unknown[]) => {
      const e = args[0] as { latLng?: KakaoLatLng } | undefined;
      if (!e?.latLng) return;
      setSelectedHit({
        id: `kakao-${Date.now()}`,
        title: '선택한 위치',
        address: '',
        lat: e.latLng.getLat(),
        lng: e.latLng.getLng(),
        provider: 'kakao',
      });
    });
  }, [fetchByBounds, kakaoKey]);

  const initGoogleMap = useCallback(() => {
    if (!mapContainerRef.current || !googleKey) return;
    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    googleMapRef.current = map;
    kakaoMapRef.current = null;
    setIsMapLoaded(true);

    window.google.maps.event.addListener(map, 'idle', () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => void fetchByBounds(''), 650);
    });

    window.google.maps.event.addListener(map, 'click', (...args: unknown[]) => {
      const e = args[0] as { latLng?: { lat(): number; lng(): number } } | undefined;
      if (!e?.latLng) return;
      setSelectedHit({
        id: `google-${Date.now()}`,
        title: '선택한 위치',
        address: '',
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
        provider: 'google',
      });
    });
  }, [fetchByBounds, googleKey]);

  useEffect(() => {
    if (!hasAny || !mapContainerRef.current) return;
    clearMarkers();
    setIsMapLoaded(false);
    mapContainerRef.current.innerHTML = '';
    kakaoMapRef.current = null;
    googleMapRef.current = null;

    if (provider === 'kakao' && kakaoKey) {
      loadKakaoMapSdk(kakaoKey).then(initKakaoMap).catch(() => toast.error('Kakao 지도 SDK 로드 실패'));
      return;
    }
    if (provider === 'google' && googleKey) {
      loadGoogleMapSdk(googleKey).then(initGoogleMap).catch(() => toast.error('Google 지도 SDK 로드 실패'));
    }
  }, [provider, hasAny, kakaoKey, googleKey, clearMarkers, initKakaoMap, initGoogleMap, toast]);

  useEffect(() => {
    if (!nearbyPage?.content) return;
    const items = nearbyPage.content.map((doc) => ({
      id: String(doc.id),
      name: doc.name,
      category: doc.category,
      address: doc.address ?? '',
      latitude: doc.location?.lat ?? 0,
      longitude: doc.location?.lon ?? 0,
      description: null,
      placeId: doc.placeId ?? null,
      metadata: null,
    })) as FacilityResponse[];
    setFacilities(items);
    displayMarkers(items);
  }, [nearbyPage, displayMarkers]);

  useEffect(() => {
    return () => {
      activeAbortRef.current?.abort();
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, []);

  const selectSuggestion = useCallback(async (place: PlaceSearchResult) => {
    setKeyword(place.address || place.name);
    setShowSuggestion(false);
    setActiveSuggestionIndex(-1);
    const nextHit: MapHit = {
      id: place.placeId,
      title: place.name,
      address: place.address,
      lat: place.latitude,
      lng: place.longitude,
      provider: place.provider?.toLowerCase().includes('kakao') ? 'kakao' : 'google',
      facilityId: place.sourceFacilityId ?? null,
    };
    setSelectedHit(nextHit);
    centerMap(place.latitude, place.longitude);
    await fetchByBounds('');
    void api.get('/api/v1/facilities/places/click', {
      params: {
        query: keyword.trim() || place.address || place.name,
        queryType: place.matchType === 'ADDRESS' ? 'address_like' : 'place_like',
        matchType: place.matchType ?? 'PLACE',
      },
    }).catch(() => null);
  }, [centerMap, fetchByBounds, keyword]);

  const searchByQuery = useCallback(async (rawQuery: string) => {
    const q = rawQuery.trim();
    if (!q) {
      void fetchByBounds('');
      return;
    }
    setRecentKeywords((prev) => {
      const next = [q, ...prev.filter((v) => v !== q)].slice(0, 8);
      window.localStorage.setItem('map.recent.keywords', JSON.stringify(next));
      return next;
    });
    const guessed = suggestions.find((s) => s.name === q || s.address === q);
    if (guessed) {
      void selectSuggestion(guessed);
      return;
    }
    if (suggestions.length > 0) {
      void selectSuggestion(suggestions[0]);
      return;
    }
    const coords = await geocodeAddress(q);
    if (coords) {
      centerMap(coords.lat, coords.lng);
      setSelectedHit({
        id: `geocode-${Date.now()}`,
        title: q,
        address: q,
        lat: coords.lat,
        lng: coords.lng,
        provider,
      });
      void fetchByBounds('');
      return;
    }
    if (latestBoundsRef.current) {
      void fetchByBounds(q);
    }
  }, [centerMap, fetchByBounds, provider, selectSuggestion, suggestions]);

  const handleNearby = () => {
    if (!navigator.geolocation) {
      toast.error('이 브라우저는 위치 서비스를 지원하지 않습니다.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setNearbyCoords(c);
        centerMap(c.lat, c.lng);
        setSelectedHit({ id: `near-${Date.now()}`, title: '내 위치', address: '', lat: c.lat, lng: c.lng, provider });
        setGeoLoading(false);
      },
      () => {
        toast.error('위치 정보를 가져올 수 없습니다.');
        setGeoLoading(false);
      },
    );
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <h1 className="sr-only">지도 검색</h1>
      <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid #EBEBED' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.04)' }}>
            <HiOutlineMapPin className="w-4 h-4" style={{ color: '#52525B' }} />
          </div>
          <div className="text-[13px]" style={{ color: '#71717A' }}>
            결과 <span className="font-semibold tabular-nums" style={{ color: '#18181B' }}>{facilities.length}</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: '#F4F4F5' }}>
            <button onClick={() => setScreenMode('explore')} className="px-2 py-1 text-[11px] rounded-md font-semibold" style={screenMode === 'explore' ? { background: '#fff', color: '#18181B' } : { color: '#71717A' }}>탐색</button>
            <button onClick={() => setScreenMode('console')} className="px-2 py-1 text-[11px] rounded-md font-semibold" style={screenMode === 'console' ? { background: '#fff', color: '#18181B' } : { color: '#71717A' }}>운영</button>
          </div>
        </div>
        {hasBoth && <ProviderToggle provider={provider} onChange={setProvider} />}
      </div>

      {screenMode === 'console' && (
        <div className="rounded-lg p-3 flex flex-wrap items-center gap-2" style={{ borderBottom: '1px solid #EBEBED' }}>
          <span className="text-xs font-semibold mr-1" style={{ color: '#71717A' }}>운영 바로가기</span>
          <Link href="/facilities/register" className="btn-secondary text-xs">시설 등록</Link>
          <Link href="/facilities" className="btn-secondary text-xs">시설 목록</Link>
          <Link href="/reservations" className="btn-secondary text-xs">예약 관리</Link>
        </div>
      )}

      {screenMode === 'explore' && recentKeywords.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold" style={{ color: '#A1A1AA' }}>최근 검색</span>
          {recentKeywords.map((k) => (
            <button key={k} onClick={() => { setKeyword(k); void searchByQuery(k); }} className="px-2 py-1 rounded-full text-[11px]" style={{ background: '#F4F4F5', color: '#52525B' }}>{k}</button>
          ))}
        </div>
      )}
      {screenMode === 'explore' && popularKeywords.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold" style={{ color: '#A1A1AA' }}>인기 키워드</span>
          {popularKeywords.map((k) => (
            <button key={`popular-${k}`} onClick={() => { setKeyword(k); void searchByQuery(k); }} className="px-2 py-1 rounded-full text-[11px]" style={{ background: '#EEF2FF', color: '#4F46E5' }}>{k}</button>
          ))}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:overflow-hidden">
        <div className="flex-1 rounded-lg overflow-hidden flex flex-col relative" style={{ borderBottom: '1px solid #EBEBED', height: '55vh', minHeight: '320px' }}>
          <div className="flex gap-2 p-3 items-center z-10" style={{ borderBottom: '1px solid #EBEBED', background: 'rgba(255,255,255,0.95)' }}>
            <div className="relative flex-1">
              <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#A1A1AA' }} />
              <input
                type="text"
                placeholder="장소, 시설명으로 검색..."
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setShowSuggestion(true);
                  setActiveSuggestionIndex(-1);
                }}
                onKeyDown={(e) => {
                  if (!showSuggestion || visibleSuggestions.length === 0) {
                    if (e.key === 'Enter') void searchByQuery(keyword);
                    return;
                  }
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveSuggestionIndex((prev) => (prev + 1) % visibleSuggestions.length);
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveSuggestionIndex((prev) => (prev <= 0 ? visibleSuggestions.length - 1 : prev - 1));
                    return;
                  }
                  if (e.key === 'Escape') {
                    setShowSuggestion(false);
                    setActiveSuggestionIndex(-1);
                    return;
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (activeSuggestionIndex >= 0 && visibleSuggestions[activeSuggestionIndex]) {
                      void selectSuggestion(visibleSuggestions[activeSuggestionIndex]);
                    } else {
                      void searchByQuery(keyword);
                    }
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                style={{ background: '#F4F4F5', border: '1px solid transparent', color: '#18181B', outline: 'none' }}
                onFocus={() => setShowSuggestion(true)}
                onBlur={() => window.setTimeout(() => {
                  setShowSuggestion(false);
                  setActiveSuggestionIndex(-1);
                }, 160)}
              />
              {showSuggestion && keyword.trim().length >= 2 && (
                <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #EBEBED', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
                  {suggestionLoading && visibleSuggestions.length === 0
                    ? <p className="px-3 py-2 text-xs" style={{ color: '#A1A1AA' }}>주소 추천 불러오는 중...</p>
                    : visibleSuggestions.length > 0
                      ? (
                        <div className="py-1">
                          {addressSuggestions.length > 0 && (
                            <>
                              <p className="px-3 py-1 text-[10px] font-semibold tracking-wide uppercase" style={{ color: '#71717A' }}>주소 추천</p>
                              {addressSuggestions.map((p) => {
                                const idx = visibleSuggestions.findIndex((s) => s.placeId === p.placeId);
                                return (
                                  <button
                                    key={p.placeId}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => void selectSuggestion(p)}
                                    className="w-full text-left px-3 py-2.5 transition-colors"
                                    style={idx === activeSuggestionIndex ? { background: '#F4F4F5' } : undefined}
                                  >
                                    <p className="text-xs font-semibold truncate" style={{ color: '#18181B' }}>{p.address || p.name}</p>
                                    <p className="text-[11px] truncate" style={{ color: '#A1A1AA' }}>{p.name}</p>
                                  </button>
                                );
                              })}
                            </>
                          )}
                          {placeSuggestions.length > 0 && (
                            <>
                              <p className="px-3 py-1 text-[10px] font-semibold tracking-wide uppercase" style={{ color: '#71717A' }}>장소 추천</p>
                              {placeSuggestions.map((p) => {
                                const idx = visibleSuggestions.findIndex((s) => s.placeId === p.placeId);
                                return (
                                  <button
                                    key={p.placeId}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => void selectSuggestion(p)}
                                    className="w-full text-left px-3 py-2.5 transition-colors"
                                    style={idx === activeSuggestionIndex ? { background: '#F4F4F5' } : undefined}
                                  >
                                    <p className="text-xs font-semibold truncate" style={{ color: '#18181B' }}>{p.name}</p>
                                    <p className="text-[11px] truncate" style={{ color: '#A1A1AA' }}>{p.address}</p>
                                  </button>
                                );
                              })}
                            </>
                          )}
                        </div>
                      )
                      : <p className="px-3 py-2 text-xs" style={{ color: '#A1A1AA' }}>추천 주소가 없습니다.</p>}
                </div>
              )}
            </div>
            <button onClick={() => void searchByQuery(keyword)} disabled={isSearching} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50" style={{ background: '#5E6AD2' }}>
              {isSearching ? '검색 중' : '검색'}
            </button>
            <button onClick={handleNearby} disabled={geoLoading} className="px-3 h-10 flex items-center justify-center rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex-shrink-0" style={{ background: '#F4F4F5', color: '#3F3F46' }}>
              <HiOutlineArrowPath className={`w-4 h-4 mr-1 ${geoLoading ? 'animate-spin' : ''}`} />
              주변
            </button>
          </div>
          <div className="flex-1 relative">
            {!hasAny ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: '#A1A1AA' }}>
                NEXT_PUBLIC_KAKAO_MAP_KEY 또는 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 설정 필요
              </div>
            ) : (
              <div ref={mapContainerRef} className="absolute inset-0" />
            )}
          </div>
        </div>

        <div className="hidden lg:flex lg:w-72 rounded-lg flex-col overflow-hidden" style={{ borderBottom: '1px solid #EBEBED' }}>
          <div className="px-4 py-3.5 flex-shrink-0" style={{ borderBottom: '1px solid #EBEBED' }}>
            <p className="text-sm font-bold" style={{ color: '#18181B' }}>결과</p>
            {facilities.length > 0 && <p className="text-xs mt-0.5" style={{ color: '#A1A1AA' }}>총 {facilities.length}개</p>}
          </div>
          <div className="flex-1 overflow-y-auto">
            {facilities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#F4F4F5' }}>
                  <HiOutlineBuildingOffice2 className="w-6 h-6" style={{ color: '#A1A1AA' }} />
                </div>
                <p className="text-sm text-center px-4 leading-relaxed" style={{ color: '#A1A1AA' }}>
                  {isMapLoaded ? '지도 이동 또는 검색' : '지도 로딩 중'}
                </p>
              </div>
            ) : (
              <div>
                {facilities.map((f, idx) => {
                  const cc = categoryColors[f.category] ?? categoryColors.OTHER;
                  return (
                    <Link
                      key={f.id}
                      href={`/facilities/${f.id}`}
                      className="flex items-start gap-3 px-4 py-3.5 transition-colors group"
                      style={{ borderBottom: idx < facilities.length - 1 ? '1px solid #EBEBED' : 'none' }}
                      onClick={() => {
                        if (!f.latitude || !f.longitude) return;
                        centerMap(f.latitude, f.longitude);
                        setSelectedHit({
                          id: f.id,
                          title: f.name,
                          address: f.address ?? '',
                          lat: f.latitude,
                          lng: f.longitude,
                          provider: 'internal',
                          facilityId: f.id,
                        });
                      }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: cc.solid, boxShadow: `0 2px 6px ${cc.solid}40` }}>
                        <HiOutlineBuildingOffice2 className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: '#18181B' }}>{f.name}</p>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cc.badgeBg, color: cc.badgeText }}>
                          {categoryLabels[f.category] || f.category}
                        </span>
                        {f.address && (
                          <p className="text-xs mt-1 truncate flex items-center gap-1" style={{ color: '#A1A1AA' }}>
                            <HiOutlineMapPin className="w-3 h-3 flex-shrink-0" />
                            {f.address}
                          </p>
                        )}
                      </div>
                      <HiOutlineChevronRight className="w-4 h-4 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#D4D4D8' }} />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <MapDetailPanel hit={selectedHit} onClose={() => setSelectedHit(null)} />
      </div>

      {/* Mobile results — horizontal scroll strip, hidden on desktop */}
      {facilities.length > 0 && (
        <div className="lg:hidden overflow-x-auto -mx-4 px-4 pb-2" style={{ scrollbarWidth: 'none' }}>
          <div className="flex gap-2" style={{ width: 'max-content' }}>
            {facilities.slice(0, 12).map((f) => {
              const cc = categoryColors[f.category] ?? categoryColors.OTHER;
              return (
                <Link
                  key={f.id}
                  href={`/facilities/${f.id}`}
                  className="flex-shrink-0 rounded-xl p-3 flex flex-col gap-1"
                  style={{ background: '#fff', border: '1px solid #E4E4E7', width: '160px' }}
                  onClick={() => {
                    if (f.latitude && f.longitude) centerMap(f.latitude, f.longitude);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cc.solid }}>
                      <HiOutlineBuildingOffice2 className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[12px] font-bold truncate" style={{ color: '#18181B' }}>{f.name}</span>
                  </div>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full self-start" style={{ background: cc.badgeBg, color: cc.badgeText }}>
                    {categoryLabels[f.category] || f.category}
                  </span>
                  {f.address && (
                    <p className="text-[10px] truncate" style={{ color: '#A1A1AA' }}>{f.address}</p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

