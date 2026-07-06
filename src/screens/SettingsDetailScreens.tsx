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
import { typography } from "../constants/typography";
import { UserProfile } from "../types/allergy";
import { useI18n } from "../i18n/I18nProvider";
import { waveOneAppLanguages } from "../i18n/translations";

const UNKNOWN_RESTAURANT_LANGUAGE = "__unknown_restaurant_language__";

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
  const plans = [
    {
      body: t("subscription.freeBody"),
      current: true,
      name: t("subscription.free"),
      price: t("subscription.freePrice")
    },
    {
      body: t("subscription.plusBody"),
      name: t("subscription.plus"),
      price: t("subscription.plusPrice")
    },
    {
      body: t("subscription.premiumBody"),
      name: t("subscription.premium"),
      price: t("subscription.premiumPrice")
    },
    {
      body: t("subscription.familyBody"),
      name: t("subscription.family"),
      price: t("subscription.familyPrice")
    }
  ];

  return (
    <SettingsShell onBack={onBack}>
      <Header title={t("subscription.title")} body={t("subscription.body")} />

      <View style={styles.planList}>
        <Text style={styles.sectionTitle}>{t("subscription.plans")}</Text>
        {plans.map((plan) => (
          <PlanCard
            body={plan.body}
            current={plan.current}
            currentLabel={t("subscription.current")}
            key={plan.name}
            name={plan.name}
            price={plan.price}
            unavailableLabel={t("subscription.unavailable")}
          />
        ))}
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
  const selectedRestaurantLanguage = profile.restaurantLanguage || UNKNOWN_RESTAURANT_LANGUAGE;

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
        options={waveOneAppLanguages.map((language) => ({
          disabled: !language.enabled,
          label: language.label,
          meta: language.enabled ? undefined : t("language.comingSoon"),
          value: language.value
        }))}
        selected={selectedAppLanguage}
        onSelect={(preferredLanguage) => updateProfile({ preferredLanguage })}
      />

      <OptionSection
        label={t("language.restaurantLanguage")}
        body={t("language.restaurantLanguageBody")}
        options={[
          {
            label: t("language.notSure"),
            value: UNKNOWN_RESTAURANT_LANGUAGE
          },
          ...waveOneAppLanguages.map((language) => ({
            disabled: !language.enabled,
            label: language.label,
            meta: language.enabled ? undefined : t("language.comingSoon"),
            value: language.value
          }))
        ]}
        selected={selectedRestaurantLanguage}
        onSelect={(restaurantLanguage) =>
          updateProfile({
            restaurantLanguage:
              restaurantLanguage === UNKNOWN_RESTAURANT_LANGUAGE ? undefined : restaurantLanguage
          })
        }
      />
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
  options: Array<{ disabled?: boolean; label: string; meta?: string; value: string }>;
  selected: string;
  recommended?: string;
  onSelect: (option: string) => void;
}) {
  const { t } = useI18n();

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
              disabled={option.disabled}
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[styles.optionRow, option.disabled && styles.optionRowDisabled]}
            >
              <View style={styles.rowText}>
                <Text style={[styles.optionTitle, option.disabled && styles.optionTitleDisabled]}>
                  {option.label}
                </Text>
                {recommended === option.value && <Text style={styles.optionMeta}>{t("common.recommended")}</Text>}
                {option.meta && <Text style={styles.optionMeta}>{option.meta}</Text>}
              </View>
              {active && <Check color={colors.primaryDark} size={20} strokeWidth={2.5} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PlanCard({
  body,
  current,
  currentLabel,
  name,
  price,
  unavailableLabel
}: {
  body: string;
  current?: boolean;
  currentLabel: string;
  name: string;
  price: string;
  unavailableLabel: string;
}) {
  return (
    <View style={styles.subscriptionCard}>
      <View style={styles.planTop}>
        <View style={styles.planNameRow}>
          <Text style={styles.planName}>{name}</Text>
          {current && (
            <View style={styles.currentPill}>
              <Text style={styles.currentPillText}>{currentLabel}</Text>
            </View>
          )}
        </View>
        <Text style={styles.price}>{price}</Text>
      </View>
      <Text style={styles.benefitBody}>{body}</Text>
      <Pressable accessibilityRole="button" disabled style={styles.unavailableAction}>
        <Text style={styles.unavailableActionText}>{unavailableLabel}</Text>
      </Pressable>
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
    ...typography.title
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
    ...typography.bodyLarge
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
    ...typography.badge,
    textTransform: "uppercase"
  },
  optionBody: {
    color: colors.inkMuted,
    ...typography.bodySmall,
    lineHeight: 20
  },
  optionCard: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    overflow: "hidden",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18
  },
  optionRow: {
    alignItems: "center",
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 70,
    paddingHorizontal: 24
  },
  optionRowDisabled: {
    opacity: 0.55
  },
  optionTitle: {
    color: colors.ink,
    ...typography.sectionTitle
  },
  optionTitleDisabled: {
    color: colors.inkMuted
  },
  optionMeta: {
    color: colors.inkSubtle,
    ...typography.caption
  },
  planList: {
    gap: 16
  },
  subscriptionCard: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    gap: 18,
    padding: 24,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18
  },
  planTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 18,
    justifyContent: "space-between"
  },
  planNameRow: {
    flex: 1,
    gap: 8
  },
  planName: {
    color: colors.ink,
    ...typography.sectionTitle,
    fontSize: 22,
    lineHeight: 30
  },
  currentPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  currentPillText: {
    color: colors.primaryDark,
    ...typography.badge
  },
  price: {
    color: colors.primaryDark,
    ...typography.sectionTitle,
    textAlign: "right"
  },
  sectionTitle: {
    color: colors.ink,
    ...typography.sectionTitle
  },
  benefitBody: {
    color: colors.inkMuted,
    ...typography.bodySmall,
    lineHeight: 20
  },
  unavailableAction: {
    alignItems: "center",
    backgroundColor: colors.backgroundAlt,
    borderRadius: 999,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: 20
  },
  unavailableActionText: {
    color: colors.inkSubtle,
    ...typography.label
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: 24
  },
  primaryActionText: {
    color: colors.textInverse,
    ...typography.label
  },
  supportBlock: {
    alignItems: "center",
    gap: 10
  },
  supportTitle: {
    color: colors.inkMuted,
    ...typography.bodyLarge,
    textAlign: "center"
  },
  supportLink: {
    color: colors.primaryDark,
    ...typography.label
  },
  article: {
    gap: 32
  },
  disclaimerSection: {
    gap: 12
  },
  articleBody: {
    color: colors.inkMuted,
    ...typography.bodyLarge
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
    ...typography.bodyLarge
  },
  supportOptions: {
    gap: 24
  },
  supportOption: {
    alignItems: "center",
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    flexDirection: "row",
    gap: 24,
    minHeight: 150,
    padding: 32,
    shadowColor: colors.ink,
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
    ...typography.sectionTitle,
    lineHeight: 28
  },
  supportOptionBody: {
    color: colors.inkMuted,
    ...typography.bodyLarge,
    lineHeight: 24
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(24, 35, 33, 0.32)",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  supportModal: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 18,
    maxWidth: 342,
    padding: 24,
    width: "100%"
  },
  modalTitle: {
    color: colors.ink,
    ...typography.sectionTitle,
    fontSize: 22,
    lineHeight: 30,
    textAlign: "center"
  },
  modalBody: {
    color: colors.inkMuted,
    ...typography.bodyLarge,
    lineHeight: 24,
    textAlign: "center"
  },
  modalPrimary: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 20
  },
  modalPrimaryText: {
    color: colors.textInverse,
    ...typography.label
  },
  modalSecondary: {
    alignItems: "center",
    minHeight: 40,
    justifyContent: "center"
  },
  modalSecondaryText: {
    color: colors.primaryDark,
    ...typography.label
  }
});
