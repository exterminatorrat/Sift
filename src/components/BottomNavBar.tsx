import React, { useState } from "react";
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
  const activeIndex = active === "home" ? 0 : active === "history" ? 1 : 2;
  const [barWidth, setBarWidth] = useState(0);
  const tabWidth = barWidth > 0 ? (barWidth - 16) / 3 : 0;
  const translateX = tabWidth * activeIndex;

  return (
    <View style={styles.shell}>
      <View style={styles.inner} onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}>
        {tabWidth > 0 && (
          <View
            pointerEvents="none"
            style={[
              styles.activeTrack,
              {
                transform: [{ translateX }],
                width: tabWidth
              }
            ]}
          />
        )}
        <NavItem active={active === "home"} icon={Home} label="Home" onPress={onHome} />
        <NavItem active={active === "history"} icon={History} label="History" onPress={onHistory} />
        <NavItem active={active === "profile"} icon={UserRound} label="Profile" onPress={onProfile} />
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
      <Icon color={active ? colors.surface : colors.inkSubtle} size={21} strokeWidth={2.4} />
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    bottom: 18,
    left: 12,
    position: "absolute",
    right: 12
  },
  inner: {
    backgroundColor: colors.surface,
    borderColor: "rgba(68,65,61,0.08)",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 14,
    flexDirection: "row",
    justifyContent: "space-around",
    minHeight: 68,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 7,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 22
  },
  item: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    gap: 2,
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: 4,
    zIndex: 2
  },
  itemActive: {
    backgroundColor: "transparent"
  },
  itemPressed: {
    opacity: 0.75
  },
  activeTrack: {
    backgroundColor: colors.primaryDark,
    borderRadius: 999,
    bottom: 7,
    elevation: 3,
    left: 8,
    position: "absolute",
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    top: 7,
    zIndex: 1
  },
  label: {
    color: colors.inkSubtle,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0,
    lineHeight: 14
  },
  labelActive: {
    color: colors.surface,
    fontWeight: "800"
  }
});
