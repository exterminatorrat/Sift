import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowRight,
  LucideIcon,
  MessageSquareText,
  ScanSearch,
  ShieldCheck
} from "lucide-react-native";
import { colors } from "../constants/colors";
import { tagline } from "../constants/copy";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { PrimaryButton } from "../components/PrimaryButton";

type OnboardingScreenProps = {
  onGetStarted: () => void;
};

export function OnboardingScreen({ onGetStarted }: OnboardingScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>Sift</Text>
          <Text style={styles.tagline}>{tagline}</Text>
        </View>

        <View style={styles.statementBlock}>
          <Text style={styles.headline}>An allergy copilot for restaurant menus.</Text>
          <Text style={styles.body}>
            Scan a menu, spot possible allergen risks, and get practical questions to ask before
            ordering.
          </Text>
        </View>

        <View style={styles.rows}>
          <InfoRow
            icon={ScanSearch}
            title="Reads visible menu text"
            body="Flags likely allergens, hidden sauces, oils, broths, garnishes, and unclear dishes."
          />
          <InfoRow
            icon={MessageSquareText}
            title="Turns risk into questions"
            body="Gives specific staff questions based on your allergies and cross-contact needs."
          />
          <InfoRow
            icon={ShieldCheck}
            title="Stays conservative"
            body="Sift helps you decide what to ask. It does not confirm ingredients or kitchen prep."
          />
        </View>

        <DisclaimerBanner />
      </View>

      <View style={styles.footer}>
        <PrimaryButton label="Get started" icon={ArrowRight} onPress={onGetStarted} />
      </View>
    </SafeAreaView>
  );
}

type InfoRowProps = {
  icon: LucideIcon;
  title: string;
  body: string;
};

function InfoRow({ icon: Icon, title, body }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Icon color={colors.primary} size={19} strokeWidth={2.1} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoBody}>{body}</Text>
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
    flex: 1,
    gap: 28,
    justifyContent: "center",
    padding: 20
  },
  brandBlock: {
    gap: 8
  },
  brand: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 0
  },
  tagline: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0
  },
  statementBlock: {
    gap: 12
  },
  headline: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 40
  },
  body: {
    color: colors.inkMuted,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 24
  },
  rows: {
    borderBottomColor: colors.border,
    borderTopColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  infoRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    paddingVertical: 16
  },
  infoIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  infoText: {
    flex: 1,
    gap: 4
  },
  infoTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0
  },
  infoBody: {
    color: colors.inkMuted,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 20
  },
  footer: {
    padding: 20,
    paddingTop: 8
  }
});
