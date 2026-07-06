import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { AppTopBar } from "./AppTopBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "../i18n/I18nProvider";
import { AppLanguageCode } from "../i18n/translations";

type LoadingAnalysisProps = {
  showTopBar?: boolean;
  showBack?: boolean;
  onBack?: () => void;
};

type LoadingPhrase = {
  title: string;
  subtitle: string;
};

const loadingPhrases: Partial<Record<AppLanguageCode, LoadingPhrase[]>> = {
  en: [
    {
      title: "Reading the menu...",
      subtitle: "Pulling out visible dishes and ingredients"
    },
    {
      title: "Tracing hidden risks...",
      subtitle: "Checking sauces, oils, broths, and garnishes"
    },
    {
      title: "Cross-checking your profile...",
      subtitle: "Adjusting risk for severity and cross-contact"
    },
    {
      title: "Preparing staff questions...",
      subtitle: "Turning uncertainty into what to ask next"
    }
  ],
  es: [
    {
      title: "Leyendo el menú...",
      subtitle: "Buscando platos e ingredientes visibles"
    },
    {
      title: "Rastreando riesgos ocultos...",
      subtitle: "Revisando salsas, aceites, caldos y guarniciones"
    },
    {
      title: "Comparando con tu perfil...",
      subtitle: "Ajustando el riesgo por gravedad y contacto cruzado"
    },
    {
      title: "Preparando preguntas...",
      subtitle: "Convirtiendo la duda en qué preguntar"
    }
  ],
  fr: [
    {
      title: "Lecture du menu...",
      subtitle: "Repérage des plats et ingrédients visibles"
    },
    {
      title: "Recherche de risques cachés...",
      subtitle: "Sauces, huiles, bouillons et garnitures"
    },
    {
      title: "Vérification du profil...",
      subtitle: "Ajustement selon la gravité et le contact croisé"
    },
    {
      title: "Préparation des questions...",
      subtitle: "Transformer l’incertitude en questions utiles"
    }
  ],
  ja: [
    {
      title: "メニューを読んでいます...",
      subtitle: "料理名と見える材料を確認しています"
    },
    {
      title: "隠れたリスクを確認中...",
      subtitle: "ソース、油、だし、付け合わせを見ています"
    },
    {
      title: "プロフィールと照合中...",
      subtitle: "重症度と交差接触を考慮しています"
    },
    {
      title: "質問を準備中...",
      subtitle: "スタッフに確認する内容を整理しています"
    }
  ]
};

export function LoadingAnalysis({ showTopBar = false, showBack = false, onBack }: LoadingAnalysisProps) {
  const { languageCode, t } = useI18n();
  const phrases = loadingPhrases[languageCode] ?? loadingPhrases.en!;
  const [phraseIndex, setPhraseIndex] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;
  const copyIn = useRef(new Animated.Value(0)).current;
  const scanProgress = useRef(new Animated.Value(0)).current;

  const phrase = phrases[phraseIndex % phrases.length];

  useEffect(() => {
    Animated.timing(copyIn, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 1450,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          duration: 1450,
          easing: Easing.inOut(Easing.cubic),
          toValue: 0,
          useNativeDriver: true
        })
      ])
    );
    loop.start();

    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanProgress, {
          duration: 1800,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.timing(scanProgress, {
          duration: 1800,
          easing: Easing.inOut(Easing.cubic),
          toValue: 0,
          useNativeDriver: true
        })
      ])
    );
    scanLoop.start();

    return () => {
      loop.stop();
      scanLoop.stop();
    };
  }, [copyIn, pulse, scanProgress]);

  useEffect(() => {
    if (phrases.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      Animated.timing(copyIn, {
        duration: 150,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true
      }).start(() => {
        setPhraseIndex((current) => (current + 1) % phrases.length);
        Animated.timing(copyIn, {
          duration: 260,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true
        }).start();
      });
    }, 1750);

    return () => clearInterval(interval);
  }, [copyIn, phrases.length]);

  const scanTranslateY = scanProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-84, 84]
  });
  const markerScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.86, 1.12]
  });
  const copyTranslateY = copyIn.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0]
  });

  return (
    <SafeAreaView style={styles.screen}>
      {showTopBar && <AppTopBar showBack={showBack} onBack={onBack} />}
      <View style={styles.content}>
        <View style={styles.pulseWrap}>
          <View style={styles.scanStage}>
            <View style={styles.menuSheet}>
              <Animated.View
                style={[
                  styles.scanBand,
                  {
                    transform: [{ translateY: scanTranslateY }]
                  }
                ]}
              />
              <View style={styles.menuLineStrong} />
              <View style={styles.menuLine} />
              <View style={[styles.menuLine, styles.menuLineMedium]} />
              <View style={styles.menuLine} />
              <View style={[styles.menuLine, styles.menuLineShort]} />
              <View style={styles.menuDivider} />
              <View style={styles.menuRow}>
                <View style={styles.menuDot} />
                <View style={styles.menuLineSmall} />
              </View>
              <View style={styles.menuRow}>
                <Animated.View style={[styles.riskMarker, { transform: [{ scale: markerScale }] }]} />
                <View style={styles.menuLineSmall} />
              </View>
              <View style={styles.menuRow}>
                <View style={styles.menuDotMuted} />
                <View style={[styles.menuLineSmall, styles.menuLineTiny]} />
              </View>
            </View>
          </View>
        </View>

        <Animated.View
          style={[
            styles.copy,
            {
              opacity: copyIn,
              transform: [{ translateY: copyTranslateY }]
            }
          ]}
        >
          <Text style={styles.title}>{phrase.title || t("analysis.title")}</Text>
          <Text style={styles.subtitle}>{phrase.subtitle || t("analysis.subtitle")}</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
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
    paddingTop: 56,
    justifyContent: "flex-start"
  },
  pulseWrap: {
    alignItems: "center",
    height: 228,
    justifyContent: "center",
    width: 228
  },
  scanStage: {
    alignItems: "center",
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    height: 170,
    justifyContent: "center",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.07,
    shadowRadius: 28,
    width: 132
  },
  menuSheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    height: 132,
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 18,
    width: 96
  },
  scanBand: {
    backgroundColor: colors.primarySoft,
    bottom: 0,
    height: 26,
    left: 0,
    opacity: 0.9,
    position: "absolute",
    right: 0
  },
  menuLineStrong: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 5,
    marginBottom: 12,
    width: 38
  },
  menuLine: {
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 4,
    marginBottom: 8,
    opacity: 0.75,
    width: 58
  },
  menuLineMedium: {
    width: 46
  },
  menuLineShort: {
    width: 36
  },
  menuDivider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginBottom: 9,
    marginTop: 3,
    width: "100%"
  },
  menuRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 5
  },
  menuDot: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 999,
    height: 7,
    width: 7
  },
  menuDotMuted: {
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 7,
    width: 7
  },
  riskMarker: {
    backgroundColor: colors.ask,
    borderRadius: 999,
    height: 8,
    width: 8
  },
  menuLineSmall: {
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 3,
    opacity: 0.7,
    width: 42
  },
  menuLineTiny: {
    width: 30
  },
  copy: {
    alignItems: "center",
    gap: 12,
    marginTop: 64,
    width: "100%"
  },
  title: {
    color: colors.ink,
    ...typography.title,
    minHeight: 72,
    maxWidth: 300,
    textAlign: "center"
  },
  subtitle: {
    color: colors.inkMuted,
    ...typography.bodyLarge,
    minHeight: 52,
    maxWidth: 300,
    textAlign: "center"
  }
});
