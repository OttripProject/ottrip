import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import dayjs from "dayjs";
import { CategoryPicker } from "@/ui/components/pickers";
import Input from "@/ui/components/input/Input";
import CurrencyToggle from "@/ui/components/CurrencyToggle";
import CalendarIcon from "../../../assets/calender.svg";
import BaseCalendar from "@/components/popup/calendar/BaseCalendar";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { spacing } from "@/ui/tokens/spacing";
import { typography, textStyles } from "@/ui/tokens/typography";
import { PLACEHOLDERS } from "@/constants/placeholders";

import AttachmentSection from "@/ui/components/attachmentSection";
import HoverPressable from "@/ui/components/HoverPressable";
import type { LocalFile, Attachment } from "@/types/api";

export interface ExpenseFormData {
  category: any;
  amount: number;
  currency: any;
  ex_date: string;
  description: string;
}

interface ExpenseFormProps {
  data: ExpenseFormData;
  onChange: (data: ExpenseFormData) => void;
  compact?: boolean; 
   // 새로 추가 
   existingAttachments?: Attachment[];
   pendingFiles?: LocalFile[];
   onPickImage?: () => void;
   onPickDocument?: () => void;
   onRemoveExisting?: (attachmentId: number) => void;
   onRemovePending?: (index: number) => void;
   onAppendPendingFiles?: (files: LocalFile[]) => void;
   isUploading?: boolean;
   disabled?: boolean;
 
   isAiAnalyzing?: boolean;
   onAiAnalyzePress?: any;
   analyzeError?: string | null;
   onRetryAnalyze?: () => void;
   isAiAnalyzeSuccess?: boolean;
   isAiAnalyzePartial?: boolean;
   analyzePartialMessage?: string;
   aiFilledFields?: ReadonlySet<string>;
}

