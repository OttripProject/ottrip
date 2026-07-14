import BaseCalendar from "@/components/popup/calendar/BaseCalendar";
import type {
  ExportAccommodation,
  ExportFlight,
  ExportItinerary,
} from "@/services/plans";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import dayjs from "dayjs";
import CalenderIcon from "../../../assets/calender.svg";
import LeftArrowIcon from "../../../assets/left_arrow.svg";
import RightArrowIcon from "../../../assets/right_arrow.svg";
import TodayIcon from "../../../assets/today.svg";
import AccommodationIcon from "../../../assets/week_bar_accommodation.svg";
import WeekBarTimeIcon from "../../../assets/week_bar_time.svg";
import "dayjs/locale/ko";
import { useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Calendar as BigCalendar } from "react-native-big-calendar";
import PanelLayout from "./PanelLayout";

dayjs.locale("ko");

interface ViewerSchedulePanelProps {
  itineraries: ExportItinerary[];
  flights: ExportFlight[];
  accommodations: ExportAccommodation[];
  planStartDate?: string;
  height?: number;
  onItinerarySelect?: (itinerary: ExportItinerary) => void;
  onFlightSelect?: (flight: ExportFlight) => void;
  onAccommodationSelect?: (accommodation: ExportAccommodation) => void;
}

function normalizeTime(t: string) {
  return t.split(":").slice(0, 2).join(":");
}

function toItineraryEvent(it: ExportItinerary, index: number) {
  const startT = normalizeTime(it.startTime);
  let endT = normalizeTime(it.endTime);
  if (endT === "23:59") endT = "24:00";

  let endDate = new Date(`${it.itineraryDate}T${endT}:00`);
  if (endT === "24:00") {
    endDate = dayjs(`${it.itineraryDate}T23:59:59`).toDate();
  }

  return {
    id: `it-${index}`,
    title: it.title,
    start: new Date(`${it.itineraryDate}T${startT}:00`),
    end: endDate,
    type: "itinerary",
    originalData: it,
    startDateStr: it.itineraryDate,
    normalizedStartTime: startT,
    normalizedEndTime: endT === "24:00" ? "23:59" : endT,
    locationText: it.location || "",
  } as any;
}

function toFlightEvents(flight: ExportFlight, flightIndex: number) {
  return flight.segments.map((seg, si) => {
    const depTime = dayjs(seg.departureTime);
    const arrTime = dayjs(seg.arrivalTime);
    const depDate = depTime.format("YYYY-MM-DD");
    const durationMinutes = arrTime.diff(depTime, "minute");
    const durationH = Math.floor(durationMinutes / 60);
    const durationM = durationMinutes % 60;
    const durationText = durationM > 0 ? `${durationH}h ${durationM}m` : `${durationH}h`;

    return {
      id: `f-${flightIndex}-${si}`,
      title: `${seg.departureAirport} → ${seg.arrivalAirport}`,
      start: depTime.toDate(),
      end: arrTime.toDate(),
      type: "flight",
      originalData: flight,
      startDateStr: depDate,
      normalizedStartTime: depTime.format("HH:mm"),
      normalizedEndTime: arrTime.format("HH:mm"),
      durationText,
    } as any;
  });
}

