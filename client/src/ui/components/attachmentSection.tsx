import { LinearGradient } from "expo-linear-gradient";
import { createElement, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { useMe } from "@/hooks/useMe";
import type { LocalFile } from "@/types/api";
import ImagePreviewModal, {
  type ImagePreviewItem,
} from "@/components/modals/ImagePreviewModal";
import type { AttachmentSectionProps } from "@/ui/components/attachmentSection.types";
import { pendingAiFileKey } from "@/ui/components/attachmentSection.types";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { showMessage, showPickFileType } from "@/utils/crossPlatformAlert";
import { guestPrompt } from "@/utils/guestPrompt";

import DeleteIcon from "../../../assets/attach_del.svg";
import AttachmentDocIcon from "../../../assets/mobile_attachment_document.svg";
import AttachmentImageIcon from "../../../assets/mobile_attachment_image.svg";
import UploadIcon from "../../../assets/upload_icon.svg";
import AddIcon from "../../../assets/mobile_plan_add.svg";
import CheckWhiteIcon from "../../../assets/check_white.svg";
import ErrorTriangleIcon from "../../../assets/error_triangle.svg";
import CloseErrorIcon from "../../../assets/close_error.svg";

export type { AttachmentSectionProps } from "@/ui/components/attachmentSection.types";

const WEB_FILE_ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,application/pdf,.pdf";

const ALLOWED_MIME_PREFIXES = ["image/"] as const;
const ALLOWED_EXACT = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function mimeFromFileName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".heif")) return "image/heif";
  if (/\.(jpe?g)$/i.test(lower)) return "image/jpeg";
  return "application/octet-stream";
}

function isAllowedMime(mime: string): boolean {
  if (ALLOWED_EXACT.has(mime)) return true;
  return ALLOWED_MIME_PREFIXES.some(p => mime.startsWith(p));
}

function fileToLocalFile(file: File): LocalFile | null {
  const rawType = (file.type || "").trim();
  const mime =
    rawType && rawType !== "application/octet-stream"
      ? rawType
      : mimeFromFileName(file.name);
  if (!isAllowedMime(mime)) {
    return null;
  }
  return {
    uri: URL.createObjectURL(file),
    name: file.name || "file",
    mimeType: mime,
    size: file.size ?? 0,
  };
}

function getAttachmentKindLabel(mimeType: string | undefined): string {
  const m = mimeType ?? "";
  if (m === "application/pdf") return "PDF 문서";
  if (m.startsWith("image/")) return "이미지 파일";
  return "파일";
}

function isPdfMime(mimeType: string | undefined): boolean {
  return mimeType === "application/pdf";
}

function isImageMime(mimeType: string | undefined): boolean {
  return typeof mimeType === "string" && mimeType.startsWith("image/");
}

function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function stopEventBubble<E extends { stopPropagation?: () => void }>(
  e: E,
): void {
  e.stopPropagation?.();
}

type AiFileSelection =
  | null
  | { kind: "existing"; id: number }
  | { kind: "pending"; key: string };