export default function ExpenseForm({
    data,
    onChange,
    compact = false,
    existingAttachments = [],
    pendingFiles = [],
    onPickImage = () => {},
    onPickDocument = () => {},
    onRemoveExisting = () => {},
    onRemovePending = () => {},
    onAppendPendingFiles,
    isUploading,
    disabled,
    isAiAnalyzing,
    onAiAnalyzePress,
    analyzeError,
    onRetryAnalyze,
    isAiAnalyzeSuccess,
    isAiAnalyzePartial,
    analyzePartialMessage,
    aiFilledFields = new Set(),
  }: ExpenseFormProps) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const size = compact ? compactSize : fullSize;
  const updateField = (field: keyof ExpenseFormData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <View 
      style={[
        styles.formSection, 
        compact && styles.compactFormSection, 
        { 
          zIndex: categoryOpen ? 10000 : 1, 
          elevation: categoryOpen ? 10 : 0 
        }
      ]}
    >
      {/* 1. 카테고리 */}
      <View style={[styles.inputGroup, { zIndex: categoryOpen ? 10000 : 1 }]}>
        <Text style={[styles.inputLabel, compact && styles.compactInputLabel]}>카테고리</Text>
        <CategoryPicker
          value={data.category}
          onChange={(cat) => updateField("category", cat)}
          onOpen={() => setCategoryOpen(true)}
          onClose={() => setCategoryOpen(false)}
          style={size.picker}
          triggerTextStyle={size.pickerText}
          iconSize={size.pickerIcon}
          dropDownContainerStyle={styles.pickerDropdown}
        />
      </View>

      {/* 2. 금액 및 통화 */}
      <View style={styles.amountCurrencyRow}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={[styles.inputLabel, compact && styles.compactInputLabel]}>금액</Text>
          <Input
            variant="filled"
            placeholder={PLACEHOLDERS.expense.amount}
            value={data.amount ? String(data.amount) : ""}
            onChangeText={(text) => updateField("amount", Number(text.replace(/[^0-9]/g, "")) || 0)}
            keyboardType="numeric"
            style={size.input}
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={[styles.inputLabel, compact && styles.compactInputLabel]}>통화</Text>
          <CurrencyToggle
            value={data.currency}
            onChange={(c) => updateField("currency", c)}
            style={size.field}
            large={!compact}
          />
        </View>
      </View>

      {/* 3. 날짜 */}
      <View style={[styles.inputGroup, { zIndex: showDatePicker ? 2000 : 1 }]}>
        <Text style={[styles.inputLabel, compact && styles.compactInputLabel]}>날짜</Text>
        <HoverPressable
          style={[styles.dateInput, size.field]}
          hoverStyle={styles.fieldHover}
          onPress={() => setShowDatePicker(!showDatePicker)}
        >
          <Text style={size.dateText}>
            {dayjs(data.ex_date).format("YYYY.MM.DD")}
          </Text>
          <CalendarIcon width={size.dateIcon} height={size.dateIcon} />
        </HoverPressable>
      </View>

      {/* 4. 내용 */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, compact && styles.compactInputLabel]}>내용</Text>
        <Input
          variant="filled"
          placeholder={PLACEHOLDERS.expense.descriptionForm}
          value={data.description}
          onChangeText={(text) => updateField("description", text)}
          style={size.input}
        />
      </View>

      {/* 첨부파일 */}
      {!compact && <View style={styles.sectionDivider} />}
      
      <AttachmentSection
        variant="expense"
        style={styles.attachmentSection}
        showTopDivider={compact}
        existingAttachments={existingAttachments}
        pendingFiles={pendingFiles}
        onPickImage={onPickImage}
        onPickDocument={onPickDocument}
        onRemoveExisting={onRemoveExisting}
        onRemoveFile={onRemovePending}
        onAppendPendingFiles={onAppendPendingFiles}
        isUploading={isUploading}
        disabled={disabled || isAiAnalyzing}
        isAiAnalyzing={isAiAnalyzing}
        onAiAnalyzePress={onAiAnalyzePress}
        analyzeError={analyzeError}
        onRetryAnalyze={onRetryAnalyze}
        isAiAnalyzeSuccess={isAiAnalyzeSuccess}
        isAiAnalyzePartial={isAiAnalyzePartial}
        analyzePartialMessage={analyzePartialMessage}
      />

      {/* 달력 팝업 */}
      {showDatePicker && (
        <View style={styles.calendarOverlay} pointerEvents="box-none">
          <BaseCalendar
            visible={showDatePicker}
            selectedDate={data.ex_date}
            onDayPress={(day) => {
              updateField("ex_date", day.dateString);
              setShowDatePicker(false);
            }}
            onClose={() => setShowDatePicker(false)}
            hideButtons={true}
            autoCloseOnSelect={true}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
formSection: { gap: spacing.lg },
  compactFormSection: { gap: 14 },
inputGroup: { gap: spacing.sm },
inputLabel: {
    ...textStyles.h5,
    color: colors.gray900,
  },
  compactInputLabel: {
    ...textStyles.h8
  },
  amountCurrencyRow: { 
    flexDirection: "row", 
    gap: 12 
  },
input: {
    height: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.none,
    ...textStyles.body2,
    color: colors.gray900,
  },
  compactInput: {
    height: 50,
  },
  field: {
    height: 48,
  },
  compactField: {
    height: 50,
  },
  fieldText: {
    ...textStyles.body2,
    color: colors.gray900,
  },
  fieldHover: {
    backgroundColor: colors.inputHover,
  },
dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.gray200,
    width: "100%",
  },
  dateText: { 
    ...textStyles.body3, 
    color: colors.gray900 },
pickerTrigger: {
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    height: 48,
  },
  compactPickerTrigger: { backgroundColor: colors.gray200, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  pickerDropdown: { top: 56, backgroundColor: colors.gray200 },
  calendarOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 20001, elevation: 10 },
sectionDivider: {
    height: 1,
    backgroundColor: colors.gray300,
    marginTop: spacing.xs,
    marginHorizontal: -spacing.xs,
  },
  attachmentSection: {
    width: "100%",
  },
});

const fullSize = {
  picker: styles.pickerTrigger,
  pickerText: styles.fieldText,
  pickerIcon: 16,
  input: styles.input,
  field: styles.field,
  dateText: styles.fieldText,
  dateIcon: 14,
};

const compactSize = {
  picker: styles.compactPickerTrigger,
  pickerText: undefined,
  pickerIcon: undefined,
  input: styles.compactInput,
  field: styles.compactField,
  dateText: styles.dateText,
  dateIcon: 16,
};
