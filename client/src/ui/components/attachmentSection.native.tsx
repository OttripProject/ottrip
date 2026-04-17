import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Alert,
} from 'react-native';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { LocalFile } from '@/types/api';

import CameraIcon from '../../../assets/mobile_camera.svg';
import AddIcon from '../../../assets/mobile_plan_add.svg';
import DeleteIcon from '../../../assets/mobile_x.svg';
import AttachmentDocIcon from '../../../assets/mobile_attachment_document.svg';
import AttachmentImageIcon from '../../../assets/mobile_attachment_image.svg';

export interface AttachmentSectionProps {
  pendingFiles: LocalFile[];
  onPickImage: () => void;
  onPickDocument: () => void;
  onRemoveFile: (index: number) => void;
  isUploading?: boolean;
  style?: StyleProp<ViewStyle>;
  showTopDivider?: boolean;
  disabled?: boolean;
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

export default function AttachmentSection({
  pendingFiles,
  onPickImage,
  onPickDocument,
  onRemoveFile,
  isUploading = false,
  style,
  showTopDivider = false,
  disabled = false,
}: AttachmentSectionProps) {
  const hasFiles = pendingFiles.length > 0;

  const handleAddPress = () => {
    if (disabled || isUploading) return;
    Alert.alert('파일 추가', '추가할 파일 유형을 선택하세요.', [
      { text: '사진', onPress: onPickImage },
      { text: 'PDF 문서', onPress: onPickDocument },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const handleRemove = (index: number) => {
    Alert.alert('파일 삭제', '선택한 파일을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => onRemoveFile(index) },
    ]);
  };

  return (
    <View style={[styles.root, style]}>
      {showTopDivider && <View style={styles.topDivider} />}

      <View style={styles.headerRow}>
        <Text style={styles.title}>첨부 파일 (이미지, PDF)</Text>
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
          <Text style={[styles.addLabel, (disabled || isUploading) && styles.addLabelDisabled]}>
            추가
          </Text>
        </Pressable>
      </View>

      {hasFiles ? (
        <View style={styles.fileList}>
          {pendingFiles.map((file, index) => (
            <View key={`${file.name}-${index}`} style={styles.fileRow}>
              <View style={styles.fileIconWrap}>
                {isPdfMime(file.mimeType) ? (
                  <AttachmentDocIcon width={20} height={20} />
                ) : String(file.mimeType ?? '').startsWith('image/') ? (
                  <AttachmentImageIcon width={20} height={20} />
                ) : (
                  <AttachmentDocIcon width={20} height={20} />
                )}
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                  {file.name}
                </Text>
                <Text style={styles.fileKindLabel}>{getAttachmentKindLabel(file.mimeType)}</Text>
              </View>
              <Pressable
                onPress={() => handleRemove(index)}
                hitSlop={8}
                disabled={isUploading}
                style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
              >
                <DeleteIcon width={20} height={20} color={colors.gray600} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
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
    marginBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    ...textStyles.h5,
    color: colors.black,
  },
  addLabel: {
    ...textStyles.h6,
    color: colors.primary,
  },
  addLabelDisabled: {
    color: colors.gray500,
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
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingVertical: 13,
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
    ...textStyles.h6,
    color: colors.gray600,
    includeFontPadding: false,
  },
  fileList: {
    gap: 8,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
