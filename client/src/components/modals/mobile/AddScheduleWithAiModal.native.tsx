import { useFilePicker } from "@/hooks/useFilePicker";
import { analyzeDocumentUpload, parseTextToItem } from "@/services/aiDocument";
import type { DocumentUploadAnalyzeResponse, LocalFile } from "@/types/api";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import { Input } from "@/ui/components/input";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AttachClipIcon from "../../../../assets/files.svg";
import CloseIcon from "../../../../assets/mobile_close.svg";
import ShareIcon from "../../../../assets/share.svg";
import AiResultCard from "./AiResultCard.native";

interface AddScheduleWithAiModalProps {
  visible: boolean;
  onClose: () => void;
  planId: number;
  planPublicId: string;
  onSaved?: () => void;
}

type Message =
  | { role: "ai"; text: string }
  | { role: "user"; text: string }
  | { role: "result"; result: DocumentUploadAnalyzeResponse };

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
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: AI_INTRO },
  ]);
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const [pendingFile, setPendingFile] = useState<LocalFile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { pickImage, pickDocument } = useFilePicker();

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, e => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleAttachPress = () => {
    Alert.alert("파일 첨부", "어떤 파일을 첨부하시겠어요?", [
      {
        text: "이미지 선택",
        onPress: async () => {
          const file = await pickImage();
          if (file) setPendingFile(file);
        },
      },
      {
        text: "문서 선택",
        onPress: async () => {
          const file = await pickDocument();
          if (file) setPendingFile(file);
        },
      },
      { text: "취소", style: "cancel" },
    ]);
  };

  const handleAiAnalyze = async () => {
    if (!pendingFile || isAnalyzing) return;
    setIsAnalyzing(true);
    setMessages(prev => [
      ...prev,
      { role: "user", text: `📎 ${pendingFile.name}` },
    ]);
    try {
      const result = await analyzeDocumentUpload(
        { uri: pendingFile.uri, name: pendingFile.name, type: pendingFile.mimeType },
        { filename: pendingFile.name },
      );
      if (result.success && result.draft) {
        setMessages(prev => [...prev, { role: "result", result }]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: "ai",
            text: result.error || "분석에 실패했습니다. 다시 시도해주세요.",
          },
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "ai", text: "오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      ]);
    } finally {
      setIsAnalyzing(false);
      setPendingFile(null);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleSend = async () => {
    const text = message.trim();
    if (!text || loading) return;

    setMessage("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const result = await parseTextToItem(text, planPublicId);
      if (result.success && result.draft) {
        setMessages(prev => [...prev, { role: "result", result }]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: "ai",
            text: result.error || "분석에 실패했습니다. 다시 시도해주세요.",
          },
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "ai", text: "오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleSaved = () => {
    setMessages(prev => [
      ...prev,
      { role: "ai", text: "✅ 저장됐어요! 다른 일정도 추가해드릴까요?" },
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
      <View
        style={[
          styles.shell,
          {
            paddingBottom:
              keyboardHeight > 0 ? keyboardHeight : Math.max(insets.bottom, 12),
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.headerTitle}>AI 일정 추가</Text>
            <Text style={styles.subtitle}>
              대화를 간편하게 일정을 등록하세요.
            </Text>
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
            if (msg.role === "result") {
              return (
                <AiResultCard
                  key={idx}
                  result={msg.result}
                  planId={planId}
                  onSaved={handleSaved}
                />
              );
            }
            if (msg.role === "ai") {
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
          {(loading || isAnalyzing) && (
            <View style={styles.aiBubble}>
              <ActivityIndicator size="small" color={colors.white} />
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerDivider} />

          {pendingFile && (
            <View style={styles.pendingFileRow}>
              <View style={styles.pendingFileChip}>
                <Text style={styles.pendingFileName} numberOfLines={1}>
                  📎 {pendingFile.name}
                </Text>
                <Pressable
                  onPress={() => setPendingFile(null)}
                  hitSlop={8}
                  style={styles.pendingFileRemove}
                >
                  <CloseIcon width={12} height={12} color={colors.gray600} />
                </Pressable>
              </View>
              <Pressable
                onPress={handleAiAnalyze}
                disabled={isAnalyzing}
                style={styles.analyzeButtonWrap}
              >
                <LinearGradient
                  colors={[...colors.gradientAIColors] as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.analyzeButton}
                >
                  {isAnalyzing ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.analyzeButtonText}>AI로 분석</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          )}

          <View style={styles.inputField}>
            <Pressable
              style={styles.attachButton}
              onPress={handleAttachPress}
              disabled={loading || isAnalyzing}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="파일 첨부"
            >
              <AttachClipIcon
                width={22}
                height={22}
                color={colors.gray500}
                style={{ transform: [{ rotate: "45deg" }] }}
              />
            </Pressable>
            <Input
              containerStyle={styles.inputContainer}
              style={[
                styles.inputText,
                Platform.OS === "android" && styles.inputTextAndroid,
                Platform.OS === "ios" && styles.inputTextIOS,
              ]}
              variant="filled"
              placeholder="일정을 입력해주세요..."
              placeholderTextColor={colors.gray600}
              value={message}
              onChangeText={setMessage}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              multiline={false}
              editable={!loading && !isAnalyzing}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendInside,
                pressed && styles.sendInsidePressed,
                (loading || isAnalyzing || !message.trim()) &&
                  styles.sendInsideDisabled,
              ]}
              onPress={handleSend}
              disabled={loading || isAnalyzing || !message.trim()}
              accessibilityRole="button"
              accessibilityLabel="전송"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
            >
              <View
                style={[
                  styles.sendIconWrap,
                  (loading || isAnalyzing || !message.trim()) &&
                    styles.sendIconWrapDisabled,
                ]}
              >
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
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
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
    alignItems: "center",
    justifyContent: "center",
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
    alignSelf: "flex-start",
    maxWidth: "83%",
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
    alignSelf: "flex-end",
    maxWidth: "83%",
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
  pendingFileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  pendingFileChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray200,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: 6,
    minWidth: 0,
  },
  pendingFileName: {
    ...textStyles.body4,
    color: colors.gray700,
    flex: 1,
  },
  pendingFileRemove: {
    flexShrink: 0,
  },
  analyzeButtonWrap: {
    flexShrink: 0,
  },
  analyzeButton: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  analyzeButtonText: {
    ...textStyles.body4,
    color: colors.white,
    fontFamily: typography.fontFamily.pretendardSemiBold,
  },
  inputField: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: colors.gray200,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    gap: spacing.sm,
  },
  attachButton: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  inputContainer: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
  },
  inputText: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 0,
    paddingRight: spacing.sm,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
    fontFamily: typography.fontFamily.pretendardRegular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.black,
  },
  inputTextAndroid: {
    includeFontPadding: true,
    textAlignVertical: "center",
    paddingTop: 9,
    paddingBottom: 9,
  },
  inputTextIOS: {
    paddingTop: 6,
    paddingBottom: 12,
  },
  sendInside: {
    justifyContent: "center",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  sendIconWrapDisabled: {
    backgroundColor: colors.gray400,
  },
});
