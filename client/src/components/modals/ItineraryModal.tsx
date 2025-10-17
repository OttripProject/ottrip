import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ModalLayout from './ModalLayout';
import ItineraryItem from '../items/ItineraryItem';

interface ItineraryModalProps {
  planData?: {
    plan: any;
    itineraries: any[];
    isLoading: boolean;
    error: string | null;
    refreshItineraries: () => Promise<void>;
    refreshExpenses: () => Promise<void>;
  };
  selectedItinerary?: any;
  onItineraryAdd?: (itinerary: any) => void;
  onClose?: () => void;
}

export default function ItineraryModal({ 
  planData, 
  selectedItinerary, 
  onItineraryAdd, 
  onClose 
}: ItineraryModalProps) {
  const [showItineraryForm, setShowItineraryForm] = useState(false);
  const [editingItinerary, setEditingItinerary] = useState<any | null>(null);

  const handleItinerarySave = async (itinerary: any) => {
    onItineraryAdd?.(itinerary);
    setShowItineraryForm(false);
    setEditingItinerary(null);
    // 일정 목록 새로고침
    if (planData?.refreshItineraries) {
      await planData.refreshItineraries();
    }
    // 지출 목록 새로고침
    if (planData?.refreshExpenses) {
      planData.refreshExpenses();
    }
  };

  const handleItineraryDelete = (itineraryId: string) => {
    // 삭제 후 목록 새로고침
    planData?.refreshItineraries();
    // 상세 내용 닫기
    setShowItineraryForm(false);
    setEditingItinerary(null);
  };

  if (!planData?.plan) {
    return (
      <ModalLayout style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>일정</Text>
          {onClose && (
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </Pressable>
          )}
        </View>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>여행을 선택해주세요</Text>
        </View>
      </ModalLayout>
    );
  }

  return (
    <ModalLayout style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>일정</Text>
        {onClose && (
          <Pressable onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </Pressable>
        )}
      </View>
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        <View style={styles.content}>
          {planData.itineraries.map((itinerary: any) => (
            <Pressable 
              key={itinerary.id} 
              style={styles.itemCard}
              onPress={() => {
                if (editingItinerary?.id === itinerary.id && showItineraryForm) {
                  // 같은 아이템을 다시 누르면 편집창 닫기
                  setShowItineraryForm(false);
                  setEditingItinerary(null);
                } else {
                  // 다른 아이템을 누르거나 편집창이 닫혀있으면 편집창 열기
                  setEditingItinerary(itinerary);
                  setShowItineraryForm(true);
                }
              }}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{itinerary.title}</Text>
                <Text style={styles.cardSubtitle}>
                  {itinerary.itineraryDate} | {itinerary.startTime} - {itinerary.endTime}
                </Text>                      
                <Text style={styles.cardLocation}>📍 {itinerary.country} | {itinerary.city} | {itinerary.location}</Text>
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </Pressable>
          ))}
          
          {showItineraryForm && (
            <ItineraryItem
              itinerary={editingItinerary}
              planId={planData.plan.id}
              planData={planData}
              onSave={handleItinerarySave}
              onCancel={() => {
                setShowItineraryForm(false);
                setEditingItinerary(null);
              }}
              onDelete={handleItineraryDelete}
              onExpenseUpdate={planData.refreshExpenses}
            />
          )}
          
          {!showItineraryForm && (
            <Pressable
              style={styles.addButton}
              onPress={() => setShowItineraryForm(true)}
            >
              <Text style={styles.addButtonText}>일정 추가</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </ModalLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  content: {
    padding: 16,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
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
});
