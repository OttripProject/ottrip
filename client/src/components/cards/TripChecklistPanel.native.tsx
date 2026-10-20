import { useMe } from "@/hooks/useMe";
import api from "@/services/api";
import type { Itinerary } from "@/types/api";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles, typography } from "@/ui/tokens/typography";
import { guestPrompt, handleGuestPromptError } from "@/utils/guestPrompt";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import CheckMarkIcon from "../../../assets/check_mark.svg";
import PlusIcon from "../../../assets/mobile_plus.svg";
import RefreshIcon from "../../../assets/refresh_ai.svg";

const AI_GRADIENT = `linear-gradient(135deg, ${colors.aiGrad[0]} 0%, ${colors.aiGrad[1]} 100%)`;

const GROUPS = [
  { key: "basic_required", camelKey: "basicRequired", title: "꼭 챙겨야 해요" },
  {
    key: "schedule_required",
    camelKey: "scheduleRequired",
    title: "이번 일정에 필요해요",
  },
  { key: "recommended", camelKey: "recommended", title: "있으면 더 좋아요" },
  { key: "optional", camelKey: "optional", title: "선택이에요" },
] as const;

type GroupKey = (typeof GROUPS)[number]["key"];

type RawChecklistItem = {
  id?: number;
  name?: string;
  reason?: string;
  is_checked?: boolean;
  isChecked?: boolean;
  is_custom?: boolean;
  isCustom?: boolean;
};

type ChecklistRow = {
  id: number;
  name: string;
  reason: string;
  isChecked: boolean;
  isCustom: boolean;
};

type ChecklistData = {
  categories?: Record<string, RawChecklistItem[] | undefined>;
} | null;

interface TripChecklistPanelProps {
  planPublicId: string | undefined;
  itineraries?: Itinerary[];
}

