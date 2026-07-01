import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Trash2, UserRound } from "lucide-react-native";
import { colors } from "../constants/colors";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { PrimaryButton } from "../components/PrimaryButton";

type SettingsScreenProps = {
  scanCount: number;
  onBack: () => void;
  onEditProfile: () => void;
  onClearHistory: () => void;
};

export function SettingsScreen({
  scanCount,
  onBack,
  onEditProfile,
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
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={onBack}
          style={styles.backButton}
        >
          <ChevronLeft color={colors.ink} size={24} strokeWidth={2.3} />
        </Pressable>
        <Text style={styles.topTitle}>Sift</Text>
        <View style={styles.topSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <PrimaryButton label="Edit allergy profile" icon={UserRound} tone="secondary" onPress={onEditProfile} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved scans</Text>
          <Text style={styles.body}>{scanCount} scans saved on this device.</Text>
          <PrimaryButton
            label="Clear history"
            icon={Trash2}
            tone="secondary"
            onPress={confirmClearHistory}
          />
        </View>

        <DisclaimerBanner />

        <Text style={styles.version}>Sift 0.1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    height: 56,
    paddingHorizontal: 14
  },
  backButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44
  },
  topTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0,
    textAlign: "center"
  },
  topSpacer: {
    width: 44
  },
  content: {
    gap: 20,
    padding: 20,
    paddingTop: 8
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 16
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0
  },
  body: {
    color: colors.inkMuted,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 21
  },
  version: {
    color: colors.inkSubtle,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    textAlign: "center"
  }
});
