import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import CloseIcon from '../../../../assets/x.svg';
import dayjs from 'dayjs';
import { Attachment, Itinerary, CreateItineraryRequest, LocalFile } from '@/types/api';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import FullScreenModal from '@/ui/components/FullScreenModal.native';
import FloatingFooter from '@/ui/components/FloatingFooter.native';
import AttachmentSection from '@/ui/components/attachmentSection.native';
import CountrySearchModal from './CountrySearchModal.native';
import Input from '@/ui/components/input/Input';
import { itinerariesApi } from '@/services/itineraries';
import { expensesApi } from '@/services/expenses';
import { attachmentsApi } from '@/services/attachments';
import { TimeModal } from '@/ui/components/TimeModal.native';
import CalendarModal from '@/ui/components/CalendarModal.native';
import CalendarIcon from '../../../../assets/mobile_calendar_black.svg';
import TimeIcon from '../../../../assets/mobile_time.svg';
import DownArrowIcon from '../../../../assets/down_arrow.svg';
import FoodIcon from '../../../../assets/mobile_food.svg';
import CarIcon from '../../../../assets/mobile_car.svg';
import TicketIcon from '../../../../assets/mobile_ticket.svg';
import BedIcon from '../../../../assets/mobile_bed.svg';
import FlightIconExpense from '../../../../assets/mobile_flight.svg';
import ShoppingIcon from '../../../../assets/mobile_shopping.svg';
import { ExpenseCategory, ExpenseCurrency, categoryLabels } from '@/types/expense';
import { normalizeAmount, formatAmountWithCommas } from '@/utils/amountUtils';
import { useFilePicker } from '@/hooks/useFilePicker';
import { useAttachmentUpload } from '@/hooks/useAttachmentUpload';
import { useMe } from '@/hooks/useMe';
import { handleGuestPromptError } from '@/utils/guestPrompt';

interface ItineraryEditModalProps {
  visible: boolean;
  onClose?: (opts?: { fromSave?: boolean }) => void;
  itinerary: Itinerary | null;
  planId: number;
  defaultDate?: string;
  embedded?: boolean;
  onSave?: (itinerary: Itinerary) => void;
  onDelete?: (itineraryId: number) => void;
}

