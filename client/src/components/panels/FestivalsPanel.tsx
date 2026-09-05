import type { FestivalItem } from "@/services/tourism";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import { Pressable, StyleSheet, Text, View } from "react-native";
import PanelLayout from "./PanelLayout";

interface FestivalsPanelProps {
  festivals: FestivalItem[];
  isLoading?: boolean;
}

export default function FestivalsPanel({ festivals, isLoading }: FestivalsPanelProps) {
  return (
    <PanelLayout>
      <View style={styles.inner}>
        <Pressable style={styles.collapsed}>
          <Text style={styles.title}>축제·공연</Text>
          {!isLoading && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{festivals.length}건</Text>
            </View>
          )}
        </Pressable>
      </View>
    </PanelLayout>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    position: "relative",
  },
  collapsed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    ...textStyles.h8,
    color: colors.gray900,
  },
  badge: {
    backgroundColor: colors.festivalBg,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    ...textStyles.h9,
    color: colors.festivalText,
  },
});
