import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  type AiAnalyzeDraftEditorRef,
  AiAnalyzeResultBody,
} from "@/components/modals/aiDocumentAnalyzeDraftBody";
import type {
  AiDocumentItemDraft,
  AiDocumentItemType,
  DocumentUploadAnalyzeResponse,
} from "@/types/api";
import { colors } from "@/ui/tokens/colors";
import { spacing } from "@/ui/tokens/spacing";
import CheckWhiteIcon from "../../../assets/check_white.svg";
import CloseErrorIcon from "../../../assets/close_error.svg";
import { AiAnalyzeResultContent, getHeaderSubtitle } from "./AiDocumentAnalyzeModal";

const HEADER_GRADIENT = ["#EDE9FF", "#E3EDFF"] as const;
const CLOSE_PURPLE = "#9D8FFF";

interface AiDocumentAnalyzeModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  entityTypeLabel?: string;
  originEntityType?: string;
  analyzeResult?: DocumentUploadAnalyzeResponse | null;
  analyzeFileName?: string;
  onApply?: (draft: AiDocumentItemDraft) => void;
  applyLabel?: string;
}

export default function AiDocumentAnalyzeModal({
  visible,
  onClose,
  title = "분석 결과를 확인하세요",
  entityTypeLabel = "일정",
  originEntityType,
  analyzeResult = null,
  analyzeFileName,
  onApply,
  applyLabel,
}: AiDocumentAnalyzeModalProps) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.min(460, windowWidth - 32);
  const [draftBodyKey, setDraftBodyKey] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const draftEditorRef = useRef<AiAnalyzeDraftEditorRef>(null);

  useEffect(() => {
    if (visible && analyzeResult?.draft) {
      setDraftBodyKey(k => k + 1);
      setIsEditMode(false);
    }
  }, [visible, analyzeResult]);

  const kind: AiDocumentItemType | null =
    analyzeResult?.inferredItemType ?? analyzeResult?.draft?.itemType ?? null;

  const headerSubtitle = getHeaderSubtitle(kind, entityTypeLabel);

  const handleApply = () => {
    if (isEditMode) {
      const next = draftEditorRef.current?.buildDraft();
      if (next) onApply?.(next);
    } else {
      if (analyzeResult?.draft) onApply?.(analyzeResult.draft);
    }
    onClose();
  };

  const hasDraft = !!analyzeResult?.draft;

  if (!visible) return null;

  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable
        style={[styles.card, { width: cardWidth }]}
        onPress={e => e.stopPropagation?.()}
      >
        <LinearGradient
          colors={[...HEADER_GRADIENT] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <LinearGradient
            colors={[...colors.aiGrad] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerAiBadge}
          >
            <CheckWhiteIcon width={18} height={18} />
          </LinearGradient>
          <View style={styles.headerTextBlock}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.modalSubtitle}>{headerSubtitle}</Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
            accessibilityLabel="닫기"
          >
            <CloseErrorIcon width={13} height={13} color={CLOSE_PURPLE} />
          </Pressable>
        </LinearGradient>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {hasDraft && isEditMode ? (
            <AiAnalyzeResultBody
              key={draftBodyKey}
              ref={draftEditorRef}
              draft={analyzeResult!.draft!}
            />
          ) : (
            <AiAnalyzeResultContent
              analyzeResult={
                analyzeResult ?? {
                  success: false,
                  inferredItemType: null,
                  draft: null,
                  error: null,
                }
              }
              analyzeFileName={analyzeFileName}
              originEntityType={originEntityType}
            />
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={
              isEditMode
                ? () => setIsEditMode(false)
                : () => setIsEditMode(true)
            }
            style={({ pressed }) => [
              styles.footerBtn,
              styles.footerBtnLeft,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.footerBtnLeftText}>
              {isEditMode ? "취소" : "직접 수정"}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleApply}
            style={({ pressed }) => [
              styles.footerBtn,
              styles.footerBtnRight,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.footerBtnRightText}>
              {isEditMode ? "저장" : (applyLabel ?? "이대로 추가")}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
    zIndex: 9999,
  },
  card: {
    maxWidth: "100%",
    maxHeight: "90%",
    backgroundColor: colors.white,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 24,
  },
  header: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerAiBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
    shadowColor: colors.aiInk,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  modalTitle: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 16,
    lineHeight: 24,
    color: colors.gray900,
  },
  modalSubtitle: {
    fontFamily: "Pretendard-Regular",
    fontSize: 13,
    lineHeight: 20,
    color: colors.aiInk,
    marginTop: 2,
  },
  closeButton: {
    width: 22,
    height: 22,
    marginTop: 5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.75,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  footer: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footerBtnLeft: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.gray200,
  },
  footerBtnLeftText: {
    fontFamily: "Pretendard-Regular",
    fontSize: 15,
    color: colors.gray600,
  },
  footerBtnRight: {},
  footerBtnRightText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 15,
    color: colors.aiInk,
  },
});