export default function ItineraryEditModal({
  visible,
  onClose,
  itinerary,
  planId,
  defaultDate,
  embedded,
  onSave,
  onDelete,
}: ItineraryEditModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    country: '',
    city: '',
    location: '',
    itineraryDate: dayjs().format('YYYY-MM-DD'),
    startTime: '09:00',
    endTime: '10:00',
  });
  const [expenseData, setExpenseData] = useState({
    amount: '',
    category: ExpenseCategory.FOOD,
  });
  const [existingExpenseId, setExistingExpenseId] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimeModal, setShowStartTimeModal] = useState(false);
  const [showEndTimeModal, setShowEndTimeModal] = useState(false);
  const [showCountrySearch, setShowCountrySearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<LocalFile[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);

  const { pickImage, pickDocument } = useFilePicker();
  const { data: me } = useMe();
  const { isUploading, uploadFiles } = useAttachmentUpload({
    planId,
    entityType: 'itinerary',
  });

  const CATEGORY_ROW1: ExpenseCategory[] = [
    ExpenseCategory.FOOD,
    ExpenseCategory.TRANSPORT,
    ExpenseCategory.ACTIVITY,
  ];
  const CATEGORY_ROW2: ExpenseCategory[] = [
    ExpenseCategory.ACCOMMODATION,
    ExpenseCategory.FLIGHT,
    ExpenseCategory.SHOPPING,
    ExpenseCategory.ETC,
  ];

  const getCategoryIcon = (category: ExpenseCategory, isSelected: boolean) => {
    const size = 16;
    const iconColor = isSelected ? colors.white : colors.gray600;
    switch (category) {
      case ExpenseCategory.FOOD:
        return <FoodIcon width={size} height={size} color={iconColor} />;
      case ExpenseCategory.TRANSPORT:
        return <CarIcon width={size} height={size} color={iconColor} />;
      case ExpenseCategory.ACTIVITY:
        return <TicketIcon width={size} height={size} color={iconColor} />;
      case ExpenseCategory.ETC:
        return null;
      case ExpenseCategory.ACCOMMODATION:
        return <BedIcon width={size} height={size} color={iconColor} />;
      case ExpenseCategory.FLIGHT:
        return <FlightIconExpense width={size} height={size} color={iconColor} />;
      case ExpenseCategory.SHOPPING:
        return <ShoppingIcon width={size} height={size} color={iconColor} />;
      default:
        return <TicketIcon width={size} height={size} color={iconColor} />;
    }
  };

  useEffect(() => {
    if (visible && itinerary) {
      const loadLatest = async () => {
        try {
          const [latestItinerary, expenses] = await Promise.all([
            itinerariesApi.getItinerary(itinerary.id),
            expensesApi.getExpensesByItinerary(itinerary.id),
          ]);
          setFormData({
            title: latestItinerary.title || '',
            description: latestItinerary.description || '',
            country: latestItinerary.country || '',
            city: latestItinerary.city || '',
            location: latestItinerary.location || '',
            itineraryDate: latestItinerary.itineraryDate || dayjs().format('YYYY-MM-DD'),
            startTime: latestItinerary.startTime ? latestItinerary.startTime.substring(0, 5) : '09:00',
            endTime: latestItinerary.endTime ? latestItinerary.endTime.substring(0, 5) : '10:00',
          });
          const firstExpense = expenses[0];
          if (firstExpense) {
            const amountInt = Math.floor(Number(firstExpense.amount));
            setExpenseData({
              amount: formatAmountWithCommas(amountInt),
              category: firstExpense.category as ExpenseCategory,
            });
            setExistingExpenseId(firstExpense.id);
          } else {
            setExpenseData({ amount: '', category: ExpenseCategory.FOOD });
            setExistingExpenseId(null);
          }
        } catch {
          setFormData({
            title: itinerary.title || '',
            description: itinerary.description || '',
            country: itinerary.country || '',
            city: itinerary.city || '',
            location: itinerary.location || '',
            itineraryDate: itinerary.itineraryDate || dayjs().format('YYYY-MM-DD'),
            startTime: itinerary.startTime ? itinerary.startTime.substring(0, 5) : '09:00',
            endTime: itinerary.endTime ? itinerary.endTime.substring(0, 5) : '10:00',
          });
          setExpenseData({ amount: '', category: ExpenseCategory.FOOD });
          setExistingExpenseId(null);
        }
      };
      loadLatest();
    } else if (visible && !itinerary) {
      const initDate = defaultDate || dayjs().format('YYYY-MM-DD');
      setFormData({
        title: '',
        description: '',
        country: '',
        city: '',
        location: '',
        itineraryDate: initDate,
        startTime: '09:00',
        endTime: '10:00',
      });
      setExpenseData({ amount: '', category: ExpenseCategory.FOOD });
      setExistingExpenseId(null);
    }
    if (visible) {
      setPendingFiles([]);
    }
  }, [visible, itinerary, defaultDate]);

  useEffect(() => {
    if (!visible) return;
    if (!itinerary) {
      setExistingAttachments([]);
      setIsLoadingAttachments(false);
      return;
    }
    let cancelled = false;
    setExistingAttachments([]);
    setIsLoadingAttachments(true);
    attachmentsApi
      .getAttachments(planId, 'itinerary', itinerary.id)
      .then((list) => {
        if (!cancelled) setExistingAttachments(list);
      })
      .catch(() => {
        if (!cancelled) setExistingAttachments([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAttachments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, itinerary?.id, planId]);

  const handleRemoveExistingAttachment = async (attachmentId: number) => {
    try {
      await attachmentsApi.deleteAttachment(attachmentId);
      setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (error) {
      if (handleGuestPromptError(error)) return;
      Alert.alert('오류', '첨부파일 삭제에 실패했습니다.');
    }
  };

  const handleExpenseAmountChange = (text: string) => {
    const formatted = formatAmountWithCommas(text);
    setExpenseData((prev) => ({ ...prev, amount: formatted }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('알림', '일정 제목을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      let savedItinerary: Itinerary;
      if (itinerary) {
        savedItinerary = await itinerariesApi.updateItinerary(itinerary.id, {
          ...formData,
          planId,
        });
        Alert.alert('수정완료', '일정이 수정되었습니다.');
      } else {
        savedItinerary = await itinerariesApi.createItinerary({
          ...formData,
          planId,
        });
        Alert.alert('추가완료', '일정이 추가되었습니다.');
      }

      const amountNum = parseInt(normalizeAmount(expenseData.amount), 10) || 0;
      if (amountNum > 0 && savedItinerary) {
        const expenseDescription = formData.title.trim();
        const expensePayload = {
          planId,
          itineraryId: savedItinerary.id,
          category: expenseData.category,
          amount: amountNum,
          currency: ExpenseCurrency.KRW,
          exDate: formData.itineraryDate,
          description: expenseDescription,
        };
        if (existingExpenseId) {
          await expensesApi.updateExpense(existingExpenseId, {
            category: expenseData.category,
            amount: amountNum,
            currency: ExpenseCurrency.KRW,
            exDate: formData.itineraryDate,
            description: expenseDescription,
          });
        } else {
          await expensesApi.createExpense(expensePayload);
        }
      } else if (existingExpenseId && amountNum <= 0) {
        await expensesApi.deleteExpense(existingExpenseId);
      }

      if (pendingFiles.length > 0) {
        try {
          const uploaded = await uploadFiles(pendingFiles, savedItinerary.id);
          setExistingAttachments((prev) => [...prev, ...uploaded]);
          setPendingFiles([]);
        } catch {
          Alert.alert('알림', '일정은 저장됐으나 일부 파일 업로드에 실패했습니다.');
        }
      }

      try {
        await onSave?.(savedItinerary);
      } catch {
        // Refetch 실패해도 저장은 완료됨 → 모달 닫기
      }
      onClose?.({ fromSave: true });
    } catch {
      Alert.alert('오류', '일정 저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!itinerary) return;
    
    Alert.alert(
      '일정 삭제',
      '이 일정을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await itinerariesApi.deleteItinerary(itinerary.id);
              if (onDelete) {
                onDelete(itinerary.id);
              }
              Alert.alert('삭제완료', '일정이 삭제되었습니다.');
              onClose?.({ fromSave: true });
            } catch (error) {
              Alert.alert('오류', '일정 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format('YYYY.MM.DD');
  };

  const formatTimeDisplay = (timeStr: string) => {
    const [hour, minute] = timeStr.split(':');
    const hourNum = parseInt(hour);
    const period = hourNum < 12 ? '오전' : '오후';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${period} ${displayHour.toString().padStart(2, '0')}:${minute}`;
  };

  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':');
    return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
  };

  const content = (
    <>
      {!embedded && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {itinerary ? '일정 수정' : '새 일정 추가'}
          </Text>
          <Pressable style={styles.closeButton} onPress={() => onClose?.()} hitSlop={8}>
            <CloseIcon width={24} height={24} />
          </Pressable>
        </View>
      )}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 입력 필드들 */}
        <View style={styles.form}>
          {/* 일정명 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              일정 제목<Text style={styles.required}>*</Text>
            </Text>
            <Input
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              style={[styles.input, !itinerary && styles.inputBorderless]}
            />
          </View>

          {/* 내용 (메모) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>내용 (메모)</Text>
            <Input
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              style={[styles.textArea, !itinerary && styles.textAreaBorderless]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* 국가, 도시 */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>국가</Text>
              <Pressable
                style={[
                  styles.pickerInput,
                  styles.countryPickerTouchable,
                  !itinerary && styles.pickerInputBorderless,
                ]}
                onPress={() => setShowCountrySearch(true)}
              >
                <Text
                  style={[
                    formData.country
                      ? styles.pickerValueText
                      : styles.pickerPlaceholderText,
                    styles.countryTextTruncate,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {formData.country || '국가 선택'}
                </Text>
                <DownArrowIcon width={20} height={20} color={colors.gray600} />
              </Pressable>
              <CountrySearchModal
                visible={showCountrySearch}
                onClose={() => setShowCountrySearch(false)}
                onSelect={(country) => {
                  setFormData({ ...formData, country });
                  setShowCountrySearch(false);
                }}
                selectedValue={formData.country}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>도시</Text>
              <Input
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
                style={[styles.input, !itinerary && styles.inputBorderless]}
              />
            </View>
          </View>

          {/* 장소 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>장소 (주소)</Text>
            <Input
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              style={[styles.input, !itinerary && styles.inputBorderless]}
            />
          </View>

          <View style={[styles.inputGroup, styles.halfWidth, { gap: 8 }]}>
              <Text style={[styles.label, {marginBottom: 0}]}>
                날짜 및 시간<Text style={styles.required}>*</Text>
              </Text>
              <Pressable
                style={[styles.dateInput, !itinerary && styles.dateInputBorderless]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={formData.itineraryDate ? styles.dateText : styles.placeholderText}>
                  {formData.itineraryDate ? formatDate(formData.itineraryDate) : '날짜 선택'}
                </Text>
                <CalendarIcon width={20} height={20} color={colors.black} />
              </Pressable>
              <CalendarModal
                visible={showDatePicker}
                selectedDate={formData.itineraryDate}
                onDayPress={(day) => {
                  setFormData({ ...formData, itineraryDate: day.dateString });
                  setShowDatePicker(false);
                }}
                onClose={() => setShowDatePicker(false)}
              />
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Pressable
                  style={[styles.dateInput, !itinerary && styles.dateInputBorderless]}
                  onPress={() => setShowStartTimeModal(true)}
                >
                  <Text style={styles.dateText}>{formatTimeDisplay(formData.startTime)}</Text>
                  <TimeIcon width={20} height={20} color={colors.black} />
                </Pressable>
              </View>
              <View style={styles.halfWidth}>
                <Pressable
                  style={[styles.dateInput, !itinerary && styles.dateInputBorderless]}
                  onPress={() => setShowEndTimeModal(true)}
                >
                  <Text style={styles.dateText}>{formatTimeDisplay(formData.endTime)}</Text>
                  <TimeIcon width={20} height={20} color={colors.black} />
                </Pressable>
              </View>
            </View>
            <TimeModal
              visible={showStartTimeModal}
              onClose={() => setShowStartTimeModal(false)}
              value={formData.startTime}
              onConfirm={(time24) => {
                setFormData((prev) => {
                  const next = { ...prev, startTime: time24 };
                  if (timeToMinutes(prev.endTime) < timeToMinutes(time24)) {
                    next.endTime = time24;
                  }
                  return next;
                });
              }}
            />
            <TimeModal
              visible={showEndTimeModal}
              onClose={() => setShowEndTimeModal(false)}
              value={formData.endTime}
              onConfirm={(time24) => {
                setFormData((prev) => ({
                  ...prev,
                  endTime:
                    timeToMinutes(time24) < timeToMinutes(prev.startTime)
                      ? prev.startTime
                      : time24,
                }));
              }}
            />
         </View>

          {/* 비용 정보 */}
          <View style={styles.expenseSection}>
            <View style={styles.expenseDivider} />
            <Text style={styles.expenseSectionTitle}>비용 정보</Text>            
            <View style={[styles.inputGroup, { marginBottom: 20 }]}>
              <Text style={styles.label}>금액</Text>
              <View style={styles.amountInputWrapper}>
                <Input
                  value={expenseData.amount}
                  onChangeText={handleExpenseAmountChange}
                  placeholder="0"
                  placeholderTextColor={colors.gray500}
                  keyboardType="number-pad"
                  variant="filled"
                  containerStyle={styles.amountInputContainer}
                  style={styles.amountInputStyle}
                />
                <Text style={styles.amountSuffix}>KRW</Text>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>비용 카테고리 설정</Text>
              <View style={styles.categoryRow}>
                {CATEGORY_ROW1.map((cat) => {
                  const isSelected = expenseData.category === cat;
                  return (
                    <Pressable
                      key={cat}
                      style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                      onPress={() => setExpenseData((prev) => ({ ...prev, category: cat }))}
                    >
                      {getCategoryIcon(cat, isSelected)}
                      <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextSelected]}>
                        {categoryLabels[cat as keyof typeof categoryLabels]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={[styles.categoryRow, styles.categoryRowSecond]}>
                {CATEGORY_ROW2.map((cat) => {
                  const isSelected = expenseData.category === cat;
                  return (
                    <Pressable
                      key={cat}
                      style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                      onPress={() => setExpenseData((prev) => ({ ...prev, category: cat }))}
                    >
                      {getCategoryIcon(cat, isSelected)}
                      <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextSelected]}>
                        {categoryLabels[cat as keyof typeof categoryLabels]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <AttachmentSection
              showTopDivider
              style={styles.attachmentSection}
              pendingFiles={pendingFiles}
              existingAttachments={existingAttachments}
              onRemoveExisting={itinerary ? handleRemoveExistingAttachment : undefined}
              isLoadingExisting={!!itinerary && isLoadingAttachments}
              isUploading={isUploading}
              disabled={isSubmitting}
              isGuest={!!me?.isGuest}
              onPickImage={async () => {
                try {
                  const file = await pickImage();
                  if (file) setPendingFiles(prev => [...prev, file]);
                } catch (e: any) {
                  Alert.alert('알림', e.message);
                }
              }}
              onPickDocument={async () => {
                try {
                  const file = await pickDocument();
                  if (file) setPendingFiles(prev => [...prev, file]);
                } catch (e: any) {
                  Alert.alert('알림', e.message);
                }
              }}
              onRemoveFile={index =>
                setPendingFiles(prev => prev.filter((_, i) => i !== index))
              }
            />
          </View>

        </View>
      </ScrollView>

      <FloatingFooter
        primaryLabel={isUploading ? '업로드 중...' : itinerary ? '수정 완료' : '일정 저장'}
        onPrimaryPress={handleSave}
        primaryDisabled={isSubmitting || isUploading}
        secondaryLabel={itinerary && !embedded ? '삭제' : undefined}
        onSecondaryPress={itinerary ? handleDelete : undefined}
      />
    </>
  );

  if (embedded) {
    return <View style={{ flex: 1 }}>{content}</View>;
  }

  return (
    <FullScreenModal visible={visible} onClose={() => onClose?.()}>
      {content}
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    ...textStyles.h4,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 400,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    // marginBottom: 4,
  },
  label: {
    ...textStyles.h7,
    marginBottom: 8,
  },
  required: {
    color: colors.warning,
  },
  input: {
    minHeight: 44,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    backgroundColor: colors.gray200,
  },
  inputBorderless: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  textArea: {
    ...textStyles.body4,
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.gray200,
  },
  textAreaBorderless: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  halfWidth: {
    flex: 1,
  },
  pickerInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    backgroundColor: colors.gray200,
  },
  pickerInputBorderless: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  countryPickerTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  pickerValueText: {
    ...textStyles.h6,
    color: colors.black,
  },
  pickerPlaceholderText: {
    ...textStyles.body3,
    color: colors.gray600,
  },
  countryTextTruncate: {
    flex: 1,
    minWidth: 0,
  },
  dateInput: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    backgroundColor: colors.gray200,
  },
  dateInputBorderless: {
    borderWidth: 0,
    borderColor: 'transparent',
  },
  dateText: {
    ...textStyles.body3,
  },
  placeholderText: {
    ...textStyles.body3,
    color: colors.gray400,
  },
  expenseSection: {
    marginTop: 20,
  },
  expenseSectionTitle: {
    ...textStyles.h5,
    marginTop: 12,
    marginBottom: 20,
  },
  expenseDivider: {
    height: 1,
    backgroundColor: colors.gray300,
    marginBottom: 20,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: `${colors.primary}1A`,
  },
  amountInputContainer: {
    flex: 1,
  },
  amountInputStyle: {
    flex: 1,
    height: 48,
    textAlign: 'left',
    backgroundColor: 'transparent',
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 14,
    paddingHorizontal: 0,
    paddingVertical: 0,
    color: colors.primary,
  },
  amountSuffix: {
    ...textStyles.h6,
    color: colors.primary,
    marginLeft: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryRowSecond: {
    marginTop: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.gray200,
  },
  categoryPillSelected: {
    backgroundColor: colors.primary,
  },
  categoryPillText: {
    ...textStyles.h6,
    color: colors.gray600,
  },
  categoryPillTextSelected: {
    color: colors.white,
  },
  attachmentSection: {
    marginTop: 32,
  },
});
