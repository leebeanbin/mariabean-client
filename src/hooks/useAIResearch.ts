import { useState, useCallback } from 'react';
import api from '@/lib/api';

export interface AISearchResultItem {
  id: string;
  placeId: string | null;
  name: string;
  category: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  photos: string[];
  rating: number | null;
  reviewCount: number | null;
  tags: string[];
  webSnippet: string | null;
  webUrl: string | null;
  userMemo: string | null;
  memoHighlighted: boolean;
  score: number;
  highlighted: boolean;
  distanceMeters: number | null;
  openNow: boolean | null;
}

export interface AISummary {
  summary: string;
  citations: { number: number; title: string; url: string }[];
}

export interface AIResearchResult {
  query: string;
  aiSummary: AISummary | null;
  results: AISearchResultItem[];
}

interface UseAIResearchState {
  data: AIResearchResult | null;
  isLoading: boolean;
  error: string | null;
}

export function useAIResearch() {
  const [state, setState] = useState<UseAIResearchState>({
    data: null,
    isLoading: false,
    error: null,
  });

  const search = useCallback(async (query: string, lat: number, lng: number) => {
    if (!query.trim()) return;

    setState({ data: null, isLoading: true, error: null });

    try {
      const { data } = await api.get<AIResearchResult>('/api/v1/search/research', {
        params: { query, lat, lng },
        timeout: 15000,
      });
      setState({ data, isLoading: false, error: null });
    } catch (err) {
      setState({ data: null, isLoading: false, error: '검색 중 오류가 발생했습니다.' });
    }
  }, []);

  const recordClick = useCallback(async (placeId: string, query: string, rank: number) => {
    try {
      await api.post('/api/v1/search/research/click', { placeId, query, rank });
    } catch {
      // 클릭 피드백은 fire-and-forget
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  return { ...state, search, recordClick, reset };
}

/** SSE 스트리밍 버전 */
export function useAIResearchStream() {
  const [phase, setPhase] = useState<'idle' | 'initial' | 'enriched' | 'summary' | 'done'>('idle');
  const [initialResults, setInitialResults] = useState<AISearchResultItem[]>([]);
  const [enrichedResults, setEnrichedResults] = useState<AISearchResultItem[]>([]);
  const [summary, setSummary] = useState<AISummary | null>(null);

  const searchStream = useCallback((query: string, lat: number, lng: number) => {
    setPhase('initial');
    setInitialResults([]);
    setEnrichedResults([]);
    setSummary(null);

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
    const url = `${baseUrl}/api/v1/search/research/stream?query=${encodeURIComponent(query)}&lat=${lat}&lng=${lng}`;
    const es = new EventSource(url, { withCredentials: true });

    es.addEventListener('initial', (e) => {
      try { setInitialResults(JSON.parse(e.data)); } catch { /* ignore */ }
      setPhase('enriched');
    });

    es.addEventListener('enriched', (e) => {
      try { setEnrichedResults(JSON.parse(e.data)); } catch { /* ignore */ }
      setPhase('summary');
    });

    es.addEventListener('summary', (e) => {
      try { setSummary(JSON.parse(e.data)); } catch { /* ignore */ }
      setPhase('done');
      es.close();
    });

    es.onerror = () => {
      setPhase('done');
      es.close();
    };

    return () => es.close();
  }, []);

  return { phase, initialResults, enrichedResults, summary, searchStream };
}
