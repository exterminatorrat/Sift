import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import {
  AlertTriangle,
  Ban,
  ChevronRight,
  CircleCheck,
  HelpCircle,
  MessageCircleQuestion
} from "lucide-react-native";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { DishRisk } from "../types/scan";
import { RiskLevel } from "../types/risk";
import { getRiskMeta } from "../utils/riskLabels";
import { useI18n } from "../i18n/I18nProvider";

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
  const { t } = useI18n();
  const meta = getRiskMeta(dish.riskLevel, t);
  const Icon = iconsByRisk[dish.riskLevel];
  const entry = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(entry, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true
    }).start();
  }, [entry]);

  const animatePress = (toValue: number) => {
    Animated.timing(pressScale, {
      duration: toValue < 1 ? 90 : 150,
      easing: Easing.out(Easing.cubic),
      toValue,
      useNativeDriver: true
    }).start();
  };

  const translateY = entry.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0]
  });

  return (
    <Animated.View
      style={{
        opacity: entry,
        transform: [{ translateY }, { scale: pressScale }]
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={() => animatePress(0.985)}
        onPressOut={() => animatePress(1)}
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
            : [t("common.noObviousListedAllergen")]
          ).map((allergen) => (
            <View key={allergen} style={styles.chip}>
              <Text style={styles.chipText}>{allergen}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.action, { color: meta.color }]}>{meta.action}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    overflow: "hidden",
    padding: 24,
    shadowColor: colors.ink,
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
    ...typography.badge
  },
  title: {
    color: colors.ink,
    ...typography.sectionTitle,
    fontSize: 23,
    lineHeight: 31,
    marginTop: 18
  },
  description: {
    color: colors.inkMuted,
    ...typography.body,
    marginTop: 6
  },
  reason: {
    color: colors.inkMuted,
    ...typography.body,
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
    borderColor: colors.borderSoft,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  chipText: {
    color: colors.inkMuted,
    ...typography.badge,
    fontSize: 11
  },
  action: {
    marginTop: 16,
    ...typography.label,
    fontFamily: typography.label.fontFamily,
    fontWeight: "600"
  }
});
