import AiAnalyzeErrorBanner from "@/components/AiAnalyzeErrorBanner";
import AiDocumentAnalyzeModal from "@/components/modals/AiDocumentAnalyzeModal";
import BaseCalendar from "@/components/popup/calendar/BaseCalendar";
import { PLACEHOLDERS } from "@/constants/placeholders";
import { useAttachmentUpload } from "@/hooks/useAttachmentUpload";
import { useFilePicker } from "@/hooks/useFilePicker";
import { accommodationsApi } from "@/services/accommodations";
import { analyzeDocumentUpload } from "@/services/aiDocument";
import { attachmentsApi } from "@/services/attachments";
import type {
  AiDocumentItemDraft,
  Attachment,
  DocumentUploadAnalyzeResponse,
  LocalFile,
  StagedDocumentAnalyzePayload,
} from "@/types/api";
import { ExpenseCurrency, currencyLabels } from "@/types/expense";
import AttachmentSection from "@/ui/components/attachmentSection";
import type { AiAttachmentAnalyzeSelection } from "@/ui/components/attachmentSection.types";
import { pendingAiFileKey } from "@/ui/components/attachmentSection.types";
import Input from "@/ui/components/input/Input";
import { CityPicker, CountryPicker, TimePicker } from "@/ui/components/pickers";
import WarningBanner from "@/ui/components/toast/warning";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import { applyAccommodationDraftFromAi } from "@/utils/applyAiDocumentDraft";
import { buildAnalyzeUploadPayload } from "@/utils/attachmentAiAnalyze";
import {
  formatAttachmentUploadFailureMessage,
  showMessage,
} from "@/utils/crossPlatformAlert";
import { handleGuestPromptError } from "@/utils/guestPrompt";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import CalendarIcon from "../../../../assets/calender.svg";
import CloseIcon from "../../../../assets/close_sm.svg";
import PanelTabSwitcher from "../PanelTabSwitcher";
import { extendPlanIfNeeded } from "@/utils/extendPlanIfNeeded";

function getCountryCityFromSegments(
  segments:
    | { startDate: string; endDate: string; country: string; city: string }[]
    | undefined
    | null,
  date: string,
) {
  if (!segments || !date) return null;
  const matches = segments.filter(
    s => s.startDate <= date && date <= s.endDate,
  );
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1];
  return { country: last.country, city: last.city };
}

interface AccommodationItemProps {
  accommodation?: any;
  draft?: any;
  planId: number;
  planData?: any;
  onSave: (accommodation: any) => void;
  onCancel: () => void;
  onDelete?: (accommodationId: number | string) => void;
  onShowWarning?: (message?: string) => void;
  existingAccommodations?: any[];
  readOnly?: boolean;
  onEdit?: () => void;
  onPreviewChange?: (preview: any) => void;
  activeTab?: "itinerary" | "flight" | "accommodation";
  onTabChange?: (tab: "itinerary" | "flight" | "accommodation") => void;
  stagedDocumentAnalyze?: StagedDocumentAnalyzePayload | null;
  onConsumeStagedDocumentAnalyze?: () => void;
  routeDocumentAnalyzeSuccess?: (
    res: DocumentUploadAnalyzeResponse,
    carryPendingFiles?: LocalFile[],
    originEntityType?: string,
  ) => boolean;
  carryoverPendingFiles?: LocalFile[] | null;
  onConsumeCarryoverPendingFiles?: () => void;
}

