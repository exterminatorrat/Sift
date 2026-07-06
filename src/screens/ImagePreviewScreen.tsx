import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RotateCcw, ScanSearch } from "lucide-react-native";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { PreparedMenuImage } from "../types/image";
import { PrimaryButton } from "../components/PrimaryButton";
import { AppTopBar } from "../components/AppTopBar";
import { useI18n } from "../i18n/I18nProvider";

type ImagePreviewScreenProps = {
  image: PreparedMenuImage | null;
  imageSource: "camera" | "library";
  onBack: () => void;
  onChooseAgain: () => void;
  onUsePhoto: () => void;
};

export function ImagePreviewScreen({
  image,
  imageSource,
  onBack,
  onChooseAgain,
  onUsePhoto
}: ImagePreviewScreenProps) {
  const { t } = useI18n();
  const chooseAgainLabel =
    imageSource === "library" ? t("imagePreview.rechoose") : t("imagePreview.retake");

  return (
    <SafeAreaView style={styles.screen}>
      <AppTopBar showBack onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>{t("imagePreview.title")}</Text>
          <Text style={styles.body}>{t("imagePreview.body")}</Text>
        </View>

        {image ? (
          <Image source={{ uri: image.uri }} resizeMode="cover" style={styles.preview} />
        ) : (
          <View style={styles.emptyPreview}>
            <Text style={styles.emptyText}>{t("imagePreview.noImage")}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <PrimaryButton label={t("imagePreview.usePhoto")} icon={ScanSearch} onPress={onUsePhoto} disabled={!image} />
          <PrimaryButton
            label={chooseAgainLabel}
            icon={RotateCcw}
            tone="secondary"
            onPress={onChooseAgain}
          />
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
    gap: 12,
    padding: 24,
    paddingTop: 0,
    paddingBottom: 12
  },
  hero: {
    gap: 10
  },
  title: {
    color: colors.ink,
    ...typography.title
  },
  body: {
    color: colors.inkMuted,
    ...typography.body
  },
  preview: {
    aspectRatio: 3 / 4,
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    width: "100%"
  },
  emptyPreview: {
    alignItems: "center",
    aspectRatio: 3 / 4,
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    width: "100%"
  },
  emptyText: {
    color: colors.inkMuted,
    ...typography.label
  },
  actions: {
    gap: 12
  }
});
