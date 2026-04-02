import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheetModal from '@/ui/components/BottomSheetModal.native';
import { Input } from '@/ui/components/input';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import CloseIcon from '../../../../assets/mobile_close.svg';
import ShareIcon from '../../../../assets/share.svg';

interface AddScheduleWithAiModalProps {
  visible: boolean;
  onClose: () => void;
}

const AI_INTRO =
  '안녕하세요! 어떤 일정을 추가해 드릴까요?\n예: "내일 오후 2시에 루브르 박물관 가고 싶어", "3월 10일에 파리 하얏트 호텔 체크인해줘"';

export default function AddScheduleWithAiModal({
  visible,
  onClose,
}: AddScheduleWithAiModalProps) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      height={0.85}
      backdropOpacity={0.7}
      showDragHandle
    >
      <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.headerTitle}>AI 일정 추가</Text>
            <Text style={styles.subtitle}>대화를 간편하게 일정을 등록하세요.</Text>
          </View>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="닫기"
          >
            <CloseIcon width={20} height={20} color={colors.gray700} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.chatScroll}
          contentContainerStyle={styles.chatScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.aiBubble}>
            <Text style={styles.aiBubbleText}>{AI_INTRO}</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <View style={styles.inputField}>
            <Input
              containerStyle={styles.inputContainer}
              style={styles.inputText}
              variant="filled"
              placeholder="일정을 입력해주세요..."
              placeholderTextColor={colors.gray600}
              value={message}
              onChangeText={setMessage}
              returnKeyType="send"
              multiline={false}
            />
            <Pressable
              style={({ pressed }) => [styles.sendInside, pressed && styles.sendInsidePressed]}
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel="전송"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
            >
              <View style={styles.sendIconWrap}>
                <ShareIcon width={30} height={30} color={colors.white} />
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  titleBlock: {
    flex: 1,
    marginRight: 12,
    gap: spacing.xs,
  },
  headerTitle: {
    ...textStyles.h4,
    color: colors.black,
  },
  subtitle: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatScroll: {
    flex: 1,
    minHeight: 0,
  },
  chatScrollContent: {
    paddingBottom: 12,
    flexGrow: 1,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    maxWidth: '83%',
    backgroundColor: colors.gray200,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  aiBubbleText: {
    ...textStyles.body3,
    color: colors.black,
  },
  footer: {
    paddingTop: 0,
  },
  footerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.gray300,
    marginHorizontal: -20,
    marginBottom: 12,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.gray200,
    paddingLeft: 16,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  inputContainer: {
    flex: 1,
    minWidth: 0,
  },
  inputText: {
    flex: 1,
    minHeight: 36,
    paddingHorizontal: 0,
    paddingRight: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.black,
  },
  sendInside: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendInsidePressed: {
    opacity: 0.7,
  },
  sendIconWrap: {
    width: 42,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
