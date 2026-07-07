import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  height: number;
  width: number;
};

type RenameDialogState = {
  scan: ScanResult;
  title: string;
};

type DeleteDialogState = {
  scan: ScanResult;
  title: string;
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
  const [renameDialog, setRenameDialog] = useState<RenameDialogState | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null);
  const [deletingScanId, setDeletingScanId] = useState<string | null>(null);

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
                isDeleting={deletingScanId === scan.id}
                onOpen={onOpenScan}
                onRename={onRenameScan}
                onDeleteAnimationEnd={() => {
                  onDeleteScan?.(scan.id);
                  setDeletingScanId(null);
                }}
                onOpenActions={(scan, title, rect) => setScanMenu({ scan, title, ...rect })}
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
          if (scanMenu) {
            setDeleteDialog({ scan: scanMenu.scan, title: scanMenu.title });
          }
          closeScanMenu();
        }}
        onRename={() => {
          if (scanMenu) {
            setRenameDialog({ scan: scanMenu.scan, title: scanMenu.title });
          }
          closeScanMenu();
        }}
      />
      <RenameScanDialog
        dialog={renameDialog}
        onCancel={() => setRenameDialog(null)}
        onSave={(scan, title) => {
          if (title.trim()) {
            onRenameScan?.(scan.id, title);
          }
          setRenameDialog(null);
        }}
      />
      <DeleteScanDialog
        dialog={deleteDialog}
        onCancel={() => setDeleteDialog(null)}
        onConfirm={(scan) => {
          setDeleteDialog(null);
          setDeletingScanId(scan.id);
        }}
      />
    </SafeAreaView>
  );
}

type SwipeableScanCardProps = {
  isDeleting?: boolean;
  scan: ScanResult;
  onOpen: (scanId: string) => void;
  onDeleteAnimationEnd?: () => void;
  onDelete?: (scanId: string) => void;
  onRename?: (scanId: string, title: string) => void;
  onOpenActions: (
    scan: ScanResult,
    title: string,
    rect: { height: number; width: number; x: number; y: number }
  ) => void;
};

