import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TravelChecklistItem, Itinerary } from '@/types/api';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import api from '@/services/api';
import GradientBackground from '@/ui/components/GradientBackground';
import ChecklistIcon from '../../../assets/mobile_check.svg';
import LightningIcon from '../../../assets/mobile_lightning.svg';
import CheckIcon from '../../../assets/gender_check.svg';
import CloseIcon from '../../../assets/mobile_close.svg';


export type WeeklyChecklistCardProps = {
  planPublicId: string | undefined;
  mode?: 'weekly' | 'full';
  selectedDate?: dayjs.Dayjs;
  planStartDate?: string;
  itineraries?: Itinerary[];
  titleOverride?: string;
};

export default function WeeklyChecklistCard({
  planPublicId,
  mode = 'weekly',
  selectedDate = dayjs(),
  planStartDate,
  itineraries = [],
  titleOverride,
}: WeeklyChecklistCardProps) {
  const queryClient = useQueryClient();
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [addingChecklistItem, setAddingChecklistItem] = useState(false);
  const [aiRecommendLoading, setAiRecommendLoading] = useState(false);
  const togglingItems = useRef<Set<number>>(new Set());
  const deletingItems = useRef<Set<number>>(new Set());

  const selectedDateStr = selectedDate.format('YYYY-MM-DD');
  const dateForApi = mode === 'full' ? (planStartDate || dayjs().format('YYYY-MM-DD')) : selectedDateStr;

  const { data: checklistData, refetch: refetchChecklist } = useQuery({
    queryKey: ['checklist', planPublicId],
    queryFn: async () => {
      if (!planPublicId) return null;
      try {
        const response = await api.get(`/private/ai/checklist/${planPublicId}`);
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!planPublicId,
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const checklist = useMemo(() => checklistData || null, [checklistData]);

  const hasChecklist = useMemo(() => {
    if (!checklist?.categories) return false;
    return Object.values(checklist.categories).some((category: any) =>
      Array.isArray(category) && category.length > 0
    );
  }, [checklist]);

  const checklistItems = useMemo(() => {
    if (!checklist?.categories) return [];
    const items: TravelChecklistItem[] = [];
    const categories = checklist.categories;
    if (!categories || typeof categories !== 'object') return [];
    Object.entries(categories).forEach(([_, category]: [string, any]) => {
      if (Array.isArray(category)) {
        category.forEach((item: any) => {
          if (!item || typeof item !== 'object') return;
          const itemDate = item.date;
          const isCustom = item.is_custom ?? item.isCustom ?? false;
          const isChecked = item.is_checked ?? item.isChecked ?? false;
          const include = mode === 'full' ? true : itemDate === selectedDateStr;
          if (include) {
            items.push({
              id: item.id || 0,
              name: item.name || '',
              reason: item.reason || '',
              is_checked: isChecked,
              is_custom: isCustom,
              date: item.date,
            });
          }
        });
      }
    });
    return items;
  }, [checklist, selectedDateStr, mode]);

  const dateChecklistItems = checklistItems;

  const handleAddChecklistItem = async () => {
    const name = newChecklistItem.trim();
    if (!name || !planPublicId) {
      if (!planPublicId) Alert.alert('알림', '여행을 선택해주세요.');
      return;
    }
    setAddingChecklistItem(true);
    try {
      await api.post(`/private/ai/checklist/${planPublicId}/item`, {
        name,
        reason: '',
        category: 'basic_required',
        date: dateForApi,
      });
      setNewChecklistItem('');
      refetchChecklist();
    } catch {
      Alert.alert('오류', '체크리스트 항목 추가에 실패했습니다.');
    } finally {
      setAddingChecklistItem(false);
    }
  };

  const handleToggleChecklistItem = async (itemId: number, isChecked: boolean) => {
    if (!planPublicId) return;
    if (togglingItems.current.has(itemId)) return;
    togglingItems.current.add(itemId);
    const previousData = queryClient.getQueryData(['checklist', planPublicId]);
    queryClient.setQueryData(['checklist', planPublicId], (old: any) => {
      if (!old?.categories) return old;
      const updated = { ...old };
      const categories = { ...updated.categories };
      Object.keys(categories).forEach((categoryKey) => {
        const items = categories[categoryKey];
        if (Array.isArray(items)) {
          categories[categoryKey] = items.map((item: any) =>
            item.id === itemId ? { ...item, is_checked: isChecked } : item
          );
        }
      });
      return { ...updated, categories };
    });
    try {
      await api.patch(`/private/ai/checklist/${planPublicId}/item/${itemId}`, {
        is_checked: isChecked,
      });
    } catch {
      queryClient.setQueryData(['checklist', planPublicId], previousData);
      Alert.alert('오류', '체크리스트 항목 업데이트에 실패했습니다.');
    } finally {
      togglingItems.current.delete(itemId);
    }
  };

  const handleDeleteChecklistItem = async (itemId: number) => {
    if (!planPublicId) return;
    if (deletingItems.current.has(itemId)) return;
    deletingItems.current.add(itemId);
    try {
      await api.delete(`/private/ai/checklist/${planPublicId}/item/${itemId}`);
      refetchChecklist();
    } catch {
      Alert.alert('오류', '체크리스트 항목 삭제에 실패했습니다.');
    } finally {
      deletingItems.current.delete(itemId);
    }
  };

  const handleAiRecommendChecklist = async () => {
    if (!planPublicId) {
      Alert.alert('알림', '여행을 선택해주세요.');
      return;
    }
    const activeItineraries = itineraries?.filter((it: any) => !it.is_deleted) || [];
    if (activeItineraries.length < 2) {
      Alert.alert('알림', '체크리스트 생성을 위해서는 최소 2개 이상의 세부 일정이 필요합니다.');
      return;
    }
    setAiRecommendLoading(true);
    try {
      await api.post(`/private/ai/checklist/${planPublicId}/generate`, {
        force_regenerate: true,
        date: dateForApi,
      });
      refetchChecklist();
    } catch {
      Alert.alert('오류', 'AI 체크리스트 생성에 실패했습니다.');
    } finally {
      setAiRecommendLoading(false);
    }
  };

  const title = titleOverride ?? (mode === 'full'
    ? '여행 준비 체크리스트'
    : dayjs().isSame(selectedDate, 'day')
      ? '오늘의 체크리스트'
      : `${selectedDate.date()}일 체크리스트`);

  if (!planPublicId) return null;

  return (
    <View style={styles.section}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ChecklistIcon width={20} height={20} color={colors.black} />
            <Text style={styles.title}>{title}</Text>
          </View>
          {hasChecklist && (
            <Pressable
              onPress={handleAiRecommendChecklist}
              disabled={aiRecommendLoading}
              style={({ pressed }) => [styles.aiRecommendButtonHeader, pressed && styles.aiRecommendButtonPressed]}
            >
              <GradientBackground
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.aiRecommendButtonGradient}
              >
                <LightningIcon width={16} height={16} color={colors.black} />
                <Text style={styles.aiRecommendButtonText}>AI 추천</Text>
              </GradientBackground>
            </Pressable>
          )}
        </View>
        {dateChecklistItems.length > 0 ? (
          <View style={styles.listBox}>
            {dateChecklistItems.map((item) => (
              <View key={item.id} style={styles.listItem}>
                <Pressable
                  onPress={() => handleToggleChecklistItem(item.id, !item.is_checked)}
                  hitSlop={8}
                >
                  <View style={[styles.checkbox, item.is_checked && styles.checkboxSelected]}>
                    <CheckIcon width={16} height={16} fill={colors.white} />
                  </View>
                </Pressable>
                <View style={styles.itemContent}>
                  <Text
                    style={[styles.itemName, item.is_checked && styles.itemNameChecked]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.name}
                  </Text>
                  {!item.is_custom && (
                    <View style={styles.aiTag}>
                      <Text style={styles.aiTagText}>AI</Text>
                    </View>
                  )}
                </View>
                <Pressable
                  onPress={() => handleDeleteChecklistItem(item.id)}
                  style={styles.deleteButton}
                  hitSlop={8}
                >
                  <CloseIcon width={20} height={20} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>체크리스트가 비어있어요</Text>
            <Text style={styles.emptySubtitle}>
              AI가 일정에 맞는 준비물을 추천해드려요.
            </Text>
            <Pressable
              onPress={handleAiRecommendChecklist}
              disabled={aiRecommendLoading}
              style={({ pressed }) => [pressed && { opacity: 0.8 }]}
            >
              <GradientBackground
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiRecommendButton}
              >
                <View style={styles.aiRecommendButtonContent}>
                  <LightningIcon width={16} height={16} color={colors.black} />
                  <Text style={styles.aiRecommendButtonText}>AI 추천받기</Text>
                </View>
              </GradientBackground>
            </Pressable>
          </View>
        )}
        <View style={styles.addRow}>
          <TextInput
            style={[
              styles.addInput,
              Platform.OS === 'android' && styles.addInputAndroid,
              Platform.OS === 'ios' && styles.addInputIOS,
            ]}
            placeholder="할일 입력..."
            placeholderTextColor={colors.gray500}
            value={newChecklistItem}
            onChangeText={setNewChecklistItem}
            maxLength={100}
            editable={!addingChecklistItem}
            returnKeyType="done"
            onSubmitEditing={handleAddChecklistItem}
          />
          <Pressable
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
            onPress={handleAddChecklistItem}
            disabled={addingChecklistItem || !newChecklistItem.trim()}
          >
            <Text style={[styles.addButtonText, (!newChecklistItem.trim() || addingChecklistItem) && styles.addButtonTextDisabled]}>
              추가
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 0,
    marginBottom: 0,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderColor: colors.gray200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    ...textStyles.h6,
    color: colors.black,
  },
  aiRecommendButtonHeader: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  aiRecommendButtonPressed: {
    opacity: 0.8,
  },
  aiRecommendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  listBox: {
    marginBottom: 0,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    backgroundColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    ...textStyles.body3,
    color: colors.black,
  },
  itemNameChecked: {
    color: colors.gray600,
  },
  aiTag: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  aiTagText: {
    ...textStyles.h9,
    color: colors.primary,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    backgroundColor: colors.gray200,
    borderRadius: 12,
    padding: 26,
  },
  emptyTitle: {
    ...textStyles.h6,
    color: colors.gray700,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...textStyles.body4,
    color: colors.gray600,
    marginBottom: 16,
    textAlign: 'center',
  },
  aiRecommendButton: {
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  aiRecommendButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiRecommendButtonText: {
    ...textStyles.h6,
    color: colors.black,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray200,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 12,
  },
  addInput: {
    flex: 1,
    ...textStyles.body3,
    color: colors.black,
    paddingHorizontal: 0,
  },
  addInputAndroid: {
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  addInputIOS: {
    paddingVertical: 0,
    lineHeight: textStyles.body3.fontSize ? textStyles.body3.fontSize * 1.2 : 20,
  },
  addButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addButtonPressed: {
    opacity: 0.7,
  },
  addButtonText: {
    ...textStyles.h6,
    color: colors.black,
  },
  addButtonTextDisabled: {
    color: colors.gray500,
  },
});
