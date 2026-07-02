import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Check,
  ChevronRight,
  CircleHelp,
  LucideIcon,
  MessageCircle,
  ShieldPlus,
  Sparkles
} from "lucide-react-native";
import { AppTopBar } from "../components/AppTopBar";
import { colors } from "../constants/colors";
import { UserProfile } from "../types/allergy";

type BasicSettingsScreenProps = {
  onBack: () => void;
};

type SubscriptionScreenProps = BasicSettingsScreenProps & {
  onOpenSupport: () => void;
};

type LanguageSettingsScreenProps = BasicSettingsScreenProps & {
  profile: UserProfile;
  onChangeProfile: (profile: UserProfile) => void | Promise<void>;
};

const appLanguages = ["English", "French", "Italian", "Japanese"];

export function SubscriptionScreen({ onBack, onOpenSupport }: SubscriptionScreenProps) {
  return (
    <SettingsShell onBack={onBack}>
      <Header title="Sift Premium" body="Elevate menu scanning with deeper tools designed for peace of mind." />

      <View style={styles.subscriptionCard}>
        <View style={styles.planTop}>
          <View>
            <Text style={styles.eyebrow}>Current plan</Text>
            <Text style={styles.planName}>Free MVP</Text>
          </View>
          <View style={styles.priceBlock}>
            <Text style={styles.price}>$0</Text>
            <Text style={styles.priceMeta}>now</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Planned benefits</Text>
        <Benefit title="Unlimited scans" body="Scan menus without monthly limits when subscriptions launch." />
        <Benefit title="Translation cards" body="Show restaurant staff a clear allergy message in travel languages." />
        <Benefit title="Detailed risk analysis" body="Deeper hidden-ingredient and cross-contact explanations." />

        <Pressable accessibilityRole="button" style={styles.primaryAction}>
          <Text style={styles.primaryActionText}>Manage Subscription</Text>
        </Pressable>
      </View>

      <View style={styles.supportBlock}>
        <Text style={styles.supportTitle}>Have questions about your plan?</Text>
        <Pressable accessibilityRole="button" onPress={onOpenSupport} hitSlop={8}>
          <Text style={styles.supportLink}>Visit the Support Center</Text>
        </Pressable>
      </View>
    </SettingsShell>
  );
}

export function LanguageTranslationScreen({
  profile,
  onBack,
  onChangeProfile
}: LanguageSettingsScreenProps) {
  const selectedAppLanguage = profile.preferredLanguage || "English";

  const updateProfile = (patch: Partial<UserProfile>) => {
    void onChangeProfile({ ...profile, ...patch });
  };

  return (
    <SettingsShell onBack={onBack}>
      <Header
        title="Language"
        body="Choose the language Sift should use around the app. Restaurant language stays with your allergy profile."
      />

      <OptionSection
        label="App language"
        body="The primary language used for navigation and menus."
        options={appLanguages}
        selected={selectedAppLanguage}
        onSelect={(preferredLanguage) => updateProfile({ preferredLanguage })}
      />
    </SettingsShell>
  );
}

export function SafetyDisclaimerScreen({ onBack }: BasicSettingsScreenProps) {
  return (
    <SettingsShell onBack={onBack}>
      <Header
        title="Safety Disclaimer"
        body="Please read carefully before using Sift for menu decisions."
        centered
      />

      <View style={styles.article}>
        <DisclaimerSection
          title="1. Visible menu text only"
          body="Sift analyzes visible menu text and common ingredient patterns. It cannot confirm full ingredients, kitchen preparation, substitutions, or cross-contact."
        />
        <DisclaimerSection
          title="2. Confirm with staff"
          body="Always confirm with restaurant staff, especially for severe allergies. Ask about sauces, oils, broths, marinades, garnishes, fryers, and shared equipment."
        />
        <View style={styles.callout}>
          <ShieldPlus color={colors.primaryDark} size={21} strokeWidth={2} />
          <Text style={styles.calloutText}>
            Sift never guarantees a dish is safe. It helps you know what to ask before ordering.
          </Text>
        </View>
        <DisclaimerSection
          title="3. Not medical advice"
          body="Sift is an allergy menu copilot, not a medical device, doctor, restaurant, or food safety certifier."
        />
        <DisclaimerSection
          title="4. Your responsibility"
          body="You are responsible for deciding what to order and whether restaurant confirmation is sufficient for your allergy needs."
        />
      </View>

      <Pressable accessibilityRole="button" onPress={onBack} style={styles.primaryAction}>
        <Text style={styles.primaryActionText}>I understand</Text>
      </Pressable>
    </SettingsShell>
  );
}

export function HelpSupportScreen({ onBack }: BasicSettingsScreenProps) {
  const showComingSoon = (title: string) => {
    Alert.alert(title, "This support option is a placeholder for the MVP.");
  };

  return (
    <SettingsShell onBack={onBack}>
      <Header title="Help & Support" body="How can we assist you today?" />

      <View style={styles.supportOptions}>
        <SupportOption
          icon={CircleHelp}
          title="Frequently Asked Questions"
          body="Find quick answers to common issues."
          onPress={() => showComingSoon("Frequently Asked Questions")}
        />
        <SupportOption
          icon={MessageCircle}
          title="Contact Support"
          body="Reach out to our team directly."
          onPress={() => showComingSoon("Contact Support")}
        />
        <SupportOption
          icon={Sparkles}
          title="Submit Feedback"
          body="Help us improve your Sift experience."
          onPress={() => showComingSoon("Submit Feedback")}
        />
      </View>
    </SettingsShell>
  );
}

