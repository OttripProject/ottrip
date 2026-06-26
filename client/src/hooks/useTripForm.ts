import dayjs from "dayjs";
import { useCallback, useState } from "react";

export type SelectionType = "single" | "start" | "end" | "range" | undefined;
type CalendarDayMark = { selection?: SelectionType; selected?: boolean };
export type CalendarMarkedDates = Record<string, CalendarDayMark>;

export interface SegmentDraft {
  country: string;
  city: string;
  startDate: string;
  endDate: string;
}

interface TripFormData {
  name: string;
  segments: SegmentDraft[];
}

const emptySegment = (): SegmentDraft => ({
  country: "",
  city: "",
  startDate: "",
  endDate: "",
});

export const useTripForm = (initialData?: Partial<TripFormData>) => {
  const [tripData, setTripData] = useState<TripFormData>({
    name: initialData?.name || "",
    segments: initialData?.segments?.length
      ? initialData.segments
      : [emptySegment()],
  });

  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [selectionMode, setSelectionMode] = useState<"start" | "end">("start");

  const addSegment = useCallback(() => {
    setTripData(prev => ({
      ...prev,
      segments: [...prev.segments, emptySegment()],
    }));
    setActiveSegmentIndex(prev => prev + 1);
    setSelectionMode("start");
  }, []);

  const removeSegment = useCallback((index: number) => {
    setTripData(prev => {
      if (prev.segments.length <= 1) return prev;
      const next = prev.segments.filter((_, i) => i !== index);
      return { ...prev, segments: next };
    });
    setActiveSegmentIndex(prev =>
      index <= prev ? Math.max(0, prev - 1) : prev,
    );
  }, []);

  const moveSegment = useCallback((fromIndex: number, toIndex: number) => {
    setTripData(prev => {
      const segments = [...prev.segments];
      const [moved] = segments.splice(fromIndex, 1);
      segments.splice(toIndex, 0, moved);
      return { ...prev, segments };
    });
    setActiveSegmentIndex(toIndex);
  }, []);

  const updateSegment = useCallback(
    (index: number, data: Partial<SegmentDraft>) => {
      setTripData(prev => {
        const segments = prev.segments.map((s, i) =>
          i === index ? { ...s, ...data } : s,
        );
        return { ...prev, segments };
      });
    },
    [],
  );

  const handleDateSelect = useCallback(
    (dateString: string) => {
      setTripData(prev => {
        const segment = prev.segments[activeSegmentIndex];
        if (!segment) return prev;

        let updated: SegmentDraft;
        if (selectionMode === "start") {
          updated = { ...segment, startDate: dateString, endDate: "" };
        } else {
          if (dayjs(dateString).isBefore(dayjs(segment.startDate))) {
            updated = {
              ...segment,
              startDate: dateString,
              endDate: segment.startDate,
            };
          } else {
            updated = { ...segment, endDate: dateString };
          }
        }

        const segments = prev.segments.map((s, i) =>
          i === activeSegmentIndex ? updated : s,
        );
        return { ...prev, segments };
      });

      setSelectionMode(prev => (prev === "start" ? "end" : "start"));
    },
    [activeSegmentIndex, selectionMode],
  );

  const getMarkedDates = useCallback((): CalendarMarkedDates => {
    const marked: CalendarMarkedDates = {};

    tripData.segments.forEach((segment, idx) => {
      if (!segment.startDate) return;

      const start = dayjs(segment.startDate);
      const end = segment.endDate ? dayjs(segment.endDate) : null;

      if (!end || start.isSame(end, "day")) {
        marked[start.format("YYYY-MM-DD")] = {
          selection: "single",
          selected: true,
        };
        return;
      }

      marked[start.format("YYYY-MM-DD")] = { selection: "start", selected: true };
      marked[end.format("YYYY-MM-DD")] = { selection: "end", selected: true };

      let current = start.add(1, "day");
      while (current.isBefore(end, "day")) {
        marked[current.format("YYYY-MM-DD")] = {
          selection: "range",
          selected: true,
        };
        current = current.add(1, "day");
      }
    });

    return marked;
  }, [tripData.segments]);

  const updateTripData = useCallback(
    (data: Partial<{ name: string }>) => {
      setTripData(prev => ({ ...prev, ...data }));
    },
    [],
  );

  const resetForm = useCallback(() => {
    setTripData({
      name: initialData?.name || "",
      segments: initialData?.segments?.length
        ? initialData.segments
        : [emptySegment()],
    });
    setActiveSegmentIndex(0);
    setSelectionMode("start");
  }, [initialData]);

  const setFormData = useCallback((data: TripFormData) => {
    setTripData(data);
    setActiveSegmentIndex(0);
    setSelectionMode("start");
  }, []);

  const isSubmitDisabled =
    !tripData.name.trim() ||
    tripData.segments.length === 0 ||
    tripData.segments.some(
      s => !s.country.trim() || !s.city.trim() || !s.startDate || !s.endDate,
    );

  return {
    tripData,
    activeSegmentIndex,
    selectionMode,
    setActiveSegmentIndex,
    addSegment,
    removeSegment,
    moveSegment,
    updateSegment,
    handleDateSelect,
    getMarkedDates,
    updateTripData,
    resetForm,
    setFormData,
    isSubmitDisabled,
  };
};
