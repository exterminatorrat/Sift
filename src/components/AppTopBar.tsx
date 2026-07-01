import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft, Menu } from "lucide-react-native";
import { colors } from "../constants/colors";

type AppTopBarProps = {
  showBack?: boolean;
  showMenu?: boolean;
  onBack?: () => void;
  onMenu?: () => void;
};

export function AppTopBar({ showBack, showMenu, onBack, onMenu }: AppTopBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {showBack && (
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={onBack}
            style={styles.iconButton}
          >
            <ChevronLeft color={colors.primaryDark} size={24} strokeWidth={2.1} />
          </Pressable>
        )}
      </View>
      <Text style={styles.brand}>Sift</Text>
      <View style={styles.side}>
        {showMenu && (
          <Pressable
            accessibilityLabel="Open settings"
            accessibilityRole="button"
            onPress={onMenu}
            style={styles.iconButton}
          >
            <Menu color={colors.primaryDark} size={22} strokeWidth={2.1} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: "center",
    backgroundColor: "rgba(250,249,248,0.88)",
    flexDirection: "row",
    height: 64,
    justifyContent: "space-between",
    paddingHorizontal: 24
  },
  side: {
    alignItems: "flex-start",
    width: 40
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  brand: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 32
  }
});