function SettingsShell({ children, onBack }: React.PropsWithChildren<BasicSettingsScreenProps>) {
  return (
    <SafeAreaView style={styles.screen}>
      <AppTopBar showBack onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

function Header({
  title,
  body,
  centered,
  large
}: {
  title: string;
  body: string;
  centered?: boolean;
  large?: boolean;
}) {
  return (
    <View style={[styles.header, centered && styles.headerCentered]}>
      <Text style={[styles.title, large && styles.titleLarge, centered && styles.textCentered]}>
        {title}
      </Text>
      <Text style={[styles.headerBody, centered && styles.textCentered]}>{body}</Text>
    </View>
  );
}

function OptionSection({
  label,
  body,
  options,
  selected,
  recommended,
  onSelect
}: {
  label: string;
  body: string;
  options: string[];
  selected: string;
  recommended?: string;
  onSelect: (option: string) => void;
}) {
  return (
    <View style={styles.optionSection}>
      <View style={styles.optionHeader}>
        <Text style={styles.eyebrow}>{label}</Text>
        <Text style={styles.optionBody}>{body}</Text>
      </View>
      <View style={styles.optionCard}>
        {options.map((option) => {
          const active = selected === option;
          return (
            <Pressable
              accessibilityRole="button"
              key={option}
              onPress={() => onSelect(option)}
              style={styles.optionRow}
            >
              <View style={styles.rowText}>
                <Text style={styles.optionTitle}>{option}</Text>
                {recommended === option && <Text style={styles.optionMeta}>Recommended</Text>}
              </View>
              {active && <Check color={colors.primaryDark} size={20} strokeWidth={2.5} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Benefit({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.benefit}>
      <Check color={colors.primaryDark} size={18} strokeWidth={2.5} />
      <View style={styles.rowText}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitBody}>{body}</Text>
      </View>
    </View>
  );
}

function DisclaimerSection({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.disclaimerSection}>
      <Text style={styles.eyebrow}>{title}</Text>
      <Text style={styles.articleBody}>{body}</Text>
    </View>
  );
}

function SupportOption({
  icon: Icon,
  title,
  body,
  onPress
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.supportOption}>
      <View style={styles.supportIcon}>
        <Icon color={colors.primaryDark} size={23} strokeWidth={2} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.supportOptionTitle}>{title}</Text>
        <Text style={styles.supportOptionBody}>{body}</Text>
      </View>
      <ChevronRight color={colors.borderStrong} size={18} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 36,
    padding: 40,
    paddingBottom: 72,
    paddingTop: 24
  },
  header: {
    gap: 8
  },
  headerCentered: {
    alignItems: "center"
  },
  title: {
    color: colors.primaryDark,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 40
  },
  titleLarge: {
    fontSize: 40,
    lineHeight: 52
  },
  textCentered: {
    textAlign: "center"
  },
  headerBody: {
    color: colors.inkMuted,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 26
  },
  rowText: {
    flex: 1,
    gap: 4
  },
  optionSection: {
    gap: 24
  },
  optionHeader: {
    gap: 8
  },
  eyebrow: {
    color: colors.inkSubtle,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  optionBody: {
    color: colors.inkMuted,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 20
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    elevation: 2,
    overflow: "hidden",
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18
  },
  optionRow: {
    alignItems: "center",
    borderBottomColor: colors.surfaceMuted,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 70,
    paddingHorizontal: 24
  },
  optionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "400",
    letterSpacing: 0,
    lineHeight: 30
  },
  optionMeta: {
    color: colors.inkSubtle,
    fontSize: 13,
    letterSpacing: 0,
    lineHeight: 18
  },
  subscriptionCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    elevation: 4,
    gap: 24,
    padding: 32,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24
  },
  planTop: {
    borderBottomColor: colors.surfaceMuted,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 24
  },
  planName: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 32
  },
  priceBlock: {
    alignItems: "flex-end"
  },
  price: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 32
  },
  priceMeta: {
    color: colors.inkSubtle,
    fontSize: 13,
    letterSpacing: 0,
    lineHeight: 18
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 30
  },
  benefit: {
    flexDirection: "row",
    gap: 14
  },
  benefitTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 26
  },
  benefitBody: {
    color: colors.inkMuted,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 20
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: 999,
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: 24
  },
  primaryActionText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0
  },
  supportBlock: {
    alignItems: "center",
    gap: 10
  },
  supportTitle: {
    color: colors.inkMuted,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 26,
    textAlign: "center"
  },
  supportLink: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0
  },
  article: {
    gap: 32
  },
  disclaimerSection: {
    gap: 12
  },
  articleBody: {
    color: colors.inkMuted,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 26
  },
  callout: {
    alignItems: "flex-start",
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    flexDirection: "row",
    gap: 16,
    padding: 18
  },
  calloutText: {
    color: colors.primaryDark,
    flex: 1,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 26
  },
  supportOptions: {
    gap: 24
  },
  supportOption: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 24,
    elevation: 2,
    flexDirection: "row",
    gap: 24,
    minHeight: 150,
    padding: 32,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18
  },
  supportIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  supportOptionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 28
  },
  supportOptionBody: {
    color: colors.inkMuted,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 24
  }
});
