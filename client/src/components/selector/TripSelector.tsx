import React, { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, Alert, Platform, Dimensions } from 'react-native';
import useDetectClose from '@/hooks/useDetectClose';
import { LocaleConfig } from 'react-native-calendars';
import dayjs from 'dayjs';
import { tripToastMessages } from '@/utils/toast';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import DotsIcon from '../../../assets/dots.svg';
import TripAddIcon from '../../../assets/trip_add.svg';
import DownArrowIcon from '../../../assets/down_arrow.svg';
import UpperArrowIcon from '../../../assets/upper_arrow.svg';
import UpdateIcon from '../../../assets/update.svg';
import DeleteIcon from '../../../assets/delete.svg';
import TripCompletionModal from '../modals/TripCompletionModal';
import TripFormModal from '../modals/TripFormModal';
import TripDeleteConfirmModal from '../modals/TripDeleteConfirmModal';

LocaleConfig.locales['ko'] = {
  monthNames: [
    '01월',
    '02월',
    '03월',
    '04월',
    '05월',
    '06월',
    '07월',
    '08월',
    '09월',
    '10월',
    '11월',
    '12월',
  ],
  monthNamesShort: [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월',
  ],
  dayNames: [
    '일요일',
    '월요일',
    '화요일',
    '수요일',
    '목요일',
    '금요일',
    '토요일',
  ],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
  firstDayOfWeek: 1,
};
LocaleConfig.defaultLocale = 'ko';

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
  onTripAdd?: (
    trip: Omit<Trip, 'id'>
  ) => Promise<Trip | null | false | void> | Trip | null | false | void;
  onTripUpdate?: (id: string, trip: Omit<Trip, 'id'>) => void;
  onTripDelete?: (id: string) => void;
}

type SelectionType = 'single' | 'start' | 'end' | 'range' | undefined;
type CalendarDayMark = { selection?: SelectionType; selected?: boolean };
type CalendarMarkedDates = Record<string, CalendarDayMark>;

