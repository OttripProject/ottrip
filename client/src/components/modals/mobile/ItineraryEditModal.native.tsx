import AiDocumentAnalyzeModal from "@/components/modals/mobile/AiDocumentAnalyzeModal";

const KIND_TO_LABEL: Record<string, string> = {
  itinerary: "일정",
  accommodation: "숙박",
  flight: "항공",
  expense: "비용",
};
import { useAttachmentUpload } from "@/hooks/useAttachmentUpload";
import { useFilePicker } from "@/hooks/useFilePicker";
import { useMe } from "@/hooks/useMe";
import { analyzeDocumentUpload } from "@/services/aiDocument";
import { attachmentsApi } from "@/services/attachments";
import { expensesApi } from "@/services/expenses";
import { itinerariesApi } from "@/services/itineraries";
import type { Attachment, DocumentUploadAnalyzeResponse, Itinerary, LocalFile } from "@/types/api";
import type { AiAttachmentAnalyzeSelection } from "@/ui/components/attachmentSection.types";
import { buildAnalyzeUploadPayload } from "@/utils/attachmentAiAnalyze";
import { applyItineraryDraftFromAi } from "@/utils/applyAiDocumentDraft";
import {
  ExpenseCategory,
  ExpenseCurrency,
  categoryLabels,
} from "@/types/expense";
import CalendarModal from "@/ui/components/CalendarModal.native";
import FloatingFooter from "@/ui/components/FloatingFooter.native";
import FullScreenModal from "@/ui/components/FullScreenModal.native";
import { TimeModal } from "@/ui/components/TimeModal.native";
import AttachmentSection from "@/ui/components/attachmentSection.native";
import Input from "@/ui/components/input/Input";
import { colors } from "@/ui/tokens/colors";
import { textStyles, typography } from "@/ui/tokens/typography";
import { formatAmountWithCommas, normalizeAmount } from "@/utils/amountUtils";
import { handleGuestPromptError } from "@/utils/guestPrompt";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import BedIcon from "../../../../assets/mobile_bed.svg";
import CalendarIcon from "../../../../assets/mobile_calendar_black.svg";
import CarIcon from "../../../../assets/mobile_car.svg";
import FlightIconExpense from "../../../../assets/mobile_flight.svg";
import FoodIcon from "../../../../assets/mobile_food.svg";
import ShoppingIcon from "../../../../assets/mobile_shopping.svg";
import TicketIcon from "../../../../assets/mobile_ticket.svg";
import TimeIcon from "../../../../assets/mobile_time.svg";
import CloseIcon from "../../../../assets/x.svg";
import CityPicker from "@/ui/components/pickers/CityPicker";
import CountryPicker from "@/ui/components/pickers/CountryPicker";

interface ItineraryEditModalProps {
  visible: boolean;
  onClose?: (opts?: { fromSave?: boolean }) => void;
  itinerary: Itinerary | null;
  planId: number;
  defaultDate?: string;
  defaultCountry?: string;
  defaultCity?: string;
  embedded?: boolean;
  onSave?: (itinerary: Itinerary) => void;
  onDelete?: (itineraryId: number) => void;
  pendingAiResult?: { result: DocumentUploadAnalyzeResponse; filename?: string; pendingFiles?: LocalFile[] } | null;
  onRouteMismatchResult?: (result: DocumentUploadAnalyzeResponse, filename?: string, pendingFiles?: LocalFile[]) => void;
}

