import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { LucideIcon } from "lucide-react-native";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";

type ButtonTone = "primary" | "secondary" | "quiet";

type PrimaryButtonProps = {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  icon?: LucideIcon;
  tone?: ButtonTone;
  disabled?: boolean;
  loading?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  icon: Icon,
  tone = "primary",
  disabled = false,
  loading = false
}: PrimaryButtonProps) {
  const isPrimary = tone === "primary";
  const iconColor = isPrimary ? colors.textInverse : colors.primary;
  const pressScale = useRef(new Animated.Value(1)).current;

  const animatePress = (toValue: number) => {
    Animated.timing(pressScale, {
      duration: toValue < 1 ? 90 : 140,
      easing: Easing.out(Easing.cubic),
      toValue,
      useNativeDriver: true
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled || loading}
        onPress={onPress}
        onPressIn={() => animatePress(0.975)}
        onPressOut={() => animatePress(1)}
        style={({ pressed }) => [
          styles.button,
          tone === "primary" && styles.primary,
          tone === "secondary" && styles.secondary,
          tone === "quiet" && styles.quiet,
          (pressed || disabled) && styles.pressed
        ]}
      >
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color={iconColor} />
          ) : (
            Icon && <Icon color={iconColor} size={18} strokeWidth={2.2} />
          )}
          <Text style={[styles.label, isPrimary ? styles.primaryLabel : styles.secondaryLabel]}>
            {label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 18
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center"
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderWidth: 1
  },
  quiet: {
    backgroundColor: "transparent"
  },
  pressed: {
    opacity: 0.76
  },
  label: {
    ...typography.button
  },
  primaryLabel: {
    color: colors.textInverse
  },
  secondaryLabel: {
    color: colors.primary
  }
});
