import React from "react";
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { LucideIcon } from "lucide-react-native";
import { colors } from "../constants/colors";

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
  const iconColor = isPrimary ? "#F5F1EC" : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
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
    backgroundColor: colors.surface,
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
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0
  },
  primaryLabel: {
    color: "#F5F1EC"
  },
  secondaryLabel: {
    color: colors.primary
  }
});