const addOneHour = (time24: string): string => {
  if (!time24) return "01:00";
  const [hours, minutes] = time24.split(":").map(Number);
  const newHours = (hours + 1) % 24; 
  return `${newHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

export default function ItineraryEditModal({
  visible,
  onClose,
  itinerary,
  planId,
  defaultDate,
  defaultCountry,
  defaultCity,
  embedded,
  onSave,
  onDelete,
  pendingAiResult,
  onRouteMismatchResult,
}: ItineraryEditModalProps) {
  const scrollRef = useRef<ScrollView>(null);
  const currencyOpacity = useRef(new Animated.Value(1)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", e => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    country: "",
    city: "",
    location: "",
    itineraryDate: dayjs().format("YYYY-MM-DD"),
    startTime: "09:00",
    endTime: "10:00",
  });
  const [expenseData, setExpenseData] = useState({
    amount: "",
    category: ExpenseCategory.FOOD,
    currency: ExpenseCurrency.KRW,
  });
  const [existingExpenseId, setExistingExpenseId] = useState<number | null>(
    null,
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimeModal, setShowStartTimeModal] = useState(false);
  const [showEndTimeModal, setShowEndTimeModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<LocalFile[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>(
    [],
  );
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalyzeError, setAiAnalyzeError] = useState<string | null>(null);
  const [aiModalResult, setAiModalResult] = useState<DocumentUploadAnalyzeResponse | null>(null);
  const [aiAnalyzeFileName, setAiAnalyzeFileName] = useState<string | undefined>();
  const [lastAiSelection, setLastAiSelection] = useState<AiAttachmentAnalyzeSelection | null>(null);
  const aiCancelledRef = useRef(false);
  const formInitializedRef = useRef(false);
  const [aiApplyLabel, setAiApplyLabel] = useState<string | undefined>();

  const { pickImage, pickDocument } = useFilePicker();
  const { data: me } = useMe();
  const { isUploading, uploadFiles } = useAttachmentUpload({
    planId,
    entityType: "itinerary",
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
        return (
          <FlightIconExpense width={size} height={size} color={iconColor} />
        );
      case ExpenseCategory.SHOPPING:
        return <ShoppingIcon width={size} height={size} color={iconColor} />;
      default:
        return <TicketIcon width={size} height={size} color={iconColor} />;
    }
  };

  useEffect(() => {
    if (!visible) {
      formInitializedRef.current = false;
      setAiModalResult(null);
      setAiApplyLabel(undefined);
      return;
    }
    if (formInitializedRef.current) return;
    formInitializedRef.current = true;

    if (itinerary) {
      const loadLatest = async () => {
        try {
          const [latestItinerary, expenses] = await Promise.all([
            itinerariesApi.getItinerary(itinerary.id),
            expensesApi.getExpensesByItinerary(itinerary.id),
          ]);
          setFormData({
            title: latestItinerary.title || "",
            description: latestItinerary.description || "",
            country: latestItinerary.country || "",
            city: latestItinerary.city || "",
            location: latestItinerary.location || "",
            itineraryDate:
              latestItinerary.itineraryDate || dayjs().format("YYYY-MM-DD"),
            startTime: latestItinerary.startTime
              ? latestItinerary.startTime.substring(0, 5)
              : "09:00",
            endTime: latestItinerary.endTime
              ? latestItinerary.endTime.substring(0, 5)
              : "10:00",
          });
          const firstExpense = expenses[0];
          if (firstExpense) {
            const amountInt = Math.floor(Number(firstExpense.amount));
            setExpenseData({
              amount: formatAmountWithCommas(amountInt),
              category: firstExpense.category as ExpenseCategory,
              currency: (firstExpense.currency as ExpenseCurrency) ?? ExpenseCurrency.KRW,
            });
            setExistingExpenseId(firstExpense.id);
          } else {
            setExpenseData({ amount: "", category: ExpenseCategory.FOOD, currency: ExpenseCurrency.KRW });
            setExistingExpenseId(null);
          }
        } catch {
          setFormData({
            title: itinerary.title || "",
            description: itinerary.description || "",
            country: itinerary.country || "",
            city: itinerary.city || "",
            location: itinerary.location || "",
            itineraryDate:
              itinerary.itineraryDate || dayjs().format("YYYY-MM-DD"),
            startTime: itinerary.startTime
              ? itinerary.startTime.substring(0, 5)
              : "09:00",
            endTime: itinerary.endTime
              ? itinerary.endTime.substring(0, 5)
              : "10:00",
          });
          setExpenseData({ amount: "", category: ExpenseCategory.FOOD, currency: ExpenseCurrency.KRW });
          setExistingExpenseId(null);
        }
      };
      loadLatest();
    } else {
      const initDate = defaultDate || dayjs().format("YYYY-MM-DD");
      setFormData({
        title: "",
        description: "",
        country: defaultCountry || "",
        city: defaultCity || "",
        location: "",
        itineraryDate: initDate,
        startTime: "09:00",
        endTime: "10:00",
      });
      setExpenseData({ amount: "", category: ExpenseCategory.FOOD, currency: ExpenseCurrency.KRW });
      setExistingExpenseId(null);
    }
    setPendingFiles([]);
  }, [visible, itinerary, defaultDate, defaultCountry, defaultCity]);

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
      .getAttachments(planId, "itinerary", itinerary.id)
      .then(list => {
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
      setAiAnalyzeError(null);
      setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error) {
      if (handleGuestPromptError(error)) return;
      Alert.alert("알림", "첨부파일 삭제에 실패했습니다");
    }
  };

  const handleAiAnalyzePress = async (selection: AiAttachmentAnalyzeSelection) => {
    setAiAnalyzeError(null);
    setIsAiAnalyzing(true);
    setLastAiSelection(selection);
    aiCancelledRef.current = false;
    try {
      const { file, filename } = await buildAnalyzeUploadPayload(selection, {
        pendingFiles,
        existingAttachments,
      });
      setAiAnalyzeFileName(filename);
      const result = await analyzeDocumentUpload(file, { filename });
      if (aiCancelledRef.current) return;
      if (!result.success) {
        setAiAnalyzeError(result.error ?? "분석에 실패했습니다.");
      } else {
        const inferredType = result.inferredItemType ?? result.draft?.itemType;
        if (inferredType && inferredType !== "itinerary") {
          if (onRouteMismatchResult) {
            setAiApplyLabel(`${KIND_TO_LABEL[inferredType] ?? inferredType}에 추가`);
            setAiModalResult(result);
          } else {
            setAiAnalyzeError(
              `문서가 [${KIND_TO_LABEL[inferredType] ?? inferredType}]으로 분석되었습니다. 일정 수정 화면에는 반영할 수 없습니다.`,
            );
          }
        } else {
          setAiApplyLabel(undefined);
          setAiModalResult(result);
        }
      }
    } catch {
      setAiAnalyzeError("분석 중 오류가 발생했습니다");
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  useEffect(() => {
    if (visible && pendingAiResult) {
      const draft = pendingAiResult.result.draft;
      if (draft?.itemType === "itinerary") {
        applyItineraryDraftFromAi(draft, setFormData, () => {});
      }
      if (pendingAiResult.pendingFiles?.length) {
        setPendingFiles(pendingAiResult.pendingFiles);
      }
    }
  }, [visible, pendingAiResult]);

  const handleExpenseAmountChange = (text: string) => {
    const formatted = formatAmountWithCommas(text);
    setExpenseData(prev => ({ ...prev, amount: formatted }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert("알림", "일정 제목을 입력해주세요");
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
      } else {
        savedItinerary = await itinerariesApi.createItinerary({
          ...formData,
          planId,
        });
      }

      const amountNum =
        Number.parseInt(normalizeAmount(expenseData.amount), 10) || 0;
      if (amountNum > 0 && savedItinerary) {
        const expenseDescription = formData.title.trim();
        const expensePayload = {
          planId,
          itineraryId: savedItinerary.id,
          category: expenseData.category,
          amount: amountNum,
          currency: expenseData.currency,
          exDate: formData.itineraryDate,
          description: expenseDescription,
        };
        if (existingExpenseId) {
          await expensesApi.updateExpense(existingExpenseId, {
            category: expenseData.category,
            amount: amountNum,
            currency: expenseData.currency,
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
          setExistingAttachments(prev => [...prev, ...uploaded]);
          setPendingFiles([]);
        } catch {
          Alert.alert(
            "알림",
            "일정은 저장됐으나 일부 파일 업로드에 실패했습니다",
          );
        }
      }

      Alert.alert(itinerary ? "수정완료" : "추가완료", itinerary ? "일정이 수정되었습니다" : "일정이 추가되었습니다");

      try {
        await onSave?.(savedItinerary);
      } catch {
        // Refetch 실패해도 저장은 완료됨 → 모달 닫기
      }
      onClose?.({ fromSave: true });
    } catch {
      Alert.alert("알림", "일정 저장에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!itinerary) return;

    Alert.alert("일정 삭제", "이 일정을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await itinerariesApi.deleteItinerary(itinerary.id);
            if (onDelete) {
              onDelete(itinerary.id);
            }
            Alert.alert("삭제완료", "일정이 삭제되었습니다");
            onClose?.({ fromSave: true });
          } catch (_error) {
            Alert.alert("알림", "일정 삭제에 실패했습니다");
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format("YYYY.MM.DD");
  };

  const formatTimeDisplay = (timeStr: string) => {
    const [hour, minute] = timeStr.split(":");
    const hourNum = Number.parseInt(hour);
    const period = hourNum < 12 ? "오전" : "오후";
    const displayHour =
      hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    return `${period} ${displayHour.toString().padStart(2, "0")}:${minute}`;
  };

  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(":");
    return (Number.parseInt(h, 10) || 0) * 60 + (Number.parseInt(m, 10) || 0);
  };

  const content = (
    <>
      {!embedded && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {itinerary ? "일정 수정" : "새 일정 추가"}
          </Text>
          <Pressable
            style={styles.closeButton}
            onPress={() => onClose?.()}
            hitSlop={8}
          >
            <CloseIcon width={24} height={24} />
          </Pressable>
        </View>
      )}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: keyboardHeight || 24 },
        ]}
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
              onChangeText={text => setFormData({ ...formData, title: text })}
              style={[styles.input, !itinerary && styles.inputBorderless]}
            />
          </View>

          {/* 내용 (메모) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>내용 (메모)</Text>
            <Input
              value={formData.description}
              onChangeText={text =>
                setFormData({ ...formData, description: text })
              }
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
              <CountryPicker
                value={formData.country}
                onChange={country =>
                  setFormData({ ...formData, country, city: "" })
                }
                placeholder="국가 선택"
                style={
                  !itinerary
                    ? styles.pickerTriggerBorderless
                    : styles.pickerTrigger
                }
                fullScreenModal
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>도시</Text>
              <CityPicker
                value={formData.city}
                onChange={city => setFormData({ ...formData, city })}
                countryKo={formData.country}
                placeholder={formData.country ? "도시 선택" : "먼저 국가 선택"}
                disabled={!formData.country}
                style={
                  !itinerary
                    ? styles.pickerTriggerBorderless
                    : styles.pickerTrigger
                }
                fullScreenModal
              />
            </View>
          </View>

          {/* 장소 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>장소 (주소)</Text>
            <Input
              value={formData.location}
              onChangeText={text =>
                setFormData({ ...formData, location: text })
              }
              style={[styles.input, !itinerary && styles.inputBorderless]}
            />
          </View>

          <View style={[styles.inputGroup, styles.halfWidth, { gap: 8 }]}>
            <Text style={[styles.label, { marginBottom: 0 }]}>
              날짜 및 시간<Text style={styles.required}>*</Text>
            </Text>
            <Pressable
              style={[
                styles.dateInput,
                !itinerary && styles.dateInputBorderless,
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text
                style={
                  formData.itineraryDate
                    ? styles.dateText
                    : styles.placeholderText
                }
              >
                {formData.itineraryDate
                  ? formatDate(formData.itineraryDate)
                  : "날짜 선택"}
              </Text>
              <CalendarIcon width={20} height={20} color={colors.black} />
            </Pressable>
            <CalendarModal
              visible={showDatePicker}
              selectedDate={formData.itineraryDate}
              onDayPress={day => {
                setFormData({ ...formData, itineraryDate: day.dateString });
                setShowDatePicker(false);
              }}
              onClose={() => setShowDatePicker(false)}
            />
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Pressable
                  style={[
                    styles.dateInput,
                    !itinerary && styles.dateInputBorderless,
                  ]}
                  onPress={() => setShowStartTimeModal(true)}
                >
                  <Text style={styles.dateText}>
                    {formatTimeDisplay(formData.startTime)}
                  </Text>
                  <TimeIcon width={20} height={20} color={colors.black} />
                </Pressable>
              </View>
              <View style={styles.halfWidth}>
                <Pressable
                  style={[
                    styles.dateInput,
                    !itinerary && styles.dateInputBorderless,
                  ]}
                  onPress={() => setShowEndTimeModal(true)}
                >
                  <Text style={styles.dateText}>
                    {formatTimeDisplay(formData.endTime)}
                  </Text>
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
                  const next = {
                    ...prev,
                    startTime: time24,
                    endTime: addOneHour(time24), 
                  };
                  return next;
                });
              }}
            />
            <TimeModal
              visible={showEndTimeModal}
              onClose={() => setShowEndTimeModal(false)}
              value={formData.endTime}
              onConfirm={(time24) => {
                setFormData((prev) => {
                  const endMinutes = timeToMinutes(time24);
                  const startMinutes = timeToMinutes(prev.startTime);
                  if (endMinutes <= startMinutes) {
                    Alert.alert("알림", "종료시간은 시작시간보다 늦어야 합니다");
                    return {
                      ...prev,
                      endTime: addOneHour(prev.startTime), 
                    };
                  }            
                  return { ...prev, endTime: time24 };
                });
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
                  onFocus={() => {
                    setTimeout(
                      () => scrollRef.current?.scrollToEnd({ animated: true }),
                      100,
                    );
                  }}
                />
                <Pressable
                  style={styles.currencyBadge}
                  onPress={() => {
                    Animated.timing(currencyOpacity, {
                      toValue: 0,
                      duration: 100,
                      useNativeDriver: true,
                    }).start(() => {
                      setExpenseData(prev => ({
                        ...prev,
                        currency:
                          prev.currency === ExpenseCurrency.KRW
                            ? ExpenseCurrency.USD
                            : ExpenseCurrency.KRW,
                      }));
                      Animated.timing(currencyOpacity, {
                        toValue: 1,
                        duration: 150,
                        useNativeDriver: true,
                      }).start();
                    });
                  }}
                  hitSlop={8}
                >
                  <Animated.Text style={[styles.amountSuffix, { opacity: currencyOpacity }]}>
                    {expenseData.currency === ExpenseCurrency.KRW ? "원" : "달러"}
                  </Animated.Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>비용 카테고리 설정</Text>
              <View style={styles.categoryRow}>
                {CATEGORY_ROW1.map(cat => {
                  const isSelected = expenseData.category === cat;
                  return (
                    <Pressable
                      key={cat}
                      style={[
                        styles.categoryPill,
                        isSelected && styles.categoryPillSelected,
                      ]}
                      onPress={() =>
                        setExpenseData(prev => ({ ...prev, category: cat }))
                      }
                    >
                      {getCategoryIcon(cat, isSelected)}
                      <Text
                        style={[
                          styles.categoryPillText,
                          isSelected && styles.categoryPillTextSelected,
                        ]}
                      >
                        {categoryLabels[cat as keyof typeof categoryLabels]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={[styles.categoryRow, styles.categoryRowSecond]}>
                {CATEGORY_ROW2.map(cat => {
                  const isSelected = expenseData.category === cat;
                  return (
                    <Pressable
                      key={cat}
                      style={[
                        styles.categoryPill,
                        isSelected && styles.categoryPillSelected,
                      ]}
                      onPress={() =>
                        setExpenseData(prev => ({ ...prev, category: cat }))
                      }
                    >
                      {getCategoryIcon(cat, isSelected)}
                      <Text
                        style={[
                          styles.categoryPillText,
                          isSelected && styles.categoryPillTextSelected,
                        ]}
                      >
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
              onRemoveExisting={
                itinerary ? handleRemoveExistingAttachment : undefined
              }
              isLoadingExisting={!!itinerary && isLoadingAttachments}
              isUploading={isUploading}
              disabled={isSubmitting}
              isGuest={!!me?.isGuest}
              onPickImage={async () => {
                try {
                  const file = await pickImage();
                  if (file) {
                    setAiAnalyzeError(null);
                    setPendingFiles(prev => [...prev, file]);
                    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
                  }
                } catch (e: any) {
                  Alert.alert("알림", e.message);
                }
              }}
              onPickDocument={async () => {
                try {
                  const file = await pickDocument();
                  if (file) {
                    setAiAnalyzeError(null);
                    setPendingFiles(prev => [...prev, file]);
                    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
                  }
                } catch (e: any) {
                  Alert.alert("알림", e.message);
                }
              }}
              onRemoveFile={index => {
                setAiAnalyzeError(null);
                setPendingFiles(prev => prev.filter((_, i) => i !== index));
              }}
              onAiAnalyzePress={handleAiAnalyzePress}
              isAiAnalyzing={isAiAnalyzing}
              onCancelAiAnalyze={() => {
                aiCancelledRef.current = true;
                setIsAiAnalyzing(false);
              }}
              analyzeError={aiAnalyzeError}
              onRetryAnalyze={() => lastAiSelection && handleAiAnalyzePress(lastAiSelection)}
              isAiAnalyzeSuccess={!!aiModalResult?.success && !aiAnalyzeError}
            />
          </View>
        </View>
      </ScrollView>

      <FloatingFooter
        primaryLabel={
          isUploading ? "업로드 중..." : itinerary ? "수정 완료" : "일정 저장"
        }
        onPrimaryPress={handleSave}
        primaryDisabled={isSubmitting || isUploading}
        secondaryLabel={itinerary && !embedded ? "삭제" : undefined}
        onSecondaryPress={itinerary ? handleDelete : undefined}
      />
    </>
  );

  const aiModal = (
    <AiDocumentAnalyzeModal
      visible={!!aiModalResult}
      onClose={() => { setAiModalResult(null); setAiApplyLabel(undefined); }}
      entityTypeLabel="일정"
      originEntityType="일정"
      analyzeResult={aiModalResult}
      analyzeFileName={aiAnalyzeFileName}
      applyLabel={aiApplyLabel}
      onApply={draft => {
        const inferredType = aiModalResult?.inferredItemType ?? draft?.itemType;
        if (inferredType !== "itinerary" && onRouteMismatchResult && aiModalResult) {
          onRouteMismatchResult({ ...aiModalResult, draft }, aiAnalyzeFileName, pendingFiles);
        } else if (draft) {
          applyItineraryDraftFromAi(draft, setFormData, () => {});
        }
        setAiModalResult(null);
        setAiApplyLabel(undefined);
      }}
    />
  );

  if (embedded) {
    return (
      <>
        <View style={{ flex: 1 }}>{content}</View>
        {aiModal}
      </>
    );
  }

  return (
    <FullScreenModal visible={visible} onClose={() => onClose?.()}>
      {content}
      {aiModal}
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    ...textStyles.h4,
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
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
    borderColor: "transparent",
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
    borderColor: "transparent",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  halfWidth: {
    flex: 1,
  },
  pickerTrigger: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
  },
  pickerTriggerBorderless: {
    height: 44,
    borderWidth: 0,
    borderRadius: 12,
  },
  dateInput: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    backgroundColor: colors.gray200,
  },
  dateInputBorderless: {
    borderWidth: 0,
    borderColor: "transparent",
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
    flexDirection: "row",
    alignItems: "center",
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
    textAlign: "left",
    backgroundColor: "transparent",
    fontFamily: typography.fontFamily.pretendardSemiBold,
    fontSize: 14,
    paddingHorizontal: 0,
    paddingVertical: 0,
    color: colors.primary,
  },
  currencyBadge: {
    marginLeft: 4,
    width: 44,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: `${colors.primary}10`,
    alignItems: "center",
  },
  amountSuffix: {
    ...textStyles.h6,
    color: colors.primary,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
  },
  categoryRowSecond: {
    marginTop: 8,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
