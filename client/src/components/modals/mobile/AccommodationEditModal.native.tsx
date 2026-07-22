import { useAttachmentUpload } from "@/hooks/useAttachmentUpload";
import { useFilePicker } from "@/hooks/useFilePicker";
import { useMe } from "@/hooks/useMe";
import { accommodationsApi } from "@/services/accommodations";
import { attachmentsApi } from "@/services/attachments";
import type { Accommodation, Attachment, LocalFile } from "@/types/api";
import { ExpenseCurrency } from "@/types/expense";
import CalendarModal from "@/ui/components/CalendarModal.native";
import FloatingFooter from "@/ui/components/FloatingFooter.native";
import FullScreenModal from "@/ui/components/FullScreenModal.native";
import { TimeModal } from "@/ui/components/TimeModal.native";
import AttachmentSection from "@/ui/components/attachmentSection.native";
import Input from "@/ui/components/input/Input";
import { colors } from "@/ui/tokens/colors";
import { textStyles, typography } from "@/ui/tokens/typography";
import { handleGuestPromptError } from "@/utils/guestPrompt";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import CalendarIcon from "../../../../assets/mobile_calendar_black.svg";
import TimeIcon from "../../../../assets/mobile_time.svg";
import CloseIcon from "../../../../assets/x.svg";
import CityPicker from "@/ui/components/pickers/CityPicker";
import CountryPicker from "@/ui/components/pickers/CountryPicker";

interface AccommodationEditModalProps {
  visible: boolean;
  onClose?: (opts?: { fromSave?: boolean }) => void;
  accommodation: Accommodation | null;
  planId: number;
  defaultDate?: string;
  embedded?: boolean;
  onSave?: (accommodation: Accommodation) => void;
  onDelete?: (accommodationId: number) => void;
}

const formatDate = (dateStr: string) => {
  return dayjs(dateStr).format("YYYY.MM.DD");
};

const formatTimeDisplay = (timeStr: string) => {
  const [hour, minute] = timeStr.split(":");
  const hourNum = Number.parseInt(hour, 10) || 0;
  const period = hourNum < 12 ? "오전" : "오후";
  const displayHour =
    hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
  return `${period} ${displayHour.toString().padStart(2, "0")}:${minute || "00"}`;
};

const timeToMinutes = (timeStr: string) => {
  const [h, m] = timeStr.split(":");
  return (Number.parseInt(h, 10) || 0) * 60 + (Number.parseInt(m, 10) || 0);
};

const normalizeAmount = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.replace(/[^0-9]/g, "");
};

