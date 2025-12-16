import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
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
        onExpenseUpdate={planData.refreshExpenses}
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
        onExpenseUpdate={planData.refreshExpenses}
        selectedDate={selectedItineraryDate || undefined}
        readOnly={false}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  sectionContent: {
    padding: 16,
    paddingBottom: 20,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  cardLocation: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  cardArrow: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

