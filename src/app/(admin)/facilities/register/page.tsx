'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    HiOutlineArrowLeft, HiOutlineMagnifyingGlass,
    HiOutlineMapPin, HiOutlineCheckCircle, HiOutlineXMark,
    HiOutlineEnvelope,
} from 'react-icons/hi2';
import { usePlacesSearch } from '@/hooks/useSearch';
import { useCreateFacility } from '@/hooks/useFacilities';
import { useToast } from '@/components/ui/Toast';
import type { PlaceSearchResult } from '@/lib/types';
import { loadGoogleMapSdk } from '@/lib/loadGoogleMap';
import { loadKakaoMapSdk } from '@/lib/loadKakaoMap';
import { loadDaumPostcodeSdk } from '@/lib/loadDaumPostcode';
import { geocodeAddress } from '@/lib/geocoding';

type MapProvider = 'kakao' | 'google';

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? '';
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const HAS_SEARCH_API = true;

const categories = [
    { value: 'HOSPITAL',  label: '의료시설' },
    { value: 'OFFICE',    label: '사무공간' },
    { value: 'COMMUNITY', label: '주민센터' },
    { value: 'SPORTS',    label: '체육시설' },
    { value: 'LIBRARY',   label: '도서관' },
    { value: 'OTHER',     label: '기타' },
];

function ProviderToggle({ provider, onChange }: { provider: MapProvider; onChange: (p: MapProvider) => void }) {
    return (
        <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: '#E4E4E7' }}>
            {(['kakao', 'google'] as const).map((p) => (
                <button
                    key={p}
                    type="button"
                    onClick={() => onChange(p)}
                    className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all"
                    style={
                        provider === p
                            ? { background: 'transparent', color: '#18181B', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }
                            : { color: '#71717A' }
                    }
                >
                    {p === 'kakao' ? 'Kakao' : 'Google'}
                </button>
            ))}
        </div>
    );
}

function InlineLocationMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
    const mapRef = useRef<HTMLDivElement>(null);

    const defaultProvider: MapProvider = KAKAO_KEY ? 'kakao' : GOOGLE_KEY ? 'google' : 'kakao';
    const [provider, setProvider] = useState<MapProvider>(defaultProvider);
    const hasBoth = !!KAKAO_KEY && !!GOOGLE_KEY;
    const hasAny = !!KAKAO_KEY || !!GOOGLE_KEY;

    useEffect(() => {
        if (!mapRef.current || !hasAny) return;
        const container = mapRef.current;
        container.innerHTML = '';

        if (provider === 'kakao' && KAKAO_KEY) {
            loadKakaoMapSdk(KAKAO_KEY)
                .then(() => {
                    if (!mapRef.current) return;
                    const center = new window.kakao.maps.LatLng(lat, lng);
                    const map = new window.kakao.maps.Map(mapRef.current, { center, level: 4 });
                    new window.kakao.maps.Marker({ position: center, map });
                })
                .catch(() => {});
        } else if (provider === 'google' && GOOGLE_KEY) {
            loadGoogleMapSdk(GOOGLE_KEY)
                .then(() => {
                    if (!mapRef.current) return;
                    const map = new window.google.maps.Map(mapRef.current, {
                        center: { lat, lng }, zoom: 15,
                        mapTypeControl: false, streetViewControl: false, fullscreenControl: false,
                    });
                    new window.google.maps.Marker({ position: { lat, lng }, map });
                })
                .catch(() => {});
        }
    }, [lat, lng, provider, hasAny]);

    return (
        <div className="mt-3 rounded-xl overflow-hidden" style={{ borderBottom: '1px solid #EBEBED' }}>
            <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: '#F8F9FC', borderBottom: '1px solid #EBEBED' }}>
                <div className="flex items-center gap-2 min-w-0">
                    <HiOutlineMapPin className="w-4 h-4 flex-shrink-0" style={{ color: '#5E6AD2' }} />
                    <p className="text-xs font-semibold truncate" style={{ color: '#18181B' }}>{name}</p>
                </div>
                {hasBoth && <ProviderToggle provider={provider} onChange={setProvider} />}
            </div>
            <div className="relative h-56 sm:h-64">
                {hasAny ? (
                    <div ref={mapRef} className="absolute inset-0" />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: '#F8F9FC' }}>
                        <HiOutlineMapPin className="w-7 h-7 mb-2" style={{ color: '#D4D4D8' }} />
                        <p className="text-xs text-center px-6 leading-relaxed" style={{ color: '#A1A1AA' }}>
                            지도 API 키 설정 시 지도가 표시됩니다.
                        </p>
                    </div>
                )}
            </div>
            <div className="px-4 py-2 flex items-center justify-between text-[11px] font-mono tabular-nums" style={{ color: '#A1A1AA', background: '#F8F9FC' }}>
                <span>{lat.toFixed(6)}, {lng.toFixed(6)}</span>
                {hasAny && (
                    <span className="font-sans text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: provider === 'kakao' ? '#FEE500' : '#4285F4', color: provider === 'kakao' ? '#18181B' : '#fff' }}>
                        {provider === 'kakao' ? 'Kakao Maps' : 'Google Maps'}
                    </span>
                )}
            </div>
        </div>
    );
}

