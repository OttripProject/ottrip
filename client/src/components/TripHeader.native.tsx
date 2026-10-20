import AddPlanModal from "@/components/modals/mobile/AddPlanModal.native";
import PlanSelectModal from "@/components/modals/mobile/PlanSelectModal.native";
import ProfileModal from "@/components/modals/mobile/ProfileModal.native";
import TravelInfoModal from "@/components/modals/mobile/TravelInfoModal.native";
import { useSelectedPlan } from "@/contexts/SelectedPlanContext";
import { usePlanDataQuery } from "@/hooks/usePlanDataQuery";
import { usePlansQuery } from "@/hooks/usePlansQuery";
import type { Plan } from "@/types/api";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { guestPrompt } from "@/utils/guestPrompt";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DotsIcon from "../../assets/dots.svg";
import InfoCircleIcon from "../../assets/info_circle.svg";
import CalendarIcon from "../../assets/mobile_calendar_black.svg";
import DropdownIcon from "../../assets/mobile_dropdown.svg";
import LocationIcon from "../../assets/mobile_location.svg";
import PersonIcon from "../../assets/person_outline.svg";

interface TripHeaderProps {
  onCalendarPress: () => void;
}

export default function TripHeader({ onCalendarPress }: TripHeaderProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const plansQuery = usePlansQuery();
  const { selectedPlan, setSelectedPlan } = useSelectedPlan();
  const planData = usePlanDataQuery(selectedPlan?.publicId || null);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [travelInfoModalVisible, setTravelInfoModalVisible] = useState(false);
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);
  const [moreMenuTop, setMoreMenuTop] = useState(0);
  const topRowRef = useRef<View>(null);
  const pendingMenuActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return guestPrompt.registerBeforeSignUpNavigation(() => {
      setProfileModalVisible(false);
      setTravelInfoModalVisible(false);
    });
  }, []);

  const openMoreMenu = () => {
    topRowRef.current?.measureInWindow((_x, y, _width, height) => {
      setMoreMenuTop(y + height);
      setMoreMenuVisible(true);
    });
  };

  return (
    <>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View ref={topRowRef} style={styles.headerTopRow}>
          <Pressable
            style={styles.planSelector}
            onPress={() => setShowPlanSelector(true)}
          >
            <Text style={styles.headerTitle} numberOfLines={1}>
              {selectedPlan?.title || "여행 선택"}
            </Text>
            {selectedPlan && (
              <Text style={styles.headerPeriod}>
                {dayjs(selectedPlan.startDate).format("M.D")} –{" "}
                {dayjs(selectedPlan.endDate).format("M.D")}
              </Text>
            )}
            <DropdownIcon width={15} height={15} color={colors.gray900} />
          </Pressable>
          <View style={styles.headerIcons}>
            <Pressable
              style={styles.headerIconButton}
              accessibilityLabel="지도로 일정 보기"
            >
              <LocationIcon width={20} height={20} color={colors.gray900} />
            </Pressable>
            <Pressable
              style={styles.headerIconButton}
              accessibilityLabel="달력에서 날짜 선택"
              onPress={onCalendarPress}
            >
              <CalendarIcon width={20} height={20} color={colors.gray900} />
            </Pressable>
            <Pressable
              style={styles.headerIconButton}
              accessibilityLabel="더보기"
              onPress={openMoreMenu}
            >
              <DotsIcon width={20} height={20} color={colors.black} />
            </Pressable>
          </View>
        </View>
      </View>

      <Modal
        visible={profileModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <ProfileModal
          visible={profileModalVisible}
          onClose={() => setProfileModalVisible(false)}
        />
      </Modal>

      <PlanSelectModal
        visible={showPlanSelector}
        onClose={() => setShowPlanSelector(false)}
        plans={plansQuery.plans || []}
        selectedPlan={selectedPlan}
        onSelectPlan={setSelectedPlan}
        addPlan={plansQuery.addPlan}
        onAddTripPress={() => {
          setEditingPlan(null);
          setShowPlanSelector(false);
          setShowAddPlanModal(true);
        }}
        onEditPlan={plan => {
          setEditingPlan(plan);
          setShowPlanSelector(false);
          setShowAddPlanModal(true);
        }}
        onDeletePlan={async plan => {
          try {
            await plansQuery.deletePlan(plan.id);
            if (selectedPlan?.id === plan.id) {
              const remaining = (plansQuery.plans || []).filter(
                p => p.id !== plan.id,
              );
              setSelectedPlan(remaining[0] ?? null);
            }
            setShowPlanSelector(false);
            Alert.alert("성공", "여행이 삭제되었습니다");
          } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response?.status === 403) {
              Alert.alert("알림", "이 여행을 삭제할 권한이 없습니다");
            } else {
              Alert.alert("알림", "여행 삭제에 실패했습니다");
            }
          }
        }}
      />

      {plansQuery.addPlan && (
        <AddPlanModal
          visible={showAddPlanModal}
          onClose={() => {
            setShowAddPlanModal(false);
            setEditingPlan(null);
            setShowPlanSelector(true);
          }}
          onPlanCreated={plan => {
            setSelectedPlan(plan);
            setShowAddPlanModal(false);
            setEditingPlan(null);
            setTimeout(() => setShowPlanSelector(false), 300);
          }}
          addPlan={plansQuery.addPlan}
          planToEdit={editingPlan}
          updatePlan={plansQuery.updatePlan}
        />
      )}

      {selectedPlan && (
        <TravelInfoModal
          visible={travelInfoModalVisible}
          onClose={() => setTravelInfoModalVisible(false)}
          plan={planData.plan ?? selectedPlan}
          itineraries={planData.itineraries ?? []}
          accommodations={planData.accommodations ?? []}
          flights={planData.flights ?? []}
          expenses={planData.expenses ?? []}
          attachments={planData.attachments ?? []}
          memberCount={planData.shares?.length ?? 0}
          planPublicId={selectedPlan.publicId}
          planId={selectedPlan.id}
          planStartDate={selectedPlan.startDate}
          planEndDate={selectedPlan.endDate}
          onExpenseAdd={expense => planData.addExpense?.(expense)}
          onRefreshExpenses={async () => {
            if (selectedPlan?.publicId) {
              queryClient.invalidateQueries({
                queryKey: ["expenses", selectedPlan.id],
              });
            }
          }}
          onRefreshPlan={async () => {
            if (selectedPlan?.publicId) {
              queryClient.invalidateQueries({
                queryKey: ["plan", selectedPlan.publicId],
              });
              queryClient.invalidateQueries({
                queryKey: ["expenses", selectedPlan.id],
              });
            }
          }}
        />
      )}

      <Modal
        visible={moreMenuVisible}
        transparent
        statusBarTranslucent
        onRequestClose={() => setMoreMenuVisible(false)}
        onDismiss={() => {
          pendingMenuActionRef.current?.();
          pendingMenuActionRef.current = null;
        }}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setMoreMenuVisible(false)}
        />
        <View
          accessibilityRole="menu"
          style={[styles.moreMenu, { top: moreMenuTop }]}
        >
          {[
            {
              label: "여행 정보",
              Icon: InfoCircleIcon,
              onPress: () => setTravelInfoModalVisible(true),
            },
            {
              label: "설정",
              Icon: PersonIcon,
              onPress: () => setProfileModalVisible(true),
            },
          ].map(({ label, Icon, onPress }) => (
            <Pressable
              key={label}
              accessibilityRole="menuitem"
              style={({ pressed }) => [
                styles.moreMenuItem,
                pressed && styles.moreMenuItemPressed,
              ]}
              onPress={() => {
                setMoreMenuVisible(false);
                if (Platform.OS === "ios") {
                  pendingMenuActionRef.current = onPress;
                } else {
                  onPress();
                }
              }}
            >
              <Icon width={20} height={20} color={colors.paletteInk} />
              <Text style={styles.moreMenuText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  planSelector: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTitle: {
    ...textStyles.h3,
    color: colors.gray900,
    flexShrink: 1,
  },
  headerPeriod: {
    ...textStyles.h7,
    color: colors.paletteFg2,
    fontVariant: ["tabular-nums"],
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: -spacing.md,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  moreMenu: {
    position: "absolute",
    right: spacing.md,
    minWidth: 176,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radii.mdPlus,
    backgroundColor: colors.white,
    ...shadows.md,
  },
  moreMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  moreMenuItemPressed: {
    backgroundColor: colors.paletteFill,
  },
  moreMenuText: {
    ...textStyles.body2,
    color: colors.paletteInk,
  },
});
