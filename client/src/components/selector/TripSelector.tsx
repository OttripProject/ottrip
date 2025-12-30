import React, { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, Dimensions } from 'react-native';
import useDetectClose from '@/hooks/useDetectClose';
import { useTripForm } from '@/hooks/useTripForm';
import { LocaleConfig } from 'react-native-calendars';
import dayjs from 'dayjs';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import DotsIcon from '../../../assets/dots.svg';
import TripAddIcon from '../../../assets/trip_add.svg';
import DownArrowIcon from '../../../assets/down_arrow.svg';
import UpperArrowIcon from '../../../assets/upper_arrow.svg';
import UpdateIcon from '../../../assets/update.svg';
import DeleteIcon from '../../../assets/delete.svg';
import ResultModal from '../modals/ResultModal';
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
  onTripAdd: (
    trip: Omit<Trip, 'id'>
  ) => Promise<Trip | null | false | void> | Trip | null | false | void;
  onTripUpdate?: (id: string, trip: Omit<Trip, 'id'>) => void;
  onTripDelete?: (id: string) => void;
  open?: boolean; 
}


export default function TripSelector({ selectedTrip, onTripSelect, trips, onTripAdd, onTripUpdate, onTripDelete, open }: TripSelectorProps) {
  const dropdownRef = useRef<View>(null);
  const [showDropdown, setIsDropdownOpen, handleOutsidePress] = useDetectClose(dropdownRef, false);
  
  React.useEffect(() => {
    if (open) {
      setIsDropdownOpen(true);
    }
  }, [open, setIsDropdownOpen]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  
  const addTripForm = useTripForm();
  
  const editTripForm = useTripForm();
  const [hoveredTripId, setHoveredTripId] = useState<string | null>(null);
  const [openMenuTripId, setOpenMenuTripId] = useState<string | null>(null);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const [tripNameToDelete, setTripNameToDelete] = useState('');
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState<{ mode: string; params?: any } | null>(null);
  const tripItemRefs = React.useRef<{ [key: string]: View | null }>({});
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false); 
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const isSubmittingAddRef = useRef(false);
  const isSubmittingEditRef = useRef(false);

  const handleTripSelect = (trip: Trip) => {
    onTripSelect(trip);
    setIsDropdownOpen(false);
  };

  React.useEffect(() => {
    if (editingTrip && showEditModal) {
      editTripForm.setFormData({
        name: editingTrip.name,
        startDate: editingTrip.startDate,
        endDate: editingTrip.endDate,
      });
      }
  }, [editingTrip, showEditModal]);

  const handleAddTrip = async () => {
    if (isSubmittingAddRef.current || isSubmittingAdd) {
      return;
    }

    isSubmittingAddRef.current = true;
    setIsSubmittingAdd(true);

    try {
      const createdTrip = await onTripAdd(addTripForm.tripData);

      if (createdTrip === null || createdTrip === false) {
        return;
      }

      const tripName = createdTrip && typeof createdTrip === 'object' && 'name' in createdTrip 
        ? createdTrip.name 
        : addTripForm.tripData.name;

      addTripForm.resetForm();
      setShowAddModal(false);
      setIsDropdownOpen(false);
      setResultModalConfig({ mode: 'add', params: { tripName } });
      setResultModalVisible(true);
    } finally {
      isSubmittingAddRef.current = false;
      setIsSubmittingAdd(false);
    }
  };

  const handleEditTrip = async () => {
    if (isSubmittingEditRef.current || isSubmittingEdit) {
      return;
    }

    if (!editingTrip) return;
    if (isSubmittingEditRef.current || isSubmittingEdit) {
      return;
    }

    isSubmittingEditRef.current = true;
    setIsSubmittingEdit(true);

    try {
      const result = onTripUpdate?.(editingTrip.id, {
        name: editTripForm.tripData.name,
        startDate: editTripForm.tripData.startDate,
        endDate: editTripForm.tripData.endDate,
      });
      
      if (result && typeof result === 'object' && 'then' in result) {
        await result;
      }
      
      setEditingTrip(null);
      setShowEditModal(false);
      setIsDropdownOpen(false);
      setResultModalConfig({ mode: 'edit' });
      setResultModalVisible(true);
    } finally {
      isSubmittingEditRef.current = false;
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteTrip = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (trip) {
      setTripNameToDelete(trip.name);
      setTripToDelete(tripId);
      setDeleteConfirmModalOpen(true);
      setOpenMenuTripId(null);
    }
  };

  const confirmDeleteTrip = () => {
    if (tripToDelete) {
      onTripDelete?.(tripToDelete);
      setIsDropdownOpen(false);
      setDeleteConfirmModalOpen(false);
      setTripToDelete(null);
      setResultModalConfig({ mode: 'delete' });
      setResultModalVisible(true);
    }
  };

  const openEditModal = (trip: Trip) => {
    setEditingTrip(trip);
    setShowEditModal(true);
    setIsDropdownOpen(false);
  };

  React.useEffect(() => {
    if (showDropdown) {
      const timer = setTimeout(() => {
        setIsDropdownOpen(false);
      }, 5000);

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
    if (!resultModalVisible) {
      return;
    }

    const timer = setTimeout(() => {
      setResultModalVisible(false);
      setResultModalConfig(null);
    }, 2000);

    return () => clearTimeout(timer);
  }, [resultModalVisible]);

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

      <TripFormModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          addTripForm.resetForm();
        }}
        mode="add"
        tripData={addTripForm.tripData}
        onTripDataChange={addTripForm.updateTripData}
        markedDates={addTripForm.getMarkedDates()}
        onDateSelect={addTripForm.handleDateSelect}
        onSubmit={handleAddTrip}
        isSubmitDisabled={addTripForm.isSubmitDisabled || isSubmittingAdd}
      />

      <TripFormModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTrip(null);
        }}
        mode="edit"
        tripData={editTripForm.tripData}
        onTripDataChange={editTripForm.updateTripData}
        markedDates={editTripForm.getMarkedDates()}
        onDateSelect={editTripForm.handleDateSelect}
        onSubmit={handleEditTrip}
        isSubmitDisabled={editTripForm.isSubmitDisabled || isSubmittingEdit}
      />

      <TripDeleteConfirmModal
        visible={deleteConfirmModalOpen}
        onClose={() => {
          setDeleteConfirmModalOpen(false);
          setTripToDelete(null);
        }}
        tripName={tripNameToDelete}
        onConfirm={confirmDeleteTrip}
      />

      <ResultModal
        visible={resultModalVisible}
        onClose={() => {
          setResultModalVisible(false);
          setResultModalConfig(null);
        }}
        mode={resultModalConfig?.mode || ''}
        params={resultModalConfig?.params}
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