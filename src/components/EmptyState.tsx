import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LucideIcon } from "lucide-react-native";
import { colors } from "../constants/colors";
import { PrimaryButton } from "./PrimaryButton";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon: Icon, title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon color={colors.primary} size={22} strokeWidth={2.1} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction && (
        <PrimaryButton label={actionLabel} onPress={onAction} tone="secondary" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 32
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  title: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center"
  },
  body: {
    color: colors.inkMuted,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 21,
    textAlign: "center"
  }
});
