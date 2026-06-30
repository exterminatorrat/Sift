import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { colors } from "../constants/colors";
import { AllergySeverity } from "../types/allergy";

type AllergyChipProps = {
  label: string;
  severity?: AllergySeverity;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
};

export function AllergyChip({
  label,
  severity,
  selected = false,
  onPress,
  onRemove
}: AllergyChipProps) {
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
      {severity && <Text style={styles.severity}>{severity}</Text>}
      {onRemove && (
        <Pressable accessibilityRole="button" onPress={onRemove} hitSlop={8}>
          <X color={colors.inkMuted} size={14} />
        </Pressable>
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 10
  },
  selected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0
  },
  selectedLabel: {
    color: colors.primary
  },
  severity: {
    color: colors.inkSubtle,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0,
    textTransform: "capitalize"
  }
});
