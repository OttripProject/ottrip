import ProfileModal from "@/components/modals/ProfileModal";
import { useMe } from "@/hooks/useMe";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { textStyles, typography } from "@/ui/tokens/typography";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import DownArrowIcon from "../../../assets/dropdown_time.svg";

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
          >
            <Text style={styles.brand}>OTTRIP</Text>
          </Pressable>
        </View>
        <View style={styles.userContainer}>
          <Pressable
            onPress={() => !profileLoading && setProfileModalOpen(true)}
            accessibilityRole="button"
            style={styles.userPill}
          >
            {!profileLoading && (
              <>
                <Text
                  style={styles.userText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {profile?.isGuest ? "게스트" : (profile?.nickname ?? "")}
                </Text>
                <DownArrowIcon
                  width={10}
                  height={10}
                  style={{ opacity: 0.6, marginLeft: 8 }}
                />
              </>
            )}
          </Pressable>
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
    paddingHorizontal: 40,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    ...textStyles.h5,
    fontWeight: typography.weight.bold,
    color: colors.black,
  },
  userPill: {
    height: 32,
    minWidth: 72,
    borderRadius: radii.base,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    maxWidth: 220,
  },
  userText: {
    ...textStyles.body5,
    fontWeight: typography.weight.semibold,
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