function SwipeableScanCard({
  isDeleting,
  scan,
  onOpen,
  onDeleteAnimationEnd,
  onDelete,
  onRename,
  onOpenActions
}: SwipeableScanCardProps) {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const deleteHeight = useRef(new Animated.Value(0)).current;
  const deleteMarginBottom = useRef(new Animated.Value(24)).current;
  const deleteOpacity = useRef(new Animated.Value(1)).current;
  const deleteTranslateX = useRef(new Animated.Value(0)).current;
  const deleteStarted = useRef(false);
  const didLongPress = useRef(false);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const scanTitle = scan.restaurantName ?? t("home.menuScan");

  useEffect(() => {
    if (!isDeleting) {
      deleteStarted.current = false;
      deleteHeight.setValue(measuredHeight);
      deleteMarginBottom.setValue(24);
      deleteOpacity.setValue(1);
      deleteTranslateX.setValue(0);
      return;
    }

    if (deleteStarted.current) {
      return;
    }

    deleteStarted.current = true;
    deleteHeight.setValue(measuredHeight);
    deleteMarginBottom.setValue(24);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(deleteTranslateX, {
          duration: 230,
          easing: Easing.out(Easing.cubic),
          toValue: -(width + 80),
          useNativeDriver: true
        }),
        Animated.timing(deleteOpacity, {
          duration: 190,
          easing: Easing.out(Easing.cubic),
          toValue: 0,
          useNativeDriver: true
        })
      ]),
      Animated.parallel([
        Animated.timing(deleteHeight, {
          duration: 190,
          easing: Easing.out(Easing.cubic),
          toValue: 0,
          useNativeDriver: false
        }),
        Animated.timing(deleteMarginBottom, {
          duration: 190,
          easing: Easing.out(Easing.cubic),
          toValue: 0,
          useNativeDriver: false
        })
      ])
    ]).start(onDeleteAnimationEnd);
  }, [
    deleteHeight,
    deleteMarginBottom,
    deleteOpacity,
    deleteTranslateX,
    isDeleting,
    measuredHeight,
    onDeleteAnimationEnd,
    width
  ]);

  const openActions = () => {
    didLongPress.current = true;
    if (onRename || onDelete) {
      cardRef.current?.measureInWindow((x, y, width, height) => {
        onOpenActions(scan, scanTitle, { height, width, x, y });
      });
    }
  };

  return (
    <Animated.View
      onLayout={(event) => {
        if (!isDeleting) {
          const nextHeight = event.nativeEvent.layout.height;
          setMeasuredHeight(nextHeight);
          deleteHeight.setValue(nextHeight);
          deleteMarginBottom.setValue(24);
        }
      }}
      style={[
        styles.deletingCardShell,
        {
          marginBottom: isDeleting ? deleteMarginBottom : 24
        },
        isDeleting && { height: deleteHeight }
      ]}
    >
      <Animated.View
        style={{
          opacity: deleteOpacity,
          transform: [{ translateX: deleteTranslateX }]
        }}
      >
        <View ref={cardRef} collapsable={false}>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Long press for scan options"
            disabled={isDeleting}
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
            <ScanCardContent scan={scan} scanTitle={scanTitle} />
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

type ScanCardContentProps = {
  scan: ScanResult;
  scanTitle: string;
};

function ScanCardContent({ scan, scanTitle }: ScanCardContentProps) {
  const { languageCode, t } = useI18n();
  const meta = getRiskMeta(scan.scanSummary.overallRisk, t);
  const riskCount = Math.max(1, scan.dishes.filter((dish) => dish.riskLevel !== "low_risk").length);

  return (
    <>
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
    </>
  );
}

type HistoryContextMenuProps = {
  menu: ScanMenuState | null;
  onClose: () => void;
  onDelete: () => void;
  onRename: () => void;
};

const CONTEXT_MENU_ROW_HEIGHT = 52;
const CONTEXT_MENU_MARGIN = 18;
const CONTEXT_MENU_GAP = 10;
const CONTEXT_MENU_MAX_WIDTH = 220;
const CONTEXT_MENU_MIN_WIDTH = 168;
const CONTEXT_MENU_WIDTH = CONTEXT_MENU_MAX_WIDTH;

function HistoryContextMenu({ menu, onClose, onDelete, onRename }: HistoryContextMenuProps) {
  const { width, height } = useWindowDimensions();
  const { t } = useI18n();
  const isClosing = useRef(false);
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const menuTranslateY = useRef(new Animated.Value(-6)).current;

  useEffect(() => {
    if (!menu) {
      return;
    }

    isClosing.current = false;
    scale.setValue(0.9);
    opacity.setValue(0);
    menuTranslateY.setValue(-6);
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 170,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.timing(scale, {
        duration: 230,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.timing(menuTranslateY, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true
      })
    ]).start();
  }, [menu, menuTranslateY, opacity, scale]);

  const closeWithAnimation = (afterClose?: () => void) => {
    if (isClosing.current) {
      return;
    }

    isClosing.current = true;
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 130,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true
      }),
      Animated.timing(scale, {
        duration: 130,
        easing: Easing.out(Easing.cubic),
        toValue: 0.96,
        useNativeDriver: true
      }),
      Animated.timing(menuTranslateY, {
        duration: 130,
        easing: Easing.out(Easing.cubic),
        toValue: -4,
        useNativeDriver: true
      })
    ]).start(() => {
      afterClose?.();
      onClose();
    });
  };

  if (!menu) {
    return null;
  }

  const menuHeight = CONTEXT_MENU_ROW_HEIGHT * 2 + StyleSheet.hairlineWidth;
  const focusedWidth = Math.min(menu.width + 14, width - CONTEXT_MENU_MARGIN * 2);
  const focusedLeft = Math.min(
    Math.max(CONTEXT_MENU_MARGIN, menu.x - (focusedWidth - menu.width) / 2),
    width - focusedWidth - CONTEXT_MENU_MARGIN
  );
  const opensAbove =
    menu.y + menu.height + CONTEXT_MENU_GAP + menuHeight + CONTEXT_MENU_MARGIN > height;
  const focusedTop = opensAbove
    ? Math.min(
        Math.max(menu.y + 4, menuHeight + CONTEXT_MENU_GAP + CONTEXT_MENU_MARGIN),
        height - menu.height - CONTEXT_MENU_MARGIN
      )
    : Math.min(
        Math.max(CONTEXT_MENU_MARGIN, menu.y - 4),
        height - menu.height - menuHeight - CONTEXT_MENU_GAP - CONTEXT_MENU_MARGIN
      );
  const actionTop = opensAbove
    ? focusedTop - menuHeight - CONTEXT_MENU_GAP
    : focusedTop + menu.height + CONTEXT_MENU_GAP;
  const actionWidth = Math.min(
    CONTEXT_MENU_MAX_WIDTH,
    Math.max(CONTEXT_MENU_MIN_WIDTH, focusedWidth * 0.68)
  );
  const actionLeft = Math.min(focusedLeft + 16, focusedLeft + focusedWidth - actionWidth);

  return (
    <Modal animationType="none" transparent visible onRequestClose={() => closeWithAnimation()}>
      <View style={styles.menuOverlay}>
        <Animated.View style={[styles.menuDimLayer, { opacity }]} />
        <Pressable
          accessibilityLabel="Close scan options"
          accessibilityRole="button"
          onPress={() => closeWithAnimation()}
          style={styles.menuDismissLayer}
        />
        <Animated.View
          style={[
            styles.focusedCard,
            {
              left: focusedLeft,
              opacity,
              top: focusedTop,
              width: focusedWidth,
              transform: [{ scale }]
            }
          ]}
        >
          <ScanCardContent scan={menu.scan} scanTitle={menu.title} />
        </Animated.View>
        <Animated.View
          style={[
            styles.contextMenu,
            {
              left: actionLeft,
              opacity,
              top: actionTop,
              transform: [{ translateY: menuTranslateY }, { scale }],
              width: actionWidth
            }
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => closeWithAnimation(onRename)}
            style={({ pressed }) => [styles.contextMenuRow, pressed && styles.contextMenuRowPressed]}
          >
            <Pencil color={colors.primaryDark} size={17} strokeWidth={2.2} />
            <Text style={styles.contextMenuText}>Rename</Text>
          </Pressable>
          <View style={styles.contextMenuDivider} />
          <Pressable
            accessibilityRole="button"
            onPress={() => closeWithAnimation(onDelete)}
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

type RenameScanDialogProps = {
  dialog: RenameDialogState | null;
  onCancel: () => void;
  onSave: (scan: ScanResult, title: string) => void;
};

type DeleteScanDialogProps = {
  dialog: DeleteDialogState | null;
  onCancel: () => void;
  onConfirm: (scan: ScanResult) => void;
};

function DeleteScanDialog({ dialog, onCancel, onConfirm }: DeleteScanDialogProps) {
  const isClosing = useRef(false);
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!dialog) {
      return;
    }

    isClosing.current = false;
    scale.setValue(0.96);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 130,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.timing(scale, {
        duration: 170,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      })
    ]).start();
  }, [dialog, opacity, scale]);

  const closeWithAnimation = (afterClose?: () => void) => {
    if (isClosing.current) {
      return;
    }

    isClosing.current = true;
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 120,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true
      }),
      Animated.timing(scale, {
        duration: 120,
        easing: Easing.out(Easing.cubic),
        toValue: 0.97,
        useNativeDriver: true
      })
    ]).start(() => {
      afterClose?.();
      onCancel();
    });
  };

  if (!dialog) {
    return null;
  }

  return (
    <Modal animationType="none" transparent visible onRequestClose={() => closeWithAnimation()}>
      <View style={styles.confirmOverlay}>
        <Pressable
          accessibilityLabel="Close delete confirmation"
          accessibilityRole="button"
          onPress={() => closeWithAnimation()}
          style={styles.renameDismissLayer}
        />
        <Animated.View
          style={[
            styles.renameCard,
            {
              opacity,
              transform: [{ scale }]
            }
          ]}
        >
          <View style={styles.confirmContent}>
            <View style={styles.confirmIconWrap}>
              <Trash2 color={colors.avoid} size={19} strokeWidth={2.3} />
            </View>
            <View style={styles.renameHeader}>
              <Text style={styles.renameTitle}>Delete scan?</Text>
              <Text style={styles.renameBody}>
                This removes "{dialog.title}" from your saved scan history on this device.
              </Text>
            </View>
          </View>
          <View style={styles.renameActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => closeWithAnimation()}
              style={({ pressed }) => [styles.renameButton, pressed && styles.renameButtonPressed]}
            >
              <Text style={styles.renameCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => closeWithAnimation(() => onConfirm(dialog.scan))}
              style={({ pressed }) => [
                styles.renameButton,
                styles.deleteConfirmButton,
                pressed && styles.deleteConfirmButtonPressed
              ]}
            >
              <Text style={styles.renameSaveText}>Delete</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function RenameScanDialog({ dialog, onCancel, onSave }: RenameScanDialogProps) {
  const [draftTitle, setDraftTitle] = useState("");
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!dialog) {
      return;
    }

    setDraftTitle(dialog.title);
    scale.setValue(0.96);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 130,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.timing(scale, {
        duration: 170,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      })
    ]).start();
  }, [dialog, opacity, scale]);

  if (!dialog) {
    return null;
  }

  const trimmedTitle = draftTitle.trim();

  return (
    <Modal animationType="none" transparent visible onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.renameOverlay}
      >
        <Pressable
          accessibilityLabel="Close rename scan"
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.renameDismissLayer}
        />
        <Animated.View
          style={[
            styles.renameCard,
            {
              opacity,
              transform: [{ scale }]
            }
          ]}
        >
          <View style={styles.renameHeader}>
            <Text style={styles.renameTitle}>Rename scan</Text>
            <Text style={styles.renameBody}>Give this saved scan a short, recognizable name.</Text>
          </View>
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            onChangeText={setDraftTitle}
            onSubmitEditing={() => {
              if (trimmedTitle) {
                onSave(dialog.scan, trimmedTitle);
              }
            }}
            placeholder="Scan name"
            placeholderTextColor={colors.inkSubtle}
            returnKeyType="done"
            selectTextOnFocus
            style={styles.renameInput}
            value={draftTitle}
          />
          <View style={styles.renameActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [styles.renameButton, pressed && styles.renameButtonPressed]}
            >
              <Text style={styles.renameCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!trimmedTitle}
              onPress={() => onSave(dialog.scan, trimmedTitle)}
              style={({ pressed }) => [
                styles.renameButton,
                styles.renameSaveButton,
                !trimmedTitle && styles.renameSaveButtonDisabled,
                pressed && trimmedTitle && styles.renameSaveButtonPressed
              ]}
            >
              <Text style={styles.renameSaveText}>Save</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
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
    marginBottom: -24
  },
  deletingCardShell: {
    overflow: "hidden"
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
    ...StyleSheet.absoluteFillObject
  },
  menuDimLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(31, 47, 45, 0.20)"
  },
  menuDismissLayer: {
    ...StyleSheet.absoluteFillObject
  },
  focusedCard: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 8,
    gap: 16,
    padding: 24,
    position: "absolute",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.18,
    shadowRadius: 36
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
    shadowRadius: 28
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
  },
  renameOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(31, 47, 45, 0.14)",
    justifyContent: "center",
    padding: 24
  },
  renameDismissLayer: {
    ...StyleSheet.absoluteFillObject
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(31, 47, 45, 0.16)",
    justifyContent: "center",
    padding: 24
  },
  renameCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 18,
    maxWidth: 360,
    padding: 22,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.14,
    shadowRadius: 34,
    width: "100%"
  },
  renameHeader: {
    gap: 6
  },
  confirmContent: {
    gap: 14
  },
  confirmIconWrap: {
    alignItems: "center",
    backgroundColor: colors.avoidSoft,
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  renameTitle: {
    color: colors.primaryDark,
    ...typography.sectionTitle
  },
  renameBody: {
    color: colors.inkMuted,
    ...typography.bodySmall
  },
  renameInput: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.ink,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 0,
    textAlignVertical: "center",
    ...typography.bodyLarge
  },
  renameActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end"
  },
  renameButton: {
    alignItems: "center",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 92,
    paddingHorizontal: 18
  },
  renameButtonPressed: {
    backgroundColor: colors.surfaceWarm
  },
  renameCancelText: {
    color: colors.inkMuted,
    ...typography.label
  },
  renameSaveButton: {
    backgroundColor: colors.primary
  },
  renameSaveButtonDisabled: {
    backgroundColor: colors.disabled
  },
  renameSaveButtonPressed: {
    backgroundColor: colors.primaryHover
  },
  deleteConfirmButton: {
    backgroundColor: colors.avoid
  },
  deleteConfirmButtonPressed: {
    backgroundColor: colors.danger
  },
  renameSaveText: {
    color: colors.textInverse,
    ...typography.label
  }
});
