'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import type { EmailTemplateResponse, ScheduledEmailResponse } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import {
    HiOutlinePaperAirplane, HiOutlineClock, HiOutlineCheckCircle,
    HiOutlineXCircle, HiOutlineExclamationCircle, HiOutlineEnvelope,
} from 'react-icons/hi2';

type SendMode = 'immediate' | 'scheduled';

function useTemplates() {
    return useQuery<{ content: EmailTemplateResponse[] }>({
        queryKey: ['email-templates-send'],
        queryFn: async () => {
            const { data } = await api.get('/api/v1/admin/email/templates', { params: { page: 0, size: 100 } });
            return data.data;
        },
    });
}

function useScheduledEmails(status?: string) {
    return useQuery({
        queryKey: ['scheduled-emails', status],
        queryFn: async () => {
            const { data } = await api.get('/api/v1/admin/email/scheduled', {
                params: { ...(status ? { status } : {}), page: 0, size: 20, sort: 'scheduledAt,desc' },
            });
            return data.data;
        },
        refetchInterval: 30_000,
    });
}

const STATUS_META: Record<string, { label: string; color: string; icon: typeof HiOutlineCheckCircle }> = {
    PENDING: { label: '대기', color: '#EAB308', icon: HiOutlineClock },
    SENT: { label: '발송완료', color: '#22C55E', icon: HiOutlineCheckCircle },
    FAILED: { label: '실패', color: '#EF4444', icon: HiOutlineXCircle },
};

