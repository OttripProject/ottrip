import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';

import CameraIcon from '../../../assets/mobile_camera.svg';
import AddIcon from '../../../assets/mobile_plan_add.svg';


export interface AttachmentSectionProps {
  onAddPress?: () => void;
  style?: StyleProp<ViewStyle>;
  showTopDivider?: boolean;
  disabled?: boolean;
}

export default function AttachmentSection({
  onAddPress,
  style,
  showTopDivider = false,
  disabled = false,
}: AttachmentSectionProps) {
  const handlePress = () => {
    if (!disabled) {
      onAddPress?.();
    }
  };

  return (
    <View style={[styles.root, style]}>
      {showTopDivider && <View style={styles.topDivider} />}

      <View style={styles.headerRow}>
        <Text style={styles.title}>첨부 파일 (이미지,PDF)</Text>
        <Pressable
          onPress={handlePress}
          hitSlop={8}
          disabled={disabled}
          style={({ pressed }) => [
            styles.addButtonRow,
            pressed && styles.headerActionPressed,
          ]}
        >
          <AddIcon width={16} height={16} />
          <Text style={[styles.addLabel, disabled && styles.addLabelDisabled]}>
            추가
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.dropZone,
          pressed && !disabled && styles.dropZonePressed,
          disabled && styles.dropZoneDisabled,
        ]}
      >
        <View style={styles.dropZoneRow}>
          <CameraIcon width={20} height={20} />
          <Text style={styles.hint} numberOfLines={1}>
            사진 또는 PDF 추가
          </Text>
        </View>
      </Pressable>
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
  headerActionPressed: {
    opacity: 0.7,
  },
  addButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    flexWrap: 'nowrap',
  },
  dropZonePressed: {
    backgroundColor: colors.gray100,
  },
  dropZoneDisabled: {
    opacity: 0.6,
  },
  hint: {
    ...textStyles.h6,
    color: colors.gray600,
    includeFontPadding: false,
  },
});
