import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShieldCheck } from "lucide-react-native";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { AuthSession } from "../types/auth";
import { isAppleSignInAvailable } from "../services/authService";

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
          <Text style={styles.title}>Sign in to Sift</Text>
          <Text style={styles.body}>
            Use your Apple account to keep your allergy profiles and scan flow tied to you.
          </Text>
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
              <Text style={styles.unavailableText}>
                Apple sign-in is available on supported iPhone devices.
              </Text>
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
    padding: 32
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
    gap: 14,
    marginTop: 42
  },
  title: {
    color: colors.primaryDark,
    ...typography.display,
    textAlign: "center"
  },
  body: {
    color: colors.inkMuted,
    ...typography.bodyLarge,
    maxWidth: 318,
    textAlign: "center"
  },
  actionArea: {
    alignItems: "center",
    gap: 14,
    marginTop: 72,
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
    padding: 16,
    width: "100%"
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
