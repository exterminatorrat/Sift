import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShieldCheck } from "lucide-react-native";
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
      <View style={styles.content}>
        <View style={styles.mark}>
          <ShieldCheck color={colors.primary} size={30} strokeWidth={1.8} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{t("login.eyebrow")}</Text>
          <Text style={styles.title}>{t("login.title")}</Text>
          <Text style={styles.body}>{t("login.body")}</Text>
        </View>

        <View style={styles.trustCard}>
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
        </View>
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
    justifyContent: "center",
    padding: 28
  },
  mark: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 72,
    justifyContent: "center",
    width: 72
  },
  copy: {
    alignItems: "center",
    marginTop: 34
  },
  eyebrow: {
    color: colors.inkSubtle,
    ...typography.badge,
    marginBottom: 12,
    textTransform: "uppercase"
  },
  title: {
    color: colors.primaryDark,
    ...typography.title,
    textAlign: "center"
  },
  body: {
    color: colors.inkMuted,
    ...typography.bodyLarge,
    marginTop: 16,
    maxWidth: 318,
    textAlign: "center"
  },
  trustCard: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 34,
    padding: 18,
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
    marginTop: 34,
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
  }
});
