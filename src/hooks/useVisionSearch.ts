import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { AIResearchResult } from '@/hooks/useAIResearch';

export interface VisionSearchResult {
  locationDescription: string;
  landmarks: string[];
  suggestedQuery: string;
  confidence: number;
}

export interface VisionResearchResponse {
  vision: VisionSearchResult;
  results: AIResearchResult | null;
}

interface UseVisionSearchState {
  data: VisionResearchResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function useVisionSearch() {
  const [state, setState] = useState<UseVisionSearchState>({
    data: null,
    isLoading: false,
    error: null,
  });

  const analyzeFile = useCallback(
    async (file: File, lat = 37.5665, lng = 126.978) => {
      setState({ data: null, isLoading: true, error: null });
      try {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await api.post<VisionResearchResponse>(
          `/api/v1/search/vision?lat=${lat}&lng=${lng}`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 20000,
          },
        );
        setState({ data, isLoading: false, error: null });
      } catch {
        setState({ data: null, isLoading: false, error: 'Vision 분석 중 오류가 발생했습니다.' });
      }
    },
    [],
  );

  const analyzeUrl = useCallback(
    async (imageUrl: string, lat = 37.5665, lng = 126.978) => {
      setState({ data: null, isLoading: true, error: null });
      try {
        const { data } = await api.post<VisionResearchResponse>(
          `/api/v1/search/vision/url?lat=${lat}&lng=${lng}`,
          { imageUrl },
          { timeout: 20000 },
        );
        setState({ data, isLoading: false, error: null });
      } catch {
        setState({ data: null, isLoading: false, error: 'Vision 분석 중 오류가 발생했습니다.' });
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  return { ...state, analyzeFile, analyzeUrl, reset };
}
