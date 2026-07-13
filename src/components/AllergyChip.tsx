import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check, X } from "lucide-react-native";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { AllergySeverity } from "../types/allergy";

type AllergyChipProps = {
  label: string;
  severity?: AllergySeverity;
  selected?: boolean;
  showSelectedIcon?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
};

export function AllergyChip({
  label,
  severity,
  selected = false,
  showSelectedIcon = false,
  onPress,
  onRemove
}: AllergyChipProps) {
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
      {selected && showSelectedIcon && (
        <View style={styles.selectedIcon}>
          <Check color={colors.textInverse} size={12} strokeWidth={2.5} />
        </View>
      )}
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
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 999,
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
    ...typography.label
  },
  selectedLabel: {
    color: colors.primary
  },
  severity: {
    color: colors.inkSubtle,
    ...typography.badge,
    textTransform: "capitalize"
  },
  selectedIcon: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 19,
    justifyContent: "center",
    width: 19
  }
});
