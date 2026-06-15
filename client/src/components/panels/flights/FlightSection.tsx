import type {
  DocumentUploadAnalyzeResponse,
  LocalFile,
  StagedDocumentAnalyzePayload,
} from "@/types/api";
import { useEffect, useLayoutEffect, useState } from "react";
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
  stagedDocumentAnalyze,
  onConsumeStagedDocumentAnalyze,
  routeDocumentAnalyzeSuccess,
  carryoverPendingFiles,
  onConsumeCarryoverPendingFiles,
}: FlightSectionProps) {
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [editingFlight, setEditingFlight] = useState<any | null>(null);

  useEffect(() => {
    if (activeTab === "flight" && !selectedFlight) {
      if (openNewFlightForm) {
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
    } else if (activeTab === "flight" && !selectedFlight) {
      setEditingFlight(null);
      setShowFlightForm(false);
    }
  }, [activeTab, selectedFlight]);

  const handleFlightSave = (flight: any) => {
    onFlightAdd?.(flight);
    setShowFlightForm(false);
    setEditingFlight(null);
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
        key={editingFlight?.id ?? "new-flight"}
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
