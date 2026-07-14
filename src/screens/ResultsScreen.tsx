import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Languages,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Trash2
} from "lucide-react-native";
import { DishRisk, ScanResult } from "../types/scan";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { RiskCard } from "../components/RiskCard";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { VoiceButton } from "../components/VoiceButton";
import { getRiskMeta } from "../utils/riskLabels";
import { formatDateTime } from "../utils/formatters";
import { useI18n } from "../i18n/I18nProvider";
import { getLanguageCode } from "../i18n/translations";
import { stopSpeech } from "../services/speechService";
import { isSafeSourceReferenceUrl } from "../utils/scanResultValidation";

type ResultsScreenProps = {
  scanResult: ScanResult;
  onBack: () => void;
  onDeleteScan?: (scanId: string) => void | Promise<void>;
  onOpenDish: (dish: DishRisk) => void;
  onOpenHistory?: () => void;
  onRenameScan?: (scanId: string, title: string) => void | Promise<void>;
};

export function ResultsScreen({
  scanResult,
  onBack,
  onDeleteScan,
  onOpenDish,
  onOpenHistory,
  onRenameScan
}: ResultsScreenProps) {
  const { languageCode, t } = useI18n();
  const summaryMeta = getRiskMeta(scanResult.scanSummary.overallRisk, t);
  const scanTitle = scanResult.restaurantName ?? t("home.menuScan");
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const menuPhotoUris =
    scanResult.imageUris && scanResult.imageUris.length > 0
      ? scanResult.imageUris
      : scanResult.imageUri
        ? [scanResult.imageUri]
        : [];
  const hasMenuPhoto = menuPhotoUris.length > 0;
  const lowerConcernDishes = scanResult.dishes.filter((dish) => dish.riskLevel === "low_risk");
  const attentionDishes = scanResult.dishes.filter((dish) => dish.riskLevel !== "low_risk");
  const scanTransparency = scanResult.transparency ?? {
    checked: ["Menu photo", "Allergy profile", "Common ingredient and preparation patterns"],
    limitations: ["Sift cannot verify full ingredients, kitchen preparation, or cross-contact."],
    sourceReferences: [],
    webSearchQueries: []
  };

  const openSourceReference = (uri: string) => {
    if (isSafeSourceReferenceUrl(uri)) {
      void Linking.openURL(uri);
    }
  };
  const restaurantMessageText =
    scanResult.restaurantMessage?.translated ?? scanResult.restaurantMessage?.english ?? "";
  const restaurantLanguageIsEnglish =
    getLanguageCode(scanResult.restaurantMessage?.language) === "en";
  const restaurantLanguageMessageMissing =
    Boolean(scanResult.restaurantMessage?.language) &&
    !restaurantLanguageIsEnglish &&
    !scanResult.restaurantMessage?.translated;
  const staffMessageSpeechText = restaurantLanguageMessageMissing ? "" : restaurantMessageText;
  const userLanguageMessageText =
    scanResult.restaurantMessage?.userLanguageText ?? scanResult.restaurantMessage?.english ?? "";
  const showUserLanguageMessage =
    Boolean(userLanguageMessageText) &&
    userLanguageMessageText.toLowerCase() !== restaurantMessageText.toLowerCase();

  useEffect(() => () => {
    void stopSpeech();
  }, []);

  const handleBack = () => {
    void stopSpeech();
    onBack();
  };

  const handleOpenDish = (dish: DishRisk) => {
    void stopSpeech();
    onOpenDish(dish);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.fixedHeader}>
        <View style={styles.pageHeader}>
          <AnimatedPressable
            accessibilityLabel={t("common.back")}
            accessibilityRole="button"
            onPress={handleBack}
            scaleTo={0.92}
            style={styles.backButton}
          >
            <ChevronLeft color={colors.ink} size={22} strokeWidth={2.2} />
          </AnimatedPressable>
          <Text style={styles.pageTitle}>{t("results.title")}</Text>
          {onRenameScan || onDeleteScan ? (
            <AnimatedPressable
              accessibilityLabel="Open scan options"
              accessibilityRole="button"
              onPress={() => setActionsOpen(true)}
              scaleTo={0.92}
              style={styles.headerActionButton}
            >
              <MoreHorizontal color={colors.ink} size={21} strokeWidth={2.2} />
            </AnimatedPressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>
      </View>
      <View pointerEvents="none" style={styles.headerFade}>
        <View style={[styles.headerFadeBand, styles.headerFadeStrong]} />
        <View style={[styles.headerFadeBand, styles.headerFadeMedium]} />
        <View style={[styles.headerFadeBand, styles.headerFadeSoft]} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            <View style={[styles.badge, { backgroundColor: summaryMeta.background }]}>
              <Text style={[styles.badgeText, { color: summaryMeta.color }]}>
                {summaryMeta.label}
              </Text>
            </View>
            <Text style={styles.date}>{formatDateTime(scanResult.createdAt, languageCode)}</Text>
          </View>
          <Text style={styles.summaryTitle}>{scanResult.scanSummary.summary}</Text>
          <Text style={styles.limitations}>{scanResult.scanSummary.limitations}</Text>
        </View>

        <View style={styles.qualityRow}>
          <ImageIcon color={colors.primary} size={18} strokeWidth={2.1} />
          <Text style={styles.qualityText}>
            {t("results.imageReadability", {
              readability: t(readabilityLabelKey(scanResult.imageQuality.readability))
            })}
          </Text>
          {hasMenuPhoto && (
            <AnimatedPressable
              accessibilityLabel={
                menuPhotoUris.length > 1 ? t("results.viewPhotos") : t("results.viewPhoto")
              }
              accessibilityRole="button"
              onPress={() => {
                setPhotoIndex(0);
                setPhotoOpen(true);
              }}
              scaleTo={0.94}
              style={styles.photoButton}
            >
              <Text style={styles.photoButtonText}>
                {menuPhotoUris.length > 1 ? t("results.viewPhotos") : t("results.viewPhoto")}
              </Text>
            </AnimatedPressable>
          )}
        </View>

        <DisclaimerBanner compact />

        <View style={styles.transparencyCard}>
          <View style={styles.translationHeader}>
            <ListChecks color={colors.primary} size={18} strokeWidth={2.1} />
            <Text style={styles.translationTitle}>{t("results.whatSiftChecked")}</Text>
          </View>
          <View style={styles.transparencyList}>
            {scanTransparency.checked.map((item, index) => (
              <Text key={`${item}-${index}`} style={styles.transparencyItem}>- {item}</Text>
            ))}
          </View>
          <View style={styles.userLanguageReference}>
            {scanTransparency.limitations.map((item, index) => (
              <Text key={`${item}-${index}`} style={styles.userLanguageBody}>- {item}</Text>
            ))}
          </View>
          <View style={styles.userLanguageReference}>
            <Text style={styles.userLanguageLabel}>{t("results.referencesReturned")}</Text>
            {scanTransparency.sourceReferences.length > 0 ? (
              <View style={styles.sourceList}>
                {scanTransparency.sourceReferences.map((source, index) => (
                  <Text
                    key={`${source.uri}-${index}`}
                    onPress={() => {
                      openSourceReference(source.uri);
                    }}
                    style={styles.sourceLink}
                  >
                    {source.title}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.userLanguageBody}>{t("results.noReferences")}</Text>
            )}
          </View>
          {scanTransparency.webSearchQueries && scanTransparency.webSearchQueries.length > 0 && (
            <View style={styles.queryList}>
              <Text style={styles.userLanguageLabel}>{t("results.searchQueries")}</Text>
              <View style={styles.queryPills}>
                {scanTransparency.webSearchQueries.map((query, index) => (
                  <View key={`${query}-${index}`} style={styles.queryPill}>
                    <Text style={styles.queryPillText}>{query}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {attentionDishes.length > 0 && (
          <View style={styles.dishSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("results.needsAttention")}</Text>
              <Text style={styles.sectionMeta}>
                {t("common.itemsCount", { count: attentionDishes.length })}
              </Text>
            </View>
            <View style={styles.cards}>
              {attentionDishes.map((dish) => (
                <RiskCard key={dish.id} dish={dish} onPress={() => handleOpenDish(dish)} />
              ))}
            </View>
          </View>
        )}

        {lowerConcernDishes.length > 0 && (
          <View style={styles.dishSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("results.lowerConcern")}</Text>
              <Text style={styles.sectionMeta}>
                {t("common.itemsCount", { count: lowerConcernDishes.length })}
              </Text>
            </View>
            <Text style={styles.sectionDescription}>{t("results.lowerConcernBody")}</Text>
            <View style={styles.cards}>
              {lowerConcernDishes.map((dish) => (
                <RiskCard key={dish.id} dish={dish} onPress={() => handleOpenDish(dish)} />
              ))}
            </View>
          </View>
        )}

        {scanResult.dishes.length === 0 && (
          <View style={styles.dishSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("results.dishesFound")}</Text>
              <Text style={styles.sectionMeta}>{t("common.itemsCount", { count: 0 })}</Text>
            </View>
            <Text style={styles.sectionDescription}>{scanResult.scanSummary.summary}</Text>
          </View>
        )}

        {scanResult.restaurantMessage && (
          <View style={styles.translationPreview}>
            <View style={styles.staffMessageHeader}>
              <View style={styles.translationHeaderText}>
                <Languages color={colors.primary} size={18} strokeWidth={2.1} />
                <Text style={styles.translationTitle}>{t("results.restaurantMessage")}</Text>
              </View>
              <VoiceButton
                fallbackLanguageCode={languageCode}
                iconOnly
                label={t("voice.playMessage")}
                languageHint={scanResult.restaurantMessage.language}
                stopLabel={t("voice.stop")}
                style={styles.headerVoiceButton}
                text={staffMessageSpeechText}
                unavailableLabel={t("voice.unavailable")}
              />
            </View>
            <Text style={styles.translationBody}>
              {restaurantMessageText}
            </Text>
            {restaurantLanguageMessageMissing && (
              <Text style={styles.missingTranslationText}>{t("results.restaurantMessageMissing")}</Text>
            )}
            {showUserLanguageMessage && (
              <View style={styles.userLanguageReference}>
                <Text style={styles.userLanguageLabel}>{t("results.userLanguageReference")}</Text>
                <Text style={styles.userLanguageBody}>{userLanguageMessageText}</Text>
              </View>
            )}
          </View>
        )}

        {onOpenHistory && (
          <Text style={styles.savedNote} onPress={onOpenHistory}>
            {t("results.savedToHistory")}
          </Text>
        )}
      </ScrollView>

      {menuPhotoUris.length > 0 && (
        <Modal
          animationType="fade"
          onRequestClose={() => setPhotoOpen(false)}
          transparent
          visible={photoOpen}
        >
          <View style={styles.photoOverlay}>
            <View style={styles.photoViewer}>
              <View style={styles.photoHeader}>
                <Text style={styles.photoTitle}>
                  {menuPhotoUris.length > 1 ? t("results.menuPhotos") : t("results.menuPhoto")}
                </Text>
                <AnimatedPressable
                  accessibilityLabel={t("common.close")}
                  accessibilityRole="button"
                  onPress={() => setPhotoOpen(false)}
                  scaleTo={0.92}
                  style={styles.photoCloseButton}
                >
                  <Text style={styles.photoCloseText}>{t("common.close")}</Text>
                </AnimatedPressable>
              </View>
              <Image
                resizeMode="contain"
                source={{ uri: menuPhotoUris[photoIndex] ?? menuPhotoUris[0] }}
                style={styles.menuPhoto}
              />
              {menuPhotoUris.length > 1 && (
                <View style={styles.photoPagination}>
                  <AnimatedPressable
                    accessibilityLabel={t("results.previousPhoto")}
                    accessibilityRole="button"
                    disabled={photoIndex === 0}
                    onPress={() => setPhotoIndex((current) => Math.max(0, current - 1))}
                    scaleTo={0.9}
                    style={[styles.photoPageButton, photoIndex === 0 && styles.photoPageButtonDisabled]}
                  >
                    <ChevronLeft color={colors.ink} size={21} strokeWidth={2.1} />
                  </AnimatedPressable>
                  <Text style={styles.photoPageText}>
                    {t("results.photoCount", {
                      current: photoIndex + 1,
                      count: menuPhotoUris.length
                    })}
                  </Text>
                  <AnimatedPressable
                    accessibilityLabel={t("results.nextPhoto")}
                    accessibilityRole="button"
                    disabled={photoIndex === menuPhotoUris.length - 1}
                    onPress={() =>
                      setPhotoIndex((current) => Math.min(menuPhotoUris.length - 1, current + 1))
                    }
                    scaleTo={0.9}
                    style={[
                      styles.photoPageButton,
                      photoIndex === menuPhotoUris.length - 1 && styles.photoPageButtonDisabled
                    ]}
                  >
                    <ChevronRight color={colors.ink} size={21} strokeWidth={2.1} />
                  </AnimatedPressable>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

      <ScanActionsModal
        onClose={() => setActionsOpen(false)}
        onDelete={() => {
          setActionsOpen(false);
          setDeleteOpen(true);
        }}
        onRename={() => {
          setActionsOpen(false);
          setRenameOpen(true);
        }}
        showDelete={Boolean(onDeleteScan)}
        showRename={Boolean(onRenameScan)}
        visible={actionsOpen}
      />
      <RenameScanModal
        initialTitle={scanTitle}
        onCancel={() => setRenameOpen(false)}
        onSave={(title) => {
          void onRenameScan?.(scanResult.id, title);
          setRenameOpen(false);
        }}
        visible={renameOpen}
      />
      <DeleteScanModal
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          void onDeleteScan?.(scanResult.id);
        }}
        title={scanTitle}
        visible={deleteOpen}
      />
    </SafeAreaView>
  );
}

type ScanActionsModalProps = {
  onClose: () => void;
  onDelete: () => void;
  onRename: () => void;
  showDelete: boolean;
  showRename: boolean;
  visible: boolean;
};

function ScanActionsModal({
  onClose,
  onDelete,
  onRename,
  showDelete,
  showRename,
  visible
}: ScanActionsModalProps) {
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    scale.setValue(0.96);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 130,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.timing(scale, {
        duration: 170,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      })
    ]).start();
  }, [opacity, scale, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="none" onRequestClose={onClose} transparent visible>
      <View style={styles.actionOverlay}>
        <Pressable
          accessibilityLabel="Close scan options"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.actionDismissLayer}
        />
        <Animated.View
          style={[
            styles.actionMenu,
            {
              opacity,
              transform: [{ scale }]
            }
          ]}
        >
          {showRename && (
            <Pressable
              accessibilityRole="button"
              onPress={onRename}
              style={({ pressed }) => [styles.actionMenuRow, pressed && styles.actionMenuRowPressed]}
            >
              <Pencil color={colors.ink} size={17} strokeWidth={2.2} />
              <Text style={styles.actionMenuText}>Rename</Text>
            </Pressable>
          )}
          {showRename && showDelete && <View style={styles.actionMenuDivider} />}
          {showDelete && (
            <Pressable
              accessibilityRole="button"
              onPress={onDelete}
              style={({ pressed }) => [styles.actionMenuRow, pressed && styles.actionMenuRowPressed]}
            >
              <Trash2 color={colors.avoid} size={17} strokeWidth={2.2} />
              <Text style={styles.actionMenuDeleteText}>Delete</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

type RenameScanModalProps = {
  initialTitle: string;
  onCancel: () => void;
  onSave: (title: string) => void;
  visible: boolean;
};

function RenameScanModal({ initialTitle, onCancel, onSave, visible }: RenameScanModalProps) {
  const [draftTitle, setDraftTitle] = useState(initialTitle);
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    setDraftTitle(initialTitle);
    scale.setValue(0.96);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 130,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.timing(scale, {
        duration: 170,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      })
    ]).start();
  }, [initialTitle, opacity, scale, visible]);

  if (!visible) {
    return null;
  }

  const trimmedTitle = draftTitle.trim();

  return (
    <Modal animationType="none" onRequestClose={onCancel} transparent visible>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.renameOverlay}
      >
        <Pressable
          accessibilityLabel="Close rename scan"
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.renameDismissLayer}
        />
        <Animated.View
          style={[
            styles.renameCard,
            {
              opacity,
              transform: [{ scale }]
            }
          ]}
        >
          <View style={styles.renameHeader}>
            <Text style={styles.renameTitle}>Rename scan</Text>
            <Text style={styles.renameBody}>Give this saved scan a short, recognizable name.</Text>
          </View>
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            onChangeText={setDraftTitle}
            onSubmitEditing={() => {
              if (trimmedTitle) {
                onSave(trimmedTitle);
              }
            }}
            placeholder="Scan name"
            placeholderTextColor={colors.inkSubtle}
            returnKeyType="done"
            selectTextOnFocus
            style={styles.renameInput}
            value={draftTitle}
          />
          <View style={styles.renameActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [styles.renameButton, pressed && styles.renameButtonPressed]}
            >
              <Text style={styles.renameCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!trimmedTitle}
              onPress={() => onSave(trimmedTitle)}
              style={({ pressed }) => [
                styles.renameButton,
                styles.renameSaveButton,
                !trimmedTitle && styles.renameSaveButtonDisabled,
                pressed && trimmedTitle && styles.renameSaveButtonPressed
              ]}
            >
              <Text style={styles.renameSaveText}>Save</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type DeleteScanModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
};

function DeleteScanModal({ onCancel, onConfirm, title, visible }: DeleteScanModalProps) {
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    scale.setValue(0.96);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 130,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.timing(scale, {
        duration: 170,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      })
    ]).start();
  }, [opacity, scale, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="none" onRequestClose={onCancel} transparent visible>
      <View style={styles.renameOverlay}>
        <Pressable
          accessibilityLabel="Close delete confirmation"
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.renameDismissLayer}
        />
        <Animated.View
          style={[
            styles.renameCard,
            {
              opacity,
              transform: [{ scale }]
            }
          ]}
        >
          <View style={styles.confirmContent}>
            <View style={styles.confirmIconWrap}>
              <Trash2 color={colors.avoid} size={19} strokeWidth={2.3} />
            </View>
            <View style={styles.renameHeader}>
              <Text style={styles.renameTitle}>Delete scan?</Text>
              <Text style={styles.renameBody}>
                This removes "{title}" from your saved scan history on this device.
              </Text>
            </View>
          </View>
          <View style={styles.renameActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [styles.renameButton, pressed && styles.renameButtonPressed]}
            >
              <Text style={styles.renameCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.renameButton,
                styles.deleteConfirmButton,
                pressed && styles.deleteConfirmButtonPressed
              ]}
            >
              <Text style={styles.renameSaveText}>Delete</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function readabilityLabelKey(readability: ScanResult["imageQuality"]["readability"]) {
  if (readability === "clear") {
    return "results.readability.clear" as const;
  }
  if (readability === "partially_clear") {
    return "results.readability.partiallyClear" as const;
  }
  return "results.readability.poor" as const;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 16,
    padding: 24,
    paddingBottom: 12,
    paddingTop: 0
  },
  fixedHeader: {
    backgroundColor: colors.background,
    paddingBottom: 14,
    paddingHorizontal: 24,
    paddingTop: 18,
    shadowColor: colors.background,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    zIndex: 3
  },
  headerFade: {
    height: 18,
    overflow: "hidden",
    zIndex: 2
  },
  headerFadeBand: {
    backgroundColor: colors.background,
    left: 0,
    position: "absolute",
    right: 0
  },
  headerFadeStrong: {
    height: 6,
    opacity: 0.82,
    top: 0
  },
  headerFadeMedium: {
    height: 7,
    opacity: 0.42,
    top: 5
  },
  headerFadeSoft: {
    height: 8,
    opacity: 0.16,
    top: 10
  },
  pageHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    height: 44,
    justifyContent: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    width: 44
  },
  pageTitle: {
    color: colors.primaryDark,
    ...typography.pageTitle,
    flex: 1,
    textAlign: "center"
  },
  headerSpacer: {
    height: 44,
    width: 44
  },
  headerActionButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    height: 44,
    justifyContent: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    width: 44
  },
  summary: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 9,
    padding: 16
  },
  summaryTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  badgeText: {
    ...typography.badge
  },
  date: {
    color: colors.inkSubtle,
    ...typography.badge
  },
  summaryTitle: {
    color: colors.ink,
    ...typography.sectionTitle
  },
  summaryBody: {
    color: colors.inkMuted,
    ...typography.body
  },
  limitations: {
    color: colors.inkMuted,
    ...typography.caption,
    lineHeight: 19
  },
  qualityRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 9,
    padding: 13
  },
  qualityText: {
    color: colors.ink,
    flex: 1,
    ...typography.label,
    textTransform: "capitalize"
  },
  photoButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  photoButtonText: {
    color: colors.primaryDark,
    ...typography.badge
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4
  },
  sectionTitle: {
    color: colors.ink,
    ...typography.badge,
    textTransform: "uppercase"
  },
  sectionMeta: {
    color: colors.inkSubtle,
    ...typography.badge
  },
  dishSection: {
    gap: 12
  },
  sectionDescription: {
    color: colors.inkMuted,
    ...typography.bodySmall
  },
  cards: {
    gap: 16
  },
  transparencyCard: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    padding: 16
  },
  transparencyList: {
    gap: 6
  },
  transparencyItem: {
    color: colors.ink,
    ...typography.bodySmall
  },
  translationPreview: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    padding: 16
  },
  translationHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  staffMessageHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  translationHeaderText: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    paddingTop: 8
  },
  headerVoiceButton: {
    alignItems: "flex-end",
    flexShrink: 0
  },
  translationTitle: {
    color: colors.ink,
    ...typography.label,
    fontFamily: typography.label.fontFamily,
    fontWeight: "600"
  },
  translationBody: {
    color: colors.inkMuted,
    ...typography.bodySmall
  },
  missingTranslationText: {
    color: colors.avoid,
    ...typography.caption,
    lineHeight: 18
  },
  userLanguageReference: {
    borderTopColor: colors.borderSoft,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 7,
    paddingTop: 10
  },
  userLanguageLabel: {
    color: colors.inkSubtle,
    ...typography.badge,
    textTransform: "uppercase"
  },
  userLanguageBody: {
    color: colors.inkMuted,
    ...typography.caption,
    lineHeight: 19
  },
  sourceList: {
    gap: 8
  },
  sourceLink: {
    color: colors.primary,
    ...typography.bodySmall,
    textDecorationLine: "underline"
  },
  queryList: {
    gap: 8
  },
  queryPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  queryPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  queryPillText: {
    color: colors.primaryDark,
    ...typography.badge
  },
  savedNote: {
    color: colors.inkSubtle,
    ...typography.badge,
    textAlign: "center",
    textTransform: "uppercase"
  },
  photoOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(28, 30, 28, 0.62)",
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  photoViewer: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: "84%",
    overflow: "hidden",
    padding: 12,
    width: "100%"
  },
  photoHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 10
  },
  photoTitle: {
    color: colors.ink,
    ...typography.sectionTitle
  },
  photoCloseButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  photoCloseText: {
    color: colors.ink,
    ...typography.badge
  },
  photoPagination: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 54,
    paddingTop: 10
  },
  photoPageButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  photoPageButtonDisabled: {
    opacity: 0.36
  },
  photoPageText: {
    color: colors.inkMuted,
    ...typography.label
  },
  actionOverlay: {
    alignItems: "flex-end",
    backgroundColor: "rgba(24, 35, 33, 0.16)",
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 112
  },
  actionDismissLayer: {
    ...StyleSheet.absoluteFillObject
  },
  actionMenu: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 5,
    overflow: "hidden",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    width: 176
  },
  actionMenuRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 16
  },
  actionMenuRowPressed: {
    backgroundColor: colors.surfaceMuted
  },
  actionMenuText: {
    color: colors.ink,
    ...typography.label
  },
  actionMenuDeleteText: {
    color: colors.avoid,
    ...typography.label
  },
  actionMenuDivider: {
    backgroundColor: colors.borderSoft,
    height: StyleSheet.hairlineWidth
  },
  renameOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(24, 35, 33, 0.28)",
    flex: 1,
    justifyContent: "center",
    padding: 22
  },
  renameDismissLayer: {
    ...StyleSheet.absoluteFillObject
  },
  renameCard: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 18,
    padding: 18,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    width: "100%"
  },
  renameHeader: {
    flex: 1,
    gap: 6
  },
  renameTitle: {
    color: colors.ink,
    ...typography.sectionTitle
  },
  renameBody: {
    color: colors.inkMuted,
    ...typography.bodySmall
  },
  renameInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.ink,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 0,
    textAlignVertical: "center",
    ...typography.body
  },
  renameActions: {
    flexDirection: "row",
    gap: 10
  },
  renameButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    flex: 1,
    justifyContent: "center",
    minHeight: 46
  },
  renameButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }]
  },
  renameCancelText: {
    color: colors.ink,
    ...typography.label
  },
  renameSaveButton: {
    backgroundColor: colors.primary
  },
  renameSaveButtonPressed: {
    backgroundColor: colors.primaryDark
  },
  renameSaveButtonDisabled: {
    backgroundColor: colors.disabled
  },
  renameSaveText: {
    color: colors.textInverse,
    ...typography.label
  },
  confirmContent: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12
  },
  confirmIconWrap: {
    alignItems: "center",
    backgroundColor: colors.avoidSoft,
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  deleteConfirmButton: {
    backgroundColor: colors.avoid
  },
  deleteConfirmButtonPressed: {
    backgroundColor: colors.danger
  },
  menuPhoto: {
    backgroundColor: colors.ink,
    borderRadius: 12,
    height: 520,
    maxHeight: "92%",
    width: "100%"
  }
});
