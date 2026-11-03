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
import {
  ItineraryCategory,
  itineraryCategoryColors,
  itineraryCategoryLabels,
  itineraryCategoryTints,
} from "@/types/itinerary";

const itineraryCategoryToExpenseCategory: Partial<Record<ItineraryCategory, ExpenseCategory>> = {
  [ItineraryCategory.MEAL]: ExpenseCategory.FOOD,
  [ItineraryCategory.TRANSPORT]: ExpenseCategory.TRANSPORT,
  [ItineraryCategory.ACTIVITY]: ExpenseCategory.ACTIVITY,
  [ItineraryCategory.SIGHTSEEING]: ExpenseCategory.SIGHTSEEING,
  [ItineraryCategory.SHOPPING]: ExpenseCategory.SHOPPING,
  [ItineraryCategory.ETC]: ExpenseCategory.ETC,
};

const toExpenseCategory = (category: ItineraryCategory | null) =>
  (category && itineraryCategoryToExpenseCategory[category]) ||
  ExpenseCategory.ETC;
import CalendarModal from "@/ui/components/CalendarModal.native";
import CurrencyToggle from "@/ui/components/CurrencyToggle";
import FloatingFooter from "@/ui/components/FloatingFooter.native";
import FullScreenModal from "@/ui/components/FullScreenModal.native";
import { TimeModal } from "@/ui/components/TimeModal.native";
import AttachmentSection from "@/ui/components/attachmentSection.native";
import Input from "@/ui/components/input/Input";
import PlacesSearchInput, { type PlaceResult } from "@/ui/components/PlacesSearchInput";
import { locationsApi, manualPlaceId } from "@/services/locations";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { textStyles, typography } from "@/ui/tokens/typography";
import { formatAmountWithCommas, normalizeAmount } from "@/utils/amountUtils";
import { handleGuestPromptError } from "@/utils/guestPrompt";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView, type KeyboardAwareScrollViewRef } from "react-native-keyboard-controller";
import CalendarIcon from "../../../../assets/mobile_calendar_black.svg";
import TimeIcon from "../../../../assets/mobile_time.svg";
import CloseIcon from "../../../../assets/x.svg";
import DownArrowIcon from "../../../../assets/down_arrow.svg";
import UpperArrowIcon from "../../../../assets/upper_arrow.svg";
import InfoCircleIcon from "../../../../assets/info_circle.svg";
import CityPicker from "@/ui/components/pickers/CityPicker";
import CountryPicker from "@/ui/components/pickers/CountryPicker";
import { useDiscardConfirm } from "@/hooks/useDiscardConfirm";
import { useToast } from "@/contexts/ToastContext";
import { spacing } from "@/ui/tokens/spacing";
import ScalePressable from "@/ui/components/ScalePressable";
import { MenuView } from "@react-native-menu/menu";

export interface ItineraryEditPrefill {
  title?: string;
  description?: string;
  location?: string;
  locationId?: number;
  locationLat?: number;
  locationLng?: number;
  locationAddress?: string;
  country?: string;
  city?: string;
  itineraryDate?: string;
  startTime?: string;
  endTime?: string;
  category?: ItineraryCategory;
}

interface ItineraryEditModalProps {
  visible: boolean;
  onClose?: (opts?: { fromSave?: boolean }) => void;
  itinerary: Itinerary | null;
  planId: number;
  defaultDate?: string;
  defaultCountry?: string;
  defaultCity?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  prefill?: ItineraryEditPrefill;
  embedded?: boolean;
  onSave?: (itinerary: Itinerary) => void;
  pendingAiResult?: { result: DocumentUploadAnalyzeResponse; filename?: string; pendingFiles?: LocalFile[] } | null;
  onRouteMismatchResult?: (result: DocumentUploadAnalyzeResponse, filename?: string, pendingFiles?: LocalFile[]) => void;
  showRecommendToast?: boolean;
}

