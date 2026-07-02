import React, { useRef } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertTriangle, CircleCheck, History } from "lucide-react-native";
import { colors } from "../constants/colors";
import { EmptyState } from "../components/EmptyState";
import { ScanResult } from "../types/scan";
import { riskMeta } from "../utils/riskLabels";
import { formatDateTime } from "../utils/formatters";
import { BottomNavBar } from "../components/BottomNavBar";
import { useI18n } from "../i18n/I18nProvider";

type HistoryScreenProps = {
  scans: ScanResult[];
  onBack: () => void;
  onOpenScan: (scanId: string) => void;
  onDeleteScan?: (scanId: string) => void;
  onOpenProfile?: () => void;
};

export function HistoryScreen({
  scans,
  onBack,
  onOpenScan,
  onDeleteScan,
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
};

function SwipeableScanCard({ scan, onOpen, onDelete }: SwipeableScanCardProps) {
  const { t } = useI18n();
  const translateX = useRef(new Animated.Value(0)).current;
  const openOffset = -92;
  const currentOffset = useRef(0);

  const animateTo = (toValue: number) => {
    currentOffset.current = toValue;
    Animated.spring(translateX, {
      toValue,
      damping: 18,
      stiffness: 220,
      mass: 0.7,
      useNativeDriver: true
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        const nextOffset = Math.max(openOffset, Math.min(0, currentOffset.current + gesture.dx));
        translateX.setValue(nextOffset);
      },
      onPanResponderRelease: (_, gesture) => {
        const shouldOpen = currentOffset.current + gesture.dx < -46 || gesture.vx < -0.55;
        animateTo(shouldOpen ? openOffset : 0);
      },
      onPanResponderTerminate: () => animateTo(0)
    })
  ).current;

  const meta = riskMeta[scan.scanSummary.overallRisk];
  const riskCount = Math.max(1, scan.dishes.filter((dish) => dish.riskLevel !== "low_risk").length);

  return (
    <View style={styles.swipeShell}>
      {onDelete && (
        <Pressable
          accessibilityRole="button"
          onPress={() => onDelete(scan.id)}
          style={styles.deleteAction}
        >
          <Text style={styles.deleteText}>{t("history.deleteScan")}</Text>
        </Pressable>
      )}
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (currentOffset.current < 0) {
              animateTo(0);
              return;
            }
            onOpen(scan.id);
          }}
          style={styles.item}
        >
          <View style={styles.itemHeader}>
            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>{scan.restaurantName ?? t("home.menuScan")}</Text>
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
                  <Text style={styles.chipText}>{allergen}</Text>
                </View>
              ))}
          </View>
        </Pressable>
      </Animated.View>
    </View>
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
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 32,
    textAlign: "center"
  },
  list: {
    gap: 24
  },
  swipeShell: {
    borderRadius: 12,
    overflow: "hidden"
  },
  deleteAction: {
    alignItems: "center",
    backgroundColor: colors.high,
    bottom: 0,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: 0,
    width: 92
  },
  deleteText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0
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
