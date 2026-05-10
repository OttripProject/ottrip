import React, { createElement, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';

import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { radii } from '@/ui/tokens/radii';
import { spacing } from '@/ui/tokens/spacing';
import type { LocalFile } from '@/types/api';
import { useMe } from '@/hooks/useMe';
import { guestPrompt } from '@/utils/guestPrompt';
import type { AttachmentSectionProps } from '@/ui/components/attachmentSection.types';
import {
  showDestructiveConfirm,
  showMessage,
  showPickFileType,
} from '@/utils/crossPlatformAlert';

import CameraIcon from '../../../assets/mobile_camera.svg';
import AddIcon from '../../../assets/mobile_plan_add.svg';
import DeleteIcon from '../../../assets/mobile_x.svg';
import AttachmentDocIcon from '../../../assets/mobile_attachment_document.svg';
import AttachmentImageIcon from '../../../assets/mobile_attachment_image.svg';

export type { AttachmentSectionProps } from '@/ui/components/attachmentSection.types';

const WEB_FILE_ACCEPT =
  'image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,application/pdf,.pdf';

const ALLOWED_MIME_PREFIXES = ['image/'] as const;
const ALLOWED_EXACT = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function mimeFromFileName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.heif')) return 'image/heif';
  if (/\.(jpe?g)$/i.test(lower)) return 'image/jpeg';
  return 'application/octet-stream';
}

function isAllowedMime(mime: string): boolean {
  if (ALLOWED_EXACT.has(mime)) return true;
  return ALLOWED_MIME_PREFIXES.some(p => mime.startsWith(p));
}

function fileToLocalFile(file: File): LocalFile | null {
  const rawType = (file.type || '').trim();
  const mime = rawType && rawType !== 'application/octet-stream'
    ? rawType
    : mimeFromFileName(file.name);
  if (!isAllowedMime(mime)) {
    return null;
  }
  return {
    uri: URL.createObjectURL(file),
    name: file.name || 'file',
    mimeType: mime,
    size: file.size ?? 0,
  };
}

function getAttachmentKindLabel(mimeType: string | undefined): string {
  const m = mimeType ?? '';
  if (m === 'application/pdf') return 'PDF 문서';
  if (m.startsWith('image/')) return '이미지 파일';
  return '파일';
}

function isPdfMime(mimeType: string | undefined): boolean {
  return mimeType === 'application/pdf';
}

function isImageMime(mimeType: string | undefined): boolean {
  return typeof mimeType === 'string' && mimeType.startsWith('image/');
}

