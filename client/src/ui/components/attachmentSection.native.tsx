import AiAnalyzeErrorBanner from "@/components/AiAnalyzeErrorBanner";
import { useMe } from "@/hooks/useMe";
import type { AttachmentSectionProps } from "@/ui/components/attachmentSection.types";
import {
  type AiAttachmentAnalyzeSelection,
  pendingAiFileKey,
} from "@/ui/components/attachmentSection.types";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { textStyles, typography } from "@/ui/tokens/typography";
import { guestPrompt } from "@/utils/guestPrompt";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import CheckWhiteIcon from "../../../assets/check_white.svg";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AttachmentDocIcon from "../../../assets/mobile_attachment_document.svg";
import AttachmentImageIcon from "../../../assets/mobile_attachment_image.svg";
import CameraIcon from "../../../assets/mobile_camera.svg";
import AddIcon from "../../../assets/mobile_plan_add.svg";
import DeleteIcon from "../../../assets/mobile_x.svg";

export type { AttachmentSectionProps } from "@/ui/components/attachmentSection.types";

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
  onAiAnalyzePress,
  isAiAnalyzing = false,
  onCancelAiAnalyze,
  analyzeError,
  onRetryAnalyze,
  isAiAnalyzeSuccess = false,
  isAiAnalyzePartial = false,
  analyzePartialMessage,
}: AttachmentSectionProps) {
  const { data: me } = useMe();
  const isGuest = isGuestProp ?? me?.isGuest === true;
  const existing = existingAttachments;
  const hasFiles = existing.length + pendingFiles.length > 0;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [isPreviewImageLoading, setIsPreviewImageLoading] = useState(false);
  const [selectedAiTarget, setSelectedAiTarget] =
    useState<AiAttachmentAnalyzeSelection | null>(null);

  const totalFiles = existing.length + pendingFiles.length;
  const showAiRadio = !!onAiAnalyzePress && totalFiles > 1;

  const handleOpenImage = (uri: string) => {
    if (!uri) return;
    setIsPreviewImageLoading(true);
    setPreviewImageUri(uri);
  };

  const handleClosePreview = () => {
    setPreviewImageUri(null);
    setIsPreviewImageLoading(false);
  };

  const handleOpenPdf = async (fileUrl: string) => {
    try {
      const canOpen = await Linking.canOpenURL(fileUrl);
      if (!canOpen) {
        Alert.alert("열 수 없음", "이 URL을 열 수 있는 앱이 없습니다.");
        return;
      }
      await Linking.openURL(fileUrl);
    } catch (e) {
      Alert.alert(
        "파일 열기 실패",
        e instanceof Error ? e.message : "잠시 후 다시 시도해 주세요.",
      );
    }
  };

  const handleAddPress = () => {
    if (disabled || isUploading) return;
    if (isGuest) {
      guestPrompt.show();
      return;
    }
    const showPicker = () => {
      Alert.alert("파일 추가", "추가할 파일 유형을 선택하세요.", [
        { text: "사진", onPress: onPickImage },
        { text: "PDF 문서", onPress: onPickDocument },
        { text: "취소", style: "cancel" },
      ]);
    };
    /** iOS: 다른 RN Modal 위에서 동기 Alert 이 안 뜨는 경우가 있어 한 틱 미룸 */
    if (Platform.OS === "ios") {
      setTimeout(showPicker, 0);
    } else {
      showPicker();
    }
  };

  const handleAiAnalyzePress = () => {
    if (!onAiAnalyzePress) return;
    if (totalFiles === 0) return;

    const getTarget = (): AiAttachmentAnalyzeSelection | null => {
      if (selectedAiTarget) return selectedAiTarget;
      if (pendingFiles.length > 0)
        return { kind: "pending", key: pendingAiFileKey(pendingFiles[0]) };
      if (existing.length > 0) return { kind: "existing", id: existing[0].id };
      return null;
    };

    const target = getTarget();
    if (!target) return;

    if (Platform.OS === "ios") {
      setTimeout(() => onAiAnalyzePress(target), 0);
    } else {
      onAiAnalyzePress(target);
    }
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
    aiSelection?: AiAttachmentAnalyzeSelection,
  ) => {
    const isSelected =
      showAiRadio &&
      aiSelection !== undefined &&
      selectedAiTarget !== null &&
      JSON.stringify(selectedAiTarget) === JSON.stringify(aiSelection);

    const handleRowPress = showAiRadio && aiSelection
      ? () => setSelectedAiTarget(aiSelection)
      : undefined;

    const content = (
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
          <Text
            style={styles.fileName}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {fileName}
          </Text>
          <Text style={styles.fileKindLabel}>{subtitle}</Text>
        </View>
        {onOpen && (
          <Pressable
            onPress={onOpen}
            hitSlop={8}
            style={({ pressed }) => [
              styles.openButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.openButtonText}>열기</Text>
          </Pressable>
        )}
        {onRemove ? (
          <Pressable
            onPress={onRemove}
            hitSlop={8}
            disabled={isUploading || disabled}
            style={({ pressed }) => [
              styles.removeButton,
              pressed && styles.pressed,
            ]}
          >
            <DeleteIcon width={20} height={20} color={colors.gray600} />
          </Pressable>
        ) : (
          <View style={styles.removeButton} />
        )}
      </>
    );

    return (
      <Pressable
        key={key}
        onPress={handleRowPress}
        style={({ pressed }) => [
          styles.fileRow,
          isSelected && styles.fileRowSelected,
          pressed && showAiRadio && styles.pressed,
        ]}
      >
        {content}
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, style]}>
      {showTopDivider && <View style={styles.topDivider} />}

      <View
        style={[styles.headerRow, hideAddControls && styles.headerRowTitleOnly]}
      >
        <Text style={styles.title}>첨부 파일 (이미지, PDF)</Text>
        {!hideAddControls && (
          <Pressable
            onPress={handleAddPress}
            hitSlop={8}
            disabled={disabled || isUploading}
            style={({ pressed }) => [
              styles.addButtonRow,
              pressed && styles.pressed,
            ]}
          >
            <AddIcon width={16} height={16} />
            <Text style={styles.addLabel}>추가</Text>
          </Pressable>
        )}
      </View>

      {showAiRadio && (
        <Text style={styles.aiSelectHint}>분석할 파일을 1개 선택하세요</Text>
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
              onOpen = () => handleOpenImage(a.fileUrl);
            }
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
              onAiAnalyzePress ? { kind: "existing" as const, id: a.id } : undefined,
            );
          })}
          {pendingFiles.map((file, index) =>
            renderFileRow(
              `pending-${file.name}-${index}`,
              file.name,
              file.mimeType,
              getAttachmentKindLabel(file.mimeType),
              () => handleRemovePending(index),
              isImageMime(file.mimeType) ? () => handleOpenImage(file.uri) : undefined,
              onAiAnalyzePress ? { kind: "pending" as const, key: pendingAiFileKey(file) } : undefined,
            ),
          )}
        </View>
      ) : hideAddControls ? null : (
        <Pressable
          onPress={handleAddPress}
          disabled={disabled || isUploading}
          style={({ pressed }) => [
            styles.dropZone,
            pressed && !disabled && styles.dropZonePressed,
            (disabled || isUploading) && styles.dropZoneDisabled,
          ]}
        >
          <View style={styles.dropZoneRow}>
            <CameraIcon width={20} height={20} />
            <Text style={styles.hint} numberOfLines={1}>
              사진 또는 PDF 추가
            </Text>
          </View>
        </Pressable>
      )}

      {onAiAnalyzePress && hasFiles && (
        <View style={styles.aiSection}>
          {isAiAnalyzing ? (
            <View style={styles.aiAnalyzingRow}>
              <ActivityIndicator size="small" color={colors.aiInk} />
              <Text style={styles.aiAnalyzingText}>AI 분석 중...</Text>
              {onCancelAiAnalyze && (
                <Pressable onPress={onCancelAiAnalyze} hitSlop={8}>
                  <Text style={styles.aiCancelText}>취소</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <Pressable
              onPress={handleAiAnalyzePress}
              disabled={disabled || isUploading}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <LinearGradient
                colors={[...colors.aiGrad] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiAnalyzeButton}
              >
                <CheckWhiteIcon width={14} height={14} />
                <Text style={styles.aiAnalyzeButtonText}>AI 분석</Text>
              </LinearGradient>
            </Pressable>
          )}
          {analyzeError && (
            <AiAnalyzeErrorBanner
              message={analyzeError}
              onRetry={onRetryAnalyze}
              style={styles.aiErrorBanner}
            />
          )}
          {isAiAnalyzeSuccess && !analyzeError && (
            <View style={styles.aiSuccessBadge}>
              <Text style={styles.aiSuccessText}>AI 자동 입력 완료</Text>
            </View>
          )}
          {isAiAnalyzePartial && !analyzeError && (
            <View style={styles.aiPartialBadge}>
              <Text style={styles.aiPartialText}>
                {analyzePartialMessage ?? "일부만 인식됨"}
              </Text>
            </View>
          )}
        </View>
      )}

      <Modal
        visible={previewImageUri !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleClosePreview}
      >
        <StatusBar barStyle="light-content" />
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
                Alert.alert(
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
          <SafeAreaView
            style={styles.previewCloseSafeArea}
            pointerEvents="box-none"
          >
            <Pressable
              onPress={handleClosePreview}
              hitSlop={12}
              style={({ pressed }) => [
                styles.previewCloseButton,
                pressed && styles.pressed,
              ]}
            >
              <DeleteIcon width={24} height={24} color={colors.white} />
            </Pressable>
          </SafeAreaView>
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
    marginBottom: 32,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerRowTitleOnly: {
    justifyContent: "flex-start",
  },
  title: {
    ...textStyles.h5,
    color: colors.black,
  },
  addLabel: {
    ...textStyles.h6,
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
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.gray400,
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  dropZoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dropZonePressed: {
    backgroundColor: colors.gray100,
  },
  dropZoneDisabled: {
    opacity: 0.5,
  },
  hint: {
    ...textStyles.h6,
    color: colors.gray600,
    includeFontPadding: false,
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
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  fileIconWrap: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
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
    marginLeft: 8,
    flexShrink: 0,
  },
  aiSection: {
    marginTop: 12,
    gap: 8,
  },
  aiAnalyzingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.gray100,
    borderRadius: 10,
  },
  aiAnalyzingText: {
    ...textStyles.body3,
    color: colors.aiInk,
    flex: 1,
  },
  aiCancelText: {
    ...textStyles.body3,
    color: colors.gray600,
  },
  aiAnalyzeButton: {
    borderRadius: radii.md,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  aiAnalyzeButtonText: {
    color: colors.white,
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.14,
  },
  fileRowSelected: {
    borderWidth: 2,
    borderColor: colors.aiInk,
  },
  aiSelectHint: {
    ...textStyles.body4,
    color: colors.gray600,
    marginBottom: 8,
  },
  openButton: {
    flexShrink: 0,
    marginLeft: 8,
    marginRight: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  openButtonText: {
    ...textStyles.body4,
    color: colors.primary,
  },
  aiErrorBanner: {
    marginTop: 4,
  },
  aiSuccessBadge: {
    backgroundColor: "#E6F9F0",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  aiSuccessText: {
    ...textStyles.body4,
    color: "#1A8A4A",
  },
  aiPartialBadge: {
    backgroundColor: "#FFF4E5",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  aiPartialText: {
    ...textStyles.body4,
    color: "#B85C00",
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
  previewCloseSafeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  previewCloseButton: {
    alignSelf: "flex-end",
    padding: 12,
    marginTop: 8,
    marginRight: 8,
  },
});
