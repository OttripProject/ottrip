import AddScheduleWithAiModal, {
  type Message as AiMessage,
  AI_INTRO_MESSAGE,
} from "@/components/modals/AddScheduleWithAiModal";
import AddScheduleWithFileModal from "@/components/modals/AddScheduleWithFileModal";
import ExportPlanModal from "@/components/modals/ExportPlanModal";
import PlanSelectRequiredModal from "@/components/modals/PlanSelectRequiredModal";
import ResultModal from "@/components/modals/ResultModal";
import SharePlanModal from "@/components/modals/SharePlanModal";
import TripFormModal from "@/components/modals/TripFormModal";
import BaseCalendar from "@/components/popup/calendar/BaseCalendar";
import { PLACEHOLDERS } from "@/constants/placeholders";
import { useMe } from "@/hooks/useMe";
import { useTripForm } from "@/hooks/useTripForm";
import { accommodationsApi } from "@/services/accommodations";
import { flightsApi } from "@/services/flights";
import { itinerariesApi } from "@/services/itineraries";
import { plansApi } from "@/services/plans";
import type { CreatePlanRequest, Plan, UpdatePlanRequest } from "@/types/api";
import Card from "@/ui/components/Card";
import GradientBackground from "@/ui/components/GradientBackground";
import Input from "@/ui/components/input/Input";
import { radii } from "@/ui/tokens";
import { colors } from "@/ui/tokens/colors";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import { guestPrompt } from "@/utils/guestPrompt";
import dayjs from "dayjs";
import ko from "dayjs/locale/ko";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Calendar as BigCalendar } from "react-native-big-calendar";
import TripSelector from "../selector/TripSelector";
import PanelLayout from "./PanelLayout";

import { Tooltip } from "@/ui/components/Tooltip";
import AirplaneIcon from "../../../assets/airplane.svg";
import CalenderIcon from "../../../assets/calender.svg";
import ExportPlanIcon from "../../../assets/export_plan.svg";
import ImportFileIcon from "../../../assets/import_file.svg";
import LeftArrowIcon from "../../../assets/left_arrow.svg";
import MemoIcon from "../../../assets/memo_note.svg";
import LightningIcon from "../../../assets/mobile_lightning.svg";
import RightArrowIcon from "../../../assets/right_arrow.svg";
import ShareIcon from "../../../assets/share_nodes.svg";
import TodayIcon from "../../../assets/today.svg";
import AccommodationIcon from "../../../assets/week_bar_accommodation.svg";
import WeekBarLocationIcon from "../../../assets/week_bar_location.svg";
import WeekBarTimeIcon from "../../../assets/week_bar_time.svg";
import XIcon from "../../../assets/x.svg";
import UploadIcon from "../../../assets/upload_tray.svg";
import { extendPlanIfNeeded } from "@/utils/extendPlanIfNeeded";
import { collectPlanItemDates, shrinkPlanIfNeeded } from "@/utils/shrinkPlanIfNeeded";
import { type ItineraryCategory, itineraryCategoryColors } from "@/types/itinerary";

dayjs.locale(ko);

export interface Itinerary {
  id: number;
  title: string;
  itineraryDate: string;
  startTime: string;
  endTime: string;
  location?: { id: number; name: string; placeId: string; latitude: number; longitude: number; address?: string } | string;
  city?: string;
  color?: string;
  category?: ItineraryCategory;
}

function toEvent(it: Itinerary): any {
  const normalizeTime = (time: string) => {
    return time.split(":").slice(0, 2).join(":");
  };

  const normalizedStartTime = normalizeTime(it.startTime);
  let normalizedEndTime = normalizeTime(it.endTime);
  const locationText = typeof it.location === "object" ? (it.location?.name ?? "") : (it.location || "");

  if (normalizedEndTime === "23:59" || it.endTime?.startsWith("23:59:")) {
    normalizedEndTime = "24:00";
  }

  let endDate = new Date(`${it.itineraryDate}T${normalizedEndTime}:00`);
  if (normalizedEndTime === "24:00") {
    endDate = dayjs(`${it.itineraryDate}T23:59:59`).toDate();
    normalizedEndTime = "24:00";
  }

  const event = {
    id: it.id,
    title: it.title,
    start: new Date(`${it.itineraryDate}T${normalizedStartTime}:00`),
    end: endDate,
    type: "itinerary",
    originalData: it,
    normalizedStartTime,
    normalizedEndTime,
    locationText,
    startDateStr: it.itineraryDate,
  } as any;

  return event;
}

function toFlightEvents(flight: any): any[] {
  if (!flight.flightSegments || flight.flightSegments.length === 0) {
    return [];
  }

  const normalizeTime = (time: string) => {
    return time.split(":").slice(0, 2).join(":");
  };

  const sortedSegments = [...flight.flightSegments].sort(
    (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0),
  );

  return sortedSegments.map((segment: any, index: number) => {
    const departureTime = dayjs(segment.departureTime);
    const arrivalTime = dayjs(segment.arrivalTime);

    const departureDate = departureTime.format("YYYY-MM-DD");
    const arrivalDate = arrivalTime.format("YYYY-MM-DD");
    const isNextDay =
      arrivalDate !== departureDate && arrivalTime.format("HH:mm") === "00:00";

    let displayEndTime = arrivalTime;
    let normalizedEndTime = normalizeTime(arrivalTime.format("HH:mm"));

    if (isNextDay) {
      displayEndTime = departureTime.endOf("day");
      normalizedEndTime = "24:00";
    }

    const normalizedStartTime = normalizeTime(departureTime.format("HH:mm"));

    const totalMinutes = dayjs(segment.arrivalTime).diff(
      departureTime,
      "minute",
    );
    const durationH = Math.floor(totalMinutes / 60);
    const durationM = totalMinutes % 60;
    const durationText =
      durationM > 0 ? `${durationH}h ${durationM}m` : `${durationH}h`;

    return {
      id: `flight-${flight.id}-${segment.id ?? index + 1}`,
      title: `${segment.departureAirport} → ${segment.arrivalAirport}`,
      start: departureTime.toDate(),
      end: displayEndTime.toDate(),
      type: "flight",
      originalData: flight,
      normalizedStartTime,
      normalizedEndTime,
      flightNumber: segment.flightNumber || null,
      durationText,
      startDateStr: departureTime.format("YYYY-MM-DD"),
    } as any;
  });
}

interface Props {
  itineraries: Itinerary[];
  flights?: any[];
  height?: number;
  onItineraryAdd?: (itinerary: any) => void;
  onPlanSelect?: (trip: any) => void;
  onItinerarySelect?: (itinerary: Itinerary) => void;
  onFlightAdd?: (flight: any) => void;
  onAccommodationAdd?: (accommodation: any) => void;
  onShowItineraryModal?: () => void;
  onShowFlightModal?: () => void;
  onRequestNewFlight?: () => void;
  onRequestNewItinerary?: (date?: Date) => void;
  onShowAccommodationModal?: (
    accommodation: any,
    date?: string,
    checkoutDate?: string,
  ) => void;
  onShowItineraryDetail?: (itinerary: Itinerary) => void;
  onShowFlightDetail?: (flight: any) => void;
  onShowAccommodationDetail?: (accommodation: any) => void;
  previewAccommodation?: {
    checkinDate: string;
    checkoutDate: string;
    checkinTime: string;
    checkoutTime: string;
    name: string;
  } | null;
  onPreviewAccommodationChange?: (
    preview: {
      checkinDate: string;
      checkoutDate: string;
      checkinTime: string;
      checkoutTime: string;
      name: string;
    } | null,
  ) => void;
  selectedTrip?: any;
  planData?: any;
  plans?: Plan[];
  trips?: any[];
  onPlansRefresh?: () => void;
  onPlanAdd: (planData: CreatePlanRequest) => Promise<Plan>;
  onPlanUpdate: (planId: number, planData: UpdatePlanRequest) => Promise<Plan>;
  onPlanDelete: (planId: number) => Promise<boolean>;
  activeTab?: "itinerary" | "flight" | "accommodation" | undefined;
  selectedItinerary?: any;
}

