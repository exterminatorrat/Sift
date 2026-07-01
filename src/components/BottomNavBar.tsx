import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { History, Home, UserRound } from "lucide-react-native";
import { colors } from "../constants/colors";

type BottomNavBarProps = {
  active: "home" | "history" | "profile";
  onHome: () => void;
  onHistory: () => void;
  onProfile: () => void;
};

export function BottomNavBar({ active, onHome, onHistory, onProfile }: BottomNavBarProps) {
  return (
    <View style={styles.shell}>
      <View style={styles.inner}>
        <NavItem
          active={active === "home"}
          icon={Home}
          label="Home"
          onPress={onHome}
        />
        <NavItem
          active={active === "history"}
          icon={History}
          label="History"
          onPress={onHistory}
        />
        <NavItem
          active={active === "profile"}
          icon={UserRound}
          label="Profile"
          onPress={onProfile}
        />
      </View>
    </View>
  );
}

type NavItemProps = {
  active: boolean;
  icon: typeof Home;
  label: string;
  onPress: () => void;
};

function NavItem({ active, icon: Icon, label, onPress }: NavItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        active && styles.itemActive,
        pressed && styles.itemPressed
      ]}
    >
      <Icon color={active ? colors.primaryDark : colors.inkMuted} size={21} strokeWidth={2.2} />
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    bottom: 18,
    left: 16,
    position: "absolute",
    right: 16
  },
  inner: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 10,
    flexDirection: "row",
    justifyContent: "space-around",
    minHeight: 68,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18
  },
  item: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    gap: 2,
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  itemActive: {
    backgroundColor: colors.primarySoft
  },
  itemPressed: {
    opacity: 0.75
  },
  label: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0
  },
  labelActive: {
    color: colors.primaryDark
  }
});
