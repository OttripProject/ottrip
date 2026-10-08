import ProfileModal from "@/components/modals/ProfileModal";
import { useMe } from "@/hooks/useMe";
import MotionPressable, { MotionIcon } from "@/ui/components/MotionPressable";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import DownArrowIcon from "../../../assets/dropdown_time.svg";
import CalendarIcon from "../../../assets/mobile_calendar_black.svg";

export default function HeaderPanel() {
  const navigation = useNavigation<NavigationProp<any>>();
  const { data: profile, isLoading: profileLoading } = useMe();
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.headerContent}>
        <View style={styles.brandContainer}>
          <Pressable
            onPress={() => {
              (navigation as any).reset({
                index: 0,
                routes: [{ name: "OTTRIP" }],
              });
            }}
            accessibilityRole="button"
            style={styles.brandButton}
          >
            <CalendarIcon width={20} height={20} color={colors.black} />
            <Text style={styles.brand}>OTTRIP</Text>
          </Pressable>
        </View>
        <View style={styles.userContainer}>
          {!profileLoading && (
            <MotionPressable
              onPress={() => setProfileModalOpen(true)}
              accessibilityRole="button"
              style={styles.userPill}
              hoverStyle={shadows.xsHover}
            >
              <Text
                style={styles.userText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {profile?.isGuest ? "게스트" : (profile?.nickname ?? "")}
              </Text>
              <MotionIcon style={{ opacity: 0.6, marginLeft: 8 }}>
                <DownArrowIcon width={10} height={10} />
              </MotionIcon>
            </MotionPressable>
          )}
        </View>
      </View>

      <ProfileModal
        visible={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    marginTop: spacing.lg,
    marginHorizontal: spacing.lgPlus,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radii.xl,
    ...shadows.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  brand: {
    ...textStyles.h6,
    fontWeight: typography.weight.bold,
    color: colors.black,
  },
  userPill: {
    height: 32,
    minWidth: 72,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    maxWidth: 220,
    ...shadows.xs,
  },
  userText: {
    ...textStyles.h8,
    color: colors.gray900,
    flexShrink: 1,
    minWidth: 0,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  brandContainer: {
    flex: 1,
    alignItems: "flex-start",
  },
  userContainer: {
    alignItems: "flex-end",
  },
});