export default function AccommodationEditModal({
  visible,
  onClose,
  accommodation,
  planId,
  defaultDate,
  embedded,
  onSave,
  onDelete,
}: AccommodationEditModalProps) {
  const scrollRef = useRef<ScrollView>(null);
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
    name: "",
    description: "",
    country: "",
    city: "",
    place: "",
    checkinDate: dayjs().format("YYYY-MM-DD"),
    checkoutDate: dayjs().add(1, "day").format("YYYY-MM-DD"),
    checkinTime: "15:00",
    checkoutTime: "11:00",
  });
  const [expenseAmount, setExpenseAmount] = useState("");
  const [showCheckinDatePicker, setShowCheckinDatePicker] = useState(false);
  const [showCheckoutDatePicker, setShowCheckoutDatePicker] = useState(false);
  const [timeModalField, setTimeModalField] = useState<
    "checkin" | "checkout" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<LocalFile[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>(
    [],
  );
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);

  const { pickImage, pickDocument } = useFilePicker();
  const { data: me } = useMe();
  const { isUploading, uploadFiles } = useAttachmentUpload({
    planId,
    entityType: "accommodation",
  });

  useEffect(() => {
    if (visible && accommodation) {
      setFormData({
        name: accommodation.name || "",
        description: accommodation.description || "",
        country: accommodation.country || "",
        city: accommodation.city || "",
        place: accommodation.place || "",
        checkinDate: accommodation.checkinDate || dayjs().format("YYYY-MM-DD"),
        checkoutDate:
          accommodation.checkoutDate ||
          dayjs().add(1, "day").format("YYYY-MM-DD"),
        checkinTime: accommodation.checkinTime
          ? accommodation.checkinTime.substring(0, 5)
          : "15:00",
        checkoutTime: accommodation.checkoutTime
          ? accommodation.checkoutTime.substring(0, 5)
          : "11:00",
      });
      const amountNum = Math.floor(Number(accommodation.expense?.amount) || 0);
      setExpenseAmount(
        amountNum
          ? String(amountNum).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
          : "",
      );
    } else if (visible && !accommodation) {
      const initDate = defaultDate || dayjs().format("YYYY-MM-DD");
      setFormData(prev => ({
        ...prev,
        checkinDate: initDate,
        checkoutDate: dayjs(initDate).add(1, "day").format("YYYY-MM-DD"),
      }));
    }
    if (visible) {
      setPendingFiles([]);
    }
  }, [visible, accommodation, defaultDate]);

  useEffect(() => {
    if (!visible) return;
    if (!accommodation) {
      setExistingAttachments([]);
      setIsLoadingAttachments(false);
      return;
    }
    let cancelled = false;
    setExistingAttachments([]);
    setIsLoadingAttachments(true);
    attachmentsApi
      .getAttachments(planId, "accommodation", accommodation.id)
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
  }, [visible, accommodation?.id, planId]);

  const handleRemoveExistingAttachment = async (attachmentId: number) => {
    try {
      await attachmentsApi.deleteAttachment(attachmentId);
      setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error) {
      if (handleGuestPromptError(error)) return;
      Alert.alert("알림", "첨부파일 삭제에 실패했습니다.");
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert("알림", "숙소명을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const amount = Number.parseInt(normalizeAmount(expenseAmount), 10) || 0;
      let savedAccommodationId: number;
      if (accommodation) {
        const updated = await accommodationsApi.updateAccommodation(
          accommodation.id,
          {
            name: formData.name.trim(),
            description: formData.description?.trim() || undefined,
            country: formData.country?.trim() || undefined,
            city: formData.city?.trim() || undefined,
            place: formData.place?.trim() || undefined,
            checkinDate: formData.checkinDate,
            checkoutDate: formData.checkoutDate,
            checkinTime: `${formData.checkinTime}:00`,
            checkoutTime: `${formData.checkoutTime}:00`,
            expense: {
              exDate: formData.checkinDate,
              amount,
              category: "accommodation" as any,
              currency: ExpenseCurrency.KRW,
              description: formData.name.trim(),
            },
          },
        );
        savedAccommodationId = updated.id;
        try {
          await onSave?.(updated);
        } catch {
          // Refetch 실패해도 저장은 완료됨
        }
        Alert.alert("수정완료", "숙소가 수정되었습니다.");
      } else {
        const created = await accommodationsApi.createAccommodation({
          planId,
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          country: formData.country?.trim() || undefined,
          city: formData.city?.trim() || undefined,
          place: formData.place?.trim() || undefined,
          checkinDate: formData.checkinDate,
          checkoutDate: formData.checkoutDate,
          checkinTime: `${formData.checkinTime}:00`,
          checkoutTime: `${formData.checkoutTime}:00`,
          expense: {
            exDate: formData.checkinDate,
            amount,
            category: "accommodation" as any,
            currency: ExpenseCurrency.KRW,
            description: formData.name.trim(),
          },
        });
        savedAccommodationId = created.id;
        try {
          await onSave?.(created);
        } catch {
          // Refetch 실패해도 저장은 완료됨
        }
        Alert.alert("추가완료", "숙소가 추가되었습니다.");
      }

      if (pendingFiles.length > 0) {
        try {
          const uploaded = await uploadFiles(
            pendingFiles,
            savedAccommodationId,
          );
          setExistingAttachments(prev => [...prev, ...uploaded]);
          setPendingFiles([]);
        } catch {
          Alert.alert(
            "알림",
            "숙소는 저장됐으나 일부 파일 업로드에 실패했습니다.",
          );
        }
      }

      onClose?.({ fromSave: true });
    } catch (_error) {
      Alert.alert(
        "알림",
        accommodation
          ? "숙소 수정에 실패했습니다."
          : "숙소 추가에 실패했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!accommodation) return;

    Alert.alert("숙소 삭제", "이 숙소를 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await accommodationsApi.deleteAccommodation(accommodation.id);
            if (onDelete) onDelete(accommodation.id);
            Alert.alert("삭제완료", "숙소가 삭제되었습니다.");
            onClose?.({ fromSave: true });
          } catch (_error) {
            Alert.alert("알림", "숙소 삭제에 실패했습니다.");
          }
        },
      },
    ]);
  };

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "");
    const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    setExpenseAmount(formatted);
  };

  const content = (
    <>
      {!embedded && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {accommodation ? "숙소 수정" : "숙소 추가"}
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
          { paddingBottom: keyboardHeight + 40 || 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 입력 필드들 */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              숙소명<Text style={styles.required}>*</Text>
            </Text>
            <Input
              value={formData.name}
              onChangeText={text => setFormData({ ...formData, name: text })}
              style={[styles.input, !accommodation && styles.inputBorderless]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>내용 (메모)</Text>
            <TextInput
              value={formData.description}
              onChangeText={text =>
                setFormData({ ...formData, description: text })
              }
              style={[
                styles.textArea,
                !accommodation && styles.textAreaBorderless,
              ]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

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
                  !accommodation
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
                  !accommodation
                    ? styles.pickerTriggerBorderless
                    : styles.pickerTrigger
                }
                fullScreenModal
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>장소 (주소)</Text>
            <Input
              value={formData.place}
              onChangeText={text => setFormData({ ...formData, place: text })}
              style={[styles.input, !accommodation && styles.inputBorderless]}
            />
          </View>

          {/* 체크인/체크아웃 */}
          <View style={styles.checkinoutSection}>
            <Text style={styles.checkinoutSectionTitle}>체크인 / 체크아웃</Text>
            <View style={styles.checkinoutRow}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.checkinoutLabel}>체크인 날짜</Text>
                <Pressable
                  style={[
                    styles.dateInput,
                    !accommodation && styles.dateInputBorderless,
                  ]}
                  onPress={() => setShowCheckinDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {formatDate(formData.checkinDate)}
                  </Text>
                  <CalendarIcon width={20} height={20} color={colors.black} />
                </Pressable>
                <CalendarModal
                  visible={showCheckinDatePicker}
                  selectedDate={formData.checkinDate}
                  onDayPress={day => {
                    setFormData({ ...formData, checkinDate: day.dateString });
                    setShowCheckinDatePicker(false);
                  }}
                  onClose={() => setShowCheckinDatePicker(false)}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.checkinoutLabel}>시간</Text>
                <Pressable
                  style={[
                    styles.dateInput,
                    !accommodation && styles.dateInputBorderless,
                  ]}
                  onPress={() => setTimeModalField("checkin")}
                >
                  <Text style={styles.dateText}>
                    {formatTimeDisplay(formData.checkinTime)}
                  </Text>
                  <TimeIcon width={20} height={20} color={colors.black} />
                </Pressable>
              </View>
            </View>
            <View style={styles.checkinoutRow}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.checkinoutLabel}>체크아웃 날짜</Text>
                <Pressable
                  style={[
                    styles.dateInput,
                    !accommodation && styles.dateInputBorderless,
                  ]}
                  onPress={() => setShowCheckoutDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {formatDate(formData.checkoutDate)}
                  </Text>
                  <CalendarIcon width={16} height={16} color={colors.black} />
                </Pressable>
                <CalendarModal
                  visible={showCheckoutDatePicker}
                  selectedDate={formData.checkoutDate}
                  onDayPress={day => {
                    setFormData({ ...formData, checkoutDate: day.dateString });
                    setShowCheckoutDatePicker(false);
                  }}
                  onClose={() => setShowCheckoutDatePicker(false)}
                  minDate={formData.checkinDate}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.checkinoutLabel}>시간</Text>
                <Pressable
                  style={[
                    styles.dateInput,
                    !accommodation && styles.dateInputBorderless,
                  ]}
                  onPress={() => setTimeModalField("checkout")}
                >
                  <Text style={styles.dateText}>
                    {formatTimeDisplay(formData.checkoutTime)}
                  </Text>
                  <TimeIcon width={20} height={20} color={colors.black} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* 비용 정보 */}
          <View style={styles.expenseSection}>
            <View style={styles.expenseDivider} />
            <Text style={styles.expenseSectionTitle}>비용 정보</Text>
            <View style={[styles.inputGroup, { marginBottom: 20 }]}>
              <Text style={styles.label}>금액</Text>
              <View style={styles.amountInputWrapper}>
                <Input
                  value={expenseAmount}
                  onChangeText={handleAmountChange}
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
                <Text style={styles.amountSuffix}>KRW</Text>
              </View>
            </View>
          </View>

          <AttachmentSection
            showTopDivider
            style={styles.attachmentSection}
            pendingFiles={pendingFiles}
            existingAttachments={existingAttachments}
            onRemoveExisting={
              accommodation ? handleRemoveExistingAttachment : undefined
            }
            isLoadingExisting={!!accommodation && isLoadingAttachments}
            isUploading={isUploading}
            disabled={isSubmitting}
            isGuest={!!me?.isGuest}
            onPickImage={async () => {
              try {
                const file = await pickImage();
                if (file) setPendingFiles(prev => [...prev, file]);
              } catch (e: any) {
                Alert.alert("알림", e.message);
              }
            }}
            onPickDocument={async () => {
              try {
                const file = await pickDocument();
                if (file) setPendingFiles(prev => [...prev, file]);
              } catch (e: any) {
                Alert.alert("알림", e.message);
              }
            }}
            onRemoveFile={index =>
              setPendingFiles(prev => prev.filter((_, i) => i !== index))
            }
          />
        </View>
      </ScrollView>

      <TimeModal
        visible={timeModalField === "checkin"}
        onClose={() => setTimeModalField(null)}
        value={formData.checkinTime}
        onConfirm={time24 => {
          setFormData(prev => {
            const next = { ...prev, checkinTime: time24 };
            if (
              prev.checkinDate === prev.checkoutDate &&
              timeToMinutes(prev.checkoutTime) < timeToMinutes(time24)
            ) {
              next.checkoutTime = time24;
            }
            return next;
          });
        }}
      />
      <TimeModal
        visible={timeModalField === "checkout"}
        onClose={() => setTimeModalField(null)}
        value={formData.checkoutTime}
        onConfirm={time24 => {
          setFormData(prev => ({
            ...prev,
            checkoutTime:
              prev.checkinDate === prev.checkoutDate &&
              timeToMinutes(time24) < timeToMinutes(prev.checkinTime)
                ? prev.checkinTime
                : time24,
          }));
        }}
      />

      <FloatingFooter
        primaryLabel={
          isUploading
            ? "업로드 중..."
            : accommodation
              ? "수정 완료"
              : "일정 저장"
        }
        onPrimaryPress={handleSave}
        primaryDisabled={isSubmitting || isUploading}
        secondaryLabel={accommodation && !embedded ? "삭제" : undefined}
        onSecondaryPress={handleDelete}
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
  inputGroup: {},
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
  checkinoutSection: {
    backgroundColor: `${colors.primary}1A`,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  checkinoutSectionTitle: {
    ...textStyles.h6,
    color: colors.primary,
    marginBottom: 16,
  },
  checkinoutRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  checkinoutLabel: {
    ...textStyles.h8,
    color: colors.gray700,
    marginBottom: 8,
  },
  dateInput: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  dateInputBorderless: {
    borderWidth: 0,
    borderColor: "transparent",
  },
  dateText: {
    ...textStyles.body3,
  },
  expenseSection: {
    marginTop: 20,
  },
  expenseDivider: {
    height: 1,
    backgroundColor: colors.gray300,
    marginBottom: 20,
  },
  expenseSectionTitle: {
    ...textStyles.h5,
    marginTop: 12,
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
  amountSuffix: {
    ...textStyles.h6,
    color: colors.primary,
    marginLeft: 4,
  },
  attachmentSection: {
    marginTop: 0,
  },
});