export default function AccommodationItem({
  accommodation,
  draft,
  planId,
  planData,
  onSave,
  onCancel,
  onDelete,
  existingAccommodations = [],
  readOnly = false,
  onEdit,
  onPreviewChange,
  activeTab,
  onTabChange,
  stagedDocumentAnalyze,
  onConsumeStagedDocumentAnalyze,
  routeDocumentAnalyzeSuccess,
  carryoverPendingFiles,
  onConsumeCarryoverPendingFiles,
}: AccommodationItemProps) {
  const segments = planData?.plan?.segments;
  const isNewAccommodation = !accommodation?.id;

  const initialCheckinDate =
    accommodation?.checkinDate ||
    draft?.checkinDate ||
    dayjs().format("YYYY-MM-DD");
  const initialAutoFill = isNewAccommodation
    ? getCountryCityFromSegments(segments, initialCheckinDate)
    : null;

  const formatAmountWithCommas = (digits: string) => {
    if (!digits) return "";
    const normalized = digits.replace(/^0+(?=\d)/, "");
    return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const normalizeAmountToIntDigits = (value: unknown) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const integerPart = raw.split(".")[0];
    return integerPart.replace(/[^0-9]/g, "");
  };
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [formData, setFormData] = useState({
    name: accommodation?.name || "",
    place: accommodation?.place || "",
    country: accommodation?.country || initialAutoFill?.country || "",
    city: accommodation?.city || initialAutoFill?.city || "",
    checkin_date:
      accommodation?.checkinDate ||
      draft?.checkinDate ||
      dayjs().format("YYYY-MM-DD"),
    checkout_date:
      accommodation?.checkoutDate ||
      draft?.checkoutDate ||
      dayjs().add(1, "day").format("YYYY-MM-DD"),
    checkin_time: accommodation?.checkinTime || draft?.checkinTime || "15:00",
    checkout_time:
      accommodation?.checkoutTime || draft?.checkoutTime || "11:00",
    description: accommodation?.description || "",
  });

  const [expenseData, setExpenseData] = useState({
    amount: normalizeAmountToIntDigits(accommodation?.expense?.amount),
    currency: accommodation?.expense?.currency || ExpenseCurrency.KRW,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const [showCheckinDatePicker, setShowCheckinDatePicker] = useState(false);
  const [showCheckoutDatePicker, setShowCheckoutDatePicker] = useState(false);
  const [checkinTimeOpen, setCheckinTimeOpen] = useState(false);
  const [checkoutTimeOpen, setCheckoutTimeOpen] = useState(false);

  const [pendingFiles, setPendingFiles] = useState<LocalFile[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>(
    [],
  );
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);

  const [aiAnalyzeModalVisible, setAiAnalyzeModalVisible] = useState(false);
  const [aiAnalyzeResult, setAiAnalyzeResult] =
    useState<DocumentUploadAnalyzeResponse | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalyzeInlineError, setAiAnalyzeInlineError] = useState(false);
  const [aiAnalyzeInlineErrorMessage, setAiAnalyzeInlineErrorMessage] =
    useState("");
  const [aiAnalyzeSizeErrorMessage, setAiAnalyzeSizeErrorMessage] =
    useState("");
  const [lastAiSelection, setLastAiSelection] =
    useState<AiAttachmentAnalyzeSelection | null>(null);
  const [lastAnalyzeFileName, setLastAnalyzeFileName] = useState<string | null>(
    null,
  );
  const lastHandledAiAnalyzeSeqRef = useRef<number | null>(null);
  const aiAnalyzeCancelledRef = useRef(false);

  const [analyzeOriginEntityType, setAnalyzeOriginEntityType] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    if (!stagedDocumentAnalyze) return;
    const kind =
      stagedDocumentAnalyze.result.inferredItemType ??
      stagedDocumentAnalyze.result.draft?.itemType;
    if (kind !== "accommodation") return;
    if (readOnly) return;
    const { seq, result, originEntityType } = stagedDocumentAnalyze;
    if (lastHandledAiAnalyzeSeqRef.current === seq) return;
    lastHandledAiAnalyzeSeqRef.current = seq;
    setAnalyzeOriginEntityType(originEntityType);
    setAiAnalyzeResult(result);
    setAiAnalyzeModalVisible(true);
  }, [stagedDocumentAnalyze, readOnly]);

  const { pickImage, pickDocument } = useFilePicker();
  const { isUploading, uploadedCount, totalCount, uploadFiles } = useAttachmentUpload({
    planId,
    entityType: "accommodation",
  });

  useEffect(() => {
    if (accommodation) {
      const checkinDate =
        accommodation.checkinDate || dayjs().format("YYYY-MM-DD");
      const segmentFill = !accommodation.id
        ? getCountryCityFromSegments(segments, checkinDate)
        : null;
      setFormData({
        name: accommodation.name || "",
        place: accommodation.place || "",
        country: accommodation.country || segmentFill?.country || "",
        city: accommodation.city || segmentFill?.city || "",
        checkin_date: checkinDate,
        checkout_date:
          accommodation.checkoutDate ||
          dayjs().add(1, "day").format("YYYY-MM-DD"),
        checkin_time: (accommodation.checkinTime || "15:00").substring(0, 5),
        checkout_time: (accommodation.checkoutTime || "11:00").substring(0, 5),
        description: accommodation.description || "",
      });

      setExpenseData(prev => ({
        ...prev,
        amount: normalizeAmountToIntDigits(accommodation?.expense?.amount),
        currency:
          (accommodation?.expense?.currency as ExpenseCurrency) ||
          prev.currency ||
          ExpenseCurrency.KRW,
      }));
    }
  }, [accommodation]);

  useEffect(() => {
    if (isNewAccommodation && segments) {
      setFormData(prev => {
        if (prev.country || prev.city) return prev;
        const autoFill = getCountryCityFromSegments(
          segments,
          prev.checkin_date,
        );
        if (!autoFill) return prev;
        return { ...prev, country: autoFill.country, city: autoFill.city };
      });
    }
  }, [segments, accommodation]);

  const [countryOpen, setCountryOpen] = useState(false);
  useEffect(() => {
    if (!readOnly && onPreviewChange) {
      onPreviewChange({
        checkinDate: formData.checkin_date,
        checkoutDate: formData.checkout_date,
        checkinTime: formData.checkin_time,
        checkoutTime: formData.checkout_time,
        name: formData.name,
      });
    }
  }, [formData, readOnly, onPreviewChange]);

  const accommodationAttachmentEntityId = useMemo(() => {
    const raw = accommodation?.id;
    if (raw == null || raw === "") return undefined;
    const n = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
    return Number.isFinite(n) ? n : undefined;
  }, [accommodation?.id]);

  useEffect(() => {
    const id = accommodationAttachmentEntityId;
    if (id == null) {
      setExistingAttachments([]);
      setIsLoadingAttachments(false);
      return;
    }
    let cancelled = false;
    setExistingAttachments([]);
    setIsLoadingAttachments(true);
    attachmentsApi
      .getAttachments(planId, "accommodation", id)
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
  }, [accommodationAttachmentEntityId, planId]);

  useEffect(() => {
    setPendingFiles(prev => {
      if (Platform.OS === "web") {
        prev.forEach(f => {
          if (f.uri?.startsWith("blob:")) {
            try {
              URL.revokeObjectURL(f.uri);
            } catch {
              /* noop */
            }
          }
        });
      }
      return [];
    });
  }, [accommodationAttachmentEntityId]);

  useEffect(() => {
    if (readOnly) {
      setPendingFiles(prev => {
        if (Platform.OS === "web") {
          prev.forEach(f => {
            if (f.uri?.startsWith("blob:")) {
              try {
                URL.revokeObjectURL(f.uri);
              } catch {
                /* noop */
              }
            }
          });
        }
        return [];
      });
    }
  }, [readOnly]);

  useEffect(() => {
    if (!carryoverPendingFiles?.length) return;
    setPendingFiles(prev => {
      const keys = new Set(prev.map(pendingAiFileKey));
      const merged = [...prev];
      for (const f of carryoverPendingFiles) {
        const k = pendingAiFileKey(f);
        if (!keys.has(k)) {
          keys.add(k);
          merged.push(f);
        }
      }
      return merged;
    });
    onConsumeCarryoverPendingFiles?.();
  }, [carryoverPendingFiles, onConsumeCarryoverPendingFiles]);

  const appendImage = async () => {
    try {
      const f = await pickImage();
      if (f) setPendingFiles(p => [...p, f]);
    } catch (e) {
      showMessage(
        "알림",
        e instanceof Error ? e.message : "파일을 선택하지 못했습니다.",
      );
    }
  };

  const appendDocument = async () => {
    try {
      const f = await pickDocument();
      if (f) setPendingFiles(p => [...p, f]);
    } catch (e) {
      showMessage(
        "알림",
        e instanceof Error ? e.message : "파일을 선택하지 못했습니다.",
      );
    }
  };

  const removePendingAt = (index: number) => {
    setPendingFiles(prev => {
      const t = prev[index];
      if (Platform.OS === "web" && t?.uri?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(t.uri);
        } catch {
          /* noop */
        }
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRemoveExistingAttachment = async (attachmentId: number) => {
    try {
      await attachmentsApi.deleteAttachment(attachmentId);
      setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error) {
      if (handleGuestPromptError(error)) return;
      showMessage("알림", "첨부파일 삭제에 실패했습니다.");
    }
  };

  const showAttachmentSection =
    !readOnly ||
    (readOnly &&
      accommodationAttachmentEntityId != null &&
      existingAttachments.length > 0);

  const handleSave = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    if (
      !formData.name.trim() ||
      !formData.checkin_date ||
      !formData.checkout_date ||
      !formData.checkin_time ||
      !formData.checkout_time
    ) {
      setWarningMessage("입력되지 않은 값이 있어요.");
      setShowWarning(true);
      return;
    }

    const newCheckin = dayjs(
      `${formData.checkin_date} ${formData.checkin_time}`,
    );
    const newCheckout = dayjs(
      `${formData.checkout_date} ${formData.checkout_time}`,
    );

    if (newCheckout.isSame(newCheckin) || newCheckout.isBefore(newCheckin)) {
      setWarningMessage("체크아웃은 체크인보다 늦어야 해요.");
      setShowWarning(true);
      return;
    }

    for (const existingAccommodation of existingAccommodations) {
      if (accommodation && existingAccommodation.id === accommodation.id) {
        continue;
      }

      const existingCheckin = dayjs(
        `${existingAccommodation.checkinDate} ${existingAccommodation.checkinTime || "00:00:00"}`,
      );
      const existingCheckout = dayjs(
        `${existingAccommodation.checkoutDate} ${existingAccommodation.checkoutTime || "00:00:00"}`,
      );

      const hasOverlap =
        ((newCheckin.isAfter(existingCheckin) ||
          newCheckin.isSame(existingCheckin)) &&
          newCheckin.isBefore(existingCheckout)) ||
        (newCheckout.isAfter(existingCheckin) &&
          (newCheckout.isBefore(existingCheckout) ||
            newCheckout.isSame(existingCheckout))) ||
        (newCheckin.isBefore(existingCheckin) &&
          newCheckout.isAfter(existingCheckout));

      if (hasOverlap) {
        setWarningMessage("겹치는 숙박 일정이 있어요");
        setShowWarning(true);
        return;
      }
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      let savedAccommodation;
      if (accommodation && accommodation.id) {
        savedAccommodation = await accommodationsApi.updateAccommodation(
          accommodation.id,
          {
            name: formData.name,
            place: formData.place || undefined,
            country: formData.country?.trim() || undefined,
            city: formData.city?.trim() || undefined,
            checkinDate: formData.checkin_date,
            checkoutDate: formData.checkout_date,
            checkinTime: formData.checkin_time + ":00",
            checkoutTime: formData.checkout_time + ":00",
            description: formData.description || undefined,
            expense: {
              exDate: formData.checkin_date,
              amount: Number.parseInt(expenseData.amount || "0", 10) || 0,
              category: "accommodation" as any,
              currency: expenseData.currency as ExpenseCurrency,
              description: formData.name,
            },
          },
        );
      } else {
        // 추가
        savedAccommodation = await accommodationsApi.createAccommodation({
          planId: planId,
          name: formData.name,
          place: formData.place || undefined,
          country: formData.country?.trim() || undefined,
          city: formData.city?.trim() || undefined,
          checkinDate: formData.checkin_date,
          checkoutDate: formData.checkout_date,
          checkinTime: formData.checkin_time + ":00",
          checkoutTime: formData.checkout_time + ":00",
          description: formData.description || undefined,
          expense: {
            exDate: formData.checkin_date,
            amount: Number.parseInt(expenseData.amount || "0", 10) || 0,
            category: "accommodation" as any,
            currency: expenseData.currency as ExpenseCurrency,
            description: formData.name,
          },
        });
        await extendPlanIfNeeded(planId, planData?.plan, [formData.checkin_date, formData.checkout_date]);
      }
      if (pendingFiles.length > 0 && savedAccommodation?.id) {
        try {
          await uploadFiles(pendingFiles, savedAccommodation.id);
          const list = await attachmentsApi.getAttachments(
            planId,
            "accommodation",
            savedAccommodation.id,
          );
          setExistingAttachments(list);
          setPendingFiles([]);
        } catch (e) {
          if (!handleGuestPromptError(e)) {
            showMessage(
              "알림",
              formatAttachmentUploadFailureMessage(
                e,
                "숙박은 저장됐으나 일부 파일 업로드에 실패했습니다.",
              ),
            );
          }
        }
      }
      onSave(savedAccommodation);
    } catch (_error) {
      // Silent fail
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    if (!accommodation) {
      onCancel();
      return;
    }

    if (accommodation && accommodation.id && onDelete) {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      try {
        await accommodationsApi.deleteAccommodation(accommodation.id);
        const id =
          typeof accommodation.id === "string"
            ? accommodation.id
            : accommodation.id.toString();
        onDelete(id);
        onCancel();
      } catch (_error) {
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const _currencyOptions = useMemo(
    () => [
      { label: "KRW", value: ExpenseCurrency.KRW },
      { label: "USD", value: ExpenseCurrency.USD },
      { label: "EUR", value: ExpenseCurrency.EUR },
      { label: "JPY", value: ExpenseCurrency.JPY },
    ],
    [],
  );

  const handleAiAnalyzePress = useCallback(
    async (selection: AiAttachmentAnalyzeSelection) => {
      setAiAnalyzeInlineError(false);
      setAiAnalyzeInlineErrorMessage("");
      setAiAnalyzeSizeErrorMessage("");
      const AI_MAX_SIZE = 10 * 1024 * 1024;
      const oversizeFile =
        selection.kind === "pending"
          ? pendingFiles.find(f => pendingAiFileKey(f) === selection.key)
          : undefined;
      const oversizeExisting =
        selection.kind === "existing"
          ? existingAttachments.find(a => a.id === selection.id)
          : undefined;
      const oversizeBytes = oversizeFile?.size ?? oversizeExisting?.fileSize;
      const oversizeName =
        oversizeFile?.name ?? oversizeExisting?.fileName ?? "파일";
      if (oversizeBytes !== undefined && oversizeBytes > AI_MAX_SIZE) {
        setAiAnalyzeSizeErrorMessage(
          `"${oversizeName}"은(는) 10MB를 넘어 분석할 수 없어요.`,
        );
        return;
      }
      aiAnalyzeCancelledRef.current = false;
      setIsAiAnalyzing(true);
      try {
        const payload = await buildAnalyzeUploadPayload(selection, {
          pendingFiles,
          existingAttachments,
        });
        setLastAnalyzeFileName(payload.filename);
        const res = await analyzeDocumentUpload(payload.file, {
          filename: payload.filename,
        });
        if (aiAnalyzeCancelledRef.current) return;
        const err = res.error?.trim();
        if (!res.success || err) {
          setLastAiSelection(selection);
          setAiAnalyzeInlineError(true);
          return;
        }
        if (routeDocumentAnalyzeSuccess?.(res, pendingFiles, "숙박")) {
          return;
        }
        setAiAnalyzeResult(res);
        setAiAnalyzeModalVisible(true);
      } catch (_e) {
        if (aiAnalyzeCancelledRef.current) return;
        setLastAiSelection(selection);
        setAiAnalyzeInlineErrorMessage(
          "분석 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
        setAiAnalyzeInlineError(true);
      } finally {
        setIsAiAnalyzing(false);
      }
    },
    [pendingFiles, existingAttachments, routeDocumentAnalyzeSuccess],
  );

  const applyAiAnalyzeDraftToForm = useCallback(
    (draft: AiDocumentItemDraft) => {
      applyAccommodationDraftFromAi(draft, setFormData, setExpenseData);
    },
    [],
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>
          {readOnly
            ? "숙박 정보"
            : accommodation && accommodation.id
              ? "숙박 수정"
              : "숙박 추가"}
        </Text>
        {readOnly || accommodation ? (
          <Pressable onPress={onCancel} style={styles.closeButton}>
            <CloseIcon width={12} height={12} color={colors.gray600} />
          </Pressable>
        ) : null}
      </View>
      {!readOnly && (
        <PanelTabSwitcher activeTab={activeTab} onTabChange={onTabChange} />
      )}
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          { overflow: "visible" },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 기본 정보 섹션 */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              숙소명 <Text style={{ color: colors.warning }}>*</Text>
            </Text>
            <Input
              variant="filled"
              placeholder={PLACEHOLDERS.accommodation.name}
              value={formData.name}
              onChangeText={text =>
                !readOnly && setFormData({ ...formData, name: text })
              }
              style={readOnly ? styles.readOnlyInput : styles.input}
              placeholderTextColor={colors.gray600}
              editable={!readOnly}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>내용</Text>
            <Input
              variant="filled"
              placeholder={PLACEHOLDERS.itinerary.descriptionForm}
              value={formData.description}
              onChangeText={text =>
                !readOnly && setFormData({ ...formData, description: text })
              }
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={readOnly ? styles.readOnlyTextArea : styles.textArea}
              placeholderTextColor={colors.gray600}
              editable={!readOnly}
            />
          </View>

          <View
            style={[
              styles.row,
              { gap: spacing.sm, zIndex: countryOpen ? 10000 : 1 },
            ]}
          >
            <View
              style={[
                styles.inputGroup,
                styles.halfWidth,
                { zIndex: countryOpen ? 10000 : 1 },
              ]}
            >
              <Text style={styles.label}>국가</Text>
              <CountryPicker
                value={formData.country}
                onChange={(name: string) =>
                  !readOnly && setFormData({ ...formData, country: name, city: "" })
                }
                placeholder={PLACEHOLDERS.picker.country}
                onOpen={() => !readOnly && setCountryOpen(true)}
                onClose={() => setCountryOpen(false)}
                disabled={readOnly}
                useModal
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>도시</Text>
              <CityPicker
                value={formData.city}
                onChange={name => !readOnly && setFormData({ ...formData, city: name })}
                countryKo={formData.country}
                placeholder={PLACEHOLDERS.accommodation.city}
                disabled={readOnly}
                useModal
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>장소</Text>
            <Input
              variant="filled"
              placeholder={PLACEHOLDERS.accommodation.place}
              value={formData.place}
              onChangeText={text =>
                !readOnly && setFormData({ ...formData, place: text })
              }
              style={readOnly ? styles.readOnlyInput : styles.input}
              placeholderTextColor={colors.gray600}
              editable={!readOnly}
            />
          </View>

          <View
            style={[
              styles.row,
              {
                gap: spacing.sm,
                zIndex: showCheckinDatePicker
                  ? 30000
                  : checkinTimeOpen
                    ? 20002
                    : 1,
              },
            ]}
          >
            <View
              style={[
                styles.inputGroup,
                styles.halfWidth,
                { position: "relative" },
              ]}
            >
              <Text style={styles.label}>
                체크인 날짜 <Text style={{ color: colors.warning }}>*</Text>
              </Text>
              <Pressable
                style={
                  readOnly
                    ? [
                        styles.dateInput,
                        { borderColor: colors.gray400, borderWidth: 1 },
                      ]
                    : styles.dateInput
                }
                onPress={() => !readOnly && setShowCheckinDatePicker(true)}
                disabled={readOnly}
              >
                <View style={styles.dateTextContainer}>
                  <Text
                    style={
                      formData.checkin_date
                        ? styles.dateText
                        : styles.placeholderText
                    }
                  >
                    {formData.checkin_date
                      ? dayjs(formData.checkin_date).format("YYYY.MM.DD")
                      : "기타"}
                  </Text>
                  {!readOnly && (
                    <View style={styles.iconWrapper}>
                      <CalendarIcon width={16} height={16} />
                    </View>
                  )}
                </View>
              </Pressable>
              {!readOnly && showCheckinDatePicker && (
                <BaseCalendar
                  visible={true}
                  selectedDate={formData.checkin_date}
                  onDayPress={day => {
                    const autoFill = !accommodation?.id
                      ? getCountryCityFromSegments(segments, day.dateString)
                      : null;
                    setFormData({
                      ...formData,
                      checkin_date: day.dateString,
                      ...(autoFill
                        ? { country: autoFill.country, city: autoFill.city }
                        : {}),
                    });
                    setShowCheckinDatePicker(false);
                  }}
                  onClose={() => setShowCheckinDatePicker(false)}
                  style={styles.calendarPopup}
                  minDate={undefined}
                  hideButtons={true}
                  autoCloseOnSelect={true}
                />
              )}
            </View>
            <View
              style={[
                styles.inputGroup,
                styles.halfWidth,
                { position: "relative" },
              ]}
            >
              <Text style={styles.label}>
                체크인 시간 <Text style={{ color: colors.warning }}>*</Text>
              </Text>
              <TimePicker
                value={formData.checkin_time}
                onChange={time =>
                  !readOnly && setFormData({ ...formData, checkin_time: time })
                }
                onOpen={() => {
                  if (!readOnly) {
                    setCheckinTimeOpen(true);
                    if (checkoutTimeOpen) {
                      setCheckoutTimeOpen(false);
                    }
                  }
                }}
                onClose={() => setCheckinTimeOpen(false)}
                popupAlign="right"
                style={
                  readOnly
                    ? {
                        backgroundColor: colors.gray200,
                        borderColor: colors.gray400,
                        borderWidth: 1,
                      }
                    : styles.timePicker
                }
                disabled={readOnly}
              />
            </View>
          </View>

          <View
            style={[
              styles.row,
              {
                gap: spacing.sm,
                zIndex: showCheckoutDatePicker
                  ? 30000
                  : checkoutTimeOpen
                    ? 20001
                    : 1,
              },
            ]}
          >
            <View
              style={[
                styles.inputGroup,
                styles.halfWidth,
                { position: "relative" },
              ]}
            >
              <Text style={styles.label}>
                체크아웃 날짜 <Text style={{ color: colors.warning }}>*</Text>
              </Text>
              <Pressable
                style={
                  readOnly
                    ? [
                        styles.dateInput,
                        { borderColor: colors.gray400, borderWidth: 1 },
                      ]
                    : styles.dateInput
                }
                onPress={() => !readOnly && setShowCheckoutDatePicker(true)}
                disabled={readOnly}
              >
                <View style={styles.dateTextContainer}>
                  <Text
                    style={
                      formData.checkout_date
                        ? styles.dateText
                        : styles.placeholderText
                    }
                  >
                    {formData.checkout_date
                      ? dayjs(formData.checkout_date).format("YYYY.MM.DD")
                      : "기타"}
                  </Text>
                  {!readOnly && (
                    <View style={styles.iconWrapper}>
                      <CalendarIcon width={16} height={16} />
                    </View>
                  )}
                </View>
              </Pressable>
              {!readOnly && showCheckoutDatePicker && (
                <BaseCalendar
                  visible={true}
                  selectedDate={formData.checkout_date}
                  onDayPress={day => {
                    setFormData({ ...formData, checkout_date: day.dateString });
                    setShowCheckoutDatePicker(false);
                  }}
                  onClose={() => setShowCheckoutDatePicker(false)}
                  style={styles.calendarPopup}
                  minDate={formData.checkin_date}
                  hideButtons={true}
                  autoCloseOnSelect={true}
                />
              )}
            </View>
            <View
              style={[
                styles.inputGroup,
                styles.halfWidth,
                { position: "relative" },
              ]}
            >
              <Text style={styles.label}>
                체크아웃 시간 <Text style={{ color: colors.warning }}>*</Text>
              </Text>
              <TimePicker
                value={formData.checkout_time}
                onChange={time =>
                  !readOnly && setFormData({ ...formData, checkout_time: time })
                }
                onOpen={() => {
                  if (!readOnly) {
                    setCheckoutTimeOpen(true);
                    if (checkinTimeOpen) {
                      setCheckinTimeOpen(false);
                    }
                  }
                }}
                onClose={() => setCheckoutTimeOpen(false)}
                popupAlign="right"
                style={
                  readOnly
                    ? {
                        backgroundColor: colors.gray200,
                        borderColor: colors.gray400,
                        borderWidth: 1,
                      }
                    : styles.timePicker
                }
                disabled={readOnly}
              />
            </View>
          </View>

          <View style={[styles.row, { gap: spacing.sm }]}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>숙박료</Text>
              <View style={styles.amountInputWrapper}>
                <Input
                  variant="filled"
                  placeholder={PLACEHOLDERS.expense.amount}
                  value={formatAmountWithCommas(expenseData.amount.toString())}
                  onChangeText={text => {
                    if (readOnly) return;
                    setExpenseData({
                      ...expenseData,
                      amount: normalizeAmountToIntDigits(text),
                    });
                  }}
                  keyboardType="numeric"
                  style={[
                    readOnly ? styles.readOnlyInput : styles.input,
                    styles.amountInputPadding,
                  ]}
                  placeholderTextColor={colors.gray600}
                  editable={!readOnly}
                />
                <Text style={styles.amountSuffix} pointerEvents="none">
                  {currencyLabels[ExpenseCurrency.KRW]}
                </Text>
              </View>
            </View>
          </View>

          {showAttachmentSection && (
            <AttachmentSection
              style={styles.attachmentSection}
              pendingFiles={readOnly ? [] : pendingFiles}
              onPickImage={appendImage}
              onPickDocument={appendDocument}
              onRemoveFile={removePendingAt}
              onAppendPendingFiles={
                Platform.OS === "web"
                  ? files => setPendingFiles(p => [...p, ...files])
                  : undefined
              }
              existingAttachments={existingAttachments}
              onRemoveExisting={
                !readOnly && accommodationAttachmentEntityId != null
                  ? handleRemoveExistingAttachment
                  : undefined
              }
              isLoadingExisting={false}
              isUploading={isUploading}
              disabled={readOnly || isSubmitting}
              hideAddControls={readOnly}
              onAiAnalyzePress={
                Platform.OS === "web" && !readOnly
                  ? handleAiAnalyzePress
                  : undefined
              }
              isAiAnalyzing={isAiAnalyzing}
              onCancelAiAnalyze={() => {
                aiAnalyzeCancelledRef.current = true;
                setIsAiAnalyzing(false);
              }}
            />
          )}
          {aiAnalyzeInlineError && lastAiSelection && (
            <AiAnalyzeErrorBanner
              message={aiAnalyzeInlineErrorMessage || undefined}
              onRetry={() => {
                setAiAnalyzeInlineError(false);
                setAiAnalyzeInlineErrorMessage("");
                handleAiAnalyzePress(lastAiSelection);
              }}
            />
          )}
          {!!aiAnalyzeSizeErrorMessage && (
            <AiAnalyzeErrorBanner
              message={aiAnalyzeSizeErrorMessage}
              showTitle={false}
              showRetry={false}
            />
          )}

          {/* 하단 버튼 */}
          {!readOnly ? (
            <View
              style={[styles.buttonRow, { position: "relative", zIndex: -1 }]}
            >
              <Pressable
                style={styles.deleteButton}
                onPress={accommodation?.id ? handleDelete : onCancel}
                disabled={isSubmitting}
              >
                <Text style={styles.deleteButtonText}>
                  {accommodation?.id ? "삭제" : "취소"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.saveButton}
                onPress={handleSave}
                disabled={isSubmitting || isUploading}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {(isSubmitting || isUploading) && (
                    <ActivityIndicator size="small" color="white" />
                  )}
                  <Text style={styles.saveButtonText}>
                    {isUploading
                      ? totalCount > 1
                        ? `업로드 중... (${uploadedCount}/${totalCount})`
                        : "업로드 중..."
                      : isSubmitting
                        ? "저장 중..."
                        : "저장"}
                  </Text>
                </View>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.buttonRow, { position: "relative" }]}>
              <Pressable
                style={styles.deleteButton}
                onPress={handleDelete}
                disabled={isSubmitting}
              >
                <Text style={styles.deleteButtonText}>삭제</Text>
              </Pressable>
              <Pressable
                style={[styles.saveButton, { backgroundColor: colors.gray900 }]}
                onPress={onEdit}
              >
                <Text style={styles.saveButtonText}>수정</Text>
              </Pressable>
            </View>
          )}
          <WarningBanner
            message={warningMessage}
            visible={showWarning}
            duration={3000}
            bottomOffset={70}
            onHide={() => {
              setShowWarning(false);
              setWarningMessage("");
            }}
          />
        </View>
      </ScrollView>
      <AiDocumentAnalyzeModal
        visible={aiAnalyzeModalVisible}
        analyzeResult={aiAnalyzeResult}
        analyzeFileName={lastAnalyzeFileName ?? undefined}
        onApply={applyAiAnalyzeDraftToForm}
        onClose={() => {
          setAiAnalyzeModalVisible(false);
          setAiAnalyzeResult(null);
          onConsumeStagedDocumentAnalyze?.();
        }}
        entityTypeLabel="숙박"
        originEntityType={analyzeOriginEntityType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    ...textStyles.h5,
  },
  closeButton: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: colors.gray200,
    justifyContent: "center",
    alignItems: "center",
  },
  formSection: {
    gap: spacing.lg,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    overflow: "visible",
    position: "relative",
  },
  inputGroup: {
    gap: spacing.sm,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    ...textStyles.h8,
    color: colors.black,
  },
  input: {
    backgroundColor: colors.gray200,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...textStyles.body4,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.gray200,
    maxHeight: 40,
  },
  dateTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  dateText: {
    ...textStyles.body4,
    color: colors.black,
  },
  placeholderText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  iconWrapper: {
    marginTop: 0,
  },
  calendarPopup: {
    position: "absolute",
    top: 70,
    left: 0,
    zIndex: 30000,
  },
  timePicker: {
    borderWidth: 0,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    height: 40,
  },
  currencyDisplay: {
    backgroundColor: colors.gray200,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: "center",
  },
  currencyText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  amountInputWrapper: {
    position: "relative",
  },
  amountInputPadding: {
    // suffix(원) 공간만큼만 비우고, 숫자는 오른쪽으로 붙여서 "숫자 + 원"이 바로 붙어 보이게 함
    paddingRight: 20,
    textAlign: "right",
  },
  amountSuffix: {
    position: "absolute",
    right: spacing.sm,
    top: "50%",
    transform: [{ translateY: -10 }],
    ...textStyles.body4,
    color: colors.black,
  },
  attachmentSection: {
    marginTop: spacing.lg,
    width: "100%",
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  deleteButton: {
    backgroundColor: colors.gray300,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 90,
  },
  deleteButtonText: {
    ...textStyles.h8,
    color: colors.black,
  },
  saveButton: {
    backgroundColor: colors.primary,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  saveButtonText: {
    ...textStyles.h8,
    color: colors.white,
  },
  textArea: {
    backgroundColor: colors.gray200,
    height: 80,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...textStyles.body4,
  },
  readOnlyInput: {
    backgroundColor: colors.gray200,
    borderWidth: 1,
    borderColor: colors.gray400,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...textStyles.body4,
  },
  readOnlyTextArea: {
    backgroundColor: colors.gray200,
    borderWidth: 1,
    borderColor: colors.gray400,
    height: 80,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...textStyles.body4,
  },
});
