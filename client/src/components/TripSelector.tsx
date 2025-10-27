import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, Alert, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';
import Input from '@/ui/components/input/Input';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { plansApi } from '@/services/plans';
import { tripToastMessages } from '@/utils/toast';

// 캘린더 테마 상수
const CALENDAR_THEME = {
  selectedDayBackgroundColor: '#007AFF',
  selectedDayTextColor: '#ffffff',
  todayTextColor: '#007AFF',
  dayTextColor: '#2d4150',
  textDisabledColor: '#d9e1e8',
  arrowColor: '#007AFF',
  monthTextColor: '#2d4150',
  indicatorColor: '#007AFF',
  textDayFontWeight: '300' as const,
  textMonthFontWeight: 'bold' as const,
  textDayHeaderFontWeight: '300' as const,
  textDayFontSize: 16,
  textMonthFontSize: 16,
  textDayHeaderFontSize: 13,
};

interface Trip {
  id: string;
  publicId?: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface TripSelectorProps {
  selectedTrip?: Trip;
  onTripSelect: (trip: Trip) => void;
  trips: Trip[];
  onTripAdd?: (trip: Omit<Trip, 'id'>) => void;
  onTripUpdate?: (id: string, trip: Omit<Trip, 'id'>) => void;
  onTripDelete?: (id: string) => void;
}

export default function TripSelector({ selectedTrip, onTripSelect, trips, onTripAdd, onTripUpdate, onTripDelete }: TripSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [newTrip, setNewTrip] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });
  const [selectionMode, setSelectionMode] = useState<'start' | 'end'>('start');
  const [editSelectionMode, setEditSelectionMode] = useState<'start' | 'end'>('start');

  const handleTripSelect = (trip: Trip) => {
    onTripSelect(trip);
    setShowDropdown(false);
  };

  const handleDateSelect = (dateString: string) => {
    if (selectionMode === 'start') {
      setNewTrip(prev => ({ ...prev, startDate: dateString }));
      setSelectionMode('end');
    } else {
      if (dayjs(dateString).isBefore(dayjs(newTrip.startDate))) {
        setNewTrip(prev => ({ ...prev, startDate: dateString, endDate: newTrip.startDate }));
      } else {
        setNewTrip(prev => ({ ...prev, endDate: dateString }));
      }
      setSelectionMode('start');
    }
  };

  const getMarkedDates = () => {
    const marked: any = {};
    if (newTrip.startDate) {
      marked[newTrip.startDate] = { selected: true, startingDay: true, color: '#007AFF', textColor: 'white' };
    }
    if (newTrip.endDate && newTrip.endDate !== newTrip.startDate) {
      marked[newTrip.endDate] = { selected: true, endingDay: true, color: '#007AFF', textColor: 'white' };
    }
    if (newTrip.startDate && newTrip.endDate && newTrip.startDate !== newTrip.endDate) {
      const start = dayjs(newTrip.startDate);
      const end = dayjs(newTrip.endDate);
      let current = start.add(1, 'day');
      while (current.isBefore(end)) {
        const dateStr = current.format('YYYY-MM-DD');
        marked[dateStr] = { selected: true, color: '#007AFF', textColor: 'white' };
        current = current.add(1, 'day');
      }
    }
    return marked;
  };

  const handleEditDateSelect = (dateString: string) => {
    if (!editingTrip) return;
    
    if (editSelectionMode === 'start') {
      setEditingTrip(prev => prev ? { ...prev, startDate: dateString } : null);
      setEditSelectionMode('end');
    } else {
      if (dayjs(dateString).isBefore(dayjs(editingTrip.startDate))) {
        setEditingTrip(prev => prev ? { ...prev, startDate: dateString, endDate: editingTrip.startDate } : null);
      } else {
        setEditingTrip(prev => prev ? { ...prev, endDate: dateString } : null);
      }
      setEditSelectionMode('start');
    }
  };

  const getEditMarkedDates = () => {
    if (!editingTrip) return {};
    
    const marked: any = {};
    if (editingTrip.startDate) {
      marked[editingTrip.startDate] = { selected: true, startingDay: true, color: '#007AFF', textColor: 'white' };
    }
    if (editingTrip.endDate && editingTrip.endDate !== editingTrip.startDate) {
      marked[editingTrip.endDate] = { selected: true, endingDay: true, color: '#007AFF', textColor: 'white' };
    }
    if (editingTrip.startDate && editingTrip.endDate && editingTrip.startDate !== editingTrip.endDate) {
      const start = dayjs(editingTrip.startDate);
      const end = dayjs(editingTrip.endDate);
      let current = start.add(1, 'day');
      while (current.isBefore(end)) {
        const dateStr = current.format('YYYY-MM-DD');
        marked[dateStr] = { selected: true, color: '#007AFF', textColor: 'white' };
        current = current.add(1, 'day');
      }
    }
    return marked;
  };

  const handleAddTrip = async () => {
    if (!newTrip.name.trim()) {
      Alert.alert('오류', '여행 이름을 입력해주세요.');
      return;
    }
    if (!newTrip.startDate || !newTrip.endDate) {
      Alert.alert('오류', '시작일과 종료일을 선택해주세요.');
      return;
    }

    try {
      // 상위 컴포넌트의 onTripAdd 콜백 호출
      onTripAdd?.(newTrip);

      setNewTrip({ name: '', startDate: '', endDate: '' });
      setSelectionMode('start');
      setShowAddModal(false);
      setShowDropdown(false);
    } catch (error) {
      console.error('Failed to create trip:', error);
      Alert.alert('오류', '여행 계획 생성에 실패했습니다.');
    }
  };

  const handleEditTrip = () => {
    if (!editingTrip) return;
    
    if (!editingTrip.name.trim()) {
      Alert.alert('오류', '여행 이름을 입력해주세요.');
      return;
    }
    if (!editingTrip.startDate || !editingTrip.endDate) {
      Alert.alert('오류', '시작일과 종료일을 선택해주세요.');
      return;
    }

    try {
      onTripUpdate?.(editingTrip.id, {
        name: editingTrip.name,
        startDate: editingTrip.startDate,
        endDate: editingTrip.endDate,
      });
      
      // 성공 Toast 표시
      tripToastMessages.updateSuccess();
      
      setEditingTrip(null);
      setShowEditModal(false);
      setShowDropdown(false);
    } catch (error) {
      console.error('Failed to update trip:', error);
      tripToastMessages.updateError();
    }
  };

  const handleDeleteTrip = (tripId: string) => {
    onTripDelete?.(tripId);
    setShowDropdown(false);
    
    // 나중에 Alert 복원하려면 아래 주석 해제
    /*
    Alert.alert(
      '여행 삭제',
      '정말로 이 여행을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: () => {
            console.log('✅ Delete confirmed for tripId:', tripId);
            onTripDelete?.(tripId);
            setShowDropdown(false);
          }
        }
      ]
    );
    */
  };

  const openEditModal = (trip: Trip) => {
    setEditingTrip(trip);
    setEditSelectionMode('start');
    setShowEditModal(true);
    setShowDropdown(false);
  };

  // 드롭다운 외부 클릭 시 닫기 (React Native용)
  React.useEffect(() => {
    if (showDropdown) {
      const timer = setTimeout(() => {
        setShowDropdown(false);
      }, 5000); // 5초 후 자동으로 닫기

      return () => clearTimeout(timer);
    }
  }, [showDropdown]);

  return (
    <View style={styles.container}>
      <Pressable 
        style={styles.selector}
        onPress={() => setShowDropdown(!showDropdown)}
      >
        <View style={styles.selectorContent}>
          <Text style={styles.selectorText}>
            {selectedTrip ? selectedTrip.name : '여행 선택'}
          </Text>
        </View>
        <Text style={styles.arrow}>▼</Text>
      </Pressable>

      {showDropdown && (
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdown}>
            <ScrollView style={styles.tripList}>
              {trips.map((trip) => (
                <View key={trip.id} style={styles.tripItemContainer}>
                  <Pressable
                    style={[
                      styles.tripItem,
                      selectedTrip?.id === trip.id && styles.selectedTripItem
                    ]}
                    onPress={() => handleTripSelect(trip)}
                  >
                    <View style={styles.tripInfo}>
                      <Text style={[
                        styles.tripName,
                        selectedTrip?.id === trip.id && styles.selectedTripText
                      ]}>
                        {trip.name}
                      </Text>
                      <Text style={[
                        styles.tripDate,
                        selectedTrip?.id === trip.id && styles.selectedTripText
                      ]}>
                        {trip.startDate} ~ {trip.endDate}
                      </Text>
                    </View>
                  </Pressable>
                  <View style={styles.tripActions}>
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => openEditModal(trip)}
                    >
                      <Text style={styles.actionButtonText}>수정</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteTrip(trip.id)}
                    >
                      <Text style={[styles.actionButtonText, styles.deleteButtonText]}>삭제</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
            
            {/* 새 여행 추가 버튼 */}
            <Pressable 
              style={styles.addTripButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.addTripButtonText}>+ 새 여행 추가</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 새 여행 추가 모달 */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>새 여행 추가</Text>
              <Text style={styles.modalDescription}>새로운 여행을 만들어 계획을 시작하세요</Text>
            </View>
            
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>여행명</Text>
              <Input
                style={styles.input}
                placeholder={PLACEHOLDERS.plan.name}
                value={newTrip.name}
                onChangeText={(text) => setNewTrip(prev => ({ ...prev, name: text }))}
              />
            </View>
            
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>여행 기간 선택</Text>
              <Text style={styles.calendarTitle}>날짜 범위 선택</Text>
              <Calendar
                onDayPress={(day) => handleDateSelect(day.dateString)}
                markedDates={getMarkedDates()}
                theme={CALENDAR_THEME}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalButton, styles.addButton]}
                onPress={handleAddTrip}
                disabled={!newTrip.startDate || !newTrip.endDate}
              >
                <Text style={styles.addButtonText}>여행 저장</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 여행 수정 모달 */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>여행 수정</Text>
              <Text style={styles.modalDescription}>여행 정보를 수정하세요</Text>
            </View>
            
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>여행명</Text>
              <Input
                style={styles.input}
                placeholder={PLACEHOLDERS.plan.name}
                value={editingTrip?.name || ''}
                onChangeText={(text) => setEditingTrip(prev => prev ? { ...prev, name: text } : null)}
              />
            </View>
            
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>여행 기간 선택</Text>
              <Text style={styles.calendarTitle}>날짜 범위 선택</Text>
              <Calendar
                onDayPress={(day) => handleEditDateSelect(day.dateString)}
                markedDates={getEditMarkedDates()}
                theme={CALENDAR_THEME}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalButton, styles.addButton]}
                onPress={handleEditTrip}
                disabled={!editingTrip?.startDate || !editingTrip?.endDate}
              >
                <Text style={styles.addButtonText}>수정사항 저장</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 150,
    height: 32,
  },
  selectorContent: {
    flex: 1,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  arrow: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 8,
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    right: 0,
    zIndex: 9999,
    marginTop: 4,
  },
  dropdown: {
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: 200,
    minWidth: 200,
  },
  tripList: {
    maxHeight: 200,
  },
  tripItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tripItem: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tripInfo: {
    flex: 1,
  },
  tripActions: {
    flexDirection: 'row',
    paddingRight: 8,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  deleteButtonText: {
    color: 'white',
  },
  selectedTripItem: {
    backgroundColor: '#3b82f6',
  },
  tripName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 2,
  },
  tripDate: {
    fontSize: 12,
    color: '#64748b',
  },
  selectedTripText: {
    color: 'white',
  },
  addTripButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  addTripButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  cancelButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#3b82f6',
  },
  addButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  datePicker: {
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 8,
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 8,
  },
}); 