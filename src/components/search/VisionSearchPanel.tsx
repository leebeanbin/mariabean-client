'use client';

import { useState, useRef, useCallback } from 'react';
import { HiOutlinePhoto, HiOutlineLink, HiOutlineXMark, HiOutlineSparkles } from 'react-icons/hi2';
import { useVisionSearch } from '@/hooks/useVisionSearch';
import AIResearchResultCard from './AIResearchResultCard';
import AISummaryPanel from './AISummaryPanel';

interface Props {
  lat?: number;
  lng?: number;
  onClose?: () => void;
}

export default function VisionSearchPanel({ lat = 37.5665, lng = 126.978, onClose }: Props) {
  const { data, isLoading, error, analyzeFile, analyzeUrl, reset } = useVisionSearch();
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      analyzeFile(file, lat, lng);
    },
    [analyzeFile, lat, lng],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleUrlSearch = useCallback(() => {
    if (!urlInput.trim()) return;
    analyzeUrl(urlInput.trim(), lat, lng);
  }, [analyzeUrl, urlInput, lat, lng]);

  const handleReset = () => {
    reset();
    setUrlInput('');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HiOutlinePhoto className="w-5 h-5" style={{ color: '#5E6AD2' }} />
          <span className="text-sm font-semibold" style={{ color: '#18181B' }}>사진으로 장소 찾기</span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <button
              onClick={handleReset}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ background: '#F4F4F5', color: '#52525B' }}
            >
              초기화
            </button>
          )}
          {onClose && (
            <button onClick={onClose}>
              <HiOutlineXMark className="w-4 h-4" style={{ color: '#A1A1AA' }} />
            </button>
          )}
        </div>
      </div>

      {/* 모드 탭 */}
      {!data && !isLoading && (
        <>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #EBEBED' }}>
            <button
              onClick={() => setMode('file')}
              className="flex-1 text-xs py-2 font-medium transition-colors"
              style={{
                background: mode === 'file' ? '#5E6AD2' : '#fff',
                color: mode === 'file' ? '#fff' : '#71717A',
              }}
            >
              파일 업로드
            </button>
            <button
              onClick={() => setMode('url')}
              className="flex-1 text-xs py-2 font-medium transition-colors"
              style={{
                background: mode === 'url' ? '#5E6AD2' : '#fff',
                color: mode === 'url' ? '#fff' : '#71717A',
              }}
            >
              이미지 URL
            </button>
          </div>

          {mode === 'file' ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl p-8 text-center cursor-pointer transition-all"
              style={{
                border: dragOver ? '2px solid #5E6AD2' : '2px dashed #D4D4D8',
                background: dragOver ? '#F0F0FF' : '#FAFAFA',
              }}
            >
              <HiOutlinePhoto className="w-8 h-8 mx-auto mb-2" style={{ color: dragOver ? '#5E6AD2' : '#A1A1AA' }} />
              <p className="text-sm font-medium" style={{ color: '#52525B' }}>
                사진을 드래그하거나 클릭해서 업로드
              </p>
              <p className="text-xs mt-1" style={{ color: '#A1A1AA' }}>JPG, PNG, WEBP 지원</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 text-sm px-3 py-2 rounded-lg outline-none"
                style={{ border: '1px solid #EBEBED', color: '#27272A', background: '#FAFAFA' }}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSearch()}
              />
              <button
                onClick={handleUrlSearch}
                disabled={!urlInput.trim()}
                className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
                style={{ background: '#5E6AD2', color: '#fff' }}
              >
                <HiOutlineLink className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* 로딩 */}
      {isLoading && (
        <div className="text-center py-8">
          <HiOutlineSparkles className="w-8 h-8 mx-auto mb-3 animate-pulse" style={{ color: '#5E6AD2' }} />
          <p className="text-sm font-medium" style={{ color: '#5E6AD2' }}>AI가 분석 중... (llava:7b)</p>
          <p className="text-xs mt-1" style={{ color: '#A1A1AA' }}>잠시만 기다려 주세요</p>
        </div>
      )}

      {/* 오류 */}
      {error && (
        <div className="rounded-lg p-3 text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>
          {error}
        </div>
      )}

      {/* 결과 */}
      {data && (
        <div className="space-y-4">
          {/* Vision 분석 결과 */}
          <div className="rounded-xl p-3" style={{ background: '#F0F0FF', border: '1px solid #C7C9F0' }}>
            <div className="flex items-center gap-2 mb-2">
              <HiOutlineSparkles className="w-4 h-4" style={{ color: '#5E6AD2' }} />
              <span className="text-xs font-semibold" style={{ color: '#5E6AD2' }}>Vision 분석 결과</span>
              <span className="text-xs ml-auto" style={{ color: '#A1A1AA' }}>
                신뢰도 {Math.round(data.vision.confidence * 100)}%
              </span>
            </div>
            {data.vision.locationDescription && (
              <p className="text-sm" style={{ color: '#27272A' }}>{data.vision.locationDescription}</p>
            )}
            {data.vision.landmarks.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {data.vision.landmarks.map((l, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: '#fff', color: '#5E6AD2', border: '1px solid #C7C9F0' }}
                  >
                    {l}
                  </span>
                ))}
              </div>
            )}
            {data.vision.suggestedQuery && (
              <p className="text-xs mt-2" style={{ color: '#52525B' }}>
                검색어: <span className="font-semibold" style={{ color: '#5E6AD2' }}>
                  &quot;{data.vision.suggestedQuery}&quot;
                </span>
              </p>
            )}
          </div>

          {/* AI 요약 */}
          {data.results?.aiSummary && (
            <AISummaryPanel summary={data.results.aiSummary} />
          )}

          {/* 검색 결과 */}
          {data.results && data.results.results.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold" style={{ color: '#71717A' }}>
                검색 결과 {data.results.results.length}개
              </p>
              {data.results.results.map((result, i) => (
                <AIResearchResultCard
                  key={result.id}
                  result={result}
                  rank={i}
                  query={data.vision.suggestedQuery}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