export default function TripChecklistPanel({
  planPublicId,
  itineraries = [],
}: TripChecklistPanelProps) {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [addingGroup, setAddingGroup] = useState<GroupKey | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const togglingItems = useRef<Set<number>>(new Set());
  const deletingItems = useRef<Set<number>>(new Set());

  const { data: checklist, refetch } = useQuery<ChecklistData>({
    queryKey: ["checklist", planPublicId],
    queryFn: async () => {
      if (!planPublicId) return null;
      try {
        const response = await api.get(`/private/ai/checklist/${planPublicId}`);
        return response.data;
      } catch (error) {
        const status = (error as { response?: { status?: number } }).response
          ?.status;
        if (status === 404 || status === 403) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!planPublicId,
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const groups = useMemo(
    () =>
      GROUPS.map(group => {
        const raw =
          checklist?.categories?.[group.camelKey] ??
          checklist?.categories?.[group.key] ??
          [];
        const items: ChecklistRow[] = raw
          .filter(item => !!item && typeof item === "object")
          .map(item => ({
            id: item.id ?? 0,
            name: item.name ?? "",
            reason: item.reason ?? "",
            isChecked: item.is_checked ?? item.isChecked ?? false,
            isCustom: item.is_custom ?? item.isCustom ?? false,
          }));
        return { ...group, items };
      }),
    [checklist],
  );

  const total = groups.reduce((acc, g) => acc + g.items.length, 0);
  const done = groups.reduce(
    (acc, g) => acc + g.items.filter(item => item.isChecked).length,
    0,
  );
  const progress = total > 0 ? (done / total) * 100 : 0;

  const handleToggle = async (itemId: number, isChecked: boolean) => {
    if (!planPublicId || togglingItems.current.has(itemId)) return;
    togglingItems.current.add(itemId);
    const previousData = queryClient.getQueryData(["checklist", planPublicId]);
    queryClient.setQueryData<ChecklistData>(
      ["checklist", planPublicId],
      old => {
        if (!old?.categories) return old;
        const categories = { ...old.categories };
        for (const key of Object.keys(categories)) {
          const items = categories[key];
          if (Array.isArray(items)) {
            categories[key] = items.map(item =>
              item.id === itemId
                ? { ...item, is_checked: isChecked, isChecked }
                : item,
            );
          }
        }
        return { ...old, categories };
      },
    );
    try {
      await api.patch(`/private/ai/checklist/${planPublicId}/item/${itemId}`, {
        is_checked: isChecked,
      });
    } catch (error) {
      queryClient.setQueryData(["checklist", planPublicId], previousData);
      if (handleGuestPromptError(error)) return;
      Alert.alert("알림", "체크리스트 항목 업데이트에 실패했습니다");
    } finally {
      togglingItems.current.delete(itemId);
    }
  };

  const deleteItem = async (itemId: number) => {
    if (!planPublicId || deletingItems.current.has(itemId)) return;
    deletingItems.current.add(itemId);
    try {
      await api.delete(`/private/ai/checklist/${planPublicId}/item/${itemId}`);
      await refetch();
    } catch (error) {
      if (handleGuestPromptError(error)) return;
      Alert.alert("알림", "체크리스트 항목 삭제에 실패했습니다");
    } finally {
      deletingItems.current.delete(itemId);
    }
  };

  const handleLongPress = (item: ChecklistRow) => {
    Alert.alert("항목 삭제", `'${item.name}' 항목을 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => deleteItem(item.id),
      },
    ]);
  };

  const handleAddPress = (key: GroupKey) => {
    setNewItemName("");
    setAddingGroup(prev => (prev === key ? null : key));
  };

  const handleSave = async () => {
    const name = newItemName.trim();
    if (!name || !planPublicId || !addingGroup) return;
    setIsSaving(true);
    try {
      await api.post(`/private/ai/checklist/${planPublicId}/item`, {
        name,
        reason: "",
        category: addingGroup,
      });
      setNewItemName("");
      setAddingGroup(null);
      await refetch();
    } catch (error) {
      if (handleGuestPromptError(error)) return;
      Alert.alert("알림", "체크리스트 항목 추가에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiRecommend = async () => {
    if (me?.isGuest) {
      guestPrompt.show();
      return;
    }
    if (!planPublicId) return;
    const activeItineraries = itineraries.filter(
      (it: Itinerary & { is_deleted?: boolean }) => !it.is_deleted,
    );
    if (activeItineraries.length < 2) {
      Alert.alert(
        "알림",
        "체크리스트 생성을 위해서는 최소 2개 이상의 세부 일정이 필요합니다",
      );
      return;
    }
    setAiLoading(true);
    try {
      await api.post(`/private/ai/checklist/${planPublicId}/generate`, {
        force_regenerate: true,
      });
      await refetch();
    } catch (error) {
      if (handleGuestPromptError(error)) return;
      Alert.alert("알림", "AI 체크리스트 생성에 실패했습니다");
    } finally {
      setAiLoading(false);
    }
  };

  if (!planPublicId) return null;

  const canSave = !!newItemName.trim() && !isSaving;

  return (
    <View style={styles.container}>
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>
            준비 {done}/{total}
          </Text>
          <Text style={styles.progressRemain}>남은 항목 {total - done}개</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {total === 0 ? (
        <View style={styles.emptyCard}>
          <PlusIcon width={24} height={24} color={colors.gray600} />
          <Text style={styles.emptyTitle}>아직 체크리스트가 없어요</Text>
          <Text style={styles.emptyDesc}>
            일정과 목적지를 Bella가 살펴보고{"\n"}준비물을 추천해 드려요.
          </Text>
        </View>
      ) : (
        groups.map(group => {
          const groupDone = group.items.filter(item => item.isChecked).length;
          return (
            <View key={group.key} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                <Text style={styles.groupCount}>
                  {groupDone}/{group.items.length}
                </Text>
                <Pressable
                  style={styles.groupAddButton}
                  onPress={() => handleAddPress(group.key)}
                  accessibilityLabel="항목 추가"
                >
                  <PlusIcon width={16} height={16} color={colors.gray900} />
                </Pressable>
              </View>
              {group.items.map((item, index) => (
                <Pressable
                  key={item.id}
                  style={[styles.itemRow, index > 0 && styles.itemRowDivider]}
                  onPress={() => handleToggle(item.id, !item.isChecked)}
                  onLongPress={() => handleLongPress(item)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      item.isChecked && styles.checkboxChecked,
                    ]}
                  >
                    {item.isChecked && (
                      <CheckMarkIcon
                        width={12}
                        height={12}
                        color={colors.white}
                      />
                    )}
                  </View>
                  {!item.isCustom && (
                    <View style={styles.aiBadge}>
                      <Text style={styles.aiBadgeText}>AI</Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.itemName,
                      item.isChecked && styles.itemNameChecked,
                    ]}
                  >
                    {item.name}
                    {!!item.reason && (
                      <Text
                        style={[
                          styles.itemReason,
                          item.isChecked && styles.itemReasonChecked,
                        ]}
                      >
                        {" "}
                        · {item.reason}
                      </Text>
                    )}
                  </Text>
                </Pressable>
              ))}
              {addingGroup === group.key && (
                <View
                  style={[
                    styles.addRow,
                    group.items.length > 0 && styles.itemRowDivider,
                  ]}
                >
                  <TextInput
                    style={styles.addInput}
                    placeholder="항목 입력"
                    placeholderTextColor={colors.paletteFg3}
                    value={newItemName}
                    onChangeText={setNewItemName}
                    maxLength={16}
                    autoFocus
                    editable={!isSaving}
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                  />
                  <Pressable
                    style={[
                      styles.saveButton,
                      !canSave && styles.saveButtonDisabled,
                    ]}
                    onPress={handleSave}
                    disabled={!canSave}
                  >
                    <Text
                      style={[
                        styles.saveButtonText,
                        !canSave && styles.saveButtonTextDisabled,
                      ]}
                    >
                      저장
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })
      )}

      <Pressable
        style={({ pressed }) => [
          styles.aiButton,
          (pressed || aiLoading) && styles.aiButtonDimmed,
        ]}
        onPress={handleAiRecommend}
        disabled={aiLoading}
      >
        <RefreshIcon width={16} height={16} color={colors.white} />
        <Text style={styles.aiButtonText}>
          {aiLoading ? "추천받는 중..." : "AI로 추천받기"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginHorizontal: spacing.sm,
  },
  progressCard: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lgPlus,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  progressTitle: {
    ...textStyles.h6,
    color: colors.paletteInk,
  },
  progressRemain: {
    ...textStyles.body5,
    fontVariant: ["tabular-nums"],
    color: colors.paletteFg2,
  },
  progressTrack: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.paletteFill,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.paletteInk,
  },
  emptyCard: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 40,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lgPlus,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  emptyTitle: {
    ...textStyles.h5,
    color: colors.paletteInk,
  },
  emptyDesc: {
    ...textStyles.body3,
    textAlign: "center",
    color: colors.paletteFg3,
  },
  groupCard: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderRadius: radii.lgPlus,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  groupTitle: {
    ...textStyles.h6,
    fontFamily: typography.fontFamily.pretendardBold,
    color: colors.paletteInk,
  },
  groupCount: {
    ...textStyles.h8,
    marginRight: "auto",
    fontVariant: ["tabular-nums"],
    color: colors.paletteFg3,
  },
  groupAddButton: {
    width: 32,
    height: 32,
    marginRight: -spacing.xs,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
  },
  itemRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radii.xs,
    borderWidth: 1.5,
    borderColor: colors.gray400,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: colors.gray900,
    backgroundColor: colors.paletteInk,
  },
  aiBadge: {
    height: 18,
    paddingHorizontal: 5,
    borderRadius: radii.xs,
    backgroundColor: colors.aiTint,
    justifyContent: "center",
  },
  aiBadgeText: {
    ...textStyles.h9,
    lineHeight: 18,
    fontFamily: typography.fontFamily.pretendardBold,
    color: colors.aiInk,
  },
  itemName: {
    ...textStyles.body3,
    flex: 1,
    minWidth: 0,
    fontFamily: typography.fontFamily.pretendardMedium,
    color: colors.paletteInk,
  },
  itemNameChecked: {
    color: colors.paletteFg3,
    textDecorationLine: "line-through",
  },
  itemReason: {
    fontFamily: typography.fontFamily.pretendardRegular,
    color: colors.paletteFg2,
  },
  itemReasonChecked: {
    color: colors.paletteFg3,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  addInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontFamily.pretendardMedium,
    fontSize: textStyles.body3.fontSize,
    color: colors.paletteInk,
  },
  saveButton: {
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radii.base,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paletteInk,
  },
  saveButtonDisabled: {
    backgroundColor: colors.gray300,
  },
  saveButtonText: {
    ...textStyles.h8,
    color: colors.white,
  },
  saveButtonTextDisabled: {
    color: colors.gray500,
  },
  aiButton: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radii.mdPlus,
    backgroundColor: colors.aiInk,
    experimental_backgroundImage: AI_GRADIENT,
  },
  aiButtonDimmed: {
    opacity: 0.8,
  },
  aiButtonText: {
    ...textStyles.h5,
    fontFamily: typography.fontFamily.pretendardBold,
    color: colors.white,
  },
});
