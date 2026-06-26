import TripFormModal from "@/components/modals/TripFormModal";
import { useTripForm } from "@/hooks/useTripForm";
import type { CreatePlanRequest, Plan } from "@/types/api";
import { textStyles } from "@/ui/tokens/typography";
import { colors } from "@/ui/tokens/colors";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import CalenderIcon from "../../../assets/calender.svg";
import PlusIcon from "../../../assets/mobile_plus.svg"

interface EmptyPlanPanelProps {
  onPlanAdd: (planData: CreatePlanRequest) => Promise<Plan>;
  onTripCreated?: (trip: {
    id: string;
    publicId: string;
    name: string;
    startDate: string;
    endDate: string;
  }) => void;
}

export default function EmptyPlanPanel({
  onPlanAdd,
  onTripCreated,
}: EmptyPlanPanelProps) {
  const [showModal, setShowModal] = useState(false);
  const planForm = useTripForm();

  const handleSubmit = async () => {
    try {
      const created = await onPlanAdd({
        title: planForm.tripData.name,
        startDate: planForm.tripData.startDate,
        endDate: planForm.tripData.endDate,
      });
      if (created) {
        const tripData = {
          id: created.id.toString(),
          publicId: created.publicId,
          name: created.title,
          startDate: created.startDate,
          endDate: created.endDate,
        };
        setShowModal(false);
        planForm.resetForm();
        onTripCreated?.(tripData);
      }
    } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <CalenderIcon
            width={28}
            height={28}
            color={colors.gray500}
            opacity={0.5}
          />
        </View>
        <Text style={styles.title}>등록된 여행이 없어요</Text>
        <Text style={styles.subtitle}>새 여행을 추가하고 일정을 만들어 보세요</Text>
        <Pressable style={styles.button} onPress={() => setShowModal(true)}>
          <PlusIcon width={14} height={14} color={colors.white} />
          <Text style={styles.buttonText}>새 여행 추가</Text>
        </Pressable>
      </View>

      <TripFormModal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          planForm.resetForm();
        }}
        mode="add"
        tripData={planForm.tripData}
        onTripDataChange={planForm.updateTripData}
        markedDates={planForm.getMarkedDates()}
        onDateSelect={planForm.handleDateSelect}
        onSubmit={handleSubmit}
        isSubmitDisabled={planForm.isSubmitDisabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  content: {
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.gray900,
    lineHeight: 24,
  },
  subtitle: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  button: {
    marginTop: 8,
    height: 44,
    paddingHorizontal: 24,
    backgroundColor: colors.black,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  buttonText: {
    ...textStyles.h7,
    color: colors.white,
  },
});
