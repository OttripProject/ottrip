import { LinearGradient } from "expo-linear-gradient";
import dayjs from "dayjs";
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
  pickStr,
} from "@/components/modals/aiDocumentAnalyzeDraftBody";
import type {
  AiDocumentItemDraft,
  AiDocumentItemType,
  DocumentUploadAnalyzeResponse,
} from "@/types/api";
import { categoryLabels } from "@/types/expense";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { textStyles } from "@/ui/tokens/typography";
import CheckWhiteIcon from "../../../assets/check_white.svg";
import CloseErrorIcon from "../../../assets/close_error.svg";
import AttachmentDocIcon from "../../../assets/mobile_attachment_document.svg";
import AttachmentImageIcon from "../../../assets/mobile_attachment_image.svg";
import WarningCircleIcon from "../../../assets/warning_circle.svg";

const HEADER_GRADIENT: [string, string] = ["#EEF0FF", "#F3ECFF"];
const CLOSE_PURPLE = "#4A3DBF";
const BTN_CANCEL_BG = "#EDEDED";

const ENTITY_LABEL_TO_KIND: Record<string, string> = {
  일정: "itinerary",
  숙박: "accommodation",
  항공: "flight",
  비용: "expense",
};

const KIND_TO_LABEL: Record<string, string> = {
  itinerary: "일정",
  accommodation: "숙박",
  flight: "항공",
  expense: "비용",
};

type FieldItem = { label: string; value: string };

function extractExpenseNested(
  values: Record<string, unknown>,
): Record<string, unknown> | null {
  const e = values.expense ?? values.Expense;
  if (e && typeof e === "object" && !Array.isArray(e)) {
    return e as Record<string, unknown>;
  }
  return null;
}

function formatDateKR(raw: string): string {
  if (!raw) return "";
  const d = dayjs(raw);
  return d.isValid() ? d.format("YYYY년 M월 D일") : raw;
}

function formatDateTimeKR(raw: string): string {
  if (!raw) return "";
  const d = dayjs(raw);
  return d.isValid() ? d.format("YYYY.MM.DD HH:mm") : raw;
}

function formatTimeHHmm(raw: string): string {
  if (!raw) return "";
  return raw.slice(0, 5);
}

function formatAmountKRW(raw: unknown): string {
  const n = Number(String(raw ?? "").replace(/[^0-9.-]/g, ""));
  if (!n || Number.isNaN(n)) return "";
  return `₩${n.toLocaleString("ko-KR")}`;
}

function getCategoryLabel(raw: string): string {
  return (
    categoryLabels[raw as keyof typeof categoryLabels] ?? raw
  );
}

function isImageFilename(name: string): boolean {
  return /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?)$/i.test(name);
}

