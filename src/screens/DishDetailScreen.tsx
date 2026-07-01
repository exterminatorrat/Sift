import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ClipboardList,
  Languages,
  LucideIcon,
  MessageSquareText
} from "lucide-react-native";
import { UserProfile } from "../types/allergy";
import { DishRisk, RestaurantMessage } from "../types/scan";
import { colors } from "../constants/colors";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { PrimaryButton } from "../components/PrimaryButton";
import { riskMeta } from "../utils/riskLabels";

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
  const meta = riskMeta[dish.riskLevel];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={colors.primary} size={22} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.topText}>
          <Text style={styles.kicker}>Dish detail</Text>
          <Text style={styles.topTitle} numberOfLines={1}>
            {dish.dishName}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={[styles.badge, { backgroundColor: meta.background }]}>
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={styles.title}>{dish.dishName}</Text>
          {dish.menuDescription && <Text style={styles.description}>{dish.menuDescription}</Text>}
          <Text style={styles.summary}>{dish.conservativeLanguage}</Text>
        </View>

        <DisclaimerBanner compact />

        <DetailSection title="Possible allergens">
          <TokenList
            emptyLabel="No obvious listed allergen from visible menu text."
            items={dish.possibleAllergens}
          />
        </DetailSection>

        <DetailSection title="Why it was flagged">
          <Text style={styles.paragraph}>{dish.reason}</Text>
        </DetailSection>

        <DetailSection title="Hidden-risk ingredients">
          <TokenList emptyLabel="No common hidden ingredient pattern was flagged." items={dish.hiddenRiskIngredients} />
        </DetailSection>

        <DetailSection title="Cross-contact concerns">
          <TokenList emptyLabel="No specific cross-contact concern was found." items={dish.crossContactConcerns} />
        </DetailSection>

        <DetailSection title="Questions to ask staff" icon={MessageSquareText}>
          <View style={styles.questionList}>
            {dish.questionsToAsk.map((question) => (
              <View key={question} style={styles.questionRow}>
                <Text style={styles.bullet}>-</Text>
                <Text style={styles.question}>{question}</Text>
              </View>
            ))}
          </View>
        </DetailSection>

        {restaurantMessage && (
          <DetailSection title="Restaurant-facing message" icon={Languages}>
            <Text style={styles.messageLabel}>English</Text>
            <Text style={styles.messageText}>{restaurantMessage.english}</Text>
            {restaurantMessage.translated && (
              <>
                <Text style={styles.messageLabel}>{restaurantMessage.language}</Text>
                <Text style={styles.messageText}>{restaurantMessage.translated}</Text>
              </>
            )}
          </DetailSection>
        )}

        <View style={styles.profileNote}>
          <ClipboardList color={colors.primary} size={18} strokeWidth={2.1} />
          <Text style={styles.profileNoteText}>
            Built for {profile.name}: {profile.allergies.map((allergy) => allergy.name).join(", ")}
          </Text>
        </View>

        <PrimaryButton label="Back to results" onPress={onBack} tone="secondary" />
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
};

function TokenList({ items, emptyLabel }: TokenListProps) {
  if (items.length === 0) {
    return <Text style={styles.paragraphMuted}>{emptyLabel}</Text>;
  }

  return (
    <View style={styles.tokenList}>
      {items.map((item) => (
        <View key={item} style={styles.token}>
          <Text style={styles.tokenText}>{item}</Text>
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
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  topText: {
    flex: 1,
    gap: 2
  },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  topTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0
  },
  content: {
    gap: 16,
    padding: 20,
    paddingTop: 8
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
    fontWeight: "700",
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
    borderRadius: 20,
    borderWidth: 1,
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
  }
});
