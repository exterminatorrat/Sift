import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  GestureResponderEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertTriangle, CircleCheck, History, Pencil, Trash2 } from "lucide-react-native";
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

type ScanMenuState = {
  scan: ScanResult;
  title: string;
  x: number;
  y: number;
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
  const [scanMenu, setScanMenu] = useState<ScanMenuState | null>(null);

  const promptRename = (scan: ScanResult, scanTitle: string) => {
    if (!onRenameScan) {
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
              onRenameScan(scan.id, title);
            }
          }
        }
      ],
      "plain-text",
      scanTitle
    );
  };

  const closeScanMenu = () => setScanMenu(null);

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
                onOpenActions={(scan, title, x, y) => setScanMenu({ scan, title, x, y })}
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
      <HistoryContextMenu
        menu={scanMenu}
        onClose={closeScanMenu}
        onDelete={() => {
          if (scanMenu && onDeleteScan) {
            onDeleteScan(scanMenu.scan.id);
          }
          closeScanMenu();
        }}
        onRename={() => {
          if (scanMenu) {
            promptRename(scanMenu.scan, scanMenu.title);
          }
          closeScanMenu();
        }}
      />
    </SafeAreaView>
  );
}

type SwipeableScanCardProps = {
  scan: ScanResult;
  onOpen: (scanId: string) => void;
  onDelete?: (scanId: string) => void;
  onRename?: (scanId: string, title: string) => void;
  onOpenActions: (scan: ScanResult, title: string, x: number, y: number) => void;
};

function SwipeableScanCard({
  scan,
  onOpen,
  onDelete,
  onRename,
  onOpenActions
}: SwipeableScanCardProps) {
  const { languageCode, t } = useI18n();
  const didLongPress = useRef(false);
  const meta = getRiskMeta(scan.scanSummary.overallRisk, t);
  const riskCount = Math.max(1, scan.dishes.filter((dish) => dish.riskLevel !== "low_risk").length);
  const scanTitle = scan.restaurantName ?? t("home.menuScan");

  const openActions = (event: GestureResponderEvent) => {
    didLongPress.current = true;
    if (onRename || onDelete) {
      onOpenActions(scan, scanTitle, event.nativeEvent.pageX, event.nativeEvent.pageY);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Long press for scan options"
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

type HistoryContextMenuProps = {
  menu: ScanMenuState | null;
  onClose: () => void;
  onDelete: () => void;
  onRename: () => void;
};

const CONTEXT_MENU_WIDTH = 190;
const CONTEXT_MENU_ROW_HEIGHT = 48;
const CONTEXT_MENU_MARGIN = 18;

function HistoryContextMenu({ menu, onClose, onDelete, onRename }: HistoryContextMenuProps) {
  const { width, height } = useWindowDimensions();
  const { t } = useI18n();
  const scale = useRef(new Animated.Value(0.94)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!menu) {
      return;
    }

    scale.setValue(0.94);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 120,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.timing(scale, {
        duration: 150,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      })
    ]).start();
  }, [menu, opacity, scale]);

  if (!menu) {
    return null;
  }

  const menuHeight = CONTEXT_MENU_ROW_HEIGHT * 2 + StyleSheet.hairlineWidth;
  const opensFromRight = menu.x > width / 2;
  const rawLeft = opensFromRight ? menu.x - CONTEXT_MENU_WIDTH + 14 : menu.x - 14;
  const left = Math.min(
    Math.max(CONTEXT_MENU_MARGIN, rawLeft),
    width - CONTEXT_MENU_WIDTH - CONTEXT_MENU_MARGIN
  );
  const rawTop = menu.y + 10;
  const top =
    rawTop + menuHeight + CONTEXT_MENU_MARGIN > height
      ? Math.max(CONTEXT_MENU_MARGIN, menu.y - menuHeight - 10)
      : rawTop;
  const transformOriginX = opensFromRight ? CONTEXT_MENU_WIDTH - 18 : 18;

  return (
    <Modal animationType="none" transparent visible onRequestClose={onClose}>
      <View style={styles.menuOverlay}>
        <Pressable
          accessibilityLabel="Close scan options"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.menuDismissLayer}
        />
        <Animated.View
          style={[
            styles.contextMenu,
            {
              left,
              opacity,
              top,
              transform: [
                { translateX: transformOriginX },
                { scale },
                { translateX: -transformOriginX }
              ]
            }
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={onRename}
            style={({ pressed }) => [styles.contextMenuRow, pressed && styles.contextMenuRowPressed]}
          >
            <Pencil color={colors.primaryDark} size={17} strokeWidth={2.2} />
            <Text style={styles.contextMenuText}>Rename</Text>
          </Pressable>
          <View style={styles.contextMenuDivider} />
          <Pressable
            accessibilityRole="button"
            onPress={onDelete}
            style={({ pressed }) => [styles.contextMenuRow, pressed && styles.contextMenuRowPressed]}
          >
            <Trash2 color={colors.avoid} size={17} strokeWidth={2.2} />
            <Text style={styles.contextMenuDeleteText}>{t("history.deleteScan")}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
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
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(31, 47, 45, 0.08)"
  },
  menuDismissLayer: {
    ...StyleSheet.absoluteFillObject
  },
  contextMenu: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    position: "absolute",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    width: CONTEXT_MENU_WIDTH
  },
  contextMenuRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    height: CONTEXT_MENU_ROW_HEIGHT,
    paddingHorizontal: 16
  },
  contextMenuRowPressed: {
    backgroundColor: colors.surfaceWarm
  },
  contextMenuText: {
    color: colors.ink,
    ...typography.label
  },
  contextMenuDeleteText: {
    color: colors.avoid,
    ...typography.label
  },
  contextMenuDivider: {
    backgroundColor: colors.borderSoft,
    height: StyleSheet.hairlineWidth
  }
});