export default function TripSelector({ selectedTrip, onTripSelect, trips, onTripAdd, onTripUpdate, onTripDelete }: TripSelectorProps) {
  const dropdownRef = useRef<View>(null);
  const [showDropdown, setIsDropdownOpen, handleOutsidePress] = useDetectClose(dropdownRef, false);
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
  const [hoveredTripId, setHoveredTripId] = useState<string | null>(null);
  const [openMenuTripId, setOpenMenuTripId] = useState<string | null>(null);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showUpdateCompletionModal, setShowUpdateCompletionModal] = useState(false);
  const [showDeleteCompletionModal, setShowDeleteCompletionModal] = useState(false);
  const [createdTripName, setCreatedTripName] = useState<string>('');
  const tripItemRefs = React.useRef<{ [key: string]: View | null }>({});
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false); // 추가 모달 버튼 비활성화용
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false); // 수정 모달 버튼 비활성화용
  const isSubmittingAddRef = useRef(false); // 추가 중복 요청 방지 플래그
  const isSubmittingEditRef = useRef(false); // 수정 중복 요청 방지 플래그

  const handleTripSelect = (trip: Trip) => {
    onTripSelect(trip);
    setIsDropdownOpen(false);
  };

  const handleDateSelect = (dateString: string) => {
    if (selectionMode === 'start') {
      setNewTrip(prev => ({ ...prev, startDate: dateString, endDate: '' }));
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

  const getMarkedDates = (): CalendarMarkedDates => {
    const marked: CalendarMarkedDates = {};

    if (!newTrip.startDate) {
      return marked;
    }

    const start = dayjs(newTrip.startDate);
    const end = newTrip.endDate ? dayjs(newTrip.endDate) : null;

    if (!end || start.isSame(end, 'day')) {
      marked[start.format('YYYY-MM-DD')] = { selection: 'single', selected: true };
      return marked;
    }

    marked[start.format('YYYY-MM-DD')] = { selection: 'start', selected: true };
    marked[end.format('YYYY-MM-DD')] = { selection: 'end', selected: true };

    let current = start.add(1, 'day');
    while (current.isBefore(end, 'day')) {
      marked[current.format('YYYY-MM-DD')] = { selection: 'range', selected: true };
      current = current.add(1, 'day');
    }

    return marked;
  };

  const handleEditDateSelect = (dateString: string) => {
    if (!editingTrip) return;
    
    if (editSelectionMode === 'start') {
      setEditingTrip(prev => prev ? { ...prev, startDate: dateString, endDate: '' } : null);
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

  const getEditMarkedDates = (): CalendarMarkedDates => {
    if (!editingTrip?.startDate) return {};

    const marked: CalendarMarkedDates = {};
    const start = dayjs(editingTrip.startDate);
    const end = editingTrip.endDate ? dayjs(editingTrip.endDate) : null;

    if (!end || start.isSame(end, 'day')) {
      marked[start.format('YYYY-MM-DD')] = { selection: 'single', selected: true };
      return marked;
    }

    marked[start.format('YYYY-MM-DD')] = { selection: 'start', selected: true };
    marked[end.format('YYYY-MM-DD')] = { selection: 'end', selected: true };

    let current = start.add(1, 'day');
    while (current.isBefore(end, 'day')) {
      marked[current.format('YYYY-MM-DD')] = { selection: 'range', selected: true };
      current = current.add(1, 'day');
    }

    return marked;
  };

  const handleAddTrip = async () => {
    // 중복 요청 방지: 이미 실행 중이면 무시
    if (isSubmittingAddRef.current || isSubmittingAdd) {
      return;
    }

    if (!newTrip.name.trim()) {
      Alert.alert('오류', '여행 이름을 입력해주세요.');
      return;
    }
    if (!newTrip.startDate || !newTrip.endDate) {
      Alert.alert('오류', '시작일과 종료일을 선택해주세요.');
      return;
    }

    // 실행 중 플래그 설정
    isSubmittingAddRef.current = true;
    setIsSubmittingAdd(true);

    try {
      if (!onTripAdd) {
        console.error('onTripAdd prop is required to create a trip.');
        return;
      }

      const createdTrip = await onTripAdd(newTrip);

      if (createdTrip === null || createdTrip === false) {
        return;
      }

      // 생성된 여행 이름 저장
      const tripName = createdTrip && typeof createdTrip === 'object' && 'name' in createdTrip 
        ? createdTrip.name 
        : newTrip.name;
      setCreatedTripName(tripName);

      setNewTrip({ name: '', startDate: '', endDate: '' });
      setSelectionMode('start');
      setShowAddModal(false);
      setIsDropdownOpen(false);
      setShowCompletionModal(true);
    } catch (error) {
      console.error('Failed to create trip:', error);
      Alert.alert('오류', '여행 계획 생성에 실패했습니다.');
    }
  };

  const handleEditTrip = async () => {
    // 중복 요청 방지: 이미 실행 중이면 무시
    if (isSubmittingEditRef.current || isSubmittingEdit) {
      return;
    }

    if (!editingTrip) return;
    
    if (!editingTrip.name.trim()) {
      Alert.alert('오류', '여행 이름을 입력해주세요.');
      return;
    }
    if (!editingTrip.startDate || !editingTrip.endDate) {
      Alert.alert('오류', '시작일과 종료일을 선택해주세요.');
      return;
    }

    // 실행 중 플래그 설정
    isSubmittingEditRef.current = true;
    setIsSubmittingEdit(true);

    try {
      // onTripUpdate 호출 (Promise를 반환할 수 있으므로 await 처리)
      const result = onTripUpdate?.(editingTrip.id, {
        name: editingTrip.name,
        startDate: editingTrip.startDate,
        endDate: editingTrip.endDate,
      });
      
      // Promise인 경우 await
      if (result && typeof result === 'object' && 'then' in result) {
        await result;
      }
      
      setEditingTrip(null);
      setShowEditModal(false);
      setIsDropdownOpen(false);
      setShowUpdateCompletionModal(true);
    } catch (error) {
      console.error('Failed to update trip:', error);
      tripToastMessages.updateError();
    } finally {
      isSubmittingEditRef.current = false;
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteTrip = (tripId: string) => {
    setTripToDelete(tripId);
    setDeleteConfirmModalOpen(true);
    setOpenMenuTripId(null);
  };

  const confirmDeleteTrip = () => {
    if (tripToDelete) {
      onTripDelete?.(tripToDelete);
      setIsDropdownOpen(false);
      setDeleteConfirmModalOpen(false);
      setTripToDelete(null);
      setShowDeleteCompletionModal(true);
    }
  };

  const openEditModal = (trip: Trip) => {
    setEditingTrip(trip);
    setEditSelectionMode('start');
    setShowEditModal(true);
    setIsDropdownOpen(false);
  };

  React.useEffect(() => {
    if (showDropdown) {
      const timer = setTimeout(() => {
        setIsDropdownOpen(false);
      }, 5000); // 5초 후 자동으로 닫기

      return () => clearTimeout(timer);
    }
  }, [showDropdown]);

  React.useEffect(() => {
    if (!showDropdown) {
      setOpenMenuTripId(null);
      setMenuPosition(null);
    }
  }, [showDropdown]);

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    return `${start.format('M월 D일')} - ${end.format('M월 D일')}`;
  };

  const containerRef = React.useRef<View>(null);
  const [containerLayout, setContainerLayout] = React.useState<{ x: number; y: number; width: number; height: number } | null>(null);

  React.useEffect(() => {
    if (openMenuTripId && containerRef.current) {
      containerRef.current.measure((x, y, width, height, pageX, pageY) => {
        setContainerLayout({ x: pageX, y: pageY, width, height });
      });
    }
  }, [openMenuTripId]);

  React.useEffect(() => {
    if (!showCompletionModal) {
      return;
    }

    const timer = setTimeout(() => {
      setShowCompletionModal(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [showCompletionModal]);

  React.useEffect(() => {
    if (!showUpdateCompletionModal) {
      return;
    }

    const timer = setTimeout(() => {
      setShowUpdateCompletionModal(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [showUpdateCompletionModal]);

  React.useEffect(() => {
    if (!showDeleteCompletionModal) {
      return;
    }

    const timer = setTimeout(() => {
      setShowDeleteCompletionModal(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [showDeleteCompletionModal]);

  return (
    <View style={styles.container} ref={containerRef}>
      <Pressable 
        style={[
          styles.selector,
          showDropdown && styles.selectorOpen
        ]}
        onPress={() => setIsDropdownOpen(!showDropdown)}
      >
        <View style={styles.selectorContent}>
          <Text style={styles.selectorText}>
            {selectedTrip ? selectedTrip.name : '여행 선택'}
          </Text>
        </View>
        {showDropdown ? (
          <UpperArrowIcon width={12} height={12} />
        ) : (
          <DownArrowIcon width={12} height={12} />
        )}
      </Pressable>

      {showDropdown && (
        <>
          {/* 외부 클릭 감지를 위한 투명 오버레이 */}
          <Pressable 
            style={[StyleSheet.absoluteFill, { zIndex: 9998 }]}
            onPress={handleOutsidePress}
          />
          <View 
            style={styles.dropdownContainer} 
            ref={dropdownRef}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(e) => e.stopPropagation()}
          >
            <View style={styles.dropdown} pointerEvents="box-none">
            <ScrollView 
              style={styles.tripList}
              contentContainerStyle={styles.tripListContent}
              showsVerticalScrollIndicator={false}
            >
              {trips.map((trip) => (
                <Pressable
                  key={trip.id}
                  ref={(ref) => {
                    tripItemRefs.current[trip.id] = ref;
                  }}
                  style={[
                    styles.tripItem,
                    selectedTrip?.id === trip.id && styles.selectedTripItem,
                    hoveredTripId === trip.id && styles.tripItemHovered
                  ]}
                  onPress={() => {
                    if (openMenuTripId) {
                      setOpenMenuTripId(null);
                    } else {
                      handleTripSelect(trip);
                    }
                  }}
                  onHoverIn={() => setHoveredTripId(trip.id)}
                  onHoverOut={() => setHoveredTripId(null)}
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
                      {formatDateRange(trip.startDate, trip.endDate)}
                    </Text>
                  </View>
                  <View style={styles.dotsButtonContainer}>
                    <Pressable
                      style={styles.dotsButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        const itemRef = tripItemRefs.current[trip.id];
                        if (itemRef) {
                          itemRef.measure((x, y, width, height, pageX, pageY) => {
                            const menuTop = pageY + height / 2 + 16; 
                            const screenWidth = Dimensions.get('window').width;
                            const menuRight = screenWidth - (pageX + width) - 54;
                            setMenuPosition({ top: menuTop, right: menuRight });
                            setOpenMenuTripId(openMenuTripId === trip.id ? null : trip.id);
                          });
                        } else {
                          const tripIndex = trips.findIndex(t => t.id === trip.id);
                          if (containerLayout) {
                            const selectorHeight = 32;
                            const menuTop = containerLayout.y + selectorHeight + 4 + (tripIndex * 64) + 16 + 28;
                            const screenWidth = Dimensions.get('window').width;
                            const menuRight = screenWidth - containerLayout.x - containerLayout.width + 50;
                            setMenuPosition({ top: menuTop, right: menuRight });
                          }
                          setOpenMenuTripId(openMenuTripId === trip.id ? null : trip.id);
                        }
                      }}
                    >
                      <DotsIcon width={16} height={16} />
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            
            {/* 새 여행 추가 버튼 */}
            <Pressable 
              style={styles.addTripButton}
              onPress={() => {
                setOpenMenuTripId(null);
                setShowAddModal(true);
              }}
            >
              <View style={styles.addTripButtonBox}>
                <View style={{ marginRight: 4 }}>
                  <TripAddIcon width={14} height={14} />
                </View>
                <Text style={styles.addTripButtonText}>새 여행 추가</Text>
              </View>
            </Pressable>
            </View>
          </View>
        </>
      )}

      {openMenuTripId && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setOpenMenuTripId(null)}
        >
          <Pressable 
            style={styles.menuModalOverlay}
            onPress={() => setOpenMenuTripId(null)}
          >
            {(() => {
              const trip = trips.find(t => t.id === openMenuTripId);
              if (!trip || !menuPosition) return null;
              
              return (
                <View style={[styles.menuContainerModal, { top: menuPosition.top, right: menuPosition.right }]}>
                  <Pressable
                    style={styles.menuItem}
                    onPress={() => {
                      setOpenMenuTripId(null);
                      openEditModal(trip);
                    }}
                  >
                    <UpdateIcon width={14} height={14} />
                    <Text style={styles.menuItemText}>수정</Text>
                  </Pressable>
                  <Pressable
                    style={styles.menuItem}
                    onPress={() => {
                      handleDeleteTrip(trip.id);
                    }}
                  >
                    <DeleteIcon width={14} height={14} />
                    <Text style={styles.menuItemTextDelete}>삭제</Text>
                  </Pressable>
                </View>
              );
            })()}
          </Pressable>
        </Modal>
      )}

      {/* 여행 추가 모달 */}
      <TripFormModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        mode="add"
        tripData={newTrip}
        onTripDataChange={(data) => setNewTrip(prev => ({ ...prev, ...data }))}
        markedDates={getMarkedDates()}
        onDateSelect={handleDateSelect}
        onSubmit={handleAddTrip}
        isSubmitDisabled={!newTrip.startDate || !newTrip.endDate || isSubmittingAdd}
      />

      {/* 여행 수정 모달 */}
      <TripFormModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        mode="edit"
        tripData={editingTrip || { name: '', startDate: '', endDate: '' }}
        onTripDataChange={(data) => setEditingTrip(prev => prev ? { ...prev, ...data } : null)}
        markedDates={getEditMarkedDates()}
        onDateSelect={handleEditDateSelect}
        onSubmit={handleEditTrip}
        isSubmitDisabled={!editingTrip?.startDate || !editingTrip?.endDate || isSubmittingEdit}
      />

      {/* 여행 삭제 확인 모달 */}
      <TripDeleteConfirmModal
        visible={deleteConfirmModalOpen}
        onClose={() => {
          setDeleteConfirmModalOpen(false);
          setTripToDelete(null);
        }}
        tripName={tripToDelete ? trips.find(t => t.id === tripToDelete)?.name || '' : ''}
        onConfirm={confirmDeleteTrip}
      />

      {/* 여행 생성 완료 모달 */}
      <TripCompletionModal
        visible={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        mode="add"
        tripName={createdTripName}
      />

      {/* 여행 수정 완료 모달 */}
      <TripCompletionModal
        visible={showUpdateCompletionModal}
        onClose={() => setShowUpdateCompletionModal(false)}
        mode="edit"
      />

      {/* 여행 삭제 완료 모달 */}
      <TripCompletionModal
        visible={showDeleteCompletionModal}
        onClose={() => setShowDeleteCompletionModal(false)}
        mode="delete"
      />
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
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 220,
    height: 32,
    alignSelf: 'flex-start',
  },
  selectorOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  selectorContent: {
    flex: 1,
  },
  selectorText: {
    ...textStyles.h8,
    fontSize: 12,
    lineHeight: 18,
    color: colors.black,
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 9999,
    marginTop: 0,
  },
  dropdown: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.gray300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    width: '100%',
    maxHeight: 212,
  },
  selectedTripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray300,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  selectedTripHeaderText: {
    ...textStyles.h8,
    fontSize: 12,
    lineHeight: 18,
    color: colors.black,
  },
  tripList: {
    maxHeight: 150,
  },
  tripListContent: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: 'center',
  },
  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 62,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    marginBottom: 2,
    borderRadius: 8,
  },
  tripItemHovered: {
    backgroundColor: colors.gray200,
  },
  selectedTripItem: {
    backgroundColor: colors.gray200,
    borderRadius: 10,
  },
  tripInfo: {
    flex: 1,
  },
  tripName: {
    ...textStyles.h8,
    marginBottom: 4,
  },
  tripDate: {
    ...textStyles.body6,
    fontSize: 11,
    lineHeight: 16,
    color: colors.gray600,
  },
  selectedTripText: {
    color: colors.black,
  },
  dotsButtonContainer: {
    position: 'relative',
  },
  dotsButton: {
    padding: 4,
  },
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuContainerModal: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: 10,
    width: 89,
    height: 72,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  menuItemText: {
    ...textStyles.h8,
    marginLeft: 6,
  },
  menuItemTextDelete: {
    ...textStyles.h8,
    color: colors.warning,
    marginLeft: 6,
  },
  addTripButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: colors.white,
    backgroundColor: colors.white,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  addTripButtonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '112%',
    height: 40,
    backgroundColor: 'rgba(0, 102, 255, 0.08)',
    borderRadius: 10,
  },
  addTripButtonText: {
    ...textStyles.h8,
    fontSize: 12,
    lineHeight: 18,
    color: colors.success,
  },
}); 