import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { FileSearch, ListChecks, MessageCircleQuestion, ScanSearch, ShieldAlert } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppTopBar } from "./AppTopBar";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { useI18n } from "../i18n/I18nProvider";
import { AppLanguageCode } from "../i18n/translations";

type LoadingAnalysisProps = {
  imageUri?: string | null;
  showTopBar?: boolean;
  showBack?: boolean;
  onBack?: () => void;
};

type LoadingPhrase = {
  title: string;
  subtitle: string;
};

const PHOTO_HEIGHT = 304;
const SCAN_DURATION_MS = 3400;
const LOOP_PAUSE_MS = 360;
const PHRASE_INTERVAL_MS = SCAN_DURATION_MS + LOOP_PAUSE_MS;

const englishPhrases: LoadingPhrase[] = [
  { title: "Reading the menu...", subtitle: "Pulling out visible dishes and ingredients" },
  { title: "Tracing hidden risks...", subtitle: "Checking sauces, oils, broths, batters, and garnishes" },
  { title: "Cross-checking your profile...", subtitle: "Adjusting risk for severity and cross-contact" },
  { title: "Preparing staff questions...", subtitle: "Turning uncertainty into what to ask next" }
];

const loadingPhrases: Partial<Record<AppLanguageCode, LoadingPhrase[]>> = {
  en: englishPhrases,
  es: [
    { title: "Leyendo el menu...", subtitle: "Buscando platos e ingredientes visibles" },
    { title: "Rastreando riesgos ocultos...", subtitle: "Revisando salsas, aceites, caldos, masas y guarniciones" },
    { title: "Comparando con tu perfil...", subtitle: "Ajustando el riesgo por gravedad y contacto cruzado" },
    { title: "Preparando preguntas...", subtitle: "Convirtiendo la incertidumbre en preguntas utiles" }
  ],
  fr: [
    { title: "Lecture du menu...", subtitle: "Reperage des plats et ingredients visibles" },
    { title: "Recherche de risques caches...", subtitle: "Verification des sauces, huiles, bouillons, pates et garnitures" },
    { title: "Verification du profil...", subtitle: "Ajustement selon la gravite et le contact croise" },
    { title: "Preparation des questions...", subtitle: "Transformer l'incertitude en questions utiles" }
  ],
  it: [
    { title: "Lettura del menu...", subtitle: "Estrazione di piatti e ingredienti visibili" },
    { title: "Tracciamento dei rischi nascosti...", subtitle: "Controllo di salse, oli, brodi, pastelle e guarnizioni" },
    { title: "Confronto con il tuo profilo...", subtitle: "Regolazione del rischio per gravita e contatto incrociato" },
    { title: "Preparazione delle domande...", subtitle: "Trasformare l'incertezza in cosa chiedere" }
  ],
  de: [
    { title: "Speisekarte wird gelesen...", subtitle: "Sichtbare Gerichte und Zutaten werden erkannt" },
    { title: "Versteckte Risiken werden gepruft...", subtitle: "Saucen, Ole, Bruhen, Teige und Garnituren" },
    { title: "Profil wird abgeglichen...", subtitle: "Risiko nach Schweregrad und Kreuzkontakt" },
    { title: "Fragen werden vorbereitet...", subtitle: "Aus Unsicherheit werden konkrete Fragen" }
  ],
  pt: [
    { title: "Lendo o cardapio...", subtitle: "Extraindo pratos e ingredientes visiveis" },
    { title: "Rastreando riscos ocultos...", subtitle: "Verificando molhos, oleos, caldos, massas e guarnicoes" },
    { title: "Comparando com seu perfil...", subtitle: "Ajustando risco por gravidade e contato cruzado" },
    { title: "Preparando perguntas...", subtitle: "Transformando incertezas em perguntas uteis" }
  ]
};

const processChipLabels: Partial<Record<AppLanguageCode, string[]>> = {
  en: ["Visible text", "Hidden ingredients", "Cross-contact", "Staff questions"],
  es: ["Texto visible", "Ingredientes ocultos", "Contacto cruzado", "Preguntas"],
  fr: ["Texte visible", "Ingredients caches", "Contact croise", "Questions"],
  it: ["Testo visibile", "Ingredienti nascosti", "Contatto incrociato", "Domande"],
  de: ["Sichtbarer Text", "Versteckte Zutaten", "Kreuzkontakt", "Fragen"],
  pt: ["Texto visivel", "Ingredientes ocultos", "Contato cruzado", "Perguntas"]
};

