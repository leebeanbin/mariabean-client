'use client';

import { useState } from 'react';
import {
  HiOutlineStar,
  HiOutlineMapPin,
  HiOutlinePencilSquare,
  HiOutlineCheck,
  HiOutlineXMark,
} from 'react-icons/hi2';
import api from '@/lib/api';
import type { AISearchResultItem } from '@/hooks/useAIResearch';

interface Props {
  result: AISearchResultItem;
  rank: number;
  query: string;
  onMemoUpdate?: (placeId: string, memo: string, boost: number) => void;
  onClickRecord?: (placeId: string, query: string, rank: number) => void;
}

export default function AIResearchResultCard({ result, rank, query, onMemoUpdate, onClickRecord }: Props) {
  const [editingMemo, setEditingMemo] = useState(false);
  const [memoContent, setMemoContent] = useState(result.userMemo ?? '');
  const [boostScore, setBoostScore] = useState(3);
  const [isSavingMemo, setIsSavingMemo] = useState(false);

  const handleCardClick = () => {
    if (result.placeId && onClickRecord) {
      onClickRecord(result.placeId, query, rank);
    }
  };

  const saveMemo = async () => {
    if (!result.placeId) return;
    setIsSavingMemo(true);
    try {
      await api.post('/api/v1/search/memo', {
        placeId: result.placeId,
        placeName: result.name,
        content: memoContent,
        boost: boostScore,
      });
      setEditingMemo(false);
      onMemoUpdate?.(result.placeId, memoContent, boostScore);
    } catch {
      // 저장 실패 시 무시
    } finally {
      setIsSavingMemo(false);
    }
  };

  const formatDistance = (m: number | null) => {
    if (m === null) return null;
    return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
  };

  return (
    <div
      onClick={handleCardClick}
      className="rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-md"
      style={{
        border: result.memoHighlighted
          ? '2px solid #5E6AD2'
          : result.highlighted
          ? '2px solid #A5B4FC'
          : '1px solid #EBEBED',
        background: '#fff',
      }}
    >
      {/* 사진 가로 스크롤 */}
      {result.photos.length > 0 && (
        <div className="flex overflow-x-auto gap-1 p-1" style={{ scrollbarWidth: 'none' }}>
          {result.photos.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${result.name} 사진 ${i + 1}`}
              className="h-28 w-36 object-cover rounded-lg flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ))}
        </div>
      )}

      <div className="p-3">
        {/* 배지 + 이름 + 평점 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {result.highlighted && !result.memoHighlighted && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}
              >
                ⭐ 주목
              </span>
            )}
            {result.memoHighlighted && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: '#F0F0FF', color: '#5E6AD2', border: '1px solid #C7C9F0' }}
              >
                📝 메모
              </span>
            )}
            <span className="text-sm font-bold truncate" style={{ color: '#18181B' }}>
              {result.name}
            </span>
          </div>
          {result.rating !== null && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <HiOutlineStar className="w-3.5 h-3.5" style={{ color: '#EAB308' }} />
              <span className="text-xs font-semibold" style={{ color: '#18181B' }}>
                {result.rating.toFixed(1)}
              </span>
              {result.reviewCount !== null && (
                <span className="text-xs" style={{ color: '#A1A1AA' }}>({result.reviewCount})</span>
              )}
            </div>
          )}
        </div>

        {/* 주소 + 거리 */}
        {result.address && (
          <div className="flex items-center gap-1 mt-1">
            <HiOutlineMapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#A1A1AA' }} />
            <span className="text-xs truncate" style={{ color: '#71717A' }}>
              {result.address}
              {formatDistance(result.distanceMeters) && (
                <span className="ml-1" style={{ color: '#A1A1AA' }}>· {formatDistance(result.distanceMeters)}</span>
              )}
            </span>
          </div>
        )}

        {/* 태그 */}
        {result.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {result.openNow !== null && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{
                  background: result.openNow ? '#DCFCE7' : '#FEE2E2',
                  color: result.openNow ? '#065F46' : '#991B1B',
                }}
              >
                {result.openNow ? '🟢 영업중' : '🔴 영업종료'}
              </span>
            )}
            {result.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: '#F4F4F5', color: '#52525B' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* AI 웹 스니펫 */}
        {result.webSnippet && (
          <div
            className="mt-2 pt-2 text-xs"
            style={{ borderTop: '1px solid #F4F4F5', color: '#52525B' }}
          >
            <span style={{ color: '#5E6AD2' }}>AI: </span>
            &quot;{result.webSnippet}&quot;
          </div>
        )}

        {/* 개인 메모 (Antigravity) */}
        <div
          className="mt-2 pt-2"
          style={{ borderTop: '1px solid #F4F4F5' }}
          onClick={(e) => e.stopPropagation()}
        >
          {editingMemo ? (
            <div className="space-y-2">
              <textarea
                value={memoContent}
                onChange={(e) => setMemoContent(e.target.value)}
                placeholder="이 장소에 대한 메모를 입력하세요..."
                rows={2}
                className="w-full text-xs rounded-lg px-2 py-1.5 resize-none outline-none"
                style={{ border: '1px solid #C7C9F0', background: '#F8F8FF', color: '#27272A' }}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-[10px]" style={{ color: '#71717A' }}>부스트</span>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setBoostScore(n)}
                      className="text-xs"
                      style={{ color: n <= boostScore ? '#5E6AD2' : '#D4D4D8' }}
                    >
                      ●
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingMemo(false)}
                    className="text-[10px] px-2 py-1 rounded"
                    style={{ background: '#F4F4F5', color: '#52525B' }}
                  >
                    <HiOutlineXMark className="w-3 h-3" />
                  </button>
                  <button
                    onClick={saveMemo}
                    disabled={isSavingMemo}
                    className="text-[10px] px-2 py-1 rounded font-semibold"
                    style={{ background: '#5E6AD2', color: '#fff' }}
                  >
                    <HiOutlineCheck className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              {result.userMemo || memoContent ? (
                <p className="text-xs flex-1" style={{ color: '#52525B' }}>
                  <span style={{ color: '#5E6AD2' }}>📝 내 메모: </span>
                  {memoContent || result.userMemo}
                </p>
              ) : (
                <p className="text-xs" style={{ color: '#A1A1AA' }}>메모 없음</p>
              )}
              <button
                onClick={() => setEditingMemo(true)}
                className="flex-shrink-0"
                title="메모 수정"
              >
                <HiOutlinePencilSquare className="w-3.5 h-3.5" style={{ color: '#A1A1AA' }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
