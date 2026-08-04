import { useToast } from "@/contexts/ToastContext";

import type {
  DocumentUploadAnalyzeResponse,
  LocalFile,
  StagedDocumentAnalyzePayload,
} from "@/types/api";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import FlightItem from "./FlightItem";

interface FlightSectionProps {
  planData: {
    plan: any;
    flights: any[];
    itineraries: any[];
    accommodations: any[];
    expenses: any[];
    refreshFlights: () => Promise<void>;
    refreshExpenses: () => Promise<void>;
    removeFlight?: (flightId: number) => void;
  };
  selectedFlight?: any;
  activeTab?: "itinerary" | "flight" | "accommodation" | undefined;
  onFlightAdd?: (flight: any) => void;
  onFlightClear?: () => void;
  openNewFlightForm?: boolean;
  onConsumeOpenNewFlightForm?: () => void;
  onEdit?: (flight: any) => void;
  onTabChange?: (tab: "itinerary" | "flight" | "accommodation") => void;
  stagedDocumentAnalyze?: StagedDocumentAnalyzePayload | null;
  onConsumeStagedDocumentAnalyze?: () => void;
  routeDocumentAnalyzeSuccess?: (
    res: DocumentUploadAnalyzeResponse,
    carryPendingFiles?: LocalFile[],
  ) => boolean;
  carryoverPendingFiles?: LocalFile[] | null;
  onConsumeCarryoverPendingFiles?: () => void;
}

export default function FlightSection({
  planData,
  selectedFlight,
  activeTab,
  onFlightAdd,
  onFlightClear,
  openNewFlightForm,
  onConsumeOpenNewFlightForm,
  onEdit,
  onTabChange,
  stagedDocumentAnalyze,
  onConsumeStagedDocumentAnalyze,
  routeDocumentAnalyzeSuccess,
  carryoverPendingFiles,
  onConsumeCarryoverPendingFiles,
}: FlightSectionProps) {
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [editingFlight, setEditingFlight] = useState<any | null>(null);
  const newFlightRevision = useRef(0);

  const { showToast } = useToast();

  useEffect(() => {
    if (activeTab === "flight" && !selectedFlight) {
      if (openNewFlightForm) {
        newFlightRevision.current += 1;
        setEditingFlight(null);
        setShowFlightForm(true);
        onConsumeOpenNewFlightForm?.();
      } else if (!showFlightForm) {
        setEditingFlight(null);
        setShowFlightForm(true);
      }
    }
  }, [
    activeTab,
    openNewFlightForm,
    onConsumeOpenNewFlightForm,
    selectedFlight,
    showFlightForm,
  ]);

  useLayoutEffect(() => {
    if (!stagedDocumentAnalyze) return;
    const kind =
      stagedDocumentAnalyze.result.inferredItemType ??
      stagedDocumentAnalyze.result.draft?.itemType;
    if (kind !== "flight") return;
    if (selectedFlight?.id && !showFlightForm) {
      setEditingFlight(selectedFlight);
      setShowFlightForm(true);
    }
  }, [stagedDocumentAnalyze, selectedFlight, showFlightForm]);

  useEffect(() => {
    if (activeTab === "flight" && selectedFlight) {
      if (selectedFlight.id) {
        setEditingFlight(selectedFlight);
        setShowFlightForm(false);
      }
    }
  }, [activeTab, selectedFlight]);

  const handleFlightSave = (flight: any) => {
    onFlightAdd?.(flight);
    setShowFlightForm(false);
    setEditingFlight(null);
    showToast("항공편을 저장했습니다")
  };

  const handleFlightDelete = (flightId: string) => {
    const id =
      typeof flightId === "string" ? Number.parseInt(flightId, 10) : flightId;
    if (planData?.removeFlight) {
      planData.removeFlight(id);
    }
    setShowFlightForm(false);
    setEditingFlight(null);
    onFlightClear?.();
    showToast("항공편을 삭제했습니다")
  };

  if (selectedFlight && !showFlightForm) {
    return (
      <FlightItem
        flight={selectedFlight}
        planId={planData.plan.id}
        planData={planData}
        onSave={handleFlightSave}
        onCancel={() => {
          setShowFlightForm(false);
          setEditingFlight(null);
          onFlightClear?.();
        }}
        onDelete={handleFlightDelete}
        readOnly={true}
        activeTab={activeTab}
        onTabChange={onTabChange}
        stagedDocumentAnalyze={stagedDocumentAnalyze}
        onConsumeStagedDocumentAnalyze={onConsumeStagedDocumentAnalyze}
        routeDocumentAnalyzeSuccess={routeDocumentAnalyzeSuccess}
        carryoverPendingFiles={carryoverPendingFiles}
        onConsumeCarryoverPendingFiles={onConsumeCarryoverPendingFiles}
        onEdit={() => {
          setEditingFlight(selectedFlight);
          setShowFlightForm(true);
          onEdit?.(selectedFlight);
        }}
      />
    );
  }

  if (showFlightForm) {
    return (
      <FlightItem
        key={editingFlight?.id ?? `new-flight-${newFlightRevision.current}`}
        flight={editingFlight}
        planId={planData.plan.id}
        planData={planData}
        onSave={handleFlightSave}
        onCancel={() => {
          setShowFlightForm(false);
          setEditingFlight(null);
          onFlightClear?.();
        }}
        onDelete={handleFlightDelete}
        existingFlights={planData.flights}
        readOnly={false}
        activeTab={activeTab}
        onTabChange={onTabChange}
        stagedDocumentAnalyze={stagedDocumentAnalyze}
        onConsumeStagedDocumentAnalyze={onConsumeStagedDocumentAnalyze}
        routeDocumentAnalyzeSuccess={routeDocumentAnalyzeSuccess}
        carryoverPendingFiles={carryoverPendingFiles}
        onConsumeCarryoverPendingFiles={onConsumeCarryoverPendingFiles}
      />
    );
  }

  return null;
}
