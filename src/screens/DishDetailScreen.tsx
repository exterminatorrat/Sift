import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ClipboardList,
  Languages,
  LucideIcon,
  MessageSquareText,
  TriangleAlert
} from "lucide-react-native";
import { UserProfile } from "../types/allergy";
import { DishRisk, RestaurantMessage } from "../types/scan";
import { colors } from "../constants/colors";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { PrimaryButton } from "../components/PrimaryButton";
import { getRiskMeta } from "../utils/riskLabels";
import { AppTopBar } from "../components/AppTopBar";
import { useI18n } from "../i18n/I18nProvider";

type DishDetailScreenProps = {
  dish: DishRisk;
  profile: UserProfile;
  restaurantMessage?: RestaurantMessage;
  onBack: () => void;
};

export function DishDetailScreen({
  dish,
  profile,
  restaurantMessage,
  onBack
}: DishDetailScreenProps) {
  const { t } = useI18n();
  const meta = getRiskMeta(dish.riskLevel, t);
  const allergyNames = profile.allergies.map((allergy) => allergy.name).join(", ");

  return (
    <SafeAreaView style={styles.screen}>
      <AppTopBar showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={[styles.badge, { backgroundColor: meta.background }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={styles.title}>{dish.dishName}</Text>
          {dish.menuDescription && <Text style={styles.description}>{dish.menuDescription}</Text>}
          <Text style={styles.summary}>{dish.conservativeLanguage}</Text>
        </View>

        {restaurantMessage && (
          <View style={styles.translationCard}>
            <View style={styles.warningHeader}>
              <TriangleAlert color={colors.avoid} size={20} strokeWidth={2.2} />
              <Text style={styles.warningText}>{t("dish.severeAllergyAlert")}</Text>
            </View>
            <View style={styles.translationPrimary}>
              <Text style={styles.translationPrompt}>{t("dish.readCarefully")}</Text>
              <Text style={styles.translatedText}>
                {restaurantMessage.translated ?? restaurantMessage.english}
              </Text>
            </View>
            <View style={styles.translationSecondary}>
              <Text style={styles.englishLead}>{t("dish.allergiesTo")}</Text>
              <TokenList
                emptyLabel={t("dish.emptyPossibleAllergens")}
                items={profile.allergies.map((allergy) => allergy.name)}
                tone="alert"
              />
              <Text style={styles.englishReference}>{restaurantMessage.english}</Text>
            </View>
          </View>
        )}

        <DetailSection title={t("dish.whyFlagged")}>
          <Text style={styles.paragraph}>{dish.reason}</Text>
        </DetailSection>

        <DetailSection title={t("dish.possibleAllergens")}>
          <TokenList
            emptyLabel={t("dish.emptyPossibleAllergens")}
            items={dish.possibleAllergens}
          />
        </DetailSection>

        <DetailSection title={t("dish.hiddenRiskIngredients")}>
          <TokenList emptyLabel={t("dish.emptyHiddenRisk")} items={dish.hiddenRiskIngredients} />
        </DetailSection>

        <DetailSection title={t("dish.crossContactConcerns")}>
          <TokenList emptyLabel={t("dish.emptyCrossContact")} items={dish.crossContactConcerns} />
        </DetailSection>

        <DetailSection title={t("dish.questionsToAsk")} icon={MessageSquareText}>
          <View style={styles.questionList}>
            {dish.questionsToAsk.map((question) => (
              <View key={question} style={styles.questionRow}>
                <Text style={styles.bullet}>-</Text>
                <Text style={styles.question}>{question}</Text>
              </View>
            ))}
          </View>
        </DetailSection>

        <View style={styles.profileNote}>
          <ClipboardList color={colors.primary} size={18} strokeWidth={2.1} />
          <Text style={styles.profileNoteText}>
            {t("dish.profileNote", { allergies: allergyNames, name: profile.name })}
          </Text>
        </View>

        <PrimaryButton label={t("dish.backToResults")} onPress={onBack} tone="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

type DetailSectionProps = {
  title: string;
  children: React.ReactNode;
  icon?: LucideIcon;
};

function DetailSection({ title, children, icon: Icon }: DetailSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        {Icon && <Icon color={colors.primary} size={18} strokeWidth={2.1} />}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

type TokenListProps = {
  items: string[];
  emptyLabel: string;
  tone?: "default" | "alert";
};

function TokenList({ items, emptyLabel, tone = "default" }: TokenListProps) {
  if (items.length === 0) {
    return <Text style={styles.paragraphMuted}>{emptyLabel}</Text>;
  }

  return (
    <View style={styles.tokenList}>
      {items.map((item) => (
        <View key={item} style={[styles.token, tone === "alert" && styles.alertToken]}>
          <Text style={[styles.tokenText, tone === "alert" && styles.alertTokenText]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 16,
    padding: 24,
    paddingBottom: 64,
    paddingTop: 64
  },
  hero: {
    gap: 11,
    paddingBottom: 4
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "300",
    letterSpacing: 0,
    lineHeight: 36
  },
  description: {
    color: colors.inkMuted,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 22
  },
  summary: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 23
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    padding: 16
  },
  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0
  },
  paragraph: {
    color: colors.ink,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 21
  },
  paragraphMuted: {
    color: colors.inkMuted,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 21
  },
  tokenList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  token: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  tokenText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0
  },
  alertToken: {
    backgroundColor: "rgba(186,26,26,0.1)"
  },
  alertTokenText: {
    color: colors.high
  },
  questionList: {
    gap: 10
  },
  questionRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8
  },
  bullet: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21
  },
  question: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 21
  },
  messageLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  messageText: {
    color: colors.ink,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 22
  },
  profileNote: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    padding: 13
  },
  profileNoteText: {
    color: colors.primary,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 19
  },
  translationCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    elevation: 4,
    overflow: "hidden",
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 40
  },
  warningHeader: {
    alignItems: "center",
    backgroundColor: colors.highSoft,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12
  },
  warningText: {
    color: colors.avoid,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    lineHeight: 16,
    textTransform: "uppercase"
  },
  translationPrimary: {
    alignItems: "center",
    borderBottomColor: "#E3E2E1",
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 24,
    padding: 24
  },
  translationPrompt: {
    color: colors.inkMuted,
    fontSize: 18,
    letterSpacing: 0,
    lineHeight: 30,
    textAlign: "center"
  },
  translatedText: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "400",
    letterSpacing: 0,
    lineHeight: 42,
    textAlign: "center"
  },
  translationSecondary: {
    alignItems: "center",
    backgroundColor: colors.background,
    gap: 12,
    padding: 24
  },
  englishLead: {
    color: colors.ink,
    fontSize: 18,
    letterSpacing: 0,
    lineHeight: 30,
    textAlign: "center"
  },
  englishReference: {
    color: colors.inkMuted,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 26,
    marginTop: 8,
    textAlign: "center"
  }
});