const loadingIcons = [FileSearch, ShieldAlert, ScanSearch, MessageCircleQuestion, ListChecks];

function chipOpacity(progress: Animated.Value, index: number) {
  const start = 0.18 + index * 0.16;
  return progress.interpolate({
    inputRange: [0, start, start + 0.08, 1],
    outputRange: [0, 0, 1, 1],
    extrapolate: "clamp"
  });
}

function stripOpacity(progress: Animated.Value, index: number) {
  const start = 0.14 + index * 0.2;
  return progress.interpolate({
    inputRange: [0, start, start + 0.1, 0.94, 1],
    outputRange: [0, 0, 1, 1, 0],
    extrapolate: "clamp"
  });
}

export function LoadingAnalysis({ imageUri, showTopBar = false, showBack = false, onBack }: LoadingAnalysisProps) {
  const { languageCode } = useI18n();
  const phrases = loadingPhrases[languageCode] ?? englishPhrases;
  const chips = processChipLabels[languageCode] ?? processChipLabels.en!;
  const [phraseIndex, setPhraseIndex] = useState(0);
  const copyIn = useRef(new Animated.Value(0)).current;
  const stageIn = useRef(new Animated.Value(0)).current;
  const scanProgress = useRef(new Animated.Value(0)).current;

  const phrase = phrases[phraseIndex % phrases.length];
  const ActiveLoadingIcon = loadingIcons[phraseIndex % loadingIcons.length];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(stageIn, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.timing(copyIn, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      })
    ]).start();

    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanProgress, {
          duration: 1,
          easing: Easing.linear,
          toValue: 0,
          useNativeDriver: true
        }),
        Animated.timing(scanProgress, {
          duration: SCAN_DURATION_MS,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.delay(LOOP_PAUSE_MS)
      ])
    );

    scanLoop.start();

    return () => {
      scanLoop.stop();
    };
  }, [copyIn, scanProgress, stageIn]);

  useEffect(() => {
    if (phrases.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      Animated.timing(copyIn, {
        duration: 140,
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
    }, PHRASE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [copyIn, phrases.length]);

  const scanTranslateY = scanProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-68, PHOTO_HEIGHT + 34]
  });
  const stageScale = stageIn.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1]
  });
  const stageTranslateY = stageIn.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0]
  });
  const copyTranslateY = copyIn.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0]
  });
  const beamOpacity = scanProgress.interpolate({
    inputRange: [0, 0.06, 0.94, 1],
    outputRange: [0, 1, 1, 0],
    extrapolate: "clamp"
  });
  const iconTranslateY = scanProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -4, 0]
  });
  const iconRotate = scanProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["-2deg", "2deg", "-2deg"]
  });
  const stripTranslateY = scanProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [10, -12],
    extrapolate: "clamp"
  });

  return (
    <SafeAreaView style={styles.screen}>
      {showTopBar && <AppTopBar showBack={showBack} onBack={onBack} />}
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.loaderWrap,
            {
              opacity: stageIn,
              transform: [{ translateY: stageTranslateY }, { scale: stageScale }]
            }
          ]}
        >
          <View style={styles.photoFrame}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.menuPhoto} resizeMode="cover" />
            ) : (
              <View style={styles.photoFallback}>
                <View style={styles.fallbackLinePrimary} />
                <View style={styles.fallbackLine} />
                <View style={[styles.fallbackLine, styles.fallbackLineShort]} />
                <View style={styles.fallbackDivider} />
                <View style={styles.fallbackLine} />
                <View style={[styles.fallbackLine, styles.fallbackLineMedium]} />
              </View>
            )}
            <View style={styles.photoDim} />

            <Animated.View
              style={[
                styles.scanWindow,
                {
                  opacity: beamOpacity,
                  transform: [{ translateY: scanTranslateY }]
                }
              ]}
            >
              <View style={styles.scanWindowEdge} />
              <View style={styles.scanWindowFill} />
              <View style={styles.scanWindowEdge} />
            </Animated.View>

            {[0, 1, 2].map((item) => (
              <Animated.View
                key={item}
                style={[
                  styles.textStrip,
                  item === 0 && styles.textStripOne,
                  item === 1 && styles.textStripTwo,
                  item === 2 && styles.textStripThree,
                  {
                    opacity: stripOpacity(scanProgress, item),
                    transform: [{ translateY: stripTranslateY }]
                  }
                ]}
              >
                <View style={styles.textStripLine} />
                <View style={[styles.textStripLine, item === 1 ? styles.textStripLineTiny : styles.textStripLineShort]} />
              </Animated.View>
            ))}

            <Animated.View
              style={[
                styles.iconBadge,
                {
                  opacity: copyIn,
                  transform: [{ translateY: iconTranslateY }, { rotate: iconRotate }]
                }
              ]}
            >
              <ActiveLoadingIcon color={colors.primaryDark} size={22} strokeWidth={1.9} />
            </Animated.View>
          </View>

          <View style={styles.chipGrid}>
            {chips.map((label, index) => {
              const opacity = chipOpacity(scanProgress, index);
              const translateY = opacity.interpolate({
                inputRange: [0, 1],
                outputRange: [7, 0]
              });

              return (
                <Animated.View
                  key={label}
                  style={[
                    styles.processChip,
                    {
                      opacity,
                      transform: [{ translateY }]
                    }
                  ]}
                >
                  <Text numberOfLines={1} style={styles.processChipText}>
                    {label}
                  </Text>
                </Animated.View>
              );
            })}
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
          <Text style={styles.title}>{phrase.title}</Text>
          <Text style={styles.subtitle}>{phrase.subtitle}</Text>
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
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 32
  },
  loaderWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%"
  },
  photoFrame: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    height: PHOTO_HEIGHT,
    overflow: "hidden",
    position: "relative",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.09,
    shadowRadius: 30,
    width: 216
  },
  menuPhoto: {
    height: "100%",
    width: "100%"
  },
  photoFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFF4E6",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 44
  },
  fallbackLinePrimary: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 7,
    marginBottom: 10,
    width: 72
  },
  fallbackLine: {
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 6,
    opacity: 0.65,
    width: 136
  },
  fallbackLineMedium: {
    width: 108
  },
  fallbackLineShort: {
    width: 92
  },
  fallbackDivider: {
    backgroundColor: colors.borderSoft,
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
    width: "100%"
  },
  photoDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(24, 35, 33, 0.2)"
  },
  scanWindow: {
    height: 76,
    left: 0,
    position: "absolute",
    right: 0
  },
  scanWindowEdge: {
    backgroundColor: colors.primary,
    height: 2,
    opacity: 0.92,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8
  },
  scanWindowFill: {
    backgroundColor: "rgba(221, 244, 241, 0.28)",
    flex: 1
  },
  textStrip: {
    backgroundColor: "rgba(255, 252, 247, 0.93)",
    borderColor: "rgba(31, 138, 131, 0.22)",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    position: "absolute",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    width: 118
  },
  textStripOne: {
    left: -20,
    top: 74
  },
  textStripTwo: {
    right: -22,
    top: 142
  },
  textStripThree: {
    left: -10,
    top: 214
  },
  textStripLine: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 999,
    height: 4,
    width: 88
  },
  textStripLineShort: {
    opacity: 0.78,
    width: 62
  },
  textStripLineTiny: {
    opacity: 0.78,
    width: 46
  },
  iconBadge: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 48,
    justifyContent: "center",
    position: "absolute",
    right: 14,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    top: 14,
    width: 48
  },
  chipGrid: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 18,
    maxWidth: 306
  },
  processChip: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12
  },
  processChipText: {
    color: colors.inkMuted,
    ...typography.caption
  },
  copy: {
    alignItems: "center",
    gap: 12,
    marginTop: 24,
    width: "100%"
  },
  title: {
    color: colors.ink,
    ...typography.title,
    maxWidth: 314,
    textAlign: "center"
  },
  subtitle: {
    color: colors.inkMuted,
    ...typography.bodyLarge,
    maxWidth: 314,
    minHeight: 46,
    textAlign: "center"
  }
});
