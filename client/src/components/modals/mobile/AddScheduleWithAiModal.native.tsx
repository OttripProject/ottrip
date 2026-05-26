import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheetModal from '@/ui/components/BottomSheetModal.native';
import { Input } from '@/ui/components/input';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { parseTextToItem } from '@/services/aiDocument';
import type { DocumentUploadAnalyzeResponse } from '@/types/api';
import AiResultCard from './AiResultCard.native';
import CloseIcon from '../../../../assets/mobile_close.svg';
import ShareIcon from '../../../../assets/share.svg';

interface AddScheduleWithAiModalProps {
  visible: boolean;
  onClose: () => void;
  planId: number;
  planPublicId: string;
  onSaved?: () => void;
}

type Message =
  | { role: 'ai'; text: string }
  | { role: 'user'; text: string }
  | { role: 'result'; result: DocumentUploadAnalyzeResponse };

const AI_INTRO =
  '안녕하세요! 어떤 일정을 추가해 드릴까요?\n예: "내일 오후 2시에 루브르 박물관 가고 싶어", "3월 10일에 파리 하얏트 호텔 체크인해줘"';

export default function AddScheduleWithAiModal({
  visible,
  onClose,
  planId,
  planPublicId,
  onSaved,
}: AddScheduleWithAiModalProps) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: AI_INTRO },
  ]);
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = async () => {
    const text = message.trim();
    if (!text || loading) return;

    setMessage('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const result = await parseTextToItem(text, planPublicId);
      if (result.success && result.draft) {
        setMessages((prev) => [...prev, { role: 'result', result }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: result.error || '분석에 실패했습니다. 다시 시도해주세요.',
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleSaved = () => {
    setMessages((prev) => [
      ...prev,
      { role: 'ai', text: '✅ 저장됐어요! 다른 일정도 추가해드릴까요?' },
    ]);
    onSaved?.();
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      height={0.85}
      backdropOpacity={0.7}
      showDragHandle
    >
      <View style={[styles.shell, { paddingBottom: keyboardHeight > 0 ? keyboardHeight : Math.max(insets.bottom, 12) }]}>
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
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          {messages.map((msg, idx) => {
            if (msg.role === 'result') {
              return (
                <AiResultCard
                  key={idx}
                  result={msg.result}
                  planId={planId}
                  onSaved={handleSaved}
                />
              );
            }
            if (msg.role === 'ai') {
              return (
                <View key={idx} style={styles.aiBubble}>
                  <Text style={styles.aiBubbleText}>{msg.text}</Text>
                </View>
              );
            }
            return (
              <View key={idx} style={styles.userBubble}>
                <Text style={styles.userBubbleText}>{msg.text}</Text>
              </View>
            );
          })}
          {loading && (
            <View style={styles.aiBubble}>
              <ActivityIndicator size="small" color={colors.white} />
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <View style={styles.inputField}>
            <Input
              containerStyle={styles.inputContainer}
              style={[
                styles.inputText,
                Platform.OS === 'android' && styles.inputTextAndroid,
                Platform.OS === 'ios' && styles.inputTextIOS,
              ]}
              variant="filled"
              placeholder="일정을 입력해주세요..."
              placeholderTextColor={colors.gray600}
              value={message}
              onChangeText={setMessage}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              multiline={false}
              editable={!loading}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendInside,
                pressed && styles.sendInsidePressed,
                loading && styles.sendInsideDisabled,
              ]}
              onPress={handleSend}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="전송"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
            >
              <View style={[styles.sendIconWrap, loading && styles.sendIconWrapDisabled]}>
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
    gap: 8,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    maxWidth: '83%',
    backgroundColor: colors.primary,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  aiBubbleText: {
    ...textStyles.body3,
    color: colors.white,
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '83%',
    backgroundColor: colors.gray200,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  userBubbleText: {
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
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: colors.gray200,
    paddingLeft: 16,
    paddingRight: spacing.xs,
  },
  inputContainer: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
  },
  inputText: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 0,
    paddingRight: spacing.sm,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.black,
  },
  inputTextAndroid: {
    includeFontPadding: true,
    textAlignVertical: 'center',
    paddingTop: 9,
    paddingBottom: 9,
  },
  inputTextIOS: {
    paddingTop: 6,
    paddingBottom: 12,
  },
  sendInside: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendInsidePressed: {
    opacity: 0.7,
  },
  sendInsideDisabled: {
    opacity: 0.5,
  },
  sendIconWrap: {
    width: 42,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIconWrapDisabled: {
    backgroundColor: colors.gray400,
  },
});
