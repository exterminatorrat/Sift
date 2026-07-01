import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  AlertTriangle,
  Ban,
  ChevronRight,
  CircleCheck,
  HelpCircle,
  MessageCircleQuestion
} from "lucide-react-native";
import { colors } from "../constants/colors";
import { DishRisk } from "../types/scan";
import { RiskLevel } from "../types/risk";
import { riskMeta } from "../utils/riskLabels";

const iconsByRisk = {
  low_risk: CircleCheck,
  ask_staff: MessageCircleQuestion,
  high_risk: AlertTriangle,
  avoid_unless_confirmed: Ban,
  unclear: HelpCircle
} satisfies Record<RiskLevel, typeof CircleCheck>;

type RiskCardProps = {
  dish: DishRisk;
  onPress: () => void;
};

export function RiskCard({ dish, onPress }: RiskCardProps) {
  const meta = riskMeta[dish.riskLevel];
  const Icon = iconsByRisk[dish.riskLevel];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.accent, { backgroundColor: meta.color }]} />
      <View style={styles.topRow}>
        <View style={[styles.status, { backgroundColor: meta.background }]}>
          <Icon color={meta.color} size={16} strokeWidth={2.2} />
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <ChevronRight color={colors.inkSubtle} size={18} />
      </View>

      <Text style={styles.title}>{dish.dishName}</Text>
      {dish.menuDescription && <Text style={styles.description}>{dish.menuDescription}</Text>}
      <Text style={styles.reason}>{dish.conservativeLanguage}</Text>

      <View style={styles.chips}>
        {(dish.possibleAllergens.length > 0
          ? dish.possibleAllergens.slice(0, 4)
          : ["No obvious listed allergen"]
        ).map((allergen) => (
          <View key={allergen} style={styles.chip}>
            <Text style={styles.chipText}>{allergen}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.action, { color: meta.color }]}>{meta.action}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    elevation: 2,
    overflow: "hidden",
    padding: 24,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24
  },
  accent: {
    bottom: 24,
    left: 0,
    opacity: 0.22,
    position: "absolute",
    top: 24,
    width: 4
  },
  pressed: {
    opacity: 0.78
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  status: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0
  },
  title: {
    color: colors.ink,
    fontSize: 23,
    fontWeight: "500",
    letterSpacing: 0,
    lineHeight: 31,
    marginTop: 18
  },
  description: {
    color: colors.inkMuted,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 23,
    marginTop: 6
  },
  reason: {
    color: colors.inkMuted,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 24,
    marginTop: 16
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 18
  },
  chip: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  chipText: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0
  },
  action: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0
  }
});
