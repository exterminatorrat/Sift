import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, History } from "lucide-react-native";
import { colors } from "../constants/colors";
import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScanResult } from "../types/scan";
import { riskMeta } from "../utils/riskLabels";
import { formatDateTime } from "../utils/formatters";
import { BottomNavBar } from "../components/BottomNavBar";

type HistoryScreenProps = {
  scans: ScanResult[];
  onBack: () => void;
  onOpenScan: (scanId: string) => void;
  onOpenProfile?: () => void;
};

export function HistoryScreen({ scans, onBack, onOpenScan, onOpenProfile }: HistoryScreenProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <PrimaryButton label="Back" icon={ChevronLeft} tone="quiet" onPress={onBack} />

        <View style={styles.header}>
          <Text style={styles.kicker}>History</Text>
          <Text style={styles.title}>Recent scans</Text>
        </View>

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
                  <View style={[styles.riskBar, { backgroundColor: meta.color }]} />
                  <View style={styles.itemText}>
                    <Text style={styles.itemTitle}>{scan.restaurantName ?? "Menu scan"}</Text>
                    <Text style={styles.itemDate}>{formatDateTime(scan.createdAt)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: meta.background }]}>
                    <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
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
    gap: 20,
    padding: 20,
    paddingBottom: 104
  },
  header: {
    gap: 6
  },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 40
  },
  list: {
    gap: 10
  },
  item: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 76,
    overflow: "hidden",
    padding: 14
  },
  riskBar: {
    alignSelf: "stretch",
    borderRadius: 999,
    width: 4
  },
  itemText: {
    flex: 1,
    gap: 2
  },
  itemTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0
  },
  itemDate: {
    color: colors.inkMuted,
    fontSize: 13,
    letterSpacing: 0
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0
  }
});