function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '';
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
  isGuest: isGuestProp,
  onAppendPendingFiles,
}: AttachmentSectionProps) {
  const { data: me } = useMe();
  const isGuest = isGuestProp ?? (me?.isGuest === true);
  const existing = existingAttachments;
  const hasFiles = existing.length + pendingFiles.length > 0;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [isPreviewImageLoading, setIsPreviewImageLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenImage = (uri: string) => {
    if (!uri) return;
    setIsPreviewImageLoading(true);
    setPreviewImageUri(uri);
  };

  const handleClosePreview = () => {
    setPreviewImageUri(null);
    setIsPreviewImageLoading(false);
  };

  const handleOpenPdf = (fileUrl: string) => {
    try {
      if (typeof window !== 'undefined') {
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      showMessage(
        '파일 열기 실패',
        e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.',
      );
    }
  };

  const flushInput = (el: HTMLInputElement | null) => {
    if (el) el.value = '';
  };

  const handleNativeFileInputChange = (event: { target: HTMLInputElement }) => {
    const input = event.target;
    const list = input.files;
    if (!list?.length) {
      flushInput(input);
      return;
    }
    const next: LocalFile[] = [];
    for (let i = 0; i < list.length; i += 1) {
      const lf = fileToLocalFile(list[i]);
      if (lf) next.push(lf);
    }
    flushInput(input);
    if (next.length === 0) {
      showMessage(
        '지원하지 않는 형식',
        '이미지(JPEG, PNG, GIF, WebP, HEIC/HEIF) 또는 PDF만 추가할 수 있습니다.',
      );
      return;
    }
    if (onAppendPendingFiles) {
      onAppendPendingFiles(next);
      return;
    }
    showMessage(
      '파일 추가',
      '웹에서 첨부를 사용하려면 onAppendPendingFiles를 연결해 주세요.',
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
      '파일 추가',
      '추가할 파일 유형을 선택하세요.',
      onPickImage,
      onPickDocument,
    );
  };

  const handleRemovePending = (index: number) => {
    showDestructiveConfirm(
      '파일 삭제',
      '선택한 파일을 삭제하시겠습니까?',
      () => onRemoveFile(index),
    );
  };

  const handleRemoveExisting = (attachmentId: number) => {
    if (!onRemoveExisting) return;
    showDestructiveConfirm(
      '파일 삭제',
      '첨부된 파일을 삭제하시겠습니까?',
      () => {
        void Promise.resolve(onRemoveExisting(attachmentId));
      },
    );
  };

  const renderFileRow = (
    key: string,
    fileName: string,
    mimeType: string | undefined,
    subtitle: string,
    onRemove?: () => void,
    onOpen?: () => void,
  ) => {
    const content = (
      <>
        <View style={styles.fileIconWrap}>
          {isPdfMime(mimeType) ? (
            <AttachmentDocIcon width={20} height={20} />
          ) : String(mimeType ?? '').startsWith('image/') ? (
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
        {onRemove ? (
          <Pressable
            onPress={onRemove}
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

    if (onOpen) {
      return (
        <Pressable
          key={key}
          onPress={onOpen}
          style={({ pressed }) => [
            styles.fileRow,
            pressed && styles.pressed,
          ]}
        >
          {content}
        </Pressable>
      );
    }

    return (
      <View key={key} style={styles.fileRow}>
        {content}
      </View>
    );
  };

  const hiddenFileInput =
    Platform.OS === 'web'
      ? createElement('input', {
          key: 'attachment-file-input',
          ref: (el: HTMLInputElement | null) => {
            fileInputRef.current = el;
          },
          type: 'file',
          accept: WEB_FILE_ACCEPT,
          multiple: true,
          style: { display: 'none' },
          onChange: handleNativeFileInputChange,
        })
      : null;

  return (
    <View style={[styles.root, style]}>
      {hiddenFileInput}
      {showTopDivider && <View style={styles.topDivider} />}

      <View style={styles.headerRow}>
        <Text style={styles.title}>첨부 파일 (이미지,PDF)</Text>
        <Pressable
          onPress={triggerHiddenFilePicker}
          disabled={disabled || isUploading}
          style={({ pressed }) => [
            styles.addButtonRow,
            pressed && styles.pressed,
          ]}
        >
          <AddIcon width={16} height={16} />
          <Text style={styles.addLabel}>추가</Text>
        </Pressable>
      </View>

      {isLoadingExisting && !hasFiles ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : hasFiles ? (
        <View style={styles.fileList}>
          {existing.map((a) => {
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
              [getAttachmentKindLabel(a.contentType), formatFileSize(a.fileSize)]
                .filter(Boolean)
                .join(' · '),
              onRemoveExisting ? () => handleRemoveExisting(a.id) : undefined,
              onOpen,
            );
          })}
          {pendingFiles.map((file, index) =>
            renderFileRow(
              `pending-${file.name}-${index}`,
              file.name,
              file.mimeType,
              getAttachmentKindLabel(file.mimeType),
              () => handleRemovePending(index),
              isImageMime(file.mimeType)
                ? () => handleOpenImage(file.uri)
                : undefined,
            ),
          )}
        </View>
      ) : (
        <Pressable
          onPress={triggerHiddenFilePicker}
          disabled={disabled || isUploading}
          style={({ pressed }) => [
            styles.dropZone,
            pressed && !disabled && styles.dropZonePressed,
            (disabled || isUploading) && styles.dropZoneDisabled,
          ]}
        >
          <View style={styles.dropZoneRow}>
            <CameraIcon width={16} height={16} />
            <Text style={styles.hint} numberOfLines={1}>
              사진 또는 PDF 추가
            </Text>
          </View>
        </Pressable>
      )}

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
                showMessage('이미지 열기 실패', '이미지를 불러오지 못했습니다.');
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
    width: '100%',
  },
  topDivider: {
    height: 1,
    backgroundColor: colors.gray300,
    marginBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pressed: {
    opacity: 0.6,
  },
  dropZone: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gray400,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    minHeight: 40,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dropZonePressed: {
    backgroundColor: colors.gray100,
  },
  dropZoneDisabled: {
    opacity: 0.5,
  },
  hint: {
    ...textStyles.h8,
    color: colors.gray600,
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileList: {
    gap: 8,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  fileIconWrap: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: `${colors.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
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
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCloseBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingRight: 12,
    alignItems: 'flex-end',
  },
  previewCloseButton: {
    padding: 12,
  },
});