// ── Postcode Modal ──
function PostcodeModal({
    onSelect,
    onClose,
}: {
    onSelect: (place: PlaceSearchResult) => void;
    onClose: () => void;
}) {
    const embedRef = useRef<HTMLDivElement>(null);
    const [geocoding, setGeocoding] = useState(false);

    useEffect(() => {
        let cancelled = false;
        loadDaumPostcodeSdk().then(() => {
            if (cancelled || !embedRef.current) return;
            new window.daum.Postcode({
                oncomplete: async (data: DaumPostcodeData) => {
                    setGeocoding(true);
                    const address = data.roadAddress || data.jibunAddress;
                    const buildingName = data.buildingName || '';
                    const coords = await geocodeAddress(address);
                    if (cancelled) return;
                    onSelect({
                        placeId: `postcode-${data.zonecode}`,
                        name: buildingName || address,
                        address,
                        latitude: coords?.lat ?? 0,
                        longitude: coords?.lng ?? 0,
                    });
                    onClose();
                },
                onclose: () => {
                    if (!cancelled) onClose();
                },
            }).embed(embedRef.current);
        });
        return () => { cancelled = true; };
    }, [onSelect, onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="rounded-lg overflow-hidden w-full max-w-md animate-fade-in"
                style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.18)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Modal header */}
                <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #EBEBED' }}>
                    <div>
                        <p className="text-sm font-bold" style={{ color: '#18181B' }}>주소 검색</p>
                        <p className="text-[11px] mt-0.5" style={{ color: '#A1A1AA' }}>도로명, 지번, 건물명으로 검색하세요</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                        style={{ color: '#A1A1AA' }}
                    >
                        <HiOutlineXMark className="w-5 h-5" />
                    </button>
                </div>

                {/* Postcode embed area */}
                {geocoding ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-8 h-8 rounded-full border-3 border-t-transparent animate-spin mb-3" style={{ borderColor: '#E4E4E7', borderTopColor: '#5E6AD2' }} />
                        <p className="text-sm font-semibold" style={{ color: '#71717A' }}>좌표를 가져오는 중...</p>
                    </div>
                ) : (
                    <div ref={embedRef} style={{ height: '470px', width: '100%' }} />
                )}
            </div>
        </div>
    );
}

