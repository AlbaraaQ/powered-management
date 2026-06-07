'use client';

import React from 'react';
import { Play, Square, CheckCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { useAuth } from '@/lib/contexts/AuthContext';

interface VisitActionButtonsProps {
  visit: {
    id: number;
    status: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    branchName: string | null;
    branchNameAr: string | null;
    representativeId: number;
  };
  onStart?: () => void;
  onEnd?: () => void;
}

export function VisitActionButtons({ visit, onStart, onEnd }: VisitActionButtonsProps) {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const isRep = user?.role === 'representative';

  if (!isRep) {
    return (
      <span className="text-sm text-gray-500">
        <Eye size={16} className="inline" />
      </span>
    );
  }

  switch (visit.status) {
    case 'pending':
      return (
        <Button size="sm" onClick={onStart} icon={<Play size={16} />}>
          {t('startVisit')}
        </Button>
      );
    case 'in_progress':
      return (
        <Button size="sm" variant="danger" onClick={onEnd} icon={<Square size={16} />}>
          {t('endVisit')}
        </Button>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 text-sm text-green-600">
          <CheckCircle size={16} />
          {lang === 'ar' ? 'مكتملة' : 'Done'}
        </span>
      );
    default:
      return <StatusBadge status={visit.status} lang={lang} />;
  }
}
