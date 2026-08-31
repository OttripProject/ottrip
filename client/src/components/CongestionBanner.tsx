import { colors } from "@/ui/tokens/colors";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface Props {
  festivals: { title: string; eventStartDate: string | null; eventEndDate: string | null }[];
  onDismiss: () => void;
}

function formatDateRange(start: string | null, end: string | null): string {
  const fmt = (d: string) => {
    const m = d.slice(4, 6).replace(/^0/, "");
    const day = d.slice(6, 8).replace(/^0/, "");
    return `${m}.${day}`;
  };
  if (!start) return "";
  if (!end || start === end) return fmt(start);
  return `${fmt(start)}–${fmt(end)}`;
}

export default function CongestionBanner({ festivals, onDismiss }: Props) {
  const dateRange = formatDateRange(
    festivals[0]?.eventStartDate ?? null,
    festivals[0]?.eventEndDate ?? null,
  );
  const places = festivals.map((f) => f.title).join("·");
  const text = `${places} 일대가 축제·공연으로 붐빌 수 있어요.`;

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>혼잡 주의</Text>
      </View>
      <Text style={styles.message} numberOfLines={1}>
        {dateRange ? <Text style={styles.bold}>{dateRange} </Text> : null}
        {text}
      </Text>
      <Pressable onPress={onDismiss} style={styles.closeBtn} aria-label="닫기">
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ display: "block", color: "rgb(108,108,108)" } as any}>
          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgb(233, 246, 246)",
    borderWidth: 1,
    borderColor: "rgb(207, 237, 237)",
    alignSelf: "stretch",
  } as any,
  badge: {
    flexShrink: 0,
    height: 20,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgb(191, 230, 230)",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 11,
    color: "rgb(14, 138, 138)",
  } as any,
  message: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    color: "rgb(31, 31, 31)",
    flex: 1,
    overflow: "hidden",
  } as any,
  bold: {
    fontWeight: "700",
  } as any,
  closeBtn: {
    marginLeft: "auto",
    flexShrink: 0,
    width: 32,
    height: 32,
    marginTop: -6,
    marginBottom: -6,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
  } as any,
});
