import type { Attachment } from "@/types/api";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import ScalePressable from "@/ui/components/ScalePressable";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import { formatFileSize } from "@/utils/fileUtils";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import FileDocIcon from "../../../../assets/file_doc.svg";
import FileImageIcon from "../../../../assets/file_image.svg";
import CloseIcon from "../../../../assets/mobile_x.svg";
import PaperclipIcon from "../../../../assets/paperclip.svg";

export const isImageAttachment = (attachment: Attachment) =>
  attachment.contentType.startsWith("image/");

const getFileTypeLabel = (attachment: Attachment) => {
  if (isImageAttachment(attachment)) return "IMG";
  const ext = attachment.fileName.split(".").pop();
  return ext && ext !== attachment.fileName ? ext.toUpperCase() : "FILE";
};

interface AttachmentViewerModalProps {
  visible: boolean;
  onClose: () => void;
  attachments: Attachment[];
  initialIndex?: number;
}

export default function AttachmentViewerModal({
  visible,
  onClose,
  attachments,
  initialIndex = 0,
}: AttachmentViewerModalProps) {
  const [index, setIndex] = useState(initialIndex);
  const [pageWidth, setPageWidth] = useState(0);
  const pagerRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  useEffect(() => {
    if (visible && pageWidth > 0) {
      pagerRef.current?.scrollTo({
        x: initialIndex * pageWidth,
        animated: false,
      });
    }
  }, [visible, initialIndex, pageWidth]);

  const goTo = (next: number) => {
    setIndex(next);
    pagerRef.current?.scrollTo({ x: next * pageWidth, animated: true });
  };

  const current = attachments[index];
  const hasMultiple = attachments.length > 1;

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      height={0.82}
      showDragHandle={false}
    >
      {current && (
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              {isImageAttachment(current) ? (
                <FileImageIcon width={22} height={22} color={colors.primary} />
              ) : (
                <FileDocIcon width={22} height={22} color={colors.primary} />
              )}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.fileName} numberOfLines={1}>
                {current.fileName}
              </Text>
              <Text style={styles.fileMeta}>
                {index + 1} / {attachments.length} ·{" "}
                {formatFileSize(current.fileSize)}
              </Text>
            </View>
            <ScalePressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="닫기"
            >
              <CloseIcon width={17} height={17} color={colors.paletteFg2} />
            </ScalePressable>
          </View>

          <View
            style={[styles.preview, !hasMultiple && styles.previewSingle]}
            onLayout={e => setPageWidth(e.nativeEvent.layout.width)}
          >
            {pageWidth > 0 && (
              <ScrollView
                ref={pagerRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={e =>
                  setIndex(
                    Math.round(e.nativeEvent.contentOffset.x / pageWidth),
                  )
                }
              >
                {attachments.map(attachment => (
                  <View
                    key={attachment.id}
                    style={[styles.page, { width: pageWidth }]}
                  >
                    {isImageAttachment(attachment) ? (
                      <Image
                        source={{ uri: attachment.fileUrl }}
                        style={styles.image}
                        resizeMode="contain"
                      />
                    ) : (
                      <ScalePressable
                        style={styles.documentPreview}
                        onPress={() => Linking.openURL(attachment.fileUrl)}
                      >
                        <PaperclipIcon
                          width={46}
                          height={46}
                          color={colors.paletteFg4}
                        />
                        <Text style={styles.documentTitle}>
                          {getFileTypeLabel(attachment)} 문서
                        </Text>
                        <Text style={styles.documentHint}>
                          외부 앱에서 열립니다.
                        </Text>
                      </ScalePressable>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {hasMultiple && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbStrip}
              contentContainerStyle={styles.thumbStripContent}
            >
              {attachments.map((attachment, i) => {
                const isSelected = i === index;
                const tint = isSelected ? colors.primary : colors.paletteFg3;
                return (
                  <ScalePressable
                    key={attachment.id}
                    style={[styles.thumb, isSelected && styles.thumbSelected]}
                    onPress={() => goTo(i)}
                    accessibilityLabel={attachment.fileName}
                  >
                    {isImageAttachment(attachment) ? (
                      <FileImageIcon width={20} height={20} color={tint} />
                    ) : (
                      <FileDocIcon width={20} height={20} color={tint} />
                    )}
                    <Text style={[styles.thumbLabel, { color: tint }]}>
                      {getFileTypeLabel(attachment)}
                    </Text>
                  </ScalePressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.mdPlus,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryTint,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    ...textStyles.h5,
    color: colors.paletteInk,
  },
  fileMeta: {
    ...textStyles.body5,
    fontFamily: typography.fontFamily.pretendardMedium,
    marginTop: spacing.xs,
    color: colors.paletteFg3,
    fontVariant: ["tabular-nums"],
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paletteFill,
  },
  preview: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.lgPlus,
    overflow: "hidden",
    backgroundColor: colors.paletteFill,
  },
  previewSingle: {
    marginBottom: spacing.xl,
  },
  page: {
    height: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  documentPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  documentTitle: {
    ...textStyles.h6,
    color: colors.paletteFg3,
  },
  documentHint: {
    ...textStyles.body5,
    fontFamily: typography.fontFamily.pretendardMedium,
    color: colors.paletteFg3,
  },
  thumbStrip: {
    flexGrow: 0,
  },
  thumbStripContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radii.mdPlus,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: colors.paletteFill,
  },
  thumbSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  thumbLabel: {
    ...textStyles.h8,
    lineHeight: 16,
  },
});
