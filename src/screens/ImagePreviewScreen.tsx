import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RotateCcw, ScanSearch } from "lucide-react-native";
import { colors } from "../constants/colors";
import { PreparedMenuImage } from "../types/image";
import { PrimaryButton } from "../components/PrimaryButton";
import { AppTopBar } from "../components/AppTopBar";

type ImagePreviewScreenProps = {
  image: PreparedMenuImage | null;
  onRetake: () => void;
  onUsePhoto: () => void;
};

export function ImagePreviewScreen({ image, onRetake, onUsePhoto }: ImagePreviewScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <AppTopBar showBack onBack={onRetake} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>Use this menu photo?</Text>
          <Text style={styles.body}>If text is cut off or blurry, retake it before analysis.</Text>
        </View>

        {image ? (
          <Image source={{ uri: image.uri }} resizeMode="cover" style={styles.preview} />
        ) : (
          <View style={styles.emptyPreview}>
            <Text style={styles.emptyText}>No image selected.</Text>
          </View>
        )}

        <View style={styles.actions}>
          <PrimaryButton label="Use photo" icon={ScanSearch} onPress={onUsePhoto} disabled={!image} />
          <PrimaryButton label="Retake" icon={RotateCcw} tone="secondary" onPress={onRetake} />
        </View>
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
    gap: 12
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
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 22
  },
  preview: {
    aspectRatio: 3 / 4,
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    width: "100%"
  },
  emptyPreview: {
    alignItems: "center",
    aspectRatio: 3 / 4,
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    width: "100%"
  },
  emptyText: {
    color: colors.inkMuted,
    fontSize: 14,
    fontWeight: "700"
  },
  actions: {
    gap: 12
  }
});
