import type { Attachment, Expense } from "@/types/api";
import { categoryLabels } from "@/types/expense";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { formatFileSize } from "@/utils/fileUtils";
import { useEffect, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import LeftArrowIcon from "../../../assets/left_arrow.svg";
import AttachmentImageIcon from "../../../assets/mobile_attachment_image.svg";
import RightArrowIcon from "../../../assets/right_arrow.svg";
import XIcon from "../../../assets/x.svg";

export interface ImagePreviewItem {
  attachment: Attachment;
  expense?: Expense;
}

interface ImagePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  images: ImagePreviewItem[];
  initialIndex?: number;
}

export default function ImagePreviewModal({
  visible,
  onClose,
  images,
  initialIndex = 0,
}: ImagePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) setCurrentIndex(initialIndex);
  }, [visible, initialIndex]);

  if (!visible || images.length === 0) return null;

  const item = images[currentIndex];
  if (!item) return null;

  const { attachment, expense } = item;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const metaParts: string[] = [formatFileSize(attachment.fileSize)];
  if (expense) {
    metaParts.push(categoryLabels[expense.category]);
    if (expense.description) metaParts.push(expense.description);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={e => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.fileBadge}>
                <AttachmentImageIcon width={16} height={16} />
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {attachment.fileName}
                </Text>
                <Text style={styles.fileMeta} numberOfLines={1}>
                  {metaParts.join(" · ")}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <XIcon width={16} height={16} />
            </Pressable>
          </View>

          <View style={styles.imageArea}>
            <Image
              source={{ uri: attachment.fileUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>

          <View style={styles.footer}>
            <Pressable
              style={[styles.navButton, !hasPrev && styles.navButtonDisabled]}
              onPress={() => hasPrev && setCurrentIndex(i => i - 1)}
              disabled={!hasPrev}
            >
              <LeftArrowIcon
                width={16}
                height={16}
                color={hasPrev ? colors.gray900 : colors.gray400}
              />
            </Pressable>
            <Text style={styles.counter}>
              {currentIndex + 1} / {images.length}
            </Text>
            <Pressable
              style={[styles.navButton, !hasNext && styles.navButtonDisabled]}
              onPress={() => hasNext && setCurrentIndex(i => i + 1)}
              disabled={!hasNext}
            >
              <RightArrowIcon
                width={16}
                height={16}
                color={hasNext ? colors.gray900 : colors.gray400}
              />
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: 18,
    width: "92%",
    maxWidth: 640,
    overflow: "hidden",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray300,
    gap: spacing.md,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    minWidth: 0,
  },
  fileBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#E7EEFF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  fileName: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  fileMeta: {
    ...textStyles.body6,
    color: colors.gray600,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  imageArea: {
    minHeight: 460,
    backgroundColor: "#F4F4F4",
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: 396,
  } as any,
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray300,
  },
  navButton: {
    width: 30,
    height: 30,
    borderRadius: radii.base,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  counter: {
    ...textStyles.h9,
    color: colors.gray700,
    minWidth: 50,
    textAlign: "center",
  },
});
