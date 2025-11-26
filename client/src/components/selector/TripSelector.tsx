import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, Alert, Platform, Dimensions } from 'react-native';
import { Calendar, LocaleConfig, DateData } from 'react-native-calendars';
import dayjs from 'dayjs';
import Input from '@/ui/components/input/Input';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { plansApi } from '@/services/plans';
import { tripToastMessages } from '@/utils/toast';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import DotsIcon from '../../../assets/dots.svg';
import TripAddIcon from '../../../assets/trip_add.svg';
import DownArrowIcon from '../../../assets/down_arrow.svg';
import UpperArrowIcon from '../../../assets/upper_arrow.svg';
import LeftArrowIcon from '../../../assets/cal_left_arrow.svg';
import RightArrowIcon from '../../../assets/cal_right_arrow.svg';
import UpdateIcon from '../../../assets/update.svg';
import DeleteIcon from '../../../assets/delete.svg';
import XIcon from '../../../assets/x.svg';
import TripCompletionModal from '../modals/TripCompletionModal';

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

// 캘린더 테마 상수
const CALENDAR_THEME = {
  selectedDayBackgroundColor: '#007AFF',
  selectedDayTextColor: '#ffffff',
  todayTextColor: '#007AFF',
  dayTextColor: '#2d4150',
  textDisabledColor: '#d9e1e8',
  monthTextColor: '#2d4150',
  indicatorColor: '#007AFF',
  textDayFontWeight: '400' as const,
  textMonthFontWeight: '600' as const,
  textDayHeaderFontWeight: '500' as const,
  textDayFontSize: 13,
  textMonthFontSize: 16,
  textDayHeaderFontSize: 11,
  textSectionTitleColor: colors.gray600,
  'stylesheet.calendar.main': {
    week: {
      marginVertical: 2,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  },
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
  onTripAdd?: (
    trip: Omit<Trip, 'id'>
  ) => Promise<Trip | null | false | void> | Trip | null | false | void;
  onTripUpdate?: (id: string, trip: Omit<Trip, 'id'>) => void;
  onTripDelete?: (id: string) => void;
}

type SelectionType = 'single' | 'start' | 'end' | 'range' | undefined;
type CalendarDayMark = { selection?: SelectionType; selected?: boolean };
type CalendarMarkedDates = Record<string, CalendarDayMark>;

function DayCell({
  date,
  state,
  marking,
  onPress,
}: {
  date?: DateData;
  state: string;
  marking?: CalendarDayMark;
  onPress?: (date: DateData) => void;
}) {
  if (!date) {
    return <View style={styles.dayContainer} />;
  }

  const selection = marking?.selection;
  const isDisabled = state === 'disabled';
  const isStart = selection === 'start';
  const isEnd = selection === 'end';
  const isRange = selection === 'range';
  const isSingle = selection === 'single';
  const isToday = dayjs().isSame(dayjs(date.dateString), 'day');

  const rangeStyle: any = {
    opacity: (isStart || isEnd || isRange) ? 1 : 0,
  };

  if (isStart) {
    rangeStyle.left = 16;
    rangeStyle.right = -4;
  } else if (isEnd) {
    rangeStyle.left = -4;
    rangeStyle.right = 16;
  } else if (isRange) {
    rangeStyle.left = -4;
    rangeStyle.right = -4;
  }

  const circleStyle: any = {};
  if (isSingle || isStart || isEnd) {
    circleStyle.backgroundColor = colors.primary;
  } else if (isToday && !selection) {
    circleStyle.backgroundColor = '#E8F1FF';
  }

  return (
    <Pressable
      style={styles.dayContainer}
      disabled={isDisabled}
      onPress={() => onPress?.(date)}
    >
      <View
        style={[
          styles.rangeBase,
          rangeStyle,
        ]}
      />
      <View
        style={[
          styles.circleBase,
          circleStyle,
        ]}
      >
        <Text
          style={[
            styles.dayText,
            isDisabled && styles.dayTextDisabled,
            (isSingle || isStart || isEnd) && styles.dayTextSelected,
            isToday && !selection && styles.dayTextToday,
          ]}
        >
          {date.day}
        </Text>
      </View>
    </Pressable>
  );
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

  const handleTripSelect = (trip: Trip) => {
    onTripSelect(trip);
    setShowDropdown(false);
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
    if (!newTrip.name.trim()) {
      Alert.alert('오류', '여행 이름을 입력해주세요.');
      return;
    }
    if (!newTrip.startDate || !newTrip.endDate) {
      Alert.alert('오류', '시작일과 종료일을 선택해주세요.');
      return;
    }

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
      setShowDropdown(false);
      setShowCompletionModal(true);
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
      
      setEditingTrip(null);
      setShowEditModal(false);
      setShowDropdown(false);
      setShowUpdateCompletionModal(true);
    } catch (error) {
      console.error('Failed to update trip:', error);
      tripToastMessages.updateError();
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
      setShowDropdown(false);
      setDeleteConfirmModalOpen(false);
      setTripToDelete(null);
      setShowDeleteCompletionModal(true);
    }
  };

  const openEditModal = (trip: Trip) => {
    setEditingTrip(trip);
    setEditSelectionMode('start');
    setShowEditModal(true);
    setShowDropdown(false);
  };

  React.useEffect(() => {
    if (showDropdown) {
      const timer = setTimeout(() => {
        setShowDropdown(false);
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
        onPress={() => setShowDropdown(!showDropdown)}
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
        <View style={styles.dropdownContainer}>
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

      {/* 새 여행 추가 모달 */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>새 여행 추가</Text>
                <Text style={styles.modalDescription}>새로운 여행을 만들어 계획을 시작하세요.</Text>
              </View>
              <Pressable
                onPress={() => setShowAddModal(false)}
                style={styles.closeButton}
              >
                <XIcon width={24} height={24} />
              </Pressable>
            </View>
            
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>여행명</Text>
              <Input
                style={styles.input}
                placeholder={PLACEHOLDERS.plan.name}
                value={newTrip.name}
                onChangeText={(text) => setNewTrip(prev => ({ ...prev, name: text }))}
                maxLength={50}
              />
            </View>
            
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>여행 기간 선택</Text>
              <View style={styles.calendarWrapper}>
                <Calendar
                  monthFormat="yyyy년 M월"
                  markedDates={getMarkedDates()}
                  markingType="custom"
                  theme={CALENDAR_THEME}
                  firstDay={1}
                  renderArrow={(direction) =>
                    direction === 'left' ? (
                      <LeftArrowIcon width={18} height={18} />
                    ) : (
                      <RightArrowIcon width={18} height={18} />
                    )
                  }
                  dayComponent={({ date, state, marking, onPress }) => (
                    <DayCell
                      date={date as DateData}
                      state={state ?? ''}
                      marking={marking as CalendarDayMark}
                      onPress={onPress}
                    />
                  )}
                  onDayPress={(day) => handleDateSelect(day.dateString)}
                  style={styles.calendar}
                />
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable 
                style={[
                  styles.modalButton,
                  styles.addButton,
                  (!newTrip.startDate || !newTrip.endDate) && styles.modalButtonDisabled
                ]}
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
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>여행 수정</Text>
                <Text style={styles.modalDescription}>여행 정보를 수정하세요.</Text>
              </View>
              <Pressable
                onPress={() => setShowEditModal(false)}
                style={styles.closeButton}
              >
                <XIcon width={24} height={24} />
              </Pressable>
            </View>
            
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>여행명</Text>
              <Input
                style={styles.input}
                placeholder={PLACEHOLDERS.plan.name}
                value={editingTrip?.name || ''}
                onChangeText={(text) => setEditingTrip(prev => prev ? { ...prev, name: text } : null)}
                maxLength={50}
              />
            </View>
            
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>여행 기간 선택</Text>
              <View style={styles.calendarWrapper}>
                <Calendar
                  monthFormat="yyyy년 M월"
                  markedDates={getEditMarkedDates()}
                  markingType="custom"
                  theme={CALENDAR_THEME}
                  firstDay={1}
                  style={styles.calendar}
                  renderArrow={(direction) =>
                    direction === 'left' ? (
                      <LeftArrowIcon width={18} height={18} />
                    ) : (
                      <RightArrowIcon width={18} height={18} />
                    )
                  }
                  dayComponent={({ date, state, marking, onPress }) => (
                    <DayCell
                      date={date as DateData}
                      state={state ?? ''}
                      marking={marking as CalendarDayMark}
                      onPress={onPress}
                    />
                  )}
                  onDayPress={(day) => handleEditDateSelect(day.dateString)}
                />
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable 
                style={[
                  styles.modalButton,
                  styles.addButton,
                  (!editingTrip?.startDate || !editingTrip?.endDate) && styles.modalButtonDisabled
                ]}
                onPress={handleEditTrip}
                disabled={!editingTrip?.startDate || !editingTrip?.endDate}
              >
                <Text style={styles.addButtonText}>여행 수정</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 여행 삭제 확인 모달 */}
      <Modal 
        visible={deleteConfirmModalOpen} 
        transparent 
        animationType="fade"
        onRequestClose={() => setDeleteConfirmModalOpen(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalCard}>
            <Text style={styles.deleteModalTitle}>정말 이 여행을 삭제하시겠어요?</Text>
            <Text style={styles.deleteModalText}>
              "{tripToDelete ? trips.find(t => t.id === tripToDelete)?.name || '' : ''}" 여행을 삭제하면{'\n'}
              이 여행에 속한 모든 일정, 항공편,{'\n'}
              숙소 및 비용 데이터가 영구적으로 삭제됩니다.{'\n'}
              이 작업은 되돌릴 수 없습니다.
            </Text>
            <View style={styles.deleteModalButtons}>
              <Pressable 
                style={styles.deleteModalCancelButton} 
                onPress={() => {
                  setDeleteConfirmModalOpen(false);
                  setTripToDelete(null);
                }}
              >
                <Text style={styles.deleteModalCancelButtonText}>취소</Text>
              </Pressable>
              <Pressable 
                style={styles.deleteModalDeleteButton} 
                onPress={confirmDeleteTrip}
              >
                <Text style={styles.deleteModalDeleteButtonText}>삭제</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 여행 생성 완료 모달 */}
      <TripCompletionModal
        visible={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        title="여행 추가 완료"
        description={`"${createdTripName}"이/가 생성되었어요!\n이제 여행 정보를 채워 넣어 볼까요?`}
      />

      {/* 여행 수정 완료 모달 */}
      <TripCompletionModal
        visible={showUpdateCompletionModal}
        onClose={() => setShowUpdateCompletionModal(false)}
        title="변경 사항이 저장 되었어요."
        description="여행 정보를 최신 상태로 유지해보세요!"
      />

      {/* 여행 삭제 완료 모달 */}
      <TripCompletionModal
        visible={showDeleteCompletionModal}
        onClose={() => setShowDeleteCompletionModal(false)}
        title="여행 삭제 완료"
        description="여행이 성공적으로 삭제되었습니다."
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
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    minWidth: 420,
    maxHeight: 724,
  },
  modalTitle: {
    ...textStyles.h3,
    textAlign: 'left',
    marginBottom: 4,
    marginLeft: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 0,
    width: 356,
    height: 48,
    fontSize: 14,
    backgroundColor: colors.white,
    alignSelf: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalButton: {
    width: 174,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    marginRight: 4,
  },
  cancelButtonText: {
    ...textStyles.h7,
    color: colors.black,
  },
  addButton: {
    backgroundColor: colors.gray900,
    marginLeft: 4,
  },
  addButtonText: {
    ...textStyles.h7,
    color: colors.white,
  },
  modalButtonDisabled: {
    opacity: 0.4,
  },
  datePicker: {
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalHeaderText: {
    flex: 1,
    paddingRight: 16,
  },
  modalDescription: {
    ...textStyles.body4,
    color: colors.gray700,
    marginLeft: 10,
    textAlign: 'left',
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    ...textStyles.h7,
    color: colors.black,
    marginBottom: 4,
    marginLeft: 10,
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarWrapper: {
    width: 356,
    height: 334,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 10,
    paddingVertical: 24,
    paddingHorizontal: 40,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  calendar: {
    alignSelf: 'center',
    width: 276,
    backgroundColor: 'transparent',
  },
  calendarArrow: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dayContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible',
    marginVertical: 2,
  },
  rangeBase: {
    position: 'absolute',
    left: -12,
    right: -12,
    top: '50%',
    height: 32,
    marginTop: -16,
    backgroundColor: '#E8F1FF',
    zIndex: 1,
  },
  circleBase: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  dayText: {
    fontFamily: textStyles.body4.fontFamily,
    fontSize: 14,
    color: colors.black,
  },
  dayTextDisabled: {
    color: colors.gray300,
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  dayTextToday: {
    color: colors.primary,
    fontWeight: '600',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalCard: {
    width: 320,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  deleteModalTitle: {
    ...textStyles.h5,
    textAlign: 'center',
    marginBottom: 16,
  },
  deleteModalText: {
    ...textStyles.body4,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  deleteModalCancelButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    marginRight: 6,
  },
  deleteModalCancelButtonText: {
    ...textStyles.h7,
  },
  deleteModalDeleteButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff4242',
    marginLeft: 6,
  },
  deleteModalDeleteButtonText: {
    ...textStyles.h7,
    color: colors.white,
  },
}); 