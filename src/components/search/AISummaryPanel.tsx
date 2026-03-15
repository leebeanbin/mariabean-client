'use client';

import { HiOutlineSparkles, HiOutlineLink } from 'react-icons/hi2';
import type { AISummary } from '@/hooks/useAIResearch';

interface Props {
  summary: AISummary | null;
  isLoading?: boolean;
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function AISummaryPanel({ summary, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl p-4" style={{ background: '#F0F0FF', border: '1px solid #C7C9F0' }}>
        <div className="flex items-center gap-2 mb-3">
          <HiOutlineSparkles className="w-4 h-4 animate-pulse" style={{ color: '#5E6AD2' }} />
          <span className="text-xs font-semibold" style={{ color: '#5E6AD2' }}>AI 요약 생성 중...</span>
        </div>
        <div className="space-y-2">
          <div className="h-3 rounded animate-pulse" style={{ background: '#C7C9F0', width: '90%' }} />
          <div className="h-3 rounded animate-pulse" style={{ background: '#C7C9F0', width: '75%' }} />
          <div className="h-3 rounded animate-pulse" style={{ background: '#C7C9F0', width: '60%' }} />
        </div>
      </div>
    );
  }

  if (!summary?.summary) return null;

  return (
    <div className="rounded-xl p-4" style={{ background: '#F0F0FF', border: '1px solid #C7C9F0' }}>
      <div className="flex items-center gap-2 mb-3">
        <HiOutlineSparkles className="w-4 h-4" style={{ color: '#5E6AD2' }} />
        <span className="text-xs font-semibold" style={{ color: '#5E6AD2' }}>AI 요약</span>
        <span className="text-xs ml-auto" style={{ color: '#A1A1AA' }}>qwen2.5:7b</span>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: '#27272A' }}>
        {summary.summary}
      </p>

      {summary.citations.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #C7C9F0' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: '#71717A' }}>출처</p>
          <div className="flex flex-wrap gap-2">
            {summary.citations.map((c) => (
              <span
                key={c.number}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                style={{ background: '#fff', color: '#5E6AD2', border: '1px solid #C7C9F0' }}
              >
                <span className="font-semibold">[{c.number}]</span>
                {c.url && isSafeUrl(c.url) ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:underline flex items-center gap-0.5"
                  >
                    {c.title}
                    <HiOutlineLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span>{c.title}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
