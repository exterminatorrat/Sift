import React, { useRef } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertTriangle, CircleCheck, History } from "lucide-react-native";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { EmptyState } from "../components/EmptyState";
import { ScanResult } from "../types/scan";
import { getRiskMeta } from "../utils/riskLabels";
import { formatAllergenLabel, formatDateTime } from "../utils/formatters";
import { BottomNavBar } from "../components/BottomNavBar";
import { useI18n } from "../i18n/I18nProvider";

type HistoryScreenProps = {
  scans: ScanResult[];
  onBack: () => void;
  onOpenScan: (scanId: string) => void;
  onDeleteScan?: (scanId: string) => void;
  onRenameScan?: (scanId: string, title: string) => void;
  onOpenProfile?: () => void;
};

export function HistoryScreen({
  scans,
  onBack,
  onOpenScan,
  onDeleteScan,
  onRenameScan,
  onOpenProfile
}: HistoryScreenProps) {
  const { t } = useI18n();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{t("history.title")}</Text>
        </View>

        {scans.length === 0 ? (
          <EmptyState
            icon={History}
            title={t("history.noScansTitle")}
            body={t("history.noScansBody")}
          />
        ) : (
          <View style={styles.list}>
            {scans.map((scan) => (
              <SwipeableScanCard
                key={scan.id}
                scan={scan}
                onDelete={onDeleteScan}
                onOpen={onOpenScan}
                onRename={onRenameScan}
              />
            ))}
          </View>
        )}
      </ScrollView>
      {onOpenProfile && (
        <BottomNavBar
          active="history"
          onHome={onBack}
          onHistory={() => undefined}
          onProfile={onOpenProfile}
        />
      )}
    </SafeAreaView>
  );
}

type SwipeableScanCardProps = {
  scan: ScanResult;
  onOpen: (scanId: string) => void;
  onDelete?: (scanId: string) => void;
  onRename?: (scanId: string, title: string) => void;
};

function SwipeableScanCard({ scan, onOpen, onDelete, onRename }: SwipeableScanCardProps) {
  const { languageCode, t } = useI18n();
  const didLongPress = useRef(false);
  const meta = getRiskMeta(scan.scanSummary.overallRisk, t);
  const riskCount = Math.max(1, scan.dishes.filter((dish) => dish.riskLevel !== "low_risk").length);
  const scanTitle = scan.restaurantName ?? t("home.menuScan");

  const promptRename = () => {
    if (!onRename) {
      return;
    }

    Alert.prompt(
      "Rename scan",
      "Give this saved scan a short name.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: (title?: string) => {
            if (title?.trim()) {
              onRename(scan.id, title);
            }
          }
        }
      ],
      "plain-text",
      scanTitle
    );
  };

  const openActions = () => {
    didLongPress.current = true;
    const actions = [
      onRename
        ? {
            text: "Rename",
            onPress: promptRename
          }
        : null,
      onDelete
        ? {
            text: t("history.deleteScan"),
            style: "destructive" as const,
            onPress: () => onDelete(scan.id)
          }
        : null,
      { text: "Cancel", style: "cancel" as const }
    ].filter(Boolean) as Array<{
      onPress?: () => void;
      style?: "cancel" | "destructive";
      text: string;
    }>;

    if (actions.length > 1) {
      Alert.alert("Scan options", scanTitle, actions);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      onLongPress={openActions}
      onPress={() => {
        if (didLongPress.current) {
          didLongPress.current = false;
          return;
        }
        onOpen(scan.id);
      }}
      style={styles.item}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemText}>
          <Text style={styles.itemTitle}>{scanTitle}</Text>
          <Text style={styles.itemDate}>{formatDateTime(scan.createdAt, languageCode)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: meta.background }]}>
          {scan.scanSummary.overallRisk === "low_risk" ? (
            <CircleCheck color={meta.color} size={13} strokeWidth={2.4} />
          ) : (
            <AlertTriangle color={meta.color} size={13} strokeWidth={2.4} />
          )}
          <Text style={[styles.badgeText, { color: meta.color }]}>
            {scan.scanSummary.overallRisk === "low_risk"
              ? t("history.noObviousRisks")
              : t("history.risksFound", { count: riskCount })}
          </Text>
        </View>
      </View>
      <View style={styles.chips}>
        {scan.dishes
          .flatMap((dish) => dish.possibleAllergens)
          .filter((value, index, list) => list.indexOf(value) === index)
          .slice(0, 3)
          .map((allergen) => (
            <View key={allergen} style={styles.chip}>
              <Text style={styles.chipText}>{formatAllergenLabel(allergen, t)}</Text>
          </View>
          ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 24,
    padding: 24,
    paddingBottom: 154,
    paddingTop: 18
  },
  pageHeader: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40
  },
  pageTitle: {
    color: colors.primaryDark,
    ...typography.pageTitle,
    textAlign: "center"
  },
  list: {
    gap: 24
  },
  item: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    gap: 16,
    padding: 24,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12
  },
  itemHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  itemText: {
    flex: 1,
    gap: 0,
    paddingRight: 12
  },
  itemTitle: {
    color: colors.ink,
    ...typography.sectionTitle
  },
  itemDate: {
    color: colors.inkMuted,
    ...typography.bodyLarge
  },
  badge: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  badgeText: {
    ...typography.label
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderSoft,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  chipText: {
    color: colors.inkMuted,
    ...typography.caption,
    textTransform: "capitalize"
  }
});
