import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import CheckIcon from '../../../assets/check_blue.svg';
import WarnIcon from '../../../assets/warn.svg';
import { getJosa } from '@/utils/koreanUtils';

const MODE_CONFIG: Record<string, { title: string; description: string | ((params?: any) => string) }> = {
  add: {
    title: '여행 추가 완료',
    description: (params?: { tripName?: string }) => {
      const name = params?.tripName || '';
      return `"${name}"${getJosa(name, 'add')} 생성되었어요!\n이제 여행 정보를 채워 넣어 볼까요?`;
    },
  },
  edit: {
    title: '변경 사항이 저장 되었어요.',
    description: '여행 정보를 최신 상태로 유지해보세요!',
  },
  delete: {
    title: '여행 삭제 완료',
    description: '여행이 성공적으로 삭제되었습니다.',
  },
  error: {
    title: '문제발생',
    description: (params?: { message?: string }) => params?.message || '문제가 발생했습니다.',
  },
};

interface CompletionModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'add' | 'edit' | 'delete' | 'error' | string;
  params?: any; // mode별 추가 파라미터 (예: add 모드의 tripName, error 모드의 message)
}

export default function CompletionModal({
  visible,
  onClose,
  mode,
  params,
}: CompletionModalProps) {
  // visible이 false이거나 mode가 없으면 렌더링하지 않음
  if (!visible || !mode) {
    return null;
  }
  
  // mode별 설정 가져오기
  const modeConfig = MODE_CONFIG[mode];
  
  if (!modeConfig) {
    console.warn(`CompletionModal: mode "${mode}"에 대한 설정이 없습니다.`);
    return null;
  }
  
  // title 가져오기
  const title = modeConfig.title;
  
  // description 가져오기 (함수면 실행, 문자열이면 그대로 사용)
  const description = typeof modeConfig.description === 'function' 
    ? modeConfig.description(params)
    : modeConfig.description;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.completionOverlay} onPress={onClose}>
        <View style={styles.completionCard}>
          <View style={styles.completionIconWrapper}>
            {mode === 'error' ? (
              <WarnIcon width={20} height={20} />
            ) : (
            <CheckIcon width={20} height={20} />
            )}
          </View>
          <Text style={styles.completionTitle}>{title}</Text>
          <Text style={styles.completionDescription}>{description}</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  completionOverlay: {
    flex: 1,
    backgroundColor: colors.overlayBackground,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  completionCard: {
    width: 320,
    maxWidth: '90%',
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  completionIconWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  completionTitle: {
    ...textStyles.h5,
    color: colors.black,
    textAlign: 'center',
  },
  completionDescription: {
    ...textStyles.body4,
    color: colors.gray700,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
});


