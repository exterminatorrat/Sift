import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ChevronLeft, LucideIcon, Menu } from "lucide-react-native";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { useI18n } from "../i18n/I18nProvider";
import { AnimatedPressable } from "./AnimatedPressable";

type AppTopBarProps = {
  title?: string;
  showBack?: boolean;
  showMenu?: boolean;
  rightIcon?: LucideIcon;
  rightAccessibilityLabel?: string;
  onBack?: () => void;
  onMenu?: () => void;
  onRightPress?: () => void;
};

export function AppTopBar({
  title = "Sift",
  showBack,
  showMenu,
  rightIcon: RightIcon,
  rightAccessibilityLabel = "Action",
  onBack,
  onMenu,
  onRightPress
}: AppTopBarProps) {
  const { t } = useI18n();

  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {showBack && (
          <AnimatedPressable
            accessibilityLabel={t("common.back")}
            accessibilityRole="button"
            onPress={onBack}
            style={[styles.iconButton, styles.circleButton]}
          >
            <ChevronLeft color={colors.primaryDark} size={24} strokeWidth={2.1} />
          </AnimatedPressable>
        )}
      </View>
      <Text style={styles.brand}>{title}</Text>
      <View style={styles.side}>
        {RightIcon && (
          <AnimatedPressable
            accessibilityLabel={rightAccessibilityLabel}
            accessibilityRole="button"
            onPress={onRightPress}
            style={[styles.iconButton, styles.circleButton]}
          >
            <RightIcon color={colors.primaryDark} size={21} strokeWidth={2.2} />
          </AnimatedPressable>
        )}
        {!RightIcon && showMenu && (
          <AnimatedPressable
            accessibilityLabel={t("home.openSettings")}
            accessibilityRole="button"
            onPress={onMenu}
            style={[styles.iconButton, styles.circleButton]}
          >
            <Menu color={colors.primaryDark} size={22} strokeWidth={2.1} />
          </AnimatedPressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: "center",
    backgroundColor: "rgba(255,248,239,0.9)",
    flexDirection: "row",
    height: 64,
    justifyContent: "space-between",
    paddingHorizontal: 24
  },
  side: {
    alignItems: "flex-start",
    width: 40
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  circleButton: {
    backgroundColor: colors.surface,
    elevation: 2,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12
  },
  brand: {
    color: colors.primaryDark,
    ...typography.pageTitle
  }
});
