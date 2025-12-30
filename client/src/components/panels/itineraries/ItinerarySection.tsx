import React, { useState, useEffect } from 'react';
import ItineraryItem from './ItineraryItem';

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
  activeTab?: 'itinerary' | 'flight' | 'accommodation' | undefined;
  onItineraryAdd?: (itinerary: any) => void;
  onItineraryClear?: () => void;
  openNewItineraryForm?: boolean;
  onConsumeOpenNewItineraryForm?: () => void;
  selectedItineraryDate?: Date | null;
  onEdit?: (itinerary: any) => void;
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
  onEdit,
}: ItinerarySectionProps) {
  const [showItineraryForm, setShowItineraryForm] = useState(openNewItineraryForm || false);
  const [editingItinerary, setEditingItinerary] = useState<any | null>(null);

  useEffect(() => {
    if (activeTab === 'itinerary' && openNewItineraryForm) {
      setEditingItinerary(null);
      setShowItineraryForm(true);
      onConsumeOpenNewItineraryForm?.();
    }
  }, [activeTab, openNewItineraryForm, onConsumeOpenNewItineraryForm]);

  useEffect(() => {
    if (activeTab === 'itinerary' && selectedItinerary) {
      if (selectedItinerary.id) {
        setEditingItinerary(selectedItinerary);
        setShowItineraryForm(false);
      }
    } else if (activeTab === 'itinerary' && !selectedItinerary) {
      setEditingItinerary(null);
      setShowItineraryForm(true);
    }
  }, [activeTab, selectedItinerary]);

  const handleItinerarySave = async (itinerary: any) => {
    onItineraryAdd?.(itinerary);
    setShowItineraryForm(false);
    setEditingItinerary(null);
  };

  const handleItineraryDelete = (itineraryId?: string | number) => {
    if (itineraryId) {
      const id = typeof itineraryId === 'string' ? parseInt(itineraryId) : itineraryId;
      if (planData?.removeItinerary) {
        planData.removeItinerary(id);
      }
    }
    setShowItineraryForm(false);
    setEditingItinerary(null);
    onItineraryClear?.();
  };

  if (selectedItinerary && !showItineraryForm) {
    return (
      <ItineraryItem
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
        onEdit={() => {
          setEditingItinerary(selectedItinerary);
          setShowItineraryForm(true);
          onEdit?.(selectedItinerary);
        }}
      />
    );
  }

  if (showItineraryForm) {
    return (
      <ItineraryItem
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
      />
    );
  }

  return null;
}

