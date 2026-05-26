import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { colors } from '@/ui/tokens/colors';
import { typography } from '@/ui/tokens/typography';
import { parseTextToItem } from '@/services/aiDocument';
import type { DocumentUploadAnalyzeResponse } from '@/types/api';
import AiResultCard from './AiResultCard';
import SendIcon from '../../../assets/share.svg';
import CloseIcon from '../../../assets/x.svg';

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
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: AI_INTRO },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

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
          { role: 'ai', text: result.error || '분석에 실패했습니다. 다시 시도해주세요.' },
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

  const handleClose = () => {
    setMessages([{ role: 'ai', text: AI_INTRO }]);
    setMessage('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <Text style={styles.headerTitle}>AI 일정 추가</Text>
              <Text style={styles.subtitle}>AI로 간편하게 일정을 등록하세요.</Text>
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="닫기"
            >
              <CloseIcon width={20} height={20} color={colors.black} />
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
                  <View key={idx} style={styles.aiBubbleWrap}>
                    <View style={styles.aiBubble}>
                      <Text style={styles.aiBubbleText}>{msg.text}</Text>
                    </View>
                  </View>
                );
              }
              return (
                <View key={idx} style={styles.userBubbleWrap}>
                  <View style={styles.userBubble}>
                    <Text style={styles.userBubbleText}>{msg.text}</Text>
                  </View>
                </View>
              );
            })}
            {loading && (
              <View style={styles.aiBubbleWrap}>
                <View style={styles.aiBubble}>
                  <ActivityIndicator size="small" color={colors.white} />
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TextInput
              style={styles.input}
              placeholder="일정을 입력해주세요..."
              placeholderTextColor="#9b9b9b"
              value={message}
              onChangeText={setMessage}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              editable={!loading}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendButton,
                loading && styles.sendButtonDisabled,
                pressed && !loading && styles.sendButtonPressed,
              ]}
              onPress={handleSend}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="전송"
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <SendIcon width={20} height={20} color={colors.white} />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    height: 640,
    maxHeight: '90%' as any,
    backgroundColor: colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'column',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.22,
    shadowRadius: 60,
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 12,
  },
  titleBlock: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 18,
    lineHeight: 26,
    color: colors.black,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.gray600,
  },
  closeButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
  },
  aiBubbleWrap: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  aiBubble: {
    maxWidth: '85%',
    backgroundColor: colors.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  aiBubbleText: {
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.white,
  },
  userBubbleWrap: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  userBubble: {
    maxWidth: '85%',
    backgroundColor: colors.gray200,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userBubbleText: {
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.black,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.black,
    outlineStyle: 'none',
  } as any,
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
});
