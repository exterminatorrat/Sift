import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, ScanSearch, Trash2 } from "lucide-react-native";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { PrimaryButton } from "../components/PrimaryButton";
import { AppTopBar } from "../components/AppTopBar";
import { MAX_MENU_IMAGES_PER_SCAN } from "../constants/menuScan";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { useI18n } from "../i18n/I18nProvider";
import { PreparedMenuImage } from "../types/image";

type ImagePreviewScreenProps = {
  images: PreparedMenuImage[];
  onAddPage: () => void;
  onBack: () => void;
  onRemovePage: (index: number) => void;
  onUsePhotos: () => void;
};

export function ImagePreviewScreen({
  images,
  onAddPage,
  onBack,
  onRemovePage,
  onUsePhotos
}: ImagePreviewScreenProps) {
  const { t } = useI18n();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const effectiveSelectedIndex = Math.min(selectedIndex, Math.max(0, images.length - 1));
  const selectedImage = images[effectiveSelectedIndex] ?? null;

  useEffect(() => {
    if (selectedIndex >= images.length) {
      setSelectedIndex(Math.max(0, images.length - 1));
    }
  }, [images.length, selectedIndex]);

  const removeSelectedPage = () => {
    if (!selectedImage) {
      return;
    }

    onRemovePage(effectiveSelectedIndex);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <AppTopBar showBack onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>{t("imagePreview.pagesTitle")}</Text>
          <Text style={styles.body}>{t("imagePreview.pagesBody")}</Text>
        </View>

        {selectedImage ? (
          <>
            <View style={styles.previewWrap}>
              <Image source={{ uri: selectedImage.uri }} resizeMode="contain" style={styles.preview} />
              <View style={styles.pageLabel}>
                <Text style={styles.pageLabelText}>
                  {t("imagePreview.pageCount", {
                    current: effectiveSelectedIndex + 1,
                    count: images.length
                  })}
                </Text>
              </View>
              <AnimatedPressable
                accessibilityLabel={t("imagePreview.removePage", { page: effectiveSelectedIndex + 1 })}
                accessibilityRole="button"
                onPress={removeSelectedPage}
                scaleTo={0.9}
                style={styles.removeButton}
              >
                <Trash2 color={colors.avoid} size={20} strokeWidth={2} />
              </AnimatedPressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.thumbnailRow}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {images.map((image, index) => {
                const selected = index === selectedIndex;
                return (
                  <AnimatedPressable
                    accessibilityLabel={t("imagePreview.selectPage", { page: index + 1 })}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={`${image.uri}-${index}`}
                    onPress={() => setSelectedIndex(index)}
                    scaleTo={0.96}
                    style={[styles.thumbnailButton, selected && styles.thumbnailButtonSelected]}
                  >
                    <Image source={{ uri: image.uri }} resizeMode="cover" style={styles.thumbnail} />
                    <View style={[styles.thumbnailIndex, selected && styles.thumbnailIndexSelected]}>
                      <Text style={styles.thumbnailIndexText}>{index + 1}</Text>
                    </View>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>
          </>
        ) : (
          <View style={styles.emptyPreview}>
            <Text style={styles.emptyText}>{t("imagePreview.noPages")}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <PrimaryButton
            disabled={images.length === 0}
            icon={ScanSearch}
            label={t("imagePreview.analyzePages", { count: images.length })}
            onPress={onUsePhotos}
          />
          {images.length < MAX_MENU_IMAGES_PER_SCAN && (
            <PrimaryButton
              icon={Plus}
              label={t("imagePreview.addPage")}
              onPress={onAddPage}
              tone="secondary"
            />
          )}
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
    gap: 16,
    padding: 24,
    paddingBottom: 28,
    paddingTop: 0
  },
  hero: {
    gap: 8
  },
  title: {
    color: colors.ink,
    ...typography.title
  },
  body: {
    color: colors.inkMuted,
    ...typography.body
  },
  previewWrap: {
    aspectRatio: 3 / 4,
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    position: "relative",
    width: "100%"
  },
  preview: {
    height: "100%",
    width: "100%"
  },
  pageLabel: {
    backgroundColor: "rgba(24, 35, 33, 0.78)",
    borderRadius: 999,
    left: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
    position: "absolute",
    top: 12
  },
  pageLabelText: {
    color: colors.textInverse,
    ...typography.caption
  },
  removeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 252, 247, 0.94)",
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    top: 12,
    width: 44
  },
  thumbnailRow: {
    gap: 10,
    paddingHorizontal: 1,
    paddingVertical: 2
  },
  thumbnailButton: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 82,
    overflow: "hidden",
    position: "relative",
    width: 62
  },
  thumbnailButtonSelected: {
    borderColor: colors.primary,
    borderWidth: 3
  },
  thumbnail: {
    height: "100%",
    width: "100%"
  },
  thumbnailIndex: {
    alignItems: "center",
    backgroundColor: "rgba(24, 35, 33, 0.76)",
    borderRadius: 999,
    bottom: 5,
    height: 22,
    justifyContent: "center",
    left: 5,
    position: "absolute",
    width: 22
  },
  thumbnailIndexSelected: {
    backgroundColor: colors.primary
  },
  thumbnailIndexText: {
    color: colors.textInverse,
    ...typography.caption,
    fontSize: 11
  },
  emptyPreview: {
    alignItems: "center",
    aspectRatio: 3 / 4,
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    width: "100%"
  },
  emptyText: {
    color: colors.inkMuted,
    ...typography.label,
    maxWidth: 240,
    textAlign: "center"
  },
  actions: {
    gap: 12
  }
});
