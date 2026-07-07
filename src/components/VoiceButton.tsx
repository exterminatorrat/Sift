import React, { useEffect, useRef, useState } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Volume2, VolumeX } from "lucide-react-native";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { AppLanguageCode } from "../i18n/translations";
import { speakText, stopSpeech } from "../services/speechService";
import { AnimatedPressable } from "./AnimatedPressable";

type VoiceButtonProps = {
  fallbackLanguageCode?: AppLanguageCode;
  iconOnly?: boolean;
  label: string;
  languageHint?: string | null;
  stopLabel: string;
  style?: StyleProp<ViewStyle>;
  text: string;
  unavailableLabel: string;
};

export function VoiceButton({
  fallbackLanguageCode = "en",
  iconOnly = false,
  label,
  languageHint,
  stopLabel,
  style,
  text,
  unavailableLabel
}: VoiceButtonProps) {
  const [playing, setPlaying] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const playingRef = useRef(false);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => () => {
    if (playingRef.current) {
      void stopSpeech();
    }
  }, []);

  const handlePress = async () => {
    if (playing) {
      try {
        await stopSpeech();
      } finally {
        setPlaying(false);
      }
      return;
    }

    try {
      setErrorVisible(false);
      setPlaying(true);
      await speakText({
        fallbackLanguageCode,
        languageHint,
        onDone: () => setPlaying(false),
        onError: () => {
          setPlaying(false);
          setErrorVisible(true);
        },
        onStopped: () => setPlaying(false),
        text
      });
    } catch {
      setPlaying(false);
      setErrorVisible(true);
    }
  };

  const Icon = playing ? VolumeX : Volume2;

  return (
    <View style={[styles.wrap, style]}>
      <AnimatedPressable
        accessibilityLabel={playing ? stopLabel : label}
        accessibilityRole="button"
        disabled={!text.trim()}
        onPress={() => {
          void handlePress();
        }}
        scaleTo={0.94}
        style={[
          styles.button,
          iconOnly && styles.iconButton,
          playing && styles.buttonActive,
          !text.trim() && styles.buttonDisabled
        ]}
      >
        <Icon color={playing ? colors.textInverse : colors.primaryDark} size={16} strokeWidth={2.2} />
        {!iconOnly && (
          <Text style={[styles.buttonText, playing && styles.buttonTextActive]}>
            {playing ? stopLabel : label}
          </Text>
        )}
      </AnimatedPressable>
      {errorVisible && <Text style={styles.errorText}>{unavailableLabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-start",
    gap: 7
  },
  button: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 13
  },
  iconButton: {
    height: 38,
    paddingHorizontal: 0,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    width: 38
  },
  buttonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonText: {
    color: colors.primaryDark,
    ...typography.badge
  },
  buttonTextActive: {
    color: colors.textInverse
  },
  errorText: {
    color: colors.inkSubtle,
    ...typography.caption
  }
});
