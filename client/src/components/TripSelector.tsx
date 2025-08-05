import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, TextInput, Alert } from 'react-native';
import DateRangePicker from './DateRangePicker';

interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface TripSelectorProps {
  selectedTrip?: Trip;
  onTripSelect: (trip: Trip) => void;
  trips: Trip[];
  onTripAdd?: (trip: Omit<Trip, 'id'>) => void;
}

export default function TripSelector({ selectedTrip, onTripSelect, trips, onTripAdd }: TripSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTrip, setNewTrip] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });

  const handleTripSelect = (trip: Trip) => {
    onTripSelect(trip);
    setShowDropdown(false);
  };

  const handleAddTrip = () => {
    if (!newTrip.name.trim()) {
      Alert.alert('오류', '여행 이름을 입력해주세요.');
      return;
    }
    if (!newTrip.startDate || !newTrip.endDate) {
      Alert.alert('오류', '시작일과 종료일을 선택해주세요.');
      return;
    }

    onTripAdd?.(newTrip);
    setNewTrip({ name: '', startDate: '', endDate: '' });
    setShowAddModal(false);
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
                <Pressable
                  key={trip.id}
                  style={[
                    styles.tripItem,
                    selectedTrip?.id === trip.id && styles.selectedTripItem
                  ]}
                  onPress={() => handleTripSelect(trip)}
                >
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
                </Pressable>
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
            <Text style={styles.modalTitle}>새 여행 추가</Text>
            
            <TextInput
              style={styles.input}
              placeholder="여행 이름"
              value={newTrip.name}
              onChangeText={(text) => setNewTrip(prev => ({ ...prev, name: text }))}
            />
            
            <DateRangePicker
              startDate={newTrip.startDate}
              endDate={newTrip.endDate}
              onStartDateChange={(date: string) => setNewTrip(prev => ({ ...prev, startDate: date }))}
              onEndDateChange={(date: string) => setNewTrip(prev => ({ ...prev, endDate: date }))}
              style={styles.datePicker}
            />
            
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
              >
                <Text style={styles.addButtonText}>추가</Text>
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
  tripItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
    fontWeight: '600',
    marginBottom: 20,
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
}); 