const addOneHour = (time24: string): string => {
  if (!time24) return "01:00";
  const [hours, minutes] = time24.split(":").map(Number);
  const newHours = (hours + 1) % 24; 
  return `${newHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

const EXPENSE_CATEGORY_OPTIONS: ExpenseCategory[] = [
  ExpenseCategory.FOOD,
  ExpenseCategory.TRANSPORT,
  ExpenseCategory.ACTIVITY,
  ExpenseCategory.SIGHTSEEING,
  ExpenseCategory.ACCOMMODATION,
  ExpenseCategory.FLIGHT,
  ExpenseCategory.SHOPPING,
  ExpenseCategory.ETC,
];

export default function ItineraryEditModal({
  visible,
  onClose,
  itinerary,
  planId,
  defaultDate,
  defaultCountry,
  defaultCity,
  defaultStartTime,
  defaultEndTime,
  prefill,
  embedded,
  onSave,
  pendingAiResult,
  onRouteMismatchResult,
  showRecommendToast,
}: ItineraryEditModalProps) {
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const { showToast } = useToast();
  const [showErrors, setShowErrors] = useState(false);
  const locationDraftRef = useRef<PlaceResult | null>(null);
  const rawLocationTextRef = useRef<string>("");
  const prefillCoordsRef = useRef<{ lat: number; lng: number; address?: string; name: string; hasCoords: boolean } | null>(null);
  const recommendToastAnim = useRef(new Animated.Value(0)).current;
  const recommendToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    country: "",
    city: "",
    location: "",
    locationId: undefined as number | null | undefined,
    itineraryDate: dayjs().format("YYYY-MM-DD"),
    startTime: "09:00",
    endTime: "10:00",
  });
  const [expenseData, setExpenseData] = useState({
    amount: "",
    category: ExpenseCategory.ETC,
    currency: ExpenseCurrency.KRW,
  });
  const [existingExpenseId, setExistingExpenseId] = useState<number | null>(
    null,
  );
  const [selectedCategory, setSelectedCategory] = useState<ItineraryCategory | null>(null);
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



  useEffect(() => {
    if (visible && showRecommendToast) {
      recommendToastAnim.setValue(0);
      Animated.timing(recommendToastAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      if (recommendToastTimer.current) clearTimeout(recommendToastTimer.current);
      recommendToastTimer.current = setTimeout(() => {
        Animated.timing(recommendToastAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      }, 4000);
    }
    return () => {
      if (recommendToastTimer.current) clearTimeout(recommendToastTimer.current);
    };
  }, [visible, showRecommendToast]);

  useEffect(() => {
    if (!visible) {
      formInitializedRef.current = false;
      setShowErrors(false);
      baselineRef.current = null;
      locationDraftRef.current = null;
      rawLocationTextRef.current = "";
      prefillCoordsRef.current = null;
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
            location: latestItinerary.location?.name || "",
            locationId: latestItinerary.location?.id,
            itineraryDate:
              latestItinerary.itineraryDate || dayjs().format("YYYY-MM-DD"),
            startTime: latestItinerary.startTime
              ? latestItinerary.startTime.substring(0, 5)
              : "09:00",
            endTime: latestItinerary.endTime
              ? latestItinerary.endTime.substring(0, 5)
              : "10:00",
          });
          setSelectedCategory((latestItinerary.category as ItineraryCategory) ?? null);
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
            setExpenseData({ amount: "", category: toExpenseCategory((latestItinerary.category as ItineraryCategory) ?? null), currency: ExpenseCurrency.KRW });
            setExistingExpenseId(null);
          }
        } catch {
          setSelectedCategory((itinerary.category as ItineraryCategory) ?? null);
          setFormData({
            title: itinerary.title || "",
            description: itinerary.description || "",
            country: itinerary.country || "",
            city: itinerary.city || "",
            location: itinerary.location?.name || "",
            locationId: itinerary.location?.id,
            itineraryDate:
              itinerary.itineraryDate || dayjs().format("YYYY-MM-DD"),
            startTime: itinerary.startTime
              ? itinerary.startTime.substring(0, 5)
              : "09:00",
            endTime: itinerary.endTime
              ? itinerary.endTime.substring(0, 5)
              : "10:00",
          });
          setExpenseData({ amount: "", category: toExpenseCategory((itinerary.category as ItineraryCategory) ?? null), currency: ExpenseCurrency.KRW });
          setExistingExpenseId(null);
        }
        setBaselinePending(true);
      };
      loadLatest();
    } else {
      const initDate = prefill?.itineraryDate || defaultDate || dayjs().format("YYYY-MM-DD");
      setFormData({
        title: prefill?.title || "",
        description: prefill?.description || "",
        country: prefill?.country || defaultCountry || "",
        city: prefill?.city || defaultCity || "",
        location: prefill?.location || "",
        locationId: prefill?.locationId,
        itineraryDate: initDate,
        startTime: prefill?.startTime || defaultStartTime || "09:00",
        endTime: prefill?.endTime || defaultEndTime || "10:00",
      });
      setSelectedCategory(prefill?.category ?? null);
      setExpenseData({ amount: "", category: toExpenseCategory(prefill?.category ?? null), currency: ExpenseCurrency.KRW });
      setExistingExpenseId(null);
      if (prefill?.location) {
        const hasCoords = !!(prefill.locationLat && prefill.locationLng);
        prefillCoordsRef.current = {
          lat: prefill.locationLat ?? 0,
          lng: prefill.locationLng ?? 0,
          address: prefill.locationAddress,
          name: prefill.location,
          hasCoords,
        };
      } else {
        prefillCoordsRef.current = null;
      }
    }
    setPendingFiles([]);
    if (!itinerary) setBaselinePending(true);
  }, [visible, itinerary, defaultDate, defaultCountry, defaultCity, prefill]);
  const [baselinePending, setBaselinePending] = useState(false);
  const baselineRef = useRef<string | null>(null);
  const formSnapshot = JSON.stringify({ formData, selectedCategory, amount: expenseData.amount, currency: expenseData.currency });

  useEffect(() => {
    if (!baselinePending) return;
    baselineRef.current = formSnapshot;
    setBaselinePending(false);
  }, [baselinePending, formSnapshot]);

  const isDirty =
    baselineRef.current !== null &&
    (formSnapshot !== baselineRef.current || pendingFiles.length > 0);


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
    if (existingExpenseId !== null) return;
    setExpenseData(prev => ({
      ...prev,
      category: toExpenseCategory(selectedCategory),
    }));
  }, [selectedCategory]);

  useEffect(() => {
    if (visible && pendingAiResult) {
      const draft = pendingAiResult.result.draft;
      if (draft?.itemType === "itinerary") {
        applyItineraryDraftFromAi(draft, setFormData as any, () => {});
      }
      if (pendingAiResult.pendingFiles?.length) {
        setPendingFiles(pendingAiResult.pendingFiles);
      }
    }
  }, [visible, pendingAiResult]);

  const handlePlaceSelect = (place: PlaceResult) => {
    locationDraftRef.current = place;
    prefillCoordsRef.current = null;
    setFormData(prev => ({ ...prev, location: place.name }));
  };

  const handleExpenseAmountChange = (text: string) => {
    const formatted = formatAmountWithCommas(text);
    setExpenseData(prev => ({ ...prev, amount: formatted }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setShowErrors(true);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      showToast("입력되지 않은 값이 있어요.", { icon: "warning" });
      return;
    }

    setIsSubmitting(true);
    try {
      // 장소 draft → 저장 시점에 create/update
      let finalLocationId = formData.locationId;
      const draft = locationDraftRef.current;
      if (draft) {
        try {
          if (typeof finalLocationId === "number") {
            await locationsApi.updateLocation(finalLocationId, {
              name: draft.name, placeId: draft.placeId, latitude: draft.latitude, longitude: draft.longitude, address: draft.address, hasCoords: draft.hasCoords,
            });
          } else {
            const loc = await locationsApi.createLocation({
              name: draft.name, placeId: draft.placeId, latitude: draft.latitude,
              longitude: draft.longitude, address: draft.address, hasCoords: draft.hasCoords,
            });
            finalLocationId = loc.id;
          }
        } catch {
          finalLocationId = formData.locationId;
        }
        locationDraftRef.current = null;
      } else {
        const rawTyped = rawLocationTextRef.current.trim();
        const rawText = rawTyped || formData.location.trim();
        const originalName = itinerary?.location?.name ?? "";
        if (rawText && rawText !== originalName && rawTyped) {
          try {
            if (typeof finalLocationId === "number") {
              await locationsApi.updateLocation(finalLocationId, {
                name: rawText, placeId: manualPlaceId(rawText), latitude: 0, longitude: 0, address: undefined, hasCoords: false,
              });
            } else {
              const loc = await locationsApi.createLocation({
                name: rawText, placeId: manualPlaceId(rawText), latitude: 0, longitude: 0, hasCoords: false,
              });
              finalLocationId = loc.id;
            }
          } catch { /* ignore */ }
        } else if (!itinerary && !finalLocationId && prefillCoordsRef.current) {
          const pc = prefillCoordsRef.current;
          try {
            const nameHash = [...(pc.name || formData.location)].reduce((a, c) => (Math.imul(31, a) + c.charCodeAt(0)) >>> 0, 0).toString(16);
            const loc = await locationsApi.createLocation({
              name: pc.name || formData.location,
              placeId: `m_${nameHash}_${Math.random().toString(16).slice(2, 10)}`,
              latitude: pc.lat,
              longitude: pc.lng,
              address: pc.address,
              hasCoords: pc.hasCoords,
            });
            finalLocationId = loc.id;
          } catch {}
          prefillCoordsRef.current = null;
        }
      }

      let savedItinerary: Itinerary;
      if (itinerary) {
        savedItinerary = await itinerariesApi.updateItinerary(itinerary.id, {
          ...formData,
          locationId: finalLocationId,
          category: selectedCategory,
        });
      } else {
        savedItinerary = await itinerariesApi.createItinerary({
          ...formData,
          locationId: finalLocationId ?? undefined,
          planId,
          category: selectedCategory !== null ? selectedCategory : undefined,
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

      showToast(itinerary ? "일정을 수정했어요." : "일정을 저장했어요.");

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

  const { requestClose, discardConfirmModal } = useDiscardConfirm(
    isDirty,
    () => onClose?.(),
  );

  const handleRequestClose = () => {
    if (isSubmitting || isUploading) return;
    requestClose();
  };

  const titleError = showErrors && !formData.title.trim();

  const content = (
    <>
      {!embedded && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {itinerary ? "일정 수정" : "새 일정 추가"}
          </Text>
          <Pressable
            style={styles.closeButton}
            onPress={handleRequestClose}
            hitSlop={8}
          >
            <CloseIcon width={24} height={24} color={colors.gray700} />
          </Pressable>
        </View>
      )}
      <KeyboardAwareScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={40}
      >
        {/* 입력 필드들 */}
        <View style={styles.form}>
          {/* 일정명 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              일정 제목<Text style={styles.required}>*</Text>
            </Text>
            <Input
              variant="filled"
              value={formData.title}
              onChangeText={text => setFormData({ ...formData, title: text })}
              style={[
                styles.input,
                !itinerary && styles.inputBorderless,
                titleError && styles.fieldError,
              ]}
            />
            {titleError && (
              <Text style={styles.errorText}>제목을 입력해 주세요.</Text>
            )}
          </View>

          {/* 카테고리 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>카테고리</Text>
            <View style={styles.chipGroup}>
              {[...Object.values(ItineraryCategory), null].map(cat => {
                const isSelected = selectedCategory === cat;
                const color = cat ? itineraryCategoryColors[cat] : colors.gray700;
                return (
                  <ScalePressable
                    key={cat ?? "none"}
                    onPress={() => setSelectedCategory(cat)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected
                          ? color
                          : cat
                            ? itineraryCategoryTints[cat]
                            : colors.paletteFill,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.chipDot,
                        cat
                          ? { backgroundColor: isSelected ? colors.white : color }
                          : [
                              styles.chipDotOutline,
                              { borderColor: isSelected ? colors.white : color },
                            ],
                      ]}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? colors.white : cat ? color : colors.paletteFg2 },
                      ]}
                    >
                      {cat ? itineraryCategoryLabels[cat] : "선택 안 함"}
                    </Text>
                  </ScalePressable>
                );
              })}
            </View>
          </View>

          {/* 내용 (메모) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>내용 (메모)</Text>
            <Input
              variant="filled"
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
            <PlacesSearchInput
              value={formData.location}
              onSelect={handlePlaceSelect}
              onClear={() => { locationDraftRef.current = null; rawLocationTextRef.current = ""; prefillCoordsRef.current = null; setFormData(prev => ({ ...prev, location: "", locationId: null })); }}
              onRawInputChange={(t) => { locationDraftRef.current = null; rawLocationTextRef.current = t; prefillCoordsRef.current = null; }}
              bordered={!!itinerary}
              placeholder="장소를 검색하세요."
              cityContext={formData.city || formData.country || undefined}
              initialCoords={
                itinerary?.location?.hasCoords
                  ? { lat: itinerary.location.latitude, lng: itinerary.location.longitude }
                  : prefill?.locationLat != null && prefill?.locationLng != null
                    ? { lat: prefill.locationLat, lng: prefill.locationLng }
                    : undefined
              }
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              날짜<Text style={styles.required}>*</Text>
            </Text>
            <Pressable
              style={[
                styles.dateInput,
                !itinerary && styles.dateInputBorderless,
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.fieldIcon}>
                <CalendarIcon width={14} height={14} color={colors.paletteInk} />
              </View>
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
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              시간<Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.timeRow}>
              <View style={styles.halfWidth}>
                <Pressable
                  style={[
                    styles.dateInput,
                    !itinerary && styles.dateInputBorderless,
                  ]}
                  onPress={() => setShowStartTimeModal(true)}
                >
                  <View style={styles.fieldIcon}>
                    <TimeIcon width={14} height={14} color={colors.paletteInk} />
                  </View>
                  <Text style={styles.dateText}>
                    {formatTimeDisplay(formData.startTime)}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.timeDash}>–</Text>
              <View style={styles.halfWidth}>
                <Pressable
                  style={[
                    styles.dateInput,
                    !itinerary && styles.dateInputBorderless,
                  ]}
                  onPress={() => setShowEndTimeModal(true)}
                >
                  <View style={styles.fieldIcon}>
                    <TimeIcon width={14} height={14} color={colors.paletteInk} />
                  </View>
                  <Text style={styles.dateText}>
                    {formatTimeDisplay(formData.endTime)}
                  </Text>
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
            <View style={styles.inputGroup}>
              <Text style={styles.label}>카테고리</Text>
              <MenuView
                actions={EXPENSE_CATEGORY_OPTIONS.map(cat => ({
                  id: cat,
                  title: categoryLabels[cat],
                  state: expenseData.category === cat ? "on" : "off",
                }))}
                onPressAction={({ nativeEvent }) =>
                  setExpenseData(prev => ({
                    ...prev,
                    category: nativeEvent.event as ExpenseCategory,
                  }))
                }
              >
                <View style={styles.selectField}>
                  <Text style={styles.selectText}>
                    {categoryLabels[expenseData.category]}
                  </Text>
                  <DownArrowIcon width={10} height={10} color={colors.gray700} />
                </View>
              </MenuView>
            </View>

            <View style={styles.amountRow}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>금액</Text>
                <Input
                  variant="filled"
                  value={expenseData.amount}
                  onChangeText={handleExpenseAmountChange}
                  placeholder="0"
                  placeholderTextColor={colors.paletteFg3}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>통화</Text>
                <CurrencyToggle
                  value={expenseData.currency}
                  onChange={c => setExpenseData(prev => ({ ...prev, currency: c }))}
                  large
                  style={styles.currencyToggle}
                />
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
      </KeyboardAwareScrollView>

      <FloatingFooter
        primaryLabel={
          "저장"
        }
        onPrimaryPress={handleSave}
        primaryLoading={isSubmitting || isUploading}
        secondaryLabel="취소"
        onSecondaryPress={handleRequestClose}
      />
      {discardConfirmModal}
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
          applyItineraryDraftFromAi(draft, setFormData as any, () => {});
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
    <FullScreenModal
      visible={visible}
      onClose={handleRequestClose}
    >
      {content}
      {aiModal}
      {showRecommendToast && (
        <Animated.View style={[styles.recommendToast, { opacity: recommendToastAnim }]} pointerEvents="none">
          <InfoCircleIcon width={16} height={16} color={colors.white} style={{ flexShrink: 0 }} />
          <Text style={styles.recommendToastText}>
            {"일정이 입력 되었어요. 추천 시간을 확인하고 내 일정에 맞게 조정해 보세요."}
          </Text>
        </Animated.View>
      )}
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
  },
  chipDotOutline: {
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  chipText: {
    ...textStyles.h7,
  },
  fieldIcon: {
    opacity: 0.6,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  timeDash: {
    ...textStyles.body4,
    fontFamily: typography.fontFamily.pretendardMedium,
    color: colors.paletteFg2,
  },
  selectField: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radii.mdPlus,
    backgroundColor: colors.paletteFill,
  },
  selectText: {
    ...textStyles.body4,
    fontFamily: typography.fontFamily.pretendardMedium,
    color: colors.paletteInk,
    flex: 1,
  },
  amountRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  currencyToggle: {
    height: 44,
    borderRadius: radii.mdPlus,
    backgroundColor: colors.paletteFill,
  },
  fieldError: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: {
    ...textStyles.body6,
    color: colors.danger,
    marginTop: spacing.xs,
  },
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  form: {
    gap: spacing.lg,
  },
  inputGroup: {
    // marginBottom: 4,
  },
  label: {
    ...textStyles.h8,
    fontFamily: typography.fontFamily.pretendardBold,
    color: colors.paletteInk,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.warning,
  },
  input: {
    minHeight: 44,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: radii.mdPlus,
    backgroundColor: colors.paletteFill,
    fontFamily: typography.fontFamily.pretendardMedium,
  },
  inputBorderless: {
    borderColor: "transparent",
  },
  textArea: {
    ...textStyles.body4,
    fontFamily: typography.fontFamily.pretendardMedium,
    minHeight: 80,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: radii.mdPlus,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.paletteFill,
  },
  textAreaBorderless: {
    borderColor: "transparent",
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  pickerTrigger: {
    height: 44,
    borderWidth: 0,
    borderRadius: radii.mdPlus,
    backgroundColor: colors.paletteFill,
  },
  pickerTriggerBorderless: {
    height: 44,
    borderWidth: 0,
    borderRadius: radii.mdPlus,
    backgroundColor: colors.paletteFill,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.mdPlus,
    backgroundColor: colors.paletteFill,
  },
  dateInputBorderless: {
    borderWidth: 0,
    borderColor: "transparent",
  },
  dateText: {
    ...textStyles.body4,
    fontFamily: typography.fontFamily.pretendardMedium,
    fontVariant: ["tabular-nums"],
    color: colors.paletteInk,
  },
  placeholderText: {
    ...textStyles.body4,
    fontFamily: typography.fontFamily.pretendardMedium,
    color: colors.paletteFg3,
  },
  expenseSection: {
    marginTop: spacing.sm,
  },
  expenseSectionTitle: {
    ...textStyles.h5,
    color: colors.paletteInk,
    marginBottom: spacing.md,
  },
  expenseDivider: {
    height: 1,
    backgroundColor: colors.paletteFill2,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  attachmentSection: {
    marginTop: 32,
  },
  recommendToast: {
    position: "absolute",
    bottom: 110,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  recommendToastText: {
    ...textStyles.h7,
    color: colors.white,
    flex: 1,
  },
});
