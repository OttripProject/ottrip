import { colors } from "@/ui/tokens/colors";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const TABS = [
  { key: "itinerary", label: "일정" },
  { key: "flight", label: "항공" },
  { key: "accommodation", label: "숙박" },
] as const;

type TabKey = "itinerary" | "flight" | "accommodation";

interface PanelTabSwitcherProps {
  activeTab?: TabKey | null;
  onTabChange?: (tab: TabKey) => void;
}

export default function PanelTabSwitcher({ activeTab, onTabChange }: PanelTabSwitcherProps) {
  return (
    <View style={styles.container}>
      {TABS.map(({ key, label }) => {
        const isActive = activeTab === key;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onTabChange?.(key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: colors.gray200,
    borderRadius: 10,
    padding: 4,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  tabActive: {
    backgroundColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 1,
        shadowOffset: { width: 0, height: 1 },
      },
      default: { boxShadow: "0px 1px 2px rgba(0,0,0,0.06)" } as object,
    }),
  },
  tabText: {
    ...textStyles.h8,
    color: colors.gray700,
  },
  tabTextActive: {
    color: colors.gray900,
  },
});
