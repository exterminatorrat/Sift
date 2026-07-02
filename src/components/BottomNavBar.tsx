import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { History, Home, UserRound } from "lucide-react-native";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { useI18n } from "../i18n/I18nProvider";

let lastActiveIndex = 0;

type BottomNavBarProps = {
  active: "home" | "history" | "profile";
  onHome: () => void;
  onHistory: () => void;
  onProfile: () => void;
};

export function BottomNavBar({ active, onHome, onHistory, onProfile }: BottomNavBarProps) {
  const { t } = useI18n();
  const activeIndex = active === "home" ? 0 : active === "history" ? 1 : 2;
  const [barWidth, setBarWidth] = useState(0);
  const slide = useRef(new Animated.Value(lastActiveIndex)).current;
  const tabWidth = barWidth > 0 ? (barWidth - 16) / 3 : 0;

  useEffect(() => {
    Animated.timing(slide, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
      toValue: activeIndex,
      useNativeDriver: true
    }).start(() => {
      lastActiveIndex = activeIndex;
    });
  }, [activeIndex, slide]);

  const translateX = slide.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, tabWidth, tabWidth * 2]
  });

  return (
    <View style={styles.shell}>
      <View style={styles.inner} onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}>
        {tabWidth > 0 && (
          <Animated.View
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
        <NavItem active={active === "home"} icon={Home} label={t("nav.home")} onPress={onHome} />
        <NavItem active={active === "history"} icon={History} label={t("nav.history")} onPress={onHistory} />
        <NavItem active={active === "profile"} icon={UserRound} label={t("nav.profile")} onPress={onProfile} />
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
  const pressScale = useRef(new Animated.Value(1)).current;

  const animatePress = (toValue: number) => {
    Animated.timing(pressScale, {
      duration: toValue < 1 ? 80 : 140,
      easing: Easing.out(Easing.cubic),
      toValue,
      useNativeDriver: true
    }).start();
  };

  return (
    <Animated.View style={[styles.itemShell, { transform: [{ scale: pressScale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={onPress}
        onPressIn={() => animatePress(0.96)}
        onPressOut={() => animatePress(1)}
        style={({ pressed }) => [
          styles.item,
          active && styles.itemActive,
          pressed && styles.itemPressed
        ]}
      >
        <Icon color={active ? colors.textInverse : colors.inkSubtle} size={21} strokeWidth={2.4} />
        <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
      </Pressable>
    </Animated.View>
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
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 14,
    flexDirection: "row",
    justifyContent: "space-around",
    minHeight: 68,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 7,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 22
  },
  item: {
    alignItems: "center",
    borderRadius: 999,
    gap: 2,
    height: "100%",
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: 4,
    width: "100%"
  },
  itemShell: {
    flex: 1,
    zIndex: 2
  },
  itemActive: {
    backgroundColor: "transparent"
  },
  itemPressed: {
    opacity: 0.75
  },
  activeTrack: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    bottom: 7,
    elevation: 3,
    left: 8,
    position: "absolute",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    top: 7,
    zIndex: 1
  },
  label: {
    color: colors.inkSubtle,
    ...typography.nav
  },
  labelActive: {
    color: colors.textInverse,
    fontFamily: typography.nav.fontFamily,
    fontWeight: "600"
  }
});
