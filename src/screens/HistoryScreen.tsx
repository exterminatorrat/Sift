import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertTriangle, CircleCheck, History } from "lucide-react-native";
import { colors } from "../constants/colors";
import { EmptyState } from "../components/EmptyState";
import { ScanResult } from "../types/scan";
import { riskMeta } from "../utils/riskLabels";
import { formatDateTime } from "../utils/formatters";
import { BottomNavBar } from "../components/BottomNavBar";
import { AppTopBar } from "../components/AppTopBar";

type HistoryScreenProps = {
  scans: ScanResult[];
  onBack: () => void;
  onOpenScan: (scanId: string) => void;
  onOpenProfile?: () => void;
};

export function HistoryScreen({ scans, onBack, onOpenScan, onOpenProfile }: HistoryScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <AppTopBar showBack onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Scan History</Text>

        {scans.length === 0 ? (
          <EmptyState
            icon={History}
            title="No scans yet"
            body="Scans you save on this device will appear here."
          />
        ) : (
          <View style={styles.list}>
            {scans.map((scan) => {
              const meta = riskMeta[scan.scanSummary.overallRisk];
              return (
                <Pressable
                  accessibilityRole="button"
                  key={scan.id}
                  onPress={() => onOpenScan(scan.id)}
                  style={styles.item}
                >
                  <View style={styles.itemHeader}>
                    <View style={styles.itemText}>
                      <Text style={styles.itemTitle}>{scan.restaurantName ?? "Menu scan"}</Text>
                      <Text style={styles.itemDate}>{formatDateTime(scan.createdAt)}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: meta.background }]}>
                      {scan.scanSummary.overallRisk === "low_risk" ? (
                        <CircleCheck color={meta.color} size={13} strokeWidth={2.4} />
                      ) : (
                        <AlertTriangle color={meta.color} size={13} strokeWidth={2.4} />
                      )}
                      <Text style={[styles.badgeText, { color: meta.color }]}>
                        {scan.scanSummary.overallRisk === "low_risk"
                          ? "No Obvious Risks"
                          : `${Math.max(1, scan.dishes.filter((dish) => dish.riskLevel !== "low_risk").length)} Risks Found`}
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
                          <Text style={styles.chipText}>{allergen}</Text>
                        </View>
                      ))}
                  </View>
                </Pressable>
              );
            })}
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

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 48,
    padding: 24,
    paddingBottom: 154,
    paddingTop: 48
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "300",
    letterSpacing: 0,
    lineHeight: 40
  },
  list: {
    gap: 24
  },
  item: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    elevation: 2,
    gap: 16,
    padding: 24,
    shadowColor: colors.primaryDark,
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
    gap: 0
  },
  itemTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: 0,
    lineHeight: 30
  },
  itemDate: {
    color: colors.inkMuted,
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 26
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
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  chipText: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0,
    lineHeight: 18,
    textTransform: "capitalize"
  }
});
