import { useToast } from "@/contexts/ToastContext";
import { useDiscardConfirm } from "@/hooks/useDiscardConfirm";
import { plansApi } from "@/services/plans";
import BottomSheetModal from "@/ui/components/BottomSheetModal.native";
import FloatingFooter from "@/ui/components/FloatingFooter.native";
import { filledFocusStyle } from "@/ui/components/input/Input";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { toUserMessage } from "@/utils/crossPlatformAlert";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CloseIcon from "../../../../assets/mobile_close.svg";
import ShareIcon from "../../../../assets/share_nodes_outline.svg";

interface SharedMemoModalProps {
  visible: boolean;
  onClose: () => void;
  planId?: number;
  planPublicId?: string;
  memo?: string | null;
}

export default function SharedMemoModal({
  visible,
  onClose,
  planId,
  planPublicId,
  memo,
}: SharedMemoModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [draft, setDraft] = useState(memo ?? "");
  const [focused, setFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const showSub = Keyboard.addListener("keyboardWillShow", e =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener("keyboardWillHide", () =>
      setKeyboardHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const keyboardSpacer = Math.max(
    0,
    keyboardHeight - Math.max(insets.bottom, spacing.sm),
  );

  useEffect(() => {
    if (visible) setDraft(memo ?? "");
  }, [visible, memo]);

  const isDirty = draft.trim() !== (memo ?? "").trim();

  const discardAndClose = () => {
    Keyboard.dismiss();
    setDraft(memo ?? "");
    onClose();
  };

  const { requestClose, discardConfirmModal } = useDiscardConfirm(
    isDirty,
    discardAndClose,
  );

  const handleClose = () => {
    if (isSaving) return;
    Keyboard.dismiss();
    requestClose();
  };

  const handleSave = async () => {
    if (!planId || isSaving) return;
    Keyboard.dismiss();
    setIsSaving(true);
    try {
      await plansApi.setMemo(planId, draft.trim());
      queryClient.invalidateQueries({ queryKey: ["plan", planPublicId] });
      onClose();
      showToast("메모를 저장했어요.");
    } catch (error) {
      Alert.alert("알림", toUserMessage(error, "메모 저장에 실패했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <BottomSheetModal visible={visible} onClose={handleClose} height="auto">
        <View style={styles.container}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>공유 메모</Text>
                <View style={styles.hint}>
                  <ShareIcon width={12} height={12} color={colors.paletteFg3} />
                  <Text style={styles.hintText}>참여 멤버 모두에게 공유돼요</Text>
                </View>
              </View>
              <Pressable
                onPress={handleClose}
                style={styles.closeButton}
                accessibilityLabel="닫기"
              >
                <CloseIcon width={24} height={24} color={colors.gray700} />
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>내용</Text>
              <TextInput
                style={[styles.memoInput, focused && filledFocusStyle]}
                value={draft}
                onChangeText={setDraft}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="함께 보는 메모를 입력하세요."
                placeholderTextColor={colors.paletteFg3}
                multiline
                textAlignVertical="top"
                editable={!isSaving}
              />
            </View>
          </ScrollView>

          <FloatingFooter
            secondaryLabel="취소"
            onSecondaryPress={handleClose}
            primaryLabel="저장"
            onPrimaryPress={handleSave}
            primaryLoading={isSaving}
            primaryDisabled={!isDirty}
          />
          <View style={{ height: keyboardSpacer }} />
        </View>
        {discardConfirmModal}
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    ...textStyles.h2,
    letterSpacing: -0.48,
    color: colors.paletteInk,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  hintText: {
    ...textStyles.body4,
    color: colors.paletteFg2,
  },
  closeButton: {
    width: 44,
    height: 44,
    marginRight: -spacing.sm,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...textStyles.h6,
    color: colors.paletteInk,
  },
  memoInput: {
    ...textStyles.body2,
    color: colors.paletteInk,
    minHeight: 180,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paletteLine,
    borderRadius: radii.mdPlus,
  },
});