export default function EmailSendPage() {
    const { data: templatesData } = useTemplates();
    const toast = useToast();
    const [mode, setMode] = useState<SendMode>('immediate');
    const [form, setForm] = useState({
        templateId: '',
        recipientEmail: '',
        scheduledAt: '',
        variablesRaw: '', // "key1=val1, key2=val2"
    });
    const [statusFilter, setStatusFilter] = useState<string>('');
    const { data: scheduledData } = useScheduledEmails(statusFilter || undefined);

    const templates: EmailTemplateResponse[] = templatesData?.content ?? [];
    const scheduledEmails: ScheduledEmailResponse[] = scheduledData?.content ?? [];

    const selectedTemplate = templates.find(t => String(t.id) === form.templateId);

    const parseVariables = () => {
        const result: Record<string, string> = {};
        form.variablesRaw.split(',').forEach(pair => {
            const [k, ...v] = pair.split('=');
            if (k?.trim()) result[k.trim()] = v.join('=').trim();
        });
        return result;
    };

    const sendImmediate = useMutation({
        mutationFn: async () => {
            const { data } = await api.post('/api/v1/admin/email/send', {
                templateId: Number(form.templateId),
                recipientEmail: form.recipientEmail,
                variables: parseVariables(),
            });
            return data.data;
        },
        onSuccess: (sent) => {
            sent ? toast.success('이메일이 발송되었습니다.') : toast.error('발송에 실패했습니다.');
        },
        onError: () => toast.error('발송에 실패했습니다.'),
    });

    const scheduleEmail = useMutation({
        mutationFn: async () => {
            const { data } = await api.post('/api/v1/admin/email/schedule', {
                templateId: Number(form.templateId),
                recipientEmail: form.recipientEmail,
                scheduledAt: form.scheduledAt,
                variables: parseVariables(),
            });
            return data.data;
        },
        onSuccess: () => {
            toast.success('이메일 발송이 예약되었습니다.');
            setForm(f => ({ ...f, scheduledAt: '', variablesRaw: '' }));
        },
        onError: () => toast.error('예약에 실패했습니다.'),
    });

    const handleSubmit = () => {
        if (!form.templateId || !form.recipientEmail) {
            toast.error('템플릿과 수신자 이메일을 입력하세요.');
            return;
        }
        if (mode === 'immediate') sendImmediate.mutate();
        else scheduleEmail.mutate();
    };

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h1 className="text-xl font-bold" style={{ color: '#18181B' }}>이메일 발송</h1>
                <p className="text-sm mt-0.5" style={{ color: '#71717A' }}>즉시 발송 또는 특정 일시에 예약 발송</p>
            </div>

            {/* Send form */}
            <div className="rounded-2xl p-6 mb-8" style={{ background: '#fff', border: '1px solid #E4E4E7' }}>
                {/* Mode toggle */}
                <div className="flex gap-2 mb-5 p-1 rounded-xl" style={{ background: '#F4F4F5' }}>
                    {(['immediate', 'scheduled'] as const).map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-all"
                            style={{
                                background: mode === m ? '#fff' : 'transparent',
                                color: mode === m ? '#18181B' : '#71717A',
                                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            }}
                        >
                            {m === 'immediate' ? '즉시 발송' : '예약 발송'}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    {/* Template selector */}
                    <div>
                        <label className="block text-[12px] font-medium mb-1.5" style={{ color: '#52525B' }}>
                            이메일 템플릿
                        </label>
                        <select
                            value={form.templateId}
                            onChange={e => setForm(f => ({ ...f, templateId: e.target.value }))}
                            className="w-full px-3 py-2.5 rounded-xl text-sm"
                            style={{ border: '1.5px solid #E4E4E7', color: '#18181B', background: '#fff' }}
                        >
                            <option value="">템플릿 선택...</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        {selectedTemplate && (
                            <p className="text-[11px] mt-1.5" style={{ color: '#A1A1AA' }}>
                                제목: {selectedTemplate.subject}
                            </p>
                        )}
                    </div>

                    {/* Recipient */}
                    <div>
                        <label className="block text-[12px] font-medium mb-1.5" style={{ color: '#52525B' }}>
                            수신자 이메일
                        </label>
                        <input
                            type="email"
                            value={form.recipientEmail}
                            onChange={e => setForm(f => ({ ...f, recipientEmail: e.target.value }))}
                            placeholder="recipient@example.com"
                            className="w-full px-3 py-2.5 rounded-xl text-sm"
                            style={{ border: '1.5px solid #E4E4E7', color: '#18181B' }}
                        />
                    </div>

                    {/* Scheduled at (only for scheduled mode) */}
                    {mode === 'scheduled' && (
                        <div>
                            <label className="block text-[12px] font-medium mb-1.5" style={{ color: '#52525B' }}>
                                발송 예정 시각
                            </label>
                            <input
                                type="datetime-local"
                                value={form.scheduledAt}
                                onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                                className="w-full px-3 py-2.5 rounded-xl text-sm"
                                style={{ border: '1.5px solid #E4E4E7', color: '#18181B' }}
                            />
                        </div>
                    )}

                    {/* Variables */}
                    {selectedTemplate?.variables && selectedTemplate.variables.length > 0 && (
                        <div>
                            <label className="block text-[12px] font-medium mb-1.5" style={{ color: '#52525B' }}>
                                변수 <span style={{ color: '#A1A1AA' }}>({selectedTemplate.variables.join(', ')})</span>
                            </label>
                            <input
                                type="text"
                                value={form.variablesRaw}
                                onChange={e => setForm(f => ({ ...f, variablesRaw: e.target.value }))}
                                placeholder={`${selectedTemplate.variables[0]}=값, ${selectedTemplate.variables[1] ?? 'key'}=값`}
                                className="w-full px-3 py-2.5 rounded-xl text-sm"
                                style={{ border: '1.5px solid #E4E4E7', color: '#18181B' }}
                            />
                            <p className="text-[11px] mt-1" style={{ color: '#A1A1AA' }}>
                                key=value 형식으로 쉼표 구분
                            </p>
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={sendImmediate.isPending || scheduleEmail.isPending}
                        className="btn-primary w-full justify-center py-3 gap-2 disabled:opacity-40"
                        style={{ borderRadius: '12px' }}
                    >
                        {mode === 'immediate'
                            ? <><HiOutlinePaperAirplane className="w-4 h-4 -rotate-45" /> 즉시 발송</>
                            : <><HiOutlineClock className="w-4 h-4" /> 예약 등록</>
                        }
                    </button>
                </div>
            </div>

            {/* Scheduled email list */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-[15px]" style={{ color: '#18181B' }}>예약 발송 목록</h2>
                    <div className="flex gap-2">
                        {['', 'PENDING', 'SENT', 'FAILED'].map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                                style={{
                                    background: statusFilter === s ? '#5E6AD2' : '#F4F4F5',
                                    color: statusFilter === s ? '#fff' : '#71717A',
                                }}
                            >
                                {s === '' ? '전체' : STATUS_META[s]?.label ?? s}
                            </button>
                        ))}
                    </div>
                </div>

                {scheduledEmails.length === 0 ? (
                    <div className="text-center py-10 rounded-xl" style={{ border: '1px solid #E4E4E7' }}>
                        <HiOutlineEnvelope className="w-8 h-8 mx-auto mb-2" style={{ color: '#D4D4D8' }} />
                        <p className="text-sm" style={{ color: '#71717A' }}>예약된 발송이 없습니다.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {scheduledEmails.map(e => {
                            const meta = STATUS_META[e.status];
                            const Icon = meta?.icon ?? HiOutlineExclamationCircle;
                            return (
                                <div
                                    key={e.id}
                                    className="flex items-center gap-4 px-4 py-3 rounded-xl"
                                    style={{ background: '#fff', border: '1px solid #E4E4E7' }}
                                >
                                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: meta?.color }} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium truncate" style={{ color: '#18181B' }}>
                                            {e.recipientEmail}
                                        </p>
                                        <p className="text-[11px]" style={{ color: '#A1A1AA' }}>
                                            {new Date(e.scheduledAt).toLocaleString('ko-KR')}
                                        </p>
                                    </div>
                                    <span
                                        className="text-[11px] font-semibold px-2 py-1 rounded-lg flex-shrink-0"
                                        style={{ background: `${meta?.color}15`, color: meta?.color }}
                                    >
                                        {meta?.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
