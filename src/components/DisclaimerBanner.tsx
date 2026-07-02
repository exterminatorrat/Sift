import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ShieldAlert } from "lucide-react-native";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { useI18n } from "../i18n/I18nProvider";

type DisclaimerBannerProps = {
  compact?: boolean;
};

export function DisclaimerBanner({ compact = false }: DisclaimerBannerProps) {
  const { t } = useI18n();

  return (
    <View style={[styles.banner, compact && styles.compact]}>
      <ShieldAlert color={colors.primary} size={18} strokeWidth={2.1} />
      <Text style={styles.text}>{t("safety.callout")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14
  },
  compact: {
    padding: 12
  },
  text: {
    color: colors.primary,
    flex: 1,
    ...typography.label,
    lineHeight: 19
  }
});
