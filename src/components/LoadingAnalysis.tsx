import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { FileSearch, ListChecks, MessageCircleQuestion, ScanSearch, ShieldAlert } from "lucide-react-native";
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

const MENU_SHEET_HEIGHT = 154;
const loadingIcons = [FileSearch, ShieldAlert, ScanSearch, MessageCircleQuestion, ListChecks];

export function LoadingAnalysis({ showTopBar = false, showBack = false, onBack }: LoadingAnalysisProps) {
  const { languageCode, t } = useI18n();
  const phrases = loadingPhrases[languageCode] ?? loadingPhrases.en!;
  const [phraseIndex, setPhraseIndex] = useState(0);
  const copyIn = useRef(new Animated.Value(0)).current;
  const scanProgress = useRef(new Animated.Value(0)).current;
  const sheetIn = useRef(new Animated.Value(0)).current;

  const phrase = phrases[phraseIndex % phrases.length];
  const ActiveLoadingIcon = loadingIcons[phraseIndex % loadingIcons.length];

  useEffect(() => {
    Animated.timing(sheetIn, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true
    }).start();

    Animated.timing(copyIn, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true
    }).start();

    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanProgress, {
          duration: 1,
          easing: Easing.linear,
          toValue: 0,
          useNativeDriver: true
        }),
        Animated.timing(scanProgress, {
          duration: 2600,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.delay(360)
      ])
    );
    scanLoop.start();

    return () => {
      scanLoop.stop();
    };
  }, [copyIn, scanProgress, sheetIn]);

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
    }, 2900);

    return () => clearInterval(interval);
  }, [copyIn, phrases.length]);

  const scanTranslateY = scanProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, MENU_SHEET_HEIGHT + 18]
  });
  const sheetScale = sheetIn.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1]
  });
  const sheetTranslateY = sheetIn.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0]
  });
  const iconTranslateY = scanProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -5, 0]
  });
  const iconRotate = scanProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["-2deg", "2deg", "-2deg"]
  });
  const iconScale = copyIn.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1]
  });
  const copyTranslateY = copyIn.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0]
  });
  const beamOpacity = scanProgress.interpolate({
    inputRange: [0, 0.08, 0.92, 1],
    outputRange: [0, 1, 1, 0],
    extrapolate: "clamp"
  });
  const firstHighlightOpacity = scanProgress.interpolate({
    inputRange: [0, 0.18, 0.28, 1],
    outputRange: [0, 0, 1, 1],
    extrapolate: "clamp"
  });
  const secondHighlightOpacity = scanProgress.interpolate({
    inputRange: [0, 0.44, 0.54, 1],
    outputRange: [0, 0, 1, 1],
    extrapolate: "clamp"
  });
  const thirdHighlightOpacity = scanProgress.interpolate({
    inputRange: [0, 0.66, 0.76, 1],
    outputRange: [0, 0, 1, 1],
    extrapolate: "clamp"
  });
  const markerScale = scanProgress.interpolate({
    inputRange: [0, 0.2, 0.34, 0.56, 0.7, 1],
    outputRange: [0.86, 0.86, 1.05, 1.05, 1, 1],
    extrapolate: "clamp"
  });
  const firstRowTranslateX = firstHighlightOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 0]
  });
  const secondRowTranslateX = secondHighlightOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 0]
  });
  const thirdRowTranslateX = thirdHighlightOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 0]
  });

  return (
    <SafeAreaView style={styles.screen}>
      {showTopBar && <AppTopBar showBack={showBack} onBack={onBack} />}
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.loaderWrap,
            {
              opacity: sheetIn,
              transform: [{ translateY: sheetTranslateY }, { scale: sheetScale }]
            }
          ]}
        >
          <View style={styles.scanStage}>
            <Animated.View
              style={[
                styles.iconBadge,
                {
                  opacity: copyIn,
                  transform: [{ translateY: iconTranslateY }, { rotate: iconRotate }, { scale: iconScale }]
                }
              ]}
            >
              <ActiveLoadingIcon color={colors.primaryDark} size={28} strokeWidth={1.9} />
            </Animated.View>
            <View style={styles.menuSheet}>
              <Animated.View
                style={[
                  styles.scanWash,
                  {
                    opacity: beamOpacity,
                    transform: [{ translateY: scanTranslateY }]
                  }
                ]}
              />
              <Animated.View
                style={[
                  styles.scanBeam,
                  {
                    opacity: beamOpacity,
                    transform: [{ translateY: scanTranslateY }]
                  }
                ]}
              />
              <View style={styles.menuHeaderLine} />
              <View style={styles.menuLine} />
              <View style={[styles.menuLine, styles.menuLineMedium]} />
              <View style={styles.menuDivider} />
              <View style={styles.menuRow}>
                <View style={styles.menuTextGroup}>
                  <View style={styles.menuLineSmall} />
                  <View style={[styles.menuLineTiny, styles.menuLineMuted]} />
                </View>
                <Animated.View
                  style={[
                    styles.riskMark,
                    styles.riskMarkAsk,
                    { opacity: firstHighlightOpacity, transform: [{ translateX: firstRowTranslateX }, { scale: markerScale }] }
                  ]}
                />
              </View>
              <View style={styles.menuRow}>
                <View style={styles.menuTextGroup}>
                  <View style={[styles.menuLineSmall, styles.menuLineWide]} />
                  <View style={[styles.menuLineTiny, styles.menuLineMuted]} />
                </View>
                <Animated.View
                  style={[
                    styles.riskMark,
                    styles.riskMarkHigh,
                    { opacity: secondHighlightOpacity, transform: [{ translateX: secondRowTranslateX }, { scale: markerScale }] }
                  ]}
                />
              </View>
              <View style={styles.menuRow}>
                <View style={styles.menuTextGroup}>
                  <View style={[styles.menuLineSmall, styles.menuLineShort]} />
                  <View style={[styles.menuLineTiny, styles.menuLineMuted]} />
                </View>
                <Animated.View
                  style={[
                    styles.riskMark,
                    styles.riskMarkLow,
                    { opacity: thirdHighlightOpacity, transform: [{ translateX: thirdRowTranslateX }, { scale: markerScale }] }
                  ]}
                />
              </View>
            </View>
          </View>
        </Animated.View>

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
  loaderWrap: {
    alignItems: "center",
    height: 228,
    justifyContent: "center",
    width: 228
  },
  scanStage: {
    alignItems: "center",
    backgroundColor: "#FFF4E6",
    borderColor: colors.borderSoft,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    height: 196,
    justifyContent: "center",
    position: "relative",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.07,
    shadowRadius: 28,
    width: 148
  },
  iconBadge: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 56,
    justifyContent: "center",
    position: "absolute",
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    top: -18,
    width: 56,
    zIndex: 2
  },
  menuSheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    height: MENU_SHEET_HEIGHT,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingTop: 18,
    width: 104
  },
  scanWash: {
    backgroundColor: "rgba(31, 138, 131, 0.11)",
    height: 34,
    left: 0,
    position: "absolute",
    right: 0
  },
  scanBeam: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 2,
    left: 10,
    position: "absolute",
    right: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 6
  },
  menuHeaderLine: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 5,
    marginBottom: 13,
    width: 42
  },
  menuLine: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 4,
    marginBottom: 8,
    width: 66
  },
  menuLineMedium: {
    width: 52
  },
  menuDivider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginBottom: 12,
    marginTop: 7,
    width: "100%"
  },
  menuRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  menuTextGroup: {
    gap: 5
  },
  menuLineSmall: {
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 4,
    opacity: 0.55,
    width: 42
  },
  menuLineTiny: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 3,
    width: 30
  },
  menuLineWide: {
    width: 50
  },
  menuLineShort: {
    width: 34
  },
  menuLineMuted: {
    opacity: 0.85
  },
  riskMark: {
    borderRadius: 999,
    height: 9,
    width: 9
  },
  riskMarkAsk: {
    backgroundColor: colors.ask
  },
  riskMarkHigh: {
    backgroundColor: colors.high
  },
  riskMarkLow: {
    backgroundColor: colors.low
  },
  copy: {
    alignItems: "center",
    gap: 12,
    marginTop: 56,
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
