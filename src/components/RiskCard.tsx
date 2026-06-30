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

      <View style={styles.footer}>
        <Text style={styles.allergens} numberOfLines={1}>
          {dish.possibleAllergens.length > 0
            ? dish.possibleAllergens.join(", ")
            : "No obvious listed allergen"}
        </Text>
        <Text style={[styles.action, { color: meta.color }]}>{meta.action}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16
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
    borderRadius: 8,
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
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0,
    marginTop: 14
  },
  description: {
    color: colors.inkMuted,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 20,
    marginTop: 4
  },
  reason: {
    color: colors.ink,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 21,
    marginTop: 12
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12
  },
  allergens: {
    color: colors.inkMuted,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0
  },
  action: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0
  }
});
