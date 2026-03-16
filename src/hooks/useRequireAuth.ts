'use client';

import { useCallback, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

export function useRequireAuth() {
    const { isAuthenticated } = useAuthStore();
    const [showModal, setShowModal] = useState(false);

    /** 인증된 사용자면 즉시 실행, 아니면 로그인 유도 모달 표시 */
    const requireAuth = useCallback(
        (action?: () => void) => {
            if (isAuthenticated) {
                action?.();
            } else {
                setShowModal(true);
            }
        },
        [isAuthenticated],
    );

    return { requireAuth, showModal, setShowModal, isAuthenticated };
}
