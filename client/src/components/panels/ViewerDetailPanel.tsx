import type {
  ExportAccommodation,
  ExportExpense,
  ExportFlight,
  ExportItinerary,
} from "@/services/plans";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import dayjs from "dayjs";
import CalendarDetailIcon from "../../../assets/calendar_detail.svg";
import LockSimpleIcon from "../../../assets/lock_simple.svg";
import "dayjs/locale/ko";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import PanelLayout from "./PanelLayout";

dayjs.locale("ko");

interface ViewerDetailPanelProps {
  selectedType: "itinerary" | "flight" | "accommodation" | null;
  selectedItinerary?: ExportItinerary | null;
  selectedFlight?: ExportFlight | null;
  selectedAccommodation?: ExportAccommodation | null;
  expenses?: ExportExpense[] | null;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function PrivacyNotice() {
  return (
    <View style={styles.privacyBox}>
      <LockSimpleIcon
        width={13}
        height={13}
        color={colors.gray600}
        style={styles.privacyIcon}
      />
      <Text style={styles.privacyText}>
        예약번호·요금·메모·첨부파일 등 민감 정보는 공유되지 않아요.
      </Text>
    </View>
  );
}

const CURRENCY_LABELS: Record<string, string> = {
  KRW: "원",
  USD: "달러",
  EUR: "유로",
  JPY: "엔",
  CNY: "위안",
  GBP: "파운드",
  AUD: "호주달러",
};

function LinkedExpenses({ expenses }: { expenses: ExportExpense[] }) {
  if (expenses.length === 0) return null;
  return (
    <>
      {expenses.map((e, i) => {
        const currencyLabel = CURRENCY_LABELS[e.currency] ?? e.currency;
        return (
          <InfoRow
            key={i}
            label="비용"
            value={`${Number(e.amount).toLocaleString()} ${currencyLabel}`}
          />
        );
      })}
    </>
  );
}

function normalizeTime(t: string) {
  return t.split(":").slice(0, 2).join(":");
}

function formatDate(d: string) {
  return dayjs(d).format("YYYY. MM. DD (ddd)");
}

function formatDatetime(d: string) {
  return dayjs(d).format("YYYY. MM. DD HH:mm");
}

export default function ViewerDetailPanel({
  selectedType,
  selectedItinerary,
  selectedFlight,
  selectedAccommodation,
  expenses,
}: ViewerDetailPanelProps) {
  if (!selectedType) {
    return (
      <PanelLayout>
        <View style={styles.emptyContainer}>
          <View style={styles.iconCircle}>
            <CalendarDetailIcon width={22} height={22} color="#C4C4C4" />
          </View>
          <Text style={styles.emptyTitle}>일정을 선택해 보세요</Text>
          <Text style={styles.emptyDesc}>
            {"일정·항공·숙박을 누르면\n상세 정보를 볼 수 있어요."}
          </Text>
        </View>
      </PanelLayout>
    );
  }

  if (selectedType === "itinerary" && selectedItinerary) {
    const it = selectedItinerary;
    const startT = normalizeTime(it.startTime);
    const endT = normalizeTime(it.endTime);
    const linked = (expenses ?? []).filter(e => e.itineraryId === it.id);

    return (
      <PanelLayout>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.detailContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.detailTitle}>{it.title}</Text>
          <View style={styles.infoTable}>
            {it.country ? <InfoRow label="국가" value={it.country} /> : null}
            {it.city ? <InfoRow label="도시" value={it.city} /> : null}
            {it.location ? <InfoRow label="장소" value={it.location} /> : null}
            <InfoRow label="날짜" value={formatDate(it.itineraryDate)} />
            <InfoRow label="시간" value={`${startT} - ${endT}`} />
            <LinkedExpenses expenses={linked} />
          </View>
          <PrivacyNotice />
        </ScrollView>
      </PanelLayout>
    );
  }

  if (selectedType === "flight" && selectedFlight) {
    const segments = selectedFlight.segments;
    const linked = (expenses ?? []).filter(
      e => e.flightId === selectedFlight.id,
    );
    const flightTitle =
      segments.length > 0
        ? `${segments[0].departureAirport} → ${segments[segments.length - 1].arrivalAirport}`
        : "항공편";
    return (
      <PanelLayout>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.detailContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.detailTitle}>{flightTitle}</Text>
          {segments.map((seg, i) => (
            <View key={i}>
              {segments.length > 1 && (
                <Text style={styles.segmentIndex}>{i + 1}번째 구간</Text>
              )}
              <View style={styles.infoTable}>
                <InfoRow
                  label="출발"
                  value={`${seg.departureAirport}  ${formatDatetime(seg.departureTime)}`}
                />
                <InfoRow
                  label="도착"
                  value={`${seg.arrivalAirport}  ${formatDatetime(seg.arrivalTime)}`}
                />
              </View>
            </View>
          ))}
          <View style={styles.infoTable}>
            <LinkedExpenses expenses={linked} />
          </View>
          <PrivacyNotice />
        </ScrollView>
      </PanelLayout>
    );
  }

  if (selectedType === "accommodation" && selectedAccommodation) {
    const acc = selectedAccommodation;
    const checkinT = normalizeTime(acc.checkinTime);
    const checkoutT = normalizeTime(acc.checkoutTime);
    const linked = (expenses ?? []).filter(e => e.accommodationId === acc.id);

    return (
      <PanelLayout>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.detailContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.detailTitle}>{acc.name}</Text>
          <View style={styles.infoTable}>
            <InfoRow
              label="체크인"
              value={`${formatDate(acc.checkinDate)}  ${checkinT}`}
            />
            <InfoRow
              label="체크아웃"
              value={`${formatDate(acc.checkoutDate)}  ${checkoutT}`}
            />
            <LinkedExpenses expenses={linked} />
          </View>
          <PrivacyNotice />
        </ScrollView>
      </PanelLayout>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    gap: 4,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    ...textStyles.h6,
    lineHeight: 20,
    color: colors.gray900,
  },
  emptyDesc: {
    ...textStyles.body5,
    color: colors.gray600,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  detailContent: {
    padding: 22,
  },
  detailTitle: {
    ...textStyles.h4,
    color: colors.gray900,
    marginBottom: 14,
  },
  infoTable: {
    flexDirection: "column",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },
  infoLabel: {
    ...textStyles.body4,
    color: colors.gray700,
    width: 70,
    flexShrink: 0,
  },
  infoValue: {
    ...textStyles.h7,
    color: colors.gray900,
    flex: 1,
    minWidth: 0,
    textAlign: "right",
  },
  segmentIndex: {
    ...textStyles.h9,
    color: colors.gray600,
    marginTop: 16,
    marginBottom: 2,
  },
  expenseSection: {
    marginTop: 20,
    marginBottom: 4,
  },
  expenseSectionTitle: {
    ...textStyles.h8,
    color: colors.gray700,
    marginBottom: 8,
  },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },
  expenseLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expenseCategory: {
    ...textStyles.body5,
    color: colors.gray700,
    flexShrink: 0,
  },
  expenseDesc: {
    ...textStyles.body5,
    color: colors.gray500,
    flex: 1,
    minWidth: 0,
  },
  expenseAmount: {
    ...textStyles.h8,
    color: colors.gray900,
    marginLeft: 12,
    flexShrink: 0,
  },
  privacyBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 16,
    padding: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F7F8FA",
    borderRadius: 10,
  },
  privacyIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  privacyText: {
    ...textStyles.body6,
    color: colors.gray600,
    flex: 1,
  },
});
