import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronRight,
  CircleHelp,
  CreditCard,
  Languages,
  ShieldPlus,
  Trash2
} from "lucide-react-native";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { AppTopBar } from "../components/AppTopBar";
import { useI18n } from "../i18n/I18nProvider";

type SettingsScreenProps = {
  scanCount: number;
  onBack: () => void;
  onOpenSubscription: () => void;
  onOpenLanguage: () => void;
  onOpenSafety: () => void;
  onOpenHelp: () => void;
  onClearHistory: () => void;
  onLogout: () => void;
};

export function SettingsScreen({
  scanCount,
  onBack,
  onOpenSubscription,
  onOpenLanguage,
  onOpenSafety,
  onOpenHelp,
  onClearHistory,
  onLogout
}: SettingsScreenProps) {
  const { t } = useI18n();

  const confirmClearHistory = () => {
    Alert.alert(t("settings.clearHistoryTitle"), t("settings.clearHistoryBody"), [
      { text: t("settings.cancel"), style: "cancel" },
      { text: t("settings.clear"), style: "destructive", onPress: onClearHistory }
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <AppTopBar showBack onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.menuList}>
          <SettingsRow icon={CreditCard} label={t("settings.subscription")} onPress={onOpenSubscription} />
          <SettingsRow icon={Languages} label={t("settings.language")} onPress={onOpenLanguage} />
          <SettingsRow icon={ShieldPlus} label={t("settings.safetyDisclaimer")} onPress={onOpenSafety} />
          <View style={styles.divider} />
          <SettingsRow
            icon={Trash2}
            label={t("settings.clearScanHistory", { count: scanCount })}
            onPress={confirmClearHistory}
          />
          <SettingsRow icon={CircleHelp} label={t("settings.helpSupport")} onPress={onOpenHelp} />
        </View>

        <Pressable accessibilityRole="button" onPress={onLogout} style={styles.logout}>
          <Text style={styles.logoutText}>{t("settings.logout")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

type SettingsRowProps = {
  icon: typeof CreditCard;
  label: string;
  onPress?: () => void;
};

function SettingsRow({ icon: Icon, label, onPress }: SettingsRowProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View style={styles.rowLeft}>
        <Icon color={colors.primary} size={21} strokeWidth={1.9} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <ChevronRight color={colors.borderStrong} size={18} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 36,
    padding: 24,
    paddingBottom: 138,
    paddingTop: 14
  },
  menuList: {
    gap: 8
  },
  row: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 62,
    padding: 16
  },
  rowLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16
  },
  rowLabel: {
    color: colors.ink,
    ...typography.sectionTitle
  },
  divider: {
    backgroundColor: colors.borderSoft,
    height: StyleSheet.hairlineWidth,
    marginVertical: 12
  },
  logout: {
    alignSelf: "center",
    backgroundColor: colors.dangerSoft,
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 12
  },
  logoutText: {
    color: colors.high,
    ...typography.badge
  }
});
