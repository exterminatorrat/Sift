import React, { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  LucideIcon,
  MessageSquareText,
} from "lucide-react-native";
import { UserProfile } from "../types/allergy";
import { DishRisk } from "../types/scan";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { PrimaryButton } from "../components/PrimaryButton";
import { getRiskMeta } from "../utils/riskLabels";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { VoiceButton } from "../components/VoiceButton";
import { useI18n } from "../i18n/I18nProvider";
import { stopSpeech } from "../services/speechService";

type DishDetailScreenProps = {
  dish: DishRisk;
  profile: UserProfile;
  restaurantLanguage?: string | null;
  showVoiceTools?: boolean;
  onBack: () => void;
};

export function DishDetailScreen({
  dish,
  profile,
  restaurantLanguage,
  showVoiceTools = true,
  onBack
}: DishDetailScreenProps) {
  const { languageCode, t } = useI18n();
  const meta = getRiskMeta(dish.riskLevel, t);
  const questionText = dish.questionsToAsk.join("\n\n");

  useEffect(() => () => {
    void stopSpeech();
  }, []);

  const handleBack = () => {
    void stopSpeech();
    onBack();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pageHeader}>
          <AnimatedPressable
            accessibilityLabel={t("common.back")}
            accessibilityRole="button"
            onPress={handleBack}
            scaleTo={0.92}
            style={styles.backButton}
          >
            <ChevronLeft color={colors.ink} size={22} strokeWidth={2.2} />
          </AnimatedPressable>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.hero}>
          <View style={[styles.badge, { backgroundColor: meta.background }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={styles.title}>{dish.dishName}</Text>
          {dish.menuDescription && <Text style={styles.description}>{dish.menuDescription}</Text>}
          <Text style={styles.summary}>{dish.conservativeLanguage}</Text>
        </View>

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
          {showVoiceTools && (
            <VoiceButton
              fallbackLanguageCode={languageCode}
              label={t("voice.readQuestions")}
              languageHint={restaurantLanguage ?? profile.restaurantLanguage ?? profile.preferredLanguage}
              stopLabel={t("voice.stop")}
              text={questionText}
              unavailableLabel={t("voice.unavailable")}
            />
          )}
          <View style={styles.questionList}>
            {dish.questionsToAsk.map((question, index) => {
              const userLanguageQuestion = dish.questionsToAskUserLanguage?.[index];
              const showUserLanguageQuestion =
                userLanguageQuestion && userLanguageQuestion.toLowerCase() !== question.toLowerCase();

              return (
              <View key={`${question}-${index}`} style={styles.questionRow}>
                <Text style={styles.bullet}>-</Text>
                <View style={styles.questionTextGroup}>
                  <Text style={styles.question}>{question}</Text>
                  {showUserLanguageQuestion && (
                    <Text style={styles.questionTranslation}>{userLanguageQuestion}</Text>
                  )}
                </View>
              </View>
              );
            })}
          </View>
        </DetailSection>

        <PrimaryButton label={t("dish.backToResults")} onPress={handleBack} tone="secondary" />
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
    paddingTop: 12
  },
  pageHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    height: 44,
    justifyContent: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    width: 44
  },
  headerSpacer: {
    height: 44,
    width: 44
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
    ...typography.badge
  },
  title: {
    color: colors.ink,
    ...typography.title
  },
  description: {
    color: colors.inkMuted,
    ...typography.body
  },
  summary: {
    color: colors.ink,
    ...typography.label,
    fontSize: 16,
    lineHeight: 23
  },
  section: {
    backgroundColor: colors.surfaceWarm,
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
    ...typography.label,
    fontSize: 16
  },
  paragraph: {
    color: colors.ink,
    ...typography.bodySmall
  },
  paragraphMuted: {
    color: colors.inkMuted,
    ...typography.bodySmall
  },
  tokenList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  token: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderSoft,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  tokenText: {
    color: colors.ink,
    ...typography.badge
  },
  alertToken: {
    backgroundColor: colors.dangerSoft
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
    ...typography.label,
    fontSize: 16,
    lineHeight: 21
  },
  question: {
    color: colors.ink,
    flex: 1,
    ...typography.bodySmall
  },
  questionTextGroup: {
    flex: 1,
    gap: 5
  },
  questionTranslation: {
    color: colors.inkMuted,
    ...typography.caption,
    lineHeight: 18
  }
});