export default function FacilityRegisterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const handleBack = () => router.back();
    const [form, setForm] = useState({
        name: '', category: 'COMMUNITY', description: '',
        address: '', placeId: '', latitude: 0, longitude: 0,
        markerColor: '#5E6AD2', markerLabel: '',
    });
    const [placeQuery, setPlaceQuery] = useState('');
    const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showPostcode, setShowPostcode] = useState(false);

    const { data: places } = usePlacesSearch(HAS_SEARCH_API && placeQuery.length >= 2 ? placeQuery : '');
    const createFacility = useCreateFacility();
    const toast = useToast();

    const selectPlace = useCallback((place: PlaceSearchResult) => {
        setSelectedPlace(place);
        setForm(prev => ({
            ...prev,
            name: place.name,
            address: place.address,
            placeId: place.placeId,
            latitude: place.latitude,
            longitude: place.longitude,
        }));
        setPlaceQuery('');
        setShowDropdown(false);
    }, []);

    const clearPlace = () => {
        setSelectedPlace(null);
        setForm(prev => ({ ...prev, address: '', placeId: '', latitude: 0, longitude: 0 }));
    };

    const handlePostcodeSelect = useCallback((place: PlaceSearchResult) => {
        selectPlace(place);
        if (place.latitude === 0 && place.longitude === 0) {
            toast.error('주소의 좌표를 찾을 수 없습니다.');
        }
    }, [selectPlace, toast]);

    const closePostcode = useCallback(() => setShowPostcode(false), []);

    useEffect(() => {
        const lat = Number(searchParams.get('lat') ?? '0');
        const lng = Number(searchParams.get('lng') ?? '0');
        const name = searchParams.get('name') ?? '';
        const address = searchParams.get('address') ?? '';
        if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
            setSelectedPlace({
                placeId: `prefill-${lat}-${lng}`,
                name: name || '선택한 위치',
                address,
                latitude: lat,
                longitude: lng,
            });
            setForm(prev => ({
                ...prev,
                name: prev.name || name || '선택한 위치',
                address,
                latitude: lat,
                longitude: lng,
            }));
        }
    }, [searchParams]);

    useEffect(() => {
        if (!places?.length || !placeQuery.trim() || selectedPlace) return;
        const q = placeQuery.trim().toLowerCase();
        const exact = places.find((p) =>
            p.name.toLowerCase() === q || p.address.toLowerCase() === q
        );
        if (exact) {
            const timer = window.setTimeout(() => selectPlace(exact), 0);
            return () => window.clearTimeout(timer);
        }
    }, [placeQuery, places, selectedPlace, selectPlace]);

    const handleSearchInputClick = () => {
        if (!HAS_SEARCH_API) {
            setShowPostcode(true);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        createFacility.mutate(
            {
                name: form.name,
                category: form.category,
                description: form.description || undefined,
                placeId: form.placeId || undefined,
                address: form.address || undefined,
                latitude: form.latitude || undefined,
                longitude: form.longitude || undefined,
                metadata: {
                    markerStyle: {
                        color: form.markerColor,
                        label: form.markerLabel || undefined,
                    },
                },
            },
            {
                onSuccess: () => { toast.success('시설이 등록되었습니다!'); router.push('/facilities'); },
                onError: (err) => toast.error(err instanceof Error ? err.message : '등록 중 오류가 발생했습니다.'),
            }
        );
    };

    return (
        <>
            <div className="max-w-lg mx-auto space-y-4">
                {/* Context Bar */}
                <h1 className="sr-only">시설 등록</h1>
                <div className="flex items-center gap-3 pb-2" style={{ borderBottom: '1px solid #EBEBED' }}>
                    <button
                        onClick={handleBack}
                        className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
                        style={{ background: '#F4F4F5', color: '#71717A' }}
                    >
                        <HiOutlineArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold tracking-tight" style={{ color: '#18181B', letterSpacing: '-0.02em' }}>등록 흐름</p>
                        <p className="text-xs mt-0.5" style={{ color: '#A1A1AA' }}>검색 → 입력 → 등록</p>
                    </div>
                </div>

                {/* Place Search */}
                <div
                    className="rounded-lg p-5"
                    style={{ borderBottom: '1px solid #EBEBED' }}
                >
                    <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-bold" style={{ color: '#18181B' }}>주소</p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#F0F0FF', color: '#5E6AD2' }}>
                            {HAS_SEARCH_API
                                ? `Kakao + Google + 우편번호`
                                : '우편번호 검색'}
                        </span>
                    </div>
                    <p className="text-xs mb-3" style={{ color: '#A1A1AA' }}>
                        {HAS_SEARCH_API
                            ? '검색 또는 우편번호 선택'
                            : '클릭 시 우편번호 검색'}
                    </p>

                    {selectedPlace ? (
                        <div>
                            <div
                                className="flex items-start gap-3 p-3.5 rounded-xl"
                                style={{ background: '#F0F0FF', border: '1px solid #C7D2FE' }}
                            >
                                <HiOutlineCheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#5E6AD2' }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold" style={{ color: '#18181B' }}>{selectedPlace.name}</p>
                                    <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#71717A' }}>
                                        <HiOutlineMapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                        {selectedPlace.address}
                                    </p>
                                </div>
                                <button
                                    onClick={clearPlace}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
                                    style={{ background: 'rgba(94,106,210,0.1)', color: '#5E6AD2' }}
                                >
                                    <HiOutlineXMark className="w-4 h-4" />
                                </button>
                            </div>
                            <InlineLocationMap
                                lat={selectedPlace.latitude}
                                lng={selectedPlace.longitude}
                                name={selectedPlace.name}
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <HiOutlineMagnifyingGlass
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                                        style={{ color: '#A1A1AA' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder={HAS_SEARCH_API ? '장소명 또는 주소 검색' : '클릭하여 주소 검색...'}
                                        value={placeQuery}
                                        onChange={e => { if (HAS_SEARCH_API) { setPlaceQuery(e.target.value); setShowDropdown(true); } }}
                                        onClick={handleSearchInputClick}
                                        onFocus={() => { if (HAS_SEARCH_API) setShowDropdown(true); else setShowPostcode(true); }}
                                        readOnly={!HAS_SEARCH_API}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                                        style={{
                                            background: '#F4F4F5',
                                            border: '1px solid transparent',
                                            color: '#18181B',
                                            outline: 'none',
                                            cursor: HAS_SEARCH_API ? 'text' : 'pointer',
                                        }}
                                        onFocusCapture={e => {
                                            if (HAS_SEARCH_API) {
                                                e.currentTarget.style.background = '#fff';
                                                e.currentTarget.style.borderColor = '#5E6AD2';
                                            }
                                        }}
                                        onBlur={e => {
                                            e.currentTarget.style.background = '#F4F4F5';
                                            e.currentTarget.style.borderColor = 'transparent';
                                            setTimeout(() => setShowDropdown(false), 150);
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowPostcode(true)}
                                    className="flex items-center gap-1.5 px-3.5 py-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                                    style={{ background: '#18181B', color: '#fff' }}
                                >
                                    <HiOutlineEnvelope className="w-3.5 h-3.5" />
                                    우편
                                </button>
                            </div>

                            {/* Dropdown suggestions (only when API keys are set) */}
                            {HAS_SEARCH_API && (
                                <div className="relative">
                                    {showDropdown && places && places.length > 0 && (
                                        <div
                                            className="absolute top-0 left-0 right-0 z-10 rounded-xl overflow-hidden"
                                            style={{ borderBottom: '1px solid #EBEBED', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', background: 'transparent' }}
                                        >
                                            {places.map((place: PlaceSearchResult, idx: number) => (
                                                <button
                                                    key={place.placeId}
                                                    onClick={() => selectPlace(place)}
                                                    className="w-full px-4 py-3 text-left flex items-start gap-3 transition-colors"
                                                    style={{ borderBottom: idx < places.length - 1 ? '1px solid #EBEBED' : 'none' }}
                                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8F9FC'}
                                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}
                                                >
                                                    <div
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-white"
                                                        style={{ background: '#5E6AD2' }}
                                                    >
                                                        <HiOutlineMapPin className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold" style={{ color: '#18181B' }}>{place.name}</p>
                                                        <p className="text-xs mt-0.5" style={{ color: '#A1A1AA' }}>{place.address}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {placeQuery.length >= 2 && places?.length === 0 && (
                                        <p className="text-xs text-center py-2" style={{ color: '#A1A1AA' }}>검색 결과가 없습니다.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="rounded-lg p-5 space-y-4"
                    style={{ borderBottom: '1px solid #EBEBED' }}
                >
                    <p className="text-sm font-bold" style={{ color: '#18181B' }}>기본 정보</p>

                    <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: '#3F3F46' }}>
                            시설명 <span style={{ color: '#DC2626' }}>*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="시설 이름"
                            className="w-full px-4 py-3 rounded-xl text-sm"
                            style={{ background: '#F4F4F5', border: '1px solid transparent', color: '#18181B', outline: 'none' }}
                            onFocus={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#5E6AD2'; }}
                            onBlur={e => { e.currentTarget.style.background = '#F4F4F5'; e.currentTarget.style.borderColor = 'transparent'; }}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: '#3F3F46' }}>
                            카테고리 <span style={{ color: '#DC2626' }}>*</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => setForm({ ...form, category: cat.value })}
                                    className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
                                    style={form.category === cat.value
                                        ? { background: '#5E6AD2', color: '#fff', boxShadow: '0 2px 6px rgba(94,106,210,0.3)' }
                                        : { background: '#F4F4F5', color: '#71717A' }
                                    }
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: '#3F3F46' }}>설명</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            rows={3}
                            placeholder="설명"
                            className="w-full px-4 py-3 rounded-xl text-sm resize-none"
                            style={{ background: '#F4F4F5', border: '1px solid transparent', color: '#18181B', outline: 'none' }}
                            onFocus={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#5E6AD2'; }}
                            onBlur={e => { e.currentTarget.style.background = '#F4F4F5'; e.currentTarget.style.borderColor = 'transparent'; }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#3F3F46' }}>마커 색상</label>
                            <input
                                type="color"
                                value={form.markerColor}
                                onChange={e => setForm({ ...form, markerColor: e.target.value })}
                                className="w-full h-10 rounded-lg"
                                style={{ background: '#F4F4F5', border: '1px solid #EBEBED' }}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#3F3F46' }}>마커 라벨</label>
                            <input
                                type="text"
                                value={form.markerLabel}
                                onChange={e => setForm({ ...form, markerLabel: e.target.value })}
                                placeholder="예: A동"
                                className="w-full px-3 py-2.5 rounded-lg text-xs"
                                style={{ background: '#F4F4F5', border: '1px solid transparent', color: '#18181B' }}
                            />
                        </div>
                    </div>

                    {selectedPlace && (
                        <div className="p-3 rounded-xl" style={{ background: '#F8F9FC', borderBottom: '1px solid #EBEBED' }}>
                            <p className="text-xs font-semibold mb-1" style={{ color: '#A1A1AA' }}>선택 위치</p>
                            <p className="text-xs flex items-center gap-1.5" style={{ color: '#3F3F46' }}>
                                <HiOutlineMapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#5E6AD2' }} />
                                {selectedPlace.address}
                            </p>
                            <p className="text-[11px] mt-1 tabular-nums" style={{ color: '#D4D4D8' }}>
                                {selectedPlace.latitude.toFixed(6)}, {selectedPlace.longitude.toFixed(6)}
                            </p>
                        </div>
                    )}

                    <div className="flex gap-2.5 pt-2" style={{ borderTop: '1px solid #EBEBED' }}>
                        <button
                            type="button"
                            onClick={handleBack}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold text-center transition-colors"
                            style={{ background: '#F4F4F5', color: '#3F3F46' }}
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={createFacility.isPending || !form.name.trim()}
                            className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all"
                            style={{
                                background: '#5E6AD2',
                                boxShadow: '0 2px 8px rgba(94,106,210,0.3)',
                                opacity: !form.name.trim() ? 0.4 : 1,
                            }}
                        >
                            {createFacility.isPending ? '등록 중...' : '등록'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Postcode Modal */}
            {showPostcode && (
                <PostcodeModal
                    onSelect={handlePostcodeSelect}
                    onClose={closePostcode}
                />
            )}
        </>
    );
}
