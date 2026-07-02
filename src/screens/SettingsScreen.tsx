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
import { AppTopBar } from "../components/AppTopBar";

type SettingsScreenProps = {
  scanCount: number;
  onBack: () => void;
  onOpenSubscription: () => void;
  onOpenLanguage: () => void;
  onOpenSafety: () => void;
  onOpenHelp: () => void;
  onClearHistory: () => void;
};

export function SettingsScreen({
  scanCount,
  onBack,
  onOpenSubscription,
  onOpenLanguage,
  onOpenSafety,
  onOpenHelp,
  onClearHistory
}: SettingsScreenProps) {
  const confirmClearHistory = () => {
    Alert.alert("Clear scan history?", "This only clears saved scans on this device.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: onClearHistory }
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <AppTopBar showBack onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.menuList}>
          <SettingsRow icon={CreditCard} label="Subscription" onPress={onOpenSubscription} />
          <SettingsRow icon={Languages} label="Language" onPress={onOpenLanguage} />
          <SettingsRow icon={ShieldPlus} label="Safety Disclaimer" onPress={onOpenSafety} />
          <View style={styles.divider} />
          <SettingsRow icon={Trash2} label={`Clear Scan History (${scanCount})`} onPress={confirmClearHistory} />
          <SettingsRow icon={CircleHelp} label="Help / Support" onPress={onOpenHelp} />
        </View>

        <Pressable accessibilityRole="button" style={styles.logout}>
          <Text style={styles.logoutText}>LOG OUT</Text>
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
    fontSize: 18,
    fontWeight: "400",
    letterSpacing: 0,
    lineHeight: 30
  },
  divider: {
    backgroundColor: "rgba(206,197,188,0.2)",
    height: StyleSheet.hairlineWidth,
    marginVertical: 12
  },
  logout: {
    alignSelf: "center",
    backgroundColor: "rgba(255,218,214,0.2)",
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 12
  },
  logoutText: {
    color: colors.high,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 1.3,
    lineHeight: 18
  }
});
