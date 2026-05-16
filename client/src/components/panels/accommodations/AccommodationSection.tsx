import React, { useState, useEffect, useLayoutEffect } from 'react';
import AccommodationItem from './AccommodationItem';
import type {
  DocumentUploadAnalyzeResponse,
  LocalFile,
  StagedDocumentAnalyzePayload,
} from '@/types/api';

interface AccommodationSectionProps {
  planData: {
    plan: any;
    accommodations: any[];
    expenses: any[];
    refreshAccommodations: () => Promise<void>;
    refreshExpenses: () => Promise<void>;
    removeAccommodation?: (accommodationId: number) => void;
  };
  selectedAccommodation?: any;
  activeTab?: 'itinerary' | 'flight' | 'accommodation' | undefined;
  onAccommodationAdd?: (accommodation: any) => void;
  onAccommodationSelect?: (accommodation: any) => void;
  onAccommodationClear?: () => void;
  openNewAccommodationForm?: boolean;
  onConsumeOpenNewAccommodationForm?: () => void;
  newAccommodationDraft?: any | null;
  onEdit?: (accommodation: any) => void;
  onPreviewChange?: (preview: any) => void;
  stagedDocumentAnalyze?: StagedDocumentAnalyzePayload | null;
  onConsumeStagedDocumentAnalyze?: () => void;
  routeDocumentAnalyzeSuccess?: (
    res: DocumentUploadAnalyzeResponse,
    carryPendingFiles?: LocalFile[],
  ) => boolean;
  carryoverPendingFiles?: LocalFile[] | null;
  onConsumeCarryoverPendingFiles?: () => void;
}

export default function AccommodationSection({
  planData,
  selectedAccommodation,
  activeTab,
  onAccommodationAdd,
  onAccommodationSelect,
  onAccommodationClear,
  openNewAccommodationForm,
  onConsumeOpenNewAccommodationForm,
  newAccommodationDraft,
  onEdit,
  onPreviewChange,
  stagedDocumentAnalyze,
  onConsumeStagedDocumentAnalyze,
  routeDocumentAnalyzeSuccess,
  carryoverPendingFiles,
  onConsumeCarryoverPendingFiles,
}: AccommodationSectionProps) {
  const [showAccommodationForm, setShowAccommodationForm] = useState(false);
  const [editingAccommodation, setEditingAccommodation] = useState<any | null>(null);

  // 외부 트리거: 숙박 탭에서 즉시 새 숙박 추가 폼 열기 (selectedAccommodation이 없을 때)
  useEffect(() => {
    if (activeTab === 'accommodation' && openNewAccommodationForm && !selectedAccommodation) {
      setEditingAccommodation(null);
      setShowAccommodationForm(true);
      onConsumeOpenNewAccommodationForm?.();
    }
  }, [activeTab, openNewAccommodationForm, selectedAccommodation, onConsumeOpenNewAccommodationForm]);

  useLayoutEffect(() => {
    if (!stagedDocumentAnalyze) return;
    const kind =
      stagedDocumentAnalyze.result.inferredItemType ??
      stagedDocumentAnalyze.result.draft?.itemType;
    if (kind !== 'accommodation') return;
    if (selectedAccommodation?.id && !showAccommodationForm) {
      setEditingAccommodation(selectedAccommodation);
      setShowAccommodationForm(true);
    }
  }, [stagedDocumentAnalyze, selectedAccommodation, showAccommodationForm]);

  // selectedAccommodation 변경 시 editingAccommodation 동기화
  useEffect(() => {
    if (activeTab === 'accommodation' && selectedAccommodation) {
      // 새 숙박 추가인 경우(id가 없고 openNewAccommodationForm이 true) - 편집 폼 열기
      if (!selectedAccommodation.id && openNewAccommodationForm) {
        setEditingAccommodation(selectedAccommodation);
        setShowAccommodationForm(true);
      } else if (selectedAccommodation.id) {
        // 기존 숙박 - editingAccommodation만 업데이트하고 편집 폼은 확실히 닫음
        setEditingAccommodation(selectedAccommodation);
        setShowAccommodationForm(false);
      } else {
        // 새 숙박이지만 openNewAccommodationForm이 false인 경우
        setEditingAccommodation(selectedAccommodation);
        setShowAccommodationForm(false);
      }
    } else if (activeTab === 'accommodation' && !selectedAccommodation) {
      // selectedAccommodation이 null이면 폼 닫기
      setEditingAccommodation(null);
      setShowAccommodationForm(false);
    }
  }, [activeTab, selectedAccommodation, openNewAccommodationForm]);

  const handleAccommodationSave = async (accommodation: any) => {
    onAccommodationAdd?.(accommodation);
    setShowAccommodationForm(false);
    setEditingAccommodation(null);
    onAccommodationSelect?.(accommodation);
  };

  const handleAccommodationDelete = (accommodationId: string | number) => {
    // 캐시에서 바로 제거 (accommodation + 관련 expense)
    const id = typeof accommodationId === 'string' ? parseInt(accommodationId, 10) : accommodationId;
    if (planData?.removeAccommodation) {
      planData.removeAccommodation(id);
    }
    setShowAccommodationForm(false);
    setEditingAccommodation(null);
    onAccommodationClear?.();
  };

  // 선택된 숙박이 있고 편집 모드가 아닐 때 - 읽기 전용 폼 표시
  if (selectedAccommodation && !showAccommodationForm) {
    return (
      <AccommodationItem
        accommodation={selectedAccommodation}
        planId={planData.plan.id}
        onSave={handleAccommodationSave}
        onCancel={() => {
          setShowAccommodationForm(false);
          setEditingAccommodation(null);
          onAccommodationClear?.();
        }}
        onDelete={handleAccommodationDelete}
        readOnly={true}
        stagedDocumentAnalyze={stagedDocumentAnalyze}
        onConsumeStagedDocumentAnalyze={onConsumeStagedDocumentAnalyze}
        routeDocumentAnalyzeSuccess={routeDocumentAnalyzeSuccess}
        carryoverPendingFiles={carryoverPendingFiles}
        onConsumeCarryoverPendingFiles={onConsumeCarryoverPendingFiles}
        onEdit={() => {
          setEditingAccommodation(selectedAccommodation);
          setShowAccommodationForm(true);
          onEdit?.(selectedAccommodation);
        }}
      />
    );
  }

  // 편집 폼 표시 (추가/수정 모두 처리)
  if (showAccommodationForm) {
    return (
      <AccommodationItem
        accommodation={editingAccommodation}
        draft={newAccommodationDraft}
        planId={planData.plan.id}
        onSave={handleAccommodationSave}
        onCancel={() => {
          setShowAccommodationForm(false);
          setEditingAccommodation(null);
          onAccommodationClear?.();
        }}
        onDelete={handleAccommodationDelete}
        existingAccommodations={planData.accommodations}
        readOnly={false}
        onPreviewChange={onPreviewChange}
        stagedDocumentAnalyze={stagedDocumentAnalyze}
        onConsumeStagedDocumentAnalyze={onConsumeStagedDocumentAnalyze}
        routeDocumentAnalyzeSuccess={routeDocumentAnalyzeSuccess}
        carryoverPendingFiles={carryoverPendingFiles}
        onConsumeCarryoverPendingFiles={onConsumeCarryoverPendingFiles}
      />
    );
  }

  return null;
}

