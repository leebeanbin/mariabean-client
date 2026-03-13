'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import {
    HiOutlineArrowLeft, HiOutlineCalendarDays,
    HiOutlineBuildingOffice2, HiOutlineClock,
    HiOutlineCreditCard, HiOutlineCheckCircle,
    HiOutlineAdjustmentsHorizontal, HiOutlineXMark,
} from 'react-icons/hi2';
import StatusBadge from '@/components/ui/StatusBadge';
import { useReservation, useCancelReservation, useConfirmReservation, useRescheduleReservation, useWaitingInfo } from '@/hooks/useReservations';
import { usePaymentByReservation, useReadyPayment, useApprovePayment } from '@/hooks/usePayments';
import { useFacility } from '@/hooks/useFacilities';
import { useResourcesByFacility } from '@/hooks/useResources';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/authStore';
import type { PaymentProvider } from '@/lib/types';
import { validateReservationWindow } from '@/lib/dateTime';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #EBEBED' }}>
            <span className="text-sm" style={{ color: '#71717A' }}>{label}</span>
            <span className="text-sm font-semibold text-right" style={{ color: '#18181B' }}>{value}</span>
        </div>
    );
}

const PROVIDERS: { value: PaymentProvider; label: string; emoji: string }[] = [
    { value: 'KAKAO_PAY', label: '카카오페이', emoji: '💛' },
    { value: 'TOSS_PAY', label: '토스페이', emoji: '🔵' },
];

