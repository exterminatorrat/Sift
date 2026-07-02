import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { ScanSearch } from "lucide-react-native";
import { colors } from "../constants/colors";
import { AppTopBar } from "./AppTopBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "../i18n/I18nProvider";

type LoadingAnalysisProps = {
  showTopBar?: boolean;
  showBack?: boolean;
  onBack?: () => void;
};

export function LoadingAnalysis({ showTopBar = false, showBack = false, onBack }: LoadingAnalysisProps) {
  const { t } = useI18n();
  const pulse = useRef(new Animated.Value(0)).current;
  const copyIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(copyIn, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 1450,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          duration: 1450,
          easing: Easing.inOut(Easing.cubic),
          toValue: 0,
          useNativeDriver: true
        })
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [copyIn, pulse]);

  const ambientScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.03]
  });
  const rippleScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.08]
  });
  const rippleOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.18]
  });
  const coreScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.025]
  });
  const copyTranslateY = copyIn.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0]
  });

  return (
    <SafeAreaView style={styles.screen}>
      {showTopBar && <AppTopBar showBack={showBack} onBack={onBack} />}
      <View style={styles.content}>
        <View style={styles.pulseWrap}>
          <Animated.View style={[styles.ambient, { transform: [{ scale: ambientScale }] }]} />
          <Animated.View
            style={[
              styles.ripple,
              {
                opacity: rippleOpacity,
                transform: [{ scale: rippleScale }]
              }
            ]}
          />
          <Animated.View style={[styles.coreOuter, { transform: [{ scale: coreScale }] }]}>
            <View style={styles.coreInner}>
              <ScanSearch color={colors.primary} size={30} strokeWidth={1.7} />
            </View>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.copy,
            {
              opacity: copyIn,
              transform: [{ translateY: copyTranslateY }]
            }
          ]}
        >
          <Text style={styles.title}>{t("analysis.title")}</Text>
          <Text style={styles.subtitle}>{t("analysis.subtitle")}</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    justifyContent: "flex-start"
  },
  pulseWrap: {
    alignItems: "center",
    height: 256,
    justifyContent: "center",
    width: 256
  },
  ambient: {
    backgroundColor: "#E3E2E1",
    borderRadius: 999,
    bottom: 0,
    left: 0,
    opacity: 0.5,
    position: "absolute",
    right: 0,
    top: 0
  },
  ripple: {
    borderColor: "rgba(206,197,188,0.35)",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 32,
    left: 32,
    position: "absolute",
    right: 32,
    top: 32
  },
  coreOuter: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    elevation: 2,
    height: 128,
    justifyContent: "center",
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    width: 128
  },
  coreInner: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 999,
    height: 96,
    justifyContent: "center",
    width: 96
  },
  copy: {
    alignItems: "center",
    gap: 12,
    marginTop: 64
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "300",
    letterSpacing: 0,
    lineHeight: 40,
    textAlign: "center"
  },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 18,
    letterSpacing: 0,
    lineHeight: 30,
    textAlign: "center"
  }
});