export default function ViewerSchedulePanel({
  itineraries,
  flights,
  accommodations,
  planStartDate,
  height = 600,
  onItinerarySelect,
  onFlightSelect,
  onAccommodationSelect,
}: ViewerSchedulePanelProps) {
  const { width: windowWidth } = useWindowDimensions();
  const calendarBtnRef = useRef<any>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(
    undefined,
  );
  const [calendarPopupPos, setCalendarPopupPos] = useState<{
    top: number;
    left?: number;
    right?: number;
  }>({ top: 40, left: 8 });

  const initialWeekStart = useMemo(() => {
    if (planStartDate) {
      return dayjs(planStartDate).startOf("week").add(1, "day");
    }
    return dayjs().startOf("week").add(1, "day");
  }, [planStartDate]);

  const [currentWeekStart, setCurrentWeekStart] = useState(initialWeekStart);

  const goPrev = () => setCurrentWeekStart(prev => prev.subtract(1, "week"));
  const goNext = () => setCurrentWeekStart(prev => prev.add(1, "week"));
  const goToday = () =>
    setCurrentWeekStart(dayjs().startOf("week").add(1, "day"));

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) =>
      currentWeekStart.add(i, "day").format("YYYY-MM-DD"),
    );
  }, [currentWeekStart]);

  const events = useMemo(() => {
    const itEvents = itineraries.map((it, i) => toItineraryEvent(it, i));
    const flEvents = flights.flatMap((f, fi) => toFlightEvents(f, fi));
    const allEvents = [...itEvents, ...flEvents];

    allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const overlapGroups: any[][] = [];

    allEvents.forEach(event => {
      const alreadyInGroup = overlapGroups.some(g => g.some(e => e.id === event.id));
      if (alreadyInGroup) return;

      const overlapping = allEvents.filter(other => {
        if (other.id === event.id) return false;
        const eStart = new Date(event.start).getTime();
        const eEnd = new Date(event.end).getTime();
        const oStart = new Date(other.start).getTime();
        const oEnd = new Date(other.end).getTime();
        return !(eEnd <= oStart || eStart >= oEnd);
      });

      if (overlapping.length > 0) {
        const group = [event, ...overlapping].sort((a, b) => {
          const diff = new Date(a.start).getTime() - new Date(b.start).getTime();
          return diff !== 0 ? diff : String(a.id).localeCompare(String(b.id));
        });
        overlapGroups.push(group);
      }
    });

    return allEvents.map(event => {
      const group = overlapGroups.find(g => g.some(e => e.id === event.id));
      if (group) {
        return {
          ...event,
          id: String(event.id),
          customOverlapIndex: group.findIndex(e => e.id === event.id),
          customOverlapCount: group.length,
        };
      }
      return { ...event, id: String(event.id), customOverlapIndex: 0, customOverlapCount: 1 };
    });
  }, [itineraries, flights]);

  const accommodationsByDate = useMemo(() => {
    const map = new Map<string, ExportAccommodation[]>();
    weekDays.forEach(date => {
      const matching = accommodations.filter(acc => {
        return date >= acc.checkinDate && date <= acc.checkoutDate;
      });
      map.set(date, matching);
    });
    return map;
  }, [weekDays, accommodations]);

  const isAccStart = (acc: ExportAccommodation, date: string) =>
    date === acc.checkinDate;
  const isAccEnd = (acc: ExportAccommodation, date: string) =>
    date === acc.checkoutDate;

  const getAccTimeRange = (acc: ExportAccommodation, date: string) => {
    const parseHour = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h + m / 60;
    };
    const checkinHour = parseHour(acc.checkinTime || "15:00");
    const checkoutHour = parseHour(acc.checkoutTime || "11:00");

    let startHour = 0;
    let endHour = 24;
    if (date === acc.checkinDate) {
      startHour = checkinHour;
    } else if (date === acc.checkoutDate) {
      endHour = checkoutHour;
    }
    return {
      startPercent: (startHour / 24) * 100,
      widthPercent: ((endHour - startHour) / 24) * 100,
    };
  };

  return (
    <PanelLayout>
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
              onPress={() => {
                if (!showMonthPicker && calendarBtnRef.current) {
                  calendarBtnRef.current.measure(
                    (
                      _x: number,
                      _y: number,
                      _w: number,
                      _h: number,
                      pageX: number,
                    ) => {
                      const popupWidth = 276;
                      const overflows = pageX + 8 + popupWidth > windowWidth;
                      setCalendarPopupPos(
                        overflows
                          ? { top: 40, right: 0 }
                          : { top: 40, left: 8 },
                      );
                    },
                  );
                }
                setShowMonthPicker(v => !v);
              }}
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
      </View>

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
        renderHeader={_props => (
          <View>
            <View style={styles.weekHeaderRow}>
              <View style={styles.timeColumn} />
              {weekDays.map(date => {
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
                        style={isToday ? styles.todayDateText : styles.dateText}
                      >
                        {dayjs(date).format("D")}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {accommodations.length > 0 && (
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
                <View style={styles.accommodationRowInner}>
                  {weekDays.map((date, index) => {
                    const accs = accommodationsByDate.get(date) || [];
                    const nextDate =
                      index < weekDays.length - 1 ? weekDays[index + 1] : null;
                    const nextAccs = nextDate
                      ? accommodationsByDate.get(nextDate) || []
                      : [];
                    const hasContinuous = accs.some(a =>
                      nextAccs.some(
                        b =>
                          b.name === a.name && b.checkinDate === a.checkinDate,
                      ),
                    );
                    const firstAcc = accs[0];
                    const isMiddle =
                      firstAcc &&
                      !isAccStart(firstAcc, date) &&
                      !isAccEnd(firstAcc, date);

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
                            !hasContinuous &&
                            !isMiddle
                              ? 1
                              : 0,
                          borderRightColor: "#e0e0e0",
                          zIndex: 0,
                        }}
                        onPress={() => {
                          if (accs.length > 0) {
                            onAccommodationSelect?.(accs[0]);
                          }
                        }}
                      >
                        {accs.map((acc, ai) => {
                          const isStart = isAccStart(acc, date);
                          const isEnd = isAccEnd(acc, date);
                          const isVisualStart =
                            isStart || (index === 0 && !isEnd);
                          const timeRange = getAccTimeRange(acc, date);
                          const actualLeft = Math.max(
                            0,
                            Math.min(timeRange.startPercent, 100),
                          );
                          const maxWidth = 100 - actualLeft;
                          const actualWidth = Math.min(
                            timeRange.widthPercent,
                            maxWidth,
                          );

                          return (
                            <View
                              key={ai}
                              style={{
                                position: "absolute",
                                left: `${actualLeft}%` as any,
                                width: `${actualWidth}%` as any,
                                top: 2,
                                bottom: 2,
                                backgroundColor: colors.accommodationBg,
                                borderTopWidth: 1,
                                borderBottomWidth: 1,
                                borderLeftWidth: isStart ? 1 : 0,
                                borderRightWidth: isEnd ? 1 : 0,
                                borderColor: colors.accommodationBorder,
                                borderTopLeftRadius: isStart ? 6 : 0,
                                borderBottomLeftRadius: isStart ? 6 : 0,
                                borderTopRightRadius: isEnd ? 6 : 0,
                                borderBottomRightRadius: isEnd ? 6 : 0,
                                minWidth: 1,
                                zIndex: isVisualStart ? 10 : 1,
                                overflow: "visible",
                              }}
                            />
                          );
                        })}
                      </Pressable>
                    );
                  })}
                  {(() => {
                    const labels: React.ReactNode[] = [];
                    const seen = new Set<string>();
                    weekDays.forEach((date, index) => {
                      const accs = accommodationsByDate.get(date) || [];
                      accs.forEach(acc => {
                        const key = `${acc.checkinDate}-${acc.name}`;
                        if (seen.has(key)) return;
                        const isStart = isAccStart(acc, date);
                        const isEnd = isAccEnd(acc, date);
                        const isVisualStart =
                          isStart || (index === 0 && !isEnd);
                        if (!isVisualStart) return;
                        seen.add(key);
                        const timeRange = getAccTimeRange(acc, date);
                        const startPercent = timeRange.startPercent;
                        let endIndex = index;
                        let endPercent =
                          timeRange.startPercent + timeRange.widthPercent;
                        for (let i = index + 1; i < weekDays.length; i++) {
                          const dAccs =
                            accommodationsByDate.get(weekDays[i]) || [];
                          const dAcc = dAccs.find(
                            a =>
                              a.checkinDate === acc.checkinDate &&
                              a.name === acc.name,
                          );
                          if (dAcc) {
                            const dRange = getAccTimeRange(dAcc, weekDays[i]);
                            endIndex = i;
                            endPercent =
                              dRange.startPercent + dRange.widthPercent;
                          } else break;
                        }
                        const leftPct =
                          ((index + startPercent / 100) / weekDays.length) *
                          100;
                        const rightPct =
                          ((endIndex + endPercent / 100) / weekDays.length) *
                          100;
                        const widthPct = rightPct - leftPct;
                        labels.push(
                          <View
                            key={key}
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
                </View>
              </View>
            )}
          </View>
        )}
        renderEvent={(event, touchableOpacityProps) => {
          const {
            key: eventKey,
            children: _ignore,
            style: tpStyle,
            onPress: calendarOnPress,
            ...rest
          } = (touchableOpacityProps as any) ?? {};

          const isItinerary = event.type === "itinerary";
          const isFlight = event.type === "flight";

          const flattenStyle = (s: any): any => {
            if (!s) return {};
            if (Array.isArray(s))
              return Object.assign({}, ...s.filter(Boolean).map(flattenStyle));
            return s;
          };

          const adjustedStyle = { ...flattenStyle(tpStyle) };
          delete adjustedStyle.marginTop;
          delete adjustedStyle.minWidth;
          adjustedStyle.minHeight = 20;
          delete adjustedStyle.overflow;

          const totalWidthPercent = 90;
          const leftMarginPercent = 3.5;

          if (event.customOverlapCount > 1 && typeof event.customOverlapIndex === "number") {
            const gapPercent = 1.5;
            const slotWidth = (totalWidthPercent - gapPercent * (event.customOverlapCount - 1)) / event.customOverlapCount;
            adjustedStyle.width = `${slotWidth}%`;
            adjustedStyle.left = `${leftMarginPercent + (slotWidth + gapPercent) * event.customOverlapIndex}%`;
          } else {
            adjustedStyle.left = `${leftMarginPercent}%`;
            adjustedStyle.width = `${totalWidthPercent}%`;
          }

          const eventStyle = isFlight
            ? {
                backgroundColor: colors.flightBg,
                borderWidth: 1,
                borderColor: colors.flightBorder,
                borderRadius: radii.md,
              }
            : {
                backgroundColor: colors.itineraryBg,
                borderWidth: 1,
                borderColor: colors.itineraryBorder,
                borderRadius: radii.md,
              };

          const blockHeight = (() => {
            const startMs = new Date(event.start).getTime();
            const endMs = new Date(event.end).getTime();
            const durationMinutes = (endMs - startMs) / (1000 * 60);
            const h = (durationMinutes / 15) * (40 / 4);
            return Math.max(h, 20);
          })();
          const durationMinutes =
            (new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60);
          const isCompact = durationMinutes <= 30;
          const contentHeight = Math.max(blockHeight - 8, 0);
          const showTime = !isCompact && contentHeight >= 28;
          const showLocation = contentHeight > 52;

          return (
            <View key={eventKey} {...rest} style={[adjustedStyle, eventStyle]}>
              <TouchableOpacity
                style={styles.eventTouchable}
                onPress={e => {
                  try {
                    calendarOnPress && calendarOnPress(e);
                  } catch {}
                  if (isItinerary) {
                    onItinerarySelect?.(event.originalData);
                  } else if (isFlight) {
                    onFlightSelect?.(event.originalData);
                  }
                }}
              >
                <View style={[styles.eventContentCol, blockHeight <= 70 && { justifyContent: "center" }]}>
                  {/* 제목 행 */}
                  <View style={styles.eventTitleRow}>
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 999,
                        backgroundColor: isFlight ? colors.flightDot : colors.itineraryDot,
                        flexShrink: 0,
                      }}
                    />
                    {isFlight && (
                      <Text style={{ fontSize: 10, color: colors.flightText, flexShrink: 0 }}>
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
                        color: isFlight ? colors.flightText : colors.itineraryText,
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
                          color: isFlight ? colors.flightText : colors.itineraryText,
                          opacity: 0.75,
                          flexShrink: 0,
                        }}
                      >
                        {event.normalizedStartTime}
                      </Text>
                    )}
                  </View>

                  {/* 시간 행 - 일정 */}
                  {showTime && isItinerary && event.normalizedStartTime && event.normalizedEndTime && (
                    <View style={styles.eventTimeRow}>
                      <View style={styles.iconWrapper}>
                        <WeekBarTimeIcon width={9} height={9} color={colors.itineraryText} />
                      </View>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{
                          fontFamily: typography.fontFamily.pretendardRegular,
                          fontSize: 10,
                          lineHeight: 14,
                          color: colors.itineraryText,
                        }}
                      >
                        {event.normalizedStartTime} - {event.normalizedEndTime}
                      </Text>
                    </View>
                  )}

                  {/* 장소 - 일정 */}
                  {showLocation && isItinerary && event.locationText && (
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{
                        fontFamily: typography.fontFamily.pretendardRegular,
                        fontSize: 10,
                        lineHeight: 14,
                        color: colors.itineraryText,
                        opacity: 0.65,
                      }}
                    >
                      {event.locationText}
                    </Text>
                  )}

                  {/* 시간 행 - 항공 */}
                  {showTime && isFlight && event.normalizedStartTime && event.normalizedEndTime && (
                    <View style={styles.eventTimeRow}>
                      <View style={styles.iconWrapper}>
                        <WeekBarTimeIcon width={9} height={9} color={colors.flightText} />
                      </View>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{
                          fontFamily: typography.fontFamily.pretendardRegular,
                          fontSize: 10,
                          lineHeight: 14,
                          color: colors.flightText,
                        }}
                      >
                        {event.normalizedStartTime} - {event.normalizedEndTime}
                        {event.durationText ? ` (${event.durationText})` : ""}
                      </Text>
                    </View>
                  )}

                </View>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </PanelLayout>
  );
}

const styles = StyleSheet.create({
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
  todayIconWrapper: {
    marginRight: spacing.xs,
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
  calendarButtonWrapper: {
    position: "relative",
  },
  weekHeaderRow: {
    flexDirection: "row",
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  timeColumn: {
    width: 51,
  },
  dateHeaderCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  weekdayText: {
    ...textStyles.body6,
    color: colors.gray600,
  },
  dateText: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  todayDateCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  todayDateText: {
    ...textStyles.h7,
    color: colors.white,
  },
  accommodationHeaderRow: {
    flexDirection: "row",
    height: 40,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  accommodationRowInner: {
    flex: 1,
    flexDirection: "row",
    position: "relative",
    overflow: "visible",
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.dotAccommodation,
    flexShrink: 0,
  },
  eventTouchable: {
    flex: 1,
    padding: 4,
  },
  eventContentCol: {
    flex: 1,
    gap: 1,
    justifyContent: "flex-start",
  },
  eventTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  iconWrapper: {
    width: 12,
    alignItems: "center",
    flexShrink: 0,
  },
});
