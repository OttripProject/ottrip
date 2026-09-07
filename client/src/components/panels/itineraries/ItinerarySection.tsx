import { useToast } from "@/contexts/ToastContext";
import type {
  DocumentUploadAnalyzeResponse,
  LocalFile,
  StagedDocumentAnalyzePayload,
} from "@/types/api";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ItineraryItem from "./ItineraryItem";

interface ItinerarySectionProps {
  planData: {
    plan: any;
    itineraries: any[];
    expenses: any[];
    refreshItineraries: () => Promise<void>;
    refreshExpenses: () => Promise<void>;
    addExpense?: (expense: any) => void;
    removeExpense?: (expenseId: number) => void;
    removeItinerary?: (itineraryId: number) => void;
  };
  selectedItinerary?: any;
  activeTab?: "itinerary" | "flight" | "accommodation" | undefined;
  onItineraryAdd?: (itinerary: any) => void;
  onItineraryClear?: () => void;
  openNewItineraryForm?: boolean;
  onConsumeOpenNewItineraryForm?: () => void;
  selectedItineraryDate?: Date | null;
  newItineraryDraft?: any | null;
  onEdit?: (itinerary: any) => void;
  onTabChange?: (tab: "itinerary" | "flight" | "accommodation", draft?: any) => void;
  stagedDocumentAnalyze?: StagedDocumentAnalyzePayload | null;
  onConsumeStagedDocumentAnalyze?: () => void;
  routeDocumentAnalyzeSuccess?: (
    res: DocumentUploadAnalyzeResponse,
    carryPendingFiles?: LocalFile[],
  ) => boolean;
  carryoverPendingFiles?: LocalFile[] | null;
  onConsumeCarryoverPendingFiles?: () => void;
}

export default function ItinerarySection({
  planData,
  selectedItinerary,
  activeTab,
  onItineraryAdd,
  onItineraryClear,
  openNewItineraryForm,
  onConsumeOpenNewItineraryForm,
  selectedItineraryDate,
  newItineraryDraft,
  onEdit,
  onTabChange,
  stagedDocumentAnalyze,
  onConsumeStagedDocumentAnalyze,
  routeDocumentAnalyzeSuccess,
  carryoverPendingFiles,
  onConsumeCarryoverPendingFiles,
}: ItinerarySectionProps) {
  const [showItineraryForm, setShowItineraryForm] = useState(
    openNewItineraryForm || false,
  );
  const [editingItinerary, setEditingItinerary] = useState<any | null>(null);
  const isInitialMountRef = useRef(true);

  const { showToast } = useToast();

  useEffect(() => {
    if (activeTab === "itinerary" && openNewItineraryForm) {
      setEditingItinerary(newItineraryDraft ?? null);
      setShowItineraryForm(true);
      onConsumeOpenNewItineraryForm?.();
    }
  }, [activeTab, openNewItineraryForm, onConsumeOpenNewItineraryForm]);

  useEffect(() => {
    const isInitial = isInitialMountRef.current;
    isInitialMountRef.current = false;

    if (activeTab === "itinerary" && selectedItinerary) {
      if (selectedItinerary.id) {
        setEditingItinerary(selectedItinerary);
        setShowItineraryForm(false);
      }
    } else if (activeTab === "itinerary" && !selectedItinerary) {
      // 마운트 시엔 null 리셋 생략 — draft가 이미 Effect #1에서 설정됨
      if (!isInitial) {
        setEditingItinerary(null);
      }
      setShowItineraryForm(true);
    }
  }, [activeTab, selectedItinerary]);

  useLayoutEffect(() => {
    if (!stagedDocumentAnalyze) return;
    const kind =
      stagedDocumentAnalyze.result.inferredItemType ??
      stagedDocumentAnalyze.result.draft?.itemType;
    if (kind !== "itinerary") return;
    if (selectedItinerary?.id && !showItineraryForm) {
      setEditingItinerary(selectedItinerary);
      setShowItineraryForm(true);
    }
  }, [stagedDocumentAnalyze, selectedItinerary, showItineraryForm]);

  const handleOpenNewItinerary = (draft: any) => {
    setEditingItinerary(draft);
    setShowItineraryForm(true);
  };

  const handleItinerarySave = async (itinerary: any) => {
    onItineraryAdd?.(itinerary);
    setShowItineraryForm(false);
    setEditingItinerary(null);
    showToast("일정을 저장했습니다")
  };

  const handleItineraryDelete = (itineraryId?: string | number) => {
    if (itineraryId) {
      const id =
        typeof itineraryId === "string"
          ? Number.parseInt(itineraryId)
          : itineraryId;
      if (planData?.removeItinerary) {
        planData.removeItinerary(id);
      }
    }
    setShowItineraryForm(false);
    setEditingItinerary(null);
    onItineraryClear?.();
    showToast("일정을 삭제했습니다")
  };

  if (selectedItinerary && !showItineraryForm) {
    return (
      <ItineraryItem
        key={`view-${selectedItinerary.id}`}
        itinerary={selectedItinerary}
        planId={planData.plan.id}
        planData={planData}
        onSave={handleItinerarySave}
        onCancel={() => {
          setShowItineraryForm(false);
          setEditingItinerary(null);
          onItineraryClear?.();
        }}
        onDelete={handleItineraryDelete}
        selectedDate={selectedItineraryDate || undefined}
        readOnly={true}
        activeTab={activeTab}
        onTabChange={onTabChange}
        stagedDocumentAnalyze={stagedDocumentAnalyze}
        onConsumeStagedDocumentAnalyze={onConsumeStagedDocumentAnalyze}
        routeDocumentAnalyzeSuccess={routeDocumentAnalyzeSuccess}
        carryoverPendingFiles={carryoverPendingFiles}
        onConsumeCarryoverPendingFiles={onConsumeCarryoverPendingFiles}
        onEdit={() => {
          setEditingItinerary(selectedItinerary);
          setShowItineraryForm(true);
          onEdit?.(selectedItinerary);
        }}
        onOpenNewItinerary={handleOpenNewItinerary}
      />
    );
  }

  if (showItineraryForm) {
    return (
      <ItineraryItem
        key={`form-${editingItinerary?.id ?? "new"}`}
        itinerary={editingItinerary}
        planId={planData.plan.id}
        planData={planData}
        onSave={handleItinerarySave}
        onCancel={() => {
          setShowItineraryForm(false);
          setEditingItinerary(null);
          onItineraryClear?.();
        }}
        onDelete={handleItineraryDelete}
        selectedDate={selectedItineraryDate || undefined}
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
