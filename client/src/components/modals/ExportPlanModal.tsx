import { plansApi } from "@/services/plans";
import Card from "@/ui/components/Card";
import { colors } from "@/ui/tokens/colors";
import { textStyles } from "@/ui/tokens/typography";
import { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import CopyIcon from "../../../assets/copy.svg";
import ExportGuestIcon from "../../../assets/export_guest.svg";
import ExportImportIcon from "../../../assets/export_import.svg";
import ExportLinkIcon from "../../../assets/export_link.svg";
import ExportLockIcon from "../../../assets/export_lock.svg";
import XIcon from "../../../assets/x.svg";

type Props = {
  visible: boolean;
  onClose: () => void;
  planId: number;
  planName: string;
};

function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={[styles.toggle, value && styles.toggleOn]}>
      <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
    </Pressable>
  );
}

export default function ExportPlanModal({ visible, onClose, planId, planName }: Props) {
  const [includeExpenses, setIncludeExpenses] = useState(false);
  const [includeChecklist, setIncludeChecklist] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportPublicId, setExportPublicId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const viewerUrl =
    exportPublicId && typeof window !== "undefined"
      ? `${window.location.origin}/trip/${exportPublicId}`
      : null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setExportPublicId(null);
    try {
      const result = await plansApi.createExport(planId, {
        includeExpenses,
        includeChecklist,
      });
      setExportPublicId(result.publicId);
    } catch {
      Alert.alert("오류", "내보내기 링크 생성에 실패했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!viewerUrl) return;
    if (Platform.OS === "web") {
      await navigator.clipboard.writeText(viewerUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setExportPublicId(null);
    setIncludeExpenses(false);
    setIncludeChecklist(false);
    setCopied(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Card
          width="100%"
          maxWidth={468}
          borderRadius={20}
          shadow={{
            shadowColor: colors.black,
            shadowOffset: { width: 0, height: 24 },
            shadowOpacity: 0.12,
            shadowRadius: 48,
            elevation: 12,
          }}
          style={styles.cardStyle}
        >
          <Pressable onPress={() => {}}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
            >
              {/* 헤더 */}
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <Text style={styles.title}>여행 일정 내보내기</Text>
                  <Text style={styles.subtitle}>
                    여행 일정을 누구나 열람할 수 있는 링크로 내보냅니다
                  </Text>
                </View>
                <Pressable onPress={handleClose} hitSlop={8} style={styles.closeButton}>
                  <XIcon width={16} height={16} color={colors.gray900} />
                </Pressable>
              </View>

              {/* 설명 카드 */}
              <View style={styles.infoCard}>
                <View style={styles.infoItem}>
                  <View style={styles.infoIconBox}>
                    <ExportLinkIcon width={18} height={18} color={colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoTitle}>공개 링크 발급</Text>
                    <Text style={styles.infoDesc}>
                      '{planName}' 일정을 담은 열람용 URL을 생성합니다
                    </Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <View style={styles.infoIconBox}>
                    <ExportGuestIcon width={18} height={18} color={colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoTitle}>게스트로 누구나 열람</Text>
                    <Text style={styles.infoDesc}>
                      링크를 받은 사람은 로그인 없이 게스트로 일정을 볼 수 있어요
                    </Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <View style={styles.infoIconBox}>
                    <ExportImportIcon width={18} height={18} color={colors.primary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoTitle}>보거나 내 일정으로 가져오기</Text>
                    <Text style={styles.infoDesc}>{"열람만 해도 되고, 로그인을 하면 내 여행일정으로 가져와서 자유롭게\n수정 및 저장할 수 있어요"}</Text>
                  </View>
                </View>
              </View>

              {/* 공개 범위 카드 */}
              <View style={styles.scopeCard}>
                <View style={styles.scopeHeader}>
                  <Text style={styles.scopeTitle}>공개 범위</Text>
                  <Text style={styles.scopeHint}>게스트에게 보여줄 내용을 선택하세요</Text>
                </View>

                {/* 항상 포함 */}
                <View style={styles.scopeFixed}>
                  <View style={styles.scopeFixedIcon}>
                    <ExportLockIcon width={16} height={16} color={colors.gray700} />
                  </View>
                  <View style={styles.scopeFixedContent}>
                    <Text style={styles.scopeItemTitle}>여행 일정 · 항공 · 숙박</Text>
                    <Text style={styles.scopeItemDesc}>
                      {"기본 정보는 항상 공유되고,\n예약번호·요금·메모·첨부파일은 제외됩니다"}
                    </Text>
                  </View>
                  <View style={styles.alwaysBadge}>
                    <Text style={styles.alwaysBadgeText}>항상 포함</Text>
                  </View>
                </View>

                {/* 비용 토글 */}
                <Pressable
                  style={[styles.scopeToggleRow, includeExpenses && styles.scopeToggleRowOn]}
                  onPress={() => setIncludeExpenses(v => !v)}
                >
                  <View style={styles.scopeToggleContent}>
                    <Text style={styles.scopeItemTitle}>비용</Text>
                    <Text style={styles.infoDesc}>
                      총 비용과 카테고리별·항목별 내역을 게스트가 볼 수 있어요
                    </Text>
                  </View>
                  <Toggle
                    value={includeExpenses}
                    onToggle={() => setIncludeExpenses(v => !v)}
                  />
                </Pressable>

                {/* 체크리스트 토글 */}
                <Pressable
                  style={[styles.scopeToggleRow, includeChecklist && styles.scopeToggleRowOn]}
                  onPress={() => setIncludeChecklist(v => !v)}
                >
                  <View style={styles.scopeToggleContent}>
                    <Text style={styles.scopeItemTitle}>체크리스트</Text>
                    <Text style={styles.infoDesc}>
                      준비물 체크리스트와 준비 현황을 게스트가 볼 수 있어요
                    </Text>
                  </View>
                  <Toggle
                    value={includeChecklist}
                    onToggle={() => setIncludeChecklist(v => !v)}
                  />
                </Pressable>
              </View>

              {/* URL 결과 영역 */}
              {viewerUrl && (
                <View style={styles.resultRow}>
                  <TextInput
                    style={styles.urlInput}
                    value={viewerUrl}
                    editable={false}
                    selectTextOnFocus
                  />
                  <Pressable onPress={handleCopy} style={styles.copyButton}>
                    <CopyIcon width={14} height={14} color={colors.gray700} />
                    <Text style={styles.copyText}>{copied ? "복사됨" : "복사"}</Text>
                  </Pressable>
                </View>
              )}

              {/* 생성 버튼 */}
              <Pressable
                onPress={handleGenerate}
                disabled={isGenerating}
                style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
              >
                <Text style={styles.generateButtonText}>
                  {isGenerating ? "생성 중..." : viewerUrl ? "URL 재생성" : "내보내기 URL 생성"}
                </Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Card>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  cardStyle: {
    alignItems: "stretch",
    maxHeight: "90%",
    overflow: "hidden",
  },
  scroll: {
    padding: 24,
    paddingBottom: 20,
    gap: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...textStyles.h4,
    color: colors.gray900,
  },
  subtitle: {
    ...textStyles.body4,
    color: colors.gray700,
    marginTop: 6,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  infoCard: {
    backgroundColor: colors.gray200,
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EAF1FE",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  infoDesc: {
    ...textStyles.body5,
    color: colors.gray600,
    marginTop: 2,
  },
  scopeCard: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  scopeHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  scopeTitle: {
    ...textStyles.h6,
    color: colors.gray900,
  },
  scopeHint: {
    ...textStyles.body5,
    color: colors.gray500,
  },
  scopeFixed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.gray100,
    borderRadius: 10,
    padding: 12,
  },
  scopeFixedIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  scopeFixedContent: {
    flex: 1,
    minWidth: 0,
  },
  scopeItemTitle: {
    ...textStyles.h7,
    color: colors.gray900,
  },
  scopeItemDesc: {
    ...textStyles.body5,
    color: colors.gray500,
    marginTop: 2,
  },
  alwaysBadge: {
    backgroundColor: colors.gray300,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  alwaysBadgeText: {
    ...textStyles.h9,
    color: colors.gray700,
  },
  scopeToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.white,
  },
  scopeToggleRowOn: {
    borderColor: colors.primary,
  },
  scopeToggleContent: {
    flex: 1,
    minWidth: 0,
  },
  toggle: {
    width: 40,
    height: 24,
    borderRadius: 999,
    backgroundColor: colors.gray400,
    justifyContent: "center",
    flexShrink: 0,
    padding: 3,
  },
  toggleOn: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    alignSelf: "flex-start",
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    backgroundColor: colors.gray100,
  },
  urlInput: {
    flex: 1,
    ...textStyles.body5,
    color: colors.gray800,
    minWidth: 0,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.gray200,
    flexShrink: 0,
  },
  copyText: {
    ...textStyles.h8,
    color: colors.gray700,
  },
  generateButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.gray900,
    alignItems: "center",
    justifyContent: "center",
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    ...textStyles.h6,
    color: colors.white,
  },
});
