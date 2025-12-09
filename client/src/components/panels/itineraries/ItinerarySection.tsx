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
  onShowWarning?: (message?: string) => void;
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
  onShowWarning,
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

  // 선택된 일정이 있고 편집 모드가 아닐 때 - 상세 정보 표시
  if (selectedItinerary && !showItineraryForm) {
    return (
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{selectedItinerary.title}</Text>
          <Pressable
            style={styles.editButton}
            onPress={() => {
              setEditingItinerary(selectedItinerary);
              setShowItineraryForm(true);
              onEdit?.(selectedItinerary);
            }}
          >
            <Text style={styles.editButtonText}>편집</Text>
          </Pressable>
        </View>

        <View style={styles.detailContent}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>제목</Text>
            <Text style={styles.detailValue}>{selectedItinerary.title}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>날짜</Text>
            <Text style={styles.detailValue}>
              {dayjs(selectedItinerary.itineraryDate).format('YYYY년 M월 D일')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>시작 시간</Text>
            <Text style={styles.detailValue}>
              {selectedItinerary.startTime
                ? dayjs(`2000-01-01 ${selectedItinerary.startTime}`).format('HH:mm')
                : selectedItinerary.startTime}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>종료 시간</Text>
            <Text style={styles.detailValue}>
              {selectedItinerary.endTime
                ? dayjs(`2000-01-01 ${selectedItinerary.endTime}`).format('HH:mm')
                : selectedItinerary.endTime}
            </Text>
          </View>
          {selectedItinerary.country && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>국가</Text>
              <Text style={styles.detailValue}>{selectedItinerary.country}</Text>
            </View>
          )}
          {selectedItinerary.city && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>도시</Text>
              <Text style={styles.detailValue}>{selectedItinerary.city}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>장소</Text>
            <Text style={styles.detailValue}>{selectedItinerary.location}</Text>
          </View>
          {selectedItinerary.description && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>설명</Text>
              <Text style={styles.detailValue}>{selectedItinerary.description}</Text>
            </View>
          )}

          {/* 연결된 지출 표시 */}
          {(() => {
            const connectedExpenses = planData.expenses.filter(
              (expense: any) => expense.itineraryId === selectedItinerary.id
            );

            if (connectedExpenses.length > 0) {
              return (
                <View style={styles.expensesSection}>
                  <Text style={styles.expensesSectionTitle}>지출 내역</Text>
                  {connectedExpenses.map((expense: any) => (
                    <View key={expense.id} style={styles.expenseDetailItem}>
                      <Text style={styles.expenseDetailDescription}>{expense.description}</Text>
                      <Text style={styles.expenseDetailAmount}>
                        {expense.amount.toLocaleString()}원
                      </Text>
                    </View>
                  ))}
                </View>
              );
            }
            return null;
          })()}
        </View>
      </View>
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
        onShowWarning={onShowWarning}
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
  detailContainer: {
    padding: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  detailContent: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    width: 80,
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  expensesSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  expensesSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  expenseDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 6,
  },
  expenseDetailDescription: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  expenseDetailAmount: {
    fontSize: 14,
  },
});

