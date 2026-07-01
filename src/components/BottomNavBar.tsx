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
      <Icon color={active ? colors.low : colors.inkMuted} size={21} strokeWidth={2.2} />
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0
  },
  inner: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 10,
    paddingHorizontal: 20,
    paddingTop: 8
  },
  item: {
    alignItems: "center",
    borderRadius: 16,
    gap: 2,
    minHeight: 54,
    minWidth: 82,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  itemActive: {
    backgroundColor: colors.lowSoft
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
    color: colors.low
  }
});
