import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/colors";

export function LoadingAnalysis() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.title}>Reading menu...</Text>
      <Text style={styles.line}>Checking visible ingredients.</Text>
      <Text style={styles.line}>Looking for hidden-risk patterns.</Text>
      <Text style={styles.line}>Preparing questions to ask staff.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 18,
    marginTop: 22
  },
  line: {
    color: colors.inkMuted,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 24,
    textAlign: "center"
  }
});
