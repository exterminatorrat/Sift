import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
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
        <NavItem active={active === "home"} icon={Home} onPress={onHome} />
        <NavItem active={active === "history"} icon={History} onPress={onHistory} />
        <NavItem active={active === "profile"} icon={UserRound} onPress={onProfile} />
      </View>
    </View>
  );
}

type NavItemProps = {
  active: boolean;
  icon: typeof Home;
  onPress: () => void;
};

function NavItem({ active, icon: Icon, onPress }: NavItemProps) {
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
      <Icon color={active ? colors.primaryDark : colors.inkSubtle} size={21} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0
  },
  inner: {
    backgroundColor: "rgba(250,249,248,0.94)",
    borderColor: "rgba(68,65,61,0.05)",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    flexDirection: "row",
    justifyContent: "space-around",
    minHeight: 74,
    paddingHorizontal: 44,
    paddingBottom: 24,
    paddingTop: 8,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  item: {
    alignItems: "center",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  itemActive: {
    backgroundColor: "rgba(233,222,210,0.18)"
  },
  itemPressed: {
    opacity: 0.75
  }
});
