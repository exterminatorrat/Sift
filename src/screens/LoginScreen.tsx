import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, ScrollView, StyleSheet, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { AuthSession } from "../types/auth";
import { isAppleSignInAvailable } from "../services/authService";
import { useI18n } from "../i18n/I18nProvider";

type LoginScreenProps = {
  error?: string | null;
  loading?: boolean;
  onSignInWithApple: () => Promise<AuthSession | void>;
};

export function LoginScreen({
  error,
  loading = false,
  onSignInWithApple
}: LoginScreenProps) {
  const { t } = useI18n();
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    isAppleSignInAvailable()
      .then((available) => {
        if (mounted) {
          setAppleAvailable(available);
        }
      })
      .catch(() => {
        if (mounted) {
          setAppleAvailable(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <View style={styles.brandMarkInner} />
          </View>
          <Text style={styles.brandText}>{t("common.sift")}</Text>
        </View>

        <SignInGraphic />

        <View style={styles.copyBlock}>
          <Text style={styles.eyebrow}>{t("login.eyebrow")}</Text>
          <Text style={styles.title}>{t("login.title")}</Text>
          <Text style={styles.body}>{t("login.body")}</Text>
        </View>

        <View style={styles.safetyPanel}>
          <Text style={styles.trustTitle}>{t("login.trustTitle")}</Text>
          <Text style={styles.trustBody}>{t("login.trustBody")}</Text>
        </View>

        <View style={styles.actionArea}>
          {appleAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              cornerRadius={999}
              onPress={onSignInWithApple}
              style={styles.appleButton}
            />
          ) : (
            <View style={styles.unavailable}>
              <Text style={styles.unavailableTitle}>{t("login.appleUnavailableTitle")}</Text>
              <Text style={styles.unavailableText}>{t("login.appleUnavailableBody")}</Text>
            </View>
          )}

          {loading && <ActivityIndicator color={colors.primary} />}
          {error && <Text style={styles.error}>{error}</Text>}
          <Text style={styles.termsText}>{t("login.terms")}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SignInGraphic() {
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, {
          duration: 1850,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.timing(scan, {
          duration: 520,
          easing: Easing.out(Easing.cubic),
          toValue: 0,
          useNativeDriver: true
        })
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [scan]);

  const scanTranslateY = scan.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 126]
  });

  return (
    <View style={styles.graphicStage}>
      <View style={styles.graphicHalo} />
      <View style={styles.menuCardBack} />
      <View style={styles.menuCard}>
        <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanTranslateY }] }]} />
        <View style={styles.menuHeaderLine} />
        <View style={styles.menuLineWide} />
        <View style={styles.menuLineMedium} />
        <View style={styles.menuLineShort} />
        <View style={styles.menuDivider} />
        <View style={styles.riskRow}>
          <View style={[styles.riskDot, styles.riskDotAsk]} />
          <View style={styles.riskCopy}>
            <View style={styles.riskLineWide} />
            <View style={styles.riskLineShort} />
          </View>
          <View style={styles.riskPill} />
        </View>
        <View style={styles.riskRow}>
          <View style={[styles.riskDot, styles.riskDotLow]} />
          <View style={styles.riskCopy}>
            <View style={styles.riskLineMedium} />
            <View style={styles.riskLineTiny} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "space-between",
    padding: 28,
    paddingBottom: 26,
    paddingTop: 20
  },
  brandRow: {
    alignItems: "center",
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 10
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  brandMarkInner: {
    backgroundColor: colors.background,
    borderRadius: 999,
    height: 12,
    opacity: 0.92,
    width: 12
  },
  brandText: {
    color: colors.primaryDark,
    ...typography.sectionTitle
  },
  graphicStage: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 238,
    position: "relative",
    width: "100%"
  },
  graphicHalo: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 196,
    opacity: 0.6,
    position: "absolute",
    width: 196
  },
  menuCardBack: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    height: 164,
    opacity: 0.72,
    position: "absolute",
    transform: [{ rotate: "-5deg" }, { translateY: 8 }],
    width: 218
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    gap: 10,
    minHeight: 178,
    overflow: "hidden",
    padding: 22,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.1,
    shadowRadius: 26,
    width: 234
  },
  scanLine: {
    backgroundColor: colors.primarySoft,
    height: 28,
    left: 0,
    opacity: 0.92,
    position: "absolute",
    right: 0,
    top: 0
  },
  menuHeaderLine: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 5,
    width: 54
  },
  menuLineWide: {
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 7,
    opacity: 0.58,
    width: "74%"
  },
  menuLineMedium: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 7,
    width: "58%"
  },
  menuLineShort: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 7,
    width: "42%"
  },
  menuDivider: {
    backgroundColor: colors.borderSoft,
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
    width: "100%"
  },
  riskRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  riskDot: {
    borderRadius: 999,
    height: 10,
    width: 10
  },
  riskDotAsk: {
    backgroundColor: colors.ask
  },
  riskDotLow: {
    backgroundColor: colors.low
  },
  riskCopy: {
    flex: 1,
    gap: 5
  },
  riskLineWide: {
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 5,
    opacity: 0.7,
    width: "100%"
  },
  riskLineMedium: {
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 5,
    opacity: 0.55,
    width: "76%"
  },
  riskLineShort: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 5,
    width: "54%"
  },
  riskLineTiny: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 5,
    width: "36%"
  },
  riskPill: {
    backgroundColor: colors.askSoft,
    borderRadius: 999,
    height: 22,
    width: 42
  },
  copyBlock: {
    alignItems: "center",
    marginTop: 2
  },
  eyebrow: {
    color: colors.inkSubtle,
    ...typography.badge,
    marginBottom: 12,
    textTransform: "uppercase"
  },
  title: {
    color: colors.primaryDark,
    ...typography.display,
    textAlign: "center"
  },
  body: {
    color: colors.inkMuted,
    ...typography.bodyLarge,
    marginTop: 16,
    maxWidth: 318,
    textAlign: "center"
  },
  safetyPanel: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 26,
    paddingHorizontal: 18,
    paddingVertical: 16,
    width: "100%"
  },
  trustTitle: {
    color: colors.ink,
    ...typography.label
  },
  trustBody: {
    color: colors.inkMuted,
    ...typography.bodySmall,
    marginTop: 8
  },
  actionArea: {
    alignItems: "center",
    gap: 14,
    marginTop: 26,
    width: "100%"
  },
  appleButton: {
    height: 52,
    width: "100%"
  },
  unavailable: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    padding: 16,
    width: "100%"
  },
  unavailableTitle: {
    color: colors.ink,
    ...typography.label,
    textAlign: "center"
  },
  unavailableText: {
    color: colors.inkMuted,
    ...typography.bodySmall,
    textAlign: "center"
  },
  error: {
    color: colors.high,
    ...typography.bodySmall,
    textAlign: "center"
  },
  termsText: {
    color: colors.inkSubtle,
    ...typography.caption,
    maxWidth: 304,
    textAlign: "center"
  }
});
