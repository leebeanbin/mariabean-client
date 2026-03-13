'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { EmailTemplateResponse, EmailTemplateCreateRequest } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import {
    HiOutlinePlus, HiOutlineTrash, HiOutlinePencil, HiOutlineEnvelope,
    HiOutlineXMark, HiOutlineCheckCircle,
} from 'react-icons/hi2';

// ── Hooks ──

function useEmailTemplates(page = 0) {
    return useQuery({
        queryKey: ['email-templates', page],
        queryFn: async () => {
            const { data } = await api.get('/api/v1/admin/email/templates', { params: { page, size: 20 } });
            return data.data;
        },
    });
}

function useCreateTemplate() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (req: EmailTemplateCreateRequest) => {
            const { data } = await api.post('/api/v1/admin/email/templates', req);
            return data.data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['email-templates'] }),
    });
}

function useUpdateTemplate() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...req }: EmailTemplateCreateRequest & { id: number }) => {
            const { data } = await api.put(`/api/v1/admin/email/templates/${id}`, req);
            return data.data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['email-templates'] }),
    });
}

function useDeleteTemplate() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => { await api.delete(`/api/v1/admin/email/templates/${id}`); },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['email-templates'] }),
    });
}

// ── Component ──

type ModalMode = 'create' | 'edit';

export default function EmailTemplatesPage() {
    const { data, isLoading } = useEmailTemplates();
    const createTemplate = useCreateTemplate();
    const updateTemplate = useUpdateTemplate();
    const deleteTemplate = useDeleteTemplate();
    const toast = useToast();

    const [modalMode, setModalMode] = useState<ModalMode | null>(null);
    const [editing, setEditing] = useState<EmailTemplateResponse | null>(null);
    const [form, setForm] = useState({ name: '', subject: '', body: '', variables: '' });

    const templates: EmailTemplateResponse[] = data?.content ?? [];

    const openCreate = () => {
        setForm({ name: '', subject: '', body: '', variables: '' });
        setModalMode('create');
    };

    const openEdit = (t: EmailTemplateResponse) => {
        setEditing(t);
        setForm({ name: t.name, subject: t.subject, body: t.body, variables: (t.variables ?? []).join(', ') });
        setModalMode('edit');
    };

    const handleSubmit = () => {
        const variables = form.variables.split(',').map(v => v.trim()).filter(Boolean);
        const payload = { name: form.name, subject: form.subject, body: form.body, variables };

        if (modalMode === 'create') {
            createTemplate.mutate(payload, {
                onSuccess: () => { toast.success('템플릿이 생성되었습니다.'); setModalMode(null); },
                onError: () => toast.error('생성에 실패했습니다.'),
            });
        } else if (editing) {
            updateTemplate.mutate({ id: editing.id, ...payload }, {
                onSuccess: () => { toast.success('템플릿이 수정되었습니다.'); setModalMode(null); },
                onError: () => toast.error('수정에 실패했습니다.'),
            });
        }
    };

    const handleDelete = (id: number) => {
        if (!confirm('삭제하시겠습니까?')) return;
        deleteTemplate.mutate(id, {
            onSuccess: () => toast.success('삭제되었습니다.'),
            onError: () => toast.error('삭제에 실패했습니다.'),
        });
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: '#18181B' }}>이메일 템플릿</h1>
                    <p className="text-sm mt-0.5" style={{ color: '#71717A' }}>
                        {'{{name}}, {{date}}'} 형식의 변수를 사용하세요
                    </p>
                </div>
                <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                    <HiOutlinePlus className="w-4 h-4" />
                    템플릿 추가
                </button>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
                </div>
            ) : templates.length === 0 ? (
                <div className="text-center py-16 rounded-2xl" style={{ border: '1px solid #E4E4E7' }}>
                    <HiOutlineEnvelope className="w-10 h-10 mx-auto mb-3" style={{ color: '#D4D4D8' }} />
                    <p style={{ color: '#71717A' }}>템플릿이 없습니다. 새 템플릿을 추가해보세요.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {templates.map(t => (
                        <div
                            key={t.id}
                            className="flex items-start gap-4 p-4 rounded-xl"
                            style={{ background: '#fff', border: '1px solid #E4E4E7' }}
                        >
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: '#F0F0FF' }}
                            >
                                <HiOutlineEnvelope className="w-5 h-5" style={{ color: '#5E6AD2' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[14px]" style={{ color: '#18181B' }}>{t.name}</p>
                                <p className="text-[12px] mt-0.5" style={{ color: '#71717A' }}>{t.subject}</p>
                                {t.variables?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {t.variables.map(v => (
                                            <span key={v} className="px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: '#F0F0FF', color: '#5E6AD2' }}>
                                                {`{{${v}}}`}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    onClick={() => openEdit(t)}
                                    className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:bg-gray-100"
                                >
                                    <HiOutlinePencil className="w-4 h-4" style={{ color: '#71717A' }} />
                                </button>
                                <button
                                    onClick={() => handleDelete(t.id)}
                                    className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:bg-red-50"
                                >
                                    <HiOutlineTrash className="w-4 h-4" style={{ color: '#EF4444' }} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <div className="w-full max-w-xl rounded-2xl overflow-hidden" style={{ background: '#fff' }}>
                        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #E4E4E7' }}>
                            <h2 className="font-bold text-[16px]" style={{ color: '#18181B' }}>
                                {modalMode === 'create' ? '템플릿 추가' : '템플릿 수정'}
                            </h2>
                            <button onClick={() => setModalMode(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                                <HiOutlineXMark className="w-5 h-5" style={{ color: '#71717A' }} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[12px] font-medium mb-1.5" style={{ color: '#52525B' }}>템플릿 이름</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="예: 예약 확정 알림"
                                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                                    style={{ border: '1.5px solid #E4E4E7', color: '#18181B' }}
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-medium mb-1.5" style={{ color: '#52525B' }}>이메일 제목</label>
                                <input
                                    type="text"
                                    value={form.subject}
                                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                                    placeholder="예: [MariBean] {{name}}님의 예약이 확정되었습니다"
                                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                                    style={{ border: '1.5px solid #E4E4E7', color: '#18181B' }}
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-medium mb-1.5" style={{ color: '#52525B' }}>
                                    HTML 본문 <span style={{ color: '#A1A1AA' }}>(변수: {'{{variableName}}'})</span>
                                </label>
                                <textarea
                                    value={form.body}
                                    onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                                    rows={8}
                                    placeholder="<p>안녕하세요, {{name}}님...</p>"
                                    className="w-full px-3 py-2.5 rounded-xl text-sm font-mono resize-y"
                                    style={{ border: '1.5px solid #E4E4E7', color: '#18181B' }}
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-medium mb-1.5" style={{ color: '#52525B' }}>
                                    변수 목록 <span style={{ color: '#A1A1AA' }}>(쉼표로 구분)</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.variables}
                                    onChange={e => setForm(f => ({ ...f, variables: e.target.value }))}
                                    placeholder="name, date, reservationId"
                                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                                    style={{ border: '1.5px solid #E4E4E7', color: '#18181B' }}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 flex justify-end gap-2" style={{ borderTop: '1px solid #E4E4E7' }}>
                            <button onClick={() => setModalMode(null)} className="btn-secondary">취소</button>
                            <button
                                onClick={handleSubmit}
                                disabled={!form.name || !form.subject || !form.body}
                                className="btn-primary flex items-center gap-2 disabled:opacity-40"
                            >
                                <HiOutlineCheckCircle className="w-4 h-4" />
                                {modalMode === 'create' ? '생성' : '저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
