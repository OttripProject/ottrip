import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import dayjs from "dayjs";
import { CategoryPicker } from "@/ui/components/pickers";
import Input from "@/ui/components/input/Input";
import CurrencyToggle from "@/ui/components/CurrencyToggle";
import CalendarIcon from "../../../assets/calender.svg";
import BaseCalendar from "@/components/popup/calendar/BaseCalendar";
import { colors } from "@/ui/tokens/colors";
import { typography, textStyles } from "@/ui/tokens/typography";
import { PLACEHOLDERS } from "@/constants/placeholders";

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
}

export default function ExpenseForm({ data, onChange, compact = false }: ExpenseFormProps) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
          style={styles.pickerTrigger}
          dropDownContainerStyle={styles.pickerDropdown}
        />
      </View>

      {/* 2. 금액 및 통화 */}
      <View style={styles.amountCurrencyRow}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={[styles.inputLabel, compact && styles.compactInputLabel]}>금액</Text>
          <Input
            variant="outlined"
            placeholder={PLACEHOLDERS.expense.amount}
            value={data.amount ? String(data.amount) : ""}
            onChangeText={(text) => updateField("amount", Number(text.replace(/[^0-9]/g, "")) || 0)}
            keyboardType="numeric"
            style={styles.input}
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={[styles.inputLabel, compact && styles.compactInputLabel]}>통화</Text>
          <CurrencyToggle
            value={data.currency}
            onChange={(c) => updateField("currency", c)}
            variant="outlined"
            style={styles.input}
          />
        </View>
      </View>

      {/* 3. 날짜 */}
      <View style={[styles.inputGroup, { zIndex: showDatePicker ? 2000 : 1 }]}>
        <Text style={[styles.inputLabel, compact && styles.compactInputLabel]}>날짜</Text>
        <Pressable style={styles.dateInput} onPress={() => setShowDatePicker(!showDatePicker)}>
          <Text style={styles.dateText}>{dayjs(data.ex_date).format("YYYY.MM.DD")}</Text>
          <CalendarIcon width={16} height={16} />
        </Pressable>
      </View>

      {/* 4. 내용 */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, compact && styles.compactInputLabel]}>내용</Text>
        <Input
          variant="outlined"
          placeholder={PLACEHOLDERS.expense.descriptionForm}
          value={data.description}
          onChangeText={(text) => updateField("description", text)}
          style={styles.input}
        />
      </View>

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
  formSection: { gap: 18 },
  compactFormSection: { gap: 14 },
  inputGroup: { gap: 9 },
  inputLabel: {
    ...textStyles.h6,
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
    backgroundColor: colors.gray200, 
    borderWidth: 0, 
    height: 50 
  },
  dateInput: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    height: 50, 
    backgroundColor: colors.gray200, 
    width: "100%" 
  },
  dateText: { 
    ...textStyles.body3, 
    color: colors.gray900 },
  pickerTrigger: { backgroundColor: colors.gray200, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  pickerDropdown: { top: 56, backgroundColor: colors.gray200 },
  calendarOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 20001, elevation: 10 },
});