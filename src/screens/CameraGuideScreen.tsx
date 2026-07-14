import React, { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Plus, X } from "lucide-react-native";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { useI18n } from "../i18n/I18nProvider";
import { TranslationKey } from "../i18n/translations";

type CameraGuideScreenProps = {
  onClose: () => void;
  onFinish: () => void | Promise<void>;
};

type GuideStep = {
  status: TranslationKey;
  tips: [TranslationKey, TranslationKey, TranslationKey];
  title: TranslationKey;
};

const guideSteps: GuideStep[] = [
  {
    status: "cameraGuide.stepOneStatus",
    title: "cameraGuide.stepOneTitle",
    tips: [
      "cameraGuide.stepOneTipOne",
      "cameraGuide.stepOneTipTwo",
      "cameraGuide.stepOneTipThree"
    ]
  },
  {
    status: "cameraGuide.stepTwoStatus",
    title: "cameraGuide.stepTwoTitle",
    tips: [
      "cameraGuide.stepTwoTipOne",
      "cameraGuide.stepTwoTipTwo",
      "cameraGuide.stepTwoTipThree"
    ]
  },
  {
    status: "cameraGuide.stepThreeStatus",
    title: "cameraGuide.stepThreeTitle",
    tips: [
      "cameraGuide.stepThreeTipOne",
      "cameraGuide.stepThreeTipTwo",
      "cameraGuide.stepThreeTipThree"
    ]
  }
];

const menuExample = require("../assets/camera-guide/menu-example.jpg");

