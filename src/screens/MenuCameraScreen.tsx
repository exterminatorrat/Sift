import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Flashlight,
  FlashlightOff,
  Images,
  Plus,
  ScanLine,
  Trash2,
  X
} from "lucide-react-native";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { useI18n } from "../i18n/I18nProvider";
import { prepareCapturedMenuImage } from "../services/imageService";
import { PreparedMenuImage } from "../types/image";

type MenuCameraScreenProps = {
  images: PreparedMenuImage[];
  maxImages: number;
  onBack: () => void;
  onAddImage: (image: PreparedMenuImage) => boolean | Promise<boolean>;
  onComplete: () => void;
  onOpenGuide: () => void;
  onRemoveImage: (index: number) => void;
  onUploadPhotos: () => void | Promise<void>;
};

export function MenuCameraScreen({
  images,
  maxImages,
  onBack,
  onAddImage,
  onComplete,
  onOpenGuide,
  onRemoveImage,
  onUploadPhotos
}: MenuCameraScreenProps) {
  const { t } = useI18n();
  const { height, width } = useWindowDimensions();
  const safeAreaInsets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captureNotice, setCaptureNotice] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const maxFrameHeight = Math.max(190, height - 440);
  const frameWidth = Math.min(width - 52, maxFrameHeight * 0.72);
  const frameHeight = frameWidth / 0.72;
  const reachedImageLimit = images.length >= maxImages;
  const previewTopInset = Math.max(
    safeAreaInsets.top,
    Platform.OS === "ios" ? 44 : 24
  );
  const activePreviewIndex =
    previewIndex === null ? null : Math.min(previewIndex, Math.max(0, images.length - 1));
  const previewImage = activePreviewIndex === null ? null : images[activePreviewIndex] ?? null;

  const handleRemovePage = (index: number) => {
    onRemoveImage(index);

    if (previewIndex === null) {
      return;
    }

    if (images.length <= 1) {
      setPreviewIndex(null);
      return;
    }

    if (index < previewIndex) {
      setPreviewIndex(previewIndex - 1);
    } else if (previewIndex >= images.length - 1) {
      setPreviewIndex(images.length - 2);
    }
  };

  const handleCapture = async () => {
    if (!cameraReady || capturing || reachedImageLimit || !cameraRef.current) {
      return;
    }

    setCapturing(true);
    setCameraError(null);

    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!picture) {
        throw new Error("The camera did not return an image.");
      }

      const preparedImage = await prepareCapturedMenuImage(picture);
      const added = await onAddImage(preparedImage);
      if (!added) {
        setCameraError(t("cameraGuide.sessionTooLarge"));
        return;
      }

      setCaptureNotice(
        images.length + 1 >= maxImages
          ? t("cameraGuide.maxPagesReached", { max: maxImages })
          : t("cameraGuide.pageAdded", { count: images.length + 1 })
      );
    } catch {
      setCameraError(t("cameraGuide.captureError"));
    } finally {
      setCapturing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    const canRequestPermission = permission.canAskAgain !== false || Platform.OS === "web";

    return (
      <SafeAreaView style={styles.permissionScreen}>
        <StatusBar style="dark" />
        <View style={styles.permissionTopBar}>
          <AnimatedPressable
            accessibilityLabel={t("common.close")}
            accessibilityRole="button"
            onPress={onBack}
            scaleTo={0.9}
            style={styles.permissionClose}
          >
            <X color={colors.ink} size={21} strokeWidth={2.1} />
          </AnimatedPressable>
        </View>

        <View style={styles.permissionContent}>
          <View style={styles.permissionIcon}>
            <Camera color={colors.primaryDark} size={31} strokeWidth={2} />
          </View>
          <View style={styles.permissionCopy}>
            <Text style={styles.permissionTitle}>{t("cameraGuide.permissionTitle")}</Text>
            <Text style={styles.permissionBody}>{t("cameraGuide.permissionBody")}</Text>
            {cameraError ? <Text style={styles.permissionError}>{cameraError}</Text> : null}
          </View>
          <View style={styles.permissionActions}>
            <PrimaryButton
              label={
                canRequestPermission
                  ? t("cameraGuide.allowCamera")
                  : t("permission.openSettings")
              }
              onPress={() => {
                if (canRequestPermission) {
                  setCameraError(null);
                  void requestPermission().catch(() => {
                    setCameraError(t("cameraGuide.cameraError"));
                  });
                  return;
                }

                void Linking.openSettings().catch(() => {
                  setCameraError(t("cameraGuide.cameraError"));
                });
              }}
            />
            <PrimaryButton
              label={t("scanCapture.uploadPhoto")}
              icon={Images}
              onPress={() => void onUploadPhotos()}
              tone="secondary"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.cameraScreen}>
      <StatusBar style="light" />
      <CameraView
        active={isFocused && previewIndex === null}
        autofocus="on"
        facing="back"
        flash={flash}
        mode="picture"
        onCameraReady={() => setCameraReady(true)}
        onMountError={() => setCameraError(t("cameraGuide.cameraError"))}
        ref={cameraRef}
        responsiveOrientationWhenOrientationLocked
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.cameraOverlay}>
        <View style={styles.cameraTopBar}>
          <CameraIconButton
            accessibilityLabel={t("common.close")}
            onPress={onBack}
          >
            <X color={colors.textInverse} size={22} strokeWidth={2.1} />
          </CameraIconButton>
          <View style={styles.cameraTitleWrap}>
            <Text numberOfLines={1} style={styles.cameraTitle}>
              {t("cameraGuide.cameraTitle")}
            </Text>
            <Text style={styles.cameraPageCount}>
              {t("cameraGuide.pagesCaptured", { count: images.length, max: maxImages })}
            </Text>
          </View>
          <View style={styles.cameraTopActions}>
            <CameraIconButton
              accessibilityLabel={t("cameraGuide.photoTips")}
              onPress={onOpenGuide}
            >
              <CircleHelp color={colors.textInverse} size={20} strokeWidth={2} />
            </CameraIconButton>
            <CameraIconButton
              accessibilityLabel={
                flash === "on" ? t("cameraGuide.turnFlashOff") : t("cameraGuide.turnFlashOn")
              }
              onPress={() => setFlash((current) => (current === "on" ? "off" : "on"))}
            >
              {flash === "on" ? (
                <Flashlight color={colors.textInverse} size={20} strokeWidth={2.1} />
              ) : (
                <FlashlightOff color={colors.textInverse} size={20} strokeWidth={2.1} />
              )}
            </CameraIconButton>
          </View>
        </View>

        <View style={styles.guideArea}>
          <View style={[styles.guideStatus, cameraError && styles.guideStatusError]}>
            <ScanLine
              color={cameraError ? colors.dangerSoft : colors.textInverse}
              size={17}
              strokeWidth={2.2}
            />
            <Text style={styles.guideStatusText}>
              {cameraError ??
                (reachedImageLimit
                  ? t("cameraGuide.maxPagesReached", { max: maxImages })
                  : captureNotice ?? t("cameraGuide.frameInstruction"))}
            </Text>
          </View>

          <View style={[styles.cameraFrame, { height: frameHeight, width: frameWidth }]}>
            <FrameCorners />
          </View>

          <View style={styles.steadyHint}>
            <Text style={styles.steadyHintText}>{t("cameraGuide.steadyHint")}</Text>
          </View>
        </View>

        <View style={styles.cameraBottomPanel}>
          <View style={styles.pageTray}>
            <ScrollView
              contentContainerStyle={styles.pageTrayContent}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {Array.from({ length: maxImages }, (_, index) => {
                const image = images[index];

                if (!image) {
                  return (
                    <AnimatedPressable
                      accessibilityLabel={t("cameraGuide.addPageSlot", { page: index + 1 })}
                      accessibilityRole="button"
                      disabled={capturing}
                      key={`empty-page-${index}`}
                      onPress={() => void onUploadPhotos()}
                      scaleTo={0.96}
                      style={styles.pageSkeletonSlot}
                    >
                      <Plus color="rgba(255, 255, 255, 0.64)" size={17} strokeWidth={2} />
                      <View style={styles.pageSkeletonLines}>
                        <View style={styles.pageSkeletonLineWide} />
                        <View style={styles.pageSkeletonLine} />
                      </View>
                    </AnimatedPressable>
                  );
                }

                return (
                  <View key={`${image.uri}-${index}`} style={styles.pageThumbnailWrap}>
                    <AnimatedPressable
                      accessibilityLabel={t("cameraGuide.previewPage", { page: index + 1 })}
                      accessibilityRole="button"
                      onPress={() => setPreviewIndex(index)}
                      scaleTo={0.96}
                      style={styles.pagePreviewButton}
                    >
                      <Image resizeMode="cover" source={{ uri: image.uri }} style={styles.pageThumbnail} />
                    </AnimatedPressable>
                    <View pointerEvents="none" style={styles.pageNumberBadge}>
                      <Text style={styles.pageNumberText}>{index + 1}</Text>
                    </View>
                    <AnimatedPressable
                      accessibilityLabel={t("cameraGuide.removePage", { page: index + 1 })}
                      accessibilityRole="button"
                      onPress={() => {
                        setCameraError(null);
                        setCaptureNotice(null);
                        handleRemovePage(index);
                      }}
                      scaleTo={0.88}
                      style={styles.removePageButton}
                    >
                      <X color={colors.textInverse} size={13} strokeWidth={2.4} />
                    </AnimatedPressable>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.cameraControls}>
            <CameraIconButton
              accessibilityLabel={t("cameraGuide.photoLibrary")}
              disabled={reachedImageLimit}
              onPress={() => void onUploadPhotos()}
              size="large"
            >
              <Images color={colors.textInverse} size={23} strokeWidth={2} />
            </CameraIconButton>

            <AnimatedPressable
              accessibilityLabel={t("cameraGuide.takePhoto")}
              accessibilityRole="button"
              disabled={!cameraReady || capturing || reachedImageLimit}
              onPress={() => void handleCapture()}
              scaleTo={0.94}
              style={[
                styles.shutter,
                (!cameraReady || capturing || reachedImageLimit) && styles.shutterDisabled
              ]}
            >
              <View style={styles.shutterInner}>
                {capturing && <ActivityIndicator color="#101816" />}
              </View>
            </AnimatedPressable>

            <CameraIconButton
              accessibilityLabel={t("cameraGuide.reviewPages")}
              disabled={images.length === 0}
              emphasis
              onPress={onComplete}
              size="large"
            >
              <Check color={colors.textInverse} size={25} strokeWidth={2.4} />
            </CameraIconButton>
          </View>
        </View>
      </SafeAreaView>

      {previewImage && activePreviewIndex !== null && (
        <Modal
          animationType="fade"
          onRequestClose={() => setPreviewIndex(null)}
          presentationStyle="fullScreen"
          visible
        >
          <View style={styles.fullscreenPreview}>
            <StatusBar style="light" />
            <SafeAreaView
              edges={["left", "right", "bottom"]}
              style={[
                styles.fullscreenPreviewSafeArea,
                { paddingTop: previewTopInset + 10 }
              ]}
            >
              <View style={styles.fullscreenPreviewHeader}>
                <CameraIconButton
                  accessibilityLabel={t("common.close")}
                  onPress={() => setPreviewIndex(null)}
                >
                  <X color={colors.textInverse} size={22} strokeWidth={2.1} />
                </CameraIconButton>
                <Text numberOfLines={1} style={styles.fullscreenPreviewTitle}>
                  {t("cameraGuide.fullscreenPage", {
                    current: activePreviewIndex + 1,
                    count: images.length
                  })}
                </Text>
                <CameraIconButton
                  accessibilityLabel={t("cameraGuide.removePage", {
                    page: activePreviewIndex + 1
                  })}
                  onPress={() => handleRemovePage(activePreviewIndex)}
                >
                  <Trash2 color={colors.dangerSoft} size={20} strokeWidth={2.1} />
                </CameraIconButton>
              </View>

              <View style={styles.fullscreenPreviewStage}>
                <Image
                  resizeMode="contain"
                  source={{ uri: previewImage.uri }}
                  style={styles.fullscreenPreviewImage}
                />
              </View>

              <View style={styles.fullscreenPreviewFooter}>
                <CameraIconButton
                  accessibilityLabel={t("cameraGuide.previousPage")}
                  disabled={activePreviewIndex === 0}
                  onPress={() => setPreviewIndex((current) => Math.max(0, (current ?? 0) - 1))}
                  size="large"
                >
                  <ChevronLeft color={colors.textInverse} size={24} strokeWidth={2.1} />
                </CameraIconButton>

                <View style={styles.fullscreenPageDots}>
                  {images.map((image, index) => (
                    <AnimatedPressable
                      accessibilityLabel={t("cameraGuide.previewPage", { page: index + 1 })}
                      accessibilityRole="button"
                      accessibilityState={{ selected: index === activePreviewIndex }}
                      key={`${image.uri}-dot-${index}`}
                      onPress={() => setPreviewIndex(index)}
                      scaleTo={0.9}
                      style={[
                        styles.fullscreenPageDot,
                        index === activePreviewIndex && styles.fullscreenPageDotActive
                      ]}
                    >
                      <View />
                    </AnimatedPressable>
                  ))}
                </View>

                <CameraIconButton
                  accessibilityLabel={t("cameraGuide.nextPage")}
                  disabled={activePreviewIndex === images.length - 1}
                  onPress={() =>
                    setPreviewIndex((current) =>
                      Math.min(images.length - 1, (current ?? 0) + 1)
                    )
                  }
                  size="large"
                >
                  <ChevronRight color={colors.textInverse} size={24} strokeWidth={2.1} />
                </CameraIconButton>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </View>
  );
}

function CameraIconButton({
  accessibilityLabel,
  children,
  disabled = false,
  emphasis = false,
  onPress,
  size = "regular"
}: {
  accessibilityLabel: string;
  children: React.ReactNode;
  disabled?: boolean;
  emphasis?: boolean;
  onPress: () => void;
  size?: "large" | "regular";
}) {
  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      scaleTo={0.9}
      style={[
        styles.cameraIconButton,
        size === "large" && styles.cameraIconButtonLarge,
        emphasis && styles.cameraIconButtonEmphasis,
        disabled && styles.cameraIconButtonDisabled
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}

function FrameCorners() {
  return (
    <>
      <View style={[styles.frameCorner, styles.frameCornerTopLeft]} />
      <View style={[styles.frameCorner, styles.frameCornerTopRight]} />
      <View style={[styles.frameCorner, styles.frameCornerBottomLeft]} />
      <View style={[styles.frameCorner, styles.frameCornerBottomRight]} />
    </>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center"
  },
  permissionScreen: {
    backgroundColor: colors.background,
    flex: 1
  },
  permissionTopBar: {
    minHeight: 52,
    paddingHorizontal: 18
  },
  permissionClose: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44
  },
  permissionContent: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 72,
    paddingHorizontal: 24
  },
  permissionIcon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 76,
    justifyContent: "center",
    width: 76
  },
  permissionCopy: {
    alignItems: "center",
    gap: 10,
    paddingTop: 22
  },
  permissionTitle: {
    color: colors.ink,
    ...typography.title,
    textAlign: "center"
  },
  permissionBody: {
    color: colors.inkMuted,
    ...typography.bodyLarge,
    maxWidth: 340,
    textAlign: "center"
  },
  permissionError: {
    color: colors.danger,
    ...typography.caption,
    paddingTop: 8,
    textAlign: "center"
  },
  permissionActions: {
    gap: 12,
    paddingTop: 28
  },
  cameraScreen: {
    backgroundColor: "#000000",
    flex: 1
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "space-between",
    pointerEvents: "box-none"
  },
  cameraTopBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 16
  },
  cameraTitleWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minWidth: 0
  },
  cameraTitle: {
    color: colors.textInverse,
    ...typography.label,
    fontSize: 15
  },
  cameraPageCount: {
    color: "rgba(255, 255, 255, 0.76)",
    ...typography.caption,
    marginTop: 1
  },
  cameraTopActions: {
    flexDirection: "row",
    gap: 6
  },
  cameraIconButton: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  cameraIconButtonLarge: {
    height: 52,
    width: 52
  },
  cameraIconButtonEmphasis: {
    backgroundColor: colors.primary
  },
  cameraIconButtonDisabled: {
    opacity: 0.42
  },
  guideArea: {
    alignItems: "center",
    flex: 1,
    gap: 11,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 4,
    pointerEvents: "none"
  },
  guideStatus: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.62)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 7,
    maxWidth: "94%",
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  guideStatusError: {
    backgroundColor: "rgba(151, 32, 32, 0.88)"
  },
  guideStatusText: {
    color: colors.textInverse,
    ...typography.label,
    flexShrink: 1,
    textAlign: "center"
  },
  cameraFrame: {
    position: "relative"
  },
  frameCorner: {
    borderColor: colors.textInverse,
    height: 48,
    position: "absolute",
    width: 48
  },
  frameCornerTopLeft: {
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
    borderTopWidth: 3,
    left: 0,
    top: 0
  },
  frameCornerTopRight: {
    borderRightWidth: 3,
    borderTopRightRadius: 12,
    borderTopWidth: 3,
    right: 0,
    top: 0
  },
  frameCornerBottomLeft: {
    borderBottomLeftRadius: 12,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    bottom: 0,
    left: 0
  },
  frameCornerBottomRight: {
    borderBottomRightRadius: 12,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    bottom: 0,
    right: 0
  },
  steadyHint: {
    backgroundColor: "rgba(0, 0, 0, 0.62)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  steadyHintText: {
    color: colors.textInverse,
    ...typography.caption
  },
  cameraBottomPanel: {
    minHeight: 202,
    paddingTop: 8
  },
  pageTray: {
    alignItems: "center",
    height: 84,
    justifyContent: "center",
    paddingHorizontal: 12
  },
  pageTrayContent: {
    alignItems: "center",
    flexGrow: 1,
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingTop: 6
  },
  pageThumbnailWrap: {
    height: 70,
    position: "relative",
    width: 76
  },
  pagePreviewButton: {
    borderRadius: 8,
    height: "100%",
    overflow: "hidden",
    width: "100%"
  },
  pageThumbnail: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderColor: "rgba(255, 255, 255, 0.74)",
    borderRadius: 8,
    borderWidth: 1.5,
    height: 70,
    width: 76
  },
  pageSkeletonSlot: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.18)",
    borderColor: "rgba(255, 255, 255, 0.38)",
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 7,
    height: 70,
    justifyContent: "center",
    width: 76
  },
  pageSkeletonLines: {
    alignItems: "center",
    gap: 4
  },
  pageSkeletonLineWide: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderRadius: 999,
    height: 3,
    width: 36
  },
  pageSkeletonLine: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 999,
    height: 3,
    width: 25
  },
  pageNumberBadge: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    bottom: 3,
    height: 20,
    justifyContent: "center",
    left: 3,
    position: "absolute",
    width: 20
  },
  pageNumberText: {
    color: colors.textInverse,
    ...typography.caption,
    fontSize: 11
  },
  removePageButton: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    borderColor: "rgba(255, 255, 255, 0.72)",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: -7,
    top: -7,
    width: 24
  },
  cameraControls: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-around",
    minHeight: 110,
    paddingHorizontal: 32,
    paddingBottom: 6
  },
  shutter: {
    alignItems: "center",
    borderColor: colors.textInverse,
    borderRadius: 999,
    borderWidth: 4,
    height: 78,
    justifyContent: "center",
    width: 78
  },
  shutterDisabled: {
    opacity: 0.58
  },
  shutterInner: {
    alignItems: "center",
    backgroundColor: colors.textInverse,
    borderRadius: 999,
    height: 62,
    justifyContent: "center",
    width: 62
  },
  fullscreenPreview: {
    backgroundColor: "#050706",
    flex: 1
  },
  fullscreenPreviewSafeArea: {
    flex: 1
  },
  fullscreenPreviewHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 16
  },
  fullscreenPreviewTitle: {
    color: colors.textInverse,
    flex: 1,
    textAlign: "center",
    ...typography.label
  },
  fullscreenPreviewStage: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingBottom: 4,
    paddingHorizontal: 12,
    paddingTop: 18
  },
  fullscreenPreviewImage: {
    height: "100%",
    width: "100%"
  },
  fullscreenPreviewFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 92,
    paddingHorizontal: 28
  },
  fullscreenPageDots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minWidth: 80
  },
  fullscreenPageDot: {
    backgroundColor: "rgba(255, 255, 255, 0.35)",
    borderRadius: 999,
    height: 8,
    width: 8
  },
  fullscreenPageDotActive: {
    backgroundColor: colors.primary,
    width: 22
  }
});
