import useDetectClose from "@/hooks/useDetectClose";
import { useTripForm } from "@/hooks/useTripForm";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import dayjs from "dayjs";
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LocaleConfig } from "react-native-calendars";
import DeleteIcon from "../../../assets/delete.svg";
import DotsIcon from "../../../assets/dots.svg";
import DownArrowIcon from "../../../assets/down_arrow.svg";
import TripAddIcon from "../../../assets/trip_add.svg";
import UpdateIcon from "../../../assets/update.svg";
import ResultModal from "../modals/ResultModal";
import TripDeleteConfirmModal from "../modals/TripDeleteConfirmModal";
import TripFormModal from "../modals/TripFormModal";

LocaleConfig.locales["ko"] = {
  monthNames: [
    "01월",
    "02월",
    "03월",
    "04월",
    "05월",
    "06월",
    "07월",
    "08월",
    "09월",
    "10월",
    "11월",
    "12월",
  ],
  monthNamesShort: [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ],
  dayNames: [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ],
  dayNamesShort: ["일", "월", "화", "수", "목", "금", "토"],
  today: "오늘",
  firstDayOfWeek: 1,
};
LocaleConfig.defaultLocale = "ko";

interface Trip {
  id: string;
  publicId?: string;
  name: string;
  startDate: string;
  endDate: string;
  segments?: Array<{
    country: string;
    city: string;
    startDate: string;
    endDate: string;
  }>;
}

interface TripAddData {
  name: string;
  segments: Array<{
    country: string;
    city: string;
    startDate: string;
    endDate: string;
  }>;
}

interface TripSelectorProps {
  selectedTrip?: Trip;
  onTripSelect: (trip: Trip) => void;
  trips: Trip[];
  onTripAdd: (
    trip: TripAddData,
  ) => Promise<Trip | null | false | void> | Trip | null | false | void;
  onTripUpdate?: (id: string, trip: TripAddData) => void;
  onTripDelete?: (id: string) => void;
  open?: boolean;
}

