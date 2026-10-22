import type { MapStop } from "@/components/map/MapScheduleSheet.native";
import AccommodationDetailModal from "@/components/modals/mobile/AccommodationDetailModal.native";
import AccommodationEditModal from "@/components/modals/mobile/AccommodationEditModal.native";
import ItineraryDetailModal from "@/components/modals/mobile/ItineraryDetailModal.native";
import ItineraryEditModal from "@/components/modals/mobile/ItineraryEditModal.native";
import type { usePlanDataQuery } from "@/hooks/usePlanDataQuery";
import { accommodationsApi } from "@/services/accommodations";
import { itinerariesApi } from "@/services/itineraries";
import {
  collectPlanItemDates,
  shrinkPlanIfNeeded,
} from "@/utils/shrinkPlanIfNeeded";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useRef, useState } from "react";
import { Alert } from "react-native";

interface MapStopModalsProps {
  stop: MapStop | null;
  planData: ReturnType<typeof usePlanDataQuery>;
  onClose: () => void;
}

export default function MapStopModals({
  stop,
  planData,
  onClose,
}: MapStopModalsProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const editRequested = useRef(false);
  const plan = planData.plan;
  const itinerary = stop?.itinerary ?? null;
  const accommodation = stop?.accommodation ?? null;

  const stopDate = itinerary?.itineraryDate ?? accommodation?.checkinDate;
  const dateStr = stopDate ? dayjs(stopDate).format("YYYY-MM-DD") : null;
  const segment =
    (dateStr &&
      plan?.segments?.find(
        seg => seg.startDate <= dateStr && dateStr <= seg.endDate,
      )) ||
    null;

  const invalidatePlan = () => {
    if (!plan) return;
    queryClient.invalidateQueries({ queryKey: ["expenses", plan.id] });
    queryClient.invalidateQueries({ queryKey: ["checklist", plan.publicId] });
    queryClient.invalidateQueries({ queryKey: ["plan", plan.publicId] });
    queryClient.invalidateQueries({ queryKey: ["plans"] });
  };

  const afterItineraryRemoved = async (itineraryId: number) => {
    if (!plan) return;
    const remainingDates = collectPlanItemDates(
      planData.itineraries.filter(it => it.id !== itineraryId),
      planData.flights,
      planData.accommodations,
    );
    await shrinkPlanIfNeeded(plan.id, plan, remainingDates);
    planData.removeItinerary(itineraryId);
    invalidatePlan();
    planData.refreshAttachments();
    onClose();
  };

  const afterAccommodationRemoved = async (accommodationId: number) => {
    if (!plan) return;
    const remainingDates = collectPlanItemDates(
      planData.itineraries,
      planData.flights,
      planData.accommodations.filter(acc => acc.id !== accommodationId),
    );
    await shrinkPlanIfNeeded(plan.id, plan, remainingDates);
    planData.removeAccommodation(accommodationId);
    invalidatePlan();
    planData.refreshAttachments();
    onClose();
  };

  const handleEdit = () => {
    editRequested.current = true;
    setEditing(true);
  };

  const handleDetailClose = () => {
    if (!editRequested.current) onClose();
  };

  const handleEditClose = (opts?: { fromSave?: boolean }) => {
    editRequested.current = false;
    setEditing(false);
    if (opts?.fromSave) onClose();
  };

  return (
    <>
      <ItineraryDetailModal
        visible={!!itinerary && !editing}
        onClose={handleDetailClose}
        itinerary={itinerary}
        planExpenses={planData.expenses}
        attachments={planData.attachments}
        onEdit={handleEdit}
        onDelete={async target => {
          try {
            await itinerariesApi.deleteItinerary(target.id);
            await afterItineraryRemoved(target.id);
            Alert.alert("삭제완료", "일정이 삭제되었습니다");
          } catch {
            Alert.alert("알림", "일정 삭제에 실패했습니다");
          }
        }}
      />
      <ItineraryEditModal
        visible={!!itinerary && editing}
        onClose={handleEditClose}
        itinerary={itinerary}
        planId={plan?.id ?? 0}
        defaultCountry={segment?.country}
        defaultCity={segment?.city}
        onSave={saved => {
          planData.addItinerary(saved);
          invalidatePlan();
          planData.refreshAttachments();
        }}
        onDelete={afterItineraryRemoved}
      />

      <AccommodationDetailModal
        visible={!!accommodation && !editing}
        onClose={handleDetailClose}
        accommodation={accommodation}
        attachments={planData.attachments}
        onEdit={handleEdit}
        onDelete={async target => {
          try {
            await accommodationsApi.deleteAccommodation(target.id);
            await afterAccommodationRemoved(target.id);
            Alert.alert("삭제완료", "숙소가 삭제되었습니다.");
          } catch {
            Alert.alert("알림", "숙소 삭제에 실패했습니다.");
          }
        }}
      />
      <AccommodationEditModal
        visible={!!accommodation && editing}
        onClose={handleEditClose}
        accommodation={accommodation}
        planId={plan?.id ?? 0}
        defaultCountry={segment?.country}
        defaultCity={segment?.city}
        onSave={saved => {
          planData.addAccommodation(saved);
          invalidatePlan();
          planData.refreshAttachments();
        }}
        onDelete={afterAccommodationRemoved}
      />
    </>
  );
}