function getReadOnlyFields(draft: AiDocumentItemDraft): {
  main: FieldItem[];
  expense?: FieldItem[];
} {
  const values = (draft.payload.values as Record<string, unknown>) ?? {};

  if (draft.itemType === "itinerary") {
    const expNested = extractExpenseNested(values);
    const expSrc = expNested ?? values;
    const hasExp =
      expNested ||
      pickStr(values, ["amount", "Amount"]) ||
      pickStr(values, ["category", "Category"]);

    return {
      main: [
        { label: "제목", value: pickStr(values, ["title", "Title"]) },
        {
          label: "내용",
          value: pickStr(values, ["description", "Description"]),
        },
        { label: "국가", value: pickStr(values, ["country", "Country"]) },
        { label: "도시", value: pickStr(values, ["city", "City"]) },
        { label: "장소", value: pickStr(values, ["location", "Location"]) },
        {
          label: "날짜",
          value: formatDateKR(
            pickStr(values, [
              "itineraryDate",
              "itinerary_date",
              "ItineraryDate",
            ]),
          ),
        },
        {
          label: "시작 시간",
          value: formatTimeHHmm(
            pickStr(values, ["startTime", "start_time", "StartTime"]),
          ),
        },
        {
          label: "종료 시간",
          value: formatTimeHHmm(
            pickStr(values, ["endTime", "end_time", "EndTime"]),
          ),
        },
      ],
      expense: hasExp
        ? [
            {
              label: "카테고리",
              value: getCategoryLabel(
                pickStr(expSrc, ["category", "Category"]),
              ),
            },
            {
              label: "금액",
              value: formatAmountKRW(pickStr(expSrc, ["amount", "Amount"])),
            },
            {
              label: "내용",
              value: pickStr(expSrc, ["description", "Description"]),
            },
          ]
        : undefined,
    };
  }

  if (draft.itemType === "flight") {
    const segRaw = values.segments ?? values.Segments;
    const segs: Record<string, unknown>[] = Array.isArray(segRaw)
      ? segRaw.filter(
          (s): s is Record<string, unknown> =>
            s != null && typeof s === "object",
        )
      : [];

    const main: FieldItem[] = [
      {
        label: "예약번호(PNR)",
        value: pickStr(values, ["reservationNumber", "reservation_number"]),
      },
      {
        label: "승객명",
        value: pickStr(values, ["passengerName", "passenger_name"]),
      },
      {
        label: "항공권번호",
        value: pickStr(values, ["ticketNumber", "ticket_number"]),
      },
    ];

    segs.forEach((seg, idx) => {
      const prefix = segs.length > 1 ? `구간${idx + 1} ` : "";
      const dep = pickStr(seg, [
        "departureAirport",
        "departure_airport",
        "DepartureAirport",
      ]);
      const arr = pickStr(seg, [
        "arrivalAirport",
        "arrival_airport",
        "ArrivalAirport",
      ]);
      main.push({
        label: `${prefix}구간`,
        value: dep || arr ? `${dep} → ${arr}` : "",
      });
      main.push({
        label: `${prefix}출발`,
        value: formatDateTimeKR(
          pickStr(seg, ["departureTime", "departure_time"]),
        ),
      });
      main.push({
        label: `${prefix}도착`,
        value: formatDateTimeKR(
          pickStr(seg, ["arrivalTime", "arrival_time"]),
        ),
      });
    });

    const expNested = extractExpenseNested(values);
    const expSrc = expNested ?? values;
    const hasExp = expNested || pickStr(values, ["amount", "Amount"]);

    return {
      main,
      expense: hasExp
        ? [
            {
              label: "항공료",
              value: formatAmountKRW(pickStr(expSrc, ["amount", "Amount"])),
            },
          ]
        : undefined,
    };
  }

  if (draft.itemType === "accommodation") {
    const expNested = extractExpenseNested(values);
    const expSrc = expNested ?? values;
    const hasExp = expNested || pickStr(values, ["amount", "Amount"]);

    return {
      main: [
        { label: "숙소명", value: pickStr(values, ["name", "Name"]) },
        {
          label: "내용",
          value: pickStr(values, ["description", "Description"]),
        },
        { label: "국가", value: pickStr(values, ["country", "Country"]) },
        { label: "도시", value: pickStr(values, ["city", "City"]) },
        { label: "장소", value: pickStr(values, ["place", "Place"]) },
        {
          label: "체크인",
          value: formatDateKR(
            pickStr(values, ["checkinDate", "checkin_date", "CheckinDate"]),
          ),
        },
        {
          label: "체크인 시간",
          value: formatTimeHHmm(
            pickStr(values, ["checkinTime", "checkin_time", "CheckinTime"]),
          ),
        },
        {
          label: "체크아웃",
          value: formatDateKR(
            pickStr(values, [
              "checkoutDate",
              "checkout_date",
              "CheckoutDate",
            ]),
          ),
        },
        {
          label: "체크아웃 시간",
          value: formatTimeHHmm(
            pickStr(values, [
              "checkoutTime",
              "checkout_time",
              "CheckoutTime",
            ]),
          ),
        },
      ],
      expense: hasExp
        ? [
            {
              label: "숙박료",
              value: formatAmountKRW(pickStr(expSrc, ["amount", "Amount"])),
            },
          ]
        : undefined,
    };
  }

  if (draft.itemType === "expense") {
    return {
      main: [
        {
          label: "카테고리",
          value: getCategoryLabel(pickStr(values, ["category", "Category"])),
        },
        {
          label: "금액",
          value: formatAmountKRW(pickStr(values, ["amount", "Amount"])),
        },
        {
          label: "내용",
          value: pickStr(values, ["description", "Description"]),
        },
        {
          label: "비용일",
          value: formatDateKR(
            pickStr(values, ["exDate", "ex_date", "ExDate"]),
          ),
        },
      ],
    };
  }

  return { main: [] };
}

