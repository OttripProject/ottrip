import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
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
import WarningCircleIcon from "../../../assets/warning_circle.svg";
import { textStyles } from "@/ui/tokens/typography";

const BLUE_PILL = "#0A84FF";
const BLUE_PILL_BG = "#E5F0FF";
const BTN_CANCEL_BG = "#EDEDED";

function getEntitySubtitle(entityTypeLabel: string): string {
  const t = entityTypeLabel.trim();
  if (t === "항공" || t.includes("항공")) {
    return "항공편 정보가 맞는지 확인 후 저장하세요";
  }
  if (t === "숙박" || t.includes("숙박")) {
    return "숙박 정보가 맞는지 확인 후 저장하세요";
  }
  return "일정 정보가 맞는지 확인 후 저장하세요";
}

function getBluePillText(entityTypeLabel: string): string {
  const t = entityTypeLabel.trim();
  if (t === "항공" || t.includes("항공")) {
    return "AI가 추출한 항공편 정보";
  }
  if (t === "숙박" || t.includes("숙박")) {
    return "AI가 추출한 숙박 정보";
  }
  return "AI가 추출한 일정 정보";
}

function getSubtitleFromKind(kind: AiDocumentItemType): string {
  switch (kind) {
    case "flight":
      return "항공편 정보가 맞는지 확인 후 저장하세요";
    case "accommodation":
      return "숙박 정보가 맞는지 확인 후 저장하세요";
    case "itinerary":
      return "일정 정보가 맞는지 확인 후 저장하세요";
    case "expense":
      return "지출 정보가 맞는지 확인 후 저장하세요";
    default:
      return "항목 정보가 맞는지 확인 후 저장하세요";
  }
}

function getBluePillTextFromKind(kind: AiDocumentItemType): string {
  switch (kind) {
    case "flight":
      return "AI가 추출한 항공편 정보";
    case "accommodation":
      return "AI가 추출한 숙박 정보";
    case "itinerary":
      return "AI가 추출한 일정 정보";
    case "expense":
      return "AI가 추출한 지출 정보";
    default:
      return "AI가 추출한 정보";
  }
}

export interface AiDocumentAnalyzeModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  entityTypeLabel?: string;
  /** 성공한 `analyzeDocumentUpload` 응답. `draft`가 있으면 필드에 반영해 표시합니다. */
  analyzeResult?: DocumentUploadAnalyzeResponse | null;
  /** 저장: 모달에서 편집한 초안을 패널에 반영합니다. */
  onApply?: (draft: AiDocumentItemDraft) => void;
  applyLabel?: string;
}

