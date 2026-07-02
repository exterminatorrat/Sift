import React, { useState } from "react";
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
import { useI18n } from "../i18n/I18nProvider";
import {
  languageAutonymByCode,
  languageNameByCode,
  plannedAppLanguages,
  supportedAppLanguages
} from "../i18n/translations";

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

export function SubscriptionScreen({ onBack, onOpenSupport }: SubscriptionScreenProps) {
  const { t } = useI18n();

  return (
    <SettingsShell onBack={onBack}>
      <Header title={t("subscription.title")} body={t("subscription.body")} />

      <View style={styles.subscriptionCard}>
        <View style={styles.planTop}>
          <View>
            <Text style={styles.eyebrow}>{t("subscription.currentPlan")}</Text>
            <Text style={styles.planName}>{t("subscription.freeMvp")}</Text>
          </View>
          <View style={styles.priceBlock}>
            <Text style={styles.price}>$0</Text>
            <Text style={styles.priceMeta}>{t("subscription.now")}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t("subscription.plannedBenefits")}</Text>
        <Benefit title={t("subscription.unlimitedScans")} body={t("subscription.unlimitedScansBody")} />
        <Benefit title={t("subscription.translationCards")} body={t("subscription.translationCardsBody")} />
        <Benefit title={t("subscription.detailedRisk")} body={t("subscription.detailedRiskBody")} />

        <Pressable accessibilityRole="button" style={styles.primaryAction}>
          <Text style={styles.primaryActionText}>{t("subscription.manage")}</Text>
        </Pressable>
      </View>

      <View style={styles.supportBlock}>
        <Text style={styles.supportTitle}>{t("subscription.questions")}</Text>
        <Pressable accessibilityRole="button" onPress={onOpenSupport} hitSlop={8}>
          <Text style={styles.supportLink}>{t("subscription.supportCenter")}</Text>
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
  const { t } = useI18n();
  const selectedAppLanguage = profile.preferredLanguage || "English";

  const updateProfile = (patch: Partial<UserProfile>) => {
    void onChangeProfile({ ...profile, ...patch });
  };

  return (
    <SettingsShell onBack={onBack}>
      <Header
        title={t("language.title")}
        body={t("language.body")}
      />

      <OptionSection
        label={t("language.appLanguage")}
        body={t("language.appLanguageBody")}
        options={supportedAppLanguages.map((language) => ({
          label: languageAutonymByCode[language.code],
          value: languageNameByCode[language.code]
        }))}
        selected={selectedAppLanguage}
        onSelect={(preferredLanguage) => updateProfile({ preferredLanguage })}
      />

      <View style={styles.plannedLanguages}>
        <Text style={styles.optionMeta}>
          {t("language.comingLater", {
            languages: plannedAppLanguages.map((language) => t(language)).join(", ")
          })}
        </Text>
      </View>
    </SettingsShell>
  );
}

export function SafetyDisclaimerScreen({ onBack }: BasicSettingsScreenProps) {
  const { t } = useI18n();

  return (
    <SettingsShell onBack={onBack}>
      <Header
        title={t("safety.title")}
        body={t("safety.body")}
        centered
      />

      <View style={styles.article}>
        <DisclaimerSection
          title={t("safety.visibleTitle")}
          body={t("safety.visibleBody")}
        />
        <DisclaimerSection
          title={t("safety.confirmTitle")}
          body={t("safety.confirmBody")}
        />
        <View style={styles.callout}>
          <ShieldPlus color={colors.primaryDark} size={21} strokeWidth={2} />
          <Text style={styles.calloutText}>{t("safety.callout")}</Text>
        </View>
        <DisclaimerSection
          title={t("safety.medicalTitle")}
          body={t("safety.medicalBody")}
        />
        <DisclaimerSection
          title={t("safety.responsibilityTitle")}
          body={t("safety.responsibilityBody")}
        />
      </View>

      <Pressable accessibilityRole="button" onPress={onBack} style={styles.primaryAction}>
        <Text style={styles.primaryActionText}>{t("safety.understand")}</Text>
      </Pressable>
    </SettingsShell>
  );
}

export function HelpSupportScreen({ onBack }: BasicSettingsScreenProps) {
  const { t } = useI18n();
  const [supportVisible, setSupportVisible] = useState(false);

  const openUrl = async (url: string, fallbackTitle: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        throw new Error("URL is not available.");
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(fallbackTitle, t("help.openError"));
    }
  };

  const openFeedbackEmail = () => {
    const subject = encodeURIComponent(t("help.feedbackSubject"));
    const body = encodeURIComponent(t("help.feedbackBodyTemplate"));
    void openUrl(
      `mailto:feedback@siftallergy.app?subject=${subject}&body=${body}`,
      t("help.emailFeedbackTitle")
    );
  };

  return (
    <SettingsShell onBack={onBack}>
      <Header title={t("help.title")} body={t("help.body")} />

      <View style={styles.supportOptions}>
        <SupportOption
          icon={CircleHelp}
          title={t("help.faq")}
          body={t("help.faqBody")}
          onPress={() => openUrl("https://faq.siftallergy.app", t("help.faq"))}
        />
        <SupportOption
          icon={MessageCircle}
          title={t("help.contact")}
          body={t("help.contactBody")}
          onPress={() => setSupportVisible(true)}
        />
        <SupportOption
          icon={Sparkles}
          title={t("help.feedback")}
          body={t("help.feedbackBody")}
          onPress={openFeedbackEmail}
        />
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setSupportVisible(false)}
        transparent
        visible={supportVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.supportModal}>
            <Text style={styles.modalTitle}>{t("help.supportModalTitle")}</Text>
            <Text style={styles.modalBody}>{t("help.supportModalBody")}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const subject = encodeURIComponent(t("help.supportSubject"));
                void openUrl(`mailto:support@siftallergy.app?subject=${subject}`, t("help.emailSupportTitle"));
              }}
              style={styles.modalPrimary}
            >
              <Text style={styles.modalPrimaryText}>{t("help.emailSupport")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSupportVisible(false)}
              style={styles.modalSecondary}
            >
              <Text style={styles.modalSecondaryText}>{t("common.close")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  options: Array<{ label: string; value: string }>;
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
          const active = selected === option.value;
          return (
            <Pressable
              accessibilityRole="button"
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={styles.optionRow}
            >
              <View style={styles.rowText}>
                <Text style={styles.optionTitle}>{option.label}</Text>
                {recommended === option.value && <Text style={styles.optionMeta}>Recommended</Text>}
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
  plannedLanguages: {
    marginTop: -16
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
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(26, 28, 28, 0.32)",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  supportModal: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    gap: 18,
    maxWidth: 342,
    padding: 24,
    width: "100%"
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 30,
    textAlign: "center"
  },
  modalBody: {
    color: colors.inkMuted,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 24,
    textAlign: "center"
  },
  modalPrimary: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: 999,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 20
  },
  modalPrimaryText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0
  },
  modalSecondary: {
    alignItems: "center",
    minHeight: 40,
    justifyContent: "center"
  },
  modalSecondaryText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0
  }
});