export default function TripSelector({
  selectedTrip,
  onTripSelect,
  trips,
  onTripAdd,
  onTripUpdate,
  onTripDelete,
  open,
}: TripSelectorProps) {
  const dropdownRef = useRef<View>(null);
  const [showDropdown, setIsDropdownOpen, handleOutsidePress] = useDetectClose(
    dropdownRef,
    false,
  );

  const arrowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(arrowAnim, {
      toValue: showDropdown ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [showDropdown]);
  const arrowRotate = arrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

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
  const [tripNameToDelete, setTripNameToDelete] = useState("");
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState<{
    mode: string;
    params?: any;
  } | null>(null);
  const tripItemRefs = React.useRef<{ [key: string]: View | null }>({});
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const isSubmittingAddRef = useRef(false);
  const isSubmittingEditRef = useRef(false);
  const [periodShrinkConfirmVisible, setPeriodShrinkConfirmVisible] =
    useState(false);

  const today = dayjs().format("YYYY-MM-DD");

  const sortedTrips = useMemo(() => {
    const ongoing = trips.filter(
      t => t.startDate <= today && t.endDate >= today,
    );
    const upcoming = trips
      .filter(t => t.startDate > today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const past = trips
      .filter(t => t.endDate < today)
      .sort((a, b) => b.endDate.localeCompare(a.endDate));
    return [...ongoing, ...upcoming, ...past];
  }, [trips, today]);

  const isPastTrip = (trip: Trip) => trip.endDate < today;

  const handleTripSelect = (trip: Trip) => {
    onTripSelect(trip);
    setIsDropdownOpen(false);
  };

  React.useEffect(() => {
    if (editingTrip && showEditModal) {
      editTripForm.setFormData({
        name: editingTrip.name,
        segments: editingTrip.segments?.map(s => ({
          country: s.country,
          city: s.city,
          startDate: s.startDate,
          endDate: s.endDate,
        })) ?? [
          {
            country: "",
            city: "",
            startDate: editingTrip.startDate,
            endDate: editingTrip.endDate,
          },
        ],
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

      const tripName =
        createdTrip && typeof createdTrip === "object" && "name" in createdTrip
          ? createdTrip.name
          : addTripForm.tripData.name;

      addTripForm.resetForm();
      setShowAddModal(false);
      setIsDropdownOpen(false);
      setResultModalConfig({ mode: "add", params: { tripName } });
      setResultModalVisible(true);
    } finally {
      isSubmittingAddRef.current = false;
      setIsSubmittingAdd(false);
    }
  };

  const doEditTrip = async () => {
    if (!editingTrip) return;

    isSubmittingEditRef.current = true;
    setIsSubmittingEdit(true);

    try {
      const result = onTripUpdate?.(editingTrip.id, {
        name: editTripForm.tripData.name.trim(),
        segments: editTripForm.tripData.segments,
      });

      if (result && typeof result === "object" && "then" in result) {
        await result;
      }

      setEditingTrip(null);
      setShowEditModal(false);
      setIsDropdownOpen(false);
      setResultModalConfig({ mode: "edit" });
      setResultModalVisible(true);
    } finally {
      isSubmittingEditRef.current = false;
      setIsSubmittingEdit(false);
    }
  };

  const handleEditTrip = async () => {
    if (isSubmittingEditRef.current || isSubmittingEdit) return;
    if (!editingTrip) return;

    const newSegments = editTripForm.tripData.segments.filter(
      s => s.startDate && s.endDate,
    );
    const newStartDates = newSegments.map(s => s.startDate).sort();
    const newEndDates = newSegments.map(s => s.endDate).sort();
    const newStart = newStartDates[0] ?? "";
    const newEnd = newEndDates[newEndDates.length - 1] ?? "";
    const periodShrunk =
      newStart > editingTrip.startDate || newEnd < editingTrip.endDate;

    if (periodShrunk) {
      setPeriodShrinkConfirmVisible(true);
      return;
    }

    await doEditTrip();
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
      setResultModalConfig({ mode: "delete" });
      setResultModalVisible(true);
    }
  };

  const openEditModal = (trip: Trip) => {
    setEditingTrip(trip);
    setShowEditModal(true);
    setIsDropdownOpen(false);
  };

  React.useEffect(() => {
    if (!showDropdown) {
      setOpenMenuTripId(null);
      setMenuPosition(null);
    }
  }, [showDropdown]);

  useEffect(() => {
    if (!showDropdown) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsDropdownOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showDropdown]);

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    return `${start.format("M월 D일")} - ${end.format("M월 D일")}`;
  };

  const containerRef = React.useRef<View>(null);
  const [containerLayout, setContainerLayout] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  React.useEffect(() => {
    if (openMenuTripId && containerRef.current) {
      containerRef.current.measure((_x, _y, width, height, pageX, pageY) => {
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
        style={styles.selector}
        onPress={() => setIsDropdownOpen(!showDropdown)}
      >
        <View style={styles.selectorContent}>
          <Text
            style={styles.selectorText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {selectedTrip ? selectedTrip.name : "여행 선택"}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: arrowRotate }] }}>
          <DownArrowIcon width={12} height={12} />
        </Animated.View>
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
            onResponderGrant={e => e.stopPropagation()}
          >
            <View style={styles.dropdown} pointerEvents="box-none">
              <ScrollView
                style={styles.tripList}
                contentContainerStyle={styles.tripListContent}
                showsVerticalScrollIndicator={false}
              >
                {sortedTrips.map(trip => (
                  <Pressable
                    key={trip.id}
                    ref={ref => {
                      tripItemRefs.current[trip.id] = ref;
                    }}
                    style={[
                      styles.tripItem,
                      selectedTrip?.id === trip.id && styles.selectedTripItem,
                      hoveredTripId === trip.id && styles.tripItemHovered,
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
                      <Text
                        style={[
                          styles.tripName,
                          isPastTrip(trip) && styles.tripNamePast,
                          selectedTrip?.id === trip.id &&
                            styles.selectedTripText,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {trip.name}
                      </Text>
                      <Text
                        style={[
                          styles.tripDate,
                          selectedTrip?.id === trip.id &&
                            styles.selectedTripText,
                        ]}
                      >
                        {formatDateRange(trip.startDate, trip.endDate)}
                      </Text>
                    </View>
                    <View style={styles.dotsButtonContainer}>
                      <Pressable
                        style={styles.dotsButton}
                        onPress={e => {
                          e.stopPropagation();
                          const itemRef = tripItemRefs.current[trip.id];
                          if (itemRef) {
                            itemRef.measure(
                              (_x, _y, width, height, pageX, pageY) => {
                                const menuTop = pageY + height / 2 + 16;
                                const screenWidth =
                                  Dimensions.get("window").width;
                                const menuRight =
                                  screenWidth - (pageX + width) - 54;
                                setMenuPosition({
                                  top: menuTop,
                                  right: menuRight,
                                });
                                setOpenMenuTripId(
                                  openMenuTripId === trip.id ? null : trip.id,
                                );
                              },
                            );
                          } else {
                            const tripIndex = trips.findIndex(
                              t => t.id === trip.id,
                            );
                            if (containerLayout) {
                              const selectorHeight = 32;
                              const menuTop =
                                containerLayout.y +
                                selectorHeight +
                                4 +
                                tripIndex * 64 +
                                16 +
                                28;
                              const screenWidth =
                                Dimensions.get("window").width;
                              const menuRight =
                                screenWidth -
                                containerLayout.x -
                                containerLayout.width +
                                50;
                              setMenuPosition({
                                top: menuTop,
                                right: menuRight,
                              });
                            }
                            setOpenMenuTripId(
                              openMenuTripId === trip.id ? null : trip.id,
                            );
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
                <TripAddIcon
                  width={11}
                  height={11}
                  color={colors.primary}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.addTripButtonText}>새 여행 추가</Text>
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
                <View
                  style={[
                    styles.menuContainerModal,
                    { top: menuPosition.top, right: menuPosition.right },
                  ]}
                >
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
                    <DeleteIcon width={14} height={14} color={colors.warning} />
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
        activeSegmentIndex={addTripForm.activeSegmentIndex}
        selectionMode={addTripForm.selectionMode}
        onNameChange={name => addTripForm.updateTripData({ name })}
        onSegmentUpdate={addTripForm.updateSegment}
        onSegmentAdd={addTripForm.addSegment}
        onSegmentRemove={addTripForm.removeSegment}
        onSegmentMove={addTripForm.moveSegment}
        onSegmentFocus={addTripForm.setActiveSegmentIndex}
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
        activeSegmentIndex={editTripForm.activeSegmentIndex}
        onNameChange={name => editTripForm.updateTripData({ name })}
        selectionMode={editTripForm.selectionMode}
        onSegmentUpdate={editTripForm.updateSegment}
        onSegmentAdd={editTripForm.addSegment}
        onSegmentRemove={editTripForm.removeSegment}
        onSegmentMove={editTripForm.moveSegment}
        onSegmentFocus={editTripForm.setActiveSegmentIndex}
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

      <TripDeleteConfirmModal
        visible={periodShrinkConfirmVisible}
        onClose={() => setPeriodShrinkConfirmVisible(false)}
        tripName=""
        title="여행 기간이 줄어들어요"
        description={`변경된 기간 밖에 등록된 일정은\n캘린더에 그대로 남아요. 저장할까요?`}
        confirmLabel="저장"
        confirmButtonColor={colors.primary}
        onConfirm={async () => {
          setPeriodShrinkConfirmVisible(false);
          await doEditTrip();
        }}
      />

      <ResultModal
        visible={resultModalVisible}
        onClose={() => {
          setResultModalVisible(false);
          setResultModalConfig(null);
        }}
        mode={resultModalConfig?.mode || ""}
        params={resultModalConfig?.params}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 220,
    maxWidth: 260,
    height: 32,
    alignSelf: "flex-start",
  },
  selectorOpen: {},
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
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 9999,
    marginTop: 6,
  },
  dropdown: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 36,
    elevation: 8,
  },
  selectedTripHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    maxHeight: 296,
  },
  tripListContent: {
    gap: 2,
  },
  tripItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tripItemHovered: {
    backgroundColor: colors.gray100,
  },
  selectedTripItem: {
    backgroundColor: "rgb(246, 248, 251)",
  },
  tripInfo: {
    flex: 1,
    minWidth: 0,
  },
  tripName: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  tripNamePast: {
    color: colors.gray500,
  },
  tripDate: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: textStyles.body5.fontFamily,
    color: colors.gray500,
    marginTop: 1,
  },
  selectedTripText: {
    color: colors.gray900,
  },
  dotsButtonContainer: {
    flexShrink: 0,
  },
  dotsButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  menuModalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  menuContainerModal: {
    position: "absolute",
    backgroundColor: colors.white,
    borderRadius: 10,
    width: 89,
    height: 72,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    height: 36,
    backgroundColor: "rgba(26, 102, 224, 0.08)",
    borderRadius: 8,
  },
  addTripPlusText: {
    fontSize: 14,
    lineHeight: 14,
    color: colors.primary,
    marginRight: 4,
    marginTop: -1,
  },
  addTripButtonText: {
    ...textStyles.h8,
    fontSize: 12,
    lineHeight: 18,
    color: colors.primary,
  },
});
