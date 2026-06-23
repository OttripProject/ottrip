import useDetectClose from "@/hooks/useDetectClose";
import { type ExpenseCategory, categoryColors, categoryLabels } from "@/types/expense";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { textStyles } from "@/ui/tokens/typography";
import { useMemo, useRef } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import DownArrowIcon from "../../../../assets/dropdown_time.svg";
import UpperArrowIcon from "../../../../assets/upper_arrow.svg";

interface CategoryPickerProps {
  value: ExpenseCategory;
  onChange: (category: ExpenseCategory) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  style?: ViewStyle;
  triggerTextStyle?: TextStyle;
  iconSize?: number;
  dropDownContainerStyle?: ViewStyle;
  listItemLabelStyle?: TextStyle;
  selectedItemContainerStyle?: ViewStyle;
  disabled?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

const CATEGORY_ORDER: ExpenseCategory[] = [
  "food" as ExpenseCategory,
  "transport" as ExpenseCategory,
  "activity" as ExpenseCategory,
  "accommodation" as ExpenseCategory,
  "flight" as ExpenseCategory,
  "shopping" as ExpenseCategory,
  "etc" as ExpenseCategory,
];

export default function CategoryPicker({
  value,
  onChange,
  containerStyle,
  style,
  triggerTextStyle,
  iconSize = 10,
  dropDownContainerStyle,
  disabled,
  onOpen,
  onClose,
}: CategoryPickerProps) {
  const wrapperRef = useRef<View>(null);
  const [open, setIsOpen, handleOutsidePress] = useDetectClose(wrapperRef, false);

  const items = useMemo(
    () => CATEGORY_ORDER.map(cat => ({ value: cat, label: categoryLabels[cat] })),
    [],
  );

  const handleToggle = () => {
    if (disabled) return;
    const next = !open;
    setIsOpen(next);
    if (next) onOpen?.();
    else onClose?.();
  };

  const handleSelect = (cat: ExpenseCategory) => {
    onChange(cat);
    setIsOpen(false);
    onClose?.();
  };

  const dotColor = categoryColors[value];
  const label = categoryLabels[value];

  return (
    <View
      ref={wrapperRef}
      style={[styles.wrapper, containerStyle, { zIndex: open ? 100 : 1 }]}
    >
      <Pressable
        style={[styles.trigger, disabled && styles.triggerDisabled, style]}
        onPress={handleToggle}
        disabled={disabled}
      >
        <View style={styles.triggerLeft}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={[styles.triggerText, triggerTextStyle]} numberOfLines={1}>{label}</Text>
        </View>
        {open ? (
          <UpperArrowIcon width={iconSize} height={iconSize} style={{ opacity: 0.6 }} />
        ) : (
          <DownArrowIcon width={iconSize} height={iconSize} style={{ opacity: 0.6 }} />
        )}
      </Pressable>

      {open && (
        <View style={[styles.popup, dropDownContainerStyle]}>
          {items.map(item => {
            const isSelected = item.value === value;
            return (
              <Pressable
                key={item.value}
                style={({ pressed, hovered }: any) => [
                  styles.item,
                  isSelected && styles.itemSelected,
                  hovered && !isSelected && styles.itemHovered,
                  pressed && styles.itemPressed,
                ]}
                onPress={() => handleSelect(item.value)}
              >
                <View style={[styles.dot, { backgroundColor: categoryColors[item.value] }]} />
                <Text style={styles.itemText}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    flexShrink: 0,
  },
  triggerText: {
    ...textStyles.body4,
    color: colors.gray900,
    flex: 1,
  },
  popup: {
    position: "absolute",
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radii.md,
    padding: 4,
    gap: 2,
    zIndex: 1000,
    shadowColor: colors.gray900,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.base,
  },
  itemSelected: {
    backgroundColor: colors.gray200,
  },
  itemHovered: {
    backgroundColor: colors.gray100,
  },
  itemPressed: {
    backgroundColor: colors.gray200,
  },
  itemText: {
    ...textStyles.body4,
    color: colors.gray900,
  },
});
