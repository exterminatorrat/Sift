import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera, Upload } from "lucide-react-native";
import { colors } from "../constants/colors";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { PrimaryButton } from "../components/PrimaryButton";
import { AppTopBar } from "../components/AppTopBar";

type ScanCaptureScreenProps = {
  error?: string | null;
  onBack: () => void;
  onTakePhoto: () => void;
  onUploadPhoto: () => void;
};

export function ScanCaptureScreen({
  error,
  onBack,
  onTakePhoto,
  onUploadPhoto
}: ScanCaptureScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <AppTopBar showBack onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>Capture one clear menu page.</Text>
          <Text style={styles.body}>
            Keep the page flat, include dish descriptions when possible, and avoid glare.
          </Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.actions}>
          <PrimaryButton label="Take photo" icon={Camera} onPress={onTakePhoto} />
          <PrimaryButton label="Upload photo" icon={Upload} tone="secondary" onPress={onUploadPhoto} />
        </View>

        <DisclaimerBanner compact />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 24,
    padding: 24,
    paddingTop: 48
  },
  hero: {
    gap: 10,
    paddingTop: 0
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "300",
    letterSpacing: 0,
    lineHeight: 40
  },
  body: {
    color: colors.inkMuted,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 24
  },
  actions: {
    gap: 12
  },
  error: {
    backgroundColor: colors.highSoft,
    borderColor: colors.high,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.avoid,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 20,
    padding: 14
  }
});