export default function WeeklySchedulePanel({
  itineraries,
  flights = [],
  height = 600,
  onItineraryAdd,
  onPlanSelect,
  onItinerarySelect,
  onFlightAdd,
  onAccommodationAdd,
  onShowItineraryModal,
  onShowFlightModal,
  onRequestNewFlight,
  onRequestNewItinerary,
  onShowAccommodationModal,
  onShowItineraryDetail,
  onShowFlightDetail,
  onShowAccommodationDetail,
  selectedTrip,
  planData: externalPlanData,
  plans: externalPlans = [],
  trips: externalTrips = [],
  onPlansRefresh,
  onPlanAdd,
  onPlanUpdate,
  onPlanDelete,
  activeTab,
  selectedItinerary,
  previewAccommodation: externalPreviewAccommodation,
  onPreviewAccommodationChange,
}: Props) {
  const queryClient = useQueryClient();
  const [currentWeekStart, setCurrentWeekStart] = useState(
    dayjs().startOf("week").add(1, "day"),
  );
  const [internalSelectedTrip, setInternalSelectedTrip] = useState<any>(null);
  const { width: windowWidth } = useWindowDimensions();
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const calendarBtnRef = useRef<any>(null);
  const [calendarPopupPos, setCalendarPopupPos] = useState<{
    top: number;
    left?: number;
    right?: number;
  }>({ top: 40, left: 8 });
  const [selectedDate, setSelectedDate] = useState<string | undefined>(
    undefined,
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importFileOpen, setImportFileOpen] = useState(false);
  const [dropFileOverlay, setDropFileOverlay] = useState(false);
  const [pendingDropFile, setPendingDropFile] = useState<File | null>(null);
  const panelRef = useRef<View>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([AI_INTRO_MESSAGE]);
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoDraft, setMemoDraft] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showPlanSelectRequiredModal, setShowPlanSelectRequiredModal] =
    useState(false);
  const [openTripSelector, setOpenTripSelector] = useState(false);
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalConfig, setResultModalConfig] = useState<{
    mode: string;
    params?: any;
  } | null>(null);

  const planForm = useTripForm();
  const { data: me } = useMe();
  const isGuest = !!me?.isGuest;

  const [previewEvent, setPreviewEvent] = useState<{
    start: Date;
    end: Date;
    title: string;
    startTime: string;
    endTime: string;
    location?: string;
    category?: ItineraryCategory;
  } | null>(null);

  const [previewAccommodation, setPreviewAccommodation] = useState<{
    checkinDate: string;
    checkoutDate: string;
    checkinTime: string;
    checkoutTime: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (externalPreviewAccommodation !== undefined) {
      setPreviewAccommodation(externalPreviewAccommodation);
    }
  }, [externalPreviewAccommodation]);

  useEffect(() => {
    if (!showMonthPicker || !calendarBtnRef.current) return;
    calendarBtnRef.current.measure(
      (
        _x: number,
        _y: number,
        _width: number,
        _height: number,
        pageX: number,
        _pageY: number,
      ) => {
        const popupWidth = 276;
        const overflows = pageX + 8 + popupWidth > windowWidth;
        if (overflows) {
          setCalendarPopupPos({ top: 40, right: 0 });
        } else {
          setCalendarPopupPos({ top: 40, left: 8 });
        }
      },
    );
  }, [showMonthPicker, windowWidth]);

  const [eventHeights, setEventHeights] = useState<Record<string, number>>({});

  const [draggingEvent, setDraggingEvent] = useState<{
    id: string;
    type: "itinerary" | "flight";
    startX: number;
    startY: number;
    elementX: number;
    elementY: number;
    elementWidth: number;
    elementHeight: number;
  } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [dropPreviewPosition, setDropPreviewPosition] = useState<{
    x: number;
    y: number;
    date: string;
    time: Date;
  } | null>(null);

  const dropPreviewPositionRef = useRef<{
    x: number;
    y: number;
    date: string;
    time: Date;
  } | null>(null);

  const [droppedEventPosition, setDroppedEventPosition] = useState<{
    eventId: string;
    newStart: Date;
    newEnd: Date;
  } | null>(null);

  const [hasOverlap, setHasOverlap] = useState(false);

  const [selectedAccommodationId, setSelectedAccommodationId] = useState<
    number | null
  >(null);
  const [accDragState, setAccDragState] = useState<{
    id: number;
    originalCheckinDate: string;
    originalCheckoutDate: string;
    checkinTime: string;
    checkoutTime: string;
    name: string;
    targetDate: string | null;
  } | null>(null);
  const accDragRafRef = useRef<number | null>(null);
  const accDragCalendarRectRef = useRef<DOMRect | null>(null);
  const accDragTargetDateRef = useRef<string | null>(null);
  const accDragPendingRef = useRef<{
    id: number;
    originalCheckinDate: string;
    originalCheckoutDate: string;
    checkinTime: string;
    checkoutTime: string;
    name: string;
    startX: number;
    startY: number;
  } | null>(null);

  const [accCreateDragState, setAccCreateDragState] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);
  const accCreateDragPendingRef = useRef<{
    date: string;
    startX: number;
  } | null>(null);
  const accCreateDragActiveRef = useRef<{
    startDate: string;
    endDate: string;
  } | null>(null);
  const accCreateDragOccurredRef = useRef(false);
  const accCreateRowRef = useRef<any>(null);
  const accCreateRowRectRef = useRef<DOMRect | null>(null);

  const calendarWrapperRef = useRef<View>(null);
  const [calendarLayout, setCalendarLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    calendarElementRef.current = null;
    scrollContainerRef.current = null;
    calendarRectRef.current = null;
  }, [calendarLayout]);

  const calendarElementRef = useRef<HTMLElement | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const calendarRectRef = useRef<DOMRect | null>(null);

  const rafIdRef = useRef<number | null>(null);

  const overlapCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculateDropPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (Platform.OS !== "web") return null;

      if (calendarLayout.width === 0 || calendarLayout.height === 0) {
        return null;
      }

      let calendarElement: HTMLElement | null = calendarElementRef.current;
      let calendarRect: DOMRect | null = calendarRectRef.current;
      let scrollContainer: HTMLElement | null = scrollContainerRef.current;

      if (!calendarElement || !calendarRect) {
        calendarElement = document.querySelector(
          '[data-testid="calendar-wrapper"]',
        ) as HTMLElement;

        if (!calendarElement && calendarWrapperRef.current) {
          const refElement = calendarWrapperRef.current as any;
          if (refElement._nativeNode) {
            calendarElement = refElement._nativeNode;
          } else if (refElement._internalFiberInstanceHandleDEV?.stateNode) {
            calendarElement =
              refElement._internalFiberInstanceHandleDEV.stateNode;
          }
        }

        if (!calendarElement) {
          calendarElement = document.querySelector(
            ".rbc-calendar",
          ) as HTMLElement;
        }

        if (!calendarElement) {
          const allDivs = document.querySelectorAll("div");
          calendarElement =
            (Array.from(allDivs).find((el: any) => {
              const rect = el.getBoundingClientRect();
              return (
                Math.abs(rect.width - calendarLayout.width) < 20 &&
                Math.abs(rect.height - calendarLayout.height) < 20 &&
                rect.width > 500
              );
            }) as HTMLElement) || null;
        }

        if (calendarElement) {
          calendarRect = calendarElement.getBoundingClientRect();
          calendarElementRef.current = calendarElement;
          calendarRectRef.current = calendarRect;
        } else {
          const testElement = document.querySelector(
            '[data-testid="calendar-wrapper"]',
          ) as HTMLElement;
          if (testElement) {
            calendarRect = testElement.getBoundingClientRect();
            calendarRectRef.current = calendarRect;
          } else {
            return null;
          }
        }
      }

      let scrollTop = 0;
      if (!scrollContainer) {
        scrollContainer = document.querySelector(
          ".rbc-time-content",
        ) as HTMLElement;

        if (!scrollContainer) {
          scrollContainer = document.querySelector(
            ".rbc-time-view",
          ) as HTMLElement;
        }

        if (!scrollContainer && calendarElement) {
          const allScrollable = Array.from(
            document.querySelectorAll("*"),
          ).filter((el: any) => {
            const style = window.getComputedStyle(el);
            const hasScroll =
              style.overflowY === "auto" || style.overflowY === "scroll";
            const hasHeight = el.scrollHeight > el.clientHeight;
            return hasScroll && hasHeight;
          }) as HTMLElement[];

          scrollContainer =
            allScrollable.find(el => calendarElement?.contains(el)) || null;
        }

        if (scrollContainer) {
          scrollContainerRef.current = scrollContainer;
        }
      }

      if (scrollContainer) {
        scrollTop = scrollContainer.scrollTop;
      }

      const timeColumnWidth = 60;
      const headerHeight = 110;
      const hourRowHeight = 40;
      const timeslots = 3;
      const segmentHeight = hourRowHeight / (timeslots + 1);

      const relativeX = clientX - calendarRect.left;
      const viewportYFromHeader = clientY - calendarRect.top - headerHeight;
      const relativeY = viewportYFromHeader + scrollTop;

      const scrollableHeight = scrollContainer
        ? scrollContainer.scrollHeight
        : calendarRect.height - headerHeight;

      if (relativeX < timeColumnWidth) return null;
      if (relativeX > calendarRect.width) return null;
      if (relativeY < 0 || relativeY > scrollableHeight) return null;

      const calendarWidth = calendarRect.width - timeColumnWidth;
      const dayWidth = calendarWidth / 7;
      const dayIndex = Math.floor((relativeX - timeColumnWidth) / dayWidth);
      const dayIndexClamped = Math.max(0, Math.min(6, dayIndex));
      const targetDate = dayjs(currentWeekStart).add(dayIndexClamped, "day");

      const segmentIndex = Math.floor(relativeY / segmentHeight);
      const hour = Math.floor(segmentIndex / (timeslots + 1));
      const minuteSegment = segmentIndex % (timeslots + 1);
      const minutes = minuteSegment * 15;

      const clampedHour = Math.max(0, Math.min(24, hour));
      const targetTime = targetDate
        .hour(clampedHour)
        .minute(minutes)
        .second(0)
        .millisecond(0);

      const timeTop =
        calendarRect.top +
        headerHeight +
        segmentIndex * segmentHeight -
        scrollTop;

      let eventLeft: number;

      if (draggingEvent) {
        let originalDate: dayjs.Dayjs | null = null;

        if (draggingEvent.type === "itinerary") {
          const itineraryId = Number.parseInt(draggingEvent.id);
          const itinerary = itineraries.find(it => it.id === itineraryId);
          if (itinerary) {
            originalDate = dayjs(itinerary.itineraryDate);
          }
        } else if (draggingEvent.type === "flight") {
          const eventIdParts = draggingEvent.id.split("-");
          const flightId =
            eventIdParts.length > 1 ? Number.parseInt(eventIdParts[1]) : null;

          if (flightId !== null) {
            const flight = flights.find(f => f.id === flightId);
            if (
              flight &&
              flight.flightSegments &&
              flight.flightSegments.length > 0
            ) {
              const segmentIdOrIndex =
                eventIdParts.length > 2
                  ? Number.parseInt(eventIdParts[2])
                  : null;
              if (segmentIdOrIndex !== null) {
                const segment = flight.flightSegments.find(
                  (seg: any, idx: number) =>
                    seg.id === segmentIdOrIndex ||
                    (seg.id == null && idx + 1 === segmentIdOrIndex),
                );
                if (segment) {
                  originalDate = dayjs(segment.departureTime);
                } else if (segmentIdOrIndex > 0) {
                  originalDate = dayjs(
                    flight.flightSegments[segmentIdOrIndex - 1].departureTime,
                  );
                }
              }
            }
          }
        }

        if (originalDate) {
          const originalDayIndex = originalDate.diff(currentWeekStart, "day");

          const originalEventLeft = draggingEvent.elementX;
          const originalEventWidth = draggingEvent.elementWidth;

          const originalColumnWidth = originalEventWidth / 0.9;
          const originalColumnLeft =
            originalEventLeft - originalColumnWidth * 0.035;

          const dayDiff = dayIndexClamped - originalDayIndex;
          const dropColumnLeft =
            originalColumnLeft + originalColumnWidth * dayDiff;

          eventLeft = dropColumnLeft + originalColumnWidth * 0.035;
        } else {
          const dayLeft =
            calendarRect.left + timeColumnWidth + dayWidth * dayIndexClamped;
          const leftMarginPercent = 3.5;
          eventLeft = dayLeft + (dayWidth * leftMarginPercent) / 100;
        }
      } else {
        const dayLeft =
          calendarRect.left + timeColumnWidth + dayWidth * dayIndexClamped;
        const leftMarginPercent = 3.5;
        eventLeft = dayLeft + (dayWidth * leftMarginPercent) / 100;
      }

      return {
        x: eventLeft,
        y: timeTop,
        date: targetDate.format("YYYY-MM-DD"),
        time: targetTime.toDate(),
      };
    },
    [currentWeekStart, calendarLayout, draggingEvent, itineraries, flights],
  );

  const checkOverlap = useCallback(
    (
      dropTime: Date,
      durationMinutes: number,
      flightId: number | null,
      segmentIndex: number | null,
    ) => {
      if (!dropTime || flightId === null || segmentIndex === null) {
        return false;
      }

      const newStartTime = dayjs(dropTime);
      const newEndTime = newStartTime.add(durationMinutes, "minute");

      for (const existingFlight of flights) {
        if (
          !existingFlight.flightSegments ||
          existingFlight.flightSegments.length === 0
        ) {
          continue;
        }

        for (let idx = 0; idx < existingFlight.flightSegments.length; idx++) {
          const existingSegment = existingFlight.flightSegments[idx];

          if (existingFlight.id === flightId && idx === segmentIndex) {
            continue;
          }

          const existingDepTime = dayjs(existingSegment.departureTime);
          const existingArrTime = dayjs(existingSegment.arrivalTime);

          const hasOverlap =
            ((newStartTime.isAfter(existingDepTime) ||
              newStartTime.isSame(existingDepTime)) &&
              newStartTime.isBefore(existingArrTime)) ||
            (newEndTime.isAfter(existingDepTime) &&
              (newEndTime.isBefore(existingArrTime) ||
                newEndTime.isSame(existingArrTime))) ||
            (newStartTime.isBefore(existingDepTime) &&
              newEndTime.isAfter(existingArrTime));

          if (hasOverlap) {
            return true;
          }
        }
      }

      return false;
    },
    [flights],
  );

  useEffect(() => {
    if (!draggingEvent) {
      setHasOverlap(false);
      calendarElementRef.current = null;
      scrollContainerRef.current = null;
      calendarRectRef.current = null;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (overlapCheckTimeoutRef.current) {
        clearTimeout(overlapCheckTimeoutRef.current);
        overlapCheckTimeoutRef.current = null;
      }
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        const offsetX = e.clientX - draggingEvent.startX;
        const offsetY = e.clientY - draggingEvent.startY;

        const draggedElementX = draggingEvent.elementX + offsetX;
        const draggedElementY = draggingEvent.elementY + offsetY;

        const elementCenterX = draggedElementX + draggingEvent.elementWidth / 2;
        const elementTopY = draggedElementY;

        const dropPos = calculateDropPosition(elementCenterX, elementTopY);

        if (dropPos) {
          const snapOffsetX = dropPos.x - draggingEvent.elementX;
          const snapOffsetY = dropPos.y - draggingEvent.elementY;

          setDragOffset({ x: snapOffsetX, y: snapOffsetY });
        } else {
          setDragOffset({ x: offsetX, y: offsetY });
        }

        setDropPreviewPosition(dropPos);
        dropPreviewPositionRef.current = dropPos;

        if (draggingEvent.type === "flight" && dropPos) {
          if (overlapCheckTimeoutRef.current) {
            clearTimeout(overlapCheckTimeoutRef.current);
          }

          overlapCheckTimeoutRef.current = setTimeout(() => {
            const eventIdParts = draggingEvent.id.split("-");
            const flightId =
              eventIdParts.length > 1 ? Number.parseInt(eventIdParts[1]) : null;
            const segmentIdOrIndex =
              eventIdParts.length > 2 ? Number.parseInt(eventIdParts[2]) : null;

            if (flightId !== null && segmentIdOrIndex !== null) {
              const flight = flights.find(f => f.id === flightId);
              if (flight && flight.flightSegments) {
                let segmentIndex: number | null = null;
                let segment = flight.flightSegments.find(
                  (seg: any, idx: number) =>
                    seg.id === segmentIdOrIndex ||
                    (seg.id == null && idx + 1 === segmentIdOrIndex),
                );

                if (!segment && segmentIdOrIndex > 0) {
                  segmentIndex = segmentIdOrIndex - 1;
                  segment = flight.flightSegments[segmentIndex];
                } else if (segment) {
                  segmentIndex = flight.flightSegments.findIndex(
                    (seg: any) => seg.id === segment.id || seg === segment,
                  );
                }

                if (segmentIndex !== null && segment) {
                  const originalStart = dayjs(segment.departureTime);
                  const originalEnd = dayjs(segment.arrivalTime);
                  const durationMinutes = originalEnd.diff(
                    originalStart,
                    "minute",
                  );

                  const overlap = checkOverlap(
                    dropPos.time,
                    durationMinutes,
                    flightId,
                    segmentIndex,
                  );
                  setHasOverlap(overlap);
                }
              }
            }
          }, 100);
        } else {
          setHasOverlap(false);
        }
      });
    };

    const handleMouseUp = async () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (overlapCheckTimeoutRef.current) {
        clearTimeout(overlapCheckTimeoutRef.current);
        overlapCheckTimeoutRef.current = null;
      }

      const latestDropPos = dropPreviewPositionRef.current;

      if (latestDropPos && draggingEvent) {
        const dropTime = dayjs(latestDropPos.time);

        let originalStart: dayjs.Dayjs | null = null;
        let originalEnd: dayjs.Dayjs | null = null;
        let itineraryId: number | null = null;
        let flightId: number | null = null;
        let segmentIndex: number | null = null;
        let flight: any = null;

        if (draggingEvent.type === "itinerary") {
          itineraryId = Number.parseInt(draggingEvent.id);
          const itinerary = itineraries.find(it => it.id === itineraryId);
          if (itinerary) {
            originalStart = dayjs(
              `${itinerary.itineraryDate}T${itinerary.startTime}:00`,
            );
            originalEnd = dayjs(
              `${itinerary.itineraryDate}T${itinerary.endTime}:00`,
            );
          }
        } else if (draggingEvent.type === "flight") {
          const eventIdParts = draggingEvent.id.split("-");
          flightId =
            eventIdParts.length > 1 ? Number.parseInt(eventIdParts[1]) : null;
          const segmentIdOrIndex =
            eventIdParts.length > 2 ? Number.parseInt(eventIdParts[2]) : null;

          if (flightId !== null && segmentIdOrIndex !== null) {
            flight = flights.find(f => f.id === flightId);
            if (flight && flight.flightSegments) {
              let segment = flight.flightSegments.find(
                (seg: any, idx: number) =>
                  seg.id === segmentIdOrIndex ||
                  (seg.id == null && idx + 1 === segmentIdOrIndex),
              );

              if (!segment && segmentIdOrIndex > 0) {
                segmentIndex = segmentIdOrIndex - 1;
                segment = flight.flightSegments[segmentIndex];
              } else if (segment) {
                segmentIndex = flight.flightSegments.findIndex(
                  (seg: any) => seg.id === segment.id || seg === segment,
                );
              }

              if (segment) {
                originalStart = dayjs(segment.departureTime);
                originalEnd = dayjs(segment.arrivalTime);
              }
            }
          }
        }

        if (originalStart && originalEnd) {
          const duration = originalEnd.diff(originalStart, "minute");

          const newStart = dropTime.toDate();
          const newEnd = dropTime.add(duration, "minute").toDate();

          if (
            draggingEvent.type === "flight" &&
            flightId !== null &&
            segmentIndex !== null &&
            flight
          ) {
            const newStartTime = dayjs(newStart);
            const newEndTime = dayjs(newEnd);

            for (const existingFlight of flights) {
              if (
                !existingFlight.flightSegments ||
                existingFlight.flightSegments.length === 0
              ) {
                continue;
              }

              for (
                let idx = 0;
                idx < existingFlight.flightSegments.length;
                idx++
              ) {
                const existingSegment = existingFlight.flightSegments[idx];

                if (existingFlight.id === flightId && idx === segmentIndex) {
                  continue;
                }

                const existingDepTime = dayjs(existingSegment.departureTime);
                const existingArrTime = dayjs(existingSegment.arrivalTime);

                const hasOverlap =
                  ((newStartTime.isAfter(existingDepTime) ||
                    newStartTime.isSame(existingDepTime)) &&
                    newStartTime.isBefore(existingArrTime)) ||
                  (newEndTime.isAfter(existingDepTime) &&
                    (newEndTime.isBefore(existingArrTime) ||
                      newEndTime.isSame(existingArrTime))) ||
                  (newStartTime.isBefore(existingDepTime) &&
                    newEndTime.isAfter(existingArrTime));

                if (hasOverlap) {
                  Alert.alert("알림", "겹치는 항공 일정이 있어요");
                  setDraggingEvent(null);
                  setDragOffset({ x: 0, y: 0 });
                  setDropPreviewPosition(null);
                  dropPreviewPositionRef.current = null;
                  setHasOverlap(false);
                  return;
                }
              }
            }
          }

          setDroppedEventPosition({
            eventId: draggingEvent.id,
            newStart,
            newEnd,
          });

          if (draggingEvent.type === "itinerary" && itineraryId) {
            const newDate = dayjs(newStart).format("YYYY-MM-DD");
            itinerariesApi
              .updateItinerary(itineraryId, {
                itineraryDate: newDate,
                startTime: dayjs(newStart).format("HH:mm"),
                endTime: dayjs(newEnd).format("HH:mm"),
              })
              .then(async () => {
                await extendPlanDateIfNeeded(newDate);
                const updatedItineraries = itineraries.map(it =>
                  it.id === itineraryId ? { ...it, itineraryDate: newDate } : it,
                );
                const plan = planData?.plan;
                if (plan?.id) {
                  await shrinkPlanIfNeeded(
                    plan.id,
                    plan,
                    collectPlanItemDates(updatedItineraries, flights, planData?.accommodations ?? []),
                  ).catch(() => null);
                  queryClient.invalidateQueries({ queryKey: ["plans"] });
                }
                if (planData?.refreshItineraries) {
                  planData.refreshItineraries().catch((_err: any) => {});
                } else if (onPlansRefresh) {
                  onPlansRefresh();
                }
              })
              .catch((_error: any) => {
                Alert.alert("알림", "일정 업데이트에 실패했습니다.");
                setDroppedEventPosition(null);
              });
          } else if (
            draggingEvent.type === "flight" &&
            flightId !== null &&
            flight &&
            segmentIndex !== null
          ) {
            const updatedSegments = flight.flightSegments.map(
              (segment: any, idx: number) => {
                if (idx === segmentIndex) {
                  return {
                    ...segment,
                    departureTime: dayjs(newStart).toISOString(),
                    arrivalTime: dayjs(newEnd).toISOString(),
                  };
                }
                return segment;
              },
            );

            flightsApi
              .updateFlight(flightId, {
                segments: updatedSegments.map((seg: any) => ({
                  id: seg.id ?? undefined,
                  airline: seg.airline || null,
                  flightNumber: seg.flightNumber || null,
                  departureAirport: seg.departureAirport,
                  arrivalAirport: seg.arrivalAirport,
                  departureTime: seg.departureTime,
                  arrivalTime: seg.arrivalTime,
                  seatClass: seg.seatClass || null,
                  seatNumber: seg.seatNumber || null,
                  gate: seg.gate || null,
                  terminal: seg.terminal || null,
                })),
              })
              .then(async () => {
                const newDepDate = dayjs(newStart).format("YYYY-MM-DD");
                const newArrDate = dayjs(newEnd).format("YYYY-MM-DD");
                await extendPlanDateIfNeeded(newDepDate, newArrDate);
                const updatedFlights = flights.map((f: any) => {
                  if (f.id !== flightId) return f;
                  return {
                    ...f,
                    flightSegments: f.flightSegments?.map((seg: any, idx: number) =>
                      idx === segmentIndex
                        ? { ...seg, departureTime: dayjs(newStart).toISOString(), arrivalTime: dayjs(newEnd).toISOString() }
                        : seg,
                    ),
                  };
                });
                const plan = planData?.plan;
                if (plan?.id) {
                  await shrinkPlanIfNeeded(
                    plan.id,
                    plan,
                    collectPlanItemDates(itineraries, updatedFlights, planData?.accommodations ?? []),
                  ).catch(() => null);
                  queryClient.invalidateQueries({ queryKey: ["plans"] });
                }
                if (planData?.refreshFlights) {
                  planData.refreshFlights().catch((_err: any) => {});
                } else if (onPlansRefresh) {
                  onPlansRefresh();
                }
              })
              .catch((_error: any) => {
                Alert.alert("알림", "일정 업데이트에 실패했습니다.");
                setDroppedEventPosition(null);
              });
          }
        }
      }

      setDraggingEvent(null);
      setDragOffset({ x: 0, y: 0 });
      setDropPreviewPosition(null);
      dropPreviewPositionRef.current = null;
      setHasOverlap(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (overlapCheckTimeoutRef.current) {
        clearTimeout(overlapCheckTimeoutRef.current);
        overlapCheckTimeoutRef.current = null;
      }
      calendarElementRef.current = null;
      scrollContainerRef.current = null;
      calendarRectRef.current = null;
      setDropPreviewPosition(null);
      dropPreviewPositionRef.current = null;
    };
  }, [
    draggingEvent,
    calculateDropPosition,
    itineraries,
    flights,
    checkOverlap,
  ]);

  const _plans = externalPlans;
  const trips = externalTrips;
  const planData = externalPlanData;

  const extendPlanDateIfNeeded = async (...dates: string[]) => {
    const plan = planData?.plan;
    if (!plan?.id) return;
    await extendPlanIfNeeded(plan.id, plan, dates).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["plans"] });
  };

  useEffect(() => {
    if (Platform.OS !== "web" || !panelRef.current) return;
    const el = panelRef.current as unknown as HTMLElement;
    const isFileDrag = (e: DragEvent) => e.dataTransfer?.types.includes("Files") ?? false;
    const onDragEnter = (e: DragEvent) => { if (isFileDrag(e)) { e.preventDefault(); setDropFileOverlay(true); } };
    const onDragOver = (e: DragEvent) => { if (isFileDrag(e)) e.preventDefault(); };
    const onDragLeave = (e: DragEvent) => { if (!el.contains(e.relatedTarget as Node)) setDropFileOverlay(false); };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDropFileOverlay(false);
      const file = e.dataTransfer?.files[0];
      if (!file) return;
      setPendingDropFile(file);
      setImportFileOpen(true);
    };
    el.addEventListener("dragenter", onDragEnter);
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragenter", onDragEnter);
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onMove = (e: MouseEvent) => {
      const p = accDragPendingRef.current;
      if (!p) return;
      if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 5) {
        accDragPendingRef.current = null;
        setAccDragState({
          id: p.id,
          originalCheckinDate: p.originalCheckinDate,
          originalCheckoutDate: p.originalCheckoutDate,
          checkinTime: p.checkinTime,
          checkoutTime: p.checkoutTime,
          name: p.name,
          targetDate: null,
        });
      }
    };
    const onUp = () => {
      accDragPendingRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    if (!accDragState || Platform.OS !== "web") return;

    const getTargetDateFromX = (clientX: number): string | null => {
      let calendarRect = accDragCalendarRectRef.current;
      if (!calendarRect) {
        let el: HTMLElement | null = document.querySelector(
          '[data-testid="calendar-wrapper"]',
        );
        if (!el && calendarWrapperRef.current) {
          const ref = calendarWrapperRef.current as any;
          if (ref._nativeNode) el = ref._nativeNode;
          else if (ref._internalFiberInstanceHandleDEV?.stateNode)
            el = ref._internalFiberInstanceHandleDEV.stateNode;
        }
        if (!el && calendarLayout.width > 0) {
          el =
            (Array.from(document.querySelectorAll("div")).find((d: any) => {
              const r = d.getBoundingClientRect();
              return (
                Math.abs(r.width - calendarLayout.width) < 20 && r.width > 500
              );
            }) as HTMLElement) || null;
        }
        if (el) {
          calendarRect = el.getBoundingClientRect();
          accDragCalendarRectRef.current = calendarRect;
        }
      }
      if (!calendarRect) return null;
      const timeColumnWidth = 60;
      const calendarWidth = calendarRect.width - timeColumnWidth;
      const dayWidth = calendarWidth / 7;
      const relativeX = clientX - calendarRect.left;
      const clampedX = Math.max(
        timeColumnWidth,
        Math.min(calendarRect.width - 1, relativeX),
      );
      const dayIndex = Math.max(
        0,
        Math.min(6, Math.floor((clampedX - timeColumnWidth) / dayWidth)),
      );
      return dayjs(currentWeekStart).add(dayIndex, "day").format("YYYY-MM-DD");
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (accDragRafRef.current) cancelAnimationFrame(accDragRafRef.current);
      accDragRafRef.current = requestAnimationFrame(() => {
        const targetDate = getTargetDateFromX(e.clientX);
        accDragTargetDateRef.current = targetDate;
        setAccDragState(prev => (prev ? { ...prev, targetDate } : null));
      });
    };

    const handleMouseUp = async () => {
      if (accDragRafRef.current) {
        cancelAnimationFrame(accDragRafRef.current);
        accDragRafRef.current = null;
      }

      const targetDate = accDragTargetDateRef.current;
      const {
        id,
        originalCheckinDate,
        originalCheckoutDate,
        checkinTime,
        checkoutTime,
      } = accDragState;

      accDragTargetDateRef.current = null;
      accDragCalendarRectRef.current = null;
      setAccDragState(null);

      if (!targetDate) return;

      const originalCheckin = dayjs(originalCheckinDate);
      const originalCheckout = dayjs(originalCheckoutDate);
      const stayDays = originalCheckout.diff(originalCheckin, "day");
      const newCheckin = dayjs(targetDate);
      const newCheckout = newCheckin.add(stayDays, "day");

      if (newCheckin.isSame(originalCheckin, "day")) return;

      const newCheckinDt = dayjs(
        `${newCheckin.format("YYYY-MM-DD")} ${checkinTime}`,
      );
      const newCheckoutDt = dayjs(
        `${newCheckout.format("YYYY-MM-DD")} ${checkoutTime}`,
      );

      const allAccommodations: any[] = planData?.accommodations ?? [];
      const hasOverlap = allAccommodations.some((acc: any) => {
        if (acc.id === id) return false;
        const otherCheckinDt = dayjs(
          `${acc.checkinDate} ${acc.checkinTime || "15:00"}`,
        );
        const otherCheckoutDt = dayjs(
          `${acc.checkoutDate} ${acc.checkoutTime || "11:00"}`,
        );
        return (
          newCheckinDt.isBefore(otherCheckoutDt) &&
          newCheckoutDt.isAfter(otherCheckinDt)
        );
      });
      if (hasOverlap) {
        Alert.alert("알림", "해당 기간에 이미 다른 숙박이 있습니다.");
        return;
      }

      try {
        await accommodationsApi.updateAccommodation(id, {
          checkinDate: newCheckin.format("YYYY-MM-DD"),
          checkoutDate: newCheckout.format("YYYY-MM-DD"),
          checkinTime,
          checkoutTime,
        });
        const newCheckinDate = newCheckin.format("YYYY-MM-DD");
        const newCheckoutDate = newCheckout.format("YYYY-MM-DD");
        await extendPlanDateIfNeeded(newCheckinDate, newCheckoutDate);
        const updatedAccommodations = (planData?.accommodations ?? []).map((acc: any) =>
          acc.id === id ? { ...acc, checkinDate: newCheckinDate, checkoutDate: newCheckoutDate } : acc,
        );
        const plan = planData?.plan;
        if (plan?.id) {
          await shrinkPlanIfNeeded(
            plan.id,
            plan,
            collectPlanItemDates(itineraries, flights, updatedAccommodations),
          ).catch(() => null);
          queryClient.invalidateQueries({ queryKey: ["plans"] });
        }
        if (planData?.refreshAccommodations) {
          planData.refreshAccommodations().catch(() => {});
        } else if (onPlansRefresh) {
          onPlansRefresh();
        }
      } catch {
        Alert.alert("알림", "숙박 업데이트에 실패했습니다.");
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (accDragRafRef.current) {
        cancelAnimationFrame(accDragRafRef.current);
        accDragRafRef.current = null;
      }
    };
  }, [
    accDragState,
    currentWeekStart,
    calendarLayout,
    planData,
    onPlansRefresh,
  ]);

  useEffect(() => {
    const handler = () => {
      if (onPlansRefresh) {
        onPlansRefresh();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("plans-refresh", handler);
      return () => window.removeEventListener("plans-refresh", handler);
    }
  }, [onPlansRefresh]);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { title, startTime, endTime, location, itineraryDate, category } = e.detail;
      if (previewEvent) {
        setPreviewEvent(prev =>
          prev
            ? {
                ...prev,
                title: title !== undefined ? title : prev.title,
                startTime: startTime !== undefined ? startTime : prev.startTime,
                endTime: endTime !== undefined ? endTime : prev.endTime,
                location: location !== undefined ? location : prev.location,
                category: category !== undefined ? category : prev.category,
                start:
                  itineraryDate && startTime
                    ? dayjs(`${itineraryDate}T${startTime}:00`).toDate()
                    : prev.start,
                end:
                  itineraryDate && endTime
                    ? dayjs(`${itineraryDate}T${endTime}:00`).toDate()
                    : prev.end,
              }
            : null,
        );
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        "itinerary-preview-update",
        handler as EventListener,
      );
      return () =>
        window.removeEventListener(
          "itinerary-preview-update",
          handler as EventListener,
        );
    }
  }, [previewEvent]);

  useEffect(() => {
    const handler = () => {
      setPreviewEvent(null);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("itinerary-preview-clear", handler);
      return () =>
        window.removeEventListener("itinerary-preview-clear", handler);
    }
  }, []);

  useEffect(() => {
    if (previewEvent) {
      const isItineraryTabActive = activeTab === "itinerary";

      if (!isItineraryTabActive) {
        setPreviewEvent(null);
      } else if (
        isItineraryTabActive &&
        selectedItinerary &&
        selectedItinerary.id
      ) {
        setPreviewEvent(null);
      }
    }
  }, [activeTab, selectedItinerary, previewEvent]);

  useEffect(() => {
    if (!resultModalVisible) {
      return;
    }

    const timer = setTimeout(() => {
      setResultModalVisible(false);
      setResultModalConfig(null);
    }, 2000);

    return () => clearTimeout(timer);
  }, [resultModalVisible]);

  useEffect(() => {
    if (!droppedEventPosition) return;

    const eventId = droppedEventPosition.eventId;
    const expectedStart = dayjs(droppedEventPosition.newStart);
    const expectedEnd = dayjs(droppedEventPosition.newEnd);

    if (eventId && !eventId.startsWith("flight-")) {
      const itineraryId = Number.parseInt(eventId);
      const itinerary = itineraries.find(it => it.id === itineraryId);

      if (itinerary) {
        const serverStart = dayjs(
          `${itinerary.itineraryDate}T${itinerary.startTime}:00`,
        );
        const serverEnd = dayjs(
          `${itinerary.itineraryDate}T${itinerary.endTime}:00`,
        );

        if (
          Math.abs(serverStart.diff(expectedStart, "minute")) <= 1 &&
          Math.abs(serverEnd.diff(expectedEnd, "minute")) <= 1
        ) {
          setDroppedEventPosition(null);
        }
      }
    } else if (eventId && eventId.startsWith("flight-")) {
      const eventIdParts = eventId.split("-");
      const flightId =
        eventIdParts.length > 1 ? Number.parseInt(eventIdParts[1]) : null;
      const segmentIdOrIndex =
        eventIdParts.length > 2 ? Number.parseInt(eventIdParts[2]) : null;

      if (flightId !== null && segmentIdOrIndex !== null) {
        const flight = flights.find(f => f.id === flightId);
        if (flight && flight.flightSegments) {
          let segment = flight.flightSegments.find(
            (seg: any, idx: number) =>
              seg.id === segmentIdOrIndex ||
              (seg.id == null && idx + 1 === segmentIdOrIndex),
          );

          if (!segment && segmentIdOrIndex > 0) {
            segment = flight.flightSegments[segmentIdOrIndex - 1];
          }

          if (segment) {
            const serverStart = dayjs(segment.departureTime);
            const serverEnd = dayjs(segment.arrivalTime);

            if (
              Math.abs(serverStart.diff(expectedStart, "minute")) <= 1 &&
              Math.abs(serverEnd.diff(expectedEnd, "minute")) <= 1
            ) {
              setDroppedEventPosition(null);
            }
          }
        }
      }
    }
  }, [droppedEventPosition, itineraries, flights]);

  useEffect(() => {
    if (selectedTrip) {
      setInternalSelectedTrip(selectedTrip);
    }
  }, [selectedTrip]);

  useEffect(() => {
    if (internalSelectedTrip?.startDate) {
      const startDateWeekStart = dayjs(internalSelectedTrip.startDate)
        .startOf("week")
        .add(1, "day");
      setCurrentWeekStart(startDateWeekStart);
    }
  }, [internalSelectedTrip?.startDate]);

  useEffect(() => {
    setAiMessages([AI_INTRO_MESSAGE]);
  }, [internalSelectedTrip?.id]);

  const myRole = useMemo(() => {
    const r = (planData.plan as any)?.myRole;
    return typeof r === "string" ? r.toLowerCase() : undefined;
  }, [planData.plan]);

  const _handleAccommodationAdd = async (newAccommodation: any) => {
    setPreviewAccommodation(null);
    onPreviewAccommodationChange?.(null);
    if (onAccommodationAdd) {
      onAccommodationAdd(newAccommodation);
    }
  };

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = currentWeekStart.add(i, "day");
      days.push(date.format("YYYY-MM-DD"));
    }
    return days;
  }, [currentWeekStart]);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const getDateFromX = (clientX: number): string | null => {
      const rect = accCreateRowRectRef.current;
      if (!rect || !weekDays.length) return null;
      const relX = Math.max(0, Math.min(clientX - rect.left, rect.width - 1));
      const dayIndex = Math.floor((relX / rect.width) * weekDays.length);
      return weekDays[Math.max(0, Math.min(dayIndex, weekDays.length - 1))];
    };

    const onMove = (e: MouseEvent) => {
      const p = accCreateDragPendingRef.current;
      if (p) {
        if (Math.abs(e.clientX - p.startX) > 8) {
          accCreateDragPendingRef.current = null;
          const endDate = getDateFromX(e.clientX) ?? p.date;
          const state = { startDate: p.date, endDate };
          accCreateDragActiveRef.current = state;
          setAccCreateDragState(state);
        }
        return;
      }
      if (accCreateDragActiveRef.current) {
        const endDate = getDateFromX(e.clientX);
        if (endDate) {
          const newState = {
            startDate: accCreateDragActiveRef.current.startDate,
            endDate,
          };
          accCreateDragActiveRef.current = newState;
          setAccCreateDragState(newState);
        }
      }
    };

    const onUp = () => {
      accCreateDragPendingRef.current = null;
      const state = accCreateDragActiveRef.current;
      accCreateDragActiveRef.current = null;
      setAccCreateDragState(null);
      if (!state) return;

      accCreateDragOccurredRef.current = true;

      const startD = dayjs(state.startDate);
      const endD = dayjs(state.endDate);
      const checkinDate = (startD.isAfter(endD) ? endD : startD).format(
        "YYYY-MM-DD",
      );
      const checkoutDate = (startD.isAfter(endD) ? startD : endD).format(
        "YYYY-MM-DD",
      );

      const newPreview = {
        checkinDate,
        checkoutDate,
        checkinTime: "15:00",
        checkoutTime: "11:00",
        name: "",
      };
      setPreviewAccommodation(newPreview);
      onPreviewAccommodationChange?.(newPreview);
      extendPlanDateIfNeeded(checkinDate, checkoutDate).catch(() => {});
      onShowAccommodationModal?.(null, checkinDate, checkoutDate);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [weekDays, onShowAccommodationModal, onPreviewAccommodationChange]);

  const accommodationsByDate = useMemo(() => {
    if (!planData?.accommodations || !Array.isArray(planData.accommodations)) {
      return new Map<string, any[]>();
    }

    const map = new Map<string, any[]>();
    weekDays.forEach(date => {
      const targetDate = dayjs(date).format("YYYY-MM-DD");
      const matching = planData.accommodations.filter((acc: any) => {
        if (!acc || !acc.checkinDate || !acc.checkoutDate) return false;
        const checkinDate = dayjs(acc.checkinDate).format("YYYY-MM-DD");
        const checkoutDate = dayjs(acc.checkoutDate).format("YYYY-MM-DD");
        return targetDate >= checkinDate && targetDate <= checkoutDate;
      });
      map.set(date, matching);
    });
    return map;
  }, [weekDays, planData?.accommodations]);

  const getAllAccommodationsForDate = useCallback(
    (date: string) => {
      return accommodationsByDate.get(date) || [];
    },
    [accommodationsByDate],
  );

  const _getAccommodationForDate = (date: string) => {
    const accommodations = getAllAccommodationsForDate(date);
    if (accommodations.length === 0) {
      return undefined;
    }

    const targetDate = dayjs(date).format("YYYY-MM-DD");
    const checkinAccommodation = accommodations.find((acc: any) => {
      const checkinDate = dayjs(acc.checkinDate).format("YYYY-MM-DD");
      return targetDate === checkinDate;
    });

    return checkinAccommodation || accommodations[0];
  };

  const isAccommodationStart = (accommodation: any, date: string) => {
    if (!accommodation) return false;
    const checkinDate = dayjs(accommodation.checkinDate).format("YYYY-MM-DD");
    const targetDate = dayjs(date).format("YYYY-MM-DD");
    return targetDate === checkinDate;
  };

  const isAccommodationEnd = (accommodation: any, date: string) => {
    if (!accommodation) return false;
    const checkoutDate = dayjs(accommodation.checkoutDate).format("YYYY-MM-DD");
    const targetDate = dayjs(date).format("YYYY-MM-DD");
    return targetDate === checkoutDate;
  };

  const getAccommodationTimeRange = (accommodation: any, date: string) => {
    if (!accommodation) return null;

    const targetDate = dayjs(date).format("YYYY-MM-DD");
    const checkinDate = dayjs(accommodation.checkinDate).format("YYYY-MM-DD");
    const checkoutDate = dayjs(accommodation.checkoutDate).format("YYYY-MM-DD");

    if (targetDate < checkinDate || targetDate > checkoutDate) {
      return null;
    }

    const normalizeTime = (time: string) => {
      if (!time) return "00:00";
      return time.split(":").slice(0, 2).join(":");
    };

    const checkinTime = normalizeTime(accommodation.checkinTime || "15:00");
    const checkoutTime = normalizeTime(accommodation.checkoutTime || "11:00");

    let startHour = 0;
    let endHour = 24;

    if (targetDate === checkinDate) {
      const [hour, minute] = checkinTime.split(":").map(Number);
      startHour = hour + minute / 60;
      endHour = 24;
    } else if (targetDate === checkoutDate) {
      const [hour, minute] = checkoutTime.split(":").map(Number);
      startHour = 0;
      endHour = hour + minute / 60;
    } else {
      startHour = 0;
      endHour = 24;
    }

    return {
      startPercent: (startHour / 24) * 100,
      widthPercent: ((endHour - startHour) / 24) * 100,
    };
  };

  const handleAddTrip = async (newTrip: any) => {
    try {
      const createdPlan = await onPlanAdd({
        title: newTrip.name.trim(),
        segments: newTrip.segments ?? [],
      });

      if (createdPlan) {
        const newTripData = {
          id: createdPlan.id.toString(),
          publicId: createdPlan.publicId,
          name: createdPlan.title,
          startDate: createdPlan.startDate,
          endDate: createdPlan.endDate,
        };
        setInternalSelectedTrip(newTripData);
        onPlanSelect?.(newTripData);

        if (typeof window !== "undefined" && Platform.OS === "web") {
          window.history.pushState({}, "", `/plans/${createdPlan.publicId}`);
        }

        return newTripData;
      } else {
        setResultModalConfig({
          mode: "error",
          params: { message: "여행 계획 추가에 실패했습니다." },
        });
        setResultModalVisible(true);
      }
    } catch (_error) {
      setResultModalConfig({
        mode: "error",
        params: { message: "여행 계획 추가에 실패했습니다." },
      });
      setResultModalVisible(true);
    }

    return null;
  };

  const handlePlanAddSubmit = async () => {
    const result = await handleAddTrip(planForm.tripData);
    if (result) {
      setShowAddPlanModal(false);
      planForm.resetForm();
    }
  };

  const handleUpdateTrip = async (tripId: string, updatedTrip: any) => {
    try {
      const planId = Number.parseInt(tripId);
      const updatedPlan = await onPlanUpdate(planId, {
        title: updatedTrip.name,
        segments: updatedTrip.segments ?? [],
      });

      if (updatedPlan) {
        if (selectedTrip && selectedTrip.id === tripId) {
          const updatedTripData = {
            id: updatedPlan.id.toString(),
            name: updatedPlan.title,
            startDate: updatedPlan.startDate,
            endDate: updatedPlan.endDate,
          };
          setInternalSelectedTrip(updatedTripData);

          const startDateWeekStart = dayjs(updatedPlan.startDate)
            .startOf("week")
            .add(1, "day");
          setCurrentWeekStart(startDateWeekStart);
        }
      } else {
        setResultModalConfig({
          mode: "error",
          params: { message: "여행 계획 수정에 실패했습니다." },
        });
        setResultModalVisible(true);
      }
    } catch (_error) {
      setResultModalConfig({
        mode: "error",
        params: { message: "여행을 수정하는 중 알림가 발생했습니다." },
      });
      setResultModalVisible(true);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      const planId = Number.parseInt(tripId);
      const success = await onPlanDelete(planId);

      if (success) {
        if (internalSelectedTrip && internalSelectedTrip.id === tripId) {
          const today = dayjs().format("YYYY-MM-DD");
          const remaining = externalTrips.filter((t: any) => t.id !== tripId);
          const ongoing = remaining.filter(
            (t: any) => t.startDate <= today && t.endDate >= today,
          );
          const upcoming = remaining
            .filter((t: any) => t.startDate > today)
            .sort((a: any, b: any) => a.startDate.localeCompare(b.startDate));
          const past = remaining
            .filter((t: any) => t.endDate < today)
            .sort((a: any, b: any) => b.endDate.localeCompare(a.endDate));
          const next = [...ongoing, ...upcoming, ...past][0] ?? null;
          setInternalSelectedTrip(next);
          onPlanSelect?.(next);
        }
      } else {
        setResultModalConfig({
          mode: "error",
          params: { message: "여행 계획 삭제에 실패했습니다." },
        });
        setResultModalVisible(true);
      }
    } catch (_error) {
      setResultModalConfig({
        mode: "error",
        params: { message: "여행을 삭제하는 중 알림가 발생했습니다." },
      });
      setResultModalVisible(true);
    }
  };

  const displayItineraries = itineraries;

  const finalItineraries = displayItineraries;

  const events = useMemo(() => {
    const itineraryEvents = finalItineraries.map(toEvent);
    const flightEvents = flights.flatMap(toFlightEvents);

    const previewEvents = previewEvent
      ? [
          {
            id: "preview-event",
            title: previewEvent.title,
            start: previewEvent.start,
            end: previewEvent.end,
            type: "preview",
            normalizedStartTime: previewEvent.startTime,
            normalizedEndTime: previewEvent.endTime,
            locationText: previewEvent.location || "",
            originalData: { category: previewEvent.category },
          },
        ]
      : [];

    const allEvents = [...itineraryEvents, ...flightEvents, ...previewEvents];

    if (droppedEventPosition) {
      const eventIndex = allEvents.findIndex(
        e => String(e.id) === String(droppedEventPosition.eventId),
      );
      if (eventIndex !== -1) {
        const event = allEvents[eventIndex];

        allEvents[eventIndex] = {
          ...event,
          start: droppedEventPosition.newStart,
          end: droppedEventPosition.newEnd,
          normalizedStartTime: dayjs(droppedEventPosition.newStart).format(
            "HH:mm",
          ),
          normalizedEndTime: dayjs(droppedEventPosition.newEnd).format("HH:mm"),
        };
      } else {
      }
    }

    allEvents.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );

    const overlapGroups: any[][] = [];
    const processedEvents: any[] = [];

    allEvents.forEach(event => {
      const alreadyInGroup = overlapGroups.some(group =>
        group.some(e => e.id === event.id),
      );

      if (alreadyInGroup) return;

      const overlappingEvents = allEvents.filter(otherEvent => {
        if (otherEvent.id === event.id) return false;
        const eventStart = new Date(event.start).getTime();
        const eventEnd = new Date(event.end).getTime();
        const otherStart = new Date(otherEvent.start).getTime();
        const otherEnd = new Date(otherEvent.end).getTime();

        return !(eventEnd <= otherStart || eventStart >= otherEnd);
      });

      if (overlappingEvents.length > 0) {
        const group = [event, ...overlappingEvents];
        group.sort((a, b) => {
          const startDiff =
            new Date(a.start).getTime() - new Date(b.start).getTime();
          if (startDiff !== 0) return startDiff;
          return String(a.id).localeCompare(String(b.id));
        });
        overlapGroups.push(group);
      }
    });

    return allEvents.map(event => {
      const group = overlapGroups.find(g => g.some(e => e.id === event.id));

      if (group) {
        const customOverlapIndex = group.findIndex(e => e.id === event.id);
        const customOverlapCount = group.length;

        return {
          ...event,
          id: String(event.id),
          customOverlapIndex,
          customOverlapCount,
        };
      }

      return {
        ...event,
        id: String(event.id),
        customOverlapIndex: 0,
        customOverlapCount: 1,
      };
    });

    return processedEvents;
  }, [itineraries, flights, previewEvent, droppedEventPosition]);

  const goPrev = () => setCurrentWeekStart(prev => prev.subtract(1, "week"));
  const goNext = () => setCurrentWeekStart(prev => prev.add(1, "week"));
  const goToday = () =>
    setCurrentWeekStart(dayjs().startOf("week").add(1, "day"));

  return (
    <View ref={panelRef} style={styles.panelWrapper}>
      {dropFileOverlay && (
        <View style={styles.dropOverlay} pointerEvents="none">
          <View style={styles.dropOverlayIconCircle}>
            <UploadIcon width={28} height={28} />
          </View>
          <Text style={styles.dropOverlayTitle}>파일을 놓으면 일정으로 분석해요</Text>
          <Text style={styles.dropOverlaySubtext}>엑셀 · 이미지 · PDF</Text>
        </View>
      )}
    <PanelLayout style={styles.container}>
      <View style={styles.customHeader}>
        <View style={styles.leftSection}>
          <Text style={styles.title}>여행 일정</Text>

          <View style={styles.dateNavigation}>
            <Pressable onPress={goPrev} style={styles.navArrowButton}>
              <LeftArrowIcon width={10} height={10} />
            </Pressable>

            <Text style={styles.navDateText}>
              {currentWeekStart.format("YYYY년 M월")}
            </Text>

            <Pressable onPress={goNext} style={styles.navArrowButton}>
              <RightArrowIcon width={10} height={10} />
            </Pressable>
          </View>

          <Pressable
            onPress={goToday}
            style={[styles.actionButton, { marginLeft: spacing.lg }]}
          >
            <View style={styles.todayIconWrapper}>
              <TodayIcon width={13} height={13} />
            </View>
            <Text style={styles.actionButtonText}>오늘</Text>
          </Pressable>

          <View style={styles.calendarButtonWrapper}>
            <Pressable
              ref={calendarBtnRef}
              onPress={() => setShowMonthPicker(!showMonthPicker)}
              style={[styles.iconButton, { marginLeft: spacing.xs }]}
            >
              <CalenderIcon width={13} height={13} />
            </Pressable>
            <BaseCalendar
              visible={showMonthPicker}
              selectedDate={selectedDate}
              onDayPress={day => {
                setSelectedDate(day.dateString);
                const monday = dayjs(day.dateString)
                  .startOf("week")
                  .add(1, "day");
                setCurrentWeekStart(monday);
              }}
              onClose={() => setShowMonthPicker(false)}
              style={calendarPopupPos}
              currentWeekStart={currentWeekStart.format("YYYY-MM-DD")}
              showToday={true}
              showHover={true}
              scrollToWeek={true}
              hideButtons={true}
              autoCloseOnSelect={true}
            />
          </View>
        </View>

        <View style={styles.rightSection}>
          <TripSelector
            selectedTrip={internalSelectedTrip}
            onTripSelect={trip => {
              setInternalSelectedTrip(trip);
              if (onPlanSelect) {
                onPlanSelect(trip);
              }
              if (typeof window !== "undefined" && Platform.OS === "web") {
                if (trip?.publicId) {
                  window.history.pushState({}, "", `/plans/${trip.publicId}`);
                } else {
                  window.history.pushState({}, "", "/");
                }
              }
              setOpenTripSelector(false);
            }}
            trips={trips}
            onTripAdd={handleAddTrip}
            onTripUpdate={handleUpdateTrip}
            onTripDelete={handleDeleteTrip}
            open={openTripSelector}
          />

          {internalSelectedTrip ? (
            <Pressable
              onPress={() => {
                if (isGuest) {
                  guestPrompt.show();
                  return;
                }
                setAiChatOpen(true);
              }}
              style={styles.aiChatButton}
            >
              <GradientBackground style={styles.aiChatButtonGradient}>
                <LightningIcon width={13} height={13} color={colors.black} />
                <Text style={styles.aiChatButtonText}>대화로 일정 추가</Text>
              </GradientBackground>
            </Pressable>
          ) : null}

          {internalSelectedTrip ? (
            <View style={styles.actionGroup}>
              {(myRole === "owner" || myRole === "editor") && (
                <Tooltip text="항공편 추가">
                  <Pressable
                    onPress={() => {
                      setSelectedAccommodationId(null);
                      if (onRequestNewFlight) onRequestNewFlight();
                      else onShowFlightModal?.();
                    }}
                    style={styles.iconButton}
                  >
                    <AirplaneIcon width={13} height={13} />
                  </Pressable>
                </Tooltip>
              )}

              {(myRole === "owner" ||
                myRole === "editor" ||
                myRole === "viewer") && (
                <Tooltip text="메모">
                  <Pressable
                    onPress={() => {
                      setMemoDraft((planData.plan as any)?.memo ?? "");
                      setMemoOpen(true);
                    }}
                    style={styles.iconButton}
                  >
                    <MemoIcon width={13} height={13} />
                  </Pressable>
                </Tooltip>
              )}

              {(myRole === "owner" || myRole === "editor") && (
                <Tooltip text="공유하기">
                  <Pressable
                    onPress={() => {
                      if (isGuest) {
                        guestPrompt.show();
                        return;
                      }
                      setShareOpen(true);
                    }}
                    style={styles.iconButton}
                  >
                    <ShareIcon width={16} height={16} />
                  </Pressable>
                </Tooltip>
              )}

              {(myRole === "owner" || myRole === "editor") && (
                <Tooltip text="파일로 일정 추가">
                  <Pressable
                    style={styles.iconButton}
                    onPress={() => setImportFileOpen(true)}
                  >
                    <ImportFileIcon
                      width={14}
                      height={14}
                      color={colors.gray900}
                    />
                  </Pressable>
                </Tooltip>
              )}

              {(myRole === "owner" || myRole === "editor") && (
                <Tooltip text="내보내기">
                  <Pressable
                    style={styles.iconButton}
                    onPress={() => setExportOpen(true)}
                  >
                    <ExportPlanIcon
                      width={14}
                      height={14}
                      color={colors.gray900}
                    />
                  </Pressable>
                </Tooltip>
              )}
            </View>
          ) : null}
        </View>
      </View>

      <View
        style={styles.calendarWrapper}
        ref={calendarWrapperRef}
        {...(Platform.OS === "web"
          ? { "data-testid": "calendar-wrapper" }
          : {})}
        onLayout={e => {
          const { x, y, width, height } = e.nativeEvent.layout;
          setCalendarLayout({ x, y, width, height });
        }}
      >
        <BigCalendar
          mode="week"
          events={events}
          height={height - 50}
          date={currentWeekStart.toDate()}
          hourRowHeight={40}
          timeslots={3}
          weekStartsOn={1}
          hideNowIndicator
          swipeEnabled
          showTime
          scrollOffsetMinutes={360}
          onSwipeEnd={(newDate: Date) => {
            const newWeekStart = dayjs(newDate).startOf("week").add(1, "day");
            setCurrentWeekStart(newWeekStart);
          }}
          renderHeader={_props => {
            return (
              <View>
                <View style={styles.weekHeaderRow}>
                  <View style={styles.timeColumn} />
                  {weekDays.map((date, _index) => {
                    const isToday =
                      dayjs(date).format("YYYY-MM-DD") ===
                      dayjs().format("YYYY-MM-DD");
                    return (
                      <View key={date} style={styles.dateHeaderCell}>
                        <Text style={styles.weekdayText}>
                          {dayjs(date).format("ddd")}
                        </Text>
                        <View style={isToday ? styles.todayDateCircle : null}>
                          <Text
                            style={
                              isToday ? styles.todayDateText : styles.dateText
                            }
                          >
                            {dayjs(date).format("D")}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {internalSelectedTrip && (
                  <View style={styles.accommodationHeaderRow}>
                    <View
                      style={[
                        styles.timeColumn,
                        {
                          justifyContent: "center",
                          alignItems: "center",
                          borderRightWidth: 0.5,
                          borderRightColor: "#e0e0e0",
                        },
                      ]}
                    >
                      <AccommodationIcon
                        width={16}
                        height={16}
                        color={colors.gray700}
                      />
                    </View>
                    <View
                      ref={accCreateRowRef}
                      style={styles.accommodationRowInner}
                    >
                      {weekDays.map((date, index) => {
                        const accommodations =
                          getAllAccommodationsForDate(date);

                        const nextDate =
                          index < weekDays.length - 1
                            ? weekDays[index + 1]
                            : null;
                        const nextAccommodations = nextDate
                          ? getAllAccommodationsForDate(nextDate)
                          : [];

                        const hasAnyContinuousAccommodation =
                          accommodations.some((acc: any) =>
                            nextAccommodations.some(
                              (nextAcc: any) => acc.id === nextAcc.id,
                            ),
                          );

                        const firstAccommodation = accommodations[0];
                        const isMiddle =
                          firstAccommodation &&
                          !isAccommodationStart(firstAccommodation, date) &&
                          !isAccommodationEnd(firstAccommodation, date);

                        const shouldHideRightBorder =
                          hasAnyContinuousAccommodation || isMiddle;

                        return (
                          <Pressable
                            key={date}
                            style={{
                              flex: 1,
                              justifyContent: "center",
                              alignItems: "center",
                              position: "relative",
                              overflow: "visible",
                              borderRightWidth:
                                index < weekDays.length - 1 &&
                                !shouldHideRightBorder
                                  ? 1
                                  : 0,
                              borderRightColor: "#e0e0e0",
                              zIndex: 0,
                            }}
                            {...(Platform.OS === "web"
                              ? {
                                  onMouseDown: (e: any) => {
                                    const clientX =
                                      e.nativeEvent?.clientX || e.clientX || 0;
                                    const target =
                                      e.currentTarget as HTMLElement | null;
                                    if (target) {
                                      const rect =
                                        target.getBoundingClientRect();
                                      const clickPercent =
                                        ((clientX - rect.left) / rect.width) *
                                        100;
                                      const isOnBar = accommodations.some(
                                        (acc: any) => {
                                          const tr = getAccommodationTimeRange(
                                            acc,
                                            date,
                                          );
                                          return tr
                                            ? clickPercent >= tr.startPercent &&
                                                clickPercent <=
                                                  tr.startPercent +
                                                    tr.widthPercent
                                            : false;
                                        },
                                      );
                                      if (isOnBar) return;
                                    }
                                    e.preventDefault();
                                    const rowEl =
                                      accCreateRowRef.current as any;
                                    if (rowEl) {
                                      const node =
                                        rowEl._nativeNode ??
                                        rowEl._internalFiberInstanceHandleDEV
                                          ?.stateNode ??
                                        rowEl;
                                      if (node?.getBoundingClientRect)
                                        accCreateRowRectRef.current =
                                          node.getBoundingClientRect();
                                    }
                                    accCreateDragPendingRef.current = {
                                      date,
                                      startX: clientX,
                                    };
                                  },
                                }
                              : {})}
                            onPress={e => {
                              if (accCreateDragOccurredRef.current) {
                                accCreateDragOccurredRef.current = false;
                                return;
                              }
                              if (Platform.OS === "web") {
                                const clickX =
                                  (e.nativeEvent as any)?.clientX ||
                                  (e as any)?.clientX ||
                                  0;
                                const target =
                                  e.currentTarget as unknown as HTMLElement;
                                if (target) {
                                  const rect = target.getBoundingClientRect();
                                  const relativeX = clickX - rect.left;
                                  const clickPercent =
                                    (relativeX / rect.width) * 100;

                                  let clickedAccommodation = null;
                                  for (const acc of accommodations) {
                                    const timeRange = getAccommodationTimeRange(
                                      acc,
                                      date,
                                    );
                                    if (timeRange) {
                                      const isWithinBar =
                                        clickPercent >=
                                          timeRange.startPercent &&
                                        clickPercent <=
                                          timeRange.startPercent +
                                            timeRange.widthPercent;
                                      if (isWithinBar) {
                                        clickedAccommodation = acc;
                                        break;
                                      }
                                    }
                                  }

                                  if (clickedAccommodation) {
                                    setSelectedAccommodationId(
                                      clickedAccommodation.id,
                                    );
                                    setSelectedEventId(null);
                                    onShowAccommodationModal?.(
                                      clickedAccommodation,
                                    );
                                    setPreviewAccommodation(null);
                                    onPreviewAccommodationChange?.(null);
                                  } else {
                                    setSelectedAccommodationId(null);
                                    const _checkinDate = date;
                                    const checkoutDate = dayjs(date)
                                      .add(1, "day")
                                      .format("YYYY-MM-DD");
                                    const newPreview = {
                                      checkinDate: date,
                                      checkoutDate: checkoutDate,
                                      checkinTime: "15:00",
                                      checkoutTime: "11:00",
                                      name: "",
                                    };
                                    setPreviewAccommodation(newPreview);
                                    onPreviewAccommodationChange?.(newPreview);
                                    onShowAccommodationModal?.(null, date);
                                  }
                                  return;
                                }
                              }

                              if (accommodations.length > 0) {
                                setSelectedAccommodationId(
                                  accommodations[0].id,
                                );
                                setSelectedEventId(null);
                                onShowAccommodationModal?.(accommodations[0]);
                                setPreviewAccommodation(null);
                                onPreviewAccommodationChange?.(null);
                              } else {
                                setSelectedAccommodationId(null);
                                const _checkinDate = date;
                                const checkoutDate = dayjs(date)
                                  .add(1, "day")
                                  .format("YYYY-MM-DD");
                                const newPreview = {
                                  checkinDate: date,
                                  checkoutDate: checkoutDate,
                                  checkinTime: "15:00",
                                  checkoutTime: "11:00",
                                  name: "",
                                };
                                setPreviewAccommodation(newPreview);
                                onPreviewAccommodationChange?.(newPreview);
                                onShowAccommodationModal?.(null, date);
                              }
                            }}
                          >
                            {accommodations.map(
                              (accommodation: any, accIndex: number) => {
                                const isStart = isAccommodationStart(
                                  accommodation,
                                  date,
                                );
                                const isEnd = isAccommodationEnd(
                                  accommodation,
                                  date,
                                );
                                const isVisualStart =
                                  isStart || (index === 0 && !isEnd);
                                const _isMiddle =
                                  accommodation && !isStart && !isEnd;

                                const hasNextDay = nextAccommodations.some(
                                  (acc: any) => acc.id === accommodation.id,
                                );

                                const timeRange = getAccommodationTimeRange(
                                  accommodation,
                                  date,
                                );

                                const finalTimeRange = timeRange || {
                                  startPercent: 0,
                                  widthPercent: 100,
                                };

                                const _spanCount = 1;
                                let _totalWidthPercent = 0;

                                if (isVisualStart) {
                                  const currentLeft = Math.max(
                                    0,
                                    Math.min(finalTimeRange.startPercent, 100),
                                  );
                                  const currentMaxWidth = 100 - currentLeft;
                                  const currentRealWidth = Math.min(
                                    finalTimeRange.widthPercent,
                                    currentMaxWidth,
                                  );

                                  _totalWidthPercent += currentRealWidth;

                                  for (
                                    let i = index + 1;
                                    i < weekDays.length;
                                    i++
                                  ) {
                                    const d = weekDays[i];
                                    const dAccs =
                                      getAllAccommodationsForDate(d);
                                    const dAcc = dAccs.find(
                                      (a: any) => a.id === accommodation.id,
                                    );

                                    if (dAcc) {
                                      const dRange = getAccommodationTimeRange(
                                        dAcc,
                                        d,
                                      );
                                      const dWidth = dRange
                                        ? dRange.widthPercent
                                        : 100;

                                      const dLeft = dRange
                                        ? dRange.startPercent
                                        : 0;
                                      const dVisualWidth = Math.min(
                                        dWidth,
                                        100 - dLeft,
                                      );

                                      _totalWidthPercent += dVisualWidth;
                                    } else {
                                      break;
                                    }
                                  }
                                }

                                return (() => {
                                  const actualLeft = Math.max(
                                    0,
                                    Math.min(finalTimeRange.startPercent, 100),
                                  );
                                  const maxWidth = 100 - actualLeft;
                                  const actualWidth = Math.min(
                                    finalTimeRange.widthPercent,
                                    maxWidth,
                                  );

                                  const isDraggingThis =
                                    accDragState?.id === accommodation.id;
                                  const isSelected =
                                    selectedAccommodationId ===
                                      accommodation.id && !isDraggingThis;

                                  return (
                                    <View
                                      key={`${accommodation.id}-${date}-${accIndex}`}
                                      style={
                                        {
                                          position: "absolute",
                                          left: `${actualLeft}%`,
                                          width: `${actualWidth}%`,
                                          top: 2,
                                          bottom: 2,
                                          backgroundColor:
                                            colors.accommodationBg,
                                          borderTopWidth: isSelected ? 2 : 1,
                                          borderBottomWidth: isSelected ? 2 : 1,
                                          borderLeftWidth: isStart
                                            ? isSelected
                                              ? 2
                                              : 1
                                            : 0,
                                          borderRightWidth: isEnd
                                            ? isSelected
                                              ? 2
                                              : 1
                                            : 0,
                                          borderColor: isSelected
                                            ? colors.accommodationBorder
                                            : colors.accommodationBorder,
                                          borderTopLeftRadius: isStart ? 6 : 0,
                                          borderBottomLeftRadius: isStart
                                            ? 6
                                            : 0,
                                          borderTopRightRadius: isEnd ? 6 : 0,
                                          borderBottomRightRadius: isEnd
                                            ? 6
                                            : 0,
                                          minWidth: 1,
                                          zIndex: isVisualStart
                                            ? 10
                                            : hasNextDay
                                              ? 1
                                              : 0,
                                          overflow: "visible",
                                          opacity: isDraggingThis ? 0.3 : 1,
                                          cursor:
                                            Platform.OS === "web"
                                              ? "grab"
                                              : undefined,
                                        } as any
                                      }
                                      {...(Platform.OS === "web" &&
                                      (myRole === "owner" || myRole === "editor")
                                        ? {
                                            onMouseDown: (e: any) => {
                                              e.preventDefault();
                                              const clientX =
                                                e.nativeEvent?.clientX ||
                                                e.clientX ||
                                                0;
                                              const clientY =
                                                e.nativeEvent?.clientY ||
                                                e.clientY ||
                                                0;
                                              let calendarEl: HTMLElement | null =
                                                document.querySelector(
                                                  '[data-testid="calendar-wrapper"]',
                                                );
                                              if (!calendarEl) {
                                                const ref =
                                                  calendarWrapperRef.current as any;
                                                if (ref?._nativeNode)
                                                  calendarEl = ref._nativeNode;
                                                else if (
                                                  ref
                                                    ?._internalFiberInstanceHandleDEV
                                                    ?.stateNode
                                                )
                                                  calendarEl =
                                                    ref
                                                      ._internalFiberInstanceHandleDEV
                                                      .stateNode;
                                              }
                                              if (calendarEl)
                                                accDragCalendarRectRef.current =
                                                  calendarEl.getBoundingClientRect();
                                              accDragPendingRef.current = {
                                                id: accommodation.id,
                                                originalCheckinDate:
                                                  accommodation.checkinDate,
                                                originalCheckoutDate:
                                                  accommodation.checkoutDate,
                                                checkinTime:
                                                  accommodation.checkinTime ||
                                                  "15:00",
                                                checkoutTime:
                                                  accommodation.checkoutTime ||
                                                  "11:00",
                                                name: accommodation.name,
                                                startX: clientX,
                                                startY: clientY,
                                              };
                                            },
                                          }
                                        : {})}
                                    ></View>
                                  );
                                })();
                              },
                            )}

                            {accDragState?.targetDate &&
                              (() => {
                                const newCheckin = dayjs(
                                  accDragState.targetDate,
                                );
                                const stayDays = dayjs(
                                  accDragState.originalCheckoutDate,
                                ).diff(
                                  dayjs(accDragState.originalCheckinDate),
                                  "day",
                                );
                                const newCheckout = newCheckin.add(
                                  stayDays,
                                  "day",
                                );
                                const previewCheckinDt = dayjs(
                                  `${newCheckin.format("YYYY-MM-DD")} ${accDragState.checkinTime}`,
                                );
                                const previewCheckoutDt = dayjs(
                                  `${newCheckout.format("YYYY-MM-DD")} ${accDragState.checkoutTime}`,
                                );
                                const previewHasOverlap = (
                                  planData?.accommodations ?? []
                                ).some((acc: any) => {
                                  if (acc.id === accDragState.id) return false;
                                  const oDt = dayjs(
                                    `${acc.checkinDate} ${acc.checkinTime || "15:00"}`,
                                  );
                                  const oDtOut = dayjs(
                                    `${acc.checkoutDate} ${acc.checkoutTime || "11:00"}`,
                                  );
                                  return (
                                    previewCheckinDt.isBefore(oDtOut) &&
                                    previewCheckoutDt.isAfter(oDt)
                                  );
                                });

                                const inSpan =
                                  dayjs(date).isSame(newCheckin, "day") ||
                                  dayjs(date).isSame(newCheckout, "day") ||
                                  (dayjs(date).isAfter(newCheckin, "day") &&
                                    dayjs(date).isBefore(newCheckout, "day"));

                                if (!inSpan) return null;

                                const isPreviewStart = dayjs(date).isSame(
                                  newCheckin,
                                  "day",
                                );
                                const isPreviewEnd = dayjs(date).isSame(
                                  newCheckout,
                                  "day",
                                );
                                const _isPreviewVisualStart =
                                  isPreviewStart ||
                                  (index === 0 && !isPreviewEnd);

                                const parseHour = (t: string) => {
                                  const [h, m] = t.split(":").map(Number);
                                  return h + m / 60;
                                };
                                const checkinHour = parseHour(
                                  accDragState.checkinTime,
                                );
                                const checkoutHour = parseHour(
                                  accDragState.checkoutTime,
                                );

                                let previewLeft = 0;
                                let previewWidth = 100;
                                if (isPreviewStart && isPreviewEnd) {
                                  previewLeft = (checkinHour / 24) * 100;
                                  previewWidth =
                                    ((checkoutHour - checkinHour) / 24) * 100;
                                } else if (isPreviewStart) {
                                  previewLeft = (checkinHour / 24) * 100;
                                  previewWidth =
                                    ((24 - checkinHour) / 24) * 100;
                                } else if (isPreviewEnd) {
                                  previewLeft = 0;
                                  previewWidth = (checkoutHour / 24) * 100;
                                }

                                return (
                                  <View
                                    key="acc-drag-preview"
                                    style={{
                                      position: "absolute",
                                      left: `${previewLeft}%` as any,
                                      width: `${previewWidth}%` as any,
                                      top: 2,
                                      bottom: 2,
                                      backgroundColor: previewHasOverlap
                                        ? "rgba(239,68,68,0.15)"
                                        : colors.accommodationBg,
                                      borderTopWidth: 2,
                                      borderBottomWidth: 2,
                                      borderLeftWidth: isPreviewStart ? 2 : 0,
                                      borderRightWidth: isPreviewEnd ? 2 : 0,
                                      borderStyle: "dashed" as any,
                                      borderColor: previewHasOverlap
                                        ? colors.danger
                                        : colors.accommodationBorder,
                                      borderTopLeftRadius: isPreviewStart
                                        ? 6
                                        : 0,
                                      borderBottomLeftRadius: isPreviewStart
                                        ? 6
                                        : 0,
                                      borderTopRightRadius: isPreviewEnd
                                        ? 6
                                        : 0,
                                      borderBottomRightRadius: isPreviewEnd
                                        ? 6
                                        : 0,
                                      zIndex: 15,
                                      pointerEvents: "none" as const,
                                      overflow: "visible",
                                    }}
                                  ></View>
                                );
                              })()}
                          </Pressable>
                        );
                      })}
                      {(() => {
                        const labels: React.ReactNode[] = [];
                        const seen = new Set<number>();
                        weekDays.forEach((date, index) => {
                          const accs = getAllAccommodationsForDate(date);
                          accs.forEach((acc: any) => {
                            if (seen.has(acc.id)) return;
                            const isStart = isAccommodationStart(acc, date);
                            const isEnd = isAccommodationEnd(acc, date);
                            const isVisualStart =
                              isStart || (index === 0 && !isEnd);
                            if (!isVisualStart) return;
                            seen.add(acc.id);

                            const timeRange = getAccommodationTimeRange(
                              acc,
                              date,
                            );
                            const startPercent = timeRange
                              ? timeRange.startPercent
                              : 0;

                            let endIndex = index;
                            let endPercent = timeRange
                              ? timeRange.startPercent + timeRange.widthPercent
                              : 100;
                            for (let i = index + 1; i < weekDays.length; i++) {
                              const dAccs = getAllAccommodationsForDate(
                                weekDays[i],
                              );
                              const dAcc = dAccs.find(
                                (a: any) => a.id === acc.id,
                              );
                              if (dAcc) {
                                const dRange = getAccommodationTimeRange(
                                  dAcc,
                                  weekDays[i],
                                );
                                endIndex = i;
                                endPercent = dRange
                                  ? dRange.startPercent + dRange.widthPercent
                                  : 100;
                              } else break;
                            }

                            const leftPct =
                              ((index + startPercent / 100) / weekDays.length) *
                              100;
                            const rightPct =
                              ((endIndex + endPercent / 100) /
                                weekDays.length) *
                              100;
                            const widthPct = rightPct - leftPct;

                            const isDraggingThisLabel =
                              accDragState?.id === acc.id;
                            labels.push(
                              <View
                                key={`acc-label-${acc.id}`}
                                style={{
                                  position: "absolute",
                                  left: `${leftPct}%` as any,
                                  width: `${widthPct}%` as any,
                                  top: 0,
                                  bottom: 0,
                                  paddingHorizontal: 10,
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 6,
                                  overflow: "hidden",
                                  zIndex: 25,
                                  pointerEvents: "none" as any,
                                  opacity: isDraggingThisLabel ? 0.3 : 1,
                                }}
                              >
                                <View style={styles.itemDot} />
                                <Text
                                  style={{
                                    ...textStyles.h9,
                                    color: colors.accommodationText,
                                    flexShrink: 1,
                                  }}
                                  numberOfLines={1}
                                  ellipsizeMode="tail"
                                >
                                  {acc.name}
                                </Text>
                              </View>,
                            );
                          });
                        });
                        return labels;
                      })()}
                      {accCreateDragState &&
                        (() => {
                          const startD = dayjs(accCreateDragState.startDate);
                          const endD = dayjs(accCreateDragState.endDate);
                          const checkinD = startD.isAfter(endD) ? endD : startD;
                          const checkoutD = startD.isAfter(endD)
                            ? startD
                            : endD;

                          const checkinIndex = weekDays.findIndex(d =>
                            dayjs(d).isSame(checkinD, "day"),
                          );
                          const checkoutIndex = weekDays.findIndex(d =>
                            dayjs(d).isSame(checkoutD, "day"),
                          );
                          if (checkinIndex === -1 && checkoutIndex === -1)
                            return null;

                          const si = checkinIndex !== -1 ? checkinIndex : 0;
                          const ei =
                            checkoutIndex !== -1
                              ? checkoutIndex
                              : weekDays.length - 1;

                          const leftPct =
                            ((si + 15 / 24) / weekDays.length) * 100;
                          const rightPct =
                            ((ei + 11 / 24) / weekDays.length) * 100;
                          const widthPct = rightPct - leftPct;
                          if (widthPct <= 0) return null;

                          const isOverlap = (
                            planData?.accommodations ?? []
                          ).some((acc: any) => {
                            const oDt = dayjs(
                              `${acc.checkinDate} ${acc.checkinTime || "15:00"}`,
                            );
                            const oDtOut = dayjs(
                              `${acc.checkoutDate} ${acc.checkoutTime || "11:00"}`,
                            );
                            const newDt = dayjs(
                              `${checkinD.format("YYYY-MM-DD")} 15:00`,
                            );
                            const newDtOut = dayjs(
                              `${checkoutD.format("YYYY-MM-DD")} 11:00`,
                            );
                            return (
                              newDt.isBefore(oDtOut) && newDtOut.isAfter(oDt)
                            );
                          });

                          return (
                            <View
                              key="acc-create-preview"
                              style={{
                                position: "absolute",
                                left: `${leftPct}%` as any,
                                width: `${widthPct}%` as any,
                                top: 2,
                                bottom: 2,
                                backgroundColor: isOverlap
                                  ? "rgba(239,68,68,0.15)"
                                  : colors.accommodationBg,
                                borderWidth: 2,
                                borderStyle: "dashed" as any,
                                borderColor: isOverlap
                                  ? colors.danger
                                  : colors.accommodationBorder,
                                borderRadius: 6,
                                opacity: 0.7,
                                zIndex: 20,
                                pointerEvents: "none" as any,
                              }}
                            />
                          );
                        })()}
                      {previewAccommodation &&
                        !accCreateDragState &&
                        (() => {
                          const parseHour = (t: string) => {
                            const [h, m] = (t || "00:00")
                              .split(":")
                              .map(Number);
                            return h + m / 60;
                          };
                          const checkinD = dayjs(
                            previewAccommodation.checkinDate,
                          );
                          const checkoutD = dayjs(
                            previewAccommodation.checkoutDate,
                          );
                          const checkinHour = parseHour(
                            previewAccommodation.checkinTime || "15:00",
                          );
                          const checkoutHour = parseHour(
                            previewAccommodation.checkoutTime || "11:00",
                          );

                          let si = weekDays.findIndex(d =>
                            dayjs(d).isSame(checkinD, "day"),
                          );
                          let ei = weekDays.findIndex(d =>
                            dayjs(d).isSame(checkoutD, "day"),
                          );
                          if (si === -1 && ei === -1) return null;
                          if (si === -1) si = 0;
                          if (ei === -1) ei = weekDays.length - 1;

                          const leftPct =
                            ((si + checkinHour / 24) / weekDays.length) * 100;
                          const rightPct =
                            ((ei + checkoutHour / 24) / weekDays.length) * 100;
                          const widthPct = rightPct - leftPct;
                          if (widthPct <= 0) return null;

                          return (
                            <View
                              key="acc-preview-bar"
                              style={{
                                position: "absolute",
                                left: `${leftPct}%` as any,
                                width: `${widthPct}%` as any,
                                top: 2,
                                bottom: 2,
                                backgroundColor: colors.accommodationBg,
                                borderWidth: 2,
                                borderStyle: "dashed" as any,
                                borderColor: colors.accommodationBorder,
                                borderRadius: 6,
                                opacity: 0.7,
                                zIndex: 20,
                                pointerEvents: "none" as any,
                              }}
                            />
                          );
                        })()}
                      {accDragState?.targetDate &&
                        (() => {
                          const newCheckin = dayjs(accDragState.targetDate);
                          const stayDays = dayjs(
                            accDragState.originalCheckoutDate,
                          ).diff(
                            dayjs(accDragState.originalCheckinDate),
                            "day",
                          );
                          const newCheckout = newCheckin.add(stayDays, "day");

                          const parseHour = (t: string) => {
                            const [h, m] = t.split(":").map(Number);
                            return h + m / 60;
                          };
                          const checkinHour = parseHour(
                            accDragState.checkinTime,
                          );
                          const checkoutHour = parseHour(
                            accDragState.checkoutTime,
                          );

                          let startIndex = -1;
                          let endIndex = -1;
                          weekDays.forEach((d, i) => {
                            if (dayjs(d).isSame(newCheckin, "day"))
                              startIndex = i;
                            if (dayjs(d).isSame(newCheckout, "day"))
                              endIndex = i;
                          });
                          if (startIndex === -1) startIndex = 0;
                          if (endIndex === -1) endIndex = weekDays.length - 1;

                          const startPct = (checkinHour / 24) * 100;
                          const endPct = (checkoutHour / 24) * 100;

                          const leftPct =
                            ((startIndex + startPct / 100) / weekDays.length) *
                            100;
                          const rightPct =
                            ((endIndex + endPct / 100) / weekDays.length) * 100;
                          const widthPct = rightPct - leftPct;

                          if (widthPct <= 0) return null;
                          return (
                            <View
                              style={{
                                position: "absolute",
                                left: `${leftPct}%` as any,
                                width: `${widthPct}%` as any,
                                top: 0,
                                bottom: 0,
                                paddingHorizontal: 10,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                                overflow: "hidden",
                                zIndex: 30,
                                pointerEvents: "none" as any,
                              }}
                            >
                              <View style={styles.itemDot} />
                              <Text
                                style={{
                                  ...textStyles.h9,
                                  color: colors.accommodationText,
                                  flexShrink: 1,
                                }}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                {accDragState.name}
                              </Text>
                            </View>
                          );
                        })()}
                    </View>
                  </View>
                )}
              </View>
            );
          }}
          onPressCell={(date: Date) => {
            setSelectedEventId(null);
            setSelectedAccommodationId(null);

            const hasPlans = trips.length > 0;
            const isPlanSelected = internalSelectedTrip !== null;

            if (!hasPlans) {
              setShowAddPlanModal(true);
              return;
            }

            if (!isPlanSelected) {
              setShowPlanSelectRequiredModal(true);
              return;
            }

            const startTime = dayjs(date);
            const endTime = startTime.add(1, "hour");

            setPreviewEvent({
              start: startTime.toDate(),
              end: endTime.toDate(),
              title: "제목없음",
              startTime: startTime.format("HH:mm"),
              endTime: endTime.format("HH:mm"),
              location: "",
            });

            onRequestNewItinerary?.(date);
          }}
          renderEvent={(event, touchableOpacityProps) => {
            const {
              key: eventKey,
              children: _ignoreChildren,
              style: tpStyle,
              onPress: calendarOnPress,
              ...rest
            } = (touchableOpacityProps as any) ?? {};

            const isItinerary = event.type === "itinerary";
            const isFlight = event.type === "flight";
            const isPreview = event.type === "preview";

            const isDragging = draggingEvent?.id === event.id;

            const isSelected = selectedEventId === event.id;
            const borderWidth = isSelected ? 2 : 1;

            const isDraggable =
              !isPreview &&
              (isItinerary || isFlight) &&
              (myRole === "owner" || myRole === "editor");

            const flattenStyle = (style: any): any => {
              if (!style) return {};
              if (Array.isArray(style)) {
                return Object.assign(
                  {},
                  ...style
                    .filter(s => s && typeof s === "object")
                    .map(flattenStyle),
                );
              }
              return style || {};
            };

            const flatTpStyle = flattenStyle(tpStyle);
            const adjustedStyle = { ...flatTpStyle };

            const isFirstBar =
              !event.startDateStr ||
              dayjs(event.start).format("YYYY-MM-DD") === event.startDateStr;

            const totalWidthPercent = 90;
            const leftMarginPercent = 3.5;

            if (adjustedStyle.marginTop !== undefined) {
              delete adjustedStyle.marginTop;
            }

            if (
              event.customOverlapCount > 1 &&
              typeof event.customOverlapIndex === "number"
            ) {
              const overlapIndex = event.customOverlapIndex;
              const overlapCount = event.customOverlapCount;
              const gapPercent = 1.5;
              const slotWidth =
                (totalWidthPercent - gapPercent * (overlapCount - 1)) /
                overlapCount;
              adjustedStyle.width = `${slotWidth}%`;
              adjustedStyle.left = `${leftMarginPercent + (slotWidth + gapPercent) * overlapIndex}%`;
              delete adjustedStyle.minWidth;
            } else {
              adjustedStyle.left = `${leftMarginPercent}%`;
              adjustedStyle.width = `${totalWidthPercent}%`;

              delete adjustedStyle.minWidth;
            }

            adjustedStyle.minHeight = 20;

            let blockHeight = eventHeights[event.id] || 0;

            if (blockHeight === 0) {
              const startTime = new Date(event.start).getTime();
              const endTime = new Date(event.end).getTime();
              const durationMinutes = (endTime - startTime) / (1000 * 60);
              const segmentHeight = 40 / 4;
              blockHeight = (durationMinutes / 15) * segmentHeight;
              if (blockHeight < 20) blockHeight = 20;
            }

            const contentHeight = Math.max(blockHeight - 8, 0);
            const durationMinutes =
              (new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60);
            const isCompact = durationMinutes <= 30;

            const showTitle = durationMinutes > 0;
            const showTime = !isCompact && contentHeight >= 28;
            const showLocation = contentHeight > 52;

            const flightStyle = isFlight
              ? {
                  backgroundColor: colors.flightBg,
                  borderWidth: borderWidth,
                  borderColor: isSelected
                    ? colors.flightText
                    : colors.flightBorder,
                  borderRadius: radii.md,
                }
              : null;

            const itineraryCategory = (isItinerary || isPreview)
              ? (event.originalData?.category as ItineraryCategory | undefined)
              : undefined;
            const itineraryCategoryColor = itineraryCategory
              ? itineraryCategoryColors[itineraryCategory]
              : null;
            const itineraryStyle = isItinerary
              ? {
                  backgroundColor: itineraryCategoryColor
                    ? `${itineraryCategoryColor}1A`
                    : colors.itineraryBg,
                  borderWidth: borderWidth,
                  borderColor: isSelected
                    ? (itineraryCategoryColor ?? colors.itineraryText)
                    : itineraryCategoryColor
                      ? `${itineraryCategoryColor}59`
                      : colors.itineraryBorder,
                  borderRadius: radii.md,
                }
              : null;

            const previewStyle = isPreview
              ? {
                  backgroundColor: itineraryCategoryColor
                    ? `${itineraryCategoryColor}1A`
                    : colors.itineraryBg,
                  borderWidth: 1,
                  borderColor: itineraryCategoryColor
                    ? `${itineraryCategoryColor}59`
                    : colors.itineraryBorder,
                  borderRadius: radii.md,
                  borderStyle: "dashed",
                  opacity: 0.7,
                }
              : null;

            const finalStyle = previewStyle ||
              flightStyle ||
              itineraryStyle || { backgroundColor: event.color || "#3478f6" };

            const dragStyle = isDragging
              ? {
                  opacity: 0.3,
                  cursor: "grabbing",
                }
              : isDraggable
                ? {
                    cursor: "grab",
                  }
                : {};

            return (
              <View
                key={eventKey}
                {...rest}
                style={[adjustedStyle, finalStyle, dragStyle]}
                onLayout={e => {
                  const { height } = e.nativeEvent.layout;
                  if (height > 0 && eventHeights[event.id] !== height) {
                    setEventHeights(prev => ({
                      ...prev,
                      [event.id]: height,
                    }));
                  }
                }}
                {...(Platform.OS === "web" && isDraggable
                  ? {
                      onMouseDown: (e: any) => {
                        if (!isDragging && !isPreview) {
                          e.preventDefault();
                          e.stopPropagation();
                          const clientX =
                            e.nativeEvent?.clientX || e.clientX || 0;
                          const clientY =
                            e.nativeEvent?.clientY || e.clientY || 0;

                          const target = e.currentTarget as HTMLElement;
                          const rect = target.getBoundingClientRect();

                          setDraggingEvent({
                            id: event.id,
                            type: isItinerary ? "itinerary" : "flight",
                            startX: clientX,
                            startY: clientY,
                            elementX: rect.left,
                            elementY: rect.top,
                            elementWidth: rect.width,
                            elementHeight: rect.height,
                          });
                          setDragOffset({ x: 0, y: 0 });
                          setSelectedEventId(null);
                          setSelectedAccommodationId(null);
                        }
                      },
                    }
                  : {})}
              >
                <TouchableOpacity
                  style={styles.eventTouchable}
                  disabled={isPreview || isDragging}
                  onPress={e => {
                    if (isPreview || isDragging) return;

                    try {
                      calendarOnPress && calendarOnPress(e);
                    } catch {}

                    setSelectedEventId(event.id);
                    setSelectedAccommodationId(null);

                    if (isItinerary) {
                      onShowItineraryDetail?.(event.originalData);
                    } else if (isFlight) {
                      onShowFlightDetail?.(event.originalData);
                    }
                  }}
                >
                  <View style={[styles.eventContentCol, blockHeight <= 70 && { justifyContent: "center" }]}>
                    {isFirstBar && showTitle && (
                      <View style={styles.eventTitleRow}>
                        <View
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 999,
                            backgroundColor: isFlight
                              ? colors.flightDot
                              : (itineraryCategoryColor ?? colors.itineraryDot),
                            flexShrink: 0,
                          }}
                        />
                        {isFlight && (
                          <Text
                            style={{
                              fontSize: 10,
                              color: colors.flightText,
                              flexShrink: 0,
                            }}
                          >
                            ✈
                          </Text>
                        )}
                        <Text
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          style={{
                            fontFamily:
                              typography.fontFamily.pretendardSemiBold,
                            fontSize: 11,
                            lineHeight: 14,
                            color: isFlight
                              ? colors.flightText
                              : (itineraryCategoryColor ?? colors.itineraryText),
                            flex: 1,
                          }}
                        >
                          {event.title}
                        </Text>
                        {isCompact && event.normalizedStartTime && (
                          <Text
                            numberOfLines={1}
                            style={{
                              ...textStyles.h9,
                              color: isFlight
                                ? colors.flightText
                                : (itineraryCategoryColor ?? colors.itineraryText),
                              opacity: 0.75,
                              flexShrink: 0,
                            }}
                          >
                            {event.normalizedStartTime}
                          </Text>
                        )}
                      </View>
                    )}
                    {isFirstBar &&
                      showTime &&
                      (isItinerary || isPreview) &&
                      event.normalizedStartTime &&
                      event.normalizedEndTime && (
                        <View style={styles.eventTimeRow}>
                          <View style={styles.iconWrapper}>
                            <WeekBarTimeIcon
                              width={9}
                              height={9}
                              color={itineraryCategoryColor ?? colors.itineraryText}
                            />
                          </View>
                          <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={{
                              fontFamily:
                                typography.fontFamily.pretendardRegular,
                              fontSize: 10,
                              lineHeight: 14,
                              color: itineraryCategoryColor ?? colors.itineraryText,
                            }}
                          >
                            {event.normalizedStartTime} -{" "}
                            {event.normalizedEndTime}
                          </Text>
                        </View>
                      )}
                    {isFirstBar &&
                      showLocation &&
                      (isItinerary || isPreview) &&
                      event.locationText && (
                        <Text
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          style={{
                            fontFamily: typography.fontFamily.pretendardRegular,
                            fontSize: 10,
                            lineHeight: 14,
                            color: itineraryCategoryColor ?? colors.itineraryText,
                            opacity: 0.65,
                          }}
                        >
                          {event.locationText}
                        </Text>
                      )}
                    {isFirstBar &&
                      showTime &&
                      isFlight &&
                      event.normalizedStartTime &&
                      event.normalizedEndTime && (
                        <View style={styles.eventFlightTimeRow}>
                          <View style={styles.iconWrapper}>
                            <WeekBarTimeIcon
                              width={9}
                              height={9}
                              color={colors.flightText}
                            />
                          </View>
                          <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={{
                              fontFamily:
                                typography.fontFamily.pretendardRegular,
                              fontSize: 10,
                              lineHeight: 14,
                              color: colors.flightText,
                            }}
                          >
                            {event.normalizedStartTime} -{" "}
                            {event.normalizedEndTime}
                            {event.durationText
                              ? ` (${event.durationText})`
                              : ""}
                          </Text>
                        </View>
                      )}
                    {isFirstBar &&
                      showLocation &&
                      isFlight &&
                      event.flightNumber && (
                        <Text
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          style={{
                            fontFamily: typography.fontFamily.pretendardRegular,
                            fontSize: 10,
                            lineHeight: 14,
                            color: colors.flightText,
                            opacity: 0.65,
                          }}
                        >
                          {event.flightNumber}
                        </Text>
                      )}
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </View>

      {draggingEvent && dropPreviewPosition && Platform.OS === "web" && (
        <View
          style={{
            position: "fixed" as any,
            left: dropPreviewPosition.x,
            top: dropPreviewPosition.y,
            width: draggingEvent.elementWidth,
            height: draggingEvent.elementHeight,
            borderWidth: 2,
            borderColor:
              draggingEvent.type === "flight" && hasOverlap
                ? "#FF4242"
                : draggingEvent.type === "itinerary"
                  ? "rgba(0, 102, 255, 0.8)"
                  : "rgba(139, 92, 246, 0.8)",
            backgroundColor:
              draggingEvent.type === "flight" && hasOverlap
                ? "rgba(255, 66, 66, 0.05)"
                : draggingEvent.type === "itinerary"
                  ? "rgba(0, 102, 255, 0.05)"
                  : "rgba(139, 92, 246, 0.05)",
            borderRadius: radii.md,
            pointerEvents: "none" as const,
            zIndex: 9999,
            opacity: 1,
            shadowColor:
              draggingEvent.type === "flight" && hasOverlap
                ? "#FF4242"
                : draggingEvent.type === "itinerary"
                  ? "#0066FF"
                  : "#8B5CF6",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 8,
          }}
        />
      )}

      {draggingEvent &&
        Platform.OS === "web" &&
        (() => {
          const draggedEvent = events.find(e => e.id === draggingEvent.id);
          if (!draggedEvent) return null;

          const isItinerary = draggedEvent.type === "itinerary";
          const isFlight = draggedEvent.type === "flight";

          const dragCategory = isItinerary
            ? (draggedEvent.originalData?.category as ItineraryCategory | undefined)
            : undefined;
          const dragCategoryColor = dragCategory
            ? itineraryCategoryColors[dragCategory]
            : "#0066FF";

          let displayStartTime = draggedEvent.normalizedStartTime;
          let displayEndTime = draggedEvent.normalizedEndTime;

          if (dropPreviewPosition && dropPreviewPosition.time) {
            const originalStart = new Date(draggedEvent.start).getTime();
            const originalEnd = new Date(draggedEvent.end).getTime();
            const durationMinutes = (originalEnd - originalStart) / (1000 * 60);

            const newStartTime = dayjs(dropPreviewPosition.time);
            const newEndTime = newStartTime.add(durationMinutes, "minute");

            displayStartTime = newStartTime.format("HH:mm");
            displayEndTime = newEndTime.format("HH:mm");

            if (
              displayEndTime === "23:59" ||
              (newEndTime.hour() === 23 && newEndTime.minute() === 59)
            ) {
              displayEndTime = "24:00";
            }
          }

          const flightStyle = isFlight
            ? {
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                borderWidth: hasOverlap ? 2 : 1,
                borderColor: hasOverlap ? "#FF4242" : "#8B5CF6",
                borderStyle: hasOverlap ? ("dashed" as any) : ("solid" as any),
                borderRadius: radii.md,
              }
            : null;
          const itineraryStyle = isItinerary
            ? {
                backgroundColor: `${dragCategoryColor}1A`,
                borderWidth: 1,
                borderColor: dragCategoryColor,
                borderRadius: radii.md,
              }
            : null;
          const finalStyle = flightStyle ||
            itineraryStyle || {
              backgroundColor: draggedEvent.color || "#3478f6",
            };

          const dragContentHeight = draggingEvent.elementHeight - 8;
          const dragShowTitle = true;
          const dragShowTime = dragContentHeight >= 30;
          const dragShowLocation = dragContentHeight >= 48;

          return (
            <View
              style={[
                {
                  position: "absolute" as const,
                  left: draggingEvent.elementX + dragOffset.x,
                  top: draggingEvent.elementY + dragOffset.y,
                  width: draggingEvent.elementWidth,
                  height: draggingEvent.elementHeight,
                  zIndex: 10000,
                  opacity: 0.7,
                  pointerEvents: "none" as const,
                  padding: 4,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 10,
                },
                finalStyle,
                Platform.OS === "web" ? { position: "fixed" as any } : {},
              ]}
            >
              <View style={styles.dragEventContent}>
                {dragShowTitle && (
                  <View style={styles.dragEventTitleRow}>
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 999,
                        backgroundColor: isFlight ? colors.flightDot : dragCategoryColor,
                        flexShrink: 0,
                      }}
                    />
                    {isFlight && (
                      <Text style={{ fontSize: 11, color: colors.flightText }}>
                        ✈
                      </Text>
                    )}
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{
                        fontFamily: typography.fontFamily.pretendardSemiBold,
                        fontSize: 11,
                        lineHeight: 14,
                        color: isFlight ? "#8B5CF6" : dragCategoryColor,
                        flex: 1,
                      }}
                    >
                      {draggedEvent.title}
                    </Text>
                  </View>
                )}
                {dragShowTime &&
                  isItinerary &&
                  displayStartTime &&
                  displayEndTime && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginTop: dragShowTitle ? 8 : 0,
                      }}
                    >
                      <WeekBarTimeIcon width={9} height={9} color={dragCategoryColor} />
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{
                          fontFamily: typography.fontFamily.pretendardRegular,
                          fontSize: 10,
                          lineHeight: 14,
                          color: dragCategoryColor,
                        }}
                      >
                        {displayStartTime} - {displayEndTime}
                      </Text>
                    </View>
                  )}
                {dragShowLocation &&
                  isItinerary &&
                  draggedEvent.locationText && (
                    <View style={styles.dragEventLocationRow}>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{
                          fontFamily: typography.fontFamily.pretendardRegular,
                          fontSize: 10,
                          lineHeight: 14,
                          color: dragCategoryColor,
                          opacity: 0.65,
                        }}
                      >
                        {draggedEvent.locationText}
                      </Text>
                    </View>
                  )}
                {dragShowTime &&
                  isFlight &&
                  displayStartTime &&
                  displayEndTime && (
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{
                        ...textStyles.h9,
                        color: "#8B5CF6",
                        lineHeight: 10,
                        marginTop: dragShowTitle ? 8 : 0,
                      }}
                    >
                      {displayStartTime}-{displayEndTime}
                    </Text>
                  )}
              </View>
            </View>
          );
        })()}

      <AddScheduleWithAiModal
        visible={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
        planId={
          internalSelectedTrip ? Number.parseInt(internalSelectedTrip.id) : 0
        }
        planPublicId={internalSelectedTrip?.publicId ?? ""}
        planStartDate={internalSelectedTrip?.startDate}
        planEndDate={internalSelectedTrip?.endDate}
        onPlanDatesExtended={async (newStart, newEnd) => {
          const plan = planData?.plan;
          if (!plan?.id) return;
          await extendPlanIfNeeded(plan.id, plan, [newStart, newEnd]).catch(() => {});
        }}
        messages={aiMessages}
        onMessagesChange={setAiMessages}
        onSaved={() => {
          if (externalPlanData?.refreshItineraries)
            externalPlanData.refreshItineraries().catch(() => {});
          if (externalPlanData?.refreshFlights)
            externalPlanData.refreshFlights().catch(() => {});
          if (externalPlanData?.refreshAccommodations)
            externalPlanData.refreshAccommodations().catch(() => {});
          if (externalPlanData?.refreshExpenses)
            externalPlanData.refreshExpenses().catch(() => {});
          if ((externalPlanData as any)?.refreshAttachments)
            (externalPlanData as any).refreshAttachments().catch(() => {});
        }}
      />

      <AddScheduleWithFileModal
        visible={importFileOpen}
        onClose={() => {
          setImportFileOpen(false);
          setPendingDropFile(null);
          setDropFileOverlay(false);
        }}
        planId={
          internalSelectedTrip ? Number.parseInt(internalSelectedTrip.id) : 0
        }
        planName={internalSelectedTrip?.name ?? ""}
        plan={planData?.plan ?? undefined}
        initialFile={pendingDropFile ?? undefined}
        onSaveComplete={(firstDate) => {
          setImportFileOpen(false);
          setPendingDropFile(null);
          if (externalPlanData?.refreshItineraries) externalPlanData.refreshItineraries().catch(() => {});
          if (externalPlanData?.refreshFlights) externalPlanData.refreshFlights().catch(() => {});
          if (externalPlanData?.refreshAccommodations) externalPlanData.refreshAccommodations().catch(() => {});
          if (externalPlanData?.refreshExpenses) externalPlanData.refreshExpenses().catch(() => {});
          if (onPlansRefresh) onPlansRefresh();
          if (firstDate) {
            const monday = dayjs(firstDate).startOf("week").add(1, "day");
            setCurrentWeekStart(monday);
          }
        }}
      />

      <ExportPlanModal
        visible={exportOpen}
        onClose={() => setExportOpen(false)}
        planId={
          internalSelectedTrip ? Number.parseInt(internalSelectedTrip.id) : 0
        }
        planName={internalSelectedTrip?.name ?? ""}
      />

      <SharePlanModal
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        onSubmit={async ({ email, role, expires_days }) => {
          if (!internalSelectedTrip?.id) throw new Error("No plan selected");
          await plansApi.invite(Number.parseInt(internalSelectedTrip.id), {
            email,
            role,
            expires_days,
          });
          Alert.alert("성공", "초대 메일을 전송했습니다.");
        }}
        planId={
          internalSelectedTrip ? Number.parseInt(internalSelectedTrip.id) : 0
        }
        planName={internalSelectedTrip?.name}
      />

      <Modal
        visible={memoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMemoOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMemoOpen(false)}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <Card
              width="100%"
              maxWidth={420}
              paddingHorizontal={24}
              paddingVertical={24}
              paddingBottom={20}
              borderRadius={20}
              alignItems="stretch"
              shadow={{
                shadowColor: colors.black,
                shadowOffset: { width: 0, height: 24 },
                shadowOpacity: 0.12,
                shadowRadius: 48,
                elevation: 24,
              }}
              style={styles.memoModalContainer}
            >
              <View style={styles.memoModalHeader}>
                <View style={styles.memoModalTextGroup}>
                  <Text style={styles.memoModalTitle}>공유 메모</Text>
                  <Text style={styles.memoModalDescription}>
                    다른 사람과 여행을 공유하고 함께 계획을 세워보세요.
                  </Text>
                </View>
                <Pressable
                  onPress={() => setMemoOpen(false)}
                  style={styles.memoModalCloseButton}
                >
                  <XIcon width={24} height={24} />
                </Pressable>
              </View>

              <View style={styles.memoModalFieldGroup}>
                <Text style={styles.memoModalLabel}>내용</Text>
                <Input
                  placeholder={PLACEHOLDERS.plan.memo}
                  multiline
                  numberOfLines={8}
                  value={memoDraft}
                  onChangeText={setMemoDraft}
                  textAlignVertical="top"
                  style={[
                    styles.memoModalInput,
                    Platform.OS === "web" && ({ resize: "vertical" } as any),
                  ]}
                />
              </View>

              <View style={styles.memoModalActions}>
                <Pressable
                  onPress={() => setMemoOpen(false)}
                  style={styles.memoModalSecondaryButton}
                >
                  <Text style={styles.memoModalSecondaryButtonText}>닫기</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    try {
                      if (!internalSelectedTrip?.id)
                        throw new Error("No plan selected");
                      await plansApi.setMemo(
                        Number.parseInt(internalSelectedTrip.id),
                        memoDraft ?? "",
                      );
                      Alert.alert("성공", "메모가 저장되었습니다.");
                      setMemoOpen(false);
                      if (internalSelectedTrip?.publicId) {
                        planData.fetchPlanData &&
                          (await planData.fetchPlanData(
                            internalSelectedTrip.publicId,
                          ));
                      }
                    } catch (e: any) {
                      Alert.alert(
                        "알림",
                        e?.response?.data?.detail ||
                          "메모 저장에 실패했습니다.",
                      );
                    }
                  }}
                  style={styles.memoModalPrimaryButton}
                >
                  <Text style={styles.memoModalPrimaryButtonText}>저장</Text>
                </Pressable>
              </View>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>

      <PlanSelectRequiredModal
        visible={showPlanSelectRequiredModal}
        onClose={() => setShowPlanSelectRequiredModal(false)}
        onConfirm={() => {
          setOpenTripSelector(true);
        }}
      />

      <TripFormModal
        visible={showAddPlanModal}
        onClose={() => {
          setShowAddPlanModal(false);
          planForm.resetForm();
        }}
        mode="add"
        tripData={planForm.tripData}
        activeSegmentIndex={planForm.activeSegmentIndex}
        selectionMode={planForm.selectionMode}
        onNameChange={name => planForm.updateTripData({ name })}
        onSegmentUpdate={planForm.updateSegment}
        onSegmentAdd={planForm.addSegment}
        onSegmentRemove={planForm.removeSegment}
        onSegmentMove={planForm.moveSegment}
        onSegmentFocus={planForm.setActiveSegmentIndex}
        markedDates={planForm.getMarkedDates()}
        onDateSelect={planForm.handleDateSelect}
        onSubmit={handlePlanAddSubmit}
        isSubmitDisabled={planForm.isSubmitDisabled}
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
    </PanelLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  panelWrapper: {
    flex: 1,
    position: "relative",
  },
  dropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: colors.gray500,
    borderStyle: "dashed",
    borderRadius: 12,
  },
  dropOverlayIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  dropOverlayTitle: {
    ...textStyles.h6,
    color: colors.black,
  },
  dropOverlaySubtext: {
    ...textStyles.body5,
    color: colors.gray700,
  },
  container: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.white,
  },
  calendarWrapper: {
    flex: 1,
    minHeight: 0,
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.white,
    zIndex: 9998,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    ...textStyles.h5,
    marginRight: spacing.lg,
  },
  dateNavigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: spacing.lg,
  },
  navArrowButton: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  navDateText: {
    ...textStyles.h7,
    minWidth: 72,
    textAlign: "center",
  },
  dateText: {
    ...textStyles.h6,
  },
  dateHeaderCell: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  weekdayText: {
    ...textStyles.h8,
    color: colors.gray600,
  },
  todayDateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  todayDateText: {
    ...textStyles.h6,
    color: colors.white,
  },
  timeColumn: {
    width: 51,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButton: {
    flexDirection: "row",
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonText: {
    ...textStyles.h8,
    fontSize: 12,
    lineHeight: 18,
  },
  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: spacing.lg,
  },
  aiChatButton: {
    height: 32,
    borderRadius: 20,
    overflow: "hidden",
    marginLeft: spacing.lg,
  },
  aiChatButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 0,
    height: 32,
  },
  aiChatButtonText: {
    ...textStyles.h8,
    color: colors.black,
    fontSize: 13,
  },
  todayBtn: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  todayText: {
    ...textStyles.h8,
    fontSize: 12,
    lineHeight: 18,
  },
  calendarButtonWrapper: {
    position: "relative",
  },
  calendarPopup: {
    top: 40,
    left: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 12,
    width: "92%",
    elevation: 4,
  },
  memoModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    gap: 12,
  },
  memoModalTextGroup: {
    flex: 1,
  },
  memoModalTitle: {
    ...textStyles.h3,
  },
  memoModalDescription: {
    ...textStyles.body4,
    color: colors.gray700,
    marginTop: 6,
  },
  memoModalCloseButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  memoModalFieldGroup: {
    marginBottom: 18,
  },
  memoModalLabel: {
    ...textStyles.h7,
    color: colors.black,
    marginBottom: 8,
  },
  memoModalInput: {
    minHeight: 180,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
    ...textStyles.body3,
    color: colors.gray900,
  },
  memoModalActions: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 10,
    paddingTop: 4,
  },
  memoModalSecondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  memoModalSecondaryButtonText: {
    ...textStyles.h6,
    color: colors.black,
  },
  memoModalPrimaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  memoModalPrimaryButtonText: {
    ...textStyles.h6,
    color: colors.white,
  },
  accommodationRow: {
    flexDirection: "row",
    backgroundColor: colors.gray200,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray300,
    height: 50,
  },
  accommodationLabel: {
    width: 60,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.gray300,
  },
  accommodationLabelText: {
    fontSize: 16,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.dotAccommodation,
    flexShrink: 0,
  },
  accommodationCell: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: colors.gray300,
  },
  accommodationItem: {
    backgroundColor: "#ff9500",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: "90%",
  },
  accommodationName: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "600",
  },
  todayIconWrapper: {
    marginRight: spacing.xs,
  },
  weekHeaderRow: {
    flexDirection: "row",
    height: 70,
  },
  accommodationHeaderRow: {
    flexDirection: "row",
    height: 40,
    backgroundColor: "",
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderTopColor: "#e0e0e0",
    borderBottomColor: "#e0e0e0",
  },
  accommodationRowInner: {
    flex: 1,
    flexDirection: "row",
    position: "relative",
    overflow: "visible",
  },
  eventTouchable: {
    flex: 1,
    padding: 4,
    paddingHorizontal: 8,
  },
  eventContentCol: {
    flex: 1,
    justifyContent: "flex-start",
    gap: 2,
  },
  eventTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 0,
  },
  eventTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
    opacity: 0.75,
  },
  iconWrapper: {
    flexShrink: 0,
  },
  eventFlightTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
    opacity: 0.8,
  },
  dragEventContent: {
    flex: 1,
    justifyContent: "center",
  },
  dragEventTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dragEventLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  memoModalContainer: {
    marginHorizontal: 16,
  },
});
