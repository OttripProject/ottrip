import React, { useState, useEffect } from 'react';
import ItineraryItem from './ItineraryItem';

interface ItinerarySectionProps {
  planData: {
    plan: any;
    itineraries: any[];
    expenses: any[];
    refreshItineraries: () => Promise<void>;
    refreshExpenses: () => Promise<void>;
    addExpense?: (expense: any) => void;
    removeExpense?: (expenseId: number) => void;
    removeItinerary?: (itineraryId: number) => void;
  };
  selectedItinerary?: any;
  activeTab?: 'itinerary' | 'flight' | 'accommodation' | undefined;
  onItineraryAdd?: (itinerary: any) => void;
  onItineraryClear?: () => void;
  openNewItineraryForm?: boolean;
  onConsumeOpenNewItineraryForm?: () => void;
  selectedItineraryDate?: Date | null;
  onEdit?: (itinerary: any) => void;
}

export default function ItinerarySection({
  planData,
  selectedItinerary,
  activeTab,
  onItineraryAdd,
  onItineraryClear,
  openNewItineraryForm,
  onConsumeOpenNewItineraryForm,
  selectedItineraryDate,
  onEdit,
}: ItinerarySectionProps) {
  const [showItineraryForm, setShowItineraryForm] = useState(openNewItineraryForm || false);
  const [editingItinerary, setEditingItinerary] = useState<any | null>(null);

  // 외부 트리거: 일정 탭에서 즉시 새 일정 추가 폼 열기
  useEffect(() => {
    if (activeTab === 'itinerary' && openNewItineraryForm) {
      setEditingItinerary(null);
      setShowItineraryForm(true);
      onConsumeOpenNewItineraryForm?.();
    }
  }, [activeTab, openNewItineraryForm, onConsumeOpenNewItineraryForm]);

  // selectedItinerary 변경 시 편집 폼 상태 동기화
  useEffect(() => {
    if (activeTab === 'itinerary' && selectedItinerary) {
      // 기존 일정이 선택된 경우 (id가 있음) - 편집 폼 닫고 상세 정보 표시
      if (selectedItinerary.id) {
        setEditingItinerary(selectedItinerary);
        setShowItineraryForm(false);
      }
    } else if (activeTab === 'itinerary' && !selectedItinerary) {
      // selectedItinerary가 null이면 폼 닫기
      setEditingItinerary(null);
      setShowItineraryForm(true);
    }
  }, [activeTab, selectedItinerary]);

  const handleItinerarySave = async (itinerary: any) => {
    onItineraryAdd?.(itinerary);
    setShowItineraryForm(false);
    setEditingItinerary(null);
  };

  const handleItineraryDelete = (itineraryId?: string | number) => {
    if (itineraryId) {
      const id = typeof itineraryId === 'string' ? parseInt(itineraryId) : itineraryId;
      // 캐시에서 바로 제거 (itinerary + 관련 expense)
      if (planData?.removeItinerary) {
        planData.removeItinerary(id);
      }
    }
    setShowItineraryForm(false);
    setEditingItinerary(null);
    onItineraryClear?.();
  };

  // 선택된 일정이 있고 편집 모드가 아닐 때 - 읽기 전용 폼 표시
  if (selectedItinerary && !showItineraryForm) {
    return (
      <ItineraryItem
        itinerary={selectedItinerary}
        planId={planData.plan.id}
        planData={planData}
        onSave={handleItinerarySave}
        onCancel={() => {
          setShowItineraryForm(false);
          setEditingItinerary(null);
          onItineraryClear?.();
        }}
        onDelete={handleItineraryDelete}
        selectedDate={selectedItineraryDate || undefined}
        readOnly={true}
        onEdit={() => {
          setEditingItinerary(selectedItinerary);
          setShowItineraryForm(true);
          onEdit?.(selectedItinerary);
        }}
      />
    );
  }

  // 편집 폼 표시
  if (showItineraryForm) {
    return (
      <ItineraryItem
        itinerary={editingItinerary}
        planId={planData.plan.id}
        planData={planData}
        onSave={handleItinerarySave}
        onCancel={() => {
          setShowItineraryForm(false);
          setEditingItinerary(null);
          onItineraryClear?.();
        }}
        onDelete={handleItineraryDelete}
        selectedDate={selectedItineraryDate || undefined}
        readOnly={false}
      />
    );
  }

  return null;
}

