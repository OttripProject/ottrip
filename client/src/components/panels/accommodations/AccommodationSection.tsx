import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import AccommodationItem from './AccommodationItem';

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

  const handleAccommodationDelete = (accommodationId: number) => {
    // 캐시에서 바로 제거 (accommodation + 관련 expense)
    if (planData?.removeAccommodation) {
      planData.removeAccommodation(accommodationId);
    }
    setShowAccommodationForm(false);
    setEditingAccommodation(null);
    onAccommodationClear?.();
  };

  // 선택된 숙박이 있고 편집 모드가 아닐 때 - 상세 정보 표시
  if (selectedAccommodation && !showAccommodationForm && selectedAccommodation.id) {
    return (
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{selectedAccommodation.name}</Text>
          <Pressable
            style={styles.editButton}
            onPress={() => {
              setEditingAccommodation(selectedAccommodation);
              setShowAccommodationForm(true);
              onEdit?.(selectedAccommodation);
            }}
          >
            <Text style={styles.editButtonText}>편집</Text>
          </Pressable>
        </View>

        <View style={styles.detailContent}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>숙소명</Text>
            <Text style={styles.detailValue}>{selectedAccommodation.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>체크인 날짜</Text>
            <Text style={styles.detailValue}>
              {dayjs(selectedAccommodation.checkinDate).format('YYYY년 M월 D일')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>체크인 시간</Text>
            <Text style={styles.detailValue}>
              {selectedAccommodation.checkinTime
                ? dayjs(`2000-01-01 ${selectedAccommodation.checkinTime}`).format('HH:mm')
                : '미설정'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>체크아웃 날짜</Text>
            <Text style={styles.detailValue}>
              {dayjs(selectedAccommodation.checkoutDate).format('YYYY년 M월 D일')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>체크아웃 시간</Text>
            <Text style={styles.detailValue}>
              {selectedAccommodation.checkoutTime
                ? dayjs(`2000-01-01 ${selectedAccommodation.checkoutTime}`).format('HH:mm')
                : '미설정'}
            </Text>
          </View>
          {selectedAccommodation.country && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>국가</Text>
              <Text style={styles.detailValue}>{selectedAccommodation.country}</Text>
            </View>
          )}
          {selectedAccommodation.city && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>도시</Text>
              <Text style={styles.detailValue}>{selectedAccommodation.city}</Text>
            </View>
          )}
          {selectedAccommodation.place && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>장소</Text>
              <Text style={styles.detailValue}>{selectedAccommodation.place}</Text>
            </View>
          )}
          {selectedAccommodation.description && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>설명</Text>
              <Text style={styles.detailValue}>{selectedAccommodation.description}</Text>
            </View>
          )}
          {selectedAccommodation.expense && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>가격</Text>
                <Text style={styles.detailValue}>
                  {selectedAccommodation.expense.amount?.toLocaleString() || '미설정'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>화폐</Text>
                <Text style={styles.detailValue}>
                  {selectedAccommodation.expense.currency || '미설정'}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    );
  }

  // 편집 폼 표시
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
      />
    );
  }

  // 리스트 표시
  if (activeTab === 'accommodation') {
    return (
      <View style={styles.sectionContent}>
        {planData.accommodations.map((accommodation: any) => (
          <Pressable
            key={accommodation.id}
            style={styles.itemCard}
            onPress={() => {
              if (editingAccommodation?.id === accommodation.id && showAccommodationForm) {
                setShowAccommodationForm(false);
                setEditingAccommodation(null);
              } else {
                setEditingAccommodation(accommodation);
                setShowAccommodationForm(true);
              }
            }}
          >
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{accommodation.name}</Text>
              <Text style={styles.cardSubtitle}>
                {dayjs(accommodation.checkinDate).format('MM/DD')} -{' '}
                {dayjs(accommodation.checkoutDate).format('MM/DD')}
              </Text>
              {accommodation.place && (
                <Text style={styles.cardLocation}>📍 {accommodation.place}</Text>
              )}
            </View>
            <Text style={styles.cardArrow}>›</Text>
          </Pressable>
        ))}

        <Pressable style={styles.addButton} onPress={() => setShowAccommodationForm(true)}>
          <Text style={styles.addButtonText}>숙박 추가</Text>
        </Pressable>
      </View>
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
});

