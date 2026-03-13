'use client';

import { HiOutlineExclamationTriangle, HiOutlineXMark, HiOutlineCheck } from 'react-icons/hi2';

interface AgentActionConfirmProps {
    action: string;
    details: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function AgentActionConfirm({ action, details, onConfirm, onCancel }: AgentActionConfirmProps) {
    return (
        <div
            className="mx-1 rounded-2xl overflow-hidden"
            style={{
                background: '#FFFBEB',
                border: '1.5px solid #FCD34D',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
        >
            <div className="px-4 pt-3.5 pb-1 flex items-start gap-3">
                <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: '#FEF3C7' }}
                >
                    <HiOutlineExclamationTriangle className="w-4 h-4" style={{ color: '#D97706' }} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold" style={{ color: '#92400E' }}>{action} 확인</p>
                    <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: '#78350F' }}>{details}</p>
                </div>
            </div>
            <div className="px-4 pb-3.5 pt-2 flex gap-2">
                <button
                    onClick={onCancel}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-colors"
                    style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}
                >
                    <HiOutlineXMark className="w-3.5 h-3.5" />
                    취소
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold transition-colors"
                    style={{ background: '#D97706', color: '#fff' }}
                >
                    <HiOutlineCheck className="w-3.5 h-3.5" />
                    확인
                </button>
            </div>
        </div>
    );
}
