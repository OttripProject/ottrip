import BookmarkSaveIcon from "../../../assets/bookmark_save.svg";
import ViewerPersonIcon from "../../../assets/viewer_person.svg";
import XIcon from "../../../assets/x.svg";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface ViewerHeaderPanelProps {
  planTitle: string;
  onSave: () => void;
  onClose?: () => void;
}

export default function ViewerHeaderPanel({
  planTitle: _planTitle,
  onSave,
  onClose,
}: ViewerHeaderPanelProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerContent}>
        <Text style={styles.brand}>OTTRIP</Text>

        <View style={styles.badge}>
          <ViewerPersonIcon width={12} height={12} />
          <Text style={styles.badgeText}>뷰어 모드</Text>
        </View>

        <View style={styles.spacer} />

        <Pressable onPress={onSave} style={styles.saveButton}>
          <BookmarkSaveIcon width={14} height={14} style={styles.saveButtonIcon} />
          <Text style={styles.saveButtonText}>내 일정으로 저장</Text>
        </Pressable>

        {onClose && (
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
            <XIcon width={16} height={16} color={colors.gray700} />
          </Pressable>
        )}
      </View>
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
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  brand: {
    ...textStyles.h5,
    color: colors.black,
    flexShrink: 0,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    height: 26,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#EAF1FE",
    gap: 5,
    flexShrink: 0,
  },
  badgeText: {
    ...textStyles.h8,
    color: "#007AFF",
  },
  spacer: {
    flex: 1,
  },
  saveButton: {
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#1F1F1F",
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  saveButtonIcon: {
    marginRight: 7,
  },
  saveButtonText: {
    ...textStyles.h7,
    lineHeight: 18,
    color: colors.white,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
