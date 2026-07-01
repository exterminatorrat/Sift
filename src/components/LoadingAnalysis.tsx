import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScanSearch } from "lucide-react-native";
import { colors } from "../constants/colors";
import { AppTopBar } from "./AppTopBar";

type LoadingAnalysisProps = {
  showTopBar?: boolean;
  onBack?: () => void;
};

export function LoadingAnalysis({ showTopBar = false, onBack }: LoadingAnalysisProps) {
  return (
    <View style={styles.screen}>
      {showTopBar && <AppTopBar showBack onBack={onBack} />}
      <View style={styles.content}>
        <View style={styles.pulseWrap}>
          <View style={styles.ambient} />
          <View style={styles.ripple} />
          <View style={styles.coreOuter}>
            <View style={styles.coreInner}>
              <ScanSearch color={colors.primary} size={30} strokeWidth={1.7} />
            </View>
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>Reading menu{"\n"}ingredients...</Text>
          <Text style={styles.subtitle}>Scanning for traces and hidden{"\n"}aliases</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 142
  },
  pulseWrap: {
    alignItems: "center",
    height: 256,
    justifyContent: "center",
    width: 256
  },
  ambient: {
    backgroundColor: "#E3E2E1",
    borderRadius: 999,
    bottom: 0,
    left: 0,
    opacity: 0.5,
    position: "absolute",
    right: 0,
    top: 0
  },
  ripple: {
    borderColor: "rgba(206,197,188,0.35)",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 32,
    left: 32,
    position: "absolute",
    right: 32,
    top: 32
  },
  coreOuter: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    elevation: 2,
    height: 128,
    justifyContent: "center",
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    width: 128
  },
  coreInner: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 999,
    height: 96,
    justifyContent: "center",
    width: 96
  },
  copy: {
    alignItems: "center",
    gap: 12,
    marginTop: 64
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "300",
    letterSpacing: 0,
    lineHeight: 40,
    textAlign: "center"
  },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 18,
    letterSpacing: 0,
    lineHeight: 30,
    textAlign: "center"
  }
});