export default function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const reservationId = Number(id);
    const toast = useToast();
    const { isAdmin } = useAuthStore();

    // Reschedule modal state
    const [showReschedule, setShowReschedule] = useState(false);
    const [newStart, setNewStart] = useState('');
    const [newEnd, setNewEnd] = useState('');

    // Payment flow state
    const [showPayment, setShowPayment] = useState(false);
    const [payProvider, setPayProvider] = useState<PaymentProvider>('KAKAO_PAY');
    const [payAmount, setPayAmount] = useState('');
    const [pendingPaymentId, setPendingPaymentId] = useState<number | null>(null);
    const [pgToken, setPgToken] = useState('');

    const { data: reservation, isLoading } = useReservation(reservationId);
    const { data: payment, refetch: refetchPayment } = usePaymentByReservation(reservationId);
    const { data: waitingInfo } = useWaitingInfo(reservationId, reservation?.status === 'PENDING');
    const { data: facility } = useFacility(reservation?.facilityId ?? '');
    const { data: resourcesPage } = useResourcesByFacility(reservation?.facilityId ?? '', 0, 200);

    const cancelReservation = useCancelReservation();
    const confirmReservation = useConfirmReservation();
    const rescheduleReservation = useRescheduleReservation();
    const readyPayment = useReadyPayment();
    const approvePayment = useApprovePayment();

    const fmt = (iso: string) => iso ? iso.replace('T', ' ').substring(0, 16) : '–';
    const fmtTime = (iso: string) => iso ? iso.substring(11, 16) : '';

    const handleCancel = () => {
        if (!confirm('예약을 취소하시겠습니까?')) return;
        cancelReservation.mutate(reservationId, {
            onSuccess: () => toast.success('예약이 취소되었습니다.'),
            onError: () => toast.error('취소 처리 중 오류가 발생했습니다.'),
        });
    };

    const handleConfirm = () => {
        if (!confirm('예약을 확정하시겠습니까?')) return;
        confirmReservation.mutate(reservationId, {
            onSuccess: () => toast.success('예약이 확정되었습니다.'),
            onError: () => toast.error('확정 처리 중 오류가 발생했습니다.'),
        });
    };

    const handleReschedule = () => {
        const validationError = validateReservationWindow(newStart, newEnd);
        if (validationError) { toast.error(validationError); return; }
        rescheduleReservation.mutate(
            { reservationId, newStartTime: `${newStart}:00`, newEndTime: `${newEnd}:00` },
            {
                onSuccess: () => { toast.success('일정이 변경되었습니다.'); setShowReschedule(false); },
                onError: () => toast.error('일정 변경 중 오류가 발생했습니다.'),
            },
        );
    };

    const handlePayReady = () => {
        const amount = Number(payAmount);
        if (!amount || amount <= 0) { toast.error('결제 금액을 입력해 주세요.'); return; }
        readyPayment.mutate(
            { reservationId, provider: payProvider, amount },
            {
                onSuccess: (data) => {
                    setPendingPaymentId(data.id);
                    toast.info(`결제 준비 완료! PG 토큰을 입력해 주세요. (결제 ID: ${data.id})`);
                },
                onError: () => toast.error('결제 준비 중 오류가 발생했습니다.'),
            },
        );
    };

    const handlePayApprove = () => {
        if (!pendingPaymentId || !pgToken) { toast.error('결제 ID와 PG 토큰이 필요합니다.'); return; }
        approvePayment.mutate(
            { paymentId: pendingPaymentId, pgToken },
            {
                onSuccess: () => {
                    toast.success('결제가 완료되었습니다!');
                    setShowPayment(false);
                    setPendingPaymentId(null);
                    setPgToken('');
                    refetchPayment();
                },
                onError: () => toast.error('결제 승인 중 오류가 발생했습니다.'),
            },
        );
    };

    if (isLoading) {
        return (
            <div className="max-w-lg mx-auto space-y-4">
                <div className="skeleton h-8 w-40 rounded-xl" />
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="rounded-lg p-5 space-y-3" style={{ borderBottom: '1px solid #EBEBED' }}>
                        <div className="skeleton h-4 w-28" />
                        {[...Array(3)].map((_, j) => (
                            <div key={j} className="flex justify-between">
                                <div className="skeleton h-3.5 w-20" />
                                <div className="skeleton h-3.5 w-28" />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    if (!reservation) {
        return (
            <div className="text-center py-16">
                <p className="text-sm" style={{ color: '#71717A' }}>예약 없음</p>
                <Link href="/reservations" className="mt-2 inline-block text-sm font-semibold" style={{ color: '#5E6AD2' }}>
                    목록으로 →
                </Link>
            </div>
        );
    }

    const date = reservation.startTime?.substring(0, 10) ?? '';
    const timeRange = `${fmtTime(reservation.startTime)} – ${fmtTime(reservation.endTime)}`;
    const selectedResourceName = resourcesPage?.content?.find((r) => r.id === reservation.resourceItemId)?.name;

    return (
        <div className="max-w-lg mx-auto space-y-4">
            {/* Context Bar */}
            <div className="flex items-center gap-3 pb-2" style={{ borderBottom: '1px solid #EBEBED' }}>
                <Link
                    href="/reservations"
                    className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 transition-colors"
                    style={{ background: '#F4F4F5', color: '#71717A' }}
                >
                    <HiOutlineArrowLeft className="w-5 h-5" />
                </Link>
                <div className="min-w-0">
                    <h1 className="text-lg font-bold tracking-tight truncate" style={{ color: '#18181B', letterSpacing: '-0.02em' }}>
                        {selectedResourceName ?? reservation.resourceItemId}
                    </h1>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: '#A1A1AA' }}>
                        #{String(reservation.id).padStart(4, '0')}
                    </p>
                </div>
                <div className="ml-auto">
                    <StatusBadge status={reservation.status} />
                </div>
            </div>

            {/* Waiting Info (PENDING only) */}
            {reservation.status === 'PENDING' && waitingInfo && (
                <div
                    className="rounded-2xl p-4 flex items-start gap-3"
                    style={{ background: '#FFF7E6', border: '1px solid #FFD591' }}
                >
                    <HiOutlineClock className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#FA8C16' }} />
                    <div>
                        <p className="text-sm font-bold" style={{ color: '#874D00' }}>대기</p>
                        <p className="text-xs mt-0.5" style={{ color: '#AD6800' }}>
                            순번 <strong>{waitingInfo.queuePosition}</strong>
                            {waitingInfo.estimatedWaitMinutes !== null && (
                                <> · 예상 <strong>{waitingInfo.estimatedWaitMinutes}분</strong></>
                            )}
                        </p>
                    </div>
                </div>
            )}

            {/* Reservation Info */}
            <div
                className="rounded-lg p-5"
                style={{ borderBottom: '1px solid #EBEBED' }}
            >
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#F0F0FF' }}>
                        <HiOutlineBuildingOffice2 className="w-4 h-4" style={{ color: '#5E6AD2' }} />
                    </div>
                    <p className="text-sm font-bold" style={{ color: '#18181B' }}>정보</p>
                </div>

                <InfoRow label="시설" value={facility?.name ?? reservation.facilityId} />
                <InfoRow label="공간" value={selectedResourceName ?? reservation.resourceItemId} />
                {reservation.seatLabel && <InfoRow label="좌석" value={reservation.seatLabel} />}
                <InfoRow
                    label="이용 날짜"
                    value={
                        <span className="flex items-center gap-1.5">
                            <HiOutlineCalendarDays className="w-4 h-4" style={{ color: '#5E6AD2' }} />
                            {date}
                        </span>
                    }
                />
                <InfoRow
                    label="이용 시간"
                    value={
                        <span className="flex items-center gap-1.5">
                            <HiOutlineClock className="w-4 h-4" style={{ color: '#5E6AD2' }} />
                            {timeRange}
                        </span>
                    }
                />
                <div className="flex items-center justify-between pt-3">
                    <span className="text-sm" style={{ color: '#71717A' }}>신청일</span>
                    <span className="text-sm tabular-nums" style={{ color: '#A1A1AA' }}>{fmt(reservation.createdAt)}</span>
                </div>
            </div>

            {/* Admin Panel */}
            {isAdmin && reservation.status === 'PENDING' && (
                <div
                    className="rounded-lg p-5 space-y-3"
                    style={{ borderBottom: '1px solid #EBEBED' }}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#EDE9FE' }}>
                            <HiOutlineAdjustmentsHorizontal className="w-4 h-4" style={{ color: '#7C3AED' }} />
                        </div>
                        <p className="text-sm font-bold" style={{ color: '#18181B' }}>승인</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleConfirm}
                            disabled={confirmReservation.isPending}
                            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                            style={{ background: '#DCFCE7', color: '#065F46' }}
                        >
                            {confirmReservation.isPending ? '처리 중...' : '예약 확정'}
                        </button>
                        <button
                            onClick={() => setShowReschedule(v => !v)}
                            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                            style={{ background: '#F0F0FF', color: '#4E5BBF' }}
                        >
                            일정 변경
                        </button>
                    </div>

                    {/* Reschedule Form */}
                    {showReschedule && (
                        <div className="mt-2 space-y-3 p-4 rounded-xl" style={{ background: '#FAFAFA', borderBottom: '1px solid #EBEBED' }}>
                            <div>
                                <label className="block text-xs font-semibold mb-1" style={{ color: '#3F3F46' }}>새 시작 시간</label>
                                <input
                                    type="datetime-local"
                                    value={newStart}
                                    onChange={e => setNewStart(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                                    style={{ background: 'transparent', borderBottom: '1px solid #EBEBED', color: '#18181B', outline: 'none' }}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1" style={{ color: '#3F3F46' }}>새 종료 시간</label>
                                <input
                                    type="datetime-local"
                                    value={newEnd}
                                    onChange={e => setNewEnd(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                                    style={{ background: 'transparent', borderBottom: '1px solid #EBEBED', color: '#18181B', outline: 'none' }}
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowReschedule(false)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                                    style={{ background: '#F4F4F5', color: '#71717A' }}
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleReschedule}
                                    disabled={rescheduleReservation.isPending}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                                    style={{ background: '#5E6AD2', color: '#fff' }}
                                >
                                    {rescheduleReservation.isPending ? '변경 중...' : '변경 확인'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Payment Info */}
            {payment ? (
                <div
                    className="rounded-lg p-5"
                    style={{ borderBottom: '1px solid #EBEBED' }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#DCFCE7' }}>
                                <HiOutlineCreditCard className="w-4 h-4" style={{ color: '#22C55E' }} />
                            </div>
                            <p className="text-sm font-bold" style={{ color: '#18181B' }}>결제</p>
                        </div>
                        <StatusBadge status={payment.status} />
                    </div>

                    <InfoRow
                        label="결제 금액"
                        value={
                            <span className="text-base font-bold tabular-nums" style={{ color: '#18181B' }}>
                                ₩{Number(payment.amount).toLocaleString()}
                            </span>
                        }
                    />
                    <InfoRow label="결제 수단" value={payment.provider.replace('_', ' ')} />
                    {payment.transactionId && (
                        <InfoRow
                            label="거래 번호"
                            value={<span className="font-mono text-xs">{payment.transactionId}</span>}
                        />
                    )}
                    {payment.approvedAt && (
                        <div className="flex items-center justify-between pt-3">
                            <span className="text-sm" style={{ color: '#71717A' }}>승인 일시</span>
                            <span className="text-sm tabular-nums" style={{ color: '#A1A1AA' }}>{fmt(payment.approvedAt)}</span>
                        </div>
                    )}
                </div>
            ) : reservation.status !== 'CANCELLED' && reservation.status !== 'EXPIRED' ? (
                /* Payment CTA */
                <div
                    className="rounded-lg p-5"
                    style={{ borderBottom: '1px solid #EBEBED' }}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#F4F4F5' }}>
                            <HiOutlineCreditCard className="w-4 h-4" style={{ color: '#A1A1AA' }} />
                        </div>
                        <p className="text-sm font-bold" style={{ color: '#18181B' }}>결제</p>
                    </div>

                    {!showPayment ? (
                        <button
                            onClick={() => setShowPayment(true)}
                            className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                            style={{ background: '#5E6AD2', color: '#fff' }}
                        >
                            결제하기
                        </button>
                    ) : (
                        <div className="space-y-3">
                            {/* Provider */}
                            <div>
                                <p className="text-xs font-semibold mb-2" style={{ color: '#3F3F46' }}>결제 수단</p>
                                <div className="flex gap-2 flex-wrap">
                                    {PROVIDERS.map(p => (
                                        <button
                                            key={p.value}
                                            onClick={() => setPayProvider(p.value)}
                                            className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
                                            style={payProvider === p.value
                                                ? { background: '#5E6AD2', color: '#fff' }
                                                : { background: '#F4F4F5', color: '#71717A' }
                                            }
                                        >
                                            {p.emoji} {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-xs font-semibold mb-1" style={{ color: '#3F3F46' }}>결제 금액 (원)</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="예: 10000"
                                    value={payAmount}
                                    onChange={e => setPayAmount(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl text-sm"
                                    style={{ background: '#F4F4F5', border: '1px solid transparent', color: '#18181B', outline: 'none' }}
                                    onFocus={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#5E6AD2'; }}
                                    onBlur={e => { e.currentTarget.style.background = '#F4F4F5'; e.currentTarget.style.borderColor = 'transparent'; }}
                                />
                            </div>

                            {/* PG Token (shown after ready) */}
                            {pendingPaymentId !== null && (
                                <div>
                                    <label className="block text-xs font-semibold mb-1" style={{ color: '#3F3F46' }}>PG 토큰</label>
                                    <input
                                        type="text"
                                        placeholder="결제 게이트웨이에서 받은 토큰"
                                        value={pgToken}
                                        onChange={e => setPgToken(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl text-sm"
                                        style={{ background: '#F4F4F5', border: '1px solid transparent', color: '#18181B', outline: 'none' }}
                                        onFocus={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#5E6AD2'; }}
                                        onBlur={e => { e.currentTarget.style.background = '#F4F4F5'; e.currentTarget.style.borderColor = 'transparent'; }}
                                    />
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setShowPayment(false); setPendingPaymentId(null); setPgToken(''); }}
                                    className="flex-none w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
                                    style={{ background: '#F4F4F5', color: '#71717A' }}
                                >
                                    <HiOutlineXMark className="w-4 h-4" />
                                </button>
                                {pendingPaymentId === null ? (
                                    <button
                                        onClick={handlePayReady}
                                        disabled={readyPayment.isPending}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                                        style={{ background: '#5E6AD2', color: '#fff' }}
                                    >
                                        {readyPayment.isPending ? '준비 중...' : '결제 준비'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handlePayApprove}
                                        disabled={approvePayment.isPending}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                                        style={{ background: '#22C55E', color: '#fff' }}
                                    >
                                        {approvePayment.isPending ? '승인 중...' : '결제 승인'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {/* Status Summary */}
            {reservation.status === 'CONFIRMED' && (
                <div
                    className="flex items-center gap-3 p-4 rounded-2xl"
                    style={{ background: '#DCFCE7', border: '1px solid #A7F3D0' }}
                >
                    <HiOutlineCheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#22C55E' }} />
                    <p className="text-sm font-semibold" style={{ color: '#065F46' }}>
                        확정됨 · 이용 시간에 방문하세요.
                    </p>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2.5">
                {reservation.status === 'PENDING' && (
                    <button
                        onClick={handleCancel}
                        disabled={cancelReservation.isPending}
                        className="flex-1 py-3.5 rounded-2xl text-sm font-bold transition-all"
                        style={{ background: '#FEE2E2', color: '#EF4444' }}
                    >
                        {cancelReservation.isPending ? '처리 중...' : '예약 취소'}
                    </button>
                )}
                <Link
                    href={`/facilities/${reservation.facilityId}`}
                    className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-center transition-all"
                    style={{ background: '#F0F0FF', color: '#5E6AD2' }}
                >
                    시설 보기
                </Link>
            </div>
        </div>
    );
}
