import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RotateCcw, ScanSearch } from "lucide-react-native";
import { colors } from "../constants/colors";
import { PreparedMenuImage } from "../types/image";
import { PrimaryButton } from "../components/PrimaryButton";

type ImagePreviewScreenProps = {
  image: PreparedMenuImage | null;
  onRetake: () => void;
  onUsePhoto: () => void;
};

export function ImagePreviewScreen({ image, onRetake, onUsePhoto }: ImagePreviewScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Preview</Text>
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
    gap: 20,
    padding: 20
  },
  hero: {
    gap: 8
  },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 36
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
    borderRadius: 20,
    borderWidth: 1,
    width: "100%"
  },
  emptyPreview: {
    alignItems: "center",
    aspectRatio: 3 / 4,
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
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