export default function AiDocumentAnalyzeModal({
  visible,
  onClose,
  title = "분석 결과 확인",
  entityTypeLabel = "일정",
  analyzeResult = null,
  onApply,
  applyLabel = "저장",
}: AiDocumentAnalyzeModalProps) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.min(460, windowWidth - 32);
  const [draftBodyKey, setDraftBodyKey] = useState(0);
  const draftEditorRef = useRef<AiAnalyzeDraftEditorRef>(null);

  useEffect(() => {
    if (visible && analyzeResult?.draft) {
      setDraftBodyKey(k => k + 1);
    }
  }, [visible, analyzeResult]);

  const kind: AiDocumentItemType | null =
    analyzeResult?.inferredItemType ?? analyzeResult?.draft?.itemType ?? null;

  const isPartialRecognition = useMemo(() => {
    if (!analyzeResult?.draft?.payload) return false;
    const { values, fieldMeta } = analyzeResult.draft.payload;
    const hasUncertain = Object.values(fieldMeta).some(m => m.certainty !== "high");
    const hasEmptyValues = Object.values(values).some(
      v => v === null || v === undefined || v === "",
    );
    return hasUncertain || hasEmptyValues;
  }, [analyzeResult]);

  const subtitle =
    kind != null
      ? getSubtitleFromKind(kind)
      : getEntitySubtitle(entityTypeLabel);
  const bluePillText =
    kind != null
      ? getBluePillTextFromKind(kind)
      : getBluePillText(entityTypeLabel);

  const handleApply = () => {
    if (analyzeResult?.draft) {
      const next = draftEditorRef.current?.buildDraft();
      if (next) {
        onApply?.(next);
      }
    }
    onClose();
  };

  const body = analyzeResult?.draft ? (
    <View key={draftBodyKey} style={styles.childrenWrap}>
      <View style={styles.pillBlue}>
        <View style={styles.pillDotBlue} />
        <Text style={styles.pillBlueText}>{bluePillText}</Text>
      </View>
      {isPartialRecognition && (
        <View style={styles.partialBanner}>
          <WarningCircleIcon width={14} height={14} style={styles.partialBannerIcon} />
          <Text style={styles.partialBannerText}>
            일부 항목만 인식했어요. 비어 있는 칸을 확인해 직접 채워 주세요.
          </Text>
        </View>
      )}
      <View style={styles.fieldStack}>
        <AiAnalyzeResultBody
          key={draftBodyKey}
          ref={draftEditorRef}
          draft={analyzeResult.draft}
        />
      </View>
    </View>
  ) : analyzeResult && analyzeResult.draft == null ? (
    <Text style={styles.emptyDraftHint}>
      분석은 완료됐지만 표시할 초안 데이터가 없습니다.
    </Text>
  ) : visible ? (
    <Text style={styles.emptyDraftHint}>
      분석은 완료된 것으로 보이나, 결과 화면에 데이터가 전달되지 않았습니다.
      창을 닫은 뒤 새로고침하고 다시 시도해 주세요.
    </Text>
  ) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.card, { width: cardWidth }]}
          onPress={e => e.stopPropagation?.()}
        >
          <View style={styles.cardInner}>
            <View style={styles.headerRow}>
              <View style={styles.headerTextBlock}>
                <Text style={styles.modalTitle}>{title}</Text>
                <Text style={styles.modalSubtitle}>{subtitle}</Text>
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
                <Text style={styles.closeGlyph}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {body}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.footerBtn,
                  styles.footerBtnCancel,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.footerBtnCancelText}>취소</Text>
              </Pressable>
              <Pressable
                onPress={handleApply}
                style={({ pressed }) => [
                  styles.footerBtn,
                  styles.footerBtnSave,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.footerBtnSaveText}>{applyLabel}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  card: {
    maxWidth: "100%",
    maxHeight: "90%",
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: "visible",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 24,
  },
  cardInner: {
    paddingTop: 20,
    paddingHorizontal: 22,
    paddingBottom: 18,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  modalTitle: {
    margin: 0,
    ...textStyles.h6,
    color: colors.gray900,
  },
  modalSubtitle: {
    marginTop: 4,
    ...textStyles.body5,
    color: colors.gray600,
  },
  closeButton: {
    width: 24,
    height: 24,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  closeGlyph: {
    ...textStyles.h8,
    color: colors.gray900,
  },
  pressed: {
    opacity: 0.75,
  },
  scroll: {
    maxHeight: 480,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  childrenWrap: {
    gap: 12,
  },
  emptyDraftHint: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  pillBlue: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: BLUE_PILL_BG,
  },
  pillDotBlue: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: BLUE_PILL,
  },
  pillBlueText: {
    ...textStyles.h9,
    color: BLUE_PILL,
  },
  fieldStack: {
    flexDirection: "column",
    gap: 8,
  },
  partialBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: "rgb(255, 248, 232)",
    borderWidth: 1,
    borderColor: "rgb(242, 223, 168)",
  },
  partialBannerIcon: {
    flexShrink: 0,
    marginTop: 1,
  },
  partialBannerText: {
    flex: 1,
    ...textStyles.body6,
    color: "rgb(122, 84, 8)",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 4,
  },
  footerBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  footerBtnCancel: {
    backgroundColor: BTN_CANCEL_BG,
  },
  footerBtnCancelText: {
    ...textStyles.body5,
    color: colors.gray900,
  },
  footerBtnSave: {
    backgroundColor: colors.gray900,
  },
  footerBtnSaveText: {
    ...textStyles.body5,
    color: colors.white,
  },
});