export default function AttachmentSection({
  pendingFiles,
  onPickImage,
  onPickDocument,
  onRemoveFile,
  existingAttachments = [],
  onRemoveExisting,
  isLoadingExisting = false,
  isUploading = false,
  style,
  showTopDivider = false,
  disabled = false,
  hideAddControls = false,
  isGuest: isGuestProp,
  onAppendPendingFiles,
  onAiAnalyzePress,
  isAiAnalyzing = false,
  onCancelAiAnalyze,
}: AttachmentSectionProps) {
  const { data: me } = useMe();
  const isGuest = isGuestProp ?? me?.isGuest === true;
  const existing = existingAttachments;
  const hasFiles = existing.length + pendingFiles.length > 0;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [isPreviewImageLoading, setIsPreviewImageLoading] = useState(false);
  const [previewItems, setPreviewItems] = useState<ImagePreviewItem[]>([]);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [aiFileSelection, setAiFileSelection] = useState<AiFileSelection>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileFormatError, setFileFormatError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropZoneRef = useRef<any>(null);

  const showAiToolbar =
    Platform.OS === "web" &&
    !hideAddControls &&
    !isGuest &&
    hasFiles &&
    !!onAiAnalyzePress;
  const aiRowSelectable =
    showAiToolbar && !disabled && !isUploading && !isAiAnalyzing;

  useEffect(() => {
    setAiFileSelection(prev => {
      if (!prev) return prev;
      if (prev.kind === "existing") {
        return existing.some(a => a.id === prev.id) ? prev : null;
      }
      const stillThere = pendingFiles.some(
        f => pendingAiFileKey(f) === prev.key,
      );
      return stillThere ? prev : null;
    });
  }, [existing, pendingFiles]);

  const handleOpenExistingImage = (attachmentId: number) => {
    const imageItems: ImagePreviewItem[] = existing
      .filter(a => isImageMime(a.contentType))
      .map(a => ({ attachment: a }));
    const idx = imageItems.findIndex(item => item.attachment.id === attachmentId);
    setPreviewItems(imageItems);
    setPreviewInitialIndex(Math.max(0, idx));
    setPreviewVisible(true);
  };

  const handleOpenPendingImage = (uri: string) => {
    if (!uri) return;
    setIsPreviewImageLoading(true);
    setPreviewImageUri(uri);
  };

  const handleClosePreview = () => {
    setPreviewImageUri(null);
    setIsPreviewImageLoading(false);
  };

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) setIsDragOver(true);
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    if ((e.currentTarget as HTMLElement)?.contains?.(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  }, []);

  const AI_MAX_SIZE = 10 * 1024 * 1024;

  const buildFileError = (invalidNames: string[], oversizeNames: string[]): string | null => {
    if (oversizeNames.length > 0) {
      const first = oversizeNames[0];
      const rest = oversizeNames.length - 1;
      return rest > 0
        ? `"${first}" 외 ${rest}건은(는) 10MB를 넘어 업로드할 수 없어요.`
        : `"${first}"은(는) 10MB를 넘어 업로드할 수 없어요.`;
    }
    if (invalidNames.length > 0) {
      const first = invalidNames[0];
      const rest = invalidNames.length - 1;
      return rest > 0
        ? `"${first}" 외 ${rest}건은(는) 지원하지 않는 형식이에요. (이미지·PDF)`
        : `"${first}"은(는) 지원하지 않는 형식이에요. (이미지·PDF)`;
    }
    return null;
  };

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled || isUploading) return;
    const files = e.dataTransfer?.files;
    if (!files?.length) return;
    const next: LocalFile[] = [];
    const invalidNames: string[] = [];
    const oversizeNames: string[] = [];
    for (let i = 0; i < files.length; i += 1) {
      const lf = fileToLocalFile(files[i]);
      if (!lf) { invalidNames.push(files[i].name); continue; }
      if (files[i].size > AI_MAX_SIZE) { oversizeNames.push(files[i].name); continue; }
      next.push(lf);
    }
    setFileFormatError(buildFileError(invalidNames, oversizeNames));
    if (next.length > 0 && onAppendPendingFiles) onAppendPendingFiles(next);
  }, [disabled, isUploading, onAppendPendingFiles]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = dropZoneRef.current;
    if (!el) return;
    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("dragenter", handleDragOver);
    el.addEventListener("dragleave", handleDragLeave);
    el.addEventListener("drop", handleDrop);
    return () => {
      el.removeEventListener("dragover", handleDragOver);
      el.removeEventListener("dragenter", handleDragOver);
      el.removeEventListener("dragleave", handleDragLeave);
      el.removeEventListener("drop", handleDrop);
    };
  }, [handleDragOver, handleDragLeave, handleDrop]);

  const handleOpenPdf = (fileUrl: string) => {
    try {
      if (typeof window !== "undefined") {
        window.open(fileUrl, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      showMessage(
        "파일 열기 실패",
        e instanceof Error ? e.message : "잠시 후 다시 시도해 주세요.",
      );
    }
  };

  const flushInput = (el: HTMLInputElement | null) => {
    if (el) el.value = "";
  };

  const handleNativeFileInputChange = (event: { target: HTMLInputElement }) => {
    const input = event.target;
    const list = input.files;
    if (!list?.length) {
      flushInput(input);
      return;
    }
    const next: LocalFile[] = [];
    const invalidNames: string[] = [];
    const oversizeNames: string[] = [];
    for (let i = 0; i < list.length; i += 1) {
      const lf = fileToLocalFile(list[i]);
      if (!lf) { invalidNames.push(list[i].name); continue; }
      if (list[i].size > AI_MAX_SIZE) { oversizeNames.push(list[i].name); continue; }
      next.push(lf);
    }
    flushInput(input);
    setFileFormatError(buildFileError(invalidNames, oversizeNames));
    if (next.length === 0) return;
    if (onAppendPendingFiles) {
      onAppendPendingFiles(next);
      return;
    }
    showMessage(
      "파일 추가",
      "웹에서 첨부를 사용하려면 onAppendPendingFiles를 연결해 주세요.",
    );
  };

  const triggerHiddenFilePicker = () => {
    if (disabled || isUploading) return;
    if (isGuest) {
      guestPrompt.show();
      return;
    }
    if (onAppendPendingFiles) {
      fileInputRef.current?.click();
      return;
    }
    showPickFileType(
      "파일 추가",
      "추가할 파일 유형을 선택하세요.",
      onPickImage,
      onPickDocument,
    );
  };

  const handleRemovePending = (index: number) => {
    onRemoveFile(index);
  };

  const handleRemoveExisting = (attachmentId: number) => {
    if (!onRemoveExisting) return;
    void Promise.resolve(onRemoveExisting(attachmentId));
  };

  const renderFileRow = (
    key: string,
    fileName: string,
    mimeType: string | undefined,
    subtitle: string,
    onRemove?: () => void,
    onOpen?: () => void,
    aiSelect?: { selected: boolean; onSelect: () => void },
  ) => {
    const iconAndInfo = (
      <>
        <View style={styles.fileIconWrap}>
          {isPdfMime(mimeType) ? (
            <AttachmentDocIcon width={20} height={20} />
          ) : String(mimeType ?? "").startsWith("image/") ? (
            <AttachmentImageIcon width={20} height={20} />
          ) : (
            <AttachmentDocIcon width={20} height={20} />
          )}
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {fileName}
          </Text>
          <Text style={styles.fileKindLabel}>{subtitle}</Text>
        </View>
      </>
    );

    const openControl = onOpen ? (
      <Pressable
        onPress={e => {
          stopEventBubble(e);
          onOpen();
        }}
        disabled={isUploading}
        style={({ pressed }) => [styles.openLinkHit, pressed && styles.pressed]}
        hitSlop={6}
      >
        <Text style={styles.openLinkText}>열기</Text>
      </Pressable>
    ) : (
      <View style={styles.openLinkHit} />
    );

    const removeControl = onRemove ? (
      <Pressable
        onPress={e => {
          stopEventBubble(e);
          onRemove();
        }}
        disabled={isUploading || disabled}
        style={({ pressed }) => [
          styles.removeButton,
          pressed && styles.pressed,
        ]}
        hitSlop={6}
      >
        <DeleteIcon width={20} height={20} color={colors.gray600} />
      </Pressable>
    ) : (
      <View style={styles.removeButton} />
    );

    const rowStyle = [
      styles.fileRow,
      aiSelect?.selected && styles.fileRowAiSelected,
    ];

    const inner = (
      <>
        {iconAndInfo}
        {openControl}
        {removeControl}
      </>
    );

    if (showAiToolbar && aiSelect) {
      return (
        <Pressable
          key={key}
          onPress={() => {
            if (!aiRowSelectable) return;
            aiSelect.onSelect();
          }}
          style={({ pressed }) => [
            ...rowStyle,
            pressed && aiRowSelectable && styles.fileRowAiPressablePressed,
          ]}
        >
          {inner}
        </Pressable>
      );
    }

    return (
      <View key={key} style={rowStyle}>
        {inner}
      </View>
    );
  };

  const hiddenFileInput =
    Platform.OS === "web"
      ? createElement("input", {
          key: "attachment-file-input",
          ref: (el: HTMLInputElement | null) => {
            fileInputRef.current = el;
          },
          type: "file",
          accept: WEB_FILE_ACCEPT,
          multiple: true,
          style: { display: "none" },
          onChange: handleNativeFileInputChange,
        })
      : null;

  return (
    <View style={[styles.root, style]}>
      {hiddenFileInput}
      {showTopDivider && <View style={styles.topDivider} />}

      <View
        style={[styles.headerRow, hideAddControls && styles.headerRowTitleOnly]}
      >
        <Text style={styles.title}>첨부파일 (이미지,PDF)</Text>
        {!hideAddControls && (
          <Pressable
            onPress={triggerHiddenFilePicker}
            disabled={disabled || isUploading}
            style={({ pressed }) => [
              styles.addButtonRow,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.addLabel}>+ 추가</Text>
          </Pressable>
        )}
      </View>

      {fileFormatError && (
        <View style={styles.formatErrorBanner}>
          <ErrorTriangleIcon width={14} height={14} style={styles.formatErrorIcon} />
          <Text style={styles.formatErrorText}>{fileFormatError}</Text>
          <Pressable onPress={() => setFileFormatError(null)} style={styles.formatErrorClose} hitSlop={6}>
            <CloseErrorIcon width={10} height={10} color={colors.red} />
          </Pressable>
        </View>
      )}

      {showAiToolbar && (
        <Text style={styles.aiSelectHint}>분석할 파일을 1개 선택하세요.</Text>
      )}

      {isLoadingExisting && !hasFiles ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : hasFiles ? (
        <View style={styles.fileList}>
          {existing.map(a => {
            let onOpen: (() => void) | undefined;
            if (isPdfMime(a.contentType)) {
              onOpen = () => handleOpenPdf(a.fileUrl);
            } else if (isImageMime(a.contentType)) {
              onOpen = () => handleOpenExistingImage(a.id);
            }
            const aiSelect = showAiToolbar
              ? {
                  selected:
                    aiFileSelection?.kind === "existing" &&
                    aiFileSelection.id === a.id,
                  onSelect: () => {
                    if (!aiRowSelectable) return;
                    setAiFileSelection(prev => {
                      if (prev?.kind === "existing" && prev.id === a.id) {
                        return null;
                      }
                      return { kind: "existing", id: a.id };
                    });
                  },
                }
              : undefined;
            return renderFileRow(
              `existing-${a.id}`,
              a.fileName,
              a.contentType,
              [
                getAttachmentKindLabel(a.contentType),
                formatFileSize(a.fileSize),
              ]
                .filter(Boolean)
                .join(" · "),
              onRemoveExisting ? () => handleRemoveExisting(a.id) : undefined,
              onOpen,
              aiSelect,
            );
          })}
          {pendingFiles.map((file, index) => {
            let onOpen: (() => void) | undefined;
            if (isPdfMime(file.mimeType)) {
              onOpen = () => handleOpenPdf(file.uri);
            } else if (isImageMime(file.mimeType)) {
              onOpen = () => handleOpenPendingImage(file.uri);
            }
            const aiSelect = showAiToolbar
              ? {
                  selected:
                    aiFileSelection?.kind === "pending" &&
                    aiFileSelection.key === pendingAiFileKey(file),
                  onSelect: () => {
                    if (!aiRowSelectable) return;
                    const key = pendingAiFileKey(file);
                    setAiFileSelection(prev => {
                      if (prev?.kind === "pending" && prev.key === key) {
                        return null;
                      }
                      return { kind: "pending", key };
                    });
                  },
                }
              : undefined;
            return renderFileRow(
              `pending-${file.name}-${index}`,
              file.name,
              file.mimeType,
              getAttachmentKindLabel(file.mimeType),
              () => handleRemovePending(index),
              onOpen,
              aiSelect,
            );
          })}
        </View>
      ) : hideAddControls ? null : (
        <Pressable
          ref={dropZoneRef}
          onPress={triggerHiddenFilePicker}
          disabled={disabled || isUploading}
          style={({ pressed }) => [
            styles.dropZone,
            isDragOver && styles.dropZoneDragOver,
            pressed && !disabled && !isDragOver && styles.dropZonePressed,
            (disabled || isUploading) && styles.dropZoneDisabled,
          ]}
        >
          <View style={[styles.dropZoneIconBox, isDragOver && styles.dropZoneIconBoxDragOver]}>
            <UploadIcon width={24} height={24} color={isDragOver ? colors.primary : colors.gray900} />
          </View>
          <Text style={styles.dropZoneHint}>파일을 끌어다 놓거나 클릭해서 추가</Text>
          <Text style={styles.dropZoneSubHint}>PDF · JPG · PNG · 여러 개 가능</Text>
        </Pressable>
      )}
      {!hideAddControls && !hasFiles && (
        <Text style={styles.dropZoneSizeHint}>최대 10MB · PDF, JPG, PNG</Text>
      )}

      {showAiToolbar ? (
        <View style={styles.aiToolbar}>
          {isAiAnalyzing ? (
            <View style={styles.aiAnalyzeLoadingBox}>
              <ActivityIndicator size="small" color={colors.aiInk} />
              <View style={styles.aiAnalyzeLoadingTextCol}>
                <Text style={styles.aiAnalyzeLoadingTextTitle}>분석 중...</Text>
                <Text style={styles.aiAnalyzeLoadingText}>
                  AI가 첨부 파일 내용을 정리하고 있어요.
                </Text>
              </View>
              <Pressable
                onPress={onCancelAiAnalyze}
                style={({ pressed }) => [styles.aiCancelButton, pressed && styles.aiCancelButtonPressed]}
                hitSlop={8}
              >
                <Text style={styles.aiCancelButtonText}>취소</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                if (!aiFileSelection || isAiAnalyzing) return;
                onAiAnalyzePress?.(aiFileSelection);
              }}
              disabled={!aiFileSelection || disabled || isUploading}
              style={styles.aiAnalyzeButton}
            >
              {({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => {
                const isDisabled = !aiFileSelection || disabled || isUploading;
                const gradColors = isDisabled
                  ? ([colors.gray400, colors.gray400] as const)
                  : pressed
                    ? colors.aiGradPress
                    : hovered
                      ? colors.aiGradHover
                      : colors.aiGrad;
                return (
                  <LinearGradient
                    colors={gradColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.aiAnalyzeGradient}
                  >
                    <View style={styles.aiAnalyzeButtonInner}>
                      <CheckWhiteIcon width={14} height={14} />
                      <Text style={styles.aiAnalyzeButtonText}>AI로 분석</Text>
                    </View>
                  </LinearGradient>
                );
              }}
            </Pressable>
          )}
        </View>
      ) : null}

      <ImagePreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        images={previewItems}
        initialIndex={previewInitialIndex}
      />

      <Modal
        visible={previewImageUri !== null}
        transparent
        animationType="fade"
        onRequestClose={handleClosePreview}
      >
        <Pressable style={styles.previewBackdrop} onPress={handleClosePreview}>
          {previewImageUri !== null && (
            <Image
              source={{ uri: previewImageUri }}
              style={{
                width: windowWidth,
                height: windowHeight,
              }}
              resizeMode="contain"
              onLoadStart={() => setIsPreviewImageLoading(true)}
              onLoadEnd={() => setIsPreviewImageLoading(false)}
              onError={() => {
                setIsPreviewImageLoading(false);
                showMessage(
                  "이미지 열기 실패",
                  "이미지를 불러오지 못했습니다.",
                );
                handleClosePreview();
              }}
            />
          )}
          {isPreviewImageLoading && (
            <View style={styles.previewLoading} pointerEvents="none">
              <ActivityIndicator size="large" color={colors.white} />
            </View>
          )}
          <View style={styles.previewCloseBar} pointerEvents="box-none">
            <Pressable
              onPress={handleClosePreview}
              style={({ pressed }) => [
                styles.previewCloseButton,
                pressed && styles.pressed,
              ]}
            >
              <DeleteIcon width={24} height={24} color={colors.white} />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
  },
  topDivider: {
    height: 1,
    backgroundColor: colors.gray300,
    marginBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerRowTitleOnly: {
    justifyContent: "flex-start",
  },
  title: {
    ...textStyles.h8,
    color: colors.black,
  },
  addLabel: {
    ...textStyles.h8,
    color: colors.primary,
  },
  addButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pressed: {
    opacity: 0.6,
  },
  dropZone: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.gray400,
    borderRadius: radii.lg,
    backgroundColor: colors.gray100,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  dropZoneIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  dropZoneHint: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  dropZoneSubHint: {
    ...textStyles.body6,
    color: colors.gray600,
    marginTop: spacing.xs - 1,
  },
  dropZoneSizeHint: {
    ...textStyles.body6,
    color: colors.gray600,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  dropZoneDragOver: {
    borderColor: colors.primary,
    backgroundColor: "#EBF4FF",
  },
  dropZoneIconBoxDragOver: {
    borderColor: colors.primary,
  },
  dropZonePressed: {
    backgroundColor: colors.gray200,
  },
  dropZoneDisabled: {
    opacity: 0.5,
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  fileList: {
    gap: 8,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  fileRowAiSelected: {
    backgroundColor: colors.gray400,
  },
  fileRowAiPressablePressed: {
    opacity: 0.92,
  },
  openLinkHit: {
    flexShrink: 0,
    marginLeft: 8,
    marginRight: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  openLinkText: {
    ...textStyles.h8,
    color: colors.primary,
  },
  fileIconWrap: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: `${colors.primary}1A`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    ...textStyles.h6,
  },
  fileKindLabel: {
    ...textStyles.body4,
    color: colors.gray600,
    marginTop: 2,
  },
  removeButton: {
    marginLeft: 4,
    flexShrink: 0,
  },
  formatErrorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingVertical: 9,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.md,
    backgroundColor: "rgb(255, 241, 239)",
    borderWidth: 1,
    borderColor: "rgb(251, 217, 211)",
  },
  formatErrorIcon: {
    flexShrink: 0,
    marginTop: 1,
  },
  formatErrorText: {
    ...textStyles.body6,
    flex: 1,
    color: colors.red,
  },
  formatErrorClose: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  aiSelectHint: {
    ...textStyles.body6,
    color: colors.gray700,
    marginBottom: spacing.xs,
  },
  aiToolbar: {
    marginTop: spacing.md,
    width: "100%",
  },
  aiAnalyzeButton: {
    width: "100%",
    borderRadius: radii.md,
    overflow: "hidden",
  },
  aiAnalyzeGradient: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  aiAnalyzeButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  aiAnalyzeButtonText: {
    ...textStyles.h8,
    color: colors.white,
    textAlign: "center",
  },
  aiAnalyzeLoadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  aiAnalyzeLoadingTextCol: {
    flex: 1,
    flexDirection: "column",
    gap: 2,
  },
  aiAnalyzeLoadingTextTitle: {
    ...textStyles.h8,
    color: colors.gray900,
  },
  aiAnalyzeLoadingText: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  aiCancelButton: {
    flexShrink: 0,
    marginLeft: "auto" as unknown as number,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.gray300,
  },
  aiCancelButtonPressed: {
    opacity: 0.7,
  },
  aiCancelButtonText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 11,
    lineHeight: 14,
    color: colors.gray900,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  previewCloseBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingRight: 12,
    alignItems: "flex-end",
  },
  previewCloseButton: {
    padding: 12,
  },
});