function ReadOnlyBody({ draft }: { draft: AiDocumentItemDraft }) {
  const fields = useMemo(() => getReadOnlyFields(draft), [draft]);

  return (
    <View>
      <View style={styles.roFieldGroup}>
        {fields.main.map((field, i) => (
          <View
            key={`main-${field.label}`}
            style={[
              styles.roRow,
              i === fields.main.length - 1 &&
                !fields.expense &&
                styles.roRowLast,
            ]}
          >
            <Text style={styles.roLabel}>{field.label}</Text>
            {field.value ? (
              <Text style={styles.roValue}>{field.value}</Text>
            ) : (
              <>
                <Text style={styles.roValueEmpty}>—</Text>
                <View style={styles.roCheckBadge}>
                  <Text style={styles.roCheckBadgeText}>확인 필요</Text>
                </View>
              </>
            )}
          </View>
        ))}
      </View>

      {fields.expense && fields.expense.length > 0 && (
        <>
          <View style={styles.expenseSectionHeader}>
            <View style={styles.expenseSectionDot} />
            <Text style={styles.expenseSectionText}>비용 내역</Text>
          </View>
          <View style={styles.roFieldGroup}>
            {fields.expense.map((field, i) => (
              <View
                key={`exp-${field.label}`}
                style={[
                  styles.roRow,
                  i === (fields.expense?.length ?? 0) - 1 && styles.roRowLast,
                ]}
              >
                <Text style={styles.roLabel}>{field.label}</Text>
                {field.value ? (
                  <Text style={styles.roValue}>{field.value}</Text>
                ) : (
                  <>
                    <Text style={styles.roValueEmpty}>—</Text>
                    <View style={styles.roCheckBadge}>
                      <Text style={styles.roCheckBadgeText}>확인 필요</Text>
                    </View>
                  </>
                )}
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function getHeaderSubtitle(
  kind: AiDocumentItemType | null,
  entityTypeLabel: string,
): string {
  const t = kind ?? entityTypeLabel;
  if (t === "flight" || entityTypeLabel.includes("항공")) {
    return "첨부파일에서 아래 항공편 정보를 찾았어요";
  }
  if (t === "accommodation" || entityTypeLabel.includes("숙박")) {
    return "첨부파일에서 아래 숙박 정보를 찾았어요";
  }
  if (t === "expense") {
    return "첨부파일에서 아래 지출 정보를 찾았어요";
  }
  return "첨부파일에서 아래 일정 정보를 찾았어요";
}

export interface AiAnalyzeResultContentProps {
  analyzeResult: DocumentUploadAnalyzeResponse;
  analyzeFileName?: string;
  sourceLabel?: string;
  originEntityType?: string;
}

export function AiAnalyzeResultContent({
  analyzeResult,
  analyzeFileName,
  sourceLabel,
  originEntityType,
}: AiAnalyzeResultContentProps) {
  const kind: AiDocumentItemType | null =
    analyzeResult.inferredItemType ?? analyzeResult.draft?.itemType ?? null;

  const isMismatch = useMemo(() => {
    if (!kind || !originEntityType) return false;
    const originKind = ENTITY_LABEL_TO_KIND[originEntityType];
    return !!originKind && kind !== originKind;
  }, [kind, originEntityType]);

  const mismatchKindLabel = kind ? (KIND_TO_LABEL[kind] ?? kind) : "";

  const isPartialRecognition = useMemo(() => {
    if (!analyzeResult.draft?.payload) return false;
    const { values, fieldMeta } = analyzeResult.draft.payload;
    const hasUncertain = Object.values(fieldMeta).some(
      (m) => m.certainty !== "high",
    );
    const hasEmptyValues = Object.values(values).some(
      (v) => v === null || v === undefined || v === "",
    );
    return hasUncertain || hasEmptyValues;
  }, [analyzeResult]);

  return (
    <>
      {analyzeFileName ? (
        <View style={styles.fileCard}>
          <View style={styles.fileCardIconBox}>
            {isImageFilename(analyzeFileName) ? (
              <AttachmentImageIcon width={17} height={17} />
            ) : (
              <AttachmentDocIcon width={17} height={17} />
            )}
          </View>
          <Text style={styles.fileCardName} numberOfLines={1}>
            {analyzeFileName}
          </Text>
          <View style={styles.fileCardBadge}>
            <Text style={styles.fileCardBadgeText}>분석 완료</Text>
          </View>
        </View>
      ) : sourceLabel ? (
        <View style={styles.sourceCard}>
          <View style={styles.sourceCardIconBox}>
            <AttachmentDocIcon width={15} height={15} />
          </View>
          <Text style={styles.sourceCardLabel} numberOfLines={1}>
            {sourceLabel}
          </Text>
          <View style={styles.fileCardBadge}>
            <Text style={styles.fileCardBadgeText}>분석 완료</Text>
          </View>
        </View>
      ) : null}

      {isMismatch && (
        <View style={styles.mismatchBanner}>
          <WarningCircleIcon
            width={14}
            height={14}
            style={styles.mismatchBannerIcon}
          />
          <Text style={styles.mismatchBannerText}>
            유형 불일치 : '{originEntityType}' 항목에서 분석을 시작했지만 파일이 '{mismatchKindLabel}' 유형으로 인식됐어요.
          </Text>
        </View>
      )}

      {isPartialRecognition && (
        <View style={styles.partialBanner}>
          <WarningCircleIcon
            width={14}
            height={14}
            style={styles.partialBannerIcon}
          />
          <Text style={styles.partialBannerText}>
            일부 항목만 인식했어요. 비어 있는 칸은 직접 확인해 주세요.
          </Text>
        </View>
      )}

      {analyzeResult.draft ? (
        <ReadOnlyBody draft={analyzeResult.draft} />
      ) : (
        <Text style={styles.emptyDraftHint}>
          분석은 완료됐지만 표시할 초안 데이터가 없습니다.
        </Text>
      )}
    </>
  );
}

export interface AiDocumentAnalyzeModalProps {
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
      setDraftBodyKey((k) => k + 1);
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
          onPress={(e) => e.stopPropagation?.()}
        >
          <LinearGradient
            colors={HEADER_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <LinearGradient
              colors={colors.aiGrad}
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
                analyzeResult={analyzeResult ?? { success: false, inferredItemType: null, draft: null, error: null }}
                analyzeFileName={analyzeFileName}
                originEntityType={originEntityType}
              />
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={
                isEditMode ? () => setIsEditMode(false) : () => setIsEditMode(true)
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
                {isEditMode ? "저장" : applyLabel ?? "이대로 추가"}
              </Text>
            </Pressable>
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
    borderRadius: 18,
    overflow: "visible",
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
    maxHeight: 460,
  },
  scrollContent: {
    padding: 16,
    paddingHorizontal: 22,
    paddingBottom: 4,
    gap: 12,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.gray200,
  },
  sourceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.gray200,
  },
  sourceCardIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgb(238, 234, 255)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sourceCardLabel: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 13,
    lineHeight: 20,
    color: colors.gray900,
    flex: 1,
    minWidth: 0,
  },
  fileCardIconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.base,
    backgroundColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fileCardName: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 13,
    lineHeight: 20,
    color: colors.gray900,
    flex: 1,
    minWidth: 0,
  },
  fileCardBadge: {
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingVertical: 3,
    paddingHorizontal: 9,
    flexShrink: 0,
  },
  fileCardBadgeText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 11,
    lineHeight: 16,
    color: colors.aiInk,
  },
  mismatchBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: "rgb(255, 241, 239)",
    borderWidth: 1,
    borderColor: "rgb(251, 217, 211)",
  },
  mismatchBannerIcon: {
    flexShrink: 0,
    marginTop: 1,
  },
  mismatchBannerText: {
    flex: 1,
    ...textStyles.body6,
    color: colors.red,
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
  roFieldGroup: {
    flexDirection: "column",
  },
  roRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgb(236, 236, 236)",
  },
  roRowLast: {
    borderBottomWidth: 0,
  },
  roLabel: {
    fontFamily: "Pretendard-Regular",
    fontSize: 13,
    lineHeight: 20,
    color: "rgb(108, 108, 108)",
    width: 84,
    flexShrink: 0,
  },
  roValue: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 13,
    lineHeight: 20,
    color: colors.black,
    flex: 1,
    minWidth: 0,
  },
  roValueEmpty: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 13,
    lineHeight: 20,
    color: "rgb(196, 196, 196)",
    flex: 1,
    minWidth: 0,
  },
  roCheckBadge: {
    backgroundColor: "rgb(255, 241, 220)",
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
    flexShrink: 0,
  },
  roCheckBadgeText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 11,
    lineHeight: 16,
    color: "rgb(178, 90, 0)",
  },
  expenseSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    marginBottom: 6,
  },
  expenseSectionDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgb(240, 138, 75)",
    flexShrink: 0,
  },
  expenseSectionText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 12,
    lineHeight: 18,
    color: "rgb(184, 83, 26)",
  },
  emptyDraftHint: {
    ...textStyles.body5,
    color: colors.gray600,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    paddingHorizontal: 22,
    paddingBottom: 18,
  },
  footerBtn: {
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  footerBtnLeft: {
    flex: 1,
    backgroundColor: BTN_CANCEL_BG,
  },
  footerBtnRight: {
    flex: 1.4,
    backgroundColor: colors.primary,
  },
  footerBtnLeftText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 12,
    lineHeight: 18,
    color: colors.gray900,
  },
  footerBtnRightText: {
    fontFamily: "Pretendard-SemiBold",
    fontSize: 12,
    lineHeight: 18,
    color: colors.white,
  },
});
