import ScopeDateStrip from "@/components/ScopeDateStrip.native";
import AttachmentViewerModal, {
  isImageAttachment,
} from "@/components/modals/mobile/AttachmentViewerModal.native";
import type { Attachment, Expense } from "@/types/api";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import ScalePressable from "@/ui/components/ScalePressable";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import { formatFileSize } from "@/utils/fileUtils";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import FileDocIcon from "../../../../assets/file_doc.svg";
import FileImageIcon from "../../../../assets/file_image.svg";
import CloseIcon from "../../../../assets/mobile_x.svg";

export interface AttachmentEntry {
  attachment: Attachment;
  expense: Expense;
  categoryLabel: string;
  title: string;
}

interface AttachmentListModalProps {
  visible: boolean;
  onClose: () => void;
  planTitle?: string;
  dates: Dayjs[];
  entries: AttachmentEntry[];
  initialDate: string | null;
}

const toDateKey = (date: string) => dayjs(date).format("YYYY-MM-DD");

export default function AttachmentListModal({
  visible,
  onClose,
  planTitle,
  dates,
  entries,
  initialDate,
}: AttachmentListModalProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (visible) setSelectedDate(initialDate);
  }, [visible, initialDate]);

  const activeDates = useMemo(
    () => new Set(entries.map(entry => toDateKey(entry.expense.exDate))),
    [entries],
  );

  const visibleEntries = selectedDate
    ? entries.filter(entry => toDateKey(entry.expense.exDate) === selectedDate)
    : entries;

  return (
    <BottomSheetModal visible={visible} onClose={onClose} height={0.92}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>첨부파일</Text>
          {!!planTitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {planTitle}
            </Text>
          )}
        </View>
        <Pressable
          style={styles.closeButton}
          onPress={onClose}
          accessibilityLabel="닫기"
        >
          <CloseIcon width={16} height={16} color={colors.paletteFg2} />
        </Pressable>
      </View>

      <View style={styles.stripWrap}>
        <ScopeDateStrip
          style={styles.strip}
          dates={dates}
          activeDates={activeDates}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />
      </View>

      <View style={styles.countRow}>
        <Text style={styles.countLabel}>
          {selectedDate
            ? `DAY ${dates.findIndex(d => d.format("YYYY-MM-DD") === selectedDate) + 1}`
            : "전체"}
        </Text>
        <Text style={styles.countValue}>{visibleEntries.length}개</Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {visibleEntries.length === 0 ? (
          <Text style={styles.empty}>
            {selectedDate
              ? "이 날짜에는 첨부된 파일이 없어요."
              : "첨부된 파일이 없어요."}
          </Text>
        ) : (
          visibleEntries.map((entry, index) => (
            <ScalePressable
              key={entry.attachment.id}
              style={styles.row}
              onPress={() => setViewerIndex(index)}
            >
              <View style={styles.rowIcon}>
                {isImageAttachment(entry.attachment) ? (
                  <FileImageIcon
                    width={20}
                    height={20}
                    color={colors.primary}
                  />
                ) : (
                  <FileDocIcon width={20} height={20} color={colors.primary} />
                )}
              </View>
              <View style={styles.rowText}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {entry.attachment.fileName}
                </Text>
                <Text style={styles.fileMeta} numberOfLines={1}>
                  <Text style={styles.fileCategory}>{entry.categoryLabel}</Text>
                  {entry.title ? ` · ${entry.title}` : ""}
                </Text>
              </View>
              <Text style={styles.fileSize}>
                {formatFileSize(entry.attachment.fileSize)}
              </Text>
            </ScalePressable>
          ))
        )}
      </ScrollView>

      <AttachmentViewerModal
        visible={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
        attachments={visibleEntries.map(entry => entry.attachment)}
        initialIndex={viewerIndex ?? 0}
      />
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...textStyles.h4,
    color: colors.paletteInk,
  },
  subtitle: {
    ...textStyles.body5,
    fontFamily: typography.fontFamily.pretendardMedium,
    marginTop: spacing.xs,
    color: colors.paletteFg3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paletteFill,
  },
  stripWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  strip: {
    backgroundColor: colors.paletteFill,
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  countLabel: {
    ...textStyles.h7,
    color: colors.paletteInk,
  },
  countValue: {
    ...textStyles.body5,
    marginLeft: "auto",
    color: colors.paletteFg3,
    fontVariant: ["tabular-nums"],
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  empty: {
    ...textStyles.body4,
    fontFamily: typography.fontFamily.pretendardMedium,
    paddingVertical: spacing["2xl"],
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lgPlus,
    textAlign: "center",
    overflow: "hidden",
    color: colors.paletteFg3,
    backgroundColor: colors.paletteFill,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lgPlus,
    borderWidth: 1,
    borderColor: colors.paletteLine,
    backgroundColor: colors.paletteFill,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryTint,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    ...textStyles.h6,
    color: colors.paletteInk,
  },
  fileMeta: {
    ...textStyles.body5,
    fontFamily: typography.fontFamily.pretendardMedium,
    marginTop: spacing.xs,
    color: colors.paletteFg3,
  },
  fileCategory: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    color: colors.primary,
  },
  fileSize: {
    ...textStyles.body5,
    fontFamily: typography.fontFamily.pretendardMedium,
    color: colors.paletteFg3,
    fontVariant: ["tabular-nums"],
  },
});