export function CameraGuideScreen({ onClose, onFinish }: CameraGuideScreenProps) {
  const { t } = useI18n();
  const { height } = useWindowDimensions();
  const [stepIndex, setStepIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [direction, setDirection] = useState(1);
  const transition = useRef(new Animated.Value(1)).current;
  const step = guideSteps[stepIndex];
  const previewHeight = Math.max(238, Math.min(318, height * 0.36));
  const isLastStep = stepIndex === guideSteps.length - 1;

  const goToStep = (nextIndex: number) => {
    if (transitioning || nextIndex < 0 || nextIndex >= guideSteps.length) {
      return;
    }

    setDirection(nextIndex > stepIndex ? 1 : -1);
    setTransitioning(true);
    Animated.timing(transition, {
      duration: 110,
      easing: Easing.out(Easing.cubic),
      toValue: 0,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (!finished) {
        setTransitioning(false);
        return;
      }

      setStepIndex(nextIndex);
      transition.setValue(0);
      Animated.timing(transition, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      }).start(() => setTransitioning(false));
    });
  };

  const finishGuide = () => {
    if (transitioning || finishing) {
      return;
    }

    setFinishing(true);
    void (async () => {
      try {
        await onFinish();
      } catch {
        setFinishing(false);
      }
    })();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <AnimatedPressable
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
          onPress={onClose}
          scaleTo={0.9}
          style={styles.iconButton}
        >
          <X color={colors.ink} size={21} strokeWidth={2.1} />
        </AnimatedPressable>

        <View
          accessibilityLabel={t("onboarding.stepProgress", {
            current: stepIndex + 1,
            total: guideSteps.length
          })}
          style={styles.progress}
        >
          {guideSteps.map((item, index) => (
            <View
              key={item.title}
              style={[styles.progressDot, index === stepIndex && styles.progressDotActive]}
            />
          ))}
        </View>

        <AnimatedPressable
          accessibilityRole="button"
          disabled={transitioning || finishing}
          onPress={finishGuide}
          scaleTo={0.96}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>{t("cameraGuide.skip")}</Text>
        </AnimatedPressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: transition,
            transform: [
              {
                translateX: transition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [direction * 24, 0]
                })
              }
            ]
          }}
        >
          <GuideArtwork height={previewHeight} status={t(step.status)} stepIndex={stepIndex} />

          <View style={styles.copy}>
            <Text style={styles.title}>{t(step.title)}</Text>
            <View style={styles.tips}>
              {step.tips.map((tip) => (
                <View key={tip} style={styles.tipRow}>
                  <View style={styles.tipIcon}>
                    <Check color={colors.primaryDark} size={14} strokeWidth={2.6} />
                  </View>
                  <Text style={styles.tipText}>{t(tip)}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        <Text style={styles.boundary}>{t("cameraGuide.visibleOnly")}</Text>
      </ScrollView>

      <View style={styles.footer}>
        {stepIndex > 0 && (
          <AnimatedPressable
            accessibilityLabel={t("common.back")}
            accessibilityRole="button"
            disabled={transitioning || finishing}
            onPress={() => goToStep(stepIndex - 1)}
            scaleTo={0.94}
            style={styles.backButton}
          >
            <ArrowLeft color={colors.primaryDark} size={20} strokeWidth={2.2} />
          </AnimatedPressable>
        )}
        <AnimatedPressable
          accessibilityRole="button"
          disabled={transitioning || finishing}
          onPress={() => (isLastStep ? finishGuide() : goToStep(stepIndex + 1))}
          scaleTo={0.97}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            {isLastStep ? t("cameraGuide.openCamera") : t("onboarding.continue")}
          </Text>
          <ArrowRight color={colors.textInverse} size={17} strokeWidth={2.2} />
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

function GuideArtwork({
  height,
  status,
  stepIndex
}: {
  height: number;
  status: string;
  stepIndex: number;
}) {
  return (
    <View accessible={false} style={[styles.artwork, { height }]}>
      <View style={styles.statusChip}>
        <CheckCircle2 color={colors.safe} size={17} strokeWidth={2.4} />
        <Text style={styles.statusText}>{status}</Text>
      </View>

      {stepIndex === 0 && (
        <View style={styles.fullPageScene}>
          <Image resizeMode="contain" source={menuExample} style={styles.fullPageImage} />
          <View style={styles.captureFrame}>
            <FrameCorners />
          </View>
        </View>
      )}

      {stepIndex === 1 && (
        <View style={styles.focusScene}>
          <Image resizeMode="cover" source={menuExample} style={styles.focusImage} />
          <View style={styles.focusBand} />
          <View style={styles.captureFrame}>
            <FrameCorners />
          </View>
        </View>
      )}

      {stepIndex === 2 && (
        <View style={styles.pageStack}>
          <Image resizeMode="cover" source={menuExample} style={styles.pageBack} />
          <Image resizeMode="cover" source={menuExample} style={styles.pageFront} />
          <View style={styles.plusBadge}>
            <Plus color={colors.textInverse} size={20} strokeWidth={2.5} />
          </View>
        </View>
      )}
    </View>
  );
}

function FrameCorners() {
  return (
    <>
      <View style={[styles.corner, styles.cornerTopLeft]} />
      <View style={[styles.corner, styles.cornerTopRight]} />
      <View style={[styles.corner, styles.cornerBottomLeft]} />
      <View style={[styles.corner, styles.cornerBottomRight]} />
    </>
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
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 18
  },
  iconButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44
  },
  progress: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  progressDot: {
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 8,
    width: 8
  },
  progressDotActive: {
    backgroundColor: colors.primaryDark,
    width: 24
  },
  skipButton: {
    alignItems: "flex-end",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44
  },
  skipText: {
    color: colors.primaryDark,
    ...typography.label
  },
  content: {
    paddingBottom: 132,
    paddingHorizontal: 24,
    paddingTop: 10
  },
  artwork: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    width: "100%"
  },
  statusChip: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 999,
    flexDirection: "row",
    gap: 7,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: "absolute",
    top: 14,
    zIndex: 3
  },
  statusText: {
    color: colors.ink,
    ...typography.label
  },
  fullPageScene: {
    alignItems: "center",
    height: "78%",
    justifyContent: "center",
    marginTop: 34,
    position: "relative",
    width: "58%"
  },
  fullPageImage: {
    borderRadius: 8,
    height: "100%",
    width: "100%"
  },
  focusScene: {
    borderRadius: 8,
    height: "72%",
    marginTop: 38,
    overflow: "hidden",
    position: "relative",
    width: "70%"
  },
  focusImage: {
    height: "100%",
    width: "100%"
  },
  focusBand: {
    backgroundColor: "rgba(221, 244, 241, 0.4)",
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 2,
    height: "31%",
    left: "8%",
    position: "absolute",
    top: "31%",
    width: "84%"
  },
  captureFrame: {
    bottom: 5,
    left: 5,
    position: "absolute",
    right: 5,
    top: 5
  },
  corner: {
    borderColor: colors.primaryDark,
    height: 31,
    position: "absolute",
    width: 31
  },
  cornerTopLeft: {
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
    borderTopWidth: 3,
    left: 0,
    top: 0
  },
  cornerTopRight: {
    borderRightWidth: 3,
    borderTopRightRadius: 8,
    borderTopWidth: 3,
    right: 0,
    top: 0
  },
  cornerBottomLeft: {
    borderBottomLeftRadius: 8,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    bottom: 0,
    left: 0
  },
  cornerBottomRight: {
    borderBottomRightRadius: 8,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    bottom: 0,
    right: 0
  },
  pageStack: {
    height: "72%",
    marginTop: 38,
    position: "relative",
    width: "65%"
  },
  pageBack: {
    borderRadius: 8,
    height: "92%",
    left: "26%",
    opacity: 0.68,
    position: "absolute",
    top: 4,
    transform: [{ rotate: "7deg" }],
    width: "72%"
  },
  pageFront: {
    borderRadius: 8,
    bottom: 0,
    height: "94%",
    left: 0,
    position: "absolute",
    transform: [{ rotate: "-4deg" }],
    width: "72%"
  },
  plusBadge: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: 999,
    bottom: 12,
    height: 42,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    width: 42
  },
  copy: {
    gap: 18,
    paddingTop: 24
  },
  title: {
    color: colors.ink,
    ...typography.title,
    fontSize: 30,
    lineHeight: 37
  },
  tips: {
    gap: 10
  },
  tipRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10
  },
  tipIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 24,
    justifyContent: "center",
    marginTop: 1,
    width: 24
  },
  tipText: {
    color: colors.inkMuted,
    flex: 1,
    ...typography.bodyLarge,
    lineHeight: 24
  },
  boundary: {
    color: colors.inkSubtle,
    ...typography.caption,
    lineHeight: 19,
    paddingTop: 18,
    textAlign: "center"
  },
  footer: {
    backgroundColor: colors.background,
    bottom: 0,
    flexDirection: "row",
    gap: 12,
    left: 0,
    paddingBottom: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
    position: "absolute",
    right: 0
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 54,
    justifyContent: "center",
    width: 54
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: 999,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 24
  },
  primaryButtonText: {
    color: colors.textInverse,
    ...typography.button,
    fontSize: 17
  }
});
